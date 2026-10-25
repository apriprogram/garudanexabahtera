// @vitest-environment jsdom
// Nota resmi pembeli: model nota (pembelian, pesanan lama tanpa harga domain, perpanjangan) dan halaman
// /akun/pesanan/:orderNumber/nota[/:renewalNumber] (judul, 404/409, cetak, unduh PDF).
// Jalankan: npx vitest run src/pages/account/__tests__/invoice.test.tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Block, DocModel, TextRun } from '../../../features/project-docs/engine';

// Pratinjau A4 diganti daftar judul blok: tes halaman memeriksa halaman, bukan tata letak kertas (engine-preview.test)
const engine = vi.hoisted(() => ({ exportPdf: vi.fn() }));
vi.mock('../../../features/project-docs/engine', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../features/project-docs/engine')>()),
  ...engine,
  DocumentPreview: ({ model }: { model: DocModel }) => (
    <div data-testid="preview">
      {model.blocks.map((b, i) => (b.type === 'heading' ? <p key={i}>{b.text}</p> : null))}
    </div>
  ),
}));

import AccountInvoice from '../AccountInvoice';
import { buildInvoiceModel, invoicePaymentStatus, tambahTahun, waktuBayar } from '../components/invoiceModel';
import { company, makeOrder, makeRenewal } from './invoiceFixtures';

const text = (runs: TextRun[]) => runs.map((r) => r.text).join('');
const tableOf = (model: DocModel) => model.blocks.find((b): b is Extract<Block, { type: 'table' }> => b.type === 'table');
const tableRows = (model: DocModel) => tableOf(model)?.rows.map((row) => row.map(text)) ?? [];
/** Semua baris "Label : isi" sebagai objek label → isi. */
const keyValues = (model: DocModel) =>
  Object.fromEntries(model.blocks.flatMap((b) => (b.type === 'keyValue' ? b.rows.map((r) => [r.label, text(r.value)]) : [])));
const paragraphs = (model: DocModel) => model.blocks.flatMap((b) => (b.type === 'paragraph' ? [text(b.runs)] : []));
const headings = (model: DocModel) => model.blocks.flatMap((b) => (b.type === 'heading' ? [b.text] : []));

/* ─────────────────────────── Model nota ─────────────────────────── */

