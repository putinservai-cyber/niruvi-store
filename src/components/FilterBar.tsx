import React from 'react';
import { Category, Architecture, LicenseType, TrustTier, FilterState } from '../types';
import { CATEGORIES } from '../data/apps';
import { SlidersHorizontal, Cpu, Shield, ArrowDownUp, CheckCircle2 } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  totalCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  totalCount,
}) => {
  const architectures: (Architecture | 'All')[] = ['All', 'x86_64', 'aarch64'];
  const licenseTypes: LicenseType[] = ['All', 'Open Source', 'Permissive', 'Proprietary'];
  const trustTiers: TrustTier[] = ['All', 'Official Developer', 'Verified Community', 'Unverified Community'];

  return (
    <div className="space-y-4 mb-8">
      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = filters.category === cat;
          return (
            <button
              key={cat}
              id={`filter-category-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() => onFilterChange({ category: cat })}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white text-black shadow-sm font-semibold'
                  : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Sub-filters and Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-neutral-800 bg-neutral-900/60">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Trust Tier Filter */}
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-400 font-medium">Trust:</span>
            <div className="flex items-center gap-1">
              {trustTiers.map((tier) => (
                <button
                  key={tier}
                  id={`filter-trust-${tier.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => onFilterChange({ trustTier: tier })}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    filters.trustTier === tier
                      ? 'bg-neutral-800 text-white border border-neutral-600 font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900/60 border border-neutral-800'
                  }`}
                >
                  {tier === 'Official Developer' ? 'Official' : tier === 'Verified Community' ? 'Verified Comm.' : tier === 'Unverified Community' ? 'Unverified Comm.' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Architecture Filter */}
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-400 font-medium">Arch:</span>
            <div className="flex items-center gap-1">
              {architectures.map((arch) => (
                <button
                  key={arch}
                  id={`filter-arch-${arch.toLowerCase()}`}
                  onClick={() => onFilterChange({ architecture: arch })}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    filters.architecture === arch
                      ? 'bg-neutral-800 text-white border border-neutral-600 font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900/60 border border-neutral-800'
                  }`}
                >
                  {arch}
                </button>
              ))}
            </div>
          </div>

          {/* License Filter */}
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-400 font-medium">License:</span>
            <div className="flex items-center gap-1">
              {licenseTypes.map((lic) => (
                <button
                  key={lic}
                  id={`filter-license-${lic.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => onFilterChange({ licenseCategory: lic })}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    filters.licenseCategory === lic
                      ? 'bg-neutral-800 text-white border border-neutral-600 font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900/60 border border-neutral-800'
                  }`}
                >
                  {lic}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count & Sort By */}
        <div className="flex items-center gap-3 text-xs ml-auto">
          <span className="text-neutral-400">
            Found <strong className="text-white">{totalCount}</strong> application{totalCount !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1.5">
            <ArrowDownUp className="w-3.5 h-3.5 text-neutral-400" />
            <select
              id="sort-select"
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ sortBy: e.target.value as FilterState['sortBy'] })}
              className="bg-neutral-900 text-neutral-200 border border-neutral-750 rounded px-2 py-1 focus:outline-hidden focus:border-white cursor-pointer"
            >
              <option value="featured">Staff Picks / Featured</option>
              <option value="popular">Most Downloaded</option>
              <option value="rating">Top Rated</option>
              <option value="recent">Recently Updated</option>
              <option value="name">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
