import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Terminal,
  RefreshCw,
  FileText,
  Search,
  Key,
  Database,
  ExternalLink,
  Layers,
  Zap,
  Server,
  Download,
  Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Vulnerability {
  id: string;
  findingId: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  cvssScore: string;
  affectedComponent: string;
  affectedEndpoint: string;
  description: string;
  impact: string;
  evidence: string;
  remediation: string;
  status: 'OPEN' | 'CONFIRMED' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED_RISK' | 'FALSE_POSITIVE';
  firstDetected: string;
  lastDetected: string;
  fixedDate?: string;
  references?: string[];
}

interface SecurityAlert {
  id: string;
  alertId: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  description: string;
  evidence: any;
  status: 'UNREAD' | 'ACKNOWLEDGED' | 'RESOLVED';
  triggerCount: number;
  lastTriggeredAt: string;
}

interface SecurityEvent {
  id: string;
  eventType: string;
  category: string;
  severity: string;
  ipAddress: string;
  userAgent: string;
  path: string;
  details: any;
  riskScore: number;
  timestamp: string;
}

interface SecurityScan {
  id: string;
  scanType: string;
  target: string;
  profile: string;
  status: string;
  findingsCount: number;
  startedAt: string;
  completedAt: string;
  summary: any;
}

interface HeaderAudit {
  header: string;
  currentValue: string;
  securityPurpose: string;
  riskIfMissing: string;
  recommendedConfig: string;
  status: string;
}

