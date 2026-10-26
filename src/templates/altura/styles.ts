// Gaya Altura "Lime landmark": company profile developer properti internasional (referensi pemilik 2026-10-27: Spaciaz,
// Horizon Estate). Kanvas putih, panel krem, pita & kartu zaitun gelap, SATU aksen limau (warna tema dari CMS) untuk
// tombol, lingkaran, dan satu kartu. Judul grotesk geometris Manrope (SIL OFL) rapat (tracking −0.03em), isi Inter.
// Kartu radius 28, tombol pil putih/limau dengan bulatan panah limau di dalam pil. DATAR: tanpa bayangan; garis tipis
// (ring/border) dan bidang warna menggantikan bayangan. Ukuran memakai container query (@…) karena template dirender di
// bingkai HP 390 / panel CMS 1280.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Manrope (Google Fonts, SIL Open Font License), 500–700. */
export const ALTURA_FONT: KitFont = {
  id: 'tpl-font-altura-manrope',
  family: '"Manrope", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Warna netral (tidak ikut warna tema). */
export const C = {
  /** Tinta hampir hitam kehijauan (18:1 di putih, 16:1 di krem) */
  ink: 'text-[#141612]',
  /** Abu zaitun untuk isi: 7:1 di putih, 6,2:1 di krem */
  muted: 'text-[#575A50]',
  /** Panel krem */
  cream: 'bg-[#F2EFE7]',
  /** Garis tipis di latar terang */
  line: 'border-[#141612]/[0.1]',
} as const;

/** Lebar penuh bergutter tipis untuk panel membulat (hero, pita angka, CTA): tepi 10 → 12 → 16px. */
export const OUTER = 'mx-auto w-full max-w-[1760px] px-2.5 @2xl:px-3 @5xl:px-4';

/** Ritme vertikal section: 64 → 88 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-22 @5xl:py-28';

export const TYPE_A = {
  /** H1 hero: 38 → 52 → 56 → 64 → 76 → 88px, rapat */
  h1: `${DISPLAY} font-semibold text-[38px] leading-[1.02] tracking-[-0.04em] @2xl:text-[52px] @5xl:text-[56px] @6xl:text-[64px] @7xl:text-[76px] @min-[96rem]:text-[88px]`,
  /** H2 section: 30 → 40 → 50 → 58px */
  h2: `${DISPLAY} font-semibold text-[30px] leading-[1.08] tracking-[-0.035em] @3xl:text-[40px] @5xl:text-[50px] @min-[96rem]:text-[58px]`,
  /** Judul kartu: 19 → 22px */
  h3: `${DISPLAY} font-semibold text-[19px] leading-snug tracking-[-0.02em] @3xl:text-[22px]`,
  /** Judul kartu besar (pilar, proyek aktif): 24 → 30px */
  h3lg: `${DISPLAY} font-semibold text-[24px] leading-[1.12] tracking-[-0.03em] @3xl:text-[30px]`,
  lead: 'text-[15.5px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13.5px] leading-snug',
  /** Angka raksasa pita angka: 44 → 64 → 84px */
  stat: `${DISPLAY} font-semibold text-[44px] leading-none tracking-[-0.045em] tabular-nums @3xl:text-[64px] @6xl:text-[84px]`,
} as const;

/** Tombol pil. */
const BUTTON = 'inline-flex max-w-full items-center justify-center gap-2.5 rounded-full font-semibold whitespace-nowrap transition-colors duration-300';
export const BTN = {
  /** Warna tema (limau), teks kontras otomatis */
  accent: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Putih bergaris tipis (di latar terang & krem) */
  white: `${BUTTON} bg-white text-[#141612] ring-1 ring-inset ring-[#141612]/[0.1] hover:bg-[#F7F5EF]`,
  /** Putih pejal di atas pita gelap / foto */
  solid: `${BUTTON} bg-white text-[#141612] hover:bg-[#EDEAE1]`,
  /** Tinta gelap */
  ink: `${BUTTON} bg-[#141612] text-white hover:bg-[#2A2D26]`,
  /** Kaca di atas foto */
  glass: `${BUTTON} bg-white/[0.1] text-white ring-1 ring-inset ring-white/30 backdrop-blur-md hover:bg-white/[0.18]`,
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-[52px] px-6 text-[15px]',
} as const;

/** Kartu radius 28 (matriks pembeda: radius 28, gelap zaitun / limau / foto). */
export const CARD = {
  deep: 'rounded-[28px] bg-(--al-deep) text-white',
  accent: 'rounded-[28px] bg-(--tpl-accent) text-(--tpl-on-accent)',
  cream: 'rounded-[28px] bg-[#F2EFE7]',
  white: 'rounded-[28px] bg-white ring-1 ring-inset ring-[#141612]/[0.08]',
} as const;

/** Isian formulir: 16px di HP (iOS tidak memperbesar), garis tipis, fokus cincin tinta. */
export const INPUT =
  'block w-full rounded-[16px] bg-white px-4 text-[16px] text-[#141612] ring-1 ring-inset ring-[#141612]/[0.14] placeholder:text-[#6B6E64] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-[#141612] @3xl:text-[15px]';
