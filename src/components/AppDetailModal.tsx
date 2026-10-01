import React, { useState, useEffect } from 'react';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import { AppMetadata } from '../types';
import { AppIcon } from './AppIcon';
import { generateNiruviProtocolUrl } from '../data/apps';
import { useAuth } from '../context/AuthContext';
import {
  X,
  CheckCircle2,
  Download,
  ExternalLink,
  GitBranch,
  Globe,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  HardDrive,
  Terminal,
  AlertCircle,
  Sparkles,
  Layers,
  Cpu,
  Star,
  ThumbsUp,
  MessageSquarePlus,
  Loader2,
  Heart
} from 'lucide-react';

const getOfficialSponsorUrl = (app: AppMetadata): string | null => {
  const slug = app.id.toLowerCase().replace('app_', '');
  
  // Hardcoded official donation pages for catalog apps to make it work really!
  const officialDonations: Record<string, string> = {
    vlc: 'https://www.videolan.org/contribute.html',
    joplin: 'https://joplinapp.org/donate/',
    freetube: 'https://freetubeapp.io/#donate',
    libreoffice: 'https://www.libreoffice.org/donate/',
    audacity: 'https://www.audacityteam.org/donate/',
    blender: 'https://fund.blender.org/',
    gimp: 'https://www.gimp.org/donating/',
    kdenlive: 'https://kdenlive.org/en/donate/',
    handbrake: 'https://handbrake.fr/donation.php',
    inkscape: 'https://inkscape.org/support-us/donate/',
    qbittorrent: 'https://www.qbittorrent.org/donate',
    vscodium: 'https://vscodium.com/#support',
    keepassxc: 'https://keepassxc.org/donate/',
  };

  if (officialDonations[slug]) {
    return officialDonations[slug];
  }

  // Fallback to GitHub sponsors if it's a github source url
  if (app.sourceUrl && app.sourceUrl.includes('github.com')) {
    return `${app.sourceUrl}/sponsors`;
  }

  return app.homepageUrl || app.sourceUrl || null;
};

interface AppDetailModalProps {
  app: AppMetadata | null;
  onClose: () => void;
  onOpenInstall: (app: AppMetadata) => void;
  isInstalled?: boolean;
  onOpenSponsor?: (app: AppMetadata) => void;
  onOpenPayment?: (app: AppMetadata) => void;
}

interface ReviewItem {
  id: string;
  rating: number;
  title: string;
  body: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  userDisplayName?: string;
  userAvatarUrl?: string;
}

