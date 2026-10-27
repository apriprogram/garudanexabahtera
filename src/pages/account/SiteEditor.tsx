// CMS landing page pembeli (/akun/situs/:siteId), dirender di dalam AccountLayout (penjaga login ada di sana).
// Kontrak: docs/platform/SPEC.md §6 (customer_get_site, customer_save_site_content) & §7 (format template).
// Kiri: daftar section (diciutkan, sakelar tampil) + field per tipe. Kanan: pratinjau langsung (Desktop/HP).
// Di HP pratinjau menjadi tab tersendiri.
// Selama ada perubahan belum disimpan, konten dicadangkan di localStorage (`cms-draft-{siteId}`) dan ditawarkan untuk
// dipulihkan saat editor dibuka lagi (mis. sesi habis di tengah mengedit, tab tertutup, atau keluar akun).
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarClock, ExternalLink, Globe, MessageCircle, Sparkles } from 'lucide-react';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { ApiError, apiGet, apiPost, errorMessage } from '../../lib/api';
import { formatTanggal, type Site } from '../../types/platform';
import { getTemplate, resolveContent } from '../../templates';
import type { ListItem, SiteContent } from '../../templates/types';
import { addonsPath, postsLocked } from './components/addons';
import { helpWhatsappUrl, siteHelpMessage } from './components/orderCopy';
import { SiteNav } from './components/SiteNav';
import { postsListPath } from './posts/siteLinks';
import { countNewImages, fieldDomId, readList, setEnabled, setList, setText } from './cms/content';
import { EditorToolbar, type MobileTab, type SaveState } from './cms/EditorToolbar';
import { EditorLoadError, EditorNotFound, EditorSkeleton, EditorUnknownTemplate } from './cms/EditorStates';
import { PreviewPane, type PreviewDevice } from './cms/PreviewPane';
import { SectionEditor } from './cms/SectionEditor';
import { Toast } from './cms/Toast';
import { useToast } from './cms/useToast';
import { Notice } from './cms/ui';
import { useLeaveGuard } from './cms/useLeaveGuard';
import { firstErrorPath, sectionOfPath, validateContent, type ContentErrors } from './cms/validation';

type LoadResult = { status: 'error'; message: string } | { status: 'not_found' } | { status: 'ready' };
type LoadState = { status: 'loading' } | LoadResult;

const LEAVE_MESSAGE = 'Perubahan yang belum disimpan akan hilang. Tetap tinggalkan halaman ini?';
/** Section daftar berita/pengumuman di konten template berfitur tulisan (dikelola juga di menu Berita & Pengumuman). */
const postKindOfSection = (key: string) => (key === 'news' ? 'berita' : key === 'announcements' ? 'pengumuman' : null);
/** Batas server: 30 gambar baru per simpan; badan request dibatasi ±40 MB (PHP) / 64 MB (Node). */
const MAX_NEW_IMAGES = 30;
const MAX_PAYLOAD_BYTES = 30 * 1024 * 1024;

const isDesktop = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1024px)').matches;

// ─── Cadangan perubahan (draf lokal) ──────────────────────────────────────────
// Hanya di browser ini; bisa kosong/gagal (mode privat, kuota penuh oleh gambar besar), jadi semua akses dibungkus
// try/catch dan editor tetap berjalan normal tanpa draf.
interface CmsDraft {
  content: SiteContent;
  /** Waktu (ms) draf terakhir ditulis */
  savedAt: number;
}

const DRAFT_DEBOUNCE_MS = 400;
/** Draf yang lebih tua dari ini dianggap basi dan dibuang. */
const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const draftKey = (siteId: number) => `cms-draft-${siteId}`;

const isDraft = (value: unknown): value is CmsDraft => {
  if (!value || typeof value !== 'object') return false;
  const { content, savedAt } = value as Partial<CmsDraft>;
  return typeof savedAt === 'number' && !!content && typeof content === 'object' && !Array.isArray(content);
};

