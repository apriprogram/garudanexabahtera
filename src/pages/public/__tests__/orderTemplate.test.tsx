// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/public/__tests__/orderTemplate.test.tsx
// Halaman /pesan/:slug: judul & subjudul per keadaan, "Sudah termasuk", S&K + refund, validasi saat blur / setelah kirim,
// cek domain (nama + dropdown ekstensi → daftar status & harga, pilih dari daftar, galat), total = template + domain, kirim.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OrderTemplate from '../OrderTemplate';
import { clearApiCache } from '../../../lib/api';
import { LEGAL_PATHS } from '../../../lib/legal';
import { DOMAIN_TLDS, domainTld, type DomainTld } from '../../../lib/domainPricing';
import { TEMPLATE_PRICE_INCLUDES_DEFAULT, TEMPLATE_PRICE_NOTE_DEFAULT } from '../../../hooks/useSiteSettings';

const TEMPLATE = {
  id: 1,
  slug: 'corporate-nexa',
  name: 'Corporate Nexa',
  category: 'Company Profile',
  short_description: 'Company profile elegan.',
  description: null,
  features: [],
  price: 1500000,
  preview_image: null,
  gallery: [],
  template_code: 'corporate-nexa',
  demo_url: null,
  status: 'published',
  sort_order: 1,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let posted: { action: string; body: Record<string, unknown> }[] = [];
// Jawaban customer_get_order_quote (bawaan: tanpa diskon)
let quoteResponse = { list_price: 1500000, discount_percent: 0, discount_amount: 0, price: 1500000 };
// customer_check_domain: status per domain (bawaan tersedia), atau jawaban khusus (galat 400/429)
let checkStatus: Record<string, 'available' | 'taken' | 'unknown'> = {};
let checkReply: ((domain: string) => Response) | null = null;
// get_domain_prices: null = server tanpa daftar (frontend memakai tabel bawaan)
let domainPrices: DomainTld[] | null = null;
// customer_create_order: null = tidak boleh terkirim (500)
let createReply: (() => Response) | null = null;

const actions = () => posted.map((p) => p.action);
const bodiesOf = (action: string) => posted.filter((p) => p.action === action).map((p) => p.body);

const tokenFor = (role: string) => `h.${btoa(JSON.stringify({ sub: 7, role, exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`;
const loginAs = (role: string) => {
  localStorage.setItem('authToken', tokenFor(role));
  localStorage.setItem('currentUser', JSON.stringify({ id: 7, name: 'Budi Santoso', email: 'budi@example.com', phone: '081234567890', role }));
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  clearApiCache();
  posted = [];
  quoteResponse = { list_price: 1500000, discount_percent: 0, discount_amount: 0, price: 1500000 };
  checkStatus = {};
  checkReply = null;
  domainPrices = null;
  createReply = null;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const action = url.searchParams.get('action');
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body ?? '{}')) as Record<string, unknown>;
        const name = String(action ?? body.action);
        posted.push({ action: name, body });
        if (name === 'customer_get_order_quote') return json(200, { quote: quoteResponse });
        if (name === 'customer_check_domain') {
          const domain = String(body.domain);
          if (checkReply) return checkReply(domain);
          // Seperti server: nama yang sama di semua ekstensi yang dijual, yang diminta lebih dulu
          const list = domainPrices ?? DOMAIN_TLDS;
          const tld = domainTld(domain, list);
          const name = tld ? domain.slice(0, -(tld.tld.length + 1)) : domain;
          const domains = [domain, ...list.filter((t) => t.tld !== tld?.tld).map((t) => `${name}.${t.tld}`)];
          const checks = domains.map((d) => {
            const t = domainTld(d, list);
            return { domain: d, tld: t?.tld ?? '', status: checkStatus[d] ?? 'available', price: t?.price ?? 0 };
          });
          return json(200, { success: true, check: checks[0], checks });
        }
        if (name === 'customer_create_order' && createReply) return createReply();
        return json(500, { error: 'tidak boleh terkirim di tes ini' });
      }
      if (action === 'get_template') {
        return url.searchParams.get('slug') === TEMPLATE.slug ? json(200, { template: TEMPLATE }) : json(404, { error: 'Template tidak ditemukan.' });
      }
      if (action === 'get_settings') return json(200, { footer_whatsapp: '0812-0000-1111' });
      if (action === 'get_domain_prices') return domainPrices ? json(200, { success: true, source: 'dewabiz', domains: domainPrices }) : json(200, []);
      return json(200, []);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const renderPage = (slug = TEMPLATE.slug) =>
  render(
    <MemoryRouter initialEntries={[`/pesan/${slug}`]}>
      <Routes>
        <Route path="/pesan/:slug" element={<OrderTemplate />} />
      </Routes>
    </MemoryRouter>,
  );

