import React, { useState, useEffect } from 'react';
import { Category, Architecture, FilterState, LicenseType, TrustTier } from '../types';
import { CATEGORIES } from '../data/apps';
import { Search, SlidersHorizontal, Cpu, Scale, ShieldCheck, X } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  totalResults: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  totalResults,
}) => {
  const [localSearch, setLocalSearch] = useState(filters.searchQuery);

  // Sync local input when parent resets filters or URL query changes
  useEffect(() => {
    setLocalSearch(filters.searchQuery);
  }, [filters.searchQuery]);

  // Debounce search query updates (200ms)
  useEffect(() => {
    if (localSearch === filters.searchQuery) return;
    const timer = setTimeout(() => {
      onFilterChange({ searchQuery: localSearch });
    }, 200);
    return () => clearTimeout(timer);
  }, [localSearch, filters.searchQuery, onFilterChange]);

  return (
    <section
      aria-label="Search and filter Linux applications"
      className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4 backdrop-blur-sm"
    >
      {/* Top Row: Search + Architecture + Sort */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search Input with explicit label */}
        <div className="relative flex-1">
          <label htmlFor="store-search-input" className="sr-only">
            Search Linux AppImages by name, category, publisher, or tag
          </label>
          <Search
            className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="store-search-input"
            type="search"
            autoComplete="off"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search Linux apps (e.g. Blender, VSCodium, Kdenlive, Wayland, IDE)..."
            className="w-full min-h-[44px] pl-10 pr-10 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-sky-400 transition-all"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onFilterChange({ searchQuery: '' });
              }}
              aria-label="Clear search query"
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Select Filters */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
          {/* Architecture Filter */}
          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-700 rounded-xl px-3 min-h-[44px]">
            <Cpu className="w-4 h-4 text-neutral-300 flex-shrink-0" aria-hidden="true" />
            <label htmlFor="filter-arch-select" className="text-xs text-neutral-300 font-medium whitespace-nowrap">
              Arch:
            </label>
            <select
              id="filter-arch-select"
              value={filters.architecture}
              onChange={(e) =>
                onFilterChange({ architecture: e.target.value as Architecture | 'All' })
              }
              className="bg-transparent text-xs text-neutral-100 font-semibold focus:outline-hidden cursor-pointer py-2"
            >
              <option value="All" className="bg-neutral-900">All (x86_64 &amp; ARM64)</option>
              <option value="x86_64" className="bg-neutral-900">x86_64 (AMD/Intel)</option>
              <option value="aarch64" className="bg-neutral-900">aarch64 (ARM64)</option>
            </select>
          </div>

          {/* License Filter */}
          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-700 rounded-xl px-3 min-h-[44px]">
            <Scale className="w-4 h-4 text-neutral-300 flex-shrink-0" aria-hidden="true" />
            <label htmlFor="filter-license-select" className="text-xs text-neutral-300 font-medium whitespace-nowrap">
              License:
            </label>
            <select
              id="filter-license-select"
              value={filters.licenseCategory}
              onChange={(e) =>
                onFilterChange({ licenseCategory: e.target.value as LicenseType })
              }
              className="bg-transparent text-xs text-neutral-100 font-semibold focus:outline-hidden cursor-pointer py-2"
            >
              <option value="All" className="bg-neutral-900">All Licenses</option>
              <option value="Open Source" className="bg-neutral-900">Copyleft (GPL/LGPL)</option>
              <option value="Permissive" className="bg-neutral-900">Permissive (MIT/Apache)</option>
              <option value="Proprietary" className="bg-neutral-900">Proprietary / Freeware</option>
            </select>
          </div>

          {/* Trust Tier Filter */}
          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-700 rounded-xl px-3 min-h-[44px]">
            <ShieldCheck className="w-4 h-4 text-neutral-300 flex-shrink-0" aria-hidden="true" />
            <label htmlFor="filter-trust-select" className="text-xs text-neutral-300 font-medium whitespace-nowrap">
              Trust:
            </label>
            <select
              id="filter-trust-select"
              value={filters.trustTier}
              onChange={(e) =>
                onFilterChange({ trustTier: e.target.value as TrustTier })
              }
              className="bg-transparent text-xs text-neutral-100 font-semibold focus:outline-hidden cursor-pointer py-2"
            >
              <option value="All" className="bg-neutral-900">All Tiers</option>
              <option value="Official Developer" className="bg-neutral-900">Official Developer</option>
              <option value="Verified Community" className="bg-neutral-900">Verified Community</option>
              <option value="Unverified Community" className="bg-neutral-900">Unverified Community</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-700 rounded-xl px-3 min-h-[44px]">
            <SlidersHorizontal className="w-4 h-4 text-neutral-300 flex-shrink-0" aria-hidden="true" />
            <label htmlFor="filter-sort-select" className="text-xs text-neutral-300 font-medium whitespace-nowrap">
              Sort:
            </label>
            <select
              id="filter-sort-select"
              value={filters.sortBy}
              onChange={(e) =>
                onFilterChange({ sortBy: e.target.value as FilterState['sortBy'] })
              }
              className="bg-transparent text-xs text-neutral-100 font-semibold focus:outline-hidden cursor-pointer py-2"
            >
              <option value="featured" className="bg-neutral-900">Featured</option>
              <option value="popular" className="bg-neutral-900">Most Downloads</option>
              <option value="rating" className="bg-neutral-900">Highest Rated</option>
              <option value="recent" className="bg-neutral-900">Recently Updated</option>
              <option value="name" className="bg-neutral-900">Alphabetical (A–Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom Row: Category Pills + Results Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-neutral-800/80">
        <div
          role="group"
          aria-label="Filter by application category"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar"
        >
          {CATEGORIES.map((category) => {
            const isActive = filters.category === category;
            return (
              <button
                key={category}
                id={`category-btn-${category.toLowerCase().replace(/\s+/g, '-')}`}
                type="button"
                aria-pressed={isActive}
                onClick={() => onFilterChange({ category: category as Category })}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-neutral-950 text-neutral-200 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div
          aria-live="polite"
          className="text-xs text-neutral-300 font-mono whitespace-nowrap self-end sm:self-center"
        >
          Showing <span className="text-white font-bold">{totalResults}</span>{' '}
          {totalResults === 1 ? 'package' : 'packages'}
        </div>
      </div>
    </section>
  );
};
