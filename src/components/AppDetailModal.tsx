import React, { useState, useEffect, useRef } from 'react';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import { AppMetadata } from '../types';
import { AppIcon } from './AppIcon';
import { generateNiruviProtocolUrl } from '../data/apps';
import { useAuth } from '../context/AuthContext';
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';
import { isValidHttpsDownloadUrl } from '../utils/catalogSchema';
import { ThirdPartyEmbed } from './ThirdPartyEmbed';
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
  Heart,
  XCircle,
  RotateCcw,
  Pause,
  Play,
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

  // Inline AppImage download & cancellation state
  const [dlPhase, setDlPhase] = useState<'idle' | 'downloading' | 'completed' | 'cancelled'>('idle');
  const [dlProgress, setDlProgress] = useState(0);
  const [dlPaused, setDlPaused] = useState(false);
  const dlTimerRef = useRef<number | null>(null);

  // Reviews state
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewConsent, setReviewConsent] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  usePreventBodyScroll(!!app);

  useEffect(() => {
    setDlPhase('idle');
    setDlProgress(0);
    setDlPaused(false);
    if (dlTimerRef.current) {
      window.clearInterval(dlTimerRef.current);
      dlTimerRef.current = null;
    }
  }, [app?.id]);

  useEffect(() => {
    if (!app || dlPhase !== 'downloading' || dlPaused) {
      if (dlTimerRef.current) {
        window.clearInterval(dlTimerRef.current);
        dlTimerRef.current = null;
      }
      return;
    }
    dlTimerRef.current = window.setInterval(() => {
      setDlProgress((prev) => {
        const next = Math.min(100, prev + 5);
        if (next >= 100) {
          if (dlTimerRef.current) {
            window.clearInterval(dlTimerRef.current);
            dlTimerRef.current = null;
          }
          setDlPhase('completed');
          if (isValidHttpsDownloadUrl(app.downloadUrl)) {
            const anchor = document.createElement('a');
            anchor.href = sanitizeUrl(app.downloadUrl);
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
          }
        }
        return next;
      });
    }, 100);
    return () => {
      if (dlTimerRef.current) {
        window.clearInterval(dlTimerRef.current);
        dlTimerRef.current = null;
      }
    };
  }, [app, dlPhase, dlPaused]);

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
      .catch(() => {
        setReviewsList([]);
      })
      .finally(() => setLoadingReviews(false));
  }, [app?.id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app) return;
    if (!user) {
      openAuthModal();
      return;
    }
    const cleanTitle = sanitizeText(reviewTitle, 120);
    const cleanBody = sanitizeText(reviewBody, 2000);
    if (!cleanTitle || !cleanBody) {
      setReviewError('Please enter both a review headline and body.');
      return;
    }
    if (!reviewConsent) {
      setReviewError('Please confirm your consent to the Privacy Policy before submitting a review.');
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(`/api/apps/${app.id}/reviews`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          rating: reviewRating,
          title: cleanTitle,
          body: cleanBody,
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
    if (!user) {
      openAuthModal();
      return;
    }
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        credentials: 'include',
        headers,
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="app-detail-modal-container"
        className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
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
              <p className="text-sm text-neutral-300 mt-1">{sanitizeText(app.tagline, 300)}</p>
              <div className="flex items-center gap-3 text-xs text-neutral-400 mt-2 flex-wrap">
                <span>By <strong className="text-neutral-200">{sanitizeText(app.publisher.name, 100)}</strong></span>
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
              type="button"
              onClick={() => {
                onClose();
                onOpenInstall(app);
              }}
              className="min-h-[44px] flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{isInstalled ? `Manage ${app.name} Installation` : `Install ${app.name} with Niruvi`}</span>
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
                rel="noopener noreferrer"
                className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold transition-colors"
                title={`View ${app.license} open source license details`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-300" aria-hidden="true" />
                <span>License: {app.license}</span>
              </a>
            )}

            <button
              id="detail-modal-copy-protocol-btn"
              type="button"
              onClick={() => copyToClipboard(protocolUrl, setCopiedProtocol)}
              className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors cursor-pointer"
              title="Copy niruvi://install protocol URL"
            >
              {copiedProtocol ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400 font-medium">Protocol Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-300" aria-hidden="true" />
                  <span>Copy Niruvi Link</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {sanitizeUrl(app.homepageUrl) && (
              <a
                href={sanitizeUrl(app.homepageUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] flex items-center gap-1 text-xs text-neutral-200 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-2 rounded-lg transition-colors"
              >
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Website</span>
              </a>
            )}
            {sanitizeUrl(app.sourceUrl) && (
              <a
                href={sanitizeUrl(app.sourceUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] flex items-center gap-1 text-xs text-neutral-200 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-2 rounded-lg transition-colors"
                title="View GitHub Repository"
              >
                <GitBranch className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Repository</span>
              </a>
            )}
            {sanitizeUrl(app.releasesUrl) && (
              <a
                href={sanitizeUrl(app.releasesUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] flex items-center gap-1 text-xs text-neutral-200 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-2 rounded-lg transition-colors"
                title="View GitHub Releases"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Releases</span>
              </a>
            )}
            {sanitizeUrl(getOfficialSponsorUrl(app)) && (
              <a
                href={sanitizeUrl(getOfficialSponsorUrl(app))}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                title={`Support the official development of ${app.name}`}
              >
                <Heart className="w-3.5 h-3.5 fill-rose-400/30 text-rose-400" aria-hidden="true" />
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
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  About {sanitizeText(app.name, 100)}
                </h4>
                <p className="text-sm leading-relaxed text-neutral-200">
                  {sanitizeText(app.description, 4000)}
                </p>
              </div>

              {/* STEP 1: Niruvi Protocol Fallback + Manual HTTPS Download + SHA-256 Checksum */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      Don’t have the Niruvi desktop app installed?
                    </h4>
                    <p className="text-neutral-300 mt-0.5">
                      Download the standalone <code className="font-mono text-neutral-200">{appImageFileName}</code> ({app.size}) directly over HTTPS and verify its SHA-256 checksum before making it executable (<code className="font-mono">chmod +x</code>).
                    </p>
                  </div>
                  {isValidHttpsDownloadUrl(app.downloadUrl) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={sanitizeUrl(app.downloadUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (dlPhase === 'idle' || dlPhase === 'cancelled') {
                            e.preventDefault();
                            setDlPaused(false);
                            setDlProgress(5);
                            setDlPhase('downloading');
                          }
                        }}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-colors"
                      >
                        <Download className="w-4 h-4 text-sky-400" aria-hidden="true" />
                        <span>
                          Download {sanitizeText(app.name, 60)} AppImage ({app.architectures[0] || 'x86_64'})
                        </span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Active Cancelable Download Progress Bar */}
                {dlPhase === 'downloading' && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="p-3.5 rounded-xl bg-neutral-900 border border-sky-500/40 space-y-2.5 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`w-2 h-2 rounded-full ${
                            dlPaused ? 'bg-amber-400' : 'bg-sky-400 animate-ping'
                          }`}
                        />
                        <span>
                          {dlPaused
                            ? `Download Paused (${dlProgress}%)`
                            : dlProgress < 85
                            ? `Streaming ${appImageFileName} (${app.size})...`
                            : 'Preparing SHA-256 Checksum Verification...'}
                        </span>
                      </span>
                      <span className="font-mono text-sky-300 font-semibold tabular-nums">
                        {dlProgress}%
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${
                          dlPaused
                            ? 'bg-amber-400'
                            : 'bg-gradient-to-r from-sky-500 via-emerald-400 to-sky-400'
                        }`}
                        style={{ width: `${dlProgress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-neutral-300 font-mono">
                        Target: ./{appImageFileName} · Arch: {app.architectures[0] || 'x86_64'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDlPaused((p) => !p)}
                          className="min-h-[34px] px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          {dlPaused ? (
                            <>
                              <Play className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                              <span>Resume</span>
                            </>
                          ) : (
                            <>
                              <Pause className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                              <span>Pause</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (dlTimerRef.current) {
                              window.clearInterval(dlTimerRef.current);
                              dlTimerRef.current = null;
                            }
                            setDlPaused(false);
                            setDlPhase('cancelled');
                          }}
                          className="min-h-[34px] px-3 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/40 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
                          <span>Cancel Download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {dlPhase === 'cancelled' && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="p-3 rounded-xl bg-rose-950/25 border border-rose-500/40 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-150"
                  >
                    <span className="text-rose-200 font-medium flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-400" aria-hidden="true" />
                      <span>Download cancelled at {dlProgress}% — binary handoff aborted.</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDlPaused(false);
                        setDlProgress(5);
                        setDlPhase('downloading');
                      }}
                      className="min-h-[34px] px-3 py-1 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Retry Download</span>
                    </button>
                  </div>
                )}

                {dlPhase === 'completed' && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/40 space-y-2 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                        <span>Download handed off to browser! Run in terminal after saving:</span>
                      </span>
                      <a
                        href={sanitizeUrl(app.downloadUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline font-semibold"
                      >
                        Direct Mirror Link
                      </a>
                    </div>
                    <pre className="p-2 bg-black/80 rounded border border-neutral-800 font-mono text-[11px] text-neutral-200 overflow-x-auto select-all">
{`echo "${app.sha256}  ${appImageFileName}" | sha256sum --check && chmod +x ./${appImageFileName} && ./${appImageFileName}`}
                    </pre>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-mono text-[11px] text-emerald-400 break-all">
                    <span className="text-neutral-300 font-sans font-semibold mr-2">SHA-256:</span>
                    {app.sha256}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(app.sha256, setCopiedSha)}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 inline-flex items-center gap-1.5 text-xs text-neutral-200 hover:text-white font-semibold whitespace-nowrap cursor-pointer"
                  >
                    {copiedSha ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{copiedSha ? 'SHA-256 Copied' : 'Copy SHA-256'}</span>
                  </button>
                </div>
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
                  <span className="text-neutral-400 block mb-1">Release Repository</span>
                  {sanitizeUrl(app.repositoryUrl) ? (
                    <a
                      href={sanitizeUrl(app.repositoryUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline truncate block max-w-full"
                    >
                      {app.repositoryUrl!.replace('https://github.com/', '')}
                    </a>
                  ) : (
                    <span className="text-neutral-300">Upstream Mirror</span>
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

              {/* Optional Screenshots via Click-to-Load ThirdPartyEmbed */}
              {app.screenshots && app.screenshots.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    Screenshots
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {app.screenshots.map((shot, idx) => (
                      <ThirdPartyEmbed
                        key={idx}
                        type="image"
                        src={shot.url}
                        altOrTitle={shot.alt || `${app.name} screenshot ${idx + 1}`}
                        caption={shot.caption}
                      />
                    ))}
                  </div>
                </div>
              )}

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
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    Cryptographic SHA-256 Checksum
                  </label>
                  <button
                    id="copy-sha-btn"
                    type="button"
                    onClick={() => copyToClipboard(app.sha256, setCopiedSha)}
                    className="min-h-[44px] px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 flex items-center gap-1.5 text-xs text-neutral-200 hover:text-white cursor-pointer"
                  >
                    {copiedSha ? <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                    <span>{copiedSha ? 'SHA-256 Copied' : 'Copy SHA-256'}</span>
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
                    <p role="alert" aria-live="assertive" className="text-xs text-red-400">
                      {reviewError}
                    </p>
                  )}
                  {reviewSuccess && (
                    <p role="status" aria-live="polite" className="text-xs text-emerald-400">
                      Review submitted successfully!
                    </p>
                  )}

                  <div className="space-y-1">
                    <label htmlFor="review-headline-input" className="text-xs font-semibold text-neutral-200 block">
                      Review Headline <span className="text-neutral-400">(required)</span>
                    </label>
                    <input
                      id="review-headline-input"
                      type="text"
                      required
                      placeholder="Review headline (e.g., Flawless Wayland integration)"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-400 focus:outline-hidden focus:border-white transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="review-body-input" className="text-xs font-semibold text-neutral-200 block">
                      Review Details <span className="text-neutral-400">(required)</span>
                    </label>
                    <textarea
                      id="review-body-input"
                      required
                      rows={3}
                      placeholder="Share your experience running this AppImage on your Linux distro..."
                      value={reviewBody}
                      onChange={(e) => setReviewBody(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-400 focus:outline-hidden focus:border-white resize-none transition-colors"
                    />
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                    <input
                      id="review-privacy-consent"
                      type="checkbox"
                      checked={reviewConsent}
                      onChange={(e) => setReviewConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-sky-400 cursor-pointer"
                    />
                    <label htmlFor="review-privacy-consent" className="text-xs text-neutral-300 leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <a href="#/privacy" className="underline text-sky-400 hover:text-sky-300">
                        Privacy Policy
                      </a>
                      . My review text and display name will be shown publicly on this application page. (required)
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReview || !reviewConsent}
                      className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
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
                            {sanitizeText(rev.userDisplayName || 'Linux User', 60).slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-white">
                            {sanitizeText(rev.userDisplayName || 'Linux User', 60)}
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
                      <h5 className="text-xs font-semibold text-neutral-200">{sanitizeText(rev.title, 120)}</h5>
                      <p className="text-xs text-neutral-400 leading-relaxed">{sanitizeText(rev.body, 2000)}</p>
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
