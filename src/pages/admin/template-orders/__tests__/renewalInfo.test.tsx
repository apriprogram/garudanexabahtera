// @vitest-environment jsdom
// Admin "Pesanan Template": domain berbayar, cek ketersediaan saat dipesan, masa aktif, dan perpanjangan
// (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §3–§5). Penolong murni di shared/orderUtils.ts, blok tampilan di
// shared/OrderUi.tsx, dan halaman Order Masuk / Template Aktif / Input Domain dengan API tiruan.
// Jalankan: node node_modules/vitest/vitest.mjs run src/pages/admin/template-orders/__tests__/renewalInfo.test.tsx
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order, Renewal, Site } from '../../../../types/platform';
import InputDomain from '../InputDomain';
import OrderMasuk from '../OrderMasuk';
import TemplateAktif from '../TemplateAktif';
import { ActivePeriodRows, PriceBreakdown, RenewalHistory } from '../shared/OrderUi';
import {
  EXPIRY_TONE,
  activePeriod,
  addYears,
  domainCheckInfo,
  expiryLabel,
  expiryOf,
  hasActivePeriod,
  isExpiring,
  logEventLabel,
  logTone,
  orderExpiryNotice,
  orderPriceLines,
  parseOrderDate,
  renewalLabel,
  renewalTone,
  sortSitesByExpiry,
} from '../shared/orderUtils';

// Waktu lokal (tanggal database juga waktu lokal)
const NOW = new Date('2026-10-26T10:00:00');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const at = (ms: number) => new Date(NOW.getTime() + ms);

function makeOrder(over: Partial<Order> = {}): Order {
  return {
    id: 7,
    order_number: 'GN-20251020-ABC123',
    template_id: 1,
    template_name: 'Finova',
    template_code: 'finova',
    template_slug: 'finova',
    price: 1_650_000,
    list_price: 1_500_000,
    discount_amount: 100_000,
    discount_code: 'PERTAMA',
    customer_name: 'Budi Santoso',
    customer_email: 'budi@example.com',
    customer_phone: '081234567890',
    company_name: null,
    notes: null,
    domain_primary: 'tokobudi.com',
    domain_alternative: null,
    domain: 'tokobudi.com',
    status: 'aktif',
    status_label: 'Aktif',
    payment_status: 'settlement',
    payment_type: 'bank_transfer',
    payment_url: null,
    paid_at: '2025-10-20 09:00:00',
    approved_at: '2025-10-20 10:00:00',
    rejected_reason: null,
    activated_at: '2025-10-21 08:00:00',
    cancelled_at: null,
    created_at: '2025-10-20 08:00:00',
    updated_at: '2026-10-20 11:00:00',
    site_id: 3,
    domain_price: 250_000,
    domain_check: 'available',
    invoice_number: 'INV-GN-20251020-ABC123',
    service_started_at: '2025-10-21 08:00:00',
    service_expires_at: '2027-10-21 08:00:00',
    domain_started_at: '2025-10-21 08:00:00',
    domain_expires_at: '2027-10-21 08:00:00',
    ...over,
  };
}

/** Pesanan dari sebelum migrasi 026: tanpa field domain berbayar & masa aktif sama sekali. */
function legacyOrder(over: Partial<Order> = {}): Order {
  const o = makeOrder({ price: 1_500_000, list_price: 1_500_000, discount_amount: 0, discount_code: null, ...over }) as Partial<Order>;
  for (const key of [
    'domain_price',
    'domain_check',
    'invoice_number',
    'service_started_at',
    'service_expires_at',
    'domain_started_at',
    'domain_expires_at',
  ] as const) {
    delete o[key];
  }
  return o as Order;
}

