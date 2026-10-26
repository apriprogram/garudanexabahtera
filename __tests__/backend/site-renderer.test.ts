// backend/site.php (docs/platform/SITE-POSTS-SEO-SPEC.md §3, §6): render server domain pembeli.
// - site_handle() dijalankan di PHP CLI dengan database tiruan (fungsi kueri yang disuntikkan): head beranda/daftar/
//   tulisan, preload dengan kunci = apiUrl() klien, robots.txt, sitemap.xml, 301 www/apex & garis miring, 404 path/host
//   tidak dikenal, situs nonaktif, host utama apa adanya, tabel baru belum ada, database mati, dan teks berbahaya.
//   Head di HTML server dibandingkan dengan buildSiteHead (siteSeo.ts) dari data preload yang sama: itulah yang
//   dihitung klien setelah React dimuat.
// - Struktur aturan domain pembeli di deploy/cpanel/htaccess.
// - Ujung ke ujung: php -S + router yang meniru rewrite .htaccess + docroot sementara + database uji sementara di
//   MariaDB lokal (dibuat lalu dihapus; dilewati bila MySQL tidak ada).
// Semua bagian PHP dilewati bila `php` tidak ada.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiUrl } from '../../src/lib/api';
import { getTemplate } from '../../src/templates';
import { parseSiteRoute, servedRoute } from '../../src/templates/siteRoutes';
import { buildSiteHead, type SiteHeadInput } from '../../src/templates/siteSeo';
import type { SitePostPublic, SitePostSummary, SiteSeoPublic } from '../../src/types/sitePosts';

const ROOT = resolve(__dirname, '..', '..');
const SITE_PHP = join(ROOT, 'backend', 'site.php');
const SEO_PHP = join(ROOT, 'backend', 'seo.php');
const SITE_DEFAULTS = join(ROOT, 'backend', 'modules', 'site_defaults.json');
const SITE_POSTS_PHP = join(ROOT, 'backend', 'modules', 'site_posts.php');
const HTACCESS = readFileSync(join(ROOT, 'deploy', 'cpanel', 'htaccess'), 'utf8').replace(/\r\n/g, '\n');
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo "ok";'], { encoding: 'utf8' }).stdout === 'ok';

// ── Data uji ──

const T = (iso: string) => Math.floor(Date.parse(iso) / 1000);
/** Tanggal WIB dari detik Unix (lastmod sitemap). */
const wibDate = (seconds: number) => new Date((seconds + 7 * 3600) * 1000).toISOString().slice(0, 10);

const CONTENT = {
  brand: { company_name: 'SMA Negeri 1 Contoh', tagline: 'Sekolah unggulan di Contoh', logo: '/assets/sites/7/logo_ab12cd34ef56.png' },
  hero: { subtitle: 'Sekolah negeri dengan program unggulan sains dan bahasa.' },
};
const HOSTILE = {
  brand: { company_name: '"><script>alert(1)</script> & \'Sekolah\'', tagline: '</title><b>x', logo: 'javascript:alert(1)' },
  hero: { subtitle: '<img src=x onerror=alert(1)>   </script>' },
};

const SITES = [
  { id: 7, template_code: 'madani', domain: 'sekolah.test', status: 'active', content: JSON.stringify(CONTENT), updated_ts: T('2026-10-19T10:00:00Z') },
  { id: 8, template_code: 'cakrawala', domain: 'www.smk.test', status: 'active', content: null, updated_ts: T('2026-10-10T10:00:00Z') },
  { id: 9, template_code: 'madani', domain: 'nonaktif.test', status: 'suspended', content: JSON.stringify(CONTENT), updated_ts: T('2026-10-01T10:00:00Z') },
  { id: 10, template_code: 'finova', domain: 'keuangan.test', status: 'active', content: JSON.stringify({ brand: { company_name: 'Koperasi Maju' } }), updated_ts: T('2026-10-02T10:00:00Z') },
  { id: 11, template_code: 'madani', domain: 'bahaya.test', status: 'active', content: JSON.stringify(HOSTILE), updated_ts: T('2026-10-03T10:00:00Z') },
];

const SEO_ROWS = [
  {
    site_id: 7,
    title: '',
    description: '',
    og_image: '/assets/sites/7/seo/seo_aa11bb22cc33.jpg',
    google_verification: 'GoogleToken_1234',
    bing_verification: 'not valid!',
    index_mode: 'auto',
    schema_type: 'HighSchool',
    updated_ts: T('2026-10-24T20:00:00Z'),
  },
  { site_id: 11, title: '', description: '', og_image: null, google_verification: '', bing_verification: '', index_mode: 'index', schema_type: '', updated_ts: T('2026-10-03T10:00:00Z') },
];

/** Baris site_posts seperti dibaca SELECT site.php (waktu = UNIX_TIMESTAMP). */
interface FakePost {
  id: number;
  site_id: number;
  kind: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  badge: string;
  image: string | null;
  image_alt: string;
  link_url: string;
  status: string;
  published_at: string | null;
  updated_ts: number;
  seo_title: string;
  seo_description: string;
  noindex: number;
}
const post = (fields: Partial<FakePost> & Pick<FakePost, 'id' | 'site_id' | 'kind' | 'slug' | 'title' | 'body' | 'published_at' | 'updated_ts'>): FakePost => ({
  excerpt: '',
  category: '',
  badge: '',
  image: null,
  image_alt: '',
  link_url: '',
  seo_title: '',
  seo_description: '',
  noindex: 0,
  status: 'published',
  ...fields,
});
const POSTS = [
  post({
    id: 1,
    site_id: 7,
    kind: 'berita',
    slug: 'juara-olimpiade',
    title: 'Siswa Kami Juara 1 Olimpiade Sains',
    category: 'Prestasi',
    body: 'Paragraf pertama.\nBaris kedua.\n\nParagraf kedua & "kutip".',
    image: '/assets/sites/7/posts/post_0123456789ab.webp',
    image_alt: 'Siswa menerima medali',
    link_url: 'https://drive.example/berkas',
    published_at: '2026-10-20',
    updated_ts: T('2026-10-25T01:30:00Z'),
  }),
  post({ id: 2, site_id: 7, kind: 'berita', slug: 'draf-rahasia', title: 'Draf', body: 'Rahasia', status: 'draft', published_at: null, updated_ts: T('2026-10-26T01:00:00Z') }),
  post({ id: 3, site_id: 7, kind: 'pengumuman', slug: 'libur-semester', title: 'Libur Semester', excerpt: 'Libur 20 Desember.', body: 'Isi', noindex: 1, published_at: '2026-10-21', updated_ts: T('2026-10-21T03:00:00Z') }),
  post({ id: 4, site_id: 7, kind: 'berita', slug: 'kegiatan-pramuka', title: 'Kegiatan Pramuka', excerpt: 'Perkemahan Sabtu–Minggu.', body: 'Isi', published_at: '2026-10-18', updated_ts: T('2026-10-18T03:00:00Z') }),
  post({
    id: 5,
    site_id: 11,
    kind: 'berita',
    slug: 'xss',
    title: '</script><script>alert(2)</script>',
    body: '<img src=x onerror=alert(3)>',
    link_url: 'javascript:alert(4)',
    image: 'javascript:alert(5)',
    published_at: '2026-10-20',
    updated_ts: T('2026-10-20T03:00:00Z'),
  }),
];

