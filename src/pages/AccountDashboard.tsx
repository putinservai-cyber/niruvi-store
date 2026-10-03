import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchUserLibraryFromSupabase,
  fetchUserDownloadsFromSupabase,
  fetchPublisherApplications,
  syncLibraryBookmarkWithSupabase,
  SupabaseLibraryRow,
  SupabaseDownloadRow,
  MarketplaceApp,
  OAuthProviderType,
} from '../lib/supabase';
import { sanitizeText, sanitizeUrl, sanitizeUsername } from '../utils/sanitize';
import {
  User,
  Shield,
  Link2,
  BookMarked,
  Download,
  Package,
  Building2,
  Settings,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  ExternalLink,
  Trash2,
  Bell,
  RefreshCw,
  PlusCircle,
  ChevronRight,
} from 'lucide-react';

export type AccountTab =
  | 'profile'
  | 'security'
  | 'connected'
  | 'library'
  | 'downloads'
  | 'applications'
  | 'publisher'
  | 'settings';

interface AccountDashboardProps {
  onNavigateToPublisher?: () => void;
  onNavigateToStore?: () => void;
  onOpenAppDetail?: (slug: string) => void;
}

export const AccountDashboard: React.FC<AccountDashboardProps> = ({
  onNavigateToPublisher,
  onNavigateToStore,
  onOpenAppDetail,
}) => {
  const {
    user,
    developerProfile,
    connectedIdentities,
    signOut,
    updateUserProfile,
    changePassword,
    linkProvider,
    unlinkProvider,
    becomeDeveloper,
    openAuthModal,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<AccountTab>('profile');

  // Edit profile state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.websiteUrl || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Library & Downloads
  const [libraryItems, setLibraryItems] = useState<SupabaseLibraryRow[]>([]);
  const [downloads, setDownloads] = useState<SupabaseDownloadRow[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [loadingDownloads, setLoadingDownloads] = useState(false);

  // Publisher applications
  const [publisherApps, setPublisherApps] = useState<MarketplaceApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  // Become publisher form state
  const [pubOrgName, setPubOrgName] = useState('');
  const [pubOrgWebsite, setPubOrgWebsite] = useState('');
  const [pubSourceUrl, setPubSourceUrl] = useState('');
  const [pubDescription, setPubDescription] = useState('');
  const [pubPayoutEmail, setPubPayoutEmail] = useState('');
  const [pubSubmitting, setPubSubmitting] = useState(false);
  const [pubMessage, setPubMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setWebsiteUrl(user.websiteUrl || '');
    }
  }, [user]);

  // Load Library & Downloads when tabs are clicked
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'library') {
      setLoadingLibrary(true);
      fetchUserLibraryFromSupabase(user.id)
        .then((items) => setLibraryItems(items))
        .finally(() => setLoadingLibrary(false));
    } else if (activeTab === 'downloads') {
      setLoadingDownloads(true);
      fetchUserDownloadsFromSupabase(user.id)
        .then((items) => setDownloads(items))
        .finally(() => setLoadingDownloads(false));
    } else if (activeTab === 'applications') {
      setLoadingApps(true);
      fetchPublisherApplications(user.id)
        .then((apps) => setPublisherApps(apps))
        .finally(() => setLoadingApps(false));
    }
  }, [activeTab, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        websiteUrl: websiteUrl.trim(),
      });
      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 10) {
      setSecurityMessage({ type: 'error', text: 'Password must be at least 10 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setSecuritySaving(true);
    setSecurityMessage(null);
    try {
      await changePassword(newPassword);
      setSecurityMessage({ type: 'success', text: 'Password changed successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setSecurityMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to change password.',
      });
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleConnectProvider = async (provider: OAuthProviderType) => {
    try {
      await linkProvider(provider);
    } catch (err) {
      setProfileMessage({
        type: 'error',
        text: err instanceof Error ? err.message : `Failed to connect ${provider}.`,
      });
    }
  };

  const handleDisconnectIdentity = async (id: string) => {
    try {
      await unlinkProvider(id);
      setProfileMessage({ type: 'success', text: 'Authentication method disconnected.' });
    } catch (err) {
      setProfileMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to disconnect method.',
      });
    }
  };

  const handleRemoveFromLibrary = async (slug: string) => {
    if (!user) return;
    await syncLibraryBookmarkWithSupabase({
      userId: user.id,
      appSlug: slug,
      bookmarked: false,
    });
    setLibraryItems((prev) => prev.filter((i) => i.appSlug !== slug));
  };

  const handleBecomePublisherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPubSubmitting(true);
    setPubMessage(null);
    try {
      await becomeDeveloper({
        orgName: pubOrgName.trim(),
        orgWebsite: pubOrgWebsite.trim(),
        sourceUrl: pubSourceUrl.trim(),
        orgDescription: pubDescription.trim(),
        payoutEmail: pubPayoutEmail.trim(),
      });
      setPubMessage({
        type: 'success',
        text: 'Publisher request submitted. An administrator will review your organization profile.',
      });
    } catch (err) {
      setPubMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to submit publisher request.',
      });
    } finally {
      setPubSubmitting(false);
    }
  };

  if (!user) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 max-w-md mx-auto shadow-2xl">
          <User className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Sign in to your Niruvi Account</h1>
          <p className="text-sm text-neutral-400 mb-6">
            Access your personal application library, real download history, publisher dashboard, and connected OAuth accounts.
          </p>
          <button
            onClick={openAuthModal}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl transition shadow-lg shadow-cyan-900/30"
          >
            Sign In or Create Account
          </button>
        </div>
      </main>
    );
  }

  const isPublisher = user.role === 'DEVELOPER' || user.role === 'ADMIN' || user.role === 'MODERATOR';

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10" id="main-content">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-8 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xl font-bold text-cyan-400 overflow-hidden">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              user.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{user.displayName}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-neutral-800 border border-neutral-700 text-neutral-300">
                @{user.username}
              </span>
              {isPublisher && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/80 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Publisher
                </span>
              )}
              {user.role === 'ADMIN' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-950 text-purple-300 border border-purple-800">
                  Admin
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-400 mt-1">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isPublisher && onNavigateToPublisher && (
            <button
              onClick={onNavigateToPublisher}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-cyan-300 border border-neutral-700 rounded-xl text-sm font-medium flex items-center gap-2 transition"
            >
              <Package className="w-4 h-4" />
              Publisher Dashboard
            </button>
          )}
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl text-sm font-medium transition"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar Tabs + Content Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-8">
        {/* Navigation Sidebar */}
        <nav aria-label="Account Sections" className="space-y-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === 'profile'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Profile
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === 'security'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            Security & Password
          </button>

          <button
            onClick={() => setActiveTab('connected')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === 'connected'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Connected Accounts
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === 'library'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            My Library
          </button>

          <button
            onClick={() => setActiveTab('downloads')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === 'downloads'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            Downloads History
          </button>

          {isPublisher ? (
            <button
              onClick={() => setActiveTab('applications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
                activeTab === 'applications'
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              My Applications
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('publisher')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
                activeTab === 'publisher'
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Become a Publisher
            </button>
          )}

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === 'settings'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </nav>

        {/* Content Area */}
        <div className="md:col-span-3 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8">
          {/* PROFILE SECTION */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Profile Information</h2>
              <p className="text-sm text-neutral-400 mb-6">
                Your public identity across reviews, discussions, and publisher profiles.
              </p>

              {profileMessage && (
                <div
                  className={`p-4 rounded-xl mb-6 text-sm flex items-center gap-3 border ${
                    profileMessage.type === 'success'
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                      : 'bg-red-950/40 text-red-300 border-red-800/60'
                  }`}
                >
                  {profileMessage.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  )}
                  {profileMessage.text}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-500 text-sm cursor-not-allowed"
                  />
                  <span className="text-xs text-neutral-500 mt-1 block">
                    Account email is managed through Supabase Auth.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={60}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-neutral-500 text-sm">@</span>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        maxLength={24}
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                    Bio
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={500}
                    placeholder="Tell the Linux community about yourself..."
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                    Website or Profile URL
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-cyan-900/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECURITY & PASSWORD SECTION */}
          {activeTab === 'security' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Security & Password</h2>
              <p className="text-sm text-neutral-400 mb-6">
                Manage your credentials, update your password, and verify session security.
              </p>

              {securityMessage && (
                <div
                  className={`p-4 rounded-xl mb-6 text-sm flex items-center gap-3 border ${
                    securityMessage.type === 'success'
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                      : 'bg-red-950/40 text-red-300 border-red-800/60'
                  }`}
                >
                  {securityMessage.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  )}
                  {securityMessage.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={10}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 10 characters"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={10}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={securitySaving || !newPassword}
                  className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-sm rounded-xl transition border border-neutral-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {securitySaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </form>

              <div className="mt-10 pt-8 border-t border-neutral-800">
                <h3 className="text-sm font-semibold text-white mb-2">Active Session Security</h3>
                <p className="text-xs text-neutral-400 mb-4">
                  Authenticated via Supabase Auth PKCE session with automatic refresh token rotation.
                </p>
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
                  <span>Session Identity: <strong className="text-neutral-200">{user.id}</strong></span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CONNECTED ACCOUNTS SECTION */}
          {activeTab === 'connected' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Connected Accounts</h2>
              <p className="text-sm text-neutral-400 mb-6">
                Link multiple login methods to your permanent Niruvi identity so you can sign in with Google, GitHub, or GitLab.
              </p>

              <div className="space-y-3">
                {/* Google */}
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center font-bold text-white">
                      G
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Google</div>
                      <div className="text-xs text-neutral-400">Sign in with your Google account</div>
                    </div>
                  </div>
                  {connectedIdentities.some((i) => i.provider === 'google') ? (
                    <span className="text-xs px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-medium">
                      Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConnectProvider('google')}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg transition"
                    >
                      Connect
                    </button>
                  )}
                </div>

                {/* GitHub */}
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center font-bold text-white">
                      GH
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">GitHub</div>
                      <div className="text-xs text-neutral-400">Access developer publishing & repository releases</div>
                    </div>
                  </div>
                  {connectedIdentities.some((i) => i.provider === 'github') ? (
                    <span className="text-xs px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-medium">
                      Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConnectProvider('github')}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg transition"
                    >
                      Connect
                    </button>
                  )}
                </div>

                {/* GitLab */}
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center font-bold text-white">
                      GL
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">GitLab</div>
                      <div className="text-xs text-neutral-400">Sync with GitLab community projects</div>
                    </div>
                  </div>
                  {connectedIdentities.some((i) => i.provider === 'gitlab') ? (
                    <span className="text-xs px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-medium">
                      Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConnectProvider('gitlab')}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg transition"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {connectedIdentities.length > 1 && (
                <div className="mt-8 pt-6 border-t border-neutral-800">
                  <h3 className="text-sm font-semibold text-white mb-3">Linked Identities ({connectedIdentities.length})</h3>
                  <div className="space-y-2">
                    {connectedIdentities.map((identity) => (
                      <div
                        key={identity.id}
                        className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl flex items-center justify-between text-xs"
                      >
                        <span className="capitalize text-neutral-300 font-medium">
                          {identity.provider} {identity.email ? `(${identity.email})` : ''}
                        </span>
                        <button
                          onClick={() => handleDisconnectIdentity(identity.id)}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          Disconnect
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MY LIBRARY SECTION */}
          {activeTab === 'library' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">My Application Library</h2>
                  <p className="text-sm text-neutral-400">
                    Saved Linux applications with automated update notifications.
                  </p>
                </div>
              </div>

              {loadingLibrary ? (
                <div className="py-16 text-center text-neutral-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                  Loading your library...
                </div>
              ) : libraryItems.length === 0 ? (
                <div className="py-16 text-center text-neutral-500 bg-neutral-950/40 rounded-xl border border-dashed border-neutral-800">
                  <BookMarked className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-base font-medium text-neutral-300 mb-1">Your library is currently empty</p>
                  <p className="text-xs text-neutral-500 mb-4">
                    Bookmark AppImages in the store to track updates and re-download anytime.
                  </p>
                  {onNavigateToStore && (
                    <button
                      onClick={onNavigateToStore}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg transition"
                    >
                      Browse Store Catalog
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {libraryItems.map((item) => (
                    <div
                      key={item.appSlug}
                      className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white capitalize">{item.appSlug}</div>
                        <div className="text-xs text-neutral-400">
                          {item.notifyUpdates ? 'Notifications enabled for new releases' : 'Notifications muted'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {onOpenAppDetail && (
                          <button
                            onClick={() => onOpenAppDetail(item.appSlug)}
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs rounded-lg transition"
                          >
                            View App
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveFromLibrary(item.appSlug)}
                          className="p-2 text-neutral-400 hover:text-red-400 transition"
                          title="Remove from library"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOWNLOADS HISTORY SECTION */}
          {activeTab === 'downloads' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">My Downloads</h2>
              <p className="text-sm text-neutral-400 mb-6">
                History of standalone Linux AppImages downloaded to this account.
              </p>

              {loadingDownloads ? (
                <div className="py-16 text-center text-neutral-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                  Loading download history...
                </div>
              ) : downloads.length === 0 ? (
                <div className="py-16 text-center text-neutral-500 bg-neutral-950/40 rounded-xl border border-dashed border-neutral-800">
                  <Download className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-base font-medium text-neutral-300 mb-1">No recorded downloads yet</p>
                  <p className="text-xs text-neutral-500">
                    When you download or install an AppImage, it will appear here for fast re-downloading.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {downloads.map((dl, idx) => (
                    <div
                      key={`${dl.appId}-${idx}`}
                      className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white capitalize">{dl.appId}</div>
                        <div className="text-neutral-400 mt-0.5">
                          Version: <span className="text-neutral-200">{dl.version}</span> • Arch: <span className="text-neutral-200">{dl.arch}</span>
                        </div>
                      </div>
                      <div className="text-right text-neutral-500">
                        {new Date(dl.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MY APPLICATIONS (FOR PUBLISHERS) */}
          {activeTab === 'applications' && isPublisher && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">My Published Applications</h2>
                  <p className="text-sm text-neutral-400">
                    Manage listings, releases, and moderation review status in PostgreSQL.
                  </p>
                </div>
                {onNavigateToPublisher && (
                  <button
                    onClick={onNavigateToPublisher}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    New Release
                  </button>
                )}
              </div>

              {loadingApps ? (
                <div className="py-16 text-center text-neutral-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                  Loading your applications...
                </div>
              ) : publisherApps.length === 0 ? (
                <div className="py-16 text-center text-neutral-500 bg-neutral-950/40 rounded-xl border border-dashed border-neutral-800">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-base font-medium text-neutral-300 mb-1">No applications published yet</p>
                  <p className="text-xs text-neutral-500 mb-4">
                    Publish your first Linux AppImage with GitHub/GitLab release automation.
                  </p>
                  {onNavigateToPublisher && (
                    <button
                      onClick={onNavigateToPublisher}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg transition"
                    >
                      Open Publisher Dashboard
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {publisherApps.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{app.name}</span>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              app.status === 'published'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : app.status === 'pending_review'
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : app.status === 'rejected'
                                ? 'bg-red-950 text-red-300 border-red-800'
                                : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400 mt-1">
                          {app.short_description || app.description.slice(0, 100)}
                        </div>
                      </div>
                      {onNavigateToPublisher && (
                        <button
                          onClick={onNavigateToPublisher}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs rounded-lg transition flex items-center gap-1"
                        >
                          Manage
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BECOME A PUBLISHER (FOR REGULAR USERS) */}
          {activeTab === 'publisher' && !isPublisher && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Become a Verified Publisher</h2>
              <p className="text-sm text-neutral-400 mb-6">
                Publish Linux AppImages directly to Niruvi Store, link your upstream GitHub/GitLab releases, and receive verified publisher badges.
              </p>

              {developerProfile?.status === 'pending' ? (
                <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-800/60 text-amber-200">
                  <div className="flex items-center gap-3 font-semibold text-base mb-2">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    Publisher Application Pending Verification
                  </div>
                  <p className="text-sm text-amber-300/80 mb-2">
                    Your publisher organization <strong>{developerProfile.orgName}</strong> is under review by Niruvi moderators.
                  </p>
                  <p className="text-xs text-amber-400/60">
                    Once approved, your account will gain access to the Publisher Dashboard and direct release submission tools.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleBecomePublisherSubmit} className="space-y-4">
                  {pubMessage && (
                    <div
                      className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
                        pubMessage.type === 'success'
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                          : 'bg-red-950/40 text-red-300 border-red-800/60'
                      }`}
                    >
                      {pubMessage.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 shrink-0" />
                      )}
                      {pubMessage.text}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                      Publisher / Organization Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={pubOrgName}
                      onChange={(e) => setPubOrgName(e.target.value)}
                      placeholder="e.g. Mozilla Foundation, VideoLAN, Indie Linux Team"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                        Official Website (HTTPS)
                      </label>
                      <input
                        type="url"
                        value={pubOrgWebsite}
                        onChange={(e) => setPubOrgWebsite(e.target.value)}
                        placeholder="https://example.org"
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                        Upstream Source / GitHub / GitLab URL
                      </label>
                      <input
                        type="url"
                        value={pubSourceUrl}
                        onChange={(e) => setPubSourceUrl(e.target.value)}
                        placeholder="https://github.com/organization"
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                      Publisher Description & Mission
                    </label>
                    <textarea
                      rows={3}
                      value={pubDescription}
                      onChange={(e) => setPubDescription(e.target.value)}
                      placeholder="Describe what applications your organization develops for the Linux desktop..."
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-cyan-500 text-white text-sm outline-none transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pubSubmitting || !pubOrgName.trim()}
                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-cyan-900/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {pubSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Publisher Application
                  </button>
                </form>
              )}
            </div>
          )}

          {/* SETTINGS / DANGER ZONE */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Account Settings</h2>
              <p className="text-sm text-neutral-400 mb-6">
                Manage system preferences and account status.
              </p>

              <div className="p-6 bg-red-950/20 border border-red-900/40 rounded-2xl">
                <h3 className="text-sm font-semibold text-red-300 mb-1">Danger Zone</h3>
                <p className="text-xs text-neutral-400 mb-4">
                  Deleting your account permanently removes your profile, library bookmarks, and reviews from Supabase PostgreSQL.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to sign out and clear active session?')) {
                      signOut();
                    }
                  }}
                  className="px-4 py-2 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-medium rounded-xl transition"
                >
                  Sign Out of All Devices
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
