// @vitest-environment jsdom
// Akun pembeli: Beranda (/akun), Pesanan saya (/akun/pesanan), Situs saya (/akun/situs), detail pesanan, kerangka akun
// (sidebar, topbar, drawer HP, menu profil, skip link, keluar), dialog konfirmasi.
// Jalankan: npx vitest run --dir src/pages/account/__tests__
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order, OrderLog } from '../../../types/platform';
import AccountHome, { type AccountHomeView } from '../AccountHome';
import AccountLayout from '../AccountLayout';
import AccountOrderDetail from '../AccountOrderDetail';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { asSentence, customerHistoryEntry } from '../components/orderCopy';
import { invoiceStatus, isNeverCharged } from '../components/paymentStatus';

const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn() }));
vi.mock('../../../lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/auth')>()),
  logout: logoutMock,
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let seq = 0;
const makeOrder = (overrides: Partial<Order> = {}): Order => {
  seq += 1;
  return {
    id: seq,
    order_number: `GN-20261020-T${String(seq).padStart(5, '0')}`,
    template_id: 1,
    template_name: 'Corporate Nexa',
    template_code: 'corporate-nexa',
    template_slug: 'corporate-nexa',
    price: 1_500_000,
    customer_name: 'Budi',
    customer_email: 'budi@example.com',
    customer_phone: '081234567890',
    company_name: null,
    notes: null,
    domain_primary: 'usaha-budi.com',
    domain_alternative: null,
    domain: null,
    status: 'menunggu_pembayaran',
    status_label: '',
    payment_status: 'pending',
    payment_type: null,
    payment_url: null,
    paid_at: null,
    approved_at: null,
    rejected_reason: null,
    activated_at: null,
    cancelled_at: null,
    created_at: '2026-10-20 10:00:00',
    updated_at: '2026-10-20 10:00:00',
    site_id: null,
    ...overrides,
  };
};

const log = (overrides: Partial<OrderLog>): OrderLog => ({
  id: ++seq,
  event: 'note',
  from_status: null,
  to_status: null,
  actor_type: 'system',
  actor_name: null,
  note: null,
  created_at: '2026-10-20 10:00:00',
  ...overrides,
});

/** Token berformat JWT yang cukup untuk dibaca src/lib/auth.ts (klaim role & exp). */
const tokenFor = (role: string) => `h.${btoa(JSON.stringify({ sub: 7, role, exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`;

let api: Record<string, (body: Record<string, unknown>) => Response>;

beforeEach(() => {
  api = {
    get_settings: () => json(200, { footer_whatsapp: '0812-1111-2222' }),
    get_payment_config: () => json(200, { simulator: false }),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const action = url.searchParams.get('action') ?? '';
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      return api[action] ? api[action](body) : json(404, { error: 'tidak ada' });
    }),
  );
  localStorage.setItem('authToken', tokenFor('customer'));
  localStorage.setItem('currentUser', JSON.stringify({ id: 7, name: 'Budi Santoso', email: 'budi@example.com', role: 'customer' }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  logoutMock.mockReset();
  localStorage.clear();
});

/* ─────────────────────────── Logika status & salinan ─────────────────────────── */

