import React, { useState } from 'react';
import { AppMetadata } from '../types';
import { AppIcon } from './AppIcon';
import { generateNiruviProtocolUrl } from '../data/apps';
import { 
  CheckCircle2, 
  Download, 
  Cpu, 
  HardDrive, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';

interface AppCardProps {
  app: AppMetadata;
  onSelect: (app: AppMetadata) => void;
}

export const AppCard: React.FC<AppCardProps> = ({ app, onSelect }) => {
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const protocolUrl = generateNiruviProtocolUrl(app);

  const handleCopyProtocol = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(protocolUrl);
    setCopiedProtocol(true);
    setTimeout(() => setCopiedProtocol(false), 2000);
  };

  const handleInstallClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Launch protocol handler in browser: niruvi://install?...
    window.location.href = protocolUrl;
  };

  return (
    <div 
      id={`app-card-${app.id}`}
      onClick={() => onSelect(app)}
      className="group relative flex flex-col bg-slate-800/60 hover:bg-slate-800/95 border border-slate-700/60 hover:border-blue-500/50 rounded-2xl p-5 transition-all duration-200 cursor-pointer hover:shadow-xl hover:shadow-blue-500/5"
    >
      {/* Top row: Icon + Identity */}
      <div className="flex items-start gap-3.5 mb-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${app.iconBg || 'from-blue-600 to-indigo-600'} flex items-center justify-center text-white shadow-md flex-shrink-0 group-hover:scale-105 transition-transform`}>
          <AppIcon name={app.iconName} className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-base text-white tracking-tight truncate group-hover:text-blue-400 transition-colors">
              {app.name}
            </h3>
            {app.publisher.verified && (
              <span title="Verified Publisher" className="text-blue-400">
                <CheckCircle2 className="w-4 h-4 fill-blue-500/20" />
              </span>
            )}
            {app.featured && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sparkles className="w-2.5 h-2.5" />
                Featured
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {app.publisher.name}
          </p>
        </div>
      </div>

      {/* Tagline */}
      <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed flex-1">
        {app.tagline}
      </p>

      {/* Meta tags & Architecture */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4 text-[11px]">
        <span className="px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-300 border border-slate-600/40">
          {app.category}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-300 border border-slate-600/40 flex items-center gap-1">
          <HardDrive className="w-3 h-3 text-slate-400" />
          {app.size}
        </span>
        {app.architectures.map((arch) => (
          <span key={arch} className="px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40 font-mono text-[10px]">
            {arch}
          </span>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-700/50 mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <span>v{app.version}</span>
          <span>•</span>
          <span className="truncate max-w-[80px]" title={app.license}>{app.license}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id={`copy-protocol-${app.id}`}
            type="button"
            onClick={handleCopyProtocol}
            title="Copy Niruvi protocol link (niruvi://install/...)"
            className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600/50 transition-colors"
          >
            {copiedProtocol ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            id={`install-btn-${app.id}`}
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm shadow-blue-600/30 transition-colors"
            title="Install via Niruvi desktop application"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        </div>
      </div>
    </div>
  );
};
