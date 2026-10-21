import React, { useEffect, useRef, useState } from 'react';
import { Film, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Button, Notice, ThinProgress, cn } from '../../../components/admin/ui';
import { apiGet } from '../../../lib/api';
import { getToken } from '../../../lib/auth';
import {
  HERO_VIDEO_LONG_SECONDS,
  HERO_VIDEO_MAX_MB,
  UPLOAD_SESSION_ERROR,
  formatFileSize,
  heroVideoLimitMb,
  validateHeroVideoFile,
} from './heroMedia';
import { HeroUploadError, captureVideoPoster, uploadHeroVideo, type HeroVideoUpload, type PosterResult } from './heroVideo';
import { dropZoneClass } from './styles';

const VIDEO_ACCEPT = 'video/mp4,video/webm';
const DONE_STATUS = 'Video berhasil diunggah. Klik Simpan semua perubahan agar tampil di website.';

/** Elemen yang menerima fokus setelah tahap unggah berganti ('drop' = kotak unggah, atau "Ganti video" bila video ada). */
type FocusTarget = 'cancel' | 'replace' | 'drop';

interface HeroVideoFieldProps {
  /** URL video tersimpan ("" = belum ada). */
  video: string;
  /** URL gambar sampul, atau data URI JPEG baru yang diubah backend jadi file saat disimpan. */
  poster: string;
  setVideo: (url: string) => void;
  setPoster: (url: string) => void;
  /**
   * true selama unggahan berjalan, termasuk menunggu gambar sampul (tombol simpan dinonaktifkan oleh halaman).
   * Dilaporkan oleh unggahan itu sendiri, juga setelah komponen dilepas: false baru saat unggahan selesai
   * (video + sampul terpasang), gagal, atau dibatalkan.
   */
  onBusyChange?: (busy: boolean) => void;
  /**
   * true selama unggahan dari tampilan sebelumnya (tab Hero ditutup saat sampul dibuat) belum selesai: unggah, ganti,
   * hapus, dan lepas file dinonaktifkan sampai sampulnya terpasang.
   */
  pendingUpload?: boolean;
  /** true selama halaman menyimpan: unggah, ganti, hapus, dan lepas file dinonaktifkan. */
  disabled?: boolean;
}

