// Gaya GlowStory "Warm ritual": halaman krem hangat seperti katalog keramik, judul serif tipis (Instrument Serif)
// dengan satu kata MIRING berwarna terakota, label kecil berhuruf mono kapital, foto membulat tanpa bayangan, kartu
// produk di bidang pasir lembut, pita gelap cokelat tua untuk strip berjalan & footer, dan pita terakota untuk ajakan.
// Ukuran memakai container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul lokal (Google Fonts, SIL Open Font License): satu ketebalan + miring, dimuat lewat useKitFont. */
export const INSTRUMENT: KitFont = {
  id: 'tpl-font-instrument-serif',
  family: '"Instrument Serif", "Iowan Old Style", "Times New Roman", ui-serif, Georgia, serif',
  href: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap',
};

/** Warna tetap (tidak ikut warna aksen). Kontras dihitung terhadap krem #F6F1EA. */
export const C = {
  /** Krem halaman */
  page: 'bg-[#F6F1EA]',
  /** Pasir lembut: kartu produk, panel kuis */
  sand: 'bg-[#EDE5D9]',
  /** Putih gading: kartu di atas pasir */
  ivory: 'bg-[#FCFAF6]',
  /** Cokelat tua: strip berjalan, footer, tombol gelap */
  dark: 'bg-[#2B211C]',
  ink: 'text-[#2B211C]',
  /** 5,3:1 di krem, 4,8:1 di pasir */
  muted: 'text-[#6B5D53]',
} as const;

export const SERIF = `${FONT_DISPLAY} font-normal`;

/** Label kecil: mono kapital berjarak (seperti "EST. 2018 — WHEEL-THROWN") */
export const MONO = 'font-mono text-[11.5px] font-medium uppercase tracking-[0.18em]';

export const TYPE_G = {
  /** H1 hero: 46 → 60 → 72 → 84 → 96px */
  h1: `${SERIF} text-[46px] leading-[0.98] tracking-[-0.025em] @2xl:text-[60px] @5xl:text-[72px] @7xl:text-[84px] @min-[96rem]:text-[96px]`,
  /** H2 section: 36 → 46 → 54 → 60px */
  h2: `${SERIF} text-[36px] leading-[1.02] tracking-[-0.02em] @3xl:text-[46px] @5xl:text-[54px] @min-[96rem]:text-[60px]`,
  /** Judul kartu: 22 → 24px */
  h3: `${SERIF} text-[22px] leading-[1.12] tracking-[-0.01em] @3xl:text-[24px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
} as const;

/** Tombol pil. Isi: label + panah (lihat <PillLink> di ./ui). */
const PILL = 'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors';
export const BTN = {
  /** Warna aksen (terakota) + teks otomatis putih/tinta */
  accent: `${PILL} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--gs-accent-hover)`,
  /** Cokelat tua + krem (14:1) */
  dark: `${PILL} bg-[#2B211C] text-[#F6F1EA] hover:bg-[#45372F]`,
  /** Krem di atas pita gelap/aksen */
  cream: `${PILL} bg-[#F6F1EA] text-[#2B211C] hover:bg-white`,
  /** Garis tipis di latar terang */
  ghost: `${PILL} text-[#2B211C] ring-1 ring-inset ring-[#2B211C]/20 hover:bg-[#2B211C]/[0.05]`,
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-12 px-6 text-[15px] @3xl:h-[52px] @3xl:px-7',
} as const;

/** Radius konsisten: foto besar 28px, kartu 22px. */
export const RADIUS = { photo: 'rounded-[24px] @3xl:rounded-[28px]', card: 'rounded-[22px]' } as const;