function makeRenewal(over: Partial<Renewal> = {}): Renewal {
  return {
    id: 2,
    renewal_number: 'GNR-20261020-XYZ789',
    order_number: 'GN-20251020-ABC123',
    domain: 'tokobudi.com',
    years: 1,
    hosting_price_per_year: 500_000,
    domain_price_per_year: 250_000,
    price_per_year: 750_000,
    price: 750_000,
    status: 'lunas',
    status_label: 'Lunas',
    payment_status: 'settlement',
    payment_type: 'qris',
    payment_url: null,
    paid_at: '2026-10-20 11:00:00',
    cancelled_at: null,
    service_expires_before: '2026-10-21 08:00:00',
    service_expires_after: '2027-10-21 08:00:00',
    domain_expires_before: '2026-10-21 08:00:00',
    domain_expires_after: '2027-10-21 08:00:00',
    invoice_number: 'INV-GNR-20261020-XYZ789',
    created_at: '2026-10-20 10:30:00',
    ...over,
  };
}

const CANCELLED = makeRenewal({
  id: 1,
  renewal_number: 'GNR-20261015-AAA111',
  years: 2,
  price: 1_500_000,
  status: 'dibatalkan',
  status_label: 'Dibatalkan',
  payment_status: 'expire',
  payment_type: null,
  paid_at: null,
  cancelled_at: '2026-10-16 10:00:00',
  service_expires_before: null,
  service_expires_after: null,
  domain_expires_before: null,
  domain_expires_after: null,
  invoice_number: null,
  created_at: '2026-10-15 09:00:00',
});

function makeSite(id: number, domain: string, over: Partial<Site> = {}): Site {
  return {
    id,
    order_id: id + 100,
    order_number: `GN-2025100${id}-SITE0${id}`,
    user_id: 5,
    template_id: 1,
    template_code: 'finova',
    template_name: 'Finova',
    domain,
    status: 'active',
    content: null,
    activated_at: '2025-10-20 08:00:00',
    updated_at: '2025-10-20 08:00:00',
    service_expires_at: null,
    domain_expires_at: null,
    owner_name: `Pemilik ${id}`,
    owner_email: `pemilik${id}@example.com`,
    ...over,
  };
}

/** fetch tiruan: respons per aksi (?action=…); aksi lain = 500. */
function mockApi(responses: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const action = new URL(url, 'http://localhost').searchParams.get('action') ?? '';
      const known = action in responses;
      return Promise.resolve(new Response(JSON.stringify(known ? responses[action] : { error: 'tidak dipakai di tes ini' }), { status: known ? 200 : 500 }));
    }),
  );
}

