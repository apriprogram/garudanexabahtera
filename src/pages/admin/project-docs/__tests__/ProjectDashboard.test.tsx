// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/admin/project-docs/__tests__/ProjectDashboard.test.tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboard } from './fixtures';

const api = vi.hoisted(() => ({ pdDashboard: vi.fn() }));
vi.mock('../../../../features/project-docs/api', () => api);

import ProjectDashboard from '../ProjectDashboard';

function Where() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}

function renderDashboard(path = '/admin/proyek') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/proyek" element={<ProjectDashboard />} />
        <Route path="/admin/proyek/:id" element={<p>Halaman workspace</p>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  api.pdDashboard.mockReset();
});
afterEach(cleanup);

describe('Dashboard proyek', () => {
  it('menampilkan statistik, pipeline tahapan, proyek, persetujuan, invoice jatuh tempo, dan aktivitas', async () => {
    api.pdDashboard.mockResolvedValue(dashboard());
    renderDashboard();

    expect(await screen.findAllByText('Aplikasi Kasir')).not.toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'Dashboard proyek' })).toBeInTheDocument();
    // Belum dibayar & jatuh tempo: Rp 7.500.000
    expect(screen.getAllByText(/7\.500\.000/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/1 invoice lewat jatuh tempo/)).toBeInTheDocument();
    // Angka ringkas di kartu, jumlah lengkap di keterangan
    expect(screen.getAllByText(/^Rp 7,5\sjt$/)).toHaveLength(2);
    // Pipeline: 9 tahap sebagai tombol filter
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(9);
    // Proyek: kode, chip dokumen kurang, proyek tanpa kode
    expect(screen.getAllByText('PRJ-2026-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PKS + SOW').length).toBeGreaterThan(0);
    expect(screen.getByText('Belum ada kode')).toBeInTheDocument();
    // Panel samping
    expect(screen.getByText('001/PRP/GNB/X/2026')).toBeInTheDocument();
    expect(screen.getAllByText('001/INV/GNB/X/2026').length).toBeGreaterThan(0);
    expect(screen.getByText('Proposal 001/PRP/GNB/X/2026 diajukan untuk persetujuan klien')).toBeInTheDocument();
    expect(api.pdDashboard).toHaveBeenCalledTimes(1);
  });

  it('tahap di pipeline menyaring proyek dan tersimpan di URL', async () => {
    api.pdDashboard.mockResolvedValue(dashboard());
    renderDashboard();
    await screen.findAllByText('Aplikasi Kasir');

    fireEvent.click(screen.getByRole('button', { name: /Perencanaan/ }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin/proyek?tahap=perencanaan'));
    expect(screen.getByRole('button', { name: /Perencanaan/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('Aplikasi Kasir').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Toko Sejahtera').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('PT Klien Maju')).toHaveLength(0);

    // Klik lagi = semua tahap
    fireEvent.click(screen.getByRole('button', { name: /Perencanaan/ }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/admin\/proyek$/));
    expect(screen.getAllByText('PT Klien Maju').length).toBeGreaterThan(0);
  });

  it('filter tahap dari URL dan pencarian; hasil kosong bisa dihapus filternya', async () => {
    api.pdDashboard.mockResolvedValue(dashboard());
    renderDashboard('/admin/proyek?tahap=kontrak');
    expect(await screen.findAllByText('PT Klien Maju')).not.toHaveLength(0);
    expect(screen.queryAllByText('Toko Sejahtera')).toHaveLength(0);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Cari proyek' }), { target: { value: 'kasir' } });
    expect(await screen.findByText('Proyek tidak ditemukan.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hapus filter' }));
    expect(await screen.findAllByText('Toko Sejahtera')).not.toHaveLength(0);
    expect(screen.getAllByText('PT Klien Maju').length).toBeGreaterThan(0);
  });

  it('klik proyek membuka workspace', async () => {
    api.pdDashboard.mockResolvedValue(dashboard());
    renderDashboard();
    const links = await screen.findAllByRole('link', { name: 'Buka workspace Aplikasi Kasir' });
    fireEvent.click(links[0]);
    expect(await screen.findByText('Halaman workspace')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/proyek/2');
  });

  it('gagal memuat menampilkan error dan "Coba lagi" memuat ulang', async () => {
    api.pdDashboard.mockRejectedValueOnce(new Error('Server sedang sibuk.')).mockResolvedValueOnce(dashboard());
    renderDashboard();
    expect(await screen.findByText('Gagal memuat dashboard proyek')).toBeInTheDocument();
    expect(screen.getByText('Server sedang sibuk.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findAllByText('Aplikasi Kasir')).not.toHaveLength(0);
    expect(api.pdDashboard).toHaveBeenCalledTimes(2);
  });

  it('belum ada proyek menampilkan status kosong dengan ajakan menambah proyek', async () => {
    api.pdDashboard.mockResolvedValue(dashboard({ projects: [], pending_approvals: [], due_invoices: [], activity: [] }));
    renderDashboard();
    expect(await screen.findByText('Belum ada proyek custom.')).toBeInTheDocument();
    expect(screen.getByText('Tidak ada dokumen yang menunggu.')).toBeInTheDocument();
    expect(screen.getByText('Tidak ada invoice jatuh tempo.')).toBeInTheDocument();
    const add = screen.getAllByRole('link', { name: /Tambah proyek/ });
    expect(add[0]).toHaveAttribute('href', '/admin/project-clients?new=1');
  });
});
