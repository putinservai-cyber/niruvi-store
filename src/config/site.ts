/**
 * Central site URL, base path, developer, and contact metadata configuration.
 * Uses VITE_BASE and VITE_SITE_URL when provided at build time.
 *
 * Defaults (GitHub Pages):
 *   VITE_BASE = '/niruvi-store/'
 *   VITE_SITE_URL = 'https://putinservai-cyber.github.io'
 *
 * Custom domain mode:
 *   VITE_BASE = '/'
 *   VITE_SITE_URL = 'https://niruvi-store.runs-on.dev'
 */
const metaEnv =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    : undefined;

const rawSiteOriginInput = (
  (metaEnv && metaEnv.VITE_SITE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SITE_URL) ||
  'https://niruvi-store.runs-on.dev'
).trim();

const httpsSiteOrigin = rawSiteOriginInput
  .replace(/^http:\/\//i, 'https://')
  .replace(/^(?!https:\/\/)/i, 'https://')
  .replace(/\/+$/, '');

const isCustomDomain = !httpsSiteOrigin.includes('github.io');

const rawBaseInput = isCustomDomain
  ? '/'
  : (
      (metaEnv && (metaEnv.VITE_BASE || metaEnv.VITE_BASE_PATH || metaEnv.BASE_URL)) ||
      (typeof process !== 'undefined' &&
        process.env &&
        (process.env.VITE_BASE || process.env.VITE_BASE_PATH)) ||
      '/niruvi-store/'
    ).trim();

const normalizedBaseLeading = rawBaseInput.startsWith('/') ? rawBaseInput : `/${rawBaseInput}`;
export const BASE_URL = normalizedBaseLeading.endsWith('/')
  ? normalizedBaseLeading
  : `${normalizedBaseLeading}/`;

const baseNoTrailing = BASE_URL.replace(/\/+$/, '');

export const SITE_ORIGIN =
  baseNoTrailing && httpsSiteOrigin.endsWith(baseNoTrailing)
    ? httpsSiteOrigin.slice(0, -baseNoTrailing.length)
    : httpsSiteOrigin;

/**
 * Full public root URL combining VITE_SITE_URL + VITE_BASE (without trailing slash),
 * e.g. 'https://putinservai-cyber.github.io/niruvi-store' or 'https://niruvi-store.runs-on.dev'.
 */
export const SITE_URL = `${SITE_ORIGIN}${baseNoTrailing}`;
export const SITE_NAME = 'Niruvi Store';
export const DEVELOPER_NAME = 'PutinServai';
export const CONTACT_EMAIL = 'niruvi.linux@gmail.com';
export const SUPPORT_EMAIL = 'support.niruvi@gmail.com';
export const KOFI_URL = 'https://ko-fi.com/putinservai';
export const RAZORPAY_URL = 'https://razorpay.me/@putin';
export const UPI_ID = 'putinservai-1@okhdfcbank';
export const DEFAULT_TITLE = 'Niruvi Store — Verified Linux AppImage Marketplace';
export const DEFAULT_DESCRIPTION =
  'Discover standalone Linux AppImage packages with cryptographic SHA-256 verification, upstream source transparency, and one-click niruvi:// desktop installation.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * Cloudflare Worker API Base URL (configured via VITE_API_URL) and Turnstile Site Key (VITE_TURNSTILE_SITE_KEY).
 * Note: If VITE_API_URL is accidentally pointed at a `*.supabase.co` host, we ignore it here
 * so `/api/*` Worker fetches never hit Supabase's API gateway without an `apikey` header.
 */
const rawApiBaseUrl = (
  (metaEnv && metaEnv.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) ||
  ''
)
  .trim()
  .replace(/\/+$/, '');

export const API_BASE_URL = /\.supabase\.co(\/|$)/i.test(rawApiBaseUrl) ? '' : rawApiBaseUrl;

export const HAS_API_BACKEND = Boolean(API_BASE_URL);

export const TURNSTILE_SITE_KEY = (
  (metaEnv && metaEnv.VITE_TURNSTILE_SITE_KEY) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_TURNSTILE_SITE_KEY) ||
  '0x4AAAAAAFLO1pJ9suZGgMaE'
).trim();

export function buildApiUrl(apiPath: string): string {
  const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

/**
 * Resolves a local asset or route path against Vite's configured BASE_URL
 * (e.g. '/niruvi-store/' on GitHub Pages or '/' on a custom domain).
 */
export function withBaseUrl(assetOrRoutePath: string): string {
  if (!assetOrRoutePath) return BASE_URL;
  if (/^(https?:|data:|blob:|mailto:|niruvi:|#)/i.test(assetOrRoutePath)) {
    return assetOrRoutePath;
  }
  if (BASE_URL !== '/' && assetOrRoutePath.startsWith(BASE_URL)) {
    return assetOrRoutePath;
  }
  const clean = assetOrRoutePath.replace(/^\/+/, '');
  if (!clean) return BASE_URL;
  return `${BASE_URL}${clean}`;
}

/**
 * Strips the configured BASE_URL prefix from a browser pathname so internal
 * route matching works identically under '/niruvi-store/' and '/'.
 */
export function stripBaseUrl(pathname: string): string {
  if (!pathname) return '/';
  if (baseNoTrailing && baseNoTrailing !== '' && pathname.startsWith(baseNoTrailing)) {
    const rest = pathname.slice(baseNoTrailing.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  if (pathname === '/niruvi-store' || pathname.startsWith('/niruvi-store/')) {
    const rest = pathname.slice('/niruvi-store'.length);
    return rest.startsWith('/') ? rest : `/${rest || ''}`;
  }
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

/**
 * Builds an absolute canonical URL from VITE_SITE_URL + VITE_BASE + pathname.
 */
export function buildCanonicalUrl(pathname = '/'): string {
  const stripped = stripBaseUrl(pathname);
  const cleanPath = stripped.startsWith('/') ? stripped : `/${stripped}`;
  if (cleanPath === '/' || cleanPath === '') {
    return `${SITE_URL}/`;
  }
  return `${SITE_URL}${cleanPath.replace(/\/+$/, '')}`;
}
