// Komponen kecil GadgetKu: label section, judul dengan kata sorotan warna aksen, tombol pil + panah, bintang rating,
// harga (harga + harga coret), dan ikon barang otomatis. Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { ITEM_ICONS, itemIconKey } from './icons';
import { C, TYPE_G } from './styles';

/** Label section: teks kecil dengan titik warna aksen (latar terang) atau titik mint (latar gelap). */
export function SectionLabel({ children, tone = 'light', className = '' }: { children: ReactNode; tone?: 'light' | 'dark'; className?: string }) {
  return (
    <p
      className={`inline-flex max-w-full items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3.5 text-[13px] font-medium leading-snug ${
        tone === 'dark' ? 'bg-white/[0.08] text-white ring-1 ring-inset ring-white/15' : 'bg-white text-[#0B0C0E] ring-1 ring-inset ring-black/[0.08]'
      } ${className}`}
    >
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${tone === 'dark' ? 'bg-(--gk-on-dark)' : 'bg-(--tpl-accent)'}`} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Judul dengan kata sorotan warna aksen (dicerahkan di latar gelap, digelapkan di latar terang). */
export function Highlighted({ title, highlight, tone }: { title: string; highlight: string; tone: 'dark' | 'light' }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <span className={tone === 'dark' ? 'text-(--gk-on-dark)' : 'text-(--tpl-accent-ink)'}>{mark}</span>
      {after}
    </>
  );
}

/** Tombol pil + panah. Tanpa label atau aksi → tidak dirender. */
export function PillLink({
  action,
  label,
  className,
  arrow = true,
  icon,
  onNavigate,
  ariaLabel,
}: {
  action: LinkAction | null;
  label: string;
  className: string;
  arrow?: boolean;
  icon?: ReactNode;
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} className={`group ${className}`} onNavigate={onNavigate} aria-label={ariaLabel}>
      {icon}
      <span className="truncate">{label}</span>
      {arrow && <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />}
    </ActionLink>
  );
}

/** Lima bintang; `value` 1–5. Dibacakan sebagai "5 dari 5 bintang". */
export function Stars({ value, className = 'h-4 w-4', tone = 'light' }: { value: number; className?: string; tone?: 'light' | 'dark' }) {
  return (
    <span role="img" aria-label={`${value} dari 5 bintang`} className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={`${className} ${
            i < value ? 'fill-[#F5B301] text-[#F5B301]' : tone === 'dark' ? 'fill-white/15 text-white/15' : 'fill-black/10 text-black/10'
          }`}
        />
      ))}
    </span>
  );
}

/** Harga + harga coret (opsional). */
export function Price({ price, oldPrice, size = 'md', tone = 'light' }: { price: string; oldPrice?: string; size?: 'md' | 'lg'; tone?: 'light' | 'dark' }) {
  if (!price) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`${TYPE_G.price} ${size === 'lg' ? 'text-[30px] @3xl:text-[34px]' : 'text-[16px]'}`}>{price}</span>
      {oldPrice && (
        <span className={`text-[13px] line-through ${tone === 'dark' ? 'text-white/60' : C.muted}`}>
          <span className="sr-only">Harga normal </span>
          {oldPrice}
        </span>
      )}
    </p>
  );
}

/** Ikon barang dari nama/kategori (lihat ./icons). Dekoratif. */
export function ItemIcon({ name, className = 'h-5 w-5', strokeWidth = 1.75 }: { name: string; className?: string; strokeWidth?: number }) {
  const Icon = ITEM_ICONS[itemIconKey(name)];
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}