function freezeNow() {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/* ------------------------------------------------------------------ */

describe('orderPriceLines', () => {
  it('pesanan lama tanpa diskon & domain: cukup total', () => {
    expect(orderPriceLines(legacyOrder())).toEqual([{ label: 'Total tagihan', amount: 1_500_000, total: true }]);
  });

  it('template, diskon, domain tahun pertama, total = jumlah dibayar', () => {
    expect(orderPriceLines(makeOrder())).toEqual([
      { label: 'Harga template', amount: 1_500_000 },
      { label: 'Diskon pembelian pertama', amount: -100_000 },
      { label: 'Domain tokobudi.com (1 tahun)', amount: 250_000 },
      { label: 'Total tagihan', amount: 1_650_000, total: true },
    ]);
  });

  it('tanpa list_price: harga template dihitung dari total − domain + diskon', () => {
    const lines = orderPriceLines({ price: 1_050_000, domain_price: 50_000, discount_amount: 0, domain_primary: 'kopi.my.id' });
    expect(lines[0]).toEqual({ label: 'Harga template', amount: 1_000_000 });
    expect(lines.map((l) => l.label)).toEqual(['Harga template', 'Domain kopi.my.id (1 tahun)', 'Total tagihan']);
  });
});

describe('domainCheckInfo', () => {
  it('available / unknown / kosong', () => {
    expect(domainCheckInfo('available')).toEqual({ tone: 'mint', label: 'Tersedia saat dipesan' });
    expect(domainCheckInfo('unknown')).toEqual({
      tone: 'warning',
      label: 'Belum bisa dipastikan saat dipesan — cek manual sebelum mendaftarkan',
    });
    expect(domainCheckInfo(null)).toBeNull();
    expect(domainCheckInfo(undefined)).toBeNull();
    expect(domainCheckInfo('')).toBeNull();
  });
});

describe('masa aktif', () => {
  it('parseOrderDate membaca tanggal database sebagai waktu lokal', () => {
    expect(parseOrderDate('2027-10-21 08:00:00')).toEqual(new Date(2027, 9, 21, 8, 0, 0));
    expect(parseOrderDate('2027-10-21')).toEqual(new Date(2027, 9, 21));
    expect(parseOrderDate('bukan tanggal')).toBeNull();
    expect(parseOrderDate('')).toBeNull();
    expect(parseOrderDate(undefined)).toBeNull();
  });

  it('addYears seperti DATE_ADD MySQL (29 Feb → 28 Feb)', () => {
    expect(addYears(new Date(2024, 1, 29, 8), 1)).toEqual(new Date(2025, 1, 28, 8));
    expect(addYears(new Date(2026, 9, 26, 10), 3)).toEqual(new Date(2029, 9, 26, 10));
  });

  it('activePeriod: tanggal tercatat dipakai; tanpa tanggal berakhir = tanggal aktif + 1 tahun (perkiraan)', () => {
    expect(activePeriod('2025-10-21 08:00:00', '2027-10-21 08:00:00', '2025-10-21 08:00:00')).toEqual({
      start: new Date(2025, 9, 21, 8),
      end: new Date(2027, 9, 21, 8),
      estimated: false,
    });
    expect(activePeriod(undefined, undefined, '2025-11-01 08:00:00')).toEqual({
      start: new Date(2025, 10, 1, 8),
      end: new Date(2026, 10, 1, 8),
      estimated: true,
    });
    expect(activePeriod(null, null, null)).toEqual({ start: null, end: null, estimated: false });
  });

  it('expiryOf: batas 30 hari (kuning), 7 hari (merah), lewat', () => {
    const state = (ms: number) => expiryOf(at(ms), NOW)?.state;
    expect(state(31 * DAY + HOUR)).toBe('ok');
    expect(state(30 * DAY + HOUR)).toBe('soon');
    expect(state(8 * DAY)).toBe('soon');
    expect(state(7 * DAY + HOUR)).toBe('urgent');
    expect(state(2 * HOUR)).toBe('urgent');
    expect(state(0)).toBe('expired');
    expect(state(-3 * DAY)).toBe('expired');
    expect(expiryOf(null, NOW)).toBeNull();
    expect(EXPIRY_TONE).toEqual({ ok: 'mint', soon: 'warning', urgent: 'danger', expired: 'danger' });
    expect(isExpiring(expiryOf(at(31 * DAY + HOUR), NOW))).toBe(false);
    expect(isExpiring(expiryOf(at(30 * DAY + HOUR), NOW))).toBe(true);
    expect(isExpiring(null)).toBe(false);
  });

  it('expiryLabel: sisa hari penuh, hari ini, sudah lewat', () => {
    const label = (ms: number) => expiryLabel(expiryOf(at(ms), NOW)!);
    expect(label(362 * DAY + 3 * HOUR)).toBe('362 hari lagi');
    expect(label(DAY)).toBe('1 hari lagi');
    expect(label(5 * HOUR)).toBe('Berakhir hari ini');
    expect(label(-5 * HOUR)).toBe('Berakhir hari ini');
    expect(label(-3 * DAY - HOUR)).toBe('Berakhir 3 hari lalu');
  });

  it('orderExpiryNotice: hanya pesanan aktif, memakai tanggal berakhir terdekat', () => {
    expect(orderExpiryNotice(makeOrder(), NOW)).toBeNull(); // masih 359 hari
    expect(orderExpiryNotice(makeOrder({ status: 'proses_domain', service_expires_at: '2026-10-20 08:00:00' }), NOW)).toBeNull();

    const soon = orderExpiryNotice(makeOrder({ domain_expires_at: '2026-11-15 08:00:00' }), NOW);
    expect(soon).toEqual({
      tone: 'warning',
      title: 'Masa aktif tinggal 19 hari',
      text: 'Berakhir 15 November 2026. Pembeli bisa memperpanjang 1, 2, atau 3 tahun sekaligus dari akunnya.',
    });

    expect(orderExpiryNotice(makeOrder({ service_expires_at: '2026-10-30 08:00:00' }), NOW)?.tone).toBe('danger');

    const expired = orderExpiryNotice(makeOrder({ service_expires_at: '2026-10-22 08:00:00', domain_expires_at: '2026-10-22 08:00:00' }), NOW);
    expect(expired?.title).toBe('Masa aktif sudah berakhir');
    expect(expired?.text).toContain('Berakhir 22 Oktober 2026.');

    // Data lama: tanggal aktif + 1 tahun
    expect(orderExpiryNotice(legacyOrder({ activated_at: '2025-11-01 08:00:00' }), NOW)?.title).toBe('Masa aktif tinggal 5 hari');
  });

  it('hasActivePeriod: pesanan aktif atau tanggal masa aktif sudah tercatat', () => {
    expect(hasActivePeriod(makeOrder())).toBe(true);
    expect(hasActivePeriod(legacyOrder())).toBe(true);
    expect(hasActivePeriod(legacyOrder({ status: 'menunggu_approval' }))).toBe(false);
    expect(hasActivePeriod(makeOrder({ status: 'dibatalkan' }))).toBe(true);
  });

  it('sortSitesByExpiry: paling cepat berakhir dulu, tanpa tanggal di akhir, tanpa mengubah input', () => {
    const sites = [
      makeSite(1, 'a.com', { service_expires_at: '2027-10-01 08:00:00' }),
      makeSite(2, 'b.com', { activated_at: null }),
      makeSite(3, 'c.com', { service_expires_at: '2026-11-01 08:00:00' }),
      makeSite(4, 'd.com', { activated_at: '2025-11-05 08:00:00' }), // perkiraan: 5 Nov 2026
    ];
    expect(sortSitesByExpiry(sites).map((s) => s.domain)).toEqual(['c.com', 'd.com', 'a.com', 'b.com']);
    expect(sites.map((s) => s.domain)).toEqual(['a.com', 'b.com', 'c.com', 'd.com']);
  });
});

describe('label perpanjangan & log', () => {
  it('status perpanjangan → label & nada', () => {
    expect(renewalLabel('lunas')).toBe('Lunas');
    expect(renewalLabel('menunggu_pembayaran')).toBe('Menunggu Pembayaran');
    expect(renewalLabel('aneh', 'Label server')).toBe('Label server');
    expect(renewalTone('lunas')).toBe('mint');
    expect(renewalTone('menunggu_pembayaran')).toBe('warning');
    expect(renewalTone('dibatalkan')).toBe('mist');
    expect(renewalTone(undefined)).toBe('mist');
  });

  it('event log perpanjangan punya label & nada sendiri', () => {
    expect(logEventLabel('renewal_paid')).toBe('Perpanjangan lunas');
    expect(logEventLabel('renewal_created')).toBe('Perpanjangan dibuat');
    expect(logEventLabel('renewal_cancelled')).toBe('Perpanjangan dibatalkan');
    expect(logTone('renewal_paid')).toBe('mint');
    expect(logTone('renewal_cancelled')).toBe('mist');
    expect(logTone('renewal_payment_update')).toBe('warning');
    expect(logTone('renewal_created')).toBe('cobalt');
  });
});

/* ------------------------------------------------------------------ */

describe('blok tampilan', () => {
  it('PriceBreakdown: potongan bertanda minus, total di baris terakhir', () => {
    render(<PriceBreakdown lines={orderPriceLines(makeOrder())} />);
    expect(screen.getByText('Diskon pembelian pertama').parentElement).toHaveTextContent('-Rp 100.000');
    expect(screen.getByText('Domain tokobudi.com (1 tahun)').parentElement).toHaveTextContent('Rp 250.000');
    expect(screen.getByText('Total tagihan').parentElement).toHaveTextContent('Rp 1.650.000');
  });

  it('ActivePeriodRows: mulai–berakhir, sisa hari, dan tanda perkiraan', () => {
    render(
      <ActivePeriodRows
        now={NOW}
        rows={[
          { label: 'Hosting & jasa', period: activePeriod('2025-10-21 08:00:00', '2026-10-30 08:00:00', null) },
          { label: 'Domain lama.com', period: activePeriod(null, null, '2025-11-01 08:00:00') },
        ]}
      />,
    );
    const [hosting, domain] = screen.getAllByRole('listitem');
    expect(hosting).toHaveTextContent('21 Oktober 2025 – 30 Oktober 2026');
    expect(hosting).toHaveTextContent('3 hari lagi');
    expect(domain).toHaveTextContent('1 November 2025 – 1 November 2026 (perkiraan)');
    expect(domain).toHaveTextContent('5 hari lagi');
  });

  it('RenewalHistory: kosong', () => {
    render(<RenewalHistory renewals={[]} />);
    expect(screen.getByText('Belum ada perpanjangan. Pembeli bisa memperpanjang dari halaman akunnya.')).toBeInTheDocument();
  });

  it('RenewalHistory: petunjuk registrar untuk perpanjangan lunas terbaru + rincian tiap tagihan', () => {
    render(<RenewalHistory renewals={[makeRenewal(), CANCELLED]} />);
    const hint = screen.getByText('Perpanjangan lunas: perpanjang juga domain & hosting di registrar/server.').closest('[role="status"]');
    expect(hint).toHaveTextContent('GNR-20261020-XYZ789 (1 tahun): domain tokobudi.com sampai 21 Oktober 2027, hosting & jasa sampai 21 Oktober 2027.');

    const [paid, cancelled] = screen.getAllByRole('listitem');
    expect(within(paid).getByText('Lunas')).toBeInTheDocument();
    expect(paid).toHaveTextContent('Rp 750.000 · 1 tahun');
    expect(paid).toHaveTextContent('Per tahun: hosting & jasa Rp 500.000 + domain Rp 250.000');
    expect(paid).toHaveTextContent('QRIS');
    expect(within(paid).getByText('Hosting & jasa sampai').nextElementSibling).toHaveTextContent('21 Oktober 2026 → 21 Oktober 2027');
    expect(within(paid).getByText('Domain sampai').nextElementSibling).toHaveTextContent('21 Oktober 2026 → 21 Oktober 2027');

    expect(within(cancelled).getByText('Dibatalkan', { selector: 'span' })).toBeInTheDocument();
    expect(cancelled).toHaveTextContent('Rp 1.500.000 · 2 tahun');
    expect(within(cancelled).queryByText('Hosting & jasa sampai')).not.toBeInTheDocument();
  });

  it('RenewalHistory: tanpa perpanjangan lunas tidak ada petunjuk registrar', () => {
    const pending = makeRenewal({ status: 'menunggu_pembayaran', status_label: 'Menunggu Pembayaran', payment_status: 'pending', paid_at: null });
    render(<RenewalHistory renewals={[pending]} />);
    expect(screen.queryByText(/perpanjang juga domain & hosting/)).not.toBeInTheDocument();
    expect(screen.getByText('Menunggu pembayaran')).toBeInTheDocument(); // status pembayaran Midtrans
  });
});

/* ------------------------------------------------------------------ */

async function openOrder(order: Order, detail: Record<string, unknown>) {
  mockApi({
    admin_get_template_orders: { orders: [order], counts: { all: 1, [order.status]: 1 } },
    admin_get_template_order: { order, logs: [], site: null, ...detail },
  });
  render(
    <MemoryRouter initialEntries={[`/admin/pesanan-template?order=${order.id}`]}>
      <OrderMasuk />
    </MemoryRouter>,
  );
  return screen.findByRole('dialog');
}

describe('Order Masuk: detail pesanan', () => {
  it('rincian domain, cek ketersediaan, nota, masa aktif, dan riwayat perpanjangan', async () => {
    freezeNow();
    const dialog = await openOrder(makeOrder(), { renewals: [makeRenewal(), CANCELLED] });
    await within(dialog).findByText('GNR-20261020-XYZ789');

    expect(within(dialog).getByText('Domain tokobudi.com (1 tahun)').parentElement).toHaveTextContent('Rp 250.000');
    expect(within(dialog).getByText('Total tagihan').parentElement).toHaveTextContent('Rp 1.650.000');
    expect(within(dialog).getByText('Ketersediaan domain utama').nextElementSibling).toHaveTextContent('Tersedia saat dipesan');
    expect(within(dialog).getByText('INV-GN-20251020-ABC123')).toBeInTheDocument();

    const period = within(dialog).getByRole('heading', { name: 'Masa aktif' }).closest('section') as HTMLElement;
    const [hosting, domain] = within(period).getAllByRole('listitem');
    expect(hosting).toHaveTextContent('Hosting & jasa');
    expect(hosting).toHaveTextContent('21 Oktober 2025 – 21 Oktober 2027');
    expect(hosting).toHaveTextContent('359 hari lagi');
    expect(domain).toHaveTextContent('Domain tokobudi.com');

    const renewals = within(dialog).getByRole('heading', { name: 'Perpanjangan' }).closest('section') as HTMLElement;
    expect(within(renewals).getByText('Perpanjangan lunas: perpanjang juga domain & hosting di registrar/server.')).toBeInTheDocument();
    expect(within(renewals).getByText('GNR-20261015-AAA111')).toBeInTheDocument();
    // Masih lama: tanpa peringatan masa aktif
    expect(within(dialog).queryByText(/^Masa aktif (tinggal|sudah|berakhir)/)).not.toBeInTheDocument();
  });

  it('data lama tanpa field baru: tanpa baris domain, masa aktif perkiraan + peringatan, belum ada perpanjangan', async () => {
    freezeNow();
    const dialog = await openOrder(legacyOrder({ activated_at: '2025-11-01 08:00:00' }), {});
    await within(dialog).findByText('Belum ada perpanjangan. Pembeli bisa memperpanjang dari halaman akunnya.');

    expect(within(dialog).queryByText(/\(1 tahun\)$/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Harga template')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Total tagihan').parentElement).toHaveTextContent('Rp 1.500.000');
    expect(within(dialog).queryByText('Ketersediaan domain utama')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('No. nota')).not.toBeInTheDocument();

    const period = within(dialog).getByRole('heading', { name: 'Masa aktif' }).closest('section') as HTMLElement;
    expect(within(period).getAllByRole('listitem')[0]).toHaveTextContent('1 November 2025 – 1 November 2026 (perkiraan)');
    expect(within(dialog).getByText('Masa aktif tinggal 5 hari')).toBeInTheDocument();
  });

  it('belum aktif: cek ketersediaan belum pasti tampil, tanpa masa aktif & perpanjangan', async () => {
    freezeNow();
    const order = makeOrder({
      status: 'menunggu_approval',
      status_label: 'Dibayar (Menunggu Approval)',
      domain: null,
      domain_check: 'unknown',
      activated_at: null,
      approved_at: null,
      service_started_at: null,
      service_expires_at: null,
      domain_started_at: null,
      domain_expires_at: null,
    });
    const dialog = await openOrder(order, { renewals: [] });
    await within(dialog).findByText('Belum ada riwayat.');

    expect(within(dialog).getByText('Belum bisa dipastikan saat dipesan — cek manual sebelum mendaftarkan')).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Masa aktif' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Perpanjangan' })).not.toBeInTheDocument();
  });
});

