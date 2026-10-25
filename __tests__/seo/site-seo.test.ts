// Kepala halaman situs pembeli (docs/platform/SITE-POSTS-SEO-SPEC.md §5): buildSiteHead (src/templates/siteSeo.ts) dan
// site_build_head (backend/site.php) harus menghasilkan head yang SAMA untuk masukan yang sama, supaya Google tidak
// melihat dua versi (HTML server lalu DOM setelah React). Tes ini:
// - memeriksa aturannya langsung (judul, deskripsi, robots, canonical, og:image, JSON-LD);
// - menjalankan fungsi PHP di PHP CLI dengan masukan yang sama dan membandingkan hasilnya, juga parser rute, URL preload
//   (apiUrl), perapian spasi dan pemotongan teks (dilewati bila `php` tidak ada);
// - menerapkan head ke DOM berulang kali: tag bertanda data-site-seo diubah di tempat, tanpa duplikat.
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { apiUrl } from '../../src/lib/api';
import { parseSiteRoute, type SiteRoute } from '../../src/templates/siteRoutes';
import {
  applySiteSeoHead,
  buildSiteHead,
  removeSiteSeoHead,
  siteClip,
  siteCollapse,
  type SiteHead,
  type SiteHeadInput,
} from '../../src/templates/siteSeo';
import type { SitePostPublic, SiteSeoPublic } from '../../src/types/sitePosts';

const ROOT = resolve(__dirname, '..', '..');
const SITE_PHP = join(ROOT, 'backend', 'site.php');
const SITE_DEFAULTS = join(ROOT, 'backend', 'modules', 'site_defaults.json');
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo "ok";'], { encoding: 'utf8' }).stdout === 'ok';

const DOMAIN = 'smaitnurulazka.sch.id';
const home: SiteRoute = { kind: 'home' };
const list = (postKind: 'berita' | 'pengumuman'): SiteRoute => ({ kind: 'list', postKind });
const postRoute = (postKind: 'berita' | 'pengumuman', slug: string): SiteRoute => ({ kind: 'post', postKind, slug });

const SEO: SiteSeoPublic = { title: '', description: '', og_image: null, schema_type: '', indexable: true };

/** Konten pembeli: nama sendiri, NBSP & baris baru dari tempelan, logo PNG. */
const CONTENT = {
  brand: { company_name: 'SMA Negeri 1   Contoh', tagline: ' Sekolah   unggulan\ndi Contoh ', logo: '/assets/sites/7/logo_ab12cd34ef56.png' },
  hero: { subtitle: 'Sekolah negeri dengan program unggulan sains dan bahasa.' },
};

const POST: SitePostPublic = {
  id: 11,
  kind: 'berita',
  slug: 'juara-olimpiade-sains',
  title: 'Siswa Kami Juara 1 Olimpiade Sains Nasional Bidang Fisika Tahun 2026 di Jakarta',
  excerpt: '',
  category: 'Prestasi',
  badge: '',
  image: '/assets/sites/7/posts/post_0123456789ab.webp',
  image_alt: 'Siswa menerima medali',
  link_url: '',
  published_at: '2026-10-20',
  updated_at: '2026-10-21 08:15:00',
  body: `${'Paragraf pertama berisi cerita lomba yang panjang. '.repeat(6)}\n\nParagraf kedua.`,
  seo_title: '',
  seo_description: '',
  noindex: false,
};

const ANNOUNCEMENT: SitePostPublic = {
  ...POST,
  id: 12,
  kind: 'pengumuman',
  slug: 'libur-semester',
  title: 'Libur Semester Ganjil',
  excerpt: 'Libur dimulai 20 Desember.',
  image: null,
  seo_title: 'Jadwal Libur Semester Ganjil 2026',
  seo_description: 'Jadwal   libur semester ganjil\nuntuk seluruh siswa.',
  noindex: true,
  published_at: null,
  updated_at: '2026-10-22T10:00:00+07:00',
};

