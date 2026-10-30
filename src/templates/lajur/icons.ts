// Ikon garis fasilitas bus Lajur dipilih otomatis dari nama fasilitas, jadi CMS tidak butuh kolom ikon. Kata kunci
// berbahasa Indonesia (dan istilah Inggris yang lazim); aturan pertama yang cocok menang, tanpa kecocokan → centang.
// Dirender lewat <FacilityIcon> (./ui).
import { Armchair, BatteryCharging, Check, Coffee, Luggage, MicVocal, Music, Snowflake, Toilet, Tv, Usb, Wifi } from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  ac: Snowflake,
  seat: Armchair,
  toilet: Toilet,
  karaoke: MicVocal,
  tv: Tv,
  audio: Music,
  usb: Usb,
  charge: BatteryCharging,
  wifi: Wifi,
  luggage: Luggage,
  snack: Coffee,
  check: Check,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas ("Karaoke & TV" → karaoke, bukan tv).
const RULES: [RegExp, IconKey][] = [
  [/\bac\b|pendingin|dingin|air ?con/i, 'ac'],
  [/toilet|wc|kamar kecil/i, 'toilet'],
  [/karaoke|mik|mic/i, 'karaoke'],
  [/\btv\b|televisi|layar|monitor|video/i, 'tv'],
  [/audio|musik|sound|speaker/i, 'audio'],
  [/usb/i, 'usb'],
  [/colokan|stopkontak|charger|cas\b|daya/i, 'charge'],
  [/wi-?fi|internet/i, 'wifi'],
  [/bagasi|koper|luggage|barang/i, 'luggage'],
  [/kursi|seat|reclining|jok|sandaran/i, 'seat'],
  [/snack|makan|minum|kopi|dispenser|air mineral/i, 'snack'],
];

/** Kunci ikon untuk nama fasilitas; tanpa kata kunci yang cocok → centang. */
export function iconKey(name: string): IconKey {
  return RULES.find(([pattern]) => pattern.test(name || ''))?.[1] ?? 'check';
}
