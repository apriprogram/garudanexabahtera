// Komponen kecil Sparring Padel: label section mono "// JADWAL", kepala section (label, H2 Saira dengan satu kata
// miring berwarna, deskripsi), tombol pil (Book Now neon dengan panah di lingkaran gelap), tautan teks, dan ikon ubin
// sewa. Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ArrowUpRight, Footprints, GlassWater, GraduationCap, Shirt, ShoppingBag, Users } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { iconKey, type IconKey } from './icons';
import { BallIcon, RacketIcon } from './marks';
import { BTN, C, MONO_LABEL, TEXT_LINK, TEXT_LINK_INV, TYPE } from './styles';

export type Tone = 'light' | 'dark';

/** Label section "// JADWAL": garis miring warna tema (neon di gelap, tinta tema di terang), label kapital mono. */
export function SectionLabel({ label, tone = 'light', className = '' }: { label: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  const dark = tone === 'dark';
  return (
    <p className={`flex min-w-0 items-center gap-2 ${MONO_LABEL} ${dark ? 'text-white/80' : C.muted} ${className}`}>
      <span aria-hidden className={`font-semibold ${dark ? 'text-(--sp-neon)' : 'text-(--sp-ink)'}`}>
        {'//'}
      </span>
      <span className="min-w-0 text-balance">{label}</span>
    </p>
  );
}

/** Judul dengan bagian `highlight` miring berwarna (tinta tema di terang, neon di gelap). */
export function Highlighted({ title, highlight, tone = 'light' }: { title: string; highlight: string; tone?: Tone }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <em className={`italic ${tone === 'dark' ? 'text-(--sp-neon)' : 'text-(--sp-ink)'}`}>{mark}</em>
      {after}
    </>
  );
}

/**
 * Kepala section: label, H2, deskripsi bertumpuk. Judul kosong → H2 `sr-only` berisi `srTitle` (section tetap diawali
 * satu H2 sebelum H3 kartu/baris di bawahnya). Kosong semua tanpa `srTitle` → tidak dirender.
 */
export function SectionHead({
  eyebrow,
  title,
  highlight = '',
  subtitle = '',
  srTitle = '',
  tone = 'light',
  className = '',
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  /** Teks H2 tersembunyi untuk pembaca layar bila `title` kosong */
  srTitle?: string;
  tone?: Tone;
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle && !srTitle) return null;
  const dark = tone === 'dark';
  return (
    <div className={className}>
      {eyebrow && (
        <Reveal variant="fade">
          <SectionLabel label={eyebrow} tone={tone} />
        </Reveal>
      )}
      {!title && srTitle && <h2 className="sr-only">{srTitle}</h2>}
      {title && (
        <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-4 @3xl:mt-5' : ''} max-w-[20ch] ${dark ? 'text-white' : C.ink} ${TYPE.h2}`}>
          <Highlighted title={title} highlight={highlight} tone={tone} />
        </Reveal>
      )}
      {subtitle && (
        <Reveal as="p" delay={160} className={`mt-4 max-w-[46ch] text-pretty ${TYPE.lead} ${dark ? 'text-white/75' : C.muted}`}>
          {subtitle}
        </Reveal>
      )}
    </div>
  );
}

type Variant = 'neon' | 'white' | 'ghost' | 'ink' | 'outline';

/** Panah Book Now: lingkaran biru-malam dengan panah neon, bergeser 2px saat disorot. */
export function ArrowDot({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-(--sp-night) text-(--sp-neon) ${className}`}>
      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-0.5" strokeWidth={2.25} />
    </span>
  );
}

/** Tombol pil. `xl` neon = Book Now besar dengan panah di lingkaran; lainnya panah biasa. Tanpa label/aksi → null. */
export function ButtonLink({
  action,
  label,
  variant = 'ink',
  size = 'md',
  icon,
  arrow = true,
  className = '',
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  variant?: Variant;
  size?: 'sm' | 'md' | 'xl';
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
      {arrow &&
        (size === 'xl' ? (
          <ArrowDot />
        ) : (
          <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
        ))}
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
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
    </ActionLink>
  );
}

const RENTAL_ICONS: Record<IconKey, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  racket: RacketIcon,
  ball: BallIcon,
  shoe: Footprints,
  coach: GraduationCap,
  class: Users,
  shirt: Shirt,
  drink: GlassWater,
  bag: ShoppingBag,
};

/** Ikon ubin sewa yang dipilih otomatis dari nama (lihat ./icons). Dekoratif. */
export function RentalIcon({ name, className = 'h-6 w-6' }: { name: string; className?: string }) {
  const Icon = RENTAL_ICONS[iconKey(name)];
  return <Icon className={className} aria-hidden />;
}
