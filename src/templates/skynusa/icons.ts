// Ikon SkyNusa dipilih otomatis dari judul (strip keunggulan hero, kartu kategori, angka garansi), jadi CMS tidak butuh
// kolom ikon. Kata kunci bahasa Indonesia + Inggris; tanpa kecocokan → ikon cadangan berurutan. Dirender lewat
// <TitleIcon> (./ui). Ikon drone digambar sendiri (./marks) karena belum ada di lucide-react versi ini.
import {
  BatteryCharging,
  Backpack,
  CalendarDays,
  Camera,
  Clapperboard,
  GraduationCap,
  HeartHandshake,
  MapPinned,
  Package,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { DroneIcon } from './marks';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  drone: DroneIcon,
  camera: Camera,
  wedding: HeartHandshake,
  map: MapPinned,
  video: Clapperboard,
  bundle: Package,
  warranty: ShieldCheck,
  service: Wrench,
  academy: GraduationCap,
  rental: CalendarDays,
  battery: BatteryCharging,
  bag: Backpack,
  sparkles: Sparkles,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

const RULES: [RegExp, IconKey][] = [
  [/paket|bundl/i, 'bundle'],
  [/garansi|warranty/i, 'warranty'],
  [/servis|service|bengkel|perbaik|kalibrasi|teknisi/i, 'service'],
  [/kelas|belajar|latihan|kursus|academy|pelatihan/i, 'academy'],
  [/sewa|rental|pinjam/i, 'rental'],
  [/wedding|nikah|pernikahan|pengantin|prewed/i, 'wedding'],
  [/pemetaan|peta|survei|survey|mapping|lahan|rtk|kebun/i, 'map'],
  [/video|sinema|cinema|film/i, 'video'],
  [/foto|photo|kamera|konten|lanskap/i, 'camera'],
  [/baterai|battery|daya|charging/i, 'battery'],
  [/tas|ransel|case|koper/i, 'bag'],
  [/drone|terbang|udara/i, 'drone'],
];

const FALLBACK: IconKey[] = ['drone', 'camera', 'bundle', 'sparkles', 'map', 'warranty'];

/** Kunci ikon untuk judul `title`; tanpa kata kunci yang cocok → ikon cadangan ke-`index`. */
export function iconKey(title: string, index = 0): IconKey {
  const match = RULES.find(([pattern]) => pattern.test(title || ''));
  return match ? match[1] : FALLBACK[Math.abs(Math.floor(index)) % FALLBACK.length];
}
