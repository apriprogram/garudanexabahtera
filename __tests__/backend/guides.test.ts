// @vitest-environment node
// Artikel panduan di kedua backend (backend/modules/guides.php = guides.js): validasi GuideInput (pesan per kolom,
// normalisasi sumber/terkait/isi), aturan tanggal (dateModified, reviewed), urutan terbaru dulu, dan halaman yang boleh
// dihitung dilihat. Fungsi murninya dijalankan di PHP CLI dan Node dengan masukan yang sama; hasilnya harus identik.
// Bagian PHP dilewati bila `php` tidak ada.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GUIDE_LIMITS as API_LIMITS } from '../../src/content/panduan';
import {
  deriveGuideDates,
  filterSlugs,
  GUIDE_LIMITS,
  pageSlug,
  renameRelated,
  sortGuides,
  titleKey,
  validateGuideInput,
} from '../../backend/modules/guides.js';

const GUIDES_PHP = resolve(__dirname, '..', '..', 'backend', 'modules', 'guides.php');
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo "ok";'], { encoding: 'utf8' }).stdout === 'ok';
const TODAY = '2026-10-24';

const valid = {
  slug: 'cara-memilih-hosting',
  title: 'Cara Memilih Hosting untuk Bisnis',
  description: 'Hal yang perlu dicek sebelum membeli hosting: kecepatan, lokasi server, dan biaya perpanjangan.',
  body: `## Ringkasan\r\n\r\n${'Isi panduan yang cukup panjang. '.repeat(10)}\rBaris terakhir.`,
  author: 'Tim Garuda Nexa',
  cta: 'website',
  sources: [' https://contoh.test/a ', '', 'https://contoh.test/a', 'https://contoh.test/b?x=1'],
  related: ['biaya-website-company-profile', ' biaya-website-company-profile ', ''],
  datePublished: '2026-10-23',
  published: true,
};

const VALIDATE_CASES: { name: string; input: Record<string, unknown> }[] = [
  { name: 'lengkap & dirapikan', input: valid },
  { name: 'kosong', input: {} },
  { name: 'tipe salah', input: { ...valid, slug: 12, title: ['x'], body: { a: 1 }, sources: 'https://contoh.test', related: { a: 'b' }, datePublished: 20261023 } },
  { name: 'slug tidak sah', input: { ...valid, slug: 'Biaya Website' } },
  { name: 'slug terlalu panjang', input: { ...valid, slug: 'a'.repeat(121) } },
  { name: 'judul tepat 60 karakter dengan emoji', input: { ...valid, title: `${'é'.repeat(58)}😀😀` } },
  { name: 'judul 61 karakter', input: { ...valid, title: 'a'.repeat(61) } },
  { name: 'judul & deskripsi terlalu pendek', input: { ...valid, title: 'Pendek', description: 'Terlalu pendek.' } },
  { name: 'isi terlalu pendek', input: { ...valid, body: '   ## Judul\n\nIsi.   ' } },
  { name: 'isi dengan spasi & baris baru di tepi', input: { ...valid, body: `\r\n \t${valid.body}\n\n\r\n  ` } },
  { name: 'ajakan tidak dikenal', input: { ...valid, cta: 'Template' } },
  { name: 'sumber bukan URL', input: { ...valid, sources: ['https://contoh.test/a', 'contoh.test/b'] } },
  { name: 'sumber dengan spasi lebar nol', input: { ...valid, sources: ['https://contoh.test/﻿a'] } },
  { name: 'sumber terlalu banyak', input: { ...valid, sources: Array.from({ length: 31 }, (_, i) => `https://contoh.test/${i}`) } },
  { name: 'terkait diri sendiri', input: { ...valid, related: ['cara-memilih-hosting'] } },
  { name: 'terkait terlalu banyak', input: { ...valid, related: Array.from({ length: 11 }, (_, i) => `artikel-${i}`) } },
  { name: 'tanggal tidak ada di kalender', input: { ...valid, datePublished: '2026-02-30' } },
  { name: 'tanggal setelah hari ini', input: { ...valid, datePublished: '2026-10-25' } },
  ...['true', '1', 1, false, 'yes', null].map((published) => ({ name: `published ${JSON.stringify(published)}`, input: { ...valid, published } })),
];