/** Kasus paritas PHP = TypeScript (nama → masukan). */
const CASES: [string, SiteHeadInput][] = [
  ['beranda bawaan (konten null, tanpa site_seo)', { domain: DOMAIN, templateCode: 'madani', content: null, seo: null, route: home }],
  ['beranda konten pembeli, tanpa site_seo (auto → index)', { domain: DOMAIN, templateCode: 'madani', content: CONTENT, seo: null, route: home }],
  [
    'beranda dengan judul, deskripsi, gambar & jenis SEO',
    {
      domain: DOMAIN,
      templateCode: 'madani',
      content: CONTENT,
      seo: { title: '  SMAN 1 Contoh  ', description: 'Deskripsi   SEO.', og_image: '/assets/sites/7/seo/seo_aa11bb22cc33.jpg', schema_type: 'HighSchool', indexable: true },
      route: home,
    },
  ],
  ['beranda situs noindex (site_seo)', { domain: DOMAIN, templateCode: 'cakrawala', content: CONTENT, seo: { ...SEO, indexable: false }, route: home }],
  ['daftar berita berisi', { domain: DOMAIN, templateCode: 'cakrawala', content: CONTENT, seo: SEO, route: list('berita'), listCount: 3 }],
  ['daftar pengumuman kosong', { domain: DOMAIN, templateCode: 'cakrawala', content: CONTENT, seo: SEO, route: list('pengumuman'), listCount: 0 }],
  ['tulisan berita (deskripsi dari isi, foto, tanggal)', { domain: DOMAIN, templateCode: 'madani', content: CONTENT, seo: SEO, route: postRoute('berita', POST.slug), post: POST }],
  [
    'pengumuman dengan SEO sendiri dan noindex',
    { domain: DOMAIN, templateCode: 'madani', content: CONTENT, seo: SEO, route: postRoute('pengumuman', ANNOUNCEMENT.slug), post: ANNOUNCEMENT },
  ],
  ['tulisan tidak ditemukan', { domain: DOMAIN, templateCode: 'madani', content: CONTENT, seo: SEO, route: postRoute('berita', 'tidak-ada'), post: null }],
  ['tulisan belum dimuat', { domain: DOMAIN, templateCode: 'madani', content: CONTENT, seo: SEO, route: postRoute('berita', POST.slug) }],
  ['tulisan lain masih tersimpan (pindah rute)', { domain: DOMAIN, templateCode: 'madani', content: CONTENT, seo: SEO, route: postRoute('pengumuman', POST.slug), post: POST }],
  ['rute tidak dikenal', { domain: DOMAIN, templateCode: 'madani', content: CONTENT, seo: SEO, route: { kind: 'notfound' } }],
  [
    'template tanpa fitur tulisan, LocalBusiness tanpa alamat',
    { domain: 'kliniksehat.id', templateCode: 'aura-studio', content: { brand: { company_name: 'Klinik Sehat' } }, seo: { ...SEO, schema_type: 'LocalBusiness' }, route: list('berita'), listCount: 5 },
  ],
  ['pratinjau host utama (domain null)', { domain: null, templateCode: 'madani', content: CONTENT, seo: SEO, route: postRoute('berita', POST.slug), post: POST }],
  ['domain tidak sah', { domain: 'Bukan Domain!', templateCode: 'madani', content: CONTENT, seo: SEO, route: home }],
  ['template tidak dikenal', { domain: DOMAIN, templateCode: 'tidak-ada', content: null, seo: null, route: home }],
  [
    'nama sama dengan bawaan (spasi berbeda) → auto noindex',
    { domain: DOMAIN, templateCode: 'madani', content: { brand: { company_name: ' SMA IT   Nurul Azka ' } }, seo: null, route: home },
  ],
  [
    'teks berbahaya & jenis skema tidak dikenal',
    {
      domain: DOMAIN,
      templateCode: 'madani',
      content: { brand: { company_name: '"><script>alert(1)</script> & \'Sekolah\'', tagline: '</title><b>x', logo: 'javascript:alert(1)' }, footer: { description: '<img src=x onerror=alert(1)>' } },
      seo: { ...SEO, schema_type: 'Hacker' as SiteSeoPublic['schema_type'], og_image: '//evil.test/x.png' },
      route: postRoute('berita', 'xss'),
      post: { ...POST, slug: 'xss', title: '</script><script>alert(2)</script>', image: 'data:image/png;base64,AAAA', body: 'Isi <b>tebal</b> & "kutip"' },
    },
  ],
  [
    'judul panjang dengan emoji di batas potong',
    {
      domain: DOMAIN,
      templateCode: 'cakrawala',
      content: CONTENT,
      seo: SEO,
      route: postRoute('berita', 'emoji'),
      post: { ...POST, slug: 'emoji', title: `${'Kabar gembira 🎉 '.repeat(9)}selesai`, seo_description: `${'Kata '.repeat(30)}🎓🎓🎓 akhir` },
    },
  ],
  ['logo SVG bawaan: tanpa og:image', { domain: DOMAIN, templateCode: 'cakrawala', content: { brand: { company_name: 'SMK Maju' } }, seo: SEO, route: home }],
];

