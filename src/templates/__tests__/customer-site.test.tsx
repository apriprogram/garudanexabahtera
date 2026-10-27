// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/customer-site.test.tsx
// Situs pembeli di domainnya sendiri (CustomerSite, docs/platform/SITE-POSTS-SEO-SPEC.md §3, §6, §7): rute dari path,
// render pertama dari preload backend/site.php (kunci apiUrl dengan urutan parameter yang sama), lalu data terbaru dari
// API; kepala halaman (siteSeo.ts); tulisan tidak ada / path tak dikenal = noindex; jumlah dilihat sekali per sesi;
// gagal → Coba lagi; refresh gagal/tidak sah tidak menimpa preload; situs tidak ada & template tanpa fitur berita;
// garis miring di akhir; daftar beranda kedua jenis di setiap rute; gulir, fokus H1, dan posisi gulir saat kembali.
// Fitur berbayar Berita & Pengumuman (docs/platform/SITE-ADDONS-SPEC.md §6): tidak aktif (`addons.posts` false/tidak ada)
// = berita biasa tanpa permintaan tulisan dan /berita… tidak ditemukan; aktif = section profesional.
// Statistik kunjungan (docs/platform/SITE-STATS-SPEC.md §2): site_visit sekali per rute yang tampil (setelah datanya
// siap), `first` dari penanda sesi gn-site-visit, utm_source halaman pertama, tidak untuk halaman tidak ditemukan.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useEffect } from 'react';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiUrl } from '../../lib/api';
import { primePreload, resetPreload } from '../../lib/preload';
import CustomerSite from '../CustomerSite';
import { buildSiteHead, removeSiteSeoHead } from '../siteSeo';
import type { SitePostPublic, SiteSeoPublic } from '../../types/sitePosts';
import { ANNOUNCEMENTS, NEWS, POST } from './fixtures/sitePosts';

vi.setConfig({ testTimeout: 60_000 });

const DOMAIN = 'smkharapan.sch.id';
/** Situs dengan fitur Berita & Pengumuman aktif (get_site_public `addons.posts`, SITE-ADDONS-SPEC §3). */
const SITE = { id: 7, template_code: 'cakrawala', domain: DOMAIN, content: { brand: { company_name: 'SMK Harapan Bangsa' } }, addons: { posts: true } };
const SEO: SiteSeoPublic = { title: '', description: '', og_image: null, schema_type: '', indexable: true };

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Handler = (params: URLSearchParams, init?: RequestInit) => Response | Promise<Response>;

/** Jawaban API per aksi (bisa diganti per tes). Bawaan: situs aktif, SEO, tulisan fixture. */
let handlers: Record<string, Handler> = {};
const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), 'http://localhost');
  const action = url.searchParams.get('action') ?? '';
  const handler = handlers[action];
  return handler ? handler(url.searchParams, init) : json(404, { error: 'Tidak ada', code: 'NOT_FOUND' });
});

const defaultHandlers = (): Record<string, Handler> => ({
  get_site_public: (q) => (q.get('domain') === DOMAIN ? json(200, { site: SITE }) : json(404, { error: 'Situs tidak ditemukan.', code: 'SITE_NOT_FOUND' })),
  get_site_seo: () => json(200, { seo: SEO }),
  get_site_posts: (q) => {
    const posts = q.get('kind') === 'berita' ? NEWS : ANNOUNCEMENTS;
    return json(200, { posts, total: posts.length });
  },
  get_site_post: (q) => {
    const found: SitePostPublic | undefined = q.get('slug') === POST.slug ? POST : undefined;
    return found ? json(200, { post: found }) : json(404, { error: 'Tulisan tidak ditemukan.', code: 'POST_NOT_FOUND' });
  },
  site_post_view: () => json(200, { views: 5 }),
  site_visit: () => json(200, { success: true }),
});

