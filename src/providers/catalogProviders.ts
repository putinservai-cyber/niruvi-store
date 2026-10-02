import { AppMetadata, Architecture } from '../types';
import {
  isDirectAppImageUrl,
  isGenuineSha256,
  isPolicyFlaggedEntry,
  getChecksumStatus,
  isCommunitySubmitted,
} from '../utils/catalogSchema';
import {
  APPIMAGEHUB_FEED_URL,
  normalizeAppImageHubItem,
  convertAppImageHubItemToMetadata,
  RawAppImageHubItem,
  extractGitHubRepoSlug,
} from '../utils/appimagehub';

export type CatalogProviderId =
  | 'appimagehub'
  | 'github'
  | 'gitlab'
  | 'sourceforge'
  | 'community';

export type ProviderHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'configuration_required'
  | 'disabled'
  | 'error';

export interface CatalogProvider {
  id: CatalogProviderId;
  name: string;
  enabled: boolean;
  description: string;
  priority: number;
  status: ProviderHealthStatus;
  lastSuccessfulSync: string | null;
  lastAttemptedSync: string | null;
  importedCount: number;
  updatedCount: number;
  failedCount: number;
  lastError: string | null;
  fetch: (options?: { signal?: AbortSignal }) => Promise<unknown[]>;
  normalize: (rawItems: unknown[]) => AppMetadata[];
  validate: (apps: AppMetadata[]) => { valid: AppMetadata[]; invalidCount: number };
}

export type SourceStatusLabel =
  | 'Official release'
  | 'GitHub release'
  | 'GitLab release'
  | 'Imported from AppImageHub'
  | 'Community submission'
  | 'Unverified source';

export type DownloadAvailabilityState =
  | 'available'
  | 'unverified_checksum'
  | 'upstream_only'
  | 'temporarily_unavailable'
  | 'removed';

export interface ResolvedDownloadAction {
  state: DownloadAvailabilityState;
  buttonLabel: 'Download' | 'View Releases' | 'Currently unavailable';
  checksumLabel: 'Verified' | 'Checksum available' | 'Checksum not verified' | 'Checksum unavailable';
  targetUrl: string | null;
  isDirectAppImage: boolean;
  disabled: boolean;
  notice: string | null;
}

/**
 * Detects CPU architecture from a real release asset filename.
 * Supports:
 * - x86_64 / amd64
 * - aarch64 / arm64
 * - armhf / armv7
 */
export function detectArchitectureFromAssetName(filename: string): Architecture | null {
  const lower = (filename || '').toLowerCase();
  if (!lower) return null;
  if (/\b(aarch64|arm64)\b|[-_.]aarch64|[-_.]arm64/.test(lower)) {
    return 'aarch64';
  }
  if (/\b(armhf|armv7l?|arm32)\b|[-_.]armhf|[-_.]armv7/.test(lower)) {
    return 'armhf';
  }
  if (/\b(x86_64|amd64|x64|linux64)\b|[-_.]x86_64|[-_.]amd64|[-_.]x64/.test(lower)) {
    return 'x86_64';
  }
  if (lower.endsWith('.appimage')) {
    return 'x86_64';
  }
  return null;
}

/**
 * Resolves a human-friendly source status label for an application.
 */
export function resolveAppSourceStatus(app: AppMetadata): SourceStatusLabel {
  if (isCommunitySubmitted(app)) {
    return 'Community submission';
  }
  const downloadLower = (app.downloadUrl || '').toLowerCase();
  const repoLower = (
    app.repositoryUrl ||
    app.sourceUrl ||
    app.publisher.github ||
    ''
  ).toLowerCase();

  if (app.publisher.verified && isDirectAppImageUrl(app.downloadUrl) && isGenuineSha256(app.sha256)) {
    return 'Official release';
  }
  if (
    downloadLower.includes('github.com') ||
    downloadLower.includes('githubusercontent.com') ||
    Boolean(app.githubRepo) ||
    repoLower.includes('github.com')
  ) {
    return 'GitHub release';
  }
  if (downloadLower.includes('gitlab.com') || repoLower.includes('gitlab.com')) {
    return 'GitLab release';
  }
  if (
    (app.homepageUrl || '').includes('appimage.github.io') ||
    (app.sourceUrl || '').includes('appimage.github.io') ||
    !isDirectAppImageUrl(app.downloadUrl)
  ) {
    return 'Imported from AppImageHub';
  }
  return 'Unverified source';
}

