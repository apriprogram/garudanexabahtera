// @vitest-environment jsdom
// Katalog template beranda (paket "katalog"): kartu selalu menampilkan deskripsi + "Lihat Demo"/"Pesan" (B-02), kolom
// grid mengikuti jumlah kartu (B-03), toolbar mengikuti besar katalog (B-04), panel tanpa hasil tidak buntu (B-05),
// tab kategori chip-site (B-06), lencana kategori nama lengkap (B-12), label glosarium & kata kunci sentence case (B-11).
// Jalankan: npx vitest run src/components/sections/__tests__/katalog.test.tsx
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearApiCache } from '../../../lib/api';
import type { Template } from '../../../types/platform';
import Templates from '../Templates';
import { buildPopularKeywords, indexTemplates, matchesQuery } from '../templates/catalog';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let seq = 0;
const tpl = (name: string, category: string, shortDescription: string, extra: Partial<Template> = {}): Template =>
  ({
    id: ++seq,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    category,
    short_description: shortDescription,
    description: '',
    price: 1500000,
    preview_image: `/img/${seq}.jpg`,
    demo_url: null,
    features: [],
    sort_order: seq,
    created_at: '2025-01-01 10:00:00',
    ...extra,
  }) as unknown as Template;

/** Katalog yang sekarang tayang: 2 template, 1 kategori. */
const SMALL = () => [
  tpl('Corporate Nexa', 'Company Profile', 'Company profile elegan untuk perusahaan yang ingin tampil profesional.'),
  tpl('Startup Clean', 'Company Profile', 'Company profile modern dan ringan untuk startup, UMKM, dan bisnis digital.', { price: 990000 }),
];

/** Katalog besar: 7 template, 3 kategori. */
const LARGE = () => [
  ...SMALL(),
  tpl('Promo Kilat', 'Landing Page', 'Landing page satu halaman dengan tombol WhatsApp.'),
  tpl('Event Hebat', 'Landing Page', 'Halaman promosi acara dengan galeri foto.'),
  tpl('Toko Rapi', 'Toko Online', 'Toko online dengan katalog produk dan keranjang untuk UMKM.'),
  tpl('Kedai Kopi', 'Toko Online', 'Toko online untuk kafe dan kuliner, menu dikelola lewat CMS.'),
  tpl('Studio Kreatif', 'Company Profile', 'Portofolio studio kreatif dengan blog dan testimoni klien.'),
];

let catalog: { templates: Template[]; categories: string[] } = { templates: [], categories: [] };

