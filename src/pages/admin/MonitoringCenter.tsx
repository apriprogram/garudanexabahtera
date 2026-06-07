import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Globe, BarChart3, Server, Database,
  GlobeLock, Shield, Cable, Bell, FileText, Settings,
  Activity, TrendingUp, Users, Clock, AlertTriangle,
  CheckCircle, XCircle, WifiOff, HardDrive, Cpu,
  RefreshCw, ChevronDown, ChevronUp, ExternalLink,
  Plus, Trash2, Edit, Search, Download, Eye, EyeOff,
  Play, Pause, ChevronRight, Mail, Phone, MessageSquare,
  AlertCircle, Info, Zap, MousePointer, Smartphone,
  Monitor, PieChart, Calendar, ChevronLeft,
  // for server tab
  Thermometer, // for disk usage
} from 'lucide-react';
import { useStore } from '../../store/useStore';

// =============================================
// Config & Constants
// =============================================
const API = '/api.php';
const COLORS = {
  primary: '#6366f1', success: '#22c55e', warning: '#f59e0b',
  danger: '#ef4444', info: '#3b82f6', purple: '#a855f7',
};

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'websites', label: 'Website', icon: Globe },
  { id: 'visitors', label: 'Statistik', icon: BarChart3 },
  { id: 'server', label: 'Server', icon: Server },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'domains', label: 'Domain & SSL', icon: GlobeLock },
  { id: 'api', label: 'API', icon: Cable },
  { id: 'security', label: 'Keamanan', icon: Shield },
  { id: 'notifications', label: 'Notifikasi', icon: Bell },
  { id: 'reports', label: 'Laporan', icon: FileText },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

