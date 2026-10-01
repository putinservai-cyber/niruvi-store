import React, { createContext, useContext, useState, useEffect } from 'react';
import { hasProLicense, saveStoredPurchase, saveLicense } from '../lib/purchaseStore';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';

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
  sandboxLogin: () => Promise<void>;
  loginWithCredentials: (login: string, password?: string) => Promise<void>;
  registerWithCredentials: (email: string, password: string, username: string, displayName: string) => Promise<void>;
  becomeDeveloper: (data: { orgName: string; orgWebsite?: string; orgDescription?: string; payoutEmail: string }) => Promise<void>;
  upgradePlan: (planId: string, licenseKey?: string, paymentId?: string) => Promise<void>;
  activateLicense: (key: string) => Promise<{ success: boolean; plan?: string; message?: string }>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem('niruvi_auth_token') || localStorage.getItem('niruvi_auth_token');
  });
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [localPro, setLocalPro] = useState(() => hasProLicense());

  // Listen to local purchase changes
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
    user?.isPro
  );

  // Synchronize auth state with native Cloudflare Worker / API endpoint (/api/auth/me)
  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser({
          ...data.user,
          plan: data.user.role === 'DEVELOPER' ? 'pro_developer' : 'free',
          isPro: data.user.role === 'DEVELOPER' || data.user.role === 'ADMIN',
        });
        setDeveloperProfile(data.developerProfile);
      } else {
        // Token expired or invalid
        setToken(null);
        setUser(null);
        sessionStorage.removeItem('niruvi_auth_token');
        localStorage.removeItem('niruvi_auth_token');
      }
    } catch (err) {
      console.error('Error fetching user profile from /api/auth/me:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  // Real-time Firebase Auth state observer to handle session persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        setLoading(true);
        try {
          const idToken = await fbUser.getIdToken();
          
          // Sync with dynamic backend Google Auth endpoint
          const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Linux User',
              photoURL: fbUser.photoURL,
              uid: fbUser.uid
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              setToken(data.token);
              sessionStorage.setItem('niruvi_auth_token', data.token);
              localStorage.setItem('niruvi_auth_token', data.token);
              
              setUser({
                ...data.user,
                plan: data.user.role === 'DEVELOPER' ? 'pro_developer' : 'free',
                isPro: data.user.role === 'DEVELOPER' || data.user.role === 'ADMIN',
              });
              setDeveloperProfile(data.developerProfile);
            }
          } else {
            console.error('Failed to sync auth state with backend server');
            setToken(null);
            setUser(null);
            setDeveloperProfile(null);
            sessionStorage.removeItem('niruvi_auth_token');
            localStorage.removeItem('niruvi_auth_token');
          }
        } catch (error) {
          console.error('Error syncing with backend server on auth state change:', error);
        } finally {
          setLoading(false);
        }
      } else {
        // No Firebase user signed in - check if there is a local legacy token (e.g., local admin login)
        const localToken = sessionStorage.getItem('niruvi_auth_token') || localStorage.getItem('niruvi_auth_token');
        if (localToken) {
          setToken(localToken);
          await fetchProfile(localToken);
        } else {
          setToken(null);
          setUser(null);
          setDeveloperProfile(null);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Google Authentication via Firebase Google Account Login
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();

      // Sync with backend Google endpoint
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          uid: fbUser.uid
        })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        sessionStorage.setItem('niruvi_auth_token', data.token);
        localStorage.setItem('niruvi_auth_token', data.token);
        setUser({
          ...data.user,
          plan: data.user.role === 'DEVELOPER' ? 'pro_developer' : 'free',
          isPro: data.user.role === 'DEVELOPER' || data.user.role === 'ADMIN',
        });
        setDeveloperProfile(data.developerProfile);
        setIsAuthModalOpen(false);
      } else {
        throw new Error(data.error || 'Google authentication sync failed on backend');
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        if (window.self !== window.top) {
          throw new Error('Google Sign-In is blocked inside the preview iframe. Please open the app in a new tab (arrow icon top right) to log in.');
        }
        throw new Error('Sign-in popup was closed before completing. Please try again.');
      }
      
      if (window.self !== window.top) {
        throw new Error('Google Sign-In may be blocked inside the preview iframe. Please open the app in a new tab using the arrow icon at the top right.');
      }

      console.error('Google Auth Error:', err);
      throw new Error(err.message || 'Google authentication failed.');
    }
  };

  // Sandbox Login for Iframe Preview
  const sandboxLogin = async () => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'developer@niruvi.store',
          displayName: 'Linux AppImage Craft',
          photoURL: 'https://api.dicebear.com/7.x/identicon/svg?seed=google_developer',
          uid: 'demo_developer_uid_12345'
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
          sessionStorage.setItem('niruvi_auth_token', data.token);
          localStorage.setItem('niruvi_auth_token', data.token);
          setUser({
            ...data.user,
            plan: data.user.role === 'DEVELOPER' ? 'pro_developer' : 'free',
            isPro: data.user.role === 'DEVELOPER' || data.user.role === 'ADMIN',
          });
          setDeveloperProfile(data.developerProfile);
          setIsAuthModalOpen(false);
          return;
        }
      }
      throw new Error('Sandbox login failed.');
    } catch (err: any) {
      console.error('Sandbox login error:', err);
      throw err;
    }
  };

  // Login via credentials (/api/auth/login)
  const loginWithCredentials = async (login: string, password?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        sessionStorage.setItem('niruvi_auth_token', data.token);
        localStorage.setItem('niruvi_auth_token', data.token);
        setUser({
          ...data.user,
          plan: data.user.role === 'DEVELOPER' ? 'pro_developer' : 'free',
          isPro: data.user.role === 'DEVELOPER' || data.user.role === 'ADMIN',
        });
        setDeveloperProfile(data.developerProfile);
        setIsAuthModalOpen(false);
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const registerWithCredentials = async (email: string, password: string, username: string, displayName: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, displayName }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        sessionStorage.setItem('niruvi_auth_token', data.token);
        setUser(data.user);
        setIsPro(data.user?.role === 'ADMIN' || data.user?.role === 'DEVELOPER');
        setDeveloperProfile(data.developerProfile);
        setIsAuthModalOpen(false);
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      throw err;
    }
  };

  const becomeDeveloper = async (data: { orgName: string; orgWebsite?: string; orgDescription?: string; payoutEmail: string }) => {
    if (!token) throw new Error('Must be logged in to register developer account');
    const res = await fetch('/api/developer/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to register as developer');
    }
    await fetchProfile(token);
  };

  const upgradePlan = async (planId: string, licenseKey?: string, paymentId?: string) => {
    if (token) {
      try {
        const res = await fetch('/api/user/upgrade-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planId, licenseKey, paymentId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser({
              ...data.user,
              plan: planId as any,
              isPro: true,
            });
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

  const activateLicense = async (key: string): Promise<{ success: boolean; plan?: string; message?: string }> => {
    const trimmed = key.trim().toUpperCase();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers,
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
        if (token) {
          await fetchProfile(token);
        }
        return { success: true, plan: data.plan, message: data.message };
      } else {
        return { success: false, message: data.error || 'Failed to activate license key' };
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error during license activation' };
    }
  };

  // Sign out via native fetch (/api/auth/logout)
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase logout notice:', e);
    }
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // ignore
    }
    setToken(null);
    setUser(null);
    setDeveloperProfile(null);
    sessionStorage.removeItem('niruvi_auth_token');
    localStorage.removeItem('niruvi_auth_token');
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
        sandboxLogin,
        loginWithCredentials,
        registerWithCredentials,
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
