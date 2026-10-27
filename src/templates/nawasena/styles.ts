// Gaya Nawasena "Elegant navy": landing page SMA negeri yang resmi, tenang, dan rapi. Pita navy (diturunkan dari warna
// tema, ./model nawasenaVars) membingkai halaman seperti lambang sekolah: hero + pita angka, pita pengumuman & agenda,
// dan footer. Di antaranya putih dan abu kertas #F5F7FB. Judul DM Serif Display 400 (editorial, SELALU font-normal:
// huruf ini hanya punya satu ketebalan, jadi tebal palsu dilarang), isi Inter, label kecil mono "/02 — Profil". Kartu
// radius 8 bergaris 1px, tombol radius 6, TANPA bayangan: kedalaman dari nada warna, garis tipis, dan kontras. Ukuran
// memakai container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';
import { postTheme } from '../shared/posts/theme';

/** Huruf judul: DM Serif Display (Google Fonts, SIL Open Font License), tegak + miring, satu ketebalan (400). */
export const NAWASENA_FONT: KitFont = {
  id: 'tpl-font-dm-serif-display',
  family: '"DM Serif Display", Georgia, "Times New Roman", serif',
  href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Warna netral tetap (tidak ikut warna tema). Kontras dihitung di brief §2.2. */
export const C = {
  /** Judul & teks penting di latar terang: navy turunan tema (17,6:1 di putih) */
  navy: 'text-(--nw-navy)',
  /** Paragraf: 10,5:1 di putih, 9,8:1 di #F5F7FB */
  body: 'text-[#344054]',
  /** Tanggal, keterangan, jabatan: 7,7:1 di putih, 7,2:1 di #F5F7FB */
  muted: 'text-[#475467]',
  /** Pita abu kertas */
  surface: 'bg-[#F5F7FB]',
} as const;

/** Skala huruf Nawasena (HP 390 → layar lebar). DISPLAY selalu font-normal. */
export const TYPE_N = {
  /** H1 hero: 36 → 54 → 68 → 80 → 88px (HP 36px: judul dua baris tanpa satu kata menggantung) */
  h1: `${DISPLAY} font-normal text-[36px] leading-[1.06] tracking-[-0.012em] @3xl:text-[54px] @5xl:text-[68px] @7xl:text-[80px] @min-[96rem]:text-[88px]`,
  /** H2 section: 32 → 40 → 48 → 54px */
  h2: `${DISPLAY} font-normal text-[32px] leading-[1.08] tracking-[-0.01em] @3xl:text-[40px] @5xl:text-[48px] @min-[96rem]:text-[54px]`,
  /** H2 sedang (kolom pengumuman & agenda di pita navy): 28 → 34 → 40px */
  h2Mid: `${DISPLAY} font-normal text-[28px] leading-[1.1] tracking-[-0.01em] @3xl:text-[34px] @5xl:text-[40px]`,
  /** H2 kecil (pita angka): 24 → 28 → 32px */
  h2Small: `${DISPLAY} font-normal text-[24px] leading-[1.15] @3xl:text-[28px] @5xl:text-[32px]`,
  /** H3 serif kartu: 21 → 24px */
  h3: `${DISPLAY} font-normal text-balance text-[21px] leading-[1.2] @3xl:text-[24px]`,
  /** H3 fungsional (pertanyaan, judul pengumuman, berita kecil): Inter 600 */
  h3Sans: 'text-balance text-[16.5px] font-semibold leading-snug @3xl:text-[17.5px]',
  /** Kutipan miring: 24 → 30 → 36px */
  quote: `${DISPLAY} font-normal italic text-[24px] leading-[1.3] @3xl:text-[30px] @5xl:text-[36px]`,
  /** Angka statistik serif: 44 → 56 → 64px */
  stat: `${DISPLAY} font-normal text-[44px] leading-none tabular-nums @3xl:text-[56px] @5xl:text-[64px]`,
  lead: 'text-[16.5px] leading-[1.6] @3xl:text-[18px] @7xl:text-[19px]',
  body: 'text-[15.5px] leading-[1.65] @3xl:text-[16px]',
  small: 'text-[13.5px] leading-snug',
  /** Label mono kecil (nomor section, tanggal, jadwal) */
  mono: 'font-mono text-[12px] font-medium tracking-[0.04em]',
} as const;

/** Tombol persegi panjang radius 6 (bukan pil). Hover tenang: warna atau garis berubah, tidak terangkat. */
const BUTTON =
  'inline-flex max-w-full items-center justify-center gap-2 rounded-[6px] font-semibold whitespace-nowrap transition-colors duration-300';
export const BTN = {
  /** Warna tema, teks kontras otomatis (--tpl-on-accent) */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Garis putih di atas navy/foto (tombol header, tombol kedua hero, footer) */
  outlineWhite: `${BUTTON} text-white ring-1 ring-inset ring-white/55 hover:bg-white hover:text-(--nw-navy)`,
  /** Garis tipis di latar terang */
  outline: `${BUTTON} bg-white text-(--nw-navy) ring-1 ring-inset ring-black/[0.14] hover:ring-(--nw-navy)`,
  lg: 'h-12 px-6 text-[15px]',
  md: 'h-11 px-5 text-[14px]',
  sm: 'h-10 px-4 text-[14px]',
} as const;

/** Kartu datar radius 8 dengan garis 1px. */
export const CARD = {
  white: 'rounded-[8px] bg-white ring-1 ring-inset ring-black/[0.08]',
  surface: 'rounded-[8px] bg-[#F5F7FB]',
  navy: 'rounded-[8px] bg-white/[0.05] ring-1 ring-inset ring-white/10',
} as const;

/** Tombol ikon persegi 44px (kontrol slide, rel prestasi). */
export const SQUARE = {
  light: 'flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] text-(--nw-navy) ring-1 ring-inset ring-black/[0.14] transition-colors duration-300 hover:bg-[#F5F7FB] hover:ring-(--nw-navy)',
  dark: 'flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] text-white ring-1 ring-inset ring-white/25 transition-colors duration-300 hover:bg-white/10 hover:ring-white/60',
} as const;

/** Ritme vertikal section: 64 → 96 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28';

/** Isian formulir: 16px di HP (iOS tidak memperbesar), garis #858FA1 (3,3:1), fokus cincin tema versi kontras. */
export const INPUT =
  'block w-full rounded-[6px] bg-white px-3.5 text-[16px] text-(--nw-navy) ring-1 ring-inset ring-[#858FA1] placeholder:text-[#667085] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) @3xl:text-[15px]';

/** Halaman & section profesional berita (latar terang; juga /berita, /pengumuman, /berita/{slug}). */
export const POST_THEME = postTheme({
  display: `${DISPLAY} font-normal`,
  heading: C.navy,
  body: C.body,
  muted: C.muted,
  accent: 'text-(--nw-ink)',
  chip: 'bg-(--nw-tint) text-(--nw-ink)',
  urgent: 'bg-[#FEECEB] text-[#B42318]',
  filterOn: 'bg-(--nw-navy) text-white',
  filterOff: 'bg-[#F5F7FB] text-(--nw-navy) hover:bg-[#EAEEF5]',
  soft: C.surface,
  card: 'bg-white ring-1 ring-inset ring-black/[0.08]',
  line: 'border-black/[0.08]',
  radius: 'rounded-[8px]',
  photoRadius: 'rounded-[8px]',
  button: `${BTN.primary} ${BTN.md}`,
  buttonGhost: `${BTN.outline} ${BTN.md}`,
});

/** Papan pengumuman profesional di pita navy (teks putih, kartu putih 5%). */
export const POST_THEME_NAVY = postTheme({
  display: `${DISPLAY} font-normal`,
  heading: 'text-white',
  body: 'text-white/[0.86]',
  muted: 'text-white/[0.72]',
  accent: 'text-(--nw-bright)',
  chip: 'bg-white/10 text-white',
  urgent: 'bg-[#FEE4E2] text-[#9B1C1C]',
  warn: 'bg-[#FEF3E2] text-[#93370D]',
  filterOn: 'bg-white text-(--nw-navy)',
  filterOff: 'bg-white/[0.06] text-white hover:bg-white/10',
  soft: 'bg-white/[0.06] ring-1 ring-inset ring-white/10',
  card: 'bg-white/[0.05] ring-1 ring-inset ring-white/10',
  line: 'border-white/[0.12]',
  radius: 'rounded-[8px]',
  photoRadius: 'rounded-[8px]',
  button: `${BTN.outlineWhite} ${BTN.md}`,
  buttonGhost: `${BTN.outlineWhite} ${BTN.md}`,
});
