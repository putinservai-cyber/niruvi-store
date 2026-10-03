import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchPublisherApplications,
  createPublisherApplication,
  updatePublisherApplication,
  submitApplicationForReview,
  fetchAppVersionsWithAssets,
  createAppVersionWithAssets,
  importReleaseFromGitHub,
  importReleaseFromGitLab,
  validateReleaseMetadata,
  MarketplaceApp,
  MarketplaceAppVersion,
  ExternalReleaseImportResult,
} from '../lib/supabase';
import {
  Package,
  PlusCircle,
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  ExternalLink,
  ChevronRight,
  GitPullRequest,
  RefreshCw,
  Send,
  Eye,
  Sliders,
  Settings,
} from 'lucide-react';

export type PublisherTab =
  | 'overview'
  | 'applications'
  | 'drafts'
  | 'releases'
  | 'submissions'
  | 'profile'
  | 'settings';

interface PublisherDashboardProps {
  onNavigateToStore?: () => void;
  onOpenAppDetail?: (slug: string) => void;
}

export const PublisherDashboard: React.FC<PublisherDashboardProps> = ({
  onNavigateToStore,
  onOpenAppDetail,
}) => {
  const { user, developerProfile, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<PublisherTab>('overview');

  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [selectedApp, setSelectedApp] = useState<MarketplaceApp | null>(null);
  const [selectedAppVersions, setSelectedAppVersions] = useState<MarketplaceAppVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // New application form
  const [showCreateAppModal, setShowCreateAppModal] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppSlug, setNewAppSlug] = useState('');
  const [newAppShortDesc, setNewAppShortDesc] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppCategory, setNewAppCategory] = useState('Utilities');
  const [newAppLicense, setNewAppLicense] = useState('GPL-3.0');
  const [newAppWebsite, setNewAppWebsite] = useState('');
  const [newAppSource, setNewAppSource] = useState('');
  const [newAppIcon, setNewAppIcon] = useState('');
  const [creatingApp, setCreatingApp] = useState(false);
  const [appFormError, setAppFormError] = useState<string | null>(null);

  // Release Creation Form state
  const [showCreateReleaseModal, setShowCreateReleaseModal] = useState(false);
  const [releaseVersion, setReleaseVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [releaseArch, setReleaseArch] = useState<'x86_64' | 'aarch64' | 'armhf'>('x86_64');
  const [releaseDownloadUrl, setReleaseDownloadUrl] = useState('');
  const [releaseSha256, setReleaseSha256] = useState('');
  const [creatingRelease, setCreatingRelease] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  // GitHub / GitLab importer state
  const [importerMode, setImporterMode] = useState<'manual' | 'github' | 'gitlab'>('manual');
  const [importRepoUrl, setImportRepoUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ExternalReleaseImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isPublisher = Boolean(
    user && (user.role === 'DEVELOPER' || user.role === 'ADMIN' || user.role === 'MODERATOR')
  );

  const loadApps = async () => {
    if (!user) return;
    setLoadingApps(true);
    try {
      const data = await fetchPublisherApplications(user.id);
      setApps(data);
      if (selectedApp) {
        const updated = data.find((a) => a.id === selectedApp.id);
        if (updated) setSelectedApp(updated);
      }
    } catch {
      // Handled
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    if (user && isPublisher) {
      loadApps();
    }
  }, [user, isPublisher]);

  const loadVersions = async (appId: string) => {
    setLoadingVersions(true);
    try {
      const versions = await fetchAppVersionsWithAssets(appId);
      setSelectedAppVersions(versions);
    } catch {
      setSelectedAppVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleSelectApp = (app: MarketplaceApp) => {
    setSelectedApp(app);
    loadVersions(app.id);
    setActiveTab('releases');
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreatingApp(true);
    setAppFormError(null);
    try {
      const created = await createPublisherApplication({
        publisherId: user.id,
        name: newAppName.trim(),
        slug: newAppSlug.trim(),
        shortDescription: newAppShortDesc.trim(),
        description: newAppDesc.trim(),
        category: newAppCategory,
        license: newAppLicense.trim(),
        websiteUrl: newAppWebsite.trim() || null,
        sourceUrl: newAppSource.trim() || null,
        iconUrl: newAppIcon.trim() || null,
      });

      setApps((prev) => [created, ...prev]);
      setShowCreateAppModal(false);
      setStatusMessage({ type: 'success', text: `Draft application "${created.name}" created successfully.` });
      // Reset form
      setNewAppName('');
      setNewAppSlug('');
      setNewAppShortDesc('');
      setNewAppDesc('');
      setNewAppWebsite('');
      setNewAppSource('');
      setNewAppIcon('');
    } catch (err) {
      setAppFormError(err instanceof Error ? err.message : 'Failed to create application.');
    } finally {
      setCreatingApp(false);
    }
  };

  const handleSubmitForReview = async (appId: string) => {
    try {
      const updated = await submitApplicationForReview(appId);
      setApps((prev) => prev.map((a) => (a.id === appId ? updated : a)));
      if (selectedApp?.id === appId) setSelectedApp(updated);
      setStatusMessage({
        type: 'success',
        text: 'Application submitted for moderator review. It will become public once approved.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to submit application for review.',
      });
    }
  };

  const handleImportRelease = async () => {
    if (!importRepoUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    try {
      let res: ExternalReleaseImportResult;
      if (importerMode === 'github') {
        res = await importReleaseFromGitHub(importRepoUrl.trim());
      } else {
        res = await importReleaseFromGitLab(importRepoUrl.trim());
      }
      setImportResult(res);
      setReleaseVersion(res.version);
      setReleaseNotes(res.releaseNotes);
      if (res.assets.length > 0) {
        setReleaseArch(res.assets[0].architecture);
        setReleaseDownloadUrl(res.assets[0].downloadUrl);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import release from repository.');
    } finally {
      setImporting(false);
    }
  };

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    const validation = validateReleaseMetadata({
      version: releaseVersion,
      architecture: releaseArch,
      downloadUrl: releaseDownloadUrl,
      sha256: releaseSha256,
    });
    if (!validation.valid) {
      setReleaseError(validation.errors.join(' '));
      return;
    }

    setCreatingRelease(true);
    setReleaseError(null);
    try {
      const createdVer = await createAppVersionWithAssets({
        appId: selectedApp.id,
        version: releaseVersion.trim(),
        releaseNotes: releaseNotes.trim(),
        architecture: releaseArch,
        downloadUrl: releaseDownloadUrl.trim(),
        sha256: releaseSha256.trim().toLowerCase(),
      });

      setSelectedAppVersions((prev) => [createdVer, ...prev]);
      setShowCreateReleaseModal(false);
      setReleaseVersion('');
      setReleaseNotes('');
      setReleaseDownloadUrl('');
      setReleaseSha256('');
      setImportResult(null);
      setStatusMessage({
        type: 'success',
        text: `Release version ${createdVer.version} created with ${releaseArch} AppImage asset.`,
      });
    } catch (err) {
      setReleaseError(err instanceof Error ? err.message : 'Failed to create release.');
    } finally {
      setCreatingRelease(false);
    }
  };

  if (!user) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 max-w-md mx-auto shadow-2xl">
          <Building2 className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Publisher Access Required</h1>
          <p className="text-sm text-neutral-400 mb-6">
            Please sign in with a verified publisher account to access developer publishing tools.
          </p>
          <button
            onClick={openAuthModal}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl transition"
          >
            Sign In to Publisher Console
          </button>
        </div>
      </main>
    );
  }

  if (!isPublisher) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 max-w-md mx-auto shadow-2xl">
          <Building2 className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Publisher Account Pending</h1>
          <p className="text-sm text-neutral-400 mb-6">
            Your account does not currently have verified publisher permissions. Apply to become a publisher from your Account Dashboard.
          </p>
          {onNavigateToStore && (
            <button
              onClick={onNavigateToStore}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition border border-neutral-700"
            >
              Return to Store
            </button>
          )}
        </div>
      </main>
    );
  }

  const drafts = apps.filter((a) => a.status === 'draft');
  const submissions = apps.filter((a) => a.status === 'pending_review' || a.status === 'rejected');

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10" id="main-content">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-8 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Publisher Dashboard</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              Verified Publisher
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Authoritative Linux application and release management backed by Supabase PostgreSQL.
          </p>
        </div>

        <button
          onClick={() => setShowCreateAppModal(true)}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-cyan-900/30 flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Create Application
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
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          {statusMessage.text}
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-neutral-800 mt-6 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'applications'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          Applications ({apps.length})
        </button>
        <button
          onClick={() => setActiveTab('drafts')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'drafts'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          Drafts ({drafts.length})
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'submissions'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          Submissions ({submissions.length})
        </button>
        {selectedApp && (
          <button
            onClick={() => setActiveTab('releases')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'releases'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Releases: {selectedApp.name}
          </button>
        )}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="py-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Total Applications</div>
              <div className="text-3xl font-bold text-white mt-2">{apps.length}</div>
              <div className="text-xs text-neutral-500 mt-1">Managed under this publisher</div>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Live in Store</div>
              <div className="text-3xl font-bold text-emerald-400 mt-2">
                {apps.filter((a) => a.status === 'published').length}
              </div>
              <div className="text-xs text-neutral-500 mt-1">Discoverable by all Linux users</div>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Pending Review</div>
              <div className="text-3xl font-bold text-amber-400 mt-2">{submissions.length}</div>
              <div className="text-xs text-neutral-500 mt-1">Awaiting moderator validation</div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-4">Quick Release Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition">
                <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-cyan-400" />
                  New Application Listing
                </h3>
                <p className="text-xs text-neutral-400 mb-4">
                  Create a new application record in PostgreSQL with metadata, licensing, and category tags.
                </p>
                <button
                  onClick={() => setShowCreateAppModal(true)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl transition"
                >
                  Create Application
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition">
                <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-cyan-400" />
                  GitHub / GitLab Importer
                </h3>
                <p className="text-xs text-neutral-400 mb-4">
                  Select an application to auto-detect its latest AppImage binary assets and SHA-256 digests.
                </p>
                <button
                  onClick={() => setActiveTab('applications')}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl transition"
                >
                  Select App to Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPLICATIONS TAB */}
      {activeTab === 'applications' && (
        <div className="py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">All Applications ({apps.length})</h2>
            <button
              onClick={loadApps}
              className="p-2 text-neutral-400 hover:text-white rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loadingApps ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingApps ? (
            <div className="py-16 text-center text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
              Loading applications...
            </div>
          ) : apps.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 bg-neutral-900/40 rounded-2xl border border-dashed border-neutral-800">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-base font-semibold text-neutral-300">No applications found</p>
              <p className="text-xs text-neutral-500 mt-1 mb-4">
                Click "Create Application" to publish your first AppImage.
              </p>
              <button
                onClick={() => setShowCreateAppModal(true)}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-xl transition"
              >
                Create Application
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-between hover:border-neutral-700 transition"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="text-base font-bold text-white truncate">{app.name}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          app.status === 'published'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : app.status === 'pending_review'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : app.status === 'rejected'
                            ? 'bg-red-950 text-red-300 border-red-800'
                            : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400 line-clamp-2 mb-4">
                      {app.short_description || app.description}
                    </p>

                    <div className="text-[11px] text-neutral-500 space-y-1">
                      <div>Slug: <strong className="text-neutral-400">{app.slug}</strong></div>
                      <div>Category: <strong className="text-neutral-400">{app.category}</strong></div>
                      <div>License: <strong className="text-neutral-400">{app.license}</strong></div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between">
                    <button
                      onClick={() => handleSelectApp(app)}
                      className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
                    >
                      Manage Releases
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {app.status === 'draft' && (
                      <button
                        onClick={() => handleSubmitForReview(app.id)}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium rounded-lg transition"
                      >
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DRAFTS TAB */}
      {activeTab === 'drafts' && (
        <div className="py-8">
          <h2 className="text-lg font-bold text-white mb-4">Draft Applications ({drafts.length})</h2>
          {drafts.length === 0 ? (
            <p className="text-sm text-neutral-500">No applications currently in draft status.</p>
          ) : (
            <div className="space-y-4">
              {drafts.map((app) => (
                <div
                  key={app.id}
                  className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="text-base font-bold text-white">{app.name}</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">{app.short_description || app.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSelectApp(app)}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl transition"
                    >
                      Add Releases
                    </button>
                    <button
                      onClick={() => handleSubmitForReview(app.id)}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-xl transition flex items-center gap-1.5"
                    >
                      <Send className="w-3 h-3" />
                      Submit for Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBMISSIONS TAB */}
      {activeTab === 'submissions' && (
        <div className="py-8">
          <h2 className="text-lg font-bold text-white mb-4">Pending & Rejected Submissions ({submissions.length})</h2>
          {submissions.length === 0 ? (
            <p className="text-sm text-neutral-500">No pending submissions or rejected items requiring attention.</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((app) => (
                <div
                  key={app.id}
                  className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{app.name}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          app.status === 'rejected'
                            ? 'bg-red-950 text-red-300 border-red-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                    {app.rejection_reason && (
                      <div className="text-xs text-red-400 mt-2 bg-red-950/30 p-3 rounded-xl border border-red-900/50">
                        <strong>Rejection Reason:</strong> {app.rejection_reason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSelectApp(app)}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl transition"
                    >
                      Edit Application
                    </button>
                    {app.status === 'rejected' && (
                      <button
                        onClick={() => handleSubmitForReview(app.id)}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-xl transition"
                      >
                        Resubmit for Review
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RELEASES TAB (WHEN APP IS SELECTED) */}
      {activeTab === 'releases' && selectedApp && (
        <div className="py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">Release Management</div>
              <h2 className="text-xl font-bold text-white">{selectedApp.name}</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Manage version tags, release notes, and multi-architecture AppImage binaries for this application.
              </p>
            </div>

            <button
              onClick={() => setShowCreateReleaseModal(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-xl transition flex items-center gap-1.5 self-start"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Release
            </button>
          </div>

          {loadingVersions ? (
            <div className="py-16 text-center text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
              Loading releases...
            </div>
          ) : selectedAppVersions.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 bg-neutral-900/40 rounded-2xl border border-dashed border-neutral-800">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-base font-semibold text-neutral-300">No releases published yet</p>
              <p className="text-xs text-neutral-500 mt-1 mb-4">
                Attach your first .AppImage binary asset or import directly from GitHub/GitLab.
              </p>
              <button
                onClick={() => setShowCreateReleaseModal(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-xl transition"
              >
                Create First Release
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedAppVersions.map((ver) => (
                <div
                  key={ver.id}
                  className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-white">v{ver.version}</span>
                      <span className="text-xs text-neutral-400">
                        Released: {new Date(ver.release_date).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {ver.status}
                    </span>
                  </div>

                  {ver.release_notes && (
                    <p className="text-xs text-neutral-300 bg-neutral-950 p-3 rounded-xl border border-neutral-800/80 whitespace-pre-wrap">
                      {ver.release_notes}
                    </p>
                  )}

                  <div>
                    <div className="text-xs font-semibold text-neutral-400 mb-2">Binary Assets:</div>
                    <div className="space-y-2">
                      {ver.assets?.map((asset) => (
                        <div
                          key={asset.id}
                          className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-white uppercase mr-2">{asset.architecture}</span>
                            <span className="text-neutral-400 font-mono text-[11px] break-all">{asset.download_url}</span>
                            <div className="text-[11px] text-neutral-500 font-mono mt-1">
                              SHA-256: {asset.sha256}
                            </div>
                          </div>
                          <a
                            href={asset.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-cyan-400 hover:text-cyan-300 transition"
                            title="Direct download link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE APPLICATION MODAL */}
      {showCreateAppModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Create Application Listing</h2>
            <p className="text-xs text-neutral-400 mb-6">
              Create an authoritative application record in PostgreSQL.
            </p>

            {appFormError && (
              <div className="p-4 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-xs mb-4">
                {appFormError}
              </div>
            )}

            <form onSubmit={handleCreateApp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Application Name *
                </label>
                <input
                  type="text"
                  required
                  value={newAppName}
                  onChange={(e) => {
                    setNewAppName(e.target.value);
                    if (!newAppSlug) {
                      setNewAppSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9._-]+/g, '-')
                          .slice(0, 48)
                      );
                    }
                  }}
                  placeholder="e.g. FreeCAD, Krita, Obsidian"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Slug (Unique Identifier) *
                </label>
                <input
                  type="text"
                  required
                  value={newAppSlug}
                  onChange={(e) => setNewAppSlug(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                  placeholder="e.g. freecad"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Short Description *
                </label>
                <input
                  type="text"
                  required
                  maxLength={240}
                  value={newAppShortDesc}
                  onChange={(e) => setNewAppShortDesc(e.target.value)}
                  placeholder="One sentence summary of your application..."
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Full Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newAppDesc}
                  onChange={(e) => setNewAppDesc(e.target.value)}
                  placeholder="Comprehensive description of features, workflow, and desktop requirements..."
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={newAppCategory}
                    onChange={(e) => setNewAppCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm outline-none"
                  >
                    <option value="Utilities">Utilities</option>
                    <option value="Development">Development</option>
                    <option value="Graphics">Graphics</option>
                    <option value="AudioVideo">Audio & Video</option>
                    <option value="Productivity">Productivity</option>
                    <option value="Games">Games</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    License
                  </label>
                  <input
                    type="text"
                    required
                    value={newAppLicense}
                    onChange={(e) => setNewAppLicense(e.target.value)}
                    placeholder="GPL-3.0, MIT, Apache-2.0"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Website (HTTPS)
                  </label>
                  <input
                    type="url"
                    value={newAppWebsite}
                    onChange={(e) => setNewAppWebsite(e.target.value)}
                    placeholder="https://example.org"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Source Repository
                  </label>
                  <input
                    type="url"
                    value={newAppSource}
                    onChange={(e) => setNewAppSource(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowCreateAppModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingApp}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-xl transition flex items-center gap-2"
                >
                  {creatingApp && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE RELEASE MODAL */}
      {showCreateReleaseModal && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Create Release for {selectedApp.name}</h2>
            <p className="text-xs text-neutral-400 mb-6">
              Attach portable Linux .AppImage package assets with cryptographic SHA-256 verification.
            </p>

            {/* Importer Selector */}
            <div className="flex items-center gap-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800 mb-6">
              <button
                type="button"
                onClick={() => setImporterMode('manual')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                  importerMode === 'manual' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setImporterMode('github')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                  importerMode === 'github' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                GitHub Importer
              </button>
              <button
                type="button"
                onClick={() => setImporterMode('gitlab')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                  importerMode === 'gitlab' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                GitLab Importer
              </button>
            </div>

            {/* Auto Importer UI */}
            {importerMode !== 'manual' && (
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl mb-6 space-y-3">
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  {importerMode === 'github' ? 'GitHub Repository URL' : 'GitLab Project URL'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={importRepoUrl}
                    onChange={(e) => setImportRepoUrl(e.target.value)}
                    placeholder={
                      importerMode === 'github'
                        ? 'https://github.com/owner/repository'
                        : 'https://gitlab.com/group/project'
                    }
                    className="flex-1 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleImportRelease}
                    disabled={importing || !importRepoUrl.trim()}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Detect Release
                  </button>
                </div>

                {importError && (
                  <div className="text-xs text-red-400 mt-2">{importError}</div>
                )}

                {importResult && (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-lg text-xs text-emerald-300 space-y-1">
                    <div>Detected Version: <strong>{importResult.version}</strong></div>
                    <div>Found AppImage Assets: <strong>{importResult.assets.length}</strong></div>
                  </div>
                )}
              </div>
            )}

            {releaseError && (
              <div className="p-4 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-xs mb-4">
                {releaseError}
              </div>
            )}

            <form onSubmit={handleCreateRelease} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Version Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={releaseVersion}
                    onChange={(e) => setReleaseVersion(e.target.value)}
                    placeholder="e.g. 1.4.2"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Architecture *
                  </label>
                  <select
                    value={releaseArch}
                    onChange={(e) => setReleaseArch(e.target.value as 'x86_64' | 'aarch64' | 'armhf')}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm outline-none"
                  >
                    <option value="x86_64">x86_64 (64-bit Intel/AMD)</option>
                    <option value="aarch64">aarch64 (ARM64)</option>
                    <option value="armhf">armhf (ARM 32-bit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Direct Download URL (.AppImage) *
                </label>
                <input
                  type="url"
                  required
                  value={releaseDownloadUrl}
                  onChange={(e) => setReleaseDownloadUrl(e.target.value)}
                  placeholder="https://github.com/.../app.AppImage"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Cryptographic SHA-256 Digest (64 hex characters) *
                </label>
                <input
                  type="text"
                  required
                  pattern="^[a-fA-F0-9]{64}$"
                  maxLength={64}
                  value={releaseSha256}
                  onChange={(e) => setReleaseSha256(e.target.value.toLowerCase().replace(/[^a-f0-9]/g, ''))}
                  placeholder="e.g. e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white font-mono text-xs outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Release Notes / Changelog
                </label>
                <textarea
                  rows={3}
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder="Key improvements, security patches, or changes in this version..."
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowCreateReleaseModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingRelease}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-xl transition flex items-center gap-2"
                >
                  {creatingRelease && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Publish Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