const ROUTES = [
  '', '/', '/berita', '/pengumuman', '/berita/juara-1', '/pengumuman/libur', '/berita/', '/berita/x/', '/Berita', '/berita/Juara',
  '/berita/juara--1', '/berita/-juara', '/berita/a/b', '/agenda', '/berita/' + 'a'.repeat(120), '/berita/' + 'a'.repeat(121), 'berita',
  '//berita', '/berita/juara%2D1', '/index.html',
];

const URLS: [string, Record<string, string | number | undefined>][] = [
  ['get_site_public', { domain: DOMAIN }],
  ['get_site_seo', { site_id: 7 }],
  ['get_site_posts', { site_id: 7, kind: 'berita', limit: 12 }],
  ['get_site_post', { site_id: 7, slug: 'juara-olimpiade-sains' }],
  ['get_site_posts', { site_id: 7, kind: '', limit: undefined }],
  ['x', { q: 'a b&c=d/é~*\'()!' }],
];

const CLIPS: [string, number][] = [
  ['pendek', 155],
  [`${'kata '.repeat(40)}akhir`, 155],
  [`${'x'.repeat(200)}`, 155],
  ['Halo, dunia. Ini kalimat; yang dipotong tepat — di sini sesudah tanda baca', 30],
  [`${'🎉'.repeat(10)} ${'a'.repeat(10)}`, 12],
  ['a b c　d﻿e\tf\r\ng', 155],
  // U+0085 dan U+180E bukan spasi di JavaScript (tetapi `\s` PHP /u mencocokkannya)
  ['a\u0085b ᠎ c', 155],
];

const WHITESPACE = '\t\n\v\f\r                  　﻿';

