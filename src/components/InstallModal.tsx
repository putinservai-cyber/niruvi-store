import React, { useState } from 'react';
import { AppMetadata, InstalledAppRecord } from '../types';
import { AppIcon } from './AppIcon';
import { generateNiruviProtocolUrl } from '../data/apps';
import { saveInstalledApp } from '../utils/storage';
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
  ArrowRight
} from 'lucide-react';

interface InstallModalProps {
  app: AppMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  isInstalled?: boolean;
  onInstalledChange?: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  app,
  isOpen,
  onClose,
  isInstalled = false,
  onInstalledChange,
}) => {
  if (!isOpen || !app) return null;

  const [installMethod, setInstallMethod] = useState<'protocol' | 'direct' | 'cli'>('protocol');
  const [targetDir, setTargetDir] = useState<'~/.local/bin' | '~/Applications' | '~/Applications/AppImages' | '/opt/appimages'>('~/.local/bin');
  const [cliTool, setCliTool] = useState<'curl' | 'wget'>('curl');
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [protocolTriggered, setProtocolTriggered] = useState(false);
  const [installedStatus, setInstalledStatus] = useState(isInstalled);

  const protocolUrl = generateNiruviProtocolUrl(app);
  const cleanFileName = `${app.id}-${app.version}-x86_64.AppImage`;

  // CLI command generator based on user directory and tool preference
  const generateCliScript = () => {
    const dir = targetDir.startsWith('~') ? `"$HOME${targetDir.substring(1)}"` : `"${targetDir}"`;
    const targetFile = `${dir}/${cleanFileName}`;

    if (cliTool === 'curl') {
      return `mkdir -p ${dir} && \\
curl -L -f --progress-bar "${app.downloadUrl}" -o ${targetFile} && \\
chmod +x ${targetFile} && \\
echo "${app.sha256}  ${targetFile}" | sha256sum --check && \\
echo "✓ ${app.name} installed successfully! Run with: ${targetFile}"`;
    } else {
      return `mkdir -p ${dir} && \\
wget --show-progress -qO ${targetFile} "${app.downloadUrl}" && \\
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

  const trackDownloadInDb = () => {
    try {
      const token = localStorage.getItem('niruvi_auth_token');
      fetch(`/api/apps/${app.id}/download`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch((e) => console.debug('Telemetry ping:', e));
    } catch (_) {}
  };

  const handleLaunchProtocol = () => {
    trackDownloadInDb();
    // Record installation in local library
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

    // Trigger protocol
    setProtocolTriggered(true);
    window.location.href = protocolUrl;
  };

  const handleDirectDownload = () => {
    trackDownloadInDb();
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

    // Trigger direct download link
    const a = document.createElement('a');
    a.href = app.downloadUrl;
    a.download = cleanFileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="install-modal-container"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0"
              style={{ backgroundColor: `${app.brandColor || '#3B82F6'}20`, border: `1px solid ${app.brandColor || '#3B82F6'}40` }}
            >
              <AppIcon slug={app.iconSlug} className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Install {app.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  v{app.version}
                </span>
                {installedStatus && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    In Library
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Size: {app.size} • Format: Standalone Linux .AppImage • {app.license}
              </p>
            </div>
          </div>

          <button
            id="close-install-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Method Selector Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-900/50 text-xs font-medium text-slate-400">
          <button
            id="tab-method-protocol"
            onClick={() => setInstallMethod('protocol')}
            className={`py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              installMethod === 'protocol'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Niruvi Client</span>
          </button>

          <button
            id="tab-method-direct"
            onClick={() => setInstallMethod('direct')}
            className={`py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              installMethod === 'direct'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Direct Download</span>
          </button>

          <button
            id="tab-method-cli"
            onClick={() => setInstallMethod('cli')}
            className={`py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              installMethod === 'cli'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Terminal Script</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs text-slate-300">
          {/* Method 1: Niruvi Client One-Click */}
          {installMethod === 'protocol' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-800/40 space-y-2">
                <div className="flex items-center gap-2 text-blue-300 font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>One-Click Desktop Integration</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Sends an installation request directly to your installed Niruvi desktop manager using the registered <code className="text-blue-300 font-mono">niruvi://</code> URI handler. Niruvi verifies the cryptographic SHA-256 hash before placing the AppImage into your desktop menu.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  id="trigger-protocol-install-btn"
                  onClick={handleLaunchProtocol}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Download className="w-4 h-4" />
                  <span>Launch Niruvi Installer</span>
                </button>

                <button
                  id="copy-protocol-btn"
                  onClick={copyProtocol}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                  title="Copy full niruvi://install URL"
                >
                  {copiedProtocol ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied Link</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {protocolTriggered && (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Protocol Handshake Dispatched</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    If your browser prompted to open Niruvi, click Allow. We have also registered <strong>{app.name}</strong> in your local store library!
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400 break-all select-all">
                {protocolUrl}
              </div>
            </div>
          )}

          {/* Method 2: Direct File Download */}
          {installMethod === 'direct' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>Direct Binary Download</span>
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Download the standalone <code className="text-emerald-300 font-mono">{cleanFileName}</code> directly from the official upstream release. After downloading, grant executable permissions to run it:
                </p>
                <pre className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-xs text-slate-300">
{`chmod +x ${cleanFileName}
./${cleanFileName}`}
                </pre>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  id="trigger-direct-download-btn"
                  onClick={handleDirectDownload}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .AppImage ({app.size})</span>
                </button>

                <a
                  href={app.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Direct URL</span>
                </a>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium">Verified Publisher Checksum (SHA-256):</span>
                <div className="font-mono text-emerald-400 text-[11px] break-all select-all">
                  {app.sha256}
                </div>
              </div>
            </div>
          )}

          {/* Method 3: Terminal Script */}
          {installMethod === 'cli' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Target Directory:</span>
                  <select
                    id="install-target-dir-select"
                    value={targetDir}
                    onChange={(e) => setTargetDir(e.target.value as any)}
                    className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="~/.local/bin">~/.local/bin (Standard PATH)</option>
                    <option value="~/Applications">~/Applications (Standard AppImages)</option>
                    <option value="~/Applications/AppImages">~/Applications/AppImages</option>
                    <option value="/opt/appimages">/opt/appimages (System Wide)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Downloader:</span>
                  <div className="flex rounded border border-slate-700 overflow-hidden">
                    <button
                      onClick={() => setCliTool('curl')}
                      className={`px-2.5 py-1 text-xs transition-colors ${
                        cliTool === 'curl' ? 'bg-blue-600 text-white font-medium' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      curl
                    </button>
                    <button
                      onClick={() => setCliTool('wget')}
                      className={`px-2.5 py-1 text-xs transition-colors ${
                        cliTool === 'wget' ? 'bg-blue-600 text-white font-medium' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      wget
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Terminal Command:</span>
                  <button
                    id="copy-terminal-script-btn"
                    onClick={copyCli}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {copiedCli ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Command Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-blue-300 select-all overflow-x-auto whitespace-pre-wrap leading-relaxed">
{generateCliScript()}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400">Done executing this command?</span>
                <button
                  id="mark-installed-cli-btn"
                  onClick={handleMarkAsInstalled}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                >
                  <FolderCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{installedStatus ? 'Already in Library' : 'Mark as Installed in Library'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
