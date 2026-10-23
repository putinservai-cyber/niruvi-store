/**
 * Niruvi Store — Cloudflare D1 Database & API Client
 *
 * Provides typed, secure client access to Cloudflare D1 database endpoints:
 * - Community ratings & reviews (Cloudflare D1 `app_reviews` table)
 * - Community AppImage submissions (Cloudflare D1 `submissions` / `app_submissions` table)
 * - Broken package reports (Cloudflare D1 `app_reports` table)
 * - Local bookmark library & offline download tracking
 *
 * All operations execute against Cloudflare D1 with strict validation,
 * sanitized outputs, and resilient client-side offline fallbacks.
 */

import { buildApiUrl, HAS_API_BACKEND } from '../config/site';
import { sanitizeText } from '../utils/sanitize';

export interface AppReviewRecord {
  id: string;
  appSlug: string;
  authorName: string;
  username: string;
  displayName: string;
  userId?: string;
  rating: number; // 1..5
  title: string;
  body: string;
  distro: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LibraryNotificationPrefs {
  [appSlug: string]: boolean;
}

const LOCAL_REVIEWS_STORAGE_KEY = 'niruvi_app_reviews_v1';
const LOCAL_NOTIFY_PREFS_KEY = 'niruvi_library_notify_prefs_v1';
const LOCAL_DOWNLOAD_HISTORY_KEY = 'niruvi_download_history';

let inMemoryReviews: AppReviewRecord[] = [];
let inMemoryPrefs: LibraryNotificationPrefs = {};

/**
 * Reads local cached reviews from localStorage or memory
 */
function getCachedReviews(): AppReviewRecord[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_REVIEWS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // Ignore storage parse issues
  }
  return [...inMemoryReviews];
}

/**
 * Saves reviews cache to localStorage and memory
 */
function saveCachedReviews(reviews: AppReviewRecord[]): void {
  inMemoryReviews = [...reviews];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
    }
  } catch {
    // Ignore storage quota issues
  }
}

/**
 * Fetches verified community reviews for an application slug from Cloudflare D1.
 * Seamlessly merges with local cache for offline reliability.
 */
export async function fetchAppReviews(appSlug: string): Promise<AppReviewRecord[]> {
  const cleanSlug = appSlug.trim().toLowerCase();
  if (!cleanSlug) return [];

  if (HAS_API_BACKEND) {
    try {
      const url = buildApiUrl(`/api/reviews?appSlug=${encodeURIComponent(cleanSlug)}`);
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.reviews)) {
          const d1Reviews: AppReviewRecord[] = data.reviews.map((r: any) => {
            const author = sanitizeText(r.authorName || r.author_name || r.displayName || r.display_name || r.username || 'Linux Community User', 60);
            const userHandle = sanitizeText(r.username || r.authorName || 'community_user', 50);
            return {
              id: String(r.id),
              appSlug: String(r.appSlug || r.app_slug || cleanSlug).toLowerCase(),
              authorName: author,
              displayName: author,
              username: userHandle,
              userId: r.userId || r.user_id || undefined,
              rating: Math.max(1, Math.min(5, Number(r.rating) || 5)),
              title: sanitizeText(r.title || '', 100),
              body: sanitizeText(r.body || '', 2000),
              distro: sanitizeText(r.distro || '', 60),
              createdAt: String(r.createdAt || r.created_at || new Date().toISOString()),
            };
          });

          // Merge with any offline reviews
          const cached = getCachedReviews().filter((r) => r.appSlug !== cleanSlug);
          saveCachedReviews([...d1Reviews, ...cached]);
          return d1Reviews;
        }
      }
    } catch {
      // Backend unavailable; fall through to local cache
    }
  }

  // Fallback to local offline reviews
  const allCached = getCachedReviews();
  return allCached.filter((r) => r.appSlug.toLowerCase() === cleanSlug);
}

/**
 * Submits or updates a community review in Cloudflare D1.
 * Does not require signing in or user accounts.
 */
