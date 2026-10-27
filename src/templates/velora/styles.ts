// Gaya Velora "Showroom dark": grup otomotif premium. Halaman putih tulang (#F4F4F2) bergantian dengan bidang hampir
// hitam (#0D0E10) dan grafit (#1B1D21); hero = kartu foto membulat di dalam gutter dengan menu di dalamnya; kartu foto
// gelap radius 20 dengan chip ikon di sudut; baris abu berpanah; label section = garis merah pendek + teks; tombol pil
// dengan bulatan panah DI DALAM pil; satu aksen merah (#E3342F bawaan, dari CMS) untuk chip panah, titik, dan sorotan
// kecil. DATAR: tanpa bayangan, garis tipis (ring/border) menggantikan bayangan. Judul Space Grotesk (SIL OFL), isi
// Inter. Ukuran memakai container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Space Grotesk (Google Fonts, SIL Open Font License). */
export const VELORA_FONT: KitFont = {
  id: 'tpl-font-space-grotesk',
  family: '"Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Warna netral (tidak ikut warna aksen). Kontras dihitung di latar masing-masing. */
export const C = {
  /** Hampir hitam: teks utama di latar terang, bidang gelap */
  ink: 'text-[#0D0E10]',
  /** 6,4:1 di putih tulang */
  muted: 'text-[#55575C]',
  /** Teks sekunder di bidang gelap (≈ 9:1) */
  mutedDark: 'text-white/70',
  bone: 'bg-[#F4F4F2]',
  night: 'bg-[#0D0E10]',
  graphite: 'bg-[#1B1D21]',
  /** Abu kartu / baris berpanah di putih tulang */
  card: 'bg-[#E8E8E5]',
} as const;

export const TYPE_V = {
  /** H1 hero: 36 → 52 → 64 → 76 → 88px */
  h1: `${DISPLAY} font-medium text-[36px] leading-[1.08] tracking-[-0.035em] @2xl:text-[52px] @5xl:text-[64px] @7xl:text-[76px] @min-[96rem]:text-[88px]`,
  /** H2 section: 30 → 40 → 48 → 56px */
  h2: `${DISPLAY} font-medium text-[30px] leading-[1.06] tracking-[-0.03em] @3xl:text-[40px] @5xl:text-[48px] @min-[96rem]:text-[56px]`,
  /** Judul kartu: 19 → 22px */
  h3: `${DISPLAY} font-medium text-[19px] leading-snug tracking-[-0.02em] @3xl:text-[22px]`,
  lead: 'text-[15.5px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13.5px] leading-snug',
} as const;

/** Ritme vertikal section: 64 → 96 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28';

/**
 * Gutter kartu/panel membulat (hero, lineup, test drive): 8 → 12 → 16px dari tepi halaman. Isi di dalam kartu memakai
 * INSET sehingga gutter + INSET = jarak tepi CONTAINER (20/32/48/64px) dan teks sejajar dengan section lain.
 */
export const GUTTER = 'mx-auto w-full max-w-[1680px] px-2 @2xl:px-3 @5xl:px-4';
export const INSET = 'px-4 @2xl:px-5 @5xl:px-8 @min-[96rem]:px-12';

/** Kartu foto gelap & baris abu: radius 20. */
export const RADIUS_CARD = 'rounded-[20px]';

/** Isian formulir: 16px di HP (iOS tidak memperbesar), garis tipis, fokus cincin aksen versi kontras. */
export const INPUT =
  'block w-full rounded-[14px] bg-white px-4 text-[16px] text-[#0D0E10] ring-1 ring-inset ring-[#0D0E10]/[0.16] placeholder:text-[#6B6E73] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) @3xl:text-[15px]';
