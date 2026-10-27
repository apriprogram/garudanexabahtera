// Demo template (/demo/:slug): render template layar penuh dengan konten bawaan + bar tipis (kembali, nama, harga,
// label "Konten demo (fiktif)", "Pesan Template"). Di layar lebar ada pilihan tampilan Desktop / HP (template memakai
// container query); tampilan HP = viewport 390px persis tanpa scrollbar desktop di dalam bingkai.
// Head (judul tab, noindex,follow tanpa canonical): src/seo/pages/demo.seo.ts. Isi demo (nama usaha, testimoni) fiktif,
// jadi halaman ini tidak diindeks dan bar demo menyebutnya dengan jelas (SEO-PLAN §2, audit CONTENT-11).
// `?fitur=berita` (template sekolah yang mampu): contoh tampilan fitur berbayar Berita & Pengumuman
// (docs/platform/SITE-ADDONS-SPEC.md §6) — section berita & pengumuman profesional dari item demo, tanpa tautan detail.
// Tanpa query = berita biasa seperti situs yang belum membeli fitur itu.
import { ArrowLeft, ExternalLink, LayoutTemplate, Monitor, ShoppingBag, Smartphone } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getTemplate } from '../../templates';
import { SiteRenderer } from '../../templates/SiteRenderer';
import { SiteStatus } from '../../templates/SiteStatus';
import { SITE_DATA_DEFAULT, type SiteData } from '../../templates/shared/siteData';
import { formatRupiah, type Template } from '../../types/platform';
import { useTemplateBySlug } from './template/useTemplateBySlug';

type Device = 'desktop' | 'mobile';

