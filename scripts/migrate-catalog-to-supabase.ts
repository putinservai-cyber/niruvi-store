import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface RawApp {
  id: string;
  name: string;
  description: string;
  category: string;
  architecture?: string;
  license?: string;
  sourceUrl?: string;
  downloadUrl: string;
  sha256: string;
  version: string;
  author?: string;
  iconUrl?: string;
  sizeBytes?: number;
  trustTier?: string;
}

function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

async function runCatalogMigration() {
  console.log('🔄 Starting Static Catalog -> Supabase PostgreSQL Migration...');

  const catalogPath = path.join(projectRoot, 'src', 'data', 'generated-catalog.json');
  if (!fs.existsSync(catalogPath)) {
    console.error('❌ Could not find src/data/generated-catalog.json');
    process.exit(1);
  }

  const rawData = fs.readFileSync(catalogPath, 'utf-8');
  const catalog: RawApp[] = JSON.parse(rawData);
  console.log(`📦 Loaded ${catalog.length} packages from static catalog.`);

  const sqlStatements: string[] = [
    '-- ============================================================================',
    '-- Niruvi Store — Catalog Migration: Static JSON to Supabase PostgreSQL',
    '-- Migration: 0005_seed_catalog_data.sql',
    '-- ============================================================================',
    '',
    'BEGIN;',
    '',
  ];

  let appCount = 0;
  let assetCount = 0;

  for (const item of catalog) {
    if (!item.id || !item.name || !item.downloadUrl || !item.sha256) continue;

    const slug = item.id.toLowerCase().replace(/[^a-z0-9._-]/g, '-').slice(0, 60);
    const shortDesc = (item.description || '').slice(0, 240);
    const fullDesc = item.description || '';
    const category = item.category || 'Utilities';
    const license = item.license || 'Open Source';
    const sourceUrl = item.sourceUrl || null;
    const websiteUrl = item.sourceUrl || null;
    const iconUrl = item.iconUrl || null;
    const verified = item.trustTier === 'publisher_verified';
    const version = (item.version || '1.0.0').slice(0, 48);
    const arch = item.architecture === 'aarch64' || item.architecture === 'armhf' ? item.architecture : 'x86_64';
    const sha256 = item.sha256.toLowerCase();
    const downloadUrl = item.downloadUrl;
    const filename = `${item.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.AppImage`;

    // 1. Insert into public.apps
    sqlStatements.push(`
-- App: ${item.name} (${slug})
INSERT INTO public.apps (id, slug, name, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  ${escapeSql(slug)},
  ${escapeSql(item.name)},
  ${escapeSql(shortDesc)},
  ${escapeSql(fullDesc)},
  ${escapeSql(category)},
  ${escapeSql(license)},
  ${escapeSql(websiteUrl)},
  ${escapeSql(sourceUrl)},
  ${escapeSql(iconUrl)},
  'published',
  ${verified ? 'TRUE' : 'FALSE'},
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();
`);

    // 2. Insert into public.app_versions
    sqlStatements.push(`
INSERT INTO public.app_versions (id, app_id, version, release_notes, release_date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.id,
  ${escapeSql(version)},
  'Verified upstream AppImage release.',
  NOW(),
  'published',
  NOW(),
  NOW()
FROM public.apps a
WHERE a.slug = ${escapeSql(slug)}
ON CONFLICT (app_id, version, arch) DO NOTHING;
`);

    // 3. Insert into public.app_assets
    sqlStatements.push(`
INSERT INTO public.app_assets (id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at)
SELECT
  gen_random_uuid(),
  av.id,
  ${escapeSql(arch)},
  ${escapeSql(downloadUrl)},
  ${escapeSql(sha256)},
  ${item.sizeBytes ? item.sizeBytes : 'NULL'},
  ${escapeSql(filename)},
  'appimage',
  NOW()
FROM public.app_versions av
JOIN public.apps a ON a.id = av.app_id
WHERE a.slug = ${escapeSql(slug)} AND av.version = ${escapeSql(version)}
ON CONFLICT (version_id, architecture) DO NOTHING;
`);

    appCount++;
    assetCount++;
  }

  sqlStatements.push('', 'COMMIT;', '');

  const outputPath = path.join(projectRoot, 'supabase', 'migrations', '0005_seed_catalog_data.sql');
  fs.writeFileSync(outputPath, sqlStatements.join('\n'), 'utf-8');

  console.log(`✅ Successfully generated ${outputPath}`);
  console.log(`📊 Migrated ${appCount} apps and ${assetCount} binary release assets into SQL statements.`);
}

runCatalogMigration().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
