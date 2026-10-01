import fs from 'fs';
import path from 'path';

const rawEnvSiteUrl = (
  process.env.VITE_SITE_URL || 'https://niruvi-store.putinservai.workers.dev'
).trim();
const SITE_URL = (
  /^https?:\/\//i.test(rawEnvSiteUrl) ? rawEnvSiteUrl : `https://${rawEnvSiteUrl}`
).replace(/\/+$/, '');

const SYNTHETIC_HASH_PATTERNS = [
  /0123456789abcdef/i,
  /123456789abcdef0/i,
  /23456789abcdef01/i,
  /3456789abcdef012/i,
  /456789abcdef0123/i,
  /56789abcdef01234/i,
  /6789abcdef012345/i,
  /789abcdef0123456/i,
  /89abcdef01234567/i,
  /9abcdef012345678/i,
  /abcdef0123456789/i,
  /bcdef0123456789a/i,
  /cdef0123456789ab/i,
  /def0123456789abc/i,
  /ef0123456789abcd/i,
  /f0123456789abcde/i,
  /7890123456789abc/i,
  /890123456789abcd/i,
  /90123456789abcde/i,
  /a1b2c3d4e5f67890/i,
  /b2c3d4e5f6789012/i,
  /c3d4e5f678901234/i,
  /d4e5f67890123456/i,
  /e5f6789012345678/i,
  /f67890123456789a/i,
  /([a-f0-9])\1{7,}/i,
];

function isGenuineSha256(hash: unknown): boolean {
  if (typeof hash !== 'string') return false;
  const trimmed = hash.trim();
  if (!/^[a-fA-F0-9]{64}$/.test(trimmed)) return false;
  return !SYNTHETIC_HASH_PATTERNS.some((rx) => rx.test(trimmed));
}

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
  downloadsCount?: number;
  rating?: number;
}

