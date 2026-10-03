import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchModerationQueue,
  moderateApplication,
  moderatePublisher,
  MarketplaceApp,
  PublicDeveloperProfile,
} from '../lib/supabase';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Building2,
  Package,
  Flag,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface ModerationDashboardProps {
  onNavigateToStore?: () => void;
  onOpenAppDetail?: (slug: string) => void;
}

export const ModerationDashboard: React.FC<ModerationDashboardProps> = ({
  onNavigateToStore,
  onOpenAppDetail,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'apps' | 'publishers' | 'reports'>('apps');

  const [pendingApps, setPendingApps] = useState<MarketplaceApp[]>([]);
  const [pendingPublishers, setPendingPublishers] = useState<PublicDeveloperProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<{ id: string; reason: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isStaff = Boolean(user && (user.role === 'ADMIN' || user.role === 'MODERATOR'));

  const loadQueue = async () => {
    if (!isStaff) return;
    setLoading(true);
    try {
      const { pendingApps: apps, pendingPublishers: publishers } = await fetchModerationQueue();
      setPendingApps(apps);
      setPendingPublishers(publishers);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isStaff) {
      loadQueue();
    }
  }, [isStaff]);

  const handleAppAction = async (
    appId: string,
    action: 'approve' | 'reject' | 'request_changes' | 'suspend' | 'restore',
    reason?: string
  ) => {
    setActionLoading(appId);
    setStatusMessage(null);
    try {
      await moderateApplication(appId, action, reason);
      setPendingApps((prev) => prev.filter((a) => a.id !== appId));
      setRejectionReason(null);
      setStatusMessage({
        type: 'success',
        text: `Application status updated: ${action}. Audit record created.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Moderation action failed.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublisherAction = async (
    userId: string,
    action: 'approve' | 'reject' | 'unverify',
    reason?: string
  ) => {
    setActionLoading(userId);
    setStatusMessage(null);
    try {
      await moderatePublisher(userId, action, reason);
      setPendingPublishers((prev) => prev.filter((p) => p.userId !== userId));
      setStatusMessage({
        type: 'success',
        text: `Publisher status updated: ${action}. Audit record created.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Publisher moderation action failed.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (!user || !isStaff) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 max-w-md mx-auto shadow-2xl">
          <Lock className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Staff Access Required</h1>
          <p className="text-sm text-neutral-400 mb-6">
            You must be signed in with an authoritative Moderator or Administrator role in PostgreSQL.
          </p>
          {onNavigateToStore && (
            <button
              onClick={onNavigateToStore}
              className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl transition"
            >
              Return to Store
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10" id="main-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Moderation & Audit Console</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              Staff
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Authoritative marketplace moderation queue. Every decision is recorded to immutable audit_log.
          </p>
        </div>

        <button
          onClick={loadQueue}
          disabled={loading}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl transition flex items-center gap-1.5"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {statusMessage && (
        <div
          className={`my-6 p-4 rounded-xl text-sm flex items-center gap-3 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              : 'bg-red-950/40 text-red-300 border-red-800/60'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          {statusMessage.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-neutral-800 mt-6 pb-px">
        <button
          onClick={() => setActiveTab('apps')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'apps'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          Pending Applications ({pendingApps.length})
        </button>

        <button
          onClick={() => setActiveTab('publishers')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'publishers'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Publisher Requests ({pendingPublishers.length})
        </button>
      </div>

      {/* APPLICATIONS QUEUE */}
      {activeTab === 'apps' && (
        <div className="py-8">
          {loading ? (
            <div className="py-16 text-center text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
              Loading moderation queue...
            </div>
          ) : pendingApps.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 bg-neutral-900/40 rounded-2xl border border-dashed border-neutral-800">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400/60" />
              <p className="text-base font-semibold text-neutral-300">All submissions reviewed</p>
              <p className="text-xs text-neutral-500 mt-1">No applications are currently awaiting moderation.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApps.map((app) => (
                <div
                  key={app.id}
                  className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{app.name}</h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-neutral-800 text-neutral-400">
                          {app.slug}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-950 text-amber-300 border border-amber-800">
                          {app.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">{app.short_description || app.description}</p>
                    </div>

                    <div className="text-xs text-neutral-500">
                      Category: <strong className="text-neutral-300 mr-3">{app.category}</strong>
                      License: <strong className="text-neutral-300">{app.license}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 pt-2 border-t border-neutral-800/80">
                    {app.website_url && (
                      <a
                        href={app.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-cyan-400 flex items-center gap-1"
                      >
                        Official Website <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {app.source_url && (
                      <a
                        href={app.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-cyan-400 flex items-center gap-1"
                      >
                        Source Repository <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {rejectionReason?.id === app.id ? (
                    <div className="p-4 bg-red-950/30 border border-red-800/60 rounded-xl space-y-3">
                      <label className="block text-xs font-semibold text-red-200">
                        Reason for Rejection or Changes:
                      </label>
                      <textarea
                        rows={2}
                        value={rejectionReason.reason}
                        onChange={(e) =>
                          setRejectionReason({ id: app.id, reason: e.target.value })
                        }
                        placeholder="Explain why the submission is rejected so the publisher can resolve it..."
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-red-800/60 text-white text-xs outline-none resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAppAction(app.id, 'reject', rejectionReason.reason)}
                          disabled={actionLoading === app.id || !rejectionReason.reason.trim()}
                          className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                        >
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() =>
                            handleAppAction(app.id, 'request_changes', rejectionReason.reason)
                          }
                          disabled={actionLoading === app.id || !rejectionReason.reason.trim()}
                          className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-medium rounded-lg transition disabled:opacity-50"
                        >
                          Request Changes
                        </button>
                        <button
                          onClick={() => setRejectionReason(null)}
                          className="px-3 py-1.5 text-neutral-400 hover:text-white text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => handleAppAction(app.id, 'approve')}
                        disabled={actionLoading === app.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve & Publish
                      </button>

                      <button
                        onClick={() => setRejectionReason({ id: app.id, reason: '' })}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-red-300 text-xs font-medium rounded-xl transition flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject or Request Changes
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PUBLISHERS QUEUE */}
      {activeTab === 'publishers' && (
        <div className="py-8">
          {loading ? (
            <div className="py-16 text-center text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
              Loading publisher requests...
            </div>
          ) : pendingPublishers.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 bg-neutral-900/40 rounded-2xl border border-dashed border-neutral-800">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400/60" />
              <p className="text-base font-semibold text-neutral-300">All publisher applications reviewed</p>
              <p className="text-xs text-neutral-500 mt-1">No publisher accounts are currently pending review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPublishers.map((pub) => (
                <div
                  key={pub.userId}
                  className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{pub.orgName}</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-neutral-800 text-neutral-400">
                        {pub.slug}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{pub.orgDescription}</p>
                    <div className="flex gap-4 text-xs text-neutral-500 mt-2">
                      {pub.orgWebsite && (
                        <a href={pub.orgWebsite} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
                          Website
                        </a>
                      )}
                      {pub.sourceUrl && (
                        <a href={pub.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
                          Source
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePublisherAction(pub.userId, 'approve')}
                      disabled={actionLoading === pub.userId}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verify & Approve
                    </button>

                    <button
                      onClick={() => handlePublisherAction(pub.userId, 'reject', 'Does not meet publisher verification criteria.')}
                      disabled={actionLoading === pub.userId}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-red-300 text-xs font-medium rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
};
