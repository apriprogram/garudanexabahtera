// Gaya & helper murni Startup Clean ("Calm product", docs/platform/TEMPLATE-DESIGN.md §4): tombol & chip pil,
// judul Plus Jakarta Sans 700, kartu datar bergaris tipis (tanpa bayangan). Komponen ada di file .tsx sebelahnya.
import type { ListItem } from '../types';
import { FONT_DISPLAY, TYPE } from '../shared/layout';
import type { NavItem } from '../shared/model';

// ─── Tipografi ────────────────────────────────────────────────────────────────

export const H1 = `${FONT_DISPLAY} ${TYPE.display} font-bold text-fg`;
export const H2 = `${FONT_DISPLAY} ${TYPE.h2} font-bold text-fg`;
export const H3 = `${FONT_DISPLAY} ${TYPE.h3} font-bold text-fg`;
export const LEAD = `${TYPE.lead} text-muted`;
/**
 * Angka statistik: 30px di HP (2 kolom di 390px tetap muat "12.000+") → 40px → 48px (@7xl, 4 kolom ≥ 296px) →
 * 56px di layar sangat lebar.
 */
export const STAT = `${FONT_DISPLAY} text-[30px] font-bold leading-none tracking-[-0.035em] tabular-nums @xl:text-[40px] @7xl:text-[48px] @min-[96rem]:text-[56px]`;

// ─── Tombol pil ───────────────────────────────────────────────────────────────

/** Bentuk tombol tanpa kelas display, agar bisa digabung dengan `hidden @xl:inline-flex`. */
export const BTN_SHAPE = 'relative items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors';
export const ACCENT_FILL = 'bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)';
/** Tombol besar (hero, CTA): 48px, penuh lebar di HP bila pemanggil menambah w-full */
export const BTN = `${BTN_SHAPE} inline-flex h-12 px-6 text-[15px]`;
export const BTN_PRIMARY = `${BTN} ${ACCENT_FILL}`;
export const BTN_SECONDARY = `${BTN} bg-white text-fg ring-1 ring-inset ring-black/[0.1] hover:bg-alt`;

/** Lingkaran ikon kecil bernuansa aksen (ikon dekoratif; teks di sebelahnya yang bermakna). */
export const ICON_TINT = 'flex shrink-0 items-center justify-center rounded-full bg-(--tpl-accent-100) text-(--tpl-accent-ink)';

/**
 * Hover foto kartu: skala 1.04 (properti `scale`), digabung dengan transisi zoom-out `transform` milik
 * <Photo zoom> agar keduanya tetap halus (kelas transition-[scale] biasa akan menimpa transisi zoom).
 */
export const PHOTO_HOVER =
  'group-hover:scale-[1.04] [transition:transform_1.6s_var(--tpl-ease),scale_.7s_var(--tpl-ease)] motion-reduce:group-hover:scale-100';

/** Rel gulir horizontal yang menembus jarak tepi CONTAINER (tepi kiri isi tetap sejajar dengan judul). */
export const RAIL_BLEED =
  '-mx-5 px-5 scroll-px-5 @2xl:-mx-8 @2xl:px-8 @2xl:scroll-px-8 @5xl:-mx-12 @5xl:px-12 @5xl:scroll-px-12 @min-[96rem]:-mx-16 @min-[96rem]:px-16 @min-[96rem]:scroll-px-16';
/** Rel yang hanya menggulir di bawah @5xl (desktop menjadi grid biasa di dalam CONTAINER). */
export const RAIL_BLEED_SM = '-mx-5 px-5 scroll-px-5 @2xl:-mx-8 @2xl:px-8 @2xl:scroll-px-8 @5xl:mx-0 @5xl:px-0';

// ─── Helper murni ─────────────────────────────────────────────────────────────

/** Urutan section di halaman Startup Clean (Fitur sebelum Cerita), juga urutan menu. */
const PAGE_ORDER = ['services', 'about', 'advantages', 'gallery', 'testimonials', 'contact'];

