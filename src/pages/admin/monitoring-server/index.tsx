import { useState, useEffect, useCallback } from 'react';
import {
  Server, Globe, Cpu, Monitor, HardDrive, RefreshCw,
  Clock, AlertTriangle, CheckCircle2, Shield, ShieldAlert, Zap,
  ExternalLink, BarChart3, Bug, Lock, Unlock,
  Activity, History, AlertCircle
} from 'lucide-react';
import { useStore } from '../../../store/useStore';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';

// ── Types ──

interface ServerInfo {
  id: number; name: string; host: string; type: string; status: string;
  cpu_usage: number; ram_usage: number; disk_usage: number; last_updated: string | null;
}

interface WebsiteInfo {
  id: number; name: string; url: string; status: string;
  response_time_ms: number; last_checked: string | null; ssl_valid: number; ssl_expires: string | null;
}

interface APIInfo {
  id: number; name: string; endpoint: string; method: string; status: string;
  response_time_ms: number; success_count: number; fail_count: number;
  last_checked: string | null; success_rate: string;
  history: { time: string; response_time_ms: number; status: string }[];
}

interface WebsiteGraphData {
  id: number;
  name: string;
  history: { status: string; response_time_ms: number; checked_at: string }[];
}

interface ErrorInfo {
  id: number; source: string; severity: string; message: string; created_at: string;
}

interface SecurityInfo {
  id: number; check_type: string; status: string; detail: string; checked_at: string;
}

interface DashboardData {
  servers: ServerInfo[];
  websites: WebsiteInfo[];
  apis: APIInfo[];
  website_graphs: WebsiteGraphData[];
  errors: ErrorInfo[];
  security_checks: SecurityInfo[];
}

// ── Components ──