export const AppDetailModal: React.FC<AppDetailModalProps> = ({ 
  app, 
  onClose,
  onOpenInstall,
  isInstalled = false,
  onOpenSponsor,
  onOpenPayment
}) => {
  const { user, token, openAuthModal } = useAuth();
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'cli' | 'changelog' | 'reviews'>('overview');

  // Reviews state
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (!app) {
      setReviewsList([]);
      return;
    }
    setLoadingReviews(true);
    fetch(`/api/apps/${app.id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.reviews)) {
          setReviewsList(data.reviews);
        } else {
          setReviewsList([]);
        }
      })
      .catch((err) => {
        console.warn('Fallback fetching app reviews locally:', err);
        setReviewsList([]);
      })
      .finally(() => setLoadingReviews(false));
  }, [app?.id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app) return;
    if (!token) {
      openAuthModal();
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/apps/${app.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: reviewRating,
          title: reviewTitle,
          body: reviewBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }
      setReviewsList((prev) => [data.review, ...prev]);
      setReviewTitle('');
      setReviewBody('');
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err: any) {
      setReviewError(err?.message || 'Error submitting review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleHelpfulVote = async (reviewId: string) => {
    if (!token) {
      openAuthModal();
      return;
    }
    try {
      await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isHelpful: true }),
      });
      setReviewsList((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r))
      );
    } catch (err) {
      console.error('Vote error:', err);
    }
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!app) return null;

  const protocolUrl = generateNiruviProtocolUrl(app);
  const appImageFileName = `${app.id}-${app.version}-x86_64.AppImage`;
  const cliCommand = `niruvi install ${app.id}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-y-auto bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-detail-title"
    >
      <div 
        id="app-detail-modal-container"
        className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-start gap-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center bg-neutral-800/80 border border-neutral-700/60 p-2 shadow-lg flex-shrink-0 overflow-hidden"
            >
              <AppIcon 
                slug={app.iconSlug} 
                iconUrl={app.icon} 
                name={app.name} 
                brandColor={app.brandColor} 
                className="w-12 h-12" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="app-detail-title" className="text-xl font-bold text-white tracking-tight">{app.name}</h2>
                {app.publisher.verified && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Publisher
                  </span>
                )}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono">
                  v{app.version}
                </span>
                {app.sourceType === 'Official' ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    Official Upstream
                  </span>
                ) : app.sourceType === 'Community' ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1">
                    Community Builder
                  </span>
                ) : null}
                {app.downloadUrl.toLowerCase().includes('github.com') && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-800/80 text-neutral-200 border border-neutral-700 flex items-center gap-1">
                    GitHub Release
                  </span>
                )}
                {app.downloadUrl.toLowerCase().includes('gitlab.com') && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-950/40 text-orange-400 border border-orange-900/30 flex items-center gap-1">
                    Collected from GitLab
                  </span>
                )}
                {app.isUserAdded && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-900/30 flex items-center gap-1">
                    Community Contributed
                  </span>
                )}
                {isInstalled && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Installed
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-300 mt-1">{app.tagline}</p>
              <div className="flex items-center gap-3 text-xs text-neutral-400 mt-2 flex-wrap">
                <span>By <strong className="text-neutral-200">{app.publisher.name}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Released {app.releaseDate}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5" />
                  {app.size}
                </span>
              </div>
            </div>
          </div>

          <button
            id="close-detail-modal-btn"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-neutral-900/40 p-4 px-6 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="detail-modal-install-btn"
              onClick={() => {
                onClose();
                onOpenInstall(app);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm shadow-md transition-all hover:scale-[1.01]"
            >
              <Download className="w-4 h-4" />
              <span>{isInstalled ? 'Manage Installation' : 'Install Application'}</span>
            </button>

            {app.license && (
              <a
                id="detail-modal-license-btn"
                href={
                  app.licenseCategory === 'Proprietary'
                    ? '#'
                    : `https://spdx.org/licenses/${app.license.replace('-only', '').replace('-or-later', '')}.html`
                }
                target={app.licenseCategory === 'Proprietary' ? undefined : '_blank'}
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-semibold transition-colors"
                title={`View ${app.license} open source license details`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                <span>License: {app.license}</span>
              </a>
            )}

            <button
              id="detail-modal-copy-protocol-btn"
              onClick={() => copyToClipboard(protocolUrl, setCopiedProtocol)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors"
              title="Copy niruvi://install protocol URL"
            >
              {copiedProtocol ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Protocol Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Copy Niruvi Link</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {app.homepageUrl && (
              <a
                href={app.homepageUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-2 rounded-lg transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Website</span>
              </a>
            )}
            {app.sourceUrl && (
              <a
                href={app.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-2 rounded-lg transition-colors"
                title="View GitHub Repository"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Repository</span>
              </a>
            )}
            {app.releasesUrl && (
              <a
                href={app.releasesUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-2 rounded-lg transition-colors"
                title="View GitHub Releases"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Releases</span>
              </a>
            )}
            {getOfficialSponsorUrl(app) && (
              <a
                href={getOfficialSponsorUrl(app)!}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                title={`Support the official development of ${app.name}`}
              >
                <Heart className="w-3.5 h-3.5 fill-rose-400/30 text-rose-400" />
                <span>Support Developer</span>
              </a>
            )}
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-6 px-6 pt-3 border-b border-neutral-800 text-xs font-medium text-neutral-400">
          <button
            id="tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-white text-white font-semibold'
                : 'border-transparent hover:text-neutral-200'
            }`}
          >
            Overview & Features
          </button>
          <button
            id="tab-security"
            onClick={() => setActiveTab('security')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-white text-white font-semibold'
                : 'border-transparent hover:text-neutral-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Security & SHA-256
          </button>
          <button
            id="tab-cli"
            onClick={() => setActiveTab('cli')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'cli'
                ? 'border-white text-white font-semibold'
                : 'border-transparent hover:text-neutral-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Terminal & CLI
          </button>
          <button
            id="tab-reviews"
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'border-white text-white font-semibold'
                : 'border-transparent hover:text-neutral-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            Reviews ({reviewsList.length})
          </button>
          {app.changelog && (
            <button
              id="tab-changelog"
              onClick={() => setActiveTab('changelog')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'changelog'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent hover:text-neutral-200'
              }`}
            >
              Changelog
            </button>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-neutral-300 flex-1">
          {activeTab === 'overview' && (
            <>
              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">About {app.name}</h4>
                <p className="text-sm leading-relaxed text-neutral-200">
                  {app.description}
                </p>
              </div>

              {/* Key Features List */}
              {app.features && app.features.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Key Features</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {app.features.map((feat, i) => (
                      <div key={i} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
                <div>
                  <span className="text-neutral-500 block mb-1">Architectures</span>
                  <div className="flex gap-1">
                    {app.architectures.map(arch => (
                      <span key={arch} className="px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 font-mono border border-neutral-800">
                        {arch}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-neutral-500 block mb-1">License</span>
                  <span className="text-neutral-200 font-medium">{app.license}</span>
                </div>

                <div>
                  <span className="text-neutral-500 block mb-1">Category</span>
                  <span className="text-neutral-200 font-medium">{app.category}</span>
                </div>

                <div>
                  <span className="text-neutral-500 block mb-1">Package Format</span>
                  <span className="text-emerald-400 font-medium">Standalone Linux AppImage</span>
                </div>

                <div>
                  <span className="text-neutral-500 block mb-1">Trust & Verification</span>
                  <span className={`font-medium ${
                    (app.trustTier === 'Official Developer' || (!app.trustTier && app.sourceType === 'Official'))
                      ? 'text-blue-400'
                      : (app.trustTier === 'Unverified Community' ? 'text-neutral-400' : 'text-orange-400')
                  }`}>
                    {app.trustTier || (app.sourceType === 'Official' ? 'Official Developer' : 'Verified Community')}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500 block mb-1">Release Repository</span>
                  {app.repositoryUrl ? (
                    <a
                      href={app.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline truncate block max-w-full"
                    >
                      {app.repositoryUrl.replace('https://github.com/', '')}
                    </a>
                  ) : (
                    <span className="text-neutral-400">Upstream Mirror</span>
                  )}
                </div>

                <div>
                  <span className="text-neutral-500 block mb-1">Verified Downloads</span>
                  <span className="text-neutral-200 font-medium">{app.downloadsCount.toLocaleString()}</span>
                </div>

                <div>
                  <span className="text-neutral-500 block mb-1">Host Requirements</span>
                  <span className="text-neutral-200">{app.requirements || 'glibc 2.28+, FUSE 2/3'}</span>
                </div>
              </div>

              {/* Tags */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block mb-2">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {app.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-md bg-neutral-950 text-neutral-300 text-xs border border-neutral-800">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-semibold text-white text-sm">Niruvi Security Verification</h4>
                  <p className="text-neutral-300">
                    Niruvi verifies cryptographic SHA-256 checksums automatically before staging and executing AppImages on your Linux host.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Cryptographic SHA-256 Checksum
                  </label>
                  <button
                    id="copy-sha-btn"
                    onClick={() => copyToClipboard(app.sha256, setCopiedSha)}
                    className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white"
                  >
                    {copiedSha ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSha ? 'Copied' : 'Copy Hash'}</span>
                  </button>
                </div>
                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-xs text-emerald-400 break-all select-all">
                  {app.sha256}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                <h5 className="font-semibold text-white">Manual Verification in Terminal:</h5>
                <pre className="p-2.5 bg-black rounded border border-neutral-800 font-mono text-neutral-300 overflow-x-auto">
{`echo "${app.sha256}  ${appImageFileName}" | sha256sum --check`}
                </pre>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  AppImages execute with user privileges. Always ensure your host system has <code className="text-neutral-200">fuse</code> or <code className="text-neutral-200">libfuse2/libfuse3</code> installed.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'cli' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400">
                You can install and run this application directly using the Niruvi CLI or standard Linux terminal commands.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300">Via Niruvi CLI:</span>
                  <button
                    onClick={() => copyToClipboard(cliCommand, setCopiedCli)}
                    className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white"
                  >
                    {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCli ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-xs text-neutral-200 select-all overflow-x-auto">
{cliCommand}
                </pre>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-neutral-300">Standard Linux Standalone Run:</span>
                <pre className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-xs text-neutral-300 select-all overflow-x-auto">
{`# 1. Download AppImage
curl -L -O "${app.downloadUrl}"

# 2. Grant executable permission
chmod +x "${appImageFileName}"

# 3. Launch application
./"${appImageFileName}"`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Reviews Summary */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-extrabold text-white flex items-center gap-1.5 font-mono">
                    <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
                    <span>{app.rating.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">Community Review Score</span>
                    <span className="text-[11px] text-neutral-400">
                      Based on verified Linux community installs and reviews
                    </span>
                  </div>
                </div>

                {!user && (
                  <button
                    onClick={openAuthModal}
                    className="text-xs text-neutral-200 hover:text-white font-semibold px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition"
                  >
                    Sign in to Write a Review
                  </button>
                )}
              </div>

              {/* Review Submission Form */}
              {user && (
                <form onSubmit={handleReviewSubmit} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <MessageSquarePlus className="w-4 h-4 text-neutral-300" />
                      Write a Community Review
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className="p-1 focus:outline-hidden"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              star <= reviewRating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-neutral-700'
                            } transition`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {reviewError && (
                    <p className="text-xs text-red-400">{reviewError}</p>
                  )}
                  {reviewSuccess && (
                    <p className="text-xs text-emerald-400">Review submitted successfully to Cloud SQL!</p>
                  )}

                  <input
                    type="text"
                    required
                    placeholder="Review headline (e.g., Flawless Wayland integration)"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-white transition-colors"
                  />

                  <textarea
                    required
                    rows={3}
                    placeholder="Share your experience running this AppImage on your Linux distro..."
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-white resize-none transition-colors"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition disabled:opacity-50"
                    >
                      {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit Review'}
                    </button>
                  </div>
                </form>
              )}

              {/* Reviews List */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  User Feedback ({reviewsList.length})
                </h4>

                {loadingReviews ? (
                  <div className="flex items-center justify-center p-6 text-neutral-400 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading community reviews from Cloud SQL...
                  </div>
                ) : reviewsList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                    No community reviews yet. Be the first to share your thoughts!
                  </div>
                ) : (
                  reviewsList.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-white">
                            {(rev.userDisplayName || 'Linux User').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-white">
                            {rev.userDisplayName || 'Linux User'}
                          </span>
                          {rev.isVerifiedPurchase && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Verified Download
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= rev.rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-neutral-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <h5 className="text-xs font-semibold text-neutral-200">{rev.title}</h5>
                      <p className="text-xs text-neutral-400 leading-relaxed">{rev.body}</p>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-500">
                        <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                        <button
                          onClick={() => handleHelpfulVote(rev.id)}
                          className="flex items-center gap-1 text-neutral-400 hover:text-white transition"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>Helpful ({rev.helpfulCount})</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'changelog' && app.changelog && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                What's new in v{app.version}
              </h4>
              <ul className="space-y-2 text-xs">
                {app.changelog.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-neutral-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
