// Komponen kecil Nusaline: label section mono "→ JADWAL" (panah warna tema), kepala section (label, H2 Red Hat Display,
// satu kalimat pengantar; susunan kiri-kanan atau bertumpuk), tombol pill + panah, tautan teks bergaris bawah, dan ikon
// fasilitas otomatis. Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import type { LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { BTN, C, GRID_GAP, LABEL, TEXT_LINK, TEXT_LINK_DARK, TYPE } from './styles';

export type Tone = 'light' | 'dark';

/** Label section "→ JADWAL": panah warna tema, kata huruf mono kapital. Kosong → tidak dirender. */
export function SectionLabel({ label, tone = 'light', className = '' }: { label: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  const dark = tone === 'dark';
  return (
    <p className={`flex min-w-0 items-center gap-2.5 ${LABEL} ${dark ? C.onNightMuted : C.accent} ${className}`}>
      <span aria-hidden className={dark ? C.neon : C.accent}>
        →
      </span>
      <span className="min-w-0 text-balance">{label}</span>
    </p>
  );
}

/**
 * Kepala section. `split` = label + H2 di kolom 1-7, kalimat pengantar di kolom 9-12 rata bawah (layar lebar); `stack` =
 * bertumpuk. Judul kosong → H2 `sr-only` berisi `srTitle` (section tetap diawali satu H2).
 */
export function SectionHead({
  eyebrow,
  title,
  subtitle = '',
  srTitle = '',
  tone = 'light',
  layout = 'split',
  className = '',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  srTitle?: string;
  tone?: Tone;
  layout?: 'split' | 'stack';
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle && !srTitle) return null;
  const dark = tone === 'dark';
  const hidden = !title && srTitle ? <h2 className="sr-only">{srTitle}</h2> : null;
  const label = eyebrow && (
    <Reveal variant="fade">
      <SectionLabel label={eyebrow} tone={tone} />
    </Reveal>
  );
  const heading = title && (
    <Reveal as="h2" delay={80} className={`max-w-[22ch] ${dark ? 'text-white' : C.ink} ${TYPE.h2}`}>
      {title}
    </Reveal>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`max-w-[48ch] text-pretty ${TYPE.lead} ${dark ? C.onNightMuted : C.muted}`}>
      {subtitle}
    </Reveal>
  );

  if (layout === 'stack') {
    return (
      <div className={className}>
        {label}
        {hidden}
        {heading && <div className={label ? 'mt-4' : ''}>{heading}</div>}
        {sub && <div className="mt-4">{sub}</div>}
      </div>
    );
  }
  return (
    <div className={`grid gap-y-4 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP} ${className}`}>
      <div className="min-w-0 @5xl:col-span-7">
        {label}
        {hidden}
        {heading && <div className={label ? 'mt-4' : ''}>{heading}</div>}
      </div>
      {sub && <div className="min-w-0 @5xl:col-span-5 @5xl:col-start-8 @5xl:pb-1.5 @7xl:col-span-4 @7xl:col-start-9">{sub}</div>}
    </div>
  );
}

type Variant = 'primary' | 'light' | 'ghostDark' | 'ghost' | 'outline';

/** Tombol pill + panah (bergeser 2px saat disorot). Tanpa label atau aksi → tidak dirender. */
export function ButtonLink({
  action,
  label,
  variant = 'primary',
  size = 'lg',
  icon,
  arrow = true,
  className = '',
  onNavigate,
  ariaLabel,
}: {
  action: LinkAction | null;
  label: string;
  variant?: Variant;
  size?: 'md' | 'lg';
  /** Ikon di kiri label */
  icon?: ReactNode;
  arrow?: boolean;
  className?: string;
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  if (!action || !label) return null;
  const Icon = action.kind === 'external' ? ArrowUpRight : ArrowRight;
  return (
    <ActionLink action={action} onNavigate={onNavigate} aria-label={ariaLabel} className={`${BTN[variant]} ${BTN[size]} ${className}`}>
      {icon}
      <span className="truncate">{label}</span>
      {arrow && <Icon aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5" />}
    </ActionLink>
  );
}

/** Tautan teks bergaris bawah; tautan keluar diberi panah serong, tautan di halaman panah kanan. */
export function TextLink({
  action,
  label,
  tone = 'light',
  className = '',
  ariaLabel,
}: {
  action: LinkAction | null;
  label: string;
  tone?: Tone;
  className?: string;
  ariaLabel?: string;
}) {
  if (!action || !label) return null;
  const Icon = action.kind === 'external' ? ArrowUpRight : ArrowRight;
  return (
    <ActionLink action={action} aria-label={ariaLabel} className={`${tone === 'dark' ? TEXT_LINK_DARK : TEXT_LINK} ${className}`}>
      {label}
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
    </ActionLink>
  );
}

/** Ikon fasilitas yang dipilih otomatis dari teks (lihat ./icons). Dekoratif. */
export function FeatureIcon({ title, className = 'h-5 w-5' }: { title: string; className?: string }) {
  const Icon = ICONS[iconKey(title)];
  return <Icon className={className} aria-hidden strokeWidth={1.6} />;
}
