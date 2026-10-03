import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  APPS_CATALOG,
  TOTAL_CATALOG_COUNT,
  VERIFIED_DIRECT_CATALOG_COUNT,
  HIDDEN_UNVERIFIED_CATALOG_COUNT,
  CATALOG_CLEANUP_REPORT,
} from './data/apps';
import { AppMetadata } from './types';
import { mapToSimplifiedCategory } from './utils/appimagehub';
import {
  isCommunitySubmitted,
  isGenuineSha256,
  isEligibleForMainListing,
  isPolicyFlaggedEntry,
  mapWorkerSubmissionToAppMetadata,
  validateCatalogAtRuntime,
} from './utils/catalogSchema';
import { Navbar, NavTab } from './components/Navbar';
import { FilterBar, SortOption, SIMPLIFIED_CATEGORIES } from './components/FilterBar';
import { AppCard } from './components/AppCard';
import { AppDetailModal } from './components/AppDetailModal';
import { InstallModal } from './components/InstallModal';
import { IntegrityVerifierView } from './components/IntegrityVerifierView';
import { MyLibraryView } from './components/MyLibraryView';
import { SubmitAppView } from './components/SubmitAppView';
import { AdminModerationView } from './components/AdminModerationView';
import { AuthModal } from './components/AuthModal';
import { AccountManagementModal } from './components/AccountManagementModal';
import { Footer, LegalRoute } from './components/Footer';
import { CookieConsent } from './components/CookieConsent';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Cookies } from './pages/Cookies';
import { Refunds } from './pages/Refunds';
import { Donate } from './pages/Donate';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  WelcomeIntroScreen,
  CatalogLoadingScreen,
  SearchDiscoveryBar,
  EmptyErrorOfflineScreen,
} from './components/EssentialScreens';
import { updatePageSeo } from './utils/seo';
import { withBaseUrl, stripBaseUrl, buildApiUrl, HAS_API_BACKEND } from './config/site';
import { fetchWithTimeoutAndRetry, isSlowOrOfflineConnection } from './utils/network';
import { useAuth } from './context/AuthContext';
import {
  recordAppDownload,
  syncLibraryBookmarkWithSupabase,
  fetchUserLibraryFromSupabase,
  fetchUserDownloadsFromSupabase,
} from './lib/supabase';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 48;

interface RouteState {
  legalRoute: LegalRoute;
  activeTab: NavTab;
  appId: string | null;
}

function parseCurrentLocation(): RouteState {
  if (typeof window === 'undefined') {
    return { legalRoute: 'store', activeTab: 'browse', appId: null };
  }

  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  const lowerHash = hash.toLowerCase();
  if (lowerHash === 'privacy') return { legalRoute: 'privacy', activeTab: 'browse', appId: null };
  if (lowerHash === 'terms') return { legalRoute: 'terms', activeTab: 'browse', appId: null };
  if (lowerHash === 'cookies') return { legalRoute: 'cookies', activeTab: 'browse', appId: null };
  if (lowerHash === 'refunds') return { legalRoute: 'refunds', activeTab: 'browse', appId: null };
  if (lowerHash === 'donate') return { legalRoute: 'store', activeTab: 'donate', appId: null };
  if (lowerHash === 'verifier') return { legalRoute: 'store', activeTab: 'verifier', appId: null };
  if (lowerHash === 'library') return { legalRoute: 'store', activeTab: 'library', appId: null };
  if (lowerHash === 'submit') return { legalRoute: 'store', activeTab: 'submit', appId: null };
  if (lowerHash === 'admin') return { legalRoute: 'store', activeTab: 'admin', appId: null };
  if (lowerHash.startsWith('app/')) {
    const hashSlug = decodeURIComponent(hash.slice(4)).trim();
    if (hashSlug) return { legalRoute: 'store', activeTab: 'browse', appId: hashSlug };
  }

  const params = new URLSearchParams(window.location.search);
  const redirectedPath = params.get('p') || params.get('route');
  const rawPathname = redirectedPath || window.location.pathname;
  const pathname = stripBaseUrl(rawPathname).replace(/\/+$/, '') || '/';
  const lowerPath = pathname.toLowerCase();

  if (lowerPath === '/privacy') return { legalRoute: 'privacy', activeTab: 'browse', appId: null };
  if (lowerPath === '/terms') return { legalRoute: 'terms', activeTab: 'browse', appId: null };
  if (lowerPath === '/cookies') return { legalRoute: 'cookies', activeTab: 'browse', appId: null };
  if (lowerPath === '/refunds') return { legalRoute: 'refunds', activeTab: 'browse', appId: null };
  if (lowerPath === '/donate') return { legalRoute: 'store', activeTab: 'donate', appId: null };

  if (lowerPath === '/verifier') return { legalRoute: 'store', activeTab: 'verifier', appId: null };
  if (lowerPath === '/library') return { legalRoute: 'store', activeTab: 'library', appId: null };
  if (lowerPath === '/submit') return { legalRoute: 'store', activeTab: 'submit', appId: null };
  if (lowerPath === '/admin') return { legalRoute: 'store', activeTab: 'admin', appId: null };

  if (lowerPath.startsWith('/app/')) {
    const slug = decodeURIComponent(pathname.slice(5)).trim();
    if (slug) {
      return { legalRoute: 'store', activeTab: 'browse', appId: slug };
    }
  }

  const queryAppId = params.get('app');
  if (queryAppId) {
    return { legalRoute: 'store', activeTab: 'browse', appId: queryAppId };
  }

  return { legalRoute: 'store', activeTab: 'browse', appId: null };
}

