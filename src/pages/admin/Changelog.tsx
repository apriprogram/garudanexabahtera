import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Plus, X, Edit2, Trash2, Save,
  Bug, Sparkles, Zap, ChevronDown, ChevronLeft, ChevronRight,
  Calendar, Clock, Tag, AlertTriangle, Search, Filter, SlidersHorizontal,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

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

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

const Changelog: React.FC = () => {
  const { theme } = useStore();
  const isLight = theme === 'light';

  const [logs, setLogs] = useState<ChangelogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChangelogItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Filter state
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_changelogs' }),
      });
      const data = await res.json();
      setLogs(data.success && Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      console.error('Gagal ambil changelog:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  // ── build calendar data ──
  const datesWithData = useMemo(() => {
    const set = new Set(logs.map(l => l.change_date));
    return set;
  }, [logs]);

  // ── filtered logs ──
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (selectedDate && l.change_date !== selectedDate) return false;
      if (filterCategory !== 'all' && l.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!l.title.toLowerCase().includes(q) && !l.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [logs, selectedDate, filterCategory, searchQuery]);

  // Can add log on this date?
  const canAddOnDate = (dateStr: string) => {
    return datesWithData.has(dateStr);
  };

  const openAdd = (date?: string) => {
    setEditing(null);
    const d = date || new Date().toISOString().split('T')[0];
    setForm({
      title: '',
      description: '',
      category: 'fitur',
      change_date: d,
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

  // Group filtered by date
  const grouped: Record<string, ChangelogItem[]> = {};
  filteredLogs.forEach(l => {
    const key = l.change_date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(l);
  });
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const fmtDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const fmtDateShort = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const fmtTime = (t: string) => t?.slice(0, 5) || '--:--';

  const catLabel: Record<string, string> = {
    fitur: 'Fitur', perbaikan: 'Perbaikan', peningkatan: 'Peningkatan', keamanan: 'Keamanan', lainnya: 'Lainnya',
  };
  const catColor: Record<string, { bg: string; text: string; border: string; bgLight: string; textLight: string; borderLight: string }> = {
    fitur:     { bg: 'bg-blue-600/10', text: 'text-blue-400', border: 'border-blue-600/20', bgLight: 'bg-blue-50', textLight: 'text-blue-600', borderLight: 'border-blue-200' },
    perbaikan: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', bgLight: 'bg-red-50', textLight: 'text-red-600', borderLight: 'border-red-200' },
    peningkatan:{ bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', bgLight: 'bg-green-50', textLight: 'text-green-600', borderLight: 'border-green-200' },
    keamanan:  { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', bgLight: 'bg-yellow-50', textLight: 'text-yellow-600', borderLight: 'border-yellow-200' },
    lainnya:   { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', bgLight: 'bg-slate-100', textLight: 'text-slate-600', borderLight: 'border-slate-300' },
  };
  const catIcon: Record<string, any> = {
    fitur: Sparkles, perbaikan: Bug, peningkatan: Zap, keamanan: AlertTriangle, lainnya: Tag,
  };

  // ── Calendar helpers ──
  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };
  const goToday = () => {
    const n = new Date();
    setCalMonth(n.getMonth());
    setCalYear(n.getFullYear());
    setSelectedDate(n.toISOString().split('T')[0]);
  };
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  const isToday = (d: number) => {
    const t = new Date();
    return t.getFullYear() === calYear && t.getMonth() === calMonth && t.getDate() === d;
  };

  const formDateStr = (d: number) => {
    const m = String(calMonth + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    return `${calYear}-${m}-${day}`;
  };

  const isSelected = (d: number) => formDateStr(d) === selectedDate;
  const hasData = (d: number) => datesWithData.has(formDateStr(d));

  // ── all categories for filter ──
  const categories = ['all', 'fitur', 'perbaikan', 'peningkatan', 'keamanan', 'lainnya'];

  // ── Shared class helpers ──
  const cardBg = isLight ? 'bg-white border-slate-200' : 'bg-[#0D0D0D] border-white/5';
  const cardHover = isLight ? 'hover:border-slate-300 hover:shadow-sm' : 'hover:border-white/10';
  const inputBg = isLight
    ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
    : 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-blue-500/50';
  const modalBg = isLight ? 'bg-white border-slate-200' : 'bg-[#1A1A1A] border-white/10';
  const overlayBg = isLight ? 'bg-slate-900/40 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border ${
            isLight ? 'bg-blue-50 border-blue-200' : 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-600/20'
          }`}>
            <History className={`w-5 h-5 md:w-6 md:h-6 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          </div>
          <div>
            <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Changelog</h1>
            <p className={`text-[11px] md:text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Riwayat perubahan platform</p>
          </div>
        </div>
        <button
          onClick={() => openAdd()}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isLight ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Calendar ── */}
        <div className={`lg:col-span-1 rounded-2xl border p-4 md:p-5 ${cardBg}`}>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/5 text-slate-400'}`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              {MONTHS_ID[calMonth]} {calYear}
            </h3>
            <button onClick={nextMonth} className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/5 text-slate-400'}`}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_SHORT.map(d => (
              <div key={d} className={`text-center text-[10px] font-bold uppercase py-1 ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formDateStr(day);
              const active = isSelected(day);
              const hasEntry = hasData(day);
              const today = isToday(day);
              return (
                <button
                  key={day}
                  onClick={() => {
                    setSelectedDate(active ? null : dateStr);
                    if (!active && hasEntry) {
                      // jump to that date
                      setTimeout(() => {
                        const el = document.getElementById(`date-section-${dateStr}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }
                  }}
                  className={`relative h-9 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? (isLight ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20')
                      : today
                        ? (isLight ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-blue-600/20 text-blue-300')
                        : (isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/5')
                  }`}
                >
                  {day}
                  {hasEntry && (
                    <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                      active ? 'bg-white' : (isLight ? 'bg-blue-500' : 'bg-blue-400')
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
          {/* Quick actions */}
          <div className="mt-4 space-y-2">
            <button
              onClick={goToday}
              className={`w-full text-xs font-medium py-2 rounded-lg transition-colors ${
                isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              ← Hari ini
            </button>
            {selectedDate && (
              <>
                <div className={`text-xs text-center py-1.5 rounded-lg font-medium ${
                  isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-400'
                }`}>
                  {fmtDateShort(selectedDate)}
                </div>
                <button
                  onClick={() => openAdd(selectedDate)}
                  className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${
                    isLight ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-blue-600/10 text-blue-400 hover:bg-blue-600/20'
                  }`}
                >
                  <Plus className="w-3 h-3" /> Tambah di tanggal ini
                </button>
              </>
            )}
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className={`w-full text-xs py-1.5 rounded-lg transition-colors ${
                  isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Hapus filter tanggal
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Content ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter bar */}
          <div className={`flex flex-col sm:flex-row gap-3 rounded-xl border p-3 ${cardBg}`}>
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari changelog..."
                className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm border focus:outline-none transition-colors ${inputBg}`}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border transition-all ${
                    filterCategory === cat
                      ? (isLight ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-600/20 text-blue-400 border-blue-600/30')
                      : (isLight ? 'text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700' : 'text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-300')
                  }`}
                >
                  {cat === 'all' ? 'Semua' : catLabel[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className={`text-center py-20 text-sm ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Memuat...</div>
          )}

          {/* Empty */}
          {!loading && filteredLogs.length === 0 && (
            <div className={`text-center py-16 rounded-2xl border ${cardBg}`}>
              <History className={`w-10 h-10 mx-auto mb-3 ${isLight ? 'text-slate-300' : 'text-slate-600'}`} />
              <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {selectedDate ? 'Tidak ada changelog di tanggal ini' : 'Belum ada changelog'}
              </p>
              <button
                onClick={() => openAdd(selectedDate || undefined)}
                className={`mt-3 text-sm font-medium ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
              >
                {selectedDate ? 'Tambah di tanggal ini' : 'Tambah changelog pertama'}
              </button>
            </div>
          )}

          {/* ── Timeline ── */}
          {!loading && filteredLogs.length > 0 && (
            <div className="relative space-y-6">
              <div className={`absolute left-[18px] md:left-[23px] top-0 bottom-0 w-[2px] ${
                isLight ? 'bg-gradient-to-b from-blue-300 via-slate-200 to-transparent' : 'bg-gradient-to-b from-blue-500/50 via-purple-500/20 to-transparent'
              }`} />

              {dates.map(date => (
                <div key={date} id={`date-section-${date}`}>
                  {/* Date header */}
                  <div className="relative pl-12 md:pl-14 mb-3">
                    <div className={`absolute left-[10px] md:left-[15px] top-[6px] w-[18px] h-[18px] rounded-full border-[3px] shadow-lg ${
                      isLight ? 'bg-blue-500 border-blue-100 shadow-blue-200' : 'bg-blue-600 border-blue-900 shadow-blue-600/30'
                    }`} />
                    <div className={`flex items-center gap-2 text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span className={`font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{fmtDate(date)}</span>
                      <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>·</span>
                      <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{grouped[date].length} perubahan</span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="space-y-3">
                    {grouped[date].map(item => {
                      const Icon = catIcon[item.category] || Tag;
                      const isOpen = expanded.has(item.id);
                      const c = catColor[item.category] || catColor.lainnya;
                      return (
                        <div key={item.id} className="relative pl-12 md:pl-14">
                          <div className={`absolute left-[15px] md:left-[20px] top-5 w-[8px] h-[8px] rounded-full border-2 ${
                            isLight ? 'bg-slate-300 border-white' : 'bg-slate-600 border-[#0D0D0D]'
                          }`} />

                          <div className={`rounded-xl border overflow-hidden transition-all duration-200 ${cardBg} ${cardHover}`}>
                            <button
                              onClick={() => toggleExpand(item.id)}
                              className={`w-full flex items-center justify-between p-3 md:p-4 text-left transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'}`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`p-1.5 rounded-lg shrink-0 border ${
                                  isLight ? `${c.bgLight} ${c.textLight} ${c.borderLight}` : `${c.bg} ${c.text} ${c.border}`
                                }`}>
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-semibold truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>{item.title}</span>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0 ${
                                      isLight ? `${c.bgLight} ${c.textLight} ${c.borderLight}` : `${c.bg} ${c.text} ${c.border}`
                                    }`}>
                                      {catLabel[item.category] || item.category}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <Clock className={`w-3 h-3 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                                    <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{fmtTime(item.time)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button
                                  onClick={e => { e.stopPropagation(); openEdit(item); }}
                                  className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-50' : 'text-slate-500 hover:text-blue-400 hover:bg-white/5'}`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); setDeleteConfirm(item.id); }}
                                  className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-500 hover:text-red-400 hover:bg-white/5'}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                              </div>
                            </button>

                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 md:px-4 pb-3 md:pb-4 pt-0">
                                    <div className={`p-3 rounded-lg text-sm leading-relaxed ${
                                      item.category === 'perbaikan'
                                        ? (isLight ? 'bg-red-50 border border-red-100' : 'bg-red-500/5 border border-red-500/10')
                                        : (isLight ? 'bg-slate-50 border border-slate-100' : 'bg-white/[0.02] border border-white/5')
                                    }`}>
                                      <p className={`text-[12px] md:text-sm whitespace-pre-wrap ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
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
        </div>
      </div>

      {/* ── Modal Add/Edit (whitemode supported) ── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[200] flex items-center justify-center p-4 ${overlayBg}`}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-lg rounded-2xl border p-6 space-y-5 ${modalBg}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {editing ? 'Edit Changelog' : 'Tambah Changelog'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-700' : 'hover:bg-white/5 text-slate-500 hover:text-white'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Judul</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Judul perubahan..."
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Deskripsi</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Deskripsi perubahan..."
                    rows={4}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors resize-none ${inputBg}`}
                  />
                </div>

                {/* Category + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Kategori</label>
                    <select
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${inputBg}`}
                    >
                      {categories.filter(c => c !== 'all').map(c => (
                        <option key={c} value={c}>{catLabel[c]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Tanggal</label>
                    <input
                      type="date"
                      value={form.change_date}
                      onChange={e => setForm({ ...form, change_date: e.target.value })}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${inputBg}`}
                    />
                  </div>
                </div>

                {/* Time */}
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Waktu</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm({ ...form, time: e.target.value })}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${inputBg}`}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    isLight
                      ? 'border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                      : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.title.trim()}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Modal (whitemode supported) ── */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[200] flex items-center justify-center p-4 ${overlayBg}`}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-2xl border p-6 text-center space-y-4 ${modalBg}`}
              onClick={e => e.stopPropagation()}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${isLight ? 'bg-red-50' : 'bg-red-500/10'}`}>
                <AlertTriangle className={`w-6 h-6 ${isLight ? 'text-red-500' : 'text-red-400'}`} />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Hapus Changelog?</h3>
                <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tindakan ini tidak bisa dibatalkan.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    isLight
                      ? 'border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                      : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all ${
                    isLight ? 'bg-red-600 hover:bg-red-700' : 'bg-red-600 hover:bg-red-500'
                  }`}
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
