// Komponen kecil Madani: label bertitik, kepala section (label + H2 + deskripsi), judul dengan kata sorotan, tombol pil
// + lingkaran panah, chip label, dan ikon otomatis dari judul. Ditulis di folder ini (tidak dibagi dengan template lain).
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { ARROW, BTN, C, TYPE_M } from './styles';

type Tone = 'light' | 'dark';

/** Label kecil di atas judul: titik warna tema (sorotan di latar gelap) + huruf kapital berjarak. */
export function Eyebrow({ children, tone = 'light', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <p
      className={`inline-flex items-center gap-2 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] ${
        tone === 'dark' ? 'text-white/80' : 'text-(--md-ink)'
      } ${className}`}
    >
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${tone === 'dark' ? 'bg-(--md-hl)' : 'bg-(--md-primary)'}`} />
      {children}
    </p>
  );
}

/** Judul dengan kata sorotan: di latar gelap/foto = warna sorotan; di latar terang = warna tema + garis sorotan. */
export function Highlighted({ title, highlight, tone }: { title: string; highlight: string; tone: Tone }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <span className={tone === 'dark' ? 'text-(--md-hl-ink)' : 'md-mark text-(--md-ink)'}>{mark}</span>
      {after}
    </>
  );
}

/**
 * Kepala section: label + H2 (+ kata sorotan) di kiri, deskripsi (dan isi `aside`) di kanan pada layar lebar.
 * `center` = terpusat. Tanpa judul → hanya label/deskripsi yang ada.
 */
export function SectionHead({
  eyebrow,
  title,
  highlight = '',
  subtitle = '',
  tone = 'light',
  center = false,
  aside,
  id,
  className = '',
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  tone?: Tone;
  center?: boolean;
  aside?: ReactNode;
  id?: string;
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle && !aside) return null;
  const dark = tone === 'dark';
  const sub = subtitle ? <p className={`max-w-[52ch] text-pretty ${TYPE_M.lead} ${dark ? 'text-white/80' : C.muted}`}>{subtitle}</p> : null;
  if (center) {
    return (
      <div className={`mx-auto max-w-[760px] text-center ${className}`}>
        {eyebrow && (
          <Reveal>
            <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
          </Reveal>
        )}
        {title && (
          <Reveal as="h2" delay={60} id={id} className={`${eyebrow ? 'mt-4' : ''} text-balance ${dark ? 'text-white' : 'text-(--md-deep)'} ${TYPE_M.h2}`}>
            <Highlighted title={title} highlight={highlight} tone={tone} />
          </Reveal>
        )}
        {sub && (
          <Reveal delay={120} className="mx-auto mt-4 flex justify-center">
            {sub}
          </Reveal>
        )}
      </div>
    );
  }
  return (
    <div className={`grid gap-5 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10 ${className}`}>
      <div className="min-w-0 @5xl:col-span-7">
        {eyebrow && (
          <Reveal>
            <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
          </Reveal>
        )}
        {title && (
          <Reveal as="h2" delay={60} id={id} className={`${eyebrow ? 'mt-4' : ''} max-w-[22ch] text-balance ${dark ? 'text-white' : 'text-(--md-deep)'} ${TYPE_M.h2}`}>
            <Highlighted title={title} highlight={highlight} tone={tone} />
          </Reveal>
        )}
      </div>
      {(sub || aside) && (
        <Reveal delay={120} className="min-w-0 @5xl:col-span-5 @5xl:justify-self-end">
          {sub}
          {aside}
        </Reveal>
      )}
    </div>
  );
}

/** Tombol pil + lingkaran panah (Finovate). Tanpa label atau aksi → tidak dirender. */
export function ArrowLink({
  action,
  label,
  variant = 'hl',
  size = 'lg',
  className = '',
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  variant?: keyof typeof ARROW;
  size?: 'md' | 'lg';
  className?: string;
  onNavigate?: () => void;
}) {
  if (!action || !label) return null;
  const circle = size === 'lg' ? 'h-9 w-9' : 'h-8 w-8';
  return (
    <ActionLink action={action} onNavigate={onNavigate} className={`${BTN[variant]} ${BTN[size]} pl-5 pr-1.5 ${className}`}>
      <span className="truncate">{label}</span>
      <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-45 ${circle} ${ARROW[variant]}`}>
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </ActionLink>
  );
}

/** Chip label kecil (kategori, tingkat, status). */
export function Chip({ children, tone = 'line', className = '' }: { children: ReactNode; tone?: 'line' | 'tint' | 'hl' | 'dark' | 'glass'; className?: string }) {
  const tones = {
    line: 'bg-white text-(--md-deep) ring-1 ring-inset ring-black/[0.1]',
    tint: 'bg-(--md-tint) text-(--md-ink)',
    hl: 'bg-(--md-hl) text-(--md-on-hl)',
    dark: 'bg-white/[0.1] text-white ring-1 ring-inset ring-white/20',
    glass: 'bg-white/90 text-(--md-deep)',
  } as const;
  return (
    <span className={`inline-flex h-7 max-w-full items-center rounded-full px-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] ${tones[tone]} ${className}`}>
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Ikon yang dipilih otomatis dari judul (lihat ./icons). Dekoratif. */
export function TitleIcon({ title, index = 0, className = 'h-5 w-5' }: { title: string; index?: number; className?: string }) {
  const Icon = ICONS[iconKey(title, index)];
  return <Icon className={className} aria-hidden />;
}

/** Ikon dalam lingkaran (tint warna tema, atau sorotan di latar gelap). */
export function IconBadge({ title, index = 0, tone = 'tint', className = 'h-11 w-11' }: { title: string; index?: number; tone?: 'tint' | 'hl' | 'white' | 'dark'; className?: string }) {
  const tones = {
    tint: 'bg-(--md-tint) text-(--md-ink)',
    hl: 'bg-(--md-hl) text-(--md-on-hl)',
    white: 'bg-white text-(--md-ink)',
    dark: 'bg-(--md-deep) text-(--md-hl-ink)',
  } as const;
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full ${tones[tone]} ${className}`}>
      <TitleIcon title={title} index={index} className="h-5 w-5" />
    </span>
  );
}
