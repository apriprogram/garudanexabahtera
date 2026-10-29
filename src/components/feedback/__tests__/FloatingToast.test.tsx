// @vitest-environment jsdom
// Notifikasi melayang bersama (admin + akun pembeli): peran ARIA per nada, judul + deskripsi, tombol aksi dan tutup.
// Jalankan: node node_modules/vitest/vitest.mjs run src/components/feedback/__tests__/FloatingToast.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloatingToast } from '../FloatingToast';

afterEach(cleanup);

describe('FloatingToast', () => {
  it('sukses = status (sopan), judul dan deskripsi tampil', () => {
    render(
      <FloatingToast variant="admin" toast={{ id: 1, tone: 'success', title: 'Klien berhasil dihapus.', description: 'Data klien sudah tidak ada.' }} onClose={() => {}} />,
    );
    const card = screen.getByRole('status');
    expect(card).toHaveTextContent('Klien berhasil dihapus.');
    expect(card).toHaveTextContent('Data klien sudah tidak ada.');
    expect(card.parentElement).toHaveAttribute('aria-live', 'polite');
  });

  it('gagal = alert (tegas)', () => {
    render(<FloatingToast variant="account" toast={{ id: 2, tone: 'error', title: 'Gagal menyimpan.' }} onClose={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal menyimpan.');
    expect(screen.getByRole('alert').parentElement).toHaveAttribute('aria-live', 'assertive');
  });

  it('tombol aksi menjalankan aksinya lalu menutup; tombol tutup memakai label per varian', () => {
    const onClose = vi.fn();
    const undo = vi.fn();
    const { rerender } = render(
      <FloatingToast variant="account" toast={{ id: 3, tone: 'info', title: 'Item dihapus.', action: { label: 'Urungkan', onClick: undo } }} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Urungkan' }));
    expect(undo).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Tutup notifikasi' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    rerender(<FloatingToast variant="admin" toast={{ id: 4, tone: 'warning', title: 'Periksa lagi.' }} onClose={onClose} />);
    expect(screen.getByRole('button', { name: 'Tutup' })).toBeInTheDocument();
  });

  it('tanpa toast hanya wadah live region kosong', () => {
    const { container } = render(<FloatingToast variant="admin" toast={null} onClose={() => {}} />);
    expect(container.firstElementChild).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
