import React, { useState } from 'react';
import { AppMetadata } from '../types';
import { AppIcon } from './AppIcon';
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';
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
  Copy,
  AlertTriangle,
  ExternalLink,
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
  if (!app.publisher.verified) {
    return {
      label: 'Checksum Unverified',
      title: 'SHA-256 hash has not been verified by the release pipeline',
      color: 'text-amber-300',
      isOfficial: false,
      isUnverified: true,
    };
  }

  const tier =
    app.trustTier || (app.sourceType === 'Official' ? 'Official Developer' : 'Verified Community');
  if (tier === 'Official Developer') {
    return {
      label: 'Official · SHA-256 Verified',
      title: 'Official Developer Build with Verified SHA-256',
      color: 'text-sky-300',
      isOfficial: true,
      isUnverified: false,
    };
  }
  if (tier === 'Verified Community') {
    return {
      label: 'Community · SHA-256 Verified',
      title: 'Verified Community Packaged Build',
      color: 'text-emerald-300',
      isOfficial: false,
      isUnverified: false,
    };
  }
  return {
    label: 'Checksum Unverified',
    title: 'Unverified Community Build',
    color: 'text-amber-300',
    isOfficial: false,
    isUnverified: true,
  };
};

export const AppCard: React.FC<AppCardProps> = ({
  app,
  isInstalled,
  isBookmarked,
  onSelect,
  onInstall,
  onToggleBookmark,
}) => {
  const [copiedSha, setCopiedSha] = useState(false);
  const sourceBadge = getSourceBadge(app);
  const cleanName = sanitizeText(app.name, 100);
  const cleanPublisher = sanitizeText(app.publisher.name, 80);
  const cleanTagline = sanitizeText(app.tagline, 300);
  const safeSourceUrl = sanitizeUrl(app.sourceUrl || app.homepageUrl);

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
              {app.publisher.verified ? (
                <span
                  title="Verified SHA-256 Checksum"
                  aria-label="Verified SHA-256 Checksum"
                  className="text-emerald-400 inline-flex items-center"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              ) : (
                <span
                  title="Unverified Checksum"
                  aria-label="Unverified Checksum"
                  className="text-amber-400 inline-flex items-center"
                >
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
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
        className="text-left text-xs text-neutral-200 line-clamp-2 mb-3 leading-relaxed flex-1 cursor-pointer hover:text-white"
      >
        {cleanTagline}
      </button>

      {/* Clean unboxed metadata row: Status · Category · Size · Arch */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3 text-[11px] text-neutral-300">
        {sourceBadge && (
          <span
            title={sourceBadge.title}
            className={`font-semibold inline-flex items-center gap-1 ${sourceBadge.color}`}
          >
            {sourceBadge.isUnverified ? (
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            ) : sourceBadge.isOfficial ? (
              <ShieldCheck className="w-3 h-3" aria-hidden="true" />
            ) : (
              <Users className="w-3 h-3" aria-hidden="true" />
            )}
            <span>{sourceBadge.label}</span>
          </span>
        )}
        <span aria-hidden="true">·</span>
        <span>{app.category}</span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
          <HardDrive className="w-3 h-3 text-neutral-400" aria-hidden="true" />
          <span>{app.size}</span>
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1 font-mono">
          <Cpu className="w-3 h-3 text-sky-400" aria-hidden="true" />
          <span>{app.architectures.join(', ')}</span>
        </span>
        {isInstalled && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-300 inline-flex items-center gap-1 font-semibold">
              <Check className="w-3 h-3" aria-hidden="true" />
              <span>Installed</span>
            </span>
          </>
        )}
      </div>

      {/* Copyable SHA-256 Digest + Upstream Source Link */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 mb-3 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px]">
        <div className="font-mono text-neutral-300 truncate" title={`SHA-256: ${app.sha256}`}>
          <span className="text-neutral-400">SHA-256: </span>
          <span className={app.publisher.verified ? 'text-emerald-400' : 'text-amber-300'}>
            {app.sha256.slice(0, 14)}…
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(app.sha256);
              setCopiedSha(true);
              setTimeout(() => setCopiedSha(false), 1800);
            }}
            aria-label={`Copy SHA-256 checksum for ${cleanName}`}
            className="text-neutral-300 hover:text-white inline-flex items-center gap-1 font-medium cursor-pointer"
            title="Copy full 64-character SHA-256 checksum"
          >
            {copiedSha ? (
              <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="w-3 h-3" aria-hidden="true" />
            )}
            <span>{copiedSha ? 'Copied' : 'Hash'}</span>
          </button>
          {safeSourceUrl && (
            <a
              href={safeSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Source repository for ${cleanName}`}
              className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-0.5"
              title={`Source: ${safeSourceUrl}`}
            >
              <span>Source</span>
              <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-800 mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-mono">
          <span>v{app.version}</span>
          <span aria-hidden="true">·</span>
          <span
            className="inline-flex items-center gap-1 truncate max-w-[110px]"
            title={`License: ${app.license}`}
          >
            <Scale className="w-3 h-3 text-neutral-400 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{app.license}</span>
          </span>
        </div>

        <button
          id={`install-btn-${app.id}`}
          type="button"
          onClick={() => onInstall(app)}
          aria-label={
            isInstalled ? `Manage ${cleanName} installation` : `Install ${cleanName} with Niruvi`
          }
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
