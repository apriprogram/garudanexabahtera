// @vitest-environment jsdom
// Profil pembeli: profileStore (sesi login ↔ customer_get_profile), menu akun (Profil + foto), halaman /akun/profil
// (muat, simpan, foto, galat per field), dan pengolahan foto di klien.
// Jalankan: npx vitest run src/pages/account/__tests__/profile.test.tsx
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser } from '../../../lib/auth';
import type { CustomerProfile } from '../../../types/platform';
import AccountLayout from '../AccountLayout';
import AccountProfile from '../AccountProfile';
import {
  avatarFileError,
  centerSquare,
  getProfile,
  loadProfile,
  resetProfileStore,
  safeAvatarUrl,
  setProfile,
} from '../components/profileStore';

// Canvas & decoding gambar tidak ada di jsdom: halaman memakai tiruan; prepareAvatar asli dites terpisah di bawah
const { prepareAvatarMock } = vi.hoisted(() => ({ prepareAvatarMock: vi.fn() }));
vi.mock('../components/profileStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../components/profileStore')>()),
  prepareAvatar: prepareAvatarMock,
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Token berformat JWT yang cukup untuk dibaca src/lib/auth.ts (klaim role & exp). */
const tokenFor = (role: string) => `h.${btoa(JSON.stringify({ sub: 7, role, exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`;

const PHOTO = '/assets/avatars/avatar_0123456789ab.webp';
const NEW_PHOTO = 'data:image/webp;base64,UklGRhYAAABXRUJQ';

const makeProfile = (overrides: Partial<CustomerProfile> = {}): CustomerProfile => ({
  id: 7,
  name: 'Budi Santoso',
  email: 'budi@example.com',
  phone: '081234567890',
  company_name: null,
  address: null,
  city: null,
  avatar: null,
  ...overrides,
});

let api: Record<string, (body: Record<string, unknown>) => Response>;
let calls: { action: string; body: Record<string, unknown> }[];

const seedSession = (user: Record<string, unknown>) => {
  localStorage.setItem('authToken', tokenFor('customer'));
  localStorage.setItem('currentUser', JSON.stringify({ id: 7, email: 'budi@example.com', role: 'customer', ...user }));
};

beforeEach(() => {
  resetProfileStore();
  calls = [];
  api = {
    get_settings: () => json(200, {}),
    customer_get_profile: () => json(200, { profile: makeProfile() }),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const action = url.searchParams.get('action') ?? '';
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      calls.push({ action, body });
      return api[action] ? api[action](body) : json(404, { error: 'tidak ada' });
    }),
  );
  Element.prototype.scrollIntoView = vi.fn();
  seedSession({ name: 'Budi Santoso', phone: '081234567890', created_at: '2026-10-01 10:00:00' });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  prepareAvatarMock.mockReset();
  localStorage.clear();
});

const countCalls = (action: string) => calls.filter((c) => c.action === action).length;
const lastCall = (action: string) => calls.filter((c) => c.action === action).at(-1)?.body;

