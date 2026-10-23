// /template: katalog template website siap pakai (docs/platform/SEO-PLAN.md §5.5 langkah 1). H1 + intro, chip kategori
// (tautan nyata), SEMUA kartu sebagai <a href="/template/{slug}"> (paginasi tautan ?page=N bila > 12), kotak "Sudah
// termasuk" + tahun ke-2, perbandingan dengan website builder DIY, FAQ, tautan ke /harga, jasa custom dan panduan.
// Head & JSON-LD (CollectionPage, ItemList, BreadcrumbList): CatalogPage.seo.ts. Data dari preload (HTML prerender).
import { AlertCircle, BookOpen, LayoutTemplate, PencilRuler, ReceiptText, RotateCw } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../../../components/layout/Footer';
import Navbar from '../../../components/layout/Navbar';
import { CATEGORY_LIST, templatesInCategory } from '../../../content/categories';
import { CATALOG_FAQ_IDS, faqContext, faqItems } from '../../../content/faq';
import { minTemplatePrice } from '../../../content/pricing';
import { getTemplatePricing, useSiteSettings } from '../../../hooks/useSiteSettings';
import { useHydrated } from '../../../lib/preload';
import { ARTICLE_SLUGS, HUB_PATHS } from '../../../seo/paths';
import { formatRupiah } from '../../../types/platform';
import { CATALOG_H1, COMPARISON, COMPARISON_COLUMNS, catalogIntro } from './catalogContent';
import { guideLink } from './guideLink';
import { usePriceDateLabel } from './pricing';
import { useTemplateList } from './useTemplateList';
import { Breadcrumbs, CategoryChips, FaqList, IncludedBox, NextLinks, PageHeader, SectionTitle, TemplateGrid, TemplateGridSkeleton } from './ui';

/** Lebih dari ini → paginasi lewat tautan ?page=2 (bukan tombol "Tampilkan lebih banyak"). */
const CATALOG_PAGE_SIZE = 12;

