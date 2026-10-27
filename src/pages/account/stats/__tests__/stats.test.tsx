// @vitest-environment jsdom
// Statistik kunjungan di panel akun (/akun/situs/:siteId/statistik, docs/platform/SITE-STATS-SPEC.md §4–§5 klien):
// data (kartu ringkasan + perubahan, ringkasan grafik, tabel), kosong, galat 503 STATS_NOT_READY + Coba lagi, pergantian
// rentang (?rentang= + minta ulang), tombol "Lihat sebagai tabel", isi CSV, pil Statistik di SiteNav, dan aturan murni
// statsModel / csv. recharts di jsdom: ResizeObserver palsu memberi ukuran wadah, jadi grafik benar-benar dirender.
// Jalankan: npx vitest run src/pages/account/stats/__tests__/stats.test.tsx
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SiteStatsRange, SiteStatsResponse } from '../../../../types/siteStats';
import { SiteNav } from '../../components/SiteNav';
import { BOM, csvCell, toCsv } from '../csv';
import SiteStatsPage from '../SiteStatsPage';
import { Browsers } from '../StatsLists';
import {
  addDays,
  browserLabel,
  changeOf,
  changeText,
  formatPeriod,
  normalizeStats,
  parseRange,
  referrerLabel,
  statsCsvName,
  statsCsvRows,
  trendPoints,
  weekdayRows,
  weekStartOf,
  InvalidStatsResponse,
} from '../statsModel';

vi.setConfig({ testTimeout: 30_000 });

const DOMAIN = 'sma-nurul-azka.sch.id';
const TO = '2026-10-27'; // Selasa

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Statistik contoh: setiap hari 10 tampilan, Selasa 20 Okt 120 tampilan (tertinggi), hari ini 12. Total & pembanding
 * ditulis langsung (server yang menghitung): tampilan naik 25%, kunjungan tetap, pengunjung unik "baru".
 */
function makeStats(range: SiteStatsRange = 30): SiteStatsResponse {
  const from = addDays(TO, -(range - 1));
  const daily = Array.from({ length: range }, (_, i) => {
    const day = addDays(from, i);
    const views = day === '2026-10-20' ? 120 : day === TO ? 12 : 10;
    return { day, views, visits: 4, visitors: 3 };
  });
  return {
    range,
    from,
    to: TO,
    totals: { views: 1234, visits: 456, visitors: 321 },
    previous: { views: 987, visits: 456, visitors: 0 },
    today: { views: 12, visits: 5, visitors: 4 },
    daily,
    pages: [
      { path: '/', title: 'Beranda', views: 600 },
      { path: '/berita/juara-olimpiade', title: 'Juara olimpiade sains', views: 300 },
      { path: '/pengumuman/libur-semester', title: null, views: 50 },
    ],
    sources: [
      { key: 'mesin_pencari', label: 'Mesin pencari', visits: 200 },
      { key: 'media_sosial', label: 'Media sosial', visits: 150 },
      { key: 'ai', label: 'Asisten AI', visits: 6 },
      { key: 'lainnya', label: 'Situs lain', visits: 20 },
      { key: 'langsung', label: 'Langsung', visits: 80 },
    ],
    referrers: [
      { host: 'google.com', visits: 180 },
      { host: 'utm:instagram', visits: 90 },
    ],
    devices: [
      { key: 'desktop', label: 'Komputer', visits: 156, visitors: 100 },
      { key: 'mobile', label: 'HP', visits: 280, visitors: 200 },
      { key: 'tablet', label: 'Tablet', visits: 20, visitors: 21 },
    ],
    browsers: [
      { name: 'Chrome', visits: 300 },
      { name: 'Safari', visits: 156 },
    ],
    hours: Array.from({ length: 24 }, (_, hour) => ({ hour, views: hour === 19 ? 120 : hour })),
    tracking_since: '2026-09-01',
  };
}

