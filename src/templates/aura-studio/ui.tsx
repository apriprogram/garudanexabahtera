// Primitif visual Aura Studio ("quiet sage"): label kapital abu, judul kapital Jost tipis, tombol pil sage + bulatan
// panah TERPISAH, tombol panah bulat, monogram bulat bergaris. Ditulis lokal (tidak berbagi dengan template lain).
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { safeImage, type LinkAction } from '../shared/utils';
import { AuraMark } from './marks';
import { BODY, H2, INK, LABEL_TONE } from './styles';

/** Label section: teks kapital abu 11px tracking lebar, tanpa pil. */
export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return <p className={`text-[11px] font-medium uppercase tracking-[0.14em] ${LABEL_TONE} @3xl:text-[12px] ${className}`}>{children}</p>;
}

/** Label + H2 (+ deskripsi). `split`: deskripsi di kanan pada desktop. */
export function SectionHead({
  eyebrow,
  title,
  subtitle,
  split = false,
  className = '',
  id,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  split?: boolean;
  className?: string;
  id?: string;
}) {
  if (!eyebrow && !title && !subtitle) return null;
  return (
    <Reveal className={`${split ? 'grid gap-5 @4xl:grid-cols-12 @4xl:items-end @4xl:gap-8' : ''} ${className}`}>
      <div className={split ? '@4xl:col-span-7' : ''}>
        {eyebrow && <Label>{eyebrow}</Label>}
        {title && (
          <h2 id={id} className={`${eyebrow ? 'mt-4' : ''} max-w-[22ch] text-balance ${H2}`}>
            {title}
          </h2>
        )}
      </div>
      {subtitle && <p className={`${split ? '@4xl:col-span-4 @4xl:col-start-9' : 'mt-5'} max-w-[46ch] ${BODY}`}>{subtitle}</p>}
    </Reveal>
  );
}

/** Bulatan panah (dekoratif di dalam tautan). `tone`: sage (aksen) · white (di atas foto) · line (garis tipis). */
export function ArrowDot({
  tone = 'sage',
  size = 'h-9 w-9',
  up = false,
  className = '',
}: {
  tone?: 'sage' | 'white' | 'line';
  size?: string;
  up?: boolean;
  className?: string;
}) {
  const tones = {
    sage: 'bg-(--tpl-accent) text-(--tpl-on-accent) ring-1 ring-inset ring-black/10',
    white: 'bg-white/90 text-[#1C1C1C] ring-1 ring-inset ring-black/[0.06] backdrop-blur',
    line: 'text-[#1C1C1C] ring-1 ring-inset ring-black/15',
  };
  const Icon = up ? ArrowUpRight : ArrowRight;
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full transition-colors ${tones[tone]} ${size} ${className}`}>
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}

/**
 * Tombol khas Aura: pil sage berteks ink + bulatan panah sage TERPISAH (satu tautan, dua bentuk).
 * `full`: selebar wadah (HP).
 */
export function SageButton({
  action,
  children,
  full = false,
  onNavigate,
  className = '',
  ariaLabel,
}: {
  action: LinkAction | null;
  children: ReactNode;
  full?: boolean;
  onNavigate?: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  if (!action) return null;
  return (
    <ActionLink
      action={action}
      onNavigate={onNavigate}
      aria-label={ariaLabel}
      className={`group inline-flex items-center gap-1 ${full ? 'w-full' : ''} ${className}`}
    >
      <span
        className={`flex h-12 items-center justify-center rounded-full bg-(--tpl-accent) px-6 text-[14px] font-medium text-(--tpl-on-accent) ring-1 ring-inset ring-black/10 transition-colors group-hover:bg-(--tpl-accent-hover) ${full ? 'flex-1' : ''}`}
      >
        {children}
      </span>
      <ArrowDot size="h-12 w-12" className="group-hover:bg-(--tpl-accent-hover)" />
    </ActionLink>
  );
}

/** Tautan teks kapital kecil bergaris bawah ("LIHAT SEMUA"). */
export function TextLink({ action, children, className = '' }: { action: LinkAction | null; children: ReactNode; className?: string }) {
  if (!action || !children) return null;
  return (
    <ActionLink
      action={action}
      className={`inline-flex min-h-11 items-center text-[11px] font-medium uppercase tracking-[0.14em] ${INK} underline decoration-black/25 underline-offset-[6px] transition-colors hover:decoration-black @3xl:text-[12px] ${className}`}
    >
      {children}
    </ActionLink>
  );
}

/**
 * Monogram bulat bergaris tipis: logo unggahan pembeli di dalam lingkaran, tanpa logo → AuraMark.
 * Logo gagal dimuat → AuraMark.
 */
export function Monogram({ logo, className = 'h-11 w-11' }: { logo: string; className?: string }) {
  const url = safeImage(logo);
  const [broken, setBroken] = useState<string | null>(null);
  const showLogo = !!url && broken !== url;
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-inset ring-black/15 ${className}`}>
      {showLogo ? (
        <img src={url} alt="" onError={() => setBroken(url)} className="h-[64%] w-[64%] object-contain" />
      ) : (
        <AuraMark className="h-[56%] w-[56%] text-[#1C1C1C]" />
      )}
    </span>
  );
}

/** Monogram + nama usaha (kapital kecil, maks. 2 baris). */
export function Brand({ name, logo, nameClassName = '', size = 'h-11 w-11' }: { name: string; logo: string; nameClassName?: string; size?: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      <Monogram logo={logo} className={size} />
      <span className={`min-w-0 ${nameClassName}`}>
        <span className={`line-clamp-2 max-w-[20ch] text-[11px] font-medium uppercase leading-[1.35] tracking-[0.14em] ${INK}`}>{name}</span>
      </span>
    </span>
  );
}

/** Chip abu kecil (jumlah, harga, label "cocok untuk"). */
export function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <span className={`inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full bg-[#F0F0F0] px-3 text-[12px] ${INK} ${className}`}>{children}</span>
  );
}
