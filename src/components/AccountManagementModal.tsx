import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ModalShell } from './ModalShell';
import { sanitizeText, sanitizeUrl, sanitizeUsername } from '../utils/sanitize';
import { Architecture } from '../types';
import {
  X,
  User,
  Building2,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  Settings,
  PlusCircle,
  Package,
  FileText,
  Clock,
  Send,
  ExternalLink,
} from 'lucide-react';

export interface DeveloperDraftApplication {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  license: string;
  homepageUrl: string;
  sourceRepoUrl: string;
  iconUrl: string;
  architectures: Architecture[];
  version: string;
  releaseNotes: string;
  downloadUrl: string;
  sha256: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  rejectionReason?: string;
  updatedAt: string;
}

const DEV_APPS_STORAGE_KEY = 'niruvi_developer_apps_v1';

export function loadDeveloperApplications(userId: string): DeveloperDraftApplication[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(`${DEV_APPS_STORAGE_KEY}_${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    }
  } catch {
    // ignore storage error
  }
  return [];
}

export function saveDeveloperApplications(
  userId: string,
  apps: DeveloperDraftApplication[]
): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${DEV_APPS_STORAGE_KEY}_${userId}`, JSON.stringify(apps));
    }
  } catch {
    // ignore storage error
  }
}

interface AccountManagementModalProps {
  onNavigateToAccount?: () => void;
}

