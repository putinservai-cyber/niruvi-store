import { z } from 'zod';
import { AppMetadata } from '../types';
import { sanitizeText, sanitizeUrl } from './sanitize';

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

/**
 * Checks whether a string is a valid 64-character hex SHA-256 hash
 * and NOT a synthetic/sequential placeholder.
 */
export function isGenuineSha256(hash: unknown): boolean {
  if (typeof hash !== 'string') return false;
  const trimmed = hash.trim();
  if (!/^[a-fA-F0-9]{64}$/.test(trimmed)) return false;
  return !SYNTHETIC_HASH_PATTERNS.some((rx) => rx.test(trimmed));
}

/**
 * Checks whether a URL is a direct HTTPS link to a `.AppImage` binary file
 * (and NOT a GitHub /releases HTML page, mirrorlist CGI script, or appimage.github.io page).
 */
export function isDirectAppImageUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.hostname.toLowerCase() === 'appimage.github.io') return false;
    const pathname = decodeURIComponent(parsed.pathname).toLowerCase();
    return pathname.endsWith('.appimage');
  } catch {
    return false;
  }
}

const POLICY_BLOCKLIST_RULES: Array<{ idPattern?: RegExp; textPattern: RegExp; reason: string }> = [
  {
    idPattern: /^account-scraper$/i,
    textPattern: /\b(account[-_\s]?scraper|account\s+generator\s+services|free\s+spotify,?\s*netflix)\b/i,
    reason: 'Prohibited credential/account generator or unauthorized account-scraping tool',
  },
];

/**
 * Inspects a catalog item for policy/moderation violations (e.g. `account-scraper`).
 */
export function isPolicyFlaggedEntry(app: {
  id?: string;
  name?: string;
  tagline?: string;
  description?: string;
}): { flagged: boolean; reason?: string } {
  const id = (app.id || '').trim();
  const combined = `${id} ${app.name || ''} ${app.tagline || ''} ${app.description || ''}`;
  for (const rule of POLICY_BLOCKLIST_RULES) {
    if ((rule.idPattern && rule.idPattern.test(id)) || rule.textPattern.test(combined)) {
      return { flagged: true, reason: rule.reason };
    }
  }
  return { flagged: false };
}

/**
 * Formats an application version string without ever outputting "vlatest".
 * Returns "Version unknown" when a real version is unavailable.
 */
export function formatAppVersion(version?: string | null): string {
  if (!version || typeof version !== 'string') return 'Version unknown';
  const trimmed = version.trim();
  if (!trimmed || /^(v?latest|unknown|version\s+unknown|n\/a|-)$/i.test(trimmed)) {
    return 'Version unknown';
  }
  return `v${trimmed.replace(/^v/i, '')}`;
}

/**
 * Returns true if the version string represents a known release version (not "latest" or "Version unknown").
 */
export function hasKnownVersion(version?: string | null): boolean {
  return formatAppVersion(version) !== 'Version unknown';
}

/**
 * Determines whether a catalog entry is eligible to appear in the default main store listing:
 * requires a direct `https://...*.AppImage` URL, a genuine 64-hex SHA-256 digest, and no policy violation.
 */
export function isEligibleForMainListing(app: {
  id?: string;
  name?: string;
  tagline?: string;
  description?: string;
  downloadUrl?: string;
  sha256?: string;
  hiddenFromMainListing?: boolean;
  moderationFlag?: string;
  isUserAdded?: boolean;
  source?: string;
}): boolean {
  if (app.moderationFlag === 'flagged_policy' || isPolicyFlaggedEntry(app).flagged) {
    return false;
  }
  if (typeof app.hiddenFromMainListing === 'boolean') {
    return !app.hiddenFromMainListing;
  }
  return isDirectAppImageUrl(app.downloadUrl) && isGenuineSha256(app.sha256);
}

export const ScreenshotSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), {
      message: 'Screenshot URL must use https://',
    }),
  alt: z.string().min(3, 'Meaningful screenshot alt text is required for accessibility'),
  caption: z.string().optional(),
});

