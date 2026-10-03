import React, { useState, useEffect } from 'react';
import {
  Terminal,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import {
  getOAuthDiagnosticsInfo,
  logOAuthDiagnostics,
  getSupabaseConfigStatus,
  getOAuthRedirectUrl,
  OAuthDiagnosticsReport,
  supabase,
} from '../lib/supabase';

interface AuthDiagnosticsProps {
  /**
   * If true, starts in expanded mode. Defaults to false.
   */
  defaultExpanded?: boolean;
  /**
   * Optional custom title or caption.
   */
  className?: string;
}

export const AuthDiagnostics: React.FC<AuthDiagnosticsProps> = ({
  defaultExpanded = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [report, setReport] = useState<OAuthDiagnosticsReport>(() => getOAuthDiagnosticsInfo());
  const [configStatus, setConfigStatus] = useState(() => getSupabaseConfigStatus());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [pingStatus, setPingStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [pingMessage, setPingMessage] = useState<string | null>(null);

  const refreshDiagnostics = () => {
    const freshReport = getOAuthDiagnosticsInfo();
    const freshStatus = getSupabaseConfigStatus();
    setReport(freshReport);
    setConfigStatus(freshStatus);
    logOAuthDiagnostics();
  };

  useEffect(() => {
    refreshDiagnostics();
  }, []);

  const handleCopy = async (text: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      // fallback
    }
  };

  const testSupabaseHandshake = async () => {
    setPingStatus('checking');
    setPingMessage(null);
    try {
      if (!supabase) {
        setPingStatus('error');
        setPingMessage('Supabase client is not instantiated.');
        return;
      }
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setPingStatus('error');
        setPingMessage(error.message);
      } else {
        setPingStatus('success');
        setPingMessage(
          data.session
            ? `Connected! Active session for: ${data.session.user?.email || 'User'}`
            : 'Supabase Auth initialized successfully (No active session).'
        );
      }
    } catch (err: unknown) {
      setPingStatus('error');
      setPingMessage(err instanceof Error ? err.message : 'Failed to reach Supabase API.');
    }
  };

  const currentRedirectUrl = report.clientCallbackUrl || getOAuthRedirectUrl();
  const expectedGcpRedirectUri = report.expectedGoogleCloudAuthorizedRedirectUri;

  return (
    <div
      data-testid="auth-diagnostics-component"
      className={`rounded-xl border border-sky-500/30 bg-sky-950/20 text-neutral-200 overflow-hidden text-xs transition-all ${className}`}
    >
      {/* Header bar / toggle */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-900/80 border-b border-sky-500/20">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="font-semibold text-white text-xs">Auth &amp; OAuth Diagnostics</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
              configStatus.configured
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {configStatus.configured ? 'Supabase Ready' : 'Env Missing'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={refreshDiagnostics}
            title="Refresh & Log to Console"
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
            aria-label="Refresh diagnostics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-2 py-1 rounded bg-neutral-800/80 hover:bg-neutral-700 text-[11px] text-neutral-300 flex items-center gap-1 transition cursor-pointer"
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Primary quick verification summary always visible */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-400">Current App OAuth Callback URL:</span>
          <button
            type="button"
            onClick={() => handleCopy(currentRedirectUrl, 'app_cb')}
            className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 cursor-pointer transition"
          >
            <Copy className="w-3 h-3" />
            <span>{copiedField === 'app_cb' ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <div className="p-2 rounded bg-black/40 border border-neutral-800 font-mono text-[11px] text-sky-300 break-all select-all">
          {currentRedirectUrl}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 pt-1 border-t border-neutral-800/60">
          {/* Google Cloud Console Expected Redirect URI */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-medium">
                Google Cloud &rarr; Authorized redirect URI:
              </span>
              <button
                type="button"
                onClick={() => handleCopy(expectedGcpRedirectUri, 'gcp_uri')}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition text-[11px]"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedField === 'gcp_uri' ? 'Copied!' : 'Copy for GCP'}</span>
              </button>
            </div>
            <div className="p-2 rounded bg-black/40 border border-emerald-500/30 font-mono text-[11px] text-emerald-300 break-all select-all">
              {expectedGcpRedirectUri}
            </div>
            <p className="text-[10px] text-neutral-400">
              Must be placed in Google Cloud Console &gt; Credentials &gt; OAuth 2.0 Client.
            </p>
          </div>

          {/* Provider Initialization Status */}
          <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800 space-y-1.5">
            <div className="text-[11px] font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Provider Initialization Status</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-neutral-500 block text-[10px]">SUPABASE HOST</span>
                <span className="font-mono text-neutral-200">{report.supabaseHost}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">ANON KEY STATUS</span>
                <span className={report.hasAnonKey ? 'text-emerald-400' : 'text-red-400'}>
                  {report.hasAnonKey ? 'Verified Loaded' : 'Missing'}
                </span>
              </div>
            </div>
          </div>

          {/* Connection Test Action */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={testSupabaseHandshake}
              disabled={pingStatus === 'checking'}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-medium flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{pingStatus === 'checking' ? 'Testing...' : 'Test Auth Handshake'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                logOAuthDiagnostics();
                alert('OAuth diagnostics output sent to browser developer console.');
              }}
              className="text-[11px] text-neutral-400 hover:text-white transition cursor-pointer"
            >
              Log to Console
            </button>
          </div>

          {pingMessage && (
            <div
              className={`p-2 rounded text-[11px] flex items-start gap-1.5 ${
                pingStatus === 'success'
                  ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-800/60'
                  : 'bg-red-950/60 text-red-200 border border-red-800/60'
              }`}
            >
              {pingStatus === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              )}
              <span className="break-all">{pingMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