/** lastmod beranda sekolah.test: terbaru dari situs, site_seo, dan tulisan terbitnya. */
const HOME_LASTMOD_SECONDS = Math.max(
  SITES[0].updated_ts,
  SEO_ROWS[0].updated_ts,
  ...POSTS.filter((p) => p.site_id === 7 && p.status === 'published').map((p) => p.updated_ts),
);

const SHELL = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Memuat situs…</title>
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />
    <meta name="theme-color" content="#ffffff" />
    <script type="module" crossorigin src="/assets/index-AbCdEf12.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;
const GN_ROBOTS = 'User-agent: *\nAllow: /\nSitemap: https://garudanexa.com/sitemap.xml\n';

/** Aturan domain pembeli di deploy/cpanel/htaccess untuk satu request: query yang diterima site.php. */
function rewrite(host: string, uri: string): Record<string, string> {
  const [path, search = ''] = uri.split('?');
  const rel = path.replace(/^\//, '');
  if (/^(robots\.txt|sitemap\.xml)$/.test(rel)) return { file: rel };
  if (/^llms(-full)?\.txt$/.test(rel)) return { gn404: '1' };
  void host;
  return Object.fromEntries(new URLSearchParams(search));
}

interface PhpResponse {
  status: number;
  headers: string[];
  body: string;
  queries: [string, unknown[]][];
}

const HARNESS = String.raw`<?php
define('GN_SITE_LIBRARY', true);
require getenv('SITE_PHP');
$in = json_decode(stream_get_contents(STDIN), true);
$db = $in['db'];
$defaults = json_decode(file_get_contents(getenv('SITE_DEFAULTS')), true);
$log = [];
$query = function (string $sql, array $params) use ($db, &$log) {
    $log[] = [$sql, $params];
    if (!empty($db['down'])) throw new RuntimeException('MySQL server has gone away', 2006);
    $missing = function (string $table) use ($db) {
        if (in_array($table, $db['missingTables'] ?? [], true)) throw new RuntimeException("Table '$table' doesn't exist", 1146);
    };
    if (strpos($sql, 'FROM template_sites') !== false) {
        $rows = array_values(array_filter($db['sites'], fn($s) => in_array($s['domain'], [$params[0], $params[1]], true)));
        usort($rows, fn($a, $b) => ($b['domain'] === $params[2]) <=> ($a['domain'] === $params[2]));
        return array_slice($rows, 0, 1);
    }
    if (strpos($sql, 'FROM site_seo') !== false) {
        $missing('site_seo');
        return array_values(array_filter($db['seo'], fn($r) => $r['site_id'] === $params[0]));
    }
    if (strpos($sql, 'FROM site_posts') !== false) {
        $missing('site_posts');
        $rows = array_values(array_filter($db['posts'], fn($p) => $p['site_id'] === $params[0] && $p['status'] === 'published'));
        if (strpos($sql, 'slug = ?') !== false) return array_values(array_filter($rows, fn($p) => $p['slug'] === $params[1]));
        if (strpos($sql, 'kind = ?') !== false) $rows = array_values(array_filter($rows, fn($p) => $p['kind'] === $params[1]));
        if (strpos($sql, 'COUNT(*)') !== false) return [['total' => count($rows)]];
        usort($rows, fn($a, $b) => [$b['published_at'], $b['id']] <=> [$a['published_at'], $a['id']]);
        if (strpos($sql, 'LIMIT ?') !== false) $rows = array_slice($rows, 0, $params[2]);
        return $rows;
    }
    throw new RuntimeException('SQL tak terduga: ' . $sql);
};
$out = [];
foreach ($in['requests'] as $req) {
    $log = [];
    $response = site_handle($req + [
        'shell' => $in['shell'],
        'docroot' => $in['docroot'],
        'defaults' => $defaults,
        'mainHosts' => site_main_hosts(SITE_DEFAULT_MAIN_HOSTS),
        'now' => '2026-10-26T01:00:00Z',
    ], $query);
    $response['queries'] = $log;
    $out[] = $response;
}
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

let dir = '';

function runHandle(requests: { host: string; uri: string; query?: Record<string, string> }[], db: Record<string, unknown> = {}): PhpResponse[] {
  const input = {
    db: { sites: SITES, seo: SEO_ROWS, posts: POSTS, ...db },
    requests: requests.map((r) => ({ host: r.host, uri: r.uri, query: r.query ?? rewrite(r.host, r.uri) })),
    shell: SHELL,
    docroot: dir,
  };
  // error_log() site.php (tabel belum ada, database mati) ke berkas, bukan stderr
  const result = spawnSync('php', ['-d', 'display_errors=stderr', '-d', `error_log=${join(dir, 'php-error.log')}`, '-r', HARNESS.replace(/^<\?php\s*/, '')], {
    encoding: 'utf8',
    input: JSON.stringify(input),
    env: { ...process.env, SITE_PHP, SITE_DEFAULTS },
  });
  if (result.status !== 0 || result.stderr) throw new Error(`php: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

const one = (host: string, uri: string, db?: Record<string, unknown>) => runHandle([{ host, uri }], db)[0];
const header = (res: { headers: string[] }, name: string) =>
  res.headers.find((h) => h.toLowerCase().startsWith(`${name.toLowerCase()}:`))?.slice(name.length + 1).trim() ?? null;

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');
interface Preload {
  path: string | null;
  builtAt: string;
  api: Record<string, unknown>;
}
const preloadOf = (html: string): Preload => JSON.parse(parse(html).getElementById('gn-preload')?.textContent ?? 'null');
const metaOf = (doc: Document, selector: string) => doc.head.querySelector(selector)?.getAttribute('content') ?? null;

/** Head yang ditulis server, dibaca kembali dari HTML. */
function serverHead(html: string) {
  const doc = parse(html);
  return {
    title: doc.title,
    description: metaOf(doc, 'meta[name="description"]'),
    robots: metaOf(doc, 'meta[name="robots"]'),
    canonical: doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    siteName: metaOf(doc, 'meta[property="og:site_name"]'),
    ogType: metaOf(doc, 'meta[property="og:type"]'),
    ogImage: metaOf(doc, 'meta[property="og:image"]'),
    twitterCard: metaOf(doc, 'meta[name="twitter:card"]'),
    icon: doc.head.querySelector('link[rel="icon"]')?.getAttribute('href') ?? null,
    jsonLd: JSON.parse(doc.head.querySelector('script[type="application/ld+json"]')?.textContent ?? 'null'),
  };
}

/** Head yang dihitung klien (buildSiteHead) dari data preload halaman yang sama, dengan rute seperti CustomerSite. */
function clientHead(html: string, domain: string, path: string) {
  const { api } = preloadOf(html);
  const site = (api[apiUrl('get_site_public', { domain })] as { site: { id: number; template_code: string; content: SiteHeadInput['content'] } }).site;
  const seo = (api[apiUrl('get_site_seo', { site_id: site.id })] as { seo: SiteSeoPublic }).seo;
  const route = servedRoute(parseSiteRoute(path), getTemplate(site.template_code)?.features?.posts === true);
  const input: SiteHeadInput = { domain, templateCode: site.template_code, content: site.content, seo, route };
  if (route.kind === 'post') {
    const body = api[apiUrl('get_site_post', { site_id: site.id, slug: route.slug })] as { post: SitePostPublic } | undefined;
    input.post = body ? body.post : null;
  }
  if (route.kind === 'list') {
    input.listCount = (api[apiUrl('get_site_posts', { site_id: site.id, kind: route.postKind, limit: 100 })] as { total: number }).total;
  }
  const head = buildSiteHead(input);
  return { ...head, jsonLd: JSON.parse(JSON.stringify(head.jsonLd)) };
}

describe.skipIf(!PHP_AVAILABLE)('backend/site.php: site_handle dengan database tiruan', () => {
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'gn-site-php-'));
    writeFileSync(join(dir, 'robots.txt'), GN_ROBOTS);
    writeFileSync(join(dir, 'llms.txt'), 'Garuda Nexa\n');
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('beranda: 200, satu head lengkap tanpa jejak Garuda Nexa, <main> ber-H1, preload dengan kunci apiUrl()', () => {
    const res = one('sekolah.test', '/');
    expect(res.status).toBe(200);
    expect(header(res, 'Content-Type')).toBe('text/html; charset=utf-8');
    expect(header(res, 'Cache-Control')).toBe('no-cache');
    expect(header(res, 'X-Robots-Tag')).toBeNull();
    const html = res.body;
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).not.toContain('Memuat situs');
    expect(html).not.toMatch(/data-gn|garudanexa\.com|favicon\.(ico|svg)|rel="manifest"|apple-touch-icon/);
    expect(html.indexOf('<title>')).toBeGreaterThan(html.indexOf('name="viewport"'));
    expect(html).toContain('<div id="root"><main id="konten"><h1>SMA Negeri 1 Contoh</h1>');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    // Tautan tulisan yang bisa dirayapi (yang terbit saja, draf tidak)
    expect(html).toContain('<a href="/berita/juara-olimpiade">');
    expect(html).toContain('<a href="/pengumuman/libur-semester">');
    expect(html).not.toContain('draf-rahasia');
    // Kode verifikasi: hanya yang sah, tanpa tanda data-site-seo
    expect(html).toContain('<meta name="google-site-verification" content="GoogleToken_1234">');
    expect(html).not.toContain('msvalidate.01');

    expect(serverHead(html)).toEqual(clientHead(html, 'sekolah.test', '/'));
    const h = serverHead(html);
    expect(h).toMatchObject({ title: 'SMA Negeri 1 Contoh — Sekolah unggulan di Contoh', robots: 'index,follow', canonical: 'https://sekolah.test/' });
    expect(h.ogImage).toBe('https://sekolah.test/assets/sites/7/seo/seo_aa11bb22cc33.jpg');
    expect(h.jsonLd['@graph'][0]['@type']).toBe('HighSchool');

    const preload = preloadOf(html);
    expect(preload.path).toBe('/');
    expect(preload.builtAt).toBe('2026-10-26T01:00:00Z');
    expect(Object.keys(preload.api)).toEqual([
      apiUrl('get_site_public', { domain: 'sekolah.test' }),
      apiUrl('get_site_seo', { site_id: 7 }),
      apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 12 }),
      apiUrl('get_site_posts', { site_id: 7, kind: 'pengumuman', limit: 12 }),
    ]);
    expect(preload.api[apiUrl('get_site_public', { domain: 'sekolah.test' })]).toEqual({
      site: { id: 7, template_code: 'madani', domain: 'sekolah.test', content: CONTENT },
    });
    expect(preload.api[apiUrl('get_site_seo', { site_id: 7 })]).toEqual({
      seo: { title: '', description: '', og_image: '/assets/sites/7/seo/seo_aa11bb22cc33.jpg', schema_type: 'HighSchool', indexable: true },
    });
    const berita = preload.api[apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 12 })] as { posts: SitePostSummary[]; total: number };
    expect(berita.total).toBe(2);
    expect(berita.posts.map((p) => p.slug)).toEqual(['juara-olimpiade', 'kegiatan-pramuka']);
    expect(berita.posts[0]).toEqual({
      id: 1,
      kind: 'berita',
      slug: 'juara-olimpiade',
      title: 'Siswa Kami Juara 1 Olimpiade Sains',
      excerpt: '',
      category: 'Prestasi',
      badge: '',
      image: '/assets/sites/7/posts/post_0123456789ab.webp',
      image_alt: 'Siswa menerima medali',
      link_url: 'https://drive.example/berkas',
      published_at: '2026-10-20',
      updated_at: '2026-10-25T08:30:00+07:00',
    });
    // Preload tidak bisa menutup <script> lebih awal
    const raw = /<script id="gn-preload" type="application\/json">([\s\S]*?)<\/script>/.exec(html)![1];
    expect(raw).not.toContain('<');
  });

  it('daftar berita: 200 index, H1, tautan tiap tulisan; daftar kosong: noindex; preload limit 100', () => {
    const [list, empty] = runHandle([
      { host: 'sekolah.test', uri: '/berita' },
      { host: 'sekolah.test', uri: '/pengumuman?utm_source=wa' },
    ]);
    expect(list.status).toBe(200);
    expect(serverHead(list.body)).toEqual(clientHead(list.body, 'sekolah.test', '/berita'));
    expect(serverHead(list.body)).toMatchObject({ title: 'Berita · SMA Negeri 1 Contoh', robots: 'index,follow', canonical: 'https://sekolah.test/berita' });
    expect(list.body).toContain('<h1>Berita</h1>');
    expect(list.body).toContain('<a href="/berita/kegiatan-pramuka">Kegiatan Pramuka</a> <time datetime="2026-10-18">18 Oktober 2026</time>');
    // Kunci preload = permintaan useSitePages di rute daftar: daftar ini (limit 100) + daftar beranda jenis lain (menu/footer)
    expect(Object.keys(preloadOf(list.body).api)).toEqual([
      apiUrl('get_site_public', { domain: 'sekolah.test' }),
      apiUrl('get_site_seo', { site_id: 7 }),
      apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 100 }),
      apiUrl('get_site_posts', { site_id: 7, kind: 'pengumuman', limit: 12 }),
    ]);
    // Pengumuman: satu-satunya terbit ber-noindex tetap ada di daftar; robots daftar mengikuti jumlah tulisan terbit
    expect(empty.status).toBe(200);
    expect(serverHead(empty.body)).toEqual(clientHead(empty.body, 'sekolah.test', '/pengumuman'));
    expect(serverHead(empty.body).canonical).toBe('https://sekolah.test/pengumuman');
  });

  it('tulisan: 200, article ber-H1, tanggal, foto, paragraf, tautan aman; head = buildSiteHead dari preload', () => {
    const res = one('sekolah.test', '/berita/juara-olimpiade');
    expect(res.status).toBe(200);
    const html = res.body;
    expect(serverHead(html)).toEqual(clientHead(html, 'sekolah.test', '/berita/juara-olimpiade'));
    const h = serverHead(html);
    expect(h).toMatchObject({ robots: 'index,follow', ogType: 'article', canonical: 'https://sekolah.test/berita/juara-olimpiade' });
    expect(h.jsonLd['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual(['HighSchool', 'WebSite', 'NewsArticle', 'BreadcrumbList']);
    expect(html).toContain('<article><h1>Siswa Kami Juara 1 Olimpiade Sains</h1><p><time datetime="2026-10-20">20 Oktober 2026</time></p>');
    expect(html).toContain('<img src="/assets/sites/7/posts/post_0123456789ab.webp" alt="Siswa menerima medali">');
    expect(html).toContain('<p>Paragraf pertama.<br>\nBaris kedua.</p><p>Paragraf kedua &amp; &quot;kutip&quot;.</p>');
    expect(html).toContain('<a href="https://drive.example/berkas" rel="noopener">Buka tautan</a>');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    const preload = preloadOf(html);
    expect(preload.path).toBe('/berita/juara-olimpiade');
    // Kunci preload = permintaan useSitePages di rute tulisan: tulisan + daftar beranda kedua jenis (menu/footer, "tulisan lainnya")
    expect(Object.keys(preload.api)).toEqual([
      apiUrl('get_site_public', { domain: 'sekolah.test' }),
      apiUrl('get_site_seo', { site_id: 7 }),
      apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 12 }),
      apiUrl('get_site_posts', { site_id: 7, kind: 'pengumuman', limit: 12 }),
      apiUrl('get_site_post', { site_id: 7, slug: 'juara-olimpiade' }),
    ]);
    expect((preload.api[apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 12 })] as { total: number }).total).toBe(2);
    expect((preload.api[apiUrl('get_site_post', { site_id: 7, slug: 'juara-olimpiade' })] as { post: SitePostPublic }).post).toMatchObject({
      body: 'Paragraf pertama.\nBaris kedua.\n\nParagraf kedua & "kutip".',
      seo_title: '',
      seo_description: '',
      noindex: false,
    });
    // Pengumuman ber-noindex: halaman tetap 200, robots noindex
    const noindex = one('sekolah.test', '/pengumuman/libur-semester');
    expect(noindex.status).toBe(200);
    expect(serverHead(noindex.body).robots).toBe('noindex,follow');
    expect(serverHead(noindex.body)).toEqual(clientHead(noindex.body, 'sekolah.test', '/pengumuman/libur-semester'));
  });

  it('404 + X-Robots-Tag noindex: draf, jenis salah, slug tidak sah, path tak dikenal (dengan head situs & preload)', () => {
    // Termasuk REQUEST_URI yang bukan path ASCII sah (spasi, byte mentah): 404, bukan beranda
    const uris = ['/berita/draf-rahasia', '/pengumuman/juara-olimpiade', '/berita/Juara', '/tentang', '/berita/a/b', '/agenda', '/berita/juara olimpiade', '/berita/é', 'berita'];
    const responses = runHandle(uris.map((uri) => ({ host: 'sekolah.test', uri })));
    responses.forEach((res, i) => {
      expect(res.status, uris[i]).toBe(404);
      expect(header(res, 'X-Robots-Tag'), uris[i]).toBe('noindex');
      const h = serverHead(res.body);
      expect(h.robots, uris[i]).toBe('noindex,follow');
      expect(h.canonical, uris[i]).toBeNull();
      expect(h.title, uris[i]).toBe('Halaman tidak ditemukan · SMA Negeri 1 Contoh');
      expect(res.body, uris[i]).toContain('<h1>Halaman tidak ditemukan</h1>');
      expect(preloadOf(res.body).path, uris[i]).toBeNull();
    });
    // Draf tidak pernah bocor
    expect(responses[0].body).not.toContain('Rahasia');
    expect(serverHead(responses[1].body)).toEqual(clientHead(responses[1].body, 'sekolah.test', '/pengumuman/juara-olimpiade'));
  });

  it('301: varian www/apex ke domain tersimpan (path & query ikut), garis miring di akhir, /index.html', () => {
    const cases: [string, string, string][] = [
      ['www.sekolah.test', '/berita/juara-olimpiade?x=1', 'https://sekolah.test/berita/juara-olimpiade?x=1'],
      ['WWW.Sekolah.Test:443', '/', 'https://sekolah.test/'],
      ['smk.test', '/robots.txt', 'https://www.smk.test/robots.txt'],
      ['sekolah.test', '/berita/', 'https://sekolah.test/berita'],
      ['sekolah.test', '/berita/juara-olimpiade/?a=b', 'https://sekolah.test/berita/juara-olimpiade?a=b'],
      ['sekolah.test', '/index.html', 'https://sekolah.test/'],
      ['sekolah.test', '/index.html?utm=1', 'https://sekolah.test/?utm=1'],
      // Path tidak sah tidak pernah ditulis ke header Location
      ['www.sekolah.test', '/a b\r\nSet-Cookie: x=1', 'https://sekolah.test/'],
    ];
    const responses = runHandle(cases.map(([host, uri]) => ({ host, uri })));
    responses.forEach((res, i) => {
      expect(res.status, cases[i].join(' ')).toBe(301);
      expect(header(res, 'Location'), cases[i].join(' ')).toBe(cases[i][2]);
      expect(res.body).toBe('');
    });
    // Garis miring di akhir path yang tidak dikenal: langsung 404, tanpa lompatan
    expect(one('sekolah.test', '/tentang/').status).toBe(404);
    // Host dengan titik di akhir = host yang sama
    expect(one('sekolah.test.', '/').status).toBe(200);
  });

  it('robots.txt per domain (juga situs nonaktif), 404 untuk host tak dikenal; llms*.txt 404', () => {
    const [robots, suspended, unknown, llms, full] = runHandle([
      { host: 'sekolah.test', uri: '/robots.txt' },
      { host: 'nonaktif.test', uri: '/robots.txt' },
      { host: 'tidak-dikenal.test', uri: '/robots.txt' },
      { host: 'sekolah.test', uri: '/llms.txt' },
      { host: 'sekolah.test', uri: '/llms-full.txt' },
    ]);
    expect(robots.status).toBe(200);
    expect(header(robots, 'Content-Type')).toBe('text/plain; charset=utf-8');
    expect(robots.body).toBe(
      [
        'User-agent: *',
        'Allow: /',
        'Allow: /api.php?action=get_site_public&',
        'Allow: /api.php?action=get_site_seo&',
        'Allow: /api.php?action=get_site_posts&',
        'Allow: /api.php?action=get_site_post&',
        'Disallow: /api.php',
        'Sitemap: https://sekolah.test/sitemap.xml',
        '',
      ].join('\n'),
    );
    // Allow mencakup URL preload yang dipanggil klien
    for (const url of [apiUrl('get_site_public', { domain: 'sekolah.test' }), apiUrl('get_site_post', { site_id: 7, slug: 'x' })]) {
      expect(robots.body.split('\n').some((line) => line.startsWith('Allow: /api.php') && url.startsWith(line.slice(7)))).toBe(true);
    }
    expect(suspended.status).toBe(200);
    expect(suspended.body).toContain('Allow: /\n');
    expect(suspended.body).toContain('Sitemap: https://nonaktif.test/sitemap.xml');
    for (const res of [unknown, llms, full]) {
      expect(res.status).toBe(404);
      expect(header(res, 'X-Robots-Tag')).toBe('noindex');
    }
    expect(llms.body).not.toContain('Garuda Nexa');
  });

  it('sitemap.xml: beranda, daftar yang berisi, tulisan terbit tanpa noindex (dengan foto); kosong bila tidak indexable', () => {
    const [sitemap, defaults, suspended] = runHandle([
      { host: 'sekolah.test', uri: '/sitemap.xml' },
      { host: 'www.smk.test', uri: '/sitemap.xml' },
      { host: 'nonaktif.test', uri: '/sitemap.xml' },
    ]);
    expect(sitemap.status).toBe(200);
    expect(header(sitemap, 'Content-Type')).toBe('application/xml; charset=utf-8');
    expect(header(sitemap, 'Cache-Control')).toBe('no-cache');
    const latest = HOME_LASTMOD_SECONDS;
    expect(sitemap.body).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        '  <url>',
        '    <loc>https://sekolah.test/</loc>',
        `    <lastmod>${wibDate(latest)}</lastmod>`,
        '  </url>',
        '  <url>',
        '    <loc>https://sekolah.test/berita</loc>',
        `    <lastmod>${wibDate(POSTS[0].updated_ts)}</lastmod>`,
        '  </url>',
        '  <url>',
        '    <loc>https://sekolah.test/pengumuman</loc>',
        `    <lastmod>${wibDate(POSTS[2].updated_ts)}</lastmod>`,
        '  </url>',
        '  <url>',
        '    <loc>https://sekolah.test/berita/juara-olimpiade</loc>',
        `    <lastmod>${wibDate(POSTS[0].updated_ts)}</lastmod>`,
        '    <image:image>',
        '      <image:loc>https://sekolah.test/assets/sites/7/posts/post_0123456789ab.webp</image:loc>',
        '    </image:image>',
        '  </url>',
        '  <url>',
        '    <loc>https://sekolah.test/berita/kegiatan-pramuka</loc>',
        `    <lastmod>${wibDate(POSTS[3].updated_ts)}</lastmod>`,
        '  </url>',
        '</urlset>',
        '',
      ].join('\n'),
    );
    const empty = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
      '</urlset>',
      '',
    ].join('\n');
    // Konten bawaan template (index_mode auto) dan situs nonaktif: urlset kosong, tulisan tidak dibaca
    expect(defaults.body).toBe(empty);
    expect(suspended.body).toBe(empty);
    expect(suspended.queries.some(([sql]) => sql.includes('site_posts'))).toBe(false);
  });

  it('host tidak dikenal dan situs nonaktif: 404 noindex dengan cangkang aplikasi, tanpa data situs', () => {
    for (const host of ['tidak-dikenal.test', 'nonaktif.test']) {
      const res = one(host, '/');
      expect(res.status, host).toBe(404);
      expect(header(res, 'X-Robots-Tag'), host).toBe('noindex');
      expect(res.body, host).toContain('<title>Situs tidak ditemukan</title>');
      expect(res.body, host).toContain('<meta name="robots" content="noindex" data-site-seo="robots">');
      expect(res.body, host).toContain('/assets/index-AbCdEf12.js');
      expect(res.body, host).not.toContain('gn-preload');
      expect(res.body, host).not.toContain('SMA Negeri 1 Contoh');
    }
    // Host tidak sah tidak pernah sampai ke database
    for (const host of ['', 'evil.test/x', 'a b.test', 'sekolah.test:abc']) {
      const res = one(host, '/');
      expect(res.status, host).toBe(404);
      expect(res.queries, host).toEqual([]);
    }
  });

  it('host utama (MAIN_HOSTS, IP): index.html dan file statis apa adanya, tanpa database', () => {
    const responses = runHandle([
      { host: 'garudanexabahtera.web.id', uri: '/' },
      { host: 'localhost:5173', uri: '/akun' },
      { host: '192.168.1.5', uri: '/berita/x' },
      { host: 'www.garudanexa.com', uri: '/' },
      { host: 'garudanexabahtera.web.id', uri: '/robots.txt' },
      { host: 'garudanexabahtera.web.id', uri: '/llms.txt' },
      { host: 'garudanexabahtera.web.id', uri: '/sitemap.xml' },
    ]);
    for (const res of responses.slice(0, 4)) {
      expect(res.status).toBe(200);
      expect(res.body).toBe(SHELL);
    }
    expect(responses[4].body).toBe(GN_ROBOTS);
    expect(header(responses[4], 'Content-Type')).toBe('text/plain; charset=utf-8');
    expect(responses[5].body).toBe('Garuda Nexa\n');
    expect(responses[6].status).toBe(404);
    for (const res of responses) expect(res.queries).toEqual([]);
  });

  it('akses langsung ke /site.php: 404 tanpa database; "/?file=robots.txt" tetap beranda', () => {
    for (const uri of ['/site.php', '//site.php', '/site%2Ephp', '/SITE.php?x=1', '/site.php/berita']) {
      const res = runHandle([{ host: 'sekolah.test', uri, query: { file: 'robots.txt' } }])[0];
      expect(res.status, uri).toBe(404);
      expect(res.queries, uri).toEqual([]);
    }
    const home = runHandle([{ host: 'sekolah.test', uri: '/?file=robots.txt', query: { file: 'robots.txt' } }])[0];
    expect(home.status).toBe(200);
    expect(header(home, 'Content-Type')).toBe('text/html; charset=utf-8');
  });

  it('template tanpa fitur tulisan: /berita, /pengumuman, /berita/{slug} 404 noindex (sama dengan klien) tanpa membaca site_posts', () => {
    const [list, announcements, item, slash, homePage] = runHandle([
      { host: 'keuangan.test', uri: '/berita' },
      { host: 'keuangan.test', uri: '/pengumuman' },
      { host: 'keuangan.test', uri: '/berita/apa-saja' },
      { host: 'keuangan.test', uri: '/berita/' },
      { host: 'keuangan.test', uri: '/' },
    ]);
    const paths = ['/berita', '/pengumuman', '/berita/apa-saja'];
    [list, announcements, item].forEach((res, i) => {
      expect(res.status, paths[i]).toBe(404);
      expect(header(res, 'X-Robots-Tag'), paths[i]).toBe('noindex');
      const h = serverHead(res.body);
      expect(h, paths[i]).toMatchObject({ title: 'Halaman tidak ditemukan · Koperasi Maju', robots: 'noindex,follow', canonical: null });
      // Klien (CustomerSite: servedRoute → notfound) menghitung head yang sama
      expect(h, paths[i]).toEqual(clientHead(res.body, 'keuangan.test', paths[i]));
      expect(res.body, paths[i]).toContain('<h1>Halaman tidak ditemukan</h1>');
      expect(preloadOf(res.body).path, paths[i]).toBeNull();
    });
    // Garis miring di akhir tetap dialihkan dulu (sama dengan klien), lalu 404
    expect(slash.status).toBe(301);
    expect(header(slash, 'Location')).toBe('https://keuangan.test/berita');
    expect(serverHead(homePage.body)).toEqual(clientHead(homePage.body, 'keuangan.test', '/'));
    expect(serverHead(homePage.body).jsonLd['@graph'][0]['@type']).toBe('Organization');
    expect(preloadOf(homePage.body).api[apiUrl('get_site_posts', { site_id: 10, kind: 'berita', limit: 12 })]).toEqual({ posts: [], total: 0 });
    for (const res of [list, announcements, item, homePage]) expect(res.queries.some(([sql]) => sql.includes('site_posts'))).toBe(false);
  });

  it('tabel baru belum ada (migrasi 029 belum dijalankan): halaman tetap 200 dengan bawaan; database mati: 503', () => {
    const res = one('sekolah.test', '/', { missingTables: ['site_seo', 'site_posts'] });
    expect(res.status).toBe(200);
    expect(serverHead(res.body)).toEqual(clientHead(res.body, 'sekolah.test', '/'));
    expect(preloadOf(res.body).api[apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 12 })]).toEqual({ posts: [], total: 0 });
    const down = one('sekolah.test', '/', { down: true });
    expect(down.status).toBe(503);
    expect(header(down, 'Retry-After')).toBe('300');
    expect(down.body).not.toMatch(/MySQL|gone away/);
  });

  it('teks berbahaya dari konten & tulisan di-escape di head, <main>, JSON-LD dan preload', () => {
    for (const uri of ['/', '/berita/xss']) {
      const res = one('bahaya.test', uri);
      expect(res.status, uri).toBe(200);
      const html = res.body;
      // Di luar data preload (JSON, "<" di-escape): tidak ada markup atau URL berbahaya dari pembeli
      expect(html.replace(/<script id="gn-preload"[\s\S]*?<\/script>/, ''), uri).not.toMatch(/<script>alert|<img src=x|<\/title><b>|javascript:/);
      // Hanya skrip milik cangkang + JSON-LD + preload
      expect(html.match(/<script[\s>]/g), uri).toHaveLength(3);
      for (const [, json] of html.matchAll(/<script (?:type="application\/ld\+json" data-site-seo="jsonld"|id="gn-preload" type="application\/json")>([\s\S]*?)<\/script>/g)) {
        expect(json, uri).not.toContain('<');
        expect(() => JSON.parse(json), uri).not.toThrow();
      }
      expect(serverHead(html), uri).toEqual(clientHead(html, 'bahaya.test', uri));
    }
    const article = one('bahaya.test', '/berita/xss').body;
    expect(article).toContain('<h1>&lt;/script&gt;&lt;script&gt;alert(2)&lt;/script&gt;</h1>');
    expect(article).toContain('<p>&lt;img src=x onerror=alert(3)&gt;</p>');
    expect(article).not.toContain('Buka tautan');
  });
});

