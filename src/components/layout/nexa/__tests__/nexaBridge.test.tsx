// @vitest-environment jsdom
// Jembatan kotak prompt hero → chat Nexa (nexaBridge.ts): FloatingWhatsApp mendaftarkan widget selama chat hidup,
// askNexa membuka panel, NexaChat mengirim pertanyaannya ke nexa_chat dan menampilkan jawaban; tanpa widget askNexa
// menolak (hero memakai jalur /pesan-custom?brief=).
// Jalankan: node ../../../node_modules/vitest/vitest.mjs run src/components/layout/nexa/__tests__/nexaBridge.test.tsx
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiPost } from '../../../../lib/api';
import { FloatingWhatsApp } from '../../FloatingWhatsApp';
import { NEXA_REPLY_DELAY } from '../NexaChat';
import { askNexa, getNexaRequest, resetNexaBridge, useNexaAvailable } from '../nexaBridge';

vi.mock('../../../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../lib/api')>()),
  apiGet: vi.fn(async () => ({})),
  apiPost: vi.fn(),
}));

const Probe = () => <p data-testid="available">{String(useNexaAvailable())}</p>;
const WA = 'https://wa.me/6285188009152';

beforeEach(() => {
  resetNexaBridge();
  vi.mocked(apiPost).mockReset();
  vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetNexaBridge();
});

describe('nexaBridge', () => {
  it('widget mendaftar selama chat hidup; chat mati / dilepas → tidak tersedia dan askNexa menolak', () => {
    const view = render(
      <MemoryRouter>
        <FloatingWhatsApp href={WA} />
        <Probe />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('available')).toHaveTextContent('true');
    view.rerender(
      <MemoryRouter>
        <FloatingWhatsApp href={WA} chat={false} />
        <Probe />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('available')).toHaveTextContent('false');
    expect(askNexa('halo')).toBe(false);
    expect(getNexaRequest()).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('askNexa membuka panel, pertanyaan terkirim ke nexa_chat lalu dijawab, permintaan dihapus', async () => {
    vi.useFakeTimers();
    vi.mocked(apiPost).mockResolvedValue({ reply: 'Coba **Toko Kita** (/template/toko-kita), cocok untuk toko online.' });
    render(
      <MemoryRouter>
        <FloatingWhatsApp href={WA} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      expect(askNexa('Saya mau toko online')).toBe(true);
    });
    expect(screen.getByRole('dialog', { name: 'Tanya Nexa AI' })).toBeInTheDocument();
    expect(screen.getByRole('log').textContent).toContain('Saya mau toko online');
    expect(getNexaRequest()).toBeNull();
    expect(apiPost).toHaveBeenCalledWith('nexa_chat', { messages: [{ role: 'user', content: 'Saya mau toko online' }] });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(NEXA_REPLY_DELAY + 50);
    });
    expect(screen.getByRole('log').textContent).toContain('Toko Kita');
  });

  it('permintaan yang tertahan (Nexa masih mengetik) dibuang saat panel ditutup atau widget dilepas, tidak terkirim sendiri nanti', async () => {
    vi.useFakeTimers();
    // Jawaban AI tidak pernah tiba selama tes: Nexa terus "mengetik"
    vi.mocked(apiPost).mockImplementation(() => new Promise(() => {}));
    const view = render(
      <MemoryRouter>
        <FloatingWhatsApp href={WA} />
      </MemoryRouter>,
    );
    act(() => {
      askNexa('Pertanyaan A');
    });
    expect(apiPost).toHaveBeenCalledTimes(1);
    act(() => {
      askNexa('Pertanyaan B');
    });
    // B menunggu karena Nexa masih mengetik; pengunjung menutup panel → B dibuang
    expect(getNexaRequest()?.text).toBe('Pertanyaan B');
    // Tombol tutup di dalam panel (tombol maskot juga berlabel "Tutup chat Nexa" saat panel terbuka)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tutup chat Nexa' }));
    expect(getNexaRequest()).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    // Buka lagi secara manual: tidak ada yang terkirim sendiri
    fireEvent.click(screen.getByRole('button', { name: 'Tanya Nexa, asisten AI' }));
    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('log').textContent).not.toContain('Pertanyaan B');
    // Widget dilepas (halaman tanpa Nexa) saat ada permintaan tertahan → permintaan dibuang
    act(() => {
      askNexa('Pertanyaan C');
    });
    expect(getNexaRequest()?.text).toBe('Pertanyaan C');
    view.unmount();
    expect(getNexaRequest()).toBeNull();
  });
});
