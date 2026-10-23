import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import worker, { Env, KVNamespace } from '../src/worker';
import {
  upsertAppReview,
  fetchAppReviews,
  deleteAppReview,
  setLibraryUpdateNotification,
  getLibraryNotificationPrefs,
  recordAppDownload,
} from '../src/lib/cloudflare-db';
import {
  sanitizeText,
  sanitizeUrl,
  sanitizeUsername,
  calculatePasswordStrength,
  isLikelySecretKey,
  sanitizeErrorMessage,
} from '../src/utils/sanitize';
import { fetchWithTimeoutAndRetry } from '../src/utils/network';

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

describe('Sanitization & Security Utilities', () => {
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

  it('detects and blocks secret keys', () => {
    expect(isLikelySecretKey('sb_secret_1234567890abcdef')).toBe(true);
    expect(isLikelySecretKey('ghp_1234567890abcdef1234567890abcdef1234')).toBe(true);
    expect(isLikelySecretKey('sk_live_9876543210abcdef')).toBe(true);
    expect(isLikelySecretKey('sb_publishable_safe_public_key')).toBe(false);
  });

  it('masks database errors and tokens from public view', () => {
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
  });
});

describe('Cloudflare Worker Security & Hardened Headers', () => {
  const createTestEnv = (): Env => ({
    NIRUVI_AUTH_KV: new MockKV(),
    JWT_SECRET: 'test-super-secret-jwt-key-for-unit-tests-only',
  });

  it('includes strict security headers on worker responses without third-party auth leaks', async () => {
    const env = createTestEnv();
    const req = new Request('https://niruvi.store/api/health', { method: 'GET' });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const csp = res.headers.get('Content-Security-Policy') || '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain('accounts.google.com');
    expect(csp).not.toContain('firebaseapp.com');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('Permissions-Policy')).toContain('camera=()');
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
  });

  it('rejects unauthenticated admin catalog sync attempts', async () => {
    const env = createTestEnv();
    const unauthSyncRes = await worker.fetch(
      new Request('https://niruvi.store/api/catalog/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.77' },
        body: JSON.stringify({ maxItems: 5 }),
      }),
      env
    );
    expect(unauthSyncRes.status).toBe(401);
  });

  it('validates submission payloads: rejects invalid SHA-256 and invalid submitterEmail', async () => {
    const env = createTestEnv();
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
  });

  it('applies rate limit headers to public catalog requests', async () => {
    const env = createTestEnv();
    const catalogRes = await worker.fetch(
      new Request('https://niruvi.store/api/catalog?page=1&limit=12', {
        method: 'GET',
        headers: { 'CF-Connecting-IP': '198.51.100.80' },
      }),
      env
    );
    expect(catalogRes.status).toBe(200);
    expect(catalogRes.headers.get('X-RateLimit-Limit')).toBe('120');
  });

  it('handles slow internet timeout and 503 retry gracefully', async () => {
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
  });
});

describe('Cloudflare D1 Database Schemas & Community Review Client', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defines required Cloudflare D1 tables in migrations', () => {
    const migrationPath = path.join(
      process.cwd(),
      'migrations',
      '0001_catalog_pipeline.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS submissions');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS broken_reports');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS app_reviews');
    expect(sql).toContain('idx_app_reviews_slug');
  });

  it('creates, lists, and deletes community reviews via Cloudflare D1 client', async () => {
    // 1. Create a review for Audacity
    const created = await upsertAppReview({
      appSlug: 'audacity',
      username: 'alice_linux',
      displayName: 'Alice Linux',
      rating: 5,
      title: 'Great audio editor',
      body: 'Runs out of the box on Fedora 41 with PipeWire.',
      distro: 'Fedora 41',
    });
    expect(created.rating).toBe(5);
    expect(created.appSlug).toBe('audacity');

    // 2. Fetch reviews
    const list = await fetchAppReviews('audacity');
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].appSlug).toBe('audacity');

    // 3. Delete review
    await deleteAppReview(created.id);
    const listAfterDelete = await fetchAppReviews('audacity');
    expect(listAfterDelete.find((r) => r.id === created.id)).toBeUndefined();
  });

  it('manages local library notification preferences and records downloads', async () => {
    await setLibraryUpdateNotification('audacity', false);
    expect(getLibraryNotificationPrefs().audacity).toBe(false);
    await setLibraryUpdateNotification('audacity', true);
    expect(getLibraryNotificationPrefs().audacity).toBe(true);

    // Recording download succeeds without throw
    await expect(
      recordAppDownload({
        appSlug: 'blender',
        version: '4.3.0',
        arch: 'x86_64',
      })
    ).resolves.not.toThrow();
  });

  it('verifies CI deployment workflow has no leaked Supabase variables or bun.lock file', () => {
    const bunLockPath = path.join(process.cwd(), 'bun.lock');
    expect(fs.existsSync(bunLockPath)).toBe(false);

    const deployYml = fs.readFileSync(
      path.join(process.cwd(), '.github', 'workflows', 'deploy.yml'),
      'utf-8'
    );
    expect(deployYml).not.toContain('VITE_SUPABASE_URL');
    expect(deployYml).not.toContain('VITE_SUPABASE_ANON_KEY');
    expect(deployYml).toContain('VITE_SITE_URL');
  });
});
