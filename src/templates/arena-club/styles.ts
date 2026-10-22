// Gaya Arena Club "Sky court" (brief §1.2–§1.3, §4.1): lapang, biru langit (aksen) + navy tetap, kartu besar radius
// 28–32 berisi warna pejal TANPA garis tepi, judul Urbanist tipis, tombol selalu pil dengan ↗, label section = pil
// kecil bergaris. Ukuran memakai container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import { FONT_DISPLAY } from '../shared/layout';

/** Warna tetap (tidak ikut aksen): navy tombol/kartu gelap/footer, permukaan abu kebiruan, tinta, teks redup. */
export const NAVY = '#0E1B2E';
export const C = {
  navyBg: 'bg-[#0E1B2E]',
  surface: 'bg-[#F6F8FC]',
  ink: 'text-[#0B1220]',
  /** 5,98:1 di putih, 5,63:1 di #F6F8FC */
  muted: 'text-[#5B6472]',
} as const;

/** Judul (Urbanist) tipis lapang. */
export const DISPLAY = `${FONT_DISPLAY} tracking-[-0.03em]`;

export const TYPE_A = {
  /** H1 banner: 34 → 48 → 60 → 72 → 80px, ketebalan 300 */
  h1: `${DISPLAY} text-[34px] font-light leading-[1.06] @2xl:text-[48px] @5xl:text-[60px] @7xl:text-[72px] @min-[96rem]:text-[80px]`,
  /** H2 section: 28 → 36 → 44 → 52px, ketebalan 400 */
  h2: `${DISPLAY} text-[28px] font-normal leading-[1.12] @3xl:text-[36px] @5xl:text-[44px] @min-[96rem]:text-[52px]`,
  /** Pernyataan "Tentang" & judul kecil kiri: 22 → 28 → 36px */
  statement: `${DISPLAY} text-[22px] font-normal leading-[1.3] tracking-[-0.02em] @3xl:text-[28px] @5xl:text-[34px] @min-[96rem]:text-[38px]`,
  /** Judul kecil kolom kiri (Program): 24 → 28px */
  side: `${DISPLAY} text-[24px] font-normal leading-[1.25] tracking-[-0.02em] @3xl:text-[28px]`,
  /** Angka besar */
  stat: `${DISPLAY} font-light leading-none tracking-[-0.04em] tabular-nums`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
} as const;

/** Tombol pil. Isi label + ikon ↗ (ArrowUpRight) di dalam pil. */
const PILL = 'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors';
export const BTN = {
  /** Navy + teks putih (17,3:1) */
  navy: `${PILL} bg-[#0E1B2E] text-white hover:bg-[#1A2C47]`,
  /** Aksen + teks otomatis (ink di biru langit, 7,35:1) — untuk di atas foto/navy */
  accent: `${PILL} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Garis putih di atas foto */
  ghostLight: `${PILL} text-white ring-1 ring-inset ring-white/60 hover:bg-white/10`,
  /** Garis tinta di atas putih/abu */
  ghost: `${PILL} text-[#0B1220] ring-1 ring-inset ring-[#0B1220]/15 hover:bg-[#0B1220]/[0.04]`,
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-12 px-6 text-[15px]',
} as const;

/** Kartu pejal besar tanpa garis. */
export const CARD = {
  radius: 'rounded-[24px] @3xl:rounded-[28px] @5xl:rounded-[32px]',
  surface: 'bg-[#F6F8FC]',
} as const;

/** Rel gulir horizontal (snap) tanpa batang gulir. */
export const RAIL =
  'flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden @3xl:gap-5';
