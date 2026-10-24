// Data SEO di klien untuk SeoManager (docs/platform/SEO-PLAN.md §5.3 langkah 4): settings (get_settings), daftar
// template terbit (get_templates) dan artikel panduan terbit (get_guides) (request bersama apiGet yang juga di-prime
// prerender WP2), plus aturan kapan head boleh diterapkan. Modul murni (tanpa React, tanpa DOM).
import type { ArticleSummary } from '../content/panduan/core';
import type { Template } from '../types/platform';
import { GUIDE_PREFIX, HUB_PATHS, isAppPath } from './paths';
import type { SeoData, SeoHead } from './types';

export type CatalogStatus = 'loading' | 'ready' | 'error';

/**
 * SeoData dari cache klien. templateBySlug dibangun dari daftar (get_templates mengembalikan baris template lengkap);
 * guides = artikel panduan terbit, hanya dari get_guides yang berhasil (gagal/belum dimuat → []).
 */
export function clientSeoData(
  settings: Record<string, unknown>,
  templates: readonly Template[],
  builtAt: string,
  guides: readonly ArticleSummary[] = [],
): SeoData {
  return {
    settings,
    navbar: [],
    templates: [...templates],
    projects: [],
    templateBySlug: Object.fromEntries(templates.map((t) => [t.slug, t])),
    guides: [...guides],
    builtAt,
  };
}

export interface ApplyDecision {
  /** Path yang sudah dinormalkan. */
  pathname: string;
  head: SeoHead;
  /** Ada modul *.seo.ts yang memiliki path ini (false = 404 sungguhan, tidak bergantung data). */
  hasOwner: boolean;
  settingsLoaded: boolean;
  /** Daftar template terbit (get_templates): menentukan halaman template dan kategori mana yang ada. */
  catalog: CatalogStatus;
  /** Artikel panduan terbit (get_guides): hanya menentukan kepala /panduan dan /panduan/{slug}. */
  guides: CatalogStatus;
}

/** /panduan dan semua path di bawahnya: kepalanya bergantung daftar artikel (get_guides). */
export const isGuidesPath = (pathname: string): boolean => pathname === HUB_PATHS.guides || pathname.startsWith(GUIDE_PREFIX);

/**
 * Boleh menerapkan head sekarang?
 * - Rute aplikasi: selalu (kepalanya tidak bergantung data; judul halaman akun tetap dipasang halamannya sendiri).
 * - Selain itu tunggu settings dan daftar template selesai dimuat; path /panduan juga menunggu artikel panduan. Dengan
 *   begitu HTML prerender yang benar tidak sempat ditimpa kepala 404/noindex hanya karena data belum datang.
 * - Daftar template gagal dimuat (atau artikel panduan gagal, khusus path /panduan): jangan pernah menurunkan halaman
 *   milik modul ke noindex (bisa saja hanya karena datanya tidak ada); kepala index dan 404 sungguhan (tanpa pemilik)
 *   tetap diterapkan. Artikel panduan gagal tidak menahan kepala halaman lain (beranda, harga, katalog).
 */
export function shouldApplyHead({ pathname, head, hasOwner, settingsLoaded, catalog, guides }: ApplyDecision): boolean {
  if (isAppPath(pathname)) return true;
  if (!settingsLoaded || catalog === 'loading') return false;
  // Halaman milik modul dengan kepala noindex/404: bisa saja hanya karena datanya gagal dimuat
  const lowered = hasOwner && head.robots !== 'index,follow';
  if (catalog === 'error' && lowered) return false;
  if (isGuidesPath(pathname)) {
    if (guides === 'loading') return false;
    if (guides === 'error' && lowered) return false;
  }
  return true;
}
