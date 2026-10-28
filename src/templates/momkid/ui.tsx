// Komponen kecil MomKid: label section berbentuk pil mint dengan doodle, kepala section (tengah atau kiri), judul
// dengan kata berwarna, tombol pil, tautan teks bergaris bawah tebal, dan gelombang SVG di tepi pita pastel. Ditulis di
// folder ini (bukan dibagi dengan template lain).
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { Doodle } from './art';
import type { DoodleName } from './icons';
import { glue, type Tone } from './model';
import { BTN, C, TEXT_LINK, TONE_FILL, TYPE } from './styles';

/**
 * Label section: pil (mint di latar krem/putih/peach, putih di pita mint) berisi doodle kecil + teks Nunito 800 mint
 * tua (≥ 5,5:1). Label kosong → tidak dirender.
 */
export function SectionLabel({ label, doodle = 'heart', onMint = false, className = '' }: { label: string; doodle?: DoodleName; onMint?: boolean; className?: string }) {
  if (!label) return null;
  return (
    <p className={`inline-flex h-8 max-w-full items-center gap-1.5 rounded-full pl-1.5 pr-3.5 ${onMint ? 'bg-white' : 'bg-[#DDF3EA]'} ${TYPE.label} ${C.mintInk} ${className}`}>
      <Doodle name={doodle} blob="" className="h-6 w-6 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </p>
  );
}

/** Judul dengan bagian `highlight` bergaris stabilo peach lembut (teks tetap tinta, ./momkid.css .mk-mark). */
export function Highlighted({ title, highlight }: { title: string; highlight: string }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{glue(title)}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {glue(before)}
      <span className="mk-mark">{glue(mark)}</span>
      {glue(after)}
    </>
  );
}

/**
 * Kepala section: label pil, H2 Nunito, satu kalimat pengantar. `center` (bawaan) atau `left`. Judul kosong → H2
 * `sr-only` berisi `srTitle` (section tetap diawali satu H2 sebelum H3 di bawahnya). Kosong semua → tidak dirender.
 */
export function SectionHead({
  eyebrow,
  doodle = 'heart',
  title,
  subtitle = '',
  srTitle = '',
  align = 'center',
  onMint = false,
  className = '',
  children,
}: {
  eyebrow: string;
  doodle?: DoodleName;
  title: string;
  subtitle?: string;
  srTitle?: string;
  align?: 'center' | 'left';
  onMint?: boolean;
  className?: string;
  /** Isi tambahan di bawah pengantar (mis. pilihan kamar) */
  children?: ReactNode;
}) {
  if (!eyebrow && !title && !subtitle && !srTitle && !children) return null;
  const center = align === 'center';
  return (
    <div className={`${center ? 'mx-auto max-w-[720px] text-center' : ''} ${className}`}>
      {eyebrow && (
        <Reveal variant="fade">
          <SectionLabel label={eyebrow} doodle={doodle} onMint={onMint} />
        </Reveal>
      )}
      {title ? (
        <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} ${center ? 'mx-auto' : ''} max-w-[22ch] ${TYPE.h2} ${C.ink}`}>
          {glue(title)}
        </Reveal>
      ) : (
        <h2 className="sr-only">{srTitle || eyebrow || 'Bagian'}</h2>
      )}
      {subtitle && (
        <Reveal as="p" delay={160} className={`mt-4 ${center ? 'mx-auto' : ''} max-w-[52ch] text-pretty ${TYPE.lead} ${C.muted}`}>
          {subtitle}
        </Reveal>
      )}
      {children}
    </div>
  );
}

type Variant = 'primary' | 'mint' | 'white';

/** Tombol pil + panah (bergeser 2px saat disorot). Tanpa label atau aksi → tidak dirender. */
export function ButtonLink({
  action,
  label,
  variant = 'primary',
  size = 'lg',
  icon,
  arrow = true,
  className = '',
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  variant?: Variant;
  size?: 'md' | 'lg';
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
      {arrow && <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5" />}
    </ActionLink>
  );
}

/** Tautan teks berwarna tema; tautan keluar diberi panah serong, tautan di halaman panah kanan. */
export function TextLink({ action, label, arrow = true, className = '' }: { action: LinkAction | null; label: string; arrow?: boolean; className?: string }) {
  if (!action || !label) return null;
  const Icon = action.kind === 'external' ? ArrowUpRight : ArrowRight;
  return (
    <ActionLink action={action} className={`${TEXT_LINK} ${className}`}>
      {label}
      {arrow && <Icon aria-hidden className="h-4 w-4 shrink-0" />}
    </ActionLink>
  );
}

const WAVE = 'M0 64V34C120 12 260 0 420 10s300 46 480 46 330-30 540-44V64z';

/**
 * Gelombang lembut di tepi pita pastel / hero. `top`: menempel di atas elemen induk (relative), mengisi warna `tone`
 * ke atas section sebelumnya; `bottom`: di bawahnya, dibalik. `inside`: di dalam tepi bawah induk (hero). Dekoratif.
 */
export function Wave({ tone, position, className = '' }: { tone: Tone; position: 'top' | 'bottom' | 'inside'; className?: string }) {
  const place = position === 'top' ? 'bottom-full' : position === 'bottom' ? 'top-full -scale-y-100' : 'bottom-0';
  return (
    <svg
      viewBox="0 0 1440 64"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
      className={`pointer-events-none absolute inset-x-0 z-[1] block h-7 w-full @3xl:h-10 @6xl:h-14 ${place} ${TONE_FILL[tone]} ${className}`}
    >
      <path d={WAVE} />
    </svg>
  );
}
