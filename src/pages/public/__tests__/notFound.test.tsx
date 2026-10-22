// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/public/__tests__/notFound.test.tsx
// Halaman 404 (paket "proses-faq-404"): judul tab sendiri + robots noindex selama tampil (dipulihkan saat keluar),
// bilah alamat yang membungkus path panjang (tidak dipotong), dan label "Pesan Custom" sesuai glosarium.
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SiteSettings } from '../../../hooks/useSiteSettings';
import NotFound from '../NotFound';

// Kanvas hero tidak didukung jsdom; latar dekoratif tidak relevan untuk tes ini
vi.mock('../../../components/sections/hero/HeroBackground', () => ({ HeroBackground: () => null }));

let mockSettings: SiteSettings = {};
vi.mock('../../../hooks/useSiteSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useSiteSettings')>()),
  useSiteSettings: () => ({ settings: mockSettings, loaded: true }),
}));

const HOME_TITLE = 'Garuda Nexa | Template Website Siap Pakai & Jasa Website / Aplikasi Mobile Custom';

beforeEach(() => {
  mockSettings = {};
  document.title = HOME_TITLE;
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.head.querySelectorAll('meta[name="robots"]').forEach((meta) => meta.remove());
  window.history.replaceState(null, '', '/');
});

const robots = () => [...document.head.querySelectorAll<HTMLMetaElement>('meta[name="robots"]')].map((meta) => meta.content);

describe('NotFound (404)', () => {
  it('memberi judul tab sendiri dan robots noindex, lalu memulihkannya saat keluar (C-04)', () => {
    const { unmount } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Halaman tidak ditemukan | Garuda Nexa');
    expect(robots()).toEqual(['noindex']);

    unmount();
    expect(document.title).toBe(HOME_TITLE);
    expect(robots()).toEqual([]);
  });

  it('meta robots yang sudah ada diubah sementara, bukan diduplikasi', () => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'index, follow';
    document.head.appendChild(meta);

    const { unmount } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(robots()).toEqual(['noindex']);
    unmount();
    expect(robots()).toEqual(['index, follow']);
  });

  it('bilah alamat menampilkan path lengkap yang membungkus, bukan dipotong (C-14)', () => {
    const path = '/halaman-yang-tidak-ada/dengan-alamat-yang-sangat-panjang-sekali';
    window.history.replaceState(null, '', path);
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    const bar = screen.getByTitle(path);
    expect(bar).toHaveTextContent(`garudanexa.com${path}`);
    expect(bar.className).toContain('max-w-md');
    expect(bar.className).toContain('sm:max-w-lg');
    expect(bar.className).toContain('min-h-10');
    expect(bar.className).not.toMatch(/(^|\s)h-10(\s|$)/);
    const text = screen.getByText(path).parentElement!;
    expect(text.className).toContain('[overflow-wrap:anywhere]');
    expect(text.className).not.toContain('truncate');
  });

  it('main = tujuan skip link; katalog disembunyikan → "Pesan Custom" (C-11)', () => {
    mockSettings = { disabled_sections: JSON.stringify(['templates']) };
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'konten');
    expect(screen.getByRole('link', { name: 'Pesan Custom' })).toHaveAttribute('href', '/pesan-custom');
    expect(screen.queryByRole('link', { name: 'Lihat template' })).not.toBeInTheDocument();
  });
});
