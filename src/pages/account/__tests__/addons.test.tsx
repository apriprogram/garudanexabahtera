// @vitest-environment jsdom
// Fitur tambahan berbayar Berita & Pengumuman di panel akun (docs/platform/SITE-ADDONS-SPEC.md §4–5): halaman
// /akun/fitur (terkunci → beli, menunggu → bayar/simulasi/batal, ditinjau bank, aktif, kembali dari Midtrans GNF-…,
// ?situs= fokus), panel terkunci di halaman berita & editor tulisan, pil SiteNav bergembok, ajakan di editor konten,
// nota fitur (daftar & halaman GNF-…), dan kalimat riwayat pesanan.
// Jalankan: npx vitest run src/pages/account/__tests__/addons.test.tsx
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Block, DocModel, TextRun } from '../../../features/project-docs/engine';
import type { CustomerInvoiceItem, OrderLog } from '../../../types/platform';
import type { SiteAddonOrder, SiteAddonsResponse, SiteAddonSite, SiteAddonState } from '../../../types/siteAddons';

// Pindah ke Midtrans = window.location.assign (tidak ada di jsdom): ditiru
const { goToPaymentMock } = vi.hoisted(() => ({ goToPaymentMock: vi.fn() }));
vi.mock('../components/payment', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../components/payment')>()),
  goToPayment: goToPaymentMock,
}));

// Pratinjau A4 nota diganti daftar judul blok (tata letak kertas dites di engine-preview.test)
vi.mock('../../../features/project-docs/engine', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../features/project-docs/engine')>()),
  exportPdf: vi.fn(),
  DocumentPreview: ({ model }: { model: DocModel }) => (
    <div data-testid="preview">
      {model.blocks.map((b, i) => (b.type === 'heading' ? <p key={i}>{b.text}</p> : null))}
    </div>
  ),
}));

import AccountAddons from '../AccountAddons';
import AccountInvoice from '../AccountInvoice';
import AccountInvoices from '../AccountInvoices';
import SiteEditor from '../SiteEditor';
import { addonPostsPrice } from '../../../hooks/useSiteSettings';
import { addonInvoicePath, addonNumberFromReturn, addonsPath, isAddonNumber, postsLocked } from '../components/addons';
import { invoicePath } from '../components/invoiceList';
import { buildInvoiceModel } from '../components/invoiceModel';
import { customerHistoryEntry } from '../components/orderCopy';
import { SiteNav } from '../components/SiteNav';
import SitePostEditor from '../posts/SitePostEditor';
import SitePostsPage from '../posts/SitePostsPage';
import { company, makeOrder } from './invoiceFixtures';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Token berformat JWT yang cukup untuk dibaca src/lib/auth.ts (klaim role & exp). */
const tokenFor = (role: string) => `h.${btoa(JSON.stringify({ sub: 7, role, exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`;

const NOW = new Date(2026, 9, 27, 10, 0, 0); // 27 Okt 2026 10.00 waktu lokal
const ORDER_NO = 'GN-20261020-ABC123';
const ADDON_NO = 'GNF-20261027-AB12CD';
const SITE_ID = 33;
const DOMAIN = 'alfikrischool.sch.id';
const SNAP_URL = 'https://app.sandbox.midtrans.com/snap/v4/redirection/xyz';

const makeAddonOrder = (overrides: Partial<SiteAddonOrder> = {}): SiteAddonOrder => ({
  addon_number: ADDON_NO,
  site_id: SITE_ID,
  order_number: ORDER_NO,
  addon_code: 'posts',
  price: 350_000,
  status: 'menunggu_pembayaran',
  status_label: 'Menunggu Pembayaran',
  source: 'beli',
  payment_status: 'pending',
  payment_type: null,
  payment_url: null,
  paid_at: null,
  cancelled_at: null,
  revoked_at: null,
  created_at: '2026-10-27 09:00:00',
  invoice_number: null,
  ...overrides,
});

const paidAddonOrder = (overrides: Partial<SiteAddonOrder> = {}) =>
  makeAddonOrder({
    status: 'lunas',
    status_label: 'Lunas',
    payment_status: 'settlement',
    payment_type: 'qris',
    paid_at: '2026-10-27 09:05:00',
    invoice_number: `INV-${ADDON_NO}`,
    ...overrides,
  });

const postsState = (overrides: Partial<SiteAddonState> = {}): SiteAddonState => ({
  code: 'posts',
  name: 'Berita & Pengumuman',
  price: 350_000,
  capable: true,
  active: false,
  activated_at: null,
  source: null,
  purchase: null,
  pending: null,
  ...overrides,
});

const activeState = (overrides: Partial<SiteAddonState> = {}) =>
  postsState({ active: true, activated_at: '2026-10-27 09:05:00', source: 'beli', purchase: paidAddonOrder(), ...overrides });

const makeSite = (addon: Partial<SiteAddonState> = {}, overrides: Partial<SiteAddonSite> = {}): SiteAddonSite => ({
  site_id: SITE_ID,
  domain: DOMAIN,
  template_code: 'madani',
  template_name: 'Madani',
  order_number: ORDER_NO,
  site_status: 'active',
  addons: [postsState(addon)],
  ...overrides,
});

/** Situs template lain (tidak mampu): tidak tampil di halaman Fitur tambahan. */
const otherSite = makeSite({ capable: false }, { site_id: 31, domain: 'toko-budi.com', template_code: 'startup-clean', template_name: 'Startup Clean', order_number: 'GN-2' });

