/**
 * Cloudflare Worker Authentication & API Handler (D1 + KV + Web Crypto)
 * Responds to:
 *  - POST /api/auth/register
 *  - POST /api/auth/login
 *  - POST /api/auth/google (Verified Firebase ID Token via Google Public X.509 Certs)
 *  - POST /api/auth/logout
 *  - GET  /api/auth/me
 *  - GET  /api/auth/check-username
 *  - POST /api/auth/forgot-password
 *  - PUT  /api/user/profile
 *  - POST /api/developer/register
 *  - POST /api/user/upgrade-plan
 *  - POST /api/license/activate
 *
 * Provision JWT_SECRET before deploying: `wrangler secret put JWT_SECRET`
 */

import { sanitizeText, sanitizeUrl, sanitizeUsername } from './utils/sanitize';
import { APPS_CATALOG } from './data/apps';
import { AppMetadata } from './types';
import { isGenuineSha256 } from './utils/catalogSchema';
import {
  APPIMAGEHUB_FEED_URL,
  RawAppImageHubItem,
  GitHubReleaseResponse,
  normalizeAppImageHubItem,
  extractVersionHistoryFromReleases,
  buildAppMetadataFromNormalized,
  mapToSimplifiedCategory,
} from './utils/appimagehub';

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = Record<string, any>>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; meta?: any }>;
  all<T = Record<string, any>>(): Promise<{ results: T[] }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec?(query: string): Promise<any>;
}

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Env {
  JWT_SECRET?: string;
  GITHUB_TOKEN?: string;
  FIREBASE_PROJECT_ID?: string;
  NIRUVI_AUTH_KV?: KVNamespace;
  DB?: D1Database;
  ASSETS?: {
    fetch(request: Request | string): Promise<Response>;
  };
}

export interface WorkerUserRecord {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: 'USER' | 'DEVELOPER' | 'ADMIN' | 'MODERATOR';
  plan: 'free' | 'supporter' | 'pro_developer' | 'team';
  avatarUrl: string | null;
  firebaseUid: string | null;
  passwordHash?: string | null;
}

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const GOOGLE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const DEFAULT_FIREBASE_PROJECT_ID = 'dependable-strand-z53bd';

const RATE_LIMIT_MAX_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW_SECONDS = 600; // 10 minutes

// In-memory fallback stores when KV / D1 bindings are not attached in unit tests
const memoryRateLimits = new Map<string, { count: number; expiresAt: number }>();
const memoryUsers = new Map<string, WorkerUserRecord>();
const memoryDevProfiles = new Map<string, Record<string, any>>();
const memoryCatalogApps = new Map<string, AppMetadata>();
const memorySyncLogs: Array<{
  id: string;
  runId: string;
  appId: string | null;
  status: string;
  message: string;
  createdAt: string;
}> = [];
const memoryReports: Array<Record<string, any>> = [];
const memorySubmissions: Array<Record<string, any>> = [];

let cachedGoogleCerts: { certs: Record<string, string>; expiresAt: number } | null = null;
let cachedGoogleJwks: { keys: any[]; expiresAt: number } | null = null;

/**
 * Standard Security Response Headers applied to EVERY Worker response
 */
export function buildSecurityHeaders(requestOrigin?: string | null): Record<string, string> {
  const allowedOrigin = requestOrigin || '*';
  return {
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https:; frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://api.razorpay.com; frame-ancestors 'self' https://*.ai.studio https://*.google.com; object-src 'none'; base-uri 'self';",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Frame-Options': 'SAMEORIGIN',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function jsonResponse(
  body: Record<string, any>,
  status: number,
  requestOrigin?: string | null,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...buildSecurityHeaders(requestOrigin),
      ...extraHeaders,
    },
  });
}