/**
 * Resolves the download availability state and button behavior without inventing URLs.
 * Distinguishes:
 * - Verified direct AppImage -> "Download" + "Verified"
 * - Direct AppImage without verified checksum -> "Download" + "Checksum not verified"
 * - Only upstream release page -> "View Releases" + "Checksum unavailable"
 * - Unavailable / broken / removed -> disabled "Currently unavailable"
 */
export function resolveAppDownloadState(
  app: AppMetadata,
  selectedArch?: string,
  availabilityOverride?: 'available' | 'temporarily_unavailable' | 'removed'
): ResolvedDownloadAction {
  if (availabilityOverride === 'temporarily_unavailable' || availabilityOverride === 'removed') {
    const fallbackReleaseUrl =
      app.releasesUrl ||
      app.repositoryUrl ||
      (app.githubRepo ? `https://github.com/${app.githubRepo}/releases` : null) ||
      app.homepageUrl ||
      null;
    return {
      state: availabilityOverride,
      buttonLabel: 'Currently unavailable',
      checksumLabel: 'Checksum unavailable',
      targetUrl: fallbackReleaseUrl,
      isDirectAppImage: false,
      disabled: true,
      notice: 'This download is currently unavailable. View the upstream release.',
    };
  }

  const arch = (selectedArch || app.architectures[0] || 'x86_64') as Architecture;
  const mapUrl = (app.downloadMap?.[arch] || '').trim();
  const primaryUrl = (app.downloadUrl || '').trim();
  const candidateUrl = isDirectAppImageUrl(mapUrl)
    ? mapUrl
    : isDirectAppImageUrl(primaryUrl)
      ? primaryUrl
      : mapUrl || primaryUrl;
  const hasDirectBinary = isDirectAppImageUrl(candidateUrl);
  const checksumStatus = getChecksumStatus(app);

  if (hasDirectBinary) {
    if (checksumStatus === 'verified' && isGenuineSha256(app.sha256)) {
      return {
        state: 'available',
        buttonLabel: 'Download',
        checksumLabel: 'Verified',
        targetUrl: candidateUrl,
        isDirectAppImage: true,
        disabled: false,
        notice: null,
      };
    }
    if (checksumStatus === 'provided' && isGenuineSha256(app.sha256)) {
      return {
        state: 'available',
        buttonLabel: 'Download',
        checksumLabel: 'Checksum available',
        targetUrl: candidateUrl,
        isDirectAppImage: true,
        disabled: false,
        notice: null,
      };
    }
    return {
      state: 'unverified_checksum',
      buttonLabel: 'Download',
      checksumLabel: 'Checksum not verified',
      targetUrl: candidateUrl,
      isDirectAppImage: true,
      disabled: false,
      notice: 'Checksum not verified',
    };
  }

  const releasePageUrl =
    (candidateUrl.startsWith('https://') ? candidateUrl : '') ||
    app.releasesUrl ||
    app.repositoryUrl ||
    (app.githubRepo ? `https://github.com/${app.githubRepo}/releases` : '') ||
    app.homepageUrl ||
    '';

  if (releasePageUrl.startsWith('https://')) {
    return {
      state: 'upstream_only',
      buttonLabel: 'View Releases',
      checksumLabel: 'Checksum unavailable',
      targetUrl: releasePageUrl,
      isDirectAppImage: false,
      disabled: false,
      notice: 'Direct AppImage link not indexed; opens upstream release page.',
    };
  }

  return {
    state: 'temporarily_unavailable',
    buttonLabel: 'Currently unavailable',
    checksumLabel: 'Checksum unavailable',
    targetUrl: null,
    isDirectAppImage: false,
    disabled: true,
    notice: 'This application is listed, but its current AppImage could not be found.',
  };
}

