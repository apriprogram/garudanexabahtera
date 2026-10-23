// /panduan/{slug} (docs/platform/SEO-PLAN.md §5.8): head artikel panduan. Slug tanpa file .md → head null → kepala 404.
// JSON-LD: Article (penulis dari src/content/authors.ts, datePublished/dateModified = tanggal yang terlihat di halaman)
// + BreadcrumbList Beranda › Panduan › artikel. routes() memuat semua artikel → prerender, sitemap (lastmod =
// dateModified) dan llms.txt. Modul murni (bundel utama): hanya ringkasan artikel, tanpa isi Markdown.
import { authorForJsonLd, getAuthor } from '../../../content/authors';
import { getArticle, listArticles, type ArticleSummary } from '../../../content/panduan';
import { TITLE_SUFFIX } from '../../../seo/defaults';
import { firstThatFits } from '../../../seo/format';
import { article, breadcrumb } from '../../../seo/jsonld';
import { hasOgCard, ogCardUrl } from '../../../seo/og';
import { pageHead } from '../../../seo/page';
import { GUIDE_PREFIX, HUB_PATHS, articlePath } from '../../../seo/paths';
import type { PageSeo, SitemapEntry } from '../../../seo/types';

const PATTERN = /^\/panduan\/([^/]+)$/;

/** Judul tab: "{judul} | Garuda Nexa" bila muat ≤ 60 karakter, selain itu judul artikel saja. */
export const articleHeadTitle = (title: string): string => firstThatFits([`${title}${TITLE_SUFFIX}`, title], 60);

/** Kartu OG artikel: `panduan-{slug}` bila sudah dibuat skrip OG, selain itu kartu /panduan. */
export const articleOgCard = (slug: string): string => (hasOgCard(`panduan-${slug}`) ? `panduan-${slug}` : 'panduan');

/** Node JSON-LD khusus artikel (Article + BreadcrumbList). */
export function articleJsonLd(summary: ArticleSummary): object[] {
  const path = articlePath(summary.slug);
  return [
    article({
      path,
      headline: summary.title,
      description: summary.description,
      datePublished: summary.datePublished,
      dateModified: summary.dateModified,
      author: authorForJsonLd(getAuthor(summary.author)),
      image: ogCardUrl(articleOgCard(summary.slug)),
    }),
    breadcrumb([
      { name: 'Beranda', path: HUB_PATHS.home },
      { name: 'Panduan', path: HUB_PATHS.guides },
      { name: summary.title, path },
    ]),
  ];
}

const seo: PageSeo = {
  match: (pathname) => pathname.startsWith(GUIDE_PREFIX) && PATTERN.test(pathname),
  head: (pathname, data) => {
    const summary = getArticle(pathname.match(PATTERN)?.[1] ?? '');
    if (!summary) return null;
    return pageHead(data, {
      path: articlePath(summary.slug),
      title: articleHeadTitle(summary.title),
      description: summary.description,
      ogType: 'article',
      ogImage: articleOgCard(summary.slug),
      ogImageAlt: summary.title,
      jsonLd: articleJsonLd(summary),
    });
  },
  routes: (): SitemapEntry[] => listArticles().map((a) => ({ path: articlePath(a.slug), lastmod: a.dateModified })),
};

export default seo;
