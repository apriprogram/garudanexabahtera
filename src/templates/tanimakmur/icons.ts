// Ikon TaniMakmur dipilih otomatis dari judul (kategori, strip keunggulan, tanaman di pemilih paket), jadi CMS tidak
// butuh kolom ikon. Kata kunci bahasa Indonesia + Inggris; tanpa kecocokan → ikon cadangan berurutan. Dirender lewat
// <TitleIcon> dan <CropIcon> (./ui).
import {
  BadgeCheck,
  Bug,
  Droplets,
  Leaf,
  MessageCircle,
  Package,
  Recycle,
  Shovel,
  Sprout,
  Store,
  Sun,
  Truck,
  Wallet,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { ChiliIcon, HydroIcon, LeafyIcon, TomatoIcon } from './marks';

/** Semua ikon umum yang bisa dipilih. */
export const ICONS = {
  seed: Sprout,
  fertilizer: Recycle,
  pest: Bug,
  tool: Shovel,
  water: Droplets,
  harvest: Wheat,
  shipping: Truck,
  talk: MessageCircle,
  certified: BadgeCheck,
  bundle: Package,
  pay: Wallet,
  shop: Store,
  sun: Sun,
  leaf: Leaf,
} as const satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;

const RULES: [RegExp, IconKey][] = [
  [/benih|bibit|semai|seed/i, 'seed'],
  [/pestisida|hama|nabati|hayati|mimba|pest|insect/i, 'pest'],
  [/pupuk|kompos|organik cair|npk|fertili|compost/i, 'fertilizer'],
  [/alat|sekop|cangkul|gunting|sprayer|pot\b|polybag|tool/i, 'tool'],
  [/hidroponik|nutrisi|air|siram|hydro|water/i, 'water'],
  [/panen|hasil|harvest/i, 'harvest'],
  [/kirim|ongkir|kurir|pengiriman|shipping|delivery/i, 'shipping'],
  [/konsultasi|penyuluh|tanya|chat|whatsapp/i, 'talk'],
  [/sertifikat|berlabel|resmi|asli|terjamin|certified/i, 'certified'],
  [/paket|bundle|kit/i, 'bundle'],
  [/bayar|cod|transfer|cicil|payment/i, 'pay'],
  [/toko|kios|gudang|store/i, 'shop'],
  [/matahari|cuaca|musim|sun/i, 'sun'],
];

const FALLBACK: IconKey[] = ['seed', 'leaf', 'harvest', 'water', 'sun', 'bundle'];

/** Kunci ikon untuk judul `title`; tanpa kata kunci yang cocok → ikon cadangan ke-`index`. */
export function iconKey(title: string, index = 0): IconKey {
  const match = RULES.find(([pattern]) => pattern.test(title || ''));
  return match ? match[1] : FALLBACK[Math.abs(Math.floor(index)) % FALLBACK.length];
}

// ─── Ikon tanaman (pemilih paket) ─────────────────────────────────────────────

export const CROP_ICONS = {
  chili: ChiliIcon,
  tomato: TomatoIcon,
  hydro: HydroIcon,
  leafy: LeafyIcon,
  sprout: Sprout,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type CropKey = keyof typeof CROP_ICONS;

const CROP_RULES: [RegExp, CropKey][] = [
  [/hidroponik|hydro|selada|lettuce|nft|wick/i, 'hydro'],
  [/cabai|cabe|chili|paprika|lombok/i, 'chili'],
  [/tomat|tomato|terong/i, 'tomato'],
  [/sayur|bayam|kangkung|pakcoy|sawi|daun|kale|leafy/i, 'leafy'],
];

/** Ikon tanaman dari nama tanaman/paket; tidak dikenal → tunas. */
export const cropKey = (name: string): CropKey => CROP_RULES.find(([pattern]) => pattern.test(name || ''))?.[1] ?? 'sprout';
