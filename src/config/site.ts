/**
 * Central site URL and metadata configuration.
 * Uses VITE_SITE_URL when provided at build time, falling back to the
 * live Cloudflare Workers production URL.
 */
const metaEnv =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    : undefined;

const rawSiteUrl = (
  (metaEnv && metaEnv.VITE_SITE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SITE_URL) ||
  'https://niruvi-store.putinservai.workers.dev'
).trim();

const withProtocol = /^https?:\/\//i.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`;

export const SITE_URL = withProtocol.replace(/\/+$/, '');
export const SITE_NAME = 'Niruvi Store';
export const DEFAULT_TITLE = 'Niruvi Store — Verified Linux AppImage Marketplace';
export const DEFAULT_DESCRIPTION =
  'Discover standalone Linux AppImage packages with cryptographic SHA-256 verification, upstream source transparency, and one-click niruvi:// desktop installation.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

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
