// Komponen kecil Altura: label pil "● Who we are", tombol pil dengan bulatan panah limau DI DALAM pil (referensi
// Spaciaz), bulatan panah, kepala section (pil kiri + judul kanan / judul + aksi / terpusat), dan ikon otomatis.
// Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import type { LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { BTN, C, TYPE_A } from './styles';

export type Tone = 'light' | 'dark';

/** Label pil kecil bergaris tipis dengan titik warna tema. Kosong → tidak dirender. */
export function PillTag({ children, tone = 'light', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  if (!children) return null;
  const dark = tone === 'dark';
  return (
    <p
      className={`inline-flex h-8 max-w-full items-center gap-2 rounded-full px-3.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] ring-1 ring-inset ${
        dark ? 'text-white ring-white/25' : `bg-white ${C.ink} ring-[#141612]/[0.12]`
      } ${className}`}
    >
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full bg-(--tpl-accent) ${dark ? '' : 'ring-1 ring-[#141612]/20'}`} />
      <span className="truncate">{children}</span>
    </p>
  );
}

/** Bulatan panah (dekoratif). `tone`: warna tema (bawaan) atau tinta. */
export function ArrowDot({ size = 'md', tone = 'accent', className = '' }: { size?: 'sm' | 'md' | 'lg'; tone?: 'accent' | 'ink' | 'white'; className?: string }) {
  const dims = size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';
  const icon = size === 'lg' ? 'h-5 w-5' : 'h-[17px] w-[17px]';
  const color =
    tone === 'ink' ? 'bg-[#141612] text-white' : tone === 'white' ? 'bg-white text-[#141612]' : 'bg-(--tpl-accent) text-(--tpl-on-accent)';
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full ${dims} ${color} ${className}`}>
      <ArrowUpRight className={`${icon} transition-transform duration-500 ease-out group-hover:rotate-45`} strokeWidth={2} />
    </span>
  );
}

type Variant = 'white' | 'solid' | 'accent' | 'ink' | 'glass';

/**
 * Tombol pil + bulatan panah di dalam pil (sisi kanan). Satu tautan; saat disorot panah berputar pelan. Tanpa label atau
 * aksi → tidak dirender.
 */
export function PillCta({
  action,
  label,
  variant = 'white',
  size = 'lg',
  className = '',
  onNavigate,
  icon,
}: {
  action: LinkAction | null;
  label: string;
  variant?: Variant;
  size?: 'md' | 'lg';
  className?: string;
  onNavigate?: () => void;
  icon?: ReactNode;
}) {
  if (!action || !label) return null;
  const height = size === 'lg' ? 'h-[54px] pl-6 pr-1.5 text-[15px]' : 'h-12 pl-5 pr-1.5 text-[14px]';
  const dot = variant === 'accent' ? 'ink' : 'accent';
  return (
    <ActionLink action={action} onNavigate={onNavigate} className={`group ${BTN[variant]} ${height} gap-3 ${className}`}>
      {icon}
      <span className="min-w-0 truncate">{label}</span>
      <ArrowDot size={size === 'lg' ? 'md' : 'sm'} tone={dot} />
    </ActionLink>
  );
}

/**
 * Kepala section.
 * `split`: pil di kiri (3 kolom), judul + deskripsi di kanan (9 kolom) — gaya "Who we are".
 * `row`: pil + judul di kiri, deskripsi/aksi di kanan (rata bawah).
 * `stack`: pil, judul, deskripsi, aksi bertumpuk rata kiri.
 * `center`: pil + judul + deskripsi terpusat.
 */
export function SectionHead({
  eyebrow,
  title,
  subtitle = '',
  tone = 'light',
  layout = 'row',
  aside,
  className = '',
  titleClassName = '',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
  layout?: 'split' | 'row' | 'stack' | 'center';
  aside?: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  if (!eyebrow && !title && !subtitle && !aside) return null;
  const dark = tone === 'dark';
  const center = layout === 'center';
  const heading = title && (
    <Reveal
      as="h2"
      delay={80}
      className={`text-balance ${center ? 'mx-auto max-w-[18ch]' : 'max-w-[20ch]'} ${dark ? 'text-white' : C.ink} ${TYPE_A.h2} ${titleClassName}`}
    >
      {title}
    </Reveal>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`text-pretty ${center ? 'mx-auto' : ''} max-w-[56ch] ${TYPE_A.lead} ${dark ? 'text-white/75' : C.muted}`}>
      {subtitle}
    </Reveal>
  );
  const tag = eyebrow && (
    <Reveal variant="fade">
      <PillTag tone={tone}>{eyebrow}</PillTag>
    </Reveal>
  );

  if (center) {
    return (
      <div className={`text-center ${className}`}>
        {tag}
        {heading && <div className={tag ? 'mt-5' : ''}>{heading}</div>}
        {sub && <div className="mt-5">{sub}</div>}
        {aside && <div className="mt-7 flex justify-center">{aside}</div>}
      </div>
    );
  }

  if (layout === 'stack') {
    return (
      <div className={className}>
        {tag}
        {heading && <div className={tag ? 'mt-5' : ''}>{heading}</div>}
        {sub && <div className="mt-5">{sub}</div>}
        {aside && <div className="mt-8">{aside}</div>}
      </div>
    );
  }

  if (layout === 'split') {
    return (
      <div className={`grid gap-6 @5xl:grid-cols-12 @5xl:gap-8 ${className}`}>
        <div className="@5xl:col-span-3 @5xl:pt-3">{tag}</div>
        <div className="min-w-0 @5xl:col-span-9">
          {heading}
          {sub && <div className="mt-6">{sub}</div>}
          {aside && <div className="mt-8">{aside}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10 ${className}`}>
      <div className="min-w-0 @5xl:col-span-7">
        {tag}
        {heading && <div className={tag ? 'mt-5' : ''}>{heading}</div>}
      </div>
      {(sub || aside) && (
        <div className="flex min-w-0 flex-col items-start gap-6 @5xl:col-span-5 @5xl:items-end @5xl:text-right">
          {sub}
          {aside}
        </div>
      )}
    </div>
  );
}

/** Ikon garis yang dipilih otomatis dari judul (lihat ./icons). Dekoratif. */
export function TitleIcon({ title, index = 0, className = 'h-5 w-5' }: { title: string; index?: number; className?: string }) {
  const Icon = ICONS[iconKey(title, index)];
  return <Icon className={className} aria-hidden strokeWidth={1.7} />;
}