describe('status pembayaran & riwayat untuk pembeli', () => {
  it('lunas lalu ditolak → menunggu pengembalian dana; setelah refund → Dikembalikan', () => {
    const paidRejected = makeOrder({ status: 'ditolak', payment_status: 'settlement', paid_at: '2026-10-20 11:00:00' });
    expect(invoiceStatus(paidRejected)).toEqual({ label: 'Menunggu pengembalian dana', tone: 'warning' });
    expect(invoiceStatus({ ...paidRejected, payment_status: 'refund' }).label).toBe('Dikembalikan');
    // Dibayar setelah ditolak (paid_at kosong) juga dikembalikan
    expect(invoiceStatus(makeOrder({ status: 'ditolak', payment_status: 'settlement' })).label).toBe('Menunggu pengembalian dana');
    expect(invoiceStatus(makeOrder({ status: 'aktif', payment_status: 'settlement', paid_at: '2026-10-20 11:00:00' })).label).toBe('Lunas');
  });

  it('pesanan ditutup yang tidak pernah dibayar = tidak ditagihkan', () => {
    expect(isNeverCharged(makeOrder({ status: 'ditolak' }))).toBe(true);
    expect(isNeverCharged(makeOrder({ status: 'dibatalkan', payment_status: 'expire' }))).toBe(true);
    expect(isNeverCharged(makeOrder({ status: 'ditolak', paid_at: '2026-10-20 11:00:00', payment_status: 'settlement' }))).toBe(false);
    expect(isNeverCharged(makeOrder({ status: 'menunggu_pembayaran' }))).toBe(false);
  });

  it('log → kalimat pembeli, catatan internal tidak pernah tampil', () => {
    expect(customerHistoryEntry(log({ event: 'note', note: 'Catatan internal admin' }))).toBeNull();
    const approved = customerHistoryEntry(log({ event: 'approved', note: 'ok', actor_type: 'staff' }));
    expect(approved?.title).toBe('Pesanan disetujui');
    expect(approved?.text).toBeUndefined();
    expect(customerHistoryEntry(log({ event: 'activated', note: 'Situs aktif, CMS dibuka untuk pemesan.' }))?.text).toBeUndefined();
    const paid = customerHistoryEntry(
      log({ event: 'payment_update', to_status: 'menunggu_approval', note: 'Pembayaran simulasi diterima (mode pengembangan).' }),
    );
    expect(paid?.title).toBe('Pembayaran diterima');
    expect(paid?.text).toBeUndefined();
    expect(customerHistoryEntry(log({ event: 'payment_update', note: 'Status pembayaran: pending' }))).toBeNull();
    expect(customerHistoryEntry(log({ event: 'cancelled', actor_type: 'customer', note: 'Dibatalkan oleh pemesan.' }))?.text).toBe(
      'Anda membatalkan pesanan ini.',
    );
    expect(customerHistoryEntry(log({ event: 'rejected', note: 'Domain tidak tersedia' }))?.text).toBe('Alasan: Domain tidak tersedia.');
    expect(asSentence('Sudah ada titik.')).toBe('Sudah ada titik.');
  });
});

/* ─────────────────────────── Beranda, Pesanan saya, Situs saya ─────────────────────────── */

const renderHome = (view?: AccountHomeView) =>
  render(
    <MemoryRouter initialEntries={['/akun/x']}>
      <Routes>
        <Route path="/akun/x" element={<AccountHome view={view} />} />
      </Routes>
    </MemoryRouter>,
  );

describe('Pesanan saya /akun/pesanan', { timeout: 20_000 }, () => {
  it('ringkasan = filter (aria-pressed), urutan prioritas, pesanan ditutup dilipat', async () => {
    const rejected = makeOrder({ template_name: 'Ditolak Lunas', status: 'ditolak', payment_status: 'settlement', paid_at: '2026-10-19 11:00:00', rejected_reason: 'Domain tidak tersedia', created_at: '2026-10-21 09:00:00' });
    const cancelled = makeOrder({ template_name: 'Batal', status: 'dibatalkan', created_at: '2026-10-21 08:00:00' });
    const active = makeOrder({ template_name: 'Situs Aktif', status: 'aktif', site_id: 7, domain: 'aktif-budi.com', paid_at: '2026-10-01 10:00:00', created_at: '2026-10-01 09:00:00' });
    const unpaid = makeOrder({ template_name: 'Belum Bayar', status: 'menunggu_pembayaran', created_at: '2026-09-01 09:00:00' });
    const review = makeOrder({ template_name: 'Ditinjau Bank', status: 'menunggu_pembayaran', payment_status: 'capture', created_at: '2026-10-02 09:00:00' });
    api.customer_get_orders = () => json(200, { orders: [rejected, cancelled, active, unpaid, review] });
    renderHome('orders');
    expect(screen.getByRole('heading', { level: 1, name: 'Pesanan saya' })).toBeInTheDocument();

    // Tile = tombol filter; tidak ada baris chip yang mengulang angkanya. Render pertama di file ini memuat banyak modul:
    // batas tunggu dilonggarkan agar tidak gagal saat mesin sibuk
    const total = await screen.findByRole('button', { name: /Total pesanan\s*5/ }, { timeout: 5000 });
    expect(total).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Perlu dibayar\s*1/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('group', { name: 'Filter status pesanan' })).not.toBeInTheDocument();

    // Urutan: perlu dibayar → aktif → diproses; ditutup di <details> tertutup
    const section = screen.getByRole('heading', { name: 'Daftar pesanan' }).closest('section')!;
    const titles = () => Array.from(section.querySelectorAll('h3'), (h) => h.textContent);
    expect(titles()).toEqual(['Belum Bayar', 'Situs Aktif', 'Ditinjau Bank', 'Ditolak Lunas', 'Batal']);
    const closed = screen.getByText('Pesanan dibatalkan/ditolak').closest('details')!;
    expect(closed).not.toHaveAttribute('open');
    expect(closed.querySelectorAll('h3')).toHaveLength(2);

    // Ditolak setelah dibayar: info pengembalian dana di kartu
    expect(within(closed).getByText(/Pesanan ditolak: Domain tidak tersedia\. Dana Rp\s?1\.500\.000 dikembalikan penuh/)).toBeInTheDocument();
    expect(within(closed).getByText('Menunggu pengembalian dana')).toBeInTheDocument();

    // Kartu situs hanya di Beranda & Situs saya
    expect(screen.queryByRole('heading', { name: 'Situs Anda' })).not.toBeInTheDocument();

    // Label glosarium: ke katalog = "Pilih Template" ("Pesan Template" khusus /pesan/:slug)
    expect(screen.getByRole('link', { name: /Pilih Template/ })).toHaveAttribute('href', '/#templates');
    expect(screen.getByRole('button', { name: /Bayar Sekarang/ })).toBeInTheDocument();

    // Filter lewat tile: pembayaran yang ditinjau bank masuk "Diproses", bukan "Perlu dibayar"
    fireEvent.click(screen.getByRole('button', { name: /Diproses\s*1/ }));
    expect(screen.getByRole('button', { name: /Diproses\s*1/ })).toHaveAttribute('aria-pressed', 'true');
    expect(titles()).toEqual(['Ditinjau Bank']);
  });

  it('hanya pesanan ditutup: lipatan langsung terbuka', async () => {
    api.customer_get_orders = () => json(200, { orders: [makeOrder({ status: 'dibatalkan' })] });
    renderHome('orders');
    const summary = await screen.findByText('Pesanan dibatalkan/ditolak');
    expect(summary.closest('details')).toHaveAttribute('open');
  });
});

