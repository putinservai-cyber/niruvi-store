import React, { useState } from 'react';
import { AppMetadata } from '../types';
import { AppIcon } from './AppIcon';
import { generateNiruviProtocolUrl } from '../data/apps';
import {
  X,
  CheckCircle2,
  Download,
  ExternalLink,
  GitBranch,
  Globe,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
  Calendar,
  HardDrive,
  FileCode2,
  Terminal,
  AlertCircle
} from 'lucide-react';

interface AppDetailModalProps {
  app: AppMetadata | null;
  onClose: () => void;
}

export const AppDetailModal: React.FC<AppDetailModalProps> = ({ app, onClose }) => {
  if (!app) return null;

  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'cli' | 'changelog'>('overview');

  const protocolUrl = generateNiruviProtocolUrl(app);
  const cliCommand = `niruvi install ${app.id}`;
  const appImageFileName = `${app.name.toLowerCase().replace(/\s+/g, '-')}-${app.version}-x86_64.AppImage`;

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchProtocol = () => {
    window.location.href = protocolUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="app-detail-modal-container"
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800 bg-slate-850/60">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${app.iconBg || 'from-blue-600 to-indigo-600'} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
              <AppIcon name={app.iconName} className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{app.name}</h2>
                {app.publisher.verified && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified Publisher
                  </span>
                )}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  v{app.version}
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">{app.tagline}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 flex-wrap">
                <span>By <strong className="text-slate-200">{app.publisher.name}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Released {app.releaseDate}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5" />
                  {app.size}
                </span>
              </div>
            </div>
          </div>

          <button
            id="close-detail-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Call-to-Action Bar */}
        <div className="bg-slate-800/40 p-4 px-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="modal-install-protocol-btn"
              onClick={handleLaunchProtocol}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Install with Niruvi</span>
            </button>

            <button
              id="modal-copy-protocol-btn"
              onClick={() => copyToClipboard(protocolUrl, setCopiedProtocol)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
              title="Copy niruvi://install protocol URL"
            >
              {copiedProtocol ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Protocol URL Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Niruvi Link</span>
                </>
              )}
            </button>

            <a
              id="modal-direct-appimage-download-link"
              href={app.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Direct .AppImage Download</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            {app.homepageUrl && (
              <a
                href={app.homepageUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors"
                title="Official Website"
              >
                <Globe className="w-4 h-4" />
              </a>
            )}
            {app.sourceUrl && (
              <a
                href={app.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors"
                title="Source Repository"
              >
                <GitBranch className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-6 px-6 pt-3 border-b border-slate-800 text-xs font-medium text-slate-400">
          <button
            id="tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Overview & Details
          </button>
          <button
            id="tab-security"
            onClick={() => setActiveTab('security')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Security & SHA-256
          </button>
          <button
            id="tab-cli"
            onClick={() => setActiveTab('cli')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'cli'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            CLI & Terminal
          </button>
          {app.changelog && (
            <button
              id="tab-changelog"
              onClick={() => setActiveTab('changelog')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'changelog'
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              Changelog
            </button>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 flex-1">
          {activeTab === 'overview' && (
            <>
              {/* Screenshots preview */}
              {app.screenshots && app.screenshots.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Preview</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {app.screenshots.map((shot, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 aspect-video">
                        <img
                          src={shot}
                          alt={`${app.name} preview ${idx + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">About {app.name}</h4>
                <p className="text-sm leading-relaxed text-slate-200">
                  {app.description}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">Architectures</span>
                  <div className="flex gap-1">
                    {app.architectures.map(arch => (
                      <span key={arch} className="px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-mono border border-slate-700">
                        {arch}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">License</span>
                  <span className="text-slate-200 font-medium">{app.license}</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Category</span>
                  <span className="text-slate-200 font-medium">{app.category}</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Package Format</span>
                  <span className="text-emerald-400 font-medium">Standalone AppImage</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Downloads</span>
                  <span className="text-slate-200 font-medium">{app.downloadsCount.toLocaleString()}</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">System Compatibility</span>
                  <span className="text-slate-200">{app.requirements || 'glibc 2.28+, FUSE 2/3'}</span>
                </div>
              </div>

              {/* Tags */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {app.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-700/60">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/50 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-semibold text-blue-200 text-sm">Niruvi Security Verification</h4>
                  <p className="text-slate-300">
                    Niruvi verifies cryptographic SHA-256 checksums automatically before staging and executing AppImages on your Linux host.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Cryptographic SHA-256 Checksum
                  </label>
                  <button
                    id="copy-sha-btn"
                    onClick={() => copyToClipboard(app.sha256, setCopiedSha)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    {copiedSha ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSha ? 'Copied' : 'Copy Hash'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 break-all select-all">
                  {app.sha256}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2 text-xs">
                <h5 className="font-semibold text-white">Manual Verification in Terminal:</h5>
                <pre className="p-2.5 bg-slate-950 rounded border border-slate-800/80 font-mono text-slate-300 overflow-x-auto">
{`echo "${app.sha256}  ${appImageFileName}" | sha256sum --check`}
                </pre>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  AppImages execute with user privileges. Always ensure your host system has <code>fuse</code> or <code>libfuse2/libfuse3</code> installed.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'cli' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                You can install and run this application directly using the Niruvi CLI or standard Linux terminal commands.
              </p>

              {/* Niruvi CLI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Via Niruvi CLI:</span>
                  <button
                    onClick={() => copyToClipboard(cliCommand, setCopiedCli)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCli ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-blue-300 select-all overflow-x-auto">
{cliCommand}
                </pre>
              </div>

              {/* Standalone manual command */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">Standard Linux Standalone Run:</span>
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 select-all overflow-x-auto">
{`# 1. Download AppImage
curl -L -O "${app.downloadUrl}"

# 2. Grant executable permission
chmod +x "${appImageFileName}"

# 3. Launch application
./"${appImageFileName}"`}
                </pre>
              </div>

              {/* Desktop Protocol Handler inspection */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">Generated Niruvi Protocol Payload:</span>
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400 break-all select-all">
{protocolUrl}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'changelog' && app.changelog && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                What's new in v{app.version}
              </h4>
              <ul className="space-y-2 text-xs">
                {app.changelog.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
