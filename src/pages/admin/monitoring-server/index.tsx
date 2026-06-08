import { useState, useEffect, useCallback } from 'react';
import {
  Server, Activity, Cpu, Monitor, HardDrive, RefreshCw, Plus, Edit3, Trash2,
  Clock, Wifi, WifiOff, AlertTriangle, X, Check, ChevronDown,
  BarChart3, Terminal, ExternalLink
} from 'lucide-react';

interface ServerData {
  id: number;
  name: string;
  host: string;
  type: string;
  is_active: number;
  created_at: string;
  status: string;
  cpu_usage: number;
  ram_usage: number;
  disk_usage: number;
  last_updated: string | null;
}

interface LogEntry {
  id: number;
  server_id: number;
  cpu_usage: number;
  ram_usage: number;
  ram_total: number;
  disk_usage: number;
  disk_total: number;
  load_1min: number;
  load_5min: number;
  load_15min: number;
  status: string;
  checked_at: string;
}

// ── Toast Component ──
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-blue-600';
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 ${bg} text-white px-5 py-3 rounded-xl shadow-2xl text-sm animate-slide-in`}>
      {type === 'success' ? <Check size={16} /> : type === 'error' ? <AlertTriangle size={16} /> : <Activity size={16} />}
      {message}
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X size={14} /></button>
    </div>
  );
}

// ── Modal ──
function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const MonitoringServer = () => {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<number | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<ServerData | null>(null);
  const [showDelete, setShowDelete] = useState<ServerData | null>(null);
  const [showLogs, setShowLogs] = useState<ServerData | null>(null);
  const [form, setForm] = useState({ name: '', host: '', type: 'vps' });
  const [editForm, setEditForm] = useState({ name: '', host: '', type: 'vps', is_active: 1 });

  const api = async (action: string, body?: any) => {
    const res = await fetch('/api.php', {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify({ action, ...body }) } : {}),
      ...(!body ? {} : {}),
    });
    return res.json();
  };

  const toastMsg = (message: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message, type });

  const fetchServers = useCallback(async () => {
    try {
      const data = await api('get_monitor_servers');
      setServers(data.data || data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 15000);
    return () => clearInterval(interval);
  }, [fetchServers]);

  // Fetch logs when modal opens
  const fetchLogs = async (serverId: number) => {
    try {
      const res = await fetch(`/api.php?action=get_monitor_server_detail&id=${serverId}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setLogs([]);
    }
  };

  const handleRefresh = async (id: number) => {
    setRefreshing(id);
    try {
      const res = await api('check_monitor_server', { id });
      if (res.success) {
        toastMsg(`✅ ${res.status} — CPU ${res.cpu_usage}% · RAM ${res.ram_usage}% · Disk ${res.disk_usage}%`, 'success');
      } else {
        toastMsg(res.error || '⚠️ Refresh failed', 'error');
      }
      fetchServers();
    } catch { toastMsg('⚠️ Connection error', 'error'); }
    finally { setRefreshing(null); }
  };

  const handleRefreshAll = async () => {
    setRefreshingAll(true);
    const promises = servers.map(s => api('check_monitor_server', { id: s.id }));
    const results = await Promise.allSettled(promises);
    const ok = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    toastMsg(`✅ ${ok}/${servers.length} servers refreshed`, ok === servers.length ? 'success' : 'info');
    setRefreshingAll(false);
    fetchServers();
  };

  const handleAdd = async () => {
    if (!form.name || !form.host) { toastMsg('Name and host required', 'error'); return; }
    try {
      const res = await api('add_monitor_server', form);
      if (res.success) {
        toastMsg('✅ Server added', 'success');
        setShowAdd(false);
        setForm({ name: '', host: '', type: 'vps' });
        fetchServers();
        // Auto check the new server
        await api('check_monitor_server', { id: res.id });
        fetchServers();
      } else toastMsg(res.error || '⚠️ Failed', 'error');
    } catch { toastMsg('⚠️ Error', 'error'); }
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    try {
      const res = await api('update_monitor_server', { id: showEdit.id, ...editForm });
      if (res.success) {
        toastMsg('✅ Server updated', 'success');
        setShowEdit(null);
        fetchServers();
      } else toastMsg(res.error || '⚠️ Failed', 'error');
    } catch { toastMsg('⚠️ Error', 'error'); }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      const res = await api('delete_monitor_server', { id: showDelete.id });
      if (res.success) {
        toastMsg('✅ Server deleted', 'success');
        setShowDelete(null);
        fetchServers();
      } else toastMsg(res.error || '⚠️ Failed', 'error');
    } catch { toastMsg('⚠️ Error', 'error'); }
  };

  const openEdit = (s: ServerData) => {
    setEditForm({ name: s.name, host: s.host, type: s.type, is_active: s.is_active });
    setShowEdit(s);
  };

  const openLogs = (s: ServerData) => {
    setShowLogs(s);
    setLogs([]);
    fetchLogs(s.id);
  };

  const getUsageColor = (val: number) => {
    if (val > 80) return 'bg-rose-500';
    if (val > 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getUsageTextColor = (val: number) => {
    if (val > 80) return 'text-rose-400';
    if (val > 60) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'online' || status === 'healthy') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (status === 'warning') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (status === 'critical' || status === 'offline') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  };

  const timeAgo = (ts: string | null) => {
    if (!ts) return 'never';
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Server className="text-primary" size={24} /> Monitoring Server
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {servers.length} server{servers.length !== 1 ? 's' : ''} · Auto-refresh every 15s
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefreshAll} disabled={refreshingAll}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs transition-all disabled:opacity-50">
            <RefreshCw size={14} className={refreshingAll ? 'animate-spin' : ''} />
            {refreshingAll ? 'Refreshing...' : 'Refresh All'}
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/80 text-white px-3 py-2 rounded-xl text-xs transition-all">
            <Plus size={14} /> Add Server
          </button>
        </div>
      </div>

      {/* ── Server Cards atau Empty State ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : servers.length === 0 ? (
        <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-16 text-center">
          <Server className="mx-auto text-slate-700 mb-3" size={40} />
          <p className="text-slate-500 text-sm mb-4">No servers configured yet.</p>
          <button onClick={() => setShowAdd(true)}
            className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-xl text-sm transition-all">
            <Plus size={16} className="inline mr-1" /> Add Your First Server
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {servers.map(s => (
            <div key={s.id}
              className={`bg-slate-900/30 border rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-primary/5 ${
                s.status === 'critical' || s.status === 'offline' ? 'border-rose-500/30' :
                s.status === 'warning' ? 'border-amber-500/30' : 'border-slate-800 hover:border-slate-700'
              }`}>
              {/* Server Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    s.status === 'online' || s.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' :
                    s.status === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                    s.status === 'critical' || s.status === 'offline' ? 'bg-rose-500/10 text-rose-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    <Server size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-white font-semibold text-sm truncate">{s.name}</h4>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                      <ExternalLink size={10} />{s.host} · {s.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border ${getStatusBadge(s.status)}`}>
                    {s.status || 'unknown'}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-3 mb-4">
                {[
                  { icon: Cpu, label: 'CPU', value: s.cpu_usage, unit: '%' },
                  { icon: Monitor, label: 'RAM', value: s.ram_usage, unit: '%' },
                  { icon: HardDrive, label: 'Disk', value: s.disk_usage, unit: '%' },
                ].map((m, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500 px-0.5">
                      <span className="flex items-center gap-1"><m.icon size={11} /> {m.label}</span>
                      <span className={getUsageTextColor(m.value || 0)}>
                        {m.value !== null && m.value !== undefined ? Number(m.value).toFixed(1) : '0.0'}{m.unit}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${getUsageColor(m.value || 0)}`}
                        style={{ width: `${Math.min(m.value || 0, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer: Actions + Last Updated */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                <span className="text-[10px] text-slate-600 flex items-center gap-1">
                  <Clock size={10} />
                  {s.last_updated ? `Updated ${timeAgo(s.last_updated)}` : 'Never checked'}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => openLogs(s)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-blue-400 transition-all"
                    title="View History">
                    <BarChart3 size={14} />
                  </button>
                  <button onClick={() => handleRefresh(s.id)} disabled={refreshing === s.id}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-emerald-400 transition-all disabled:opacity-50"
                    title="Check Now">
                    <RefreshCw size={14} className={refreshing === s.id ? 'animate-spin' : ''} />
                  </button>
                  <button onClick={() => openEdit(s)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition-all"
                    title="Edit">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => setShowDelete(s)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-all"
                    title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Add Server ── */}
      <Modal open={showAdd} title="Add Server" onClose={() => setShowAdd(false)}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Server Name</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
              placeholder="e.g. Main Production" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Host / IP</label>
            <input value={form.host} onChange={e => setForm(p => ({ ...p, host: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
              placeholder="e.g. garudanexa.com or 192.168.1.1" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Type</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              <option value="vps">VPS</option>
              <option value="dedicated">Dedicated</option>
              <option value="docker">Docker</option>
              <option value="shared">Shared Hosting</option>
            </select>
          </div>
          <button onClick={handleAdd}
            className="w-full bg-primary hover:bg-primary/80 text-white rounded-xl py-2.5 text-sm font-medium transition-all mt-2">
            Add Server
          </button>
        </div>
      </Modal>

      {/* ── Modal: Edit Server ── */}
      <Modal open={!!showEdit} title="Edit Server" onClose={() => setShowEdit(null)}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Server Name</label>
            <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Host / IP</label>
            <input value={editForm.host} onChange={e => setEditForm(p => ({ ...p, host: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Type</label>
            <select value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              <option value="vps">VPS</option>
              <option value="dedicated">Dedicated</option>
              <option value="docker">Docker</option>
              <option value="shared">Shared Hosting</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={editForm.is_active === 1}
              onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked ? 1 : 0 }))}
              className="rounded bg-slate-800 border-slate-700" />
            <label htmlFor="is_active" className="text-xs text-slate-400">Active</label>
          </div>
          <button onClick={handleEdit}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white rounded-xl py-2.5 text-sm font-medium transition-all mt-2">
            Save Changes
          </button>
        </div>
      </Modal>

      {/* ── Modal: Delete Confirm ── */}
      <Modal open={!!showDelete} title="Delete Server" onClose={() => setShowDelete(null)}>
        <p className="text-sm text-slate-300 mb-6">
          Are you sure you want to delete <strong className="text-white">{showDelete?.name}</strong>?
          <br />All monitoring logs for this server will also be deleted.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setShowDelete(null)}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2.5 text-sm transition-all">
            Cancel
          </button>
          <button onClick={handleDelete}
            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl py-2.5 text-sm font-medium transition-all">
            Delete
          </button>
        </div>
      </Modal>

      {/* ── Modal: Log History ── */}
      <Modal open={!!showLogs} title={`History: ${showLogs?.name || ''}`} onClose={() => setShowLogs(null)}>
        <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
          {logs.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No logs yet. Click Refresh to check the server.</p>
          ) : (
            logs.map((log, i) => (
              <div key={log.id || i} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    log.status === 'online' || log.status === 'healthy' ? 'bg-emerald-500' :
                    log.status === 'warning' ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`} />
                  <span className="text-slate-400 font-mono">{new Date(log.checked_at).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex gap-3 text-slate-500">
                  <span className="text-emerald-400">CPU {Number(log.cpu_usage).toFixed(1)}%</span>
                  <span className="text-blue-400">RAM {Number(log.ram_usage).toFixed(1)}%</span>
                  <span className="text-amber-400">Disk {Number(log.disk_usage).toFixed(1)}%</span>
                  {log.load_1min > 0 && <span className="text-slate-600">Load {Number(log.load_1min).toFixed(1)}</span>}
                  <span className={`uppercase font-bold text-[9px] ${
                    log.status === 'online' ? 'text-emerald-400' :
                    log.status === 'warning' ? 'text-amber-400' : 'text-rose-400'
                  }`}>{log.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <button onClick={() => { if (showLogs) { fetchLogs(showLogs.id); } }}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2 text-xs transition-all mt-3">
          <RefreshCw size={12} className="inline mr-1" /> Refresh History
        </button>
      </Modal>
    </div>
  );
};

export default MonitoringServer;