/** URL GET yang diminta (urutan permintaan). */
const gets = () => fetchMock.mock.calls.filter(([, init]) => !init || init.method !== 'POST').map(([input]) => String(input));
/** Body POST untuk aksi ini (urutan permintaan). */
const posts = (action: string) =>
  fetchMock.mock.calls
    .filter(([input, init]) => init?.method === 'POST' && new URL(String(input), 'http://localhost').searchParams.get('action') === action)
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
/** Jumlah dilihat tulisan (site_post_view) */
const views = () => posts('site_post_view');
/** Statistik kunjungan (site_visit, docs/platform/SITE-STATS-SPEC.md §2) */
const visits = () => posts('site_visit');

/**
 * Template lengkap = DOM besar: kueri role di jsdom lambat (ratusan ms per panggilan), jadi tunggu data lewat selektor
 * CSS yang murah dengan batas waktu longgar, baru periksa role/nama sesudahnya.
 */
const until = (check: () => void) => waitFor(check, { timeout: 15_000 });
const appear = (root: ParentNode, selector: string) => until(() => expect(root.querySelector(selector)).not.toBeNull());

const meta = (key: string) => document.head.querySelector(`[data-site-seo="${key}"]`)?.getAttribute(key === 'canonical' ? 'href' : 'content') ?? null;

/** Lokasi router saat ini dan navigate (mis. -1 = tombol kembali browser). */
const router: { pathname: string; navigate: NavigateFunction | null } = { pathname: '', navigate: null };
function RouterProbe() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    router.pathname = pathname;
    router.navigate = navigate;
  }, [pathname, navigate]);
  return null;
}

const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CustomerSite hostname={DOMAIN} />
      <RouterProbe />
    </MemoryRouter>,
  );

/** Jawaban API yang sudah dikirim selesai diproses. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

/** Preload seperti backend/site.php untuk path ini (kunci = site_api_url). */
const preload = (path: string | null, api: Record<string, unknown>) =>
  primePreload({
    path,
    builtAt: '2026-10-26T01:00:00Z',
    api: {
      [apiUrl('get_site_public', { domain: DOMAIN })]: { site: SITE },
      [apiUrl('get_site_seo', { site_id: 7 })]: { seo: SEO },
      ...api,
    },
  });

