// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/aura-studio.test.tsx
// Aura Studio (docs/platform/TEMPLATE-BRIEFS-2026-10.md §2 + §4.2): skema & konten demo, helper tata letak (daftar hero,
// bento, tab kategori, menu), render demo (hero belah berfoto, navigasi "Layanan ▾", tab perawatan, lingkaran
// "Mengapa kami"), pratinjau CMS diam, konten lama/sebagian tetap tampil dengan nilai bawaan, dan editor CMS memuat
// semua field skema Aura Studio.
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { act, cleanup, configure, fireEvent, getConfig, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import SiteEditor from '../../pages/account/SiteEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { AURA_STUDIO_ACCENT } from '../aura-studio/defaultContent';
import {
  SLOT_SPAN,
  bentoClass,
  bentoSlots,
  categoriesOf,
  heroPicks,
  navLinks,
  treatmentsIn,
  treatmentsOf,
  type Treatment,
} from '../aura-studio/model';
import { AURA_PHOTOS } from '../aura-studio/photos';
import { TEMPLATES, resolveContent } from '../index';
import { SiteRenderer } from '../SiteRenderer';
import { isListField, type ListItem, type SiteContent } from '../types';

afterEach(cleanup);

const def = TEMPLATES['aura-studio'];
const ORDER = ['hero', 'advantages', 'services', 'featured', 'about', 'gallery', 'testimonials', 'team', 'cta', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`);
const items = (sectionKey: string, listKey = 'items') => def.defaultContent[sectionKey][listKey] as ListItem[];

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ─── Skema & konten bawaan ────────────────────────────────────────────────────

describe('Aura Studio: skema & konten bawaan', () => {
  it('urutan section skema = urutan halaman; section baru featured & team; tanpa introduced (template baru)', () => {
    expect(def.sections.map((s) => s.key)).toEqual([
      'brand',
      'hero',
      'advantages',
      'services',
      'featured',
      'about',
      'clients',
      'gallery',
      'testimonials',
      'team',
      'cta',
      'contact',
      'footer',
    ]);
    for (const s of def.sections) {
      expect(s.introduced, s.key).toBeUndefined();
      for (const f of s.fields) expect(f.introduced, `${s.key}.${f.key}`).toBeUndefined();
    }
  });

  it('setiap field skema punya nilai bawaan (teks/list) sehingga CMS menampilkan isi contoh', () => {
    for (const s of def.sections) {
      const content = def.defaultContent[s.key] as Record<string, unknown>;
      expect(content, s.key).toBeTypeOf('object');
      for (const f of s.fields) {
        if (isListField(f)) {
          const list = content[f.key] as ListItem[];
          expect(Array.isArray(list), `${s.key}.${f.key}`).toBe(true);
          expect(list.length, `${s.key}.${f.key}`).toBeLessThanOrEqual(f.max ?? 99);
          for (const item of list) for (const sub of f.fields) expect(typeof item[sub.key], `${s.key}.${f.key}.${sub.key}`).toBe('string');
        } else {
          expect(typeof content[f.key], `${s.key}.${f.key}`).toBe('string');
        }
      }
    }
  });

  it('field baru brief §2.4 ada di skema', () => {
    const keys = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(keys('hero')).toEqual(expect.arrayContaining(['list_title', 'booking_label', 'chat_label', 'social_label', 'image']));
    expect(keys('services')).toEqual(expect.arrayContaining(['more_label', 'more_url', 'items']));
    const serviceItem = def.sections.find((s) => s.key === 'services')!.fields.find((f) => f.key === 'items');
    expect(serviceItem && isListField(serviceItem) ? serviceItem.fields.map((f) => f.key) : []).toEqual(['title', 'description', 'image', 'category', 'count', 'price']);
    expect(keys('featured')).toEqual(['eyebrow', 'title', 'body', 'image', 'tags_title', 'tags', 'steps', 'button_label', 'button_url']);
    expect(keys('team')).toEqual(['eyebrow', 'title', 'subtitle', 'items']);
    expect(keys('advantages')).not.toContain('stats');
    expect(keys('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
  });

  it('konten bawaan lolos validasi CMS, aksen sage, logo kosong, clients disembunyikan', () => {
    const resolved = resolveContent(def, null);
    expect(validateContent(def, resolved)).toEqual({});
    expect(def.defaultContent.brand.accent_color).toBe(AURA_STUDIO_ACCENT);
    expect(def.defaultContent.brand.logo).toBe('');
    expect(def.defaultContent.clients.enabled).toBe(false);
  });

  it('semua foto demo dari registry Aura Studio (srcset), tidak ada foto template lain', () => {
    const c = def.defaultContent;
    const photos = [
      c.hero.image,
      c.featured.image,
      c.about.image,
      c.cta.image,
      ...items('services').map((s) => s.image),
      ...items('gallery').map((g) => g.image),
      ...items('testimonials').map((t) => t.photo),
      ...items('team').map((t) => t.photo),
    ].filter(Boolean) as string[];
    expect(photos.length).toBeGreaterThanOrEqual(20);
    for (const src of photos) {
      expect(src, src).toMatch(/^\/assets\/templates\/photos\/aura-studio-/);
      expect(AURA_PHOTOS.asset(src)?.srcSet, src).toMatch(/ (800|240)w, .* \d+w$/);
    }
    // Setiap foto terdaftar dipakai (tidak ada file yatim)
    const used = new Set(photos.map((src) => src.replace(/^.*\/(aura-studio-[a-z0-9-]+?)-\d+\.webp$/, '$1')));
    for (const key of AURA_PHOTOS.keys) expect(used.has(key), key).toBe(true);
  });

  it('tanpa bayangan pada kartu/foto/tombol dan tanpa impor template lain', () => {
    const dir = resolve(process.cwd(), 'src/templates/aura-studio');
    for (const name of readdirSync(dir)) {
      const source = readFileSync(join(dir, name), 'utf8');
      expect(source, name).not.toMatch(/\bshadow-/);
      expect(source, name).not.toMatch(/from '\.\.\/(corporate-nexa|startup-clean|arena-club|finova)/);
    }
  });
});

// ─── Helper tata letak ────────────────────────────────────────────────────────

const t = (title: string, category = '', image = ''): ListItem => ({ title, category, image, description: '', count: '', price: '' });

describe('Aura Studio: helper tata letak', () => {
  it('daftar hero bergiliran antar kategori; tanpa kategori → urutan biasa', () => {
    const list = treatmentsOf([t('A1', 'Wajah'), t('A2', 'Wajah'), t('A3', 'Wajah'), t('B1', 'Kuku'), t('B2', 'Kuku')]);
    expect(heroPicks(list).map((x) => x.title)).toEqual(['A1', 'B1', 'A2']);
    expect(heroPicks(treatmentsOf([t('X'), t('Y'), t('Z'), t('W')])).map((x) => x.title)).toEqual(['X', 'Y', 'Z']);
    expect(heroPicks(treatmentsOf([t('A1', 'Wajah'), t('L')])).map((x) => x.title)).toEqual(['A1', 'L']);
    expect(heroPicks([])).toEqual([]);
    expect(heroPicks(treatmentsOf(items('services'))).map((x) => x.title)).toEqual(['Konsultasi Kulit', 'Manikur Jepang', 'Facial Pembersihan']);
  });

  it('kategori unik (abaikan huruf besar/spasi); item tanpa kategori ikut tab pertama; item kosong dibuang', () => {
    const list = treatmentsOf([t('A', 'Wajah'), t('B', ' wajah '), t('C', 'Kuku'), t('D'), t('', '', ''), { foo: 'x' }]);
    expect(list.map((x) => x.title)).toEqual(['A', 'B', 'C', 'D']);
    const cats = categoriesOf(list);
    expect(cats).toEqual(['Wajah', 'Kuku']);
    expect(treatmentsIn(list, cats, 'WAJAH').map((x: Treatment) => x.title)).toEqual(['A', 'B', 'D']);
    expect(treatmentsIn(list, cats, 'Kuku').map((x: Treatment) => x.title)).toEqual(['C']);
    expect(treatmentsIn(list, [], null)).toHaveLength(4);
  });

  it('bento 12 kolom: setiap baris penuh untuk 1–13 ubin; HP 2 kolom tanpa lubang', () => {
    for (let n = 1; n <= 13; n += 1) {
      const slots = bentoSlots(n);
      expect(slots).toHaveLength(n);
      const area = slots.reduce((sum, s) => sum + SLOT_SPAN[s].cols * SLOT_SPAN[s].rows, 0);
      expect(area % 12, `n=${n}`).toBe(0);
      // HP: jumlah sel (kolom × baris) genap → grid 2 kolom terisi penuh
      const phoneCells = slots.reduce((sum, _s, i) => {
        const cls = bentoClass(slots, i);
        const cols = /(^|\s)col-span-2/.test(cls) ? 2 : 1;
        const rows = /(^|\s)row-span-2/.test(cls) ? 2 : 1;
        return sum + cols * rows;
      }, 0);
      expect(phoneCells % 2, `HP n=${n}`).toBe(0);
    }
    expect(bentoSlots(7)).toEqual(['tall', 'tall', 'wide', 'wide', 'third', 'third', 'third']);
    expect(bentoSlots(5)).toEqual(['tall', 'tall', 'wide', 'wide', 'full']);
    expect(bentoSlots(0)).toEqual([]);
  });

  it('menu mengikuti section yang tampil dan berisi', () => {
    const content = resolveContent(def, { gallery: { items: [{ caption: 'tanpa foto' }] }, team: { enabled: false }, featured: { title: '', body: '' } });
    expect(navLinks(content).map((n) => n.key)).toEqual(['services', 'about', 'testimonials', 'contact']);
    expect(navLinks(resolveContent(def, null)).map((n) => n.label)).toEqual(['Layanan', 'Unggulan', 'Tentang', 'Galeri', 'Testimoni', 'Tim', 'Kontak']);
  });
});

// ─── Demo ─────────────────────────────────────────────────────────────────────

describe('Aura Studio: demo', () => {
  it('urutan section, satu h1, hero belah dengan foto potret eager, foto lain lazy', () => {
    const { container } = render(<SiteRenderer templateCode="aura-studio" content={null} />);
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero')!;
    expect(hero.getAttribute('data-hero-layout')).toBe('split');
    expect(hero.querySelector('h1')!.textContent).toBe('Rawat diri dengan tenang');
    const heroImg = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(heroImg.getAttribute('src')).toBe(def.defaultContent.hero.image);
    expect(heroImg.getAttribute('sizes')).toContain('55vw');
    const eager = Array.from(container.querySelectorAll('img')).filter((img) => img.getAttribute('loading') !== 'lazy');
    expect(eager).toEqual([heroImg]);
    for (const img of Array.from(container.querySelectorAll('img'))) {
      expect(img.getAttribute('width'), img.src).toBeTruthy();
      expect(img.hasAttribute('alt'), img.src).toBe(true);
    }
    // Chip "cari jadwal" adalah tautan nyata (bukan kolom isian), tidak ada input di hero
    expect(hero.querySelector('input')).toBeNull();
    expect(within(hero).getByRole('link', { name: /Cari jadwal perawatan di Sekar Ayu, reservasi/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    // Daftar layanan hero: 3 baris bergiliran kategori + chip jumlah otomatis
    const rows = within(hero).getAllByRole('listitem').map((li) => li.textContent);
    expect(rows[0]).toContain('Konsultasi Kulit');
    expect(rows[1]).toContain('Manikur Jepang');
    expect(rows[2]).toContain('Facial Pembersihan');
    expect(hero.textContent).toContain('10 perawatan');
  });

  it('header: monogram AuraMark + nama, pil "Layanan" membuka kategori, Esc menutup & fokus kembali', () => {
    const { container } = render(<SiteRenderer templateCode="aura-studio" content={null} />);
    const header = container.querySelector('header')!;
    expect(header.querySelector('svg[viewBox="0 0 32 32"]')).not.toBeNull();
    expect(header.textContent).toContain('Sekar Ayu Aesthetic Studio');
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    const button = within(nav).getByRole('button', { name: 'Layanan' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(button.getAttribute('aria-controls')!)!;
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual(['Perawatan Wajah6 perawatan', 'Perawatan Kuku4 perawatan']);
    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(button);

    // Pilih kategori dari menu → tab Kuku aktif dan halaman digulir ke Perawatan
    fireEvent.click(button);
    fireEvent.click(within(document.getElementById(button.getAttribute('aria-controls')!)!).getByRole('link', { name: /Perawatan Kuku/ }));
    expect(screen.getByRole('tab', { name: 'Perawatan Kuku' })).toHaveAttribute('aria-selected', 'true');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    // Footer
    const footer = container.querySelector('footer')!;
    expect(footer.querySelector('svg[viewBox="0 0 32 32"]')).not.toBeNull();
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/sekarayu.studio');
  });

  it('tab kategori perawatan: role tab, panah kanan berpindah, isi panel berganti; ubin = reservasi WhatsApp perawatan itu', () => {
    const { container } = render(<SiteRenderer templateCode="aura-studio" content={null} />);
    const services = section(container, 'services')!;
    const tabs = within(services).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Perawatan Wajah', 'Perawatan Kuku']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    const panel = within(services).getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tabs[0].id);
    // 6 perawatan wajah + kartu "lebih banyak di Instagram"
    expect(within(panel).getAllByRole('listitem')).toHaveLength(7);
    const facial = within(panel).getByRole('link', { name: /Facial Pembersihan/ });
    expect(decodeURIComponent(facial.getAttribute('href')!)).toContain('saya ingin reservasi Facial Pembersihan');
    expect(within(panel).getByRole('link', { name: /Lihat lebih banyak di Instagram/ })).toHaveAttribute('href', 'https://instagram.com/sekarayu.studio');

    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    const kuku = within(services).getByRole('tab', { name: 'Perawatan Kuku' });
    expect(kuku).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(kuku);
    const kukuPanel = within(services).getByRole('tabpanel');
    expect(within(kukuPanel).getAllByRole('listitem')).toHaveLength(5);
    expect(kukuPanel.textContent).toContain('Pedikur Spa');
    // Perawatan tanpa foto → ubin warna polos (tanpa img)
    const pedikur = within(kukuPanel).getByRole('link', { name: /Pedikur Spa/ });
    expect(pedikur.querySelector('img')).toBeNull();
  });

  it('Mengapa kami: judul di tengah lingkaran (dekoratif), 4 kartu bernomor 01/04', () => {
    const { container } = render(<SiteRenderer templateCode="aura-studio" content={null} />);
    const why = section(container, 'advantages')!;
    expect(within(why).getByRole('heading', { level: 2 }).textContent).toBe('Mengapa kami?');
    expect(why.querySelector('svg.aura-circles')?.getAttribute('aria-hidden')).toBe('true');
    expect(why.querySelectorAll('svg.aura-circles circle')).toHaveLength(3);
    const cards = within(why).getAllByRole('listitem');
    expect(cards).toHaveLength(4);
    expect(cards[0].textContent).toContain('01 / 04');
    expect(cards[0].className).toContain('@4xl:col-start-1');
    expect(cards[3].className).toContain('@4xl:col-start-3');
  });

  it('perawatan unggulan, testimoni berganti, tim, ajakan, kontak', () => {
    const { container } = render(<SiteRenderer templateCode="aura-studio" content={null} />);
    const featured = section(container, 'featured')!;
    expect(featured.querySelector('img')!.closest('.rounded-full')).not.toBeNull();
    expect(within(featured).getAllByRole('listitem').map((li) => li.textContent)).toEqual(
      expect.arrayContaining(['Kuku rapuh setelah gel', expect.stringContaining('Konsultasi singkat')]),
    );
    expect(decodeURIComponent(within(featured).getByRole('link', { name: /Reservasi perawatan ini/ }).getAttribute('href')!)).toContain('Manikur Jepang');

    const testimonials = section(container, 'testimonials')!;
    expect(testimonials.textContent).toContain('Anisa Rahma');
    const second = within(testimonials).getByRole('button', { name: 'Testimoni dari Maya Kartika' });
    fireEvent.click(second);
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(testimonials.querySelector('blockquote')!.textContent).toContain('Kuku saya terlihat sehat');

    expect(section(container, 'team')!.textContent).toContain('Ayu Paramitha');
    const cta = section(container, 'cta')!;
    expect(within(cta).getByRole('link', { name: /Reservasi Sekarang/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    const contact = section(container, 'contact')!;
    expect(contact.querySelector('iframe')?.getAttribute('src')).toContain('output=embed');
    expect(within(contact).getByRole('button', { name: /Kirim lewat WhatsApp/ })).toBeInTheDocument();
    // Tidak ada tautan lain yang menyaru tombol WhatsApp melayang milik Shell
    expect(screen.getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
  });

  it('pratinjau CMS: gerak mati, tanpa tautan wa.me, isi tampil statis', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-motion]')?.getAttribute('data-tpl-motion')).toBe('off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('[data-reveal="pending"]')).toBeNull();
    expect(container.querySelector('.aura-compact')?.getAttribute('aria-hidden')).toBe('true');
  });
});

// ─── Konten lama / sebagian ───────────────────────────────────────────────────

describe('Aura Studio: konten tersimpan sebagian atau berbeda', () => {
  it('konten sebagian → bagian lain memakai nilai bawaan', () => {
    const { container } = render(
      <SiteRenderer templateCode="aura-studio" content={{ brand: { company_name: 'Salon Melati' }, hero: { title: 'Cantik alami setiap hari' } }} />,
    );
    expect(section(container, 'hero')!.querySelector('h1')!.textContent).toBe('Cantik alami setiap hari');
    expect(container.querySelector('header')!.textContent).toContain('Salon Melati');
    expect(sectionKeys(container)).toEqual(ORDER);
  });

  it('perawatan tanpa kategori → tanpa tab, judul tampil; alasan ≠ 4 → grid biasa; hero tanpa foto tetap berbentuk', () => {
    const content = {
      hero: { image: '' },
      services: { title: 'Layanan barbershop', items: [{ title: 'Potong rambut', price: 'Rp50.000' }, { title: 'Cukur jenggot' }, { title: 'Creambath' }] },
      advantages: { items: [{ title: 'Satu' }, { title: 'Dua' }, { title: 'Tiga' }] },
    } as unknown as SiteContent;
    const { container } = render(<SiteRenderer templateCode="aura-studio" content={content} />);
    const services = section(container, 'services')!;
    expect(within(services).queryByRole('tablist')).toBeNull();
    expect(within(services).getByRole('heading', { level: 2 }).textContent).toBe('Layanan barbershop');
    // 3 perawatan + kartu Instagram = 4 ubin
    expect(within(services).getAllByRole('listitem')).toHaveLength(4);
    const why = section(container, 'advantages')!;
    expect(within(why).getAllByRole('listitem')).toHaveLength(3);
    expect(within(why).getAllByRole('listitem')[0].className).not.toContain('@4xl:col-start-1');
    const hero = section(container, 'hero')!;
    expect(hero.querySelector('img[fetchpriority="high"]')).toBeNull();
    expect(hero.getAttribute('data-hero-layout')).toBe('split');
    // Daftar hero tanpa kategori: 3 perawatan pertama
    expect(hero.textContent).toContain('Potong rambut');
  });

  it('hero disembunyikan → tombol reservasi pindah ke header; tanpa WhatsApp → reservasi menuju Kontak', () => {
    const { container } = render(<SiteRenderer templateCode="aura-studio" content={{ hero: { enabled: false }, contact: { whatsapp: '' } }} />);
    expect(section(container, 'hero')).toBeNull();
    const header = container.querySelector('header')!;
    const reserve = within(header).getByRole('link', { name: 'Reservasi' });
    expect(reserve).toHaveAttribute('href', '#kontak');
    expect(reserve.className).not.toContain('@5xl:hidden');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
  });

  it('konten mentah tanpa resolveContent tidak crash', () => {
    const raw = { services: { items: [{ title: 'Facial', category: 'Wajah' }] }, featured: { title: 'Unggulan', steps: 'bukan list' } } as unknown as SiteContent;
    expect(() => render(<def.Component content={raw} />)).not.toThrow();
    expect(() => render(<def.Component content={{} as SiteContent} preview />)).not.toThrow();
  });
});

// ─── Editor CMS ───────────────────────────────────────────────────────────────

describe('Aura Studio: editor CMS', { timeout: 30_000 }, () => {
  let defaultAsyncTimeout = 1000;
  beforeAll(() => {
    defaultAsyncTimeout = getConfig().asyncUtilTimeout;
    configure({ asyncUtilTimeout: 10_000 });
  });
  afterAll(() => configure({ asyncUtilTimeout: defaultAsyncTimeout }));
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const mockApi = () => {
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const action = new URL(String(input), 'http://localhost').searchParams.get('action') ?? '';
        if (action === 'get_settings') return json(200, { footer_whatsapp: '0812-1111-2222' });
        if (action === 'customer_get_site') {
          return json(200, {
            success: true,
            site: {
              id: 3,
              status: 'active',
              template_code: 'aura-studio',
              content: null,
              order_id: 3,
              order_number: 'GN-20261023-AURA01',
              user_id: 9,
              template_id: 4,
              template_name: 'Aura Studio',
              domain: 'salon-uji.test',
              activated_at: '2026-10-23 10:00:00',
              updated_at: '2026-10-23 10:00:00',
            },
          });
        }
        return json(404, { error: 'tidak ada' });
      }),
    );
  };

  it('semua section skema tampil di editor; field baru bisa diisi dan pratinjau ikut berubah; list perawatan bisa ditambah', async () => {
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
    mockApi();
    render(
      <MemoryRouter initialEntries={['/akun/situs/3']}>
        <Routes>
          <Route path="/akun/situs/:siteId" element={<SiteEditor />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Kelola konten situs' });
    for (const s of def.sections) expect(document.querySelector(`[data-cms-section="${s.key}"]`), s.key).not.toBeNull();

    const open = (key: string) => fireEvent.click(document.querySelector(`[data-cms-section="${key}"] button[aria-expanded]`)!);
    open('hero');
    const booking = screen.getByLabelText('Teks chip "cari jadwal" di foto') as HTMLInputElement;
    expect(booking.value).toBe('Cari jadwal perawatan di Sekar Ayu');
    fireEvent.change(booking, { target: { value: 'Cek jadwal kosong minggu ini' } });
    await waitFor(() => expect(screen.getByLabelText('Pratinjau situs').textContent).toContain('Cek jadwal kosong minggu ini'));

    open('featured');
    expect(screen.getByLabelText('Nama perawatan')).toHaveValue('Manikur Jepang');
    expect(screen.getByRole('button', { name: /Tambah tahap/ })).toBeInTheDocument();

    open('services');
    const before = screen.getAllByRole('button', { name: /^Hapus Perawatan/ }).length;
    expect(before).toBe(10);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Tambah perawatan/ }));
    });
    expect(screen.getAllByRole('button', { name: /^Hapus Perawatan/ })).toHaveLength(before + 1);
    expect(screen.getAllByLabelText('Kategori (nama tab)').length).toBeGreaterThan(0);
  });
});
