// /template: katalog template website siap pakai (docs/platform/SEO-PLAN.md §5.5 langkah 1), disederhanakan atas
// permintaan pemilik 2026-10-24: H1 "Pilih Template" tanpa kalimat pengantar & tanpa strip "Sudah termasuk", chip
// kategori (tautan nyata), kolom cari (sama dengan beranda #templates), SEMUA kartu sebagai <a href="/template/{slug}"> (paginasi tautan
// ?page=N bila > 12, pencarian menampilkan semua hasil), lalu FAQ dengan tautan ke /harga. Head & JSON-LD
// (CollectionPage, ItemList, BreadcrumbList, FAQPage): CatalogPage.seo.ts. Data dari preload (HTML prerender).
import { AlertCircle, ArrowRight, LayoutTemplate, RotateCw, SearchX } from 'lucide-react';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../../../components/layout/Footer';
import Navbar from '../../../components/layout/Navbar';
import { indexTemplates, matchesQuery } from '../../../components/sections/templates/catalog';
import { TemplateSearchBox } from '../../../components/sections/templates/TemplateSearchBox';
import { CATEGORY_LIST, templatesInCategory } from '../../../content/categories';
import { CATALOG_FAQ_IDS, faqContext, faqItems } from '../../../content/faq';
import { minTemplatePrice } from '../../../content/pricing';
import { useHydrated } from '../../../lib/preload';
import { HUB_PATHS } from '../../../seo/paths';
import { formatRupiah } from '../../../types/platform';
import { CATALOG_H1_ACCENT, CATALOG_H1_LEAD } from './catalogContent';
import { Breadcrumbs, CategoryChips, FaqList, TemplateGrid, TemplateGridSkeleton } from './ui';
import { useTemplateList } from './useTemplateList';

/** Lebih dari ini → paginasi lewat tautan ?page=2 (bukan tombol "Tampilkan lebih banyak"). */
const CATALOG_PAGE_SIZE = 12;
/** Form pesan custom dengan layanan website terpilih (sama dengan beranda). */
const CUSTOM_HREF = `${HUB_PATHS.customOrder}?layanan=website`;

export default function CatalogPage() {
  const { state, retry } = useTemplateList();
  const templates = useMemo(() => (state.status === 'ready' ? state.templates : []), [state]);
  const counts = useMemo(
    () => Object.fromEntries(CATEGORY_LIST.map((meta) => [meta.slug, templatesInCategory(templates, meta.slug).length])),
    [templates],
  );
  // Query string hanya dibaca setelah hidrasi: HTML prerender selalu halaman 1 (tanpa query)
  const hydrated = useHydrated();
  const [params] = useSearchParams();
  const pages = Math.max(1, Math.ceil(templates.length / CATALOG_PAGE_SIZE));
  const page = hydrated ? Math.min(pages, Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)) : 1;

  // Pencarian di sisi klien (HTML prerender = tanpa kata kunci): semua hasil tampil, tanpa paginasi
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const searching = query.trim() !== '';
  const indexed = useMemo(() => indexTemplates(templates), [templates]);
  const results = useMemo(
    () => indexed.filter(({ haystack }) => matchesQuery(haystack, deferredQuery)).map(({ template }) => template),
    [indexed, deferredQuery],
  );
  const shown = searching ? results : templates.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
  const cheapest = minTemplatePrice(templates);
  // Jawaban sama persis dengan beranda, /harga dan llms-full.txt (src/content/faq.ts)
  const faq = faqItems(CATALOG_FAQ_IDS, faqContext(templates));

  return (
    <>
      <Navbar />
      <main id="konten" tabIndex={-1} className="bg-canvas pt-nav focus:outline-none">
        <div className="container-site pb-12 pt-5 sm:pb-20 sm:pt-8">
          <Breadcrumbs trail={[]} current="Template" />

          <header className="mt-3 flex flex-col gap-5 sm:mt-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="max-w-2xl">
              <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-fg sm:text-5xl sm:leading-[1.04] xl:text-[56px]">
                {CATALOG_H1_LEAD} <span className="text-primary">{CATALOG_H1_ACCENT}</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end">
              <p className="text-sm text-muted">Butuh desain custom?</p>
              <Link to={CUSTOM_HREF} className="btn btn-outline group">
                Pesan Custom
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
              </Link>
            </div>
          </header>

          <section aria-labelledby="daftar-template" className="mt-8 sm:mt-10">
            <h2 id="daftar-template" className="sr-only">
              Daftar template
            </h2>
            {templates.length > 0 && (
              <>
                <CategoryChips categories={CATEGORY_LIST} counts={counts} active={null} total={templates.length} />
                <TemplateSearchBox value={query} onChange={setQuery} inputRef={searchRef} className="mt-3 sm:mt-4" />
                <p role="status" className="mt-3 text-right text-[13px] tabular-nums text-subtle sm:text-sm">
                  {searching ? (
                    `${results.length} dari ${templates.length} template`
                  ) : (
                    <>
                      {templates.length} template
                      {cheapest !== null && (
                        <>
                          {' '}· mulai <span className="font-semibold text-fg">{formatRupiah(cheapest)}</span>
                        </>
                      )}
                    </>
                  )}
                </p>
              </>
            )}
            <div className="mt-5 sm:mt-7" aria-busy={state.status === 'loading'}>
              {state.status === 'loading' && <TemplateGridSkeleton />}
              {state.status === 'error' && <LoadError message={state.message} onRetry={retry} />}
              {state.status === 'ready' && templates.length === 0 && <EmptyCatalog />}
              {searching && templates.length > 0 && results.length === 0 && (
                <NoResults
                  query={query.trim()}
                  // Tombol reset ikut hilang bersama panel: fokus kembali ke kolom cari, bukan jatuh ke <body>
                  onReset={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                />
              )}
              {shown.length > 0 && <TemplateGrid templates={shown} showCategory />}
              {!searching && pages > 1 && <Pagination page={page} pages={pages} />}
            </div>
          </section>
        </div>

        <section aria-labelledby="faq-katalog" className="bg-alt py-12 sm:py-20">
          <div className="container-site grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
            <div className="min-w-0">
              <h2 id="faq-katalog" className="text-2xl font-semibold leading-tight tracking-[-0.025em] text-fg sm:text-[34px]">
                Pertanyaan seputar template
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted sm:text-base">
                Rincian biaya per tahun ada di halaman{' '}
                <Link to={HUB_PATHS.pricing} className="link-site">
                  Harga
                </Link>
                .
              </p>
            </div>
            <FaqList items={faq} />
          </div>
        </section>
      </main>
      <Footer alt />
    </>
  );
}