beforeEach(() => {
  handlers = defaultHandlers();
  fetchMock.mockClear();
  vi.mocked(window.scrollTo).mockClear();
  vi.stubGlobal('fetch', fetchMock);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  resetPreload();
  removeSiteSeoHead();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('CustomerSite: preload site.php', () => {
  it('tulisan dari preload tampil langsung (tanpa memuat), head sama dengan buildSiteHead, dilihat sekali per sesi', async () => {
    preload('/berita/juara-olimpiade-sains', { [apiUrl('get_site_post', { site_id: 7, slug: POST.slug })]: { post: POST } });
    const { container, unmount } = open('/berita/juara-olimpiade-sains');
    // Render pertama: artikel, bukan layar "Memuat situs"
    expect(screen.queryByText('Memuat situs...')).toBeNull();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1')).toHaveTextContent(POST.title);

    const head = buildSiteHead({ domain: DOMAIN, templateCode: 'cakrawala', content: SITE.content, seo: SEO, route: { kind: 'post', postKind: 'berita', slug: POST.slug }, post: POST });
    expect(document.title).toBe(head.title);
    expect(meta('robots')).toBe('index,follow');
    expect(meta('canonical')).toBe(`https://${DOMAIN}/berita/juara-olimpiade-sains`);
    expect(meta('og:type')).toBe('article');

    // Data terbaru diminta dengan URL yang sama persis dengan kunci preload (urutan parameter spec §4.2)
    await waitFor(() => expect(views()).toHaveLength(1));
    expect(views()[0]).toEqual({ site_id: 7, slug: POST.slug, action: 'site_post_view' });
    await waitFor(() =>
      expect(gets()).toEqual(
        expect.arrayContaining([
          apiUrl('get_site_public', { domain: DOMAIN }),
          apiUrl('get_site_seo', { site_id: 7 }),
          apiUrl('get_site_post', { site_id: 7, slug: POST.slug }),
          apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 12 }),
        ]),
      ),
    );
    // "Berita lainnya" dari daftar yang dimuat sesudahnya
    await until(() => expect(container.querySelector('main section h2')).toHaveTextContent('Berita lainnya'));
    expect(window.sessionStorage.getItem(`gn-site-post-view:7:${POST.slug}`)).toBe('1');

    // Dibuka lagi di sesi yang sama → tidak dihitung lagi
    unmount();
    open('/berita/juara-olimpiade-sains');
    await act(async () => {
      await Promise.resolve();
    });
    expect(views()).toHaveLength(1);
  });

  it('server menjawab 404 (preload path null): tulisan tidak ditemukan tanpa get_site_post, noindex, tidak dihitung', async () => {
    preload(null, {});
    const { container } = open('/berita/sudah-dihapus');
    expect(container.querySelector('h1')).toHaveTextContent('Berita tidak ditemukan');
    expect(meta('robots')).toBe('noindex,follow');
    expect(meta('canonical')).toBeNull();
    expect(document.title).toMatch(/^Halaman tidak ditemukan/);
    await waitFor(() => expect(gets()).toContain(apiUrl('get_site_seo', { site_id: 7 })));
    expect(gets().some((url) => url.includes('get_site_post&'))).toBe(false);
    expect(views()).toHaveLength(0);
  });

  it.each([
    ['jaringan putus', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['jawaban HTML 200 (host/CDN)', () => new Response('<!doctype html><title>Sibuk</title>', { status: 200, headers: { 'Content-Type': 'text/html' } })],
    ['jawaban 500', () => json(500, { error: 'Server error', code: 'SERVER' })],
  ] as [string, Handler][])('refresh gagal (%s) tidak menimpa preload: artikel, index,follow, canonical tetap', async (_, fail) => {
    for (const action of ['get_site_public', 'get_site_seo', 'get_site_posts', 'get_site_post']) handlers[action] = fail;
    preload('/berita/juara-olimpiade-sains', {
      [apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 12 })]: { posts: NEWS, total: 2 },
      [apiUrl('get_site_posts', { site_id: 7, kind: 'pengumuman', limit: 12 })]: { posts: ANNOUNCEMENTS, total: 1 },
      [apiUrl('get_site_post', { site_id: 7, slug: POST.slug })]: { post: POST },
    });
    const { container } = open('/berita/juara-olimpiade-sains');
    await waitFor(() => expect(gets()).toContain(apiUrl('get_site_post', { site_id: 7, slug: POST.slug })));
    await settle();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1')).toHaveTextContent(POST.title);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(meta('robots')).toBe('index,follow');
    expect(meta('canonical')).toBe(`https://${DOMAIN}/berita/juara-olimpiade-sains`);
    expect(meta('og:type')).toBe('article');
    // "Berita lainnya" dari daftar preload
    expect(container.querySelector('main section h2')).toHaveTextContent('Berita lainnya');
  });

  it('refresh daftar berupa HTML 200 → daftar dari preload tetap (bukan daftar kosong + noindex)', async () => {
    handlers.get_site_posts = () => new Response('<html>Sibuk</html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    preload('/berita', {
      [apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 100 })]: { posts: NEWS, total: 2 },
      [apiUrl('get_site_posts', { site_id: 7, kind: 'pengumuman', limit: 12 })]: { posts: ANNOUNCEMENTS, total: 1 },
    });
    const { container } = open('/berita');
    await waitFor(() => expect(gets()).toContain(apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 100 })));
    await settle();
    expect(within(container.querySelector('main')!).getByRole('link', { name: NEWS[0].title })).toHaveAttribute('href', '/berita/juara-olimpiade-sains');
    expect(meta('robots')).toBe('index,follow');
    expect(meta('canonical')).toBe(`https://${DOMAIN}/berita`);
  });

  it('beranda dari preload: kartu berita & pengumuman dari tulisan, tautan <a href> tanpa basePath', () => {
    preload('/', {
      [apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 12 })]: { posts: NEWS, total: 2 },
      [apiUrl('get_site_posts', { site_id: 7, kind: 'pengumuman', limit: 12 })]: { posts: ANNOUNCEMENTS, total: 1 },
    });
    const { container } = open('/');
    const news = container.querySelector<HTMLElement>('[data-tpl-section="news"]')!;
    expect(within(news).getByRole('link', { name: NEWS[0].title })).toHaveAttribute('href', '/berita/juara-olimpiade-sains');
    expect(within(news).getByRole('link', { name: /Lihat semua berita/ })).toHaveAttribute('href', '/berita');
    const ann = container.querySelector<HTMLElement>('[data-tpl-section="announcements"]')!;
    expect(within(ann).getByRole('link', { name: ANNOUNCEMENTS[0].title })).toHaveAttribute('href', '/pengumuman/jadwal-ujian-akhir-semester');
    expect(meta('robots')).toBe('index,follow');
    expect(meta('canonical')).toBe(`https://${DOMAIN}/`);
  });
});

