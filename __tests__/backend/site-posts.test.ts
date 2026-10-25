// @vitest-environment node
// Berita & pengumuman + SEO situs pembeli di kedua backend (backend/modules/site_posts.php = site_posts.js): validasi
// SitePostInput dan Partial<SiteSeoSettings> (pesan per kolom dan urutannya, foto data URI, tautan, kode verifikasi),
// slug otomatis (huruf kecil, NFD, potong di batas kata, -2/-3), status index situs, bentuk JSON, dan konstanta yang harus
// sama dengan src/types/sitePosts.ts dan registri template. Fungsi murninya dijalankan di PHP CLI dan Node dengan masukan
// yang sama; hasilnya harus identik. Juga: daftar aksi kedua backend dan pemasangan modul di api.php/server.js.
// Bagian PHP dilewati bila `php` tidak ada.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const { fakeS3Sdk } = vi.hoisted(() => {
  // security.js dan s3-client.js membaca ini saat diimpor
  Object.assign(process.env, {
    AUTH_SECRET: 's'.repeat(16) + Math.random().toString(36).slice(2).padEnd(24, 'k'),
    S3_ACCESS_KEY: 'test-access',
    S3_SECRET_KEY: 'test-secret',
    S3_PUBLIC_URL: 'https://s3.test/bucket',
  });
  const fakeS3Sdk = () => {
    class Command {
      input: Record<string, unknown>;
      constructor(input: Record<string, unknown>) {
        this.input = input;
      }
    }
    return {
      S3Client: class {
        send = () => {
          throw new Error('no S3 in this test');
        };
      },
      PutObjectCommand: class PutObjectCommand extends Command {},
      GetObjectCommand: class GetObjectCommand extends Command {},
      DeleteObjectCommand: class DeleteObjectCommand extends Command {},
      HeadObjectCommand: class HeadObjectCommand extends Command {},
      ListObjectsV2Command: class ListObjectsV2Command extends Command {},
    };
  };
  return { fakeS3Sdk };
});

vi.mock('@aws-sdk/client-s3', () => fakeS3Sdk());
vi.mock('../../backend/node_modules/@aws-sdk/client-s3', () => fakeS3Sdk());
vi.mock('bcryptjs', () => ({ default: { hashSync: () => 'dummy', compare: async () => false, hash: async () => 'dummy' } }));

import {
  adminOut,
  cutSlug,
  indexReasons,
  isBot,
  isoTime,
  listLimit,
  POST_TEMPLATE_CODES,
  publicOut,
  SCHEMA_TYPES,
  seoPublicOut,
  seoSettingsOut,
  SITE_POST_ACTIONS,
  SITE_POST_LIMITS,
  SITE_SEO_LIMITS,
  siteUrls,
  slugFromTitle,
  summaryOut,
  uniqueSlug,
  validateSitePost,
  validateSiteSeo,
  verificationToken,
} from '../../backend/modules/site_posts.js';
import {
  SITE_POST_KINDS,
  SITE_POST_LIMITS as TYPE_LIMITS,
  SITE_SCHEMA_TYPES,
  SITE_SEO_LIMITS as TYPE_SEO_LIMITS,
} from '../../src/types/sitePosts';

