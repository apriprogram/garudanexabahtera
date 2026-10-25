// Gaya GadgetKu.id "Clean store" (referensi pemilik: Bose, Lanot, furnmart): toko hitam-putih yang bersih, judul Inter
// Tight 500 rapat, isi Inter; tombol pil hitam (latar terang) atau mint (latar gelap) dengan panah; ubin produk abu
// muda radius 20; kartu foto besar radius 24–32 dengan label dan panah; panel gelap #0B0C0E untuk hero, strip layanan,
// dan footer. Datar: tanpa bayangan, pemisah memakai ring tipis. Ukuran memakai container query (@…) karena template
// dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul lokal (Google Fonts, SIL Open Font License), dimuat lewat useKitFont. */
export const INTER_TIGHT: KitFont = {
  id: 'tpl-font-inter-tight',
  family: '"Inter Tight", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600&display=swap',
};

/** Warna tetap (tidak ikut warna aksen). */
export const C = {
  ink: 'text-[#0B0C0E]',
  /** 6,2:1 di putih, 5,6:1 di #F2F3F5 */
  muted: 'text-[#575C65]',
  surface: 'bg-[#F2F3F5]',
  night: 'bg-[#0B0C0E]',
} as const;

export const DISPLAY = `${FONT_DISPLAY} font-medium`;

export const TYPE_G = {
  /** H1 hero: 38 → 50 → 60 → 72 → 80px */
  h1: `${DISPLAY} text-[38px] leading-[1.02] tracking-[-0.04em] @2xl:text-[50px] @5xl:text-[60px] @7xl:text-[72px] @min-[96rem]:text-[80px]`,
  /** H2 section: 30 → 38 → 44 → 52px */
  h2: `${DISPLAY} text-[30px] leading-[1.06] tracking-[-0.035em] @3xl:text-[38px] @5xl:text-[44px] @min-[96rem]:text-[52px]`,
  /** H2 kecil di panel (strip layanan): 26 → 32px */
  h2sm: `${DISPLAY} text-[26px] leading-[1.1] tracking-[-0.03em] @3xl:text-[32px]`,
  /** Judul kartu: 18 → 20px */
  h3: `${DISPLAY} text-[18px] leading-snug tracking-[-0.02em] @3xl:text-[20px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
  /** Harga di kartu */
  price: `${FONT_DISPLAY} font-semibold tabular-nums tracking-[-0.02em]`,
} as const;

/** Tombol pil. Isi: label + panah (lihat <PillLink> di ./ui). */
const PILL = 'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors';
export const BTN = {
  /** Hitam + putih di latar terang (19:1) */
  ink: `${PILL} bg-[#0B0C0E] text-white hover:bg-[#26282C]`,
  /** Aksen yang dicerahkan + tinta di latar gelap (≥ 7:1) */
  glow: `${PILL} bg-(--gk-on-dark) text-[#0B0C0E] hover:brightness-110`,
  /** Putih + tinta di latar gelap */
  white: `${PILL} bg-white text-[#0B0C0E] hover:bg-white/90`,
  /** Garis tipis putih di latar gelap */
  ghostDark: `${PILL} text-white ring-1 ring-inset ring-white/30 hover:bg-white/10`,
  /** Garis tipis di latar terang */
  ghost: `${PILL} text-[#0B0C0E] ring-1 ring-inset ring-black/[0.14] hover:bg-black/[0.04]`,
  sm: 'h-10 px-4 text-[14px]',
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-12 px-6 text-[15px] @3xl:h-[52px]',
} as const;

/** Bidang datar. */
export const CARD = {
  /** Ubin abu muda (produk, ulasan, kontak) */
  tile: 'rounded-[20px] bg-[#F2F3F5]',
  /** Panel besar (cari per tipe HP, custom casing) */
  panel: 'rounded-[28px] @3xl:rounded-[36px]',
  white: 'rounded-[24px] bg-white',
} as const;

/** Chip pilihan (merek, tipe HP, kategori, warna): putih / hitam saat terpilih. */
export const CHIP =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors aria-pressed:bg-[#0B0C0E] aria-pressed:text-white';
