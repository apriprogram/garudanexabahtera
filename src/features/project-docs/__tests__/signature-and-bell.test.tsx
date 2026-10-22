// @vitest-environment jsdom
// Jalankan: npx vitest run src/features/project-docs/__tests__/signature-and-bell.test.tsx
// SignaturePad (gambar di kanvas / ketik nama, batas 300 KB) dan NotificationBell (polling 60 detik saat tab terlihat,
// badge, panel, tandai dibaca, keyboard).
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PdNotification } from '../types';

const api = vi.hoisted(() => ({
  pdNotificationsList: vi.fn(),
  pdNotificationsRead: vi.fn(),
}));
vi.mock('../api', () => api);

import { NotificationBell } from '../notifications/NotificationBell';
import { relativeTime, inAppLink } from '../notifications/notificationCopy';
import { POLL_INTERVAL_MS } from '../notifications/useNotifications';
import { SignaturePad, type SignatureValue } from '../signature/SignaturePad';
import { SIGNATURE_MAX_BYTES, dataUrlBytes, strokeBounds } from '../signature/signatureImage';

/* ─────────────────────────── Kanvas tiruan (jsdom tidak punya 2D canvas) ─────────────────────────── */

const SMALL_PNG = `data:image/png;base64,${'A'.repeat(4000)}`;
const HUGE_PNG = `data:image/png;base64,${'A'.repeat(Math.ceil((SIGNATURE_MAX_BYTES * 4) / 3) + 400)}`;

function fakeContext() {
  return new Proxy(
    { measureText: (text: string) => ({ width: text.length * 20 }) },
    {
      // Setiap metode kanvas lain = no-op; properti (lineWidth, font, ...) bebas ditulis
      get: (target, key) => (key in target ? target[key as keyof typeof target] : () => undefined),
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;
}

type ToDataUrl = (...args: unknown[]) => string;
let toDataUrl: ReturnType<typeof vi.fn<ToDataUrl>>;

beforeEach(() => {
  toDataUrl = vi.fn<ToDataUrl>(() => SMALL_PNG);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => fakeContext()) as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(((...args: unknown[]) => toDataUrl(...args)) as never);
  for (const fn of Object.values(api)) fn.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function draw(canvas: HTMLElement) {
  fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 40, clientY: 60 });
  fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: 'mouse', clientX: 120, clientY: 90 });
  fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: 'mouse', clientX: 200, clientY: 70 });
  fireEvent.pointerUp(canvas, { pointerId: 1, pointerType: 'mouse', clientX: 200, clientY: 70 });
}

