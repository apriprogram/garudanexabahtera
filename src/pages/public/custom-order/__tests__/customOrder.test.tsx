// @vitest-environment jsdom
// Jalankan: npx vitest run --dir src/pages/public/custom-order
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CustomOrder from '../../CustomOrder';
import { checkWhatsapp, serviceFromParam, toPayload, validateAll, EMPTY_VALUES } from '../validation';

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

const renderPage = (path = '/pesan-custom') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CustomOrder />
    </MemoryRouter>,
  );

const fill = () => {
  fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Budi Santoso' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'budi@example.com' } });
  fireEvent.change(screen.getByLabelText('Nomor WhatsApp'), { target: { value: '0812-3456-7890' } });
  fireEvent.click(screen.getByRole('radio', { name: /Aplikasi Mobile/ }));
  fireEvent.change(screen.getByLabelText('Detail kebutuhan'), {
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

  it('nomor WhatsApp: pesan sama dengan form template (en dash)', () => {
    expect(checkWhatsapp('')).toBe('Nomor WhatsApp wajib diisi.');
    expect(checkWhatsapp('0812')).toBe('Nomor tidak valid. Gunakan 8–15 digit angka, contoh: 081234567890.');
    expect(checkWhatsapp('0812-3456-7890')).toBeUndefined();
  });

  it('?layanan= dari tautan Footer → jenis layanan', () => {
    expect(serviceFromParam('website')).toBe('website');
    expect(serviceFromParam('mobile')).toBe('mobile_app');
    expect(serviceFromParam('Mobile_App')).toBe('mobile_app');
    expect(serviceFromParam('desain')).toBe('');
    expect(serviceFromParam(null)).toBe('');
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
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveAttribute('aria-invalid', 'true');
      expect(radio).toBeRequired();
    }
    expect(lastBody).toBeNull();
  });

  it('kosakata & field wajib: aria-required, placeholder "mis.", label sesuai glosarium', () => {
    renderPage();
    for (const label of ['Nama lengkap', 'Email', 'Nomor WhatsApp', 'Detail kebutuhan']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-required', 'true');
    }
    const company = screen.getByLabelText('Nama perusahaan / instansi (opsional)');
    expect(company).not.toHaveAttribute('aria-required');
    expect(company).toHaveAttribute('placeholder', 'mis. PT Maju Bersama');
    expect(screen.getByLabelText('Nomor WhatsApp')).toHaveAttribute('placeholder', 'mis. 0812-3456-7890');
    expect(screen.getByText('0/5.000')).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Daftar Akun' })).toHaveAttribute('href', '/daftar');
    expect(screen.queryByText(/memantau status pesanan kapan saja/)).not.toBeInTheDocument();
  });

  it('?layanan=mobile memilih Aplikasi Mobile sejak awal; ?layanan=website memilih Website', () => {
    renderPage('/pesan-custom?layanan=mobile');
    expect(screen.getByRole('radio', { name: /Aplikasi Mobile/ })).toBeChecked();
    cleanup();
    renderPage('/pesan-custom?layanan=website');
    expect(screen.getByRole('radio', { name: /Website/ })).toBeChecked();
    cleanup();
    renderPage('/pesan-custom');
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
  });

  it('H1 ringkas di HP (24px) dan breadcrumb 13px', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('text-[24px]');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).className).toContain('text-[13px]');
  });

  it('kirim → layar sukses dengan nomor referensi dan WhatsApp (tombol biru brand), tanpa janji pemantauan di akun', async () => {
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
    expect(wa).toHaveClass('btn-primary');
    expect(wa).not.toHaveClass('bg-whatsapp');
    expect(screen.getByText(/Simpan nomor ini \(mis\. dengan screenshot\)/)).toBeInTheDocument();
    expect(within(screen.getByRole('main')).queryByRole('link', { name: 'Daftar Akun' })).not.toBeInTheDocument();
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
