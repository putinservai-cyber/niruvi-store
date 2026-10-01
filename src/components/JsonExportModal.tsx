import React, { useState } from 'react';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import { X, Copy, Check, Download, Code } from 'lucide-react';
import { APPS_CATALOG } from '../data/apps';

interface JsonExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JsonExportModal: React.FC<JsonExportModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  usePreventBodyScroll(isOpen);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(
    {
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      store: 'Niruvi Store',
      totalApplications: APPS_CATALOG.length,
      apps: APPS_CATALOG,
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catalog.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-neutral-800 text-white border border-neutral-700">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Static Application Catalog (JSON)</h3>
              <p className="text-xs text-neutral-400">
                Machine-readable catalog consumed by the Niruvi AppImage client
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download catalog.json</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* JSON Preview */}
        <div className="p-4 bg-neutral-950 overflow-y-auto flex-1 font-mono text-xs text-neutral-300">
          <pre className="select-all">{jsonString}</pre>
        </div>
      </div>
    </div>
  );
};
