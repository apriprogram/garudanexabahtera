// Gaya MomKid Hospital "Warm pastel": rumah sakit ibu & anak yang hangat dan ramah. Halaman krem #FFF9F5 bergantian
// dengan putih, dua pita pastel (mint di jadwal imunisasi, peach di ajakan) dengan tepi bergelombang, footer mint.
// Judul Nunito 800 (membulat, ramah), isi Inter. Kartu radius 28 berisi warna pastel (peach dari warna tema, mint
// tetap) TANPA ring dan TANPA bayangan; tombol pil. Teks berwarna tema selalu --mk-accent-text (warna tema digelapkan
// sampai ≥ 4,6:1 di atas peach paling pekat, lihat ./model momkidVars), bukan warna tema mentah. Ukuran memakai
// container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Nunito (Google Fonts, SIL Open Font License) 700/800. Isi tetap Inter. */
export const MOMKID_FONT: KitFont = {
  id: 'tpl-font-nunito',
  family: '"Nunito", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Warna tetap (tidak ikut warna tema). Kontras dihitung dengan rumus shared/utils (lihat brief). */
export const C = {
  /** Tinta plum-cokelat hangat: judul & isi (≥ 12:1 di semua permukaan; 5,7:1 di warna tema) */
  ink: 'text-[#2E2228]',
  /** Teks kedua (≥ 5,4:1 di krem, putih, mint, peach) */
  muted: 'text-[#6A5559]',
  /** Teks berwarna tema (≥ 4,6:1 di semua permukaan terang template) */
  accent: 'text-(--mk-accent-text)',
  /** Tinta mint untuk label di atas mint/putih/krem (5,5:1 di mint) */
  mintInk: 'text-[#1E6B53]',
  /** Garis tipis dekoratif */
  line: 'border-[#2E2228]/10',
} as const;

/** Latar permukaan. */
export const BG = {
  cream: 'bg-[#FFF9F5]',
  white: 'bg-white',
  mint: 'bg-[#DDF3EA]',
  /** Peach lembut (12% warna tema di atas krem): kartu pastel A */
  peachSoft: 'bg-(--mk-peach-soft)',
  /** Peach (22%): pita ajakan, panel aktif */
  peach: 'bg-(--mk-peach)',
  /** Kuning mentega: kotak darurat & ilustrasi */
  butter: 'bg-[#FFF1DA]',
} as const;

/** Latar section per nada (./model sectionTones). */
export const TONE_BG = {
  cream: 'bg-[#FFF9F5]',
  white: 'bg-white',
  mint: 'bg-[#DDF3EA]',
  peach: 'bg-(--mk-peach)',
} as const;

/** Isi gelombang (SVG) per nada. */
export const TONE_FILL = {
  cream: 'fill-[#FFF9F5]',
  white: 'fill-white',
  mint: 'fill-[#DDF3EA]',
  peach: 'fill-(--mk-peach)',
} as const;

/** Kartu pastel bergiliran: peach lembut, lalu mint. */
export const PASTELS = ['bg-(--mk-peach-soft)', 'bg-[#DDF3EA]'] as const;

export const TYPE = {
  /** H1 hero: 34 → 46 → 56 → 64px */
  h1: `${DISPLAY} font-extrabold text-balance text-[34px] leading-[1.06] tracking-[-0.02em] @2xl:text-[46px] @5xl:text-[56px] @7xl:text-[64px]`,
  /** H2 section: 30 → 40 → 46px */
  h2: `${DISPLAY} font-extrabold text-balance text-[30px] leading-[1.1] tracking-[-0.02em] @3xl:text-[40px] @6xl:text-[46px]`,
  /** Judul kartu: 19 → 21px */
  h3: `${DISPLAY} font-extrabold text-[19px] leading-snug tracking-[-0.01em] @3xl:text-[21px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[18px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13.5px] leading-snug',
  /** Harga paket "Rp6,5 jt" */
  price: `${DISPLAY} font-extrabold tabular-nums text-[34px] leading-none tracking-[-0.02em] @3xl:text-[40px]`,
  /** Label pendek Nunito (chip, label section, menu) */
  label: `${DISPLAY} font-extrabold text-[13.5px] leading-none`,
  /** Kutipan testimoni */
  quote: 'text-[16px] leading-relaxed @3xl:text-[17px]',
} as const;

/** Tombol pil, label Nunito 800; panah/ikon bergeser 2px saat disorot. */
const BUTTON = `group/btn inline-flex max-w-full items-center justify-center gap-2.5 rounded-full ${DISPLAY} font-extrabold whitespace-nowrap transition-colors duration-200`;
export const BTN = {
  /** Warna tema, teks kontras otomatis (--tpl-on-accent) */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Mint + tinta */
  mint: `${BUTTON} bg-[#DDF3EA] text-[#2E2228] hover:bg-[#C6E9DA]`,
  /** Putih + tinta (di atas pita peach/mint) */
  white: `${BUTTON} bg-white text-[#2E2228] hover:bg-[#FFF9F5]`,
  md: 'h-11 px-5 text-[14.5px]',
  lg: 'h-12 px-6 text-[15.5px] @3xl:h-14 @3xl:px-7 @3xl:text-[16px]',
} as const;

/** Tautan teks berwarna tema dengan garis bawah tebal (target sentuh 44px). */
export const TEXT_LINK = `inline-flex min-h-11 items-center gap-2 ${DISPLAY} text-[15.5px] font-extrabold text-(--mk-accent-text) underline decoration-2 decoration-(--mk-peach) underline-offset-[7px] transition-colors hover:decoration-(--mk-accent-text)`;

/** Kartu pastel radius 28, tanpa ring & tanpa bayangan. */
export const CARD = 'rounded-[28px]';

/** Ritme vertikal section: 56 → 80 → 96px (HP ringkas, layar lebar lega). */
export const SECTION_PAD = 'py-14 @3xl:py-20 @5xl:py-24';

/**
 * Daftar kartu yang di HP & tablet tegak menjadi REL GESER (scroll-snap, menembus tepi wadah, kartu berikutnya
 * mengintip) dan ≥ @4xl menjadi kisi (kolom dari pemanggil). Halaman HP jadi jauh lebih pendek tanpa membuang isi.
 * `relative`: elemen absolut di dalam kartu (mis. teks sr-only) ikut terpotong rel, tidak melebarkan halaman.
 */
export const RAIL =
  'mk-rail relative -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-1 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @4xl:mx-0 @4xl:grid @4xl:gap-5 @4xl:overflow-visible @4xl:px-0 @4xl:pb-0';
/** Kartu di dalam RAIL: ± 86% lebar di HP, 60% di tablet tegak, sel kisi di layar lebar. */
export const RAIL_ITEM = 'min-w-0 shrink-0 snap-start w-[86%] @xl:w-[60%] @4xl:w-auto';

/** Jarak kolom grid. */
export const GRID_GAP = 'gap-x-6 @5xl:gap-x-8 @7xl:gap-x-12';

/** Isian formulir: 16px di HP (iOS tidak memperbesar), sudut 16px, garis tinta 45% (≥ 3:1), fokus cincin tema. */
export const INPUT =
  'block w-full rounded-2xl bg-white px-4 text-[16px] text-[#2E2228] ring-1 ring-inset ring-[#2E2228]/45 placeholder:text-[#7A6A6E] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--mk-accent-text) @3xl:text-[15px]';
