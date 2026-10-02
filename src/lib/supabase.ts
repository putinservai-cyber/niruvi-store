import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { SITE_URL } from '../config/site';

export type MarketplaceRole = 'user' | 'publisher' | 'moderator' | 'admin';

export interface SupabaseProfileRow {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  website_url: string | null;
  github_username: string | null;
  auth_provider: string | null;
  role: MarketplaceRole;
  created_at: string;
  updated_at: string;
}

const metaEnv =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    : undefined;

const rawSupabaseUrl = (
  (metaEnv && metaEnv.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) ||
  ''
).trim();

const rawSupabaseAnonKey = (
  (metaEnv && metaEnv.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) ||
  ''
).trim();

/**
 * Security Guard: Rejects service-role keys if someone accidentally sets one in VITE_SUPABASE_ANON_KEY.
 * Frontend code must NEVER hold or use a Supabase service_role key.
 */
export function isSafeAnonKey(key: string): boolean {
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (/service_role/i.test(trimmed) || trimmed.startsWith('sb_secret_')) {
    return false;
  }
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const decoded = JSON.parse(atob(padded));
      if (decoded && decoded.role === 'service_role') {
        return false;
      }
    } catch {
      // Non-JWT publishable key format (`sb_publishable_...`)
    }
  }
  return true;
}

export const SUPABASE_URL = rawSupabaseUrl.startsWith('https://')
  ? rawSupabaseUrl.replace(/\/+$/, '')
  : '';

export const SUPABASE_ANON_KEY = isSafeAnonKey(rawSupabaseAnonKey) ? rawSupabaseAnonKey : '';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Singleton Supabase client configured strictly with VITE_SUPABASE_URL,
 * VITE_SUPABASE_ANON_KEY, and OAuth PKCE flow (`flowType: 'pkce'`).
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'niruvi_supabase_auth',
      },
    })
  : null;

/**
 * Initiates OAuth 2.0 PKCE sign-in with GitHub or Google.
 */
