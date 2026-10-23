// /panduan/:slug (docs/platform/SEO-PLAN.md §5.8): H1, byline + "Diperbarui {tanggal}" (= tanggal JSON-LD), daftar isi
// (sticky di desktop, disclosure di HP), isi Markdown, ajakan, kotak penulis, artikel terkait. Slug tanpa file .md →
// halaman 404. Head & JSON-LD: PanduanArticle.seo.ts. Token data di isi ({{harga_template_min}}, {{template:slug}}, …)
// diganti data template terbit (preload saat prerender & hidrasi, lalu API), lihat src/content/panduan/placeholders.ts.
import { useMemo } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Footer from '../../../components/layout/Footer';
import Navbar from '../../../components/layout/Navbar';
import { getAuthor } from '../../../content/authors';
import { getArticle, listArticles } from '../../../content/panduan';
import { articleHeadings, countWords, proseBeforeSources, readingMinutes, type ArticleHeading } from '../../../content/panduan/parse';
import { getFullArticle } from '../../../content/panduan/bodies';
import { resolvePlaceholders } from '../../../content/panduan/placeholders';
import { usePriceDate, usePublishedTemplates } from '../../../hooks/usePublishedTemplates';
import { HUB_PATHS, TEMPLATE_PREFIX, CATEGORY_PREFIX, GUIDE_PREFIX } from '../../../seo/paths';
import NotFound from '../NotFound';
import { ArticleMarkdown } from './ArticleMarkdown';
import { ArticleCards, ArticleCtaBox, ArticleDates, AuthorBox } from './ui';

/** Artikel terkait yang tampil di bawah artikel. */
const RELATED_COUNT = 3;

const TocList = ({ headings }: { headings: readonly ArticleHeading[] }) => (
  <ol className="space-y-0.5">
    {headings.map((heading, index) => (
      <li key={heading.id}>
        <a
          href={`#${heading.id}`}
          className="flex min-h-10 items-start gap-2.5 rounded-xl px-3 py-2 text-[13px] leading-snug text-muted transition-colors hover:bg-alt hover:text-fg lg:min-h-0 lg:py-1.5"
        >
          <span className="w-5 shrink-0 font-mono text-[12px] tabular-nums text-subtle">{index + 1}.</span>
          <span>{heading.text}</span>
        </a>
      </li>
    ))}
  </ol>
);

