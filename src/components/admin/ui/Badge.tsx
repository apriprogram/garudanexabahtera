import type { ReactNode } from 'react';
import { cn } from './cn';
import { renderIcon, type IconLike } from './icon';
import { STATUS_TONE, TONE_CLASS, type Tone } from './styles';

export type { Tone };


export type BadgeProps = {
  /** Kunci status (active, draft, critical, …) → label & warna otomatis */
  status?: string | null;
  /** Menimpa warna */
  tone?: Tone;
  /** Titik di kiri (default true) */
  dot?: boolean;
  icon?: IconLike;
  size?: 'sm' | 'md';
  /** outline (default: tint + garis tipis) | soft (tint saja) */
  variant?: 'outline' | 'soft';
  className?: string;
  children?: ReactNode;
};

/** Pill status: h-6 rounded-full px-2.5 text-xs + tint. */
export function Badge({ status, tone, dot = true, icon, size = 'md', variant = 'outline', className, children }: BadgeProps) {
  const conf = STATUS_TONE[String(status ?? '').toLowerCase()];
  const t = TONE_CLASS[tone || conf?.tone || 'mist'];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium',
        size === 'sm' ? 'h-5 px-2 text-[11px]' : 'h-6 px-2.5 text-xs',
        t.box,
        variant === 'outline' && cn('ring-1 ring-inset', t.ring),
        className,
      )}
    >
      {icon
        ? renderIcon(icon, 'h-3.5 w-3.5')
        : dot && (
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              {conf?.pulse && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', t.dot)} />}
              <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', t.dot)} />
            </span>
          )}
      {children ?? conf?.label ?? status}
    </span>
  );
}

/** Pill delta kecil (naik/turun) di kartu statistik. */
export function DeltaPill({ children, tone = 'mint', className }: { children?: ReactNode; tone?: Tone; className?: string }) {
  if (children == null || children === '') return null;
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs font-semibold tabular-nums', TONE_CLASS[tone].box, className)}>{children}</span>
  );
}

/** Chip netral (tag, label kategori). */
export function Chip({ children, icon, className }: { children: ReactNode; icon?: IconLike; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-adm-ghost px-2 text-xs font-medium text-adm-muted', className)}>
      {renderIcon(icon, 'h-3.5 w-3.5')}
      {children}
    </span>
  );
}

export default Badge;
