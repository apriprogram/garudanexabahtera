// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/public/__tests__/sitePreview.test.tsx
// Pratinjau situs pembeli di host utama (/situs/:siteId/*, docs/platform/SITE-POSTS-SEO-SPEC.md §3, §7): rute di
// dalamnya sama dengan domain pembeli dengan basePath "/situs/{id}", head selalu noindex tanpa canonical, tidak
// menghitung jumlah dilihat, dan semua tag situs pembeli dilepas (ikon shell kembali) saat pratinjau ditutup. URL CMS ke
// halaman situs ("/pengumuman", "/#kontak") ikut diberi awalan pratinjau dan dibuka tanpa muat ulang.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiUrl } from '../../../lib/api';
import { removeSiteSeoHead } from '../../../templates/siteSeo';
import { ANNOUNCEMENTS, NEWS, POST } from '../../../templates/__tests__/fixtures/sitePosts';
import SitePreview from '../SitePreview';

vi.setConfig({ testTimeout: 60_000 });

const SITE = {
  id: 7,
  template_code: 'madani',
  domain: 'smkharapan.sch.id',
  content: { brand: { company_name: 'SMA Harapan Bangsa', logo: '/assets/sites/7/logo_0123456789ab.png' } },
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Konten situs pengganti untuk satu tes (null = SITE.content). */
let contentOverride: Record<string, unknown> | null = null;

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  void init; // dibaca lewat fetchMock.mock.calls (posts())
  const url = new URL(String(input), 'http://localhost');
  const q = url.searchParams;
  switch (q.get('action')) {
    case 'get_site_public':
      return q.get('site_id') === '7'
        ? json(200, { site: contentOverride ? { ...SITE, content: contentOverride } : SITE })
        : json(404, { error: 'Situs tidak ditemukan.', code: 'SITE_NOT_FOUND' });
    case 'get_site_seo':
      return json(200, { seo: { title: '', description: '', og_image: null, schema_type: '', indexable: true } });
    case 'get_site_posts': {
      const posts = q.get('kind') === 'berita' ? NEWS : ANNOUNCEMENTS;
      return json(200, { posts, total: posts.length });
    }
    case 'get_site_post':
      return q.get('slug') === POST.slug ? json(200, { post: POST }) : json(404, { error: 'Tulisan tidak ditemukan.', code: 'POST_NOT_FOUND' });
    default:
      return json(200, { views: 1 });
  }
});

const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/situs/:siteId/*" element={<SitePreview />} />
        <Route path="/" element={<p>Beranda Garuda Nexa</p>} />
      </Routes>
    </MemoryRouter>,
  );

/** Template lengkap = DOM besar: kueri role di jsdom lambat, jadi tunggu lewat selektor CSS dengan batas longgar. */
const until = (check: () => void) => waitFor(check, { timeout: 15_000 });
const appear = (root: ParentNode, selector: string) => until(() => expect(root.querySelector(selector)).not.toBeNull());

const tag = (key: string) => document.head.querySelector(`[data-site-seo="${key}"]`);
const posts = () => fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');

