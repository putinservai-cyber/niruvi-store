import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import worker, {
  Env,
  KVNamespace,
  syncAppImageHubCatalogBatch,
  fetchCachedGitHubReleases,
} from '../src/worker';
import { TOTAL_CATALOG_COUNT, APPIMAGEHUB_FEED_COUNT } from '../src/data/apps';
import {
  normalizeAppImageHubItem,
  normalizeAllAppImageHubItems,
  mapToSimplifiedCategory,
  extractVersionHistoryFromReleases,
  buildAppMetadataFromNormalized,
  computeSha256Hex,
  parseSha256ChecksumText,
  GitHubReleaseResponse,
} from '../src/utils/appimagehub';

class MockKV implements KVNamespace {
  private store = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe('AppImageHub Feed Normalization & Category Mapping', () => {
  it('normalizes an AppImageHub feed.json entry into canonical schema', () => {
    const raw = {
      name: '1DevTool_Releases',
      description: '<p>One workspace. Every AI agent. Every project.</p>',
      categories: ['Development'],
      authors: [{ name: 'stoicsoft', url: 'https://github.com/stoicsoft' }],
      license: 'MIT',
      links: [
        { type: 'GitHub', url: 'stoicsoft/1devtool-releases' },
        { type: 'Download', url: 'https://github.com/stoicsoft/1devtool-releases/releases' },
      ],
      icons: ['1DevTool_Releases/icons/1024x1024/1devtool.png'],
      screenshots: ['1DevTool_Releases/screenshot.png'],
    };

    const normalized = normalizeAppImageHubItem(raw);
    expect(normalized).not.toBeNull();
    expect(normalized?.id).toBe('1devtool_releases');
    expect(normalized?.name).toBe('1DevTool Releases');
    expect(normalized?.description).toBe('One workspace. Every AI agent. Every project.');
    expect(normalized?.category).toBe('Development');
    expect(normalized?.github_repo).toBe('stoicsoft/1devtool-releases');
    expect(normalized?.icon).toBe(
      'https://appimage.github.io/database/1DevTool_Releases/icons/1024x1024/1devtool.png'
    );
    expect(normalized?.screenshots).toEqual([
      'https://appimage.github.io/database/1DevTool_Releases/screenshot.png',
    ]);
    expect(normalized?.license).toBe('MIT');
  });

  it('maps FreeDesktop and store categories to the 8 simplified categories', () => {
    expect(mapToSimplifiedCategory(['Network', 'WebBrowser'])).toBe('Internet');
    expect(mapToSimplifiedCategory(['Game', 'ArcadeGame'])).toBe('Games');
    expect(mapToSimplifiedCategory(['Graphics', '2DGraphics'])).toBe('Graphics');
    expect(mapToSimplifiedCategory(['AudioVideo', 'Player'])).toBe('Audio/Video');
    expect(mapToSimplifiedCategory(['Office', 'WordProcessor'])).toBe('Office');
    expect(mapToSimplifiedCategory(['Development', 'IDE'])).toBe('Development');
    expect(mapToSimplifiedCategory(['System', 'Utility'])).toBe('System/Utilities');
    expect(mapToSimplifiedCategory(['Education', 'Science'])).toBe('Education');
  });
});

describe('GitHub Releases Asset Extraction & Strict SHA-256 Verification', () => {
  const realSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  it('extracts multi-architecture AppImage assets, version history, and verified SHA-256 digest', async () => {
    const sampleReleases: GitHubReleaseResponse[] = [
      {
        id: 101,
        tag_name: 'v2.4.0',
        published_at: '2026-09-15T12:00:00Z',
        body: 'Added Wayland fractional scaling and ARM64 build.',
        prerelease: false,
        assets: [
          {
            name: 'SampleApp-2.4.0-x86_64.AppImage',
            browser_download_url:
              'https://github.com/example/sampleapp/releases/download/v2.4.0/SampleApp-2.4.0-x86_64.AppImage',
            size: 68157440,
            digest: `sha256:${realSha256}`,
          },
          {
            name: 'SampleApp-2.4.0-aarch64.AppImage',
            browser_download_url:
              'https://github.com/example/sampleapp/releases/download/v2.4.0/SampleApp-2.4.0-aarch64.AppImage',
            size: 65011712,
          },
        ],
      },
      {
        id: 100,
        tag_name: 'v2.3.0',
        published_at: '2026-07-01T10:00:00Z',
        body: 'Initial stable Linux AppImage release.',
        prerelease: false,
        assets: [
          {
            name: 'SampleApp-2.3.0-x86_64.AppImage',
            browser_download_url:
              'https://github.com/example/sampleapp/releases/download/v2.3.0/SampleApp-2.3.0-x86_64.AppImage',
            size: 62914560,
          },
        ],
      },
    ];

    const extracted = await extractVersionHistoryFromReleases(sampleReleases);
    expect(extracted).not.toBeNull();
    expect(extracted?.latestVersion).toBe('2.4.0');
    expect(extracted?.architectures).toEqual(['x86_64', 'aarch64']);
    expect(extracted?.verified).toBe(true);
    expect(extracted?.sha256).toBe(realSha256);
    expect(extracted?.versionHistory.length).toBe(2);
    expect(extracted?.versionHistory[1].version).toBe('2.3.0');
  });

  it('never marks an app as Verified when no SHA-256 checksum was computed or published', async () => {
    const normalized = normalizeAppImageHubItem({
      name: 'UnverifiedTool',
      description: 'Community tool without checksums.',
      categories: ['Utility'],
      links: [{ type: 'GitHub', url: 'community/unverified-tool' }],
    })!;

    const unverifiedMetadata = buildAppMetadataFromNormalized(normalized, null);
    expect(unverifiedMetadata.publisher.verified).toBe(false);
    expect(unverifiedMetadata.sha256).toBe('');
    expect(unverifiedMetadata.trustTier).toBe('Unverified Community');
  });

  it('computes Web Crypto SHA-256 and parses SHA256SUMS sidecar files', async () => {
    const enc = new TextEncoder().encode('');
    const emptySha = await computeSha256Hex(enc.buffer as ArrayBuffer);
    expect(emptySha).toBe(realSha256);

    const sidecarContent = `${realSha256}  SampleApp-2.4.0-x86_64.AppImage\n`;
    expect(parseSha256ChecksumText(sidecarContent, 'SampleApp-2.4.0-x86_64.AppImage')).toBe(
      realSha256
    );
  });
});

describe('Worker Catalog Pipeline, Cron Batch Sync & API Routes', () => {
  const createEnv = (): Env => ({
    NIRUVI_AUTH_KV: new MockKV(),
    JWT_SECRET: 'test-worker-secret-key-for-pipeline',
  });

  it('runs idempotent batch sync and continues when an individual app enrichment fails', async () => {
    const env = createEnv();
    const mockFetch = (async (url: string) => {
      if (String(url).includes('bad-owner/rate-limited-repo')) {
        return new Response(JSON.stringify({ message: 'rate limit' }), { status: 429 });
      }
      return new Response(
        JSON.stringify([
          {
            id: 1,
            tag_name: 'v1.2.0',
            published_at: '2026-09-20T00:00:00Z',
            body: 'Stable build',
            assets: [
              {
                name: 'GoodApp-1.2.0-x86_64.AppImage',
                browser_download_url:
                  'https://github.com/good/app/releases/download/v1.2.0/GoodApp-1.2.0-x86_64.AppImage',
                size: 45000000,
                digest:
                  'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              },
            ],
          },
        ]),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const summary = await syncAppImageHubCatalogBatch(env, {
      maxItems: 10,
      maxGithubEnrich: 5,
      fetchImpl: mockFetch,
      rawFeedItemsOverride: [
        {
          name: 'Broken_Repo_App',
          description: 'App whose GitHub repo returns 429',
          categories: ['Utility'],
          links: [{ type: 'GitHub', url: 'bad-owner/rate-limited-repo' }],
        },
        {
          name: 'Good_Verified_App',
          description: 'App with verified GitHub Release SHA-256 digest',
          categories: ['Development'],
          links: [{ type: 'GitHub', url: 'good/app' }],
        },
      ],
    });

    expect(summary.processed).toBe(2);
    expect(summary.enriched).toBe(1);
    expect(summary.verifiedCount).toBe(1);
  });

  it('serves GET /api/catalog with filters, GET /api/catalog/:id, POST /api/reports, and POST /api/submissions', async () => {
    const env = createEnv();

    // 1. GET /api/catalog?category=Development&verified=1
    const catRes = await worker.fetch(
      new Request('https://niruvi.store/api/catalog?category=Development&verified=1&limit=10'),
      env
    );
    expect(catRes.status).toBe(200);
    const catData = (await catRes.json()) as { items: any[]; total: number };
    expect(catData.items.length).toBeGreaterThan(0);
    expect(catData.items.every((a) => a.publisher.verified === true)).toBe(true);

    // 2. GET /api/catalog/kdenlive
    const detailRes = await worker.fetch(
      new Request('https://niruvi.store/api/catalog/kdenlive'),
      env
    );
    expect(detailRes.status).toBe(200);
    const detailData = (await detailRes.json()) as { app: { id: string; name: string } };
    expect(detailData.app.id).toBe('kdenlive');

    // 3. POST /api/reports ("Report broken app")
    const repRes = await worker.fetch(
      new Request('https://niruvi.store/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: 'kdenlive',
          appName: 'Kdenlive',
          reason: 'Broken download link (404)',
          details: 'Mirror returned 404 on Ubuntu 24.04 x86_64.',
          distro: 'Ubuntu 24.04',
          architecture: 'x86_64',
        }),
      }),
      env
    );
    expect(repRes.status).toBe(201);

    // 4. POST /api/submissions ("Submit an app")
    const subRes = await worker.fetch(
      new Request('https://niruvi.store/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Helix Editor',
          description: 'A post-modern modal text editor for Linux.',
          category: 'Development',
          githubRepo: 'helix-editor/helix',
          downloadUrl:
            'https://github.com/helix-editor/helix/releases/download/25.01/helix-25.01-x86_64.AppImage',
          license: 'MPL-2.0',
        }),
      }),
      env
    );
    expect(subRes.status).toBe(201);
  });

