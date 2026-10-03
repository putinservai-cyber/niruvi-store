import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchPublicMarketplaceApp,
  fetchAppReviews,
  upsertAppReview,
  deleteAppReview,
  recordAppDownload,
  syncLibraryBookmarkWithSupabase,
  fetchUserLibraryFromSupabase,
  MarketplaceApp,
  AppReviewRecord,
} from '../lib/supabase';
import { APPS_CATALOG } from '../data/apps';
import { generateNiruviProtocolUrl } from '../data/apps';
import { AppMetadata } from '../types';
import {
  Download,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Building2,
  Star,
  ExternalLink,
  ChevronLeft,
  Loader2,
  Bookmark,
  BookmarkCheck,
  Share2,
  Trash2,
  Edit2,
  AlertCircle,
} from 'lucide-react';

interface AppDetailPageProps {
  slug: string;
  onBackToStore?: () => void;
  onOpenInstallModal?: (app: AppMetadata) => void;
}

export const AppDetailPage: React.FC<AppDetailPageProps> = ({
  slug,
  onBackToStore,
  onOpenInstallModal,
}) => {
  const { user, openAuthModal } = useAuth();
  const [app, setApp] = useState<MarketplaceApp | null>(null);
  const [loading, setLoading] = useState(true);

  // Reviews
  const [reviews, setReviews] = useState<AppReviewRecord[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userTitle, setUserTitle] = useState('');
  const [userBody, setUserBody] = useState('');
  const [userDistro, setUserDistro] = useState('Ubuntu / Debian');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  // Library & Copied states
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedProtocol, setCopiedProtocol] = useState(false);

  // Fallback to static catalog if app not yet migrated to DB
  const staticFallback = useMemo<AppMetadata | null>(() => {
    return (
      APPS_CATALOG.find(
        (a) => a.id.toLowerCase() === slug.toLowerCase() || a.name.toLowerCase() === slug.toLowerCase()
      ) || null
    );
  }, [slug]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchPublicMarketplaceApp(slug)
      .then((data) => {
        if (!mounted) return;
        if (data) {
          setApp(data);
        } else if (staticFallback) {
          // Normalize static app to MarketplaceApp model
          const authorName = staticFallback.publisher?.name || staticFallback.name;
          const isVerified = staticFallback.trustTier === 'Official Developer';
          const primaryArch = staticFallback.architectures?.[0] || 'x86_64';
          setApp({
            id: staticFallback.id,
            publisher_id: 'community',
            name: staticFallback.name,
            slug: staticFallback.id,
            short_description: staticFallback.description.slice(0, 150),
            description: staticFallback.description,
            category: staticFallback.category,
            license: staticFallback.license,
            website_url: staticFallback.homepageUrl || staticFallback.sourceUrl || null,
            source_url: staticFallback.sourceUrl || staticFallback.repositoryUrl || null,
            icon_url: staticFallback.icon || null,
            status: 'published',
            verified: isVerified,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            publisher: {
              org_name: authorName,
              slug: authorName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              verified: isVerified,
            },
            versions: [
              {
                id: `v_${staticFallback.id}`,
                app_id: staticFallback.id,
                version: staticFallback.version,
                release_notes: 'Initial verified upstream release.',
                release_date: new Date().toISOString(),
                status: 'published',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                assets: [
                  {
                    id: `asset_${staticFallback.id}`,
                    version_id: `v_${staticFallback.id}`,
                    architecture: primaryArch,
                    download_url: staticFallback.downloadUrl,
                    sha256: staticFallback.sha256,
                    file_size: null,
                    filename: `${staticFallback.name}.AppImage`,
                    asset_type: 'appimage',
                    created_at: new Date().toISOString(),
                  },
                ],
              },
            ],
          });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // Load reviews
    setLoadingReviews(true);
    fetchAppReviews(slug)
      .then((revs) => {
        if (mounted) setReviews(revs);
      })
      .finally(() => {
        if (mounted) setLoadingReviews(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug, staticFallback]);

  // Check if bookmarked in user library
  useEffect(() => {
    if (!user) return;
    fetchUserLibraryFromSupabase(user.id).then((items) => {
      setIsBookmarked(items.some((i) => i.appSlug.toLowerCase() === slug.toLowerCase()));
    });
  }, [user, slug]);

  const latestVersion = app?.versions?.[0];
  const latestAsset = latestVersion?.assets?.[0];

  const handleDownload = () => {
    if (!app || !latestAsset) return;
    recordAppDownload({
      userId: user?.id,
      appSlug: app.slug,
      version: latestVersion?.version || '1.0.0',
      arch: latestAsset.architecture,
    });
    window.location.href = latestAsset.download_url;
  };

  const handleToggleLibrary = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    const next = !isBookmarked;
    setIsBookmarked(next);
    await syncLibraryBookmarkWithSupabase({
      userId: user.id,
      appSlug: slug,
      pinnedVersion: latestVersion?.version,
      bookmarked: next,
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal();
      return;
    }
    setSubmittingReview(true);
    setReviewMessage(null);
    try {
      const record = await upsertAppReview({
        appSlug: slug,
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        rating: userRating,
        title: userTitle.trim(),
        body: userBody.trim(),
        distro: userDistro.trim(),
      });
      setReviews((prev) => {
        const without = prev.filter((r) => r.userId !== user.id);
        return [record, ...without];
      });
      setReviewMessage('Your review has been published.');
      setUserTitle('');
      setUserBody('');
    } catch (err) {
      setReviewMessage(err instanceof Error ? err.message : 'Failed to post review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;
    const isStaff = user.role === 'ADMIN' || user.role === 'MODERATOR';
    await deleteAppReview({
      reviewId,
      userId: user.id,
      isModeratorOrAdmin: isStaff,
    });
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  const copySha = () => {
    if (!latestAsset?.sha256) return;
    navigator.clipboard.writeText(latestAsset.sha256);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const copyProtocol = () => {
    if (!app) return;
    const url = `niruvi://install/${app.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedProtocol(true);
    setTimeout(() => setCopiedProtocol(false), 2000);
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-20 text-center text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-400" />
        Loading application details...
      </main>
    );
  }

  if (!app) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Application Not Found</h1>
        <p className="text-sm text-neutral-400 mb-6">
          The requested Linux package "{slug}" does not exist or has been removed.
        </p>
        {onBackToStore && (
          <button
            onClick={onBackToStore}
            className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-xl transition"
          >
            Back to Catalog
          </button>
        )}
      </main>
    );
  }

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10" id="main-content">
      {/* Back button */}
      {onBackToStore && (
        <button
          onClick={onBackToStore}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white mb-6 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Catalog
        </button>
      )}

      {/* Main App Header Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
              {app.icon_url ? (
                <img src={app.icon_url} alt={app.name} className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-3xl font-bold text-cyan-400">{app.name.charAt(0)}</span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{app.name}</h1>
                {app.verified && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/80 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                    Verified Publisher
                  </span>
                )}
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {app.category}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                  {app.license}
                </span>
              </div>

              {app.publisher && (
                <div className="text-xs text-neutral-400 mb-3 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                  Published by <strong className="text-neutral-200">{app.publisher.org_name}</strong>
                </div>
              )}

              <p className="text-sm text-neutral-300 leading-relaxed max-w-2xl">
                {app.short_description || app.description}
              </p>

              {averageRating && (
                <div className="flex items-center gap-2 mt-4 text-xs text-amber-400 font-semibold">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= Math.round(Number(averageRating))
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-neutral-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span>{averageRating} / 5.0 ({reviews.length} reviews)</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-64 shrink-0">
            {latestAsset && (
              <button
                onClick={handleDownload}
                className="w-full py-3.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download .AppImage
              </button>
            )}

            <button
              onClick={() => {
                if (staticFallback && onOpenInstallModal) {
                  onOpenInstallModal(staticFallback);
                } else {
                  window.location.href = `niruvi://install/${app.slug}`;
                }
              }}
              className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs rounded-xl transition border border-neutral-700 flex items-center justify-center gap-2"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Install with Niruvi Desktop
            </button>

            <button
              onClick={handleToggleLibrary}
              className={`w-full py-2.5 px-4 text-xs font-medium rounded-xl transition border flex items-center justify-center gap-2 ${
                isBookmarked
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/80'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
              }`}
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Saved in My Library
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  Add to Library
                </>
              )}
            </button>
          </div>
        </div>

        {/* Verification & Integrity Box */}
        {latestAsset && (
          <div className="mt-8 pt-6 border-t border-neutral-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                  Cryptographic SHA-256 Checksum
                </span>
                <button
                  onClick={copySha}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                >
                  {copiedSha ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedSha ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="font-mono text-neutral-300 break-all text-[11px]">
                {latestAsset.sha256}
              </div>
            </div>

            <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                  Desktop Protocol URI
                </span>
                <button
                  onClick={copyProtocol}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                >
                  {copiedProtocol ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedProtocol ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="font-mono text-neutral-300 break-all text-[11px]">
                niruvi://install/{app.slug}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Description & Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-4">About {app.name}</h2>
            <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {app.description}
            </div>
          </div>

          {/* Versions & Releases */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-4">Release Versions</h2>
            {app.versions && app.versions.length > 0 ? (
              <div className="space-y-4">
                {app.versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">v{ver.version}</span>
                      <span className="text-xs text-neutral-500">
                        {new Date(ver.release_date).toLocaleDateString()}
                      </span>
                    </div>
                    {ver.release_notes && (
                      <p className="text-xs text-neutral-400 whitespace-pre-wrap">{ver.release_notes}</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {ver.assets?.map((a) => (
                        <a
                          key={a.id}
                          href={a.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-cyan-400 border border-neutral-800 rounded-lg text-xs flex items-center gap-1.5 transition font-mono"
                        >
                          <Download className="w-3 h-3" />
                          {a.architecture}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">No additional version history available.</p>
            )}
          </div>

          {/* REVIEWS & COMMUNITY RATINGS */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-4">Community Reviews & Ratings</h2>

            {/* Submit Review Box */}
            <form onSubmit={handleReviewSubmit} className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl mb-6 space-y-3">
              <div className="text-xs font-semibold text-neutral-200">
                {user ? `Write a review as ${user.displayName}` : 'Sign in to submit a review'}
              </div>

              {reviewMessage && (
                <div className="text-xs p-3 bg-neutral-900 border border-neutral-800 text-cyan-300 rounded-lg">
                  {reviewMessage}
                </div>
              )}

              <div className="flex items-center gap-4">
                <label className="text-xs text-neutral-400">Rating:</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserRating(star)}
                      className="p-1 hover:scale-110 transition"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= userRating ? 'fill-amber-400 text-amber-400' : 'text-neutral-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  required
                  value={userTitle}
                  onChange={(e) => setUserTitle(e.target.value)}
                  placeholder="Review title (e.g. Flawless performance on Arch Linux)"
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white outline-none"
                />
              </div>

              <div>
                <textarea
                  rows={3}
                  required
                  value={userBody}
                  onChange={(e) => setUserBody(e.target.value)}
                  placeholder="Share your desktop experience, compatibility notes, or configuration tips..."
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <input
                  type="text"
                  value={userDistro}
                  onChange={(e) => setUserDistro(e.target.value)}
                  placeholder="Linux Distribution (optional)"
                  className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-300 outline-none w-48"
                />

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                >
                  {submittingReview ? 'Posting...' : 'Submit Review'}
                </button>
              </div>
            </form>

            {/* Review List */}
            {reviews.length === 0 ? (
              <p className="text-xs text-neutral-500">No community reviews yet. Be the first to review this application!</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{rev.displayName}</span>
                        <span className="text-neutral-500">@{rev.username}</span>
                        {rev.distro && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800">
                            {rev.distro}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-700'}`}
                            />
                          ))}
                        </div>
                        {user && (user.id === rev.userId || user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                          <button
                            onClick={() => handleDeleteReview(rev.id)}
                            className="text-neutral-500 hover:text-red-400 p-1"
                            title="Delete review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {rev.title && <div className="text-xs font-bold text-neutral-200">{rev.title}</div>}
                    <p className="text-xs text-neutral-400 whitespace-pre-wrap">{rev.body}</p>
                    <div className="text-[10px] text-neutral-600">{new Date(rev.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white mb-2">Package Information</h3>

            <div>
              <span className="text-neutral-500 block mb-0.5">Author / Maintainer</span>
              <span className="text-neutral-200 font-medium">{app.publisher?.org_name || 'Community Contributor'}</span>
            </div>

            <div>
              <span className="text-neutral-500 block mb-0.5">Architecture</span>
              <span className="text-neutral-200 font-mono font-medium">{latestAsset?.architecture || 'x86_64'}</span>
            </div>

            <div>
              <span className="text-neutral-500 block mb-0.5">License</span>
              <span className="text-neutral-200 font-medium">{app.license}</span>
            </div>

            {app.website_url && (
              <div>
                <span className="text-neutral-500 block mb-0.5">Official Website</span>
                <a
                  href={app.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                >
                  {app.website_url.replace(/^https?:\/\//, '').split('/')[0]} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {app.source_url && (
              <div>
                <span className="text-neutral-500 block mb-0.5">Source Repository</span>
                <a
                  href={app.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                >
                  Upstream Repository <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