// Pilihan tampilan HP hanya ada di layar ≥ 1024px; di layar lebih kecil demo selalu tampil penuh
const WIDE_QUERY = '(min-width: 1024px)';
const subscribeWide = (onChange: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const media = window.matchMedia(WIDE_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
const readWide = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(WIDE_QUERY).matches;

/** Nilai query yang menampilkan contoh fitur Berita & Pengumuman (tautan "Lihat contoh tampilan" di /akun/fitur). */
const DEMO_POSTS_FEATURE = 'berita';

/** Demo dengan fitur Berita & Pengumuman aktif: beranda tanpa tulisan → section profesional dari item demo. */
const POSTS_DEMO_DATA: SiteData = { ...SITE_DATA_DEFAULT, postsEnabled: true };

export default function TemplateDemo() {
  const { slug } = useParams();
  const { state, retry } = useTemplateBySlug(slug);
  const [chosenDevice, setDevice] = useState<Device>('desktop');
  const wide = useSyncExternalStore(subscribeWide, readWide, () => false);
  const device: Device = wide ? chosenDevice : 'desktop';
  const template = state.status === 'ready' ? state.template : null;
  const def = template ? getTemplate(template.template_code) : undefined;
  const [params] = useSearchParams();
  // Hanya template mampu; template lain mengabaikan query ini
  const postsDemo = params.get('fitur') === DEMO_POSTS_FEATURE && def?.features?.posts === true;
  const data = postsDemo ? POSTS_DEMO_DATA : undefined;

  return (
    <div className="min-h-[100svh] bg-canvas">
      <DemoBar template={template} loading={state.status === 'loading'} device={def ? device : null} onDevice={setDevice} />

      {state.status === 'loading' && <SiteStatus kind="loading" fullScreen={false} />}
      {state.status === 'error' && <SiteStatus kind="error" message={state.message} onRetry={retry} fullScreen={false} />}
      {state.status === 'notfound' && <DemoNotFound />}
      {template && !def && <DemoUnavailable template={template} />}

      {template && def && device === 'desktop' && (
        // Header template menempel tepat di bawah bar demo (tinggi bar 56px / 64px)
        <div className="[--tpl-sticky-top:56px] sm:[--tpl-sticky-top:64px]">
          <SiteRenderer templateCode={template.template_code} content={null} preview data={data} />
        </div>
      )}

      {template && def && device === 'mobile' && (
        <div className="flex justify-center bg-alt px-6 py-8">
          <div className="w-[406px] max-w-full overflow-hidden rounded-[36px] bg-surface p-2 shadow-float ring-1 ring-line">
            <div className="no-scrollbar h-[min(844px,calc(100svh-64px-88px))] w-[390px] max-w-full overflow-y-auto overscroll-contain rounded-[28px] ring-1 ring-line [--tpl-sticky-top:0px]">
              <SiteRenderer templateCode={template.template_code} content={null} preview data={data} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DemoBar({
  template,
  loading,
  device,
  onDevice,
}: {
  template: Template | null;
  loading: boolean;
  device: Device | null;
  onDevice: (device: Device) => void;
}) {
  const slug = template ? encodeURIComponent(template.slug) : '';
  const backHref = template ? `/template/${slug}` : '/#templates';

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-5">
        <Link
          to={backHref}
          className="relative flex h-10 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted transition-colors after:absolute after:-inset-1 hover:bg-alt hover:text-fg max-sm:w-10 max-sm:justify-center max-sm:px-0 sm:px-3"
          aria-label={template ? 'Kembali ke detail template' : 'Kembali ke katalog template'}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className="max-sm:hidden">Kembali</span>
        </Link>
        <span className="h-6 w-px shrink-0 bg-line max-sm:hidden" aria-hidden />

        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="space-y-1.5" aria-hidden>
              <div className="h-3.5 w-36 animate-pulse rounded-full bg-line" />
              <div className="h-3 w-20 animate-pulse rounded-full bg-alt" />
            </div>
          ) : template ? (
            <>
              <p className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-fg sm:text-[15px]">{template.name}</span>
                <span className="badge-site h-5 shrink-0 px-2 text-[11px]">Demo</span>
              </p>
              <p className="flex min-w-0 items-center gap-1.5 text-xs text-subtle">
                <span className="shrink-0 tabular-nums">{formatRupiah(template.price)}</span>
                <span aria-hidden className="shrink-0">
                  ·
                </span>
                {/* Layar < 380px (mis. 360px) tidak muat label panjang di samping harga */}
                <span className="truncate max-[379px]:hidden">Konten demo (fiktif)</span>
                <span className="truncate min-[380px]:hidden">Konten fiktif</span>
              </p>
            </>
          ) : (
            <p className="truncate text-sm font-semibold text-fg">Demo template</p>
          )}
        </div>

        {device && (
          <div className="flex shrink-0 rounded-full bg-alt p-1 ring-1 ring-inset ring-line max-lg:hidden" role="group" aria-label="Ukuran pratinjau">
            {(
              [
                { value: 'desktop', label: 'Desktop', Icon: Monitor },
                { value: 'mobile', label: 'HP', Icon: Smartphone },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onDevice(value)}
                aria-pressed={device === value}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted transition-colors hover:text-fg aria-pressed:bg-surface aria-pressed:font-semibold aria-pressed:text-fg aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-line-strong"
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        )}

        {template && (
          <Link to={`/pesan/${slug}`} className="btn btn-primary btn-sm shrink-0" aria-label={`Pesan Template ${template.name}`}>
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
            Pesan<span className="max-sm:hidden"> Template</span>
          </Link>
        )}
      </div>
    </header>
  );
}

function DemoNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-primary">
          <LayoutTemplate className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-fg sm:text-2xl">Demo tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
          Template yang Anda cari tidak ada atau sudah tidak tersedia. Silakan pilih template lain dari katalog kami.
        </p>
        <Link to="/#templates" className="btn btn-primary mt-7">
          Lihat Semua Template
        </Link>
      </div>
    </div>
  );
}

function DemoUnavailable({ template }: { template: Template }) {
  const external = /^https?:\/\//i.test(template.demo_url || '');
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-primary">
          <LayoutTemplate className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-fg sm:text-2xl">Demo belum tersedia di sini</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
          {external
            ? `Demo ${template.name} tersedia di halaman terpisah.`
            : `Tampilan demo ${template.name} sedang kami siapkan. Anda tetap bisa melihat detail dan galeri templatenya.`}
        </p>
        <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {external ? (
            <a href={template.demo_url as string} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <ExternalLink className="h-4 w-4" aria-hidden />
              Buka Demo
              <span className="sr-only"> (tab baru)</span>
            </a>
          ) : (
            <Link to={`/template/${encodeURIComponent(template.slug)}`} className="btn btn-primary">
              Lihat Detail Template
            </Link>
          )}
          <Link to={`/pesan/${encodeURIComponent(template.slug)}`} className="btn btn-outline">
            Pesan Template
          </Link>
        </div>
      </div>
    </div>
  );
}
