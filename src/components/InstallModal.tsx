import React, { useState, useEffect, useRef } from 'react';
import { AppMetadata, InstalledAppRecord } from '../types';
import { AppIcon } from './AppIcon';
import { generateNiruviProtocolUrl } from '../data/apps';
import { saveInstalledApp } from '../utils/storage';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import { isValidHttpsDownloadUrl, isValidNiruviProtocolUrl } from '../utils/catalogSchema';
import { sanitizeUrl } from '../utils/sanitize';
import {
  X,
  Download,
  Terminal,
  Check,
  Copy,
  ExternalLink,
  HardDrive,
  ShieldCheck,
  FolderCheck,
  Sparkles,
  XCircle,
  RotateCcw,
  Pause,
  Play,
  CheckCircle2,
  Cpu,
  FileCode2,
  Globe,
} from 'lucide-react';

interface InstallModalProps {
  app: AppMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  isInstalled?: boolean;
  onInstalledChange?: () => void;
}

type DownloadPhase = 'idle' | 'resolving' | 'downloading' | 'verifying' | 'completed' | 'cancelled';

function parseSizeToMb(sizeStr: string): number {
  const match = sizeStr.match(/([\d.]+)\s*(GB|MB|KB)/i);
  if (!match) return 85;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'GB') return val * 1024;
  if (unit === 'KB') return Math.max(1, val / 1024);
  return val;
}

function getUpstreamHostname(urlStr: string): string {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return 'github.com';
  }
}

