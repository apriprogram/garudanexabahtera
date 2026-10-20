import type { ReactNode } from 'react';
import { CircleAlert, RefreshCw } from 'lucide-react';

/** Blok abu berdenyut untuk kerangka memuat. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-line/70 ${className}`} aria-hidden />;
}

/** Kartu error dengan tombol "Coba lagi". */
export function ErrorState({
  title = 'Gagal memuat data',
  message,
  onRetry,
  retrying = false,
  action,
  className = '',
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={`card-site flex flex-col items-center px-6 py-10 text-center sm:py-14 ${className}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-50 text-danger">
        <CircleAlert className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-base font-semibold text-fg sm:text-lg">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted">{message}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {onRetry && (
          <button type="button" className="btn btn-outline" onClick={onRetry} disabled={retrying}>
            <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} aria-hidden />
            Coba lagi
          </button>
        )}
        {action}
      </div>
    </div>
  );
}

/** Keadaan kosong dengan ikon, judul, deskripsi, dan ajakan. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-site flex flex-col items-center px-6 py-12 text-center sm:py-16 ${className}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-primary">{icon}</span>
      <h2 className="mt-4 text-base font-semibold text-fg sm:text-lg">{title}</h2>
      {description && <p className="mt-1.5 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
