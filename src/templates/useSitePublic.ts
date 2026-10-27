// Data situs pembeli untuk CustomerSite (domain pembeli) dan SitePreview (/situs/:id):
// - useSitePublic: situs aktif lewat `get_site_public` (site_id atau domain). Kontrak: SPEC §6. `site.addons.posts`
//   (docs/platform/SITE-ADDONS-SPEC.md §3) = fitur Berita & Pengumuman aktif → sitePostsEnabled().
// - useSitePages: SEO situs + berita/pengumuman per rute (docs/platform/SITE-POSTS-SEO-SPEC.md §4.2, §7). Tulisan hanya
//   diminta bila fitur aktif; tidak aktif = berita biasa dari konten CMS (tanpa get_site_posts/get_site_post).
// Render pertama memakai data preload dari backend/site.php (peekApiGet, kunci = apiUrl dengan urutan parameter yang
// SAMA dengan site_api_url di site.php), lalu data terbaru diminta ke server. Gagal menyegarkan data preload (jaringan,
// 5xx, atau jawaban yang bukan bentuk API seperti halaman HTML dari host/CDN) → data preload tetap dipakai.
// - useSiteNavigate: pindah halaman tanpa memuat ulang + gulir, fokus, dan posisi gulir per entri riwayat.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { ApiError, apiGet, apiPost, apiUrl, peekApiGet } from '../lib/api';
import { getTemplate } from './index';
import type { SiteRoute } from './siteRoutes';
import { siteHref, type SiteData, type SitePostsByKind } from './shared/siteData';
import { SITE_POST_KINDS, type SitePostKind, type SitePostPublic, type SitePostSummary, type SiteSeoPublic } from '../types/sitePosts';
import type { SiteAddonFlags } from '../types/siteAddons';

export interface PublicSite {
  id: number;
  template_code: string;
  domain: string;
  content: unknown;
  /** Fitur tambahan aktif (get_site_public); tidak ada = tidak aktif */
  addons?: Partial<SiteAddonFlags> | null;
}

/**
 * Fitur Berita & Pengumuman aktif untuk situs ini: template mampu (features.posts) DAN `addons.posts === true`. Field
 * tidak ada (backend lama, preload lama) = tidak aktif, sama dengan site.php.
 */
export const sitePostsEnabled = (site: Pick<PublicSite, 'template_code' | 'addons'> | null | undefined): boolean =>
  !!site && getTemplate(site.template_code)?.features?.posts === true && site.addons?.posts === true;

const ORIGIN_DOMAIN = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;

/** Domain tersimpan → "https://domain" (dasar URL kanonis, tombol bagikan); tidak sah → null. */
export function siteOriginOf(domain: unknown): string | null {
  const value = typeof domain === 'string' ? domain.trim().toLowerCase() : '';
  return ORIGIN_DOMAIN.test(value) ? `https://${value}` : null;
}

export type SiteLoadState =
  | { status: 'loading' }
  | { status: 'ready'; site: PublicSite }
  | { status: 'notfound' }
  | { status: 'error'; message: string };

export type SiteQuery = { site_id: number } | { domain: string };

const isNotFound = (err: unknown) => err instanceof ApiError && (err.status === 404 || err.status === 400 || err.code === 'SITE_NOT_FOUND');

/** Jawaban 2xx yang bukan bentuk API (mis. halaman HTML dari host/CDN/WAF → null): gagal, bukan "tidak ada". */
const invalidResponse = () => new ApiError('Jawaban server tidak sah.', 200, 'INVALID_RESPONSE');

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
      // Situs yang tidak ada dijawab 404 (SITE_NOT_FOUND); jawaban lain tanpa situs = gagal (data preload tetap dipakai)
      if (!isSite(data?.site)) throw invalidResponse();
      return data.site;
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

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const asRecord = (value: unknown): Record<string, unknown> => (isObject(value) ? value : {});

