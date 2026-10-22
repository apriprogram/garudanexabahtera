// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/arena-club.test.tsx
// Arena Club (docs/platform/TEMPLATE-BRIEFS-2026-10.md §1 + §4.1): skema CMS & konten demo, helper model, demo
// (urutan section, header pil, hero banner berfoto, paket unggulan, titik level, foto responsif, datar), pratinjau CMS
// diam, konten lama/sebagian/minim tetap rapi, dan editor CMS menampilkan semua field skema.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { featureLines, leadSentence, levelRows, navItems, readArena, splitDate, splitPlans } from '../arena-club/model';
import { ARENA_PHOTOS } from '../arena-club/photos';
import { TEMPLATES, resolveContent } from '../index';
import { SiteRenderer } from '../SiteRenderer';
import { isListField, type SiteContent } from '../types';
import saved from './fixtures/startup-clean-saved-2026-09.json';

afterEach(cleanup);

const def = TEMPLATES['arena-club'];
const ORDER = ['hero', 'about', 'advantages', 'services', 'pricing', 'team', 'events', 'gallery', 'testimonials', 'clients', 'cta', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null) => render(<SiteRenderer templateCode="arena-club" content={content} />).container;

describe('Arena Club: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, section baru berkunci Inggris pendek, tanpa field yang tidak dirender', () => {
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('advantages')).toEqual(['title', 'stats']);
    expect(fields('hero')).toContain('proof_text');
    expect(fields('about')).toEqual(expect.arrayContaining(['image_label', 'badge_text', 'levels_title', 'levels', 'points']));
    expect(fields('services')).toEqual(expect.arrayContaining(['button_label', 'button_url', 'items']));
    expect(fields('cta')).toContain('image');
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color', 'header_label', 'header_url']);
    const logo = def.sections[0].fields.find((f) => f.key === 'logo');
    expect(logo && 'help' in logo ? logo.help : '').toMatch(/simbol lapangan bawaan/);
    // Kunci field unik per section, setiap list punya batas, setiap section ada di konten bawaan
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      for (const f of s.fields) if (isListField(f)) expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      expect(s.introduced).toBeUndefined();
    }
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar dan ada di public/', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#2FB2FF');
    expect(c.hero.image).toBe('/assets/templates/photos/arena-club-hero-1600.webp');
    const lists = (key: string, listKey: string, f: string) => (c[key][listKey] as Record<string, string>[]).map((i) => i[f]);
    const photos = [
      c.hero.image,
      c.about.image,
      c.cta.image,
      ...lists('services', 'items', 'image'),
      ...lists('team', 'items', 'photo'),
      ...lists('events', 'items', 'image'),
      ...lists('gallery', 'items', 'image'),
      ...lists('testimonials', 'items', 'photo'),
    ] as string[];
    for (const src of photos) {
      expect(ARENA_PHOTOS.asset(src), src).not.toBeNull();
      expect(existsSync(resolve(process.cwd(), 'public', src.slice(1))), src).toBe(true);
    }
    // Setiap foto di registry dipakai konten demo
    for (const key of ARENA_PHOTOS.keys) expect(photos, key).toContain(ARENA_PHOTOS.src(key));
    for (const logo of lists('clients', 'items', 'logo')) {
      expect(logo).toMatch(/^\/assets\/templates\/logos\/arena-club-sponsor-[a-z-]+\.svg$/);
      expect(existsSync(resolve(process.cwd(), 'public', logo.slice(1))), logo).toBe(true);
    }
  });
});

