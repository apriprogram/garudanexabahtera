// /template/kategori/:category (docs/platform/SEO-PLAN.md §5.5 langkah 2): H1 + intro, chip kategori, kartu template
// kategori ini, panduan "Apa yang perlu ada di website {niche}" (checklist), FAQ, tautan ke panduan niche, jasa custom
// dan harga. Slug di luar 4 kategori → halaman 404. Head & JSON-LD: CategoryPage.seo.ts (aturan index di sana).
import { BookOpen, CircleCheck, LayoutTemplate, PencilRuler, ReceiptText } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import Footer from '../../../components/layout/Footer';
import Navbar from '../../../components/layout/Navbar';
import { CATEGORIES, CATEGORY_LIST, templatesInCategory } from '../../../content/categories';
import { CATEGORY_CONTENT } from '../../../content/categories.content';
import { minTemplatePrice } from '../../../content/pricing';
import { getTemplatePricing, useSiteSettings } from '../../../hooks/useSiteSettings';
import { HUB_PATHS, isCategorySlug } from '../../../seo/paths';
import { formatRupiah } from '../../../types/platform';
import NotFound from '../NotFound';
import { guideLink } from './guideLink';
import { usePriceDateLabel } from './pricing';
import { useTemplateList } from './useTemplateList';
import { Breadcrumbs, CategoryChips, FaqList, IncludedBox, NextLinks, PageHeader, SectionTitle, TemplateGrid, TemplateGridSkeleton } from './ui';

export default function CategoryPage() {
  const { category = '' } = useParams();
  const { state } = useTemplateList();
  const { settings } = useSiteSettings();
  const priceDate = usePriceDateLabel();
  const all = useMemo(() => (state.status === 'ready' ? state.templates : []), [state]);
  const counts = useMemo(
    () => Object.fromEntries(CATEGORY_LIST.map((meta) => [meta.slug, templatesInCategory(all, meta.slug).length])),
    [all],
  );

  if (!isCategorySlug(category)) return <NotFound />;
  const meta = CATEGORIES[category];
  const content = CATEGORY_CONTENT[category];
  const templates = templatesInCategory(all, category);
  const pricing = getTemplatePricing(settings);
  const cheapest = minTemplatePrice(templates);
  const guide = guideLink(meta.guides);

  return (
    <>
      <Navbar />
      <main id="konten" tabIndex={-1} className="bg-canvas pt-nav focus:outline-none">
        <div className="container-site pb-12 pt-5 sm:pb-20 sm:pt-8">
          <Breadcrumbs trail={[{ label: 'Template', to: HUB_PATHS.catalog }]} current={meta.name} />
          <PageHeader badge="Kategori template" title={meta.h1}>
            <p className="mt-3 text-[14px] leading-relaxed text-muted sm:text-lg sm:leading-relaxed">{content.intro}</p>
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

          <section aria-labelledby="template-kategori" className="mt-8 sm:mt-12">
            <h2 id="template-kategori" className="sr-only">
              Template {meta.name.toLowerCase()}
            </h2>
            {all.length > 0 && <CategoryChips categories={CATEGORY_LIST} counts={counts} active={category} total={all.length} />}
            <div className="mt-5 sm:mt-7" aria-busy={state.status === 'loading'}>
              {state.status === 'loading' && <TemplateGridSkeleton />}
              {templates.length > 0 && <TemplateGrid templates={templates} />}
              {state.status !== 'loading' && templates.length === 0 && (
                <div className="card-flat flex flex-col items-center px-6 py-12 text-center sm:py-16">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-primary">
                    <LayoutTemplate className="h-6 w-6" aria-hidden />
                  </span>
                  <p className="mt-4 text-base font-semibold text-fg sm:text-lg">Belum ada template di kategori ini</p>
                  <p className="mt-1.5 max-w-md text-sm text-muted">
                    Lihat template di kategori lain, atau ceritakan kebutuhan Anda dan kami buatkan website custom.
                  </p>
                  <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <Link to={HUB_PATHS.catalog} className="btn btn-primary">
                      Lihat Semua Template
                    </Link>
                    <Link to={HUB_PATHS.customOrder} className="btn btn-outline">
                      Pesan Custom
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <section aria-labelledby="panduan-kategori" className="bg-alt py-12 sm:py-20">
          <div className="container-site grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
            <div className="min-w-0 lg:sticky lg:top-[calc(var(--nav-offset)+1.5rem)] lg:self-start">
              <SectionTitle id="panduan-kategori">Apa yang perlu ada di website {meta.niche}</SectionTitle>
              <p className="mt-3 text-[14px] leading-relaxed text-muted sm:text-base">{content.guideIntro}</p>
              <div className="mt-6">
                <IncludedBox includes={pricing.includes} note={pricing.note} />
              </div>
            </div>
            <ol className="grid gap-3 sm:gap-4">
              {content.checklist.map((item, i) => (
                <li key={item.title} className="card-flat flex gap-3.5 p-4 sm:gap-4 sm:p-6">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 font-mono text-[13px] font-semibold tabular-nums text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-fg sm:text-lg">
                      <CircleCheck className="h-4 w-4 shrink-0 text-primary max-sm:hidden" aria-hidden />
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-muted sm:text-[15px]">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="faq-kategori" className="py-12 sm:py-20">
          <div className="container-site grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
            <div className="min-w-0">
              <SectionTitle id="faq-kategori">Pertanyaan seputar website {meta.niche}</SectionTitle>
              <p className="mt-3 text-[14px] leading-relaxed text-muted sm:text-base">
                Jawaban singkat sebelum Anda memilih template. Pertanyaan lain? Hubungi kami lewat WhatsApp.
              </p>
            </div>
            <FaqList items={content.faq} />
          </div>
          <div className="container-site mt-10 sm:mt-14">
            <h2 className="eyebrow">Lanjutkan membaca</h2>
            <div className="mt-4">
              <NextLinks
                links={[
                  {
                    to: guide.href,
                    title: guide.label,
                    text: guide.article ? `Panduan lengkap seputar website ${meta.niche}.` : 'Kumpulan panduan praktis membuat website bisnis.',
                    icon: <BookOpen />,
                  },
                  {
                    to: HUB_PATHS.webService,
                    title: 'Jasa pembuatan website custom',
                    text: 'Butuh fitur khusus seperti booking, akun pelanggan, atau halaman tambahan? Kami rancang sesuai kebutuhan.',
                    icon: <PencilRuler />,
                  },
                  {
                    to: HUB_PATHS.pricing,
                    title: 'Harga template & jasa website',
                    text: 'Harga semua template, biaya per tahun, dan perbandingannya dengan website custom.',
                    icon: <ReceiptText />,
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
