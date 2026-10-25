// Gaya Madani "Teduh & rapi": website sekolah Islam yang modern, sederhana, dan profesional. Hero = slider foto di dalam
// bingkai membulat (menu pil di atasnya), lalu halaman putih lapang dengan panel krem/warna tema yang juga membulat dan
// menjorok dari tepi (senada dengan bingkai hero). Judul Plus Jakarta Sans 600 berwarna tema tua, isi Inter; tombol
// pil warna sorotan dengan lingkaran panah; label kecil bertitik; kartu radius 24 TANPA bayangan (garis tipis atau
// bidang krem). Warna tema & sorotan dari CMS lewat variabel --md-* (./model.ts madaniVars). Ukuran memakai container
// query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import { FONT_DISPLAY } from '../shared/layout';

/** Warna tetap (tidak ikut warna tema). */
export const C = {
  /** Teks isi: 7,4:1 di putih, 6,8:1 di krem */
  body: 'text-[#3F4541]',
  /** Teks sekunder: 6,3:1 di putih, 5,8:1 di krem */
  muted: 'text-[#585E5A]',
  cream: 'bg-[#F6F4EC]',
  line: 'border-black/[0.08]',
} as const;

export const DISPLAY = `${FONT_DISPLAY} font-semibold`;

export const TYPE_M = {
  /** H1 hero: 34 → 44 → 54 → 62px */
  h1: `${DISPLAY} text-[34px] leading-[1.07] tracking-[-0.03em] @2xl:text-[44px] @5xl:text-[54px] @7xl:text-[62px]`,
  /** H2 section: 28 → 34 → 40 → 44px */
  h2: `${DISPLAY} text-[28px] leading-[1.14] tracking-[-0.025em] @3xl:text-[34px] @5xl:text-[40px] @7xl:text-[44px]`,
  /** Judul kartu: 18 → 20px */
  h3: `${DISPLAY} text-[18px] leading-snug tracking-[-0.01em] @3xl:text-[20px]`,
  lead: 'text-[15.5px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13px] leading-snug',
  /** Angka statistik */
  stat: `${FONT_DISPLAY} text-[38px] font-semibold leading-none tracking-[-0.035em] tabular-nums @3xl:text-[46px]`,
} as const;

/** Ritme vertikal section Madani (lebih rapat dari SECTION_Y bersama): 56 → 80 → 96px */
export const SECTION_PAD = 'py-14 @3xl:py-20 @5xl:py-24';

/** Jarak tepi panel membulat (sama dengan bingkai hero) */
export const INSET = 'mx-2.5 @3xl:mx-4 @5xl:mx-5';
export const PANEL_RADIUS = 'rounded-[28px] @3xl:rounded-[36px]';

/** Tombol pil. Isi: label (+ lingkaran panah, lihat <ArrowLink> di ./ui). */
const PILL = 'group inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors';
export const BTN = {
  /** Warna sorotan + tinta tema tua (≥ 4,5:1 dijamin madaniVars) */
  hl: `${PILL} bg-(--md-hl) text-(--md-on-hl) hover:bg-(--md-hl-soft)`,
  /** Warna tema + teks kontras otomatis (Shell --tpl-on-accent) */
  primary: `${PILL} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Garis tipis di latar terang */
  ghost: `${PILL} text-(--md-deep) ring-1 ring-inset ring-black/[0.14] hover:bg-black/[0.04]`,
  /** Kaca di atas foto / pita gelap */
  glass: `${PILL} bg-white/[0.12] text-white ring-1 ring-inset ring-white/30 backdrop-blur-md hover:bg-white/20`,
  md: 'h-11 text-[14px]',
  lg: 'h-12 text-[15px]',
} as const;

/** Lingkaran panah di ujung tombol pil, per warna tombol */
export const ARROW = {
  hl: 'bg-(--md-deep) text-(--md-hl-ink)',
  primary: 'bg-white/[0.16] text-(--tpl-on-accent)',
  ghost: 'bg-(--md-deep) text-white',
  glass: 'bg-white text-(--md-deep)',
} as const;

/** Kartu datar tanpa bayangan */
export const CARD = {
  cream: 'rounded-[24px] bg-[#F6F4EC]',
  white: 'rounded-[24px] bg-white ring-1 ring-inset ring-black/[0.07]',
  tint: 'rounded-[24px] bg-(--md-tint)',
} as const;

/** Kaca tipis di atas foto hero: warna tema tua tembus agar teks putih ≥ 4,5:1 */
export const GLASS = 'bg-[color-mix(in_srgb,var(--md-deep)_58%,transparent)] ring-1 ring-inset ring-white/20 backdrop-blur-xl';
