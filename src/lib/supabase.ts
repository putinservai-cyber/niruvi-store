import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { SITE_URL, withBaseUrl } from '../config/site';
import { isLikelySecretKey, sanitizeText, sanitizeUrl, sanitizeUsername } from '../utils/sanitize';

export type MarketplaceRole = 'user' | 'publisher' | 'moderator' | 'admin';
export type OAuthProviderType = 'google' | 'github' | 'gitlab';

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

export interface PublicDeveloperProfile {
  userId: string;
  slug: string;
  orgName: string;
  orgDescription: string;
  orgWebsite: string | null;
  sourceUrl: string | null;
  avatarUrl: string | null;
  verified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

const metaEnv =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    : undefined;

const rawApiUrlCandidate = (
  (metaEnv && metaEnv.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) ||
  ''
).trim();

const rawSupabaseUrl = (
  (metaEnv && (metaEnv.VITE_SUPABASE_URL || metaEnv.NEXT_PUBLIC_SUPABASE_URL)) ||
  (typeof process !== 'undefined' &&
    process.env &&
    (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)) ||
  (/\.supabase\.co(\/|$)/i.test(rawApiUrlCandidate) ? rawApiUrlCandidate : '') ||
  ''
).trim();

const rawSupabaseAnonKey = (
  (metaEnv &&
    (metaEnv.VITE_SUPABASE_ANON_KEY ||
      metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
      metaEnv.VITE_SUPABASE_KEY ||
      metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  (typeof process !== 'undefined' &&
    process.env &&
    (process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  ''
).trim();

/**
 * Security Guard: Rejects service-role keys if someone accidentally sets one in VITE_SUPABASE_ANON_KEY.
 * Frontend code must NEVER hold or use a Supabase service_role key.
 */
export function isSafeAnonKey(key: string): boolean {
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (isLikelySecretKey(trimmed)) {
    return false;
  }
  return true;
}

export const SUPABASE_URL = rawSupabaseUrl.startsWith('https://')
  ? rawSupabaseUrl
      .replace(/\/+$/, '')
      .replace(/\/(rest|auth)\/v1$/i, '')
  : '';

export const SUPABASE_ANON_KEY = isSafeAnonKey(rawSupabaseAnonKey) ? rawSupabaseAnonKey : '';

const defaultSupabaseClient: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            apikey: SUPABASE_ANON_KEY,
          },
        },
        auth: {
          flowType: 'pkce',
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storageKey: 'niruvi_supabase_auth',
        },
      })
    : null;

let testSupabaseClientOverride: SupabaseClient | null | undefined = undefined;

/**
 * Allows injecting a mock or test Supabase client in unit/integration tests.
 */
export function setSupabaseClientForTesting(client: SupabaseClient | null | undefined): void {
  testSupabaseClientOverride = client;
}

export function getActiveSupabaseClient(): SupabaseClient | null {
  if (testSupabaseClientOverride !== undefined) {
    return testSupabaseClientOverride;
  }
  return defaultSupabaseClient;
}

export const supabase: SupabaseClient | null = defaultSupabaseClient;

export function isSupabaseConfigured(): boolean {
  if (testSupabaseClientOverride !== undefined) {
    return Boolean(testSupabaseClientOverride);
  }
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseConfigStatus(): {
  configured: boolean;
  hasUrl: boolean;
  hasAnonKey: boolean;
  errorMessage: string | null;
} {
  const configured = isSupabaseConfigured();
  if (configured) {
    return {
      configured: true,
      hasUrl: true,
      hasAnonKey: true,
      errorMessage: null,
    };
  }
  return {
    configured: false,
    hasUrl: Boolean(SUPABASE_URL),
    hasAnonKey: Boolean(SUPABASE_ANON_KEY),
    errorMessage:
      'Supabase authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.',
  };
}

/**
 * Computes the OAuth PKCE redirect URL dynamically from the current deployment origin
 * (supporting production custom domain, GitHub Pages subpath, and localhost development).
 */
export function getOAuthRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const callbackPath = withBaseUrl('auth/callback');
    const normalizedPath = callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`;
    return `${window.location.origin}${normalizedPath}`;
  }
  return `${SITE_URL.replace(/\/+$/, '')}/auth/callback`;
}

/**
 * Converts raw Supabase Auth / OAuth / PostgREST errors into clear, human-friendly messages
 * without exposing internal stack traces, SQL syntax, or raw error objects.
 */
export function formatSupabaseAuthError(
  err: unknown,
  providerOrContext?: OAuthProviderType | 'signin' | 'signup' | 'reset'
): string {
  const providerLabel =
    providerOrContext === 'google'
      ? 'Google'
      : providerOrContext === 'github'
        ? 'GitHub'
        : providerOrContext === 'gitlab'
          ? 'GitLab'
          : null;

  const rawMessage =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message?: unknown }).message || '')
        : typeof err === 'string'
          ? err
          : '';
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid email or password') ||
    lower.includes('invalid_grant') ||
    lower.includes('wrong password')
  ) {
    return 'Invalid email or password.';
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered') ||
    lower.includes('email already')
  ) {
    return 'This email is already registered.';
  }
  if (lower.includes('username') && (lower.includes('taken') || lower.includes('unique') || lower.includes('duplicate'))) {
    return 'Username is already taken.';
  }
  if (
    lower.includes('provider is not enabled') ||
    lower.includes('unsupported provider') ||
    lower.includes('not configured')
  ) {
    if (providerLabel) {
      return `${providerLabel} sign-in is not configured.`;
    }
    return 'Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  }
  if (lower.includes('redirect') && (lower.includes('not allowed') || lower.includes('unauthorized') || lower.includes('mismatch'))) {
    return 'Unauthorized redirect URL. Verify Redirect URLs in Supabase Authentication settings.';
  }
  if (lower.includes('popup') && lower.includes('blocked')) {
    return 'Sign-in popup was blocked by your browser.';
  }
  if (lower.includes('cancel') || lower.includes('access_denied') || lower.includes('closed')) {
    return providerLabel
      ? `${providerLabel} sign-in was cancelled.`
      : 'Sign-in was cancelled.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('fetch')) {
    return providerLabel
      ? `${providerLabel} sign-in is temporarily unavailable due to a network error.`
      : 'Network error while contacting authentication server.';
  }
  if (providerLabel) {
    return `${providerLabel} sign-in is temporarily unavailable.`;
  }
  if (providerOrContext === 'signin') {
    return 'Invalid email or password.';
  }
  if (providerOrContext === 'signup') {
    return 'Unable to create account. Please verify your details and try again.';
  }
  return 'Authentication request could not be completed.';
}

/**
 * Initiates OAuth 2.0 PKCE sign-in with Google, GitHub, or GitLab via Supabase Auth.
 * Never creates a fake user if OAuth fails.
 */
export async function signInWithSupabaseOAuth(provider: OAuthProviderType): Promise<void> {
  const client = getActiveSupabaseClient();
  if (!client) {
    throw new Error(formatSupabaseAuthError('Provider is not configured', provider));
  }

  const redirectTo = getOAuthRedirectUrl();
  const scopesByProvider: Record<OAuthProviderType, string> = {
    google: 'openid email profile',
    github: 'read:user user:email',
    gitlab: 'read_user email',
  };

  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      scopes: scopesByProvider[provider],
    },
  });

  if (error) {
    throw new Error(formatSupabaseAuthError(error, provider));
  }
}

/**
 * Checks whether a username is available in `public.profiles`.
 */
export async function checkSupabaseUsernameAvailability(
  username: string
): Promise<{ available: boolean; error?: string }> {
  const clean = sanitizeUsername(username, 24);
  if (!clean || clean.length < 3 || clean.length > 24) {
    return {
      available: false,
      error: 'Username must be 3–24 characters (letters, numbers, underscores).',
    };
  }

  const client = getActiveSupabaseClient();
  if (!client) {
    return {
      available: false,
      error: 'Authentication database is not configured.',
    };
  }

  const { data, error } = await client
    .from('profiles')
    .select('id')
    .ilike('username', clean)
    .maybeSingle();

  if (error) {
    return {
      available: false,
      error: 'Unable to verify username availability right now.',
    };
  }

  if (data && data.id) {
    return {
      available: false,
      error: 'Username is already taken.',
    };
  }

  return { available: true };
}

/**
 * Fetches the authoritative user profile (including server-enforced `role`) from `public.profiles`.
 * Never trusts any role claim from client storage or user_metadata.
 */
export async function fetchSupabaseUserProfile(
  authUser: SupabaseAuthUser
): Promise<SupabaseProfileRow | null> {
  const client = getActiveSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('profiles')
    .select(
      'id, email, username, display_name, avatar_url, bio, website_url, github_username, auth_provider, role, created_at, updated_at'
    )
    .eq('id', authUser.id)
    .maybeSingle();

  if (!error && data) {
    return data as SupabaseProfileRow;
  }

  // Fallback insert if the database trigger has not run yet (role is strictly omitted so Postgres defaults to 'user')
  const meta = authUser.user_metadata || {};
  const rawUsername = String(
    meta.username ||
      meta.user_name ||
      meta.preferred_username ||
      (authUser.email || 'user').split('@')[0]
  )
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 20);
  const safeUsername = rawUsername.length >= 3 ? rawUsername : `user_${authUser.id.slice(0, 6)}`;
  const displayName = String(
    meta.display_name || meta.full_name || meta.name || safeUsername
  ).slice(0, 60);
  const avatarUrl = typeof meta.avatar_url === 'string' ? meta.avatar_url : null;
  const provider = String(authUser.app_metadata?.provider || 'email');

  const { data: inserted } = await client
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

  if (inserted) {
    return inserted as SupabaseProfileRow;
  }

  return {
    id: authUser.id,
    email: authUser.email || null,
    username: safeUsername,
    display_name: displayName,
    avatar_url: avatarUrl,
    bio: '',
    website_url: null,
    github_username: provider === 'github' ? safeUsername : null,
    auth_provider: provider,
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
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
  const client = getActiveSupabaseClient();
  if (!client) {
    throw new Error('Authentication database is not configured.');
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

  const { data, error } = await client
    .from('profiles')
    .update(cleanUpdates)
    .eq('id', userId)
    .select(
      'id, email, username, display_name, avatar_url, bio, website_url, github_username, auth_provider, role, created_at, updated_at'
    )
    .single();

  if (error || !data) {
    if (error?.message?.toLowerCase().includes('unique') || error?.message?.toLowerCase().includes('username')) {
      throw new Error('Username is already taken.');
    }
    throw new Error('Unable to update profile changes.');
  }
  return data as SupabaseProfileRow;
}

/**
 * Fetches the signed-in user's developer profile / request status from `public.developer_profiles`.
 */
export async function fetchUserDeveloperProfile(
  userId: string
): Promise<PublicDeveloperProfile | null> {
  const client = getActiveSupabaseClient();
  if (!client || !userId) return null;

  try {
    const { data, error } = await client
      .from('developer_profiles')
      .select(
        'user_id, slug, org_name, org_description, org_website, source_url, avatar_url, verified, status, rejection_reason, created_at, updated_at'
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      userId: String(data.user_id),
      slug: String(data.slug),
      orgName: String(data.org_name),
      orgDescription: String(data.org_description || ''),
      orgWebsite: data.org_website ? String(data.org_website) : null,
      sourceUrl: data.source_url ? String(data.source_url) : null,
      avatarUrl: data.avatar_url ? String(data.avatar_url) : null,
      verified: Boolean(data.verified),
      status:
        data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending',
      rejectionReason: data.rejection_reason ? String(data.rejection_reason) : null,
      createdAt: String(data.created_at || new Date().toISOString()),
      updatedAt: String(data.updated_at || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

/**
 * Submits or updates a publisher/developer request in `public.developer_profiles`
 * and stores private payout/contact email in `public.developer_private_settings`.
 * NEVER promotes the user's role locally if the database request fails.
 */
export async function submitDeveloperProfileRequest(params: {
  userId: string;
  orgName: string;
  orgWebsite?: string | null;
  orgDescription?: string | null;
  sourceUrl?: string | null;
  payoutEmail?: string | null;
}): Promise<PublicDeveloperProfile> {
  const client = getActiveSupabaseClient();
  if (!client) {
    throw new Error('Database connection is required to register a developer profile.');
  }

  const cleanOrgName = sanitizeText(params.orgName, 100);
  if (!cleanOrgName || cleanOrgName.length < 2) {
    throw new Error('Publisher name must be at least 2 characters.');
  }
  const slug = cleanOrgName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  const cleanWebsite = params.orgWebsite?.trim() ? sanitizeUrl(params.orgWebsite.trim()) : null;
  if (params.orgWebsite?.trim() && !cleanWebsite) {
    throw new Error('Website URL must start with https://');
  }

  const cleanSourceUrl = params.sourceUrl?.trim() ? sanitizeUrl(params.sourceUrl.trim()) : null;
  if (params.sourceUrl?.trim() && !cleanSourceUrl) {
    throw new Error('Source repository URL must start with https://');
  }

  const cleanDesc = params.orgDescription ? sanitizeText(params.orgDescription, 1000) : '';

  const { data, error } = await client
    .from('developer_profiles')
    .upsert(
      {
        user_id: params.userId,
        slug: slug || `dev-${params.userId.slice(0, 8)}`,
        org_name: cleanOrgName,
        org_description: cleanDesc,
        org_website: cleanWebsite,
        source_url: cleanSourceUrl,
        status: 'pending',
        verified: false,
      },
      { onConflict: 'user_id' }
    )
    .select(
      'user_id, slug, org_name, org_description, org_website, source_url, avatar_url, verified, status, rejection_reason, created_at, updated_at'
    )
    .single();

  if (error || !data) {
    throw new Error('Could not submit developer profile request. Please try again later.');
  }

  if (params.payoutEmail?.trim()) {
    await client
      .from('developer_private_settings')
      .upsert(
        {
          user_id: params.userId,
          payout_email: params.payoutEmail.trim().slice(0, 160),
        },
        { onConflict: 'user_id' }
      )
      .then(() => {});
  }

  return {
    userId: String(data.user_id),
    slug: String(data.slug),
    orgName: String(data.org_name),
    orgDescription: String(data.org_description || ''),
    orgWebsite: data.org_website ? String(data.org_website) : null,
    sourceUrl: data.source_url ? String(data.source_url) : null,
    avatarUrl: data.avatar_url ? String(data.avatar_url) : null,
    verified: Boolean(data.verified),
    status: data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending',
    rejectionReason: data.rejection_reason ? String(data.rejection_reason) : null,
    createdAt: String(data.created_at || new Date().toISOString()),
    updatedAt: String(data.updated_at || new Date().toISOString()),
  };
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

let memoryReviewsFallback: AppReviewRecord[] = [];
let memoryNotifyPrefsFallback: LibraryNotificationPrefs = {};

function readLocalReviews(): AppReviewRecord[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
      if (!raw) return [...memoryReviewsFallback];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [...memoryReviewsFallback];
  } catch {
    return [...memoryReviewsFallback];
  }
}

function writeLocalReviews(reviews: AppReviewRecord[]): void {
  memoryReviewsFallback = [...reviews];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(reviews));
    }
  } catch {
    // ignore storage errors
  }
}

export function getLibraryNotificationPrefs(): LibraryNotificationPrefs {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_NOTIFY_PREFS_KEY);
      if (!raw) return { ...memoryNotifyPrefsFallback };
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : { ...memoryNotifyPrefsFallback };
    }
    return { ...memoryNotifyPrefsFallback };
  } catch {
    return { ...memoryNotifyPrefsFallback };
  }
}

export async function setLibraryUpdateNotification(
  userId: string | null | undefined,
  appSlug: string,
  notifyUpdates: boolean
): Promise<void> {
  const prefs = getLibraryNotificationPrefs();
  prefs[appSlug] = notifyUpdates;
  memoryNotifyPrefsFallback = { ...prefs };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_NOTIFY_PREFS_KEY, JSON.stringify(prefs));
    }
  } catch {
    // ignore storage error
  }

  const client = getActiveSupabaseClient();
  if (client && userId) {
    try {
      await client
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
      // Local preference preserved
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
  const client = getActiveSupabaseClient();
  if (!client) return;
  try {
    await client.from('downloads').insert({
      user_id: params.userId || null,
      app_slug: params.appSlug,
      version: params.version,
      arch: params.arch === 'aarch64' || params.arch === 'armhf' ? params.arch : 'x86_64',
    });
  } catch {
    // Non-blocking download history record
  }
}

/**
 * Syncs a bookmarked app into `public.library` for signed-in users.
 * Never deletes local bookmarks if sync fails.
 */
export async function syncLibraryBookmarkWithSupabase(params: {
  userId: string;
  appSlug: string;
  pinnedVersion?: string;
  bookmarked: boolean;
}): Promise<{ synced: boolean; error?: string }> {
  const client = getActiveSupabaseClient();
  if (!client || !params.userId) {
    return { synced: false };
  }
  try {
    if (params.bookmarked) {
      const { error } = await client.from('library').upsert(
        {
          user_id: params.userId,
          app_slug: params.appSlug,
          pinned_version: params.pinnedVersion || null,
          notify_updates: true,
        },
        { onConflict: 'user_id,app_slug' }
      );
      if (error) {
        return { synced: false, error: 'Sync temporarily unavailable' };
      }
    } else {
      const { error } = await client
        .from('library')
        .delete()
        .eq('user_id', params.userId)
        .eq('app_slug', params.appSlug);
      if (error) {
        return { synced: false, error: 'Sync temporarily unavailable' };
      }
    }
    return { synced: true };
  } catch {
    return { synced: false, error: 'Sync temporarily unavailable' };
  }
}

export interface SupabaseLibraryRow {
  appSlug: string;
  pinnedVersion: string | null;
  notifyUpdates: boolean;
}

export async function fetchUserLibraryFromSupabase(
  userId: string
): Promise<SupabaseLibraryRow[]> {
  const client = getActiveSupabaseClient();
  if (!client || !userId) return [];
  try {
    const { data } = await client
      .from('library')
      .select('app_slug, pinned_version, notify_updates')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!Array.isArray(data)) return [];
    const prefs = getLibraryNotificationPrefs();
    const rows = data.map((r: any) => {
      const slug = String(r.app_slug || '');
      const notify = r.notify_updates !== false;
      if (slug) prefs[slug] = notify;
      return {
        appSlug: slug,
        pinnedVersion: r.pinned_version ? String(r.pinned_version) : null,
        notifyUpdates: notify,
      };
    });
    try {
      localStorage.setItem(LOCAL_NOTIFY_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage error
    }
    return rows.filter((r) => Boolean(r.appSlug));
  } catch {
    return [];
  }
}

export interface SupabaseDownloadRow {
  appId: string;
  version: string;
  arch: string;
  timestamp: string;
}

export async function fetchUserDownloadsFromSupabase(
  userId: string
): Promise<SupabaseDownloadRow[]> {
  const client = getActiveSupabaseClient();
  if (!client || !userId) return [];
  try {
    const { data } = await client
      .from('downloads')
      .select('app_slug, version, arch, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(25);
    if (!Array.isArray(data)) return [];
    return data
      .map((r: any) => ({
        appId: String(r.app_slug || ''),
        version: String(r.version || 'Version information unavailable'),
        arch: String(r.arch || 'x86_64'),
        timestamp: String(r.created_at || new Date().toISOString()),
      }))
      .filter((r) => Boolean(r.appId));
  } catch {
    return [];
  }
}

/**
 * Fetches reviews for a given application slug (`appSlug`), combining Supabase `public.reviews`
 * (when configured) and local reviews.
 */
export async function fetchAppReviews(appSlug: string): Promise<AppReviewRecord[]> {
  const cleanSlug = appSlug.trim().toLowerCase();
  const client = getActiveSupabaseClient();
  if (client) {
    try {
      const { data: appRow } = await client
        .from('apps')
        .select('id')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (appRow?.id) {
        const { data: rows } = await client
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
            username: r.profiles?.username || 'user',
            displayName: r.profiles?.display_name || 'User',
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
      // Fall back to local reviews store when offline
    }
  }

  return readLocalReviews()
    .filter((r) => r.appSlug.toLowerCase() === cleanSlug)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Creates or updates the signed-in user's review for `appSlug` (1 review per user per app).
 * Requires an authenticated `userId`.
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
  if (!params.userId || !params.userId.trim()) {
    throw new Error('Authentication is required to post a review.');
  }
  const cleanSlug = params.appSlug.trim().toLowerCase();
  const clampedRating = Math.min(5, Math.max(1, Math.round(Number(params.rating) || 5)));
  const cleanTitle = sanitizeText(params.title, 120);
  const cleanBody = sanitizeText(params.body, 2000);
  const cleanDistro = sanitizeText(params.distro, 80);
  const now = new Date().toISOString();

  const client = getActiveSupabaseClient();
  if (client) {
    try {
      const { data: appRow } = await client
        .from('apps')
        .select('id')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (appRow?.id) {
        const { data: saved, error } = await client
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
      // Fall back to local persistence if offline
    }
  }

  const all = readLocalReviews();
  const existingIdx = all.findIndex(
    (r) => r.appSlug.toLowerCase() === cleanSlug && r.userId === params.userId
  );

  const record: AppReviewRecord = {
    id:
      existingIdx >= 0
        ? all[existingIdx].id
        : `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
  const client = getActiveSupabaseClient();
  if (client) {
    try {
      const query = client.from('reviews').delete().eq('id', params.reviewId);
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
