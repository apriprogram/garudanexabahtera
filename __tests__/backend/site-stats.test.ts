// @vitest-environment node
// Statistik kunjungan situs pembeli (docs/platform/SITE-STATS-SPEC.md §1–§3, §5 backend).
//
// 1. Pemasangan dan konstanta: aksi & aksi GET backend/modules/site_stats.php = site_stats.js, akses di api.php =
//    security.js (site_visit publik, customer_get_site_stats pembeli), modul dipanggil api.php/server.js, konstanta =
//    src/types/siteStats.ts, migrasi 031 aman untuk phpMyAdmin dan tabelnya sama dengan database/schema.sql.
// 2. Fungsi murni PHP (CLI) = Node: grup sumber, perangkat & browser, perayap, rute dari path, kunci batas laju (HMAC,
//    IPv6 per /64).
// 3. backend/api.php (`php -S`) dan backend/server.js berdampingan, masing-masing di database sementara dari
//    database/schema.sql. Setiap request dikirim ke PHP lalu Node; status, JSON, dan baris tabel harus sama:
//    pencatatan hanya dengan Origin/Referer domain situs (www. juga), perayap / situs nonaktif / Origin lain / path tidak
//    sah / path yang bukan rute tampil (tanpa fitur Berita & Pengumuman, tulisan tidak terbit, path buatan) tidak
//    dihitung tetapi tetap { success: true }, berkas batas laju PHP tanpa IP di namanya, first menambah
//    kunjungan/sumber/perangkat/browser, pengunjung unik per hari (hash, bukan IP), grup sumber; dasbor (rentang, isi 0,
//    periode sebelumnya, hari ini, judul halaman, kepemilikan, validasi, batas baca 120/jam) dan tabel yang belum ada
//    (503 STATS_NOT_READY, site_visit tetap sukses).
// Bagian 2–3 butuh `php` (bagian 3 dengan mysqli), MySQL/MariaDB (PD_TEST_MYSQL_HOST / _USER / _PASS) dan dependensi
// backend/ (`npm ci` di backend/); dilewati bila tidak ada. Database: sstat_<php|node>_<hex>.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SITE_STATS_RANGES, SITE_STATS_RANGE_DEFAULT, SITE_VISIT_DEVICE_LABEL, SITE_VISIT_SOURCES } from '../../src/types/siteStats';

