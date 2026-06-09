import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Server, Globe, Monitor, RefreshCw, Clock, Shield, Zap,
  Activity, History, AlertCircle, BarChart3, CheckCircle2,
  TrendingUp, TrendingDown, Clock4, Router
} from 'lucide-react';
import { useStore } from '../../../store/useStore';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
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
interface WebGraph {
  id: number; name: string;
  history: { status: string; response_time_ms: number; checked_at: string }[];
}
interface ErrorInfo { id: number; source: string; severity: string; message: string; created_at: string; }
interface SecurityInfo { id: number; check_type: string; status: string; detail: string; checked_at: string; }

interface DashboardData {
  servers: ServerInfo[]; websites: WebsiteInfo[]; apis: APIInfo[];
  website_graphs: WebGraph[]; errors: ErrorInfo[]; security_checks: SecurityInfo[];
}

// ── Helpers ──
const fmt = (t: string) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const statColor = (n: number) => n > 80 ? 'text-rose-500' : n > 50 ? 'text-amber-500' : 'text-emerald-500';

const CustomTooltip = ({ active, payload, label, light }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`p-3 border rounded-xl shadow-xl ${light ? 'bg-white border-slate-100' : 'bg-slate-900 border-slate-800'}`}>
      <p className={`text-[10px] font-bold mb-1 ${light ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      <p className="text-sm font-bold text-primary">{payload[0].value} ms</p>
    </div>
  );
};

// ── Page ──
const MonitoringServer = () => {
  const { theme } = useStore();
  const L = theme === 'light';
  const animRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [[servers, websites, errors, security], apis, website_graphs] = await Promise.all([
        fetch('/api.php?action=get_monitor_servers').then(r => r.json()).then(s => 
          Promise.all([
            s,
            fetch('/api.php?action=get_monitor_websites').then(r => r.json()),
            fetch('/api.php?action=get_error_center').then(r => r.json()),
            fetch('/api.php?action=get_security_checks').then(r => r.json()),
          ])
        ),
        fetch('/api.php?action=get_monitoring_api').then(r => r.json()),
        fetch('/api.php?action=get_monitoring_graphs').then(r => r.json()),
      ]);

      setData({ servers, websites, errors: errors || [], apis, website_graphs, security_checks: security || [] });
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Fetch err:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch + every 10 seconds
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 10000);
    return () => clearInterval(id);
  }, [fetchData]);

  const card = `${L ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'} border rounded-2xl overflow-hidden backdrop-blur-sm`;
  const title = L ? 'text-slate-900' : 'text-white';
  const muted = L ? 'text-slate-500' : 'text-slate-400';

  // ── Parse data ──
  const garudaServer = data?.servers.find(s => s.name.toLowerCase().includes('garudanexa') || s.host.includes('garudanexa'));
  const officeServer = data?.servers.find(s => s.name.toLowerCase().includes('ischool') || s.host.includes('ischool'));
  const garudaAPI = data?.apis.find(a => a.name.toLowerCase().includes('garudanexa'));
  const officeAPI = data?.apis.find(a => a.name.toLowerCase().includes('ischool'));
  const garudaSite = data?.websites.find(w => w.url.includes('garudanexa'));
  const officeSite = data?.websites.find(w => w.url.includes('office.ischool'));
  const garudaGraph = data?.website_graphs.find(g => g.name.toLowerCase().includes('garudanexa'));
  const officeGraph = data?.website_graphs.find(g => g.name.toLowerCase().includes('office') || g.name.toLowerCase().includes('ischool'));

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
        <p className={`font-medium animate-pulse ${muted}`}>Loading Monitoring Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500" ref={animRef}>

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl md:text-3xl font-black flex items-center gap-3 ${title}`}>
            <Monitor className="text-primary" size={28} /> Live Dashboard
          </h1>
          <p className={`text-xs mt-1 flex items-center gap-2 ${muted}`}>
            <Clock4 size={12} /> Updated: {lastUpdate.toLocaleTimeString()}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
              refreshing ? 'bg-primary/10 text-primary' : muted
            }`}>
              <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : '10s auto'}
            </span>
          </p>
        </div>
        <button
          onClick={fetchData}
          className={`p-2.5 rounded-xl transition-all ${L ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400'} ${refreshing ? 'animate-spin pointer-events-none opacity-50' : ''}`}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* ── SECTION 1: SERVER STATUS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GarudaNexa Server */}
        <StatusCard title="GarudaNexa VPS" icon={<Server size={18} />} server={garudaServer} L={L} titleC={title} mC={muted} card={card} />
        {/* iSchool Server */}
        <StatusCard title="iSchool Office VPS" icon={<Server size={18} />} server={officeServer} L={L} titleC={title} mC={muted} card={card} />
      </div>

      {/* ── SECTION 2: API MONITORING ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <APICard title="GarudaNexa API" icon={<Zap size={18} />} api={garudaAPI} L={L} titleC={title} mC={muted} card={card} />
        <APICard title="iSchool Office API" icon={<Zap size={18} />} api={officeAPI} L={L} titleC={title} mC={muted} card={card} />
      </div>

      {/* ── SECTION 3: WEBSITE PERFORMANCE CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WebsiteChartCard title="GarudaNexa — Performance" icon={<Globe size={18} />} graph={garudaGraph} site={garudaSite} card={card} L={L} titleC={title} mC={muted} />
        <WebsiteChartCard title="Office iSchool — Performance" icon={<Globe size={18} />} graph={officeGraph} site={officeSite} card={card} L={L} titleC={title} mC={muted} />
      </div>

      {/* ── SECTION 4: ERRORS & SECURITY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Errors */}
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${title}`}><AlertCircle size={16} className="text-rose-500" /> Error Center</h3>
            <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2.5 py-0.5 rounded-full font-bold">{data?.errors.length || 0} errors</span>
          </div>
          {data?.errors.length === 0 ? (
            <div className="py-6 text-center text-xs italic text-slate-500 flex items-center justify-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" /> Sistem dalam keadaan bersih.
            </div>
          ) : data?.errors.slice(0, 4).map(err => (
            <div key={err.id} className={`flex items-start gap-3 py-2.5 border-b last:border-0 ${L ? 'border-slate-100' : 'border-slate-800/50'}`}>
              <div className="mt-0.5 p-1 rounded bg-rose-500/10 text-rose-500"><AlertCircle size={10} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-rose-500 uppercase">{err.source}</span>
                  <span className="text-[8px] text-slate-500">{new Date(err.created_at).toLocaleString()}</span>
                </div>
                <p className={`text-xs mt-0.5 truncate ${title}`}>{err.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Security */}
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${title}`}><Shield size={16} className="text-emerald-500" /> Security Logs</h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-full font-bold">{data?.security_checks.length || 0} checks</span>
          </div>
          {data?.security_checks.slice(0, 4).map(check => (
            <div key={check.id} className={`flex items-center gap-3 py-2.5 border-b last:border-0 ${L ? 'border-slate-100' : 'border-slate-800/50'}`}>
              <div className={`p-1.5 rounded-lg ${L ? 'bg-slate-100' : 'bg-slate-800'}`}>
                <CheckCircle2 size={12} className="text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${title}`}>{check.check_type}</span>
                  <span className="text-[8px] text-slate-500">{new Date(check.checked_at).toLocaleString()}</span>
                </div>
                <p className={`text-[10px] truncate ${muted}`}>{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 5: FULL WEBSITE UPTIME TIMELINE ── */}
      <div className={`${card} p-5`}>
        <h3 className={`text-sm font-bold flex items-center gap-2 mb-5 ${title}`}>
          <Activity size={16} className="text-primary" /> 
          Real-Time Uptime & Response Timeline (48 Checks)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[garudaGraph, officeGraph].filter(Boolean).map((g, i) => g && (
            <div key={g.id}>
              <p className={`text-xs font-bold mb-2 ${title}`}>{g.name}</p>
              <div className="flex gap-[2px] flex-wrap">
                {g.history.map((h, j) => (
                  <div
                    key={j}
                    title={`${new Date(h.checked_at).toLocaleString()} — ${h.status} (${h.response_time_ms}ms)`}
                    className={`w-3 h-7 rounded-sm transition-all hover:scale-125 ${
                      h.status === 'online' || h.status === 'active'
                        ? h.response_time_ms < 500
                          ? 'bg-emerald-500/40 hover:bg-emerald-500'
                          : 'bg-amber-500/40 hover:bg-amber-500'
                        : 'bg-rose-500/40 hover:bg-rose-500'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2 text-[9px] text-slate-500">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-500/40" /> Fast</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-amber-500/40" /> Slow</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-rose-500/40" /> Down</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 6: API USAGE TABLE ── */}
      <div className={`${card}`}>
        <div className="p-4 border-b border-slate-800/50 flex items-center gap-2">
          <History size={16} className="text-primary" />
          <h3 className={`text-sm font-bold ${title}`}>Riwayat Penggunaan Endpoint</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className={`${L ? 'bg-slate-50 text-slate-500' : 'bg-slate-800/50 text-slate-400'} border-b ${L ? 'border-slate-100' : 'border-slate-800'}`}>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-left">Endpoint</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">Success / Fail</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">Latency</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Last Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {[garudaAPI, officeAPI].filter(Boolean).map(api => (
                <tr key={api!.id} className="hover:bg-slate-500/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className={`font-bold ${title}`}>{api!.name}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{api!.endpoint}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-emerald-500 font-bold">{api!.success_count} ✓</span>
                    <span className="text-slate-500 mx-1">/</span>
                    <span className="text-rose-500 font-bold">{api!.fail_count} ✗</span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    <span className={api!.response_time_ms > 200 ? 'text-amber-500' : 'text-primary'}>
                      {api!.response_time_ms} ms
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      api!.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>{api!.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {api!.last_checked ? new Date(api!.last_checked).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── Sub-Components ──

function StatusCard({ title: t, icon, server, L, titleC, mC, card }: any) {
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${L ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-white'}`}>{icon}</div>
          <div>
            <h3 className={`font-bold text-sm ${titleC}`}>{t}</h3>
            <p className={`text-[10px] ${mC}`}>{server?.host || '-'}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          server?.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${server?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          {server?.status || 'unknown'}
        </div>
      </div>
      {server && (
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="CPU" val={server.cpu_usage} L={L} />
          <StatBox label="RAM" val={server.ram_usage} L={L} />
          <StatBox label="Disk" val={server.disk_usage} L={L} />
        </div>
      )}
      {!server && <div className="text-xs text-slate-500 italic text-center py-4">No server data</div>}
    </div>
  );
}

function StatBox({ label, val, L }: { label: string; val: number; L: boolean }) {
  const grad = val > 80 ? 'from-rose-500' : val > 50 ? 'from-amber-500' : 'from-primary';
  return (
    <div className={`p-3 rounded-xl ${L ? 'bg-slate-50' : 'bg-slate-800/40'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        <span className={`text-[10px] font-black ${statColor(val)}`}>{val}%</span>
      </div>
      <div className={`w-full h-1.5 rounded-full ${L ? 'bg-slate-200' : 'bg-slate-800'}`}>
        <div className={`h-1.5 rounded-full bg-gradient-to-r ${grad} to-transparent transition-all duration-1000`} style={{ width: `${Math.min(val, 100)}%`}} />
      </div>
    </div>
  );
}

function APICard({ title: t, icon, api, L, titleC, mC, card }: any) {
  return (
    <div className={`${card} p-5 flex flex-col`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${L ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-white'}`}>{icon}</div>
          <div>
            <h3 className={`font-bold text-sm ${titleC}`}>{t}</h3>
            <p className={`text-[9px] font-bold text-primary tracking-widest uppercase`}>{api?.method || '-'}</p>
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full ${api?.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
      </div>
      {api ? (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className={`p-2.5 rounded-xl ${L ? 'bg-slate-50' : 'bg-slate-800/40'}`}>
              <p className="text-[9px] text-slate-500 uppercase font-bold">Latency</p>
              <p className={`text-base font-black ${titleC}`}>{api.response_time_ms} <span className="text-[10px] font-normal text-slate-500">ms</span></p>
            </div>
            <div className={`p-2.5 rounded-xl ${L ? 'bg-slate-50' : 'bg-slate-800/40'}`}>
              <p className="text-[9px] text-slate-500 uppercase font-bold">Success Rate</p>
              <p className="text-base font-black text-emerald-500">{api.success_rate}%</p>
            </div>
          </div>
          <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={api.history}>
                <Bar dataKey="response_time_ms" radius={[2, 2, 0, 0]}>
                  {api.history.map((_: any, idx: number) => (
                    <Cell key={`c-${idx}`} fill={api.history[idx]?.status === 'active' ? '#3B82F6' : '#EF4444'} fillOpacity={0.6} />
                  ))}
                </Bar>
                <Tooltip content={<CustomTooltip light={L} />} cursor={{ fill: 'rgba(59,130,246,0.1)' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 truncate">{api.endpoint}</p>
        </>
      ) : (
        <div className="text-xs text-slate-500 italic text-center py-8">No API data</div>
      )}
    </div>
  );
}

function WebsiteChartCard({ title: t, icon, graph, site, card, L, titleC, mC }: any) {
  const avg = graph?.history?.length
    ? Math.round(graph.history.reduce((a: number, b: any) => a + b.response_time_ms, 0) / graph.history.length)
    : 0;

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${L ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-white'}`}>{icon}</div>
          <div>
            <h3 className={`font-bold text-sm ${titleC}`}>{t}</h3>
            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Online
            </span>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-[9px] text-slate-500 font-bold uppercase">Avg Latency</p>
            <p className={`text-lg font-black ${titleC}`}>{avg}<span className="text-xs font-normal text-slate-500"> ms</span></p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-slate-500 font-bold uppercase">Uptime</p>
            <p className="text-lg font-black text-emerald-500">99.9%</p>
          </div>
        </div>
      </div>
      {graph?.history?.length ? (
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graph.history}>
              <defs>
                <linearGradient id={`gr-${graph.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={L ? '#E2E8F0' : '#1E293B'} />
              <XAxis dataKey="checked_at" tickFormatter={fmt} fontSize={10} tick={{ fill: L ? '#64748B' : '#475569' }} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} tick={{ fill: L ? '#64748B' : '#475569' }} axisLine={false} tickLine={false} unit="ms" />
              <Tooltip content={<CustomTooltip light={L} />} />
              <Area type="monotone" dataKey="response_time_ms" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill={`url(#gr-${graph.id})`} animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[180px] flex items-center justify-center text-xs text-slate-500 italic">No chart data</div>
      )}
    </div>
  );
}

export default MonitoringServer;
