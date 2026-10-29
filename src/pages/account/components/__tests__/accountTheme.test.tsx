// @vitest-environment jsdom
// Mode gelap panel akun pembeli: tombol bulan/matahari di topbar AccountLayout memasang .account-dark di <html>
// (supaya dialog & toast lewat portal ikut gelap), pilihan tersimpan per perangkat, dan dilepas saat keluar dari /akun.
// Jalankan: node node_modules/vitest/vitest.mjs run src/pages/account/components/__tests__/accountTheme.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountLayout from '../../AccountLayout';
import { ACCOUNT_DARK_CLASS, ACCOUNT_THEME_KEY } from '../useAccountTheme';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Token berformat JWT yang cukup untuk dibaca src/lib/auth.ts (klaim role & exp). */
const tokenFor = (role: string) => `h.${btoa(JSON.stringify({ sub: 7, role, exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`;

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/akun']}>
      <Routes>
        <Route path="/akun" element={<AccountLayout />}>
          <Route index element={<p>Isi halaman</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const html = () => document.documentElement;

describe('mode gelap panel akun', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => json(404, { error: 'tidak ada' })));
    localStorage.setItem('authToken', tokenFor('customer'));
    localStorage.setItem('currentUser', JSON.stringify({ id: 7, name: 'Budi Santoso', email: 'budi@example.com', role: 'customer' }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
    html().classList.remove(ACCOUNT_DARK_CLASS);
  });

  it('bawaan terang; tombol mengganti tema, menyimpannya, dan bisa kembali ke terang', () => {
    renderLayout();
    expect(html()).not.toHaveClass(ACCOUNT_DARK_CLASS);

    fireEvent.click(screen.getByRole('button', { name: 'Ganti ke mode gelap' }));
    expect(html()).toHaveClass(ACCOUNT_DARK_CLASS);
    expect(localStorage.getItem(ACCOUNT_THEME_KEY)).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Ganti ke mode terang' }));
    expect(html()).not.toHaveClass(ACCOUNT_DARK_CLASS);
    expect(localStorage.getItem(ACCOUNT_THEME_KEY)).toBe('light');
  });

  it('pilihan gelap tersimpan dipakai saat panel dibuka, dan dilepas saat panel ditutup', () => {
    localStorage.setItem(ACCOUNT_THEME_KEY, 'dark');
    const { unmount } = renderLayout();
    expect(html()).toHaveClass(ACCOUNT_DARK_CLASS);
    expect(screen.getByRole('button', { name: 'Ganti ke mode terang' })).toBeInTheDocument();
    unmount();
    // Situs publik tetap terang setelah keluar dari /akun
    expect(html()).not.toHaveClass(ACCOUNT_DARK_CLASS);
  });
});
