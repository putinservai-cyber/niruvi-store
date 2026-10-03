import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { SITE_URL, withBaseUrl } from '../config/site';
import { isLikelySecretKey, sanitizeText, sanitizeUrl, sanitizeUsername } from '../utils/sanitize';

export type MarketplaceRole = 'user' | 'publisher' | 'moderator' | 'admin';
export type OAuthProviderType = 'google' | 'github' | 'gitlab';

export type ApplicationStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'suspended'
  | 'archived';

export interface MarketplaceAppAsset {
  id: string;
  version_id: string;
  architecture: 'x86_64' | 'aarch64' | 'armhf';
  download_url: string;
  sha256: string;
  file_size: number | null;
  filename: string;
  asset_type: 'appimage' | 'checksum' | 'signature' | 'archive';
  created_at: string;
}

export interface MarketplaceAppVersion {
  id: string;
  app_id: string;
  version: string;
  release_notes: string;
  release_date: string;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected' | 'archived';
  created_at: string;
  updated_at: string;
  assets?: MarketplaceAppAsset[];
}

export interface MarketplaceApp {
  id: string;
  publisher_id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  category: string;
  license: string;
  website_url: string | null;
  source_url: string | null;
  icon_url: string | null;
  status: ApplicationStatus;
  verified: boolean;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  publisher?: {
    org_name: string;
    slug: string;
    verified: boolean;
  } | null;
  versions?: MarketplaceAppVersion[];
}

export interface ConnectedIdentity {
  id: string;
  provider: string;
  email?: string;
  created_at: string;
}

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

export interface OAuthDiagnosticsReport {
  timestamp: string;
  isConfigured: boolean;
  hasUrl: boolean;
  hasAnonKey: boolean;
  supabaseHost: string;
  clientOrigin: string;
  clientCallbackUrl: string;
  expectedGoogleCloudAuthorizedRedirectUri: string;
  expectedSupabaseRedirectUrls: string[];
  googleCloudDirectClientMismatchWarning: string;
  scopesRequested: Record<OAuthProviderType, string>;
  common403Causes: { issue: string; resolution: string }[];
}

/**
 * Returns safe diagnostic information for OAuth redirect verification without exposing sensitive keys.
 */
