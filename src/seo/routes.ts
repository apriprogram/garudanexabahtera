// Head per rute dan daftar rute yang boleh diindeks (docs/platform/SEO-PLAN.md §4, §5.3).
//
// Tidak ada registry bersama yang perlu diedit: setiap modul `*.seo.ts` (default export `PageSeo`) dikumpulkan
// otomatis dari dua tempat:
// - halaman publik baru: src/pages/public/**/<Halaman>.seo.ts, di samping komponennya;
// - definisi rute statis yang sudah ada (/, /template/:slug, /pesan-custom, legal, /demo/:slug, ...): satu modul per
//   file di src/seo/pages/*.seo.ts (WP3), supaya setiap paket bisa memiliki file sendiri.
//
// Aturan modul *.seo.ts:
// - Modul murni: JANGAN mengimpor komponen React atau halamannya. Semua modul dimuat eager di bundel utama
//   (SeoManager) dan di skrip prerender; mengimpor halaman akan menggagalkan lazy loading.
// - match(pathname) menerima path yang sudah dinormalkan (normalizePathname): diawali "/", tanpa query/hash, tanpa
//   garis miring di akhir. Tepat satu modul boleh mencocokkan sebuah path (dicek di src/seo/__tests__/routes.test.ts).
// - head() = null berarti "path ini milik saya tetapi tidak ada" (mis. slug yang tidak dikenal) → kepala 404.
// - routes() hanya untuk halaman yang `index,follow`; rute noindex disaring dari sitemap.
import { notFoundHead } from './defaults';
import { normalizePathname } from './paths';
import type { PageSeo, SeoData, SeoHead, SitemapEntry } from './types';

export { normalizePathname };

type SeoModule = { default?: PageSeo };

const pageModules = import.meta.glob<SeoModule>('../pages/public/**/*.seo.ts', { eager: true });
const staticModules = import.meta.glob<SeoModule>('./pages/*.seo.ts', { eager: true });

export interface RegisteredSeo {
  /** Path modul relatif terhadap src/seo, untuk pesan galat. */
  id: string;
  seo: PageSeo;
}

const isPageSeo = (value: unknown): value is PageSeo =>
  Boolean(value) && typeof (value as PageSeo).match === 'function' && typeof (value as PageSeo).head === 'function';

function collect(modules: Record<string, SeoModule>): RegisteredSeo[] {
  return Object.keys(modules)
    .sort()
    .flatMap((id) => {
      const seo = modules[id].default;
      if (isPageSeo(seo)) return [{ id, seo }];
      // Modul rusak tidak boleh menjatuhkan situs; tes routes.test.ts memastikan tidak ada yang lolos
      console.error(`[seo] ${id}: default export bukan PageSeo (butuh match dan head), diabaikan.`);
      return [];
    });
}

/** Semua modul SEO: halaman publik baru dulu, lalu definisi statis; masing-masing urut nama file. */
export const SEO_MODULES: readonly RegisteredSeo[] = [...collect(pageModules), ...collect(staticModules)];

/** Modul yang memiliki path ini (sudah dinormalkan), atau null. */
export function findSeoModule(pathname: string): RegisteredSeo | null {
  const path = normalizePathname(pathname);
  return SEO_MODULES.find(({ seo }) => seo.match(path)) ?? null;
}

/** Head untuk path ini. Tanpa pemilik, atau pemiliknya mengembalikan null → kepala 404 (noindex). */
export function getHead(pathname: string, data: SeoData): SeoHead {
  const path = normalizePathname(pathname);
  const owner = findSeoModule(path);
  return owner?.seo.head(path, data) ?? notFoundHead();
}

/**
 * Rute untuk sitemap dan prerender: gabungan routes() semua modul, path dinormalkan, tanpa duplikat, dan hanya yang
 * kepalanya sendiri `index,follow` (stub dan halaman noindex tidak pernah masuk).
 */
export function getIndexableRoutes(data: SeoData): SitemapEntry[] {
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  for (const { seo } of SEO_MODULES) {
    for (const entry of seo.routes?.(data) ?? []) {
      const path = normalizePathname(entry.path);
      if (seen.has(path) || getHead(path, data).robots !== 'index,follow') continue;
      seen.add(path);
      entries.push({ ...entry, path });
    }
  }
  return entries;
}
