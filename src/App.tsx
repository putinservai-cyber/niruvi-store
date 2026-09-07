import React, { useState, useMemo, useEffect } from 'react';
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
import { AdminDashboard } from './components/AdminDashboard';
import { NiruviBridgeModal } from './components/NiruviBridgeModal';
import { SponsorModal } from './components/SponsorModal';
import { APPS_CATALOG } from './data/apps';
import { AppMetadata, FilterState, InstalledAppRecord } from './types';
import { AppIcon } from './components/AppIcon';
import { NiruviLogo } from './components/NiruviLogo';
import { useAuth } from './context/AuthContext';
import { 
  getInstalledApps, 
  getBookmarkedAppIds, 
  toggleBookmark, 
  getCustomApps 
} from './utils/storage';
import { 
  ShieldCheck, 
  Cpu, 
  Sparkles, 
  Terminal, 
  SearchX, 
  ExternalLink,
  Download,
  Star,
  CheckCircle2,
  HardDrive,
  Database,
  Zap
} from 'lucide-react';

export const App: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const [currentView, setCurrentView] = useState<NavView>('store');
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    category: 'All',
    architecture: 'All',
    licenseCategory: 'All',
    sortBy: 'featured',
  });

  // Persistent user records
  const [installedRecords, setInstalledRecords] = useState<InstalledAppRecord[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [customApps, setCustomApps] = useState<AppMetadata[]>([]);
  const [serverApps, setServerApps] = useState<any[]>([]);

  // Modals state
  const [selectedApp, setSelectedApp] = useState<AppMetadata | null>(null);
  const [installingApp, setInstallingApp] = useState<AppMetadata | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBridgeOpen, setIsBridgeOpen] = useState(false);
  const [isSponsorOpen, setIsSponsorOpen] = useState(false);
  const [sponsorApp, setSponsorApp] = useState<AppMetadata | null>(null);

  const fetchCatalogApps = () => {
    fetch('/api/apps')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.apps || []);
        if (Array.isArray(list) && list.length > 0) {
          setServerApps(list);
        }
      })
      .catch((err) => console.debug('Cloud SQL apps sync:', err));
  };

  // Load from local storage and Cloud SQL backend on startup
  useEffect(() => {
    setInstalledRecords(getInstalledApps());
    setBookmarkedIds(getBookmarkedAppIds());
    setCustomApps(getCustomApps());
    fetchCatalogApps();
  }, []);

  const refreshUserData = () => {
    setInstalledRecords(getInstalledApps());
    setBookmarkedIds(getBookmarkedAppIds());
    setCustomApps(getCustomApps());
  };

  // Full unified catalog (built-in + server live data + user added)
  const fullCatalog = useMemo(() => {
    const map = new Map<string, AppMetadata>();
    APPS_CATALOG.forEach((app) => map.set(app.id, app));
    
    // Merge live metrics from Cloud SQL
    serverApps.forEach((serverApp) => {
      const existing = map.get(serverApp.slug);
      if (existing) {
        map.set(serverApp.slug, {
          ...existing,
          downloadsCount: serverApp.downloadsCount || existing.downloadsCount,
          rating: serverApp.rating ? parseFloat(serverApp.rating) : existing.rating,
        });
      }
    });

    customApps.forEach((app) => map.set(app.id, app));
    return Array.from(map.values());
  }, [customApps, serverApps]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
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
    return fullCatalog.filter((app) => {
      // Search
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = app.name.toLowerCase().includes(query);
        const matchesTagline = app.tagline.toLowerCase().includes(query);
        const matchesDesc = app.description.toLowerCase().includes(query);
        const matchesTags = app.tags.some((t) => t.toLowerCase().includes(query));
        const matchesPublisher = app.publisher.name.toLowerCase().includes(query);
        if (!matchesName && !matchesTagline && !matchesDesc && !matchesTags && !matchesPublisher) {
          return false;
        }
      }

      // Category
      if (filters.category !== 'All' && app.category !== filters.category) {
        return false;
      }

      // Architecture
      if (filters.architecture !== 'All' && !app.architectures.includes(filters.architecture)) {
        return false;
      }

      // License Category
      if (filters.licenseCategory !== 'All' && app.licenseCategory !== filters.licenseCategory) {
        return false;
      }

      return true;
    }).sort((a, b) => {
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
    setFilters({
      searchQuery: '',
      category: 'All',
      architecture: 'All',
      licenseCategory: 'All',
      sortBy: 'featured',
    });
  };

  // Spotlight app (featured)
  const spotlightApp = fullCatalog.find((a) => a.id === 'vscodium') || fullCatalog[0];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-100 flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => {
          handleFilterChange({ searchQuery: q });
          if (currentView !== 'store') {
            setCurrentView('store');
          }
        }}
        installedCount={installedRecords.length}
        onOpenInfo={() => setIsInfoOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenBridge={() => setIsBridgeOpen(true)}
        onOpenSponsor={() => {
          setSponsorApp(null);
          setIsSponsorOpen(true);
        }}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* VIEW 1: STORE BROWSE */}
        {currentView === 'store' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Spotlight Editor's Choice Header */}
            {spotlightApp && !filters.searchQuery && filters.category === 'All' && (
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4 sm:gap-5 max-w-2xl">
                  <div 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
                    style={{ backgroundColor: `${spotlightApp.brandColor || '#ffffff'}15`, border: `1px solid ${spotlightApp.brandColor || '#ffffff'}30` }}
                  >
                    <AppIcon slug={spotlightApp.iconSlug} className="w-9 h-9 sm:w-11 sm:h-11" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                        Editor's Choice
                      </span>
                      <span className="text-xs font-mono text-neutral-400">
                        v{spotlightApp.version}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {spotlightApp.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-300 mt-1 leading-relaxed line-clamp-2">
                      {spotlightApp.tagline}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-neutral-400 mt-3 flex-wrap">
                      <span>Publisher: <strong className="text-neutral-200">{spotlightApp.publisher.name}</strong></span>
                      <span>•</span>
                      <span>{spotlightApp.size}</span>
                      <span>•</span>
                      <span className="text-emerald-400">Verified SHA-256</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    id="spotlight-install-btn"
                    onClick={() => setInstallingApp(spotlightApp)}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs shadow-md transition-all hover:scale-[1.01]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install {spotlightApp.name}</span>
                  </button>

                  <button
                    id="spotlight-details-btn"
                    onClick={() => setSelectedApp(spotlightApp)}
                    className="px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-medium transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            )}

            {/* Filter Bar (Categories, Architectures, Licenses, Sort) */}
            <FilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              totalCount={filteredApps.length}
            />

            {/* Apps Grid */}
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
              <div className="py-16 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 flex flex-col items-center justify-center p-6">
                <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500 mb-3 border border-neutral-800">
                  <SearchX className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-white">No applications match your criteria</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                  We couldn't find any applications with the current search query or active architecture filters.
                </p>
                <button
                  id="reset-all-filters-btn"
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold shadow transition-colors"
                >
                  Reset Filters
                </button>
              </div>
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
        {currentView === 'admin' && (
          user && user.role?.toUpperCase() === 'ADMIN' ? (
            <AdminDashboard
              onOpenAppDetail={(app) => setSelectedApp(app)}
              onOpenBridgeModal={() => setIsBridgeOpen(true)}
              onRefreshCatalog={fetchCatalogApps}
            />
          ) : (
            <div className="py-20 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 p-8 max-w-lg mx-auto space-y-4">
              <ShieldCheck className="w-12 h-12 text-neutral-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Administrator Access Required</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                This monitoring dashboard and platform governance console is strictly restricted to administrator accounts.
              </p>
              <button
                onClick={openAuthModal}
                className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition shadow-sm"
              >
                Sign In as Administrator
              </button>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#060608] border-t border-neutral-800/80 py-8 px-4 sm:px-6 lg:px-8 text-xs text-neutral-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <NiruviLogo size={22} />
            <span className="font-semibold text-neutral-300">Niruvi Store</span>
            <span>•</span>
            <span>AppImage Desktop Ecosystem</span>
          </div>

          <div className="flex items-center gap-6 text-neutral-400 flex-wrap">
            <button
              onClick={() => setIsBridgeOpen(true)}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
              title="Connect and test Niruvi Desktop Protocol Bridge"
            >
              <Zap className="w-3.5 h-3.5 text-neutral-300" />
              <span>Desktop Bridge</span>
            </button>
            <button
              onClick={() => setIsInfoOpen(true)}
              className="hover:text-white transition-colors"
            >
              Protocol Guide
            </button>
            <button
              onClick={() => {
                setSponsorApp(null);
                setIsSponsorOpen(true);
              }}
              className="text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
            >
              <span>Support (Ko-fi / UPI)</span>
            </button>
            <a
              href="https://ko-fi.com/putinservai"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
            >
              <span>Ko-fi.com/putinservai</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => setIsExportOpen(true)}
              className="hover:text-white transition-colors"
            >
              Static JSON Catalog
            </button>
            <button
              onClick={() => setCurrentView('verifier')}
              className="hover:text-white transition-colors"
            >
              SHA-256 Verifier
            </button>
            <a
              href="https://github.com/putinservai-cyber/niruvi"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <span>Niruvi GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

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
      />

      <InstallModal
        app={installingApp}
        isOpen={!!installingApp}
        onClose={() => setInstallingApp(null)}
        isInstalled={installingApp ? installedRecords.some((r) => r.appId === installingApp.id) : false}
        onInstalledChange={refreshUserData}
      />

      <NiruviInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />

      <JsonExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <NiruviBridgeModal
        isOpen={isBridgeOpen}
        onClose={() => setIsBridgeOpen(false)}
      />

      <SponsorModal
        isOpen={isSponsorOpen}
        onClose={() => setIsSponsorOpen(false)}
        app={sponsorApp}
      />

      <AuthModal />
    </div>
  );
};

export default App;
