// @vitest-environment jsdom
// Navbar di atas hero berlatar gambar/video: putih kaca sejak puncak halaman (media tampil penuh dan bisa gelap).
// Jalankan: npx vitest run src/components/layout/__tests__/navbarHeroMedia.test.tsx
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from '../Navbar';

// Pengaturan situs yang bisa diganti per tes (cache useCachedJson per modul tidak bisa diulang tanpa reset modul)
const siteSettings = vi.hoisted(() => ({ settings: {} as Record<string, string | undefined>, loaded: true }));
vi.mock('../../../hooks/useSiteSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useSiteSettings')>()),
  useSiteSettings: () => siteSettings,
}));

const GLASS = 'bg-canvas/85';
const IMAGE = { hero_bg_mode: 'image', hero_images: '["/assets/bg/hero_1.jpg"]' };
const VIDEO = { hero_bg_mode: 'video', hero_bg_video: '/assets/bg/hero_video_0123456789ab.mp4' };

const headerAt = (path: string) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>,
  );
  return document.querySelector('header') as HTMLElement;
};

beforeEach(() => {
  // Menu navbar dari API: kosong → menu bawaan
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })));
  siteSettings.settings = {};
  siteSettings.loaded = true;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Navbar di atas latar hero', () => {
  it('latar bawaan: transparan di puncak beranda', () => {
    expect(headerAt('/').className).toContain('bg-transparent');
  });

  it('latar gambar atau video: putih kaca sejak puncak beranda', () => {
    siteSettings.settings = IMAGE;
    expect(headerAt('/').className).toContain(GLASS);
    cleanup();
    siteSettings.settings = VIDEO;
    expect(headerAt('/').className).toContain(GLASS);
  });

  it('konfigurasi media tidak sah jatuh ke bawaan: tetap transparan', () => {
    siteSettings.settings = { hero_bg_mode: 'image', hero_images: '[]' };
    expect(headerAt('/').className).toContain('bg-transparent');
  });

  it('selama pengaturan belum dimuat: transparan (belum tahu latarnya)', () => {
    siteSettings.settings = IMAGE;
    siteSettings.loaded = false;
    expect(headerAt('/').className).toContain('bg-transparent');
  });

  it('di luar beranda latar hero tidak berpengaruh', () => {
    siteSettings.settings = IMAGE;
    expect(headerAt('/halaman-tidak-ada').className).toContain('bg-transparent');
  });
});
