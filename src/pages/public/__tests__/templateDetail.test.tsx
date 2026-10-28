// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/public/__tests__/templateDetail.test.tsx
// Detail template & demo (paket "detail-demo"): harga + "Sudah termasuk" (D-08), bar pesan HP dengan Demo (D-09),
// galeri (ubin Lihat Demo D-03, geser D-07, lightbox mengunci fokus D-06), Template lainnya (D-12), bar demo (D-05/D-10/D-11).
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATE_PRICE_INCLUDES_DEFAULT, TEMPLATE_PRICE_NOTE_DEFAULT, type SiteSettings } from '../../../hooks/useSiteSettings';
import { clearApiCache } from '../../../lib/api';
import { useStore } from '../../../store/useStore';
import TemplateDemo from '../TemplateDemo';
import TemplateDetail from '../TemplateDetail';

// Kanvas hero/latar dekoratif tidak didukung jsdom dan tidak relevan untuk tes ini
vi.mock('../../../components/sections/hero/HeroBackground', () => ({ HeroBackground: () => null }));

// Setting website per tes (tanpa cache modul useCachedJson); helper lain (getTemplatePricing, dst.) tetap asli
let mockSettings: SiteSettings = {};
vi.mock('../../../hooks/useSiteSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useSiteSettings')>()),
  useSiteSettings: () => ({ settings: mockSettings, loaded: true }),
}));

const TEMPLATE = {
  id: 1,
  slug: 'corporate-nexa',
  name: 'Corporate Nexa',
  category: 'Company Profile',
  short_description: 'Company profile elegan untuk perusahaan jasa.',
  description: 'Template company profile lengkap.',
  features: ['Desain responsif untuk HP'],
  price: 1500000,
  preview_image: '/assets/templates/corporate-nexa-preview.svg',
  gallery: ['/assets/templates/corporate-nexa-1.svg', '/assets/templates/corporate-nexa-2.svg'],
  template_code: 'corporate-nexa',
  demo_url: null,
  status: 'published',
  sort_order: 1,
};

const OTHER = { ...TEMPLATE, id: 2, slug: 'startup-clean', name: 'Startup Clean', category: 'Startup', template_code: 'startup-clean' };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let templates: unknown[] = [TEMPLATE, OTHER];

const ORIGINAL_OBSERVER = window.IntersectionObserver;

/** IntersectionObserver tiruan: `visible` = tombol utama di panel terlihat (bar pesan HP tersembunyi). */
const observeAs = (visible: boolean) => {
  // Setup global memasangnya sebagai properti writable (tidak configurable), jadi diganti langsung
  window.IntersectionObserver = class {
    private cb: (entries: { isIntersecting: boolean }[]) => void;
    constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
      this.cb = cb;
    }
    observe() {
      this.cb([{ isIntersecting: visible }]);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
};

// jsdom lama tidak punya PointerEvent; React cukup butuh event bernama "pointerdown/up" dengan koordinat.
// Dipasang langsung (bukan vi.stubGlobal) agar tidak ikut dicabut unstubAllGlobals di afterEach.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  Object.assign(window, { PointerEvent: PointerEventPolyfill });
}

beforeEach(() => {
  clearApiCache();
  mockSettings = {};
  templates = [TEMPLATE, OTHER];
  Element.prototype.scrollIntoView = vi.fn();
  observeAs(true);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost');
      const action = url.searchParams.get('action');
      if (action === 'get_template') {
        const slug = url.searchParams.get('slug');
        const found = [TEMPLATE, OTHER].find((t) => t.slug === slug);
        return found ? json(200, { template: found }) : json(404, { error: 'Template tidak ditemukan.' });
      }
      if (action === 'get_templates') return json(200, { templates });
      return json(200, []);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.IntersectionObserver = ORIGINAL_OBSERVER;
  document.body.style.overflow = '';
});

const renderDetail = (slug = TEMPLATE.slug) =>
  render(
    <MemoryRouter initialEntries={[`/template/${slug}`]}>
      <Routes>
        <Route path="/template/:slug" element={<TemplateDetail />} />
      </Routes>
    </MemoryRouter>,
  );