const ROOT = resolve(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8');
const API_PHP = read('backend', 'api.php');
const SECURITY_JS = read('backend', 'security.js');
const SERVER_JS = read('backend', 'server.js');
const MODULE_PHP_PATH = join(ROOT, 'backend', 'modules', 'site_posts.php');
const MODULE_PHP = readFileSync(MODULE_PHP_PATH, 'utf8');
const MODULE_JS = read('backend', 'modules', 'site_posts.js');
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo extension_loaded("mbstring") ? "ok" : "no";'], { encoding: 'utf8' }).stdout === 'ok';
const TODAY = '2026-10-26';

// ── Gambar uji (data URI); jenis ditentukan dari isi file, bukan dari header data URI ──
const b64 = (bytes: Buffer | string) => Buffer.from(bytes).toString('base64');
const PNG_BYTES = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const PNG = `data:image/png;base64,${b64(PNG_BYTES)}`;
const JPEG = `data:image/jpeg;base64,${b64(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16, 1)]))}`;
const GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const WEBP = `data:image/webp;base64,${b64(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(8)]))}`;
const SVG = `data:image/svg+xml;base64,${b64('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>')}`;
const ICO = `data:image/x-icon;base64,${b64(Buffer.concat([Buffer.from([0, 0, 1, 0]), Buffer.alloc(16)]))}`;
const TEXT = `data:text/plain;base64,${b64('halo')}`;
// 2 MB + 1 byte setelah decode (lolos cek panjang base64, ditolak cek ukuran) dan 3 MB (ditolak cek panjang base64)
const PNG_2MB = `data:image/png;base64,${b64(Buffer.concat([PNG_BYTES, Buffer.alloc(2097153 - PNG_BYTES.length)]))}`;
const PNG_3MB = `data:image/png;base64,${b64(Buffer.concat([PNG_BYTES, Buffer.alloc(3 * 1048576)]))}`;
const STORED = '/assets/sites/7/posts/post_0123456789ab.jpg';

const valid = {
  kind: 'berita',
  title: '  Juara   Olimpiade Sains\tNasional ',
  slug: '',
  excerpt: ' Ringkasan  singkat\u00a0berita. ',
  body: '\r\n Paragraf satu.\r\n\r\nParagraf dua.\r ',
  category: 'Prestasi',
  badge: '',
  image: PNG,
  image_alt: 'Siswa menerima piala',
  link_url: 'https://drive.google.com/file/d/abc',
  status: 'published',
  published_at: '',
  seo_title: '',
  seo_description: '',
  noindex: false,
};

const POST_CASES: { name: string; input: Record<string, unknown>; stored?: string | null }[] = [
  { name: 'lengkap & dirapikan', input: valid },
  { name: 'kosong', input: {} },
  {
    name: 'tipe salah',
    input: { kind: 1, title: ['x'], slug: 12, excerpt: 3, body: { a: 1 }, category: false, image: 5, link_url: true, status: null, published_at: 20261023, seo_title: {}, noindex: 'yes' },
  },
  { name: 'judul 2 karakter', input: { ...valid, title: ' ab ' } },
  { name: 'judul 161 karakter', input: { ...valid, title: 'a'.repeat(161) } },
  { name: 'judul tepat 160 karakter dengan emoji', input: { ...valid, title: `${'é'.repeat(158)}😀😀` } },
  { name: 'judul hanya spasi', input: { ...valid, title: ' \u3000\uFEFF ' } },
  { name: 'slug sah', input: { ...valid, slug: ' juara-olimpiade-2026 ' } },
  { name: 'slug huruf besar & spasi', input: { ...valid, slug: 'Juara Olimpiade' } },
  { name: 'slug terlalu panjang', input: { ...valid, slug: 'a'.repeat(121) } },
  { name: 'slug tanda hubung ganda', input: { ...valid, slug: 'juara--olimpiade' } },
  { name: 'batas panjang teks', input: { ...valid, excerpt: 'r'.repeat(301), category: 'k'.repeat(41), badge: 'b'.repeat(21), image_alt: 't'.repeat(201), seo_title: 's'.repeat(71), seo_description: 'd'.repeat(161) } },
  { name: 'batas panjang tepat', input: { ...valid, excerpt: 'r'.repeat(300), category: 'k'.repeat(40), badge: 'b'.repeat(20), image_alt: 't'.repeat(200), seo_title: 's'.repeat(70), seo_description: 'd'.repeat(160) } },
  { name: 'isi 20.001 karakter', input: { ...valid, body: 'x'.repeat(20001) } },
  { name: 'isi 20.000 karakter + spasi tepi', input: { ...valid, body: `  ${'x'.repeat(20000)}\r\n` } },
  ...[
    'javascript:alert(1)', '//evil.test/x', '/\\evil.test', 'ftp://berkas.test/a', 'https://contoh.sch.id/a b', 'https://',
    `https://contoh.sch.id/${'a'.repeat(480)}`, 'mailto:humas@sekolah.sch.id', 'tel:+62-812-3456', 'TEL:0812', '/berita/lain', '/',
    '#ppdb', 'HTTPS://Contoh.sch.id/Brosur.pdf', 'https://contoh.sch.id/\u200b', 'mailto:', 'data:text/html,hi',
  ].map((link_url) => ({ name: `tautan ${JSON.stringify(link_url.slice(0, 40))}`, input: { ...valid, link_url } })),
  { name: 'status tidak dikenal', input: { ...valid, status: 'terbit' } },
  { name: 'draf tanpa tanggal', input: { ...valid, status: 'draft', published_at: '' } },
  { name: 'draf dengan tanggal', input: { ...valid, status: 'draft', published_at: '2026-10-01' } },
  { name: 'terbit dengan tanggal', input: { ...valid, published_at: ' 2026-10-01 ' } },
  { name: 'tanggal tidak ada di kalender', input: { ...valid, published_at: '2026-02-30' } },
  { name: 'tanggal format lain', input: { ...valid, published_at: '26-10-2026' } },
  { name: 'tanggal null saat terbit', input: { ...valid, published_at: null } },
  ...[true, 1, '1', 'true', false, 0, 'yes', null].map((noindex) => ({ name: `noindex ${JSON.stringify(noindex)}`, input: { ...valid, noindex } })),
  // Foto
  { name: 'foto tidak dikirim (tulisan lama)', input: Object.fromEntries(Object.entries(valid).filter(([key]) => key !== 'image')), stored: STORED },
  { name: 'foto sama dengan tersimpan', input: { ...valid, image: ` ${STORED} ` }, stored: STORED },
  { name: 'foto null = hapus', input: { ...valid, image: null }, stored: STORED },
  { name: 'foto kosong = hapus', input: { ...valid, image: '  ' }, stored: STORED },
  { name: 'foto path lain', input: { ...valid, image: '/assets/sites/8/posts/post_0123456789ab.jpg' }, stored: STORED },
  { name: 'foto path tanpa foto tersimpan', input: { ...valid, image: STORED } },
  { name: 'foto URL luar', input: { ...valid, image: 'https://contoh.test/foto.jpg' } },
  { name: 'foto JPEG', input: { ...valid, image: ` ${JPEG}\n` } },
  { name: 'foto GIF', input: { ...valid, image: GIF } },
  { name: 'foto WEBP', input: { ...valid, image: WEBP } },
  { name: 'foto SVG', input: { ...valid, image: SVG } },
  { name: 'foto ICO', input: { ...valid, image: ICO } },
  { name: 'data URI teks', input: { ...valid, image: TEXT } },
  { name: 'data URI tanpa base64', input: { ...valid, image: 'data:image/png,iVBORw0KGgo=' } },
  { name: 'data URI rusak', input: { ...valid, image: 'data:image/png;base64,!!!!' } },
  { name: 'foto 2 MB + 1 byte', input: { ...valid, image: PNG_2MB } },
  { name: 'foto 3 MB', input: { ...valid, image: PNG_3MB } },
  { name: 'foto angka', input: { ...valid, image: 5 } },
];

const SEO_DEFAULT = { title: '', description: '', og_image: null, google_verification: '', bing_verification: '', index_mode: 'auto', schema_type: '', updated_at: null };
const SEO_STORED = {
  title: 'SMA Madani Bogor', description: 'Sekolah Islam di Bogor.', og_image: '/assets/sites/7/seo/seo_0123456789ab.png',
  google_verification: 'abcdefghijABCDEFGHIJ_-123', bing_verification: '0123456789ABCDEF0123456789ABCDEF', index_mode: 'index',
  schema_type: 'HighSchool', updated_at: '2026-10-25T09:00:00+07:00',
};
const GOOGLE_TAG = '<meta name="google-site-verification" content="Xy_1-abcdefghijklmnopqrstuvwxyzABCDEFGHIJK" />';

const SEO_CASES: { name: string; input: Record<string, unknown>; current: Record<string, unknown> }[] = [
  { name: 'tidak ada yang dikirim', input: {}, current: SEO_STORED },
  {
    name: 'semua diisi',
    input: { title: '  SMA   Madani ', description: 'Deskripsi\nsitus. ', og_image: PNG, google_verification: GOOGLE_TAG, bing_verification: ' 0123456789ABCDEF0123456789ABCDEF ', index_mode: 'noindex', schema_type: 'School' },
    current: SEO_DEFAULT,
  },
  { name: 'sebagian: index_mode saja', input: { index_mode: ' index ' }, current: SEO_STORED },
  { name: 'gambar sama = tetap', input: { og_image: SEO_STORED.og_image }, current: SEO_STORED },
  { name: 'gambar null = hapus', input: { og_image: null }, current: SEO_STORED },
  { name: 'kode dihapus (null dan kosong)', input: { google_verification: null, bing_verification: '  ' }, current: SEO_STORED },
  {
    name: 'semua salah',
    input: { title: 't'.repeat(71), description: 'd'.repeat(161), og_image: SVG, google_verification: 'pendek', bing_verification: '<meta name="msvalidate.01">', index_mode: 'ya', schema_type: 'Church' },
    current: SEO_DEFAULT,
  },
  { name: 'tipe salah', input: { title: 5, description: [], og_image: {}, google_verification: 12345678901, index_mode: null, schema_type: null }, current: SEO_DEFAULT },
  { name: 'batas tepat', input: { title: 't'.repeat(70), description: 'd'.repeat(160), schema_type: '' }, current: SEO_STORED },
];

const VERIFICATION_CASES: unknown[] = [
  null, '', '   ', 'abcdefghij', 'abcdefghi', 'a'.repeat(100), 'a'.repeat(101), 'token dengan spasi', 'tok$en12345',
  GOOGLE_TAG, `<meta name='google-site-verification' content='abcdefghijABCDEFGHIJ_-123'/>`,
  '<meta name="msvalidate.01" content = "  0123456789ABCDEF0123456789ABCDEF  " />', '<meta name="x" content="pendek">',
  '<meta content="abcdefghij12" name="google-site-verification">', '<meta name="x">', `<meta content="${'a'.repeat(495)}">`,
  'google-site-verification=abcdefghij12', 12345678901, ['abcdefghij12'],
];

const NAME = (company: unknown) => JSON.stringify({ brand: { company_name: company }, hero: { title: 'x' } });
const INDEX_CASES: [string, string, string | null, string | null][] = [
  ['active', 'auto', null, 'SMA Madani'],
  ['active', 'auto', NAME('SMA Madani'), 'SMA Madani'],
  ['active', 'auto', NAME('  SMA\u00a0  Madani '), 'SMA Madani'],
  ['active', 'auto', NAME('SMA Al-Hikmah Bogor'), 'SMA Madani'],
  ['active', 'auto', NAME('sma madani'), 'SMA Madani'],
  ['active', 'index', null, 'SMA Madani'],
  ['active', 'noindex', NAME('SMA Al-Hikmah'), 'SMA Madani'],
  ['suspended', 'noindex', NAME('X'), 'Y'],
  ['suspended', 'auto', 'bukan json', null],
  ['suspended', 'index', null, null],
  ['active', 'auto', '[]', null],
  ['active', 'auto', '{}', null],
  ['active', 'auto', '"teks"', null],
  ['active', 'auto', NAME(''), null],
  ['active', 'auto', NAME('Nama Sekolah'), null],
  ['active', 'auto', JSON.stringify({ brand: ['x'] }), null],
  ['active', 'auto', NAME(5), null],
  ['active', 'auto', '', null],
];

const TITLE_CASES = [
  'Juara Olimpiade Sains Nasional 2026',
  'Pengumuman PPDB 2026/2027 — Gelombang II!',
  'ÉLÈVE İstanbul Ångström \u212Aelvin \u212B',
  'Cafe\u0301 Baru di Kantin',
  'Ẳ ẞ Œ Ǆ Ǳ ǅ Ø Đ Ł Þ ß æ',
  '!!! ???',
  'مدرسة المدني',
  '中文 news 2026',
  'a'.repeat(130),
  'kata '.repeat(40),
  `${'a'.repeat(119)}-bcd efg`,
  `${'a'.repeat(120)} bcd`,
  '-- Awal & Akhir --',
  'ÀÁÂÃÄÅàáâãäå ÇçĆćČč ŠšŽž Ññ',
];

const UNIQUE_CASES: [string, string[]][] = [
  ['juara', []],
  ['juara', ['juara']],
  ['juara', ['juara', 'juara-2', 'juara-3']],
  ['juara', ['juara-2']],
  ['a'.repeat(120), ['a'.repeat(120)]],
  [`${'kata-'.repeat(23)}akhir`, [`${'kata-'.repeat(23)}akhir`]],
  ['juara', ['juara', ...Array.from({ length: 10 }, (_, i) => `juara-${i + 2}`)]],
];

const CUT_CASES: [string, number][] = [
  ['abc-def', 120], [`${'abcd-'.repeat(30)}x`, 120], ['a'.repeat(130), 120], ['ab-cd-ef', 5], ['ab-cd-ef', 6], ['ab-cd-ef', 2], ['abcdef', 3],
];

const ISO_CASES: unknown[] = [0, 1761445800, '1761445800', null, '', 1767200399, 1767200400];
const LIMIT_CASES = [0, -5, 1, 12, 99, 100, 101, 1000];
const BOT_CASES = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'Mozilla/5.0 (Windows NT 10.0) Chrome/130',
  'facebookexternalhit/1.1', 'Slackbot-LinkExpanding 1.0', 'WhatsApp/2.23.20', '', 'Mozilla/5.0 (compatible; bingbot/2.0)',
  'TelegramBot (like TwitterBot)', 'Mozilla/5.0 (compatible; Yahoo! Slurp)', 'Google-InspectionTool/1.0', 'AhrefsSpider',
  'Screaming Frog SEO Crawler', 'Mozilla/5.0 Preview', 'curl/8.4.0',
];

