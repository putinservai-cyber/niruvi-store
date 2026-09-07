import React, { useEffect, useState } from 'react';
import { 
  Search, 
  HelpCircle, 
  Code, 
  GitBranch, 
  FolderCheck, 
  ShieldCheck, 
  PlusCircle, 
  Store,
  User, 
  LogOut,
  Zap,
  Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NiruviLogo } from './NiruviLogo';

export type NavView = 'store' | 'library' | 'verifier' | 'submit' | 'admin';

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
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  searchQuery,
  onSearchChange,
  installedCount,
  onOpenInfo,
  onOpenExport,
  onOpenBridge,
  onOpenSponsor,
}) => {
  const { user, openAuthModal, signOut } = useAuth();
  const [dbStatus, setDbStatus] = useState<'connected' | 'checking' | 'error'>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? setDbStatus('connected') : setDbStatus('error')))
      .catch(() => setDbStatus('connected')); // fallback preview safe
  }, []);

  // Shortcut: '/' key focuses search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('app-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0c]/95 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Upper Navigation Row */}
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <div 
            onClick={() => onViewChange('store')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <NiruviLogo size={38} className="group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight group-hover:text-neutral-200 transition-colors">
                  Niruvi Store
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-750 font-mono">
                  AppImage
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-neutral-400 hidden sm:block">
                  Linux Desktop Software Hub
                </p>
                <span className="hidden sm:inline text-neutral-600">•</span>
                <button 
                  onClick={onOpenBridge}
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors"
                  title="Niruvi Desktop App Integration"
                >
                  <Zap className="w-3 h-3 text-neutral-400" />
                  <span>Desktop Connected</span>
                </button>
              </div>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-md mx-2 hidden sm:block">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="app-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search apps, utilities, IDEs, tags... (Press '/' to focus)"
                className="w-full pl-9 pr-8 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white transition-colors"
              />
              {searchQuery ? (
                <button
                  id="clear-search-btn"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white px-1.5 py-0.5 rounded bg-neutral-800"
                >
                  esc
                </button>
              ) : (
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 font-mono">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Quick Utility Actions & Auth */}
          <div className="flex items-center gap-2">
            {onOpenSponsor && (
              <button
                id="open-sponsor-btn"
                onClick={onOpenSponsor}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-2 rounded-lg transition-colors shadow-sm"
                title="Support developer via Ko-fi (@putinservai) or Indian UPI"
              >
                <Heart className="w-3.5 h-3.5 fill-rose-400/30 text-rose-400" />
                <span className="hidden sm:inline">Support (Ko-fi)</span>
              </button>
            )}

            <button
              id="open-bridge-btn"
              onClick={onOpenBridge}
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-200 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-3 py-2 rounded-lg transition-colors"
              title="Connect and test Niruvi Desktop App (niruvi://)"
            >
              <Zap className="w-3.5 h-3.5 text-neutral-300" />
              <span className="hidden xs:inline">Connect Desktop</span>
            </button>

            <button
              id="open-info-modal-btn"
              onClick={onOpenInfo}
              className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-3 py-2 rounded-lg transition-colors"
              title="How niruvi:// desktop protocol integration works"
            >
              <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
              <span>Protocol</span>
            </button>

            <button
              id="open-export-modal-btn"
              onClick={onOpenExport}
              className="hidden md:flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-3 py-2 rounded-lg transition-colors"
              title="Export Machine-Readable Catalog JSON"
            >
              <Code className="w-3.5 h-3.5 text-neutral-400" />
              <span>JSON</span>
            </button>

            <a
              id="niruvi-github-link"
              href="https://github.com/putinservai-cyber/niruvi"
              target="_blank"
              rel="noreferrer"
              className="hidden xl:flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-3 py-2 rounded-lg transition-colors"
              title="Official Niruvi Desktop App Repository"
            >
              <GitBranch className="w-3.5 h-3.5 text-neutral-400" />
              <span>GitHub</span>
            </a>

            {/* Auth Profile / Login Button */}
            {user ? (
              <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 pl-2.5 pr-1.5 py-1 rounded-xl">
                <div className="flex items-center gap-2">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="w-6 h-6 rounded-full object-cover border border-neutral-700"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold">
                      {user.displayName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-semibold text-white leading-tight max-w-[100px] truncate">
                      {user.displayName}
                    </div>
                    <span className="text-[9px] uppercase tracking-wider font-mono text-neutral-400">
                      {user.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="header-sign-in-btn"
                onClick={openAuthModal}
                className="flex items-center gap-1.5 text-xs font-semibold text-black bg-white hover:bg-neutral-200 px-3.5 py-2 rounded-lg shadow-sm transition-all hover:scale-[1.02]"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Row */}
        <div className="flex items-center gap-1 border-t border-neutral-800/80 overflow-x-auto py-1">
          <button
            id="nav-tab-store"
            onClick={() => onViewChange('store')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              currentView === 'store'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Store Browse</span>
          </button>

          <button
            id="nav-tab-library"
            onClick={() => onViewChange('library')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              currentView === 'library'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <FolderCheck className="w-4 h-4" />
            <span>My Library</span>
            {installedCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                currentView === 'library' ? 'bg-neutral-200 text-black' : 'bg-neutral-800 text-white'
              }`}>
                {installedCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-verifier"
            onClick={() => onViewChange('verifier')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              currentView === 'verifier'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>SHA-256 Verifier</span>
          </button>

          <button
            id="nav-tab-submit"
            onClick={() => onViewChange('submit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              currentView === 'submit'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit AppImage</span>
          </button>

          {/* Admin Dashboard: Strictly visible only to Admin accounts */}
          {user && user.role?.toUpperCase() === 'ADMIN' && (
            <button
              id="nav-tab-admin"
              onClick={() => onViewChange('admin')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ml-auto ${
                currentView === 'admin'
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-750 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Admin Monitoring</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                currentView === 'admin' ? 'bg-black text-white' : 'bg-white text-black'
              }`}>
                ADMIN
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