// ── Kesamaan data preload dengan jawaban API (modules/site_posts.php, ditulis paralel) ──

const SP_HARNESS = String.raw`<?php
define('GN_SITE_LIBRARY', true);
require getenv('SITE_PHP');
require getenv('SITE_POSTS_PHP');
$in = json_decode(stream_get_contents(STDIN), true);
$out = [];
foreach ($in['posts'] as $row) $out[] = [site_post_public_out($row), sp_public_out($row)];
foreach ($in['seo'] as [$row, $status, $content, $code]) {
    $defaults = site_defaults_of(json_decode(file_get_contents(getenv('SITE_DEFAULTS')), true), $code);
    $mine = site_seo_public($row, $status, site_parse_content($content), $defaults);
    $theirs = sp_seo_public_out($row, sp_index_reasons($status, $row['index_mode'] ?? 'auto', $content, sp_default_name($code)) === []);
    $out[] = [$mine, $theirs];
}
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

const SITE_POSTS_READY =
  PHP_AVAILABLE &&
  spawnSync('php', ['-r', `require ${JSON.stringify(SITE_POSTS_PHP)}; echo function_exists('sp_public_out') && function_exists('sp_seo_public_out') && function_exists('sp_index_reasons') && function_exists('sp_default_name') ? 'ok' : 'no';`], {
    encoding: 'utf8',
  }).stdout === 'ok';

describe.skipIf(!SITE_POSTS_READY)('preload site.php = bentuk jawaban modules/site_posts.php', () => {
  it('tulisan dan SEO publik dari baris yang sama', () => {
    const seoCases = [
      [SEO_ROWS[0], 'active', SITES[0].content, 'madani'],
      [null, 'active', null, 'madani'],
      [{ ...SEO_ROWS[0], index_mode: 'noindex' }, 'active', SITES[0].content, 'madani'],
      [{ ...SEO_ROWS[0], index_mode: 'index' }, 'active', null, 'cakrawala'],
      [SEO_ROWS[0], 'suspended', SITES[0].content, 'madani'],
      [null, 'active', JSON.stringify({ brand: { company_name: 'SMA IT Nurul Azka' } }), 'madani'],
    ];
    const rows = POSTS.map((p) => ({ ...p, updated_ts: String(p.updated_ts), id: String(p.id), noindex: String(p.noindex) }));
    const result = spawnSync('php', ['-d', 'display_errors=stderr', '-r', SP_HARNESS.replace(/^<\?php\s*/, '')], {
      encoding: 'utf8',
      input: JSON.stringify({ posts: rows, seo: seoCases }),
      env: { ...process.env, SITE_PHP, SITE_POSTS_PHP, SITE_DEFAULTS },
    });
    expect(result.stderr).toBe('');
    for (const [mine, theirs] of JSON.parse(result.stdout)) expect(mine).toEqual(theirs);
  });
});

// ── deploy/cpanel/htaccess ──

describe('deploy/cpanel/htaccess: domain pembeli lewat site.php', () => {
  const HOST = 'RewriteCond %{HTTP_HOST} !^garudanexa\\.com$ [NC]';
  const RULES = [
    'RewriteRule ^(robots\\.txt|sitemap\\.xml)$ site.php?file=$1 [L]',
    'RewriteRule ^llms(-full)?\\.txt$ site.php?gn404=1 [L]',
    'RewriteRule ^$ site.php [L]',
    'RewriteRule ^index\\.html$ site.php [L]',
    'RewriteRule ^ site.php [L]',
  ];
  const lines = HTACCESS.split('\n').map((line) => line.trim());

  it('setiap aturan dibatasi host selain garudanexa.com, urut, dan sebelum 404 host utama', () => {
    const at = RULES.map((rule) => lines.indexOf(rule));
    for (const [i, index] of at.entries()) {
      expect(index, RULES[i]).toBeGreaterThan(-1);
      // Kondisi host tepat sebelum aturan (catch-all: sebelum kedua cek -f/-d)
      const conditions = [];
      for (let j = index - 1; lines[j].startsWith('RewriteCond'); j -= 1) conditions.unshift(lines[j]);
      expect(conditions[0], RULES[i]).toBe(HOST);
    }
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    const catchAll = at[at.length - 1];
    expect(lines.slice(catchAll - 3, catchAll)).toEqual([HOST, 'RewriteCond %{REQUEST_FILENAME} !-f', 'RewriteCond %{REQUEST_FILENAME} !-d']);
    expect(at[0]).toBeGreaterThan(lines.indexOf('RewriteRule ^(akun|admin|pesan|demo|situs|masuk|daftar|login|auth)(/.*)?$ app.html [L]'));
    expect(catchAll).toBeLessThan(lines.indexOf('RewriteRule ^ seo.php?gn404=1 [L]'));
    // Aturan lama (cangkang statis tanpa head) sudah tidak ada; aturan host utama tidak berubah
    expect(lines).not.toContain('RewriteRule ^ index.html [L]');
    expect(lines.filter((line) => line.includes('site.php') && !line.startsWith('#'))).toHaveLength(RULES.length);
  });

  it('robots.txt/sitemap.xml tanpa cek -f (file statis Garuda Nexa memang ada) dan tanpa QSA', () => {
    const index = lines.indexOf(RULES[0]);
    expect(lines[index - 1]).toBe(HOST);
    expect(lines[index - 2]).not.toMatch(/^RewriteCond/);
    for (const rule of RULES) expect(rule).not.toMatch(/QSA/);
  });
});

// ── Ujung ke ujung: php -S + router .htaccess + MariaDB sementara ──

const MYSQL = { host: process.env.SITE_TEST_MYSQL_HOST ?? '127.0.0.1', user: process.env.SITE_TEST_MYSQL_USER ?? 'root', pass: process.env.SITE_TEST_MYSQL_PASS ?? '' };
const MYSQL_PHP = `mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT); $c = new mysqli(getenv('H'), getenv('U'), getenv('P'));`;
const mysqlEnv = { ...process.env, H: MYSQL.host, U: MYSQL.user, P: MYSQL.pass };
const MYSQL_AVAILABLE =
  PHP_AVAILABLE && spawnSync('php', ['-r', `try { ${MYSQL_PHP} echo 'ok'; } catch (Throwable $e) {}`], { encoding: 'utf8', env: mysqlEnv }).stdout === 'ok';

/** Skema tabel sesuai database/schema.sql (template_sites) dan spec §2 (site_posts, site_seo). */
const DDL = `
CREATE TABLE template_sites (
  id INT NOT NULL AUTO_INCREMENT, order_id INT NOT NULL, user_id INT NOT NULL, template_id INT DEFAULT NULL,
  template_code VARCHAR(60) NOT NULL, domain VARCHAR(253) NOT NULL, status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  content MEDIUMTEXT DEFAULT NULL, activated_at DATETIME DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_sites_order (order_id), UNIQUE KEY uq_sites_domain (domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE site_posts (
  id INT NOT NULL AUTO_INCREMENT, site_id INT NOT NULL, kind VARCHAR(12) NOT NULL, slug VARCHAR(120) NOT NULL,
  title VARCHAR(160) NOT NULL, excerpt VARCHAR(300) NOT NULL DEFAULT '', body MEDIUMTEXT NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT '', badge VARCHAR(20) NOT NULL DEFAULT '', image VARCHAR(500) DEFAULT NULL,
  image_alt VARCHAR(200) NOT NULL DEFAULT '', link_url VARCHAR(500) NOT NULL DEFAULT '', status VARCHAR(12) NOT NULL DEFAULT 'draft',
  published_at DATE DEFAULT NULL, seo_title VARCHAR(70) NOT NULL DEFAULT '', seo_description VARCHAR(160) NOT NULL DEFAULT '',
  noindex TINYINT(1) NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_site_posts_slug (site_id, slug), KEY idx_site_posts_list (site_id, kind, status, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE site_seo (
  site_id INT NOT NULL, title VARCHAR(70) NOT NULL DEFAULT '', description VARCHAR(160) NOT NULL DEFAULT '',
  og_image VARCHAR(500) DEFAULT NULL, google_verification VARCHAR(100) NOT NULL DEFAULT '', bing_verification VARCHAR(100) NOT NULL DEFAULT '',
  index_mode VARCHAR(10) NOT NULL DEFAULT 'auto', schema_type VARCHAR(40) NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const sql = (value: unknown) =>
  value === null || value === undefined ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;

function seedSql(): string {
  const rows: string[] = [];
  for (const s of SITES) {
    rows.push(
      `INSERT INTO template_sites (id, order_id, user_id, template_code, domain, status, content, updated_at) VALUES (${s.id}, ${s.id}, 1, ${sql(s.template_code)}, ${sql(s.domain)}, ${sql(s.status)}, ${sql(s.content)}, FROM_UNIXTIME(${s.updated_ts}));`,
    );
  }
  for (const r of SEO_ROWS) {
    rows.push(
      `INSERT INTO site_seo (site_id, title, description, og_image, google_verification, bing_verification, index_mode, schema_type, updated_at) VALUES (${r.site_id}, ${sql(r.title)}, ${sql(r.description)}, ${sql(r.og_image)}, ${sql(r.google_verification)}, ${sql(r.bing_verification)}, ${sql(r.index_mode)}, ${sql(r.schema_type)}, FROM_UNIXTIME(${r.updated_ts}));`,
    );
  }
  for (const p of POSTS) {
    const cols = ['id', 'site_id', 'kind', 'slug', 'title', 'excerpt', 'body', 'category', 'badge', 'image', 'image_alt', 'link_url', 'status', 'published_at', 'seo_title', 'seo_description', 'noindex'] as const;
    rows.push(
      `INSERT INTO site_posts (${cols.join(', ')}, updated_at) VALUES (${cols.map((c) => sql(p[c])).join(', ')}, FROM_UNIXTIME(${p.updated_ts}));`,
    );
  }
  return rows.join('\n');
}

const ROUTER = String.raw`<?php
// Meniru aturan domain pembeli di deploy/cpanel/htaccess untuk php -S (docroot = folder ini)
$path = rawurldecode((string)parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$rel = ltrim($path, '/');
$host = strtolower((string)preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
$file = __DIR__ . '/' . $rel;
if ($host !== 'garudanexa.com') {
    if (preg_match('/^(robots\.txt|sitemap\.xml)$/', $rel, $m)) { $_GET = ['file' => $m[1]]; require __DIR__ . '/site.php'; return true; }
    if (preg_match('/^llms(-full)?\.txt$/', $rel)) { $_GET = ['gn404' => '1']; require __DIR__ . '/site.php'; return true; }
    if ($rel === '' || $rel === 'index.html' || (!is_file($file) && !is_dir($file))) { require __DIR__ . '/site.php'; return true; }
}
if (substr($rel, -4) === '.php' && is_file($file)) { require $file; return true; }
return false;
`;

interface HttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

function httpGet(port: number, host: string, path: string): Promise<HttpResponse> {
  return new Promise((done, fail) => {
    const req = request({ host: '127.0.0.1', port, path, method: 'GET', headers: { Host: host }, agent: false }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => done({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on('error', fail);
    req.end();
  });
}

const freePort = () =>
  new Promise<number>((done) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => done(port));
    });
  });

describe.skipIf(!MYSQL_AVAILABLE)('backend/site.php ujung ke ujung (php -S + router .htaccess + MariaDB sementara)', () => {
  const database = `gn_site_test_${process.pid}_${Date.now().toString(36)}`;
  let docroot = '';
  let server: ChildProcess | null = null;
  let port = 0;

  beforeAll(async () => {
    const setup = spawnSync(
      'php',
      ['-r', `${MYSQL_PHP} $db = getenv('DB'); $c->query("CREATE DATABASE \`$db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"); $c->select_db($db); $c->set_charset('utf8mb4'); $c->multi_query(stream_get_contents(STDIN)); do { if ($r = $c->store_result()) $r->free(); } while ($c->more_results() && $c->next_result()); if ($c->errno) { fwrite(STDERR, $c->error); exit(1); }`],
      { encoding: 'utf8', input: DDL + seedSql(), env: { ...mysqlEnv, DB: database } },
    );
    if (setup.status !== 0) throw new Error(`setup MySQL: ${setup.stderr}`);

    docroot = mkdtempSync(join(tmpdir(), 'gn-site-root-'));
    copyFileSync(SITE_PHP, join(docroot, 'site.php'));
    copyFileSync(SEO_PHP, join(docroot, 'seo.php'));
    mkdirSync(join(docroot, 'modules'));
    copyFileSync(SITE_DEFAULTS, join(docroot, 'modules', 'site_defaults.json'));
    writeFileSync(join(docroot, 'index.html'), SHELL);
    writeFileSync(join(docroot, 'robots.txt'), GN_ROBOTS);
    writeFileSync(join(docroot, 'router.php'), ROUTER);

    port = await freePort();
    server = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', docroot, join(docroot, 'router.php')], {
      cwd: docroot,
      env: { ...process.env, MYSQL_HOST: MYSQL.host, MYSQL_USER: MYSQL.user, MYSQL_PASS: MYSQL.pass, MYSQL_DB: database, MAIN_HOSTS: '' },
      stdio: 'ignore',
    });
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        await httpGet(port, 'localhost', '/');
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error('php -S tidak menjawab');
  }, 30_000);

  afterAll(() => {
    server?.kill();
    spawnSync('php', ['-r', `${MYSQL_PHP} $c->query("DROP DATABASE IF EXISTS \`" . getenv('DB') . "\`");`], { env: { ...mysqlEnv, DB: database } });
    if (docroot) rmSync(docroot, { recursive: true, force: true });
  });

  it('halaman, 301, 404, robots, sitemap dan host utama lewat HTTP sungguhan', async () => {
    const home = await httpGet(port, 'sekolah.test', '/');
    expect(home.status).toBe(200);
    expect(home.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(serverHead(home.body)).toEqual(clientHead(home.body, 'sekolah.test', '/'));
    expect(serverHead(home.body).robots).toBe('index,follow');
    const berita = preloadOf(home.body).api[apiUrl('get_site_posts', { site_id: 7, kind: 'berita', limit: 12 })] as { posts: SitePostSummary[]; total: number };
    expect(berita).toMatchObject({ total: 2 });
    expect(berita.posts[0]).toMatchObject({ slug: 'juara-olimpiade', published_at: '2026-10-20', updated_at: '2026-10-25T08:30:00+07:00' });

    const article = await httpGet(port, 'sekolah.test', '/berita/juara-olimpiade');
    expect(article.status).toBe(200);
    expect(serverHead(article.body)).toEqual(clientHead(article.body, 'sekolah.test', '/berita/juara-olimpiade'));

    const www = await httpGet(port, 'www.sekolah.test', '/berita?x=1');
    expect(www.status).toBe(301);
    expect(www.headers.location).toBe('https://sekolah.test/berita?x=1');
    const slash = await httpGet(port, 'sekolah.test', '/berita/');
    expect(slash.status).toBe(301);
    expect(slash.headers.location).toBe('https://sekolah.test/berita');

    for (const [host, path] of [
      ['sekolah.test', '/tidak-ada'],
      ['sekolah.test', '/berita/draf-rahasia'],
      ['sekolah.test', '/site.php'],
      ['sekolah.test', '/llms.txt'],
      ['tidak-dikenal.test', '/'],
      ['nonaktif.test', '/'],
    ]) {
      const res = await httpGet(port, host, path);
      expect(res.status, `${host}${path}`).toBe(404);
      expect(res.headers['x-robots-tag'], `${host}${path}`).toBe('noindex');
    }

    const robots = await httpGet(port, 'sekolah.test', '/robots.txt');
    expect(robots.status).toBe(200);
    expect(robots.body).toContain('Sitemap: https://sekolah.test/sitemap.xml');
    const sitemap = await httpGet(port, 'sekolah.test', '/sitemap.xml');
    expect(sitemap.headers['content-type']).toBe('application/xml; charset=utf-8');
    expect([...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])).toEqual([
      'https://sekolah.test/',
      'https://sekolah.test/berita',
      'https://sekolah.test/pengumuman',
      'https://sekolah.test/berita/juara-olimpiade',
      'https://sekolah.test/berita/kegiatan-pramuka',
    ]);
    expect(sitemap.body).toContain(`<loc>https://sekolah.test/</loc>
    <lastmod>${wibDate(HOME_LASTMOD_SECONDS)}</lastmod>`);

    // MAIN_HOSTS kosong di env = daftar bawaan: localhost tetap aplikasi utama
    const main = await httpGet(port, 'localhost', '/');
    expect(main.status).toBe(200);
    expect(main.body).toBe(SHELL);
    const staticRobots = await httpGet(port, 'localhost', '/robots.txt');
    expect(staticRobots.body).toBe(GN_ROBOTS);
  }, 30_000);
});
