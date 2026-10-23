// Mengambil sampel luminans latar hero (gambar / poster / frame video) di belakang blok teks, di browser.
// Matematikanya murni di heroContrast.ts; file ini hanya memuat gambar dan membaca pikselnya lewat canvas kecil.
import { backgroundSample, coverSourceRect, type BackgroundSample, type Rect } from './heroContrast';

/** Sisi terpanjang canvas sampel (px): cukup halus untuk teks (1 sampel ≈ 13px di kolom 628px), murah dihitung. */
const SAMPLE_MAX = 48;

/** Kotak media (= section hero, media `absolute inset-0`) dan area blok teks di dalamnya, dalam px CSS. */
export interface SampleLayout {
  box: { w: number; h: number };
  region: Rect;
}

/**
 * Hasil satu sumber: statistik, 'missing' (gambar situs yang gagal dimuat: HeroMedia juga melewatinya), atau
 * 'unmeasurable' (lintas domain tanpa CORS, canvas tercemar, dekode gagal): latar tidak diketahui → cadangan.
 */
export type SampleResult = { kind: 'sample'; sample: BackgroundSample } | { kind: 'missing' } | { kind: 'unmeasurable' };

/** true bila URL dimuat dari domain lain (mis. S3 backend Node): butuh CORS agar pikselnya bisa dibaca. */
export const isCrossOrigin = (src: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(src, window.location.href).origin !== window.location.origin;
  } catch {
    return true;
  }
};

const imageCache = new Map<string, Promise<HTMLImageElement | 'missing' | 'unmeasurable'>>();

/**
 * Gambar untuk diambil sampelnya (satu kali per URL, tersimpan selama halaman terbuka). URL lintas domain dimuat
 * dengan `crossOrigin="anonymous"`: tanpa header CORS gagal dimuat → 'unmeasurable' (tidak bisa dibedakan dari 404).
 * Data URI (gambar baru di admin) dan path situs selalu bisa dibaca.
 */
export function loadSampleImage(src: string): Promise<HTMLImageElement | 'missing' | 'unmeasurable'> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const cross = !src.startsWith('data:') && isCrossOrigin(src);
  const promise = new Promise<HTMLImageElement | 'missing' | 'unmeasurable'>((resolve) => {
    const img = new Image();
    if (cross) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0 ? img : 'unmeasurable');
    img.onerror = () => resolve(cross ? 'unmeasurable' : 'missing');
    img.src = src;
  });
  imageCache.set(src, promise);
  // Gagal dimuat (mis. jaringan putus): dicoba lagi pada pengukuran berikutnya, tidak disimpan
  void promise.then((result) => {
    if (result === 'missing') imageCache.delete(src);
  });
  return promise;
}

let canvas: HTMLCanvasElement | null = null;

/**
 * Piksel bagian `layout.region` dari sumber yang dipasang `object-fit: cover` di `layout.box` (diperkecil ke maks.
 * 48px, tiap piksel = rata-rata areanya), atau null bila pikselnya tidak boleh / tidak bisa dibaca (SecurityError
 * canvas tercemar, ukuran tidak valid).
 */
export function sampleBackground(
  source: CanvasImageSource,
  natural: { w: number; h: number },
  layout: SampleLayout,
): BackgroundSample | null {
  const crop = coverSourceRect(natural.w, natural.h, layout.box.w, layout.box.h, layout.region);
  if (!crop || typeof document === 'undefined') return null;
  const scale = SAMPLE_MAX / Math.max(layout.region.w, layout.region.h, 1);
  const w = Math.max(1, Math.round(Math.min(layout.region.w, layout.box.w) * scale));
  const h = Math.max(1, Math.round(Math.min(layout.region.h, layout.box.h) * scale));
  try {
    canvas ??= document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    // Latar putih di bawah gambar transparan (sama dengan halaman)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);
    return backgroundSample(ctx.getImageData(0, 0, w, h).data);
  } catch {
    return null;
  }
}

/** Satu gambar (URL) → hasil sampel untuk layout ini. */
export async function sampleImage(src: string, layout: SampleLayout): Promise<SampleResult> {
  const img = await loadSampleImage(src);
  if (img === 'missing' || img === 'unmeasurable') return { kind: img };
  const sample = sampleBackground(img, { w: img.naturalWidth, h: img.naturalHeight }, layout);
  return sample ? { kind: 'sample', sample } : { kind: 'unmeasurable' };
}

/** Frame video yang sedang tampil → hasil sampel (video lintas domain tanpa CORS → 'unmeasurable'). */
export function sampleVideo(video: HTMLVideoElement, layout: SampleLayout): SampleResult {
  if (!(video.videoWidth > 0 && video.videoHeight > 0)) return { kind: 'unmeasurable' };
  const sample = sampleBackground(video, { w: video.videoWidth, h: video.videoHeight }, layout);
  return sample ? { kind: 'sample', sample } : { kind: 'unmeasurable' };
}

/**
 * Sampel yang dipakai keputusan (decideHeroLegibility mengambil kasus terburuknya). Satu saja yang tidak terukur →
 * null (latar tidak diketahui, pakai cadangan); yang 'missing' dilewati seperti di HeroMedia; tidak ada yang
 * terukur → null.
 */
export function combineResults(results: readonly SampleResult[]): BackgroundSample[] | null {
  if (results.some((r) => r.kind === 'unmeasurable')) return null;
  const samples = results.flatMap((r) => (r.kind === 'sample' ? [r.sample] : []));
  return samples.length > 0 ? samples : null;
}

/** Mode hemat data browser (Save-Data): gambar tayangan berikutnya tidak diunduh hanya untuk diukur. */
export const prefersSaveData = (): boolean =>
  typeof navigator !== 'undefined' &&
  Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
