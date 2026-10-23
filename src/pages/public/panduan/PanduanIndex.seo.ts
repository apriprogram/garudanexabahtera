// /panduan (docs/platform/SEO-PLAN.md §5.8, Lampiran A): daftar artikel panduan. Diindeks bila sudah ada artikel;
// tanpa artikel noindex,follow. JSON-LD: CollectionPage + ItemList artikel + BreadcrumbList. Modul murni (bundel utama):
// hanya ringkasan artikel (src/content/panduan/index.ts), tanpa isi Markdown.
import { listArticles } from '../../../content/panduan';
import { TITLE_SUFFIX } from '../../../seo/defaults';
import { latestDate } from '../../../seo/format';
import { breadcrumb, collectionPage, itemList } from '../../../seo/jsonld';
import { pageHead, staticPage } from '../../../seo/page';
import { HUB_PATHS, articlePath } from '../../../seo/paths';

/** Tanggal terakhir teks halaman /panduan (PanduanIndex.tsx) berubah. lastmod = ini atau artikel terbaru. */
export const GUIDES_INDEX_UPDATED = '2026-10-23';

export const GUIDES_H1 = 'Panduan website untuk bisnis';
/** Teks pembuka /panduan bawaan; admin bisa menggantinya (Pengaturan website → Panduan, setting guides_intro). */
export const GUIDES_INTRO_DEFAULT =
  'Biaya, pilihan, dan isi website atau aplikasi untuk bisnis Anda, dijelaskan apa adanya. Setiap angka dari pihak lain kami sertakan sumbernya, dan setiap artikel mencantumkan tanggal terakhir diperbarui.';
export const GUIDES_TITLE = `Panduan Membuat Website untuk Bisnis${TITLE_SUFFIX}`;
export const GUIDES_DESCRIPTION =
  'Panduan praktis membuat website & aplikasi bisnis: biaya website company profile, template vs jasa custom, biaya aplikasi Android & iOS, dan contoh niche.';

export default staticPage({
  path: HUB_PATHS.guides,
  updated: GUIDES_INDEX_UPDATED,
  lastmod: () => latestDate([GUIDES_INDEX_UPDATED, ...listArticles().map((a) => a.dateModified)]) ?? GUIDES_INDEX_UPDATED,
  head: (data) => {
    const articles = listArticles();
    const list = itemList({
      path: HUB_PATHS.guides,
      name: GUIDES_H1,
      items: articles.map((a) => ({ name: a.title, path: articlePath(a.slug) })),
    });
    return pageHead(data, {
      path: HUB_PATHS.guides,
      title: GUIDES_TITLE,
      description: GUIDES_DESCRIPTION,
      // Tanpa artikel halaman ini hanya berisi ajakan: jangan diindeks
      robots: articles.length > 0 ? 'index,follow' : 'noindex,follow',
      ogImage: 'panduan',
      ogImageAlt: 'Panduan membuat website dan aplikasi untuk bisnis dari Garuda Nexa',
      jsonLd: [
        collectionPage({
          path: HUB_PATHS.guides,
          name: GUIDES_H1,
          description: GUIDES_DESCRIPTION,
          mainEntity: list['@id'] as string,
          dateModified: latestDate([GUIDES_INDEX_UPDATED, ...articles.map((a) => a.dateModified)]) ?? GUIDES_INDEX_UPDATED,
        }),
        list,
        breadcrumb([
          { name: 'Beranda', path: HUB_PATHS.home },
          { name: 'Panduan', path: HUB_PATHS.guides },
        ]),
      ],
    });
  },
});
