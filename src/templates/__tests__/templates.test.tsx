// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TEMPLATES, getTemplate, resolveContent } from '../index';
import { SiteRenderer } from '../SiteRenderer';
import { accentVars, mapsInfo, safeImage, safeUrl, whatsappHref } from '../shared/utils';
import type { SiteContent } from '../types';

afterEach(cleanup);

const defs = Object.values(TEMPLATES);

describe('registry', () => {
  it('memuat semua template katalog', () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual(['arena-club', 'aura-studio', 'corporate-nexa', 'finova', 'startup-clean']);
    for (const def of defs) {
      expect(def.code).toBeTruthy();
      expect(def.sections.length).toBeGreaterThan(5);
      for (const section of def.sections) expect(def.defaultContent[section.key]).toBeTypeOf('object');
    }
  });

  it('getTemplate aman untuk kode aneh', () => {
    expect(getTemplate('corporate-nexa')?.name).toBe('Corporate Nexa');
    expect(getTemplate(' Startup-Clean ')?.code).toBe('startup-clean');
    expect(getTemplate('arena-club')?.name).toBe('Arena Club');
    expect(getTemplate('AURA-STUDIO')?.name).toBe('Aura Studio');
    expect(getTemplate('finova')?.name).toBe('Finova');
    for (const code of ['constructor', '__proto__', 'toString', '', null, undefined, 'tidak-ada']) expect(getTemplate(code)).toBeUndefined();
  });
});

describe('resolveContent', () => {
  const def = TEMPLATES['corporate-nexa'];

  it('null → konten bawaan, semua section enabled', () => {
    const content = resolveContent(def, null);
    for (const key of Object.keys(def.defaultContent)) expect(content[key].enabled).toBe(true);
    expect(content.brand.company_name).toBe(def.defaultContent.brand.company_name);
  });

  it('nilai tersimpan menimpa bawaan, sisanya tetap bawaan', () => {
    const content = resolveContent(def, { hero: { title: 'Judul baru' } });
    expect(content.hero.title).toBe('Judul baru');
    expect(content.hero.subtitle).toBe(def.defaultContent.hero.subtitle);
    expect(content.about.title).toBe(def.defaultContent.about.title);
  });

  it('list tersimpan mengganti list bawaan (termasuk list kosong)', () => {
    expect(resolveContent(def, { services: { items: [{ title: 'A' }] } }).services.items).toEqual([{ title: 'A' }]);
    expect(resolveContent(def, { gallery: { items: [] } }).gallery.items).toEqual([]);
  });

  it('tipe salah diabaikan, enabled dinormalisasi', () => {
    const content = resolveContent(def, {
      hero: 'bukan objek',
      services: { items: 'bukan list', title: ['x'] },
      about: { title: 5, enabled: 'false', image: null },
      gallery: { items: [null, 'x', { image: 1, caption: { a: 1 } }] },
    } as unknown as SiteContent);
    expect(content.hero.title).toBe(def.defaultContent.hero.title);
    expect(content.services.items).toEqual(def.defaultContent.services.items);
    expect(content.services.title).toBe(def.defaultContent.services.title);
    expect(content.about.title).toBe('5');
    expect(content.about.enabled).toBe(false);
    // null → nilai bawaan dipertahankan (bawaan Corporate Nexa kini foto demo)
    expect(content.about.image).toBe(def.defaultContent.about.image);
    expect(content.gallery.items).toEqual([{ image: '1' }]);
  });

  it('menerima string JSON dan string rusak', () => {
    expect(resolveContent(def, JSON.stringify({ brand: { company_name: 'PT Uji' } })).brand.company_name).toBe('PT Uji');
    expect(resolveContent(def, '{rusak').brand.company_name).toBe(def.defaultContent.brand.company_name);
  });
});

