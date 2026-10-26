// Data situs pembeli untuk CustomerSite (domain pembeli) dan SitePreview (/situs/:id):
// - useSitePublic: situs aktif lewat `get_site_public` (site_id atau domain). Kontrak: SPEC §6.
// - useSitePages: SEO situs + berita/pengumuman per rute (docs/platform/SITE-POSTS-SEO-SPEC.md §4.2, §7).
// Render pertama memakai data preload dari backend/site.php (peekApiGet, kunci = apiUrl dengan urutan parameter yang
// SAMA dengan site_api_url di site.php), lalu data terbaru diminta ke server. Gagal menyegarkan data preload → data
// preload tetap dipakai.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { ApiError, apiGet, apiPost, apiUrl, peekApiGet } from '../lib/api';
import type { SiteRoute } from './siteRoutes';
import { siteHref, type SiteData, type SitePostsByKind } from './shared/siteData';
import { SITE_POST_KINDS, type SitePostKind, type SitePostPublic, type SitePostSummary, type SiteSeoPublic } from '../types/sitePosts';

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

const isSite = (value: unknown): value is PublicSite =>
  !!value && typeof value === 'object' && typeof (value as PublicSite).template_code === 'string';

/** Isi JSON sama → objek lama dipertahankan (template & head tidak dirender/diterapkan ulang tanpa perubahan). */
const sameJson = (a: unknown, b: unknown): boolean => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

/** Domain yang dicoba: persis, lalu varian dengan/tanpa "www.". */
const domainCandidates = (domain: string) => {
  const host = domain.trim().toLowerCase().replace(/\.$/, '');
  const alt = host.startsWith('www.') ? host.slice(4) : `www.${host}`;
  return host ? [host, alt] : [];
};

const siteAttempts = (query: SiteQuery): Record<string, string | number>[] =>
  'site_id' in query ? [{ site_id: query.site_id }] : domainCandidates(query.domain).map((domain) => ({ domain }));

/** Situs dari preload site.php (kunci get_site_public {domain}); tidak ada → null. */
function peekSite(query: SiteQuery | null): PublicSite | null {
  if (!query) return null;
  for (const params of siteAttempts(query)) {
    const site = peekApiGet<{ site?: unknown }>('get_site_public', params)?.site;
    if (isSite(site)) return site;
  }
  return null;
}

async function fetchSite(query: SiteQuery): Promise<PublicSite | null> {
  for (const params of siteAttempts(query)) {
    try {
      const data = await apiGet<{ site?: unknown }>('get_site_public', params);
      return isSite(data?.site) ? data.site : null;
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
  }
  return null;
}

const queryKey = (query: SiteQuery | null) => (query === null ? '' : 'site_id' in query ? `id:${query.site_id}` : `domain:${query.domain}`);

/** `query` null (mis. id tidak valid) → langsung "tidak ditemukan". */
export function useSitePublic(query: SiteQuery | null) {
  const [attempt, setAttempt] = useState(0);
  const key = queryKey(query);
  const request = `${key}#${attempt}`;
  const [result, setResult] = useState<{ request: string; state: SiteLoadState } | null>(() => {
    const site = peekSite(query);
    return site ? { request, state: { status: 'ready', site } } : null;
  });

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const q: SiteQuery = key.startsWith('id:') ? { site_id: Number(key.slice(3)) } : { domain: key.slice(7) };
    fetchSite(q)
      .then((site) => {
        if (!alive) return;
        setResult((prev) => {
          const kept = prev?.request === request && prev.state.status === 'ready' ? prev.state.site : null;
          if (site && kept && sameJson(kept, site)) return prev;
          return { request, state: site ? { status: 'ready', site } : { status: 'notfound' } };
        });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const message =
          err instanceof ApiError && err.code === 'NETWORK'
            ? err.message
            : 'Situs belum bisa dimuat karena kendala server. Silakan coba lagi beberapa saat lagi.';
        // Data preload sudah tampil → tetap dipakai
        setResult((prev) => (prev?.request === request && prev.state.status === 'ready' ? prev : { request, state: { status: 'error', message } }));
      });
    return () => {
      alive = false;
    };
  }, [key, request]);

  const state: SiteLoadState = !key ? { status: 'notfound' } : result?.request === request ? result.state : { status: 'loading' };
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}

// ─── SEO & tulisan per rute ─────────────────────────────────────────────────

/** Jumlah tulisan di beranda & halaman daftar: SAMA dengan SITE_HOME_POSTS_LIMIT / SITE_LIST_POSTS_LIMIT (site.php). */
export const HOME_POSTS_LIMIT = 12;
export const LIST_POSTS_LIMIT = 100;

type Params = Record<string, string | number>;
interface Request {
  action: 'get_site_seo' | 'get_site_posts' | 'get_site_post';
  params: Params;
}

// Urutan parameter = urutan kunci preload site.php (spec §4.2): site_id, kind, limit / site_id, slug
const seoRequest = (siteId: number): Request => ({ action: 'get_site_seo', params: { site_id: siteId } });
const postsRequest = (siteId: number, kind: SitePostKind, limit: number): Request => ({ action: 'get_site_posts', params: { site_id: siteId, kind, limit } });
const postRequest = (siteId: number, slug: string): Request => ({ action: 'get_site_post', params: { site_id: siteId, slug } });
const urlOf = (req: Request) => apiUrl(req.action, req.params);