let api: Record<string, (body: Record<string, unknown>) => Response>;
let calls: { action: string; body: Record<string, unknown> }[];
/** Jawaban customer_get_site_addons berikutnya (diubah tes untuk mensimulasikan perubahan di server). */
let addons: SiteAddonsResponse;
let simulator: boolean;

const setSites = (...sites: SiteAddonSite[]) => {
  addons = { sites, price: { posts: 350_000 } };
};

beforeEach(() => {
  // Jam palsu yang tetap berjalan (findBy* tetap bekerja), dimulai dari NOW
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  calls = [];
  simulator = false;
  setSites(makeSite(), otherSite);
  api = {
    get_settings: () => json(200, { footer_whatsapp: '0812-1111-2222', addon_posts_price: '400000' }),
    get_payment_config: () => json(200, { simulator }),
    customer_get_site_addons: () => json(200, addons),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const action = url.searchParams.get('action') ?? '';
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : Object.fromEntries(url.searchParams);
      delete body.action; // isi permintaan saja (apiPost juga mengirim nama aksi di body)
      calls.push({ action, body });
      return api[action] ? api[action](body) : json(404, { error: 'tidak ada' });
    }),
  );
  localStorage.setItem('authToken', tokenFor('customer'));
  localStorage.setItem('currentUser', JSON.stringify({ id: 7, name: 'Budi Santoso', email: 'budi@example.com', role: 'customer' }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  goToPaymentMock.mockReset();
  localStorage.clear();
});

const callsOf = (action: string) => calls.filter((c) => c.action === action);

// Render pertama memuat semua definisi template (±4 detik di drive ini): batas waktu tes & pencarian dilonggarkan
const UI_SUITE = { timeout: 30_000 };
const LONG = { timeout: 8000 };

const renderAddons = (path = '/akun/fitur') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/akun/fitur" element={<AccountAddons />} />
        <Route path="/akun/situs/:siteId/berita" element={<p>Halaman berita</p>} />
      </Routes>
    </MemoryRouter>,
  );

const findRow = (domain = DOMAIN) => screen.findByRole('article', { name: domain }, LONG);

/* ─────────────────────────── Helper murni ─────────────────────────── */

describe('helper fitur tambahan', () => {
  it('nomor tagihan dari order_id Midtrans; bukan GNF- → null', () => {
    expect(addonNumberFromReturn(`${ADDON_NO}-2`)).toBe(ADDON_NO);
    expect(addonNumberFromReturn(ADDON_NO.toLowerCase())).toBe(ADDON_NO);
    expect(addonNumberFromReturn(ADDON_NO)).toBe(ADDON_NO);
    expect(addonNumberFromReturn('GNR-20261025-XY34ZW-1')).toBeNull();
    expect(addonNumberFromReturn(`${ORDER_NO}-1`)).toBeNull();
    expect(addonNumberFromReturn('GNF-x y')).toBeNull();
    expect(addonNumberFromReturn(null)).toBeNull();
    expect(isAddonNumber(ADDON_NO)).toBe(true);
    expect(isAddonNumber('gnf-1')).toBe(true);
    expect(isAddonNumber('GNR-20261025-XY34ZW')).toBe(false);
    expect(isAddonNumber(undefined)).toBe(false);
  });

  it('alamat menu, nota, dan harga dari setting (aturan sa_price: kosong/0/tidak valid/terlalu besar → bawaan)', () => {
    expect(addonsPath()).toBe('/akun/fitur');
    expect(addonsPath(SITE_ID)).toBe('/akun/fitur?situs=33');
    expect(addonInvoicePath(ORDER_NO, ADDON_NO)).toBe(`/akun/pesanan/${ORDER_NO}/nota/${ADDON_NO}`);
    expect(addonPostsPrice({ addon_posts_price: '400000' })).toBe(400_000);
    expect(addonPostsPrice({ addon_posts_price: '0' })).toBe(350_000);
    expect(addonPostsPrice({ addon_posts_price: 'abc' })).toBe(350_000);
    expect(addonPostsPrice({})).toBe(350_000);
    // Bentuk yang diterima Number() tetapi ditolak backend: harga di panel = harga yang ditagih
    expect(addonPostsPrice({ addon_posts_price: '1e5' })).toBe(350_000);
    expect(addonPostsPrice({ addon_posts_price: '0x61A80' })).toBe(350_000);
    expect(addonPostsPrice({ addon_posts_price: '1e13' })).toBe(350_000);
    expect(addonPostsPrice({ addon_posts_price: '10000000000000' })).toBe(350_000);
  });

  it('postsLocked: template mampu & fitur belum aktif; respons lama tanpa addons tidak dikunci', () => {
    expect(postsLocked({ template_code: 'madani', addons: { posts: false }, posts_capable: true })).toBe(true);
    expect(postsLocked({ template_code: 'madani', addons: { posts: true }, posts_capable: true })).toBe(false);
    expect(postsLocked({ template_code: 'madani', addons: undefined })).toBe(false);
    expect(postsLocked({ template_code: 'corporate-nexa', addons: { posts: false }, posts_capable: false })).toBe(false);
    // posts_capable tidak dikirim: kemampuan dari definisi template
    expect(postsLocked({ template_code: 'madani', addons: { posts: false } })).toBe(true);
  });

  it('riwayat pesanan: catatan tagihan fitur tampil, catatan granted/revoked tidak', () => {
    const log = (event: string, note: string | null): OrderLog => ({
      id: 1,
      event,
      from_status: null,
      to_status: null,
      actor_type: 'customer',
      actor_name: null,
      note,
      created_at: '2026-10-27 09:00:00',
    });
    expect(customerHistoryEntry(log('addon_created', `Fitur Berita & Pengumuman ${ADDON_NO} dibuat.`))).toMatchObject({
      title: 'Tagihan fitur tambahan dibuat',
      text: `Fitur Berita & Pengumuman ${ADDON_NO} dibuat.`,
    });
    expect(customerHistoryEntry(log('addon_paid', 'Lunas.'))).toMatchObject({ title: 'Fitur Berita & Pengumuman aktif', text: 'Lunas.' });
    expect(customerHistoryEntry(log('addon_cancelled', null))).toMatchObject({ title: 'Tagihan fitur tambahan dibatalkan', text: undefined });
    expect(customerHistoryEntry(log('addon_granted', 'Catatan internal staf'))).toMatchObject({ text: 'Diaktifkan gratis oleh tim kami.' });
    expect(customerHistoryEntry(log('addon_revoked', 'Refund manual'))).toMatchObject({
      title: 'Fitur Berita & Pengumuman dinonaktifkan',
      text: 'Dinonaktifkan oleh tim kami.',
    });
  });
});