  it('imports all 2,569 AppImageHub feed entries without collisions, follows GitHub Link pagination, and paginates 48/page on /api/catalog', async () => {
    expect(APPIMAGEHUB_FEED_COUNT).toBeGreaterThanOrEqual(2500);
    expect(TOTAL_CATALOG_COUNT).toBeGreaterThanOrEqual(APPIMAGEHUB_FEED_COUNT);

    // Verify duplicate app names with different authors disambiguate instead of dropping
    const dupes = normalizeAllAppImageHubItems([
      { name: 'Iris', authors: [{ name: 'author-one' }] },
      { name: 'iris', authors: [{ name: 'author-two' }] },
    ]);
    expect(dupes.length).toBe(2);
    expect(dupes[0].id).not.toBe(dupes[1].id);

    // Verify GitHub Releases pagination follows Link rel="next" with per_page=100
    const env = createEnv();
    const calledUrls: string[] = [];
    const paginatedFetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      calledUrls.push(url);
      if (url.includes('page=2')) {
        return new Response(
          JSON.stringify([{ tag_name: 'v1.0.0', published_at: '2025-01-01T00:00:00Z', assets: [] }]),
          { status: 200, headers: { 'X-RateLimit-Remaining': '4998' } }
        );
      }
      return new Response(
        JSON.stringify([{ tag_name: 'v2.0.0', published_at: '2026-01-01T00:00:00Z', assets: [] }]),
        {
          status: 200,
          headers: {
            Link: '<https://api.github.com/repos/owner/repo/releases?per_page=100&page=2>; rel="next"',
            'X-RateLimit-Remaining': '4999',
          },
        }
      );
    }) as unknown as typeof fetch;

    const releases = await fetchCachedGitHubReleases(env, 'owner/repo', paginatedFetch);
    expect(calledUrls[0]).toContain('per_page=100');
    expect(calledUrls.length).toBe(2);
    expect(releases.length).toBe(2);

    // Verify server-side 48/page pagination across all 2,569 apps
    const p1Res = await worker.fetch(
      new Request('https://niruvi.store/api/catalog?page=1&limit=48'),
      env
    );
    const p1 = (await p1Res.json()) as { items: any[]; total: number; totalPages: number };
    expect(p1.items.length).toBe(48);
    expect(p1.total).toBeGreaterThanOrEqual(2569);
    expect(p1.totalPages).toBeGreaterThanOrEqual(54);

    // Verify sitemap.xml contains one URL per app
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    const appUrlCount = (sitemapContent.match(/\/app\//g) || []).length;
    expect(appUrlCount).toBe(TOTAL_CATALOG_COUNT);
  });
});
