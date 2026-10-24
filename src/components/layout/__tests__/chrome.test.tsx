// @vitest-environment jsdom
// Chrome publik bersama (paket "fondasi"): Navbar (menu HP, skip link, tanpa sakelar bahasa), Footer (kolom halaman
// hub SEO WP5, baris fakta, akun, media sosial), helper setting, cache apiGet, dan halaman legal.
// Jalankan: npx vitest run --dir src/components/layout
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('menu bawaan (SEO WP5): Template · Jasa ▾ · Harga · Panduan · Tentang sebagai tautan halaman, halaman aktif ditandai', async () => {
    renderAt(<Navbar />, '/template/aura-studio');
    await act(async () => {});
    const desktop = screen.getByRole('navigation', { name: 'Navigasi utama' });
    expect(within(desktop).getByRole('link', { name: 'Template' })).toHaveAttribute('href', '/template');
    expect(within(desktop).getByRole('link', { name: 'Template' })).toHaveAttribute('aria-current', 'page');
    expect(within(desktop).getByRole('link', { name: 'Harga' })).toHaveAttribute('href', '/harga');
    expect(within(desktop).getByRole('link', { name: 'Panduan' })).toHaveAttribute('href', '/panduan');
    // Tentang sesudah Panduan (pemilik 2026-10-24); Kontak tidak di navbar (dihapus lagi, migrasi 015)
    expect(within(desktop).getByRole('link', { name: 'Tentang' })).toHaveAttribute('href', '/tentang');
    expect(within(desktop).queryByRole('link', { name: 'Kontak' })).toBeNull();
    expect(
      within(desktop)
        .getAllByRole('link')
        .map((a) => a.textContent?.trim())
        .filter((t) => ['Harga', 'Panduan', 'Tentang', 'Kontak'].includes(t ?? '')),
    ).toEqual(['Harga', 'Panduan', 'Tentang']);
    expect(within(desktop).getByRole('button', { name: 'Jasa' })).toHaveAttribute('aria-expanded', 'false');
    // Menu HP selalu ada di HTML (inert saat tertutup): sub-menu Jasa terbaca crawler sebagai <a href>
    const mobile = document.getElementById('menu-hp') as HTMLElement;
    const hrefs = Array.from(mobile.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining(['/template', '/jasa-pembuatan-website', '/jasa-pembuatan-aplikasi-mobile', '/harga', '/panduan', '/tentang']),
    );
    expect(hrefs).not.toContain('/kontak');
    expect(hrefs.some((href) => href?.includes('#templates') || href?.includes('#faq'))).toBe(false);
    // Kanan (belum masuk): "Sign up" → /daftar dan "Log in" → /masuk (permintaan pemilik 2026-10-23)
    expect(screen.getAllByRole('link', { name: 'Sign up' })[0]).toHaveAttribute('href', '/daftar');
    expect(screen.getAllByRole('link', { name: 'Log in' })[0]).toHaveAttribute('href', '/masuk');
    expect(screen.queryByRole('link', { name: /Konsultasi/ })).toBeNull();
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

    // Ajakan #kontak gaya Mobbin (2026-10-24): tanpa chip "Konsultasi GRATIS" dan tanpa baris telepon/email (ada di
    // baris fakta); tombol gelap WhatsApp + tombol abu Pesan Custom; footer gelap dengan teks merek raksasa dekoratif
    const kontak = document.getElementById('kontak') as HTMLElement;
    expect(kontak).not.toHaveTextContent(/Konsultasi GRATIS|0851-8800-9152|info@garudanexa\.com/);
    expect(document.querySelector('footer a[href^="tel:"]')).toBeNull();
    expect(within(kontak).getByRole('link', { name: /Hubungi WhatsApp/ }).className).toContain('btn-dark');
    expect(within(kontak).getByRole('link', { name: 'Pesan Custom' })).toHaveAttribute('href', '/pesan-custom');
    expect(document.querySelector('footer')?.className).toContain('bg-fg');
    const wordmark = document.querySelector('footer svg[aria-hidden="true"] text') as SVGTextElement;
    expect(wordmark).toHaveTextContent('GARUDA NEXA');

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

  it('saklar Panduan di Pengaturan website menyembunyikan tautan Panduan di navbar & footer', async () => {
    clearCachedJson();
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const action = new URL(String(input), 'http://localhost').searchParams.get('action');
      if (action === 'get_settings') return json(200, { disabled_sections: '["panduan"]' });
      return json(200, []);
    });
    renderAt(
      <>
        <Navbar />
        <Footer />
      </>,
    );
    const company = await screen.findByRole('navigation', { name: 'Perusahaan' });
    await waitFor(() => expect(within(company).queryByRole('link', { name: 'Panduan' })).toBeNull());
    expect(within(company).getByRole('link', { name: 'Tentang' })).toBeInTheDocument();
    const desktop = screen.getByRole('navigation', { name: 'Navigasi utama' });
    await waitFor(() => expect(within(desktop).getByRole('link', { name: 'Tentang' })).toBeInTheDocument());
    expect(within(desktop).queryByRole('link', { name: 'Panduan' })).toBeNull();
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
  it('dok hanya berisi tombol Nexa (WhatsApp melayang dihapus); di HP mulai tersembunyi bila menjaga hero', () => {
    const { unmount } = renderAt(<FloatingWhatsApp href="https://wa.me/6285188009152" hideOverId="beranda" />);
    const launcher = screen.getByRole('button', { name: 'Tanya Nexa, asisten AI' });
    const dock = launcher.parentElement as HTMLElement;
    expect(dock.className).toContain('max-sm:invisible');
    // Tombol WhatsApp melayang dihapus (pemilik 2026-10-24); jalur WhatsApp lewat jawaban Nexa & footer
    expect(screen.queryByRole('link', { name: 'Chat WhatsApp' })).toBeNull();
    unmount();
    renderAt(<FloatingWhatsApp href="https://wa.me/6285188009152" />);
    const always = screen.getByRole('button', { name: 'Tanya Nexa, asisten AI' }).parentElement as HTMLElement;
    expect(always.className).not.toContain('max-sm:invisible');
  });

  it('tombol "Kembali ke atas" (beranda): muncul setelah menggulir, kaca buram, gulir halus ke atas', async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    renderAt(<FloatingWhatsApp href="https://wa.me/6285188009152" backToTop />);
    // Di atas halaman: belum ada tombolnya
    expect(screen.queryByRole('button', { name: 'Kembali ke atas' })).toBeNull();
    Object.defineProperty(window, 'scrollY', { value: 600, configurable: true });
    fireEvent.scroll(window);
    const top = await screen.findByRole('button', { name: 'Kembali ke atas' });
    // Kaca cair: latar putih tembus bergradasi dengan blur latar belakang
    expect(top.className).toContain('backdrop-blur');
    expect(top.className).toContain('from-white/80');
    fireEvent.click(top);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    fireEvent.scroll(window);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Kembali ke atas' })).toBeNull());
  });
});

