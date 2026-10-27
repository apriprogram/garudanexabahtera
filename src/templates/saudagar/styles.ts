// Gaya Saudagar "Kraft & arches": lembar niaga hasil bumi di atas kertas krem. Judul serif Fraunces 400 dengan satu
// frasa miring berwarna tinta (bukan warna tema), label section serif miring "— Komoditas", kartu kraft radius 4 tanpa
// garis, baris spesifikasi bergaris rambut, tombol pil tinta gelap + tautan teks berpanah, foto berbingkai lengkung
// (rounded-t-full) dan bulat. Pita kertas ↔ putih, satu pita espresso untuk ajakan. DATAR: tanpa bayangan sama sekali;
// kedalaman dari tingkat warna (kertas/putih/kraft/espresso), garis rambut, dan ring tipis. Warna tema hanya untuk
// grafik (batang panen, garis tab aktif, simbol); teks berwarna tema SELALU --sg-ink / --sg-bright (./model).
// Ukuran memakai container query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Fraunces (Google Fonts, SIL Open Font License) 400/500 + miring 400; optical size mengikuti ukuran. */
export const SAUDAGAR_FONT: KitFont = {
  id: 'tpl-font-fraunces',
  family: '"Fraunces", "Iowan Old Style", "Palatino Linotype", Georgia, ui-serif, serif',
  href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&display=swap',
};

export const SERIF = FONT_DISPLAY;

/** Warna netral hangat (tidak ikut warna tema). Kontras dihitung di brief (§2.2). */
export const C = {
  /** Tinta: 15,4:1 di kertas, 17,1:1 di putih, 13,8:1 di kraft */
  ink: 'text-[#221A13]',
  /** 7,0:1 di kertas, 7,8:1 di putih, 6,3:1 di kraft */
  muted: 'text-[#5C5045]',
  paper: 'bg-[#F7F2E8]',
  white: 'bg-white',
  kraft: 'bg-[#EFE6D3]',
  espresso: 'bg-[#2A1D15]',
  /** Garis rambut 12% tinta (border / divide) */
  line: 'border-[#221A13]/[0.12]',
  divide: 'divide-[#221A13]/[0.12]',
} as const;

export const TYPE_S = {
  /** H1 hero: 36 → 52 → 64 → 76 → 88px, Fraunces 400 */
  h1: `${SERIF} font-normal text-[36px] leading-[1.02] tracking-[-0.02em] @2xl:text-[52px] @5xl:text-[64px] @7xl:text-[76px] @min-[96rem]:text-[88px]`,
  /** H2 section: 30 → 40 → 48 → 56px */
  h2: `${SERIF} font-normal text-[30px] leading-[1.06] tracking-[-0.015em] @3xl:text-[40px] @5xl:text-[48px] @min-[96rem]:text-[56px]`,
  /** Pernyataan besar (H2 Tentang): 26 → 32 → 40 → 44px */
  statement: `${SERIF} font-normal text-[26px] leading-[1.18] tracking-[-0.012em] @3xl:text-[32px] @5xl:text-[40px] @min-[96rem]:text-[44px]`,
  /** Judul kartu: 21 → 24px */
  h3: `${SERIF} font-normal text-[21px] leading-snug tracking-[-0.01em] @3xl:text-[24px]`,
  /** Label section serif miring */
  label: `${SERIF} italic font-normal text-[17px] leading-snug @3xl:text-[18px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px] @7xl:text-[18px]',
  body: 'text-[15px] leading-relaxed @3xl:text-[16px]',
  small: 'text-[13px] leading-snug',
  /** Angka besar serif */
  stat: `${SERIF} font-normal text-[56px] leading-[0.9] tracking-[-0.03em] @3xl:text-[72px] @6xl:text-[88px]`,
  quote: `${SERIF} font-normal text-[21px] leading-[1.3] tracking-[-0.01em] @3xl:text-[26px] @6xl:text-[30px]`,
} as const;

/** Tombol pil (tinta gelap; kertas di pita espresso). Hover: warna saja. */
const PILL = 'inline-flex max-w-full items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors duration-300';
export const BTN = {
  ink: `${PILL} bg-[#221A13] text-[#F7F2E8] hover:bg-[#3A2C21]`,
  paper: `${PILL} bg-[#F7F2E8] text-[#221A13] hover:bg-white`,
  lg: 'h-12 px-6 text-[15px]',
  md: 'h-11 px-5 text-[14px]',
} as const;

/** Kartu kraft radius 4, tanpa ring/garis/bayangan. */
export const CARD = {
  kraft: 'rounded-[4px] bg-[#EFE6D3]',
} as const;

/** Bentuk foto: lengkung (atas setengah lingkaran) dan bulat. */
export const ARCH = 'rounded-t-full';

/** Hover foto yang bisa disorot (galeri, kategori). */
export const PHOTO_HOVER = 'transition-[scale] duration-700 group-hover:scale-[1.04]';

/** Ritme vertikal section: 64 → 96 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28';

/** Isian formulir: 16px di HP (iOS tidak memperbesar), garis tipis 16%, fokus cincin tema versi kontras. */
export const INPUT_BASE =
  'block w-full rounded-[4px] bg-white px-4 text-[16px] text-[#221A13] ring-1 ring-inset ring-[#221A13]/[0.16] placeholder:text-[#7A6E62] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) @3xl:text-[15px]';
/** Isian satu baris / pilihan: tinggi 48px */
export const INPUT = `${INPUT_BASE} h-12`;
