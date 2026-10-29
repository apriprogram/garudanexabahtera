import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileArchive, FolderOpen, ImageOff, Upload } from 'lucide-react';
import { Badge, Button, Modal, Notice, Segmented, Spinner, ThinProgress, cn, type Tone } from '../../../components/admin/ui';
import { apiGet } from '../../../lib/api';
import type { ToastTone } from '../template-orders/shared/hooks';
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_MAX_GALLERY,
  PROJECT_MAX_TOOLS,
  type PortfolioItem,
} from '../../../components/sections/projects/portfolio';
import { HERO_VIDEO_MAX_MB, formatFileSize, heroVideoLimitMb } from '../hero/heroMedia';
import { dropZoneClass } from '../hero/styles';
import { PROJECT_IMAGE_SOURCE_MAX_MB } from './portfolioMedia';
import {
  IMPORT_MANIFEST,
  ImportCancelled,
  folderFiles,
  importUploads,
  openImportBundle,
  planImport,
  uploadImportItem,
  type ImportBundle,
  type ImportFile,
  type ImportItem,
} from './portfolioImport';
import { readZip } from './zipReader';

type Stage = 'pick' | 'preview' | 'upload' | 'done';
/** Proyek di ZIP yang namanya sudah ada: tambah sebagai proyek baru, atau ganti proyek lama. */
type Mode = 'add' | 'replace';
type Row =
  | { status: 'waiting' | 'skipped' | 'cancelled' }
  | { status: 'uploading'; percent: number }
  | { status: 'done'; replaced: boolean }
  | { status: 'failed'; error: string };

const ZIP_ACCEPT = '.zip,application/zip,application/x-zip-compressed';
const EXAMPLE = `[
  {
    "title": "Web App Dashboard",
    "desc": "SAAS / FINANCE",
    "url": "https://contoh.com",
    "description": "Paragraf 1.\\n\\nParagraf 2.",
    "tools": ["React JS", "Laravel", "MySQL"],
    "image": "dashboard/cover.jpg",
    "gallery": ["dashboard/detail-1.jpg", "dashboard/detail-2.jpg"],
    "video": "dashboard/demo.webm"
  }
]`;

const message = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);
const isZip = (file: File) => /\.zip$/i.test(file.name) || /zip/i.test(file.type);

function badgeOf(item: ImportItem, row: Row | undefined, mode: Mode): { tone: Tone; label: string } {
  if (item.problems.length) return { tone: 'danger', label: 'Dilewati' };
  switch (row?.status) {
    case 'waiting':
      return { tone: 'mist', label: 'Menunggu' };
    case 'uploading':
      return { tone: 'cobalt', label: 'Mengunggah' };
    case 'done':
      return { tone: 'mint', label: row.replaced ? 'Mengganti proyek lama' : 'Masuk daftar' };
    case 'failed':
      return { tone: 'danger', label: 'Gagal' };
    case 'cancelled':
      return { tone: 'mist', label: 'Dihentikan' };
    default:
      if (item.existing < 0) return { tone: 'mint', label: 'Baru' };
      return mode === 'replace' ? { tone: 'warning', label: 'Ganti proyek lama' } : { tone: 'mist', label: 'Baru (nama sudah ada)' };
  }
}

