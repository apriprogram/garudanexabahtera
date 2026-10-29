// @vitest-environment jsdom
// Tab Tanya Nexa → panel "Bot WhatsApp (WAHA)" (pemilik 2026-10-29): pengaturan dimuat lewat waha_get_config (API key
// hanya topeng, nilai .env sebagai petunjuk), disimpan lewat waha_save_config (kunci hanya bila diisi), galat per kolom
// dari server, pesan uji ke nomor admin, dan log alih ke admin dengan tombol Selesai (waha_close_handoff). Validasi &
// alur webhook diuji di backend (__tests__/backend/waha.test.ts).
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WhatsAppBotPanel } from '../nexa/WhatsAppBotPanel';
import { formatHandoffTime, handoffStatus, parseWahaState, type WahaHandoff } from '../nexa/whatsappBotModel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const CONFIG = {
  enabled: true,
  url: '',
  url_env: 'https://waha.contoh.test',
  session: '',
  session_env: '',
  admin_number: '6281111111111',
  admin_number_env: '',
  pause_hours: 12,
  key_masked: '••••abcd',
  key_env: false,
  hmac_env: true,
  effective: { url: 'https://waha.contoh.test', session: 'default', admin_number: '6281111111111', key: true },
};

const HANDOFF = {
  id: 7,
  chat_id: '6282222222222@c.us',
  phone: '6282222222222',
  name: 'Budi',
  reason: 'permintaan',
  reason_label: 'Klien minta bicara dengan admin',
  message: 'ADMIN',
  status: 'menunggu',
  notified: true,
  paused: true,
  created_at: '2026-10-29 14:05:09',
  handled_at: null,
  closed_at: null,
};

/** fetch tiruan: aksi waha_* dijawab `respond`; body POST dicatat. */
function mockWaha(respond: (body: Record<string, unknown>) => Response) {
  const posts: Record<string, unknown>[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      posts.push(body);
      return respond(body);
    }),
  );
  return posts;
}

const state = (patch: Record<string, unknown> = {}) => ({ success: true, config: CONFIG, handoffs: [HANDOFF], tables_ready: true, ...patch });

