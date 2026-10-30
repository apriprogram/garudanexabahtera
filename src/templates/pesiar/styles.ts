// Gaya Pesiar "Island editorial": majalah perjalanan Bali yang tenang. Pasir #F5EFE6 dan putih bergantian, SATU dunia
// hijau tua #17332B (panel hasil Rancang tur, film peta, footer), judul Playfair Display 500/600 + miring 500 untuk
// label & kutipan, isi Inter, harga Inter tabular. Tombol & chip PIL (radius penuh), kartu foto tegak radius 28, isian
// radius 14, garis rambut 12% tinta. DATAR: tanpa bayangan; kedalaman dari tingkat warna, garis tipis, dan kaca di atas
// foto. Warna aksen = warna tema CMS (--tpl-accent* milik Shell + --ps-ink / --ps-bright dari ./model, bawaan
// bougainvillea #B5446E). Wadah PENUH kiri-kanan (WRAP, tanpa max-w); ukuran memakai container query (@…) karena
// template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Playfair Display (Google Fonts, SIL Open Font License) 500/600 + miring 500. Isi Inter. */
export const PESIAR_FONT: KitFont = {
  id: 'tpl-font-playfair-display',
  family: '"Playfair Display", Georgia, "Times New Roman", serif',
  href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap',
};

/**
 * Playfair + angka TEGAK (lining): angka bawaan Playfair bergaya lama ("10 jam" terbaca "1o jam"). Utilitas Tailwind
 * `lining-nums` bisa digabung `tabular-nums` di elemen yang sama (jam film, durasi Rancang tur) tanpa saling menimpa.
 */
export const SERIF = `${FONT_DISPLAY} lining-nums`;

/** Wadah selebar penuh (tanpa max-w, tanpa mx-auto): jarak tepi 20 → 32 → 48 → 64px. Header, section, footer. */
export const WRAP = 'w-full px-5 @2xl:px-8 @5xl:px-12 @min-[96rem]:px-16';

/** Warna netral (tidak ikut warna tema). Kontras dihitung dengan rumus shared/utils (lihat brief). */
export const C = {
  /** Tinta hijau-hitam: judul, isi (13,55:1 di pasir, 15,49:1 di putih) */
  ink: 'text-[#1E2622]',
  /** Paragraf, label, keterangan (5,30:1 di pasir, 6,06:1 di putih) */
  muted: 'text-[#5A6560]',
  /** Garis rambut 12% tinta (dekoratif) */
  line: 'border-[#1E2622]/[0.12]',
  divide: 'divide-[#1E2622]/[0.12]',
  /** Pita A: pasir */
  sand: 'bg-[#F5EFE6]',
  /** Pita B: putih */
  white: 'bg-white',
  /** Hijau tua (film, panel hasil, footer; putih 13,59:1, pasir 11,89:1) */
  deep: 'bg-[#17332B]',
  /** Teks aksen di pasir/putih (≥ 4,6:1, dijaga ./model) */
  accent: 'text-(--ps-ink)',
  /** Teks utama di hijau tua */
  onDeep: 'text-[#F5EFE6]',
  /** Teks kedua di hijau tua: pasir 72% (6,91:1) */
  onDeepMuted: 'text-[#F5EFE6]/[0.72]',
  /** Aksen terang di hijau tua (≥ 4,8:1) */
  bright: 'text-(--ps-bright)',
} as const;

/** Angka tabular Inter */
export const NUM = 'tabular-nums';

export const TYPE = {
  /** H1 hero: 36 (HP < 384px, judul tetap 2 baris) → 40 → 56 → 72 → 84px, Playfair 500, rata tengah */
  h1: `${SERIF} font-medium text-balance text-[36px] leading-[1.04] tracking-[-0.015em] @sm:text-[40px] @2xl:text-[56px] @5xl:text-[72px] @7xl:text-[84px] @7xl:leading-[1.02]`,
  /** H2: 34 → 44 → 52 → 58px */
  h2: `${SERIF} font-medium text-balance text-[34px] leading-[1.08] tracking-[-0.012em] @3xl:text-[44px] @5xl:text-[52px] @min-[96rem]:text-[58px]`,
  /** H3 kartu & panel: 22 → 24px Playfair 600 */
  h3: `${SERIF} font-semibold text-[22px] leading-[1.18] tracking-[-0.005em] @3xl:text-[24px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[18px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13px] leading-snug',
  /** Kutipan besar: Playfair miring, baris seimbang (tanpa satu kata sendirian di baris terakhir) 26 → 34 → 40 → 46px */
  quote: `${SERIF} italic font-medium text-balance text-[26px] leading-[1.3] @3xl:text-[34px] @7xl:text-[40px] @7xl:leading-[1.24] @min-[96rem]:text-[46px]`,
  /** Label section: Playfair miring 17px */
  label: `${SERIF} italic font-medium text-[17px] leading-tight`,
  /** Label isian / spesifikasi kecil */
  field: 'text-[13px] font-medium',
} as const;

/** Tombol pil; disorot → warna berganti (tanpa angkat, tanpa bayangan). */
const PILL =
  'group/btn inline-flex max-w-full items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors duration-200';
export const BTN = {
  /** Warna tema, teks kontras otomatis (--tpl-on-accent) */
  primary: `${PILL} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Garis tinta 1px di latar terang */
  outline: `${PILL} text-[#1E2622] ring-1 ring-inset ring-[#1E2622]/60 hover:bg-[#1E2622] hover:text-white`,
  /** Garis putih 1px di atas foto */
  light: `${PILL} text-white ring-1 ring-inset ring-white/80 hover:bg-white hover:text-[#1E2622]`,
  /** Pasir di hijau tua */
  sand: `${PILL} bg-[#F5EFE6] text-[#1E2622] hover:bg-white`,
  sm: 'h-11 px-5 text-[14px]',
  md: 'h-12 px-6 text-[15px]',
  lg: 'h-12 px-7 text-[15px] @3xl:h-[52px]',
} as const;

/** Tautan teks bergaris bawah (target sentuh 44px). */
export const TEXT_LINK =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-[#1E2622] underline decoration-[#1E2622]/35 decoration-1 underline-offset-[6px] transition-colors hover:text-(--ps-ink) hover:decoration-(--ps-ink)';
export const TEXT_LINK_INV =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-[#F5EFE6] underline decoration-[#F5EFE6]/50 decoration-1 underline-offset-[6px] transition-colors hover:decoration-[#F5EFE6]';

/** Ritme vertikal section: 64 → 96 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28';

/** Jarak kolom grid 12 (desktop). */
export const GRID_GAP = 'gap-x-6 @5xl:gap-x-8 @7xl:gap-x-10';

/** Jarak gulir saat isian/chip difokus (mis. galat formulir): tidak tertutup bilah demo + header lengket. */
export const FOCUS_SCROLL = 'scroll-mt-[calc(var(--tpl-sticky-top,0px)+96px)]';

/** Isian formulir: radius 14, putih, garis tinta 55% (≥ 3:1), 16px di HP (iOS tidak memperbesar). */
export const INPUT = `block w-full min-w-0 rounded-[14px] bg-white px-4 text-[16px] text-[#1E2622] ring-1 ring-inset ring-[#1E2622]/55 placeholder:text-[#6B746F] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--ps-ink) @3xl:text-[15px] ${FOCUS_SCROLL}`;

/** Kartu foto tegak radius 28. */
export const PHOTO_RADIUS = 'rounded-[28px]';
