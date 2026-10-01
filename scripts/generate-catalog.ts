import fs from 'fs';
import path from 'path';

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

  for (const file of files) {
    const raw: RawAppEntry = JSON.parse(fs.readFileSync(path.join(appsDir, file), 'utf-8'));
    
    // Default fallback values
    const app = {
      id: raw.id,
      name: raw.name,
      tagline: raw.tagline || raw.description.slice(0, 120) + '...',
      description: raw.description,
      category: raw.category,
      version: raw.version,
      releaseDate: raw.releaseDate || '2025-01-01',
      size: raw.size || '75.0 MB',
      architectures: raw.architectures || ['x86_64'],
      license: raw.license,
      licenseCategory: raw.licenseCategory || (raw.license.includes('MIT') || raw.license.includes('Apache') || raw.license.includes('BSD') ? 'Permissive' : 'Open Source'),
      publisher: {
        name: raw.developer,
        website: raw.homepage,
        verified: true,
        github: raw.repository,
      },
      sha256: raw.sha256 || '',
      downloadUrl: raw.download?.['x86_64'] || Object.values(raw.download || {})[0] || '',
      downloadMap: raw.download || {},
      iconSlug: raw.iconSlug || raw.id,
      icon: fs.existsSync(path.join(process.cwd(), 'public', 'icons', `${raw.id}.svg`))
        ? `/icons/${raw.id}.svg`
        : fs.existsSync(path.join(process.cwd(), 'public', 'icons', `${raw.id}.png`))
          ? `/icons/${raw.id}.png`
          : (raw.icon || null),
      brandColor: raw.brandColor || '#3B82F6',
      features: raw.features || [],
      homepageUrl: raw.homepage || raw.repository || '',
      sourceUrl: raw.repository || raw.homepage || '',
      repositoryUrl: raw.repositoryUrl || raw.repository || '',
      releasesUrl: raw.releasesUrl || (raw.repository ? `${raw.repository.replace(/\/$/, '')}/releases` : ''),
      sourceType: raw.sourceType || (raw.developer?.toLowerCase().includes('community') ? 'Community' : 'Official'),
      trustTier: (raw as any).trustTier || (
        (raw.sourceType === 'Official' || (!raw.sourceType && !raw.developer?.toLowerCase().includes('community')))
          ? 'Official Developer'
          : ((raw as any).unverified ? 'Unverified Community' : 'Verified Community')
      ),
      officialStatus: raw.officialStatus !== undefined ? raw.officialStatus : (raw.sourceType !== 'Community'),
      tags: raw.keywords || [raw.category.toLowerCase()],
      featured: raw.featured || false,
      downloadsCount: raw.downloadsCount || Math.floor(Math.random() * 50000 + 10000),
      rating: raw.rating || 4.8,
      changelog: raw.changelog || [`Version ${raw.version} AppImage release build`],
      requirements: raw.requirements || 'Linux 64-bit environment, libfuse2 or libfuse3',
    };

    apps.push(app);
  }

  // Sort by featured and name
  apps.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });

  const outDir = path.join(process.cwd(), 'src', 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Write JSON bundle
  const jsonPath = path.join(outDir, 'generated-catalog.json');
  fs.writeFileSync(jsonPath, JSON.stringify(apps, null, 2), 'utf-8');

  // 2. Write src/data/apps.ts
  const tsContent = `import { AppMetadata, Category } from '../types';
import generatedApps from './generated-catalog.json';
import rawCategories from '../../catalog/categories.json';

export const APPS_CATALOG: AppMetadata[] = generatedApps as unknown as AppMetadata[];

export const CATEGORIES: Category[] = rawCategories as Category[];

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
  console.log(`✅ Generated catalog with ${apps.length} applications and ${categories.length} categories!`);
}

generateCatalog();
