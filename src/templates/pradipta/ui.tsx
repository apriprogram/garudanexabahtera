// Komponen kecil Pradipta: label section berupa pil membulat berikon, kepala section (satu H2), tombol pil dengan
// bulatan panah DI DALAM pil (dua panah bergantian saat disorot), tautan teks, ikon otomatis dari teks, inisial
// (tanpa gelar akademik), dan nama bergelar yang gelarnya tidak dipenggal.
// Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { initials, type LinkAction } from '../shared/utils';
import { ICONS, SECTION_ICONS, iconKey } from './icons';
import { degreeSplit } from './model';
import { BTN, BTN_DOT, C, DISPLAY, TAG, TAG_BG, TYPE_P, type BtnVariant, type Tone } from './styles';

/** Label section: pil membulat dengan ikon kecil per section. Tanpa label → tidak dirender. */
export function SectionTag({ sectionKey, label, tone = 'white', className = '' }: { sectionKey: string; label: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  const Icon = SECTION_ICONS[sectionKey] ?? ICONS.sparkles;
  return (
    <p className={`${TAG} ${TAG_BG[tone]} ${className}`}>
      <Icon className="h-[15px] w-[15px] shrink-0" aria-hidden strokeWidth={2} />
      <span className="truncate">{label}</span>
    </p>
  );
}

/**
 * Kepala section: label pil + SATU H2 (+ deskripsi dan `aside`, mis. tombol filter). `split` = judul kiri 7 kolom,
 * deskripsi/aside kanan 5 kolom rata bawah (layar lebar); `stack` = bertumpuk. Judul kosong → H2 tetap ada untuk
 * pembaca layar (`fallback`, sr-only).
 */
export function Head({
  sectionKey,
  eyebrow,
  title,
  fallback,
  subtitle = '',
  tone = 'white',
  layout = 'split',
  aside,
  subtitleRight = false,
  className = '',
}: {
  sectionKey: string;
  eyebrow: string;
  title: string;
  fallback: string;
  subtitle?: string;
  tone?: Tone;
  layout?: 'split' | 'stack';
  aside?: ReactNode;
  /** Deskripsi tetap di kolom kanan bersama `aside` */
  subtitleRight?: boolean;
  className?: string;
}) {
  const tag = eyebrow && (
    <Reveal variant="fade">
      <SectionTag sectionKey={sectionKey} label={eyebrow} tone={tone} />
    </Reveal>
  );
  const heading = title ? (
    <Reveal as="h2" delay={60} className={`${eyebrow ? 'mt-4' : ''} max-w-[24ch] text-balance ${C.ink} ${TYPE_P.h2}`}>
      {title}
    </Reveal>
  ) : (
    <h2 className="sr-only">{fallback}</h2>
  );
  const sub = subtitle && (
    <Reveal as="p" delay={120} className={`max-w-[60ch] text-pretty ${C.body} ${TYPE_P.lead}`}>
      {subtitle}
    </Reveal>
  );
  if (layout === 'stack') {
    return (
      <div className={className}>
        {tag}
        {heading}
        {sub && <div className="mt-4">{sub}</div>}
        {aside && <div className="mt-6">{aside}</div>}
      </div>
    );
  }
  // Ada `aside` (tombol filter/geser): deskripsi ikut di bawah judul (kiri), kecuali `subtitleRight`
  const subLeft = !!aside && !subtitleRight;
  return (
    <div className={`grid gap-5 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10 ${className}`}>
      <div className="min-w-0 @5xl:col-span-7">
        {tag}
        {heading}
        {sub && subLeft && <div className="mt-4">{sub}</div>}
      </div>
      {((sub && !subLeft) || aside) && (
        <div className="flex min-w-0 flex-col gap-5 @5xl:col-span-5 @5xl:items-end">
          {/* Rata kiri di blok yang menempel ke kanan: paragraf banyak baris tetap enak dibaca */}
          {sub && !subLeft && <div className="@5xl:max-w-[34rem]">{sub}</div>}
          {aside}
        </div>
      )}
    </div>
  );
}

/** Bulatan panah di ujung kanan tombol pil: dua panah bertumpuk, yang kedua masuk dari kiri saat disorot. */
export function ArrowDot({ variant = 'primary', size = 'md', external = false }: { variant?: BtnVariant; size?: 'md' | 'lg'; external?: boolean }) {
  return (
    <span aria-hidden className={`pd-arrows relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ${BTN_DOT[variant]} ${BTN_DOT[size]}`}>
      {external ? (
        <ExternalLink className="h-4 w-4" strokeWidth={2.2} />
      ) : (
        <>
          <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          <ArrowRight className="absolute h-4 w-4" strokeWidth={2.2} />
        </>
      )}
    </span>
  );
}

/** Tombol pil (tautan) + bulatan panah di dalamnya. Tanpa label atau aksi → tidak dirender. */
export function PillLink({
  action,
  label,
  variant = 'primary',
  size = 'md',
  icon,
  external = false,
  className = '',
  onNavigate,
  ariaLabel,
}: {
  action: LinkAction | null;
  label: string;
  variant?: BtnVariant;
  size?: 'md' | 'lg';
  /** Ikon di kiri label (mis. WhatsApp) */
  icon?: ReactNode;
  /** Tautan keluar ke situs lain (ikon panah keluar) */
  external?: boolean;
  className?: string;
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} onNavigate={onNavigate} aria-label={ariaLabel} className={`${BTN[variant]} ${BTN[size]} ${className}`}>
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <ArrowDot variant={variant} size={size} external={external} />
    </ActionLink>
  );
}

/** Tautan teks kecil berwarna tema dengan panah yang bergeser 3px saat disorot. */
export function TextLink({ action, label, className = '' }: { action: LinkAction | null; label: string; className?: string }) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} className={`pd-textlink group inline-flex min-h-11 items-center gap-1.5 text-[14.5px] font-semibold text-(--pd-ink) ${className}`}>
      <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">{label}</span>
      <ArrowRight aria-hidden className="pd-nudge h-4 w-4 shrink-0" />
    </ActionLink>
  );
}

/** Ikon yang dipilih otomatis dari teks (lihat ./icons). Dekoratif. */
export function TitleIcon({ title, index = 0, className = 'h-5 w-5' }: { title: string; index?: number; className?: string }) {
  const Icon = ICONS[iconKey(title, index)];
  return <Icon className={className} aria-hidden strokeWidth={1.8} />;
}

/** Inisial tanpa gelar di depan (Drs., Dra., Dr., Ir., H., Hj., Prof.) dan di belakang koma (", M.Pd."): "BS", bukan "DB". */
const nameInitials = (name: string): string => initials(name.replace(/^((dra?s?|dr|ir|hj?|prof)\.?\s+)+/i, '').replace(/,.*$/, ''), '?');

/** Inisial nama dalam bulatan langit (testimoni, guru, dan sambutan tanpa foto). Dekoratif. */
export function Initials({ name, className = 'h-11 w-11 bg-(--pd-sky2) text-[15px]' }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-(--pd-ink) ${DISPLAY} ${className}`}>
      {nameInitials(name)}
    </span>
  );
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
