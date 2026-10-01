import React from 'react';
import { Category, SimplifiedCategory } from '../types';
import {
  LayoutGrid,
  Code2,
  Palette,
  Film,
  FileText,
  Gamepad2,
  Shield,
  Wrench,
  Globe,
  GraduationCap,
  Cpu,
  ShieldCheck,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';

export type SortOption = 'featured' | 'name' | 'recent';

export const SIMPLIFIED_CATEGORIES: SimplifiedCategory[] = [
  'All',
  'Development',
  'Audio/Video',
  'Graphics',
  'System/Utilities',
  'Games',
  'Office',
  'Internet',
  'Education',
];

interface FilterBarProps {
  categories?: Category[];
  selectedCategory: string;
  onSelectCategory: (cat: any) => void;
  selectedArch: 'All' | 'x86_64' | 'aarch64' | 'armhf';
  onSelectArch: (arch: 'All' | 'x86_64' | 'aarch64' | 'armhf') => void;
  onlyVerified: boolean;
  onToggleVerified: () => void;
  onlyRecentlyUpdated?: boolean;
  onToggleRecentlyUpdated?: () => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  resultCount: number;
  pageStart?: number;
  pageEnd?: number;
  onResetFilters?: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  All: <LayoutGrid className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  Development: <Code2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  'Audio/Video': <Film className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  Graphics: <Palette className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  'System/Utilities': <Wrench className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  Games: <Gamepad2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  Office: <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  Internet: <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  'Office/Productivity': <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  'Network/Internet': <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  'Education/Science': <GraduationCap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  'Graphics & Design': <Palette className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  'Audio & Video': <Film className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  Productivity: <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  'System & Security': <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  Utilities: <Wrench className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  'Internet & Network': <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  Education: <GraduationCap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
};

export const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  selectedArch,
  onSelectArch,
  onlyVerified,
  onToggleVerified,
  sortBy,
  onSortChange,
  resultCount,
  pageStart = 1,
  pageEnd = resultCount,
  onResetFilters,
}) => {
  const displayCategories: string[] =
    categories && categories.length > 0 ? categories : SIMPLIFIED_CATEGORIES;

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    selectedArch !== 'All' ||
    onlyVerified ||
    sortBy !== 'featured';

  const rangeLabel =
    resultCount === 0
      ? 'Showing 0 of 0 apps'
      : `Showing ${pageStart.toLocaleString()}-${pageEnd.toLocaleString()} of ${resultCount.toLocaleString()} apps`;

  return (
    <section
      aria-label="Application catalog filters"
      className="w-full min-w-0 space-y-3 mb-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-3.5 sm:p-4"
    >
      {/* Row 1: Category Filter Buttons (Scrollable on Mobile, Wrapped on Tablet/Desktop) */}
      <div
        role="group"
        aria-label="Filter by application category"
        className="flex items-center gap-1.5 overflow-x-auto md:flex-wrap pb-1 md:pb-0 max-w-full"
      >
        {displayCategories.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              type="button"
              key={cat}
              onClick={() => onSelectCategory(cat)}
              aria-pressed={active}
              className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer border ${
                active
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              {categoryIcons[cat] || (
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      {/* Row 2: Architecture, Verified SHA-256, Sort, and Visible Range Count */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2.5 border-t border-neutral-800/80 min-w-0">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Architecture selector */}
          <div
            role="group"
            aria-label="Filter by CPU architecture"
            className="flex flex-wrap items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-xl p-1 min-w-0"
          >
            <span className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 font-mono">
              <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Arch:</span>
            </span>
            {(['All', 'x86_64', 'aarch64', 'armhf'] as const).map((arch) => (
              <button
                type="button"
                key={arch}
                onClick={() => onSelectArch(arch)}
                aria-pressed={selectedArch === arch}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  selectedArch === arch
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                {arch}
              </button>
            ))}
          </div>

          {/* Verified SHA-256 Toggle */}
          <button
            type="button"
            onClick={onToggleVerified}
            aria-pressed={onlyVerified}
            className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              onlyVerified
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            <ShieldCheck
              className={`w-3.5 h-3.5 shrink-0 ${onlyVerified ? 'text-emerald-400' : 'text-neutral-400'}`}
              aria-hidden="true"
            />
            <span>Verified SHA-256 Only</span>
          </button>

          {/* Sort Selector */}
          <div className="min-h-[36px] flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
            <label htmlFor="catalog-sort-select" className="sr-only">
              Sort applications by
            </label>
            <select
              id="catalog-sort-select"
              aria-label="Sort applications by"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-xs font-medium text-neutral-200 focus:outline-none cursor-pointer"
            >
              <option value="featured" className="bg-neutral-900 text-white">
                Sort: Verified First
              </option>
              <option value="name" className="bg-neutral-900 text-white">
                Sort: Name (A–Z)
              </option>
              <option value="recent" className="bg-neutral-900 text-white">
                Sort: Recently Updated
              </option>
            </select>
          </div>

          {hasActiveFilters && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              aria-label="Reset all catalog filters"
              className="min-h-[36px] flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Visible Range & Total Count */}
        <div
          aria-live="polite"
          className="text-xs text-neutral-300 font-mono shrink-0"
        >
          {rangeLabel}
        </div>
      </div>
    </section>
  );
};
