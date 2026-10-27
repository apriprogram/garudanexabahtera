// Gaya Portline "Harbor index": company profile grup pelayaran & logistik internasional (referensi pemilik 2026-10-27:
// Negmar, Pestiva, Hugo). Putih ↔ es biru ↔ biru pejal; judul KAPITAL tebal (Barlow 700), isi Inter; kontrol & ubin
// bersudut kecil (radius 4–8), tombol persegi panjang bertulisan kapital berjarak, tautan teks dengan chevron. DATAR:
// tanpa bayangan; garis tipis dan bidang warna menggantikan bayangan. Satu warna tema dari CMS (biru #1565C0 bawaan)
// menurunkan navy judul/footer, es, pita, dan versi terang/gelap (--pl-*, lihat ./model). Ukuran memakai container
// query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Barlow (Google Fonts, SIL Open Font License) — grotesk industrial yang tegas untuk huruf kapital. */
export const PORTLINE_FONT: KitFont = {
  id: 'tpl-font-barlow',
  family: '"Barlow", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Barlow:wght@500;600;700&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Warna netral (tidak ikut warna tema). */
export const C = {
  /** Judul & teks kuat: navy turunan warna tema (≥ 12:1 di putih) */
  ink: 'text-(--pl-deep)',
  /** Teks isi: 7,7:1 di putih, 6,8:1 di es */
  body: 'text-[#44546A]',
  /** Keterangan kecil: 5,4:1 di putih, 4,8:1 di es */
  muted: 'text-[#5B6B80]',
  /** Garis rambut */
  line: 'border-(--pl-deep)/[0.12]',
} as const;

/** Label section: garis aksen pendek + teks kapital berjarak. */
export const LABEL = 'text-[12px] font-semibold uppercase tracking-[0.18em]';

export const TYPE_P = {
  /** H1 hero: 34 → 46 → 58 → 66 → 74px, KAPITAL tebal */
  h1: `${DISPLAY} font-bold uppercase text-[34px] leading-[1.02] tracking-[0.005em] @2xl:text-[46px] @5xl:text-[58px] @7xl:text-[66px] @min-[96rem]:text-[74px]`,
  /** H2 section: 28 → 36 → 44 → 50px, KAPITAL tebal */
  h2: `${DISPLAY} font-bold uppercase text-[28px] leading-[1.04] tracking-[0.005em] @3xl:text-[36px] @5xl:text-[44px] @min-[96rem]:text-[50px]`,
  /** H2 ringkas (angka, liputan): 24 → 30px */
  h2s: `${DISPLAY} font-bold uppercase text-[24px] leading-[1.06] tracking-[0.005em] @3xl:text-[30px]`,
  /** Judul kartu besar (kartu ajakan): 24 → 28px */
  h3l: `${DISPLAY} font-semibold text-[24px] leading-tight tracking-[0.005em] @3xl:text-[28px]`,
  /** Judul kartu: 19 → 22px */
  h3: `${DISPLAY} font-semibold text-[19px] leading-tight tracking-[0.005em] @3xl:text-[22px]`,
  /** Judul ubin berita (KAPITAL) */
  tile: `${DISPLAY} font-bold uppercase text-[19px] leading-[1.08] tracking-[0.01em] @3xl:text-[22px]`,
  /** Pernyataan besar (keberlanjutan): 26 → 34 → 42px, kalimat biasa */
  statement: `${DISPLAY} font-semibold text-[26px] leading-[1.15] tracking-[-0.005em] @3xl:text-[34px] @6xl:text-[42px]`,
  lead: 'text-[15.5px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13.5px] leading-snug',
  /** Angka statistik */
  stat: `${DISPLAY} font-bold text-[40px] leading-none tabular-nums tracking-[-0.01em] @3xl:text-[50px] @6xl:text-[58px]`,
} as const;

/** Tombol persegi panjang (radius 4), teks kapital berjarak. */
const BUTTON =
  'inline-flex max-w-full items-center justify-center gap-2.5 rounded-[4px] px-5 text-[13px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap transition-colors duration-300';
export const BTN = {
  /** Warna tema, teks kontras otomatis (--tpl-on-accent) */
  primary: `${BUTTON} h-12 bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Putih di atas foto / pita gelap */
  white: `${BUTTON} h-12 bg-white text-(--pl-deep) hover:bg-(--pl-ice)`,
  /** Garis putih di atas foto / pita gelap */
  ghost: `${BUTTON} h-12 text-white ring-1 ring-inset ring-white/45 hover:bg-white/10`,
  /** Garis navy di latar terang */
  outline: `${BUTTON} h-12 bg-white text-(--pl-deep) ring-1 ring-inset ring-(--pl-deep)/25 hover:bg-(--pl-ice)`,
  /** Tombol kecil bilah utilitas */
  small: 'inline-flex h-8 max-w-full items-center gap-2 rounded-[3px] px-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap transition-colors duration-300',
} as const;

/** Ritme vertikal section: 64 → 88 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-22 @5xl:py-28';

/** Kartu datar radius 8 bergaris tipis. */
export const CARD = 'rounded-[8px] bg-white ring-1 ring-inset ring-(--pl-deep)/[0.1]';

/** Isian formulir: 16px di HP (iOS tidak memperbesar), sudut kecil, fokus cincin tema. */
export const INPUT =
  'block w-full rounded-[4px] bg-white px-3.5 text-[16px] text-(--pl-deep) ring-1 ring-inset ring-(--pl-deep)/20 placeholder:text-[#5B6B80] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) @3xl:text-[15px]';
