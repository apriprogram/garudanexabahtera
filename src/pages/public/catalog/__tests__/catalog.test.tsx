// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/public/catalog
// Katalog /template, kategori /template/kategori/{slug} dan detail template (SEO WP5, docs/platform/SEO-PLAN.md §5.5)
// lewat App sungguhan: kartu & chip berupa tautan nyata, FAQ bersama, paginasi tautan ?page=N, kategori kosong / tidak
// dikenal, template tanpa file isi (cadangan DB) dan slug tidak terbit (halaman 404).
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../../App';
import { CATALOG_FAQ_IDS, faqContext, faqItems } from '../../../../content/faq';
import { clearCachedJson } from '../../../../hooks/useCachedJson';
import { clearApiCache } from '../../../../lib/api';
import { FIXTURE_GUIDES, FIXTURE_TEMPLATES, guideSummary } from '../../../../lib/__tests__/preloadFixture';
import type { Template } from '../../../../types/platform';

vi.mock('../../../../components/sections/hero/HeroBackground', () => ({ HeroBackground: () => null }));

let templates: Template[] = FIXTURE_TEMPLATES;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = new URL(String(input), 'http://localhost');
  const action = url.searchParams.get('action');
  if (action === 'get_template') {
    const found = templates.find((t) => t.slug === url.searchParams.get('slug'));
    return found ? json({ template: found }) : json({ error: 'Template tidak ditemukan.', code: 'TEMPLATE_NOT_FOUND' }, 404);
  }
  if (action === 'get_templates') return json({ templates });
  if (action === 'get_settings') return json({});
  // Artikel panduan terbit (database): tautan "panduan" di kategori & detail template
  if (action === 'get_guides') return json({ success: true, guides: FIXTURE_GUIDES.map(guideSummary) });
  return json([]);
});

