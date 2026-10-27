// Ikon garis NusaNiaga dipilih otomatis dari judul (layanan, keunggulan), jadi CMS tidak butuh kolom ikon. Kata kunci
// bahasa Indonesia khas importir & distributor; aturan pertama yang cocok menang; tanpa kecocokan → kotak barang.
// Dirender lewat <TitleIcon> (./ui).
import {
  Boxes,
  Cog,
  Container,
  FileText,
  PackageSearch,
  Receipt,
  ShieldCheck,
  Ship,
  Truck,
  UserRoundCheck,
  Warehouse,
  Wrench,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  sourcing: PackageSearch,
  document: FileText,
  warehouse: Warehouse,
  truck: Truck,
  wrench: Wrench,
  cog: Cog,
  ship: Ship,
  container: Container,
  account: UserRoundCheck,
  receipt: Receipt,
  shield: ShieldCheck,
  boxes: Boxes,
} as const satisfies Record<string, ComponentType<{ className?: string; strokeWidth?: number }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas.
const RULES: [RegExp, IconKey][] = [
  [/sourcing|pemasok|cari/i, 'sourcing'],
  [/impor|dokumen|kepabeanan/i, 'document'],
  [/gudang|stok|penyangga/i, 'warehouse'],
  [/distribusi|antar|truk|kirim/i, 'truck'],
  [/instalasi|commissioning|mesin|teknisi/i, 'wrench'],
  [/suku cadang|perawatan|bearing/i, 'cog'],
  [/kapal|laut|pelabuhan/i, 'ship'],
  [/kontainer/i, 'container'],
  [/penanggung jawab|account/i, 'account'],
  [/biaya|harga|landed/i, 'receipt'],
  [/sertifikat|mutu|kualitas/i, 'shield'],
];

/** Kunci ikon untuk teks `title`; tanpa kata kunci yang cocok → kotak barang. */
export function iconKey(title: string): IconKey {
  return RULES.find(([pattern]) => pattern.test(title || ''))?.[1] ?? 'boxes';
}
