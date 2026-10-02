import React, { useState, useRef, useEffect } from 'react';
import { AppMetadata, Category, Architecture } from '../types';
import { generateNiruviProtocolUrl } from '../data/apps';
import { buildApiUrl, TURNSTILE_SITE_KEY } from '../config/site';
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';
import {
  ALLOWED_SUBMISSION_HOSTS,
  buildGitHubSubmissionIssueUrl,
  isAllowedSubmissionHost,
  isValidHttpsDownloadUrl,
  mapWorkerSubmissionToAppMetadata,
} from '../utils/catalogSchema';
import {
  PlusCircle,
  Check,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Terminal,
  Copy,
  ExternalLink,
  GitPullRequest,
  Users,
  Info,
} from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          theme?: 'dark' | 'light' | 'auto';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset?: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
  }
}

interface SubmitAppViewProps {
  onAppAdded: (app: AppMetadata) => void;
  onNavigateToStore: () => void;
}

function isAppImageOrReleasesPath(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr.trim());
    const pathname = decodeURIComponent(parsed.pathname || '').trim();
    if (pathname.toLowerCase().endsWith('.appimage')) return true;
    return (
      /\/releases(\/|$)/i.test(pathname) ||
      /\/-\/releases(\/|$)/i.test(pathname) ||
      /\/projects\/[^/]+\/files(\/|$)/i.test(pathname)
    );
  } catch {
    return false;
  }
}

