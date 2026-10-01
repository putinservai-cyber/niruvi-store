import React from 'react';
import { AppMetadata } from '../types';
import { AppIcon } from './AppIcon';
import { sanitizeText } from '../utils/sanitize';
import {
  CheckCircle2,
  Download,
  HardDrive,
  Star,
  Check,
  ShieldCheck,
  Users,
  Cpu,
  Scale,
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
  const tier =
    app.trustTier || (app.sourceType === 'Official' ? 'Official Developer' : 'Verified Community');
  if (tier === 'Official Developer') {
    return {
      label: 'Official',
      title: 'Official Developer Build',
      color: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      isOfficial: true,
    };
  }
  if (tier === 'Verified Community') {
    return {
      label: 'Verified Community',
      title: 'Verified Community Packaged Build',
      color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      isOfficial: false,
    };
  }
  if (tier === 'Unverified Community') {
    return {
      label: 'Unverified',
      title: 'Unverified Community Build',
      color: 'bg-neutral-800 text-neutral-300 border-neutral-700',
      isOfficial: false,
    };
  }
  if (app.isUserAdded) {
    return {
      label: 'User Added',
      title: 'Custom App Added',
      color: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40',
      isOfficial: false,
    };
  }
  return null;
};

export const AppCard: React.FC<AppCardProps> = ({
  app,
  isInstalled,
  isBookmarked,
  onSelect,
  onInstall,
  onToggleBookmark,
}) => {
  const sourceBadge = getSourceBadge(app);
  const cleanName = sanitizeText(app.name, 100);
  const cleanPublisher = sanitizeText(app.publisher.name, 80);
  const cleanTagline = sanitizeText(app.tagline, 300);

  return (
    <article
      id={`app-card-${app.id}`}
      aria-label={`${cleanName} version ${app.version}`}
      className="group relative flex flex-col bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 transition-all duration-150 shadow-sm hover:shadow-md"
    >
      {/* Top row: Icon + Identity + Bookmark */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <button
          type="button"
          onClick={() => onSelect(app)}
          aria-label={`View details for ${cleanName} v${app.version}`}
          className="flex items-start gap-3.5 min-w-0 text-left flex-1 cursor-pointer rounded-xl focus:outline-hidden"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-neutral-800/80 border border-neutral-700/60 p-1.5 shadow-md flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
            <AppIcon
              slug={app.iconSlug}
              iconUrl={app.icon}
              name={cleanName}
              brandColor={app.brandColor}
              className="w-9 h-9 sm:w-10 sm:h-10"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-base text-white tracking-tight truncate group-hover:text-sky-300 transition-colors">
                {cleanName}
              </h3>
              {app.publisher.verified && (
                <span
                  title="Verified Publisher"
                  aria-label="Verified Publisher"
                  className="text-emerald-400 inline-flex items-center"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-300 truncate mt-0.5">{cleanPublisher}</p>
          </div>
        </button>

        {/* Bookmark star button (minimum 44x44px target size) */}
        <button
          type="button"
          onClick={() => onToggleBookmark(app.id)}
          aria-pressed={isBookmarked}
          aria-label={isBookmarked ? `Remove ${cleanName} from bookmarks` : `Bookmark ${cleanName}`}
          className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
            isBookmarked
              ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-800 border border-transparent'
          }`}
          title={isBookmarked ? `Remove ${cleanName} from bookmarks` : `Bookmark ${cleanName}`}
        >
          <Star className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* Tagline (clickable to open detail modal) */}
      <button
        type="button"
        onClick={() => onSelect(app)}
        className="text-left text-xs text-neutral-200 line-clamp-2 mb-4 leading-relaxed flex-1 cursor-pointer hover:text-white"
      >
        {cleanTagline}
      </button>

      {/* Meta tags & Architecture (Icon + Text so colour alone is never used) */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4 text-[11px]">
        {sourceBadge && (
          <span
            title={sourceBadge.title}
            className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold inline-flex items-center gap-1 ${sourceBadge.color}`}
          >
            {sourceBadge.isOfficial ? (
              <ShieldCheck className="w-3 h-3" aria-hidden="true" />
            ) : (
              <Users className="w-3 h-3" aria-hidden="true" />
            )}
            <span>{sourceBadge.label}</span>
          </span>
        )}
        <span className="px-2 py-0.5 rounded-md bg-neutral-800/80 text-neutral-200 border border-neutral-700">
          {app.category}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-neutral-800/80 text-neutral-200 border border-neutral-700 inline-flex items-center gap-1">
          <HardDrive className="w-3 h-3 text-neutral-300" aria-hidden="true" />
          <span>{app.size}</span>
        </span>
        {app.architectures.map((arch) => (
          <span
            key={arch}
            className="px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-200 border border-neutral-700 font-mono text-[10px] inline-flex items-center gap-1"
          >
            <Cpu className="w-2.5 h-2.5 text-sky-400" aria-hidden="true" />
            <span>{arch}</span>
          </span>
        ))}
        {isInstalled && (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1 font-semibold text-[10px]">
            <Check className="w-3 h-3" aria-hidden="true" />
            <span>Installed</span>
          </span>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-800 mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-mono">
          <span>v{app.version}</span>
          <span aria-hidden="true">•</span>
          <span className="inline-flex items-center gap-1 truncate max-w-[110px]" title={`License: ${app.license}`}>
            <Scale className="w-3 h-3 text-neutral-400 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{app.license}</span>
          </span>
        </div>

        <button
          id={`install-btn-${app.id}`}
          type="button"
          onClick={() => onInstall(app)}
          aria-label={isInstalled ? `Manage ${cleanName} installation` : `Install ${cleanName} with Niruvi`}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
            isInstalled
              ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-600'
              : 'bg-white hover:bg-neutral-200 text-black font-bold'
          }`}
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isInstalled ? 'Manage' : `Install with Niruvi`}</span>
        </button>
      </div>
    </article>
  );
};
