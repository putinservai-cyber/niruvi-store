import React from 'react';
import {
  PackageOpen,
  AlertCircle,
  RefreshCw,
  WifiOff,
  CheckCircle2,
  ShieldCheck,
  Terminal,
  Download,
  Search,
  X,
  ArrowRight,
  Compass,
  PlusCircle,
} from 'lucide-react';

export interface WelcomeIntroScreenProps {
  totalVerifiedCount: number;
  isDismissed: boolean;
  onDismiss: () => void;
  onReopen: () => void;
  onOpenVerifier: () => void;
  onOpenSubmit: () => void;
  onQuickSearch: (query: string) => void;
}

/**
 * Screen 2: Welcome / Intro Screen
 * Briefly introduces Niruvi Store, how portable Linux AppImages work,
 * and provides direct entry points to Verify, Browse, or Submit packages.
 */
export const WelcomeIntroScreen: React.FC<WelcomeIntroScreenProps> = ({
  totalVerifiedCount,
  isDismissed,
  onDismiss,
  onReopen,
  onOpenVerifier,
  onOpenSubmit,
  onQuickSearch,
}) => {
  if (isDismissed) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 py-2 px-3.5 rounded-lg bg-neutral-900/50 border border-neutral-800/80 text-xs text-neutral-400">
        <span>
          New to portable Linux packages? Learn how upstream <code className="font-mono text-neutral-200">.AppImage</code> verification works.
        </span>
        <button
          type="button"
          onClick={onReopen}
          className="text-sky-400 hover:text-sky-300 font-medium underline underline-offset-4 shrink-0 cursor-pointer"
        >
          Show Welcome Guide
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Welcome and platform introduction"
      className="mb-6 p-5 sm:p-6 rounded-xl bg-neutral-900/70 border border-neutral-800"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-neutral-800/90">
        <div className="max-w-2xl">
          <p className="text-xs font-mono text-sky-400 mb-1.5">
            Welcome to Niruvi Store · Portable Linux Software Directory
          </p>
          <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Download, verify, and run standalone Linux applications without root or package manager lock-in.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1.5 leading-relaxed">
            Every listed release links directly to its upstream publisher artifact over HTTPS and includes a SHA-256 digest so you can verify binary integrity before execution.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss welcome introduction"
          className="self-start px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-colors shrink-0 cursor-pointer"
        >
          Dismiss Intro
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-b border-neutral-800/90 text-xs">
        <div className="space-y-1">
          <div className="font-semibold text-white flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
            <span>01. Direct Upstream Releases</span>
          </div>
          <p className="text-neutral-400 leading-relaxed">
            {totalVerifiedCount.toLocaleString()} verified <code className="font-mono text-neutral-300">.AppImage</code> binaries served directly from official GitHub and GitLab releases—never repackaged.
          </p>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>02. Cryptographic SHA-256</span>
          </div>
          <p className="text-neutral-400 leading-relaxed">
            Inspect the published SHA-256 checksum on every card or drop a downloaded binary into the browser verifier.
          </p>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-white flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            <span>03. Zero-Install Execution</span>
          </div>
          <p className="text-neutral-400 leading-relaxed">
            Make the binary executable (<code className="font-mono text-neutral-300">chmod +x</code>) and run it across Ubuntu, Fedora, Arch, Debian, or openSUSE.
          </p>
        </div>
      </div>

      <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenVerifier}
            className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Verify a Local .AppImage</span>
          </button>
          <button
            type="button"
            onClick={onOpenSubmit}
            className="px-3.5 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>Submit a Package</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
          <span>Quick explore:</span>
          <button
            type="button"
            onClick={() => onQuickSearch('video')}
            className="px-2 py-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-mono text-[11px] cursor-pointer"
          >
            video
          </button>
          <button
            type="button"
            onClick={() => onQuickSearch('code')}
            className="px-2 py-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-mono text-[11px] cursor-pointer"
          >
            code
          </button>
          <button
            type="button"
            onClick={() => onQuickSearch('raster')}
            className="px-2 py-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-mono text-[11px] cursor-pointer"
          >
            raster
          </button>
        </div>
      </div>
    </section>
  );
};

export interface CatalogLoadingScreenProps {
  message?: string;
  skeletonCount?: number;
}

/**
 * Screen 1: Loading Screen
 * Displayed while catalog pages or startup data are loading.
 */
