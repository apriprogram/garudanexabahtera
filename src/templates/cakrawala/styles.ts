// Gaya Cakrawala "Clear horizon": website sekolah (SMK/SMA) yang bersih dan percaya diri. Halaman putih, hero foto
// slider selebar layar dengan logo + menu pil kaca di atas foto, kartu info yang menumpang di tepi bawah hero,
// panel abu kebiruan sangat muda, satu pita gelap biru tinta (teaching factory) dan footer biru tinta. Judul Plus
// Jakarta Sans 600/700, isi Inter. DATAR: tanpa bayangan; garis tipis (ring) dan bidang warna menggantikan bayangan.
// Warna utama = warna tema dari CMS (--tpl-accent* milik Shell + --ck-* dari ./model): ganti biru ↔ hijau di satu
// isian. Ukuran memakai container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import { FONT_DISPLAY } from '../shared/layout';
import { postTheme } from '../shared/posts/theme';

/** Warna netral tetap (tidak ikut warna tema). */
export const C = {
  /** Tinta biru malam (16:1 di putih) */
  ink: 'text-[#0D1830]',
  /** 7,2:1 di putih, 6,6:1 di panel #F3F6FA */
  muted: 'text-[#4A5568]',
  /** Panel abu kebiruan sangat muda (statistik, PPDB, FAQ) */
  panel: 'bg-[#F3F6FA]',
} as const;

export const DISPLAY = FONT_DISPLAY;

/** Label kecil di atas judul: kapital berjarak, warna tinta tema. */
export const EYEBROW = 'text-[12px] font-semibold uppercase tracking-[0.14em] @3xl:text-[12.5px]';

export const TYPE_C = {
  /** H1 hero: 34 → 46 → 56 → 64 → 72px */
  h1: `${DISPLAY} font-bold text-[34px] leading-[1.06] tracking-[-0.035em] @2xl:text-[46px] @5xl:text-[56px] @7xl:text-[64px] @min-[96rem]:text-[72px]`,
  /** H2 section: 27 → 34 → 40 → 44px */
  h2: `${DISPLAY} font-semibold text-[27px] leading-[1.12] tracking-[-0.03em] @3xl:text-[34px] @5xl:text-[40px] @min-[96rem]:text-[44px]`,
  /** Judul kartu: 17 → 19px */
  h3: `${DISPLAY} font-semibold text-[17px] leading-snug tracking-[-0.015em] @3xl:text-[19px]`,
  lead: 'text-[15.5px] leading-relaxed @3xl:text-[17px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13.5px] leading-snug',
  /** Angka statistik */
  stat: `${DISPLAY} font-bold text-[30px] leading-none tracking-[-0.03em] tabular-nums @3xl:text-[36px] @6xl:text-[40px]`,
} as const;

/** Tombol pil + lingkaran panah (gaya referensi). Isi: label + <ArrowDot> (lihat ./ui). */
const BUTTON =
  'inline-flex max-w-full items-center justify-center gap-3 rounded-full font-semibold whitespace-nowrap transition-colors';
export const BTN = {
  /** Warna tema, teks kontras otomatis (--tpl-on-accent) */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Tinta gelap (pil hitam referensi CBRLP) */
  ink: `${BUTTON} bg-[#0D1830] text-white hover:bg-[#1B2A47]`,
  /** Putih di atas foto / pita gelap */
  white: `${BUTTON} bg-white text-[#0D1830] hover:bg-[#EEF2F8]`,
  /** Kaca di atas foto / pita gelap */
  glass: `${BUTTON} bg-white/[0.12] text-white ring-1 ring-inset ring-white/30 backdrop-blur-md hover:bg-white/[0.2]`,
  /** Putih bergaris tipis di latar terang */
  outline: `${BUTTON} bg-white text-[#0D1830] ring-1 ring-inset ring-black/[0.12] hover:bg-[#F3F6FA]`,
  md: 'h-11 pl-5 pr-1.5 text-[14px]',
  lg: 'h-12 pl-6 pr-1.5 text-[15px]',
  /** Tanpa lingkaran panah */
  plain: 'h-11 px-5 text-[14px]',
} as const;

