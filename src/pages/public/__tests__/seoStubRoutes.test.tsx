// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/public/__tests__/seoStubRoutes.test.tsx
// Rute baru SEO WP1 (docs/platform/SEO-PLAN.md §5.1) lewat App sungguhan: halamannya tampil di dalam layout situs
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

/** Satu artikel panduan terbit (get_guides): artikel dikelola admin di database. */
const GUIDE = {
  slug: 'biaya-website-company-profile',
  title: 'Berapa Biaya Membuat Website Company Profile di 2026?',
  description: 'Kisaran biaya website company profile 2026, dari website builder, template, sampai jasa custom.',
  author: 'Tim Garuda Nexa',
  datePublished: '2026-10-23',
  dateModified: '2026-10-23',
  reviewed: '2026-10-24',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes('action=get_template&') || url.includes('action=get_template?')) {
    return url.includes('slug=aura-studio') ? json({ template: TEMPLATE }) : json({ error: 'Template tidak ditemukan.', code: 'TEMPLATE_NOT_FOUND' }, 404);
  }
  if (url.includes('action=get_templates')) return json({ templates: [TEMPLATE], categories: [TEMPLATE.category] });
  if (url.includes('action=get_settings')) return json({});
  if (url.includes('action=get_guides')) return json({ success: true, guides: [GUIDE] });
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

// Semua stub WP1 sudah menjadi halaman jadi: katalog & kategori (WP5) di catalog/__tests__, halaman WP6 di
// info/__tests__, panduan (WP8) di panduan/__tests__. Di sini cukup dicek lewat App sungguhan: tetap di layout situs.
describe('rute SEO WP1', () => {
  it('/panduan tampil di dalam layout situs', async () => {
    renderAt('/panduan');
    const h1 = await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
    expect(h1).toHaveTextContent('Panduan website untuk bisnis');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(document.getElementById('konten')).toContainElement(h1);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Beranda');
    // Daftar artikel dimuat dari API (get_guides)
    const main = within(document.getElementById('konten')!);
    await waitFor(() => expect(main.getAllByRole('link').some((a) => a.getAttribute('href') === `/panduan/${GUIDE.slug}`)).toBe(true));
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
      // Render pertama memuat chunk halaman kategori/panduan yang besar; saat suite berat itu bisa > 5 detik
      expect(await screen.findByRole('heading', { level: 1 }, { timeout: 15_000 })).toHaveTextContent('Halaman ini tidak ditemukan.');
      cleanup();
    }
    // Beberapa render berurutan: batas waktu tes lebih longgar dari 5 detik bawaan, supaya tidak gagal saat suite penuh berat
  }, 40_000);

  it('huruf besar di path → 404, sama dengan server (aturan .htaccess membedakan huruf besar-kecil)', async () => {
    for (const path of ['/Harga', '/Template/aura-studio', '/PANDUAN', '/Jasa-Pembuatan-Website']) {
      renderAt(path);
      expect(await screen.findByRole('heading', { level: 1 }, { timeout: 5000 }), path).toHaveTextContent('Halaman ini tidak ditemukan.');
      cleanup();
    }
  }, 30_000);

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
