// Data SEO di klien untuk SeoManager (docs/platform/SEO-PLAN.md §5.3 langkah 4): settings (get_settings) dan daftar
// template terbit (get_templates, request bersama apiGet yang juga di-prime prerender WP2), plus aturan kapan head boleh
// diterapkan. Modul murni (tanpa React, tanpa DOM).
import type { Template } from '../types/platform';
import { isAppPath } from './paths';
import type { SeoData, SeoHead } from './types';

export type CatalogStatus = 'loading' | 'ready' | 'error';

/** SeoData dari cache klien. templateBySlug dibangun dari daftar (get_templates mengembalikan baris template lengkap). */
export function clientSeoData(settings: Record<string, unknown>, templates: readonly Template[], builtAt: string): SeoData {
  return {
    settings,
    navbar: [],
    templates: [...templates],
    projects: [],
    templateBySlug: Object.fromEntries(templates.map((t) => [t.slug, t])),
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
  catalog: CatalogStatus;
}

/**
 * Boleh menerapkan head sekarang?
 * - Rute aplikasi: selalu (kepalanya tidak bergantung data; judul halaman akun tetap dipasang halamannya sendiri).
 * - Selain itu tunggu settings dan daftar template selesai dimuat, supaya HTML prerender yang benar tidak sempat
 *   ditimpa kepala 404/noindex hanya karena data belum datang.
 * - Daftar template gagal dimuat: jangan pernah menurunkan halaman milik modul ke noindex (bisa saja hanya karena
 *   datanya tidak ada); kepala index dan 404 sungguhan (tanpa pemilik) tetap diterapkan.
 */
export function shouldApplyHead({ pathname, head, hasOwner, settingsLoaded, catalog }: ApplyDecision): boolean {
  if (isAppPath(pathname)) return true;
  if (!settingsLoaded || catalog === 'loading') return false;
  if (catalog === 'error' && hasOwner && head.robots !== 'index,follow') return false;
  return true;
}
