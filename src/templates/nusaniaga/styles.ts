// Gaya NusaNiaga "Slatted import ledger": website importir & distributor bahan baku industri yang tenang, rapi, dan
// tepat. Halaman putih bergantian dengan pita abu sejuk #F2F4F7, satu warna aksen (crimson bawaan) dipakai hemat: blok
// tombol di menu atas, tombol pil bertitik, garis atas 3px di kartu, label berbingkai, garis alur proses, dan satu pita
// ajakan. DATAR: tanpa bayangan sama sekali; ring tipis, garis rambut, dan perubahan nada menggantikan bayangan.
// Judul Manrope 700 yang rapat (SIL OFL), isi Inter. Ukuran memakai container query (@…) karena template dirender di
// bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Manrope 600/700 (Google Fonts, SIL Open Font License). */
export const NUSANIAGA_FONT: KitFont = {
  id: 'tpl-font-manrope',
  family: '"Manrope", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@600;700&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Warna netral sejuk (tidak ikut warna aksen). Kontras dihitung dengan rumus shared/utils. */
export const C = {
  /** Tinta: 17,8:1 di putih, 16,1:1 di #F2F4F7 */
  ink: 'text-[#141821]',
  /** Paragraf: 7,5:1 di putih, 6,8:1 di #F2F4F7 */
  muted: 'text-[#4D5562]',
  /** Keterangan kecil: 5,9:1 di putih, 5,3:1 di #F2F4F7 */
  subtle: 'text-[#5D6573]',
  /** Pita abu sejuk bergantian dengan putih */
  surface: 'bg-[#F2F4F7]',
} as const;

/** Warna garis rambut untuk border (pakai bersama border-t/border-b/border-y). */
export const LINE = 'border-[#141821]/[0.08]';
/** Warna garis rambut untuk divide-y (warna divide terpisah dari warna border). */
export const DIVIDE = 'divide-[#141821]/[0.08]';

export const TYPE_N = {
  /** H1 hero: 32 → 44 → 48 → 58 → 68px, rapat */
  h1: `${DISPLAY} font-bold text-[32px] leading-[1.04] tracking-[-0.04em] text-balance @2xl:text-[44px] @5xl:text-[48px] @7xl:text-[58px] @min-[96rem]:text-[68px]`,
  /** H2 section: 28 → 36 → 42 → 50px */
  h2: `${DISPLAY} font-bold text-[28px] leading-[1.08] tracking-[-0.035em] text-balance @3xl:text-[36px] @5xl:text-[42px] @min-[96rem]:text-[50px]`,
  /** H2 kecil (judul klien): 22 → 26 → 30px */
  h2sm: `${DISPLAY} font-bold text-[22px] leading-[1.15] tracking-[-0.03em] text-balance @3xl:text-[26px] @6xl:text-[30px]`,
  /** Judul kartu, langkah, dan pertanyaan: 18 → 19px */
  h3: `${DISPLAY} font-bold text-[18px] leading-snug tracking-[-0.02em] text-balance @3xl:text-[19px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px] @7xl:text-[18px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13.5px] leading-snug',
  /** Kutipan testimoni */
  quote: `${DISPLAY} font-semibold text-[18px] leading-[1.45] tracking-[-0.01em] @3xl:text-[20px]`,
  /**
   * Angka besar 2×2: ukuran mengikuti lebar SEL angka (sel = @container, ./Proof), 28–68px, sehingga nilai sampai
   * 8 huruf (batas skema) tetap di dalam sel di HP 320px maupun di kartu setengah halaman.
   */
  stat: `${DISPLAY} font-bold text-[clamp(28px,26cqi,68px)] leading-none tracking-[-0.05em] tabular-nums`,
  /** Kata besar di strip industri */
  marquee: `${DISPLAY} font-bold text-[28px] leading-[1.2] tracking-[-0.03em] @3xl:text-[40px] @6xl:text-[48px]`,
} as const;

/** Label section: persegi berbingkai garis aksen, huruf kapital Manrope 11px (mis. "PROSES IMPOR"). */
const TAG_BASE = `${DISPLAY} inline-flex max-w-full min-h-7 items-center rounded-[3px] px-2.5 py-1 text-[11px] font-bold uppercase leading-[1.25] tracking-[0.16em] ring-1 ring-inset`;
export const TAG = `${TAG_BASE} text-(--nn-ink) ring-(--tpl-accent)`;
/** Label di atas pita aksen */
export const TAG_BAND = `${TAG_BASE} text-(--tpl-on-accent) ring-(--tpl-on-accent)/70`;

/** Tombol pil warna aksen dengan titik di depan label (titik membesar saat disorot). */
const PILL =
  'group/btn inline-flex max-w-full items-center justify-center gap-2.5 rounded-full font-semibold whitespace-nowrap transition-colors duration-200';
export const BTN = {
  primary: `${PILL} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  outline: `${PILL} bg-white text-[#141821] ring-1 ring-inset ring-[#141821]/20 hover:text-(--nn-ink) hover:ring-(--tpl-accent)`,
  /** Tombol utama di pita aksen */
  band: `${PILL} bg-(--tpl-on-accent) text-(--tpl-accent)`,
  /** Tombol kedua di pita aksen (berisi warna aksen agar bilah dekoratif di belakangnya tidak tembus) */
  bandOutline: `${PILL} bg-(--tpl-accent) text-(--tpl-on-accent) ring-2 ring-inset ring-(--tpl-on-accent)/70 hover:ring-(--tpl-on-accent)`,
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-12 px-6 text-[15px] @3xl:h-[52px] @3xl:px-7',
} as const;

/** Warna titik per varian tombol. */
export const DOT_TONE = {
  primary: 'bg-current',
  outline: 'bg-(--tpl-accent)',
  band: 'bg-current',
  bandOutline: 'bg-current',
} as const;

export const DOT = 'h-2 w-2 shrink-0 rounded-full transition-transform duration-200 group-hover/btn:scale-150';

/** Kartu radius 16: putih, ring tipis, garis aksen 3px di tepi atas. */
export const CARD =
  'relative overflow-hidden rounded-2xl bg-white ring-1 ring-inset ring-[#141821]/[0.08] before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-[3px] before:bg-(--tpl-accent)';

/** Kotak ikon: bidang tint aksen, ikon garis 22px. */
export const ICON_BOX = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--nn-tint) text-(--nn-ink)';

