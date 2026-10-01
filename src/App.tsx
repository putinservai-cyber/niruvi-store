import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Navbar, NavView } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { AppCard } from './components/AppCard';
import { AppDetailModal } from './components/AppDetailModal';
import { InstallModal } from './components/InstallModal';
import { IntegrityVerifierView } from './components/IntegrityVerifierView';
import { MyLibraryView } from './components/MyLibraryView';
import { SubmitAppView } from './components/SubmitAppView';
import { NiruviInfoModal } from './components/NiruviInfoModal';
import { JsonExportModal } from './components/JsonExportModal';
import { AuthModal } from './components/AuthModal';
import { AccountManagementModal } from './components/AccountManagementModal';
import { AdminDashboard } from './components/AdminDashboard';
import { SecurityPlatformView } from './components/SecurityPlatformView';
import { NiruviBridgeModal } from './components/NiruviBridgeModal';
import { SponsorModal } from './components/SponsorModal';
import { PaymentModal } from './components/PaymentModal';
import { PricingModal } from './components/PricingModal';
import { Footer, LegalRoute } from './components/Footer';
import { CookieConsent } from './components/CookieConsent';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Cookies } from './pages/Cookies';
import { Refunds } from './pages/Refunds';
import { APPS_CATALOG } from './data/apps';
import {
  AppMetadata,
  Architecture,
  Category,
  FilterState,
  InstalledAppRecord,
  LicenseType,
  TrustTier,
} from './types';
import { AppIcon } from './components/AppIcon';
import { useAuth } from './context/AuthContext';
import {
  getInstalledApps,
  getBookmarkedAppIds,
  toggleBookmark,
  getCustomApps,
} from './utils/storage';
import { validateCatalogAtRuntime } from './utils/catalogSchema';
import {
  ShieldCheck,
  Search,
  SearchX,
  Download,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

function parseInitialFiltersFromUrl(): FilterState {
  if (typeof window === 'undefined') {
    return {
      searchQuery: '',
      category: 'All',
      architecture: 'All',
      licenseCategory: 'All',
      trustTier: 'All',
      sortBy: 'featured',
    };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    searchQuery: params.get('q') || '',
    category: (params.get('category') as Category) || 'All',
    architecture: (params.get('arch') as Architecture | 'All') || 'All',
    licenseCategory: (params.get('license') as LicenseType) || 'All',
    trustTier: (params.get('trust') as TrustTier | 'All') || 'All',
    sortBy: (params.get('sort') as FilterState['sortBy']) || 'featured',
  };
}

function parseRouteFromLocation(): { view: NavView; appId: string | null } {
  if (typeof window === 'undefined') {
    return { view: 'store', appId: null };
  }

  // Check ?p= from GitHub Pages 404.html redirect or hash or pathname
  const searchParams = new URLSearchParams(window.location.search);
  const redirectedPath = searchParams.get('p') || '';
  const rawHash = window.location.hash.replace(/^#\/?/, '');
  const rawPathname = window.location.pathname.replace(/^\/niruvi-store\/?/, '').replace(/^\/+/, '');

  const candidate = (redirectedPath.replace(/^\/+/, '') || rawHash || rawPathname).split('?')[0];

  if (candidate.startsWith('app/')) {
    const appId = decodeURIComponent(candidate.slice('app/'.length).trim());
    return { view: 'store', appId: appId || null };
  }

  const validViews: NavView[] = [
    'store',
    'library',
    'verifier',
    'submit',
    'admin',
    'security',
    'privacy',
    'terms',
    'cookies',
    'refunds',
  ];
  if (validViews.includes(candidate as NavView)) {
    return { view: candidate as NavView, appId: null };
  }

  return { view: 'store', appId: null };
}

export interface AppProps {
  initialCatalogOverride?: unknown;
  initialLoading?: boolean;
}

export const App: React.FC<AppProps> = ({
  initialCatalogOverride,
  initialLoading = false,
}) => {
  const { user, openAuthModal } = useAuth();

  const initialRoute = useMemo(() => parseRouteFromLocation(), []);
  const [currentView, setCurrentView] = useState<NavView>(initialRoute.view);
  const [filters, setFilters] = useState<FilterState>(() => parseInitialFiltersFromUrl());
  const [searchInput, setSearchInput] = useState<string>(() => filters.searchQuery);

  // Runtime catalog schema validation state (STEP 1)
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(initialLoading);
  const catalogValidation = useMemo(() => {
    const rawSource = initialCatalogOverride !== undefined ? initialCatalogOverride : APPS_CATALOG;
    return validateCatalogAtRuntime(rawSource);
  }, [initialCatalogOverride]);

  // Persistent user records
  const [installedRecords, setInstalledRecords] = useState<InstalledAppRecord[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [customApps, setCustomApps] = useState<AppMetadata[]>([]);

  // Modals state
  const [selectedApp, setSelectedApp] = useState<AppMetadata | null>(null);
  const [installingApp, setInstallingApp] = useState<AppMetadata | null>(null);
  const [payingApp, setPayingApp] = useState<AppMetadata | null>(null);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBridgeOpen, setIsBridgeOpen] = useState(false);
  const [isSponsorOpen, setIsSponsorOpen] = useState(false);
  const [sponsorApp, setSponsorApp] = useState<AppMetadata | null>(null);
  const [isCookieSettingsOpen, setIsCookieSettingsOpen] = useState(false);

  useEffect(() => {
    setInstalledRecords(getInstalledApps());
    setBookmarkedIds(getBookmarkedAppIds());
    setCustomApps(getCustomApps());
  }, []);

  // Debounce searchInput -> filters.searchQuery (STEP 1)
  useEffect(() => {
    if (searchInput === filters.searchQuery) return;
    if (searchInput === '') {
      setFilters((prev) => ({ ...prev, searchQuery: '' }));
      return;
    }
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, searchQuery: searchInput }));
    }, 180);
    return () => clearTimeout(timer);
  }, [searchInput, filters.searchQuery]);

  // Keep filters synchronized in the URL query string so links are shareable (STEP 1)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (filters.searchQuery.trim()) params.set('q', filters.searchQuery.trim());
    if (filters.category !== 'All') params.set('category', filters.category);
    if (filters.architecture !== 'All') params.set('arch', filters.architecture);
    if (filters.licenseCategory !== 'All') params.set('license', filters.licenseCategory);
    if (filters.trustTier !== 'All') params.set('trust', filters.trustTier);
    if (filters.sortBy !== 'featured') params.set('sort', filters.sortBy);

    const queryString = params.toString();
    const hash = selectedApp
      ? `#/app/${encodeURIComponent(selectedApp.id)}`
      : currentView === 'store'
        ? ''
        : `#/${currentView}`;
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, [filters, currentView, selectedApp]);

  const refreshUserData = useCallback(() => {
    setInstalledRecords(getInstalledApps());
    setBookmarkedIds(getBookmarkedAppIds());
    setCustomApps(getCustomApps());
  }, []);

  // Full unified catalog (validated built-in + user added)
  const fullCatalog = useMemo(() => {
    const map = new Map<string, AppMetadata>();
    catalogValidation.validApps.forEach((app) => map.set(app.id, app));
    customApps.forEach((app) => map.set(app.id, app));
    return Array.from(map.values());
  }, [catalogValidation.validApps, customApps]);

  // Open deep-linked app (`/app/<id>` or `#/app/<id>`) when catalog is ready
  useEffect(() => {
    if (initialRoute.appId && fullCatalog.length > 0) {
      const found = fullCatalog.find((a) => a.id === initialRoute.appId);
      if (found) {
        setSelectedApp(found);
      }
    }
  }, [initialRoute.appId, fullCatalog]);

  // Listen for hashchange events (browser back/forward button support)
  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseRouteFromLocation();
      setCurrentView(parsed.view);
      if (parsed.appId) {
        const found = fullCatalog.find((a) => a.id === parsed.appId);
        if (found) setSelectedApp(found);
      } else {
        setSelectedApp(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [fullCatalog]);

  // Descriptive <title> per route (STEP 7)
  useEffect(() => {
    if (selectedApp) {
      document.title = `${selectedApp.name} (v${selectedApp.version}) — Niruvi Linux AppImage Store`;
      return;
    }
    const routeTitles: Record<NavView, string> = {
      store: 'Niruvi Store — Static Linux AppImage Marketplace',
      library: 'My Installed & Bookmarked Apps — Niruvi Store',
      verifier: 'SHA-256 Checksum Verifier — Niruvi Store',
      submit: 'Submit or Test an AppImage — Niruvi Store',
      admin: 'Admin Governance — Niruvi Store',
      security: 'Security Platform — Niruvi Store',
      privacy: 'Privacy Policy — Niruvi Store',
      terms: 'Terms & Conditions — Niruvi Store',
      cookies: 'Cookie & Local Storage Policy — Niruvi Store',
      refunds: 'Refund Policy — Niruvi Store',
    };
    document.title = routeTitles[currentView] || 'Niruvi Store — Linux AppImage Marketplace';
  }, [currentView, selectedApp]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    if (newFilters.searchQuery !== undefined) {
      setSearchInput(newFilters.searchQuery);
    }
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleToggleBookmark = (appId: string) => {
    const updated = toggleBookmark(appId);
    setBookmarkedIds(updated);
  };

  const handleCustomAppAdded = (newApp: AppMetadata) => {
    setCustomApps((prev) => [newApp, ...prev.filter((a) => a.id !== newApp.id)]);
  };

  // Filter & Sort Logic
  const filteredApps = useMemo(() => {
    const activeSearch = filters.searchQuery.trim().toLowerCase();
    return fullCatalog
      .filter((app) => {
        if (activeSearch) {
          const matchesName = app.name.toLowerCase().includes(activeSearch);
          const matchesTagline = app.tagline.toLowerCase().includes(activeSearch);
          const matchesDesc = app.description.toLowerCase().includes(activeSearch);
          const matchesTags = app.tags.some((t) => t.toLowerCase().includes(activeSearch));
          const matchesPublisher = app.publisher.name.toLowerCase().includes(activeSearch);
          if (
            !matchesName &&
            !matchesTagline &&
            !matchesDesc &&
            !matchesTags &&
            !matchesPublisher
          ) {
            return false;
          }
        }

        if (filters.category !== 'All' && app.category !== filters.category) {
          return false;
        }

        if (
          filters.architecture !== 'All' &&
          !app.architectures.includes(filters.architecture)
        ) {
          return false;
        }

        if (
          filters.licenseCategory !== 'All' &&
          app.licenseCategory !== filters.licenseCategory
        ) {
          return false;
        }

        if (filters.trustTier !== 'All') {
          const tier =
            app.trustTier ||
            (app.sourceType === 'Official' ? 'Official Developer' : 'Verified Community');
          if (tier !== filters.trustTier) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'featured':
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return b.downloadsCount - a.downloadsCount;
          case 'popular':
            return b.downloadsCount - a.downloadsCount;
          case 'rating':
            return b.rating - a.rating;
          case 'recent':
            return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
          case 'name':
            return a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });
  }, [fullCatalog, filters]);

  const resetFilters = () => {
    setSearchInput('');
    setFilters({
      searchQuery: '',
      category: 'All',
      architecture: 'All',
      licenseCategory: 'All',
      trustTier: 'All',
      sortBy: 'featured',
    });
  };

  const handleNavigateLegal = (route: LegalRoute) => {
    setSelectedApp(null);
    setCurrentView(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Spotlight app (featured)
  const spotlightApp = fullCatalog.find((a) => a.id === 'vscodium') || fullCatalog[0];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-100 flex flex-col font-sans selection:bg-white selection:text-black">
      {/* STEP 7: Skip to main content link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Top Navigation Landmark */}
      <Navbar
        currentView={currentView}
        onViewChange={(view) => {
          setSelectedApp(null);
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        searchQuery={searchInput}
        onSearchChange={(q) => {
          setSearchInput(q);
          handleFilterChange({ searchQuery: q });
          if (currentView !== 'store') {
            setCurrentView('store');
          }
        }}
        installedCount={installedRecords.length}
        onOpenInfo={() => setIsInfoOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenBridge={() => setIsBridgeOpen(true)}
        onOpenPricing={() => {
          setSponsorApp(null);
          setIsSponsorOpen(true);
        }}
        onOpenSponsor={() => {
          setSponsorApp(null);
          setIsSponsorOpen(true);
        }}
      />

      {/* Main Content Landmark */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 focus:outline-none"
      >
        {/* VIEW 1: STORE BROWSE */}
        {currentView === 'store' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Primary Store Heading (One h1 per page — STEP 7) */}
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Linux AppImage Software Directory
              </h1>
              <p className="text-xs sm:text-sm text-neutral-300">
                Portable Linux desktop packages verified with SHA-256 checksums and one-click{' '}
                <code className="font-mono text-sky-400">niruvi://</code> desktop installation.
              </p>
            </div>

            {/* Catalog Loading State (STEP 1) */}
            {isLoadingCatalog ? (
              <div
                role="status"
                aria-live="polite"
                className="py-16 text-center rounded-2xl bg-neutral-900/50 border border-neutral-800 p-8 space-y-3"
              >
                <RefreshCw
                  className="w-8 h-8 text-sky-400 animate-spin mx-auto"
                  aria-hidden="true"
                />
                <h2 className="text-base font-semibold text-white">Loading application catalog…</h2>
                <p className="text-xs text-neutral-300">
                  Validating package schemas and cryptographic SHA-256 metadata.
                </p>
              </div>
            ) : catalogValidation.validApps.length === 0 && catalogValidation.errors.length > 0 ? (
              /* Catalog Schema Validation Error State (STEP 1) */
              <div
                role="alert"
                className="py-12 rounded-2xl bg-rose-950/30 border border-rose-500/40 p-6 sm:p-8 max-w-2xl mx-auto space-y-4 text-center"
              >
                <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" aria-hidden="true" />
                <h2 className="text-lg font-bold text-white">
                  Catalog Schema Validation Failed
                </h2>
                <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
                  We encountered a schema error while validating the static catalog JSON. For your
                  security, unverified catalog entries are blocked from rendering.
                </p>
                <ul className="text-left text-xs font-mono bg-neutral-950 border border-rose-500/30 rounded-xl p-4 space-y-1 text-rose-300">
                  {catalogValidation.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>
                      [{err.id}] {err.message}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setIsLoadingCatalog(false)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition-colors cursor-pointer"
                >
                  Retry Catalog Validation
                </button>
              </div>
            ) : (
              <>
                {/* Spotlight Editor's Choice Header */}
                {spotlightApp && !filters.searchQuery && filters.category === 'All' && (
                  <section
                    aria-label="Featured application spotlight"
                    className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                  >
                    <div className="flex items-start gap-4 sm:gap-5 max-w-2xl">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center bg-neutral-800/80 border border-neutral-700 p-2 sm:p-2.5 shadow-xl flex-shrink-0 overflow-hidden">
                        <AppIcon
                          slug={spotlightApp.iconSlug}
                          iconUrl={spotlightApp.icon}
                          name={spotlightApp.name}
                          brandColor={spotlightApp.brandColor}
                          className="w-12 h-12 sm:w-14 sm:h-14"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700">
                            Editor&apos;s Choice
                          </span>
                          <span className="text-xs font-mono text-neutral-300">
                            v{spotlightApp.version}
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                          {spotlightApp.name}
                        </h2>
                        <p className="text-xs sm:text-sm text-neutral-300 mt-1 leading-relaxed line-clamp-2">
                          {spotlightApp.tagline}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-neutral-300 mt-3 flex-wrap">
                          <span>
                            Publisher:{' '}
                            <strong className="text-white">{spotlightApp.publisher.name}</strong>
                          </span>
                          <span aria-hidden="true">•</span>
                          <span>{spotlightApp.size}</span>
                          <span aria-hidden="true">•</span>
                          <span>Verified SHA-256</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button
                        id="spotlight-install-btn"
                        type="button"
                        onClick={() => setInstallingApp(spotlightApp)}
                        className="min-h-[44px] flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs shadow-md transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
                        <span>Install {spotlightApp.name} with Niruvi</span>
                      </button>

                      <button
                        id="spotlight-details-btn"
                        type="button"
                        onClick={() => setSelectedApp(spotlightApp)}
                        className="min-h-[44px] px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        View {spotlightApp.name} Details
                      </button>
                    </div>
                  </section>
                )}

                {/* Filter Bar (Categories, Architectures, Licenses, Sort) */}
                <FilterBar
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  totalResults={filteredApps.length}
                />

                {/* Apps Grid or Empty State */}
                {filteredApps.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredApps.map((app) => {
                      const isInstalled = installedRecords.some((r) => r.appId === app.id);
                      const isBookmarked = bookmarkedIds.includes(app.id);

                      return (
                        <AppCard
                          key={app.id}
                          app={app}
                          isInstalled={isInstalled}
                          isBookmarked={isBookmarked}
                          onSelect={(selected) => setSelectedApp(selected)}
                          onInstall={(selected) => setInstallingApp(selected)}
                          onToggleBookmark={handleToggleBookmark}
                        />
                      );
                    })}
                  </div>
                ) : (
                  /* STEP 1: Empty State ("No apps match your filters") */
                  <div
                    role="status"
                    aria-live="polite"
                    className="py-16 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 flex flex-col items-center justify-center p-6"
                  >
                    <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-300 mb-3 border border-neutral-700">
                      <SearchX className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h2 className="text-base font-semibold text-white">
                      No apps match your filters
                    </h2>
                    <p className="text-xs text-neutral-300 mt-1 max-w-sm">
                      We couldn&apos;t find any applications matching your current search query or
                      active category, license, and architecture filters.
                    </p>
                    <button
                      id="reset-all-filters-btn"
                      type="button"
                      onClick={resetFilters}
                      className="min-h-[44px] mt-4 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold shadow transition-colors cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* VIEW 2: MY LIBRARY */}
        {currentView === 'library' && (
          <MyLibraryView
            catalog={fullCatalog}
            installedRecords={installedRecords}
            bookmarkedIds={bookmarkedIds}
            onSelectApp={(app) => setSelectedApp(app)}
            onOpenInstall={(app) => setInstallingApp(app)}
            onRefreshLibrary={refreshUserData}
          />
        )}

        {/* VIEW 3: SHA-256 INTEGRITY VERIFIER */}
        {currentView === 'verifier' && (
          <IntegrityVerifierView
            catalog={fullCatalog}
            onSelectApp={(app) => setSelectedApp(app)}
          />
        )}

        {/* VIEW 4: SUBMIT OR TEST APP */}
        {currentView === 'submit' && (
          <SubmitAppView
            onAppAdded={(app) => {
              handleCustomAppAdded(app);
              refreshUserData();
            }}
            onNavigateToStore={() => setCurrentView('store')}
          />
        )}

        {/* VIEW 5: ADMIN MONITORING & DASHBOARD */}
        {currentView === 'admin' &&
          (user && user.role?.toUpperCase() === 'ADMIN' ? (
            <AdminDashboard
              onOpenAppDetail={(app) => setSelectedApp(app)}
              onOpenBridgeModal={() => setIsBridgeOpen(true)}
              onRefreshCatalog={refreshUserData}
            />
          ) : (
            <div className="py-20 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 p-8 max-w-lg mx-auto space-y-4">
              <ShieldCheck className="w-12 h-12 text-neutral-300 mx-auto" aria-hidden="true" />
              <h1 className="text-lg font-bold text-white">Administrator Access Required</h1>
              <p className="text-xs text-neutral-300 leading-relaxed">
                This monitoring dashboard and platform governance console is strictly restricted to
                administrator accounts.
              </p>
              <button
                type="button"
                onClick={openAuthModal}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition shadow-sm cursor-pointer"
              >
                Sign In as Administrator
              </button>
            </div>
          ))}

        {/* VIEW 6: SECURITY PLATFORM */}
        {currentView === 'security' && <SecurityPlatformView />}

        {/* STEP 2: LEGAL ROUTES */}
        {currentView === 'privacy' && (
          <Privacy
            onBackToStore={() => setCurrentView('store')}
            onOpenCookieSettings={() => setIsCookieSettingsOpen(true)}
          />
        )}
        {currentView === 'terms' && <Terms onBackToStore={() => setCurrentView('store')} />}
        {currentView === 'cookies' && (
          <Cookies
            onBackToStore={() => setCurrentView('store')}
            onOpenCookieSettings={() => setIsCookieSettingsOpen(true)}
          />
        )}
        {currentView === 'refunds' && <Refunds onBackToStore={() => setCurrentView('store')} />}
      </main>

      {/* Site-Wide Footer with Legal Routes & Data Summary Table (STEP 2 & STEP 4) */}
      <Footer
        currentRoute={currentView}
        onNavigate={handleNavigateLegal}
        onOpenCookieSettings={() => setIsCookieSettingsOpen(true)}
      />

      {/* Accessible Cookie & Storage Consent Banner (STEP 3) */}
      <CookieConsent
        isOpen={isCookieSettingsOpen}
        onCloseManage={() => setIsCookieSettingsOpen(false)}
        onNavigateLegal={(route) => handleNavigateLegal(route)}
      />

      {/* Interactive Modals */}
      <AppDetailModal
        app={selectedApp}
        onClose={() => setSelectedApp(null)}
        onOpenInstall={(app) => setInstallingApp(app)}
        isInstalled={selectedApp ? installedRecords.some((r) => r.appId === selectedApp.id) : false}
        onOpenSponsor={(app) => {
          setSponsorApp(app);
          setIsSponsorOpen(true);
        }}
        onOpenPayment={(app) => {
          setPayingApp(app);
        }}
      />

      <InstallModal
        app={installingApp}
        isOpen={!!installingApp}
        onClose={() => setInstallingApp(null)}
        isInstalled={
          installingApp ? installedRecords.some((r) => r.appId === installingApp.id) : false
        }
        onInstalledChange={refreshUserData}
      />

      <PaymentModal
        app={payingApp}
        isOpen={!!payingApp}
        onClose={() => setPayingApp(null)}
        onSuccess={() => {
          refreshUserData();
        }}
      />

      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
      <NiruviInfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
      <JsonExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <NiruviBridgeModal isOpen={isBridgeOpen} onClose={() => setIsBridgeOpen(false)} />
      <SponsorModal
        isOpen={isSponsorOpen}
        onClose={() => setIsSponsorOpen(false)}
        app={sponsorApp}
      />
      <AuthModal />
      <AccountManagementModal />
    </div>
  );
};

export default App;
