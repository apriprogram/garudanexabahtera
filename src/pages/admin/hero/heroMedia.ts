// Helper murni untuk latar hero di admin (Pengaturan website → Hero): mode latar, validasi file, pesan error unggah,
// dan hitungan ukuran gambar. Tanpa DOM supaya mudah diuji; bagian yang butuh browser ada di heroImage.ts & heroVideo.ts.

/** Nilai setting hero_bg_mode. Sengaja didefinisikan di sini (bukan diimpor dari kode hero publik). */
export type HeroBgMode = 'default' | 'image' | 'video';

export const HERO_BG_MODES: readonly HeroBgMode[] = ['default', 'image', 'video'];

/**
 * Nilai hero_bg_mode dari server; kosong/tidak dikenal → 'default'. Dicocokkan persis (tanpa trim/huruf kecil)
 * seperti di website, supaya admin tidak menampilkan mode yang di website jatuh ke bawaan.
 */
export function normalizeHeroBgMode(raw: unknown): HeroBgMode {
  return typeof raw === 'string' && (HERO_BG_MODES as readonly string[]).includes(raw) ? (raw as HeroBgMode) : 'default';
}

/** Isi string JSON berupa array; JSON rusak atau bukan array → []. */
export function parseJsonArray(raw: unknown): unknown[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/** hero_images → daftar URL gambar (hanya string tidak kosong, urutan dipertahankan). */
export const parseHeroImages = (raw: unknown): string[] =>
  parseJsonArray(raw).filter((item): item is string => typeof item === 'string' && item.trim() !== '');

/** hero_logos → daftar logo {name, src}; entri yang bentuknya salah dibuang. */
export const parseHeroLogos = (raw: unknown): { name: string; src: string }[] =>
  parseJsonArray(raw).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const { name, src } = item as { name?: unknown; src?: unknown };
    return typeof src === 'string' && src ? [{ name: typeof name === 'string' ? name : '', src }] : [];
  });

/* ─── Dasar simpan (tab basi) ─────────────────────────────────────────────── */

/**
 * Latar hero seperti dimuat get_settings terakhir yang berhasil, dalam bentuk yang sama dengan isian yang dikirim
 * update_settings (mode dinormalkan, URL di-trim, hero_images = JSON daftar hasil parseHeroImages). `base` dikirim
 * sebagai hero_media_base: nilai video/sampul persis seperti tersimpan, supaya server bisa menolak tab yang basi (409).
 */
export interface HeroMediaBaseline {
  hero_bg_mode: HeroBgMode;
  hero_bg_video: string;
  hero_bg_video_poster: string;
  hero_images: string;
  base: { video: string; poster: string };
}

const HERO_MEDIA_KEYS = ['hero_bg_mode', 'hero_bg_video', 'hero_bg_video_poster', 'hero_images'] as const;

/** Dasar latar hero dari respons get_settings (setting yang tidak ada = ""). */
export function heroMediaBaseline(data: Record<string, unknown>): HeroMediaBaseline {
  const raw = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : '');
  return {
    hero_bg_mode: normalizeHeroBgMode(data.hero_bg_mode),
    hero_bg_video: raw('hero_bg_video').trim(),
    hero_bg_video_poster: raw('hero_bg_video_poster').trim(),
    hero_images: JSON.stringify(parseHeroImages(data.hero_images)),
    base: { video: raw('hero_bg_video'), poster: raw('hero_bg_video_poster') },
  };
}

/**
 * Salinan settings tanpa kunci latar hero yang nilainya masih sama dengan dasar. Tab yang tidak menyentuh latar hero
 * jadi tidak bisa mengembalikan perubahan latar dari tab atau perangkat lain.
 */
export function omitUnchangedHeroMedia(settings: Record<string, string>, baseline: HeroMediaBaseline): Record<string, string> {
  const out = { ...settings };
  for (const key of HERO_MEDIA_KEYS) {
    if (out[key] === baseline[key]) delete out[key];
  }
  return out;
}

/* ─── Batas & ukuran ──────────────────────────────────────────────────────── */

export const HERO_IMAGE_MAX_MB = 10;
export const HERO_IMAGE_MAX_WIDTH = 1920;
export const HERO_IMAGE_MAX_HEIGHT = 1080;
export const HERO_IMAGE_QUALITY = 0.82;

/** Batas video bila get_hero_media_limits gagal (sama dengan bawaan UPLOAD_MAX_VIDEO_MB di server). */
export const HERO_VIDEO_MAX_MB = 30;
/** Lebih dari ini → saran memakai video yang lebih pendek (tidak memblokir). */
export const HERO_VIDEO_LONG_SECONDS = 60;
export const HERO_POSTER_MAX_WIDTH = 1280;
export const HERO_POSTER_QUALITY = 0.8;
export const HERO_POSTER_TIMEOUT_MS = 8000;

export const HERO_VIDEO_UPLOAD_URL = '/api.php?action=upload_hero_video';

const MB = 1024 * 1024;

/**
 * Ukuran baru yang muat di dalam kotak maxWidth × maxHeight dengan rasio tetap. Tidak pernah memperbesar;
 * ukuran tidak valid (0, NaN) dikembalikan 0 × 0.
 */
export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) return { width: 0, height: 0 };
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Detik frame untuk gambar sampul: min(1 dtk, durasi/4); durasi tidak diketahui → 0. */
export function posterFrameTime(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(1, duration / 4);
}

/* ─── Validasi file ───────────────────────────────────────────────────────── */

type FileLike = { name: string; type: string; size: number };

export type ImageRejectReason = 'type' | 'size';

/** Alasan gambar ditolak sebelum diproses, atau null bila boleh. */
export function checkHeroImageFile(file: FileLike): ImageRejectReason | null {
  if (!file.type.startsWith('image/')) return 'type';
  if (file.size > HERO_IMAGE_MAX_MB * MB) return 'size';
  return null;
}

