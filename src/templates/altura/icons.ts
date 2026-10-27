// Ikon garis Altura dipilih otomatis dari teks (keunggulan & spesifikasi properti), jadi CMS tidak butuh kolom ikon.
// Kata kunci Inggris & Indonesia; tanpa kecocokan → ikon cadangan berurutan. Dirender lewat <TitleIcon> (./ui).
import {
  Bath,
  BedDouble,
  Building2,
  CarFront,
  Compass,
  Gem,
  Globe2,
  HandHeart,
  HardHat,
  KeyRound,
  Landmark,
  Layers,
  Leaf,
  Maximize2,
  Palette,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { SpecIcon } from './model';

type Icon = ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>;

/** Ikon keunggulan. */
export const ICONS = {
  responsibility: HandHeart,
  team: Users,
  security: ShieldCheck,
  diversity: Scale,
  construction: HardHat,
  custom: SlidersHorizontal,
  green: Leaf,
  design: Palette,
  global: Globe2,
  growth: TrendingUp,
  quality: Gem,
  service: Wrench,
  landmark: Landmark,
  location: Compass,
  key: KeyRound,
  sparkle: Sparkles,
} as const satisfies Record<string, Icon>;

export type IconKey = keyof typeof ICONS;

const RULES: [RegExp, IconKey][] = [
  [/responsib|community|csr|social|charity|tanggung jawab|komunitas/i, 'responsibility'],
  [/team|expert|people|talent|tim|ahli/i, 'team'],
  [/secur|complian|safe|trust|transparen|keaman|kepatuhan/i, 'security'],
  [/divers|equity|inclusi|equal|keberagaman/i, 'diversity'],
  [/construct|warrant|build|aftercare|engineer|konstruksi|garansi/i, 'construction'],
  [/custom|personal|tailor|flexib|kustom|pilihan/i, 'custom'],
  [/sustain|green|eco|energy|net zero|biophil|hijau|berkelanjutan/i, 'green'],
  [/design|architect|interior|desain|arsitek/i, 'design'],
  [/global|international|worldwide|countr|internasional/i, 'global'],
  [/invest|return|value|growth|nilai|investasi/i, 'growth'],
  [/quality|premium|luxur|craft|kualitas|mewah/i, 'quality'],
  [/service|maintenance|manage|layanan|pengelola/i, 'service'],
  [/location|connect|access|lokasi|akses/i, 'location'],
  [/handover|key|ownership|kunci|serah terima/i, 'key'],
];

const FALLBACK: IconKey[] = ['landmark', 'quality', 'sparkle', 'location', 'service', 'growth'];

/** Kunci ikon untuk judul; tanpa kecocokan → ikon cadangan ke-`index`. */
export function iconKey(title: string, index = 0): IconKey {
  const match = RULES.find(([pattern]) => pattern.test(title || ''));
  return match ? match[1] : FALLBACK[Math.abs(index) % FALLBACK.length];
}

/** Ikon spesifikasi properti (lihat specIcon di ./model). */
export const SPEC_ICONS: Record<SpecIcon, Icon> = {
  area: Maximize2,
  bed: BedDouble,
  bath: Bath,
  floors: Layers,
  parking: CarFront,
  units: Building2,
  other: Sparkles,
};