function filterAndSortCatalog(
  apps: AppMetadata[],
  options: {
    q: string;
    category: string;
    arch: string;
    onlyVerified: boolean;
    includeUnverifiedImports?: boolean;
    sortBy: SortOption;
  }
): AppMetadata[] {
  const qLower = options.q.trim().toLowerCase();
  return apps
    .filter((app) => {
      // Always block policy-flagged entries (e.g. account-scraper) and any synthetic test/demo IDs
      if (
        app.moderationFlag === 'flagged_policy' ||
        isPolicyFlaggedEntry(app).flagged ||
        /^(?:test[-_]?app|demo[-_]?app|mock[-_]?app|supabase[-_]?preview)$/i.test(app.id)
      ) {
        return false;
      }
      // Phase 1: Hide every catalog entry that lacks a direct .AppImage URL and a SHA-256 from the main listing by default
      if (!options.includeUnverifiedImports && !isEligibleForMainListing(app)) {
        return false;
      }
      if (qLower) {
        const hay = `${app.name} ${app.tagline || ''} ${app.description || ''} ${app.category} ${app.simplifiedCategory || ''} ${app.publisher.name} ${(app.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      if (options.category !== 'All') {
        const simplified = app.simplifiedCategory || mapToSimplifiedCategory(app.category);
        if (app.category !== options.category && simplified !== options.category) return false;
      }
      if (options.arch !== 'All' && !app.architectures.includes(options.arch as any)) {
        return false;
      }
      if (options.onlyVerified && (!app.publisher.verified || !isGenuineSha256(app.sha256))) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (options.sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (options.sortBy === 'recent') {
        const tsB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        const tsA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        if (tsB !== tsA) return (Number.isFinite(tsB) ? tsB : 0) - (Number.isFinite(tsA) ? tsA : 0);
        return a.name.localeCompare(b.name);
      }
      if (a.publisher.verified && !b.publisher.verified) return -1;
      if (!a.publisher.verified && b.publisher.verified) return 1;
      const aComm = isCommunitySubmitted(a);
      const bComm = isCommunitySubmitted(b);
      if (aComm && !bComm) return -1;
      if (!aComm && bComm) return 1;
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.name.localeCompare(b.name);
    });
}

function mergeCatalogWithCommunity(
  staticApps: AppMetadata[],
  communityApps: AppMetadata[]
): AppMetadata[] {
  if (!communityApps || communityApps.length === 0) return staticApps;
  const seen = new Set<string>();
  const merged: AppMetadata[] = [];

  for (const app of communityApps) {
    const key = app.id.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(app);
    }
  }
  for (const app of staticApps) {
    const key = app.id.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(app);
    }
  }
  return merged;
}

export interface AppProps {
  initialCatalogOverride?: unknown[];
}

export function App({ initialCatalogOverride }: AppProps = {}) {
  const { user } = useAuth();
  const initialRoute = useMemo(() => parseCurrentLocation(), []);

  const overrideValidation = useMemo(() => {
    if (!initialCatalogOverride) return null;
    return validateCatalogAtRuntime(initialCatalogOverride);
  }, [initialCatalogOverride]);

  const [communityApps, setCommunityApps] = useState<AppMetadata[]>([]);

  // Clear any legacy local preview/test apps stored in localStorage
  // and fetch published community submissions from Cloudflare Worker GET /api/apps.
  // Handles errors/offline gracefully so the static catalog always works when the Worker is down.
  useEffect(() => {
    try {
      localStorage.removeItem('niruvi_custom_apps');
      localStorage.removeItem('niruvi_test_data');
      localStorage.removeItem('niruvi_demo_user');
      localStorage.removeItem('niruvi_mock_session');
    } catch {}

    if (initialCatalogOverride) return;
    let cancelled = false;

    async function fetchWorkerApps() {
      if (!HAS_API_BACKEND) return;
      try {
        const res = await fetchWithTimeoutAndRetry(buildApiUrl('/api/apps'), {
          timeoutMs: 6000,
          retries: 1,
        });
        const contentType = res.headers?.get?.('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data?.apps)) return;

        const mappedWorkerApps: AppMetadata[] = [];
        for (const raw of data.apps) {
          const mapped = mapWorkerSubmissionToAppMetadata(raw);
          if (
            mapped &&
            !/supabase\s*preview/i.test(mapped.name) &&
            !/^(?:test[-_]?app|demo[-_]?app|mock[-_]?app)$/i.test(mapped.id)
          ) {
            mappedWorkerApps.push(mapped);
          }
        }

        if (mappedWorkerApps.length > 0) {
          setCommunityApps((prev) => mergeCatalogWithCommunity(prev, mappedWorkerApps));
        }
      } catch {
        // Worker is offline or unreachable; fall back silently to static catalog
      }
    }

    fetchWorkerApps();
    return () => {
      cancelled = true;
    };
  }, [initialCatalogOverride]);

  const baseSeedCatalog = useMemo(() => {
    if (overrideValidation && overrideValidation.errors.length === 0) {
      return mergeCatalogWithCommunity(
        overrideValidation.validApps as unknown as AppMetadata[],
        communityApps
      );
    }
    return mergeCatalogWithCommunity(APPS_CATALOG, communityApps);
  }, [overrideValidation, communityApps]);

  const [legalRoute, setLegalRoute] = useState<LegalRoute>(initialRoute.legalRoute);
  const [activeTab, setActiveTab] = useState<NavTab>(initialRoute.activeTab);
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('niruvi_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('niruvi_theme', theme);
    } catch {}
  }, [theme]);

  const initialUrlParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const [searchQuery, setSearchQuery] = useState(() => initialUrlParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const cat = initialUrlParams.get('category');
    return cat && SIMPLIFIED_CATEGORIES.includes(cat as any) ? cat : 'All';
  });
  const [selectedArch, setSelectedArch] = useState<'All' | 'x86_64' | 'aarch64' | 'armhf'>(() => {
    const arch = initialUrlParams.get('arch');
    return arch === 'x86_64' || arch === 'aarch64' || arch === 'armhf' ? arch : 'All';
  });
  const [onlyVerified, setOnlyVerified] = useState(() => initialUrlParams.get('verified') === '1');
  const [includeUnverifiedImports, setIncludeUnverifiedImports] = useState(
    () => initialUrlParams.get('unverified') === '1'
  );
  const [showCleanupReport, setShowCleanupReport] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('niruvi_welcome_dismissed') === '1';
    } catch {
      return false;
    }
  });
  const [forceLoadingPreview, setForceLoadingPreview] = useState<boolean>(
    () => initialUrlParams.get('screen') === 'loading'
  );
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const s = initialUrlParams.get('sort');
    return s === 'name' || s === 'recent' || s === 'featured' ? s : 'featured';
  });
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const p = parseInt(initialUrlParams.get('page') || '1', 10);
    return Number.isFinite(p) && p >= 1 ? p : 1;
  });

  // Server-paginated state + fallback full catalog cache for static preview
  const fullCatalogCacheRef = useRef<AppMetadata[] | null>(null);
  const [serverPage, setServerPage] = useState<{
    key: string;
    items: AppMetadata[];
    total: number;
  } | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(() => isSlowOrOfflineConnection().offline);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const queryKey = `${currentPage}|${searchQuery.trim()}|${selectedCategory}|${selectedArch}|${onlyVerified}|${includeUnverifiedImports}|${sortBy}`;
  const isDefaultFirstPage =
    currentPage === 1 &&
    !searchQuery.trim() &&
    selectedCategory === 'All' &&
    selectedArch === 'All' &&
    !onlyVerified &&
    sortBy === 'featured';

  const loadPaginatedPage = useCallback(async () => {
    setCatalogError(null);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(PAGE_SIZE),
      q: searchQuery.trim(),
      category: selectedCategory,
      arch: selectedArch,
      verified: onlyVerified || !includeUnverifiedImports ? '1' : '0',
      sort: sortBy,
    });

    setCatalogLoading(true);
    try {
      if (HAS_API_BACKEND) {
        const res = await fetch(buildApiUrl(`/api/catalog?${params.toString()}`));
        const contentType = res.headers?.get?.('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data?.items) && typeof data?.total === 'number') {
            const filteredItems = filterAndSortCatalog(data.items, {
              q: searchQuery,
              category: selectedCategory,
              arch: selectedArch,
              onlyVerified,
              includeUnverifiedImports,
              sortBy,
            });
            setServerPage({
              key: queryKey,
              items: filteredItems,
              total: includeUnverifiedImports ? data.total : filteredItems.length,
            });
            setCatalogLoading(false);
            return;
          }
        }
      }

      // Static preview / GitHub Pages fallback: load catalog.json respecting BASE_URL
      if (!fullCatalogCacheRef.current) {
        try {
          const staticRes = await fetch(withBaseUrl('catalog.json'));
          const staticType = staticRes.headers?.get?.('content-type') || '';
          if (staticRes.ok && staticType.includes('application/json')) {
            const allItems = await staticRes.json();
            if (Array.isArray(allItems) && allItems.length > 0) {
              fullCatalogCacheRef.current = allItems;
            }
          }
        } catch {
          // If offline, use synchronous APPS_CATALOG below
        }
      }

      const sourceCatalog = fullCatalogCacheRef.current || APPS_CATALOG;
      const mergedFull = mergeCatalogWithCommunity(sourceCatalog, communityApps);
      const filtered = filterAndSortCatalog(mergedFull, {
        q: searchQuery,
        category: selectedCategory,
        arch: selectedArch,
        onlyVerified,
        includeUnverifiedImports,
        sortBy,
      });
      const start = (currentPage - 1) * PAGE_SIZE;
      setServerPage({
        key: queryKey,
        items: filtered.slice(start, start + PAGE_SIZE),
        total: filtered.length,
      });
    } catch {
      // Offline or test environment without network mock: rely on synchronous seed filter
    } finally {
      setCatalogLoading(false);
    }
  }, [
    currentPage,
    searchQuery,
    selectedCategory,
    selectedArch,
    onlyVerified,
    includeUnverifiedImports,
    sortBy,
    queryKey,
    communityApps,
  ]);

  useEffect(() => {
    loadPaginatedPage();
  }, [loadPaginatedPage]);

  // Selected app modal
  const [selectedApp, setSelectedApp] = useState<AppMetadata | null>(() => {
    if (initialRoute.appId) {
      return (
        baseSeedCatalog.find(
          (a: AppMetadata) => a.id.toLowerCase() === initialRoute.appId!.toLowerCase()
        ) || null
      );
    }
    return null;
  });

  // Sync active filters to URL query string
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      legalRoute !== 'store' ||
      activeTab !== 'browse' ||
      selectedApp
    ) {
      return;
    }
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (selectedArch !== 'All') params.set('arch', selectedArch);
    if (onlyVerified) params.set('verified', '1');
    if (sortBy !== 'featured') params.set('sort', sortBy);
    if (currentPage > 1) params.set('page', String(currentPage));
    const qs = params.toString();
    const nextUrl = qs ? `/?${qs}` : '/';
    try {
      window.history.replaceState(null, '', nextUrl);
    } catch {}
  }, [
    searchQuery,
    selectedCategory,
    selectedArch,
    onlyVerified,
    sortBy,
    currentPage,
    legalRoute,
    activeTab,
    selectedApp,
  ]);

  // Synchronous fallback calculation so immediate filter changes work without waiting a tick
  const syncFiltered = useMemo(() => {
    const source = initialCatalogOverride
      ? baseSeedCatalog
      : mergeCatalogWithCommunity(fullCatalogCacheRef.current || baseSeedCatalog, communityApps);
    return filterAndSortCatalog(source, {
      q: searchQuery,
      category: selectedCategory,
      arch: selectedArch,
      onlyVerified,
      includeUnverifiedImports,
      sortBy,
    });
  }, [
    initialCatalogOverride,
    baseSeedCatalog,
    communityApps,
    searchQuery,
    selectedCategory,
    selectedArch,
    onlyVerified,
    includeUnverifiedImports,
    sortBy,
  ]);

  const activePageItems = useMemo(() => {
    if (!initialCatalogOverride && serverPage && serverPage.key === queryKey) {
      if (currentPage === 1 && communityApps.length > 0) {
        const merged = filterAndSortCatalog(
          mergeCatalogWithCommunity(serverPage.items, communityApps),
          {
            q: searchQuery,
            category: selectedCategory,
            arch: selectedArch,
            onlyVerified,
            includeUnverifiedImports,
            sortBy,
          }
        );
        return merged.slice(0, PAGE_SIZE);
      }
      return serverPage.items;
    }
    if (!initialCatalogOverride && isDefaultFirstPage && communityApps.length === 0) {
      return syncFiltered.slice(0, PAGE_SIZE);
    }
    const start = (currentPage - 1) * PAGE_SIZE;
    return syncFiltered.slice(start, start + PAGE_SIZE);
  }, [
    initialCatalogOverride,
    serverPage,
    queryKey,
    isDefaultFirstPage,
    currentPage,
    syncFiltered,
    communityApps,
    searchQuery,
    selectedCategory,
    selectedArch,
    onlyVerified,
    includeUnverifiedImports,
    sortBy,
  ]);

  const totalMatchingApps = useMemo(() => {
    if (!initialCatalogOverride && serverPage && serverPage.key === queryKey) {
      return serverPage.total + communityApps.length;
    }
    if (!initialCatalogOverride && isDefaultFirstPage && !fullCatalogCacheRef.current) {
      if (includeUnverifiedImports) {
        return (
          TOTAL_CATALOG_COUNT -
          CATALOG_CLEANUP_REPORT.affectedCounts.policyFlaggedCount +
          communityApps.length
        );
      }
      return VERIFIED_DIRECT_CATALOG_COUNT + communityApps.length;
    }
    return syncFiltered.length;
  }, [
    initialCatalogOverride,
    serverPage,
    queryKey,
    isDefaultFirstPage,
    includeUnverifiedImports,
    syncFiltered,
    communityApps.length,
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMatchingApps / PAGE_SIZE));
  const pageStart = totalMatchingApps === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd =
    totalMatchingApps === 0
      ? 0
      : Math.min(totalMatchingApps, (currentPage - 1) * PAGE_SIZE + activePageItems.length);

  // If deep-linked to an app ID, check local catalog first, then fetch from /api/catalog/:id if backend is available
  useEffect(() => {
    if (initialRoute.appId && !selectedApp) {
      const targetId = initialRoute.appId.toLowerCase();
      const localMatch = APPS_CATALOG.find((a) => a.id.toLowerCase() === targetId);
      if (localMatch) {
        setSelectedApp(localMatch);
        return;
      }
      if (HAS_API_BACKEND) {
        fetch(buildApiUrl(`/api/catalog/${encodeURIComponent(initialRoute.appId)}`))
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.app) setSelectedApp(data.app);
          })
          .catch(() => {});
      }
    }
  }, [initialRoute.appId, selectedApp]);

  const [installApp, setInstallApp] = useState<AppMetadata | null>(null);
  const [installArch, setInstallArch] = useState<string>('x86_64');
  const [verifierInitialHash, setVerifierInitialHash] = useState<string>('');
  const [autoOpenReportModal, setAutoOpenReportModal] = useState<boolean>(false);

  // Saved / Starred apps in localStorage
  const [starredIds, setStarredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('niruvi_starred_apps');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Download History in localStorage
  const [downloadHistory, setDownloadHistory] = useState<
    { appId: string; version?: string; timestamp: string; arch: string }[]
  >(() => {
    try {
      const saved = localStorage.getItem('niruvi_download_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Phase 3: Sync saved library & download history from Supabase when user signs in
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    fetchUserLibraryFromSupabase(user.id).then((rows) => {
      if (cancelled || rows.length === 0) return;
      setStarredIds((prev) => {
        const merged = Array.from(new Set([...prev, ...rows.map((r) => r.appSlug)]));
        try {
          localStorage.setItem('niruvi_starred_apps', JSON.stringify(merged));
        } catch {}
        return merged;
      });
    });

    fetchUserDownloadsFromSupabase(user.id).then((rows) => {
      if (cancelled || rows.length === 0) return;
      setDownloadHistory((prev) => {
        const seen = new Set(prev.map((d) => d.appId));
        const merged = [...prev];
        for (const r of rows) {
          if (!seen.has(r.appId)) {
            seen.add(r.appId);
            merged.push(r);
          }
        }
        const trimmed = merged.slice(0, 25);
        try {
          localStorage.setItem('niruvi_download_history', JSON.stringify(trimmed));
        } catch {}
        return trimmed;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3000);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseCurrentLocation();
      setLegalRoute(parsed.legalRoute);
      setActiveTab(parsed.activeTab);
      if (parsed.appId) {
        const found =
          activePageItems.find((a) => a.id.toLowerCase() === parsed.appId!.toLowerCase()) ||
          APPS_CATALOG.find((a) => a.id.toLowerCase() === parsed.appId!.toLowerCase()) ||
          null;
        setSelectedApp(found);
      } else {
        setSelectedApp(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [activePageItems]);

  // Dynamic SEO, Canonical URL, Open Graph tags, and SoftwareApplication JSON-LD
  useEffect(() => {
    if (legalRoute === 'privacy') {
      updatePageSeo({
        title: 'Privacy Policy — Niruvi Store',
        description: 'Privacy Policy and data handling details for Niruvi Store.',
        path: '/privacy',
      });
      return;
    }
    if (legalRoute === 'terms') {
      updatePageSeo({
        title: 'Terms & Conditions — Niruvi Store',
        description: 'Terms and Conditions for using the Niruvi Store Linux AppImage catalog.',
        path: '/terms',
      });
      return;
    }
    if (legalRoute === 'cookies') {
      updatePageSeo({
        title: 'Cookie Policy — Niruvi Store',
        description: 'Cookie and localStorage usage details for Niruvi Store.',
        path: '/cookies',
      });
      return;
    }
    if (legalRoute === 'refunds') {
      updatePageSeo({
        title: 'Refund Policy — Niruvi Store',
        description: 'Open-source software catalog notice for Niruvi Store.',
        path: '/refunds',
      });
      return;
    }

    if (selectedApp) {
      updatePageSeo({
        app: selectedApp,
      });
      return;
    }

    if (activeTab === 'verifier') {
      updatePageSeo({
        title: 'Client-Side SHA-256 AppImage Verifier — Niruvi Store',
        description:
          'Verify downloaded Linux .AppImage files locally in your browser using Web Crypto SHA-256.',
        path: '/verifier',
      });
      return;
    }

    if (activeTab === 'submit') {
      updatePageSeo({
        title: 'Submit a Linux AppImage — Niruvi Store',
        description: 'Submit an open-source Linux AppImage package to the Niruvi Store catalog.',
        path: '/submit',
      });
      return;
    }

    if (activeTab === 'library') {
      updatePageSeo({
        title: 'Saved Applications — Niruvi Store',
        description: 'Manage your bookmarked Linux AppImage packages.',
        path: '/library',
      });
      return;
    }

    if (activeTab === 'donate' || legalRoute === 'donate') {
      updatePageSeo({
        title: 'Support & Donate — Niruvi Store',
        description:
          'Support open-source Linux AppImage indexing, SHA-256 verification, and niruvi:// desktop launcher development.',
        path: '/donate',
      });
      return;
    }

    updatePageSeo({
      title: `Niruvi Store — ${TOTAL_CATALOG_COUNT.toLocaleString()} Linux AppImage Applications`,
      description: `Browse ${TOTAL_CATALOG_COUNT.toLocaleString()} Linux AppImage packages from AppImageHub and GitHub Releases with direct upstream downloads and SHA-256 verification.`,
      path: '/',
    });
  }, [legalRoute, activeTab, selectedApp]);

  const navigateLegal = useCallback((route: LegalRoute) => {
    if (route === 'donate') {
      setLegalRoute('store');
      setActiveTab('donate');
    } else {
      setLegalRoute(route);
    }
    setSelectedApp(null);
    try {
      const targetPath = route === 'store' ? withBaseUrl('/') : withBaseUrl(route);
      window.history.pushState({}, '', targetPath);
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleTabChange = useCallback((tab: NavTab) => {
    setLegalRoute('store');
    setActiveTab(tab);
    setSelectedApp(null);
    try {
      const targetPath = tab === 'browse' ? withBaseUrl('/') : withBaseUrl(tab);
      window.history.pushState({}, '', targetPath);
    } catch {}
  }, []);

  const handleSelectApp = useCallback((app: AppMetadata | null) => {
    setSelectedApp(app);
    try {
      if (app) {
        window.history.pushState({}, '', withBaseUrl(`app/${encodeURIComponent(app.id)}`));
      } else {
        window.history.pushState({}, '', withBaseUrl('/'));
      }
    } catch {}
  }, []);

  const handleToggleStar = useCallback(
    (appId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setStarredIds((prev) => {
        const exists = prev.includes(appId);
        const next = exists ? prev.filter((id) => id !== appId) : [...prev, appId];
        try {
          localStorage.setItem('niruvi_starred_apps', JSON.stringify(next));
        } catch {}
        if (user?.id) {
          const catalogMatch =
            (fullCatalogCacheRef.current || APPS_CATALOG).find((a) => a.id === appId);
          syncLibraryBookmarkWithSupabase({
            userId: user.id,
            appSlug: appId,
            pinnedVersion: catalogMatch?.version,
            bookmarked: !exists,
          });
        }
        showToast(exists ? 'Removed from Saved' : 'Saved to Library', 'info');
        return next;
      });
    },
    [showToast, user?.id]
  );

  const recordDownload = useCallback(
    (appId: string, version: string, arch: string) => {
      setDownloadHistory((prev) => {
        const filtered = prev.filter((item) => item.appId !== appId);
        const next = [
          { appId, version, timestamp: new Date().toISOString(), arch },
          ...filtered,
        ].slice(0, 25);
        try {
          localStorage.setItem('niruvi_download_history', JSON.stringify(next));
        } catch {}
        return next;
      });
      recordAppDownload({
        userId: user?.id || null,
        appSlug: appId,
        version,
        arch,
      });
    },
    [user?.id]
  );

  const removeSingleInstalled = useCallback(
    (appId: string) => {
      setDownloadHistory((prev) => {
        const next = prev.filter((item) => item.appId !== appId);
        try {
          localStorage.setItem('niruvi_download_history', JSON.stringify(next));
        } catch {}
        return next;
      });
      showToast('Removed from Installed Library', 'info');
    },
    [showToast]
  );

  const clearHistory = useCallback(() => {
    setDownloadHistory([]);
    try {
      localStorage.removeItem('niruvi_download_history');
    } catch {}
    showToast('Download history cleared', 'info');
  }, [showToast]);

  const handleInstallClick = (app: AppMetadata, e: React.MouseEvent, arch?: string) => {
    e.stopPropagation();
    const chosenArch = arch || (selectedArch !== 'All' ? selectedArch : app.architectures[0]);
    setInstallArch(chosenArch);
    setInstallApp(app);
    recordDownload(app.id, app.version, chosenArch);
  };

  const handleOpenVerifierWithHash = (hash: string) => {
    setVerifierInitialHash(hash);
    setSelectedApp(null);
    handleTabChange('verifier');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedArch('All');
    setOnlyVerified(false);
    setIncludeUnverifiedImports(false);
    setSortBy('featured');
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, newPage));
    setCurrentPage(clamped);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0c] text-neutral-100 font-sans selection:bg-sky-500/30 selection:text-sky-200 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-lg focus:bg-sky-500 focus:text-black focus:font-semibold focus:text-xs"
      >
        Skip to main content
      </a>

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-700 shadow-xl text-xs font-medium text-white"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
          if (legalRoute !== 'store') navigateLegal('store');
        }}
        totalApps={TOTAL_CATALOG_COUNT}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        starredCount={starredIds.length}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        showSearch={legalRoute === 'store' && activeTab === 'browse'}
      />

      {/* Main Content — Direct flex-1 child of .min-h-screen.flex-col for footer pinning */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 grow w-full max-w-5xl min-w-0 mx-auto px-4 sm:px-6 lg:px-12 py-6 focus:outline-none"
      >
        <ErrorBoundary>
          {legalRoute === 'privacy' ? (
            <Privacy
              onBackToStore={() => navigateLegal('store')}
              onOpenCookieSettings={() => setCookieSettingsOpen(true)}
            />
          ) : legalRoute === 'terms' ? (
            <Terms onBackToStore={() => navigateLegal('store')} />
          ) : legalRoute === 'cookies' ? (
            <Cookies
              onBackToStore={() => navigateLegal('store')}
              onOpenCookieSettings={() => setCookieSettingsOpen(true)}
            />
          ) : legalRoute === 'refunds' ? (
            <Refunds onBackToStore={() => navigateLegal('store')} />
          ) : (
            <>
            {isOffline && (
              <EmptyErrorOfflineScreen
                mode="offline"
                onRetry={loadPaginatedPage}
              />
            )}

            {activeTab === 'verifier' && (
              <IntegrityVerifierView
                catalog={APPS_CATALOG}
                onSelectApp={(app) => handleSelectApp(app)}
                initialExpectedHash={verifierInitialHash}
              />
            )}

            {activeTab === 'library' && (
              <MyLibraryView
                catalog={fullCatalogCacheRef.current || APPS_CATALOG}
                installedRecords={downloadHistory.map((d) => {
                  const catalogMatch = (fullCatalogCacheRef.current || APPS_CATALOG).find(
                    (a) => a.id === d.appId
                  );
                  return {
                    appId: d.appId,
                    installedVersion: d.version || catalogMatch?.version || 'unknown',
                    installedAt: d.timestamp,
                    installMethod: 'direct',
                    installDirectory: '~/Applications',
                  };
                })}
                bookmarkedIds={starredIds}
                onSelectApp={(app) => handleSelectApp(app)}
                onOpenInstall={(app) => {
                  setInstallApp(app);
                  recordDownload(app.id, app.version, app.architectures[0] || 'x86_64');
                }}
                onRefreshLibrary={clearHistory}
                onToggleBookmark={handleToggleStar}
                onRemoveInstalled={removeSingleInstalled}
              />
            )}

            {activeTab === 'submit' && (
              <SubmitAppView
                onAppAdded={(newApp) => {
                  setCommunityApps((prev) => mergeCatalogWithCommunity([newApp], prev));
                  showToast(`Published "${newApp.name}" to community catalog.`, 'success');
                }}
                onNavigateToStore={() => handleTabChange('browse')}
              />
            )}

            {activeTab === 'admin' && (
              <AdminModerationView onBackToStore={() => handleTabChange('browse')} />
            )}

            {activeTab === 'donate' && (
              <Donate
                onBackToStore={() => handleTabChange('browse')}
                onViewRefundPolicy={() => navigateLegal('refunds')}
              />
            )}

            {overrideValidation && overrideValidation.errors.length > 0 && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300"
              >
                <p className="font-semibold text-white mb-1">Catalog Schema Validation Failed</p>
                <p>{overrideValidation.errors[0].message}</p>
              </div>
            )}

            {activeTab === 'browse' && (
              <>
                {/* Clean, Concise Software Catalog Header */}
                <div className="mb-4 pb-5 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      Linux AppImage Software Directory
                    </h1>
                    <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                      Showing {VERIFIED_DIRECT_CATALOG_COUNT.toLocaleString()} verified direct{' '}
                      <code className="text-neutral-200 font-mono">.AppImage</code> packages with
                      SHA-256 checksums ({HIDDEN_UNVERIFIED_CATALOG_COUNT.toLocaleString()}{' '}
                      unverified{' '}
                      <a
                        href="https://appimage.github.io/feed.json"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-neutral-300 hover:text-white"
                      >
                        AppImageHub
                      </a>{' '}
                      entries hidden by default; no data deleted).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 font-mono shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCleanupReport((prev) => !prev)}
                      aria-expanded={showCleanupReport}
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-sky-400 font-sans font-medium text-xs transition-colors cursor-pointer"
                    >
                      {showCleanupReport ? 'Hide Cleanup Report' : 'Catalog Audit Report'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIncludeUnverifiedImports((prev) => !prev);
                        setCurrentPage(1);
                      }}
                      aria-pressed={includeUnverifiedImports}
                      className={`px-2.5 py-1.5 rounded-lg border font-sans font-medium text-xs transition-colors cursor-pointer ${
                        includeUnverifiedImports
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                      }`}
                    >
                      {includeUnverifiedImports
                        ? 'Hide Unverified Imports'
                        : `Show Unverified (${(HIDDEN_UNVERIFIED_CATALOG_COUNT - CATALOG_CLEANUP_REPORT.affectedCounts.policyFlaggedCount).toLocaleString()})`}
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>
                </div>

                {/* Phase 1 Catalog Cleanup & Audit Report Drawer */}
                {showCleanupReport && (
                  <section
                    aria-label="Catalog cleanup report"
                    className="mb-6 p-4 sm:p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-300 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-white">
                        Phase 1 Catalog Cleanup &amp; Verification Report
                      </h2>
                      <span className="font-mono text-[11px] text-neutral-400">
                        Total entries preserved: {CATALOG_CLEANUP_REPORT.totalCatalogEntries.toLocaleString()} (0 deleted)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                      <div className="p-3 rounded-xl bg-neutral-950 border border-emerald-500/30">
                        <div className="text-emerald-400 text-sm font-bold">
                          {CATALOG_CLEANUP_REPORT.mainListingEligibleCount.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-sans mt-0.5">
                          Direct .AppImage + SHA-256 (Shown)
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                        <div className="text-amber-300 text-sm font-bold">
                          {CATALOG_CLEANUP_REPORT.affectedCounts.lackingDirectAppImageUrl.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-sans mt-0.5">
                          Missing direct .AppImage URL (Hidden)
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                        <div className="text-amber-300 text-sm font-bold">
                          {CATALOG_CLEANUP_REPORT.affectedCounts.lackingVerifiedSha256.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-sans mt-0.5">
                          Missing SHA-256 &amp; Version unknown (Hidden)
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-neutral-950 border border-rose-500/30">
                        <div className="text-rose-400 text-sm font-bold">
                          {CATALOG_CLEANUP_REPORT.affectedCounts.policyFlaggedCount.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-sans mt-0.5">
                          Policy-flagged blocked ({CATALOG_CLEANUP_REPORT.policyFlaggedEntries.map((e) => e.id).join(', ')})
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Additional metadata gaps in hidden feed entries:{' '}
                      <strong className="text-neutral-200">
                        {CATALOG_CLEANUP_REPORT.affectedCounts.emptySize.toLocaleString()}
                      </strong>{' '}
                      missing file size,{' '}
                      <strong className="text-neutral-200">
                        {CATALOG_CLEANUP_REPORT.affectedCounts.emptyLicense.toLocaleString()}
                      </strong>{' '}
                      missing license, and{' '}
                      <strong className="text-neutral-200">
                        {CATALOG_CLEANUP_REPORT.affectedCounts.emptyDescription.toLocaleString()}
                      </strong>{' '}
                      missing description.
                    </p>
                  </section>
                )}

                {/* Welcome / Intro Screen (Dismissible Quick-Start Guide) */}
                <WelcomeIntroScreen
                  totalVerifiedCount={VERIFIED_DIRECT_CATALOG_COUNT}
                  isDismissed={welcomeDismissed}
                  onDismiss={() => {
                    setWelcomeDismissed(true);
                    try {
                      localStorage.setItem('niruvi_welcome_dismissed', '1');
                    } catch {}
                  }}
                  onReopen={() => {
                    setWelcomeDismissed(false);
                    try {
                      localStorage.removeItem('niruvi_welcome_dismissed');
                    } catch {}
                  }}
                  onOpenVerifier={() => handleTabChange('verifier')}
                  onOpenSubmit={() => handleTabChange('submit')}
                  onQuickSearch={(q) => {
                    setSearchQuery(q);
                    setCurrentPage(1);
                  }}
                />

                {/* Filter Bar with Category, Arch, Verified SHA-256, Sort & Visible Count */}
                <FilterBar
                  selectedCategory={selectedCategory}
                  onSelectCategory={(cat) => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  selectedArch={selectedArch}
                  onSelectArch={(arch) => {
                    setSelectedArch(arch);
                    setCurrentPage(1);
                  }}
                  onlyVerified={onlyVerified}
                  onToggleVerified={() => {
                    setOnlyVerified((v) => !v);
                    setCurrentPage(1);
                  }}
                  sortBy={sortBy}
                  onSortChange={(s) => {
                    setSortBy(s);
                    setCurrentPage(1);
                  }}
                  resultCount={totalMatchingApps}
                  pageStart={pageStart}
                  pageEnd={pageEnd}
                  onResetFilters={resetAllFilters}
                />

                {/* Search Screen Suggestions & Active Search Summary */}
                <SearchDiscoveryBar
                  searchQuery={searchQuery}
                  resultCount={totalMatchingApps}
                  onSearchChange={(q) => {
                    setSearchQuery(q);
                    setCurrentPage(1);
                  }}
                  onClearSearch={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                />

                {/* Error State */}
                {catalogError && (
                  <EmptyErrorOfflineScreen
                    mode="error"
                    description={catalogError}
                    onRetry={loadPaginatedPage}
                  />
                )}

                {/* Loading Screen State */}
                {forceLoadingPreview && (
                  <div className="mb-6">
                    <CatalogLoadingScreen />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setForceLoadingPreview(false)}
                        className="text-xs text-sky-400 hover:text-sky-300 underline cursor-pointer"
                      >
                        Dismiss loading preview
                      </button>
                    </div>
                  </div>
                )}

                {/* Application Grid (48 per page) or Empty State */}
                {activePageItems.length > 0 ? (
                  <>
                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch w-full min-w-0 transition-opacity ${
                        catalogLoading ? 'opacity-75' : 'opacity-100'
                      }`}
                    >
                      {activePageItems.map((app: AppMetadata) => (
                        <AppCard
                          key={app.id}
                          app={app}
                          onSelect={(a: AppMetadata) => {
                            setAutoOpenReportModal(false);
                            handleSelectApp(a);
                          }}
                          onInstall={handleInstallClick}
                          isStarred={starredIds.includes(app.id)}
                          onToggleStar={handleToggleStar}
                          onReport={(a: AppMetadata, e: React.MouseEvent) => {
                            e.stopPropagation();
                            setAutoOpenReportModal(true);
                            handleSelectApp(a);
                          }}
                        />
                      ))}
                    </div>

                    {/* Server-Side Pagination Controls */}
                    {totalPages > 1 && (
                      <nav
                        aria-label="Catalog pagination"
                        className="mt-8 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4"
                      >
                        <p className="text-xs text-neutral-400 font-mono">
                          Showing {pageStart.toLocaleString()}-{pageEnd.toLocaleString()} of{' '}
                          {totalMatchingApps.toLocaleString()} apps (Page {currentPage} of{' '}
                          {totalPages})
                        </p>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            aria-label="Previous page"
                            className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:pointer-events-none text-neutral-200 border border-neutral-800 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Previous</span>
                          </button>

                          {/* Page number buttons */}
                          {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                            let pageNum = idx + 1;
                            if (totalPages > 5) {
                              const startPage = Math.max(
                                1,
                                Math.min(currentPage - 2, totalPages - 4)
                              );
                              pageNum = startPage + idx;
                            }
                            return (
                              <button
                                type="button"
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                aria-current={currentPage === pageNum ? 'page' : undefined}
                                className={`min-w-[34px] px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium transition-colors cursor-pointer ${
                                  currentPage === pageNum
                                    ? 'bg-sky-600 text-white border-sky-500'
                                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            aria-label="Next page"
                            className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:pointer-events-none text-neutral-200 border border-neutral-800 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Next</span>
                            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </nav>
                    )}
                  </>
                ) : (
                  <EmptyErrorOfflineScreen
                    mode="empty"
                    onResetFilters={resetAllFilters}
                    onSuggestionClick={(q) => {
                      resetAllFilters();
                      setSearchQuery(q);
                    }}
                  />
                )}
              </>
            )}
            </>
          )}
        </ErrorBoundary>
      </main>

      <Footer
        currentRoute={legalRoute}
        onNavigate={navigateLegal}
        onOpenCookieSettings={() => setCookieSettingsOpen(true)}
      />

      <CookieConsent
        isOpen={cookieSettingsOpen}
        onCloseManage={() => setCookieSettingsOpen(false)}
        onNavigateLegal={navigateLegal}
      />

      <AppDetailModal
        app={selectedApp}
        onClose={() => {
          setAutoOpenReportModal(false);
          handleSelectApp(null);
        }}
        onInstall={handleInstallClick}
        isStarred={selectedApp ? starredIds.includes(selectedApp.id) : false}
        onToggleStar={handleToggleStar}
        onOpenVerifierWithHash={handleOpenVerifierWithHash}
        onShowToast={showToast}
        initialOpenReport={autoOpenReportModal}
      />

      <InstallModal
        app={installApp}
        selectedArch={installArch}
        onClose={() => setInstallApp(null)}
      />

      <AuthModal />
      <AccountManagementModal />
    </div>
  );
}
export default App;
