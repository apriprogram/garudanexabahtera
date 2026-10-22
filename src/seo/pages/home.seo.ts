// Beranda / (docs/platform/SEO-PLAN.md Lampiran A). Title & description dari Lampiran A (tanpa angka harga, jadi tidak
// basi). JSON-LD: Organization + WebSite (+ ItemList template bila section katalog tampil di beranda).
import { heroPreloadImage } from '../../components/sections/hero/heroPreload';
import { TITLE_SUFFIX } from '../defaults';
import { latestDate } from '../format';
import { itemList } from '../jsonld';
import { pageHead, staticPage } from '../page';
import { HUB_PATHS, templatePath } from '../paths';
import { publishedTemplates } from '../templateSeo';
import type { SeoData } from '../types';

/** Tanggal terakhir isi beranda berubah (Home.tsx dan section-nya). Ubah setiap kali isinya diubah. */
export const HOME_UPDATED = '2026-10-23';

export const HOME_TITLE = `Template Website Siap Pakai & Jasa Website${TITLE_SUFFIX}`;
export const HOME_DESCRIPTION =
  'Beli template website siap pakai, sudah termasuk domain, hosting & SSL tahun pertama. Juga jasa pembuatan website & aplikasi Android/iOS custom.';

/** Section katalog beranda disembunyikan admin lewat setting disabled_sections. */
function templatesHidden(settings: Record<string, unknown>): boolean {
  try {
    const list: unknown = JSON.parse(String(settings.disabled_sections ?? '[]'));
    return Array.isArray(list) && list.some((id) => String(id).trim().toLowerCase() === 'templates');
  } catch {
    return false;
  }
}

function homeJsonLd(data: SeoData): object[] {
  const templates = publishedTemplates(data);
  if (templates.length === 0 || templatesHidden(data.settings ?? {})) return [];
  return [
    itemList({
      path: HUB_PATHS.home,
      name: 'Template website siap pakai',
      items: templates.map((t) => ({ name: t.name, path: templatePath(t.slug) })),
    }),
  ];
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
