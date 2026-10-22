// Detail template (/template/:slug): galeri, nama, kategori, deskripsi, fitur, harga + "Sudah termasuk" (setting harga,
// keputusan pemilik 2026-10-21), "Lihat Demo" & "Pesan Template". Di HP ada bar pesan bawah (Demo + Pesan Template).
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  CircleCheck,
  CreditCard,
  Eye,
  Globe,
  LayoutTemplate,
  MessageCircle,
  PencilRuler,
  RotateCw,
  ShoppingBag,
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import Footer from '../../components/layout/Footer';
import Navbar from '../../components/layout/Navbar';
import { getTemplatePricing, getWhatsappNumber, useSiteSettings, whatsappUrl } from '../../hooks/useSiteSettings';
import { formatRupiah, type Template } from '../../types/platform';
import { OtherTemplates } from './template/OtherTemplates';
import { TemplateGallery } from './template/TemplateGallery';
import { useDocumentTitle } from './template/useDocumentTitle';
import { demoLink, useTemplateBySlug } from './template/useTemplateBySlug';

const STEPS = [
  { icon: CreditCard, title: 'Pesan & bayar', body: 'Isi data dan domain yang Anda inginkan, lalu bayar secara online.' },
  { icon: Globe, title: 'Verifikasi & domain', body: 'Tim kami memverifikasi pesanan dan menyiapkan domain Anda.' },
  { icon: PencilRuler, title: 'Website aktif', body: 'Kelola teks, gambar, dan warna sendiri lewat CMS.' },
];

/** Tujuan "Pesan Custom" dari halaman template: layanan website langsung terpilih di form. */
const CUSTOM_ORDER_PATH = '/pesan-custom?layanan=website';

/**
 * Ringkasan satu baris "Sudah termasuk" untuk bar pesan di HP. Disusun dari daftar setting harga (bukan teks tetap):
 * hanya menyebut domain / hosting / SSL yang memang ada di daftar, plus "tahun pertama" bila daftar menyebutnya.
 */