beforeEach(() => {
  seq = 0;
  clearApiCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const action = new URL(String(input), 'http://localhost').searchParams.get('action');
      if (action === 'get_templates') return json(200, catalog);
      return json(200, {});
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderCatalog = async () => {
  render(
    <MemoryRouter>
      <Templates />
    </MemoryRouter>,
  );
  const section = document.getElementById('templates') as HTMLElement;
  await waitFor(() => expect(section.querySelectorAll('article').length).toBeGreaterThan(0), { timeout: 10_000 });
  return section;
};

describe('logika katalog', () => {
  it('chip "Populer" melewati kata kunci yang sama dengan nama kategori; label sentence case', () => {
    const items = indexTemplates(LARGE());
    const popular = buildPopularKeywords(items, ['Company Profile', 'Landing Page', 'Toko Online']);
    expect(popular).not.toEqual(expect.arrayContaining(['Company profile']));
    expect(popular.map((label) => label.toLowerCase())).not.toEqual(
      expect.arrayContaining(['company profile', 'landing page', 'toko online']),
    );
    expect(popular).toEqual(expect.arrayContaining(['UMKM', 'WhatsApp', 'Galeri', 'Testimoni', 'Portofolio']));
    // Huruf besar hanya di awal kalimat & akronim/nama produk
    popular.forEach((label) => expect(label).toMatch(/^(UMKM|WhatsApp|CMS|[A-Z][a-z]+( [a-z]+)*)$/));
    // Kategori tidak lagi ditambahkan sebagai chip (sudah ada tab kategori)
    expect(buildPopularKeywords(indexTemplates(SMALL()), ['Company Profile'])).not.toContain('Company Profile');
  });

  it('label kata kunci tetap mencocokkan sinonimnya tanpa peduli huruf besar', () => {
    const [toko] = indexTemplates([tpl('Toko A', 'Toko Online', 'Website e-commerce lengkap.')]);
    expect(matchesQuery(toko.haystack, 'Toko online')).toBe(true);
    expect(matchesQuery(toko.haystack, 'klinik gigi')).toBe(false);
  });
});

// Render pertama (framer-motion, jsdom) bisa lambat di mesin yang sedang sibuk
const SLOW = { timeout: 30_000 };

describe('Templates (#templates), katalog kecil', SLOW, () => {
  it('tanpa tab, kolom cari, chip Populer & Urutkan; cukup jumlah template dan grid 2 kolom selebar maks 5xl', async () => {
    catalog = { templates: SMALL(), categories: ['Company Profile'] };
    const section = await renderCatalog();

    expect(within(section).queryByRole('group', { name: 'Kategori template' })).not.toBeInTheDocument();
    expect(within(section).queryByRole('search')).not.toBeInTheDocument();
    expect(within(section).queryByRole('group', { name: 'Kata kunci populer' })).not.toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: /Urutkan/ })).not.toBeInTheDocument();
    expect(within(section).getByRole('status')).toHaveTextContent('2 template');

    const grid = section.querySelector('ul') as HTMLElement;
    expect(grid.className).toContain('sm:grid-cols-2');
    expect(grid.className).toContain('lg:max-w-5xl');
    expect(grid.className).not.toContain('xl:grid-cols-4');
  });

  it('kartu gaya Dribbble: tanpa logo; hover = deskripsi + "Demo" & "Pesan"; judul, kategori, harga coret, ♥ suka & 👁 dilihat', async () => {
    catalog = { templates: SMALL(), categories: ['Company Profile'] };
    const section = await renderCatalog();
    const card = within(section).getByRole('heading', { level: 3, name: 'Corporate Nexa' }).closest('article') as HTMLElement;

    // Deskripsi & tombol di lapisan hover (perangkat ber-mouse); di layar sentuh tombol selalu terlihat
    const description = within(card).getByText(/Company profile elegan/);
    expect(description.className).toContain('line-clamp-2');
    const overlay = description.closest('.pointer-events-none') as HTMLElement;
    expect(overlay.className).toContain('[@media(hover:hover)]:opacity-0');
    expect(overlay.className).toContain('[@media(hover:hover)]:group-hover/shot:opacity-100');
    expect(overlay.className).toContain('group-focus-within/shot:opacity-100');

    const demo = within(card).getByRole('link', { name: /Lihat Demo Corporate Nexa/ });
    expect(demo).toHaveAttribute('href', '/demo/corporate-nexa');
    expect(demo).toHaveAttribute('target', '_blank');
    expect(demo).toHaveTextContent('Demo');
    const order = within(card).getByRole('link', { name: 'Pesan Template Corporate Nexa' });
    expect(order).toHaveAttribute('href', '/pesan/corporate-nexa');
    expect(order).toHaveTextContent('Pesan');
    expect(order.className).toContain('btn-primary');

    // Nama memakai skala kartu design.md; kategori lalu harga selalu tampil di bawah gambar
    const heading = within(card).getByRole('heading', { level: 3 });
    expect(heading.className).toMatch(/text-base font-semibold/);
    expect(heading.className).toContain('sm:text-[17px]');
    expect(within(card).getByText('Company Profile').closest('p')).toHaveTextContent(/^Kategori Company Profile$/);

    // Harga jujur: harga template asli dicoret, harga pembelian pertama (−20%) tebal + label
    const normal = within(card).getByText('Rp 1.500.000');
    expect(normal.className).toContain('line-through');
    expect(normal).toHaveTextContent(/^Harga normal Rp 1\.500\.000$/);
    const first = within(card).getByText('Rp 1.200.000');
    expect(first.className).toContain('font-semibold');
    expect(first).toHaveTextContent(/^Harga pembelian pertama Rp 1\.200\.000$/);
    expect(within(card).getByText('−20% pembelian pertama')).toBeInTheDocument();

    // Tanpa logo/avatar di kartu; tombol suka + jumlah dilihat
    expect(card.querySelector('.bg-primary svg')).toBeNull();
    const like = within(card).getByRole('button', { name: /^Suka Corporate Nexa, 0 suka$/ });
    expect(like).toHaveAttribute('aria-pressed', 'false');
    expect(within(card).getByText(/kali dilihat/)).toBeInTheDocument();
  });

  it('ajakan custom memakai label glosarium "Pesan Custom" (kepala section; HP: di bawah grid)', async () => {
    catalog = { templates: SMALL(), categories: ['Company Profile'] };
    const section = await renderCatalog();
    const links = within(section).getAllByRole('link', { name: /Pesan Custom/ });
    expect(links).toHaveLength(2);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/pesan-custom?layanan=website'));
    expect(links[0].parentElement?.className).toContain('max-sm:hidden');
    expect(links[1].parentElement?.className).toContain('sm:hidden');
    expect(within(section).getAllByText('Butuh desain custom?')).toHaveLength(2);
    expect(section).not.toHaveTextContent(/khusus/);
  });
});

