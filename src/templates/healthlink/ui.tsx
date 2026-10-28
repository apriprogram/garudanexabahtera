// Komponen kecil HealthLink: label kapsul ber-tint, kepala section (rata kiri di HP, rata tengah di layar lebar untuk
// section berkisi), judul dengan kata berwarna, tombol besar rounded-2xl, kotak ikon "squircle" dengan ikon otomatis,
// dan titik status dokter. Ditulis di folder ini (tidak dibagi dengan template lain).
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { ICONS, iconKey } from './icons';
import { BTN, C, CHIP, SQUIRCLE, TYPE_H } from './styles';

export type Tone = 'light' | 'dark';

/** Label kapsul: tint warna tema (terang) atau putih tembus (pita gelap) dengan titik kecil. Kosong → tidak dirender. */
export function PillLabel({ label, tone = 'light', className = '' }: { label: string; tone?: Tone; className?: string }) {
  if (!label) return null;
  const dark = tone === 'dark';
  return (
    <p className={`${CHIP} ${dark ? 'bg-white/10 text-white ring-1 ring-inset ring-white/20' : 'bg-(--hl-tint) text-(--hl-tint-ink)'} ${className}`}>
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${dark ? 'bg-(--hl-bright)' : 'bg-(--hl-solid)'}`} />
      <span className="truncate">{label}</span>
    </p>
  );
}

/** Judul dengan bagian `highlight` berwarna (versi gelap warna tema). */
export function Highlighted({ title, highlight }: { title: string; highlight: string }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <span className="text-(--hl-solid)">{mark}</span>
      {after}
    </>
  );
}

/**
 * Kepala section: label kapsul, H2, satu kalimat. `center` = rata tengah mulai @5xl (section berkisi), selain itu rata
 * kiri. Judul kosong → H2 `sr-only` berisi `srTitle` (section tetap diawali satu H2). Semua kosong tanpa `srTitle` →
 * tidak dirender.
 */
export function SectionHead({
  eyebrow,
  title,
  subtitle = '',
  srTitle = '',
  tone = 'light',
  center = false,
  className = '',
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  srTitle?: string;
  tone?: Tone;
  center?: boolean;
  className?: string;
  /** Isi tambahan di bawah kalimat (mis. tombol) */
  children?: ReactNode;
}) {
  if (!eyebrow && !title && !subtitle && !srTitle) return null;
  const dark = tone === 'dark';
  const align = center ? '@5xl:mx-auto @5xl:max-w-[640px] @5xl:text-center' : 'max-w-[560px]';
  return (
    <div className={`${align} ${className}`}>
      {eyebrow && (
        <Reveal variant="fade">
          <PillLabel label={eyebrow} tone={tone} />
        </Reveal>
      )}
      {title ? (
        <Reveal as="h2" delay={60} className={`${eyebrow ? 'mt-4' : ''} ${dark ? 'text-white' : C.ink} ${TYPE_H.h2}`}>
          {title}
        </Reveal>
      ) : (
        srTitle && <h2 className="sr-only">{srTitle}</h2>
      )}
      {subtitle && (
        <Reveal as="p" delay={120} className={`mt-3 text-pretty ${TYPE_H.lead} ${dark ? 'text-white/80' : C.muted}`}>
          {subtitle}
        </Reveal>
      )}
      {children}
    </div>
  );
}

type Variant = 'solid' | 'light' | 'tint' | 'white';

/** Tombol besar rounded-2xl dengan ikon opsional di kiri. Tanpa label atau aksi → tidak dirender. */
export function ButtonLink({
  action,
  label,
  variant = 'solid',
  size = 'md',
  icon,
  className = '',
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
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

/** Ikon otomatis dari nama ubin/layanan (lihat ./icons). Dekoratif. */
export function ItemIcon({ title, className = 'h-6 w-6' }: { title: string; className?: string }) {
  const Icon = ICONS[iconKey(title)];
  return <Icon className={className} aria-hidden strokeWidth={1.75} />;
}

/** Kotak ikon "squircle" ber-tint berisi ikon otomatis. Ukuran lewat `className` (mis. "h-14 w-14"). */
export function IconTile({ title, className = 'h-14 w-14', iconClassName = 'h-7 w-7' }: { title: string; className?: string; iconClassName?: string }) {
  return (
    <span aria-hidden className={`${SQUIRCLE} ${className}`}>
      <ItemIcon title={title} className={iconClassName} />
    </span>
  );
}

/** Titik status: hijau (online, berdenyut 3× bila gerak menyala lewat CSS .hl-dot) atau abu. Dekoratif; teks status di sebelahnya. */
export function StatusDot({ online }: { online: boolean }) {
  return (
    <span aria-hidden className={`hl-dot relative inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${online ? 'bg-[#12A150]' : 'bg-[#8A94A3]'}`} data-online={online ? 'true' : 'false'} />
  );
}
