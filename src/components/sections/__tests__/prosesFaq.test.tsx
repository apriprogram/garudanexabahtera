// @vitest-environment jsdom
// FAQ beranda (paket "proses-faq-404"): satu-terbuka yang tidak menggeser pertanyaan yang diketuk, hover baris
// tertutup yang terlihat, dan metode pembayaran yang tidak dirinci. Section Proses dihapus (diganti #keunggulan,
// tesnya di keunggulan.test.tsx).
// Jalankan: npx vitest run --dir src/components/sections
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SiteSettings } from '../../../hooks/useSiteSettings';
import FAQ from '../FAQ';

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