const isPostSummary = (value: unknown): value is SitePostSummary => {
  const p = asRecord(value);
  return typeof p.slug === 'string' && typeof p.title === 'string' && (SITE_POST_KINDS as readonly unknown[]).includes(p.kind);
};

/**
 * Jawaban berbentuk API untuk aksi ini: {seo: {…}}, {posts: […]}, {post: {…}}. Selain itu (null dari jawaban 2xx yang
 * bukan JSON, objek lain) = gagal, bukan "tidak ada tulisan": tidak pernah menimpa data yang sudah tampil.
 */
function isValidBody(action: Request['action'], data: unknown): boolean {
  if (!isObject(data)) return false;
  if (action === 'get_site_seo') return isObject(data.seo);
  if (action === 'get_site_posts') return Array.isArray(data.posts);
  return isPostSummary(data.post);
}

/** Data preload site.php yang sah untuk permintaan ini, atau undefined. */
function preloaded(req: Request): unknown {
  const data = peekApiGet<unknown>(req.action, req.params);
  return data !== undefined && isValidBody(req.action, data) ? data : undefined;
}

/** Respons get_site_posts → daftar tulisan yang sah + total. */
function readList(data: unknown): { posts: SitePostSummary[]; total: number } {
  const body = asRecord(data);
  const posts = Array.isArray(body.posts) ? body.posts.filter(isPostSummary) : [];
  const total = typeof body.total === 'number' && Number.isFinite(body.total) ? body.total : posts.length;
  return { posts, total: Math.max(total, posts.length) };
}

const errorMessage = (err: unknown) =>
  err instanceof ApiError && err.code === 'NETWORK' ? err.message : 'Halaman ini belum bisa dimuat karena kendala server. Silakan coba lagi beberapa saat lagi.';

/**
 * Permintaan yang dibutuhkan rute ini. `primary` = data utama halaman (gagal → pesan + Coba lagi). Di SETIAP rute
 * template berfitur tulisan, daftar beranda kedua jenis (limit 12) ikut diminta: menu & footer (yang membaca daftar itu)
 * sama di semua halaman, "tulisan lainnya" di halaman tulisan, dan kembali ke beranda tanpa menunggu. Halaman daftar
 * memakai daftarnya sendiri (limit 100) untuk jenis itu. site.php mempreload kunci yang sama (spec §6).
 */
function requestsFor(siteId: number, route: SiteRoute, posts: boolean, skipPost: boolean): { all: Request[]; primary: Request[] } {
  const seo = seoRequest(siteId);
  if (!posts) return { all: [seo], primary: [] };
  const homeLists = (except?: SitePostKind) =>
    SITE_POST_KINDS.filter((kind) => kind !== except).map((kind) => postsRequest(siteId, kind, HOME_POSTS_LIMIT));
  if (route.kind === 'list') {
    const list = postsRequest(siteId, route.postKind, LIST_POSTS_LIMIT);
    return { all: [seo, list, ...homeLists(route.postKind)], primary: [list] };
  }
  if (route.kind === 'post' && !skipPost) {
    const post = postRequest(siteId, route.slug);
    return { all: [seo, post, ...homeLists()], primary: [post] };
  }
  return { all: [seo, ...homeLists()], primary: [] };
}

export interface SitePagesOptions {
  /** Fitur Berita & Pengumuman aktif (sitePostsEnabled): false = tanpa permintaan tulisan, SiteData.postsEnabled false */
  posts: boolean;
  /** Server sudah menjawab 404 untuk rute awal ini (preload path null): tulisan = null tanpa meminta API */
  missing?: boolean;
}