type Entry = { status: 'ready'; data: unknown } | { status: 'error'; error: unknown };

const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});

const isPostSummary = (value: unknown): value is SitePostSummary => {
  const p = asRecord(value);
  return typeof p.slug === 'string' && typeof p.title === 'string' && (SITE_POST_KINDS as readonly unknown[]).includes(p.kind);
};

/** Respons get_site_posts → daftar tulisan yang sah + total. */
function readList(data: unknown): { posts: SitePostSummary[]; total: number } {
  const body = asRecord(data);
  const posts = Array.isArray(body.posts) ? body.posts.filter(isPostSummary) : [];
  const total = typeof body.total === 'number' && Number.isFinite(body.total) ? body.total : posts.length;
  return { posts, total: Math.max(total, posts.length) };
}

const errorMessage = (err: unknown) =>
  err instanceof ApiError && err.code === 'NETWORK' ? err.message : 'Halaman ini belum bisa dimuat karena kendala server. Silakan coba lagi beberapa saat lagi.';

/** Permintaan yang dibutuhkan rute ini. `primary` = data utama halaman (gagal → pesan + Coba lagi). */
function requestsFor(siteId: number, route: SiteRoute, posts: boolean, skipPost: boolean): { all: Request[]; primary: Request[] } {
  const seo = seoRequest(siteId);
  if (!posts) return { all: [seo], primary: [] };
  if (route.kind === 'home') return { all: [seo, ...SITE_POST_KINDS.map((kind) => postsRequest(siteId, kind, HOME_POSTS_LIMIT))], primary: [] };
  if (route.kind === 'list') {
    const list = postsRequest(siteId, route.postKind, LIST_POSTS_LIMIT);
    return { all: [seo, list], primary: [list] };
  }
  if (route.kind === 'post') {
    if (skipPost) return { all: [seo], primary: [] };
    const post = postRequest(siteId, route.slug);
    // Daftar jenis yang sama untuk "tulisan lainnya" (kunci beranda: sering sudah dimuat); gagal → tanpa daftar itu
    const related = postsRequest(siteId, route.postKind, HOME_POSTS_LIMIT);
    return { all: [seo, post, related], primary: [post] };
  }
  return { all: [seo], primary: [] };
}

export interface SitePagesOptions {
  /** Template berfitur tulisan (TemplateDefinition.features.posts) */
  posts: boolean;
  /** Server sudah menjawab 404 untuk rute awal ini (preload path null): tulisan = null tanpa meminta API */
  missing?: boolean;
}

export interface SitePages {
  seo: SiteSeoPublic | null;
  /** Isi SiteDataContext tanpa basePath & navigate */
  data: Omit<SiteData, 'basePath' | 'navigate'>;
  /** Rute daftar: jumlah tulisan terbit (untuk robots, siteSeo.ts) */
  listCount: number | undefined;
}

