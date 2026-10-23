// @vitest-environment jsdom
// Navbar di atas hero berlatar gambar/video (permintaan pemilik 2026-10-23): di puncak beranda transparan dengan teks
// PUTIH bila strip latar di belakangnya gelap (gelap bila terang), putih kaca + teks gelap begitu digulir; selama
// belum terukur / tidak terbaca: putih kaca. Nada datang dari Hero lewat heroNavState (di sini diatur langsung).
// Jalankan: npx vitest run src/components/layout/__tests__/navbarHeroMedia.test.tsx
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from '../Navbar';
import { HERO_NAV_DEFAULT, setHeroNavState, type HeroNavState } from '../../sections/hero/heroNavState';

const GLASS = 'bg-canvas/85';

const renderAt = (path: string) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>,
  );
  const header = document.querySelector('header') as HTMLElement;
  return {
    header,
    logoMark: () => header.querySelector('a[aria-label^="Garuda Nexa"] svg') as SVGElement,
    /** Bar utama saja (menu HP yang tertutup juga berisi tautan yang sama) */
    bar: () => within(header.querySelector('nav[aria-label="Navigasi utama"]') as HTMLElement),
    burger: () => screen.getByRole('button', { name: /menu/i }),
  };
};

/** Keadaan dari Hero (strip latar di belakang navbar), sebelum atau sesudah render. */
const heroNav = (next: HeroNavState) => act(() => setHeroNavState(next));

const scrollTo = async (y: number) => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
  await act(async () => {
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => setTimeout(resolve, 40)); // rAF
  });
};

beforeEach(() => {
  // Menu navbar dari API: kosong → menu bawaan (Template, Jasa ▾, Harga, Panduan)
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })));
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setHeroNavState(HERO_NAV_DEFAULT);
  Reflect.deleteProperty(window, 'scrollY');
});

describe('Navbar di atas latar hero', () => {
  it('latar bawaan (tanpa media): transparan di puncak, teks gelap', () => {
    const nav = renderAt('/');
    expect(nav.header.className).toContain('bg-transparent');
    expect(nav.header).not.toHaveAttribute('data-nav-tone');
    expect(nav.logoMark().getAttribute('class')).toContain('text-primary');
  });

  it('media yang belum terukur / tidak terbaca: putih kaca sejak puncak', async () => {
    const nav = renderAt('/');
    await heroNav({ media: true, tone: null });
    expect(nav.header.className).toContain(GLASS);
    expect(nav.header).not.toHaveAttribute('data-nav-tone');
  });

  it('strip latar gelap: transparan, logo/menu/akun/tombol menu putih penuh; CTA biru tetap', async () => {
    const nav = renderAt('/');
    await heroNav({ media: true, tone: 'light' });
    expect(nav.header.className).toContain('bg-transparent');
    expect(nav.header.className).not.toContain(GLASS);
    expect(nav.header).toHaveAttribute('data-nav-tone', 'light');
    expect(nav.logoMark().getAttribute('class')).toContain('text-on-media');
    expect(nav.header.querySelector('a[aria-label^="Garuda Nexa"] .text-fg')).toBeNull();
    const template = await nav.bar().findByRole('link', { name: 'Template' });
    expect(template.className).toContain('text-on-media');
    expect(template.className).not.toContain('text-on-media-muted');
    expect(nav.bar().getByRole('button', { name: /^Jasa/ }).className).toContain('text-on-media');
    expect(nav.bar().getByRole('link', { name: 'Sign up' }).className).toContain('text-on-media');
    expect(nav.bar().getByRole('link', { name: 'Sign up' }).className).not.toMatch(/outline|ring-/);
    expect(nav.burger().className).toContain('text-on-media');
    expect(nav.header.querySelector('.btn-primary')).not.toBeNull();
    // Tidak ada sisa teks gelap di bar
    expect(nav.header.querySelector('nav[aria-label="Navigasi utama"] .text-muted')).toBeNull();
  });

  it('strip latar terang: transparan dengan teks gelap seperti biasa', async () => {
    const nav = renderAt('/');
    await heroNav({ media: true, tone: 'dark' });
    expect(nav.header.className).toContain('bg-transparent');
    expect(nav.header).not.toHaveAttribute('data-nav-tone');
    expect(nav.logoMark().getAttribute('class')).toContain('text-primary');
    expect((await nav.bar().findByRole('link', { name: 'Template' })).className).toContain('text-muted');
  });

  it('digulir: putih kaca + teks gelap; kembali ke puncak: transparan + teks putih lagi', async () => {
    const nav = renderAt('/');
    await heroNav({ media: true, tone: 'light' });
    const template = await nav.bar().findByRole('link', { name: 'Template' });
    await scrollTo(300);
    expect(nav.header.className).toContain(GLASS);
    expect(nav.header).not.toHaveAttribute('data-nav-tone');
    expect(nav.logoMark().getAttribute('class')).toContain('text-primary');
    expect(template.className).toContain('text-muted');
    expect(nav.burger().className).toContain('text-fg');
    await scrollTo(0);
    expect(nav.header.className).toContain('bg-transparent');
    expect(nav.header).toHaveAttribute('data-nav-tone', 'light');
    expect(template.className).toContain('text-on-media');
    expect(template.className).not.toContain('text-muted');
  });

  it('menu HP terbuka: latar putih dan teks gelap (termasuk tombol tutup)', async () => {
    const nav = renderAt('/');
    await heroNav({ media: true, tone: 'light' });
    fireEvent.click(nav.burger());
    expect(nav.header.className).toContain('bg-canvas');
    expect(nav.header).not.toHaveAttribute('data-nav-tone');
    expect(screen.getByRole('button', { name: 'Tutup menu' }).className).toContain('text-fg');
  });

  it('di luar beranda nada hero tidak berpengaruh', async () => {
    const nav = renderAt('/harga');
    await heroNav({ media: true, tone: 'light' });
    expect(nav.header.className).toContain('bg-transparent');
    expect(nav.header).not.toHaveAttribute('data-nav-tone');
    expect(nav.logoMark().getAttribute('class')).toContain('text-primary');
  });

  it('panel dropdown putih ditandai data-nav-surface (cincin fokus biru di dalamnya, bukan putih)', async () => {
    const nav = renderAt('/');
    await heroNav({ media: true, tone: 'light' });
    fireEvent.click(await nav.bar().findByRole('button', { name: /^Jasa/ }));
    const panel = document.querySelector('[data-nav-surface]');
    expect(panel).not.toBeNull();
    expect(panel!.querySelector('a')).not.toBeNull();
  });
});
