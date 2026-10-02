import { AppMetadata, Category } from '../types';
import generatedApps from './generated-catalog.json';

export const APPS_CATALOG: AppMetadata[] = generatedApps as unknown as AppMetadata[];
export const TOTAL_CATALOG_COUNT = 2790;
export const APPIMAGEHUB_FEED_COUNT = 2785;
export const VERIFIED_DIRECT_CATALOG_COUNT = 15;
export const HIDDEN_UNVERIFIED_CATALOG_COUNT = 2775;
export const CATALOG_CLEANUP_REPORT = {
  "generatedAt": "2026-10-02",
  "totalCatalogEntries": 2790,
  "appImageHubFeedEntries": 2785,
  "curatedAppJsonFiles": 15,
  "mainListingEligibleCount": 15,
  "hiddenFromMainListingCount": 2775,
  "affectedCounts": {
    "lackingDirectAppImageUrl": 2774,
    "lackingVerifiedSha256": 2775,
    "lackingBothDirectUrlAndSha256": 2774,
    "unknownVersion": 2775,
    "emptyDescription": 309,
    "emptyLicense": 1048,
    "emptySize": 2775,
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
