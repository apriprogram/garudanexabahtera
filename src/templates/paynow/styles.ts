// Gaya PayNow "Trust gradient": landing page dompet digital & payment gateway. Malam indigo pekat + gradasi biru → indigo
// → ungu yang SEMUANYA diturunkan dari satu warna tema (./model paynowVars), section putih dan lavender tipis, mockup HP
// dari CSS/HTML, kartu notifikasi, tombol pil, dan label section bertitik gradasi. Judul Figtree 600/700, isi Inter,
// kode JetBrains Mono, angka tabular. DATAR: tanpa bayangan; kedalaman dari ring 1px, garis rambut, dan tingkat warna.
// Ukuran memakai container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Figtree (Google Fonts, SIL Open Font License) 500/600/700. Isi tetap Inter. */
export const PAYNOW_FONT: KitFont = {
  id: 'tpl-font-figtree',
  family: '"Figtree", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Figtree:wght@500;600;700&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Warna netral tetap (tidak ikut warna tema). Kontras dihitung dengan rumus shared/utils (lihat brief). */
export const C = {
  /** Tinta indigo-hitam: judul & isi (18,7:1 di putih, 17,3:1 di lavender) */
  ink: 'text-[#0E0F2C]',
  /** Paragraf & keterangan (8,1:1 di putih, 7,4:1 di lavender) */
  muted: 'text-[#4B4E6D]',
  /** Garis rambut 10% tinta */
  line: 'border-[#0E0F2C]/[0.1]',
  /** Ring kartu 8% tinta */
  ring: 'ring-1 ring-inset ring-[#0E0F2C]/[0.08]',
  /** Section lavender tipis (5% warna tema) */
  mist: 'bg-(--pn-mist)',
  /** Malam indigo (section gelap, footer, jendela kode) */
  night: 'bg-(--pn-night)',
  /** Nominal masuk (+) di daftar transaksi: hijau tua 5,6:1 di putih */
  plus: 'text-[#0F7A4D]',
} as const;

export const TYPE = {
  /** H1 hero: 32 → 44 → 56 → 64px */
  h1: `${DISPLAY} font-bold text-balance text-[32px] leading-[1.06] tracking-[-0.03em] @2xl:text-[44px] @5xl:text-[54px] @5xl:leading-[1.04] @7xl:text-[64px]`,
  /** H2 section: 28 → 36 → 44px */
  h2: `${DISPLAY} font-bold text-balance text-[28px] leading-[1.1] tracking-[-0.025em] @3xl:text-[36px] @5xl:text-[44px] @5xl:leading-[1.06]`,
  /** Judul kartu / panel */
  h3: `${DISPLAY} font-semibold text-[18px] leading-snug tracking-[-0.01em] @3xl:text-[19px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px] @7xl:text-[18px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13.5px] leading-snug',
  /** Angka pita statistik (CountUp) */
  stat: `${DISPLAY} font-bold tabular-nums tracking-[-0.03em] text-[38px] leading-none @3xl:text-[46px] @6xl:text-[54px]`,
  /** Kutipan testimoni */
  quote: `${DISPLAY} font-medium text-[17px] leading-[1.5] tracking-[-0.005em] @3xl:text-[18px]`,
} as const;

/** Tombol pil + ikon di kiri (tanpa chip panah). */
const BUTTON = `group/btn inline-flex max-w-full items-center justify-center gap-2.5 rounded-full ${DISPLAY} font-semibold whitespace-nowrap transition-colors duration-200`;
export const BTN = {
  /** Warna tema, teks kontras otomatis */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Putih di atas foto / pita gelap */
  light: `${BUTTON} bg-white text-[#0E0F2C] hover:bg-white/90`,
  /** Garis putih di atas gelap */
  ghost: `${BUTTON} bg-white/[0.06] text-white ring-1 ring-inset ring-white/30 hover:bg-white/[0.14]`,
  /** Malam indigo di latar terang (tombol toko aplikasi) */
  night: `${BUTTON} bg-(--pn-night) text-white hover:bg-[#23214f]`,
  /** Garis tinta di latar terang */
  outline: `${BUTTON} bg-white text-[#0E0F2C] ring-1 ring-inset ring-[#0E0F2C]/[0.16] hover:ring-(--tpl-accent)`,
  md: 'h-11 px-5 text-[14.5px]',
  lg: 'h-12 px-6 text-[15.5px] @3xl:h-[52px] @3xl:px-7',
} as const;

/** Tautan teks (target sentuh 44px). */
export const TEXT_LINK = `inline-flex min-h-11 items-center gap-1.5 ${DISPLAY} text-[15px] font-semibold text-(--pn-ink) underline decoration-transparent decoration-2 underline-offset-[6px] transition-colors hover:decoration-(--tpl-accent)`;
export const TEXT_LINK_DARK = `inline-flex min-h-11 items-center gap-1.5 ${DISPLAY} text-[15px] font-semibold text-(--pn-glow) underline decoration-transparent decoration-2 underline-offset-[6px] transition-colors hover:decoration-(--pn-glow)`;

/** Kartu putih radius 24 + ring 8%. */
export const CARD = 'rounded-[24px] bg-white ring-1 ring-inset ring-[#0E0F2C]/[0.08]';
/** Kartu di section gelap. */
export const CARD_DARK = 'rounded-[20px] bg-white/[0.05] ring-1 ring-inset ring-white/10';

/** Ritme vertikal section: 64 → 96 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28';

/** Jarak kolom grid 12. */
export const GRID_GAP = 'gap-x-6 @5xl:gap-x-8 @7xl:gap-x-12';

/** Isian formulir: 16px di HP, ring tinta 45% (≥ 3:1), fokus ring tema. */
export const INPUT =
  'block h-12 w-full rounded-[14px] bg-white px-4 text-[16px] text-[#0E0F2C] ring-1 ring-inset ring-[#0E0F2C]/45 placeholder:text-[#6A6D88] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) @3xl:text-[15px]';
