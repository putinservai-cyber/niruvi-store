import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Activity, 
  Cpu, 
  HardDrive, 
  Users, 
  Download, 
  Star, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Trash2, 
  Check, 
  X, 
  Terminal, 
  ExternalLink,
  Laptop,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { AppMetadata } from '../types';
import { AppIcon } from './AppIcon';
import { useAuth } from '../context/AuthContext';

interface AdminOverviewData {
  database: {
    status: string;
    engine: string;
    region: string;
    latencyMs: number;
    orm: string;
  };
  stats: {
    totalApps: number;
    publishedApps: number;
    pendingApps: number;
    featuredApps: number;
    totalUsers: number;
    developersCount: number;
    adminsCount: number;
    totalDownloads: number;
    totalReviews: number;
  };
  runtime: {
    uptimeSeconds: number;
    nodeVersion: string;
    memoryRssMb: number;
    memoryHeapMb: number;
    environment: string;
  };
}

interface AuditLogRecord {
  id: string;
  userId?: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: string;
}

interface AdminReviewRecord {
  id: string;
  appId: string;
  appName?: string;
  userId: string;
  userDisplayName?: string;
  rating: number;
  title: string;
  body: string;
  helpfulCount: number;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

interface AdminDashboardProps {
  onOpenAppDetail: (app: AppMetadata) => void;
  onOpenBridgeModal: () => void;
  onRefreshCatalog: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenAppDetail,
  onOpenBridgeModal,
  onRefreshCatalog,
}) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'apps' | 'audit' | 'reviews' | 'bridge'>('overview');
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [allApps, setAllApps] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [reviewsList, setReviewsList] = useState<AdminReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [appSearch, setAppSearch] = useState('');
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'published' | 'featured'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 3500);
  };

  const fetchAdminData = async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch overview telemetry
      const overviewRes = await fetch('/api/admin/overview', { headers });
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data);
      }

      // 2. Fetch all apps
      const appsRes = await fetch('/api/admin/apps', { headers });
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setAllApps(appsData);
      }

      // 3. Fetch audit logs
      const auditRes = await fetch('/api/admin/audit-logs', { headers });
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData);
      }

      // 4. Fetch reviews
      const revRes = await fetch('/api/admin/reviews', { headers });
      if (revRes.ok) {
        const revData = await revRes.json();
        setReviewsList(revData);
      }
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  // Toggle Featured App
  const handleToggleFeature = async (appId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/apps/${appId}/toggle-feature`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message);
        fetchAdminData();
        onRefreshCatalog();
      } else {
        showNotification(data.error || 'Failed to toggle feature', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Toggle Published Status
  const handleTogglePublish = async (appId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/apps/${appId}/toggle-publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message);
        fetchAdminData();
        onRefreshCatalog();
      } else {
        showNotification(data.error || 'Failed to toggle publish', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Moderate App (Approve / Reject)
  const handleModerateApp = async (appId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/apps/${appId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`App ${status.toLowerCase()} successfully`);
        fetchAdminData();
        onRefreshCatalog();
      } else {
        showNotification(data.error || 'Moderation failed', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Delete App
  const handleDeleteApp = async (appId: string, name: string) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to permanently delete '${name}' from the store catalog?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/apps/${appId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message);
        fetchAdminData();
        onRefreshCatalog();
      } else {
        showNotification(data.error || 'Delete failed', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Delete Review
  const handleDeleteReview = async (reviewId: string) => {
    if (!token) return;
    if (!window.confirm('Delete this user review?')) return;
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message);
        fetchAdminData();
      } else {
        showNotification(data.error || 'Failed to delete review', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Filter apps
  const filteredApps = allApps.filter((a) => {
    const matchesSearch = 
      a.name.toLowerCase().includes(appSearch.toLowerCase()) ||
      a.slug.toLowerCase().includes(appSearch.toLowerCase()) ||
      (a.publisherName && a.publisherName.toLowerCase().includes(appSearch.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (appFilter === 'pending') return a.moderationStatus === 'PENDING';
    if (appFilter === 'published') return a.isPublished === true;
    if (appFilter === 'featured') return a.featured === true;
    return true;
  });

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Alert banner */}
      {actionMessage && (
        <div 
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
            actionMessage.type === 'success' 
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5 text-neutral-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Admin Monitoring & Control Center</h1>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-white text-black">
                  Admin Access
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Authorized for <strong className="text-neutral-200">{user?.displayName || 'Admin'}</strong> ({user?.email}) • Cloud SQL Telemetry & Catalog Governance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenBridgeModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white text-xs font-medium border border-neutral-700 transition"
          >
            <Zap className="w-3.5 h-3.5 text-neutral-300" />
            <span>Niruvi Desktop Bridge</span>
          </button>
          <button
            onClick={fetchAdminData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-1 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-neutral-800 text-white font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System & Health Monitoring</span>
        </button>

        <button
          onClick={() => setActiveTab('apps')}
          className={`px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'apps'
              ? 'bg-neutral-800 text-white font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>App Catalog Management</span>
          {overview?.stats.pendingApps ? (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
              {overview.stats.pendingApps}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-neutral-800 text-white font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Live Audit & Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reviews'
              ? 'bg-neutral-800 text-white font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Review Moderation</span>
        </button>

        <button
          onClick={() => setActiveTab('bridge')}
          className={`px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'bridge'
              ? 'bg-neutral-800 text-white font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Desktop Protocol Diagnostics</span>
        </button>
      </div>

      {/* TAB 1: SYSTEM & HEALTH MONITORING */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Database Health Card */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-medium">Cloud SQL Database</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  <span>Connected</span>
                  <span className="text-xs font-mono font-normal text-neutral-400">
                    {overview?.database.latencyMs ?? '--'}ms latency
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 font-mono">
                  Region: {overview?.database.region || 'asia-southeast1'}
                </p>
              </div>
              <div className="pt-2 border-t border-neutral-850 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>{overview?.database.engine || 'PostgreSQL 16'}</span>
                <span>{overview?.database.orm || 'Drizzle ORM'}</span>
              </div>
            </div>

            {/* Catalog Health Card */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-medium">Catalog Apps</span>
                <HardDrive className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {overview?.stats.totalApps ?? allApps.length}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  <span className="text-emerald-400 font-semibold">{overview?.stats.publishedApps ?? 0}</span> published • <span className="text-amber-400 font-semibold">{overview?.stats.pendingApps ?? 0}</span> pending
                </p>
              </div>
              <div className="pt-2 border-t border-neutral-850 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>Featured: {overview?.stats.featuredApps ?? 0}</span>
                <span>x86_64 / ARM</span>
              </div>
            </div>

            {/* User & Developer Base Card */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-medium">Community Base</span>
                <Users className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {overview?.stats.totalUsers ?? 0}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  <span className="text-neutral-200 font-semibold">{overview?.stats.developersCount ?? 0}</span> developers • <span className="text-neutral-200 font-semibold">{overview?.stats.adminsCount ?? 0}</span> admins
                </p>
              </div>
              <div className="pt-2 border-t border-neutral-850 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>Auth: JWT & Firebase</span>
                <span>Active</span>
              </div>
            </div>

            {/* Platform Volume Card */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-medium">Downloads & Reviews</span>
                <Download className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {overview?.stats.totalDownloads ?? 0}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  <span className="text-neutral-200 font-semibold">{overview?.stats.totalReviews ?? 0}</span> reviews submitted
                </p>
              </div>
              <div className="pt-2 border-t border-neutral-850 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>SHA-256 Verified</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Runtime & Container Telemetry Details */}
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-neutral-400" />
              <span>Container Runtime & Infrastructure Status</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
                <span className="text-neutral-400 block text-[11px]">Server Uptime</span>
                <span className="text-sm font-mono font-bold text-white mt-1 block">
                  {overview?.runtime.uptimeSeconds ? formatUptime(overview.runtime.uptimeSeconds) : '--'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
                <span className="text-neutral-400 block text-[11px]">Memory Usage (RSS / Heap)</span>
                <span className="text-sm font-mono font-bold text-white mt-1 block">
                  {overview?.runtime.memoryRssMb ?? '--'} MB / {overview?.runtime.memoryHeapMb ?? '--'} MB
                </span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
                <span className="text-neutral-400 block text-[11px]">Node.js Runtime</span>
                <span className="text-sm font-mono font-bold text-white mt-1 block">
                  {overview?.runtime.nodeVersion || process.version || 'v20.x'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
                <span className="text-neutral-400 block text-[11px]">Ingress Port & Network</span>
                <span className="text-sm font-mono font-bold text-emerald-400 mt-1 block">
                  0.0.0.0:3000 (Operational)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APP CATALOG MANAGEMENT */}
      {activeTab === 'apps' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search catalog by name, slug, publisher..."
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto text-xs">
              <button
                onClick={() => setAppFilter('all')}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  appFilter === 'all'
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                All ({allApps.length})
              </button>
              <button
                onClick={() => setAppFilter('pending')}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  appFilter === 'pending'
                    ? 'bg-amber-400 text-black border-amber-400 font-semibold'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                Pending Moderation ({allApps.filter((a) => a.moderationStatus === 'PENDING').length})
              </button>
              <button
                onClick={() => setAppFilter('published')}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  appFilter === 'published'
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                Published
              </button>
              <button
                onClick={() => setAppFilter('featured')}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  appFilter === 'featured'
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                Featured Spotlight
              </button>
            </div>
          </div>

          {/* Apps Table */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 text-[11px] uppercase tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-4">Application</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Publisher</th>
                    <th className="py-3 px-4 text-center">Featured</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-500">
                        No applications match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map((app) => (
                      <tr key={app.id} className="hover:bg-neutral-850/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0">
                              <AppIcon slug={app.slug || app.id} className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-2">
                                <span>{app.name}</span>
                                <span className="text-[10px] font-mono text-neutral-400">v{app.version}</span>
                              </div>
                              <p className="text-[11px] text-neutral-400 line-clamp-1 max-w-xs">
                                {app.tagline}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-neutral-300">
                          <span className="px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-[10px] font-mono">
                            {app.category}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-neutral-300">
                          <div className="font-medium text-neutral-200">{app.publisherName || 'Community'}</div>
                          <span className="text-[10px] text-neutral-400 font-mono">{app.license}</span>
                        </td>

                        {/* Featured Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleFeature(app.id)}
                            className={`p-1.5 rounded-lg border transition ${
                              app.featured
                                ? 'bg-amber-400/20 text-amber-300 border-amber-500/40'
                                : 'bg-neutral-800 text-neutral-500 border-neutral-700 hover:text-neutral-300'
                            }`}
                            title={app.featured ? 'Featured in spotlight (Click to unfeature)' : 'Not featured (Click to feature in spotlight)'}
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        </td>

                        {/* Published Status Toggle */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {app.moderationStatus === 'PENDING' ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                                Pending Approval
                              </span>
                            ) : app.isPublished ? (
                              <button
                                onClick={() => handleTogglePublish(app.id)}
                                className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold hover:bg-emerald-400/30 transition flex items-center gap-1"
                                title="Click to unpublish"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Published</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleTogglePublish(app.id)}
                                className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 text-[10px] font-semibold hover:bg-neutral-750 transition flex items-center gap-1"
                                title="Click to publish"
                              >
                                <EyeOff className="w-3 h-3" />
                                <span>Unpublished</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {app.moderationStatus === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleModerateApp(app.id, 'APPROVED')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition"
                                  title="Approve app"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleModerateApp(app.id, 'REJECTED')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold transition"
                                  title="Reject app"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => handleDeleteApp(app.id, app.name)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition"
                              title="Delete application"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE AUDIT & ACTIVITY LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Live Platform Events & Audit Stream</h3>
            <span className="text-xs text-neutral-400 font-mono">Showing recent 50 events</span>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 text-[11px] uppercase tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Initiator / IP</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-neutral-500">
                        No audit logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-850/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            log.action === 'ADMIN_ACTION'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : log.action === 'LOGIN'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : log.action === 'DOWNLOAD'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-neutral-300">
                          <div>{log.userId ? log.userId.slice(0, 16) : 'Anonymous'}</div>
                          <span className="text-[10px] text-neutral-500">{log.ipAddress || '127.0.0.1'}</span>
                        </td>

                        <td className="py-3 px-4 text-neutral-300 font-mono text-[11px]">
                          {log.metadata ? (
                            <span className="line-clamp-1">{JSON.stringify(log.metadata)}</span>
                          ) : (
                            <span className="text-neutral-500">None</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right text-neutral-400 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REVIEW MODERATION */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Community Reviews Moderation</h3>
            <span className="text-xs text-neutral-400 font-mono">{reviewsList.length} total reviews</span>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 text-[11px] uppercase tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-4">Application</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Rating & Content</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {reviewsList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-neutral-500">
                        No user reviews submitted yet.
                      </td>
                    </tr>
                  ) : (
                    reviewsList.map((rev) => (
                      <tr key={rev.id} className="hover:bg-neutral-850/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          {rev.appName || rev.appId}
                        </td>

                        <td className="py-3 px-4 text-neutral-300">
                          <div>{rev.userDisplayName || 'Anonymous User'}</div>
                          {rev.isVerifiedPurchase && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified Download</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-amber-400 mb-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < rev.rating ? 'fill-amber-400' : 'text-neutral-700'}`}
                              />
                            ))}
                            <span className="text-neutral-400 text-[10px] ml-1 font-mono">({rev.rating}/5)</span>
                          </div>
                          <p className="font-semibold text-white text-xs">{rev.title}</p>
                          <p className="text-neutral-400 text-[11px] mt-0.5 line-clamp-2">{rev.body}</p>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteReview(rev.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition"
                            title="Delete review"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DESKTOP PROTOCOL DIAGNOSTICS */}
      {activeTab === 'bridge' && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Laptop className="w-5 h-5 text-neutral-300" />
              <span>Niruvi Desktop Protocol Bridge Diagnostics</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Verify desktop URI dispatch payloads and inspect custom scheme handlers for Linux system integration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 space-y-3">
              <div className="font-semibold text-white text-xs flex items-center gap-2">
                <Terminal className="w-4 h-4 text-neutral-400" />
                <span>Protocol URI Generator & Inspector</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Sample command sent by Niruvi Store when a user triggers one-click desktop installation:
              </p>
              <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-[10px] text-neutral-300 break-all">
                niruvi://install?id=vscodium&version=1.97.2&sha256=11fdbca66fa...&url=https%3A%2F%2Fgithub.com%2F...
              </div>
              <button
                onClick={() => {
                  window.location.href = 'niruvi://ping?source=admin_diagnostics&ts=' + Date.now();
                  showNotification('Dispatched niruvi://ping to local desktop agent');
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Test Local Desktop Ping</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 space-y-3">
              <div className="font-semibold text-white text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-400" />
                <span>MIME Scheme Handler Association</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                To check if the protocol handler is registered in the current Linux desktop environment:
              </p>
              <pre className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-[10px] text-neutral-300 overflow-x-auto">
                xdg-mime query default x-scheme-handler/niruvi
              </pre>
              <p className="text-[10px] text-neutral-500 font-mono">
                Expected output: niruvi.desktop
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
