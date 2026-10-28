// Komponen kecil HomeNest: label section (garis pendek 40px + huruf kapital berjarak lebar), kepala section (label, H2
// Cormorant, kalimat pengantar; susunan kiri-kanan atau tengah), tombol persegi + panah, tautan teks bergaris bawah,
// dan ikon fasilitas otomatis. Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import type { LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { BTN, C, GRID_GAP, LABEL, TEXT_LINK, TEXT_LINK_INV, TYPE } from './styles';

export type Tone = 'light' | 'dark';

/** Label section: garis pendek lalu teks kapital berjarak. Kosong → tidak dirender. Garis dekoratif. */
export function SectionLabel({ label, tone = 'light', center = false, className = '' }: { label: string; tone?: Tone; center?: boolean; className?: string }) {
  if (!label) return null;
  const dark = tone === 'dark';
  const rule = <span aria-hidden className={`h-px w-10 shrink-0 ${dark ? 'bg-[#F4EFE4]/50' : 'bg-(--hn-ink)'}`} />;
  return (
    <p className={`flex min-w-0 items-center gap-3.5 ${center ? 'justify-center' : ''} ${LABEL} ${dark ? C.onDeepMuted : C.accent} ${className}`}>
      {rule}
      <span className="min-w-0 text-balance">{label}</span>
      {center && rule}
    </p>
  );
}

/**
 * Kepala section. `split` = label + H2 di kolom 1-7, kalimat pengantar di kolom 9-12 rata bawah (layar lebar); `stack` =
 * bertumpuk; `center` = rata tengah. Judul kosong → H2 `sr-only` berisi `srTitle` (section tetap diawali satu H2).
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
  layout?: 'split' | 'stack' | 'center';
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle && !srTitle) return null;
  const dark = tone === 'dark';
  const center = layout === 'center';
  const hidden = !title && srTitle ? <h2 className="sr-only">{srTitle}</h2> : null;
  const label = eyebrow && (
    <Reveal variant="fade">
      <SectionLabel label={eyebrow} tone={tone} center={center} />
    </Reveal>
  );
  const heading = title && (
    <Reveal as="h2" delay={80} className={`${center ? 'mx-auto' : ''} max-w-[20ch] ${dark ? 'text-[#F4EFE4]' : C.ink} ${TYPE.h2}`}>
      {title}
    </Reveal>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`${center ? 'mx-auto' : ''} max-w-[46ch] text-pretty ${TYPE.lead} ${dark ? C.onDeepMuted : C.muted}`}>
      {subtitle}
    </Reveal>
  );

  if (layout !== 'split') {
    return (
      <div className={`${center ? 'text-center' : ''} ${className}`}>
        {label}
        {hidden}
        {heading && <div className={label ? 'mt-6' : ''}>{heading}</div>}
        {sub && <div className="mt-5">{sub}</div>}
      </div>
    );
  }
  return (
    <div className={`grid gap-y-5 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP} ${className}`}>
      <div className="min-w-0 @5xl:col-span-7">
        {label}
        {hidden}
        {heading && <div className={label ? 'mt-6' : ''}>{heading}</div>}
      </div>
      {sub && <div className="min-w-0 @5xl:col-span-4 @5xl:col-start-9 @5xl:pb-2">{sub}</div>}
    </div>
  );
}

type Variant = 'primary' | 'cream' | 'outline' | 'outlineLight';

/** Tombol persegi + panah (bergeser 2px saat disorot). Tanpa label atau aksi → tidak dirender. */
export function ButtonLink({
  action,
  label,
  variant = 'primary',
  size = 'lg',
  icon,
  arrow = true,
  className = '',
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  variant?: Variant;
  size?: 'md' | 'lg';
  /** Ikon di kiri label (mis. WhatsApp) */
  icon?: ReactNode;
  arrow?: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} onNavigate={onNavigate} className={`${BTN[variant]} ${BTN[size]} ${className}`}>
      {icon}
      <span className="truncate">{label}</span>
      {arrow && <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5" />}
    </ActionLink>
  );
}

/** Tautan teks bergaris bawah; tautan keluar diberi panah serong, tautan di halaman panah kanan (`arrow={false}` → tanpa). */
export function TextLink({
  action,
  label,
  tone = 'light',
  arrow = true,
  className = '',
}: {
  action: LinkAction | null;
  label: string;
  tone?: Tone;
  arrow?: boolean;
  className?: string;
}) {
  if (!action || !label) return null;
  const Icon = action.kind === 'external' ? ArrowUpRight : ArrowRight;
  return (
    <ActionLink action={action} className={`${tone === 'dark' ? TEXT_LINK_INV : TEXT_LINK} ${className}`}>
      {label}
      {arrow && <Icon aria-hidden className="h-4 w-4 shrink-0" />}
    </ActionLink>
  );
}

/** Ikon fasilitas yang dipilih otomatis dari nama (lihat ./icons). Dekoratif. */
export function AmenityIcon({ title, className = 'h-[22px] w-[22px]' }: { title: string; className?: string }) {
  const Icon = ICONS[iconKey(title)];
  return <Icon className={className} aria-hidden strokeWidth={1.4} />;
}