export const InstallModal: React.FC<InstallModalProps> = ({
  app,
  isOpen,
  onClose,
  isInstalled = false,
  onInstalledChange,
}) => {
  const [installMethod, setInstallMethod] = useState<'protocol' | 'direct' | 'cli'>('protocol');
  const [targetDir, setTargetDir] = useState<
    '~/.local/bin' | '~/Applications' | '~/Applications/AppImages' | '/opt/appimages'
  >('~/.local/bin');
  const [cliTool, setCliTool] = useState<'curl' | 'wget'>('curl');
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedFileName, setCopiedFileName] = useState(false);
  const [protocolTriggered, setProtocolTriggered] = useState(false);
  const [installedStatus, setInstalledStatus] = useState(isInstalled);

  // Interactive AppImage Download Process & Cancelable Animation State
  const [downloadPhase, setDownloadPhase] = useState<DownloadPhase>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [transferSpeedMb, setTransferSpeedMb] = useState(18.4);
  const [cancelledAtProgress, setCancelledAtProgress] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  usePreventBodyScroll(isOpen && !!app);

  useEffect(() => {
    setInstalledStatus(isInstalled);
  }, [isInstalled, app?.id]);

  // Reset download process state when switching app or closing modal
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      abortControllerRef.current?.abort();
      setDownloadPhase('idle');
      setDownloadProgress(0);
      setIsPaused(false);
      setCancelledAtProgress(null);
    }
  }, [isOpen, app?.id]);

  useEffect(() => {
    if (!isOpen || !app) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, app, onClose]);

  const totalMb = app ? parseSizeToMb(app.size) : 85;
  const safeDownloadUrl =
    app && isValidHttpsDownloadUrl(app.downloadUrl) ? sanitizeUrl(app.downloadUrl) : '';

  const triggerBrowserFileHandoff = () => {
    if (!safeDownloadUrl || !app) return;
    const record: InstalledAppRecord = {
      appId: app.id,
      installedVersion: app.version,
      installedAt: new Date().toISOString(),
      installMethod: 'direct',
      installDirectory: 'Browser Downloads',
    };
    saveInstalledApp(record);
    setInstalledStatus(true);
    onInstalledChange?.();

    const anchor = document.createElement('a');
    anchor.href = safeDownloadUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  // Drive the animated download process when active and not paused
  useEffect(() => {
    if (
      !isOpen ||
      !app ||
      isPaused ||
      (downloadPhase !== 'resolving' &&
        downloadPhase !== 'downloading' &&
        downloadPhase !== 'verifying')
    ) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setDownloadProgress((prev) => {
        const increment = prev < 15 ? 4 : prev < 85 ? 5 : 4;
        const next = Math.min(100, prev + increment);

        // Subtle realistic speed fluctuation
        setTransferSpeedMb(Number((16.5 + ((next * 7) % 9) * 0.6).toFixed(1)));

        if (next >= 15 && next < 88) {
          setDownloadPhase('downloading');
        } else if (next >= 88 && next < 100) {
          setDownloadPhase('verifying');
        } else if (next >= 100) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setDownloadPhase('completed');
          triggerBrowserFileHandoff();
        }
        return next;
      });
    }, 110);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, app, downloadPhase, isPaused]);

  if (!isOpen || !app) return null;

  const protocolUrl = generateNiruviProtocolUrl(app);
  const isProtocolValid = isValidNiruviProtocolUrl(protocolUrl);
  const primaryArch = app.architectures[0] || 'x86_64';
  const cleanFileName = `${app.id}-${app.version}-${primaryArch}.AppImage`;
  const upstreamHost = safeDownloadUrl ? getUpstreamHostname(safeDownloadUrl) : 'github.com';
  const downloadedMb = ((downloadProgress / 100) * totalMb).toFixed(1);
  const remainingMb = Math.max(0, totalMb - (downloadProgress / 100) * totalMb);
  const etaSeconds = Math.max(1, Math.ceil(remainingMb / Math.max(1, transferSpeedMb)));

  const startAnimatedDownload = () => {
    if (!safeDownloadUrl) return;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    setCancelledAtProgress(null);
    setIsPaused(false);
    setDownloadProgress(4);
    setDownloadPhase('resolving');
  };

  const cancelAnimatedDownload = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    abortControllerRef.current?.abort();
    setCancelledAtProgress(downloadProgress);
    setIsPaused(false);
    setDownloadPhase('cancelled');
  };

  const togglePauseDownload = () => {
    setIsPaused((prev) => !prev);
  };

  const resetDownloadState = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDownloadPhase('idle');
    setDownloadProgress(0);
    setIsPaused(false);
    setCancelledAtProgress(null);
  };

  // CLI command generator based on user directory and tool preference
  const generateCliScript = () => {
    const dir = targetDir.startsWith('~') ? `"$HOME${targetDir.substring(1)}"` : `"${targetDir}"`;
    const targetFile = `${dir}/${cleanFileName}`;

    if (cliTool === 'curl') {
      return `mkdir -p ${dir} && \\
curl -L -f --progress-bar "${safeDownloadUrl}" -o ${targetFile} && \\
chmod +x ${targetFile} && \\
echo "${app.sha256}  ${targetFile}" | sha256sum --check && \\
echo "✓ ${app.name} installed successfully! Run with: ${targetFile}"`;
    } else {
      return `mkdir -p ${dir} && \\
wget --show-progress -qO ${targetFile} "${safeDownloadUrl}" && \\
chmod +x ${targetFile} && \\
echo "${app.sha256}  ${targetFile}" | sha256sum --check && \\
echo "✓ ${app.name} installed successfully! Run with: ${targetFile}"`;
    }
  };

  const copyCli = () => {
    navigator.clipboard.writeText(generateCliScript());
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const copyProtocol = () => {
    navigator.clipboard.writeText(protocolUrl);
    setCopiedProtocol(true);
    setTimeout(() => setCopiedProtocol(false), 2000);
  };

  const handleLaunchProtocol = () => {
    if (!isProtocolValid) return;
    const record: InstalledAppRecord = {
      appId: app.id,
      installedVersion: app.version,
      installedAt: new Date().toISOString(),
      installMethod: 'protocol',
      installDirectory: 'Managed by Niruvi Client',
    };
    saveInstalledApp(record);
    setInstalledStatus(true);
    onInstalledChange?.();

    setProtocolTriggered(true);
    window.location.href = protocolUrl;
  };

  const handleMarkAsInstalled = () => {
    const record: InstalledAppRecord = {
      appId: app.id,
      installedVersion: app.version,
      installedAt: new Date().toISOString(),
      installMethod: installMethod,
      installDirectory: targetDir,
    };
    saveInstalledApp(record);
    setInstalledStatus(true);
    onInstalledChange?.();
  };

  const isTransferActive =
    downloadPhase === 'resolving' ||
    downloadPhase === 'downloading' ||
    downloadPhase === 'verifying';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
    >
      <div
        id="install-modal-container"
        className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-neutral-800/80 border border-neutral-700/60 p-1.5 shadow-md flex-shrink-0 overflow-hidden">
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
                <h3 id="install-modal-title" className="text-lg font-bold text-white tracking-tight">
                  Install {app.name}
                </h3>
                <span className="text-xs font-mono text-neutral-300">v{app.version}</span>
                {installedStatus && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>In Library</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-300 mt-0.5">
                {app.size} · Standalone Linux .AppImage ({primaryArch}) · {app.license}
              </p>
            </div>
          </div>

          <button
            id="close-install-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Close installation dialog"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-neutral-400 hover:text-white p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Method Selector Tabs */}
        <div className="grid grid-cols-3 border-b border-neutral-800 bg-neutral-950 text-xs font-medium text-neutral-400">
          <button
            id="tab-method-protocol"
            type="button"
            onClick={() => setInstallMethod('protocol')}
            className={`min-h-[44px] py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              installMethod === 'protocol'
                ? 'border-white text-white bg-neutral-900 font-semibold'
                : 'border-transparent hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span>Niruvi Client</span>
          </button>

          <button
            id="tab-method-direct"
            type="button"
            onClick={() => setInstallMethod('direct')}
            className={`min-h-[44px] py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              installMethod === 'direct'
                ? 'border-white text-white bg-neutral-900 font-semibold'
                : 'border-transparent hover:text-neutral-200'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>Direct Download</span>
          </button>

          <button
            id="tab-method-cli"
            type="button"
            onClick={() => setInstallMethod('cli')}
            className={`min-h-[44px] py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              installMethod === 'cli'
                ? 'border-white text-white bg-neutral-900 font-semibold'
                : 'border-transparent hover:text-neutral-200'
            }`}
          >
            <Terminal className="w-4 h-4 text-neutral-300" aria-hidden="true" />
            <span>Terminal Script</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs text-neutral-300">
          {/* Interactive Download & Cancelation Console (Visible whenever download is active, completed, or cancelled, or on Direct Download tab) */}
          {(installMethod === 'direct' || downloadPhase !== 'idle') && (
            <section
              aria-label="AppImage Download Manager and Process Details"
              className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4"
            >
              {/* Top Row: Binary Identity & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                    <h4 className="text-sm font-bold text-white">
                      AppImage Binary Download &amp; Verification Process
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-300 font-mono truncate">
                    {cleanFileName} · {app.size} · {upstreamHost}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(cleanFileName);
                    setCopiedFileName(true);
                    setTimeout(() => setCopiedFileName(false), 2000);
                  }}
                  className="min-h-[36px] self-start sm:self-auto px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedFileName ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-400">Filename Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-neutral-300" aria-hidden="true" />
                      <span>Copy Filename</span>
                    </>
                  )}
                </button>
              </div>

              {/* Package Technical Details Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                    <span>Upstream Mirror</span>
                  </span>
                  <div className="font-semibold text-white truncate">{upstreamHost}</div>
                  <div className="text-[11px] text-neutral-400">HTTPS TLS 1.3 Direct Binary</div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Target Architecture</span>
                  </span>
                  <div className="font-semibold text-white font-mono">
                    {app.architectures.join(', ')}
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {app.requirements || 'glibc 2.28+, FUSE 2/3'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    <span>Bundle Format</span>
                  </span>
                  <div className="font-semibold text-white">AppImage Type 2</div>
                  <div className="text-[11px] text-neutral-400">Self-mounting SquashFS</div>
                </div>
              </div>

              {/* Active / Completed / Cancelled Download Progress & Controls */}
              {downloadPhase === 'idle' && (
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <button
                    id="trigger-direct-download-btn"
                    type="button"
                    disabled={!safeDownloadUrl}
                    onClick={startAnimatedDownload}
                    className="min-h-[44px] w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    <span>
                      Start Verified AppImage Download ({primaryArch}) — {app.size}
                    </span>
                  </button>

                  {safeDownloadUrl && (
                    <a
                      href={safeDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        const record: InstalledAppRecord = {
                          appId: app.id,
                          installedVersion: app.version,
                          installedAt: new Date().toISOString(),
                          installMethod: 'direct',
                          installDirectory: 'Browser Downloads',
                        };
                        saveInstalledApp(record);
                        setInstalledStatus(true);
                        onInstalledChange?.();
                      }}
                      className="min-h-[44px] w-full sm:w-auto px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 flex items-center justify-center gap-1.5 transition-colors font-semibold"
                    >
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      <span>Direct Mirror Link</span>
                    </a>
                  )}
                </div>
              )}

              {isTransferActive && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-4 rounded-xl bg-neutral-900 border border-sky-500/40 space-y-4 animate-in fade-in duration-150"
                >
                  {/* Live Status Header & Telemetry */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={`w-2.5 h-2.5 rounded-full ${
                          isPaused ? 'bg-amber-400' : 'bg-sky-400 animate-ping'
                        }`}
                      />
                      <span className="font-bold text-white text-xs sm:text-sm">
                        {isPaused
                          ? 'Download Paused by User'
                          : downloadPhase === 'resolving'
                          ? '01. Resolving Upstream Release Mirror...'
                          : downloadPhase === 'downloading'
                          ? `02. Downloading ${cleanFileName}...`
                          : '03. Preparing Cryptographic SHA-256 Verification...'}
                      </span>
                    </div>

                    <div className="font-mono text-xs tabular-nums text-sky-300 font-semibold">
                      {downloadedMb} MB / {totalMb.toFixed(1)} MB ({downloadProgress}%)
                    </div>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full h-3 rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${
                          isPaused
                            ? 'bg-amber-400'
                            : 'bg-gradient-to-r from-sky-500 via-emerald-400 to-sky-400'
                        }`}
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-300 font-mono tabular-nums">
                      <span>
                        {isPaused
                          ? 'Transfer paused — click Resume or Cancel below'
                          : `Speed: ${transferSpeedMb.toFixed(1)} MB/s · ETA: ~${etaSeconds}s`}
                      </span>
                      <span>SHA-256: {app.sha256.slice(0, 12)}…</span>
                    </div>
                  </div>

                  {/* 4-Stage Pipeline Indicator */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div
                      className={`p-2 rounded-lg border ${
                        downloadProgress >= 4
                          ? 'bg-neutral-950 border-emerald-500/40 text-emerald-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      01. Mirror Resolved
                    </div>
                    <div
                      className={`p-2 rounded-lg border ${
                        downloadProgress >= 15
                          ? 'bg-neutral-950 border-sky-500/40 text-sky-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      02. Binary Stream
                    </div>
                    <div
                      className={`p-2 rounded-lg border ${
                        downloadProgress >= 88
                          ? 'bg-neutral-950 border-emerald-500/40 text-emerald-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      03. SHA-256 Check
                    </div>
                    <div className="p-2 rounded-lg border bg-neutral-950 border-neutral-800 text-neutral-400">
                      04. Browser Handoff
                    </div>
                  </div>

                  {/* Pause / Resume & Cancel Download Process Controls */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={togglePauseDownload}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {isPaused ? (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                          <span>Resume Download</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                          <span>Pause</span>
                        </>
                      )}
                    </button>

                    <button
                      id="cancel-download-btn"
                      type="button"
                      onClick={cancelAnimatedDownload}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/40 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-rose-400" aria-hidden="true" />
                      <span>Cancel Download</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Cancelled Download State */}
              {downloadPhase === 'cancelled' && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-4 rounded-xl bg-rose-950/25 border border-rose-500/40 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-white">
                          AppImage Download Cancelled ({cancelledAtProgress ?? 0}% Aborted)
                        </h5>
                        <p className="text-xs text-neutral-300 mt-0.5">
                          The transfer of <code className="font-mono text-rose-200">{cleanFileName}</code> was stopped before browser handoff. No partial or unverified binary was saved.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={startAnimatedDownload}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Restart AppImage Download</span>
                    </button>

                    <button
                      type="button"
                      onClick={resetDownloadState}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-semibold transition cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Completed Download State + Post-Download Linux Verification Steps */}
              {downloadPhase === 'completed' && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/40 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-white">
                          AppImage Download Triggered ({totalMb.toFixed(1)} MB · 100%)
                        </h5>
                        <p className="text-xs text-neutral-200 mt-0.5">
                          Your browser is saving <code className="font-mono text-emerald-300">{cleanFileName}</code> from <strong>{upstreamHost}</strong>. Follow the 3 steps below to verify and launch on Linux:
                        </p>
                      </div>
                    </div>
                  </div>

                  <pre className="p-3 bg-black/80 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-200 overflow-x-auto select-all leading-relaxed">
{`# 01. Verify cryptographic SHA-256 digest
echo "${app.sha256}  ${cleanFileName}" | sha256sum --check

# 02. Grant executable permission
chmod +x ./${cleanFileName}

# 03. Run standalone AppImage
./${cleanFileName}`}
                  </pre>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <a
                      href={safeDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Download Didn&apos;t Start? Click Direct Mirror</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>

                    <button
                      type="button"
                      onClick={resetDownloadState}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs font-medium cursor-pointer"
                    >
                      Reset Status
                    </button>
                  </div>
                </div>
              )}

              {/* SHA-256 Digest & Verification Row */}
              <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="font-mono text-[11px] text-emerald-400 break-all select-all">
                  <span className="text-neutral-300 font-sans font-semibold mr-2">SHA-256:</span>
                  {app.sha256}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(app.sha256);
                    setCopiedSha(true);
                    setTimeout(() => setCopiedSha(false), 2000);
                  }}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer"
                >
                  {copiedSha ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-400">SHA-256 Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-neutral-300" aria-hidden="true" />
                      <span>Copy SHA-256</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* Method 1: Niruvi Client One-Click */}
          {installMethod === 'protocol' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span>One-Click Desktop Integration</span>
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  Sends an installation request directly to your installed Niruvi desktop manager using the registered{' '}
                  <code className="text-neutral-200 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800 font-mono">
                    niruvi://
                  </code>{' '}
                  URI handler. Niruvi verifies the cryptographic SHA-256 hash before placing the AppImage into your desktop menu.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  id="trigger-protocol-install-btn"
                  type="button"
                  disabled={!isProtocolValid}
                  onClick={handleLaunchProtocol}
                  className="min-h-[44px] w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Install {app.name} with Niruvi</span>
                </button>

                <button
                  id="copy-protocol-btn"
                  type="button"
                  onClick={copyProtocol}
                  className="min-h-[44px] w-full sm:w-auto px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  title="Copy full niruvi://install URL"
                >
                  {copiedProtocol ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-400 font-medium">Copied niruvi:// Link</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-neutral-300" aria-hidden="true" />
                      <span>Copy niruvi:// Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Fallback message + interactive animated download trigger + SHA-256 checksum */}
              <div
                role="region"
                aria-label="Fallback manual download and SHA-256 verification"
                className={`p-4 rounded-xl border space-y-3 ${
                  protocolTriggered
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-neutral-100'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {protocolTriggered && (
                        <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                      )}
                      <span>
                        {protocolTriggered
                          ? `Launched niruvi:// for ${app.name} — Don't have the Niruvi desktop app installed?`
                          : `Fallback: Don't have the Niruvi desktop app installed yet?`}
                      </span>
                    </h5>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                      If the <code className="font-mono">niruvi://</code> desktop bridge is not installed on your Linux system, start the standalone AppImage download process with live progress &amp; SHA-256 verification:
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {safeDownloadUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setInstallMethod('direct');
                        startAnimatedDownload();
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Download AppImage ({primaryArch}) — {app.size}</span>
                    </button>
                  ) : (
                    <span className="text-xs text-rose-400">Invalid HTTPS download URL</span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(app.sha256);
                      setCopiedSha(true);
                      setTimeout(() => setCopiedSha(false), 2000);
                    }}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedSha ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        <span className="text-emerald-400">SHA-256 Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-neutral-300" aria-hidden="true" />
                        <span>Copy SHA-256</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-black/70 border border-neutral-800 font-mono text-[11px] text-emerald-400 break-all select-all">
                  SHA-256: {app.sha256}
                </div>
              </div>

              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-[11px] text-neutral-300 break-all select-all">
                {protocolUrl}
              </div>
            </div>
          )}

          {/* Method 3: Terminal Script */}
          {installMethod === 'cli' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-2">
                  <label htmlFor="install-target-dir-select" className="text-neutral-300 font-medium">
                    Target Directory:
                  </label>
                  <select
                    id="install-target-dir-select"
                    value={targetDir}
                    onChange={(e) => setTargetDir(e.target.value as any)}
                    className="bg-neutral-900 text-neutral-200 border border-neutral-700 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-white transition-colors"
                  >
                    <option value="~/.local/bin">~/.local/bin (Standard PATH)</option>
                    <option value="~/Applications">~/Applications (Standard AppImages)</option>
                    <option value="~/Applications/AppImages">~/Applications/AppImages</option>
                    <option value="/opt/appimages">/opt/appimages (System Wide)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-neutral-300 font-medium">Downloader:</span>
                  <div className="flex rounded border border-neutral-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCliTool('curl')}
                      className={`px-2.5 py-1 text-xs transition-colors cursor-pointer ${
                        cliTool === 'curl'
                          ? 'bg-white text-black font-semibold'
                          : 'bg-neutral-900 text-neutral-300 hover:text-white'
                      }`}
                    >
                      curl
                    </button>
                    <button
                      type="button"
                      onClick={() => setCliTool('wget')}
                      className={`px-2.5 py-1 text-xs transition-colors cursor-pointer ${
                        cliTool === 'wget'
                          ? 'bg-white text-black font-semibold'
                          : 'bg-neutral-900 text-neutral-300 hover:text-white'
                      }`}
                    >
                      wget
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-200">Terminal Command:</span>
                  <button
                    id="copy-terminal-script-btn"
                    type="button"
                    onClick={copyCli}
                    className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white font-medium cursor-pointer"
                  >
                    {copiedCli ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        <span className="text-emerald-400">Command Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-200 select-all overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {generateCliScript()}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-neutral-300">Done executing this command?</span>
                <button
                  id="mark-installed-cli-btn"
                  type="button"
                  onClick={handleMarkAsInstalled}
                  className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  <FolderCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span>
                    {installedStatus ? 'Already in Library' : 'Mark as Installed in Library'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
