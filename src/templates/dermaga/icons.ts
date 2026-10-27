// Ikon garis Dermaga dipilih otomatis dari judul layanan, jadi CMS tidak butuh kolom ikon. Kata kunci ekspor-impor
// berbahasa Indonesia (dan istilah dagang Inggris yang lazim); aturan pertama yang cocok menang, tanpa kecocokan →
// kotak bertumpuk. Dirender lewat <ServiceIcon> (./ui).
import { Boxes, Container, FileText, PackageCheck, PackageSearch, Ship, ShieldCheck, Truck, Warehouse } from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  ship: Ship,
  container: Container,
  warehouse: Warehouse,
  document: FileText,
  sourcing: PackageSearch,
  inspection: PackageCheck,
  truck: Truck,
  certificate: ShieldCheck,
  boxes: Boxes,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas.
const RULES: [RegExp, IconKey][] = [
  [/freight|laut|kapal|pelayaran|ocean|sea/i, 'ship'],
  [/kontainer|container|peti kemas|fcl/i, 'container'],
  [/konsolidasi|gudang|warehouse|lcl/i, 'warehouse'],
  [/dokumen|kepabeanan|document|customs/i, 'document'],
  [/trading|sourcing|pemasok|supplier|pembelian/i, 'sourcing'],
  // "pemeriksaan", "pengemasan": imbuhan pe- meluluhkan huruf awal (periksa → meriksa, kemas → ngemas)
  [/periksa|meriksa|kemas|ngemas|inspeksi|inspection|packing/i, 'inspection'],
  [/truck|trucking|truk|door|darat|antar/i, 'truck'],
  [/sertifikat|kopi|kakao|rempah|kelapa/i, 'certificate'],
];

/** Kunci ikon untuk judul layanan; tanpa kata kunci yang cocok → kotak bertumpuk. */
export function iconKey(title: string): IconKey {
  return RULES.find(([pattern]) => pattern.test(title || ''))?.[1] ?? 'boxes';
}
