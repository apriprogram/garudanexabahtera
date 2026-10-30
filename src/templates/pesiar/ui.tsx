// Komponen kecil Pesiar: label section (nomor "01" · garis 32px · kata miring Playfair), kepala section (label, H2
// Playfair, satu kalimat pengantar; susunan kiri-kanan, bertumpuk, atau tengah), tombol pil + panah, tautan teks
// bergaris bawah, ikon otomatis dari teks, dan pesan galat isian. Ditulis di folder ini (tidak dibagi dengan template
// lain).
import { ArrowRight, ArrowUpRight, CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import type { LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { BTN, C, GRID_GAP, TEXT_LINK, TEXT_LINK_INV, TYPE } from './styles';

export type Tone = 'light' | 'dark';

/** Label section: nomor kecil, garis 32px, lalu kata miring. Kosong → tidak dirender. Garis dekoratif. */
export function SectionLabel({ label, number = '', tone = 'light', center = false, className = '' }: { label: string; number?: string; tone?: Tone; center?: boolean; className?: string }) {
  if (!label) return null;
  const dark = tone === 'dark';
  return (
    <p className={`flex min-w-0 items-center gap-3 ${center ? 'justify-center' : ''} ${dark ? C.onDeepMuted : C.ink} ${className}`}>
      {number && <span className={`text-[12px] font-semibold tabular-nums tracking-[0.08em] ${dark ? C.bright : C.accent}`}>{number}</span>}
      <span aria-hidden className={`h-px w-8 shrink-0 ${dark ? 'bg-[#F5EFE6]/40' : 'bg-[#1E2622]/40'}`} />
      <span className={`min-w-0 text-balance ${TYPE.label}`}>{label}</span>
    </p>
  );
}

/**
 * Kepala section. `split` = label + H2 di kolom 1-7, kalimat pengantar di kolom 9-12 rata bawah (layar lebar); `stack` =
 * bertumpuk; `center` = rata tengah. Judul kosong → H2 `sr-only` berisi `srTitle` (section tetap diawali satu H2).
 */
export function SectionHead({
  eyebrow,
  number = '',
  title,
  subtitle = '',
  srTitle = '',
  tone = 'light',
  layout = 'split',
  className = '',
}: {
  eyebrow: string;
  number?: string;
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
      <SectionLabel label={eyebrow} number={number} tone={tone} center={center} />
    </Reveal>
  );
  const heading = title && (
    <Reveal as="h2" delay={80} className={`${center ? 'mx-auto' : ''} max-w-[18ch] ${dark ? 'text-[#F5EFE6]' : C.ink} ${TYPE.h2}`}>
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
        {heading && <div className={label ? 'mt-5' : ''}>{heading}</div>}
        {sub && <div className="mt-5">{sub}</div>}
      </div>
    );
  }
  return (
    <div className={`grid gap-y-5 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP} ${className}`}>
      <div className="min-w-0 @5xl:col-span-7">
        {label}
        {hidden}
        {heading && <div className={label ? 'mt-5' : ''}>{heading}</div>}
      </div>
      {sub && <div className="min-w-0 @5xl:col-span-4 @5xl:col-start-9 @5xl:pb-1.5">{sub}</div>}
    </div>
  );
}

type Variant = 'primary' | 'outline' | 'light' | 'sand';

/** Tombol pil + panah (bergeser 2px saat disorot). Tanpa label atau aksi → tidak dirender. */
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
  size?: 'sm' | 'md' | 'lg';
  /** Ikon di kiri label (mis. WhatsApp) */
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

/** Ikon yang dipilih otomatis dari teks (lihat ./icons). Dekoratif. */
export function AutoIcon({ label, className = 'h-5 w-5' }: { label: string; className?: string }) {
  const Icon = ICONS[iconKey(label)];
  return <Icon className={className} aria-hidden strokeWidth={1.5} />;
}

/** Pesan galat di bawah isian (id dipakai aria-describedby). */
export function FieldError({ id, message, tone = 'light' }: { id: string; message?: string; tone?: Tone }) {
  if (!message) return null;
  return (
    <p id={id} className={`mt-1.5 flex items-start gap-1.5 text-[13px] font-medium ${tone === 'dark' ? 'text-[#FFC9C2]' : 'text-[#B42318]'}`}>
      <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}
