// @vitest-environment jsdom
// Admin "Pesanan Template": fitur tambahan situs (docs/platform/SITE-ADDONS-SPEC.md §4.2, §7). Penolong murni di
// shared/orderUtils.ts, riwayat tagihan di shared/OrderUi.tsx, bagian "Fitur tambahan" di drawer Order Masuk
// (shared/SiteAddonsSection.tsx) dengan API tiruan (tombol hanya untuk admin), dan tautan "Detail pesanan" dari Template
// Aktif.
// Jalankan: node node_modules/vitest/vitest.mjs run src/pages/admin/template-orders/__tests__/siteAddons.test.tsx
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order, Site } from '../../../../types/platform';

// Peran staf yang masuk: admin_set_site_addon khusus admin (staf 'user' hanya melihat)
const { role } = vi.hoisted(() => ({ role: { current: 'admin' } }));
vi.mock('../../../../lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../lib/auth')>()),
  getRole: () => role.current,
}));

import type { SiteAddonOrder, SiteAddonState } from '../../../../types/siteAddons';
import OrderMasuk from '../OrderMasuk';
import TemplateAktif from '../TemplateAktif';
import { AddonOrderHistory } from '../shared/OrderUi';
import {
  addonOrderBadge,
  addonPriceText,
  addonSourceLabel,
  addonStatus,
  capableAddons,
  logEventLabel,
  logTone,
} from '../shared/orderUtils';

function makeOrder(over: Partial<Order> = {}): Order {
  return {
    id: 7,
    order_number: 'GN-20261001-SKL001',
    template_id: 24,
    template_name: 'Madani',
    template_code: 'madani',
    template_slug: 'madani',
    price: 2_050_000,
    list_price: 1_800_000,
    discount_amount: 0,
    discount_code: null,
    customer_name: 'Siti Aminah',
    customer_email: 'siti@example.com',
    customer_phone: '081234567890',
    company_name: 'SMA Harapan',
    notes: null,
    domain_primary: 'smaharapan.sch.id',
    domain_alternative: null,
    domain: 'smaharapan.sch.id',
    status: 'aktif',
    status_label: 'Aktif',
    payment_status: 'settlement',
    payment_type: 'bank_transfer',
    payment_url: null,
    paid_at: '2026-10-01 09:00:00',
    approved_at: '2026-10-01 10:00:00',
    rejected_reason: null,
    activated_at: '2026-10-02 08:00:00',
    cancelled_at: null,
    created_at: '2026-10-01 08:00:00',
    updated_at: '2026-10-02 08:00:00',
    site_id: 33,
    domain_price: 250_000,
    domain_check: 'available',
    invoice_number: 'INV-GN-20261001-SKL001',
    service_started_at: '2026-10-02 08:00:00',
    service_expires_at: '2027-10-02 08:00:00',
    domain_started_at: '2026-10-02 08:00:00',
    domain_expires_at: '2027-10-02 08:00:00',
    ...over,
  };
}

function makeSite(over: Partial<Site> = {}): Site {
  return {
    id: 33,
    order_id: 7,
    order_number: 'GN-20261001-SKL001',
    user_id: 5,
    template_id: 24,
    template_code: 'madani',
    template_name: 'Madani',
    domain: 'smaharapan.sch.id',
    status: 'active',
    content: null,
    activated_at: '2026-10-02 08:00:00',
    updated_at: '2026-10-02 08:00:00',
    service_expires_at: '2027-10-02 08:00:00',
    domain_expires_at: '2027-10-02 08:00:00',
    owner_name: 'Siti Aminah',
    owner_email: 'siti@example.com',
    ...over,
  };
}

function addonOrder(over: Partial<SiteAddonOrder> = {}): SiteAddonOrder {
  return {
    addon_number: 'GNF-20261020-ABC123',
    site_id: 33,
    order_number: 'GN-20261001-SKL001',
    addon_code: 'posts',
    price: 350_000,
    status: 'lunas',
    status_label: 'Lunas',
    source: 'beli',
    payment_status: 'settlement',
    payment_type: 'qris',
    payment_url: null,
    paid_at: '2026-10-20 11:00:00',
    cancelled_at: null,
    revoked_at: null,
    created_at: '2026-10-20 10:30:00',
    invoice_number: 'INV-GNF-20261020-ABC123',
    ...over,
  };
}