const HARNESS = String.raw`<?php
define('GN_SITE_LIBRARY', true);
require getenv('SITE_PHP');
$in = json_decode(stream_get_contents(STDIN), true);
$defaults = json_decode(file_get_contents(getenv('SITE_DEFAULTS')), true);
$out = ['heads' => [], 'routes' => [], 'urls' => [], 'clips' => [], 'collapse' => site_collapse($in['collapse'])];
foreach ($in['heads'] as $input) $out['heads'][] = site_build_head($input, $defaults);
foreach ($in['routes'] as $path) $out['routes'][] = site_parse_route($path);
foreach ($in['urls'] as [$action, $params]) $out['urls'][] = site_api_url($action, $params);
foreach ($in['clips'] as [$text, $max]) $out['clips'][] = site_clip($text, $max);
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

const graph = (head: SiteHead) => head.jsonLd['@graph'] as Record<string, unknown>[];
const byType = (head: SiteHead, type: string) => graph(head).find((node) => node['@type'] === type);
const head = (name: string) => buildSiteHead(CASES.find(([caseName]) => caseName === name)![1]);

describe('buildSiteHead: aturan §5', () => {
  it('beranda bawaan: nama — tagline (≤ 60), deskripsi hero bawaan dipotong ≤ 155, noindex karena konten demo', () => {
    const h = head('beranda bawaan (konten null, tanpa site_seo)');
    expect(h.title).toBe('SMA IT Nurul Azka — Sekolah Islam Terpadu & Asrama di Bogor');
    expect(h.description.startsWith('SMA Islam Terpadu di Bogor dengan program tahfidz')).toBe(true);
    expect(Array.from(h.description).length).toBeLessThanOrEqual(155);
    expect(h.description.endsWith('…')).toBe(true);
    expect(h.robots).toBe('noindex,follow');
    expect(h.canonical).toBe(`https://${DOMAIN}/`);
    // Logo bawaan SVG: ikon & logo JSON-LD ya, og:image tidak (WhatsApp/Facebook tidak membaca SVG)
    expect(h.icon).toBe('/assets/templates/logos/tut-wuri-handayani.svg');
    expect(h.ogImage).toBeNull();
    expect(h.twitterCard).toBe('summary');
    expect(byType(h, 'School')).toMatchObject({ '@id': `https://${DOMAIN}/#organization`, logo: `https://${DOMAIN}/assets/templates/logos/tut-wuri-handayani.svg` });
  });

  it('konten pembeli: spasi dirapatkan, index (auto), og:image logo PNG absolut, School untuk template sekolah', () => {
    const h = head('beranda konten pembeli, tanpa site_seo (auto → index)');
    expect(h.title).toBe('SMA Negeri 1 Contoh — Sekolah unggulan di Contoh');
    expect(h.description).toBe('Sekolah negeri dengan program unggulan sains dan bahasa.');
    expect(h.robots).toBe('index,follow');
    expect(h.ogImage).toBe(`https://${DOMAIN}/assets/sites/7/logo_ab12cd34ef56.png`);
    expect(h.twitterCard).toBe('summary_large_image');
    expect(h.siteName).toBe('SMA Negeri 1 Contoh');
    expect(byType(h, 'WebSite')).toEqual({
      '@type': 'WebSite',
      '@id': `https://${DOMAIN}/#website`,
      url: `https://${DOMAIN}/`,
      name: 'SMA Negeri 1 Contoh',
      inLanguage: 'id-ID',
      publisher: { '@id': `https://${DOMAIN}/#organization` },
    });
  });

  it('pengaturan SEO situs menang: judul, deskripsi, gambar bagikan, jenis organisasi', () => {
    const h = head('beranda dengan judul, deskripsi, gambar & jenis SEO');
    expect(h.title).toBe('SMAN 1 Contoh');
    expect(h.description).toBe('Deskripsi SEO.');
    expect(h.ogImage).toBe(`https://${DOMAIN}/assets/sites/7/seo/seo_aa11bb22cc33.jpg`);
    expect(graph(h)[0]['@type']).toBe('HighSchool');
    expect(head('beranda situs noindex (site_seo)').robots).toBe('noindex,follow');
  });

  it('daftar: judul & deskripsi tetap, index hanya bila ada tulisan dan templatenya berfitur tulisan', () => {
    const filled = head('daftar berita berisi');
    expect(filled).toMatchObject({ title: 'Berita · SMA Negeri 1 Contoh', description: 'Berita terbaru dari SMA Negeri 1 Contoh.', robots: 'index,follow' });
    expect(filled.canonical).toBe(`https://${DOMAIN}/berita`);
    expect(filled.ogType).toBe('website');
    const empty = head('daftar pengumuman kosong');
    expect(empty).toMatchObject({ title: 'Pengumuman · SMA Negeri 1 Contoh', description: 'Pengumuman resmi dari SMA Negeri 1 Contoh.', robots: 'noindex,follow' });
    const noPosts = head('template tanpa fitur tulisan, LocalBusiness tanpa alamat');
    expect(noPosts.robots).toBe('noindex,follow');
    expect(graph(noPosts)[0]['@type']).toBe('Organization');
  });

  it('tulisan: judul + nama situs bila muat, deskripsi dari isi, NewsArticle + BreadcrumbList', () => {
    const h = head('tulisan berita (deskripsi dari isi, foto, tanggal)');
    expect(h.title).toBe(POST.title);
    expect(h.description.startsWith('Paragraf pertama berisi cerita lomba yang panjang.')).toBe(true);
    expect(Array.from(h.description).length).toBeLessThanOrEqual(155);
    expect(h.robots).toBe('index,follow');
    expect(h.ogType).toBe('article');
    const url = `https://${DOMAIN}/berita/${POST.slug}`;
    expect(h.canonical).toBe(url);
    expect(h.ogImage).toBe(`https://${DOMAIN}${POST.image}`);
    expect(byType(h, 'NewsArticle')).toEqual({
      '@type': 'NewsArticle',
      '@id': `${url}#article`,
      headline: POST.title,
      description: h.description,
      url,
      mainEntityOfPage: url,
      inLanguage: 'id-ID',
      author: { '@id': `https://${DOMAIN}/#organization` },
      publisher: { '@id': `https://${DOMAIN}/#organization` },
      image: [`https://${DOMAIN}${POST.image}`],
      datePublished: '2026-10-20T00:00:00+07:00',
      dateModified: '2026-10-21',
    });
    expect(byType(h, 'BreadcrumbList')?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Beranda', item: `https://${DOMAIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Berita', item: `https://${DOMAIN}/berita` },
      { '@type': 'ListItem', position: 3, name: POST.title, item: url },
    ]);
    const short = buildSiteHead({ ...CASES[6][1], post: { ...POST, title: 'Juara Lomba' } });
    expect(short.title).toBe('Juara Lomba · SMA Negeri 1 Contoh');
  });

  it('pengumuman: judul & deskripsi SEO tulisan, noindex per tulisan, Article tanpa datePublished bila tanggal kosong', () => {
    const h = head('pengumuman dengan SEO sendiri dan noindex');
    expect(h.title).toBe('Jadwal Libur Semester Ganjil 2026');
    expect(h.description).toBe('Jadwal libur semester ganjil untuk seluruh siswa.');
    expect(h.robots).toBe('noindex,follow');
    const article = byType(h, 'Article');
    expect(article).toBeDefined();
    expect(article).not.toHaveProperty('datePublished');
    expect(article?.dateModified).toBe('2026-10-22');
    // Tanpa foto tulisan: og:image = logo situs
    expect(h.ogImage).toBe(`https://${DOMAIN}/assets/sites/7/logo_ab12cd34ef56.png`);
  });

  it('tidak ditemukan / belum dimuat: noindex tanpa canonical; tulisan lain dianggap belum dimuat', () => {
    for (const name of ['tulisan tidak ditemukan', 'rute tidak dikenal']) {
      const h = head(name);
      expect(h).toMatchObject({ title: 'Halaman tidak ditemukan · SMA Negeri 1 Contoh', robots: 'noindex,follow', canonical: null, ogType: 'website' });
    }
    for (const name of ['tulisan belum dimuat', 'tulisan lain masih tersimpan (pindah rute)']) {
      const h = head(name);
      expect(h.robots).toBe('noindex,follow');
      expect(h.canonical).toBeNull();
      expect(graph(h)).toHaveLength(2);
    }
    expect(head('tulisan belum dimuat').title).toBe('Berita · SMA Negeri 1 Contoh');
  });

  it('host utama (pratinjau) dan domain tidak sah: tanpa canonical, noindex, gambar sebagai path', () => {
    const preview = head('pratinjau host utama (domain null)');
    expect(preview.canonical).toBeNull();
    expect(preview.robots).toBe('noindex,follow');
    expect(preview.ogImage).toBe(POST.image);
    expect(byType(preview, 'NewsArticle')?.['@id']).toBe(`/berita/${POST.slug}#article`);
    expect(head('domain tidak sah').canonical).toBeNull();
    expect(JSON.stringify(preview)).not.toContain('garudanexa.com');
  });

  it('nilai berbahaya tidak dipakai sebagai gambar; jenis skema tidak dikenal → School', () => {
    const h = head('teks berbahaya & jenis skema tidak dikenal');
    expect(h.icon).toBe('/assets/templates/logos/tut-wuri-handayani.svg');
    // javascript:, //host dan data: ditolak; sisa logo bawaan SVG → tanpa og:image
    expect(h.ogImage).toBeNull();
    expect(graph(h)[0]['@type']).toBe('School');
    expect(JSON.stringify(h)).not.toContain('javascript:');
    expect(JSON.stringify(h)).not.toContain('evil.test');
  });

  it('nama sama dengan bawaan (beda spasi) tetap dianggap konten demo', () => {
    expect(head('nama sama dengan bawaan (spasi berbeda) → auto noindex').robots).toBe('noindex,follow');
  });
});

