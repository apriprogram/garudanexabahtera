// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/corporate-nexa.test.tsx
// Desain premium Corporate Nexa (docs/platform/TEMPLATE-DESIGN.md §3): foto asli, logo, strip klien, gerak yang diam di
// pratinjau CMS, dan kompatibilitas konten situs pembeli yang tersimpan sebelum desain ini.
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { bentoCell } from '../corporate-nexa/bento';
import { TEMPLATES, resolveContent } from '../index';
import { SiteRenderer } from '../SiteRenderer';
import { demoClients, templatePhoto } from '../shared/assets';
import { TEMPLATE_V2 } from '../shared/schema';
import { isListField, type SiteContent, type TemplateField } from '../types';

afterEach(cleanup);

const def = TEMPLATES['corporate-nexa'];
const DEMO_PHOTO = '/assets/templates/photos/';

const section = (root: ParentNode, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`);
const imgs = (root: ParentNode | null) => Array.from(root?.querySelectorAll('img') ?? []);
const srcs = (root: ParentNode | null) => imgs(root).map((img) => img.getAttribute('src') ?? '');

/**
 * Bentuk konten situs pembeli yang disimpan CMS SEBELUM desain premium (seperti template_sites id 20 di basis data
 * lokal): seluruh section lama hasil resolve, gambar unggahan sendiri, tanpa `clients`, `about.image_2`, `cta.image`.
 */
const upload = (name: string) => `/assets/sites/20/${name}`;
const legacySite = {
  brand: { company_name: 'PT Samudra Karya Persada ', tagline: 'Konsultan & kontraktor', logo: upload('logo.webp'), accent_color: '#BE185D', enabled: true },
  hero: {
    enabled: true,
    eyebrow: 'Dipercaya 200+ perusahaan sejak 2009',
    title: 'Membangun ruang usaha yang kokoh, tepat waktu, dan sesuai anggaran',
    highlight: 'tepat waktu',
    subtitle: 'Kami mendampingi perusahaan Anda dari perencanaan hingga konstruksi.',
    primary_label: 'Konsultasi Proyek',
    primary_url: '',
    secondary_label: 'Lihat Layanan',
    secondary_url: '',
    image: upload('hero.jpg'),
  },
  about: {
    enabled: true,
    eyebrow: 'Tentang kami',
    title: 'Mitra konstruksi yang mengutamakan kualitas',
    body: 'Paragraf pertama.\n\nParagraf kedua.',
    image: upload('about.jpg'),
    badge_value: '15+',
    badge_label: 'Tahun pengalaman',
    points: [{ text: 'Tim bersertifikat' }, { text: 'Laporan mingguan' }],
  },
  services: {
    enabled: true,
    eyebrow: 'Layanan',
    title: 'Solusi lengkap',
    subtitle: 'Satu mitra untuk seluruh tahap.',
    items: [
      { title: 'Perencanaan & desain', description: 'Studi kelayakan.', image: '' },
      { title: 'Konstruksi gedung', description: 'Kantor dan ruko.', image: upload('svc.jpg') },
      { title: 'Gudang & pabrik', description: 'Baja bentang lebar.', image: '' },
    ],
  },
  advantages: {
    enabled: true,
    eyebrow: 'Mengapa kami',
    title: 'Hasil kerja yang terukur',
    subtitle: 'Angka kepercayaan klien.',
    stats: [
      { value: '350+', label: 'Proyek selesai' },
      { value: '200+', label: 'Klien korporat' },
      { value: '98%', label: 'Tepat waktu' },
      { value: '12', label: 'Kota' },
    ],
    items: [{ title: 'Jadwal realistis', description: 'Dipantau tiap minggu.' }],
  },
  gallery: {
    enabled: true,
    eyebrow: 'Galeri proyek',
    title: 'Sebagian proyek kami',
    subtitle: 'Dari gedung kantor hingga pabrik.',
    items: [1, 2, 3, 4, 5, 6].map((n) => ({ image: upload(`g${n}.jpg`), caption: `Proyek ${n}` })),
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Testimoni',
    title: 'Apa kata klien kami',
    items: [
      { name: 'Budi Santoso', role: 'Direktur', quote: 'Selesai lebih cepat.', photo: upload('p1.png') },
      { name: 'Rina Wulandari', role: 'Manajer', quote: 'Rapi dan disiplin.', photo: '' },
    ],
  },
  cta: { enabled: true, title: 'Punya rencana pembangunan?', subtitle: 'Estimasi awal tanpa biaya.', button_label: 'Jadwalkan Konsultasi', button_url: '' },
  contact: {
    enabled: true,
    eyebrow: 'Kontak',
    title: 'Mari diskusikan proyek Anda',
    subtitle: '',
    address: 'Jl. Raya Darmo No. 128, Surabaya',
    email: 'halo@samudrakarya.co.id',
    phone: '(031) 555-0128',
    whatsapp: '081234567890',
    whatsapp_message: 'Halo',
    hours: 'Senin–Jumat',
    maps_url: '',
  },
  footer: { enabled: true, description: 'Kontraktor bangunan komersial.', copyright: '', instagram: 'https://instagram.com/samudrakarya', facebook: '', linkedin: '', youtube: '', tiktok: '' },
};

/** Situs lama yang menyimpan semua gambar kosong (seperti template_sites id 10). */
const blankImages = (content: typeof legacySite) =>
  JSON.parse(JSON.stringify(content).replace(/"(image|photo|logo)":"[^"]*"/g, '"$1":""')) as typeof legacySite;

describe('Corporate Nexa: konten demo', () => {
  const renderDemo = (preview = true) => render(<SiteRenderer templateCode="corporate-nexa" content={null} preview={preview} />);

  it('urutan section mengikuti brief, strip klien tepat setelah hero', () => {
    const { container } = renderDemo();
    const keys = Array.from(container.querySelectorAll('[data-tpl-section]')).map((el) => el.getAttribute('data-tpl-section'));
    expect(keys).toEqual(['hero', 'clients', 'about', 'services', 'advantages', 'gallery', 'testimonials', 'cta', 'contact']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it('foto asli: hanya hero yang eager + fetchpriority, sisanya lazy dengan srcset & sizes', () => {
    const { container } = renderDemo();
    const photos = imgs(container).filter((img) => (img.getAttribute('src') ?? '').startsWith(DEMO_PHOTO));
    // hero 1 + tentang 2 + galeri 6 + CTA 1 + avatar (3 di hero, 3 di testimoni)
    expect(photos.length).toBeGreaterThanOrEqual(16);
    const eager = photos.filter((img) => img.getAttribute('loading') === 'eager');
    expect(eager).toHaveLength(1);
    expect(eager[0].getAttribute('src')).toBe(templatePhoto('corporate-nexa-hero'));
    expect(eager[0].getAttribute('fetchpriority')).toBe('high');
    for (const img of photos.filter((p) => p !== eager[0])) expect(img.getAttribute('loading')).toBe('lazy');
    for (const img of photos) {
      expect(img.getAttribute('srcset')).toMatch(/-(800|240)\.webp \d+w/);
      expect(img.getAttribute('sizes')).toBeTruthy();
      expect(img.getAttribute('width')).toBeTruthy();
    }
    expect(srcs(section(container, 'about'))).toEqual([templatePhoto('corporate-nexa-engineers'), templatePhoto('corporate-nexa-blueprint')]);
    expect(srcs(section(container, 'cta'))).toEqual([templatePhoto('corporate-nexa-meeting')]);
    expect(section(container, 'gallery')!.querySelectorAll('figcaption')).toHaveLength(6);
  });

  it('logo perusahaan: simbol bawaan + nama di header & footer (tanpa kotak inisial); logo klien punya alt', () => {
    const { container } = renderDemo();
    const header = container.querySelector('header')!;
    expect(header.textContent).toContain('PT Samudra Karya Persada');
    expect(header.querySelector('a[href="#beranda"] svg')).not.toBeNull();
    expect(header.textContent).not.toMatch(/\bSK\b/);
    expect(container.querySelector('footer a, footer svg')).not.toBeNull();
    // Salinan marquee (aria-hidden) tidak dihitung: hanya daftar yang dibaca pembaca layar
    const logos = imgs(section(container, 'clients')!.querySelector('ul[aria-label]')).map((img) => img.getAttribute('alt'));
    expect(logos).toEqual(demoClients('corporate-nexa').map((c) => c.name));
  });

  it('datar: tidak ada kelas shadow di header, isi, dan footer', () => {
    const { container } = renderDemo(false);
    const flagged = Array.from(container.querySelectorAll('header *, header, main *, footer *')).filter((el) =>
      /(^|\s)([\w:@-]*:)?shadow(-|\s|$)/.test(el.getAttribute('class') ?? ''),
    );
    expect(flagged.map((el) => el.getAttribute('class'))).toEqual([]);
  });

  it('elemen yang disembunyikan di HP tidak membawa kelas display dasar lain (yang akan mengalahkan `hidden`)', () => {
    const { container } = renderDemo(false);
    const display = new Set(['flex', 'inline-flex', 'grid', 'inline-grid', 'block', 'inline-block', 'inline']);
    const clashes = Array.from(container.querySelectorAll('[class]')).filter((el) => {
      const tokens = (el.getAttribute('class') ?? '').split(/\s+/);
      return tokens.includes('hidden') && tokens.some((t) => display.has(t));
    });
    expect(clashes.map((el) => el.getAttribute('class'))).toEqual([]);
  });

  it('blok gelap/aksen menandai data-tpl-tone="inverse" untuk cincin fokus putih', () => {
    const { container } = renderDemo();
    expect(section(container, 'cta')!.querySelector('[data-tpl-tone="inverse"]')).not.toBeNull();
  });
});

describe('Corporate Nexa: gerak', () => {
  it('pratinjau CMS (preview tanpa motion) diam: tanpa elemen tersembunyi, strip logo statis', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')!.getAttribute('data-tpl-motion')).toBe('off');
    expect(container.querySelector('[data-reveal="pending"]')).toBeNull();
    const strip = section(container, 'clients')!;
    expect(strip.querySelectorAll('ul')).toHaveLength(1);
    expect(strip.querySelector('[aria-hidden="true"] img, ul[aria-hidden]')).toBeNull();
  });

  it('demo & situs live meneruskan motion ke Shell', () => {
    const { container } = render(<SiteRenderer templateCode="corporate-nexa" content={null} preview />);
    expect(container.querySelector('[data-tpl-root]')!.getAttribute('data-tpl-motion')).toBe('on');
  });
});

describe('Corporate Nexa: konten situs lama', () => {
  it('gambar unggahan tetap dipakai; tidak ada foto demo, strip klien, gambar kedua, atau foto CTA', () => {
    const content = resolveContent(def, legacySite);
    expect(content.clients.enabled).toBe(false);
    expect(content.about.image_2).toBe('');
    expect(content.cta.image).toBe('');
    const { container } = render(<def.Component content={content} preview />);
    expect(section(container, 'clients')).toBeNull();
    const all = srcs(container);
    expect(all.filter((src) => src.startsWith(DEMO_PHOTO))).toEqual([]);
    expect(srcs(section(container, 'hero'))).toContain(upload('hero.jpg'));
    expect(srcs(section(container, 'about'))).toEqual([upload('about.jpg')]);
    expect(srcs(section(container, 'services'))).toEqual([upload('svc.jpg')]);
    expect(srcs(section(container, 'gallery'))).toEqual([1, 2, 3, 4, 5, 6].map((n) => upload(`g${n}.jpg`)));
    expect(srcs(section(container, 'cta'))).toEqual([]);
    expect(container.querySelector('header img')?.getAttribute('src')).toBe(upload('logo.webp'));
    // Warna aksen tersimpan tetap dipakai
    expect(container.querySelector<HTMLElement>('[data-tpl-root]')!.style.getPropertyValue('--tpl-accent')).toBe('#be185d');
    // Teks lama utuh
    expect(container.textContent).toContain('Mitra konstruksi yang mengutamakan kualitas');
    expect(container.textContent).toContain('Jadwalkan Konsultasi');
  });

  it('gambar tersimpan kosong tetap kosong: bidang pengganti netral, keterangan galeri tetap tampil', () => {
    const { container } = render(<def.Component content={resolveContent(def, blankImages(legacySite))} preview />);
    expect(srcs(container).filter((src) => src.startsWith(DEMO_PHOTO) || src.startsWith('/assets/sites/'))).toEqual([]);
    const gallery = section(container, 'gallery')!;
    expect(gallery.querySelectorAll('figcaption')).toHaveLength(6);
    expect(gallery.textContent).toContain('Proyek 1');
    // Tanpa logo → simbol bawaan + nama
    expect(container.querySelector('header a[href="#beranda"] svg')).not.toBeNull();
  });

  it('konten parsial lama (hanya beberapa field) tetap dirender', () => {
    const partial = {
      brand: { company_name: 'Toko Uji Sejahtera', accent_color: '#0F766E' },
      hero: { title: 'Situs pembeli tampil lewat domainnya sendiri', highlight: 'domainnya sendiri' },
      gallery: { enabled: false },
      services: { items: [{ title: 'Layanan A', description: 'Deskripsi A.' }, { title: 'Layanan C', description: '' }] },
    };
    const { container } = render(<SiteRenderer templateCode="corporate-nexa" content={partial} preview />);
    expect(container.querySelector('h1')?.textContent).toBe('Situs pembeli tampil lewat domainnya sendiri');
    expect(section(container, 'gallery')).toBeNull();
    expect(section(container, 'clients')).toBeNull();
    expect(section(container, 'services')!.querySelectorAll('h3')).toHaveLength(2);
  });

  it('variasi isi: hero tanpa foto & angka, satu testimoni, keunggulan tanpa daftar, galeri 1–7 foto', () => {
    for (let count = 1; count <= 7; count += 1) {
      const content = resolveContent(def, {
        hero: { image: '', title: 'Judul' },
        advantages: { enabled: false },
        testimonials: { items: [{ name: 'A', quote: 'Bagus' }] },
        gallery: { items: Array.from({ length: count }, (_, i) => ({ image: i % 2 ? '' : templatePhoto('corporate-nexa-facade'), caption: `F${i}` })) },
      });
      const { container, unmount } = render(<def.Component content={content} />);
      expect(section(container, 'gallery')!.querySelectorAll('li')).toHaveLength(count);
      expect(section(container, 'testimonials')!.querySelectorAll('figure')).toHaveLength(1);
      unmount();
    }
    const statsOnly = resolveContent(def, { advantages: { items: [] } });
    const { container } = render(<def.Component content={statsOnly} />);
    expect(section(container, 'advantages')!.querySelectorAll('dd')).toHaveLength(4);
    expect(section(container, 'advantages')!.querySelector('ol')).toBeNull();
  });
});

describe('Corporate Nexa: skema CMS', () => {
  it('field baru opsional, bertanda introduced, dan punya nilai bawaan', () => {
    const keys = def.sections.map((s) => s.key);
    expect(keys.slice(0, 3)).toEqual(['brand', 'hero', 'clients']);
    expect(def.sections.find((s) => s.key === 'clients')?.introduced).toBe(TEMPLATE_V2);
    const about = def.sections.find((s) => s.key === 'about')!;
    expect(about.fields.find((f) => f.key === 'image_2')).toMatchObject({ type: 'image', introduced: TEMPLATE_V2 });
    const cta = def.sections.find((s) => s.key === 'cta')!;
    expect(cta.fields.find((f) => f.key === 'image')).toMatchObject({ type: 'image', introduced: TEMPLATE_V2 });
    const logo = def.sections.find((s) => s.key === 'brand')!.fields.find((f) => f.key === 'logo') as TemplateField | undefined;
    expect(logo?.help).toMatch(/simbol bawaan template/);
    // Setiap field skema ada di konten bawaan (CMS menampilkan contoh yang bisa diganti)
    for (const s of def.sections) {
      for (const f of s.fields) {
        const value = (def.defaultContent[s.key] as Record<string, unknown>)[f.key];
        if (isListField(f)) expect(Array.isArray(value), `${s.key}.${f.key}`).toBe(true);
        else expect(typeof value, `${s.key}.${f.key}`).toBe('string');
      }
    }
    expect(def.defaultContent.brand.logo).toBe('');
    expect(def.defaultContent.clients.items).toEqual(demoClients('corporate-nexa'));
  });
});

describe('Corporate Nexa: bento galeri', () => {
  const span = (cls: string, prefix: string) => Number(new RegExp(`${prefix}col-span-(\\d+)`).exec(cls)?.[1] ?? (prefix ? 0 : 1));

  it('setiap baris 12 kolom terisi penuh untuk 1–12 foto', () => {
    for (let n = 1; n <= 12; n += 1) {
      const cells = Array.from({ length: n }, (_, i) => bentoCell(i, n).className);
      const wide = cells.map((cls) => span(cls, '@3xl:'));
      if (n >= 3) {
        expect(wide.slice(0, 3)).toEqual([7, 5, 5]);
        const rest = wide.slice(3);
        let row = 0;
        for (const w of rest) {
          row += w;
          if (row === 12) row = 0;
        }
        expect(row, `n=${n}`).toBe(0);
      } else {
        expect(wide.reduce((a, b) => a + b, 0)).toBe(12);
      }
      // HP: foto pertama selebar baris, sisanya berpasangan (yang sendirian dibuat lebar)
      const phoneSingles = cells.slice(1).filter((cls) => !/(^|\s)col-span-2/.test(cls)).length;
      expect(phoneSingles % 2, `n=${n}`).toBe(0);
      expect(cells[0]).toMatch(/(^|\s)col-span-2/);
    }
  });
});

// Konten aneh tetap aman (uji umum ada di templates.test.tsx); di sini memastikan section baru ikut tahan
it('Corporate Nexa: section clients mentah yang aneh tidak membuat crash', () => {
  const hostile = { clients: { title: 5, items: [null, 'x', { name: 'PT A', logo: 'javascript:alert(1)' }, { logo: '' }] } } as unknown as SiteContent;
  const { container } = render(<def.Component content={resolveContent(def, hostile)} />);
  const strip = section(container, 'clients')!;
  expect(strip.textContent).toContain('PT A');
  expect(strip.querySelector('img')).toBeNull();
});