describe('Templates (#templates), katalog besar', SLOW, () => {
  it('tab kategori chip-site (aktif = aria-pressed), kolom cari, chip Populer, Urutkan, lencana kategori lengkap', async () => {
    catalog = { templates: LARGE(), categories: ['Company Profile', 'Landing Page', 'Toko Online'] };
    const section = await renderCatalog();

    const tabs = within(section).getByRole('group', { name: 'Kategori template' });
    const all = within(tabs).getByRole('button', { name: 'Semua' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(all.className).toContain('chip-site');
    fireEvent.click(within(tabs).getByRole('button', { name: 'Landing Page' }));
    expect(within(tabs).getByRole('button', { name: 'Landing Page' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(section).getByRole('status')).toHaveTextContent('2 dari 7 template');
    fireEvent.click(all);

    expect(within(section).getByRole('searchbox', { name: 'Cari template' }).className).toContain('placeholder:text-muted');
    expect(within(section).getByRole('group', { name: 'Kata kunci populer' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: /Urutkan/ })).toBeInTheDocument();

    // Kategori tertulis di baris info setiap kartu (di bawah judul)
    expect(within(section).getAllByText('Company Profile', { exact: false }).length).toBeGreaterThan(0);

    // ≥ 4 kartu: grid penuh 1/2/3/4 kolom
    expect((section.querySelector('ul') as HTMLElement).className).toContain('xl:grid-cols-4');
  });

  it('tanpa hasil: "Pesan Custom" jadi tombol utama, "Lihat Semua Template" mereset, template yang tersedia tetap ditawarkan', async () => {
    catalog = { templates: LARGE(), categories: ['Company Profile', 'Landing Page', 'Toko Online'] };
    const section = await renderCatalog();

    fireEvent.change(within(section).getByRole('searchbox', { name: 'Cari template' }), { target: { value: 'klinik gigi' } });
    await waitFor(() => expect(within(section).getByRole('heading', { name: 'Tidak ada template yang cocok' })).toBeInTheDocument());
    expect(within(section).getByRole('status')).toHaveTextContent('0 dari 7 template');

    const panel = within(section).getByRole('heading', { name: 'Tidak ada template yang cocok' }).parentElement as HTMLElement;
    const custom = within(panel).getByRole('link', { name: /Pesan Custom/ });
    expect(custom.className).toContain('btn-primary');
    expect(custom).toHaveAttribute('href', '/pesan-custom?layanan=website');
    const reset = within(panel).getByRole('button', { name: 'Lihat Semua Template' });
    expect(reset.className).toContain('btn-outline');

    const available = within(section).getByRole('list', { name: 'Template yang tersedia' });
    expect(within(available).getAllByRole('heading', { level: 4 })).toHaveLength(7);
    // Ajakan HP di bawah grid tidak diulang (panel sudah punya tombolnya)
    expect(within(section).queryAllByText('Butuh desain custom?')).toHaveLength(1);

    fireEvent.click(reset);
    await waitFor(() => expect(within(section).getByRole('status')).toHaveTextContent('7 template'));
    expect(within(section).getByRole('searchbox', { name: 'Cari template' })).toHaveValue('');
    expect(within(section).queryByRole('list', { name: 'Template yang tersedia' })).not.toBeInTheDocument();
  });

  it('lencana "Baru" minimal 11px untuk template terbaru', async () => {
    const templates = LARGE();
    templates[6] = { ...templates[6], created_at: new Date(Date.now() - 86400000).toISOString().slice(0, 19).replace('T', ' ') };
    catalog = { templates, categories: ['Company Profile', 'Landing Page', 'Toko Online'] };
    const section = await renderCatalog();
    const badge = within(section).getByText('Baru');
    expect(badge.className).toContain('text-[11px]');
    expect(badge.className).not.toContain('text-[10px]');
  });
});

describe('Templates (#templates), katalog kosong', SLOW, () => {
  it('belum ada template: tombol utama "Pesan Custom"', async () => {
    catalog = { templates: [], categories: [] };
    render(
      <MemoryRouter>
        <Templates />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Template sedang kami siapkan' })).toBeInTheDocument());
    const links = screen.getAllByRole('link', { name: /Pesan Custom/ });
    expect(links.some((link) => link.className.includes('btn-primary'))).toBe(true);
  });
});
