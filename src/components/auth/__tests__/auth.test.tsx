// @vitest-environment jsdom
// Halaman masuk/daftar (/login, /masuk, /daftar) dengan kerangka auth bersama.
// Jalankan: npx vitest run --dir src/components/auth
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Auth from '../../../pages/Auth';
import CustomerLogin from '../../../pages/public/CustomerLogin';
import CustomerRegister from '../../../pages/public/CustomerRegister';
import { pathAfterLogin } from '../authForm';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Token berformat JWT yang cukup untuk dibaca src/lib/auth.ts (klaim role & exp). */
// exp dihitung sekali: token yang dibuat di dua detik berbeda (suite penuh yang lambat) harus tetap sama
const TOKEN_EXP = Math.floor(Date.now() / 1000) + 3600;
const tokenFor = (role: string) => `h.${btoa(JSON.stringify({ sub: 7, role, exp: TOKEN_EXP }))}.s`;

const session = (role: string) => ({
  token: tokenFor(role),
  expires_at: 0,
  user: { id: 7, name: 'Budi', email: 'budi@example.com', role },
});

let handler: (action: string, body: Record<string, unknown>) => Response;
let calls: { action: string; body: Record<string, unknown> }[];

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  calls = [];
  handler = () => json(200, {});
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const action = url.searchParams.get('action') ?? '';
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      calls.push({ action, body });
      return handler(action, body);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function Where() {
  const location = useLocation();
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
}

const renderAt = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/masuk" element={<CustomerLogin />} />
        <Route path="/daftar" element={<CustomerRegister />} />
        <Route path="*" element={<p>Halaman tujuan</p>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );

const where = () => screen.getByTestId('where').textContent;
/** Tombol kirim form (di /login tab "Masuk" juga berupa tombol bernama sama) */
const submitButton = (name: RegExp) =>
  screen.getAllByRole('button', { name }).find((button) => button.getAttribute('type') === 'submit')!;
const submit = (name: RegExp) => act(async () => fireEvent.click(submitButton(name)));

describe('pathAfterLogin', () => {
  it('pembeli: hanya path relatif situs ini, bukan area staf atau halaman auth', () => {
    expect(pathAfterLogin('customer', '/pesan/company-pro?x=1')).toBe('/pesan/company-pro?x=1');
    expect(pathAfterLogin('customer', null)).toBe('/akun');
    expect(pathAfterLogin('customer', '//evil.example')).toBe('/akun');
    expect(pathAfterLogin('customer', 'https://evil.example/akun')).toBe('/akun');
    expect(pathAfterLogin('customer', '/admin/pesanan')).toBe('/akun');
    expect(pathAfterLogin('customer', '/masuk?next=/akun')).toBe('/akun');
  });

  it('staf: ?next hanya di /admin', () => {
    expect(pathAfterLogin('admin', '/admin/pesanan-template')).toBe('/admin/pesanan-template');
    expect(pathAfterLogin('user', '/pesan/company-pro')).toBe('/admin');
    expect(pathAfterLogin('admin', null)).toBe('/admin');
    expect(pathAfterLogin('admin', '/administrator')).toBe('/admin');
  });
});

