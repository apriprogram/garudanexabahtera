// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/public/__tests__/seoStubRoutes.test.tsx
// Rute baru SEO WP1 (docs/platform/SEO-PLAN.md §5.1) lewat App sungguhan: setiap stub tampil di dalam layout situs
// (Navbar, <main id="konten">, Footer) dengan satu H1; /template/:slug tetap menang untuk slug template asli;
// kategori/artikel yang tidak ada → 404; halaman login staf tetap tampil (sekarang lazy).
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { clearApiCache } from '../../../lib/api';

// Kanvas hero/latar dekoratif tidak didukung jsdom dan tidak relevan untuk tes ini
vi.mock('../../../components/sections/hero/HeroBackground', () => ({ HeroBackground: () => null }));

const TEMPLATE = {
  id: 1,
  slug: 'aura-studio',
  name: 'Aura Studio',
  category: 'Kecantikan & Klinik',
  short_description: 'Template untuk klinik kecantikan dan salon.',
  description: 'Template klinik kecantikan.',
  features: ['Daftar perawatan'],
  price: 1390000,
  preview_image: '/assets/templates/aura-studio-preview.webp',
  gallery: [],
  template_code: 'aura-studio',
  demo_url: null,
  status: 'published',
  sort_order: 4,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes('action=get_template&') || url.includes('action=get_template?')) {
    return url.includes('slug=aura-studio') ? json({ template: TEMPLATE }) : json({ error: 'Template tidak ditemukan.', code: 'TEMPLATE_NOT_FOUND' }, 404);
  }
  if (url.includes('action=get_templates')) return json({ templates: [TEMPLATE], categories: [TEMPLATE.category] });
  if (url.includes('action=get_settings')) return json({});
  return json([]);
});

beforeEach(() => {
  clearApiCache();
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.head.querySelectorAll('meta[name="robots"]').forEach((meta) => meta.remove());
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

// Katalog & kategori sudah halaman jadi (WP5): diuji di src/pages/public/catalog/__tests__/catalog.test.tsx
const STUBS: [string, string][] = [['/panduan', 'Panduan website untuk bisnis']];

describe('rute stub SEO WP1', () => {
  it.each(STUBS)('%s menampilkan stub di dalam layout situs', async (path, heading) => {
    renderAt(path);
    const h1 = await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
    expect(h1).toHaveTextContent(heading);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(document.getElementById('konten')).toContainElement(h1);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Beranda');
    const main = within(document.getElementById('konten')!);
    expect(main.getByText('Halaman ini sedang kami lengkapi.')).toBeInTheDocument();
    expect(main.getByRole('link', { name: /Pilih Template/ })).toHaveAttribute('href', '/#templates');
    expect(main.getByRole('link', { name: /Pesan Custom/ })).toHaveAttribute('href', '/pesan-custom');
    expect(main.getByRole('link', { name: /Konsultasi Gratis.*tab baru/ })).toHaveAttribute('href', expect.stringContaining('https://wa.me/6285188009152'));
    // Navbar dan Footer situs
    expect(document.querySelector('header')).not.toBeNull();
    expect(document.querySelector('footer')).not.toBeNull();
  });

  it('kategori: breadcrumb Beranda › Template › kategori', async () => {
    renderAt('/template/kategori/olahraga-komunitas');
    await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(crumbs).toHaveTextContent(/Beranda.*Template.*Klub olahraga/);
    expect(screen.getAllByRole('link', { name: 'Template' }).some((a) => a.getAttribute('href') === '/template')).toBe(true);
  });

  it('kontak: WhatsApp dan email bawaan tampil, tanpa alamat atau jam layanan', async () => {
    renderAt('/kontak');
    await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
    const main = document.getElementById('konten')!;
    expect(within(main).getByRole('link', { name: '0851-8800-9152' })).toHaveAttribute('href', 'tel:+6285188009152');
    expect(within(main).getAllByRole('link', { name: 'info@garudanexa.com' })[0]).toHaveAttribute('href', 'mailto:info@garudanexa.com');
    expect(main.textContent).not.toMatch(/Alamat|Jam layanan/);
  });

  it('kategori dan artikel panduan yang tidak ada → 404', async () => {
    for (const path of ['/template/kategori/tidak-ada', '/panduan/belum-ada-artikel']) {
      renderAt(path);
      expect(await screen.findByRole('heading', { level: 1 }, { timeout: 5000 })).toHaveTextContent('Halaman ini tidak ditemukan.');
      cleanup();
    }
  });

  it('/template/:slug tetap menang untuk slug template asli', async () => {
    renderAt('/template/aura-studio');
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('slug=aura-studio'))).toBe(true), { timeout: 5000 });
    expect(await screen.findByRole('heading', { level: 1, name: /Aura Studio/ }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByText('Halaman ini sedang kami lengkapi.')).not.toBeInTheDocument();
  });

  it('halaman login staf tetap tampil setelah Auth dijadikan lazy', async () => {
    renderAt('/login');
    expect((await screen.findAllByText('Masuk panel admin', {}, { timeout: 5000 })).length).toBeGreaterThan(0);
  });
});