/* ─────────────────────────── Halaman Fitur tambahan ─────────────────────────── */

describe('halaman /akun/fitur', UI_SUITE, () => {
  it('terkunci: kartu fitur (harga, manfaat, contoh), hanya situs template sekolah, Beli & aktifkan → Midtrans', async () => {
    api.customer_buy_site_addon = (body) => {
      setSites(makeSite({ pending: makeAddonOrder({ payment_url: SNAP_URL }) }), otherSite);
      return json(200, { addon_order: makeAddonOrder({ site_id: Number(body.site_id) }), payment_url: SNAP_URL });
    };
    renderAddons();
    const row = await findRow();
    expect(screen.getByRole('heading', { level: 1, name: 'Fitur tambahan' })).toBeInTheDocument();
    expect(document.title).toBe('Fitur tambahan | Garuda Nexa');

    const card = screen.getByRole('region', { name: 'Berita & Pengumuman' });
    expect(card).toHaveTextContent(/Rp\s?350\.000/);
    expect(card).toHaveTextContent('Sekali bayar, aktif selama situs aktif.');
    expect(card).toHaveTextContent('SEO per tulisan');
    expect(within(card).getByRole('link', { name: /Lihat contoh tampilan/ })).toHaveAttribute('href', '/demo/madani?fitur=berita');

    // Situs template lain tidak ditampilkan
    expect(screen.queryByRole('article', { name: 'toko-budi.com' })).not.toBeInTheDocument();
    expect(row).toHaveTextContent('Terkunci');
    expect(row).toHaveTextContent(`Madani · ${ORDER_NO}`);

    fireEvent.click(within(row).getByRole('button', { name: 'Beli & aktifkan' }));
    await waitFor(() => expect(goToPaymentMock).toHaveBeenCalledWith(SNAP_URL));
    expect(callsOf('customer_buy_site_addon')[0].body).toEqual({ site_id: SITE_ID, addon: 'posts' });
  });

  it('Midtrans belum dikonfigurasi: tagihan tetap dibuat, pesan + petunjuk simulator, baris jadi menunggu pembayaran', async () => {
    simulator = true;
    api.customer_buy_site_addon = () => {
      setSites(makeSite({ pending: makeAddonOrder() }), otherSite);
      return json(200, { addon_order: makeAddonOrder(), payment_url: null, payment_error: 'Pembayaran online belum dikonfigurasi.' });
    };
    renderAddons();
    const row = await findRow();
    fireEvent.click(within(row).getByRole('button', { name: 'Beli & aktifkan' }));

    await waitFor(() => expect(row).toHaveTextContent('Menunggu pembayaran'));
    expect(row).toHaveTextContent(`Tagihan ${ADDON_NO} dibuat, tetapi halaman pembayaran belum bisa dibuka: Pembayaran online belum dikonfigurasi.`);
    expect(row).toHaveTextContent('Untuk pengujian, gunakan tombol "Simulasikan pembayaran (mode uji)".');
    expect(goToPaymentMock).not.toHaveBeenCalled();
    // Tombol Beli hilang: fokus ke baris, bukan <body>
    await waitFor(() => expect(document.activeElement).toBe(row));
  });

  it('tagihan sudah ada (ADDON_PENDING): pesan server, daftar dimuat ulang', async () => {
    api.customer_buy_site_addon = () => {
      setSites(makeSite({ pending: makeAddonOrder() }), otherSite);
      return json(409, {
        error: 'Masih ada tagihan fitur ini yang menunggu pembayaran. Bayar atau batalkan dulu.',
        code: 'ADDON_PENDING',
      });
    };
    renderAddons();
    const row = await findRow();
    fireEvent.click(within(row).getByRole('button', { name: 'Beli & aktifkan' }));
    expect(await within(row).findByText('Masih ada tagihan fitur ini yang menunggu pembayaran. Bayar atau batalkan dulu.')).toBeInTheDocument();
    await waitFor(() => expect(within(row).getByRole('button', { name: 'Bayar Sekarang' })).toBeInTheDocument());
    expect(callsOf('customer_get_site_addons')).toHaveLength(2);
  });

  it('menunggu pembayaran: Bayar Sekarang → link baru Midtrans; tanpa simulator tidak ada tombol simulasi', async () => {
    setSites(makeSite({ pending: makeAddonOrder() }));
    api.customer_pay_site_addon = () => json(200, { payment_url: SNAP_URL });
    renderAddons();
    const row = await findRow();
    expect(row).toHaveTextContent('Menunggu pembayaran');
    expect(row).toHaveTextContent(`Tagihan ${ADDON_NO}`);
    expect(row).toHaveTextContent(/Rp\s?350\.000/);
    expect(within(row).queryByRole('button', { name: /Simulasikan/ })).not.toBeInTheDocument();

    fireEvent.click(within(row).getByRole('button', { name: 'Bayar Sekarang' }));
    await waitFor(() => expect(goToPaymentMock).toHaveBeenCalledWith(SNAP_URL));
    expect(callsOf('customer_pay_site_addon')[0].body).toEqual({ addon_number: ADDON_NO });
  });

  it('simulasi (mode uji): fitur aktif, pemberitahuan sukses, Kelola berita & Lihat nota', async () => {
    simulator = true;
    setSites(makeSite({ pending: makeAddonOrder() }));
    api.dev_simulate_site_addon_payment = () => {
      setSites(makeSite(activeState({ activated_at: '2026-10-27 10:00:00', purchase: paidAddonOrder({ payment_status: 'simulated' }) })));
      return json(200, { addon_order: paidAddonOrder(), site: addons.sites[0] });
    };
    renderAddons();
    const row = await findRow();
    fireEvent.click(await within(row).findByRole('button', { name: 'Simulasikan pembayaran (mode uji)' }, LONG));

    expect(await screen.findByText(/Fitur Berita & Pengumuman aktif\./)).toBeInTheDocument();
    await waitFor(() => expect(row).toHaveTextContent('Aktif sejak 27 Oktober 2026.'));
    expect(within(row).getByRole('link', { name: 'Kelola berita' })).toHaveAttribute('href', `/akun/situs/${SITE_ID}/berita`);
    expect(within(row).getByRole('link', { name: 'Lihat nota' })).toHaveAttribute('href', `/akun/pesanan/${ORDER_NO}/nota/${ADDON_NO}`);
    expect(callsOf('dev_simulate_site_addon_payment')[0].body).toEqual({ addon_number: ADDON_NO });
  });

  it('pembayaran kartu ditinjau bank (capture): tanpa Bayar Sekarang, Periksa lagi memuat ulang', async () => {
    setSites(makeSite({ pending: makeAddonOrder({ payment_status: 'capture', payment_type: 'credit_card' }) }));
    renderAddons();
    const row = await findRow();
    expect(row).toHaveTextContent('Ditinjau bank');
    expect(row).toHaveTextContent('Pembayaran sedang ditinjau bank');
    expect(within(row).queryByRole('button', { name: 'Bayar Sekarang' })).not.toBeInTheDocument();

    const before = callsOf('customer_get_site_addons').length;
    fireEvent.click(within(row).getByRole('button', { name: 'Periksa lagi' }));
    await waitFor(() => expect(callsOf('customer_get_site_addons')).toHaveLength(before + 1));
    expect(callsOf('customer_pay_site_addon')).toHaveLength(0);
  });

  it('batalkan: konfirmasi dulu, lalu baris kembali terkunci dengan pesan', async () => {
    setSites(makeSite({ pending: makeAddonOrder() }));
    api.customer_cancel_site_addon = () => {
      setSites(makeSite());
      return json(200, { addon_order: makeAddonOrder({ status: 'dibatalkan', status_label: 'Dibatalkan', cancelled_at: '2026-10-27 10:00:00' }) });
    };
    renderAddons();
    const row = await findRow();
    fireEvent.click(within(row).getByRole('button', { name: 'Batalkan' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Batalkan tagihan fitur?' });
    expect(dialog).toHaveTextContent(ADDON_NO);
    expect(callsOf('customer_cancel_site_addon')).toHaveLength(0);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, batalkan' }));
    await waitFor(() => expect(row).toHaveTextContent('Terkunci'));
    expect(row).toHaveTextContent(`Tagihan ${ADDON_NO} dibatalkan.`);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Beli & aktifkan' })).toBeInTheDocument();
    expect(callsOf('customer_cancel_site_addon')[0].body).toEqual({ addon_number: ADDON_NO });
  });

  it('aktif dari admin/migrasi: catatan sumber, tanpa nota (gratis)', async () => {
    setSites(
      makeSite({ active: true, activated_at: '2026-10-26 08:00:00', source: 'migrasi', purchase: paidAddonOrder({ addon_number: 'GNF-MIGRASI-33', price: 0, invoice_number: null, source: 'migrasi' }) }),
      makeSite(
        { active: true, activated_at: '2026-10-25 08:00:00', source: 'admin', purchase: paidAddonOrder({ price: 0, invoice_number: null, source: 'admin' }) },
        { site_id: 29, domain: 'smkmaarifnu1pbl.id', template_code: 'cakrawala', template_name: 'Cakrawala', order_number: 'GN-3' },
      ),
    );
    renderAddons();
    const migrated = await findRow();
    expect(migrated).toHaveTextContent('Aktif sejak 26 Oktober 2026.');
    expect(migrated).toHaveTextContent('sudah memakai berita sebelum fitur ini berbayar');
    expect(within(migrated).queryByRole('link', { name: 'Lihat nota' })).not.toBeInTheDocument();
    const granted = screen.getByRole('article', { name: 'smkmaarifnu1pbl.id' });
    expect(granted).toHaveTextContent('Diaktifkan gratis oleh tim kami.');
    expect(within(granted).getByRole('link', { name: 'Kelola berita' })).toHaveAttribute('href', '/akun/situs/29/berita');
  });

  it('situs nonaktif: tombol beli dinonaktifkan dengan penjelasan', async () => {
    setSites(makeSite({}, { site_status: 'suspended' }));
    renderAddons();
    const row = await findRow();
    expect(row).toHaveTextContent('Situs ini sedang dinonaktifkan.');
    expect(within(row).getByRole('button', { name: 'Beli & aktifkan' })).toBeDisabled();
  });

  it('tanpa situs template sekolah: keadaan kosong + tautan katalog sekolah', async () => {
    setSites(otherSite);
    renderAddons();
    expect(await screen.findByRole('heading', { name: 'Belum ada situs template sekolah' }, LONG)).toBeInTheDocument();
    expect(screen.getByText(/Fitur Berita & Pengumuman khusus untuk situs dengan template sekolah\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lihat template sekolah/ })).toHaveAttribute('href', '/template/kategori/sekolah-pendidikan');
    // Kartu fitur tetap tampil (harga & contoh)
    expect(screen.getByRole('region', { name: 'Berita & Pengumuman' })).toBeInTheDocument();
  });

  it('?situs=ID: baris situs itu difokuskan', async () => {
    setSites(
      makeSite({}, { site_id: 40, domain: 'sd-bestari.sch.id', template_code: 'bestari', template_name: 'Bestari', order_number: 'GN-4' }),
      makeSite(),
    );
    renderAddons(`/akun/fitur?situs=${SITE_ID}`);
    const row = await findRow();
    expect(row).toHaveAttribute('id', `situs-${SITE_ID}`);
    await waitFor(() => expect(document.activeElement).toBe(row));
    // Garis brand menandai baris yang dituju; baris lain tidak
    expect(row).toHaveClass('ring-primary');
    expect(screen.getByRole('article', { name: 'sd-bestari.sch.id' })).not.toHaveClass('ring-primary');
  });

  it('galat memuat: bisa dicoba lagi', async () => {
    api.customer_get_site_addons = () => json(500, { error: 'Terjadi kesalahan pada server. Silakan coba lagi.' });
    renderAddons();
    expect(await screen.findByRole('heading', { name: 'Fitur tambahan belum bisa dimuat' }, LONG)).toBeInTheDocument();
    api.customer_get_site_addons = () => json(200, addons);
    fireEvent.click(screen.getByRole('button', { name: /Coba lagi/ }));
    expect(await findRow()).toBeInTheDocument();
  });
});

/* ─────────────────────────── Kembali dari Midtrans ─────────────────────────── */

describe('kembali dari pembayaran fitur (order_id GNF-…)', UI_SUITE, () => {
  it('dimuat ulang tiap 10 detik sampai lunas, lalu pemberitahuan berhasil; polling berhenti', async () => {
    setSites(makeSite({ pending: makeAddonOrder() }));
    renderAddons(`/akun/fitur?order_id=${ADDON_NO}-1&transaction_status=settlement`);
    expect(await screen.findByText('Pembayaran sedang dikonfirmasi', undefined, LONG)).toBeInTheDocument();
    expect(callsOf('customer_get_site_addons')).toHaveLength(1);

    await act(() => vi.advanceTimersByTimeAsync(10_000));
    await waitFor(() => expect(callsOf('customer_get_site_addons')).toHaveLength(2));
    expect(screen.getByText('Pembayaran sedang dikonfirmasi')).toBeInTheDocument();

    setSites(makeSite(activeState({ activated_at: '2026-10-27 10:00:20' })));
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(await screen.findByText(/Fitur Berita & Pengumuman aktif\./)).toBeInTheDocument();
    expect(screen.queryByText('Pembayaran sedang dikonfirmasi')).not.toBeInTheDocument();
    expect(await findRow()).toHaveTextContent('Aktif sejak 27 Oktober 2026.');

    const loads = callsOf('customer_get_site_addons').length;
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(callsOf('customer_get_site_addons')).toHaveLength(loads);
  });

  it('sudah lunas saat dimuat: pemberitahuan langsung, tanpa polling', async () => {
    setSites(makeSite(activeState()));
    renderAddons(`/akun/fitur?order_id=${ADDON_NO}-1&transaction_status=settlement`);
    expect(await screen.findByText(/Fitur Berita & Pengumuman aktif\./, undefined, LONG)).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(20_000));
    expect(callsOf('customer_get_site_addons')).toHaveLength(1);
  });

  it('maks. 2 menit: setelah 12 kali muat ulang berhenti dan menawarkan Periksa lagi', async () => {
    setSites(makeSite({ pending: makeAddonOrder() }));
    renderAddons(`/akun/fitur?order_id=${ADDON_NO}-1&transaction_status=pending`);
    expect(await screen.findByText('Menunggu konfirmasi pembayaran', undefined, LONG)).toBeInTheDocument();
    for (let i = 0; i < 12; i += 1) {
      await act(() => vi.advanceTimersByTimeAsync(10_000));
    }
    expect(await screen.findByText('Konfirmasi pembayaran belum kami terima')).toBeInTheDocument();
    expect(callsOf('customer_get_site_addons')).toHaveLength(13);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(callsOf('customer_get_site_addons')).toHaveLength(13);
  });

  it('pembayaran gagal di Midtrans: peringatan, tagihan tetap bisa dibayar ulang, tanpa polling', async () => {
    setSites(makeSite({ pending: makeAddonOrder() }));
    renderAddons(`/akun/fitur?order_id=${ADDON_NO}-1&transaction_status=expire`);
    const row = await findRow();
    const notice = screen.getAllByRole('alert').find((el) => el.textContent?.includes('Pembayaran fitur belum berhasil'));
    expect(notice).toHaveTextContent('Status dari Midtrans: Kedaluwarsa.');
    expect(within(row).getByRole('button', { name: 'Bayar Sekarang' })).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(20_000));
    expect(callsOf('customer_get_site_addons')).toHaveLength(1);
  });
});

