// Komponen kecil Finova: chip label section bertitik, tombol pil dengan chip panah bulat, logo mitra satu warna.
// Ditulis di folder ini (bukan dibagi dengan template lain, brief §4.0).
import { ArrowUpRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ActionLink } from '../shared/Shell';
import { safeImage, type LinkAction } from '../shared/utils';

/** Label section: chip kecil dengan titik warna utama (latar terang) atau titik limau (panel gelap). */
export function SectionChip({
  children,
  tone = 'light',
  as: Tag = 'p',
  wrap = false,
  className = '',
}: {
  children: ReactNode;
  /** light = chip abu di latar putih, white = chip putih di pita abu, dark = di panel gelap */
  tone?: 'light' | 'white' | 'dark';
  as?: 'p' | 'h2';
  /** Teks panjang boleh dua baris (chip jadi kotak membulat) alih-alih dipotong */
  wrap?: boolean;
  className?: string;
}) {
  const dark = tone === 'dark';
  return (
    <Tag
      className={`inline-flex max-w-full gap-2 px-3 py-1.5 text-[13px] font-medium ${wrap ? 'items-start rounded-[14px] leading-snug' : 'items-center rounded-full leading-none'} ${
        dark ? 'bg-white/[0.06] text-white ring-1 ring-inset ring-white/15' : tone === 'white' ? 'bg-white text-[#0B0F0E]' : 'bg-[#F1F3F2] text-[#0B0F0E]'
      } ${className}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${wrap ? 'mt-[0.45em]' : ''} ${dark ? 'bg-(--fin-hl)' : 'bg-(--tpl-accent)'}`} />
      <span className={wrap ? 'min-w-0' : 'truncate'}>{children}</span>
    </Tag>
  );
}

/** Chip panah bulat di ujung kanan tombol pil. */
export const ArrowChip = ({ tone = 'ink' }: { tone?: 'ink' | 'light' }) => (
  <span
    aria-hidden
    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full @3xl:h-10 @3xl:w-10 ${tone === 'light' ? 'bg-white text-[#0B0F0E]' : 'bg-[#0B0F0E] text-white'}`}
  >
    <ArrowUpRight className="h-4 w-4" />
  </span>
);

/** Tombol pil + chip panah. Tanpa label atau aksi → tidak dirender. */
export function PillLink({
  action,
  label,
  className,
  chip = 'ink',
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  className: string;
  /** null = tanpa chip panah (tombol teks biasa) */
  chip?: 'ink' | 'light' | null;
  onNavigate?: () => void;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} className={className} onNavigate={onNavigate}>
      <span className="truncate">{label}</span>
      {chip && <ArrowChip tone={chip} />}
    </ActionLink>
  );
}

/**
 * Logo mitra satu warna. `onDarkFrom5xl`: di panel gelap (lebar ≥ @5xl) logo dibuat putih (brightness-0 invert) dan
 * nama cadangan putih; di bawahnya tinta. Nama cadangan selalu ≥ 4,5:1.
 */
export function PartnerLogo({ name, logo, onDarkFrom5xl = false }: { name: string; logo: string; onDarkFrom5xl?: boolean }) {
  const url = safeImage(logo);
  const [broken, setBroken] = useState<string | null>(null);
  if (url && broken !== url) {
    return (
      <img
        src={url}
        alt={name || 'Logo mitra'}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(url)}
        className={`h-6 w-auto max-w-[170px] shrink-0 object-contain opacity-70 grayscale @3xl:h-7 ${onDarkFrom5xl ? '@5xl:h-6 @5xl:opacity-80 @5xl:brightness-0 @5xl:invert' : ''}`}
      />
    );
  }
  if (!name) return null;
  return (
    <span className={`whitespace-nowrap text-[16px] font-semibold tracking-[-0.02em] text-[#0B0F0E] ${onDarkFrom5xl ? '@5xl:text-white' : ''}`}>{name}</span>
  );
}
