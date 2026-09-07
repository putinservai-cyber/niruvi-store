import React from 'react';
import { Category, Architecture, LicenseType, FilterState } from '../types';
import { CATEGORIES } from '../data/apps';
import { SlidersHorizontal, Cpu, Shield, ArrowDownUp } from 'lucide-react';

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
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/60'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Sub-filters and Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-850/60 p-3 rounded-xl border border-slate-800 bg-slate-800/40">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Architecture Filter */}
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Arch:</span>
            <div className="flex items-center gap-1">
              {architectures.map((arch) => (
                <button
                  key={arch}
                  id={`filter-arch-${arch.toLowerCase()}`}
                  onClick={() => onFilterChange({ architecture: arch })}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    filters.architecture === arch
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-slate-700/40'
                  }`}
                >
                  {arch}
                </button>
              ))}
            </div>
          </div>

          {/* License Filter */}
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">License:</span>
            <div className="flex items-center gap-1">
              {licenseTypes.map((lic) => (
                <button
                  key={lic}
                  id={`filter-license-${lic.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => onFilterChange({ licenseCategory: lic })}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    filters.licenseCategory === lic
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-slate-700/40'
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
          <span className="text-slate-400">
            Found <strong className="text-white">{totalCount}</strong> application{totalCount !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1.5">
            <ArrowDownUp className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="sort-select"
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ sortBy: e.target.value as FilterState['sortBy'] })}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="featured">Featured First</option>
              <option value="popular">Most Popular</option>
              <option value="rating">Top Rated</option>
              <option value="recent">Recently Updated</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
