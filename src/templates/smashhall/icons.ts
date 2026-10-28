// Ikon garis fasilitas SmashHall dipilih otomatis dari label chip, jadi CMS tidak butuh kolom ikon. Kata kunci
// berbahasa Indonesia; aturan pertama yang cocok menang, tanpa kecocokan → kilau (umum). Dirender lewat <AmenityIcon>
// (./ui).
import { Armchair, Car, Coffee, Lightbulb, LockKeyhole, Moon, ShowerHead, Sparkles, Store, Wifi } from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  light: Lightbulb,
  shower: ShowerHead,
  prayer: Moon,
  food: Coffee,
  parking: Car,
  wifi: Wifi,
  locker: LockKeyhole,
  seat: Armchair,
  shop: Store,
  other: Sparkles,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

const RULES: [RegExp, IconKey][] = [
  [/lampu|led|cahaya|terang/i, 'light'],
  [/ganti|shower|mandi|toilet|wc/i, 'shower'],
  [/mushola|musala|mushala|ibadah|sholat|salat/i, 'prayer'],
  [/kantin|kafe|cafe|minum|makan|jajan/i, 'food'],
  [/parkir|parking/i, 'parking'],
  [/wi-?fi|internet/i, 'wifi'],
  [/loker|locker|lemari|titip/i, 'locker'],
  [/tribun|kursi|penonton|duduk/i, 'seat'],
  [/sewa|toko|raket|perlengkapan|jual/i, 'shop'],
];

/** Kunci ikon untuk label fasilitas; tanpa kata kunci yang cocok → kilau. */
export function iconKey(label: string): IconKey {
  return RULES.find(([pattern]) => pattern.test(label || ''))?.[1] ?? 'other';
}
