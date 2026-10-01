import { AppMetadata, Category } from '../types';
import generatedApps from './generated-catalog.json';
import rawCategories from '../../catalog/categories.json';
import { validateCatalogAtRuntime, isValidHttpsDownloadUrl } from '../utils/catalogSchema';
import { sanitizeText } from '../utils/sanitize';

export const CATALOG_VALIDATION = validateCatalogAtRuntime(generatedApps);

export const APPS_CATALOG: AppMetadata[] = CATALOG_VALIDATION.validApps;

export const CATEGORIES: Category[] = rawCategories as Category[];

/**
 * Generates the official Niruvi desktop application protocol link.
 * Strictly validates that the underlying download URL uses `https://`.
 * Format: niruvi://install?id=<id>&name=<name>&url=<encoded_url>&sha256=<sha256>&version=<version>&arch=<arch>
 */
export function generateNiruviProtocolUrl(app: AppMetadata, selectedArch?: string): string {
  const rawUrl = app.downloadMap?.[selectedArch || 'x86_64'] || app.downloadUrl;
  const safeUrl = isValidHttpsDownloadUrl(rawUrl) ? rawUrl : '';
  const params = new URLSearchParams({
    id: sanitizeText(app.id, 80),
    name: sanitizeText(app.name, 100),
    version: sanitizeText(app.version, 40),
    url: safeUrl,
    sha256: sanitizeText(app.sha256 || '', 64),
    arch: selectedArch || app.architectures.join(','),
    icon: sanitizeText(app.iconSlug || app.id, 60),
    publisher: sanitizeText(app.publisher?.name || '', 100),
    license: sanitizeText(app.license || 'Open Source', 60),
  });
  return `niruvi://install?${params.toString()}`;
}
