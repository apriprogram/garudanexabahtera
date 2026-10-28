// Gaya Sparring Padel "Night court energy": landing page lapangan padel yang energik. Biru-malam pekat (--sp-night,
// diturunkan dari warna tema) bergantian dengan pita putih dan abu-dingin, SATU warna neon (aqua bawaan #00D2B4) untuk
// tombol Book Now, garis lapangan, dan angka. Judul Saira 600/700 (rapat, sporty; satu kata miring neon), isi Inter,
// label & meta JetBrains Mono "// JADWAL". DATAR: tanpa bayangan; kedalaman dari tingkat warna, cincin 1px, dan panel
// kaca gelap. Kartu radius 14, tombol pil. Ukuran memakai container query (@…) karena template dirender di bingkai HP
// 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Saira (Google Fonts, SIL Open Font License) 500/600/700 + miring 600/700. */
export const SPARRING_FONT: KitFont = {
  id: 'tpl-font-saira',
  family: '"Saira", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Saira:ital,wght@0,500;0,600;0,700;1,600;1,700&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Warna netral tetap (tidak ikut warna tema). Kontras dihitung dengan contrast() shared/utils (lihat brief). */
export const C = {
  /** Tinta biru-hitam: judul & isi di putih (18,3:1) dan di pita abu (16,7:1) */
  ink: 'text-[#0A1622]',
  /** Paragraf & label di latar terang (7,3:1 putih; 6,6:1 pita abu) */
  muted: 'text-[#4B5867]',
  /** Pita abu-dingin (turnamen, FAQ) */
  band: 'bg-[#F2F5F7]',
  /** Garis tipis di latar terang (dekoratif) */
  line: 'border-[#0A1622]/[0.1]',
} as const;

/** Label section mono kapital "// JADWAL". */
export const MONO_LABEL = 'font-mono text-[12px] font-medium uppercase tracking-[0.14em]';
/** Nilai mono kecil (jam, biaya, slot). */
export const MONO = 'font-mono text-[13px] tabular-nums tracking-[0.01em]';

export const TYPE = {
  /** H1 hero: 34 → 46 → 58 → 68 → 76px */
  h1: `${DISPLAY} font-bold text-balance text-[34px] leading-[1.02] tracking-[-0.015em] @2xl:text-[46px] @5xl:text-[58px] @5xl:leading-[1] @7xl:text-[68px] @min-[96rem]:text-[76px]`,
  /** H2 section: 30 → 40 → 48px */
  h2: `${DISPLAY} font-bold text-balance text-[30px] leading-[1.06] tracking-[-0.01em] @3xl:text-[40px] @5xl:text-[48px] @5xl:leading-[1.02]`,
  /** Judul kartu/baris: 19 → 21px */
  h3: `${DISPLAY} font-semibold text-[19px] leading-snug tracking-[-0.005em] @3xl:text-[21px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
  /** Harga per jam di papan jadwal */
  price: `${DISPLAY} font-semibold tabular-nums text-[26px] leading-none tracking-[-0.01em] @3xl:text-[30px]`,
  /** Angka komunitas (CountUp) */
  stat: `${DISPLAY} font-bold italic tabular-nums text-[44px] leading-none tracking-[-0.02em] @3xl:text-[56px] @6xl:text-[64px]`,
} as const;

/** Tombol pil; panah di lingkaran gelap bergeser 2px saat disorot. */
const PILL = 'group/btn inline-flex max-w-full items-center justify-center gap-3 rounded-full font-semibold whitespace-nowrap transition-colors duration-200';
export const BTN = {
  /** BOOK NOW: neon (warna tema), teks kontras otomatis */
  neon: `${PILL} ${DISPLAY} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Putih di latar gelap/foto */
  white: `${PILL} bg-white text-[#0A1622] hover:bg-white/85`,
  /** Garis putih di latar gelap/foto */
  ghost: `${PILL} text-white ring-1 ring-inset ring-white/45 hover:bg-white/10`,
  /** Tinta di latar terang */
  ink: `${PILL} bg-[#0A1622] text-white hover:bg-[#1B2A38]`,
  /** Garis tinta di latar terang */
  outline: `${PILL} text-[#0A1622] ring-1 ring-inset ring-[#0A1622]/30 hover:bg-[#0A1622]/[0.05]`,
  sm: 'h-11 px-5 text-[14px]',
  md: 'h-12 px-6 text-[15px]',
  /** Book Now besar (bilah booking) */
  xl: 'h-14 pl-7 pr-2 text-[16px]',
} as const;

/** Tautan teks (target sentuh 44px). */
export const TEXT_LINK =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-[#0A1622] underline decoration-[#0A1622]/30 decoration-1 underline-offset-[6px] transition-colors hover:text-(--sp-ink) hover:decoration-(--sp-ink)';
export const TEXT_LINK_INV =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-white underline decoration-white/45 decoration-1 underline-offset-[6px] transition-colors hover:decoration-(--sp-neon)';

/** Kartu radius 14. Terang: putih + cincin tipis; gelap: putih 5% + cincin putih 10% di biru-malam. */
export const CARD = {
  light: 'rounded-[14px] bg-white ring-1 ring-inset ring-[#0A1622]/[0.08]',
  dark: 'rounded-[14px] bg-white/[0.05] ring-1 ring-inset ring-white/10',
} as const;

/** Ritme vertikal section: 64 → 96 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28';

/** Jarak kolom grid 12. */
export const GRID_GAP = 'gap-x-6 @5xl:gap-x-10 @7xl:gap-x-14';

/** Isian formulir di latar terang: 16px di HP, garis tinta 45% (≥ 3:1), fokus cincin tinta tema. */
export const INPUT =
  'block w-full rounded-[12px] bg-white px-3.5 text-[16px] text-[#0A1622] ring-1 ring-inset ring-[#0A1622]/45 placeholder:text-[#5F6B78] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--sp-ink) @3xl:text-[15px]';

/** Isian di panel kaca gelap (bilah booking hero). */
export const INPUT_DARK =
  'block w-full rounded-[12px] bg-white/[0.07] px-3.5 text-[16px] text-white ring-1 ring-inset ring-white/25 placeholder:text-white/60 [color-scheme:dark] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--sp-neon) @3xl:text-[15px]';

/** Warna galat: terang (6,6:1 putih) & gelap (9,7:1 biru-malam, 6,5:1 kaca). */
export const ERROR = { light: 'text-[#B42318]', dark: 'text-[#FFA59A]', ringLight: 'ring-2 ring-[#B42318]', ringDark: 'ring-2 ring-[#FFA59A]' } as const;
