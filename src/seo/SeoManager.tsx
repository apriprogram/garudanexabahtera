// Pengatur head host utama di klien (docs/platform/SEO-PLAN.md §5.3 langkah 4).
// - Hanya aktif jika isMainHost(location.hostname): domain pembeli tetap diatur siteHead.ts (SiteHostGate).
// - Membaca useLocation() + data klien (settings, daftar template), lalu applyHead(getHead(path, data)) setiap kali
//   path atau kepalanya berubah. Kepala yang sama tidak diterapkan ulang (judul yang dipasang halaman akun tetap).
// - Selalu merender null dan bekerja di effect: tidak pernah menyebabkan hydration mismatch. Di server (prerender WP2)
//   komponen ini tidak melakukan apa pun; head prerender ditulis renderHeadTags.
// WP2 memasangnya di samping <App/> di dalam router (main.tsx, entry-server.tsx).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { apiGet } from '../lib/api';
import { normalizeTemplate } from '../pages/public/template/useTemplateBySlug';
import { isMainHost } from '../templates/siteHosts';
import type { Template } from '../types/platform';
import { clientSeoData, shouldApplyHead, type CatalogStatus } from './clientData';
import { applyHead } from './head';
import { findSeoModule, getHead } from './routes';
import { normalizePathname } from './paths';

interface CatalogState {
  status: CatalogStatus;
  templates: Template[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Daftar template terbit dari get_templates (request bersama apiGet). Gagal → dicoba lagi saat path berubah. */
function useCatalog(pathname: string): CatalogState {
  const [state, setState] = useState<CatalogState>({ status: 'loading', templates: [] });
  const ready = state.status === 'ready';

  useEffect(() => {
    if (ready) return undefined;
    let alive = true;
    apiGet<{ templates?: unknown }>('get_templates')
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res?.templates) ? res.templates : [];
        setState({
          status: 'ready',
          templates: list
            .filter(isRecord)
            .map((raw) => normalizeTemplate(raw as Partial<Template> & Record<string, unknown>))
            .filter((t) => t.slug),
        });
      })
      .catch(() => {
        if (alive) setState((prev) => (prev.status === 'error' ? prev : { status: 'error', templates: [] }));
      });
    return () => {
      alive = false;
    };
  }, [pathname, ready]);

  return state;
}

function MainHostHead(): null {
  const { pathname } = useLocation();
  const { settings, loaded } = useSiteSettings();
  const catalog = useCatalog(pathname);
  const [builtAt] = useState(() => new Date().toISOString());
  const data = useMemo(() => clientSeoData(settings, catalog.templates, builtAt), [settings, catalog.templates, builtAt]);
  const applied = useRef<string | null>(null);

  useEffect(() => {
    const path = normalizePathname(pathname);
    const head = getHead(path, data);
    const hasOwner = findSeoModule(path) !== null;
    if (!shouldApplyHead({ pathname: path, head, hasOwner, settingsLoaded: loaded, catalog: catalog.status })) return;
    const key = `${path}\n${JSON.stringify(head)}`;
    if (applied.current === key) return;
    applied.current = key;
    applyHead(head);
  }, [pathname, data, loaded, catalog.status]);

  return null;
}

/** Head per halaman host utama. Merender null; di domain pembeli dan di server tidak melakukan apa pun. */
export function SeoManager() {
  const main = typeof window !== 'undefined' && isMainHost(window.location.hostname);
  return main ? <MainHostHead /> : null;
}

export default SeoManager;