const emptyStats = (): SiteStatsResponse => ({
  ...makeStats(30),
  totals: { views: 0, visits: 0, visitors: 0 },
  previous: { views: 0, visits: 0, visitors: 0 },
  today: { views: 0, visits: 0, visitors: 0 },
  daily: makeStats(30).daily.map((d) => ({ ...d, views: 0, visits: 0, visitors: 0 })),
  pages: [],
  sources: makeStats(30).sources.map((s) => ({ ...s, visits: 0 })),
  referrers: [],
  devices: makeStats(30).devices.map((d) => ({ ...d, visits: 0, visitors: 0 })),
  browsers: [],
  hours: Array.from({ length: 24 }, (_, hour) => ({ hour, views: 0 })),
  tracking_since: null,
});

const siteOut = (status: 'active' | 'suspended' = 'active') => ({
  id: 1,
  status,
  template_code: 'madani',
  content: null,
  order_id: 1,
  order_number: 'GN-20261020-ABC123',
  user_id: 9,
  template_id: 1,
  template_name: 'Madani',
  domain: DOMAIN,
  activated_at: '2026-10-20 10:00:00',
  updated_at: '2026-10-20 10:00:00',
  addons: { posts: true },
});

type Handler = (params: URLSearchParams) => Response | Promise<Response>;
let handlers: Record<string, Handler>;
let calls: URLSearchParams[];

const statsCalls = () => calls.filter((q) => q.get('action') === 'customer_get_site_stats');

/** Lokasi router saat ini (query ?rentang=). */
const router = { search: '' };
function LocationProbe() {
  const { search } = useLocation();
  useEffect(() => {
    router.search = search;
  }, [search]);
  return null;
}

const renderPage = (path = '/akun/situs/1/statistik') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/akun/situs/:siteId/statistik" element={<SiteStatsPage />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );

