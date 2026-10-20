// @vitest-environment jsdom
// Jalankan: npx vitest run --dir src/pages/public/custom-order
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CustomOrder from '../../CustomOrder';
import { toPayload, validateAll, EMPTY_VALUES } from '../validation';

let lastBody: Record<string, unknown> | null = null;
let submitResponse: () => Response;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  lastBody = null;
  submitResponse = () => json(200, { success: true, reference: 'CUS-000042' });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const action = url.searchParams.get('action');
      if (action === 'submit_custom_order') {
        lastBody = JSON.parse(String(init?.body));
        return submitResponse();
      }
      if (action === 'get_settings') return json(200, { footer_whatsapp: '0812-0000-1111' });
      return json(200, []);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/pesan-custom']}>
      <CustomOrder />
    </MemoryRouter>,
  );

const fill = () => {
  fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Budi Santoso' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'budi@example.com' } });
  fireEvent.change(screen.getByLabelText('Nomor WhatsApp'), { target: { value: '0812-3456-7890' } });
  fireEvent.click(screen.getByRole('radio', { name: /Aplikasi Mobile/ }));
  fireEvent.change(screen.getByLabelText('Ceritakan kebutuhan Anda'), {
    target: { value: 'Aplikasi pemesanan katering untuk pelanggan, dengan pembayaran dan notifikasi.' },
  });
};

describe('validasi pesanan custom', () => {
  it('field wajib & format', () => {
    const errors = validateAll(EMPTY_VALUES);
    expect(Object.keys(errors).sort()).toEqual(['description', 'email', 'name', 'phone', 'service_type']);
  });

  it('payload: nomor dinormalisasi, opsional kosong tidak dikirim, honeypot ikut', () => {
    const payload = toPayload({ ...EMPTY_VALUES, name: ' Budi ', email: 'b@x.co', phone: '0812 3456-7890', service_type: 'website', description: 'x'.repeat(30) });
    expect(payload).toEqual({ name: 'Budi', email: 'b@x.co', phone: '081234567890', service_type: 'website', description: 'x'.repeat(30), website: '' });
  });
});

describe('halaman /pesan-custom', () => {
  it('tanpa harga, menampilkan error per field saat dikirim kosong', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pesan Website / Aplikasi Mobile Custom');
    expect(document.body.textContent).not.toMatch(/Rp\s?\d/);
    fireEvent.click(screen.getByRole('button', { name: /Kirim Kebutuhan/ }));
    expect(await screen.findByText('Nama wajib diisi.')).toBeInTheDocument();
    expect(screen.getByText(/Pilih jenis layanan/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nama lengkap')).toHaveAttribute('aria-invalid', 'true');
    expect(lastBody).toBeNull();
  });

  it('kirim → layar sukses dengan nomor referensi, WhatsApp, dan ajakan buat akun', async () => {
    renderPage();
    fill();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Kirim Kebutuhan/ }));
    });
    expect(await screen.findByText('CUS-000042')).toBeInTheDocument();
    expect(lastBody).toMatchObject({ action: 'submit_custom_order', service_type: 'mobile_app', phone: '081234567890', website: '' });
    const wa = screen.getByRole('link', { name: /Lanjutkan via WhatsApp/ });
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281200001111\?text=/);
    expect(decodeURIComponent(wa.getAttribute('href') ?? '')).toContain('CUS-000042');
    expect(decodeURIComponent(wa.getAttribute('href') ?? '')).not.toContain('Budi');
    expect(screen.getAllByRole('link', { name: 'Buat Akun' })[0]).toHaveAttribute('href', '/daftar');
  });

  it('error per field dari server tampil di bawah field', async () => {
    submitResponse = () => json(400, { error: 'Email tidak valid.', code: 'VALIDATION', errors: { email: 'Format email tidak valid, contoh: nama@email.com' } });
    renderPage();
    fill();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Kirim Kebutuhan/ }));
    });
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Periksa kembali isian yang ditandai.')).toBeInTheDocument();
    expect(screen.getByText('Format email tidak valid, contoh: nama@email.com')).toBeInTheDocument();
  });

  it('batas kiriman (429) → pesan server', async () => {
    submitResponse = () => json(429, { error: 'Terlalu banyak percobaan. Coba lagi dalam 30 menit.' });
    renderPage();
    fill();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Kirim Kebutuhan/ }));
    });
    expect(await screen.findByText(/Terlalu banyak percobaan/)).toBeInTheDocument();
  });
});
