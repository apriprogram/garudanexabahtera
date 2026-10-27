// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/site-visit.test.tsx
// Pencatatan kunjungan situs pembeli (src/templates/shared/siteVisit.ts, docs/platform/SITE-STATS-SPEC.md §2 klien):
// penanda sesi `first`, sessionStorage diblokir, isi permintaan (keepalive, galat diabaikan), utm_source; dan pratinjau
// situs (/situs/:id, SitePreview) serta demo template (/demo/:slug) TIDAK pernah memanggil site_visit. Pemanggilan di
// domain pembeli (CustomerSite) diuji di customer-site.test.tsx.
import { cleanup, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearApiCache } from '../../lib/api';
import SitePreview from '../../pages/public/SitePreview';
import TemplateDemo from '../../pages/public/TemplateDemo';
import { SITE_VISIT_SESSION_KEY, resetSiteVisit, sendSiteVisit, takeFirstVisit, utmSourceOf } from '../shared/siteVisit';
import { removeSiteSeoHead } from '../siteSeo';
import { ANNOUNCEMENTS, NEWS, POST } from './fixtures/sitePosts';

vi.setConfig({ testTimeout: 60_000 });

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const SITE = { id: 7, template_code: 'madani', domain: 'smkharapan.sch.id', content: null, addons: { posts: true } };
const MADANI = {
  id: 2,
  slug: 'madani',
  name: 'Madani',
  category: 'Sekolah',
  description: 'Template sekolah',
  features: [],
  price: 2500000,
  preview_image: null,
  gallery: [],
  template_code: 'madani',
  demo_url: null,
  status: 'published',
  sort_order: 1,
};

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  void init; // dibaca lewat fetchMock.mock.calls
  const q = new URL(String(input), 'http://localhost').searchParams;
  switch (q.get('action')) {
    case 'get_site_public':
      return q.get('site_id') === '7' ? json(200, { site: SITE }) : json(404, { error: 'Situs tidak ditemukan.', code: 'SITE_NOT_FOUND' });
    case 'get_site_seo':
      return json(200, { seo: { title: '', description: '', og_image: null, schema_type: '', indexable: true } });
    case 'get_site_posts': {
      const posts = q.get('kind') === 'berita' ? NEWS : ANNOUNCEMENTS;
      return json(200, { posts, total: posts.length });
    }
    case 'get_site_post':
      return q.get('slug') === POST.slug ? json(200, { post: POST }) : json(404, { error: 'Tulisan tidak ditemukan.', code: 'POST_NOT_FOUND' });
    case 'get_template':
      return q.get('slug') === 'madani' ? json(200, { template: MADANI }) : json(404, { error: 'Template tidak ditemukan.' });
    default:
      return json(200, { success: true });
  }
});

const visitCalls = () => fetchMock.mock.calls.filter(([input]) => String(input).includes('action=site_visit'));
const visitBodies = () => visitCalls().map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);

/** Jawaban API yang sudah dikirim selesai diproses (effect sesudahnya ikut jalan). */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

beforeEach(() => {
  fetchMock.mockClear();
  clearApiCache();
  vi.stubGlobal('fetch', fetchMock);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  removeSiteSeoHead();
  window.sessionStorage.clear();
  resetSiteVisit();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('siteVisit', () => {
  it('first: true sekali per sesi (penanda gn-site-visit), lalu false', () => {
    expect(takeFirstVisit()).toBe(true);
    expect(window.sessionStorage.getItem(SITE_VISIT_SESSION_KEY)).toBe('1');
    expect(takeFirstVisit()).toBe(false);
    window.sessionStorage.clear();
    expect(takeFirstVisit()).toBe(true);
  });

  it('sessionStorage diblokir: first true sekali per muat halaman, tanpa melempar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Diblokir', 'SecurityError');
    });
    expect(takeFirstVisit()).toBe(true);
    expect(takeFirstVisit()).toBe(false);
  });

  it('kirim: POST keepalive ke site_visit dengan document.referrer; fetch gagal/melempar diabaikan', async () => {
    sendSiteVisit({ site_id: 7, path: '/berita', utm_source: 'wa' });
    expect(visitBodies()).toEqual([{ action: 'site_visit', site_id: 7, path: '/berita', referrer: '', utm_source: 'wa', first: true }]);
    expect(visitCalls()[0][1]).toMatchObject({ method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' } });

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(() => sendSiteVisit({ site_id: 7, path: '/', utm_source: '' })).not.toThrow();
    vi.stubGlobal('fetch', () => {
      throw new TypeError('fetch tidak tersedia');
    });
    expect(() => sendSiteVisit({ site_id: 7, path: '/', utm_source: '' })).not.toThrow();
    await settle();
  });

  it('utm_source dari query halaman', () => {
    expect(utmSourceOf('?utm_source=instagram&x=1')).toBe('instagram');
    expect(utmSourceOf('?utm_source=%20chatgpt.com%20')).toBe('chatgpt.com');
    expect(utmSourceOf('')).toBe('');
    expect(utmSourceOf(`?utm_source=${'a'.repeat(150)}`)).toHaveLength(100);
  });
});

describe('site_visit tidak dipanggil di luar domain pembeli', () => {
  it('pratinjau situs /situs/:id (beranda, daftar, tulisan)', async () => {
    for (const path of ['/situs/7', '/situs/7/berita', `/situs/7/berita/${POST.slug}`]) {
      const { container } = render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/situs/:siteId/*" element={<SitePreview />} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => expect(container.querySelector('[data-tpl-section], [data-site-page]')).not.toBeNull(), { timeout: 15_000 });
      await settle();
      cleanup();
    }
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('get_site_public'))).toBe(true);
    expect(visitCalls()).toHaveLength(0);
  });

  it('demo template /demo/:slug (juga ?fitur=berita)', async () => {
    for (const path of ['/demo/madani', '/demo/madani?fitur=berita']) {
      const { container } = render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/demo/:slug" element={<TemplateDemo />} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => expect(container.querySelector('[data-tpl-section="news"]')).not.toBeNull(), { timeout: 15_000 });
      await settle();
      cleanup();
    }
    expect(visitCalls()).toHaveLength(0);
  });
});
