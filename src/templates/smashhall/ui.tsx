// Komponen kecil SmashHall: label section berikon kok, kepala section (label + H2 + pengantar di kiri, slot aksi di
// kanan bawah), judul dengan kata berwarna, tombol rounded-xl, tautan teks, dan ikon fasilitas otomatis. Ditulis di
// folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { ShuttleIcon } from './marks';
import { BTN, C, GRID_GAP, LABEL, TYPE_S } from './styles';

/** `photo` = teks di atas foto hero: terang di atas lapisan gelap (HP/tablet), gelap di atas lapisan putih (≥ 64rem). */
export type Tone = 'light' | 'dark' | 'photo';

/** Label hero HP: spasi huruf sedikit lebih rapat agar muat satu baris di layar 375–390 px (≥ 48rem kembali 0,14em). */
const LABEL_PHOTO = LABEL.replace('tracking-[0.14em]', 'tracking-[0.08em] @3xl:tracking-[0.14em]');

/** Label section: ikon kok (warna tema) + label kapital. Label kosong → tidak dirender. */
export function SectionLabel({ label, tone = 'light', className = '' }: { label: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  const text = tone === 'dark' ? 'text-white/75' : tone === 'photo' ? 'text-white/80 @5xl:text-[#5A564F]' : C.muted;
  const chip =
    tone === 'dark'
      ? 'bg-white/10 text-(--sh-bright)'
      : tone === 'photo'
        ? 'bg-white/[0.12] text-(--sh-bright) @5xl:bg-(--tpl-accent-50) @5xl:text-(--tpl-accent-ink)'
        : 'bg-(--tpl-accent-50) text-(--tpl-accent-ink)';
  return (
    <p className={`flex min-w-0 items-center gap-2.5 ${tone === 'photo' ? LABEL_PHOTO : LABEL} ${text} ${className}`}>
      <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${chip}`}>
        <ShuttleIcon className="h-4 w-4 rotate-[-30deg]" />
      </span>
      <span className="min-w-0 text-balance">{label}</span>
    </p>
  );
}

/** Judul dengan bagian `highlight` berwarna (tinta tema di terang, aksen terang di gelap). */
export function Highlighted({ title, highlight, tone = 'light' }: { title: string; highlight: string; tone?: Tone }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <span className={tone === 'dark' ? 'text-(--sh-bright)' : tone === 'photo' ? 'text-(--sh-bright) @5xl:text-(--tpl-accent-ink)' : 'text-(--tpl-accent-ink)'}>{mark}</span>
      {after}
    </>
  );
}

/**
 * Kepala section: label, H2, dan pengantar di kolom kiri (1-7); `aside` (tombol, pilihan periode, chip harga) di kolom
 * kanan rata bawah. Judul kosong → H2 `sr-only` berisi `srTitle` (section tetap diawali satu H2). Tanpa isi apa pun
 * dan tanpa `srTitle` → tidak dirender.
 */
export function SectionHead({
  eyebrow,
  title,
  subtitle = '',
  srTitle = '',
  tone = 'light',
  aside,
  className = '',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  srTitle?: string;
  tone?: Tone;
  aside?: ReactNode;
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle && !srTitle && !aside) return null;
  const dark = tone === 'dark';
  return (
    <div className={`grid gap-y-7 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP} ${className}`}>
      <div className="min-w-0 @5xl:col-span-7">
        {eyebrow && (
          <Reveal variant="fade">
            <SectionLabel label={eyebrow} tone={tone} />
          </Reveal>
        )}
        {title ? (
          <Reveal as="h2" delay={80} className={`max-w-[22ch] ${eyebrow ? 'mt-5' : ''} ${dark ? 'text-white' : C.ink} ${TYPE_S.h2}`}>
            {title}
          </Reveal>
        ) : (
          <h2 className="sr-only">{srTitle || eyebrow || subtitle}</h2>
        )}
        {subtitle && (
          <Reveal as="p" delay={160} className={`mt-4 max-w-[52ch] text-pretty ${TYPE_S.lead} ${dark ? 'text-white/75' : C.muted}`}>
            {subtitle}
          </Reveal>
        )}
      </div>
      {aside && (
        <Reveal delay={200} className="min-w-0 @5xl:col-span-5 @5xl:flex @5xl:justify-end">
          {aside}
        </Reveal>
      )}
    </div>
  );
}

type Variant = keyof Pick<typeof BTN, 'primary' | 'ghost' | 'ink' | 'ghostDark' | 'ghostPhoto'>;

/** Tombol rounded-xl (+ panah untuk tombol utama). Tanpa label atau aksi → tidak dirender. */
export function ButtonLink({
  action,
  label,
  variant = 'primary',
  size = 'lg',
  icon,
  arrow = variant === 'primary',
  className = '',
  onNavigate,
  ...rest
}: {
  action: LinkAction | null;
  label: string;
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: ReactNode;
  arrow?: boolean;
  className?: string;
  onNavigate?: () => void;
  'aria-label'?: string;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} onNavigate={onNavigate} aria-label={rest['aria-label']} className={`${BTN[variant]} ${BTN[size]} ${className}`}>
      {icon}
      <span className="truncate">{label}</span>
      {arrow && <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5" />}
    </ActionLink>
  );
}

/** Tautan teks bergaris bawah (area sentuh 44px); tautan keluar panah serong. */
export function TextLink({ action, label, tone = 'light', className = '' }: { action: LinkAction | null; label: string; tone?: Tone; className?: string }) {
  if (!action || !label) return null;
  const Icon = action.kind === 'external' ? ArrowUpRight : ArrowRight;
  const color =
    tone === 'dark'
      ? 'text-white decoration-white/50 hover:decoration-white'
      : `${C.ink} decoration-[#171512]/30 hover:text-(--tpl-accent-ink) hover:decoration-(--tpl-accent)`;
  return (
    <ActionLink
      action={action}
      className={`inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold underline decoration-1 underline-offset-[6px] transition-colors ${color} ${className}`}
    >
      {label}
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
    </ActionLink>
  );
}

/** Ikon fasilitas yang dipilih otomatis dari label (lihat ./icons). Dekoratif. */
export function AmenityIcon({ label, className = 'h-4 w-4' }: { label: string; className?: string }) {
  const Icon = ICONS[iconKey(label)];
  return <Icon className={className} aria-hidden strokeWidth={1.8} />;
}
