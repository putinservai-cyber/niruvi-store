import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User as SupabaseAuthUser } from '@supabase/supabase-js';
import {
  getActiveSupabaseClient,
  isSupabaseConfigured,
  signInWithSupabaseOAuth,
  fetchSupabaseUserProfile,
  updateSupabaseUserProfile,
  checkSupabaseUsernameAvailability,
  fetchUserDeveloperProfile,
  submitDeveloperProfileRequest,
  formatSupabaseAuthError,
  getOAuthRedirectUrl,
  MarketplaceRole,
  SupabaseProfileRow,
} from '../lib/supabase';
import { sanitizeText, sanitizeUrl, sanitizeUsername } from '../utils/sanitize';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  websiteUrl?: string | null;
  role: 'USER' | 'DEVELOPER' | 'ADMIN' | 'MODERATOR';
  dbRole: MarketplaceRole;
  authProvider?: string | null;
  avatarUrl?: string | null;
  plan?: 'free' | 'supporter' | 'pro_developer' | 'team';
  isPro?: boolean;
}

export interface DeveloperProfile {
  id: string;
  userId: string;
  slug?: string;
  orgName: string;
  orgWebsite?: string | null;
  orgDescription?: string | null;
  sourceUrl?: string | null;
  verified: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  payoutEmail: string;
}