const guide = (extra: Record<string, unknown> = {}) => ({
  title: 'Judul',
  description: 'Deskripsi',
  body: 'Isi',
  sources: ['https://contoh.test/a'],
  datePublished: '2026-10-20',
  published: true,
  ...extra,
});
const existing = (extra: Record<string, unknown> = {}) => ({ ...guide(), dateModified: '2026-10-21', reviewed: '2026-10-22', ...extra });

const DATE_CASES: { name: string; existing: Record<string, unknown> | null; guide: Record<string, unknown> }[] = [
  { name: 'baru, terbit', existing: null, guide: guide() },
  { name: 'baru, draf', existing: null, guide: guide({ published: false }) },
  { name: 'tanpa perubahan isi: tanggal tetap', existing: existing(), guide: guide() },
  { name: 'isi berubah: hari ini', existing: existing(), guide: guide({ body: 'Isi baru' }) },
  { name: 'isi lama berakhir baris baru (seed migrasi): tanggal tetap', existing: existing({ body: 'Isi\n' }), guide: guide() },
  { name: 'sumber berubah: hari ini', existing: existing(), guide: guide({ sources: ['https://contoh.test/b'] }) },
  { name: 'diturunkan jadi draf', existing: existing(), guide: guide({ published: false }) },
  { name: 'draf diterbitkan', existing: existing({ reviewed: null }), guide: guide() },
  { name: 'tanggal terbit dimajukan melewati dateModified', existing: existing(), guide: guide({ datePublished: '2026-10-23' }) },
];

const row = (slug: string, datePublished: string, dateModified: string) => ({ slug, datePublished, dateModified });
const SORT_CASE = [
  row('lama', '2026-01-01', '2026-01-02'),
  row('b-baru', '2026-10-23', '2026-10-23'),
  row('a-baru', '2026-10-23', '2026-10-23'),
  row('baru-diubah', '2026-10-23', '2026-10-24'),
];

const PAGE_CASES = ['/panduan', '/panduan/biaya-website', '/panduan/', '/panduan/Biaya', '/panduan/a/b', ' /panduan', '/panduan-x', '/template/a'];

// Kunci judul ganda: spasi dirapatkan (termasuk NBSP, U+3000, U+FEFF), trim, huruf kecil Unicode
const TITLE_CASES = [
  'Biaya Website Company Profile',
  '  BIAYA   website\tCompany\nPROFILE ',
  'Biaya Website　Company﻿Profile',
  'ÉKSPOR Ärzte İstanbul ẞ',
  'Biaya Website Company Profile 2026',
];

// Slug artikel terkait setelah artikel lain berganti slug (to) atau dihapus (to null)
const RENAME_CASES: { related: string[]; from: string; to: string | null }[] = [
  { related: ['a', 'b', 'c'], from: 'b', to: 'b2' },
  { related: ['a', 'b2', 'b'], from: 'b', to: 'b2' },
  { related: ['a', 'b', 'c'], from: 'b', to: null },
  { related: ['b'], from: 'b', to: null },
  { related: ['a', 'c'], from: 'b', to: 'b2' },
];

// Artikel terkait yang ditampilkan publik: hanya yang terbit, urutan tetap
const FILTER_CASES: { slugs: string[]; allowed: string[] }[] = [
  { slugs: ['c', 'a', 'b'], allowed: ['a', 'c'] },
  { slugs: ['a', 'b'], allowed: [] },
  { slugs: [], allowed: ['a'] },
];

