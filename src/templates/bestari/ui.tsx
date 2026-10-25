// Komponen kecil Bestari: label section berpenomor bergaris tipis "● Profil sekolah ··· (01)" (referensi Lifestyle),
// judul dengan bagian miring berwarna (Bienes), kepala section, tombol pil + bulatan panah terpisah (Finovate), tautan
// teks "Selengkapnya →", dan ikon otomatis dari judul. Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { BTN, BTN_HOVER, C, EYEBROW, TYPE_B } from './styles';

export type Tone = 'light' | 'dark';

/**
 * Label section: garis tipis di atas, titik warna tema + label di kiri, nomor "(01)" di kanan. Nomor dekoratif
 * (aria-hidden). Tanpa label dan nomor → tidak dirender.
 */
export function SectionLabel({ label, number = '', tone = 'light', className = '' }: { label: string; number?: string; tone?: Tone; className?: string }) {
  if (!label && !number) return null;
  const dark = tone === 'dark';
  return (
    <div className={`flex items-center justify-between gap-4 border-t pt-4 ${dark ? 'border-white/15' : 'border-[#1C1917]/[0.12]'} ${className}`}>
      {label ? (
        <p className={`inline-flex min-w-0 items-center gap-2.5 ${EYEBROW} ${dark ? 'text-(--bs-bright)' : 'text-(--bs-ink)'}`}>
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
          <span className="min-w-0">{label}</span>
        </p>
      ) : (
        <span />
      )}
      {number && (
        <span aria-hidden className={`shrink-0 text-[13px] font-medium tabular-nums tracking-[0.04em] ${dark ? 'text-white/60' : C.faint}`}>
          ({number})
        </span>
      )}
    </div>
  );
}

/** Label pil kecil di tengah (referensi Finovate "SERVICES"). */
export function PillLabel({ children, number = '', tone = 'light' }: { children: ReactNode; number?: string; tone?: Tone }) {
  return (
    <p
      className={`inline-flex h-8 max-w-full items-center gap-2 rounded-full px-3.5 ${EYEBROW} ring-1 ring-inset ${
        tone === 'dark' ? 'text-(--bs-bright) ring-white/20' : 'bg-white text-(--bs-ink) ring-[#1C1917]/[0.1]'
      }`}
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      <span className="truncate">{children}</span>
      {number && (
        <span aria-hidden className={`tabular-nums ${tone === 'dark' ? 'text-white/60' : C.faint}`}>
          ({number})
        </span>
      )}
    </p>
  );
}

/** Bagian `highlight` per latar: putih → miring tinta tema (≥ 5:1); gelap → miring versi terang; foto → miring putih. */
const MARK = {
  light: 'italic text-(--bs-ink)',
  dark: 'italic text-(--bs-bright)',
  photo: 'italic text-white',
} as const;

/** Judul dengan bagian `highlight` dicetak miring berwarna (lihat MARK). */
export function Highlighted({ title, highlight, tone = 'light' }: { title: string; highlight: string; tone?: Tone | 'photo' }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <span className={`font-normal ${MARK[tone]}`}>{mark}</span>
      {after}
    </>
  );
}

/**
 * Kepala section. `split` = label bergaris penuh, lalu judul kiri & deskripsi/aside kanan (layar lebar); `stack` = label
 * lalu judul & deskripsi bertumpuk; `center` = label pil + judul + deskripsi terpusat (tanpa garis bernomor).
 */
