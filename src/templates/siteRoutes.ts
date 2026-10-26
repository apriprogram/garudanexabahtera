// Rute di dalam situs pembeli (docs/platform/SITE-POSTS-SEO-SPEC.md §3). Dipakai CustomerSite (domain pembeli),
// SitePreview (/situs/:id/* di host utama), kepala halaman (siteSeo.ts), dan dicerminkan backend/site.php.
import type { SitePostKind } from '../types/sitePosts';

export type SiteRoute =
  | { kind: 'home' }
  | { kind: 'list'; postKind: SitePostKind }
  | { kind: 'post'; postKind: SitePostKind; slug: string }
  | { kind: 'notfound' };

export const SITE_POST_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX = 120;
const KINDS: readonly SitePostKind[] = ['berita', 'pengumuman'];

/**
 * Path relatif terhadap akar situs ("/", "/berita", "/berita/juara-olimpiade") → rute. Huruf besar, garis miring di
 * akhir, dan segmen lain = notfound (server mengalihkan "/berita/" → "/berita" dan menjawab 404 untuk sisanya).
 */
export function parseSiteRoute(pathname: string): SiteRoute {
  if (pathname === '' || pathname === '/') return { kind: 'home' };
  const parts = pathname.split('/');
  // "/berita" → ['', 'berita'], "/berita/x" → ['', 'berita', 'x']
  if (parts[0] !== '' || parts.length > 3) return { kind: 'notfound' };
  const postKind = KINDS.find((k) => k === parts[1]);
  if (!postKind) return { kind: 'notfound' };
  if (parts.length === 2) return { kind: 'list', postKind };
  const slug = parts[2];
  if (slug.length > SLUG_MAX || !SITE_POST_SLUG_PATTERN.test(slug)) return { kind: 'notfound' };
  return { kind: 'post', postKind, slug };
}

const NOT_FOUND: SiteRoute = { kind: 'notfound' };

/**
 * Rute yang benar-benar dilayani situs ini: template tanpa fitur tulisan hanya punya beranda, jadi /berita, /pengumuman,
 * dan tulisan = tidak ditemukan (site.php menjawab 404 + noindex untuk path yang sama, spec §3).
 */
export const servedRoute = (route: SiteRoute, posts: boolean): SiteRoute =>
  posts || route.kind === 'home' || route.kind === 'notfound' ? route : NOT_FOUND;

/** Garis miring di akhir dibuang ("/berita/" → "/berita", "//" → "/"), seperti pengalihan 301 di site.php. */
export const trimTrailingSlash = (pathname: string): string => (pathname === '/' ? pathname : pathname.replace(/\/+$/, '') || '/');

/**
 * Isian tautan "/path" atau "/path#anchor" yang menuju halaman situs ini (beranda, daftar, tulisan) → path relatif akar
 * situs yang dirapikan ("/berita/" → "/berita"). Selain itu null: file nyata di situs yang sama ("/assets/…/brosur.pdf"),
 * path tak dikenal, path ber-query, atau "//host" tetap tautan biasa, bukan navigasi di dalam situs.
 */
export function siteRoutePath(raw: string): string | null {
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  const at = value.indexOf('#');
  const path = at === -1 ? value : value.slice(0, at);
  const hash = at === -1 ? '' : value.slice(at);
  if (path.includes('?') || !/^(#[\w-]*)?$/.test(hash)) return null;
  const clean = trimTrailingSlash(path);
  if (parseSiteRoute(clean).kind === 'notfound') return null;
  return hash.length > 1 ? `${clean}${hash}` : clean;
}

/** Rute → path relatif akar situs. */
export function sitePath(route: SiteRoute): string {
  switch (route.kind) {
    case 'list':
      return `/${route.postKind}`;
    case 'post':
      return `/${route.postKind}/${route.slug}`;
    default:
      return '/';
  }
}

/** Path tulisan, mis. postPath('berita', 'juara') → "/berita/juara". */
export const postPath = (kind: SitePostKind, slug: string) => `/${kind}/${slug}`;
