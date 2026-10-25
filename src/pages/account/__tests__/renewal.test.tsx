// @vitest-environment jsdom
// Masa aktif & perpanjangan di akun pembeli: kartu masa aktif (hitung mundur, progres, peringatan), dialog perpanjangan
// (pilihan, buat tagihan, ke Midtrans vs simulator), blok tagihan menunggu pembayaran, kembali dari Midtrans (GNR-…),
// riwayat, nota, dan baris masa aktif di dashboard. Kontrak: docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md.
// Jalankan: npx vitest run src/pages/account/__tests__/renewal.test.tsx
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order, OrderLog, Renewal, RenewalOffer } from '../../../types/platform';
import AccountHome from '../AccountHome';
import AccountOrderDetail from '../AccountOrderDetail';
import { customerHistoryEntry } from '../components/orderCopy';
import {
  activePeriodPath,
  hasOrderInvoice,
  orderInvoicePath,
  pendingRenewal,
  renewalBreakdown,
  renewalInvoicePath,
  renewalNumberFromReturn,
} from '../components/renewal';

// Pindah ke Midtrans = window.location.assign (tidak ada di jsdom): ditiru
const { goToPaymentMock } = vi.hoisted(() => ({ goToPaymentMock: vi.fn() }));
vi.mock('../components/payment', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../components/payment')>()),
  goToPayment: goToPaymentMock,
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Token berformat JWT yang cukup untuk dibaca src/lib/auth.ts (klaim role & exp). */
const tokenFor = (role: string) => `h.${btoa(JSON.stringify({ sub: 7, role, exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`;

const NOW = new Date(2026, 9, 25, 10, 0, 0); // 25 Okt 2026 10.00 waktu lokal
const ORDER_NO = 'GN-20261022-AB12CD';
const RENEWAL_NO = 'GNR-20261025-XY34ZW';
const SNAP_URL = 'https://app.sandbox.midtrans.com/snap/v4/redirection/abc';

let seq = 0;
const makeOrder = (overrides: Partial<Order> = {}): Order => {
  seq += 1;
  return {
    id: seq,
    order_number: ORDER_NO,
    template_id: 1,
    template_name: 'Corporate Nexa',
    template_code: 'corporate-nexa',
    template_slug: 'corporate-nexa',
    price: 1_750_000,
    list_price: 1_500_000,
    discount_amount: 0,
    domain_price: 250_000,
    customer_name: 'Budi',
    customer_email: 'budi@example.com',
    customer_phone: '081234567890',
    company_name: null,
    notes: null,
    domain_primary: 'usaha-budi.com',
    domain_alternative: null,
    domain: 'usaha-budi.com',
    status: 'aktif',
    status_label: 'Aktif',
    payment_status: 'settlement',
    payment_type: 'qris',
    payment_url: null,
    paid_at: '2026-10-22 11:00:00',
    approved_at: '2026-10-22 12:00:00',
    rejected_reason: null,
    activated_at: '2026-10-22 13:05:30',
    cancelled_at: null,
    created_at: '2026-10-22 10:00:00',
    updated_at: '2026-10-22 13:05:30',
    site_id: 3,
    invoice_number: `INV-${ORDER_NO}`,
    // Sisa 362 hari 3 jam 5 menit (lebih 30 detik) dari NOW
    service_started_at: '2026-10-22 13:05:30',
    service_expires_at: '2027-10-22 13:05:30',
    domain_started_at: '2026-10-22 13:05:30',
    domain_expires_at: '2027-10-22 13:05:30',
    ...overrides,
  };
};

const makeRenewal = (overrides: Partial<Renewal> = {}): Renewal => ({
  id: 1,
  renewal_number: RENEWAL_NO,
  order_number: ORDER_NO,
  domain: 'usaha-budi.com',
  years: 1,
  hosting_price_per_year: 500_000,
  domain_price_per_year: 250_000,
  price_per_year: 750_000,
  price: 750_000,
  status: 'menunggu_pembayaran',
  status_label: 'Menunggu Pembayaran',
  payment_status: 'pending',
  payment_type: null,
  payment_url: null,
  paid_at: null,
  cancelled_at: null,
  service_expires_before: null,
  service_expires_after: null,
  domain_expires_before: null,
  domain_expires_after: null,
  invoice_number: null,
  created_at: '2026-10-25 09:30:00',
  ...overrides,
});

const paidRenewal = (overrides: Partial<Renewal> = {}) =>
  makeRenewal({
    status: 'lunas',
    status_label: 'Lunas',
    payment_status: 'settlement',
    payment_type: 'qris',
    paid_at: '2026-10-25 10:01:00',
    service_expires_before: '2027-10-22 13:05:30',
    service_expires_after: '2028-10-22 13:05:30',
    domain_expires_before: '2027-10-22 13:05:30',
    domain_expires_after: '2028-10-22 13:05:30',
    invoice_number: `INV-${RENEWAL_NO}`,
    ...overrides,
  });

const makeOffer = (overrides: Partial<RenewalOffer> = {}): RenewalOffer => ({
  available: true,
  reason: null,
  hosting_price_per_year: 500_000,
  domain_price_per_year: 250_000,
  price_per_year: 750_000,
  max_years: 3,
  options: [1, 2, 3].map((years) => ({
    years,
    price: 750_000 * years,
    service_expires_after: `${2027 + years}-10-22 13:05:30`,
    domain_expires_after: `${2027 + years}-10-22 13:05:30`,
  })),
  ...overrides,
});

const log = (overrides: Partial<OrderLog>): OrderLog => ({
  id: ++seq,
  event: 'note',
  from_status: null,
  to_status: null,
  actor_type: 'system',
  actor_name: null,
  note: null,
  created_at: '2026-10-25 09:30:00',
  ...overrides,
});

interface Detail {
  order: Order;
  logs: OrderLog[];
  site: null;
  renewals: Renewal[];
  renewal: RenewalOffer | null;
}

let api: Record<string, (body: Record<string, unknown>) => Response>;
let calls: { action: string; body: Record<string, unknown> }[];
/** Jawaban customer_get_order berikutnya (diubah tes untuk mensimulasikan perubahan di server) */
let detail: Detail;

const setDetail = (overrides: Partial<Detail> = {}) => {
  detail = { order: makeOrder(), logs: [], site: null, renewals: [], renewal: makeOffer(), ...overrides };
};

beforeEach(() => {
  // Jam palsu yang tetap berjalan (findBy* tetap bekerja), dimulai dari NOW
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  calls = [];
  setDetail();
  api = {
    get_settings: () => json(200, { footer_whatsapp: '0812-1111-2222' }),
    get_payment_config: () => json(200, { simulator: false }),
    customer_get_order: () => json(200, detail),
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

const renderDetail = (path = `/akun/pesanan/${ORDER_NO}`) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/akun/pesanan/:orderNumber" element={<AccountOrderDetail />} />
      </Routes>
    </MemoryRouter>,
  );

// Render pertama di file ini memuat banyak modul (±4 detik di drive ini): batas waktu tes & pencarian dilonggarkan
const UI_SUITE = { timeout: 20_000 };
const findCard = () => screen.findByRole('region', { name: 'Masa aktif' }, { timeout: 5000 });
const callsOf = (action: string) => calls.filter((c) => c.action === action);

/* ─────────────────────────── Helper murni ─────────────────────────── */

describe('helper perpanjangan', () => {
  it('nomor perpanjangan dari order_id Midtrans; pesanan biasa → null', () => {
    expect(renewalNumberFromReturn(`${RENEWAL_NO}-2`)).toBe(RENEWAL_NO);
    expect(renewalNumberFromReturn(RENEWAL_NO.toLowerCase())).toBe(RENEWAL_NO);
    expect(renewalNumberFromReturn(RENEWAL_NO)).toBe(RENEWAL_NO);
    expect(renewalNumberFromReturn(`${ORDER_NO}-1`)).toBeNull();
    expect(renewalNumberFromReturn('GNR-x y')).toBeNull();
    expect(renewalNumberFromReturn(null)).toBeNull();
  });

  it('rincian harga, tagihan menunggu, nota', () => {
    expect(renewalBreakdown(500_000, 250_000, 'usaha-budi.com')).toBe('Hosting & jasa Rp500.000 + Domain .com Rp250.000');
    expect(renewalBreakdown(500_000, 350_000, 'toko.co.id')).toBe('Hosting & jasa Rp500.000 + Domain .co.id Rp350.000');
    expect(pendingRenewal([paidRenewal({ renewal_number: 'GNR-1' }), makeRenewal()])?.renewal_number).toBe(RENEWAL_NO);
    expect(pendingRenewal([paidRenewal()])).toBeNull();
    expect(hasOrderInvoice({ invoice_number: null, paid_at: null })).toBe(false);
    expect(hasOrderInvoice({ invoice_number: null, paid_at: '2026-10-22 11:00:00' })).toBe(true);
    expect(orderInvoicePath(ORDER_NO)).toBe(`/akun/pesanan/${ORDER_NO}/nota`);
    expect(renewalInvoicePath(ORDER_NO, RENEWAL_NO)).toBe(`/akun/pesanan/${ORDER_NO}/nota/${RENEWAL_NO}`);
    expect(activePeriodPath(ORDER_NO)).toBe(`/akun/pesanan/${ORDER_NO}#masa-aktif`);
  });

  it('riwayat: catatan perpanjangan dari server tampil, renewal_payment_* tidak', () => {
    const created = customerHistoryEntry(log({ event: 'renewal_created', note: `Perpanjangan 1 tahun dibuat (${RENEWAL_NO}).` }));
    expect(created).toMatchObject({ title: 'Perpanjangan dibuat', text: `Perpanjangan 1 tahun dibuat (${RENEWAL_NO}).` });
    expect(customerHistoryEntry(log({ event: 'renewal_paid', note: 'Lunas.' }))?.title).toBe('Masa aktif diperpanjang');
    expect(customerHistoryEntry(log({ event: 'renewal_cancelled', note: null }))).toMatchObject({
      title: 'Perpanjangan dibatalkan',
      text: undefined,
    });
    expect(customerHistoryEntry(log({ event: 'renewal_payment_created', note: 'Tagihan dibuat (percobaan 1).' }))).toBeNull();
    expect(customerHistoryEntry(log({ event: 'renewal_payment_update', note: 'HTTP 500' }))).toBeNull();
  });
});

/* ─────────────────────────── Kartu masa aktif ─────────────────────────── */

describe('kartu masa aktif', UI_SUITE, () => {
  it('hitung mundur, progres, tanggal hosting & domain, biaya, nota; angka diperbarui tiap menit', async () => {
    const minuteTimer = vi.spyOn(window, 'setInterval');
    renderDetail();
    const card = await findCard();
    expect(card).toHaveAttribute('id', 'masa-aktif');
    expect(within(card).getByText('Aktif')).toBeInTheDocument();
    expect(within(card).getByText('362')).toBeInTheDocument();
    expect(within(card).getByText('3 jam 5 menit lagi')).toBeInTheDocument();

    const bar = within(card).getByRole('progressbar', { name: 'Masa aktif hosting yang sudah berjalan' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '1');

    expect(within(card).getByText('Hosting & jasa template')).toBeInTheDocument();
    expect(within(card).getAllByText('22 Oktober 2026 – 22 Oktober 2027')).toHaveLength(2);
    expect(card).toHaveTextContent('Domain usaha-budi.com');
    expect(card).toHaveTextContent(
      'Biaya per tahun Rp750.000 (Hosting & jasa Rp500.000 + Domain .com Rp250.000). Bisa 1–3 tahun sekaligus.',
    );
    expect(within(card).queryByRole('alert')).not.toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Perpanjang masa aktif' })).toBeInTheDocument();

    // Tagihan: baris domain tahun pertama + nota pembelian
    const invoice = screen.getByRole('region', { name: 'Tagihan' });
    expect(invoice).toHaveTextContent(/Domain usaha-budi\.com \(1 tahun\)\s*Rp\s?250\.000/);
    expect(invoice).toHaveTextContent(/Harga template\s*Rp\s?1\.500\.000/);
    expect(within(invoice).getByRole('link', { name: 'Nota pembelian' })).toHaveAttribute('href', `/akun/pesanan/${ORDER_NO}/nota`);

    // Jam per menit dipasang di effect (setelah render); tunggu terpasang, lalu majukan satu menit
    await waitFor(() => expect(minuteTimer).toHaveBeenCalledWith(expect.any(Function), 60_000));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(within(card).getByText('3 jam 4 menit lagi')).toBeInTheDocument();
  });

  it('peringatan: ≤ 30 hari kuning, ≤ 7 hari merah, lewat = berakhir', async () => {
    setDetail({ order: makeOrder({ service_expires_at: '2026-11-06 10:30:00' }) });
    renderDetail();
    let card = await findCard();
    expect(within(card).getByText('Segera berakhir')).toBeInTheDocument();
    const soon = within(card).getByRole('alert');
    expect(soon).toHaveTextContent('Masa aktif tinggal 12 hari. Perpanjang sebelum 6 November 2026 agar situs tetap online.');
    expect(soon.className).toContain('bg-warning-50');
    cleanup();

    setDetail({ order: makeOrder({ service_expires_at: '2026-10-30 12:00:00' }) });
    renderDetail();
    card = await findCard();
    expect(within(card).getByText('Hampir berakhir')).toBeInTheDocument();
    const urgent = within(card).getByRole('alert');
    expect(urgent).toHaveTextContent('Masa aktif tinggal 5 hari.');
    expect(urgent.className).toContain('bg-danger-50');
    cleanup();

    setDetail({ order: makeOrder({ service_expires_at: '2026-10-22 09:00:00' }) });
    renderDetail();
    card = await findCard();
    expect(within(card).getByText('Berakhir 3 hari lalu')).toBeInTheDocument();
    expect(within(card).getByRole('alert')).toHaveTextContent(
      'Masa aktif berakhir 22 Oktober 2026. Situs dapat dinonaktifkan sementara; perpanjang sekarang.',
    );
  });

  it('perpanjangan online tidak tersedia: alasan + WhatsApp, tanpa tombol', async () => {
    setDetail({
      renewal: makeOffer({
        available: false,
        reason: 'Perpanjangan online untuk domain ini belum tersedia. Hubungi kami via WhatsApp.',
        domain_price_per_year: null,
        price_per_year: null,
        options: [],
      }),
    });
    renderDetail();
    const card = await findCard();
    expect(within(card).getByText(/Perpanjangan online untuk domain ini belum tersedia/)).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Perpanjang masa aktif' })).not.toBeInTheDocument();
    const wa = within(card).getByRole('link', { name: /Tanya via WhatsApp/ });
    await waitFor(() => expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281211112222\?text=/));
  });

  it('dibayar tapi belum aktif: tanpa kartu masa aktif, ada petunjuk dan nota; belum dibayar: tanpa nota', async () => {
    setDetail({
      order: makeOrder({ status: 'proses_domain', site_id: null, activated_at: null, service_started_at: null, service_expires_at: null }),
    });
    renderDetail();
    expect(await screen.findByText('Masa aktif dimulai saat situs aktif (1 tahun).')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Masa aktif' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nota pembelian' })).toBeInTheDocument();
    cleanup();

    setDetail({
      order: makeOrder({ status: 'menunggu_pembayaran', payment_status: 'pending', paid_at: null, invoice_number: null, site_id: null }),
    });
    renderDetail();
    expect(await screen.findByRole('button', { name: /Bayar Sekarang/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nota pembelian' })).not.toBeInTheDocument();
    expect(screen.queryByText('Masa aktif dimulai saat situs aktif (1 tahun).')).not.toBeInTheDocument();
  });

  it('tautan #masa-aktif dari dashboard: fokus pindah ke kartu', async () => {
    renderDetail(`/akun/pesanan/${ORDER_NO}#masa-aktif`);
    const card = await findCard();
    await waitFor(() => expect(document.activeElement).toBe(card));
  });
});

/* ─────────────────────────── Dialog perpanjangan ─────────────────────────── */

describe('dialog perpanjangan', UI_SUITE, () => {
  it('pilihan 1–3 tahun dengan harga, rincian, tanggal baru; buat tagihan lalu ke Midtrans', async () => {
    api.customer_create_renewal = () => json(200, { renewal: makeRenewal({ years: 2, price: 1_500_000 }), payment_url: SNAP_URL });
    renderDetail();
    const card = await findCard();
    const open = within(card).getByRole('button', { name: 'Perpanjang masa aktif' });
    open.focus();
    fireEvent.click(open);

    const dialog = screen.getByRole('dialog', { name: 'Perpanjang masa aktif' });
    const radios = within(dialog).getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios[0]).toBeChecked();
    expect(document.activeElement).toBe(radios[0]);
    expect(dialog).toHaveTextContent('Hosting & jasa Rp500.000 + Domain .com Rp250.000 per tahun');
    expect(dialog).toHaveTextContent('2 × (Hosting & jasa Rp500.000 + Domain .com Rp250.000)');
    expect(dialog).toHaveTextContent('Aktif sampai 22 Okt 2028');

    const twoYears = within(dialog).getByRole('radio', { name: /^2 tahun/ });
    expect(twoYears).toHaveAccessibleName(/Rp\s?1\.500\.000.*Aktif sampai 22 Okt 2029/);
    fireEvent.click(twoYears);
    expect(twoYears).toBeChecked();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Lanjut ke pembayaran' }));
    await waitFor(() => expect(goToPaymentMock).toHaveBeenCalledWith(SNAP_URL));
    expect(callsOf('customer_create_renewal')[0].body).toMatchObject({ order_number: ORDER_NO, years: 2 });
  });

  it('Esc menutup dan fokus kembali ke tombol; galat dari server tampil di dialog', async () => {
    api.customer_create_renewal = () =>
      json(409, {
        error: `Masih ada tagihan perpanjangan ${RENEWAL_NO} yang belum dibayar. Bayar atau batalkan dulu.`,
        code: 'RENEWAL_PENDING',
      });
    renderDetail();
    const open = within(await findCard()).getByRole('button', { name: 'Perpanjang masa aktif' });
    open.focus();
    fireEvent.click(open);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(open);

    fireEvent.click(open);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lanjut ke pembayaran' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(`Masih ada tagihan perpanjangan ${RENEWAL_NO}`);
    expect(goToPaymentMock).not.toHaveBeenCalled();
  });

  it('tanpa link pembayaran (lokal/simulator): dialog tertutup, tagihan menunggu tampil dengan peringatan', async () => {
    api.get_payment_config = () => json(200, { simulator: true });
    api.customer_create_renewal = () => {
      setDetail({ renewals: [makeRenewal()] });
      return json(200, { renewal: makeRenewal(), payment_url: null, payment_error: 'Pembayaran online belum dikonfigurasi.' });
    };
    renderDetail();
    const card = await findCard();
    // Konfigurasi simulator dimuat bersamaan dengan pesanan; beri waktu jawabannya diterapkan
    await waitFor(() => expect(callsOf('get_payment_config')).toHaveLength(1));
    await act(() => vi.advanceTimersByTimeAsync(50));
    fireEvent.click(within(card).getByRole('button', { name: 'Perpanjang masa aktif' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lanjut ke pembayaran' }));

    const pending = await within(card).findByRole('group', { name: 'Tagihan perpanjangan 1 tahun' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(pending).getByRole('alert')).toHaveTextContent(
      'Halaman pembayaran belum bisa dibuka: Pembayaran online belum dikonfigurasi. Untuk pengujian, gunakan tombol "Simulasikan pembayaran (mode uji)".',
    );
    await waitFor(() => expect(document.activeElement).toBe(pending));
    expect(within(card).queryByRole('button', { name: 'Perpanjang masa aktif' })).not.toBeInTheDocument();
    expect(goToPaymentMock).not.toHaveBeenCalled();
  });
});

/* ─────────────────────────── Tagihan menunggu pembayaran ─────────────────────────── */

describe('tagihan perpanjangan menunggu pembayaran', UI_SUITE, () => {
  it('belum dikonfigurasi + simulator → petunjuk simulasi; Bayar Sekarang → Midtrans', async () => {
    api.get_payment_config = () => json(200, { simulator: true });
    setDetail({ renewals: [makeRenewal()] });
    let configured = false;
    api.customer_pay_renewal = () =>
      configured
        ? json(200, { payment_url: SNAP_URL })
        : json(503, { error: 'Pembayaran online belum dikonfigurasi.', code: 'PAYMENT_NOT_CONFIGURED' });
    renderDetail();
    const pending = await within(await findCard()).findByRole('group', { name: 'Tagihan perpanjangan 1 tahun' });
    expect(pending).toHaveTextContent(RENEWAL_NO);
    expect(pending).toHaveTextContent(/Rp\s?750\.000/);
    expect(pending).toHaveTextContent('Hosting & jasa Rp500.000 + Domain .com Rp250.000 per tahun');
    // Tombol simulasi = konfigurasi simulator sudah dimuat
    await within(pending).findByRole('button', { name: 'Simulasikan pembayaran (mode uji)' });

    fireEvent.click(within(pending).getByRole('button', { name: 'Bayar Sekarang' }));
    expect(await within(pending).findByRole('alert')).toHaveTextContent(
      'Pembayaran online belum dikonfigurasi. Untuk pengujian, gunakan tombol "Simulasikan pembayaran (mode uji)".',
    );
    expect(goToPaymentMock).not.toHaveBeenCalled();

    // Berhasil: halaman pindah ke Midtrans (tombol tetap "memproses" sampai pindah)
    configured = true;
    fireEvent.click(within(pending).getByRole('button', { name: 'Bayar Sekarang' }));
    await waitFor(() => expect(goToPaymentMock).toHaveBeenCalledWith(SNAP_URL));
    expect(callsOf('customer_pay_renewal')[1].body).toMatchObject({ renewal_number: RENEWAL_NO });
    expect(within(pending).getByRole('button', { name: 'Membuka pembayaran...' })).toBeDisabled();
  });

  it('simulasi pembayaran: pemberitahuan berhasil, riwayat Lunas dengan nota', async () => {
    api.get_payment_config = () => json(200, { simulator: true });
    setDetail({ renewals: [makeRenewal()] });
    api.dev_simulate_renewal_payment = () => {
      const order = makeOrder({ service_expires_at: '2028-10-22 13:05:30', domain_expires_at: '2028-10-22 13:05:30' });
      setDetail({ order, renewals: [paidRenewal()] });
      return json(200, { renewal: paidRenewal(), order });
    };
    renderDetail();
    const card = await findCard();
    const simulate = await within(card).findByRole('button', { name: 'Simulasikan pembayaran (mode uji)' });
    fireEvent.click(simulate);

    const flash = await screen.findByText('Masa aktif sekarang sampai 22 Oktober 2028.');
    expect(flash.closest('[role="status"]')).toHaveTextContent('Perpanjangan berhasil');
    await waitFor(() => expect(within(card).queryByRole('group')).not.toBeInTheDocument());
    expect(callsOf('dev_simulate_renewal_payment')[0].body).toMatchObject({ renewal_number: RENEWAL_NO });

    const history = within(card).getByRole('heading', { name: 'Riwayat perpanjangan' }).parentElement!;
    expect(history).toHaveTextContent('Perpanjangan 1 tahun');
    expect(within(history).getByText('Lunas')).toBeInTheDocument();
    expect(history).toHaveTextContent('Aktif sampai 22 Oktober 2028');
    expect(within(history).getByRole('link', { name: `Nota perpanjangan ${RENEWAL_NO}` })).toHaveAttribute(
      'href',
      `/akun/pesanan/${ORDER_NO}/nota/${RENEWAL_NO}`,
    );
    await waitFor(() => expect(document.activeElement).toBe(card));
    // Perpanjangan berikutnya bisa langsung dibuat lagi
    expect(within(card).getByRole('button', { name: 'Perpanjang masa aktif' })).toBeInTheDocument();
  });

  it('Batalkan dengan konfirmasi; yang dibatalkan masuk riwayat tanpa nota', async () => {
    setDetail({ renewals: [makeRenewal()] });
    api.customer_cancel_renewal = () => {
      const cancelled = makeRenewal({ status: 'dibatalkan', status_label: 'Dibatalkan', cancelled_at: '2026-10-25 10:02:00' });
      setDetail({ renewals: [cancelled] });
      return json(200, { renewal: cancelled });
    };
    renderDetail();
    const card = await findCard();
    const pending = await within(card).findByRole('group', { name: 'Tagihan perpanjangan 1 tahun' });
    expect(within(pending).queryByRole('button', { name: /Simulasikan/ })).not.toBeInTheDocument();
    fireEvent.click(within(pending).getByRole('button', { name: 'Batalkan' }));

    const confirm = screen.getByRole('alertdialog', { name: 'Batalkan tagihan perpanjangan?' });
    expect(confirm).toHaveTextContent(RENEWAL_NO);
    fireEvent.click(within(confirm).getByRole('button', { name: 'Ya, batalkan' }));

    expect(await screen.findByText(`Tagihan perpanjangan ${RENEWAL_NO} dibatalkan.`)).toBeInTheDocument();
    await waitFor(() => expect(within(card).queryByRole('group')).not.toBeInTheDocument());
    expect(callsOf('customer_cancel_renewal')[0].body).toMatchObject({ renewal_number: RENEWAL_NO });
    const history = within(card).getByRole('heading', { name: 'Riwayat perpanjangan' }).parentElement!;
    expect(within(history).getByText('Dibatalkan')).toBeInTheDocument();
    expect(within(history).queryByRole('link', { name: /Nota/ })).not.toBeInTheDocument();
  });

  it('pembayaran kartu ditinjau bank (capture): tanpa Bayar Sekarang, Periksa lagi memuat ulang', async () => {
    setDetail({ renewals: [makeRenewal({ payment_status: 'capture', payment_type: 'credit_card' })] });
    renderDetail();
    const card = await findCard();
    const pending = await within(card).findByRole('group', { name: 'Tagihan perpanjangan 1 tahun' });
    expect(within(pending).queryByRole('button', { name: 'Bayar Sekarang' })).not.toBeInTheDocument();
    expect(pending).toHaveTextContent('Pembayaran sedang ditinjau bank');
    expect(pending).toHaveTextContent('Tidak perlu membayar ulang.');

    const before = callsOf('customer_get_order').length;
    fireEvent.click(within(pending).getByRole('button', { name: 'Periksa lagi' }));
    await waitFor(() => expect(callsOf('customer_get_order').length).toBe(before + 1));
    expect(callsOf('customer_pay_renewal')).toHaveLength(0);
  });
});

/* ─────────────────────────── Kembali dari Midtrans ─────────────────────────── */

describe('kembali dari pembayaran perpanjangan (order_id GNR-…)', UI_SUITE, () => {
  it('dimuat ulang tiap 10 detik selama menunggu, lalu pemberitahuan berhasil', async () => {
    setDetail({ renewals: [makeRenewal()] });
    renderDetail(`/akun/pesanan/${ORDER_NO}?order_id=${RENEWAL_NO}-1&transaction_status=settlement`);
    expect(await screen.findByText('Pembayaran perpanjangan sedang dikonfirmasi')).toBeInTheDocument();
    expect(callsOf('customer_get_order')).toHaveLength(1);

    // Belum ada perubahan: tetap menunggu
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    await waitFor(() => expect(callsOf('customer_get_order')).toHaveLength(2));
    expect(screen.getByText('Pembayaran perpanjangan sedang dikonfirmasi')).toBeInTheDocument();

    setDetail({
      order: makeOrder({ service_expires_at: '2028-10-22 13:05:30', domain_expires_at: '2028-10-22 13:05:30' }),
      renewals: [paidRenewal()],
    });
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(await screen.findByText('Masa aktif sekarang sampai 22 Oktober 2028.')).toBeInTheDocument();
    expect(screen.getByText('Perpanjangan berhasil')).toBeInTheDocument();
    expect(screen.queryByText('Pembayaran perpanjangan sedang dikonfirmasi')).not.toBeInTheDocument();

    // Selesai: tidak ada polling lagi
    const loads = callsOf('customer_get_order').length;
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(callsOf('customer_get_order')).toHaveLength(loads);
  });

  it('pembayaran gagal di Midtrans: peringatan, tagihan tetap bisa dibayar ulang', async () => {
    setDetail({ renewals: [makeRenewal()] });
    renderDetail(`/akun/pesanan/${ORDER_NO}?order_id=${RENEWAL_NO}-1&transaction_status=expire`);
    const notice = (await screen.findAllByRole('alert')).find((el) => el.textContent?.includes('Pembayaran perpanjangan belum berhasil'));
    expect(notice).toHaveTextContent('Status dari Midtrans: Kedaluwarsa.');
    expect(screen.getByRole('group', { name: 'Tagihan perpanjangan 1 tahun' })).toBeInTheDocument();
  });

  it('riwayat lengkap menampilkan catatan perpanjangan untuk pembeli', async () => {
    setDetail({
      renewals: [paidRenewal()],
      logs: [
        log({ event: 'renewal_created', actor_type: 'customer', note: `Perpanjangan 1 tahun dibuat (${RENEWAL_NO}).` }),
        log({ event: 'renewal_payment_created', note: `Tagihan perpanjangan ${RENEWAL_NO} dibuat (percobaan 1).` }),
        log({ event: 'renewal_paid', actor_type: 'midtrans', note: `Perpanjangan 1 tahun lunas (${RENEWAL_NO}). Masa aktif sampai 22 Oktober 2028.` }),
      ],
    });
    renderDetail();
    const history = (await screen.findByText('Lihat riwayat lengkap')).closest('details')!;
    expect(history).toHaveTextContent('Masa aktif diperpanjang');
    expect(history).toHaveTextContent('Masa aktif sampai 22 Oktober 2028.');
    expect(history).toHaveTextContent('Perpanjangan dibuat');
    expect(history).not.toHaveTextContent('percobaan 1');
  });
});

/* ─────────────────────────── Dashboard ─────────────────────────── */

describe('dashboard: masa aktif di kartu situs', UI_SUITE, () => {
  const renderHome = () =>
    render(
      <MemoryRouter initialEntries={['/akun']}>
        <Routes>
          <Route path="/akun" element={<AccountHome />} />
        </Routes>
      </MemoryRouter>,
    );

  it('aktif sampai + hitung mundur, nada sesuai sisa, tautan Perpanjang ke #masa-aktif', async () => {
    api.customer_get_orders = () =>
      json(200, {
        orders: [
          makeOrder({ id: 1, order_number: 'GN-1', domain: 'lama.com', service_expires_at: '2027-10-22 13:05:30' }),
          makeOrder({ id: 2, order_number: 'GN-2', domain: 'segera.com', service_expires_at: '2026-10-30 12:00:00' }),
        ],
      });
    renderHome();
    const sites = (await screen.findByRole('heading', { name: 'Situs Anda' })).closest('section')!;
    const lama = within(sites).getByRole('article', { name: 'lama.com' });
    const lamaLine = within(lama).getByText(/^Aktif sampai/).closest('div')!;
    expect(lamaLine).toHaveTextContent('Aktif sampai 22 Oktober 2027 · 362 hari lagi');
    expect(lamaLine.className).toContain('bg-alt');
    expect(within(lama).getByRole('link', { name: 'Perpanjang masa aktif lama.com' })).toHaveAttribute(
      'href',
      '/akun/pesanan/GN-1#masa-aktif',
    );

    const segera = within(sites).getByRole('article', { name: 'segera.com' });
    const segeraLine = within(segera).getByText(/^Aktif sampai/).closest('div')!;
    expect(segeraLine).toHaveTextContent('Aktif sampai 30 Oktober 2026 · 5 hari lagi');
    expect(segeraLine.className).toContain('bg-danger-50');
  });
});