/** Halaman di dalam kerangka akun, seperti rute /akun/profil di App.tsx. */
const renderAccount = (path = '/akun/profil') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/akun" element={<AccountLayout />}>
          <Route path="profil" element={<AccountProfile />} />
          <Route path="x" element={<p>Isi halaman</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const menuButton = () => screen.getByRole('button', { name: /^Menu akun / });
const pageAvatar = () => screen.getByRole('main').querySelector('img');

/* ─────────────────────────── profileStore ─────────────────────────── */

describe('profileStore', () => {
  it('awal dari sesi login; foto hanya /assets/ atau https://', () => {
    seedSession({ name: 'Budi Santoso', avatar: 'data:image/png;base64,AAAA', company_name: '  ' });
    expect(getProfile()).toMatchObject({ id: 7, name: 'Budi Santoso', avatar: null, company_name: null });

    expect(safeAvatarUrl(PHOTO)).toBe(PHOTO);
    expect(safeAvatarUrl('https://cdn.example.com/a.webp')).toBe('https://cdn.example.com/a.webp');
    for (const bad of ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'http://x.com/a.png', '//evil.com/a.png', '', null, 5]) {
      expect(safeAvatarUrl(bad)).toBeNull();
    }
  });

  it('setProfile menggabungkan ke currentUser: kunci lain & role tetap, getCurrentUser ikut berubah', () => {
    const saved = setProfile(
      makeProfile({ name: 'Budi Baru', phone: '089900001111', company_name: 'PT Maju', address: 'Jl. A 1', city: 'Bandung', avatar: PHOTO }),
    );
    expect(saved.avatar).toBe(PHOTO);
    const stored = JSON.parse(localStorage.getItem('currentUser')!);
    expect(stored).toEqual({
      id: 7,
      email: 'budi@example.com',
      role: 'customer',
      created_at: '2026-10-01 10:00:00',
      name: 'Budi Baru',
      phone: '089900001111',
      company_name: 'PT Maju',
      address: 'Jl. A 1',
      city: 'Bandung',
      avatar: PHOTO,
    });
    expect(getCurrentUser()).toMatchObject({ name: 'Budi Baru', phone: '089900001111', role: 'customer' });
    expect(getProfile()).toMatchObject({ name: 'Budi Baru', avatar: PHOTO });

    // Foto tidak aman dari server tidak pernah disimpan ke sesi
    setProfile(makeProfile({ avatar: 'javascript:alert(1)' }));
    expect(JSON.parse(localStorage.getItem('currentUser')!).avatar).toBeNull();
  });

  it('loadProfile: satu request untuk panggilan bersamaan; tidak menimpa simpanan yang lebih baru', async () => {
    let release!: () => void;
    api.customer_get_profile = () => json(200, { profile: makeProfile({ name: 'Dari Server' }) });
    const gate = new Promise<void>((resolve) => (release = resolve));
    const fetchMock = vi.mocked(fetch);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (...args) => {
      await gate;
      return original(...args);
    });

    const a = loadProfile();
    const b = loadProfile();
    expect(a).toBe(b);
    setProfile(makeProfile({ name: 'Disimpan Barusan' }));
    release();
    await expect(a).resolves.toMatchObject({ name: 'Dari Server' });
    expect(countCalls('customer_get_profile')).toBe(1);
    expect(getProfile()?.name).toBe('Disimpan Barusan');
  });
});

/* ─────────────────────────── Menu akun ─────────────────────────── */