describe('buildInvoiceModel', () => {
  it('nota pembelian: template, diskon, domain, total, terbilang, masa aktif tahun pertama', () => {
    const model = buildInvoiceModel({ order: makeOrder(), renewal: null, company });

    expect(model.meta).toEqual({ number: 'INV-GN-20261023-DCZ03O', title: 'NOTA PEMBELIAN', type: 'invoice', date: '2026-10-23' });
    expect(model.kop.company.name).toBe('PT Garuda Nexa Bahtera');
    expect(model.footer.text).toBe('INV-GN-20261023-DCZ03O');
    expect(model.signatures).toEqual([]);
    expect(model.missing).toEqual([]);
    expect(headings(model)).toEqual(['NOTA PEMBELIAN', 'Ditagihkan kepada', 'Rincian pembayaran', 'Pembayaran', 'Domain & masa aktif']);

    expect(tableOf(model)).toMatchObject({ columns: ['Uraian', 'Jumlah'], align: ['left', 'right'], total: true });
    expect(tableRows(model)).toEqual([
      ['Template website Corporate Nexa (setup awal, hosting & SSL 1 tahun)', 'Rp1.500.000'],
      ['Diskon pembelian pertama', '-Rp150.000'],
      ['Domain sarimakmur.com (1 tahun)', 'Rp250.000'],
      ['Total', 'Rp1.600.000'],
    ]);

    const kv = keyValues(model);
    expect(kv).toMatchObject({
      'No. nota': 'INV-GN-20261023-DCZ03O',
      'No. pesanan': 'GN-20261023-DCZ03O',
      'Tanggal nota': '23 Oktober 2026',
      'Status pembayaran': 'LUNAS',
      Metode: 'QRIS',
      'Dibayar pada': '23 Oktober 2026 pukul 14.05 WIB',
      Domain: 'sarimakmur.com',
      'Masa aktif hosting & jasa': '24 Oktober 2026 – 24 Oktober 2027',
      'Masa aktif domain': '24 Oktober 2026 – 24 Oktober 2027',
    });
    expect(kv).not.toHaveProperty('No. perpanjangan');

    const paras = paragraphs(model);
    expect(paras).toContain('Sari Wulandari\nCV Sari Makmur\nsari@example.com\n081234567890');
    expect(paras).toContain('Terbilang: satu juta enam ratus ribu rupiah');
    expect(paras).toContain(
      'Nota ini diterbitkan secara elektronik oleh PT Garuda Nexa Bahtera dan sah tanpa tanda tangan. Pembayaran diproses melalui Midtrans.',
    );
    expect(paras.some((p) => /termasuk harga template/.test(p))).toBe(false);
  });

  it('pesanan lama tanpa harga domain: catatan domain termasuk, nomor dari nomor pesanan, belum aktif', () => {
    const order = makeOrder({
      price: 1_500_000,
      list_price: 1_500_000,
      discount_amount: 0,
      discount_code: null,
      domain_price: 0,
      domain: null,
      domain_primary: 'tokolama.id',
      invoice_number: undefined,
      payment_status: 'simulated',
      payment_type: 'simulator',
      status: 'proses_domain',
      service_started_at: null,
      service_expires_at: null,
      domain_started_at: null,
      domain_expires_at: null,
    });
    const model = buildInvoiceModel({ order, renewal: null, company });

    expect(model.meta.number).toBe('INV-GN-20261023-DCZ03O');
    expect(tableRows(model)).toEqual([
      ['Template website Corporate Nexa (setup awal, hosting & SSL 1 tahun)', 'Rp1.500.000'],
      ['Total', 'Rp1.500.000'],
    ]);
    expect(paragraphs(model)).toContain('Domain tahun pertama termasuk harga template.');
    expect(keyValues(model)).toMatchObject({
      'Status pembayaran': 'Lunas (simulasi)',
      Domain: 'tokolama.id',
      'Masa aktif hosting & jasa': 'Dimulai saat situs aktif',
      'Masa aktif domain': 'Dimulai saat situs aktif',
    });
    // Simulasi tidak lewat Midtrans
    expect(paragraphs(model)).toContain('Nota ini diterbitkan secara elektronik oleh PT Garuda Nexa Bahtera dan sah tanpa tanda tangan.');
  });

  it('pesanan tanpa list_price (sebelum migrasi 012): harga template = total − domain + diskon', () => {
    const model = buildInvoiceModel({ order: makeOrder({ list_price: undefined }), renewal: null, company });
    expect(tableRows(model)[0]).toEqual(['Template website Corporate Nexa (setup awal, hosting & SSL 1 tahun)', 'Rp1.500.000']);
  });

  it('masa aktif pembelian tetap tahun pertama walau sudah diperpanjang', () => {
    const order = makeOrder({ service_expires_at: '2029-10-24 09:00:00', domain_expires_at: '2029-10-24 09:00:00' });
    expect(keyValues(buildInvoiceModel({ order, renewal: null, company }))['Masa aktif hosting & jasa']).toBe('24 Oktober 2026 – 24 Oktober 2027');
  });

  it('pesanan ditolak lalu dikembalikan: status Dikembalikan, masa aktif tidak diaktifkan', () => {
    const order = makeOrder({ status: 'ditolak', payment_status: 'refund', service_started_at: null, domain_started_at: null });
    const kv = keyValues(buildInvoiceModel({ order, renewal: null, company }));
    expect(kv['Status pembayaran']).toBe('Dikembalikan');
    expect(kv['Masa aktif hosting & jasa']).toBe('Tidak diaktifkan');
  });

  it('nota perpanjangan: hosting & domain × tahun, nomor perpanjangan, masa aktif sebelum dan sesudah', () => {
    const model = buildInvoiceModel({ order: makeOrder(), renewal: makeRenewal(), company });

    expect(model.meta).toEqual({ number: 'INV-GNR-20271001-AB12CD', title: 'NOTA PERPANJANGAN', type: 'invoice', date: '2027-10-01' });
    expect(model.footer.text).toBe('INV-GNR-20271001-AB12CD');
    expect(tableRows(model)).toEqual([
      ['Perpanjangan hosting & jasa template (2 tahun)', 'Rp1.000.000'],
      ['Perpanjangan domain sarimakmur.com (2 tahun)', 'Rp500.000'],
      ['Total', 'Rp1.500.000'],
    ]);
    expect(keyValues(model)).toMatchObject({
      'No. nota': 'INV-GNR-20271001-AB12CD',
      'No. pesanan': 'GN-20261023-DCZ03O',
      'No. perpanjangan': 'GNR-20271001-AB12CD',
      'Tanggal nota': '1 Oktober 2027',
      'Status pembayaran': 'LUNAS',
      Metode: 'Transfer bank (virtual account)',
      'Dibayar pada': '1 Oktober 2027 pukul 08.30 WIB',
      'Masa aktif hosting & jasa': 'Sampai 24 Oktober 2029 (sebelumnya 24 Oktober 2027)',
      'Masa aktif domain': 'Sampai 24 Oktober 2029 (sebelumnya 24 Oktober 2027)',
    });
    expect(paragraphs(model)).toContain('Terbilang: satu juta lima ratus ribu rupiah');
    expect(paragraphs(model).some((p) => /termasuk harga template/.test(p))).toBe(false);
  });

  it('nomor nota perpanjangan dihitung bila server belum mengirimnya; status simulasi', () => {
    const renewal = makeRenewal({ invoice_number: null, payment_status: 'simulated', service_expires_before: null });
    const model = buildInvoiceModel({ order: makeOrder(), renewal, company });
    expect(model.meta.number).toBe('INV-GNR-20271001-AB12CD');
    expect(invoicePaymentStatus(makeOrder(), renewal)).toBe('Lunas (simulasi)');
    expect(keyValues(model)['Masa aktif hosting & jasa']).toBe('Sampai 24 Oktober 2029');
  });

  it('pembantu tanggal: tambah tahun (29 Februari) dan waktu bayar', () => {
    expect(tambahTahun('2028-02-29 10:00:00', 1)).toBe('2029-02-28');
    expect(tambahTahun('2026-10-24', 2)).toBe('2028-10-24');
    expect(tambahTahun('bukan tanggal', 1)).toBe('');
    expect(waktuBayar('2026-10-23 09:07:00')).toBe('23 Oktober 2026 pukul 09.07 WIB');
    expect(waktuBayar('2026-10-23')).toBe('23 Oktober 2026');
    expect(waktuBayar(null)).toBe('-');
  });
});