/** H1 Lampiran A dari src/content/templates/corporate-nexa.ts. */
const H1 = 'Corporate Nexa: Template Website Company Profile Perusahaan';

const priceCard = async () => (await screen.findByText('Harga template')).parentElement as HTMLElement;

describe('/template/:slug: harga & bar pesan HP', () => {
  it('harga memuat daftar "Sudah termasuk" dan catatan perpanjangan dari setting bawaan (D-08)', async () => {
    renderDetail();
    const card = await priceCard();
    expect(within(card).getByText('Sudah termasuk')).toBeInTheDocument();
    for (const item of TEMPLATE_PRICE_INCLUDES_DEFAULT) expect(within(card).getByText(item)).toBeInTheDocument();
    expect(within(card).getByText(TEMPLATE_PRICE_NOTE_DEFAULT)).toBeInTheDocument();
  });

  it('cara memesan & jaminan refund: domain dipilih dan dibayar saat memesan, dana kembali termasuk harga domain', async () => {
    renderDetail();
    await screen.findByRole('heading', { level: 1, name: H1 });
    const steps = screen.getByRole('region', { name: 'Cara memesan & kapan website aktif' });
    expect(steps).toHaveTextContent('isi data pemesan, lalu pilih nama domain dan cek ketersediaannya. Bayar template dan domain online lewat Midtrans.');
    expect(steps).not.toHaveTextContent(/domain utama dan alternatif/);
    const card = await priceCard();
    const aside = card.closest('aside') as HTMLElement;
    expect(aside).toHaveTextContent('Pesanan lunas yang ditolak (mis. domain tidak bisa didaftarkan): dana kembali penuh, termasuk harga domain.');
  });

  it('setting harga yang dikosongkan admin menyembunyikan daftar, catatan, dan ringkasan bar HP', async () => {
    mockSettings = { template_price_includes: '', template_price_note: '' };
    renderDetail();
    await screen.findByRole('heading', { level: 1, name: H1 });
    expect(screen.getByText('Harga template')).toBeInTheDocument();
    expect(screen.queryByText('Sudah termasuk')).toBeNull();
    expect(screen.queryByText(TEMPLATE_PRICE_NOTE_DEFAULT)).toBeNull();
    expect(screen.queryByText(/^Termasuk /)).toBeNull();
  });

  it('bar HP: Demo + Pesan Template, ringkasan "Termasuk …", ikut keluar dari urutan Tab saat tersembunyi (D-09)', async () => {
    renderDetail();
    await screen.findByRole('heading', { level: 1, name: H1 });
    const order = screen.getByRole('link', { name: 'Pesan Template Corporate Nexa', hidden: true });
    const bar = order.closest('[aria-hidden]') as HTMLElement;
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    // Domain tidak lagi termasuk harga template (pemilik 2026-10-25): ringkasan dari daftar bawaan tanpa domain
    expect(within(bar).getByText('Termasuk hosting & SSL tahun pertama')).toBeInTheDocument();
    const links = within(bar).getAllByRole('link', { hidden: true });
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/demo/corporate-nexa', '/pesan/corporate-nexa']);
    expect(links[0]).toHaveAccessibleName('Lihat Demo Corporate Nexa');
    for (const link of links) expect(link).toHaveAttribute('tabindex', '-1');
    // Bar tersembunyi: dok Nexa tetap di tempat biasa
    expect(useStore.getState().isOrderBarShown).toBe(false);
  });

  it('bar HP tampil saat tombol panel tidak terlihat: kedua tombol bisa di-Tab', async () => {
    observeAs(false);
    const { unmount } = renderDetail();
    // Bar muncul setelah observer melaporkan tombol panel tidak terlihat (render berikutnya)
    const order = await screen.findByRole('link', { name: 'Pesan Template Corporate Nexa' }, { timeout: 5000 });
    const bar = order.closest('[aria-hidden]') as HTMLElement;
    expect(bar).toHaveAttribute('aria-hidden', 'false');
    const links = within(bar).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual(['Lihat Demo Corporate Nexa', 'Pesan Template Corporate Nexa']);
    for (const link of links) expect(link).not.toHaveAttribute('tabindex');
    // Dok Nexa (App.tsx → FloatingWhatsApp aboveOrderBar) naik di atas bar; meninggalkan halaman → turun lagi
    expect(useStore.getState().isOrderBarShown).toBe(true);
    unmount();
    expect(useStore.getState().isOrderBarShown).toBe(false);
  });

  it('demo_url eksternal: tombol Demo di bar membuka tab baru', async () => {
    templates = [TEMPLATE];
    const external = { ...TEMPLATE, demo_url: 'https://demo.contoh.id' };
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const action = new URL(String(input), 'http://localhost').searchParams.get('action');
      if (action === 'get_template') return json(200, { template: external });
      if (action === 'get_templates') return json(200, { templates });
      return json(200, []);
    });
    renderDetail();
    await screen.findByRole('heading', { level: 1, name: H1 });
    const order = screen.getByRole('link', { name: 'Pesan Template Corporate Nexa', hidden: true });
    const bar = order.closest('[aria-hidden]') as HTMLElement;
    const demo = within(bar).getByRole('link', { name: 'Lihat Demo Corporate Nexa (tab baru)', hidden: true });
    expect(demo).toHaveAttribute('href', 'https://demo.contoh.id');
    expect(demo).toHaveAttribute('target', '_blank');
  });

  it('badge nomor langkah tidak di bawah 11px (D-14)', async () => {
    renderDetail();
    await screen.findByRole('heading', { level: 1, name: H1 });
    const steps = within(screen.getByRole('heading', { name: 'Cara memesan & kapan website aktif' }).parentElement as HTMLElement).getAllByRole('listitem');
    for (const step of steps) expect(step.querySelector('.text-\\[11px\\]')).not.toBeNull();
  });
});

