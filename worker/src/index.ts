import {
  ALLOWED_CORS_ORIGINS,
  ALLOWED_DOWNLOAD_HOSTS,
  FIELD_LIMITS,
  RATE_LIMITS,
  STATIC_CATALOG_SLUGS,
  VALID_ARCHITECTURES,
} from './config';

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; meta?: Record<string, unknown> }>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface WorkerEnv {
  DB: D1Database;
  TURNSTILE_SECRET_KEY?: string;
  ADMIN_TOKEN?: string;
  IP_HASH_SALT?: string;
  ENABLE_HEAD_CHECK?: string;
}

export interface SubmissionRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  architecture: 'x86_64' | 'aarch64' | 'armhf';
  license: string;
  download_url: string;
  source_url: string;
  icon_url: string | null;
  sha256: string | null;
  status: 'published' | 'hidden';
  created_at: string;
  ip_hash?: string;
}

const SHA256_REGEX = /^[a-fA-F0-9]{64}$/;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Escapes HTML special characters before storing or displaying text.
 */
export function escapeText(raw: unknown, maxLength: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim()
    .slice(0, maxLength);
}

/**
 * Normalizes a name or slug into a URL-safe lowercase identifier.
 */
export function normalizeSlug(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, FIELD_LIMITS.slugMax);
}

/**
 * Checks if a hostname is on the allowed download hosts list (or is a subdomain of an allowed host).
 */
export function isHostOnAllowlist(hostname: string): boolean {
  const clean = hostname.trim().toLowerCase();
  if (!clean) return false;
  return ALLOWED_DOWNLOAD_HOSTS.some(
    (allowed) => clean === allowed || clean.endsWith(`.${allowed}`)
  );
}

/**
 * Validates an HTTPS URL and enforces maximum length.
 */
export function parseStrictHttpsUrl(raw: unknown): URL | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > FIELD_LIMITS.urlMax) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Checks that the download URL path ends with .AppImage (case-insensitive) or is a releases page.
 */
export function isValidAppImageOrReleasesPath(parsedUrl: URL): boolean {
  const pathname = decodeURIComponent(parsedUrl.pathname || '').trim();
  if (pathname.toLowerCase().endsWith('.appimage')) return true;
  return (
    /\/releases(\/|$)/i.test(pathname) ||
    /\/-\/releases(\/|$)/i.test(pathname) ||
    /\/projects\/[^/]+\/files(\/|$)/i.test(pathname)
  );
}

/**
 * Computes a salted SHA-256 hash of the client IP address so raw IPs are never stored.
 */
export async function computeIpHash(ip: string, salt = 'niruvi-default-salt'): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip.trim() || 'unknown'}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time comparison of Bearer token against Worker ADMIN_TOKEN secret using SHA-256 digests.
 */
export async function verifyAdminBearerToken(
  authHeader: string | null,
  adminSecret?: string
): Promise<boolean> {
  if (!adminSecret || !adminSecret.trim() || !authHeader) return false;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) return false;

  const enc = new TextEncoder();
  const [aBuf, bBuf] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(match[1].trim())),
    crypto.subtle.digest('SHA-256', enc.encode(adminSecret.trim())),
  ]);
  const a = new Uint8Array(aBuf);
  const b = new Uint8Array(bBuf);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Builds strict CORS headers allowing ONLY https://putinservai-cyber.github.io
 * and https://niruvi-store.runs-on.dev.
 */
export function buildCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
  };

  if (origin && (ALLOWED_CORS_ORIGINS as readonly string[]).includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...buildCorsHeaders(origin),
    },
  });
}

/**
 * Verifies a Cloudflare Turnstile response token via Cloudflare's siteverify endpoint.
 */
