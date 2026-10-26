// backend/modules/site_defaults.json (docs/platform/SITE-POSTS-SEO-SPEC.md §6): bawaan per template untuk kepala halaman
// situs pembeli, dibaca backend/site.php, site_posts.php dan site_posts.js (PHP tidak bisa menjalankan resolveContent).
// Isinya harus sama dengan registri TEMPLATES: nama, tagline, deskripsi (hero.subtitle → footer.description →
// brand.tagline), logo, dan fitur tulisan. Template baru / konten bawaan berubah → perbarui berkasnya dengan
//   UPDATE_SITE_DEFAULTS=1 npx vitest run __tests__/backend/site-defaults.test.ts
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { copySiteDefaults } from '../../scripts/prerender.mjs';
import { TEMPLATES, resolveContent } from '../../src/templates';
import { getSection, text } from '../../src/templates/shared/utils';
import { siteDefaultsOf } from '../../src/templates/siteSeo';

const ROOT = resolve(__dirname, '..', '..');
const FILE = join(ROOT, 'backend', 'modules', 'site_defaults.json');

/** Satu entri per template, urut kode (stabil walau urutan registri berubah). */
function expectedDefaults() {
  const entries = Object.keys(TEMPLATES)
    .sort()
    .map((code) => {
      const def = TEMPLATES[code];
      const content = resolveContent(def, null);
      const brand = getSection(content, 'brand');
      return [
        code,
        {
          company_name: text(brand, 'company_name'),
          tagline: text(brand, 'tagline'),
          description:
            text(getSection(content, 'hero'), 'subtitle') || text(getSection(content, 'footer'), 'description') || text(brand, 'tagline'),
          logo: text(brand, 'logo'),
          posts: def.features?.posts === true,
        },
      ] as const;
    });
  return Object.fromEntries(entries);
}

const expectedText = () => `${JSON.stringify(expectedDefaults(), null, 2)}\n`;

describe('backend/modules/site_defaults.json', () => {
  if (process.env.UPDATE_SITE_DEFAULTS === '1') {
    it('ditulis ulang dari registri TEMPLATES (UPDATE_SITE_DEFAULTS=1)', () => {
      writeFileSync(FILE, expectedText());
      expect(readFileSync(FILE, 'utf8')).toBe(expectedText());
    });
  }

  it('sama persis dengan registri TEMPLATES (jalankan ulang dengan UPDATE_SITE_DEFAULTS=1 bila berubah)', () => {
    const current = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
    expect(current).toBe(expectedText());
  });

  it('memuat setiap template dengan nama situs, dan fitur tulisan hanya untuk template sekolah', () => {
    const defaults = expectedDefaults();
    expect(Object.keys(defaults).sort()).toEqual(Object.keys(TEMPLATES).sort());
    for (const [code, entry] of Object.entries(defaults)) {
      expect(entry.company_name, code).not.toBe('');
      expect(Object.keys(entry)).toEqual(['company_name', 'tagline', 'description', 'logo', 'posts']);
    }
    expect(Object.entries(defaults).filter(([, entry]) => entry.posts).map(([code]) => code).sort()).toEqual(['cakrawala', 'madani']);
  });

  it('nilai yang dipakai head klien (siteDefaultsOf di siteSeo.ts) = isi berkas yang dibaca site.php', () => {
    const file = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, unknown>;
    for (const [code, def] of Object.entries(TEMPLATES)) expect(siteDefaultsOf(def), code).toEqual(file[code]);
  });

  it('ikut ke build: prerender menyalinnya ke modules/ (salinan modules di deploy-cpanel.mjs hanya *.php)', () => {
    const codes = Object.keys(TEMPLATES);
    const out = mkdtempSync(join(tmpdir(), 'gn-site-defaults-'));
    try {
      copySiteDefaults(ROOT, out, codes);
      expect(readFileSync(join(out, 'modules', 'site_defaults.json'), 'utf8')).toBe(readFileSync(FILE, 'utf8'));
      // Berkas kosong / rusak menggagalkan build, bukan head situs pembeli
      const broken = mkdtempSync(join(tmpdir(), 'gn-site-defaults-src-'));
      try {
        mkdirSync(join(broken, 'backend', 'modules'), { recursive: true });
        writeFileSync(join(broken, 'backend', 'modules', 'site_defaults.json'), '{}\n');
        expect(() => copySiteDefaults(broken, out, codes)).toThrow(/UPDATE_SITE_DEFAULTS=1/);
        writeFileSync(join(broken, 'backend', 'modules', 'site_defaults.json'), '{');
        expect(() => copySiteDefaults(broken, out, codes)).toThrow();
      } finally {
        rmSync(broken, { recursive: true, force: true });
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('berkas basi menggagalkan build: kuncinya harus sama dengan kode template di registri bundel SSR', () => {
    const codes = Object.keys(TEMPLATES);
    const out = mkdtempSync(join(tmpdir(), 'gn-site-defaults-'));
    try {
      // Template baru di registri yang belum masuk berkas
      expect(() => copySiteDefaults(ROOT, out, [...codes, 'template-baru'])).toThrow(
        /tidak sama dengan registri template \(belum ada: template-baru\).*UPDATE_SITE_DEFAULTS=1 npx vitest run __tests__\/backend\/site-defaults\.test\.ts/,
      );
      // Template yang sudah dihapus dari registri masih ada di berkas
      expect(() => copySiteDefaults(ROOT, out, codes.slice(1))).toThrow(new RegExp(`\\(tidak ada di registri: ${codes[0]}\\)`));
      expect(() => copySiteDefaults(ROOT, out, [...codes.slice(1), 'template-baru'])).toThrow(
        new RegExp(`belum ada: template-baru; tidak ada di registri: ${codes[0]}`),
      );
      // Bundel SSR tanpa templateCodes(): tidak bisa dicek, jadi tidak disalin diam-diam
      expect(() => copySiteDefaults(ROOT, out, undefined)).toThrow(/templateCodes/);
      expect(() => copySiteDefaults(ROOT, out, [])).toThrow(/templateCodes/);
      // Urutan kode tidak penting
      copySiteDefaults(ROOT, out, [...codes].reverse());
      expect(existsSync(join(out, 'modules', 'site_defaults.json'))).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
