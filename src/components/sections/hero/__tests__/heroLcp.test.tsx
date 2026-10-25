// Slide pertama tayangan hero = kandidat LCP beranda (docs/platform/SEO-PLAN.md §5.7, WP7): ada di HTML server dari data
// preload, eager + fetchpriority=high, slide lain lazy, dan head beranda mem-preload URL yang sama.
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { primePreload, resetPreload, seoDataFromApi, PRELOAD_URLS } from '../../../../lib/preload';
import { versionedAsset } from '../../../../seo/assetVersion';
import { getHead } from '../../../../seo/routes';
import type { SeoData } from '../../../../seo/types';
import type { Template } from '../../../../types/platform';
import Hero from '../../Hero';
import { HeroShowcase } from '../HeroShowcase';
import { heroPreloadImage } from '../heroPreload';
import { firstShowcaseImage, peekShowcase, showcaseFromTemplates } from '../showcase';

const template = (id: number, slug: string, name: string, extra: Partial<Template> = {}): Template =>
  ({
    id,
    slug,
    name,
    category: 'Company Profile',
    price: 1500000,
    preview_image: `/assets/templates/${slug}-preview.webp`,
    template_code: slug,
    demo_url: null,
    status: 'published',
    ...extra,
  }) as Template;

const TEMPLATES = [
  template(1, 'corporate-nexa', 'Corporate Nexa'),
  template(2, 'startup-clean', 'Startup Clean'),
  template(15, 'aura-studio', 'Aura Studio'),
];

const seoData = (templates: Template[]): SeoData => ({
  settings: {},
  navbar: [],
  templates,
  projects: [],
  templateBySlug: Object.fromEntries(templates.map((t) => [t.slug, t])),
  builtAt: '2026-10-23T03:00:00.000Z',
});

afterEach(() => resetPreload());

describe('data tayangan hero', () => {
  it('showcaseFromTemplates: urutan API, maks 6, tanpa slug/nama dilewati; kosong → contoh tampilan', () => {
    const data = showcaseFromTemplates([{ slug: '', name: 'X' }, ...TEMPLATES]);
    expect(data.sample).toBe(false);
    expect(data.items.map((item) => item.slug)).toEqual(['corporate-nexa', 'startup-clean', 'aura-studio']);
    expect(data.items[0].image).toBe('/assets/templates/corporate-nexa-preview.webp');
    expect(showcaseFromTemplates(undefined).sample).toBe(true);
  });

  it('latar bawaan: head beranda mem-preload slide pertama tayangan (firstShowcaseImage)', () => {
    expect(firstShowcaseImage(TEMPLATES)).toBe('/assets/templates/corporate-nexa-preview.webp');
    expect(getHead('/', seoData(TEMPLATES)).preloadImage).toBe('/assets/templates/corporate-nexa-preview.webp');
    // tanpa preview_image → SVG bawaan template_code (berversi ?v=<hash>, src/seo/assetVersion.ts)
    const noPreview = [template(3, 'finova', 'Finova', { preview_image: '' })];
    expect(getHead('/', seoData(noPreview)).preloadImage).toBe(versionedAsset('/assets/templates/finova-preview.svg'));
    expect(getHead('/', seoData(noPreview)).preloadImage).toMatch(/^\/assets\/templates\/finova-preview\.svg\?v=[0-9a-f]{8}$/);
  });

  it('latar Gambar → gambar pertama slider latar; Video → poster (tanpa poster: slide tayangan)', () => {
    const images = JSON.stringify(['/assets/bg/hero-a.jpg', '/assets/bg/hero-b.jpg']);
    expect(heroPreloadImage({ hero_bg_mode: 'image', hero_images: images }, TEMPLATES)).toBe('/assets/bg/hero-a.jpg');
    const withImage = { ...seoData(TEMPLATES), settings: { hero_bg_mode: 'image', hero_images: images } };
    expect(getHead('/', withImage).preloadImage).toBe('/assets/bg/hero-a.jpg');
    expect(
      heroPreloadImage({ hero_bg_mode: 'video', hero_bg_video: '/assets/bg/v.mp4', hero_bg_video_poster: '/assets/bg/p.jpg' }, TEMPLATES),
    ).toBe('/assets/bg/p.jpg');
    expect(heroPreloadImage({ hero_bg_mode: 'video', hero_bg_video: '/assets/bg/v.mp4' }, TEMPLATES)).toBe(
      '/assets/templates/corporate-nexa-preview.webp',
    );
    // mode gambar tanpa URL aman → bawaan
    expect(heroPreloadImage({ hero_bg_mode: 'image', hero_images: '["javascript:x"]' }, TEMPLATES)).toBe(
      '/assets/templates/corporate-nexa-preview.webp',
    );
  });

  it('peekShowcase hanya membaca data preload (null tanpa preload)', () => {
    expect(peekShowcase()).toBeNull();
    primePreload({ path: '/', builtAt: '2026-10-23T03:00:00.000Z', api: { [PRELOAD_URLS.templates]: { success: true, templates: TEMPLATES } } });
    expect(peekShowcase()?.items[0].slug).toBe('corporate-nexa');
  });
});

