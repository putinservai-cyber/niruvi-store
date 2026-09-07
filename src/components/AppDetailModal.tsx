import React, { useState, useEffect } from 'react';
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

interface AppDetailModalProps {
  app: AppMetadata | null;
  onClose: () => void;
  onOpenInstall: (app: AppMetadata) => void;
  isInstalled?: boolean;
  onOpenSponsor?: (app: AppMetadata) => void;
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
  onOpenSponsor
}) => {
  if (!app) return null;

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
    if (!app) return;
    setLoadingReviews(true);
    fetch(`/api/apps/${app.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.reviews) {
          setReviewsList(data.reviews);
        }
      })
      .catch((err) => console.error('Error fetching app reviews:', err))
      .finally(() => setLoadingReviews(false));
  }, [app]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const protocolUrl = generateNiruviProtocolUrl(app);
  const appImageFileName = `${app.id}-${app.version}-x86_64.AppImage`;
  const cliCommand = `niruvi install ${app.id}`;

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="app-detail-modal-container"
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800 bg-slate-850">
          <div className="flex items-start gap-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
              style={{ backgroundColor: `${app.brandColor || '#3B82F6'}20`, border: `1px solid ${app.brandColor || '#3B82F6'}40` }}
            >
              <AppIcon slug={app.iconSlug} className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">{app.name}</h2>
                {app.publisher.verified && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Publisher
                  </span>
                )}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  v{app.version}
                </span>
                {isInstalled && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Installed
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-300 mt-1">{app.tagline}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 flex-wrap">
                <span>By <strong className="text-slate-200">{app.publisher.name}</strong></span>
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
            className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-slate-800/40 p-4 px-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="detail-modal-install-btn"
              onClick={() => {
                onClose();
                onOpenInstall(app);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all hover:scale-[1.01]"
            >
              <Download className="w-4 h-4" />
              <span>{isInstalled ? 'Manage Installation' : 'Install Application'}</span>
            </button>

            <button
              id="detail-modal-copy-protocol-btn"
              onClick={() => copyToClipboard(protocolUrl, setCopiedProtocol)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
              title="Copy niruvi://install protocol URL"
            >
              {copiedProtocol ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Protocol Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
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
                className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg transition-colors"
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
                className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg transition-colors"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Source</span>
              </a>
            )}
            {onOpenSponsor && (
              <button
                onClick={() => onOpenSponsor(app)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                title="Support developer via Ko-fi (@putinservai) or Indian UPI"
              >
                <Heart className="w-3.5 h-3.5 fill-rose-400/30 text-rose-400" />
                <span>Support (Ko-fi)</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-6 px-6 pt-3 border-b border-slate-800 text-xs font-medium text-slate-400">
          <button
            id="tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Overview & Features
          </button>
          <button
            id="tab-security"
            onClick={() => setActiveTab('security')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
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
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
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
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
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
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              Changelog
            </button>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 flex-1">
          {activeTab === 'overview' && (
            <>
              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">About {app.name}</h4>
                <p className="text-sm leading-relaxed text-slate-200">
                  {app.description}
                </p>
              </div>

              {/* Key Features List */}
              {app.features && app.features.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Key Features</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {app.features.map((feat, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">Architectures</span>
                  <div className="flex gap-1">
                    {app.architectures.map(arch => (
                      <span key={arch} className="px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-mono border border-slate-700">
                        {arch}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">License</span>
                  <span className="text-slate-200 font-medium">{app.license}</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Category</span>
                  <span className="text-slate-200 font-medium">{app.category}</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Package Format</span>
                  <span className="text-emerald-400 font-medium">Standalone Linux AppImage</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Verified Downloads</span>
                  <span className="text-slate-200 font-medium">{app.downloadsCount.toLocaleString()}</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Host Requirements</span>
                  <span className="text-slate-200">{app.requirements || 'glibc 2.28+, FUSE 2/3'}</span>
                </div>
              </div>

              {/* Tags */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {app.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-700/60">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/50 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-semibold text-blue-200 text-sm">Niruvi Security Verification</h4>
                  <p className="text-slate-300">
                    Niruvi verifies cryptographic SHA-256 checksums automatically before staging and executing AppImages on your Linux host.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Cryptographic SHA-256 Checksum
                  </label>
                  <button
                    id="copy-sha-btn"
                    onClick={() => copyToClipboard(app.sha256, setCopiedSha)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    {copiedSha ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSha ? 'Copied' : 'Copy Hash'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 break-all select-all">
                  {app.sha256}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2 text-xs">
                <h5 className="font-semibold text-white">Manual Verification in Terminal:</h5>
                <pre className="p-2.5 bg-slate-950 rounded border border-slate-800/80 font-mono text-slate-300 overflow-x-auto">
{`echo "${app.sha256}  ${appImageFileName}" | sha256sum --check`}
                </pre>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  AppImages execute with user privileges. Always ensure your host system has <code>fuse</code> or <code>libfuse2/libfuse3</code> installed.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'cli' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                You can install and run this application directly using the Niruvi CLI or standard Linux terminal commands.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Via Niruvi CLI:</span>
                  <button
                    onClick={() => copyToClipboard(cliCommand, setCopiedCli)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCli ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-blue-300 select-all overflow-x-auto">
{cliCommand}
                </pre>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">Standard Linux Standalone Run:</span>
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 select-all overflow-x-auto">
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-extrabold text-white flex items-center gap-1.5 font-mono">
                    <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
                    <span>{app.rating.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">Community Review Score</span>
                    <span className="text-[11px] text-slate-400">
                      Based on verified Linux community installs and reviews
                    </span>
                  </div>
                </div>

                {!user && (
                  <button
                    onClick={openAuthModal}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-3 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 transition"
                  >
                    Sign in to Write a Review
                  </button>
                )}
              </div>

              {/* Review Submission Form */}
              {user && (
                <form onSubmit={handleReviewSubmit} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <MessageSquarePlus className="w-4 h-4 text-blue-400" />
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
                                : 'text-slate-600'
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
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                  />

                  <textarea
                    required
                    rows={3}
                    placeholder="Share your experience running this AppImage on your Linux distro..."
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 resize-none"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition disabled:opacity-50"
                    >
                      {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit Review'}
                    </button>
                  </div>
                </form>
              )}

              {/* Reviews List */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  User Feedback ({reviewsList.length})
                </h4>

                {loadingReviews ? (
                  <div className="flex items-center justify-center p-6 text-slate-400 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading community reviews from Cloud SQL...
                  </div>
                ) : reviewsList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No community reviews yet. Be the first to share your thoughts!
                  </div>
                ) : (
                  reviewsList.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
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
                                  : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <h5 className="text-xs font-semibold text-slate-200">{rev.title}</h5>
                      <p className="text-xs text-slate-400 leading-relaxed">{rev.body}</p>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                        <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                        <button
                          onClick={() => handleHelpfulVote(rev.id)}
                          className="flex items-center gap-1 text-slate-400 hover:text-blue-400 transition"
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
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                What's new in v{app.version}
              </h4>
              <ul className="space-y-2 text-xs">
                {app.changelog.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
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
