// /template/{slug}: halaman template (docs/platform/SEO-PLAN.md §5.3, Lampiran A). Judul & deskripsi: templateSeo.ts
// (salinan WP5 bila ada, selain itu pola A.1/A.2 dari DB). JSON-LD: Product + Offer (IDR) + BreadcrumbList.
// Slug yang tidak terbit (atau "kategori", yang dicadangkan untuk halaman kategori) → head null → kepala 404.
// /template/kategori/{x} dimiliki CategoryPage.seo.ts (dua segmen, tidak cocok dengan pola di sini).
import { latestDate, toIsoDate } from '../format';
import { breadcrumb, product, type Crumb } from '../jsonld';
import { ogCardUrl, templateCard } from '../og';
import { pageHead } from '../page';
import { HUB_PATHS, absoluteUrl, categoryPath, templatePath } from '../paths';
import {
  categorySlugOf,
  findTemplate,
  publishedTemplates,
  templateDescription,
  templateImageAlt,
  templateRasterImages,
  templateTitle,
} from '../templateSeo';
import type { PageSeo, SitemapEntry } from '../types';

const PATTERN = /^\/template\/([A-Za-z0-9-]+)$/;

const toAbsolute = (src: string) => (/^https?:\/\//i.test(src) ? src : absoluteUrl(src.startsWith('/') ? src : `/${src}`));

const seo: PageSeo = {
  match: (pathname) => PATTERN.test(pathname),
  head: (pathname, data) => {
    const template = findTemplate(data, pathname.match(PATTERN)?.[1] ?? '');
    if (!template) return null;
    const path = templatePath(template.slug);
    const card = templateCard(template.slug);
    const raster = templateRasterImages(template);
    const images = raster.length ? raster.map(toAbsolute) : [ogCardUrl(card)];
    const category = categorySlugOf(template.category);
    const crumbs: Crumb[] = [
      { name: 'Beranda', path: HUB_PATHS.home },
      { name: 'Template', path: HUB_PATHS.catalog },
      ...(category ? [{ name: template.category, path: categoryPath(category) }] : []),
      { name: template.name, path },
    ];
    const description = templateDescription(template);
    return pageHead(data, {
      path,
      title: templateTitle(template),
      description,
      ogType: 'product',
      // Kartu public/og/template-{slug}.jpg; template yang kartunya belum dibuat → default.jpg
      ogImage: card,
      ogImageAlt: templateImageAlt(template),
      preloadImage: raster[0],
      jsonLd: [
        product(template, { path, images, description: template.short_description || template.description || description }),
        breadcrumb(crumbs),
      ],
    });
  },
  routes: (data): SitemapEntry[] =>
    publishedTemplates(data).map((template) => {
      const preview = templateRasterImages(template)[0];
      return {
        path: templatePath(template.slug),
        // Tanggal template terakhir diubah di DB; cadangan: tanggal dibuat, lalu tanggal data diambil
        lastmod: toIsoDate(template.updated_at) ?? toIsoDate(template.created_at) ?? latestDate([data.builtAt]) ?? '',
        ...(preview ? { images: [toAbsolute(preview)] } : {}),
      };
    }),
};

export default seo;