/* ─────────────────────────── Halaman nota ─────────────────────────── */

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let respond: (body: Record<string, unknown>) => Response;
let requests: Record<string, unknown>[];

beforeEach(() => {
  engine.exportPdf.mockReset();
  requests = [];
  respond = () => json(200, { success: true, order: makeOrder(), renewal: null, company });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const body = init?.body ? JSON.parse(String(init.body)) : Object.fromEntries(url.searchParams);
      if (url.searchParams.get('action') !== 'customer_get_invoice') return json(404, { error: 'tidak ada' });
      requests.push(body);
      return respond(body);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderPage(path = '/akun/pesanan/GN-20261023-DCZ03O/nota') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/akun/pesanan/:orderNumber/nota" element={<AccountInvoice />} />
        <Route path="/akun/pesanan/:orderNumber/nota/:renewalNumber" element={<AccountInvoice />} />
        <Route path="/akun/pesanan/:orderNumber" element={<p>Halaman pesanan</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Halaman nota', () => {
  it('menampilkan judul, nomor nota, status, pratinjau, dan judul tab', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Nota pembelian' })).toBeInTheDocument();
    expect(screen.getByText('INV-GN-20261023-DCZ03O')).toBeInTheDocument();
    expect(screen.getByText('Lunas')).toBeInTheDocument();
    expect(screen.getByTestId('preview')).toHaveTextContent('NOTA PEMBELIAN');
    expect(document.title).toBe('Nota INV-GN-20261023-DCZ03O | Garuda Nexa');
    expect(requests).toEqual([expect.objectContaining({ action: 'customer_get_invoice', order_number: 'GN-20261023-DCZ03O' })]);
    expect(requests[0]).not.toHaveProperty('renewal_number');
    expect(screen.getByRole('link', { name: /Detail pesanan/ })).toHaveAttribute('href', '/akun/pesanan/GN-20261023-DCZ03O');
  });

  it('nota perpanjangan mengirim nomor perpanjangan', async () => {
    respond = () => json(200, { success: true, order: makeOrder(), renewal: makeRenewal(), company });
    renderPage('/akun/pesanan/GN-20261023-DCZ03O/nota/GNR-20271001-AB12CD');

    expect(await screen.findByRole('heading', { level: 1, name: 'Nota perpanjangan' })).toBeInTheDocument();
    expect(screen.getByText('INV-GNR-20271001-AB12CD')).toBeInTheDocument();
    expect(requests[0]).toMatchObject({ order_number: 'GN-20261023-DCZ03O', renewal_number: 'GNR-20271001-AB12CD' });
  });

  it('409 INVOICE_NOT_AVAILABLE: pesan server dan tautan kembali ke pesanan', async () => {
    respond = () => json(409, { error: 'Nota tersedia setelah pembayaran lunas.', code: 'INVOICE_NOT_AVAILABLE' });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Nota belum tersedia' })).toBeInTheDocument();
    expect(screen.getByText('Nota tersedia setelah pembayaran lunas.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kembali ke detail pesanan' })).toHaveAttribute('href', '/akun/pesanan/GN-20261023-DCZ03O');
    expect(screen.queryByRole('button', { name: /Unduh PDF/ })).not.toBeInTheDocument();
  });

  it('404: pesanan atau tagihan perpanjangan tidak ditemukan', async () => {
    respond = () => json(404, { error: 'Tagihan perpanjangan tidak ditemukan.', code: 'RENEWAL_NOT_FOUND' });
    renderPage('/akun/pesanan/GN-20261023-DCZ03O/nota/GNR-20990101-XXXXXX');
    expect(await screen.findByRole('heading', { name: 'Nota tidak ditemukan' })).toBeInTheDocument();
    expect(screen.getByText(/GNR-20990101-XXXXXX tidak ada di pesanan GN-20261023-DCZ03O/)).toBeInTheDocument();
    cleanup();

    respond = () => json(404, { error: 'Pesanan tidak ditemukan.', code: 'ORDER_NOT_FOUND' });
    renderPage('/akun/pesanan/GN-20990101-XXXXXX/nota');
    expect(await screen.findByRole('heading', { name: 'Pesanan tidak ditemukan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kembali ke pesanan saya' })).toHaveAttribute('href', '/akun');
  });

  it('galat server bisa dicoba lagi', async () => {
    respond = () => json(500, { error: 'Terjadi kesalahan pada server. Silakan coba lagi.' });
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Nota belum bisa dimuat' })).toBeInTheDocument();

    respond = () => json(200, { success: true, order: makeOrder(), renewal: null, company });
    fireEvent.click(screen.getByRole('button', { name: /Coba lagi/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Nota pembelian' })).toBeInTheDocument();
    expect(requests).toHaveLength(2);
  });

  it('Unduh PDF memanggil exportPdf dengan model nota dan nama file; gagal → pemberitahuan', async () => {
    let finish: () => void = () => {};
    engine.exportPdf.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Unduh PDF' }));
    const busy = await screen.findByRole('button', { name: /Menyiapkan PDF/ });
    expect(busy).toBeDisabled();
    expect(engine.exportPdf).toHaveBeenCalledTimes(1);
    const [model, fileName] = engine.exportPdf.mock.calls[0] as [DocModel, string];
    expect(fileName).toBe('Nota-INV-GN-20261023-DCZ03O.pdf');
    expect(model.meta).toMatchObject({ number: 'INV-GN-20261023-DCZ03O', title: 'NOTA PEMBELIAN' });
    finish();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Unduh PDF' })).toBeEnabled());

    engine.exportPdf.mockRejectedValueOnce(new Error('Font tidak termuat.'));
    fireEvent.click(screen.getByRole('button', { name: 'Unduh PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal mengunduh PDF: Font tidak termuat.');
  });

  it('Cetak membuka dialog cetak browser', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Cetak' }));
    expect(print).toHaveBeenCalledTimes(1);
  });
});
