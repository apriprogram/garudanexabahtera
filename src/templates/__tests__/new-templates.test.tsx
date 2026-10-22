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
import { ARENA_PHOTOS } from '../arena-club/photos';
import { AURA_PHOTOS } from '../aura-studio/photos';
import { FINOVA_PHOTOS } from '../finova/photos';
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
  heroLayout: 'banner' | 'split' | 'panel';
  photos: PhotoSet;
}

const NEW_TEMPLATES: NewTemplate[] = [
  { code: 'arena-club', component: 'ArenaClub.tsx', heroLayout: 'banner', photos: ARENA_PHOTOS },
  { code: 'aura-studio', component: 'AuraStudio.tsx', heroLayout: 'split', photos: AURA_PHOTOS },
  { code: 'finova', component: 'Finova.tsx', heroLayout: 'panel', photos: FINOVA_PHOTOS },
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

describe('tiga template baru terdaftar', () => {
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

describe('hero tiga template baru saling berbeda', () => {
  it('nilai data-hero-layout unik per template', () => {
    const layouts = NEW_TEMPLATES.map((tpl) => tpl.heroLayout);
    expect(new Set(layouts).size).toBe(layouts.length);
  });
});
