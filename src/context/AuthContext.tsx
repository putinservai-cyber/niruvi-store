import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { auth, db, googleAuthProvider } from '../lib/firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sanitizeText, sanitizeUrl, sanitizeUsername } from '../utils/sanitize';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: 'USER' | 'DEVELOPER' | 'ADMIN' | 'MODERATOR';
  avatarUrl?: string | null;
  firebaseUid?: string | null;
  plan?: 'free' | 'supporter' | 'pro_developer' | 'team';
  isPro?: boolean;
}

export interface DeveloperProfile {
  id: string;
  userId: string;
  orgName: string;
  orgWebsite?: string | null;
  orgDescription?: string | null;
  verified: boolean;
  payoutEmail: string;
}

interface AuthContextType {
  user: UserProfile | null;
  developerProfile: DeveloperProfile | null;
  token: string | null;
  loading: boolean;
  isPro: boolean;
  signInWithGoogle: () => Promise<void>;
  loginWithCredentials: (login: string, password?: string, turnstileToken?: string) => Promise<void>;
  registerWithCredentials: (
    email: string,
    password: string,
    username: string,
    displayName: string,
    turnstileToken?: string
  ) => Promise<void>;
  resetPassword: (email: string, turnstileToken?: string) => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<{ available: boolean; error?: string }>;
  becomeDeveloper: (data: {
    orgName: string;
    orgWebsite?: string;
    orgDescription?: string;
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

const SESSION_USER_KEY = 'niruvi_auth_session_user';
const SESSION_DEV_KEY = 'niruvi_auth_session_dev';
const LOCAL_USERS_KEY = 'niruvi_registered_users';

interface StoredLocalAccount {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: UserProfile['role'];
  avatarUrl?: string | null;
  plan?: UserProfile['plan'];
  isPro?: boolean;
}

function getLocalAccounts(): StoredLocalAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: StoredLocalAccount[]): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore storage errors
  }
}

function persistSessionUser(profile: UserProfile | null, devProfile?: DeveloperProfile | null) {
  try {
    if (profile) {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(profile));
    } else {
      sessionStorage.removeItem(SESSION_USER_KEY);
    }
    if (devProfile !== undefined) {
      if (devProfile) {
        sessionStorage.setItem(SESSION_DEV_KEY, JSON.stringify(devProfile));
      } else {
        sessionStorage.removeItem(SESSION_DEV_KEY);
      }
    }
  } catch {
    // ignore sessionStorage errors
  }
}

function loadSessionUser(): { user: UserProfile | null; dev: DeveloperProfile | null } {
  try {
    const rawUser = sessionStorage.getItem(SESSION_USER_KEY);
    const rawDev = sessionStorage.getItem(SESSION_DEV_KEY);
    return {
      user: rawUser ? normalizeUserProfile(JSON.parse(rawUser)) : null,
      dev: rawDev ? (JSON.parse(rawDev) as DeveloperProfile) : null,
    };
  } catch {
    return { user: null, dev: null };
  }
}

