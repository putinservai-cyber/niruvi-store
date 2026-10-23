// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchAppReviews,
  upsertAppReview,
  deleteAppReview,
  recordAppDownload,
  getLibraryNotificationPrefs,
  setLibraryUpdateNotification,
} from '../src/lib/cloudflare-db';
import {
  isValidHttpsDownloadUrl,
  isValidNiruviProtocolUrl,
  isGenuineSha256,
  isAllowedSubmissionHost,
} from '../src/utils/catalogSchema';

describe('Cloudflare D1 Database — Migrations and Schema Definition', () => {
  it('defines submissions, broken_reports, and app_reviews tables in worker migrations', () => {
    const workerMigrationPath = path.join(process.cwd(), 'worker', 'migrations', '0001_submissions.sql');
    expect(fs.existsSync(workerMigrationPath)).toBe(true);
    const sql = fs.readFileSync(workerMigrationPath, 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS submissions');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS broken_reports');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS app_reviews');
    expect(sql).toContain('status TEXT NOT NULL DEFAULT \'published\'');
  });

  it('defines catalog pipeline tables and review indexes in root D1 migrations', () => {
    const rootMigrationPath = path.join(process.cwd(), 'migrations', '0001_catalog_pipeline.sql');
    expect(fs.existsSync(rootMigrationPath)).toBe(true);
    const sql = fs.readFileSync(rootMigrationPath, 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS catalog_apps');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS catalog_versions');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS app_reviews');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_app_reviews_slug');
  });
});

describe('Cloudflare D1 Reviews & User Library Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('creates and retrieves reviews with 1–5 star ratings', async () => {
    const review = await upsertAppReview({
      appSlug: 'gimp',
      rating: 5,
      title: 'Essential for photo editing',
      body: 'Reliable build, launches instantly on Debian 12.',
      distro: 'Debian 12',
      displayName: 'LinuxArtist',
      username: 'linuxartist',
    });

    expect(review.id).toBeTruthy();
    expect(review.rating).toBe(5);
    expect(review.appSlug).toBe('gimp');

    const reviews = await fetchAppReviews('gimp');
    expect(reviews.length).toBeGreaterThanOrEqual(1);
    expect(reviews.some((r) => r.id === review.id)).toBe(true);
  });

  it('deletes an existing review smoothly', async () => {
    const review = await upsertAppReview({
      appSlug: 'kdenlive',
      rating: 4,
      title: 'Solid video editor',
      body: 'Renders quickly with hardware acceleration.',
      distro: 'Arch Linux',
    });

    await deleteAppReview(review.id);
    const remaining = await fetchAppReviews('kdenlive');
    expect(remaining.find((r) => r.id === review.id)).toBeUndefined();
  });

  it('stores and retrieves library update notification preferences locally', async () => {
    expect(getLibraryNotificationPrefs().vscodium).toBeUndefined();
    await setLibraryUpdateNotification('vscodium', false);
    expect(getLibraryNotificationPrefs().vscodium).toBe(false);
    await setLibraryUpdateNotification('vscodium', true);
    expect(getLibraryNotificationPrefs().vscodium).toBe(true);
  });

  it('records download metrics without errors', async () => {
    await expect(
      recordAppDownload({
        appSlug: 'vscodium',
        version: '1.98.0',
        arch: 'x86_64',
      })
    ).resolves.not.toThrow();
  });
});

describe('Release Security & Catalog Validation Rules', () => {
  it('validates HTTPS download URLs and rejects insecure protocols', () => {
    expect(isValidHttpsDownloadUrl('https://github.com/org/repo/releases/download/v1.0/app.AppImage')).toBe(true);
    expect(isValidHttpsDownloadUrl('http://insecure.site/app.AppImage')).toBe(false);
    expect(isValidHttpsDownloadUrl('javascript:alert(1)')).toBe(false);
  });

  it('validates niruvi:// protocol URLs', () => {
    expect(isValidNiruviProtocolUrl('niruvi://install?id=vscodium&name=VSCodium&url=https%3A%2F%2Fgithub.com%2Fvscodium.AppImage&sha256=abc')).toBe(true);
    expect(isValidNiruviProtocolUrl('niruvi://install?id=bad&url=javascript%3Aevil()')).toBe(false);
  });

  it('enforces genuine SHA-256 hex strings', () => {
    expect(isGenuineSha256('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')).toBe(true);
    expect(isGenuineSha256('not-a-sha256')).toBe(false);
    expect(isGenuineSha256('e3b0c442')).toBe(false);
  });

  it('restricts submissions to allowed software release hosts', () => {
    expect(isAllowedSubmissionHost('https://github.com/owner/repo/releases/download/v1.0/app.AppImage')).toBe(true);
    expect(isAllowedSubmissionHost('https://gitlab.com/owner/repo/-/releases/app.AppImage')).toBe(true);
    expect(isAllowedSubmissionHost('https://evil-untrusted-malware-site.com/app.AppImage')).toBe(false);
  });
});
