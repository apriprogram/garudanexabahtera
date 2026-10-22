// @vitest-environment jsdom
// Proses & FAQ beranda (paket "proses-faq-404"): FAQ satu-terbuka yang tidak menggeser pertanyaan yang diketuk,
// hover baris tertutup yang terlihat, tombol nyata di kartu 01 Proses (bukan tombol tiruan di ilustrasi), tombol
// tiruan diredam, tombol kartu lebar sesudah langkah 04-06 di HP, dan metode pembayaran yang tidak dirinci.
// Jalankan: npx vitest run --dir src/components/sections
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SiteSettings } from '../../../hooks/useSiteSettings';
import FAQ from '../FAQ';
import Process from '../Process';

// Setting website per tes; helper lain (readList, getHiddenSections, dst.) tetap asli
let mockSettings: SiteSettings = {};
vi.mock('../../../hooks/useSiteSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useSiteSettings')>()),
  useSiteSettings: () => ({ settings: mockSettings, loaded: true }),
}));

beforeEach(() => {
  mockSettings = {};
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const renderAt = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

const rect = (top: number) => ({ top, bottom: top + 48, left: 0, right: 300, width: 300, height: 48, x: 0, y: top }) as DOMRect;

/** Grid pembungkus jawaban (role=region) milik tombol pertanyaan. */
const panelOf = (button: HTMLElement) => document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement;

describe('FAQ (#faq)', () => {
  it('membuka pertanyaan lain tanpa menggeser baris yang diketuk (C-03)', () => {
    renderAt(<FAQ />);
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    const [q1, q2] = screen.getAllByRole('button', { name: /\?$/ });
    expect(q1).toHaveAttribute('aria-expanded', 'true');

    // Saat diketuk Q2 di 309px; setelah jawaban Q1 menutup, Q2 naik ke 163px → halaman digeser -146px sebelum digambar
    vi.spyOn(q2, 'getBoundingClientRect').mockReturnValueOnce(rect(309)).mockReturnValue(rect(163));
    fireEvent.click(q2);

    expect(q1).toHaveAttribute('aria-expanded', 'false');
    expect(q2).toHaveAttribute('aria-expanded', 'true');
    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith({ top: -146, behavior: 'instant' });

    // Menutup: seketika; membuka: 300ms; keduanya menghormati reduced motion
    expect(panelOf(q1).className).toContain('duration-0');
    expect(panelOf(q2).className).toContain('duration-300');
    for (const button of [q1, q2]) {
      expect(panelOf(button).className).toContain('motion-reduce:transition-none');
      expect(panelOf(button).querySelector('p')!.className).toContain('motion-reduce:transition-none');
      expect(panelOf(button).className).not.toContain('duration-500');
    }
  });

  it('tidak menggulir bila baris yang diketuk tidak berpindah', () => {
    renderAt(<FAQ />);
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    const [q1] = screen.getAllByRole('button', { name: /\?$/ });
    vi.spyOn(q1, 'getBoundingClientRect').mockReturnValue(rect(200));
    fireEvent.click(q1);
    expect(q1).toHaveAttribute('aria-expanded', 'false');
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('baris tertutup punya hover yang terlihat: garis baris + ikon biru (C-13)', () => {
    renderAt(<FAQ />);
    const closed = screen.getAllByRole('button', { name: /\?$/ })[1];
    const row = closed.closest('h3')!.parentElement!;
    expect(row.className).toContain('bg-alt');
    expect(row.className).toContain('hover:ring-line-strong');
    expect(closed.className).toContain('group');
    const icon = closed.lastElementChild as HTMLElement;
    expect(icon.className).toContain('group-hover:text-primary');
    expect(icon.className).toContain('group-hover:ring-line-strong');
  });

  it('jawaban metode pembayaran tidak merinci metode tertentu', () => {
    renderAt(<FAQ />);
    fireEvent.click(screen.getByRole('button', { name: /Metode pembayaran apa saja/ }));
    const answer = screen.getByRole('region', { name: /Metode pembayaran apa saja/ });
    expect(answer).toHaveTextContent('metode pembayaran yang tersedia di Midtrans');
    expect(answer).not.toHaveTextContent(/QRIS|virtual account|e-wallet|kartu kredit/i);
  });
});

describe('Proses (#process)', () => {
  it('kartu 01 punya tombol nyata ke katalog di luar ilustrasi; tombol tiruan diredam & tidak bisa diklik (C-05)', () => {
    renderAt(<Process />);
    const panel = screen.getByRole('tabpanel');
    const link = within(panel).getByRole('link', { name: 'Lihat template' });
    expect(link).toHaveAttribute('href', '/#templates');
    expect(link.closest('[aria-hidden]')).toBeNull();
    expect(link.closest('article')).toHaveTextContent('Pilih template');
    // Pil "Lihat demo" + lingkaran panah hitam tiruan sudah tidak ada
    expect(within(panel).queryByText('Lihat demo')).not.toBeInTheDocument();

    for (const label of ['Lanjut bayar', 'Bayar sekarang']) {
      const mock = within(panel).getByText(label).closest('span')!;
      expect(mock.closest('[aria-hidden]')).not.toBeNull();
      expect(mock.className).toContain('pointer-events-none');
      expect(mock.className).toContain('bg-brand-200');
      expect(mock.className).not.toContain('bg-primary');
    }
    // Metode pembayaran tidak dirinci (keputusan pemilik), baik di teks maupun ilustrasi
    expect(panel).toHaveTextContent('metode pembayaran yang tersedia di Midtrans');
    expect(panel).not.toHaveTextContent(/QRIS|Virtual Account|E-wallet/);
  });

  it('label segmen di HP sama dengan toggle hero: "Siap pakai" / "Jasa custom" (A-08)', () => {
    renderAt(<Process />);
    const [template, custom] = screen.getAllByRole('tab');
    expect(within(template).getByText('Siap pakai')).toHaveClass('sm:hidden');
    expect(within(template).getByText('Template siap pakai')).toHaveClass('hidden', 'sm:inline');
    expect(within(custom).getByText('Jasa custom')).toHaveClass('sm:hidden');
    expect(within(custom).getByText('Website & aplikasi custom')).toHaveClass('hidden', 'sm:inline');
  });

  it('kartu ringkas di HP, tetap sama mulai 640px (C-06)', () => {
    renderAt(<Process />);
    const articles = within(screen.getByRole('tabpanel')).getAllByRole('article');
    expect(articles[0].className).toContain('min-h-0 sm:min-h-[320px] lg:min-h-0');
    expect(articles[1].className).toContain('min-h-0 sm:min-h-[320px] lg:min-h-0');
    expect(articles[2].className).toContain('min-h-[460px] sm:min-h-[560px] lg:min-h-0');
  });

  it('tombol kartu lebar berada di akhir alur di HP & tablet, di kolom teks di desktop (C-06)', () => {
    renderAt(<Process />);
    const cta = screen.getByRole('link', { name: 'Pilih Template' });
    const actions = cta.parentElement!;
    expect(actions.className).toContain('order-last');
    expect(actions.className).toContain('lg:order-none');
    // Kolom teks "dilebur" di bawah lg agar `order-last` berlaku terhadap ilustrasi langkah 04-06
    expect(actions.parentElement!.className).toContain('contents lg:block');
    expect(screen.getByRole('list', { name: 'Langkah 4 sampai 6' })).toBeInTheDocument();
  });

  it('katalog disembunyikan admin: tanpa tombol ke #templates; alur custom memakai "Pesan Custom"', () => {
    mockSettings = { disabled_sections: JSON.stringify(['templates']) };
    renderAt(<Process />);
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).queryByRole('link', { name: 'Lihat template' })).not.toBeInTheDocument();
    expect(within(panel).queryByRole('link', { name: /Pilih Template/ })).not.toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Konsultasi Gratis' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /custom/i }));
    expect(within(screen.getByRole('tabpanel')).getByRole('link', { name: 'Pesan Custom' })).toHaveAttribute('href', '/pesan-custom');
  });
});