const SUMMARY_ROW = {
  id: 15, kind: 'berita', slug: 'juara-olimpiade', title: 'Juara Olimpiade', excerpt: 'Ringkasan', category: 'Prestasi', badge: '',
  image: STORED, image_alt: 'Piala', link_url: '', published_at: '2026-10-20', updated_ts: 1761445800,
};
const POST_ROW = { ...SUMMARY_ROW, body: 'Paragraf satu.\n\nParagraf dua.', seo_title: '', seo_description: 'Deskripsi', noindex: 0 };
const ADMIN_ROW = { ...POST_ROW, status: 'published', created_ts: 1761400000, view_count: 12, last_viewed_ts: 1761450000 };
// mysqli tanpa parameter (query biasa) mengembalikan semua kolom sebagai teks
const STRING_ROW = {
  ...ADMIN_ROW, id: '16', image: '', published_at: null, noindex: '1', status: 'draft', view_count: null, last_viewed_ts: null,
  updated_ts: '1761445800', created_ts: '1761400000',
};
const SEO_ROWS = [
  null,
  { ...SEO_STORED, og_image: '', updated_ts: 1761357600 },
  { title: 'x', description: 'y', og_image: null, google_verification: '', bing_verification: '', index_mode: 'aneh', schema_type: 'Church', updated_ts: '1761357600' },
];

