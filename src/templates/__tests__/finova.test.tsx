// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/finova.test.tsx
// Finova (docs/platform/TEMPLATE-BRIEFS-2026-10.md §3 + §4.3): skema CMS & konten demo, helper model (warna panel &
// tombol, angka bersuperskrip, menu, tautan footer, bento), demo (urutan section, menu di dalam panel hero, hero panel
// berfoto + kartu UI, mitra di panel, angka, bento + peta, testimoni karusel, FAQ accordion, CTA + tombol unduh,
// footer kaya), foto responsif, datar, pratinjau CMS diam, konten lama/sebagian/minim, dan editor CMS.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { bentoLayout, finovaVars, linkGroups, navItems, readFinova, splitStat } from '../finova/model';
import { FINOVA_PHOTOS } from '../finova/photos';
import { TEMPLATES, resolveContent } from '../index';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';
import saved from './fixtures/startup-clean-saved-2026-09.json';

afterEach(cleanup);

const def = TEMPLATES.finova;
const ORDER = ['hero', 'clients', 'advantages', 'about', 'services', 'testimonials', 'faq', 'cta', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null) => render(<SiteRenderer templateCode="finova" content={content} />).container;
const rgb = (hex: string) => parseHex(hex)!;

describe('Finova: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, section baru berkunci Inggris pendek, tanpa galeri', () => {
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color', 'highlight_color']);
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['image', 'proof_value', 'proof_text', 'balance_label', 'balance_value', 'balance_caption', 'chips']),
    );
    expect(fields('advantages')).toEqual(['title', 'stats']);
    expect(fields('about')).toEqual(expect.arrayContaining(['button_label', 'button_url', 'mock_title', 'mock_value', 'mock_caption', 'mock_list_title', 'mock_items']));
    expect(fields('services')).toEqual(expect.arrayContaining(['stat_value', 'stat_label', 'items']));
    expect(fields('faq')).toEqual(expect.arrayContaining(['help_title', 'image', 'button_label', 'button_url', 'items']));
    expect(fields('cta')).toEqual(expect.arrayContaining(['app_store_url', 'play_store_url', 'app_store_label', 'play_store_label']));
    expect(fields('footer')).toEqual(expect.arrayContaining(['links', 'legal_note', 'instagram', 'tiktok']));
    expect(def.sections.some((s) => s.key === 'gallery')).toBe(false);
    const logo = def.sections[0].fields.find((f) => f.key === 'logo');
    expect(logo && 'help' in logo ? logo.help : '').toMatch(/simbol lumbung bawaan/);
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      for (const f of s.fields) if (isListField(f)) expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      expect(s.introduced).toBeUndefined();
    }
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto & logo mitra ada di public/', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#1F4D43');
    expect(c.brand.highlight_color).toBe('#D4F27A');
    expect(c.hero.image).toBe('/assets/templates/photos/finova-hero-1200.webp');
    const lists = (key: string, listKey: string, f: string) => (c[key][listKey] as Record<string, string>[]).map((i) => i[f]).filter(Boolean);
    const photos = [c.hero.image, c.faq.image, ...lists('services', 'items', 'image'), ...lists('testimonials', 'items', 'photo')] as string[];
    for (const src of photos) {
      expect(FINOVA_PHOTOS.asset(src), src).not.toBeNull();
      expect(existsSync(resolve(process.cwd(), 'public', src.slice(1))), src).toBe(true);
    }
    // Setiap foto di registry dipakai konten demo
    for (const key of FINOVA_PHOTOS.keys) expect(photos, key).toContain(FINOVA_PHOTOS.src(key));
    for (const logo of lists('clients', 'items', 'logo')) {
      expect(logo).toMatch(/^\/assets\/templates\/logos\/finova-partner-[a-z-]+\.svg$/);
      expect(existsSync(resolve(process.cwd(), 'public', logo.slice(1))), logo).toBe(true);
    }
    expect(existsSync(resolve(process.cwd(), 'public/assets/templates/logos/finova-mark.svg'))).toBe(true);
    // Salinan demo tanpa klaim izin/regulator, bunga, atau imbal hasil (brief §3.9)
    expect(JSON.stringify(c)).not.toMatch(/\bOJK\b|Bank Indonesia|\bbunga\b|imbal hasil|dijamin|terjamin/i);
  });
});

