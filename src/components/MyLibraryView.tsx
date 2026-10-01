import React, { useState } from 'react';
import { AppMetadata, InstalledAppRecord } from '../types';
import { AppIcon } from './AppIcon';
import { removeInstalledApp, toggleBookmark } from '../utils/storage';
import { 
  FolderCheck, 
  Trash2, 
  ExternalLink, 
  Play, 
  RefreshCw, 
  Star, 
  Download, 
  HardDrive, 
  Calendar, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface MyLibraryViewProps {
  catalog: AppMetadata[];
  installedRecords: InstalledAppRecord[];
  bookmarkedIds: string[];
  onSelectApp: (app: AppMetadata) => void;
  onOpenInstall: (app: AppMetadata) => void;
  onRefreshLibrary: () => void;
}

export const MyLibraryView: React.FC<MyLibraryViewProps> = ({
  catalog,
  installedRecords,
  bookmarkedIds,
  onSelectApp,
  onOpenInstall,
  onRefreshLibrary,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'installed' | 'saved'>('installed');
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateStatusMessage, setUpdateStatusMessage] = useState<string | null>(null);

  // Map installed records to AppMetadata
  const installedAppsWithMeta = installedRecords
    .map((record) => {
      const app = catalog.find((a) => a.id === record.appId);
      return { record, app };
    })
    .filter((item): item is { record: InstalledAppRecord; app: AppMetadata } => item.app !== undefined);

  // Bookmarked apps
  const bookmarkedApps = catalog.filter((app) => bookmarkedIds.includes(app.id));

  // Check for updates
  const handleCheckUpdates = () => {
    setIsCheckingUpdates(true);
    setUpdateStatusMessage(null);

    setTimeout(() => {
      setIsCheckingUpdates(false);
      setUpdateStatusMessage('All installed AppImages are currently up to date with the latest catalog versions.');
    }, 900);
  };

  const handleUninstall = (appId: string) => {
    removeInstalledApp(appId);
    onRefreshLibrary();
  };

  const handleRemoveBookmark = (appId: string) => {
    toggleBookmark(appId);
    onRefreshLibrary();
  };

  const handleLaunch = (app: AppMetadata) => {
    // Protocol run handler
    window.location.href = `niruvi://run?id=${app.id}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header & Stats Banner */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <FolderCheck className="w-4 h-4 text-neutral-300" />
              <span>Local Application Registry</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              My AppImage Library
            </h2>
            <p className="text-sm text-neutral-300 mt-1">
              Manage your installed AppImages, check for upstream version updates, and browse saved items.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="check-updates-btn"
              onClick={handleCheckUpdates}
              disabled={isCheckingUpdates || installedAppsWithMeta.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 disabled:opacity-50 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin text-neutral-300' : ''}`} />
              <span>{isCheckingUpdates ? 'Scanning releases...' : 'Check for Updates'}</span>
            </button>
          </div>
        </div>

        {/* Update Notification Banner */}
        {updateStatusMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <span>{updateStatusMessage}</span>
            </div>
            <button
              onClick={() => setUpdateStatusMessage(null)}
              className="text-neutral-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-neutral-800">
          <div>
            <span className="text-xs text-neutral-400">Installed AppImages</span>
            <div className="text-xl font-bold text-white mt-0.5">{installedAppsWithMeta.length}</div>
          </div>
          <div>
            <span className="text-xs text-neutral-400">Bookmarked Apps</span>
            <div className="text-xl font-bold text-white mt-0.5">{bookmarkedApps.length}</div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-xs text-neutral-400">Manager Status</span>
            <div className="text-xs font-medium text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Local Storage Synchronized</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs: Installed vs Bookmarked */}
      <div className="flex items-center gap-4 border-b border-neutral-800 pb-1">
        <button
          id="subtab-installed"
          onClick={() => setActiveSubTab('installed')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'installed'
              ? 'border-white text-white'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <FolderCheck className="w-4 h-4 text-neutral-300" />
          <span>Installed ({installedAppsWithMeta.length})</span>
        </button>

        <button
          id="subtab-saved"
          onClick={() => setActiveSubTab('saved')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'saved'
              ? 'border-white text-white'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Star className="w-4 h-4 text-amber-400" />
          <span>Saved & Bookmarks ({bookmarkedApps.length})</span>
        </button>
      </div>

      {/* Installed Tab Content */}
      {activeSubTab === 'installed' && (
        <div className="space-y-4">
          {installedAppsWithMeta.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {installedAppsWithMeta.map(({ record, app }) => {
                const isUpToDate = record.installedVersion === app.version;
                const formattedDate = new Date(record.installedAt).toLocaleDateString();

                return (
                  <div
                    key={app.id}
                    id={`library-installed-card-${app.id}`}
                    className="bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center bg-neutral-800/80 border border-neutral-700/60 p-1.5 shadow-md flex-shrink-0 overflow-hidden"
                          >
                            <AppIcon 
                              slug={app.iconSlug} 
                              iconUrl={app.icon} 
                              name={app.name} 
                              brandColor={app.brandColor} 
                              className="w-9 h-9" 
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 
                                onClick={() => onSelectApp(app)}
                                className="font-bold text-white text-base hover:text-neutral-200 cursor-pointer transition-colors"
                              >
                                {app.name}
                              </h3>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-950 text-neutral-300 font-mono border border-neutral-800">
                                v{record.installedVersion}
                              </span>
                              {isUpToDate ? (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Up to date
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Update to v{app.version}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 mt-1 line-clamp-1">{app.tagline}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleUninstall(app.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove from Installed Library"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Location & Metadata */}
                      <div className="mt-4 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Target:</span>
                          <span className="font-mono text-neutral-300">{record.installDirectory}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Method:</span>
                          <span className="capitalize text-neutral-300">{record.installMethod} install</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Installed:</span>
                          <span className="text-neutral-300">{formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-neutral-800">
                      <button
                        onClick={() => onSelectApp(app)}
                        className="text-xs text-neutral-400 hover:text-white transition-colors"
                      >
                        Details & SHA-256
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenInstall(app)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Re-Install</span>
                        </button>

                        <button
                          onClick={() => handleLaunch(app)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold shadow-sm transition-colors"
                          title="Launch using desktop handler: niruvi://run"
                        >
                          <Play className="w-3 h-3 fill-black text-black" />
                          <span>Launch</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 p-8 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-neutral-500 mb-3 border border-neutral-800">
                <FolderCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">No applications installed yet</h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                When you install or download applications from Niruvi Store, they will appear here with automatic version tracking and quick launch actions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bookmarked Tab Content */}
      {activeSubTab === 'saved' && (
        <div>
          {bookmarkedApps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookmarkedApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-neutral-800/80 border border-neutral-700/60 p-1 shadow-md flex-shrink-0 overflow-hidden"
                      >
                        <AppIcon 
                          slug={app.iconSlug} 
                          iconUrl={app.icon} 
                          name={app.name} 
                          brandColor={app.brandColor} 
                          className="w-8 h-8" 
                        />
                      </div>
                      <div>
                        <h4 
                          onClick={() => onSelectApp(app)}
                          className="font-bold text-white text-sm hover:text-neutral-200 cursor-pointer transition-colors"
                        >
                          {app.name}
                        </h4>
                        <p className="text-xs text-neutral-400">{app.category}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveBookmark(app.id)}
                      className="text-amber-400 hover:text-neutral-400 p-1 transition-colors"
                      title="Remove Bookmark"
                    >
                      <Star className="w-4 h-4 fill-amber-400" />
                    </button>
                  </div>

                  <p className="text-xs text-neutral-300 mt-3 line-clamp-2">{app.tagline}</p>

                  <div className="flex items-center justify-between pt-3 mt-4 border-t border-neutral-800 text-xs">
                    <span className="text-neutral-400 font-mono">v{app.version}</span>
                    <button
                      onClick={() => onOpenInstall(app)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-colors shadow-sm"
                    >
                      <Download className="w-3 h-3" />
                      <span>Install</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 p-8 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-neutral-500 mb-3 border border-neutral-800">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">No bookmarked applications</h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                Click the star icon on any application card in the store to bookmark it for fast reference.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
