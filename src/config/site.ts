/**
 * Central site URL, base path, developer, and contact metadata configuration.
 * Uses VITE_BASE / VITE_SITE_URL when provided at build time.
 */
const metaEnv =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    : undefined;

const rawSiteUrl = (
  (metaEnv && metaEnv.VITE_SITE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SITE_URL) ||
  'https://putinservai-cyber.github.io/niruvi-store'
).trim();

const withProtocol = /^https?:\/\//i.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`;

export const SITE_URL = withProtocol.replace(/\/+$/, '');
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

const rawBase = (
  (metaEnv && (metaEnv.VITE_BASE || metaEnv.VITE_BASE_PATH || metaEnv.BASE_URL)) ||
  (typeof process !== 'undefined' &&
    process.env &&
    (process.env.VITE_BASE || process.env.VITE_BASE_PATH)) ||
  '/'
).trim();

export const BASE_URL = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

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
  const baseNoTrailing = BASE_URL.replace(/\/+$/, '');
  if (baseNoTrailing && baseNoTrailing !== '' && pathname.startsWith(baseNoTrailing)) {
    const rest = pathname.slice(baseNoTrailing.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

/**
 * Builds a canonical URL for any path on the site.
 */
export function buildCanonicalUrl(pathname = '/'): string {
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (cleanPath === '/' || cleanPath === '') {
    return `${SITE_URL}/`;
  }
  return `${SITE_URL}${cleanPath.replace(/\/+$/, '')}`;
}