describe('/template/:slug: galeri', () => {
  const frame = () => screen.getByRole('button', { name: /^Perbesar / });

  it('3 gambar + ubin "Lihat Demo" mengisi 4 kolom, tanpa bayangan lama (D-03, D-12)', async () => {
    renderDetail();
    const thumbs = await screen.findByRole('list', { name: 'Pilih gambar' });
    expect(thumbs).toHaveClass('grid-cols-4');
    expect(within(thumbs).getAllByRole('listitem')).toHaveLength(4);
    expect(within(thumbs).getByRole('link', { name: 'Lihat Demo Corporate Nexa' })).toHaveAttribute('href', '/demo/corporate-nexa');
    expect(frame().closest('.shadow-soft')).toBeNull();
  });

  it('geser ke kiri = gambar berikutnya; klik sesudah geser tidak membuka lightbox (D-07)', async () => {
    renderDetail();
    await screen.findByRole('list', { name: 'Pilih gambar' });
    const surface = frame().parentElement as HTMLElement;
    expect(surface).toHaveClass('touch-pan-y');
    expect(surface).toHaveTextContent('1 / 3');

    fireEvent.pointerDown(surface, { clientX: 220, clientY: 100, pointerId: 1, isPrimary: true });
    fireEvent.pointerUp(surface, { clientX: 140, clientY: 108, pointerId: 1, isPrimary: true });
    fireEvent.click(frame());
    expect(surface).toHaveTextContent('2 / 3');
    expect(screen.queryByRole('dialog')).toBeNull();

    // Geser ke kanan kembali; gerakan kecil tetap dihitung sebagai ketukan (buka lightbox)
    fireEvent.pointerDown(surface, { clientX: 100, clientY: 100, pointerId: 2, isPrimary: true });
    fireEvent.pointerUp(surface, { clientX: 190, clientY: 100, pointerId: 2, isPrimary: true });
    expect(surface).toHaveTextContent('1 / 3');
    fireEvent.pointerDown(surface, { clientX: 100, clientY: 100, pointerId: 3, isPrimary: true });
    fireEvent.pointerUp(surface, { clientX: 112, clientY: 100, pointerId: 3, isPrimary: true });
    fireEvent.click(frame());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('lightbox: Tab berputar di dalam dialog, Escape menutup dan fokus kembali (D-06)', async () => {
    renderDetail();
    await screen.findByRole('list', { name: 'Pilih gambar' });
    const opener = frame();
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Galeri Corporate Nexa' });
    const close = within(dialog).getByRole('button', { name: 'Tutup galeri' });
    const next = within(dialog).getByRole('button', { name: 'Gambar berikutnya' });
    expect(close).toHaveFocus();

    next.focus();
    fireEvent.keyDown(next, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(next).toHaveFocus();

    fireEvent.keyDown(next, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(frame()).toHaveFocus();
  });
});

describe('/template/:slug: Template lainnya (D-12)', () => {
  it('satu template lain = kartu lebar dengan Lihat Detail & Lihat Demo, ditambah ubin Pesan Custom', async () => {
    renderDetail();
    const section = await screen.findByRole('region', { name: 'Template lainnya' });
    const detail = await within(section).findByRole('link', { name: 'Lihat Detail Startup Clean' });
    expect(detail).toHaveAttribute('href', '/template/startup-clean');
    expect(within(section).getByRole('link', { name: 'Lihat Demo Startup Clean' })).toHaveAttribute('href', '/demo/startup-clean');
    expect(within(section).getByRole('link', { name: /Pesan Custom/ })).toHaveAttribute('href', '/pesan-custom?layanan=website');
    expect(within(section).getByRole('link', { name: /Lihat Semua Template/ })).toHaveAttribute('href', '/template');
    expect(section.querySelector('.shadow-soft, .hover\\:shadow-float')).toBeNull();
    expect(section.querySelectorAll('.card-flat')).toHaveLength(2);
  });

  it('dua template lain = dua kartu + ubin Pesan Custom (baris 3 kolom penuh)', async () => {
    templates = [TEMPLATE, OTHER, { ...OTHER, id: 3, slug: 'resto-hangat', name: 'Resto Hangat' }];
    renderDetail();
    const section = await screen.findByRole('region', { name: 'Template lainnya' });
    await within(section).findByRole('link', { name: 'Resto Hangat' });
    expect(within(section).getAllByRole('listitem')).toHaveLength(3);
    expect(within(section).getByRole('link', { name: /Pesan Custom/ })).toBeInTheDocument();
  });
});

describe('/demo/:slug', () => {
  const renderDemo = () =>
    render(
      <MemoryRouter initialEntries={['/demo/corporate-nexa']}>
        <Routes>
          <Route path="/demo/:slug" element={<TemplateDemo />} />
        </Routes>
      </MemoryRouter>,
    );

  it('label sesuai glosarium dan tombol kembali punya area sentuh yang diperluas (D-10, D-14)', async () => {
    renderDemo();
    const order = await screen.findByRole('link', { name: 'Pesan Template Corporate Nexa' }, { timeout: 5000 });
    expect(order).toHaveAttribute('href', '/pesan/corporate-nexa');
    expect(order).toHaveTextContent('Pesan Template');
    expect(screen.getByRole('link', { name: 'Kembali ke detail template' }).className).toMatch(/after:-inset-1/);
  });

  it('layar lebar: tombol HP terpilih jelas, bingkai HP = viewport 390px tanpa scrollbar (D-05, D-11)', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ ...original(query), matches: query === '(min-width: 1024px)' })) as typeof window.matchMedia;
    try {
      renderDemo();
      const group = await screen.findByRole('group', { name: 'Ukuran pratinjau' });
      const phone = within(group).getByRole('button', { name: 'HP' });
      expect(phone.className).toMatch(/aria-pressed:ring-line-strong/);
      expect(phone.className).not.toMatch(/shadow-soft/);
      act(() => phone.click());
      expect(phone).toHaveAttribute('aria-pressed', 'true');
      const viewport = document.querySelector('.w-\\[390px\\]');
      expect(viewport).not.toBeNull();
      expect(viewport).toHaveClass('no-scrollbar');
      expect(viewport).not.toHaveClass('custom-scrollbar');
      // Tombol WhatsApp melayang ikut tampil di demo (D-04)
      expect(within(viewport as HTMLElement).getByRole('link', { name: 'Chat WhatsApp' })).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });
});
