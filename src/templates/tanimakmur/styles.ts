// Gaya TaniMakmur "Ladang subur": hero foto ladang hijau tua layar penuh dengan judul putih sangat besar, bingkai
// garis tipis, lingkaran CTA warna aksen (kuning jagung), dan kartu angka besar; lalu halaman krem hangat dengan kartu
// putih membulat, panel data hijau tua (paket tanam), dan kartu produk berbintang. Judul Inter Tight 400 (rapat,
// tegas), isi Inter. Datar: tanpa bayangan. Ukuran memakai container query (@…) karena template dirender di bingkai HP
// 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul lokal (Google Fonts, SIL Open Font License), dimuat lewat useKitFont. */
export const INTER_TIGHT: KitFont = {
  id: 'tpl-font-inter-tight',
  family: '"Inter Tight", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&display=swap',
};

/** Warna tetap (tidak ikut warna aksen). Kontras diuji di __tests__/tanimakmur.test.tsx. */
export const COLOR = {
  /** Panel gelap (paket tanam, konsultasi), lapisan hero */
  forest: '#1E3A16',
  /** Footer & teks paling gelap di panel */
  deep: '#13260E',
  /** Teks utama di krem/putih */
  ink: '#18230F',
  /** Teks sekunder: ≥ 5:1 di krem dan putih */
  muted: '#535E47',
  /** Latar halaman */
  cream: '#F6F2E3',
  /** Chip, latar foto produk, garis lembut */
  sand: '#ECE6CF',
} as const;

export const C = {
  ink: 'text-[#18230F]',
  muted: 'text-[#535E47]',
  cream: 'bg-[#F6F2E3]',
  sand: 'bg-[#ECE6CF]',
  forest: 'bg-[#1E3A16]',
  deep: 'bg-[#13260E]',
} as const;

export const DISPLAY = `${FONT_DISPLAY} font-normal`;

export const TYPE_T = {
  /** H1 hero: 44 → 64 → 80 → 88 → 100px, tiga-empat baris seperti referensi */
  h1: `${DISPLAY} text-[44px] leading-[0.98] tracking-[-0.035em] @2xl:text-[64px] @5xl:text-[80px] @7xl:text-[88px] @min-[96rem]:text-[100px]`,
  /** H2 section: 32 → 40 → 48 → 56px */
  h2: `${DISPLAY} text-[32px] leading-[1.04] tracking-[-0.03em] @3xl:text-[40px] @5xl:text-[48px] @min-[96rem]:text-[56px]`,
  /** Judul kartu: 19 → 21px */
  h3: `${FONT_DISPLAY} font-medium text-[19px] leading-snug tracking-[-0.015em] @3xl:text-[21px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px] @7xl:text-[18px]',
  body: 'text-[15px] leading-relaxed',
  /** Angka besar di kartu statistik hero: 40 → 48 (3 kartu, @3xl) → 56 (kartu di samping keterangan, @6xl) → 68px */
  stat: `${DISPLAY} whitespace-nowrap text-[40px] leading-none tracking-[-0.04em] tabular-nums @3xl:text-[48px] @6xl:text-[56px] @7xl:text-[68px]`,
  /** Harga di kartu */
  price: `${FONT_DISPLAY} font-semibold tracking-[-0.02em] tabular-nums`,
} as const;

/** Tombol pil. Isi: label + panah (lihat <PillLink> di ./ui). */
const PILL = 'inline-flex items-center justify-center gap-2.5 rounded-full font-semibold whitespace-nowrap transition-colors';
export const BTN = {
  /** Warna aksen + teks kontras otomatis (--tpl-on-accent) */
  accent: `${PILL} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Tinta hijau gelap + putih di latar terang */
  ink: `${PILL} bg-[#18230F] text-white hover:bg-[#2B3A20]`,
  /** Putih di atas foto/panel gelap */
  white: `${PILL} bg-white text-[#18230F] hover:bg-white/90`,
  /** Garis tipis di latar terang */
  ghost: `${PILL} text-[#18230F] ring-1 ring-inset ring-[#18230F]/15 hover:bg-[#18230F]/[0.04]`,
  /** Garis tipis di panel gelap */
  ghostDark: `${PILL} text-white ring-1 ring-inset ring-white/30 hover:bg-white/10`,
  sm: 'h-10 px-4 text-[14px]',
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-12 px-6 text-[15px] @3xl:h-[52px]',
} as const;

/** Kartu datar membulat. */
export const CARD = {
  white: 'rounded-[28px] bg-white',
  sand: 'rounded-[28px] bg-[#ECE6CF]',
  forest: 'rounded-[32px] bg-[#1E3A16] @3xl:rounded-[40px]',
} as const;

/** Kaca gelap tipis di atas foto (teks putih ≥ 4,5:1 di atas daun terang) */
export const GLASS = 'bg-[#13260E]/55 ring-1 ring-inset ring-white/20 backdrop-blur-xl';
