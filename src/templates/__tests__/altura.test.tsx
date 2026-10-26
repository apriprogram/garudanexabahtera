// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/altura.test.tsx
// Altura (company profile berbahasa Inggris untuk developer properti global, 2026-10-27): skema CMS & konten demo, helper
// model (warna tema, menu, tujuan tautan, tanggal en-US, filter portofolio, ikon spesifikasi, angka "+", formulir
// enquiry → pesan WhatsApp/email), demo (urutan section, lang="en", hero dua panel, menu pil, pilar, pita angka, proyek
// akordion, portofolio berfilter, pimpinan, penghargaan, testimoni, wawasan, ajakan, kontak + formulir, footer), datar
// tanpa bayangan, SEO situs pembeli, konten opsional kosong, pratinjau CMS diam, editor CMS, warna tema, data katalog,
// dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../altura/icons';
import {
  accentIsDark,
  alturaVars,
  EMPTY_ENQUIRY,
  enquiryMailto,
  enquiryMessage,
  filterPortfolio,
  navItems,
  PAGE_SECTIONS,
  parseIsoDate,
  portfolioCategories,
  sectionTarget,
  specIcon,
  splitStat,
  validateEnquiry,
  validEmail,
  validPhone,
} from '../altura/model';
import { ALTURA_PHOTOS } from '../altura/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

// Demo panjang (15 section) + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.altura;
const ORDER = [
  'hero',
  'about',
  'pillars',
  'amenities',
  'stats',
  'difference',
  'developments',
  'portfolio',
  'leadership',
  'awards',
  'testimonials',
  'insights',
  'cta',
  'contact',
];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="altura" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = ALTURA_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const decoded = (el: Element | null) => decodeURIComponent(el?.getAttribute('href') ?? '');

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('Altura: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas, label CMS berbahasa Indonesia', () => {
    expect(def.code).toBe('altura');
    expect(def.name).toBe('Altura');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(fields('hero')).toEqual(expect.arrayContaining(['title', 'subtitle', 'image', 'stat_value', 'stat_label', 'watch_label', 'watch_url', 'header_label', 'call_label']));
    expect(fields('contact')).toEqual(expect.arrayContaining(['phone', 'email', 'whatsapp', 'offices', 'maps_query', 'maps_url', 'form_title', 'interests']));
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      for (const f of s.fields) if (isListField(f)) expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      expect(s.introduced).toBeUndefined();
      if (s.key !== 'brand') expect(s.toggleable, s.key).toBe(true);
    }
    // Panel CMS dipakai pembeli Indonesia: label berbahasa Indonesia
    const labels = def.sections.flatMap((s) => [s.label, ...s.fields.map((f) => f.label)]).join(' ');
    expect(labels).toMatch(/Nama perusahaan/);
    expect(labels).toMatch(/Warna tema/);
    expect(labels).toMatch(/Deskripsi singkat/);
  });

  it('konten demo lolos validasi CMS, semua foto terdaftar, ada di public/, tercatat di CREDITS.md, dan dipakai', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#D4EC5E');
    expect(c.hero.image).toBe('/assets/templates/photos/altura-hero-1200.webp');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(ALTURA_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(credits).toContain('## Altura (Altura Developments, fiktif)');
    expect(ALTURA_PHOTOS.keys.length).toBeGreaterThanOrEqual(20);
    for (const key of ALTURA_PHOTOS.keys) {
      expect(key.startsWith('altura-'), key).toBe(true);
      for (const url of urls(ALTURA_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(ALTURA_PHOTOS.src(key));
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/altura-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/altura/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths.length).toBe(4);
    for (const d of paths) expect(component, d).toContain(d.trim());
  });

  it('foto demo ringan: WebP ≤ 160 KB per file, total ≤ 3,6 MB; alt bawaan berbahasa Inggris', () => {
    let total = 0;
    for (const key of ALTURA_PHOTOS.keys) {
      for (const url of urls(ALTURA_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(160);
        total += kb;
      }
      const alt = ALTURA_PHOTOS.alt(ALTURA_PHOTOS.src(key), '');
      expect(alt.split(' ').length, key).toBeGreaterThanOrEqual(4);
      expect(alt, key).not.toMatch(/\b(dengan|dan|di|yang|foto)\b/);
    }
    expect(total).toBeLessThanOrEqual(3600);
  });

  it('salinan demo berbahasa Inggris dan jujur: fiktif, tanpa klaim izin/sertifikasi/bursa, janji imbal hasil, atau merek nyata', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/guaranteed|guarantee|returns? of \d|\bROI\b|\bISO \d|certified|licensed by|\bNYSE\b|\bNASDAQ\b|\bSGX\b|listed on|\bIMO\b|award-winning #1|best in the world/i);
    expect(text).not.toMatch(/\b(Emaar|CapitaLand|Sobha|Damac|Mapletree|Marriott|Hilton|Hyatt|Ritz|Four Seasons)\b/);
    // Bahasa Inggris (en-US): tanpa kata Indonesia umum
    expect(text).not.toMatch(/\b(dan|yang|untuk|dengan|kami|anda|perusahaan)\b/i);
    expect(text).toMatch(/Altura Developments/);
    expect(text).not.toMatch(/\b(programme|neighbourhood|colour|organise)\b/);
  });
});

