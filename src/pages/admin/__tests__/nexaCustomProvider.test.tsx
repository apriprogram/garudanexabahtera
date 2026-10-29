// @vitest-environment jsdom
// Tab Tanya Nexa → penyedia ketiga "Endpoint custom (OpenAI-compatible)" (pemilik 2026-10-24: endpoint API universal
// untuk semua AI): isi cepat alamat, peringatan bila belum lengkap, alamat non-https ditolak di form, dan isi
// nexa_save_config. Validasi sebenarnya ada di backend (__tests__/backend/nexa.test.ts).
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SiteSettings from '../SiteSettings';
import { NexaCustomProviderCard, type NexaCustomConfig } from '../nexa/NexaCustomProviderCard';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function Harness({ initial, selected = true, savedUrl = initial.url }: { initial: NexaCustomConfig; selected?: boolean; savedUrl?: string }) {
  const [value, setValue] = useState(initial);
  const [key, setKey] = useState('');
  const [clear, setClear] = useState(false);
  return (
    <NexaCustomProviderCard
      value={value}
      onChange={setValue}
      keyValue={key}
      onKeyChange={setKey}
      clearKey={clear}
      onToggleClear={() => setClear((prev) => !prev)}
      selected={selected}
      savedUrl={savedUrl}
    />
  );
}

