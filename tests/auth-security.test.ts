import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import worker, { Env, KVNamespace } from '../src/worker';
import {
  isSafeAnonKey,
  upsertAppReview,
  fetchAppReviews,
  deleteAppReview,
  setLibraryUpdateNotification,
  getLibraryNotificationPrefs,
} from '../src/lib/supabase';
import {
  sanitizeText,
  sanitizeUrl,
  sanitizeUsername,
  calculatePasswordStrength,
} from '../src/utils/sanitize';

class MockKV implements KVNamespace {
  private store = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe('Sanitization & Password Strength Utilities', () => {
  it('strips HTML tags, scripts, and dangerous protocols from user content', () => {
    const dirty = `<script>alert("xss")</script><img src=x onerror=alert(1)>Hello <b>Linux</b> world!`;
    const clean = sanitizeText(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onerror');
    expect(clean).toBe('Hello Linux world!');
  });

  it('blocks javascript:, data:, and vbscript: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
    expect(sanitizeUrl('https://github.com/niruvi/app')).toBe('https://github.com/niruvi/app');
  });

  it('normalizes usernames safely', () => {
    expect(sanitizeUsername('Alice_Dev-99!<script>')).toBe('alice_dev-99');
  });

  it('requires >= 10 characters for valid passwords in strength calculator', () => {
    expect(calculatePasswordStrength('Short1!').isValid).toBe(false);
    expect(calculatePasswordStrength('StrongLinuxPass2026!').isValid).toBe(true);
  });
});

describe('Cloudflare Worker Auth Security & Session Hardening', () => {
  const createTestEnv = (): Env => ({
    NIRUVI_AUTH_KV: new MockKV(),
    JWT_SECRET: 'test-super-secret-jwt-key-for-unit-tests-only',
    FIREBASE_PROJECT_ID: 'dependable-strand-z53bd',
  });

  it('rejects /api/auth/google without a valid Firebase ID token (blocks sandboxLogin / demo UID bypass)', async () => {
    const env = createTestEnv();
    const req = new Request('https://niruvi.store/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.1' },
      body: JSON.stringify({
        email: 'developer@niruvi.linux',
        uid: 'demo_developer_uid_12345',
        displayName: 'Demo Sandbox Developer',
      }),
    });

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBeTruthy();
  });