describe('CustomerSite: tanpa preload', () => {
  it('memuat → beranda; klik kartu → halaman tulisan tanpa muat ulang; menu → beranda "/#anchor"', async () => {
    const { container } = open('/');
    expect(screen.getByText('Memuat situs...')).toBeInTheDocument();
    await appear(container, '[data-tpl-section="news"] a[href="/berita/juara-olimpiade-sains"]');
    const card = within(container.querySelector<HTMLElement>('[data-tpl-section="news"]')!).getByRole('link', { name: NEWS[0].title });
    expect(card).toHaveAttribute('href', '/berita/juara-olimpiade-sains');
    fireEvent.click(card);
    await until(() => expect(container.querySelector('h1')).toHaveTextContent(POST.title));
    expect(container.querySelector('[data-site-page="post"]')).not.toBeNull();
    // Langsung ke atas (tanpa animasi) dan fokus ke H1 halaman baru (diumumkan pembaca layar)
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    await waitFor(() => expect(document.activeElement).toBe(container.querySelector('h1')));
    expect(container.querySelector('h1')).toHaveAttribute('tabindex', '-1');
    expect(gets()).toContain(apiUrl('get_site_post', { site_id: 7, slug: POST.slug }));
    await waitFor(() => expect(views()).toHaveLength(1));
    // Remah roti → daftar berita
    fireEvent.click(within(container.querySelector('main')!).getByRole('navigation', { name: 'Breadcrumb' }).querySelector('a[href="/berita"]')!);
    await until(() => expect(container.querySelector('h1')).toHaveTextContent('Berita'));
    expect(container.querySelector('[data-site-page="list"]')).not.toBeNull();
    expect(gets()).toContain(apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 100 }));
    expect(meta('canonical')).toBe(`https://${DOMAIN}/berita`);
    // Menu "Profil" di header → kembali ke beranda dengan hash: digulir ke section, fokus tidak dipindah ke H1
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.click(within(container.querySelector('header')!).getAllByRole('link', { name: 'Profil' })[0]);
    await appear(container, '[data-tpl-section="news"]');
    expect(container.querySelector('[data-site-page]')).toBeNull();
    expect(router.pathname).toBe('/');
    expect(window.scrollTo).not.toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    expect(document.activeElement).not.toBe(container.querySelector('h1'));
  });

  it('tombol kembali dari artikel → posisi gulir beranda dipulihkan, hash tidak digulir ulang', async () => {
    const scrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
    let y = 0;
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y });
    try {
      const { container } = open('/berita');
      await appear(container, 'header a[href="/#tentang"]');
      // Menu → beranda "/#tentang" (digulir ke Profil), lalu pengunjung menggulir sampai Berita. TemplateShell membaca
      // hash dari window.location (MemoryRouter tidak mengubahnya), jadi URL jsdom diisi hash yang sama.
      window.history.replaceState(null, '', '/#tentang');
      fireEvent.click(container.querySelector<HTMLElement>('header a[href="/#tentang"]')!);
      await appear(container, '[data-tpl-section="news"] a[href="/berita/juara-olimpiade-sains"]');
      await until(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
      y = 2400;
      window.dispatchEvent(new Event('scroll'));
      const card = within(container.querySelector<HTMLElement>('[data-tpl-section="news"]')!).getByRole('link', { name: NEWS[0].title });
      fireEvent.click(card);
      await until(() => expect(container.querySelector('h1')).toHaveTextContent(POST.title));
      y = 0;
      window.dispatchEvent(new Event('scroll'));
      vi.mocked(window.scrollTo).mockClear();
      vi.mocked(Element.prototype.scrollIntoView).mockClear();
      act(() => {
        void router.navigate!(-1);
      });
      await appear(container, '[data-tpl-section="news"]');
      expect(router.pathname).toBe('/');
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 2400, behavior: 'instant' });
      await settle();
      await settle();
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    } finally {
      window.history.replaceState(null, '', '/');
      if (scrollY) Object.defineProperty(window, 'scrollY', scrollY);
      else delete (window as { scrollY?: number }).scrollY;
    }
  });

  it('path tak dikenal → "Halaman tidak ditemukan" di dalam template, noindex', async () => {
    const { container } = open('/tentang-kami');
    await until(() => expect(container.querySelector('h1')).toHaveTextContent('Halaman tidak ditemukan'));
    expect(container.querySelector('header')).not.toBeNull();
    // Head diterapkan di effect sesudah render (bisa satu giliran setelah H1 tampil)
    await waitFor(() => expect(meta('robots')).toBe('noindex,follow'));
    expect(meta('canonical')).toBeNull();
  });

  it('daftar gagal dimuat → pesan + Coba lagi meminta ulang', async () => {
    let fail = true;
    handlers.get_site_posts = (q) => {
      if (fail && q.get('limit') === '100') return json(500, { error: 'Server error', code: 'SERVER' });
      return json(200, { posts: ANNOUNCEMENTS, total: 1 });
    };
    const { container } = open('/pengumuman');
    await appear(container, '[role="alert"]');
    const alert = within(container.querySelector('main')!).getByRole('alert');
    expect(container.querySelector('h1')).toHaveTextContent('Pengumuman');
    expect(meta('robots')).toBe('noindex,follow');
    fail = false;
    fireEvent.click(within(alert).getByRole('button', { name: 'Coba lagi' }));
    await appear(container, 'main a[href="/pengumuman/jadwal-ujian-akhir-semester"]');
    expect(within(container.querySelector('main')!).getByRole('link', { name: ANNOUNCEMENTS[0].title })).toHaveAttribute('href', '/pengumuman/jadwal-ujian-akhir-semester');
    expect(meta('robots')).toBe('index,follow');
  });

  it('situs tidak ada → "Situs tidak ditemukan"; template tanpa fitur berita → halaman tidak ditemukan', async () => {
    handlers.get_site_public = () => json(404, { error: 'Situs tidak ditemukan.', code: 'SITE_NOT_FOUND' });
    open('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Situs tidak ditemukan/ })).toBeInTheDocument();
    expect(gets()).toEqual([apiUrl('get_site_public', { domain: DOMAIN }), apiUrl('get_site_public', { domain: `www.${DOMAIN}` })]);
    cleanup();

    handlers = defaultHandlers();
    handlers.get_site_public = () => json(200, { site: { ...SITE, template_code: 'corporate-nexa', content: null } });
    open('/berita');
    expect(await screen.findByRole('heading', { level: 1, name: 'Halaman tidak ditemukan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ke beranda' })).toHaveAttribute('href', '/');
    await waitFor(() => expect(meta('robots')).toBe('noindex,follow'));
    // Head = rute tidak ditemukan, sama dengan 404 site.php (bukan "Berita · …" dengan canonical)
    expect(document.title).toMatch(/^Halaman tidak ditemukan/);
    expect(meta('description')).toMatch(/^Halaman yang Anda cari tidak ada/);
    expect(meta('canonical')).toBeNull();
    expect(gets().some((url) => url.includes('get_site_posts'))).toBe(false);
  });

  it('path bergaris miring di akhir ("/pengumuman/") → diganti "/pengumuman" seperti 301 site.php', async () => {
    const { container } = open('/pengumuman/');
    await until(() => expect(router.pathname).toBe('/pengumuman'));
    await appear(container, '[data-site-page="list"]');
    expect(container.querySelector('h1')).toHaveTextContent('Pengumuman');
    await waitFor(() => expect(meta('canonical')).toBe(`https://${DOMAIN}/pengumuman`));
  });

  it('daftar beranda kedua jenis di setiap rute: menu "Berita" tetap ada di /pengumuman walau daftar CMS kosong', async () => {
    handlers.get_site_public = () => json(200, { site: { ...SITE, content: { ...SITE.content, news: { items: [] } } } });
    const { container } = open('/pengumuman');
    await appear(container, '[data-site-page="list"] a[href="/pengumuman/jadwal-ujian-akhir-semester"]');
    expect(gets()).toEqual(expect.arrayContaining([apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 12 })]));
    await until(() => expect(container.querySelector('header a[href="/#berita"]')).not.toBeNull());
  });

  it('kembali ke beranda saat daftar pengumuman masih dimuat: tidak ada item CMS/demo sekilas', async () => {
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    handlers.get_site_posts = async (q) => {
      if (q.get('kind') === 'pengumuman') await pending;
      const posts = q.get('kind') === 'berita' ? NEWS : ANNOUNCEMENTS;
      return json(200, { posts, total: posts.length });
    };
    const { container } = open('/berita/juara-olimpiade-sains');
    await until(() => expect(container.querySelector('h1')).toHaveTextContent(POST.title));
    fireEvent.click(within(container.querySelector('main')!).getByRole('link', { name: 'Ke beranda' }));
    await appear(container, '[data-tpl-section="news"] a[href="/berita/juara-olimpiade-sains"]');
    // Pengumuman demo template ("Jadwal asesmen …") tidak tampil sambil menunggu
    expect(container.textContent).not.toContain('Jadwal asesmen sumatif');
    release();
    await appear(container, '[data-tpl-section="announcements"] a[href="/pengumuman/jadwal-ujian-akhir-semester"]');
    expect(container.textContent).not.toContain('Jadwal asesmen sumatif');
  });
});

