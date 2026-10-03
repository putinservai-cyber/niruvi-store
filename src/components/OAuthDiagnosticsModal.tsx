import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Copy,
  ExternalLink,
  Terminal,
  AlertTriangle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { ModalShell } from './ModalShell';
import {
  getOAuthDiagnosticsInfo,
  logOAuthDiagnostics,
  OAuthDiagnosticsReport,
} from '../lib/supabase';

interface OAuthDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OAuthDiagnosticsModal: React.FC<OAuthDiagnosticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [report, setReport] = useState<OAuthDiagnosticsReport>(() => getOAuthDiagnosticsInfo());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const latest = getOAuthDiagnosticsInfo();
      setReport(latest);
      logOAuthDiagnostics();
    }
  }, [isOpen]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleRefresh = () => {
    const fresh = getOAuthDiagnosticsInfo();
    setReport(fresh);
    logOAuthDiagnostics();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="OAuth & Supabase Diagnostics"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5 text-neutral-200 p-1">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">OAuth &amp; Supabase Diagnostics</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Close Diagnostics"
          >
            &times;
          </button>
        </div>
        <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">OAuth Architecture Status</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh & Log</span>
            </button>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Diagnose Google, GitHub, and GitLab OAuth redirect configurations and inspect the
            authoritative backend endpoints without exposing private credentials.
          </p>
        </div>

        {/* Highlighted Warning on Google Cloud Redirect URI */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5">
          <div className="flex items-start gap-2.5 font-semibold text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>Google Cloud vs. Supabase Redirect URL Rule</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-200/90">
            <strong>Does Google Cloud match &apos;https://niruvi-store.runs-on.dev/auth/callback&apos;?</strong>
            <br />
            <strong>NO.</strong> When using Supabase Auth, Google authenticates directly with Supabase,
            not the frontend. In Google Cloud Console, the <em>Authorized redirect URI</em> must be the
            <strong> Supabase Backend URL</strong> below.
          </p>
        </div>

        {/* Configuration Values */}
        <div className="space-y-3">
          {/* Supabase URL Host */}
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800/80 space-y-1">
            <div className="text-[11px] font-medium text-neutral-400 flex items-center justify-between">
              <span>Supabase Host</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  report.isConfigured
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {report.isConfigured ? 'Connected' : 'Missing Env'}
              </span>
            </div>
            <div className="text-xs font-mono text-neutral-200 break-all">
              {report.supabaseHost}
            </div>
          </div>

          {/* 1. Google Cloud Authorized Redirect URI */}
          <div className="p-3 rounded-lg bg-neutral-900 border border-emerald-500/30 space-y-1.5">
            <div className="text-[11px] font-medium text-emerald-400 flex items-center justify-between">
              <span>1. Google Cloud Console &rarr; Authorized Redirect URI (REQUIRED)</span>
              <button
                type="button"
                onClick={() => handleCopy(report.expectedGoogleCloudAuthorizedRedirectUri, 'gcp')}
                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedKey === 'gcp' ? 'Copied' : 'Copy URI'}</span>
              </button>
            </div>
            <div className="text-xs font-mono text-emerald-300 bg-black/40 p-2 rounded border border-emerald-500/20 break-all">
              {report.expectedGoogleCloudAuthorizedRedirectUri}
            </div>
            <p className="text-[10px] text-neutral-400">
              Set this in Google Cloud Console &gt; APIs &amp; Services &gt; Credentials &gt; OAuth 2.0 Client ID.
            </p>
          </div>

          {/* 2. Supabase Redirect URL */}
          <div className="p-3 rounded-lg bg-neutral-900 border border-sky-500/30 space-y-1.5">
            <div className="text-[11px] font-medium text-sky-400 flex items-center justify-between">
              <span>2. Supabase Dashboard &rarr; Redirect URLs (REQUIRED)</span>
              <button
                type="button"
                onClick={() => handleCopy(report.clientCallbackUrl, 'supabase')}
                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedKey === 'supabase' ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <div className="text-xs font-mono text-sky-300 bg-black/40 p-2 rounded border border-sky-500/20 break-all">
              {report.clientCallbackUrl}
            </div>
            <p className="text-[10px] text-neutral-400">
              Set this in Supabase Dashboard &gt; Authentication &gt; URL Configuration &gt; Redirect URLs.
            </p>
          </div>
        </div>

        {/* 403 Checklist */}
        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Why Google Returns 403 &apos;We&apos;re sorry, but you do not have access&apos;</span>
          </div>
          <ul className="space-y-2 text-[11px] text-neutral-300">
            {report.common403Causes.map((cause, idx) => (
              <li key={idx} className="p-2 rounded bg-neutral-950/60 border border-neutral-800/60 space-y-0.5">
                <span className="font-semibold text-neutral-200">{cause.issue}:</span>{' '}
                <span className="text-neutral-400">{cause.resolution}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => {
              logOAuthDiagnostics();
              alert('OAuth diagnostics logged to browser developer tools console.');
            }}
            className="text-neutral-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Log to Developer Console</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-semibold rounded-lg transition cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