const PHP_HARNESS = String.raw`
class ApiError extends Exception {
    public $status; public $errorCode; public $fieldErrors;
    public function __construct($message, $status = 400, $errorCode = null, $fieldErrors = null) { parent::__construct($message); $this->status = $status; $this->errorCode = $errorCode; $this->fieldErrors = $fieldErrors; }
}
function in_flag(array $input, $key) {
    $v = $input[$key] ?? null;
    return ($v === true || $v === 1 || $v === '1' || $v === 'true') ? 1 : 0;
}
require getenv('GUIDES_PHP');
$in = json_decode(stream_get_contents(STDIN), true);
$out = ['validate' => [], 'dates' => [], 'sort' => gd_sort_guides($in['sort']), 'pages' => [], 'limits' => GD_LIMITS,
        'titles' => array_map('gd_title_key', $in['titles']), 'renames' => [], 'filters' => []];
foreach ($in['validate'] as $c) $out['validate'][] = gd_validate_input($c, $in['today']);
foreach ($in['dates'] as $c) $out['dates'][] = gd_derive_dates($c['existing'], $c['guide'], $in['today']);
foreach ($in['pages'] as $c) $out['pages'][] = gd_page_slug($c);
foreach ($in['renames'] as $c) $out['renames'][] = gd_rename_related($c['related'], $c['from'], $c['to']);
foreach ($in['filters'] as $c) $out['filters'][] = gd_filter_slugs($c['slugs'], $c['allowed']);
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

const node = {
  validate: VALIDATE_CASES.map((c) => validateGuideInput(c.input, TODAY)),
  dates: DATE_CASES.map((c) => deriveGuideDates(c.existing, c.guide, TODAY)),
  sort: sortGuides(SORT_CASE),
  pages: PAGE_CASES.map(pageSlug),
  titles: TITLE_CASES.map(titleKey),
  renames: RENAME_CASES.map((c) => renameRelated(c.related, c.from, c.to)),
  filters: FILTER_CASES.map((c) => filterSlugs(c.slugs, c.allowed)),
};

describe('guides.js', () => {
  it('batas sama dengan GUIDE_LIMITS di src/content/panduan/core.ts', () => {
    expect(GUIDE_LIMITS).toEqual(API_LIMITS);
  });

  it('input lengkap dirapikan: isi LF, sumber & terkait tanpa kosong/ganda, published boolean', () => {
    const [result, errors] = node.validate[0];
    expect(errors).toEqual({});
    expect(result.body).not.toMatch(/\r/);
    expect(result.body).toMatch(/^## Ringkasan\n\n.*Baris terakhir\.$/s);
    expect(result.sources).toEqual(['https://contoh.test/a', 'https://contoh.test/b?x=1']);
    expect(result.related).toEqual(['biaya-website-company-profile']);
    expect(result.published).toBe(true);
  });

  it('pesan per kolom untuk isian kosong, salah tipe dan batas', () => {
    const errorsOf = (name: string) => node.validate[VALIDATE_CASES.findIndex((c) => c.name === name)][1] as Record<string, string>;
    expect(Object.keys(errorsOf('kosong')).sort()).toEqual(['author', 'body', 'cta', 'datePublished', 'description', 'slug', 'title']);
    expect(errorsOf('judul tepat 60 karakter dengan emoji')).toEqual({});
    expect(errorsOf('judul 61 karakter')).toEqual({ title: 'Judul maksimal 60 karakter.' });
    expect(errorsOf('sumber dengan spasi lebar nol').sources).toMatch(/Sumber ke-1/);
    expect(errorsOf('terkait diri sendiri').related).toMatch(/sendiri/);
    expect(errorsOf('tanggal setelah hari ini').datePublished).toMatch(/setelah hari ini/);
  });

  it('isi disimpan sudah di-trim (sama dengan formulir admin)', () => {
    const at = (name: string) => node.validate[VALIDATE_CASES.findIndex((c) => c.name === name)];
    const [padded, errors] = at('isi dengan spasi & baris baru di tepi');
    expect(errors).toEqual({});
    expect(padded.body).toBe(at('lengkap & dirapikan')[0].body);
  });

  it('tanggal: dateModified hanya maju bila isi berubah, reviewed tetap saat disunting ulang', () => {
    expect(node.dates).toEqual([
      { dateModified: TODAY, reviewed: TODAY },
      { dateModified: TODAY, reviewed: null },
      { dateModified: '2026-10-21', reviewed: '2026-10-22' },
      { dateModified: TODAY, reviewed: '2026-10-22' },
      { dateModified: '2026-10-21', reviewed: '2026-10-22' },
      { dateModified: TODAY, reviewed: '2026-10-22' },
      { dateModified: '2026-10-21', reviewed: null },
      { dateModified: '2026-10-21', reviewed: TODAY },
      { dateModified: '2026-10-23', reviewed: '2026-10-22' },
    ]);
  });

  it('urutan terbaru dulu dan halaman yang boleh dihitung', () => {
    expect(node.sort.map((g) => g.slug)).toEqual(['baru-diubah', 'a-baru', 'b-baru', 'lama']);
    expect(node.pages).toEqual(['', 'biaya-website', null, null, null, null, null, null]);
  });

  it('judul ganda: beda spasi atau huruf besar/kecil tetap dianggap sama', () => {
    expect(node.titles).toEqual([
      'biaya website company profile',
      'biaya website company profile',
      'biaya website company profile',
      'ékspor ärzte i̇stanbul ß', // İ → i + titik atas (U+0307) di kedua backend
      'biaya website company profile 2026',
    ]);
  });

  it('artikel terkait: slug diganti/dibuang tanpa ganda, publik hanya slug terbit', () => {
    expect(node.renames).toEqual([['a', 'b2', 'c'], ['a', 'b2'], ['a', 'c'], [], ['a', 'c']]);
    expect(node.filters).toEqual([['c', 'a'], [], []]);
  });
});

describe.skipIf(!PHP_AVAILABLE)('guides.php sama dengan guides.js', () => {
  const result = PHP_AVAILABLE
    ? spawnSync('php', ['-d', 'display_errors=stderr', '-r', PHP_HARNESS], {
        input: JSON.stringify({
          today: TODAY,
          validate: VALIDATE_CASES.map((c) => c.input),
          dates: DATE_CASES,
          sort: SORT_CASE,
          pages: PAGE_CASES,
          titles: TITLE_CASES,
          renames: RENAME_CASES,
          filters: FILTER_CASES,
        }),
        encoding: 'utf8',
        env: { ...process.env, GUIDES_PHP },
      })
    : null;
  const php = result && result.status === 0 ? JSON.parse(result.stdout) : null;

  it('PHP berjalan', () => {
    expect(result?.stderr ?? '').toBe('');
    expect(php).not.toBeNull();
  });

  it('kunci judul ganda, penggantian & penyaringan slug terkait', () => {
    expect(php.titles).toEqual(node.titles);
    expect(php.renames).toEqual(node.renames);
    expect(php.filters).toEqual(node.filters);
  });

  it('batas, validasi (hasil & pesan per kolom), tanggal, urutan, halaman', () => {
    expect(php.limits).toEqual(GUIDE_LIMITS);
    VALIDATE_CASES.forEach((c, i) => {
      const [phpResult, phpErrors] = php.validate[i];
      const [nodeResult, nodeErrors] = node.validate[i];
      expect(phpResult, c.name).toEqual(nodeResult);
      // PHP mengirim objek kosong sebagai [] di JSON
      expect(Array.isArray(phpErrors) ? {} : phpErrors, c.name).toEqual(nodeErrors);
      expect(Object.keys(Array.isArray(phpErrors) ? {} : phpErrors), `${c.name}: urutan pesan`).toEqual(Object.keys(nodeErrors));
    });
    expect(php.dates).toEqual(node.dates);
    expect(php.sort).toEqual(node.sort);
    expect(php.pages).toEqual(node.pages);
  });
});
