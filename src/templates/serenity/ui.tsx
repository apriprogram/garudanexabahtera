// Komponen kecil Serenity: label section berbentuk pil, judul dengan kata sorotan bergradasi, tombol pil + panah,
// ikon otomatis dari judul.
// Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';

/** Label section: pil kecil dengan tanda "+" warna aksen (latar terang) atau pil kaca (di atas foto). */
export function SectionLabel({ children, tone = 'light', className = '' }: { children: ReactNode; tone?: 'light' | 'white' | 'glass'; className?: string }) {
  const tones = {
    light: 'bg-[#F5F4FA] text-[#151833]',
    white: 'bg-white text-[#151833]',
    glass: 'bg-white/[0.14] text-white ring-1 ring-inset ring-white/25 backdrop-blur-md',
  } as const;
  return (
    <p className={`inline-flex max-w-full items-center gap-2 rounded-full py-1.5 pl-2 pr-3.5 text-[13px] font-medium leading-snug ${tones[tone]} ${className}`}>
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${tone === 'glass' ? 'bg-white/20 text-white' : 'bg-(--sr-tint) text-(--tpl-accent-ink)'}`}
      >
        <Plus className="h-3 w-3" strokeWidth={2.5} />
      </span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * Judul dengan kata sorotan bergradasi. `tone` dark = gradasi pastel (di atas foto), light = tinta aksen → biru.
 * `breakBefore`: sorotan di AKHIR judul dipindah ke baris baru (judul hero dua baris seperti "… / di Setiap Momen").
 */
export function Highlighted({ title, highlight, tone, breakBefore = false }: { title: string; highlight: string; tone: 'dark' | 'light'; breakBefore?: boolean }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  const lineBreak = breakBefore && !after.trim() && before.trim();
  return (
    <>
      {lineBreak ? before.trimEnd() : before}
      {lineBreak && <br />}
      <span className={tone === 'dark' ? 'sr-grad-pastel' : 'sr-grad-ink'}>{mark}</span>
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
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  className: string;
  arrow?: boolean;
  onNavigate?: () => void;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} className={`group ${className}`} onNavigate={onNavigate}>
      <span className="truncate">{label}</span>
      {arrow && <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />}
    </ActionLink>
  );
}

/** Ikon yang dipilih otomatis dari judul (lihat ./icons). Dekoratif. */
export function TitleIcon({ title, index = 0, className = 'h-5 w-5' }: { title: string; index?: number; className?: string }) {
  const Icon = ICONS[iconKey(title, index)];
  return <Icon className={className} aria-hidden />;
}
