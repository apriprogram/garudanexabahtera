// Komponen kecil SpecialistPlus: label section ber-kode mono "▍SPX-02 · MCU", kepala section (label, lalu H2 di kolom
// 1-7 dan pengantar di kolom 9-12), judul dengan kata berwarna, tombol radius 6 + panah, tautan teks, chip label, dan
// ikon klinik/alat otomatis. Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { BTN, C, CHIP, GRID_GAP, MONO_LABEL, TEXT_LINK, TEXT_LINK_INV, TYPE_S } from './styles';

export type Tone = 'light' | 'dark';

/**
 * Label section: garis teal pendek, kode "SPX-02" (teal), titik tengah, label kapital mono. Kode & garis dekoratif
 * (kode tetap terbaca: bagian dari teks label). Label kosong → tidak dirender.
 */
export function SectionLabel({ label, code = '', tone = 'light', className = '' }: { label: string; code?: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  const dark = tone === 'dark';
  return (
    <p className={`flex min-w-0 items-center gap-2.5 ${MONO_LABEL} ${dark ? 'text-white/80' : C.muted} ${className}`}>
      <span aria-hidden className="h-[2px] w-6 shrink-0 bg-(--tpl-accent)" />
      {code && (
        <>
          <span className={`shrink-0 ${dark ? 'text-(--spx-bright)' : 'text-(--tpl-accent-ink)'}`}>{code}</span>
          <span aria-hidden>·</span>
        </>
      )}
      <span className="min-w-0 text-balance">{label}</span>
    </p>
  );
}

/** Judul dengan bagian `highlight` berwarna (teal tinta di putih, teal terang di navy). */
export function Highlighted({ title, highlight, tone = 'light' }: { title: string; highlight: string; tone?: Tone }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <span className={tone === 'dark' ? 'text-(--spx-bright)' : 'text-(--tpl-accent-ink)'}>{mark}</span>
      {after}
    </>
  );
}

/**
 * Kepala section. `split` = label, lalu H2 di kolom 1-7 & pengantar di kolom 9-12 rata bawah (layar lebar); `stack` =
 * bertumpuk. Judul kosong → H2 `sr-only` berisi `srTitle` (section tetap diawali satu H2). `aside` = isi kecil di kanan
 * (mis. tautan) di bawah pengantar.
 */
export function SectionHead({
  eyebrow,
  code = '',
  title,
  subtitle = '',
  srTitle = '',
  tone = 'light',
  layout = 'split',
  aside,
  className = '',
}: {
  eyebrow: string;
  code?: string;
  title: string;
  subtitle?: string;
  srTitle?: string;
  tone?: Tone;
  layout?: 'split' | 'stack';
  aside?: ReactNode;
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle && !srTitle) return null;
  const dark = tone === 'dark';
  const hidden = !title && srTitle ? <h2 className="sr-only">{srTitle}</h2> : null;
  const label = eyebrow && (
    <Reveal variant="fade">
      <SectionLabel label={eyebrow} code={code} tone={tone} />
    </Reveal>
  );
  const heading = title && (
    <Reveal as="h2" delay={80} className={`max-w-[20ch] ${dark ? 'text-white' : C.ink} ${TYPE_S.h2}`}>
      {title}
    </Reveal>
  );
  const sub = (subtitle || aside) && (
    <Reveal delay={160} className="min-w-0">
      {subtitle && <p className={`max-w-[46ch] text-pretty ${TYPE_S.lead} ${dark ? 'text-white/80' : C.muted}`}>{subtitle}</p>}
      {aside && <div className={subtitle ? 'mt-4' : ''}>{aside}</div>}
    </Reveal>
  );

  if (layout === 'stack') {
    return (
      <div className={className}>
        {label}
        {hidden}
        {heading && <div className={label ? 'mt-5 @3xl:mt-6' : ''}>{heading}</div>}
        {sub && <div className="mt-4">{sub}</div>}
      </div>
    );
  }
  return (
    <div className={className}>
      {label}
      {hidden}
      {(heading || sub) && (
        <div className={`grid gap-y-4 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP} ${label ? 'mt-5 @3xl:mt-6' : ''}`}>
          {heading && <div className="min-w-0 @5xl:col-span-7">{heading}</div>}
          {sub && <div className="min-w-0 @5xl:col-span-4 @5xl:col-start-9 @5xl:pb-1">{sub}</div>}
        </div>
      )}
    </div>
  );
}

type Variant = 'primary' | 'navy' | 'ghost' | 'outline';

/** Tombol radius 6 + panah (bergeser 2px saat disorot). Tanpa label atau aksi → tidak dirender. */
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
  icon?: ReactNode;
  arrow?: boolean;
  className?: string;
  onNavigate?: () => void;
  /** Nama aksesibel bila label sama untuk beberapa tombol (mis. "Pesan paket: Eksekutif") */
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

/** Tautan teks bergaris bawah; tautan keluar diberi panah serong. */
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

/** Daftar chip label (kondisi, tindakan). */
export function Chips({ items, label, tone = 'light', className = '' }: { items: string[]; label: string; tone?: Tone; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className={`${CHIP} ${tone === 'dark' ? 'bg-white/[0.08] text-white/85' : `bg-[#F2F6F8] ${C.ink}`}`}>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Ikon klinik/alat yang dipilih otomatis dari nama (lihat ./icons). Dekoratif. */
export function MedIcon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const Icon = ICONS[iconKey(name)];
  return <Icon className={className} aria-hidden strokeWidth={1.6} />;
}

