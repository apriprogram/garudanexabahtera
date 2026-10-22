// Latar hero beranda dari setting admin (Pengaturan website → Hero → "Latar hero"). Murni (tanpa DOM) agar mudah diuji;
// tampilannya ada di HeroBackground.tsx (bawaan) dan HeroMedia.tsx (gambar / video).
import { readList, type SiteSettings } from '../../../hooks/useSiteSettings';
import { HERO_OVERLAY_DEFAULT, HERO_OVERLAY_MAX, HERO_TEXT_TONES, type HeroTextTone } from './heroContrast';

/**
 * - default: kanvas medan titik bawaan (HeroBackground);
 * - image: satu gambar statis, atau 2+ gambar yang bergantian (crossfade) sesuai urutan admin;
 * - video: satu video berulang tanpa suara, poster opsional.
 */
export type HeroBackgroundConfig =
  | { mode: 'default' }
  | { mode: 'image'; images: string[] }
  | { mode: 'video'; src: string; poster: string | null };

/** Latar gambar/video (selain bawaan), dirender HeroMedia. */
export type HeroMediaConfig = Exclude<HeroBackgroundConfig, { mode: 'default' }>;

/** Batas gambar slider yang dipakai (sisanya diabaikan agar halaman tidak memuat terlalu banyak gambar). */
export const HERO_MAX_IMAGES = 12;
/** Lama minimal satu gambar tampil sebelum berganti (ms); gambar berikutnya yang belum termuat ditunggu. */
export const HERO_SLIDE_MS = 6000;
/** Lama gambar baru memudar masuk (ms), sama dengan kelas `duration-[1200ms]` di HeroMedia; gambar lama disembunyikan sesudahnya. */
export const HERO_FADE_MS = 1200;

const DEFAULT: HeroBackgroundConfig = { mode: 'default' };

/** Karakter kontrol ASCII (0-31, 127) atau backslash. */
const hasUnsafeChar = (value: string): boolean =>
  Array.from(value).some((char) => {
    const code = char.charCodeAt(0);
    return code < 32 || code === 127 || char === '\\';
  });

/**
 * URL gambar/video yang aman dipasang di `src`: path situs ("/assets/bg/…", bukan "//host") atau http(s) absolut
 * (URL S3 dari backend Node). Selain itu → null: data:, blob:, javascript:, protocol-relative, teks kosong, bukan string.
 * Karakter kontrol & backslash ditolak karena browser membuangnya / membacanya sebagai "/" ("/\host" = "//host").
 */
export const safeMediaUrl = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const url = raw.trim();
  if (!url || hasUnsafeChar(url)) return null;
  if (url.startsWith('/')) return url.startsWith('//') ? null : url;
  return /^https?:\/\/[^/]/i.test(url) ? url : null;
};

/**
 * Setting `hero_bg_mode` (dicocokkan persis, sama dengan admin) + `hero_images` / `hero_bg_video` /
 * `hero_bg_video_poster` → latar yang dipakai. Apa pun yang tidak lengkap atau tidak aman jatuh ke bawaan:
 * mode tidak dikenal, mode gambar tanpa satu pun URL aman, mode video tanpa URL video aman. Poster boleh kosong.
 */
export const parseHeroBackground = (settings: SiteSettings): HeroBackgroundConfig => {
  const mode = settings.hero_bg_mode;
  if (mode === 'image') {
    const images: string[] = [];
    for (const item of readList<unknown>(settings.hero_images, [])) {
      const url = safeMediaUrl(item);
      if (url && !images.includes(url)) images.push(url);
      if (images.length >= HERO_MAX_IMAGES) break;
    }
    return images.length > 0 ? { mode: 'image', images } : DEFAULT;
  }
  if (mode === 'video') {
    const src = safeMediaUrl(settings.hero_bg_video);
    return src ? { mode: 'video', src, poster: safeMediaUrl(settings.hero_bg_video_poster) } : DEFAULT;
  }
  return DEFAULT;
};

/** Kunci React untuk HeroMedia: latar baru (mode / URL lain) = state tayangan mulai dari awal. */
export const heroBackgroundKey = (config: HeroBackgroundConfig): string => {
  if (config.mode === 'image') return `image:${config.images.join('\n')}`;
  if (config.mode === 'video') return `video:${config.src}\n${config.poster ?? ''}`;
  return 'default';
};

/* ─── Keterbacaan teks di atas gambar/video (hero_text_tone, hero_overlay) ─── */

/** Setting teks hero di atas media: nada (auto/light/dark) + lapisan minimum dalam persen (0..80). */
export interface HeroTextSettings {
  tone: HeroTextTone;
  overlay: number;
}

/** `hero_text_tone` dicocokkan persis (sama dengan backend); kosong / tidak dikenal → 'auto'. */
export const parseHeroTextTone = (raw: unknown): HeroTextTone =>
  typeof raw === 'string' && (HERO_TEXT_TONES as readonly string[]).includes(raw) ? (raw as HeroTextTone) : 'auto';

/** Angka desimal biasa dengan spasi/tab/baris baru di tepinya (tanpa +, eksponen, atau pemisah ribuan). */
const OVERLAY_NUMBER = /^[ \t\n\r]*(-?[0-9]+(?:\.[0-9]+)?)[ \t\n\r]*$/;

/**
 * `hero_overlay` → bilangan bulat 0..80, sama persis dengan hm_overlay() / heroOverlay() di backend: angka
 * (atau teks angka) dibulatkan lalu dibatasi 0..80; selain itu (kosong, teks lain, bukan angka) → 40.
 */
export const parseHeroOverlay = (raw: unknown): number => {
  let value: number;
  const match = typeof raw === 'string' ? OVERLAY_NUMBER.exec(raw) : null;
  if (typeof raw === 'number' && !Number.isNaN(raw)) value = raw;
  else if (match) value = Number(match[1]);
  else return HERO_OVERLAY_DEFAULT;
  // `|| 0`: -0 (dari -0,4) jadi 0
  return Math.min(HERO_OVERLAY_MAX, Math.max(0, Math.round(value))) || 0;
};

/** Setting teks hero dari get_settings. */
export const parseHeroText = (settings: SiteSettings): HeroTextSettings => ({
  tone: parseHeroTextTone(settings.hero_text_tone),
  overlay: parseHeroOverlay(settings.hero_overlay),
});