const heading = () => screen.getByRole('heading', { level: 1 });

/** Elemen <tag> yang seluruh teksnya (termasuk anak) sama dengan `text`, mis. baris "Domain x (1 tahun)". */
const byFullText = (tag: string, text: string) => (_: string, el: Element | null) =>
  el?.tagName === tag.toUpperCase() && el.textContent?.replace(/\s+/g, ' ').trim() === text;

const domainInput = () => screen.getByLabelText('Nama domain');
const tldSelect = () => screen.getByRole('combobox', { name: 'Ekstensi domain' });
/** Buka dropdown ekstensi lalu klik opsinya. */
const chooseTld = (tld: string) => {
  fireEvent.click(tldSelect());
  fireEvent.click(within(screen.getByRole('listbox', { name: 'Ekstensi domain' })).getByRole('option', { name: `.${tld}` }));
};
/** Teks opsi dropdown (dibuka lalu ditutup lagi dengan Esc). */
const tldOptions = () => {
  fireEvent.click(tldSelect());
  const options = within(screen.getByRole('listbox', { name: 'Ekstensi domain' }))
    .getAllByRole('option')
    .map((o) => o.textContent);
  fireEvent.keyDown(tldSelect(), { key: 'Escape' });
  return options;
};
const resultList = () => screen.getByRole('group', { name: 'Pilih domain' });
const radioFor = (domain: string) => within(resultList()).getByRole('radio', { name: new RegExp(`^${domain.replace(/\./g, '\\.')} `) });

/** Isi nama domain (dan ekstensi) lalu tekan "Cek"; tunggu permintaan cek selesai. */
const checkDomain = async (name: string, tld?: string) => {
  fireEvent.change(domainInput(), { target: { value: name } });
  if (tld) chooseTld(tld);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Cek ketersediaan domain' }));
  });
};

const PENDING_DOMAIN = 'belum dipilih';

