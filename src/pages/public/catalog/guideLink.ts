// Tautan "1 panduan" di halaman katalog, kategori dan template (docs/platform/SEO-PLAN.md §5.5, Lampiran A.4): artikel
// pertama yang sudah terbit dari daftar prioritas, selain itu halaman /panduan. Tautan tidak pernah menuju artikel yang
// belum ada (404).
import { getArticle } from '../../../content/panduan';
import { HUB_PATHS, articlePath, type PlannedArticleSlug } from '../../../seo/paths';

export interface GuideLink {
  href: string;
  label: string;
  /** true = artikel; false = halaman daftar panduan (artikelnya belum terbit). */
  article: boolean;
}

export function guideLink(slugs: readonly PlannedArticleSlug[] = []): GuideLink {
  for (const slug of slugs) {
    const article = getArticle(slug);
    if (article) return { href: articlePath(article.slug), label: article.title, article: true };
  }
  return { href: HUB_PATHS.guides, label: 'Panduan website untuk bisnis', article: false };
}
