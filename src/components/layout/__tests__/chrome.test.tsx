// @vitest-environment jsdom
// Chrome publik bersama (paket "fondasi"): Navbar (menu HP, skip link, tanpa sakelar bahasa), Footer (kolom halaman
// hub SEO WP5, baris fakta, akun, media sosial), helper setting, cache apiGet, dan halaman legal.
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
import { clearCachedJson } from '../../../hooks/useCachedJson';
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

  it('menu bawaan (SEO WP5): Template · Jasa ▾ · Harga · Panduan sebagai tautan halaman, halaman aktif ditandai', async () => {
    renderAt(<Navbar />, '/template/aura-studio');
    await act(async () => {});
    const desktop = screen.getByRole('navigation', { name: 'Navigasi utama' });
    expect(within(desktop).getByRole('link', { name: 'Template' })).toHaveAttribute('href', '/template');
    expect(within(desktop).getByRole('link', { name: 'Template' })).toHaveAttribute('aria-current', 'page');
    expect(within(desktop).getByRole('link', { name: 'Harga' })).toHaveAttribute('href', '/harga');
    expect(within(desktop).getByRole('link', { name: 'Panduan' })).toHaveAttribute('href', '/panduan');
    expect(within(desktop).getByRole('button', { name: 'Jasa' })).toHaveAttribute('aria-expanded', 'false');
    // Menu HP selalu ada di HTML (inert saat tertutup): sub-menu Jasa terbaca crawler sebagai <a href>
    const mobile = document.getElementById('menu-hp') as HTMLElement;
    const hrefs = Array.from(mobile.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/template', '/jasa-pembuatan-website', '/jasa-pembuatan-aplikasi-mobile', '/harga', '/panduan']));
    expect(hrefs.some((href) => href?.includes('#templates') || href?.includes('#faq'))).toBe(false);
    // CTA kanan tetap "Konsultasi Gratis"
    expect(screen.getAllByRole('link', { name: /Konsultasi/ }).length).toBeGreaterThan(0);
  });

  it('menu dari Navbar Manager tetap dipakai bila ada (kontrol admin)', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const action = new URL(String(input), 'http://localhost').searchParams.get('action');
      if (action === 'get_navbar_menus') {
        return json(200, [
          { id: 1, parent_id: null, label_id: 'Katalog', label_en: 'Catalog', url: '/template', icon: 'Globe', description_id: null, description_en: null, sort_order: 1 },
          { id: 9, parent_id: null, label_id: 'Kontak', label_en: 'Contact', url: '/kontak', icon: 'Globe', description_id: null, description_en: null, sort_order: 2 },
        ]);
      }
      return json(200, action === 'get_settings' ? {} : []);
    });
    clearCachedJson();
    renderAt(<Navbar />, '/kontak');
    const desktop = screen.getByRole('navigation', { name: 'Navigasi utama' });
    expect(await within(desktop).findByRole('link', { name: 'Katalog' })).toHaveAttribute('href', '/template');
    expect(within(desktop).getByRole('link', { name: 'Kontak' })).toHaveAttribute('aria-current', 'page');
    expect(within(desktop).queryByRole('link', { name: 'Panduan' })).toBeNull();
    clearCachedJson();
  });
});

describe('Footer', () => {
  it('tamu: Masuk & Daftar Akun; kolom halaman hub (SEO WP5); baris fakta; tanpa ikon media sosial "#"', async () => {
    renderAt(<Footer />);
    await act(async () => {});
    const akun = screen.getByRole('navigation', { name: 'Akun' });
    expect(within(akun).getAllByRole('link').map((a) => a.textContent)).toEqual(['Masuk', 'Daftar Akun']);

    const hrefs = (name: string) => within(screen.getByRole('navigation', { name })).getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs('Template')).toEqual([
      '/template',
      '/template/kategori/company-profile',
      '/template/kategori/kecantikan-klinik',
      '/template/kategori/olahraga-komunitas',
      '/template/kategori/fintech-startup',
    ]);
    expect(hrefs('Jasa')).toEqual(['/jasa-pembuatan-website', '/jasa-pembuatan-aplikasi-mobile', '/pesan-custom', '/harga']);
    expect(hrefs('Perusahaan')).toEqual(['/tentang', '/panduan', '/kontak']);
    expect(hrefs('Legal')).toEqual([LEGAL_PATHS.terms, LEGAL_PATHS.privacy, LEGAL_PATHS.refund]);
    // Tidak ada anchor beranda (#templates, #faq, …) di kolom tautan
    for (const link of document.querySelectorAll('footer nav a')) expect(link.getAttribute('href')).not.toMatch(/#/);

    // Baris fakta dari COMPANY_FACTS: nama badan hukum, WhatsApp, email; alamat null tidak dirender
    const facts = document.querySelector('footer address') as HTMLElement;
    expect(facts).toHaveTextContent('PT Garuda Nexa Bahtera');
    expect(within(facts).getByRole('link', { name: /WhatsApp 0851-8800-9152/ })).toHaveAttribute('href', expect.stringContaining('https://wa.me/6285188009152'));
    expect(within(facts).getByRole('link', { name: /info@garudanexa\.com/ })).toHaveAttribute('href', 'mailto:info@garudanexa.com');
    expect(facts.textContent).not.toMatch(/Alamat|Jl\./);

    const phones = screen.getAllByRole('link', { name: '0851-8800-9152' });
    expect(phones[0]).toHaveAttribute('href', 'tel:+6285188009152');

    expect(screen.queryByRole('list', { name: 'Media sosial' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Pesan Custom' }).every((a) => a.getAttribute('href') === '/pesan-custom')).toBe(true);
  });

  it('ikon media sosial hanya untuk URL nyata (bukan "#" atau kosong)', async () => {
    clearCachedJson();
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const action = new URL(String(input), 'http://localhost').searchParams.get('action');
      if (action === 'get_settings') return json(200, { footer_instagram: 'https://instagram.com/contoh', footer_facebook: '#', footer_linkedin: '' });
      return json(200, []);
    });
    renderAt(<Footer />);
    const socials = await screen.findByRole('list', { name: 'Media sosial' });
    expect(within(socials).getAllByRole('link').map((a) => a.getAttribute('aria-label'))).toEqual(['Instagram']);
    clearCachedJson();
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