export function SectionHead({
  eyebrow,
  number = '',
  title,
  highlight = '',
  subtitle = '',
  tone = 'light',
  layout = 'split',
  aside,
  className = '',
}: {
  eyebrow: string;
  number?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  tone?: Tone;
  layout?: 'split' | 'stack' | 'center';
  aside?: ReactNode;
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle && !aside) return null;
  const dark = tone === 'dark';
  const center = layout === 'center';
  const heading = title && (
    <Reveal
      as="h2"
      delay={80}
      className={`text-balance ${center ? 'mx-auto max-w-[20ch]' : 'max-w-[22ch]'} ${dark ? 'text-white' : C.ink} ${TYPE_B.h2}`}
    >
      <Highlighted title={title} highlight={highlight} tone={tone} />
    </Reveal>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`text-pretty ${center ? 'mx-auto' : ''} max-w-[54ch] ${TYPE_B.lead} ${dark ? 'text-white/75' : C.muted}`}>
      {subtitle}
    </Reveal>
  );

  if (center) {
    return (
      <div className={`text-center ${className}`}>
        {eyebrow && (
          <Reveal>
            <PillLabel tone={tone} number={number}>
              {eyebrow}
            </PillLabel>
          </Reveal>
        )}
        {heading && <div className={eyebrow ? 'mt-5' : ''}>{heading}</div>}
        {sub && <div className="mt-4">{sub}</div>}
        {aside && <div className="mt-6">{aside}</div>}
      </div>
    );
  }

  const label = (eyebrow || number) && (
    <Reveal variant="fade">
      <SectionLabel label={eyebrow} number={number} tone={tone} />
    </Reveal>
  );

  if (layout === 'split') {
    return (
      <div className={className}>
        {label}
        {(heading || sub || aside) && (
          <div className={`grid gap-5 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10 ${label ? 'mt-8 @3xl:mt-10' : ''}`}>
            <div className="min-w-0 @5xl:col-span-7">{heading}</div>
            {(sub || aside) && (
              <div className="flex min-w-0 flex-col gap-5 @5xl:col-span-5 @5xl:items-end @5xl:text-right">
                {sub}
                {aside}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={className}>
      {label}
      {heading && <div className={label ? 'mt-8 @3xl:mt-10' : ''}>{heading}</div>}
      {sub && <div className="mt-4">{sub}</div>}
      {aside && <div className="mt-6">{aside}</div>}
    </div>
  );
}

type Variant = keyof typeof BTN_HOVER;

/**
 * Tombol pil + bulatan panah TERPISAH di sampingnya (referensi Finovate). Satu tautan; saat disorot warna sedikit
 * berubah dan panah berputar pelan ke kanan. Tanpa label atau aksi → tidak dirender. `arrow={false}` → pil saja.
 */
export function PillLink({
  action,
  label,
  variant = 'primary',
  size = 'md',
  arrow = true,
  icon,
  className = '',
  onNavigate,
  ariaLabel,
}: {
  action: LinkAction | null;
  label: string;
  variant?: Variant;
  size?: 'md' | 'lg';
  arrow?: boolean;
  /** Ikon di kiri label (mis. WhatsApp) */
  icon?: ReactNode;
  className?: string;
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  if (!action || !label) return null;
  const tone = `${BTN[variant]} ${BTN_HOVER[variant]}`;
  const dot = size === 'lg' ? 'h-12 w-12' : 'h-11 w-11';
  return (
    <ActionLink action={action} onNavigate={onNavigate} aria-label={ariaLabel} className={`group inline-flex max-w-full items-center gap-1 rounded-full ${className}`}>
      <span className={`${tone} ${BTN[size]} min-w-0 flex-1`}>
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {arrow && (
        <span aria-hidden className={`${tone} ${dot} shrink-0`}>
          <ArrowUpRight className="h-[18px] w-[18px] transition-transform duration-500 ease-out group-hover:rotate-45" />
        </span>
      )}
    </ActionLink>
  );
}

/** Tautan teks kecil dengan panah ("Selengkapnya →"). */
export function TextLink({ action, label, tone = 'light', className = '' }: { action: LinkAction | null; label: string; tone?: Tone | 'inherit'; className?: string }) {
  if (!action || !label) return null;
  const color = tone === 'dark' ? 'text-white' : tone === 'inherit' ? 'text-current' : 'text-(--bs-ink)';
  return (
    <ActionLink action={action} className={`group inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold ${color} ${className}`}>
      <span className="underline decoration-current/30 underline-offset-4 transition-colors group-hover:decoration-current">{label}</span>
      <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" />
    </ActionLink>
  );
}

/** Ikon yang dipilih otomatis dari judul (lihat ./icons). Dekoratif. */
export function TitleIcon({ title, index = 0, className = 'h-5 w-5' }: { title: string; index?: number; className?: string }) {
  const Icon = ICONS[iconKey(title, index)];
  return <Icon className={className} aria-hidden strokeWidth={1.6} />;
}
