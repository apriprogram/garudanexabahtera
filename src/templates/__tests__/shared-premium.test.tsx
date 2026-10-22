// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/shared-premium.test.tsx
// Fondasi desain premium template (docs/platform/TEMPLATE-DESIGN.md): aset foto & logo demo, <Photo>, gerak
// (Reveal / Marquee / CountUp) yang mati di pratinjau CMS, skema opsional, dan kompatibilitas konten lama (`introduced`).
import { cleanup, render } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATES, resolveContent } from '../index';
import { SiteRenderer } from '../SiteRenderer';
import { DEMO_CLIENTS, DEMO_LOGOS, TEMPLATE_PHOTOS, demoClients, photoAlt, photoAsset, templatePhoto } from '../shared/assets';
import { BrandMark } from '../shared/media';
import { CountUp, Marquee, Reveal } from '../shared/Animated';
import { StructureMark } from '../shared/marks';
import { formatCount, parseCount, stagger } from '../shared/motion';
import { Photo } from '../shared/Photo';
import { companyProfileSections, TEMPLATE_V2 } from '../shared/schema';
import { TemplateShell } from '../shared/Shell';
import type { SiteContent, TemplateDefinition } from '../types';

afterEach(cleanup);

// Vitest berjalan dari akar proyek
const PUBLIC = resolve(process.cwd(), 'public');

describe('aset demo', () => {
  it('setiap foto di registry punya dua file WebP di public/', () => {
    const photos = Object.values(TEMPLATE_PHOTOS);
    expect(photos.length).toBeGreaterThanOrEqual(16);
    for (const photo of photos) {
      expect(photo.src).toMatch(/^\/assets\/templates\/photos\/[a-z0-9-]+-\d+\.webp$/);
      for (const candidate of photo.srcSet.split(',')) {
        const path = candidate.trim().split(' ')[0];
        expect(existsSync(PUBLIC + path), path).toBe(true);
      }
    }
  });

  it('logo demo dan logo klien fiktif ada di public/', () => {
    for (const logo of Object.values(DEMO_LOGOS)) {
      expect(existsSync(PUBLIC + logo.lockup)).toBe(true);
      expect(existsSync(PUBLIC + logo.mark)).toBe(true);
    }
    for (const list of Object.values(DEMO_CLIENTS)) {
      expect(list.length).toBeGreaterThanOrEqual(5);
      for (const item of list) expect(existsSync(PUBLIC + item.logo), item.logo).toBe(true);
    }
    expect(demoClients('startup-clean')[0]).toEqual({ ...DEMO_CLIENTS['startup-clean'][0] });
  });

  it('photoAsset mengenali path demo (dengan/tanpa "/" depan, dengan query); unggahan lain → null', () => {
    const hero = templatePhoto('corporate-nexa-hero');
    expect(hero).toBe('/assets/templates/photos/corporate-nexa-hero-1600.webp');
    expect(photoAsset(hero)?.srcSet).toContain('corporate-nexa-hero-800.webp 800w');
    expect(photoAsset(hero.slice(1))?.src).toBe(hero);
    expect(photoAsset(`${hero}?v=2`)?.src).toBe(hero);
    expect(photoAsset('/assets/sites/4/img_123.png')).toBeNull();
    expect(photoAsset('')).toBeNull();
    expect(templatePhoto('tidak-ada')).toBe('');
    expect(photoAlt(hero, 'Gambar PT Uji')).toMatch(/gedung/i);
    expect(photoAlt('/assets/sites/4/img_123.png', 'Gambar PT Uji')).toBe('Gambar PT Uji');
  });
});

