// @vitest-environment node
// Jalankan: npx vitest run src/templates/__tests__/previews.test.ts
// Gambar pratinjau katalog (templates.preview_image / gallery) yang dirujuk seed & migrasi harus ada di public/, dan
// template yang sudah didesain ulang memakai tangkapan layar asli (.webp), bukan mockup SVG.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Vitest berjalan dari akar proyek
const ROOT = process.cwd();
const SQL_FILES = ['database/seed.templates.sql', 'database/migrations/2026-10-22_007_template_previews.sql'];
// Path file nyata saja (komentar seperti "<code>-preview.webp" tidak ikut)
const paths = (sql: string) => [...new Set(sql.match(/\/assets\/templates\/[a-z0-9][a-z0-9/_.-]*\.(?:webp|svg|png|jpe?g)/g) ?? [])];

describe('pratinjau template di seed & migrasi', () => {
  it.each(SQL_FILES)('%s: setiap gambar ada di public/', (file) => {
    const found = paths(readFileSync(resolve(ROOT, file), 'utf8'));
    expect(found.length).toBeGreaterThan(0);
    for (const path of found) expect(existsSync(resolve(ROOT, 'public' + path)), path).toBe(true);
  });

  it('Corporate Nexa & Startup Clean memakai tangkapan layar .webp', () => {
    const seed = readFileSync(resolve(ROOT, 'database/seed.templates.sql'), 'utf8');
    for (const code of ['corporate-nexa', 'startup-clean']) {
      for (const name of [`${code}-preview`, `${code}-1`, `${code}-2`]) {
        expect(seed).toContain(`/assets/templates/${name}.webp`);
        expect(seed).not.toContain(`/assets/templates/${name}.svg`);
      }
    }
  });
});
