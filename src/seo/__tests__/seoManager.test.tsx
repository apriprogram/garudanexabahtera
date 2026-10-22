// @vitest-environment jsdom
// Jalankan: npx vitest run src/seo
// SeoManager (docs/platform/SEO-PLAN.md §5.3 langkah 4): di host utama menerapkan head per path saat navigasi klien,
// menunggu data sebelum menerapkan kepala halaman publik (tidak pernah menimpa head prerender dengan 404/noindex hanya
// karena data belum datang atau API gagal), tidak menimpa judul yang dipasang halaman akun, dan tidak melakukan apa pun
// di domain pembeli (head tetap milik siteHead.ts).
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, useNavigate, type NavigateFunction } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearApiCache } from '../../lib/api';
import { SeoManager } from '../SeoManager';
import { TEMPLATES } from './fixtures';

const mainHost = vi.hoisted(() => ({ value: true }));
vi.mock('../../templates/siteHosts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../templates/siteHosts')>()),
  isMainHost: () => mainHost.value,
}));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
let templatesResponse: () => Promise<Response>;
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes('action=get_templates')) return templatesResponse();
  if (url.includes('action=get_settings')) return json({ footer_instagram: '#' });
  return json({});
});

let navigate: NavigateFunction = () => undefined;
function Navigator() {
  const nav = useNavigate();
  useEffect(() => {
    navigate = nav;
  }, [nav]);
  return null;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Navigator />
      <SeoManager />
    </MemoryRouter>,
  );

const go = async (path: string) => {
  await act(async () => {
    navigate(path);
  });
};

const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
const description = () => document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? null;
const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null;

beforeEach(() => {
  mainHost.value = true;
  clearApiCache();
  fetchMock.mockClear();
  templatesResponse = async () => json({ templates: TEMPLATES, categories: [] });
  vi.stubGlobal('fetch', fetchMock);
  document.head.innerHTML = '<title>Memuat situs…</title>';
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.head.innerHTML = '';
});

describe('SeoManager di host utama', () => {
  it('navigasi / → /template/aura-studio → /pesan-custom mengganti title, description, canonical dan JSON-LD', async () => {
    renderAt('/');
    await waitFor(() => expect(document.title).toBe('Template Website Siap Pakai & Jasa Website | Garuda Nexa'));
    expect(canonical()).toBe('https://garudanexa.com/');

    await go('/template/aura-studio');
    await waitFor(() => expect(document.title).toBe('Aura Studio: Template Kecantikan & Klinik – Rp1,39 jt'));
    expect(canonical()).toBe('https://garudanexa.com/template/aura-studio');
    expect(description()).toContain('Rp1.390.000');
    expect(document.head.querySelector('script[type="application/ld+json"]')?.textContent).toContain('"@type":"Product"');

    await go('/pesan-custom?layanan=website');
    await waitFor(() => expect(document.title).toBe('Pesan Website / Aplikasi Mobile Custom | Garuda Nexa'));
    expect(canonical()).toBe('https://garudanexa.com/pesan-custom');
    expect(document.head.querySelector('script[type="application/ld+json"]')?.textContent).not.toContain('Product');
    expect(document.head.querySelectorAll('[data-gn="canonical"]').length).toBe(1);
  });

  it('menunggu data: head prerender tidak ditimpa kepala 404 selama get_templates belum selesai', async () => {
    let release: (value: Response) => void = () => undefined;
    templatesResponse = () => new Promise<Response>((resolve) => (release = resolve));
    document.head.innerHTML = '<title>Aura Studio prerender</title><meta name="robots" content="index,follow" data-gn="robots">';
    renderAt('/template/aura-studio');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(document.title).toBe('Aura Studio prerender');
    expect(robots()).toBe('index,follow');
    await act(async () => release(json({ templates: TEMPLATES })));
    await waitFor(() => expect(document.title).toBe('Aura Studio: Template Kecantikan & Klinik – Rp1,39 jt'));
  });

  it('API template gagal: halaman template tidak diturunkan ke noindex; 404 sungguhan tetap diterapkan', async () => {
    templatesResponse = async () => json({ error: 'down' }, 500);
    document.head.innerHTML = '<title>Aura Studio prerender</title><meta name="robots" content="index,follow" data-gn="robots">';
    renderAt('/template/aura-studio');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(document.title).toBe('Aura Studio prerender');
    expect(robots()).toBe('index,follow');

    await go('/halaman-tidak-ada');
    await waitFor(() => expect(document.title).toBe('Halaman tidak ditemukan | Garuda Nexa'));
    expect(robots()).toBe('noindex,follow');
  });

  it('rute aplikasi: noindex langsung, dan judul yang dipasang halaman tidak ditimpa saat data datang', async () => {
    let release: (value: Response) => void = () => undefined;
    templatesResponse = () => new Promise<Response>((resolve) => (release = resolve));
    renderAt('/akun');
    await waitFor(() => expect(robots()).toBe('noindex,follow'));
    expect(document.title).toBe('Akun saya | Garuda Nexa');
    document.title = 'Judul dari halaman akun';
    await act(async () => release(json({ templates: TEMPLATES })));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(document.title).toBe('Judul dari halaman akun');
    expect(canonical()).toBeNull();
  });
});

describe('SeoManager di domain pembeli', () => {
  it('tidak menulis tag Garuda Nexa dan tidak meminta data', async () => {
    mainHost.value = false;
    document.head.innerHTML = '<title>Toko Contoh — Kue rumahan</title><meta name="description" content="Kue rumahan.">';
    renderAt('/');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(document.title).toBe('Toko Contoh — Kue rumahan');
    expect(description()).toBe('Kue rumahan.');
    expect(document.head.querySelector('[data-gn]')).toBeNull();
    expect(document.head.innerHTML).not.toContain('garudanexa.com');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