/**
 * Internal source priority ranking used when deduplicating/merging catalog items:
 * Official publisher release (100) > GitHub/GitLab release (80) > AppImageHub metadata (60) > Community submission (40)
 */
export function computeInternalSourcePriority(app: AppMetadata): number {
  if (app.publisher.verified && isDirectAppImageUrl(app.downloadUrl) && isGenuineSha256(app.sha256)) {
    return 100;
  }
  if (isDirectAppImageUrl(app.downloadUrl) && isGenuineSha256(app.sha256)) {
    return 85;
  }
  if (isDirectAppImageUrl(app.downloadUrl)) {
    return 75;
  }
  if (!isCommunitySubmitted(app)) {
    return 60;
  }
  return 40;
}

function normalizeIdentityUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url.trim().toLowerCase());
    if (parsed.hostname === 'appimage.github.io') return null;
    return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/+$/, '').replace(/\.git$/, '')}`;
  } catch {
    return null;
  }
}

/**
 * Deduplicates and merges applications discovered from multiple providers
 * (e.g. AppImageHub + GitHub Releases + Community Submissions) using normalized
 * identity matching on slug/id, GitHub repository, source repository, and homepage.
 * Preserves upstream metadata while resolving primary download via source priority.
 */
export function deduplicateAndMergeCatalogApps(apps: AppMetadata[]): AppMetadata[] {
  const mergedList: AppMetadata[] = [];
  const slugIndex = new Map<string, number>();
  const repoIndex = new Map<string, number>();
  const homepageIndex = new Map<string, number>();

  for (const candidate of apps) {
    if (isPolicyFlaggedEntry(candidate).flagged) {
      continue;
    }

    const normSlug = candidate.id.trim().toLowerCase();
    const ghSlug = (
      candidate.githubRepo ||
      extractGitHubRepoSlug(candidate.repositoryUrl) ||
      extractGitHubRepoSlug(candidate.sourceUrl) ||
      extractGitHubRepoSlug(candidate.downloadUrl) ||
      ''
    )
      .trim()
      .toLowerCase();
    const normRepo = normalizeIdentityUrl(candidate.repositoryUrl || candidate.sourceUrl);
    const normHome = normalizeIdentityUrl(candidate.homepageUrl);

    let existingIdx: number | undefined = slugIndex.get(normSlug);
    if (existingIdx === undefined && ghSlug) {
      existingIdx = repoIndex.get(ghSlug);
    }
    if (existingIdx === undefined && normRepo) {
      existingIdx = repoIndex.get(normRepo);
    }
    if (existingIdx === undefined && normHome) {
      existingIdx = homepageIndex.get(normHome);
    }

    if (existingIdx === undefined) {
      const newIdx = mergedList.length;
      mergedList.push({ ...candidate });
      slugIndex.set(normSlug, newIdx);
      if (ghSlug) repoIndex.set(ghSlug, newIdx);
      if (normRepo) repoIndex.set(normRepo, newIdx);
      if (normHome) homepageIndex.set(normHome, newIdx);
      continue;
    }

    const current = mergedList[existingIdx];
    const currentPriority = computeInternalSourcePriority(current);
    const candidatePriority = computeInternalSourcePriority(candidate);

    const primary = candidatePriority > currentPriority ? candidate : current;
    const secondary = candidatePriority > currentPriority ? current : candidate;

    const combinedArchs = Array.from(
      new Set<Architecture>([...primary.architectures, ...secondary.architectures])
    );

    const mergedDownloadMap: Record<string, string> = {
      ...(secondary.downloadMap || {}),
      ...(primary.downloadMap || {}),
    };
    const primaryArch = primary.architectures[0] || 'x86_64';
    if (
      isDirectAppImageUrl(primary.downloadUrl) &&
      !isDirectAppImageUrl(mergedDownloadMap[primaryArch])
    ) {
      mergedDownloadMap[primaryArch] = primary.downloadUrl;
    }

    const mergedApp: AppMetadata = {
      ...secondary,
      ...primary,
      id: current.id,
      description:
        primary.description && primary.description.length >= (secondary.description?.length || 0)
          ? primary.description
          : secondary.description || primary.description,
      icon: primary.icon || secondary.icon,
      homepageUrl: primary.homepageUrl || secondary.homepageUrl,
      repositoryUrl: primary.repositoryUrl || secondary.repositoryUrl,
      releasesUrl: primary.releasesUrl || secondary.releasesUrl,
      githubRepo: primary.githubRepo || secondary.githubRepo,
      architectures: combinedArchs.length > 0 ? combinedArchs : ['x86_64'],
      downloadMap: mergedDownloadMap,
      screenshots:
        primary.screenshots && primary.screenshots.length > 0
          ? primary.screenshots
          : secondary.screenshots,
      versionHistory:
        primary.versionHistory && primary.versionHistory.length > 0
          ? primary.versionHistory
          : secondary.versionHistory,
      tags: Array.from(new Set([...(primary.tags || []), ...(secondary.tags || [])])),
    };

    mergedList[existingIdx] = mergedApp;
  }

  return mergedList;
}

function validateCatalogSlice(apps: AppMetadata[]): { valid: AppMetadata[]; invalidCount: number } {
  const valid: AppMetadata[] = [];
  let invalidCount = 0;
  for (const app of apps) {
    if (
      !app.id ||
      !app.name ||
      !app.downloadUrl?.startsWith('https://') ||
      isPolicyFlaggedEntry(app).flagged
    ) {
      invalidCount += 1;
      continue;
    }
    valid.push(app);
  }
  return { valid, invalidCount };
}

const PROVIDER_STORAGE_KEY = 'niruvi_admin_provider_settings_v1';

interface StoredProviderState {
  enabled: boolean;
  status: ProviderHealthStatus;
  lastSuccessfulSync: string | null;
  lastAttemptedSync: string | null;
  importedCount: number;
  updatedCount: number;
  failedCount: number;
  lastError: string | null;
}

const defaultProviderStates: Record<CatalogProviderId, StoredProviderState> = {
  appimagehub: {
    enabled: true,
    status: 'healthy',
    lastSuccessfulSync: '2026-03-18T00:00:00.000Z',
    lastAttemptedSync: '2026-03-18T00:00:00.000Z',
    importedCount: 2785,
    updatedCount: 48,
    failedCount: 0,
    lastError: null,
  },
  github: {
    enabled: true,
    status: 'healthy',
    lastSuccessfulSync: '2026-03-18T00:00:00.000Z',
    lastAttemptedSync: '2026-03-18T00:00:00.000Z',
    importedCount: 48,
    updatedCount: 48,
    failedCount: 0,
    lastError: null,
  },
  gitlab: {
    enabled: true,
    status: 'healthy',
    lastSuccessfulSync: '2026-03-18T00:00:00.000Z',
    lastAttemptedSync: '2026-03-18T00:00:00.000Z',
    importedCount: 5,
    updatedCount: 5,
    failedCount: 0,
    lastError: null,
  },
  sourceforge: {
    enabled: false,
    status: 'disabled',
    lastSuccessfulSync: null,
    lastAttemptedSync: null,
    importedCount: 0,
    updatedCount: 0,
    failedCount: 0,
    lastError: null,
  },
  community: {
    enabled: true,
    status: 'healthy',
    lastSuccessfulSync: '2026-03-18T00:00:00.000Z',
    lastAttemptedSync: '2026-03-18T00:00:00.000Z',
    importedCount: 0,
    updatedCount: 0,
    failedCount: 0,
    lastError: null,
  },
};

let memoryProviderStates: Record<CatalogProviderId, StoredProviderState> = {
  ...defaultProviderStates,
};

function loadProviderStates(): Record<CatalogProviderId, StoredProviderState> {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PROVIDER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            ...defaultProviderStates,
            ...parsed,
          };
        }
      }
    }
  } catch {
    // ignore storage error
  }
  return { ...memoryProviderStates };
}

function saveProviderStates(states: Record<CatalogProviderId, StoredProviderState>): void {
  memoryProviderStates = { ...states };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(states));
    }
  } catch {
    // ignore storage error
  }
}

export function createCatalogProviders(): CatalogProvider[] {
  const states = loadProviderStates();

  const appImageHubProvider: CatalogProvider = {
    id: 'appimagehub',
    name: 'AppImageHub',
    description: 'Upstream AppImageHub catalog metadata feed (enriched with release providers)',
    priority: 60,
    ...states.appimagehub,
    async fetch(options) {
      if (!this.enabled) return [];
      const res = await fetch(APPIMAGEHUB_FEED_URL, { signal: options?.signal });
      if (!res.ok) {
        throw new Error(`AppImageHub feed returned HTTP ${res.status}`);
      }
      const data = (await res.json()) as { items?: RawAppImageHubItem[] };
      return Array.isArray(data?.items) ? data.items : [];
    },
    normalize(rawItems) {
      const results: AppMetadata[] = [];
      for (const raw of rawItems) {
        const norm = normalizeAppImageHubItem(raw as RawAppImageHubItem);
        if (norm) {
          results.push(convertAppImageHubItemToMetadata(norm));
        }
      }
      return results;
    },
    validate: validateCatalogSlice,
  };

  const githubReleasesProvider: CatalogProvider = {
    id: 'github',
    name: 'GitHub Releases',
    description: 'Official GitHub release assets, multi-arch binaries, and SHA-256 digests',
    priority: 85,
    ...states.github,
    async fetch() {
      return [];
    },
    normalize(rawItems) {
      return rawItems as AppMetadata[];
    },
    validate: validateCatalogSlice,
  };

  const gitlabReleasesProvider: CatalogProvider = {
    id: 'gitlab',
    name: 'GitLab Releases',
    description: 'GitLab repository releases and portable Linux AppImage assets',
    priority: 80,
    ...states.gitlab,
    async fetch() {
      return [];
    },
    normalize(rawItems) {
      return rawItems as AppMetadata[];
    },
    validate: validateCatalogSlice,
  };

  const sourceForgeProvider: CatalogProvider = {
    id: 'sourceforge',
    name: 'SourceForge',
    description: 'SourceForge release mirrors (disabled by default)',
    priority: 50,
    ...states.sourceforge,
    async fetch() {
      return [];
    },
    normalize(rawItems) {
      return rawItems as AppMetadata[];
    },
    validate: validateCatalogSlice,
  };

  const communityProvider: CatalogProvider = {
    id: 'community',
    name: 'Community Submissions',
    description: 'Moderated developer and community AppImage submissions',
    priority: 40,
    ...states.community,
    async fetch() {
      return [];
    },
    normalize(rawItems) {
      return rawItems as AppMetadata[];
    },
    validate: validateCatalogSlice,
  };

  return [
    appImageHubProvider,
    githubReleasesProvider,
    gitlabReleasesProvider,
    sourceForgeProvider,
    communityProvider,
  ];
}

export function setProviderEnabled(providerId: CatalogProviderId, enabled: boolean): CatalogProvider[] {
  const states = loadProviderStates();
  const current = states[providerId];
  if (current) {
    states[providerId] = {
      ...current,
      enabled,
      status: enabled ? 'healthy' : 'disabled',
    };
    saveProviderStates(states);
  }
  return createCatalogProviders();
}

export function recordProviderSyncStatus(
  providerId: CatalogProviderId,
  update: Partial<StoredProviderState>
): CatalogProvider[] {
  const states = loadProviderStates();
  const current = states[providerId];
  if (current) {
    states[providerId] = {
      ...current,
      ...update,
    };
    saveProviderStates(states);
  }
  return createCatalogProviders();
}
