// Pengatur head host utama di klien (docs/platform/SEO-PLAN.md §5.3 langkah 4).
// - Hanya aktif jika isMainHost(location.hostname): domain pembeli tetap diatur siteHead.ts (SiteHostGate).
// - Membaca useLocation() + data klien (settings, daftar template, artikel panduan), lalu applyHead(getHead(path, data)) setiap kali
//   path atau kepalanya berubah. Kepala yang sama tidak diterapkan ulang (judul yang dipasang halaman akun tetap).
// - Template dan artikel panduan dimuat terpisah: get_guides gagal tidak membuang daftar template (JSON-LD beranda,
//   harga, katalog tetap lengkap), dan hanya menahan kepala path /panduan (shouldApplyHead).
// - Selalu merender null dan bekerja di effect: tidak pernah menyebabkan hydration mismatch. Di server (prerender WP2)
//   komponen ini tidak melakukan apa pun; head prerender ditulis renderHeadTags.
// WP2 memasangnya di samping <App/> di dalam router (main.tsx, entry-server.tsx).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { guidesFromApi, type ArticleSummary } from '../content/panduan/core';
import { apiGet } from '../lib/api';
import { normalizeTemplate } from '../pages/public/template/useTemplateBySlug';
import { isMainHost } from '../templates/siteHosts';
import type { Template } from '../types/platform';
import { clientSeoData, shouldApplyHead, type CatalogStatus } from './clientData';
import { applyHead } from './head';
import { findSeoModule, getHead } from './routes';
import { normalizePathname } from './paths';

interface ListState<T> {
  status: CatalogStatus;
  /** Hanya dari request yang berhasil; [] selama dimuat atau setelah gagal. */
  items: T[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const templatesFromApi = (res: unknown): Template[] => {
  const list = isRecord(res) && Array.isArray(res.templates) ? res.templates : [];
  return list
    .filter(isRecord)
    .map((raw) => normalizeTemplate(raw as Partial<Template> & Record<string, unknown>))
    .filter((t) => t.slug);
};

/**
 * Satu daftar dari aksi baca bersama apiGet (get_templates / get_guides), dimuat terpisah: satu aksi gagal tidak
 * membuang daftar lainnya. Gagal → hanya aksi itu yang dicoba lagi saat path berubah; setelah siap tidak diminta ulang.
 * `read` harus stabil (fungsi tingkat modul).
 */
function useSharedList<T>(action: string, read: (res: unknown) => T[], pathname: string): ListState<T> {
  const [state, setState] = useState<ListState<T>>({ status: 'loading', items: [] });
  const ready = state.status === 'ready';

  useEffect(() => {
    if (ready) return undefined;
    let alive = true;
    apiGet<unknown>(action)
      .then((res) => {
        if (alive) setState({ status: 'ready', items: read(res) });
      })
      .catch(() => {
        if (alive) setState((prev) => (prev.status === 'error' ? prev : { status: 'error', items: [] }));
      });
    return () => {
      alive = false;
    };
  }, [action, read, pathname, ready]);

  return state;
}

function MainHostHead(): null {
  const { pathname } = useLocation();
  const { settings, loaded } = useSiteSettings();
  const templates = useSharedList('get_templates', templatesFromApi, pathname);
  const guides = useSharedList<ArticleSummary>('get_guides', guidesFromApi, pathname);
  const [builtAt] = useState(() => new Date().toISOString());
  const data = useMemo(
    () => clientSeoData(settings, templates.items, builtAt, guides.items),
    [settings, templates.items, builtAt, guides.items],
  );
  const applied = useRef<string | null>(null);

  useEffect(() => {
    const path = normalizePathname(pathname);
    const head = getHead(path, data);
    const hasOwner = findSeoModule(path) !== null;
    const decision = { pathname: path, head, hasOwner, settingsLoaded: loaded, catalog: templates.status, guides: guides.status };
    if (!shouldApplyHead(decision)) return;
    const key = `${path}\n${JSON.stringify(head)}`;
    if (applied.current === key) return;
    applied.current = key;
    applyHead(head);
  }, [pathname, data, loaded, templates.status, guides.status]);

  return null;
}

/** Head per halaman host utama. Merender null; di domain pembeli dan di server tidak melakukan apa pun. */
export function SeoManager() {
  const main = typeof window !== 'undefined' && isMainHost(window.location.hostname);
  return main ? <MainHostHead /> : null;
}

export default SeoManager;
