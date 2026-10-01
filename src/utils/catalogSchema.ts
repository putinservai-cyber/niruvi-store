import { z } from 'zod';
import { AppMetadata } from '../types';
import { sanitizeText, sanitizeUrl } from './sanitize';

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
  architectures: z.array(z.enum(['x86_64', 'aarch64'])).min(1),
  license: z.string().min(1),
  licenseCategory: z.enum(['Open Source', 'Permissive', 'Proprietary']).optional(),
  publisher: z.object({
    name: z.string().min(1),
    website: z.string().optional(),
    verified: z.boolean(),
  }),
  sha256: z.string().min(1),
  downloadUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), {
      message: 'Download URL must use https:// protocol',
    }),
  homepageUrl: z.string().optional(),
  sourceUrl: z.string().optional(),
  releasesUrl: z.string().optional(),
  repositoryUrl: z.string().optional(),
  iconSlug: z.string().min(1),
  icon: z.string().optional(),
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
 * Validates that a download URL strictly uses HTTPS.
 */
export function isValidHttpsDownloadUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const cleaned = sanitizeUrl(url);
  if (!cleaned) return false;
  try {
    const parsed = new URL(cleaned);
    return parsed.protocol === 'https:';
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
 */
export function validateCatalogAtRuntime(rawItems: unknown): CatalogValidationResult {
  if (!Array.isArray(rawItems)) {
    return {
      validApps: [],
      errors: [{ id: 'catalog_root', message: 'Catalog JSON root must be an array of applications.' }],
      isValid: false,
    };
  }

  const validApps: AppMetadata[] = [];
  const errors: Array<{ id: string; message: string }> = [];

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
      publisher: {
        ...app.publisher,
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
