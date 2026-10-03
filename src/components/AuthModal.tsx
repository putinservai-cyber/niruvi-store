import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { TURNSTILE_SITE_KEY } from '../config/site';
import { ModalShell } from './ModalShell';
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
  Terminal,
} from 'lucide-react';
import { NiruviLogo } from './NiruviLogo';
import { OAuthDiagnosticsModal } from './OAuthDiagnosticsModal';

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
  score: number;
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
    signInWithGithub,
    signInWithGitlab,
    loginWithCredentials,
    registerWithCredentials,
    resetPassword,
    checkUsernameAvailability,
    authCallbackError,
    clearAuthCallbackError,
  } = useAuth();

  const [mode, setMode] = useState<AuthTabMode>('signin');
  const [loadingAction, setLoadingAction] = useState<
    'google' | 'github' | 'gitlab' | 'credentials' | 'reset' | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [registrationConfirmation, setRegistrationConfirmation] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    if (authCallbackError) {
      setFormError(authCallbackError);
    }
  }, [authCallbackError]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');

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
        errors.email = 'Please enter a valid email address.';
      }

      const trimmedUser = username.trim();
      if (!trimmedUser) {
        errors.username = 'Username is required.';
      } else if (!USERNAME_REGEX.test(trimmedUser)) {
        errors.username = 'Use 3–24 letters, numbers, or underscores.';
      } else if (usernameStatus === 'taken') {
        errors.username = 'Username is already taken.';
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

  const switchMode = (nextMode: AuthTabMode) => {
    if (loadingAction) return;
    setMode(nextMode);
    setFormError(null);
    setResetSuccessMessage(null);
    setFieldErrors({});
    setTouched({});
  };

  const handleOAuthSubmit = async (provider: 'google' | 'github' | 'gitlab') => {
    if (loadingAction) return;
    setFormError(null);
    setLoadingAction(provider);
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'github') {
        await signInWithGithub();
      } else {
        await signInWithGitlab();
      }
    } catch (err: any) {
      setFormError(
        err?.message ||
          `${provider === 'gitlab' ? 'GitLab' : provider === 'github' ? 'GitHub' : 'Google'} sign-in failed.`
      );
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

    setFormError(null);
    setLoadingAction('credentials');
    try {
      if (mode === 'register') {
        const regRes = await registerWithCredentials(
          email.trim(),
          password,
          username.trim(),
          displayName.trim(),
          turnstileToken
        );
        if (regRes?.requiresConfirmation) {
          setRegistrationConfirmation(email.trim());
        }
      } else {
        await loginWithCredentials(email.trim(), password, turnstileToken);
      }
    } catch (err: any) {
      setFormError(err?.message || 'Invalid email or password.');
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

    setFormError(null);
    setResetSuccessMessage(null);
    setLoadingAction('reset');
    try {
      await resetPassword(email.trim(), turnstileToken);
      setResetSuccessMessage(
        'If an account exists for that email, a password reset link has been sent.'
      );
    } catch (err: any) {
      setFormError(err?.message || 'Unable to send password reset email.');
    } finally {
      setLoadingAction(null);
    }
  };

  const isBusy = Boolean(loadingAction);

  return (
    <ModalShell
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      labelledBy="auth-modal-heading"
      maxWidthClass="max-w-md"
      disableClose={isBusy}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-neutral-800 bg-neutral-950 shrink-0">
        <div className="flex items-center gap-3">
          <NiruviLogo size={34} />
          <div>
            <h2
              id="auth-modal-heading"
              className="text-base font-semibold text-white tracking-tight"
            >
              {mode === 'reset'
                ? 'Reset Password'
                : mode === 'register'
                  ? 'Create Account'
                  : 'Sign In'}
            </h2>
            <p className="text-xs text-neutral-400">
              {mode === 'reset'
                ? 'Receive a password recovery link by email'
                : 'Niruvi Store account'}
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
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="p-6 overflow-y-auto space-y-4 flex-1">
        {mode !== 'reset' && (
          <div
            className="grid grid-cols-2 p-1 rounded-lg bg-neutral-900 border border-neutral-800"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              disabled={isBusy}
              onClick={() => switchMode('signin')}
              className={`py-1.5 px-3 rounded-md text-xs font-medium transition cursor-pointer ${
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
              className={`py-1.5 px-3 rounded-md text-xs font-medium transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {formError && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-950/60 border border-red-800/70 text-red-200 text-xs space-y-2"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
            {(formError.includes('403') ||
              formError.includes('redirect') ||
              formError.includes('configured') ||
              formError.includes('Google')) && (
              <button
                type="button"
                onClick={() => setShowDiagnostics(true)}
                className="text-[11px] text-red-300 hover:text-white underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>View OAuth &amp; Redirect Diagnostics</span>
              </button>
            )}
          </div>
        )}

        {resetSuccessMessage && (
          <div
            role="status"
            className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/70 text-emerald-200 text-xs flex items-start gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{resetSuccessMessage}</span>
          </div>
        )}

        {registrationConfirmation ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-white">
                Check your email to confirm your account
              </h3>
              <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed">
                We sent a verification link to{' '}
                <span className="font-semibold text-white">{registrationConfirmation}</span>.
                Please click the link in the email to activate your Niruvi account before signing in.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRegistrationConfirmation(null);
                switchMode('signin');
              }}
              className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Proceed to Sign In
            </button>
          </div>
        ) : mode === 'reset' ? (
          <form onSubmit={handleResetSubmit} noValidate className="space-y-4">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Enter your account email address to receive a password reset link.
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
                  className={`w-full bg-neutral-900 border rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:outline-none transition ${
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

            {TURNSTILE_SITE_KEY && (
              <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>Cloudflare Turnstile Bot Protection</span>
                  </span>
                </div>
                <div ref={turnstileContainerRef} data-testid="auth-turnstile-widget-container" />
              </div>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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
              className="w-full py-1.5 text-xs text-neutral-400 hover:text-white font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleCredentialsSubmit} noValidate className="space-y-3.5">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-email-input"
                  className="block text-xs font-medium text-neutral-300"
                >
                  {mode === 'register' ? 'Email' : 'Email or Username'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-email-input"
                    type={mode === 'register' ? 'email' : 'text'}
                    autoComplete={mode === 'register' ? 'email' : 'username'}
                    placeholder={
                      mode === 'register' ? 'you@example.org' : 'you@example.org'
                    }
                    value={email}
                    disabled={isBusy}
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full bg-neutral-900 border rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:outline-none transition ${
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
                        placeholder="linux_dev"
                        value={username}
                        disabled={isBusy}
                        onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
                        onChange={(e) => setUsername(e.target.value)}
                        className={`w-full bg-neutral-900 border rounded-lg py-2.5 pl-10 pr-4 text-sm text-white font-mono placeholder-neutral-500 focus:outline-none transition ${
                          (touched.username && fieldErrors.username) || usernameStatus === 'taken'
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
                        placeholder="Your Name"
                        value={displayName}
                        disabled={isBusy}
                        onBlur={() => setTouched((prev) => ({ ...prev, displayName: true }))}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className={`w-full bg-neutral-900 border rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:outline-none transition ${
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
                    className={`w-full bg-neutral-900 border rounded-lg py-2.5 pl-10 pr-10 text-sm text-white placeholder-neutral-500 focus:outline-none transition ${
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

                {mode === 'register' && password.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">Password strength</span>
                      <span className="font-medium text-neutral-300">{passwordStrength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((segment) => (
                        <div
                          key={segment}
                          className={`h-1 rounded-full transition-colors ${
                            passwordStrength.score >= segment ? 'bg-sky-500' : 'bg-neutral-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {TURNSTILE_SITE_KEY && (
                <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                      <span>Cloudflare Turnstile Bot Protection</span>
                    </span>
                  </div>
                  <div ref={turnstileContainerRef} data-testid="auth-turnstile-widget-container" />
                </div>
              )}

              <button
                type="submit"
                disabled={isBusy || (mode === 'register' && usernameStatus === 'checking')}
                className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loadingAction === 'credentials' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>{mode === 'register' ? 'Creating Account...' : 'Signing In...'}</span>
                  </>
                ) : (
                  <span>{mode === 'register' ? 'Create Account' : 'Sign In'}</span>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center py-1">
              <div className="border-t border-neutral-800 w-full" />
              <span className="bg-neutral-950 px-3 text-[11px] text-neutral-500 whitespace-nowrap">
                Or continue with
              </span>
              <div className="border-t border-neutral-800 w-full" />
            </div>

            {/* OAuth Providers: Google, GitHub, GitLab */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleOAuthSubmit('google')}
                disabled={isBusy}
                className="w-full flex items-center justify-between py-2.5 px-4 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-medium text-xs transition group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
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

              <button
                type="button"
                onClick={() => handleOAuthSubmit('github')}
                disabled={isBusy}
                className="w-full flex items-center justify-between py-2.5 px-4 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-medium text-xs transition group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <svg
                    className="w-4 h-4 shrink-0 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>Continue with GitHub</span>
                </div>
                {loadingAction === 'github' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOAuthSubmit('gitlab')}
                disabled={isBusy}
                className="w-full flex items-center justify-between py-2.5 px-4 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-medium text-xs transition group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#E24329"
                      d="M12 21.42l3.684-11.338H8.316L12 21.42z"
                    />
                    <path
                      fill="#FC6D26"
                      d="M12 21.42l-3.684-11.338H1.929L12 21.42zm0 0l3.684-11.338h6.387L12 21.42z"
                    />
                    <path
                      fill="#FCA326"
                      d="M1.929 10.082L.809 13.53a.767.767 0 00.278.858L12 21.42 1.929 10.082zm20.142 0l1.12 3.448a.767.767 0 01-.278.858L12 21.42l10.071-11.338z"
                    />
                    <path
                      fill="#E24329"
                      d="M1.929 10.082h6.387L5.57 1.63a.384.384 0 00-.73 0L1.929 10.082zm20.142 0h-6.387L18.43 1.63a.384.384 0 01.73 0l2.911 8.452z"
                    />
                  </svg>
                  <span>Continue with GitLab</span>
                </div>
                {loadingAction === 'gitlab' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowDiagnostics(true)}
                className="text-[11px] text-neutral-500 hover:text-neutral-300 flex items-center justify-center gap-1.5 mx-auto transition cursor-pointer"
              >
                <Terminal className="w-3 h-3 text-neutral-400" />
                <span>OAuth &amp; Redirect Diagnostics</span>
              </button>
            </div>
          </>
        )}

        <OAuthDiagnosticsModal
          isOpen={showDiagnostics}
          onClose={() => setShowDiagnostics(false)}
        />
      </div>
    </ModalShell>
  );
};