/** Menu header/footer mengikuti urutan section di halaman. */
export const orderNav = (nav: NavItem[]): NavItem[] =>
  [...nav].sort((a, b) => (PAGE_ORDER.indexOf(a.key) + 1 || 99) - (PAGE_ORDER.indexOf(b.key) + 1 || 99));

/** Nilai rating bintang ("4,8", "4.9", "5", "4,8/5")? Hanya itu yang diberi 5 bintang. */
export function isRating(value: string): boolean {
  const match = /^\s*(\d)(?:[.,](\d{1,2}))?\s*(?:\/\s*5)?\s*$/.exec(value || '');
  if (!match) return false;
  const n = Number(`${match[1]}.${match[2] ?? '0'}`);
  return n > 0 && n <= 5;
}

/**
 * Dua angka untuk kartu kaca hero: angka pertama (mis. "12.000+ UMKM aktif") dan angka keempat (rating). Bila hanya
 * ada 2–3 angka, kartu kedua memakai angka terakhir; 1 angka → satu kartu.
 */
export function heroStats(stats: ListItem[]): { lead: ListItem | null; second: ListItem | null } {
  const valid = stats.filter((s) => (s.value || '').trim());
  if (valid.length === 0) return { lead: null, second: null };
  return { lead: valid[0], second: valid.length >= 4 ? valid[3] : valid.length >= 2 ? valid[valid.length - 1] : null };
}

/**
 * Slot kartu bento fitur pada grid 6 kolom (@5xl):
 * lead = 4 kolom (kartu pertama) · tall = 2 kolom × 2 baris (kartu kedua, hanya bila berfoto & ≥ 3 kartu) ·
 * side = 2 kolom di samping lead · wide = 4 kolom (satu-satunya kartu di samping tall) · third = 2 kolom ·
 * half = 3 kolom (sisa 2 kartu) · full = 6 kolom (sisa 1 kartu) · solo = satu-satunya kartu.
 * Baris selalu penuh, berapa pun jumlah kartu (1–9) dan ada/tidaknya foto.
 */
export type BentoSlot = 'solo' | 'lead' | 'tall' | 'side' | 'wide' | 'third' | 'half' | 'full';

export function bentoSlots(count: number, secondHasImage: boolean): BentoSlot[] {
  if (count <= 0) return [];
  if (count === 1) return ['solo'];
  const tall = count >= 3 && secondHasImage;
  const slots: BentoSlot[] = ['lead', tall ? 'tall' : 'side'];
  let rest = count - 2;
  if (tall) {
    // Baris kedua: 4 kolom kosong di bawah lead (di samping tall)
    if (rest === 1) {
      slots.push('wide');
      rest = 0;
    } else {
      slots.push('third', 'third');
      rest -= 2;
    }
  }
  while (rest >= 3) {
    slots.push('third', 'third', 'third');
    rest -= 3;
  }
  if (rest === 2) slots.push('half', 'half');
  if (rest === 1) slots.push('full');
  return slots;
}

const SPAN_6: Record<BentoSlot, string> = {
  solo: '@5xl:col-span-6',
  lead: '@5xl:col-span-4',
  tall: '@5xl:col-span-2 @5xl:row-span-2',
  side: '@5xl:col-span-2',
  wide: '@5xl:col-span-4',
  third: '@5xl:col-span-2',
  half: '@5xl:col-span-3',
  full: '@5xl:col-span-6',
};

/**
 * Kelas grid tiap kartu: 1 kolom (HP) → 2 kolom (@2xl; kartu pertama selebar baris, kartu terakhir yang sendirian
 * juga) → bento 6 kolom (@5xl).
 */
export function bentoClasses(slots: BentoSlot[]): string[] {
  const singles = slots.length - 1;
  return slots.map((slot, i) => {
    const wide2 = i === 0 || (i === slots.length - 1 && singles % 2 === 1);
    return `${wide2 ? '@2xl:col-span-2' : ''} ${SPAN_6[slot]}`.trim();
  });
}
