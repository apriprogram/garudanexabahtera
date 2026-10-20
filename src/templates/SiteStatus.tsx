// Layar status situs pembeli (memuat, tidak ditemukan/nonaktif, gagal dimuat, template tidak tersedia). Tema terang.
import { AlertCircle, Globe, LayoutTemplate, Loader2, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { LogoMark } from '../components/ui/LogoMark';

export type SiteStatusKind = 'loading' | 'notfound' | 'error' | 'unavailable';

interface SiteStatusProps {
  kind: SiteStatusKind;
  message?: string;
  onRetry?: () => void;
  /** Tombol tambahan (mis. kembali ke beranda Garuda Nexa) */
  actions?: ReactNode;
  /** Tampilkan "Didukung oleh Garuda Nexa" dengan tautan ini (dipakai di domain pembeli) */
  poweredByHref?: string;
  /** Tinggi penuh layar (default) atau mengikuti wadah */
  fullScreen?: boolean;
}

const COPY: Record<Exclude<SiteStatusKind, 'loading'>, { title: string; body: string }> = {
  notfound: {
    title: 'Situs tidak ditemukan atau sedang nonaktif',
    body: 'Alamat ini belum terhubung ke situs aktif, atau situsnya sedang dinonaktifkan sementara. Jika Anda pemilik situs ini, silakan hubungi tim Garuda Nexa.',
  },
  error: {
    title: 'Situs belum bisa dimuat',
    body: 'Terjadi kendala saat memuat situs. Silakan coba lagi beberapa saat lagi.',
  },
  unavailable: {
    title: 'Tampilan situs belum tersedia',
    body: 'Template untuk situs ini belum tersedia atau isinya tidak dapat ditampilkan. Silakan hubungi tim Garuda Nexa.',
  },
};

export function SiteStatus({ kind, message, onRetry, actions, poweredByHref, fullScreen = true }: SiteStatusProps) {
  const height = fullScreen ? 'min-h-[100svh]' : 'min-h-[60vh]';

  if (kind === 'loading') {
    return (
      <div className={`flex ${height} items-center justify-center bg-canvas px-5`} role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted">Memuat situs...</p>
        </div>
      </div>
    );
  }

  const copy = COPY[kind];
  const Icon = kind === 'error' ? AlertCircle : kind === 'unavailable' ? LayoutTemplate : Globe;

  return (
    <div className={`flex ${height} flex-col bg-canvas px-5`}>
      <main className="flex flex-1 items-center justify-center py-16">
        <div className="flex max-w-md flex-col items-center text-center" role={kind === 'error' ? 'alert' : undefined}>
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
              kind === 'error' ? 'bg-danger-50 text-danger-700' : 'bg-brand-50 text-primary'
            }`}
          >
            <Icon className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-fg sm:text-2xl">{copy.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">{message || copy.body}</p>
          {(onRetry || actions) && (
            <div className="mt-7 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
              {onRetry && (
                <button type="button" onClick={onRetry} className="btn btn-outline">
                  <RotateCw className="h-4 w-4" aria-hidden />
                  Coba lagi
                </button>
              )}
              {actions}
            </div>
          )}
        </div>
      </main>
      {poweredByHref && (
        <footer className="flex justify-center pb-[max(24px,env(safe-area-inset-bottom))]">
          <a href={poweredByHref} className="inline-flex min-h-10 items-center gap-2 text-xs text-subtle transition-colors hover:text-primary">
            <LogoMark className="h-3 text-primary" />
            Didukung oleh Garuda Nexa
          </a>
        </footer>
      )}
    </div>
  );
}
