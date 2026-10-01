/**
 * AppImageHub Feed + GitHub Releases Data Pipeline & SHA-256 Verifier
 *
 * Original implementation for Niruvi Store:
 * 1. Fetches and normalizes `https://appimage.github.io/feed.json` (version 1).
 * 2. Maps desktop categories into the 8 simplified store categories:
 *    Internet, Games, Graphics, Audio/Video, Office, Development, System/Utilities, Education.
 * 3. Enriches GitHub-hosted packages via the GitHub Releases API (`env.GITHUB_TOKEN`),
 *    extracting per-architecture `.AppImage` assets (`x86_64`, `aarch64`, `armhf`),
 *    sizes, publication dates, release notes, and multi-version history.
 * 4. Computes or confirms real SHA-256 digests (`asset.digest`, `.sha256`/`SHA256SUMS` release files,
 *    or bounded Web Crypto SHA-256 stream). Sets `verified = true` ONLY when a real 64-hex SHA-256
 *    digest is confirmed.
 */

import { AppMetadata, Architecture, Category, ReleaseVersionEntry, SimplifiedCategory } from '../types';
import { isGenuineSha256 } from './catalogSchema';

export const APPIMAGEHUB_FEED_URL = 'https://appimage.github.io/feed.json';
export const APPIMAGEHUB_DATABASE_BASE_URL = 'https://appimage.github.io/database';

export const SIMPLIFIED_CATEGORIES: SimplifiedCategory[] = [
  'All',
  'Internet',
  'Games',
  'Graphics',
  'Audio/Video',
  'Office',
  'Development',
  'System/Utilities',
  'Education',
];

export interface RawAppImageHubLink {
  type?: string;
  url?: string;
}

export interface RawAppImageHubAuthor {
  name?: string;
  url?: string;
}

export interface RawAppImageHubItem {
  name?: string;
  description?: string;
  categories?: string[];
  authors?: RawAppImageHubAuthor[];
  license?: string | null;
  links?: RawAppImageHubLink[] | null;
  icons?: string[] | null;
  screenshots?: string[] | null;
}

export interface NormalizedCatalogApp {
  id: string;
  name: string;
  description: string;
  categories: string[];
  category: Exclude<SimplifiedCategory, 'All'>;
  icon: string | null;
  screenshots: string[];
  license: string;
  homepage: string;
  github_repo: string | null;
  download_url: string;
  author_name: string;
  author_url: string;
}

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type?: string;
  digest?: string | null;
  updated_at?: string;
}

export interface GitHubReleaseResponse {
  id: number;
  tag_name: string;
  name?: string | null;
  body?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string | null;
  created_at?: string | null;
  html_url?: string;
  assets?: GitHubReleaseAsset[];
}

/**
 * Maps any FreeDesktop / AppImageHub / legacy Niruvi category name to one of the 8 simplified categories:
 * Internet, Games, Graphics, Audio/Video, Office, Development, System/Utilities, Education.
 */
export function mapToSimplifiedCategory(
  rawCategories?: string | string[] | null
): Exclude<SimplifiedCategory, 'All'> {
  const list = Array.isArray(rawCategories)
    ? rawCategories
    : typeof rawCategories === 'string'
      ? [rawCategories]
      : [];

  for (const raw of list) {
    const c = (raw || '').trim().toLowerCase();
    if (!c) continue;
    if (
      c === 'internet' ||
      c.includes('network') ||
      c.includes('browser') ||
      c.includes('web') ||
      c.includes('communication') ||
      c.includes('chat') ||
      c.includes('email')
    ) {
      return 'Internet';
    }
    if (c.includes('game') || c.includes('arcade') || c.includes('emulator')) {
      return 'Games';
    }
    if (
      c.includes('graphic') ||
      c.includes('photography') ||
      c.includes('design') ||
      c.includes('2d') ||
      c.includes('3d') ||
      c.includes('vector')
    ) {
      return 'Graphics';
    }
    if (
      c.includes('audio') ||
      c.includes('video') ||
      c.includes('music') ||
      c.includes('multimedia') ||
      c.includes('midi') ||
      c.includes('player') ||
      c.includes('recorder')
    ) {
      return 'Audio/Video';
    }
    if (
      c.includes('office') ||
      c.includes('productivity') ||
      c.includes('finance') ||
      c.includes('word') ||
      c.includes('spreadsheet') ||
      c.includes('viewer')
    ) {
      return 'Office';
    }
    if (c.includes('development') || c.includes('ide') || c.includes('programming')) {
      return 'Development';
    }
    if (
      c.includes('education') ||
      c.includes('science') ||
      c.includes('math') ||
      c.includes('astronomy')
    ) {
      return 'Education';
    }
    if (
      c.includes('system') ||
      c.includes('utility') ||
      c.includes('utilities') ||
      c.includes('security') ||
      c.includes('settings') ||
      c.includes('file') ||
      c.includes('ai')
    ) {
      return 'System/Utilities';
    }
  }

  return 'System/Utilities';
}