export const CatalogAppSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().default(''),
  description: z.string().default(''),
  category: z.string().min(1),
  simplifiedCategory: z.string().optional(),
  version: z.string().min(1),
  releaseDate: z.string(),
  size: z.string(),
  architectures: z.array(z.enum(['x86_64', 'aarch64', 'armhf'])).min(1),
  license: z.string().default(''),
  licenseCategory: z.enum(['Open Source', 'Permissive', 'Proprietary']).optional(),
  publisher: z.object({
    name: z.string().min(1),
    website: z.string().optional(),
    verified: z.boolean(),
    github: z.string().optional(),
  }),
  sha256: z
    .string()
    .refine((val) => val === '' || /^[a-fA-F0-9]{64}$/.test(val), {
      message: 'SHA-256 must be empty or a 64-character hexadecimal string',
    }),
  downloadUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://') && !u.includes('example.com'), {
      message: 'Download URL must use https:// protocol and not point to example.com',
    }),
  downloadMap: z.record(z.string(), z.string()).optional(),
  homepageUrl: z.string().optional(),
  sourceUrl: z.string().optional(),
  releasesUrl: z.string().optional(),
  repositoryUrl: z.string().optional(),
  githubRepo: z.string().optional(),
  iconSlug: z.string().min(1),
  icon: z.string().nullable().optional(),
  brandColor: z.string().optional(),
  tags: z.array(z.string()),
  featured: z.boolean().optional(),
  downloadsCount: z.number().nonnegative().optional().default(0),
  rating: z.number().min(0).max(5).optional().default(0),
  changelog: z.array(z.string()).optional(),
  versionHistory: z.array(z.any()).optional(),
  features: z.array(z.string()).optional(),
  requirements: z.string().optional(),
  isUserAdded: z.boolean().optional(),
  source: z.enum(['community', 'official']).optional(),
  sourceType: z.enum(['Official', 'Community']).optional(),
  checksumStatus: z.enum(['verified', 'provided', 'unverified']).optional(),
  trustTier: z
    .enum(['Official Developer', 'Verified Community', 'Unverified Community'])
    .optional(),
  screenshots: z.array(ScreenshotSchema).optional(),
});

export type ValidatedCatalogApp = z.infer<typeof CatalogAppSchema>;

export interface CatalogValidationResult {
  validApps: AppMetadata[];
  errors: Array<{ id: string; message: string }>;
  isValid: boolean;
}

export const ALLOWED_SUBMISSION_HOSTS = [
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'gitlab.com',
  'sourceforge.net',
  'downloads.sourceforge.net',
  'codeberg.org',
  'freedesktop.org',
  'kde.org',
  'download.kde.org',
  'gnome.org',
  'mozilla.org',
  'niruvi-store.runs-on.dev',
  'putinservai-cyber.github.io',
] as const;

