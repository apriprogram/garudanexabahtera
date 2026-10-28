// Ikon garis fasilitas kawasan HomeNest dipilih otomatis dari nama fasilitas, jadi CMS tidak butuh kolom ikon. Kata
// kunci berbahasa Indonesia (dan istilah Inggris yang lazim); aturan pertama yang cocok menang, tanpa kecocokan → pin
// lokasi. Dirender lewat <AmenityIcon> (./ui).
import {
  Building2,
  CarFront,
  Dumbbell,
  GraduationCap,
  Hospital,
  MapPin,
  MoonStar,
  ShieldCheck,
  ShoppingBag,
  TrainFront,
  Trees,
  Waves,
  Baby,
  Bike,
  Utensils,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  park: Trees,
  pool: Waves,
  security: ShieldCheck,
  mosque: MoonStar,
  school: GraduationCap,
  train: TrainFront,
  road: CarFront,
  market: ShoppingBag,
  hospital: Hospital,
  club: Building2,
  sport: Dumbbell,
  play: Baby,
  bike: Bike,
  food: Utensils,
  pin: MapPin,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas.
const RULES: [RegExp, IconKey][] = [
  [/kolam|renang|pool|swim/i, 'pool'],
  [/taman|jogging|park|hijau|hutan|pohon/i, 'park'],
  [/aman|satpam|security|cctv|gerbang utama|one gate|portal/i, 'security'],
  [/masjid|musala|mushola|ibadah|mosque/i, 'mosque'],
  [/sekolah|kampus|universitas|school|tk\b|paud/i, 'school'],
  [/stasiun|krl|kereta|mrt|lrt|train|transjakarta|halte/i, 'train'],
  [/tol|jalan raya|akses|toll|bandara/i, 'road'],
  [/pasar|mal|mall|belanja|supermarket|ruko|toko/i, 'market'],
  [/rumah sakit|klinik|puskesmas|hospital|apotek/i, 'hospital'],
  [/clubhouse|club house|balai|aula|gedung/i, 'club'],
  [/gym|fitnes|olahraga|lapangan|basket|futsal|tenis/i, 'sport'],
  [/bermain|playground|anak/i, 'play'],
  [/sepeda|bike/i, 'bike'],
  [/kuliner|restoran|kafe|cafe|makan/i, 'food'],
];

/** Kunci ikon untuk nama fasilitas; tanpa kata kunci yang cocok → pin lokasi. */
export function iconKey(title: string): IconKey {
  return RULES.find(([pattern]) => pattern.test(title || ''))?.[1] ?? 'pin';
}
