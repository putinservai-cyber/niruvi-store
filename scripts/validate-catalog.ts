import fs from 'fs';
import path from 'path';

interface CatalogApp {
  id: string;
  name: string;
  tagline?: string;
  description: string;
  version: string;
  releaseDate?: string;
  category: string;
  developer: string;
  license: string;
  licenseCategory?: string;
  homepage?: string;
  repository?: string;
  repositoryUrl?: string;
  releasesUrl?: string;
  sourceType?: string;
  officialStatus?: boolean;
  icon?: string;
  iconSlug?: string;
  brandColor?: string;
  size?: string;
  architectures: string[];
  formats: string[];
  download: Record<string, string>;
  sha256?: string;
  keywords?: string[];
  featured?: boolean;
  features?: string[];
  requirements?: string;
}

const REQUIRED_FIELDS: (keyof CatalogApp)[] = [
  'id',
  'name',
  'description',
  'version',
  'category',
  'developer',
  'license',
  'architectures',
  'formats',
  'download',
];

const VALID_ARCHITECTURES = ['x86_64', 'aarch64', 'armhf'];
const SHA256_REGEX = /^[a-fA-F0-9]{64}$/;
const URL_REGEX = /^https?:\/\/.+/i;

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function runValidation(): boolean {
  console.log('🔍 Niruvi Store Catalog Validator');
  console.log('==================================');

  const catalogDir = path.join(process.cwd(), 'catalog');
  const appsDir = path.join(catalogDir, 'apps');
  const categoriesFile = path.join(catalogDir, 'categories.json');

  let hasErrors = false;
  let totalApps = 0;

  if (!fs.existsSync(categoriesFile)) {
    console.error(`\n❌ ERROR: Categories file not found at ${categoriesFile}`);
    return false;
  }

  let categories: string[] = [];
  try {
    categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf-8'));
    if (!Array.isArray(categories)) {
      console.error(`\n❌ ERROR: ${categoriesFile} must be an array of category strings.`);
      return false;
    }
  } catch (err: any) {
    console.error(`\n❌ ERROR: Failed to parse ${categoriesFile}:`, err.message);
    return false;
  }

  if (!fs.existsSync(appsDir)) {
    console.error(`\n❌ ERROR: Apps directory not found at ${appsDir}`);
    return false;
  }

  const files = fs.readdirSync(appsDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.error('\n❌ ERROR: No application JSON files found in catalog/apps/');
    return false;
  }

  const seenIds = new Set<string>();

  for (const file of files) {
    const filePath = path.join(appsDir, file);
    const relativePath = path.relative(process.cwd(), filePath);
    totalApps++;

    let app: any;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      app = JSON.parse(content);
    } catch (err: any) {
      console.error(`\n❌ ERROR: ${relativePath}\nInvalid JSON syntax: ${err.message}`);
      hasErrors = true;
      continue;
    }

    const fileErrors: string[] = [];

    // 1. Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (app[field] === undefined || app[field] === null || app[field] === '') {
        fileErrors.push(`Missing required field: ${field}`);
      }
    }

    // 2. Check ID uniqueness & filename match
    if (app.id) {
      if (seenIds.has(app.id)) {
        fileErrors.push(`Duplicate application ID detected: "${app.id}"`);
      } else {
        seenIds.add(app.id);
      }

      const expectedFilename = `${app.id}.json`;
      if (file !== expectedFilename) {
        fileErrors.push(`Filename mismatch: file is named "${file}" but ID is "${app.id}" (expected "${expectedFilename}")`);
      }
    }

    // 3. Check Category validity
    if (app.category && !categories.includes(app.category)) {
      fileErrors.push(
        `Invalid category: "${app.category}". Allowed categories: ${categories.filter((c) => c !== 'All').join(', ')}`
      );
    }

    // 4. Check Architectures
    if (Array.isArray(app.architectures)) {
      if (app.architectures.length === 0) {
        fileErrors.push('Architectures list cannot be empty.');
      }
      for (const arch of app.architectures) {
        if (!VALID_ARCHITECTURES.includes(arch)) {
          fileErrors.push(`Unsupported architecture: "${arch}". Allowed architectures: ${VALID_ARCHITECTURES.join(', ')}`);
        }
      }
    } else if (app.architectures) {
      fileErrors.push('Architectures field must be an array of strings.');
    }

    // 5. Check Formats
    if (Array.isArray(app.formats)) {
      if (!app.formats.includes('AppImage')) {
        fileErrors.push('Formats must include "AppImage" for Niruvi Store distribution.');
      }
    } else if (app.formats) {
      fileErrors.push('Formats field must be an array of strings containing "AppImage".');
    }

    // 6. Check Download URLs
    if (app.download && typeof app.download === 'object') {
      if (Array.isArray(app.architectures)) {
        for (const arch of app.architectures) {
          const downloadUrl = app.download[arch];
          if (!downloadUrl) {
            fileErrors.push(`Missing download URL for declared architecture: "${arch}"`);
          } else if (!isValidUrl(downloadUrl)) {
            fileErrors.push(`Invalid download URL for ${arch}: "${downloadUrl}"`);
          }
        }
      }
    } else {
      fileErrors.push('Download field must be an object mapping architecture to download URL.');
    }

    // 7. Check Homepage & Repository URLs
    if (app.homepage && !isValidUrl(app.homepage)) {
      fileErrors.push(`Invalid homepage URL: "${app.homepage}"`);
    }
    if (app.repository && !isValidUrl(app.repository)) {
      fileErrors.push(`Invalid repository URL: "${app.repository}"`);
    }

    // 8. Check SHA-256 Checksum
    if (app.sha256) {
      if (!SHA256_REGEX.test(app.sha256)) {
        fileErrors.push(
          `Malformed SHA-256 value: "${app.sha256}". Must be a valid 64-character hexadecimal checksum.`
        );
      }
    }

    // Report file errors if any
    if (fileErrors.length > 0) {
      hasErrors = true;
      console.error(`\n❌ ERROR: ${relativePath}`);
      for (const err of fileErrors) {
        console.error(`   - ${err}`);
      }
    }
  }

  console.log('\n----------------------------------');
  if (hasErrors) {
    console.error(`❌ Catalog validation FAILED with errors. Fix the issues above before committing.`);
    return false;
  } else {
    console.log(`✅ All ${totalApps} application catalog entries passed validation successfully!`);
    return true;
  }
}

const success = runValidation();
if (!success) {
  process.exit(1);
}