const PHP_HARNESS = String.raw`
${['class ApiError ', ...['env_value', 'upload_limit_bytes', 'sniff_image', 'svg_has_active_content', 'parse_upload'].map((n) => `function ${n}\\(`)]
  .map(apiPhpBlock).join('\n')}
require getenv('SP_MODULE');
$in = json_decode(stream_get_contents(STDIN), true);
$out = [
  'posts' => [], 'seo' => [], 'verification' => array_map('sp_verification_token', $in['verification']), 'index' => [],
  'slugs' => [], 'unique' => [], 'cut' => [], 'iso' => array_map('sp_iso', $in['iso']),
  'limits' => array_map('sp_list_limit', $in['limits']), 'bots' => array_map('sp_is_bot', $in['bots']),
  'summary' => sp_summary_out($in['rows']['admin']), 'public' => sp_public_out($in['rows']['admin']),
  'admin' => [sp_admin_out($in['rows']['admin'], 'smamadani.sch.id'), sp_admin_out($in['rows']['strings'], 'contoh.sch.id')],
  'seoOut' => [], 'urls' => sp_site_urls('smamadani.sch.id'), 'fold' => sp_fold_map(),
  'singles' => [],
  'constants' => ['limits' => SP_LIMITS, 'seoLimits' => SP_SEO_LIMITS, 'schemaTypes' => SP_SCHEMA_TYPES, 'kinds' => SP_KINDS,
                  'codes' => SP_POST_TEMPLATE_CODES],
];
foreach ($in['posts'] as $c) $out['posts'][] = sp_validate_post($c['input'], $c['stored'], $in['today']);
foreach ($in['seo'] as $c) $out['seo'][] = sp_validate_seo($c['input'], $c['current']);
foreach ($in['index'] as $c) $out['index'][] = sp_index_reasons($c[0], $c[1], $c[2], $c[3]);
foreach ($in['titles'] as $t) $out['slugs'][] = sp_slug_from_title($t, 'berita');
foreach ($in['unique'] as $c) $out['unique'][] = sp_unique_slug($c[0], $c[1]);
foreach ($in['cut'] as $c) $out['cut'][] = sp_cut_slug($c[0], $c[1]);
foreach ($in['seoRows'] as $r) $out['seoOut'][] = [sp_seo_settings_out($r), sp_seo_public_out($r, true)];
foreach ($in['singles'] as $t) $out['singles'][] = sp_slug_from_title($t, '');
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

function apiPhpBlock(pattern: string) {
  const match = API_PHP.match(new RegExp(`^${pattern}[\\s\\S]*?^}\\r?$`, 'm'));
  if (!match) throw new Error(`${pattern} not found in backend/api.php`);
  return match[0];
}

// Satu huruf per judul: semua huruf Latin berdiakritik (Latin-1 Supplement s.d. Latin Extended Additional, juga huruf
// besarnya) dan tanda Kelvin/Angstrom. Hasil PHP (mb_strtolower + tabel SP_FOLD) harus sama dengan Node (NFD).
const SINGLE_LETTERS = (() => {
  const out: string[] = [];
  for (const [from, to] of [[0xc0, 0x24f], [0x1e00, 0x1eff], [0x2126, 0x212b]]) {
    for (let cp = from; cp <= to; cp++) out.push(`x${String.fromCodePoint(cp)}x`);
  }
  return out;
})();

/** Huruf berdiakritik (huruf kecil) → huruf dasar menurut NFD Node: yang harus ada di SP_FOLD. */
function nodeFoldTable() {
  const table: Record<string, string> = {};
  for (let cp = 0x80; cp <= 0x10ffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const c = String.fromCodePoint(cp);
    if (c.toLowerCase() !== c) continue;
    const base = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (base !== c && /[a-z0-9]/.test(base)) table[c] = base;
  }
  return table;
}

const empty = (errors: unknown) => (Array.isArray(errors) && errors.length === 0 ? {} : errors);

const node = {
  posts: POST_CASES.map((c) => validateSitePost(c.input, c.stored ?? null, TODAY)),
  seo: SEO_CASES.map((c) => validateSiteSeo(c.input, c.current)),
  verification: VERIFICATION_CASES.map(verificationToken),
  index: INDEX_CASES.map((c) => indexReasons(...c)),
  slugs: TITLE_CASES.map((t) => slugFromTitle(t, 'berita')),
  unique: UNIQUE_CASES.map(([base, taken]) => uniqueSlug(base, taken)),
  cut: CUT_CASES.map(([slug, max]) => cutSlug(slug, max)),
  iso: ISO_CASES.map(isoTime),
  limits: LIMIT_CASES.map(listLimit),
  bots: BOT_CASES.map(isBot),
  summary: summaryOut(ADMIN_ROW),
  public: publicOut(ADMIN_ROW),
  admin: [adminOut(ADMIN_ROW, 'smamadani.sch.id'), adminOut(STRING_ROW, 'contoh.sch.id')],
  seoOut: SEO_ROWS.map((r) => [seoSettingsOut(r), seoPublicOut(r, true)]),
  urls: siteUrls('smamadani.sch.id'),
  singles: SINGLE_LETTERS.map((t) => slugFromTitle(t, '')),
};

const errorsOf = (name: string) => node.posts[POST_CASES.findIndex((c) => c.name === name)][1] as Record<string, string>;
const postOf = (name: string) => node.posts[POST_CASES.findIndex((c) => c.name === name)][0] as Record<string, unknown>;

describe('site_posts.js: validasi tulisan', () => {
  it('input lengkap dirapikan: spasi judul dirapatkan, isi LF, foto PNG diunggah, terbit tanpa tanggal = hari ini', () => {
    const [post, errors] = node.posts[0];
    expect(errors).toEqual({});
    expect(post).toMatchObject({
      kind: 'berita',
      title: 'Juara Olimpiade Sains Nasional',
      slug: '',
      excerpt: 'Ringkasan singkat berita.',
      body: 'Paragraf satu.\n\nParagraf dua.',
      image_action: 'upload',
      image_ext: 'png',
      image_data: PNG,
      status: 'published',
      published_at: TODAY,
      noindex: false,
    });
  });

  it('isian wajib dan tipe salah: pesan per kolom dengan urutan SitePostInput', () => {
    expect(Object.keys(errorsOf('kosong'))).toEqual(['kind', 'title', 'status']);
    expect(errorsOf('kosong')).toEqual({
      kind: 'Pilih jenis tulisan: berita atau pengumuman.',
      title: 'Judul wajib diisi.',
      status: 'Pilih status tulisan: Draf atau Terbit.',
    });
    expect(Object.keys(errorsOf('tipe salah'))).toEqual([
      'kind', 'title', 'slug', 'excerpt', 'body', 'category', 'image', 'link_url', 'status', 'published_at', 'seo_title',
    ]);
    expect(errorsOf('tipe salah').image).toBe('Foto tidak valid. Unggah ulang fotonya.');
    expect(postOf('tipe salah').noindex).toBe(false);
  });

  it('batas panjang dihitung per karakter (emoji = 1)', () => {
    expect(errorsOf('judul 2 karakter')).toEqual({ title: 'Judul minimal 3 karakter.' });
    expect(errorsOf('judul 161 karakter')).toEqual({ title: 'Judul maksimal 160 karakter.' });
    expect(errorsOf('judul tepat 160 karakter dengan emoji')).toEqual({});
    expect(errorsOf('judul hanya spasi')).toEqual({ title: 'Judul wajib diisi.' });
    expect(errorsOf('batas panjang tepat')).toEqual({});
    expect(errorsOf('batas panjang teks')).toEqual({
      excerpt: 'Ringkasan maksimal 300 karakter.',
      category: 'Kategori maksimal 40 karakter.',
      badge: 'Label maksimal 20 karakter.',
      image_alt: 'Teks foto maksimal 200 karakter.',
      seo_title: 'Judul SEO maksimal 70 karakter.',
      seo_description: 'Deskripsi SEO maksimal 160 karakter.',
    });
    expect(errorsOf('isi 20.001 karakter')).toEqual({ body: 'Isi tulisan maksimal 20.000 karakter.' });
    expect(errorsOf('isi 20.000 karakter + spasi tepi')).toEqual({});
  });

  it('slug: kosong = otomatis, diisi harus pola huruf kecil-angka-tanda hubung', () => {
    expect(postOf('slug sah').slug).toBe('juara-olimpiade-2026');
    expect(errorsOf('slug huruf besar & spasi').slug).toMatch(/^Slug hanya boleh huruf kecil/);
    expect(errorsOf('slug tanda hubung ganda').slug).toMatch(/^Slug hanya boleh huruf kecil/);
    expect(errorsOf('slug terlalu panjang')).toEqual({ slug: 'Slug maksimal 120 karakter.' });
  });

  it('tautan tambahan: hanya http(s), mailto, tel, path situs dan #anchor', () => {
    const verdict = (link: string) => !('link_url' in errorsOf(`tautan ${JSON.stringify(link.slice(0, 40))}`));
    expect(['https://contoh.sch.id/a b', 'javascript:alert(1)', '//evil.test/x', '/\\evil.test', 'ftp://berkas.test/a', 'https://',
      'mailto:', 'data:text/html,hi'].map(verdict)).toEqual(Array(8).fill(false));
    // U+200B bukan spasi menurut \s (PHP /u maupun JavaScript), jadi lolos di kedua backend
    expect(['mailto:humas@sekolah.sch.id', 'tel:+62-812-3456', 'TEL:0812', '/berita/lain', '/', '#ppdb', 'HTTPS://Contoh.sch.id/Brosur.pdf',
      'https://contoh.sch.id/\u200b'].map(verdict)).toEqual(Array(8).fill(true));
    expect(errorsOf(`tautan ${JSON.stringify(`https://contoh.sch.id/${'a'.repeat(480)}`.slice(0, 40))}`).link_url)
      .toBe('Tautan tambahan maksimal 500 karakter.');
  });

  it('tanggal: terbit tanpa tanggal = hari ini, draf boleh kosong, harus ada di kalender', () => {
    expect(postOf('draf tanpa tanggal').published_at).toBeNull();
    expect(postOf('draf dengan tanggal').published_at).toBe('2026-10-01');
    expect(postOf('terbit dengan tanggal').published_at).toBe('2026-10-01');
    expect(postOf('tanggal null saat terbit').published_at).toBe(TODAY);
    expect(errorsOf('tanggal tidak ada di kalender')).toEqual({ published_at: 'Tanggal harus tanggal yang valid (YYYY-MM-DD).' });
    expect(errorsOf('tanggal format lain')).toEqual({ published_at: 'Tanggal harus tanggal yang valid (YYYY-MM-DD).' });
    expect(errorsOf('status tidak dikenal')).toEqual({ status: 'Pilih status tulisan: Draf atau Terbit.' });
  });

  it('noindex hanya true / 1 / "1" / "true"', () => {
    const flags = [true, 1, '1', 'true', false, 0, 'yes', null].map((v) => postOf(`noindex ${JSON.stringify(v)}`).noindex);
    expect(flags).toEqual([true, true, true, true, false, false, false, false]);
  });

  it('foto: tetap, hapus, unggah raster ≤ 2 MB; path lain, SVG/ICO dan file besar ditolak', () => {
    const action = (name: string) => [postOf(name).image_action, postOf(name).image_ext, errorsOf(name).image ?? null];
    expect(action('foto tidak dikirim (tulisan lama)')).toEqual(['keep', null, null]);
    expect(action('foto sama dengan tersimpan')).toEqual(['keep', null, null]);
    expect(action('foto null = hapus')).toEqual(['delete', null, null]);
    expect(action('foto kosong = hapus')).toEqual(['delete', null, null]);
    expect(action('foto JPEG')).toEqual(['upload', 'jpg', null]);
    expect(postOf('foto JPEG').image_data).toBe(JPEG);
    expect(action('foto GIF')).toEqual(['upload', 'gif', null]);
    expect(action('foto WEBP')).toEqual(['upload', 'webp', null]);
    const invalid = 'Foto tidak valid. Unggah ulang fotonya.';
    const unsupported = 'Format foto tidak didukung. Gunakan PNG, JPG, WEBP, atau GIF.';
    const tooLarge = 'Ukuran foto maksimal 2 MB.';
    expect(['foto path lain', 'foto path tanpa foto tersimpan', 'foto URL luar', 'data URI tanpa base64', 'foto angka'].map((n) => errorsOf(n).image))
      .toEqual(Array(5).fill(invalid));
    expect(['foto SVG', 'foto ICO', 'data URI teks', 'data URI rusak'].map((n) => errorsOf(n).image)).toEqual(Array(4).fill(unsupported));
    expect(['foto 2 MB + 1 byte', 'foto 3 MB'].map((n) => errorsOf(n).image)).toEqual([tooLarge, tooLarge]);
  });
});

describe('site_posts.js: SEO situs', () => {
  const seoOf = (name: string) => node.seo[SEO_CASES.findIndex((c) => c.name === name)];

  it('kunci yang tidak dikirim tetap, kode verifikasi diambil dari tag meta', () => {
    expect(seoOf('tidak ada yang dikirim')).toEqual([
      {
        title: 'SMA Madani Bogor', description: 'Sekolah Islam di Bogor.', og_image_action: 'keep', og_image_data: null, og_image_ext: null,
        google_verification: 'abcdefghijABCDEFGHIJ_-123', bing_verification: '0123456789ABCDEF0123456789ABCDEF', index_mode: 'index',
        schema_type: 'HighSchool',
      },
      {},
    ]);
    const [seo, errors] = seoOf('semua diisi');
    expect(errors).toEqual({});
    expect(seo).toEqual({
      title: 'SMA Madani',
      description: 'Deskripsi situs.',
      og_image_action: 'upload',
      og_image_data: PNG,
      og_image_ext: 'png',
      google_verification: 'Xy_1-abcdefghijklmnopqrstuvwxyzABCDEFGHIJK',
      bing_verification: '0123456789ABCDEF0123456789ABCDEF',
      index_mode: 'noindex',
      schema_type: 'School',
    });
    expect(seoOf('sebagian: index_mode saja')[0]).toMatchObject({ title: 'SMA Madani Bogor', index_mode: 'index', og_image_action: 'keep' });
    expect(seoOf('gambar sama = tetap')[0].og_image_action).toBe('keep');
    expect(seoOf('gambar null = hapus')[0].og_image_action).toBe('delete');
    expect(seoOf('kode dihapus (null dan kosong)')[0]).toMatchObject({ google_verification: '', bing_verification: '' });
    expect(seoOf('batas tepat')[1]).toEqual({});
  });

  it('pesan per kolom dengan urutan SiteSeoSettings', () => {
    expect(seoOf('semua salah')[1]).toEqual({
      title: 'Judul di Google maksimal 70 karakter.',
      description: 'Deskripsi di Google maksimal 160 karakter.',
      og_image: 'Format gambar tidak didukung. Gunakan PNG, JPG, WEBP, atau GIF.',
      google_verification: 'Kode verifikasi Google tidak valid. Tempel kode dari Google Search Console atau seluruh tag meta-nya.',
      bing_verification: 'Kode verifikasi Bing tidak valid. Tempel kode dari Bing Webmaster Tools atau seluruh tag meta-nya.',
      index_mode: 'Pilih tampil di Google: Otomatis, Ya, atau Tidak.',
      schema_type: 'Jenis organisasi tidak dikenal. Pilih dari daftar.',
    });
    expect(Object.keys(seoOf('tipe salah')[1])).toEqual(['title', 'description', 'og_image', 'google_verification', 'index_mode', 'schema_type']);
  });

  it('kode verifikasi: token 10–100 karakter [A-Za-z0-9_-] atau tag meta lengkap', () => {
    expect(node.verification).toEqual([
      '', '', '', 'abcdefghij', null, 'a'.repeat(100), null, null, null,
      'Xy_1-abcdefghijklmnopqrstuvwxyzABCDEFGHIJK', 'abcdefghijABCDEFGHIJ_-123', '0123456789ABCDEF0123456789ABCDEF', null,
      'abcdefghij12', null, null, null, null, null,
    ]);
  });

  it('status index: suspended, manual_noindex, default_content (nama kosong atau sama dengan bawaan template)', () => {
    expect(node.index).toEqual([
      ['default_content'],
      ['default_content'],
      ['default_content'],
      [],
      [],
      [],
      ['manual_noindex'],
      ['suspended', 'manual_noindex'],
      ['suspended', 'default_content'],
      ['suspended'],
      ['default_content'],
      ['default_content'],
      ['default_content'],
      ['default_content'],
      [],
      ['default_content'],
      ['default_content'],
      ['default_content'],
    ]);
  });
});

describe('site_posts.js: slug, waktu dan bentuk JSON', () => {
  it('slug otomatis dari judul: huruf kecil, tanpa diakritik, potong di batas kata', () => {
    expect(node.slugs).toEqual([
      'juara-olimpiade-sains-nasional-2026',
      'pengumuman-ppdb-2026-2027-gelombang-ii',
      'eleve-istanbul-angstrom-kelvin-a',
      'cafe-baru-di-kantin',
      'a',
      'berita',
      'berita',
      'news-2026',
      'a'.repeat(120),
      `${'kata-'.repeat(23)}kata`,
      'a'.repeat(119),
      'a'.repeat(120),
      'awal-akhir',
      'aaaaaaaaaaaa-cccccc-sszz-nn',
    ]);
    for (const slug of node.slugs) expect(slug.length).toBeLessThanOrEqual(120);
  });

  it('slug unik per situs: -2, -3, … tetap ≤ 120 karakter', () => {
    expect(node.unique).toEqual([
      'juara',
      'juara-2',
      'juara-4',
      'juara',
      `${'a'.repeat(118)}-2`,
      `${'kata-'.repeat(22)}kata-2`,
      'juara-12',
    ]);
    expect(node.cut).toEqual(['abc-def', `${'abcd-'.repeat(23)}abcd`, 'a'.repeat(120), 'ab-cd', 'ab-cd', 'ab', 'abc']);
  });

  it('waktu ISO 8601 WIB, limit daftar, perayap', () => {
    expect(node.iso).toEqual([
      '1970-01-01T07:00:00+07:00', '2025-10-26T09:30:00+07:00', '2025-10-26T09:30:00+07:00', null, null,
      '2025-12-31T23:59:59+07:00', '2026-01-01T00:00:00+07:00',
    ]);
    expect(node.limits).toEqual([12, 12, 1, 12, 99, 100, 100, 100]);
    expect(node.bots).toEqual([true, false, true, true, false, false, true, true, true, false, true, true, true, false]);
  });

  it('bentuk SitePostSummary / SitePostPublic / SitePostAdmin dan SiteSeoSettings', () => {
    expect(Object.keys(node.summary)).toEqual([
      'id', 'kind', 'slug', 'title', 'excerpt', 'category', 'badge', 'image', 'image_alt', 'link_url', 'published_at', 'updated_at',
    ]);
    expect(Object.keys(node.public).slice(12)).toEqual(['body', 'seo_title', 'seo_description', 'noindex']);
    expect(node.admin[0]).toMatchObject({
      id: 15, noindex: false, status: 'published', view_count: 12, last_viewed_at: '2025-10-26T10:40:00+07:00',
      created_at: '2025-10-25T20:46:40+07:00', updated_at: '2025-10-26T09:30:00+07:00',
      url: 'https://smamadani.sch.id/berita/juara-olimpiade',
    });
    expect(node.admin[1]).toMatchObject({ id: 16, image: null, published_at: null, noindex: true, status: 'draft', view_count: 0, last_viewed_at: null });
    expect(node.seoOut[0]).toEqual([SEO_DEFAULT, { title: '', description: '', og_image: null, schema_type: '', indexable: true }]);
    expect(node.seoOut[1][0]).toEqual({ ...SEO_STORED, og_image: null, updated_at: '2025-10-25T09:00:00+07:00' });
    expect(node.seoOut[2][0]).toMatchObject({ index_mode: 'auto', schema_type: '' });
    expect(node.urls).toEqual({
      home: 'https://smamadani.sch.id/',
      sitemap: 'https://smamadani.sch.id/sitemap.xml',
      robots: 'https://smamadani.sch.id/robots.txt',
    });
  });

  it('konstanta sama dengan src/types/sitePosts.ts', () => {
    expect(SITE_POST_LIMITS).toEqual(TYPE_LIMITS);
    expect(SITE_SEO_LIMITS).toEqual(TYPE_SEO_LIMITS);
    expect([...SCHEMA_TYPES]).toEqual([...SITE_SCHEMA_TYPES]);
    expect(MODULE_JS).toContain(`const KINDS = ${JSON.stringify(SITE_POST_KINDS).replace(/"/g, "'").replace(/,/g, ', ')};`);
  });
});

