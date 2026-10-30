// Gaya Kemudi "Clean dashboard": rental mobil yang rapi seperti dasbor produk. Putih dan abu dingin #F2F4F7
// bergantian, SATU pita grafit #161B22 (film proses) + footer grafit, biru elektrik sebagai sorotan UI (tombol, ibu jari
// kontrol bersegmen, harga, bodi mobil ilustrasi). Judul Hanken Grotesk 600/700 rapat, isi Inter, spesifikasi & harga
// tabel JetBrains Mono. Tombol rounded-2xl, kartu radius 24 putih di atas abu, label section = pil bertitik + nomor mono.
// DATAR: tanpa bayangan; kedalaman dari tingkat warna, cincin 1px, dan garis rambut. Wadah PENUH (WRAP, tanpa max-w):
// header, setiap section, dan footer selebar layar dengan jarak tepi 20 → 32 → 48 → 64px. Ukuran memakai container
// query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Hanken Grotesk (Google Fonts, SIL Open Font License) 500/600/700. Isi Inter, angka spesifikasi mono. */
export const KEMUDI_FONT: KitFont = {
  id: 'tpl-font-hanken-grotesk',
  family: '"Hanken Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@500;600;700&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Wadah selebar layar (tanpa max-w, tanpa mx-auto): jarak tepi 20 → 32 → 48 → 64px. */
export const WRAP = 'w-full px-5 @2xl:px-8 @5xl:px-12 @min-[96rem]:px-16';

/** Warna netral (tidak ikut warna tema). Kontras dihitung dengan rumus shared/utils (lihat brief). */
export const C = {
  /** Tinta: judul, isi, nilai (18,9:1 di putih, 17,2:1 di abu) */
  ink: 'text-[#0D1117]',
  /** Paragraf, label, keterangan (7,6:1 di putih, 6,9:1 di abu) */
  muted: 'text-[#4B5563]',
  /** Garis rambut 10% tinta (dekoratif) */
  line: 'border-[#0D1117]/10',
  divide: 'divide-[#0D1117]/10',
  white: 'bg-white',
  /** Pita B: abu dingin */
  grey: 'bg-[#F2F4F7]',
  /** Pita gelap film & footer */
  graphite: 'bg-[#161B22]',
  /** Teks aksen di putih/abu (≥ 4,5:1, dijaga ./model) */
  accent: 'text-(--km-ink)',
  /** Teks aksen di grafit (≥ 4,5:1, dijaga ./model) */
  bright: 'text-(--km-bright)',
  /** Teks kedua di grafit: putih 70% (9:1) */
  onDarkMuted: 'text-white/70',
} as const;

/** Angka & spesifikasi mono (JetBrains Mono 500, angka tabular). */
export const MONO = 'font-mono font-medium tabular-nums';
/** Label kecil mono kapital (kepala tabel, HUD, nomor). */
export const MONO_LABEL = 'font-mono text-[11.5px] font-medium uppercase tracking-[0.08em]';

export const TYPE = {
  /** H1 hero: 38 → 52 → 60 → 68 → 76px, Hanken 700 rapat */
  h1: `${DISPLAY} font-bold text-balance text-[38px] leading-[1.02] tracking-[-0.035em] @3xl:text-[52px] @5xl:text-[60px] @7xl:text-[68px] @min-[96rem]:text-[76px]`,
  /** H2: 32 → 40 → 48 → 54px */
  h2: `${DISPLAY} font-bold text-balance text-[32px] leading-[1.05] tracking-[-0.03em] @3xl:text-[40px] @5xl:text-[48px] @min-[96rem]:text-[54px]`,
  /** H3 kartu: 20 → 22px Hanken 600 */
  h3: `${DISPLAY} font-semibold text-[20px] leading-[1.15] tracking-[-0.02em] @3xl:text-[22px]`,
  /** H3 kecil (dokumen, langkah, FAQ) */
  h3sm: `${DISPLAY} font-semibold text-[18px] leading-[1.2] tracking-[-0.015em]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[18px]',
  body: 'text-[15px] leading-relaxed @3xl:text-[16px]',
  small: 'text-[13px] leading-snug',
  /** Harga besar: Hanken 700 tabular */
  price: `${DISPLAY} font-bold tabular-nums tracking-[-0.02em]`,
} as const;

/** Tombol rounded-2xl, Inter 15px semibold; disorot → warna berganti (tanpa angkat), panah bergeser 2px. */
const BUTTON =
  'group/btn inline-flex max-w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold whitespace-nowrap transition-colors duration-200';
export const BTN = {
  /** Warna tema, teks kontras otomatis (--tpl-on-accent) */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Abu terisi di latar putih */
  secondary: `${BUTTON} bg-[#E8EBF0] text-[#0D1117] hover:bg-[#DDE1E8]`,
  /** Putih terisi di grafit */
  light: `${BUTTON} bg-white text-[#0D1117] hover:bg-[#E8EBF0]`,
  /** Hantu di grafit */
  ghost: `${BUTTON} bg-white/10 text-white ring-1 ring-inset ring-white/15 hover:bg-white/15`,
  md: 'h-11 px-4',
  lg: 'h-12 px-5 @3xl:px-6',
  xl: 'h-14 px-6 @3xl:px-7',
} as const;

/** Tautan teks bergaris bawah (target sentuh 44px). */
export const TEXT_LINK =
  'inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-(--km-ink) underline decoration-current/30 decoration-1 underline-offset-[5px] transition-colors hover:decoration-current';

/** Ritme vertikal section: 64 (HP) → 96 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28';

/** Jarak kolom grid 12 (desktop). */
export const GRID_GAP = 'gap-x-6 @5xl:gap-x-8 @7xl:gap-x-10';

/** Kartu putih radius 24 bercincin tipis (di atas abu). */
export const CARD = 'rounded-[24px] bg-white ring-1 ring-inset ring-[#0D1117]/[0.07]';

/** Chip spesifikasi mono. */
export const CHIP = `inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#F2F4F7] px-2.5 text-[12px] text-[#0D1117]/85 ${MONO}`;

/** Isian: abu terisi + cincin 12% tinta, fokus cincin 2px aksen, 16px di HP (iOS tidak memperbesar). */
export const INPUT =
  'block h-12 w-full min-w-0 rounded-xl bg-[#F2F4F7] px-3.5 text-[16px] font-medium text-[#0D1117] ring-1 ring-inset ring-[#0D1117]/[0.12] transition-colors hover:ring-[#0D1117]/30 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--tpl-accent) aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-[#C42B1C] @3xl:text-[15px]';

/** Label isian kecil. */
export const FIELD_LABEL = 'text-[13px] font-semibold text-[#0D1117]/80';