describe('CustomerSite: fitur Berita & Pengumuman tidak aktif', () => {
  it.each([
    ['addons.posts false', { ...SITE, addons: { posts: false } }],
    ['tanpa field addons (backend/preload lama)', { ...SITE, addons: undefined }],
  ])('%s: beranda berita biasa dari item CMS, tanpa get_site_posts', async (_, site) => {
    handlers.get_site_public = () => json(200, { site });
    const { container } = open('/');
    await appear(container, '[data-tpl-section="news"]');
    await settle();
    expect(container.querySelectorAll('[data-pro-section]')).toHaveLength(0);
    expect(container.querySelector('a[href^="/berita"], a[href^="/pengumuman"]')).toBeNull();
    expect(container.textContent).not.toContain(NEWS[0].title);
    expect(gets().some((url) => url.includes('get_site_post'))).toBe(false);
    expect(gets()).toContain(apiUrl('get_site_seo', { site_id: 7 }));
    expect(meta('canonical')).toBe(`https://${DOMAIN}/`);
  });

  it('/berita dan tulisan → "Halaman tidak ditemukan" (head notfound, noindex), tanpa permintaan tulisan & tanpa hitung dilihat', async () => {
    handlers.get_site_public = () => json(200, { site: { ...SITE, addons: { posts: false } } });
    for (const path of ['/berita', '/pengumuman/jadwal-ujian-akhir-semester']) {
      open(path);
      expect(await screen.findByRole('heading', { level: 1, name: 'Halaman tidak ditemukan' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Ke beranda' })).toHaveAttribute('href', '/');
      await waitFor(() => expect(meta('robots')).toBe('noindex,follow'));
      expect(document.title).toMatch(/^Halaman tidak ditemukan/);
      expect(meta('canonical')).toBeNull();
      cleanup();
    }
    await settle();
    expect(gets().some((url) => url.includes('get_site_post'))).toBe(false);
    expect(views()).toHaveLength(0);
  });

  it('fitur aktif: beranda memakai section profesional bersama', async () => {
    const { container } = open('/');
    await appear(container, '[data-pro-section="news"] a[href="/berita/juara-olimpiade-sains"]');
    expect(container.querySelector('[data-pro-section="announcements"] a[href="/pengumuman/jadwal-ujian-akhir-semester"]')).not.toBeNull();
  });
});

describe('CustomerSite: statistik kunjungan (site_visit, docs/platform/SITE-STATS-SPEC.md §2)', () => {
  it('sekali per rute yang tampil: beranda (first, utm halaman pertama, referrer, keepalive), tulisan, daftar; hash di beranda tidak dihitung', async () => {
    Object.defineProperty(document, 'referrer', { configurable: true, get: () => 'https://www.google.com/' });
    try {
      const { container } = open('/?utm_source=instagram');
      await appear(container, '[data-tpl-section="news"] a[href="/berita/juara-olimpiade-sains"]');
      await waitFor(() => expect(visits()).toHaveLength(1));
      expect(visits()[0]).toEqual({ action: 'site_visit', site_id: 7, path: '/', referrer: 'https://www.google.com/', utm_source: 'instagram', first: true });
      const [url, init] = fetchMock.mock.calls.find(([input]) => String(input).includes('action=site_visit'))!;
      expect(String(url)).toBe('/api.php?action=site_visit');
      expect(init).toMatchObject({ method: 'POST', keepalive: true });
      expect(window.sessionStorage.getItem('gn-site-visit')).toBe('1');

      // Tulisan: dihitung setelah tulisannya tampil, bukan halaman pertama lagi, utm tetap dari halaman pertama
      fireEvent.click(within(container.querySelector<HTMLElement>('[data-tpl-section="news"]')!).getByRole('link', { name: NEWS[0].title }));
      await until(() => expect(container.querySelector('h1')).toHaveTextContent(POST.title));
      await waitFor(() => expect(visits()).toHaveLength(2));
      expect(visits()[1]).toEqual({ action: 'site_visit', site_id: 7, path: '/berita/juara-olimpiade-sains', referrer: 'https://www.google.com/', utm_source: 'instagram', first: false });

      // Daftar berita lewat remah roti
      fireEvent.click(within(container.querySelector('main')!).getByRole('navigation', { name: 'Breadcrumb' }).querySelector('a[href="/berita"]')!);
      await appear(container, '[data-site-page="list"]');
      await waitFor(() => expect(visits()).toHaveLength(3));
      expect(visits()[2]).toMatchObject({ path: '/berita', first: false });

      // Menu "Profil" → beranda "/#tentang" = rute beranda lagi (dihitung); menu yang sama di beranda = tetap satu
      fireEvent.click(within(container.querySelector('header')!).getAllByRole('link', { name: 'Profil' })[0]);
      await appear(container, '[data-tpl-section="news"]');
      await waitFor(() => expect(visits()).toHaveLength(4));
      expect(visits()[3]).toMatchObject({ path: '/', first: false });
      fireEvent.click(within(container.querySelector('header')!).getAllByRole('link', { name: 'Profil' })[0]);
      await settle();
      expect(visits()).toHaveLength(4);
    } finally {
      delete (document as { referrer?: string }).referrer;
    }
  });

  it('tulisan: dikirim setelah tulisannya dimuat; tidak dihitung: path tak dikenal, tulisan tidak ada, fitur tidak aktif', async () => {
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    handlers.get_site_post = async () => {
      await pending;
      return json(200, { post: POST });
    };
    const { container } = open('/berita/juara-olimpiade-sains');
    await appear(container, 'header');
    await settle();
    expect(visits()).toHaveLength(0);
    release();
    await until(() => expect(container.querySelector('h1')).toHaveTextContent(POST.title));
    await waitFor(() => expect(visits()).toHaveLength(1));
    expect(visits()[0]).toMatchObject({ path: '/berita/juara-olimpiade-sains', first: true, utm_source: '', referrer: '' });
    cleanup();
    fetchMock.mockClear();
    handlers = defaultHandlers();

    // Path tak dikenal
    const unknown = open('/tentang-kami');
    await until(() => expect(unknown.container.querySelector('h1')).toHaveTextContent('Halaman tidak ditemukan'));
    await settle();
    cleanup();
    // Tulisan tidak ada: server sudah menjawab 404 (preload path null) / API 404
    preload(null, {});
    const missing = open('/berita/sudah-dihapus');
    expect(missing.container.querySelector('h1')).toHaveTextContent('Berita tidak ditemukan');
    await settle();
    cleanup();
    resetPreload();
    const gone = open('/pengumuman/tidak-ada');
    await until(() => expect(gone.container.querySelector('h1')).toHaveTextContent('Pengumuman tidak ditemukan'));
    await settle();
    cleanup();
    // Fitur Berita & Pengumuman tidak aktif: /berita = tidak ditemukan
    handlers.get_site_public = () => json(200, { site: { ...SITE, addons: { posts: false } } });
    open('/berita');
    expect(await screen.findByRole('heading', { level: 1, name: 'Halaman tidak ditemukan' })).toBeInTheDocument();
    await settle();
    expect(visits()).toHaveLength(0);
  });

  it('garis miring di akhir dihitung sekali (path tujuan); penanda sesi ada → first false; refresh & galat kirim tidak mengulang', async () => {
    const { container } = open('/pengumuman/');
    await until(() => expect(router.pathname).toBe('/pengumuman'));
    await appear(container, '[data-site-page="list"] a[href="/pengumuman/jadwal-ujian-akhir-semester"]');
    await settle();
    expect(visits()).toEqual([{ action: 'site_visit', site_id: 7, path: '/pengumuman', referrer: '', utm_source: '', first: true }]);
    cleanup();
    fetchMock.mockClear();

    // Sesi yang sama (penanda ada), data preload lalu data terbaru, kirim gagal: tetap satu, tanpa galat di halaman
    handlers.site_visit = () => Promise.reject(new TypeError('Failed to fetch'));
    preload('/', {
      [apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 12 })]: { posts: NEWS, total: 2 },
      [apiUrl('get_site_posts', { site_id: 7, kind: 'pengumuman', limit: 12 })]: { posts: ANNOUNCEMENTS, total: 1 },
    });
    const home = open('/');
    await waitFor(() => expect(visits()).toHaveLength(1));
    expect(visits()[0]).toMatchObject({ path: '/', first: false });
    await waitFor(() => expect(gets()).toContain(apiUrl('get_site_seo', { site_id: 7 })));
    await settle();
    await settle();
    expect(visits()).toHaveLength(1);
    expect(home.container.querySelector('[data-tpl-section="news"]')).not.toBeNull();
  });
});
