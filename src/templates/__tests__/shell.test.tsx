// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/shell.test.tsx
// Kerangka template bersama (paket "detail-demo"): menu HP ditutup sebelum menggulir ke section (D-02, juga situs live),
// dan mode pratinjau: tautan keluar memunculkan keterangan + diumumkan, tanpa warna hover, tombol WhatsApp tetap ada (D-04).
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATES, resolveContent } from '../index';
import { ActionLink, TemplateShell } from '../shared/Shell';
import { sectionFromAnchor } from '../shared/utils';
import type { SiteContent } from '../types';

const defs = Object.values(TEMPLATES);

let scrolls: { section: string | null; menusOpen: number }[] = [];

beforeEach(() => {
  scrolls = [];
  // Catat section tujuan dan apakah menu HP masih terbuka saat gulir dihitung
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolls.push({
      section: this.getAttribute('data-tpl-section'),
      menusOpen: document.querySelectorAll('nav[aria-label="Menu utama"]').length - 1,
    });
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const status = () => document.querySelector('[role="status"][aria-live="polite"]');

describe('menu HP template (D-02)', () => {
  for (const def of defs) {
    it(`${def.code}: menu ditutup dulu, baru menggulir ke section`, () => {
      render(<def.Component content={resolveContent(def, null)} />);
      fireEvent.click(screen.getByRole('button', { name: 'Buka menu' }));
      const navs = screen.getAllByRole('navigation', { name: 'Menu utama' });
      expect(navs).toHaveLength(2);

      // Galeri bila ada; template tanpa galeri (mis. Finova) memakai tautan section terakhir di menu
      const links = within(navs[1])
        .getAllByRole('link')
        .filter((a) => /^#/.test(a.getAttribute('href') ?? '') && a.getAttribute('href') !== '#beranda');
      const target = links.find((a) => a.textContent?.trim() === 'Galeri') ?? links[links.length - 1];
      expect(target).toBeDefined();
      fireEvent.click(target);

      expect(scrolls).toEqual([{ section: sectionFromAnchor(target.getAttribute('href') ?? ''), menusOpen: 0 }]);
      expect(screen.getByRole('button', { name: 'Buka menu' })).toHaveAttribute('aria-expanded', 'false');
    });
  }
});

describe('pratinjau: tautan keluar (D-04)', () => {
  for (const def of defs) {
    it(`${def.code}: tombol WhatsApp melayang tampil, klik memunculkan keterangan`, () => {
      render(<def.Component content={resolveContent(def, null)} preview />);
      const wa = screen.getByRole('link', { name: 'Chat WhatsApp' });
      expect(wa).not.toHaveAttribute('href');
      expect(wa).toHaveAttribute('aria-disabled', 'true');
      expect(wa.className).not.toMatch(/(^|\s)hover:/);
      expect(status()).toHaveTextContent('');

      fireEvent.click(wa);
      expect(status()).toHaveTextContent('Ini pratinjau. Di situs asli, tautan ini membuka WhatsApp.');
      // Keterangan visual (bukan untuk pembaca layar; isinya sudah diumumkan lewat region status)
      const bubbles = screen.getAllByText('Ini pratinjau. Di situs asli, tautan ini membuka WhatsApp.');
      expect(bubbles.some((el) => el.closest('[aria-hidden="true"]'))).toBe(true);
    });

    it(`${def.code}: situs live tetap memakai tautan WhatsApp sungguhan`, () => {
      render(<def.Component content={resolveContent(def, null)} />);
      expect(screen.getByRole('link', { name: 'Chat WhatsApp' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
      expect(status()).toBeNull();
    });
  }

  it('Enter juga memunculkan keterangan; tujuan disebut sesuai jenis tautan; keterangan hilang sendiri', () => {
    vi.useFakeTimers();
    render(
      <TemplateShell content={{} as SiteContent} preview defaultAccent="#2563eb">
        <ActionLink action={{ kind: 'external', href: 'tel:+62315550128' }} className="text-fg hover:text-muted @xl:hover:underline">
          Telepon
        </ActionLink>
        <ActionLink action={{ kind: 'external', href: 'mailto:halo@contoh.id' }}>Email</ActionLink>
        <ActionLink action={{ kind: 'external', href: 'https://maps.google.com/?q=Surabaya' }}>Peta</ActionLink>
        <ActionLink action={{ kind: 'external', href: 'https://www.instagram.com/contoh' }}>Instagram</ActionLink>
      </TemplateShell>,
    );
    const phone = screen.getByRole('link', { name: 'Telepon' });
    expect(phone.className).toBe('cursor-default text-fg');

    fireEvent.keyDown(phone, { key: 'Enter' });
    expect(status()).toHaveTextContent('Di situs asli, tautan ini membuka panggilan telepon.');
    fireEvent.click(screen.getByRole('link', { name: 'Email' }));
    expect(status()).toHaveTextContent('membuka aplikasi email.');
    fireEvent.click(screen.getByRole('link', { name: 'Peta' }));
    expect(status()).toHaveTextContent('membuka Google Maps.');
    fireEvent.click(screen.getByRole('link', { name: 'Instagram' }));
    expect(status()).toHaveTextContent('membuka Instagram.');

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(status()).toHaveTextContent('');
  });
});
