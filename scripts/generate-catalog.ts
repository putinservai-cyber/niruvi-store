import fs from 'fs';
import path from 'path';
import {
  APPIMAGEHUB_FEED_URL,
  RawAppImageHubItem,
  normalizeAllAppImageHubItems,
  buildAppMetadataFromNormalized,
  mapToSimplifiedCategory,
} from '../src/utils/appimagehub';
import { isGenuineSha256 } from '../src/utils/catalogSchema';

const rawBase = (
  process.env.VITE_BASE ||
  process.env.VITE_BASE_PATH ||
  '/niruvi-store/'
).trim();
const normalizedBaseLeading = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
const BASE_PATH = normalizedBaseLeading.endsWith('/')
  ? normalizedBaseLeading
  : `${normalizedBaseLeading}/`;
const baseNoTrailing = BASE_PATH.replace(/\/+$/, '');

const rawEnvSiteUrl = (
  process.env.VITE_SITE_URL || 'https://putinservai-cyber.github.io'
).trim();
const httpsSiteOrigin = rawEnvSiteUrl
  .replace(/^http:\/\//i, 'https://')
  .replace(/^(?!https:\/\/)/i, 'https://')
  .replace(/\/+$/, '');
const strippedSiteOrigin =
  baseNoTrailing && httpsSiteOrigin.endsWith(baseNoTrailing)
    ? httpsSiteOrigin.slice(0, -baseNoTrailing.length)
    : httpsSiteOrigin;
const SITE_ORIGIN =
  BASE_PATH !== '/' && !strippedSiteOrigin.includes('github.io')
    ? 'https://putinservai-cyber.github.io'
    : strippedSiteOrigin;
const SITE_URL = `${SITE_ORIGIN}${baseNoTrailing}`;

interface RawAppEntry {
  id: string;
  name: string;
  tagline?: string;
  description: string;
  version: string;
  releaseDate?: string;
  category: string;
  developer: string;
  license: string;
  licenseCategory?: 'Open Source' | 'Permissive' | 'Proprietary';
  homepage?: string;
  repository?: string;
  repositoryUrl?: string;
  releasesUrl?: string;
  sourceType?: 'Official' | 'Community';
  officialStatus?: boolean;
  icon?: string;
  iconSlug?: string;
  brandColor?: string;
  size?: string;
  architectures: ('x86_64' | 'aarch64' | 'armhf')[];
  formats: string[];
  download: Record<string, string>;
  sha256?: string;
  keywords?: string[];
  featured?: boolean;
  features?: string[];
  requirements?: string;
  changelog?: string[];
}

async function fetchAppImageHubFeedItems(catalogDir: string): Promise<RawAppImageHubItem[]> {
  const cachePath = path.join(catalogDir, 'appimagehub-feed.json');
  try {
    const res = await fetch(APPIMAGEHUB_FEED_URL, {
      headers: { 'User-Agent': 'NiruviStore-CatalogBuilder/1.0' },
    });
    if (res.ok) {
      const data = (await res.json()) as { version?: number; items?: RawAppImageHubItem[] };
      if (Array.isArray(data.items) && data.items.length > 0) {
        fs.writeFileSync(cachePath, JSON.stringify(data), 'utf-8');
        return data.items;
      }
    }
  } catch {
    // Fall back to cached feed file if offline
  }

  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as {
      items?: RawAppImageHubItem[];
    };
    if (Array.isArray(cached.items)) {
      return cached.items;
    }
  }

  return [];
}

