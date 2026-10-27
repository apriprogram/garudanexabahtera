// Komponen kecil Nawasena: label section mono "/02 — Profil", kepala section (label + H2 serif + deskripsi), tombol
// persegi radius 6, tautan teks dengan garis bawah yang memanjang saat disorot (.nw-link), ikon ekstrakurikuler
// otomatis, dan nama bergelar yang gelarnya tidak dipenggal. Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import type { LinkAction } from '../shared/utils';
import { CLUB_ICONS, clubIconKey } from './icons';
import { degreeSplit } from './model';
import { BTN, C, TYPE_N } from './styles';

export type Tone = 'light' | 'navy';

/** Label section mono: nomor tema (hiasan, aria-hidden) + "— label". Tanpa label dan nomor → tidak dirender. */
export function SectionLabel({ label, number = '', tone = 'light', className = '' }: { label: string; number?: string; tone?: Tone; className?: string }) {
  if (!label && !number) return null;
  const navy = tone === 'navy';
  return (
    <p className={`${TYPE_N.mono} flex flex-wrap items-baseline gap-x-2 ${className}`}>
      {number && (
        <span aria-hidden className={navy ? 'text-(--nw-bright)' : 'text-(--nw-ink)'}>
          /{number}
        </span>
      )}
      {label && <span className={navy ? 'text-white/[0.72]' : C.muted}>{number ? `— ${label}` : label}</span>}
    </p>
  );
}

/**
 * Kepala section. `split` = label + judul kiri (7 kolom), deskripsi/aside kanan (5 kolom) di layar lebar; `stack` =
 * label, judul, deskripsi bertumpuk. Satu H2 per section.
 */
export function SectionHead({
  eyebrow,
  number = '',
  title,
  subtitle = '',
  tone = 'light',
  layout = 'split',
  size = 'lg',
  aside,
  className = '',
}: {
  eyebrow: string;
  number?: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
  layout?: 'split' | 'stack';
  /** lg = H2 section biasa; md = kolom berdampingan (pengumuman & agenda) */
  size?: 'lg' | 'md';
  aside?: ReactNode;
  className?: string;
}) {
  if (!eyebrow && !number && !title && !subtitle && !aside) return null;
  const navy = tone === 'navy';
  const label = (eyebrow || number) && (
    <Reveal variant="fade">
      <SectionLabel label={eyebrow} number={number} tone={tone} />
    </Reveal>
  );
  const heading = title && (
    <Reveal as="h2" delay={80} className={`max-w-[24ch] text-balance ${navy ? 'text-white' : C.navy} ${size === 'md' ? TYPE_N.h2Mid : TYPE_N.h2} ${label ? 'mt-4' : ''}`}>
      {title}
    </Reveal>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`max-w-[58ch] text-pretty ${TYPE_N.lead} ${navy ? 'text-white/[0.86]' : C.body}`}>
      {subtitle}
    </Reveal>
  );

  if (layout === 'split') {
    return (
      <div className={`grid gap-5 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-8 @7xl:gap-12 ${className}`}>
        <div className="min-w-0 @5xl:col-span-7">
          {label}
          {heading}
        </div>
        {(sub || aside) && (
          // Kolom kanan selebar sel (bukan selebar isi): aside lebar (mis. rel filter yang bisa digeser) tetap di dalam
          // kolom dan menggulir sendiri, bukan melebar keluar halaman; di layar lebar rata kanan
          <div className="flex min-w-0 flex-col gap-5 @5xl:col-span-5">
            {sub}
            {aside && <div className="flex min-w-0 max-w-full @5xl:justify-end">{aside}</div>}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={className}>
      {label}
      {heading}
      {sub && <div className="mt-4">{sub}</div>}
      {aside && <div className="mt-6">{aside}</div>}
    </div>
  );
}

/** Tombol persegi radius 6 sebagai tautan. Tanpa label atau aksi → tidak dirender. */
export function ButtonLink({
  action,
  label,
  variant = 'primary',
  size = 'md',
  icon,
  trailing,
  className = '',
  onNavigate,
  ariaLabel,
}: {
  action: LinkAction | null;
  label: string;
  variant?: 'primary' | 'outlineWhite' | 'outline';
  size?: 'lg' | 'md' | 'sm';
  /** Ikon di kiri label (mis. WhatsApp) */
  icon?: ReactNode;
  /** Ikon di kanan label (mis. panah keluar) */
  trailing?: ReactNode;
  className?: string;
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} onNavigate={onNavigate} aria-label={ariaLabel} className={`${BTN[variant]} ${BTN[size]} ${className}`}>
      {icon}
      <span className="truncate">{label}</span>
      {trailing}
    </ActionLink>
  );
}

/** Tautan teks dengan panah; garis bawah 28px memanjang penuh saat disorot/difokus (.nw-link di nawasena.css). */
export function TextLink({
  action,
  label,
  tone = 'light',
  className = '',
  ariaLabel,
  icon,
}: {
  action: LinkAction | null;
  label: string;
  tone?: Tone;
  className?: string;
  ariaLabel?: string;
  /** Ikon pengganti panah di kanan */
  icon?: ReactNode;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink
      action={action}
      aria-label={ariaLabel}
      className={`nw-link group inline-flex min-h-11 items-center gap-1.5 text-[14.5px] font-semibold ${tone === 'navy' ? 'text-white' : 'text-(--nw-ink)'} ${className}`}
    >
      <span className="nw-underline">{label}</span>
      {icon ?? <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" />}
    </ActionLink>
  );
}

/** Ikon ekstrakurikuler yang dipilih otomatis dari nama (lihat ./icons). Dekoratif. */
export function ClubIcon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const Icon = CLUB_ICONS[clubIconKey(name)];
  return <Icon className={className} aria-hidden strokeWidth={1.6} />;
}

/**
 * Nama bergelar: kata terakhir nama + gelar dalam satu kotak sebaris (inline-block), jadi turun ke baris berikut
 * bersama-sama dan gelar tidak tertinggal sendirian. Kotak yang lebih lebar dari kartu tetap membungkus di dalamnya
 * (tidak meluber). Teks tetap sama.
 */
export function PersonName({ name }: { name: string }) {
  const split = degreeSplit(name);
  if (!split) return <>{name}</>;
  return (
    <>
      {split[0]}
      <span className="inline-block">{split[1]}</span>
    </>
  );
}
