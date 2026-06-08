import { useState, useEffect, useCallback } from 'react';
import {
  Server, Globe, Cpu, Monitor, HardDrive, RefreshCw,
  Clock, AlertTriangle, CheckCircle2, Shield, ShieldAlert, Zap,
  ExternalLink, Wifi,
  BarChart3, Bug, Lock, Unlock
} from 'lucide-react';

// ── Types ──

interface ServerInfo {
  id: number;
  name: string;
  host: string;
  type: string;
  status: string;
  cpu_usage: number;
  ram_usage: number;
  disk_usage: number;
  last_updated: string | null;
}

interface WebsiteInfo {
  id: number;
  name: string;
  url: string;
  status: string;
  response_time_ms: number;
  last_checked: string | null;
  ssl_valid: number;
  ssl_expires: string | null;
}

interface ErrorInfo {
  id: number;
  source: string;
  severity: string;
  message: string;
  created_at: string;
}

interface SecurityInfo {
  id: number;
  check_type: string;
  status: string;
  detail: string;
  checked_at: string;
}

interface DashboardData {
  servers: ServerInfo[];
  websites: WebsiteInfo[];
  errors: ErrorInfo[];
  security_checks: SecurityInfo[];
}

// ── Helpers ──

const timeAgo = (ts: string | null): string => {
  if (!ts) return 'never';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const usageBarColor = (val: number): string => {
  if (val > 80) return 'from-rose-500 to-rose-400';
  if (val > 60) return 'from-amber-500 to-amber-400';
  return 'from-emerald-500 to-emerald-400';
};

const usageTextColor = (val: number): string => {
  if (val > 80) return 'text-rose-400';
  if (val > 60) return 'text-amber-400';
  return 'text-emerald-400';
};

const statusDot = (status: string): string => {
  if (!status) return 'bg-slate-500';
  const s = status.toLowerCase();
  if (s === 'online' || s === 'healthy' || s === 'up' || s === 'active') return 'bg-emerald-500';
  if (s === 'warning' || s === 'degraded') return 'bg-amber-500';
  if (s === 'offline' || s === 'down' || s === 'critical' || s === 'error') return 'bg-rose-500';
  return 'bg-slate-500';
};

const statusLabel = (status: string): string => {
  if (!status) return 'Unknown';
  const s = status.toLowerCase();
  if (s === 'online' || s === 'healthy' || s === 'up') return 'Online';
  if (s === 'warning' || s === 'degraded') return 'Warning';
  if (s === 'offline' || s === 'down') return 'Offline';
  if (s === 'critical') return 'Critical';
  if (s === 'active') return 'Active';
  if (s === 'error') return 'Error';
  return status;
};

const severityBg = (sev: string): string => {
  const s = sev.toLowerCase();
  if (s === 'critical' || s === 'error') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  if (s === 'warning') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

const formatNum = (n: number | undefined | null): string => {
  if (n == null || isNaN(n)) return '0';
  return n.toLocaleString('id-ID');
};

// ── Mini Components ──

function UsageBar({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs items-center">
        <span className="flex items-center gap-1.5 text-slate-400"><Icon size={13} color={color} /> {label}</span>
        <span className={`font-mono text-sm font-semibold ${usageTextColor(value)}`}>
          {Number(value || 0).toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${usageBarColor(value)} transition-all duration-1000`}
          style={{ width: `${Math.min(value || 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, color, bad }: {
  title: string; value: string; sub?: string; icon: any; color: string; bad?: boolean;
}) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-3 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity">
        <Icon className="w-24 h-24" color={color} />
      </div>
      <div className="relative z-10">
        <p className="text-slate-400 text-xs font-medium">{title}</p>
        <p className={`text-3xl font-bold mt-1.5 ${bad ? 'text-rose-400' : 'text-white'}`}>{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Component ──

const MonitoringServer = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const api = async (action: string, body?: any) => {
    const res = await fetch('/api.php', {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify({ action, ...body }) } : {}),
    });
    return res.json();
  };

  const fetchAll = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [serverRes, webRes, errRes, secRes] = await Promise.all([
        api('get_monitor_servers'),
        api('get_monitor_websites'),
        api('get_error_center'),
        api('get_security_checks'),
      ]);

      setData({
        servers: serverRes.data || serverRes || [],
        websites: webRes.data || webRes || [],
        errors: errRes.data || errRes?.errors || errRes || [],
        security_checks: secRes.data || secRes || [],
      });
      setLastFetch(new Date().toLocaleTimeString('id-ID'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(true);
    const interval = setInterval(() => fetchAll(false), 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll(false);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  const servers = data?.servers || [];
  const websites = data?.websites || [];
  const errors = data?.errors || [];
  const security = data?.security_checks || [];

  const totalOnline = servers.filter(s => s.status === 'online' || s.status === 'healthy').length;
  const totalWarning = servers.filter(s => s.status === 'warning').length;
  const totalCritical = servers.filter(s => s.status === 'critical' || s.status === 'offline').length;
  const avgCpu = servers.length ? servers.reduce((a, s) => a + (s.cpu_usage || 0), 0) / servers.length : 0;
  const avgRam = servers.length ? servers.reduce((a, s) => a + (s.ram_usage || 0), 0) / servers.length : 0;
  const avgDisk = servers.length ? servers.reduce((a, s) => a + (s.disk_usage || 0), 0) / servers.length : 0;

  const criticalErrors = errors.filter(e => e.severity === 'critical' || e.severity === 'error');
  const warningErrors = errors.filter(e => e.severity === 'warning');

  const securityIssues = security.filter(s => s.status === 'critical' || s.status === 'warning');
  const websitesDown = websites.filter(w => w.status === 'offline' || w.status === 'down');

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Server className="text-primary" size={24} /> Monitoring Server
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time overview · {servers.length} server{servers.length !== 1 ? 's' : ''} · {websites.length} website{websites.length !== 1 ? 's' : ''} · Auto-refresh 15s
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl transition-all disabled:opacity-50">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
          <span className="text-slate-600">{lastFetch}</span>
        </div>
      </div>

      {/* ── Summary Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Server Status"
          value={`${totalOnline} / ${servers.length}`}
          sub={`${totalCritical} critical · ${totalWarning} warning`}
          icon={Server} color="#22c55e"
          bad={totalCritical > 0}
        />
        <StatCard
          title="Websites"
          value={`${websites.length - websitesDown.length} / ${websites.length}`}
          sub={`${websitesDown.length} down`}
          icon={Globe} color="#3b82f6"
          bad={websitesDown.length > 0}
        />
        <StatCard
          title="Errors"
          value={formatNum(errors.length)}
          sub={`${criticalErrors.length} critical · ${warningErrors.length} warning`}
          icon={Bug} color="#ef4444"
          bad={criticalErrors.length > 0}
        />
        <StatCard
          title="Security"
          value={formatNum(security.length)}
          sub={`${securityIssues.length} issue${securityIssues.length !== 1 ? 's' : ''}`}
          icon={Shield} color="#a855f7"
          bad={securityIssues.length > 0}
        />
      </div>

      {/* ── Main Grid: Left (Servers + Resources) + Right (Websites + Errors) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── LEFT COLUMN (3/5) ── */}
        <div className="xl:col-span-3 space-y-6">

          {/* ── Server Cards ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Server size={14} /> Servers
            </h3>
            {servers.length === 0 ? (
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-8 text-center">
                <Server className="mx-auto text-slate-700 mb-2" size={32} />
                <p className="text-slate-500 text-sm">No servers configured</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {servers.map(s => (
                  <div key={s.id} className={`bg-slate-900/30 border rounded-2xl p-4 transition-all hover:shadow-lg hover:shadow-primary/5 ${
                    s.status === 'critical' || s.status === 'offline' ? 'border-rose-500/30' :
                    s.status === 'warning' ? 'border-amber-500/30' : 'border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot(s.status)}`} />
                        <div className="min-w-0">
                          <h4 className="text-white font-semibold text-sm truncate">{s.name}</h4>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Wifi size={9} /> {s.host}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider shrink-0 ${
                        s.status === 'online' || s.status === 'healthy' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' :
                        s.status === 'warning' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                        s.status === 'critical' || s.status === 'offline' ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' :
                        'text-slate-400 border-slate-500/20 bg-slate-500/10'
                      }`}>
                        {statusLabel(s.status)}
                      </span>
                    </div>
                    <UsageBar label="CPU" value={s.cpu_usage || 0} icon={Cpu} color="#3b82f6" />
                    <div className="mt-2.5" />
                    <UsageBar label="RAM" value={s.ram_usage || 0} icon={Monitor} color="#22c55e" />
                    <div className="mt-2.5" />
                    <UsageBar label="Disk" value={s.disk_usage || 0} icon={HardDrive} color="#f59e0b" />
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/50">
                      <span className="text-[9px] text-slate-600 flex items-center gap-1">
                        <Clock size={9} /> {timeAgo(s.last_updated)}
                      </span>
                      <span className="text-[9px] text-slate-600">{s.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Security Checks ── */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Shield size={15} className="text-violet-400" />
                Security Checks
                {securityIssues.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {securityIssues.length} issue{securityIssues.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h3>
            </div>
            <div className="p-3 space-y-1.5 max-h-64 overflow-y-auto">
              {security.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">No security checks yet</p>
              ) : (
                security.slice(0, 10).map((s, i) => (
                  <div key={s.id || i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/30 transition-colors">
                    {s.status === 'critical' || s.status === 'error' ? (
                      <ShieldAlert size={16} className="text-rose-400 shrink-0" />
                    ) : s.status === 'warning' ? (
                      <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                    ) : (
                      <Shield size={16} className="text-emerald-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{s.check_type}: {s.detail}</p>
                      <p className="text-[9px] text-slate-500">{s.status} · {timeAgo(s.checked_at)}</p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border uppercase font-bold shrink-0 ${
                      s.status === 'critical' ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' :
                      s.status === 'warning' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                      'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                    }`}>{s.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (2/5) ── */}
        <div className="xl:col-span-2 space-y-6">

          {/* ── Websites Monitoring ── */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Globe size={15} className="text-blue-400" />
                Websites Monitoring
                {websitesDown.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {websitesDown.length} down
                  </span>
                )}
              </h3>
            </div>
            <div className="divide-y divide-slate-800/60">
              {websites.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No websites monitored</p>
              ) : (
                websites.map(w => (
                  <div key={w.id} className="p-4 hover:bg-slate-800/20 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(w.status)}`} />
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{w.name}</p>
                          <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                            <ExternalLink size={9} /> {w.url}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                          w.status === 'online' || w.status === 'up' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' :
                          w.status === 'warning' || w.status === 'degraded' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                          w.status === 'offline' || w.status === 'down' ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' :
                          'text-slate-400 border-slate-500/20 bg-slate-500/10'
                        }`}>
                          {statusLabel(w.status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Zap size={10} className="text-amber-400" />
                        {w.response_time_ms ? `${w.response_time_ms}ms` : '-'}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        {w.ssl_valid ? (
                          <><Lock size={10} className="text-emerald-400" /> SSL Valid{w.ssl_expires ? ` until ${new Date(w.ssl_expires).toLocaleDateString('id-ID')}` : ''}</>
                        ) : (
                          <><Unlock size={10} className="text-rose-400" /> SSL Invalid</>
                        )}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-600 mt-1.5">Last checked: {timeAgo(w.last_checked)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Error Center ── */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle size={15} className="text-rose-400" />
                Recent Errors
              </h3>
              {criticalErrors.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {criticalErrors.length} critical
                </span>
              )}
            </div>
            <div className="p-3 space-y-1.5 max-h-80 overflow-y-auto">
              {errors.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No errors detected</p>
                </div>
              ) : (
                errors.slice(0, 15).map((e, i) => (
                  <div key={e.id || i} className={`flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-800/30 transition-colors ${
                    e.severity === 'critical' ? 'border-l-2 border-rose-500' :
                    e.severity === 'warning' ? 'border-l-2 border-amber-500' : 'border-l-2 border-transparent'
                  }`}>
                    <div className={`p-1 rounded-lg shrink-0 ${severityBg(e.severity)}`}>
                      <AlertTriangle size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{e.message}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-slate-500">{e.source || 'N/A'}</span>
                        <span className="text-[9px] text-slate-600">·</span>
                        <span className="text-[9px] text-slate-500">{timeAgo(e.created_at)}</span>
                        <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-bold ${
                          e.severity === 'critical' ? 'text-rose-400 bg-rose-500/10' :
                          e.severity === 'warning' ? 'text-amber-400 bg-amber-500/10' :
                          'text-slate-400 bg-slate-500/10'
                        }`}>{e.severity}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: Resource Averages ── */}
      {servers.length > 0 && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={15} className="text-primary" />
            Average Server Resources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MiniStat label="Avg CPU" value={`${avgCpu.toFixed(1)}%`} color={avgCpu > 70 ? '#ef4444' : avgCpu > 50 ? '#f59e0b' : '#22c55e'} />
            <MiniStat label="Avg RAM" value={`${avgRam.toFixed(1)}%`} color={avgRam > 70 ? '#ef4444' : avgRam > 50 ? '#f59e0b' : '#22c55e'} />
            <MiniStat label="Avg Disk" value={`${avgDisk.toFixed(1)}%`} color={avgDisk > 70 ? '#ef4444' : avgDisk > 50 ? '#f59e0b' : '#22c55e'} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringServer;
