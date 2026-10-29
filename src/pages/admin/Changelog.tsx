import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Plus, Edit2, Trash2, Save,
  Bug, Sparkles, Zap, ChevronDown, ChevronLeft, ChevronRight,
  Calendar, Clock, Tag, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  IconBox,
  IconButton,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Panel,
  SearchInput,
  Select,
  Tabs,
  Textarea,
  cn,
  FOCUS_INSET,
  type Tone,
} from '../../components/admin/ui';
import { apiPost, errorMessage } from '../../lib/api';
import { useToast } from './template-orders/shared/hooks';
import { Toast } from './template-orders/shared/OrderUi';

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
  const [logs, setLogs] = useState<ChangelogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChangelogItem | null>(null);
  // Changelog yang akan dihapus (dialog konfirmasi terbuka)
  const [deleteConfirm, setDeleteConfirm] = useState<ChangelogItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast, show, dismiss } = useToast();

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

  const fetchLogs = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    // fetchLogs baru memanggil setState setelah await; aturan ini tidak membedakan fungsi async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
  }, [fetchLogs]);

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

  // Simpan & hapus lewat apiPost: respons gagal ({error}, HTTP bukan 2xx, koneksi putus) dilempar sebagai ApiError
  const handleSave = async () => {
    const title = form.title.trim();
    try {
      if (editing) await apiPost('update_changelog', { id: editing.id, ...form });
      else await apiPost('add_changelog', { ...form });
      show('success', editing ? `Changelog "${title}" berhasil diperbarui.` : `Changelog "${title}" berhasil ditambahkan.`);
      setModalOpen(false);
      fetchLogs();
    } catch (err) {
      show('error', 'Gagal menyimpan changelog.', errorMessage(err, 'Terjadi kesalahan. Coba lagi.'));
    }
  };

  // Dipanggil tombol "Ya, hapus" di dialog konfirmasi; dialog tetap terbuka bila gagal
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await apiPost('delete_changelog', { id: deleteConfirm.id });
      show('success', `Changelog "${deleteConfirm.title}" berhasil dihapus.`);
      setDeleteConfirm(null);
      fetchLogs();
    } catch (err) {
      show('error', 'Gagal menghapus changelog.', errorMessage(err, 'Terjadi kesalahan. Coba lagi.'));
    } finally {
      setDeleting(false);
    }
  };

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpand = (id: number) => {
    const s = new Set(expanded);
    if (s.has(id)) s.delete(id);
    else s.add(id);
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
  // Warna kategori → tone token adm-* (ikut tema otomatis)
  const catTone: Record<string, Tone> = {
    fitur: 'cobalt', perbaikan: 'danger', peningkatan: 'mint', keamanan: 'warning', lainnya: 'mist',
  };
  const catIcon: Record<string, LucideIcon> = {
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

  // Ikon kategori: tone 'mist' tidak ada di IconBox → pakai 'ghost'
  const catBoxTone = (cat: string) => {
    const t = catTone[cat] || 'mist';
    return t === 'mist' ? 'ghost' : t;
  };

  return (
    <div className="pb-20">
      {/* ── Header ── */}
      <PageHeader
        title="Changelog"
        description="Catat riwayat perubahan platform Garuda Nexa di sini."
        actions={
          <Button icon={<Plus />} onClick={() => openAdd()}>
            Tambah
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        {/* ── LEFT: Calendar ── */}
        <Panel className="lg:col-span-1 lg:self-start">
          {/* Month nav */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <IconButton icon={<ChevronLeft />} label="Bulan sebelumnya" size="sm" variant="secondary" onClick={prevMonth} />
            <h3 className="text-[14px] font-semibold tabular-nums text-adm-fg sm:text-[15px]">
              {MONTHS_ID[calMonth]} {calYear}
            </h3>
            <IconButton icon={<ChevronRight />} label="Bulan berikutnya" size="sm" variant="secondary" onClick={nextMonth} />
          </div>
          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7">
            {DAYS_SHORT.map(d => (
              <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-subtle">{d}</div>
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
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    'relative h-10 rounded-lg text-[13px] font-medium tabular-nums transition-colors sm:h-9',
                    FOCUS_INSET,
                    active
                      ? 'bg-cobalt text-white'
                      : today
                        ? 'bg-adm-cobalt-soft text-adm-cobalt-fg ring-1 ring-inset ring-cobalt/30'
                        : 'text-adm-fg hover:bg-adm-hover',
                  )}
                >
                  {day}
                  {hasEntry && (
                    <span className={cn('absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full', active ? 'bg-white' : 'bg-cobalt')} />
                  )}
                </button>
              );
            })}
          </div>
          {/* Quick actions */}
          <div className="mt-4 space-y-2 border-t border-adm-line pt-4">
            <Button variant="ghost" size="sm" fullWidth onClick={goToday}>
              ← Hari ini
            </Button>
            {selectedDate && (
              <>
                <div className="rounded-lg bg-adm-ghost py-1.5 text-center text-xs font-medium text-adm-muted">
                  {fmtDateShort(selectedDate)}
                </div>
                <Button
                  variant="soft"
                  size="sm"
                  fullWidth
                  icon={<Plus />}
                  onClick={() => openAdd(selectedDate)}
                  className="bg-adm-cobalt-soft text-adm-cobalt-fg hover:bg-cobalt/20"
                >
                  Tambah di tanggal ini
                </Button>
              </>
            )}
            {selectedDate && (
              <Button variant="ghost" size="sm" fullWidth onClick={() => setSelectedDate(null)} className="text-adm-subtle">
                Hapus filter tanggal
              </Button>
            )}
          </div>
        </Panel>

        {/* ── RIGHT: Content ── */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {/* Filter bar */}
          <Panel padding="none" className="flex flex-col gap-3 p-3 xl:flex-row xl:items-center">
            <SearchInput
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Cari changelog..."
              controlSize="sm"
              wrapperClassName="w-full xl:max-w-xs"
            />
            <div className="min-w-0">
              <Tabs
                items={categories.map(cat => ({ value: cat, label: cat === 'all' ? 'Semua' : catLabel[cat] }))}
                value={filterCategory}
                onChange={setFilterCategory}
                size="sm"
                ariaLabel="Kategori"
              />
            </div>
          </Panel>

          {/* Loading */}
          {loading && <LoadingState label="Memuat..." />}

          {/* Empty */}
          {!loading && filteredLogs.length === 0 && (
            <EmptyState
              variant="card"
              icon={<History />}
              title={selectedDate ? 'Tidak ada changelog di tanggal ini' : 'Belum ada changelog'}
              action={
                <Button variant="secondary" size="sm" icon={<Plus />} onClick={() => openAdd(selectedDate || undefined)}>
                  {selectedDate ? 'Tambah di tanggal ini' : 'Tambah changelog pertama'}
                </Button>
              }
            />
          )}

          {/* ── Timeline ── */}
          {!loading && filteredLogs.length > 0 && (
            <div className="relative space-y-6">
              <div className="absolute bottom-0 left-[10px] top-0 w-[2px] rounded-full bg-adm-line sm:left-[22px]" aria-hidden />

              {dates.map(date => (
                <div key={date} id={`date-section-${date}`} className="scroll-mt-20">
                  {/* Date header */}
                  <div className="relative mb-3 pl-9 sm:pl-14">
                    <div className="absolute left-[2px] top-[1px] h-[18px] w-[18px] rounded-full border-[3px] border-adm-canvas bg-cobalt sm:left-[14px]" aria-hidden />
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-adm-muted">
                      <Calendar className="h-4 w-4 shrink-0 text-adm-subtle" strokeWidth={1.75} aria-hidden />
                      <span className="font-medium text-adm-fg">{fmtDate(date)}</span>
                      <span className="text-adm-subtle" aria-hidden>·</span>
                      <span className="text-xs tabular-nums text-adm-muted">{grouped[date].length} perubahan</span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="space-y-3">
                    {grouped[date].map(item => {
                      const Icon = catIcon[item.category] || Tag;
                      const isOpen = expanded.has(item.id);
                      return (
                        <div key={item.id} className="relative pl-9 sm:pl-14">
                          <div className="absolute left-[7px] top-[30px] h-2 w-2 rounded-full bg-adm-subtle ring-2 ring-adm-canvas sm:left-[19px] sm:top-[34px]" aria-hidden />

                          <Panel padding="none" className="overflow-hidden transition-colors duration-150 hover:ring-adm-line-strong">
                            <div className="flex items-center gap-2 p-3 transition-colors hover:bg-adm-hover/60 sm:gap-3 sm:p-4">
                              <button
                                type="button"
                                onClick={() => toggleExpand(item.id)}
                                aria-expanded={isOpen}
                                className={cn('flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left', FOCUS_INSET)}
                              >
                                <IconBox icon={<Icon />} tone={catBoxTone(item.category)} size="sm" className="max-sm:hidden" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-adm-fg">{item.title}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <Badge tone={catTone[item.category] || 'mist'} size="sm" dot={false} icon={<Icon />} className="sm:hidden">
                                      {catLabel[item.category] || item.category}
                                    </Badge>
                                    <Badge tone={catTone[item.category] || 'mist'} size="sm" dot={false} className="max-sm:hidden">
                                      {catLabel[item.category] || item.category}
                                    </Badge>
                                    <span className="inline-flex items-center gap-1 text-xs tabular-nums text-adm-muted">
                                      <Clock className="h-3.5 w-3.5 text-adm-subtle" strokeWidth={1.75} aria-hidden />
                                      {fmtTime(item.time)}
                                    </span>
                                  </div>
                                </div>
                              </button>
                              <div className="flex shrink-0 items-center gap-1">
                                <IconButton
                                  icon={<Edit2 />}
                                  label={`Edit ${item.title}`}
                                  size="sm"
                                  onClick={e => { e.stopPropagation(); openEdit(item); }}
                                />
                                <IconButton
                                  icon={<Trash2 />}
                                  label={`Hapus ${item.title}`}
                                  size="sm"
                                  variant="danger-ghost"
                                  onClick={e => { e.stopPropagation(); setDeleteConfirm(item); }}
                                />
                                <IconButton
                                  icon={<ChevronDown className={cn('transition-transform duration-200', isOpen && 'rotate-180')} />}
                                  label={isOpen ? 'Tutup detail' : 'Buka detail'}
                                  size="sm"
                                  aria-expanded={isOpen}
                                  onClick={() => toggleExpand(item.id)}
                                />
                              </div>
                            </div>

                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
                                    <div className={cn(
                                      'rounded-xl p-3 sm:p-4',
                                      item.category === 'perbaikan' ? 'bg-adm-danger-soft' : 'bg-adm-ghost',
                                    )}>
                                      <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-adm-muted sm:text-sm">
                                        {item.description || 'Tidak ada deskripsi'}
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </Panel>
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

      {/* ── Modal Add/Edit ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit changelog' : 'Tambah changelog'}
        icon={<History />}
        size="md"
        bodyClassName="space-y-4"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button icon={<Save />} onClick={handleSave} disabled={!form.title.trim()}>
              {editing ? 'Simpan' : 'Tambah'}
            </Button>
          </>
        }
      >
        {/* Title */}
        <Field label="Judul">
          <Input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Judul perubahan..."
          />
        </Field>

        {/* Description */}
        <Field label="Deskripsi">
          <Textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Deskripsi perubahan..."
            rows={4}
            className="resize-none"
          />
        </Field>

        {/* Category + Date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Kategori">
            <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {categories.filter(c => c !== 'all').map(c => (
                <option key={c} value={c}>{catLabel[c]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal">
            <Input
              type="date"
              value={form.change_date}
              onChange={e => setForm({ ...form, change_date: e.target.value })}
            />
          </Field>
        </div>

        {/* Time */}
        <Field label="Waktu">
          <Input
            type="time"
            value={form.time}
            onChange={e => setForm({ ...form, time: e.target.value })}
          />
        </Field>
      </Modal>

      {/* ── Delete Modal ── */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        onClose={() => (deleting ? undefined : setDeleteConfirm(null))}
        onConfirm={handleDelete}
        loading={deleting}
        tone="danger"
        icon={<AlertTriangle />}
        title="Hapus changelog?"
        description={
          <>
            Changelog <span className="font-semibold text-adm-fg">"{deleteConfirm?.title}"</span> akan dihapus. Tindakan ini tidak bisa dibatalkan.
          </>
        }
        confirmText="Ya, hapus"
        cancelText="Batal"
      />

      <Toast toast={toast} onClose={dismiss} />
    </div>
  );
};

export default Changelog;
