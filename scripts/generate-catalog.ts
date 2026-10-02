import fs from 'fs';
import path from 'path';
import {
  APPIMAGEHUB_FEED_URL,
  RawAppImageHubItem,
  normalizeAllAppImageHubItems,
  buildAppMetadataFromNormalized,
  mapToSimplifiedCategory,
} from '../src/utils/appimagehub';
import {
  isGenuineSha256,
  isDirectAppImageUrl,
  isPolicyFlaggedEntry,
  hasKnownVersion,
} from '../src/utils/catalogSchema';

const rawEnvSiteUrl = (
  process.env.VITE_SITE_URL || 'https://niruvi-store.runs-on.dev'
).trim();
const httpsSiteOrigin = rawEnvSiteUrl
  .replace(/^http:\/\//i, 'https://')
  .replace(/^(?!https:\/\/)/i, 'https://')
  .replace(/\/+$/, '');
const isCustomDomain = !httpsSiteOrigin.includes('github.io');

const rawBase = isCustomDomain
  ? '/'
  : (
      process.env.VITE_BASE ||
      process.env.VITE_BASE_PATH ||
      '/niruvi-store/'
    ).trim();
const normalizedBaseLeading = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
const BASE_PATH = normalizedBaseLeading.endsWith('/')
  ? normalizedBaseLeading
  : `${normalizedBaseLeading}/`;
const baseNoTrailing = BASE_PATH.replace(/\/+$/, '');

const SITE_ORIGIN =
  baseNoTrailing && httpsSiteOrigin.endsWith(baseNoTrailing)
    ? httpsSiteOrigin.slice(0, -baseNoTrailing.length)
    : httpsSiteOrigin;
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
  source?: 'community' | 'official';
  sourceType?: 'Official' | 'Community';
  checksumStatus?: 'verified' | 'provided' | 'unverified';
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

      const isGenuineHash = isGenuineSha256(rawSha) && !seenHashes.has(rawSha);
      if (isGenuineHash) {
        seenHashes.add(rawSha);
      }

      const isCommunity = raw.source === 'community';

      const source: 'community' | 'official' = isCommunity ? 'community' : 'official';
      const sourceType: 'Official' | 'Community' =
        raw.sourceType || (isCommunity ? 'Community' : 'Official');

      const checksumStatus: 'verified' | 'provided' | 'unverified' =
        raw.checksumStatus === 'provided' && isGenuineHash
          ? 'provided'
          : raw.checksumStatus === 'unverified'
            ? 'unverified'
            : isCommunity
              ? isGenuineHash
                ? 'provided'
                : 'unverified'
              : isGenuineHash
                ? 'verified'
                : 'unverified';

      const isVerifiedHash = checksumStatus === 'verified' && isGenuineHash;

      const trustTier = isVerifiedHash
        ? (raw as any).trustTier ||
          (sourceType === 'Official' ? 'Official Developer' : 'Verified Community')
        : 'Unverified Community';

      const simplifiedCategory = mapToSimplifiedCategory(raw.category);
      const repoUrl = raw.repositoryUrl || raw.repository || '';
      const githubRepoMatch = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/i);
      const hasDirectUrl = isDirectAppImageUrl(downloadUrl);
      const policyCheck = isPolicyFlaggedEntry({
        id: raw.id,
        name: raw.name,
        tagline: raw.tagline,
        description: raw.description,
      });
      const moderationFlag: 'clean' | 'flagged_policy' | 'unverified_upstream' = policyCheck.flagged
        ? 'flagged_policy'
        : hasDirectUrl && isGenuineHash
          ? 'clean'
          : 'unverified_upstream';
      const hiddenFromMainListing = !hasDirectUrl || !isGenuineHash || policyCheck.flagged;
      const cleanVersion =
        raw.version && !/^(v?latest|unknown)$/i.test(raw.version.trim())
          ? raw.version.trim().replace(/^v/i, '')
          : 'Version unknown';

      const overrideEntry = {
        id: raw.id,
        name: raw.name,
        tagline: raw.tagline || (raw.description ? raw.description.slice(0, 120) : ''),
        description: raw.description || '',
        category: simplifiedCategory,
        simplifiedCategory,
        version: cleanVersion,
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
        sha256: isGenuineHash ? rawSha : '',
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
        source,
        sourceType,
        checksumStatus,
        trustTier,
        officialStatus: isVerifiedHash,
        hasDirectAppImageUrl: hasDirectUrl,
        hasVerifiedSha256: isGenuineHash,
        hiddenFromMainListing,
        moderationFlag,
        moderationReason: policyCheck.reason,
        tags: raw.keywords || [simplifiedCategory.toLowerCase()],
        featured: Boolean(raw.featured && isVerifiedHash && hasDirectUrl),
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

  for (const [, override] of verifiedOverrides) {
    if (!matchedOverrideIds.has(override.id.toLowerCase())) {
      matchedOverrideIds.add(override.id.toLowerCase());
      catalogMap.set(override.id, override);
    }
  }

  const allApps = Array.from(catalogMap.values());

  // Sort main-listing eligible apps first, then verified, then approved community submissions, then featured, then alphabetical
  allApps.sort((a, b) => {
    const aEligible = !a.hiddenFromMainListing;
    const bEligible = !b.hiddenFromMainListing;
    if (aEligible && !bEligible) return -1;
    if (!aEligible && bEligible) return 1;
    if (a.publisher.verified && !b.publisher.verified) return -1;
    if (!a.publisher.verified && b.publisher.verified) return 1;
    const aCuratedCommunity = a.source === 'community';
    const bCuratedCommunity = b.source === 'community';
    if (aCuratedCommunity && !bCuratedCommunity) return -1;
    if (!aCuratedCommunity && bCuratedCommunity) return 1;
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });

  // Build Phase 1 Catalog Cleanup Report (without deleting any data)
  const mainListingApps = allApps.filter((a) => !a.hiddenFromMainListing);
  const hiddenApps = allApps.filter((a) => Boolean(a.hiddenFromMainListing));
  const missingDirectUrlApps = allApps.filter((a) => !a.hasDirectAppImageUrl);
  const missingSha256Apps = allApps.filter((a) => !a.hasVerifiedSha256);
  const unknownVersionApps = allApps.filter((a) => !hasKnownVersion(a.version));
  const missingDescriptionApps = allApps.filter((a) => !a.description || !a.description.trim());
  const missingLicenseApps = allApps.filter((a) => !a.license || !a.license.trim());
  const missingSizeApps = allApps.filter((a) => !a.size || !a.size.trim());
  const policyFlaggedApps = allApps.filter((a) => a.moderationFlag === 'flagged_policy');

  const curatedMissingDirectOrSha = Array.from(verifiedOverrides.values())
    .filter((a) => a.hiddenFromMainListing)
    .map((a) => ({
      id: a.id,
      name: a.name,
      downloadUrl: a.downloadUrl,
      hasDirectAppImageUrl: Boolean(a.hasDirectAppImageUrl),
      hasVerifiedSha256: Boolean(a.hasVerifiedSha256),
      reason: !a.hasDirectAppImageUrl
        ? 'Download URL points to a releases page, mirrorlist, or archive instead of a direct .AppImage asset'
        : 'Missing verified 64-character SHA-256 digest',
    }));

  const cleanupReport = {
    generatedAt: new Date().toISOString().slice(0, 10),
    totalCatalogEntries: allApps.length,
    appImageHubFeedEntries: rawFeedItems.length,
    curatedAppJsonFiles: verifiedOverrides.size,
    mainListingEligibleCount: mainListingApps.length,
    hiddenFromMainListingCount: hiddenApps.length,
    affectedCounts: {
      lackingDirectAppImageUrl: missingDirectUrlApps.length,
      lackingVerifiedSha256: missingSha256Apps.length,
      lackingBothDirectUrlAndSha256: allApps.filter(
        (a) => !a.hasDirectAppImageUrl && !a.hasVerifiedSha256
      ).length,
      unknownVersion: unknownVersionApps.length,
      emptyDescription: missingDescriptionApps.length,
      emptyLicense: missingLicenseApps.length,
      emptySize: missingSizeApps.length,
      policyFlaggedCount: policyFlaggedApps.length,
    },
    policyFlaggedEntries: policyFlaggedApps.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      moderationReason: a.moderationReason || 'Policy violation',
    })),
    curatedEntriesHiddenFromMainListing: curatedMissingDirectOrSha,
  };

  fs.writeFileSync(
    path.join(catalogDir, 'cleanup-report.json'),
    JSON.stringify(cleanupReport, null, 2),
    'utf-8'
  );

  const outDir = path.join(process.cwd(), 'src', 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Write full catalog (all 2,790 apps, none deleted, with hiddenFromMainListing flags) to public/catalog.json
  const fullCatalogPath = path.join(publicDir, 'catalog.json');
  fs.writeFileSync(fullCatalogPath, JSON.stringify(allApps), 'utf-8');

  // 2. Write first-page seed catalog (starting with all 15 main-listing eligible apps + first unverified page items) to src/data/generated-catalog.json
  const seedJsonPath = path.join(outDir, 'generated-catalog.json');
  const firstPageSeedApps = allApps.filter((a) => a.moderationFlag !== 'flagged_policy').slice(0, 48);
  fs.writeFileSync(seedJsonPath, JSON.stringify(firstPageSeedApps, null, 2), 'utf-8');

  // 3. Write src/data/apps.ts (self-contained inside src/ with total & cleanup report metadata)
  const tsContent = `import { AppMetadata, Category } from '../types';
import generatedApps from './generated-catalog.json';

export const APPS_CATALOG: AppMetadata[] = generatedApps as unknown as AppMetadata[];
export const TOTAL_CATALOG_COUNT = ${allApps.length};
export const APPIMAGEHUB_FEED_COUNT = ${rawFeedItems.length};
export const VERIFIED_DIRECT_CATALOG_COUNT = ${mainListingApps.length};
export const HIDDEN_UNVERIFIED_CATALOG_COUNT = ${hiddenApps.length};
export const CATALOG_CLEANUP_REPORT = ${JSON.stringify(cleanupReport, null, 2)} as const;

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
