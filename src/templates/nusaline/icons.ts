// Ikon garis fasilitas Nusaline dipilih otomatis dari teks (fasilitas kabin & fitur kelas), jadi CMS tidak butuh kolom
// ikon. Kata kunci berbahasa Indonesia (dan istilah Inggris yang lazim); aturan pertama yang cocok menang, tanpa
// kecocokan → centang. Dirender lewat <FeatureIcon> (./ui).
import {
  Armchair,
  BedDouble,
  Blinds,
  Check,
  Cookie,
  Lamp,
  Luggage,
  Monitor,
  Plug,
  Snowflake,
  Sofa,
  Toilet,
  Usb,
  Utensils,
  Wifi,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  blanket: BedDouble,
  usb: Usb,
  plug: Plug,
  toilet: Toilet,
  snack: Cookie,
  meal: Utensils,
  lamp: Lamp,
  wifi: Wifi,
  seat: Armchair,
  legrest: Sofa,
  curtain: Blinds,
  screen: Monitor,
  luggage: Luggage,
  ac: Snowflake,
  check: Check,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas.
const RULES: [RegExp, IconKey][] = [
  [/wi-?fi|internet/i, 'wifi'],
  [/usb|charger|cas\b|daya/i, 'usb'],
  [/stop ?kontak|colokan|listrik/i, 'plug'],
  [/toilet|\bwc\b|kamar kecil/i, 'toilet'],
  [/lampu|baca|reading/i, 'lamp'],
  [/tirai|gorden|curtain|privasi|pribadi/i, 'curtain'],
  [/selimut|bantal|kasur|blanket|pillow|tidur|kabin/i, 'blanket'],
  [/makan|meal|sarapan/i, 'meal'],
  [/snack|camilan|air mineral|minum|kudapan/i, 'snack'],
  [/sandaran kaki|betis|leg ?rest|kaki/i, 'legrest'],
  [/layar|tv|hiburan|film|monitor/i, 'screen'],
  [/bagasi|koper|luggage/i, 'luggage'],
  [/\bac\b|pendingin|sejuk/i, 'ac'],
  [/kursi|seat|rebah|recline/i, 'seat'],
];

/** Kunci ikon untuk teks fasilitas; tanpa kata kunci yang cocok → centang. */
export function iconKey(title: string): IconKey {
  return RULES.find(([pattern]) => pattern.test(title || ''))?.[1] ?? 'check';
}
