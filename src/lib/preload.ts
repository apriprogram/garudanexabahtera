// Data preload halaman prerender (docs/platform/SEO-PLAN.md §5.2 langkah 2).
//
// scripts/prerender.mjs mengambil respons API saat deploy dan menaruhnya di setiap halaman _pre/*.html sebagai
// <script id="gn-preload" type="application/json">. primePreload() mengisi cache yang dibaca komponen di
// initializer useState (useCachedJson, peekApiGet), sehingga:
// - di server (entry-server.tsx) HTML berisi data nyata: React tidak menunggu fetch di dalam effect;
// - di klien render pertama (hidrasi) memakai data yang sama persis dengan server → tanpa hydration mismatch.
// Effect komponen tetap meminta data terbaru ke server setelah hidrasi.
import { useSyncExternalStore } from 'react';
import { apiUrl, clearApiCache, primeApiGet } from './api';
import { guidesFromApi } from '../content/panduan/core';
import { clearCachedJson, primeCachedJson } from '../hooks/useCachedJson';
import type { SeoData } from '../seo/types';
import type { Template } from '../types/platform';

export const PRELOAD_ELEMENT_ID = 'gn-preload';

/** URL request yang dipakai komponen publik (kunci `api` di PreloadData). */
export const PRELOAD_URLS = {
  settings: '/api.php?action=get_settings',
  navbar: '/api.php?action=get_navbar_menus',
  templates: apiUrl('get_templates'),
  projects: apiUrl('get_public_projects'),
  template: (slug: string) => apiUrl('get_template', { slug }),
  /** Artikel panduan terbit (ringkasan) dan satu artikel lengkap (src/content/panduan/index.ts) */
  guides: apiUrl('get_guides'),
  guide: (slug: string) => apiUrl('get_guide', { slug }),
} as const;

export interface PreloadData {
  /** Path yang dirender (dinormalkan, mis. "/template/finova"); null = halaman generik seperti 404.html. */
  path: string | null;
  /** Waktu data diambil (ISO). Dipakai sebagai "sekarang" saat hidrasi (lencana "Baru", tahun). */
  builtAt: string;
  /** Respons API mentah per URL request (PRELOAD_URLS). */
  api: Record<string, unknown>;
  /** Chunk JS rute ini (URL absolut). main.tsx memuatnya dulu sebelum hydrateRoot. */
  chunks?: string[];
}

let current: PreloadData | null = null;
let parsedFromDom = false;

const isPreloadData = (value: unknown): value is PreloadData =>
  Boolean(value) &&
  typeof value === 'object' &&
  typeof (value as PreloadData).builtAt === 'string' &&
  Boolean((value as PreloadData).api) &&
  typeof (value as PreloadData).api === 'object';

/** Isi cache API dan useCachedJson dengan respons preload. Dipanggil sekali per render (server) / muat halaman (klien). */
export function primePreload(data: PreloadData): void {
  current = data;
  for (const [url, response] of Object.entries(data.api)) {
    primeApiGet(url, response);
    primeCachedJson(url, response);
  }
}

/** Kosongkan semua cache data (prerender: sebelum halaman berikutnya, supaya HTML hanya bergantung pada datanya). */
export function resetPreload(): void {
  current = null;
  clearApiCache();
  clearCachedJson();
}

/**
 * Data preload halaman ini: yang terakhir di-prime, atau (di browser) isi <script id="gn-preload">. Null bila tidak ada
 * (dev server, domain pembeli, app.html) atau isinya rusak.
 */
export function readPreload(): PreloadData | null {
  if (current || parsedFromDom || typeof document === 'undefined') return current;
  parsedFromDom = true;
  const text = document.getElementById(PRELOAD_ELEMENT_ID)?.textContent;
  if (!text) return null;
  try {
    const value: unknown = JSON.parse(text);
    return isPreloadData(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * "Sekarang" untuk nilai awal state yang bergantung waktu: waktu data preload diambil bila ada (server dan hidrasi
 * menghitung hal yang sama), selain itu Date.now(). Hitung ulang dengan Date.now() setelah data segar dimuat.
 */
export function preloadNow(): number {
  const builtAt = current ? Date.parse(current.builtAt) : Number.NaN;
  return Number.isNaN(builtAt) ? Date.now() : builtAt;
}

const subscribeNever = () => () => undefined;

/**
 * false saat render server dan saat hidrasi, true setelahnya (dan langsung true untuk render klien biasa).
 * Pakai untuk nilai yang hanya ada di browser (query string, sesi login, ukuran layar) supaya render hidrasi sama
 * dengan HTML prerender; React merender ulang dengan nilai klien tepat setelah hidrasi.
 */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

/** SeoData (src/seo/types.ts) dari respons API mentah: dipakai prerender dan bisa dipakai SeoManager di klien. */
export function seoDataFromApi(api: Record<string, unknown>, builtAt: string): SeoData {
  const field = <T,>(url: string, key: string): T | undefined => {
    const body = api[url];
    return body && typeof body === 'object' ? ((body as Record<string, unknown>)[key] as T | undefined) : undefined;
  };
  const settings = api[PRELOAD_URLS.settings];
  const templates = (field<unknown[]>(PRELOAD_URLS.templates, 'templates') ?? []).filter(
    (tpl): tpl is Template => Boolean(tpl) && typeof (tpl as Template).slug === 'string',
  );
  const templateBySlug: Record<string, Template> = {};
  for (const tpl of templates) templateBySlug[tpl.slug] = tpl;
  for (const [url, body] of Object.entries(api)) {
    if (!url.startsWith(`${apiUrl('get_template')}&`)) continue;
    const tpl = body && typeof body === 'object' ? (body as { template?: Template }).template : undefined;
    if (tpl && typeof tpl.slug === 'string') templateBySlug[tpl.slug] = tpl;
  }
  const projects = field<unknown[]>(PRELOAD_URLS.projects, 'projects');
  return {
    settings: settings && typeof settings === 'object' && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {},
    navbar: api[PRELOAD_URLS.navbar] ?? [],
    templates,
    projects: Array.isArray(projects) ? projects : [],
    templateBySlug,
    guides: guidesFromApi(api[PRELOAD_URLS.guides]),
    builtAt,
  };
}