export interface SitePages {
  seo: SiteSeoPublic | null;
  /** Isi SiteDataContext tanpa basePath, navigate & siteOrigin */
  data: Omit<SiteData, 'basePath' | 'navigate' | 'siteOrigin'>;
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
          if (!isValidBody(req.action, data)) throw invalidResponse();
          setCache((prev) => {
            const old = prev[url];
            if (old?.status === 'ready' && sameJson(old.data, data)) return prev;
            // Sama dengan data preload yang sedang tampil → tidak ada yang berubah (template & head tidak dirender ulang)
            if (!old && sameJson(preloaded(req), data)) return prev;
            return { ...prev, [url]: { status: 'ready', data } };
          });
        })
        .catch((error: unknown) => {
          // Data yang sudah ada (permintaan sebelumnya, atau preload site.php yang tidak pernah masuk cache) tetap dipakai:
          // halaman yang sudah dilayani server tidak berganti layar gagal / noindex karena satu refresh gagal
          setCache((prev) =>
            prev[url]?.status === 'ready' || (!prev[url] && preloaded(req) !== undefined) ? prev : { ...prev, [url]: { status: 'error', error } },
          );
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
    /** Entri cache, atau data preload site.php untuk URL ini; undefined = belum ada jawaban (masih dimuat) */
    const entry = (req: Request): Entry | undefined => {
      const url = urlOf(req);
      if (cache[url]) return cache[url];
      const data = preloaded(req);
      return data === undefined ? undefined : { status: 'ready', data };
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
    /**
     * Tulisan jenis ini untuk beranda, menu, footer, dan "tulisan lainnya": daftar yang sudah ada (cache/preload); daftar
     * beranda masih dimuat → undefined (section kosong dulu, bukan item CMS/demo); gagal → null (daftar dari konten CMS).
     */
    const homePosts = (kind: SitePostKind): SitePostSummary[] | null | undefined => {
      const found = anyList(kind);
      if (found) return found.posts;
      return siteId !== null && failure(postsRequest(siteId, kind, HOME_POSTS_LIMIT)) ? null : undefined;
    };

    const empty: SitePostsByKind = { berita: null, pengumuman: null };
    const seoBody = siteId === null ? null : entry(seoRequest(siteId));
    const seoValue = seoBody?.status === 'ready' ? asRecord(seoBody.data).seo : null;
    const seo = seoValue && typeof seoValue === 'object' ? (seoValue as SiteSeoPublic) : null;
    const data: SitePages['data'] = { route, postsEnabled: siteId !== null && hasPosts, posts: empty, post: undefined, error: null };
    let listCount: number | undefined;
    if (siteId === null || !hasPosts) return { seo, data, listCount };

    const errorOf = (err: unknown) => ({ message: errorMessage(err), retry });
    data.posts = { berita: homePosts('berita'), pengumuman: homePosts('pengumuman') };
    if (route.kind === 'list') {
      const req = postsRequest(siteId, route.postKind, LIST_POSTS_LIMIT);
      const full = list(req);
      // Daftar beranda yang sudah lengkap (semua tulisan muat) dipakai sambil menunggu
      const home = list(postsRequest(siteId, route.postKind, HOME_POSTS_LIMIT));
      const shown = full ?? (home && home.posts.length >= home.total ? home : null);
      const err = failure(req);
      // Daftar halaman ini: null = memuat / gagal (PostList: kerangka atau pesan + Coba lagi)
      data.posts = { ...data.posts, [route.postKind]: shown ? shown.posts : err && isNotFound(err) ? [] : null };
      data.total = shown?.total ?? 0;
      listCount = shown ? shown.total : 0;
      if (!shown && err && !isNotFound(err)) data.error = errorOf(err);
    } else if (route.kind === 'post') {
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

/** Posisi gulir terakhir per entri riwayat (location.key) selama halaman ini dimuat: untuk tombol kembali/maju browser. */
const scrollByEntry = new Map<string, number>();

/** Gulir langsung tanpa animasi (`scroll-behavior: smooth` di <html> tidak ikut). */
const jumpTo = (top: number) => window.scrollTo({ top, behavior: 'instant' });

/**
 * Fokus ke H1 halaman baru setelah pindah halaman lewat tautan: pembaca layar mengumumkan halaman baru dan Tab berikutnya
 * mulai dari isinya, bukan dari awal header. H1 bisa muncul belakangan (kerangka memuat → artikel), jadi ditunggu
 * sebentar. Fokus yang sudah dipindahkan pengunjung sendiri tidak direbut. Hasil = fungsi pembersih.
 */
function focusPageHeading(): () => void {
  const before = document.activeElement;
  const tryFocus = (): boolean => {
    const active = document.activeElement;
    if (active && active !== before && active !== document.body && active.isConnected) return true;
    const heading = document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('h1');
    if (!heading) return false;
    // tabIndex -1: bisa difokus lewat skrip, tidak masuk urutan Tab
    if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    return true;
  };
  if (tryFocus() || typeof MutationObserver !== 'function') return () => undefined;
  let timer = 0;
  const observer = new MutationObserver(() => {
    if (tryFocus()) stop();
  });
  const stop = () => {
    observer.disconnect();
    window.clearTimeout(timer);
  };
  observer.observe(document.body, { childList: true, subtree: true });
  timer = window.setTimeout(stop, 10_000);
  return stop;
}

export interface SiteNavigation {
  /** SiteDataContext.navigate */
  navigate: (path: string) => void;
  /** SiteDataContext.historyPop */
  historyPop: boolean;
}

/**
 * Pindah halaman di dalam situs tanpa memuat ulang (SiteDataContext.navigate): path relatif akar situs → path router
 * dengan awalan basePath.
 * - Lewat tautan (PUSH/REPLACE) tanpa hash: langsung ke atas sebelum halaman baru tampil, lalu fokus ke H1-nya.
 * - Hash ("/#berita"): digulir TemplateShell, fokus tidak dipindah.
 * - Tombol kembali/maju browser (POP): posisi gulir terakhir entri riwayat itu dipulihkan (mis. kembali dari artikel ke
 *   section Berita di beranda), dan `historyPop` mencegah TemplateShell menggulir ulang ke hash-nya.
 * - Tautan ke halaman yang sedang dibuka (tanpa hash): gulir ke atas saja, tanpa entri riwayat ganda.
 */
export function useSiteNavigate(basePath: string): SiteNavigation {
  const routerNavigate = useNavigate();
  const { pathname, hash, key } = useLocation();
  const type = useNavigationType();
  const handled = useRef(pathname);
  const current = useRef({ key, pathname });
  // Sudah pernah pindah halaman lewat tautan di sini: POP sesudahnya = kembali/maju di dalam situs
  const [navigated, setNavigated] = useState(false);

  // Entri yang sedang tampil, untuk pencatat gulir & navigate (diperbarui sebelum gulir di bawah)
  useLayoutEffect(() => {
    current.current = { key, pathname };
  }, [key, pathname]);

  useEffect(() => {
    const record = () => scrollByEntry.set(current.current.key, window.scrollY);
    window.addEventListener('scroll', record, { passive: true });
    return () => window.removeEventListener('scroll', record);
  }, []);

  // Layout effect: posisi gulir sudah benar sebelum halaman baru dilukis (tanpa kilasan di posisi lama)
  useLayoutEffect(() => {
    if (handled.current === pathname) return;
    handled.current = pathname;
    if (type === 'POP') {
      const top = scrollByEntry.get(key);
      if (top !== undefined) jumpTo(top);
      return;
    }
    if (hash) return;
    jumpTo(0);
    return focusPageHeading();
    // Hanya saat path berubah
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const navigate = useCallback(
    (path: string) => {
      const href = siteHref(basePath, path);
      setNavigated(true);
      if (!href.includes('#') && href === current.current.pathname) {
        window.scrollTo({ top: 0 });
        return;
      }
      routerNavigate(href);
    },
    [routerNavigate, basePath],
  );
  return { navigate, historyPop: navigated && type === 'POP' };
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
