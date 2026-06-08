import { useState, useEffect, useCallback } from 'react';
import {
  Globe, Wifi, WifiOff, RefreshCw, Plus, Edit3, Trash2,
  Clock, ExternalLink, Shield, AlertTriangle, X, Check,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────
const API = '/api.php';

async function api(action: string, data: Record<string, any> = {}, method = 'GET') {
  const params = new URLSearchParams({ action });
  if (method === 'GET') {
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });
  }
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (method === 'POST') {
    options.body = JSON.stringify({ action, ...data });
  }
  const url = method === 'GET' ? `${API}?${params}` : `${API}?action=${action}`;
  const res = await fetch(url, options);
  return res.json();
}

function formatMs(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatDate(d: string | null | undefined) {
  if (!d) return '-';
  return new Date(d).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function sslDaysLeft(expiry: string | null | undefined): number | null {
  if (!expiry) return null;
  const diff = new Date(expiry).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// ── Toast ────────────────────────────────────────────
type ToastMsg = { id: number; type: 'success' | 'error'; text: string };
let toastId = 0;

function WebToast({ toasts, clear }: { toasts: ToastMsg[]; clear: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[999] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-[slideIn_0.25s_ease-out] ${
            t.type === 'success'
              ? 'bg-emerald-900/90 border border-emerald-700 text-emerald-200'
              : 'bg-rose-900/90 border border-rose-700 text-rose-200'
          }`}
        >
          {t.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span className="flex-1">{t.text}</span>
          <button onClick={() => clear(t.id)} className="p-0.5 hover:bg-white/10 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Types ────────────────────────────────────────────
interface Website {
  id: number;
  name: string;
  url: string;
  status: string;
  last_check: string | null;
  response_time: number | null;
  ssl_expiry: string | null;
  is_active: number | boolean;
}

// ── Component ────────────────────────────────────────
export default function WebsitesMonitor() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Website | null>(null);
  const [deleteItem, setDeleteItem] = useState<Website | null>(null);

  // Form state
  const [addForm, setAddForm] = useState({ name: '', url: '', check_interval: '300' });
  const [editForm, setEditForm] = useState({ name: '', url: '', is_active: true });
  const [submitting, setSubmitting] = useState(false);

  // Refreshing single
  const [refreshingId, setRefreshingId] = useState<number | null>(null);

  // ── Toast helpers ──
  const toast = useCallback((type: 'success' | 'error', text: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const clearToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Data fetching ──
  const fetchWebsites = useCallback(async () => {
    try {
      const res = await api('get_monitor_websites');
      const list = Array.isArray(res) ? res : res?.data ?? res?.websites ?? [];
      setWebsites(list);
    } catch (err: any) {
      console.error('fetchWebsites error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebsites();
    const interval = setInterval(fetchWebsites, 15000);
    return () => clearInterval(interval);
  }, [fetchWebsites]);

  // ── CRUD handlers ──
  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.url.trim()) {
      toast('error', 'Name and URL are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api('add_monitor_website', { name: addForm.name.trim(), url: addForm.url.trim() }, 'POST');
      toast('success', 'Website added successfully.');
      setShowAdd(false);
      setAddForm({ name: '', url: '', check_interval: '300' });
      fetchWebsites();
    } catch (err: any) {
      toast('error', err?.message || 'Failed to add website.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    if (!editForm.name.trim() || !editForm.url.trim()) {
      toast('error', 'Name and URL are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api('update_monitor_website', {
        id: editItem.id,
        name: editForm.name.trim(),
        url: editForm.url.trim(),
        is_active: editForm.is_active ? 1 : 0,
      }, 'POST');
      toast('success', 'Website updated successfully.');
      setEditItem(null);
      fetchWebsites();
    } catch (err: any) {
      toast('error', err?.message || 'Failed to update website.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSubmitting(true);
    try {
      await api('delete_monitor_website', { id: deleteItem.id }, 'POST');
      toast('success', 'Website deleted successfully.');
      setDeleteItem(null);
      fetchWebsites();
    } catch (err: any) {
      toast('error', err?.message || 'Failed to delete website.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async (website: Website) => {
    setRefreshingId(website.id);
    try {
      const res = await api('check_monitor_website', { id: website.id }, 'POST');
      if (res?.success) {
        toast('success', `${website.name}: ${res.status} (${formatMs(res.response_time)})`);
      } else {
        toast('error', `Check failed for ${website.name}`);
      }
      fetchWebsites();
    } catch (err: any) {
      toast('error', err?.message || `Failed to check ${website.name}`);
    } finally {
      setRefreshingId(null);
    }
  };

  // ── Open edit modal ──
  const openEdit = (w: Website) => {
    setEditItem(w);
    setEditForm({ name: w.name, url: w.url, is_active: !!w.is_active });
  };

  // ── Status helpers ──
  const statusBadge = (status: string) => {
    const isOnline = status === 'online' || status === 'up';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          isOnline
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-rose-500/10 text-rose-400'
        }`}
      >
        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {isOnline ? 'Online' : 'Offline'}
      </span>
    );
  };

  const sslIndicator = (expiry: string | null | undefined) => {
    const days = sslDaysLeft(expiry);
    if (days === null) return null;
    const isExpiring = days <= 14;
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs ${
          isExpiring ? 'text-amber-400' : 'text-slate-400'
        }`}
      >
        <Shield className="w-3 h-3" />
        SSL {days}d
        {isExpiring && <AlertTriangle className="w-3 h-3 text-amber-400" />}
      </span>
    );
  };

  const uptimeDots = (status: string) => {
    // Simple visual: 3 dots, current status determines color
    const isOnline = status === 'online' || status === 'up';
    return (
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-500/60' : 'bg-rose-500/60'
            }`}
          />
        ))}
      </div>
    );
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* ─── Toast ─── */}
      <WebToast toasts={toasts} clear={clearToast} />

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Globe className="text-primary" /> Website Monitoring
        </h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-xl text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" /> Add Website
        </button>
      </div>

      {/* ─── Cards Grid ─── */}
      {websites.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex p-4 rounded-full bg-slate-800/50 text-slate-500 mb-4">
            <Globe className="w-10 h-10" />
          </div>
          <p className="text-slate-400 text-sm">No websites monitored yet.</p>
          <p className="text-slate-500 text-xs mt-1">Click "Add Website" to start monitoring.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((w) => (
            <div
              key={w.id}
              className="bg-slate-900/30 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all group"
            >
              {/* ── Card Header ── */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      w.status === 'online' || w.status === 'up'
                        ? 'bg-emerald-500/10'
                        : 'bg-rose-500/10'
                    }`}
                  >
                    {w.status === 'online' || w.status === 'up' ? (
                      <Wifi className="w-4.5 h-4.5 text-emerald-400" />
                    ) : (
                      <WifiOff className="w-4.5 h-4.5 text-rose-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-white font-medium text-sm truncate">{w.name}</h4>
                    <a
                      href={w.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-primary flex items-center gap-1 truncate"
                    >
                      {w.url.length > 30 ? w.url.slice(0, 30) + '…' : w.url}
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  </div>
                </div>
                {/* Refresh single */}
                <button
                  onClick={() => handleRefresh(w)}
                  disabled={refreshingId === w.id}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-800 rounded-lg transition-all shrink-0"
                  title="Check now"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-slate-400 ${refreshingId === w.id ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              {/* ── Status Badge ── */}
              <div className="flex items-center gap-3 mb-3">
                {statusBadge(w.status)}
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatMs(w.response_time)}
                </span>
                {sslIndicator(w.ssl_expiry)}
              </div>

              {/* ── Mini Uptime ── */}
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                <span>Uptime</span>
                {uptimeDots(w.status)}
                <span className="text-slate-600">·</span>
                <span>{formatDate(w.last_check)}</span>
              </div>

              {/* ── Actions ── */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => openEdit(w)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => setDeleteItem(w)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════
         MODAL: Add Website
         ══════════════════════════════════════════════ */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Add Website</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Website Name</label>
                <input
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="My Website"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">URL</label>
                <input
                  value={addForm.url}
                  onChange={(e) => setAddForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Check Interval (seconds)</label>
                <input
                  type="number"
                  value={addForm.check_interval}
                  onChange={(e) => setAddForm((p) => ({ ...p, check_interval: e.target.value }))}
                  placeholder="300"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={submitting}
                className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
         MODAL: Edit Website
         ══════════════════════════════════════════════ */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Edit Website</h3>
              <button
                onClick={() => setEditItem(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Website Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="My Website"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">URL</label>
                <input
                  value={editForm.url}
                  onChange={(e) => setEditForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary placeholder:text-slate-600"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
                <span className="text-sm text-slate-300">Active</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditItem(null)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={submitting}
                className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />}
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
         MODAL: Delete Confirm
         ══════════════════════════════════════════════ */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center gap-4 mb-5">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
                <AlertTriangle className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  Are you sure you want to delete <span className="text-white font-medium">{deleteItem.name}</span>?
                </p>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-3 mb-5">
              <p className="text-xs text-slate-500 truncate">{deleteItem.url}</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteItem(null)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />}
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