describe('Finova: helper model', () => {
  it('warna panel selalu gelap (teks putih ≥ 11:1), tombol terbaca, nilai tidak valid → bawaan', () => {
    const base = finovaVars('#1F4D43', '#D4F27A') as Record<string, string>;
    expect(contrast(rgb(base['--fin-deep']), [255, 255, 255])).toBeGreaterThanOrEqual(11);
    expect(contrast(rgb(base['--fin-hl']), rgb(base['--fin-on-hl']))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(base['--fin-hl-ink']), [255, 255, 255])).toBeGreaterThanOrEqual(4.5);
    expect(base['--fin-hl']).toBe('#d4f27a');
    // Warna utama terang (kuning) tetap menghasilkan panel gelap; tombol gelap diterangkan agar terlihat di panel
    const bright = finovaVars('#FFE600', '#10231E') as Record<string, string>;
    expect(contrast(rgb(bright['--fin-deep']), [255, 255, 255])).toBeGreaterThanOrEqual(11);
    expect(contrast(rgb(bright['--fin-hl']), rgb(bright['--fin-deep']))).toBeGreaterThanOrEqual(3);
    expect(contrast(rgb(bright['--fin-hl']), rgb(bright['--fin-on-hl']))).toBeGreaterThanOrEqual(4.5);
    expect(finovaVars('bukan', 'warna')).toEqual(base);
  });

  it('angka bersuperskrip: satuan dipisah, teks bukan angka utuh', () => {
    expect(splitStat('2,4 jt+')).toEqual({ number: '2,4', unit: 'jt+' });
    expect(splitStat('120+')).toEqual({ number: '120', unit: '+' });
    expect(splitStat('1.500+')).toEqual({ number: '1.500', unit: '+' });
    expect(splitStat('98%')).toEqual({ number: '98', unit: '%' });
    expect(splitStat('Rp5 M')).toEqual({ number: 'Rp5', unit: 'M' });
    expect(splitStat('4,8')).toEqual({ number: '4,8', unit: '' });
    expect(splitStat('24/7')).toEqual({ number: '24/7', unit: '' });
    expect(splitStat('')).toEqual({ number: '', unit: '' });
  });

  it('menu: Beranda + section yang tampil & berisi, label chip singkat dipakai', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((n) => n.label)).toEqual(['Beranda', 'Produk', 'Fitur', 'Testimoni', 'Tanya jawab', 'Kontak']);
    const off = resolveContent(def, { faq: { enabled: false }, testimonials: { items: [] }, services: { eyebrow: 'Fitur unggulan kami lengkap' } });
    expect(navItems(off).map((n) => n.key)).toEqual(['hero', 'about', 'services', 'contact']);
    expect(navItems(off).find((n) => n.key === 'services')?.label).toBe('Fitur');
  });

  it('tautan footer dikelompokkan per kolom; tautan kosong → Kontak; maks. 4 kolom', () => {
    const contact = { kind: 'section', target: 'contact' } as const;
    const groups = linkGroups(
      [
        { group: 'Produk', label: 'Fitur', url: '#layanan' },
        { group: 'produk', label: 'FAQ', url: '#faq' },
        { group: '', label: 'Blog', url: 'https://contoh.id/blog' },
        { group: 'Produk', label: '', url: '#x' },
        { group: 'A', label: 'a', url: '' },
        { group: 'B', label: 'b', url: 'javascript:alert(1)' },
        { group: 'C', label: 'c', url: '' },
      ],
      contact,
    );
    expect(groups.map((g) => g.title)).toEqual(['Produk', 'Tautan', 'A', 'B']);
    expect(groups[0].links).toEqual([
      { label: 'Fitur', action: { kind: 'section', target: 'services' } },
      { label: 'FAQ', action: { kind: 'section', target: 'faq' } },
    ]);
    expect(groups[1].links[0].action).toEqual({ kind: 'external', href: 'https://contoh.id/blog' });
    expect(groups[2].links[0].action).toEqual(contact);
    expect(groups[3].links[0].action).toEqual(contact);
  });

  it('bento: ukuran kartu per jumlah fitur', () => {
    expect(bentoLayout(0)).toEqual([]);
    expect(bentoLayout(1)).toEqual(['full']);
    expect(bentoLayout(2)).toEqual(['half', 'half']);
    expect(bentoLayout(3)).toEqual(['half', 'half', 'full']);
    expect(bentoLayout(4)).toEqual(['half', 'half', 'wide', 'side']);
  });

  it('tombol utama & menu: WhatsApp bila ada nomor, kalau tidak Kontak; tombol unduh hanya untuk URL http(s)', () => {
    expect(readFinova(resolveContent(def, null)).headerAction).toEqual({ kind: 'external', href: expect.stringMatching(/^https:\/\/wa\.me\/6281234567890/) });
    expect(readFinova(resolveContent(def, { contact: { whatsapp: '' } })).headerAction).toEqual({ kind: 'section', target: 'contact' });
    expect(readFinova(resolveContent(def, { hero: { primary_url: '#faq' } })).headerAction).toEqual({ kind: 'section', target: 'faq' });
    expect(readFinova(resolveContent(def, null)).stores.map((s) => s.label)).toEqual(['App Store', 'Google Play']);
    expect(readFinova(resolveContent(def, { cta: { app_store_url: '', play_store_url: 'javascript:alert(1)' } })).stores).toEqual([]);
  });
});