/** Unggah, pratinjau, ganti, dan hapus video latar hero. Hasil baru tampil di website setelah "Simpan semua perubahan". */
const HeroVideoField: React.FC<HeroVideoFieldProps> = ({
  video,
  poster,
  setVideo,
  setPoster,
  onBusyChange,
  pendingUpload = false,
  disabled = false,
}) => {
  /* phase 'upload' = file sedang dikirim (bisa dibatalkan); 'poster' = file sudah tersimpan, menunggu gambar sampul. */
  const [upload, setUpload] = useState<{ name: string; size: number; percent: number; phase: 'upload' | 'poster' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  /* URL video yang diketahui lebih dari 1 menit: saran hanya tampil selama video itu yang terpasang. */
  const [longVideoUrl, setLongVideoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  /* Batas ukuran dari server (get_hero_media_limits); gagal dimuat → bawaan 30 MB. */
  const [maxMb, setMaxMb] = useState(HERO_VIDEO_MAX_MB);
  /* Isi baris status aria-live: mulai, berhasil, batal, gagal, dihapus. */
  const [status, setStatus] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const replaceRef = useRef<HTMLButtonElement>(null);
  const focusRef = useRef<FocusTarget | null>(null);
  const jobRef = useRef<HeroVideoUpload | null>(null);
  /* Nomor unggahan terakhir: hasil unggahan lama (dibatalkan/diganti) diabaikan. */
  const runRef = useRef(0);
  const uploading = upload !== null;
  const blocked = disabled || pendingUpload;
  const locked = uploading || blocked;

  // Pindah tab/halaman saat file dikirim → batalkan, supaya tidak ada unggahan yatim tanpa tampilan progres; unggahan
  // itu lalu melepas status sibuknya sendiri. Saat sampul dibuat file sudah tersimpan (abort tidak berbuat apa-apa):
  // unggahan tetap selesai, memasang sampul ke halaman, baru melepas status sibuk.
  useEffect(() => () => jobRef.current?.abort(), []);

  // Batas ukuran video dari server (UPLOAD_MAX_VIDEO_MB); token dipasang pembungkus fetch.
  useEffect(() => {
    let active = true;
    apiGet<{ video_max_mb?: unknown }>('get_hero_media_limits')
      .then((data) => {
        const mb = heroVideoLimitMb(data?.video_max_mb);
        if (active && mb !== null) setMaxMb(mb);
      })
      .catch(() => {
        // Tetap memakai batas bawaan; server tetap menolak file yang terlalu besar
      });
    return () => {
      active = false;
    };
  }, []);

  // Pindahkan fokus setelah tahap berganti; ditunda sampai elemennya ada dan aktif (mis. "Ganti video" setelah sampul siap).
  useEffect(() => {
    const target = focusRef.current;
    if (!target) return;
    const el = target === 'cancel' ? cancelRef.current : target === 'replace' ? replaceRef.current : dropInputRef.current ?? replaceRef.current;
    if (!el || el.disabled) return;
    focusRef.current = null;
    el.focus();
  });

  const startUpload = async (file: File) => {
    if (jobRef.current || blocked) return;
    const invalid = validateHeroVideoFile(file, maxMb);
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
    setUpload({ name: file.name, size: file.size, percent: 0, phase: 'upload' });
    onBusyChange?.(true);
    setStatus(`Mengunggah ${file.name}...`);
    focusRef.current = 'cancel';

    // Gambar sampul dibuat dari file lokal bersamaan dengan unggahan (maks. ~8 dtk, gagal = tanpa sampul).
    const posterJob = captureVideoPoster(file).catch((): PosterResult => ({ poster: null, duration: null }));
    const job = uploadHeroVideo(file, {
      token,
      onProgress: (percent) => {
        if (runRef.current === run) setUpload((prev) => (prev ? { ...prev, percent } : prev));
      },
    });
    jobRef.current = job;

    let url: string;
    try {
      url = await job.promise;
    } catch (err) {
      // Dibatalkan lewat Batal (cancelUpload sudah merapikan, termasuk status sibuk) atau sudah diganti unggahan lain
      if (runRef.current !== run) return;
      jobRef.current = null;
      setUpload(null);
      onBusyChange?.(false);
      // Dibatalkan tanpa Batal = komponen dilepas: tidak ada yang perlu ditampilkan
      if (err instanceof HeroUploadError && err.aborted) return;
      setError(err instanceof Error && err.message ? err.message : 'Gagal mengunggah video.');
      setStatus('Video gagal diunggah.');
      focusRef.current = 'drop';
      return;
    }
    if (runRef.current !== run) return;

    // File sudah tersimpan di server: langsung dipakai (tidak bisa dibatalkan lagi). Sampul video lama tidak cocok,
    // jadi dikosongkan sampai sampul baru siap; tombol simpan tetap ditahan selama tahap ini.
    setVideo(url);
    setPoster('');
    setUpload((prev) => (prev ? { ...prev, percent: 100, phase: 'poster' } : prev));

    const result = await posterJob;
    // Juga setelah komponen dilepas: sampul tetap dipasang ke halaman (setter dari props), baru status sibuk dilepas,
    // supaya simpan tidak bisa mengirim video tanpa sampulnya. posterJob selalu selesai (maks. ~8 dtk).
    if (runRef.current !== run) return;
    setPoster(result.poster ?? '');
    setLongVideoUrl(result.duration !== null && result.duration > HERO_VIDEO_LONG_SECONDS ? url : null);
    jobRef.current = null;
    setUpload(null);
    onBusyChange?.(false);
    setStatus(DONE_STATUS);
    focusRef.current = 'replace';
  };

  const handleFiles = (files: File[]) => {
    if (files.length > 0) void startUpload(files[0]);
  };

  const cancelUpload = () => {
    if (upload?.phase !== 'upload') return;
    runRef.current++;
    jobRef.current?.abort();
    jobRef.current = null;
    setUpload(null);
    onBusyChange?.(false);
    setStatus('Unggahan video dibatalkan.');
    focusRef.current = 'drop';
  };

  const removeVideo = () => {
    setVideo('');
    setPoster('');
    setLongVideoUrl(null);
    setError(null);
    setStatus('Video dihapus. Klik Simpan semua perubahan agar tersimpan di website.');
    focusRef.current = 'drop';
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    handleFiles(files);
  };

  /* Area lepas file: kotak unggah (belum ada video) atau pratinjau (ganti video). */
  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (!locked) setIsDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      // Masuk ke elemen anak (mis. video pratinjau) bukan berarti keluar dari area lepas
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setIsDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!locked) handleFiles(Array.from(e.dataTransfer?.files ?? []));
    },
  };

  // Seluruh bidang: file yang dilepas di luar area lepas tidak dibuka browser (halaman admin tidak tertinggal).
  const blockFileNavigation = (e: React.DragEvent) => e.preventDefault();

  const progress = upload && (
    <div className="space-y-3 rounded-xl bg-adm-ghost p-4 ring-1 ring-inset ring-adm-line">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-adm-fg">{upload.name}</p>
          <p className="mt-0.5 text-xs tabular-nums text-adm-muted">
            {formatFileSize(upload.size)} · {upload.phase === 'upload' && upload.percent < 100 ? `Mengunggah ${upload.percent}%` : 'Menyiapkan gambar sampul...'}
          </p>
        </div>
        {/* File yang sudah tersimpan tidak bisa dibatalkan lagi: Batal hanya selama file dikirim */}
        {upload.phase === 'upload' && (
          <Button ref={cancelRef} variant="secondary" onClick={cancelUpload} className="shrink-0">
            Batal
          </Button>
        )}
      </div>
      <ThinProgress value={upload.percent} label="Progres unggah video" />
      <p className="text-xs leading-relaxed text-adm-muted">Jangan pindah tab atau halaman sampai unggahan selesai.</p>
    </div>
  );

  return (
    <div className="space-y-4" onDragOver={blockFileNavigation} onDrop={blockFileNavigation}>
      {video ? (
        <div className="space-y-3">
          <div className="relative" {...dropHandlers}>
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
            {isDragging && (
              <div className="adm-keep-white pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-cobalt bg-black/60 text-white">
                <Upload className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                <span className="text-[13px] font-medium">Lepaskan untuk mengganti video</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="aspect-video w-20 shrink-0 overflow-hidden rounded-lg bg-adm-ghost ring-1 ring-inset ring-adm-line">
              {poster ? <img src={poster} alt="Gambar sampul video" className="h-full w-full object-cover" /> : null}
            </div>
            <p className="min-w-0 text-xs leading-relaxed text-adm-muted">
              {poster
                ? 'Gambar sampul diambil otomatis dari video. Tampil sebelum video siap diputar.'
                : uploading || pendingUpload
                  ? 'Gambar sampul sedang dibuat dari video.'
                  : 'Gambar sampul tidak bisa dibuat dari video ini. Ganti video untuk mencoba lagi.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button ref={replaceRef} variant="secondary" icon={<RefreshCw />} disabled={locked} onClick={() => inputRef.current?.click()}>
              Ganti video
            </Button>
            <Button variant="danger-soft" icon={<Trash2 />} disabled={locked} onClick={removeVideo}>
              Hapus video
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={VIDEO_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            disabled={locked}
            onChange={onInputChange}
          />
          {progress}
        </div>
      ) : (
        progress || (
          <label {...dropHandlers} aria-disabled={blocked || undefined} className={dropZoneClass(isDragging, 'aspect-video w-full rounded-xl px-4 text-center', blocked)}>
            <input ref={dropInputRef} type="file" accept={VIDEO_ACCEPT} className="sr-only" disabled={blocked} onChange={onInputChange} />
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
            <span className="text-xs text-adm-muted">MP4 atau WebM, maks. {maxMb} MB. Klik atau seret file ke sini.</span>
          </label>
        )
      )}

      {/* Diumumkan pembaca layar; tampilan sudah menunjukkan tahapnya */}
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      {error && (
        <Notice tone="danger" onClose={() => setError(null)}>
          {error}
        </Notice>
      )}
      {video && longVideoUrl === video && !uploading && (
        <Notice tone="warning" onClose={() => setLongVideoUrl(null)}>
          Video ini lebih dari 1 menit. Video 10–30 detik lebih ringan dibuka pengunjung.
        </Notice>
      )}
      {!video && !uploading && <Notice tone="warning">Belum ada video. Website memakai latar bawaan sampai video diunggah.</Notice>}
      <Notice tone="cobalt">
        Video diputar tanpa suara dan berulang. Pakai MP4 (H.264) atau WebM, maks. {maxMb} MB; disarankan 10–30 detik,
        1920×1080 px. Pengunjung dengan mode hemat data atau animasi dikurangi melihat gambar sampul. Klik “Simpan semua perubahan” agar
        tampil di website.
      </Notice>
    </div>
  );
};

export default HeroVideoField;
