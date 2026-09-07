import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, Terminal, ShieldCheck, Layers, Cpu } from 'lucide-react';

interface NiruviInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NiruviInfoModal: React.FC<NiruviInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [copiedSample, setCopiedSample] = useState(false);

  const sampleProtocol = "niruvi://install?id=vscodium&name=VSCodium&version=1.96.2&url=https%3A%2F%2Fgithub.com%2FVSCodium%2Fvscodium%2Freleases%2Fdownload%2F1.96.2.25015%2FVSCodium-1.96.2.25015.glibc2.28-x86_64.AppImage&sha256=9f8b4618e28f3b2591b65b6a782b1c2a129037cba8b99c75620be2f627a3c748&arch=x86_64";

  const handleCopySample = () => {
    navigator.clipboard.writeText(sampleProtocol);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-850/60">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Niruvi Integration & Protocol Guide</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              How Niruvi Store communicates with your Linux desktop
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-300 max-h-[75vh] overflow-y-auto">
          {/* Philosophy */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Separation of Concerns
            </h4>
            <p className="leading-relaxed">
              <strong>Niruvi Store</strong> handles application discovery, curated metadata, screenshots, and SHA-256 integrity catalogs.
            </p>
            <p className="leading-relaxed">
              <strong>Niruvi Client</strong> (desktop app) handles secure download staging, cryptographic verification, desktop menu shortcut generation, and AppImage lifecycle updates.
            </p>
          </div>

          {/* Protocol link format */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                The <code className="text-white font-mono lowercase">niruvi://</code> URI Scheme
              </h4>
              <button
                onClick={handleCopySample}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
              >
                {copiedSample ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSample ? 'Copied' : 'Copy Sample'}</span>
              </button>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Clicking <strong>Install</strong> triggers the standard Linux XDG URL dispatcher:
            </p>
            <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 break-all select-all">
{sampleProtocol}
            </pre>
          </div>

          {/* Linux Desktop Handler Setup */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Desktop Integration Setup
            </h4>
            <p className="leading-relaxed">
              When Niruvi is installed on your Linux distribution, it registers a desktop MIME handler in <code>~/.local/share/applications/niruvi.desktop</code>:
            </p>
            <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
{`[Desktop Entry]
Name=Niruvi AppImage Manager
Exec=niruvi %u
Type=Application
Terminal=false
MimeType=x-scheme-handler/niruvi;`}
            </pre>
          </div>

          {/* Links */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">View source and contribute on GitHub</span>
            <a
              href="https://github.com/putinservai-cyber/niruvi"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
            >
              <span>putinservai-cyber/niruvi</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