describe('SignaturePad', () => {
  it('menggambar menghasilkan PNG data URL (metode draw), lalu Hapus mengosongkannya', () => {
    const onChange = vi.fn<(value: SignatureValue | null) => void>();
    render(<SignaturePad onChange={onChange} />);

    const canvas = screen.getByRole('img', { name: /Area tanda tangan/ });
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeDisabled();
    draw(canvas);

    const value = onChange.mock.lastCall?.[0];
    expect(value?.input).toEqual({ method: 'draw', data_url: SMALL_PNG });
    expect(value?.preview).toBe(SMALL_PNG);
    expect(screen.getByRole('img', { name: 'Pratinjau tanda tangan' })).toHaveAttribute('src', SMALL_PNG);

    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('Belum ada tanda tangan')).toBeInTheDocument();
  });

  it('memperkecil gambar yang melebihi 300 KB dan menolak bila tetap terlalu besar', () => {
    const onChange = vi.fn<(value: SignatureValue | null) => void>();
    toDataUrl.mockReturnValueOnce(HUGE_PNG).mockReturnValueOnce(SMALL_PNG);
    render(<SignaturePad onChange={onChange} />);
    draw(screen.getByRole('img', { name: /Area tanda tangan/ }));
    // Percobaan pertama terlalu besar → skala diperkecil → muat
    expect(toDataUrl).toHaveBeenCalledTimes(2);
    expect(onChange.mock.lastCall?.[0]?.input.data_url).toBe(SMALL_PNG);

    toDataUrl.mockReset();
    toDataUrl.mockReturnValue(HUGE_PNG);
    draw(screen.getByRole('img', { name: /Area tanda tangan/ }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText(/Tanda tangan tidak bisa diproses/)).toBeInTheDocument();
  });

  it('ketik nama memakai nama bawaan dan mengirim typed_name (server membuat gambarnya)', () => {
    const onChange = vi.fn<(value: SignatureValue | null) => void>();
    render(<SignaturePad onChange={onChange} defaultName="Sari Wulandari" />);

    fireEvent.click(screen.getByRole('radio', { name: 'Ketik nama' }));
    expect(screen.getByRole('radio', { name: 'Ketik nama' })).toHaveAttribute('aria-checked', 'true');
    expect(onChange.mock.lastCall?.[0]?.input).toEqual({ method: 'type', typed_name: 'Sari Wulandari' });

    const input = screen.getByLabelText('Nama untuk tanda tangan');
    fireEvent.change(input, { target: { value: '  Sari   W.  ' } });
    expect(onChange.mock.lastCall?.[0]?.input).toEqual({ method: 'type', typed_name: 'Sari W.' });
    expect(onChange.mock.lastCall?.[0]?.preview).toBe(SMALL_PNG);

    fireEvent.change(input, { target: { value: '   ' } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('pilihan cara tanda tangan bisa dipindah dengan panah keyboard', () => {
    render(<SignaturePad onChange={vi.fn()} />);
    const draw = screen.getByRole('radio', { name: 'Gambar' });
    draw.focus();
    fireEvent.keyDown(draw, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: 'Ketik nama' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Ketik nama' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Nama untuk tanda tangan')).toBeInTheDocument();
  });

  it('menampilkan pesan error dari form di sekitarnya', () => {
    render(<SignaturePad onChange={vi.fn()} error="Bubuhkan tanda tangan dulu." variant="admin" />);
    expect(screen.getByText('Bubuhkan tanda tangan dulu.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Area tanda tangan/ })).toHaveAttribute('aria-describedby', expect.stringContaining('error'));
  });

  it('helper: ukuran data URL dan batas tinta', () => {
    expect(dataUrlBytes('data:image/png;base64,QUJD')).toBe(3);
    expect(dataUrlBytes('data:image/png;base64,QUI=')).toBe(2);
    expect(strokeBounds([])).toBeNull();
    expect(strokeBounds([[{ x: 10, y: 20, w: 1 }, { x: 30, y: 25, w: 1 }]])).toEqual({ x: 8.5, y: 18.5, width: 23, height: 8 });
  });
});

/* ─────────────────────────── NotificationBell ─────────────────────────── */

function note(over: Partial<PdNotification> = {}): PdNotification {
  return {
    id: 1,
    type: 'doc_review',
    title: 'Dokumen menunggu persetujuan Anda',
    body: 'PKS 002/PKS/GNB/X/2026 siap ditinjau.',
    link: '/akun/proyek/3/dokumen/20',
    project_id: 3,
    read: false,
    created_at: '2026-10-22 09:00:00',
    ...over,
  };
}

const list = (notifications: PdNotification[]) => ({
  success: true,
  notifications,
  unread: notifications.filter((n) => !n.read).length,
});

function renderBell(variant: 'admin' | 'account' = 'account') {
  return render(
    <MemoryRouter initialEntries={['/akun']}>
      <NotificationBell variant={variant} />
      <Routes>
        <Route path="/akun" element={<p>Beranda akun</p>} />
        <Route path="/akun/proyek/:id/dokumen/:docId" element={<p>Halaman dokumen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('NotificationBell', () => {
  afterEach(() => setVisibility('visible'));

  it('memuat saat dipasang, lalu tiap 60 detik hanya selama tab terlihat', async () => {
    vi.useFakeTimers();
    api.pdNotificationsList.mockResolvedValue(list([note(), note({ id: 2, read: true })]));
    renderBell();
    await act(async () => {});
    expect(api.pdNotificationsList).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Notifikasi, 1 belum dibaca' })).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));
    expect(api.pdNotificationsList).toHaveBeenCalledTimes(2);

    act(() => setVisibility('hidden'));
    await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3));
    expect(api.pdNotificationsList).toHaveBeenCalledTimes(2);

    // Kembali terlihat setelah lebih dari 60 detik: langsung dimuat ulang
    act(() => setVisibility('visible'));
    await act(async () => {});
    expect(api.pdNotificationsList).toHaveBeenCalledTimes(3);
  });

  it('berhenti bertanya setelah 401/403', async () => {
    vi.useFakeTimers();
    const { ApiError } = await import('../../../lib/api');
    api.pdNotificationsList.mockRejectedValue(new ApiError('Akses ditolak.', 403));
    renderBell();
    await act(async () => {});
    await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2));
    expect(api.pdNotificationsList).toHaveBeenCalledTimes(1);
  });

  it('panel: aria-expanded, fokus masuk, Escape menutup dan mengembalikan fokus', async () => {
    api.pdNotificationsList.mockResolvedValue(list([note()]));
    renderBell();
    const button = await screen.findByRole('button', { name: 'Notifikasi, 1 belum dibaca' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    const panel = screen.getByRole('dialog', { name: 'Notifikasi' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveFocus();
    expect(within(panel).getByText('Dokumen menunggu persetujuan Anda')).toBeInTheDocument();
    expect(within(panel).getByText('1 belum dibaca')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('tandai satu dibaca dan tandai semua dibaca', async () => {
    api.pdNotificationsList.mockResolvedValue(list([note(), note({ id: 2, title: 'Invoice diterbitkan', type: 'invoice_issued' })]));
    api.pdNotificationsRead.mockResolvedValue({ success: true });
    renderBell('admin');
    fireEvent.click(await screen.findByRole('button', { name: 'Notifikasi, 2 belum dibaca' }));

    fireEvent.click(screen.getByRole('button', { name: 'Tandai dibaca: Invoice diterbitkan' }));
    expect(api.pdNotificationsRead).toHaveBeenCalledWith({ id: 2 });
    expect(screen.getByRole('button', { name: 'Notifikasi, 1 belum dibaca' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tandai dibaca: Invoice diterbitkan' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tandai semua dibaca' }));
    expect(api.pdNotificationsRead).toHaveBeenLastCalledWith({ all: true });
    expect(screen.getByRole('button', { name: 'Notifikasi' })).toBeInTheDocument();
    expect(screen.getByText('Semua sudah dibaca')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tandai semua dibaca' })).toBeDisabled();
  });

  it('membuka tautan notifikasi, menandainya dibaca, dan menutup panel', async () => {
    api.pdNotificationsList.mockResolvedValue(list([note()]));
    api.pdNotificationsRead.mockResolvedValue({ success: true });
    renderBell();
    fireEvent.click(await screen.findByRole('button', { name: /Notifikasi/ }));
    const link = screen.getByRole('link', { name: /Dokumen menunggu persetujuan Anda/ });
    expect(link).toHaveAttribute('href', '/akun/proyek/3/dokumen/20');

    fireEvent.click(link);
    expect(await screen.findByText('Halaman dokumen')).toBeInTheDocument();
    expect(api.pdNotificationsRead).toHaveBeenCalledWith({ id: 1 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keadaan kosong dan gagal memuat', async () => {
    api.pdNotificationsList.mockResolvedValue(list([]));
    renderBell();
    fireEvent.click(await screen.findByRole('button', { name: 'Notifikasi' }));
    expect(await screen.findByText('Belum ada notifikasi.')).toBeInTheDocument();
    cleanup();

    const { ApiError } = await import('../../../lib/api');
    api.pdNotificationsList.mockRejectedValue(new ApiError('Server sibuk.', 500));
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: 'Notifikasi' }));
    expect(await screen.findByText('Notifikasi belum bisa dimuat')).toBeInTheDocument();
    api.pdNotificationsList.mockResolvedValue(list([note()]));
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await waitFor(() => expect(screen.getByText('Dokumen menunggu persetujuan Anda')).toBeInTheDocument());
  });

  it('helper: waktu relatif dan tautan dalam aplikasi saja', () => {
    const now = new Date('2026-10-22T12:00:00').getTime();
    expect(relativeTime('2026-10-22 11:59:30', now)).toBe('Baru saja');
    expect(relativeTime('2026-10-22 11:55:00', now)).toBe('5 menit lalu');
    expect(relativeTime('2026-10-22 09:00:00', now)).toBe('3 jam lalu');
    expect(relativeTime('2026-10-21 10:00:00', now)).toBe('Kemarin');
    expect(relativeTime('2026-10-18 12:00:00', now)).toBe('4 hari lalu');
    expect(inAppLink('/akun/proyek/3')).toBe('/akun/proyek/3');
    expect(inAppLink('//evil.test/x')).toBeNull();
    expect(inAppLink('https://evil.test')).toBeNull();
    expect(inAppLink(null)).toBeNull();
  });
});