/** Chip satuan di angka besar (6,4:1). */
export const UNIT_CHIP =
  'inline-flex h-6 items-center rounded-[4px] bg-(--nn-tint) px-2 text-[12px] font-semibold text-(--nn-ink) ring-1 ring-inset ring-(--nn-line)';

/** Lencana kode negara bulat (DE, JP, KR …). */
export const CODE_BADGE = `${DISPLAY} flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-(--nn-tint) px-1.5 text-[11px] font-bold tracking-[0.06em] text-(--nn-ink)`;

/** Ritme vertikal section: 64 → 96 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28';

/** Grid 12 kolom halaman (jarak kolom 24 → 32 → 48px). */
export const GRID = 'grid @5xl:grid-cols-12 @5xl:gap-x-8 @7xl:gap-x-12';

/** Foto 16:10 radius 16 (garis tipis di atas foto lewat <PhotoRing> di ./ui). */
export const PHOTO = 'aspect-[16/10] rounded-2xl';

/**
 * Isian formulir: 16px di HP (iOS tidak memperbesar), fokus cincin tinta aksen. Tinggi & garis TIDAK di sini agar tidak
 * bentrok: tambahkan `h-12` (input/select) atau `min-h-28 py-3` (textarea) dan INPUT_IDLE / INPUT_ERROR.
 * Dipakai di dalam wadah bernama `fields` (./Inquiry): 15px begitu formulir cukup lebar untuk dua kolom isian.
 */
export const INPUT =
  'block w-full rounded-xl bg-white px-4 text-[16px] text-[#141821] ring-inset placeholder:text-[#69707C] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nn-ink) @md/fields:text-[15px]';
/** Garis isian normal: 50% tinta (3,4:1 di putih, WCAG 1.4.11). */
export const INPUT_IDLE = 'ring-1 ring-[#141821]/50';
/** Garis isian bergalat: merah #B42318 (6,6:1). */
export const INPUT_ERROR = 'ring-2 ring-[#B42318]';
