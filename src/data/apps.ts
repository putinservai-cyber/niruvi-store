import { AppMetadata, Category } from '../types';
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
  return `niruvi://install?${params.toString()}`;
}
