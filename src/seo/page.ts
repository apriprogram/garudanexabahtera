// Penolong untuk modul *.seo.ts (docs/platform/SEO-PLAN.md §4, §5.3): pageHead() membuat SeoHead yang konsisten
// (canonical, OG, robots, JSON-LD Organization + WebSite) dan staticPage() membuat PageSeo untuk satu path tetap,
// lengkap dengan tanggal pembaruan isi (`updated`) untuk lastmod sitemap.
//
// Contoh (halaman WP5/WP6/WP8):
//   export default staticPage({
//     path: HUB_PATHS.pricing,
//     updated: '2026-11-10',                       // ubah setiap kali isi halaman berubah
//     head: (data) => pageHead(data, {
//       path: HUB_PATHS.pricing,
//       title: `Harga Template Website & Jasa Website 2026${TITLE_SUFFIX}`,
//       description: '…',
//       ogImage: 'harga',                          // kartu public/og/harga.jpg
//       jsonLd: [breadcrumb([...]), webPage({...})],
//     }),
//   });
// Modul murni (tanpa React), aman diimpor dari *.seo.ts, prerender dan skrip Node. JANGAN mengimpor routes.ts dari sini.
import { organization, website } from './jsonld';
import { toIsoDate } from './format';
import { DEFAULT_OG_ALT, resolveOgImage } from './og';
import { canonicalUrl, normalizePathname } from './paths';
import type { PageSeo, SeoData, SeoHead, SitemapEntry } from './types';

export interface PageHeadOptions {
  /** Path halaman ini (kanonis setelah dinormalkan). */
  path: string;
  /** ≤ 60 karakter, unik. */
  title: string;
  /** ≤ 155 karakter, unik. */
  description: string;
  /** Bawaan 'index,follow'. Halaman noindex tidak mendapat canonical maupun JSON-LD. */
  robots?: SeoHead['robots'];
  ogType?: SeoHead['ogType'];
  /** Nama kartu OG ("harga", "template-aura-studio"), path situs, atau URL absolut. Bawaan: kartu default. */
  ogImage?: string;
  ogImageAlt?: string;
  /** Node JSON-LD khusus halaman ini. Organization + WebSite ditambahkan otomatis di halaman index. */
  jsonLd?: readonly object[];
  /** Gambar LCP yang dipreload (path situs atau URL). */
  preloadImage?: string;
}

/** SeoHead lengkap untuk satu halaman host utama. `data` dipakai untuk sameAs organisasi (settings). */
export function pageHead(data: Pick<SeoData, 'settings'> | null, options: PageHeadOptions): SeoHead {
  const robots = options.robots ?? 'index,follow';
  const indexable = robots === 'index,follow';
  const head: SeoHead = {
    title: options.title,
    description: options.description,
    canonical: indexable ? canonicalUrl(options.path) : null,
    robots,
    ogType: options.ogType ?? 'website',
    ogImage: resolveOgImage(options.ogImage),
    ogImageAlt: options.ogImageAlt ?? DEFAULT_OG_ALT,
    jsonLd: indexable ? [organization(data?.settings ?? {}), website(), ...(options.jsonLd ?? [])] : [],
  };
  if (options.preloadImage) head.preloadImage = options.preloadImage;
  return head;
}

/** PageSeo untuk satu path tetap, dengan tanggal perubahan isi terakhir (bukan tanggal build). */
export interface StaticPageSeo extends PageSeo {
  /** Path kanonis halaman. */
  path: string;
  /** YYYY-MM-DD: tanggal terakhir isi halaman berubah. Dipakai sebagai lastmod sitemap. */
  updated: string;
}

export interface StaticPageOptions {
  path: string;
  updated: string;
  head: (data: SeoData) => SeoHead | null;
  /** lastmod khusus bila isi halaman juga mengikuti data (mis. beranda menampilkan template). Bawaan: `updated`. */
  lastmod?: (data: SeoData) => string;
}

export function staticPage({ path, updated, head, lastmod }: StaticPageOptions): StaticPageSeo {
  const canonicalPath = normalizePathname(path);
  if (canonicalPath !== path) throw new Error(`[seo] staticPage: path "${path}" harus kanonis ("${canonicalPath}")`);
  if (toIsoDate(updated) !== updated) throw new Error(`[seo] staticPage ${path}: updated "${updated}" harus YYYY-MM-DD`);
  return {
    path,
    updated,
    match: (pathname) => pathname === path,
    head: (_pathname, data) => head(data),
    routes: (data): SitemapEntry[] => [{ path, lastmod: lastmod?.(data) ?? updated }],
  };
}
