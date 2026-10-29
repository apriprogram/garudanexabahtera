// @vitest-environment jsdom
// Sidebar admin: angka notifikasi di kanan menu (admin_dashboard_summary) dan grup Custom bersubmenu seperti Produk.
// Jalankan: node node_modules/vitest/vitest.mjs run src/components/admin/__tests__/sidebar.test.tsx
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '../Sidebar';
import { getAdminCrumbs } from '../nav';
import { refreshAdminNavBadges } from '../useAdminNavBadges';

function summary(approval: number, domain: number, customNew: number) {
  return {
    success: true,
    template_orders: { total: 9, this_month: 2, by_status: { menunggu_approval: approval, proses_domain: domain } },
    custom_projects: { total: 4, this_month: 1, from_website_pending: customNew },
    revenue: { template_paid: 0, custom_total: 0 },
    recent_template_orders: [],
  };
}

/** fetch tiruan: admin_dashboard_summary memakai `current.body`; aksi lain = 500. */
function mockSummary(body: unknown) {
  const current = { body };
  const fetchMock = vi.fn((url: string) => {
    const action = new URL(url, 'http://localhost').searchParams.get('action') ?? '';
    const known = action === 'admin_dashboard_summary';
    return Promise.resolve(new Response(JSON.stringify(known ? current.body : { error: 'tidak dipakai' }), { status: known ? 200 : 500 }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return { current, fetchMock };
}

function renderAt(path: string, role: 'admin' | 'user' = 'admin') {
  localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'Uji', role }));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

const link = (name: RegExp) => screen.getByRole('link', { name });

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('Sidebar admin: angka notifikasi', () => {
  it('submenu terbuka: angka per anak, induk tidak mengulang', async () => {
    mockSummary(summary(2, 1, 3));
    renderAt('/admin/pesanan-template');
    await waitFor(() => expect(link(/^Order Masuk/)).toHaveTextContent('2'));
    expect(link(/^Order Masuk/)).toHaveAccessibleName('Order Masuk, 2 perlu ditindaklanjuti');
    expect(link(/^Input Domain/)).toHaveTextContent('1');
    expect(link(/^Kelola Template/)).not.toHaveTextContent(/\d/);
    expect(link(/^Pesanan Template/)).not.toHaveTextContent(/\d/);
  });

  it('submenu tertutup: induk menampilkan jumlah angka anak-anaknya', async () => {
    mockSummary(summary(2, 1, 3));
    renderAt('/admin/settings');
    await waitFor(() => expect(link(/^Pesanan Template/)).toHaveTextContent('3'));
    expect(link(/^Proyek Custom/)).toHaveTextContent('3');
    expect(screen.queryByRole('link', { name: /^Order Masuk/ })).toBeNull();
  });

  it('tanpa pekerjaan tertunda tidak ada angka', async () => {
    const { fetchMock } = mockSummary(summary(0, 0, 0));
    renderAt('/admin/pesanan-template');
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText(/perlu ditindaklanjuti/)).toBeNull();
  });

  it('refreshAdminNavBadges() memuat ulang angka setelah halaman mengubah pesanan', async () => {
    const { current } = mockSummary(summary(2, 0, 0));
    renderAt('/admin/pesanan-template');
    await waitFor(() => expect(link(/^Order Masuk/)).toHaveTextContent('2'));
    current.body = summary(0, 1, 0);
    act(() => refreshAdminNavBadges());
    await waitFor(() => expect(link(/^Order Masuk/)).not.toHaveTextContent(/\d/));
    expect(link(/^Input Domain/)).toHaveTextContent('1');
  });

  it('lebih dari 99 ditulis 99+', async () => {
    mockSummary(summary(120, 0, 0));
    renderAt('/admin/pesanan-template');
    await waitFor(() => expect(link(/^Order Masuk/)).toHaveTextContent('99+'));
  });
});

describe('Sidebar admin: grup Custom bersubmenu', () => {
  it('Klien membuka submenu Proyek Custom dan hanya Klien yang aktif', async () => {
    mockSummary(summary(0, 0, 3));
    renderAt('/admin/klien');
    expect(link(/^Klien/)).toHaveAttribute('aria-current', 'page');
    expect(link(/^Dashboard proyek/)).not.toHaveAttribute('aria-current');
    expect(link(/^Project Clients/)).toHaveAttribute('href', '/admin/project-clients');
    await waitFor(() => expect(link(/^Project Clients/)).toHaveTextContent('3'));
  });

  it('Pengaturan dokumen tidak ikut menyorot Dashboard proyek', () => {
    mockSummary(summary(0, 0, 0));
    renderAt('/admin/proyek/pengaturan');
    expect(link(/^Pengaturan dokumen/)).toHaveAttribute('aria-current', 'page');
    expect(link(/^Dashboard proyek/)).not.toHaveAttribute('aria-current');
  });

  it('workspace proyek menyorot Dashboard proyek', () => {
    mockSummary(summary(0, 0, 0));
    renderAt('/admin/proyek/12');
    expect(link(/^Dashboard proyek/)).toHaveAttribute('aria-current', 'page');
  });

  it('staf tidak melihat Pengaturan dokumen', () => {
    mockSummary(summary(0, 0, 0));
    renderAt('/admin/proyek', 'user');
    expect(link(/^Dashboard proyek/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Pengaturan dokumen/ })).toBeNull();
  });

  it('breadcrumb mengikuti struktur baru', () => {
    expect(getAdminCrumbs('/admin/klien')).toEqual({ parent: expect.objectContaining({ label: 'Proyek Custom' }), label: 'Klien' });
    expect(getAdminCrumbs('/admin/proyek/12')).toEqual({
      parent: expect.objectContaining({ label: 'Dashboard proyek', path: '/admin/proyek' }),
      label: 'Workspace proyek',
    });
    expect(getAdminCrumbs('/admin/proyek/pengaturan').label).toBe('Pengaturan dokumen');
  });
});