describe('Arena Club: helper model', () => {
  it('paket unggulan = paket berlabel pertama, kalau tidak paket pertama', () => {
    const a = { name: 'A' };
    const b = { name: 'B', badge: 'Favorit' };
    const c = { name: 'C', badge: 'Baru' };
    expect(splitPlans([a, b, c])).toEqual({ featured: b, others: [a, c] });
    expect(splitPlans([a, { name: 'D' }])).toEqual({ featured: a, others: [{ name: 'D' }] });
    expect(splitPlans([])).toEqual({ featured: null, others: [] });
  });

  it('benefit per baris, penanda daftar dibuang, maks. 8', () => {
    expect(featureLines('- 8 kelas\n• 4 jam\r\n\n * Loker  ')).toEqual(['8 kelas', '4 jam', 'Loker']);
    expect(featureLines(Array.from({ length: 12 }, (_, i) => `B${i}`).join('\n'))).toHaveLength(8);
    expect(featureLines('')).toEqual([]);
  });

  it('baris titik relatif terhadap angka terbesar; angka berformat Indonesia; bukan angka → 0 titik', () => {
    expect(levelRows([{ label: 'Pemula', value: '540' }, { label: 'Menengah', value: '410' }, { label: 'Lanjutan', value: '200' }]).map((r) => r.dots)).toEqual([10, 8, 4]);
    expect(levelRows([{ label: 'A', value: '1.200' }, { label: 'B', value: '12' }]).map((r) => r.dots)).toEqual([10, 1]);
    expect(levelRows([{ label: 'A', value: 'banyak' }, { label: '', value: '' }])).toEqual([{ label: 'A', value: 'banyak', dots: 0 }]);
  });

  it('tanggal acara, kalimat pertama kartu gelap', () => {
    expect(splitDate('14 Des 2026')).toEqual(['14', 'Des 2026']);
    expect(splitDate('5/1 2027')).toEqual(['5', '1 2027']);
    expect(splitDate('Setiap Sabtu')).toEqual(['Setiap Sabtu', '']);
    expect(leadSentence('Lapangan bagus. Lampu terang!\n\nParagraf dua.')).toEqual({ lead: 'Lapangan bagus.', rest: 'Lampu terang!', more: ['Paragraf dua.'] });
    expect(leadSentence('Tanpa titik')).toEqual({ lead: 'Tanpa titik', rest: '', more: [] });
  });

  it('menu: urut halaman, Galeri hanya di menu HP, section mati/kosong tidak masuk', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((n) => n.label)).toEqual(['Tentang', 'Program', 'Membership', 'Pelatih', 'Acara', 'Galeri', 'Kontak']);
    expect(navItems(content, 'desktop').map((n) => n.key)).toEqual(['about', 'services', 'pricing', 'team', 'events', 'contact']);
    const off = resolveContent(def, { pricing: { enabled: false }, team: { items: [] } });
    expect(navItems(off).map((n) => n.key)).not.toEqual(expect.arrayContaining(['pricing']));
    expect(navItems(off).map((n) => n.key)).not.toContain('team');
  });

  it('tombol menu atas: WhatsApp bila ada nomor, kalau tidak Kontak; tautan isian menang', () => {
    expect(readArena(resolveContent(def, null)).headerAction).toEqual({ kind: 'external', href: expect.stringMatching(/^https:\/\/wa\.me\/6281234567890/) });
    expect(readArena(resolveContent(def, { contact: { whatsapp: '' } })).headerAction).toEqual({ kind: 'section', target: 'contact' });
    expect(readArena(resolveContent(def, { brand: { header_url: '#pricing' } })).headerAction).toEqual({ kind: 'section', target: 'pricing' });
  });
});