export function buildSessionCookie(token: string, maxAgeSeconds = 604800): string {
  return `niruvi_auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

export function buildClearSessionCookie(): string {
  return 'niruvi_auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

function toPublicUserDto(u: WorkerUserRecord) {
  const isProRole =
    u.role === 'DEVELOPER' ||
    u.role === 'ADMIN' ||
    u.plan === 'pro_developer' ||
    u.plan === 'team' ||
    u.plan === 'supporter';
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: sanitizeText(u.displayName, 80),
    role: u.role,
    plan: u.plan || (u.role === 'DEVELOPER' ? 'pro_developer' : 'free'),
    isPro: isProRole,
    avatarUrl: u.avatarUrl ? sanitizeUrl(u.avatarUrl) : null,
    firebaseUid: u.firebaseUid || null,
  };
}

/**
 * Ensures D1 database tables exist
 */
async function ensureD1Tables(db?: D1Database): Promise<void> {
  if (!db) return;
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          password_hash TEXT,
          role TEXT NOT NULL DEFAULT 'USER',
          plan TEXT NOT NULL DEFAULT 'free',
          avatar_url TEXT,
          firebase_uid TEXT UNIQUE,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`
      )
      .run();

    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS developer_profiles (
          id TEXT PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL,
          org_name TEXT NOT NULL,
          org_website TEXT,
          org_description TEXT,
          payout_email TEXT NOT NULL,
          verified INTEGER NOT NULL DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`
      )
      .run();

    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS catalog_apps (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          tagline TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          categories_json TEXT NOT NULL DEFAULT '[]',
          version TEXT NOT NULL DEFAULT 'latest',
          release_date TEXT NOT NULL,
          size TEXT NOT NULL DEFAULT 'Unknown size',
          architectures_json TEXT NOT NULL DEFAULT '["x86_64"]',
          license TEXT NOT NULL DEFAULT 'Open Source',
          license_category TEXT NOT NULL DEFAULT 'Open Source',
          publisher_name TEXT NOT NULL,
          publisher_website TEXT,
          publisher_github TEXT,
          verified INTEGER NOT NULL DEFAULT 0,
          sha256 TEXT NOT NULL DEFAULT '',
          download_url TEXT NOT NULL,
          download_map_json TEXT NOT NULL DEFAULT '{}',
          icon_url TEXT,
          screenshots_json TEXT NOT NULL DEFAULT '[]',
          homepage_url TEXT,
          github_repo TEXT,
          releases_url TEXT,
          featured INTEGER NOT NULL DEFAULT 0,
          downloads_count INTEGER NOT NULL DEFAULT 0,
          rating REAL NOT NULL DEFAULT 0,
          release_notes TEXT,
          version_history_json TEXT NOT NULL DEFAULT '[]',
          source_origin TEXT NOT NULL DEFAULT 'appimagehub',
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`
      )
      .run();

    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS catalog_sync_logs (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL,
          app_id TEXT,
          status TEXT NOT NULL,
          message TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`
      )
      .run();

    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS app_reports (
          id TEXT PRIMARY KEY,
          app_id TEXT NOT NULL,
          app_name TEXT NOT NULL,
          reason TEXT NOT NULL,
          details TEXT NOT NULL,
          distro TEXT,
          architecture TEXT,
          reporter_email TEXT,
          status TEXT NOT NULL DEFAULT 'open',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`
      )
      .run();

    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS app_submissions (
          id TEXT PRIMARY KEY,
          app_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          homepage_url TEXT,
          github_repo TEXT NOT NULL,
          download_url TEXT NOT NULL,
          sha256 TEXT,
          license TEXT NOT NULL DEFAULT 'Open Source',
          submitter_email TEXT,
          status TEXT NOT NULL DEFAULT 'pending_review',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`
      )
      .run();
  } catch {
    // Table creation already handled or read-only replica
  }
}

/**
 * KV-backed Rate Limiter (10 attempts / 10 minutes per IP per auth route)
 */
async function checkAuthRateLimit(
  request: Request,
  env: Env,
  routeKey: string
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    '127.0.0.1';
  const kvKey = `ratelimit:${routeKey}:${ip}`;
  const now = Date.now();

  if (env?.NIRUVI_AUTH_KV) {
    try {
      const existingRaw = await env.NIRUVI_AUTH_KV.get(kvKey);
      let state = existingRaw ? JSON.parse(existingRaw) : null;
      if (!state || state.expiresAt <= now) {
        state = { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000 };
      } else {
        state.count += 1;
      }
      const ttl = Math.max(60, Math.ceil((state.expiresAt - now) / 1000));
      await env.NIRUVI_AUTH_KV.put(kvKey, JSON.stringify(state), { expirationTtl: ttl });
      const allowed = state.count <= RATE_LIMIT_MAX_ATTEMPTS;
      return {
        allowed,
        remaining: Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - state.count),
        retryAfterSeconds: ttl,
      };
    } catch {
      // Fallback to memory rate limit on KV error
    }
  }

  let entry = memoryRateLimits.get(kvKey);
  if (!entry || entry.expiresAt <= now) {
    entry = { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000 };
    memoryRateLimits.set(kvKey, entry);
  } else {
    entry.count += 1;
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
  return {
    allowed: entry.count <= RATE_LIMIT_MAX_ATTEMPTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - entry.count),
    retryAfterSeconds,
  };
}

/**
 * Fetch user from D1 database (or fallback memory store in test env)
 */
async function findUserByIdFromD1(env: Env, userId: string): Promise<WorkerUserRecord | null> {
  if (env?.DB) {
    await ensureD1Tables(env.DB);
    const row = await env.DB.prepare(
      'SELECT id, email, username, display_name, password_hash, role, plan, avatar_url, firebase_uid FROM users WHERE id = ? LIMIT 1'
    )
      .bind(userId)
      .first<any>();
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.display_name || row.displayName || row.username,
      passwordHash: row.password_hash || row.passwordHash || null,
      role: (row.role || 'USER') as WorkerUserRecord['role'],
      plan: (row.plan || 'free') as WorkerUserRecord['plan'],
      avatarUrl: row.avatar_url || row.avatarUrl || null,
      firebaseUid: row.firebase_uid || row.firebaseUid || null,
    };
  }
  return memoryUsers.get(userId) || null;
}

async function findUserByLoginFromD1(env: Env, login: string): Promise<WorkerUserRecord | null> {
  const normalized = login.trim().toLowerCase();
  if (env?.DB) {
    await ensureD1Tables(env.DB);
    const row = await env.DB.prepare(
      'SELECT id, email, username, display_name, password_hash, role, plan, avatar_url, firebase_uid FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1'
    )
      .bind(normalized, normalized)
      .first<any>();
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.display_name || row.displayName || row.username,
      passwordHash: row.password_hash || row.passwordHash || null,
      role: (row.role || 'USER') as WorkerUserRecord['role'],
      plan: (row.plan || 'free') as WorkerUserRecord['plan'],
      avatarUrl: row.avatar_url || row.avatarUrl || null,
      firebaseUid: row.firebase_uid || row.firebaseUid || null,
    };
  }
  for (const u of memoryUsers.values()) {
    if (u.email.toLowerCase() === normalized || u.username.toLowerCase() === normalized) {
      return u;
    }
  }
  return null;
}

async function findUserByFirebaseUidOrEmailFromD1(
  env: Env,
  firebaseUid: string,
  email: string
): Promise<WorkerUserRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (env?.DB) {
    await ensureD1Tables(env.DB);
    const row = await env.DB.prepare(
      'SELECT id, email, username, display_name, password_hash, role, plan, avatar_url, firebase_uid FROM users WHERE firebase_uid = ? OR LOWER(email) = ? LIMIT 1'
    )
      .bind(firebaseUid, normalizedEmail)
      .first<any>();
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.display_name || row.displayName || row.username,
      passwordHash: row.password_hash || row.passwordHash || null,
      role: (row.role || 'USER') as WorkerUserRecord['role'],
      plan: (row.plan || 'free') as WorkerUserRecord['plan'],
      avatarUrl: row.avatar_url || row.avatarUrl || null,
      firebaseUid: row.firebase_uid || row.firebaseUid || null,
    };
  }
  for (const u of memoryUsers.values()) {
    if (u.firebaseUid === firebaseUid || u.email.toLowerCase() === normalizedEmail) {
      return u;
    }
  }
  return null;
}

async function saveUserToD1(env: Env, user: WorkerUserRecord): Promise<void> {
  if (env?.DB) {
    await ensureD1Tables(env.DB);
    await env.DB.prepare(
      `INSERT INTO users (id, email, username, display_name, password_hash, role, plan, avatar_url, firebase_uid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         username = excluded.username,
         display_name = excluded.display_name,
         role = excluded.role,
         plan = excluded.plan,
         avatar_url = excluded.avatar_url,
         firebase_uid = excluded.firebase_uid`
    )
      .bind(
        user.id,
        user.email.toLowerCase(),
        user.username.toLowerCase(),
        user.displayName,
        user.passwordHash || null,
        user.role,
        user.plan,
        user.avatarUrl,
        user.firebaseUid
      )
      .run();
    return;
  }
  memoryUsers.set(user.id, user);
}

async function getDeveloperProfileFromD1(env: Env, userId: string): Promise<Record<string, any> | null> {
  if (env?.DB) {
    await ensureD1Tables(env.DB);
    const row = await env.DB.prepare(
      'SELECT id, user_id, org_name, org_website, org_description, payout_email, verified FROM developer_profiles WHERE user_id = ? LIMIT 1'
    )
      .bind(userId)
      .first<any>();
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id || row.userId,
      orgName: row.org_name || row.orgName,
      orgWebsite: row.org_website || row.orgWebsite || null,
      orgDescription: row.org_description || row.orgDescription || null,
      payoutEmail: row.payout_email || row.payoutEmail,
      verified: Boolean(row.verified),
    };
  }
  return memoryDevProfiles.get(userId) || null;
}

/**
 * Extracts session token from HttpOnly Cookie (primary) or Authorization header
 */
function extractSessionToken(request: Request): string {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)niruvi_auth_token=([^;]+)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1].trim());
  }
  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

/**
 * Authenticates the request AND re-verifies the user's live role & plan from D1 on EVERY call.
 * Never trusts role/plan/isPro flags from the client or stale token claims.
 */
async function authenticateAndVerifyD1User(
  request: Request,
  env: Env,
  secret: string
): Promise<WorkerUserRecord | null> {
  const token = extractSessionToken(request);
  if (!token) return null;

  const payload = await verifyWorkerJwt(token, secret);
  if (!payload || typeof payload.id !== 'string') return null;

  // Always re-check D1 database on every request for authoritative role/plan
  const dbUser = await findUserByIdFromD1(env, payload.id);
  return dbUser;
}

export default {
  async fetch(request: Request, env: Env, _ctx?: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = request.headers.get('Origin');

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: buildSecurityHeaders(origin) });
    }

    if (path === '/api/health' && method === 'GET') {
      return jsonResponse({ status: 'ok', runtime: 'cloudflare-workers' }, 200, origin);
    }

    // Serve pre-rendered static assets with security and cache headers for non-API routes
    if (!path.startsWith('/api/') && env?.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      const headers = new Headers(assetRes.headers);
      const secHeaders = buildSecurityHeaders(origin);
      for (const [k, v] of Object.entries(secHeaders)) {
        headers.set(k, v);
      }
      if (path.startsWith('/assets/')) {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (
        path.startsWith('/icons/') ||
        path === '/favicon.ico' ||
        path === '/favicon.png' ||
        path === '/apple-touch-icon.png' ||
        path === '/niruvi-icon.png' ||
        path === '/og-image.png'
      ) {
        headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      }
      return new Response(assetRes.body, {
        status: assetRes.status,
        statusText: assetRes.statusText,
        headers,
      });
    }

    const secret = env?.JWT_SECRET;
    if (!secret) {
      return jsonResponse(
        {
          error: 'JWT_SECRET is not configured. Run `wrangler secret put JWT_SECRET` to configure it.',
        },
        500,
        origin
      );
    }

    try {
      // 1. GET /api/auth/check-username?username=...
      if (path === '/api/auth/check-username' && method === 'GET') {
        const rawUsername = url.searchParams.get('username') || '';
        const username = sanitizeUsername(rawUsername);
        if (!username || username.length < 3 || username.length > 24) {
          return jsonResponse(
            { available: false, error: 'Username must be 3–24 alphanumeric or underscore characters' },
            400,
            origin
          );
        }
        const existing = await findUserByLoginFromD1(env, username);
        return jsonResponse({ available: !existing, username }, 200, origin);
      }

      // 2. POST /api/auth/register
      if (path === '/api/auth/register' && method === 'POST') {
        const rl = await checkAuthRateLimit(request, env, 'register');
        if (!rl.allowed) {
          return jsonResponse(
            { error: 'Too many registration attempts. Please try again later.' },
            429,
            origin,
            { 'Retry-After': String(rl.retryAfterSeconds) }
          );
        }

        const body = (await request.json().catch(() => ({}))) as Record<string, any>;
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const username = sanitizeUsername(body.username);
        const displayName = sanitizeText(body.displayName || username, 60);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return jsonResponse({ error: 'Please provide a valid email address' }, 400, origin);
        }
        if (password.length < 10) {
          return jsonResponse({ error: 'Password must be at least 10 characters long' }, 400, origin);
        }
        if (!username || username.length < 3) {
          return jsonResponse(
            { error: 'Username must be between 3 and 24 alphanumeric characters' },
            400,
            origin
          );
        }
        if (!displayName) {
          return jsonResponse({ error: 'Display name is required' }, 400, origin);
        }

        const existingByEmail = await findUserByLoginFromD1(env, email);
        const existingByUsername = await findUserByLoginFromD1(env, username);
        if (existingByEmail || existingByUsername) {
          return jsonResponse(
            { error: 'Unable to create account with the provided details' },
            400,
            origin
          );
        }

        const passwordHash = await hashPasswordWebCrypto(password);
        const newUser: WorkerUserRecord = {
          id: `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
          email,
          username,
          displayName,
          passwordHash,
          role: 'USER',
          plan: 'free',
          avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(username)}`,
          firebaseUid: null,
        };

        await saveUserToD1(env, newUser);

        const userDto = toPublicUserDto(newUser);
        const token = await createWorkerJwt({ id: newUser.id, sub: newUser.id }, secret);

        if (env?.NIRUVI_AUTH_KV) {
          try {
            await env.NIRUVI_AUTH_KV.put(`session:${token}`, JSON.stringify({ id: newUser.id }), {
              expirationTtl: 604800,
            });
          } catch {}
        }

        return jsonResponse(
          {
            success: true,
            user: userDto,
            developerProfile: null,
          },
          201,
          origin,
          { 'Set-Cookie': buildSessionCookie(token) }
        );
      }

      // 3. POST /api/auth/login
      if (path === '/api/auth/login' && method === 'POST') {
        const rl = await checkAuthRateLimit(request, env, 'login');
        if (!rl.allowed) {
          return jsonResponse(
            { error: 'Too many login attempts. Please wait 10 minutes before trying again.' },
            429,
            origin,
            { 'Retry-After': String(rl.retryAfterSeconds) }
          );
        }

        const body = (await request.json().catch(() => ({}))) as Record<string, any>;
        const loginInput = typeof (body.login || body.email) === 'string' ? (body.login || body.email).trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        if (!loginInput || !password) {
          return jsonResponse({ error: 'Invalid credentials' }, 401, origin);
        }

        const dbUser = await findUserByLoginFromD1(env, loginInput);
        if (!dbUser || !dbUser.passwordHash) {
          // Never reveal whether the email or username exists
          return jsonResponse({ error: 'Invalid credentials' }, 401, origin);
        }

        const isValidPassword = await verifyPasswordWebCrypto(password, dbUser.passwordHash);
        if (!isValidPassword) {
          return jsonResponse({ error: 'Invalid credentials' }, 401, origin);
        }

        const token = await createWorkerJwt({ id: dbUser.id, sub: dbUser.id }, secret);
        if (env?.NIRUVI_AUTH_KV) {
          try {
            await env.NIRUVI_AUTH_KV.put(`session:${token}`, JSON.stringify({ id: dbUser.id }), {
              expirationTtl: 604800,
            });
          } catch {}
        }

        const devProfile = await getDeveloperProfileFromD1(env, dbUser.id);
        return jsonResponse(
          {
            success: true,
            user: toPublicUserDto(dbUser),
            developerProfile: devProfile,
          },
          200,
          origin,
          { 'Set-Cookie': buildSessionCookie(token) }
        );
      }

      // 4. POST /api/auth/google — Cryptographically verified Firebase ID Token ONLY
      if (path === '/api/auth/google' && method === 'POST') {
        const rl = await checkAuthRateLimit(request, env, 'google');
        if (!rl.allowed) {
          return jsonResponse(
            { error: 'Too many authentication attempts. Please try again later.' },
            429,
            origin,
            { 'Retry-After': String(rl.retryAfterSeconds) }
          );
        }

        const authHeader = request.headers.get('Authorization') || '';
        let idToken = '';
        if (authHeader.startsWith('Bearer ')) {
          idToken = authHeader.slice(7).trim();
        } else {
          const body = (await request.json().catch(() => ({}))) as Record<string, any>;
          if (typeof body.idToken === 'string') {
            idToken = body.idToken.trim();
          }
        }

        if (!idToken) {
          return jsonResponse({ error: 'Authentication required: missing Firebase ID token' }, 401, origin);
        }

        const projectId = env?.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
        const verifiedClaims = await verifyFirebaseIdToken(idToken, projectId);
        if (!verifiedClaims || !verifiedClaims.uid || !verifiedClaims.email) {
          return jsonResponse({ error: 'Invalid or expired Firebase ID token' }, 401, origin);
        }

        // Explicitly block any synthetic demo UID
        if (verifiedClaims.uid === 'demo_developer_uid_12345') {
          return jsonResponse({ error: 'Unauthorized identity' }, 401, origin);
        }

        // Derive identity strictly from verified token claims
        const verifiedEmail = verifiedClaims.email.toLowerCase();
        const verifiedUid = verifiedClaims.uid;
        const verifiedName = sanitizeText(
          verifiedClaims.name || verifiedEmail.split('@')[0] || 'Linux User',
          60
        );
        const verifiedPicture = verifiedClaims.picture ? sanitizeUrl(verifiedClaims.picture) : null;

        let dbUser = await findUserByFirebaseUidOrEmailFromD1(env, verifiedUid, verifiedEmail);
        if (!dbUser) {
          const baseUsername = sanitizeUsername(verifiedEmail.split('@')[0]) || 'linux_user';
          const existingUsername = await findUserByLoginFromD1(env, baseUsername);
          const finalUsername = existingUsername
            ? `${baseUsername.slice(0, 18)}_${crypto.randomUUID().slice(0, 4)}`
            : baseUsername;

          dbUser = {
            id: `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
            email: verifiedEmail,
            username: finalUsername,
            displayName: verifiedName,
            role: 'USER',
            plan: 'free',
            avatarUrl:
              verifiedPicture ||
              `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(finalUsername)}`,
            firebaseUid: verifiedUid,
          };
        } else {
          dbUser.firebaseUid = verifiedUid;
          if (verifiedPicture && !dbUser.avatarUrl) {
            dbUser.avatarUrl = verifiedPicture;
          }
        }

        await saveUserToD1(env, dbUser);

        const token = await createWorkerJwt({ id: dbUser.id, sub: dbUser.id }, secret);
        if (env?.NIRUVI_AUTH_KV) {
          try {
            await env.NIRUVI_AUTH_KV.put(`session:${token}`, JSON.stringify({ id: dbUser.id }), {
              expirationTtl: 604800,
            });
          } catch {}
        }

        const devProfile = await getDeveloperProfileFromD1(env, dbUser.id);
        return jsonResponse(
          {
            success: true,
            user: toPublicUserDto(dbUser),
            developerProfile: devProfile,
          },
          200,
          origin,
          { 'Set-Cookie': buildSessionCookie(token) }
        );
      }

      // 5. POST /api/auth/forgot-password
      if (path === '/api/auth/forgot-password' && method === 'POST') {
        const rl = await checkAuthRateLimit(request, env, 'forgot_password');
        if (!rl.allowed) {
          return jsonResponse(
            { error: 'Too many password reset requests. Please wait 10 minutes.' },
            429,
            origin,
            { 'Retry-After': String(rl.retryAfterSeconds) }
          );
        }
        // Generic response: never reveal whether the email exists
        return jsonResponse(
          {
            success: true,
            message: 'If an account is associated with that email, password reset instructions have been sent.',
          },
          200,
          origin
        );
      }

      // 6. POST /api/auth/logout
      if (path === '/api/auth/logout' && method === 'POST') {
        const token = extractSessionToken(request);
        if (token && env?.NIRUVI_AUTH_KV) {
          try {
            await env.NIRUVI_AUTH_KV.delete(`session:${token}`);
          } catch {}
        }

        return jsonResponse(
          { success: true, message: 'Logged out successfully' },
          200,
          origin,
          { 'Set-Cookie': buildClearSessionCookie() }
        );
      }

      // 7. GET /api/auth/me — Re-checks user role & plan from D1 on every request
      if (path === '/api/auth/me' && (method === 'GET' || method === 'POST')) {
        const dbUser = await authenticateAndVerifyD1User(request, env, secret);
        if (!dbUser) {
          return jsonResponse({ error: 'Authentication required' }, 401, origin);
        }

        const devProfile = await getDeveloperProfileFromD1(env, dbUser.id);
        return jsonResponse(
          {
            user: toPublicUserDto(dbUser),
            developerProfile: devProfile,
          },
          200,
          origin
        );
      }

      // 8. PUT /api/user/profile
      if (path === '/api/user/profile' && method === 'PUT') {
        const dbUser = await authenticateAndVerifyD1User(request, env, secret);
        if (!dbUser) {
          return jsonResponse({ error: 'Authentication required' }, 401, origin);
        }

        const body = (await request.json().catch(() => ({}))) as Record<string, any>;
        const newDisplayName = sanitizeText(body.displayName || dbUser.displayName, 60);
        const newUsername = sanitizeUsername(body.username || dbUser.username);

        if (!newUsername || newUsername.length < 3) {
          return jsonResponse({ error: 'Username must be 3–24 characters' }, 400, origin);
        }

        if (newUsername !== dbUser.username) {
          const existing = await findUserByLoginFromD1(env, newUsername);
          if (existing && existing.id !== dbUser.id) {
            return jsonResponse({ error: 'Username is already taken' }, 400, origin);
          }
          dbUser.username = newUsername;
        }
        if (newDisplayName) {
          dbUser.displayName = newDisplayName;
        }

        await saveUserToD1(env, dbUser);
        return jsonResponse({ success: true, user: toPublicUserDto(dbUser) }, 200, origin);
      }

      // 9. POST /api/developer/register — Re-checks D1 user and updates D1 developer_profiles
      if (path === '/api/developer/register' && method === 'POST') {
        const dbUser = await authenticateAndVerifyD1User(request, env, secret);
        if (!dbUser) {
          return jsonResponse({ error: 'Authentication required' }, 401, origin);
        }

        const body = (await request.json().catch(() => ({}))) as Record<string, any>;
        const orgName = sanitizeText(body.orgName, 100);
        const orgWebsite = body.orgWebsite ? sanitizeUrl(body.orgWebsite) : null;
        const orgDescription = sanitizeText(body.orgDescription || '', 500);
        const payoutEmail = typeof body.payoutEmail === 'string' ? body.payoutEmail.trim().toLowerCase() : '';

        if (!orgName || !payoutEmail) {
          return jsonResponse({ error: 'Organization name and payout email are required' }, 400, origin);
        }

        if (dbUser.role === 'USER') {
          dbUser.role = 'DEVELOPER';
          dbUser.plan = 'pro_developer';
          await saveUserToD1(env, dbUser);
        }

        const profileId = `dev_${dbUser.id}`;
        if (env?.DB) {
          await ensureD1Tables(env.DB);
          await env.DB.prepare(
            `INSERT INTO developer_profiles (id, user_id, org_name, org_website, org_description, payout_email, verified)
             VALUES (?, ?, ?, ?, ?, ?, 1)
             ON CONFLICT(user_id) DO UPDATE SET
               org_name = excluded.org_name,
               org_website = excluded.org_website,
               org_description = excluded.org_description,
               payout_email = excluded.payout_email`
          )
            .bind(profileId, dbUser.id, orgName, orgWebsite, orgDescription, payoutEmail)
            .run();
        } else {
          memoryDevProfiles.set(dbUser.id, {
            id: profileId,
            userId: dbUser.id,
            orgName,
            orgWebsite,
            orgDescription,
            payoutEmail,
            verified: true,
          });
        }

        return jsonResponse(
          {
            success: true,
            message: 'Developer profile configured successfully!',
            user: toPublicUserDto(dbUser),
            developerProfile: await getDeveloperProfileFromD1(env, dbUser.id),
          },
          200,
          origin
        );
      }

      // 10. Health check & Catalog / Reports / Submissions / Admin endpoints
      if (path === '/api/health' && method === 'GET') {
        return jsonResponse({ status: 'ok', runtime: 'cloudflare-workers' }, 200, origin);
      }

      // 11. GET /api/catalog — Paginated, filterable catalog combining built-in + D1/AppImageHub apps
      if (path === '/api/catalog' && method === 'GET') {
        const q = (url.searchParams.get('q') || '').trim().toLowerCase();
        const category = (url.searchParams.get('category') || 'All').trim();
        const arch = (url.searchParams.get('arch') || 'All').trim();
        const verifiedOnly =
          url.searchParams.get('verified') === 'true' || url.searchParams.get('verified') === '1';
        const recentlyUpdated =
          url.searchParams.get('updated') === 'true' || url.searchParams.get('updated') === '1';
        const sort = (url.searchParams.get('sort') || 'featured').trim();
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(
          200,
          Math.max(1, parseInt(url.searchParams.get('limit') || '48', 10) || 48)
        );

        const allApps = await getMergedCatalogApps(env);
        const filtered = allApps
          .filter((app) => {
            if (q) {
              const hay = `${app.name} ${app.tagline} ${app.description} ${app.publisher.name} ${(app.tags || []).join(' ')}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            if (category !== 'All') {
              const simplified = app.simplifiedCategory || mapToSimplifiedCategory(app.category);
              if (app.category !== category && simplified !== category) return false;
            }
            if (arch !== 'All' && !app.architectures.includes(arch as any)) {
              return false;
            }
            if (verifiedOnly && (!app.publisher.verified || !isGenuineSha256(app.sha256))) {
              return false;
            }
            if (recentlyUpdated) {
              const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
              const ts = new Date(app.releaseDate).getTime();
              if (!Number.isFinite(ts) || ts < cutoff) return false;
            }
            return true;
          })
          .sort((a, b) => {
            if (sort === 'popular') return (b.downloadsCount || 0) - (a.downloadsCount || 0);
            if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
            if (sort === 'recent') {
              return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
            }
            if (sort === 'name') return a.name.localeCompare(b.name);
            if (a.publisher.verified && !b.publisher.verified) return -1;
            if (!a.publisher.verified && b.publisher.verified) return 1;
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return (b.downloadsCount || 0) - (a.downloadsCount || 0);
          });

        const total = filtered.length;
        const start = (page - 1) * limit;
        const items = filtered.slice(start, start + limit);

        return jsonResponse(
          {
            items,
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
          200,
          origin
        );
      }

      // 12. GET /api/catalog/:id — Single app detail + version history (with on-demand GitHub Releases cache)
      if (path.startsWith('/api/catalog/') && path !== '/api/catalog/sync' && method === 'GET') {
        const appId = decodeURIComponent(path.slice('/api/catalog/'.length)).trim().toLowerCase();
        const allApps = await getMergedCatalogApps(env);
        const found = allApps.find((a) => a.id.toLowerCase() === appId);
        if (!found) {
          return jsonResponse({ error: 'Application not found' }, 404, origin);
        }

        // Enrich with GitHub Releases history on demand if not yet populated
        let enriched = found;
        const repoSlug =
          found.githubRepo ||
          (found.repositoryUrl
            ? found.repositoryUrl.replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '')
            : '');
        if (
          repoSlug &&
          (!found.versionHistory || found.versionHistory.length === 0)
        ) {
          try {
            const releases = await fetchCachedGitHubReleases(env, repoSlug);
            const extracted = await extractVersionHistoryFromReleases(releases);
            if (extracted) {
              enriched = {
                ...found,
                versionHistory: extracted.versionHistory,
              };
            }
          } catch {
            // Return existing app metadata if GitHub API is rate-limited or offline
          }
        }

        return jsonResponse({ app: enriched }, 200, origin);
      }

      // 13. POST /api/catalog/sync — Idempotent AppImageHub + GitHub Releases batch sync
      if (path === '/api/catalog/sync' && method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as Record<string, any>;
        const maxItems = Math.min(200, Math.max(1, Number(body.maxItems) || 50));
        const maxGithubEnrich = Math.min(25, Math.max(0, Number(body.maxGithubEnrich) || 5));
        const summary = await syncAppImageHubCatalogBatch(env, {
          maxItems,
          maxGithubEnrich,
        });
        return jsonResponse({ success: true, ...summary }, 200, origin);
      }

      // 14. POST /api/reports — "Report broken app" endpoint
      if (path === '/api/reports' && method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as Record<string, any>;
        const appId = sanitizeText(body.appId || '', 64).toLowerCase();
        const appName = sanitizeText(body.appName || appId, 100);
        const reason = sanitizeText(body.reason || '', 80);
        const details = sanitizeText(body.details || '', 1500);
        const distro = sanitizeText(body.distro || '', 80);
        const architecture = sanitizeText(body.architecture || 'x86_64', 20);
        const reporterEmail =
          typeof body.reporterEmail === 'string' ? body.reporterEmail.trim().slice(0, 120) : '';

        if (!appId || !reason || details.length < 5) {
          return jsonResponse(
            { error: 'Please provide an application ID, issue reason, and brief details.' },
            400,
            origin
          );
        }

        const reportId = `rep_${crypto.randomUUID()}`;
        const createdAt = new Date().toISOString();

        if (env?.DB) {
          await ensureD1Tables(env.DB);
          await env.DB.prepare(
            `INSERT INTO app_reports (id, app_id, app_name, reason, details, distro, architecture, reporter_email, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`
          )
            .bind(
              reportId,
              appId,
              appName,
              reason,
              details,
              distro || null,
              architecture,
              reporterEmail || null,
              createdAt
            )
            .run();
        } else {
          memoryReports.push({
            id: reportId,
            appId,
            appName,
            reason,
            details,
            distro,
            architecture,
            reporterEmail,
            status: 'open',
            createdAt,
          });
        }

        return jsonResponse(
          {
            success: true,
            reportId,
            message: 'Thank you. Your broken package report has been logged for maintainer review.',
          },
          201,
          origin
        );
      }

      // 15. POST /api/submissions — "Submit an app" endpoint
      if (path === '/api/submissions' && method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as Record<string, any>;
        const name = sanitizeText(body.name || '', 100);
        const description = sanitizeText(body.description || '', 2000);
        const category = mapToSimplifiedCategory(body.category || 'System/Utilities');
        const homepageUrl = body.homepageUrl ? sanitizeUrl(body.homepageUrl) : '';
        const githubRepo = sanitizeText(body.githubRepo || '', 120);
        const downloadUrl = sanitizeUrl(body.downloadUrl || '');
        const sha256Raw = typeof body.sha256 === 'string' ? body.sha256.trim().toLowerCase() : '';
        const license = sanitizeText(body.license || 'Open Source', 60);
        const submitterEmail =
          typeof body.submitterEmail === 'string' ? body.submitterEmail.trim().slice(0, 120) : '';

        if (!name || !description || !downloadUrl.startsWith('https://')) {
          return jsonResponse(
            {
              error:
                'Application name, description, and a valid https:// AppImage download URL are required.',
            },
            400,
            origin
          );
        }

        const verifiedSha = isGenuineSha256(sha256Raw) ? sha256Raw : '';
        const submissionId = `sub_${crypto.randomUUID()}`;
        const appId = name
          .toLowerCase()
          .replace(/[^a-z0-9._-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 64);

        if (env?.DB) {
          await ensureD1Tables(env.DB);
          await env.DB.prepare(
            `INSERT INTO app_submissions (id, app_id, name, description, category, homepage_url, github_repo, download_url, sha256, license, submitter_email, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review')`
          )
            .bind(
              submissionId,
              appId,
              name,
              description,
              category,
              homepageUrl || null,
              githubRepo,
              downloadUrl,
              verifiedSha || null,
              license,
              submitterEmail || null
            )
            .run();
        } else {
          memorySubmissions.push({
            id: submissionId,
            appId,
            name,
            description,
            category,
            homepageUrl,
            githubRepo,
            downloadUrl,
            sha256: verifiedSha,
            verified: Boolean(verifiedSha),
            license,
            submitterEmail,
            status: 'pending_review',
          });
        }

        return jsonResponse(
          {
            success: true,
            submissionId,
            verified: Boolean(verifiedSha),
            message: 'Application submitted successfully to the Niruvi Store review queue.',
          },
          201,
          origin
        );
      }

      if (path.startsWith('/api/admin/')) {
        const dbUser = await authenticateAndVerifyD1User(request, env, secret);
        if (!dbUser) {
          return jsonResponse({ error: 'Authentication required' }, 401, origin);
        }
        if (dbUser.role !== 'ADMIN' && dbUser.role !== 'MODERATOR') {
          return jsonResponse({ error: 'Forbidden: Admin privileges required (verified via D1)' }, 403, origin);
        }
        return jsonResponse({ status: 'authorized', role: dbUser.role, plan: dbUser.plan }, 200, origin);
      }

      if (path.startsWith('/api/security/')) {
        const dbUser = await authenticateAndVerifyD1User(request, env, secret);
        if (!dbUser) {
          return jsonResponse({ error: 'Authentication required' }, 401, origin);
        }
        const hasServerPlan =
          dbUser.role === 'ADMIN' ||
          dbUser.role === 'DEVELOPER' ||
          dbUser.plan === 'pro_developer' ||
          dbUser.plan === 'team';
        if (!hasServerPlan) {
          return jsonResponse(
            { error: 'Forbidden: Developer or Pro plan required (verified via D1)' },
            403,
            origin
          );
        }
        return jsonResponse({ status: 'authorized', role: dbUser.role, plan: dbUser.plan }, 200, origin);
      }

      return jsonResponse({ error: 'Endpoint not found' }, 404, origin);
    } catch {
      return jsonResponse({ error: 'Internal server error' }, 500, origin);
    }
  },

  /**
   * Cloudflare Cron Trigger Handler (`0 *\/6 * * *`)
   * Idempotently refreshes the AppImageHub catalog and enriches GitHub-hosted releases.
   */
  async scheduled(
    _event: { cron?: string; scheduledTime?: number },
    env: Env,
    ctx?: { waitUntil?: (promise: Promise<any>) => void }
  ): Promise<void> {
    const task = syncAppImageHubCatalogBatch(env, {
      maxItems: 150,
      maxGithubEnrich: 12,
    });
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(task);
    } else {
      await task;
    }
  },
};