describe('angka berjalan', () => {
  it('format Indonesia dibaca dan ditulis ulang persis', () => {
    for (const raw of ['350+', '12.000+', '98%', '4,8', '2 jt+', '15+', '12', 'Rp 5 M', '1.250', '100.000.000']) {
      const parts = parseCount(raw);
      expect(parts, raw).not.toBeNull();
      expect(formatCount(parts!, parts!.value)).toBe(raw);
    }
    expect(parseCount('12.000+')?.value).toBe(12000);
    expect(parseCount('4,8')?.value).toBeCloseTo(4.8);
    expect(formatCount(parseCount('12.000+')!, 1234.4)).toBe('1.234+');
    expect(formatCount(parseCount('4,8')!, 2.25)).toBe('2,3');
  });

  it('bukan satu angka → null (tampil apa adanya)', () => {
    for (const raw of ['24/7', '4,8/5', '–', '', 'Gratis']) expect(parseCount(raw), raw).toBeNull();
  });

  it('stagger dibatasi', () => {
    expect([0, 1, 2].map((i) => stagger(i))).toEqual([0, 80, 160]);
    expect(stagger(20)).toBe(480);
  });
});

const shell = (node: React.ReactNode, props: { preview?: boolean; motion?: boolean } = {}) =>
  render(
    <TemplateShell content={{}} defaultAccent="#1D4ED8" {...props}>
      {node}
    </TemplateShell>,
  );

describe('gerak', () => {
  it('pratinjau CMS (preview tanpa motion) diam; situs live & SiteRenderer bergerak', () => {
    const cms = shell(<p>isi</p>, { preview: true });
    expect(cms.container.querySelector('[data-tpl-root]')?.getAttribute('data-tpl-motion')).toBe('off');
    cms.unmount();
    const live = shell(<p>isi</p>);
    expect(live.container.querySelector('[data-tpl-root]')?.getAttribute('data-tpl-motion')).toBe('on');
    live.unmount();
    const motionOn = shell(<p>isi</p>, { preview: true, motion: true });
    expect(motionOn.container.querySelector('[data-tpl-root]')?.getAttribute('data-tpl-motion')).toBe('on');
  });

  it('SiteRenderer (demo & situs live) mengirim motion=true, bisa dimatikan', () => {
    const original = TEMPLATES['corporate-nexa'];
    const received: (boolean | undefined)[] = [];
    TEMPLATES['corporate-nexa'] = { ...original, Component: ({ motion }) => (received.push(motion), <p>spy</p>) };
    try {
      render(<SiteRenderer templateCode="corporate-nexa" content={null} preview />);
      render(<SiteRenderer templateCode="corporate-nexa" content={null} motion={false} />);
    } finally {
      TEMPLATES['corporate-nexa'] = original;
    }
    expect(received).toEqual([true, false]);
  });

  it('Reveal: tersembunyi menunggu layar hanya bila gerak aktif', () => {
    const off = shell(<Reveal as="section">Halo</Reveal>, { preview: true });
    expect(off.container.querySelector('section')?.hasAttribute('data-reveal')).toBe(false);
    off.unmount();
    // Jauh dari layar (jsdom: ukuran 0) → belum disembunyikan; baru disiapkan saat mendekat
    const far = shell(<Reveal as="section">Halo</Reveal>);
    expect(far.container.querySelector('section')?.hasAttribute('data-reveal')).toBe(false);
    far.unmount();
    // Sudah terlihat saat dipasang → disembunyikan sebelum digambar, menunggu masuk layar
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ x: 0, y: 100, width: 300, height: 80 }));
    try {
      const on = shell(<Reveal as="section" delay={160}>Halo</Reveal>);
      const section = on.container.querySelector('section')!;
      expect(section.getAttribute('data-reveal')).toBe('pending');
      expect(section.style.getPropertyValue('--tpl-delay')).toBe('160ms');
      expect(section.textContent).toBe('Halo');
    } finally {
      rect.mockRestore();
    }
  });

  it('Marquee: statis tanpa salinan saat diam; 4 salinan (3 tersembunyi) saat bergerak', () => {
    const items = ['A', 'B', 'C'].map((name) => <span key={name}>{name}</span>);
    const off = shell(<Marquee label="Klien kami">{items}</Marquee>, { preview: true });
    expect(off.container.querySelectorAll('ul')).toHaveLength(1);
    expect(off.container.querySelector('ul')?.getAttribute('aria-label')).toBe('Klien kami');
    off.unmount();
    const on = shell(<Marquee label="Klien kami">{items}</Marquee>);
    const lists = on.container.querySelectorAll('ul');
    expect(lists).toHaveLength(4);
    expect(on.container.querySelectorAll('ul[aria-hidden="true"]')).toHaveLength(3);
    expect(on.container.querySelector('ul[aria-label="Klien kami"]')?.textContent).toBe('ABC');
  });

  it('CountUp: teks asli selalu utuh di DOM', () => {
    for (const preview of [true, false]) {
      const { container, unmount } = shell(<CountUp value="12.000+" />, { preview });
      expect(container.textContent).toBe('12.000+');
      unmount();
    }
    // Terlihat saat dipasang: angka berjalan mulai dari 0 lewat ::before, teks DOM tetap nilai akhir
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ x: 0, y: 100, width: 120, height: 40 }));
    try {
      const { container } = shell(<CountUp value="12.000+" />);
      expect(container.querySelector('.tpl-count')?.getAttribute('data-count')).toBe('0+');
      expect(container.textContent).toBe('12.000+');
    } finally {
      rect.mockRestore();
    }
  });

  it('CountUp: pengaman saat frame ditahan browser menampilkan nilai akhir dan menghentikan hitungan', () => {
    vi.useFakeTimers();
    // Tab latar: frame animasi tertahan (tidak dijalankan sampai kita panggil manual)
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.set(nextId, cb);
      return nextId++;
    });
    const caf = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id);
    });
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ x: 0, y: 100, width: 120, height: 40 }));
    try {
      const { container } = shell(<CountUp value="350+" duration={1000} />);
      const run = container.querySelector('.tpl-count')!;
      expect(run.getAttribute('data-count')).toBe('0+');
      vi.advanceTimersByTime(2500); // pengaman watchEntrance → mulai hitung (observer jsdom tidak pernah memanggil)
      expect(frames.size).toBe(1);
      vi.advanceTimersByTime(1600); // pengaman CountUp: frame masih tertahan → nilai akhir tampil
      expect(run.hasAttribute('data-count')).toBe(false);
      // Frame tertahan (cap waktu di tengah hitungan) tidak boleh menulis angka berjalan lagi di atas nilai akhir
      for (const cb of [...frames.values()]) cb(performance.now() - 1500);
      expect(run.hasAttribute('data-count')).toBe(false);
      expect(container.textContent).toBe('350+');
    } finally {
      rect.mockRestore();
      raf.mockRestore();
      caf.mockRestore();
      vi.useRealTimers();
    }
  });
});