let shellIcon: HTMLLinkElement;
beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  Element.prototype.scrollIntoView = vi.fn();
  // Favicon shell Garuda Nexa (index.html)
  shellIcon = document.createElement('link');
  shellIcon.rel = 'icon';
  shellIcon.href = '/favicon.svg';
  document.head.appendChild(shellIcon);
});
afterEach(() => {
  contentOverride = null;
  cleanup();
  removeSiteSeoHead();
  shellIcon.remove();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('SitePreview: /situs/:siteId/*', () => {
  it('/situs/7/berita/ → daftar dengan basePath, noindex tanpa canonical; klik kartu → tulisan tanpa hitung dilihat', async () => {
    const { container } = open('/situs/7/berita/');
    await appear(container, 'main a[href="/situs/7/berita/juara-olimpiade-sains"]');
    expect(within(container.querySelector('main')!).getByRole('link', { name: NEWS[0].title })).toHaveAttribute('href', '/situs/7/berita/juara-olimpiade-sains');
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1')).toHaveTextContent('Berita');
    expect(screen.getByText(/Pratinjau situs/)).toBeInTheDocument();
    // Bar pratinjau membuka halaman yang sama di domain pembeli
    expect(container.querySelector('a[target="_blank"]')).toHaveAttribute('href', 'https://smkharapan.sch.id/berita');
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Beranda' })).toHaveAttribute('href', '/situs/7');
    // Menu header → beranda pratinjau dengan anchor
    const nav = within(container.querySelector('header')!).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(within(nav).getByRole('link', { name: 'Profil' }).getAttribute('href')).toMatch(/^\/situs\/7\/#/);
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain(apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 100 }));
    await waitFor(() => expect(tag('robots')).toHaveAttribute('content', 'noindex,follow'));
    expect(tag('canonical')).toBeNull();
    expect(document.title).toBe('Berita · SMA Harapan Bangsa');

    fireEvent.click(within(container.querySelector('main')!).getByRole('link', { name: NEWS[0].title }));
    await until(() => expect(container.querySelector('h1')).toHaveTextContent(POST.title));
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', { name: 'Berita' })).toHaveAttribute('href', '/situs/7/berita');
    expect(tag('robots')).toHaveAttribute('content', 'noindex,follow');
    expect(tag('canonical')).toBeNull();
    expect(posts()).toHaveLength(0);
  });

  it('beranda pratinjau memakai tulisan; path tak dikenal → tidak ditemukan; id tidak valid → situs tidak ditemukan', async () => {
    const { container } = open('/situs/7');
    await appear(container, '[data-tpl-section="news"] a[href="/situs/7/berita/juara-olimpiade-sains"]');
    const news = container.querySelector<HTMLElement>('[data-tpl-section="news"]')!;
    expect(within(news).getByRole('link', { name: NEWS[0].title })).toHaveAttribute('href', '/situs/7/berita/juara-olimpiade-sains');
    expect(within(news).getByRole('link', { name: /Lihat semua berita/ })).toHaveAttribute('href', '/situs/7/berita');
    cleanup();

    const missing = open('/situs/7/agenda/x').container;
    await until(() => expect(missing.querySelector('h1')).toHaveTextContent('Halaman tidak ditemukan'));
    expect(within(missing.querySelector('main')!).getByRole('link', { name: /Ke beranda/ })).toHaveAttribute('href', '/situs/7');
    await waitFor(() => expect(tag('robots')).toHaveAttribute('content', 'noindex,follow'));
    cleanup();

    open('/situs/abc/berita');
    expect(await screen.findByRole('heading', { level: 1, name: /Situs tidak ditemukan/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('site_id=abc'))).toBe(false);
  });

  it('URL tombol CMS ke halaman situs: awalan /situs/7 dan tanpa muat ulang; "/#kontak" → gulir di beranda', async () => {
    contentOverride = { ...SITE.content, hero: { secondary_url: '/pengumuman', primary_url: '/#kontak' } };
    const { container } = open('/situs/7');
    await appear(container, '[data-tpl-section="news"] a[href="/situs/7/berita/juara-olimpiade-sains"]');
    const hero = container.querySelector<HTMLElement>('main')!;
    const toList = within(hero).getAllByRole('link', { name: /Profil Sekolah/ })[0];
    expect(toList).toHaveAttribute('href', '/situs/7/pengumuman');
    expect(within(hero).getAllByRole('link', { name: /Daftar PPDB/ })[0]).toHaveAttribute('href', '#kontak');
    fireEvent.click(toList);
    await until(() => expect(container.querySelector('h1')).toHaveTextContent('Pengumuman'));
    expect(container.querySelector('[data-site-page="list"]')).not.toBeNull();
  });

  it('ditutup → tag situs pembeli dilepas dan favicon shell kembali', async () => {
    const { container, unmount } = open('/situs/7/berita/juara-olimpiade-sains');
    await until(() => expect(container.querySelector('h1')).toHaveTextContent(POST.title));
    await waitFor(() => expect(tag('icon')).toHaveAttribute('href', SITE.content.brand.logo));
    expect(shellIcon.isConnected).toBe(false);
    expect(tag('jsonld')).not.toBeNull();
    unmount();
    expect(document.head.querySelectorAll('[data-site-seo]')).toHaveLength(0);
    expect(shellIcon.isConnected).toBe(true);
    expect(posts()).toHaveLength(0);
  });
});
