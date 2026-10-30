// Gaya Lajur "Bold livery": putih dan abu hangat #F3F2EE bergantian, SATU pita tinta #14161A (film) + footer tinta,
// amber sebagai ISIAN (tombol, livery bus, garis lajur, rel progres), huruf judul Unbounded yang lebar, isi Inter.
// Tombol persegi radius 6, kartu radius 10 bergaris rambut, motif "lajur" (garis putus-putus, tiga bilah miring).
// DATAR: tanpa bayangan; kedalaman dari tingkat warna, garis tipis, dan foto. Warna utama = warna tema CMS
// (--tpl-accent* milik Shell + --lj-* dari ./model). Ukuran memakai container query (@…) karena template dirender di
// bingkai HP 390 / panel CMS. Wadah PENUH: WRAP tanpa max-width (permintaan pemilik 2026-10-29).
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Unbounded (Google Fonts, SIL Open Font License) 500/700 — lebar, tegas seperti livery bus. Isi Inter. */
export const LAJUR_FONT: KitFont = {
  id: 'tpl-font-unbounded',
  family: '"Unbounded", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Wadah selebar layar (tanpa max-width / mx-auto): jarak tepi 20 → 32 → 48 → 64px. Header, section, footer. */
export const WRAP = 'w-full px-5 @2xl:px-8 @5xl:px-12 @min-[96rem]:px-16';
/** Margin negatif sama dengan jarak tepi WRAP: menembus ke tepi layar (strip foto, peta, rel HP). */
export const BLEED_X = '-mx-5 @2xl:-mx-8 @5xl:-mx-12 @min-[96rem]:-mx-16';
export const BLEED_R = '-mr-5 @2xl:-mr-8 @5xl:-mr-12 @min-[96rem]:-mr-16';
/** Padding rel geser mendatar yang menembus tepi (isi tetap sejajar WRAP). */
export const RAIL_PAD = 'px-5 scroll-px-5 @2xl:px-8 @2xl:scroll-px-8';

/** Warna netral (tidak ikut warna tema). Kontras dihitung dengan rumus shared/utils (lihat brief). */
export const C = {
  /** Tinta #14161A: 18,1:1 di putih, 16,2:1 di abu */
  ink: 'text-[#14161A]',
  /** Teks kedua: 6,4:1 di putih, 5,7:1 di abu */
  muted: 'text-[#5A5F66]',
  line: 'border-[#14161A]/10',
  divide: 'divide-[#14161A]/10',
  white: 'bg-white',
  /** Pita abu hangat */
  grey: 'bg-[#F3F2EE]',
  /** Pita tinta (film, footer) */
  inkBg: 'bg-[#14161A]',
  /** Teks aksen di putih/abu (≥ 4,5:1, dijaga ./model) */
  accent: 'text-(--lj-ink)',
  /** Aksen di tinta / foto gelap (≥ 4,5:1 di tinta) */
  bright: 'text-(--lj-bright)',
  /** Teks kedua di tinta: putih 72% (9,7:1) */
  onInkMuted: 'text-white/[0.72]',
} as const;

/** Label section: huruf kapital kecil berjarak (bilah miring & nomor di ./ui SectionLabel). */
export const LABEL = 'text-[12px] font-semibold uppercase leading-none tracking-[0.16em]';
/** Label isian & spesifikasi */
export const LABEL_SM = 'text-[11px] font-semibold uppercase tracking-[0.14em]';
/** Angka Unbounded tabular */
export const NUM = `${FONT_DISPLAY} tabular-nums`;

export const TYPE = {
  /**
   * H1 hero: 32 → 44 → 56 → 64px (≥ 1536px), Unbounded 700 (huruf lebar: ukurannya ditahan). Layar laptop pendek
   * (tinggi ≤ 820 / ≤ 740px): 48 / 42px, supaya bilah penawaran di tepi bawah foto tetap terlihat tanpa menggulir.
   */
  h1: `${FONT_DISPLAY} font-bold text-balance text-[32px] leading-[1.06] tracking-[-0.02em] @3xl:text-[44px] @5xl:text-[56px] @5xl:leading-[1.04] @min-[96rem]:text-[64px] [@media(min-height:741px)_and_(max-height:820px)]:@5xl:text-[48px] [@media(max-height:740px)]:@5xl:text-[42px]`,
  /** H2: 26 → 32 → 40 → 44px, Unbounded 500 */
  h2: `${FONT_DISPLAY} font-medium text-balance text-[26px] leading-[1.12] tracking-[-0.02em] @3xl:text-[32px] @5xl:text-[40px] @min-[96rem]:text-[44px]`,
  /** H3 kartu: 18 → 20px Unbounded 500 */
  h3: `${FONT_DISPLAY} font-medium text-[18px] leading-[1.2] tracking-[-0.01em] @3xl:text-[20px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[18px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13px] leading-snug',
} as const;

/** Tombol persegi radius 6; panah bergeser 4px saat disorot (tanpa angkat, tanpa bayangan). */
const BUTTON =
  'group/btn inline-flex max-w-full items-center justify-center gap-2.5 rounded-[6px] text-[15px] font-semibold whitespace-nowrap transition-colors duration-200';
export const BTN = {
  /** Amber, teks kontras otomatis (--tpl-on-accent) */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Garis tinta 1px di latar terang */
  ghost: `${BUTTON} text-[#14161A] ring-1 ring-inset ring-[#14161A]/40 hover:bg-[#14161A] hover:text-white`,
  /** Garis putih 1px di atas foto / tinta */
  ghostLight: `${BUTTON} text-white ring-1 ring-inset ring-white/70 hover:bg-white hover:text-[#14161A]`,
  /** Tinta (di pita amber footer) */
  ink: `${BUTTON} bg-[#14161A] text-white hover:bg-[#2A2D33]`,
  /** Aksen terang di pita tinta */
  bright: `${BUTTON} bg-(--lj-bright) text-[#14161A] hover:bg-white`,
  md: 'h-11 px-5',
  lg: 'h-12 px-6 @3xl:h-14 @3xl:px-7',
} as const;

/** Tautan teks bergaris bawah (target sentuh 44px). */
export const TEXT_LINK =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-[#14161A] underline decoration-[#14161A]/30 decoration-1 underline-offset-[6px] transition-colors hover:decoration-(--tpl-accent) hover:decoration-2';
export const TEXT_LINK_INV =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-white underline decoration-white/40 decoration-1 underline-offset-[6px] transition-colors hover:decoration-(--lj-bright) hover:decoration-2';

/** Ritme vertikal section: 64 (HP) → 96 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28';

/** Jarak kolom grid 12. */
export const GRID_GAP = 'gap-x-6 @5xl:gap-x-10';

/** Kartu putih radius 10 bergaris rambut. */
export const CARD = 'rounded-[10px] bg-white ring-1 ring-inset ring-[#14161A]/10';

/** Isian formulir: radius 6, putih, garis tinta 30%, fokus garis aksen gelap; 16px di HP (iOS tidak memperbesar). */
export const INPUT =
  'block w-full rounded-[6px] bg-white px-3.5 text-[16px] text-[#14161A] ring-1 ring-inset ring-[#14161A]/30 placeholder:text-[#6B7077] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--lj-ink) @3xl:text-[15px]';
