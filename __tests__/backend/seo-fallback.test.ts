// @vitest-environment node
// backend/seo.php (docs/platform/SEO-PLAN.md §5.2 langkah 8) melayani template yang terbit setelah deploy terakhir.
// Head-nya harus sama dengan halaman template yang diprerender oleh kode TypeScript (src/seo: getHead +
// renderHeadTags), untuk template tanpa salinan WP5. Tes ini menjalankan fungsi seo.php di PHP CLI dengan template uji
// yang sama dan membandingkan hasilnya: title, description, canonical, OG, preload, setiap tag head, dan JSON-LD.
// Dilewati bila `php` tidak ada.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seoFallbackContext } from '../../scripts/prerender.mjs';
import * as ssr from '../../src/entry-server';
import { FIXTURE_API, FIXTURE_BUILT_AT, FIXTURE_TEMPLATES } from '../../src/lib/__tests__/preloadFixture';
import type { Template } from '../../src/types/platform';

const ROOT = resolve(__dirname, '..', '..');
const SEO_PHP = join(ROOT, 'backend', 'seo.php');
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo "ok";'], { encoding: 'utf8' }).stdout === 'ok';

const base = FIXTURE_TEMPLATES[3];
/** Template "baru" (tanpa src/content/templates/{slug}.ts) dengan variasi yang memengaruhi pilihan teks head. */
const NEW_TEMPLATES: Template[] = [
  {
    ...base,
    id: 101,
    slug: 'uji-klinik-baru',
    name: 'Uji Klinik',
    short_description:
      'Website elegan untuk klinik kecantikan, salon, nail art, spa, dan barbershop yang ingin tampil premium, tepercaya, dan mudah dihubungi',
    gallery: ['/assets/templates/uji-1.webp', '/assets/templates/uji-1.webp', '/assets/templates/uji-ikon.svg'],
  },
  {
    ...base,
    id: 102,
    slug: 'uji-tanpa-kategori',
    name: 'Polos',
    category: '',
    price: 990000,
    short_description: null,
    description: null,
    template_code: '',
    demo_url: 'https://demo.contoh.test/polos',
  },
  {
    ...base,
    id: 103,
    slug: 'uji-nama-panjang',
    name: 'Template Dengan Nama Yang Sangat Panjang Sekali Untuk Menguji Judul Halaman',
    category: 'Fintech & Startup',
    price: 1395000,
    preview_image: null,
    gallery: [],
    short_description: 'Landing page fintech. Dengan tanda "kutip" & <tag>!',
  },
  { ...base, id: 104, slug: 'uji-dua-juta', name: 'Dua Juta', category: 'Company Profile', price: 2000000, template_code: '', demo_url: null },
  { ...base, id: 105, slug: 'uji-kafe', name: 'Kafé Ünik', category: 'Kafé & Resto', price: 1250000 },
];

const api = {
  ...FIXTURE_API,
  '/api.php?action=get_templates': { success: true, templates: [...FIXTURE_TEMPLATES, ...NEW_TEMPLATES] },
};
const data = ssr.seoDataFromApi(api, FIXTURE_BUILT_AT);
const ctx = seoFallbackContext(ssr, data, FIXTURE_TEMPLATES[0].slug, FIXTURE_BUILT_AT);

const HARNESS = String.raw`<?php
define('GN_SEO_LIBRARY', true);
require getenv('SEO_PHP');
$in = json_decode(stream_get_contents(STDIN), true);
$out = [];
foreach ($in['templates'] as $t) {
    $head = seo_template_head($t, $in['ctx']);
    $out[] = ['head' => $head, 'tags' => seo_render_head_tags($head, $in['ctx']), 'page' => seo_render_page($t, $in['ctx'], $in['shell'])];
}
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

const SHELL = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Memuat situs…</title>
    <script type="module" crossorigin src="/assets/index-AbCdEf12.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

interface PhpResult {
  head: Record<string, unknown> & { jsonLd: unknown[] };
  tags: string;
  page: string;
}

let dir = '';
let results: PhpResult[] = [];

const runPhp = (code: string, input = '') =>
  spawnSync('php', ['-d', 'display_errors=stderr', join(dir, code)], {
    encoding: 'utf8',
    input,
    env: { ...process.env, SEO_PHP },
  });

describe.skipIf(!PHP_AVAILABLE)('backend/seo.php matches the prerendered template head', () => {
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'gn-seo-php-'));
    writeFileSync(join(dir, 'harness.php'), HARNESS);
    const result = runPhp('harness.php', JSON.stringify({ templates: NEW_TEMPLATES, ctx, shell: SHELL }));
    if (result.status !== 0) throw new Error(`php: ${result.stderr}`);
    results = JSON.parse(result.stdout);
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  NEW_TEMPLATES.forEach((template, index) => {
    it(`${template.slug}: same head fields, tags and JSON-LD as getHead/renderHeadTags`, () => {
      const head = ssr.getHead(`/template/${template.slug}`, data);
      expect(head.robots).toBe('index,follow');
      const php = results[index];
      const { jsonLd, ...fields } = head;
      const { jsonLd: phpJsonLd, ...phpFields } = php.head;
      expect(phpFields).toEqual(JSON.parse(JSON.stringify(fields)));
      expect(phpJsonLd).toEqual(JSON.parse(JSON.stringify(jsonLd)));

      const tsTags = ssr.renderHeadTags(head).split('\n');
      const phpTags = php.tags.split('\n');
      const ld = (tags: string[]) => tags.find((tag) => tag.startsWith('<script type="application/ld+json"')) ?? '';
      const ldJson = (tag: string) => JSON.parse(tag.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
      expect(phpTags.filter((tag) => tag !== ld(phpTags))).toEqual(tsTags.filter((tag) => tag !== ld(tsTags)));
      expect(ldJson(ld(phpTags))).toEqual(ldJson(ld(tsTags)));
      // JSON-LD di dalam <script> tidak boleh berisi "<" mentah
      expect(ld(phpTags).replace(/<\/?script[^>]*>/g, '')).not.toContain('<');
    });
  });

  it('renders the page: one head, readable <main> in #root with H1, price, features and order/demo links', () => {
    const page = results[0].page;
    expect(page.match(/<title>/g)).toHaveLength(1);
    expect(page).not.toContain('Memuat situs');
    expect(page.indexOf('<title>')).toBeGreaterThan(page.indexOf('name="viewport"'));
    expect(page).toContain('<div id="root"><main');
    expect(page.match(/<h1>/g)).toHaveLength(1);
    expect(page).toContain('<h1>Uji Klinik: Template Website Kecantikan &amp; Klinik</h1>');
    expect(page).toContain('Rp1.390.000');
    expect(page).toContain('href="/pesan/uji-klinik-baru"');
    expect(page).toContain('href="/demo/uji-klinik-baru"');
    expect(results[1].page).toContain('href="https://demo.contoh.test/polos"');
    expect(results[2].page).toContain('Dengan tanda &quot;kutip&quot; &amp; &lt;tag&gt;!');
  });

  it('answers 404 with the 404 page for invalid or reserved slugs, without touching the database', () => {
    for (const slug of ['Bukan Slug!', 'kategori', '', 'a'.repeat(121)]) {
      writeFileSync(join(dir, 'notfound.php'), `<?php $_GET['slug'] = ${JSON.stringify(slug)}; require getenv('SEO_PHP');`);
      const result = runPhp('notfound.php');
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout, slug).toContain('Halaman tidak ditemukan');
    }
  });
});
