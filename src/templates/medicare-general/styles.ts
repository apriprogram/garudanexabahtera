// Gaya MediCare General "Jelas & tenang, mudah dibaca semua usia": halaman putih dan biru kertas (#F3F7FC), SATU warna
// tema biru klinis (bawaan #0B63C9), dan merah darurat TETAP (#B71C1C) yang HANYA dipakai untuk elemen IGD (strip atas,
// ubin IGD hero, pita IGD, lencana darurat). Judul Atkinson Hyperlegible 700 (huruf yang dirancang agar mudah dibedakan
// oleh pembaca berpenglihatan lemah), isi Inter 17–18px dengan jarak baris 1,65. Ukuran huruf memakai kelas `mc-t-*`
// (./medicare-general.css) yang dikalikan variabel --mc-fs dari kontrol "Ukuran teks". DATAR: tanpa bayangan; garis tipis
// 1px (ring/border), tingkat warna latar, dan kaca putih di atas foto. Sudut: tombol 10px, kartu 12px. Container query
// (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Atkinson Hyperlegible (Google Fonts, SIL Open Font License) 400/700. Isi tetap Inter. */
export const MEDICARE_FONT: KitFont = {
  id: 'tpl-font-atkinson-hyperlegible',
  family: '"Atkinson Hyperlegible", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Merah darurat tetap (tidak ikut warna tema): putih di atasnya 6,57:1, di atas putih 6,57:1. */
export const EMERGENCY = '#B71C1C';

/** Warna netral. Kontras dihitung dengan rumus shared/utils (lihat brief). */
export const C = {
  /** Tinta biru-hitam: judul & isi (17,3:1 di putih, 16,1:1 di kertas) */
  ink: 'text-[#0E1B2E]',
  /** Teks sekunder (7,5:1 di putih, 7,0:1 di kertas, ≥ 6:1 di kaca putih/90) */
  muted: 'text-[#46566B]',
  /** Garis tipis 12% tinta (dekoratif) */
  line: 'border-[#0E1B2E]/[0.12]',
  /** Cincin kartu */
  ring: 'ring-1 ring-inset ring-[#0E1B2E]/[0.1]',
  /** Latar kertas biru sangat muda */
  paper: 'bg-[#F3F7FC]',
  /** Merah darurat sebagai teks (6,57:1 di putih) */
  red: 'text-[#B71C1C]',
  /** Latar merah darurat */
  redBg: 'bg-[#B71C1C]',
  /** Tint merah lembut (kotak catatan darurat); teks merah di atasnya ≥ 5,6:1 */
  redTint: 'bg-[#FDECEC]',
} as const;

/** Ukuran huruf berskala (kelas di ./medicare-general.css, ikut kontrol "Ukuran teks"). */
export const T = {
  h1: `mc-t-h1 ${DISPLAY} font-bold tracking-[-0.015em] text-balance`,
  h2: `mc-t-h2 ${DISPLAY} font-bold tracking-[-0.01em] text-balance`,
  h3: `mc-t-h3 ${DISPLAY} font-bold`,
  lead: 'mc-t-lead',
  body: 'mc-t-body',
  small: 'mc-t-small',
  label: 'mc-t-label font-semibold',
  num: `mc-t-num ${DISPLAY} font-bold tabular-nums`,
  phone: `mc-t-phone ${DISPLAY} font-bold tabular-nums`,
} as const;

/** Tombol persegi membulat (radius 10px), tinggi 52px (target sentuh ≥ 48px). */
const BUTTON =
  'group/btn inline-flex min-h-[52px] max-w-full items-center justify-center gap-2.5 rounded-[10px] px-6 py-2.5 text-center font-semibold leading-tight transition-colors duration-200 mc-t-btn';
export const BTN = {
  /** Biru tema, teks kontras otomatis */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Garis tema 2px di putih */
  outline: `${BUTTON} bg-white text-(--tpl-accent-ink) ring-2 ring-inset ring-(--tpl-accent-ink) hover:bg-(--tpl-accent-50)`,
  /** Merah darurat */
  emergency: `${BUTTON} bg-[#B71C1C] text-white hover:bg-[#9A1717]`,
  /** Putih di pita merah / footer gelap */
  white: `${BUTTON} bg-white text-[#0E1B2E] hover:bg-white/90`,
  /** Garis putih di pita merah */
  ghost: `${BUTTON} text-white ring-2 ring-inset ring-white/80 hover:bg-white/10`,
} as const;

/** Tautan teks bergaris bawah (target sentuh 48px). */
export const TEXT_LINK =
  'inline-flex min-h-12 items-center gap-2 font-semibold text-(--tpl-accent-ink) underline decoration-(--tpl-accent-ink)/40 decoration-2 underline-offset-[6px] transition-colors hover:decoration-(--tpl-accent-ink) mc-t-body';

/** Kartu datar putih radius 12 + garis tipis. */
export const CARD = 'rounded-[12px] bg-white ring-1 ring-inset ring-[#0E1B2E]/[0.1]';
/** Kartu yang bisa diklik: garis berganti warna tema saat disorot (tanpa angkat/geser). */
export const CARD_LINK = `${CARD} transition-colors duration-200 hover:ring-(--tpl-accent)`;

/** Kotak ikon besar: 56px, latar tint tema. */
export const ICON_BOX = 'flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-(--tpl-accent-50) text-(--tpl-accent-ink)';

/** Ritme vertikal section: 56 → 96 → 112px. */
export const SECTION_PAD = 'py-14 @3xl:py-24 @5xl:py-28';

/** Jarak grid 12 kolom. */
export const GRID_GAP = 'gap-x-6 @5xl:gap-x-10 @7xl:gap-x-14';

/**
 * Isian formulir: tinggi 52px, 17px (iOS tidak memperbesar), garis tinta 50% (3,3:1), fokus cincin tema 2px.
 * Ukuran huruf ikut kontrol "Ukuran teks".
 */
export const INPUT =
  'block w-full min-h-[52px] rounded-[10px] bg-white px-4 text-[#0E1B2E] ring-1 ring-inset ring-[#0E1B2E]/50 placeholder:text-[#5B6A7E] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) mc-t-body';
