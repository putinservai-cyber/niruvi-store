import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: 'USER' | 'DEVELOPER' | 'ADMIN' | 'MODERATOR';
  avatarUrl?: string | null;
  firebaseUid?: string | null;
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
  signInWithGoogle: () => Promise<void>;
  loginLocal: (login: string, pass: string) => Promise<void>;
  registerLocal: (data: { email: string; username: string; displayName: string; password: string }) => Promise<void>;
  becomeDeveloper: (data: { orgName: string; orgWebsite?: string; orgDescription?: string; payoutEmail: string }) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem('niruvi_auth_token');
  });
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Synchronize auth state with backend
  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setDeveloperProfile(data.developerProfile);
      } else {
        // Token expired or invalid
        setToken(null);
        setUser(null);
        sessionStorage.removeItem('niruvi_auth_token');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          setToken(idToken);
          sessionStorage.setItem('niruvi_auth_token', idToken);
          await fetchProfile(idToken);
        } catch (e) {
          console.error('Firebase token sync error:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      setToken(idToken);
      sessionStorage.setItem('niruvi_auth_token', idToken);
      await fetchProfile(idToken);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      throw err;
    }
  };

  const loginLocal = async (login: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password: pass }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }
    setToken(data.token);
    setUser(data.user);
    sessionStorage.setItem('niruvi_auth_token', data.token);
    setIsAuthModalOpen(false);
  };

  const registerLocal = async (params: { email: string; username: string; displayName: string; password: string }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    setToken(data.token);
    setUser(data.user);
    sessionStorage.setItem('niruvi_auth_token', data.token);
    setIsAuthModalOpen(false);
  };

  const becomeDeveloper = async (data: { orgName: string; orgWebsite?: string; orgDescription?: string; payoutEmail: string }) => {
    if (!token) throw new Error('Must be logged in');
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

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    setToken(null);
    setUser(null);
    setDeveloperProfile(null);
    sessionStorage.removeItem('niruvi_auth_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        developerProfile,
        token,
        loading,
        signInWithGoogle,
        loginLocal,
        registerLocal,
        becomeDeveloper,
        signOut,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
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
