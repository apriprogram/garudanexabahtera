// Gaya Lawatan "Postcard journal": krem #FBF6EE dan putih bergantian, satu pita tinta (galeri), hijau tua turunan warna
// tema untuk footer dan panel estimasi, judul Bricolage Grotesque 700/800, isi Inter. Motif kartu pos dipakai hemat:
// garis airmail tipis (header, panel hero, footer), perangko berlubang (harga, kota testimoni, simbol), cap pos, label
// "perangko" bergaris putus-putus. DATAR: tanpa bayangan; kedalaman dari tingkat warna, garis rambut 1px, bingkai putih
// 8px, skala, dan kemiringan. Wadah PENUH (WRAP tanpa max-w), ukuran memakai container query (@…) karena template
// dirender di bingkai HP 390 / panel CMS. Warna tema = --tpl-accent* milik Shell + --lw-* dari ./model.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Bricolage Grotesque (Google Fonts, SIL Open Font License), sumbu opsz 12–96, ketebalan 600–800. */
export const LAWATAN_FONT: KitFont = {
  id: 'tpl-font-bricolage-grotesque',
  family: '"Bricolage Grotesque", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Wadah PENUH kiri-kanan (tanpa max-w, tanpa mx-auto): jarak tepi 20 → 32 → 48 → 64px. Header, section, footer. */
export const WRAP = 'w-full px-5 @2xl:px-8 @5xl:px-12 @min-[96rem]:px-16';

/** Warna netral (tidak ikut warna tema). Kontras dihitung dengan rumus shared/utils (lihat brief). */
export const C = {
  /** Tinta: judul, isi, nilai (14,9:1 di krem, 16:1 di putih) */
  ink: 'text-[#1D2320]',
  /** Paragraf, keterangan (5,9:1 di krem, 6,4:1 di putih) */
  muted: 'text-[#5A615C]',
  /** Garis rambut 12% tinta (dekoratif) */
  line: 'border-[#1D2320]/[0.12]',
  divide: 'divide-[#1D2320]/[0.12]',
  /** Pita A: krem */
  cream: 'bg-[#FBF6EE]',
  /** Pita B: putih */
  white: 'bg-white',
  /** Hijau tua turunan warna tema (putih ≥ 10:1) */
  deep: 'bg-(--lw-deep)',
  /** Teks aksen di krem/putih (≥ 4,5:1 di krem, dijaga ./model) */
  accent: 'text-(--lw-ink)',
  /** Teks utama di hijau tua / tinta */
  onDark: 'text-[#FBF6EE]',
  /** Teks kedua di hijau tua: krem 72% (≥ 6:1) */
  onDarkMuted: 'text-[#FBF6EE]/[0.72]',
} as const;

/** Label perangko: kapital 11px berjarak lebar. */
export const LABEL = 'text-[11px] font-semibold uppercase leading-none tracking-[0.16em]';
/** Label isian & keterangan kecil kapital */
export const LABEL_SM = 'text-[11.5px] font-semibold uppercase tracking-[0.12em]';
/** Angka tabular Inter (jam, km) */
export const NUM = 'tabular-nums';

export const TYPE = {
  /**
   * H1 hero: HP 28–34px mengikuti lebar (8,2cqw: 32px di 390, jadi "Liburan rombongan," muat satu baris dan judul demo
   * tetap 3 baris dari 360 sampai 430px) → 40 → 52 → 56 (1024–1151px, panel hero 76% lebar: judul demo tetap 2 baris)
   * → 64 → 76px, Bricolage 800
   */
  h1: `${DISPLAY} font-extrabold text-balance text-[clamp(28px,8.2cqw,34px)] @xl:text-[40px] leading-[1.02] tracking-[-0.025em] @3xl:text-[52px] @5xl:text-[56px] @5xl:leading-[0.98] @6xl:text-[64px] @min-[96rem]:text-[76px]`,
  /** H2: 30 → 38 → 48 → 56px, Bricolage 700 */
  h2: `${DISPLAY} font-bold text-balance text-[30px] leading-[1.05] tracking-[-0.02em] @3xl:text-[38px] @5xl:text-[48px] @min-[96rem]:text-[56px]`,
  /** H3 kartu: 20 → 22px */
  h3: `${DISPLAY} font-bold text-[20px] leading-[1.15] tracking-[-0.01em] @3xl:text-[22px]`,
  /** H3 kecil (ubin, titik itinerary) */
  h3sm: `${DISPLAY} font-bold text-[18px] leading-[1.2] tracking-[-0.01em]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[18px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13px] leading-snug',
  /** Angka besar Bricolage (estimasi, hari) */
  money: `${DISPLAY} font-extrabold tracking-[-0.02em] tabular-nums`,
  /** Kutipan testimoni */
  quote: `${DISPLAY} font-semibold text-[19px] leading-[1.35] tracking-[-0.005em] @3xl:text-[20px]`,
} as const;

/** Tombol pil; disorot → warna berganti, panah bergeser 3px (tanpa angkat, tanpa bayangan). */
const BUTTON =
  'group/btn inline-flex max-w-full items-center justify-center gap-2.5 rounded-full text-[15px] font-semibold whitespace-nowrap transition-colors duration-200';
export const BTN = {
  /** Warna tema, teks kontras otomatis (--tpl-on-accent) */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Tinta */
  ink: `${BUTTON} bg-[#1D2320] text-white hover:bg-black`,
  /** Krem di hijau tua */
  cream: `${BUTTON} bg-[#FBF6EE] text-[#1D2320] hover:bg-white`,
  /** Garis tinta 1px */
  outline: `${BUTTON} text-[#1D2320] ring-1 ring-inset ring-[#1D2320]/35 hover:bg-[#1D2320] hover:text-white`,
  md: 'h-11 px-5',
  lg: 'h-12 px-6 @3xl:h-[52px] @3xl:px-7',
} as const;

/** Tautan teks bergaris bawah (target sentuh 44px). */
export const TEXT_LINK =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-[#1D2320] underline decoration-[#1D2320]/35 decoration-1 underline-offset-[6px] transition-colors hover:text-(--lw-ink) hover:decoration-(--tpl-accent)';
export const TEXT_LINK_INV =
  'inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-[#FBF6EE] underline decoration-[#FBF6EE]/50 decoration-1 underline-offset-[6px] transition-colors hover:decoration-[#FBF6EE]';

/** Ritme vertikal section: 64 → 96 → 112 → 128px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28 @7xl:py-32';

/** Jarak kolom grid 12 (desktop). */
export const GRID_GAP = 'gap-x-6 @5xl:gap-x-10 @7xl:gap-x-14';

/** Kartu pos: putih, radius 18, garis rambut tinta 10%. */
export const POSTCARD = 'rounded-[18px] bg-white ring-1 ring-inset ring-[#1D2320]/10';

/** Isian formulir: radius 12, putih, garis tinta 55% (≥ 3:1), 16px di HP (iOS tidak memperbesar). */
export const INPUT =
  'block w-full rounded-xl bg-white px-3.5 text-[16px] text-[#1D2320] ring-1 ring-inset ring-[#1D2320]/55 placeholder:text-[#6B716D] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--lw-ink) @3xl:text-[15px]';

/** Chip pilihan (radio bawaan disembunyikan): pil, garis tinta 30%; terpilih = tinta penuh + teks putih (16:1). */
export const CHIP =
  'relative inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-white px-4 text-[14px] font-semibold text-[#1D2320] ring-1 ring-inset ring-[#1D2320]/30 transition-colors hover:ring-[#1D2320]/60 has-[:checked]:bg-[#1D2320] has-[:checked]:text-white has-[:checked]:ring-[#1D2320] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--lw-ink)';
