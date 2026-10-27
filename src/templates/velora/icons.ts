// Ikon garis Velora dipilih otomatis dari teks (chip kartu bento, langkah kepemilikan, kartu teknologi), jadi CMS tidak
// butuh kolom ikon. Kata kunci Inggris (salinan demo) + Indonesia (bila pembeli menerjemahkan); tanpa kecocokan → ikon
// cadangan berurutan. Dirender lewat <AutoIcon> (./ui).
import {
  BatteryCharging,
  CalendarCheck,
  CarFront,
  Cpu,
  Factory,
  FlaskConical,
  Gauge,
  KeyRound,
  Lightbulb,
  PenTool,
  Route,
  Settings2,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';

export const ICONS = {
  electric: Zap,
  battery: BatteryCharging,
  research: FlaskConical,
  factory: Factory,
  design: PenTool,
  safety: ShieldCheck,
  light: Lightbulb,
  software: Cpu,
  configure: Settings2,
  drive: CalendarCheck,
  delivery: Truck,
  service: Wrench,
  key: KeyRound,
  mobility: Route,
  performance: Gauge,
  people: Users,
  craft: Sparkles,
  car: CarFront,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas.
const RULES: [RegExp, IconKey][] = [
  [/battery|baterai|charg|cas\b|pengisian/i, 'battery'],
  [/electric|listrik|\bev\b|energy|energi|solar/i, 'electric'],
  [/research|r&d|develop|riset|penelitian|lab/i, 'research'],
  [/manufactur|factory|plant|assembly|pabrik|produksi|perakitan/i, 'factory'],
  [/design|desain|studio|styling/i, 'design'],
  [/safety|keselamatan|aman|assist/i, 'safety'],
  [/light|lamp|lampu/i, 'light'],
  [/software|digital|app|aplikasi|connected/i, 'software'],
  [/configur|reserve|build|pilih|rakit|pesan/i, 'configure'],
  [/test drive|drive|book|jadwal|uji/i, 'drive'],
  [/deliver|pengiriman|antar|collect/i, 'delivery'],
  [/service|care|perawatan|servis|maintenance|warranty|garansi/i, 'service'],
  [/lease|leasing|finance|subscri|own|sewa|langganan|kepemilikan|kredit/i, 'key'],
  [/mobility|mobilitas|journey|share|perjalanan/i, 'mobility'],
  [/performance|motorsport|track|performa|balap/i, 'performance'],
  [/partner|team|people|tim|mitra|advisor/i, 'people'],
  [/craft|interior|hand|leather|kulit/i, 'craft'],
];

const FALLBACK: IconKey[] = ['car', 'key', 'electric', 'service', 'design', 'people'];

/** Kunci ikon untuk teks `title`; tanpa kata kunci yang cocok → ikon cadangan ke-`index`. */
export function iconKey(title: string, index = 0): IconKey {
  const match = RULES.find(([pattern]) => pattern.test(title || ''));
  return match ? match[1] : FALLBACK[Math.abs(Math.floor(index)) % FALLBACK.length];
}
