import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User, ArrowRight, Loader2 } from 'lucide-react';
import { NiruviLogo } from './NiruviLogo';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, signInWithGoogle, loginLocal, registerLocal } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

  if (!isAuthModalOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in was cancelled or encountered an error.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === 'login') {
        await loginLocal(loginInput, password);
      } else {
        await registerLocal({ email, username, displayName, password });
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8">
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-900 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <NiruviLogo size={42} />
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Niruvi Account</h2>
            <p className="text-xs text-neutral-400">Secure sign-in & identity</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-white font-medium text-sm transition shadow-sm mb-4"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.4 7.36 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.6 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-neutral-800 flex-1" />
          <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">Or with password</span>
          <div className="h-px bg-neutral-800 flex-1" />
        </div>

        {/* Tab switcher */}
        <div className="flex bg-neutral-900 p-1 rounded-xl mb-4 border border-neutral-800">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
              tab === 'login' ? 'bg-white text-black font-semibold shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
              tab === 'register' ? 'bg-white text-black font-semibold shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleLocalSubmit} className="space-y-3.5">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Linux Contributor"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-neutral-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-neutral-500 text-sm">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    className="w-full pl-8 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-neutral-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.org"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-neutral-500"
                  />
                </div>
              </div>
            </>
          )}

          {tab === 'login' && (
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Email or Username</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="name@example.com or username"
                  className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-neutral-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-neutral-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm transition shadow-lg mt-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {tab === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
