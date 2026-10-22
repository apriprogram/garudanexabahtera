// Nilai kontrak (project_client.price) hanya untuk admin (docs/platform/SPEC.md §2): Developer melihat anggaran sebagai
// teks baca-saja dengan catatan singkat, dan form tidak pernah mengirim `price` untuknya (backend menolak dengan 403).
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectFormDrawer } from '../ProjectFormDrawer';
import type { Project } from '../projectShared';

const apiPost = vi.fn();
vi.mock('../../../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../lib/api')>()),
  apiPost: (...args: unknown[]) => apiPost(...args),
}));
const role = { current: 'user' };
vi.mock('../../../../lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../lib/auth')>()),
  getRole: () => role.current,
}));

const PROJECT: Project = {
  id: 201,
  name: 'Website Toko Bunga',
  client_name: 'CV Melati',
  client_email: 'melati@contoh.test',
  client_phone: '',
  service_type: 'website',
  status: 'active',
  price: 27500000,
  start_date: '2026-10-01',
  end_date: '2026-12-31',
  image: '',
  project_files: '[]',
  description: '',
  assigned_user: '',
  show_on_website: 0,
  source: 'admin',
};

const renderDrawer = (project: Project | null) => {
  const onSaved = vi.fn();
  render(<ProjectFormDrawer open project={project} usersList={[]} onClose={() => {}} onSaved={onSaved} onError={() => {}} />);
  return { onSaved };
};
const priceInput = () => screen.getByLabelText('Anggaran (IDR)') as HTMLInputElement;
const sent = () => apiPost.mock.calls[0] as [string, Record<string, unknown>];

beforeEach(() => {
  apiPost.mockReset();
  apiPost.mockResolvedValue({ success: true });
});

describe('ProjectFormDrawer: nilai kontrak hanya untuk admin', () => {
  it('Developer: anggaran proyek tampil baca-saja dengan catatan, dan update_project dikirim tanpa price', async () => {
    role.current = 'user';
    const { onSaved } = renderDrawer(PROJECT);
    const input = priceInput();
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveValue('27.500.000');
    expect(input).toHaveAccessibleDescription('Nilai kontrak hanya dapat diisi dan diubah oleh admin.');
    fireEvent.change(input, { target: { value: '99000000' } });
    expect(priceInput()).toHaveValue('27.500.000');

    fireEvent.change(screen.getByLabelText(/Nama proyek/), { target: { value: 'Website Toko Bunga v2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(true, 'Website Toko Bunga v2'));
    const [action, payload] = sent();
    expect(action).toBe('update_project');
    expect(payload).not.toHaveProperty('price');
    expect(payload).toMatchObject({ id: 201, name: 'Website Toko Bunga v2' });
  });

  it('Developer: proyek baru dibuat tanpa price (nilai kontrak diisi admin)', async () => {
    role.current = 'user';
    const { onSaved } = renderDrawer(null);
    expect(priceInput()).toHaveAttribute('readonly');
    expect(priceInput()).toHaveValue('');
    expect(priceInput()).toHaveAttribute('placeholder', 'Belum ditentukan');

    fireEvent.change(screen.getByLabelText(/Nama klien/), { target: { value: 'PT Contoh' } });
    fireEvent.change(screen.getByLabelText(/Nama proyek/), { target: { value: 'Company profile' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buat proyek' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(false, 'Company profile'));
    const [action, payload] = sent();
    expect(action).toBe('add_project');
    expect(payload).not.toHaveProperty('price');
  });

  it('Admin: anggaran tetap bisa diisi dan diubah, dan dikirim sebagai price', async () => {
    role.current = 'admin';
    const { onSaved } = renderDrawer(PROJECT);
    const input = priceInput();
    expect(input).not.toHaveAttribute('readonly');
    expect(screen.queryByText('Nilai kontrak hanya dapat diisi dan diubah oleh admin.')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: '30.000.000' } });
    expect(priceInput()).toHaveValue('30.000.000');

    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [action, payload] = sent();
    expect(action).toBe('update_project');
    expect(payload).toMatchObject({ id: 201, price: 30000000 });
  });
});