function readDraft(siteId: number): CmsDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(siteId));
    if (!raw) return null;
    const draft: unknown = JSON.parse(raw);
    if (!isDraft(draft) || Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
      window.localStorage.removeItem(draftKey(siteId));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function writeDraft(siteId: number, content: SiteContent) {
  try {
    window.localStorage.setItem(draftKey(siteId), JSON.stringify({ content, savedAt: Date.now() } satisfies CmsDraft));
  } catch {
    // Kuota penuh (biasanya karena gambar baru): jangan tinggalkan draf lama yang sudah tidak sesuai
    clearDraft(siteId);
  }
}

function clearDraft(siteId: number) {
  try {
    window.localStorage.removeItem(draftKey(siteId));
  } catch {
    // penyimpanan tidak tersedia: tidak ada yang perlu dihapus
  }
}

export default function SiteEditor() {
  const { siteId: rawId } = useParams();
  const siteId = /^\d+$/.test(rawId ?? '') ? Number(rawId) : 0;

  // Hasil muat disimpan bersama kuncinya; kunci beda (situs lain / Coba lagi) = sedang memuat
  const [result, setResult] = useState<{ key: string; value: LoadResult } | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [content, setContent] = useState<SiteContent>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${siteId}:${reloadKey}`;
  const load: LoadState = !siteId ? { status: 'not_found' } : result?.key === requestKey ? result.value : { status: 'loading' };

  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const [tab, setTab] = useState<MobileTab>('edit');
  const [device, setDevice] = useState<PreviewDevice>(() => (isDesktop() ? 'desktop' : 'mobile'));
  const [toolbarHeight, setToolbarHeight] = useState(112);
  /** Draf lokal dari sesi sebelumnya yang belum dipulihkan/dibuang (selama ada, draf baru tidak ditulis) */
  const [draftOffer, setDraftOffer] = useState<CmsDraft | null>(null);

  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  const { settings } = useSiteSettings();
  const toolbarRef = useRef<HTMLDivElement>(null);

  const definition = useMemo(() => (site ? getTemplate(site.template_code) : undefined), [site]);
  const defaults = useMemo(() => (definition ? resolveContent(definition, null) : {}), [definition]);
  const readOnly = site?.status !== 'active';

  // ─── Muat situs ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    const key = `${siteId}:${reloadKey}`;
    apiGet<{ site: Site }>('customer_get_site', { site_id: siteId })
      .then(({ site: loaded }) => {
        if (cancelled) return;
        const def = getTemplate(loaded.template_code);
        const resolved = def ? resolveContent(def, loaded.content) : {};
        // Tawarkan draf lokal hanya bila berbeda dari konten di server (draf yang sama = sudah tersimpan)
        const draft = def && loaded.status === 'active' ? readDraft(loaded.id) : null;
        const offer = def && draft && JSON.stringify(resolveContent(def, draft.content)) !== JSON.stringify(resolved) ? draft : null;
        if (draft && !offer) clearDraft(loaded.id);
        setDraftOffer(offer);
        setSite(loaded);
        setContent(resolved);
        setDirty(false);
        setTouched(new Set());
        setShowAllErrors(false);
        setOpenSections(new Set(def?.sections[0] ? [def.sections[0].key] : []));
        setResult({ key, value: { status: 'ready' } });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const value: LoadResult =
          err instanceof ApiError && (err.status === 404 || err.status === 403)
            ? { status: 'not_found' }
            : { status: 'error', message: errorMessage(err, 'Situs gagal dimuat. Silakan coba lagi.') };
        setResult({ key, value });
      });
    return () => {
      cancelled = true;
    };
  }, [siteId, reloadKey]);

  useEffect(() => {
    const previous = document.title;
    document.title = 'Kelola konten situs | Garuda Nexa';
    return () => {
      document.title = previous;
    };
  }, []);

  useLeaveGuard(dirty && !readOnly, LEAVE_MESSAGE);

  // ─── Draf lokal ────────────────────────────────────────────────────────────
  // Ditulis (ditunda sebentar) selama ada perubahan belum disimpan. Tidak ditulis selama tawaran pulihkan masih tampil,
  // supaya draf lama tidak tertimpa sebelum pengguna memilih.
  const writeDraftNow = !!site && !readOnly && dirty && !draftOffer;
  const draftRef = useRef<{ siteId: number; content: SiteContent } | null>(null);
  useEffect(() => {
    draftRef.current = writeDraftNow && site ? { siteId: site.id, content } : null;
  });

  useEffect(() => {
    if (!writeDraftNow || !site) return;
    const timer = window.setTimeout(() => writeDraft(site.id, content), DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [writeDraftNow, site, content]);

  // Halaman ditutup/dimuat ulang/keluar akun sebelum jeda selesai: tulis draf terakhir sekarang juga
  useEffect(() => {
    const flush = () => {
      if (draftRef.current) writeDraft(draftRef.current.siteId, draftRef.current.content);
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const restoreDraft = () => {
    if (!draftOffer || !definition) return;
    setContent(resolveContent(definition, draftOffer.content));
    setDirty(true);
    setSaveError('');
    setTouched(new Set());
    setDraftOffer(null);
    showToast('info', 'Perubahan dipulihkan. Periksa lagi, lalu klik Simpan.');
  };

  const discardDraft = () => {
    if (site) clearDraft(site.id);
    setDraftOffer(null);
  };

  // Tinggi bilah atas (berubah di HP karena baris tab) → offset pratinjau lengket & scroll-margin section
  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const measure = () => setToolbarHeight(el.offsetHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [load.status, definition]);

  // ─── Validasi ──────────────────────────────────────────────────────────────
  const allErrors = useMemo(() => (definition ? validateContent(definition, content) : {}), [definition, content]);
  const visibleErrors = useMemo<ContentErrors>(() => {
    if (showAllErrors) return allErrors;
    return Object.fromEntries(Object.entries(allErrors).filter(([path]) => touched.has(path)));
  }, [allErrors, showAllErrors, touched]);

  const markTouched = useCallback((path: string) => {
    setTouched((prev) => (prev.has(path) ? prev : new Set(prev).add(path)));
  }, []);

  // Fokus ke field error pertama setelah section-nya terbuka
  useEffect(() => {
    if (!pendingFocus) return;
    const frame = requestAnimationFrame(() => {
      const el =
        document.getElementById(fieldDomId(pendingFocus)) ??
        document.querySelector<HTMLElement>(`[data-cms-section="${sectionOfPath(pendingFocus)}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (el && 'focus' in el) el.focus({ preventScroll: true });
      setPendingFocus(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingFocus]);

  // ─── Ubah konten ───────────────────────────────────────────────────────────
  const edit = useCallback((update: (prev: SiteContent) => SiteContent) => {
    setContent(update);
    setDirty(true);
    setSaveError('');
  }, []);

  const restoreListItem = useCallback(
    (section: string, key: string, item: ListItem, index: number) =>
      edit((prev) => {
        const items = [...readList(prev, section, key)];
        items.splice(Math.min(index, items.length), 0, item);
        return setList(prev, section, key, items);
      }),
    [edit],
  );

  const toggleSection = (key: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // ─── Simpan ────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!site || !definition || saving || readOnly) return;
    if (!dirty) {
      showToast('info', 'Belum ada perubahan untuk disimpan.');
      return;
    }

    const errors = validateContent(definition, content);
    const first = firstErrorPath(errors);
    if (first) {
      const count = Object.keys(errors).length;
      setShowAllErrors(true);
      setOpenSections((prev) => new Set(prev).add(sectionOfPath(first)));
      setTab('edit');
      setPendingFocus(first);
      showToast('danger', `Ada ${count} isian yang perlu diperbaiki sebelum disimpan.`);
      return;
    }

    const newImages = countNewImages(content);
    if (newImages > MAX_NEW_IMAGES) {
      showToast('danger', `Maksimal ${MAX_NEW_IMAGES} gambar baru dalam sekali simpan (sekarang ${newImages}). Hapus sebagian, simpan, lalu unggah sisanya.`);
      return;
    }
    const body = JSON.stringify(content);
    if (body.length > MAX_PAYLOAD_BYTES) {
      showToast('danger', 'Total gambar baru terlalu besar untuk disimpan sekaligus. Simpan sebagian gambar dulu, lalu lanjutkan.');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const res = await apiPost<{ site: Site }>('customer_save_site_content', { site_id: site.id, content });
      clearDraft(site.id);
      setDraftOffer(null);
      setSite(res.site);
      // Gambar baru (data-URI) sudah jadi path file di server; pakai konten dari server agar tidak diunggah ulang
      setContent(resolveContent(definition, res.site.content));
      setDirty(false);
      setShowAllErrors(false);
      setTouched(new Set());
      showToast('success', 'Perubahan berhasil disimpan. Situs Anda sudah diperbarui.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SITE_SUSPENDED') {
        setSite((prev) => (prev ? { ...prev, status: 'suspended' } : prev));
      }
      const message = errorMessage(err, 'Silakan coba lagi.');
      setSaveError(message);
      showToast('danger', `Gagal menyimpan: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/Cmd + S = Simpan
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const previewContent = useDeferredValue(content);

  // ─── Render ────────────────────────────────────────────────────────────────
  if (load.status === 'loading') return <EditorSkeleton />;
  if (load.status === 'not_found') return <EditorNotFound />;
  if (load.status === 'error') return <EditorLoadError message={load.message} onRetry={() => setReloadKey((k) => k + 1)} />;
  if (!site) return <EditorNotFound />;

  const backTo = site.order_number ? `/akun/pesanan/${encodeURIComponent(site.order_number)}` : '/akun';
  if (!definition)
    return <EditorUnknownTemplate code={site.template_code} backTo={backTo} helpHref={helpWhatsappUrl(settings, siteHelpMessage(site.domain))} />;

  const sitePath = `/situs/${site.id}`;
  const domainHref = `https://${site.domain}`;
  const hasPosts = definition.features?.posts === true;
  // Fitur Berita & Pengumuman belum dibeli: berita dari konten tampil sebagai berita biasa (SITE-ADDONS-SPEC §5)
  const postsIsLocked = hasPosts && postsLocked(site);
  const saveState: SaveState = readOnly ? 'readonly' : saving ? 'saving' : dirty ? 'dirty' : 'saved';
  const layoutVars = {
    '--cms-sticky-top': `calc(4rem + env(safe-area-inset-top) + ${toolbarHeight}px)`,
  } as CSSProperties;

  return (
    <div style={layoutVars} className="pb-10">
      <EditorToolbar
        ref={toolbarRef}
        backTo={backTo}
        backLabel="Kembali ke detail pesanan"
        title="Kelola konten situs"
        subtitle={`${site.template_name || definition.name} · ${site.domain}`}
        siteHref={sitePath}
        saveState={saveState}
        canSave={dirty && !saving && !readOnly}
        onSave={() => void save()}
        tab={tab}
        onTabChange={setTab}
      />

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
          {/* Panel kiri: info situs + section */}
          <div className={`space-y-3 ${tab === 'preview' ? 'max-lg:hidden' : ''}`}>
            {draftOffer && !readOnly && (
              <Notice
                tone="info"
                title="Pulihkan perubahan yang belum disimpan?"
                action={
                  <>
                    <button type="button" onClick={restoreDraft} className="btn btn-primary btn-sm">
                      Pulihkan
                    </button>
                    <button type="button" onClick={discardDraft} className="btn btn-outline btn-sm">
                      Buang
                    </button>
                  </>
                }
              >
                Ada perubahan dari {formatTanggal(new Date(draftOffer.savedAt).toISOString(), true)} yang belum sempat disimpan di
                perangkat ini.
              </Notice>
            )}
            {readOnly && (
              <Notice
                tone="warning"
                title="Situs sedang dinonaktifkan"
                action={
                  <a
                    href={helpWhatsappUrl(settings, siteHelpMessage(site.domain))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    Hubungi kami via WhatsApp
                    <span className="sr-only">(tab baru)</span>
                  </a>
                }
              >
                Situs ini dinonaktifkan sementara oleh admin, jadi kontennya hanya bisa dilihat dan belum bisa diubah. Hubungi kami untuk
                mengaktifkannya kembali.
              </Notice>
            )}
            {saveError && !readOnly && (
              <Notice
                tone="danger"
                title="Perubahan belum tersimpan"
                action={
                  <button type="button" onClick={() => void save()} disabled={saving} className="btn btn-outline btn-sm">
                    Coba simpan lagi
                  </button>
                }
              >
                {saveError}
              </Notice>
            )}
            {site.content === null && !dirty && !readOnly && (
              <Notice tone="info" title="Situs Anda masih memakai konten contoh">
                Ganti teks, gambar, dan kontak sesuai bisnis Anda, lalu klik Simpan. Perubahan langsung tampil di situs.
              </Notice>
            )}

            <SiteInfo site={site} domainHref={domainHref} sitePath={sitePath} />
            <SiteNav siteId={site.id} posts={hasPosts} postsLocked={postsIsLocked} />

            {definition.sections.map((section) => (
              <SectionEditor
                key={section.key}
                section={section}
                content={content}
                defaults={defaults}
                open={openSections.has(section.key)}
                onToggleOpen={() => toggleSection(section.key)}
                onActivate={() => setActiveSection(section.key)}
                onTextChange={(key, value) => edit((prev) => setText(prev, section.key, key, value))}
                onListChange={(key, items) => edit((prev) => setList(prev, section.key, key, items))}
                onListItemRemoved={(key, item, index) => {
                  const list = section.fields.find((f) => f.key === key);
                  const label = list && list.type === 'list' ? list.itemLabel.toLowerCase() : 'item';
                  showToast('info', `1 ${label} dihapus.`, { label: 'Urungkan', onClick: () => restoreListItem(section.key, key, item, index) });
                }}
                onEnabledChange={(enabled) => edit((prev) => setEnabled(prev, section.key, enabled))}
                errors={visibleErrors}
                onBlurPath={markTouched}
                readOnly={readOnly || saving}
                notice={hasPosts ? <PostsNotice siteId={site.id} sectionKey={section.key} locked={postsIsLocked} /> : undefined}
              />
            ))}

            {!readOnly && (
              <div className="flex flex-col gap-3 rounded-[24px] bg-surface p-4 ring-1 ring-inset ring-line sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <p className="text-sm text-muted">
                  {dirty ? 'Ada perubahan yang belum disimpan.' : 'Semua perubahan sudah tersimpan.'}{' '}
                  <span className="max-sm:hidden">Tekan Ctrl + S untuk menyimpan cepat.</span>
                </p>
                <button type="button" onClick={() => void save()} disabled={!dirty || saving} className="btn btn-primary">
                  {saving ? 'Menyimpan...' : 'Simpan perubahan'}
                </button>
              </div>
            )}
          </div>

          {/* Panel kanan: pratinjau (tab tersendiri di HP) */}
          <PreviewPane
            definition={definition}
            content={previewContent}
            device={device}
            onDeviceChange={setDevice}
            activeSection={activeSection}
            postsEnabled={hasPosts && site.addons?.posts === true}
            className={`h-[max(420px,calc(100dvh_-_var(--cms-sticky-top)_-_2rem))] lg:sticky lg:top-[calc(var(--cms-sticky-top)_+_1.5rem)] lg:h-[max(480px,calc(100dvh_-_var(--cms-sticky-top)_-_3rem))] ${
              tab === 'edit' ? 'max-lg:hidden' : ''
            }`}
          />
        </div>
      </div>

      <Toast toast={toast} onClose={dismissToast} />
    </div>
  );
}

/**
 * Section berita/pengumuman template sekolah: tulisan lengkap dikelola di menu Berita & Pengumuman. Fitur belum aktif
 * (`locked`): ajakan mengaktifkannya di menu Fitur tambahan, karena daftar di section ini tampil sebagai berita biasa.
 * Section lain: kosong.
 */
function PostsNotice({ siteId, sectionKey, locked }: { siteId: number; sectionKey: string; locked: boolean }) {
  const kind = postKindOfSection(sectionKey);
  if (!kind) return null;
  if (locked) {
    const label = kind === 'berita' ? 'Berita' : 'Pengumuman';
    return (
      <Notice
        tone="info"
        action={
          <Link to={addonsPath(siteId)} className="btn btn-outline btn-sm">
            <Sparkles className="h-4 w-4" aria-hidden />
            Aktifkan fitur Berita &amp; Pengumuman
          </Link>
        }
      >
        {label} di bawah ini tampil sebagai {kind} biasa. Aktifkan fitur Berita &amp; Pengumuman untuk halaman {kind} sendiri dan
        tampilan profesional.
      </Notice>
    );
  }
  return (
    <Notice
      tone="info"
      action={
        <Link to={postsListPath(siteId, kind)} className="btn btn-outline btn-sm">
          Buka Berita &amp; Pengumuman
        </Link>
      }
    >
      Kelola {kind} lengkap (foto, halaman sendiri, SEO, jumlah dilihat) di menu Berita &amp; Pengumuman. Bila sudah ada {kind} terbit,
      daftar di bawah ini tidak dipakai di situs.
    </Notice>
  );
}

function SiteInfo({ site, domainHref, sitePath }: { site: Site; domainHref: string; sitePath: string }) {
  const active = site.status === 'active';
  return (
    <div className="card-site p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-primary" aria-hidden>
          <Globe className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-fg">Situs Anda</p>
            <span
              className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${
                active ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'
              }`}
            >
              {active ? 'Aktif' : 'Dinonaktifkan'}
            </span>
          </div>
          <a
            href={domainHref}
            target="_blank"
            rel="noopener noreferrer"
            className="link-site mt-1 inline-flex max-w-full items-center gap-1.5 text-sm"
          >
            <span className="truncate">{site.domain}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </a>
          <p className="mt-1 text-xs leading-relaxed text-subtle">
            Situs menampilkan versi yang terakhir disimpan.
            {active && (
              <>
                {' '}
                Jika domain belum bisa dibuka (DNS masih diproses), pakai tautan sementara:{' '}
                <a href={sitePath} target="_blank" rel="noopener noreferrer" className="link-site">
                  Buka situs sementara
                  <span className="sr-only"> (tab baru)</span>
                </a>
              </>
            )}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-subtle">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Terakhir diperbarui {formatTanggal(site.updated_at, true)}
          </p>
        </div>
      </div>
    </div>
  );
}
