// Daftar artikel panduan di tab Panduan (Pengaturan website): dimuat dari database lewat admin_get_guides (semua status,
// terbaru dulu, jumlah dilihat per artikel dan untuk halaman /panduan). Tambah, edit, dan hapus tersimpan lewat
// tombolnya sendiri (admin_save_guide, admin_delete_guide), terpisah dari "Simpan semua perubahan" halaman ini.
import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Eye, Pencil, Plus, RotateCw, Trash2 } from 'lucide-react';
import { Button, Chip, ConfirmDialog, EmptyState, ErrorState, LoadingState, PanelHeader } from '../../../components/admin/ui';
import type { AdminGuide } from '../../../content/panduan/core';
import { ApiError, apiPost, errorMessage } from '../../../lib/api';
import { formatDateId } from '../../../seo/format';
import { GuideForm } from './GuideForm';
import { GuidePreview } from './GuidePreview';
import { LINKING_PAGES, formatCount, isLinkedSlug, normalizeGuide, relinkGuides } from './guideModel';

/** Toast halaman Pengaturan website (showNotify). */
export type GuidesNotify = (type: 'success' | 'error' | 'warning', message: string, description: string) => void;

type ListState =
  | { status: 'loading' }
  | { status: 'failed'; error: string }
  | { status: 'ready'; guides: AdminGuide[]; hubViews: number };

/** Semua artikel + jumlah dilihat halaman /panduan. Respons tanpa daftar = gagal muat (bukan "belum ada artikel"). */
async function fetchGuides(): Promise<{ guides: AdminGuide[]; hubViews: number }> {
  const data = await apiPost<{ guides?: unknown; hubViews?: unknown }>('admin_get_guides');
  if (!Array.isArray(data.guides)) throw new Error('Respons server tidak sesuai.');
  const guides = data.guides.map(normalizeGuide).filter((guide): guide is AdminGuide => guide !== null);
  const hubViews = Number(data.hubViews);
  return { guides, hubViews: Number.isFinite(hubViews) && hubViews > 0 ? Math.floor(hubViews) : 0 };
}

/** Tombol aksi per baris: teks ringkas (sm) tapi tinggi 40px, juga di HP. */
const ROW_ACTION = 'h-10 max-sm:h-10';

/** Pesan gagal yang ditampilkan: koneksi putus → kalimat baku panel admin, selain itu pesan server. */
const failureText = (error: unknown) =>
  error instanceof ApiError && error.status === 0 ? 'Tidak bisa terhubung ke server.' : errorMessage(error, 'kesalahan tidak diketahui');

/**
 * Artikel terbit ikut di-prerender saat deploy: setelah dihapus, dijadikan draf, atau slugnya diganti, HTML lamanya
 * masih dilayani (mesin pencari, pengunjung tanpa JavaScript) sampai deploy berikutnya.
 */
const untilNextDeploy = (what: string) => `${what} masih terlihat oleh mesin pencari dan pengunjung tanpa JavaScript sampai deploy berikutnya.`;

