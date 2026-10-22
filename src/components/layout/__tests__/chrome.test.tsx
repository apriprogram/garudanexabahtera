// @vitest-environment jsdom
// Chrome publik bersama (paket "fondasi"): Navbar (menu HP, skip link, tanpa sakelar bahasa), Footer (kolom akun,
// kontak, dokumen legal), helper setting, cache apiGet, dan halaman legal.
// Jalankan: npx vitest run --dir src/components/layout
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from '../Navbar';
import Footer from '../Footer';
import { FloatingWhatsApp } from '../FloatingWhatsApp';
import SyaratKetentuan from '../../../pages/public/legal/SyaratKetentuan';
import KebijakanPrivasi from '../../../pages/public/legal/KebijakanPrivasi';
import KebijakanPengembalianDana from '../../../pages/public/legal/KebijakanPengembalianDana';
import { apiGet, clearApiCache } from '../../../lib/api';
import { LEGAL_PATHS } from '../../../lib/legal';
import { getHead } from '../../../seo/routes';
import {
  TEMPLATE_PRICE_INCLUDES_DEFAULT,
  TEMPLATE_PRICE_NOTE_DEFAULT,
  displayPhone,
  getContactEmail,
  getTemplatePricing,
  getWhatsappNumber,
  telHref,
} from '../../../hooks/useSiteSettings';
import { accountLinkFor, sessionKind } from '../../../hooks/useSessionRole';
import { t } from '../../../hooks/useTranslation';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Token berformat JWT yang cukup untuk dibaca src/lib/auth.ts (klaim role & exp). */
const login = (role: string) => {
  const token = `h.${btoa(JSON.stringify({ sub: 7, role, exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`;
  localStorage.setItem('authToken', token);
  localStorage.setItem('currentUser', JSON.stringify({ id: 7, name: 'Budi', email: 'budi@example.com', role }));
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    const action = url.searchParams.get('action');
    // Setting kosong: Footer harus memakai nilai bawaan dari kode
    if (action === 'get_settings') return json(200, {});
    return json(200, []);
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.style.overflow = '';
});

const renderAt = (node: React.ReactNode, entry = '/') => render(<MemoryRouter initialEntries={[entry]}>{node}</MemoryRouter>);

