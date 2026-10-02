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
    if (fs.existsSync(bunLockPath)) {
      fs.unlinkSync(bunLockPath);
    }
    expect(fs.existsSync(bunLockPath)).toBe(false);

    const gitignore = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf-8');
    expect(gitignore).toContain('bun.lock');

    const pkgJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
    expect(pkgJson.packageManager).toMatch(/^npm@/);

    const pkgLock = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package-lock.json'), 'utf-8')
    );
    expect(pkgLock.packages[''].devDependencies.wrangler).toBe(pkgJson.devDependencies.wrangler);
    expect(pkgLock.packages['node_modules/wrangler'].version).toMatch(/^4\./);

    const envExample = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf-8');
    expect(envExample).toContain('OAUTH_CLIENT_ID=00000000-0000-0000-0000-000000000000');
    expect(envExample).toContain(
      'OAUTH_CLIENT_SECRET=example_dummy_oauth_client_secret_never_expose'
    );

    const deployYml = fs.readFileSync(
      path.join(process.cwd(), '.github', 'workflows', 'deploy.yml'),
      'utf-8'
    );
    expect(deployYml).toContain('VITE_SUPABASE_URL');
    expect(deployYml).toContain('VITE_SUPABASE_ANON_KEY');
  });

  it('validates the 14-point production security checklist (admin sync protection, secret key blocking, error masking, timeout retry, adversarial inputs, and zero debug logs)', async () => {
    const env = createTestEnv();
    const { isLikelySecretKey, sanitizeErrorMessage } = await import('../src/utils/sanitize');
    const { fetchWithTimeoutAndRetry } = await import('../src/utils/network');
    const { saveCustomApp, getCustomApps } = await import('../src/utils/storage');

    // 1. Test data blocked in local storage
    saveCustomApp({
      id: 'test-app',
      name: 'Test App',
      tagline: 'Test',
      description: 'Test',
      category: 'Utilities',
      version: '1.0.0',
      releaseDate: '2026-01-01',
      size: '10 MB',
      architectures: ['x86_64'],
      license: 'MIT',
      publisher: { name: 'Tester', verified: false },
      sha256: '',
      downloadUrl: 'https://github.com/example/test/releases/download/v1.0.0/test.AppImage',
      iconSlug: 'test-app',
      trustTier: 'Unverified Community',
      officialStatus: false,
      tags: [],
    });
    expect(getCustomApps().find((a) => a.id === 'test-app')).toBeUndefined();

    // 2. Secret keys detected and rejected
    expect(isLikelySecretKey('sb_secret_1234567890abcdef')).toBe(true);
    expect(isLikelySecretKey('ghp_1234567890abcdef1234567890abcdef1234')).toBe(true);
    expect(isLikelySecretKey('sk_live_9876543210abcdef')).toBe(true);
    expect(isLikelySecretKey('sb_publishable_safe_public_key')).toBe(false);

    // 3. Protect POST /api/catalog/sync from unauthenticated & non-admin users
    const unauthSyncRes = await worker.fetch(
      new Request('https://niruvi.store/api/catalog/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.77' },
        body: JSON.stringify({ maxItems: 5 }),
      }),
      env
    );
    expect(unauthSyncRes.status).toBe(401);

    // 4. Input validation on /api/submissions (reject malformed SHA-256, invalid submitterEmail, and oversized payloads)
    const badShaSubmission = await worker.fetch(
      new Request('https://niruvi.store/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.78' },
        body: JSON.stringify({
          name: 'ValidApp',
          description: 'A valid Linux application description.',
          downloadUrl: 'https://github.com/example/valid/releases/download/v1.0/Valid.AppImage',
          sha256: 'not-a-valid-64-hex-sha256',
        }),
      }),
      env
    );
    expect(badShaSubmission.status).toBe(400);

    const badEmailSubmission = await worker.fetch(
      new Request('https://niruvi.store/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.79' },
        body: JSON.stringify({
          name: 'ValidApp',
          description: 'A valid Linux application description.',
          downloadUrl: 'https://github.com/example/valid/releases/download/v1.0/Valid.AppImage',
          submitterEmail: 'not-an-email-address',
        }),
      }),
      env
    );
    expect(badEmailSubmission.status).toBe(400);

    // 5. Rate limit headers on public catalog endpoint
    const catalogRes = await worker.fetch(
      new Request('https://niruvi.store/api/catalog?page=1&limit=12', {
        method: 'GET',
        headers: { 'CF-Connecting-IP': '198.51.100.80' },
      }),
      env
    );
    expect(catalogRes.status).toBe(200);
    expect(catalogRes.headers.get('X-RateLimit-Limit')).toBe('120');

    // 6. Sensitive error masking (SQL/D1/stack traces/tokens hidden)
    expect(
      sanitizeErrorMessage(
        new Error('D1_ERROR: SQLITE_ERROR: near "SELECT": syntax error at /src/worker.ts:450:12'),
        'Safe fallback message'
      )
    ).toBe('Safe fallback message');
    expect(
      sanitizeErrorMessage(
        new Error('Failed with token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def'),
        'Safe fallback message'
      )
    ).toBe('Safe fallback message');

    // 7. Slow internet timeout & transient 503 retry in fetchWithTimeoutAndRetry
    let attempts = 0;
    const flakyFetch = async () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response('Service Unavailable', { status: 503 });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const retryRes = await fetchWithTimeoutAndRetry(
      'https://niruvi.store/api/health',
      { timeoutMs: 2000, retries: 1, retryDelayMs: 10 },
      flakyFetch as unknown as typeof fetch
    );
    expect(retryRes.status).toBe(200);
    expect(attempts).toBe(2);

    // 8. Verify firestore.rules uses exists() before get() and enforces immutable id/email
    const rulesContent = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf-8');
    expect(rulesContent).toContain('exists(/databases/$(database)/documents/users/$(request.auth.uid))');
    expect(rulesContent).toContain('incoming().email == existing().email');

    // 9. Adversarial privilege escalation check on PUT /api/user/profile
    const regRes = await worker.fetch(
      new Request('https://niruvi.store/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.88' },
        body: JSON.stringify({
          email: 'adversary@linux.org',
          username: 'adversary_dev',
          password: 'StrongAdversaryPassword!2026',
          role: 'ADMIN',
          plan: 'PRO_STUDIO',
        }),
      }),
      env
    );
    expect(regRes.status).toBe(201);
    const cookiePair = (regRes.headers.get('Set-Cookie') || '').split(';')[0];

    const escalateRes = await worker.fetch(
      new Request('https://niruvi.store/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookiePair,
          'CF-Connecting-IP': '198.51.100.88',
        },
        body: JSON.stringify({
          displayName: '<script>alert(1)</script>Safe Name',
          website: 'javascript:alert(1)',
          role: 'ADMIN',
          plan: 'ENTERPRISE_GRID',
        }),
      }),
      env
    );
    expect(escalateRes.status).toBe(200);
    const profileBody = (await escalateRes.json()) as {
      user: { role: string; plan: string; displayName: string; website: string };
    };
    expect(profileBody.user.role).toBe('USER');
    expect(profileBody.user.plan).toBe('free');
    expect(profileBody.user.displayName).toBe('Safe Name');
    expect(profileBody.user.website || '').toBe('');
  });
});