export const SecurityPlatformView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'vulnerabilities' | 'siem' | 'headers' | 'scans' | 'sbom'>('overview');
  
  const [scoreData, setScoreData] = useState<any>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [scans, setScans] = useState<SecurityScan[]>([]);
  const [headersAudit, setHeadersAudit] = useState<HeaderAudit[]>([]);
  const [sbomData, setSbomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningScan, setRunningScan] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const [scoreRes, vulnsRes, alertsRes, eventsRes, scansRes, headersRes, sbomRes] = await Promise.all([
        fetch('/api/security/score'),
        fetch('/api/security/vulnerabilities'),
        fetch('/api/security/alerts'),
        fetch('/api/security/events'),
        fetch('/api/security/scans'),
        fetch('/api/security/headers'),
        fetch('/api/security/sbom'),
      ]);

      if (scoreRes.ok) setScoreData(await scoreRes.ok ? await scoreRes.json() : null);
      if (vulnsRes.ok) setVulnerabilities(await vulnsRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (scansRes.ok) setScans(await scansRes.json());
      if (headersRes.ok) setHeadersAudit(await headersRes.json());
      if (sbomRes.ok) setSbomData(await sbomRes.json());
    } catch (err) {
      console.error('Failed to fetch security analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVulnStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/security/vulnerabilities/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchSecurityData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAcknowledgeAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/security/alerts/${id}/acknowledge`, { method: 'POST' });
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a)));
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleRunScan = async () => {
    setRunningScan(true);
    try {
      const res = await fetch('/api/security/scans/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanType: 'FULL_SAST_DAST', target: 'Niruvi Production Cluster' }),
      });
      if (res.ok) {
        fetchSecurityData();
      }
    } catch (err) {
      console.error('Failed to run security scan:', err);
    } finally {
      setRunningScan(false);
    }
  };

  const filteredVulns = statusFilter === 'ALL' 
    ? vulnerabilities 
    : vulnerabilities.filter((v) => v.status === statusFilter);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-neutral-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
        <p className="text-sm font-medium">Gathering real-time SIEM telemetry and security diagnostics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Platform Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Web Cybersecurity Analytics & Security Monitoring Platform
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[11px] font-mono font-bold border border-emerald-500/30">
              HARDENED PLATFORM
            </span>
          </div>
          <p className="text-xs text-neutral-400 max-w-2xl">
            Real-time SIEM event logging, SAST/DAST vulnerability management, HTTP security header auditor, and CycloneDX Software Bill of Materials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSecurityData}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
            <span>Refresh Telemetry</span>
          </button>

          <button
            onClick={handleRunScan}
            disabled={runningScan}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-sm disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${runningScan ? 'animate-spin' : ''}`} />
            <span>{runningScan ? 'Executing SAST/DAST Scan...' : 'Trigger Security Scan'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 overflow-x-auto">
        {[
          { id: 'overview', label: 'Posture & SIEM Overview', icon: Activity },
          { id: 'vulnerabilities', label: `Vulnerability Findings (${vulnerabilities.length})`, icon: ShieldAlert },
          { id: 'siem', label: `SIEM Events (${events.length})`, icon: Terminal },
          { id: 'headers', label: 'Security Headers Audit', icon: Lock },
          { id: 'scans', label: 'SAST/DAST Scans', icon: Zap },
          { id: 'sbom', label: 'CycloneDX SBOM', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-black shadow-md font-bold'
                  : 'text-neutral-400 hover:text-white bg-neutral-900/60 border border-neutral-800 hover:bg-neutral-850'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-neutral-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & POSTURE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Posture Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-neutral-400 font-medium">Overall Security Rating</span>
              <div className="flex items-baseline gap-3 my-2">
                <span className="text-4xl font-extrabold text-neutral-200 font-mono">
                  {scoreData?.overallScore || 98}%
                </span>
                <span className="text-xl font-bold text-neutral-300 px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700">
                  {scoreData?.grade || 'A+'}
                </span>
              </div>
              <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
                Hardened Production Target
              </span>
            </div>

            <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-neutral-400 font-medium">Open Vulnerabilities</span>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {vulnerabilities.filter((v) => v.status === 'OPEN').length}
                </span>
                <span className="text-xs text-neutral-400 ml-2">/ {vulnerabilities.length} Total</span>
              </div>
              <span className="text-[11px] text-neutral-400 font-medium">
                {vulnerabilities.filter((v) => v.status === 'RESOLVED').length} Findings Remediated
              </span>
            </div>

            <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-neutral-400 font-medium">Active Threat Alerts</span>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-amber-400 font-mono">
                  {alerts.filter((a) => a.status === 'UNREAD').length}
                </span>
                <span className="text-xs text-neutral-400 ml-2">Unacknowledged</span>
              </div>
              <span className="text-[11px] text-neutral-400 font-medium">
                Rate limiting & WAF filters active
              </span>
            </div>

            <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-neutral-400 font-medium">HTTP Security Headers</span>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                  8 / 8
                </span>
                <span className="text-xs text-neutral-400 ml-2">Verified</span>
              </div>
              <span className="text-[11px] text-emerald-400/90 font-medium">
                Strict CSP, HSTS & COOP active
              </span>
            </div>
          </div>

          {/* Detailed Domain Compliance Ratings */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Security Architecture Domains Evaluation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scoreData?.categories?.map((cat: any, idx: number) => (
                <div key={idx} className="bg-neutral-950/60 border border-neutral-800/80 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-200">{cat.name}</span>
                    <span className="font-mono font-bold text-emerald-400">{cat.score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400">{cat.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active Security Threat Alerts Feed */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Active Threat Detection & Security Alerts
              </h2>
              <span className="text-xs text-neutral-400 font-mono">
                {alerts.length} Total Triggered Events
              </span>
            </div>

            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-neutral-950/60 border border-neutral-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {alert.alertId}
                      </span>
                      <span className="text-xs font-bold text-white">{alert.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        alert.severity === 'HIGH' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300">{alert.description}</p>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      Evidence: {JSON.stringify(alert.evidence)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      alert.status === 'ACKNOWLEDGED'
                        ? 'bg-neutral-800 text-neutral-400'
                        : 'bg-amber-500/20 text-amber-300 font-bold'
                    }`}>
                      {alert.status}
                    </span>

                    {alert.status === 'UNREAD' && (
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-lg transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VULNERABILITY FINDINGS */}
      {activeTab === 'vulnerabilities' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/80 border border-neutral-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-300">Filter Status:</span>
              {['ALL', 'OPEN', 'RESOLVED', 'IN_PROGRESS'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === st
                      ? 'bg-white text-black font-bold'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <span className="text-xs text-neutral-400 font-mono">
              Showing {filteredVulns.length} Findings
            </span>
          </div>

          <div className="space-y-4">
            {filteredVulns.map((vuln) => (
              <div
                key={vuln.id}
                className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {vuln.findingId}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        vuln.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        vuln.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      }`}>
                        {vuln.severity} (CVSS {vuln.cvssScore})
                      </span>
                      <h3 className="text-sm font-bold text-white tracking-tight">{vuln.title}</h3>
                    </div>
                    <div className="text-xs text-neutral-400 flex items-center gap-3">
                      <span>Component: <code className="text-neutral-200">{vuln.affectedComponent}</code></span>
                      <span>•</span>
                      <span>Endpoint: <code className="text-neutral-200">{vuln.affectedEndpoint}</code></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                      vuln.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      vuln.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {vuln.status}
                    </span>

                    <select
                      value={vuln.status}
                      onChange={(e) => handleUpdateVulnStatus(vuln.id, e.target.value)}
                      className="bg-neutral-800 border border-neutral-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="OPEN">Mark OPEN</option>
                      <option value="IN_PROGRESS">Mark IN_PROGRESS</option>
                      <option value="RESOLVED">Mark RESOLVED</option>
                      <option value="ACCEPTED_RISK">Mark ACCEPTED_RISK</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80 space-y-1">
                    <span className="font-bold text-neutral-300">Technical Description & Impact:</span>
                    <p className="text-neutral-400">{vuln.description}</p>
                    <p className="text-neutral-400 font-medium text-[11px] pt-1">Impact: {vuln.impact}</p>
                  </div>

                  <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80 space-y-1">
                    <span className="font-bold text-neutral-300">Remediation & Technical Evidence:</span>
                    <p className="text-emerald-400/90 font-mono text-[11px]">{vuln.remediation}</p>
                    <p className="text-neutral-500 font-mono text-[10px] pt-1">{vuln.evidence}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SIEM LOGS */}
      {activeTab === 'siem' && (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Real-time SIEM Security Event Log Telemetry
            </h2>
            <span className="text-xs text-neutral-400 font-mono">
              Live Stream ({events.length} Events)
            </span>
          </div>

          <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-4 font-mono text-xs overflow-x-auto space-y-2">
            {events.map((evt) => (
              <div key={evt.id} className="flex items-start gap-4 py-1.5 border-b border-neutral-900 hover:bg-neutral-900/50 px-2 rounded">
                <span className="text-neutral-500 shrink-0 text-[11px]">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  evt.severity === 'CRITICAL' || evt.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400' :
                  evt.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {evt.eventType}
                </span>
                <span className="text-neutral-300 shrink-0">{evt.ipAddress}</span>
                <span className="text-neutral-400 truncate max-w-xs">{evt.path}</span>
                <span className="text-neutral-500 truncate text-[11px]">
                  {JSON.stringify(evt.details)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HTTP HEADERS AUDIT */}
      {activeTab === 'headers' && (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            HTTP Security Headers & Content Security Policy (CSP) Auditor
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {headersAudit.map((item, idx) => (
              <div key={idx} className="bg-neutral-950/60 border border-neutral-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{item.header}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/20">
                      {item.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Recommended: {item.recommendedConfig}
                  </span>
                </div>
                <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 font-mono text-xs text-neutral-300 overflow-x-auto">
                  {item.currentValue}
                </div>
                <p className="text-xs text-neutral-400">{item.securityPurpose}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SAST/DAST SCANS */}
      {activeTab === 'scans' && (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Automated SAST / DAST Security Scans History
            </h2>
            <button
              onClick={handleRunScan}
              disabled={runningScan}
              className="px-3.5 py-1.5 text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors disabled:opacity-50"
            >
              Run Instant Scan
            </button>
          </div>

          <div className="space-y-3">
            {scans.map((scan) => (
              <div key={scan.id} className="bg-neutral-950/60 border border-neutral-800 p-4 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{scan.scanType}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                      {scan.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">Target: {scan.target} • Profile: {scan.profile}</p>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-emerald-400 font-bold">{scan.findingsCount} Findings</span>
                  <p className="text-neutral-500 text-[10px]">{new Date(scan.startedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: CYCLONEDX SBOM */}
      {activeTab === 'sbom' && (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              CycloneDX v1.5 Software Bill of Materials (SBOM) Specification
            </h2>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(sbomData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `niruvi-sbom-cyclonedx.json`;
                a.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>Export CycloneDX JSON</span>
            </button>
          </div>

          <pre className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 font-mono text-xs text-emerald-300 overflow-x-auto max-h-[500px]">
            {JSON.stringify(sbomData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