describe('Template Aktif: kolom Berakhir', () => {
  const SITES = [
    makeSite(1, 'baru.com', { activated_at: '2026-10-01 09:00:00', service_expires_at: '2027-10-01 09:00:00', domain_expires_at: '2027-10-01 09:00:00' }),
    makeSite(2, 'tanpa-tanggal.com', { activated_at: '2026-09-01 08:00:00', service_expires_at: undefined, domain_expires_at: undefined }),
    makeSite(3, 'segera.com', { activated_at: '2025-11-10 08:00:00', service_expires_at: '2026-11-10 08:00:00', domain_expires_at: '2026-12-01 08:00:00' }),
    makeSite(4, 'lama.com', { activated_at: '2025-10-24 08:00:00', service_expires_at: '2026-10-24 08:00:00', domain_expires_at: '2026-10-24 08:00:00' }),
  ];

  const tableDomains = () =>
    within(screen.getByRole('table'))
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.querySelector('a')?.textContent?.replace('(buka di tab baru)', '').trim());

  it('tanggal berakhir + sisa hari, tab & peringatan "Segera berakhir" diurutkan paling cepat berakhir', async () => {
    freezeNow();
    mockApi({ admin_get_active_sites: { sites: SITES } });
    render(
      <MemoryRouter>
        <TemplateAktif />
      </MemoryRouter>,
    );
    await screen.findAllByText('baru.com');

    // Urutan server (terbaru aktif dulu)
    expect(tableDomains()).toEqual(['baru.com', 'tanpa-tanggal.com', 'segera.com', 'lama.com']);
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows[2]).toHaveTextContent('1 September 2027 (perkiraan)');
    expect(rows[3]).toHaveTextContent('10 November 2026');
    expect(rows[3]).toHaveTextContent('14 hari lagi');
    expect(rows[3]).toHaveTextContent('Domain s/d 1 Des 2026');
    expect(rows[4]).toHaveTextContent('Berakhir 2 hari lalu');

    expect(screen.getByRole('tab', { name: /Segera berakhir/ })).toHaveTextContent('2');
    expect(screen.getByText('2 situs berakhir dalam 30 hari atau sudah lewat')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan' }));
    expect(screen.getByRole('tab', { name: /Segera berakhir/ })).toHaveAttribute('aria-selected', 'true');
    expect(tableDomains()).toEqual(['lama.com', 'segera.com']);
    expect(screen.queryByText('2 situs berakhir dalam 30 hari atau sudah lewat')).not.toBeInTheDocument();

    // Kembali ke Semua: urutan "Berakhir" tetap, bisa dikembalikan lewat kolom Tanggal aktif
    fireEvent.click(screen.getByRole('tab', { name: /Semua/ }));
    expect(tableDomains()).toEqual(['lama.com', 'segera.com', 'tanpa-tanggal.com', 'baru.com']);
    fireEvent.click(screen.getByRole('button', { name: /Tanggal aktif/ }));
    expect(tableDomains()).toEqual(['baru.com', 'tanpa-tanggal.com', 'segera.com', 'lama.com']);
  });

  it('tidak ada yang segera berakhir: tanpa peringatan, tab menampilkan keadaan kosong', async () => {
    freezeNow();
    mockApi({ admin_get_active_sites: { sites: SITES.slice(0, 2) } });
    render(
      <MemoryRouter>
        <TemplateAktif />
      </MemoryRouter>,
    );
    await screen.findAllByText('baru.com');
    expect(screen.queryByText(/situs berakhir dalam 30 hari/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Segera berakhir/ }));
    expect(screen.getByText('Tidak ada situs yang segera berakhir.')).toBeInTheDocument();
  });
});

