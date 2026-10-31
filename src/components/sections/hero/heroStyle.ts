// Gaya hero beranda (Pengaturan website → Hero → "Gaya hero", setting `hero_style`):
// - classic (bawaan, juga kosong / tidak dikenal): tampilan hari ini (hero/HeroClassic.tsx, dimuat lazy dari Hero.tsx), tidak diubah sama sekali;
// - prompt: judul besar + kotak prompt AI di tengah (HeroPrompt.tsx) di atas latar putih dengan animasi burung Garuda
//   ASCII (prompt/GarudaAscii.tsx). Pesan dari kotak prompt dikirim ke chat Nexa (layout/nexa/nexaBridge.ts); chip
//   rekomendasi mengarah ke halaman yang dipilih admin.
// Murni (tanpa DOM): dipakai website, prerender, admin (pages/admin/hero) dan tes. Nilai dicocokkan persis, sama dengan
// backend (hm_style(), hm_prompt_*() di backend/modules/hero_media.php; heroStyle(), prompt*() di hero_media.js).
import type { SiteSettings } from '../../../hooks/useSiteSettings';
import { HUB_PATHS, categoryPath } from '../../../seo/paths';
import { safeMediaUrl } from './heroBgConfig';
import { HERO_H1_KEYWORD } from './heroHeadline';

export type HeroStyle = 'classic' | 'prompt';

export const HERO_STYLES: readonly HeroStyle[] = ['classic', 'prompt'];

/** `hero_style` dicocokkan persis (sama dengan backend); kosong / tidak dikenal → 'classic'. */
export const parseHeroStyle = (raw: unknown): HeroStyle => (raw === 'prompt' ? 'prompt' : 'classic');

/** Chip rekomendasi di bawah kotak prompt: label + tautan (path situs, URL http(s), atau #anchor). */
export interface HeroPromptChip {
  label: string;
  href: string;
}

/**
 * Isi hero gaya Prompt AI. Dari `parseHeroPrompt` teks kosong sudah diganti bawaan (dipakai website); dari
 * `readHeroPromptDraft` teks apa adanya ('' = admin belum mengisi, dipakai isian admin).
 */
export interface HeroPromptSettings {
  /** hero_prompt_title: judul besar di tengah. */
  title: string;
  /** hero_prompt_placeholder: teks placeholder kotak prompt. */
  placeholder: string;
  /** hero_prompt_chips (JSON array {label, href}), urutan admin, maks. HERO_PROMPT_MAX_CHIPS. */
  chips: HeroPromptChip[];
  /** hero_prompt_garuda: animasi burung Garuda ASCII di latar ('0' = mati, selain itu hidup). */
  garuda: boolean;
}

export const HERO_PROMPT_TITLE_DEFAULT = 'Mau bikin apa hari ini?';
export const HERO_PROMPT_PLACEHOLDER_DEFAULT = 'Ceritakan website atau aplikasi yang kamu butuhkan…';
export const HERO_PROMPT_CHIPS_DEFAULT: readonly HeroPromptChip[] = [
  { label: 'Website company profile', href: categoryPath('company-profile') },
  { label: 'Toko online', href: categoryPath('toko-online') },
  { label: 'Aplikasi custom', href: HUB_PATHS.customOrder },
  { label: 'Pilih template', href: HUB_PATHS.catalog },
];
/** Batas yang sama dengan backend (HM_PROMPT_* / PROMPT_* di hero_media.php / hero_media.js). */
export const HERO_PROMPT_MAX_CHIPS = 6;
export const HERO_PROMPT_LABEL_MAX = 40;
export const HERO_PROMPT_TEXT_MAX = 160;

const HASH_LINK = /^#[a-z0-9-]+$/i;
// Karakter trim() PHP, sama dengan backend. Dipangkas dengan pemindaian linear: regex berjangkar akhir ([...]+$)
// mundur kuadratik pada deretan panjang karakter ini (sama dengan phpTrim() di backend/modules/hero_media.js).
const PHP_TRIM_CHARS = ' \t\n\r\0\x0B';

/** trim() PHP dengan himpunan karakter bawaannya, waktu linear. */
export function phpTrim(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && PHP_TRIM_CHARS.includes(value[start])) start++;
  while (end > start && PHP_TRIM_CHARS.includes(value[end - 1])) end--;
  return value.slice(start, end);
}

