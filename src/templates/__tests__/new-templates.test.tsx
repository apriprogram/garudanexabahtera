// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/new-templates.test.tsx
// Kontrak MENGIKAT dari pemilik untuk tiga template 2026-10 (docs/platform/TEMPLATE-BRIEFS-2026-10.md §4): tiap
// template punya tata letak, gaya, dan HERO sendiri, dan hero WAJIB berisi foto asli. Uji per template AKTIF otomatis
// begitu stub komponennya diganti (file komponen tidak lagi memuat penanda "STUB fondasi"); selama masih stub, uji
// template itu dilewati (skip) agar fondasi tetap hijau.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ALTURA_PHOTOS } from '../altura/photos';
import { ARENA_PHOTOS } from '../arena-club/photos';
import { AURA_PHOTOS } from '../aura-studio/photos';
import { BESTARI_PHOTOS } from '../bestari/photos';
import { CAKRAWALA_PHOTOS } from '../cakrawala/photos';
import { DERMAGA_PHOTOS } from '../dermaga/photos';
import { FINOVA_PHOTOS } from '../finova/photos';
import { GADGETKU_PHOTOS } from '../gadgetku/photos';
import { GLOWSTORY_PHOTOS } from '../glowstory/photos';
import { JUMANTARA_PHOTOS } from '../jumantara/photos';
import { MADANI_PHOTOS } from '../madani/photos';
import { NAWASENA_PHOTOS } from '../nawasena/photos';
import { NUSANIAGA_PHOTOS } from '../nusaniaga/photos';
import { PORTLINE_PHOTOS } from '../portline/photos';
import { PRADIPTA_PHOTOS } from '../pradipta/photos';
import { SAUDAGAR_PHOTOS } from '../saudagar/photos';
import { SERENITY_PHOTOS } from '../serenity/photos';
import { TANI_PHOTOS } from '../tanimakmur/photos';
import { PUNCAK_PHOTOS } from '../puncakgear/photos';
import { SKYNUSA_PHOTOS } from '../skynusa/photos';
import { VELORA_PHOTOS } from '../velora/photos';
import { TEMPLATES, resolveContent } from '../index';
import type { PhotoSet } from '../kit/photos';

afterEach(cleanup);

// Vitest berjalan dari akar proyek
const ROOT = process.cwd();
const TEMPLATE_DIR = resolve(ROOT, 'src/templates');
const PUBLIC_DIR = resolve(ROOT, 'public');
const STUB_MARK = 'STUB fondasi';

interface NewTemplate {
  code: string;
  /** File komponen yang diekspor `index.ts` (stub fondasi; boleh diganti/dipecah engineer) */
  component: string;
  /** Nilai `data-hero-layout` pada `<TemplateSection sectionKey="hero">` (brief §4) */
  heroLayout: 'banner' | 'split' | 'panel' | 'fullbleed' | 'field' | 'summit' | 'inset-card' | 'collage' | 'specsheet' | 'framed-slider' | 'horizon' | 'canvas' | 'diptych' | 'harbor' | 'showroom' | 'triptych' | 'route' | 'slatted' | 'stories' | 'kenburns' | 'thumbs';
  photos: PhotoSet;
}

const NEW_TEMPLATES: NewTemplate[] = [
  { code: 'arena-club', component: 'ArenaClub.tsx', heroLayout: 'banner', photos: ARENA_PHOTOS },
  { code: 'aura-studio', component: 'AuraStudio.tsx', heroLayout: 'split', photos: AURA_PHOTOS },
  { code: 'finova', component: 'Finova.tsx', heroLayout: 'panel', photos: FINOVA_PHOTOS },
  // Template 2026-10-25 (bukan bagian brief tiga template, tetapi memenuhi kontrak yang sama)
  { code: 'serenity', component: 'Serenity.tsx', heroLayout: 'fullbleed', photos: SERENITY_PHOTOS },
  { code: 'tanimakmur', component: 'TaniMakmur.tsx', heroLayout: 'field', photos: TANI_PHOTOS },
  { code: 'puncakgear', component: 'PuncakGear.tsx', heroLayout: 'summit', photos: PUNCAK_PHOTOS },
  { code: 'gadgetku', component: 'GadgetKu.tsx', heroLayout: 'inset-card', photos: GADGETKU_PHOTOS },
  { code: 'glowstory', component: 'GlowStory.tsx', heroLayout: 'collage', photos: GLOWSTORY_PHOTOS },
  { code: 'skynusa', component: 'SkyNusa.tsx', heroLayout: 'specsheet', photos: SKYNUSA_PHOTOS },
  { code: 'madani', component: 'Madani.tsx', heroLayout: 'framed-slider', photos: MADANI_PHOTOS },
  { code: 'cakrawala', component: 'Cakrawala.tsx', heroLayout: 'horizon', photos: CAKRAWALA_PHOTOS },
  { code: 'bestari', component: 'Bestari.tsx', heroLayout: 'canvas', photos: BESTARI_PHOTOS },
  { code: 'altura', component: 'Altura.tsx', heroLayout: 'diptych', photos: ALTURA_PHOTOS },
  { code: 'portline', component: 'Portline.tsx', heroLayout: 'harbor', photos: PORTLINE_PHOTOS },
  // Velora (2026-10-27): company profile Inggris grup otomotif, kartu foto hero "showroom"
  { code: 'velora', component: 'Velora.tsx', heroLayout: 'showroom', photos: VELORA_PHOTOS },
  { code: 'dermaga', component: 'Dermaga.tsx', heroLayout: 'route', photos: DERMAGA_PHOTOS },
  { code: 'saudagar', component: 'Saudagar.tsx', heroLayout: 'triptych', photos: SAUDAGAR_PHOTOS },
  { code: 'nusaniaga', component: 'NusaNiaga.tsx', heroLayout: 'slatted', photos: NUSANIAGA_PHOTOS },
  // Jumantara (2026-10-27): landing page SMA negeri "Clean institutional", slider foto latar + bilah progres bersegmen "stories"
  { code: 'jumantara', component: 'Jumantara.tsx', heroLayout: 'stories', photos: JUMANTARA_PHOTOS },
  // Nawasena (2026-10-27): landing page SMA negeri "Elegant navy", slider foto latar Ken Burns + rel nomor slide "kenburns"
  { code: 'nawasena', component: 'Nawasena.tsx', heroLayout: 'kenburns', photos: NAWASENA_PHOTOS },
  // Pradipta (2026-10-27): landing page SMA negeri, slider foto latar dengan kartu judul putih + thumbnail "thumbs"
  { code: 'pradipta', component: 'Pradipta.tsx', heroLayout: 'thumbs', photos: PRADIPTA_PHOTOS },
];

