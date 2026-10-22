// Kelas tata letak bersama desain premium template (docs/platform/TEMPLATE-DESIGN.md §1). Semua ukuran memakai
// container query (@…), BUKAN breakpoint viewport, karena template dirender di dalam bingkai (HP 390px, CMS 1280px
// yang diperkecil). Wadah @container dipasang TemplateShell.
//
// Patokan lebar wadah: @xl 576 · @2xl 672 · @3xl 768 · @4xl 896 · @5xl 1024 · @6xl 1152 · @7xl 1280 · @min-[96rem] 1536.

/**
 * Wadah penuh kiri-kanan seperti `container-site` situs utama: maks. 1680px, jarak tepi 20 → 32 → 48 → 64px.
 * Pakai di header, setiap section, dan footer agar tepi kiri/kanan sejajar.
 */
export const CONTAINER = 'mx-auto w-full max-w-[1680px] px-5 @2xl:px-8 @5xl:px-12 @min-[96rem]:px-16';

/** Blok teks terpusat (judul section tengah, CTA): lebar baca nyaman di dalam CONTAINER. */
export const MEASURE = 'mx-auto max-w-[760px]';

/** Ritme vertikal section: 64 → 96 → 112 → 128px. */
export const SECTION_Y = 'py-16 @3xl:py-24 @5xl:py-28 @7xl:py-32';

/** Section ringkas (strip logo, CTA): 48 → 64 → 80px. */
export const SECTION_Y_SM = 'py-12 @3xl:py-16 @5xl:py-20';

/** Jarak judul section → isi: 40 → 56 → 64px. */
export const SECTION_GAP = 'mt-10 @3xl:mt-14 @5xl:mt-16';

/** Huruf judul template (TemplateShell `displayFont`; bawaan Inter). */
export const FONT_DISPLAY = 'font-[family-name:var(--tpl-font-display)]';

/**
 * Skala huruf editorial (tanpa ketebalan & warna: template yang menentukan, mis. `${TYPE.display} font-semibold text-fg`).
 * HP 390px → desktop 1280px → layar lebar.
 */
export const TYPE = {
  /** H1 hero: 32 → 48 → 60 → 72 → 80px */
  display: 'text-[32px] leading-[1.06] tracking-[-0.035em] @2xl:text-[48px] @5xl:text-[60px] @7xl:text-[72px] @min-[96rem]:text-[80px]',
  /** H2 section: 28 → 40 → 48 → 56px */
  h2: 'text-[28px] leading-[1.1] tracking-[-0.03em] @3xl:text-[40px] @5xl:text-[48px] @min-[96rem]:text-[56px]',
  /** H3 kartu: 18 → 20px */
  h3: 'text-[18px] leading-snug tracking-[-0.015em] @3xl:text-[20px]',
  /** Paragraf pembuka section / hero: 16 → 18 → 19px */
  lead: 'text-[16px] leading-relaxed @3xl:text-[18px] @7xl:text-[19px]',
  /** Isi: 15 → 16px */
  body: 'text-[15px] leading-relaxed @3xl:text-[16px]',
  /** Keterangan kecil */
  small: 'text-[13px] leading-snug',
  /** Label kecil di atas judul (huruf kapital berjarak) */
  eyebrow: 'text-[12px] font-semibold uppercase tracking-[0.16em]',
  /** Angka statistik besar */
  stat: 'text-[40px] leading-none tracking-[-0.035em] tabular-nums @3xl:text-[48px] @5xl:text-[56px]',
} as const;

/**
 * Permukaan DATAR: garis tipis (ring) menggantikan bayangan. Bayangan hanya untuk lapisan melayang bawaan Shell
 * (tombol WhatsApp, keterangan pratinjau).
 */
export const SURFACE = {
  /** Kartu putih bergaris tipis */
  card: 'rounded-[24px] bg-white ring-1 ring-inset ring-black/[0.07]',
  /** Kartu abu sangat muda (di atas latar putih) */
  muted: 'rounded-[24px] bg-alt ring-1 ring-inset ring-black/[0.04]',
  /** Kartu bernuansa aksen */
  accent: 'rounded-[24px] bg-(--tpl-accent-50) ring-1 ring-inset ring-(--tpl-accent-100)',
  /** Chip/kartu melayang di atas foto: putih tembus + blur, tanpa bayangan */
  glass: 'rounded-2xl bg-white/85 ring-1 ring-black/[0.06] backdrop-blur-md',
  /** Garis pemisah tipis (pakai dengan border-t / divide-y) */
  hairline: 'border-black/[0.08]',
  /** Respons hover kartu yang bisa diklik: garis berubah ke warna aksen (tanpa bayangan, tanpa lompat) */
  hover: 'transition-colors duration-300 hover:ring-(--tpl-accent-200)',
} as const;

/** Radius konsisten: foto besar 28px, kartu 24px, kontrol 12px. */
export const RADIUS = { photo: 'rounded-[28px]', card: 'rounded-[24px]', control: 'rounded-xl' } as const;