/**
 * Fetches GitHub Releases for `owner/repo` with KV caching and GitHub token authentication.
 */
export async function fetchCachedGitHubReleases(
  env: Env,
  repoSlug: string,
  fetchImpl: typeof fetch = fetch
): Promise<GitHubReleaseResponse[]> {
  const cleanRepo = repoSlug.replace(/^\/+|\/+$/g, '');
  const cacheKey = `gh_releases:${cleanRepo.toLowerCase()}`;

  if (env?.NIRUVI_AUTH_KV) {
    try {
      const cached = await env.NIRUVI_AUTH_KV.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as GitHubReleaseResponse[];
      }
    } catch {
      // Fall through to live GitHub API call
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'NiruviStore-CatalogWorker/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (env?.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  const apiUrl = `https://api.github.com/repos/${cleanRepo}/releases?per_page=8`;
  const res = await fetchImpl(apiUrl, { headers });

  const remainingHeader = res.headers?.get?.('X-RateLimit-Remaining');
  if (res.status === 403 || res.status === 429 || remainingHeader === '0') {
    throw new Error(`GitHub API rate limit reached for ${cleanRepo} (status ${res.status})`);
  }
  if (!res.ok) {
    throw new Error(`GitHub Releases API returned ${res.status} for ${cleanRepo}`);
  }

  const releases = (await res.json()) as GitHubReleaseResponse[];
  if (env?.NIRUVI_AUTH_KV && Array.isArray(releases)) {
    try {
      await env.NIRUVI_AUTH_KV.put(cacheKey, JSON.stringify(releases), {
        expirationTtl: 6 * 3600,
      });
    } catch {
      // Ignore KV cache write failure
    }
  }

  return Array.isArray(releases) ? releases : [];
}

/**
 * Idempotent batch sync job that ingests AppImageHub (`https://appimage.github.io/feed.json`),
 * enriches GitHub-hosted packages with release assets and SHA-256 checksums, stores in D1/memory,
 * and logs per-app errors without stopping the batch.
 */
export async function syncAppImageHubCatalogBatch(
  env: Env,
  options: {
    maxItems?: number;
    maxGithubEnrich?: number;
    rawFeedItemsOverride?: RawAppImageHubItem[];
    fetchImpl?: typeof fetch;
  } = {}
): Promise<{
  runId: string;
  processed: number;
  enriched: number;
  verifiedCount: number;
  failedCount: number;
  errors: Array<{ appId: string; message: string }>;
}> {
  const runId = `sync_${crypto.randomUUID()}`;
  const fetchFn = options.fetchImpl || fetch;
  const maxItems = options.maxItems ?? 100;
  const maxGithubEnrich = options.maxGithubEnrich ?? 8;

  await ensureD1Tables(env?.DB);

  let rawItems: RawAppImageHubItem[] = [];
  if (Array.isArray(options.rawFeedItemsOverride)) {
    rawItems = options.rawFeedItemsOverride;
  } else {
    const res = await fetchFn(APPIMAGEHUB_FEED_URL, {
      headers: { 'User-Agent': 'NiruviStore-CatalogWorker/1.0' },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch AppImageHub feed: HTTP ${res.status}`);
    }
    const payload = (await res.json()) as { items?: RawAppImageHubItem[] };
    rawItems = Array.isArray(payload.items) ? payload.items : [];
  }

  let processed = 0;
  let enriched = 0;
  let verifiedCount = 0;
  let failedCount = 0;
  const errors: Array<{ appId: string; message: string }> = [];

  for (const rawItem of rawItems.slice(0, maxItems)) {
    const candidateId = typeof rawItem?.name === 'string' ? rawItem.name : 'unknown';
    try {
      const normalized = normalizeAppImageHubItem(rawItem);
      if (!normalized) continue;

      let releaseInfo: Awaited<ReturnType<typeof extractVersionHistoryFromReleases>> = null;
      if (normalized.github_repo && enriched < maxGithubEnrich) {
        try {
          const releases = await fetchCachedGitHubReleases(env, normalized.github_repo, fetchFn);
          releaseInfo = await extractVersionHistoryFromReleases(releases, fetchFn);
          if (releaseInfo) {
            enriched += 1;
          }
        } catch (ghErr: any) {
          // Log GitHub enrichment warning per app but continue syncing normalized entry
          await recordSyncLog(
            env,
            runId,
            normalized.id,
            'warning',
            ghErr?.message || 'GitHub release enrichment skipped'
          );
        }
      }

      const appMeta = buildAppMetadataFromNormalized(normalized, releaseInfo);
      if (appMeta.publisher.verified && isGenuineSha256(appMeta.sha256)) {
        verifiedCount += 1;
      }

      await upsertCatalogAppToD1(env, appMeta);
      processed += 1;
    } catch (err: any) {
      failedCount += 1;
      const msg = err?.message || 'Unexpected normalization error';
      errors.push({ appId: candidateId, message: msg });
      await recordSyncLog(env, runId, candidateId, 'error', msg);
    }
  }

  await recordSyncLog(
    env,
    runId,
    null,
    'completed',
    `Processed ${processed} apps (${enriched} GitHub-enriched, ${verifiedCount} verified, ${failedCount} failed)`
  );

  return {
    runId,
    processed,
    enriched,
    verifiedCount,
    failedCount,
    errors,
  };
}

async function recordSyncLog(
  env: Env,
  runId: string,
  appId: string | null,
  status: string,
  message: string
): Promise<void> {
  const id = `log_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  if (env?.DB) {
    try {
      await env.DB.prepare(
        `INSERT INTO catalog_sync_logs (id, run_id, app_id, status, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(id, runId, appId, status, message.slice(0, 500), createdAt)
        .run();
      return;
    } catch {
      // Fallback to memory log
    }
  }
  memorySyncLogs.push({ id, runId, appId, status, message, createdAt });
}

async function upsertCatalogAppToD1(env: Env, app: AppMetadata): Promise<void> {
  const isVerified = Boolean(app.publisher.verified && isGenuineSha256(app.sha256));
  const simplified = app.simplifiedCategory || mapToSimplifiedCategory(app.category);

  if (env?.DB) {
    try {
      await env.DB.prepare(
        `INSERT INTO catalog_apps (
          id, name, tagline, description, category, categories_json, version, release_date,
          size, architectures_json, license, license_category, publisher_name, publisher_website,
          publisher_github, verified, sha256, download_url, download_map_json, icon_url,
          screenshots_json, homepage_url, github_repo, releases_url, featured, downloads_count,
          rating, release_notes, version_history_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          tagline = excluded.tagline,
          description = excluded.description,
          category = excluded.category,
          categories_json = excluded.categories_json,
          version = excluded.version,
          release_date = excluded.release_date,
          size = excluded.size,
          architectures_json = excluded.architectures_json,
          license = excluded.license,
          license_category = excluded.license_category,
          publisher_name = excluded.publisher_name,
          publisher_website = excluded.publisher_website,
          publisher_github = excluded.publisher_github,
          verified = excluded.verified,
          sha256 = excluded.sha256,
          download_url = excluded.download_url,
          download_map_json = excluded.download_map_json,
          icon_url = excluded.icon_url,
          screenshots_json = excluded.screenshots_json,
          homepage_url = excluded.homepage_url,
          github_repo = excluded.github_repo,
          releases_url = excluded.releases_url,
          version_history_json = excluded.version_history_json,
          updated_at = excluded.updated_at`
      )
        .bind(
          app.id,
          app.name,
          app.tagline,
          app.description,
          simplified,
          JSON.stringify(app.tags || [simplified]),
          app.version,
          app.releaseDate,
          app.size,
          JSON.stringify(app.architectures || ['x86_64']),
          app.license,
          app.licenseCategory,
          app.publisher.name,
          app.publisher.website || null,
          app.publisher.github || null,
          isVerified ? 1 : 0,
          isVerified ? app.sha256 : '',
          app.downloadUrl,
          JSON.stringify(app.downloadMap || {}),
          app.icon || null,
          JSON.stringify(app.screenshots || []),
          app.homepageUrl || null,
          app.githubRepo || null,
          app.releasesUrl || null,
          app.featured ? 1 : 0,
          app.downloadsCount || 0,
          app.rating || 0,
          app.changelog?.[0] || null,
          JSON.stringify(app.versionHistory || []),
          new Date().toISOString()
        )
        .run();
      return;
    } catch {
      // Fallback to in-memory catalog store
    }
  }

  memoryCatalogApps.set(app.id, {
    ...app,
    simplifiedCategory: simplified,
    publisher: {
      ...app.publisher,
      verified: isVerified,
    },
    sha256: isVerified ? app.sha256 : '',
  });
}

async function getMergedCatalogApps(env: Env): Promise<AppMetadata[]> {
  const merged = new Map<string, AppMetadata>();

  for (const app of APPS_CATALOG) {
    const isVerified = Boolean(app.publisher.verified && isGenuineSha256(app.sha256));
    merged.set(app.id, {
      ...app,
      simplifiedCategory: app.simplifiedCategory || mapToSimplifiedCategory(app.category),
      publisher: {
        ...app.publisher,
        verified: isVerified,
      },
    });
  }

  for (const [id, app] of memoryCatalogApps.entries()) {
    merged.set(id, app);
  }

  if (env?.DB) {
    try {
      await ensureD1Tables(env.DB);
      const { results } = await env.DB.prepare(
        `SELECT * FROM catalog_apps ORDER BY verified DESC, release_date DESC LIMIT 2000`
      ).all<Record<string, any>>();

      for (const row of results || []) {
        const isVerified = Boolean(row.verified && isGenuineSha256(row.sha256));
        const existing = merged.get(row.id);
        merged.set(row.id, {
          id: row.id,
          name: row.name,
          tagline: row.tagline,
          description: row.description,
          category: (existing?.category || row.category) as any,
          simplifiedCategory: mapToSimplifiedCategory(row.category),
          version: row.version,
          releaseDate: row.release_date,
          size: row.size,
          architectures: JSON.parse(row.architectures_json || '["x86_64"]'),
          license: row.license,
          licenseCategory: row.license_category || 'Open Source',
          publisher: {
            name: row.publisher_name,
            website: row.publisher_website || undefined,
            github: row.publisher_github || undefined,
            verified: isVerified,
          },
          sha256: isVerified ? row.sha256 : '',
          downloadUrl: row.download_url,
          downloadMap: JSON.parse(row.download_map_json || '{}'),
          iconSlug: row.id,
          icon: row.icon_url || existing?.icon,
          homepageUrl: row.homepage_url || undefined,
          sourceUrl: row.publisher_github || row.homepage_url || undefined,
          repositoryUrl: row.publisher_github || undefined,
          releasesUrl: row.releases_url || undefined,
          githubRepo: row.github_repo || undefined,
          trustTier: isVerified ? 'Official Developer' : 'Unverified Community',
          officialStatus: isVerified,
          tags: JSON.parse(row.categories_json || '[]'),
          featured: Boolean(row.featured && isVerified),
          downloadsCount: Number(row.downloads_count) || existing?.downloadsCount || 0,
          rating: Number(row.rating) || existing?.rating || 0,
          versionHistory: JSON.parse(row.version_history_json || '[]'),
          screenshots: JSON.parse(row.screenshots_json || '[]'),
        });
      }
    } catch {
      // Fallback to built-in + memory catalog if D1 query fails
    }
  }

  return Array.from(merged.values());
}

/**
 * Cryptographically verifies a Firebase ID Token (RS256) against Google's public X.509 / JWK certificates
 * using the Web Crypto API (`crypto.subtle.verify`).
 */
export async function verifyFirebaseIdToken(
  idToken: string,
  expectedProjectId: string
): Promise<{
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
} | null> {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecodeToUint8Array(encodedHeader)));
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecodeToUint8Array(encodedPayload)));

    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
    if (typeof payload.iat !== 'number' || payload.iat > now + 300) return null;
    if (payload.aud !== expectedProjectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${expectedProjectId}`) return null;
    if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) return null;

    const cryptoKey = await getGooglePublicCryptoKey(header.kid);
    if (!cryptoKey) return null;

    const unsignedData = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
    const signatureBytes = base64UrlDecodeToUint8Array(encodedSignature);

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes as unknown as BufferSource,
      unsignedData
    );

    if (!isValid) return null;

    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      picture: typeof payload.picture === 'string' ? payload.picture : undefined,
      emailVerified: Boolean(payload.email_verified),
    };
  } catch {
    return null;
  }
}

/**
 * Fetches Google's public certs from
 * https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
 * and imports the matching key for `kid` via Web Crypto API.
 */
async function getGooglePublicCryptoKey(kid: string): Promise<CryptoKey | null> {
  const now = Date.now();

  // 1. Fetch X.509 certificates from Google's official securetoken endpoint
  try {
    if (!cachedGoogleCerts || cachedGoogleCerts.expiresAt <= now) {
      const res = await fetch(GOOGLE_CERTS_URL);
      if (res.ok) {
        const cacheControl = res.headers.get('Cache-Control') || '';
        const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
        const maxAgeMs = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3600 * 1000;
        const certs = (await res.json()) as Record<string, string>;
        cachedGoogleCerts = { certs, expiresAt: now + maxAgeMs };
      }
    }

    const pem = cachedGoogleCerts?.certs?.[kid];
    if (pem) {
      const spki = extractSpkiFromX509Pem(pem);
      if (spki) {
        return await crypto.subtle.importKey(
          'spki',
          spki as unknown as BufferSource,
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['verify']
        );
      }
    }
  } catch {
    // Fall through to Google JWKS endpoint if X.509 SPKI parsing fails
  }

  // 2. Fallback: Google's securetoken JWK endpoint
  try {
    if (!cachedGoogleJwks || cachedGoogleJwks.expiresAt <= now) {
      const res = await fetch(GOOGLE_JWKS_URL);
      if (res.ok) {
        const data = (await res.json()) as { keys?: any[] };
        cachedGoogleJwks = { keys: data.keys || [], expiresAt: now + 3600 * 1000 };
      }
    }
    const jwk = cachedGoogleJwks?.keys?.find((k: any) => k.kid === kid);
    if (jwk) {
      return await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      );
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Extracts the ASN.1 DER SubjectPublicKeyInfo (SPKI) sequence from an X.509 PEM certificate
 * so it can be imported directly via `crypto.subtle.importKey('spki', ...)`.
 */
export function extractSpkiFromX509Pem(pem: string): Uint8Array | null {
  try {
    const b64 = pem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s+/g, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Search for the standard rsaEncryption OID (1.2.840.113549.1.1.1):
    // 06 09 2A 86 48 86 F7 0D 01 01 01 05 00
    const rsaOid = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01];
    for (let i = 8; i < bytes.length - rsaOid.length; i++) {
      let match = true;
      for (let j = 0; j < rsaOid.length; j++) {
        if (bytes[i + j] !== rsaOid[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        // Walk backwards to find the enclosing SubjectPublicKeyInfo SEQUENCE (0x30)
        // AlgorithmIdentifier is a SEQUENCE at i - 2 (30 0d)
        const algSeqIdx = i - 2;
        if (bytes[algSeqIdx] !== 0x30) continue;

        // SubjectPublicKeyInfo is the SEQUENCE immediately preceding AlgorithmIdentifier
        for (let back = 2; back <= 6; back++) {
          const spkiStart = algSeqIdx - back;
          if (spkiStart >= 0 && bytes[spkiStart] === 0x30) {
            const lenInfo = readAsn1Length(bytes, spkiStart + 1);
            if (lenInfo && spkiStart + 1 + lenInfo.headerBytes + lenInfo.length <= bytes.length) {
              const totalLen = 1 + lenInfo.headerBytes + lenInfo.length;
              return bytes.slice(spkiStart, spkiStart + totalLen);
            }
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

function readAsn1Length(
  bytes: Uint8Array,
  offset: number
): { length: number; headerBytes: number } | null {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  if ((first & 0x80) === 0) {
    return { length: first, headerBytes: 1 };
  }
  const numBytes = first & 0x7f;
  if (numBytes < 1 || numBytes > 4 || offset + numBytes >= bytes.length) return null;
  let len = 0;
  for (let i = 1; i <= numBytes; i++) {
    len = (len << 8) | bytes[offset + i];
  }
  return { length: len, headerBytes: 1 + numBytes };
}

/**
 * Web Crypto PBKDF2-HMAC-SHA256 Password Hashing
 */
async function hashPasswordWebCrypto(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return `pbkdf2:100000:${base64UrlEncode(salt.buffer)}:${base64UrlEncode(derivedBits)}`;
}

async function verifyPasswordWebCrypto(password: string, storedHash: string): Promise<boolean> {
  try {
    if (!storedHash.startsWith('pbkdf2:')) return false;
    const parts = storedHash.split(':');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = base64UrlDecodeToUint8Array(parts[2]);
    const expected = base64UrlDecodeToUint8Array(parts[3]);

    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
      'deriveBits',
    ]);
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    const actual = new Uint8Array(derivedBits);
    if (actual.length !== expected.length) return false;

    // Constant-time comparison
    let diff = 0;
    for (let i = 0; i < actual.length; i++) {
      diff |= actual[i] ^ expected[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

/**
 * Standard Web Crypto API HMAC SHA-256 JWT Generation
 */
export async function createWorkerJwt(
  payload: Record<string, any>,
  secretStr: string
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = { ...payload, iat: now, exp: now + 604800 };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretStr),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(unsignedToken));
  const encodedSignature = base64UrlEncode(signature);

  return `${unsignedToken}.${encodedSignature}`;
}

/**
 * Standard Web Crypto API HMAC SHA-256 JWT Verification
 */
export async function verifyWorkerJwt(
  token: string,
  secretStr: string
): Promise<Record<string, any> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secretStr),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = base64UrlDecodeToUint8Array(encodedSignature);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature as unknown as BufferSource,
      enc.encode(unsignedToken)
    );

    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecodeToUint8Array(encodedPayload))
    );
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  let bytes: Uint8Array;
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = new Uint8Array(input);
  }

  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecodeToUint8Array(base64urlStr: string): Uint8Array {
  let base64 = base64urlStr.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
