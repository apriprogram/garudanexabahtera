// Gaya Pradipta "Simple sky": landing page SMA negeri yang terang, rapi, dan tenang. Putih dan biru langit yang sangat
// muda bergantian per pita, SATU warna aksen biru azure dari CMS, judul Lexend (geometris, SIL OFL), isi Inter. DATAR:
// tanpa bayangan; kedalaman dari beda nada (kartu putih di pita langit, kartu putih bercincin 1px di pita putih),
// garis tipis, dan skala. Semua warna turunan (--pd-*) dibuat ./model.ts dari warna tema, jadi warna CMS lain tetap
// terbaca. Ukuran memakai container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';
import { postTheme } from '../shared/posts/theme';

/** Huruf judul: Lexend 500/600 (Google Fonts, SIL Open Font License). Isi tetap Inter dari Shell. */
export const PRADIPTA_FONT: KitFont = {
  id: 'tpl-font-lexend',
  family: '"Lexend", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Lexend:wght@500;600&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Nada pita section: langit (--pd-sky) atau putih. */
export type Tone = 'sky' | 'white';

/** Warna netral (tidak ikut warna tema); kontras dihitung di putih / --pd-sky / --pd-sky2. */
export const C = {
  /** Judul & teks kuat: 17:1 di putih, 15:1 di langit */
  ink: 'text-[#0E1B2B]',
  /** Isi: 9,6:1 di putih, 8,8:1 di langit */
  body: 'text-[#36465A]',
  /** Keterangan: 6,1:1 di putih, 5,2:1 di --pd-sky2 */
  muted: 'text-[#53637A]',
  /** Teks kecil berwarna tema: SELALU --pd-ink (azure asli hanya 4,45:1 di langit) */
  accent: 'text-(--pd-ink)',
} as const;

export const TYPE_P = {
  /** H1 kartu hero: 32 → 40 → 46 → 52px */
  h1: `${DISPLAY} font-semibold text-[32px] leading-[1.08] tracking-[-0.025em] @3xl:text-[40px] @6xl:text-[46px] @7xl:text-[52px]`,
  /** H2 section: 28 → 34 → 40 → 44px */
  h2: `${DISPLAY} font-semibold text-[28px] leading-[1.12] tracking-[-0.02em] @3xl:text-[34px] @5xl:text-[40px] @7xl:text-[44px]`,
  /** H2 kecil (pengumuman & agenda berdampingan) */
  h2sm: `${DISPLAY} font-semibold text-[24px] leading-[1.15] tracking-[-0.02em] @3xl:text-[28px]`,
  /** Judul kartu: 18 → 20px */
  h3: `${DISPLAY} font-semibold text-[18px] leading-[1.3] tracking-[-0.01em] @3xl:text-[20px]`,
  lead: 'text-pretty text-[16px] leading-relaxed @3xl:text-[17.5px]',
  /** Isi & teks kecil: text-pretty agar baris terakhir tidak tinggal satu kata */
  body: 'text-pretty text-[15px] leading-relaxed @3xl:text-[16px]',
  small: 'text-pretty text-[14.5px] leading-relaxed',
  meta: 'text-[13px] font-medium @3xl:text-[13.5px]',
  /**
   * Angka di gelembung statistik: min(ukuran langkah --pd-stat, ukuran muat --pd-fit). Gelembung = wadah kueri ukuran,
   * jadi ukuran langkah TIDAK boleh memakai varian @… di dalamnya (akan mengukur gelembung): pasang STAT_SIZE di luar.
   */
  stat: `${DISPLAY} font-medium leading-none tracking-[-0.02em] tabular-nums text-[length:min(var(--pd-stat),var(--pd-fit,999px))]`,
} as const;

/** Ukuran langkah angka & label statistik (28 → 38 → 44px), dipasang di elemen DI LUAR gelembung. */
export const STAT_SIZE = '[--pd-stat:28px] [--pd-stat-label:13px] @3xl:[--pd-stat:38px] @3xl:[--pd-stat-label:14px] @7xl:[--pd-stat:44px]';

/** Ritme vertikal section: 64 → 80 → 96px. */
export const SECTION_PAD = 'py-16 @3xl:py-20 @5xl:py-24';

/** Latar pita per nada. */
export const BAND: Record<Tone, string> = { sky: 'bg-(--pd-sky)', white: 'bg-white' };

/** Kartu radius 20: putih di pita langit (beda nada, tanpa cincin), putih + cincin langit 1px di pita putih. */
export const CARD = {
  onSky: 'rounded-[20px] bg-white',
  onWhite: 'rounded-[20px] bg-white ring-1 ring-inset ring-(--pd-ring)',
  sky: 'rounded-[20px] bg-(--pd-sky)',
} as const;

/** Kartu putih sesuai nada pita tempatnya. */
export const cardOn = (tone: Tone): string => (tone === 'sky' ? CARD.onSky : CARD.onWhite);

/**
 * Tombol pil + bulatan panah DI DALAM pil (ujung kanan); dua panah bertumpuk berganti saat disorot (pradipta.css
 * .pd-arrows). Hover hanya mengubah warna; tidak ada yang terangkat.
 */
const PILL =
  'pd-pill inline-flex max-w-full items-center justify-between gap-3 rounded-full font-semibold whitespace-nowrap transition-colors duration-200';
export const BTN = {
  primary: `${PILL} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  soft: `${PILL} bg-(--pd-sky2) text-[#0E1B2B] hover:bg-(--pd-ring)`,
  light: `${PILL} bg-white text-[#0E1B2B] ring-1 ring-inset ring-(--pd-ring) hover:bg-(--pd-sky)`,
  md: 'h-11 pl-4 pr-1.5 text-[14.5px]',
  lg: 'h-12 pl-5 pr-1.5 text-[15px]',
} as const;

/** Bulatan panah per varian & ukuran. */
export const BTN_DOT = {
  primary: 'bg-white text-(--pd-ink)',
  soft: 'bg-(--tpl-accent) text-(--tpl-on-accent)',
  light: 'bg-(--tpl-accent) text-(--tpl-on-accent)',
  md: 'h-8 w-8',
  lg: 'h-9 w-9',
} as const;

export type BtnVariant = 'primary' | 'soft' | 'light';

/** Tombol bulat ikon 44px (kontrol slider, linimasa). */
export const ROUND =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--pd-sky2) text-(--pd-ink) transition-colors duration-200 hover:bg-(--pd-ring)';

/** Chip: meta (kategori, tingkat, kuota) dan tombol filter (aria-pressed). */
export const CHIP = {
  meta: 'inline-flex h-7 max-w-full items-center rounded-full bg-(--pd-sky2) px-2.5 text-[12.5px] font-semibold text-(--pd-ink)',
  filter: 'h-11 shrink-0 snap-start rounded-full px-4 text-[14px] font-medium transition-colors duration-200',
  on: 'bg-(--tpl-accent) text-(--tpl-on-accent)',
  offSky: 'bg-white text-[#0E1B2B] hover:bg-(--pd-sky2)',
  offWhite: 'bg-(--pd-sky2) text-[#0E1B2B] hover:bg-(--pd-ring)',
} as const;

/** Label section: pil membulat berikon; putih di pita langit, langit di pita putih. */
export const TAG = 'inline-flex h-8 max-w-full items-center gap-2 rounded-full px-3 text-[13px] font-semibold text-(--pd-ink)';
export const TAG_BG: Record<Tone, string> = { sky: 'bg-white', white: 'bg-(--pd-sky2)' };

/**
 * Jarak gulir di bawah header lengket (bilah demo/--tpl-sticky-top + header 64/76px + napas): isian yang difokus, judul
 * langkah formulir, dan hasil tidak tertutup header.
 */
export const SCROLL_GAP = 'scroll-mt-[calc(var(--tpl-sticky-top,0px)+112px)]';

/** Isian formulir: 16px di HP (iOS tidak memperbesar), garis 3,9:1 di putih, fokus cincin tema versi kontras. */
export const INPUT =
  'block w-full scroll-mt-[calc(var(--tpl-sticky-top,0px)+112px)] rounded-[14px] bg-white px-4 text-[16px] text-[#0E1B2B] ring-1 ring-inset ring-[#6F8297] placeholder:text-[#64748B] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) @3xl:text-[15px]';

/** Foto yang membesar pelan saat kartunya disorot (mati saat prefers-reduced-motion, lihat pradipta.css .pd-zoom). */
export const ZOOM = 'pd-zoom transition-[scale] duration-700 ease-out group-hover:scale-[1.04]';

/** Halaman /berita, /pengumuman, dan tulisan (shared/posts) dengan token Pradipta. */
export const POST_THEME = postTheme({
  display: `${DISPLAY} font-semibold`,
  heading: 'text-[#0E1B2B]',
  body: 'text-[#36465A]',
  muted: 'text-[#53637A]',
  accent: 'text-(--pd-ink)',
  chip: 'bg-(--pd-sky2) text-(--pd-ink)',
  urgent: 'bg-[#FEECEB] text-[#B42318]',
  filterOn: 'bg-(--tpl-accent) text-(--tpl-on-accent)',
  filterOff: 'bg-(--pd-sky) text-[#0E1B2B] hover:bg-(--pd-sky2)',
  soft: 'bg-(--pd-sky)',
  card: 'bg-white ring-1 ring-inset ring-(--pd-ring)',
  line: 'border-(--pd-ring)',
  radius: 'rounded-[20px]',
  photoRadius: 'rounded-[14px]',
  button:
    'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-(--tpl-accent) px-5 text-[14.5px] font-semibold text-(--tpl-on-accent) transition-colors hover:bg-(--tpl-accent-hover)',
  buttonGhost:
    'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-(--pd-sky2) px-5 text-[14.5px] font-semibold text-[#0E1B2B] transition-colors hover:bg-(--pd-ring)',
});

/** Tema section tulisan profesional di pita LANGIT (beranda): tombol filter & bidang lembut putih (beda nada). */
export const POST_THEME_SKY = postTheme({
  ...POST_THEME,
  filterOff: 'bg-white text-[#0E1B2B] hover:bg-(--pd-sky2)',
  soft: 'bg-white',
  card: 'bg-white',
});

/** Tema section tulisan profesional sesuai nada pita. */
export const postThemeOn = (tone: Tone) => (tone === 'sky' ? POST_THEME_SKY : POST_THEME);
