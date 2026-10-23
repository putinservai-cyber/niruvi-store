import { AppMetadata, Category } from '../types';
import generatedApps from './generated-catalog.json';
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';
import { isGenuineSha256 } from '../utils/catalogSchema';

export const APPS_CATALOG: AppMetadata[] = generatedApps as unknown as AppMetadata[];
export const TOTAL_CATALOG_COUNT = 2911;
export const APPIMAGEHUB_FEED_COUNT = 2906;
export const VERIFIED_DIRECT_CATALOG_COUNT = 15;
export const HIDDEN_UNVERIFIED_CATALOG_COUNT = 2896;
export const CATALOG_CLEANUP_REPORT = {
  "generatedAt": "2026-10-03",
  "totalCatalogEntries": 2911,
  "appImageHubFeedEntries": 2906,
  "curatedAppJsonFiles": 15,
  "mainListingEligibleCount": 15,
  "hiddenFromMainListingCount": 2896,
  "affectedCounts": {
    "lackingDirectAppImageUrl": 2895,
    "lackingVerifiedSha256": 2896,
    "lackingBothDirectUrlAndSha256": 2895,
    "unknownVersion": 2896,
    "emptyDescription": 319,
    "emptyLicense": 1076,
    "emptySize": 2896,
    "policyFlaggedCount": 1
  },
  "policyFlaggedEntries": [
    {
      "id": "account-scraper",
      "name": "account-scraper",
      "description": "Find spotify premium and netflix accounts for free!",
      "moderationReason": "Prohibited credential/account generator or unauthorized account-scraping tool"
    }
  ],
  "curatedEntriesHiddenFromMainListing": []
} as const;

export const CATEGORIES: Category[] = ["All","AI","Browser","Development","Graphics & Design","Audio & Video","Productivity","Communication","Games","System & Security","Utilities","Internet & Network","Education"] as Category[];

/**
 * Generates the official Niruvi desktop application protocol link
 * Format: niruvi://install?id=<id>&name=<name>&url=<encoded_url>&sha256=<sha256>&version=<version>&arch=<arch>
 *
 * Security Guarantees:
 * 1. Strictly enforces `https://` on binary download URLs (rejecting javascript:, file:, data:, or relative URLs)
 * 2. Enforces verified 64-char hex SHA-256 validation (excluding synthetic placeholder patterns)
 * 3. Sanitizes all metadata parameters and encodes safely via standard URLSearchParams
 */
export function generateNiruviProtocolUrl(app: AppMetadata, selectedArch?: string): string {
  const rawDownloadUrl = (app as any).downloadMap?.[selectedArch || 'x86_64'] || app.downloadUrl || '';
  const cleanDownloadUrl = sanitizeUrl(rawDownloadUrl);
  const isHttps = cleanDownloadUrl.startsWith('https://');
  const safeSha = isGenuineSha256(app.sha256) ? app.sha256 : '';

  const params = new URLSearchParams();
  params.set('id', sanitizeText(app.id, 64));
  params.set('name', sanitizeText(app.name, 100));
  params.set('version', sanitizeText(app.version, 48));
  if (isHttps) {
    params.set('url', cleanDownloadUrl);
  }
  if (safeSha) {
    params.set('sha256', safeSha);
  }
  params.set('arch', sanitizeText(selectedArch || (app.architectures || ['x86_64']).join(','), 32));
  params.set('icon', sanitizeText(app.iconSlug || app.id, 64));
  params.set('publisher', sanitizeText(app.publisher?.name || '', 100));
  params.set('license', sanitizeText(app.license || 'Open Source', 80));

  return `niruvi://install?${params.toString()}`;
}