describe('Navbar', () => {
  it('hanya bahasa Indonesia: tidak ada sakelar bahasa', () => {
    renderAt(<Navbar />);
    expect(screen.queryByRole('button', { name: /english|bahasa|switch/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^EN$|^ID$/)).not.toBeInTheDocument();
    expect(t('nav-consult')).toBe('Konsultasi Gratis');
  });

  it('skip link adalah tautan pertama di header dan memindahkan fokus ke konten utama', () => {
    render(
      <MemoryRouter>
        <Navbar />
        <main id="konten">Isi</main>
      </MemoryRouter>,
    );
    const header = document.querySelector('header') as HTMLElement;
    const skip = within(header).getAllByRole('link')[0];
    expect(skip).toHaveTextContent('Lewati ke konten');
    expect(skip).toHaveAttribute('href', '#konten');
    fireEvent.click(skip);
    expect(document.activeElement).toBe(document.getElementById('konten'));
    expect(document.getElementById('konten')).toHaveAttribute('tabindex', '-1');
  });

  it('menu HP: berlabel, latar redup menutup menu, gulir halaman dikunci', () => {
    renderAt(<Navbar />);
    const toggle = screen.getByRole('button', { name: 'Buka menu' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Menu' })).toHaveAttribute('id', 'menu-hp');
    expect(document.documentElement.style.overflow).toBe('hidden');

    const scrim = document.querySelector('header > div[aria-hidden]') as HTMLElement;
    expect(scrim).toBeInTheDocument();
    fireEvent.click(scrim);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.querySelector('header > div[aria-hidden]')).not.toBeInTheDocument();
  });

  it('menu HP: Escape menutup dan mengembalikan fokus ke tombol menu; Tab berputar di dalam header', () => {
    renderAt(<Navbar />);
    const toggle = screen.getByRole('button', { name: 'Buka menu' });
    toggle.focus();
    fireEvent.click(toggle);

    // Tab dari elemen terakhir di menu kembali ke elemen pertama (logo), bukan ke halaman di belakang menu
    const menu = screen.getByRole('navigation', { name: 'Menu' });
    const menuLinks = within(menu).getAllByRole('link');
    const last = menuLinks[menuLinks.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toHaveAccessibleName('Garuda Nexa Bahtera, ke beranda');
    // Shift+Tab dari elemen pertama ke elemen terakhir
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(toggle);
  });

  it('tombol akun mengikuti sesi', () => {
    login('customer');
    renderAt(<Navbar />);
    expect(screen.getAllByRole('link', { name: 'Akun Saya' })[0]).toHaveAttribute('href', '/akun');
  });
});

describe('Footer', () => {
  it('tamu: Masuk & Daftar Akun; kontak bawaan; dokumen legal; tanpa ikon WhatsApp di media sosial', async () => {
    renderAt(<Footer />);
    await act(async () => {});
    const akun = screen.getByRole('navigation', { name: 'Akun' });
    expect(within(akun).getAllByRole('link').map((a) => a.textContent)).toEqual(['Masuk', 'Daftar Akun']);

    const layanan = screen.getByRole('navigation', { name: 'Layanan' });
    expect(within(layanan).getByRole('link', { name: 'Website custom' })).toHaveAttribute('href', '/pesan-custom?layanan=website');
    expect(within(layanan).getByRole('link', { name: 'Aplikasi mobile custom' })).toHaveAttribute('href', '/pesan-custom?layanan=mobile');
    expect(within(layanan).getByRole('link', { name: 'Konsultasi Gratis' })).toBeInTheDocument();

    const legal = screen.getByRole('navigation', { name: 'Dokumen legal' });
    expect(within(legal).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      LEGAL_PATHS.terms,
      LEGAL_PATHS.privacy,
      LEGAL_PATHS.refund,
    ]);

    const mails = screen.getAllByRole('link', { name: /info@garudanexa\.com/ });
    expect(mails[0]).toHaveAttribute('href', 'mailto:info@garudanexa.com');
    const phones = screen.getAllByRole('link', { name: '0851-8800-9152' });
    expect(phones[0]).toHaveAttribute('href', 'tel:+6285188009152');

    expect(screen.queryByRole('list', { name: 'Media sosial' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pesan Custom' })).toHaveAttribute('href', '/pesan-custom');
  });

  it('customer melihat Akun Saya; staf melihat Panel Admin', () => {
    login('customer');
    const { unmount } = renderAt(<Footer />);
    expect(within(screen.getByRole('navigation', { name: 'Akun' })).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Akun Saya',
    ]);
    unmount();
    login('admin');
    renderAt(<Footer />);
    expect(within(screen.getByRole('navigation', { name: 'Akun' })).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Panel Admin',
    ]);
  });
});

describe('FloatingWhatsApp', () => {
  it('di HP mulai tersembunyi bila menjaga hero; tanpa hideOverId selalu tampil', () => {
    const { unmount } = renderAt(<FloatingWhatsApp href="https://wa.me/6285188009152" hideOverId="beranda" />);
    expect(screen.getByRole('link', { name: 'Chat WhatsApp' }).className).toContain('max-sm:invisible');
    unmount();
    renderAt(<FloatingWhatsApp href="https://wa.me/6285188009152" />);
    const link = screen.getByRole('link', { name: 'Chat WhatsApp' });
    expect(link.className).not.toContain('max-sm:invisible');
    expect(link).toHaveAttribute('target', '_blank');
  });
});

describe('helper setting & sesi', () => {
  it('nomor telepon & WhatsApp', () => {
    expect(displayPhone('085188009152')).toBe('0851-8800-9152');
    expect(displayPhone('+62 851-8800-9152')).toBe('0851-8800-9152');
    expect(displayPhone('(021) 555-1234')).toBe('(021) 555-1234');
    expect(telHref('085188009152')).toBe('tel:+6285188009152');
    expect(telHref('+62 851 8800 9152')).toBe('tel:+6285188009152');
    expect(telHref('')).toBe('');
    expect(getWhatsappNumber({ footer_whatsapp: '0812-0000-1111' })).toBe('6281200001111');
    expect(getWhatsappNumber({})).toBe('6285188009152');
    expect(getContactEmail({})).toBe('info@garudanexa.com');
    expect(getContactEmail({ footer_email: ' halo@contoh.id ' })).toBe('halo@contoh.id');
  });

  it('catatan harga template: bawaan, isi admin, dan dikosongkan', () => {
    expect(getTemplatePricing({})).toEqual({ includes: [...TEMPLATE_PRICE_INCLUDES_DEFAULT], note: TEMPLATE_PRICE_NOTE_DEFAULT });
    expect(getTemplatePricing({ template_price_includes: '- Template\n\n• Domain 1 tahun \r\nSSL', template_price_note: ' Catatan ' })).toEqual({
      includes: ['Template', 'Domain 1 tahun', 'SSL'],
      note: 'Catatan',
    });
    expect(getTemplatePricing({ template_price_includes: '', template_price_note: '' })).toEqual({ includes: [], note: '' });
  });

  it('jenis sesi & tautan akun', () => {
    expect(sessionKind(null)).toBe('guest');
    expect(sessionKind('customer')).toBe('customer');
    expect(sessionKind('user')).toBe('staff');
    expect(accountLinkFor(null)).toEqual({ to: '/masuk', label: 'Masuk' });
    expect(accountLinkFor('admin')).toEqual({ to: '/admin', label: 'Panel Admin' });
  });
});

describe('apiGet get_templates', () => {
  beforeEach(() => clearApiCache());

  it('pemanggil bersamaan berbagi satu request', async () => {
    fetchMock.mockImplementation(async () => json(200, { templates: [{ slug: 'a' }] }));
    const [a, b] = await Promise.all([apiGet('get_templates'), apiGet('get_templates')]);
    expect(a).toBe(b);
    await apiGet('get_templates');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Aksi lain tidak di-cache
    await apiGet('get_template', { slug: 'a' });
    await apiGet('get_template', { slug: 'a' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('request gagal tidak disimpan, jadi "Coba lagi" meminta ulang', async () => {
    fetchMock.mockImplementationOnce(async () => json(500, { error: 'Server sibuk' }));
    await expect(apiGet('get_templates')).rejects.toThrow('Server sibuk');
    fetchMock.mockImplementationOnce(async () => json(200, { templates: [] }));
    await expect(apiGet('get_templates')).resolves.toEqual({ templates: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('halaman legal', () => {
  const renderLegal = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={LEGAL_PATHS.terms} element={<SyaratKetentuan />} />
          <Route path={LEGAL_PATHS.privacy} element={<KebijakanPrivasi />} />
          <Route path={LEGAL_PATHS.refund} element={<KebijakanPengembalianDana />} />
        </Routes>
      </MemoryRouter>,
    );

  it.each([
    [LEGAL_PATHS.terms, 'Syarat & Ketentuan'],
    [LEGAL_PATHS.privacy, 'Kebijakan Privasi'],
    [LEGAL_PATHS.refund, 'Kebijakan Pengembalian Dana'],
  ])('%s: judul, tanggal pembaruan, daftar isi, dan judul tab', (path, title) => {
    renderLegal(path);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    const time = document.querySelector('time');
    expect(time).toHaveAttribute('dateTime', '2026-10-21');
    expect(time?.parentElement).toHaveTextContent('Terakhir diperbarui: 21 Oktober 2026');
    expect(screen.getAllByRole('navigation', { name: 'Daftar isi' }).length).toBeGreaterThan(0);
    // Judul tab dari head (src/seo/pages/legal.seo.ts lewat SeoManager/prerender), bukan dari halamannya
    expect(getHead(path, { settings: {}, navbar: [], templates: [], projects: [], templateBySlug: {}, builtAt: '' }).title).toBe(`${title} | Garuda Nexa`);
  });

  it('refund: dana penuh ke metode semula dalam 7 hari kerja', () => {
    renderLegal(LEGAL_PATHS.refund);
    const main = screen.getByRole('main');
    expect(main).toHaveTextContent(/dikembalikan penuh ke metode pembayaran semula, paling lambat 7 hari kerja setelah pesanan ditolak/);
  });

  it('S&K: isi harga tahun pertama & metode pembayaran generik', () => {
    renderLegal(LEGAL_PATHS.terms);
    const main = screen.getByRole('main');
    expect(main).toHaveTextContent(/domain, hosting, dan sertifikat SSL \(HTTPS\) untuk tahun pertama/);
    expect(main).toHaveTextContent(/metode pembayaran yang tersedia di Midtrans/);
    expect(main).not.toHaveTextContent(/QRIS|Virtual Account|GoPay/);
  });
});