export function GuidesManager({ notify }: { notify: GuidesNotify }) {
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  // Form dipasang ulang (key baru) setiap kali dibuka; guide null = artikel baru. Data dipertahankan saat menutup
  // supaya animasi tutup tetap berisi.
  const [form, setForm] = useState<{ key: number; open: boolean; guide: AdminGuide | null }>({ key: 0, open: false, guide: null });
  const [preview, setPreview] = useState<{ open: boolean; guide: AdminGuide | null }>({ open: false, guide: null });
  const [removal, setRemoval] = useState<{ open: boolean; guide: AdminGuide | null }>({ open: false, guide: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchGuides().then(
      (data) => {
        if (alive) setList({ status: 'ready', ...data });
      },
      (error: unknown) => {
        if (alive) setList({ status: 'failed', error: failureText(error) });
      },
    );
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const reload = () => {
    setList({ status: 'loading' });
    setReloadKey((key) => key + 1);
  };

  const openForm = (guide: AdminGuide | null) => setForm((prev) => ({ key: prev.key + 1, open: true, guide }));
  const closeForm = () => setForm((prev) => ({ ...prev, open: false }));
  const closePreview = () => setPreview((prev) => ({ ...prev, open: false }));

  const handleSaved = (saved: AdminGuide | null, created: boolean) => {
    // Artikel sebelum diedit (null = artikel baru)
    const before = created ? null : form.guide;
    const wasPublished = Boolean(before?.reviewed);
    const renamedFrom = saved && before && before.slug !== saved.slug ? before.slug : null;
    closeForm();
    if (saved) {
      setList((prev) => {
        if (prev.status !== 'ready') return prev;
        // Slug berganti: `related` artikel lain ikut alamat baru (server menggantinya di transaksi yang sama)
        const others = renamedFrom ? relinkGuides(prev.guides, renamedFrom, saved.slug) : prev.guides;
        return { ...prev, guides: created ? [saved, ...others] : others.map((guide) => (guide.id === saved.id ? saved : guide)) };
      });
    } else {
      reload();
    }
    let description = 'Daftar artikel dimuat ulang.';
    if (saved?.reviewed) {
      description = `Terbit di /panduan/${saved.slug}.`;
      if (renamedFrom && wasPublished) description += ` ${untilNextDeploy(`Alamat lama /panduan/${renamedFrom}`)}`;
    } else if (saved) {
      description = wasPublished
        ? `Tersimpan sebagai draf, tidak lagi tampil di website. ${untilNextDeploy('Halaman lamanya')}`
        : 'Tersimpan sebagai draf, belum tampil di website.';
    }
    notify('success', created ? 'Artikel berhasil ditambahkan.' : 'Artikel berhasil diperbarui.', description);
  };

  const confirmDelete = async () => {
    const target = removal.guide;
    if (!target || deleting) return;
    setDeleting(true);
    try {
      await apiPost('admin_delete_guide', { id: target.id });
      // Slugnya juga dibuang dari `related` artikel lain (sama dengan server)
      setList((prev) =>
        prev.status === 'ready'
          ? { ...prev, guides: relinkGuides(prev.guides.filter((guide) => guide.id !== target.id), target.slug, null) }
          : prev,
      );
      notify(
        'success',
        'Artikel berhasil dihapus.',
        target.reviewed
          ? `“${target.title}” tidak lagi tampil di website. ${untilNextDeploy('Halaman lamanya')}`
          : `Draf “${target.title}” sudah dihapus.`,
      );
    } catch (error) {
      notify('error', 'Gagal menghapus artikel.', failureText(error));
    } finally {
      setDeleting(false);
      setRemoval((prev) => ({ ...prev, open: false }));
    }
  };

  const guides = list.status === 'ready' ? list.guides : [];

  return (
    <div>
      <PanelHeader
        title={list.status === 'ready' ? `Artikel (${guides.length})` : 'Artikel'}
        titleAs="h4"
        subtitle={
          <>
            Tulis, sunting, dan terbitkan artikel panduan. Jumlah dilihat dihitung sekali per sesi browser.
            {list.status === 'ready' && (
              <span className="mt-1 flex items-center gap-1.5 text-adm-fg">
                <Eye className="h-3.5 w-3.5 shrink-0 text-adm-subtle" strokeWidth={1.75} aria-hidden />
                <span>
                  Halaman /panduan dilihat <span className="font-medium tabular-nums">{formatCount(list.hubViews)}</span> kali
                </span>
              </span>
            )}
          </>
        }
        action={
          <Button icon={<Plus />} onClick={() => openForm(null)} disabled={list.status !== 'ready'}>
            Tambah artikel
          </Button>
        }
      />

      {list.status === 'loading' && <LoadingState label="Memuat artikel..." className="rounded-2xl ring-1 ring-inset ring-adm-line" />}

      {list.status === 'failed' && (
        <div className="flex flex-col items-center rounded-2xl pb-8 ring-1 ring-inset ring-adm-line">
          <ErrorState title="Gagal memuat artikel" error={list.error} className="pb-5" />
          <Button variant="secondary" icon={<RotateCw />} onClick={reload}>
            Coba lagi
          </Button>
        </div>
      )}

      {list.status === 'ready' && guides.length === 0 && (
        <EmptyState
          variant="dashed"
          icon={<BookOpen />}
          title="Belum ada artikel"
          description="Tambah artikel panduan pertamamu. Simpan sebagai draf dulu, lalu terbitkan setelah isinya dicek."
        />
      )}

      {guides.length > 0 && (
        <ul className="divide-y divide-adm-line overflow-hidden rounded-2xl ring-1 ring-inset ring-adm-line">
          {guides.map((guide) => {
            const published = Boolean(guide.reviewed);
            return (
              <li key={guide.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-adm-fg">{guide.title}</p>
                  <p className="mt-0.5 break-words text-xs text-adm-muted">
                    {guide.author} · Diperbarui {formatDateId(guide.dateModified)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <Chip className={published ? 'bg-adm-mint-soft text-adm-mint-fg' : undefined}>{published ? 'Terbit' : 'Draf'}</Chip>
                    <span className="inline-flex items-center gap-1 text-xs tabular-nums text-adm-muted">
                      <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                      {formatCount(guide.views)} dilihat
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                  {published ? (
                    <Button
                      href={`/panduan/${guide.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="secondary"
                      size="sm"
                      iconRight={<ExternalLink />}
                      className={ROW_ACTION}
                      aria-label={`Lihat ${guide.title} (tab baru)`}
                    >
                      Lihat
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Eye />}
                      className={ROW_ACTION}
                      aria-label={`Lihat pratinjau ${guide.title}`}
                      onClick={() => setPreview({ open: true, guide })}
                    >
                      Lihat
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Pencil />}
                    className={ROW_ACTION}
                    aria-label={`Edit ${guide.title}`}
                    onClick={() => openForm(guide)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger-soft"
                    size="sm"
                    icon={<Trash2 />}
                    className={ROW_ACTION}
                    aria-label={`Hapus ${guide.title}`}
                    onClick={() => setRemoval({ open: true, guide })}
                  >
                    Hapus
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <GuideForm key={form.key} open={form.open} guide={form.guide} guides={guides} onClose={closeForm} onSaved={handleSaved} />

      <GuidePreview
        open={preview.open}
        article={preview.guide && { ...preview.guide, published: Boolean(preview.guide.reviewed) }}
        onClose={closePreview}
        onEdit={() => {
          const target = preview.guide;
          closePreview();
          if (target) openForm(target);
        }}
      />

      <ConfirmDialog
        open={removal.open}
        onClose={() => setRemoval((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmDelete}
        tone="danger"
        loading={deleting}
        title="Hapus artikel?"
        description={
          removal.guide && (
            <>
              Artikel <strong className="font-semibold text-adm-fg">“{removal.guide.title}”</strong> akan dihapus dari panel dan
              website. Tindakan ini tidak bisa dibatalkan.
              {isLinkedSlug(removal.guide.slug) && (
                <span className="mt-2 block text-adm-warning-fg">
                  Alamat <span className="break-all font-mono">/panduan/{removal.guide.slug}</span> ditautkan dari {LINKING_PAGES}.
                  Setelah dihapus, halaman-halaman itu kehilangan tautan ke artikel ini.
                </span>
              )}
            </>
          )
        }
      />
    </div>
  );
}

export default GuidesManager;
