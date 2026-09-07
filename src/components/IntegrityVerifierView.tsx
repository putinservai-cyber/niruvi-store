import React, { useState, useRef } from 'react';
import { AppMetadata } from '../types';
import { AppIcon } from './AppIcon';
import { 
  ShieldCheck, 
  Upload, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  RotateCcw,
  Sparkles,
  Terminal,
  HelpCircle
} from 'lucide-react';

interface IntegrityVerifierViewProps {
  catalog: AppMetadata[];
  onSelectApp: (app: AppMetadata) => void;
}

export const IntegrityVerifierView: React.FC<IntegrityVerifierViewProps> = ({
  catalog,
  onSelectApp,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [calculatedHash, setCalculatedHash] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [matchedApp, setMatchedApp] = useState<AppMetadata | null>(null);
  const [expectedHash, setExpectedHash] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState(false);
  const [manualHashA, setManualHashA] = useState('');
  const [manualHashB, setManualHashB] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute SHA-256 of uploaded file using browser Web Crypto API
  const calculateSha256 = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsCalculating(true);
    setCalculatedHash('');
    setMatchedApp(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      setCalculatedHash(hashHex);

      // Search catalog for matching SHA-256
      const found = catalog.find((app) => app.sha256.toLowerCase() === hashHex.toLowerCase());
      if (found) {
        setMatchedApp(found);
      }
    } catch (err) {
      console.error('Failed to compute SHA-256 hash', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      calculateSha256(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      calculateSha256(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const copyCalculated = () => {
    navigator.clipboard.writeText(calculatedHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const resetFile = () => {
    setFile(null);
    setCalculatedHash('');
    setMatchedApp(null);
    setExpectedHash('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isCustomMatch = expectedHash.trim().length > 0 && 
    calculatedHash.length > 0 && 
    expectedHash.trim().toLowerCase() === calculatedHash.toLowerCase();

  const isCustomMismatch = expectedHash.trim().length > 0 && 
    calculatedHash.length > 0 && 
    expectedHash.trim().toLowerCase() !== calculatedHash.toLowerCase();

  const isManualMatch = manualHashA.trim().length > 0 && 
    manualHashB.trim().length > 0 && 
    manualHashA.trim().toLowerCase() === manualHashB.trim().toLowerCase();

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title & Introduction */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 md:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Cryptographic Verification Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            AppImage SHA-256 Integrity Verifier
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Verify that your downloaded Linux AppImages are 100% authentic and unaltered. This tool uses your browser's native Web Crypto API to calculate the SHA-256 checksum locally—your files never leave your computer.
          </p>
        </div>
      </div>

      {/* Main File Inspection Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Drag & Drop and Results */}
        <div className="lg:col-span-2 space-y-6">
          <div
            id="hash-dropzone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isCalculating 
                ? 'border-blue-500 bg-blue-500/5' 
                : file 
                  ? 'border-emerald-500/60 bg-emerald-500/5' 
                  : 'border-slate-700 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".AppImage,.appimage,.bin,.zip,.tar,.gz,*"
            />

            <div className="max-w-md mx-auto flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300 mb-4 shadow-inner">
                {isCalculating ? (
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : file ? (
                  <FileCheck className="w-7 h-7 text-emerald-400" />
                ) : (
                  <Upload className="w-7 h-7 text-blue-400" />
                )}
              </div>

              {isCalculating ? (
                <div>
                  <h3 className="text-base font-semibold text-white">Computing SHA-256 Checksum...</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Processing {file?.name} ({((file?.size || 0) / (1024 * 1024)).toFixed(1)} MB)
                  </p>
                </div>
              ) : file ? (
                <div>
                  <h3 className="text-base font-semibold text-white">{file.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {((file.size || 0) / (1024 * 1024)).toFixed(2)} MB • Click or drop another file to replace
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-base font-semibold text-white">Choose or drop any .AppImage file</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports any local Linux executable, AppImage, or archive
                  </p>
                  <button
                    type="button"
                    className="mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow transition-colors"
                  >
                    Select File from Disk
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Computed Results Panel */}
          {calculatedHash && (
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-white">Computed Cryptographic Digest</h4>
                </div>
                <button
                  onClick={resetFile}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>SHA-256 (64 hex characters)</span>
                  <button
                    onClick={copyCalculated}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {copiedHash ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Checksum</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 break-all select-all">
                  {calculatedHash}
                </div>
              </div>

              {/* Automatic Catalog Match Result */}
              {matchedApp ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-emerald-200">
                        Official Store Catalog Match Verified!
                      </h5>
                      <p className="text-xs text-slate-300">
                        This file exactly matches the official publisher release of{' '}
                        <strong className="text-white">{matchedApp.name} v{matchedApp.version}</strong> published by{' '}
                        <span className="text-emerald-300 font-medium">{matchedApp.publisher.name}</span>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center">
                        <AppIcon slug={matchedApp.iconSlug} className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-white">{matchedApp.name}</span>
                      <span className="text-slate-400">({matchedApp.size})</span>
                    </div>

                    <button
                      onClick={() => onSelectApp(matchedApp)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors"
                    >
                      View App Details
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h5 className="text-xs font-semibold text-slate-200">
                        No Automatic Catalog Match Found
                      </h5>
                      <p className="text-xs text-slate-400">
                        This file does not match any existing official package in the current store catalog. You can paste an expected SHA-256 hash below to verify it against a custom publisher source.
                      </p>
                    </div>
                  </div>

                  {/* Compare with Expected Hash */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <label className="text-xs font-medium text-slate-300">
                      Compare with Expected Hash:
                    </label>
                    <input
                      type="text"
                      value={expectedHash}
                      onChange={(e) => setExpectedHash(e.target.value)}
                      placeholder="Paste 64-character SHA-256 hash here..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    {isCustomMatch && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mt-2">
                        <Check className="w-4 h-4" />
                        <span>Hashes match perfectly! The file is authentic and unaltered.</span>
                      </div>
                    )}

                    {isCustomMismatch && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Hashes do not match! The file may be corrupt or modified.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Quick Hash Comparator & Linux CLI Instructions */}
        <div className="space-y-6">
          {/* Compare Two Hashes Tool */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white">Compare Two Hashes</h4>
            <p className="text-xs text-slate-400">
              Quickly compare any two checksum strings to see if they are identical.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={manualHashA}
                onChange={(e) => setManualHashA(e.target.value)}
                placeholder="Hash A (e.g. from website)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                value={manualHashB}
                onChange={(e) => setManualHashB(e.target.value)}
                placeholder="Hash B (e.g. from sha256sum)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {manualHashA && manualHashB && (
              <div
                className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  isManualMatch
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {isManualMatch ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Match! Hashes are identical.</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>Mismatch! The two hashes differ.</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Linux Terminal Verification Command Guide */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span>Verify in Linux Terminal</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              You can also compute the SHA-256 checksum natively on any Linux terminal:
            </p>
            <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-blue-300 overflow-x-auto">
sha256sum application.AppImage
            </pre>
            <p className="text-slate-400 leading-relaxed">
              Or verify against an expected hash automatically:
            </p>
            <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
{`echo "<hash>  application.AppImage" | sha256sum --check`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
