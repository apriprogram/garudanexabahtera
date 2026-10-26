// @vitest-environment jsdom
// Breadcrumb panel akun (accountNav.ts): halaman Berita & Pengumuman membawa ?jenis=pengumuman ke tautan daftar supaya
// kembali ke tab yang sama (docs/platform/SITE-POSTS-SEO-SPEC.md §8), dan AccountLayout meneruskan location.search.
// Jalankan: npx vitest run src/pages/account/components/__tests__/accountNav.test.tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountLayout from '../../AccountLayout';
import { accountCrumbs } from '../accountNav';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Token berformat JWT yang cukup untuk dibaca src/lib/auth.ts (klaim role & exp). */
const tokenFor = (role: string) => `h.${btoa(JSON.stringify({ sub: 7, role, exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`;

describe('accountCrumbs', () => {
  const postsCrumb = (pathname: string, search?: string) => accountCrumbs(pathname, search).find((crumb) => crumb.label === 'Berita & Pengumuman');

  it('editor & tulisan baru pengumuman: tautan daftar membawa ?jenis=pengumuman', () => {
    expect(accountCrumbs('/akun/situs/1/berita/5', '?jenis=pengumuman')).toEqual([
      { label: 'Situs saya', to: '/akun/situs' },
      { label: 'Kelola situs', to: '/akun/situs/1' },
      { label: 'Berita & Pengumuman', to: '/akun/situs/1/berita?jenis=pengumuman' },
      { label: 'Edit tulisan', to: null },
    ]);
    expect(accountCrumbs('/akun/situs/1/berita/baru', '?jenis=pengumuman').at(-1)).toEqual({ label: 'Tulisan baru', to: null });
    expect(postsCrumb('/akun/situs/1/berita/baru', '?jenis=pengumuman')?.to).toBe('/akun/situs/1/berita?jenis=pengumuman');
    // Query lain di samping jenis tidak mengganggu
    expect(postsCrumb('/akun/situs/1/berita/5', '?x=1&jenis=pengumuman')?.to).toBe('/akun/situs/1/berita?jenis=pengumuman');
  });

  it('berita (tanpa query, jenis lain, atau tanpa argumen search) = daftar tanpa query', () => {
    expect(postsCrumb('/akun/situs/1/berita/5')?.to).toBe('/akun/situs/1/berita');
    expect(postsCrumb('/akun/situs/1/berita/5', '')?.to).toBe('/akun/situs/1/berita');
    expect(postsCrumb('/akun/situs/1/berita/5', '?jenis=berita')?.to).toBe('/akun/situs/1/berita');
    expect(postsCrumb('/akun/situs/1/berita/5', '?jenis=lainnya')?.to).toBe('/akun/situs/1/berita');
  });

  it('halaman daftar sendiri = elemen terakhir tanpa tautan; halaman lain tidak terpengaruh query', () => {
    expect(postsCrumb('/akun/situs/1/berita', '?jenis=pengumuman')).toEqual({ label: 'Berita & Pengumuman', to: null });
    expect(accountCrumbs('/akun/situs/1/seo', '?jenis=pengumuman').at(-1)).toEqual({ label: 'SEO situs', to: null });
    expect(accountCrumbs('/akun/pesanan/GN-1', '?jenis=pengumuman')).toEqual([
      { label: 'Pesanan saya', to: '/akun/pesanan' },
      { label: 'GN-1', to: null },
    ]);
  });
});

describe('breadcrumb di AccountLayout', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const action = new URL(String(input), 'http://localhost').searchParams.get('action') ?? '';
        return action === 'get_settings' ? json(200, { footer_whatsapp: '0812-1111-2222' }) : json(404, { error: 'tidak ada' });
      }),
    );
    localStorage.setItem('authToken', tokenFor('customer'));
    localStorage.setItem('currentUser', JSON.stringify({ id: 7, name: 'Budi Santoso', email: 'budi@example.com', role: 'customer' }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const renderLayout = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/akun" element={<AccountLayout />}>
            <Route path="*" element={<p>Isi halaman</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

  it('editor pengumuman: tautan "Berita & Pengumuman" kembali ke tab Pengumuman', () => {
    renderLayout('/akun/situs/1/berita/3?jenis=pengumuman');
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Berita & Pengumuman' })).toHaveAttribute('href', '/akun/situs/1/berita?jenis=pengumuman');
    expect(within(crumbs).getByText('Edit tulisan')).toHaveAttribute('aria-current', 'page');
  });

  it('editor berita: tautan daftar tanpa query', () => {
    renderLayout('/akun/situs/1/berita/1');
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Berita & Pengumuman' })).toHaveAttribute('href', '/akun/situs/1/berita');
  });
});