const ROOT = resolve(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8');
const API_PHP = read('backend', 'api.php');
const SECURITY_JS = read('backend', 'security.js');
const SERVER_JS = read('backend', 'server.js');
const MODULE_PHP = read('backend', 'modules', 'site_stats.php');
const MODULE_JS = read('backend', 'modules', 'site_stats.js');
const MIGRATION = read('database', 'migrations', '2026-10-27_031_site_stats.sql');
const SCHEMA = read('database', 'schema.sql');
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo "ok";'], { encoding: 'utf8' }).stdout === 'ok';

interface StatsModule {
  SITE_STATS_ACTIONS: string[];
  RANGES: number[];
  RANGE_DEFAULT: number;
  SOURCES: { key: string; label: string }[];
  DEVICES: Record<string, string>;
  sourceGroup(referrer: string | null, utm: string | null): string;
  deviceAndBrowser(ua: string): { device: string; browser: string };
  isCrawler(ua: string): boolean;
  visitRoute(path: string): [string, string] | null;
  visitLimitKey(ip: string): string;
}
interface VisitsModule {
  referrerHost(value: unknown): string | null;
  utmSource(value: unknown): string | null;
}
// Sebelum modul backend dimuat: security.js membaca AUTH_SECRET saat dievaluasi (token uji = kunci server uji)
const AUTH_SECRET = crypto.randomBytes(32).toString('hex');
process.env.AUTH_SECRET = AUTH_SECRET;
const stats = (await import('../../backend/modules/site_stats.js')) as unknown as StatsModule;
const visits = (await import('../../backend/modules/visits.js')) as unknown as VisitsModule;

/* ─────────────────────────── 1. Pemasangan, konstanta, migrasi ─────────────────────────── */

/** Isi daftar PHP `const NAME = [ ... ];` atau Set Node `NAME = new Set([ ... ])` sebagai daftar string. */
function listOf(source: string, pattern: RegExp): string[] {
  const match = source.match(pattern);
  if (!match) throw new Error(`list not found: ${pattern}`);
  return [...match[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}
const phpList = (source: string, name: string) => listOf(source, new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
const jsSet = (source: string, name: string) => listOf(source, new RegExp(`${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`));

/** CREATE TABLE tanpa komentar dan spasi berlebih (migrasi = schema.sql). */
function tableDefinition(sql: string, table: string): string {
  const match = sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\) ENGINE=InnoDB[^;]*;`));
  if (!match) throw new Error(`${table} not found`);
  return match[0].replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').trim();
}

describe('site_stats: pemasangan dan konstanta (PHP = Node = src/types/siteStats.ts)', () => {
  it('aksi dan aksi GET modul PHP = modul Node', () => {
    const phpHandlers = [...MODULE_PHP.match(/static \$handlers = \[([\s\S]*?)\];/)![1].matchAll(/'([a-z_]+)' => 'ss_/g)].map((m) => m[1]);
    expect([...stats.SITE_STATS_ACTIONS].sort()).toEqual(['customer_get_site_stats', 'site_visit']);
    expect(phpHandlers.sort()).toEqual([...stats.SITE_STATS_ACTIONS].sort());
    expect(phpList(MODULE_PHP, 'SS_GET_ACTIONS')).toEqual(['customer_get_site_stats']);
    expect(jsSet(MODULE_JS, 'GET_ACTIONS')).toEqual(['customer_get_site_stats']);
  });

  it('akses: site_visit publik, customer_get_site_stats khusus pembeli (api.php = security.js)', () => {
    for (const [pub, customer, admin] of [
      [phpList(API_PHP, 'PUBLIC_ACTIONS'), phpList(API_PHP, 'CUSTOMER_ACTIONS'), phpList(API_PHP, 'ADMIN_ACTIONS')],
      [jsSet(SECURITY_JS, 'PUBLIC_ACTIONS'), jsSet(SECURITY_JS, 'CUSTOMER_ACTIONS'), jsSet(SECURITY_JS, 'ADMIN_ACTIONS')],
    ]) {
      expect(pub).toContain('site_visit');
      expect(customer).not.toContain('site_visit');
      expect(customer).toContain('customer_get_site_stats');
      expect(pub).not.toContain('customer_get_site_stats');
      expect(admin).not.toContain('customer_get_site_stats');
    }
  });

  it('api.php memuat modul dan memanggilnya setelah cek token; server.js di GET dan POST', () => {
    expect(API_PHP).toContain("require_once __DIR__ . '/modules/site_stats.php';");
    expect(API_PHP.indexOf('handle_site_stats_action($conn, $action, $input, $authUser)')).toBeGreaterThan(API_PHP.indexOf('$authUser = authorize_request('));
    expect(SERVER_JS).toContain("import { handleSiteStatsAction } from './modules/site_stats.js';");
    expect(SERVER_JS.match(/await handleSiteStatsAction\(action, req\.(query|body), req, res, pool\)/g)).toEqual([
      'await handleSiteStatsAction(action, req.query, req, res, pool)',
      'await handleSiteStatsAction(action, req.body, req, res, pool)',
    ]);
  });

  it('rentang, grup sumber dan label perangkat Node = src/types/siteStats.ts', () => {
    expect(stats.RANGES).toEqual([...SITE_STATS_RANGES]);
    expect(stats.RANGE_DEFAULT).toBe(SITE_STATS_RANGE_DEFAULT);
    expect(stats.SOURCES).toEqual(SITE_VISIT_SOURCES.map((s) => ({ ...s })));
    expect(stats.DEVICES).toEqual(SITE_VISIT_DEVICE_LABEL);
  });

  it('migrasi 031: tanpa ALTER/prosedur/DROP, aman diulang, tabel = schema.sql, baseline schema_migrations, README', () => {
    const code = MIGRATION.replace(/--[^\n]*/g, '');
    expect(code).not.toMatch(/\b(ALTER|PROCEDURE|DELIMITER|DROP|DELETE|UPDATE|information_schema)\b/i);
    expect(code.match(/CREATE TABLE IF NOT EXISTS (\w+)/g)).toEqual([
      'CREATE TABLE IF NOT EXISTS site_visit_stats',
      'CREATE TABLE IF NOT EXISTS site_visitors',
    ]);
    expect(code).toMatch(/INSERT IGNORE INTO schema_migrations \(version, description\)\s+VALUES \('2026-10-27_031'/);
    for (const table of ['site_visit_stats', 'site_visitors']) expect(tableDefinition(MIGRATION, table)).toBe(tableDefinition(SCHEMA, table));
    expect(SCHEMA).toMatch(/\('2026-10-27_031', 'baseline: site_visit_stats, site_visitors/);
    expect(read('database', 'README.md')).toContain('2026-10-27_031_site_stats.sql');
  });
});

/* ─────────────────────────── 2. Fungsi murni: PHP (CLI) = Node ─────────────────────────── */

/** [referrer mentah, utm_source mentah, grup] — dinormalkan dulu seperti site_visit (visit_referrer_host / visit_utm_source). */
const GROUP_CASES: [string, string, string][] = [
  ['https://gemini.google.com/app', '', 'ai'],
  ['https://chatgpt.com/', '', 'ai'],
  ['https://www.perplexity.ai/search', '', 'ai'],
  ['https://copilot.microsoft.com/', '', 'ai'],
  ['https://claude.ai/chat/1', '', 'ai'],
  ['', 'chatgpt.com', 'ai'],
  ['https://www.google.com/', '', 'mesin_pencari'],
  ['https://www.google.co.id/search?q=sekolah', '', 'mesin_pencari'],
  ['https://google.com.au/', '', 'mesin_pencari'],
  ['https://www.bing.com/search', '', 'mesin_pencari'],
  ['https://duckduckgo.com/', '', 'mesin_pencari'],
  ['https://search.yahoo.com/search', '', 'mesin_pencari'],
  ['https://yahoo.com/', '', 'mesin_pencari'],
  ['https://yandex.ru/search', '', 'mesin_pencari'],
  ['https://yandex.com.tr/', '', 'mesin_pencari'],
  ['https://www.ecosia.org/', '', 'mesin_pencari'],
  ['https://www.baidu.com/', '', 'mesin_pencari'],
  ['https://news.google.com/', '', 'lainnya'],
  ['https://mail.yahoo.com/', '', 'lainnya'],
  ['https://l.facebook.com/l.php?u=x', '', 'media_sosial'],
  ['https://lm.facebook.com/', '', 'media_sosial'],
  ['https://m.facebook.com/', '', 'media_sosial'],
  ['https://www.instagram.com/', '', 'media_sosial'],
  ['https://l.instagram.com/', '', 'media_sosial'],
  ['https://t.co/abc', '', 'media_sosial'],
  ['https://x.com/', '', 'media_sosial'],
  ['https://twitter.com/', '', 'media_sosial'],
  ['https://www.tiktok.com/', '', 'media_sosial'],
  ['https://www.youtube.com/', '', 'media_sosial'],
  ['https://www.linkedin.com/', '', 'media_sosial'],
  ['https://lnkd.in/x', '', 'media_sosial'],
  ['https://www.threads.net/', '', 'media_sosial'],
  ['https://id.pinterest.com/', '', 'lainnya'],
  ['https://pinterest.com/', '', 'media_sosial'],
  ['https://wa.me/628', '', 'media_sosial'],
  ['https://web.whatsapp.com/', '', 'media_sosial'],
  ['https://whatsapp.com/', '', 'media_sosial'],
  ['https://t.me/x', '', 'media_sosial'],
  ['https://telegram.org/', '', 'media_sosial'],
  ['', 'facebook', 'media_sosial'],
  ['', 'Instagram', 'media_sosial'],
  ['', 'wa', 'media_sosial'],
  ['', 'x', 'media_sosial'],
  ['', 'telegram', 'media_sosial'],
  ['', 'facebook.com', 'media_sosial'],
  ['https://contoh.org/x', 'instagram', 'media_sosial'],
  ['https://www.google.com/', 'facebook', 'mesin_pencari'],
  ['https://contoh.org/x', '', 'lainnya'],
  ['', 'newsletter', 'lainnya'],
  ['', 'google', 'lainnya'],
  ['', '', 'langsung'],
  ['bukan host', 'bukan utm', 'langsung'],
];

const UA = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  ie: 'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko',
  curl: 'curl/8.4.0',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  headless: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36',
  lighthouse: 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome-Lighthouse',
  pingdom: 'Pingdom.com_bot_version_1.4_(http://www.pingdom.com/)',
  uptime: 'Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)',
  facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  blank: '   ',
  empty: '',
};

/** [path sesudah visit_landing_path, rute] — hanya path yang dikirim CustomerSite (sitePath) yang berupa rute. */
const ROUTE_CASES: [string, [string, string] | null][] = [
  ['/', ['', '']],
  ['/berita', ['berita', '']],
  ['/pengumuman', ['pengumuman', '']],
  ['/berita/juara-lomba-sains', ['berita', 'juara-lomba-sains']],
  ['/pengumuman/libur-2026', ['pengumuman', 'libur-2026']],
  [`/berita/${'a'.repeat(120)}`, ['berita', 'a'.repeat(120)]],
  [`/berita/${'a'.repeat(121)}`, null],
  ['/berita/', null],
  ['/berita/juara-lomba-sains/', null],
  ['/berita/a/b', null],
  ['/berita/Juara', null],
  ['/berita/juara--lomba', null],
  ['/berita/-juara', null],
  ['/berita/juara%20lomba', null],
  ['/Berita', null],
  ['/beritaku', null],
  ['/profil', null],
  ['/buy-cheap-x-1', null],
  ['/index.html', null],
  ['//', null],
];

/** Alamat IP → kunci batas laju; IPv6 satu /64 = satu kunci, IPv4 dalam IPv6 = IPv4. */
const IP_CASES = ['127.0.0.1', '::ffff:127.0.0.1', '203.0.113.9', '2001:db8:1:2::1', '2001:DB8:1:2:ffff:ffff:ffff:fffe', '2001:db8:1:3::1', ''];

describe('fungsi murni: grup sumber, perangkat & browser, perayap (PHP = Node)', () => {
  const node = {
    groups: GROUP_CASES.map(([referrer, utm]) => stats.sourceGroup(visits.referrerHost(referrer), visits.utmSource(utm))),
    agents: Object.values(UA).map((ua) => [stats.deviceAndBrowser(ua).device, stats.deviceAndBrowser(ua).browser, stats.isCrawler(ua)]),
    routes: ROUTE_CASES.map(([path]) => stats.visitRoute(path)),
    keys: IP_CASES.map((ip) => stats.visitLimitKey(ip)),
  };

  it('Node: rute hanya dari path rute situs; kunci batas laju HMAC tanpa IP, IPv6 per /64', () => {
    expect(node.routes).toEqual(ROUTE_CASES.map((c) => c[1]));
    const [v4, mapped, other, a1, a2, b, empty] = node.keys;
    const hmac = (value: string) => `sv|${crypto.createHmac('sha256', AUTH_SECRET).update(value).digest('hex')}`;
    expect(v4).toBe(hmac('127.0.0.1'));
    expect(mapped).toBe(v4);
    expect(a1).toBe(hmac('20010db800010002::/64'));
    expect(a2).toBe(a1);
    expect(new Set([v4, other, a1, b, empty]).size).toBe(5);
    for (const key of node.keys) expect(key).toMatch(/^sv\|[0-9a-f]{64}$/);
  });

  it('Node: grup sesuai tabel spesifikasi §2', () => {
    expect(node.groups).toEqual(GROUP_CASES.map((c) => c[2]));
    expect(Object.fromEntries(Object.keys(UA).map((name, i) => [name, node.agents[i]]))).toEqual({
      chrome: ['desktop', 'Chrome', false],
      iphone: ['mobile', 'Safari', false],
      ipad: ['tablet', 'Safari', false],
      android: ['mobile', 'Chrome', false],
      firefox: ['desktop', 'Firefox', false],
      edge: ['desktop', 'Edge', false],
      ie: ['desktop', 'Internet Explorer', false],
      curl: ['desktop', 'Unknown', false],
      googlebot: ['desktop', 'Unknown', true],
      headless: ['desktop', 'Chrome', true],
      lighthouse: ['mobile', 'Chrome', true],
      pingdom: ['desktop', 'Unknown', true],
      uptime: ['desktop', 'Unknown', true],
      facebook: ['desktop', 'Unknown', true],
      blank: ['desktop', 'Unknown', true],
      empty: ['desktop', 'Unknown', true],
    });
  });

  it.skipIf(!PHP_AVAILABLE)('PHP sama dengan Node, konstanta PHP = src/types/siteStats.ts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sstat-cli-'));
    try {
      const parseUserAgent = API_PHP.match(/^function parse_user_agent\([\s\S]*?^}\r?$/m);
      if (!parseUserAgent) throw new Error('parse_user_agent not found');
      const ipLimitKey = API_PHP.match(/^function ip_limit_key\([\s\S]*?^}\r?$/m);
      if (!ipLimitKey) throw new Error('ip_limit_key not found');
      const module = (name: string) => JSON.stringify(join(ROOT, 'backend', 'modules', name));
      writeFileSync(join(dir, 'cli.php'), `<?php
${parseUserAgent[0]}
${ipLimitKey[0]}
function auth_secret() { return getenv('AUTH_SECRET'); }
require ${module('visits.php')};
require ${module('nexa.php')};
require ${module('site_posts.php')};
require ${module('site_stats.php')};
$in = json_decode(stream_get_contents(STDIN), true);
$out = ['groups' => [], 'agents' => [], 'routes' => [], 'keys' => []];
foreach ($in['groups'] as $g) $out['groups'][] = ss_source_group(visit_referrer_host($g[0]), visit_utm_source($g[1]));
foreach ($in['agents'] as $ua) {
    $parsed = parse_user_agent(substr($ua, 0, SS_UA_MAX));
    $out['agents'][] = [strtolower($parsed[0]), $parsed[1], ss_is_bot($ua)];
}
foreach ($in['routes'] as $path) $out['routes'][] = ss_visit_route($path);
foreach ($in['ips'] as $ip) $out['keys'][] = ss_visit_limit_key($ip);
$out['sources'] = [];
foreach (SS_SOURCES as $key => $label) $out['sources'][] = ['key' => $key, 'label' => $label];
$out['devices'] = SS_DEVICES;
$out['ranges'] = SS_RANGES;
$out['range_default'] = SS_RANGE_DEFAULT;
echo json_encode($out);
`);
      const result = spawnSync('php', ['-d', 'display_errors=stderr', join(dir, 'cli.php')], {
        input: JSON.stringify({ groups: GROUP_CASES, agents: Object.values(UA), routes: ROUTE_CASES.map((c) => c[0]), ips: IP_CASES }),
        encoding: 'utf8',
        env: { ...process.env, AUTH_SECRET },
      });
      expect(result.stderr).toBe('');
      const out = JSON.parse(result.stdout);
      expect(out.groups).toEqual(node.groups);
      expect(out.agents).toEqual(node.agents);
      expect(out.routes).toEqual(node.routes);
      expect(out.keys).toEqual(node.keys);
      expect(out.sources).toEqual(SITE_VISIT_SOURCES.map((s) => ({ ...s })));
      expect(out.devices).toEqual(SITE_VISIT_DEVICE_LABEL);
      expect(out.ranges).toEqual([...SITE_STATS_RANGES]);
      expect(out.range_default).toBe(SITE_STATS_RANGE_DEFAULT);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/* ─────────────────────────── 3. Database sungguhan: PHP api.php = Node server.js ─────────────────────────── */

interface SqlConn {
  query(sql: string, values?: unknown[]): Promise<[unknown, unknown]>;
  end(): Promise<void>;
}
interface MysqlModule {
  createConnection(options: Record<string, unknown>): Promise<SqlConn>;
}
interface SecurityModule {
  issueToken(user: { id: number; role: string; password: string }): { token: string };
}

const MYSQL = {
  host: process.env.PD_TEST_MYSQL_HOST || '127.0.0.1',
  user: process.env.PD_TEST_MYSQL_USER || 'root',
  password: process.env.PD_TEST_MYSQL_PASS || '',
};
async function loadEnvironment() {
  const check = spawnSync('php', ['-r', 'echo extension_loaded("mysqli") ? "ok" : "no";'], { encoding: 'utf8' });
  if (check.stdout !== 'ok') return { reason: 'php with mysqli is not installed' };
  const fromBackend = createRequire(join(ROOT, 'backend', 'package.json'));
  let mysql: MysqlModule;
  try {
    mysql = ((await import(pathToFileURL(fromBackend.resolve('mysql2/promise')).href)) as { default: MysqlModule }).default;
    fromBackend.resolve('express');
  } catch {
    return { reason: 'backend dependencies are not installed (npm ci in backend/)' };
  }
  try {
    const conn = await mysql.createConnection({ ...MYSQL, connectTimeout: 3000 });
    await conn.end();
  } catch {
    return { reason: `no MySQL server at ${MYSQL.host}` };
  }
  const security = (await import('../../backend/security.js')) as unknown as SecurityModule;
  return { mysql, security };
}
const ENV = await loadEnvironment();
if ('reason' in ENV) console.warn(`[site-stats] database part skipped: ${ENV.reason}`);
type Env = Exclude<typeof ENV, { reason: string }>;
const suite = 'reason' in ENV ? describe.skip : describe;

type Who = 'customer' | 'other' | 'admin' | 'limited';
const USERS: Record<Who, { id: number; role: string; password: string }> = {
  customer: { id: 201, role: 'customer', password: 'hash-customer-201' },
  other: { id: 202, role: 'customer', password: 'hash-customer-202' },
  admin: { id: 203, role: 'admin', password: 'hash-admin-203' },
  limited: { id: 204, role: 'customer', password: 'hash-customer-204' },
};
// Situs: 701 dicatat lewat site_visit (fitur Berita & Pengumuman aktif), 705 untuk grup sumber (template tanpa tulisan),
// 706 untuk dasbor (data ditulis langsung), 702 nonaktif, 703 milik pembeli lain, 707 template sekolah yang fiturnya
// dinonaktifkan tim (hanya beranda yang tampil)
const DOMAIN = {
  701: 'sekolah-uji.sch.id', 702: 'usaha-uji.com', 703: 'sma-lain.sch.id', 705: 'grup-uji.com', 706: 'statistik-uji.sch.id',
  707: 'tanpa-fitur.sch.id',
};
const ORDER = (id: number, user: number, code: string, domain: string) =>
  `(${id}, 'GN-20261020-ST${id}', ${user}, '${code}', '${code}', 1000000.00, 'Klien Uji', 'klien@uji.test', '081234567890', '${domain}', ` +
  `'${domain}', 'aktif', 'settlement', 'simulator', '2026-10-20 09:00:00', '2026-10-20 10:00:00')`;
const FIXTURES = `
INSERT INTO users (id, name, email, password, phone, role, status, avatar) VALUES
 (201, 'Klien Uji', 'klien@uji.test', 'hash-customer-201', '081234567890', 'customer', 'active', ''),
 (202, 'Klien Lain', 'lain@uji.test', 'hash-customer-202', '081234567891', 'customer', 'active', ''),
 (203, 'Admin Uji', 'admin@uji.test', 'hash-admin-203', NULL, 'admin', 'active', ''),
 (204, 'Klien Batas', 'batas@uji.test', 'hash-customer-204', '081234567892', 'customer', 'active', '');
INSERT INTO template_orders (id, order_number, user_id, template_name, template_code, price, customer_name, customer_email,
  customer_phone, domain_primary, domain, status, payment_status, payment_type, paid_at, activated_at) VALUES
 ${ORDER(601, 201, 'madani', DOMAIN[701])}, ${ORDER(602, 201, 'corporate-nexa', DOMAIN[702])}, ${ORDER(603, 202, 'bestari', DOMAIN[703])},
 ${ORDER(605, 201, 'corporate-nexa', DOMAIN[705])}, ${ORDER(606, 201, 'cakrawala', DOMAIN[706])}, ${ORDER(607, 201, 'madani', DOMAIN[707])};
INSERT INTO template_sites (id, order_id, user_id, template_code, domain, status, activated_at) VALUES
 (701, 601, 201, 'madani', '${DOMAIN[701]}', 'active', '2026-10-20 10:00:00'),
 (702, 602, 201, 'corporate-nexa', '${DOMAIN[702]}', 'suspended', '2026-10-20 10:00:00'),
 (703, 603, 202, 'bestari', '${DOMAIN[703]}', 'active', '2026-10-20 10:00:00'),
 (705, 605, 201, 'corporate-nexa', '${DOMAIN[705]}', 'active', '2026-10-20 10:00:00'),
 (706, 606, 201, 'cakrawala', '${DOMAIN[706]}', 'active', '2026-10-20 10:00:00'),
 (707, 607, 201, 'madani', '${DOMAIN[707]}', 'active', '2026-10-20 10:00:00');
INSERT INTO site_posts (site_id, kind, slug, title, body, status, published_at) VALUES
 (706, 'berita', 'juara-lomba-sains', 'Juara Lomba Sains', 'Isi', 'published', '2026-10-20'),
 (706, 'pengumuman', 'libur-semester', 'Libur Semester', 'Isi', 'draft', NULL),
 (703, 'berita', 'tidak-ada', 'Milik Situs Lain', 'Isi', 'published', '2026-10-20'),
 (701, 'berita', 'juara-lomba-sains', 'Juara Lomba Sains', 'Isi', 'published', '2026-10-20'),
 (701, 'pengumuman', 'rapat-guru', 'Rapat Guru', 'Isi', 'draft', NULL),
 (707, 'berita', 'kabar-sekolah', 'Kabar Sekolah', 'Isi', 'published', '2026-10-20');
INSERT INTO site_addon_orders (addon_number, site_id, order_id, user_id, addon_code, price, status, source, payment_status, paid_at, revoked_at) VALUES
 ('GNF-20261020-STA701', 701, 601, 201, 'posts', 0, 'lunas', 'admin', 'settlement', '2026-10-20 11:00:00', NULL),
 ('GNF-20261020-STA707', 707, 607, 201, 'posts', 0, 'lunas', 'admin', 'settlement', '2026-10-20 11:00:00', '2026-10-21 09:00:00');
`;

const freePort = () =>
  new Promise<number>((done) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as AddressInfo;
      s.close(() => done(port));
    });
  });

interface Backend {
  name: 'php' | 'node';
  base: string;
  db: string;
  proc: ChildProcess;
}

async function waitUntilUp(base: string, proc: ChildProcess) {
  for (let i = 0; i < 300; i++) {
    try {
      await fetch(`${base}/api.php?action=get_settings`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  proc.kill();
  throw new Error(`${base} did not start`);
}

type Json = Record<string, unknown>;
interface Outcome {
  status: number;
  body: Json;
}

/** Tanggal WIB `back` hari sebelum hari ini (YYYY-MM-DD). */
const wibDay = (back = 0) => new Date((Math.floor((Date.now() / 1000 + 7 * 3600) / 86400) - back) * 86400 * 1000).toISOString().slice(0, 10);
const visitorHash = (siteId: number, day: string, ip: string, ua: string) =>
  crypto.createHash('sha256').update(`${AUTH_SECRET}|${siteId}|${day}|${ip}|${ua}`).digest('hex').slice(0, 16);

const NOT_READY = { error: 'Statistik belum siap. Coba lagi nanti.', code: 'STATS_NOT_READY' };
const RANGE_ERROR = { error: 'Pilih rentang 7, 30, 90, atau 365 hari.', code: 'VALIDATION', errors: { range: 'Pilih rentang 7, 30, 90, atau 365 hari.' } };
const SITE_NOT_FOUND = { error: 'Situs tidak ditemukan.', code: 'SITE_NOT_FOUND' };
const OK = { success: true };

suite('statistik kunjungan: PHP api.php = Node server.js', () => {
  const env = ENV as Env;
  const tmp = mkdtempSync(join(tmpdir(), 'sstat-'));
  const dbSuffix = crypto.randomBytes(4).toString('hex');
  const backends: Backend[] = [];
  const tokens = new Map<Who, string>();
  const token = (who: Who) => {
    if (!tokens.has(who)) tokens.set(who, env.security.issueToken(USERS[who]).token);
    return tokens.get(who) as string;
  };

  async function send(backend: Backend, who: Who | null, action: string, input: Json, method: 'GET' | 'POST', extra: Record<string, string> = {}): Promise<Outcome> {
    const headers: Record<string, string> = { ...(who ? { Authorization: `Bearer ${token(who)}` } : {}), ...extra };
    const res = method === 'GET'
      ? await fetch(`${backend.base}/api.php?${new URLSearchParams({ action, ...(input as Record<string, string>) })}`, { headers })
      : await fetch(`${backend.base}/api.php`, { method, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...input }) });
    const text = await res.text();
    try {
      return { status: res.status, body: JSON.parse(text) as Json };
    } catch {
      return { status: res.status, body: { raw: text.slice(0, 300) } };
    }
  }

  /** PHP lalu Node; status dan JSON harus sama, tidak pernah 500. Hasil PHP. */
  async function both(who: Who | null, action: string, input: Json, method: 'GET' | 'POST' = 'POST', extra: Record<string, string> = {}) {
    const results: Outcome[] = [];
    for (const backend of backends) results.push(await send(backend, who, action, input, method, extra));
    expect(results[1], `${who} ${action}: Node differs from PHP`).toEqual(results[0]);
    for (const result of results) expect(result.status, `${who} ${action}: 500`).not.toBe(500);
    return results[0];
  }

  /** site_visit dari halaman situs: Origin domain situs dan peramban Chrome desktop kecuali `headers` menimpanya. */
  async function visit(input: Json, headers: Record<string, string> = {}) {
    const siteId = Number(input.site_id);
    const origin = DOMAIN[siteId as keyof typeof DOMAIN] ? { Origin: `https://${DOMAIN[siteId as keyof typeof DOMAIN]}` } : {};
    const result = await both(null, 'site_visit', input, 'POST', { ...origin, 'User-Agent': UA.chrome, ...headers });
    expect([result.status, result.body], JSON.stringify([input, headers])).toEqual([200, OK]);
  }

  async function rows(sql: string, values: unknown[] = []) {
    const out: Json[][] = [];
    for (const backend of backends) {
      const conn = await env.mysql.createConnection({ ...MYSQL, database: backend.db, dateStrings: true });
      out.push((await conn.query(sql, values))[0] as Json[]);
      await conn.end();
    }
    expect(out[1], `${sql}: Node database differs from PHP`).toEqual(out[0]);
    return out[0];
  }

  async function exec(sql: string, values: unknown[] = []) {
    for (const backend of backends) {
      const conn = await env.mysql.createConnection({ ...MYSQL, database: backend.db, multipleStatements: true });
      await conn.query(sql, values);
      await conn.end();
    }
  }

  /** Baris statistik satu situs hari ini sebagai { 'metric dim': [views, visits, visitors] }; jam = 'hour HH'. */
  async function counts(siteId: number) {
    const list = await rows('SELECT day, metric, dim, views, visits, visitors FROM site_visit_stats WHERE site_id = ? ORDER BY metric, dim', [siteId]);
    const out: Record<string, number[]> = {};
    for (const r of list) {
      expect(r.day).toBe(wibDay());
      let dim = String(r.dim);
      if (r.metric === 'hour') {
        expect(dim).toMatch(/^([01]\d|2[0-3])$/);
        const now = Number(new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(11, 13));
        expect([now, (now + 23) % 24]).toContain(Number(dim));
        dim = 'HH';
      }
      out[`${r.metric} ${dim}`] = [Number(r.views), Number(r.visits), Number(r.visitors)];
    }
    return out;
  }

  beforeAll(async () => {
    for (const name of ['php', 'node'] as const) {
      const db = `sstat_${name}_${dbSuffix}`;
      const admin = await env.mysql.createConnection({ ...MYSQL, multipleStatements: true });
      await admin.query(`CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await admin.end();
      const conn = await env.mysql.createConnection({ ...MYSQL, database: db, multipleStatements: true });
      await conn.query(SCHEMA);
      await conn.query(FIXTURES);
      await conn.end();
      const port = await freePort();
      const dir = join(tmp, name);
      mkdirSync(join(dir, 'public'), { recursive: true });
      mkdirSync(join(dir, 'tmp'), { recursive: true });
      const vars = { ...process.env, MYSQL_HOST: MYSQL.host, MYSQL_USER: MYSQL.user, MYSQL_PASS: MYSQL.password, MYSQL_DB: db, AUTH_SECRET, TRUST_PROXY: '0' };
      // PHP: batas laju disimpan di folder temp sistem; folder sendiri per tes supaya sama dengan Node (memori proses)
      const proc = name === 'php'
        ? spawn('php', ['-d', `sys_temp_dir=${join(dir, 'tmp')}`, '-S', `127.0.0.1:${port}`, '-t', join(ROOT, 'backend')], {
          env: { ...vars, PUBLIC_DIR: join(dir, 'public') }, stdio: 'ignore',
        })
        : spawn(process.execPath, [join(ROOT, 'backend', 'server.js')], {
          cwd: join(ROOT, 'backend'), env: { ...vars, PORT: String(port), PD_STORAGE_DIR: join(dir, 'storage'), NODE_ENV: 'test' }, stdio: 'ignore',
        });
      const base = `http://127.0.0.1:${port}`;
      await waitUntilUp(base, proc);
      backends.push({ name, base, db, proc });
    }
  }, 120_000);

  afterAll(async () => {
    for (const backend of backends) backend.proc.kill();
    for (const backend of backends) {
      if (!/^sstat_(php|node)_[0-9a-f]{8}$/.test(backend.db)) continue;
      const admin = await env.mysql.createConnection(MYSQL);
      await admin.query(`DROP DATABASE IF EXISTS \`${backend.db}\``);
      await admin.end();
    }
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }, 60_000);

  it('tidak dihitung tetapi tetap { success: true }: perayap, situs nonaktif/tidak ada, Origin lain, path tidak sah', async () => {
    const page = { site_id: 701, path: '/', referrer: '', utm_source: '', first: true };
    for (const ua of [UA.googlebot, UA.headless, UA.lighthouse, UA.pingdom, UA.uptime, UA.facebook, UA.empty]) {
      await visit(page, { 'User-Agent': ua });
    }
    for (const origin of ['https://garudanexa.com', `https://${DOMAIN[703]}`, `https://${DOMAIN[701]}.evil.test`, `https://x${DOMAIN[701]}`,
      `https://www.www.${DOMAIN[701]}`, 'null']) {
      await visit(page, { Origin: origin });
    }
    // Tanpa Origin, Referer dari situs lain / tidak ada sama sekali
    await visit(page, { Origin: '', Referer: 'https://garudanexa.com/akun/situs/701' });
    await visit(page, { Origin: '' });
    // Origin situs ini tetapi Referer situs lain: Origin yang menentukan
    await visit(page, { Origin: 'https://garudanexa.com', Referer: `https://${DOMAIN[701]}/` });
    for (const path of ['berita', '/a b', '', '/é', null, 12, ['/']]) await visit({ ...page, path });
    // Path yang bukan rute tampil di situs ini (Origin benar, peramban berbeda tiap kali): path buatan skrip, garis miring
    // di akhir, tulisan yang tidak ada / draf / jenis lain, slug tidak sah — tidak membuat baris page/referrer baru
    for (const [i, path] of ['/buy-cheap-x-1', '/profil', '/index.html', '/berita/', '/berita/juara-lomba-sains/', '/berita/tidak-ada',
      '/pengumuman/juara-lomba-sains', '/pengumuman/rapat-guru', '/berita/Juara', '/berita/a/b', '/Berita'].entries()) {
      await visit({ ...page, path, referrer: `https://spam-site-${i}.example/` }, { 'User-Agent': `${UA.chrome} junk${i}` });
    }
    // Tanpa fitur Berita & Pengumuman (template tanpa tulisan 705, fitur dinonaktifkan 707): hanya beranda yang tampil
    for (const path of ['/berita', '/pengumuman', '/berita/kabar-sekolah']) {
      await visit({ site_id: 705, path, first: true });
      await visit({ site_id: 707, path, first: true });
    }
    await visit({ site_id: 702, path: '/', first: true });
    await visit({ site_id: 999, path: '/', first: true }, { Origin: `https://${DOMAIN[701]}` });
    await visit({ site_id: 0, path: '/', first: true });
    await visit({ path: '/', first: true });

    expect(await rows('SELECT * FROM site_visit_stats')).toEqual([]);
    expect(await rows('SELECT * FROM site_visitors')).toEqual([]);
    // site_visit hanya POST; aksi tidak perlu token
    const get = await both(null, 'site_visit', { site_id: '701', path: '/' }, 'GET');
    expect([get.status, get.body]).toEqual([405, { error: 'Gunakan metode POST untuk aksi ini.', code: 'METHOD_NOT_ALLOWED' }]);
  }, 120_000);

  it('dihitung dengan Origin domain situs (www. juga) atau Referer bila Origin kosong; first menambah kunjungan, sumber, perangkat, browser', async () => {
    await visit({ site_id: 701, path: '/berita/juara-lomba-sains?utm_source=abc#atas', referrer: 'https://www.google.co.id/search?q=sekolah', utm_source: '', first: true });
    expect(await counts(701)).toEqual({
      'total ': [1, 1, 1],
      'page /berita/juara-lomba-sains': [1, 1, 0],
      'hour HH': [1, 1, 0],
      'source mesin_pencari': [0, 1, 0],
      'referrer google.co.id': [0, 1, 0],
      'device desktop': [0, 1, 1],
      'browser Chrome': [0, 1, 0],
    });

    // Halaman berikutnya di sesi yang sama (first false, perujuk = situs sendiri) dari www.: hanya tampilan
    await visit({ site_id: '701', path: '/', referrer: `https://${DOMAIN[701]}/berita/juara-lomba-sains`, utm_source: 'abc', first: false },
      { Origin: `https://WWW.${DOMAIN[701]}` });
    // Tanpa Origin: Referer halaman situs
    await visit({ site_id: 701, path: '/pengumuman', first: 'false' }, { Origin: '', Referer: `https://www.${DOMAIN[701]}/pengumuman` });
    expect(await counts(701)).toEqual({
      'total ': [3, 1, 1],
      'page /': [1, 0, 0],
      'page /berita/juara-lomba-sains': [1, 1, 0],
      'page /pengumuman': [1, 0, 0],
      'hour HH': [3, 1, 0],
      'source mesin_pencari': [0, 1, 0],
      'referrer google.co.id': [0, 1, 0],
      'device desktop': [0, 1, 1],
      'browser Chrome': [0, 1, 0],
    });
    // Pengunjung unik = hash harian, IP tidak disimpan; sama di kedua backend
    expect(await rows('SELECT site_id, day, visitor FROM site_visitors')).toEqual([
      { site_id: 701, day: wibDay(), visitor: visitorHash(701, wibDay(), '127.0.0.1', UA.chrome) },
    ]);
    // PHP: berkas batas laju di folder temp dinamai hash kunci HMAC, bukan hash "sv|{ip}" yang bisa dicocokkan ke IP
    const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
    const limitFiles = readdirSync(join(tmp, 'php', 'tmp', 'garudanexa-rate-limit'));
    expect(limitFiles).toContain(`${sha256(`sv|${crypto.createHmac('sha256', AUTH_SECRET).update('127.0.0.1').digest('hex')}`)}.json`);
    expect(limitFiles).not.toContain(`${sha256('sv|127.0.0.1')}.json`);

    // Situs tanpa fitur Berita & Pengumuman: beranda tetap dihitung
    await visit({ site_id: 707, path: '/', first: false });
    expect(await counts(707)).toEqual({ 'total ': [1, 0, 1], 'page /': [1, 0, 0], 'hour HH': [1, 0, 0], 'device desktop': [0, 0, 1] });
  }, 60_000);

  it('pengunjung unik per hari: peramban lain = pengunjung baru; sesi baru orang yang sama = kunjungan, bukan pengunjung', async () => {
    await visit({ site_id: 701, path: '/', referrer: 'https://l.facebook.com/l.php?u=x', first: true }, { 'User-Agent': UA.iphone });
    await visit({ site_id: 701, path: '/berita', utm_source: 'WhatsApp', first: 1 }, { 'User-Agent': UA.iphone });
    await visit({ site_id: 701, path: '/berita', first: '1' }, { 'User-Agent': UA.ipad });
    // Penanda kemarin tidak membuat pengunjung hari ini lama
    await exec('INSERT INTO site_visitors (site_id, day, visitor) VALUES (701, ?, ?)', [wibDay(1), visitorHash(701, wibDay(1), '127.0.0.1', UA.firefox)]);
    await visit({ site_id: 701, path: '/', first: true }, { 'User-Agent': UA.firefox });
    expect(await counts(701)).toEqual({
      'total ': [7, 5, 4],
      'page /': [3, 2, 0],
      'page /berita': [2, 2, 0],
      'page /berita/juara-lomba-sains': [1, 1, 0],
      'page /pengumuman': [1, 0, 0],
      'hour HH': [7, 5, 0],
      'source langsung': [0, 2, 0],
      'source media_sosial': [0, 2, 0],
      'source mesin_pencari': [0, 1, 0],
      'referrer google.co.id': [0, 1, 0],
      'referrer l.facebook.com': [0, 1, 0],
      'referrer utm:whatsapp': [0, 1, 0],
      'device desktop': [0, 2, 2],
      'device mobile': [0, 2, 1],
      'device tablet': [0, 1, 1],
      'browser Chrome': [0, 1, 0],
      'browser Firefox': [0, 1, 0],
      'browser Safari': [0, 3, 0],
    });
    expect(await rows('SELECT COUNT(*) AS n FROM site_visitors WHERE site_id = 701 AND day = ?', [wibDay()])).toEqual([{ n: 4 }]);
  }, 60_000);

  it('grup sumber dan perujuk tersimpan sesuai tabel §2 (perujuk situs sendiri = langsung, utm sebagai utm:x)', async () => {
    const cases: [string, string, string, string | null][] = [
      ['https://gemini.google.com/app', '', 'ai', 'gemini.google.com'],
      ['', 'chatgpt.com', 'ai', 'utm:chatgpt.com'],
      ['https://www.bing.com/search?q=x', 'newsletter', 'mesin_pencari', 'bing.com'],
      ['https://t.co/abc', '', 'media_sosial', 't.co'],
      ['', 'instagram', 'media_sosial', 'utm:instagram'],
      ['https://news.google.com/', '', 'lainnya', 'news.google.com'],
      ['', 'brosur_2026', 'lainnya', 'utm:brosur_2026'],
      ['', '', 'langsung', null],
      [`https://www.${DOMAIN[705]}/profil`, '', 'langsung', null],
      [`https://${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.contoh.com/`, '', 'lainnya', `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.contoh.com`.slice(0, 191)],
    ];
    for (const [referrer, utm] of cases) await visit({ site_id: 705, path: '/', referrer, utm_source: utm, first: true });
    const got = await counts(705);
    const expected: Record<string, number[]> = {};
    for (const [, , group, from] of cases) {
      expected[`source ${group}`] = [0, (expected[`source ${group}`]?.[1] ?? 0) + 1, 0];
      if (from) expected[`referrer ${from}`] = [0, 1, 0];
    }
    for (const [key, value] of Object.entries(expected)) expect(got[key], key).toEqual(value);
    expect(Object.keys(got).filter((k) => k.startsWith('source ') || k.startsWith('referrer ')).sort()).toEqual(Object.keys(expected).sort());
    expect(got['page /']).toEqual([cases.length, cases.length, 0]);
  }, 60_000);

  it('batas perujuk: maks. 200 perujuk berbeda per situs per hari, perujuk baru sesudahnya di baris "*" (dasbor "Perujuk lain")', async () => {
    const referrerRows = async () =>
      Number((await rows("SELECT COUNT(*) AS n FROM site_visit_stats WHERE site_id = 705 AND day = ? AND metric = 'referrer'", [wibDay()]))[0].n);
    const before = await referrerRows();
    const fill = Array.from({ length: 200 - before }, (_, i) => `(705, '${wibDay()}', 'referrer', 'cap-${i}.test', 0, 1, 0)`);
    await exec(`INSERT INTO site_visit_stats (site_id, day, metric, dim, views, visits, visitors) VALUES ${fill.join(', ')}`);
    const lainnya = (await counts(705))['source lainnya'][1];

    await visit({ site_id: 705, path: '/', referrer: 'https://cap-0.test/a', first: true }); // sudah punya baris: tetap ditambah
    await visit({ site_id: 705, path: '/', referrer: 'https://baru.example/', first: true }); // baru, lewat batas
    await visit({ site_id: 705, path: '/', utm_source: 'promo_baru', first: true }); // baru, lewat batas
    const got = await counts(705);
    expect(got['referrer cap-0.test']).toEqual([0, 2, 0]);
    expect(got['referrer *']).toEqual([0, 2, 0]);
    expect(got['referrer baru.example']).toBeUndefined();
    expect(got['referrer utm:promo_baru']).toBeUndefined();
    expect(await referrerRows()).toBe(201);
    // Grup sumber tetap dari perujuk aslinya
    expect(got['source lainnya'][1]).toBe(lainnya + 3);

    const week = await both('customer', 'customer_get_site_stats', { site_id: '705', range: '7' }, 'GET');
    expect((week.body.referrers as Json[]).slice(0, 2)).toEqual([{ host: 'Perujuk lain', visits: 2 }, { host: 'cap-0.test', visits: 2 }]);
    await exec("DELETE FROM site_visit_stats WHERE site_id = 705 AND metric = 'referrer' AND (dim LIKE 'cap-%.test' OR dim = '*')");
  }, 60_000);

  it('dasbor: rentang 7, isi 0 setiap hari, periode sebelumnya, hari ini, judul halaman, sumber, perujuk, perangkat, browser, jam', async () => {
    const S = 706;
    const values: string[] = [];
    const put = (back: number, metric: string, dim: string, views: number, visitsN: number, visitors = 0) =>
      values.push(`(${S}, '${wibDay(back)}', '${metric}', '${dim}', ${views}, ${visitsN}, ${visitors})`);
    // total: dalam 7 hari (0, 1, 6), periode sebelumnya (7, 13), di luar keduanya (14), rentang 30 (29) dan sebelumnya (40), 365 (400)
    put(0, 'total', '', 5, 3, 2);
    put(1, 'total', '', 10, 4, 3);
    put(6, 'total', '', 7, 2, 2);
    put(7, 'total', '', 100, 50, 40);
    put(13, 'total', '', 1, 1, 1);
    put(14, 'total', '', 999, 99, 9);
    put(29, 'total', '', 2, 2, 2);
    put(40, 'total', '', 3, 3, 3);
    put(400, 'total', '', 4, 4, 4);
    for (const [path, views] of [['/', 12], ['/berita', 3], ['/berita/juara-lomba-sains', 8], ['/pengumuman/libur-semester', 8], ['/pengumuman', 1],
      ['/berita/tidak-ada', 2], ['/pengumuman/juara-lomba-sains', 2], ['/profil', 2], ['/p1', 1], ['/p2', 1], ['/p3', 1]] as const) {
      put(0, 'page', path, views - 1, 0);
      put(1, 'page', path, 1, 1);
    }
    put(7, 'page', '/lama', 50, 50);
    for (const [key, n] of [['mesin_pencari', 4], ['ai', 1], ['langsung', 2], ['tidak_dikenal', 9]] as const) put(2, 'source', key, 0, n);
    put(8, 'source', 'media_sosial', 0, 30);
    const referrerVisits = [['google.co.id', 9], ['utm:whatsapp', 7], ['chatgpt.com', 7], ['bing.com', 5], ['a.test', 4], ['b.test', 4],
      ['c.test', 3], ['d.test', 3], ['e.test', 2], ['f.test', 2], ['g.test', 1], ['h.test', 1]] as const;
    for (const [host, n] of referrerVisits) put(3, 'referrer', host, 0, n);
    put(0, 'device', 'desktop', 0, 3, 2);
    put(1, 'device', 'mobile', 0, 5, 4);
    for (const [name, n] of [['Chrome', 9], ['Safari', 4], ['Edge', 4], ['Firefox', 2], ['Unknown', 2], ['Internet Explorer', 1], ['Opera', 1]] as const) {
      put(4, 'browser', name, 0, n);
    }
    put(0, 'hour', '00', 2, 1);
    put(1, 'hour', '00', 1, 0);
    put(5, 'hour', '07', 9, 3);
    put(6, 'hour', '23', 1, 1);
    put(9, 'hour', '12', 50, 5);
    await exec(`INSERT INTO site_visit_stats (site_id, day, metric, dim, views, visits, visitors) VALUES ${values.join(', ')}`);

    const week = await both('customer', 'customer_get_site_stats', { site_id: String(S), range: '7' }, 'GET');
    expect(week.status).toBe(200);
    const zero = { views: 0, visits: 0, visitors: 0 };
    const daily = [6, 5, 4, 3, 2, 1, 0].map((back) => ({
      day: wibDay(back),
      ...({ 0: { views: 5, visits: 3, visitors: 2 }, 1: { views: 10, visits: 4, visitors: 3 }, 6: { views: 7, visits: 2, visitors: 2 } } as Record<number, typeof zero>)[back] ?? zero,
    }));
    expect(week.body).toEqual({
      success: true,
      range: 7,
      from: wibDay(6),
      to: wibDay(0),
      totals: { views: 22, visits: 9, visitors: 7 },
      previous: { views: 101, visits: 51, visitors: 41 },
      today: { views: 5, visits: 3, visitors: 2 },
      daily,
      pages: [
        { path: '/', title: 'Beranda', views: 12 },
        { path: '/berita/juara-lomba-sains', title: 'Juara Lomba Sains', views: 8 },
        { path: '/pengumuman/libur-semester', title: 'Libur Semester', views: 8 },
        { path: '/berita', title: 'Berita', views: 3 },
        { path: '/berita/tidak-ada', title: null, views: 2 },
        { path: '/pengumuman/juara-lomba-sains', title: null, views: 2 },
        { path: '/profil', title: null, views: 2 },
        { path: '/p1', title: null, views: 1 },
        { path: '/p2', title: null, views: 1 },
        { path: '/p3', title: null, views: 1 },
      ],
      sources: [
        { key: 'mesin_pencari', label: 'Mesin pencari', visits: 4 },
        { key: 'media_sosial', label: 'Media sosial', visits: 0 },
        { key: 'ai', label: 'Asisten AI', visits: 1 },
        { key: 'lainnya', label: 'Situs lain', visits: 0 },
        { key: 'langsung', label: 'Langsung', visits: 2 },
      ],
      referrers: [
        { host: 'google.co.id', visits: 9 },
        { host: 'chatgpt.com', visits: 7 },
        { host: 'whatsapp (utm)', visits: 7 },
        { host: 'bing.com', visits: 5 },
        { host: 'a.test', visits: 4 },
        { host: 'b.test', visits: 4 },
        { host: 'c.test', visits: 3 },
        { host: 'd.test', visits: 3 },
        { host: 'e.test', visits: 2 },
        { host: 'f.test', visits: 2 },
      ],
      devices: [
        { key: 'desktop', label: 'Komputer', visits: 3, visitors: 2 },
        { key: 'mobile', label: 'HP', visits: 5, visitors: 4 },
        { key: 'tablet', label: 'Tablet', visits: 0, visitors: 0 },
      ],
      browsers: [
        { name: 'Chrome', visits: 9 },
        { name: 'Edge', visits: 4 },
        { name: 'Safari', visits: 4 },
        { name: 'Firefox', visits: 2 },
        { name: 'Unknown', visits: 2 },
        { name: 'Internet Explorer', visits: 1 },
      ],
      hours: Array.from({ length: 24 }, (_, hour) => ({ hour, views: ({ 0: 3, 7: 9, 23: 1 } as Record<number, number>)[hour] ?? 0 })),
      tracking_since: wibDay(400),
    });

    // Bawaan 30 hari (juga lewat POST); rentang lebih panjang membawa data lama
    const month = await both('customer', 'customer_get_site_stats', { site_id: S });
    expect(month.status).toBe(200);
    expect(month.body).toMatchObject({ range: 30, from: wibDay(29), to: wibDay(0), totals: { views: 1124, visits: 161, visitors: 59 }, previous: { views: 3, visits: 3, visitors: 3 } });
    expect((month.body.daily as Json[]).length).toBe(30);
    expect((month.body.pages as Json[])[0]).toEqual({ path: '/lama', title: null, views: 50 });
    expect((month.body.sources as Json[])[1]).toEqual({ key: 'media_sosial', label: 'Media sosial', visits: 30 });
    expect((month.body.hours as Json[])[12]).toEqual({ hour: 12, views: 50 });
    const year = await both('customer', 'customer_get_site_stats', { site_id: String(S), range: ' 365 ' }, 'GET');
    expect(year.body).toMatchObject({ range: 365, from: wibDay(364), totals: { views: 1127, visits: 164, visitors: 62 }, previous: { views: 4, visits: 4, visitors: 4 } });
    expect((year.body.daily as Json[]).length).toBe(365);
    const quarter = await both('customer', 'customer_get_site_stats', { site_id: S, range: 90 });
    expect(quarter.body).toMatchObject({ range: 90, from: wibDay(89) });
  }, 60_000);

  it('dasbor: validasi rentang, kepemilikan (status situs apa pun), peran, tanpa data', async () => {
    for (const range of ['14', 'abc', '0', '30.5', '7,30']) {
      const bad = await both('customer', 'customer_get_site_stats', { site_id: '706', range }, 'GET');
      expect([bad.status, bad.body], range).toEqual([400, RANGE_ERROR]);
    }
    const badPost = await both('customer', 'customer_get_site_stats', { site_id: 706, range: 14 });
    expect([badPost.status, badPost.body]).toEqual([400, RANGE_ERROR]);
    for (const siteId of ['703', '9999', '0', 'x']) {
      const foreign = await both('customer', 'customer_get_site_stats', { site_id: siteId }, 'GET');
      expect([foreign.status, foreign.body], siteId).toEqual([404, SITE_NOT_FOUND]);
    }
    // Situs nonaktif milik sendiri tetap bisa dilihat; belum ada data
    const suspended = await both('customer', 'customer_get_site_stats', { site_id: '702', range: '7' }, 'GET');
    expect(suspended.status).toBe(200);
    expect(suspended.body).toMatchObject({ totals: { views: 0, visits: 0, visitors: 0 }, previous: { views: 0, visits: 0, visitors: 0 }, pages: [], referrers: [], browsers: [], tracking_since: null });
    expect((suspended.body.daily as Json[]).every((d) => d.views === 0 && d.visits === 0 && d.visitors === 0)).toBe(true);
    expect((suspended.body.sources as Json[]).map((s) => s.visits)).toEqual([0, 0, 0, 0, 0]);
    const staff = await both('admin', 'customer_get_site_stats', { site_id: '706' }, 'GET');
    expect(staff.status).toBe(403);
    const anonymous = await both(null, 'customer_get_site_stats', { site_id: '706' }, 'GET');
    expect(anonymous.status).toBe(401);
  }, 60_000);

  it('dasbor: batas baca 120 per jam per pengguna (setiap permintaan dihitung)', async () => {
    for (let i = 0; i < 120; i++) {
      for (const backend of backends) {
        const result = await send(backend, 'limited', 'customer_get_site_stats', { site_id: '706' }, 'GET');
        expect(result.status, `${backend.name} #${i}`).toBe(404);
      }
    }
    const limited = await both('limited', 'customer_get_site_stats', { site_id: '706' }, 'GET');
    expect([limited.status, limited.body]).toEqual([429, { error: 'Terlalu banyak percobaan. Coba lagi dalam 60 menit.' }]);
    // Pengguna lain tidak ikut terbatas
    const own = await both('customer', 'customer_get_site_stats', { site_id: '706', range: '7' }, 'GET');
    expect(own.status).toBe(200);
  }, 120_000);

  it('tabel belum ada (migrasi 031 belum dijalankan): dasbor 503 STATS_NOT_READY, site_visit tetap { success: true }', async () => {
    await exec('DROP TABLE site_visit_stats; DROP TABLE site_visitors');
    const dashboard = await both('customer', 'customer_get_site_stats', { site_id: '706' }, 'GET');
    expect([dashboard.status, dashboard.body]).toEqual([503, NOT_READY]);
    await visit({ site_id: 701, path: '/', first: true });
    // Kepemilikan dan validasi tetap dicek lebih dulu
    const foreign = await both('customer', 'customer_get_site_stats', { site_id: '703' }, 'GET');
    expect(foreign.status).toBe(404);
    // Migrasi 031 membuat lagi tabelnya (aman diulang), lalu pencatatan jalan lagi
    for (let i = 0; i < 2; i++) await exec(MIGRATION);
    expect(await rows("SELECT version FROM schema_migrations WHERE version = '2026-10-27_031'")).toEqual([{ version: '2026-10-27_031' }]);
    await visit({ site_id: 701, path: '/', first: true });
    expect(await counts(701)).toMatchObject({ 'total ': [1, 1, 1], 'page /': [1, 1, 0] });
  }, 60_000);
});
