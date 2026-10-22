// Gaya Finova "Forest & lime" (brief §3.2–§3.3, §4.3): kontras tinggi gelap/terang bergantian, limau HANYA sebagai
// latar tombol/chip dan sorotan di latar gelap, grotesk rapat (Inter 500, tracking −0.045em), angka raksasa dengan
// superskrip, kartu bento abu radius 24 TANPA ring, kartu UI putih radius 16 ber-ring tipis, label section = chip
// kecil bertitik. Ukuran memakai container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import { FONT_DISPLAY } from '../shared/layout';

/** Warna tetap (tidak ikut warna merek): tinta, teks redup, permukaan abu, teks redup di panel gelap. */
export const C = {
  ink: 'text-[#0B0F0E]',
  /** 5,8:1 di putih, 5,2:1 di #F1F3F2 */
  muted: 'text-[#5A6863]',
  surface: 'bg-[#F1F3F2]',
  /** Teks isi di panel gelap: ≥ 6:1 di --fin-deep */
  onDark: 'text-[#B9C6C1]',
} as const;

/** Judul grotesk rapat. */
export const DISPLAY = `${FONT_DISPLAY} font-medium tracking-[-0.045em]`;

export const TYPE_F = {
  /** H1 panel: 36 → 48 → 52 → 60 → 68 → 76px */
  h1: `${DISPLAY} text-[36px] leading-[1.04] @2xl:text-[48px] @5xl:text-[52px] @6xl:text-[60px] @7xl:text-[68px] @min-[96rem]:text-[76px]`,
  /** H2 section: 30 → 40 → 48 → 54px */
  h2: `${DISPLAY} text-[30px] leading-[1.08] @3xl:text-[40px] @5xl:text-[48px] @min-[96rem]:text-[54px]`,
  /** Judul kartu bento: 21 → 24px */
  h3: `${DISPLAY} text-[21px] leading-[1.2] tracking-[-0.03em] @3xl:text-[24px]`,
  /** Angka raksasa: 60 → 64 → 76 → 88px */
  stat: `${FONT_DISPLAY} text-[60px] font-medium leading-none tracking-[-0.06em] tabular-nums @3xl:text-[64px] @6xl:text-[76px] @7xl:text-[88px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
  /** Nominal di kartu UI */
  mono: 'font-mono tabular-nums tracking-[-0.02em]',
} as const;

/** Tombol pil. Isi: label + chip panah bulat (lihat <ArrowChip> di ./ui). */
const PILL = 'inline-flex items-center justify-center gap-3 rounded-full font-medium whitespace-nowrap transition-colors';
export const BTN = {
  /** Limau + tinta (12,7:1). Di latar terang beri ring tipis agar batas tombol tetap terlihat. */
  lime: `${PILL} bg-(--fin-hl) text-(--fin-on-hl) hover:brightness-95`,
  limeOnLight: 'ring-1 ring-inset ring-black/10',
  /** Garis putih di panel gelap */
  ghostDark: `${PILL} text-white ring-1 ring-inset ring-white/25 hover:bg-white/10`,
  /** Tinta pekat di latar terang (tombol unduh footer, WhatsApp kontak) */
  ink: `${PILL} bg-[#0B0F0E] text-white hover:bg-[#1C2422]`,
  /** Tinggi: tombol dengan chip panah memakai padding kiri lebih lebar, kanan tipis */
  md: 'h-11 pl-5 pr-1.5 text-[14px]',
  lg: 'h-[52px] pl-6 pr-1.5 text-[15px]',
  plainMd: 'h-11 px-5 text-[14px]',
  plainLg: 'h-[52px] px-6 text-[15px]',
} as const;

/** Kartu bento abu tanpa ring; kartu UI putih ber-ring tipis radius 16. */
export const CARD = {
  bento: 'rounded-[24px] bg-[#F1F3F2]',
  ui: 'rounded-2xl bg-white ring-1 ring-black/[0.07]',
} as const;

/** Ritme vertikal Finova (sedikit lebih rapat dari bersama). */
export const SECTION_F = 'py-16 @3xl:py-24 @5xl:py-28';
