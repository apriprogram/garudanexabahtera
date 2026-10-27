// Komponen kecil NusaNiaga: label berbingkai "IMPOR", judul dengan bagian berwarna aksen, kepala section (judul kiri 7
// kolom, deskripsi kanan 5 kolom), tombol pil bertitik, tautan teks berpanah, dan ikon otomatis dari judul. Ditulis di
// folder ini (bukan dibagi dengan template lain).
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { BTN, C, DOT, DOT_TONE, TAG, TAG_BAND, TYPE_N } from './styles';

export type Tone = 'light' | 'band';

/** Label section berbingkai (teks dari `eyebrow`, tampil kapital). Kosong → tidak dirender. Bukan heading. */
export function Tag({ children, tone = 'light', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  if (!children) return null;
  return <p className={`${tone === 'band' ? TAG_BAND : TAG} ${className}`}>{children}</p>;
}

/** Judul dengan bagian `highlight` berwarna tinta aksen (bobot sama, tanpa miring/garis bawah). */
export function Highlighted({ title, highlight }: { title: string; highlight: string }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <span className="text-(--nn-ink)">{mark}</span>
      {after}
    </>
  );
}

/**
 * Kepala section. `split` = label + judul di 7 kolom kiri, deskripsi/aside di 5 kolom kanan rata bawah (layar lebar);
 * `stack` = semuanya bertumpuk. Judul kosong → H2 tersembunyi `srTitle` agar setiap section tetap diawali satu H2.
 */
export function SectionHead({
  eyebrow,
  title,
  srTitle,
  subtitle = '',
  aside,
  tone = 'light',
  layout = 'split',
  className = '',
}: {
  eyebrow: string;
  title: string;
  srTitle: string;
  subtitle?: string;
  aside?: ReactNode;
  tone?: Tone;
  layout?: 'split' | 'stack';
  className?: string;
}) {
  const band = tone === 'band';
  const tagEl = eyebrow && (
    <Reveal variant="fade">
      <Tag tone={tone}>{eyebrow}</Tag>
    </Reveal>
  );
  const heading = title ? (
    <Reveal as="h2" delay={80} className={`max-w-[22ch] ${band ? 'text-(--tpl-on-accent)' : C.ink} ${TYPE_N.h2} ${eyebrow ? 'mt-5' : ''}`}>
      {title}
    </Reveal>
  ) : (
    <h2 className="sr-only">{srTitle}</h2>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={160} className={`max-w-[60ch] text-pretty ${TYPE_N.lead} ${band ? 'text-(--tpl-on-accent)' : C.muted}`}>
      {subtitle}
    </Reveal>
  );

  if (layout === 'split' && (sub || aside)) {
    return (
      <div className={`grid gap-y-5 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-x-8 @7xl:gap-x-12 ${className}`}>
        <div className="min-w-0 @5xl:col-span-7">
          {tagEl}
          {heading}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-5 @5xl:col-span-5 @5xl:pb-1.5">
          {sub}
          {aside}
        </div>
      </div>
    );
  }
  return (
    <div className={className}>
      {tagEl}
      {heading}
      {sub && <div className="mt-5">{sub}</div>}
      {aside && <div className="mt-6">{aside}</div>}
    </div>
  );
}

type Variant = keyof typeof DOT_TONE;

/** Tombol pil dengan titik di depan label (titik membesar saat disorot). Tanpa label atau aksi → tidak dirender. */
export function PillLink({
  action,
  label,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  variant?: Variant;
  size?: 'md' | 'lg';
  /** Pengganti titik (mis. ikon WhatsApp) */
  icon?: ReactNode;
  className?: string;
  onNavigate?: () => void;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} onNavigate={onNavigate} className={`${BTN[variant]} ${BTN[size]} ${className}`}>
      {icon ?? <span aria-hidden className={`${DOT} ${DOT_TONE[variant]}`} />}
      <span className="truncate">{label}</span>
    </ActionLink>
  );
}

/** Tautan teks berpanah ("Tanya lewat WhatsApp →"). */
export function TextLink({ action, label, className = '' }: { action: LinkAction | null; label: string; className?: string }) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} className={`group inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-(--nn-ink) ${className}`}>
      <span className="underline decoration-current/30 underline-offset-[5px] transition-colors group-hover:decoration-current">{label}</span>
      <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
    </ActionLink>
  );
}

/** Garis tipis DI ATAS foto (ring wadah tertutup <img>): tepi foto terang tetap tegas di latar putih. Dekoratif. */
export function PhotoRing() {
  return <span aria-hidden className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] ring-1 ring-inset ring-[#141821]/[0.07]" />;
}

/** Ikon yang dipilih otomatis dari judul (lihat ./icons). Dekoratif. */
export function TitleIcon({ title, className = 'h-[22px] w-[22px]' }: { title: string; className?: string }) {
  const Icon = ICONS[iconKey(title)];
  return <Icon className={className} aria-hidden strokeWidth={1.75} />;
}