describe('teks: siteCollapse & siteClip', () => {
  it('merapatkan semua spasi JavaScript (NBSP, U+2028, …) dan memotong di batas kata dengan …', () => {
    expect(siteCollapse(`a${WHITESPACE}b`)).toBe('a b');
    expect(siteClip(`${'kata '.repeat(40)}akhir`, 155)).toMatch(/^(kata ){30}kata…$/);
    expect(siteClip('Halo, dunia. Ini kalimat; yang dipotong tepat — di sini', 30)).toBe('Halo, dunia. Ini kalimat…');
    expect(siteClip('x'.repeat(200), 10)).toBe(`${'x'.repeat(9)}…`);
  });
});

describe.skipIf(!PHP_AVAILABLE)('backend/site.php = siteSeo.ts / siteRoutes.ts / apiUrl (PHP CLI)', () => {
  let php: { heads: unknown[]; routes: unknown[]; urls: string[]; clips: string[]; collapse: string };

  beforeAll(() => {
    const input = {
      heads: CASES.map(([, input]) => input),
      routes: ROUTES,
      urls: URLS,
      clips: CLIPS,
      collapse: `a${WHITESPACE}b${WHITESPACE}`,
    };
    const result = spawnSync('php', ['-d', 'display_errors=stderr', '-r', HARNESS.replace(/^<\?php\s*/, '')], {
      encoding: 'utf8',
      input: JSON.stringify(input),
      env: { ...process.env, SITE_PHP, SITE_DEFAULTS },
    });
    if (result.status !== 0 || result.stderr) throw new Error(`php: ${result.stderr}`);
    php = JSON.parse(result.stdout);
  });

  CASES.forEach(([name, input], index) => {
    it(`head sama: ${name}`, () => {
      expect(php.heads[index]).toEqual(JSON.parse(JSON.stringify(buildSiteHead(input))));
    });
  });

  it('parser rute sama dengan parseSiteRoute', () => {
    expect(php.routes).toEqual(ROUTES.map(parseSiteRoute));
  });

  it('kunci preload sama dengan apiUrl() klien (URLSearchParams, action dulu)', () => {
    expect(php.urls).toEqual(URLS.map(([action, params]) => apiUrl(action, params)));
  });

  it('perapian spasi dan pemotongan teks sama', () => {
    expect(php.collapse).toBe(siteCollapse(`a${WHITESPACE}b${WHITESPACE}`));
    expect(php.clips).toEqual(CLIPS.map(([text, max]) => siteClip(text, max)));
  });
});