interface AuthContextType {
  user: UserProfile | null;
  developerProfile: DeveloperProfile | null;
  token: string | null;
  loading: boolean;
  isPro: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithGitlab: () => Promise<void>;
  updateUserProfile: (updates: {
    displayName: string;
    username: string;
    bio?: string;
    websiteUrl?: string;
  }) => Promise<void>;
  loginWithCredentials: (
    login: string,
    password?: string,
    turnstileToken?: string
  ) => Promise<void>;
  registerWithCredentials: (
    email: string,
    password: string,
    username: string,
    displayName: string,
    turnstileToken?: string
  ) => Promise<void>;
  resetPassword: (email: string, turnstileToken?: string) => Promise<void>;
  checkUsernameAvailability: (
    username: string
  ) => Promise<{ available: boolean; error?: string }>;
  becomeDeveloper: (data: {
    orgName: string;
    orgWebsite?: string;
    orgDescription?: string;
    sourceUrl?: string;
    payoutEmail: string;
  }) => Promise<void>;
  upgradePlan: (planId: string, licenseKey?: string, paymentId?: string) => Promise<void>;
  activateLicense: (
    key: string
  ) => Promise<{ success: boolean; plan?: string; message?: string }>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAccountModalOpen: boolean;
  openAccountModal: () => void;
  closeAccountModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapDatabaseRoleToUiRole(dbRole?: MarketplaceRole | null): UserProfile['role'] {
  switch (dbRole) {
    case 'admin':
      return 'ADMIN';
    case 'moderator':
      return 'MODERATOR';
    case 'publisher':
      return 'DEVELOPER';
    case 'user':
    default:
      return 'USER';
  }
}

function buildUserProfileFromDatabase(
  authUser: SupabaseAuthUser,
  profileRow: SupabaseProfileRow | null
): UserProfile {
  const authoritativeDbRole: MarketplaceRole =
    profileRow?.role === 'admin' ||
    profileRow?.role === 'moderator' ||
    profileRow?.role === 'publisher'
      ? profileRow.role
      : 'user';

  const uiRole = mapDatabaseRoleToUiRole(authoritativeDbRole);
  const rawUsername =
    profileRow?.username ||
    String(authUser.user_metadata?.username || authUser.user_metadata?.user_name || '') ||
    (authUser.email || '').split('@')[0] ||
    `user_${authUser.id.slice(0, 6)}`;

  const cleanUsername = sanitizeUsername(rawUsername, 24) || `user_${authUser.id.slice(0, 6)}`;
  const cleanDisplayName = sanitizeText(
    profileRow?.display_name ||
      String(
        authUser.user_metadata?.display_name ||
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          cleanUsername
      ),
    60
  );

  const provider =
    profileRow?.auth_provider ||
    String(authUser.app_metadata?.provider || 'email');

  return {
    id: authUser.id,
    email: authUser.email || profileRow?.email || '',
    username: cleanUsername,
    displayName: cleanDisplayName,
    bio: profileRow?.bio ? sanitizeText(profileRow.bio, 500) : '',
    websiteUrl: profileRow?.website_url ? sanitizeUrl(profileRow.website_url) : null,
    role: uiRole,
    dbRole: authoritativeDbRole,
    authProvider: provider,
    avatarUrl: profileRow?.avatar_url
      ? sanitizeUrl(profileRow.avatar_url)
      : typeof authUser.user_metadata?.avatar_url === 'string'
        ? sanitizeUrl(authUser.user_metadata.avatar_url)
        : null,
    plan: uiRole === 'DEVELOPER' || uiRole === 'ADMIN' ? 'pro_developer' : 'free',
    isPro: uiRole === 'DEVELOPER' || uiRole === 'ADMIN',
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);

  const isPro = Boolean(user?.role === 'DEVELOPER' || user?.role === 'ADMIN');

  const loadAuthenticatedProfile = useCallback(
    async (authUser: SupabaseAuthUser | null, accessToken: string | null) => {
      if (!authUser) {
        setUser(null);
        setDeveloperProfile(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const [profileRow, devRow] = await Promise.all([
          fetchSupabaseUserProfile(authUser),
          fetchUserDeveloperProfile(authUser.id),
        ]);
        const nextUser = buildUserProfileFromDatabase(authUser, profileRow);
        setUser(nextUser);
        setToken(accessToken);

        if (devRow) {
          setDeveloperProfile({
            id: `dev_${devRow.userId}`,
            userId: devRow.userId,
            slug: devRow.slug,
            orgName: devRow.orgName,
            orgWebsite: devRow.orgWebsite,
            orgDescription: devRow.orgDescription,
            sourceUrl: devRow.sourceUrl,
            verified: devRow.verified,
            status: devRow.status,
            rejectionReason: devRow.rejectionReason,
            payoutEmail: '',
          });
        } else {
          setDeveloperProfile(null);
        }
      } catch {
        const fallbackUser = buildUserProfileFromDatabase(authUser, null);
        setUser(fallbackUser);
        setToken(accessToken);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refreshProfile = useCallback(async () => {
    const client = getActiveSupabaseClient();
    if (!client) {
      setUser(null);
      setDeveloperProfile(null);
      setToken(null);
      setLoading(false);
      return;
    }

    const { data, error } = await client.auth.getSession();
    if (error || !data?.session?.user) {
      setUser(null);
      setDeveloperProfile(null);
      setToken(null);
      setLoading(false);
      return;
    }

    await loadAuthenticatedProfile(data.session.user, data.session.access_token || null);
  }, [loadAuthenticatedProfile]);

  useEffect(() => {
    const client = getActiveSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      setUser(null);
      setDeveloperProfile(null);
      setToken(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    const params =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const authCode = params?.get('code');
    if (authCode && typeof client.auth.exchangeCodeForSession === 'function') {
      client.auth.exchangeCodeForSession(authCode).catch(() => {});
    }

    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error || !data?.session?.user) {
          setUser(null);
          setDeveloperProfile(null);
          setToken(null);
          setLoading(false);
          return;
        }
        loadAuthenticatedProfile(data.session.user, data.session.access_token || null);
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
          setDeveloperProfile(null);
          setToken(null);
          setLoading(false);
        }
      });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        loadAuthenticatedProfile(session.user, session.access_token || null);
        setIsAuthModalOpen(false);
      } else {
        setUser(null);
        setDeveloperProfile(null);
        setToken(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [loadAuthenticatedProfile]);

  const signInWithGoogle = async () => {
    await signInWithSupabaseOAuth('google');
  };

  const signInWithGithub = async () => {
    await signInWithSupabaseOAuth('github');
  };

  const signInWithGitlab = async () => {
    await signInWithSupabaseOAuth('gitlab');
  };

  const loginWithCredentials = async (
    login: string,
    password?: string,
    turnstileToken?: string
  ) => {
    const cleanLogin = login.trim();
    if (!cleanLogin || !password) {
      throw new Error('Please enter your email address and password.');
    }

    const client = getActiveSupabaseClient();
    if (!client) {
      throw new Error(formatSupabaseAuthError('Provider is not configured', 'signin'));
    }

    let emailToUse = cleanLogin;
    if (!cleanLogin.includes('@')) {
      const { data: row } = await client
        .from('profiles')
        .select('email')
        .ilike('username', cleanLogin)
        .maybeSingle();
      if (!row?.email) {
        throw new Error('Invalid email or password.');
      }
      emailToUse = String(row.email);
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: emailToUse.toLowerCase(),
      password,
      options: turnstileToken ? { captchaToken: turnstileToken } : undefined,
    });

    if (error || !data?.user) {
      throw new Error(formatSupabaseAuthError(error || 'Invalid login credentials', 'signin'));
    }

    await loadAuthenticatedProfile(data.user, data.session?.access_token || null);
    setIsAuthModalOpen(false);
  };

  const registerWithCredentials = async (
    email: string,
    password: string,
    username: string,
    displayName: string,
    turnstileToken?: string
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = sanitizeUsername(username, 24);
    const cleanDisplayName = sanitizeText(displayName, 60);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 24) {
      throw new Error('Username must be 3–24 characters (letters, numbers, underscores).');
    }
    if (!cleanDisplayName || cleanDisplayName.length < 2) {
      throw new Error('Display name must be at least 2 characters.');
    }
    if (!password || password.length < 10) {
      throw new Error('Password must be at least 10 characters long.');
    }

    const client = getActiveSupabaseClient();
    if (!client) {
      throw new Error(formatSupabaseAuthError('Provider is not configured', 'signup'));
    }

    const availability = await checkSupabaseUsernameAvailability(cleanUsername);
    if (!availability.available) {
      throw new Error(availability.error || 'Username is already taken.');
    }

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: getOAuthRedirectUrl(),
        captchaToken: turnstileToken || undefined,
        data: {
          username: cleanUsername,
          display_name: cleanDisplayName,
        },
      },
    });

