import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Plus,
  X,
  Edit2,
  Trash2,
  Save,
  Bug,
  Sparkles,
  Zap,
  ChevronDown,
  Calendar,
  Clock,
  Tag,
  AlertTriangle,
} from 'lucide-react';

interface ChangelogItem {
  id: number;
  change_date: string;
  time: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
}

const API = '/api.php';

const Changelog: React.FC = () => {
  const [logs, setLogs] = useState<ChangelogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChangelogItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'fitur',
    change_date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 8),
  });

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API}?action=get_changelogs`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Gagal ambil changelog:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({
      title: '',
      description: '',
      category: 'fitur',
      change_date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 8),
    });
    setModalOpen(true);
  };

  const openEdit = (item: ChangelogItem) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description,
      category: item.category,
      change_date: item.change_date,
      time: item.time,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const body = editing
      ? { action: 'update_changelog', id: editing.id, ...form }
      : { action: 'add_changelog', ...form };

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchLogs();
      } else {
        alert('Gagal simpan: ' + (data.error || 'unknown'));
      }
    } catch (e) {
      alert('Gagal simpan');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_changelog', id }),
      });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirm(null);
        fetchLogs();
      } else {
        alert('Gagal hapus: ' + (data.error || 'unknown'));
      }
    } catch (e) {
      alert('Gagal hapus');
    }
  };

  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    const s = new Set(expanded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpanded(s);
  };

  // Group by date untuk tampilan timeline
  const grouped: Record<string, ChangelogItem[]> = {};
  logs.forEach((l) => {
    const key = l.change_date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(l);
  });
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Format date
  const fmtDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const fmtTime = (t: string) => t?.slice(0, 5) || '--:--';

  const catLabel: Record<string, string> = {
    fitur: 'Fitur',
    perbaikan: 'Perbaikan',
    peningkatan: 'Peningkatan',
    keamanan: 'Keamanan',
    lainnya: 'Lainnya',
  };

  const catColor: Record<string, string> = {
    fitur: 'bg-blue-600/10 text-blue-400 border-blue-600/20',
    perbaikan: 'bg-red-500/10 text-red-400 border-red-500/20',
    peningkatan: 'bg-green-500/10 text-green-400 border-green-500/20',
    keamanan: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    lainnya: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  const catIcon: Record<string, any> = {
    fitur: Sparkles,
    perbaikan: Bug,
    peningkatan: Zap,
    keamanan: AlertTriangle,
    lainnya: Tag,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 pb-10 md:pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-left space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl md:rounded-2xl flex items-center justify-center border border-blue-600/20">
              <History className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Changelog</h1>
              <p className="text-[11px] md:text-sm text-slate-400">Kelola riwayat perubahan platform</p>
            </div>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-20 text-slate-500 text-sm">Memuat...</div>
      )}

      {/* Empty state */}
      {!loading && logs.length === 0 && (
        <div className="text-center py-20">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Belum ada changelog</p>
          <button onClick={openAdd} className="mt-4 text-blue-400 text-sm hover:underline">
            Tambah changelog pertama
          </button>
        </div>
      )}

      {/* Timeline */}
      {!loading && logs.length > 0 && (
        <div className="relative space-y-6 md:space-y-8">
          <div className="absolute left-[18px] md:left-[23px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-500/50 via-purple-500/20 to-transparent" />

          {dates.map((date) => (
            <div key={date}>
              {/* Date header */}
              <div className="relative pl-12 md:pl-14 mb-3">
                <div className="absolute left-[10px] md:left-[15px] top-[6px] w-[18px] h-[18px] rounded-full bg-blue-600 border-[3px] border-blue-900 shadow-lg shadow-blue-600/30" />
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="font-medium text-slate-300">{fmtDate(date)}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-slate-500">{grouped[date].length} perubahan</span>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {grouped[date].map((item) => {
                  const Icon = catIcon[item.category] || Tag;
                  const isOpen = expanded.has(item.id);
                  return (
                    <div key={item.id} className="relative pl-12 md:pl-14">
                      {/* Dot mini */}
                      <div className="absolute left-[15px] md:left-[20px] top-5 w-[8px] h-[8px] rounded-full bg-slate-600 border-2 border-[#0D0D0D]" />

                      <div className="rounded-xl border border-white/5 bg-[#0D0D0D] overflow-hidden transition-all duration-200 hover:border-white/10">
                        {/* Header clickable */}
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="w-full flex items-center justify-between p-3 md:p-4 text-left hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`p-1.5 rounded-lg shrink-0 ${catColor[item.category] || 'bg-slate-500/10 text-slate-400'}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white truncate">{item.title}</span>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0 ${
                                  catColor[item.category] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                }`}>
                                  {catLabel[item.category] || item.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Clock className="w-3 h-3 text-slate-600" />
                                <span className="text-[10px] text-slate-500">{fmtTime(item.time)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-blue-400 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(item.id); }}
                              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {/* Description body */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 md:px-4 pb-3 md:pb-4 pt-0">
                                <div className={`p-3 rounded-lg text-sm leading-relaxed ${
                                  item.category === 'perbaikan'
                                    ? 'bg-red-500/5 border border-red-500/10'
                                    : 'bg-white/[0.02] border border-white/5'
                                }`}>
                                  <p className="text-[12px] md:text-sm text-slate-300 whitespace-pre-wrap">
                                    {item.description || 'Tidak ada deskripsi'}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Add/Edit ── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-[#1A1A1A] rounded-2xl border border-white/10 p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  {editing ? 'Edit Changelog' : 'Tambah Changelog'}
                </h2>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Judul</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Judul perubahan..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Deskripsi</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Deskripsi perubahan..."
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                  />
                </div>

                {/* Category + Date row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Kategori</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    >
                      <option value="fitur">Fitur</option>
                      <option value="perbaikan">Perbaikan</option>
                      <option value="peningkatan">Peningkatan</option>
                      <option value="keamanan">Keamanan</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tanggal</label>
                    <input
                      type="date"
                      value={form.change_date}
                      onChange={(e) => setForm({ ...form, change_date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Time */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Waktu</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.title.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation ── */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#1A1A1A] rounded-2xl border border-white/10 p-6 text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Hapus Changelog?</h3>
                <p className="text-sm text-slate-400 mt-1">Tindakan ini tidak bisa dibatalkan.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Changelog;