export const AccountManagementModal: React.FC<AccountManagementModalProps> = ({
  onNavigateToAccount,
}) => {
  const {
    user,
    developerProfile,
    isAccountModalOpen,
    closeAccountModal,
    signOut,
    updateUserProfile,
    becomeDeveloper,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'profile' | 'developer' | 'settings'
  >('profile');

  const [devSubTab, setDevSubTab] = useState<
    'overview' | 'apps' | 'new' | 'drafts' | 'pending' | 'published' | 'rejected' | 'profile'
  >('overview');

  // Edit profile state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.websiteUrl || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Developer registration state
  const [orgName, setOrgName] = useState(developerProfile?.orgName || '');
  const [orgWebsite, setOrgWebsite] = useState(developerProfile?.orgWebsite || '');
  const [orgDescription, setOrgDescription] = useState(developerProfile?.orgDescription || '');
  const [payoutEmail, setPayoutEmail] = useState(developerProfile?.payoutEmail || user?.email || '');
  const [isSavingDev, setIsSavingDev] = useState(false);
  const [devMessage, setDevMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Developer Center application publishing state
  const [devApps, setDevApps] = useState<DeveloperDraftApplication[]>([]);
  const [appName, setAppName] = useState('');
  const [appSlug, setAppSlug] = useState('');
  const [appDesc, setAppDesc] = useState('');
  const [appCategory, setAppCategory] = useState('Development');
  const [appLicense, setAppLicense] = useState('GPL-3.0');
  const [appHomepage, setAppHomepage] = useState('');
  const [appSourceRepo, setAppSourceRepo] = useState('');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [appReleaseNotes, setAppReleaseNotes] = useState('');
  const [appDownloadUrl, setAppDownloadUrl] = useState('');
  const [appSha256, setAppSha256] = useState('');
  const [appArchs, setAppArchs] = useState<Architecture[]>(['x86_64']);
  const [publishMsg, setPublishMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setWebsiteUrl(user.websiteUrl || '');
      setDevApps(loadDeveloperApplications(user.id));
    }
  }, [user]);

  useEffect(() => {
    if (developerProfile) {
      setOrgName(developerProfile.orgName || '');
      setOrgWebsite(developerProfile.orgWebsite || '');
      setOrgDescription(developerProfile.orgDescription || '');
      setPayoutEmail(developerProfile.payoutEmail || user?.email || '');
    }
  }, [developerProfile, user?.email]);

  if (!isAccountModalOpen || !user) return null;

  const isApprovedDeveloper =
    user.dbRole === 'publisher' || user.dbRole === 'moderator' || user.dbRole === 'admin';

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsUpdatingProfile(true);

    try {
      await updateUserProfile({
        displayName: sanitizeText(displayName, 60),
        username: sanitizeUsername(username, 24),
        bio,
        websiteUrl,
      });
      setProfileMessage({ type: 'success', text: 'Profile updated.' });
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err?.message || 'Unable to update profile.' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleRegisterDeveloper = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDev(true);
    setDevMessage(null);

    try {
      await becomeDeveloper({
        orgName: sanitizeText(orgName, 100),
        orgWebsite: orgWebsite.trim() ? sanitizeUrl(orgWebsite.trim()) : undefined,
        orgDescription: sanitizeText(orgDescription, 500),
        payoutEmail: sanitizeText(payoutEmail, 120),
      });
      setDevMessage({
        type: 'success',
        text: isApprovedDeveloper
          ? 'Developer profile updated.'
          : 'Developer request submitted for review.',
      });
    } catch (err: any) {
      setDevMessage({
        type: 'error',
        text: err?.message || 'Unable to submit developer profile request.',
      });
    } finally {
      setIsSavingDev(false);
    }
  };

  const handleToggleArch = (arch: Architecture) => {
    setAppArchs((prev) =>
      prev.includes(arch)
        ? prev.length > 1
          ? prev.filter((a) => a !== arch)
          : prev
        : [...prev, arch]
    );
  };

  const handleSaveDeveloperApplication = (targetStatus: 'draft' | 'pending') => {
    setPublishMsg(null);
    const cleanName = sanitizeText(appName, 100);
    const cleanSlug = (appSlug || cleanName)
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    if (!cleanName || cleanName.length < 2) {
      setPublishMsg({ type: 'error', text: 'Application name is required.' });
      return;
    }
    if (!appVersion.trim() || /^(v?latest|unknown)$/i.test(appVersion.trim())) {
      setPublishMsg({
        type: 'error',
        text: 'Enter a valid semantic version (do not use latest or unknown).',
      });
      return;
    }
    if (targetStatus === 'pending') {
      if (!appDownloadUrl.trim().startsWith('https://')) {
        setPublishMsg({
          type: 'error',
          text: 'Download URL must use https:// when submitting for review.',
        });
        return;
      }
      if (appSha256.trim() && !/^[a-fA-F0-9]{64}$/.test(appSha256.trim())) {
        setPublishMsg({
          type: 'error',
          text: 'SHA-256 must be a valid 64-character hexadecimal digest.',
        });
        return;
      }
    }

    // Normal developers can only save as 'draft' or submit as 'pending'
    const enforcedStatus: 'draft' | 'pending' =
      targetStatus === 'pending' ? 'pending' : 'draft';

    const newEntry: DeveloperDraftApplication = {
      id: `app_${Date.now()}`,
      name: cleanName,
      slug: cleanSlug,
      description: sanitizeText(appDesc, 2000),
      category: appCategory,
      license: sanitizeText(appLicense, 80) || 'Open Source',
      homepageUrl: appHomepage.trim(),
      sourceRepoUrl: appSourceRepo.trim(),
      iconUrl: '',
      architectures: appArchs,
      version: appVersion.trim(),
      releaseNotes: sanitizeText(appReleaseNotes, 1000),
      downloadUrl: appDownloadUrl.trim(),
      sha256: appSha256.trim().toLowerCase(),
      status: enforcedStatus,
      updatedAt: new Date().toISOString(),
    };

    const next = [newEntry, ...devApps.filter((a) => a.slug !== cleanSlug)];
    setDevApps(next);
    saveDeveloperApplications(user.id, next);
    setPublishMsg({
      type: 'success',
      text:
        enforcedStatus === 'draft'
          ? `Saved "${cleanName}" as a draft.`
          : `Submitted "${cleanName}" for moderator review.`,
    });
  };

  const handleCopyAccountId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <ModalShell
      isOpen={isAccountModalOpen}
      onClose={closeAccountModal}
      labelledBy="account-modal-heading"
      maxWidthClass="max-w-2xl"
    >
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          {sanitizeUrl(user.avatarUrl) ? (
            <img
              src={sanitizeUrl(user.avatarUrl)}
              alt={sanitizeText(user.displayName, 60)}
              className="w-11 h-11 rounded-full object-cover border border-neutral-700"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-neutral-800 text-white flex items-center justify-center text-sm font-semibold">
              {sanitizeText(user.displayName, 60).slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="account-modal-heading"
                className="text-base font-semibold text-white tracking-tight"
              >
                {sanitizeText(user.displayName, 60)}
              </h2>
              <span className="text-xs font-mono text-neutral-400">
                · {user.dbRole}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              @{user.username} · {user.email} · Provider: {user.authProvider || 'email'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={closeAccountModal}
          aria-label="Close account modal"
          className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-900 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-2.5 bg-cyan-950/40 border-b border-cyan-800/40 flex items-center justify-between text-xs shrink-0">
        <span className="text-cyan-300 font-medium">Looking for full account dashboard & release tools?</span>
        <button
          type="button"
          onClick={() => {
            closeAccountModal();
            if (onNavigateToAccount) onNavigateToAccount();
          }}
          className="text-cyan-400 hover:text-cyan-300 underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          Open Account Dashboard
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex border-b border-neutral-800 bg-neutral-900/30 px-6 gap-2 shrink-0 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`py-3 px-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'profile'
              ? 'border-white text-white'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('developer')}
          className={`py-3 px-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'developer'
              ? 'border-white text-white'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{isApprovedDeveloper ? 'Developer Center' : 'Become a developer'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'border-white text-white'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        {activeTab === 'profile' && (
          <div className="space-y-5">
            {profileMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
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
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Bio (Optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Linux user or open-source maintainer..."
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Website URL (https://)
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Account Role
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.dbRole}
                    className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-800 rounded-lg text-sm font-mono text-neutral-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="flex items-center gap-2 py-2 px-4 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isUpdatingProfile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Save Profile Changes'
                )}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'developer' && (
          <div className="space-y-5">
            {!isApprovedDeveloper ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 space-y-1.5">
                  <h3 className="text-sm font-semibold text-white">Become a Developer</h3>
                  <p className="leading-relaxed">
                    Request publisher access to manage applications, publish multi-architecture
                    AppImage releases, and maintain your public developer profile.
                  </p>
                  {developerProfile?.status === 'pending' && (
                    <p className="text-amber-300 font-medium pt-1">
                      Status: Your publisher request for &ldquo;{developerProfile.orgName}&rdquo; is
                      currently pending moderator approval.
                    </p>
                  )}
                  {developerProfile?.status === 'rejected' && (
                    <p className="text-rose-300 font-medium pt-1">
                      Status: Request was not approved
                      {developerProfile.rejectionReason
                        ? ` (${developerProfile.rejectionReason})`
                        : ''}
                      .
                    </p>
                  )}
                </div>

                {devMessage && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
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
                      placeholder="e.g. KDE Community"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Publisher Description
                    </label>
                    <textarea
                      rows={2}
                      value={orgDescription}
                      onChange={(e) => setOrgDescription(e.target.value)}
                      placeholder="Brief overview of the Linux applications you publish..."
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Website (https://)
                      </label>
                      <input
                        type="url"
                        value={orgWebsite}
                        onChange={(e) => setOrgWebsite(e.target.value)}
                        placeholder="https://example.org"
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Private Contact Email (Never Public)
                      </label>
                      <input
                        type="email"
                        required
                        value={payoutEmail}
                        onChange={(e) => setPayoutEmail(e.target.value)}
                        placeholder="maintainer@example.org"
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingDev}
                    className="flex items-center gap-2 py-2 px-4 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingDev ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Request Publisher Access'
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* DEVELOPER CENTER FOR APPROVED PUBLISHERS */
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-900 rounded-lg border border-neutral-800 text-xs">
                  {(
                    [
                      { id: 'overview', label: 'Overview' },
                      { id: 'apps', label: 'My Applications' },
                      { id: 'new', label: 'New Application' },
                      { id: 'drafts', label: 'Drafts' },
                      { id: 'pending', label: 'Pending Review' },
                      { id: 'published', label: 'Published' },
                      { id: 'rejected', label: 'Rejected' },
                      { id: 'profile', label: 'Developer Profile' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDevSubTab(t.id)}
                      className={`px-2.5 py-1.5 rounded-md font-medium transition cursor-pointer ${
                        devSubTab === t.id
                          ? 'bg-white text-black'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {devSubTab === 'overview' && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
                        <span className="text-neutral-400 block">Drafts</span>
                        <span className="text-lg font-semibold text-white font-mono">
                          {devApps.filter((a) => a.status === 'draft').length}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
                        <span className="text-neutral-400 block">Pending Review</span>
                        <span className="text-lg font-semibold text-amber-300 font-mono">
                          {devApps.filter((a) => a.status === 'pending').length}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
                        <span className="text-neutral-400 block">Published</span>
                        <span className="text-lg font-semibold text-emerald-400 font-mono">
                          {devApps.filter((a) => a.status === 'published').length}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
                        <span className="text-neutral-400 block">Rejected</span>
                        <span className="text-lg font-semibold text-rose-400 font-mono">
                          {devApps.filter((a) => a.status === 'rejected').length}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDevSubTab('new')}
                      className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Create New Application</span>
                    </button>
                  </div>
                )}

                {devSubTab === 'new' && (
                  <div className="space-y-4 text-xs">
                    {publishMsg && (
                      <div
                        className={`p-3 rounded-lg flex items-center gap-2 ${
                          publishMsg.type === 'success'
                            ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                            : 'bg-red-950/40 border border-red-800 text-red-300'
                        }`}
                      >
                        <span>{publishMsg.text}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-neutral-300 mb-1">
                          Application Name
                        </label>
                        <input
                          type="text"
                          value={appName}
                          onChange={(e) => setAppName(e.target.value)}
                          placeholder="e.g. Krita"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-neutral-300 mb-1">Slug</label>
                        <input
                          type="text"
                          value={appSlug}
                          onChange={(e) => setAppSlug(e.target.value)}
                          placeholder="krita"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-300 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={appDesc}
                        onChange={(e) => setAppDesc(e.target.value)}
                        placeholder="Describe what this application does..."
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-medium text-neutral-300 mb-1">Category</label>
                        <select
                          value={appCategory}
                          onChange={(e) => setAppCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white"
                        >
                          <option value="Development">Development</option>
                          <option value="Graphics">Graphics</option>
                          <option value="Audio/Video">Audio/Video</option>
                          <option value="Internet">Internet</option>
                          <option value="Office">Office</option>
                          <option value="Games">Games</option>
                          <option value="System/Utilities">System/Utilities</option>
                          <option value="Education">Education</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium text-neutral-300 mb-1">Version</label>
                        <input
                          type="text"
                          value={appVersion}
                          onChange={(e) => setAppVersion(e.target.value)}
                          placeholder="1.0.0"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-neutral-300 mb-1">License</label>
                        <input
                          type="text"
                          value={appLicense}
                          onChange={(e) => setAppLicense(e.target.value)}
                          placeholder="GPL-3.0"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block font-medium text-neutral-300 mb-1.5">
                        Supported Architectures
                      </span>
                      <div className="flex items-center gap-3">
                        {(['x86_64', 'aarch64', 'armhf'] as Architecture[]).map((arch) => (
                          <label key={arch} className="inline-flex items-center gap-1.5 font-mono">
                            <input
                              type="checkbox"
                              checked={appArchs.includes(arch)}
                              onChange={() => handleToggleArch(arch)}
                            />
                            <span>{arch}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-neutral-300 mb-1">
                          Direct .AppImage URL (https://)
                        </label>
                        <input
                          type="url"
                          value={appDownloadUrl}
                          onChange={(e) => setAppDownloadUrl(e.target.value)}
                          placeholder="https://github.com/org/repo/releases/download/v1.0.0/App-x86_64.AppImage"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-neutral-300 mb-1">
                          SHA-256 Checksum
                        </label>
                        <input
                          type="text"
                          value={appSha256}
                          onChange={(e) => setAppSha256(e.target.value)}
                          placeholder="64-character hex digest"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-neutral-300 mb-1">
                          Source Repository URL
                        </label>
                        <input
                          type="url"
                          value={appSourceRepo}
                          onChange={(e) => setAppSourceRepo(e.target.value)}
                          placeholder="https://github.com/org/repo"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-neutral-300 mb-1">
                          Website URL
                        </label>
                        <input
                          type="url"
                          value={appHomepage}
                          onChange={(e) => setAppHomepage(e.target.value)}
                          placeholder="https://example.org"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-300 mb-1">
                        Release Notes
                      </label>
                      <textarea
                        rows={2}
                        value={appReleaseNotes}
                        onChange={(e) => setAppReleaseNotes(e.target.value)}
                        placeholder="What changed in this release..."
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveDeveloperApplication('draft')}
                        className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Save as Draft</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveDeveloperApplication('pending')}
                        className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit for Review</span>
                      </button>
                    </div>
                  </div>
                )}

                {(['apps', 'drafts', 'pending', 'published', 'rejected'] as const).includes(
                  devSubTab as any
                ) && (
                  <div className="space-y-3 text-xs">
                    {devApps
                      .filter((a) =>
                        devSubTab === 'apps'
                          ? true
                          : devSubTab === 'drafts'
                            ? a.status === 'draft'
                            : a.status === devSubTab
                      )
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{item.name}</span>
                              <span className="font-mono text-neutral-400">v{item.version}</span>
                              <span className="text-neutral-400">· {item.status}</span>
                            </div>
                            <p className="text-neutral-400 mt-0.5">
                              {item.architectures.join(', ')} · {item.category}
                            </p>
                            {item.rejectionReason && (
                              <p className="text-rose-400 mt-1">Reason: {item.rejectionReason}</p>
                            )}
                          </div>
                          {item.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = devApps.map((a) =>
                                  a.id === item.id ? { ...a, status: 'pending' as const } : a
                                );
                                setDevApps(updated);
                                saveDeveloperApplications(user.id, updated);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer"
                            >
                              Submit for Review
                            </button>
                          )}
                        </div>
                      ))}
                    {devApps.length === 0 && (
                      <div className="p-6 text-center rounded-lg bg-neutral-900/40 border border-neutral-800 text-neutral-400">
                        <Package className="w-5 h-5 mx-auto mb-1.5 text-neutral-500" />
                        <p>No developer applications found in this view.</p>
                      </div>
                    )}
                  </div>
                )}

                {devSubTab === 'profile' && (
                  <form onSubmit={handleRegisterDeveloper} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-medium text-neutral-300 mb-1">
                        Public Publisher Name
                      </label>
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-neutral-300 mb-1">
                        Public Website
                      </label>
                      <input
                        type="url"
                        value={orgWebsite}
                        onChange={(e) => setOrgWebsite(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-neutral-300 mb-1">
                        Private Notification Email (Hidden from public profile)
                      </label>
                      <input
                        type="email"
                        required
                        value={payoutEmail}
                        onChange={(e) => setPayoutEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingDev}
                      className="py-2 px-4 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold cursor-pointer"
                    >
                      Save Publisher Settings
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-neutral-400 block">Account ID</span>
                  <span className="font-mono text-neutral-200">{user.id}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAccountId}
                  className="flex items-center gap-1 text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
                >
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <span className="text-neutral-400">Authentication Provider</span>
                <span className="font-mono text-neutral-200">{user.authProvider || 'email'}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <span className="text-neutral-400">Role</span>
                <span className="font-mono text-neutral-200">{user.dbRole}</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/40 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-red-200">Sign Out</h4>
                <p className="text-red-300/70 mt-0.5">End your current session on this browser.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  closeAccountModal();
                  signOut();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