beforeEach(() => {
  templates = FIXTURE_TEMPLATES;
  clearApiCache();
  clearCachedJson();
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

const main = () => within(document.getElementById('konten') as HTMLElement);
const mainHrefs = () => [...(document.getElementById('konten') as HTMLElement).querySelectorAll('a')].map((a) => a.getAttribute('href'));

describe('/template (katalog)', () => {
  it('H1 "Pilih Template", semua kartu & chip kategori sebagai tautan, kolom cari, FAQ bersama, tautan harga & Pesan Custom', async () => {
    renderAt('/template');
    expect(await screen.findByRole('heading', { level: 1 }, { timeout: 5000 })).toHaveTextContent(/^Pilih Template$/);
    // Halaman disederhanakan (pemilik 2026-10-24): tanpa kalimat pengantar, strip "Sudah termasuk", tabel DIY & "Lanjutkan membaca"
    expect(main().queryByText(/untuk bisnis Anda\. Lihat demonya/)).toBeNull();
    expect(main().queryByText('Sudah termasuk')).toBeNull();
    await main().findByRole('link', { name: 'Finova' }, { timeout: 5000 });
    const hrefs = mainHrefs();
    for (const t of FIXTURE_TEMPLATES) expect(hrefs).toContain(`/template/${t.slug}`);
    const chips = within(screen.getByRole('navigation', { name: 'Kategori template' }));
    expect(chips.getByRole('link', { name: /Semua/ })).toHaveAttribute('aria-current', 'page');
    expect(chips.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/template',
      '/template/kategori/company-profile',
      '/template/kategori/kecantikan-klinik',
      '/template/kategori/olahraga-komunitas',
      '/template/kategori/fintech-startup',
    ]);
    for (const href of ['/harga', '/pesan-custom?layanan=website']) expect(hrefs).toContain(href);
    expect(main().getByRole('search', { name: 'Cari template' })).toBeInTheDocument();
    // FAQ = jawaban bersama src/content/faq.ts (sama dengan beranda, /harga dan JSON-LD FAQPage)
    for (const item of faqItems(CATALOG_FAQ_IDS, faqContext(FIXTURE_TEMPLATES))) expect(main().getByText(item.answer)).toBeInTheDocument();
    expect(main().queryByRole('table')).toBeNull();
    expect(main().queryByText(/Lanjutkan membaca|Yang Anda dapatkan/)).toBeNull();
    expect(main().queryByText(/Halaman ini sedang kami lengkapi/)).toBeNull();
  });

  it('kolom cari menyaring kartu (semua hasil, tanpa paginasi); tanpa hasil → pesan + Pesan Custom + reset', async () => {
    renderAt('/template');
    await main().findByRole('link', { name: 'Finova' }, { timeout: 5000 });
    const input = main().getByRole('searchbox', { name: 'Cari template' });
    fireEvent.change(input, { target: { value: 'finova' } });
    await main().findByText(/^1 dari 5 template$/);
    expect(main().getByRole('link', { name: 'Finova' })).toBeInTheDocument();
    expect(main().queryByRole('link', { name: 'Corporate Nexa' })).toBeNull();

    fireEvent.change(input, { target: { value: 'tidak ada yang cocok' } });
    expect(await main().findByText('Tidak ada template yang cocok')).toBeInTheDocument();
    fireEvent.click(main().getByRole('button', { name: 'Lihat Semua Template' }));
    expect(await main().findByRole('link', { name: 'Corporate Nexa' })).toBeInTheDocument();
    expect(input).toHaveValue('');
    // Tombol reset hilang bersama panel, fokus pindah ke kolom cari
    expect(input).toHaveFocus();
  });

  it('lebih dari 12 template: paginasi tautan ?page=N (bukan tombol), halaman 2 menampilkan sisanya', async () => {
    templates = Array.from({ length: 14 }, (_, i) => ({ ...FIXTURE_TEMPLATES[i % 5], id: 100 + i, slug: `uji-${i + 1}`, name: `Uji ${i + 1}` }));
    renderAt('/template?page=2');
    const pager = await screen.findByRole('navigation', { name: 'Halaman katalog' }, { timeout: 5000 });
    expect(within(pager).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/template', '/template?page=2']);
    expect(within(pager).getByRole('link', { name: /2/ })).toHaveAttribute('aria-current', 'page');
    expect(main().getByRole('link', { name: 'Uji 13' })).toBeInTheDocument();
    expect(main().queryByRole('link', { name: 'Uji 1' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Tampilkan lebih banyak/ })).toBeNull();
  });
});

describe('/template/kategori/:category', () => {
  it('H1, kartu kategori ini saja, checklist, FAQ, tautan panduan/jasa/harga, breadcrumb', async () => {
    renderAt('/template/kategori/kecantikan-klinik');
    expect(await screen.findByRole('heading', { level: 1 }, { timeout: 5000 })).toHaveTextContent('Template website klinik kecantikan & salon');
    expect(await main().findByRole('link', { name: 'Aura Studio' }, { timeout: 5000 })).toHaveAttribute('href', '/template/aura-studio');
    expect(main().queryByRole('link', { name: 'Finova' })).toBeNull();
    expect(main().getByRole('heading', { name: 'Apa yang perlu ada di website klinik kecantikan & salon' })).toBeInTheDocument();
    expect(main().getByRole('heading', { name: 'Pertanyaan seputar website klinik kecantikan & salon' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Kategori template' })).getByRole('link', { name: /Klinik kecantikan/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // Tautan artikel muncul setelah get_guides dimuat
    await waitFor(() => expect(mainHrefs()).toContain('/panduan/website-klinik-kecantikan'));
    for (const href of ['/jasa-pembuatan-website', '/harga']) expect(mainHrefs()).toContain(href);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent(/Beranda.*Template.*Klinik kecantikan & salon/);
  });

  it('kategori tanpa template: pesan kosong dengan tautan ke katalog dan Pesan Custom', async () => {
    templates = FIXTURE_TEMPLATES.filter((t) => t.slug !== 'finova');
    renderAt('/template/kategori/fintech-startup');
    expect(await main().findByText('Belum ada template di kategori ini', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(main().getByRole('link', { name: 'Lihat Semua Template' })).toHaveAttribute('href', '/template');
  });

  it('kategori tidak dikenal → halaman 404', async () => {
    renderAt('/template/kategori/kuliner');
    expect(await screen.findByRole('heading', { level: 1 }, { timeout: 5000 })).toHaveTextContent('Halaman ini tidak ditemukan.');
  });
});

describe('/template/:slug', () => {
  it('template dengan file isi: bagian H2 rencana §5.5 dan tautan wajib', async () => {
    renderAt('/template/arena-club');
    expect(await screen.findByRole('heading', { level: 1 }, { timeout: 5000 })).toHaveTextContent('Arena Club: Template Website Klub Olahraga, Padel & Futsal');
    const h2 = main()
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(h2).toEqual(
      expect.arrayContaining([
        'Cocok untuk',
        'Halaman & bagian yang Anda dapatkan',
        'Yang bisa Anda ubah sendiri lewat CMS',
        'Sudah termasuk & biaya tahun berikutnya',
        'Cara memesan & kapan website aktif',
        'Contoh website klub olahraga dengan Arena Club',
        'Butuh fitur lain?',
        'Pertanyaan tentang Arena Club',
      ]),
    );
    expect(main().getByText(/Harga per \d{1,2} \w+ \d{4}/)).toBeInTheDocument();
    expect(main().getByText(/Pembayaran aman via Midtrans/)).toBeInTheDocument();
    await waitFor(() => expect(mainHrefs()).toContain('/panduan/template-vs-jasa-website-custom'));
    const hrefs = mainHrefs();
    for (const href of ['/template/kategori/olahraga-komunitas', '/harga', '/jasa-pembuatan-website', '/jasa-pembuatan-aplikasi-mobile', '/panduan/template-vs-jasa-website-custom', '/pesan/arena-club', '/demo/arena-club']) {
      expect(hrefs).toContain(href);
    }
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent(/Beranda.*Template.*Klub olahraga/);
    expect(screen.getByRole('button', { name: /^Perbesar / }).querySelector('img')).toHaveAttribute(
      'alt',
      'Tampilan beranda template website klub olahraga Arena Club di desktop dan HP dengan banner foto lapangan',
    );
  });

  it('template baru tanpa file isi: H1 dari kategori DB, deskripsi & fitur DB, bagian umum tetap ada', async () => {
    const fresh: Template = { ...FIXTURE_TEMPLATES[4], id: 99, slug: 'resto-hangat', name: 'Resto Hangat', category: 'Kuliner', description: 'Resto Hangat untuk rumah makan keluarga.' };
    templates = [...FIXTURE_TEMPLATES, fresh];
    renderAt('/template/resto-hangat');
    expect(await screen.findByRole('heading', { level: 1 }, { timeout: 5000 })).toHaveTextContent('Resto Hangat: Template Website Kuliner');
    expect(main().getByText('Resto Hangat untuk rumah makan keluarga.')).toBeInTheDocument();
    expect(main().getByRole('heading', { name: 'Cara memesan & kapan website aktif' })).toBeInTheDocument();
    expect(main().queryByRole('heading', { name: 'Cocok untuk' })).toBeNull();
    expect(mainHrefs()).toEqual(expect.arrayContaining(['/harga', '/jasa-pembuatan-website', '/panduan']));
  });

  it('slug tidak terbit atau tidak dikenal → halaman 404 situs', async () => {
    renderAt('/template/tidak-ada');
    expect(await screen.findByRole('heading', { level: 1, name: 'Halaman ini tidak ditemukan.' }, { timeout: 5000 })).toBeInTheDocument();
  });
});
