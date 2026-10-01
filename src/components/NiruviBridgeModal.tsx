import React, { useState } from 'react';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import { 
  X, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Laptop, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck,
  Zap
} from 'lucide-react';
import { NiruviLogo } from './NiruviLogo';

interface NiruviBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NiruviBridgeModal: React.FC<NiruviBridgeModalProps> = ({ isOpen, onClose }) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [pingStatus, setPingStatus] = useState<'idle' | 'pinging' | 'sent'>('idle');

  usePreventBodyScroll(isOpen);

  if (!isOpen) return null;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleTestProtocol = () => {
    setPingStatus('pinging');
    window.location.href = 'niruvi://ping?source=niruvi_store_web&ts=' + Date.now();
    setTimeout(() => {
      setPingStatus('sent');
      setTimeout(() => setPingStatus('idle'), 4000);
    }, 1000);
  };

  const desktopEntryContent = `[Desktop Entry]
Name=Niruvi Desktop
Comment=Universal Linux AppImage Hub and Package Manager
Exec=niruvi %u
Icon=niruvi
Terminal=false
Type=Application
Categories=Utility;PackageManager;
MimeType=x-scheme-handler/niruvi;
StartupNotify=true`;

  const installScriptOneLiner = `curl -fsSL https://raw.githubusercontent.com/putinservai-cyber/niruvi/main/install.sh | bash`;

  const registerSchemeCmd = `mkdir -p ~/.local/share/applications && \\
cat << 'EOF' > ~/.local/share/applications/niruvi.desktop
${desktopEntryContent}
EOF
xdg-mime default niruvi.desktop x-scheme-handler/niruvi && \\
update-desktop-database ~/.local/share/applications`;

  const handleDownloadDesktopFile = () => {
    const blob = new Blob([desktopEntryContent], { type: 'application/x-desktop' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'niruvi.desktop';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <NiruviLogo size={32} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Niruvi Desktop Bridge</h3>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  niruvi:// URI Handler
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Seamless one-click installation and synchronization with your Linux desktop
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-300">
          {/* Quick Connect & Ping Status */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-white text-sm">Protocol Link Status</span>
              </div>
              <p className="text-neutral-400 text-xs">
                When you click "Install" on any app, the browser dispatches an instant payload to your local Niruvi Desktop app.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleTestProtocol}
                disabled={pingStatus === 'pinging'}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-white text-black font-semibold hover:bg-neutral-200 transition shadow-sm"
              >
                {pingStatus === 'pinging' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : pingStatus === 'sent' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-neutral-700" />
                    <span>Ping Dispatched!</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Test niruvi:// Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Option 1: Install Niruvi Desktop CLI / GUI */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <Terminal className="w-4 h-4 text-neutral-400" />
                <span>1. Install Niruvi Desktop Agent (Terminal One-Liner)</span>
              </div>
              <button
                onClick={() => copyText(installScriptOneLiner, 'install-cli')}
                className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-750 transition"
              >
                {copiedCmd === 'install-cli' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCmd === 'install-cli' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-3 bg-neutral-950 border border-neutral-850 rounded-xl font-mono text-[11px] text-neutral-300 overflow-x-auto selection:bg-neutral-700">
              {installScriptOneLiner}
            </div>
          </div>

          {/* Option 2: Register Protocol Handler in Linux Desktop */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <Laptop className="w-4 h-4 text-neutral-400" />
                <span>2. Register Scheme Handler (GNOME / KDE / XFCE / Wayland)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadDesktopFile}
                  className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-750 transition"
                  title="Download .desktop file"
                >
                  <Download className="w-3 h-3" />
                  <span>Download .desktop</span>
                </button>
                <button
                  onClick={() => copyText(registerSchemeCmd, 'register-scheme')}
                  className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-750 transition"
                >
                  {copiedCmd === 'register-scheme' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd === 'register-scheme' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Run this command in any Linux terminal to bind the <code className="text-white font-mono bg-neutral-800 px-1 py-0.5 rounded">niruvi://</code> URI scheme to the desktop app:
            </p>
            <pre className="p-3 bg-neutral-950 border border-neutral-850 rounded-xl font-mono text-[11px] text-neutral-300 overflow-x-auto whitespace-pre selection:bg-neutral-700">
              {registerSchemeCmd}
            </pre>
          </div>

          {/* Protocol Payload Specification */}
          <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2.5">
            <h4 className="font-semibold text-white text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-neutral-400" />
              <span>How Web-to-Desktop Dispatch Works</span>
            </h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              When a user clicks "Install", Niruvi Store formats a secure, cryptographically verified URI with the target AppImage URL, version tag, and SHA-256 hash checksum:
            </p>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-[10px] text-neutral-300 break-all">
              niruvi://install?id=vscodium&version=1.97.2&sha256=11fdbca66fa...&url=https://github.com/...
            </div>
            <p className="text-[11px] text-neutral-400">
              The Niruvi Desktop agent automatically handles sandbox permissions, downloads to <code className="text-neutral-200">~/.local/bin</code> or <code className="text-neutral-200">~/Applications</code>, verifies the checksum, sets executable permissions (<code className="text-neutral-200">+x</code>), and creates desktop application menu entries.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <a
            href="https://github.com/putinservai-cyber/niruvi"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Niruvi GitHub Project</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