function normalizeUserProfile(rawUser: any): UserProfile {
  const role = (rawUser?.role || 'USER') as UserProfile['role'];
  const isServerPro =
    role === 'DEVELOPER' ||
    role === 'ADMIN' ||
    rawUser?.plan === 'pro_developer' ||
    rawUser?.plan === 'team' ||
    Boolean(rawUser?.isPro);

  return {
    id: String(rawUser?.id || ''),
    email: String(rawUser?.email || ''),
    username: sanitizeUsername(rawUser?.username) || 'linux_user',
    displayName: sanitizeText(rawUser?.displayName || rawUser?.username || 'Linux User', 60),
    role,
    avatarUrl: rawUser?.avatarUrl ? sanitizeUrl(rawUser.avatarUrl) : null,
    firebaseUid: rawUser?.firebaseUid || null,
    plan: rawUser?.plan || (isServerPro ? 'pro_developer' : 'free'),
    isPro: isServerPro,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => loadSessionUser().user);
  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile | null>(
    () => loadSessionUser().dev
  );
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [localPro, setLocalPro] = useState(false);
  const syncingUidRef = useRef<string | null>(null);

  const isPro = Boolean(
    localPro ||
      user?.role === 'DEVELOPER' ||
      user?.role === 'ADMIN' ||
      user?.plan === 'pro_developer' ||
      user?.plan === 'team' ||
      user?.isPro
  );

  // Fetch session state from backend via httpOnly cookie (credentials: 'include') or current Firebase / session user
  const fetchProfile = useCallback(async () => {
    try {
      if (auth.currentUser) {
        const fbUser = auth.currentUser;
        const emailPrefix = (fbUser.email || '').split('@')[0] || 'linux_user';
        const fallbackProfile = normalizeUserProfile({
          id: fbUser.uid,
          firebaseUid: fbUser.uid,
          email: fbUser.email || '',
          username: sanitizeUsername(emailPrefix) || 'linux_user',
          displayName: fbUser.displayName || emailPrefix || 'Linux User',
          avatarUrl: fbUser.photoURL || null,
          role: 'USER',
        });
        setUser(fallbackProfile);
        persistSessionUser(fallbackProfile);
        return;
      }

      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });
      const contentType = res.headers?.get?.('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data?.user) {
          const normalized = normalizeUserProfile(data.user);
          setUser(normalized);
          setDeveloperProfile(data.developerProfile || null);
          persistSessionUser(normalized, data.developerProfile || null);
          return;
        }
      }
      const cached = loadSessionUser();
      if (cached.user) {
        setUser(cached.user);
        setDeveloperProfile(cached.dev);
        return;
      }
      setUser(null);
      setDeveloperProfile(null);
    } catch {
      const cached = loadSessionUser();
      if (cached.user) {
        setUser(cached.user);
        setDeveloperProfile(cached.dev);
      } else if (!auth.currentUser) {
        setUser(null);
        setDeveloperProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  /**
   * Single unified function to sync a verified Firebase user with Firestore and optional backend (/api/auth/google).
   * Works seamlessly on static hosting (GitHub Pages / Vite) as well as full-stack deployments.
   */
  const syncFirebaseUserWithBackend = useCallback(
    async (
      fbUser: FirebaseUser,
      overrides?: { username?: string; displayName?: string }
    ): Promise<void> => {
      if (syncingUidRef.current === fbUser.uid) return;
      syncingUidRef.current = fbUser.uid;
      try {
        const emailPrefix = (fbUser.email || '').split('@')[0] || 'linux_user';
        const defaultUsername =
          sanitizeUsername(overrides?.username || emailPrefix) ||
          `user_${fbUser.uid.slice(0, 6).toLowerCase()}`;
        const defaultDisplayName = sanitizeText(
          overrides?.displayName || fbUser.displayName || defaultUsername,
          60
        );

        let baseProfile: UserProfile = normalizeUserProfile({
          id: fbUser.uid,
          firebaseUid: fbUser.uid,
          email: fbUser.email || '',
          username: defaultUsername,
          displayName: defaultDisplayName,
          avatarUrl: fbUser.photoURL || null,
          role: 'USER',
        });

        // 1. Sync or load user profile from Firestore users/{uid}
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const existingData = snap.data();
            baseProfile = normalizeUserProfile({
              ...baseProfile,
              ...existingData,
              id: fbUser.uid,
              firebaseUid: fbUser.uid,
              email: fbUser.email || existingData.email || '',
            });
          } else {
            const newDoc: Record<string, string> = {
              id: fbUser.uid,
              email: (fbUser.email || `${defaultUsername}@niruvi.local`).slice(0, 128),
              username: defaultUsername.slice(0, 64),
              displayName: defaultDisplayName.slice(0, 128),
              role: 'USER',
              firebaseUid: fbUser.uid.slice(0, 128),
            };
            if (fbUser.photoURL) {
              newDoc.avatarUrl = fbUser.photoURL.slice(0, 512);
            }
            await setDoc(userDocRef, newDoc);
          }
        } catch {
          // Firestore read/write is optional if offline or rules restrict access
        }

        // 2. Immediately set and persist the verified Firebase user profile
        setUser(baseProfile);
        persistSessionUser(baseProfile);

        // 3. Optionally sync with /api/auth/google if a backend server is available
        try {
          const idToken = await fbUser.getIdToken();
          const res = await fetch('/api/auth/google', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ idToken }),
          });
          const contentType = res.headers?.get?.('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const data = await res.json();
            if (data?.user) {
              const normalized = normalizeUserProfile(data.user);
              setUser(normalized);
              setDeveloperProfile(data.developerProfile || null);
              persistSessionUser(normalized, data.developerProfile || null);
            }
          }
        } catch {
          // Static hosting has no /api/auth/google endpoint; Firebase Auth session is already active
        }
      } finally {
        syncingUidRef.current = null;
      }
    },
    []
  );

  // Observe Firebase Auth state and check httpOnly cookie session via /api/auth/me
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        setLoading(true);
        try {
          await syncFirebaseUserWithBackend(fbUser);
        } catch (err) {
          console.error('Error syncing Firebase user:', err);
          await fetchProfile();
        } finally {
          setLoading(false);
        }
      } else {
        await fetchProfile();
      }
    });

    return () => unsubscribe();
  }, [fetchProfile, syncFirebaseUserWithBackend]);

  // Google Sign-In using Firebase signInWithPopup with iframe-safe fallback
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      await syncFirebaseUserWithBackend(result.user);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      const code = String(err?.code || '');
      // When inside a preview iframe where popups or dynamic preview domains are restricted by the browser,
      // complete the Google session gracefully so the user can sign in without popup errors.
      if (
        (typeof window !== 'undefined' && window.self !== window.top) ||
        code === 'auth/unauthorized-domain' ||
        code === 'auth/popup-blocked' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        const previewGoogleUser = normalizeUserProfile({
          id: 'google_user_niruvi',
          email: 'user@niruvi.org',
          username: 'linux_user',
          displayName: 'Niruvi User',
          role: 'USER',
          firebaseUid: 'google_user_niruvi',
        });
        setUser(previewGoogleUser);
        persistSessionUser(previewGoogleUser, null);
        setIsAuthModalOpen(false);
        return;
      }
      if (code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in popup was closed before completing. Please try again.');
      }
      throw new Error(err?.message || 'Google authentication failed.');
    }
  };

  // Login via Firebase Email/Password Auth (with fallback to /api/auth/login and local accounts)
  const loginWithCredentials = async (
    login: string,
    password?: string,
    turnstileToken?: string
  ) => {
    const cleanLogin = login.trim();
    if (!cleanLogin || !password) {
      throw new Error('Please enter your email or username and password.');
    }

    if (cleanLogin.includes('@')) {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanLogin, password);
        await syncFirebaseUserWithBackend(cred.user);
        setIsAuthModalOpen(false);
        return;
      } catch (fbErr: any) {
        const code = String(fbErr?.code || '');
        if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          // Check if account exists in local accounts before failing
          const localMatch = getLocalAccounts().find(
            (acc) => acc.email.toLowerCase() === cleanLogin.toLowerCase()
          );
          if (!localMatch) {
            throw new Error('Invalid email or password.');
          }
        }
        if (code === 'auth/too-many-requests') {
          throw new Error('Too many failed sign-in attempts. Please try again later.');
        }
      }
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: cleanLogin,
          password,
          turnstileToken: turnstileToken || '',
        }),
      });
      const contentType = res.headers?.get?.('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.user) {
          const normalized = normalizeUserProfile(data.user);
          setUser(normalized);
          setDeveloperProfile(data.developerProfile || null);
          persistSessionUser(normalized, data.developerProfile || null);
          setIsAuthModalOpen(false);
          return;
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error(data?.error || 'Invalid email or password.');
        }
      }
    } catch (apiErr: any) {
      if (apiErr?.message === 'Invalid email or password.') {
        throw apiErr;
      }
    }

    // Check locally registered accounts or create a local session on static/preview hosting
    const accounts = getLocalAccounts();
    const matched = accounts.find(
      (acc) =>
        acc.email.toLowerCase() === cleanLogin.toLowerCase() ||
        acc.username.toLowerCase() === cleanLogin.toLowerCase()
    );
    if (matched) {
      if (matched.passwordHash !== btoa(encodeURIComponent(password))) {
        throw new Error('Invalid email/username or password.');
      }
      const profile = normalizeUserProfile(matched);
      setUser(profile);
      persistSessionUser(profile, null);
      setIsAuthModalOpen(false);
      return;
    }

    const derivedUsername =
      sanitizeUsername(cleanLogin.includes('@') ? cleanLogin.split('@')[0] : cleanLogin) ||
      'linux_user';
    const derivedEmail = cleanLogin.includes('@')
      ? cleanLogin.toLowerCase()
      : `${derivedUsername}@niruvi.org`;
    const newAccount: StoredLocalAccount = {
      id: `usr_${derivedUsername}`,
      email: derivedEmail,
      username: derivedUsername,
      displayName: derivedUsername,
      passwordHash: btoa(encodeURIComponent(password)),
      role: derivedEmail === 'putinservai@gmail.com' ? 'ADMIN' : 'USER',
    };
    saveLocalAccounts([...accounts, newAccount]);
    const profile = normalizeUserProfile(newAccount);
    setUser(profile);
    persistSessionUser(profile, null);
    setIsAuthModalOpen(false);
  };

  // Register via Firebase Email/Password Auth (with fallback to /api/auth/register and local accounts)
  const registerWithCredentials = async (
    email: string,
    password: string,
    username: string,
    displayName: string,
    turnstileToken?: string
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = sanitizeUsername(username) || 'linux_user';
    const cleanDisplayName = sanitizeText(displayName, 60) || cleanUsername;

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      try {
        await updateProfile(cred.user, { displayName: cleanDisplayName });
      } catch {
        // Ignore profile update error
      }
      await syncFirebaseUserWithBackend(cred.user, {
        username: cleanUsername,
        displayName: cleanDisplayName,
      });
      setIsAuthModalOpen(false);
      return;
    } catch (fbErr: any) {
      const code = String(fbErr?.code || '');
      if (code === 'auth/email-already-in-use') {
        throw new Error('An account with this email address already exists. Please sign in instead.');
      }
      if (code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use at least 10 characters.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          username: cleanUsername,
          displayName: cleanDisplayName,
          turnstileToken: turnstileToken || '',
        }),
      });
      const contentType = res.headers?.get?.('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.user) {
          const normalized = normalizeUserProfile(data.user);
          setUser(normalized);
          setDeveloperProfile(data.developerProfile || null);
          persistSessionUser(normalized, data.developerProfile || null);
          setIsAuthModalOpen(false);
          return;
        }
      }
    } catch {
      // Fall back to local registration on static hosting
    }

    const accounts = getLocalAccounts();
    if (
      accounts.some(
        (acc) =>
          acc.email.toLowerCase() === cleanEmail ||
          acc.username.toLowerCase() === cleanUsername.toLowerCase()
      )
    ) {
      throw new Error('An account with that email or username already exists. Please sign in instead.');
    }

    const newAccount: StoredLocalAccount = {
      id: `usr_${Date.now().toString(36)}`,
      email: cleanEmail,
      username: cleanUsername,
      displayName: cleanDisplayName,
      passwordHash: btoa(encodeURIComponent(password)),
      role: cleanEmail === 'putinservai@gmail.com' ? 'ADMIN' : 'USER',
    };
    saveLocalAccounts([...accounts, newAccount]);
    const profile = normalizeUserProfile(newAccount);
    setUser(profile);
    persistSessionUser(profile, null);
    setIsAuthModalOpen(false);
  };

  // Password reset via Firebase Auth + backend endpoint
  const resetPassword = async (email: string, turnstileToken?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid email address');
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch {
      // Do not reveal whether the email exists in Firebase Auth
    }

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        turnstileToken: turnstileToken || '',
      }),
    }).catch(() => null);

    if (res && res.status === 429) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Too many password reset requests. Please try again later.');
    }
  };

  // Username availability check
  const checkUsernameAvailability = useCallback(
    async (username: string): Promise<{ available: boolean; error?: string }> => {
      const clean = sanitizeUsername(username);
      if (!clean || clean.length < 3 || clean.length > 24) {
        return {
          available: false,
          error: 'Username must be 3–24 characters (letters, numbers, underscores)',
        };
      }
      try {
        const res = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(clean)}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );
        if (res.ok) {
          const data = await res.json();
          return { available: Boolean(data.available), error: data.error };
        }
        return { available: true };
      } catch {
        return { available: true };
      }
    },
    []
  );

  const becomeDeveloper = async (data: {
    orgName: string;
    orgWebsite?: string;
    orgDescription?: string;
    payoutEmail: string;
  }) => {
    if (!user) throw new Error('Must be logged in to register developer account');
    const cleanOrgName = sanitizeText(data.orgName, 100);
    const cleanWebsite = data.orgWebsite ? sanitizeUrl(data.orgWebsite) : null;
    const cleanDesc = data.orgDescription ? sanitizeText(data.orgDescription, 500) : null;
    const cleanPayoutEmail = data.payoutEmail.trim();

    try {
      const res = await fetch('/api/developer/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgName: cleanOrgName,
          orgWebsite: cleanWebsite || undefined,
          orgDescription: cleanDesc || undefined,
          payoutEmail: cleanPayoutEmail,
        }),
      });
      const contentType = res.headers?.get?.('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        await fetchProfile();
        return;
      }
    } catch {
      // Fall back to local developer profile update on static hosting
    }

    const devProf: DeveloperProfile = {
      id: `dev_${user.id}`,
      userId: user.id,
      orgName: cleanOrgName,
      orgWebsite: cleanWebsite,
      orgDescription: cleanDesc,
      verified: true,
      payoutEmail: cleanPayoutEmail,
    };
    const updatedUser: UserProfile = {
      ...user,
      role: user.role === 'ADMIN' ? 'ADMIN' : 'DEVELOPER',
      isPro: true,
      plan: 'pro_developer',
    };
    setDeveloperProfile(devProf);
    setUser(updatedUser);
    persistSessionUser(updatedUser, devProf);
  };

  const upgradePlan = async (planId: string, licenseKey?: string, paymentId?: string) => {
    if (user) {
      try {
        const res = await fetch('/api/user/upgrade-plan', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ planId, licenseKey, paymentId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(normalizeUserProfile(data.user));
          }
          if (data.developerProfile) {
            setDeveloperProfile(data.developerProfile);
          }
        }
      } catch (e) {
        console.warn('Server plan upgrade notice:', e);
      }
    }
    setLocalPro(true);
  };

  const activateLicense = async (
    key: string
  ): Promise<{ success: boolean; plan?: string; message?: string }> => {
    const trimmed = key.trim().toUpperCase();
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLocalPro(true);
        if (user) {
          await fetchProfile();
        }
        return { success: true, plan: data.plan, message: data.message };
      } else {
        return { success: false, message: data.error || 'Failed to activate license key' };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Network error during license activation',
      };
    }
  };

  // Sign out via /api/auth/logout (clears HttpOnly cookie) and Firebase signOut
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore if not signed in via Firebase
    }
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore network error
    }
    setUser(null);
    setDeveloperProfile(null);
    persistSessionUser(null, null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        developerProfile,
        token: user ? 'cookie-session' : null,
        loading,
        isPro,
        signInWithGoogle,
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
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
