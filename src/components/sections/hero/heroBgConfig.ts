// Latar hero beranda dari setting admin (Pengaturan website → Hero → "Latar hero"). Murni (tanpa DOM) agar mudah diuji;
// tampilannya ada di HeroBackground.tsx (bawaan) dan HeroMedia.tsx (gambar / video).
import { readList, type SiteSettings } from '../../../hooks/useSiteSettings';

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
/** Lama satu gambar tampil sebelum berganti (ms). */
export const HERO_SLIDE_MS = 6000;

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
