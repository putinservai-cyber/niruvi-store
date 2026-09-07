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

export const AppCard: React.FC<AppCardProps> = ({ 
  app, 
  isInstalled,
  isBookmarked,
  onSelect, 
  onInstall,
  onToggleBookmark 
}) => {
  return (
    <div 
      id={`app-card-${app.id}`}
      onClick={() => onSelect(app)}
      className="group relative flex flex-col bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md"
    >
      {/* Top row: Icon + Identity + Bookmark */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3.5 min-w-0">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform"
            style={{ backgroundColor: `${app.brandColor || '#ffffff'}15`, border: `1px solid ${app.brandColor || '#ffffff'}30` }}
          >
            <AppIcon slug={app.iconSlug} className="w-6 h-6" />
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
