// Ikon garis Pesiar dipilih otomatis dari teks (bilah keunggulan hero, keterangan layanan bandara), jadi CMS tidak butuh
// kolom ikon. Kata kunci berbahasa Indonesia (dan istilah Inggris yang lazim); aturan pertama yang cocok menang, tanpa
// kecocokan → pin lokasi. Dirender lewat <AutoIcon> (./ui).
import {
  BadgeCheck,
  Briefcase,
  Car,
  Clock,
  Droplets,
  Hotel,
  Languages,
  MapPin,
  PlaneLanding,
  Route,
  Signpost,
  Snowflake,
  Tag,
  Wallet,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  price: Tag,
  hotel: Hotel,
  cool: Snowflake,
  water: Droplets,
  sign: Signpost,
  wait: Clock,
  bag: Briefcase,
  plane: PlaneLanding,
  route: Route,
  car: Car,
  language: Languages,
  pay: Wallet,
  check: BadgeCheck,
  pin: MapPin,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas.
const RULES: [RegExp, IconKey][] = [
  [/harga|per mobil|tarif|biaya|price/i, 'price'],
  [/papan nama|name ?board|sign/i, 'sign'],
  [/tunggu|menunggu|wait|menit|jam/i, 'wait'],
  [/koper|bagasi|luggage|\btas\b/i, 'bag'],
  [/\bac\b|ber-ac|dingin|sejuk/i, 'cool'],
  [/air mineral|minum|water/i, 'water'],
  [/hotel|vila|villa|jemput|antar/i, 'hotel'],
  [/bandara|penerbangan|airport|flight/i, 'plane'],
  [/rute|route|itinerary/i, 'route'],
  [/mobil|car|sopir|driver/i, 'car'],
  [/bahasa|english|inggris/i, 'language'],
  [/bayar|payment|dompet/i, 'pay'],
  [/dicek|aman|bersih|terawat/i, 'check'],
];

/** Kunci ikon untuk teks; tanpa kata kunci yang cocok → pin lokasi. */
export function iconKey(label: string): IconKey {
  return RULES.find(([pattern]) => pattern.test(label || ''))?.[1] ?? 'pin';
}
