// Gaya Dermaga "Route manifest": company profile ekspor-impor & freight forwarding yang tenang dan presisi. Halaman
// putih, judul Space Grotesk 500 besar, label & angka JetBrains Mono seperti lembar manifest/bill of lading, SATU pita
// penuh warna tema (pasar) dan footer teal-hitam. DATAR: tanpa bayangan; garis tipis 1px (border/divide/ring), tingkat
// warna, dan chip putih di atas foto menggantikan bayangan. Sudut tajam: tombol radius 2px, kartu 4px, foto persegi.
// Warna utama = warna tema dari CMS (--tpl-accent* milik Shell + --dm-* dari ./model, bawaan teal #0F5C63). Ukuran
// memakai container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Space Grotesk (Google Fonts, SIL Open Font License) 400/500. Isi tetap Inter, label JetBrains Mono. */
export const DERMAGA_FONT: KitFont = {
  id: 'tpl-font-space-grotesk',
  family: '"Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Warna netral (tidak ikut warna tema). Kontras dihitung dengan rumus shared/utils. */
export const C = {
  /** Tinta teal-hitam: judul, isi, nilai (17,3:1 di putih) */
  ink: 'text-[#0F1D20]',
  /** Paragraf, label mono, keterangan (7,2:1 di putih; 6,7:1 di kertas) */
  muted: 'text-[#4A5A5E]',
  /** Garis tipis 14% tinta (dekoratif) */
  line: 'border-[#0F1D20]/[0.14]',
  /** Kertas: panel formulir saja */
  paper: 'bg-[#F4F7F7]',
} as const;

/** Label mono kapital (label section, label manifest, kode pelabuhan). */
export const MONO_LABEL = 'font-mono text-[11.5px] font-medium uppercase tracking-[0.12em]';
/** Nilai mono (baris manifest, pelabuhan, keluaran langkah). */
export const MONO_VALUE = 'font-mono text-[13.5px] font-medium tabular-nums tracking-[0.01em]';

export const TYPE_D = {
  /** H1 hero: 32 → 44 → 56 → 72 → 84px */
  h1: `${DISPLAY} font-medium text-balance text-[32px] leading-[1.02] tracking-[-0.04em] @2xl:text-[44px] @5xl:text-[56px] @5xl:leading-[1] @7xl:text-[72px] @min-[96rem]:text-[84px]`,
  /** H2 section: 30 → 40 → 50 → 58px */
  h2: `${DISPLAY} font-medium text-balance text-[30px] leading-[1.06] tracking-[-0.035em] @3xl:text-[40px] @5xl:text-[50px] @5xl:leading-[1.04] @min-[96rem]:text-[58px]`,
  /** Judul kartu & langkah: 19 → 21px */
  h3: `${DISPLAY} font-medium text-[19px] leading-snug tracking-[-0.015em] @3xl:text-[21px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px] @7xl:text-[18px]',
  body: 'text-[15px] leading-relaxed',
  /** Kutipan testimoni */
  quote: `${DISPLAY} font-normal text-[18px] leading-[1.45] tracking-[-0.01em] @3xl:text-[20px]`,
  /** Angka manifest hero (dengan CountUp) */
  stat: 'font-mono font-medium tabular-nums tracking-[-0.03em] text-[26px] leading-none @3xl:text-[30px] @6xl:text-[34px]',
  /** Nama perusahaan sangat besar di footer (cqi = lebar wadah @container Shell) */
  wordmark: `${DISPLAY} font-medium text-balance leading-[0.86] tracking-[-0.05em] text-[clamp(2.75rem,8.6cqi,9rem)]`,
} as const;

/** Tombol persegi tajam (radius 2px), panah bergeser 2px saat disorot. */
const BUTTON =
  'group/btn inline-flex max-w-full items-center justify-center gap-3 rounded-[2px] font-medium whitespace-nowrap transition-colors duration-200';
export const BTN = {
  /** Warna tema, teks kontras otomatis (--tpl-on-accent) */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Tinta (latar terang) */
  ink: `${BUTTON} bg-[#0F1D20] text-white hover:bg-[#1E3236]`,
  /** Putih di pita / footer gelap */
  white: `${BUTTON} bg-white text-[#0F1D20] hover:bg-white/90`,
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-12 px-6 text-[15px] @3xl:h-[52px]',
} as const;

/** Tautan teks bergaris bawah (target sentuh 44px). */
export const TEXT_LINK =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-[#0F1D20] underline decoration-[#0F1D20]/35 decoration-1 underline-offset-[6px] transition-colors hover:text-(--tpl-accent-ink) hover:decoration-(--tpl-accent)';
export const TEXT_LINK_INV =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-white underline decoration-white/50 decoration-1 underline-offset-[6px] transition-colors hover:decoration-white';

/** Kartu datar: transparan, garis 1px, radius 4px; disorot → garis warna tema (tanpa angkat/geser). */
export const CARD = 'rounded-[4px] border border-[#0F1D20]/[0.14] transition-colors duration-200 hover:border-(--tpl-accent)';

/** Ritme vertikal section: 64 → 96 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28';

/** Grid 12 kolom (desktop), jarak 24 → 32 → 48px. */
export const GRID_GAP = 'gap-x-6 @5xl:gap-x-8 @7xl:gap-x-12';

/** Isian formulir: 16px di HP (iOS tidak memperbesar), garis tinta 50% (≥ 3:1), fokus cincin tema versi kontras. */
export const INPUT =
  'block w-full rounded-[2px] bg-white px-3.5 text-[16px] text-[#0F1D20] ring-1 ring-inset ring-[#0F1D20]/50 placeholder:text-[#66767A] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) @3xl:text-[15px]';
