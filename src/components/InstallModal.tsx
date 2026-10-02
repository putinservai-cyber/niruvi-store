import React, { useState } from 'react';
import { AppMetadata } from '../types';
import { generateNiruviProtocolUrl } from '../data/apps';
import { isGenuineSha256, formatAppVersion, hasKnownVersion } from '../utils/catalogSchema';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import {
  X,
  Terminal,
  Download,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { AppIcon } from './AppIcon';

interface InstallModalProps {
  app: AppMetadata | null;
  selectedArch?: string;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  app,
  selectedArch = 'x86_64',
  onClose,
}) => {
  usePreventBodyScroll(Boolean(app));
  const [copiedUri, setCopiedUri] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  if (!app) return null;

  const isTrulyVerified = Boolean(app.publisher.verified && isGenuineSha256(app.sha256));
  const protocolUrl = generateNiruviProtocolUrl(app, selectedArch);
  const activeDownloadUrl = app.downloadMap?.[selectedArch] || app.downloadUrl;
  const fileVersionSegment = hasKnownVersion(app.version)
    ? `-${app.version.replace(/^v/i, '')}`
    : '';
  const fileName = `${app.id}${fileVersionSegment}-${selectedArch}.AppImage`;
  const displayVersion = formatAppVersion(app.version);
  const cliCommand = isTrulyVerified
    ? `curl -fL "${activeDownloadUrl}" -o "${fileName}" && echo "${app.sha256}  ${fileName}" | sha256sum --check && chmod +x "${fileName}"`
    : `curl -fL "${activeDownloadUrl}" -o "${fileName}" && chmod +x "${fileName}"`;

  const copyProtocol = () => {
    navigator.clipboard.writeText(protocolUrl);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const copyCli = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3.5">
              <AppIcon
                slug={app.iconSlug || app.id}
                name={app.name}
                iconUrl={app.icon}
                brandColor={app.brandColor}
                className="w-12 h-12 rounded-xl"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="install-modal-title" className="text-lg font-bold text-white">
                    Download {app.name}
                  </h3>
                  {isTrulyVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-medium text-emerald-400">
                      <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                      <span>Verified SHA-256</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  {displayVersion} • {selectedArch}
                  {app.size ? ` • ${app.size}` : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close download modal"
              className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Primary Direct Upstream Release Link */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  Direct Author Release Download
                </span>
                <span className="text-[11px] font-mono text-neutral-400">
                  {isTrulyVerified ? 'Verified SHA-256' : 'Checksum not available'}
                </span>
              </div>
              <a
                href={activeDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Download from Upstream Release ({selectedArch})</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
              {isTrulyVerified && (
                <div className="text-[11px] font-mono text-emerald-400 break-all">
                  SHA-256: {app.sha256}
                </div>
              )}
            </div>

            {/* Terminal curl + chmod +x command */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  <span>Terminal Download &amp; Make Executable</span>
                </span>
                <button
                  type="button"
                  onClick={copyCli}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedCli ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCli ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto">
                <code>{cliCommand}</code>
              </pre>
            </div>

            {/* Optional niruvi:// Desktop URI */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-medium text-neutral-300 block">
                  Niruvi Desktop Protocol URI
                </span>
                <span className="text-[11px] font-mono text-neutral-500 truncate block">
                  {protocolUrl}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={protocolUrl}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-colors"
                >
                  Open URI
                </a>
                <button
                  type="button"
                  onClick={copyProtocol}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                  title="Copy niruvi:// URI"
                >
                  {copiedUri ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
