// Gaya Bestari "Warm canvas": website SMA yang tenang dan editorial (referensi pemilik 2026-10-26: Lifestyle,
// Eduker, Bienes, Finovate). Halaman putih + panel pasir hangat, hero SLIDER foto selebar layar dengan menu pil putih
// melayang, label section berpenomor "(01)" bergaris tipis, judul besar berbobot sedang dengan bagian miring berwarna,
// tombol pil + bulatan panah di sampingnya, dan pita gelap hangat untuk footer. DATAR: tanpa bayangan; garis tipis
// (ring/border) dan bidang warna menggantikan bayangan. Warna utama = warna tema dari CMS (--tpl-accent* milik Shell +
// --bs-* dari ./model, bawaan terakota). Judul Instrument Sans (SIL OFL), isi Inter. Ukuran memakai container query
// (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';
import { postTheme } from '../shared/posts/theme';

/** Huruf judul: Instrument Sans (Google Fonts, SIL Open Font License), termasuk miring untuk bagian sorotan. */
export const BESTARI_FONT: KitFont = {
  id: 'tpl-font-instrument-sans',
  family: '"Instrument Sans", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap',
};

/** Warna netral hangat (tidak ikut warna tema). */
export const C = {
  /** Tinta hangat (17:1 di putih) */
  ink: 'text-[#1C1917]',
  /** 7,6:1 di putih, 6,8:1 di panel pasir */
  muted: 'text-[#57534E]',
  /** Abu hangat bagian kedua judul dua warna (4:1 di putih, 3,6:1 di pasir; HANYA untuk teks ≥ 24px, teks kecil → muted) */
  faint: 'text-[#857D75]',
  /** Panel pasir hangat */
  panel: 'bg-[#F5F2ED]',
} as const;

export const DISPLAY = FONT_DISPLAY;

/** Label kecil (kapital berjarak) untuk eyebrow & judul kolom. */
export const EYEBROW = 'text-[12px] font-semibold uppercase tracking-[0.16em]';

export const TYPE_B = {
  /** H1 hero: 36 → 50 → 62 → 72 → 80px, bobot sedang */
  h1: `${DISPLAY} font-medium text-[36px] leading-[1.03] tracking-[-0.035em] @2xl:text-[50px] @5xl:text-[62px] @7xl:text-[72px] @min-[96rem]:text-[80px]`,
  /** H2 section: 29 → 38 → 46 → 52px */
  h2: `${DISPLAY} font-medium text-[29px] leading-[1.08] tracking-[-0.03em] @3xl:text-[38px] @5xl:text-[46px] @min-[96rem]:text-[52px]`,
  /** Paragraf judul dua warna (Profil): 25 → 32 → 40 → 44px */
  statement: `${DISPLAY} font-medium text-[25px] leading-[1.2] tracking-[-0.025em] @3xl:text-[32px] @5xl:text-[40px] @min-[96rem]:text-[44px]`,
  /** Judul kartu: 18 → 21px */
  h3: `${DISPLAY} font-medium text-[18px] leading-snug tracking-[-0.015em] @3xl:text-[21px]`,
  lead: 'text-[15.5px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13.5px] leading-snug',
  /** Angka statistik besar */
  stat: `${DISPLAY} font-medium text-[42px] leading-none tracking-[-0.04em] tabular-nums @3xl:text-[54px] @6xl:text-[62px]`,
} as const;

/**
 * Tombol pil. Isi: label saja (plain) atau label di pil + bulatan panah TERPISAH di sampingnya (lihat <PillLink>,
 * referensi Finovate). Hover tenang: warna sedikit berubah, panah bergeser.
 */
const BUTTON = 'inline-flex max-w-full items-center justify-center gap-2.5 rounded-full font-medium whitespace-nowrap transition-colors duration-300';
export const BTN = {
  /** Warna tema, teks kontras otomatis (--tpl-on-accent) */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent)`,
  /** Tinta hangat (pil hitam referensi Bienes) */
  ink: `${BUTTON} bg-[#1C1917] text-white`,
  /** Putih di atas foto / pita gelap */
  white: `${BUTTON} bg-white text-[#1C1917]`,
  /** Kaca di atas foto */
  glass: `${BUTTON} bg-white/[0.12] text-white ring-1 ring-inset ring-white/35 backdrop-blur-md`,
  /** Bergaris tipis di latar terang */
  outline: `${BUTTON} bg-white text-[#1C1917] ring-1 ring-inset ring-[#1C1917]/[0.14]`,
  /** Tinggi pil + bulatan: 44 / 48px */
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-12 px-6 text-[15px]',
} as const;

/** Warna hover tiap varian (dipasang di pil & bulatan lewat group-hover). */
export const BTN_HOVER = {
  primary: 'group-hover:bg-(--tpl-accent-hover)',
  ink: 'group-hover:bg-[#2E2925]',
  white: 'group-hover:bg-[#F5F2ED]',
  glass: 'group-hover:bg-white/[0.2]',
  outline: 'group-hover:bg-[#F5F2ED]',
} as const;

/** Kartu datar radius 24. */
export const CARD = {
  white: 'rounded-[24px] bg-white ring-1 ring-inset ring-[#1C1917]/[0.08]',
  panel: 'rounded-[24px] bg-[#F5F2ED]',
  tint: 'rounded-[24px] bg-(--bs-soft) ring-1 ring-inset ring-(--bs-line)',
} as const;

/** Ritme vertikal section: 56 → 80 → 96px (halaman sekolah panjang). */
export const SECTION_PAD = 'py-14 @3xl:py-20 @5xl:py-24';

/** Panel membulat di dalam halaman putih (Program, Guru, FAQ): bungkus luar (jarak tepi kecil) + panel dalam. */
export const PANEL_OUTER = 'mx-auto max-w-[1720px] px-2 @2xl:px-3 @min-[96rem]:px-4';
export const PANEL = 'rounded-[28px] bg-[#F5F2ED] @3xl:rounded-[36px]';

/** Isian formulir: 16px di HP (iOS tidak memperbesar), garis tipis, fokus cincin tema versi kontras. */
export const INPUT =
  'block w-full rounded-[14px] bg-white px-4 text-[16px] text-[#1C1917] ring-1 ring-inset ring-[#1C1917]/[0.16] placeholder:text-[#78716C] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) @3xl:text-[15px]';

/** Halaman berita & pengumuman (/berita, /berita/{slug}; shared/posts) dengan token Bestari: judul Instrument Sans
 *  berbobot sedang warna tinta hangat, panel pasir, chip tint tema, tombol pil warna tema / bergaris tipis, kartu
 *  radius 24. */
export const POST_THEME = postTheme({
  display: `${DISPLAY} font-medium`,
  heading: C.ink,
  body: 'text-[#292524]',
  muted: C.muted,
  accent: 'text-(--bs-ink)',
  chip: 'bg-(--bs-tint) text-(--bs-ink)',
  urgent: 'bg-[#FEECEB] text-[#B42318]',
  soft: C.panel,
  card: 'bg-white ring-1 ring-inset ring-[#1C1917]/[0.08]',
  line: 'border-[#1C1917]/[0.1]',
  radius: 'rounded-[24px]',
  photoRadius: 'rounded-[24px]',
  button: `${BTN.primary} ${BTN.md} hover:bg-(--tpl-accent-hover)`,
  buttonGhost: `${BTN.outline} ${BTN.md} hover:bg-[#F5F2ED]`,
});
