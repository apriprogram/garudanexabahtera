// Ambil situs aktif lewat `get_site_public` (berdasarkan site_id atau domain). Kontrak: SPEC §6.
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiGet } from '../lib/api';

export interface PublicSite {
  id: number;
  template_code: string;
  domain: string;
  content: unknown;
}

export type SiteLoadState =
  | { status: 'loading' }
  | { status: 'ready'; site: PublicSite }
  | { status: 'notfound' }
  | { status: 'error'; message: string };

export type SiteQuery = { site_id: number } | { domain: string };

const isNotFound = (err: unknown) => err instanceof ApiError && (err.status === 404 || err.status === 400 || err.code === 'SITE_NOT_FOUND');

/** Domain yang dicoba: persis, lalu varian dengan/tanpa "www.". */
const domainCandidates = (domain: string) => {
  const host = domain.trim().toLowerCase().replace(/\.$/, '');
  const alt = host.startsWith('www.') ? host.slice(4) : `www.${host}`;
  return host ? [host, alt] : [];
};

async function fetchSite(query: SiteQuery): Promise<PublicSite | null> {
  const attempts: Record<string, string | number>[] =
    'site_id' in query ? [{ site_id: query.site_id }] : domainCandidates(query.domain).map((domain) => ({ domain }));
  for (const params of attempts) {
    try {
      const data = await apiGet<{ site?: PublicSite }>('get_site_public', params);
      if (data?.site && typeof data.site === 'object' && typeof data.site.template_code === 'string') return data.site;
      return null;
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
  }
  return null;
}

/** `query` null (mis. id tidak valid) → langsung "tidak ditemukan". */
export function useSitePublic(query: SiteQuery | null) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ request: string; state: SiteLoadState } | null>(null);
  const key = query === null ? '' : 'site_id' in query ? `id:${query.site_id}` : `domain:${query.domain}`;
  const request = `${key}#${attempt}`;

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const q: SiteQuery = key.startsWith('id:') ? { site_id: Number(key.slice(3)) } : { domain: key.slice(7) };
    fetchSite(q)
      .then((site) => {
        if (alive) setResult({ request, state: site ? { status: 'ready', site } : { status: 'notfound' } });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const message =
          err instanceof ApiError && err.code === 'NETWORK'
            ? err.message
            : 'Situs belum bisa dimuat karena kendala server. Silakan coba lagi beberapa saat lagi.';
        setResult({ request, state: { status: 'error', message } });
      });
    return () => {
      alive = false;
    };
  }, [key, request]);

  const state: SiteLoadState = !key ? { status: 'notfound' } : result?.request === request ? result.state : { status: 'loading' };
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