export function getOAuthDiagnosticsInfo(): OAuthDiagnosticsReport {
  const clientCallbackUrl = getOAuthRedirectUrl();
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : SITE_URL;
  let supabaseHost = 'Not configured';
  let expectedGoogleCloudRedirect = 'https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback';

  if (SUPABASE_URL) {
    try {
      const parsed = new URL(SUPABASE_URL);
      supabaseHost = parsed.host;
      expectedGoogleCloudRedirect = `https://${parsed.host}/auth/v1/callback`;
    } catch {
      supabaseHost = SUPABASE_URL.replace(/^https?:\/\//, '').split('/')[0];
      expectedGoogleCloudRedirect = `https://${supabaseHost}/auth/v1/callback`;
    }
  }

  return {
    timestamp: new Date().toISOString(),
    isConfigured: isSupabaseConfigured(),
    hasUrl: Boolean(SUPABASE_URL),
    hasAnonKey: Boolean(SUPABASE_ANON_KEY),
    supabaseHost,
    clientOrigin: origin,
    clientCallbackUrl,
    expectedGoogleCloudAuthorizedRedirectUri: expectedGoogleCloudRedirect,
    expectedSupabaseRedirectUrls: Array.from(
      new Set([
        'https://niruvi-store.runs-on.dev/auth/callback',
        'http://localhost:3000/auth/callback',
        'https://ais-dev-6sj7a5cnnuxlayn7qsnzns-213626740267.asia-southeast1.run.app/auth/callback',
        clientCallbackUrl,
      ])
    ),
    googleCloudDirectClientMismatchWarning:
      "CRITICAL: In Google Cloud Console (APIs & Services > Credentials > OAuth 2.0 Client), 'Authorized redirect URIs' MUST be set to the Supabase backend URL (" +
      expectedGoogleCloudRedirect +
      "), NOT the client app URL ('https://niruvi-store.runs-on.dev/auth/callback'). The client app callback URL belongs in Supabase Dashboard > Authentication > URL Configuration.",
    scopesRequested: {
      google: 'openid email profile',
      github: 'read:user user:email',
      gitlab: 'read_user email',
    },
    common403Causes: [
      {
        issue: "OAuth Consent Screen in 'Testing' Status",
        resolution:
          "In Google Cloud Console > OAuth consent screen, either click 'Publish App' (to allow all users) or add your email address under 'Test users'.",
      },
      {
        issue: "OAuth Consent Screen User Type is 'Internal'",
        resolution:
          "Set User Type to 'External' in Google Cloud Console if users with standard @gmail.com accounts need access.",
      },
      {
        issue: 'Redirect URI Mismatch in Google Cloud Console',
        resolution: `Ensure Authorized redirect URIs in Google Cloud Console exactly matches '${expectedGoogleCloudRedirect}'.`,
      },
    ],
  };
}

/**
 * Safely prints the OAuth diagnostic report to the browser console.
 */
export function logOAuthDiagnostics(): OAuthDiagnosticsReport {
  const diagnostics = getOAuthDiagnosticsInfo();
  console.group('%c[Niruvi Store — OAuth Diagnostics]', 'color: #38bdf8; font-weight: bold;');
  console.info('Timestamp:', diagnostics.timestamp);
  console.info('Supabase Configured:', diagnostics.isConfigured);
  console.info('Supabase Host:', diagnostics.supabaseHost);
  console.info('Client Origin:', diagnostics.clientOrigin);
  console.info('Client App Callback URL:', diagnostics.clientCallbackUrl);
  console.info(
    '%cGoogle Cloud Console Authorized Redirect URI (MUST BE):',
    'color: #22c55e; font-weight: bold;',
    diagnostics.expectedGoogleCloudAuthorizedRedirectUri
  );
  console.warn(
    '%cConfiguration Verification Notice:',
    'color: #f59e0b; font-weight: bold;',
    diagnostics.googleCloudDirectClientMismatchWarning
  );
  console.info('Supabase Required Redirect URLs:', diagnostics.expectedSupabaseRedirectUrls);
  console.table(diagnostics.common403Causes);
  console.groupEnd();
  return diagnostics;
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
  if (
    lower.includes('user cancelled') ||
    lower.includes('cancelled by user') ||
    lower.includes('access_denied by user') ||
    lower.includes('closed by user')
  ) {
    return providerLabel
      ? `${providerLabel} sign-in was cancelled.`
      : 'Sign-in was cancelled.';
  }
  if (
    lower.includes('403') ||
    lower.includes('access_denied') ||
    lower.includes('org_internal') ||
    lower.includes('restricted_client') ||
    lower.includes('not have access') ||
    lower.includes('test user') ||
    lower.includes('blocked by google')
  ) {
    if (providerOrContext === 'google' || providerLabel === 'Google') {
      return 'Google sign-in was blocked by Google (403). Check your Google Cloud OAuth Consent Screen audience, test-user access list, and Supabase redirect configuration.';
    }
    return providerLabel
      ? `${providerLabel} sign-in was cancelled or access was denied.`
      : 'Sign-in was cancelled or access was denied.';
  }
  if (lower.includes('cancel') || lower.includes('closed')) {
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

  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.DEV) {
    console.info(
      `[Niruvi Auth] Initiating OAuth sign-in -> Provider: ${provider}, Redirect URI: ${redirectTo}`
    );
  }

  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      scopes: scopesByProvider[provider],
    },
  });

  if (error) {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.DEV) {
      console.warn(`[Niruvi Auth] OAuth initiation error (${provider}):`, error.message);
    }
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

// ============================================================================
// PUBLISHER, APPLICATION, AND RELEASE MANAGEMENT
// ============================================================================

