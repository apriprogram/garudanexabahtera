// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/startup-clean.test.tsx
// Startup Clean desain premium (docs/platform/TEMPLATE-DESIGN.md §4): skema & konten demo, susunan bento, foto
// responsif, tanpa bayangan, logo di header/footer, gerak mati di pratinjau CMS, dan situs pembeli LAMA
// (fixtures/startup-clean-saved-2026-09.json = konten bawaan sebelum 2026-10 seperti disimpan CMS + beberapa ubahan).
import { cleanup, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TEMPLATES, resolveContent } from '../index';
import { SiteRenderer } from '../SiteRenderer';
import { TEMPLATE_PHOTOS, demoClients, photoAsset, templatePhoto } from '../shared/assets';
import { TEMPLATE_V2 } from '../shared/schema';
import { bentoClasses, bentoSlots, heroStats, isRating, orderNav, type BentoSlot } from '../startup-clean/styles';
import type { SiteContent } from '../types';
import saved from './fixtures/startup-clean-saved-2026-09.json';

afterEach(cleanup);

const def = TEMPLATES['startup-clean'];
const ORDER = ['hero', 'clients', 'services', 'about', 'advantages', 'gallery', 'testimonials', 'cta', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`);

describe('Startup Clean: skema & konten bawaan', () => {
  it('skema: strip logo klien tepat setelah hero (introduced), simbol bawaan di bantuan logo, tanpa field Corporate', () => {
    const keys = def.sections.map((s) => s.key);
    expect(keys).toEqual(['brand', 'hero', 'clients', 'about', 'services', 'advantages', 'gallery', 'testimonials', 'cta', 'contact', 'footer']);
    expect(def.sections.find((s) => s.key === 'clients')?.introduced).toBe(TEMPLATE_V2);
    const logo = def.sections.find((s) => s.key === 'brand')!.fields.find((f) => f.key === 'logo');
    expect(logo && 'help' in logo ? logo.help : '').toMatch(/simbol bawaan/);
    expect(def.sections.find((s) => s.key === 'about')!.fields.some((f) => f.key === 'image_2')).toBe(false);
    expect(def.sections.find((s) => s.key === 'cta')!.fields.some((f) => f.key === 'image')).toBe(false);
  });

  it('konten demo memakai foto asli terdaftar, logo klien fiktif, dan brand.logo tetap kosong', () => {
    const c = def.defaultContent;
    expect(c.brand.logo).toBe('');
    expect(c.hero.image).toBe(templatePhoto('startup-clean-hero'));
    expect(c.about.image).toBe(templatePhoto('startup-clean-owner'));
    expect(c.clients.items).toEqual(demoClients('startup-clean'));
    const services = c.services.items as Record<string, string>[];
    expect(services.map((s) => s.image)).toEqual([
      templatePhoto('startup-clean-pos'),
      templatePhoto('startup-clean-stock'),
      '',
      '',
      templatePhoto('startup-clean-qris'),
      '',
      '',
    ]);
    const photos = [
      c.hero.image,
      c.about.image,
      ...services.map((s) => s.image),
      ...(c.gallery.items as Record<string, string>[]).map((g) => g.image),
      ...(c.testimonials.items as Record<string, string>[]).map((t) => t.photo),
    ].filter(Boolean) as string[];
    expect(photos).toHaveLength(12);
    for (const src of photos) expect(photoAsset(src), src).not.toBeNull();
    expect(photos.every((src) => src.includes('/startup-clean-'))).toBe(true);
    expect(Object.keys(TEMPLATE_PHOTOS).filter((k) => k.startsWith('startup-clean-'))).toHaveLength(12);
  });
});

describe('Startup Clean: helper tata letak', () => {
  const SPAN: Record<BentoSlot, number> = { solo: 6, lead: 4, tall: 4, side: 2, wide: 4, third: 2, half: 3, full: 6 };

  it('bento: baris 6 kolom selalu penuh untuk 1–9 kartu, dengan/tanpa foto di kartu kedua', () => {
    for (let n = 1; n <= 9; n += 1) {
      for (const secondHasImage of [true, false]) {
        const slots = bentoSlots(n, secondHasImage);
        expect(slots).toHaveLength(n);
        expect(slots.reduce((sum, s) => sum + SPAN[s], 0) % 6, `${n} ${secondHasImage}`).toBe(0);
        expect(slots.includes('tall')).toBe(n >= 3 && secondHasImage);
      }
    }
    expect(bentoSlots(7, true)).toEqual(['lead', 'tall', 'third', 'third', 'third', 'third', 'third']);
    expect(bentoSlots(7, false)).toEqual(['lead', 'side', 'third', 'third', 'third', 'half', 'half']);
    expect(bentoSlots(3, true)).toEqual(['lead', 'tall', 'wide']);
    expect(bentoSlots(0, true)).toEqual([]);
  });

  it('bento 2 kolom: kartu pertama & kartu terakhir yang sendirian selebar baris', () => {
    expect(bentoClasses(bentoSlots(4, false)).map((c) => c.includes('@2xl:col-span-2'))).toEqual([true, false, false, true]);
    expect(bentoClasses(bentoSlots(3, false)).map((c) => c.includes('@2xl:col-span-2'))).toEqual([true, false, false]);
  });

  it('rating berbintang hanya untuk nilai ≤ 5; kartu hero memakai angka ke-1 & ke-4', () => {
    for (const v of ['4,8', '4.9', '5', '4,8/5', ' 3 ']) expect(isRating(v), v).toBe(true);
    for (const v of ['12.000+', '35', '24/7', '0', '5,5', '']) expect(isRating(v), v).toBe(false);
    const stats = ['12.000+', '35', '2 jt+', '4,8'].map((value) => ({ value, label: value }));
    expect(heroStats(stats)).toEqual({ lead: stats[0], second: stats[3] });
    expect(heroStats(stats.slice(0, 2))).toEqual({ lead: stats[0], second: stats[1] });
    expect(heroStats(stats.slice(0, 1))).toEqual({ lead: stats[0], second: null });
    expect(heroStats([{ value: '' }])).toEqual({ lead: null, second: null });
  });

  it('menu mengikuti urutan halaman (Fitur sebelum Tentang)', () => {
    const nav = ['about', 'services', 'contact', 'gallery'].map((key) => ({ key, label: key }));
    expect(orderNav(nav).map((n) => n.key)).toEqual(['services', 'about', 'gallery', 'contact']);
  });
});

describe('Startup Clean: demo', () => {
  it('urutan section, satu h1, logo simbol + nama di header & footer, menu urut halaman', () => {
    const { container } = render(<SiteRenderer templateCode="startup-clean" content={null} />);
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const header = container.querySelector('header')!;
    const footer = container.querySelector('footer')!;
    for (const part of [header, footer]) {
      expect(part.querySelector('svg[viewBox="0 0 32 32"]'), 'BloomMark').not.toBeNull();
      expect(part.textContent).toContain('Kirana Labs');
    }
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Fitur', 'Tentang', 'Keunggulan', 'Galeri', 'Testimoni']);
    expect(section(container, 'cta')!.querySelector('[data-tpl-tone="inverse"]')).not.toBeNull();
  });

  it('foto: hanya hero eager + fetchpriority; foto demo ber-srcset, sizes, width/height, alt deskriptif', () => {
    const { container } = render(<SiteRenderer templateCode="startup-clean" content={null} />);
    const photos = Array.from(container.querySelectorAll<HTMLImageElement>('main img')).filter((img) => img.getAttribute('src')?.includes('/photos/'));
    expect(photos.length).toBe(12);
    const eager = photos.filter((img) => img.getAttribute('loading') === 'eager');
    expect(eager).toHaveLength(1);
    expect(eager[0].getAttribute('src')).toBe(templatePhoto('startup-clean-hero'));
    expect(eager[0].getAttribute('fetchpriority')).toBe('high');
    for (const img of photos) {
      expect(img.getAttribute('srcset'), img.src).toMatch(/ 800w|240w/);
      expect(img.getAttribute('sizes')).toBeTruthy();
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
    }
    // Foto suasana punya alt; potret testimoni dekoratif (nama tertulis di sebelahnya)
    for (const img of photos.filter((i) => !i.src.includes('portrait'))) expect(img.alt.length, img.src).toBeGreaterThan(5);
    expect(within(section(container, 'clients')!).getAllByRole('img', { name: 'Kedai Senja' }).length).toBeGreaterThan(0);
  });

  it('datar: tidak ada kelas shadow selain tombol WhatsApp melayang milik Shell', () => {
    const { container } = render(<SiteRenderer templateCode="startup-clean" content={null} />);
    const shadowed = Array.from(container.querySelectorAll<HTMLElement>('[class*="shadow"]'));
    expect(shadowed.map((el) => el.getAttribute('aria-label'))).toEqual(['Chat WhatsApp']);
  });

  it('pratinjau CMS (preview tanpa motion) diam: tanpa data-reveal, strip logo statis, angka utuh', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')?.getAttribute('data-tpl-motion')).toBe('off');
    expect(container.querySelector('[data-reveal]')).toBeNull();
    expect(container.querySelector('.tpl-marquee-track')).toBeNull();
    expect(section(container, 'clients')!.querySelectorAll('ul')).toHaveLength(1);
    expect(section(container, 'advantages')!.textContent).toContain('12.000+');
    expect(container.querySelector('.tpl-count[data-count]')).toBeNull();
  });

  it('logo unggahan pembeli menggantikan simbol bawaan', () => {
    const { container } = render(<SiteRenderer templateCode="startup-clean" content={{ brand: { logo: '/assets/sites/7/logo.png' } }} />);
    const header = container.querySelector('header')!;
    expect(header.querySelector('img[src="/assets/sites/7/logo.png"]')).not.toBeNull();
    expect(header.querySelector('svg[viewBox="0 0 32 32"]')).toBeNull();
  });
});

describe('Startup Clean: situs pembeli lama (konten tersimpan sebelum 2026-10)', () => {
  const content = resolveContent(def, saved as unknown as SiteContent);

  it('tanpa isi demo baru: strip logo disembunyikan, foto lama yang kosong tetap kosong', () => {
    expect(content.clients.enabled).toBe(false);
    expect(content.hero.image).toBe('');
    expect(content.about.image).toBe('');
    expect((content.services.items as Record<string, string>[]).every((s) => s.image === '')).toBe(true);
    expect(content.gallery.items).toHaveLength(6);
  });

  it('semua isian lama tampil, tata letak menyesuaikan slot foto kosong, tanpa ilustrasi', () => {
    const { container } = render(<SiteRenderer templateCode="startup-clean" content={saved} />);
    expect(sectionKeys(container)).toEqual(ORDER.filter((k) => k !== 'clients'));
    const text = container.textContent ?? '';
    const s = saved as unknown as Record<string, Record<string, unknown>>;
    for (const value of [
      'Toko Sinar Rejeki',
      s.hero.title,
      s.hero.subtitle,
      s.about.title,
      s.about.badge_value,
      s.advantages.title,
      s.cta.title,
      s.contact.email,
      s.footer.description,
      ...(s.services.items as Record<string, string>[]).map((i) => i.title),
      ...(s.gallery.items as Record<string, string>[]).map((i) => i.caption),
      ...(s.testimonials.items as Record<string, string>[]).map((i) => i.name),
      ...(s.about.points as Record<string, string>[]).map((i) => i.text),
    ] as string[]) {
      expect(text, value).toContain(value);
    }
    // Hero tanpa foto: tanpa panel/gambar, angka tetap tampil sebagai kartu sebaris
    const hero = section(container, 'hero')!;
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.textContent).toContain('12.000+');
    // Cerita tanpa foto: tidak ada bidang pengganti kosong
    expect(section(container, 'about')!.querySelector('[role="img"]')).toBeNull();
    // Galeri: foto unggahan dipakai apa adanya (tanpa srcset), item tanpa foto → bidang netral berlabel keterangan
    const gallery = section(container, 'gallery')!;
    expect(gallery.querySelectorAll('figure')).toHaveLength(6);
    expect(gallery.querySelector('img[src="/assets/sites/99/img_toko.webp"]')?.hasAttribute('srcset')).toBe(false);
    expect(within(gallery).getByRole('img', { name: 'Meja kerja tim produk' })).toBeTruthy();
    // Tanpa ilustrasi SVG lama di section mana pun selain peta kontak
    for (const key of ORDER.filter((k) => k !== 'contact' && k !== 'clients')) {
      expect(section(container, key)?.querySelector('svg[viewBox="0 0 480 300"]') ?? null, key).toBeNull();
    }
    // Aksen pilihan pembeli tetap dipakai
    expect((container.querySelector('[data-tpl-root]') as HTMLElement).style.getPropertyValue('--tpl-accent')).toBe('#0e7490');
  });

  it('pembeli menyalakan strip logo tanpa unggah logo → contoh logo klien demo bisa diganti di CMS', () => {
    const on = { ...(saved as object), clients: { enabled: true } };
    const { container } = render(<SiteRenderer templateCode="startup-clean" content={on} />);
    expect(sectionKeys(container)).toContain('clients');
  });

  it('isi minim (1 fitur, 1 foto galeri, 1 angka) tetap rapi tanpa error', () => {
    const minimal = {
      services: { items: [{ title: 'Satu fitur', description: 'Saja', image: '' }] },
      gallery: { items: [{ image: '/assets/sites/1/a.png', caption: 'Satu' }] },
      advantages: { stats: [{ value: '24/7', label: 'Dukungan' }], items: [] },
      testimonials: { items: [{ quote: 'Bagus', name: 'Budi' }] },
    };
    const { container } = render(<SiteRenderer templateCode="startup-clean" content={minimal} />);
    expect(section(container, 'services')!.querySelectorAll('li')).toHaveLength(1);
    expect(section(container, 'services')!.querySelector('li')?.className).toContain('@5xl:col-span-6');
    expect(section(container, 'advantages')!.textContent).toContain('24/7');
    expect(section(container, 'hero')!.textContent).toContain('24/7');
  });
});