export function isAllowedSubmissionHost(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_SUBMISSION_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export function isCommunitySubmitted(app: Pick<AppMetadata, 'source' | 'sourceType' | 'isUserAdded'>): boolean {
  return app.source === 'community' || Boolean(app.isUserAdded);
}

export function getChecksumStatus(
  app: Pick<AppMetadata, 'checksumStatus' | 'source' | 'sourceType' | 'isUserAdded' | 'sha256' | 'publisher'>
): 'verified' | 'provided' | 'unverified' {
  if (app.checksumStatus === 'provided' && isGenuineSha256(app.sha256)) {
    return 'provided';
  }
  if (app.checksumStatus === 'verified' && isGenuineSha256(app.sha256)) {
    return 'verified';
  }
  if (isCommunitySubmitted(app)) {
    return isGenuineSha256(app.sha256) ? 'provided' : 'unverified';
  }
  if (app.publisher?.verified && isGenuineSha256(app.sha256)) {
    return 'verified';
  }
  return 'unverified';
}

export interface SubmissionIssueParams {
  name: string;
  shortDescription: string;
  version: string;
  architecture: string;
  license: string;
  downloadUrl: string;
  sourceUrl: string;
  iconUrl?: string;
  sha256?: string;
  category?: string;
}

/**
 * Builds the prefilled GitHub Issue Form URL for putinservai-cyber/niruvi-store
 * using .github/ISSUE_TEMPLATE/submit-appimage.yml and label "submission".
 */
export function buildGitHubSubmissionIssueUrl(params: SubmissionIssueParams): string {
  const query = new URLSearchParams();
  query.set('template', 'submit-appimage.yml');
  query.set('labels', 'submission');
  const titleName = params.name.trim() || 'App';
  const titleVersion = params.version.trim() ? ` v${params.version.trim().replace(/^v/i, '')}` : '';
  query.set('title', `[Submission]: ${titleName}${titleVersion}`);
  if (params.name.trim()) query.set('name', params.name.trim());
  if (params.shortDescription.trim()) query.set('short_description', params.shortDescription.trim());
  if (params.version.trim()) query.set('version', params.version.trim().replace(/^v/i, ''));
  if (params.architecture.trim()) query.set('architecture', params.architecture.trim());
  if (params.license.trim()) query.set('license', params.license.trim());
  if (params.downloadUrl.trim()) query.set('download_url', params.downloadUrl.trim());
  if (params.sourceUrl.trim()) query.set('source_url', params.sourceUrl.trim());
  if (params.iconUrl?.trim()) query.set('icon_url', params.iconUrl.trim());
  if (params.sha256?.trim()) query.set('sha256', params.sha256.trim().toLowerCase());
  if (params.category?.trim()) query.set('category', params.category.trim());

  return `https://github.com/putinservai-cyber/niruvi-store/issues/new?${query.toString()}`;
}

/**
 * Converts a row from the Cloudflare Worker D1 `submissions` table (`GET /api/apps`)
 * into a sanitized `AppMetadata` entry with `source: 'community'`.
 */
export function mapWorkerSubmissionToAppMetadata(raw: unknown): AppMetadata | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.status && r.status !== 'published') return null;

  const slug = sanitizeText(String(r.slug || r.id || ''), 64)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-');
  const name = sanitizeText(String(r.name || ''), 80);
  const description = sanitizeText(String(r.description || ''), 500);
  const version = sanitizeText(String(r.version || '1.0.0').replace(/^v/i, ''), 40);
  const archRaw = String(r.architecture || 'x86_64');
  const architecture =
    archRaw === 'aarch64' || archRaw === 'armhf' || archRaw === 'x86_64' ? archRaw : 'x86_64';
  const license = sanitizeText(String(r.license || 'Open Source'), 60);
  const downloadUrl = sanitizeUrl(String(r.download_url || r.downloadUrl || ''));
  const sourceUrl = sanitizeUrl(String(r.source_url || r.sourceUrl || ''));
  const iconUrl = r.icon_url || r.iconUrl ? sanitizeUrl(String(r.icon_url || r.iconUrl)) : undefined;
  const rawSha = typeof r.sha256 === 'string' ? r.sha256.trim().toLowerCase() : '';
  const hasValidSha = isGenuineSha256(rawSha);

  if (!slug || !name || !isValidHttpsDownloadUrl(downloadUrl)) {
    return null;
  }

  const createdAt =
    typeof r.created_at === 'string' && r.created_at.length >= 10
      ? r.created_at.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  return {
    id: slug,
    name,
    tagline: description.slice(0, 160),
    description,
    category: 'Utilities',
    simplifiedCategory: 'System/Utilities',
    version,
    releaseDate: createdAt,
    size: '',
    architectures: [architecture],
    formats: ['AppImage'],
    license,
    licenseCategory: /mit|apache|bsd|isc/i.test(license) ? 'Permissive' : 'Open Source',
    publisher: {
      name: 'Community Submission',
      website: sourceUrl || undefined,
      verified: false,
      github: sourceUrl || undefined,
    },
    sha256: hasValidSha ? rawSha : '',
    downloadUrl,
    downloadMap: { [architecture]: downloadUrl },
    homepageUrl: sourceUrl || undefined,
    sourceUrl: sourceUrl || undefined,
    repositoryUrl: sourceUrl || undefined,
    iconSlug: slug,
    icon: iconUrl || undefined,
    source: 'community',
    sourceType: 'Community',
    checksumStatus: hasValidSha ? 'provided' : 'unverified',
    trustTier: 'Unverified Community',
    tags: ['community', 'appimage'],
    downloadsCount: 0,
    rating: 0,
    isUserAdded: true,
  };
}

/**
 * Validates that a download URL strictly uses HTTPS and is not a placeholder domain.
 */
