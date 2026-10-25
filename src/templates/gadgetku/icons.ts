// Ikon GadgetKu dipilih otomatis dari teks (barang di paket bundling, kategori produk tanpa foto, keunggulan toko),
// jadi CMS tidak butuh kolom ikon. Kata kunci bahasa Indonesia + Inggris; tanpa kecocokan → ikon cadangan berurutan.
import {
  BadgeCheck,
  BatteryCharging,
  Cable,
  HandCoins,
  Headphones,
  MessageCircle,
  Package,
  PackageCheck,
  Plug,
  RefreshCw,
  Shield,
  ShieldCheck,
  Smartphone,
  Truck,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** Ikon barang (isi paket, produk tanpa foto). */
export const ITEM_ICONS = {
  case: Smartphone,
  glass: Shield,
  charger: Plug,
  cable: Cable,
  audio: Headphones,
  power: BatteryCharging,
  other: Package,
} as const satisfies Record<string, LucideIcon>;

export type ItemIconKey = keyof typeof ITEM_ICONS;

const ITEM_RULES: [RegExp, ItemIconKey][] = [
  // Power bank, tempered glass, lalu charger dulu ("Charger 20W USB-C" bukan kabel)
  [/power ?bank|powerbank|baterai/i, 'power'],
  [/tempered|glass|anti ?gores|screen|pelindung layar|hydrogel/i, 'glass'],
  [/charger|adaptor|adapter|kepala cas|gan\b|pengisi/i, 'charger'],
  [/kabel|cable|usb|lightning|type-?c/i, 'cable'],
  [/earphone|earbuds|tws|headset|headphone|audio|speaker/i, 'audio'],
  [/casing|case|softcase|hardcase|cover|holder|pop ?socket/i, 'case'],
];

/** Kunci ikon barang dari nama/kategori; tanpa kecocokan → "other". */
export function itemIconKey(name: string): ItemIconKey {
  return ITEM_RULES.find(([pattern]) => pattern.test(name || ''))?.[1] ?? 'other';
}

/** Ikon keunggulan toko (strip layanan). */
export const PERK_ICONS = {
  warranty: ShieldCheck,
  shipping: Truck,
  cod: HandCoins,
  exchange: RefreshCw,
  original: BadgeCheck,
  chat: MessageCircle,
  fast: Zap,
  packing: PackageCheck,
} as const satisfies Record<string, LucideIcon>;

export type PerkIconKey = keyof typeof PERK_ICONS;

const PERK_RULES: [RegExp, PerkIconKey][] = [
  [/garansi|warranty|jaminan/i, 'warranty'],
  [/\bcod\b|bayar|pembayaran|cicil|paylater/i, 'cod'],
  [/tukar|retur|return|refund|kembali/i, 'exchange'],
  [/kirim|ongkir|pengiriman|kurir|same ?day|instan/i, 'shipping'],
  [/original|ori\b|asli|resmi|bergaransi resmi/i, 'original'],
  [/admin|chat|cs\b|bantuan|konsultasi/i, 'chat'],
  [/cepat|fast|kilat/i, 'fast'],
  [/kemas|packing|bubble/i, 'packing'],
];

const PERK_FALLBACK: PerkIconKey[] = ['original', 'shipping', 'cod', 'exchange'];

/** Kunci ikon keunggulan dari judul; tanpa kecocokan → ikon cadangan ke-`index`. */
export function perkIconKey(title: string, index = 0): PerkIconKey {
  const match = PERK_RULES.find(([pattern]) => pattern.test(title || ''));
  return match ? match[1] : PERK_FALLBACK[Math.abs(Math.floor(index)) % PERK_FALLBACK.length];
}
