import React, { useEffect, useId, useRef, useState } from 'react';
import { Briefcase, ChevronLeft, ChevronRight, Film, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { Button, Chip, Field, Input, Modal, Spinner, Textarea, ThinProgress, cn } from '../../../components/admin/ui';
import { apiGet } from '../../../lib/api';
import { getToken } from '../../../lib/auth';
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_MAX_GALLERY,
  projectGallery,
  projectTools,
  projectUrl,
  type PortfolioItem,
} from '../../../components/sections/projects/portfolio';
import { HERO_VIDEO_MAX_MB, UPLOAD_SESSION_ERROR, formatFileSize, heroVideoLimitMb, validateHeroVideoFile } from '../hero/heroMedia';
import { HeroUploadError, uploadHeroVideo, type HeroVideoUpload } from '../hero/heroVideo';
import { dropZoneClass } from '../hero/styles';
import ToolsField from './ToolsField';
import { PROJECT_IMAGE_SOURCE_MAX_MB, PROJECT_VIDEO_UPLOAD_URL, cleanPortfolioItem, uploadProjectImage } from './portfolioMedia';

type FieldKey = 'title' | 'desc' | 'url' | 'image' | 'gallery' | 'video';
/** Gambar detail; src null = sedang diunggah. */
interface GalleryEntry {
  key: string;
  src: string | null;
  name: string;
}
type Move = { key: string; dir: 'left' | 'right' };

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const VIDEO_ACCEPT = 'video/mp4,video/webm';

let entrySeq = 0;
const entryKey = () => `g${(entrySeq += 1)}`;

const message = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

/* Tombol kecil di atas gambar (geser, hapus): tampil saat hover/fokus di perangkat ber-mouse, selalu di layar sentuh. */
const tileButton = (danger = false) =>
  cn(
    'adm-keep-white relative flex h-7 w-7 items-center justify-center rounded-lg text-white transition-colors max-sm:after:absolute max-sm:after:-inset-1.5',
    'disabled:cursor-not-allowed disabled:opacity-40',
    danger ? 'bg-danger hover:bg-danger-700' : 'bg-black/60 hover:bg-black/75',
  );

interface PortfolioEditorProps {
  open: boolean;
  /** Proyek yang diedit; null = tambah baru. Isian lain di entri (mis. `span`) ikut tersimpan apa adanya. */
  item: PortfolioItem | null;
  onClose: () => void;
  onSave: (item: PortfolioItem) => void;
}

/**
 * Editor satu proyek di Pengaturan website > Proyek (permintaan pemilik 2026-10-24): nama, tag / kategori, tautan situs,
 * deskripsi, tools, gambar kartu (mockup), gambar detail (tambah banyak, hapus, geser urutan), dan video. Gambar & video
 * langsung diunggah saat dipilih (portfolioMedia.ts); "Simpan proyek" hanya memasukkan proyek ke daftar, yang baru tampil
 * di website setelah "Simpan semua perubahan". Pasang `key` baru tiap kali dibuka supaya isiannya mulai dari `item`.
 */
