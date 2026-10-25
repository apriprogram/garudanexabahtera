// Gaya SkyNusa "Spec sheet": toko drone bernuansa lembar spesifikasi teknis. Kanvas abu kebiruan dingin dengan garis
// kisi tipis, judul Inter Tight 400 besar dan rapat, label kecil berhuruf mono (seperti keterangan teknis), kartu angka
// spesifikasi, foto produk di panggung abu terang, dan pita gelap teal-arang yang berselang-seling dengan pita terang.
// Tombol: persegi membulat kecil (radius 10) gelap dengan kotak panah; di pita gelap tombol mint (aksen dipucatkan).
// Datar: tanpa bayangan, garis tipis menggantikan bayangan. Ukuran memakai container query (@…) karena template
// dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul lokal (Google Fonts, SIL Open Font License), dimuat lewat useKitFont. */
export const INTER_TIGHT: KitFont = {
  id: 'tpl-font-inter-tight',
  family: '"Inter Tight", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&display=swap',
};

/** Warna tetap (tidak ikut warna aksen). */
export const C = {
  ink: 'text-[#0E1A1C]',
  /** 5,9:1 di kanvas #E9EEEF, 6,6:1 di putih */
  muted: 'text-[#4E5D61]',
  /** Kanvas abu kebiruan (hero, garansi) */
  canvas: 'bg-[#E9EEEF]',
  /** Abu sangat muda (pita produk, kartu di atas putih) */
  surface: 'bg-[#F2F5F5]',
  /** Pita gelap teal-arang */
  dark: 'bg-[#0F191B]',
} as const;

export const DISPLAY = `${FONT_DISPLAY} font-normal`;

/** Label teknis kecil berhuruf mono (huruf sistem, tanpa unduhan tambahan). */
export const MONO = 'font-mono text-[11.5px] font-medium uppercase tracking-[0.14em]';

/** Mono huruf biasa (spesifikasi produk, keterangan foto). */
export const MONO_PLAIN = 'font-mono text-[12px] font-medium tracking-[0.02em]';

export const TYPE_S = {
  /** H1 hero: 40 → 52 → 60 → 72 → 80px */
  h1: `${DISPLAY} text-[40px] leading-[1.02] tracking-[-0.04em] @2xl:text-[52px] @5xl:text-[60px] @7xl:text-[72px] @min-[96rem]:text-[80px]`,
  /** H2 section: 30 → 40 → 48 → 54px */
  h2: `${DISPLAY} text-[30px] leading-[1.06] tracking-[-0.035em] @3xl:text-[40px] @5xl:text-[48px] @min-[96rem]:text-[54px]`,
  /** Judul kartu: 19 → 21px */
  h3: `${FONT_DISPLAY} font-medium text-[19px] leading-snug tracking-[-0.02em] @3xl:text-[21px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px] @7xl:text-[18px]',
  body: 'text-[15px] leading-relaxed',
  /** Angka spesifikasi besar (kartu "≤50 mK", "0.02°") */
  stat: `${DISPLAY} text-[40px] leading-none tracking-[-0.045em] tabular-nums @3xl:text-[48px] @7xl:text-[56px]`,
  /** Harga di kartu produk/paket */
  price: `${FONT_DISPLAY} font-medium text-[22px] leading-none tracking-[-0.03em] tabular-nums @3xl:text-[24px]`,
} as const;

/** Tombol persegi membulat. Isi: label + kotak panah (lihat <ButtonLink> di ./ui). */
const BUTTON = 'inline-flex items-center justify-center gap-3 rounded-[10px] font-medium whitespace-nowrap transition-colors';
export const BTN = {
  /** Tinta gelap di latar terang (16:1) */
  ink: `${BUTTON} bg-[#0E1A1C] text-white hover:bg-[#1F3034]`,
  /** Putih bergaris tipis di latar terang */
  light: `${BUTTON} bg-white text-[#0E1A1C] ring-1 ring-inset ring-black/[0.1] hover:bg-[#F2F5F5]`,
  /** Mint di pita gelap (≥ 8:1 terhadap tinta) */
  mint: `${BUTTON} bg-(--sn-mint) text-[#0E1A1C] hover:bg-(--sn-mint-hover)`,
  /** Kaca di pita gelap / foto */
  glass: `${BUTTON} bg-white/[0.08] text-white ring-1 ring-inset ring-white/20 hover:bg-white/[0.14]`,
  sm: 'h-10 pl-4 pr-1.5 text-[14px]',
  md: 'h-11 pl-4 pr-1.5 text-[14px]',
  lg: 'h-12 pl-5 pr-2 text-[15px]',
} as const;

/** Kartu datar: putih/abu bergaris tipis, radius 16 (Aerova memakai radius kecil). */
export const CARD = {
  white: 'rounded-[16px] bg-white ring-1 ring-inset ring-black/[0.06]',
  soft: 'rounded-[16px] bg-[#F2F5F5] ring-1 ring-inset ring-black/[0.04]',
  /** Kartu di pita gelap */
  dark: 'rounded-[16px] bg-white/[0.04] ring-1 ring-inset ring-white/[0.09]',
} as const;

/** Kaca terang di atas foto (kartu spesifikasi hero): putih tembus + blur, tanpa bayangan. */
export const GLASS = 'bg-white/80 ring-1 ring-inset ring-white/70 backdrop-blur-xl';