/** Kartu datar radius 20. */
export const CARD = {
  white: 'rounded-[20px] bg-white ring-1 ring-inset ring-black/[0.07]',
  panel: 'rounded-[20px] bg-[#F3F6FA]',
  tint: 'rounded-[20px] bg-(--ck-soft) ring-1 ring-inset ring-(--ck-line)',
  /** Kartu di pita gelap */
  dark: 'rounded-[20px] bg-white/[0.06] ring-1 ring-inset ring-white/[0.1]',
} as const;

/** Kaca terang di atas foto: putih tembus + blur, tanpa bayangan. */
export const GLASS = 'bg-white/[0.14] ring-1 ring-inset ring-white/25 backdrop-blur-xl';

/**
 * Bingkai hero (inset) + bantalan isi hero: jumlah keduanya = jarak tepi CONTAINER (20 → 32 → 48 → 64px), jadi tepi
 * kiri logo, judul hero, dan isi section lain sejajar.
 */
export const INSET = 'px-2 @2xl:px-3 @min-[96rem]:px-4';
export const INSET_PAD = 'px-3 @2xl:px-5 @5xl:px-9 @min-[96rem]:px-12';

/** Ritme vertikal section: 56 → 80 → 96px (halaman sekolah panjang, jadi sedikit lebih rapat dari SECTION_Y bersama). */
export const SECTION_PAD = 'py-14 @3xl:py-20 @5xl:py-24';

/** Panel membulat di dalam halaman putih (seperti bingkai hero): bungkus luar + panel dalam. */
export const PANEL_OUTER = `mx-auto max-w-[1680px] ${INSET}`;
export const PANEL = {
  soft: `rounded-[24px] bg-[#F3F6FA] @3xl:rounded-[32px] ${INSET_PAD}`,
  deep: `ck-deep rounded-[24px] text-white @3xl:rounded-[32px] ${INSET_PAD}`,
} as const;

/** Pita gelap selebar layar dari tepi ke tepi (teaching factory, footer; pemilik 2026-10-25): tanpa sudut membulat dan
 *  tanpa jarak tepi. Isinya dibungkus CONTAINER agar sejajar section lain. */
export const BAND_DEEP = 'ck-deep text-white';

/** Isian formulir: 16px di HP (iOS tidak memperbesar), garis tipis, fokus cincin tema versi kontras (--tpl-accent-ink ≥ 3:1
 *  di putih, juga untuk warna tema terang dari CMS). */
export const INPUT =
  'block w-full rounded-[12px] bg-white px-4 text-[16px] text-[#0D1830] ring-1 ring-inset ring-black/[0.14] placeholder:text-[#6B7280] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) @3xl:text-[15px]';

/** Halaman berita & pengumuman (/berita, /berita/{slug}; shared/posts) dengan token Cakrawala: judul tinta biru malam,
 *  panel abu kebiruan, chip tint tema, tombol pil warna tema, kartu radius 20. */
export const POST_THEME = postTheme({
  display: `${DISPLAY} font-semibold`,
  heading: C.ink,
  body: 'text-[#26324A]',
  muted: C.muted,
  accent: 'text-(--ck-ink)',
  chip: 'bg-(--ck-tint) text-(--ck-ink)',
  urgent: 'bg-[#FEECEB] text-[#B42318]',
  filterOn: 'bg-[#0D1830] text-white',
  filterOff: 'bg-[#F3F6FA] text-[#0D1830] hover:bg-[#E7ECF4]',
  soft: C.panel,
  card: 'bg-white ring-1 ring-inset ring-black/[0.07]',
  line: 'border-black/[0.07]',
  radius: 'rounded-[20px]',
  photoRadius: 'rounded-[20px]',
  button: `${BTN.primary} ${BTN.plain}`,
  buttonGhost: `${BTN.outline} ${BTN.plain}`,
});