export function validateReleaseMetadata(params: {
  version: string;
  architecture: string;
  downloadUrl: string;
  sha256: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const cleanVer = (params.version || '').trim();
  if (!cleanVer || ['latest', 'vlatest', 'unknown'].includes(cleanVer.toLowerCase())) {
    errors.push('Specific version number is required (e.g. 1.0.0, 4.3.2). "latest" is disallowed.');
  }

  const cleanArch = (params.architecture || '').trim();
  if (!['x86_64', 'aarch64', 'armhf'].includes(cleanArch)) {
    errors.push('Architecture must be x86_64, aarch64, or armhf.');
  }

  const cleanUrl = (params.downloadUrl || '').trim();
  if (!cleanUrl.startsWith('https://')) {
    errors.push('Download URL must be a valid secure https:// URL.');
  }
  if (!cleanUrl.toLowerCase().endsWith('.appimage')) {
    errors.push('Download URL must point directly to a standalone .AppImage package.');
  }

  const cleanSha = (params.sha256 || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(cleanSha)) {
    errors.push('SHA-256 must be an exact 64-character hexadecimal digest.');
  }

  return { valid: errors.length === 0, errors };
}

export interface ExternalReleaseImportResult {
  version: string;
  releaseNotes: string;
  assets: Array<{
    architecture: 'x86_64' | 'aarch64' | 'armhf';
    downloadUrl: string;
    filename: string;
    fileSize: number | null;
  }>;
}

/**
 * Fetches latest release from GitHub API, detecting AppImage assets and architecture.
 */
export async function importReleaseFromGitHub(repoUrl: string): Promise<ExternalReleaseImportResult> {
  const match = repoUrl.trim().match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) {
    throw new Error('Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo).');
  }
  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, '').split('#')[0].split('?')[0];

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`No published releases found for GitHub repository ${owner}/${repo}.`);
    }
    throw new Error(`GitHub API returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  const rawAssets = Array.isArray(data.assets) ? data.assets : [];
  const appimageAssets = rawAssets.filter((a: any) =>
    String(a.name || '').toLowerCase().endsWith('.appimage')
  );

  if (appimageAssets.length === 0) {
    throw new Error('The latest GitHub release does not contain any asset ending with ".AppImage".');
  }

  const rawTag = String(data.tag_name || data.name || '').replace(/^v/i, '').trim();
  const version = rawTag || '1.0.0';

  const assets = appimageAssets.map((a: any) => {
    const filename = String(a.name || '');
    const lowerName = filename.toLowerCase();
    let arch: 'x86_64' | 'aarch64' | 'armhf' = 'x86_64';
    if (lowerName.includes('aarch64') || lowerName.includes('arm64')) {
      arch = 'aarch64';
    } else if (lowerName.includes('armhf') || lowerName.includes('armv7')) {
      arch = 'armhf';
    }
    return {
      architecture: arch,
      downloadUrl: String(a.browser_download_url || ''),
      filename,
      fileSize: typeof a.size === 'number' ? a.size : null,
    };
  });

  return {
    version,
    releaseNotes: sanitizeText(String(data.body || ''), 4000),
    assets,
  };
}

/**
 * Fetches latest release from GitLab API, detecting AppImage assets and architecture.
 */
export async function importReleaseFromGitLab(repoUrl: string): Promise<ExternalReleaseImportResult> {
  const match = repoUrl.trim().match(/gitlab\.com\/([^/]+(?:\/[^/]+)*)/i);
  if (!match) {
    throw new Error('Please enter a valid GitLab project URL (e.g. https://gitlab.com/group/project).');
  }
  const projectPath = encodeURIComponent(match[1].replace(/\.git$/i, '').split('#')[0].split('?')[0]);

  const response = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/releases`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`GitLab API returned HTTP ${response.status}.`);
  }

  const releases = await response.json();
  if (!Array.isArray(releases) || releases.length === 0) {
    throw new Error('No published releases found for this GitLab project.');
  }

  const latest = releases[0];
  const rawTag = String(latest.tag_name || latest.name || '').replace(/^v/i, '').trim();
  const version = rawTag || '1.0.0';

  const sources = latest.assets?.links || [];
  const appimageAssets = sources.filter((s: any) =>
    String(s.name || s.url || '').toLowerCase().endsWith('.appimage')
  );

  if (appimageAssets.length === 0) {
    throw new Error('The latest GitLab release does not contain any link ending with ".AppImage".');
  }

  const assets = appimageAssets.map((a: any) => {
    const filename = String(a.name || 'package.AppImage');
    const lowerName = filename.toLowerCase();
    let arch: 'x86_64' | 'aarch64' | 'armhf' = 'x86_64';
    if (lowerName.includes('aarch64') || lowerName.includes('arm64')) {
      arch = 'aarch64';
    } else if (lowerName.includes('armhf') || lowerName.includes('armv7')) {
      arch = 'armhf';
    }
    return {
      architecture: arch,
      downloadUrl: String(a.url || ''),
      filename,
      fileSize: null,
    };
  });

  return {
    version,
    releaseNotes: sanitizeText(String(latest.description || ''), 4000),
    assets,
  };
}

/**
 * Fetches applications owned by a publisher (or all apps if moderator/admin).
 */
