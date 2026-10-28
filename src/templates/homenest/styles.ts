// Gaya HomeNest "Quiet luxury": katalog rumah yang tenang dan lapang. Krem #F4EFE4 dan putih hangat #FBF9F4 bergantian,
// dua pita hijau tua (tur virtual & footer) + panel hasil KPR hijau tua, judul Cormorant Garamond 500/600 besar, isi
// Inter, semua angka Inter tabular. Sudut PERSEGI (tombol, kartu, foto, isian), garis rambut 12% tinta, label kecil
// huruf kapital berjarak dengan garis pendek di kirinya. DATAR: tanpa bayangan; kedalaman dari tingkat warna, garis
// tipis, dan foto besar. Warna utama = warna tema CMS (--tpl-accent* milik Shell + --hn-* dari ./model, bawaan hijau tua
// #2E5141). Ukuran memakai container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Cormorant Garamond (Google Fonts, SIL Open Font License) 500/600 + miring 500 (kutipan). Isi Inter. */
export const HOMENEST_FONT: KitFont = {
  id: 'tpl-font-cormorant-garamond',
  family: '"Cormorant Garamond", "Cormorant", Georgia, "Times New Roman", serif',
  href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap',
};

export const SERIF = FONT_DISPLAY;

/** Warna netral (tidak ikut warna tema). Kontras dihitung dengan rumus shared/utils (lihat brief). */
export const C = {
  /** Tinta hijau-hitam: judul, isi, nilai (13:1 di krem, 14,1:1 di putih hangat) */
  ink: 'text-[#1E2A24]',
  /** Paragraf, label, keterangan (5,6:1 di krem, 6,1:1 di putih hangat, 6,4:1 di putih) */
  muted: 'text-[#56625B]',
  /** Garis rambut 12% tinta (dekoratif) */
  line: 'border-[#1E2A24]/[0.12]',
  divide: 'divide-[#1E2A24]/[0.12]',
  /** Pita A: krem */
  cream: 'bg-[#F4EFE4]',
  /** Pita B: putih hangat */
  warm: 'bg-[#FBF9F4]',
  /** Pita gelap: hijau tua turunan warna tema (putih ≥ 12:1) */
  deep: 'bg-(--hn-deep)',
  /** Teks aksen di krem/putih hangat (≥ 4,5:1 di krem, dijaga ./model) */
  accent: 'text-(--hn-ink)',
  /** Teks kedua di pita gelap: krem 72% (≥ 7:1) */
  onDeepMuted: 'text-[#F4EFE4]/[0.72]',
} as const;

/** Label kecil: huruf kapital berjarak lebar (dengan garis pendek di ./ui SectionLabel). */
export const LABEL = 'text-[11.5px] font-semibold uppercase leading-snug tracking-[0.2em]';
/** Label isian & label spesifikasi (lebih rapat) */
export const LABEL_SM = 'text-[11px] font-semibold uppercase tracking-[0.16em]';
/** Angka tabular Inter */
export const NUM = 'tabular-nums';

export const TYPE = {
  /** H1 hero: 40 → 56 → 72 → 88px, Cormorant 500, rata tengah */
  h1: `${SERIF} font-medium text-balance text-[40px] leading-[1.02] tracking-[-0.01em] @2xl:text-[56px] @5xl:text-[72px] @7xl:text-[88px] @7xl:leading-[0.98]`,
  /** H2: 36 → 46 → 56 → 62px */
  h2: `${SERIF} font-medium text-balance text-[36px] leading-[1.04] tracking-[-0.01em] @3xl:text-[46px] @5xl:text-[56px] @min-[96rem]:text-[62px]`,
  /** H3 kartu: 24 → 26px Cormorant 600 */
  h3: `${SERIF} font-semibold text-[24px] leading-[1.12] tracking-[-0.005em] @3xl:text-[26px]`,
  /** H3 kecil (nilai, agen): 22px */
  h3sm: `${SERIF} font-semibold text-[22px] leading-[1.15]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13px] leading-snug',
  /** Angka besar ringan (statistik, hasil KPR) */
  stat: `font-light ${NUM} tracking-[-0.03em] text-[44px] leading-none @5xl:text-[52px]`,
  /** Kutipan testimoni: Cormorant miring */
  quote: `${SERIF} italic font-medium text-[22px] leading-[1.35] @3xl:text-[24px]`,
  /** Nama besar di footer (cqi = lebar wadah @container Shell) */
  wordmark: `${SERIF} font-semibold leading-[0.85] tracking-[-0.02em] text-[clamp(4rem,15cqi,13rem)]`,
} as const;

/** Tombol persegi (radius 0), huruf kapital kecil berjarak; disorot → warna berganti (tanpa angkat). */
const BUTTON =
  'group/btn inline-flex max-w-full items-center justify-center gap-2.5 rounded-none text-[13px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap transition-colors duration-200';
export const BTN = {
  /** Warna tema, teks kontras otomatis (--tpl-on-accent) */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Krem di pita gelap / di atas foto */
  cream: `${BUTTON} bg-[#F4EFE4] text-[#1E2A24] hover:bg-white`,
  /** Garis tinta 1px di latar terang */
  outline: `${BUTTON} text-[#1E2A24] ring-1 ring-inset ring-[#1E2A24]/40 hover:bg-[#1E2A24] hover:text-white`,
  /** Garis krem 1px di atas foto (header transparan) */
  outlineLight: `${BUTTON} text-[#F4EFE4] ring-1 ring-inset ring-[#F4EFE4]/70 hover:bg-[#F4EFE4] hover:text-[#1E2A24]`,
  md: 'h-11 px-5',
  lg: 'h-12 px-7 @3xl:h-[52px]',
} as const;

/** Tautan teks bergaris bawah (target sentuh 44px). */
export const TEXT_LINK =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-[#1E2A24] underline decoration-[#1E2A24]/35 decoration-1 underline-offset-[6px] transition-colors hover:text-(--hn-ink) hover:decoration-(--tpl-accent)';
export const TEXT_LINK_INV =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-[#F4EFE4] underline decoration-[#F4EFE4]/50 decoration-1 underline-offset-[6px] transition-colors hover:decoration-[#F4EFE4]';

/** Ritme vertikal section: 64 (HP) → 104 → 128px (lapang). */
export const SECTION_PAD = 'py-16 @3xl:py-[104px] @5xl:py-32';

/** Jarak kolom grid 12 (desktop). */
export const GRID_GAP = 'gap-x-6 @5xl:gap-x-10 @7xl:gap-x-14';

/** Isian formulir: persegi, putih, garis tinta 50% (≥ 3:1), 16px di HP (iOS tidak memperbesar). */
export const INPUT =
  'block w-full rounded-none bg-white px-3.5 text-[16px] text-[#1E2A24] ring-1 ring-inset ring-[#1E2A24]/50 placeholder:text-[#6B756F] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--hn-ink) @3xl:text-[15px]';