function addonState(over: Partial<SiteAddonState> = {}): SiteAddonState {
  return {
    code: 'posts',
    name: 'Berita & Pengumuman',
    price: 350_000,
    capable: true,
    active: false,
    activated_at: null,
    source: null,
    purchase: null,
    pending: null,
    ...over,
  };
}

const PAID = addonOrder();
const ACTIVE = addonState({ active: true, activated_at: PAID.paid_at, source: 'beli', purchase: PAID });
const GRANT = addonOrder({
  addon_number: 'GNF-20261027-ADM001',
  price: 0,
  source: 'admin',
  payment_type: 'gratis',
  paid_at: '2026-10-27 09:00:00',
  created_at: '2026-10-27 09:00:00',
  invoice_number: null,
});
const PENDING = addonOrder({
  addon_number: 'GNF-20261025-PND001',
  status: 'menunggu_pembayaran',
  status_label: 'Menunggu Pembayaran',
  payment_status: 'pending',
  payment_type: null,
  paid_at: null,
  created_at: '2026-10-25 08:00:00',
  invoice_number: null,
});
const REVOKED = addonOrder({ revoked_at: '2026-10-26 15:00:00' });
const CANCELLED = addonOrder({
  addon_number: 'GNF-20261010-BTL001',
  status: 'dibatalkan',
  status_label: 'Dibatalkan',
  payment_status: 'expire',
  payment_type: null,
  paid_at: null,
  cancelled_at: '2026-10-11 08:00:00',
  created_at: '2026-10-10 08:00:00',
  invoice_number: null,
});

type Posted = { action: string; [key: string]: unknown };

/**
 * fetch tiruan: GET per aksi (?action=…), POST admin_set_site_addon lewat `onSet` (dicatat di `posts`); aksi lain = 500.
 * `detail` boleh fungsi agar muat ulang setelah aksi bisa mengembalikan data baru.
 */
function mockApi({
  order,
  detail,
  onSet,
}: {
  order: Order;
  detail: Record<string, unknown> | (() => Record<string, unknown>);
  onSet?: (body: Posted) => { status: number; body: unknown };
}) {
  const posts: Posted[] = [];
  const reads: string[] = [];
  const respond = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      const action = new URL(url, 'http://localhost').searchParams.get('action') ?? '';
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Posted;
        posts.push(body);
        if (action === 'admin_set_site_addon' && onSet) {
          const res = onSet(body);
          return respond(res.status, res.body);
        }
        return respond(500, { error: 'tidak dipakai di tes ini' });
      }
      reads.push(action);
      if (action === 'admin_get_template_orders') return respond(200, { orders: [order], counts: { all: 1, [order.status]: 1 } });
      if (action === 'admin_get_template_order') {
        return respond(200, { order, logs: [], site: makeSite(), ...(typeof detail === 'function' ? detail() : detail) });
      }
      return respond(500, { error: 'tidak dipakai di tes ini' });
    }),
  );
  return { posts, reads };
}

async function openOrder(args: Parameters<typeof mockApi>[0]) {
  const api = mockApi(args);
  render(
    <MemoryRouter initialEntries={[`/admin/pesanan-template?order=${args.order.id}`]}>
      <OrderMasuk />
    </MemoryRouter>,
  );
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByText('Belum ada riwayat.');
  return { dialog, ...api };
}

const addonSection = (dialog: HTMLElement) => within(dialog).getByRole('heading', { name: 'Fitur tambahan' }).closest('section') as HTMLElement;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  role.current = 'admin';
});

/* ------------------------------------------------------------------ */

