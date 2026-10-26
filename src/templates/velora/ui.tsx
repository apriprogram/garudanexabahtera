// Komponen kecil Velora: label section (garis merah pendek + teks), kepala section, tombol pil dengan bulatan panah DI
// DALAM pil (referensi CBRLP/VivaChat), chip panah bulat, tautan teks berpanah, dan ikon otomatis dari judul. Ditulis
// di folder ini (tidak dibagi dengan template lain).
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import type { LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { C, TYPE_V } from './styles';

export type Tone = 'light' | 'dark';

/** Label section: garis aksen pendek + teks kecil (aksen versi kontras sesuai latar). Kosong → tidak dirender. */
export function SectionLabel({ label, tone = 'light', className = '' }: { label: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  return (
    <p
      className={`inline-flex max-w-full items-center gap-3 text-[13px] font-semibold tracking-[0.02em] ${
        tone === 'dark' ? 'text-(--vl-bright)' : 'text-(--vl-ink)'
      } ${className}`}
    >
      <span aria-hidden className="h-[2px] w-7 shrink-0 rounded-full bg-(--vl-red)" />
      <span className="min-w-0">{label}</span>
    </p>
  );
}

/**
 * Kepala section. `split` = label + judul kiri, deskripsi/aside kanan (layar lebar); `stack` = bertumpuk;
 * `center` = terpusat. Judul & deskripsi muncul bertahap saat digulir.
 */
export function SectionHead({
  eyebrow,
  title,
  subtitle = '',
  tone = 'light',
  layout = 'split',
  aside,
  className = '',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
  layout?: 'split' | 'stack' | 'center';
  aside?: ReactNode;
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle && !aside) return null;
  const dark = tone === 'dark';
  const center = layout === 'center';
  const label = eyebrow && (
    <Reveal variant="fade">
      <SectionLabel label={eyebrow} tone={tone} />
    </Reveal>
  );
  const heading = title && (
    <Reveal as="h2" delay={80} className={`text-balance ${center ? 'mx-auto max-w-[22ch]' : 'max-w-[20ch]'} ${dark ? 'text-white' : C.ink} ${TYPE_V.h2}`}>
      {title}
    </Reveal>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`text-pretty ${center ? 'mx-auto' : ''} max-w-[56ch] ${TYPE_V.lead} ${dark ? C.mutedDark : C.muted}`}>
      {subtitle}
    </Reveal>
  );

  if (center) {
    return (
      <div className={`text-center ${className}`}>
        {label}
        {heading && <div className={label ? 'mt-5' : ''}>{heading}</div>}
        {sub && <div className="mt-5">{sub}</div>}
        {aside && <div className="mt-7">{aside}</div>}
      </div>
    );
  }
  if (layout === 'split') {
    return (
      <div className={`grid gap-6 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10 ${className}`}>
        <div className="min-w-0 @5xl:col-span-7">
          {label}
          {heading && <div className={label ? 'mt-5' : ''}>{heading}</div>}
        </div>
        {(sub || aside) && (
          <div className="flex min-w-0 flex-col gap-6 @5xl:col-span-5 @5xl:items-end">
            {sub && <div className="@5xl:w-full @5xl:max-w-[46ch]">{sub}</div>}
            {aside}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={className}>
      {label}
      {heading && <div className={label ? 'mt-5' : ''}>{heading}</div>}
      {sub && <div className="mt-5">{sub}</div>}
      {aside && <div className="mt-7">{aside}</div>}
    </div>
  );
}

/** Varian tombol pil: warna pil, bulatan, dan panah. */
const PILL = {
  /** Pil putih + bulatan hampir hitam (di atas foto / bidang gelap) */
  white: { pill: 'bg-white text-[#0D0E10] hover:bg-[#ECECEA]', dot: 'bg-[#0D0E10] text-white' },
  /** Pil hampir hitam + bulatan putih (di latar terang) */
  ink: { pill: 'bg-[#0D0E10] text-white hover:bg-[#25272C]', dot: 'bg-white text-[#0D0E10]' },
  /** Pil aksen (teks kontras otomatis) + bulatan putih */
  accent: { pill: 'bg-(--vl-fill) text-(--vl-on-fill) hover:bg-(--vl-fill-hover)', dot: 'bg-white text-[#0D0E10]' },
  /** Pil bergaris tipis di bidang gelap */
  ghost: { pill: 'bg-white/[0.06] text-white ring-1 ring-inset ring-white/25 hover:bg-white/[0.12]', dot: 'bg-white text-[#0D0E10]' },
} as const;

export type PillVariant = keyof typeof PILL;

/**
 * Tombol pil dengan bulatan panah di DALAM pil (kanan). Hover: warna pil sedikit berubah, panah bergeser & berputar.
 * Tanpa label atau aksi → tidak dirender.
 */
export function ArrowPill({
  action,
  label,
  variant = 'ink',
  size = 'md',
  icon,
  className = '',
  onNavigate,
  ariaLabel,
}: {
  action: LinkAction | null;
  label: string;
  variant?: PillVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  className?: string;
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  if (!action || !label) return null;
  const v = PILL[variant];
  const box = size === 'lg' ? 'h-14 pl-6 pr-2 text-[15px] gap-4' : size === 'sm' ? 'h-10 pl-4 pr-1 text-[13.5px] gap-2.5' : 'h-12 pl-5 pr-1.5 text-[14.5px] gap-3';
  const dot = size === 'lg' ? 'h-10 w-10' : size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  return (
    <ActionLink
      action={action}
      onNavigate={onNavigate}
      aria-label={ariaLabel}
      className={`group inline-flex max-w-full items-center justify-between rounded-full font-medium whitespace-nowrap transition-colors duration-300 ${box} ${v.pill} ${className}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full ${dot} ${v.dot}`}>
        <ArrowUpRight className="h-[18px] w-[18px] transition-transform duration-500 ease-out group-hover:rotate-45" />
      </span>
    </ActionLink>
  );
}

/** Bulatan panah dekoratif (kartu): putih ber-panah tinta; saat kartu disorot berubah aksen. */
export function ArrowChip({ className = 'h-10 w-10', tone = 'white' }: { className?: string; tone?: 'white' | 'accent' | 'ink' }) {
  const color =
    tone === 'accent'
      ? 'bg-(--vl-red) text-(--vl-on-red)'
      : tone === 'ink'
        ? 'bg-[#0D0E10] text-white group-hover:bg-(--vl-red) group-hover:text-(--vl-on-red)'
        : 'bg-white text-[#0D0E10] group-hover:bg-(--vl-red) group-hover:text-(--vl-on-red)';
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${color} ${className}`}>
      <ArrowUpRight className="h-[45%] w-[45%] transition-transform duration-500 ease-out group-hover:rotate-45" />
    </span>
  );
}

/** Tautan teks kecil dengan panah ("Learn more →"). */
export function TextLink({ action, label, tone = 'light', className = '' }: { action: LinkAction | null; label: string; tone?: Tone; className?: string }) {
  if (!action || !label) return null;
  const color = tone === 'dark' ? 'text-white' : C.ink;
  return (
    <ActionLink action={action} className={`group inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold ${color} ${className}`}>
      <span className="underline decoration-current/30 underline-offset-4 transition-colors group-hover:decoration-current">{label}</span>
      <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" />
    </ActionLink>
  );
}

/** Ikon yang dipilih otomatis dari teks (lihat ./icons). Dekoratif. */
export function AutoIcon({ title, index = 0, className = 'h-5 w-5' }: { title: string; index?: number; className?: string }) {
  const Icon = ICONS[iconKey(title, index)];
  return <Icon className={className} aria-hidden strokeWidth={1.7} />;
}
