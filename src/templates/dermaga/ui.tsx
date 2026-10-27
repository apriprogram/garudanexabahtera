// Komponen kecil Dermaga: label section mono "01 / LAYANAN" dengan garis yang memanjang ke kanan, kepala section
// (label selebar wadah, lalu H2 di kolom 1-7 dan deskripsi di kolom 9-12), judul dengan kata berwarna, tombol persegi
// tajam + panah, tautan teks bergaris bawah, dan ikon layanan otomatis. Ditulis di folder ini (bukan dibagi dengan
// template lain).
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { BTN, C, GRID_GAP, MONO_LABEL, TEXT_LINK, TEXT_LINK_INV, TYPE_D } from './styles';

export type Tone = 'light' | 'dark';

/**
 * Label section: nomor (warna tema) / label kapital mono, lalu garis tipis yang memanjang ke kanan. Nomor & garis
 * dekoratif. Label kosong → tidak dirender (nomor ikut hilang; penomoran section lain melewatinya).
 */
export function SectionLabel({ label, number = '', tone = 'light', className = '' }: { label: string; number?: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  const dark = tone === 'dark';
  return (
    <p className={`flex min-w-0 items-center gap-3 ${MONO_LABEL} ${dark ? 'text-white/80' : C.muted} ${className}`}>
      {number && (
        <>
          <span className={dark ? 'text-(--dm-bright)' : 'text-(--tpl-accent-ink)'}>{number}</span>
          <span aria-hidden>/</span>
        </>
      )}
      <span className="min-w-0 truncate">{label}</span>
      <span aria-hidden className={`h-px min-w-8 flex-1 ${dark ? 'bg-white/20' : 'bg-[#0F1D20]/[0.14]'}`} />
    </p>
  );
}

/** Judul dengan bagian `highlight` berwarna (tinta tema di putih, versi terang di pita gelap). Tanpa miring/garis bawah. */
export function Highlighted({ title, highlight, tone = 'light' }: { title: string; highlight: string; tone?: Tone }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <span className={tone === 'dark' ? 'text-(--dm-bright)' : 'text-(--tpl-accent-ink)'}>{mark}</span>
      {after}
    </>
  );
}

/**
 * Kepala section. `split` = label selebar wadah, lalu H2 di kolom 1-7 & deskripsi di kolom 9-12 rata bawah (layar
 * lebar); `stack` = label, H2, deskripsi bertumpuk (untuk kolom sempit). Kosong semua → tidak dirender.
 */
export function SectionHead({
  eyebrow,
  number = '',
  title,
  subtitle = '',
  tone = 'light',
  layout = 'split',
  className = '',
}: {
  eyebrow: string;
  number?: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
  layout?: 'split' | 'stack';
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle) return null;
  const dark = tone === 'dark';
  const label = eyebrow && (
    <Reveal variant="fade">
      <SectionLabel label={eyebrow} number={number} tone={tone} />
    </Reveal>
  );
  const heading = title && (
    <Reveal as="h2" delay={80} className={`max-w-[22ch] ${dark ? 'text-white' : C.ink} ${TYPE_D.h2}`}>
      {title}
    </Reveal>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`max-w-[52ch] text-pretty ${TYPE_D.lead} ${dark ? 'text-white/80' : C.muted}`}>
      {subtitle}
    </Reveal>
  );

  if (layout === 'stack') {
    return (
      <div className={className}>
        {label}
        {heading && <div className={label ? 'mt-7 @3xl:mt-9' : ''}>{heading}</div>}
        {sub && <div className="mt-5">{sub}</div>}
      </div>
    );
  }
  return (
    <div className={className}>
      {label}
      {(heading || sub) && (
        <div className={`grid gap-y-5 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP} ${label ? 'mt-7 @3xl:mt-10' : ''}`}>
          {heading && <div className="min-w-0 @5xl:col-span-7">{heading}</div>}
          {sub && <div className="min-w-0 @5xl:col-span-4 @5xl:col-start-9">{sub}</div>}
        </div>
      )}
    </div>
  );
}

type Variant = 'primary' | 'ink' | 'white';

/** Tombol persegi tajam + panah (bergeser 2px saat disorot). Tanpa label atau aksi → tidak dirender. */
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

/**
 * Daftar sebaris dengan titik persegi kecil di antara item. Titik digambar ::before tiap item lalu digeser keluar
 * wadah (-ml + overflow-hidden), jadi saat terbungkus tidak ada titik menggantung di ujung atau awal baris. Titik tanpa
 * teks (tidak dibacakan pembaca layar).
 */
export function DotList({ items, label, className = '' }: { items: string[]; label?: string; className?: string }) {
  if (items.length === 0) return null;
  return (
    <div className={`overflow-hidden ${className}`}>
      <ul aria-label={label} className="-ml-[19px] flex flex-wrap gap-y-0.5">
        {items.map((item, i) => (
          <li
            key={`${item}-${i}`}
            className="flex items-center before:mx-2 before:h-[3px] before:w-[3px] before:shrink-0 before:bg-current before:opacity-60 before:content-['']"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ikon layanan yang dipilih otomatis dari judul (lihat ./icons). Dekoratif. */
export function ServiceIcon({ title, className = 'h-[22px] w-[22px]' }: { title: string; className?: string }) {
  const Icon = ICONS[iconKey(title)];
  return <Icon className={className} aria-hidden strokeWidth={1.5} />;
}