describe('penolong fitur tambahan', () => {
  it('label & nada log fitur tambahan (granted/revoked = tindakan tim)', () => {
    expect(logEventLabel('addon_created')).toBe('Tagihan fitur tambahan dibuat');
    expect(logEventLabel('addon_paid')).toBe('Fitur tambahan lunas');
    expect(logEventLabel('addon_cancelled')).toBe('Tagihan fitur tambahan dibatalkan');
    expect(logEventLabel('addon_granted')).toBe('Fitur tambahan diaktifkan gratis');
    expect(logEventLabel('addon_revoked')).toBe('Fitur tambahan dinonaktifkan');
    expect(logEventLabel('addon_payment_update')).toBe('Status pembayaran fitur diperbarui');
    expect(logTone('addon_paid')).toBe('mint');
    expect(logTone('addon_granted')).toBe('mint');
    expect(logTone('addon_cancelled')).toBe('mist');
    expect(logTone('addon_revoked')).toBe('warning');
    expect(logTone('addon_payment_created')).toBe('warning');
    expect(logTone('addon_created')).toBe('cobalt');
    // Event lama tidak berubah
    expect(logTone('renewal_paid')).toBe('mint');
    expect(logTone('rejected')).toBe('danger');
    expect(logTone('cancelled')).toBe('mist');
  });

  it('sumber, harga, dan fitur yang didukung template', () => {
    expect(addonSourceLabel('beli')).toBe('Dibeli pembeli');
    expect(addonSourceLabel('admin')).toBe('Diaktifkan gratis oleh tim');
    expect(addonSourceLabel('migrasi')).toBe('Migrasi (sudah memakai berita sebelum fitur berbayar)');
    expect(addonSourceLabel(null)).toBe('-');
    expect(addonPriceText(350_000)).toBe('Rp 350.000');
    expect(addonPriceText(0)).toBe('Gratis');
    expect(capableAddons(undefined)).toEqual([]);
    expect(capableAddons([addonState({ capable: false })])).toEqual([]);
    expect(capableAddons([ACTIVE])).toEqual([ACTIVE]);
  });

  it('addonStatus: aktif, menunggu pembayaran, dinonaktifkan tim, terkunci', () => {
    expect(addonStatus(ACTIVE, [PAID])).toMatchObject({ status: 'active', label: 'Aktif', tone: 'mint' });
    expect(addonStatus(addonState({ pending: PENDING }), [PENDING, REVOKED])).toMatchObject({ status: 'pending', label: 'Menunggu pembayaran' });
    expect(addonStatus(addonState(), [CANCELLED, REVOKED])).toEqual({ status: 'revoked', label: 'Dinonaktifkan', tone: 'warning', revoked: REVOKED });
    expect(addonStatus(addonState(), [CANCELLED])).toMatchObject({ status: 'locked', label: 'Terkunci', tone: 'mist' });
  });

  it('addonOrderBadge: lunas yang dicabut = Dinonaktifkan', () => {
    expect(addonOrderBadge(PAID)).toEqual({ label: 'Lunas', tone: 'mint' });
    expect(addonOrderBadge(REVOKED)).toEqual({ label: 'Dinonaktifkan', tone: 'warning' });
    expect(addonOrderBadge(PENDING)).toEqual({ label: 'Menunggu Pembayaran', tone: 'warning' });
    expect(addonOrderBadge(CANCELLED)).toEqual({ label: 'Dibatalkan', tone: 'mist' });
  });
});