describe('Photo', () => {
  it('foto demo: srcset, sizes, width/height, lazy; priority → eager + fetchpriority', () => {
    const src = templatePhoto('startup-clean-hero');
    const { container, rerender } = shell(<Photo src={src} alt="Kasir" sizes="50vw" />);
    let img = container.querySelector('img')!;
    expect(img.getAttribute('srcset')).toContain('startup-clean-hero-800.webp 800w');
    expect(img.getAttribute('sizes')).toBe('50vw');
    expect(img.getAttribute('width')).toBe('1600');
    expect(img.getAttribute('loading')).toBe('lazy');
    rerender(
      <TemplateShell content={{}} defaultAccent="#1D4ED8">
        <Photo src={src} alt="Kasir" priority />
      </TemplateShell>,
    );
    img = container.querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });

  it('gambar lama (satu URL) tanpa srcset; kosong → pengganti netral atau tidak dirender', () => {
    const upload = shell(<Photo src="/assets/sites/4/img_1.png" alt="Unggahan" />);
    expect(upload.container.querySelector('img')?.hasAttribute('srcset')).toBe(false);
    upload.unmount();
    const empty = shell(<Photo src="" alt="Gedung" />);
    expect(empty.container.querySelector('img')).toBeNull();
    expect(empty.container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Gedung');
    empty.unmount();
    const none = shell(<Photo src="javascript:alert(1)" alt="" fallback="none" />);
    expect(none.container.querySelector('[data-tpl-root] .\\@container')?.childElementCount).toBe(0);
  });

  it('BrandMark: tanpa logo memakai mark template, bukan inisial', () => {
    const { container } = shell(<BrandMark name="PT Uji Coba" logo="" mark={<StructureMark />} />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.textContent).toBe('PT Uji Coba');
  });
});

describe('skema opsional & konten lama', () => {
  const labels = { servicesLabel: 'Layanan', serviceItemLabel: 'Layanan' };

  it('tanpa opsi skema sama seperti sebelumnya', () => {
    const keys = companyProfileSections(labels).map((s) => s.key);
    expect(keys).toEqual(['brand', 'hero', 'about', 'services', 'advantages', 'gallery', 'testimonials', 'cta', 'contact', 'footer']);
    expect(JSON.stringify(companyProfileSections(labels))).not.toContain('introduced');
  });

  it('opsi menambah section clients setelah hero dan field bertanda introduced', () => {
    const sections = companyProfileSections(labels, { clients: true, aboutSecondImage: true, ctaImage: true });
    expect(sections.map((s) => s.key).slice(0, 3)).toEqual(['brand', 'hero', 'clients']);
    expect(sections.find((s) => s.key === 'clients')?.introduced).toBe(TEMPLATE_V2);
    const about = sections.find((s) => s.key === 'about')!;
    expect(about.fields.find((f) => f.key === 'image_2')?.introduced).toBe(TEMPLATE_V2);
    const cta = sections.find((s) => s.key === 'cta')!;
    expect(cta.fields.find((f) => f.key === 'image')?.type).toBe('image');
  });

  const base = TEMPLATES['corporate-nexa'];
  const def: TemplateDefinition = {
    ...base,
    sections: companyProfileSections(labels, { clients: true, aboutSecondImage: true }),
    defaultContent: {
      ...base.defaultContent,
      clients: { title: 'Dipercaya oleh', items: demoClients('corporate-nexa') },
      about: { ...base.defaultContent.about, image_2: templatePhoto('corporate-nexa-blueprint') },
    } as SiteContent,
  };

  it('konten null (demo / situs baru) → isi demo utuh', () => {
    const content = resolveContent(def, null);
    expect(content.clients.enabled).toBe(true);
    expect(content.about.image_2).toBe(templatePhoto('corporate-nexa-blueprint'));
  });

  it('konten tersimpan lama → section baru disembunyikan, field baru kosong, isi lama utuh', () => {
    const saved = { brand: { company_name: 'PT Lama' }, about: { title: 'Tentang PT Lama', image: '' } };
    const content = resolveContent(def, saved);
    expect(content.clients.enabled).toBe(false);
    expect(content.clients.items).toEqual(demoClients('corporate-nexa'));
    expect(content.about.image_2).toBe('');
    expect(content.about.title).toBe('Tentang PT Lama');
    expect(content.brand.company_name).toBe('PT Lama');
    // Section yang belum pernah tersimpan tetap memakai bawaan seperti sebelumnya
    expect(content.services.items).toEqual(base.defaultContent.services.items);
  });

  it('konten tersimpan baru (sudah punya kuncinya) dipakai apa adanya', () => {
    const saved = { clients: { enabled: true, items: [{ name: 'PT Klien', logo: '' }] }, about: { image_2: '/assets/sites/1/b.png' } };
    const content = resolveContent(def, saved);
    expect(content.clients.enabled).toBe(true);
    expect(content.clients.items).toEqual([{ name: 'PT Klien', logo: '' }]);
    expect(content.about.image_2).toBe('/assets/sites/1/b.png');
  });
});