/* ─────────────────────────── Berita terkunci & SiteNav ─────────────────────────── */

const panelSite = (addonsFlag: { posts: boolean } | undefined) => ({
  id: 1,
  status: 'active',
  template_code: 'madani',
  content: null,
  order_id: 1,
  order_number: ORDER_NO,
  user_id: 9,
  template_id: 1,
  template_name: 'Madani',
  domain: DOMAIN,
  activated_at: '2026-10-20 10:00:00',
  updated_at: '2026-10-20 10:00:00',
  ...(addonsFlag ? { addons: addonsFlag, posts_capable: true } : {}),
});

const POSTS_LOCKED_BODY = {
  error: 'Fitur Berita & Pengumuman belum aktif untuk situs ini. Aktifkan di menu Fitur tambahan.',
  code: 'POSTS_LOCKED',
};

describe('berita & pengumuman terkunci', UI_SUITE, () => {
  const renderPanel = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/akun/situs/:siteId/berita" element={<SitePostsPage />} />
          <Route path="/akun/situs/:siteId/berita/:postId" element={<SitePostEditor />} />
        </Routes>
      </MemoryRouter>,
    );

  it('daftar: 403 POSTS_LOCKED → panel terkunci (harga, Aktifkan sekarang), tanpa tab & daftar; pil bergembok', async () => {
    api.customer_get_site = () => json(200, { site: panelSite({ posts: false }) });
    api.customer_get_site_posts = () => json(403, POSTS_LOCKED_BODY);
    renderPanel('/akun/situs/1/berita');

    expect(await screen.findByRole('heading', { name: 'Fitur Berita & Pengumuman belum aktif' }, LONG)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Aktifkan sekarang' })).toHaveAttribute('href', '/akun/fitur?situs=1');
    expect(await screen.findByText(/Rp\s?400\.000/)).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Tulis berita/ })).not.toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Menu situs' });
    expect(within(nav).getByRole('link', { name: 'Berita & Pengumuman (terkunci)' })).toHaveAttribute('aria-current', 'page');
  });

  it('daftar: server lama tanpa flag addons tetapi menjawab POSTS_LOCKED → tetap terkunci', async () => {
    api.customer_get_site = () => json(200, { site: panelSite(undefined) });
    api.customer_get_site_posts = () => json(403, POSTS_LOCKED_BODY);
    renderPanel('/akun/situs/1/berita');
    expect(await screen.findByRole('heading', { name: 'Fitur Berita & Pengumuman belum aktif' }, LONG)).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Menu situs' })).getByRole('link', { name: 'Berita & Pengumuman (terkunci)' })).toBeInTheDocument();
  });

  it('editor tulisan baru: situs berflag terkunci → panel terkunci, tanpa form', async () => {
    api.customer_get_site = () => json(200, { site: panelSite({ posts: false }) });
    api.customer_get_site_posts = () => json(403, POSTS_LOCKED_BODY);
    renderPanel('/akun/situs/1/berita/baru');
    expect(await screen.findByRole('heading', { name: 'Fitur Berita & Pengumuman belum aktif' }, LONG)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Aktifkan sekarang' })).toHaveAttribute('href', '/akun/fitur?situs=1');
  });

  it('fitur aktif: daftar tampil seperti biasa, pil tanpa gembok', async () => {
    api.customer_get_site = () => json(200, { site: panelSite({ posts: true }) });
    api.customer_get_site_posts = () => json(200, { posts: [], limits: { max_posts: 100 } });
    renderPanel('/akun/situs/1/berita');
    expect(await screen.findByRole('tablist', { name: 'Jenis tulisan' }, LONG)).toBeInTheDocument();
    expect(screen.queryByText('Fitur Berita & Pengumuman belum aktif')).not.toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Menu situs' })).getByRole('link', { name: 'Berita & Pengumuman' })).toBeInTheDocument();
  });
});

