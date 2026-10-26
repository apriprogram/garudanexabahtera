// Ikon garis Portline dipilih otomatis dari teks (angka perusahaan, lencana perusahaan grup, tombol utilitas), jadi CMS
// tidak butuh kolom ikon. Kata kunci Inggris + Indonesia khas pelayaran & logistik; tanpa kecocokan → ikon cadangan
// berurutan.
import {
  Anchor,
  Building2,
  Container,
  Factory,
  Fuel,
  Globe,
  GraduationCap,
  Leaf,
  MapPin,
  Package,
  Plane,
  Route,
  Search,
  Ship,
  ShipWheel,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
  Waves,
  Wrench,
  Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';

export const ICONS = {
  ship: Ship,
  terminal: Container,
  warehouse: Warehouse,
  globe: Globe,
  people: Users,
  office: Building2,
  energy: Fuel,
  air: Plane,
  road: Truck,
  yard: Wrench,
  factory: Factory,
  anchor: Anchor,
  wheel: ShipWheel,
  route: Route,
  pin: MapPin,
  search: Search,
  package: Package,
  leaf: Leaf,
  power: Zap,
  shield: ShieldCheck,
  waves: Waves,
  cadet: GraduationCap,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas.
const RULES: [RegExp, IconKey][] = [
  [/track|lacak|status|search|cari/i, 'search'],
  [/\bair\b|udara|plane|pesawat|flight|charter/i, 'air'],
  [/\broad\b|truck|darat|\brail\b|kereta|inland/i, 'road'],
  [/energy|energi|tanker|\blpg\b|\boil\b|minyak|\bgas\b/i, 'energy'],
  [/shipyard|galangan|repair|dry-?dock|perbaikan|marine/i, 'yard'],
  [/terminal|\bports?\b|pelabuhan|\bquays?\b|dermaga/i, 'terminal'],
  [/warehouse|gudang|storage/i, 'warehouse'],
  [/employ|karyawan|staff|people|\bcrews?\b|awak|pegawai|seafarer/i, 'people'],
  [/countr|negara|global|world|dunia|continent/i, 'globe'],
  [/office|kantor|branch|cabang/i, 'office'],
  [/vessel|\bships?\b|kapal|fleet|armada|\blines?\b|liner|container|kontainer|ocean|laut|bulk|carrier|feeder|short-sea|ro-ro|ferry/i, 'ship'],
  [/route|rute|\blanes?\b|service|layanan/i, 'route'],
  [/cadet|training|pelatihan|graduate/i, 'cadet'],
  [/fuel|clean|green|hijau|emisi|emission/i, 'leaf'],
  [/power|listrik|shore/i, 'power'],
  [/safe|aman|keselamatan|welfare/i, 'shield'],
  [/cargo|muatan|parcel|package|paket|\bteu\b|\btons?\b/i, 'package'],
];

const FALLBACK: IconKey[] = ['ship', 'terminal', 'globe', 'people', 'route', 'anchor'];

/** Kunci ikon untuk teks `text`; tanpa kata kunci yang cocok → ikon cadangan ke-`index`. */
export function iconKey(text: string, index = 0): IconKey {
  const match = RULES.find(([pattern]) => pattern.test(text || ''));
  return match ? match[1] : FALLBACK[Math.abs(Math.floor(index)) % FALLBACK.length];
}
