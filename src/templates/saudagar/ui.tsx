// Komponen kecil Saudagar: label section serif miring "— Komoditas", judul dengan frasa miring (warna tinta, bukan warna
// tema), kepala section, tombol pil tinta, tautan teks berpanah, keterangan foto bertitik saffron, lingkaran inisial
// kraft, dan ikon komoditas. Ditulis di folder ini (tidak dibagi dengan template lain).
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { initials, splitHighlight, type LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { BTN, C, SERIF, TYPE_S } from './styles';

export type Tone = 'light' | 'dark';

/** Label section: serif miring dengan tanda pisah, warna tinta tema (--sg-ink; di pita espresso --sg-bright). */
export function Label({ children, tone = 'light', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  if (!children) return null;
  return (
    <p className={`${TYPE_S.label} ${tone === 'dark' ? 'text-(--sg-bright)' : 'text-(--sg-ink)'} ${className}`}>
      <span aria-hidden>— </span>
      {children}
    </p>
  );
}

/** Judul dengan bagian `highlight` dicetak miring. Terang → warna tinta yang sama; gelap → versi terang tema. */
export function Highlighted({ title, highlight, tone = 'light' }: { title: string; highlight: string; tone?: Tone }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <em className={`italic ${tone === 'dark' ? 'text-(--sg-bright)' : ''}`}>{mark}</em>
      {after}
    </>
  );
}

/**
 * Kepala section. `split` = label + judul kiri (7 kolom), deskripsi/aside kanan (5 kolom) rata bawah di layar lebar;
 * `stack` = label, judul, deskripsi bertumpuk; `center` = semuanya terpusat.
 */
export function SectionHead({
  eyebrow,
  title,
  highlight = '',
  subtitle = '',
  tone = 'light',
  layout = 'stack',
  titleClass = TYPE_S.h2,
  aside,
  className = '',
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  tone?: Tone;
  layout?: 'split' | 'stack' | 'center';
  titleClass?: string;
  aside?: ReactNode;
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle && !aside) return null;
  const dark = tone === 'dark';
  const center = layout === 'center';
  const label = eyebrow && (
    <Reveal variant="fade">
      <Label tone={tone}>{eyebrow}</Label>
    </Reveal>
  );
  const heading = title && (
    <Reveal as="h2" delay={80} className={`text-balance ${center ? 'mx-auto max-w-[20ch]' : 'max-w-[20ch]'} ${dark ? 'text-[#F7F2E8]' : C.ink} ${titleClass}`}>
      <Highlighted title={title} highlight={highlight} tone={tone} />
    </Reveal>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`max-w-[56ch] text-pretty ${center ? 'mx-auto' : ''} ${TYPE_S.lead} ${dark ? 'text-[#CBBBA6]' : C.muted}`}>
      {subtitle}
    </Reveal>
  );

  if (layout === 'split') {
    return (
      <div className={`grid gap-5 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-8 @7xl:gap-12 ${className}`}>
        <div className="min-w-0 @5xl:col-span-7">
          {label}
          {heading && <div className={label ? 'mt-4' : ''}>{heading}</div>}
        </div>
        {(sub || aside) && (
          <div className="flex min-w-0 flex-col gap-5 @5xl:col-span-5 @5xl:pb-1.5">
            {sub}
            {aside}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`${center ? 'text-center' : ''} ${className}`}>
      {label}
      {heading && <div className={label ? 'mt-4' : ''}>{heading}</div>}
      {sub && <div className="mt-5">{sub}</div>}
      {aside && <div className="mt-7">{aside}</div>}
    </div>
  );
}

/** Tombol pil tinta (atau kertas di pita espresso). Tanpa label/aksi → tidak dirender. */
export function InkPill({
  action,
  label,
  variant = 'ink',
  size = 'lg',
  arrow = true,
  className = '',
  onNavigate,
  ariaLabel,
}: {
  action: LinkAction | null;
  label: string;
  variant?: 'ink' | 'paper';
  size?: 'lg' | 'md';
  arrow?: boolean;
  className?: string;
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} onNavigate={onNavigate} aria-label={ariaLabel} className={`group ${BTN[variant]} ${BTN[size]} ${className}`}>
      <span className="truncate">{label}</span>
      {arrow && <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />}
    </ActionLink>
  );
}

/** Tautan teks berpanah ("Lihat komoditas →"): teks tinta, panah tinta tema; di pita espresso teks kertas. */
export function ArrowLink({
  action,
  label,
  tone = 'light',
  className = '',
  onNavigate,
  ariaLabel,
}: {
  action: LinkAction | null;
  label: string;
  tone?: Tone;
  className?: string;
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  if (!action || !label) return null;
  const dark = tone === 'dark';
  return (
    <ActionLink
      action={action}
      onNavigate={onNavigate}
      aria-label={ariaLabel}
      className={`group inline-flex min-h-11 max-w-full items-center gap-2 text-[15px] font-medium underline-offset-[6px] hover:underline ${
        dark ? 'text-[#F7F2E8] decoration-[#F7F2E8]/40' : `${C.ink} decoration-[#221A13]/30`
      } ${className}`}
    >
      <span className="min-w-0">{label}</span>
      <ArrowRight aria-hidden className={`h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 ${dark ? 'text-(--sg-bright)' : 'text-(--sg-ink)'}`} />
    </ActionLink>
  );
}

/** Keterangan foto: titik saffron + teks kecil (tengah: serif miring). Kosong → tidak dirender. */
export function Caption({ children, serif = false, center = false, className = '' }: { children: ReactNode; serif?: boolean; center?: boolean; className?: string }) {
  if (!children) return null;
  return (
    <p className={`flex min-h-6 items-center gap-2 ${center ? 'justify-center text-center' : ''} ${serif ? `${SERIF} text-[16px] italic leading-snug ${C.ink}` : `text-[13px] leading-snug ${C.muted}`} ${className}`}>
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--tpl-accent)" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Lingkaran kraft berisi inisial (pengganti foto testimoni; --sg-ink di kraft ≥ 4,6:1). */
export function Initials({ name, className = 'h-12 w-12 text-[15px]' }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-[#EFE6D3] font-semibold text-(--sg-ink) ${className}`}>
      {initials(name, '?')}
    </span>
  );
}

/** Ikon komoditas otomatis dari nama (./icons). Dekoratif. */
export function CommodityIcon({ name, className = 'h-[18px] w-[18px]' }: { name: string; className?: string }) {
  const Icon = ICONS[iconKey(name)];
  return <Icon aria-hidden className={className} strokeWidth={1.6} />;
}