describe('utils', () => {
  it('URL berbahaya ditolak', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,hi')).toBeNull();
    expect(safeUrl('instagram.com/x')).toBe('https://instagram.com/x');
    expect(safeImage('javascript:alert(1)')).toBe('');
    expect(safeImage('assets/sites/1/a.png')).toBe('/assets/sites/1/a.png');
    expect(safeImage('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
  });

  it('nomor WhatsApp dinormalisasi', () => {
    expect(whatsappHref('0812-3456-7890')).toBe('https://wa.me/6281234567890');
    expect(whatsappHref('+62 812 3456 7890')).toBe('https://wa.me/6281234567890');
    expect(whatsappHref('abc')).toBe('');
  });

  it('peta: embed dari alamat, iframe ditempel diambil src-nya', () => {
    expect(mapsInfo('', 'Jl. Contoh 1').embed).toContain('output=embed');
    expect(mapsInfo('<iframe src="https://www.google.com/maps/embed?pb=abc"></iframe>', '').embed).toBe('https://www.google.com/maps/embed?pb=abc');
    expect(mapsInfo('javascript:alert(1)', '').embed).toBeNull();
  });

  it('warna aksen tidak valid → fallback; aksen terang tetap terbaca', () => {
    const vars = accentVars('bukan warna', '#1D4ED8') as Record<string, string>;
    expect(vars['--tpl-accent']).toBe('#1d4ed8');
    const yellow = accentVars('#FFE600', '#1D4ED8') as Record<string, string>;
    expect(yellow['--tpl-on-accent']).not.toBe('#ffffff');
    expect(yellow['--tpl-accent-ink']).not.toBe('#ffe600');
  });
});

describe('render template', () => {
  for (const def of defs) {
    it(`${def.code}: konten bawaan (live & pratinjau)`, () => {
      for (const preview of [false, true]) {
        const { container, unmount } = render(<def.Component content={resolveContent(def, null)} preview={preview} />);
        expect(container.textContent).toContain(String(def.defaultContent.brand.company_name));
        expect(container.querySelectorAll('[data-tpl-section]').length).toBeGreaterThanOrEqual(8);
        if (preview) expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
        unmount();
      }
    });

    it(`${def.code}: konten aneh tidak membuat crash dan URL berbahaya dibuang`, () => {
      const hostile = {
        brand: { company_name: null, logo: 'javascript:alert(1)', accent_color: 'red' },
        hero: { title: null, highlight: 'x', primary_url: 'javascript:alert(1)', secondary_label: 'Lihat', secondary_url: '#tidak-ada' },
        about: { body: 42, points: 'bukan list' },
        services: { items: [null, 'x', { title: 123 }, { description: ['a'] }] },
        advantages: { stats: [{ value: '' }], items: {} },
        gallery: { items: [{ image: 'javascript:alert(1)' }] },
        testimonials: { items: [{ quote: 'Bagus' }] },
        cta: { title: 'Ayo', button_url: 'vbscript:x' },
        contact: { whatsapp: 'abc', email: 'bukan email', maps_url: 'javascript:alert(1)' },
        footer: { instagram: 'javascript:alert(1)', facebook: 'facebook.com/uji' },
      } as unknown as SiteContent;
      const { container } = render(<def.Component content={resolveContent(def, hostile)} />);
      const hrefs = Array.from(container.querySelectorAll('[href], [src]')).map((el) => el.getAttribute('href') ?? el.getAttribute('src') ?? '');
      expect(hrefs.some((h) => /^\s*(javascript|vbscript):/i.test(h))).toBe(false);
      expect(container.querySelector('a[href="https://facebook.com/uji"]')).not.toBeNull();
    });

    it(`${def.code}: section enabled=false tidak tampil`, () => {
      const off = Object.fromEntries(Object.keys(def.defaultContent).map((key) => [key, { enabled: false }]));
      const { container } = render(<def.Component content={resolveContent(def, off)} />);
      expect(container.querySelectorAll('[data-tpl-section]').length).toBe(0);
      expect(container.querySelector('footer')).toBeNull();
    });

    it(`${def.code}: komponen tahan konten mentah tanpa resolveContent`, () => {
      expect(() => render(<def.Component content={{} as SiteContent} />)).not.toThrow();
      expect(() => render(<def.Component content={null as unknown as SiteContent} />)).not.toThrow();
    });
  }

  it('SiteRenderer: kode template tidak dikenal → fallback', () => {
    const { container } = render(<SiteRenderer templateCode="tidak-ada" content={null} fallback={<p>fallback</p>} />);
    expect(container.textContent).toBe('fallback');
  });
});