/** Isi proyek sekilas: "3 gambar detail · video · 5 tools · tautan · 4 file (12,4 MB)". */
function details(item: ImportItem): string {
  const { count, bytes } = importUploads(item);
  return [
    item.gallery.length ? `${item.gallery.length} gambar detail` : '',
    item.video ? 'video' : '',
    item.tools.length ? `${item.tools.length} tools` : '',
    item.url ? 'tautan' : '',
    item.description ? 'deskripsi' : '',
    count ? `${count} file (${formatFileSize(bytes)})` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

interface PortfolioImportDialogProps {
  open: boolean;
  /** Daftar proyek saat ini, untuk mengenali nama yang sama (dibekukan saat ZIP dibuka). */
  existing: PortfolioItem[];
  onClose: () => void;
  /** Satu proyek selesai diunggah; replace = ganti proyek bernama sama (addImportedProject). */
  onImport: (item: PortfolioItem, replace: boolean) => void;
  /** Notifikasi halaman (toast di atas tengah layar): ringkasan hasil impor setelah semua proyek selesai diunggah. */
  notify?: (tone: ToastTone, message: string, description?: string) => void;
}

/**
 * Impor proyek di Pengaturan website > Proyek (permintaan pemilik 2026-10-25): pilih satu ZIP (atau folder) berisi
 * proyek.json + gambar/video, lihat daftar & masalah per proyek, pilih tambah / ganti proyek bernama sama, lalu media
 * diunggah satu per satu dan tiap proyek yang selesai langsung masuk daftar (portfolioImport.ts). Tampil di website
 * setelah "Simpan semua perubahan", sama seperti editor. Pasang `key` baru tiap kali dibuka.
 */
const PortfolioImportDialog: React.FC<PortfolioImportDialogProps> = ({ open, existing, onClose, onImport, notify }) => {
  const [stage, setStage] = useState<Stage>('pick');
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [source, setSource] = useState('');
  const [bundle, setBundle] = useState<ImportBundle | null>(null);
  // Daftar saat ZIP dibuka: proyek yang masuk selama impor tidak mengubah tanda "nama sudah ada"
  const [snapshot, setSnapshot] = useState<PortfolioItem[]>([]);
  const [maxMb, setMaxMb] = useState(HERO_VIDEO_MAX_MB);
  const [mode, setMode] = useState<Mode>('add');
  const [rows, setRows] = useState<Record<number, Row>>({});
  const [stopping, setStopping] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  // false setelah ditutup/dilepas: hasil yang terlambat diabaikan
  const aliveRef = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);
  const thumbUrls = useRef<string[]>([]);

  const items = useMemo(() => (bundle ? planImport(bundle, snapshot, maxMb) : []), [bundle, snapshot, maxMb]);
  const ready = items.filter((item) => !item.problems.length);
  const matches = ready.filter((item) => item.existing >= 0).length;

  useEffect(() => {
    aliveRef.current = true;
    const urls = thumbUrls.current;
    return () => {
      aliveRef.current = false;
      controllerRef.current?.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Batas video dari server (UPLOAD_MAX_VIDEO_MB, sama dengan editor), sekali saat dibuka
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    apiGet<{ video_max_mb?: unknown }>('get_hero_media_limits')
      .then((data) => {
        const mb = heroVideoLimitMb(data?.video_max_mb);
        if (active && mb !== null) setMaxMb(mb);
      })
      .catch(() => {
        // Tetap batas bawaan; server tetap menolak file yang terlalu besar
      });
    return () => {
      active = false;
    };
  }, [open]);

  const close = () => {
    aliveRef.current = false;
    controllerRef.current?.abort();
    onClose();
  };

  // Pratinjau gambar kartu dari isi ZIP/folder (path situs dipakai langsung saat tampil)
  const loadThumbs = (next: ImportBundle) => {
    if (typeof URL.createObjectURL !== 'function') return;
    for (const item of planImport(next, [], HERO_VIDEO_MAX_MB)) {
      const cover = item.image;
      if (!cover || !('file' in cover)) continue;
      cover.file
        .read()
        .then((blob) => {
          if (!aliveRef.current) return;
          const url = URL.createObjectURL(new Blob([blob], { type: cover.type }));
          thumbUrls.current.push(url);
          setThumbs((prev) => ({ ...prev, [cover.file.path]: url }));
        })
        .catch(() => {
          // Tanpa pratinjau; masalahnya muncul saat diunggah
        });
    }
  };

  const openFiles = async (name: string, load: () => Promise<ImportFile[]>) => {
    if (reading) return;
    setReading(true);
    setError(null);
    try {
      const next = await openImportBundle(await load());
      if (!aliveRef.current) return;
      thumbUrls.current.splice(0).forEach((url) => URL.revokeObjectURL(url));
      setThumbs({});
      setSource(name);
      setSnapshot(existing);
      setBundle(next);
      setRows({});
      setStage('preview');
      loadThumbs(next);
    } catch (failure) {
      if (aliveRef.current) setError(message(failure, 'File tidak bisa dibuka.'));
    } finally {
      if (aliveRef.current) setReading(false);
    }
  };

  const pickZip = (file: File | undefined) => {
    if (!file) return;
    if (!isZip(file)) {
      setError(`"${file.name}" bukan file ZIP. Pilih file .zip, atau pilih folder berisi ${IMPORT_MANIFEST}.`);
      return;
    }
    void openFiles(file.name, () => readZip(file));
  };

  const pickFolder = (files: File[]) => {
    if (!files.length) return;
    const folder = (files[0].webkitRelativePath || files[0].name).split('/')[0];
    void openFiles(folder, async () => folderFiles(files));
  };

  const setRow = (number: number, row: Row) => setRows((prev) => ({ ...prev, [number]: row }));

  // Satu proyek per satu: gagal → lanjut proyek berikutnya; dihentikan → sisanya tidak diimpor
  const run = async () => {
    if (!ready.length || controllerRef.current) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    const replacing = mode === 'replace';
    setStage('upload');
    setRows(Object.fromEntries(items.map((item) => [item.number, { status: item.problems.length ? 'skipped' : 'waiting' } as Row])));
    let importedCount = 0;
    let failedCount = 0;
    for (const item of ready) {
      if (controller.signal.aborted) break;
      setRow(item.number, { status: 'uploading', percent: 0 });
      try {
        const saved = await uploadImportItem(item, {
          signal: controller.signal,
          onProgress: (percent) => {
            if (aliveRef.current) setRow(item.number, { status: 'uploading', percent });
          },
        });
        // Ditutup: tidak ada yang masuk lagi. Dihentikan setelah semua file proyek ini terunggah: tetap masuk.
        if (!aliveRef.current) return;
        const replace = replacing && item.existing >= 0;
        onImport(saved, replace);
        setRow(item.number, { status: 'done', replaced: replace });
        importedCount += 1;
      } catch (failure) {
        if (!aliveRef.current) return;
        if (failure instanceof ImportCancelled || controller.signal.aborted) break;
        setRow(item.number, { status: 'failed', error: message(failure, 'Gagal mengunggah.') });
        failedCount += 1;
      }
    }
    if (!aliveRef.current) return;
    controllerRef.current = null;
    setRows((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([number, row]) => [number, row.status === 'waiting' || row.status === 'uploading' ? { status: 'cancelled' } : row]),
      ),
    );
    setStopping(false);
    setStage('done');
    // Ringkasan juga sebagai notifikasi halaman; rincian per proyek tetap di daftar. Dihentikan tanpa hasil: tanpa notifikasi.
    if (importedCount > 0 && failedCount === 0) {
      notify?.('success', `${importedCount} proyek berhasil diimpor.`, 'Klik Simpan semua perubahan agar tampil di website.');
    } else if (importedCount > 0) {
      notify?.(
        'warning',
        `${importedCount} proyek diimpor, ${failedCount} gagal.`,
        'Lihat alasannya di daftar impor. Klik Simpan semua perubahan agar proyek yang masuk tampil di website.',
      );
    } else if (failedCount > 0) {
      notify?.('error', 'Gagal mengimpor proyek.', 'Lihat alasannya di daftar impor, perbaiki ZIP-nya, lalu impor lagi.');
    }
  };

  const stop = () => {
    setStopping(true);
    controllerRef.current?.abort();
  };

  const reset = () => {
    setBundle(null);
    setError(null);
    setStage('pick');
  };

  const counts = Object.values(rows).reduce(
    (sum, row) => {
      if (row.status === 'done') sum[row.replaced ? 'replaced' : 'added'] += 1;
      else if (row.status === 'failed') sum.failed += 1;
      else if (row.status === 'cancelled') sum.cancelled += 1;
      return sum;
    },
    { added: 0, replaced: 0, failed: 0, cancelled: 0 },
  );
  const imported = counts.added + counts.replaced;
  const finished = imported + counts.failed;

  const footer =
    stage === 'pick' ? (
      <Button variant="secondary" onClick={close}>
        Batal
      </Button>
    ) : stage === 'preview' ? (
      <>
        <Button variant="secondary" onClick={reset}>
          Pilih file lain
        </Button>
        <Button icon={<Upload />} onClick={() => void run()} disabled={!ready.length}>
          {ready.length ? `Impor ${ready.length} proyek` : 'Tidak ada yang bisa diimpor'}
        </Button>
      </>
    ) : stage === 'upload' ? (
      <>
        <Button variant="secondary" onClick={stop} disabled={stopping}>
          {stopping ? 'Menghentikan...' : 'Hentikan'}
        </Button>
        <Button loading>Mengimpor...</Button>
      </>
    ) : (
      <Button onClick={close}>Selesai</Button>
    );

  return (
    <Modal
      open={open}
      onClose={close}
      title="Impor proyek"
      description={`Tambah banyak proyek sekaligus dari satu ZIP berisi ${IMPORT_MANIFEST} dan file gambar/video-nya.`}
      icon={<FileArchive />}
      size="lg"
      closeOnOverlay={stage !== 'upload'}
      bodyClassName="space-y-4"
      footer={footer}
    >
      {stage === 'pick' ? (
        <>
          <label
            onDragOver={(event) => {
              event.preventDefault();
              if (!reading) setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDropActive(false);
              if (!reading) pickZip(event.dataTransfer?.files?.[0]);
            }}
            className={dropZoneClass(dropActive, 'h-40 rounded-2xl px-4 text-center', reading)}
          >
            <input
              type="file"
              accept={ZIP_ACCEPT}
              className="sr-only"
              disabled={reading}
              aria-label="Pilih file ZIP proyek"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                pickZip(file);
              }}
            />
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-adm-ghost text-adm-muted transition-colors group-hover:bg-adm-cobalt-soft group-hover:text-adm-cobalt-fg">
              {reading ? <Spinner size="sm" /> : <FileArchive className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
            </span>
            <span className="text-sm font-medium text-adm-fg">{reading ? 'Membaca isi file...' : 'Pilih file ZIP atau seret ke sini'}</span>
            <span className="text-xs text-adm-muted">
              Berisi {IMPORT_MANIFEST} dan file gambar/video yang disebut di dalamnya.
            </span>
          </label>

          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-adm-muted">
            Tidak punya ZIP?
            <label className={cn('relative inline-flex cursor-pointer items-center gap-1 font-medium text-adm-cobalt-fg hover:underline', reading && 'pointer-events-none opacity-60')}>
              <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              Pilih folder
              <input
                type="file"
                multiple
                className="sr-only"
                disabled={reading}
                aria-label={`Pilih folder berisi ${IMPORT_MANIFEST}`}
                ref={(el) => el?.setAttribute('webkitdirectory', '')}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = '';
                  pickFolder(files);
                }}
              />
            </label>
            berisi {IMPORT_MANIFEST}.
          </p>

          {error && <Notice tone="danger">{error}</Notice>}

          <details className="group rounded-xl ring-1 ring-inset ring-adm-line">
            <summary className="cursor-pointer select-none px-4 py-3 text-[13px] font-medium text-adm-fg">Format {IMPORT_MANIFEST}</summary>
            <div className="space-y-3 border-t border-adm-line px-4 py-3 text-xs leading-relaxed text-adm-muted">
              <p>
                Daftar proyek dengan isian yang sama seperti editor. Wajib: <code>title</code> (nama), <code>desc</code> (tag /
                kategori), dan <code>image</code> (gambar kartu). Nama file ditulis relatif terhadap {IMPORT_MANIFEST}.
              </p>
              <pre className="overflow-x-auto rounded-lg bg-adm-ghost p-3 font-mono text-[11px] leading-relaxed text-adm-fg">{EXAMPLE}</pre>
              <p>
                Batas: {PROJECT_MAX_TOOLS} tools, deskripsi {PROJECT_DESCRIPTION_MAX.toLocaleString('id-ID')} karakter,{' '}
                {PROJECT_MAX_GALLERY} gambar detail. Gambar JPG, PNG, WEBP, atau GIF maks. {PROJECT_IMAGE_SOURCE_MAX_MB} MB (dikecilkan
                otomatis); video MP4 atau WebM maks. {maxMb} MB. Pakai nama file tanpa spasi/aksen, mis. <code>detail-1.jpg</code>.
              </p>
            </div>
          </details>
        </>
      ) : (
        <>
          {stage === 'preview' && (
            <p className="text-sm text-adm-fg">
              <span className="font-medium">{source}</span>: {items.length} proyek, {ready.length} siap diimpor
              {items.length > ready.length ? `, ${items.length - ready.length} dilewati karena bermasalah` : ''}.
            </p>
          )}

          {stage === 'preview' && matches > 0 && (
            <div className="space-y-2 rounded-xl bg-adm-ghost/60 p-3">
              <p className="text-[13px] font-medium text-adm-fg">{matches} proyek bernama sama dengan proyek yang sudah ada</p>
              <Segmented
                ariaLabel="Proyek bernama sama"
                size="sm"
                value={mode}
                onChange={setMode}
                items={[
                  { value: 'add', label: 'Tambah sebagai proyek baru' },
                  { value: 'replace', label: 'Ganti proyek bernama sama' },
                ]}
              />
              <p className="text-xs text-adm-muted">
                {mode === 'replace'
                  ? 'Proyek lama diganti seluruhnya (isian, gambar, dan video) dengan isi ZIP.'
                  : 'Proyek lama tetap ada; proyek dari ZIP ditambahkan di akhir daftar.'}
              </p>
            </div>
          )}

          {stage === 'upload' && (
            <p className="text-sm text-adm-fg" role="status">
              Mengimpor proyek {Math.min(finished + 1, ready.length)} dari {ready.length}. Gambar dikecilkan lalu diunggah satu per satu.
            </p>
          )}

          {stage === 'done' &&
            (imported > 0 ? (
              <Notice tone="mint" title={`${imported} proyek masuk daftar${counts.replaced ? ` (${counts.replaced} mengganti proyek lama)` : ''}.`}>
                Belum tampil di website: klik <strong>Simpan semua perubahan</strong> setelah menutup jendela ini.
                {counts.failed + counts.cancelled > 0 &&
                  ` ${[counts.failed ? `${counts.failed} gagal` : '', counts.cancelled ? `${counts.cancelled} dihentikan` : ''].filter(Boolean).join(', ')}; lihat daftar di bawah.`}
              </Notice>
            ) : (
              <Notice tone="danger" title="Tidak ada proyek yang diimpor.">
                Lihat alasannya di daftar di bawah, perbaiki ZIP-nya, lalu impor lagi.
              </Notice>
            ))}

          <ul className="divide-y divide-adm-line overflow-hidden rounded-xl ring-1 ring-inset ring-adm-line">
            {items.map((item) => {
              const row = rows[item.number];
              const badge = badgeOf(item, row, mode);
              const cover = item.image ? ('link' in item.image ? item.image.link : thumbs[item.image.file.path]) : undefined;
              const name = item.title || `Proyek #${item.number}`;
              return (
                <li key={item.number} className="flex gap-3 p-3 sm:gap-4">
                  <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg bg-adm-ghost sm:w-24">
                    {cover ? (
                      <img src={cover} alt={`Gambar kartu ${name}`} className="h-full w-full object-cover object-top" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-adm-subtle">
                        <ImageOff className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="min-w-0 break-words text-sm font-semibold text-adm-fg">{name}</p>
                      <Badge tone={badge.tone} size="sm">
                        {badge.label}
                      </Badge>
                    </div>
                    {item.desc && <p className="mt-0.5 break-words text-xs font-medium uppercase tracking-[0.04em] text-adm-cobalt-fg">{item.desc}</p>}
                    {details(item) && <p className="mt-0.5 text-xs text-adm-muted">{details(item)}</p>}
                    {item.problems.length > 0 && (
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-adm-danger-fg">
                        {item.problems.map((problem) => (
                          <li key={problem}>{problem}</li>
                        ))}
                      </ul>
                    )}
                    {item.notes.length > 0 && (
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-adm-warning-fg">
                        {item.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    )}
                    {row?.status === 'uploading' && (
                      <div className="mt-2 flex items-center gap-2">
                        <ThinProgress value={row.percent} label={`Mengunggah ${name}`} className="flex-1" />
                        <span className="text-xs tabular-nums text-adm-muted">{row.percent}%</span>
                      </div>
                    )}
                    {row?.status === 'failed' && <p className="mt-1.5 text-xs text-adm-danger-fg">{row.error}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Modal>
  );
};

export default PortfolioImportDialog;