const PortfolioEditor: React.FC<PortfolioEditorProps> = ({ open, item, onClose, onSave }) => {
  const id = useId();
  const [title, setTitle] = useState(item?.title ?? '');
  const [desc, setDesc] = useState(item?.desc ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [tools, setTools] = useState<string[]>(() => projectTools(item?.tools));
  const [image, setImage] = useState(item?.image ?? '');
  const [gallery, setGallery] = useState<GalleryEntry[]>(() =>
    projectGallery(item?.gallery).map((src) => ({ key: entryKey(), src, name: '' })),
  );
  const [video, setVideo] = useState(item?.video ?? '');
  const [coverBusy, setCoverBusy] = useState(false);
  const [videoUpload, setVideoUpload] = useState<{ name: string; size: number; percent: number } | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [maxMb, setMaxMb] = useState(HERO_VIDEO_MAX_MB);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<'cover' | 'gallery' | 'video' | null>(null);
  // false setelah ditutup/dilepas: hasil unggahan yang terlambat diabaikan
  const aliveRef = useRef(true);
  const videoJobRef = useRef<HeroVideoUpload | null>(null);
  const moveButtons = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<Move | null>(null);

  const galleryUploading = gallery.some((entry) => !entry.src);
  const busy = coverBusy || galleryUploading || videoUpload !== null;
  const fid = (name: string) => `${id}-${name}`;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      videoJobRef.current?.abort();
    };
  }, []);

  // Batas video dari server (UPLOAD_MAX_VIDEO_MB, sama dengan video hero), sekali saat editor dibuka
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

  // Setelah gambar digeser lewat tombol, fokus tetap di tombol arah yang sama (atau arah lain bila sudah di ujung)
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const same = moveButtons.current.get(`${target.key}:${target.dir}`);
    const other = moveButtons.current.get(`${target.key}:${target.dir === 'left' ? 'right' : 'left'}`);
    (same && !same.disabled ? same : other)?.focus();
  });

  const setError = (key: FieldKey, text: string | null) =>
    setErrors((prev) => {
      const next = { ...prev };
      if (text) next[key] = text;
      else delete next[key];
      return next;
    });

  const close = () => {
    aliveRef.current = false;
    videoJobRef.current?.abort();
    onClose();
  };

  const uploadCover = async (file: File | undefined) => {
    if (!file || coverBusy) return;
    setError('image', null);
    setCoverBusy(true);
    try {
      const src = await uploadProjectImage(file, 'cover');
      if (aliveRef.current) setImage(src);
    } catch (error) {
      if (aliveRef.current) setError('image', message(error, 'Gagal mengunggah gambar.'));
    } finally {
      if (aliveRef.current) setCoverBusy(false);
    }
  };

  // Satu per satu, supaya server tidak menerima banyak gambar besar sekaligus; tambah lagi baru bisa setelah selesai
  const uploadGallery = async (files: File[]) => {
    if (!files.length || galleryUploading) return;
    const room = PROJECT_MAX_GALLERY - gallery.length;
    const accepted = files.slice(0, Math.max(0, room));
    const notes: string[] = [];
    if (accepted.length < files.length) {
      notes.push(
        accepted.length > 0
          ? `Maksimal ${PROJECT_MAX_GALLERY} gambar, jadi ${files.length - accepted.length} file terakhir tidak ditambahkan.`
          : `Maksimal ${PROJECT_MAX_GALLERY} gambar. Hapus salah satu dulu.`,
      );
    }
    setError('gallery', notes.join(' ') || null);
    const entries = accepted.map((file) => ({ key: entryKey(), src: null, name: file.name }));
    setGallery((prev) => [...prev, ...entries]);
    for (const [index, file] of accepted.entries()) {
      const { key } = entries[index];
      try {
        const src = await uploadProjectImage(file, 'gallery');
        if (!aliveRef.current) return;
        setGallery((prev) => prev.map((entry) => (entry.key === key ? { ...entry, src } : entry)));
      } catch (error) {
        if (!aliveRef.current) return;
        setGallery((prev) => prev.filter((entry) => entry.key !== key));
        notes.push(message(error, `"${file.name}" gagal diunggah.`));
        setError('gallery', notes.join(' '));
      }
    }
  };

  const moveImage = (from: number, to: number) =>
    setGallery((prev) => {
      if (from === to || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [entry] = next.splice(from, 1);
      next.splice(to, 0, entry);
      return next;
    });

  const startVideo = async (file: File | undefined) => {
    if (!file || videoJobRef.current) return;
    const invalid = validateHeroVideoFile(file, maxMb);
    if (invalid) {
      setError('video', invalid);
      return;
    }
    const token = getToken();
    if (!token) {
      setError('video', UPLOAD_SESSION_ERROR);
      return;
    }
    setError('video', null);
    setVideoUpload({ name: file.name, size: file.size, percent: 0 });
    const job = uploadHeroVideo(file, {
      token,
      url: PROJECT_VIDEO_UPLOAD_URL,
      onProgress: (percent) => {
        if (aliveRef.current) setVideoUpload((prev) => (prev ? { ...prev, percent } : prev));
      },
    });
    videoJobRef.current = job;
    try {
      const src = await job.promise;
      if (aliveRef.current) setVideo(src);
    } catch (error) {
      if (aliveRef.current && !(error instanceof HeroUploadError && error.aborted)) setError('video', message(error, 'Gagal mengunggah video.'));
    } finally {
      videoJobRef.current = null;
      if (aliveRef.current) setVideoUpload(null);
    }
  };

  const save = () => {
    if (busy) return;
    const cleanUrl = url.trim() ? projectUrl(url) : '';
    const next: Partial<Record<FieldKey, string>> = {};
    if (!title.trim()) next.title = 'Nama proyek wajib diisi.';
    if (!desc.trim()) next.desc = 'Tag / kategori wajib diisi.';
    if (url.trim() && !cleanUrl) next.url = 'Isi alamat situs, mis. https://contoh.com atau contoh.com.';
    if (!image) next.image = 'Gambar kartu wajib: proyek tanpa gambar tidak tampil di website.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave(
      cleanPortfolioItem({
        ...item,
        title: title.trim(),
        desc: desc.trim(),
        image,
        description,
        tools,
        url: cleanUrl,
        gallery: gallery.flatMap((entry) => (entry.src ? [entry.src] : [])),
        video,
      }),
    );
  };

  // Seret-lepas file dari komputer ke kotak unggah (bukan saat menggeser urutan gambar detail)
  const fileDragOver = (event: React.DragEvent, target: 'cover' | 'gallery' | 'video', disabled: boolean) => {
    if (dragIndex !== null) return;
    event.preventDefault();
    if (!disabled) setDropTarget(target);
  };
  /** File yang dilepas, atau null bila bukan seret file / kotaknya nonaktif. */
  const droppedFiles = (event: React.DragEvent, disabled: boolean): File[] | null => {
    if (dragIndex !== null) return null;
    event.preventDefault();
    setDropTarget(null);
    return disabled ? null : Array.from(event.dataTransfer?.files ?? []);
  };

  const doneCount = gallery.filter((entry) => entry.src).length;

  return (
    <Modal
      open={open}
      onClose={close}
      title={item ? 'Edit portofolio' : 'Tambah portofolio'}
      description="Tampil sebagai kartu di section Projects beranda; detailnya muncul saat kartu diklik."
      icon={<Briefcase />}
      size="lg"
      bodyClassName="space-y-5"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Batal
          </Button>
          <Button onClick={save} disabled={busy} loading={busy}>
            {busy ? 'Menunggu unggahan...' : 'Simpan proyek'}
          </Button>
        </>
      }
    >
      <Field label="Nama proyek" htmlFor={fid('title')} required error={errors.title}>
        <Input
          id={fid('title')}
          value={title}
          invalid={Boolean(errors.title)}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="mis. Web App Dashboard"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tag / kategori" htmlFor={fid('desc')} required error={errors.desc} hint="Teks kecil di bawah judul kartu, juga chip kategori.">
          <Input
            id={fid('desc')}
            value={desc}
            invalid={Boolean(errors.desc)}
            onChange={(event) => setDesc(event.target.value)}
            placeholder="mis. SAAS / FINANCE"
          />
        </Field>
        <Field
          label="Tautan situs"
          htmlFor={fid('url')}
          optional
          error={errors.url}
          hint='Tombol "Kunjungi Situs" di detail proyek. Kosongkan bila situsnya belum bisa dibuka publik.'
        >
          <Input
            id={fid('url')}
            type="url"
            inputMode="url"
            autoComplete="url"
            value={url}
            invalid={Boolean(errors.url)}
            onChange={(event) => setUrl(event.target.value)}
            onBlur={() => {
              const clean = projectUrl(url);
              if (clean) setUrl(clean);
            }}
            placeholder="mis. https://contoh.com"
          />
        </Field>
      </div>

      <Field
        label="Deskripsi proyek"
        htmlFor={fid('description')}
        optional
        labelAction={
          <span className="text-xs tabular-nums text-adm-subtle">
            {description.length}/{PROJECT_DESCRIPTION_MAX}
          </span>
        }
        hint="Penjelasan di detail proyek: masalah klien, solusi, dan hasilnya. Baris baru dipertahankan."
      >
        <Textarea
          id={fid('description')}
          value={description}
          maxLength={PROJECT_DESCRIPTION_MAX}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="mis. Dashboard keuangan untuk memantau arus kas harian, dengan laporan otomatis tiap bulan."
          className="min-h-[112px] resize-y"
        />
      </Field>

      <Field
        label="Tools / teknologi"
        htmlFor={fid('tools')}
        optional
        labelAction={<Chip className="tabular-nums">{tools.length}/12</Chip>}
        hint="Tampil sebagai chip di detail proyek. Ketik lalu tekan Enter, atau pilih dari saran."
      >
        <ToolsField id={fid('tools')} tools={tools} onChange={setTools} />
      </Field>

      <Field label="Gambar kartu (mockup)" required error={errors.image}>
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,17rem)_1fr] sm:gap-4">
          <label
            onDragOver={(event) => fileDragOver(event, 'cover', coverBusy)}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(event) => {
              const files = droppedFiles(event, coverBusy);
              if (files) void uploadCover(files[0]);
            }}
            className={dropZoneClass(dropTarget === 'cover', 'relative aspect-[4/3] w-full overflow-hidden rounded-xl', coverBusy)}
          >
            {image ? (
              <>
                <img src={image} alt="Gambar kartu proyek" className="absolute inset-0 h-full w-full object-cover object-top" />
                <span className="adm-keep-white absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <Upload className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  <span className="text-xs font-medium">Ganti gambar kartu</span>
                </span>
              </>
            ) : (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-adm-ghost text-adm-muted transition-colors group-hover:bg-adm-cobalt-soft group-hover:text-adm-cobalt-fg">
                  <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="text-xs font-medium text-adm-muted">Tambah gambar kartu</span>
              </>
            )}
            {coverBusy && (
              <span className="absolute inset-0 flex items-center justify-center bg-adm-surface/75">
                <Spinner label="Mengunggah gambar kartu" />
              </span>
            )}
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              className="sr-only"
              disabled={coverBusy}
              aria-label={image ? 'Ganti gambar kartu' : 'Tambah gambar kartu'}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                void uploadCover(file);
              }}
            />
          </label>
          <p className="text-xs leading-relaxed text-adm-muted">
            Tampil di kartu Projects beranda dan kartu proyek Nexa. Pakai mockup atau tangkapan layar rasio 4:3 (mis. 1600 × 1200
            px); bagian atas gambar yang terlihat. JPG, PNG, WEBP, atau GIF, maks. {PROJECT_IMAGE_SOURCE_MAX_MB} MB, dikecilkan
            otomatis sebelum diunggah.
          </p>
        </div>
      </Field>

      <Field
        label="Gambar detail"
        optional
        error={errors.gallery}
        labelAction={
          <Chip className="tabular-nums">
            {doneCount}/{PROJECT_MAX_GALLERY} gambar
          </Chip>
        }
        hint="Tampil bertumpuk di detail proyek, berurutan dari atas. Seret atau pakai tombol panah untuk mengubah urutan. Kosong = detail memakai gambar kartu."
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {gallery.map((entry, index) => (
            <li
              key={entry.key}
              className={cn(
                'group relative aspect-[4/3] overflow-hidden rounded-xl bg-adm-ghost ring-1 ring-inset ring-adm-line transition-opacity',
                entry.src && 'cursor-move',
                dragIndex === index && 'opacity-30',
              )}
              draggable={Boolean(entry.src)}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(event) => {
                if (dragIndex !== null) event.preventDefault();
              }}
              onDrop={(event) => {
                if (dragIndex === null) return;
                event.preventDefault();
                moveImage(dragIndex, index);
                setDragIndex(null);
              }}
            >
              {entry.src ? (
                <img src={entry.src} alt={`Gambar detail ${index + 1}`} className="h-full w-full object-cover object-top" draggable={false} />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
                  <Spinner size="sm" />
                  <span className="w-full truncate text-[11px] text-adm-muted">Mengunggah {entry.name}…</span>
                </div>
              )}
              <span className="adm-keep-white absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                #{index + 1}
              </span>
              <div className="absolute right-1.5 top-1.5 flex gap-1 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0">
                {(['left', 'right'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    ref={(el) => {
                      const refKey = `${entry.key}:${dir}`;
                      if (el) moveButtons.current.set(refKey, el);
                      else moveButtons.current.delete(refKey);
                    }}
                    disabled={dir === 'left' ? index === 0 : index === gallery.length - 1}
                    onClick={() => {
                      pendingFocus.current = { key: entry.key, dir };
                      moveImage(index, dir === 'left' ? index - 1 : index + 1);
                    }}
                    aria-label={`Geser gambar ${index + 1} ke ${dir === 'left' ? 'kiri' : 'kanan'}`}
                    className={tileButton()}
                  >
                    {dir === 'left' ? <ChevronLeft className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setGallery((prev) => prev.filter((other) => other.key !== entry.key))}
                  aria-label={`Hapus gambar ${index + 1}`}
                  className={tileButton(true)}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </button>
              </div>
            </li>
          ))}
          {gallery.length < PROJECT_MAX_GALLERY && (
            <li>
              <label
                onDragOver={(event) => fileDragOver(event, 'gallery', galleryUploading)}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(event) => {
                  const files = droppedFiles(event, galleryUploading);
                  if (files) void uploadGallery(files);
                }}
                aria-disabled={galleryUploading || undefined}
                className={dropZoneClass(dropTarget === 'gallery', 'aspect-[4/3] rounded-xl', galleryUploading)}
              >
                <input
                  type="file"
                  multiple
                  accept={IMAGE_ACCEPT}
                  className="sr-only"
                  disabled={galleryUploading}
                  aria-label="Tambah gambar detail"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = '';
                    void uploadGallery(files);
                  }}
                />
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-adm-ghost text-adm-muted transition-colors group-hover:bg-adm-cobalt-soft group-hover:text-adm-cobalt-fg">
                  {galleryUploading ? <Spinner size="sm" /> : <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />}
                </span>
                <span className="text-xs font-medium text-adm-muted">{galleryUploading ? 'Mengunggah...' : 'Tambah gambar'}</span>
              </label>
            </li>
          )}
        </ul>
      </Field>

      <Field
        label="Video"
        optional
        error={errors.video}
        hint={`MP4 atau WebM, maks. ${maxMb} MB. Tampil di bawah gambar detail dengan tombol putar.`}
      >
        {videoUpload ? (
          <div className="space-y-2.5 rounded-xl px-4 py-3.5 ring-1 ring-inset ring-adm-line">
            <div className="flex items-center gap-3">
              <Film className="h-5 w-5 shrink-0 text-adm-subtle" strokeWidth={1.75} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-adm-fg">{videoUpload.name}</p>
                <p className="text-xs tabular-nums text-adm-muted">
                  {formatFileSize(videoUpload.size)} · {videoUpload.percent}%
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => videoJobRef.current?.abort()}>
                Batalkan
              </Button>
            </div>
            <ThinProgress value={videoUpload.percent} label={`Mengunggah ${videoUpload.name}`} />
          </div>
        ) : video ? (
          <div className="space-y-3">
            <video src={video} controls preload="metadata" className="aspect-video w-full rounded-xl bg-black object-contain" aria-label="Pratinjau video proyek" />
            <div className="flex flex-wrap gap-2">
              <label className={cn('relative inline-flex cursor-pointer', 'focus-within:rounded-xl focus-within:ring-2 focus-within:ring-cobalt')}>
                <input
                  type="file"
                  accept={VIDEO_ACCEPT}
                  className="sr-only"
                  aria-label="Ganti video"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    void startVideo(file);
                  }}
                />
                <span className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-adm-fg ring-1 ring-inset ring-adm-line transition-colors hover:bg-adm-hover">
                  <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  Ganti video
                </span>
              </label>
              <Button variant="danger-soft" size="sm" icon={<Trash2 />} onClick={() => setVideo('')}>
                Hapus video
              </Button>
            </div>
          </div>
        ) : (
          <label
            onDragOver={(event) => fileDragOver(event, 'video', false)}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(event) => {
              const files = droppedFiles(event, false);
              if (files) void startVideo(files[0]);
            }}
            className={dropZoneClass(dropTarget === 'video', 'h-28 rounded-xl px-4 text-center')}
          >
            <input
              type="file"
              accept={VIDEO_ACCEPT}
              className="sr-only"
              aria-label="Tambah video"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                void startVideo(file);
              }}
            />
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-adm-ghost text-adm-muted transition-colors group-hover:bg-adm-cobalt-soft group-hover:text-adm-cobalt-fg">
              <Film className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-xs font-medium text-adm-muted">Tambah video atau seret file ke sini</span>
          </label>
        )}
      </Field>
    </Modal>
  );
};

export default PortfolioEditor;