function Pagination({ page, pages }: { page: number; pages: number }) {
  const href = (n: number) => (n === 1 ? HUB_PATHS.catalog : `${HUB_PATHS.catalog}?page=${n}`);
  return (
    <nav aria-label="Halaman katalog" className="mt-10 flex justify-center sm:mt-14">
      <ul className="flex flex-wrap gap-2">
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <li key={n}>
            <Link
              to={href(n)}
              aria-current={n === page ? 'page' : undefined}
              className="chip-site tabular-nums aria-[current=page]:bg-primary aria-[current=page]:text-white aria-[current=page]:ring-primary"
            >
              <span className="sr-only">Halaman </span>
              {n}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NoResults({ query, onReset }: { query: string; onReset: () => void }) {
  return (
    <div className="card-flat flex flex-col items-center px-6 py-12 text-center sm:py-16">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-primary">
        <SearchX className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold text-fg sm:text-lg">Tidak ada template yang cocok</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted">
        Belum ada hasil untuk “<span className="font-medium text-fg">{query}</span>”. Coba kata kunci lain, atau ceritakan
        kebutuhan Anda dan kami buatkan desain custom.
      </p>
      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
        <Link to={CUSTOM_HREF} className="btn btn-primary">
          Pesan Custom
        </Link>
        <button type="button" onClick={onReset} className="btn btn-outline">
          Lihat Semua Template
        </button>
      </div>
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card-flat flex flex-col items-center px-6 py-12 text-center sm:py-16" role="alert">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-50 text-danger-700">
        <AlertCircle className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold text-fg sm:text-lg">Daftar template belum bisa dimuat</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted">{message}</p>
      <button type="button" onClick={onRetry} className="btn btn-outline mt-6">
        <RotateCw className="h-4 w-4" aria-hidden />
        Coba lagi
      </button>
    </div>
  );
}

function EmptyCatalog() {
  return (
    <div className="card-flat flex flex-col items-center px-6 py-12 text-center sm:py-16">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-primary">
        <LayoutTemplate className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold text-fg sm:text-lg">Template sedang kami siapkan</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted">
        Belum ada template yang bisa dipesan saat ini. Sementara itu, kami bisa membuatkan website atau aplikasi mobile custom
        sesuai kebutuhan Anda.
      </p>
      <Link to={HUB_PATHS.customOrder} className="btn btn-primary mt-6">
        Pesan Custom
      </Link>
    </div>
  );
}
