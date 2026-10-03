import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShieldCheck,
  Bookmark,
  PlusCircle,
  X,
  User,
  LogOut,
  Compass,
  Sun,
  Moon,
  Heart,
  Package,
  Building2,
} from 'lucide-react';
import { NiruviLogo } from './NiruviLogo';
import { useAuth } from '../context/AuthContext';
import { DEVELOPER_NAME } from '../config/site';

export type NavTab =
  | 'browse'
  | 'verifier'
  | 'library'
  | 'submit'
  | 'donate'
  | 'admin'
  | 'account'
  | 'publisher'
  | 'moderation';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalApps: number;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  starredCount: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  showSearch?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  totalApps,
  activeTab,
  onTabChange,
  starredCount,
  theme = 'dark',
  onToggleTheme,
  showSearch = true,
}) => {
  const { user, openAuthModal, openAccountModal, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if (
        (e.key === '/' && !isInputFocused && !e.metaKey && !e.ctrlKey && !e.altKey) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        if (activeTab !== 'browse') {
          onTabChange('browse');
        }
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, onTabChange]);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-neutral-950/95 border-b border-neutral-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-2.5 sm:py-3">
        {/* Responsive Primary Header Grid:
            - Mobile & Tablet (< 1024px): Row 1 has Brand (left) + Nav/Actions (right); Row 2 has full-width Search Bar
            - Desktop (>= 1024px): Single balanced 3-column row [Brand | Search | Nav + Actions] with zero overflow */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[auto_minmax(220px,1fr)_auto] items-center gap-2.5 sm:gap-4">
          {/* 1. Brand Logo & Title */}
          <button
            type="button"
            onClick={() => onTabChange('browse')}
            className="order-1 min-w-0 flex items-center gap-2.5 sm:gap-3 shrink-0 cursor-pointer group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-lg"
          >
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 group-hover:border-sky-500/50 transition-colors shrink-0">
              <NiruviLogo className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white truncate">
                  Niruvi Store
                </span>
                <span className="hidden xl:inline-block text-xs font-mono text-neutral-400 shrink-0">
                  · {totalApps.toLocaleString()} AppImages
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate">
                Linux AppImage Catalog · by {DEVELOPER_NAME}
              </p>
            </div>
          </button>

          {/* 2. Primary Header Search Bar (Visible on Catalog Browse View, Responsive across Mobile/Tablet/Desktop) */}
          {showSearch ? (
            <form
              role="search"
              aria-label="Catalog search"
              onSubmit={(e) => e.preventDefault()}
              className="order-3 col-span-2 lg:order-2 lg:col-span-1 w-full max-w-xl lg:mx-auto min-w-0"
            >
              <label htmlFor="catalog-search-input" className="sr-only">
                Search Linux AppImages by name, category, publisher, or tag
              </label>
              <div className="relative flex items-center w-full min-w-0">
                <Search
                  className="w-4 h-4 text-sky-400 absolute left-3.5 pointer-events-none shrink-0"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  id="catalog-search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    if (activeTab !== 'browse') onTabChange('browse');
                  }}
                  aria-label="Search Linux AppImages by name, category, publisher, or tag"
                  placeholder={`Search ${totalApps.toLocaleString()} Linux AppImages... ( / )`}
                  className="w-full min-w-0 min-h-[40px] pl-10 pr-12 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="Clear search query"
                    className="absolute right-2.5 p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                ) : (
                  <kbd
                    aria-hidden="true"
                    className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-400 absolute right-3 pointer-events-none"
                  >
                    /
                  </kbd>
                )}
              </div>
            </form>
          ) : (
            <div className="hidden lg:block lg:order-2" />
          )}

          {/* 3. Tablet/Desktop Navigation Links + Theme & Account Controls */}
          <div className="order-2 lg:order-3 flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 min-w-0">
            <nav
              aria-label="Main store navigation"
              className="hidden md:flex items-center gap-1 bg-neutral-900/80 p-1 rounded-xl border border-neutral-800"
            >
              <button
                type="button"
                onClick={() => onTabChange('browse')}
                aria-current={activeTab === 'browse' ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'browse'
                    ? 'bg-sky-600 text-white'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80'
                }`}
              >
                <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Catalog</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('verifier')}
                aria-current={activeTab === 'verifier' ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'verifier'
                    ? 'bg-sky-600 text-white'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="hidden xl:inline">SHA-256 Verifier</span>
                <span className="xl:hidden">Verifier</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('library')}
                aria-current={activeTab === 'library' ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'library'
                    ? 'bg-sky-600 text-white'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Saved</span>
                {starredCount > 0 && (
                  <span className="font-mono text-[11px] opacity-90">({starredCount})</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onTabChange('submit')}
                aria-current={activeTab === 'submit' ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'submit'
                    ? 'bg-sky-600 text-white'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Submit App</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('donate')}
                aria-current={activeTab === 'donate' ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'donate'
                    ? 'bg-sky-600 text-white'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" aria-hidden="true" />
                <span>Donate</span>
              </button>
            </nav>

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
                title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors cursor-pointer shrink-0"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Sun className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            )}

            {/* Account Menu */}
            {user ? (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label={`Account menu for ${user.displayName}`}
                  className="min-h-[38px] flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer"
                >
                  <img
                    src={
                      user.avatarUrl ||
                      `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`
                    }
                    alt={user.displayName}
                    className="w-5 h-5 rounded-md object-cover bg-neutral-800 shrink-0"
                  />
                  <span className="hidden sm:block text-xs font-medium text-white max-w-[96px] truncate">
                    {user.displayName}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-neutral-900 border border-neutral-800 shadow-xl py-1.5 z-50">
                    <div className="px-3.5 py-2 border-b border-neutral-800">
                      <p className="text-xs font-semibold text-white truncate">
                        {user.displayName}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono truncate">
                        @{user.username}
                      </p>
                    </div>
                    <div className="p-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          onTabChange('account');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Account Dashboard</span>
                      </button>

                      {(user.role === 'DEVELOPER' || user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            onTabChange('publisher');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Publisher Dashboard</span>
                        </button>
                      )}

                      {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            onTabChange('admin');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                          <span>Moderation Console</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 font-medium text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                <User className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bar (< 768px) — 5 equal columns with min-w-0 so it never overflows */}
        <nav
          aria-label="Mobile store navigation"
          className="md:hidden grid grid-cols-5 gap-1.5 pt-2.5 mt-2.5 border-t border-neutral-800/80"
        >
          <button
            type="button"
            onClick={() => onTabChange('browse')}
            aria-current={activeTab === 'browse' ? 'page' : undefined}
            className={`min-h-[38px] min-w-0 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Catalog</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('verifier')}
            aria-current={activeTab === 'verifier' ? 'page' : undefined}
            className={`min-h-[38px] min-w-0 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'verifier'
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
            <span className="truncate">Verify</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('library')}
            aria-current={activeTab === 'library' ? 'page' : undefined}
            className={`min-h-[38px] min-w-0 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'library'
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              Saved{starredCount > 0 ? ` (${starredCount})` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('submit')}
            aria-current={activeTab === 'submit' ? 'page' : undefined}
            className={`min-h-[38px] min-w-0 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'submit'
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Submit</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('donate')}
            aria-current={activeTab === 'donate' ? 'page' : undefined}
            className={`min-h-[38px] min-w-0 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'donate'
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" aria-hidden="true" />
            <span className="truncate">Donate</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