describe('Altura: helper model', () => {
  it('warna tema: zaitun gelap dari limau bawaan (#1e2219, putih ≥ 14:1), versi terang ≥ 6:1 di atasnya, tinta ≥ 4,8:1 di putih & krem', () => {
    const lime = alturaVars('#D4EC5E') as Record<string, string>;
    expect(lime['--al-deep']).toBe('#1e2219');
    for (const accent of ['#D4EC5E', '#1D4ED8', '#047857', '#FFE600', '#111111', 'bukan warna']) {
      const vars = alturaVars(accent) as Record<string, string>;
      const deep = rgb(vars['--al-deep']);
      expect(contrast(deep, [255, 255, 255]), accent).toBeGreaterThanOrEqual(14);
      expect(contrast(rgb(vars['--al-bright']), deep), accent).toBeGreaterThanOrEqual(6);
      expect(contrast(rgb(vars['--al-ink']), [255, 255, 255]), accent).toBeGreaterThanOrEqual(4.8);
      expect(contrast(rgb(vars['--al-ink']), [242, 239, 231]), accent).toBeGreaterThanOrEqual(4.8);
    }
    expect(alturaVars('bukan warna')).toEqual(alturaVars('#D4EC5E'));
    expect(accentIsDark('#D4EC5E')).toBe(false);
    expect(accentIsDark('#1D4ED8')).toBe(true);
  });

  it('menu: About, Developments, Portfolio, Leadership, Insights, Contact; label singkat dari pil section; section kosong tidak masuk menu', () => {
    const content = resolveContent(def, null);
    expect(navItems(content)).toEqual([
      { key: 'about', label: 'About' },
      { key: 'developments', label: 'Developments' },
      { key: 'portfolio', label: 'Portfolio' },
      { key: 'leadership', label: 'Leadership' },
      { key: 'insights', label: 'Insights' },
      { key: 'contact', label: 'Contact' },
    ]);
    const custom = resolveContent(def, { portfolio: { eyebrow: 'Proyek' }, leadership: { items: [] }, insights: { enabled: false } });
    expect(navItems(custom).map((n) => n.label)).toEqual(['About', 'Developments', 'Proyek', 'Contact']);
  });

  it('tautan "#…": anchor Inggris/Indonesia ke section yang benar, anchor tak dikenal → null', () => {
    expect(sectionTarget('#projects')).toBe('developments');
    expect(sectionTarget('proyek')).toBe('developments');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('enquiry')).toBe('contact');
    expect(sectionTarget('#team')).toBe('leadership');
    expect(sectionTarget('#galeri')).toBe('portfolio');
    expect(sectionTarget('#keunggulan')).toBe('difference');
    expect(sectionTarget('#berita')).toBe('insights');
    expect(sectionTarget('#tentang')).toBe('about');
    expect(sectionTarget('#tidak-ada')).toBeNull();
  });

  it('tanggal en-US, filter portofolio tanpa beda huruf/tanda hubung, ikon spesifikasi, angka "+"', () => {
    expect(parseIsoDate('2026-10-08')).toEqual({ iso: '2026-10-08', label: 'Oct 8, 2026' });
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('next week')).toBeNull();
    const items = [{ category: 'Residential' }, { category: 'mixed-use' }, { category: 'Mixed use' }, { category: '' }, { category: 'residential' }];
    expect(portfolioCategories(items)).toEqual(['Residential', 'mixed-use']);
    expect(filterPortfolio(items, 'Mixed-use')).toHaveLength(2);
    expect(filterPortfolio(items, 'Nope')).toHaveLength(5);
    expect(filterPortfolio(items, null)).toHaveLength(5);
    expect([specIcon('420 m²'), specIcon('18,500 sq ft'), specIcon('5 beds'), specIcon('2 baths'), specIcon('32 floors'), specIcon('180 parking'), specIcon('Grade A')]).toEqual([
      'area',
      'area',
      'bed',
      'bath',
      'floors',
      'parking',
      'other',
    ]);
    expect(splitStat('48+')).toEqual({ main: '48', sup: '+' });
    expect(splitStat('$2.3B+')).toEqual({ main: '$2.3B', sup: '+' });
    expect(splitStat('24/7')).toEqual({ main: '24/7', sup: '' });
    expect(iconKey('Security & compliance')).toBe('security');
    expect(iconKey('Easy customization process')).toBe('custom');
    expect(iconKey('Zzz', 1)).toBe('quality');
  });

  it('formulir enquiry: galat per isian dalam bahasa Inggris, telepon opsional berkode negara, pesan & mailto tersusun rapi', () => {
    const options = { interests: ['Buying a home', 'Commercial leasing'], offices: ['Singapore', 'Dubai'] };
    const errors = validateEnquiry(EMPTY_ENQUIRY, options);
    expect(Object.keys(errors).sort()).toEqual(['email', 'interest', 'message', 'name']);
    expect(errors.email).toMatch(/^Please enter a valid email address/);
    expect(validateEnquiry({ ...EMPTY_ENQUIRY, phone: '12ab' }, options).phone).toMatch(/country code/);
    expect(validateEnquiry({ ...EMPTY_ENQUIRY, office: 'Paris' }, options).office).toBeTruthy();
    expect(validateEnquiry(EMPTY_ENQUIRY, { interests: [], offices: [] }).interest).toBeUndefined();
    expect(validPhone('+65 8123 4567')).toBe(true);
    expect(validPhone('+44 (20) 7946-0123')).toBe(true);
    expect(validPhone('65+81234567')).toBe(false);
    expect(validPhone('12345')).toBe(false);
    expect(validEmail('jo@company.com')).toBe(true);
    expect(validEmail('jo@company')).toBe(false);
    const form = { name: ' Jordan Lee ', email: 'jordan@example.com', phone: '', interest: 'Buying a home', office: '', message: 'Looking for a\n\nthree-bedroom home.' };
    expect(validateEnquiry(form, options)).toEqual({});
    const message = enquiryMessage('Altura Developments', form);
    expect(message).toBe(
      'Hello Altura Developments, I would like to make an enquiry.\nName: Jordan Lee\nEmail: jordan@example.com\nEnquiry about: Buying a home\nMessage: Looking for a three-bedroom home.\nThank you.',
    );
    const mailto = enquiryMailto('enquiries@alturadevelopments.com', form, message);
    expect(mailto).toMatch(/^mailto:enquiries@alturadevelopments\.com\?subject=/);
    expect(decodeURIComponent(mailto)).toContain('subject=Enquiry: Buying a home – Jordan Lee');
    expect(decodeURIComponent(mailto)).toContain('Name: Jordan Lee');
    expect(enquiryMailto('bukan email', form, message)).toBe('');
  });
});

