// Komponen kecil Lawatan: label "perangko" (bingkai putus-putus, cap pos mini, nomor 01), kepala section (label, H2
// Bricolage, satu kalimat pengantar), tombol pil + panah, tautan teks bergaris bawah, chip pilihan (radiogroup dengan
// radio bawaan), perangko harga berlubang, dan ikon "yang termasuk". Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import type { LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { PostmarkDot } from './scenes';
import { BTN, C, CHIP, GRID_GAP, LABEL, TEXT_LINK, TEXT_LINK_INV, TYPE } from './styles';

export type Tone = 'light' | 'dark';

/** Label perangko: cap pos mini + nomor + teks kapital dalam bingkai putus-putus 1px. Kosong → tidak dirender. */
export function StampTag({ label, number = '', tone = 'light', className = '' }: { label: string; number?: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  const dark = tone === 'dark';
  return (
    <p
      className={`inline-flex min-h-7 max-w-full items-center gap-2 rounded-[4px] border border-dashed px-2.5 py-1.5 ${LABEL} ${
        dark ? 'border-[#FBF6EE]/55 text-[#FBF6EE]' : `border-(--tpl-accent) ${C.accent}`
      } ${className}`}
    >
      <PostmarkDot className="h-3.5 w-3.5 shrink-0" />
      {number && (
        <>
          <span className="tabular-nums">{number}</span>
          <span aria-hidden className={dark ? 'text-[#FBF6EE]/60' : 'text-(--tpl-accent)'}>
            ·
          </span>
        </>
      )}
      {/* Label panjang di layar sempit (320px) turun baris, tidak terpotong "…" */}
      <span className="min-w-0 leading-[1.3] [overflow-wrap:anywhere]">{label}</span>
    </p>
  );
}

/**
 * Kepala section (SATU pola untuk semua section): label perangko + H2 di kolom 1-7, kalimat pengantar di kolom 9-12 rata
 * bawah (layar lebar); `stack` = bertumpuk. Judul kosong → H2 `sr-only` berisi `srTitle` (section tetap diawali satu H2).
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
  layout?: 'split' | 'stack';
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle && !srTitle) return null;
  const dark = tone === 'dark';
  const hidden = !title && srTitle ? <h2 className="sr-only">{srTitle}</h2> : null;
  const label = eyebrow && (
    <Reveal variant="fade">
      <StampTag label={eyebrow} number={number} tone={tone} />
    </Reveal>
  );
  const heading = title && (
    <Reveal as="h2" delay={80} className={`max-w-[18ch] ${dark ? 'text-[#FBF6EE]' : C.ink} ${TYPE.h2}`}>
      {title}
    </Reveal>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`max-w-[46ch] text-pretty ${TYPE.lead} ${dark ? C.onDarkMuted : C.muted}`}>
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
      {sub && <div className="min-w-0 @5xl:col-span-4 @5xl:col-start-9 @5xl:pb-1.5">{sub}</div>}
    </div>
  );
}

type Variant = 'primary' | 'ink' | 'cream' | 'outline';

/** Tombol pil + panah (bergeser 3px saat disorot). Tanpa label atau aksi → tidak dirender. */
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
      {arrow && <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-[3px]" />}
    </ActionLink>
  );
}

/** Tautan teks bergaris bawah; tautan keluar diberi panah serong, tautan di halaman panah kanan (`arrow={false}` → tanpa). */
export function TextLink({
  action,
  label,
  tone = 'light',
  arrow = true,
  icon,
  className = '',
}: {
  action: LinkAction | null;
  label: string;
  tone?: Tone;
  arrow?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  if (!action || !label) return null;
  const Icon = action.kind === 'external' ? ArrowUpRight : ArrowRight;
  return (
    <ActionLink action={action} className={`${tone === 'dark' ? TEXT_LINK_INV : TEXT_LINK} ${className}`}>
      {icon}
      {label}
      {arrow && <Icon aria-hidden className="h-4 w-4 shrink-0" />}
    </ActionLink>
  );
}

/**
 * Chip pilihan tunggal: role="radiogroup" berisi radio bawaan (panah kiri/kanan, Spasi) yang disembunyikan di dalam
 * label pil. `options` = [nilai, teks]; nilai '' boleh (mis. "Semua"). Tanpa pilihan → tidak dirender.
 */
export function ChoiceChips({
  name,
  label,
  options,
  value,
  onChange,
  className = '',
  chipClassName = '',
  labelledBy,
  errorId,
}: {
  name: string;
  /** Nama grup untuk pembaca layar (aria-label) bila tanpa `labelledBy` */
  label: string;
  options: readonly (readonly [value: string, text: string])[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  chipClassName?: string;
  /** id elemen judul grup (aria-labelledby) */
  labelledBy?: string;
  /** id pesan galat grup (aria-describedby + aria-invalid) bila pilihan wajib belum diisi */
  errorId?: string;
}) {
  if (options.length === 0) return null;
  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-describedby={errorId}
      aria-invalid={errorId ? true : undefined}
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {options.map(([optionValue, text]) => (
        <label key={`${optionValue}|${text}`} className={`${CHIP} ${chipClassName}`}>
          <input type="radio" name={name} value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)} className="sr-only" />
          {text}
        </label>
      ))}
    </div>
  );
}

/**
 * Perangko harga berlubang (topeng radial di ./lawatan.css `.lw-perf`): kertas putih bergerigi, panel warna tema, teks
 * "Mulai" / harga / satuan (kualifikasi "mulai … per orang" ≥ 11px: bagian dari salinan jujur, bukan hiasan). Teks memakai
 * --tpl-on-accent (otomatis tinta bila warna tema terang).
 */
export function PriceStamp({ price, unit = 'per orang', top = 'Mulai', className = '' }: { price: string; unit?: string; top?: string; className?: string }) {
  if (!price) return null;
  return (
    <span className={`lw-perf inline-block bg-white ${className}`}>
      <span className="flex flex-col items-center rounded-[2px] bg-(--tpl-accent) px-3.5 pb-2 pt-1.5 text-center text-(--tpl-on-accent)">
        <span className="text-[11px] font-semibold uppercase leading-tight tracking-[0.12em]">{top}</span>
        <span className={`${TYPE.money} whitespace-nowrap text-[20px] leading-[1.1]`}>{price}</span>
        <span className="text-[11.5px] font-medium leading-tight">{unit}</span>
      </span>
    </span>
  );
}

/** Ikon "yang termasuk" yang dipilih otomatis dari teks (lihat ./icons). Dekoratif. */
export function IncludeIcon({ title, className = 'h-4 w-4' }: { title: string; className?: string }) {
  const Icon = ICONS[iconKey(title)];
  return <Icon className={className} aria-hidden strokeWidth={1.7} />;
}