describe('SiteNav', () => {
  const renderNav = (locked: boolean) =>
    render(
      <MemoryRouter initialEntries={['/akun/situs/5']}>
        <SiteNav siteId={5} posts postsLocked={locked} />
      </MemoryRouter>,
    );

  it('terkunci: ikon gembok + teks sr "(terkunci)"; aktif: nama biasa', () => {
    renderNav(true);
    const pill = screen.getByRole('link', { name: 'Berita & Pengumuman (terkunci)' });
    expect(pill).toHaveAttribute('href', '/akun/situs/5/berita');
    expect(within(pill).getByText('(terkunci)')).toHaveClass('sr-only');
    cleanup();

    renderNav(false);
    expect(screen.getByRole('link', { name: 'Berita & Pengumuman' })).toBeInTheDocument();
    expect(screen.queryByText('(terkunci)')).not.toBeInTheDocument();
  });
});

describe('editor konten (SiteEditor)', UI_SUITE, () => {
  const renderEditor = () =>
    render(
      <MemoryRouter initialEntries={['/akun/situs/1']}>
        <Routes>
          <Route path="/akun/situs/:siteId" element={<SiteEditor />} />
        </Routes>
      </MemoryRouter>,
    );

  const openAnnouncements = async () => {
    await screen.findByRole('heading', { name: 'Kelola konten situs' }, LONG);
    const section = document.querySelector<HTMLElement>('[data-cms-section="announcements"]')!;
    fireEvent.click(within(section).getByRole('button', { name: /^Pengumuman/ }));
    return section;
  };

  /** Section berita di "Pratinjau langsung" setelah template selesai dimuat. */
  const previewNews = async () => {
    const preview = screen.getByRole('region', { name: 'Pratinjau situs' });
    await waitFor(() => expect(preview.querySelector('[data-tpl-section="news"]')).not.toBeNull(), LONG);
    return preview.querySelector<HTMLElement>('[data-tpl-section="news"]')!;
  };

  it('fitur belum aktif: ajakan mengaktifkan + pil bergembok', async () => {
    api.customer_get_site = () => json(200, { success: true, site: panelSite({ posts: false }) });
    renderEditor();
    const section = await openAnnouncements();
    expect(section).toHaveTextContent(
      'Pengumuman di bawah ini tampil sebagai pengumuman biasa. Aktifkan fitur Berita & Pengumuman untuk halaman pengumuman sendiri dan tampilan profesional.',
    );
    expect(within(section).getByRole('link', { name: 'Aktifkan fitur Berita & Pengumuman' })).toHaveAttribute('href', '/akun/fitur?situs=1');
    expect(within(section).queryByText(/Kelola pengumuman lengkap/)).not.toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Menu situs' })).getByRole('link', { name: 'Berita & Pengumuman (terkunci)' })).toBeInTheDocument();
    // Pratinjau langsung = situs live tanpa fitur: berita biasa
    expect((await previewNews()).hasAttribute('data-pro-section')).toBe(false);
  });

  it('fitur aktif: pemberitahuan kelola lengkap di menu Berita & Pengumuman', async () => {
    api.customer_get_site = () => json(200, { success: true, site: panelSite({ posts: true }) });
    renderEditor();
    const section = await openAnnouncements();
    expect(within(section).getByText(/Kelola pengumuman lengkap/)).toBeInTheDocument();
    expect(within(section).queryByRole('link', { name: /Aktifkan fitur/ })).not.toBeInTheDocument();
    // Pratinjau langsung = situs live berfitur: section berita & pengumuman profesional
    expect(await previewNews()).toHaveAttribute('data-pro-section', 'news');
    const preview = screen.getByRole('region', { name: 'Pratinjau situs' });
    expect(preview.querySelector('[data-pro-section="announcements"]')).not.toBeNull();
    // Dibangun dari item CMS yang sedang diedit: tanpa permintaan tulisan/kunjungan dan tanpa tautan ke halaman tulisan
    expect(callsOf('get_site_posts')).toHaveLength(0);
    expect(callsOf('site_visit')).toHaveLength(0);
    expect(within(preview).queryByRole('link', { name: /Lihat semua (berita|pengumuman)/ })).not.toBeInTheDocument();
    expect(preview.querySelector('a[href*="/berita"], a[href*="/pengumuman"]')).toBeNull();
  });
});