export async function upsertAppReview(params: {
  appSlug: string;
  authorName?: string;
  username?: string;
  displayName?: string;
  userId?: string;
  rating: number;
  title: string;
  body: string;
  distro?: string;
  reviewId?: string;
}): Promise<AppReviewRecord> {
  const cleanSlug = params.appSlug.trim().toLowerCase();
  const cleanTitle = sanitizeText(params.title, 100);
  const cleanBody = sanitizeText(params.body, 2000);
  const cleanDistro = sanitizeText(params.distro || '', 60);
  const cleanAuthor = sanitizeText(
    params.authorName || params.displayName || params.username || 'Linux Community User',
    60
  );
  const userHandle = sanitizeText(params.username || params.authorName || 'community_user', 50);
  const rating = Math.max(1, Math.min(5, Math.round(params.rating || 5)));

  if (!cleanSlug) {
    throw new Error('Application slug is required.');
  }
  if (!cleanBody || cleanBody.length < 5) {
    throw new Error('Please write at least 5 characters in your review.');
  }

  const reviewRecord: AppReviewRecord = {
    id: params.reviewId || `rev_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
    appSlug: cleanSlug,
    authorName: cleanAuthor,
    displayName: cleanAuthor,
    username: userHandle,
    userId: params.userId,
    rating,
    title: cleanTitle,
    body: cleanBody,
    distro: cleanDistro,
    createdAt: new Date().toISOString(),
  };

  if (HAS_API_BACKEND) {
    try {
      const res = await fetch(buildApiUrl('/api/reviews'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          id: reviewRecord.id,
          appSlug: reviewRecord.appSlug,
          authorName: reviewRecord.authorName,
          rating: reviewRecord.rating,
          title: reviewRecord.title,
          body: reviewRecord.body,
          distro: reviewRecord.distro,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.review) {
          const saved: AppReviewRecord = {
            id: String(data.review.id || reviewRecord.id),
            appSlug: cleanSlug,
            authorName: cleanAuthor,
            displayName: cleanAuthor,
            username: userHandle,
            userId: params.userId,
            rating,
            title: cleanTitle,
            body: cleanBody,
            distro: cleanDistro,
            createdAt: String(data.review.createdAt || data.review.created_at || reviewRecord.createdAt),
          };
          updateCachedReview(saved);
          return saved;
        }
      }
    } catch {
      // Backend unavailable; save to local storage cache
    }
  }

  updateCachedReview(reviewRecord);
  return reviewRecord;
}

function updateCachedReview(saved: AppReviewRecord): void {
  const current = getCachedReviews();
  const existingIdx = current.findIndex((r) => r.id === saved.id);
  if (existingIdx >= 0) {
    current[existingIdx] = saved;
  } else {
    current.unshift(saved);
  }
  saveCachedReviews(current);
}

/**
 * Deletes a community review from Cloudflare D1 and local storage cache.
 */
export async function deleteAppReview(
  reviewIdOrParams: string | { reviewId: string; userId?: string; isModeratorOrAdmin?: boolean }
): Promise<void> {
  const targetId = typeof reviewIdOrParams === 'string'
    ? reviewIdOrParams.trim()
    : (reviewIdOrParams?.reviewId || '').trim();
  if (!targetId) return;

  if (HAS_API_BACKEND) {
    try {
      await fetch(buildApiUrl(`/api/reviews/${encodeURIComponent(targetId)}`), {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
    } catch {
      // Local cache deletion proceeds
    }
  }

  const current = getCachedReviews().filter((r) => r.id !== targetId);
  saveCachedReviews(current);
}

/**
 * Retrieves per-application update notification preferences
 */
export function getLibraryNotificationPrefs(): LibraryNotificationPrefs {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_NOTIFY_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    }
  } catch {
    // fallback
  }
  return { ...inMemoryPrefs };
}

/**
 * Toggles update notification tracking for a bookmarked AppImage
 */
export async function setLibraryUpdateNotification(
  appSlug: string,
  notifyUpdates: boolean
): Promise<void> {
  const cleanSlug = appSlug.trim().toLowerCase();
  const prefs = getLibraryNotificationPrefs();
  prefs[cleanSlug] = notifyUpdates;
  inMemoryPrefs = { ...prefs };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_NOTIFY_PREFS_KEY, JSON.stringify(prefs));
    }
  } catch {
    // ignore storage error
  }
}

/**
 * Records an anonymous package download locally and reports count to Cloudflare D1
 */
export async function recordAppDownload(params: {
  appSlug: string;
  version: string;
  arch: string;
}): Promise<void> {
  const cleanSlug = params.appSlug.trim().toLowerCase();
  const record = {
    appId: cleanSlug,
    version: params.version || 'latest',
    arch: params.arch || 'x86_64',
    timestamp: new Date().toISOString(),
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const existingRaw = localStorage.getItem(LOCAL_DOWNLOAD_HISTORY_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const filtered = Array.isArray(existing)
        ? existing.filter((item: any) => item.appId !== cleanSlug)
        : [];
      const updated = [record, ...filtered].slice(0, 50);
      localStorage.setItem(LOCAL_DOWNLOAD_HISTORY_KEY, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }

  // Non-blocking report to Cloudflare Worker
  if (HAS_API_BACKEND) {
    try {
      fetch(buildApiUrl('/api/downloads'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      }).catch(() => {});
    } catch {
      // ignore
    }
  }
}