    if (error) {
      throw new Error(formatSupabaseAuthError(error, 'signup'));
    }

    if (!data?.user) {
      throw new Error('Unable to create account. Please try again.');
    }

    // Supabase returns an empty identities array when email is already registered and obfuscation is enabled
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('This email is already registered.');
    }

    if (data.session?.user) {
      await loadAuthenticatedProfile(data.session.user, data.session.access_token || null);
      setIsAuthModalOpen(false);
    } else {
      await loadAuthenticatedProfile(data.user, null);
      setIsAuthModalOpen(false);
    }
  };

  const resetPassword = async (email: string, turnstileToken?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    const client = getActiveSupabaseClient();
    if (!client) {
      throw new Error(formatSupabaseAuthError('Provider is not configured', 'reset'));
    }

    const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: getOAuthRedirectUrl(),
      captchaToken: turnstileToken || undefined,
    });

    if (error) {
      throw new Error(formatSupabaseAuthError(error, 'reset'));
    }
  };

  const checkUsernameAvailability = useCallback(
    async (username: string): Promise<{ available: boolean; error?: string }> => {
      return checkSupabaseUsernameAvailability(username);
    },
    []
  );

  const updateUserProfile = async (updates: {
    displayName: string;
    username: string;
    bio?: string;
    websiteUrl?: string;
  }) => {
    if (!user) {
      throw new Error('You must be signed in to update your profile.');
    }

    const cleanDisplayName = sanitizeText(updates.displayName, 60);
    const cleanUsername = sanitizeUsername(updates.username, 24);
    const cleanBio = updates.bio !== undefined ? sanitizeText(updates.bio, 500) : user.bio || '';
    const cleanWebsite =
      updates.websiteUrl !== undefined
        ? updates.websiteUrl.trim()
          ? sanitizeUrl(updates.websiteUrl.trim())
          : null
        : user.websiteUrl || null;

    if (!cleanDisplayName || cleanDisplayName.length < 2) {
      throw new Error('Display name must be at least 2 characters.');
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Username must be 3–24 letters, numbers, or underscores.');
    }
    if (updates.websiteUrl && updates.websiteUrl.trim() && !cleanWebsite) {
      throw new Error('Website URL must start with https://');
    }

    const updatedRow = await updateSupabaseUserProfile(user.id, {
      display_name: cleanDisplayName,
      username: cleanUsername,
      bio: cleanBio,
      website_url: cleanWebsite,
    });

    const mappedRole = mapDatabaseRoleToUiRole(updatedRow.role);
    setUser({
      ...user,
      displayName: updatedRow.display_name,
      username: updatedRow.username || cleanUsername,
      bio: updatedRow.bio || cleanBio,
      websiteUrl: updatedRow.website_url || cleanWebsite,
      role: mappedRole,
      dbRole: updatedRow.role,
    });
  };

  /**
   * Submits a request for developer/publisher status in the database.
   * NEVER promotes the user's role locally if the backend fails.
   */
  const becomeDeveloper = async (data: {
    orgName: string;
    orgWebsite?: string;
    orgDescription?: string;
    sourceUrl?: string;
    payoutEmail: string;
  }) => {
    if (!user) {
      throw new Error('You must be signed in to request developer access.');
    }

    const savedDev = await submitDeveloperProfileRequest({
      userId: user.id,
      orgName: data.orgName,
      orgWebsite: data.orgWebsite,
      orgDescription: data.orgDescription,
      sourceUrl: data.sourceUrl,
      payoutEmail: data.payoutEmail,
    });

    setDeveloperProfile({
      id: `dev_${savedDev.userId}`,
      userId: savedDev.userId,
      slug: savedDev.slug,
      orgName: savedDev.orgName,
      orgWebsite: savedDev.orgWebsite,
      orgDescription: savedDev.orgDescription,
      sourceUrl: savedDev.sourceUrl,
      verified: savedDev.verified,
      status: savedDev.status,
      rejectionReason: savedDev.rejectionReason,
      payoutEmail: '',
    });

    await refreshProfile();
  };

  const upgradePlan = async () => {
    await refreshProfile();
  };

  const activateLicense = async (): Promise<{
    success: boolean;
    plan?: string;
    message?: string;
  }> => {
    return {
      success: false,
      message: 'Niruvi Store is 100% free and open-source; no license key is required.',
    };
  };

  const signOut = async () => {
    const client = getActiveSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch {
        // Proceed with clearing client state
      }
    }
    setUser(null);
    setDeveloperProfile(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        developerProfile,
        token,
        loading,
        isPro,
        signInWithGoogle,
        signInWithGithub,
        signInWithGitlab,
        updateUserProfile,
        loginWithCredentials,
        registerWithCredentials,
        resetPassword,
        checkUsernameAvailability,
        becomeDeveloper,
        upgradePlan,
        activateLicense,
        refreshProfile,
        signOut,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        isAccountModalOpen,
        openAccountModal: () => setIsAccountModalOpen(true),
        closeAccountModal: () => setIsAccountModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