describe('NexaCustomProviderCard', () => {
  it('isi cepat mengisi alamat; peringatan sampai model diisi; pratinjau alamat yang dipanggil server', () => {
    render(<Harness initial={{ on: true, key_masked: '', env_key: false, url: '', model: '' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Isi alamat endpoint dan nama model');

    fireEvent.click(within(screen.getByRole('group', { name: 'Isi cepat alamat endpoint' })).getByRole('button', { name: 'OpenRouter' }));
    expect(screen.getByLabelText('Alamat endpoint')).toHaveValue('https://openrouter.ai/api/v1');
    expect(screen.getByRole('button', { name: 'OpenRouter' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Server memanggil https://openrouter.ai/api/v1/chat/completions')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nama model'), { target: { value: 'openai/gpt-x' } });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('alamat yang ditolak server ditandai di form tanpa pratinjau: jaringan lokal, IP privat, huruf besar, #', () => {
    render(<Harness initial={{ on: true, key_masked: '', env_key: false, url: '', model: 'm' }} />);
    const input = screen.getByLabelText('Alamat endpoint');
    for (const [url, reason] of [
      ['https://192.168.1.5:1234/v1', 'Pakai alamat server AI publik'],
      ['https://ollama.local/v1', 'Pakai alamat server AI publik'],
      ['https://myserver/v1', 'Pakai alamat server AI publik'],
      ['HTTPS://api.openai.com/v1', 'Alamat harus diawali https://'],
      ['https://api.openai.com/v1#x', 'Alamat tidak valid'],
    ]) {
      fireEvent.change(input, { target: { value: url } });
      expect(screen.getByRole('alert')).toHaveTextContent(reason);
      expect(screen.queryByText(/^Server memanggil/)).toBeNull();
    }
    fireEvent.change(input, { target: { value: 'https://API.Groq.com/openai/v1/' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Server memanggil https://api.groq.com/openai/v1/chat/completions')).toBeInTheDocument();
  });

  it('alamat pindah ke server lain tanpa kunci baru → diberi tahu kunci tersimpan akan dihapus', () => {
    render(<Harness initial={{ on: true, key_masked: '••••3456', env_key: false, url: 'https://api.openai.com/v1', model: 'gpt-x' }} />);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'OpenRouter' }));
    expect(screen.getByRole('status')).toHaveTextContent('kunci tersimpan akan dihapus');
    // Server sama (path lain) → kunci tetap
    fireEvent.change(screen.getByLabelText('Alamat endpoint'), { target: { value: 'https://api.openai.com/v2' } });
    expect(screen.queryByRole('status')).toBeNull();
    // Kunci baru diketik → tidak ada yang hilang
    fireEvent.change(screen.getByLabelText('Alamat endpoint'), { target: { value: 'https://openrouter.ai/api/v1' } });
    fireEvent.change(screen.getByLabelText('Kunci API endpoint custom'), { target: { value: 'or-key-123456' } });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('tanpa peringatan bila endpoint tidak dipakai (bukan penyedia utama dan masih kosong)', () => {
    render(<Harness selected={false} initial={{ on: true, key_masked: '', env_key: false, url: '', model: '' }} />);
    expect(screen.queryByRole('status')).toBeNull();
    // Mulai diisi → peringatan muncul sampai lengkap
    fireEvent.change(screen.getByLabelText('Nama model'), { target: { value: 'llama-uji' } });
    expect(screen.getByRole('status')).toHaveTextContent('Isi alamat endpoint dan nama model');
  });

  it('alamat tanpa https:// ditandai salah; kunci tersimpan bisa ditandai untuk dihapus', () => {
    render(<Harness initial={{ on: false, key_masked: '••••3456', env_key: false, url: 'http://ai.example.com/v1', model: 'm' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Alamat harus diawali https://');
    expect(screen.getByLabelText('Alamat endpoint')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Kunci tersimpan: ••••3456')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus kunci tersimpan' }));
    expect(screen.getByText('Kunci tersimpan akan dihapus saat pengaturan AI disimpan.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Batal menghapus kunci' })).toBeInTheDocument();
  });
});

describe('SiteSettings: tab Tanya Nexa dengan endpoint custom', () => {
  it('pilih "Endpoint custom", isi alamat/model/kunci → nexa_save_config membawa custom; backend lama tanpa custom tetap jalan', async () => {
    const posts: Record<string, unknown>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes('get_hero_media_limits')) return json({ success: true, video_max_mb: 30, max_images: 12 });
        if (init?.method === 'POST') {
          const body = JSON.parse(String(init.body)) as Record<string, unknown>;
          posts.push(body);
          if (body.action === 'nexa_get_config' || body.action === 'nexa_save_config') {
            // Backend lama: belum mengirim `custom` → kartu memakai nilai kosong
            return json({
              success: true,
              config: {
                enabled: true,
                provider: 'anthropic',
                anthropic: { on: true, key_masked: '', env_key: false },
                gemini: { on: true, key_masked: '', env_key: false },
              },
            });
          }
          return json({ success: true });
        }
        return json({});
      }),
    );
    render(
      <MemoryRouter>
        <SiteSettings />
      </MemoryRouter>,
    );
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Bagian pengaturan' })).getByRole('button', { name: 'Tanya Nexa' }));
    const url = await screen.findByLabelText('Alamat endpoint');

    fireEvent.click(screen.getAllByRole('tab', { name: 'Endpoint custom' })[0]);
    fireEvent.change(url, { target: { value: '  https://api.groq.com/openai/v1  ' } });
    fireEvent.change(screen.getByLabelText('Nama model'), { target: { value: ' llama-uji ' } });
    fireEvent.change(screen.getByLabelText('Kunci API endpoint custom'), { target: { value: ' gsk_kunci123456 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pengaturan AI' }));

    await waitFor(() => expect(posts.some((p) => p.action === 'nexa_save_config')).toBe(true));
    expect(posts.find((p) => p.action === 'nexa_save_config')).toMatchObject({
      provider: 'custom',
      anthropic: { on: true },
      gemini: { on: true },
      custom: { on: true, url: 'https://api.groq.com/openai/v1', model: 'llama-uji', key: 'gsk_kunci123456' },
    });
  }, 20000); // halaman pengaturan penuh di jsdom: lambat bila mesin sibuk

  it('simpan ditolak server → pemberitahuan menyebut alasannya, bukan teks kolom umum', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes('get_hero_media_limits')) return json({ success: true, video_max_mb: 30, max_images: 12 });
        if (init?.method === 'POST') {
          const body = JSON.parse(String(init.body)) as Record<string, unknown>;
          if (body.action === 'nexa_save_config') {
            return json(
              {
                success: false,
                error: 'Alamat endpoint tidak valid: pakai https:// ke server AI publik, mis. https://api.openai.com/v1.',
                code: 'VALIDATION',
                errors: { custom_url: 'Periksa kembali alamat endpoint.' },
              },
              400,
            );
          }
          if (body.action === 'nexa_get_config') {
            return json({
              success: true,
              config: {
                enabled: true,
                provider: 'custom',
                anthropic: { on: true, key_masked: '', env_key: false },
                gemini: { on: true, key_masked: '', env_key: false },
                custom: { on: true, key_masked: '', env_key: false, url: 'https://api.openai.com/v1', model: 'gpt-x' },
              },
            });
          }
          return json({ success: true });
        }
        return json({});
      }),
    );
    render(
      <MemoryRouter>
        <SiteSettings />
      </MemoryRouter>,
    );
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Bagian pengaturan' })).getByRole('button', { name: 'Tanya Nexa' }));
    expect(await screen.findByLabelText('Alamat endpoint')).toHaveValue('https://api.openai.com/v1');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pengaturan AI' }));
    expect(await screen.findByText(/Alamat endpoint tidak valid: pakai https:\/\//)).toBeInTheDocument();
  }, 20000);

  it('"Hapus kunci tersimpan" endpoint custom minta konfirmasi dulu (pemilik 2026-10-29); membatalkan tanda langsung', async () => {
    const posts: Record<string, unknown>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes('get_hero_media_limits')) return json({ success: true, video_max_mb: 30, max_images: 12 });
        if (init?.method === 'POST') {
          const body = JSON.parse(String(init.body)) as Record<string, unknown>;
          posts.push(body);
          if (body.action === 'nexa_get_config' || body.action === 'nexa_save_config') {
            return json({
              success: true,
              config: {
                enabled: true,
                provider: 'custom',
                anthropic: { on: true, key_masked: '', env_key: false },
                gemini: { on: true, key_masked: '', env_key: false },
                custom: { on: true, key_masked: '••••3456', env_key: false, url: 'https://api.openai.com/v1', model: 'gpt-x' },
              },
            });
          }
          return json({ success: true });
        }
        return json({});
      }),
    );
    render(
      <MemoryRouter>
        <SiteSettings />
      </MemoryRouter>,
    );
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Bagian pengaturan' })).getByRole('button', { name: 'Tanya Nexa' }));
    expect(await screen.findByText('Kunci tersimpan: ••••3456')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hapus kunci tersimpan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Hapus kunci API Endpoint custom?' });
    expect(dialog).toHaveTextContent('Kunci tersimpan ••••3456 dihapus dari server saat kamu klik Simpan pengaturan AI.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, hapus' }));
    expect(await screen.findByText('Kunci tersimpan akan dihapus saat pengaturan AI disimpan.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Membatalkan tanda tidak menghapus apa pun: tanpa dialog
    fireEvent.click(screen.getByRole('button', { name: 'Batal menghapus kunci' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Kunci tersimpan: ••••3456')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hapus kunci tersimpan' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Hapus kunci API Endpoint custom?' })).getByRole('button', { name: 'Ya, hapus' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pengaturan AI' }));
    await waitFor(() => expect(posts.some((p) => p.action === 'nexa_save_config')).toBe(true));
    expect(posts.find((p) => p.action === 'nexa_save_config')).toMatchObject({ custom: { on: true, key: null } });
  }, 20000);
});
