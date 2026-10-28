// Gaya SpecialistPlus "Clinical data": pusat klinik spesialis & laboratorium yang tenang dan presisi. Navy (diturunkan
// dari warna tema, ./model spxVars) + putih + abu kebiruan #F2F6F8, SATU aksen teal. Judul IBM Plex Sans 500/600, isi
// Inter, kode & angka JetBrains Mono. Data dulu, paragraf belakangan: tabel, baris label-nilai, angka bersatuan. DATAR:
// tanpa bayangan; kedalaman dari tingkat warna, cincin 1px, garis rambut `divide-y`. Kartu radius 8, tombol radius 6.
// Ukuran memakai container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: IBM Plex Sans (Google Fonts, SIL Open Font License) 500/600. Isi tetap Inter, angka JetBrains Mono. */
export const SPECIALISTPLUS_FONT: KitFont = {
  id: 'tpl-font-ibm-plex-sans',
  family: '"IBM Plex Sans", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@500;600&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Warna netral (tidak ikut warna tema). Kontras dihitung dengan rumus shared/utils (lihat brief). */
export const C = {
  /** Tinta navy-hitam: judul, nilai (17,4:1 di putih; 16,0:1 di #F2F6F8) */
  ink: 'text-[#0D1B2A]',
  /** Paragraf & label (7,3:1 di putih; 6,7:1 di #F2F6F8) */
  muted: 'text-[#4A5868]',
  /** Garis rambut 12% tinta (dekoratif) */
  line: 'border-[#0D1B2A]/[0.12]',
  divide: 'divide-[#0D1B2A]/[0.12]',
  /** Pita abu kebiruan */
  surface: 'bg-[#F2F6F8]',
} as const;

/** Label mono kapital (kode section, kode klinik, label baris). */
export const MONO_LABEL = 'font-mono text-[11.5px] font-medium uppercase tracking-[0.14em]';
/** Nilai mono (jam, hari, ruang, harga kecil). */
export const MONO_VALUE = 'font-mono text-[13.5px] font-medium tabular-nums tracking-[0.01em]';

export const TYPE_S = {
  /** H1 hero: 32 → 44 → 54 → 62px */
  h1: `${DISPLAY} font-semibold text-balance text-[32px] leading-[1.06] tracking-[-0.025em] @2xl:text-[44px] @5xl:text-[54px] @5xl:leading-[1.04] @7xl:text-[62px]`,
  /** H2 section: 28 → 36 → 44px */
  h2: `${DISPLAY} font-semibold text-balance text-[28px] leading-[1.12] tracking-[-0.02em] @3xl:text-[36px] @5xl:text-[44px] @5xl:leading-[1.08]`,
  /** Judul kartu / panel: 18 → 20px */
  h3: `${DISPLAY} font-semibold text-[18px] leading-snug tracking-[-0.01em] @3xl:text-[20px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13.5px] leading-snug',
  /** Kutipan testimoni */
  quote: `${DISPLAY} font-medium text-[17px] leading-[1.5] tracking-[-0.005em] @3xl:text-[18px]`,
  /** Angka metrik konsol hero (CountUp) */
  metric: 'font-mono font-semibold tabular-nums tracking-[-0.04em] text-[24px] leading-none @3xl:text-[28px]',
  /** Harga paket MCU */
  price: 'font-mono font-semibold tabular-nums tracking-[-0.02em] text-[20px] leading-tight @6xl:text-[22px]',
} as const;

/** Tombol radius 6px, panah bergeser 2px saat disorot (tanpa angkat/bayangan). */
const BUTTON =
  'group/btn inline-flex max-w-full items-center justify-center gap-2.5 rounded-[6px] font-medium whitespace-nowrap transition-colors duration-200';
export const BTN = {
  /** Teal (warna tema), teks kontras otomatis (--tpl-on-accent; tinta untuk teal bawaan, 4,6:1) */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Navy di latar terang */
  navy: `${BUTTON} bg-(--spx-navy) text-white hover:bg-(--spx-navy-2)`,
  /** Garis putih di atas navy / foto */
  ghost: `${BUTTON} text-white ring-1 ring-inset ring-white/40 hover:bg-white/10 hover:ring-white/70`,
  /** Garis tinta di latar terang */
  outline: `${BUTTON} text-[#0D1B2A] ring-1 ring-inset ring-[#0D1B2A]/25 hover:text-(--tpl-accent-ink) hover:ring-(--tpl-accent-ink)`,
  sm: 'h-11 px-4 text-[14px]',
  md: 'h-11 px-5 text-[14.5px]',
  lg: 'h-12 px-6 text-[15px] @3xl:h-[52px]',
} as const;

/** Tautan teks bergaris bawah (target sentuh 44px). */
export const TEXT_LINK =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-[#0D1B2A] underline decoration-[#0D1B2A]/30 decoration-1 underline-offset-[6px] transition-colors hover:text-(--tpl-accent-ink) hover:decoration-(--tpl-accent)';
export const TEXT_LINK_INV =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-white underline decoration-white/45 decoration-1 underline-offset-[6px] transition-colors hover:decoration-white';

/** Kartu datar putih radius 8, cincin 1px; disorot → cincin teal (tanpa angkat/geser). */
export const CARD = 'rounded-[8px] bg-white ring-1 ring-inset ring-[#0D1B2A]/[0.1]';
export const CARD_HOVER = 'hover:ring-(--tpl-accent)';

/** Chip label (radius 4, mono). */
export const CHIP = 'inline-flex items-center rounded-[4px] px-2 py-1 font-mono text-[11.5px] font-medium tracking-[0.04em]';

/** Ritme vertikal section: 64 → 96 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28';

/** Grid 12 kolom (desktop), jarak 24 → 32 → 40px. */
export const GRID_GAP = 'gap-x-6 @5xl:gap-x-8 @7xl:gap-x-10';

/** Isian formulir: 16px di HP (iOS tidak memperbesar), cincin tinta 50% (≥ 3:1), fokus cincin teal versi kontras. */
export const INPUT =
  'block h-12 w-full rounded-[6px] bg-white px-3.5 text-[16px] text-[#0D1B2A] ring-1 ring-inset ring-[#0D1B2A]/50 placeholder:text-[#66737F] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) @3xl:text-[15px]';
