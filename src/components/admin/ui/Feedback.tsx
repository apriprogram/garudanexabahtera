import type { CSSProperties, ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Inbox, Info, RotateCw, X } from 'lucide-react';
import { cn, FOCUS_INSET } from './cn';
import { renderIcon, type IconLike } from './icon';
import { Button } from './Button';
import { Spinner } from './Spinner';
import type { Tone } from './Badge';

export { Spinner };

/** Status kosong: ikon dalam kotak ghost, judul, deskripsi, aksi. variant: plain | card | dashed */
export function EmptyState({
  icon,
  title = 'Belum ada data',
  description,
  action,
  secondaryAction,
  size = 'md',
  variant = 'plain',
  className,
}: {
  icon?: IconLike;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  size?: 'sm' | 'md';
  variant?: 'plain' | 'card' | 'dashed';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        size === 'sm' ? 'px-4 py-8' : 'px-6 py-12 sm:py-14',
        variant === 'card' && 'rounded-[20px] bg-adm-surface ring-1 ring-inset ring-adm-line',
        variant === 'dashed' && 'rounded-[20px] border-2 border-dashed border-adm-line',
        className,
      )}
    >
      <span className={cn('mb-4 flex items-center justify-center rounded-xl bg-adm-ghost text-adm-muted', size === 'sm' ? 'h-10 w-10' : 'h-12 w-12')}>
        {renderIcon(icon || <Inbox />, size === 'sm' ? 'h-[18px] w-[18px]' : 'h-5 w-5')}
      </span>
      <h3 className={cn('font-semibold tracking-tight text-adm-fg', size === 'sm' ? 'text-sm' : 'text-base')}>{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-adm-muted sm:text-sm">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

/** Status error + tombol "Coba lagi". */
export function ErrorState({
  error,
  title = 'Gagal memuat data',
  onRetry,
  size = 'md',
  className,
}: {
  error?: unknown;
  title?: ReactNode;
  onRetry?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const message = typeof error === 'string' ? error : error instanceof Error ? error.message : undefined;
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center text-center', size === 'sm' ? 'px-4 py-8' : 'px-6 py-12', className)}>
      <span className={cn('mb-4 flex items-center justify-center rounded-xl bg-adm-danger-soft text-adm-danger-fg', size === 'sm' ? 'h-10 w-10' : 'h-12 w-12')}>
        <AlertCircle className={size === 'sm' ? 'h-[18px] w-[18px]' : 'h-5 w-5'} strokeWidth={1.75} />
      </span>
      <h3 className={cn('font-semibold tracking-tight text-adm-fg', size === 'sm' ? 'text-sm' : 'text-base')}>{title}</h3>
      {message && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-adm-muted sm:text-sm">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RotateCw />} onClick={onRetry} className="mt-5">
          Coba lagi
        </Button>
      )}
    </div>
  );
}

/** Blok pemuatan di tengah area. */
export function LoadingState({ label = 'Memuat…', className }: { label?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center text-adm-muted', className)} role="status">
      <Spinner size="md" className="text-cobalt" />
      <p className="text-[13px]">{label}</p>
    </div>
  );
}

/** Blok skeleton. */
export function Skeleton({ className, rounded = 'rounded-xl', style }: { className?: string; rounded?: string; style?: CSSProperties }) {
  return <span aria-hidden className={cn('block animate-pulse bg-adm-ghost', rounded, className)} style={style} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3.5" rounded="rounded-md" style={{ width: i === lines - 1 ? '60%' : `${92 - i * 6}%` }} />
      ))}
    </div>
  );
}

const NOTICE_TONES: Record<Tone, { box: string; icon: ReactNode }> = {
  cobalt: { box: 'bg-adm-cobalt-soft text-adm-cobalt-fg ring-cobalt/20', icon: <Info /> },
  mint: { box: 'bg-adm-mint-soft text-adm-mint-fg ring-adm-mint-fg/25', icon: <CheckCircle2 /> },
  warning: { box: 'bg-adm-warning-soft text-adm-warning-fg ring-warning/30', icon: <AlertTriangle /> },
  danger: { box: 'bg-adm-danger-soft text-adm-danger-fg ring-danger/25', icon: <AlertCircle /> },
  mist: { box: 'bg-adm-ghost text-adm-muted ring-adm-line', icon: <Info /> },
};

/** Banner pesan sebaris (info/sukses/peringatan/error). */
export function Notice({
  tone = 'cobalt',
  title,
  children,
  icon,
  action,
  onClose,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: IconLike;
  action?: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  const t = NOTICE_TONES[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-2xl px-4 py-3 ring-1 ring-inset', t.box, className)}>
      <span className="mt-0.5 shrink-0">{renderIcon(icon || t.icon, 'h-[18px] w-[18px]')}</span>
      <div className="min-w-0 flex-1 text-[13px] leading-relaxed sm:text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className={cn('relative -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg opacity-70 hover:opacity-100 max-sm:before:absolute max-sm:before:-inset-2', FOCUS_INSET)}
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

export default EmptyState;