export async function signInWithSupabaseOAuth(provider: 'github' | 'google'): Promise<void> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }
  const redirectTo = `${SITE_URL}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      scopes: provider === 'github' ? 'read:user user:email' : 'openid email profile',
    },
  });
  if (error) {
    throw error;
  }
}

/**
 * Fetches the authoritative user profile (including server-enforced `role`) from `public.profiles`.
 * Never trusts any role claim from client storage or user_metadata.
 */
export async function fetchSupabaseUserProfile(
  authUser: SupabaseAuthUser
): Promise<SupabaseProfileRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, username, display_name, avatar_url, bio, website_url, github_username, auth_provider, role, created_at, updated_at'
    )
    .eq('id', authUser.id)
    .maybeSingle();

  if (!error && data) {
    return data as SupabaseProfileRow;
  }

  // Fallback insert if the trigger has not run yet (role is strictly omitted so Postgres defaults to 'user')
  const meta = authUser.user_metadata || {};
  const rawUsername = String(
    meta.user_name || meta.preferred_username || (authUser.email || 'linux_user').split('@')[0]
  )
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 20);
  const safeUsername = rawUsername.length >= 3 ? rawUsername : `user_${authUser.id.slice(0, 6)}`;
  const displayName = String(meta.full_name || meta.name || safeUsername).slice(0, 60);
  const avatarUrl = typeof meta.avatar_url === 'string' ? meta.avatar_url : null;
  const provider = String(authUser.app_metadata?.provider || 'oauth');

  const { data: inserted } = await supabase
    .from('profiles')
    .upsert(
      {
        id: authUser.id,
        email: authUser.email || null,
        username: safeUsername,
        display_name: displayName,
        avatar_url: avatarUrl,
        github_username: provider === 'github' ? safeUsername : null,
        auth_provider: provider,
      },
      { onConflict: 'id' }
    )
    .select(
      'id, email, username, display_name, avatar_url, bio, website_url, github_username, auth_provider, role, created_at, updated_at'
    )
    .maybeSingle();

  return (inserted as SupabaseProfileRow) || null;
}

/**
 * Updates only user-editable profile fields in `public.profiles`.
 * Explicitly omits `role` so client code never sends a role update.
 */
export async function updateSupabaseUserProfile(
  userId: string,
  updates: {
    username?: string;
    display_name?: string;
    bio?: string;
    website_url?: string | null;
    avatar_url?: string | null;
  }
): Promise<SupabaseProfileRow> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }

  const cleanUpdates: Record<string, unknown> = {};
  if (typeof updates.username === 'string') {
    cleanUpdates.username = updates.username.trim().toLowerCase();
  }
  if (typeof updates.display_name === 'string') {
    cleanUpdates.display_name = updates.display_name.trim();
  }
  if (typeof updates.bio === 'string') {
    cleanUpdates.bio = updates.bio.trim().slice(0, 500);
  }
  if (updates.website_url !== undefined) {
    cleanUpdates.website_url = updates.website_url ? updates.website_url.trim() : null;
  }
  if (updates.avatar_url !== undefined) {
    cleanUpdates.avatar_url = updates.avatar_url ? updates.avatar_url.trim() : null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(cleanUpdates)
    .eq('id', userId)
    .select(
      'id, email, username, display_name, avatar_url, bio, website_url, github_username, auth_provider, role, created_at, updated_at'
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update profile.');
  }
  return data as SupabaseProfileRow;
}

// ============================================================================
// PHASE 3: ACCOUNT LIBRARY, DOWNLOAD HISTORY, UPDATE NOTIFICATIONS & REVIEWS
// ============================================================================

export interface AppReviewRecord {
  id: string;
  appSlug: string;
  userId: string;
  username: string;
  displayName: string;
  rating: number; // 1..5
  title: string;
  body: string;
  distro: string;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryNotificationPrefs {
  [appSlug: string]: boolean;
}

const LOCAL_REVIEWS_KEY = 'niruvi_app_reviews_v1';
const LOCAL_NOTIFY_PREFS_KEY = 'niruvi_library_notify_prefs_v1';

function readLocalReviews(): AppReviewRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalReviews(reviews: AppReviewRecord[]): void {
  try {
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(reviews));
  } catch {
    // ignore storage errors
  }
}

export function getLibraryNotificationPrefs(): LibraryNotificationPrefs {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFY_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function setLibraryUpdateNotification(
  userId: string | null | undefined,
  appSlug: string,
  notifyUpdates: boolean
): Promise<void> {
  const prefs = getLibraryNotificationPrefs();
  prefs[appSlug] = notifyUpdates;
  try {
    localStorage.setItem(LOCAL_NOTIFY_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage error
  }

  if (supabase && userId) {
    try {
      await supabase
        .from('library')
        .upsert(
          {
            user_id: userId,
            app_slug: appSlug,
            notify_updates: notifyUpdates,
          },
          { onConflict: 'user_id,app_slug' }
        );
    } catch {
      // Fallback already persisted locally
    }
  }
}

/**
 * Records an anonymous or authenticated download in `public.downloads` (when Supabase is configured).
 */
export async function recordAppDownload(params: {
  userId?: string | null;
  appSlug: string;
  version: string;
  arch: string;
}): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('downloads').insert({
      user_id: params.userId || null,
      app_slug: params.appSlug,
      version: params.version,
      arch: params.arch === 'aarch64' || params.arch === 'armhf' ? params.arch : 'x86_64',
    });
  } catch {
    // Non-blocking telemetry-free download record for user's own history
  }
}

/**
 * Syncs a bookmarked app into `public.library` for signed-in users.
 */
export async function syncLibraryBookmarkWithSupabase(params: {
  userId: string;
  appSlug: string;
  pinnedVersion?: string;
  bookmarked: boolean;
}): Promise<void> {
  if (!supabase || !params.userId) return;
  try {
    if (params.bookmarked) {
      await supabase.from('library').upsert(
        {
          user_id: params.userId,
          app_slug: params.appSlug,
          pinned_version: params.pinnedVersion || null,
          notify_updates: true,
        },
        { onConflict: 'user_id,app_slug' }
      );
    } else {
      await supabase
        .from('library')
        .delete()
        .eq('user_id', params.userId)
        .eq('app_slug', params.appSlug);
    }
  } catch {
    // Local bookmark state remains intact if offline
  }
}

/**
 * Fetches reviews for a given application slug (`appSlug`), combining Supabase `public.reviews`
 * (when configured) and local reviews.
 */
export async function fetchAppReviews(appSlug: string): Promise<AppReviewRecord[]> {
  const cleanSlug = appSlug.trim().toLowerCase();
  if (supabase) {
    try {
      const { data: appRow } = await supabase
        .from('apps')
        .select('id')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (appRow?.id) {
        const { data: rows } = await supabase
          .from('reviews')
          .select(
            'id, user_id, rating, title, body, distro, created_at, updated_at, profiles(username, display_name)'
          )
          .eq('app_id', appRow.id)
          .order('created_at', { ascending: false });

        if (Array.isArray(rows)) {
          return rows.map((r: any) => ({
            id: String(r.id),
            appSlug: cleanSlug,
            userId: String(r.user_id),
            username: r.profiles?.username || 'linux_user',
            displayName: r.profiles?.display_name || 'Linux User',
            rating: Number(r.rating) || 5,
            title: String(r.title || ''),
            body: String(r.body || ''),
            distro: String(r.distro || ''),
            createdAt: String(r.created_at || new Date().toISOString()),
            updatedAt: String(r.updated_at || new Date().toISOString()),
          }));
        }
      }
    } catch {
      // Fall back to local reviews store
    }
  }

  return readLocalReviews()
    .filter((r) => r.appSlug.toLowerCase() === cleanSlug)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Creates or updates the signed-in user's review for `appSlug` (1 review per user per app).
 */
export async function upsertAppReview(params: {
  appSlug: string;
  userId: string;
  username: string;
  displayName: string;
  rating: number;
  title: string;
  body: string;
  distro: string;
}): Promise<AppReviewRecord> {
  const cleanSlug = params.appSlug.trim().toLowerCase();
  const clampedRating = Math.min(5, Math.max(1, Math.round(Number(params.rating) || 5)));
  const cleanTitle = params.title.trim().slice(0, 120);
  const cleanBody = params.body.trim().slice(0, 2000);
  const cleanDistro = params.distro.trim().slice(0, 80);
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data: appRow } = await supabase
        .from('apps')
        .select('id')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (appRow?.id) {
        const { data: saved, error } = await supabase
          .from('reviews')
          .upsert(
            {
              app_id: appRow.id,
              user_id: params.userId,
              rating: clampedRating,
              title: cleanTitle,
              body: cleanBody,
              distro: cleanDistro,
              updated_at: now,
            },
            { onConflict: 'app_id,user_id' }
          )
          .select('id, created_at, updated_at')
          .single();

        if (!error && saved) {
          return {
            id: String(saved.id),
            appSlug: cleanSlug,
            userId: params.userId,
            username: params.username,
            displayName: params.displayName,
            rating: clampedRating,
            title: cleanTitle,
            body: cleanBody,
            distro: cleanDistro,
            createdAt: String(saved.created_at || now),
            updatedAt: String(saved.updated_at || now),
          };
        }
      }
    } catch {
      // Fall back to local persistence
    }
  }

  const all = readLocalReviews();
  const existingIdx = all.findIndex(
    (r) => r.appSlug.toLowerCase() === cleanSlug && r.userId === params.userId
  );

  const record: AppReviewRecord = {
    id: existingIdx >= 0 ? all[existingIdx].id : `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    appSlug: cleanSlug,
    userId: params.userId,
    username: params.username,
    displayName: params.displayName,
    rating: clampedRating,
    title: cleanTitle,
    body: cleanBody,
    distro: cleanDistro,
    createdAt: existingIdx >= 0 ? all[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    all[existingIdx] = record;
  } else {
    all.unshift(record);
  }
  writeLocalReviews(all);
  return record;
}

/**
 * Deletes the signed-in user's own review (or any review if user is moderator/admin).
 */
export async function deleteAppReview(params: {
  reviewId: string;
  userId: string;
  isModeratorOrAdmin?: boolean;
}): Promise<void> {
  if (supabase) {
    try {
      const query = supabase.from('reviews').delete().eq('id', params.reviewId);
      if (!params.isModeratorOrAdmin) {
        query.eq('user_id', params.userId);
      }
      await query;
    } catch {
      // Continue to local cleanup
    }
  }

  const all = readLocalReviews();
  const filtered = all.filter(
    (r) =>
      !(
        r.id === params.reviewId &&
        (params.isModeratorOrAdmin || r.userId === params.userId)
      )
  );
  writeLocalReviews(filtered);
}