  it('includes strict security headers on all worker responses', async () => {
    const env = createTestEnv();
    const req = new Request('https://niruvi.store/api/health', { method: 'GET' });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('Permissions-Policy')).toContain('camera=()');
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
  });

  it('sets HttpOnly, Secure, SameSite=Strict cookie on registration, enforces server-side roles, and clears cookie on logout', async () => {
    const env = createTestEnv();
    const regReq = new Request('https://niruvi.store/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.10' },
      body: JSON.stringify({
        email: 'tux@kernel.org',
        username: 'tux_linux',
        password: 'SuperSecureLinuxPassword!2026',
        displayName: 'Tux Penguin',
      }),
    });

    const regRes = await worker.fetch(regReq, env);
    expect(regRes.status).toBe(201);
    const setCookie = regRes.headers.get('Set-Cookie') || '';
    expect(setCookie).toContain('niruvi_auth_token=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Strict');

    // Extract session cookie and verify /api/auth/me re-queries database
    const cookiePair = setCookie.split(';')[0];
    const meReq = new Request('https://niruvi.store/api/auth/me', {
      method: 'GET',
      headers: { Cookie: cookiePair },
    });
    const meRes = await worker.fetch(meReq, env);
    expect(meRes.status).toBe(200);
    const meData = (await meRes.json()) as { user: { email: string; role: string } };
    expect(meData.user.email).toBe('tux@kernel.org');
    expect(meData.user.role).toBe('USER');

    // Server-side plan/role enforcement: non-admin user cannot access /api/admin/overview
    const adminReq = new Request('https://niruvi.store/api/admin/overview', {
      method: 'GET',
      headers: { Cookie: cookiePair },
    });
    const adminRes = await worker.fetch(adminReq, env);
    expect(adminRes.status).toBe(403);

    // Logout clears the session cookie
    const logoutReq = new Request('https://niruvi.store/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: cookiePair },
    });
    const logoutRes = await worker.fetch(logoutReq, env);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  it('returns generic "Invalid credentials" on failed login and enforces KV rate limiting (10 attempts / 10 min)', async () => {
    const env = createTestEnv();
    for (let i = 1; i <= 10; i++) {
      const loginReq = new Request('https://niruvi.store/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.55' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'WrongPassword12345!',
        }),
      });
      const res = await worker.fetch(loginReq, env);
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('Invalid credentials');
    }

    // 11th attempt within window must be rate-limited with 429
    const eleventhReq = new Request('https://niruvi.store/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.55' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'WrongPassword12345!',
      }),
    });
    const rateLimitedRes = await worker.fetch(eleventhReq, env);
    expect(rateLimitedRes.status).toBe(429);
  });

  it('enforces Phase 2 Supabase anon-key guard (rejects service_role keys) and RLS across all 8 marketplace tables', () => {
    const anonPayload = Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url');
    const servicePayload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
    expect(isSafeAnonKey(`eyJhbGciOiJIUzI1NiJ9.${anonPayload}.sig`)).toBe(true);
    expect(isSafeAnonKey('sb_publishable_abc123')).toBe(true);
    expect(isSafeAnonKey(`eyJhbGciOiJIUzI1NiJ9.${servicePayload}.sig`)).toBe(false);
    expect(isSafeAnonKey('sb_secret_live_key_123')).toBe(false);

    const migrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '0001_accounts_and_marketplace_rls.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    const requiredTables = [
      'profiles',
      'apps',
      'app_versions',
      'reviews',
      'library',
      'downloads',
      'reports',
      'audit_log',
    ];
    for (const tbl of requiredTables) {
      expect(sql).toMatch(new RegExp(`create table if not exists public\\.${tbl}\\b`, 'i'));
      expect(sql).toMatch(new RegExp(`alter table public\\.${tbl} enable row level security`, 'i'));
    }
    expect(sql).toContain("role in ('user', 'publisher', 'moderator', 'admin')");
    expect(sql).toContain("status in ('draft', 'pending', 'published', 'rejected', 'taken_down')");
    expect(sql).toContain("trust_tier in ('publisher_verified', 'checksum_verified', 'unverified')");
    expect(sql).toContain('insert into public.audit_log');
    expect(sql).toContain(
      'revoke all on function public.handle_new_auth_user() from public, anon, authenticated;'
    );
    for (const fnName of [
      'current_user_role',
      'is_moderator_or_admin',
      'is_admin',
      'guard_profile_updates_and_audit',
      'guard_app_moderation_and_audit',
    ]) {
      expect(sql).toMatch(new RegExp(`function public\\.${fnName}\\(\\)[^$]*?security invoker`, 'i'));
    }
  });

  it('enforces Phase 3 1-review-per-user-per-app upsert, own/staff deletion, and library update notifications', async () => {
    // 1. User creates a review for Audacity
    const created = await upsertAppReview({
      appSlug: 'audacity',
      userId: 'user_alice_1',
      username: 'alice_linux',
      displayName: 'Alice Linux',
      rating: 5,
      title: 'Great audio editor',
      body: 'Runs out of the box on Fedora 41 with PipeWire.',
      distro: 'Fedora 41',
    });
    expect(created.rating).toBe(5);
    expect(created.appSlug).toBe('audacity');

    // 2. Same user updates their review on Audacity -> must update in-place (still 1 review)
    const updated = await upsertAppReview({
      appSlug: 'audacity',
      userId: 'user_alice_1',
      username: 'alice_linux',
      displayName: 'Alice Linux',
      rating: 4,
      title: 'Updated after plugin test',
      body: 'LV2 plugins work well too.',
      distro: 'Fedora 41',
    });
    expect(updated.id).toBe(created.id);
    const listAfterUpdate = await fetchAppReviews('audacity');
    expect(listAfterUpdate).toHaveLength(1);
    expect(listAfterUpdate[0].rating).toBe(4);
    expect(listAfterUpdate[0].title).toBe('Updated after plugin test');

    // 3. Another non-staff user cannot delete Alice's review
    await deleteAppReview({
      reviewId: created.id,
      userId: 'user_mallory_2',
      isModeratorOrAdmin: false,
    });
    expect(await fetchAppReviews('audacity')).toHaveLength(1);

    // 4. Alice can delete her own review
    await deleteAppReview({
      reviewId: created.id,
      userId: 'user_alice_1',
      isModeratorOrAdmin: false,
    });
    expect(await fetchAppReviews('audacity')).toHaveLength(0);

    // 5. Library update notifications toggle per app
    await setLibraryUpdateNotification('user_alice_1', 'audacity', false);
    expect(getLibraryNotificationPrefs().audacity).toBe(false);
    await setLibraryUpdateNotification('user_alice_1', 'audacity', true);
    expect(getLibraryNotificationPrefs().audacity).toBe(true);
  });

  it('prevents bun.lock build failures and ensures Supabase env vars are wired in CI workflows', () => {
    const bunLockPath = path.join(process.cwd(), 'bun.lock');
    expect(fs.existsSync(bunLockPath)).toBe(false);

    const pkgJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
    expect(pkgJson.packageManager).toMatch(/^npm@/);

    const deployYml = fs.readFileSync(
      path.join(process.cwd(), '.github', 'workflows', 'deploy.yml'),
      'utf-8'
    );
    expect(deployYml).toContain('VITE_SUPABASE_URL');
    expect(deployYml).toContain('VITE_SUPABASE_ANON_KEY');
  });
});
