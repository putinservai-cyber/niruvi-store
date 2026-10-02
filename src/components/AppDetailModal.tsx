import React, { useState, useEffect } from 'react';
import { AppMetadata } from '../types';
import { generateNiruviProtocolUrl } from '../data/apps';
import { buildApiUrl } from '../config/site';
import {
  getChecksumStatus,
  isCommunitySubmitted,
  isGenuineSha256,
  formatAppVersion,
  hasKnownVersion,
} from '../utils/catalogSchema';
import {
  X,
  ShieldCheck,
  Download,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  Cpu,
  HardDrive,
  Calendar,
  Scale,
  Bookmark,
  FileCode,
  Flag,
  History,
  Image as ImageIcon,
  GitBranch,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { AppIcon } from './AppIcon';

interface AppDetailModalProps {
  app: AppMetadata | null;
  onClose: () => void;
  onInstall: (app: AppMetadata, e: React.MouseEvent, selectedArch?: string) => void;
  isStarred?: boolean;
  onToggleStar?: (appId: string, e: React.MouseEvent) => void;
  onOpenVerifierWithHash?: (hash: string) => void;
  onShowToast?: (msg: string, type?: 'success' | 'info') => void;
  initialOpenReport?: boolean;
}

export const AppDetailModal: React.FC<AppDetailModalProps> = ({
  app,
  onClose,
  onInstall,
  isStarred = false,
  onToggleStar,
  onOpenVerifierWithHash,
  onShowToast,
  initialOpenReport = false,
}) => {
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [selectedArch, setSelectedArch] = useState<string>('x86_64');
  const [liveVersionHistory, setLiveVersionHistory] = useState(app?.versionHistory || []);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Report broken package form state
  const [showReportForm, setShowReportForm] = useState(initialOpenReport);
  const [reportReason, setReportReason] = useState('Broken download link (404)');
  const [reportDetails, setReportDetails] = useState('');
  const [reportDistro, setReportDistro] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportStatusMsg, setReportStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (app && app.architectures.length > 0) {
      setSelectedArch(app.architectures[0]);
    }
    setLiveVersionHistory(app?.versionHistory || []);
    setShowReportForm(Boolean(initialOpenReport));
    setReportDetails('');
    setReportStatusMsg(null);

    if (app && (!app.versionHistory || app.versionHistory.length === 0) && app.githubRepo) {
      let cancelled = false;
      setLoadingHistory(true);
      fetch(`/api/catalog/${encodeURIComponent(app.id)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data?.app?.versionHistory?.length) {
            setLiveVersionHistory(data.app.versionHistory);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoadingHistory(false);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [app]);

  useEffect(() => {
    if (!app) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [app, onClose]);

  if (!app) return null;

  const communitySubmitted = isCommunitySubmitted(app);
  const checksumStatus = getChecksumStatus(app);
  const isTrulyVerified = checksumStatus === 'verified';
  const hasProvidedChecksum = checksumStatus === 'provided' && isGenuineSha256(app.sha256);
  const hasCopyableSha = isTrulyVerified || hasProvidedChecksum;
  const activeDownloadUrl = app.downloadMap?.[selectedArch] || app.downloadUrl;
  const protocolUrl = generateNiruviProtocolUrl(app, selectedArch);
  const fileVersionSegment = hasKnownVersion(app.version)
    ? `-${app.version.replace(/^v/i, '')}`
    : '';
  const fileName = `${app.id}${fileVersionSegment}-${selectedArch}.AppImage`;
  const chmodCmd = `chmod +x ${fileName} && ./${fileName}`;
  const verifyCmd = hasCopyableSha
    ? `echo "${app.sha256}  ${fileName}" | sha256sum --check`
    : `sha256sum ${fileName}`;

  const sourceRepoUrl =
    app.repositoryUrl ||
    app.publisher.github ||
    (app.githubRepo ? `https://github.com/${app.githubRepo}` : '') ||
    app.sourceUrl;

  const copySha = () => {
    if (!hasCopyableSha) return;
    navigator.clipboard.writeText(app.sha256);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const copyCmd = () => {
    navigator.clipboard.writeText(`${verifyCmd}\n${chmodCmd}`);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleSubmitBrokenReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDetails.trim() || reportDetails.trim().length < 5) {
      setReportStatusMsg({
        type: 'error',
        text: 'Please enter at least 5 characters describing the issue.',
      });
      return;
    }
    setReportSubmitting(true);
    setReportStatusMsg(null);
    try {
      const reportPayload = {
        slug: app.id,
        appId: app.id,
        appName: app.name,
        reason: reportReason,
        details: reportDetails.trim(),
        distro: reportDistro.trim(),
        architecture: selectedArch,
      };
      let res = await fetch(buildApiUrl('/api/report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPayload),
      }).catch(() => null);

      if (!res || res.status === 404) {
        res = await fetch(buildApiUrl('/api/reports'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportPayload),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setReportStatusMsg({
          type: 'success',
          text: data.message || 'Report submitted.',
        });
        setReportDetails('');
        if (onShowToast) {
          onShowToast('Broken package report submitted.', 'success');
        }
      } else {
        setReportStatusMsg({
          type: 'error',
          text: data.error || 'Could not submit report. Please try again.',
        });
      }
    } catch {
      setReportStatusMsg({
        type: 'error',
        text: 'Network error while submitting report.',
      });
    } finally {
      setReportSubmitting(false);
    }
  };

  const displayVersion = formatAppVersion(app.version);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-detail-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div
        className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="relative px-6 pt-6 pb-5 bg-neutral-950 border-b border-neutral-800 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300">
                {app.simplifiedCategory || app.category}
              </span>
              {communitySubmitted && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs font-medium text-amber-300">
                  <Users className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Community, unreviewed</span>
                </span>
              )}
              {isTrulyVerified ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Verified SHA-256</span>
                </span>
              ) : hasProvidedChecksum ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/30 text-xs font-medium text-sky-300">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Checksum: Provided (unverified)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300">
                  <span>Checksum: Unverified</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onToggleStar && (
                <button
                  type="button"
                  onClick={(e) => onToggleStar(app.id, e)}
                  aria-label={
                    isStarred ? `Saved ${app.name}` : `Save ${app.name} to My Library`
                  }
                  aria-pressed={isStarred}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isStarred
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isStarred ? 'fill-sky-400' : ''}`} />
                  <span>{isStarred ? 'Saved' : 'Save'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close application details"
                className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <AppIcon
                slug={app.iconSlug || app.id}
                name={app.name}
                iconUrl={app.icon}
                brandColor={app.brandColor}
                className="w-14 h-14 rounded-2xl"
              />
              <div>
                <h2
                  id="app-detail-modal-title"
                  className="text-xl sm:text-2xl font-bold text-white tracking-tight"
                >
                  {app.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-1">
                  <span>{app.publisher.name}</span>
                  {sourceRepoUrl && (
                    <>
                      <span>•</span>
                      <a
                        href={sourceRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline"
                      >
                        <GitBranch className="w-3 h-3" aria-hidden="true" />
                        <span>Source Repository</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Download Buttons (Direct Upstream Link) */}
            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              {app.architectures.length > 1 && (
                <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                  <span className="text-[11px] font-mono text-neutral-400 px-2">Arch:</span>
                  {app.architectures.map((arch) => (
                    <button
                      type="button"
                      key={arch}
                      onClick={() => setSelectedArch(arch)}
                      className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                        selectedArch === arch
                          ? 'bg-sky-600 text-white'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {arch}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={activeDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Download ${app.name} AppImage (${selectedArch})`}
                  className="px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>
                    Manual Download ({selectedArch}
                    {app.size ? ` • ${app.size}` : ''})
                  </span>
                </a>

                <button
                  type="button"
                  onClick={(e) => onInstall(app, e, selectedArch)}
                  className="px-3.5 py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  <span>niruvi:// Desktop Install</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body — Only sections with real data are rendered */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Metadata Grid — Only real fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
                <FileCode className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                <span>Latest Version</span>
              </div>
              <p className="text-sm font-semibold text-white font-mono">{displayVersion}</p>
            </div>

            {app.size && (
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
                  <HardDrive className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  <span>Package Size</span>
                </div>
                <p className="text-sm font-semibold text-white font-mono">{app.size}</p>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
                <Cpu className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                <span>Architecture</span>
              </div>
              <p className="text-sm font-semibold text-white font-mono">
                {app.architectures.join(', ')}
              </p>
            </div>

            {app.license && (
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
                  <Scale className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  <span>License</span>
                </div>
                <p className="text-sm font-semibold text-white truncate" title={app.license}>
                  {app.license}
                </p>
              </div>
            )}

            {app.releaseDate && (
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  <span>Release Date</span>
                </div>
                <p className="text-sm font-semibold text-white font-mono">{app.releaseDate}</p>
              </div>
            )}
          </div>

          {/* Description — Only shown if upstream has a real description */}
          {app.description && app.description.trim().length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Description
              </h3>
              <p className="text-neutral-200 leading-relaxed whitespace-pre-line">
                {app.description}
              </p>
            </section>
          )}

          {/* Screenshots — Only shown when upstream provides real screenshots */}
          {app.screenshots && app.screenshots.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                <span>Screenshots</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {app.screenshots.slice(0, 4).map((shot, idx) => {
                  const shotUrl = typeof shot === 'string' ? shot : shot.url;
                  const shotAlt =
                    typeof shot === 'string'
                      ? `${app.name} screenshot ${idx + 1}`
                      : shot.alt || `${app.name} screenshot ${idx + 1}`;
                  return (
                    <a
                      key={`${shotUrl}-${idx}`}
                      href={shotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 hover:border-sky-500/50 transition-colors"
                    >
                      <img
                        src={shotUrl}
                        alt={shotAlt}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                        }}
                        className="w-full h-48 object-contain bg-neutral-950"
                      />
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* Version History — Only shown when real release history exists */}
          {(liveVersionHistory.length > 0 || loadingHistory) && (
            <section className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  <span>Version History (GitHub Releases)</span>
                </h3>
                {app.releasesUrl && (
                  <a
                    href={app.releasesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
                  >
                    <span>All Releases</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                )}
              </div>

              {loadingHistory ? (
                <p className="text-xs text-neutral-400 font-mono">
                  Loading release history from GitHub…
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {liveVersionHistory.map((rel) => {
                    const firstVerifiedAsset = rel.assets.find(
                      (a) => a.verified && isGenuineSha256(a.sha256)
                    );
                    return (
                      <div
                        key={rel.tagName}
                        className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white font-mono">
                              v{rel.version}
                            </span>
                            {rel.releaseDate && (
                              <span className="text-xs text-neutral-400 font-mono">
                                {rel.releaseDate}
                              </span>
                            )}
                            {firstVerifiedAsset && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
                                Verified SHA-256
                              </span>
                            )}
                          </div>
                          {firstVerifiedAsset && (
                            <p className="text-[11px] text-neutral-400 font-mono mt-1 break-all">
                              SHA-256: {firstVerifiedAsset.sha256}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {rel.assets.map((asset) => (
                            <a
                              key={asset.downloadUrl}
                              href={asset.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-mono inline-flex items-center gap-1"
                            >
                              <Download className="w-3 h-3 text-sky-400" aria-hidden="true" />
                              <span>
                                {asset.architecture}
                                {asset.size ? ` (${asset.size})` : ''}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* SHA-256 Checksum Verification Section */}
          <section className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className={`w-4 h-4 ${isTrulyVerified ? 'text-emerald-400' : 'text-neutral-400'}`}
                  aria-hidden="true"
                />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                  SHA-256 Checksum Verification
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {onOpenVerifierWithHash && (
                  <button
                    type="button"
                    onClick={() => onOpenVerifierWithHash(hasCopyableSha ? app.sha256 : '')}
                    className="text-xs font-medium text-sky-400 hover:text-sky-300 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 transition-colors cursor-pointer"
                  >
                    Open Integrity Verifier
                  </button>
                )}
                {hasCopyableSha && (
                  <button
                    type="button"
                    onClick={copySha}
                    className="flex items-center gap-1 text-xs font-mono text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 transition-colors cursor-pointer"
                  >
                    {copiedSha ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedSha ? 'Copied' : 'Copy SHA-256'}</span>
                  </button>
                )}
              </div>
            </div>

            {isTrulyVerified ? (
              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-xs text-emerald-400 break-all select-all">
                {app.sha256}
              </div>
            ) : hasProvidedChecksum ? (
              <div className="space-y-1.5">
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-xs text-sky-300 break-all select-all">
                  {app.sha256}
                </div>
                <p className="text-xs text-neutral-300">
                  Checksum status: <span className="font-mono text-sky-300">provided</span> (supplied by the community submitter; verify locally with <code className="text-neutral-200 font-mono">sha256sum</code> before execution).
                </p>
              </div>
            ) : (
              <p className="text-xs text-neutral-300 font-mono">
                Checksum status: <span className="text-amber-300">unverified</span>. No SHA-256 digest was provided for this package. Verify the downloaded file locally with <code className="text-neutral-200">sha256sum</code> before execution.
              </p>
            )}
          </section>

          {/* Terminal Run Instructions */}
          <section className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" aria-hidden="true" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                  Make Executable &amp; Run
                </h3>
              </div>
              <button
                type="button"
                onClick={copyCmd}
                className="flex items-center gap-1 text-xs font-mono text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 transition-colors cursor-pointer"
              >
                {copiedCmd ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedCmd ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-xs text-neutral-200 overflow-x-auto">
              <code>
                {verifyCmd}
                {'\n'}
                {chmodCmd}
              </code>
            </pre>
            <div className="text-[11px] text-neutral-400 font-mono truncate">
              Protocol URI: <span className="text-neutral-300">{protocolUrl}</span>
            </div>
          </section>

          {/* Links & Report Broken Package */}
          <div className="pt-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {app.homepageUrl && (
                <a
                  href={app.homepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Project Website</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
              {sourceRepoUrl && (
                <a
                  href={sourceRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Source Code</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
              {app.releasesUrl && (
                <a
                  href={app.releasesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Upstream Releases</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowReportForm((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-amber-300 border border-neutral-800 text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Report Broken Package</span>
            </button>
          </div>

          {showReportForm && (
            <form
              onSubmit={handleSubmitBrokenReport}
              className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span>Report Broken AppImage ({app.name})</span>
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Issue Type</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white"
                  >
                    <option value="Broken download link (404)">Broken download link (404)</option>
                    <option value="SHA-256 checksum mismatch">SHA-256 checksum mismatch</option>
                    <option value="Outdated version">Outdated release version</option>
                    <option value="Fails to launch on Linux">Fails to launch on Linux</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Linux Distribution (optional)
                  </label>
                  <input
                    type="text"
                    value={reportDistro}
                    onChange={(e) => setReportDistro(e.target.value)}
                    placeholder="e.g. Ubuntu 24.04, Fedora 41, Arch"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Details</label>
                <textarea
                  rows={2}
                  required
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe the broken link or checksum issue..."
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white"
                />
              </div>
              {reportStatusMsg && (
                <p
                  className={`text-xs ${
                    reportStatusMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {reportStatusMsg.text}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportForm(false)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-300 border border-neutral-800 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                >
                  {reportSubmitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
