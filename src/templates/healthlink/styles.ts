// Gaya HealthLink "App home": template telemedicine yang terasa seperti layar beranda aplikasi. Kanvas abu sangat muda
// #F5F7FA, kartu putih radius 24-28 bergaris 1px, ikon garis BESAR di kotak "squircle" ber-tint warna tema, label kapsul
// kecil, tombol besar rounded-2xl, panel ala bottom sheet. DATAR: tanpa bayangan; kedalaman dari tingkat warna, garis
// tipis 1px, dan kaca putih di atas foto. Judul DM Sans 600/700, isi Inter, angka tabular. Warna utama = warna tema CMS
// (--tpl-accent* milik Shell + --hl-* dari ./model, bawaan cyan #0891B2). Ukuran memakai container query (@…) karena
// template dirender di bingkai HP 390 / panel CMS; dirancang dari HP dulu.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: DM Sans (Google Fonts, SIL Open Font License) 500/600/700. Isi tetap Inter. */
export const HEALTHLINK_FONT: KitFont = {
  id: 'tpl-font-dm-sans',
  family: '"DM Sans", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,500;9..40,600;9..40,700&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Warna netral (tidak ikut warna tema). Kontras dihitung dengan rumus shared/utils. */
export const C = {
  /** Tinta biru tua: judul & isi (17,35:1 di putih, 16,17:1 di kanvas) */
  ink: 'text-[#0E1B2B]',
  /** Teks kedua (7,26:1 di putih, 6,77:1 di kanvas, 6,31:1 di tint) */
  muted: 'text-[#4A5869]',
  /** Kanvas halaman */
  canvas: 'bg-[#F5F7FA]',
  /** Garis tipis 8% tinta (dekoratif) */
  line: 'border-[#0E1B2B]/[0.08]',
} as const;

export const TYPE_H = {
  /** H1 di kartu hero: 32 → 40 → 46px */
  h1: `${DISPLAY} font-bold text-balance text-[32px] leading-[1.08] tracking-[-0.022em] @2xl:text-[40px] @6xl:text-[46px] @6xl:leading-[1.05]`,
  /** H2 section: 28 → 36 → 44px */
  h2: `${DISPLAY} font-bold text-balance text-[28px] leading-[1.12] tracking-[-0.02em] @3xl:text-[36px] @6xl:text-[44px] @6xl:leading-[1.08]`,
  /** Judul kartu: 17 → 19px */
  h3: `${DISPLAY} font-semibold text-[17px] leading-snug tracking-[-0.01em] @3xl:text-[19px]`,
  lead: 'text-[15.5px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13.5px] leading-snug',
  /** Angka ringkas (RS mitra) */
  stat: `${DISPLAY} font-bold tabular-nums tracking-[-0.03em] text-[34px] leading-none @3xl:text-[42px]`,
  /** Harga paket */
  price: `${DISPLAY} font-bold tabular-nums tracking-[-0.03em] text-[32px] leading-none @3xl:text-[36px]`,
} as const;

/** Tombol besar rounded-2xl; panah/ikon tidak bergeser (datar, tenang). */
const BUTTON =
  'inline-flex max-w-full items-center justify-center gap-2.5 rounded-2xl font-semibold whitespace-nowrap transition-colors duration-200';
export const BTN = {
  /** Warna tema versi gelap, teks putih ≥ 4,5:1 */
  solid: `${BUTTON} bg-(--hl-solid) text-white hover:bg-(--hl-solid-hover)`,
  /** Putih bergaris (di kanvas atau foto) */
  light: `${BUTTON} bg-white text-[#0E1B2B] ring-1 ring-inset ring-[#0E1B2B]/[0.12] hover:ring-(--hl-solid)`,
  /** Tint warna tema */
  tint: `${BUTTON} bg-(--hl-tint) text-(--hl-tint-ink) ring-1 ring-inset ring-transparent hover:ring-(--hl-solid)`,
  /** Putih padat di pita gelap */
  white: `${BUTTON} bg-white text-[#0E1B2B] hover:bg-white/90`,
  sm: 'h-11 px-4 text-[14.5px]',
  md: 'h-12 px-5 text-[15px]',
  lg: 'h-14 px-6 text-[16px]',
} as const;

/** Kartu putih di kanvas */
export const CARD = 'rounded-[24px] bg-white ring-1 ring-inset ring-[#0E1B2B]/[0.06]';
/** Kartu kanvas di pita putih */
export const CARD_SOFT = 'rounded-[24px] bg-[#F5F7FA] ring-1 ring-inset ring-[#0E1B2B]/[0.04]';
/** Kartu yang bisa diklik: garis berubah warna tema saat disorot (tanpa angkat/geser) */
export const CARD_HOVER = 'transition-colors duration-200 hover:ring-(--hl-solid)';

/** Kotak ikon "squircle" ber-tint (ukuran diberikan pemakai). */
export const SQUIRCLE = 'flex shrink-0 items-center justify-center rounded-[18px] bg-(--hl-tint) text-(--hl-tint-ink)';

/** Label kapsul kecil */
export const CHIP = 'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold';

/** Ritme vertikal section: 56 → 80 → 96px. */
export const SECTION_PAD = 'py-14 @3xl:py-20 @5xl:py-24';

/** Isian formulir: 16px (iOS tidak memperbesar), tinggi 52px, garis tinta 50% (≥ 3:1 dengan latar), fokus cincin tema. */
export const INPUT =
  'block h-[52px] w-full min-w-0 rounded-2xl bg-white px-4 text-[16px] text-[#0E1B2B] ring-1 ring-inset ring-[#0E1B2B]/50 placeholder:text-[#5E6B7C] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--hl-solid)';
