import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateFirestoreRules } from '../scripts/validate-firestore-rules';
import {
  parseSubmissionIssueBody,
  validateSubmissionFields,
  buildCatalogEntryFromSubmission,
  loadAllowedHosts,
} from '../scripts/submission-workflow.mjs';
import communityWorker, {
  buildCorsHeaders,
  computeIpHash,
  D1Database,
  SubmissionRow,
  WorkerEnv,
} from '../worker/src/index';

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
    source: z.enum(['community', 'official']).optional(),
    sourceType: z.string().optional(),
    checksumStatus: z.enum(['verified', 'provided', 'unverified']).optional(),
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

  it('validates community issue-form submissions, allowlist, HEAD request, duplicate detection, and catalog entry generation', async () => {
    const allowedHosts = loadAllowedHosts();
    expect(allowedHosts).toContain('github.com');
    expect(allowedHosts).toContain('gitlab.com');
    expect(allowedHosts).toContain('sourceforge.net');

    const sampleIssueBody = `
### Application Name

Helix Editor

### Short Description

Post-modern modal text editor for Linux.

### Version

25.01

### Architecture

x86_64

### License

MPL-2.0

### Download URL (HTTPS only)

https://github.com/helix-editor/helix/releases/download/25.01/helix-25.01-x86_64.AppImage

### Upstream Source / Repository URL

https://github.com/helix-editor/helix

### Icon URL (Optional)

_No response_

### SHA-256 Checksum (Optional)

4b68e919864ca078f44ff94d455ec3533ecf5ef7497d52f6bfa79f0ce6f66aa6
`;

    const parsed = parseSubmissionIssueBody(sampleIssueBody);
    expect(parsed.name).toBe('Helix Editor');
    expect(parsed.version).toBe('25.01');
    expect(parsed.iconUrl).toBe('');

    const mockHeadFetch = (async () =>
      new Response(null, { status: 200, statusText: 'OK' })) as unknown as typeof fetch;

    const validation = await validateSubmissionFields(parsed, {
      fetchImpl: mockHeadFetch,
    });
    expect(validation.valid).toBe(true);
    expect(validation.checksumStatus).toBe('provided');

    const catalogEntry = buildCatalogEntryFromSubmission(parsed, 'linuxuser');
    expect(catalogEntry.id).toBe('helix-editor');
    expect(catalogEntry.source).toBe('community');
    expect(catalogEntry.checksumStatus).toBe('provided');
    expect(CatalogAppSchema.safeParse(catalogEntry).success).toBe(true);

    // Rejects disallowed hosts and duplicates
    const badHostResult = await validateSubmissionFields(
      {
        ...parsed,
        downloadUrl: 'https://untrusted-mirror.example.org/helix.AppImage',
      },
      { skipHeadCheck: true }
    );
    expect(badHostResult.valid).toBe(false);

    const duplicateResult = await validateSubmissionFields(
      {
        ...parsed,
        name: 'Audacity',
      },
      { skipHeadCheck: true }
    );
    expect(duplicateResult.valid).toBe(false);
  });

  it('validates Cloudflare Worker + D1 endpoints (/api/apps, /api/submit, /api/report, /api/admin/*) and strict CORS', async () => {
    // 1. Verify strict CORS headers for allowed origins only
    const ghCors = buildCorsHeaders('https://putinservai-cyber.github.io');
    expect(ghCors['Access-Control-Allow-Origin']).toBe('https://putinservai-cyber.github.io');

    const customCors = buildCorsHeaders('https://niruvi-store.runs-on.dev');
    expect(customCors['Access-Control-Allow-Origin']).toBe('https://niruvi-store.runs-on.dev');

    const evilCors = buildCorsHeaders('https://evil.example.com');
    expect(evilCors['Access-Control-Allow-Origin']).toBeUndefined();

    // 2. Verify salted SHA-256 IP hashing never stores raw IP
    const ipHash = await computeIpHash('203.0.113.42', 'test-salt');
    expect(ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(ipHash).not.toContain('203.0.113.42');

    // 3. Mock D1 database for submissions & reports
    const rows: SubmissionRow[] = [];
    const reports: Array<Record<string, unknown>> = [];

    const mockDb: D1Database = {
      prepare(query: string) {
        let bound: unknown[] = [];
        return {
          bind(...values: unknown[]) {
            bound = values;
            return this;
          },
          async first<T>() {
            if (query.includes('COUNT(*) AS count') && query.includes('FROM submissions')) {
              const hash = bound[0];
              const count = rows.filter((r) => r.ip_hash === hash).length;
              return { count } as unknown as T;
            }
            if (query.includes('COUNT(*) AS count') && query.includes('FROM submission_reports')) {
              const hash = bound[0];
              const count = reports.filter((r) => r.ip_hash === hash).length;
              return { count } as unknown as T;
            }
            if (query.includes('SELECT id, slug, name') && query.includes('FROM submissions')) {
              const [slug, name, dl] = bound as [string, string, string];
              const match = rows.find(
                (r) =>
                  r.slug === slug ||
                  r.name.toLowerCase() === name.toLowerCase() ||
                  r.download_url.toLowerCase() === dl.toLowerCase()
              );
              return (match || null) as unknown as T;
            }
            return null;
          },
          async run() {
            if (query.includes('INSERT INTO submissions')) {
              const [
                id,
                name,
                slug,
                description,
                version,
                architecture,
                license,
                download_url,
                source_url,
                icon_url,
                sha256,
                created_at,
                ip_hash,
              ] = bound as string[];
              rows.push({
                id,
                name,
                slug,
                description,
                version,
                architecture: architecture as SubmissionRow['architecture'],
                license,
                download_url,
                source_url,
                icon_url: icon_url || null,
                sha256: sha256 || null,
                status: 'published',
                created_at,
                ip_hash,
              });
            } else if (query.includes('INSERT INTO submission_reports')) {
              const [id, app_slug, reason, details, created_at, ip_hash] = bound as string[];
              reports.push({ id, app_slug, reason, details, created_at, ip_hash });
            } else if (query.includes('UPDATE submissions')) {
              const [nextStatus, target] = bound as ['published' | 'hidden', string];
              for (const r of rows) {
                if (r.id === target || r.slug === target) r.status = nextStatus;
              }
            } else if (query.includes('DELETE FROM submissions')) {
              const [target] = bound as [string];
              const idx = rows.findIndex((r) => r.id === target || r.slug === target);
              if (idx >= 0) rows.splice(idx, 1);
            }
            return { success: true };
          },
          async all<T>() {
            if (query.includes('FROM submissions') && query.includes('WHERE status = ?1')) {
              const status = bound[0];
              return { results: rows.filter((r) => r.status === status) as unknown as T[] };
            }
            if (query.includes('FROM submissions')) {
              return { results: [...rows] as unknown as T[] };
            }
            if (query.includes('FROM submission_reports')) {
              return { results: [...reports] as unknown as T[] };
            }
            return { results: [] };
          },
        };
      },
    };

    const env: WorkerEnv = {
      DB: mockDb,
      TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
      ADMIN_TOKEN: 'super-secret-admin-token',
      IP_HASH_SALT: 'test-ip-salt',
    };

    const mockFetch: typeof fetch = async (input) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (urlStr.includes('challenges.cloudflare.com/turnstile')) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response(null, { status: 200 });
    };

    // POST /api/submit with valid input
    const submitRes = await communityWorker.fetch(
      new Request('https://niruvi-store-api.workers.dev/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://niruvi-store.runs-on.dev',
          'CF-Connecting-IP': '198.51.100.7',
        },
        body: JSON.stringify({
          name: 'Logseq',
          description: 'Privacy-first open-source knowledge base.',
          version: '0.10.9',
          architecture: 'x86_64',
          license: 'AGPL-3.0',
          download_url: 'https://github.com/logseq/logseq/releases/download/0.10.9/Logseq-linux-x64-0.10.9.AppImage',
          source_url: 'https://github.com/logseq/logseq',
          turnstileToken: 'valid-turnstile-token',
        }),
      }),
      env,
      undefined,
      mockFetch
    );
    expect(submitRes.status).toBe(201);
    expect(submitRes.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://niruvi-store.runs-on.dev'
    );

    // GET /api/apps returns the published submission
    const getAppsRes = await communityWorker.fetch(
      new Request('https://niruvi-store-api.workers.dev/api/apps', {
        method: 'GET',
        headers: { Origin: 'https://putinservai-cyber.github.io' },
      }),
      env,
      undefined,
      mockFetch
    );
    expect(getAppsRes.status).toBe(200);
    const appsBody = (await getAppsRes.json()) as { apps: SubmissionRow[] };
    expect(appsBody.apps.length).toBe(1);
    expect(appsBody.apps[0].slug).toBe('logseq');

    // POST /api/report records visitor report
    const reportRes = await communityWorker.fetch(
      new Request('https://niruvi-store-api.workers.dev/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://niruvi-store.runs-on.dev',
        },
        body: JSON.stringify({
          slug: 'logseq',
          reason: 'Outdated version',
          details: 'New release 0.10.10 is available upstream.',
        }),
      }),
      env,
      undefined,
      mockFetch
    );
    expect(reportRes.status).toBe(201);

    // Admin hide without token returns 401
    const unauthHide = await communityWorker.fetch(
      new Request('https://niruvi-store-api.workers.dev/api/admin/hide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'logseq', status: 'hidden' }),
      }),
      env,
      undefined,
      mockFetch
    );
    expect(unauthHide.status).toBe(401);

    // Admin hide with valid ADMIN_TOKEN hides entry from /api/apps
    const authHide = await communityWorker.fetch(
      new Request('https://niruvi-store-api.workers.dev/api/admin/hide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer super-secret-admin-token',
        },
        body: JSON.stringify({ slug: 'logseq', status: 'hidden' }),
      }),
      env,
      undefined,
      mockFetch
    );
    expect(authHide.status).toBe(200);

    const afterHideRes = await communityWorker.fetch(
      new Request('https://niruvi-store-api.workers.dev/api/apps'),
      env,
      undefined,
      mockFetch
    );
    const afterHideBody = (await afterHideRes.json()) as { apps: SubmissionRow[] };
    expect(afterHideBody.apps.length).toBe(0);
  });
});