describe('menu akun', { timeout: 20_000 }, () => {
  it('menu profil di topbar: Profil lalu Keluar (menu utama ada di sidebar); fokus ke Profil', async () => {
    renderAccount('/akun/x');
    fireEvent.click(menuButton());
    const panel = document.getElementById(menuButton().getAttribute('aria-controls')!)!;
    const items = within(panel).getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['Profil', 'Keluar']);
    expect(within(panel).getByRole('link', { name: 'Profil' })).toHaveAttribute('href', '/akun/profil');
    expect(document.activeElement).toBe(within(panel).getByRole('link', { name: 'Profil' }));
    // Sidebar juga memuat Profil (grup Akun)
    expect(within(screen.getByRole('navigation', { name: 'Menu akun' })).getByRole('link', { name: 'Profil' })).toHaveAttribute(
      'href',
      '/akun/profil',
    );
    await waitFor(() => expect(countCalls('customer_get_profile')).toBe(1));
  });

  it('foto profil di tombol menu & panel (img alt kosong)', () => {
    seedSession({ name: 'Budi Santoso', avatar: PHOTO });
    api.customer_get_profile = () => json(200, { profile: makeProfile({ avatar: PHOTO }) });
    renderAccount('/akun/x');
    const button = menuButton();
    expect(button.querySelector('img')).toHaveAttribute('src', PHOTO);
    expect(button.querySelector('img')).toHaveAttribute('alt', '');
    expect(button).not.toHaveTextContent('BS');
    fireEvent.click(button);
    const panel = document.getElementById(button.getAttribute('aria-controls')!)!;
    expect(panel.querySelector('img')).toHaveAttribute('src', PHOTO);
    expect(panel).toHaveTextContent('budi@example.com');
  });

  it('foto data:/javascript: tidak pernah dipakai: tampil inisial', async () => {
    seedSession({ name: 'Budi Santoso', avatar: 'data:image/png;base64,AAAA' });
    api.customer_get_profile = () => json(200, { profile: makeProfile({ avatar: 'javascript:alert(1)' }) });
    renderAccount('/akun/x');
    expect(menuButton().querySelector('img')).toBeNull();
    await waitFor(() => expect(JSON.parse(localStorage.getItem('currentUser')!).avatar).toBeNull());
    expect(menuButton().querySelector('img')).toBeNull();
    expect(menuButton()).toHaveTextContent('BS');
  });

  it('disegarkan dari customer_get_profile (nama & foto, juga ke sesi login)', async () => {
    api.customer_get_profile = () => json(200, { profile: makeProfile({ name: 'Budi Terbaru', avatar: PHOTO }) });
    renderAccount('/akun/x');
    await screen.findByRole('button', { name: 'Menu akun Budi Terbaru' });
    expect(menuButton().querySelector('img')).toHaveAttribute('src', PHOTO);
    expect(JSON.parse(localStorage.getItem('currentUser')!)).toMatchObject({ name: 'Budi Terbaru', avatar: PHOTO, role: 'customer' });
  });

  it('refresh gagal = tetap data sesi, tanpa pesan galat', async () => {
    api.customer_get_profile = () => json(500, { error: 'Server error' });
    renderAccount('/akun/x');
    await waitFor(() => expect(countCalls('customer_get_profile')).toBe(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(menuButton()).toHaveAccessibleName('Menu akun Budi Santoso');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

/* ─────────────────────────── Halaman /akun/profil ─────────────────────────── */

// Beberapa langkah render + simpan per tes; batas 5 detik bawaan terlalu ketat saat semua berkas tes jalan paralel
describe('halaman profil', { timeout: 20_000 }, () => {
  it('memuat profil (satu request bersama header), email hanya-baca', async () => {
    api.customer_get_profile = () =>
      json(200, { profile: makeProfile({ company_name: 'PT Maju', address: 'Jl. Merdeka 10', city: 'Bandung' }) });
    renderAccount();
    expect(await screen.findByLabelText('Nama lengkap')).toHaveValue('Budi Santoso');
    expect(screen.getByLabelText('Nomor HP')).toHaveValue('081234567890');
    expect(screen.getByLabelText(/Nama perusahaan/)).toHaveValue('PT Maju');
    expect(screen.getByLabelText(/Alamat/)).toHaveValue('Jl. Merdeka 10');
    expect(screen.getByLabelText(/Kota/)).toHaveValue('Bandung');
    const email = screen.getByLabelText('Email');
    expect(email).toHaveValue('budi@example.com');
    expect(email).toHaveAttribute('readonly');
    expect(email).toHaveAccessibleDescription(/dipakai untuk masuk/);
    expect(screen.getByRole('heading', { name: 'Profil saya', level: 1 })).toBeInTheDocument();
    expect(document.title).toBe('Profil saya | Garuda Nexa');
    expect(countCalls('customer_get_profile')).toBe(1);
  });

  it('simpan tanpa mengubah foto: avatar tidak dikirim; header & sesi langsung berganti', async () => {
    api.customer_update_profile = (body) =>
      json(200, {
        profile: makeProfile({
          name: String(body.name),
          phone: String(body.phone),
          company_name: body.company_name as string | null,
          city: body.city as string | null,
        }),
      });
    renderAccount();
    const name = await screen.findByLabelText('Nama lengkap');
    fireEvent.change(name, { target: { value: '  Budi Baru  ' } });
    fireEvent.change(screen.getByLabelText('Nomor HP'), { target: { value: '0899-0000-1111' } });
    fireEvent.change(screen.getByLabelText(/Nama perusahaan/), { target: { value: 'PT Maju' } });
    fireEvent.change(screen.getByLabelText(/Kota/), { target: { value: 'Bandung' } });
    expect(screen.getByText('Ada perubahan yang belum disimpan.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }));

    expect(await screen.findByText('Profil tersimpan.')).toBeInTheDocument();
    const body = lastCall('customer_update_profile')!;
    expect(body).toEqual({
      action: 'customer_update_profile',
      name: 'Budi Baru',
      phone: '089900001111',
      company_name: 'PT Maju',
      address: null,
      city: 'Bandung',
    });
    expect(body).not.toHaveProperty('avatar');
    expect(menuButton()).toHaveAccessibleName('Menu akun Budi Baru');
    expect(getCurrentUser()).toMatchObject({ name: 'Budi Baru', phone: '089900001111', company_name: 'PT Maju', role: 'customer' });
    expect(screen.queryByText('Ada perubahan yang belum disimpan.')).not.toBeInTheDocument();
  });

  it('Hapus foto mengirim avatar kosong; header kembali ke inisial', async () => {
    seedSession({ name: 'Budi Santoso', avatar: PHOTO });
    api.customer_get_profile = () => json(200, { profile: makeProfile({ avatar: PHOTO }) });
    api.customer_update_profile = () => json(200, { profile: makeProfile({ avatar: null }) });
    renderAccount();
    await screen.findByLabelText('Nama lengkap');
    expect(pageAvatar()).toHaveAttribute('src', PHOTO);

    fireEvent.click(screen.getByRole('button', { name: /Hapus foto/ }));
    expect(pageAvatar()).toBeNull();
    expect(screen.getByText('Foto akan dihapus saat Anda menyimpan perubahan.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }));

    await screen.findByText('Profil tersimpan.');
    expect(lastCall('customer_update_profile')).toMatchObject({ avatar: '' });
    expect(menuButton().querySelector('img')).toBeNull();
    expect(JSON.parse(localStorage.getItem('currentUser')!).avatar).toBeNull();
  });

  it('foto baru: pratinjau sebelum simpan, dikirim sebagai data URI; Batalkan mengembalikan foto lama', async () => {
    seedSession({ name: 'Budi Santoso', avatar: PHOTO });
    api.customer_get_profile = () => json(200, { profile: makeProfile({ avatar: PHOTO }) });
    const stored = '/assets/avatars/avatar_ffffffffffff.webp';
    api.customer_update_profile = () => json(200, { profile: makeProfile({ avatar: stored }) });
    prepareAvatarMock.mockResolvedValue(NEW_PHOTO);
    renderAccount();
    await screen.findByLabelText('Nama lengkap');
    const input = document.getElementById('avatar-file') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    const file = new File(['x'], 'foto.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(pageAvatar()).toHaveAttribute('src', NEW_PHOTO));
    expect(prepareAvatarMock).toHaveBeenCalledWith(file);
    expect(screen.getByText(/Pratinjau foto baru/)).toBeInTheDocument();
    // Header belum berubah sebelum disimpan
    expect(menuButton().querySelector('img')).toHaveAttribute('src', PHOTO);

    fireEvent.click(screen.getByRole('button', { name: /Batalkan/ }));
    expect(pageAvatar()).toHaveAttribute('src', PHOTO);

    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(pageAvatar()).toHaveAttribute('src', NEW_PHOTO));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    await screen.findByText('Profil tersimpan.');
    expect(lastCall('customer_update_profile')).toMatchObject({ avatar: NEW_PHOTO });
    expect(menuButton().querySelector('img')).toHaveAttribute('src', stored);
    expect(pageAvatar()).toHaveAttribute('src', stored);
  });

  it('file selain JPG/PNG/WEBP atau > 5 MB ditolak sebelum dibaca', async () => {
    renderAccount();
    await screen.findByLabelText('Nama lengkap');
    const input = document.getElementById('avatar-file') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [new File(['x'], 'anim.gif', { type: 'image/gif' })] } });
    expect(await screen.findByText('Foto profil harus JPG, PNG, atau WEBP.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unggah foto/ })).toHaveAccessibleDescription('Foto profil harus JPG, PNG, atau WEBP.');

    const big = new File(['x'], 'besar.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [big] } });
    expect(await screen.findByText('Ukuran foto maksimal 5 MB.')).toBeInTheDocument();
    expect(prepareAvatarMock).not.toHaveBeenCalled();
  });

  it('validasi klien sebelum kirim; galat server per field tampil di bawah field', async () => {
    renderAccount();
    const name = await screen.findByLabelText('Nama lengkap');
    fireEvent.change(name, { target: { value: ' ' } });
    fireEvent.change(screen.getByLabelText('Nomor HP'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    expect(await screen.findByText('Nama wajib diisi.')).toBeInTheDocument();
    expect(screen.getByText(/Nomor HP tidak valid/)).toBeInTheDocument();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(name);
    expect(countCalls('customer_update_profile')).toBe(0);

    api.customer_update_profile = () =>
      json(400, {
        error: 'Data belum valid.',
        code: 'VALIDATION',
        errors: { phone: 'Nomor HP sudah dipakai akun lain.', city: 'Kota maksimal 100 karakter.' },
      });
    fireEvent.change(name, { target: { value: 'Budi Santoso' } });
    fireEvent.change(screen.getByLabelText('Nomor HP'), { target: { value: '081234567890' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    const phone = screen.getByLabelText('Nomor HP');
    await waitFor(() => expect(phone).toHaveAccessibleDescription('Nomor HP sudah dipakai akun lain.'));
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Kota/)).toHaveAccessibleDescription('Kota maksimal 100 karakter.');
    expect(document.activeElement).toBe(phone);
    expect(screen.queryByText('Profil tersimpan.')).not.toBeInTheDocument();

    // Galat tanpa field → pemberitahuan umum
    api.customer_update_profile = () => json(500, { error: 'Server sedang sibuk.' });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    const alert = await screen.findByText('Server sedang sibuk.');
    expect(alert.closest('[role="alert"]')).toHaveTextContent('Profil belum tersimpan');
  });

  it('gagal memuat → Coba lagi', async () => {
    let fail = true;
    api.customer_get_profile = () => (fail ? json(500, { error: 'Server sedang sibuk.' }) : json(200, { profile: makeProfile() }));
    renderAccount();
    expect(await screen.findByRole('heading', { name: 'Profil belum bisa dimuat' })).toBeInTheDocument();
    expect(screen.getByText('Server sedang sibuk.')).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: /Coba lagi/ }));
    expect(await screen.findByLabelText('Nama lengkap')).toHaveValue('Budi Santoso');
  });
});

/* ─────────────────────────── Pengolahan foto ─────────────────────────── */

describe('foto profil di klien', () => {
  it('cek jenis & ukuran, potongan persegi di tengah', () => {
    expect(avatarFileError({ type: 'image/png', size: 1000 })).toBeUndefined();
    expect(avatarFileError({ type: 'image/webp', size: 5 * 1024 * 1024 })).toBeUndefined();
    expect(avatarFileError({ type: 'image/gif', size: 10 })).toBe('Foto profil harus JPG, PNG, atau WEBP.');
    expect(avatarFileError({ type: 'image/svg+xml', size: 10 })).toBe('Foto profil harus JPG, PNG, atau WEBP.');
    expect(avatarFileError({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 })).toBe('Ukuran foto maksimal 5 MB.');

    expect(centerSquare(1200, 800)).toEqual({ sx: 200, sy: 0, side: 800, size: 512 });
    expect(centerSquare(300, 900)).toEqual({ sx: 0, sy: 300, side: 300, size: 300 });
    expect(centerSquare(512, 512)).toEqual({ sx: 0, sy: 0, side: 512, size: 512 });
  });

  it('prepareAvatar: WebP 0,85 maks. 512 px; tanpa encoder WebP → JPEG berlatar putih', async () => {
    const { prepareAvatar } = await vi.importActual<typeof import('../components/profileStore')>('../components/profileStore');
    class FakeImage {
      naturalWidth = 1200;
      naturalHeight = 800;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', FakeImage);
    const createObjectURL = vi.fn(() => 'blob:foto');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }));
    const ctx = { drawImage: vi.fn(), fillRect: vi.fn(), imageSmoothingEnabled: false, imageSmoothingQuality: 'low', globalCompositeOperation: 'source-over', fillStyle: '' };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    let webp = true;
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockImplementation((type?: string) =>
        type === 'image/webp' ? (webp ? 'data:image/webp;base64,AAAA' : 'data:image/png;base64,PPPP') : 'data:image/jpeg;base64,JJJJ',
      );
    const file = new File(['x'], 'foto.png', { type: 'image/png' });

    await expect(prepareAvatar(file)).resolves.toBe('data:image/webp;base64,AAAA');
    expect(ctx.drawImage).toHaveBeenCalledWith(expect.any(FakeImage), 200, 0, 800, 800, 0, 0, 512, 512);
    expect(toDataURL).toHaveBeenCalledWith('image/webp', 0.85);
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:foto');

    webp = false;
    await expect(prepareAvatar(file)).resolves.toBe('data:image/jpeg;base64,JJJJ');
    expect(toDataURL).toHaveBeenLastCalledWith('image/jpeg', 0.85);
    expect(ctx.globalCompositeOperation).toBe('destination-over');
    expect(ctx.fillStyle).toBe('#ffffff');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 512, 512);

    // Jenis salah ditolak tanpa membaca file
    createObjectURL.mockClear();
    await expect(prepareAvatar(new File(['x'], 'a.gif', { type: 'image/gif' }))).rejects.toThrow('Foto profil harus JPG, PNG, atau WEBP.');
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