export async function verifyTurnstileToken(
  token: string,
  secretKey: string | undefined,
  remoteIp: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ success: boolean; error?: string }> {
  if (!token || !token.trim()) {
    return { success: false, error: 'Missing Cloudflare Turnstile verification token.' };
  }
  if (!secretKey || !secretKey.trim()) {
    return { success: false, error: 'Server Turnstile secret key is not configured.' };
  }

  try {
    const formData = new URLSearchParams();
    formData.set('secret', secretKey.trim());
    formData.set('response', token.trim());
    if (remoteIp) {
      formData.set('remoteip', remoteIp);
    }

    const res = await fetchImpl(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!res.ok) {
      return { success: false, error: 'Turnstile verification service unavailable.' };
    }

    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      return {
        success: false,
        error: 'Cloudflare Turnstile verification failed. Please complete the challenge again.',
      };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to verify Cloudflare Turnstile challenge.' };
  }
}

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    _ctx?: unknown,
    customFetch?: typeof fetch
  ): Promise<Response> {
    const origin = request.headers.get('Origin');
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method.toUpperCase();
    const fetchImpl = customFetch || fetch;

    // 1. Handle CORS Preflight
    if (method === 'OPTIONS') {
      if (origin && !(ALLOWED_CORS_ORIGINS as readonly string[]).includes(origin)) {
        return new Response(null, { status: 403, headers: buildCorsHeaders(null) });
      }
      return new Response(null, { status: 204, headers: buildCorsHeaders(origin) });
    }

    // Reject cross-origin state-changing requests from disallowed browser origins
    if (
      origin &&
      method !== 'GET' &&
      !(ALLOWED_CORS_ORIGINS as readonly string[]).includes(origin)
    ) {
      return jsonResponse({ error: 'Origin not allowed by CORS policy.' }, 403, null);
    }

    const contentLengthHeader = request.headers.get('Content-Length');
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (Number.isFinite(contentLength) && contentLength > 65536) {
        return jsonResponse({ error: 'Payload too large (maximum 64 KB).' }, 413, origin);
      }
    }

    try {
      // 2. GET /api/apps — Return published community submissions
      if (method === 'GET' && pathname === '/api/apps') {
        const { results } = await env.DB.prepare(
          `SELECT id, name, slug, description, version, architecture, license,
                  download_url, source_url, icon_url, sha256, status, created_at
           FROM submissions
           WHERE status = ?1
           ORDER BY created_at DESC
           LIMIT 200`
        )
          .bind('published')
          .all<SubmissionRow>();

        return jsonResponse({ apps: results || [] }, 200, origin);
      }

      // 3. POST /api/submit — Validate, check Turnstile + IP rate limit + duplicates, and insert as "published"
      if (method === 'POST' && pathname === '/api/submit') {
        let payload: Record<string, unknown>;
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return jsonResponse({ error: 'Invalid JSON request body.' }, 400, origin);
        }

        const rawName = typeof payload.name === 'string' ? payload.name.trim() : '';
        const rawDescription =
          typeof payload.description === 'string'
            ? payload.description.trim()
            : typeof payload.shortDescription === 'string'
              ? payload.shortDescription.trim()
              : '';
        const rawVersion =
          typeof payload.version === 'string' ? payload.version.trim().replace(/^v/i, '') : '';
        const rawArch = typeof payload.architecture === 'string' ? payload.architecture.trim() : '';
        const rawLicense = typeof payload.license === 'string' ? payload.license.trim() : '';
        const rawDownloadUrl =
          typeof payload.download_url === 'string'
            ? payload.download_url.trim()
            : typeof payload.downloadUrl === 'string'
              ? payload.downloadUrl.trim()
              : '';
        const rawSourceUrl =
          typeof payload.source_url === 'string'
            ? payload.source_url.trim()
            : typeof payload.sourceUrl === 'string'
              ? payload.sourceUrl.trim()
              : '';
        const rawIconUrl =
          typeof payload.icon_url === 'string'
            ? payload.icon_url.trim()
            : typeof payload.iconUrl === 'string'
              ? payload.iconUrl.trim()
              : '';
        const rawSha256 =
          typeof payload.sha256 === 'string' ? payload.sha256.trim().toLowerCase() : '';
        const turnstileToken =
          typeof payload.turnstileToken === 'string'
            ? payload.turnstileToken.trim()
            : typeof payload['cf-turnstile-response'] === 'string'
              ? (payload['cf-turnstile-response'] as string).trim()
              : '';

        // Field presence & length checks
        if (!rawName || rawName.length > FIELD_LIMITS.nameMax) {
          return jsonResponse(
            { error: `Name is required and must be at most ${FIELD_LIMITS.nameMax} characters.` },
            400,
            origin
          );
        }
        if (!rawDescription || rawDescription.length > FIELD_LIMITS.descriptionMax) {
          return jsonResponse(
            {
              error: `Description is required and must be at most ${FIELD_LIMITS.descriptionMax} characters.`,
            },
            400,
            origin
          );
        }
        if (!rawVersion || rawVersion.length > FIELD_LIMITS.versionMax) {
          return jsonResponse(
            {
              error: `Version is required and must be at most ${FIELD_LIMITS.versionMax} characters.`,
            },
            400,
            origin
          );
        }
        if (!(VALID_ARCHITECTURES as readonly string[]).includes(rawArch)) {
          return jsonResponse(
            {
              error: `Architecture must be one of: ${VALID_ARCHITECTURES.join(', ')}.`,
            },
            400,
            origin
          );
        }
        if (!rawLicense || rawLicense.length > FIELD_LIMITS.licenseMax) {
          return jsonResponse(
            {
              error: `License is required and must be at most ${FIELD_LIMITS.licenseMax} characters.`,
            },
            400,
            origin
          );
        }

        const slug = normalizeSlug(
          typeof payload.slug === 'string' && payload.slug.trim() ? payload.slug : rawName
        );
        if (!slug || slug.length < 2) {
          return jsonResponse(
            { error: 'Application name must produce a valid alphanumeric slug.' },
            400,
            origin
          );
        }

        // Validate download_url (HTTPS + allowlist + .AppImage or releases page)
        const parsedDownload = parseStrictHttpsUrl(rawDownloadUrl);
        if (!parsedDownload) {
          return jsonResponse(
            { error: 'Download URL must be a valid https:// URL.' },
            400,
            origin
          );
        }
        if (!isHostOnAllowlist(parsedDownload.hostname)) {
          return jsonResponse(
            {
              error: `Download URL host "${parsedDownload.hostname}" is not on the allowed hosts list (${ALLOWED_DOWNLOAD_HOSTS.slice(0, 5).join(', ')}).`,
            },
            400,
            origin
          );
        }
        if (!isValidAppImageOrReleasesPath(parsedDownload)) {
          return jsonResponse(
            {
              error:
                'Download URL must end with .AppImage (case-insensitive) or point to an official /releases page.',
            },
            400,
            origin
          );
        }

        // Validate source_url (HTTPS)
        const parsedSource = parseStrictHttpsUrl(rawSourceUrl);
        if (!parsedSource) {
          return jsonResponse(
            { error: 'Upstream source/repository URL must be a valid https:// URL.' },
            400,
            origin
          );
        }

        // Validate optional icon_url (HTTPS)
        let validatedIconUrl: string | null = null;
        if (rawIconUrl) {
          const parsedIcon = parseStrictHttpsUrl(rawIconUrl);
          if (!parsedIcon) {
            return jsonResponse(
              { error: 'Optional icon URL must be a valid https:// URL.' },
              400,
              origin
            );
          }
          validatedIconUrl = parsedIcon.toString();
        }

        // Validate optional sha256
        let validatedSha256: string | null = null;
        if (rawSha256) {
          if (!SHA256_REGEX.test(rawSha256)) {
            return jsonResponse(
              { error: 'Optional SHA-256 checksum must be 64 hexadecimal characters.' },
              400,
              origin
            );
          }
          validatedSha256 = rawSha256;
        }

        // Check against static catalog slugs
        if (STATIC_CATALOG_SLUGS.has(slug)) {
          return jsonResponse(
            { error: `An application with slug "${slug}" already exists in the base catalog.` },
            409,
            origin
          );
        }

        // Hash client IP (never store raw IP)
        const clientIp =
          request.headers.get('CF-Connecting-IP') ||
          request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
          '0.0.0.0';
        const ipHash = await computeIpHash(clientIp, env.IP_HASH_SALT);

        // Rate-limit check per IP hash
        const rateRow = await env.DB.prepare(
          `SELECT COUNT(*) AS count
           FROM submissions
           WHERE ip_hash = ?1
             AND created_at >= datetime('now', ?2)`
        )
          .bind(ipHash, `-${RATE_LIMITS.windowMinutes} minutes`)
          .first<{ count: number }>();

        if (rateRow && Number(rateRow.count) >= RATE_LIMITS.maxSubmissionsPerIpWindow) {
          return jsonResponse(
            { error: 'Rate limit exceeded. Please wait before submitting another application.' },
            429,
            origin
          );
        }

        // Verify Cloudflare Turnstile token
        const turnstileCheck = await verifyTurnstileToken(
          turnstileToken,
          env.TURNSTILE_SECRET_KEY,
          clientIp,
          fetchImpl
        );
        if (!turnstileCheck.success) {
          return jsonResponse(
            { error: turnstileCheck.error || 'Turnstile verification failed.' },
            403,
            origin
          );
        }

        // Check for duplicate slug, name, or download_url in D1 submissions table
        const existingRow = await env.DB.prepare(
          `SELECT id, slug, name
           FROM submissions
           WHERE slug = ?1
              OR lower(name) = lower(?2)
              OR lower(download_url) = lower(?3)
           LIMIT 1`
        )
          .bind(slug, rawName, parsedDownload.toString())
          .first<{ id: string; slug: string; name: string }>();

        if (existingRow) {
          return jsonResponse(
            {
              error: `A community submission for "${existingRow.name}" (${existingRow.slug}) already exists.`,
            },
            409,
            origin
          );
        }

        // Optional HEAD request check (never downloads or executes the file)
        if (env.ENABLE_HEAD_CHECK === 'true') {
          try {
            const headRes = await fetchImpl(parsedDownload.toString(), {
              method: 'HEAD',
              redirect: 'follow',
              signal: AbortSignal.timeout(8000),
              headers: { 'User-Agent': 'NiruviStore-SubmissionCheck/1.0' },
            });
            if (!headRes.ok) {
              return jsonResponse(
                {
                  error: `Download URL returned HTTP ${headRes.status} on HEAD check.`,
                },
                400,
                origin
              );
            }
          } catch {
            return jsonResponse(
              { error: 'Could not reach Download URL via HEAD request.' },
              400,
              origin
            );
          }
        }

        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const safeName = escapeText(rawName, FIELD_LIMITS.nameMax);
        const safeDescription = escapeText(rawDescription, FIELD_LIMITS.descriptionMax);
        const safeVersion = escapeText(rawVersion, FIELD_LIMITS.versionMax);
        const safeLicense = escapeText(rawLicense, FIELD_LIMITS.licenseMax);

        await env.DB.prepare(
          `INSERT INTO submissions (
             id, name, slug, description, version, architecture, license,
             download_url, source_url, icon_url, sha256, status, created_at, ip_hash
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'published', ?12, ?13)`
        )
          .bind(
            id,
            safeName,
            slug,
            safeDescription,
            safeVersion,
            rawArch,
            safeLicense,
            parsedDownload.toString(),
            parsedSource.toString(),
            validatedIconUrl,
            validatedSha256,
            createdAt,
            ipHash
          )
          .run();

        const createdSubmission: SubmissionRow = {
          id,
          name: safeName,
          slug,
          description: safeDescription,
          version: safeVersion,
          architecture: rawArch as SubmissionRow['architecture'],
          license: safeLicense,
          download_url: parsedDownload.toString(),
          source_url: parsedSource.toString(),
          icon_url: validatedIconUrl,
          sha256: validatedSha256,
          status: 'published',
          created_at: createdAt,
        };

        return jsonResponse(
          {
            success: true,
            submission: createdSubmission,
          },
          201,
          origin
        );
      }

      // 4. POST /api/report — Let visitors report an app
      if (method === 'POST' && pathname === '/api/report') {
        let payload: Record<string, unknown>;
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return jsonResponse({ error: 'Invalid JSON request body.' }, 400, origin);
        }

        const rawSlug =
          typeof payload.slug === 'string'
            ? payload.slug.trim()
            : typeof payload.appId === 'string'
              ? payload.appId.trim()
              : '';
        const rawReason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
        const rawDetails = typeof payload.details === 'string' ? payload.details.trim() : '';

        const slug = normalizeSlug(rawSlug);
        if (!slug) {
          return jsonResponse({ error: 'Application slug or ID is required.' }, 400, origin);
        }
        if (!rawReason || rawReason.length > FIELD_LIMITS.reportReasonMax) {
          return jsonResponse({ error: 'Report reason is required.' }, 400, origin);
        }
        if (!rawDetails || rawDetails.length < 5 || rawDetails.length > FIELD_LIMITS.reportDetailsMax) {
          return jsonResponse(
            { error: 'Please provide report details (between 5 and 1000 characters).' },
            400,
            origin
          );
        }

        const clientIp =
          request.headers.get('CF-Connecting-IP') ||
          request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
          '0.0.0.0';
        const ipHash = await computeIpHash(clientIp, env.IP_HASH_SALT);

        const reportRate = await env.DB.prepare(
          `SELECT COUNT(*) AS count
           FROM submission_reports
           WHERE ip_hash = ?1
             AND created_at >= datetime('now', ?2)`
        )
          .bind(ipHash, `-${RATE_LIMITS.windowMinutes} minutes`)
          .first<{ count: number }>();

        if (reportRate && Number(reportRate.count) >= RATE_LIMITS.maxReportsPerIpWindow) {
          return jsonResponse(
            { error: 'Too many reports submitted recently. Please try again later.' },
            429,
            origin
          );
        }

        const reportId = crypto.randomUUID();
        const safeReason = escapeText(rawReason, FIELD_LIMITS.reportReasonMax);
        const safeDetails = escapeText(rawDetails, FIELD_LIMITS.reportDetailsMax);
        const createdAt = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO submission_reports (id, app_slug, reason, details, created_at, ip_hash)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
        )
          .bind(reportId, slug, safeReason, safeDetails, createdAt, ipHash)
          .run();

        return jsonResponse(
          {
            success: true,
            message: 'Report received. Thank you for helping keep Niruvi Store safe.',
          },
          201,
          origin
        );
      }

      // 5. Admin Endpoints (Protected by ADMIN_TOKEN Worker secret)
      if (pathname.startsWith('/api/admin/')) {
        const isAuthorized = await verifyAdminBearerToken(
          request.headers.get('Authorization'),
          env.ADMIN_TOKEN
        );
        if (!isAuthorized) {
          return jsonResponse({ error: 'Unauthorized.' }, 401, origin);
        }

        if (method === 'GET' && pathname === '/api/admin/submissions') {
          const { results: submissions } = await env.DB.prepare(
            `SELECT id, name, slug, description, version, architecture, license,
                    download_url, source_url, icon_url, sha256, status, created_at
             FROM submissions
             ORDER BY created_at DESC
             LIMIT 200`
          ).all<SubmissionRow>();

          const { results: reports } = await env.DB.prepare(
            `SELECT id, app_slug, reason, details, created_at
             FROM submission_reports
             ORDER BY created_at DESC
             LIMIT 100`
          ).all();

          return jsonResponse(
            {
              submissions: submissions || [],
              reports: reports || [],
            },
            200,
            origin
          );
        }

        if (method === 'POST' && pathname === '/api/admin/hide') {
          let body: Record<string, unknown>;
          try {
            body = (await request.json()) as Record<string, unknown>;
          } catch {
            return jsonResponse({ error: 'Invalid JSON request body.' }, 400, origin);
          }

          const target =
            typeof body.id === 'string' && body.id.trim()
              ? body.id.trim()
              : typeof body.slug === 'string'
                ? body.slug.trim()
                : '';
          const nextStatus = body.status === 'published' ? 'published' : 'hidden';

          if (!target) {
            return jsonResponse({ error: 'Submission id or slug is required.' }, 400, origin);
          }

          await env.DB.prepare(
            `UPDATE submissions
             SET status = ?1
             WHERE id = ?2 OR slug = ?2`
          )
            .bind(nextStatus, target)
            .run();

          return jsonResponse({ success: true, target, status: nextStatus }, 200, origin);
        }

        if (method === 'POST' && pathname === '/api/admin/delete') {
          let body: Record<string, unknown>;
          try {
            body = (await request.json()) as Record<string, unknown>;
          } catch {
            return jsonResponse({ error: 'Invalid JSON request body.' }, 400, origin);
          }

          const target =
            typeof body.id === 'string' && body.id.trim()
              ? body.id.trim()
              : typeof body.slug === 'string'
                ? body.slug.trim()
                : '';

          if (!target) {
            return jsonResponse({ error: 'Submission id or slug is required.' }, 400, origin);
          }

          await env.DB.prepare(`DELETE FROM submissions WHERE id = ?1 OR slug = ?1`)
            .bind(target)
            .run();

          return jsonResponse({ success: true, deleted: target }, 200, origin);
        }

        if (method === 'DELETE' && pathname.startsWith('/api/admin/submissions/')) {
          const target = decodeURIComponent(
            pathname.slice('/api/admin/submissions/'.length)
          ).trim();
          if (!target) {
            return jsonResponse({ error: 'Submission id or slug is required.' }, 400, origin);
          }

          await env.DB.prepare(`DELETE FROM submissions WHERE id = ?1 OR slug = ?1`)
            .bind(target)
            .run();

          return jsonResponse({ success: true, deleted: target }, 200, origin);
        }
      }

      return jsonResponse({ error: 'Not found.' }, 404, origin);
    } catch {
      return jsonResponse({ error: 'Internal server error.' }, 500, origin);
    }
  },
};
