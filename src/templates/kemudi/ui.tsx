// Komponen kecil Kemudi: label section (pil bertitik + nomor mono), kepala section (label, H2 Hanken, satu kalimat
// pengantar; kiri-kanan atau bertumpuk), tombol rounded-2xl + panah, tautan teks, kontrol bersegmen (role=radiogroup,
// radio asli → panah kiri/kanan bawaan browser; ibu jari biru bergeser), ikon otomatis, dan baris bintang ulasan.
// Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ArrowUpRight, Star } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import type { LinkAction } from '../shared/utils';
import { ICONS, type IconKey } from './icons';
import { BTN, C, GRID_GAP, MONO, TEXT_LINK, TYPE } from './styles';

export type Tone = 'white' | 'grey' | 'dark';

const TAG_TONE: Record<Tone, string> = {
  white: 'bg-[#F2F4F7] text-[#0D1117]',
  grey: 'bg-white text-[#0D1117] ring-1 ring-inset ring-[#0D1117]/[0.08]',
  dark: 'bg-white/[0.08] text-white ring-1 ring-inset ring-white/[0.12]',
};

/** Label section: pil bertitik aksen + nomor mono "01" + teks. Kosong → tidak dirender. */
export function SectionTag({ label, index = '', tone = 'white', className = '' }: { label: string; index?: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  return (
    <p className={`inline-flex h-8 max-w-full items-center gap-2 rounded-full pl-3 pr-3.5 text-[13px] font-semibold ${TAG_TONE[tone]} ${className}`}>
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone === 'dark' ? 'bg-(--km-bright)' : 'bg-(--tpl-accent)'}`} />
      {index && (
        <span aria-hidden className={`${MONO} text-[12px] ${tone === 'dark' ? 'text-white/70' : 'text-[#0D1117]/65'}`}>
          {index}
        </span>
      )}
      <span className="truncate">{label}</span>
    </p>
  );
}

/**
 * Kepala section. `split` = label + H2 kiri (7 kolom), kalimat pengantar kanan rata bawah (layar lebar); `stack` =
 * bertumpuk. Judul kosong → H2 `sr-only` berisi `srTitle` (section tetap diawali satu H2).
 */
export function SectionHead({
  eyebrow,
  index = '',
  title,
  subtitle = '',
  srTitle = '',
  tone = 'white',
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
      <SectionTag label={eyebrow} index={index} tone={tone} />
    </Reveal>
  );
  const heading = title && (
    <Reveal as="h2" delay={80} className={`max-w-[18ch] ${dark ? 'text-white' : C.ink} ${TYPE.h2}`}>
      {title}
    </Reveal>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`max-w-[48ch] text-pretty ${TYPE.lead} ${dark ? C.onDarkMuted : C.muted}`}>
      {subtitle}
    </Reveal>
  );
  if (layout === 'stack') {
    return (
      <div className={className}>
        {label}
        {hidden}
        {heading && <div className={label ? 'mt-5' : ''}>{heading}</div>}
        {sub && <div className="mt-4">{sub}</div>}
      </div>
    );
  }
  return (
    <div className={`grid gap-y-4 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP} ${className}`}>
      <div className="min-w-0 @5xl:col-span-7">
        {label}
        {hidden}
        {heading && <div className={label ? 'mt-5' : ''}>{heading}</div>}
      </div>
      {sub && <div className="min-w-0 @5xl:col-span-5 @5xl:col-start-8 @5xl:pb-1.5">{sub}</div>}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'light' | 'ghost';

/** Tombol rounded-2xl + panah (bergeser 2px saat disorot). Tanpa label atau aksi → tidak dirender. */
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
  size?: 'md' | 'lg' | 'xl';
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

/** Tautan teks bergaris bawah; tautan keluar panah serong, di halaman panah kanan. */
export function TextLink({ action, label, className = '', icon }: { action: LinkAction | null; label: string; className?: string; icon?: ReactNode }) {
  if (!action || !label) return null;
  const Icon = action.kind === 'external' ? ArrowUpRight : ArrowRight;
  return (
    <ActionLink action={action} className={`${TEXT_LINK} ${className}`}>
      {label}
      {icon ?? <Icon aria-hidden className="h-4 w-4 shrink-0" />}
    </ActionLink>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/**
 * Kontrol bersegmen (role="radiogroup" berisi radio asli; panah kiri/kanan berpindah pilihan). Ibu jari warna tema
 * bergeser ke pilihan aktif (≤ 220 ms, ./kemudi.css). `tone="dark"` untuk di atas grafit.
 */
export function Segmented<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  tone = 'light',
  className = '',
}: {
  name: string;
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: 'light' | 'white' | 'dark';
  className?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const track = tone === 'dark' ? 'bg-white/[0.08]' : tone === 'white' ? 'bg-white ring-1 ring-inset ring-[#0D1117]/[0.08]' : 'bg-[#EEF1F5]';
  const idle = tone === 'dark' ? 'text-white/75 hover:text-white' : 'text-[#0D1117]/75 hover:text-[#0D1117]';
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`km-seg relative grid rounded-[14px] p-1 ${track} ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, '--seg-i': index, '--seg-n': options.length } as CSSProperties}
    >
      <span aria-hidden className="km-seg-thumb pointer-events-none absolute bottom-1 left-1 top-1 rounded-[10px] bg-(--tpl-accent)" />
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <label
            key={o.value}
            className={`relative z-10 flex h-11 min-w-0 cursor-pointer items-center justify-center rounded-[10px] px-3 text-center text-[14px] font-semibold transition-colors duration-200 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${
              tone === 'dark' ? 'has-[:focus-visible]:outline-white' : 'has-[:focus-visible]:outline-(--km-ink)'
            } ${checked ? 'text-(--tpl-on-accent)' : idle}`}
          >
            <input type="radio" name={name} value={o.value} checked={checked} disabled={o.disabled} onChange={() => onChange(o.value)} className="sr-only" />
            <span className="truncate">{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}

/** Ikon otomatis (lihat ./icons). Dekoratif. */
export function AutoIcon({ k, className = 'h-5 w-5' }: { k: IconKey; className?: string }) {
  const Icon = ICONS[k];
  return <Icon className={className} aria-hidden strokeWidth={1.7} />;
}

/** Baris bintang ulasan (1–5); 0 → tidak dirender. Tanpa rata-rata/jumlah ulasan. */
export function Stars({ value, className = '' }: { value: number; className?: string }) {
  if (value < 1) return null;
  return (
    <p role="img" aria-label={`${value} dari 5 bintang`} className={`flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} aria-hidden className={`h-4 w-4 ${i < value ? 'fill-(--tpl-accent) text-(--tpl-accent)' : 'fill-[#D5DBE3] text-[#D5DBE3]'}`} strokeWidth={1.5} />
      ))}
    </p>
  );
}