export default function PanduanArticle() {
  const { slug = '' } = useParams();
  const summary = getArticle(slug);
  const article = summary ? getFullArticle(slug) : undefined;
  const { status, templates } = usePublishedTemplates();
  const priceDate = usePriceDate();

  const body = useMemo(() => (article ? resolvePlaceholders(article.body, { templates, priceDate }) : ''), [article, templates, priceDate]);
  const headings = useMemo(() => articleHeadings(body), [body]);
  const minutes = useMemo(() => readingMinutes(countWords(proseBeforeSources(body))), [body]);

  if (!summary || !article) return <NotFound />;

  // Template yang tidak lagi terbit (setelah data siap) → katalog, dan artikel lain yang belum terbit (draf) → /panduan,
  // supaya tautan di artikel tidak berakhir 404
  const published = new Set(templates.map((t) => t.slug));
  const resolveHref = (href: string): string => {
    if (href.startsWith(GUIDE_PREFIX)) {
      const guideSlug = href.slice(GUIDE_PREFIX.length).split(/[/?#]/, 1)[0];
      return getArticle(guideSlug) ? href : HUB_PATHS.guides;
    }
    if (status !== 'ready' || !href.startsWith(TEMPLATE_PREFIX) || href.startsWith(CATEGORY_PREFIX)) return href;
    const templateSlug = href.slice(TEMPLATE_PREFIX.length).split(/[/?#]/, 1)[0];
    return templateSlug && !published.has(templateSlug) ? HUB_PATHS.catalog : href;
  };

  const author = getAuthor(article.author);
  const others = listArticles().filter((a) => a.slug !== article.slug);
  const related = [
    ...article.related.map((s) => others.find((a) => a.slug === s)).filter((a) => a !== undefined),
    ...others.filter((a) => !article.related.includes(a.slug)),
  ].slice(0, RELATED_COUNT);

  return (
    <>
      <Navbar />
      <main id="konten" tabIndex={-1} className="bg-canvas pt-nav focus:outline-none">
        <article className="relative">
          {/* Aksen lembut biru brand di latar kepala halaman (sama dengan halaman info) */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-linear-to-b from-brand-50/80 to-transparent" />
          <div className="container-site relative pb-14 pt-5 sm:pb-20 sm:pt-8">
            <div className="mx-auto max-w-[1160px]">
              <nav aria-label="Breadcrumb" className="min-w-0 text-[13px] text-subtle">
                <ol className="flex min-w-0 items-center gap-1.5">
                  <li className="flex shrink-0 items-center">
                    <Link to={HUB_PATHS.home} className="inline-flex min-h-10 items-center font-medium text-muted transition-colors hover:text-primary">
                      Beranda
                    </Link>
                  </li>
                  <li className="flex shrink-0 items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <Link to={HUB_PATHS.guides} className="inline-flex min-h-10 items-center font-medium text-muted transition-colors hover:text-primary">
                      Panduan
                    </Link>
                  </li>
                  <li className="flex min-w-0 items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate" aria-current="page">
                      {article.title}
                    </span>
                  </li>
                </ol>
              </nav>

              <header className="mt-3 max-w-3xl sm:mt-5">
                <span className="badge-site">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden />
                  Panduan
                </span>
                <h1 className="mt-3 text-[26px] font-semibold leading-[1.18] tracking-[-0.02em] text-fg sm:text-4xl sm:leading-[1.12] xl:text-[44px]">
                  {article.title}
                </h1>
                <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-subtle sm:text-sm">
                  <span>
                    Oleh{' '}
                    <Link to={author.path} className="font-medium text-fg transition-colors hover:text-primary">
                      {author.name}
                    </Link>
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    <ArticleDates article={article} />
                  </span>
                  <span aria-hidden>·</span>
                  <span>{minutes} menit baca</span>
                </p>
              </header>

              <div className="mt-6 grid gap-6 sm:mt-10 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
                {/* Daftar isi: HP & tablet = disclosure tertutup; desktop = kolom sticky */}
                <details className="group card-flat px-2 py-1 lg:hidden">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
                    Daftar isi
                    <ChevronDown className="h-4 w-4 text-subtle transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
                  </summary>
                  <div className="pb-2">
                    <TocList headings={headings} />
                  </div>
                </details>
                <nav aria-label="Daftar isi" className="hidden self-start lg:sticky lg:top-[calc(var(--nav-offset)+1.5rem)] lg:block">
                  <p className="eyebrow px-3">Daftar isi</p>
                  <div className="mt-3">
                    <TocList headings={headings} />
                  </div>
                </nav>

                <div className="min-w-0 max-w-3xl">
                  <ArticleMarkdown markdown={body} resolveHref={resolveHref} />
                  <ArticleCtaBox kind={article.cta} articleTitle={article.title} />
                  <AuthorBox author={author} />
                </div>
              </div>
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <section aria-labelledby="panduan-terkait" className="bg-alt py-12 sm:py-20">
            <div className="container-site">
              <div className="mx-auto max-w-[1160px]">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <h2 id="panduan-terkait" className="text-xl font-semibold tracking-[-0.02em] text-fg sm:text-[28px]">
                    Panduan lainnya
                  </h2>
                  <Link to={HUB_PATHS.guides} className="link-site inline-flex min-h-10 items-center text-sm font-medium sm:text-[15px]">
                    Semua panduan
                  </Link>
                </div>
                <div className="mt-6 sm:mt-8">
                  <ArticleCards articles={related} />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
