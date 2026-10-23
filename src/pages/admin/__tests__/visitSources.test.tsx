// @vitest-environment jsdom
// Panel "Sumber kunjungan" di Analitik pengunjung (docs/platform/SEO-PLAN.md §5.9): get_visitor_details.sources
// (backend/modules/visits.php / visits.js) tampil dengan jumlahnya; null = migrasi 010 belum jalan.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../Dashboard';

const SOURCES = [
  { label: 'chatgpt.com', value: 6 },
  { label: 'perplexity.ai', value: 2 },
  { label: 'gemini.google.com', value: 0 },
  { label: 'copilot.microsoft.com', value: 0 },
  { label: 'bing.com', value: 1 },
  { label: 'google.*', value: 10 },
  { label: 'lainnya', value: 1 },
  { label: 'langsung', value: 20 },
];

function mockApi(sources: unknown) {
  const details = { total: 40, today: 2, daily: [], devices: [], browsers: [], os: [], countries: [], sources };
  const responses: Record<string, unknown> = {
    get_visitor_details: details,
    get_visitor_stats: { total_visits: 40 },
    get_projects: [],
    get_users: [],
  };
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const action = new URL(url, 'http://localhost').searchParams.get('action') ?? '';
      // Ringkasan dashboard tidak dibutuhkan panel ini: error biasa, dashboard tetap tampil
      const body = action in responses ? responses[action] : { error: 'tidak dipakai di tes ini' };
      return Promise.resolve(new Response(JSON.stringify(body), { status: action in responses ? 200 : 500 }));
    }),
  );
}

async function openSources() {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Lihat detail pengunjung' }));
  const title = await screen.findByText('Sumber kunjungan');
  return title.closest('div.space-y-4') as HTMLElement;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Sumber kunjungan', () => {
  it('menampilkan semua kelompok dengan jumlahnya', async () => {
    mockApi(SOURCES);
    const modal = await openSources();
    for (const label of ['chatgpt.com', 'perplexity.ai', 'gemini.google.com', 'copilot.microsoft.com', 'bing.com', 'google.*', 'Lainnya', 'Langsung (tanpa referrer)']) {
      expect(within(modal).getByText(label)).toBeInTheDocument();
    }
    // 6 dari 40 kunjungan bersumber = 15%
    expect(within(modal).getByText('15% (6)')).toBeInTheDocument();
    expect(within(modal).getByText('50% (20)')).toBeInTheDocument();
  });

  it('memberi tahu bila migrasi 010 belum dijalankan', async () => {
    mockApi(null);
    const modal = await openSources();
    expect(within(modal).getByText('Belum aktif: jalankan migrasi database 2026-10-23_010.')).toBeInTheDocument();
  });

  it('belum ada kunjungan bersumber = belum ada data', async () => {
    mockApi(SOURCES.map((s) => ({ ...s, value: 0 })));
    const modal = await openSources();
    expect(within(modal).queryByText('chatgpt.com')).not.toBeInTheDocument();
    expect(within(modal).getAllByText('Belum ada data.').length).toBeGreaterThan(0);
  });
});
