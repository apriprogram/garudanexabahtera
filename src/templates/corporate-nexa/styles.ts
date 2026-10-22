// Kelas tampilan Corporate Nexa di atas sistem bersama (../shared/layout, docs/platform/TEMPLATE-DESIGN.md §3).
// Gaya "architectural editorial": datar, garis tipis (ring/border) alih-alih bayangan, satu warna aksen.
import {
  Building2,
  ClipboardCheck,
  Factory,
  HardHat,
  Landmark,
  PaintRoller,
  Ruler,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { FONT_DISPLAY, TYPE } from '../shared/layout';

/** Garis pemisah tipis (pakai dengan border-t / border-b / divide-y). */
export const LINE = 'border-black/[0.08]';

const BTN = 'inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-6 text-[15px] font-semibold transition-colors duration-200';
/** Tombol utama (warna aksen). Hover hanya mengubah warna. */
export const BTN_PRIMARY = `${BTN} bg-(--tpl-accent) text-(--tpl-on-accent) hover:bg-(--tpl-accent-hover)`;
/** Tombol kedua: putih bergaris tipis. */
export const BTN_OUTLINE = `${BTN} bg-white text-fg ring-1 ring-inset ring-black/[0.12] hover:bg-alt hover:ring-black/20`;
/** Tombol putih di atas blok gelap/aksen (CTA). */
export const BTN_ON_DARK = `${BTN} bg-white text-(--tpl-accent-ink) hover:bg-white/90`;
/**
 * Tombol ringkas di header. TANPA kelas display: dipakai bersama `hidden @xl:inline-flex` (kelas `inline-flex` di sini
 * akan mengalahkan `hidden`, sehingga tombol tetap tampil di HP).
 */
export const BTN_HEADER =
  'h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-(--tpl-accent) px-4 text-[14px] font-semibold text-(--tpl-on-accent) transition-colors duration-200 hover:bg-(--tpl-accent-hover)';

export const H2 = `${FONT_DISPLAY} ${TYPE.h2} font-semibold text-balance text-fg`;
export const H3 = `${FONT_DISPLAY} ${TYPE.h3} font-semibold text-fg`;
export const LEAD = `${TYPE.lead} text-pretty text-muted`;
export const BODY = `${TYPE.body} text-pretty text-muted`;

/**
 * Zoom halus foto kartu saat disorot. Satu deklarasi `transition` untuk dua properti: `transform` (zoom-out saat
 * muncul, kelas tpl-photo-zoom dari <Photo zoom>) dan `scale` (hover), agar yang satu tidak mematikan yang lain.
 */
export const HOVER_ZOOM =
  'group-hover:scale-[1.04] [transition:transform_1.6s_var(--tpl-ease),scale_0.7s_var(--tpl-ease)] motion-reduce:[transition:none] motion-reduce:group-hover:scale-100';

/** Ikon layanan berurutan (konten tidak menyimpan ikon). */
export const SERVICE_ICONS: LucideIcon[] = [Ruler, Building2, Warehouse, PaintRoller, ClipboardCheck, Wrench, HardHat, Landmark, Factory];

/** Nomor urut dua digit: 1 → "01". */
export const pad2 = (n: number): string => String(n).padStart(2, '0');