describe('Nexa AI', () => {
  const WA = 'https://wa.me/6285188009152';

  /** Web Speech API palsu untuk menguji input suara. */
  class FakeRecognition {
    static instances: FakeRecognition[] = [];
    lang = '';
    interimResults = false;
    continuous = false;
    started = false;
    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((event: { error?: string }) => void) | null = null;
    constructor() {
      FakeRecognition.instances.push(this);
    }
    start() {
      this.started = true;
    }
    stop() {
      this.onend?.();
    }
    abort() {
      this.onerror?.({ error: 'aborted' });
      this.onend?.();
    }
  }

  /** fetch: nexa_chat dijawab `respond` (status/isi bebas); body POST dicatat. Aksi lain seperti mock bawaan. */
  const mockNexa = (respond: (body: Record<string, unknown>) => Response) => {
    const posts: Record<string, unknown>[] = [];
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const action = new URL(String(input), 'http://localhost').searchParams.get('action');
      if (action === 'nexa_chat') {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        posts.push(body);
        return respond(body);
      }
      if (action === 'get_settings') return json(200, {});
      return json(200, []);
    });
    return posts;
  };

  const openPanel = () => {
    renderAt(<FloatingWhatsApp href={WA} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tanya Nexa, asisten AI' }));
    return screen.getByRole('dialog', { name: 'Tanya Nexa AI' });
  };

  const ask = (panel: HTMLElement, text: string) => {
    fireEvent.change(within(panel).getByRole('textbox', { name: 'Tulis pesan untuk Nexa' }), { target: { value: text } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Kirim pesan' }));
  };

  it('tombol maskot membuka panel percakapan non-modal; fokus ke kolom pesan; Esc menutup & fokus kembali', async () => {
    renderAt(<FloatingWhatsApp href={WA} />);
    const launcher = screen.getByRole('button', { name: 'Tanya Nexa, asisten AI' });
    expect(launcher).toHaveAttribute('aria-expanded', 'false');
    expect(launcher).not.toHaveAttribute('aria-controls');
    expect(launcher.querySelector('img')).toHaveAttribute('src', '/assets/nexa/nexa-128.webp');
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(launcher);
    const panel = screen.getByRole('dialog', { name: 'Tanya Nexa AI' });
    expect(panel).toHaveAttribute('aria-modal', 'false');
    expect(launcher).toHaveAttribute('aria-expanded', 'true');
    expect(launcher).toHaveAttribute('aria-controls', panel.id);
    expect(document.activeElement).toBe(within(panel).getByRole('textbox', { name: 'Tulis pesan untuk Nexa' }));
    expect(within(panel).getByRole('log', { name: 'Percakapan dengan Nexa' })).toHaveTextContent(/Halo, saya Nexa/);
    expect(panel).toHaveTextContent('Nexa AI bisa keliru');

    // Esc dari kontrol lain di halaman (fokus di luar panel) tidak menutup chat
    const outside = document.createElement('input');
    document.body.appendChild(outside);
    outside.focus();
    fireEvent.keyDown(outside, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Tanya Nexa AI' })).toBeInTheDocument();
    outside.remove();

    within(panel).getByRole('textbox', { name: 'Tulis pesan untuk Nexa' }).focus();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });

  it('topik cepat dijawab teks tetap tanpa AI; AI belum aktif -> jawaban bawaan dari tanya jawab situs', async () => {
    const posts = mockNexa(() => json(503, { error: 'Nexa AI belum aktif.', code: 'NEXA_OFFLINE' }));
    const panel = openPanel();

    // Chip tetap di DOM (fokus keyboard tidak hilang), hanya aria-disabled selama Nexa mengetik; chip di luar role=log
    const chip = within(panel).getByRole('button', { name: 'Berapa harganya?' });
    chip.focus();
    fireEvent.click(chip);
    expect(chip).toBeInTheDocument();
    expect(document.activeElement).toBe(chip);
    expect(chip).toHaveAttribute('aria-disabled', 'true');
    expect(within(panel).getByRole('log').contains(chip)).toBe(false);
    expect(within(panel).getByRole('status')).toHaveTextContent('Nexa sedang mengetik');
    // Saat mengetik maskot berpikir (melirik ke atas)
    expect(within(panel).getByRole('log').querySelector('img[src*="nexa-pikir"]')).not.toBeNull();
    const toPricing = await within(panel).findByRole('link', { name: 'Lihat halaman harga' }, { timeout: 2000 });
    expect(toPricing).toHaveAttribute('href', '/harga');
    expect(chip).not.toHaveAttribute('aria-disabled');
    expect(posts).toHaveLength(0);

    const input = within(panel).getByRole('textbox', { name: 'Tulis pesan untuk Nexa' });
    const send = within(panel).getByRole('button', { name: 'Kirim pesan' });
    expect(send).toHaveAttribute('aria-disabled', 'true');
    fireEvent.change(input, { target: { value: 'Bisa bikin toko online?' } });
    fireEvent.click(send);
    expect(within(panel).getByText('Bisa bikin toko online?')).toBeInTheDocument();
    expect(input).toHaveValue('');
    // AI belum aktif (503): jawaban tanya jawab situs yang paling cocok + halaman yang tepat
    const service = await within(panel).findByRole('link', { name: 'Jasa pembuatan website' }, { timeout: 2000 });
    expect(service).toHaveAttribute('href', '/jasa-pembuatan-website');
    expect(panel).toHaveTextContent(/Website custom bisa berupa company profile, toko online/);
    // Riwayat dikirim ke nexa_chat: chip + jawabannya, lalu pertanyaan baru di akhir
    expect(posts).toHaveLength(1);
    expect(posts[0].messages).toEqual([
      { role: 'user', content: 'Berapa harganya?' },
      { role: 'assistant', content: expect.stringMatching(/^Harga template tertera/) },
      { role: 'user', content: 'Bisa bikin toko online?' },
    ]);

    // Tidak ada yang cocok: jujur + WhatsApp; maskot menyesal (maaf)
    ask(panel, 'Siapa juara piala dunia?');
    const wa = await within(panel).findByRole('link', { name: /Chat WhatsApp/ }, { timeout: 2000 });
    expect(wa).toHaveAttribute('href', WA);
    expect(wa).toHaveAttribute('target', '_blank');
    expect(panel).toHaveTextContent(/belum punya jawabannya/);
    expect(wa.closest('[data-message-id]')?.querySelector('img')?.getAttribute('src')).toContain('nexa-maaf');
  });

  it('jawaban AI: path situs & wa.me jadi tautan, Markdown tebal dibuang; batas pertanyaan (429) -> jawaban dari data situs', async () => {
    let status = 200;
    const posts = mockNexa(() =>
      status === 200
        ? json(200, {
            success: true,
            reply: 'Template **Aura Studio** cocok untuk klinik: lihat /template/aura-studio atau https://garudanexa.com/harga. Tanya tim kami di wa.me/6285188009152.',
          })
        : json(429, { error: 'Terlalu banyak percobaan. Coba lagi dalam 5 menit.' }),
    );
    const panel = openPanel();
    ask(panel, 'Template untuk klinik kecantikan?');
    const toTemplate = await within(panel).findByRole('link', { name: '/template/aura-studio' }, { timeout: 2000 });
    expect(toTemplate).toHaveAttribute('href', '/template/aura-studio');
    expect(within(panel).getByRole('link', { name: '/harga' })).toHaveAttribute('href', '/harga');
    const wa = within(panel).getByRole('link', { name: /wa\.me\/6285188009152/ });
    expect(wa).toHaveAttribute('href', 'https://wa.me/6285188009152');
    expect(wa).toHaveAttribute('target', '_blank');
    expect(within(panel).getByRole('log')).toHaveTextContent(/Template Aura Studio cocok/);
    expect(within(panel).getByRole('log')).not.toHaveTextContent(/\*\*/);
    expect(posts[0].messages).toEqual([{ role: 'user', content: 'Template untuk klinik kecantikan?' }]);

    // Klik tautan internal menutup panel (pengunjung pindah halaman)
    fireEvent.click(toTemplate);
    expect(screen.queryByRole('dialog')).toBeNull();

    status = 429;
    fireEvent.click(screen.getByRole('button', { name: 'Tanya Nexa, asisten AI' }));
    const again = screen.getByRole('dialog', { name: 'Tanya Nexa AI' });
    ask(again, 'Berapa harga Finova?');
    // Batas tercapai: Nexa tetap menjawab dari data situs (bukan pesan "sibuk" tanpa jawaban)
    const pricing = await within(again).findByRole('link', { name: 'Lihat halaman harga' }, { timeout: 2000 });
    expect(pricing).toHaveAttribute('href', '/harga');
    expect(again).toHaveTextContent(/Harga setiap template tertera/);
    // Riwayat percakapan tetap terkirim (jawaban AI sebelumnya ikut sebagai assistant)
    expect(posts[1].messages).toHaveLength(3);
  });

  it('maskot hidup: tombol berganti ekspresi sendiri tiap beberapa detik lalu kembali netral', () => {
    vi.useFakeTimers();
    try {
      renderAt(<FloatingWhatsApp href={WA} />);
      const launcher = () => screen.getByRole('button', { name: 'Tanya Nexa, asisten AI' });
      expect(launcher().querySelector('img')).toHaveAttribute('src', '/assets/nexa/nexa-128.webp');
      act(() => vi.advanceTimersByTime(5100));
      expect(launcher().querySelector('img')?.getAttribute('src')).toContain('nexa-kedip');
      act(() => vi.advanceTimersByTime(900));
      expect(launcher().querySelector('img')).toHaveAttribute('src', '/assets/nexa/nexa-128.webp');
      // Putaran kedua (detik ke-10): giliran ekspresi ceria
      act(() => vi.advanceTimersByTime(4100));
      expect(launcher().querySelector('img')?.getAttribute('src')).toContain('nexa-ceria');
    } finally {
      vi.useRealTimers();
    }
  });

  it('input suara: hasil final terkirim otomatis saat selesai bicara; dibatalkan tidak terkirim', async () => {
    FakeRecognition.instances = [];
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    mockNexa(() => json(503, { error: 'Nexa AI belum aktif.', code: 'NEXA_OFFLINE' }));
    const panel = openPanel();
    fireEvent.click(within(panel).getByRole('button', { name: /Bicara/ }));
    const rec = FakeRecognition.instances.at(-1) as FakeRecognition;
    expect(rec.started).toBe(true);
    expect(rec.lang).toBe('id-ID');
    const final = Object.assign([{ transcript: 'ada diskon' }], { isFinal: true });
    act(() => rec.onresult?.({ results: [final] }));
    expect(within(panel).getByRole('textbox', { name: 'Tulis pesan untuk Nexa' })).toHaveValue('ada diskon');
    act(() => rec.onend?.());
    // Pertanyaan terkirim tanpa menekan Kirim; jawaban bawaan diskon menyusul
    expect(within(panel).getByText('ada diskon')).toBeInTheDocument();
    expect(within(panel).getByRole('textbox', { name: 'Tulis pesan untuk Nexa' })).toHaveValue('');
    await within(panel).findByRole('link', { name: 'Lihat katalog template' }, { timeout: 2000 });

    // Dikte kedua dibatalkan (abort) → tidak ada kiriman baru
    fireEvent.click(within(panel).getByRole('button', { name: /Bicara/ }));
    const second = FakeRecognition.instances.at(-1) as FakeRecognition;
    const partial = Object.assign([{ transcript: 'berapa' }], { isFinal: true });
    act(() => second.onresult?.({ results: [partial] }));
    act(() => second.abort());
    expect(within(panel).queryByText('berapa')).toBeNull();
    expect(within(panel).getByRole('textbox', { name: 'Tulis pesan untuk Nexa' })).toHaveValue('berapa');
  });

  it('riwayat ke nexa_chat: jawaban AI panjang dipotong 4000 karakter, jadi percakapan tetap sah di backend', async () => {
    const long = 'Panjang. '.repeat(600);
    const posts = mockNexa(() => json(200, { success: true, reply: long }));
    const panel = openPanel();
    ask(panel, 'Ceritakan semua layanan');
    await waitFor(() => expect(within(panel).getByRole('log')).toHaveTextContent(/Panjang\. Panjang\./), { timeout: 2000 });
    ask(panel, 'Lanjut');
    await waitFor(() => expect(posts).toHaveLength(2), { timeout: 2000 });
    const sent = posts[1].messages as { role: string; content: string }[];
    expect(sent.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect([...sent[1].content]).toHaveLength(4000);
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
