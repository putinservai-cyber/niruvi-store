import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Loader2, ArrowRight, ShieldCheck, Mail, Lock } from 'lucide-react';
import { NiruviLogo } from './NiruviLogo';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithGoogle,
    sandboxLogin,
    loginWithCredentials,
    registerWithCredentials
  } = useAuth();

  const [loadingProvider, setLoadingProvider] = useState<'google' | 'credentials' | 'sandbox' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');


  useEffect(() => {
    if (isAuthModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;



  const handleSandboxSubmit = async () => {
    setError(null);
    setLoadingProvider('sandbox');
    try {
      await sandboxLogin();
    } catch (err: any) {
      setError(err?.message || 'Sandbox authentication failed.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGoogleSubmit = async () => {
    setError(null);
    setLoadingProvider('google');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Google account authentication failed.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegisterMode && (!username || !displayName))) {
      setError('Please fill out all required fields.');
      return;
    }
    setError(null);
    setLoadingProvider('credentials');
    try {
      if (isRegisterMode) {
        await registerWithCredentials(email, password, username, displayName);
      } else {
        await loginWithCredentials(email, password);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-900 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <NiruviLogo size={44} />
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Niruvi Security Identity</h2>
            <p className="text-xs text-neutral-400">Secure Authentication</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <p className="text-xs text-neutral-400 leading-relaxed">
            Sign in with your Google Account or credentials to manage submitted AppImages, bookmark applications, track library installations, and support Linux store catalog synchronization.
          </p>

          <form onSubmit={handleCredentialsSubmit} className="space-y-3 pb-2 border-b border-neutral-900">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={isRegisterMode ? "Email Address" : "Email or Username"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none transition"
                />
              </div>
              
              {isRegisterMode && (
                <>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Username (e.g. linux_craft)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none transition"
                    />
                  </div>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Display Name (e.g. Tux Developer)"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none transition"
                    />
                  </div>
                </>
              )}

              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none transition"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={Boolean(loadingProvider)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loadingProvider === 'credentials' ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <span>{isRegisterMode ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>
            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => { setIsRegisterMode(!isRegisterMode); setError(null); }}
                className="text-xs text-amber-500 hover:text-amber-400 font-medium"
              >
                {isRegisterMode ? 'Already have an account? Sign In' : 'Need an account? Register'}
              </button>
            </div>
            <p className="text-center text-[10px] text-neutral-500 uppercase tracking-wider font-semibold my-2">Or</p>
          </form>

          {/* Firebase Google Auth */}
          <button
            type="button"
            onClick={handleGoogleSubmit}
            disabled={Boolean(loadingProvider)}
            className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-amber-500/30 hover:border-amber-500/60 text-white font-semibold text-sm transition shadow-md group disabled:opacity-50 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.4 7.36 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.6 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Sign in with Google</span>
            </div>
            {loadingProvider === 'google' ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            )}
          </button>
        </div>


        {window.self !== window.top && (
          <div className="pt-2">
            <button
              onClick={handleSandboxSubmit}
              disabled={Boolean(loadingProvider)}
              className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/60 text-amber-500 font-semibold text-sm transition shadow-md group disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5" />
                <span>Sandbox Developer Login (Preview Mode)</span>
              </div>
              {loadingProvider === 'sandbox' ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              )}
            </button>
            <p className="text-xs text-neutral-500 text-center mt-3">
              Use this sandbox login since Google Auth popups are blocked inside the preview iframe.
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Verified Secure Google OAuth 2.0
          </span>
          <span>Firebase Identity Layer</span>
        </div>
      </div>
    </div>
  );
};