function TabButton({ active, label, icon: Icon, onClick, light }: {
  active: boolean; label: string; icon: any; onClick: () => void; light: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 ${
        active
          ? 'bg-primary text-white shadow-lg shadow-primary/25'
          : light
            ? 'text-slate-500 hover:bg-slate-100'
            : 'text-slate-400 hover:bg-slate-800'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

const CustomTooltip = ({ active, payload, label, light }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`p-3 border rounded-xl shadow-xl ${light ? 'bg-white border-slate-100' : 'bg-slate-900 border-slate-800'}`}>
        <p className={`text-xs font-bold mb-1 ${light ? 'text-slate-400' : 'text-slate-500'}`}>
          {new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-sm font-bold text-primary">
          {payload[0].value} ms
        </p>
      </div>
    );
  }
  return null;
};

// ── Main Page ──

const MonitoringServer = () => {
  const { theme } = useStore();
  const L = theme === 'light';

  const [activeTab, setActiveTab] = useState<'overview' | 'api' | 'websites'>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      // Parallel fetch for speed
      const [, apiRes, graphRes] = await Promise.all([
        fetch('/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_monitor_servers' }) }),
        fetch('/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_monitoring_api' }) }),
        fetch('/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_monitoring_graphs' }) })
      ]);

      const [servers, websites, errors, security] = await Promise.all([
        fetch('/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_monitor_servers' }) }).then(r => r.json()),
        fetch('/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_monitor_websites' }) }).then(r => r.json()),
        fetch('/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_error_center' }) }).then(r => r.json()),
        fetch('/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_security_checks' }) }).then(r => r.json()),
      ]);

      const apis = await apiRes.json();
      const website_graphs = await graphRes.json();

      setData({
        servers, websites, apis, website_graphs, errors, security_checks: security
      });
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const cardBg = L ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-800';
  const textTitle = L ? 'text-slate-900' : 'text-white';
  const textMuted = L ? 'text-slate-500' : 'text-slate-400';

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
        <p className={`font-medium animate-pulse ${textMuted}`}>Menghubungkan ke server...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-3 ${textTitle}`}>
            <Monitor className="text-primary" /> Monitoring Server & Website
          </h1>
          <p className={`text-xs mt-1 flex items-center gap-2 ${textMuted}`}>
            <Clock size={12} /> Terakhir diperbarui: {lastUpdate.toLocaleTimeString()}
            {refreshing && <RefreshCw size={10} className="animate-spin text-primary" />}
          </p>
        </div>

        <div className={`flex p-1 rounded-2xl border ${L ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <TabButton active={activeTab === 'overview'} label="Overview" icon={Activity} onClick={() => setActiveTab('overview')} light={L} />
          <TabButton active={activeTab === 'api'} label="API Monitoring" icon={Zap} onClick={() => setActiveTab('api')} light={L} />
          <TabButton active={activeTab === 'websites'} label="Performance" icon={BarChart3} onClick={() => setActiveTab('websites')} light={L} />
        </div>
      </div>

      {/* ── Tabs Content ── */}
      <div className="transition-all duration-500">
        
        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Server Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.servers.map(server => (
                <div key={server.id} className={`p-5 rounded-2xl border ${cardBg} transition-all hover:border-primary/30`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${L ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-white'}`}>
                        <Server size={20} />
                      </div>
                      <div>
                        <h3 className={`font-bold text-sm ${textTitle}`}>{server.name}</h3>
                        <p className={`text-[10px] ${textMuted}`}>{server.host}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      server.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${server.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      {server.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <UsageCircle label="CPU" val={server.cpu_usage} color="primary" light={L} />
                    <UsageCircle label="RAM" val={server.ram_usage} color="emerald" light={L} />
                    <UsageCircle label="Disk" val={server.disk_usage} color="amber" light={L} />
                  </div>
                </div>
              ))}
            </div>

            {/* Error & Security List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Errors */}
              <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${textTitle}`}>
                    <Bug size={16} className="text-rose-500" /> Error Center
                  </h3>
                  <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold">Unresolved: {data?.errors.length}</span>
                </div>
                <div className="divide-y divide-slate-800/30">
                  {data?.errors.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs italic">Sistem bersih, tidak ada error.</div>
                  ) : data?.errors.slice(0, 5).map(err => (
                    <div key={err.id} className="p-3 hover:bg-rose-500/[0.02] transition-colors group">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 p-1 rounded bg-rose-500/10 text-rose-500`}>
                          <AlertCircle size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">{err.source}</span>
                            <span className="text-[9px] text-slate-500">{new Date(err.created_at).toLocaleString()}</span>
                          </div>
                          <p className={`text-xs mt-1 line-clamp-1 group-hover:line-clamp-none transition-all ${textTitle}`}>{err.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Checks */}
              <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${textTitle}`}>
                    <Shield size={16} className="text-emerald-500" /> Security Logs
                  </h3>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
                <div className="divide-y divide-slate-800/30">
                  {data?.security_checks.slice(0, 5).map(check => (
                    <div key={check.id} className="p-3 hover:bg-emerald-500/[0.02] transition-colors flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${L ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-white'}`}>
                        {check.status === 'safe' ? <Lock size={14} className="text-emerald-500" /> : <Unlock size={14} className="text-rose-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-bold ${textTitle}`}>{check.check_type}</h4>
                          <span className="text-[9px] text-slate-500">{new Date(check.checked_at).toLocaleString()}</span>
                        </div>
                        <p className={`text-[10px] truncate ${textMuted}`}>{check.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── API MONITORING TAB ── */}
        {activeTab === 'api' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data?.apis.map(api => (
                <div key={api.id} className={`p-5 rounded-2xl border flex flex-col ${cardBg} hover:border-primary/40 group`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl ${L ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-white'}`}>
                        <Zap size={18} className={api.status === 'active' ? 'text-primary' : 'text-slate-500'} />
                      </div>
                      <div className="truncate">
                        <h3 className={`font-bold text-sm truncate ${textTitle}`}>{api.name}</h3>
                        <p className={`text-[9px] font-bold text-primary tracking-widest uppercase`}>{api.method}</p>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${api.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`p-2 rounded-xl ${L ? 'bg-slate-50' : 'bg-slate-800/40'}`}>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Latency</p>
                        <p className={`text-sm font-bold ${textTitle}`}>{api.response_time_ms} ms</p>
                      </div>
                      <div className={`p-2 rounded-xl ${L ? 'bg-slate-50' : 'bg-slate-800/40'}`}>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Success Rate</p>
                        <p className={`text-sm font-bold text-emerald-500`}>{api.success_rate}%</p>
                      </div>
                    </div>

                    <div className="h-16 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={api.history}>
                          <Bar dataKey="response_time_ms" radius={[2, 2, 0, 0]}>
                            {api.history.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.status === 'active' ? '#3B82F6' : '#EF4444'} fillOpacity={0.6} />
                            ))}
                          </Bar>
                          <Tooltip content={<CustomTooltip light={L} />} cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className={textMuted}>{api.endpoint}</span>
                      <span className="text-slate-500">24h history</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* API Usage Table */}
            <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
              <div className="p-4 border-b border-slate-800/50 flex items-center gap-2">
                <History size={16} className="text-primary" />
                <h3 className={`text-sm font-bold ${textTitle}`}>Riwayat Penggunaan Endpoint</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b ${L ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-slate-800/50 border-slate-800 text-slate-400'}`}>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Endpoint</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">Requests</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">Latency</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">Status</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Last Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/20">
                    {data?.apis.map(api => (
                      <tr key={api.id} className="hover:bg-slate-500/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className={`font-bold ${textTitle}`}>{api.name}</span>
                            <span className="text-[10px] text-slate-500">{api.endpoint}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-emerald-500 font-bold">{api.success_count} ✓</span>
                            <span className="text-rose-500 font-bold">{api.fail_count} ✗</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono ${api.response_time_ms > 200 ? 'text-amber-500' : 'text-primary'}`}>
                            {api.response_time_ms} ms
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            api.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {api.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {api.last_checked ? new Date(api.last_checked).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── WEBSITE PERFORMANCE TAB ── */}
        {activeTab === 'websites' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
            {data?.website_graphs.map(site => (
              <div key={site.id} className={`p-6 rounded-3xl border ${cardBg} transition-all hover:border-primary/40`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${L ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-white'}`}>
                      <Globe size={24} className="text-primary" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${textTitle}`}>{site.name}</h3>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs ${textMuted}`}>{data.websites.find(w => w.id === site.id)?.url}</span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase">
                          <div className="w-1 h-1 rounded-full bg-emerald-500" />
                          Online
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Avg Latency</p>
                      <p className={`text-xl font-black ${textTitle}`}>
                        {Math.round(site.history.reduce((a, b) => a + b.response_time_ms, 0) / site.history.length || 0)} <span className="text-xs font-normal text-slate-500">ms</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Uptime 24h</p>
                      <p className="text-xl font-black text-emerald-500">99.9<span className="text-xs font-normal text-emerald-500/60">%</span></p>
                    </div>
                  </div>
                </div>

                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={site.history}>
                      <defs>
                        <linearGradient id={`grad-${site.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={L ? '#E2E8F0' : '#1E293B'} />
                      <XAxis 
                        dataKey="checked_at" 
                        tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        fontSize={10} 
                        tick={{fill: L ? '#64748B' : '#475569'}}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        fontSize={10} 
                        tick={{fill: L ? '#64748B' : '#475569'}}
                        axisLine={false}
                        tickLine={false}
                        unit="ms"
                      />
                      <Tooltip content={<CustomTooltip light={L} />} />
                      <Area 
                        type="monotone" 
                        dataKey="response_time_ms" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill={`url(#grad-${site.id})`}
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-6">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-widest">Uptime Timeline (Last 48 Checks)</p>
                  <div className="flex gap-1">
                    {site.history.map((h, i) => (
                      <div 
                        key={i} 
                        title={`${new Date(h.checked_at).toLocaleString()}: ${h.status}`}
                        className={`flex-1 h-6 rounded-sm transition-all hover:scale-110 ${
                          h.status === 'online' ? 'bg-emerald-500/40 hover:bg-emerald-500' : 'bg-rose-500 hover:bg-rose-600'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

// ── Helper Components ──

function UsageCircle({ label, val, color, light }: { label: string; val: number; color: string; light: boolean }) {
  const getCol = (c: string) => {
    if (c === 'primary') return 'text-primary';
    if (c === 'emerald') return 'text-emerald-500';
    if (c === 'amber') return 'text-amber-500';
    return '';
  };

  const getBg = (c: string) => {
    if (c === 'primary') return 'bg-primary/10';
    if (c === 'emerald') return 'bg-emerald-500/10';
    if (c === 'amber') return 'bg-amber-500/10';
    return '';
  };

  return (
    <div className={`p-3 rounded-2xl flex flex-col items-center justify-center ${getBg(color)}`}>
      <div className="relative flex items-center justify-center">
        <svg className="w-12 h-12 rotate-[-90deg]">
          <circle className={light ? 'text-slate-200' : 'text-slate-800'} strokeWidth="4" stroke="currentColor" fill="transparent" r="20" cx="24" cy="24" />
          <circle 
            className={getCol(color)} strokeWidth="4" strokeDasharray={125.6} strokeDashoffset={125.6 - (val / 100) * 125.6}
            strokeLinecap="round" stroke="currentColor" fill="transparent" r="20" cx="24" cy="24" 
          />
        </svg>
        <span className={`absolute text-[10px] font-black ${light ? 'text-slate-900' : 'text-white'}`}>{val}%</span>
      </div>
      <span className="text-[9px] font-bold text-slate-500 uppercase mt-2 tracking-widest">{label}</span>
    </div>
  );
}

export default MonitoringServer;
