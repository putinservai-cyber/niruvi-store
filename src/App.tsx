import React, { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { AppCard } from './components/AppCard';
import { AppDetailModal } from './components/AppDetailModal';
import { NiruviInfoModal } from './components/NiruviInfoModal';
import { JsonExportModal } from './components/JsonExportModal';
import { APPS_CATALOG } from './data/apps';
import { AppMetadata, FilterState } from './types';
import { 
  Package, 
  ShieldCheck, 
  Cpu, 
  Sparkles, 
  Terminal, 
  SearchX, 
  ExternalLink
} from 'lucide-react';

export const App: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    category: 'All',
    architecture: 'All',
    licenseCategory: 'All',
    sortBy: 'featured',
  });

  const [selectedApp, setSelectedApp] = useState<AppMetadata | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // Filter & Sort Logic
  const filteredApps = useMemo(() => {
    return APPS_CATALOG.filter((app) => {
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
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      category: 'All',
      architecture: 'All',
      licenseCategory: 'All',
      sortBy: 'featured',
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => handleFilterChange({ searchQuery: q })}
        onOpenInfo={() => setIsInfoOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Section */}
        <section className="mb-8 rounded-2xl bg-gradient-to-r from-blue-950/50 via-slate-900 to-indigo-950/40 border border-slate-800/90 p-6 md:p-8 relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Native Linux Application Discovery</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Linux AppImage Marketplace
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed max-w-2xl">
              Discover, verify, and launch verified AppImages with one click. Designed to integrate seamlessly with the{' '}
              <a
                href="https://github.com/putinservai-cyber/niruvi"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2"
              >
                Niruvi
              </a>{' '}
              desktop manager via <code className="text-blue-300 font-mono text-xs bg-blue-950/60 px-1.5 py-0.5 rounded">niruvi://install</code> protocol links.
            </p>

            {/* Quick Badges */}
            <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>SHA-256 Checksums Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span>x86_64 & ARM64 Support</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>One-Click Desktop Integration</span>
              </div>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          totalCount={filteredApps.length}
        />

        {/* Apps Grid */}
        {filteredApps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onSelect={(selected) => setSelectedApp(selected)}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center rounded-2xl bg-slate-800/30 border border-slate-800 flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
              <SearchX className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No applications found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              We couldn't find any applications matching your current search criteria or active filters.
            </p>
            <button
              id="reset-all-filters-btn"
              onClick={resetFilters}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-300">Niruvi Store</span>
            <span>•</span>
            <span>GPL-3.0 License</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <button
              onClick={() => setIsInfoOpen(true)}
              className="hover:text-white transition-colors"
            >
              Protocol Documentation
            </button>
            <button
              onClick={() => setIsExportOpen(true)}
              className="hover:text-white transition-colors"
            >
              Static JSON Catalog
            </button>
            <a
              href="https://github.com/putinservai-cyber/niruvi"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <span>Niruvi Desktop</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AppDetailModal
        app={selectedApp}
        onClose={() => setSelectedApp(null)}
      />

      <NiruviInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />

      <JsonExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};

export default App;