describe('Finova: demo', () => {
  it('urutan section, satu h1, hero panel berpenanda, menu di dalam header dengan pil gelap + tombol limau', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('panel');
    // Mitra berada di dalam section hero (baris bawah panel / tepat di bawah panel di HP)
    expect(hero.contains(section(container, 'clients'))).toBe(true);
    const header = container.querySelector('header')!;
    expect(header.getAttribute('data-tpl-tone')).toBe('inverse');
    // Header menumpang panel (lapisan lengket setinggi 0) saat hero tampil
    expect(header.className).toContain('h-0');
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Beranda', 'Produk', 'Fitur', 'Testimoni', 'Tanya jawab', 'Kontak']);
    expect(nav.querySelector('ul')!.className).toContain('rounded-full');
    expect(within(header).getByRole('link', { name: 'Mulai Gratis' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'FinovaMark').not.toBeNull();
    expect(header.textContent).toContain('Lumbung Arta');
  });

  it('hero: judul dua bagian dengan sorotan, foto eager, kartu saldo + chip transaksi, bukti sosial 4 avatar, logo mitra', () => {
    const container = demo();
    const hero = section(container, 'hero');
    const h1 = hero.querySelector('h1')!;
    expect(h1.textContent).toBe('Kelola uang lebih tenang dan cerdas');
    expect(h1.querySelector('span')?.textContent).toBe('tenang dan cerdas');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/finova-hero-1200.webp');
    expect(img.getAttribute('srcset')).toBe('/assets/templates/photos/finova-hero-800.webp 800w, /assets/templates/photos/finova-hero-1200.webp 1200w');
    expect(img.getAttribute('alt')).toMatch(/ponsel/);
    expect(hero.textContent).toContain('Rp12.480.000');
    expect(within(hero).getByRole('list', { name: 'Transaksi terbaru' }).querySelectorAll('li')).toHaveLength(2);
    const avatars = hero.querySelectorAll<HTMLImageElement>('ul[aria-label="Pengguna kami"] img');
    expect(avatars).toHaveLength(4);
    for (const a of avatars) expect(a.getAttribute('srcset')).toContain('-240.webp 240w');
    expect(hero.textContent).toContain('2,4 jt+');
    const partners = section(container, 'clients');
    expect(partners.querySelectorAll('img[src*="finova-partner-"]').length).toBeGreaterThanOrEqual(6);
    expect(within(hero).getByRole('link', { name: 'Lihat Fitur' })).toHaveAttribute('href', '#layanan');
  });

  it('angka bersuperskrip, kartu UI produk, bento dengan peta + kartu angka, testimoni karusel, FAQ accordion', () => {
    const container = demo();
    const stats = section(container, 'advantages');
    expect(Array.from(stats.querySelectorAll('sup')).map((s) => s.textContent)).toEqual(['jt+', '+', '+']);
    expect(stats.querySelector('h2')?.textContent).toBe('Lumbung Arta dalam angka');

    const about = section(container, 'about');
    expect(about.textContent).toContain('Rp1.259.750');
    expect(about.textContent).toContain('Rekening & kartu');
    expect(about.querySelectorAll('li').length).toBeGreaterThanOrEqual(6);

    const services = section(container, 'services');
    expect(services.querySelectorAll(':scope ul > li')).toHaveLength(4);
    expect(services.querySelector('svg[data-fin-map]')).not.toBeNull();
    expect(services.textContent).toContain('Kota sudah terlayani');

    const stories = section(container, 'testimonials');
    expect(stories.querySelector('blockquote')?.textContent).toMatch(/^Pencatatan iuran anggota/);
    fireEvent.click(within(stories).getByRole('button', { name: 'Testimoni berikutnya' }));
    expect(stories.querySelector('blockquote')?.textContent).toMatch(/^Pengingat tagihannya/);
    fireEvent.click(within(stories).getByRole('button', { name: 'Testimoni sebelumnya' }));
    fireEvent.click(within(stories).getByRole('button', { name: 'Testimoni sebelumnya' }));
    expect(stories.textContent).toContain('Bayu Pratama');
    expect(within(stories).getByRole('button', { name: 'Tampilkan testimoni Bayu Pratama' })).toHaveAttribute('aria-pressed', 'true');

    const faq = section(container, 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'false');
    const panel = document.getElementById(buttons[1].getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('role', 'region');
    expect(panel.hasAttribute('inert')).toBe(true);
    fireEvent.click(buttons[1]);
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(panel.hasAttribute('inert')).toBe(false);
    expect(within(faq).getByRole('link', { name: /Tanya lewat WhatsApp/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
  });

  it('CTA gelap dengan tombol unduh generik, footer terang multi-kolom + sosial + catatan', () => {
    const container = demo();
    const cta = section(container, 'cta');
    expect(cta.querySelector('[data-tpl-tone="inverse"]')).not.toBeNull();
    expect(within(cta).getByRole('link', { name: 'App Store' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/apps\.apple\.com\//));
    expect(within(cta).getByRole('link', { name: 'Google Play' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/play\.google\.com\//));
    const footer = container.querySelector('footer')!;
    expect(footer.className).toContain('bg-[#F1F3F2]');
    expect(within(footer).getAllByRole('navigation').map((n) => n.getAttribute('aria-label'))).toEqual(['Produk', 'Solusi', 'Perusahaan']);
    expect(within(footer).getByRole('link', { name: 'Tanya jawab' })).toHaveAttribute('href', '#faq');
    expect(footer.textContent).toContain('Media sosial');
    expect(footer.textContent).toContain('Tampilan saldo dan transaksi di halaman ini adalah ilustrasi.');
    expect(footer.querySelector('svg[viewBox="0 0 32 32"]'), 'FinovaMark').not.toBeNull();
  });

  it('foto: hanya hero eager + fetchpriority; foto demo ber-srcset, sizes, width/height, alt', () => {
    const container = demo();
    const photos = Array.from(container.querySelectorAll<HTMLImageElement>('main img')).filter((img) => img.getAttribute('src')?.includes('/photos/'));
    expect(photos.length).toBeGreaterThanOrEqual(10);
    const eager = photos.filter((img) => img.getAttribute('loading') === 'eager');
    expect(eager.map((img) => img.getAttribute('src'))).toEqual(['/assets/templates/photos/finova-hero-1200.webp']);
    expect(eager[0].getAttribute('fetchpriority')).toBe('high');
    for (const img of photos) {
      expect(img.getAttribute('srcset'), img.src).toMatch(/ (800|240)w/);
      expect(img.getAttribute('sizes')).toBeTruthy();
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
    }
    expect(within(section(container, 'testimonials')).getByRole('img', { name: 'Sri Wahyuni, Bendahara koperasi, Yogyakarta' })).toBeInTheDocument();
  });

  it('datar: tidak ada kelas shadow selain tombol WhatsApp melayang milik Shell', () => {
    const container = demo();
    const shadowed = Array.from(container.querySelectorAll<HTMLElement>('[class*="shadow"]'));
    expect(shadowed.map((el) => el.getAttribute('aria-label'))).toEqual(['Chat WhatsApp']);
  });

  it('pratinjau CMS (preview tanpa motion) diam: tanpa data-reveal, mitra statis, angka utuh, tanpa tautan wa.me', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')?.getAttribute('data-tpl-motion')).toBe('off');
    expect(container.querySelector('[data-reveal]')).toBeNull();
    expect(container.querySelector('.tpl-marquee-track')).toBeNull();
    expect(section(container, 'clients').querySelectorAll('ul')).toHaveLength(1);
    expect(section(container, 'advantages').textContent).toContain('1.500');
    expect(container.querySelector('.tpl-count[data-count]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
  });

  it('logo unggahan pembeli, warna utama & warna tombol pilihan dipakai', () => {
    const container = demo({ brand: { logo: '/assets/sites/7/logo.png', accent_color: '#1D4ED8', highlight_color: '#FDBA74' } });
    const header = container.querySelector('header')!;
    expect(header.querySelector('img[src="/assets/sites/7/logo.png"]')).not.toBeNull();
    expect(header.querySelector('svg[viewBox="0 0 32 32"]')).toBeNull();
    const root = container.querySelector('[data-tpl-root]') as HTMLElement;
    expect(root.style.getPropertyValue('--tpl-accent')).toBe('#1d4ed8');
    const vars = root.querySelector<HTMLElement>('[style*="--fin-hl"]')!;
    expect(vars.style.getPropertyValue('--fin-hl')).toBe('#fdba74');
  });
});

describe('Finova: konten lama, sebagian, dan minim', () => {
  it('konten sebagian: isian tersimpan menimpa, sisanya konten bawaan', () => {
    const container = demo({ hero: { title: 'Koperasi Maju Bersama' }, brand: { company_name: 'KSP Maju Bersama' } });
    expect(container.querySelector('h1')!.textContent).toBe('Koperasi Maju Bersama');
    expect(container.querySelector('header')!.textContent).toContain('KSP Maju Bersama');
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(section(container, 'faq').textContent).toContain('Apakah Lumbung Arta bisa dipakai gratis?');
  });

  it('konten company profile lama (template lain) tetap terbaca tanpa error', () => {
    const container = demo(saved);
    const s = saved as unknown as Record<string, Record<string, unknown>>;
    const textContent = container.textContent ?? '';
    for (const value of [s.hero.title, s.about.title, s.cta.title, ...(s.services.items as Record<string, string>[]).slice(0, 4).map((i) => i.title)] as string[]) {
      expect(textContent, value).toContain(value);
    }
    // Hero tanpa foto: panel tetap (bidang pengganti), tanpa <img> eager
    const hero = section(container, 'hero');
    expect(hero.querySelector('img[fetchpriority="high"]')).toBeNull();
    expect(hero.getAttribute('data-hero-layout')).toBe('panel');
    expect(sectionKeys(container)).not.toContain('gallery');
  });

  it('isi minim: list kosong & foto kosong → tata letak menyesuaikan tanpa bidang kosong', () => {
    const minimal = {
      hero: { image: '', chips: [], balance_label: '', balance_value: '', proof_value: '', proof_text: '' },
      clients: { items: [] },
      advantages: { title: '', stats: [{ value: '24/7', label: 'Bantuan' }] },
      about: { image: '', mock_items: [], mock_title: '', mock_value: '', mock_caption: '', points: [] },
      services: { items: [{ title: 'Tabungan', description: 'Menabung rutin', image: '' }], stat_value: '' },
      testimonials: { items: [{ quote: 'Membantu sekali', name: 'Ani', photo: '' }] },
      faq: { image: '', items: [{ question: 'Gratis?', answer: 'Ya.' }] },
      cta: { app_store_url: '', play_store_url: '' },
      contact: { whatsapp: '', address: '', maps_url: '' },
      footer: { links: [] },
    };
    const container = demo(minimal);
    expect(sectionKeys(container)).toEqual(ORDER.filter((k) => k !== 'clients'));
    const hero = section(container, 'hero');
    expect(hero.querySelector('ul[aria-label="Pengguna kami"]')).toBeNull();
    expect(hero.querySelector('ul[aria-label="Transaksi terbaru"]')).toBeNull();
    expect(hero.textContent).not.toContain('Saldo');
    // Angka bukan satu angka tampil apa adanya; judul angka kosong → judul tersembunyi untuk pembaca layar
    expect(section(container, 'advantages').textContent).toContain('24/7');
    expect(section(container, 'advantages').querySelector('h2.sr-only')).not.toBeNull();
    // Produk tanpa kartu UI & tanpa gambar → hanya teks
    expect(section(container, 'about').querySelector('img')).toBeNull();
    // Bento satu kartu penuh tanpa foto → tumpukan kartu dekoratif, tanpa peta
    expect(section(container, 'services').querySelectorAll(':scope ul > li')).toHaveLength(1);
    expect(section(container, 'services').querySelector('svg[data-fin-map]')).toBeNull();
    // Testimoni tanpa foto: tanpa potret besar dan tanpa tombol panah (satu item)
    const stories = section(container, 'testimonials');
    expect(stories.querySelector('img')).toBeNull();
    expect(within(stories).queryByRole('button', { name: 'Testimoni berikutnya' })).toBeNull();
    // FAQ tanpa WhatsApp → tombol bantuan menuju Kontak; tanpa tombol unduh
    expect(within(section(container, 'faq')).getByRole('link', { name: /Tanya lewat WhatsApp/ })).toHaveAttribute('href', '#kontak');
    expect(within(section(container, 'cta')).queryByRole('link', { name: 'App Store' })).toBeNull();
    // Footer tanpa kolom tautan → hanya kolom sosial
    expect(within(container.querySelector('footer')!).queryAllByRole('navigation')).toHaveLength(0);
  });

  it('hero dimatikan: header jadi bilah gelap biasa, mitra tampil sebagai strip sendiri', () => {
    const container = demo({ hero: { enabled: false } });
    expect(sectionKeys(container)).toEqual(ORDER.filter((k) => k !== 'hero'));
    const header = container.querySelector('header')!;
    expect(header.className).not.toContain('h-0');
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })[0].textContent).not.toContain('Beranda');
  });
});

describe('Finova: editor CMS', () => {
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
        // "Tautan 1" saja, bukan "Tautan 10"/"Tautan 11" (footer punya > 9 tautan)
        fireEvent.click(box.getByRole('button', { name: new RegExp(`^${f.itemLabel} 1(?![0-9])`) }));
        for (const sub of f.fields) expect(container.textContent, `${s.key}.${f.key}.${sub.key}`).toContain(sub.label);
      }
      unmount();
    }
  });
});

describe('Finova: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash', () => {
    const weird = {
      hero: { chips: 'x', highlight: 'tidak ada di judul', proof_value: 5 },
      advantages: { stats: [null, { value: 7 }] },
      about: { mock_items: [{ label: 3 }], points: 'x', body: 9 },
      services: { items: [{ title: 1 }, null, 'x'] },
      faq: { items: [{ question: 2, answer: null }] },
      footer: { links: [{ group: 1, label: 2, url: 3 }] },
      brand: { highlight_color: 'hijau' },
    } as unknown as SiteContent;
    expect(() => render(<def.Component content={resolveContent(def, weird)} />)).not.toThrow();
  });
});