export function isValidHttpsDownloadUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const cleaned = sanitizeUrl(url);
  if (!cleaned) return false;
  try {
    const parsed = new URL(cleaned);
    return parsed.protocol === 'https:' && parsed.hostname !== 'example.com';
  } catch {
    return false;
  }
}

/**
 * Validates that a Niruvi protocol URL strictly uses `niruvi://install`
 * and embeds a valid `https://` download URL.
 */
export function isValidNiruviProtocolUrl(protocolUrl: unknown): boolean {
  if (typeof protocolUrl !== 'string') return false;
  const trimmed = protocolUrl.trim();
  if (!trimmed.startsWith('niruvi://install?')) return false;
  try {
    const queryPart = trimmed.slice('niruvi://install?'.length);
    const params = new URLSearchParams(queryPart);
    const targetUrl = params.get('url');
    const id = params.get('id');
    return Boolean(id && targetUrl && isValidHttpsDownloadUrl(targetUrl));
  } catch {
    return false;
  }
}

/**
 * Validates and sanitizes an array of raw catalog items at load time.
 * Never grants a "verified" badge unless the SHA-256 digest is genuine and unique.
 */
export function validateCatalogAtRuntime(rawItems: unknown): CatalogValidationResult {
  if (!Array.isArray(rawItems)) {
    return {
      validApps: [],
      errors: [
        { id: 'catalog_root', message: 'Catalog JSON root must be an array of applications.' },
      ],
      isValid: false,
    };
  }

  const validApps: AppMetadata[] = [];
  const errors: Array<{ id: string; message: string }> = [];
  const seenHashes = new Set<string>();

  for (const item of rawItems) {
    const parsed = CatalogAppSchema.safeParse(item);
    if (!parsed.success) {
      const appId =
        typeof item === 'object' && item !== null && 'id' in item
          ? String((item as Record<string, unknown>).id)
          : 'unknown_app';
      errors.push({
        id: appId,
        message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
      continue;
    }

    const app = parsed.data;
    const lowerHash = app.sha256.toLowerCase();
    const isUniqueGenuineHash = isGenuineSha256(lowerHash) && !seenHashes.has(lowerHash);
    if (isGenuineSha256(lowerHash)) {
      seenHashes.add(lowerHash);
    }

    const verifiedFlag = Boolean(app.publisher.verified && isUniqueGenuineHash);
    const isCommunity = app.source === 'community' || Boolean(app.isUserAdded);
    const resolvedChecksumStatus: 'verified' | 'provided' | 'unverified' =
      app.checksumStatus === 'provided' && isGenuineSha256(lowerHash)
        ? 'provided'
        : verifiedFlag
          ? 'verified'
          : isCommunity && isGenuineSha256(lowerHash)
            ? 'provided'
            : 'unverified';

    const computedTier = verifiedFlag
      ? app.trustTier ||
        (app.sourceType === 'Official' ? 'Official Developer' : 'Verified Community')
      : 'Unverified Community';

    validApps.push({
      ...(app as unknown as AppMetadata),
      source: app.source || (isCommunity ? 'community' : 'official'),
      sourceType: app.sourceType || (isCommunity ? 'Community' : 'Official'),
      checksumStatus: resolvedChecksumStatus,
      name: sanitizeText(app.name, 100),
      tagline: sanitizeText(app.tagline, 300),
      description: sanitizeText(app.description, 4000),
      downloadUrl: sanitizeUrl(app.downloadUrl),
      homepageUrl: app.homepageUrl ? sanitizeUrl(app.homepageUrl) : undefined,
      sourceUrl: app.sourceUrl ? sanitizeUrl(app.sourceUrl) : undefined,
      releasesUrl: app.releasesUrl ? sanitizeUrl(app.releasesUrl) : undefined,
      repositoryUrl: app.repositoryUrl ? sanitizeUrl(app.repositoryUrl) : undefined,
      trustTier: computedTier,
      publisher: {
        ...app.publisher,
        verified: verifiedFlag,
        name: sanitizeText(app.publisher.name, 100),
        website: app.publisher.website ? sanitizeUrl(app.publisher.website) : undefined,
      },
    });
  }

  return {
    validApps,
    errors,
    isValid: validApps.length > 0 && errors.length === 0,
  };
}