export async function fetchPublisherApplications(userId: string): Promise<MarketplaceApp[]> {
  const client = getActiveSupabaseClient();
  if (!client || !userId) return [];

  const { data, error } = await client
    .from('apps')
    .select(
      'id, publisher_id, name, slug, short_description, description, category, license, website_url, source_url, icon_url, status, verified, rejection_reason, created_at, updated_at'
    )
    .eq('publisher_id', userId)
    .order('updated_at', { ascending: false });

  if (error || !Array.isArray(data)) return [];

  return data.map((r: any) => ({
    id: String(r.id),
    publisher_id: String(r.publisher_id),
    name: String(r.name),
    slug: String(r.slug),
    short_description: String(r.short_description || ''),
    description: String(r.description || ''),
    category: String(r.category || 'Utilities'),
    license: String(r.license || 'Open Source'),
    website_url: r.website_url ? String(r.website_url) : null,
    source_url: r.source_url ? String(r.source_url) : null,
    icon_url: r.icon_url ? String(r.icon_url) : null,
    status: (r.status as ApplicationStatus) || 'draft',
    verified: Boolean(r.verified),
    rejection_reason: r.rejection_reason ? String(r.rejection_reason) : null,
    created_at: String(r.created_at || new Date().toISOString()),
    updated_at: String(r.updated_at || new Date().toISOString()),
  }));
}

/**
 * Creates a new draft application for a publisher in Supabase PostgreSQL.
 */
export async function createPublisherApplication(params: {
  publisherId: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: string;
  license: string;
  websiteUrl?: string | null;
  sourceUrl?: string | null;
  iconUrl?: string | null;
}): Promise<MarketplaceApp> {
  const client = getActiveSupabaseClient();
  if (!client) {
    throw new Error('Database connection is required to create an application.');
  }

  const cleanName = sanitizeText(params.name, 100);
  if (!cleanName || cleanName.length < 2) {
    throw new Error('Application name must be at least 2 characters.');
  }

  const cleanSlug = params.slug
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  if (!cleanSlug || cleanSlug.length < 2) {
    throw new Error('Application slug must be at least 2 alphanumeric characters.');
  }

  const cleanShortDesc = sanitizeText(params.shortDescription || params.description.slice(0, 200), 240);
  const cleanDesc = sanitizeText(params.description, 4000);
  const cleanCategory = sanitizeText(params.category, 60) || 'Utilities';
  const cleanLicense = sanitizeText(params.license, 80) || 'GPL-3.0';
  const cleanWebsite = params.websiteUrl?.trim() ? sanitizeUrl(params.websiteUrl.trim()) : null;
  const cleanSource = params.sourceUrl?.trim() ? sanitizeUrl(params.sourceUrl.trim()) : null;
  const cleanIcon = params.iconUrl?.trim() ? sanitizeUrl(params.iconUrl.trim()) : null;

  const { data, error } = await client
    .from('apps')
    .insert({
      publisher_id: params.publisherId,
      name: cleanName,
      slug: cleanSlug,
      short_description: cleanShortDesc,
      description: cleanDesc,
      category: cleanCategory,
      license: cleanLicense,
      website_url: cleanWebsite,
      source_url: cleanSource,
      icon_url: cleanIcon,
      status: 'draft',
      verified: false,
    })
    .select(
      'id, publisher_id, name, slug, short_description, description, category, license, website_url, source_url, icon_url, status, verified, created_at, updated_at'
    )
    .single();

  if (error || !data) {
    if (error?.message?.toLowerCase().includes('unique') || error?.message?.toLowerCase().includes('slug')) {
      throw new Error(`Application slug "${cleanSlug}" is already taken. Please choose another.`);
    }
    throw new Error('Application could not be created in the marketplace.');
  }

  return {
    id: String(data.id),
    publisher_id: String(data.publisher_id),
    name: String(data.name),
    slug: String(data.slug),
    short_description: String(data.short_description || ''),
    description: String(data.description || ''),
    category: String(data.category),
    license: String(data.license),
    website_url: data.website_url ? String(data.website_url) : null,
    source_url: data.source_url ? String(data.source_url) : null,
    icon_url: data.icon_url ? String(data.icon_url) : null,
    status: (data.status as ApplicationStatus) || 'draft',
    verified: Boolean(data.verified),
    created_at: String(data.created_at || new Date().toISOString()),
    updated_at: String(data.updated_at || new Date().toISOString()),
  };
}

/**
 * Updates application metadata for a publisher.
 */
