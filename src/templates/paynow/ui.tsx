// Komponen kecil PayNow: label section bertitik gradasi, kepala section, judul dengan kata berwarna, tombol pil + ikon,
// tautan teks, ikon otomatis, bingkai HP dari CSS (ukuran em: satu komponen untuk HP besar di hero dan HP kecil di
// layar sempit), dan daftar centang. Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ArrowUpRight, BatteryFull, CircleCheck, Signal, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { ICONS, type IconKey } from './icons';
import { BTN, C, TEXT_LINK, TEXT_LINK_DARK, TYPE } from './styles';

export type Tone = 'light' | 'dark';

/** Label section: titik gradasi 8px + teks semibold (tinta tema di terang, glow di gelap). Kosong → tidak dirender. */
export function SectionLabel({ label, tone = 'light', className = '' }: { label: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  return (
    <p className={`flex min-w-0 items-center gap-2.5 text-[14px] font-semibold tracking-[0.01em] ${tone === 'dark' ? 'text-(--pn-glow)' : 'text-(--pn-ink)'} ${className}`}>
      <span aria-hidden className={`pn-grad h-2 w-2 shrink-0 rounded-full ${tone === 'dark' ? 'ring-2 ring-white/20' : ''}`} />
      <span className="min-w-0 text-balance">{label}</span>
    </p>
  );
}

/** Judul dengan bagian `highlight` berwarna (tinta tema di terang, glow di gelap). */
export function Highlighted({ title, highlight, tone = 'light' }: { title: string; highlight: string; tone?: Tone }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <span className={tone === 'dark' ? 'text-(--pn-glow)' : 'text-(--pn-ink)'}>{mark}</span>
      {after}
    </>
  );
}

/**
 * Kepala section: label, H2, deskripsi bertumpuk. Judul kosong → H2 `sr-only` berisi `srTitle` (section tetap
 * diawali satu H2). `center` untuk kepala di tengah.
 */
export function SectionHead({
  eyebrow,
  title,
  subtitle = '',
  srTitle,
  tone = 'light',
  center = false,
  className = '',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  srTitle: string;
  tone?: Tone;
  center?: boolean;
  className?: string;
}) {
  const dark = tone === 'dark';
  return (
    <div className={`${center ? 'mx-auto max-w-[44rem] text-center' : ''} ${className}`}>
      {eyebrow && (
        <Reveal variant="fade" className={center ? 'flex justify-center' : ''}>
          <SectionLabel label={eyebrow} tone={tone} />
        </Reveal>
      )}
      {title ? (
        <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-4' : ''} ${center ? 'mx-auto' : ''} max-w-[20ch] ${dark ? 'text-white' : C.ink} ${TYPE.h2}`}>
          {title}
        </Reveal>
      ) : (
        <h2 className="sr-only">{srTitle}</h2>
      )}
      {subtitle && (
        <Reveal as="p" delay={160} className={`mt-4 ${center ? 'mx-auto' : ''} max-w-[48ch] text-pretty ${TYPE.lead} ${dark ? 'text-white/75' : C.muted}`}>
          {subtitle}
        </Reveal>
      )}
    </div>
  );
}

type Variant = keyof Pick<typeof BTN, 'primary' | 'light' | 'ghost' | 'night' | 'outline'>;

/** Tombol pil dengan ikon di kiri (opsional). Tanpa label atau aksi → tidak dirender. */
export function ButtonLink({
  action,
  label,
  variant = 'primary',
  size = 'lg',
  icon,
  className = '',
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: ReactNode;
  className?: string;
  onNavigate?: () => void;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} onNavigate={onNavigate} className={`${BTN[variant]} ${BTN[size]} ${className}`}>
      {icon}
      <span className="truncate">{label}</span>
    </ActionLink>
  );
}

/** Tautan teks; tautan keluar diberi panah serong, tautan di halaman panah kanan. */
export function TextLink({ action, label, tone = 'light', className = '' }: { action: LinkAction | null; label: string; tone?: Tone; className?: string }) {
  if (!action || !label) return null;
  const Icon = action.kind === 'external' ? ArrowUpRight : ArrowRight;
  return (
    <ActionLink action={action} className={`${tone === 'dark' ? TEXT_LINK_DARK : TEXT_LINK} ${className}`}>
      {label}
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
    </ActionLink>
  );
}

/** Ikon otomatis (lihat ./icons). Dekoratif. */
export function AutoIcon({ name, className = 'h-5 w-5', strokeWidth = 1.8 }: { name: IconKey; className?: string; strokeWidth?: number }) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden strokeWidth={strokeWidth} />;
}

/** Daftar poin dengan ikon centang bergradasi. */
export function CheckList({ items, tone = 'light', className = '' }: { items: string[]; tone?: Tone; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={`grid gap-2.5 ${className}`}>
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className={`flex items-start gap-2.5 text-[15px] leading-snug ${tone === 'dark' ? 'text-white/85' : C.ink}`}>
          <CircleCheck aria-hidden className={`mt-px h-[18px] w-[18px] shrink-0 ${tone === 'dark' ? 'text-(--pn-glow)' : 'text-(--pn-ink)'}`} strokeWidth={2} />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Bingkai HP dari CSS (tanpa gambar). Semua ukuran dalam em, jadi skala diatur lewat font-size wadah: 16px = lebar
 * 300px. Layar putih-lavender dengan bilah status dekoratif. `children` = isi layar.
 */
export function PhoneFrame({ children, className = '', label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <figure aria-label={label} className={`relative w-[18.75em] rounded-[2.75em] bg-[#0B0A24] p-[0.6em] ring-1 ring-white/15 ${className}`}>
      <div className="relative h-[38em] overflow-hidden rounded-[2.2em] bg-(--pn-mist)">
        <div aria-hidden className="flex h-[2.4em] items-center justify-between px-[1.6em] pt-[0.3em] text-[0.72em] font-semibold text-[#0E0F2C]">
          <span className="tabular-nums">09.41</span>
          <span className="absolute left-1/2 top-[0.55em] h-[1.35em] w-[5.6em] -translate-x-1/2 rounded-full bg-[#0B0A24]" />
          <span className="flex items-center gap-[0.35em]">
            <Signal className="h-[1.1em] w-[1.1em]" strokeWidth={2.4} />
            <Wifi className="h-[1.1em] w-[1.1em]" strokeWidth={2.4} />
            <BatteryFull className="h-[1.2em] w-[1.2em]" strokeWidth={2} />
          </span>
        </div>
        {children}
      </div>
    </figure>
  );
}