describe('HTML server tayangan hero', () => {
  it('slide pertama eager + fetchpriority=high + ukuran intrinsik; slide lain lazy; progres langkah belum dipasang', () => {
    const { items } = showcaseFromTemplates(TEMPLATES);
    const html = renderToString(
      <MemoryRouter>
        <HeroShowcase mode="template" step={0} onStep={() => {}} items={items} sample={false} slide={0} onNext={() => {}} templatesHidden={false} />
      </MemoryRouter>,
    );
    const imgs = [...html.matchAll(/<img [^>]*>/g)].map(([tag]) => tag);
    expect(imgs).toHaveLength(3);
    expect(imgs[0]).toContain('src="/assets/templates/corporate-nexa-preview.webp"');
    expect(imgs[0]).toMatch(/loading="eager"/);
    expect(imgs[0]).toMatch(/fetchPriority="high"/i);
    expect(imgs[0]).toMatch(/width="1600" height="1000"/);
    for (const tag of imgs.slice(1)) {
      expect(tag).toMatch(/loading="lazy"/);
      expect(tag).not.toMatch(/fetchPriority/i);
    }
    expect(html).not.toContain('step-progress');
  });

  it('priority=false (hero berlatar gambar/video): slide pertama tetap eager, tanpa fetchpriority', () => {
    const { items } = showcaseFromTemplates(TEMPLATES);
    const html = renderToString(
      <MemoryRouter>
        <HeroShowcase mode="template" step={0} onStep={() => {}} items={items} sample={false} slide={0} onNext={() => {}} templatesHidden={false} priority={false} />
      </MemoryRouter>,
    );
    const first = /<img [^>]*>/.exec(html)?.[0] ?? '';
    expect(first).toMatch(/loading="eager"/);
    expect(first).not.toMatch(/fetchPriority/i);
  });

  it('Hero berlatar gambar (setting dari preload): latar langsung tampil tanpa fade-in, slide tayangan tanpa prioritas', () => {
    const settings = { hero_bg_mode: 'image', hero_images: JSON.stringify(['/assets/bg/hero-a.jpg']) };
    primePreload({
      path: '/',
      builtAt: '2026-10-23T03:00:00.000Z',
      api: { [PRELOAD_URLS.settings]: settings, [PRELOAD_URLS.templates]: { success: true, templates: TEMPLATES } },
    });
    const html = renderToString(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
    );
    const imgs = [...html.matchAll(/<img [^>]*>/g)].map(([tag]) => tag);
    const background = imgs.find((tag) => tag.includes('/assets/bg/hero-a.jpg')) ?? '';
    expect(background).toMatch(/fetchPriority="high"/i);
    expect(html).not.toContain('animate-fade-in motion-reduce:animate-none" aria-hidden');
    const slide = imgs.find((tag) => tag.includes('corporate-nexa-preview.webp')) ?? '';
    expect(slide).toMatch(/loading="eager"/);
    expect(slide).not.toMatch(/fetchPriority/i);
  });

  it('Hero dengan data preload: slide pertama dan H1 ada di HTML server', () => {
    primePreload({ path: '/', builtAt: '2026-10-23T03:00:00.000Z', api: { [PRELOAD_URLS.templates]: { success: true, templates: TEMPLATES } } });
    const html = renderToString(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
    );
    expect(html).toMatch(/<h1 [^>]*class="split [^"]*"/);
    expect(html).not.toMatch(/<h1 [^>]*is-hidden/);
    // Data dari API/preload → pratinjau berversi (?v=<hash isi>), supaya gambar yang diganti tidak tertahan cache
    const src = versionedAsset('/assets/templates/corporate-nexa-preview.webp');
    expect(src).toMatch(/\?v=[0-9a-f]{8}$/);
    expect(html).toContain(`src="${src}"`);
    expect(html).not.toContain('Memuat pratinjau template');
  });

  it('jalur prerender: preload head beranda = src <img> slide pertama, keduanya berversi (gambar LCP tidak diunduh dua kali)', () => {
    const api = { [PRELOAD_URLS.templates]: { success: true, templates: TEMPLATES } };
    primePreload({ path: '/', builtAt: '2026-10-23T03:00:00.000Z', api });
    const html = renderToString(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
    );
    const preload = getHead('/', seoDataFromApi(api, '2026-10-23T03:00:00.000Z')).preloadImage;
    expect(preload).toBe(versionedAsset('/assets/templates/corporate-nexa-preview.webp'));
    expect(preload).toMatch(/\?v=[0-9a-f]{8}$/);
    expect(html).toContain(`src="${preload}"`);
  });
});
