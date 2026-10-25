// /template: katalog template (docs/platform/SEO-PLAN.md §5.5 langkah 1, Lampiran A). JSON-LD: CollectionPage +
// ItemList (semua template terbit) + BreadcrumbList + FAQPage (teks sama persis dengan FAQ yang tampil). Diindeks hanya bila ada ≥ 1 template terbit (katalog kosong =
// halaman tipis → noindex,follow). lastmod = tanggal isi katalog atau template terbaru, mana yang lebih akhir.
// Modul murni: jangan mengimpor komponen halaman (dimuat eager di bundel utama).
import { CATALOG_UPDATED } from '../../../content/categories';
import { CATALOG_FAQ_IDS, faqContext, faqItems } from '../../../content/faq';
import { TITLE_SUFFIX } from '../../../seo/defaults';
import { latestDate } from '../../../seo/format';
import { breadcrumb, collectionPage, faqPage, itemList } from '../../../seo/jsonld';
import { pageHead, staticPage } from '../../../seo/page';
import { HUB_PATHS, templatePath } from '../../../seo/paths';
import { publishedTemplates } from '../../../seo/templateSeo';
import type { SeoData } from '../../../seo/types';

export const CATALOG_TITLE = `Template Website Siap Pakai + Domain & Hosting${TITLE_SUFFIX}`;
export const CATALOG_DESCRIPTION =
  'Katalog template website siap pakai: company profile, klinik, klub olahraga, studio yoga & fintech. Harga jelas, lihat demo, bayar online, edit lewat CMS.';

const path = HUB_PATHS.catalog;

export function catalogHead(data: SeoData) {
  const templates = publishedTemplates(data);
  const list = itemList({
    path,
    name: 'Template website siap pakai',
    items: templates.map((t) => ({ name: t.name, path: templatePath(t.slug) })),
  });
  return pageHead(data, {
    path,
    title: CATALOG_TITLE,
    description: CATALOG_DESCRIPTION,
    robots: templates.length > 0 ? 'index,follow' : 'noindex,follow',
    ogImage: 'catalog',
    ogImageAlt: 'Katalog template website siap pakai Garuda Nexa',
    jsonLd: [
      collectionPage({ path, name: 'Template website siap pakai', description: CATALOG_DESCRIPTION, mainEntity: list['@id'] as string }),
      list,
      breadcrumb([
        { name: 'Beranda', path: HUB_PATHS.home },
        { name: 'Template', path },
      ]),
      faqPage({ path, items: faqItems(CATALOG_FAQ_IDS, faqContext(templates)) }),
    ],
  });
}

export default staticPage({
  path,
  updated: CATALOG_UPDATED,
  lastmod: (data) => latestDate([CATALOG_UPDATED, ...publishedTemplates(data).map((t) => t.updated_at)]) ?? CATALOG_UPDATED,
  head: catalogHead,
});
