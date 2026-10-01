import React from 'react';
import { AppMetadata } from '../types';
import { AppIcon } from './AppIcon';
import { 
  CheckCircle2, 
  Download, 
  HardDrive, 
  Star, 
  Check, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface AppCardProps {
  app: AppMetadata;
  isInstalled: boolean;
  isBookmarked: boolean;
  onSelect: (app: AppMetadata) => void;
  onInstall: (app: AppMetadata) => void;
  onToggleBookmark: (appId: string) => void;
}

const getSourceBadge = (app: AppMetadata) => {
  const tier = app.trustTier || (app.sourceType === 'Official' ? 'Official Developer' : 'Verified Community');
  if (tier === 'Official Developer') {
    return { label: 'Official', title: 'Official Developer Build', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  }
  if (tier === 'Verified Community') {
    return { label: 'Verified Comm.', title: 'Verified Community Packaged Build', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
  }
  if (tier === 'Unverified Community') {
    return { label: 'Unverified', title: 'Unverified Community Build', color: 'bg-neutral-800 text-neutral-400 border-neutral-700' };
  }
  if (app.isUserAdded) {
    return { label: 'User Added', title: 'Custom App Added', color: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' };
  }
  return null;
};

export const AppCard: React.FC<AppCardProps> = ({ 
  app, 
  isInstalled,
  isBookmarked,
  onSelect, 
  onInstall,
  onToggleBookmark 
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(app);
    }
  };

  const sourceBadge = getSourceBadge(app);

  return (
    <div 
      id={`app-card-${app.id}`}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${app.name} version ${app.version}`}
      onClick={() => onSelect(app)}
      onKeyDown={handleKeyDown}
      className="group relative flex flex-col bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white"
    >
      {/* Top row: Icon + Identity + Bookmark */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3.5 min-w-0">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center bg-neutral-800/80 border border-neutral-700/60 p-1.5 shadow-md flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden"
          >
            <AppIcon 
              slug={app.iconSlug} 
              iconUrl={app.icon} 
              name={app.name} 
              brandColor={app.brandColor} 
              className="w-9 h-9 sm:w-10 sm:h-10" 
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-base text-white tracking-tight truncate group-hover:text-neutral-200 transition-colors">
                {app.name}
              </h3>
              {app.publisher.verified && (
                <span title="Verified Publisher" className="text-neutral-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 truncate mt-0.5">
              {app.publisher.name}
            </p>
          </div>
        </div>

        {/* Bookmark star button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(app.id);
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            isBookmarked 
              ? 'text-amber-400 hover:text-amber-300' 
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
          }`}
          title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this App'}
        >
          <Star className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
        </button>
      </div>

      {/* Tagline */}
      <p className="text-xs text-neutral-300 line-clamp-2 mb-4 leading-relaxed flex-1">
        {app.tagline}
      </p>

      {/* Meta tags & Architecture */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4 text-[11px]">
        {sourceBadge && (
          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${sourceBadge.color}`}>
            {sourceBadge.label}
          </span>
        )}
        <span className="px-2 py-0.5 rounded-md bg-neutral-800/80 text-neutral-300 border border-neutral-750">
          {app.category}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-neutral-800/80 text-neutral-300 border border-neutral-750 flex items-center gap-1">
          <HardDrive className="w-3 h-3 text-neutral-400" />
          {app.size}
        </span>
        {app.architectures.map((arch) => (
          <span key={arch} className="px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-300 border border-neutral-800 font-mono text-[10px]">
            {arch}
          </span>
        ))}
        {isInstalled && (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-medium text-[10px]">
            <Check className="w-3 h-3" />
            Installed
          </span>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-800 mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
          <span>v{app.version}</span>
          <span>•</span>
          <span className="truncate max-w-[90px]" title={app.license}>{app.license}</span>
        </div>

        <button
          id={`install-btn-${app.id}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInstall(app);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors ${
            isInstalled
              ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
              : 'bg-white hover:bg-neutral-200 text-black font-semibold'
          }`}
          title="Install or download AppImage"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isInstalled ? 'Manage' : 'Install'}</span>
        </button>
      </div>
    </div>
  );
};
