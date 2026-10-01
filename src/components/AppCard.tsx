import React from 'react';
import { AppMetadata } from '../types';
import { isGenuineSha256 } from '../utils/catalogSchema';
import { ShieldCheck, Download, Bookmark, Cpu, HardDrive, ExternalLink } from 'lucide-react';
import { AppIcon } from './AppIcon';

interface AppCardProps {
  app: AppMetadata;
  onSelect: (app: AppMetadata) => void;
  onInstall: (app: AppMetadata, e: React.MouseEvent) => void;
  isStarred?: boolean;
  onToggleStar?: (appId: string, e: React.MouseEvent) => void;
}

export const AppCard: React.FC<AppCardProps> = ({
  app,
  onSelect,
  onInstall,
  isStarred = false,
  onToggleStar,
}) => {
  const isTrulyVerified = Boolean(app.publisher.verified && isGenuineSha256(app.sha256));
  const summaryText = (app.tagline || app.description || '').trim();
  const displayVersion =
    app.version && app.version !== 'latest' ? `v${app.version.replace(/^v/i, '')}` : 'latest';

  return (
    <article
      aria-label={app.name}
      className="group relative min-w-0 w-full overflow-hidden bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 hover:border-sky-500/60 hover:bg-neutral-900/90 transition-colors flex flex-col justify-between h-full"
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2.5 mb-3.5 min-w-0">
          <button
            type="button"
            onClick={() => onSelect(app)}
            aria-label={`View details for ${app.name}`}
            className="relative shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
          >
            <AppIcon
              slug={app.iconSlug || app.id}
              name={app.name}
              iconUrl={app.icon}
              brandColor={app.brandColor}
              className="w-12 h-12 rounded-xl group-hover:scale-[1.02] transition-transform duration-200"
            />
          </button>

          <div className="flex items-center gap-1.5 flex-wrap justify-end min-w-0">
            {onToggleStar && (
              <button
                type="button"
                onClick={(e) => onToggleStar(app.id, e)}
                aria-label={
                  isStarred ? `Remove ${app.name} from saved` : `Save ${app.name} to library`
                }
                aria-pressed={isStarred}
                title={isStarred ? 'Remove from My Library' : 'Save to My Library'}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                  isStarred
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                    : 'bg-neutral-800/80 border-neutral-700/80 text-neutral-400 hover:text-white hover:border-neutral-600'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isStarred ? 'fill-sky-400' : ''}`} />
              </button>
            )}
            <span className="px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700/80 text-xs font-medium text-neutral-300 truncate max-w-[140px]">
              {app.simplifiedCategory || app.category}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelect(app)}
          aria-label={`View details for ${app.name} — ${summaryText || app.category}`}
          className="text-left w-full min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-lg cursor-pointer"
        >
          <div className="mb-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-base font-semibold text-white group-hover:text-sky-400 transition-colors truncate min-w-0">
                {app.name}
              </h2>
              {isTrulyVerified && (
                <span
                  title="Verified SHA-256 checksum"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-medium text-emerald-400 shrink-0"
                >
                  <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                  <span>Verified SHA-256</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 truncate mt-0.5">{app.publisher.name}</p>
          </div>

          {summaryText ? (
            <p className="text-xs text-neutral-300 line-clamp-2 mb-4 leading-relaxed break-words">
              {summaryText}
            </p>
          ) : (
            <p className="text-xs text-neutral-500 italic mb-4 leading-relaxed">
              No description provided by upstream repository.
            </p>
          )}
        </button>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-3.5 text-xs text-neutral-300 font-mono min-w-0">
          <span className="px-2 py-0.5 rounded bg-neutral-800/90 border border-neutral-700/70 truncate max-w-[110px]">
            {displayVersion}
          </span>
          {app.size && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800/90 border border-neutral-700/70 shrink-0">
              <HardDrive className="w-3 h-3 text-neutral-400 shrink-0" aria-hidden="true" />
              <span>{app.size}</span>
            </span>
          )}
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800/90 border border-neutral-700/70 truncate max-w-[140px]">
            <Cpu className="w-3 h-3 text-sky-400 shrink-0" aria-hidden="true" />
            <span className="truncate">{app.architectures.join(', ')}</span>
          </span>
          {app.license && (
            <span className="px-2 py-0.5 rounded bg-neutral-800/90 border border-neutral-700/70 truncate max-w-[110px]">
              {app.license}
            </span>
          )}
        </div>

        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2 min-w-0">
          <div className="text-[11px] text-neutral-400 font-mono truncate min-w-0">
            {isTrulyVerified ? (
              <span className="text-emerald-400">SHA-256: {app.sha256.slice(0, 10)}…</span>
            ) : (
              <span>Checksum not available</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={app.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Direct download ${app.name}`}
              title="Direct HTTPS download from upstream publisher"
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            >
              {app.downloadUrl.toLowerCase().endsWith('.appimage') ? (
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </a>
            <button
              type="button"
              onClick={(e) => onInstall(app, e)}
              aria-label={`Install ${app.name}`}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