function includesSummary(includes: string[]): string {
  const has = (pattern: RegExp) => includes.some((item) => pattern.test(item));
  const parts = [has(/domain/i) && 'domain', has(/hosting/i) && 'hosting', has(/\bssl\b/i) && 'SSL'].filter((part): part is string => !!part);
  if (parts.length === 0) return '';
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}` : parts[0];
  return `Termasuk ${list}${has(/tahun pertama/i) ? ' tahun pertama' : ''}`;
}

export default function TemplateDetail() {
  const { slug } = useParams();
  const { state, retry } = useTemplateBySlug(slug);
  const template = state.status === 'ready' ? state.template : null;

  useDocumentTitle(
    template
      ? `${template.name} · Template ${template.category || 'Website'} | Garuda Nexa`
      : state.status === 'notfound'
        ? 'Template tidak ditemukan | Garuda Nexa'
        : null,
  );

  return (
    <>
      <Navbar />
      <main className="bg-canvas pt-nav">
        <div className="container-site pb-14 pt-5 sm:pb-20 sm:pt-8">
          <div className="mx-auto max-w-[1240px]">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px] text-subtle">
              <Link to="/#templates" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 font-medium text-muted transition-colors hover:text-primary">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Katalog template
              </Link>
              {template && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 max-sm:hidden" aria-hidden />
                  <span className="truncate max-sm:hidden" aria-current="page">
                    {template.name}
                  </span>
                </>
              )}
            </nav>

            <div className="mt-3 sm:mt-5" aria-busy={state.status === 'loading'}>
              {state.status === 'loading' && <DetailSkeleton />}
              {state.status === 'error' && <ErrorState message={state.message} onRetry={retry} />}
              {state.status === 'notfound' && <NotFoundState />}
              {template && <DetailContent template={template} />}
            </div>
          </div>
        </div>
        {template && <OtherTemplates key={template.slug} currentSlug={template.slug} category={template.category} />}
      </main>
      <Footer />
      {/* Ruang untuk bar pesan HP agar footer tidak tertutup */}
      {template && <div className="h-[104px] lg:hidden" aria-hidden />}
    </>
  );
}

// ─── Konten ──────────────────────────────────────────────────────────────────

function DetailContent({ template }: { template: Template }) {
  const ctaRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);
  const [asideHeight, setAsideHeight] = useState(0);
  const { settings } = useSiteSettings();
  const slug = encodeURIComponent(template.slug);
  const demo = demoLink(template);
  const images = Array.from(new Set([template.preview_image, ...template.gallery].filter((src): src is string => !!src)));
  const description = (template.description || template.short_description || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const askHref = whatsappUrl(getWhatsappNumber(settings), `Halo Admin, saya ingin bertanya tentang template ${template.name}.`);
  const pricing = getTemplatePricing(settings);
  const summary = includesSummary(pricing.includes);

  // Bar pesan di bawah layar HP hanya muncul saat tombol utama di panel tidak terlihat
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setCtaVisible(entry.isIntersecting), { rootMargin: '0px 0px -40px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Panel kanan lengket (≥ lg): bila lebih tinggi dari layar, jarak atasnya dikurangi (lihat kelas `lg:top-*`) agar
  // seluruh panel tetap terlihat. Yang tergeser ke atas hanya kategori & nama; harga dan tombol tetap di layar.
  useEffect(() => {
    const el = asideRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setAsideHeight(Math.ceil(el.getBoundingClientRect().height)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const demoButton = demo.external ? (
    <a href={demo.href} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-lg">
      <Eye className="h-4 w-4" aria-hidden />
      Lihat Demo
      <span className="sr-only"> (tab baru)</span>
    </a>
  ) : (
    <Link to={demo.href} className="btn btn-outline btn-lg">
      <Eye className="h-4 w-4" aria-hidden />
      Lihat Demo
    </Link>
  );

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-x-12 lg:gap-y-12 xl:gap-x-16">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <TemplateGallery images={images} name={template.name} demo={demo} />
        </div>

        <aside
          ref={asideRef}
          style={{ '--detail-aside-h': `${asideHeight}px` } as CSSProperties}
          className="min-w-0 lg:sticky lg:top-[min(calc(var(--nav-offset)+1.5rem),calc(100svh-var(--detail-aside-h)-1.5rem))] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
        >
          <div className="card-site p-5 sm:p-7">
            {template.category && <span className="badge-site">{template.category}</span>}
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-fg [overflow-wrap:anywhere] sm:text-4xl">{template.name}</h1>
            {template.short_description && <p className="mt-3 text-[14px] leading-relaxed text-muted sm:text-base">{template.short_description}</p>}

            <div className="mt-6 rounded-2xl bg-alt px-4 py-3.5 ring-1 ring-inset ring-line sm:px-5 sm:py-4">
              <p className="text-xs font-medium text-subtle">Harga template</p>
              <p className="mt-0.5 text-[26px] font-semibold tabular-nums tracking-tight text-fg sm:text-[32px]">{formatRupiah(template.price)}</p>
              {pricing.includes.length > 0 && (
                <div className="mt-3 border-t border-dashed border-line pt-3">
                  <p className="text-[13px] font-medium text-fg">Sudah termasuk</p>
                  <ul className="mt-2 grid gap-x-4 gap-y-1.5 text-[13px] text-muted sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {pricing.includes.map((item) => (
                      <li key={item} className="flex gap-2">
                        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {pricing.note && <p className={`${pricing.includes.length > 0 ? 'mt-2.5' : 'mt-1'} text-xs leading-relaxed text-muted`}>{pricing.note}</p>}
            </div>

            <div ref={ctaRef} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Link to={`/pesan/${slug}`} className="btn btn-primary btn-lg">
                <ShoppingBag className="h-4 w-4" aria-hidden />
                Pesan Template
              </Link>
              {demoButton}
            </div>

            <div className="mt-7 border-t border-line pt-6">
              <h2 className="text-sm font-semibold text-fg">Alur pemesanan</h2>
              <ol className="mt-4 space-y-4">
                {STEPS.map(({ icon: Icon, title, body }, i) => (
                  <li key={title} className="flex gap-3">
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-primary">
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                      <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary text-[11px] font-semibold tabular-nums text-white">
                        {i + 1}
                      </span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-fg">{title}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-6 flex flex-col gap-1 border-t border-line pt-4 text-[13px] sm:flex-row sm:flex-wrap sm:gap-x-5">
              <a href={askHref} target="_blank" rel="noopener noreferrer" className="link-site inline-flex min-h-10 items-center gap-1.5">
                <MessageCircle className="h-4 w-4" aria-hidden />
                Tanya dulu via WhatsApp
              </a>
              <Link to={CUSTOM_ORDER_PATH} className="link-site inline-flex min-h-10 items-center gap-1.5">
                <LayoutTemplate className="h-4 w-4" aria-hidden />
                Butuh desain custom?
              </Link>
            </div>
          </div>
        </aside>

        {(description.length > 0 || template.features.length > 0) && (
          <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-2">
            {description.length > 0 && (
              <section aria-labelledby="tentang-template">
                <h2 id="tentang-template" className="text-xl font-semibold tracking-[-0.02em] text-fg sm:text-2xl">
                  Tentang template ini
                </h2>
                <div className="mt-3 space-y-3">
                  {description.map((p, i) => (
                    <p key={i} className="whitespace-pre-line text-[14px] leading-relaxed text-muted sm:text-base">
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            )}
            {template.features.length > 0 && (
              <section aria-labelledby="fitur-template">
                <h2 id="fitur-template" className="text-xl font-semibold tracking-[-0.02em] text-fg sm:text-2xl">
                  Fitur
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {template.features.map((feature, i) => (
                    <li key={`${feature}-${i}`} className="flex items-start gap-3 rounded-2xl bg-alt p-4 text-sm leading-relaxed text-fg ring-1 ring-inset ring-line">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Bar pesan di HP/tablet (aman dari home bar) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-[transform,opacity] duration-300 lg:hidden ${
          ctaVisible ? 'pointer-events-none translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
        aria-hidden={ctaVisible}
      >
        <div className="mx-auto max-w-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-subtle">{template.name}</p>
              <p className="text-base font-semibold tabular-nums text-fg">{formatRupiah(template.price)}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {demo.external ? (
                <a
                  href={demo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  aria-label={`Lihat Demo ${template.name} (tab baru)`}
                  tabIndex={ctaVisible ? -1 : undefined}
                >
                  <Eye className="h-4 w-4" aria-hidden />
                  Demo
                </a>
              ) : (
                <Link to={demo.href} className="btn btn-outline" aria-label={`Lihat Demo ${template.name}`} tabIndex={ctaVisible ? -1 : undefined}>
                  <Eye className="h-4 w-4" aria-hidden />
                  Demo
                </Link>
              )}
              <Link
                to={`/pesan/${slug}`}
                className="btn btn-primary"
                aria-label={`Pesan Template ${template.name}`}
                tabIndex={ctaVisible ? -1 : undefined}
              >
                <ShoppingBag className="h-4 w-4" aria-hidden />
                Pesan<span className="max-sm:hidden"> Template</span>
              </Link>
            </div>
          </div>
          {summary && (
            <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-muted">
              <CircleCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span className="truncate">{summary}</span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// ─── State ───────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12 xl:gap-16">
      <span className="sr-only" role="status">
        Memuat template...
      </span>
      <div aria-hidden>
        <div className="aspect-[16/10] animate-pulse rounded-[24px] bg-alt ring-1 ring-inset ring-line" />
        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-[16/10] animate-pulse rounded-xl bg-alt" />
          ))}
        </div>
      </div>
      <div className="card-site space-y-4 p-5 sm:p-7" aria-hidden>
        <div className="h-6 w-28 animate-pulse rounded-full bg-brand-50" />
        <div className="h-8 w-3/4 animate-pulse rounded-full bg-line" />
        <div className="h-4 w-full animate-pulse rounded-full bg-alt" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-alt" />
        <div className="h-20 animate-pulse rounded-2xl bg-alt" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-12 animate-pulse rounded-full bg-brand-50" />
          <div className="h-12 animate-pulse rounded-full bg-alt" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card-site flex flex-col items-center px-6 py-12 text-center sm:py-16" role="alert">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-50 text-danger-700">
        <AlertCircle className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-fg sm:text-xl">Template belum bisa dimuat</h1>
      <p className="mt-1.5 max-w-md text-sm text-muted">{message}</p>
      <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <button type="button" onClick={onRetry} className="btn btn-primary">
          <RotateCw className="h-4 w-4" aria-hidden />
          Coba lagi
        </button>
        <Link to="/#templates" className="btn btn-outline">
          Kembali ke katalog
        </Link>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="card-site flex flex-col items-center px-6 py-12 text-center sm:py-16">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-primary">
        <LayoutTemplate className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-4 font-mono text-xs font-semibold tracking-[0.2em] text-primary">404</p>
      <h1 className="mt-1 text-lg font-semibold text-fg sm:text-xl">Template tidak ditemukan</h1>
      <p className="mt-1.5 max-w-md text-sm text-muted">
        Template yang Anda cari tidak ada atau sudah tidak tersedia. Silakan pilih template lain dari katalog kami.
      </p>
      <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link to="/#templates" className="btn btn-primary">
          Lihat Semua Template
        </Link>
        <Link to={CUSTOM_ORDER_PATH} className="btn btn-outline">
          Pesan Custom
        </Link>
      </div>
    </div>
  );
}
