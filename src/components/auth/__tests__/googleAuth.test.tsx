// @vitest-environment jsdom
// "Masuk/Daftar dengan Google" di /masuk dan /daftar (docs/platform/GOOGLE-LOGIN.md): tombol hanya tampil bila client ID
// diisi, credential dikirim ke customer_google_auth, langkah kedua (nomor WhatsApp) untuk email baru, dan email yang
// harus masuk dengan kata sandi. Skrip Google diganti tiruan window.google.accounts.id.
// Jalankan: npx vitest run --dir src/components/auth
import { act, cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerLogin from '../../../pages/public/CustomerLogin';
import CustomerRegister from '../../../pages/public/CustomerRegister';
import { credentialEmail, isGoogleClientId, resetGoogleIdentity, type GoogleAccountsId } from '../../../lib/googleIdentity';

// Tombol Google muncul sesudah beberapa langkah async (config → skrip → render): beri waktu di mesin yang sibuk
configure({ asyncUtilTimeout: 5000 });

const CLIENT_ID = '1234567890-abcdefghijklmnopqrstuvwxyz012345.apps.googleusercontent.com';
const CREDENTIAL = `h.${btoa(JSON.stringify({ email: 'Budi@Gmail.com', sub: '42' }))}.s`;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const TOKEN_EXP = Math.floor(Date.now() / 1000) + 3600;
const session = (account = 'login') => ({
  token: `h.${btoa(JSON.stringify({ sub: 7, role: 'customer', exp: TOKEN_EXP }))}.s`,
  expires_at: 0,
  account,
  user: { id: 7, name: 'Budi', email: 'budi@gmail.com', role: 'customer' },
});

let clientId: string | null;
let handler: (action: string, body: Record<string, unknown>) => Response;
let calls: { action: string; body: Record<string, unknown> }[];
let gis: { initialize: ReturnType<typeof vi.fn>; renderButton: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> };

beforeEach(() => {
  resetGoogleIdentity();
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
  clientId = CLIENT_ID;
  calls = [];
  handler = () => json(200, {});
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const action = url.searchParams.get('action') ?? '';
      if (action === 'google_auth_config') return json(200, { success: true, client_id: clientId });
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      calls.push({ action, body });
      return handler(action, body);
    }),
  );
  // Tiruan Google Identity Services: renderButton menggambar tombol biasa yang memanggil callback dengan CREDENTIAL
  let callback: ((response: { credential?: string }) => void) | null = null;
  gis = {
    initialize: vi.fn((config: { callback: typeof callback }) => {
      callback = config.callback;
    }),
    renderButton: vi.fn((parent: HTMLElement, options: { text: string }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = options.text === 'signup_with' ? 'Daftar dengan Google' : 'Login dengan Google';
      button.onclick = () => callback?.({ credential: CREDENTIAL });
      parent.append(button);
    }),
    cancel: vi.fn(),
  };
  window.google = { accounts: { id: gis as unknown as GoogleAccountsId } };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete window.google;
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
        <Route path="/masuk" element={<CustomerLogin />} />
        <Route path="/daftar" element={<CustomerRegister />} />
        <Route path="*" element={<p>Halaman tujuan</p>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );

const where = () => screen.getByTestId('where').textContent;
const clickGoogle = async (name: RegExp) => {
  const button = await screen.findByRole('button', { name });
  await act(async () => fireEvent.click(button));
};

