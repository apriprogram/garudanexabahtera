// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/public/__tests__/orderTemplate.test.tsx
// Halaman /pesan/:slug: judul & subjudul per keadaan, "Sudah termasuk", S&K + refund, validasi saat blur / setelah kirim.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OrderTemplate from '../OrderTemplate';
import { LEGAL_PATHS } from '../../../lib/legal';
import { TEMPLATE_PRICE_INCLUDES_DEFAULT } from '../../../hooks/useSiteSettings';

const TEMPLATE = {
  id: 1,
  slug: 'corporate-nexa',
  name: 'Corporate Nexa',
  category: 'Company Profile',
  short_description: 'Company profile elegan.',
  description: null,
  features: [],
  price: 1500000,
  preview_image: null,
  gallery: [],
  template_code: 'corporate-nexa',
  demo_url: null,
  status: 'published',
  sort_order: 1,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let posted: string[] = [];

const tokenFor = (role: string) => `h.${btoa(JSON.stringify({ sub: 7, role, exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`;
const loginAs = (role: string) => {
  localStorage.setItem('authToken', tokenFor(role));
  localStorage.setItem('currentUser', JSON.stringify({ id: 7, name: 'Budi Santoso', email: 'budi@example.com', phone: '081234567890', role }));
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  posted = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const action = url.searchParams.get('action');
      if (init?.method === 'POST') {
        posted.push(String(action));
        return json(500, { error: 'tidak boleh terkirim di tes ini' });
      }
      if (action === 'get_template') {
        return url.searchParams.get('slug') === TEMPLATE.slug ? json(200, { template: TEMPLATE }) : json(404, { error: 'Template tidak ditemukan.' });
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

const renderPage = (slug = TEMPLATE.slug) =>
  render(
    <MemoryRouter initialEntries={[`/pesan/${slug}`]}>
      <Routes>
        <Route path="/pesan/:slug" element={<OrderTemplate />} />
      </Routes>
    </MemoryRouter>,
  );

const heading = () => screen.getByRole('heading', { level: 1 });

describe('halaman /pesan/:slug', () => {
  it('tamu: judul nama template, subjudul ajakan masuk, hal yang perlu disiapkan, Daftar Akun, dan footer', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Pesan Corporate Nexa' })).toBeInTheDocument();
    expect(screen.getByText('Masuk atau daftar dulu (1 menit), lalu isi data dan domain Anda.')).toBeInTheDocument();
    expect(screen.getByText(/Yang perlu Anda siapkan: nama domain pilihan dan nomor WhatsApp aktif/)).toBeInTheDocument();
    const prompt = screen.getByRole('region', { name: 'Masuk untuk melanjutkan pemesanan' });
    expect(within(prompt).getByRole('link', { name: 'Daftar Akun' })).toHaveAttribute('href', '/daftar?next=%2Fpesan%2Fcorporate-nexa');
    // Rincian harga untuk tamu (HP) + ringkasan kanan (desktop): keduanya menyebut isi harga
    expect(screen.getAllByText(TEMPLATE_PRICE_INCLUDES_DEFAULT[1]).length).toBeGreaterThan(0);
    expect(within(prompt).getByRole('link', { name: /Kebijakan Pengembalian Dana/ })).toHaveAttribute('href', LEGAL_PATHS.refund);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('template tidak ditemukan: judul umum tanpa subjudul', async () => {
    renderPage('tidak-ada');
    expect(await screen.findByText('Template tidak ditemukan')).toBeInTheDocument();
    expect(heading()).toHaveTextContent('Pesan template');
    expect(screen.queryByText(/Masuk atau daftar dulu/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Lengkapi data pesanan/)).not.toBeInTheDocument();
  });

  it('pembeli: daftar "Sudah termasuk", catatan perpanjangan, S&K + refund di persetujuan, bantuan WhatsApp', async () => {
    loginAs('customer');
    renderPage();
    expect(await screen.findByRole('button', { name: /Lanjut ke Pembayaran/ })).toBeInTheDocument();
    expect(screen.getByText(/Lengkapi data pesanan dan domain/)).toBeInTheDocument();

    for (const item of TEMPLATE_PRICE_INCLUDES_DEFAULT) expect(screen.getAllByText(item).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mulai tahun ke-2, perpanjangan domain & hosting ditagih per tahun/).length).toBeGreaterThan(0);
    // Baris "Harga template" yang dobel dengan Total sudah tidak ada
    expect(screen.queryByText('Harga template')).not.toBeInTheDocument();

    const agree = screen.getByRole('checkbox');
    const label = agree.closest('label') as HTMLElement;
    expect(within(label).getByRole('link', { name: /Syarat & Ketentuan/ })).toHaveAttribute('href', LEGAL_PATHS.terms);
    expect(within(label).getByRole('link', { name: /Syarat & Ketentuan/ })).toHaveAttribute('target', '_blank');
    expect(within(label).getByRole('link', { name: /Kebijakan Pengembalian Dana/ })).toHaveAttribute('href', LEGAL_PATHS.refund);

    expect(screen.getByText(/dana kembali penuh ke metode pembayaran semula paling lambat 7 hari kerja/)).toBeInTheDocument();
    expect(screen.getByText(/metode pembayaran yang tersedia di Midtrans/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chat WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281200001111\?text=/);
    expect(screen.getByText(/Apa yang terjadi setelah membayar\?/)).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('pembeli: kosakata form sama dengan /pesan-custom dan field wajib bertanda aria-required', async () => {
    loginAs('customer');
    renderPage();
    await screen.findByRole('button', { name: /Lanjut ke Pembayaran/ });
    expect(screen.getByText(/Semua isian wajib, kecuali yang bertanda opsional/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nomor WhatsApp')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('Nama lengkap')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('Domain utama')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/Nama perusahaan \/ instansi/)).not.toHaveAttribute('aria-required');
    expect(screen.getByLabelText(/Domain alternatif/)).not.toHaveAttribute('aria-required');
    expect(screen.getByLabelText('Nama perusahaan / instansi (opsional)')).toHaveAttribute('placeholder', 'mis. PT Maju Bersama');
    expect(screen.getByText('0/2.000')).toBeInTheDocument();
  });

  it('validasi: domain tanpa akhiran ditandai saat keluar field, sebelum kirim', async () => {
    loginAs('customer');
    renderPage();
    const alt = await screen.findByLabelText(/Domain alternatif/);
    fireEvent.change(alt, { target: { value: 'NamaBisnis' } });
    fireEvent.blur(alt);
    expect(alt).toHaveValue('namabisnis');
    expect(alt).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Tambahkan akhiran domain, mis. .com atau .id')).toBeInTheDocument();

    // Ketikan berikutnya yang masih salah tidak menghapus pesan; isian benar menghapusnya
    fireEvent.change(alt, { target: { value: 'namabisnis-' } });
    expect(alt).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(alt, { target: { value: 'namabisnis.id' } });
    expect(alt).not.toHaveAttribute('aria-invalid');
  });

  it('validasi: kirim kosong menandai field, lalu memeriksa langsung saat mengetik; tidak ada pesanan terkirim', async () => {
    loginAs('customer');
    renderPage();
    const submit = await screen.findByRole('button', { name: /Lanjut ke Pembayaran/ });
    await act(async () => {
      fireEvent.click(submit);
    });
    const primary = screen.getByLabelText('Domain utama');
    expect(screen.getByText('Domain utama wajib diisi.')).toBeInTheDocument();
    expect(screen.getByText('Centang persetujuan ini untuk melanjutkan.')).toBeInTheDocument();
    expect(primary).toHaveFocus();

    fireEvent.change(primary, { target: { value: 'toko' } });
    expect(screen.getByText('Tambahkan akhiran domain, mis. .com atau .id')).toBeInTheDocument();
    fireEvent.change(primary, { target: { value: 'toko.id' } });
    expect(primary).not.toHaveAttribute('aria-invalid');

    // Aturan "harus berbeda" ikut diperiksa saat domain utama berubah
    const alt = screen.getByLabelText(/Domain alternatif/);
    fireEvent.change(alt, { target: { value: 'toko.com' } });
    fireEvent.change(primary, { target: { value: 'toko.com' } });
    expect(screen.getByText('Domain alternatif harus berbeda dari domain utama.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.queryByText('Centang persetujuan ini untuk melanjutkan.')).not.toBeInTheDocument();

    const phone = screen.getByLabelText('Nomor WhatsApp');
    fireEvent.change(phone, { target: { value: '0812' } });
    expect(screen.getByText('Nomor tidak valid. Gunakan 8–15 digit angka, contoh: 081234567890.')).toBeInTheDocument();
    expect(posted).toEqual([]);
  });

  it('domain .co.id: teks bantuan menyebut dokumen perusahaan', async () => {
    loginAs('customer');
    renderPage();
    const primary = await screen.findByLabelText('Domain utama');
    expect(screen.getByText('Contoh: namabisnis.com atau namabisnis.id')).toBeInTheDocument();
    fireEvent.change(primary, { target: { value: 'tokosaya.co.id' } });
    expect(screen.getByText(/Domain \.co\.id butuh dokumen perusahaan/)).toBeInTheDocument();
  });
});