async function generateCatalog() {
  console.log('📦 Generating Niruvi Store catalog from AppImageHub + verified releases...');

  const catalogDir = path.join(process.cwd(), 'catalog');
  const appsDir = path.join(catalogDir, 'apps');
  const categoriesFile = path.join(catalogDir, 'categories.json');

  const categories: string[] = JSON.parse(fs.readFileSync(categoriesFile, 'utf-8'));

  // 1. Load verified overrides from catalog/apps/*.json (only genuine SHA-256 + real HTTPS URLs)
  const verifiedOverrides = new Map<string, any>();
  const verifiedOverridesByRepo = new Map<string, any>();
  const seenHashes = new Set<string>();

  if (fs.existsSync(appsDir)) {
    const files = fs
      .readdirSync(appsDir)
      .filter((f) => f.endsWith('.json'))
      .sort();

    for (const file of files) {
      const raw: RawAppEntry = JSON.parse(fs.readFileSync(path.join(appsDir, file), 'utf-8'));
      const downloadUrl =
        raw.download?.['x86_64'] || Object.values(raw.download || {})[0] || '';
      const rawSha = (raw.sha256 || '').trim().toLowerCase();

      if (!downloadUrl.startsWith('https://') || downloadUrl.includes('example.com')) {
        continue;
      }

      const isVerifiedHash = isGenuineSha256(rawSha) && !seenHashes.has(rawSha);
      if (isVerifiedHash) {
        seenHashes.add(rawSha);
      }

      const sourceType =
        raw.sourceType ||
        (raw.developer?.toLowerCase().includes('community') ? 'Community' : 'Official');

      const trustTier = isVerifiedHash
        ? (raw as any).trustTier ||
          (sourceType === 'Official' ? 'Official Developer' : 'Verified Community')
        : 'Unverified Community';

      const simplifiedCategory = mapToSimplifiedCategory(raw.category);
      const repoUrl = raw.repositoryUrl || raw.repository || '';
      const githubRepoMatch = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/i);

      const overrideEntry = {
        id: raw.id,
        name: raw.name,
        tagline: raw.tagline || (raw.description ? raw.description.slice(0, 120) : ''),
        description: raw.description || '',
        category: simplifiedCategory,
        simplifiedCategory,
        version: raw.version,
        releaseDate: raw.releaseDate || '',
        size: raw.size || '',
        architectures: raw.architectures || ['x86_64'],
        formats: ['AppImage'],
        license: raw.license || '',
        licenseCategory:
          raw.licenseCategory ||
          (/mit|apache|bsd|isc/i.test(raw.license || '') ? 'Permissive' : 'Open Source'),
        publisher: {
          name: raw.developer,
          website: raw.homepage || undefined,
          verified: isVerifiedHash,
          github: repoUrl || undefined,
        },
        sha256: isVerifiedHash ? rawSha : '',
        downloadUrl,
        downloadMap: raw.download || { x86_64: downloadUrl },
        iconSlug: raw.iconSlug || raw.id,
        icon: fs.existsSync(path.join(process.cwd(), 'public', 'icons', `${raw.id}.svg`))
          ? `/icons/${raw.id}.svg`
          : fs.existsSync(path.join(process.cwd(), 'public', 'icons', `${raw.id}.png`))
            ? `/icons/${raw.id}.png`
            : raw.icon || undefined,
        brandColor: raw.brandColor || undefined,
        features: raw.features && raw.features.length > 0 ? raw.features : undefined,
        homepageUrl: raw.homepage || repoUrl || '',
        sourceUrl: repoUrl || raw.homepage || '',
        repositoryUrl: repoUrl || undefined,
        releasesUrl:
          raw.releasesUrl || (repoUrl ? `${repoUrl.replace(/\/$/, '')}/releases` : downloadUrl),
        githubRepo: githubRepoMatch ? githubRepoMatch[1].replace(/\.git$/i, '') : undefined,
        sourceType,
        trustTier,
        officialStatus: isVerifiedHash,
        tags: raw.keywords || [simplifiedCategory.toLowerCase()],
        featured: Boolean(raw.featured && isVerifiedHash),
        downloadsCount: 0,
        rating: 0,
        changelog: raw.changelog && raw.changelog.length > 0 ? raw.changelog : undefined,
        requirements: raw.requirements || undefined,
      };
      verifiedOverrides.set(raw.id.toLowerCase(), overrideEntry);
      if (overrideEntry.githubRepo) {
        verifiedOverridesByRepo.set(overrideEntry.githubRepo.toLowerCase(), overrideEntry);
      }
    }
  }

  // 2. Fetch and normalize EVERY entry from https://appimage.github.io/feed.json
  const rawFeedItems = await fetchAppImageHubFeedItems(catalogDir);
  const normalizedFeedItems = normalizeAllAppImageHubItems(rawFeedItems);

  console.log(`📡 AppImageHub feed.json raw count:        ${rawFeedItems.length}`);
  console.log(`✅ AppImageHub normalized imported count:  ${normalizedFeedItems.length}`);

  const catalogMap = new Map<string, any>();
  const matchedOverrideIds = new Set<string>();

  for (const norm of normalizedFeedItems) {
    const baseMeta = buildAppMetadataFromNormalized(norm, null);
    const byId = verifiedOverrides.get(norm.id.toLowerCase());
    const byRepo =
      !byId && norm.github_repo
        ? verifiedOverridesByRepo.get(norm.github_repo.toLowerCase())
        : undefined;
    const override = byId || byRepo;
    if (override && !matchedOverrideIds.has(override.id.toLowerCase())) {
      matchedOverrideIds.add(override.id.toLowerCase());
      catalogMap.set(override.id, {
        ...baseMeta,
        ...override,
        id: override.id,
        icon: override.icon || baseMeta.icon,
        screenshots:
          override.screenshots && override.screenshots.length > 0
            ? override.screenshots
            : baseMeta.screenshots,
      });
    } else {
      catalogMap.set(norm.id, baseMeta);
    }
  }

  const allApps = Array.from(catalogMap.values());

  // Sort verified apps first, then apps with icons/descriptions, then alphabetical
  allApps.sort((a, b) => {
    if (a.publisher.verified && !b.publisher.verified) return -1;
    if (!a.publisher.verified && b.publisher.verified) return 1;
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });

  const outDir = path.join(process.cwd(), 'src', 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Write full catalog (all 2,569+ apps) to public/catalog.json for Worker & API pagination
  const fullCatalogPath = path.join(publicDir, 'catalog.json');
  fs.writeFileSync(fullCatalogPath, JSON.stringify(allApps), 'utf-8');

  // 2. Write lightweight Page 1 seed (first 48 apps) to src/data/generated-catalog.json
  //    so the browser JS bundle never loads all 2,500+ apps into memory at once.
  const page1SeedApps = allApps.slice(0, 48);
  const seedJsonPath = path.join(outDir, 'generated-catalog.json');
  fs.writeFileSync(seedJsonPath, JSON.stringify(page1SeedApps, null, 2), 'utf-8');

  // 3. Write src/data/apps.ts (self-contained inside src/ with total count metadata)
  const tsContent = `import { AppMetadata, Category } from '../types';
import generatedApps from './generated-catalog.json';

export const APPS_CATALOG: AppMetadata[] = generatedApps as unknown as AppMetadata[];
export const TOTAL_CATALOG_COUNT = ${allApps.length};
export const APPIMAGEHUB_FEED_COUNT = ${rawFeedItems.length};

export const CATEGORIES: Category[] = ${JSON.stringify(categories)} as Category[];

/**
 * Generates the official Niruvi desktop application protocol link
 * Format: niruvi://install?id=<id>&name=<name>&url=<encoded_url>&sha256=<sha256>&version=<version>&arch=<arch>
 */
export function generateNiruviProtocolUrl(app: AppMetadata, selectedArch?: string): string {
  const downloadUrl = (app as any).downloadMap?.[selectedArch || 'x86_64'] || app.downloadUrl;
  const params = new URLSearchParams({
    id: app.id,
    name: app.name,
    version: app.version,
    url: downloadUrl,
    sha256: app.sha256 || '',
    arch: selectedArch || app.architectures.join(','),
    icon: app.iconSlug || app.id,
    publisher: app.publisher?.name || '',
    license: app.license || 'Open Source'
  });
  return \`niruvi://install?\${params.toString()}\`;
}
`;

  fs.writeFileSync(path.join(outDir, 'apps.ts'), tsContent, 'utf-8');

  // 4. Write public/robots.txt and public/sitemap.xml
  const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt, 'utf-8');

  const staticRoutes = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/verifier', changefreq: 'weekly', priority: '0.8' },
    { path: '/submit', changefreq: 'weekly', priority: '0.8' },
    { path: '/donate', changefreq: 'weekly', priority: '0.8' },
    { path: '/library', changefreq: 'weekly', priority: '0.7' },
    { path: '/privacy', changefreq: 'monthly', priority: '0.5' },
    { path: '/terms', changefreq: 'monthly', priority: '0.5' },
    { path: '/cookies', changefreq: 'monthly', priority: '0.5' },
    { path: '/refunds', changefreq: 'monthly', priority: '0.5' },
  ];

  const urlEntries = [
    ...staticRoutes.map(
      (r) => `  <url>
    <loc>${SITE_URL}${r.path === '/' ? '/' : r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
    ),
    ...allApps.map(
      (app) => `  <url>
    <loc>${SITE_URL}/app/${encodeURIComponent(app.id)}</loc>
    ${app.releaseDate ? `<lastmod>${app.releaseDate}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    ),
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf-8');

  console.log(
    `✅ Generated public/catalog.json with ${allApps.length} total apps (${rawFeedItems.length}/${rawFeedItems.length} from AppImageHub feed) and 48-app initial page seed!`
  );
}

generateCatalog().catch((err) => {
  console.error('❌ Failed to generate catalog:', err);
  process.exit(1);
});