describe('Beranda /akun', { timeout: 20_000 }, () => {
  it('sapaan; maks. 3 pesanan berjalan tanpa pesanan ditutup + "Lihat semua pesanan"; kartu Situs Anda', async () => {
    const active = makeOrder({ template_name: 'Situs Aktif', status: 'aktif', site_id: 7, domain: 'aktif-budi.com', paid_at: '2026-10-01 10:00:00' });
    const orders = [
      active,
      makeOrder({ template_name: 'Belum Bayar A', created_at: '2026-10-03 09:00:00' }),
      makeOrder({ template_name: 'Belum Bayar B', created_at: '2026-10-02 09:00:00' }),
      makeOrder({ template_name: 'Ditinjau', status: 'menunggu_approval', payment_status: 'settlement', paid_at: '2026-10-02 10:00:00' }),
      makeOrder({ template_name: 'Batal', status: 'dibatalkan' }),
    ];
    api.customer_get_orders = () => json(200, { orders });
    renderHome();

    expect(screen.getByRole('heading', { level: 1, name: 'Halo, Budi' })).toBeInTheDocument();
    const all = await screen.findByRole('link', { name: /Lihat semua pesanan \(5\)/ }, { timeout: 5000 });
    expect(all).toHaveAttribute('href', '/akun/pesanan');
    const section = screen.getByRole('heading', { name: 'Pesanan terbaru' }).closest('section')!;
    expect(section.querySelectorAll('h3')).toHaveLength(3);
    expect(screen.queryByText('Pesanan dibatalkan/ditolak')).not.toBeInTheDocument();

    const sites = screen.getByRole('heading', { name: 'Situs Anda' }).closest('section')!;
    expect(within(sites).getByRole('link', { name: /Kelola Situs/ })).toHaveAttribute('href', '/akun/situs/7');
    expect(within(sites).getByRole('link', { name: /Semua situs/ })).toHaveAttribute('href', '/akun/situs');
    // Statistik kunjungan (SITE-STATS-SPEC §4)
    expect(within(sites).getByRole('link', { name: 'Statistik kunjungan aktif-budi.com' })).toHaveAttribute('href', '/akun/situs/7/statistik');
  });

  it('tanpa pesanan berlebih: tidak ada tautan "Lihat semua pesanan"', async () => {
    api.customer_get_orders = () => json(200, { orders: [makeOrder({ template_name: 'Satu-satunya' })] });
    renderHome();
    expect(await screen.findByRole('heading', { level: 3, name: 'Satu-satunya' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Lihat semua pesanan/ })).not.toBeInTheDocument();
  });
});

