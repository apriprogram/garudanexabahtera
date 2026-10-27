// Gaya Jumantara "Clean institutional": website SMA negeri yang tenang dan rapi seperti lembaga publik yang terurus.
// Halaman putih, SATU warna kobalt (warna tema dari CMS), pita kobalt-hitam (--jm-night, diturunkan dari warna tema)
// untuk bilah utilitas, SPMB, dan footer, garis rambut 1px sebagai pengganti bayangan, radius 10–12 (tanpa pil), judul
// Onest dengan angka tabular. DATAR: tanpa bayangan sama sekali; kartu memakai border 1px (bukan ring Tailwind, yang
// sebenarnya bayangan CSS) sehingga hover cukup mengganti warna garis. Ukuran memakai container query (@…) karena template dirender
// di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';
import { postTheme } from '../shared/posts/theme';

/** Huruf judul: Onest (Google Fonts, SIL Open Font License); isi tetap Inter dari Shell. */
export const JUMANTARA_FONT: KitFont = {
  id: 'tpl-font-onest',
  family: '"Onest", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Onest:wght@500;600;700&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Warna netral tetap (tidak ikut warna tema). */
export const C = {
  /** Tinta (18:1 di putih) */
  ink: 'text-[#0E1525]',
  /** 7,7:1 di putih, 7:1 di --jm-tint */
  muted: 'text-[#4A5368]',
} as const;

/** Garis rambut 8% tinta (border & divide). */
export const LINE = 'border-[#0E1525]/[0.08]';
export const DIVIDE = 'divide-[#0E1525]/[0.08]';

/** Label kecil kapital berjarak. */
export const LABEL = 'text-[12px] font-semibold uppercase tracking-[0.14em]';

export const TYPE_J = {
  /** H1 hero: 32 → 44 → 54 → 62 → 68px */
  h1: `${DISPLAY} font-semibold text-[32px] leading-[1.08] tracking-[-0.03em] @2xl:text-[44px] @5xl:text-[54px] @7xl:text-[62px] @min-[96rem]:text-[68px]`,
  /** H2 section: 28 → 34 → 40 → 44px */
  h2: `${DISPLAY} font-semibold text-[28px] leading-[1.12] tracking-[-0.025em] @3xl:text-[34px] @5xl:text-[40px] @min-[96rem]:text-[44px]`,
  /** H2 kolom (Pengumuman, Agenda): 24 → 28px */
  h2Small: `${DISPLAY} font-semibold text-[24px] leading-[1.15] tracking-[-0.02em] @3xl:text-[28px]`,
  /** Judul kartu: 17 → 19px */
  h3: `${DISPLAY} font-semibold text-[17px] leading-snug tracking-[-0.01em] @3xl:text-[19px]`,
  /** Kutipan sambutan: 21 → 25px */
  quote: `${DISPLAY} font-medium text-[21px] leading-[1.35] tracking-[-0.015em] @3xl:text-[25px]`,
  lead: 'text-[16px] leading-[1.6] @3xl:text-[18px]',
  body: 'text-[15.5px] leading-[1.65]',
  small: 'text-[13.5px] leading-snug',
  /** Angka statistik: Onest tabular 34 → 40 → 48px */
  stat: `${DISPLAY} font-semibold tabular-nums text-[34px] leading-none tracking-[-0.02em] @3xl:text-[40px] @6xl:text-[48px]`,
} as const;

/** Kartu radius 12: putih bergaris rambut, bidang tint datar, atau kartu di pita gelap. */
export const CARD = {
  white: 'rounded-[12px] border border-[#0E1525]/[0.08] bg-white transition-colors duration-200',
  tint: 'rounded-[12px] border border-transparent bg-(--jm-tint) transition-colors duration-200',
  dark: 'rounded-[12px] border border-white/[0.12] bg-white/[0.04]',
} as const;

/** Tombol persegi radius 10 (tanpa pil). */
const BUTTON = 'inline-flex max-w-full items-center justify-center gap-2 rounded-[10px] font-semibold whitespace-nowrap transition-colors duration-200';
export const BTN = {
  /** Warna tema, teks kontras otomatis (--tpl-on-accent) */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Bergaris di latar terang */
  outline: `${BUTTON} border border-[#0E1525]/[0.16] bg-white text-[#0E1525] hover:border-(--jm-ink) hover:text-(--jm-ink)`,
  /** Garis putih di atas foto / pita gelap */
  ghostLight: `${BUTTON} border border-white/55 text-white hover:bg-white/10`,
  /** Putih di pita gelap */
  white: `${BUTTON} bg-white text-[#0E1525] hover:bg-(--jm-tint)`,
  md: 'h-11 px-5 text-[14.5px]',
  lg: 'h-12 px-6 text-[15px]',
} as const;

/** Tautan teks dengan panah (warna ditambahkan terpisah: text-(--jm-ink) di latar terang, putih di pita gelap). */
export const TEXT_LINK = 'group inline-flex min-h-11 items-center gap-1.5 text-[14.5px] font-semibold underline-offset-4 hover:underline';

/** Chip kecil radius 6 (label, mapel, kuota). */
export const CHIP = 'inline-flex h-7 max-w-full items-center rounded-[6px] bg-(--jm-tint) px-2.5 text-[12px] font-semibold text-(--jm-ink)';

/** Label "Penting" / "Wajib" merah lembut (5,8:1). */
export const URGENT = 'inline-flex h-6 items-center rounded-[6px] bg-[#FDECEC] px-2 text-[12px] font-semibold text-[#B42318]';

/**
 * Isian formulir: 16px di HP (iOS tidak memperbesar), garis rambut, fokus = garis tinta tema + cincin fokus bersama.
 * Warna garis terpisah (INPUT_LINE / INPUT_ERROR) agar tidak ada dua kelas warna garis di satu elemen.
 */
export const INPUT =
  'block w-full rounded-[10px] border bg-white px-4 text-[16px] text-[#0E1525] placeholder:text-[#6B7385] transition-colors focus:border-(--tpl-accent-ink) @3xl:text-[15px]';
export const INPUT_LINE = 'border-[#0E1525]/[0.16]';
export const INPUT_ERROR = 'border-[#B42318]';

/** Ritme vertikal section: 64 → 80 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-20 @5xl:py-28';

/** Halaman berita & pengumuman (/berita, /berita/{slug}; shared/posts) dengan token Jumantara. */
export const POST_THEME = postTheme({
  display: `${DISPLAY} font-semibold`,
  heading: C.ink,
  body: 'text-[#1F2737]',
  muted: C.muted,
  accent: 'text-(--jm-ink)',
  chip: 'bg-(--jm-tint) text-(--jm-ink)',
  urgent: 'bg-[#FDECEC] text-[#B42318]',
  warn: 'bg-[#FEF3E2] text-[#93370D]',
  filterOn: 'bg-(--tpl-accent) text-(--tpl-on-accent)',
  filterOff: 'bg-white text-[#0E1525] border border-[#0E1525]/[0.1] hover:border-(--jm-line)',
  soft: 'bg-(--jm-tint)',
  card: 'bg-white border border-[#0E1525]/[0.08]',
  line: 'border-[#0E1525]/[0.08]',
  radius: 'rounded-[12px]',
  photoRadius: 'rounded-[12px]',
  button: `${BTN.primary} ${BTN.md}`,
  buttonGhost: `${BTN.outline} ${BTN.md}`,
});

/**
 * Papan pengumuman profesional di pita tint (Notices): ubin tanggal & label biasa putih bergaris rambut, seperti label
 * pengumuman versi dasar; tint di atas tint tidak terlihat.
 */
export const POST_THEME_BAND = postTheme({
  ...POST_THEME,
  chip: `bg-white text-(--jm-ink) border ${LINE}`,
  soft: `bg-white border ${LINE}`,
});