describe('Input Domain: masa aktif dimulai saat aktivasi', () => {
  it('menyebut masa aktif 1 tahun, hasil cek domain, dan harga domain yang dibayar', async () => {
    freezeNow();
    const order = makeOrder({
      status: 'proses_domain',
      status_label: 'Disetujui (Proses Domain)',
      domain: null,
      domain_primary: 'kopi.my.id',
      domain_price: 50_000,
      domain_check: 'unknown',
      activated_at: null,
      service_started_at: null,
      service_expires_at: null,
      domain_started_at: null,
      domain_expires_at: null,
    });
    mockApi({ admin_get_template_orders: { orders: [order], counts: { all: 1, proses_domain: 1 } } });
    render(
      <MemoryRouter>
        <InputDomain />
      </MemoryRouter>,
    );
    const card = (await screen.findByRole('heading', { name: order.order_number })).closest('article') as HTMLElement;

    expect(within(card).getByText('Belum bisa dipastikan saat dipesan — cek manual sebelum mendaftarkan')).toBeInTheDocument();
    expect(within(card).getByText('Domain dibayar Rp 50.000 (1 tahun)')).toBeInTheDocument();
    expect(card).toHaveTextContent('Aktivasi memulai masa aktif 1 tahun untuk hosting dan domain (sampai 26 Oktober 2027).');

    fireEvent.click(within(card).getByRole('button', { name: 'Simpan & aktifkan' }));
    expect(await screen.findByText(/Masa aktif hosting dan domain 1 tahun dimulai sekarang, sampai 26 Oktober 2027\./)).toBeInTheDocument();
  });
});
