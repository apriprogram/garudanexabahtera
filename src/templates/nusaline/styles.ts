// Gaya Nusaline "Night line": papan keberangkatan malam yang hidup. Midnight #0B1026 (hero, film, footer) bergantian
// dengan pita putih dan #F2F4FA, tinta #0E1230, SATU warna tema (raspberry) yang menjadi "neon" di latar gelap
// (--nl-neon) dan teks aksen di latar terang (--nl-ink) — keduanya diturunkan ./model. Judul Red Hat Display 700/900,
// isi Inter, jam/durasi/harga/label JetBrains Mono tabular. Tombol pill, kartu radius 18, garis rambut 10%. DATAR:
// tanpa bayangan; kedalaman dari tingkat warna, cincin 1px, dan kaca gelap di atas foto. Wadah PENUH selebar layar
// (WRAP tanpa max-width). Ukuran memakai container query (@…) karena template dirender di bingkai HP / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Red Hat Display (Google Fonts, SIL Open Font License) 500/700/900. Isi Inter, angka JetBrains Mono. */
export const NUSALINE_FONT: KitFont = {
  id: 'tpl-font-red-hat-display',
  family: '"Red Hat Display", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@500;700;900&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Wadah penuh kiri-kanan (tanpa max-width): jarak tepi 20 → 32 → 48 → 64px. Header, setiap section, footer. */
export const WRAP = 'w-full px-5 @2xl:px-8 @5xl:px-12 @min-[96rem]:px-16';

/** Angka mono tabular (jam, durasi, harga, kode kota) */
export const MONO = 'font-mono tabular-nums';

/** Warna netral (tidak ikut warna tema). Kontras dihitung dengan rumus shared/utils (lihat brief). */
export const C = {
  /** Tinta: 18,3:1 di putih, 16,6:1 di #F2F4FA */
  ink: 'text-[#0E1230]',
  /** Teks kedua: 7,5:1 di putih, 6,8:1 di #F2F4FA */
  muted: 'text-[#4B5470]',
  line: 'border-[#0E1230]/10',
  divide: 'divide-[#0E1230]/10',
  /** Pita terang */
  band: 'bg-[#F2F4FA]',
  /** Latar malam */
  night: 'bg-[#0B1026]',
  /** Teks aksen di latar terang (≥ 4,5:1, dijaga ./model) */
  accent: 'text-(--nl-ink)',
  /** Teks aksen di latar gelap (≥ 5:1 di kartu gelap) */
  neon: 'text-(--nl-neon)',
  /** Teks kedua di latar gelap: putih 72% (9,9:1 di midnight) */
  onNightMuted: 'text-white/72',
  lineDark: 'border-white/10',
} as const;

/** Label mono huruf kapital ("→ JADWAL", label isian di kartu gelap) */
export const LABEL = 'font-mono text-[12px] font-medium uppercase leading-snug tracking-[0.14em]';
/** Label mono kecil (judul kolom tabel, legenda) */
export const LABEL_SM = 'font-mono text-[11px] font-medium uppercase tracking-[0.12em]';

export const TYPE = {
  /** H1 hero: 38 → 52 → 64 → 76 → 84px, Red Hat Display 900 */
  h1: `${DISPLAY} font-black text-balance text-[38px] leading-[1.02] tracking-[-0.03em] @2xl:text-[52px] @5xl:text-[64px] @7xl:text-[76px] @min-[96rem]:text-[84px] @5xl:leading-[0.98]`,
  /** H2: 30 → 40 → 48 → 54px, Red Hat Display 700 */
  h2: `${DISPLAY} font-bold text-balance text-[30px] leading-[1.06] tracking-[-0.025em] @3xl:text-[40px] @5xl:text-[48px] @min-[96rem]:text-[54px]`,
  /** H3: 20 → 22px */
  h3: `${DISPLAY} font-bold text-[20px] leading-tight tracking-[-0.01em] @3xl:text-[22px]`,
  /** H3 besar (nama kelas) */
  h3lg: `${DISPLAY} font-bold text-[28px] leading-[1.05] tracking-[-0.02em] @3xl:text-[34px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[18px]',
  body: 'text-[15px] leading-relaxed @3xl:text-[16px]',
  small: 'text-[13px] leading-snug',
} as const;

/** Tombol pill; disorot → warna berganti, panah bergeser 2px (tanpa angkat, tanpa bayangan). */
const BUTTON =
  'group/btn inline-flex max-w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold whitespace-nowrap transition-colors duration-200';
export const BTN = {
  /** Warna tema, teks kontras otomatis (--tpl-on-accent) */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Putih di atas foto/latar malam */
  light: `${BUTTON} bg-white text-[#0E1230] hover:bg-[#F2F4FA]`,
  /** Garis putih 1px di atas foto/latar malam */
  ghostDark: `${BUTTON} bg-[#0B1026]/45 text-white ring-1 ring-inset ring-white/40 backdrop-blur-sm hover:bg-white/10 hover:ring-white/70`,
  /** Garis tinta 1px di latar terang */
  ghost: `${BUTTON} text-[#0E1230] ring-1 ring-inset ring-[#0E1230]/20 hover:ring-(--nl-ink) hover:text-(--nl-ink)`,
  /** Garis warna tema (tombol Pesan di tabel) */
  outline: `${BUTTON} text-(--nl-ink) ring-1 ring-inset ring-(--nl-ink)/50 hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent) hover:ring-(--tpl-accent)`,
  md: 'h-11 px-5',
  lg: 'h-12 px-6',
} as const;

/** Tautan teks bergaris bawah (target sentuh 44px) */
export const TEXT_LINK =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-(--nl-ink) underline decoration-(--nl-ink)/35 decoration-1 underline-offset-[6px] transition-colors hover:decoration-(--nl-ink)';
export const TEXT_LINK_DARK =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-(--nl-neon) underline decoration-(--nl-neon)/40 decoration-1 underline-offset-[6px] transition-colors hover:decoration-(--nl-neon)';

/** Ritme vertikal section: 64 → 96 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28';

/** Jarak kolom grid 12 (desktop). */
export const GRID_GAP = 'gap-x-6 @5xl:gap-x-10 @7xl:gap-x-12';

/** Kartu terang: putih bergaris tipis, radius 18 */
export const CARD = 'rounded-[18px] bg-white ring-1 ring-inset ring-[#0E1230]/[0.08]';
/** Kartu di latar putih: isi pita */
export const CARD_BAND = 'rounded-[18px] bg-[#F2F4FA]';
/** Kartu di latar malam */
export const CARD_DARK = 'rounded-[18px] bg-white/[0.04] ring-1 ring-inset ring-white/10';

/** Isian di latar terang: putih, garis tinta 30% (≥ 3:1), 16px di HP (iOS tidak memperbesar). */
export const INPUT =
  'block h-12 w-full rounded-[12px] bg-white px-3.5 text-[16px] text-[#0E1230] ring-1 ring-inset ring-[#0E1230]/30 transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--nl-ink) @3xl:text-[15px]';
/** Isian di kartu kaca gelap: putih 6%, garis putih 30%, teks putih */
export const INPUT_DARK =
  'block h-12 w-full rounded-[12px] bg-white/[0.06] px-3.5 text-[16px] text-white ring-1 ring-inset ring-white/30 transition-colors [color-scheme:dark] hover:bg-white/[0.09] focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--nl-neon) @3xl:text-[15px]';
