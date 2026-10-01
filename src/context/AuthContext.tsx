import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { hasProLicense, saveStoredPurchase, saveLicense } from '../lib/purchaseStore';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
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
  loginWithCredentials: (login: string, password?: string) => Promise<void>;
  registerWithCredentials: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  // Cosmetic client-side indicator only; server endpoints always re-verify role/plan from DB
  const [localPro, setLocalPro] = useState(() => hasProLicense());
  const syncingUidRef = useRef<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setLocalPro(hasProLicense());
    };
    window.addEventListener('niruvi_purchases_updated', handleUpdate);
    window.addEventListener('niruvi_licenses_updated', handleUpdate);
    return () => {
      window.removeEventListener('niruvi_purchases_updated', handleUpdate);
      window.removeEventListener('niruvi_licenses_updated', handleUpdate);
    };
  }, []);

  const isPro = Boolean(
    localPro ||
      user?.role === 'DEVELOPER' ||
      user?.role === 'ADMIN' ||
      user?.plan === 'pro_developer' ||
      user?.plan === 'team' ||
      user?.isPro
  );

  // Fetch session state from backend via httpOnly cookie (credentials: 'include')
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          setUser(normalizeUserProfile(data.user));
          setDeveloperProfile(data.developerProfile || null);
          return;
        }
      }
      setUser(null);
      setDeveloperProfile(null);
    } catch {
      setUser(null);
      setDeveloperProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  /**
   * Single unified function to sync a verified Firebase user with the backend (/api/auth/google).
   * Used by both onAuthStateChanged and signInWithGoogle.
   */
  const syncFirebaseUserWithBackend = useCallback(async (fbUser: FirebaseUser): Promise<void> => {
    if (syncingUidRef.current === fbUser.uid) return;
    syncingUidRef.current = fbUser.uid;
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to verify Google session with server');
      }

      const data = await res.json();
      if (data?.user) {
        setUser(normalizeUserProfile(data.user));
        setDeveloperProfile(data.developerProfile || null);
      } else {
        throw new Error('Invalid user profile returned from server');
      }
    } finally {
      syncingUidRef.current = null;
    }
  }, []);

  // Observe Firebase Auth state and check httpOnly cookie session via /api/auth/me
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        setLoading(true);
        try {
          await syncFirebaseUserWithBackend(fbUser);
        } catch (err) {
          console.error('Error syncing Firebase user with backend:', err);
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

  // Google Sign-In using the shared syncFirebaseUserWithBackend helper
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      await syncFirebaseUserWithBackend(result.user);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        if (window.self !== window.top) {
          throw new Error(
            'Google Sign-In popup was blocked inside the preview iframe. Please open the app in a new tab or sign in with email and password.'
          );
        }
        throw new Error('Sign-in popup was closed before completing. Please try again.');
      }
      if (window.self !== window.top) {
        throw new Error(
          'Google Sign-In popup may be blocked inside the preview iframe. Please open the app in a new tab or use email and password below.'
        );
      }
      throw new Error(err?.message || 'Google authentication failed.');
    }
  };

  // Login via credentials (/api/auth/login sets HttpOnly, Secure, SameSite=Strict cookie)
  const loginWithCredentials = async (login: string, password?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: login.trim(), password }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.user) {
      setUser(normalizeUserProfile(data.user));
      setDeveloperProfile(data.developerProfile || null);
      setIsAuthModalOpen(false);
    } else {
      throw new Error(data?.error || 'Invalid credentials');
    }
  };

  // Register via credentials (/api/auth/register sets HttpOnly, Secure, SameSite=Strict cookie)
  const registerWithCredentials = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        username: sanitizeUsername(username),
        displayName: sanitizeText(displayName, 60),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.user) {
      // Note: isPro is a computed value from user.role / user.plan / localPro
      setUser(normalizeUserProfile(data.user));
      setDeveloperProfile(data.developerProfile || null);
      setIsAuthModalOpen(false);
    } else {
      throw new Error(data?.error || 'Registration failed');
    }
  };

  // Password reset via Firebase Auth + backend endpoint
  const resetPassword = async (email: string) => {
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
      body: JSON.stringify({ email: cleanEmail }),
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
    const res = await fetch('/api/developer/register', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orgName: sanitizeText(data.orgName, 100),
        orgWebsite: data.orgWebsite ? sanitizeUrl(data.orgWebsite) : undefined,
        orgDescription: data.orgDescription ? sanitizeText(data.orgDescription, 500) : undefined,
        payoutEmail: data.payoutEmail.trim(),
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(result.error || 'Failed to register as developer');
    }
    await fetchProfile();
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
        saveLicense({
          key: trimmed,
          planType: data.plan || 'pro_developer',
          isActive: true,
          registeredTo: user?.email || 'authenticated_developer',
        });
        saveStoredPurchase({
          id: `pur_lic_${Date.now()}`,
          orderId: 'license_redemption',
          paymentId: 'crypto_license',
          planId: data.plan || 'pro_developer',
          amount: 500,
          currency: 'INR',
          status: 'completed',
          createdAt: new Date().toISOString(),
          licenseKey: trimmed,
          customerEmail: user?.email || 'developer@niruvi.store',
        });
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