export async function updatePublisherApplication(
  appId: string,
  params: {
    name?: string;
    shortDescription?: string;
    description?: string;
    category?: string;
    license?: string;
    websiteUrl?: string | null;
    sourceUrl?: string | null;
    iconUrl?: string | null;
  }
): Promise<MarketplaceApp> {
  const client = getActiveSupabaseClient();
  if (!client) {
    throw new Error('Database connection is required to update application.');
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (params.name !== undefined) updates.name = sanitizeText(params.name, 100);
  if (params.shortDescription !== undefined) updates.short_description = sanitizeText(params.shortDescription, 240);
  if (params.description !== undefined) updates.description = sanitizeText(params.description, 4000);
  if (params.category !== undefined) updates.category = sanitizeText(params.category, 60);
  if (params.license !== undefined) updates.license = sanitizeText(params.license, 80);
  if (params.websiteUrl !== undefined) updates.website_url = params.websiteUrl ? sanitizeUrl(params.websiteUrl) : null;
  if (params.sourceUrl !== undefined) updates.source_url = params.sourceUrl ? sanitizeUrl(params.sourceUrl) : null;
  if (params.iconUrl !== undefined) updates.icon_url = params.iconUrl ? sanitizeUrl(params.iconUrl) : null;

  const { data, error } = await client
    .from('apps')
    .update(updates)
    .eq('id', appId)
    .select(
      'id, publisher_id, name, slug, short_description, description, category, license, website_url, source_url, icon_url, status, verified, rejection_reason, created_at, updated_at'
    )
    .single();

  if (error || !data) {
    throw new Error('Failed to update application details.');
  }

  return {
    id: String(data.id),
    publisher_id: String(data.publisher_id),
    name: String(data.name),
    slug: String(data.slug),
    short_description: String(data.short_description || ''),
    description: String(data.description || ''),
    category: String(data.category),
    license: String(data.license),
    website_url: data.website_url ? String(data.website_url) : null,
    source_url: data.source_url ? String(data.source_url) : null,
    icon_url: data.icon_url ? String(data.icon_url) : null,
    status: (data.status as ApplicationStatus) || 'draft',
    verified: Boolean(data.verified),
    rejection_reason: data.rejection_reason ? String(data.rejection_reason) : null,
    created_at: String(data.created_at || new Date().toISOString()),
    updated_at: String(data.updated_at || new Date().toISOString()),
  };
}

/**
 * Submits an application for moderator review (status becomes 'pending_review').
 */
export async function submitApplicationForReview(appId: string): Promise<MarketplaceApp> {
  const client = getActiveSupabaseClient();
  if (!client) {
    throw new Error('Database connection required.');
  }

  const { data, error } = await client
    .from('apps')
    .update({
      status: 'pending_review',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appId)
    .select(
      'id, publisher_id, name, slug, short_description, description, category, license, website_url, source_url, icon_url, status, verified, rejection_reason, created_at, updated_at'
    )
    .single();

  if (error || !data) {
    throw new Error('Application could not be submitted for review.');
  }

  return {
    id: String(data.id),
    publisher_id: String(data.publisher_id),
    name: String(data.name),
    slug: String(data.slug),
    short_description: String(data.short_description || ''),
    description: String(data.description || ''),
    category: String(data.category),
    license: String(data.license),
    website_url: data.website_url ? String(data.website_url) : null,
    source_url: data.source_url ? String(data.source_url) : null,
    icon_url: data.icon_url ? String(data.icon_url) : null,
    status: (data.status as ApplicationStatus) || 'pending_review',
    verified: Boolean(data.verified),
    rejection_reason: data.rejection_reason ? String(data.rejection_reason) : null,
    created_at: String(data.created_at || new Date().toISOString()),
    updated_at: String(data.updated_at || new Date().toISOString()),
  };
}

/**
 * Fetches versions and binary assets for an application.
 */
export async function fetchAppVersionsWithAssets(appId: string): Promise<MarketplaceAppVersion[]> {
  const client = getActiveSupabaseClient();
  if (!client || !appId) return [];

  const { data: verRows, error: verErr } = await client
    .from('app_versions')
    .select('id, app_id, version, release_notes, release_date, status, created_at, updated_at')
    .eq('app_id', appId)
    .order('release_date', { ascending: false });

  if (verErr || !Array.isArray(verRows)) return [];

  const versionIds = verRows.map((v) => v.id);
  let assetsByVersion: Record<string, MarketplaceAppAsset[]> = {};

  if (versionIds.length > 0) {
    const { data: assetRows } = await client
      .from('app_assets')
      .select('id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at')
      .in('version_id', versionIds);

    if (Array.isArray(assetRows)) {
      assetsByVersion = assetRows.reduce((acc: Record<string, MarketplaceAppAsset[]>, r: any) => {
        const vId = String(r.version_id);
        if (!acc[vId]) acc[vId] = [];
        acc[vId].push({
          id: String(r.id),
          version_id: vId,
          architecture: r.architecture,
          download_url: String(r.download_url),
          sha256: String(r.sha256),
          file_size: typeof r.file_size === 'number' ? r.file_size : null,
          filename: String(r.filename || ''),
          asset_type: r.asset_type || 'appimage',
          created_at: String(r.created_at || new Date().toISOString()),
        });
        return acc;
      }, {});
    }
  }

  return verRows.map((v: any) => ({
    id: String(v.id),
    app_id: String(v.app_id),
    version: String(v.version),
    release_notes: String(v.release_notes || ''),
    release_date: String(v.release_date || v.created_at || new Date().toISOString()),
    status: v.status || 'published',
    created_at: String(v.created_at || new Date().toISOString()),
    updated_at: String(v.updated_at || new Date().toISOString()),
    assets: assetsByVersion[String(v.id)] || [],
  }));
}

/**
 * Creates a new release version and attaches multi-architecture AppImage assets.
 */
export async function createAppVersionWithAssets(params: {
  appId: string;
  version: string;
  releaseNotes: string;
  releaseDate?: string;
  architecture: 'x86_64' | 'aarch64' | 'armhf';
  downloadUrl: string;
  sha256: string;
  fileSize?: number | null;
  filename?: string;
}): Promise<MarketplaceAppVersion> {
  const client = getActiveSupabaseClient();
  if (!client) {
    throw new Error('Database connection is required to create a release.');
  }

  const validation = validateReleaseMetadata({
    version: params.version,
    architecture: params.architecture,
    downloadUrl: params.downloadUrl,
    sha256: params.sha256,
  });
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  const cleanVersion = params.version.trim();
  const cleanNotes = sanitizeText(params.releaseNotes || '', 4000);
  const releaseDate = params.releaseDate || new Date().toISOString();

  // 1. Insert app_version
  const { data: verData, error: verError } = await client
    .from('app_versions')
    .insert({
      app_id: params.appId,
      version: cleanVersion,
      release_notes: cleanNotes,
      release_date: releaseDate,
      status: 'published',
    })
    .select('id, app_id, version, release_notes, release_date, status, created_at, updated_at')
    .single();

  if (verError || !verData) {
    if (verError?.message?.toLowerCase().includes('unique') || verError?.message?.toLowerCase().includes('version')) {
      throw new Error(`Version ${cleanVersion} already exists for this application.`);
    }
    throw new Error('Failed to create application release version.');
  }

  // 2. Insert app_asset
  const filename =
    params.filename?.trim() ||
    params.downloadUrl.split('/').pop()?.split('?')[0] ||
    `${cleanVersion}.AppImage`;

  const { data: assetData, error: assetError } = await client
    .from('app_assets')
    .insert({
      version_id: verData.id,
      architecture: params.architecture,
      download_url: params.downloadUrl.trim(),
      sha256: params.sha256.trim().toLowerCase(),
      file_size: typeof params.fileSize === 'number' ? params.fileSize : null,
      filename,
      asset_type: 'appimage',
    })
    .select('id, version_id, architecture, download_url, sha256, file_size, filename, asset_type, created_at')
    .single();

  if (assetError || !assetData) {
    throw new Error('Version created, but failed to attach binary asset.');
  }

  return {
    id: String(verData.id),
    app_id: String(verData.app_id),
    version: String(verData.version),
    release_notes: String(verData.release_notes || ''),
    release_date: String(verData.release_date),
    status: verData.status,
    created_at: String(verData.created_at),
    updated_at: String(verData.updated_at),
    assets: [
      {
        id: String(assetData.id),
        version_id: String(assetData.version_id),
        architecture: assetData.architecture,
        download_url: String(assetData.download_url),
        sha256: String(assetData.sha256),
        file_size: assetData.file_size,
        filename: String(assetData.filename),
        asset_type: assetData.asset_type,
        created_at: String(assetData.created_at),
      },
    ],
  };
}

/**
 * Fetches a single public application by slug with its versions and assets.
 */
export async function fetchPublicMarketplaceApp(slug: string): Promise<MarketplaceApp | null> {
  const cleanSlug = slug.trim().toLowerCase();
  const client = getActiveSupabaseClient();
  if (!client || !cleanSlug) return null;

  try {
    const { data: appRow, error } = await client
      .from('apps')
      .select(
        'id, publisher_id, name, slug, short_description, description, category, license, website_url, source_url, icon_url, status, verified, rejection_reason, created_at, updated_at, publisher_profiles(org_name, slug, verified)'
      )
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (error || !appRow) return null;

    const versions = await fetchAppVersionsWithAssets(appRow.id);

    return {
      id: String(appRow.id),
      publisher_id: String(appRow.publisher_id),
      name: String(appRow.name),
      slug: String(appRow.slug),
      short_description: String(appRow.short_description || ''),
      description: String(appRow.description || ''),
      category: String(appRow.category || 'Utilities'),
      license: String(appRow.license || 'Open Source'),
      website_url: appRow.website_url ? String(appRow.website_url) : null,
      source_url: appRow.source_url ? String(appRow.source_url) : null,
      icon_url: appRow.icon_url ? String(appRow.icon_url) : null,
      status: (appRow.status as ApplicationStatus) || 'published',
      verified: Boolean(appRow.verified),
      rejection_reason: appRow.rejection_reason ? String(appRow.rejection_reason) : null,
      created_at: String(appRow.created_at || new Date().toISOString()),
      updated_at: String(appRow.updated_at || new Date().toISOString()),
      publisher: (() => {
        const rawPub = appRow.publisher_profiles as unknown;
        const pub = Array.isArray(rawPub) ? (rawPub[0] as Record<string, unknown> | undefined) : (rawPub as Record<string, unknown> | null | undefined);
        if (!pub) return null;
        return {
          org_name: String(pub.org_name || ''),
          slug: String(pub.slug || ''),
          verified: Boolean(pub.verified),
        };
      })(),
      versions,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// CONNECTED IDENTITY & SECURITY MANAGEMENT
// ============================================================================

/**
 * Returns connected OAuth identities for the active authenticated user.
 */
export async function fetchUserIdentities(): Promise<ConnectedIdentity[]> {
  const client = getActiveSupabaseClient();
  if (!client) return [];

  try {
    const { data } = await client.auth.getUser();
    if (!data?.user) return [];

    const rawIdentities = data.user.identities || [];
    return rawIdentities.map((i: any) => ({
      id: String(i.id || i.identity_id || ''),
      provider: String(i.provider || 'email'),
      email: typeof i.identity_data?.email === 'string' ? i.identity_data.email : undefined,
      created_at: String(i.created_at || new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}

/**
 * Connects an additional OAuth identity (Google, GitHub, or GitLab) to the signed-in account.
 */
export async function linkOAuthProvider(provider: OAuthProviderType): Promise<void> {
  const client = getActiveSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  const redirectTo = getOAuthRedirectUrl();
  const { error } = await client.auth.linkIdentity({
    provider,
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw new Error(formatSupabaseAuthError(error, provider));
  }
}

/**
 * Unlinks an identity from the user's account if more than one authentication method exists.
 */
export async function unlinkIdentity(identityId: string): Promise<void> {
  const client = getActiveSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  const { data } = await client.auth.getUser();
  const identities = data?.user?.identities || [];

  if (identities.length <= 1) {
    throw new Error('Cannot disconnect your only authentication method.');
  }

  const targetIdentity = identities.find((i: any) => (i.id || i.identity_id) === identityId);
  if (!targetIdentity) {
    throw new Error('Identity not found on this account.');
  }

  const { error } = await client.auth.unlinkIdentity(targetIdentity);
  if (error) {
    throw new Error(formatSupabaseAuthError(error));
  }
}

/**
 * Changes password for the currently signed-in user.
 */
export async function changeUserPassword(newPassword: string): Promise<void> {
  const cleanPass = newPassword.trim();
  if (!cleanPass || cleanPass.length < 10) {
    throw new Error('New password must be at least 10 characters long.');
  }

  const client = getActiveSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  const { error } = await client.auth.updateUser({
    password: cleanPass,
  });

  if (error) {
    throw new Error(formatSupabaseAuthError(error));
  }
}

// ============================================================================
// MODERATION & AUDIT
// ============================================================================

export async function fetchModerationQueue(): Promise<{
  pendingApps: MarketplaceApp[];
  pendingPublishers: PublicDeveloperProfile[];
}> {
  const client = getActiveSupabaseClient();
  if (!client) return { pendingApps: [], pendingPublishers: [] };

  const [appsRes, pubRes] = await Promise.all([
    client
      .from('apps')
      .select(
        'id, publisher_id, name, slug, short_description, description, category, license, website_url, source_url, icon_url, status, verified, rejection_reason, created_at, updated_at'
      )
      .in('status', ['pending_review', 'pending'])
      .order('created_at', { ascending: false }),
    client
      .from('publisher_profiles')
      .select(
        'user_id, slug, org_name, org_description, org_website, source_url, avatar_url, verified, status, rejection_reason, created_at, updated_at'
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ]);

  const pendingApps: MarketplaceApp[] = Array.isArray(appsRes.data)
    ? appsRes.data.map((r: any) => ({
        id: String(r.id),
        publisher_id: String(r.publisher_id),
        name: String(r.name),
        slug: String(r.slug),
        short_description: String(r.short_description || ''),
        description: String(r.description || ''),
        category: String(r.category || 'Utilities'),
        license: String(r.license || 'Open Source'),
        website_url: r.website_url ? String(r.website_url) : null,
        source_url: r.source_url ? String(r.source_url) : null,
        icon_url: r.icon_url ? String(r.icon_url) : null,
        status: (r.status as ApplicationStatus) || 'pending_review',
        verified: Boolean(r.verified),
        rejection_reason: r.rejection_reason ? String(r.rejection_reason) : null,
        created_at: String(r.created_at || new Date().toISOString()),
        updated_at: String(r.updated_at || new Date().toISOString()),
      }))
    : [];

  const pendingPublishers: PublicDeveloperProfile[] = Array.isArray(pubRes.data)
    ? pubRes.data.map((r: any) => ({
        userId: String(r.user_id),
        slug: String(r.slug),
        orgName: String(r.org_name),
        orgDescription: String(r.org_description || ''),
        orgWebsite: r.org_website ? String(r.org_website) : null,
        sourceUrl: r.source_url ? String(r.source_url) : null,
        avatarUrl: r.avatar_url ? String(r.avatar_url) : null,
        verified: Boolean(r.verified),
        status: r.status,
        rejectionReason: r.rejection_reason ? String(r.rejection_reason) : null,
        createdAt: String(r.created_at || new Date().toISOString()),
        updatedAt: String(r.updated_at || new Date().toISOString()),
      }))
    : [];

  return { pendingApps, pendingPublishers };
}

export async function moderateApplication(
  appId: string,
  action: 'approve' | 'reject' | 'request_changes' | 'suspend' | 'restore',
  reason?: string
): Promise<void> {
  const client = getActiveSupabaseClient();
  if (!client) {
    throw new Error('Database connection required.');
  }

  let newStatus: ApplicationStatus = 'published';
  if (action === 'approve') newStatus = 'published';
  else if (action === 'reject') newStatus = 'rejected';
  else if (action === 'request_changes') newStatus = 'draft';
  else if (action === 'suspend') newStatus = 'suspended';
  else if (action === 'restore') newStatus = 'published';

  const { error } = await client
    .from('apps')
    .update({
      status: newStatus,
      rejection_reason: reason ? sanitizeText(reason, 500) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appId);

  if (error) {
    throw new Error('Failed to update application status.');
  }

  // Audit log record
  const { data: authData } = await client.auth.getUser();
  if (authData?.user) {
    await client.from('audit_log').insert({
      actor_id: authData.user.id,
      action: `application_${action}`,
      target_type: 'app',
      target_id: appId,
      metadata: { reason: reason || null, newStatus },
    }).then(() => {});
  }
}

export async function moderatePublisher(
  userId: string,
  action: 'approve' | 'reject' | 'unverify',
  reason?: string
): Promise<void> {
  const client = getActiveSupabaseClient();
  if (!client) {
    throw new Error('Database connection required.');
  }

  const isApproved = action === 'approve';
  const newStatus = isApproved ? 'approved' : action === 'reject' ? 'rejected' : 'approved';
  const isVerified = action === 'approve';

  const { error } = await client
    .from('publisher_profiles')
    .update({
      status: newStatus,
      verified: isVerified,
      rejection_reason: reason ? sanitizeText(reason, 500) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to update publisher status.');
  }

  // Also update role in profiles if approved
  if (isApproved) {
    await client
      .from('profiles')
      .update({ role: 'publisher' })
      .eq('id', userId)
      .then(() => {});
  }

  // Audit log record
  const { data: authData } = await client.auth.getUser();
  if (authData?.user) {
    await client.from('audit_log').insert({
      actor_id: authData.user.id,
      action: `publisher_${action}`,
      target_type: 'publisher',
      target_id: userId,
      metadata: { reason: reason || null, newStatus, isVerified },
    }).then(() => {});
  }
}