describe('AddonOrderHistory', () => {
  it('kosong', () => {
    render(<AddonOrderHistory orders={[]} />);
    expect(screen.getByText('Belum ada tagihan fitur tambahan.')).toBeInTheDocument();
  });

  it('tagihan dibeli (nota), hadiah tim, dicabut, dibatalkan, dan menunggu (ditinjau bank)', () => {
    render(<AddonOrderHistory orders={[GRANT, { ...PENDING, payment_status: 'capture' }, REVOKED, CANCELLED]} />);
    const [grant, pending, revoked, cancelled] = screen.getAllByRole('listitem');

    expect(grant).toHaveTextContent('GNF-20261027-ADM001');
    expect(grant).toHaveTextContent('Gratis · Berita & Pengumuman');
    expect(grant).toHaveTextContent('Diaktifkan gratis oleh tim');
    expect(within(grant).getByText('Aktif sejak')).toBeInTheDocument();
    expect(within(grant).queryByText('No. nota')).not.toBeInTheDocument();

    expect(within(pending).getByText('Menunggu Pembayaran')).toBeInTheDocument();
    expect(within(pending).getByText('Ditinjau bank')).toBeInTheDocument();

    expect(within(revoked).getByText('Dinonaktifkan', { selector: 'span' })).toBeInTheDocument();
    expect(revoked).toHaveTextContent('Rp 350.000 · Berita & Pengumuman');
    expect(within(revoked).getByText('Dibayar').nextElementSibling).toHaveTextContent('QRIS');
    expect(within(revoked).getByText('No. nota').nextElementSibling).toHaveTextContent('INV-GNF-20261020-ABC123');
    expect(within(revoked).getByText('Dinonaktifkan', { selector: 'dt' })).toBeInTheDocument();

    expect(within(cancelled).getByText('Dibatalkan', { selector: 'span' })).toBeInTheDocument();
    expect(within(cancelled).getByText('Dibatalkan', { selector: 'dt' })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */

describe('Order Masuk: bagian Fitur tambahan', () => {
  it('backend tanpa `addons` atau template tidak mampu: bagian disembunyikan', async () => {
    const { dialog } = await openOrder({ order: makeOrder(), detail: {} });
    expect(within(dialog).queryByRole('heading', { name: 'Fitur tambahan' })).not.toBeInTheDocument();
    cleanup();

    const other = await openOrder({
      order: makeOrder({ template_code: 'finova', template_name: 'Finova' }),
      detail: { addons: [addonState({ capable: false })], addon_orders: [] },
    });
    expect(within(other.dialog).queryByRole('heading', { name: 'Fitur tambahan' })).not.toBeInTheDocument();
  });

  it('terkunci → Aktifkan gratis (konfirmasi + catatan) → POST admin_set_site_addon, keadaan dari respons, riwayat dimuat ulang', async () => {
    let granted = false;
    const { dialog, posts, reads } = await openOrder({
      order: makeOrder(),
      detail: () => (granted ? { addons: [addonState({ active: true, activated_at: GRANT.paid_at, source: 'admin', purchase: GRANT })], addon_orders: [GRANT, CANCELLED] } : { addons: [addonState()], addon_orders: [CANCELLED] }),
      onSet: () => {
        granted = true;
        return { status: 200, body: { addons: [addonState({ active: true, activated_at: GRANT.paid_at, source: 'admin', purchase: GRANT })] } };
      },
    });
    const section = addonSection(dialog);
    expect(within(section).getByText('Terkunci')).toBeInTheDocument();
    expect(section).toHaveTextContent('Rp 350.000 sekali bayar');
    expect(section).toHaveTextContent('Pembeli bisa membelinya sendiri dari Akun Saya > Fitur tambahan.');
    expect(within(section).getByText('GNF-20261010-BTL001')).toBeInTheDocument(); // riwayat
    expect(within(section).queryByRole('button', { name: 'Nonaktifkan' })).not.toBeInTheDocument();

    fireEvent.click(within(section).getByRole('button', { name: 'Aktifkan gratis' }));
    const confirm = await screen.findByRole('dialog', { name: 'Aktifkan Berita & Pengumuman gratis?' });
    expect(confirm).toHaveTextContent('Fitur langsung aktif di situs smaharapan.sch.id tanpa biaya dan tanpa nota.');
    fireEvent.change(within(confirm).getByLabelText(/Catatan/), { target: { value: '  Kompensasi gangguan.  ' } });
    const readsBefore = reads.filter((a) => a === 'admin_get_template_order').length;
    fireEvent.click(within(confirm).getByRole('button', { name: 'Ya, aktifkan' }));

    await waitFor(() => expect(within(addonSection(dialog)).getByText('Aktif')).toBeInTheDocument());
    expect(posts).toEqual([{ action: 'admin_set_site_addon', site_id: 33, addon: 'posts', active: true, note: 'Kompensasi gangguan.' }]);
    expect(await screen.findByText('Fitur Berita & Pengumuman aktif di smaharapan.sch.id.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Aktifkan Berita/ })).not.toBeInTheDocument());

    const after = addonSection(dialog);
    expect(after).toHaveTextContent('Diaktifkan gratis oleh tim');
    expect(within(after).getByText('Nomor tagihan').nextElementSibling).toHaveTextContent('GNF-20261027-ADM001');
    expect(within(after).getByText('Harga').nextElementSibling).toHaveTextContent('Gratis');
    expect(within(after).getByRole('button', { name: 'Nonaktifkan' })).toBeInTheDocument();
    // Riwayat tagihan & log dimuat ulang
    await waitFor(() => expect(reads.filter((a) => a === 'admin_get_template_order').length).toBeGreaterThan(readsBefore));
    expect(await within(addonSection(dialog)).findAllByText('GNF-20261027-ADM001')).toHaveLength(2);
  });

  it('aktif (dibeli): rincian + Nonaktifkan dengan peringatan refund manual; error server tampil di dialog', async () => {
    const { dialog, posts } = await openOrder({
      order: makeOrder(),
      detail: { addons: [ACTIVE], addon_orders: [PAID] },
      onSet: () => ({ status: 403, body: { error: 'Fitur ini hanya untuk template sekolah.', code: 'ADDON_UNAVAILABLE' } }),
    });
    const section = addonSection(dialog);
    const card = within(section).getAllByRole('listitem')[0];
    expect(within(card).getByText('Aktif')).toBeInTheDocument();
    expect(within(card).getByText('Aktif sejak').nextElementSibling).toHaveTextContent('20 Okt 2026');
    expect(within(card).getByText('Sumber').nextElementSibling).toHaveTextContent('Dibeli pembeli');
    expect(within(card).getByText('Nomor tagihan').nextElementSibling).toHaveTextContent('GNF-20261020-ABC123');
    expect(within(card).getByText('No. nota').nextElementSibling).toHaveTextContent('INV-GNF-20261020-ABC123');
    expect(within(card).getByText('Harga').nextElementSibling).toHaveTextContent('Rp 350.000');

    fireEvent.click(within(section).getByRole('button', { name: 'Nonaktifkan' }));
    const confirm = await screen.findByRole('dialog', { name: 'Nonaktifkan Berita & Pengumuman?' });
    expect(confirm).toHaveTextContent('Tulisan yang sudah ada tidak dihapus.');
    expect(confirm).toHaveTextContent('Tidak ada pengembalian dana otomatis');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Ya, nonaktifkan' }));

    expect(await within(confirm).findByText('Fitur ini hanya untuk template sekolah.')).toBeInTheDocument();
    expect(posts).toEqual([{ action: 'admin_set_site_addon', site_id: 33, addon: 'posts', active: false }]);
    expect(screen.getByRole('dialog', { name: 'Nonaktifkan Berita & Pengumuman?' })).toBeInTheDocument();
    expect(within(addonSection(dialog)).getByText('Aktif')).toBeInTheDocument();
  });

  it('catatan terlalu panjang dari server tampil di isian catatan', async () => {
    const { dialog } = await openOrder({
      order: makeOrder(),
      detail: { addons: [addonState({ active: true, activated_at: '2026-10-26 08:00:00', source: 'migrasi', purchase: addonOrder({ addon_number: 'GNF-MIGRASI-33', price: 0, source: 'migrasi', invoice_number: null }) })], addon_orders: [] },
      onSet: () => ({ status: 400, body: { error: 'Periksa kembali isian Anda.', code: 'VALIDATION', errors: { note: 'Catatan maksimal 255 karakter.' } } }),
    });
    const section = addonSection(dialog);
    expect(section).toHaveTextContent('Migrasi (sudah memakai berita sebelum fitur berbayar)');
    expect(within(section).getByText('Belum ada tagihan fitur tambahan.')).toBeInTheDocument();

    fireEvent.click(within(section).getByRole('button', { name: 'Nonaktifkan' }));
    const confirm = await screen.findByRole('dialog', { name: 'Nonaktifkan Berita & Pengumuman?' });
    // Hadiah migrasi: tanpa kalimat refund
    expect(confirm).not.toHaveTextContent('pengembalian dana');
    fireEvent.change(within(confirm).getByLabelText(/Catatan/), { target: { value: 'Situs pindah ke template lain.' } });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Ya, nonaktifkan' }));
    expect(await within(confirm).findByText('Catatan maksimal 255 karakter.')).toBeInTheDocument();
  });

  it('menunggu pembayaran: tagihan berjalan tampil, Aktifkan gratis menyebut tagihan yang dibatalkan', async () => {
    const { dialog } = await openOrder({
      order: makeOrder(),
      detail: { addons: [addonState({ pending: PENDING })], addon_orders: [PENDING] },
    });
    const section = addonSection(dialog);
    const card = within(section).getAllByRole('listitem')[0];
    // Status fitur + status pembayaran Midtrans (pending)
    expect(within(card).getAllByText('Menunggu pembayaran')).toHaveLength(2);
    expect(within(card).getByText('Tagihan menunggu').nextElementSibling).toHaveTextContent('GNF-20261025-PND001');

    fireEvent.click(within(section).getByRole('button', { name: 'Aktifkan gratis' }));
    const confirm = await screen.findByRole('dialog', { name: 'Aktifkan Berita & Pengumuman gratis?' });
    expect(confirm).toHaveTextContent('Tagihan GNF-20261025-PND001 yang menunggu pembayaran dibatalkan.');
  });

  it('staf bukan admin: keadaan & riwayat tampil, tanpa Aktifkan gratis / Nonaktifkan (backend menolak 403)', async () => {
    role.current = 'user';
    const { dialog, posts } = await openOrder({ order: makeOrder(), detail: { addons: [ACTIVE], addon_orders: [PAID] } });
    const section = addonSection(dialog);
    expect(within(section).getByText('Aktif')).toBeInTheDocument();
    expect(within(section).getAllByText('GNF-20261020-ABC123').length).toBeGreaterThan(0);
    expect(within(section).queryByRole('button', { name: 'Nonaktifkan' })).not.toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Aktifkan gratis' })).not.toBeInTheDocument();
    expect(section).toHaveTextContent('Hanya admin yang bisa mengaktifkan atau menonaktifkan fitur.');
    cleanup();

    const locked = await openOrder({ order: makeOrder(), detail: { addons: [addonState()], addon_orders: [] } });
    const lockedSection = addonSection(locked.dialog);
    expect(within(lockedSection).getByText('Terkunci')).toBeInTheDocument();
    expect(within(lockedSection).queryByRole('button', { name: 'Aktifkan gratis' })).not.toBeInTheDocument();
    expect(lockedSection).toHaveTextContent('Hanya admin yang bisa mengaktifkan atau menonaktifkan fitur.');
    expect([...posts, ...locked.posts]).toEqual([]);
  });

  it('dinonaktifkan tim: tanggal & nomor tagihan yang dicabut', async () => {
    const { dialog } = await openOrder({ order: makeOrder(), detail: { addons: [addonState()], addon_orders: [REVOKED] } });
    const card = within(addonSection(dialog)).getAllByRole('listitem')[0];
    expect(within(card).getByText('Dinonaktifkan', { selector: 'span' })).toBeInTheDocument();
    expect(within(card).getByText('Dinonaktifkan pada').nextElementSibling).toHaveTextContent('26 Okt 2026');
    expect(within(card).getByText('Nomor tagihan').nextElementSibling).toHaveTextContent('GNF-20261020-ABC123');
    expect(within(card).getByRole('button', { name: 'Aktifkan gratis' })).toBeInTheDocument();
  });
});

describe('Template Aktif: Detail pesanan', () => {
  it('membuka drawer Order Masuk pesanan induk', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ sites: [makeSite()] }), { status: 200 }))),
    );
    render(
      <MemoryRouter>
        <TemplateAktif />
      </MemoryRouter>,
    );
    const link = await screen.findByRole('link', { name: 'Detail pesanan GN-20261001-SKL001' });
    expect(link).toHaveAttribute('href', '/admin/pesanan-template?order=7');
  });
});