describe('Situs saya /akun/situs', { timeout: 20_000 }, () => {
  it('hanya situs aktif (tanpa ringkasan pesanan); kosong → ajakan ke Pesanan saya', async () => {
    api.customer_get_orders = () =>
      json(200, {
        orders: [
          makeOrder({ template_name: 'Situs Aktif', status: 'aktif', site_id: 9, domain: 'aktif-budi.com', paid_at: '2026-10-01 10:00:00' }),
          makeOrder({ template_name: 'Belum Bayar' }),
        ],
      });
    renderHome('sites');
    expect(screen.getByRole('heading', { level: 1, name: 'Situs saya' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Kelola Situs/ }, { timeout: 5000 })).toHaveAttribute('href', '/akun/situs/9');
    expect(screen.getByRole('link', { name: 'Statistik kunjungan aktif-budi.com' })).toHaveAttribute('href', '/akun/situs/9/statistik');
    expect(screen.queryByText('Belum Bayar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Total pesanan/ })).not.toBeInTheDocument();
    cleanup();

    api.customer_get_orders = () => json(200, { orders: [makeOrder({ template_name: 'Belum Bayar' })] });
    renderHome('sites');
    expect(await screen.findByText('Belum ada situs aktif')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lihat pesanan saya/ })).toHaveAttribute('href', '/akun/pesanan');
  });
});

/* ─────────────────────────── Detail pesanan ─────────────────────────── */

