import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateFirestoreRules } from '../scripts/validate-firestore-rules';

const catalogDir = path.join(process.cwd(), 'catalog');
const appsDir = path.join(catalogDir, 'apps');
const categoriesPath = path.join(catalogDir, 'categories.json');

const categories: string[] = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
const validCategories = categories.filter((c) => c !== 'All');

const VALID_ARCHITECTURES = ['x86_64', 'aarch64', 'armhf'] as const;
const SHA256_REGEX = /^[a-fA-F0-9]{64}$/;

const HttpUrlSchema = z.string().refine(
  (val) => {
    try {
      const parsed = new URL(val);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },
  { message: 'Must be a valid http:// or https:// URL' }
);

const CatalogAppSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    tagline: z.string().optional(),
    description: z.string().min(1),
    version: z.string().min(1),
    releaseDate: z.string().optional(),
    category: z.string().refine((cat) => validCategories.includes(cat), {
      message: `Category must be one of: ${validCategories.join(', ')}`,
    }),
    developer: z.string().min(1),
    license: z.string().min(1),
    licenseCategory: z.string().optional(),
    homepage: HttpUrlSchema.optional(),
    repository: HttpUrlSchema.optional(),
    repositoryUrl: HttpUrlSchema.optional(),
    releasesUrl: HttpUrlSchema.optional(),
    sourceType: z.string().optional(),
    officialStatus: z.boolean().optional(),
    icon: z.string().nullable().optional(),
    iconSlug: z.string().optional(),
    brandColor: z.string().optional(),
    size: z.string().optional(),
    architectures: z.array(z.enum(VALID_ARCHITECTURES)).min(1),
    formats: z.array(z.string()).refine((fmts) => fmts.includes('AppImage'), {
      message: 'Formats must include "AppImage"',
    }),
    download: z.record(z.string(), HttpUrlSchema),
    sha256: z
      .string()
      .refine((val) => val === '' || SHA256_REGEX.test(val), {
        message: 'sha256 must be empty or a valid 64-character hex string',
      })
      .optional(),
    keywords: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
    features: z.array(z.string()).optional(),
    requirements: z.string().optional(),
    changelog: z.array(z.string()).optional(),
    downloadsCount: z.number().optional(),
    rating: z.number().optional(),
  })
  .superRefine((app, ctx) => {
    for (const arch of app.architectures) {
      if (!app.download[arch]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing download URL for declared architecture "${arch}"`,
          path: ['download', arch],
        });
      }
    }
  });

const appFiles = fs
  .readdirSync(appsDir)
  .filter((file) => file.endsWith('.json'))
  .sort();

describe('Niruvi Store Catalog Schema Validation (catalog/apps/*.json)', () => {
  it('has a valid categories.json list', () => {
    expect(Array.isArray(categories)).toBe(true);
    expect(validCategories.length).toBeGreaterThan(0);
  });

  it('contains application JSON files in catalog/apps/', () => {
    expect(appFiles.length).toBeGreaterThan(0);
  });

  it.each(appFiles)('validates schema and filename consistency for catalog/apps/%s', (filename) => {
    const fullPath = path.join(appsDir, filename);
    const rawContent = fs.readFileSync(fullPath, 'utf-8');
    const parsedJson = JSON.parse(rawContent);

    const validation = CatalogAppSchema.safeParse(parsedJson);
    if (!validation.success) {
      throw new Error(
        `Schema validation failed for ${filename}:\n${JSON.stringify(validation.error.format(), null, 2)}`
      );
    }

    expect(`${validation.data.id}.json`).toBe(filename);
  });

  it('enforces unique application IDs across all catalog files', () => {
    const seen = new Set<string>();
    for (const filename of appFiles) {
      const data = JSON.parse(fs.readFileSync(path.join(appsDir, filename), 'utf-8'));
      expect(seen.has(data.id)).toBe(false);
      seen.add(data.id);
    }
  });
});

describe('Security & Configuration Hygiene', () => {
  it('validates firestore.rules syntax and cloud.firestore service declaration', () => {
    const result = validateFirestoreRules();
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('ensures root wrangler.json does not contain a hardcoded JWT_SECRET in vars and configures 404-page asset handling', () => {
    const wranglerPath = path.join(process.cwd(), 'wrangler.json');
    expect(fs.existsSync(wranglerPath)).toBe(true);
    const config = JSON.parse(fs.readFileSync(wranglerPath, 'utf-8'));
    expect(config.vars?.JWT_SECRET).toBeUndefined();
    expect(config.assets?.not_found_handling).toBe('404-page');
  });
});
