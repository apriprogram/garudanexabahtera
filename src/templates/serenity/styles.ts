// Gaya Serenity "Calm horizon": hero foto layar penuh bernuansa senja, lalu halaman terang yang lapang. Judul Outfit
// 500 (geometris lembut, lh rapat), isi Inter; kata sorotan bergradasi (pastel di atas foto, tinta aksen→biru di latar
// terang); tombol pil (putih di atas foto, tinta di latar terang) dengan panah; kartu radius 28 berisi abu lavender
// TANPA bayangan dan tanpa garis; kaca tipis hanya di atas foto. Ukuran memakai container query (@…) karena template
// dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul lokal (Google Fonts, SIL Open Font License), dimuat lewat useKitFont. */
export const OUTFIT: KitFont = {
  id: 'tpl-font-outfit',
  family: '"Outfit", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap',
};

/** Warna tetap (tidak ikut warna aksen). */
export const C = {
  ink: 'text-[#151833]',
  /** 6,2:1 di putih, 5,8:1 di #F5F4FA */
  muted: 'text-[#565B76]',
  surface: 'bg-[#F5F4FA]',
} as const;

export const DISPLAY = `${FONT_DISPLAY} font-medium`;

export const TYPE_S = {
  /** H1 hero: 40 → 54 → 64 → 76 → 84px */
  h1: `${DISPLAY} text-[40px] leading-[1.04] tracking-[-0.03em] @2xl:text-[54px] @5xl:text-[64px] @7xl:text-[76px] @min-[96rem]:text-[84px]`,
  /** H2 section: 32 → 40 → 48 → 54px */
  h2: `${DISPLAY} text-[32px] leading-[1.08] tracking-[-0.03em] @3xl:text-[40px] @5xl:text-[48px] @min-[96rem]:text-[54px]`,
  /** Judul kartu: 20 → 22px */
  h3: `${DISPLAY} text-[20px] leading-snug tracking-[-0.015em] @3xl:text-[22px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px] @7xl:text-[18px]',
  body: 'text-[15px] leading-relaxed @3xl:text-[16px]',
  /** Angka di section Tentang */
  stat: `${FONT_DISPLAY} text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums @3xl:text-[40px]`,
} as const;

/** Tombol pil. Isi: label + panah (lihat <PillLink> di ./ui). */
const PILL = 'inline-flex items-center justify-center gap-2.5 rounded-full font-medium whitespace-nowrap transition-colors';
export const BTN = {
  /** Putih + tinta di atas foto (16:1) */
  white: `${PILL} bg-white text-[#151833] hover:bg-white/90`,
  /** Tinta + putih di latar terang (16:1) */
  ink: `${PILL} bg-[#151833] text-white hover:bg-[#2A2E52]`,
  /** Garis tipis di latar terang */
  ghost: `${PILL} text-[#151833] ring-1 ring-inset ring-black/[0.12] hover:bg-black/[0.03]`,
  /** Kaca di atas foto */
  glass: `${PILL} bg-white/[0.12] text-white ring-1 ring-inset ring-white/30 backdrop-blur-md hover:bg-white/20`,
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-12 px-6 text-[15px] @3xl:h-[52px]',
} as const;

/** Kaca tipis di atas foto (hanya hero & ajakan): latar gelap tembus agar teks putih ≥ 4,5:1 di atas langit/pita terang. */
export const GLASS = 'bg-[#0E1A3A]/55 ring-1 ring-inset ring-white/20 backdrop-blur-xl';

/** Kartu datar: abu lavender radius 28 tanpa garis; kartu putih di atas pita abu. */
export const CARD = {
  soft: 'rounded-[28px] bg-[#F5F4FA]',
  white: 'rounded-[28px] bg-white',
} as const;