/**
 * Teks satu baris seperti disimpan backend: spasi/tab/baris baru beruntun jadi satu spasi, dipangkas, maksimal `max`
 * karakter (per code point); bukan string → ''.
 */
export const promptText = (raw: unknown, max: number): string =>
  typeof raw === 'string' ? Array.from(phpTrim(raw.replace(/[ \t\r\n]+/g, ' '))).slice(0, max).join('') : '';

/**
 * Tautan chip yang aman dipasang: "#anchor" (SmartLink menggulir ke section beranda), path situs ("/template", bukan
 * "//host") atau http(s) absolut (aturan safeMediaUrl); selain itu → null.
 */
export const safeChipHref = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const value = phpTrim(raw);
  return HASH_LINK.test(value) ? value : safeMediaUrl(value);
};

/**
 * `hero_prompt_chips` → daftar chip yang valid (label 1..40 karakter, tautan aman, maks. 6, urutan dipertahankan,
 * entri rusak dibuang). null = setting belum pernah diatur atau bukan JSON array (website memakai chip bawaan);
 * array kosong dari admin dihormati (tanpa chip).
 */
export function readPromptChips(raw: unknown): HeroPromptChip[] | null {
  let items: unknown = raw;
  if (typeof raw === 'string') {
    // Hanya teks JSON array ('[' pertama), sama dengan backend
    if (!/^\s*\[/.test(raw)) return null;
    try {
      items = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(items)) return null;
  const chips: HeroPromptChip[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const { label: rawLabel, href: rawHref } = item as { label?: unknown; href?: unknown };
    const label = promptText(rawLabel, HERO_PROMPT_LABEL_MAX);
    const href = safeChipHref(rawHref);
    if (!label || href === null) continue;
    chips.push({ label, href });
    if (chips.length >= HERO_PROMPT_MAX_CHIPS) break;
  }
  return chips;
}

/** Isian admin apa adanya: judul/placeholder '' bila belum diisi; chip bawaan hanya bila belum pernah diatur. */
export function readHeroPromptDraft(settings: SiteSettings): HeroPromptSettings {
  return {
    title: promptText(settings.hero_prompt_title, HERO_PROMPT_TEXT_MAX),
    placeholder: promptText(settings.hero_prompt_placeholder, HERO_PROMPT_TEXT_MAX),
    chips: readPromptChips(settings.hero_prompt_chips) ?? HERO_PROMPT_CHIPS_DEFAULT.map((chip) => ({ ...chip })),
    // Hanya '0' yang mematikan (sama dengan backend), jadi setting yang belum ada = hidup
    garuda: settings.hero_prompt_garuda !== '0',
  };
}

/** Isi hero Prompt AI seperti dipakai website: teks kosong → bawaan. */
export function parseHeroPrompt(settings: SiteSettings): HeroPromptSettings {
  const draft = readHeroPromptDraft(settings);
  return {
    ...draft,
    title: draft.title || HERO_PROMPT_TITLE_DEFAULT,
    placeholder: draft.placeholder || HERO_PROMPT_PLACEHOLDER_DEFAULT,
  };
}

/** Jalur cadangan kotak prompt bila widget Nexa dimatikan admin: form pesan custom dengan isian "Kebutuhan" = teks ini. */
export const customOrderWithBrief = (text: string): string => `${HUB_PATHS.customOrder}?brief=${encodeURIComponent(text)}`;

export interface PromptHeadline {
  /** true: judul besar adalah H1. false: judul besar <p>, H1 = `keywordH1` (kecil, di atas judul). */
  isH1: boolean;
  keywordH1: string | null;
}

/**
 * SEO judul prompt, aturan yang sama dengan heroHeadline.ts: judul admin menjadi H1 hanya bila memuat frasa
 * "template website"; kalau tidak, judul tetap tampil besar sebagai <p> dan H1 kata kunci (`keyword` = judul bawaan
 * mode Template, tanpa tanda baca akhir) tampil kecil di atasnya. Tepat satu H1 di beranda apa pun gayanya.
 */
export const promptHeadline = (title: string, keyword: string): PromptHeadline =>
  HERO_H1_KEYWORD.test(title) ? { isH1: true, keywordH1: null } : { isH1: false, keywordH1: keyword.replace(/[.!]$/, '') };
