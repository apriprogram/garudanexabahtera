// Judul hero beranda (docs/platform/SEO-PLAN.md §5.6 langkah 4): tepat SATU H1 statis yang memuat "template website".
//
// - Judul besar mode Template = H1. Teksnya dari setting admin `hero_title` (Pengaturan website → Hero → "Judul utama")
//   bila admin mengisinya DAN memuat frasa "template website"; kosong → judul bawaan (useTranslation.ts).
// - Admin mengisi judul TANPA frasa itu → judul admin tetap tampil sebagai judul besar (<p>), dan H1 kata kunci bawaan
//   tampil kecil di atas toggle mode. Kendali admin tetap ada, H1 tetap memuat kata kunci.
// - Judul mode Custom selalu <p> (berganti saat pengunjung memilih mode), jadi tidak pernah menjadi H1.
// - Nilai lama bahasa Inggris dari seed ("Leading With Vision, …") diabaikan; migration 2026-10-23_009 juga
//   mengosongkannya.
// Modul murni: dipakai HeroIntro (server & klien sama, settings dari data preload) dan tes.

/** Frasa wajib di H1 beranda. */
export const HERO_H1_KEYWORD = /template\s+website/i;

/** Nilai seed lama yang tidak pernah dipakai website publik. */
const LEGACY_TITLES = new Set(['leading with vision, moving with purpose']);

export interface HeadlineText {
  /** Bagian pertama judul (warna judul). */
  lead: string;
  /** Bagian kedua (warna aksen); boleh kosong. */
  accent: string;
}

export interface HeroHeadline extends HeadlineText {
  /** true: judul besar mode Template adalah H1. false: judul besar <p>, H1 = `keywordH1` (kecil, di atas toggle). */
  isH1: boolean;
  /** Teks H1 kata kunci bila `isH1` false. */
  keywordH1: string | null;
}

const clean = (value: string) => value.replace(/[ \t]+/g, ' ').trim();

/**
 * "Judul, aksen." → lead "Judul," + accent "aksen.". Baris baru (admin menekan Enter) memisah lebih dulu; tanpa
 * keduanya seluruh teks menjadi lead.
 */
export function splitHeadline(text: string): HeadlineText {
  const value = text.replace(/\r\n?/g, '\n').trim();
  const newline = value.indexOf('\n');
  if (newline > 0) return { lead: clean(value.slice(0, newline)), accent: clean(value.slice(newline + 1).replace(/\n+/g, ' ')) };
  const single = clean(value);
  const comma = single.indexOf(', ');
  if (comma > 0 && comma < single.length - 2) return { lead: single.slice(0, comma + 1), accent: single.slice(comma + 2) };
  return { lead: single, accent: '' };
}

const joinHeadline = ({ lead, accent }: HeadlineText) => clean(`${lead} ${accent}`);

/** Judul hero mode Template dari setting admin + judul bawaan (yang wajib memuat kata kunci). */
export function heroHeadline(settings: Record<string, unknown> | null | undefined, fallback: HeadlineText): HeroHeadline {
  const raw = typeof settings?.hero_title === 'string' ? settings.hero_title.trim() : '';
  const usable = raw !== '' && !LEGACY_TITLES.has(clean(raw).toLowerCase());
  if (!usable) return { ...fallback, isH1: true, keywordH1: null };
  const admin = splitHeadline(raw);
  if (HERO_H1_KEYWORD.test(joinHeadline(admin))) return { ...admin, isH1: true, keywordH1: null };
  return { ...admin, isH1: false, keywordH1: joinHeadline(fallback).replace(/[.!]$/, '') };
}