// =============================================
// Helpers
// =============================================
function fetchAPI(action, data = {}, method = 'POST') {
  const params = new URLSearchParams({ action }).toString();
  return fetch(`${API}?${params}`, {
    method, headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(data) : undefined,
  }).then(r => r.json());
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStatusColor(status) {
  const map = {
    online: 'text-green-500', offline: 'text-red-500', unknown: 'text-gray-400',
    active: 'text-green-500', inactive: 'text-gray-400', down: 'text-red-500',
    healthy: 'text-green-500', warning: 'text-yellow-500', critical: 'text-red-500',
    valid: 'text-green-500', expiring_soon: 'text-yellow-500', expired: 'text-red-500',
    connected: 'text-green-500', disconnected: 'text-red-500', error: 'text-red-500',
    new: 'text-blue-500', reviewed: 'text-yellow-500', resolved: 'text-green-500',
    low: 'text-green-500', medium: 'text-yellow-500', high: 'text-orange-500',
  };
  return map[d] || 'text-gray-400';
}

function getStatusBg(status) {
  const map = {
    online: 'bg-green-500/10 border-green-500/30',
    offline: 'bg-red-500/10 border-red-500/30',
    healthy: 'bg-green-500/10 border-green-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    critical: 'bg-red-500/10 border-red-500/30',
    expiring_soon: 'bg-yellow-500/10 border-yellow-500/30',
    expired: 'bg-red-500/10 border-red-500/30',
    down: 'bg-red-500/10 border-red-500/30',
    new: 'bg-blue-500/10 border-blue-500/30',
    resolved: 'bg-green-500/10 border-green-500/30',
  };
  return map[d] || 'bg-gray-500/10 border-gray-500/30';
}

function cn(...classes) { return classes.filter(Boolean).join(' '); }

// Tiny SVG sparkline inline (no recharts dependency needed)
function SparkLine({ data, color = '#6366f1', height = 40, width = 120 }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.value ?? d.response_time_ms ?? 0);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const w = width / (vals.length - 1);
  const points = vals.map((v, i) => `${i * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

// Mini bar chart
function MiniBar({ data, color = '#6366f1', height = 40 }) {
  if (!data || data.length === 0) return null;
  const vals = data.map(d => d.count ?? d.value ?? 0);
  const max = Math.max(...vals, 1);
  return (
    <div className="flex items-end gap-[2px] h-[40px]">
      {vals.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-sm transition-all duration-300"
          style={{ height: `${(v / max) * 100}%`, backgroundColor: color, opacity: 0.5 + (v / max) * 0.5 }} />
      ))}
    </div>
  );
}

// === Stat Card ===
function StatCard({ icon: Icon, label, value, sub, color = COLORS.primary, loading }) {
  const { theme } = useStore();
  const isDark = theme === 'dark';
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-xl border transition-colors',
        isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200',
      )}>
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', isDark ? 'bg-gray-700/50' : 'bg-gray-100')}>
          <Icon size={18} style={{ color }} />
        </div>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <div className="flex -space-x-1">
            {loading && (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </div>
        </motion.div>
      </div>
      <div className="mt-3">
        <div className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
          {loading ? <div className="w-16 h-7 rounded bg-gray-700 animate-pulse" /> : value}
        </div>
        <div className={cn('text-xs mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>{label}</div>
        {sub && <div className="text-xs mt-1 text-gray-500">{sub}</div>}
      </div>
    </motion.div>
  );
}

// === Status Badge ===
function StatusBadge({ status, size = 'sm' }) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium border',
      sizeClass, getStatusBg(status)
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', getStatusColor(status))} />
      {status?.replace('_', ' ')}
    </span>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function MonitoringCenter() {
  const { theme } = useStore();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState({});

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState(null);
  const [websites, setWebsites] = useState([]);
  const [visitorStats, setVisitorStats] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [domains, setDomains] = useState([]);
  const [apis, setApis] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [categories, setCategories] = useState([]);

  // UI State
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(null);

  // Load all data
  const loadAll = useCallback(async () => {
    try {
      const [dash, webs, visits, serv, db, doms, aps, sec, notifs, unread, cats] = await Promise.all([
        fetchAPI('monitor_dashboard_summary'),
        fetchAPI('monitor_get_websites'),
        fetchAPI('monitor_get_visitor_stats'),
        fetchAPI('monitor_get_server_status'),
        fetchAPI('monitor_get_database_status'),
        fetchAPI('monitor_get_domains'),
        fetchAPI('monitor_get_apis'),
        fetchAPI('monitor_get_security_logs', { limit: 30 }),
        fetchAPI('monitor_get_notifications', { limit: 20 }),
        fetchAPI('monitor_get_unread_count'),
        fetchAPI('monitor_get_categories'),
      ]);
      setDashboardData(dash);
      setWebsites(Array.isArray(webs) ? webs : []);
      setVisitorStats(visits);
      setServerStatus(serv);
      setDbStatus(db);
      setDomains(Array.isArray(doms) ? doms : []);
      setApis(Array.isArray(aps) ? aps : []);
      setSecurityLogs(Array.isArray(sec) ? sec : []);
      setNotifications(Array.isArray(notifs) ? notifs : []);
      setUnreadCount(unread?.unread ?? 0);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (e) { console.error('Load error:', e); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadAll]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between p-4 border-b',
        isDark ? 'border-gray-700/50 bg-gray-900/50' : 'border-gray-200 bg-gray-50',
      )}>
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', isDark ? 'bg-indigo-500/10' : 'bg-indigo-100')}>
            <Activity className="text-indigo-500" size={20} />
          </div>
          <div>
            <h1 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>Monitoring Center</h1>
            <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>Pantau semua layanan secara real-time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
              onClick={() => setActiveTab('notifications')}
              className={cn(
                'relative p-2 rounded-lg border transition-colors',
                isDark ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-red-500/30 bg-red-50 text-red-600',
              )}>
              <Bell size={16} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
            </motion.button>
          )}
          <button onClick={() => loadAll()}
            className={cn(
              'p-2 rounded-lg border transition-colors',
              isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-200 hover:bg-gray-100 text-gray-600',
            )}>
            <RefreshCw size={16} className={autoRefresh ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              'p-2 rounded-lg border text-xs transition-colors',
              autoRefresh
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-100',
            )}>
            {autoRefresh ? 'LIVE' : 'Auto'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={cn(
        'flex overflow-x-auto gap-1 px-4 py-2 border-b scrollbar-hide',
        isDark ? 'border-gray-700/50 bg-gray-900/30' : 'border-gray-200 bg-gray-50',
      )}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                isActive
                  ? isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'
                  : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
              )}>
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
            {activeTab === 'dashboard' && <DashboardTab data={dashboardData} isDark={isDark} onRefresh={loadAll} />}
            {activeTab === 'websites' && <WebsitesTab websites={websites} isDark={isDark} onRefresh={loadAll} categories={categories} />}
            {activeTab === 'visitors' && <VisitorsTab data={visitorStats} isDark={isDark} />}
            {activeTab === 'server' && <ServerTab data={serverStatus} isDark={isDark} />}
            {activeTab === 'database' && <DatabaseTab data={dbStatus} isDark={isDark} />}
            {activeTab === 'domains' && <DomainsTab domains={domains} isDark={isDark} onRefresh={loadAll} />}
            {activeTab === 'api' && <ApiTab apis={apis} isDark={isDark} onRefresh={loadAll} />}
            {activeTab === 'security' && <SecurityTab logs={securityLogs} isDark={isDark} onRefresh={loadAll} />}
            {activeTab === 'notifications' && <NotificationsTab notifications={notifications} isDark={isDark} onRefresh={loadAll} setUnreadCount={setUnreadCount} />}
            {activeTab === 'reports' && <ReportsTab isDark={isDark} />}
            {activeTab === 'settings' && <SettingsTab settings={settings} isDark={isDark} onRefresh={loadAll} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// =============================================
// DASHBOARD TAB
// =============================================
function DashboardTab({ data, isDark, onRefresh }) {
  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-indigo-500" size={32} />
          <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  const { websites: ws = { total: 0, online: 0, offline: 0 }, server: sv, visitors = 0, database_size_mb: dbSize = 0, unread_notifications: unreadN = 0, domains_expiring: expiring = [] } = data;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Globe} label="Total Website" value={ws.total ?? 0}
          sub={`${ws.online ?? 0} online · ${ws.offline ?? 0} offline`}
          color={COLORS.primary} />
        <StatCard icon={Users} label="Total Pengunjung" value={visitors?.toLocaleString?.() ?? '0'}
          sub="Semua waktu" color={COLORS.info} />
        <StatCard icon={HardDrive} label="Database" value={`${(dbSize || 0).toFixed(2)} MB`}
          sub="Ukuran database" color={COLORS.success} />
        <StatCard icon={Bell} label="Notifikasi" value={unreadN}
          sub={unreadN > 0 ? `${unreadN} belum dibaca` : 'Semua terbaca'}
          color={unreadN > 0 ? COLORS.warning : COLORS.success} />
      </div>

      {/* Server Status + Quick Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Server Widget */}
        <div className={cn('p-4 rounded-xl border', isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200')}>
          <h3 className={cn('text-sm font-semibold mb-4 flex items-center gap-2', isDark ? 'text-white' : 'text-gray-900')}>
            <Server size={16} className="text-indigo-500" /> Status Server
          </h3>
          {sv ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>Status</span>
                <StatusBadge status={sv.status} />
              </div>
              <div className="space-y-2">
                {[
                  { label: 'CPU', value: sv.cpu_usage, max: 100, unit: '%', color: sv.cpu_usage > 80 ? COLORS.danger : sv.cpu_usage > 60 ? COLORS.warning : COLORS.success },
                  { label: 'RAM', value: sv.ram_percent, max: 100, unit: '%', color: sv.ram_percent > 80 ? COLORS.danger : sv.ram_percent > 60 ? COLORS.warning : COLORS.success },
                  { label: 'Disk', value: sv.disk_percent, max: 100, unit: '%', color: sv.disk_percent > 90 ? COLORS.danger : sv.disk_percent > 75 ? COLORS.warning : COLORS.success },
                ].map(bar => (
                  <div key={bar.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{bar.label}</span>
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{bar.value ?? 0}{bar.unit}</span>
                    </div>
                    <div className={cn('h-1.5 rounded-full', isDark ? 'bg-gray-700' : 'bg-gray-200')}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(bar.value ?? 0, 100)}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: bar.color, width: `${Math.min(bar.value ?? 0, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className={cn('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>
                Terakhir update: {sv.last_updated ? formatDate(sv.last_updated) : '-'}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Server className="mx-auto mb-2 text-gray-500" size={28} />
              <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>Data server belum tersedia</p>
              <p className={cn('text-[10px] mt-1', isDark ? 'text-gray-500' : 'text-gray-400')}>Jalankan script update server untuk mengisi data</p>
            </div>
          )}
        </div>

        {/* Domain Expiring & Alerts */}
        <div className={cn('p-4 rounded-xl border', isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200')}>
          <h3 className={cn('text-sm font-semibold mb-4 flex items-center gap-2', isDark ? 'text-white' : 'text-gray-900')}>
            <AlertTriangle size={16} className="text-yellow-500" /> Peringatan
          </h3>
          {expiring.length > 0 ? (
            <div className="space-y-2">
              {expiring.map((d, i) => (
                <div key={i} className={cn(
                  'flex items-center justify-between p-2 rounded-lg text-xs',
                  isDark ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200',
                )}>
                  <div className="flex items-center gap-2">
                    <GlobeLock size={12} className="text-yellow-500" />
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{d.domain}</span>
                  </div>
                  <span className="text-yellow-500 font-medium">
                    {d.days_until_expiry !== undefined && d.days_until_expiry >= 0
                      ? `${d.days_until_expiry} hari lagi`
                      : 'Expired!'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="mx-auto mb-2 text-green-500" size={28} />
              <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>Tidak ada peringatan</p>
              <p className={cn('text-[10px] mt-1', isDark ? 'text-gray-500' : 'text-gray-400')}>Semua domain dan SSL dalam kondisi baik</p>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button onClick={onRefresh}
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
                isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}>
              <RefreshCw size={12} className="inline mr-1" /> Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// WEBSITES TAB
// =============================================
function WebsitesTab({ websites, isDark, onRefresh, categories }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [checking, setChecking] = useState({});
  const [form, setForm] = useState({ name: '', url: '', category: 'Umum', notes: '', is_active: 1 });

  const filtered = websites.filter(w =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.url.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = {};
  filtered.forEach(w => {
    const cat = w.category || 'Umum';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(w);
  });

  async function handleCheck(id) {
    setChecking(prev => ({ ...prev, [id]: true }));
    await fetchAPI('monitor_check_website', { id });
    setChecking(prev => ({ ...prev, [id]: false }));
    onRefresh();
  }

  async function handleCheckAll() {
    await fetchAPI('monitor_check_all_websites');
    onRefresh();
  }

  async function handleSave() {
    if (editItem) {
      await fetchAPI('monitor_update_website', { ...form, id: editItem.id });
    } else {
      await fetchAPI('monitor_add_website', form);
    }
    setShowForm(false);
    setEditItem(null);
    setForm({ name: '', url: '', category: 'Umum', notes: '', is_active: 1 });
    onRefresh();
  }

  async function handleDelete(id) {
    if (!confirm('Hapus website ini?')) return;
    await fetchAPI('monitor_delete_website', { id });
    onRefresh();
  }

  function openEdit(w) {
    setForm({ name: w.name, url: w.url, category: w.category, notes: w.notes || '', is_active: w.is_active });
    setEditItem(w);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center gap-2">
        <div className={cn('flex-1 relative')}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari website..." className={cn(
              'w-full pl-8 pr-3 py-2 rounded-lg border text-xs',
              isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400',
            )} />
        </div>
        <button onClick={handleCheckAll}
          className={cn(
            'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
            isDark ? 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'border-green-500/30 bg-green-50 text-green-600 hover:bg-green-100',
          )}>
          <RefreshCw size={12} className="inline mr-1" /> Check All
        </button>
        <button onClick={() => { setEditItem(null); setForm({ name: '', url: '', category: 'Umum', notes: '', is_active: 1 }); setShowForm(true); }}
          className={cn(
            'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
            isDark ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' : 'border-indigo-500/30 bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
          )}>
          <Plus size={12} className="inline mr-1" /> Tambah
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className={cn('p-4 rounded-xl border', isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')}>
          <h3 className={cn('text-sm font-semibold mb-3', isDark ? 'text-white' : 'text-gray-900')}>
            {editItem ? 'Edit Website' : 'Tambah Website Baru'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nama website" className={cn(
                'px-3 py-2 rounded-lg border text-xs',
                isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
              )} />
            <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
              placeholder="URL (https://...)" className={cn(
                'px-3 py-2 rounded-lg border text-xs',
                isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
              )} />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className={cn(
                'px-3 py-2 rounded-lg border text-xs',
                isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
              )}>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="Lainnya">Lainnya</option>
            </select>
            <div className="flex items-center gap-2">
              <label className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>Aktif:</label>
              <button onClick={() => setForm({ ...form, is_active: form.is_active ? 0 : 1 })}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  form.is_active
                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                    : isDark ? 'border-gray-600 text-gray-400' : 'border-gray-200 text-gray-500',
                )}>
                {form.is_active ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition-colors">
              {editItem ? 'Update' : 'Simpan'}
            </button>
            <button onClick={() => { setShowForm(false); setEditItem(null); }}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-medium border transition-colors',
                isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100',
              )}>Batal</button>
          </div>
        </div>
      )}

      {/* Website List */}
      {Object.keys(grouped).length === 0 ? (
        <div className={cn('text-center py-12 rounded-xl border', isDark ? 'border-gray-700/50' : 'border-gray-200')}>
          <Globe className="mx-auto mb-3 text-gray-500" size={40} />
          <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>Belum ada website</p>
          <p className={cn('text-xs mt-1', isDark ? 'text-gray-500' : 'text-gray-400')}>Tambah website untuk mulai monitoring</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h3 className={cn('text-xs font-semibold uppercase tracking-wider mb-2', isDark ? 'text-gray-500' : 'text-gray-400')}>
              {category} ({items.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(w => (
                <div key={w.id} className={cn(
                  'p-3 rounded-xl border transition-all hover:shadow-lg',
                  isDark ? 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800' : 'bg-white border-gray-200 hover:shadow-md',
                )}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        w.status === 'online' ? 'bg-green-500/10' : w.status === 'offline' ? 'bg-red-500/10' : 'bg-gray-500/10',
                      )}>
                        <Globe size={14} className={getStatusColor(w.status)} />
                      </div>
                      <div>
                        <div className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>{w.name}</div>
                        <div className={cn('text-[10px]', isDark ? 'text-gray-500' : 'text-gray-400')}>{w.url}</div>
                      </div>
                    </div>
                    <StatusBadge status={w.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => handleCheck(w.id)} disabled={checking[w.id]}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-[10px] font-medium border transition-colors',
                        isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-100',
                      )}>
                      {checking[w.id] ? <RefreshCw size={10} className="inline animate-spin" /> : <RefreshCw size={10} className="inline mr-1" />}
                      Check
                    </button>
                    <button onClick={() => openEdit(w)}
                      className={cn(
                        'p-1.5 rounded-lg border transition-colors',
                        isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-100',
                      )}>
                      <Edit size={12} />
                    </button>
                    <button onClick={() => handleDelete(w.id)}
                      className={cn(
                        'p-1.5 rounded-lg border transition-colors',
                        isDark ? 'border-gray-600 text-red-400 hover:bg-red-500/10' : 'border-gray-200 text-red-500 hover:bg-red-50',
                      )}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {w.last_checked && (
                    <div className={cn('text-[10px] mt-2', isDark ? 'text-gray-600' : 'text-gray-400')}>
                      Cek terakhir: {formatDate(w.last_checked)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// =============================================
// VISITORS TAB
// =============================================
function VisitorsTab({ data, isDark }) {
  const [period, setPeriod] = useState('daily');

  if (!data) {
    return <div className="flex items-center justify-center py-20">
      <RefreshCw className="animate-spin text-indigo-500" size={24} />
    </div>;
  }

  const chartData = data[period] || [];
  const devices = data.devices || [];
  const browsers = data.browsers || [];
  const countries = data.countries || [];

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Pengunjung" value={data.total?.toLocaleString() ?? '0'} color={COLORS.info} />
        <StatCard icon={Activity} label="Hari Ini" value={data.today ?? 0} color={COLORS.primary} />
        <StatCard icon={Zap} label="Online Saat Ini" value={data.active ?? 0} color={COLORS.success} sub="5 menit terakhir" />
        <StatCard icon={TrendingUp} label="Rata-rata Harian" value={data.daily?.length > 0 ? Math.round(chartData.reduce((a, b) => a + (b.count || 0), 0) / chartData.length) : 0} color={COLORS.purple} />
      </div>

      {/* Chart */}
      <div className={cn('p-4 rounded-xl border', isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200')}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>Grafik Pengunjung</h3>
          <div className="flex gap-1">
            {['daily', 'weekly', 'monthly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn(
                  'px-2 py-1 rounded text-[10px] font-medium transition-colors',
                  period === p
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900',
                )}>
                {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
              </button>
            ))}
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="space-y-2">
            <MiniBar data={chartData} color={COLORS.primary} height={80} />
            <div className="flex justify-between text-[10px]">
              <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                {chartData[0]?.date || chartData[0]?.week || chartData[0]?.month || '-'}
              </span>
              <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                {chartData[chartData.length - 1]?.date || chartData[chartData.length - 1]?.week || chartData[chartData.length - 1]?.month || '-'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="mx-auto mb-2 text-gray-500" size={28} />
            <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>Belum ada data pengunjung</p>
          </div>
        )}
      </div>

      {/* Devices, Browsers, Countries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Perangkat', icon: Smartphone, data: devices, color: COLORS.info },
          { title: 'Browser', icon: Monitor, data: browsers, color: COLORS.purple },
          { title: 'Negara', icon: Globe, data: countries, color: COLORS.success },
        ].map(section => {
          const total = section.data.reduce((a, b) => a + (b.value || 0), 0);
          return (
            <div key={section.title} className={cn('p-4 rounded-xl border', isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200')}>
              <h3 className={cn('text-sm font-semibold mb-3 flex items-center gap-2', isDark ? 'text-white' : 'text-gray-900')}>
                <section.icon size={14} style={{ color: section.color }} /> {section.title}
              </h3>
              {section.data.length > 0 ? (
                <div className="space-y-2">
                  {section.data.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={cn('flex-1 text-xs', isDark ? 'text-gray-300' : 'text-gray-700')}>{item.label}</div>
                      <div className="flex-1">
                        <div className={cn('h-1.5 rounded-full', isDark ? 'bg-gray-700' : 'bg-gray-200')}>
                          <div className="h-full rounded-full" style={{ width: `${(item.value / total) * 100}%`, backgroundColor: section.color }} />
                        </div>
                      </div>
                      <div className={cn('text-xs font-medium', isDark ? 'text-gray-300' : 'text-gray-700')}>{Math.round((item.value / total) * 100)}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={cn('text-xs text-center py-4', isDark ? 'text-gray-500' : 'text-gray-400')}>Belum ada data</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================
// SERVER TAB
// =============================================
function ServerTab({ data, isDark }) {
  if (!data) {
    return <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <Server className="mx-auto mb-3 text-gray-500" size={40} />
        <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>Data server belum tersedia</p>
        <p className={cn('text-xs mt-1', isDark ? 'text-gray-500' : 'text-gray-400')}>
          Jalankan cron script atau update manual untuk mengisi data server
        </p>
      </div>
    </div>;
  }

  const resources = [
    { label: 'CPU', value: data.cpu_usage ?? 0, max: 100, unit: '%', icon: Cpu, color: (data.cpu_usage ?? 0) > 80 ? COLORS.danger : (data.cpu_usage ?? 0) > 60 ? COLORS.warning : COLORS.success },
    { label: 'RAM', value: data.ram_percent ?? 0, max: 100, unit: '%', icon: Server, color: (data.ram_percent ?? 0) > 80 ? COLORS.danger : (data.ram_percent ?? 0) > 60 ? COLORS.warning : COLORS.success },
    { label: 'Disk', value: data.disk_percent ?? 0, max: 100, unit: '%', icon: HardDrive, color: (data.disk_percent ?? 0) > 90 ? COLORS.danger : (data.disk_percent ?? 0) > 75 ? COLORS.warning : COLORS.success },
  ];

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className={cn('p-4 rounded-xl border', isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200')}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>Status Server</h3>
            <p className={cn('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>{data.server_name || 'Garuda Nexa Server'}</p>
          </div>
          <StatusBadge status={data.status} size="md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resources.map(r => {
            const Icon = r.icon;
            const pct = r.value;
            return (
              <div key={r.label} className={cn('p-3 rounded-lg border', isDark ? 'bg-gray-900/50 border-gray-700/30' : 'bg-gray-50 border-gray-200')}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} style={{ color: r.color }} />
                  <span className={cn('text-xs font-medium', isDark ? 'text-gray-300' : 'text-gray-700')}>{r.label}</span>
                </div>
                <div className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                  {pct}{r.unit}
                </div>
                <div className={cn('h-2 rounded-full mt-2', isDark ? 'bg-gray-700' : 'bg-gray-200')}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className="h-full rounded-full" style={{ backgroundColor: r.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {data.uptime_seconds > 0 && (
          <div className={cn('mt-4 text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>
            Uptime: {Math.floor(data.uptime_seconds / 86400)} hari {Math.floor((data.uptime_seconds % 86400) / 3600)} jam
          </div>
        )}
      </div>

      {/* Network / OS Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={cn('p-4 rounded-xl border', isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200')}>
          <h3 className={cn('text-sm font-semibold mb-3', isDark ? 'text-white' : 'text-gray-900')}>Jaringan</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className={cn('p-3 rounded-lg', isDark ? 'bg-gray-900/50' : 'bg-gray-50')}>
              <div className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>Download</div>
              <div className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{formatBytes(data.network_in ?? 0)}</div>
            </div>
            <div className={cn('p-3 rounded-lg', isDark ? 'bg-gray-900/50' : 'bg-gray-50')}>
              <div className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>Upload</div>
              <div className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{formatBytes(data.network_out ?? 0)}</div>
            </div>
          </div>
        </div>
        <div className={cn('p-4 rounded-xl border', isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200')}>
          <h3 className={cn('text-sm font-semibold mb-3', isDark ? 'text-white' : 'text-gray-900')}>Informasi Sistem</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>OS</span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{data.os_info || 'Linux'}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Terakhir Update</span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{data.last_updated ? formatDate(data.last_updated) : '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// DATABASE TAB
// =============================================
function DatabaseTab({ data, isDark }) {
  if (!data) {
    return <div className="flex items-center justify-center py-20">
      <RefreshCw className="animate-spin text-indigo-500" size={24} />
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Database} label="Ukuran Database" value={`${(data.size_mb || 0).toFixed(2)} MB`} color={COLORS.info} />
        <StatCard icon={Server} label="Koneksi Aktif" value={data.active_connections ?? 0} color={COLORS.success} />
        <StatCard icon={CheckCircle} label="Status" value={<StatusBadge status={data.status} />} color={COLORS.primary} />
        <StatCard icon={Clock} label="Last Backup" value={data.last_backup ? formatDate(data.last_backup) : 'Belum pernah'} color={COLORS.warning} />
      </div>

      <div className={cn('p-4 rounded-xl border', isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200')}>
        <h3 className={cn('text-sm font-semibold mb-3', isDark ? 'text-white' : 'text-gray-900')}>Detail Database</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Nama Database', value: data.db_name },
            { label: 'Status', value: <StatusBadge status={data.status} /> },
            { label: 'Ukuran', value: `${(data.size_mb || 0).toFixed(2)} MB` },
            { label: 'Koneksi Aktif', value: data.active_connections ?? 0 },
            { label: 'Backup Terakhir', value: data.last_backup ? formatDate(data.last_backup) : 'Belum pernah' },
            { label: 'Status Backup', value: data.backup_status || 'N/A' },
          ].map((d, i) => (
            <div key={i} className={cn('p-3 rounded-lg', isDark ? 'bg-gray-900/50' : 'bg-gray-50')}>
              <div className={cn('text-[10px] mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>{d.label}</div>
              <div className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================
// DOMAINS TAB
// =============================================
function DomainsTab({ domains, isDark, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ domain: '', website_id: 0, registrar: '', expiry_date: '', ssl_expiry_date: '' });
  const [websites, setWebsites] = useState([]);

  useEffect(() => {
    fetchAPI('monitor_get_websites').then(d => { if (Array.isArray(d)) setWebsites(d); });
  }, []);

  async function handleSave() {
    await fetchAPI('monitor_add_domain', form);
    setShowForm(false);
    setForm({ domain: '', website_id: 0, registrar: '', expiry_date: '', ssl_expiry_date: '' });
    onRefresh();
  }

  async function handleDelete(id) {
    if (!confirm('Hapus domain ini?')) return;
    await fetchAPI('monitor_delete_domain', { id });
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)}
          className={cn(
            'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
            isDark ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' : 'border-indigo-500/30 bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
          )}>
          <Plus size={12} className="inline mr-1" /> Tambah Domain
        </button>
      </div>

      {showForm && (
        <div className={cn('p-4 rounded-xl border', isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')}>
          <h3 className={cn('text-sm font-semibold mb-3', isDark ? 'text-white' : 'text-gray-900')}>Tambah Domain</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })}
              placeholder="Domain" className={cn(
                'px-3 py-2 rounded-lg border text-xs',
                isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
              )} />
            <select value={form.website_id} onChange={e => setForm({ ...form, website_id: +e.target.value })}
              className={cn(
                'px-3 py-2 rounded-lg border text-xs',
                isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
              )}>
              <option value={0}>-- Pilih Website --</option>
              {websites.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <input value={form.registrar} onChange={e => setForm({ ...form, registrar: e.target.value })}
              placeholder="Registrar" className={cn(
                'px-3 py-2 rounded-lg border text-xs',
                isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
              )} />
            <input value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })}
              type="date" placeholder="Expiry Date" className={cn(
                'px-3 py-2 rounded-lg border text-xs',
                isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
              )} />
            <input value={form.ssl_expiry_date} onChange={e => setForm({ ...form, ssl_expiry_date: e.target.value })}
              type="date" placeholder="SSL Expiry" className={cn(
                'px-3 py-2 rounded-lg border text-xs',
                isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
              )} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg">Simpan</button>
            <button onClick={() => setShowForm(false)}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-medium border',
                isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100',
              )}>Batal</button>
          </div>
        </div>
      )}

      <div className={cn('rounded-xl border overflow-hidden', isDark ? 'border-gray-700/50' : 'border-gray-200')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={cn('text-xs', isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500')}>
              <tr>
                <th className="text-left p-3 font-medium">Domain</th>
                <th className="text-left p-3 font-medium">Website</th>
                <th className="text-left p-3 font-medium">Domain Expiry</th>
                <th className="text-left p-3 font-medium">SSL Expiry</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className={cn('text-xs', isDark ? 'text-gray-300' : 'text-gray-700')}>
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={6} className={cn('p-6 text-center', isDark ? 'text-gray-500' : 'text-gray-400')}>Belum ada domain</td>
                </tr>
              ) : (
                domains.map(d => (
                  <tr key={d.id} className={cn('border-t', isDark ? 'border-gray-800 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50')}>
                    <td className="p-3 font-medium">{d.domain}</td>
                    <td className="p-3">{d.website_name || '-'}</td>
                    <td className="p-3">
                      <span className={d.days_until_expiry < 30 ? 'text-red-400' : ''}>
                        {d.expiry_date ? formatDate(d.expiry_date) : '-'}
                        {d.days_until_expiry > 0 && <span className="ml-1 text-gray-500">({d.days_until_expiry}hr)</span>}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={d.ssl_days_until_expiry < 30 ? 'text-yellow-400' : ''}>
                        {d.ssl_expiry_date ? formatDate(d.ssl_expiry_date) : '-'}
                        {d.ssl_days_until_expiry > 0 && <span className="ml-1 text-gray-500">({d.ssl_days_until_expiry}hr)</span>}
                      </span>
                    </td>
                    <td className="p-3"><StatusBadge status={d.status} /></td>
                    <td className="p-3">
                      <button onClick={() => handleDelete(d.id)}
                        className={cn('p-1 rounded hover:bg-red-500/10', isDark ? 'text-red-400' : 'text-red-500')}>
                        <Trash2 size={12} />
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
  );
}

// =============================================
// API TAB
// =============================================
function ApiTab({ apis, isDark, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', endpoint: '', method: 'GET' });
  const [checking, setChecking] = useState({});

  async function handleSave() {
    await fetchAPI('monitor_add_api', form);
    setShowForm(false);
    setForm({ name: '', endpoint: '', method: 'GET' });
    onRefresh();
  }

  async function handleCheck(id) {
    setChecking(prev => ({ ...prev, [id]: true }));
    await fetchAPI('monitor_check_api', { id });
    setChecking(prev => ({ ...prev, [id]: false }));
    onRefresh();
  }

  async function handleDelete(id) {
    if (!confirm('Hapus API endpoint?')) return;
    await fetchAPI('monitor_delete_api', { id });
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)}
          className={cn(
            'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
            isDark ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' : 'border-indigo-500/30 bg-indigo-50 text-indigo-600',
          )}>
          <Plus size={12} className="inline mr-1" /> Tambah API
        </button>
      </div>

      {showForm && (
        <div className={cn('p-4 rounded-xl border', isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nama API" className={cn(
                'px-3 py-2 rounded-lg border text-xs',
                isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
              )} />
            <input value={form.endpoint} onChange={e => setForm({ ...form, endpoint: e.target.value })}
              placeholder="Endpoint URL" className={cn(
                'px-3 py-2 rounded-lg border text-xs',
                isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
              )} />
            <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}
              className={cn(
                'px-3 py-2 rounded-lg border text-xs',
                isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
              )}>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-500 text-white text-xs rounded-lg">Simpan</button>
            <button onClick={() => setShowForm(false)}
              className={cn('px-4 py-2 rounded-lg text-xs border', isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600')}>Batal</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {apis.length === 0 ? (
          <div className={cn('col-span-full text-center py-12', isDark ? 'text-gray-400' : 'text-gray-500')}>
            <Cable className="mx-auto mb-3" size={36} />
            <p className="text-sm">Belum ada API endpoint</p>
          </div>
        ) : (
          apis.map(a => {
            const successRate = a.success_count + a.fail_count > 0
              ? Math.round((a.success_count / (a.success_count + a.fail_count)) * 100) : 100;
            return (
              <div key={a.id} className={cn(
                'p-3 rounded-xl border transition-all hover:shadow-lg',
                isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200',
              )}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>{a.name}</div>
                    <div className={cn('text-[10px]', isDark ? 'text-gray-500' : 'text-gray-400')}>{a.method} {a.endpoint}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className={cn('text-center p-2 rounded-lg', isDark ? 'bg-gray-900/50' : 'bg-gray-50')}>
                    <div className={cn('text-xs font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{formatTime(a.response_time_ms || 0)}</div>
                    <div className={cn('text-[10px]', isDark ? 'text-gray-500' : 'text-gray-400')}>Response</div>
                  </div>
                  <div className={cn('text-center p-2 rounded-lg', isDark ? 'bg-gray-900/50' : 'bg-gray-50')}>
                    <div className={cn('text-xs font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{successRate}%</div>
                    <div className={cn('text-[10px]', isDark ? 'text-gray-500' : 'text-gray-400')}>Success</div>
                  </div>
                </div>
                <div className="flex gap-1 mt-3">
                  <button onClick={() => handleCheck(a.id)} disabled={checking[a.id]}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-[10px] font-medium border',
                      isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-100',
                    )}>
                    {checking[a.id] ? <RefreshCw size={10} className="inline animate-spin" /> : <RefreshCw size={10} className="inline mr-1" />}
                    Check
                  </button>
                  <button onClick={() => handleDelete(a.id)}
                    className={cn('p-1.5 rounded-lg border', isDark ? 'border-gray-600 text-red-400' : 'border-gray-200 text-red-500')}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// =============================================
// SECURITY TAB
// =============================================
function SecurityTab({ logs, isDark, onRefresh }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchAPI('monitor_security_summary').then(setSummary);
  }, [logs]);

  async function handleResolve(id) {
    await fetchAPI('monitor_update_security_status', { id, status: 'resolved' });
    onRefresh();
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Shield} label="Total Log" value={summary.total ?? 0} color={COLORS.info} />
          <StatCard icon={AlertCircle} label="Belum Ditinjau" value={summary.new ?? 0} color={summary.new > 0 ? COLORS.warning : COLORS.success} />
          <StatCard icon={AlertTriangle} label="High Severity" value={summary.high_severity ?? 0} color={(summary.high_severity ?? 0) > 0 ? COLORS.danger : COLORS.success} />
          <StatCard icon={WifiOff} label="IP Terblokir" value={summary.blocked_ips ?? 0} color={COLORS.purple} />
        </div>
      )}

      {/* Logs Table */}
      <div className={cn('rounded-xl border overflow-hidden', isDark ? 'border-gray-700/50' : 'border-gray-200')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={cn('text-xs', isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500')}>
              <tr>
                <th className="text-left p-3">Tipe</th>
                <th className="text-left p-3">Deskripsi</th>
                <th className="text-left p-3">IP Address</th>
                <th className="text-left p-3">Severity</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Waktu</th>
                <th className="text-left p-3">Aksi</th>
              </tr>
            </thead>
            <tbody className={cn('text-xs', isDark ? 'text-gray-300' : 'text-gray-700')}>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className={cn('p-6 text-center', isDark ? 'text-gray-500' : 'text-gray-400')}>Belum ada log keamanan</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className={cn('border-t', isDark ? 'border-gray-800' : 'border-gray-100')}>
                    <td className="p-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-medium',
                        log.type === 'suspicious' ? 'bg-yellow-500/10 text-yellow-400' :
                        log.type === 'blocked_ip' ? 'bg-red-500/10 text-red-400' :
                        log.type === 'login' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400',
                      )}>{log.type?.replace('_', ' ')}</span>
                    </td>
                    <td className="p-3 max-w-[200px] truncate">{log.description}</td>
                    <td className="p-3 font-mono text-[10px]">{log.ip_address || '-'}</td>
                    <td className="p-3"><StatusBadge status={log.severity} /></td>
                    <td className="p-3"><StatusBadge status={log.status} /></td>
                    <td className="p-3 text-gray-500">{formatDate(log.created_at)}</td>
                    <td className="p-3">
                      {log.status === 'new' && (
                        <button onClick={() => handleResolve(log.id)}
                          className="p-1 rounded hover:bg-green-500/10 text-green-500">
                          <CheckCircle size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =============================================
// NOTIFICATIONS TAB
// =============================================
function NotificationsTab({ notifications, isDark, onRefresh, setUnreadCount }) {
  async function markRead(id) {
    await fetchAPI('monitor_mark_notification_read', { id });
    onRefresh();
  }

  async function markAllRead() {
    await fetchAPI('monitor_mark_all_read');
    setUnreadCount(0);
    onRefresh();
  }

  const icons = {
    info: Info,
    warning: AlertTriangle,
    critical: AlertCircle,
  };
  const iconsColors = {
    info: COLORS.info,
    warning: COLORS.warning,
    critical: COLORS.danger,
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={markAllRead}
          className={cn(
            'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
            isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100',
          )}>
          <CheckCircle size={12} className="inline mr-1" /> Tandai Semua Terbaca
        </button>
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className={cn('text-center py-12', isDark ? 'text-gray-400' : 'text-gray-500')}>
            <Bell className="mx-auto mb-3" size={36} />
            <p className="text-sm">Tidak ada notifikasi</p>
          </div>
        ) : (
          notifications.map(n => {
            const Icon = icons[n.severity] || Info;
            const color = iconsColors[n.severity] || COLORS.info;
            return (
              <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'p-3 rounded-xl border transition-all flex items-start gap-3',
                  isDark
                    ? (n.is_read ? 'bg-gray-800/30 border-gray-700/30' : 'bg-gray-800 border-gray-700/50')
                    : (n.is_read ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'),
                )}>
                <div className={cn('p-2 rounded-lg', isDark ? 'bg-gray-700' : 'bg-gray-100')}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                      {n.title}
                    </span>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                  </div>
                  <p className={cn('text-xs mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>{n.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn('text-[10px]', isDark ? 'text-gray-500' : 'text-gray-400')}>{formatDate(n.created_at)}</span>
                    <StatusBadge status={n.severity} />
                    {n.sent_wa && <span className="text-[10px] text-green-500">✓ WA</span>}
                  </div>
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)}
                    className={cn(
                      'p-1.5 rounded-lg text-xs border',
                      isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-100',
                    )}>
                    <CheckCircle size={12} />
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

// =============================================
// REPORTS TAB
// =============================================
function ReportsTab({ isDark }) {
  const [selectedReport, setSelectedReport] = useState('daily');
  const [dateRange, setDateRange] = useState('7');

  const reports = [
    { id: 'daily', label: 'Harian', icon: Calendar },
    { id: 'weekly', label: 'Mingguan', icon: Calendar },
    { id: 'monthly', label: 'Bulanan', icon: Calendar },
    { id: 'yearly', label: 'Tahunan', icon: Calendar },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {reports.map(r => (
          <button key={r.id} onClick={() => setSelectedReport(r.id)}
            className={cn(
              'p-4 rounded-xl border text-center transition-all',
              selectedReport === r.id
                ? 'border-indigo-500/30 bg-indigo-500/10'
                : isDark ? 'border-gray-700/50 bg-gray-800/30 hover:bg-gray-800' : 'border-gray-200 bg-white hover:bg-gray-50',
            )}>
            <r.icon size={20} className={cn('mx-auto mb-2', selectedReport === r.id ? 'text-indigo-400' : isDark ? 'text-gray-400' : 'text-gray-500')} />
            <div className={cn('text-sm font-medium', selectedReport === r.id ? 'text-indigo-400' : isDark ? 'text-gray-300' : 'text-gray-700')}>{r.label}</div>
          </button>
        ))}
      </div>

      <div className={cn('p-6 rounded-xl border', isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200')}>
        <div className="flex flex-col items-center gap-3 py-8">
          <FileText className="text-gray-500" size={40} />
          <h3 className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>Laporan {reports.find(r => r.id === selectedReport)?.label || ''}</h3>
          <p className={cn('text-xs text-center max-w-md', isDark ? 'text-gray-400' : 'text-gray-500')}>
            Fitur generate laporan akan segera tersedia. Anda bisa mengekspor data monitoring
            dalam format PDF, Excel, atau CSV.
          </p>
          <div className="flex gap-2 mt-4">
            <button className="px-4 py-2 bg-indigo-500 text-white text-xs font-medium rounded-lg hover:bg-indigo-600 transition-colors">
              <Download size={12} className="inline mr-1" /> Ekspor PDF
            </button>
            <button className={cn(
              'px-4 py-2 rounded-lg text-xs font-medium border transition-colors',
              isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100',
            )}>
              <Download size={12} className="inline mr-1" /> Ekspor Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// SETTINGS TAB
// =============================================
function SettingsTab({ settings, isDark, onRefresh }) {
  const [form, setForm] = useState({
    check_interval: 30,
    wa_notifications: 1,
    wa_phone: '082181361433',
    wa_group: 'Garuda Nexa',
    notify_website_down: 1,
    notify_high_resource: 1,
    notify_ssl_expiry: 30,
    notify_domain_expiry: 30,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    await fetchAPI('monitor_update_settings', form);
    setSaving(false);
    onRefresh();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Web Management */}
      <div className={cn('p-4 rounded-xl border', isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200')}>
        <h3 className={cn('text-sm font-semibold mb-4 flex items-center gap-2', isDark ? 'text-white' : 'text-gray-900')}>
          <Settings size={14} /> Pengaturan Monitoring
        </h3>
        <div className="space-y-4">
          <div>
            <label className={cn('text-xs block mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>Interval Check (detik)</label>
            <input type="number" value={form.check_interval} onChange={e => setForm({ ...form, check_interval: +e.target.value })}
              className={cn(
                'w-full px-3 py-2 rounded-lg border text-xs',
                isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
              )} />
          </div>

          {/* Notifications */}
          <div className="space-y-2">
            <label className={cn('text-xs font-medium', isDark ? 'text-gray-300' : 'text-gray-700')}>Notifikasi WhatsApp</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={cn('flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs',
                isDark ? 'border-gray-600' : 'border-gray-200')}>
                <input type="checkbox" checked={!!form.wa_notifications}
                  onChange={e => setForm({ ...form, wa_notifications: e.target.checked ? 1 : 0 })} />
                Aktifkan WA Notifikasi
              </label>
              <input value={form.wa_phone} onChange={e => setForm({ ...form, wa_phone: e.target.value })}
                placeholder="Nomor WA" className={cn(
                  'px-3 py-2 rounded-lg border text-xs',
                  isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
                )} />
            </div>
          </div>

          {/* Notify Triggers */}
          <div className="space-y-2">
            <label className={cn('text-xs font-medium', isDark ? 'text-gray-300' : 'text-gray-700')}>Trigger Notifikasi</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'notify_website_down', label: 'Website Down' },
                { key: 'notify_high_resource', label: 'Resource Tinggi' },
              ].map(t => (
                <label key={t.key} className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs',
                  isDark ? 'border-gray-600' : 'border-gray-200',
                )}>
                  <input type="checkbox" checked={!!form[t.key]}
                    onChange={e => setForm({ ...form, [t.key]: e.target.checked ? 1 : 0 })} />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cn('text-xs block mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>Notifikasi SSL (hari sebelum)</label>
              <input type="number" value={form.notify_ssl_expiry} onChange={e => setForm({ ...form, notify_ssl_expiry: +e.target.value })}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border text-xs',
                  isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
                )} />
            </div>
            <div>
              <label className={cn('text-xs block mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>Notifikasi Domain (hari sebelum)</label>
              <input type="number" value={form.notify_domain_expiry} onChange={e => setForm({ ...form, notify_domain_expiry: +e.target.value })}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border text-xs',
                  isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900',
                )} />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white text-xs font-medium rounded-lg transition-colors">
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>

      {/* API Info */}
      <div className={cn('p-4 rounded-xl border', isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200')}>
        <h3 className={cn('text-sm font-semibold mb-2', isDark ? 'text-white' : 'text-gray-900')}>Webhook & Integrasi</h3>
        <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
          Notifikasi akan dikirim ke WhatsApp {form.wa_phone} dan grup {form.wa_group} secara otomatis
          ketika ada website down, resource tinggi, atau domain/SSL akan expired.
        </p>
      </div>
    </div>
  );
}