export const SubmitAppView: React.FC<SubmitAppViewProps> = ({
  onAppAdded,
  onNavigateToStore,
}) => {
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [version, setVersion] = useState('');
  const [architecture, setArchitecture] = useState<Architecture>('x86_64');
  const [license, setLicense] = useState('GPL-3.0');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [sha256, setSha256] = useState('');
  const [category, setCategory] = useState<Exclude<Category, 'All'>>('Utilities');

  // Cloudflare Turnstile state
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  // Refs for moving keyboard focus to the first error field on submit
  const nameRef = useRef<HTMLInputElement>(null);
  const shortDescRef = useRef<HTMLTextAreaElement>(null);
  const versionRef = useRef<HTMLInputElement>(null);
  const licenseRef = useRef<HTMLInputElement>(null);
  const downloadUrlRef = useRef<HTMLInputElement>(null);
  const sourceUrlRef = useRef<HTMLInputElement>(null);
  const iconUrlRef = useRef<HTMLInputElement>(null);
  const sha256Ref = useRef<HTMLInputElement>(null);

  // Optional GitHub / GitLab release auto-importer
  const [repoUrl, setRepoUrl] = useState('');
  const [fetchingRepo, setFetchingRepo] = useState(false);
  const [repoFetchSuccess, setRepoFetchSuccess] = useState<string | null>(null);
  const [repoFetchError, setRepoFetchError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submittedIssueUrl, setSubmittedIssueUrl] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedProtocol, setCopiedProtocol] = useState(false);

  // Load and render Cloudflare Turnstile widget when VITE_TURNSTILE_SITE_KEY is configured
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || typeof window === 'undefined') return;

    const renderWidget = () => {
      if (
        window.turnstile &&
        turnstileContainerRef.current &&
        !turnstileWidgetIdRef.current
      ) {
        try {
          turnstileWidgetIdRef.current = window.turnstile.render(
            turnstileContainerRef.current,
            {
              sitekey: TURNSTILE_SITE_KEY,
              theme: 'dark',
              callback: (token: string) => setTurnstileToken(token),
              'expired-callback': () => setTurnstileToken(''),
              'error-callback': () => setTurnstileToken(''),
            }
          );
        } catch {
          // Ignore widget render errors in headless test environments
        }
      }
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );
    if (existingScript) {
      existingScript.addEventListener('load', renderWidget);
      return () => existingScript.removeEventListener('load', renderWidget);
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', renderWidget);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', renderWidget);
    };
  }, []);

  const handleAutoDetectFromUrl = () => {
    if (!downloadUrl.trim()) return;
    try {
      const parsed = new URL(downloadUrl.trim());
      const parts = parsed.pathname.split('/').filter(Boolean);
      const filename = parts[parts.length - 1] || '';

      if (filename.toLowerCase().includes('aarch64') || filename.toLowerCase().includes('arm64')) {
        setArchitecture('aarch64');
      } else if (filename.toLowerCase().includes('armhf')) {
        setArchitecture('armhf');
      } else {
        setArchitecture('x86_64');
      }

      const versionMatch = filename.match(/v?(\d+\.\d+(?:\.\d+)?)/i);
      if (versionMatch && versionMatch[1] && !version) {
        setVersion(versionMatch[1]);
      }

      if (!name && filename) {
        const cleanName = filename
          .replace(/\.appimage$/i, '')
          .replace(/[-_]v?\d+.*$/i, '')
          .replace(/[-_]x86_64.*$/i, '')
          .replace(/[-_]linux.*$/i, '');
        if (cleanName && cleanName.toLowerCase() !== 'releases') {
          setName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
        }
      }

      if (!sourceUrl && parsed.hostname.includes('github.com') && parts.length >= 2) {
        setSourceUrl(`https://github.com/${parts[0]}/${parts[1]}`);
      }
    } catch {
      // Ignore malformed URL during auto-detect
    }
  };

  const handleFetchRepo = async () => {
    if (!repoUrl.trim()) return;
    setFetchingRepo(true);
    setRepoFetchError(null);
    setRepoFetchSuccess(null);

    try {
      const url = repoUrl.trim();
      let owner = '';
      let repo = '';
      let isGithub = false;
      let isGitlab = false;

      if (url.includes('github.com')) {
        isGithub = true;
        const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (match) {
          owner = match[1];
          repo = match[2].replace(/\.git$/, '').split('#')[0].split('?')[0];
        }
      } else if (url.includes('gitlab.com')) {
        isGitlab = true;
        const match = url.match(/gitlab\.com\/([^/]+(?:\/[^/]+)*)/);
        if (match) {
          repo = match[1].replace(/\.git$/, '').split('#')[0].split('?')[0];
        }
      }

      if (isGithub && owner && repo) {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/releases/latest`
        );
        if (!response.ok) {
          throw new Error(
            `GitHub API returned HTTP ${response.status}: Failed to fetch latest release.`
          );
        }
        const data = await response.json();
        const assets = data.assets || [];
        const appimageAsset = assets.find((asset: any) =>
          String(asset.name || '')
            .toLowerCase()
            .endsWith('.appimage')
        );

        if (!appimageAsset) {
          throw new Error(
            'Latest GitHub release does not contain any asset ending with ".AppImage".'
          );
        }

        setName(repo.charAt(0).toUpperCase() + repo.slice(1));
        setDownloadUrl(appimageAsset.browser_download_url);
        setSourceUrl(`https://github.com/${owner}/${repo}`);
        setVersion(String(data.tag_name || '').replace(/^v/i, ''));
        setShortDescription(
          sanitizeText(data.name || data.body || `Latest release of ${repo}`, 200)
        );

        const assetLower = String(appimageAsset.name || '').toLowerCase();
        if (assetLower.includes('aarch64') || assetLower.includes('arm64')) {
          setArchitecture('aarch64');
        } else if (assetLower.includes('armhf')) {
          setArchitecture('armhf');
        } else {
          setArchitecture('x86_64');
        }

        setRepoFetchSuccess(
          `Imported release metadata for "${repo}" (${data.tag_name}) from GitHub.`
        );
      } else if (isGitlab && repo) {
        const projectEncoded = encodeURIComponent(repo);
        const response = await fetch(
          `https://gitlab.com/api/v4/projects/${projectEncoded}/releases`
        );
        if (!response.ok) {
          throw new Error(`GitLab API returned HTTP ${response.status}.`);
        }
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('No releases found for this GitLab project.');
        }

        const latestRelease = data[0];
        const links = latestRelease.assets?.links || [];
        const appimageLink = links.find((link: any) =>
          String(link.url || '')
            .toLowerCase()
            .endsWith('.appimage')
        );
        const directUrl = appimageLink?.url || `https://gitlab.com/${repo}/-/releases`;

        const repoName = repo.split('/').pop() || 'App';
        setName(repoName.charAt(0).toUpperCase() + repoName.slice(1));
        setDownloadUrl(directUrl);
        setSourceUrl(`https://gitlab.com/${repo}`);
        setVersion(String(latestRelease.tag_name || '').replace(/^v/i, ''));
        setShortDescription(
          sanitizeText(
            latestRelease.name || latestRelease.description || `Latest release of ${repoName}`,
            200
          )
        );
        setArchitecture('x86_64');
        setRepoFetchSuccess(
          `Imported release metadata for "${repoName}" (${latestRelease.tag_name}) from GitLab.`
        );
      } else {
        throw new Error(
          'Enter a public GitHub or GitLab repository URL (e.g. https://github.com/owner/repo).'
        );
      }
    } catch (err: any) {
      setRepoFetchError(err.message || 'Could not import repository release metadata.');
    } finally {
      setFetchingRepo(false);
    }
  };

  const prefilledIssueUrl = buildGitHubSubmissionIssueUrl({
    name,
    shortDescription,
    version,
    architecture,
    license,
    downloadUrl,
    sourceUrl,
    iconUrl,
    sha256,
    category,
  });

  const cleanSha = sha256.trim().toLowerCase();
  const hasProvidedSha = /^[a-f0-9]{64}$/.test(cleanSha);

  const previewApp: AppMetadata = {
    id:
      sanitizeText(name, 80)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'community-app',
    name: sanitizeText(name, 80) || 'Community Linux App',
    tagline:
      sanitizeText(shortDescription, 200) ||
      'Community-submitted Linux desktop application distributed as an AppImage',
    description:
      sanitizeText(shortDescription, 500) ||
      'Community-submitted Linux desktop application distributed as an AppImage.',
    category,
    version: sanitizeText(version, 40) || '1.0.0',
    releaseDate: new Date().toISOString().split('T')[0],
    size: '',
    architectures: [architecture],
    license: sanitizeText(license, 40) || 'GPL-3.0',
    licenseCategory: /mit|apache|bsd|isc/i.test(license) ? 'Permissive' : 'Open Source',
    publisher: {
      name: 'Community Contributor',
      website: sanitizeUrl(sourceUrl.trim()) || undefined,
      verified: false,
      github: sanitizeUrl(sourceUrl.trim()) || undefined,
    },
    sha256: hasProvidedSha ? cleanSha : '',
    downloadUrl: sanitizeUrl(downloadUrl.trim()) || 'https://github.com/owner/repo/releases',
    homepageUrl: sanitizeUrl(sourceUrl.trim()) || undefined,
    sourceUrl: sanitizeUrl(sourceUrl.trim()) || undefined,
    repositoryUrl: sanitizeUrl(sourceUrl.trim()) || undefined,
    iconSlug: 'default',
    icon: sanitizeUrl(iconUrl.trim()) || undefined,
    source: 'community',
    sourceType: 'Community',
    checksumStatus: hasProvidedSha ? 'provided' : 'unverified',
    tags: [category.toLowerCase(), 'appimage', 'community'],
    downloadsCount: 0,
    rating: 0,
    isUserAdded: true,
  };

  const previewProtocolUrl = generateNiruviProtocolUrl(previewApp);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);
    setSubmittedIssueUrl(null);

    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Application name is required.';
    }
    if (!shortDescription.trim()) {
      newErrors.shortDescription = 'Short description is required.';
    }
    if (!version.trim()) {
      newErrors.version = 'Version is required (e.g. 1.0.0).';
    }
    if (!license.trim()) {
      newErrors.license = 'Software license is required (e.g. GPL-3.0, MIT).';
    }

    const trimmedDownload = downloadUrl.trim();
    if (!trimmedDownload || !isValidHttpsDownloadUrl(trimmedDownload)) {
      newErrors.downloadUrl = 'Download URL must be a valid https:// URL.';
    } else if (!isAllowedSubmissionHost(trimmedDownload)) {
      newErrors.downloadUrl = `Download URL host must be on the allowlist (${ALLOWED_SUBMISSION_HOSTS.slice(0, 5).join(', ')}, etc.).`;
    } else if (!isAppImageOrReleasesPath(trimmedDownload)) {
      newErrors.downloadUrl =
        'Download URL must end with .AppImage (case-insensitive) or point to a /releases page.';
    }

    const trimmedSource = sourceUrl.trim();
    if (!trimmedSource || !isValidHttpsDownloadUrl(trimmedSource)) {
      newErrors.sourceUrl =
        'Upstream source/repository URL is required and must start with https://.';
    }

    const trimmedIcon = iconUrl.trim();
    if (trimmedIcon && !isValidHttpsDownloadUrl(trimmedIcon)) {
      newErrors.iconUrl = 'Optional icon URL must be a valid https:// URL.';
    }

    const trimmedSha = sha256.trim();
    if (trimmedSha && !/^[a-fA-F0-9]{64}$/.test(trimmedSha)) {
      newErrors.sha256 = 'Optional SHA-256 checksum must be exactly 64 hexadecimal characters.';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setValidationError(Object.values(newErrors)[0]);

      if (newErrors.name) nameRef.current?.focus();
      else if (newErrors.shortDescription) shortDescRef.current?.focus();
      else if (newErrors.version) versionRef.current?.focus();
      else if (newErrors.license) licenseRef.current?.focus();
      else if (newErrors.downloadUrl) downloadUrlRef.current?.focus();
      else if (newErrors.sourceUrl) sourceUrlRef.current?.focus();
      else if (newErrors.iconUrl) iconUrlRef.current?.focus();
      else if (newErrors.sha256) sha256Ref.current?.focus();
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    const issueUrl = buildGitHubSubmissionIssueUrl({
      name,
      shortDescription,
      version,
      architecture,
      license,
      downloadUrl: trimmedDownload,
      sourceUrl: trimmedSource,
      iconUrl: trimmedIcon,
      sha256: trimmedSha,
      category,
    });
    setSubmittedIssueUrl(issueUrl);

    try {
      const response = await fetch(buildApiUrl('/api/submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: previewApp.id,
          description: shortDescription.trim(),
          version: version.trim().replace(/^v/i, ''),
          architecture,
          license: license.trim(),
          download_url: trimmedDownload,
          source_url: trimmedSource,
          icon_url: trimmedIcon || undefined,
          sha256: trimmedSha ? trimmedSha.toLowerCase() : undefined,
          turnstileToken: turnstileToken || 'local-dev-bypass',
        }),
      });

      const contentType = response.headers?.get?.('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        const mapped =
          (data?.submission && mapWorkerSubmissionToAppMetadata(data.submission)) || previewApp;
        onAppAdded(mapped);
        setSuccessMessage(
          `Published "${mapped.name}" to the community directory!`
        );
        return;
      }

      if (response.status >= 400 && response.status < 500 && contentType.includes('application/json')) {
        const errData = await response.json().catch(() => ({}));
        if (errData?.error) {
          setValidationError(String(errData.error));
          return;
        }
      }

      // Graceful fallback when Worker is unreachable or returns 404/5xx on static hosting
      onAppAdded(previewApp);
      setSuccessMessage(
        `Worker API is not reachable at this URL—added "${previewApp.name}" for this session and prepared a prefilled GitHub Issue link.`
      );
    } catch {
      // Graceful fallback when Worker is offline
      onAppAdded(previewApp);
      setSuccessMessage(
        `Worker API is currently offline—added "${previewApp.name}" for this session and prepared a prefilled GitHub Issue link.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyProtocol = () => {
    navigator.clipboard.writeText(previewProtocolUrl);
    setCopiedProtocol(true);
    setTimeout(() => setCopiedProtocol(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Heading & Directory Policy Note */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <PlusCircle className="w-4 h-4 text-sky-400" aria-hidden="true" />
            <span>Instant Community AppImage Submission</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Submit an AppImage to the Catalog
          </h1>
          <p className="text-sm text-neutral-300 mt-2 leading-relaxed">
            Submit a Linux AppImage package to the Niruvi Store community directory backed by
            Cloudflare Workers &amp; D1. Validated submissions are published immediately with a{' '}
            <span className="text-amber-300 font-medium">Community, unreviewed</span> badge.
          </p>
        </div>

        {/* Review Process & Directory-Only Explanation Note */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Info className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
            <span>Directory-Only Policy &amp; Community Submissions</span>
          </div>
          <p className="leading-relaxed">
            <strong>External Links Only — No Binary Hosting:</strong> Niruvi Store is strictly a
            software directory. It displays application details and links directly to the
            publisher&apos;s original external HTTPS download URL. It never hosts, stores, or
            proxies AppImage files.
          </p>
          <p className="leading-relaxed">
            <strong>Validation &amp; Moderation:</strong> Submissions are validated for HTTPS-only
            URLs, allowed release hosts (<code className="font-mono">github.com</code>,{' '}
            <code className="font-mono">gitlab.com</code>,{' '}
            <code className="font-mono">sourceforge.net</code>), Cloudflare Turnstile protection,
            and catalog uniqueness. Visitors can report broken or abusive entries at any time.
          </p>
        </div>
      </div>

      {/* Live Status Banner */}
      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {submittedIssueUrl && (
              <a
                href={submittedIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <GitPullRequest className="w-4 h-4" aria-hidden="true" />
                <span>Open Prefilled GitHub Issue</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
            <button
              type="button"
              onClick={onNavigateToStore}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Browse in Store
            </button>
          </div>
        </div>
      )}

      {validationError && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Form and Preview Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-2 space-y-6 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6"
        >
          {/* Optional Repository Auto-Importer */}
          <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                GitHub &amp; GitLab Release Auto-Fill (Optional)
              </h2>
            </div>
            <label
              htmlFor="submit-repo-url"
              className="block text-xs text-neutral-300 leading-relaxed"
            >
              Paste a public GitHub or GitLab repository URL to pre-fill release fields automatically:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="submit-repo-url"
                type="url"
                autoComplete="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="min-h-[44px] flex-1 px-3.5 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-400"
              />
              <button
                type="button"
                onClick={handleFetchRepo}
                disabled={fetchingRepo || !repoUrl.trim()}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
                  fetchingRepo || !repoUrl.trim()
                    ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed border border-neutral-700'
                    : 'bg-white hover:bg-neutral-200 text-black cursor-pointer'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{fetchingRepo ? 'Importing Release...' : 'Import Release Metadata'}</span>
              </button>
            </div>

            {repoFetchSuccess && (
              <p
                role="status"
                className="text-xs text-emerald-300 font-medium flex items-center gap-1.5 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/30"
              >
                <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>{repoFetchSuccess}</span>
              </p>
            )}
            {repoFetchError && (
              <p
                role="alert"
                className="text-xs text-rose-300 font-medium flex items-center gap-1.5 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/30"
              >
                <AlertCircle className="w-4 h-4 text-rose-400" aria-hidden="true" />
                <span>{repoFetchError}</span>
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-bold text-white">Submission Fields</h2>

            {/* 1. Name & 3. Version */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="submit-app-name" className="text-xs font-semibold text-white block">
                  Application Name <span className="text-neutral-300">(required)</span>
                </label>
                <input
                  ref={nameRef}
                  id="submit-app-name"
                  type="text"
                  autoComplete="off"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'submit-app-name-error' : undefined}
                  placeholder="e.g. FreeTube, Joplin, PrusaSlicer"
                  className="min-h-[44px] w-full px-3.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-400"
                  required
                />
                {fieldErrors.name && (
                  <p id="submit-app-name-error" className="text-xs text-rose-300 font-medium">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="submit-version" className="text-xs font-semibold text-white block">
                  Version <span className="text-neutral-300">(required)</span>
                </label>
                <input
                  ref={versionRef}
                  id="submit-version"
                  type="text"
                  autoComplete="off"
                  maxLength={40}
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.version)}
                  aria-describedby={fieldErrors.version ? 'submit-version-error' : undefined}
                  placeholder="e.g. 1.4.2"
                  className="min-h-[44px] w-full px-3.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-400"
                  required
                />
                {fieldErrors.version && (
                  <p id="submit-version-error" className="text-xs text-rose-300 font-medium">
                    {fieldErrors.version}
                  </p>
                )}
              </div>
            </div>

            {/* 2. Short Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="submit-short-description"
                className="text-xs font-semibold text-white block"
              >
                Short Description <span className="text-neutral-300">(required)</span>
              </label>
              <textarea
                ref={shortDescRef}
                id="submit-short-description"
                rows={2}
                maxLength={500}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                aria-invalid={Boolean(fieldErrors.shortDescription)}
                aria-describedby={
                  fieldErrors.shortDescription ? 'submit-short-description-error' : undefined
                }
                placeholder="Concise summary of what the application does (1–2 sentences)..."
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-400 leading-relaxed"
                required
              />
              {fieldErrors.shortDescription && (
                <p
                  id="submit-short-description-error"
                  className="text-xs text-rose-300 font-medium"
                >
                  {fieldErrors.shortDescription}
                </p>
              )}
            </div>

            {/* 4. Architecture, 5. License, and Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="submit-architecture"
                  className="text-xs font-semibold text-white block"
                >
                  Architecture <span className="text-neutral-300">(required)</span>
                </label>
                <select
                  id="submit-architecture"
                  value={architecture}
                  onChange={(e) => setArchitecture(e.target.value as Architecture)}
                  className="min-h-[44px] w-full px-3.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white font-mono cursor-pointer"
                >
                  <option value="x86_64">x86_64</option>
                  <option value="aarch64">aarch64</option>
                  <option value="armhf">armhf</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="submit-license" className="text-xs font-semibold text-white block">
                  License <span className="text-neutral-300">(required)</span>
                </label>
                <input
                  ref={licenseRef}
                  id="submit-license"
                  type="text"
                  maxLength={60}
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.license)}
                  aria-describedby={fieldErrors.license ? 'submit-license-error' : undefined}
                  placeholder="GPL-3.0, MIT, Apache-2.0"
                  className="min-h-[44px] w-full px-3.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-400"
                  required
                />
                {fieldErrors.license && (
                  <p id="submit-license-error" className="text-xs text-rose-300 font-medium">
                    {fieldErrors.license}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="submit-category" className="text-xs font-semibold text-white block">
                  Category
                </label>
                <select
                  id="submit-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Exclude<Category, 'All'>)}
                  className="min-h-[44px] w-full px-3.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white cursor-pointer"
                >
                  <option value="Utilities">Utilities</option>
                  <option value="Development">Development</option>
                  <option value="Graphics & Design">Graphics &amp; Design</option>
                  <option value="Audio & Video">Audio &amp; Video</option>
                  <option value="Productivity">Productivity</option>
                  <option value="Internet & Network">Internet &amp; Network</option>
                  <option value="Games">Games</option>
                  <option value="System & Security">System &amp; Security</option>
                  <option value="Education">Education</option>
                </select>
              </div>
            </div>

            {/* 6. Download URL (https only) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="submit-download-url" className="text-xs font-semibold text-white">
                  Download URL (HTTPS only) <span className="text-neutral-300">(required)</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoDetectFromUrl}
                  className="min-h-[36px] px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 hover:text-white font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" aria-hidden="true" />
                  <span>Auto-fill from URL</span>
                </button>
              </div>
              <input
                ref={downloadUrlRef}
                id="submit-download-url"
                type="url"
                autoComplete="url"
                maxLength={500}
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                aria-invalid={Boolean(fieldErrors.downloadUrl)}
                aria-describedby={
                  fieldErrors.downloadUrl
                    ? 'submit-download-url-error submit-download-url-hint'
                    : 'submit-download-url-hint'
                }
                placeholder="https://github.com/owner/repo/releases/download/v1.0.0/App-x86_64.AppImage"
                className="min-h-[44px] w-full px-3.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-400"
                required
              />
              <p id="submit-download-url-hint" className="text-xs text-neutral-300">
                Must use <code className="font-mono">https://</code> on an allowed host (
                <code className="font-mono">github.com</code>,{' '}
                <code className="font-mono">gitlab.com</code>,{' '}
                <code className="font-mono">sourceforge.net</code>) and end in{' '}
                <code className="font-mono">.AppImage</code> or point to a releases page.
              </p>
              {fieldErrors.downloadUrl && (
                <p id="submit-download-url-error" className="text-xs text-rose-300 font-medium">
                  {fieldErrors.downloadUrl}
                </p>
              )}
            </div>

            {/* 7. Upstream Source / Repo URL */}
            <div className="space-y-1.5">
              <label htmlFor="submit-source-url" className="text-xs font-semibold text-white block">
                Upstream Source / Repository URL <span className="text-neutral-300">(required)</span>
              </label>
              <input
                ref={sourceUrlRef}
                id="submit-source-url"
                type="url"
                autoComplete="url"
                maxLength={500}
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                aria-invalid={Boolean(fieldErrors.sourceUrl)}
                aria-describedby={fieldErrors.sourceUrl ? 'submit-source-url-error' : undefined}
                placeholder="https://github.com/owner/repo"
                className="min-h-[44px] w-full px-3.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-400"
                required
              />
              {fieldErrors.sourceUrl && (
                <p id="submit-source-url-error" className="text-xs text-rose-300 font-medium">
                  {fieldErrors.sourceUrl}
                </p>
              )}
            </div>

            {/* 8. Optional Icon URL & 9. Optional SHA-256 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="submit-icon-url" className="text-xs font-semibold text-white block">
                  Icon URL <span className="text-neutral-300">(optional, HTTPS)</span>
                </label>
                <input
                  ref={iconUrlRef}
                  id="submit-icon-url"
                  type="url"
                  autoComplete="url"
                  maxLength={500}
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.iconUrl)}
                  aria-describedby={fieldErrors.iconUrl ? 'submit-icon-url-error' : undefined}
                  placeholder="https://raw.githubusercontent.com/owner/repo/main/icon.png"
                  className="min-h-[44px] w-full px-3.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-400"
                />
                {fieldErrors.iconUrl && (
                  <p id="submit-icon-url-error" className="text-xs text-rose-300 font-medium">
                    {fieldErrors.iconUrl}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="submit-sha256" className="text-xs font-semibold text-white block">
                  SHA-256 Checksum <span className="text-neutral-300">(optional)</span>
                </label>
                <input
                  ref={sha256Ref}
                  id="submit-sha256"
                  type="text"
                  maxLength={64}
                  value={sha256}
                  onChange={(e) => setSha256(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.sha256)}
                  aria-describedby={fieldErrors.sha256 ? 'submit-sha256-error' : undefined}
                  placeholder="64-character hexadecimal SHA-256 hash"
                  className="min-h-[44px] w-full px-3.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg font-mono text-xs text-white placeholder-neutral-400"
                />
                {fieldErrors.sha256 && (
                  <p id="submit-sha256-error" className="text-xs text-rose-300 font-medium">
                    {fieldErrors.sha256}
                  </p>
                )}
              </div>
            </div>

            {/* Cloudflare Turnstile Widget Container */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  Cloudflare Turnstile Bot Protection
                </span>
                <span className="text-[11px] font-mono text-neutral-400">
                  {TURNSTILE_SITE_KEY ? 'Active' : 'Site key via VITE_TURNSTILE_SITE_KEY'}
                </span>
              </div>
              <div ref={turnstileContainerRef} data-testid="turnstile-widget-container" />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-neutral-300">
              Submits to Cloudflare Worker D1 (<code className="font-mono">POST /api/submit</code>)
            </span>
            <button
              id="submit-app-btn"
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 disabled:opacity-60 text-black font-semibold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <GitPullRequest className="w-4 h-4" aria-hidden="true" />
              <span>{submitting ? 'Submitting…' : 'Submit AppImage'}</span>
            </button>
          </div>
        </form>

        {/* Live Card & Issue Link Preview Column */}
        <div className="space-y-6">
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Live Community Card Preview</h2>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white shrink-0">
                    <Terminal className="w-5 h-5 text-neutral-300" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-white text-sm truncate">{previewApp.name}</h3>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] font-medium text-amber-300">
                        <Users className="w-3 h-3" aria-hidden="true" />
                        <span>Community, unreviewed</span>
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 mt-0.5">
                      v{previewApp.version} • {architecture} • {previewApp.license}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-neutral-300 line-clamp-2">{previewApp.tagline}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-neutral-900 text-neutral-200 border border-neutral-700">
                  {previewApp.category}
                </span>
                {hasProvidedSha ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 font-mono">
                    <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                    <span>Checksum: Provided</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-700 font-mono">
                    Checksum: Unverified
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200">
                  Generated niruvi:// URI:
                </span>
                <button
                  type="button"
                  onClick={copyProtocol}
                  aria-label="Copy generated niruvi protocol URI"
                  className="min-h-[36px] px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedProtocol ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{copiedProtocol ? 'Copied URI' : 'Copy URI'}</span>
                </button>
              </div>

              <pre className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-[11px] text-emerald-400 break-all whitespace-pre-wrap leading-tight">
                {previewProtocolUrl}
              </pre>
            </div>

            <div className="pt-2 border-t border-neutral-800 space-y-2">
              <span className="text-xs font-semibold text-neutral-200 block">
                GitHub Issue Fallback:
              </span>
              <a
                href={prefilledIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-sky-300 border border-neutral-800 text-xs font-medium inline-flex items-center justify-between gap-2 transition-colors"
              >
                <span className="truncate">submit-appimage.yml (label: submission)</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