describe('Altura: demo', () => {
  it('urutan section, lang="en", satu h1, hero dua panel (data-hero-layout diptych) berfoto prioritas, menu pil', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelector('[lang="en"]')).not.toBeNull();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('diptych');
    expect(hero.querySelector('h1')!.textContent).toBe('Raising the standard of urban living');
    const img = hero.querySelector('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/altura-hero-1200.webp');
    expect(img.getAttribute('alt')).toMatch(/^White high-rise residential tower/);
    expect(hero.textContent).toContain('The Verdant Residences, Singapore');
    expect(hero.textContent).toContain('40');
    expect(hero.textContent).toContain('years of experience');
    expect(within(hero).getByRole('link', { name: /View all services/ })).toHaveAttribute('href', '#pillars');
    expect(within(hero).getByRole('link', { name: /Watch the film/ })).toHaveAttribute('href', '#developments');
    const header = container.querySelector('header')!;
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['About', 'Developments', 'Portfolio', 'Leadership', 'Insights', 'Contact']);
    expect(within(header).getByRole('link', { name: /Get in touch/ })).toHaveAttribute('href', '#kontak');
    expect(within(header).getByRole('link', { name: '+65 6123 4567' })).toHaveAttribute('href', 'tel:+6561234567');
    expect(header.textContent).toContain('Call us:');
  });

  it('menu HP: tombol buka/tutup (aria-expanded), menu di dalam pil, Esc menutup dan fokus kembali ke tombol', () => {
    const container = demo();
    const button = within(container).getByRole('button', { name: 'Buka menu' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAccessibleName('Tutup menu');
    const panels = within(container).getAllByRole('navigation', { name: 'Menu utama' });
    expect(panels).toHaveLength(2);
    expect(within(panels[1]).getByRole('link', { name: '+65 6123 4567' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(button);
  });

  it('tentang, tiga pilar bernomor (gelap / warna tema / foto) dengan tautan selebar kartu, deret layanan', () => {
    const container = demo();
    const about = section(container, 'about');
    expect(about.querySelector('h2')!.textContent).toBe('We develop landmark real estate across four continents');
    expect(within(about).getByRole('link', { name: /Meet our leadership/ })).toHaveAttribute('href', '#leadership');
    const pillars = section(container, 'pillars');
    const cards = pillars.querySelectorAll('article');
    expect(cards).toHaveLength(3);
    expect(cards[0].className).toContain('bg-(--al-deep)');
    expect(cards[1].className).toContain('bg-(--tpl-accent)');
    expect(cards[1].querySelector('img')).not.toBeNull();
    expect(cards[2].querySelector('img')!.getAttribute('alt')).toBe('');
    expect(Array.from(cards).map((c) => c.querySelector('h3')!.textContent)).toEqual(['What we do', 'Our impact', 'Core values']);
    expect(within(cards[1] as HTMLElement).getByRole('link', { name: 'See projects' })).toHaveAttribute('href', '#portfolio');
    expect(pillars.querySelectorAll('.al-notch')).toHaveLength(3);
    const amenities = section(container, 'amenities');
    expect(amenities.querySelector('h2')!.textContent).toBe('What every Altura address includes');
    expect(amenities.textContent).toContain('Comprehensive amenities');
  });

  it('pita angka: 4 angka raksasa dengan "+" kecil berwarna tema dan garis bertitik; keunggulan berikon', () => {
    const container = demo();
    const stats = section(container, 'stats');
    expect(stats.querySelector('[data-tpl-tone="inverse"]')).not.toBeNull();
    const dds = Array.from(stats.querySelectorAll('dd'));
    expect(dds.map((dd) => dd.textContent)).toEqual(['48+', '52+', '$2.3B+', '18M+']);
    expect(dds[0].querySelector('sup')!.className).toContain('text-(--al-bright)');
    expect(Array.from(stats.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual([
      'Completed projects',
      'Projects in development',
      'Total project value',
      'Square feet delivered',
    ]);
    expect(stats.querySelectorAll('.al-line')).toHaveLength(4);
    const difference = section(container, 'difference');
    expect(difference.querySelectorAll('li h3')).toHaveLength(6);
    expect(difference.querySelectorAll('li svg')).toHaveLength(6);
  });

  it('proyek akordion: satu kartu terbuka, klik/fokus membuka kartu lain, panah kiri/kanan berpindah, tombol "View details"', () => {
    const container = demo();
    const dev = section(container, 'developments');
    const cards = Array.from(dev.querySelectorAll('li'));
    expect(cards).toHaveLength(5);
    expect(cards.map((c) => c.getAttribute('data-active'))).toEqual(['true', 'false', 'false', 'false', 'false']);
    const buttons = within(dev).getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['The Canopy Residences', 'Meridian One', 'Halcyon Tower', 'Whitecliff Quay', 'Verde Terraces']);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(buttons[2]);
    expect(cards[2]).toHaveAttribute('data-active', 'true');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    fireEvent.keyDown(buttons[2], { key: 'ArrowRight' });
    expect(cards[3]).toHaveAttribute('data-active', 'true');
    expect(document.activeElement).toBe(buttons[3]);
    fireEvent.keyDown(buttons[3], { key: 'Home' });
    expect(cards[0]).toHaveAttribute('data-active', 'true');
    fireEvent.mouseEnter(cards[4]);
    expect(cards[4]).toHaveAttribute('data-active', 'true');
    expect(within(cards[4]).getByRole('link', { name: /View details/ })).toHaveAttribute('href', '#kontak');
    expect(within(dev).getByRole('link', { name: /View all projects/ })).toHaveAttribute('href', '#portfolio');
  });

  it('portofolio: tombol filter kategori (aria-pressed) benar-benar menyaring kartu; harga, lokasi, spesifikasi berikon', () => {
    const container = demo();
    const portfolio = section(container, 'portfolio');
    const group = within(portfolio).getByRole('group', { name: 'Filter properties' });
    const filters = within(group).getAllByRole('button');
    expect(filters.map((b) => b.textContent)).toEqual(['All', 'Residential', 'Commercial', 'Hospitality', 'Mixed-use']);
    expect(filters[0]).toHaveAttribute('aria-pressed', 'true');
    const names = () => Array.from(portfolio.querySelectorAll('article h3')).map((h) => h.textContent);
    expect(names()).toHaveLength(8);
    fireEvent.click(filters[2]);
    expect(filters[2]).toHaveAttribute('aria-pressed', 'true');
    expect(filters[0]).toHaveAttribute('aria-pressed', 'false');
    expect(names()).toEqual(['Altura Exchange', 'Harbourline Offices']);
    expect(portfolio.textContent).toContain('2 properties shown');
    const card = portfolio.querySelector('article')!;
    expect(card.textContent).toContain('From $68 / sq ft');
    expect(card.textContent).toContain('Singapore');
    expect(card.querySelectorAll(':scope ul li svg')).toHaveLength(3);
    fireEvent.click(filters[0]);
    expect(names()).toHaveLength(8);
  });

  it('pimpinan dengan LinkedIn, penghargaan berjalan (2 baris), testimoni + kartu nilai, wawasan bertanggal', () => {
    const container = demo();
    const leaders = section(container, 'leadership');
    expect(Array.from(leaders.querySelectorAll('figcaption h3')).map((h) => h.textContent)).toEqual(['Elena Marquez', 'Daniel Whitford', 'Marcus Lindqvist']);
    expect(within(leaders).getByRole('link', { name: 'Elena Marquez on LinkedIn' })).toHaveAttribute('href', 'https://linkedin.com/company/altura-developments');
    const awards = section(container, 'awards');
    expect(awards.querySelectorAll('ul[aria-label]')).toHaveLength(2);
    expect(awards.textContent).toContain('Residential Developer of the Year');
    expect(awards.textContent).toContain('Asia Habitat Awards 2025');
    const testimonials = section(container, 'testimonials');
    expect(testimonials.querySelectorAll('blockquote')).toHaveLength(4);
    expect(testimonials.textContent).toContain('4.9');
    expect(testimonials.textContent).toContain('Average resident rating');
    const insights = section(container, 'insights');
    const times = Array.from(insights.querySelectorAll('time'));
    expect(times.map((t) => [t.getAttribute('datetime'), t.textContent])).toEqual([
      ['2026-10-08', 'Oct 8, 2026'],
      ['2026-09-22', 'Sep 22, 2026'],
      ['2026-09-03', 'Sep 3, 2026'],
    ]);
    expect(within(insights).getByRole('link', { name: /View all insights/ })).toHaveAttribute('href', 'https://linkedin.com/company/altura-developments');
    // Artikel tanpa URL: judul bukan tautan
    expect(insights.querySelector('article h3 a')).toBeNull();
  });

  it('ajakan foto malam: tombol ke formulir kontak & WhatsApp; kontak dengan kantor dan peta', () => {
    const container = demo();
    const cta = section(container, 'cta');
    expect(cta.querySelector('h2')!.textContent).toBe('Your dream home awaits');
    expect(within(cta).getByRole('link', { name: /Book a private viewing/ })).toHaveAttribute('href', '#kontak');
    expect(decoded(within(cta).getByRole('link', { name: /Chat on WhatsApp/ }))).toBe(
      'https://wa.me/6581234567?text=Hello Altura, I would like to know more about your developments.',
    );
    const contact = section(container, 'contact');
    expect(contact.textContent).toContain('Singapore');
    expect(contact.textContent).toContain('Headquarters');
    expect(within(contact).getByRole('link', { name: '+971 4 123 4567' })).toHaveAttribute('href', 'tel:+97141234567');
    expect(contact.querySelector('iframe')!.getAttribute('src')).toContain(encodeURIComponent('Marina South, Singapore'));
    expect(within(contact).getByRole('link', { name: 'enquiries@alturadevelopments.com' })).toHaveAttribute('href', 'mailto:enquiries@alturadevelopments.com');
  });

  it('formulir enquiry: galat per isian + fokus ke isian pertama, lalu pesan apa adanya dengan tautan WhatsApp & email; tidak ada data yang dikirim', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const container = demo();
    const contact = section(container, 'contact');
    const form = within(contact).getByRole('form', { name: 'Send an enquiry' });
    fireEvent.submit(form);
    expect(within(form).getByText('Please enter your full name.')).toBeInTheDocument();
    const name = within(form).getByLabelText('Full name');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(name);
    fireEvent.change(name, { target: { value: 'Jordan Lee' } });
    expect(name).not.toHaveAttribute('aria-invalid');
    fireEvent.change(within(form).getByLabelText('Email'), { target: { value: 'jordan@example.com' } });
    fireEvent.change(within(form).getByLabelText(/^Phone/), { target: { value: '+65 9123 4567' } });
    fireEvent.change(within(form).getByLabelText('Your enquiry is about'), { target: { value: 'Buying a home' } });
    fireEvent.change(within(form).getByLabelText(/^Preferred office/), { target: { value: 'Dubai' } });
    fireEvent.change(within(form).getByLabelText('Message'), { target: { value: 'Looking for a three-bedroom home in 2027.' } });
    vi.useFakeTimers();
    fireEvent.submit(form);
    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
    const pre = contact.querySelector('pre')!;
    expect(pre.textContent).toBe(
      'Hello Altura Developments, I would like to make an enquiry.\nName: Jordan Lee\nEmail: jordan@example.com\nPhone: +65 9123 4567\nEnquiry about: Buying a home\nPreferred office: Dubai\nMessage: Looking for a three-bedroom home in 2027.\nThank you.',
    );
    expect(document.activeElement?.textContent).toContain('Your message is ready');
    expect(decoded(within(contact).getByRole('link', { name: /Open WhatsApp/ }))).toBe(`https://wa.me/6581234567?text=${pre.textContent}`);
    expect(within(contact).getByRole('link', { name: /Send by email/ }).getAttribute('href')).toMatch(/^mailto:enquiries@alturadevelopments\.com\?subject=Enquiry%3A%20Buying%20a%20home/);
    fireEvent.click(within(contact).getByRole('button', { name: /Edit details/ }));
    expect((within(contact).getByLabelText('Full name') as HTMLInputElement).value).toBe('Jordan Lee');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('footer gelap: logo, menu, proyek, kantor, kontak, sosial, hak cipta otomatis, wordmark raksasa dekoratif', () => {
    const container = demo();
    const footer = container.querySelector('footer')!;
    expect(footer).toHaveAttribute('data-tpl-section', 'footer');
    expect(within(footer).getByRole('navigation', { name: 'Footer' })).toBeInTheDocument();
    expect(footer.textContent).toContain('The Canopy Residences');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} Altura Developments. All rights reserved.`);
    expect(within(footer).getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://linkedin.com/company/altura-developments');
    const wordmark = Array.from(footer.querySelectorAll('[aria-hidden="true"] p')).find((p) => p.textContent === 'Altura');
    expect(wordmark).toBeDefined();
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell)', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const source = ['Altura', 'Header', 'Hero', 'Intro', 'Proof', 'Projects', 'People', 'Closing', 'Footer', 'ui', 'styles']
      .map((f) => readFileSync(resolve(ROOT, `src/templates/altura/${f}.${f === 'styles' ? 'ts' : 'tsx'}`), 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/\bshadow-/);
  });
});

describe('Altura: SEO situs pembeli', () => {
  it('judul tab & meta description', () => {
    expect(siteTitle('altura', null)).toBe('Altura Developments — Global real estate developer & investment manager');
    const restore = applySiteHead('altura', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Altura Developments creates and manages residential towers/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    restore();
  });

  it('satu H1, tiap section diawali H2 (pilar & layanan: H2 untuk pembaca layar), tanpa h4–h6', () => {
    const container = demo();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h4, h5, h6')).toHaveLength(0);
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      const levels = Array.from(section(container, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
    }
    expect(section(container, 'hero').querySelector('h2')).toBeNull();
  });

  it('gambar: alt, width/height, srcset & sizes; hanya foto hero yang eager', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThan(25);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ 800w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
    }
    const eager = imgs.filter((img) => img.getAttribute('loading') !== 'lazy');
    expect(eager.map((img) => img.getAttribute('src'))).toEqual(['/assets/templates/photos/altura-hero-1200.webp']);
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kecuali kirim formulir); SVG dekoratif tersembunyi', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) {
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(button.closest('form') && /Prepare my message/.test(button.textContent ?? '') ? 'submit' : 'button');
    }
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
  });
});

describe('Altura: konten opsional kosong', () => {
  it('hero tanpa foto → bidang lembut (bentuk hero tetap), tanpa chip lokasi; tanpa angka & video → tanpa baris bawah', () => {
    const container = demo({ hero: { image: '', stat_value: '', stat_label: '', watch_label: '' } });
    const hero = section(container, 'hero');
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.textContent).not.toContain('The Verdant Residences');
    expect(hero.textContent).not.toContain('years of experience');
    expect(within(hero).queryByRole('link', { name: /Watch/ })).toBeNull();
    expect(hero.querySelector('h1')!.textContent).toBe('Raising the standard of urban living');
  });

  it('hero dimatikan → menu pil biasa di alur halaman (bukan menumpang)', () => {
    const container = demo({ hero: { enabled: false } });
    expect(sectionKeys(container)[0]).toBe('about');
    expect(container.querySelector('header')!.className).not.toContain('h-0');
  });

  it('pilar tanpa foto → kartu gelap; proyek tanpa foto tidak tampil; testimoni tanpa foto → daftar di tengah', () => {
    const container = demo({
      pillars: { items: [{ title: 'A', text: 'x' }, { title: 'B', text: 'y' }, { title: 'C', text: 'z', image: '' }] },
      developments: { items: [{ name: 'Tanpa foto', image: '' }, { name: 'Berfoto', image: '/assets/templates/photos/altura-dev-1-1200.webp' }] },
      testimonials: { image: '' },
    });
    const cards = section(container, 'pillars').querySelectorAll('article');
    expect(cards[2].className).toContain('bg-(--al-deep)');
    expect(cards[1].querySelector('img')).toBeNull();
    expect(section(container, 'developments').querySelectorAll('li')).toHaveLength(1);
    const list = section(container, 'testimonials').querySelector('ul')!;
    expect(list.className).toContain('@5xl:col-start-3');
  });

  it('tanpa WhatsApp & email → formulir diganti ajakan menelepon; tanpa WhatsApp → hanya tombol email; section kosong hilang dari menu', () => {
    const none = demo({ contact: { whatsapp: '', email: '' } });
    const contact = section(none, 'contact');
    expect(contact.querySelector('form')).toBeNull();
    expect(within(contact).getAllByRole('link', { name: '+65 6123 4567' }).length).toBeGreaterThan(0);
    cleanup();
    const emailOnly = demo({ contact: { whatsapp: '' }, insights: { items: [] } });
    const form = section(emailOnly, 'contact').querySelector('form')!;
    expect(form.textContent).toContain('send yourself by email.');
    expect(sectionKeys(emailOnly)).not.toContain('insights');
    expect(within(emailOnly.querySelector('header')!).queryByRole('link', { name: 'Insights' })).toBeNull();
  });

  it('semua section dimatikan → tanpa section dan tanpa footer', () => {
    const off = Object.fromEntries(Object.keys(def.defaultContent).map((key) => [key, { enabled: false }]));
    const container = demo(off);
    expect(container.querySelectorAll('[data-tpl-section]')).toHaveLength(0);
    expect(container.querySelector('footer')).toBeNull();
  });
});

describe('Altura: pratinjau CMS', () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung) dan tanpa tautan wa.me / mailto yang terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(container.querySelector('a[href^="https://linkedin.com"]')).toBeNull();
    // Marquee diam: daftar statis
    expect(container.querySelector('.tpl-marquee')).toBeNull();
  });
});

describe('Altura: editor CMS', () => {
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
        fireEvent.click(box.getAllByRole('button', { name: new RegExp(`^${f.itemLabel} 1(?![0-9])`) })[0]);
        for (const sub of f.fields) expect(container.textContent, `${s.key}.${f.key}.${sub.key}`).toContain(sub.label);
      }
      unmount();
    }
  }, 60_000);
});

describe('Altura: warna tema bisa diganti', () => {
  it('limau bawaan → --tpl-accent & zaitun gelap; biru dari CMS → semua turunan ikut, teks tombol putih, kartu tema bercincin putih', () => {
    const lime = demo();
    expect(rootStyle(lime, '--tpl-accent')).toBe('#d4ec5e');
    expect(rootStyle(lime, '--al-deep')).toBe('#1e2219');
    expect(rootStyle(lime, '--tpl-on-accent')).not.toBe('#ffffff');
    expect(section(lime, 'pillars').querySelectorAll('article')[1]).not.toHaveAttribute('data-tpl-tone');
    cleanup();
    const blue = demo({ brand: { accent_color: '#1D4ED8' } });
    expect(rootStyle(blue, '--tpl-accent')).toBe('#1d4ed8');
    expect(rootStyle(blue, '--tpl-on-accent')).toBe('#ffffff');
    expect(rootStyle(blue, '--al-deep')).not.toBe('#1e2219');
    expect(section(blue, 'pillars').querySelectorAll('article')[1]).toHaveAttribute('data-tpl-tone', 'inverse');
  });
});

describe('Altura: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-27_031_altura_template.sql'])(
    '%s: baris altura dengan template_code, kategori Company Profile, harga, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'altura'");
      expect(text).toContain("'Company Profile'");
      expect(text).toContain('1890000.00');
      expect(text).toContain("'/assets/templates/altura-preview.webp'");
      expect(text).toContain('\'["/assets/templates/altura-1.webp","/assets/templates/altura-2.webp"]\'');
      expect(text).toMatch(/menyusun pesan WhatsApp atau email untuk tim Anda tanpa menyimpan data/);
    },
  );

  it('migrasi 031 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const text = sql('database/migrations/2026-10-27_031_altura_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'altura';/);
    expect(text).toMatch(/sort_order\s+= 15/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-27_031', 'templates: katalog Altura')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['altura-preview', 'altura-1', 'altura-2']) {
      const path = resolve(ROOT, `public/assets/templates/${name}.webp`);
      expect(existsSync(path), name).toBe(true);
      const kb = statSync(path).size / 1024;
      expect(kb, name).toBeGreaterThan(10);
      expect(kb, name).toBeLessThan(220);
      const head = readFileSync(path).subarray(0, 30);
      const chunk = head.toString('ascii', 12, 16);
      const size = chunk === 'VP8X' ? [head.readUIntLE(24, 3) + 1, head.readUIntLE(27, 3) + 1] : [head.readUInt16LE(26) & 0x3fff, head.readUInt16LE(28) & 0x3fff];
      expect(['VP8 ', 'VP8X'], name).toContain(chunk);
      expect(size, name).toEqual([1600, 1000]);
    }
  });
});

describe('Altura: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { title: 5, primary_url: 'javascript:alert(1)', watch_url: 'vbscript:x', watch_image: 'javascript:alert(1)', stat_value: 12345 },
      pillars: { items: [null, { title: 3, url: 'javascript:alert(1)', link_label: 'Go' }] },
      amenities: { items: 'x' },
      stats: { items: [{ value: 7 }, 'x', { label: null }] },
      difference: { items: [{ title: 2, text: null }] },
      developments: { items: [{ name: 'X', image: 'javascript:alert(1)' }, { name: 3, image: '/assets/templates/photos/altura-dev-2-1200.webp', url: 'javascript:alert(1)', link_label: 'Go' }] },
      portfolio: { items: [{ name: 'P', category: 9, spec_1: null, image: 'javascript:alert(1)', url: 'javascript:alert(1)' }] },
      leadership: { items: [{ name: 'L', linkedin: 'javascript:alert(1)', photo: 9 }] },
      awards: { items: [{ title: 1 }] },
      testimonials: { items: [{ quote: 'Good', photo: 'javascript:alert(1)' }], image: 'x' },
      insights: { items: [{ title: 'I', date: '2026-13-40', url: 'javascript:alert(1)' }] },
      contact: { offices: 'x', interests: [{ name: 4 }], whatsapp: 'abc', maps_url: 'javascript:alert(1)' },
      brand: { accent_color: 'lime' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('5');
    expect(section(container, 'insights').textContent).toContain('2026-13-40');
    expect(section(container, 'developments').querySelectorAll('li')).toHaveLength(1);
  });
});
