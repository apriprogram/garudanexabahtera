// @vitest-environment node
// Kunci suka/dilihat kartu proyek portofolio cadangan = "f-" + slug judul. Slug itu dibuat di tiga tempat dan harus sama
// persis, kalau tidak suka/dilihat kartu itu ditolak (PROJECT_NOT_FOUND) di satu backend saja:
//   src/components/sections/projects/projectItems.ts  showcaseSlug (kunci yang dikirim browser)
//   backend/modules/templates.js           showcaseSlug (Node)
//   backend/modules/templates.php          pf_showcase_slug (PHP, produksi)
// strtolower PHP hanya mengubah ASCII, sedangkan toLowerCase JS juga mengubah "İ" (U+0130) dan tanda Kelvin (U+212A)
// menjadi huruf ASCII; karena itu non-ASCII dibuang sebelum huruf kecil. Fungsi diambil dari sumbernya (tanpa impor
// modul backend); bagian PHP dilewati bila `php` tidak ada.
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8');

function jsSlug(source: string, pattern: RegExp): (title: string) => string {
  const match = source.match(pattern);
  if (!match) throw new Error(`showcaseSlug tidak ditemukan: ${pattern}`);
  return new Function('title', `return ${match[1]};`) as (title: string) => string;
}

const frontendSlug = jsSlug(read('src', 'components', 'sections', 'projects', 'projectItems.ts'), /const showcaseSlug = \(title: string\) =>\s*([^;]+);/);
const nodeSlug = jsSlug(read('backend', 'modules', 'templates.js'), /const showcaseSlug = \(title\) => ([^;]+);/);

const CASES: [string, string][] = [
  ['Sistem Informasi Desa', 'sistem-informasi-desa'],
  ['Web App Dashboard', 'web-app-dashboard'],
  ['E-Commerce System', 'e-commerce-system'],
  ['  --Corporate   Website--  ', 'corporate-website'],
  ['İnovasi Digital', 'novasi-digital'],
  ['KASIR Toko', 'asir-toko'],
  ['Café & Résto 2026', 'caf-r-sto-2026'],
  ['🚀 Launch Page', 'launch-page'],
  ['日本語', ''],
  [`${'a'.repeat(98)} bc`, `${'a'.repeat(98)}-b`],
];

describe('slug judul portofolio (kunci f-…) sama di frontend, Node & PHP', () => {
  it('frontend = Node = nilai yang diharapkan', () => {
    for (const [title, slug] of CASES) {
      expect(frontendSlug(title), title).toBe(slug);
      expect(nodeSlug(title), title).toBe(slug);
    }
  });

  const php = spawnSync('php', ['-r', 'echo "ok";'], { encoding: 'utf8' });
  it.skipIf(php.stdout !== 'ok')('PHP pf_showcase_slug = nilai yang diharapkan', () => {
    const fn = read('backend', 'modules', 'templates.php').match(/function pf_showcase_slug\(string \$title\): string \{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    const script = `${fn![0]}\n$titles = json_decode(stream_get_contents(STDIN), true);\necho json_encode(array_map('pf_showcase_slug', $titles));`;
    const result = spawnSync('php', ['-r', script], { input: JSON.stringify(CASES.map(([title]) => title)), encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual(CASES.map(([, slug]) => slug));
  });
});