describe('template berfitur tulisan', () => {
  it('POST_TEMPLATE_CODES = SP_POST_TEMPLATE_CODES = features.posts di registri template', async () => {
    const { TEMPLATES } = await import('../../src/templates');
    const registry = Object.values(TEMPLATES).filter((def) => def.features?.posts === true).map((def) => def.code);
    expect([...POST_TEMPLATE_CODES].sort()).toEqual(registry.sort());
    expect(MODULE_PHP).toMatch(new RegExp(`^const SP_POST_TEMPLATE_CODES = \\[${POST_TEMPLATE_CODES.map((c) => `'${c}'`).join(', ')}\\];\\r?$`, 'm'));
  }, 60_000); // registri memuat semua komponen template (lambat di transform pertama)

  it('site_defaults.json (bila sudah dibuat) menandai template yang sama dengan posts: true', () => {
    const file = join(ROOT, 'backend', 'modules', 'site_defaults.json');
    if (!existsSync(file)) return; // dibuat jalur lain (tes site-defaults); modul membacanya saat dipakai
    const defaults = JSON.parse(readFileSync(file, 'utf8')) as Record<string, { posts?: boolean; company_name?: unknown }>;
    const flagged = Object.entries(defaults).filter(([, d]) => d.posts === true).map(([code]) => code);
    expect(flagged.sort()).toEqual([...POST_TEMPLATE_CODES].sort());
    for (const d of Object.values(defaults)) expect(typeof d.company_name).toBe('string');
  });
});