/* ─────────────────────────── Nota fitur ─────────────────────────── */

const text = (runs: TextRun[]) => runs.map((r) => r.text).join('');
const tableRows = (model: DocModel) =>
  model.blocks.find((b): b is Extract<Block, { type: 'table' }> => b.type === 'table')?.rows.map((row) => row.map(text)) ?? [];
const keyValues = (model: DocModel) =>
  Object.fromEntries(model.blocks.flatMap((b) => (b.type === 'keyValue' ? b.rows.map((r) => [r.label, text(r.value)]) : [])));

describe('nota fitur tambahan', UI_SUITE, () => {
  const INVOICE_ORDER = 'GN-20261023-DCZ03O';
  const invoiceAddon = (overrides: Partial<SiteAddonOrder> = {}) => paidAddonOrder({ order_number: INVOICE_ORDER, ...overrides });

  it('model nota: satu baris "Fitur Berita & Pengumuman (domain)", nomor INV-GNF-…, status fitur', () => {
    const model = buildInvoiceModel({ order: makeOrder(), addon: invoiceAddon(), company });
    expect(model.meta).toMatchObject({ number: `INV-${ADDON_NO}`, title: 'NOTA FITUR TAMBAHAN', date: '2026-10-27' });
    expect(tableRows(model)).toEqual([
      ['Fitur Berita & Pengumuman (sarimakmur.com)', 'Rp350.000'],
      ['Total', 'Rp350.000'],
    ]);
    expect(keyValues(model)).toMatchObject({
      'No. nota': `INV-${ADDON_NO}`,
      'No. pesanan': INVOICE_ORDER,
      'No. tagihan fitur': ADDON_NO,
      'Status pembayaran': 'LUNAS',
      Metode: 'QRIS',
      Fitur: 'Berita & Pengumuman',
      'Status fitur': 'Aktif',
    });
    expect(keyValues(model)).not.toHaveProperty('No. perpanjangan');

    const revoked = keyValues(buildInvoiceModel({ order: makeOrder(), addon: invoiceAddon({ revoked_at: '2026-11-01 10:00:00' }), company }));
    expect(revoked['Status pembayaran']).toBe('LUNAS');
    expect(revoked['Status fitur']).toBe('Dinonaktifkan sejak 1 November 2026');
  });

  const renderInvoice = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/akun/pesanan/:orderNumber/nota" element={<AccountInvoice />} />
          <Route path="/akun/pesanan/:orderNumber/nota/:docNumber" element={<AccountInvoice />} />
        </Routes>
      </MemoryRouter>,
    );

  it('halaman nota GNF-: mengirim addon_number, judul & status; dicabut admin → "Dinonaktifkan"', async () => {
    api.customer_get_invoice = () => json(200, { order: makeOrder(), addon: invoiceAddon(), company });
    renderInvoice(`/akun/pesanan/${INVOICE_ORDER}/nota/${ADDON_NO}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Nota fitur tambahan' }, LONG)).toBeInTheDocument();
    expect(screen.getByText(`INV-${ADDON_NO}`)).toBeInTheDocument();
    expect(screen.getByText('Lunas')).toBeInTheDocument();
    expect(screen.getByTestId('preview')).toHaveTextContent('NOTA FITUR TAMBAHAN');
    expect(callsOf('customer_get_invoice')[0].body).toEqual({ order_number: INVOICE_ORDER, addon_number: ADDON_NO });
    cleanup();

    api.customer_get_invoice = () => json(200, { order: makeOrder(), addon: invoiceAddon({ revoked_at: '2026-11-01 10:00:00' }), company });
    renderInvoice(`/akun/pesanan/${INVOICE_ORDER}/nota/${ADDON_NO}`);
    expect(await screen.findByText('Dinonaktifkan', undefined, LONG)).toBeInTheDocument();
    expect(screen.getByText(/Fitur ini dinonaktifkan oleh tim kami pada 1 November 2026/)).toBeInTheDocument();
  });

  it('halaman nota GNF- tidak ada: pesan tagihan fitur tidak ditemukan; GNR- tetap nomor perpanjangan', async () => {
    api.customer_get_invoice = () => json(404, { error: 'Tagihan fitur tidak ditemukan.', code: 'ADDON_NOT_FOUND' });
    renderInvoice(`/akun/pesanan/${INVOICE_ORDER}/nota/GNF-20990101-XXXXXX`);
    expect(await screen.findByRole('heading', { name: 'Nota tidak ditemukan' }, LONG)).toBeInTheDocument();
    expect(screen.getByText(`Tagihan fitur tambahan GNF-20990101-XXXXXX tidak ada di pesanan ${INVOICE_ORDER}.`)).toBeInTheDocument();
    cleanup();

    api.customer_get_invoice = () => json(404, { error: 'Tagihan perpanjangan tidak ditemukan.', code: 'RENEWAL_NOT_FOUND' });
    renderInvoice(`/akun/pesanan/${INVOICE_ORDER}/nota/GNR-20990101-XXXXXX`);
    expect(await screen.findByText(/Tagihan perpanjangan GNR-20990101-XXXXXX tidak ada/, undefined, LONG)).toBeInTheDocument();
    expect(callsOf('customer_get_invoice').at(-1)?.body).toEqual({ order_number: INVOICE_ORDER, renewal_number: 'GNR-20990101-XXXXXX' });
  });

  it('menu Nota: item fitur dengan judulnya sendiri dan tautan ke nota GNF-', async () => {
    const fitur: CustomerInvoiceItem = {
      type: 'fitur',
      invoice_number: `INV-${ADDON_NO}`,
      order_number: ORDER_NO,
      renewal_number: null,
      addon_number: ADDON_NO,
      title: 'Fitur Berita & Pengumuman',
      domain: DOMAIN,
      years: null,
      amount: 350_000,
      paid_at: '2026-10-27 09:05:00',
      payment_status: 'settlement',
      payment_type: 'qris',
      order_status: null,
    };
    expect(invoicePath(fitur)).toBe(`/akun/pesanan/${ORDER_NO}/nota/${ADDON_NO}`);
    api.customer_get_invoices = () => json(200, { invoices: [fitur] });
    render(
      <MemoryRouter initialEntries={['/akun/nota']}>
        <AccountInvoices />
      </MemoryRouter>,
    );
    const link = await screen.findByRole('link', { name: 'Fitur Berita & Pengumuman' }, LONG);
    expect(link).toHaveAttribute('href', `/akun/pesanan/${ORDER_NO}/nota/${ADDON_NO}`);
    const row = link.closest('article')!;
    expect(row).toHaveTextContent(`INV-${ADDON_NO} · ${DOMAIN}`);
    expect(row).toHaveTextContent('Lunas');
    expect(row).toHaveTextContent(/Rp\s?350\.000/);
  });
});
