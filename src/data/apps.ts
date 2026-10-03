import { AppMetadata, Category } from '../types';
import generatedApps from './generated-catalog.json';

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