/** recharts ResponsiveContainer membaca ukuran wadah lewat ResizeObserver (jsdom tidak punya, dan ukurannya 0). */
class FakeResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback([{ target, contentRect: { width: 640, height: 280 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  calls = [];
  router.search = '';
  handlers = {
    get_settings: () => json(200, { footer_whatsapp: '0812-1111-2222' }),
    customer_get_site: () => json(200, { success: true, site: siteOut() }),
    customer_get_site_stats: (q) => json(200, makeStats(parseRange(q.get('range')))),
  };
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost');
      calls.push(url.searchParams);
      const handler = handlers[url.searchParams.get('action') ?? ''];
      return handler ? handler(url.searchParams) : json(404, { error: 'tidak ada' });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Kartu ringkasan berlabel ini (dt → div kartu). */
const kpi = (label: string) => screen.getByText(label, { selector: 'dt' }).closest('div')!;
const chartCard = (title: string | RegExp) => screen.getByRole('heading', { level: 2, name: title }).closest('section')!;
/** Ringkasan teks grafik = <p> (teks yang sama juga ada di <desc> SVG grafik). */
const P = { selector: 'p' };

describe('halaman Statistik kunjungan', () => {
  it('data: kartu ringkasan dengan perubahan, ringkasan grafik, tabel halaman/perujuk/browser, pil & privasi', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Statistik kunjungan' })).toBeInTheDocument();
    await screen.findByText('Tampilan halaman', { selector: 'dt' });
    expect(statsCalls()[0].get('site_id')).toBe('1');
    expect(statsCalls()[0].get('range')).toBe('30');

    // Kartu: nilai, perubahan (ikon + teks + kalimat sr), catatan pengunjung unik
    expect(within(kpi('Tampilan halaman')).getByText('1.234')).toBeInTheDocument();
    expect(within(kpi('Tampilan halaman')).getByText('naik 25% dibanding 30 hari sebelumnya')).toHaveClass('sr-only');
    expect(within(kpi('Tampilan halaman')).getByText('+25%')).toHaveClass('text-success-700');
    expect(within(kpi('Kunjungan')).getByText('0%')).toBeInTheDocument();
    expect(within(kpi('Pengunjung unik')).getByText('Baru')).toBeInTheDocument();
    expect(within(kpi('Pengunjung unik')).getByText('dihitung per hari')).toBeInTheDocument();
    // Hari ini 12 vs kemarin 10
    expect(within(kpi('Hari ini')).getByText('12')).toBeInTheDocument();
    expect(within(kpi('Hari ini')).getByText('naik 20% dibanding kemarin')).toBeInTheDocument();

    // Ringkasan teks setiap grafik
    expect(within(chartCard('Tren kunjungan harian')).getByText(/Tertinggi Selasa, 20 Okt 2026, 120 tampilan\./, P)).toBeInTheDocument();
    expect(within(chartCard('Sumber kunjungan')).getByText('Sumber terbesar Mesin pencari: 200 kunjungan (44%).', P)).toBeInTheDocument();
    expect(within(chartCard('Perangkat')).getByText('Paling banyak dari HP: 61% kunjungan.', P)).toBeInTheDocument();
    expect(within(chartCard('Jam ramai (WIB)')).getByText('Paling ramai pukul 19.00–19.59 WIB, 120 tampilan halaman.', P)).toBeInTheDocument();
    expect(within(chartCard('Hari ramai')).getByText('Tertinggi Selasa, rata-rata 32,4 tampilan per hari.', P)).toBeInTheDocument();
    // Grafik benar-benar dirender (ResizeObserver palsu)
    await waitFor(() => expect(chartCard('Tren kunjungan harian').querySelector('svg.recharts-surface')).not.toBeNull());
    // Seri tren bisa disembunyikan; seri terakhir tidak
    const series = within(chartCard('Tren kunjungan harian')).getByRole('group', { name: 'Seri yang ditampilkan' });
    const views = within(series).getByRole('button', { name: 'Tampilan halaman' });
    fireEvent.click(within(series).getByRole('button', { name: 'Pengunjung unik' }));
    expect(within(series).getByRole('button', { name: 'Pengunjung unik' })).toHaveAttribute('aria-pressed', 'false');
    expect(views).toHaveAttribute('aria-pressed', 'true');
    expect(views).toBeDisabled();

    // Halaman terpopuler: tautan ke domain situs, tab baru
    const pages = within(chartCard('Halaman terpopuler')).getByRole('table', { name: 'Halaman terpopuler' });
    const link = within(pages).getByRole('link', { name: /Juara olimpiade sains/ });
    expect(link).toHaveAttribute('href', `https://${DOMAIN}/berita/juara-olimpiade`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(within(pages).getByRole('link', { name: /\/pengumuman\/libur-semester/ })).toHaveAttribute('href', `https://${DOMAIN}/pengumuman/libur-semester`);
    // Situs perujuk: utm:x → "x (utm)"
    const refs = within(chartCard('Situs perujuk')).getByRole('table');
    expect(within(refs).getByText('instagram (utm)')).toBeInTheDocument();
    expect(within(refs).getByText('google.com')).toBeInTheDocument();
    expect(within(chartCard('Browser')).getByText('Chrome')).toBeInTheDocument();

    // Pil SiteNav & catatan privasi
    const nav = screen.getByRole('navigation', { name: 'Menu situs' });
    expect(within(nav).getByRole('link', { name: 'Statistik' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'SEO' })).not.toHaveAttribute('aria-current');
    expect(screen.getByText(/Tanpa cookie\. Alamat IP tidak disimpan\./)).toBeInTheDocument();
    expect(screen.getByText('28 Sep – 27 Okt 2026 · waktu WIB')).toBeInTheDocument();
  });

  it('pergantian rentang: aria-pressed, ?rentang= di URL, statistik diminta lagi (situs tidak)', async () => {
    renderPage();
    await screen.findByText('Tampilan halaman', { selector: 'dt' });
    const group = screen.getByRole('group', { name: 'Rentang waktu' });
    expect(within(group).getByRole('button', { name: '30 hari' })).toHaveAttribute('aria-pressed', 'true');
    const siteCalls = () => calls.filter((q) => q.get('action') === 'customer_get_site').length;
    expect(siteCalls()).toBe(1);

    fireEvent.click(within(group).getByRole('button', { name: '7 hari' }));
    expect(within(group).getByRole('button', { name: '7 hari' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: '30 hari' })).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(router.search).toBe('?rentang=7'));
    await waitFor(() => expect(statsCalls().at(-1)?.get('range')).toBe('7'));
    expect(await screen.findByText('21–27 Okt 2026 · waktu WIB')).toBeInTheDocument();
    expect(within(kpi('Tampilan halaman')).getByText('naik 25% dibanding 7 hari sebelumnya')).toBeInTheDocument();

    // 12 bulan: tren mingguan
    fireEvent.click(within(group).getByRole('button', { name: '12 bulan' }));
    await waitFor(() => expect(router.search).toBe('?rentang=365'));
    expect(await screen.findByRole('heading', { level: 2, name: 'Tren kunjungan per pekan' })).toBeInTheDocument();

    // Kembali ke bawaan: query dihapus
    fireEvent.click(within(group).getByRole('button', { name: '30 hari' }));
    await waitFor(() => expect(router.search).toBe(''));
    await waitFor(() => expect(statsCalls().at(-1)?.get('range')).toBe('30'));
    expect(siteCalls()).toBe(1);
  });

  it('rentang dari URL: ?rentang=90 langsung dipakai; nilai tidak dikenal = 30 hari', async () => {
    renderPage('/akun/situs/1/statistik?rentang=90');
    await screen.findByText('Tampilan halaman', { selector: 'dt' });
    expect(statsCalls()[0].get('range')).toBe('90');
    expect(screen.getByRole('button', { name: '90 hari' })).toHaveAttribute('aria-pressed', 'true');
    cleanup();

    calls = [];
    renderPage('/akun/situs/1/statistik?rentang=14');
    await screen.findByText('Tampilan halaman', { selector: 'dt' });
    expect(statsCalls()[0].get('range')).toBe('30');
  });

  it('"Lihat sebagai tabel" menampilkan data grafik yang sama dalam <table>, lalu kembali ke grafik', async () => {
    renderPage();
    await screen.findByText('Tampilan halaman', { selector: 'dt' });
    const card = chartCard('Sumber kunjungan');
    fireEvent.click(within(card).getByRole('button', { name: 'Lihat sebagai tabel Sumber kunjungan' }));
    const table = within(card).getByRole('table', { name: 'Kunjungan per sumber' });
    const rows = within(table).getAllByRole('row').map((row) => Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent));
    expect(rows).toEqual([
      ['Sumber', 'Kunjungan', 'Persen'],
      ['Mesin pencari', '200', '44%'],
      ['Media sosial', '150', '33%'],
      ['Asisten AI', '6', '1,3%'],
      ['Situs lain', '20', '4,4%'],
      ['Langsung', '80', '18%'],
    ]);
    fireEvent.click(within(card).getByRole('button', { name: 'Lihat sebagai grafik Sumber kunjungan' }));
    expect(within(card).queryByRole('table')).toBeNull();

    // Jam ramai: jam tertinggi ditandai dengan teks, bukan hanya warna
    const hours = chartCard('Jam ramai (WIB)');
    fireEvent.click(within(hours).getByRole('button', { name: /Lihat sebagai tabel/ }));
    expect(within(hours).getByRole('rowheader', { name: '19.00–19.59 (tertinggi)' })).toBeInTheDocument();
    // Tren: satu baris per hari
    const trend = chartCard('Tren kunjungan harian');
    fireEvent.click(within(trend).getByRole('button', { name: /Lihat sebagai tabel/ }));
    expect(within(within(trend).getByRole('table')).getAllByRole('row')).toHaveLength(31);
  });

  it('Unduh CSV: data harian, UTF-8 BOM, pemisah koma, nama statistik-{domain}-{from}-{to}.csv', async () => {
    const blobs: Blob[] = [];
    const names: string[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:statistik';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    renderPage();
    await screen.findByText('Tampilan halaman', { selector: 'dt' });
    fireEvent.click(screen.getByRole('button', { name: 'Unduh CSV data harian' }));
    expect(names).toEqual([`statistik-${DOMAIN}-2026-09-28-2026-10-27.csv`]);
    expect(blobs[0].type).toBe('text/csv;charset=utf-8');
    const bytes = new Uint8Array(await blobs[0].arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const lines = new TextDecoder().decode(bytes).split('\r\n');
    expect(lines[0]).toBe('Tanggal,Tampilan halaman,Kunjungan,Pengunjung unik');
    expect(lines[1]).toBe('2026-09-28,10,4,3');
    expect(lines).toContain('2026-10-20,120,4,3');
    expect(lines[30]).toBe('2026-10-27,12,4,3');
    expect(lines).toHaveLength(32); // kepala + 30 hari + baris akhir kosong
  });

  it('kosong (belum ada data): penjelasan dengan domain, tanpa grafik, CSV nonaktif, catatan privasi tetap', async () => {
    handlers.customer_get_site_stats = () => json(200, emptyStats());
    renderPage();
    expect(await screen.findByRole('heading', { level: 2, name: 'Belum ada kunjungan tercatat' })).toBeInTheDocument();
    expect(
      screen.getByText(`Statistik mulai tercatat saat pengunjung membuka situs Anda di ${DOMAIN}. Kunjungan dari pratinjau CMS tidak dihitung.`),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(`Buka ${DOMAIN.replace(/\./g, '\\.')}`) })).toHaveAttribute('href', `https://${DOMAIN}`);
    expect(screen.queryByText('Tampilan halaman', { selector: 'dt' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Unduh CSV data harian' })).toBeDisabled();
    expect(screen.getByText(/Tanpa cookie\. Alamat IP tidak disimpan\./)).toBeInTheDocument();
  });

  it('503 STATS_NOT_READY → galat dengan Coba lagi; Coba lagi meminta ulang dan menampilkan data', async () => {
    let ready = false;
    handlers.customer_get_site_stats = (q) =>
      ready ? json(200, makeStats(parseRange(q.get('range')))) : json(503, { error: 'Statistik belum siap. Coba lagi nanti.', code: 'STATS_NOT_READY' });
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Statistik belum bisa dimuat')).toBeInTheDocument();
    expect(within(alert).getByText('Statistik belum siap. Coba lagi nanti.')).toBeInTheDocument();
    // Kepala halaman & pil tetap ada
    expect(screen.getByRole('navigation', { name: 'Menu situs' })).toBeInTheDocument();
    ready = true;
    fireEvent.click(within(alert).getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Tampilan halaman', { selector: 'dt' })).toBeInTheDocument();
    expect(statsCalls()).toHaveLength(2);
  });

  it('galat lain (jawaban bukan JSON) → pesan umum; situs bukan milik pembeli → Situs tidak ditemukan', async () => {
    handlers.customer_get_site_stats = () => new Response('<html>Sibuk</html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    renderPage();
    expect(await screen.findByText('Statistik gagal dimuat. Silakan coba lagi.')).toBeInTheDocument();
    cleanup();

    handlers.customer_get_site = () => json(404, { error: 'Situs tidak ditemukan.', code: 'SITE_NOT_FOUND' });
    handlers.customer_get_site_stats = () => json(404, { error: 'Situs tidak ditemukan.', code: 'SITE_NOT_FOUND' });
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Situs tidak ditemukan' })).toBeInTheDocument();
  });

  it('situs nonaktif: statistik tetap tampil dengan pemberitahuan kunjungan baru tidak tercatat', async () => {
    handlers.customer_get_site = () => json(200, { success: true, site: siteOut('suspended') });
    renderPage();
    await screen.findByText('Tampilan halaman', { selector: 'dt' });
    expect(screen.getByText(/kunjungan baru tidak tercatat/)).toBeInTheDocument();
  });
});

describe('SiteNav: pil Statistik', () => {
  it('ada di semua template, setelah SEO; aktif di halaman statistik saja', () => {
    render(
      <MemoryRouter initialEntries={['/akun/situs/4/seo']}>
        <SiteNav siteId={4} posts={false} />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Menu situs' });
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Konten', 'SEO', 'Statistik']);
    expect(within(nav).getByRole('link', { name: 'Statistik' })).toHaveAttribute('href', '/akun/situs/4/statistik');
    expect(within(nav).getByRole('link', { name: 'Statistik' })).not.toHaveAttribute('aria-current');
    cleanup();

    render(
      <MemoryRouter initialEntries={['/akun/situs/4/statistik']}>
        <SiteNav siteId={4} posts />
      </MemoryRouter>,
    );
    const school = screen.getByRole('navigation', { name: 'Menu situs' });
    expect(within(school).getAllByRole('link').map((a) => a.textContent)).toEqual(['Konten', 'Berita & Pengumuman', 'SEO', 'Statistik']);
    expect(within(school).getByRole('link', { name: 'Statistik' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('statsModel & csv', () => {
  it('rentang dari query', () => {
    expect(parseRange('7')).toBe(7);
    expect(parseRange('365')).toBe(365);
    expect(parseRange(null)).toBe(30);
    expect(parseRange('14')).toBe(30);
    expect(parseRange('7 ')).toBe(30);
  });

  it('perubahan: naik/turun/baru/tetap', () => {
    expect(changeOf(125, 100)).toEqual({ kind: 'up', percent: 25 });
    expect(changeText(changeOf(125, 100))).toBe('+25%');
    expect(changeText(changeOf(95, 100))).toBe('−5%');
    expect(changeText(changeOf(5, 0))).toBe('Baru');
    expect(changeText(changeOf(0, 0))).toBe('0%');
    expect(changeText(changeOf(0, 10))).toBe('−100%');
  });

  it('format tanggal & perujuk', () => {
    expect(formatPeriod('2026-10-21', '2026-10-27')).toBe('21–27 Okt 2026');
    expect(formatPeriod('2026-09-28', '2026-10-27')).toBe('28 Sep – 27 Okt 2026');
    expect(formatPeriod('2025-10-28', '2026-10-27')).toBe('28 Okt 2025 – 27 Okt 2026');
    expect(referrerLabel('utm:whatsapp')).toBe('whatsapp (utm)');
    expect(referrerLabel('bing.com')).toBe('bing.com');
    expect(browserLabel('Unknown')).toBe('Lainnya');
    expect(browserLabel('Chrome')).toBe('Chrome');
  });

  it('tabel Browser: "Unknown" dari server (browser dalam aplikasi, Opera Mini) tampil "Lainnya"', () => {
    render(<Browsers stats={{ ...makeStats(30), browsers: [{ name: 'Chrome', visits: 6 }, { name: 'Unknown', visits: 4 }] }} />);
    const table = screen.getByRole('table', { name: 'Browser pengunjung' });
    const row = within(table).getByText('Lainnya').closest('tr')!;
    expect(row).toHaveTextContent('Lainnya');
    expect(row).toHaveTextContent('4');
    expect(within(table).queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('12 bulan → titik mingguan Senin–Minggu (pekan tepi terpotong rentang)', () => {
    const stats = makeStats(365);
    const weeks = trendPoints(stats);
    expect(weekStartOf('2026-10-27')).toBe('2026-10-26');
    expect(weekStartOf('2026-10-26')).toBe('2026-10-26');
    expect(weekStartOf('2026-10-25')).toBe('2026-10-19');
    // 2025-10-28 (Selasa) … 2026-10-27 (Selasa): pekan pertama Sel–Min (6 hari), terakhir Sen–Sel (2 hari)
    expect(weeks[0]).toMatchObject({ key: '2025-10-27', start: '2025-10-28', end: '2025-11-02', views: 60 });
    expect(weeks.at(-1)).toMatchObject({ key: '2026-10-26', start: '2026-10-26', end: '2026-10-27', views: 22 });
    expect(weeks.find((w) => w.key === '2026-10-19')).toMatchObject({ views: 180, visits: 28, visitors: 21 });
    expect(weeks.reduce((sum, w) => sum + w.views, 0)).toBe(stats.daily.reduce((sum, d) => sum + d.views, 0));
    // Rentang lain: per hari
    expect(trendPoints(makeStats(7))).toHaveLength(7);
  });

  it('hari ramai = rata-rata per hari Senin–Minggu, sejak pencatatan dimulai', () => {
    const rows = weekdayRows(makeStats(30));
    expect(rows.map((r) => r.label)).toEqual(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']);
    expect(rows[1]).toMatchObject({ days: 5, average: 32.4 });
    expect(rows[0]).toMatchObject({ days: 5, average: 10 });
    const late = weekdayRows({ ...makeStats(30), tracking_since: '2026-10-20' });
    expect(late[1]).toMatchObject({ days: 2, average: 66 });
    expect(late[0]).toMatchObject({ days: 1, average: 10 });
  });

  it('normalizeStats: angka string, grup & perangkat lengkap, 24 jam; bukan bentuk API → galat', () => {
    const stats = normalizeStats(
      {
        range: 7,
        from: '2026-10-21',
        to: '2026-10-27',
        totals: { views: '15', visits: 3, visitors: null },
        daily: [{ day: '2026-10-21', views: '5', visits: 1, visitors: 1 }],
        sources: [{ key: 'langsung', label: 'Langsung', visits: '3' }],
        devices: [{ key: 'mobile', visits: 3, visitors: 2 }],
        hours: [{ hour: 7, views: 5 }],
        pages: [{ path: '/', title: 'Beranda', views: 5 }, { path: '', views: 1 }],
        tracking_since: 'kemarin',
      },
      7,
    );
    expect(stats.totals).toEqual({ views: 15, visits: 3, visitors: 0 });
    expect(stats.daily).toEqual([{ day: '2026-10-21', views: 5, visits: 1, visitors: 1 }]);
    expect(stats.sources.map((s) => [s.key, s.visits])).toEqual([
      ['mesin_pencari', 0],
      ['media_sosial', 0],
      ['ai', 0],
      ['lainnya', 0],
      ['langsung', 3],
    ]);
    expect(stats.devices.map((d) => [d.label, d.visits])).toEqual([
      ['Komputer', 0],
      ['HP', 3],
      ['Tablet', 0],
    ]);
    expect(stats.hours).toHaveLength(24);
    expect(stats.hours[7].views).toBe(5);
    expect(stats.pages).toEqual([{ path: '/', title: 'Beranda', views: 5 }]);
    expect(stats.tracking_since).toBeNull();
    expect(() => normalizeStats(null, 30)).toThrow(InvalidStatsResponse);
    expect(() => normalizeStats({ daily: [] }, 30)).toThrow(InvalidStatsResponse);
  });

  it('CSV: BOM, koma, sel berkoma/berkutip dibungkus kutip; nama file', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('kata "kutip"')).toBe('"kata ""kutip"""');
    expect(csvCell(12)).toBe('12');
    expect(toCsv([['a', 1], ['b', 2]])).toBe(`${BOM}a,1\r\nb,2\r\n`);
    expect(BOM.charCodeAt(0)).toBe(0xfeff);
    const stats = makeStats(7);
    expect(statsCsvName('SMA-Nurul-Azka.sch.id', stats)).toBe('statistik-sma-nurul-azka.sch.id-2026-10-21-2026-10-27.csv');
    expect(statsCsvRows(stats)).toHaveLength(8);
  });
});