const renderDetail = (order: Order, logs: OrderLog[] = [], site: unknown = null) => {
  api.customer_get_order = () => json(200, { order, logs, site });
  return render(
    <MemoryRouter initialEntries={[`/akun/pesanan/${order.order_number}`]}>
      <Routes>
        <Route path="/akun/pesanan/:orderNumber" element={<AccountOrderDetail />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('detail pesanan', () => {
  it('lunas lalu ditolak: info pengembalian dana, Pesan Lagi, Tanya via WhatsApp, tanpa Muat ulang', async () => {
    const order = makeOrder({
      status: 'ditolak',
      payment_status: 'settlement',
      payment_type: 'qris',
      paid_at: '2026-10-20 11:00:00',
      rejected_reason: 'Domain tidak tersedia',
    });
    renderDetail(order, [
      log({ event: 'created', to_status: 'menunggu_pembayaran', note: 'Pesanan dibuat.' }),
      log({ event: 'rejected', to_status: 'ditolak', actor_type: 'staff', note: 'Domain tidak tersedia' }),
    ]);

    const notice = (await screen.findAllByRole('alert')).find((el) => el.textContent?.includes('Alasan:'))!;
    expect(notice).toHaveTextContent('Pesanan ditolak');
    expect(notice).toHaveTextContent('Alasan: Domain tidak tersedia.');
    expect(notice).toHaveTextContent(/kembalikan penuh ke metode pembayaran semula, paling lambat 7 hari kerja/);
    expect(within(notice).getByRole('link', { name: 'Kebijakan Pengembalian Dana' })).toHaveAttribute(
      'href',
      '/kebijakan-pengembalian-dana',
    );
    expect(screen.getByText('Menunggu pengembalian dana')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pesan Lagi' })).toHaveAttribute('href', '/pesan/corporate-nexa');
    const wa = screen.getByRole('link', { name: /Tanya via WhatsApp/ });
    await waitFor(() => expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281211112222\?text=/));
    expect(decodeURIComponent(wa.getAttribute('href')!)).toContain(order.order_number);
    expect(screen.queryByRole('button', { name: /Muat ulang/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Hubungi kami' })).not.toBeInTheDocument();
    // Total tetap tegas (dana memang sudah masuk)
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('ditutup tanpa pernah dibayar: Total (tidak ditagihkan); riwayat dilipat tanpa catatan internal', async () => {
    const order = makeOrder({ status: 'dibatalkan', cancelled_at: '2026-10-20 12:00:00' });
    renderDetail(order, [
      log({ event: 'created', to_status: 'menunggu_pembayaran', actor_type: 'customer', note: 'Pesanan dibuat.' }),
      log({ event: 'note', actor_type: 'system', note: 'Gagal membuat transaksi Midtrans (percobaan 1): HTTP 500' }),
      log({ event: 'cancelled', to_status: 'dibatalkan', actor_type: 'customer', actor_name: 'Budi', note: 'Dibatalkan oleh pemesan.' }),
    ]);
    expect(await screen.findByText('Total (tidak ditagihkan)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pesan Lagi' })).toBeInTheDocument();
    expect(screen.queryByText(/Gagal membuat transaksi/)).not.toBeInTheDocument();
    expect(screen.queryByText('Dibatalkan oleh pemesan.')).not.toBeInTheDocument();
    // Timeline: kalimat untuk pembeli, bukan catatan log
    expect(screen.getAllByText('Anda membatalkan pesanan ini.').length).toBeGreaterThan(0);
    const history = screen.getByText('Lihat riwayat lengkap').closest('details')!;
    expect(history).not.toHaveAttribute('open');
    expect(history.querySelectorAll('li')).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: 'Riwayat' })).not.toBeInTheDocument();
  });

  it('Muat ulang hanya untuk status yang masih bisa berubah; label Kelola Situs', async () => {
    renderDetail(makeOrder({ status: 'menunggu_approval', payment_status: 'settlement', paid_at: '2026-10-20 11:00:00' }));
    expect(await screen.findByRole('button', { name: /Muat ulang/ })).toBeInTheDocument();
    cleanup();

    renderDetail(makeOrder({ status: 'aktif', site_id: 3, payment_status: 'settlement', paid_at: '2026-10-20 11:00:00' }));
    expect(await screen.findByRole('link', { name: /Kelola Situs/ })).toHaveAttribute('href', '/akun/situs/3');
    expect(screen.queryByRole('button', { name: /Muat ulang/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Kelola konten situs')).not.toBeInTheDocument();
  });
});

/* ─────────────────────────── Kerangka akun ─────────────────────────── */

const renderLayout = (path = '/akun/x') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/akun" element={<AccountLayout />}>
          <Route index element={<p>Beranda</p>} />
          <Route path="*" element={<p>Isi halaman</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

/** Sidebar desktop (drawer HP memakai label yang sama, tapi hanya ada saat dibuka). */
const sidebarNav = () => screen.getAllByRole('navigation', { name: 'Menu akun' })[0];

describe('kerangka akun', () => {
  it('skip link pertama, menu profil = disclosure (tanpa role menu), fokus ke item pertama, Esc menutup', () => {
    const { container } = renderLayout();
    const skip = screen.getByRole('link', { name: 'Lewati ke konten' });
    expect(container.querySelector('a[href], button')).toBe(skip);
    expect(skip).toHaveAttribute('href', '#konten-akun');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'konten-akun');
    expect(screen.getAllByRole('link', { name: /Lihat Template/ }).length).toBeGreaterThan(0);

    const trigger = screen.getByRole('button', { name: /Menu akun Budi Santoso/ });
    expect(trigger).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    const panel = document.getElementById(trigger.getAttribute('aria-controls')!)!;
    expect(document.activeElement).toBe(within(panel).getAllByRole('link')[0]);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(trigger);
  });

  it('Keluar (menu profil & sidebar) langsung logout bila tidak ada perubahan CMS yang belum disimpan', async () => {
    renderLayout();
    const trigger = screen.getByRole('button', { name: /Menu akun/ });
    fireEvent.click(trigger);
    const panel = document.getElementById(trigger.getAttribute('aria-controls')!)!;
    fireEvent.click(within(panel).getByRole('button', { name: 'Keluar' }));
    // confirmLeave() bisa menunggu dialog konfirmasi, jadi logout tidak harus sinkron
    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));

    fireEvent.click(within(sidebarNav().parentElement!).getByRole('button', { name: 'Keluar' }));
    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(2));
  });

  it('sidebar bergrup seperti panel admin: item aktif aria-current, breadcrumb, nota masuk menu Nota', () => {
    renderLayout('/akun/pesanan');
    const nav = sidebarNav();
    const links = within(nav).getAllByRole('link');
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Beranda', '/akun'],
      ['Pesanan saya', '/akun/pesanan'],
      ['Situs saya', '/akun/situs'],
      ['Proyek saya', '/akun/proyek'],
      ['Fitur tambahan', '/akun/fitur'],
      ['Nota', '/akun/nota'],
      ['Profil', '/akun/profil'],
      ['Lihat Template', '/#templates'],
    ]);
    expect(within(nav).getByRole('link', { name: 'Pesanan saya' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByText('Layanan')).toBeInTheDocument();
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Akun' })).toHaveAttribute('href', '/akun');
    expect(within(crumbs).getByText('Pesanan saya')).toHaveAttribute('aria-current', 'page');
    cleanup();

    renderLayout('/akun/pesanan/GN-1/nota/GNR-2');
    expect(within(sidebarNav()).getByRole('link', { name: 'Nota' })).toHaveAttribute('aria-current', 'page');
    expect(within(sidebarNav()).getByRole('link', { name: 'Pesanan saya' })).not.toHaveAttribute('aria-current');
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Nota GNR-2')).toHaveAttribute('aria-current', 'page');
    cleanup();

    // Fitur tambahan (SITE-ADDONS-SPEC §5): grup Layanan, breadcrumb "Fitur tambahan"
    renderLayout('/akun/fitur?situs=33');
    expect(within(sidebarNav()).getByRole('link', { name: 'Fitur tambahan' })).toHaveAttribute('aria-current', 'page');
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Fitur tambahan')).toHaveAttribute('aria-current', 'page');
    cleanup();

    // Statistik kunjungan (SITE-STATS-SPEC §4): Situs saya › Kelola situs › Statistik
    renderLayout('/akun/situs/3/statistik?rentang=7');
    expect(within(sidebarNav()).getByRole('link', { name: 'Situs saya' })).toHaveAttribute('aria-current', 'page');
    const statsCrumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(statsCrumbs).getByRole('link', { name: 'Kelola situs' })).toHaveAttribute('href', '/akun/situs/3');
    expect(within(statsCrumbs).getByText('Statistik')).toHaveAttribute('aria-current', 'page');
  });

  it('ciutkan sidebar: label jadi sr-only, tersimpan di localStorage', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Ciutkan sidebar' }));
    const toggle = screen.getByRole('button', { name: 'Lebarkan sidebar' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(sidebarNav()).getByText('Beranda')).toHaveClass('sr-only');
    expect(localStorage.getItem('accountSidebarCollapsed')).toBe('1');
    fireEvent.click(toggle);
    expect(localStorage.getItem('accountSidebarCollapsed')).toBe('0');
  });

  it('HP: Buka menu → drawer "Menu akun"; Esc menutup dan fokus kembali ke tombol', async () => {
    renderLayout();
    const open = screen.getByRole('button', { name: 'Buka menu' });
    fireEvent.click(open);
    const drawer = screen.getByRole('dialog', { name: 'Menu akun' });
    expect(open).toHaveAttribute('aria-expanded', 'true');
    expect(within(drawer).getByRole('link', { name: 'Nota' })).toHaveAttribute('href', '/akun/nota');
    expect(document.activeElement).toBe(within(drawer).getByRole('button', { name: 'Tutup menu' }));
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu akun' })).not.toBeInTheDocument());
    expect(document.activeElement).toBe(open);
    expect(document.body.style.overflow).toBe('');
  });

  it('Hubungi kami di footer membuka WhatsApp', async () => {
    renderLayout();
    const link = screen.getByRole('link', { name: /Hubungi kami via WhatsApp/ });
    await waitFor(() => expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281211112222\?text=/));
    expect(link).toHaveAttribute('target', '_blank');
  });
});

/* ─────────────────────────── Dialog konfirmasi ─────────────────────────── */

function DialogHarness({ loading = false }: { loading?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Buka dialog
      </button>
      <ConfirmDialog
        open={open}
        title="Batalkan pesanan?"
        confirmLabel="Ya, batalkan"
        loading={loading}
        onConfirm={() => {}}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  it('fokus terkunci di dialog, Esc menutup dan fokus kembali ke pemicu', () => {
    render(<DialogHarness />);
    const opener = screen.getByRole('button', { name: 'Buka dialog' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('alertdialog');
    const back = within(dialog).getByRole('button', { name: 'Kembali' });
    const confirm = within(dialog).getByRole('button', { name: 'Ya, batalkan' });
    expect(document.activeElement).toBe(back);

    confirm.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(back);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirm);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it('saat memuat (tombol nonaktif) fokus pindah ke kotak dialog, bukan <body>', () => {
    const { rerender } = render(<DialogHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Buka dialog' }));
    rerender(<DialogHarness loading />);
    const dialog = screen.getByRole('alertdialog');
    expect(document.activeElement).toBe(dialog);
    // Esc diabaikan selama memuat
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
