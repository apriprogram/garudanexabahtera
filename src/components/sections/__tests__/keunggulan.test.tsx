// @vitest-environment jsdom
// Section beranda #keunggulan (pengganti "Cara kerja kami", permintaan pemilik 2026-10-24): judul dua baris + satu
// kalimat, bento 9 kartu bergaya Framer versi terang. Tiap kartu: ilustrasi dekoratif (aria-hidden), judul h3 dengan satu
// tautan, satu kalimat. Isinya hanya fitur yang ada (tanpa angka uptime/kecepatan karangan).
// Jalankan: npx vitest run src/components/sections/__tests__/keunggulan.test.tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Template } from '../../../types/platform';
import HomeFeatures from '../home/HomeFeatures';

let templates: Partial<Template>[] = [];
vi.mock('../../../hooks/usePublishedTemplates', () => ({
  usePublishedTemplates: () => ({ status: 'ready', templates }),
}));

beforeEach(() => {
  templates = [
    { slug: 'corporate-nexa', name: 'Corporate Nexa', price: 1500000, preview_image: '/img/corporate.jpg' },
    { slug: 'startup-clean', name: 'Startup Clean', price: 990000, preview_image: '/img/startup.jpg' },
    { slug: 'arena-club', name: 'Arena Club', price: 1290000, preview_image: '/img/arena.jpg' },
  ];
});

afterEach(cleanup);

const renderFeatures = () => {
  render(
    <MemoryRouter>
      <HomeFeatures alt />
    </MemoryRouter>,
  );
  return document.getElementById('keunggulan') as HTMLElement;
};

describe('Keunggulan (#keunggulan)', () => {
  it('judul dua baris + satu kalimat; 9 kartu, masing-masing h3 dengan satu tautan dan ilustrasi dekoratif', () => {
    const section = renderFeatures();
    expect(section).toHaveAttribute('aria-labelledby', 'keunggulan-title');
    expect(section.className).toContain('bg-alt');
    const title = within(section).getByRole('heading', { level: 2 });
    expect(title.textContent?.replace(/\s+/g, ' ').trim()).toBe('Bukan sekadar template, semua sudah siap.');
    expect(section).toHaveTextContent('Domain, hosting, SSL, CMS, dan pembayaran dalam satu tempat.');

    const tiles = within(section).getAllByRole('listitem').filter((li) => li.parentElement?.tagName === 'UL' && li.querySelector('h3'));
    expect(tiles.map((li) => li.querySelector('h3')?.textContent?.trim())).toEqual([
      'Responsif',
      'CMS',
      'Domain & hosting',
      'Status pesanan',
      'Promo',
      'Pembayaran',
      'SSL',
      'Template & demo',
      'WhatsApp',
    ]);
    for (const tile of tiles) {
      // Satu tautan per kartu (judul, diregangkan ke seluruh kartu); ilustrasi tidak dibacakan
      expect(within(tile).getAllByRole('link')).toHaveLength(1);
      expect(tile.querySelector('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(within(section).getByRole('link', { name: 'Domain & hosting' })).toHaveAttribute('href', '/harga');
    expect(within(section).getByRole('link', { name: 'Status pesanan' })).toHaveAttribute('href', '/akun');
    expect(within(section).getByRole('link', { name: 'Template & demo' })).toHaveAttribute('href', '/template');
  });

  it('ilustrasi memakai data nyata: pratinjau template, diskon pembelian pertama, harga template; tanpa angka karangan', () => {
    const section = renderFeatures();
    const images = [...section.querySelectorAll('img')].map((img) => img.getAttribute('src'));
    expect(images).toContain('/img/corporate.jpg');
    expect(images).toContain('/img/arena.jpg');
    section.querySelectorAll('img').forEach((img) => expect(img).toHaveAttribute('alt', ''));
    // Promo: persen diskon ada di kalimat yang dibacakan (ilustrasi "20% diskon" aria-hidden)
    const promo = within(section).getByRole('link', { name: 'Promo' }).closest('li') as HTMLElement;
    expect(promo.querySelector('h3 + p')).toHaveTextContent('Diskon 20% otomatis untuk pembelian template pertama.');
    // Pembayaran: template berbayar pertama Rp 1.500.000 → diskon 20% = Rp 300.000, total Rp 1.200.000
    expect(section).toHaveTextContent('Template Corporate Nexa');
    expect(section).toHaveTextContent('Rp 1.200.000');
    expect(section).toHaveTextContent('Midtrans');
    expect(section).not.toHaveTextContent(/uptime|99[.,]9|QRIS|virtual account|e-wallet/i);
  });

  it('template gratis tidak pernah diberi harga karangan; tanpa data: tanpa nama & angka rupiah, hanya persen', () => {
    templates = [
      { slug: 'gratis', name: 'Template Gratis', price: 0, preview_image: '/img/gratis.jpg' },
      { slug: 'startup-clean', name: 'Startup Clean', price: 990000, preview_image: '/img/startup.jpg' },
    ];
    let section = renderFeatures();
    expect(section).toHaveTextContent('Template Startup Clean');
    expect(section).toHaveTextContent('Rp 792.000');
    expect(section).not.toHaveTextContent(/Template Template Gratis/);
    cleanup();

    templates = [];
    section = renderFeatures();
    expect(section.querySelectorAll('img')).toHaveLength(0);
    expect(section).toHaveTextContent('Template pilihan Anda');
    expect(section).toHaveTextContent('−20%');
    expect(section).not.toHaveTextContent(/Rp\s?\d/);
    expect(screen.getAllByText('Template').length).toBeGreaterThan(0);
  });

  it('seluruh kartu bisa diklik: ::after tautan judul berpatokan pada li (pembungkus teks tidak relative)', () => {
    const section = renderFeatures();
    const link = within(section).getByRole('link', { name: 'CMS' });
    expect(link.className).toContain('after:absolute');
    expect(link.closest('h3')?.parentElement?.className).not.toMatch(/\brelative\b/);
    expect(link.closest('li')?.className).toMatch(/\brelative\b/);
  });
});
