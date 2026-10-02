import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/site';
import { useAuth } from '../context/AuthContext';
import { sanitizeErrorMessage } from '../utils/sanitize';
import { fetchWithTimeoutAndRetry } from '../utils/network';
import {
  createCatalogProviders,
  setProviderEnabled,
  CatalogProvider,
  CatalogProviderId,
} from '../providers/catalogProviders';
import {
  ShieldCheck,
  EyeOff,
  Eye,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Flag,
  Lock,
} from 'lucide-react';

interface AdminSubmissionItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  architecture: string;
  license: string;
  download_url: string;
  source_url: string;
  icon_url: string | null;
  sha256: string | null;
  status: 'published' | 'hidden';
  created_at: string;
}

interface AdminReportItem {
  id: string;
  app_slug: string;
  reason: string;
  details: string;
  created_at: string;
}

interface AdminModerationViewProps {
  onBackToStore: () => void;
}

export const AdminModerationView: React.FC<AdminModerationViewProps> = ({ onBackToStore }) => {
  const { user } = useAuth();
  const [adminToken, setAdminToken] = useState('');
  const [submissions, setSubmissions] = useState<AdminSubmissionItem[]>([]);
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [providers, setProviders] = useState<CatalogProvider[]>(() => createCatalogProviders());

  const isAdminOrModeratorUser =
    Boolean(user) && (user?.role === 'ADMIN' || user?.role === 'MODERATOR');
  const isNonAdminSignedInUser = Boolean(user) && !isAdminOrModeratorUser;

  // Wipe in-memory admin token when leaving the console
  useEffect(() => {
    return () => {
      setAdminToken('');
    };
  }, []);

  const buildAdminHeaders = (includeJson = false): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (adminToken.trim()) {
      headers.Authorization = `Bearer ${adminToken.trim()}`;
    }
    return headers;
  };

  const handleLockConsole = () => {
    setAdminToken('');
    setSubmissions([]);
    setReports([]);
    setLoadedOnce(false);
    setStatusMessage('Admin console locked and credentials cleared from memory.');
  };

  const fetchAdminData = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminToken.trim() && !isAdminOrModeratorUser) {
      setError('Enter the Worker ADMIN_TOKEN secret or sign in with an Administrator account.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      const res = await fetchWithTimeoutAndRetry(buildApiUrl('/api/admin/submissions'), {
        method: 'GET',
        credentials: 'include',
        headers: buildAdminHeaders(false),
        timeoutMs: 8000,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          sanitizeErrorMessage(
            data?.error,
            `HTTP ${res.status}: Failed to load admin submissions.`
          )
        );
        return;
      }

      setSubmissions(Array.isArray(data?.submissions) ? data.submissions : []);
      setReports(Array.isArray(data?.reports) ? data.reports : []);
      setLoadedOnce(true);
    } catch (err) {
      setError(sanitizeErrorMessage(err, 'Could not connect to Worker admin endpoint.'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (target: string, nextStatus: 'published' | 'hidden') => {
    if (!adminToken.trim() && !isAdminOrModeratorUser) return;
    setError(null);
    setStatusMessage(null);

    try {
      const res = await fetchWithTimeoutAndRetry(buildApiUrl('/api/admin/hide'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAdminHeaders(true),
        body: JSON.stringify({ id: target, status: nextStatus }),
        timeoutMs: 8000,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(sanitizeErrorMessage(data?.error, `Failed to update status for "${target}".`));
        return;
      }

      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === target || item.slug === target ? { ...item, status: nextStatus } : item
        )
      );
      setStatusMessage(
        nextStatus === 'hidden'
          ? `Hidden submission "${target}" from public catalog.`
          : `Re-published submission "${target}".`
      );
    } catch (err) {
      setError(sanitizeErrorMessage(err, 'Network error while updating submission status.'));
    }
  };

  const handleDeleteSubmission = async (target: string) => {
    if (!adminToken.trim() && !isAdminOrModeratorUser) return;
    setError(null);
    setStatusMessage(null);

    try {
      const res = await fetchWithTimeoutAndRetry(buildApiUrl('/api/admin/delete'), {
        method: 'POST',
        credentials: 'include',
        headers: buildAdminHeaders(true),
        body: JSON.stringify({ id: target }),
        timeoutMs: 8000,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(sanitizeErrorMessage(data?.error, `Failed to delete "${target}".`));
        return;
      }

      setSubmissions((prev) => prev.filter((item) => item.id !== target && item.slug !== target));
      setStatusMessage(`Deleted submission "${target}" permanently.`);
    } catch (err) {
      setError(sanitizeErrorMessage(err, 'Network error while deleting submission.'));
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>Community Moderation Console</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Manage Community Submissions &amp; Reports
          </h1>
          <p className="text-xs text-neutral-300 mt-1">
            Authenticate with your Cloudflare Worker <code className="font-mono">ADMIN_TOKEN</code>{' '}
            secret (kept in memory only) to hide or delete community submissions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(loadedOnce || adminToken) && (
            <button
              type="button"
              onClick={handleLockConsole}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-amber-300 border border-amber-500/30 cursor-pointer"
            >
              Lock Console
            </button>
          )}
          <button
            type="button"
            onClick={onBackToStore}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white border border-neutral-700 cursor-pointer shrink-0"
          >
            Back to Catalog
          </button>
        </div>
      </div>

      {isNonAdminSignedInUser && !loadedOnce && (
        <div
          role="status"
          className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2"
        >
          <Lock className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <span>
            Signed in as <strong>@{user?.username}</strong> ({user?.role}). Admin routes require an{' '}
            <code className="font-mono">ADMIN</code> / <code className="font-mono">MODERATOR</code>{' '}
            role or a valid Worker <code className="font-mono">ADMIN_TOKEN</code> secret.
          </span>
        </div>
      )}

      {/* Admin Token Form */}
      <form
        onSubmit={fetchAdminData}
        className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4"
      >
        <label htmlFor="admin-token-input" className="block text-xs font-semibold text-white">
          Worker Admin Bearer Token (<code className="font-mono">ADMIN_TOKEN</code>)
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Lock
              className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="admin-token-input"
              type="password"
              autoComplete="off"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Enter ADMIN_TOKEN secret..."
              className="min-h-[44px] w-full pl-10 pr-3.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-400 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{loading ? 'Loading…' : 'Load Submissions'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {statusMessage && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>
      )}

      {loadedOnce && (
        <div className="space-y-6">
          {/* Submissions Table */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white">
              Community Submissions ({submissions.length})
            </h2>

            {submissions.length === 0 ? (
              <p className="text-xs text-neutral-400">No community submissions found in D1.</p>
            ) : (
              <div className="space-y-3">
                {submissions.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{item.name}</span>
                        <span className="text-xs font-mono text-neutral-400">({item.slug})</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                            item.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 line-clamp-2">{item.description}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 font-mono">
                        <span>v{item.version}</span>
                        <span>{item.architecture}</span>
                        <span>{item.license}</span>
                        <a
                          href={item.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Download URL</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'published' ? (
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(item.slug, 'hidden')}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Hide</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(item.slug, 'published')}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/30 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Publish</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteSubmission(item.slug)}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reports Table */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Flag className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Visitor Reports ({reports.length})</span>
            </h2>

            {reports.length === 0 ? (
              <p className="text-xs text-neutral-400">No reports filed.</p>
            ) : (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-amber-300">{rep.app_slug}</span>
                      <span className="text-neutral-400 font-mono">{rep.created_at}</span>
                    </div>
                    <p className="text-xs font-semibold text-white">{rep.reason}</p>
                    <p className="text-xs text-neutral-300">{rep.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Catalog Source Providers & Sync Health */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Catalog Source Providers</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Multi-provider discovery and release enrichment status across AppImageHub, GitHub Releases, GitLab Releases, SourceForge, and Community Submissions.
          </p>
        </div>

        <div className="space-y-2.5">
          {providers.map((prov) => (
            <div
              key={prov.id}
              className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{prov.name}</span>
                  <span className="font-mono text-[11px] text-neutral-400">
                    · {prov.status}
                  </span>
                  <span className="font-mono text-[11px] text-neutral-500">
                    · {prov.importedCount.toLocaleString()} indexed
                  </span>
                </div>
                <p className="text-neutral-400">{prov.description}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = setProviderEnabled(prov.id as CatalogProviderId, !prov.enabled);
                  setProviders(next);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                  prov.enabled
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
                }`}
              >
                {prov.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
