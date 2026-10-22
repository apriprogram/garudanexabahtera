// Halaman 404 (docs/platform/SEO-PLAN.md §5.2–5.3). Path tanpa pemilik, atau yang pemiliknya mengembalikan null, sudah
// mendapat notFoundHead() dari routes.ts. Modul ini memiliki path tetap NOT_FOUND_PATH supaya prerender bisa merender
// 404.html lewat rute biasa: getHead('/404') = kepala 404 (noindex,follow, tanpa canonical), dan React Router merender
// NotFound karena /404 tidak cocok dengan rute mana pun.
import { notFoundHead } from '../defaults';
import type { PageSeo } from '../types';

export const NOT_FOUND_PATH = '/404';

const seo: PageSeo = {
  match: (pathname) => pathname === NOT_FOUND_PATH,
  head: () => notFoundHead(),
};

export default seo;