/**
 * Normalizes a slug into a URL-safe, lowercase Niruvi application ID.
 */
export function normalizeAppId(rawName: string): string {
  return rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Extracts `owner/repo` from a GitHub link or URL.
 */
export function extractGitHubRepoSlug(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Direct owner/repo format used in AppImageHub links (e.g. "stoicsoft/1devtool-releases")
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    return trimmed.replace(/\.git$/i, '');
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') {
      return null;
    }
    const parts = parsed.pathname
      .replace(/^\/+|\/+$/g, '')
      .replace(/\.git$/i, '')
      .split('/');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0]}/${parts[1]}`;
    }
  } catch {
    return null;
  }

  return null;
}

function resolveAppImageHubAssetUrl(relativePath?: string | null): string | null {
  if (!relativePath || typeof relativePath !== 'string') return null;
  const trimmed = relativePath.trim();
  if (!trimmed) return null;
  const rawUrl = /^https?:\/\//i.test(trimmed)
    ? trimmed.replace(/^http:\/\//i, 'https://')
    : `${APPIMAGEHUB_DATABASE_BASE_URL}/${trimmed.replace(/^\/+/, '')}`;
  try {
    const parsed = new URL(encodeURI(rawUrl));
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function stripHtmlTags(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes a single AppImageHub `feed.json` entry into the canonical Niruvi schema.
 * Returns `null` if the entry lacks a valid name.
 */
export function normalizeAppImageHubItem(
  raw: RawAppImageHubItem,
  disambiguationSuffix?: string
): NormalizedCatalogApp | null {
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) {
    return null;
  }

  const baseId = normalizeAppId(raw.name);
  if (!baseId) return null;
  const id = disambiguationSuffix ? `${baseId}-${disambiguationSuffix}`.slice(0, 64) : baseId;

  const cleanName = raw.name.replace(/_/g, ' ').trim();
  const cleanDescription = stripHtmlTags(raw.description);

  const rawCategories = Array.isArray(raw.categories)
    ? raw.categories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : [];
  const simplifiedCategory = mapToSimplifiedCategory(rawCategories);

  const links = Array.isArray(raw.links) ? raw.links : [];
  let githubRepo: string | null = null;
  let downloadUrl = '';
  let homepage = '';

  for (const link of links) {
    if (!link || typeof link.url !== 'string') continue;
    const type = typeof link.type === 'string' ? link.type.toLowerCase() : '';
    if (type === 'github' && !githubRepo) {
      githubRepo = extractGitHubRepoSlug(link.url);
    } else if (type === 'download' && !downloadUrl) {
      downloadUrl = link.url.trim();
      if (!githubRepo) {
        githubRepo = extractGitHubRepoSlug(link.url);
      }
    } else if (!homepage && /^https?:\/\//i.test(link.url)) {
      homepage = link.url.trim().replace(/^http:\/\//i, 'https://');
    }
  }

  if (!githubRepo && downloadUrl) {
    githubRepo = extractGitHubRepoSlug(downloadUrl);
  }

  const repoUrl = githubRepo ? `https://github.com/${githubRepo}` : '';
  const appImageHubPageUrl = `https://appimage.github.io/${encodeURIComponent(raw.name.trim())}/`;

  if (!homepage) {
    homepage = repoUrl || (downloadUrl.startsWith('https://') ? downloadUrl : appImageHubPageUrl);
  }
  if (!downloadUrl) {
    downloadUrl = repoUrl ? `${repoUrl}/releases` : appImageHubPageUrl;
  } else if (!downloadUrl.startsWith('https://')) {
    downloadUrl = downloadUrl.replace(/^http:\/\//i, 'https://');
  }
  try {
    const u = new URL(downloadUrl);
    if (u.protocol !== 'https:' || u.hostname === 'example.com') {
      downloadUrl = repoUrl ? `${repoUrl}/releases` : appImageHubPageUrl;
    }
  } catch {
    downloadUrl = repoUrl ? `${repoUrl}/releases` : appImageHubPageUrl;
  }

  const icon =
    Array.isArray(raw.icons) && raw.icons.length > 0
      ? resolveAppImageHubAssetUrl(raw.icons[0])
      : null;

  const screenshots = Array.isArray(raw.screenshots)
    ? raw.screenshots
        .map((s) => resolveAppImageHubAssetUrl(s))
        .filter((s): s is string => Boolean(s))
    : [];

  const firstAuthor = Array.isArray(raw.authors) && raw.authors[0] ? raw.authors[0] : undefined;
  const rawAuthorName =
    firstAuthor?.name !== undefined && firstAuthor?.name !== null
      ? String(firstAuthor.name).trim()
      : '';
  const rawAuthorUrl =
    typeof firstAuthor?.url === 'string' ? firstAuthor.url.trim() : '';
  const authorName =
    rawAuthorName || (githubRepo ? githubRepo.split('/')[0] : cleanName);
  const authorUrl =
    rawAuthorUrl ||
    (githubRepo ? `https://github.com/${githubRepo.split('/')[0]}` : homepage);

  return {
    id,
    name: cleanName,
    description: cleanDescription,
    categories: rawCategories.length > 0 ? rawCategories : [simplifiedCategory],
    category: simplifiedCategory,
    icon,
    screenshots,
    license:
      raw.license && typeof raw.license === 'string' && raw.license.trim()
        ? raw.license.trim()
        : '',
    homepage,
    github_repo: githubRepo,
    download_url: downloadUrl,
    author_name: authorName,
    author_url: authorUrl,
  };
}

