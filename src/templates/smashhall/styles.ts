// Gaya SmashHall "Clean sport white": GOR badminton yang terang dan bersih. Putih + pasir hangat #F6F5F3, SATU warna
// tema merah-oranye (bawaan #F0542D, isi tombol & pil; teks aksen memakai --tpl-accent-ink), tinta hampir hitam
// #171512, judul Sora 600/700, ikon kok garis sebagai penanda label. DATAR: tanpa bayangan; garis 1px, tingkat warna,
// dan kaca putih di atas foto menggantikan bayangan. Kartu radius 20, tombol rounded-xl. Ukuran memakai container
// query (@…) karena template dirender di bingkai HP 390 / panel CMS.
import type { KitFont } from '../kit/fonts';
import { FONT_DISPLAY } from '../shared/layout';

/** Huruf judul: Sora (Google Fonts, SIL Open Font License) 600/700. Isi tetap Inter. */
export const SMASHHALL_FONT: KitFont = {
  id: 'tpl-font-sora',
  family: '"Sora", "Inter", ui-sans-serif, system-ui, sans-serif',
  href: 'https://fonts.googleapis.com/css2?family=Sora:wght@600;700&display=swap',
};

export const DISPLAY = FONT_DISPLAY;

/** Warna netral (tidak ikut warna tema). Kontras dihitung dengan rumus shared/utils (lihat brief). */
export const C = {
  /** Tinta: judul, isi (18,2:1 di putih; 16,7:1 di pasir) */
  ink: 'text-[#171512]',
  /** Paragraf, label, keterangan (7,3:1 di putih; 6,7:1 di pasir) */
  muted: 'text-[#5A564F]',
  /** Pasir hangat: section selang-seling, panel formulir */
  sand: 'bg-[#F6F5F3]',
  /** Garis tipis 10% tinta */
  line: 'border-[#171512]/10',
  /** Bidang tinta (pita kejuaraan, kartu unggulan) */
  night: 'bg-[#171512]',
} as const;

/** Label section: huruf kapital kecil Sora (ikon kok di depannya). */
export const LABEL = `${FONT_DISPLAY} text-[12px] font-semibold uppercase tracking-[0.14em]`;

export const TYPE_S = {
  /**
   * H1 hero: 34 → 46 → 56 → 58 → 66px. HP < 22rem 30px (kolom di kiri lajur WhatsApp ±228px) dan 56px di kolom 46%
   * layar 1024–1151px, agar judul bawaan tetap tiga baris tanpa kata yatim.
   */
  h1: `${FONT_DISPLAY} font-bold text-balance text-[34px] leading-[1.06] tracking-[-0.035em] @max-[22rem]:text-[30px] @2xl:text-[46px] @5xl:text-[56px] @5xl:leading-[1.03] @6xl:text-[58px] @7xl:text-[66px]`,
  /** H2 section: 28 → 36 → 44px */
  h2: `${FONT_DISPLAY} font-bold text-balance text-[28px] leading-[1.1] tracking-[-0.03em] @3xl:text-[36px] @6xl:text-[44px]`,
  /** Judul kartu: 18 → 20px */
  h3: `${FONT_DISPLAY} font-semibold text-[18px] leading-snug tracking-[-0.015em] @3xl:text-[20px]`,
  lead: 'text-[16px] leading-relaxed @3xl:text-[17px] @7xl:text-[18px]',
  body: 'text-[15px] leading-relaxed',
  small: 'text-[13.5px] leading-snug',
  /** Angka besar (statistik fasilitas) */
  stat: `${FONT_DISPLAY} font-bold tabular-nums tracking-[-0.04em] text-[44px] leading-none @5xl:text-[54px]`,
  /** Harga paket / produk */
  price: `${FONT_DISPLAY} font-bold tabular-nums tracking-[-0.035em] text-[34px] leading-none @5xl:text-[38px]`,
} as const;

/** Tombol rounded-xl; panah bergeser 2px saat disorot. */
const BUTTON =
  'group/btn inline-flex max-w-full items-center justify-center gap-2.5 rounded-xl font-semibold whitespace-nowrap transition-colors duration-200';
export const BTN = {
  /** Warna tema, teks kontras otomatis (--tpl-on-accent; tinta untuk oranye bawaan) */
  primary: `${BUTTON} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`,
  /** Garis tinta di latar terang */
  ghost: `${BUTTON} bg-transparent text-[#171512] ring-1 ring-inset ring-[#171512]/80 hover:bg-[#171512]/[0.05]`,
  /** Tinta penuh */
  ink: `${BUTTON} bg-[#171512] text-white hover:bg-[#2B2823]`,
  /** Garis putih di pita gelap */
  ghostDark: `${BUTTON} bg-transparent text-white ring-1 ring-inset ring-white/60 hover:bg-white/10`,
  /** Hero: garis putih di atas lapisan gelap foto (HP/tablet); ≥ 64rem kembali seperti `ghost` dengan isi putih 70% */
  ghostPhoto: `${BUTTON} bg-transparent text-white ring-1 ring-inset ring-white/60 hover:bg-white/10 @5xl:bg-white/70 @5xl:text-[#171512] @5xl:ring-[#171512]/80 @5xl:hover:bg-[#171512]/[0.05]`,
  md: 'h-11 px-5 text-[14.5px]',
  lg: 'h-12 px-6 text-[15px] @3xl:h-[52px] @3xl:px-7',
} as const;

/** Kartu putih radius 20, garis 1px; disorot → garis warna tema muda (tanpa angkat/geser). */
export const CARD = 'rounded-[20px] border border-[#171512]/10 bg-white transition-colors duration-200 hover:border-(--tpl-accent-200)';

/** Chip kecil (fasilitas, kategori). */
export const CHIP = 'inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium';

/** Ritme vertikal section: 64 → 96 → 112px. */
export const SECTION_PAD = 'py-16 @3xl:py-24 @5xl:py-28';

/** Jarak kolom grid 12. */
export const GRID_GAP = 'gap-x-6 @5xl:gap-x-8 @7xl:gap-x-12';

/** Isian formulir: 16px di HP, garis tinta 45% (≥ 3:1), fokus cincin tema versi kontras. */
export const INPUT =
  'block w-full rounded-xl bg-white px-3.5 text-[16px] text-[#171512] ring-1 ring-inset ring-[#171512]/45 placeholder:text-[#6B665E] transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) @3xl:text-[15px]';
