import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import { TURNSTILE_SITE_KEY } from '../config/site';
import {
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Mail,
  Lock,
  User,
  AtSign,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { NiruviLogo } from './NiruviLogo';

type AuthTabMode = 'signin' | 'register' | 'reset';

interface FieldErrors {
  email?: string;
  password?: string;
  username?: string;
  displayName?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;

export function evaluatePasswordStrength(password: string): {
  score: number; // 0..4
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  checks: {
    minLength: boolean;
    mixedCase: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
  };
} {
  const minLength = password.length >= 10;
  const mixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  if (!minLength) {
    return {
      score: password.length > 0 ? 1 : 0,
      label: 'Too short',
      checks: { minLength, mixedCase, hasNumber, hasSymbol },
    };
  }

  let score = 1;
  if (mixedCase) score += 1;
  if (hasNumber) score += 1;
  if (hasSymbol || password.length >= 14) score += 1;

  const labels: Record<number, 'Weak' | 'Fair' | 'Good' | 'Strong'> = {
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong',
  };

  return {
    score,
    label: labels[score] || 'Fair',
    checks: { minLength, mixedCase, hasNumber, hasSymbol },
  };
}

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithGoogle,
    loginWithCredentials,
    registerWithCredentials,
    resetPassword,
    checkUsernameAvailability,
  } = useAuth();

  const [mode, setMode] = useState<AuthTabMode>('signin');
  const [loadingAction, setLoadingAction] = useState<'google' | 'credentials' | 'reset' | null>(
    null
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Cloudflare Turnstile Bot Protection state
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  // Username availability check state
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');

  usePreventBodyScroll(isAuthModalOpen);

  // Load and render Cloudflare Turnstile widget when modal is open and VITE_TURNSTILE_SITE_KEY is set
  useEffect(() => {
    if (!isAuthModalOpen || !TURNSTILE_SITE_KEY || typeof window === 'undefined') {
      return;
    }

    const renderWidget = () => {
      if (!window.turnstile || !turnstileContainerRef.current) return;
      if (turnstileWidgetIdRef.current) {
        try {
          window.turnstile.remove?.(turnstileWidgetIdRef.current);
        } catch {
          // Ignore remove error
        }
        turnstileWidgetIdRef.current = null;
      }

      try {
        turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          callback: (token: string) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
          'error-callback': () => setTurnstileToken(''),
        });
      } catch {
        // Ignore widget render errors in headless test environments
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      );
      if (existingScript) {
        existingScript.addEventListener('load', renderWidget);
        return () => existingScript.removeEventListener('load', renderWidget);
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', renderWidget);
      document.head.appendChild(script);

      return () => {
        script.removeEventListener('load', renderWidget);
      };
    }

    return () => {
      if (turnstileWidgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove?.(turnstileWidgetIdRef.current);
        } catch {
          // Ignore cleanup error
        }
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [isAuthModalOpen, mode]);

  // Close on Escape key
  useEffect(() => {
    if (!isAuthModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loadingAction) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, loadingAction, closeAuthModal]);

  // Debounced username availability check in Register mode
  useEffect(() => {
    if (mode !== 'register') {
      setUsernameStatus('idle');
      return;
    }
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setUsernameStatus('idle');
      return;
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailability(trimmed);
      if (!cancelled) {
        setUsernameStatus(result.available ? 'available' : 'taken');
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, mode, checkUsernameAvailability]);

  const passwordStrength = useMemo(() => evaluatePasswordStrength(password), [password]);

  // Validate fields inline
  const validateFields = (targetMode: AuthTabMode = mode): FieldErrors => {
    const errors: FieldErrors = {};
    const trimmedEmail = email.trim();

    if (targetMode === 'signin') {
      if (!trimmedEmail) {
        errors.email = 'Please enter your email address or username.';
      }
      if (!password) {
        errors.password = 'Please enter your password.';
      }
    } else if (targetMode === 'register') {
      if (!trimmedEmail) {
        errors.email = 'Email address is required.';
      } else if (!EMAIL_REGEX.test(trimmedEmail)) {
        errors.email = 'Please enter a valid email address (e.g. you@example.org).';
      }

      const trimmedUser = username.trim();
      if (!trimmedUser) {
        errors.username = 'Username is required.';
      } else if (!USERNAME_REGEX.test(trimmedUser)) {
        errors.username = 'Use 3–24 letters, numbers, or underscores.';
      } else if (usernameStatus === 'taken') {
        errors.username = 'This username is already taken.';
      }

      const trimmedDisplay = displayName.trim();
      if (!trimmedDisplay) {
        errors.displayName = 'Display name is required.';
      } else if (trimmedDisplay.length < 2) {
        errors.displayName = 'Display name must be at least 2 characters.';
      }

      if (!password) {
        errors.password = 'Password is required.';
      } else if (password.length < 10) {
        errors.password = 'Password must be at least 10 characters long.';
      }
    } else if (targetMode === 'reset') {
      if (!trimmedEmail) {
        errors.email = 'Email address is required.';
      } else if (!EMAIL_REGEX.test(trimmedEmail)) {
        errors.email = 'Please enter a valid email address.';
      }
    }

    return errors;
  };

  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      setFieldErrors(validateFields(mode));
    }
  }, [email, password, username, displayName, usernameStatus, mode]);

  if (!isAuthModalOpen) return null;

  const switchMode = (nextMode: AuthTabMode) => {
    if (loadingAction) return;
    setMode(nextMode);
    setFormError(null);
    setResetSuccessMessage(null);
    setFieldErrors({});
    setTouched({});
  };

  const handleGoogleSubmit = async () => {
    if (loadingAction) return;
    setFormError(null);
    setLoadingAction('google');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setFormError(err?.message || 'Google account authentication failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingAction) return;

    setTouched({ email: true, password: true, username: true, displayName: true });
    const errors = validateFields(mode);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setFormError('Please complete the Cloudflare Turnstile bot verification check.');
      return;
    }

    setFormError(null);
    setLoadingAction('credentials');
    try {
      if (mode === 'register') {
        await registerWithCredentials(
          email.trim(),
          password,
          username.trim(),
          displayName.trim(),
          turnstileToken
        );
      } else {
        await loginWithCredentials(email.trim(), password, turnstileToken);
      }
    } catch (err: any) {
      setFormError(err?.message || 'Authentication failed.');
      if (turnstileWidgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset?.(turnstileWidgetIdRef.current);
          setTurnstileToken('');
        } catch {}
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingAction) return;

    setTouched({ email: true });
    const errors = validateFields('reset');
    setFieldErrors(errors);
    if (errors.email) return;

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setFormError('Please complete the Cloudflare Turnstile bot verification check.');
      return;
    }

    setFormError(null);
    setResetSuccessMessage(null);
    setLoadingAction('reset');
    try {
      await resetPassword(email.trim(), turnstileToken);
      setResetSuccessMessage(
        'If an account exists for that email, a password reset link has been sent. Please check your inbox.'
      );
    } catch (err: any) {
      setFormError(err?.message || 'Unable to send password reset email.');
      if (turnstileWidgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset?.(turnstileWidgetIdRef.current);
          setTurnstileToken('');
        } catch {}
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const isBusy = Boolean(loadingAction);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) {
          closeAuthModal();
        }
      }}
    >
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Sticky Header with Cancel/Close Button */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-neutral-900 bg-neutral-950 shrink-0">
          <div className="flex items-center gap-3">
            <NiruviLogo size={38} />
            <div>
              <h2
                id="auth-modal-heading"
                className="text-base font-bold text-white tracking-tight"
              >
                {mode === 'reset'
                  ? 'Reset Your Password'
                  : mode === 'register'
                    ? 'Create Niruvi Account'
                    : 'Sign In to Niruvi Store'}
              </h2>
              <p className="text-xs text-neutral-400">
                {mode === 'reset'
                  ? 'Recover access to your account'
                  : 'Linux AppImage Hub & Library Sync'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAuthModal}
            disabled={isBusy}
            aria-label="Cancel and close authentication modal"
            className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-900 transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Tab Switcher (Sign In / Create Account) */}
          {mode !== 'reset' && (
            <div
              className="grid grid-cols-2 p-1 rounded-xl bg-neutral-900 border border-neutral-800"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                disabled={isBusy}
                onClick={() => switchMode('signin')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                disabled={isBusy}
                onClick={() => switchMode('register')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Top-level Error Alert */}
          {formError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-950/50 border border-red-800/70 text-red-200 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Password Reset Success Banner */}
          {resetSuccessMessage && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/70 text-emerald-200 text-xs flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {mode === 'reset' ? (
            /* FORGOT PASSWORD VIEW */
            <form onSubmit={handleResetSubmit} noValidate className="space-y-4">
              <p className="text-xs text-neutral-400 leading-relaxed">
                Enter the email address associated with your account and we will send you a link to
                reset your password.
              </p>

              <div className="space-y-1.5">
                <label
                  htmlFor="auth-reset-email"
                  className="block text-xs font-medium text-neutral-300"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.org"
                    value={email}
                    disabled={isBusy}
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full bg-neutral-900 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:outline-none transition ${
                      touched.email && fieldErrors.email
                        ? 'border-red-500/80 focus:border-red-400'
                        : 'border-neutral-800 focus:border-white'
                    }`}
                  />
                </div>
                {touched.email && fieldErrors.email && (
                  <p className="text-[11px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Cloudflare Turnstile Bot Protection (Reset Password) */}
              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                    Cloudflare Turnstile Bot Protection
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {TURNSTILE_SITE_KEY ? 'Active' : 'Site key via VITE_TURNSTILE_SITE_KEY'}
                  </span>
                </div>
                <div ref={turnstileContainerRef} data-testid="auth-turnstile-widget-container" />
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loadingAction === 'reset' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <span>Send Password Reset Link</span>
                )}
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => switchMode('signin')}
                className="w-full py-2 text-xs text-neutral-400 hover:text-white font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          ) : (
            /* SIGN IN & CREATE ACCOUNT VIEWS */
            <>
              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleSubmit}
                disabled={isBusy}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-white font-semibold text-xs transition shadow-sm group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                  <span>Continue with Google</span>
                </div>
                {loadingAction === 'google' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-neutral-800 w-full" />
                <span className="bg-neutral-950 px-3 text-[11px] text-neutral-500 uppercase tracking-wider font-medium">
                  Or with email
                </span>
                <div className="border-t border-neutral-800 w-full" />
              </div>

              <form onSubmit={handleCredentialsSubmit} noValidate className="space-y-4">
                {/* Email / Login Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-email-input"
                    className="block text-xs font-medium text-neutral-300"
                  >
                    {mode === 'register' ? 'Email Address' : 'Email or Username'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-email-input"
                      type={mode === 'register' ? 'email' : 'text'}
                      autoComplete={mode === 'register' ? 'email' : 'username'}
                      placeholder={
                        mode === 'register' ? 'you@example.org' : 'you@example.org or username'
                      }
                      value={email}
                      disabled={isBusy}
                      onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full bg-neutral-900 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:outline-none transition ${
                        touched.email && fieldErrors.email
                          ? 'border-red-500/80 focus:border-red-400'
                          : 'border-neutral-800 focus:border-white'
                      }`}
                    />
                  </div>
                  {touched.email && fieldErrors.email && (
                    <p className="text-[11px] text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>

                {/* Registration-only fields: Username & Display Name */}
                {mode === 'register' && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="auth-username-input"
                          className="block text-xs font-medium text-neutral-300"
                        >
                          Username
                        </label>
                        {usernameStatus === 'checking' && (
                          <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Checking...
                          </span>
                        )}
                        {usernameStatus === 'available' && (
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Available
                          </span>
                        )}
                        {usernameStatus === 'taken' && (
                          <span className="text-[11px] text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Already taken
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <AtSign className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="auth-username-input"
                          type="text"
                          autoComplete="username"
                          placeholder="linux_craft"
                          value={username}
                          disabled={isBusy}
                          onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
                          onChange={(e) => setUsername(e.target.value)}
                          className={`w-full bg-neutral-900 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white font-mono placeholder-neutral-500 focus:outline-none transition ${
                            (touched.username && fieldErrors.username) ||
                            usernameStatus === 'taken'
                              ? 'border-red-500/80 focus:border-red-400'
                              : usernameStatus === 'available'
                                ? 'border-emerald-500/60 focus:border-emerald-400'
                                : 'border-neutral-800 focus:border-white'
                          }`}
                        />
                      </div>
                      {touched.username && fieldErrors.username && (
                        <p className="text-[11px] text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.username}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="auth-displayname-input"
                        className="block text-xs font-medium text-neutral-300"
                      >
                        Display Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="auth-displayname-input"
                          type="text"
                          autoComplete="name"
                          placeholder="Tux Developer"
                          value={displayName}
                          disabled={isBusy}
                          onBlur={() => setTouched((prev) => ({ ...prev, displayName: true }))}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className={`w-full bg-neutral-900 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:outline-none transition ${
                            touched.displayName && fieldErrors.displayName
                              ? 'border-red-500/80 focus:border-red-400'
                              : 'border-neutral-800 focus:border-white'
                          }`}
                        />
                      </div>
                      {touched.displayName && fieldErrors.displayName && (
                        <p className="text-[11px] text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.displayName}</span>
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="auth-password-input"
                      className="block text-xs font-medium text-neutral-300"
                    >
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => switchMode('reset')}
                        className="text-xs text-neutral-400 hover:text-white font-medium transition cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-password-input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      placeholder={
                        mode === 'register' ? 'Minimum 10 characters' : 'Enter your password'
                      }
                      value={password}
                      disabled={isBusy}
                      onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full bg-neutral-900 border rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-neutral-500 focus:outline-none transition ${
                        touched.password && fieldErrors.password
                          ? 'border-red-500/80 focus:border-red-400'
                          : 'border-neutral-800 focus:border-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {touched.password && fieldErrors.password && (
                    <p className="text-[11px] text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.password}</span>
                    </p>
                  )}

                  {/* Password Strength Meter (Register mode) */}
                  {mode === 'register' && (
                    <div className="pt-1.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-400">Password strength</span>
                        <span
                          className={`font-medium ${
                            passwordStrength.score >= 4
                              ? 'text-emerald-400'
                              : passwordStrength.score === 3
                                ? 'text-blue-400'
                                : passwordStrength.score === 2
                                  ? 'text-amber-400'
                                  : 'text-neutral-400'
                          }`}
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 4].map((segment) => {
                          const active = passwordStrength.score >= segment;
                          const color =
                            passwordStrength.score >= 4
                              ? 'bg-emerald-500'
                              : passwordStrength.score === 3
                                ? 'bg-blue-500'
                                : passwordStrength.score === 2
                                  ? 'bg-amber-500'
                                  : 'bg-red-500';
                          return (
                            <div
                              key={segment}
                              className={`h-1.5 rounded-full transition-colors ${
                                active ? color : 'bg-neutral-800'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-neutral-400">
                        <span
                          className={
                            passwordStrength.checks.minLength ? 'text-emerald-400' : undefined
                          }
                        >
                          {passwordStrength.checks.minLength ? '✓' : '·'} 10+ characters
                        </span>
                        <span
                          className={
                            passwordStrength.checks.mixedCase ? 'text-emerald-400' : undefined
                          }
                        >
                          {passwordStrength.checks.mixedCase ? '✓' : '·'} Upper & lowercase
                        </span>
                        <span
                          className={
                            passwordStrength.checks.hasNumber ? 'text-emerald-400' : undefined
                          }
                        >
                          {passwordStrength.checks.hasNumber ? '✓' : '·'} At least 1 number
                        </span>
                        <span
                          className={
                            passwordStrength.checks.hasSymbol ? 'text-emerald-400' : undefined
                          }
                        >
                          {passwordStrength.checks.hasSymbol ? '✓' : '·'} Symbol recommended
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cloudflare Turnstile Bot Protection (Sign In & Create Account) */}
                <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                      Cloudflare Turnstile Bot Protection
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {TURNSTILE_SITE_KEY ? 'Active' : 'Site key via VITE_TURNSTILE_SITE_KEY'}
                    </span>
                  </div>
                  <div ref={turnstileContainerRef} data-testid="auth-turnstile-widget-container" />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={
                    isBusy || (mode === 'register' && usernameStatus === 'checking')
                  }
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loadingAction === 'credentials' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>
                        {mode === 'register' ? 'Creating Account...' : 'Signing In...'}
                      </span>
                    </>
                  ) : (
                    <span>{mode === 'register' ? 'Create Account' : 'Sign In'}</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-900 bg-neutral-950 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            HttpOnly Session & Firebase Auth
          </span>
          <button
            type="button"
            onClick={closeAuthModal}
            disabled={isBusy}
            className="text-neutral-400 hover:text-white font-medium transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
