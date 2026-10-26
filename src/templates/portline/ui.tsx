// Komponen kecil Portline: label section dengan garis aksen pendek, kepala section KAPITAL (judul kiri, deskripsi
// kanan), tautan teks bergaris bawah dengan chevron (gaya "About Portline >"), tombol persegi panjang, dan ikon otomatis
// dari teks. Ditulis di folder ini (tidak dibagi dengan template lain).
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import type { LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { BTN, C, LABEL, TYPE_P } from './styles';

/** light = latar putih/es; dark = navy; band = pita biru pejal (label putih) */
export type Tone = 'light' | 'dark' | 'band';

/** Label section: garis aksen 24px + teks kapital berjarak. Kosong → tidak dirender. */
export function SectionLabel({ children, tone = 'light', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  if (!children) return null;
  const color = tone === 'dark' ? 'text-(--pl-bright)' : tone === 'band' ? 'text-white' : 'text-(--pl-ink)';
  const bar = tone === 'dark' ? 'bg-(--pl-bright)' : tone === 'band' ? 'bg-white' : 'bg-(--tpl-accent)';
  return (
    <p className={`inline-flex max-w-full items-center gap-3 ${LABEL} ${color} ${className}`}>
      <span aria-hidden className={`h-[2px] w-6 shrink-0 ${bar}`} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * Kepala section: label, H2 KAPITAL, deskripsi. `split` = judul kiri & deskripsi/aside kanan (layar lebar); `stack` =
 * bertumpuk. Tanpa isi → tidak dirender.
 */
export function SectionHead({
  eyebrow,
  title,
  subtitle = '',
  tone = 'light',
  layout = 'split',
  aside,
  className = '',
  titleId,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
  layout?: 'split' | 'stack';
  aside?: ReactNode;
  className?: string;
  titleId?: string;
}) {
  if (!eyebrow && !title && !subtitle && !aside) return null;
  const dark = tone !== 'light';
  const label = eyebrow && (
    <Reveal variant="fade">
      <SectionLabel tone={tone}>{eyebrow}</SectionLabel>
    </Reveal>
  );
  const heading = title && (
    <Reveal as="h2" delay={60} id={titleId} className={`max-w-[22ch] text-balance ${dark ? 'text-white' : C.ink} ${TYPE_P.h2}`}>
      {title}
    </Reveal>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={120} className={`max-w-[54ch] text-pretty ${TYPE_P.lead} ${dark ? 'text-white/85' : C.body}`}>
      {subtitle}
    </Reveal>
  );
  if (layout === 'stack') {
    return (
      <div className={className}>
        {label}
        {heading && <div className={label ? 'mt-4' : ''}>{heading}</div>}
        {sub && <div className="mt-4">{sub}</div>}
        {aside && <div className="mt-6">{aside}</div>}
      </div>
    );
  }
  return (
    <div className={`grid gap-5 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10 ${className}`}>
      <div className="min-w-0 @5xl:col-span-7">
        {label}
        {heading && <div className={label ? 'mt-4' : ''}>{heading}</div>}
      </div>
      {(sub || aside) && (
        <div className="flex min-w-0 flex-col gap-5 @5xl:col-span-5 @5xl:items-end @5xl:text-right">
          {sub}
          {aside}
        </div>
      )}
    </div>
  );
}

/** Tautan teks kapital bergaris bawah + chevron ("About Portline >"). Tanpa label/aksi → tidak dirender. */
export function TextLink({
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
  const color = tone === 'light' ? 'text-(--pl-ink)' : 'text-white';
  return (
    <ActionLink
      action={action}
      onNavigate={onNavigate}
      aria-label={ariaLabel}
      className={`group inline-flex min-h-11 max-w-full items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] ${color} ${className}`}
    >
      <span className="relative min-w-0 truncate pb-1.5">
        {label}
        <span aria-hidden className={`absolute inset-x-0 bottom-0 h-[2px] origin-left transition-transform duration-500 group-hover:scale-x-110 ${tone === 'light' ? 'bg-(--tpl-accent)' : 'bg-white'}`} />
      </span>
      <ChevronRight aria-hidden className="mb-1.5 h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.4} />
    </ActionLink>
  );
}

/** Tombol persegi panjang (lihat BTN). Tanpa label/aksi → tidak dirender. */
export function Button({
  action,
  label,
  variant = 'primary',
  icon,
  className = '',
  onNavigate,
  ariaLabel,
}: {
  action: LinkAction | null;
  label: string;
  variant?: 'primary' | 'white' | 'ghost' | 'outline';
  icon?: ReactNode;
  className?: string;
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} onNavigate={onNavigate} aria-label={ariaLabel} className={`${BTN[variant]} ${className}`}>
      {icon}
      <span className="min-w-0 truncate">{label}</span>
    </ActionLink>
  );
}

/** Ikon garis yang dipilih otomatis dari teks (lihat ./icons). Dekoratif. */
export function AutoIcon({ text, index = 0, className = 'h-5 w-5', strokeWidth = 1.6 }: { text: string; index?: number; className?: string; strokeWidth?: number }) {
  const Icon = ICONS[iconKey(text, index)];
  return <Icon className={className} aria-hidden strokeWidth={strokeWidth} />;
}
