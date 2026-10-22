// @vitest-environment node
// Jalankan: npx vitest run src/templates/__tests__/new-template-previews.test.ts
// Pratinjau katalog 3 template 2026-10-22 (Arena Club, Aura Studio, Finova): seed & migrasi 008 merujuk tangkapan
// layar asli demo (.webp: <code>-preview + galeri <code>-1/-2) yang ada di public/, bukan placeholder SVG.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const CODES = ['arena-club', 'aura-studio', 'finova'];
const SQL_FILES = ['database/seed.templates.sql', 'database/migrations/2026-10-22_008_new_templates.sql'];
const read = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

describe('pratinjau template baru (2026-10-22)', () => {
  it.each(SQL_FILES)('%s: preview_image & galeri = tangkapan layar .webp', (file) => {
    const sql = read(file);
    for (const code of CODES) {
      expect(sql).toContain(`'/assets/templates/${code}-preview.webp'`);
      expect(sql).toContain(`'["/assets/templates/${code}-1.webp","/assets/templates/${code}-2.webp"]'`);
      expect(sql).not.toContain(`/assets/templates/${code}-preview.svg`);
    }
  });

  it.each(CODES)('%s: file pratinjau ada di public/ dan ringan', (code) => {
    for (const name of [`${code}-preview`, `${code}-1`, `${code}-2`]) {
      const path = resolve(ROOT, `public/assets/templates/${name}.webp`);
      expect(existsSync(path), name).toBe(true);
      const kb = statSync(path).size / 1024;
      expect(kb, name).toBeGreaterThan(10);
      expect(kb, name).toBeLessThan(220);
    }
  });
});