/** Pesan bila gambar melebihi batas daftar: semua ditolak (daftar penuh) atau sebagian file terakhir. */
export function imageCapMessage(dropped: number, added: number, max: number): string {
  return added > 0
    ? `Maksimal ${max} gambar latar, jadi ${dropped} file terakhir tidak ditambahkan.`
    : `Maksimal ${max} gambar latar. Hapus salah satu dulu.`;
}

/** Pesan untuk gambar yang tidak ditambahkan (satu file → alasan lengkap, beberapa → ringkas). */
export function imageRejectMessage(rejected: { name: string; reason: ImageRejectReason | 'read' }[]): string | null {
  if (rejected.length === 0) return null;
  const why = (reason: ImageRejectReason | 'read') =>
    reason === 'type' ? 'bukan file gambar' : reason === 'size' ? `lebih dari ${HERO_IMAGE_MAX_MB} MB` : 'tidak bisa dibaca';
  if (rejected.length === 1) {
    const [item] = rejected;
    return `"${item.name}" tidak ditambahkan karena ${why(item.reason)}.`;
  }
  const list = rejected.map((item) => `${item.name} (${why(item.reason)})`).join(', ');
  return `${rejected.length} file tidak ditambahkan: ${list}.`;
}

export type HeroVideoKind = 'mp4' | 'webm';

/** Jenis video dari MIME atau ekstensi nama file; selain MP4/WebM → null. */
export function heroVideoKind(file: Pick<FileLike, 'name' | 'type'>): HeroVideoKind | null {
  const type = file.type.toLowerCase();
  if (type === 'video/mp4') return 'mp4';
  if (type === 'video/webm') return 'webm';
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'mp4') return 'mp4';
  if (ext === 'webm') return 'webm';
  return null;
}

/** Content-Type untuk unggahan (hanya informasi; server memeriksa isi file). */
export const heroVideoContentType = (file: Pick<FileLike, 'name' | 'type'>): string =>
  heroVideoKind(file) === 'webm' ? 'video/webm' : 'video/mp4';

/** Pesan bila video tidak boleh diunggah, atau null bila lolos. maxMb: batas dari server (get_hero_media_limits). */
export function validateHeroVideoFile(file: FileLike, maxMb = HERO_VIDEO_MAX_MB): string | null {
  if (!heroVideoKind(file)) return 'Format video harus MP4 atau WebM.';
  if (file.size <= 0) return 'File video kosong.';
  if (file.size > maxMb * MB) return `Ukuran video maksimal ${maxMb} MB.`;
  return null;
}

/** video_max_mb dari get_hero_media_limits → MB bulat (≥ 1), atau null bila bukan angka yang masuk akal. */
export function heroVideoLimitMb(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : null;
}

/* ─── Error unggah ────────────────────────────────────────────────────────── */

export const UPLOAD_NETWORK_ERROR = 'Tidak bisa terhubung ke server.';
export const UPLOAD_SESSION_ERROR = 'Sesi kamu berakhir. Masuk lagi lalu unggah ulang.';
export const UPLOAD_TOO_LARGE_ERROR = 'Ukuran video terlalu besar untuk server.';

/** Pesan `error` dari respons JSON server, atau null. */
function serverError(body: string): string | null {
  if (!body) return null;
  try {
    const data: unknown = JSON.parse(body);
    const error = data && typeof data === 'object' ? (data as { error?: unknown }).error : undefined;
    return typeof error === 'string' && error.trim() ? error.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Pesan error unggah video untuk ditampilkan. Status 0 = gagal terhubung; 401/403 = sesi habis (pesan server
 * tidak dipakai karena menyuruh "login kembali" tanpa konteks unggahan); selain itu pesan `error` server bila ada,
 * lalu 413 (biasanya dari nginx/PHP, bukan JSON) → terlalu besar.
 */
export function heroUploadErrorMessage(status: number, body = ''): string {
  if (status === 0) return UPLOAD_NETWORK_ERROR;
  if (status === 401 || status === 403) return UPLOAD_SESSION_ERROR;
  const message = serverError(body);
  if (message) return message;
  if (status === 413) return UPLOAD_TOO_LARGE_ERROR;
  if (status >= 200 && status < 300) return 'Gagal mengunggah video: respons server tidak sesuai.';
  return `Gagal mengunggah video (HTTP ${status}).`;
}

/** URL video dari respons sukses {success:true,url}, atau null bila bentuknya tidak sesuai. */
export function uploadedVideoUrl(body: string): string | null {
  try {
    const data: unknown = JSON.parse(body);
    const url = data && typeof data === 'object' ? (data as { url?: unknown }).url : undefined;
    return typeof url === 'string' && url.trim() && !/^data:/i.test(url.trim()) ? url.trim() : null;
  } catch {
    return null;
  }
}

/* ─── Lain-lain ───────────────────────────────────────────────────────────── */

/** Ukuran file yang mudah dibaca: "850 KB", "12,4 MB". */
export function formatFileSize(bytes: number): string {
  if (!(bytes > 0)) return '0 KB';
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / MB).toFixed(1).replace('.', ',')} MB`;
}

/** Hash FNV-1a 32-bit (base36) untuk key React yang stabil dari string panjang (mis. data URI). */
function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Key stabil per item daftar gambar: sama untuk isi yang sama walau urutannya berubah; gambar kembar dibedakan
 * dengan nomor kemunculan. Menggantikan key={index} supaya animasi hapus/geser mengenai kartu yang benar.
 */
export function stableListKeys(items: string[]): string[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = `${hashString(item)}-${item.length.toString(36)}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}~${n}`;
  });
}
