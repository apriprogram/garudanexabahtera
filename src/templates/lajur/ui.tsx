// Komponen kecil Lajur: tiga bilah livery miring, label section ("▰▰▰ 01 · ARMADA" + garis lajur sampai tepi kanan),
// kepala section (label, H2 Unbounded, satu kalimat pengantar; kiri-kanan di layar lebar), tombol persegi radius 6 +
// panah yang bergeser, tautan teks, dan ikon fasilitas otomatis. Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import type { LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { BTN, C, GRID_GAP, LABEL, TEXT_LINK, TEXT_LINK_INV, TYPE } from './styles';

export type Tone = 'light' | 'dark';

/** Tiga jajaran genjang miring (motif livery). Dekoratif. */
export function LiveryBars({ className = 'h-3 w-[22px]', fill = 'fill-(--tpl-accent)' }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 22 12" className={`shrink-0 ${className}`} aria-hidden focusable="false">
      <path d="M0 12 5 0h3.4l-5 12zM6.8 12l5-12h3.4l-5 12zM13.6 12l5-12H22l-5 12z" className={fill} />
    </svg>
  );
}

/** Label section: bilah livery + nomor + teks kapital + garis lajur sampai tepi kanan wadah. Kosong → tidak dirender. */
export function SectionLabel({ label, index = '', tone = 'light', className = '' }: { label: string; index?: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  const dark = tone === 'dark';
  return (
    <p className={`flex min-w-0 items-center gap-3 ${LABEL} ${className}`}>
      <LiveryBars fill={dark ? 'fill-(--lj-bright)' : 'fill-(--tpl-accent)'} />
      {index && <span className={`tabular-nums ${dark ? 'text-white' : C.ink}`}>{index}</span>}
      {index && (
        <span aria-hidden className={dark ? 'text-white/50' : 'text-[#14161A]/40'}>
          ·
        </span>
      )}
      <span className={`min-w-0 truncate ${dark ? C.onInkMuted : 'text-[#14161A]/[0.72]'}`}>{label}</span>
      <span aria-hidden className={`h-px min-w-6 flex-1 ${dark ? 'bg-white/15' : 'bg-[#14161A]/10'}`} />
    </p>
  );
}

/**
 * Kepala section. `split` = label selebar wadah, lalu H2 (kolom 1-7) dan kalimat pengantar (kolom 9-12, rata bawah)
 * di layar lebar; `stack` = bertumpuk. Judul kosong → H2 `sr-only` berisi `srTitle` (section tetap diawali satu H2).
 */
export function SectionHead({
  eyebrow,
  index = '',
  title,
  subtitle = '',
  srTitle = '',
  tone = 'light',
  layout = 'split',
  className = '',
}: {
  eyebrow: string;
  index?: string;
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
      <SectionLabel label={eyebrow} index={index} tone={tone} />
    </Reveal>
  );
  const heading = title && (
    <Reveal as="h2" delay={80} className={`max-w-[20ch] ${dark ? 'text-white' : C.ink} ${TYPE.h2}`}>
      {title}
    </Reveal>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`max-w-[52ch] text-pretty ${TYPE.lead} ${dark ? C.onInkMuted : C.muted}`}>
      {subtitle}
    </Reveal>
  );

  if (layout === 'stack') {
    return (
      <div className={className}>
        {label}
        {hidden}
        {heading && <div className={label ? 'mt-6' : ''}>{heading}</div>}
        {sub && <div className="mt-4">{sub}</div>}
      </div>
    );
  }
  return (
    <div className={className}>
      {label}
      {hidden}
      {(heading || sub) && (
        <div className={`grid gap-y-4 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP} ${label ? 'mt-6 @3xl:mt-8' : ''}`}>
          {heading && <div className="min-w-0 @5xl:col-span-7">{heading}</div>}
          {sub && <div className="min-w-0 @5xl:col-span-4 @5xl:col-start-9 @5xl:pb-1.5">{sub}</div>}
        </div>
      )}
    </div>
  );
}

type Variant = 'primary' | 'ghost' | 'ghostLight' | 'ink' | 'bright';

/** Tombol persegi radius 6 + panah (bergeser 4px saat disorot). Tanpa label atau aksi → tidak dirender. */
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
  /** Ikon di kiri label (mis. WhatsApp) */
  icon?: ReactNode;
  arrow?: boolean;
  className?: string;
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} onNavigate={onNavigate} aria-label={ariaLabel} className={`${BTN[variant]} ${BTN[size]} ${className}`}>
      {icon}
      <span className="truncate">{label}</span>
      {arrow && <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-1" />}
    </ActionLink>
  );
}

/** Tautan teks bergaris bawah; tautan keluar diberi panah serong, tautan di halaman panah kanan. */
export function TextLink({
  action,
  label,
  tone = 'light',
  icon,
  className = '',
}: {
  action: LinkAction | null;
  label: string;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  if (!action || !label) return null;
  const Icon = action.kind === 'external' ? ArrowUpRight : ArrowRight;
  return (
    <ActionLink action={action} className={`${tone === 'dark' ? TEXT_LINK_INV : TEXT_LINK} ${className}`}>
      {icon}
      {label}
      {!icon && <Icon aria-hidden className="h-4 w-4 shrink-0" />}
    </ActionLink>
  );
}

/** Ikon fasilitas yang dipilih otomatis dari nama (lihat ./icons). Dekoratif. */
export function FacilityIcon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  const Icon = ICONS[iconKey(name)];
  return <Icon className={className} aria-hidden strokeWidth={1.8} />;
}