/**
 * Normalizes an entire AppImageHub `feed.json` items array, guaranteeing that every
 * single entry receives a unique `id` (disambiguating case/punctuation collisions).
 */
export function normalizeAllAppImageHubItems(
  rawItems: RawAppImageHubItem[]
): NormalizedCatalogApp[] {
  const results: NormalizedCatalogApp[] = [];
  const seenIds = new Set<string>();

  for (let idx = 0; idx < rawItems.length; idx++) {
    const raw = rawItems[idx];
    const initial = normalizeAppImageHubItem(raw);
    if (!initial) continue;

    let finalApp = initial;
    if (seenIds.has(finalApp.id)) {
      const authorSlug = normalizeAppId(finalApp.author_name || '');
      const candidateWithAuthor =
        authorSlug && authorSlug !== finalApp.id
          ? `${finalApp.id}-${authorSlug}`.slice(0, 64)
          : `${finalApp.id}-${idx + 1}`.slice(0, 64);
      finalApp = {
        ...finalApp,
        id: seenIds.has(candidateWithAuthor) ? `${finalApp.id}-${idx + 1}` : candidateWithAuthor,
      };
    }

    seenIds.add(finalApp.id);
    results.push(finalApp);
  }

  return results;
}

/**
 * Parses the GitHub API `Link` response header (`<https://api.github.com/...>; rel="next"`)
 * and returns the next page URL if present.
 */
export function parseGitHubNextPageUrl(linkHeader?: string | null): string | null {
  if (!linkHeader || typeof linkHeader !== 'string') return null;
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Infers target Linux CPU architecture (`x86_64`, `aarch64`, `armhf`) from an `.AppImage` filename.
 */
export function inferArchitectureFromFilename(filename: string): Architecture {
  const lower = filename.toLowerCase();
  if (lower.includes('aarch64') || lower.includes('arm64')) {
    return 'aarch64';
  }
  if (lower.includes('armhf') || lower.includes('armv7') || lower.includes('arm-linux')) {
    return 'armhf';
  }
  return 'x86_64';
}

/**
 * Formats byte size into human-readable MB/KB string.
 */
export function formatByteSize(bytes?: number | null): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) {
    return 'Unknown size';
  }
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Parses a `.sha256` or `SHA256SUMS` text file to find the 64-character hex digest
 * matching the target asset filename (or a single standalone 64-hex hash).
 */
export function parseSha256ChecksumText(text: string, targetAssetName?: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (targetAssetName) {
    const lowerTarget = targetAssetName.toLowerCase();
    for (const line of lines) {
      if (line.toLowerCase().includes(lowerTarget)) {
        const match = line.match(/\b([a-fA-F0-9]{64})\b/);
        if (match && isGenuineSha256(match[1])) {
          return match[1].toLowerCase();
        }
      }
    }
  }

  // If the file is a single-hash `.sha256` sidecar file
  if (lines.length === 1) {
    const match = lines[0].match(/\b([a-fA-F0-9]{64})\b/);
    if (match && isGenuineSha256(match[1])) {
      return match[1].toLowerCase();
    }
  }

  return null;
}

/**
 * Computes SHA-256 using Web Crypto (`crypto.subtle.digest('SHA-256', ...)`) for an ArrayBuffer.
 */
