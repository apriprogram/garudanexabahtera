// Beranda / (docs/platform/SEO-PLAN.md Lampiran A). Title & description dari Lampiran A (tanpa angka harga template, jadi
// tidak basi; domain tidak termasuk harga template sejak 2026-10-25, harga domain termurah dari domainPricing.ts).
// JSON-LD: Organization + WebSite + WebPage (+ ItemList template bila section katalog tampil, + FAQPage dengan teks yang
// sama persis dengan section #faq bila section itu tampil).
import { heroPreloadImage } from '../../components/sections/hero/heroPreload';
import { TITLE_SUFFIX } from '../defaults';
import { latestDate } from '../format';
import { faqContext, homeFaqs } from '../../content/faq';
import { faqPage, itemList, webPage } from '../jsonld';
import { pageHead, staticPage } from '../page';
import { HUB_PATHS, templatePath } from '../paths';
import { DOMAIN_FROM_TEXT, publishedTemplates } from '../templateSeo';
import type { SeoData } from '../types';

/** Tanggal terakhir isi beranda berubah (Home.tsx dan section-nya). Ubah setiap kali isinya diubah. */
export const HOME_UPDATED = '2026-10-25';

export const HOME_TITLE = `Template Website Siap Pakai & Jasa Website${TITLE_SUFFIX}`;
export const HOME_DESCRIPTION = `Beli template website siap pakai, termasuk hosting & SSL tahun pertama; ${DOMAIN_FROM_TEXT}. Juga jasa website & aplikasi Android/iOS custom.`;

/** Section beranda `id` disembunyikan admin lewat setting disabled_sections. */
function sectionHidden(settings: Record<string, unknown>, id: string): boolean {
  try {
    const list: unknown = JSON.parse(String(settings.disabled_sections ?? '[]'));
    return Array.isArray(list) && list.some((item) => String(item).trim().toLowerCase() === id);
  } catch {
    return false;
  }
}

function homeJsonLd(data: SeoData): object[] {
  const settings = data.settings ?? {};
  const templates = publishedTemplates(data);
  const nodes: object[] = [
    webPage({ path: HUB_PATHS.home, name: HOME_TITLE, description: HOME_DESCRIPTION, dateModified: HOME_UPDATED }),
  ];
  if (templates.length > 0 && !sectionHidden(settings, 'templates')) {
    nodes.push(
      itemList({
        path: HUB_PATHS.home,
        name: 'Template website siap pakai',
        items: templates.map((t) => ({ name: t.name, path: templatePath(t.slug) })),
      }),
    );
  }
  if (!sectionHidden(settings, 'faq')) nodes.push(faqPage({ path: HUB_PATHS.home, items: homeFaqs(settings, faqContext(templates)) }));
  return nodes;
}

export default staticPage({
  path: HUB_PATHS.home,
  updated: HOME_UPDATED,
  // Beranda menampilkan template dari DB, jadi isinya ikut berubah saat template diperbarui
  lastmod: (data) => latestDate([HOME_UPDATED, ...publishedTemplates(data).map((t) => t.updated_at)]) ?? HOME_UPDATED,
  head: (data) =>
    pageHead(data, {
      path: HUB_PATHS.home,
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      ogImage: 'default',
      jsonLd: homeJsonLd(data),
      // Gambar terbesar di atas lipatan (latar hero atau slide pertama tayangan), sama dengan <img> di HTML prerender
      preloadImage: heroPreloadImage(data.settings ?? {}, data.templates),
    }),
});