export const CatalogLoadingScreen: React.FC<CatalogLoadingScreenProps> = ({
  message = 'Synchronizing verified Linux AppImage catalog...',
  skeletonCount = 6,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="my-4 space-y-4"
    >
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-neutral-900/70 border border-neutral-800 text-xs text-neutral-300">
        <div className="flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" aria-hidden="true" />
          <span className="font-medium">{message}</span>
        </div>
        <span className="font-mono text-[11px] text-neutral-400">SHA-256 Index Ready</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {Array.from({ length: skeletonCount }, (_, idx) => (
          <div
            key={idx}
            className="p-5 rounded-xl bg-neutral-900/40 border border-neutral-800/80 space-y-3 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-neutral-800" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-2/3 rounded bg-neutral-800" />
                <div className="h-3 w-1/2 rounded bg-neutral-800/70" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-neutral-800/60" />
            <div className="h-3 w-4/5 rounded bg-neutral-800/60" />
            <div className="pt-2 flex items-center justify-between">
              <div className="h-6 w-20 rounded bg-neutral-800" />
              <div className="h-8 w-24 rounded-lg bg-neutral-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export interface SearchDiscoveryBarProps {
  searchQuery: string;
  resultCount: number;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
}

const SEARCH_SUGGESTIONS: ReadonlyArray<{ label: string; query: string }> = [
  { label: 'Video Editing', query: 'video' },
  { label: 'Code & Telemetry-Free IDE', query: 'code' },
  { label: 'Raster & Photo Studio', query: 'raster' },
  { label: 'Vector Illustration', query: 'vector' },
  { label: '3D Parametric CAD', query: 'parametric' },
];

/**
 * Screen 4: Search Screen (Suggestions & Active Search Results Bar)
 * Displays interactive search suggestions and an active search status bar when a query is entered.
 */
export const SearchDiscoveryBar: React.FC<SearchDiscoveryBarProps> = ({
  searchQuery,
  resultCount,
  onSearchChange,
  onClearSearch,
}) => {
  const trimmed = searchQuery.trim();

  if (trimmed) {
    return (
      <div
        role="region"
        aria-label="Active search results summary"
        className="mb-4 px-4 py-3 rounded-xl bg-sky-500/10 border border-sky-500/30 flex flex-wrap items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2 text-neutral-200">
          <Search className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
          <span>
            Search results for <strong className="font-mono text-white">&ldquo;{trimmed}&rdquo;</strong>
            {' '}·{' '}
            <span className="font-mono text-sky-300">{resultCount.toLocaleString()}</span> matching{' '}
            {resultCount === 1 ? 'package' : 'packages'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClearSearch}
          className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 inline-flex items-center gap-1 font-medium transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Clear Search</span>
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Search suggestions"
      className="mb-4 flex flex-wrap items-center gap-2 text-xs text-neutral-400"
    >
      <span className="inline-flex items-center gap-1.5 text-neutral-400 font-medium">
        <Compass className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
        <span>Popular searches:</span>
      </span>
      {SEARCH_SUGGESTIONS.map((item) => (
        <button
          key={item.query}
          type="button"
          onClick={() => onSearchChange(item.query)}
          className="px-2.5 py-1 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export interface EmptyErrorOfflineScreenProps {
  mode: 'empty' | 'error' | 'offline';
  title?: string;
  description?: string;
  onResetFilters?: () => void;
  onRetry?: () => void;
  onSuggestionClick?: (query: string) => void;
}

/**
 * Screen 8: Empty / Error / Offline Screen
 * Handles zero-result filters, failed network requests, and offline connection states.
 */
export const EmptyErrorOfflineScreen: React.FC<EmptyErrorOfflineScreenProps> = ({
  mode,
  title,
  description,
  onResetFilters,
  onRetry,
  onSuggestionClick,
}) => {
  if (mode === 'offline') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <span>
            {description ||
              'Offline mode active — serving verified AppImage catalog and SHA-256 verifier locally.'}
          </span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-white font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry Connection</span>
          </button>
        )}
      </div>
    );
  }

  if (mode === 'error') {
    return (
      <div
        role="alert"
        className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-wrap items-center justify-between gap-4 text-xs text-rose-300"
      >
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
          <div>
            {title && <p className="font-semibold text-white mb-0.5">{title}</p>}
            <span>{description || 'Unable to load catalog data from the server.'}</span>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-white font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-16 px-4 bg-neutral-900/40 border border-neutral-800 rounded-xl my-4">
      <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-400">
        <PackageOpen className="w-6 h-6" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-white mb-1">
        {title || 'No apps match your filters'}
      </h2>
      <p className="text-xs text-neutral-400 max-w-md mx-auto mb-5">
        {description || 'No applications matched your current search or filter criteria.'}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Reset All Filters
          </button>
        )}
        {onSuggestionClick && (
          <button
            type="button"
            onClick={() => onSuggestionClick('video')}
            className="px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-medium text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Browse Video Editors</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

export interface ActionSuccessScreenProps {
  title: string;
  message: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

/**
 * Screen 9: Success / Confirmation Screen
 * Confirms that an action (package submission, SHA-256 verification, or download) was completed.
 */
export const ActionSuccessScreen: React.FC<ActionSuccessScreenProps> = ({
  title,
  message,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 space-y-3"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-neutral-300 leading-relaxed">{message}</p>
        </div>
      </div>
      {(primaryActionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center gap-2.5 pt-1 pl-8">
          {primaryActionLabel && onPrimaryAction && (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors cursor-pointer"
            >
              {primaryActionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-medium transition-colors cursor-pointer"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