describe('Arena Club: demo', () => {
  it('urutan section, satu h1, hero banner berpenanda, simbol + nama di header & footer navy', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(section(container, 'hero').getAttribute('data-hero-layout')).toBe('banner');
    const header = container.querySelector('header')!;
    const footer = container.querySelector('footer')!;
    for (const part of [header, footer]) {
      expect(part.querySelector('svg[viewBox="0 0 32 32"]'), 'ArenaMark').not.toBeNull();
      expect(part.textContent).toContain('Lintang Padel & Tenis Club');
    }
    expect(footer.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(footer.className).toContain('bg-[#0E1B2E]');
    // Grup pil menu desktop + tombol navy "Pesan Lapangan"
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Tentang', 'Program', 'Membership', 'Pelatih', 'Acara', 'Kontak']);
    expect(nav.querySelector('ul')!.className).toContain('rounded-full');
    expect(within(header).getByRole('link', { name: /Pesan Lapangan/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
  });

  it('hero: judul di atas foto, garis bawah sorotan, bukti sosial 3 pelatih, tautan sosial ↗', () => {
    const hero = section(demo(), 'hero');
    const h1 = hero.querySelector('h1')!;
    expect(h1.textContent).toBe('Ayunan terbaikmu dimulai di lapangan ini');
    expect(h1.querySelector('span.underline')?.textContent).toBe('lapangan ini');
    // Bukti sosial tampil di versi HP & desktop (salah satu disembunyikan CSS), masing-masing 3 avatar varian 240
    const avatars = hero.querySelectorAll<HTMLImageElement>('ul[aria-label="Pelatih kami"] img');
    expect(avatars).toHaveLength(6);
    for (const img of avatars) expect(img.getAttribute('srcset')).toContain('-240.webp 240w');
    expect(hero.textContent).toContain('Latih bersama pelatih profesional');
    const socials = within(hero.querySelector<HTMLElement>('ul[aria-label="Media sosial"]')!).getAllByRole('link');
    expect(socials.map((a) => a.textContent)).toEqual(['Instagram', 'YouTube', 'TikTok']);
    // Tombol utama ke WhatsApp, tombol kedua ke Membership
    expect(within(hero).getByRole('link', { name: /Jadwalkan Kelas Percobaan/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(within(hero).getByRole('link', { name: /Lihat Membership/ })).toHaveAttribute('href', '#pricing');
  });

  it('bento tiga kartu, titik level ber-label, paket Pro disorot aksen, rel program & acara bertombol', () => {
    const container = demo();
    const about = section(container, 'about');
    expect(about.querySelectorAll(':scope ul.grid > li')).toHaveLength(3);
    expect(within(about).getByRole('img', { name: 'Pemula: 540' })).toBeInTheDocument();
    expect(about.textContent).toContain('Setiap hari, 06.00–23.00 WIB');

    const pricing = section(container, 'pricing');
    const featured = pricing.querySelector<HTMLElement>('.bg-\\(--tpl-accent\\)')!;
    expect(featured.textContent).toContain('Pro');
    expect(featured.textContent).toContain('Paling diminati');
    expect(within(featured).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['8 kelas grup', '4 jam sewa lapangan', '2 sesi latihan privat', 'Akses liga internal']);
    expect(within(featured).getByRole('link', { name: /Pilih Paket Pro/ }).getAttribute('href')).toContain(encodeURIComponent('paket Pro'));

    const services = section(container, 'services');
    expect(within(services).getAllByRole('link', { name: /^Tanya program / })).toHaveLength(5);
    expect(section(container, 'events').querySelectorAll('li')).toHaveLength(4);
    expect(within(section(container, 'events')).getByRole('link', { name: 'Daftar Turnamen Junior Lintang Cup' })).toBeInTheDocument();
  });

  it('foto: hanya hero eager + fetchpriority; foto demo ber-srcset, sizes, width/height', () => {
    const container = demo();
    const photos = Array.from(container.querySelectorAll<HTMLImageElement>('main img')).filter((img) => img.getAttribute('src')?.includes('/photos/'));
    expect(photos.length).toBeGreaterThanOrEqual(20);
    const eager = photos.filter((img) => img.getAttribute('loading') === 'eager');
    expect(eager.map((img) => img.getAttribute('src'))).toEqual(['/assets/templates/photos/arena-club-hero-1600.webp']);
    expect(eager[0].getAttribute('fetchpriority')).toBe('high');
    for (const img of photos) {
      expect(img.getAttribute('srcset'), img.src).toMatch(/ (800|240)w/);
      expect(img.getAttribute('sizes')).toBeTruthy();
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
    }
    // Pelatih: alt = nama + peran
    expect(within(section(container, 'team')).getByRole('img', { name: 'Dimas Prakoso, Kepala Pelatih Padel' })).toBeInTheDocument();
  });

  it('datar: tidak ada kelas shadow selain tombol WhatsApp melayang milik Shell', () => {
    const container = demo();
    const shadowed = Array.from(container.querySelectorAll<HTMLElement>('[class*="shadow"]'));
    expect(shadowed.map((el) => el.getAttribute('aria-label'))).toEqual(['Chat WhatsApp']);
  });

  it('pratinjau CMS (preview tanpa motion) diam: tanpa data-reveal, sponsor statis, angka utuh', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')?.getAttribute('data-tpl-motion')).toBe('off');
    expect(container.querySelector('[data-reveal]')).toBeNull();
    expect(container.querySelector('.tpl-marquee-track')).toBeNull();
    expect(section(container, 'clients').querySelectorAll('ul')).toHaveLength(1);
    expect(section(container, 'advantages').textContent).toContain('14.500+');
    expect(container.querySelector('.tpl-count[data-count]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
  });

  it('logo unggahan pembeli & warna aksen pilihan dipakai', () => {
    const container = demo({ brand: { logo: '/assets/sites/7/logo.png', accent_color: '#16a34a' } });
    const header = container.querySelector('header')!;
    expect(header.querySelector('img[src="/assets/sites/7/logo.png"]')).not.toBeNull();
    expect(header.querySelector('svg[viewBox="0 0 32 32"]')).toBeNull();
    expect((container.querySelector('[data-tpl-root]') as HTMLElement).style.getPropertyValue('--tpl-accent')).toBe('#16a34a');
  });
});

describe('Arena Club: konten lama, sebagian, dan minim', () => {
  it('konten sebagian: isian tersimpan menimpa, sisanya konten bawaan', () => {
    const container = demo({ hero: { title: 'Klub Futsal Garuda' }, brand: { company_name: 'Garuda Futsal' } });
    expect(container.querySelector('h1')!.textContent).toBe('Klub Futsal Garuda');
    expect(container.querySelector('header')!.textContent).toContain('Garuda Futsal');
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(section(container, 'pricing').textContent).toContain('Rp850.000');
  });

  it('konten company profile lama (template lain) tetap terbaca tanpa error', () => {
    const container = demo(saved);
    const s = saved as unknown as Record<string, Record<string, unknown>>;
    const textContent = container.textContent ?? '';
    for (const value of [s.hero.title, s.about.title, s.cta.title, ...(s.services.items as Record<string, string>[]).map((i) => i.title)] as string[]) {
      expect(textContent, value).toContain(value);
    }
    // Hero tanpa foto: banner tetap (navy), tanpa <img> eager
    expect(section(container, 'hero').querySelector('img[fetchpriority="high"]')).toBeNull();
    expect(section(container, 'hero').getAttribute('data-hero-layout')).toBe('banner');
  });

  it('isi minim: list kosong & foto kosong → tata letak menyesuaikan tanpa bidang kosong', () => {
    const minimal = {
      hero: { image: '', proof_text: '' },
      about: { image: '', image_label: '', levels: [], badge_value: '', badge_label: '', badge_text: '' },
      services: { items: [{ title: 'Sewa Lapangan', description: 'Per jam', image: '' }] },
      pricing: { items: [{ name: 'Bulanan', price: 'Rp300.000' }] },
      team: { items: [{ name: 'Budi Santoso', role: 'Pelatih' }] },
      events: { items: [{ date: 'Setiap Sabtu', title: 'Main bareng' }] },
      gallery: { items: [{ image: '', caption: 'Lapangan' }] },
      testimonials: { items: [{ quote: 'Seru', name: 'Ani' }] },
      clients: { items: [] },
      cta: { image: '' },
      contact: { whatsapp: '' },
    };
    const container = demo(minimal);
    expect(sectionKeys(container)).toEqual(ORDER.filter((k) => k !== 'clients'));
    // Bento: hanya kartu gelap (paragraf + jam buka)
    expect(section(container, 'about').querySelectorAll(':scope ul.grid > li')).toHaveLength(1);
    // Program tanpa foto: kartu navy polos; tanpa WhatsApp tombol tanya menuju Kontak
    expect(section(container, 'services').querySelector('img')).toBeNull();
    expect(within(section(container, 'services')).getByRole('link', { name: 'Tanya program Sewa Lapangan' })).toHaveAttribute('href', '#kontak');
    // Paket tunggal tetap disorot
    expect(section(container, 'pricing').querySelector('.bg-\\(--tpl-accent\\)')?.textContent).toContain('Bulanan');
    // Pelatih tanpa foto → inisial; acara tanpa angka tanggal → teks utuh
    expect(section(container, 'team').textContent).toContain('BS');
    expect(section(container, 'events').textContent).toContain('Setiap Sabtu');
    expect(section(container, 'gallery').querySelector('[role="img"][aria-label="Lapangan"]')).not.toBeNull();
    expect(section(container, 'hero').querySelector('ul[aria-label="Pelatih kami"]')).toBeNull();
  });
});

describe('Arena Club: editor CMS', () => {
  it('setiap section skema menampilkan semua field (termasuk isi list) di panel CMS', () => {
    const content = resolveContent(def, null);
    for (const s of def.sections) {
      const { container, unmount } = render(
        <SectionEditor
          section={s}
          content={content}
          defaults={def.defaultContent}
          open
          onToggleOpen={vi.fn()}
          onActivate={vi.fn()}
          onTextChange={vi.fn()}
          onListChange={vi.fn()}
          onListItemRemoved={vi.fn()}
          onEnabledChange={vi.fn()}
          errors={{}}
          onBlurPath={vi.fn()}
        />,
      );
      const box = within(container);
      if (s.toggleable) expect(box.getByRole('switch', { name: `Tampilkan bagian ${s.label} di situs` })).toBeInTheDocument();
      for (const f of s.fields) {
        expect(container.textContent, `${s.key}.${f.key}`).toContain(f.label);
        if (!isListField(f)) continue;
        expect(box.getByRole('button', { name: new RegExp(`Tambah ${f.itemLabel}`, 'i') })).toBeInTheDocument();
        // Buka item pertama → semua sub-field tampil
        fireEvent.click(box.getByRole('button', { name: new RegExp(`^${f.itemLabel} 1`) }));
        for (const sub of f.fields) expect(container.textContent, `${s.key}.${f.key}.${sub.key}`).toContain(sub.label);
      }
      unmount();
    }
  });
});

// Konten mentah: tipe SiteContent tidak memaksa bentuk list, jadi pastikan komponen tahan nilai aneh
describe('Arena Club: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash', () => {
    const weird = {
      about: { levels: 'x', points: [null, { text: 5 }], body: 7 },
      pricing: { items: [{ name: 'X', features: 9 }] },
      events: { items: [{ date: 3 }] },
      hero: { highlight: 'tidak ada di judul' },
    } as unknown as SiteContent;
    expect(() => render(<def.Component content={resolveContent(def, weird)} />)).not.toThrow();
  });
});
