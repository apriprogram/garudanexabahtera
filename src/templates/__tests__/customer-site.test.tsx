// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/customer-site.test.tsx
// Situs pembeli di domainnya sendiri (CustomerSite, docs/platform/SITE-POSTS-SEO-SPEC.md §3, §6, §7): rute dari path,
// render pertama dari preload backend/site.php (kunci apiUrl dengan urutan parameter yang sama), lalu data terbaru dari
// API; kepala halaman (siteSeo.ts); tulisan tidak ada / path tak dikenal = noindex; jumlah dilihat sekali per sesi;
// gagal → Coba lagi; situs tidak ada & template tanpa fitur berita.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiUrl } from '../../lib/api';
import { primePreload, resetPreload } from '../../lib/preload';
import CustomerSite from '../CustomerSite';
import { buildSiteHead, removeSiteSeoHead } from '../siteSeo';
import type { SitePostPublic, SiteSeoPublic } from '../../types/sitePosts';
import { ANNOUNCEMENTS, NEWS, POST } from './fixtures/sitePosts';

vi.setConfig({ testTimeout: 60_000 });

const DOMAIN = 'smkharapan.sch.id';
const SITE = { id: 7, template_code: 'cakrawala', domain: DOMAIN, content: { brand: { company_name: 'SMK Harapan Bangsa' } } };
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
});

/** URL GET yang diminta (urutan permintaan). */
const gets = () => fetchMock.mock.calls.filter(([, init]) => !init || init.method !== 'POST').map(([input]) => String(input));
const views = () =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);

/**
 * Template lengkap = DOM besar: kueri role di jsdom lambat (ratusan ms per panggilan), jadi tunggu data lewat selektor
 * CSS yang murah dengan batas waktu longgar, baru periksa role/nama sesudahnya.
 */
const until = (check: () => void) => waitFor(check, { timeout: 15_000 });
const appear = (root: ParentNode, selector: string) => until(() => expect(root.querySelector(selector)).not.toBeNull());

const meta = (key: string) => document.head.querySelector(`[data-site-seo="${key}"]`)?.getAttribute(key === 'canonical' ? 'href' : 'content') ?? null;

const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CustomerSite hostname={DOMAIN} />
    </MemoryRouter>,
  );

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
    expect(gets()).toContain(apiUrl('get_site_post', { site_id: 7, slug: POST.slug }));
    await waitFor(() => expect(views()).toHaveLength(1));
    // Remah roti → daftar berita
    fireEvent.click(within(container.querySelector('main')!).getByRole('navigation', { name: 'Breadcrumb' }).querySelector('a[href="/berita"]')!);
    await until(() => expect(container.querySelector('h1')).toHaveTextContent('Berita'));
    expect(container.querySelector('[data-site-page="list"]')).not.toBeNull();
    expect(gets()).toContain(apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 100 }));
    expect(meta('canonical')).toBe(`https://${DOMAIN}/berita`);
    // Menu "Profil" di header → kembali ke beranda dengan hash
    fireEvent.click(within(container.querySelector('header')!).getAllByRole('link', { name: 'Profil' })[0]);
    await appear(container, '[data-tpl-section="news"]');
    expect(container.querySelector('[data-site-page]')).toBeNull();
  });

  it('path tak dikenal → "Halaman tidak ditemukan" di dalam template, noindex', async () => {
    const { container } = open('/tentang-kami');
    await until(() => expect(container.querySelector('h1')).toHaveTextContent('Halaman tidak ditemukan'));
    expect(container.querySelector('header')).not.toBeNull();
    expect(meta('robots')).toBe('noindex,follow');
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
    expect(gets().some((url) => url.includes('get_site_posts'))).toBe(false);
  });
});
