// Ikon PuncakGear dipilih otomatis dari judul (kategori, alat sewa, tips keselamatan), jadi CMS tidak butuh kolom ikon.
// Kata kunci bahasa Indonesia + Inggris; tanpa kecocokan → ikon cadangan berurutan. Dirender lewat <TitleIcon> (./ui).
import {
  Backpack,
  BedSingle,
  CloudSun,
  Compass,
  Droplets,
  Flame,
  Flashlight,
  Footprints,
  HeartPulse,
  IdCard,
  Map,
  Mountain,
  Recycle,
  Shirt,
  Sunrise,
  Tent,
  Thermometer,
  Users,
  type LucideIcon,
} from 'lucide-react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  tent: Tent,
  backpack: Backpack,
  sleep: BedSingle,
  boots: Footprints,
  firstAid: HeartPulse,
  light: Flashlight,
  stove: Flame,
  jacket: Shirt,
  cold: Thermometer,
  weather: CloudSun,
  permit: IdCard,
  group: Users,
  water: Droplets,
  trash: Recycle,
  route: Map,
  mountain: Mountain,
  compass: Compass,
  sunrise: Sunrise,
} as const satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;

const RULES: [RegExp, IconKey][] = [
  // Barang dulu (kata "tenda"/"carrier" lebih spesifik daripada kata umum seperti "darurat")
  [/tenda|tent|flysheet|bivak/i, 'tent'],
  [/carrier|ransel|backpack|daypack|\btas\b/i, 'backpack'],
  [/sleeping|kantong tidur|matras|\bmat\b|tidur/i, 'sleep'],
  [/sepatu|boot|sandal|kaus kaki|gaiter/i, 'boots'],
  [/headlamp|senter|lampu|lentera/i, 'light'],
  [/kompor|masak|nesting|\bgas\b|cooking/i, 'stove'],
  [/hipotermia|dingin|beku/i, 'cold'],
  [/jaket|pakaian|baju|windbreaker|jas hujan|lapisan/i, 'jacket'],
  [/darurat|p3k|first aid|obat|medis|emergency/i, 'firstAid'],
  [/trekking|pole|tongkat/i, 'mountain'],
  // Tips keselamatan
  [/cuaca|hujan|badai|bmkg|status/i, 'weather'],
  [/daftar|izin|simaksi|registrasi|booking|identitas|ktp/i, 'permit'],
  [/sendiri|rombongan|kelompok|teman|bertiga|keluarga/i, 'group'],
  [/\bair\b|minum|bekal|logistik/i, 'water'],
  [/sampah|bersih|leave no trace/i, 'trash'],
  [/jalur|rute|peta|navigasi|gps/i, 'route'],
  [/puncak|gunung|summit|mendaki/i, 'mountain'],
];

const FALLBACK: IconKey[] = ['mountain', 'compass', 'tent', 'backpack', 'route', 'sunrise'];

/** Kunci ikon untuk judul `title`; tanpa kata kunci yang cocok → ikon cadangan ke-`index`. */
export function iconKey(title: string, index = 0): IconKey {
  const match = RULES.find(([pattern]) => pattern.test(title || ''));
  return match ? match[1] : FALLBACK[Math.abs(Math.floor(index)) % FALLBACK.length];
}