describe('tombol Google', () => {
  it('client ID belum diisi: tidak ada tombol, garis "atau", maupun skrip Google', async () => {
    clientId = null;
    renderAt('/daftar');
    await act(async () => {});
    expect(screen.queryByText('atau')).not.toBeInTheDocument();
    expect(gis.renderButton).not.toHaveBeenCalled();
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull();
    expect(screen.getByRole('button', { name: /Daftar Akun/ })).toBeInTheDocument();
  });

  it('/daftar: tombol "Daftar dengan Google" berbahasa Indonesia; akun yang ada langsung masuk ke ?next', async () => {
    handler = () => json(200, session('linked'));
    renderAt('/daftar?next=%2Fpesan%2Fcompany-pro');
    await clickGoogle(/Daftar dengan Google/);
    expect(gis.initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: CLIENT_ID, ux_mode: 'popup' }));
    expect(gis.renderButton).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ text: 'signup_with', locale: 'id' }));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ action: 'customer_google_auth', body: { credential: CREDENTIAL } });
    expect(calls[0].body).not.toHaveProperty('phone');
    expect(localStorage.getItem('authToken')).toBe(session().token);
    expect(where()).toBe('/pesan/company-pro');
  });

  it('/masuk: email baru lanjut ke langkah kedua, nomor WhatsApp wajib, lalu akun dibuat', async () => {
    handler = (_action, body) =>
      body.phone === undefined
        ? json(200, { success: true, signup_required: true, profile: { name: 'Budi Santoso', email: 'budi@gmail.com' } })
        : json(200, session('created'));
    renderAt('/masuk');
    await clickGoogle(/Login dengan Google/);
    expect(await screen.findByRole('heading', { name: 'Satu langkah lagi' })).toBeInTheDocument();
    expect(screen.getByText('budi@gmail.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Nama lengkap')).toHaveValue('Budi Santoso');
    expect(screen.getByRole('link', { name: /Kebijakan Privasi/ })).toHaveAttribute('href', '/kebijakan-privasi');

    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Selesai Daftar/ })));
    expect(screen.getByText('Nomor WhatsApp wajib diisi.')).toBeInTheDocument();
    expect(calls).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Nomor WhatsApp'), { target: { value: '0812-3456-7890' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Selesai Daftar/ })));
    expect(calls[1]).toMatchObject({
      action: 'customer_google_auth',
      body: { credential: CREDENTIAL, name: 'Budi Santoso', phone: '081234567890' },
    });
    expect(where()).toBe('/akun');
  });

  it('langkah kedua: pesan server di bawah field; Batal kembali ke form masuk', async () => {
    handler = (_action, body) =>
      body.phone === undefined
        ? json(200, { success: true, signup_required: true, profile: { name: 'Budi', email: 'budi@gmail.com' } })
        : json(400, { error: 'Nomor tidak valid', code: 'VALIDATION', errors: { phone: 'Nomor WhatsApp tidak valid (server).' } });
    renderAt('/masuk');
    await clickGoogle(/Login dengan Google/);
    fireEvent.change(await screen.findByLabelText('Nomor WhatsApp'), { target: { value: '081234567890' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Selesai Daftar/ })));
    expect(await screen.findByText('Nomor WhatsApp tidak valid (server).')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(screen.getByRole('heading', { name: 'Selamat datang kembali' })).toBeInTheDocument();
    expect(screen.getByLabelText('Kata sandi')).toBeInTheDocument();
  });

  it('/masuk: email terdaftar yang harus pakai kata sandi → pesan + kolom email terisi', async () => {
    handler = () => json(409, { error: 'Email ini sudah terdaftar. Masuk dengan email dan kata sandi.', code: 'GOOGLE_NEEDS_PASSWORD' });
    renderAt('/masuk');
    await clickGoogle(/Login dengan Google/);
    expect(await screen.findByRole('alert')).toHaveTextContent('Masuk dengan email dan kata sandi');
    expect(screen.getByLabelText('Email')).toHaveValue('budi@gmail.com');
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('/daftar: email terdaftar yang harus pakai kata sandi → tautan "Masuk dengan email ini"', async () => {
    handler = () => json(409, { error: 'Email ini sudah terdaftar. Masuk dengan email dan kata sandi.', code: 'GOOGLE_NEEDS_PASSWORD' });
    renderAt('/daftar');
    await clickGoogle(/Daftar dengan Google/);
    const link = await screen.findByRole('link', { name: 'Masuk dengan email ini' });
    expect(link).toHaveAttribute('href', '/masuk');
    fireEvent.click(link);
    await waitFor(() => expect(where()).toBe('/masuk'));
    expect(screen.getByLabelText('Email')).toHaveValue('budi@gmail.com');
  });

  it('akun staf atau token ditolak: pesan server apa adanya, tetap di halaman', async () => {
    handler = () => json(403, { error: 'Email ini milik akun staf.', code: 'GOOGLE_STAFF_ACCOUNT' });
    renderAt('/masuk');
    await clickGoogle(/Login dengan Google/);
    expect(await screen.findByRole('alert')).toHaveTextContent('Email ini milik akun staf.');
    expect(where()).toBe('/masuk');
  });
});

describe('src/lib/googleIdentity', () => {
  it('format client ID', () => {
    expect(isGoogleClientId(CLIENT_ID)).toBe(true);
    expect(isGoogleClientId(`  ${CLIENT_ID} `)).toBe(true);
    expect(isGoogleClientId('GOCSPX-rahasia')).toBe(false);
    expect(isGoogleClientId('123-ABC.apps.googleusercontent.com')).toBe(false);
    expect(isGoogleClientId('')).toBe(false);
  });

  it('email dari credential hanya untuk mengisi kolom', () => {
    expect(credentialEmail(CREDENTIAL)).toBe('budi@gmail.com');
    expect(credentialEmail('rusak')).toBeNull();
    expect(credentialEmail(`h.${btoa('{"sub":"1"}')}.s`)).toBeNull();
  });
});