describe('/masuk (pembeli)', () => {
  it('validasi per field di bawah field, tanpa memanggil server', async () => {
    renderAt('/masuk');
    await submit(/^Masuk$/);
    expect(screen.getByText('Email wajib diisi.')).toBeInTheDocument();
    expect(screen.getByText('Kata sandi wajib diisi.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-describedby', 'email-error');
    expect(calls).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'budi@' } });
    fireEvent.blur(screen.getByLabelText('Email'));
    expect(screen.getByText(/Format email tidak valid/)).toBeInTheDocument();
  });

  it('salah kata sandi: pemberitahuan gagal yang jelas', async () => {
    handler = () => json(401, { error: 'Invalid credentials' });
    renderAt('/masuk');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'budi@example.com' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'salah123' } });
    await submit(/^Masuk$/);
    expect(await screen.findByRole('alert')).toHaveTextContent('Email atau kata sandi salah');
    expect(submitButton(/^Masuk$/)).toBeEnabled();
  });

  it('pembeli masuk lalu ke ?next; tautan daftar membawa next', async () => {
    handler = () => json(200, session('customer'));
    renderAt('/masuk?next=%2Fpesan%2Fcompany-pro');
    expect(screen.getByRole('link', { name: 'Daftar sekarang' })).toHaveAttribute(
      'href',
      '/daftar?next=%2Fpesan%2Fcompany-pro',
    );
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' budi@example.com ' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    await submit(/^Masuk$/);
    expect(calls[0]).toMatchObject({ action: 'login', body: { email: 'budi@example.com', password: 'rahasia123' } });
    expect(where()).toBe('/pesan/company-pro');
    expect(localStorage.getItem('authToken')).toBe(tokenFor('customer'));
  });

  it('next berbahaya diabaikan, staf yang masuk di /masuk ke /admin', async () => {
    handler = () => json(200, session('admin'));
    renderAt('/masuk?next=%2F%2Fevil.example');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    await submit(/^Masuk$/);
    expect(where()).toBe('/admin');
  });

  it('sesi habis, lupa kata sandi (bantuan WhatsApp berisi email), tampilkan kata sandi', async () => {
    handler = (action) => (action === 'get_settings' ? json(200, { footer_whatsapp: '0812-1111-2222' }) : json(200, {}));
    renderAt('/masuk?expired=1');
    expect(screen.getByRole('alert')).toHaveTextContent('Sesi Anda telah berakhir');
    // Pengaturan (nomor WhatsApp) baru dimuat saat bantuan dibuka
    expect(calls).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' budi@example.com ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lupa kata sandi?' }));
    expect(screen.getByRole('button', { name: 'Lupa kata sandi?' })).toHaveAttribute('aria-expanded', 'true');
    const help = screen.getByRole('link', { name: /Hubungi via WhatsApp/ });
    await waitFor(() => expect(help.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281211112222\?text=/));
    expect(decodeURIComponent(help.getAttribute('href')!)).toContain('email: budi@example.com');
    expect(help).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('link', { name: 'Buka halaman kontak' })).not.toBeInTheDocument();

    const password = screen.getByLabelText('Kata sandi');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan kata sandi' }));
    expect(password).toHaveAttribute('type', 'text');
  });

  it('sudah masuk sebagai pembeli: langsung ke /akun', () => {
    localStorage.setItem('authToken', tokenFor('customer'));
    renderAt('/masuk');
    expect(where()).toBe('/akun');
  });

  it('tab Daftar pindah ke /daftar dengan next', () => {
    renderAt('/masuk?next=%2Fpesan%2Fx');
    const tab = screen.getByRole('link', { name: 'Daftar' });
    expect(tab).toHaveAttribute('href', '/daftar?next=%2Fpesan%2Fx');
    expect(screen.getByRole('link', { name: 'Masuk' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(tab);
    expect(where()).toBe('/daftar?next=%2Fpesan%2Fx');
    expect(screen.getByRole('heading', { name: 'Buat akun pembeli' })).toBeInTheDocument();
  });
});

describe('/daftar (pembeli)', () => {
  const fill = (overrides: Record<string, string> = {}) => {
    const values = {
      'Nama lengkap': 'Budi Santoso',
      Email: 'budi@example.com',
      'Nomor WhatsApp': '0812-3456-7890',
      'Kata sandi': 'rahasia123',
      ...overrides,
    };
    for (const [label, value] of Object.entries(values)) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
  };

  it('empat field (tanpa ulangi kata sandi), validasi per field, persetujuan S&K + privasi', async () => {
    renderAt('/daftar');
    expect(screen.queryByLabelText('Ulangi kata sandi')).not.toBeInTheDocument();
    await submit(/Daftar Akun/);
    expect(screen.getByText('Nama lengkap wajib diisi.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);

    fill({ 'Kata sandi': 'pendek' });
    await submit(/Daftar Akun/);
    expect(screen.getByLabelText('Kata sandi')).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toHaveLength(0);

    expect(screen.getByText(/Dengan mendaftar, Anda menyetujui/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Syarat & Ketentuan/ })).toHaveAttribute('href', '/syarat-ketentuan');
    expect(screen.getByRole('link', { name: /Kebijakan Privasi/ })).toHaveAttribute('href', '/kebijakan-privasi');
  });

  it('email sudah terdaftar: error di bawah field + tautan masuk', async () => {
    handler = () =>
      json(422, { error: 'Data tidak valid', code: 'EMAIL_TAKEN', errors: { email: 'Email sudah terdaftar.' } });
    renderAt('/daftar');
    fill();
    await submit(/Daftar Akun/);
    expect(await screen.findByText('Email sudah terdaftar.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Masuk dengan email ini' })).toHaveAttribute('href', '/masuk');
  });

  it('berhasil: payload rapi, langsung masuk, lalu ke ?next', async () => {
    handler = () => json(200, session('customer'));
    renderAt('/daftar?next=%2Fpesan%2Fcompany-pro');
    fill();
    await submit(/Daftar Akun/);
    expect(calls[0]).toMatchObject({
      action: 'customer_register',
      body: { name: 'Budi Santoso', email: 'budi@example.com', phone: '081234567890', password: 'rahasia123' },
    });
    expect(localStorage.getItem('authToken')).toBe(tokenFor('customer'));
    expect(where()).toBe('/pesan/company-pro');
  });

  it('autocomplete benar', () => {
    renderAt('/daftar');
    expect(screen.getByLabelText('Nama lengkap')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Nomor WhatsApp')).toHaveAttribute('autocomplete', 'tel');
    expect(screen.getByLabelText('Kata sandi')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('input auth bergaya .input-site (latar putih, garis line-strong)', () => {
    renderAt('/daftar');
    const input = screen.getByLabelText('Email');
    expect(input).toHaveClass('bg-surface', 'border-line-strong', 'hover:border-subtle');
    expect(input).not.toHaveClass('bg-alt');
  });
});

describe('/login (staf)', () => {
  const login = async (role: string, entry = '/login') => {
    handler = () => json(200, session(role));
    renderAt(entry);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'tim@example.com' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    await submit(/^Masuk$/);
  };

  it('staf ke /admin, ?next di /admin dihormati', async () => {
    await login('admin', '/login?next=%2Fadmin%2Fpesanan-template');
    expect(where()).toBe('/admin/pesanan-template');
  });

  it('pembeli yang masuk di /login diarahkan ke /akun', async () => {
    await login('customer');
    expect(where()).toBe('/akun');
  });

  it('sesi habis menampilkan peringatan', () => {
    renderAt('/login?expired=1');
    expect(screen.getByRole('alert')).toHaveTextContent('Sesi Anda telah berakhir');
  });

  it('tab Daftar staf: field tambahan, kirim `register`, lalu kembali ke Masuk dengan pesan sukses', async () => {
    handler = () => json(200, { success: true, message: 'Registrasi berhasil, tunggu persetujuan admin.' });
    renderAt('/login');
    fireEvent.click(screen.getByRole('button', { name: 'Daftar staf' }));
    expect(where()).toBe('/login?type=register');
    expect(screen.getByRole('heading', { name: 'Daftar akun staf' })).toBeInTheDocument();

    await submit(/Daftar sebagai staf/);
    expect(screen.getByText('Nama lengkap wajib diisi.')).toBeInTheDocument();
    expect(screen.getByText('Nomor WhatsApp wajib diisi.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Sari' } });
    fireEvent.change(screen.getByLabelText('Nomor WhatsApp'), { target: { value: '081234567890' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sari@example.com' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'rahasia123' } });
    await submit(/Daftar sebagai staf/);
    expect(calls[0]).toMatchObject({ action: 'register', body: { name: 'Sari', phone: '081234567890' } });
    expect(where()).toBe('/login');
    expect(screen.getByRole('status')).toHaveTextContent('Registrasi berhasil, tunggu persetujuan admin.');
    expect(screen.getByRole('heading', { name: 'Masuk panel admin' })).toBeInTheDocument();
  });
});
