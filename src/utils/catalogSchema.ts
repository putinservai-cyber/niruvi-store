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
  tagline: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  version: z.string().min(1),
  releaseDate: z.string().min(1),
  size: z.string().min(1),
  architectures: z.array(z.enum(['x86_64', 'aarch64', 'armhf'])).min(1),
  license: z.string().min(1),
  licenseCategory: z.enum(['Open Source', 'Permissive', 'Proprietary']).optional(),
  publisher: z.object({
    name: z.string().min(1),
    website: z.string().optional(),
    verified: z.boolean(),
  }),
  sha256: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, 'SHA-256 must be a 64-character hexadecimal string'),
  downloadUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://') && !u.includes('example.com'), {
      message: 'Download URL must use https:// protocol and not point to example.com',
    }),
  homepageUrl: z.string().optional(),
  sourceUrl: z.string().optional(),
  releasesUrl: z.string().optional(),
  repositoryUrl: z.string().optional(),
  iconSlug: z.string().min(1),
  icon: z.string().nullable().optional(),
  brandColor: z.string().optional(),
  tags: z.array(z.string()),
  featured: z.boolean().optional(),
  downloadsCount: z.number().nonnegative(),
  rating: z.number().min(0).max(5),
  changelog: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  requirements: z.string().optional(),
  isUserAdded: z.boolean().optional(),
  sourceType: z.enum(['Official', 'Community']).optional(),
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
    const computedTier = verifiedFlag
      ? app.trustTier ||
        (app.sourceType === 'Official' ? 'Official Developer' : 'Verified Community')
      : 'Unverified Community';

    validApps.push({
      ...(app as unknown as AppMetadata),
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