describe('akses dan pemasangan (api.php ↔ security.js ↔ server.js)', () => {
  const listOf = (source: string, name: string) => {
    const block = source.match(new RegExp(`${name}\\s*=\\s*(?:new Set\\()?\\[([\\s\\S]*?)\\]`));
    if (!block) throw new Error(`${name} not found`);
    return [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  };
  const PUBLIC = ['get_site_seo', 'get_site_posts', 'get_site_post', 'site_post_view'];
  const CUSTOMER = ['customer_get_site_posts', 'customer_save_site_post', 'customer_delete_site_post', 'customer_get_site_seo', 'customer_save_site_seo'];

  it('daftar aksi kedua backend identik', () => {
    for (const name of ['PUBLIC_ACTIONS', 'ANY_ROLE_ACTIONS', 'CUSTOMER_ACTIONS', 'ADMIN_ACTIONS']) {
      expect(listOf(API_PHP, name).sort()).toEqual(listOf(SECURITY_JS, name).sort());
    }
  });

  it('aksi publik di PUBLIC_ACTIONS, aksi pembeli di CUSTOMER_ACTIONS saja', () => {
    expect([...SITE_POST_ACTIONS].sort()).toEqual([...PUBLIC, ...CUSTOMER].sort());
    for (const source of [API_PHP, SECURITY_JS]) {
      const lists = Object.fromEntries(['PUBLIC_ACTIONS', 'ANY_ROLE_ACTIONS', 'CUSTOMER_ACTIONS', 'ADMIN_ACTIONS'].map((n) => [n, listOf(source, n)]));
      for (const action of PUBLIC) {
        expect(lists.PUBLIC_ACTIONS).toContain(action);
        expect([...lists.CUSTOMER_ACTIONS, ...lists.ADMIN_ACTIONS, ...lists.ANY_ROLE_ACTIONS]).not.toContain(action);
      }
      for (const action of CUSTOMER) {
        expect(lists.CUSTOMER_ACTIONS).toContain(action);
        expect([...lists.PUBLIC_ACTIONS, ...lists.ADMIN_ACTIONS, ...lists.ANY_ROLE_ACTIONS]).not.toContain(action);
      }
    }
  });

  it('modul PHP punya aksi dan aksi GET yang sama dengan modul Node', () => {
    const phpActions = [...MODULE_PHP.matchAll(/'([a-z_]+)' => 'sp_/g)].map((m) => m[1]);
    expect(phpActions.sort()).toEqual([...SITE_POST_ACTIONS].sort());
    const phpGet = listOf(MODULE_PHP, 'SP_GET_ACTIONS');
    const jsGet = listOf(MODULE_JS, 'GET_ACTIONS');
    expect(phpGet).toEqual(jsGet);
    expect(phpGet.sort()).toEqual(['customer_get_site_posts', 'customer_get_site_seo', 'get_site_post', 'get_site_posts', 'get_site_seo']);
  });

  it('api.php memuat modul dan memanggilnya setelah cek token; server.js di GET dan POST', () => {
    expect(API_PHP).toContain("require_once __DIR__ . '/modules/site_posts.php';");
    const authAt = API_PHP.indexOf('$authUser = authorize_request($conn, $action, $input);');
    expect(authAt).toBeGreaterThan(0);
    expect(API_PHP.indexOf('if (handle_site_post_action($conn, $action, $input, $authUser)) {')).toBeGreaterThan(authAt);
    expect(API_PHP.indexOf('if (handle_site_post_action(')).toBeLessThan(API_PHP.indexOf('switch ($action) {'));
    expect(SERVER_JS).toContain("import { handleSitePostAction } from './modules/site_posts.js';");
    expect(SERVER_JS).toContain('if (await handleSitePostAction(action, req.query, req, res, pool)) return;');
    expect(SERVER_JS).toContain('if (await handleSitePostAction(action, req.body, req, res, pool)) return;');
    expect(SERVER_JS.indexOf('handleSitePostAction(action, req.body')).toBeLessThan(SERVER_JS.indexOf('const conn = await pool.getConnection();'));
  });

  it('site_posts.php aman di-include site.php: hanya konstanta dan fungsi di tingkat atas', () => {
    const topLevel = MODULE_PHP.split(/\r?\n/).filter((line) => /^\S/.test(line) && !/^(\/\/|\/\*\*|<\?php|const |function |\}|\])/.test(line));
    expect(topLevel).toEqual([]);
  });

  it.skipIf(!PHP_AVAILABLE)('site_posts.php bisa di-include sendiri tanpa keluaran (tanpa api.php/templates.php)', () => {
    const result = spawnSync('php', ['-d', 'display_errors=stderr', '-r', `require getenv('SP_MODULE'); echo function_exists('sp_index_reasons') ? 'ok' : 'no';`], {
      encoding: 'utf8',
      env: { ...process.env, SP_MODULE: MODULE_PHP_PATH },
    });
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('ok');
  });
});

describe.skipIf(!PHP_AVAILABLE)('site_posts.php sama dengan site_posts.js', () => {
  const result = PHP_AVAILABLE
    ? spawnSync('php', ['-d', 'display_errors=stderr', '-d', 'memory_limit=512M', '-r', PHP_HARNESS], {
        input: JSON.stringify({
          today: TODAY,
          posts: POST_CASES.map((c) => ({ input: c.input, stored: c.stored ?? null })),
          seo: SEO_CASES,
          verification: VERIFICATION_CASES,
          index: INDEX_CASES,
          titles: TITLE_CASES,
          unique: UNIQUE_CASES,
          cut: CUT_CASES,
          iso: ISO_CASES,
          limits: LIMIT_CASES,
          bots: BOT_CASES,
          rows: { admin: ADMIN_ROW, strings: STRING_ROW },
          seoRows: SEO_ROWS,
          singles: SINGLE_LETTERS,
        }),
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, SP_MODULE: MODULE_PHP_PATH },
      })
    : null;
  const php = () => {
    expect(result!.stderr).toBe('');
    return JSON.parse(result!.stdout);
  };

  it('validasi tulisan: hasil, pesan dan urutan kunci galat sama', () => {
    const out = php().posts as [Record<string, unknown>, unknown][];
    out.forEach(([post, errors], i) => {
      const [nodePost, nodeErrors] = node.posts[i];
      expect({ name: POST_CASES[i].name, post }).toEqual({ name: POST_CASES[i].name, post: nodePost });
      expect({ name: POST_CASES[i].name, errors: Object.entries(empty(errors) as object) }).toEqual({
        name: POST_CASES[i].name,
        errors: Object.entries(nodeErrors),
      });
    });
    expect(out).toHaveLength(POST_CASES.length);
  });

  it('validasi SEO dan kode verifikasi sama', () => {
    const out = php();
    (out.seo as [Record<string, unknown>, unknown][]).forEach(([seo, errors], i) => {
      expect({ name: SEO_CASES[i].name, seo }).toEqual({ name: SEO_CASES[i].name, seo: node.seo[i][0] });
      expect(Object.entries(empty(errors) as object)).toEqual(Object.entries(node.seo[i][1]));
    });
    expect(out.verification).toEqual(node.verification);
  });

  it('status index, slug, waktu, limit, perayap sama', () => {
    const out = php();
    expect(out.index).toEqual(node.index);
    expect(out.slugs).toEqual(node.slugs);
    expect(out.unique).toEqual(node.unique);
    expect(out.cut).toEqual(node.cut);
    expect(out.iso).toEqual(node.iso);
    expect(out.limits).toEqual(node.limits);
    expect(out.bots).toEqual(node.bots);
  });

  it('slug satu huruf: mb_strtolower + tabel SP_FOLD = toLowerCase + NFD untuk semua huruf Latin berdiakritik', () => {
    const out = php();
    const diff = SINGLE_LETTERS.map((t, i) => [t, out.singles[i], node.singles[i]]).filter(([, a, b]) => a !== b);
    expect(diff).toEqual([]);
  });

  it('tabel SP_FOLD sama persis dengan NFD Node (Unicode lengkap)', () => {
    const fold = php().fold as Record<string, string>;
    expect(Object.entries(fold).sort()).toEqual(Object.entries(nodeFoldTable()).sort());
  });

  it('bentuk JSON sama (termasuk baris mysqli berupa teks)', () => {
    const out = php();
    expect(out.summary).toEqual(node.summary);
    expect(out.public).toEqual(node.public);
    expect(out.admin).toEqual(node.admin);
    expect(out.seoOut).toEqual(node.seoOut);
    expect(out.urls).toEqual(node.urls);
    // urutan kunci = urutan tipe di src/types/sitePosts.ts
    expect(Object.keys(out.admin[0])).toEqual(Object.keys(node.admin[0]));
  });

  it('konstanta PHP = src/types/sitePosts.ts', () => {
    const { constants } = php();
    expect(constants.limits).toEqual(TYPE_LIMITS);
    expect(constants.seoLimits).toEqual(TYPE_SEO_LIMITS);
    expect(constants.schemaTypes).toEqual([...SITE_SCHEMA_TYPES]);
    expect(constants.kinds).toEqual([...SITE_POST_KINDS]);
    expect(constants.codes).toEqual([...POST_TEMPLATE_CODES]);
  });
});
