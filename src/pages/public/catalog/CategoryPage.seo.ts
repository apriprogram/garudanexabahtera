// /template/kategori/{slug}: halaman kategori (docs/platform/SEO-PLAN.md §2, §5.5 langkah 2, Lampiran A).
// Slug di luar 4 kategori → head null → kepala 404. Aturan index (§2, src/content/categories.ts): ≥ 2 template terbit,
// atau panduan ≥ 300 kata + FAQ dengan minimal 1 template; selain itu noindex,follow (tanpa canonical & JSON-LD).
// JSON-LD: CollectionPage + ItemList (template kategori ini) + BreadcrumbList. Modul murni (bundel utama).
import {
  CATEGORIES,
  CATEGORIES_UPDATED,
  CATEGORY_LIST,
  categoryDescription,
  isCategoryIndexable,
  templatesInCategory,
} from '../../../content/categories';
import { latestDate } from '../../../seo/format';
import { breadcrumb, collectionPage, itemList } from '../../../seo/jsonld';
import { categoryCard } from '../../../seo/og';
import { pageHead } from '../../../seo/page';
import { CATEGORY_PREFIX, HUB_PATHS, categoryPath, isCategorySlug, templatePath } from '../../../seo/paths';
import { publishedTemplates } from '../../../seo/templateSeo';
import type { PageSeo, SitemapEntry } from '../../../seo/types';

const PATTERN = /^\/template\/kategori\/([^/]+)$/;

const seo: PageSeo = {
  match: (pathname) => pathname.startsWith(CATEGORY_PREFIX) && PATTERN.test(pathname),
  head: (pathname, data) => {
    const slug = pathname.match(PATTERN)?.[1] ?? '';
    if (!isCategorySlug(slug)) return null;
    const meta = CATEGORIES[slug];
    const path = categoryPath(slug);
    const templates = templatesInCategory(publishedTemplates(data), slug);
    const description = categoryDescription(meta, templates);
    const list = itemList({ path, name: meta.h1, items: templates.map((t) => ({ name: t.name, path: templatePath(t.slug) })) });
    return pageHead(data, {
      path,
      title: meta.title,
      description,
      robots: isCategoryIndexable(meta, templates.length) ? 'index,follow' : 'noindex,follow',
      ogImage: categoryCard(slug),
      ogImageAlt: `${meta.h1} dari Garuda Nexa`,
      jsonLd: [
        collectionPage({ path, name: meta.h1, description, mainEntity: list['@id'] as string }),
        list,
        breadcrumb([
          { name: 'Beranda', path: HUB_PATHS.home },
          { name: 'Template', path: HUB_PATHS.catalog },
          { name: meta.name, path },
        ]),
      ],
    });
  },
  // Semua kategori diprerender (yang noindex tetap halaman publik); sitemap hanya memakai yang index
  routes: (data): SitemapEntry[] =>
    CATEGORY_LIST.map((meta) => ({
      path: categoryPath(meta.slug),
      lastmod:
        latestDate([CATEGORIES_UPDATED, ...templatesInCategory(publishedTemplates(data), meta.slug).map((t) => t.updated_at)]) ??
        CATEGORIES_UPDATED,
    })),
};

export default seo;
