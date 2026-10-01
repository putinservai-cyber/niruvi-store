import React, { useState, useEffect } from 'react';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import { useAuth } from '../context/AuthContext';
import { sanitizeText, sanitizeUrl, sanitizeUsername } from '../utils/sanitize';
import {
  X,
  User,
  ShieldCheck,
  Key,
  Building2,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Loader2,
  CreditCard,
  Lock,
  GitBranch,
  Heart
} from 'lucide-react';

export const AccountManagementModal: React.FC = () => {
  const {
    user,
    developerProfile,
    isAccountModalOpen,
    closeAccountModal,
    signOut,
    activateLicense,
    becomeDeveloper,
    refreshProfile,
    token
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'plan' | 'developer' | 'security'>('profile');

  // Edit profile state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // License key state
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [isActivatingKey, setIsActivatingKey] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Developer registration state
  const [orgName, setOrgName] = useState(developerProfile?.orgName || '');
  const [orgWebsite, setOrgWebsite] = useState(developerProfile?.orgWebsite || '');
  const [payoutEmail, setPayoutEmail] = useState(developerProfile?.payoutEmail || user?.email || '');
  const [isSavingDev, setIsSavingDev] = useState(false);
  const [devMessage, setDevMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Copy state
  const [copiedUid, setCopiedUid] = useState(false);

  usePreventBodyScroll(isAccountModalOpen && !!user);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
    }
  }, [user]);

  useEffect(() => {
    if (developerProfile) {
      setOrgName(developerProfile.orgName || '');
      setOrgWebsite(developerProfile.orgWebsite || '');
      setPayoutEmail(developerProfile.payoutEmail || user?.email || '');
    }
  }, [developerProfile, user?.email]);

  useEffect(() => {
    if (!isAccountModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAccountModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAccountModalOpen, closeAccountModal]);

  if (!isAccountModalOpen || !user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsUpdatingProfile(true);

    const cleanDisplayName = sanitizeText(displayName, 80);
    const cleanUsername = sanitizeUsername(username, 32);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ displayName: cleanDisplayName, username: cleanUsername }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMessage({ type: 'success', text: 'Profile details updated successfully!' });
        await refreshProfile();
      } else {
        setProfileMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err?.message || 'Network error updating profile' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) return;
    setIsActivatingKey(true);
    setLicenseStatus(null);

    const result = await activateLicense(licenseKeyInput);
    if (result.success) {
      setLicenseStatus({
        success: true,
        message: result.message || 'Pro developer license activated successfully!',
      });
      setLicenseKeyInput('');
      await refreshProfile();
    } else {
      setLicenseStatus({
        success: false,
        message: result.message || 'Invalid license key',
      });
    }
    setIsActivatingKey(false);
  };

  const handleRegisterDeveloper = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDev(true);
    setDevMessage(null);

    try {
      await becomeDeveloper({
        orgName: sanitizeText(orgName, 100),
        orgWebsite: sanitizeUrl(orgWebsite),
        payoutEmail: sanitizeText(payoutEmail, 120),
      });
      setDevMessage({ type: 'success', text: 'Developer organization updated successfully!' });
      await refreshProfile();
    } catch (err: any) {
      setDevMessage({ type: 'error', text: err?.message || 'Failed to update developer profile' });
    } finally {
      setIsSavingDev(false);
    }
  };

  const handleCopyUid = () => {
    if (user.firebaseUid || user.id) {
      navigator.clipboard.writeText(user.firebaseUid || user.id);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAccountModal();
      }}
    >
      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 bg-neutral-900/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {sanitizeUrl(user.avatarUrl) ? (
              <img
                src={sanitizeUrl(user.avatarUrl)}
                alt={sanitizeText(user.displayName, 80)}
                className="w-12 h-12 rounded-full object-cover border-2 border-neutral-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center text-lg font-bold">
                {sanitizeText(user.displayName, 80).slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{sanitizeText(user.displayName, 80)}</h2>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold font-mono tracking-wider rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {user.role}
                </span>
                {user.isPro && (
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold font-mono tracking-wider rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">@{user.username} • {user.email}</p>
            </div>
          </div>

          <button
            onClick={closeAccountModal}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-900/20 px-6 gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Profile & Identity
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'plan'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            Open Source & Supporter
          </button>
          <button
            onClick={() => setActiveTab('developer')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'developer'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Developer Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Security & Session
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PROFILE & IDENTITY */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {profileMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    profileMessage.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                      : 'bg-red-950/40 border border-red-800 text-red-300'
                  }`}
                >
                  {profileMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Username Handle</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-neutral-500 text-sm font-mono">@</span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white font-mono focus:outline-hidden focus:border-neutral-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Primary Email (OAuth Provider)</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-850 rounded-xl text-sm text-neutral-400 cursor-not-allowed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex items-center gap-2 py-2 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition shadow-sm disabled:opacity-50"
                >
                  {isUpdatingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Profile Changes'}
                </button>
              </form>

              <div className="pt-4 border-t border-neutral-850">
                <h3 className="text-xs font-semibold text-neutral-300 mb-3 uppercase tracking-wider">
                  Linked Firebase Social Sign-In
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-white" />
                      <span className="text-xs font-medium text-white">GitHub</span>
                    </div>
                    <span className="px-2 py-0.5 text-[9px] font-mono bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/30">
                      Active
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
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
                      <span className="text-xs font-medium text-white">Google</span>
                    </div>
                    <span className="px-2 py-0.5 text-[9px] font-mono bg-neutral-800 text-neutral-400 rounded-md">
                      Available
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 fill-white" viewBox="0 0 170 170">
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.83.13-9.76-1.92-14.8-6.14-3.32-2.77-7.23-7.46-11.75-14.07-6.21-9.1-11.12-19.12-14.74-30.07-3.62-10.95-5.43-21.46-5.43-31.53 0-14.39 3.59-26.37 10.77-35.95 7.18-9.58 16.27-14.46 27.27-14.64 4.88 0 10.15 1.15 15.82 3.46 5.67 2.31 9.38 3.52 11.13 3.63 2.05 0 5.92-1.28 11.61-3.84 5.69-2.56 10.66-3.72 14.92-3.48 11.1.84 19.98 4.88 26.65 12.13-9.82 5.94-14.6 14.3-14.34 25.07.25 8.52 3.56 15.7 9.93 21.53 6.37 5.83 13.97 9.24 22.8 10.23-2.19 6.46-5.06 13.1-8.62 19.92zM119.22 31.02c0-6.92 2.5-13.62 7.5-20.1 5-6.48 11.45-10.42 19.35-11.82.25 1.03.38 2.08.38 3.15 0 6.81-2.58 13.51-7.75 20.1-5.17 6.59-11.68 10.51-19.53 11.77-.13-.88-.2-1.91-.2-3.1z" />
                      </svg>
                      <span className="text-xs font-medium text-white">Apple</span>
                    </div>
                    <span className="px-2 py-0.5 text-[9px] font-mono bg-neutral-800 text-neutral-400 rounded-md">
                      Available
                    </span>
                  </div>
                </div>
              </div>

              {/* Unique Identifier */}
              <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-neutral-400 font-semibold">Firebase Identity UID</div>
                  <div className="text-xs font-mono text-neutral-300 truncate max-w-xs">{user.firebaseUid || user.id}</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUid}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition"
                >
                  {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUid ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: OPEN SOURCE & SUPPORTER */}
          {activeTab === 'plan' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">App Store Model</span>
                  <div className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                    <span>100% Free & Open Source AppImage Hub</span>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  NO PAYWALLS
                </span>
              </div>

              {/* Open Source AppImage Pool Information */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Voluntary Community Donations</h3>
                    <p className="text-xs text-neutral-400">
                      Niruvi Store operates purely on voluntary developer & user contributions (0% mandatory fees).
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-black/50 rounded-xl border border-neutral-800 space-y-2 text-xs text-neutral-300">
                  <p className="leading-relaxed">
                    Inspired by open-source Linux AppImage software repositories like AppImagePool, all apps, tools, and developer publishing tools are free for everyone.
                  </p>
                  <div className="pt-2 flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                      ✓ Free Catalog Access
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                      ✓ Unlimited Downloads
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                      ✓ Free Developer Submissions
                    </span>
                  </div>
                  <div className="pt-3 flex flex-wrap items-center gap-2.5">
                    <a
                      href="https://ko-fi.com/putinservai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs inline-flex items-center gap-1.5 transition"
                    >
                      <span>Support on Ko-fi</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://razorpay.me/@putin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition"
                    >
                      <span>Donate via Razorpay</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Privileges Matrix */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Open Source Store Features
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Publish & Browse Linux AppImages freely</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>niruvi:// Protocol Desktop Launcher Integration</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Cryptographic SHA256 Verification & GPG Key Attestation</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Automated SIEM & Vulnerability Scanning Logs</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEVELOPER PROFILE */}
          {activeTab === 'developer' && (
            <div className="space-y-6">
              {devMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    devMessage.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                      : 'bg-red-950/40 border border-red-800 text-red-300'
                  }`}
                >
                  {devMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{devMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleRegisterDeveloper} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Publisher / Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Linux Labs"
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Organization Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={orgWebsite}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                    placeholder="https://example.org"
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Payout & Notification Email
                  </label>
                  <input
                    type="email"
                    required
                    value={payoutEmail}
                    onChange={(e) => setPayoutEmail(e.target.value)}
                    placeholder="payouts@example.org"
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-neutral-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingDev}
                  className="flex items-center gap-2 py-2 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition shadow-sm disabled:opacity-50"
                >
                  {isSavingDev ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Developer Details'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: SECURITY & SESSIONS */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Active Session & JWT Telemetry
                </h3>

                <div className="space-y-2 text-xs text-neutral-300 font-mono">
                  <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                    <span className="text-neutral-400">Auth Token Verification:</span>
                    <span className="text-emerald-400">Firebase ID Token (Admin SDK Verified)</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                    <span className="text-neutral-400">Transport Layer:</span>
                    <span>HTTPS SSL / TLS 1.3</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                    <span className="text-neutral-400">Rate Limits:</span>
                    <span>Strict Sliding Window Enabled</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">CSP Protection:</span>
                    <span>Strict Directives Active</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-200">Sign Out of Session</h4>
                  <p className="text-[11px] text-red-300/70">Disconnect session and clear stored tokens.</p>
                </div>

                <button
                  onClick={() => {
                    closeAccountModal();
                    signOut();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition shadow-md"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
