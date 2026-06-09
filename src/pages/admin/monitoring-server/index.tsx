import { useState, useEffect, useCallback } from 'react';
import {
  Server, Globe, Cpu, Monitor, HardDrive, RefreshCw,
  Clock, AlertTriangle, CheckCircle2, Shield, ShieldAlert, Zap,
  ExternalLink, Wifi, BarChart3, Bug, Lock, Unlock,
} from 'lucide-react';
import { useStore } from '../../../store/useStore';

// ── Types ──

interface ServerInfo {
  id: number; name: string; host: string; type: string; status: string;
  cpu_usage: number; ram_usage: number; disk_usage: number; last_updated: string | null;
}

interface WebsiteInfo {
  id: number; name: string; url: string; status: string;
  response_time_ms: number; last_checked: string | null; ssl_valid: number; ssl_expires: string | null;
}

interface ErrorInfo {
  id: number; source: string; severity: string; message: string; created_at: string;
}

interface SecurityInfo {
  id: number; check_type: string; status: string; detail: string; checked_at: string;
}

interface DashboardData {
  servers: ServerInfo[]; websites: WebsiteInfo[]; errors: ErrorInfo[]; security_checks: SecurityInfo[];
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
  if (val > 80) return 'text-rose-500';
  if (val > 60) return 'text-amber-500';
  return 'text-emerald-500';
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

const severityBg = (sev: string, light: boolean): string => {
  const s = sev.toLowerCase();
  if (s === 'critical' || s === 'error') return light ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  if (s === 'warning') return light ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return light ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

const formatNum = (n: number | undefined | null): string => {
  if (n == null || isNaN(n)) return '0';
  return n.toLocaleString('id-ID');
};

// ── Mini Components ──

function UsageBar({ label, value, icon: Icon, color, light }: { label: string; value: number; icon: any; color: string; light: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs items-center">
        <span className={`flex items-center gap-1.5 ${light ? 'text-slate-500' : 'text-slate-400'}`}><Icon size={13} color={color} /> {label}</span>
        <span className={`font-mono text-sm font-semibold ${usageTextColor(value)}`}>
          {Number(value || 0).toFixed(1)}%
        </span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${light ? 'bg-slate-200' : 'bg-slate-800'}`}>
        <div
          className={`h-full rounded-full bg-gradient-to-r ${usageBarColor(value)} transition-all duration-1000`}
          style={{ width: `${Math.min(value || 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color, light }: { label: string; value: string | number; color: string; light: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center border ${light ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
      <p className={`text-[10px] uppercase tracking-wider mb-1 ${light ? 'text-slate-500' : 'text-slate-500'}`}>{label}</p>
      <p className="text-sm font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, color, bad, light }: {
  title: string; value: string; sub?: string; icon: any; color: string; bad?: boolean; light: boolean;
}) {
  return (
    <div className={`p-5 rounded-2xl relative overflow-hidden group border ${
      light ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'
    }`}>
      <div className="absolute top-0 right-0 p-3 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity">
        <Icon className="w-24 h-24" color={color} />
      </div>
      <div className="relative z-10">
        <p className={`text-xs font-medium ${light ? 'text-slate-500' : 'text-slate-400'}`}>{title}</p>
        <p className={`text-3xl font-bold mt-1.5 ${bad ? 'text-rose-500' : (light ? 'text-slate-900' : 'text-white')}`}>{value}</p>
        {sub && <p className={`text-xs mt-1 ${light ? 'text-slate-400' : 'text-slate-500'}`}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Status badge (shared for both modes) ──
function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === 'online' || s === 'healthy' || s === 'up' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
    s === 'warning' || s === 'degraded' ? 'text-amber-600 border-amber-200 bg-amber-50' :
    s === 'offline' || s === 'down' || s === 'critical' || s === 'error' ? 'text-rose-600 border-rose-200 bg-rose-50' :
    'text-slate-600 border-slate-200 bg-slate-50';
  return (
    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider shrink-0 ${cls}`}>
      {statusLabel(status)}
    </span>
  );
}

// ── Main Component ──

const MonitoringServer = () => {
  const { theme } = useStore();
  const L = theme === 'light';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const api = async (action: string, body?: any) => {
    const url = body ? '/api.php' : `/api.php?action=${encodeURIComponent(action)}`;
    const res = await fetch(url, {
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

  // ── Shared style vars ──
  const cardBg = L ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/30 border-slate-800';
  const cardHover = L ? 'hover:shadow-md hover:border-slate-300' : 'hover:shadow-lg hover:shadow-primary/5';
  const sectionBorder = L ? 'border-slate-200' : 'border-slate-800';
  const headerText = L ? 'text-slate-900' : 'text-white';
  const subText = L ? 'text-slate-500' : 'text-slate-400';
  const mutedText = L ? 'text-slate-400' : 'text-slate-500';
  const faintText = L ? 'text-slate-300' : 'text-slate-600';
  const hoverRow = L ? 'hover:bg-slate-50' : 'hover:bg-slate-800/30';
  const divider = L ? 'divide-slate-100' : 'divide-slate-800/60';
  const btnRefresh = L
    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
    : 'bg-slate-800 hover:bg-slate-700 text-slate-300';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className={`text-sm ${subText}`}>Loading monitoring data...</p>
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
  const securityIssues = security.filter(s => s.status === 'critical' || s.status === 'warning' || s.status === 'high');
  const websitesDown = websites.filter(w => w.status === 'offline' || w.status === 'down');

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`text-2xl font-bold flex items-center gap-3 ${headerText}`}>
            <Server className="text-blue-500" size={24} /> Monitoring Server
          </h2>
          <p className={`text-xs mt-1 ${mutedText}`}>
            Real-time overview · {servers.length} server{servers.length !== 1 ? 's' : ''} · {websites.length} website{websites.length !== 1 ? 's' : ''} · Auto-refresh 15s
          </p>
        </div>
        <div className={`flex items-center gap-3 text-xs ${subText}`}>
          <button onClick={handleRefresh} disabled={refreshing}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all disabled:opacity-50 ${btnRefresh}`}>
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
          <span className={faintText}>{lastFetch}</span>
        </div>
      </div>

      {/* ── Summary Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Server Status" value={`${totalOnline} / ${servers.length}`}
          sub={`${totalCritical} critical · ${totalWarning} warning`}
          icon={Server} color="#22c55e" bad={totalCritical > 0} light={L} />
        <StatCard title="Websites" value={`${websites.length - websitesDown.length} / ${websites.length}`}
          sub={`${websitesDown.length} down`}
          icon={Globe} color="#3b82f6" bad={websitesDown.length > 0} light={L} />
        <StatCard title="Errors" value={formatNum(errors.length)}
          sub={`${criticalErrors.length} critical · ${warningErrors.length} warning`}
          icon={Bug} color="#ef4444" bad={criticalErrors.length > 0} light={L} />
        <StatCard title="Security" value={formatNum(security.length)}
          sub={`${securityIssues.length} issue${securityIssues.length !== 1 ? 's' : ''}`}
          icon={Shield} color="#a855f7" bad={securityIssues.length > 0} light={L} />
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── LEFT COLUMN (3/5) ── */}
        <div className="xl:col-span-3 space-y-6">

          {/* ── Server Cards ── */}
          <div className="space-y-3">
            <h3 className={`text-sm font-semibold uppercase tracking-wider flex items-center gap-2 ${subText}`}>
              <Server size={14} /> Servers
            </h3>
            {servers.length === 0 ? (
              <div className={`rounded-2xl p-8 text-center border ${cardBg}`}>
                <Server className={`mx-auto mb-2 ${faintText}`} size={32} />
                <p className={`text-sm ${mutedText}`}>No servers configured</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {servers.map(s => (
                  <div key={s.id} className={`rounded-2xl p-4 transition-all border ${cardBg} ${cardHover} ${
                    s.status === 'critical' || s.status === 'offline' ? '!border-rose-300' :
                    s.status === 'warning' ? '!border-amber-300' : ''
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot(s.status)}`} />
                        <div className="min-w-0">
                          <h4 className={`font-semibold text-sm truncate ${headerText}`}>{s.name}</h4>
                          <p className={`text-[10px] flex items-center gap-1 ${mutedText}`}>
                            <Wifi size={9} /> {s.host}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                    <UsageBar label="CPU" value={s.cpu_usage || 0} icon={Cpu} color="#3b82f6" light={L} />
                    <div className="mt-2.5" />
                    <UsageBar label="RAM" value={s.ram_usage || 0} icon={Monitor} color="#22c55e" light={L} />
                    <div className="mt-2.5" />
                    <UsageBar label="Disk" value={s.disk_usage || 0} icon={HardDrive} color="#f59e0b" light={L} />
                    <div className={`flex items-center justify-between mt-3 pt-2.5 border-t ${sectionBorder}`}>
                      <span className={`text-[9px] flex items-center gap-1 ${faintText}`}>
                        <Clock size={9} /> {timeAgo(s.last_updated)}
                      </span>
                      <span className={`text-[9px] ${faintText}`}>{s.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Security Checks ── */}
          <div className={`rounded-2xl overflow-hidden border ${cardBg}`}>
            <div className={`p-4 border-b flex items-center justify-between ${sectionBorder}`}>
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${headerText}`}>
                <Shield size={15} className="text-violet-500" />
                Security Checks
                {securityIssues.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                    {securityIssues.length} issue{securityIssues.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h3>
            </div>
            <div className="p-3 space-y-1.5 max-h-64 overflow-y-auto">
              {security.length === 0 ? (
                <p className={`text-sm text-center py-6 ${mutedText}`}>No security checks yet</p>
              ) : (
                security.slice(0, 10).map((s, i) => (
                  <div key={s.id || i} className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${hoverRow}`}>
                    {s.status === 'critical' || s.status === 'error' || s.status === 'high' ? (
                      <ShieldAlert size={16} className="text-rose-500 shrink-0" />
                    ) : s.status === 'warning' || s.status === 'medium' ? (
                      <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                    ) : (
                      <Shield size={16} className="text-emerald-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${headerText}`}>{s.check_type}: {s.detail}</p>
                      <p className={`text-[9px] ${mutedText}`}>{s.status} · {timeAgo(s.checked_at)}</p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border uppercase font-bold shrink-0 ${
                      s.status === 'critical' || s.status === 'high' ? 'text-rose-600 border-rose-200 bg-rose-50' :
                      s.status === 'warning' || s.status === 'medium' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                      'text-emerald-600 border-emerald-200 bg-emerald-50'
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
          <div className={`rounded-2xl overflow-hidden border ${cardBg}`}>
            <div className={`p-4 border-b ${sectionBorder}`}>
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${headerText}`}>
                <Globe size={15} className="text-blue-500" />
                Websites Monitoring
                {websitesDown.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                    {websitesDown.length} down
                  </span>
                )}
              </h3>
            </div>
            <div className={`divide-y ${divider}`}>
              {websites.length === 0 ? (
                <p className={`text-sm text-center py-8 ${mutedText}`}>No websites monitored</p>
              ) : (
                websites.map(w => (
                  <div key={w.id} className={`p-4 transition-colors ${hoverRow}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(w.status)}`} />
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${headerText}`}>{w.name}</p>
                          <p className={`text-[10px] truncate flex items-center gap-1 ${mutedText}`}>
                            <ExternalLink size={9} /> {w.url}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <StatusBadge status={w.status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`text-[10px] flex items-center gap-1 ${mutedText}`}>
                        <Zap size={10} className="text-amber-500" />
                        {w.response_time_ms ? `${w.response_time_ms}ms` : '-'}
                      </span>
                      <span className={`text-[10px] flex items-center gap-1 ${mutedText}`}>
                        {w.ssl_valid ? (
                          <><Lock size={10} className="text-emerald-500" /> SSL Valid{w.ssl_expires ? ` until ${new Date(w.ssl_expires).toLocaleDateString('id-ID')}` : ''}</>
                        ) : (
                          <><Unlock size={10} className="text-rose-500" /> SSL Invalid</>
                        )}
                      </span>
                    </div>
                    <p className={`text-[9px] mt-1.5 ${faintText}`}>Last checked: {timeAgo(w.last_checked)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Error Center ── */}
          <div className={`rounded-2xl overflow-hidden border ${cardBg}`}>
            <div className={`p-4 border-b flex items-center justify-between ${sectionBorder}`}>
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${headerText}`}>
                <AlertTriangle size={15} className="text-rose-500" />
                Recent Errors
              </h3>
              {criticalErrors.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                  {criticalErrors.length} critical
                </span>
              )}
            </div>
            <div className="p-3 space-y-1.5 max-h-80 overflow-y-auto">
              {errors.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
                  <p className={`text-sm ${subText}`}>No errors detected</p>
                </div>
              ) : (
                errors.slice(0, 15).map((e, i) => (
                  <div key={e.id || i} className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-colors ${hoverRow} ${
                    e.severity === 'critical' ? 'border-l-2 border-rose-500' :
                    e.severity === 'warning' ? 'border-l-2 border-amber-500' : 'border-l-2 border-transparent'
                  }`}>
                    <div className={`p-1 rounded-lg shrink-0 ${severityBg(e.severity, L)}`}>
                      <AlertTriangle size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${headerText}`}>{e.message}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] ${mutedText}`}>{e.source || 'N/A'}</span>
                        <span className={`text-[9px] ${faintText}`}>·</span>
                        <span className={`text-[9px] ${mutedText}`}>{timeAgo(e.created_at)}</span>
                        <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-bold ${
                          e.severity === 'critical' ? 'text-rose-600 bg-rose-50' :
                          e.severity === 'warning' ? 'text-amber-600 bg-amber-50' :
                          'text-slate-500 bg-slate-100'
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
        <div className={`rounded-2xl p-5 border ${cardBg}`}>
          <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${headerText}`}>
            <BarChart3 size={15} className="text-blue-500" />
            Average Server Resources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MiniStat label="Avg CPU" value={`${avgCpu.toFixed(1)}%`} color={avgCpu > 70 ? '#ef4444' : avgCpu > 50 ? '#f59e0b' : '#22c55e'} light={L} />
            <MiniStat label="Avg RAM" value={`${avgRam.toFixed(1)}%`} color={avgRam > 70 ? '#ef4444' : avgRam > 50 ? '#f59e0b' : '#22c55e'} light={L} />
            <MiniStat label="Avg Disk" value={`${avgDisk.toFixed(1)}%`} color={avgDisk > 70 ? '#ef4444' : avgDisk > 50 ? '#f59e0b' : '#22c55e'} light={L} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringServer;