/** SEO situs + tulisan untuk rute ini. `siteId` null = situs belum siap (tanpa permintaan). */
export function useSitePages(siteId: number | null, route: SiteRoute, options: SitePagesOptions): SitePages {
  const { posts: hasPosts, missing = false } = options;
  const [cache, setCache] = useState<Record<string, Entry>>({});
  const [attempt, setAttempt] = useState(0);
  const started = useRef(new Set<string>());
  const skipPost = route.kind === 'post' && missing;
  const requests = useMemo(
    () => (siteId === null ? { all: [], primary: [] } : requestsFor(siteId, route, hasPosts, skipPost)),
    [siteId, route, hasPosts, skipPost],
  );
  const wanted = requests.all.map(urlOf).join('\n');

  useEffect(() => {
    for (const req of requests.all) {
      const url = urlOf(req);
      if (started.current.has(url)) continue;
      started.current.add(url);
      apiGet<unknown>(req.action, req.params)
        .then((data) => {
          setCache((prev) => {
            const old = prev[url];
            if (old?.status === 'ready' && sameJson(old.data, data)) return prev;
            // Sama dengan data preload yang sedang tampil → tidak ada yang berubah (template & head tidak dirender ulang)
            if (!old && sameJson(peekApiGet<unknown>(req.action, req.params), data)) return prev;
            return { ...prev, [url]: { status: 'ready', data } };
          });
        })
        .catch((error: unknown) => {
          // Data yang sudah ada (preload / permintaan sebelumnya) tetap dipakai
          setCache((prev) => (prev[url]?.status === 'ready' ? prev : { ...prev, [url]: { status: 'error', error } }));
        });
    }
    // `wanted` mewakili requests.all; attempt = Coba lagi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, attempt]);

  const retry = useCallback(() => {
    for (const req of requests.primary) started.current.delete(urlOf(req));
    setCache((prev) => {
      const next = { ...prev };
      for (const req of requests.primary) if (next[urlOf(req)]?.status === 'error') delete next[urlOf(req)];
      return next;
    });
    setAttempt((n) => n + 1);
  }, [requests]);

  return useMemo(() => {
    /** Entri cache, atau data preload site.php untuk URL ini */
    const entry = (req: Request): Entry | undefined => {
      const url = urlOf(req);
      if (cache[url]) return cache[url];
      const peeked = peekApiGet<unknown>(req.action, req.params);
      return peeked === undefined ? undefined : { status: 'ready', data: peeked };
    };
    const list = (req: Request) => {
      const e = entry(req);
      return e?.status === 'ready' ? readList(e.data) : null;
    };
    const failure = (req: Request) => {
      const e = entry(req);
      return e?.status === 'error' ? e.error : null;
    };
    /** Daftar jenis ini yang sudah ada (batas berapa pun), yang terpanjang */
    const anyList = (kind: SitePostKind) => {
      if (siteId === null) return null;
      const lists = [LIST_POSTS_LIMIT, HOME_POSTS_LIMIT].map((limit) => list(postsRequest(siteId, kind, limit)));
      return lists.find((l) => l !== null) ?? null;
    };

    const empty: SitePostsByKind = { berita: null, pengumuman: null };
    const seoBody = siteId === null ? null : entry(seoRequest(siteId));
    const seoValue = seoBody?.status === 'ready' ? asRecord(seoBody.data).seo : null;
    const seo = seoValue && typeof seoValue === 'object' ? (seoValue as SiteSeoPublic) : null;
    const data: Omit<SiteData, 'basePath' | 'navigate'> = { route, posts: empty, post: undefined, error: null };
    let listCount: number | undefined;
    if (siteId === null || !hasPosts) return { seo, data, listCount };

    const errorOf = (err: unknown) => ({ message: errorMessage(err), retry });
    if (route.kind === 'home') {
      data.posts = { berita: anyList('berita')?.posts ?? null, pengumuman: anyList('pengumuman')?.posts ?? null };
    } else if (route.kind === 'list') {
      const req = postsRequest(siteId, route.postKind, LIST_POSTS_LIMIT);
      const full = list(req);
      // Daftar beranda yang sudah lengkap (semua tulisan muat) dipakai sambil menunggu
      const home = list(postsRequest(siteId, route.postKind, HOME_POSTS_LIMIT));
      const shown = full ?? (home && home.posts.length >= home.total ? home : null);
      const err = failure(req);
      data.posts = { ...empty, [route.postKind]: shown ? shown.posts : err && isNotFound(err) ? [] : null };
      data.total = shown?.total ?? 0;
      listCount = shown ? shown.total : 0;
      if (!shown && err && !isNotFound(err)) data.error = errorOf(err);
    } else if (route.kind === 'post') {
      data.posts = { ...empty, [route.postKind]: anyList(route.postKind)?.posts ?? null };
      if (skipPost) data.post = null;
      else {
        const req = postRequest(siteId, route.slug);
        const e = entry(req);
        if (e?.status === 'ready') {
          const post = asRecord(e.data).post as SitePostPublic | undefined;
          data.post = isPostSummary(post) && post.kind === route.postKind && post.slug === route.slug ? post : null;
        } else if (e?.status === 'error') {
          if (isNotFound(e.error)) data.post = null;
          else data.error = errorOf(e.error);
        }
      }
    }
    return { seo, data, listCount };
  }, [cache, siteId, route, hasPosts, skipPost, retry]);
}

// ─── Navigasi ───────────────────────────────────────────────────────────────

/**
 * Pindah halaman di dalam situs tanpa memuat ulang (SiteDataContext.navigate): path relatif akar situs → path router
 * dengan awalan basePath. Setelah pindah halaman lewat tautan (PUSH/REPLACE) tanpa hash, gulir ke atas; tombol
 * kembali/maju browser (POP) dibiarkan. Hash ("/#berita") digulir oleh TemplateShell.
 */
export function useSiteNavigate(basePath: string): (path: string) => void {
  const routerNavigate = useNavigate();
  const { pathname, hash } = useLocation();
  const type = useNavigationType();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (type !== 'POP' && !hash && typeof window !== 'undefined') window.scrollTo(0, 0);
    // Hanya saat path berubah
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return useCallback((path: string) => routerNavigate(siteHref(basePath, path)), [routerNavigate, basePath]);
}

// ─── Jumlah dilihat ─────────────────────────────────────────────────────────

/** Cadangan bila sessionStorage tidak bisa dipakai: sekali per muat halaman. */
const viewedInMemory = new Set<string>();

/**
 * Catat satu kali lihat tulisan (site_post_view) sekali per sesi browser per tulisan. sessionStorage bisa tidak ada
 * (mode privat, diblokir) → cadangan di memori halaman ini. Gagal mengirim tidak mengganggu pengunjung.
 */
export function countPostView(siteId: number, slug: string): void {
  const key = `gn-site-post-view:${siteId}:${slug}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
  } catch {
    if (viewedInMemory.has(key)) return;
    viewedInMemory.add(key);
  }
  apiPost('site_post_view', { site_id: siteId, slug }).catch(() => undefined);
}
