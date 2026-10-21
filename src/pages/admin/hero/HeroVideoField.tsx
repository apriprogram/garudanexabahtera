import React, { useEffect, useRef, useState } from 'react';
import { Film, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Button, Notice, ThinProgress, cn } from '../../../components/admin/ui';
import { getToken } from '../../../lib/auth';
import {
  HERO_VIDEO_LONG_SECONDS,
  HERO_VIDEO_MAX_MB,
  UPLOAD_SESSION_ERROR,
  formatFileSize,
  validateHeroVideoFile,
} from './heroMedia';
import { HeroUploadError, captureVideoPoster, uploadHeroVideo, type HeroVideoUpload } from './heroVideo';
import { dropZoneClass } from './styles';

const VIDEO_ACCEPT = 'video/mp4,video/webm';

interface HeroVideoFieldProps {
  /** URL video tersimpan ("" = belum ada). */
  video: string;
  /** URL gambar sampul, atau data URI JPEG baru yang diubah backend jadi file saat disimpan. */
  poster: string;
  setVideo: (url: string) => void;
  setPoster: (url: string) => void;
  /** true selama unggahan berjalan (tombol simpan dinonaktifkan oleh halaman). */
  onBusyChange?: (busy: boolean) => void;
}

/** Unggah, pratinjau, ganti, dan hapus video latar hero. Hasil baru tampil di website setelah "Simpan semua perubahan". */
const HeroVideoField: React.FC<HeroVideoFieldProps> = ({ video, poster, setVideo, setPoster, onBusyChange }) => {
  const [upload, setUpload] = useState<{ name: string; size: number; percent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [longVideo, setLongVideo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const jobRef = useRef<HeroVideoUpload | null>(null);
  /* Nomor unggahan terakhir: hasil unggahan lama (dibatalkan/diganti) diabaikan. */
  const runRef = useRef(0);
  const uploading = upload !== null;

  // Laporkan status sibuk ke halaman; cleanup (selesai atau komponen dilepas) → tidak sibuk lagi.
  useEffect(() => {
    if (!uploading) return;
    onBusyChange?.(true);
    return () => onBusyChange?.(false);
  }, [uploading, onBusyChange]);

  // Pindah tab/halaman saat mengunggah → batalkan, supaya tidak ada unggahan yatim tanpa tampilan progres.
  useEffect(() => () => jobRef.current?.abort(), []);

  const startUpload = async (file: File) => {
    if (jobRef.current) return;
    const invalid = validateHeroVideoFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    const token = getToken();
    if (!token) {
      setError(UPLOAD_SESSION_ERROR);
      return;
    }

    const run = ++runRef.current;
    setError(null);
    setLongVideo(false);
    setUpload({ name: file.name, size: file.size, percent: 0 });

    // Gambar sampul dibuat dari file lokal bersamaan dengan unggahan (maks. ~8 dtk, gagal = tanpa sampul).
    const posterJob = captureVideoPoster(file).then((result) => {
      if (runRef.current === run && result.duration !== null && result.duration > HERO_VIDEO_LONG_SECONDS) setLongVideo(true);
      return result.poster;
    });
    const job = uploadHeroVideo(file, {
      token,
      onProgress: (percent) => {
        if (runRef.current === run) setUpload((prev) => (prev ? { ...prev, percent } : prev));
      },
    });
    jobRef.current = job;

    try {
      const url = await job.promise;
      const posterUrl = await posterJob;
      if (runRef.current !== run) return;
      setVideo(url);
      setPoster(posterUrl ?? '');
    } catch (err) {
      if (runRef.current !== run) return;
      if (!(err instanceof HeroUploadError && err.aborted)) {
        setError(err instanceof Error && err.message ? err.message : 'Gagal mengunggah video.');
      }
    } finally {
      if (runRef.current === run) {
        jobRef.current = null;
        setUpload(null);
      }
    }
  };

  const handleFiles = (files: File[]) => {
    if (files.length > 0) void startUpload(files[0]);
  };

  const cancelUpload = () => {
    runRef.current++;
    jobRef.current?.abort();
    jobRef.current = null;
    setUpload(null);
  };

  const removeVideo = () => {
    setVideo('');
    setPoster('');
    setLongVideo(false);
    setError(null);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    handleFiles(files);
  };

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (!uploading) setIsDragging(true);
    },
    onDragLeave: () => setIsDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(Array.from(e.dataTransfer.files));
    },
  };

  const progress = upload && (
    <div className="space-y-3 rounded-xl bg-adm-ghost p-4 ring-1 ring-inset ring-adm-line">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-adm-fg">{upload.name}</p>
          <p className="mt-0.5 text-xs tabular-nums text-adm-muted">
            {formatFileSize(upload.size)} · {upload.percent < 100 ? `Mengunggah ${upload.percent}%` : 'Menyiapkan gambar sampul...'}
          </p>
        </div>
        <Button variant="secondary" onClick={cancelUpload} className="shrink-0">
          Batal
        </Button>
      </div>
      <ThinProgress value={upload.percent} label="Progres unggah video" />
      <p className="text-xs leading-relaxed text-adm-muted">Jangan pindah tab atau halaman sampai unggahan selesai.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {video ? (
        <div className="space-y-3">
          <video
            key={video}
            src={video}
            poster={poster || undefined}
            controls
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Pratinjau video latar"
            className="aspect-video w-full rounded-xl bg-obsidian object-cover"
          />
          <div className="flex items-center gap-3">
            <div className="aspect-video w-20 shrink-0 overflow-hidden rounded-lg bg-adm-ghost ring-1 ring-inset ring-adm-line">
              {poster ? <img src={poster} alt="Gambar sampul video" className="h-full w-full object-cover" /> : null}
            </div>
            <p className="min-w-0 text-xs leading-relaxed text-adm-muted">
              {poster
                ? 'Gambar sampul diambil otomatis dari video. Tampil sebelum video siap diputar.'
                : 'Gambar sampul tidak bisa dibuat dari video ini. Ganti video untuk mencoba lagi.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<RefreshCw />} disabled={uploading} onClick={() => inputRef.current?.click()}>
              Ganti video
            </Button>
            <Button variant="danger-soft" icon={<Trash2 />} disabled={uploading} onClick={removeVideo}>
              Hapus video
            </Button>
          </div>
          <input ref={inputRef} type="file" accept={VIDEO_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={onInputChange} />
          {progress}
        </div>
      ) : (
        progress || (
          <label {...dropHandlers} className={dropZoneClass(isDragging, 'aspect-video w-full rounded-xl px-4 text-center')}>
            <input type="file" accept={VIDEO_ACCEPT} className="sr-only" onChange={onInputChange} />
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                isDragging ? 'bg-cobalt text-white' : 'bg-adm-ghost text-adm-muted group-hover:bg-adm-cobalt-soft group-hover:text-adm-cobalt-fg',
              )}
            >
              {isDragging ? <Upload className="h-5 w-5" strokeWidth={1.75} aria-hidden /> : <Film className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
            </span>
            <span className={cn('text-[13px] font-medium transition-colors', isDragging ? 'text-adm-cobalt-fg' : 'text-adm-fg group-hover:text-adm-cobalt-fg')}>
              {isDragging ? 'Lepaskan!' : 'Unggah video'}
            </span>
            <span className="text-xs text-adm-muted">MP4 atau WebM, maks. {HERO_VIDEO_MAX_MB} MB. Klik atau seret file ke sini.</span>
          </label>
        )
      )}

      {error && (
        <Notice tone="danger" onClose={() => setError(null)}>
          {error}
        </Notice>
      )}
      {longVideo && video && !uploading && (
        <Notice tone="warning" onClose={() => setLongVideo(false)}>
          Video ini lebih dari 1 menit. Video 10–30 detik lebih ringan dibuka pengunjung.
        </Notice>
      )}
      {!video && !uploading && <Notice tone="warning">Belum ada video. Website memakai latar bawaan sampai video diunggah.</Notice>}
      <Notice tone="cobalt">
        Video diputar tanpa suara dan berulang. Pakai MP4 (H.264) atau WebM, maks. {HERO_VIDEO_MAX_MB} MB; disarankan 10–30 detik,
        1920×1080 px. Pengunjung dengan mode hemat data atau animasi dikurangi melihat gambar sampul. Klik “Simpan semua perubahan” agar
        tampil di website.
      </Notice>
    </div>
  );
};

export default HeroVideoField;
