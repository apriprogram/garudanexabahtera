// Gerbang domain: di host utama (VITE_MAIN_HOSTS) aplikasi tampil seperti biasa; di domain lain, situs pembeli
// untuk domain itu yang dirender (get_site_public {domain}). Lihat docs/platform/SPEC.md §7.
// Renderer & template dimuat terpisah (lazy) agar bundel aplikasi utama tetap ringan.
import { Suspense, lazy, useMemo, type ComponentType, type ReactNode } from 'react';
import { isMainHost } from './siteHosts';

// Gagal memuat potongan kode (mis. koneksi putus) → pesan + tombol muat ulang, bukan layar kosong
const LoadFailed = () => (
  <div className="flex min-h-[100svh] flex-col items-center justify-center gap-4 bg-canvas px-5 text-center" role="alert">
    <p className="text-base font-semibold text-fg">Situs belum bisa dimuat</p>
    <p className="max-w-sm text-sm text-muted">Periksa koneksi internet Anda lalu muat ulang halaman.</p>
    <button type="button" onClick={() => window.location.reload()} className="btn btn-outline">
      Muat ulang
    </button>
  </div>
);

const CustomerSite = lazy<ComponentType<{ hostname: string }>>(() =>
  import('./CustomerSite').catch(() => ({ default: LoadFailed })),
);

const Loading = () => (
  <div className="flex min-h-[100svh] items-center justify-center bg-canvas" role="status" aria-label="Memuat situs">
    <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
  </div>
);

export default function SiteHostGate({ children }: { children: ReactNode }) {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const main = useMemo(() => isMainHost(hostname), [hostname]);

  if (main) return <>{children}</>;
  return (
    <Suspense fallback={<Loading />}>
      <CustomerSite hostname={hostname} />
    </Suspense>
  );
}
