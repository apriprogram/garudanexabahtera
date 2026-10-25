// Komponen kecil Cakrawala: label section bergaris pendek, judul dengan bagian berwarna tema, kepala section, tombol
// pil + lingkaran panah (referensi CBRLP/MedixWeb), tautan teks "Selengkapnya →", dan ikon otomatis dari judul.
// Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { C, EYEBROW, TYPE_C } from './styles';

export type Tone = 'light' | 'dark';

/** Label kecil di atas judul: garis pendek + teks kapital berwarna tema (terang: tinta tema, gelap: versi terang). */
export function Eyebrow({ children, tone = 'light', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <p className={`inline-flex max-w-full items-center gap-2.5 ${EYEBROW} ${tone === 'dark' ? 'text-(--ck-bright)' : 'text-(--ck-ink)'} ${className}`}>
      <span aria-hidden className="h-[2px] w-6 shrink-0 rounded-full bg-current" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Bagian `highlight` per latar: putih → tinta tema (≥ 5:1); pita gelap → versi terang (≥ 5:1 di --ck-deep); foto
 *  hero → tetap putih dengan garis bawah tebal warna tema, karena warna terang di atas foto (lapisan gelap hanya
 *  sebagian) bisa turun di bawah 3:1 tergantung fotonya. */
const MARK = {
  light: 'text-(--ck-ink)',
  dark: 'text-(--ck-bright)',
  photo: 'text-white underline decoration-(--ck-bright) decoration-[length:0.08em] underline-offset-[0.14em] [text-decoration-skip-ink:none]',
} as const;

/** Judul dengan bagian `highlight` ditandai warna tema (lihat MARK). */
export function Highlighted({ title, highlight, tone = 'light' }: { title: string; highlight: string; tone?: Tone | 'photo' }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <span className={MARK[tone]}>{mark}</span>
      {after}
    </>
  );
}

/**
 * Kepala section: label, H2, deskripsi. `split` = judul kiri & deskripsi kanan (layar lebar), `stack` = bertumpuk rata
 * kiri, `center` = terpusat. `aside` = isi tambahan di kanan judul (mis. tombol filter).
 */
export function SectionHead({
  eyebrow,
  title,
  highlight = '',
  subtitle = '',
  tone = 'light',
  layout = 'split',
  aside,
  className = '',
}: {
  eyebrow: string;
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
  const heading = (
    <>
      {eyebrow && (
        <Reveal>
          <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
        </Reveal>
      )}
      {title && (
        <Reveal
          as="h2"
          delay={80}
          className={`${eyebrow ? 'mt-4' : ''} text-balance ${center ? 'mx-auto max-w-[22ch]' : 'max-w-[20ch]'} ${dark ? 'text-white' : C.ink} ${TYPE_C.h2}`}
        >
          <Highlighted title={title} highlight={highlight} tone={tone} />
        </Reveal>
      )}
    </>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`text-pretty ${center ? 'mx-auto' : ''} max-w-[56ch] ${TYPE_C.lead} ${dark ? 'text-white/75' : C.muted}`}>
      {subtitle}
    </Reveal>
  );

  if (layout === 'split') {
    return (
      <div className={`grid gap-5 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10 ${className}`}>
        <div className="min-w-0 @5xl:col-span-7">{heading}</div>
        {(sub || aside) && (
          <div className="flex min-w-0 flex-col gap-5 @5xl:col-span-5 @5xl:items-end @5xl:text-right">
            {sub}
            {aside}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`${center ? 'text-center' : ''} ${className}`}>
      {heading}
      {sub && <div className="mt-4">{sub}</div>}
      {aside && <div className="mt-6">{aside}</div>}
    </div>
  );
}

const DOT = {
  /** Lingkaran tema di tombol putih */
  accent: 'bg-(--tpl-accent) text-(--tpl-on-accent)',
  /** Lingkaran putih di tombol tinta / tema */
  white: 'bg-white text-[#0D1830]',
  /** Lingkaran tembus di tombol kaca / tema */
  soft: 'bg-white/[0.18] text-current',
  /** Lingkaran tinta di tombol bergaris */
  ink: 'bg-[#0D1830] text-white',
} as const;

/** Lingkaran panah (dekoratif). */
export function ArrowDot({ variant = 'accent', className = 'h-9 w-9' }: { variant?: keyof typeof DOT; className?: string }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full ${DOT[variant]} ${className}`}>
      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px" />
    </span>
  );
}

/** Tombol pil + lingkaran panah. Tanpa label atau aksi → tidak dirender. */
export function PillLink({
  action,
  label,
  className,
  dot = 'accent',
  icon,
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  className: string;
  dot?: keyof typeof DOT | 'none';
  /** Ikon di kiri label (mis. WhatsApp) */
  icon?: ReactNode;
  onNavigate?: () => void;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} className={`group ${className}`} onNavigate={onNavigate}>
      {icon}
      <span className="truncate">{label}</span>
      {dot !== 'none' && <ArrowDot variant={dot} />}
    </ActionLink>
  );
}

/** Tautan teks kecil dengan panah ("Selengkapnya →"). */
export function TextLink({ action, label, tone = 'light', className = '' }: { action: LinkAction | null; label: string; tone?: Tone; className?: string }) {
  if (!action || !label) return null;
  return (
    <ActionLink
      action={action}
      className={`group inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold ${tone === 'dark' ? 'text-white' : 'text-(--ck-ink)'} ${className}`}
    >
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

/** Kotak ikon bertint warna tema. */
export function IconBox({ title, index = 0, tone = 'light', className = 'h-11 w-11 rounded-[14px]' }: { title: string; index?: number; tone?: Tone; className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center ${tone === 'dark' ? 'bg-white/[0.08] text-(--ck-bright) ring-1 ring-inset ring-white/10' : 'bg-(--ck-tint) text-(--ck-ink)'} ${className}`}
    >
      <TitleIcon title={title} index={index} className="h-[22px] w-[22px]" />
    </span>
  );
}
