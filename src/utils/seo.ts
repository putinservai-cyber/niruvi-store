import { AppMetadata } from '../types';
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  buildCanonicalUrl,
} from '../config/site';

function upsertMeta(selector: string, attrName: 'name' | 'property', attrValue: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(url: string) {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

export function buildSoftwareApplicationJsonLd(app: AppMetadata): Record<string, unknown> {
  const canonicalUrl = buildCanonicalUrl(`/app/${encodeURIComponent(app.id)}`);
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: app.name,
    softwareVersion: app.version,
    description: app.description,
    applicationCategory: app.category,
    operatingSystem: 'Linux',
    fileSize: app.size,
    downloadUrl: app.downloadUrl,
    url: canonicalUrl,
    license: app.license,
    author: {
      '@type': 'Organization',
      name: app.publisher.name,
      ...(app.publisher.website ? { url: app.publisher.website } : {}),
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
  return schema;
}

export function updatePageSeo(options: {
  title?: string;
  description?: string;
  path?: string;
  app?: AppMetadata | null;
}) {
  if (typeof document === 'undefined') return;

  const { app } = options;
  const title = app
    ? `${app.name} v${app.version} — Download Linux AppImage | ${SITE_NAME}`
    : options.title || DEFAULT_TITLE;
  const description = app
    ? `Download ${app.name} v${app.version} (${app.size}, ${app.architectures.join(', ')}) standalone Linux AppImage with SHA-256 checksum verification (${app.sha256.slice(0, 12)}…) on ${SITE_NAME}.`
    : options.description || DEFAULT_DESCRIPTION;
  const canonicalPath = app ? `/app/${encodeURIComponent(app.id)}` : options.path || '/';
  const canonicalUrl = buildCanonicalUrl(canonicalPath);

  document.title = title;
  upsertCanonical(canonicalUrl);

  upsertMeta('meta[name="description"]', 'name', 'description', description);
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  upsertMeta('meta[property="og:image"]', 'property', 'og:image', DEFAULT_OG_IMAGE);
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', DEFAULT_OG_IMAGE);

  const existingScript = document.getElementById('dynamic-software-jsonld');
  if (app) {
    const jsonLd = buildSoftwareApplicationJsonLd(app);
    let scriptEl = existingScript as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'dynamic-software-jsonld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLd);
  } else if (existingScript) {
    existingScript.remove();
  }
}

export { SITE_URL };