describe('WhatsAppBotPanel', () => {
  it('memuat pengaturan (API key bertopeng, petunjuk .env) dan log alih ke admin', async () => {
    const posts = mockWaha(() => json(state()));
    render(<WhatsAppBotPanel notify={vi.fn()} />);
    expect(await screen.findByText('API key tersimpan: ••••abcd')).toBeInTheDocument();
    expect(posts[0].action).toBe('waha_get_config');
    expect(screen.getByLabelText('Alamat WAHA')).toHaveAttribute('placeholder', 'https://waha.contoh.test');
    expect(screen.getByText(/Kosong = pakai WAHA_URL dari \.env \(https:\/\/waha\.contoh\.test\)/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nomor WhatsApp admin')).toHaveValue('6281111111111');
    expect((screen.getByLabelText('Alamat webhook untuk WAHA') as HTMLInputElement).value).toMatch(/\/api\.php\?action=waha_webhook$/);
    // Kunci HMAC ada di .env: tanpa peringatan
    expect(screen.queryByText(/WAHA_HMAC_KEY belum ada/)).toBeNull();

    const item = screen.getByText('Budi').closest('li') as HTMLElement;
    expect(item).toHaveTextContent('+6282222222222');
    expect(item).toHaveTextContent('Menunggu admin');
    expect(item).toHaveTextContent('29 Okt 2026, 14.05 · Klien minta bicara dengan admin · notifikasi terkirim');
    expect(within(item).getByRole('link', { name: 'Chat klien' })).toHaveAttribute('href', 'https://wa.me/6282222222222');
  });

  it('simpan: isian + API key baru (tanpa key bila kosong); galat per kolom dari server', async () => {
    const notify = vi.fn();
    let fail = true;
    const posts = mockWaha((body) => {
      if (body.action === 'waha_save_config' && fail) {
        fail = false;
        return json({ error: 'Nomor WhatsApp admin tidak valid: 8–15 angka, mis. 6281234567890.', code: 'VALIDATION', errors: { waha_admin_number: 'Nomor WhatsApp admin tidak valid: 8–15 angka, mis. 6281234567890.' } }, 400);
      }
      return json(state());
    });
    render(<WhatsAppBotPanel notify={notify} />);
    await screen.findByText('API key tersimpan: ••••abcd');

    fireEvent.change(screen.getByLabelText('Nomor WhatsApp admin'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pengaturan WhatsApp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nomor WhatsApp admin tidak valid');
    expect(posts[1]).toEqual({
      action: 'waha_save_config',
      enabled: true,
      url: '',
      session: '',
      admin_number: '12',
      pause_hours: '12',
    });
    expect(notify).toHaveBeenCalledWith('error', 'Gagal menyimpan pengaturan bot WhatsApp.', expect.stringContaining('Nomor WhatsApp admin tidak valid'));

    fireEvent.change(screen.getByLabelText('Nomor WhatsApp admin'), { target: { value: '0812 3333 4444' } });
    fireEvent.change(screen.getByLabelText('API key WAHA (X-Api-Key)'), { target: { value: '  kunci-baru  ' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Aktif' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pengaturan WhatsApp' }));
    await waitFor(() => expect(posts).toHaveLength(3));
    expect(posts[2]).toMatchObject({ action: 'waha_save_config', enabled: false, admin_number: '0812 3333 4444', key: 'kunci-baru' });
    await waitFor(() => expect(notify).toHaveBeenLastCalledWith('success', 'Pengaturan bot WhatsApp tersimpan.', expect.any(String)));
    // Kolom kunci dikosongkan lagi setelah tersimpan
    expect(screen.getByLabelText('API key WAHA (X-Api-Key)')).toHaveValue('');
  });

  it('hapus API key tersimpan → key: null; pesan uji → waha_test (galat server diteruskan)', async () => {
    const notify = vi.fn();
    const posts = mockWaha((body) =>
      body.action === 'waha_test'
        ? json({ error: 'WAHA menolak API key (HTTP 401). Periksa API key.', code: 'WAHA_SEND_FAILED' }, 502)
        : json(state()),
    );
    render(<WhatsAppBotPanel notify={notify} />);
    await screen.findByText('API key tersimpan: ••••abcd');

    // Menandai hapus dikonfirmasi dulu (sama dengan kunci AI); Batal = tidak ada yang berubah
    fireEvent.click(screen.getByRole('button', { name: 'Hapus API key tersimpan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Hapus API key WAHA?' });
    expect(dialog).toHaveTextContent('API key tersimpan ••••abcd dihapus dari server saat kamu klik Simpan pengaturan WhatsApp.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Batal' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('API key tersimpan: ••••abcd')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus API key tersimpan' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Hapus API key WAHA?' })).getByRole('button', { name: 'Ya, hapus' }));
    expect(await screen.findByText('API key tersimpan akan dihapus saat pengaturan disimpan.')).toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith('info', 'API key WAHA akan dihapus.', 'Klik Simpan pengaturan WhatsApp untuk menghapusnya dari server.');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pengaturan WhatsApp' }));
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1]).toMatchObject({ action: 'waha_save_config', key: null });

    fireEvent.click(await screen.findByRole('button', { name: 'Kirim pesan uji ke admin' }));
    await waitFor(() => expect(posts[2]).toEqual({ action: 'waha_test' }));
    await waitFor(() => expect(notify).toHaveBeenLastCalledWith('error', 'Pesan uji gagal.', 'WAHA menolak API key (HTTP 401). Periksa API key.'));
  });

  it('Selesai → waha_close_handoff untuk chat itu; log diperbarui', async () => {
    const notify = vi.fn();
    const posts = mockWaha((body) =>
      body.action === 'waha_close_handoff' ? json(state({ handoffs: [{ ...HANDOFF, status: 'selesai', paused: false }] })) : json(state()),
    );
    render(<WhatsAppBotPanel notify={notify} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Selesai, aktifkan bot' }));
    await waitFor(() => expect(posts[1]).toEqual({ action: 'waha_close_handoff', chat_id: '6282222222222@c.us' }));
    const item = (await screen.findByText('Selesai')).closest('li') as HTMLElement;
    expect(within(item).queryByRole('button', { name: 'Selesai, aktifkan bot' })).toBeNull();
    expect(notify).toHaveBeenCalledWith('success', 'Bot aktif lagi untuk chat ini.', 'Budi kembali dijawab Nexa AI.');
  });

  it('peringatan: WAHA_HMAC_KEY belum ada, tabel belum dimigrasi; gagal muat → coba lagi', async () => {
    let first = true;
    mockWaha(() => {
      if (first) {
        first = false;
        return json({ error: 'Terjadi kesalahan pada server. Silakan coba lagi.' }, 500);
      }
      return json(state({ config: { ...CONFIG, hmac_env: false }, handoffs: [], tables_ready: false }));
    });
    render(<WhatsAppBotPanel notify={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Coba lagi/ }));
    expect(await screen.findByText('WAHA_HMAC_KEY belum ada di .env server')).toBeInTheDocument();
    expect(screen.getByText('Tabel bot WhatsApp belum ada')).toBeInTheDocument();
    expect(screen.getByText('Belum ada chat yang dialihkan ke admin.')).toBeInTheDocument();
  });
});

describe('model panel WhatsApp', () => {
  it('status tampil: selesai, jeda habis, ditangani, menunggu', () => {
    const base = HANDOFF as unknown as WahaHandoff;
    expect(handoffStatus({ ...base, status: 'selesai', paused: false }).label).toBe('Selesai');
    expect(handoffStatus({ ...base, status: 'menunggu', paused: false }).label).toBe('Jeda habis, bot aktif');
    expect(handoffStatus({ ...base, status: 'ditangani', paused: true }).label).toBe('Ditangani admin');
    expect(handoffStatus({ ...base, status: 'menunggu', paused: true }).label).toBe('Menunggu admin');
  });

  it('waktu database → teks Indonesia; respons rusak → null', () => {
    expect(formatHandoffTime('2026-01-05 09:07:00')).toBe('5 Jan 2026, 09.07');
    expect(formatHandoffTime('kemarin')).toBe('kemarin');
    expect(parseWahaState({ success: true })).toBeNull();
    expect(parseWahaState(null)).toBeNull();
    expect(parseWahaState({ config: {}, handoffs: [] })?.config.pause_hours).toBe(12);
  });
});