/** Template lain yang TIDAK boleh diimpor (komponen, kartu, nav tidak dibagi). shared/** dan kit/** boleh. */
const OTHER_TEMPLATES = ['corporate-nexa', 'startup-clean', ...NEW_TEMPLATES.map((tpl) => tpl.code)];

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(name) ? [path] : [];
  });

const isStub = (tpl: NewTemplate) => {
  const path = join(TEMPLATE_DIR, tpl.code, tpl.component);
  return existsSync(path) && readFileSync(path, 'utf8').includes(STUB_MARK);
};

const publicFile = (url: string) => resolve(PUBLIC_DIR, url.replace(/^\//, ''));

describe('template baru terdaftar', () => {
  it.each(NEW_TEMPLATES)('$code ada di registry dengan komponen sendiri', ({ code }) => {
    const def = TEMPLATES[code];
    expect(def?.code).toBe(code);
    const others = Object.values(TEMPLATES).filter((other) => other.code !== code);
    for (const other of others) expect(def.Component).not.toBe(other.Component);
  });
});

for (const tpl of NEW_TEMPLATES) {
  const stub = isStub(tpl);
  describe.skipIf(stub)(`${tpl.code}: kontrak tata letak berbeda & hero berfoto (brief §4)`, () => {
    it('tidak mengimpor komponen dari template lain (hanya shared/**, kit/**, types)', () => {
      const forbidden = OTHER_TEMPLATES.filter((code) => code !== tpl.code);
      const pattern = new RegExp(`['"](?:\\.\\./)+(?:${forbidden.join('|')})(?:/|['"])`);
      for (const file of sourceFiles(join(TEMPLATE_DIR, tpl.code))) {
        expect(readFileSync(file, 'utf8'), file).not.toMatch(pattern);
      }
    });

    it('hero = foto demo asli (eager, srcset, width/height, alt) dengan data-hero-layout milik template ini', () => {
      const def = TEMPLATES[tpl.code];
      const heroImage = String(def.defaultContent.hero?.image ?? '');
      expect(heroImage).toMatch(new RegExp(`^/assets/templates/photos/${tpl.code}-[a-z0-9-]+\\.webp$`));
      expect(existsSync(publicFile(heroImage)), heroImage).toBe(true);

      const { container } = render(<def.Component content={resolveContent(def, null)} />);
      const hero = container.querySelector('[data-tpl-section="hero"]');
      expect(hero).not.toBeNull();
      expect(hero!.getAttribute('data-hero-layout')).toBe(tpl.heroLayout);
      const img = hero!.querySelector<HTMLImageElement>('img[fetchpriority="high"]');
      expect(img, 'foto hero memakai priority (eager + fetchpriority high)').not.toBeNull();
      expect(img!.getAttribute('src')).toBe(heroImage);
      expect(img!.getAttribute('loading')).toBe('eager');
      expect(img!.getAttribute('srcset')).toContain(' 800w');
      expect(Number(img!.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(img!.getAttribute('height'))).toBeGreaterThan(0);
      expect(img!.getAttribute('alt')?.trim()).toBeTruthy();
    });

    it('registry foto: ≥ 6 foto berawalan kode template, semua varian ada di public/ dan tercatat di CREDITS.md', () => {
      const credits = readFileSync(resolve(PUBLIC_DIR, 'assets/templates/photos/CREDITS.md'), 'utf8');
      expect(tpl.photos.keys.length).toBeGreaterThanOrEqual(6);
      for (const key of tpl.photos.keys) {
        expect(key.startsWith(`${tpl.code}-`), key).toBe(true);
        const asset = tpl.photos.asset(tpl.photos.src(key));
        expect(asset, key).not.toBeNull();
        const urls = asset!.srcSet!.split(',').map((part) => part.trim().split(' ')[0]);
        for (const url of [asset!.src, ...urls]) expect(existsSync(publicFile(url)), url).toBe(true);
        expect(credits, `kredit untuk ${key}`).toContain(`\`${key}-*\``);
      }
    });
  });
}

describe('hero template baru saling berbeda', () => {
  it('nilai data-hero-layout unik per template', () => {
    const layouts = NEW_TEMPLATES.map((tpl) => tpl.heroLayout);
    expect(new Set(layouts).size).toBe(layouts.length);
  });
});
