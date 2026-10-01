import React, { useEffect } from 'react';
import {
  HelpCircle,
  GitBranch,
  FolderCheck,
  ShieldCheck,
  PlusCircle,
  Store,
  User,
  LogOut,
  Zap,
  Heart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NiruviLogo } from './NiruviLogo';

export type NavView =
  | 'store'
  | 'library'
  | 'verifier'
  | 'submit'
  | 'admin'
  | 'security'
  | 'privacy'
  | 'terms'
  | 'cookies'
  | 'refunds';

interface NavbarProps {
  currentView: NavView;
  onViewChange: (v: NavView) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  installedCount: number;
  onOpenInfo: () => void;
  onOpenExport: () => void;
  onOpenBridge: () => void;
  onOpenSponsor?: () => void;
  onOpenPricing?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  installedCount,
  onOpenInfo,
  onOpenBridge,
  onOpenSponsor,
}) => {
  const { user, openAuthModal, openAccountModal, signOut } = useAuth();

  // Shortcut: '/' key focuses search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        document.getElementById('store-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 bg-[#0a0a0c]/95 backdrop-blur-md border-b border-neutral-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Upper Navigation Row */}
        <div className="min-h-16 py-2 flex items-center justify-between gap-4">
          {/* Brand Identity (Native Button instead of clickable div) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onViewChange('store')}
              aria-label="Niruvi Store home"
              className="min-h-[44px] flex items-center gap-3 cursor-pointer group text-left rounded-xl px-1.5 py-1 hover:bg-neutral-900/60 transition-colors"
            >
              <NiruviLogo size={38} className="group-hover:scale-105 transition-transform" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-white tracking-tight group-hover:text-neutral-200 transition-colors">
                    Niruvi Store
                  </span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-200 border border-neutral-700 font-mono">
                    AppImage
                  </span>
                </div>
                <span className="text-[11px] text-neutral-300 hidden sm:block">
                  Linux Desktop Software Hub
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={onOpenBridge}
              className="hidden md:inline-flex min-h-[44px] items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              title="Niruvi Desktop App Integration"
            >
              <Zap className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              <span>Desktop Bridge</span>
            </button>
          </div>

          {/* Quick Utility Actions & Auth */}
          <div className="flex items-center gap-2">
            {onOpenSponsor && (
              <button
                id="open-sponsor-btn"
                type="button"
                onClick={onOpenSponsor}
                className="min-h-[44px] flex items-center gap-1.5 text-xs font-semibold text-rose-200 hover:text-white bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
                title="Support Open-Source Store & Linux App Developers (Ko-fi / UPI)"
              >
                <Heart className="w-3.5 h-3.5 fill-rose-400/30 text-rose-300" aria-hidden="true" />
                <span>Donate &amp; Support</span>
              </button>
            )}

            <button
              id="open-bridge-btn"
              type="button"
              onClick={onOpenBridge}
              className="min-h-[44px] flex items-center gap-1.5 text-xs font-semibold text-neutral-200 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 px-3 py-2 rounded-lg transition-colors cursor-pointer"
              title="Connect and test Niruvi Desktop App (niruvi://)"
            >
              <Zap className="w-3.5 h-3.5 text-neutral-200" aria-hidden="true" />
              <span className="hidden xs:inline">Connect Desktop</span>
            </button>

            <button
              id="open-info-modal-btn"
              type="button"
              onClick={onOpenInfo}
              className="hidden lg:flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-neutral-200 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 px-3 py-2 rounded-lg transition-colors cursor-pointer"
              title="How niruvi:// desktop protocol integration works"
            >
              <HelpCircle className="w-3.5 h-3.5 text-neutral-300" aria-hidden="true" />
              <span>Protocol Guide</span>
            </button>

            <a
              id="niruvi-github-link"
              href="https://github.com/putinservai-cyber/niruvi"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xl:flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-neutral-200 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 px-3 py-2 rounded-lg transition-colors"
              title="Official Niruvi Desktop App Repository"
            >
              <GitBranch className="w-3.5 h-3.5 text-neutral-300" aria-hidden="true" />
              <span>GitHub Repository</span>
            </a>

            {/* Auth Profile / Account Management Button */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={openAccountModal}
                  className="min-h-[44px] flex items-center gap-2 pl-2 pr-2 py-1 rounded-lg hover:bg-neutral-800 transition text-left cursor-pointer"
                  aria-label={`Open account settings for ${user.displayName}`}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={`${user.displayName} avatar`}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full object-cover border border-neutral-600"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold"
                    >
                      {user.displayName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:block">
                    <div className="text-xs font-semibold text-white leading-tight max-w-[100px] truncate">
                      {user.displayName}
                    </div>
                    <span className="text-[9px] uppercase tracking-wider font-mono text-neutral-300">
                      Account
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  aria-label="Sign out of account"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-neutral-300 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                id="header-sign-in-btn"
                type="button"
                onClick={openAuthModal}
                className="min-h-[44px] flex items-center gap-1.5 text-xs font-semibold text-black bg-white hover:bg-neutral-200 px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Row */}
        <nav
          aria-label="Primary store navigation"
          className="flex items-center gap-1.5 border-t border-neutral-800/80 overflow-x-auto py-1.5"
        >
          <button
            id="nav-tab-store"
            type="button"
            onClick={() => onViewChange('store')}
            aria-current={currentView === 'store' ? 'page' : undefined}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              currentView === 'store'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Store className="w-4 h-4" aria-hidden="true" />
            <span>Store Browse</span>
          </button>

          <button
            id="nav-tab-library"
            type="button"
            onClick={() => onViewChange('library')}
            aria-current={currentView === 'library' ? 'page' : undefined}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              currentView === 'library'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <FolderCheck className="w-4 h-4" aria-hidden="true" />
            <span>My Library</span>
            {installedCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  currentView === 'library'
                    ? 'bg-neutral-200 text-black'
                    : 'bg-neutral-800 text-white'
                }`}
              >
                {installedCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-verifier"
            type="button"
            onClick={() => onViewChange('verifier')}
            aria-current={currentView === 'verifier' ? 'page' : undefined}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              currentView === 'verifier'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>SHA-256 Verifier</span>
          </button>

          <button
            id="nav-tab-submit"
            type="button"
            onClick={() => onViewChange('submit')}
            aria-current={currentView === 'submit' ? 'page' : undefined}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              currentView === 'submit'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>Submit AppImage</span>
          </button>

          {/* Admin Dashboard: Strictly visible only to Admin accounts */}
          {user && user.role?.toUpperCase() === 'ADMIN' && (
            <button
              id="nav-tab-admin"
              type="button"
              onClick={() => onViewChange('admin')}
              aria-current={currentView === 'admin' ? 'page' : undefined}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ml-auto cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-neutral-900 text-neutral-200 border-neutral-700 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Admin Monitoring</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                  currentView === 'admin' ? 'bg-black text-white' : 'bg-white text-black'
                }`}
              >
                ADMIN
              </span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
