// Ikon Lawatan dipilih otomatis dari teks CMS, jadi CMS tidak butuh kolom ikon:
// - ikon garis (lucide) untuk "yang termasuk" di kartu paket dan ubin section Termasuk (aturan pertama yang cocok menang,
//   tanpa kecocokan → tanda centang);
// - piktogram titik rute film (SVG milik template di ./scenes) dari nama titik (sekolah, candi, hotel, kota, pantai,
//   gunung, pulang; tanpa kecocokan → pin).
import { Bus, BedDouble, Camera, CarFront, CircleCheck, CupSoda, Flag, ShoppingBag, Ticket, Utensils } from 'lucide-react';
import type { ComponentType } from 'react';

/** Ikon "yang termasuk". */
export const ICONS = {
  bus: Bus,
  hotel: BedDouble,
  food: Utensils,
  ticket: Ticket,
  guide: Flag,
  photo: Camera,
  jeep: CarFront,
  drink: CupSoda,
  shop: ShoppingBag,
  check: CircleCheck,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas.
const RULES: [RegExp, IconKey][] = [
  [/jip|jeep|4\s*[x×]\s*4|off.?road/i, 'jeep'],
  [/bus|armada|transport|antar.?jemput|kendaraan/i, 'bus'],
  [/hotel|homestay|penginapan|villa|resort|kamar|menginap/i, 'hotel'],
  [/makan|kuliner|snack|sarapan|katering|menu/i, 'food'],
  [/tiket|masuk|retribusi|wahana/i, 'ticket'],
  [/pemandu|tour leader|leader|guide|pendamping/i, 'guide'],
  [/dokumentasi|foto|video|kamera/i, 'photo'],
  [/air mineral|minum|kopi|teh/i, 'drink'],
  [/oleh|belanja|souvenir/i, 'shop'],
];

/** Kunci ikon untuk teks "yang termasuk"; tanpa kata kunci yang cocok → centang. */
export function iconKey(title: string): IconKey {
  return RULES.find(([pattern]) => pattern.test(title || ''))?.[1] ?? 'check';
}

/** Piktogram titik rute film (digambar di ./scenes StopGlyph). */
export type StopKey = 'school' | 'stupa' | 'hotel' | 'city' | 'temple' | 'beach' | 'mountain' | 'home' | 'pin';

const STOP_RULES: [RegExp, StopKey][] = [
  [/pulang|kembali|tiba di rumah|selesai/i, 'home'],
  [/sekolah|kampus|kantor|titik jemput|jemput|berangkat|madrasah|pesantren/i, 'school'],
  [/borobudur|stupa|vihara|mendut/i, 'stupa'],
  [/prambanan|candi|pura|temple|kuil|masjid|makam|ziarah/i, 'temple'],
  [/hotel|homestay|penginapan|villa|resort|menginap/i, 'hotel'],
  [/pantai|laut|pulau|danau|telaga|kapal|pelabuhan/i, 'beach'],
  [/gunung|bromo|kawah|bukit|dieng|sunrise|merapi|puncak/i, 'mountain'],
  [/malioboro|kota|jalan|pasar|alun|keraton|kraton|museum|belanja|oleh/i, 'city'],
];

/** Piktogram titik rute dari namanya; tanpa kecocokan → pin. */
export function stopIconKey(name: string): StopKey {
  return STOP_RULES.find(([pattern]) => pattern.test(name || ''))?.[1] ?? 'pin';
}