function generateCatalog() {
  console.log('📦 Generating static catalog bundle for Niruvi Store...');

  const catalogDir = path.join(process.cwd(), 'catalog');
  const appsDir = path.join(catalogDir, 'apps');
  const categoriesFile = path.join(catalogDir, 'categories.json');

  const categories: string[] = JSON.parse(fs.readFileSync(categoriesFile, 'utf-8'));
  const files = fs.readdirSync(appsDir).filter((f) => f.endsWith('.json'));

  const apps: any[] = [];
  const seenHashes = new Set<string>();

  for (const file of files) {
    const raw: RawAppEntry = JSON.parse(fs.readFileSync(path.join(appsDir, file), 'utf-8'));
    const downloadUrl =
      raw.download?.['x86_64'] || Object.values(raw.download || {})[0] || '';
    const rawSha = (raw.sha256 || '').trim().toLowerCase();

    // Only include entries that have a valid 64-char hex SHA-256 and a real HTTPS download URL
    if (!/^[a-f0-9]{64}$/.test(rawSha) || !downloadUrl.startsWith('https://') || downloadUrl.includes('example.com')) {
      continue;
    }

    const isVerifiedHash = isGenuineSha256(rawSha) && !seenHashes.has(rawSha);
    if (isGenuineSha256(rawSha)) {
      seenHashes.add(rawSha);
    }

    const sourceType =
      raw.sourceType ||
      (raw.developer?.toLowerCase().includes('community') ? 'Community' : 'Official');

    const trustTier = isVerifiedHash
      ? (raw as any).trustTier ||
        (sourceType === 'Official' ? 'Official Developer' : 'Verified Community')
      : 'Unverified Community';

    const app = {
      id: raw.id,
      name: raw.name,
      tagline: raw.tagline || raw.description.slice(0, 120) + '...',
      description: raw.description,
      category: raw.category,
      version: raw.version,
      releaseDate: raw.releaseDate || '2025-01-01',
      size: raw.size || 'Unknown size',
      architectures: raw.architectures || ['x86_64'],
      license: raw.license,
      licenseCategory:
        raw.licenseCategory ||
        (raw.license.includes('MIT') ||
        raw.license.includes('Apache') ||
        raw.license.includes('BSD')
          ? 'Permissive'
          : 'Open Source'),
      publisher: {
        name: raw.developer,
        website: raw.homepage,
        verified: isVerifiedHash,
        github: raw.repository,
      },
      sha256: rawSha,
      downloadUrl,
      downloadMap: raw.download || {},
      iconSlug: raw.iconSlug || raw.id,
      icon: fs.existsSync(path.join(process.cwd(), 'public', 'icons', `${raw.id}.svg`))
        ? `/icons/${raw.id}.svg`
        : fs.existsSync(path.join(process.cwd(), 'public', 'icons', `${raw.id}.png`))
          ? `/icons/${raw.id}.png`
          : raw.icon || null,
      brandColor: raw.brandColor || '#3B82F6',
      features: raw.features || [],
      homepageUrl: raw.homepage || raw.repository || '',
      sourceUrl: raw.repository || raw.homepage || '',
      repositoryUrl: raw.repositoryUrl || raw.repository || '',
      releasesUrl:
        raw.releasesUrl ||
        (raw.repository ? `${raw.repository.replace(/\/$/, '')}/releases` : ''),
      sourceType,
      trustTier,
      officialStatus:
        raw.officialStatus !== undefined
          ? raw.officialStatus && isVerifiedHash
          : sourceType !== 'Community' && isVerifiedHash,
      tags: raw.keywords || [raw.category.toLowerCase()],
      featured: Boolean(raw.featured && isVerifiedHash),
      downloadsCount: typeof raw.downloadsCount === 'number' ? raw.downloadsCount : 0,
      rating: typeof raw.rating === 'number' ? raw.rating : 0,
      changelog: raw.changelog || [`Version ${raw.version} AppImage release build`],
      requirements: raw.requirements || 'Linux 64-bit environment, libfuse2 or libfuse3',
    };

    apps.push(app);
  }

  // Sort verified apps first, then featured, then alphabetical
  apps.sort((a, b) => {
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

  // 1. Write JSON bundle to src/data/generated-catalog.json and public/catalog.json
  const jsonPath = path.join(outDir, 'generated-catalog.json');
  const serializedApps = JSON.stringify(apps, null, 2);
  fs.writeFileSync(jsonPath, serializedApps, 'utf-8');

  const publicDir = path.join(process.cwd(), 'public');
  fs.writeFileSync(path.join(publicDir, 'catalog.json'), serializedApps, 'utf-8');

  // 2. Write src/data/apps.ts (self-contained inside src/ with no relative imports outside src/)
  const tsContent = `import { AppMetadata, Category } from '../types';
import generatedApps from './generated-catalog.json';

export const APPS_CATALOG: AppMetadata[] = generatedApps as unknown as AppMetadata[];

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

  // 3. Write public/robots.txt and public/sitemap.xml (including all app detail pages)
  const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt, 'utf-8');

  const staticRoutes = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/verifier', changefreq: 'weekly', priority: '0.8' },
    { path: '/submit', changefreq: 'weekly', priority: '0.8' },
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
    ...apps.map(
      (app) => `  <url>
    <loc>${SITE_URL}/app/${encodeURIComponent(app.id)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    ),
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf-8');

  // 4. Generate feed.json (gitignored artifact built during CI / catalog generation)
  const feedPayload = {
    version: 1,
    home_page_url: `${SITE_URL}/`,
    feed_url: `${SITE_URL}/feed.json`,
    description: 'AppImage applications for Linux without installation',
    expired: false,
    items: apps.map((app) => ({
      name: app.name,
      description: app.description,
      categories: [app.category],
      authors: [{ name: app.publisher.name, url: app.publisher.website }],
      license: app.license,
      links: [
        ...(app.repositoryUrl ? [{ type: 'GitHub', url: app.repositoryUrl }] : []),
        { type: 'Download', url: app.downloadUrl },
      ],
      icons: app.icon ? [app.icon] : [],
    })),
  };
  fs.writeFileSync(
    path.join(process.cwd(), 'feed.json'),
    JSON.stringify(feedPayload, null, 2),
    'utf-8'
  );

  const verifiedCount = apps.filter((a) => a.publisher.verified).length;
  console.log(
    `✅ Generated catalog with ${apps.length} applications (${verifiedCount} SHA-256 verified), ${categories.length} categories, sitemap.xml (${staticRoutes.length + apps.length} URLs), and feed.json!`
  );
}

generateCatalog();