export async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = new Uint8Array(hashBuffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Resolves a verified SHA-256 checksum for a GitHub Release asset:
 * 1. Checks GitHub's native `asset.digest` field (`sha256:<64-hex>`).
 * 2. Checks for published checksum sidecar assets in the same release (`.sha256`, `SHA256SUMS`, `sha256sum.txt`).
 * 3. Returns `''` if no authentic checksum could be confirmed (never fabricates a hash).
 */
export async function resolveReleaseAssetSha256(
  asset: GitHubReleaseAsset,
  allAssets: GitHubReleaseAsset[],
  fetchImpl: typeof fetch = fetch
): Promise<{ sha256: string; verified: boolean }> {
  // 1. Native GitHub release asset digest (e.g. "sha256:e3b0c442...")
  if (typeof asset.digest === 'string' && asset.digest.toLowerCase().startsWith('sha256:')) {
    const candidate = asset.digest.slice('sha256:'.length).trim().toLowerCase();
    if (isGenuineSha256(candidate)) {
      return { sha256: candidate, verified: true };
    }
  }

  // 2. Check published checksum sidecar files in the release
  const checksumSidecars = allAssets.filter((a) => {
    const lower = a.name.toLowerCase();
    return (
      lower === `${asset.name.toLowerCase()}.sha256` ||
      lower === `${asset.name.toLowerCase()}.sha256sum` ||
      lower.includes('sha256sums') ||
      lower.includes('sha256sum') ||
      lower.endsWith('.sha256')
    );
  });

  for (const sidecar of checksumSidecars.slice(0, 2)) {
    if (sidecar.size > 256 * 1024) continue; // Only fetch text checksum files <= 256 KB
    try {
      const res = await fetchImpl(sidecar.browser_download_url, {
        headers: { 'User-Agent': 'NiruviStore-CatalogBot/1.0' },
      });
      if (res.ok) {
        const text = await res.text();
        const parsed = parseSha256ChecksumText(text, asset.name);
        if (parsed && isGenuineSha256(parsed)) {
          return { sha256: parsed, verified: true };
        }
      }
    } catch {
      // Ignore sidecar network error and continue
    }
  }

  return { sha256: '', verified: false };
}

/**
 * Normalizes an array of GitHub Releases for a repository into version history + latest release metadata.
 */
export async function extractVersionHistoryFromReleases(
  releases: GitHubReleaseResponse[],
  fetchImpl: typeof fetch = fetch
): Promise<{
  latestVersion: string;
  latestReleaseDate: string;
  latestSize: string;
  latestReleaseNotes: string;
  architectures: Architecture[];
  downloadMap: Record<string, string>;
  primaryDownloadUrl: string;
  sha256: string;
  verified: boolean;
  versionHistory: ReleaseVersionEntry[];
} | null> {
  if (!Array.isArray(releases) || releases.length === 0) return null;

  const versionHistory: ReleaseVersionEntry[] = [];

  for (const rel of releases) {
    if (!rel || rel.draft) continue;
    const assets = Array.isArray(rel.assets) ? rel.assets : [];
    const appImageAssets = assets.filter(
      (a) =>
        typeof a.name === 'string' &&
        /\.appimage$/i.test(a.name.trim()) &&
        typeof a.browser_download_url === 'string' &&
        a.browser_download_url.startsWith('https://')
    );

    if (appImageAssets.length === 0) continue;

    const mappedAssets: ReleaseVersionEntry['assets'] = [];
    for (const asset of appImageAssets) {
      const arch = inferArchitectureFromFilename(asset.name);
      // Resolve SHA-256 for the latest release's assets or when native digest is present
      const shouldResolveSidecar = versionHistory.length === 0;
      const resolved = shouldResolveSidecar
        ? await resolveReleaseAssetSha256(asset, assets, fetchImpl)
        : asset.digest?.toLowerCase().startsWith('sha256:')
          ? {
              sha256: asset.digest.slice(7).toLowerCase(),
              verified: isGenuineSha256(asset.digest.slice(7)),
            }
          : { sha256: '', verified: false };

      mappedAssets.push({
        name: asset.name,
        architecture: arch,
        downloadUrl: asset.browser_download_url,
        size: formatByteSize(asset.size),
        sizeBytes: asset.size,
        sha256: resolved.sha256,
        verified: resolved.verified,
      });
    }

    const rawVersion = (rel.tag_name || rel.name || 'latest').replace(/^v/i, '').trim() || 'latest';
    const releaseDate = (rel.published_at || rel.created_at || new Date().toISOString()).slice(
      0,
      10
    );

    versionHistory.push({
      version: rawVersion,
      tagName: rel.tag_name || rawVersion,
      releaseDate,
      releaseNotes: (rel.body || '').trim().slice(0, 2000),
      htmlUrl: rel.html_url,
      prerelease: Boolean(rel.prerelease),
      assets: mappedAssets,
    });
  }

  if (versionHistory.length === 0) return null;

  const latest =
    versionHistory.find((v) => !v.prerelease) || versionHistory[0];
  const downloadMap: Record<string, string> = {};
  const archSet = new Set<Architecture>();

  for (const asset of latest.assets) {
    archSet.add(asset.architecture);
    if (!downloadMap[asset.architecture]) {
      downloadMap[asset.architecture] = asset.downloadUrl;
    }
  }

  const primaryAsset =
    latest.assets.find((a) => a.architecture === 'x86_64') || latest.assets[0];

  return {
    latestVersion: latest.version,
    latestReleaseDate: latest.releaseDate,
    latestSize: primaryAsset.size,
    latestReleaseNotes: latest.releaseNotes || `Release ${latest.tagName}`,
    architectures: Array.from(archSet),
    downloadMap,
    primaryDownloadUrl: primaryAsset.downloadUrl,
    sha256: primaryAsset.sha256 || '',
    verified: Boolean(primaryAsset.verified && isGenuineSha256(primaryAsset.sha256)),
    versionHistory,
  };
}

/**
 * Converts a NormalizedCatalogApp (plus optional GitHub Release enrichment) into `AppMetadata`.
 * Strictly enforces: `publisher.verified` is `true` ONLY when a genuine 64-hex SHA-256 is present.
 */
export function buildAppMetadataFromNormalized(
  normalized: NormalizedCatalogApp,
  releaseInfo?: Awaited<ReturnType<typeof extractVersionHistoryFromReleases>> | null
): AppMetadata {
  const hasConfirmedSha = Boolean(
    releaseInfo?.verified && releaseInfo.sha256 && isGenuineSha256(releaseInfo.sha256)
  );
  const sha256 = hasConfirmedSha ? releaseInfo!.sha256 : '';

  const licenseStr = normalized.license || '';
  const licenseCategory: AppMetadata['licenseCategory'] =
    /mit|apache|bsd|isc|zlib|unlicense/i.test(licenseStr)
      ? 'Permissive'
      : /proprietary|commercial|custom/i.test(licenseStr)
        ? 'Proprietary'
        : 'Open Source';

  const repoUrl = normalized.github_repo
    ? `https://github.com/${normalized.github_repo}`
    : '';

  return {
    id: normalized.id,
    name: normalized.name,
    tagline:
      normalized.description.length > 110
        ? `${normalized.description.slice(0, 107)}...`
        : normalized.description,
    description: normalized.description,
    category: normalized.category as unknown as Exclude<Category, 'All'>,
    simplifiedCategory: normalized.category,
    version: releaseInfo?.latestVersion || 'latest',
    releaseDate: releaseInfo?.latestReleaseDate || '',
    size: releaseInfo?.latestSize || '',
    architectures:
      releaseInfo && releaseInfo.architectures.length > 0
        ? releaseInfo.architectures
        : ['x86_64'],
    formats: ['AppImage'],
    license: licenseStr,
    licenseCategory,
    publisher: {
      name: normalized.author_name,
      website: normalized.homepage || normalized.author_url,
      verified: hasConfirmedSha,
      github: repoUrl || undefined,
    },
    sha256,
    downloadUrl: releaseInfo?.primaryDownloadUrl || normalized.download_url,
    downloadMap: releaseInfo?.downloadMap || { x86_64: normalized.download_url },
    iconSlug: normalized.id,
    icon: normalized.icon || undefined,
    homepageUrl: normalized.homepage,
    sourceUrl: repoUrl || normalized.homepage,
    repositoryUrl: repoUrl || undefined,
    releasesUrl: repoUrl ? `${repoUrl}/releases` : normalized.download_url,
    githubRepo: normalized.github_repo || undefined,
    sourceType: normalized.github_repo ? 'Official' : 'Community',
    trustTier: hasConfirmedSha ? 'Official Developer' : 'Unverified Community',
    officialStatus: hasConfirmedSha,
    tags: normalized.categories.map((c) => c.toLowerCase()),
    featured: false,
    downloadsCount: 0,
    rating: 0,
    changelog: releaseInfo?.latestReleaseNotes
      ? [releaseInfo.latestReleaseNotes]
      : undefined,
    versionHistory: releaseInfo?.versionHistory || [],
    screenshots: normalized.screenshots.slice(0, 4).map((url, idx) => ({
      url,
      alt: `${normalized.name} screenshot ${idx + 1}`,
    })),
  };
}
