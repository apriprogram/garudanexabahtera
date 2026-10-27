// Ikon garis Saudagar dipilih otomatis dari nama komoditas (baris kalender panen), jadi CMS tidak butuh kolom ikon.
// Kata kunci bahasa Indonesia khas ekspor hasil bumi; tanpa kecocokan → ikon cadangan ShieldCheck (umum).
import { Bean, Coffee, Container, FileText, Leaf, Nut, ShieldCheck, Ship, Sprout, TreePalm, Warehouse, type LucideIcon } from 'lucide-react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  coffee: Coffee,
  cocoa: Bean,
  spice: Nut,
  leaf: Leaf,
  coconut: TreePalm,
  sprout: Sprout,
  container: Container,
  ship: Ship,
  warehouse: Warehouse,
  document: FileText,
  generic: ShieldCheck,
} as const satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas (mis. "Arang tempurung kelapa" → kelapa, bukan umum).
const RULES: [RegExp, IconKey][] = [
  [/kopi|coffee|arabika|robusta/i, 'coffee'],
  [/kakao|cokelat|coklat|cocoa|cacao/i, 'cocoa'],
  [/pala|fuli|cengkeh|lada|merica|rempah|nutmeg|clove|pepper/i, 'spice'],
  [/kayu manis|kulit manis|cinnamon|vanili|teh|daun/i, 'leaf'],
  [/kelapa|kopra|tempurung|sabut|coconut|copra/i, 'coconut'],
  [/bibit|tunas|kebun|panen|tani/i, 'sprout'],
  [/kontainer|container|peti kemas/i, 'container'],
  [/kapal|pelabuhan|pelayaran|ship|port/i, 'ship'],
  [/gudang|warehouse|stok/i, 'warehouse'],
  [/dokumen|invoice|packing list|bill of lading|lembar/i, 'document'],
  [/sertifikat|uji|mutu|kualitas/i, 'generic'],
];

/** Kunci ikon untuk teks `name`; tanpa kata kunci yang cocok → ikon umum. */
export function iconKey(name: string): IconKey {
  return RULES.find(([pattern]) => pattern.test(name || ''))?.[1] ?? 'generic';
}