describe('applySiteSeoHead (DOM)', () => {
  afterEach(() => {
    removeSiteSeoHead();
    document.head.innerHTML = '';
    document.title = '';
  });

  const input = CASES.find(([name]) => name === 'tulisan berita (deskripsi dari isi, foto, tanggal)')![1];
  const marked = () => Array.from(document.head.querySelectorAll('[data-site-seo]')).map((el) => el.getAttribute('data-site-seo'));

  it('membuat tag di host utama/pengembangan, lalu mengubahnya di tempat tanpa duplikat', () => {
    document.head.innerHTML = '<link rel="icon" href="/favicon.ico"><link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2"><meta name="theme-color" content="#ffffff">';
    applySiteSeoHead(input);
    applySiteSeoHead(input);
    const h = buildSiteHead(input);
    expect(document.title).toBe(h.title);
    const keys = marked();
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.sort()).toEqual(
      ['canonical', 'description', 'icon', 'jsonld', 'og:description', 'og:image', 'og:locale', 'og:site_name', 'og:title', 'og:type', 'og:url', 'robots', 'twitter:card'].sort(),
    );
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(h.canonical);
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(h.ogImage);
    expect(JSON.parse(document.head.querySelector('script[type="application/ld+json"]')?.textContent ?? '')).toEqual(h.jsonLd);
    // Favicon Garuda Nexa diganti logo situs; theme-color = warna aksen template
    expect(Array.from(document.head.querySelectorAll('link[rel~="icon"]')).map((el) => el.getAttribute('href'))).toEqual([h.icon]);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#1B6B47');

    // Pindah ke tulisan yang tidak ada: canonical, og:url dan og:image hilang; tetap tanpa duplikat
    applySiteSeoHead({ ...input, route: postRoute('berita', 'tidak-ada'), post: null });
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,follow');
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);

    removeSiteSeoHead();
    expect(marked()).toEqual([]);
    expect(Array.from(document.head.querySelectorAll('link[rel~="icon"]')).map((el) => el.getAttribute('href'))).toEqual(['/favicon.ico', '/favicon.svg?v=2']);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#ffffff');
  });

  it('memakai tag dari site.php (bertanda data-site-seo) apa adanya, tidak menambah yang baru', () => {
    const h = buildSiteHead(input);
    document.head.innerHTML = [
      `<title>${h.title}</title>`,
      '<meta name="description" content="lama" data-site-seo="description">',
      '<meta name="robots" content="noindex,follow" data-site-seo="robots">',
      '<link rel="canonical" href="https://lama.test/" data-site-seo="canonical">',
      '<meta property="og:title" content="lama" data-site-seo="og:title">',
      '<link rel="icon" href="/lama.png" data-site-seo="icon">',
      '<script type="application/ld+json" data-site-seo="jsonld">{}</script>',
      '<meta name="google-site-verification" content="abcdefghij12">',
    ].join('');
    const before = Array.from(document.head.querySelectorAll('[data-site-seo]'));
    applySiteSeoHead(input);
    for (const el of before) expect(el.isConnected).toBe(true);
    expect(document.head.querySelector('[data-site-seo="description"]')?.getAttribute('content')).toBe(h.description);
    expect(document.head.querySelector('[data-site-seo="canonical"]')?.getAttribute('href')).toBe(h.canonical);
    expect(document.head.querySelector('[data-site-seo="icon"]')?.getAttribute('href')).toBe(h.icon);
    expect(document.head.querySelectorAll('title')).toHaveLength(1);
    // Kode verifikasi server tidak disentuh klien
    expect(document.head.querySelector('meta[name="google-site-verification"]')).not.toBeNull();
  });
});
