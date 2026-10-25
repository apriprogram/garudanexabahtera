// Gaya PuncakGear "Summit poster": hero foto layar penuh dengan judul huruf kapital raksasa dan tombol pil hijau limau,
// lalu halaman terang berbatu (putih + abu batu #F1F2EE) yang diselingi bagian gelap hutan malam #0E1512 (panel
// panduan, sewa, footer). Judul Archivo 600 rapat, isi Inter; kartu radius 20–28 tanpa bayangan; garis kontur
// topografi sebagai dekorasi. Ukuran memakai container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul lokal (Google Fonts, SIL Open Font License), dimuat lewat useKitFont. */
export const ARCHIVO: KitFont = {
  id: 'tpl-font-archivo',
  family: '"Archivo", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&display=swap',
};

/** Warna tetap (tidak ikut warna aksen). */
export const C = {
  ink: 'text-[#0E1512]',
  /** 6,3:1 di putih, 5,6:1 di #F1F2EE */
  muted: 'text-[#59625C]',
  /** Abu batu: pita latar terang */
  stone: 'bg-[#F1F2EE]',
  /** Hutan malam: latar gelap */
  night: 'bg-[#0E1512]',
} as const;

export const DISPLAY = `${FONT_DISPLAY} font-semibold`;

export const TYPE_P = {
  /** Judul poster hero: 52 → 76 → 104 → 124 → 136px, huruf kapital */
  mega: `${FONT_DISPLAY} font-semibold uppercase leading-[0.88] tracking-[-0.035em] text-[52px] @2xl:text-[76px] @5xl:text-[104px] @7xl:text-[124px] @min-[96rem]:text-[136px]`,
  /** H2 section: 32 → 42 → 50 → 56px */
  h2: `${DISPLAY} text-[32px] leading-[1.04] tracking-[-0.03em] @3xl:text-[42px] @5xl:text-[50px] @min-[96rem]:text-[56px]`,
  /** Judul kartu: 18 → 20px */
  h3: `${DISPLAY} text-[18px] leading-snug tracking-[-0.015em] @3xl:text-[20px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
  /** Label huruf kapital kecil (menu, keterangan) */
  caps: 'text-[12px] font-semibold uppercase tracking-[0.14em]',
} as const;

/** Tombol pil. Isi: label + panah (lihat <PillLink> di ./ui). */
const PILL = 'inline-flex items-center justify-center gap-2.5 rounded-full font-semibold whitespace-nowrap transition-colors';
export const BTN = {
  /** Aksen (hijau limau) di atas foto/latar gelap; garis luar tipis seperti tombol referensi */
  accent: `${PILL} bg-(--tpl-accent) text-(--tpl-on-accent) outline outline-1 outline-offset-[3px] outline-white/55 hover:bg-(--tpl-accent-hover)`,
  /** Aksen tanpa garis luar (di dalam kartu gelap) */
  accentFlat: `${PILL} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Tinta + putih di latar terang (17:1) */
  ink: `${PILL} bg-[#0E1512] text-white hover:bg-[#25302A]`,
  /** Garis putih di atas foto */
  outlineLight: `${PILL} text-white ring-1 ring-inset ring-white/70 hover:bg-white/10`,
  /** Garis tinta di latar terang */
  outlineDark: `${PILL} text-[#0E1512] ring-1 ring-inset ring-[#0E1512]/25 hover:bg-black/[0.04]`,
  sm: 'h-10 px-5 text-[13px]',
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-12 px-6 text-[14px] @3xl:h-[52px] @3xl:px-7',
} as const;

/** Kartu datar tanpa bayangan. */
export const CARD = {
  stone: 'rounded-[24px] bg-[#F1F2EE]',
  white: 'rounded-[24px] bg-white',
  /** Bidang gambar produk (abu batu terang) */
  shelf: 'rounded-[20px] bg-[#E9ECE6]',
} as const;