export default function CatalogPage() {
  const { state, retry } = useTemplateList();
  const { settings } = useSiteSettings();
  const pricing = getTemplatePricing(settings);
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
  const shown = templates.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
  const cheapest = minTemplatePrice(templates);
  const priceDate = usePriceDateLabel();
  const guide = guideLink([ARTICLE_SLUGS.templateVsCustom, ARTICLE_SLUGS.websiteCost]);
  // Jawaban sama persis dengan beranda, /harga dan llms-full.txt (src/content/faq.ts)
  const faq = faqItems(CATALOG_FAQ_IDS, faqContext(templates));

  return (
    <>
      <Navbar />
      <main id="konten" tabIndex={-1} className="bg-canvas pt-nav focus:outline-none">
        <div className="container-site pb-12 pt-5 sm:pb-20 sm:pt-8">
          <Breadcrumbs trail={[]} current="Template" />
          <PageHeader badge="Katalog template" title={CATALOG_H1}>
            {catalogIntro(pricing.includes).map((text) => (
              <p key={text.slice(0, 24)} className="mt-3 text-[14px] leading-relaxed text-muted sm:text-lg sm:leading-relaxed">
                {text}
              </p>
            ))}
            {templates.length > 0 && (
              <p className="mt-4 text-[13px] text-subtle sm:text-sm">
                <span className="tabular-nums">{templates.length}</span> template
                {cheapest !== null && (
                  <>
                    {' '}· mulai <span className="font-semibold tabular-nums text-fg">{formatRupiah(cheapest)}</span>
                  </>
                )}
                {' '}· harga per {priceDate}
              </p>
            )}
          </PageHeader>

          <section aria-labelledby="daftar-template" className="mt-8 sm:mt-12">
            <h2 id="daftar-template" className="sr-only">
              Daftar template
            </h2>
            {templates.length > 0 && <CategoryChips categories={CATEGORY_LIST} counts={counts} active={null} total={templates.length} />}
            <div className="mt-5 sm:mt-7" aria-busy={state.status === 'loading'}>
              {state.status === 'loading' && <TemplateGridSkeleton />}
              {state.status === 'error' && <LoadError message={state.message} onRetry={retry} />}
              {state.status === 'ready' && templates.length === 0 && <EmptyCatalog />}
              {shown.length > 0 && <TemplateGrid templates={shown} showCategory />}
              {pages > 1 && <Pagination page={page} pages={pages} />}
            </div>
          </section>
        </div>

        <section aria-labelledby="yang-anda-dapatkan" className="bg-alt py-12 sm:py-20">
          <div className="container-site grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
            <div className="min-w-0">
              <SectionTitle id="yang-anda-dapatkan">Yang Anda dapatkan saat membeli template</SectionTitle>
              <p className="mt-3 text-[14px] leading-relaxed text-muted sm:text-base">
                Harga yang tertera di setiap template adalah harga tahun pertama untuk website yang siap online, bukan sekadar
                desain. Setup dikerjakan tim kami; Anda cukup menyiapkan nama domain pilihan dan isi website.
              </p>
              <div className="mt-6">
                <IncludedBox
                  includes={pricing.includes}
                  note={pricing.note}
                  footer={
                    <p className="mt-3 text-[13px] text-muted sm:text-sm">
                      Bandingkan semua harga di halaman{' '}
                      <Link to={HUB_PATHS.pricing} className="link-site">
                        Harga
                      </Link>
                      .
                    </p>
                  }
                />
              </div>
            </div>

            <div className="min-w-0">
              <h2 id="template-vs-diy" className="text-xl font-semibold tracking-[-0.02em] text-fg sm:text-[28px] sm:leading-tight">
                Template siap pakai atau website builder DIY?
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted sm:text-base">
                Keduanya bisa membuat usaha Anda online. Bedanya ada pada siapa yang mengerjakan bagian teknis dan seberapa
                bebas desainnya diubah.
              </p>
              <ComparisonTable />
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-katalog" className="py-12 sm:py-20">
          <div className="container-site grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
            <div className="min-w-0">
              <SectionTitle id="faq-katalog">Pertanyaan seputar template website</SectionTitle>
              <p className="mt-3 text-[14px] leading-relaxed text-muted sm:text-base">
                Belum menemukan jawabannya? Tanyakan lewat tombol WhatsApp di bawah halaman ini.
              </p>
            </div>
            <FaqList items={faq} />
          </div>
          <div className="container-site mt-10 sm:mt-14">
            <h2 className="eyebrow">Lanjutkan membaca</h2>
            <div className="mt-4">
              <NextLinks
                links={[
                  {
                    to: HUB_PATHS.pricing,
                    title: 'Harga template & jasa website',
                    text: 'Harga semua template, biaya per tahun, dan perbandingannya dengan website custom.',
                    icon: <ReceiptText />,
                  },
                  {
                    to: HUB_PATHS.webService,
                    title: 'Jasa pembuatan website custom',
                    text: 'Butuh halaman, fitur, atau desain di luar template? Kami rancang dari nol sesuai kebutuhan.',
                    icon: <PencilRuler />,
                  },
                  {
                    to: guide.href,
                    title: guide.label,
                    text: guide.article ? 'Panduan memilih antara template dan website custom.' : 'Kumpulan panduan praktis membuat website bisnis.',
                    icon: <BookOpen />,
                  },
                ]}
              />
            </div>
          </div>
        </section>
      </main>
      <Footer alt />
    </>
  );
}

function ComparisonTable() {
  const cell = 'align-top px-0 py-3 sm:px-4 sm:py-4';
  const label = 'max-sm:before:mb-0.5 max-sm:before:block max-sm:before:text-xs max-sm:before:font-semibold max-sm:before:text-subtle max-sm:before:content-[attr(data-label)]';
  return (
    <div className="mt-6 overflow-hidden rounded-[24px] bg-surface ring-1 ring-inset ring-line">
      <table className="w-full text-left text-[13px] leading-relaxed text-muted sm:text-sm">
        <caption className="sr-only">Perbandingan template siap pakai dan website builder DIY</caption>
        <thead className="max-sm:sr-only">
          <tr className="border-b border-line text-fg">
            <th scope="col" className="w-[24%] px-4 py-3 font-semibold">
              <span className="sr-only">Aspek</span>
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-primary">
              {COMPARISON_COLUMNS.template}
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              {COMPARISON_COLUMNS.diy}
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON.map((row) => (
            <tr key={row.aspect} className="border-b border-line last:border-b-0 max-sm:block max-sm:px-4 max-sm:py-3">
              <th scope="row" className={`${cell} font-semibold text-fg max-sm:block max-sm:pb-1`}>
                {row.aspect}
              </th>
              <td data-label={COMPARISON_COLUMNS.template} className={`${cell} text-fg max-sm:block max-sm:pb-1.5 ${label}`}>
                {row.template}
              </td>
              <td data-label={COMPARISON_COLUMNS.diy} className={`${cell} max-sm:block max-sm:pt-1.5 ${label}`}>
                {row.diy}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