describe('halaman /pesan/:slug', () => {
  it('tamu: judul nama template, subjudul ajakan masuk, hal yang perlu disiapkan, Daftar Akun, dan footer', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Pesan Corporate Nexa' })).toBeInTheDocument();
    expect(screen.getByText('Masuk atau daftar dulu (1 menit), lalu isi data dan domain Anda.')).toBeInTheDocument();
    expect(screen.getByText(/Yang perlu Anda siapkan: nama domain pilihan dan nomor WhatsApp aktif/)).toBeInTheDocument();
    const prompt = screen.getByRole('region', { name: 'Masuk untuk melanjutkan pemesanan' });
    expect(within(prompt).getByRole('link', { name: 'Daftar Akun' })).toHaveAttribute('href', '/daftar?next=%2Fpesan%2Fcorporate-nexa');
    // Rincian harga untuk tamu (HP) + ringkasan kanan (desktop): keduanya menyebut isi harga
    expect(screen.getAllByText(TEMPLATE_PRICE_INCLUDES_DEFAULT[1]).length).toBeGreaterThan(0);
    // Domain tidak termasuk harga template: ringkasan menyebut domain belum dipilih dan subtotal tanpa domain
    expect(screen.getAllByText(PENDING_DOMAIN).length).toBeGreaterThan(0);
    expect(screen.getByText('Subtotal tanpa domain')).toBeInTheDocument();
    expect(within(prompt).getByRole('link', { name: /Kebijakan Pengembalian Dana/ })).toHaveAttribute('href', LEGAL_PATHS.refund);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('template tidak ditemukan: judul umum tanpa subjudul', async () => {
    renderPage('tidak-ada');
    expect(await screen.findByText('Template tidak ditemukan')).toBeInTheDocument();
    expect(heading()).toHaveTextContent('Pesan template');
    expect(screen.queryByText(/Masuk atau daftar dulu/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Lengkapi data pesanan/)).not.toBeInTheDocument();
  });

  it('pembeli: daftar "Sudah termasuk", catatan perpanjangan, S&K + refund di persetujuan, bantuan WhatsApp', async () => {
    loginAs('customer');
    renderPage();
    expect(await screen.findByRole('button', { name: /Lanjut ke Pembayaran/ })).toBeInTheDocument();
    expect(screen.getByText(/Lengkapi data pesanan dan domain/)).toBeInTheDocument();

    for (const item of TEMPLATE_PRICE_INCLUDES_DEFAULT) expect(screen.getAllByText(item).length).toBeGreaterThan(0);
    expect(screen.getAllByText(TEMPLATE_PRICE_NOTE_DEFAULT).length).toBeGreaterThan(0);
    // Sebelum domain dipilih: harga template, domain belum dipilih, dan subtotal tanpa domain
    expect(screen.getAllByText('Harga template').length).toBeGreaterThan(0);
    expect(screen.getAllByText(PENDING_DOMAIN).length).toBeGreaterThan(0);
    expect(screen.getByText(`Domain: ${PENDING_DOMAIN}`)).toBeInTheDocument();
    expect(screen.getAllByText('Subtotal tanpa domain').length).toBeGreaterThan(0);
    expect(screen.queryByText('Total pembayaran')).not.toBeInTheDocument();

    const agree = screen.getByRole('checkbox');
    const label = agree.closest('label') as HTMLElement;
    expect(within(label).getByRole('link', { name: /Syarat & Ketentuan/ })).toHaveAttribute('href', LEGAL_PATHS.terms);
    expect(within(label).getByRole('link', { name: /Syarat & Ketentuan/ })).toHaveAttribute('target', '_blank');
    expect(within(label).getByRole('link', { name: /Kebijakan Pengembalian Dana/ })).toHaveAttribute('href', LEGAL_PATHS.refund);

    expect(screen.getByText(/dana kembali penuh ke metode pembayaran semula paling lambat 7 hari kerja/)).toBeInTheDocument();
    expect(screen.getByText(/metode pembayaran yang tersedia di Midtrans/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chat WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281200001111\?text=/);
    expect(screen.getByText(/Apa yang terjadi setelah membayar\?/)).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('pembeli: isian nama + dropdown ekstensi bergaya situs (tanpa harga), tanpa teks penjelasan harga', async () => {
    loginAs('customer');
    renderPage();
    await screen.findByRole('button', { name: /Lanjut ke Pembayaran/ });
    expect(screen.getByText(/Semua isian wajib, kecuali yang bertanda opsional/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nomor WhatsApp')).toHaveAttribute('aria-required', 'true');
    expect(domainInput()).toHaveAttribute('aria-required', 'true');
    expect(domainInput()).toHaveAttribute('placeholder', 'namabisnis');
    expect(screen.queryByLabelText(/Domain alternatif/)).not.toBeInTheDocument();
    expect(screen.getByText('0/2.000')).toBeInTheDocument();
    expect(screen.getByText(/Ketik nama domain, pilih ekstensinya, lalu cek/)).toBeInTheDocument();

    // Dropdown bergaya situs: semua ekstensi yang dijual tanpa harga (harga tampil di hasil cek), .com terpilih
    expect(tldSelect()).toHaveTextContent('.com');
    expect(tldSelect()).toHaveAttribute('aria-expanded', 'false');
    const options = tldOptions();
    expect(options).toEqual(DOMAIN_TLDS.map((t) => `.${t.tld}`));
    expect(options.slice(0, 4)).toEqual(['.com', '.id', '.co.id', '.my.id']);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Keyboard: ↓ membuka di opsi terpilih, ↓ lagi menyorot .id, Enter memilih dan menutup
    fireEvent.keyDown(tldSelect(), { key: 'ArrowDown' });
    expect(tldSelect()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: '.com' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tldSelect(), { key: 'ArrowDown' });
    expect(tldSelect()).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: '.id' }).id);
    fireEvent.keyDown(tldSelect(), { key: 'Enter' });
    expect(tldSelect()).toHaveTextContent('.id');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    // Huruf melompat ke ekstensi berawalan huruf itu
    fireEvent.keyDown(tldSelect(), { key: 's' });
    expect(tldSelect()).toHaveTextContent('.sch.id');
    // Tidak ada lagi petunjuk/penjelasan harga di bawah isian
    expect(screen.queryByText(/Harga domain per tahun/)).not.toBeInTheDocument();
    expect(screen.queryByText('Lihat semua ekstensi')).not.toBeInTheDocument();
  });

  it('daftar ekstensi dari server (DewaBiz) menggantikan tabel bawaan', async () => {
    domainPrices = [
      { tld: 'com', price: 250000, requirement: null },
      { tld: 'xyz', price: 19000, requirement: null },
    ];
    loginAs('customer');
    renderPage();
    await screen.findByRole('button', { name: /Lanjut ke Pembayaran/ });
    await waitFor(() => expect(tldOptions()).toEqual(['.com', '.xyz']));
    await checkDomain('tokosaya', 'xyz');
    expect(bodiesOf('customer_check_domain').map((b) => b.domain)).toEqual(['tokosaya.xyz']);
  });

  it('validasi: nama dengan karakter salah ditandai saat keluar field; ekstensi yang diketik pindah ke dropdown', async () => {
    loginAs('customer');
    renderPage();
    const input = await screen.findByLabelText('Nama domain');
    fireEvent.change(input, { target: { value: 'NamaBisnis' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('namabisnis');
    expect(input).not.toHaveAttribute('aria-invalid');

    fireEvent.change(input, { target: { value: 'https://www.Toko.My.ID/' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('toko');
    expect(tldSelect()).toHaveTextContent('.my.id');

    fireEvent.change(input, { target: { value: 'toko-' } });
    fireEvent.blur(input);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Format domain tidak valid, contoh: namabisnis.com')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'toko' } });
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('validasi: kirim kosong menandai field, lalu memeriksa langsung saat mengetik; tidak ada cek/pesanan terkirim', async () => {
    loginAs('customer');
    renderPage();
    const submit = await screen.findByRole('button', { name: /Lanjut ke Pembayaran/ });
    await act(async () => {
      fireEvent.click(submit);
    });
    const input = domainInput();
    expect(screen.getByText('Nama domain wajib diisi.')).toBeInTheDocument();
    expect(screen.getByText('Centang persetujuan ini untuk melanjutkan.')).toBeInTheDocument();
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: 'toko.xyz' } });
    expect(screen.getByText('Ekstensi domain belum tersedia. Pilih ekstensi dari daftar.')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'toko' } });
    expect(input).not.toHaveAttribute('aria-invalid');

    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.queryByText('Centang persetujuan ini untuk melanjutkan.')).not.toBeInTheDocument();

    const phone = screen.getByLabelText('Nomor WhatsApp');
    fireEvent.change(phone, { target: { value: '0812' } });
    expect(screen.getByText('Nomor tidak valid. Gunakan 8–15 digit angka, contoh: 081234567890.')).toBeInTheDocument();
    // Hanya permintaan harga (diskon pembelian pertama): tidak ada cek domain maupun pesanan terkirim
    expect(actions().filter((action) => action !== 'customer_get_order_quote')).toEqual([]);
  });

  it('pembeli pertama kali: diskon 20% dan total setelah diskon + domain; tamu melihat ajakan diskon', async () => {
    quoteResponse = { list_price: 1500000, discount_percent: 20, discount_amount: 300000, price: 1200000 };
    loginAs('customer');
    const { unmount } = renderPage();
    expect(await screen.findAllByText('Diskon pembelian pertama (20%)')).not.toHaveLength(0);
    expect(screen.getAllByText(/1\.200\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Subtotal tanpa domain \(sudah dipotong diskon 20%\)/)).toBeInTheDocument();

    await checkDomain('tokosaya');
    await waitFor(() => expect(radioFor('tokosaya.com')).toBeChecked());
    // 1.200.000 (template setelah diskon) + 250.000 (domain)
    expect(screen.getAllByText('Rp 1.450.000').length).toBeGreaterThan(0);
    expect(screen.getByText(/Total pembayaran \(sudah dipotong diskon 20%\)/)).toBeInTheDocument();
    expect(screen.getByText(byFullText('p', 'Template Rp 1.200.000 + Domain tokosaya.com (1 tahun) Rp 250.000'))).toBeInTheDocument();
    unmount();
    localStorage.clear();

    renderPage();
    expect(await screen.findByText(/Akun baru: diskon 20% otomatis untuk pembelian template pertama Anda/)).toBeInTheDocument();
  });

  it('cek domain: daftar semua ekstensi dengan status & harga, yang diminta terpilih, total di semua ringkasan', async () => {
    checkStatus = { 'tokosaya.id': 'taken', 'tokosaya.net': 'unknown' };
    loginAs('customer');
    renderPage();
    await screen.findByRole('button', { name: /Lanjut ke Pembayaran/ });
    await checkDomain('  TokoSaya ');

    expect(bodiesOf('customer_check_domain').map((b) => b.domain)).toEqual(['tokosaya.com']);
    const rows = within(resultList()).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual(
      DOMAIN_TLDS.map((t) => {
        const domain = `tokosaya.${t.tld}`;
        const status = domain === 'tokosaya.id' ? 'Sudah dipakai' : domain === 'tokosaya.net' ? 'Belum pasti' : 'Tersedia';
        return `${domain} ${status} Rp${t.price.toLocaleString('id-ID')} per tahun`;
      }),
    );
    expect(radioFor('tokosaya.com')).toBeChecked();
    expect(radioFor('tokosaya.id')).toBeDisabled();
    expect(domainInput()).toHaveValue('tokosaya');
    expect(screen.getByText('10 dari 11 domain bisa dipilih.')).toBeInTheDocument();

    // Ringkasan kanan, ringkasan HP, dan total di dekat tombol bayar: 1.500.000 + 250.000
    expect(screen.getAllByText(byFullText('dt', 'Domain tokosaya.com (1 tahun)'))).toHaveLength(2);
    expect(screen.getAllByText('Rp 1.750.000')).toHaveLength(3);
    expect(screen.getByText('Total pembayaran')).toBeInTheDocument();

    // Pilih ekstensi lain dari daftar: dropdown ikut, tanpa cek ulang
    fireEvent.click(radioFor('tokosaya.my.id'));
    expect(tldSelect()).toHaveTextContent('.my.id');
    expect(screen.getAllByText('Rp 1.550.000').length).toBeGreaterThan(0);
    // Ganti dropdown ke ekstensi yang ada di daftar: langsung terpilih; yang sudah dipakai tidak
    chooseTld('net');
    expect(radioFor('tokosaya.net')).toBeChecked();
    chooseTld('id');
    expect(screen.getAllByText(PENDING_DOMAIN).length).toBeGreaterThan(0);
    expect(bodiesOf('customer_check_domain')).toHaveLength(1);

    // Nama berubah: hasil cek hilang, domain harus dicek ulang
    fireEvent.change(domainInput(), { target: { value: 'tokolain' } });
    expect(screen.queryByRole('group', { name: 'Pilih domain' })).not.toBeInTheDocument();
    expect(screen.queryByText('Rp 1.750.000')).not.toBeInTheDocument();
  });

  it('cek lewat Enter; domain yang diketik lengkap memakai ekstensinya; syarat ekstensi tampil', async () => {
    loginAs('customer');
    renderPage();
    const input = await screen.findByLabelText('Nama domain');
    fireEvent.change(input, { target: { value: 'https://www.TokoSaya.co.id/x' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(bodiesOf('customer_check_domain').map((b) => b.domain)).toEqual(['tokosaya.co.id']);
    await waitFor(() => expect(radioFor('tokosaya.co.id')).toBeChecked());
    expect(tldSelect()).toHaveTextContent('.co.id');
    expect(input).toHaveValue('tokosaya');
    expect(screen.getByText('tokosaya.co.id: Untuk badan usaha: butuh NIB atau akta perusahaan.')).toBeInTheDocument();
    expect(screen.getAllByText('Rp 1.850.000').length).toBeGreaterThan(0);
    // Enter tidak mengirim form
    expect(actions()).not.toContain('customer_create_order');
  });

  it('domain yang diminta sudah dipakai: tidak terpilih, pilih ekstensi lain yang tersedia', async () => {
    checkStatus = { 'tokosaya.com': 'taken' };
    loginAs('customer');
    renderPage();
    await screen.findByRole('button', { name: /Lanjut ke Pembayaran/ });
    await checkDomain('tokosaya');
    expect(radioFor('tokosaya.com')).toBeDisabled();
    expect(radioFor('tokosaya.com')).not.toBeChecked();
    expect(screen.getAllByText(PENDING_DOMAIN).length).toBeGreaterThan(0);
    fireEvent.click(radioFor('tokosaya.web.id'));
    expect(screen.getAllByText('Rp 1.550.000').length).toBeGreaterThan(0);
  });

  it('galat cek: format lokal tanpa request, 400 VALIDATION di field, 429 & jaringan sebagai pesan', async () => {
    loginAs('customer');
    renderPage();
    await screen.findByRole('button', { name: /Lanjut ke Pembayaran/ });

    await checkDomain('');
    expect(screen.getByText('Nama domain wajib diisi.')).toBeInTheDocument();
    expect(actions()).not.toContain('customer_check_domain');

    checkReply = () => json(400, { error: 'Periksa kembali isian Anda.', code: 'VALIDATION', errors: { domain: 'Domain ini tidak bisa dipesan.' } });
    await checkDomain('tokosaya');
    expect(await screen.findByText('Domain ini tidak bisa dipesan.')).toBeInTheDocument();
    expect(domainInput()).toHaveAttribute('aria-invalid', 'true');

    checkReply = () => json(429, { error: 'Terlalu banyak pengecekan domain. Coba lagi beberapa menit lagi.' });
    await checkDomain('tokosaya', 'net');
    expect(await screen.findByText('Terlalu banyak pengecekan domain. Coba lagi beberapa menit lagi.')).toBeInTheDocument();
    expect(domainInput()).not.toHaveAttribute('aria-invalid');

    checkReply = () => {
      throw new TypeError('Failed to fetch');
    };
    await checkDomain('tokosaya', 'org');
    expect(await screen.findByText(/Tidak bisa terhubung ke server/)).toBeInTheDocument();
    expect(screen.getAllByText(PENDING_DOMAIN).length).toBeGreaterThan(0);
  });

  it('kirim tanpa cek: domain dicek dulu, lalu pesanan dibuat dengan domain_primary (tanpa domain alternatif)', async () => {
    createReply = () => json(200, { success: true, order: { order_number: 'GNT-20261025-ABC123' }, payment_url: null });
    loginAs('customer');
    renderPage();
    await screen.findByRole('button', { name: /Lanjut ke Pembayaran/ });
    fireEvent.change(domainInput(), { target: { value: 'TokoSaya' } });
    fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Pembayaran/ }));
    });

    await waitFor(() => expect(actions()).toContain('customer_create_order'));
    expect(actions().indexOf('customer_check_domain')).toBeLessThan(actions().indexOf('customer_create_order'));
    expect(bodiesOf('customer_create_order')[0]).toMatchObject({
      template_id: 1,
      customer_name: 'Budi Santoso',
      customer_email: 'budi@example.com',
      customer_phone: '081234567890',
      domain_primary: 'tokosaya.com',
      domain_alternative: null,
    });
  });

  it('kirim dengan domain yang sudah dipakai: diblokir dengan pesan di field', async () => {
    checkStatus = { 'tokosaya.com': 'taken' };
    loginAs('customer');
    renderPage();
    await screen.findByRole('button', { name: /Lanjut ke Pembayaran/ });
    fireEvent.change(domainInput(), { target: { value: 'tokosaya' } });
    fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Pembayaran/ }));
    });

    expect(
      await screen.findByText('Domain tokosaya.com sudah dipakai orang lain. Cek nama lain. Pilih domain lain yang tersedia di daftar.'),
    ).toBeInTheDocument();
    expect(domainInput()).toHaveAttribute('aria-invalid', 'true');
    expect(domainInput()).toHaveFocus();
    expect(actions()).toContain('customer_check_domain');
    expect(actions()).not.toContain('customer_create_order');
  });

  it('409 DOMAIN_UNAVAILABLE saat kirim: pesan server di field domain dan hasil cek direset', async () => {
    const message = 'Domain tokosaya.com sudah dipakai orang lain. Cek nama lain.';
    createReply = () => json(409, { error: message, code: 'DOMAIN_UNAVAILABLE', errors: { domain_primary: message } });
    loginAs('customer');
    renderPage();
    await screen.findByRole('button', { name: /Lanjut ke Pembayaran/ });
    await checkDomain('tokosaya');
    await waitFor(() => expect(radioFor('tokosaya.com')).toBeChecked());
    fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Pembayaran/ }));
    });

    expect(await screen.findByText(message)).toBeInTheDocument();
    // Sudah dicek sebelumnya: tidak dicek ulang sebelum memesan
    expect(bodiesOf('customer_check_domain')).toHaveLength(1);
    expect(bodiesOf('customer_create_order')[0]).toMatchObject({ domain_primary: 'tokosaya.com', domain_alternative: null });
    expect(screen.queryByRole('group', { name: 'Pilih domain' })).not.toBeInTheDocument();
    expect(screen.getAllByText(PENDING_DOMAIN).length).toBeGreaterThan(0);
    expect(domainInput()).toHaveAttribute('aria-invalid', 'true');
    expect(domainInput()).toHaveFocus();
    expect(screen.getByRole('button', { name: /Lanjut ke Pembayaran/ })).toBeEnabled();
  });
});
