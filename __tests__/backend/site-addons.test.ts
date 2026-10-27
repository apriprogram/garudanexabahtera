// @vitest-environment node
// Fitur tambahan berbayar "Berita & Pengumuman" per situs pembeli (docs/platform/SITE-ADDONS-SPEC.md §2–§4).
//
// 1. Pemasangan dan konstanta: daftar aksi & aksi GET backend/modules/site_addons.php = site_addons.js, akses di api.php =
//    security.js, modul dipanggil api.php/server.js, konstanta = src/types/siteAddons.ts, catatan riwayat yang dilihat
//    pembeli, migrasi 030 aman untuk phpMyAdmin dan tabelnya sama dengan database/schema.sql, MIDTRANS_TEST_URL hanya
//    untuk localhost dan tidak pernah di produksi.
// 2. Migrasi 030 di database sementara: situs yang sudah punya tulisan mewarisi fitur (source migrasi), aman diulang.
// 3. backend/api.php (`php -S`) dan backend/server.js berdampingan, masing-masing di database sementara dari
//    database/schema.sql + seed.sql, dengan Midtrans palsu (MIDTRANS_TEST_URL: Snap, Status API, expire) dan simulator.
//    Setiap request dikirim ke PHP lalu Node; status dan JSON harus sama setelah nomor tagihan dan waktu diseragamkan:
//    beli → Snap → simulasi → aktif, gerbang tulisan POSTS_LOCKED / publik kosong, batal, ADDON_ACTIVE / ADDON_PENDING /
//    ADDON_UNAVAILABLE / SITE_SUSPENDED, notifikasi GNF- (tanda tangan, jumlah, Status API, ditinjau bank, kedaluwarsa,
//    bayar ulang, bayar dobel, bayar setelah batal), nota, admin aktifkan/nonaktifkan, batas 20 per jam, dan tabel yang
//    belum ada (503 ADDONS_NOT_READY untuk aksi yang menulis, bacaan tetap jalan, tidak pernah 500).
// Bagian 2–3 butuh `php` dengan mysqli, MySQL/MariaDB (PD_TEST_MYSQL_HOST / _USER / _PASS) dan dependensi backend/
// (`npm ci` di backend/); dilewati bila tidak ada. Database: saddmig_<hex>, sadd_<php|node>_<hex>.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import { createServer as createHttpServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ADDON_NUMBER_PREFIX,
  ADDON_POSTS_PRICE_DEFAULT,
  ADDON_POSTS_PRICE_SETTING,
  SITE_ADDON_NAME,
  SITE_ADDON_STATUS_LABEL,
} from '../../src/types/siteAddons';

const ROOT = resolve(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8');
const API_PHP = read('backend', 'api.php');
const SECURITY_JS = read('backend', 'security.js');
const SERVER_JS = read('backend', 'server.js');
const MODULE_PHP = read('backend', 'modules', 'site_addons.php');
const MODULE_JS = read('backend', 'modules', 'site_addons.js');
const TEMPLATES_PHP = read('backend', 'modules', 'templates.php');
const TEMPLATES_JS = read('backend', 'modules', 'templates.js');
const MIGRATION = read('database', 'migrations', '2026-10-27_030_site_addons.sql');
const SCHEMA = read('database', 'schema.sql');
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo "ok";'], { encoding: 'utf8' }).stdout === 'ok';

/* ─────────────────────────── 1. Pemasangan, konstanta, migrasi ─────────────────────────── */

/** Isi daftar PHP `const NAME = [ ... ];` atau Set Node `NAME = new Set([ ... ])` sebagai daftar string. */
function listOf(source: string, pattern: RegExp): string[] {
  const match = source.match(pattern);
  if (!match) throw new Error(`list not found: ${pattern}`);
  return [...match[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}
const phpList = (source: string, name: string) => listOf(source, new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
const jsSet = (source: string, name: string) => listOf(source, new RegExp(`${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`));

const CUSTOMER = ['customer_get_site_addons', 'customer_buy_site_addon', 'customer_pay_site_addon', 'customer_cancel_site_addon', 'dev_simulate_site_addon_payment'];
const ADMIN = ['admin_set_site_addon'];

/** Isi CREATE TABLE site_addon_orders tanpa komentar dan spasi berlebih (migrasi = schema.sql). */
function tableDefinition(sql: string): string {
  const match = sql.match(/CREATE TABLE IF NOT EXISTS site_addon_orders \(([\s\S]*?)\) ENGINE=InnoDB[^;]*;/);
  if (!match) throw new Error('site_addon_orders not found');
  return match[0].replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').trim();
}

describe('site_addons: pemasangan dan konstanta (PHP = Node = src/types/siteAddons.ts)', () => {
  it('aksi dan aksi GET modul PHP = modul Node', async () => {
    const { SITE_ADDON_ACTIONS } = (await import('../../backend/modules/site_addons.js')) as { SITE_ADDON_ACTIONS: string[] };
    const phpHandlers = [...MODULE_PHP.match(/static \$handlers = \[([\s\S]*?)\];/)![1].matchAll(/'([a-z_]+)' => 'sa_/g)].map((m) => m[1]);
    expect([...SITE_ADDON_ACTIONS].sort()).toEqual([...CUSTOMER, ...ADMIN].sort());
    expect(phpHandlers.sort()).toEqual([...SITE_ADDON_ACTIONS].sort());
    expect(phpList(MODULE_PHP, 'SA_GET_ACTIONS')).toEqual(['customer_get_site_addons']);
    expect(jsSet(MODULE_JS, 'GET_ACTIONS')).toEqual(['customer_get_site_addons']);
  });

  it('akses: aksi pembeli di CUSTOMER_ACTIONS, admin_set_site_addon di ADMIN_ACTIONS (api.php = security.js), tidak publik', () => {
    for (const [source, customer, admin, pub] of [
      [API_PHP, phpList(API_PHP, 'CUSTOMER_ACTIONS'), phpList(API_PHP, 'ADMIN_ACTIONS'), phpList(API_PHP, 'PUBLIC_ACTIONS')],
      [SECURITY_JS, jsSet(SECURITY_JS, 'CUSTOMER_ACTIONS'), jsSet(SECURITY_JS, 'ADMIN_ACTIONS'), jsSet(SECURITY_JS, 'PUBLIC_ACTIONS')],
    ] as const) {
      void source;
      for (const action of CUSTOMER) {
        expect(customer).toContain(action);
        expect(admin).not.toContain(action);
      }
      expect(admin).toContain('admin_set_site_addon');
      expect(customer).not.toContain('admin_set_site_addon');
      for (const action of [...CUSTOMER, ...ADMIN]) expect(pub).not.toContain(action);
      expect(pub).toContain('midtrans_notification');
    }
  });

  it('api.php memuat modul dan memanggilnya setelah cek token; server.js di GET dan POST; GNF- diteruskan dari notifikasi', () => {
    expect(API_PHP).toContain("require_once __DIR__ . '/modules/site_addons.php';");
    expect(API_PHP.indexOf('handle_site_addon_action($conn, $action, $input, $authUser)')).toBeGreaterThan(API_PHP.indexOf('$authUser = authorize_request('));
    expect(SERVER_JS).toContain("import { handleSiteAddonAction } from './modules/site_addons.js';");
    expect(SERVER_JS.match(/await handleSiteAddonAction\(action, req\.(query|body), req, res, pool\)/g)).toEqual([
      'await handleSiteAddonAction(action, req.query, req, res, pool)',
      'await handleSiteAddonAction(action, req.body, req, res, pool)',
    ]);
    expect(TEMPLATES_PHP).toMatch(/if \(strncmp\(\$orderId, 'GNF-', 4\) === 0\) \{\s+sa_midtrans_notification\(\$conn, \$cfg, \$input, \$orderId, \$gross\);/);
    expect(TEMPLATES_JS).toMatch(/if \(orderId\.startsWith\('GNF-'\)\) \{\s+await addonNotification\(pool, cfg, input, orderId, gross\);/);
  });

  it('nama, label status, harga bawaan, setting harga dan awalan nomor = src/types/siteAddons.ts', async () => {
    const { ADDON_PRICE_DEFAULT, ADDON_PRICE_SETTING } = (await import('../../backend/modules/site_addons.js')) as {
      ADDON_PRICE_DEFAULT: Record<string, number>;
      ADDON_PRICE_SETTING: Record<string, string>;
    };
    expect(ADDON_PRICE_DEFAULT).toEqual({ posts: ADDON_POSTS_PRICE_DEFAULT });
    expect(ADDON_PRICE_SETTING).toEqual({ posts: ADDON_POSTS_PRICE_SETTING });
    expect(ADDON_POSTS_PRICE_DEFAULT).toBe(350000);
    expect(MODULE_PHP).toContain(`const SA_PRICE_SETTING = ['posts' => '${ADDON_POSTS_PRICE_SETTING}'];`);
    expect(MODULE_PHP).toContain(`const SA_PRICE_DEFAULT = ['posts' => ${ADDON_POSTS_PRICE_DEFAULT}];`);
    expect(MODULE_PHP).toContain(`const SA_NAME = ['posts' => '${SITE_ADDON_NAME.posts}'];`);
    expect(MODULE_JS).toContain(`const NAME = { posts: '${SITE_ADDON_NAME.posts}' };`);
    for (const [status, label] of Object.entries(SITE_ADDON_STATUS_LABEL)) {
      expect(MODULE_PHP).toContain(`'${status}' => '${label}',`);
      expect(MODULE_JS).toContain(`${status}: '${label}',`);
    }
    expect(ADDON_NUMBER_PREFIX).toBe('GNF-');
    expect(MODULE_PHP).toContain("pf_new_order_number('GNF')");
    expect(MODULE_JS).toContain("newOrderNumber('GNF')");
  });

  it('catatan riwayat yang dilihat pembeli: addon_created/paid/cancelled ya, addon_granted/revoked tidak (PHP = Node)', () => {
    const php = phpList(TEMPLATES_PHP, 'PF_CUSTOMER_NOTE_EVENTS');
    const node = listOf(TEMPLATES_JS, /const CUSTOMER_NOTE_EVENTS = \[([\s\S]*?)\];/);
    expect(php).toEqual(node);
    expect(php).toEqual(expect.arrayContaining(['addon_created', 'addon_paid', 'addon_cancelled']));
    expect(php).not.toContain('addon_granted');
    expect(php).not.toContain('addon_revoked');
  });

  it('migrasi 030: tanpa ALTER/prosedur/DROP, aman diulang, tabel = schema.sql, baseline schema_migrations', () => {
    const code = MIGRATION.replace(/--[^\n]*/g, '');
    expect(code).not.toMatch(/\b(ALTER|PROCEDURE|DELIMITER|DROP|DELETE|information_schema)\b/i);
    expect(code).toMatch(/CREATE TABLE IF NOT EXISTS site_addon_orders/);
    expect(code).toMatch(/INSERT IGNORE INTO site_addon_orders/);
    expect(code).toMatch(/INSERT IGNORE INTO schema_migrations \(version, description\)\s+VALUES \('2026-10-27_030'/);
    expect(tableDefinition(MIGRATION)).toBe(tableDefinition(SCHEMA));
    expect(SCHEMA).toMatch(/\('2026-10-27_030', 'baseline: site_addon_orders/);
    expect(read('database', 'README.md')).toContain('2026-10-27_030_site_addons.sql');
  });
});

describe('MIDTRANS_TEST_URL: hanya http localhost, tidak pernah di produksi (templates.php = templates.js)', () => {
  const CASES: [Record<string, string>, string][] = [
    [{ MIDTRANS_TEST_URL: 'http://127.0.0.1:4567' }, 'http://127.0.0.1:4567'],
    [{ MIDTRANS_TEST_URL: 'http://localhost:9/' }, 'http://localhost:9'],
    [{ MIDTRANS_TEST_URL: 'https://evil.example' }, 'https://api.sandbox.midtrans.com'],
    [{ MIDTRANS_TEST_URL: 'http://127.0.0.1.evil.example' }, 'https://api.sandbox.midtrans.com'],
    [{ MIDTRANS_TEST_URL: 'http://127.0.0.1:4567', MIDTRANS_IS_PRODUCTION: '1' }, 'https://api.midtrans.com'],
  ];

  it('Node: apiBase / snapUrl', async () => {
    const { midtransConfig } = (await import('../../backend/modules/templates.js')) as { midtransConfig: () => { apiBase: string; snapUrl: string } };
    const saved = { url: process.env.MIDTRANS_TEST_URL, prod: process.env.MIDTRANS_IS_PRODUCTION };
    try {
      for (const [env, base] of CASES) {
        process.env.MIDTRANS_TEST_URL = env.MIDTRANS_TEST_URL;
        process.env.MIDTRANS_IS_PRODUCTION = env.MIDTRANS_IS_PRODUCTION ?? '0';
        const cfg = midtransConfig();
        expect(cfg.apiBase, JSON.stringify(env)).toBe(base);
        expect(cfg.snapUrl.startsWith(base.replace('api.', 'app.'))).toBe(true);
      }
    } finally {
      for (const [key, value] of [['MIDTRANS_TEST_URL', saved.url], ['MIDTRANS_IS_PRODUCTION', saved.prod]] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it.skipIf(!PHP_AVAILABLE)('PHP sama dengan Node', () => {
    const block = (name: string) => {
      const match = TEMPLATES_PHP.match(new RegExp(`^function ${name}\\([\\s\\S]*?^}\\r?$`, 'm'));
      if (!match) throw new Error(name);
      return match[0];
    };
    for (const [env, base] of CASES) {
      const code = `function env_value($k, $d = '') { $v = getenv($k); return $v === false || $v === '' ? $d : $v; }
        ${block('pf_midtrans_test_url')}
        ${block('pf_midtrans_config')}
        echo pf_midtrans_config()['api_base'];`;
      const res = spawnSync('php', ['-r', code], { encoding: 'utf8', env: { ...process.env, MIDTRANS_IS_PRODUCTION: '0', ...env } });
      expect(res.stderr).toBe('');
      expect(res.stdout, JSON.stringify(env)).toBe(base);
    }
  });
});

/* ─────────────────────────── 2–3. Database sungguhan ─────────────────────────── */

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
const AUTH_SECRET = crypto.randomBytes(32).toString('hex');

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
  process.env.AUTH_SECRET = AUTH_SECRET;
  const security = (await import('../../backend/security.js')) as unknown as SecurityModule;
  return { mysql, security };
}
const ENV = await loadEnvironment();
if ('reason' in ENV) console.warn(`[site-addons] database part skipped: ${ENV.reason}`);
type Env = Exclude<typeof ENV, { reason: string }>;
const suite = 'reason' in ENV ? describe.skip : describe;

/** Database kosong dari schema.sql (+ seed.sql); nama dibuang lagi di afterAll. */
async function createDatabase(env: Env, name: string, withSeed: boolean) {
  const admin = await env.mysql.createConnection({ ...MYSQL, multipleStatements: true });
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();
  const conn = await env.mysql.createConnection({ ...MYSQL, database: name, multipleStatements: true, dateStrings: true });
  await conn.query(SCHEMA);
  if (withSeed) await conn.query(read('database', 'seed.sql'));
  return conn;
}
async function dropDatabase(env: Env, name: string, pattern: RegExp) {
  if (!pattern.test(name)) return;
  const admin = await env.mysql.createConnection(MYSQL);
  await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
  await admin.end();
}

suite('migrasi 030: pewarisan situs yang sudah punya tulisan, aman diulang', () => {
  const env = ENV as Env;
  const db = `saddmig_${crypto.randomBytes(4).toString('hex')}`;
  let conn: SqlConn | null = null;
  const run = async (sql: string, values: unknown[] = []) => (await conn!.query(sql, values))[0] as Record<string, unknown>[];

  beforeAll(async () => {
    conn = await createDatabase(env, db, false);
    // Keadaan sebelum 030: tabel belum ada, migrasi belum tercatat
    await run('DROP TABLE site_addon_orders');
    await run("DELETE FROM schema_migrations WHERE version = '2026-10-27_030'");
    await run(`INSERT INTO template_sites (id, order_id, user_id, template_code, domain, status) VALUES
      (1, 11, 21, 'madani', 'satu.sch.id', 'active'), (2, 12, 22, 'corporate-nexa', 'dua.com', 'active'),
      (3, 13, 23, 'cakrawala', 'tiga.sch.id', 'suspended'), (4, 14, 24, 'bestari', 'empat.sch.id', 'active')`);
    await run(`INSERT INTO site_posts (site_id, kind, slug, title, body, status, published_at) VALUES
      (1, 'berita', 'a', 'Berita A', 'Isi', 'published', '2026-10-26'), (1, 'pengumuman', 'b', 'Pengumuman B', 'Isi', 'draft', NULL),
      (3, 'berita', 'c', 'Berita C', 'Isi', 'draft', NULL)`);
  }, 60_000);

  afterAll(async () => {
    await conn?.end();
    await dropDatabase(env, db, /^saddmig_[0-9a-f]{8}$/);
  }, 60_000);

  it('situs dengan tulisan (terbit atau draf) mendapat baris lunas source migrasi; diulang tidak menggandakan atau menghidupkan lagi', async () => {
    await run(MIGRATION);
    const rows = await run('SELECT addon_number, site_id, order_id, user_id, addon_code, price, status, source, payment_status, pending_key, note, paid_at IS NOT NULL AS paid FROM site_addon_orders ORDER BY site_id');
    expect(rows).toEqual([1, 3].map((id) => ({
      addon_number: `GNF-MIGRASI-${id}`, site_id: id, order_id: 10 + id, user_id: 20 + id, addon_code: 'posts', price: '0.00', status: 'lunas',
      source: 'migrasi', payment_status: 'settlement', pending_key: null, note: 'Sudah memakai berita sebelum fitur berbayar', paid: 1,
    })));
    expect(await run("SELECT version FROM schema_migrations WHERE version = '2026-10-27_030'")).toHaveLength(1);

    // Dicabut admin lalu migrasi dijalankan lagi: tetap satu baris per situs, yang dicabut tetap dicabut
    await run("UPDATE site_addon_orders SET revoked_at = NOW() WHERE site_id = 3");
    await run("INSERT INTO site_posts (site_id, kind, slug, title, body, status) VALUES (4, 'berita', 'd', 'Berita D', 'Isi', 'draft')");
    await run(MIGRATION);
    const again = await run('SELECT site_id, revoked_at IS NOT NULL AS revoked FROM site_addon_orders ORDER BY site_id');
    expect(again).toEqual([{ site_id: 1, revoked: 0 }, { site_id: 3, revoked: 1 }, { site_id: 4, revoked: 0 }]);
    expect(await run("SELECT version FROM schema_migrations WHERE version = '2026-10-27_030'")).toHaveLength(1);
  }, 60_000);
});

type Who = 'admin' | 'staff' | 'customer' | 'other' | 'limited';
const USERS: Record<Who, { id: number; role: string; password: string }> = {
  admin: { id: 101, role: 'admin', password: 'hash-admin-101' },
  staff: { id: 102, role: 'user', password: 'hash-staff-102' },
  customer: { id: 103, role: 'customer', password: 'hash-customer-103' },
  other: { id: 104, role: 'customer', password: 'hash-customer-104' },
  limited: { id: 105, role: 'customer', password: 'hash-customer-105' },
};
const LONG_DOMAIN = 'sekolah-menengah-atas-uji.sch.id';
const ORDER = (id: number, number: string, user: number, code: string, name: string, domain: string, status = 'aktif') =>
  `(${id}, '${number}', ${user}, '${name}', '${code}', 1000000.00, 'Klien Uji', 'klien@uji.test', '081234567890', '${domain}', ` +
  `${status === 'aktif' ? `'${domain}'` : 'NULL'}, '${status}', 'settlement', 'simulator', '2026-10-1${id % 10} 09:00:00', ` +
  `${status === 'aktif' ? "'2026-10-1" + (id % 10) + " 10:00:00'" : 'NULL'})`;
const FIXTURES = `
INSERT INTO users (id, name, email, password, phone, role, status, avatar) VALUES
 (101, 'Admin Uji', 'admin@uji.test', 'hash-admin-101', NULL, 'admin', 'active', ''),
 (102, 'Staf Uji', 'staf@uji.test', 'hash-staff-102', NULL, 'user', 'active', ''),
 (103, 'Klien Uji', 'klien@uji.test', 'hash-customer-103', '081234567890', 'customer', 'active', ''),
 (104, 'Klien Lain', 'lain@uji.test', 'hash-customer-104', '081234567891', 'customer', 'active', ''),
 (105, 'Klien Batas', 'batas@uji.test', 'hash-customer-105', '081234567892', 'customer', 'active', '');
INSERT INTO template_orders (id, order_number, user_id, template_name, template_code, price, customer_name, customer_email,
  customer_phone, domain_primary, domain, status, payment_status, payment_type, paid_at, activated_at) VALUES
 ${ORDER(401, 'GN-20261011-SKOLA1', 103, 'madani', 'Madani', LONG_DOMAIN)},
 ${ORDER(402, 'GN-20261012-USAHA2', 103, 'corporate-nexa', 'Corporate Nexa', 'usaha-uji.com')},
 ${ORDER(403, 'GN-20261013-SMKUJ3', 103, 'cakrawala', 'Cakrawala', 'smk-uji.sch.id')},
 ${ORDER(404, 'GN-20261014-LAIN04', 104, 'bestari', 'Bestari', 'sma-lain.sch.id')},
 ${ORDER(405, 'GN-20261015-SMADU5', 103, 'bestari', 'Bestari', 'sma-dua.sch.id')},
 ${ORDER(406, 'GN-20261016-SMATG6', 103, 'madani', 'Madani', 'sma-tiga.sch.id')},
 ${ORDER(407, 'GN-20261017-BARU07', 103, 'madani', 'Madani', 'sma-baru.sch.id', 'menunggu_approval')};
INSERT INTO template_sites (id, order_id, user_id, template_code, domain, status, activated_at) VALUES
 (501, 401, 103, 'madani', '${LONG_DOMAIN}', 'active', '2026-10-20 10:00:00'),
 (502, 402, 103, 'corporate-nexa', 'usaha-uji.com', 'active', '2026-10-19 10:00:00'),
 (503, 403, 103, 'cakrawala', 'smk-uji.sch.id', 'suspended', '2026-10-18 10:00:00'),
 (504, 404, 104, 'bestari', 'sma-lain.sch.id', 'active', '2026-10-22 10:00:00'),
 (505, 405, 103, 'bestari', 'sma-dua.sch.id', 'active', '2026-10-21 10:00:00'),
 (506, 406, 103, 'madani', 'sma-tiga.sch.id', 'active', '2026-10-17 10:00:00');
`;

const SERVER_KEY = 'kunci-server-uji';
const signature = (orderId: string, statusCode: string, gross: string) =>
  crypto.createHash('sha512').update(orderId + statusCode + gross + SERVER_KEY).digest('hex');

interface SnapCall {
  transaction_details: { order_id: string; gross_amount: number };
  item_details: { id: string; price: number; quantity: number; name: string }[];
  customer_details: Record<string, unknown>;
  callbacks: { finish: string };
}

/** Midtrans palsu: Snap (token + halaman bayar per order id), Status API dari `statuses` (selain itu 404), expire dicatat. */
function startFakeMidtrans() {
  const snaps: SnapCall[] = [];
  const expired: string[] = [];
  const statuses = new Map<string, Record<string, string>>();
  const auth = `Basic ${Buffer.from(`${SERVER_KEY}:`).toString('base64')}`;
  const server = createHttpServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const send = (status: number, body: unknown) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
      if (req.headers.authorization !== auth) return send(401, { status_code: '401', status_message: 'Unauthorized' });
      const url = req.url || '';
      if (req.method === 'POST' && url === '/snap/v1/transactions') {
        const body = JSON.parse(raw) as SnapCall;
        snaps.push(body);
        const id = body.transaction_details.order_id;
        return send(201, { token: `tok-${id}`, redirect_url: `https://pay.test/snap/${id}` });
      }
      const status = /^\/v2\/([^/]+)\/status$/.exec(url);
      if (req.method === 'GET' && status) {
        const found = statuses.get(decodeURIComponent(status[1]));
        return found ? send(200, found) : send(404, { status_code: '404', status_message: "Transaction doesn't exist." });
      }
      const expire = /^\/v2\/([^/]+)\/expire$/.exec(url);
      if (req.method === 'POST' && expire) {
        expired.push(decodeURIComponent(expire[1]));
        return send(200, { status_code: '407', transaction_status: 'expire' });
      }
      return send(404, {});
    });
  });
  return new Promise<{ server: Server; url: string; snaps: SnapCall[]; expired: string[]; statuses: typeof statuses }>((done) =>
    server.listen(0, '127.0.0.1', () => done({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, snaps, expired, statuses })),
  );
}

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
  /** Nomor tagihan fitur backend ini (acak per backend) */
  numbers: Record<string, string>;
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

// Waktu MySQL ("2026-10-26 09:30:00") dan ISO 8601 WIB tulisan ("2026-10-26T09:30:00+07:00"): PHP dan Node bisa beda detik
const DATETIME = /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2})?/g;
const NUMBER = /\b(GN[RF]?)-\d{8}-[A-Z0-9]{6}\b/g;
/** Nomor tagihan & waktu berbeda per backend: diseragamkan sebelum dibandingkan. */
const normalize = (value: unknown) => JSON.parse(JSON.stringify(value).replace(NUMBER, '$1-X').replace(DATETIME, 'T')) as unknown;

const LOCKED = { error: 'Fitur Berita & Pengumuman belum aktif untuk situs ini. Aktifkan di menu Fitur tambahan.', code: 'POSTS_LOCKED' };
const NOT_READY = { error: 'Fitur tambahan belum siap. Coba lagi nanti.', code: 'ADDONS_NOT_READY' };
const NOT_FOUND = { error: 'Tagihan fitur tidak ditemukan.', code: 'ADDON_NOT_FOUND' };

suite('fitur tambahan Berita & Pengumuman: PHP api.php = Node server.js', () => {
  const env = ENV as Env;
  const tmp = mkdtempSync(join(tmpdir(), 'sadd-'));
  const dbSuffix = crypto.randomBytes(4).toString('hex');
  const backends: Backend[] = [];
  const tokens = new Map<Who, string>();
  let midtrans: Awaited<ReturnType<typeof startFakeMidtrans>>;
  const token = (who: Who) => {
    if (!tokens.has(who)) tokens.set(who, env.security.issueToken(USERS[who]).token);
    return tokens.get(who) as string;
  };

  async function send(backend: Backend, who: Who | null, action: string, input: Json, method: 'GET' | 'POST'): Promise<Outcome> {
    const headers: Record<string, string> = who ? { Authorization: `Bearer ${token(who)}` } : {};
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

  /** PHP lalu Node, input boleh berbeda per backend (nomor tagihan); hasil yang diseragamkan harus sama. Hasil per backend. */
  async function both(who: Who | null, action: string, input: Json | ((b: Backend) => Json), method: 'GET' | 'POST' = 'POST') {
    const results: Outcome[] = [];
    for (const backend of backends) results.push(await send(backend, who, action, typeof input === 'function' ? input(backend) : input, method));
    expect(normalize(results[1]), `${who} ${action}: Node differs from PHP`).toEqual(normalize(results[0]));
    for (const result of results) expect(result.status, `${who} ${action}: 500`).not.toBe(500);
    return results;
  }

  async function rows(sql: string, values: unknown[] = []) {
    const out: Json[][] = [];
    for (const backend of backends) {
      const conn = await env.mysql.createConnection({ ...MYSQL, database: backend.db, dateStrings: true });
      out.push((await conn.query(sql, values))[0] as Json[]);
      await conn.end();
    }
    expect(normalize(out[1]), `${sql}: Node database differs from PHP`).toEqual(normalize(out[0]));
    return out;
  }

  async function exec(sql: string) {
    for (const backend of backends) {
      const conn = await env.mysql.createConnection({ ...MYSQL, database: backend.db });
      await conn.query(sql);
      await conn.end();
    }
  }

  /** Notifikasi Midtrans bertanda tangan untuk percobaan `attempt` tagihan `key` tiap backend. */
  const notify = (key: string, attempt: number, fields: Json, gross = '250000.00') => (b: Backend) => {
    const orderId = `${b.numbers[key]}-${attempt}`;
    return { order_id: orderId, status_code: '200', gross_amount: gross, signature_key: signature(orderId, '200', gross), ...fields };
  };
  /** Jawaban Status API Midtrans palsu untuk percobaan itu di kedua backend. */
  const statusApi = (key: string, attempt: number, fields: Record<string, string>) => {
    for (const b of backends) {
      const orderId = `${b.numbers[key]}-${attempt}`;
      midtrans.statuses.set(orderId, { order_id: orderId, status_code: '200', gross_amount: '250000.00', ...fields });
    }
  };
  const keep = (key: string, results: Outcome[]) =>
    results.forEach((result, i) => (backends[i].numbers[key] = String((result.body.addon_order as Json).addon_number)));

  beforeAll(async () => {
    midtrans = await startFakeMidtrans();
    for (const name of ['php', 'node'] as const) {
      const db = `sadd_${name}_${dbSuffix}`;
      const conn = await createDatabase(env, db, true);
      await conn.query(FIXTURES);
      await conn.end();
      const port = await freePort();
      const dir = join(tmp, name);
      mkdirSync(join(dir, 'public'), { recursive: true });
      mkdirSync(join(dir, 'tmp'), { recursive: true });
      const vars = {
        ...process.env, MYSQL_HOST: MYSQL.host, MYSQL_USER: MYSQL.user, MYSQL_PASS: MYSQL.password, MYSQL_DB: db, AUTH_SECRET, TRUST_PROXY: '0',
        MIDTRANS_SIMULATOR: '1', MIDTRANS_IS_PRODUCTION: '0', MIDTRANS_SERVER_KEY: SERVER_KEY, MIDTRANS_TEST_URL: midtrans.url,
        APP_URL: 'https://app.test/',
      };
      // PHP: batas percobaan disimpan di folder temp sistem; folder sendiri per tes supaya sama dengan Node (memori proses)
      const proc = name === 'php'
        ? spawn('php', ['-d', `sys_temp_dir=${join(dir, 'tmp')}`, '-S', `127.0.0.1:${port}`, '-t', join(ROOT, 'backend')], {
          env: { ...vars, PUBLIC_DIR: join(dir, 'public') }, stdio: 'ignore',
        })
        : spawn(process.execPath, [join(ROOT, 'backend', 'server.js')], {
          cwd: join(ROOT, 'backend'), env: { ...vars, PORT: String(port), PD_STORAGE_DIR: join(dir, 'storage'), NODE_ENV: 'test' }, stdio: 'ignore',
        });
      const base = `http://127.0.0.1:${port}`;
      await waitUntilUp(base, proc);
      backends.push({ name, base, db, proc, numbers: {} });
    }
  }, 120_000);

  afterAll(async () => {
    for (const backend of backends) backend.proc.kill();
    midtrans?.server.close();
    for (const backend of backends) await dropDatabase(env, backend.db, /^sadd_(php|node)_[0-9a-f]{8}$/);
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }, 60_000);

  it('daftar fitur per situs pembeli, terbaru dulu; harga dari setting (kosong/0/teks = 350.000), publik lewat get_settings', async () => {
    const [list] = await both('customer', 'customer_get_site_addons', {}, 'GET');
    expect(list.status).toBe(200);
    const sites = list.body.sites as Json[];
    expect(sites.map((s) => [s.site_id, s.template_code, s.site_status])).toEqual([
      [505, 'bestari', 'active'], [501, 'madani', 'active'], [502, 'corporate-nexa', 'active'], [503, 'cakrawala', 'suspended'], [506, 'madani', 'active'],
    ]);
    expect(list.body.price).toEqual({ posts: 350000 });
    expect(sites[1]).toEqual({
      site_id: 501, domain: LONG_DOMAIN, template_code: 'madani', template_name: 'Madani', order_number: 'GN-20261011-SKOLA1', site_status: 'active',
      addons: [{ code: 'posts', name: 'Berita & Pengumuman', price: 350000, capable: true, active: false, activated_at: null, source: null, purchase: null, pending: null }],
    });
    expect((sites[2].addons as Json[])[0]).toMatchObject({ capable: false, active: false });

    const [one] = await both('customer', 'customer_get_site_addons', { site_id: '501' }, 'GET');
    expect((one.body.sites as Json[]).map((s) => s.site_id)).toEqual([501]);
    const [foreign] = await both('customer', 'customer_get_site_addons', { site_id: '504' }, 'GET');
    expect([foreign.status, foreign.body]).toEqual([404, { error: 'Situs tidak ditemukan.', code: 'SITE_NOT_FOUND' }]);
    const [staff] = await both('admin', 'customer_get_site_addons', {}, 'GET');
    expect(staff.status).toBe(403);
    const [anonymous] = await both(null, 'customer_get_site_addons', {}, 'GET');
    expect(anonymous.status).toBe(401);

    // = PRICE_CASES di src/pages/public/info/__tests__/wp6Pages.test.tsx (addonPostsPrice): trim ala PHP, dibulatkan dari
    // teksnya tanpa float, maksimal 1e12
    const priceCases = [['0', 350000], ['abc', 350000], ['-5', 350000], ['1e5', 350000], ['350000.4999999999', 350000],
      ['0.49999999999999994', 350000], ['0.5', 1], ['0001000', 1000], ['1000000000000', 1000000000000], ['1000000000001', 350000],
      ['99999999999999999999', 350000], [' 250000', 350000], ['250000\t', 250000], ['  250000 ', 250000]] as const;
    for (const [value, price] of priceCases) {
      await exec(`INSERT INTO hero_settings (setting_key, setting_value) VALUES ('addon_posts_price', '${value}') ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`);
      const [priced] = await both('customer', 'customer_get_site_addons', { site_id: '501' }, 'GET');
      expect(priced.body.price, value).toEqual({ posts: price });
    }
    const [settings] = await both(null, 'get_settings', {}, 'GET');
    expect(settings.body.addon_posts_price).toBe('  250000 ');
  }, 60_000);

  it('gerbang sebelum beli: tulisan pembeli 403 POSTS_LOCKED, publik kosong, addons.posts false, posts_capable', async () => {
    const [locked] = await both('customer', 'customer_get_site_posts', { site_id: '501' }, 'GET');
    expect([locked.status, locked.body]).toEqual([403, LOCKED]);
    const [unavailable] = await both('customer', 'customer_get_site_posts', { site_id: '502' }, 'GET');
    expect(unavailable.body.code).toBe('POSTS_UNAVAILABLE');
    const [save] = await both('customer', 'customer_save_site_post', { site_id: 501, post: { kind: 'berita', title: 'Juara Lomba Sains', body: 'Isi', status: 'published' } });
    expect([save.status, save.body]).toEqual([403, LOCKED]);
    const [publicList] = await both(null, 'get_site_posts', { site_id: '501', kind: 'berita' }, 'GET');
    expect(publicList.body).toEqual({ success: true, posts: [], total: 0 });
    const [site] = await both(null, 'get_site_public', { site_id: '501' }, 'GET');
    expect((site.body.site as Json).addons).toEqual({ posts: false });
    const [own] = await both('customer', 'customer_get_site', { site_id: '501' }, 'GET');
    expect(own.body.site).toMatchObject({ id: 501, addons: { posts: false }, posts_capable: true });
    const [plain] = await both('customer', 'customer_get_site', { site_id: '502' }, 'GET');
    expect(plain.body.site).toMatchObject({ addons: { posts: false }, posts_capable: false });
    // SEO situs tetap gratis
    const [seo] = await both('customer', 'customer_get_site_seo', { site_id: '501' }, 'GET');
    expect(seo.status).toBe(200);
  }, 60_000);

  it('beli ditolak: fitur tidak dikenal, template lain, situs nonaktif, situs orang lain, GET, akun staf', async () => {
    const [unknown] = await both('customer', 'customer_buy_site_addon', { site_id: 501, addon: 'galeri' });
    expect(unknown.body).toEqual({ error: 'Pilih fitur tambahan yang tersedia.', code: 'VALIDATION', errors: { addon: 'Pilih fitur tambahan yang tersedia.' } });
    const [plain] = await both('customer', 'customer_buy_site_addon', { site_id: 502, addon: 'posts' });
    expect([plain.status, plain.body]).toEqual([403, { error: 'Fitur ini hanya untuk template sekolah.', code: 'ADDON_UNAVAILABLE' }]);
    const [suspended] = await both('customer', 'customer_buy_site_addon', { site_id: 503, addon: 'posts' });
    expect([suspended.status, suspended.body.code]).toEqual([409, 'SITE_SUSPENDED']);
    const [foreign] = await both('customer', 'customer_buy_site_addon', { site_id: 504, addon: 'posts' });
    expect([foreign.status, foreign.body.code]).toEqual([404, 'SITE_NOT_FOUND']);
    const [get] = await both('customer', 'customer_buy_site_addon', { site_id: '501', addon: 'posts' }, 'GET');
    expect([get.status, get.body.code]).toEqual([405, 'METHOD_NOT_ALLOWED']);
    const [staff] = await both('admin', 'customer_buy_site_addon', { site_id: 501, addon: 'posts' });
    expect(staff.status).toBe(403);
    await rows('SELECT COUNT(*) AS n FROM site_addon_orders');
  }, 60_000);

  it('beli → Snap (harga tersimpan, item ADDON-posts, kembali ke /akun/fitur) → bayar memakai halaman yang sama → simulasi → aktif', async () => {
    const created = await both('customer', 'customer_buy_site_addon', { site_id: 501, addon: 'posts' });
    keep('first', created);
    for (const [i, result] of created.entries()) {
      const number = backends[i].numbers.first;
      expect(number).toMatch(/^GNF-\d{8}-[A-Z0-9]{6}$/);
      expect(result.body).toEqual({
        success: true,
        addon_order: {
          addon_number: number, site_id: 501, order_number: 'GN-20261011-SKOLA1', addon_code: 'posts', price: 250000, status: 'menunggu_pembayaran',
          status_label: 'Menunggu Pembayaran', source: 'beli', payment_status: 'pending', payment_type: null, payment_url: `https://pay.test/snap/${number}-1`,
          paid_at: null, cancelled_at: null, revoked_at: null, created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/), invoice_number: null,
        },
        payment_url: `https://pay.test/snap/${number}-1`,
      });
      const snap = midtrans.snaps.find((s) => s.transaction_details.order_id === `${number}-1`)!;
      expect(snap).toEqual({
        transaction_details: { order_id: `${number}-1`, gross_amount: 250000 },
        item_details: [{ id: 'ADDON-posts', price: 250000, quantity: 1, name: `Fitur Berita & Pengumuman ${LONG_DOMAIN}`.slice(0, 50) }],
        customer_details: { first_name: 'Klien Uji', email: 'klien@uji.test', phone: '081234567890' },
        callbacks: { finish: 'https://app.test/akun/fitur' },
      });
    }
    const byNumber = (b: Backend) => ({ addon_number: b.numbers.first.toLowerCase() });
    const [again] = await both('customer', 'customer_buy_site_addon', { site_id: 501, addon: 'posts' });
    expect([again.status, again.body]).toEqual([409, {
      error: 'Masih ada tagihan fitur ini yang menunggu pembayaran. Bayar atau batalkan dulu.', code: 'ADDON_PENDING',
    }]);
    const snapsBefore = midtrans.snaps.length;
    const pay = await both('customer', 'customer_pay_site_addon', byNumber);
    expect(pay[0].body).toEqual({ success: true, payment_url: `https://pay.test/snap/${backends[0].numbers.first}-1` });
    expect(midtrans.snaps.length).toBe(snapsBefore);
    const [foreign] = await both('other', 'customer_pay_site_addon', byNumber);
    expect(foreign.body).toEqual(NOT_FOUND);
    const [state] = await both('customer', 'customer_get_site_addons', { site_id: '501' }, 'GET');
    expect(((state.body.sites as Json[])[0].addons as Json[])[0]).toMatchObject({ active: false, purchase: null, pending: { status: 'menunggu_pembayaran' } });
    const [early] = await both('customer', 'customer_get_invoice', (b) => ({ order_number: 'GN-20261011-SKOLA1', addon_number: b.numbers.first }), 'GET');
    expect(early.body).toEqual({ error: 'Nota tersedia setelah pembayaran lunas.', code: 'INVOICE_NOT_AVAILABLE' });

    const paid = await both('customer', 'dev_simulate_site_addon_payment', byNumber);
    for (const [i, result] of paid.entries()) {
      const number = backends[i].numbers.first;
      const order = result.body.addon_order as Json;
      expect(order).toMatchObject({ status: 'lunas', status_label: 'Lunas', payment_status: 'simulated', payment_type: 'simulator', payment_url: null,
        invoice_number: `INV-${number}` });
      expect(result.body.site).toMatchObject({ site_id: 501, addons: [{ code: 'posts', active: true, source: 'beli', activated_at: order.paid_at, purchase: order, pending: null }] });
    }
    const [twice] = await both('customer', 'dev_simulate_site_addon_payment', byNumber);
    expect([twice.status, twice.body]).toEqual([409, { error: 'Tagihan fitur ini berstatus "Lunas".', code: 'INVALID_STATUS' }]);
    const [active] = await both('customer', 'customer_buy_site_addon', { site_id: 501, addon: 'posts' });
    expect([active.status, active.body]).toEqual([409, { error: 'Fitur ini sudah aktif di situs Anda.', code: 'ADDON_ACTIVE' }]);
    const [cancelPaid] = await both('customer', 'customer_cancel_site_addon', byNumber);
    expect(cancelPaid.body.code).toBe('INVALID_STATUS');
    await rows(`SELECT addon_number, site_id, order_id, user_id, addon_code, price, status, pending_key, source, payment_status, payment_type, midtrans_order_id,
                payment_attempt, snap_token, payment_url, paid_midtrans_order_id, cancelled_at, revoked_at, granted_by FROM site_addon_orders ORDER BY id`);

    // Fitur aktif: CMS tulisan terbuka, publik membaca tulisan, flag ikut di situs
    const [saved] = await both('customer', 'customer_save_site_post', {
      site_id: 501, post: { kind: 'berita', title: 'Juara Lomba Sains', slug: '', excerpt: '', body: 'Isi berita.', category: '', badge: '', image: null,
        image_alt: '', link_url: '', status: 'published', published_at: '2026-10-26', seo_title: '', seo_description: '', noindex: false },
    });
    expect(saved.status).toBe(200);
    const [publicList] = await both(null, 'get_site_posts', { site_id: '501', kind: 'berita' }, 'GET');
    expect(publicList.body.total).toBe(1);
    const [site] = await both(null, 'get_site_public', { site_id: '501' }, 'GET');
    expect((site.body.site as Json).addons).toEqual({ posts: true });
    const [own] = await both('customer', 'customer_get_site', { site_id: '501' }, 'GET');
    expect(own.body.site).toMatchObject({ addons: { posts: true }, posts_capable: true });
  }, 60_000);

  it('nota: daftar menambah item fitur (lunas & berbayar), nota GNF- per pesanan', async () => {
    const lists = await both('customer', 'customer_get_invoices', {}, 'GET');
    for (const [i, result] of lists.entries()) {
      const number = backends[i].numbers.first;
      const invoices = result.body.invoices as Json[];
      expect(invoices[0]).toEqual({
        type: 'fitur', invoice_number: `INV-${number}`, order_number: 'GN-20261011-SKOLA1', renewal_number: null, addon_number: number,
        title: 'Fitur Berita & Pengumuman', domain: LONG_DOMAIN, years: null, amount: 250000, paid_at: expect.any(String), payment_status: 'simulated',
        payment_type: 'simulator', order_status: null,
      });
      expect(invoices.filter((n) => n.type === 'fitur')).toHaveLength(1);
    }
    const invoice = await both('customer', 'customer_get_invoice', (b) => ({ order_number: 'GN-20261011-SKOLA1', addon_number: b.numbers.first }), 'GET');
    expect(invoice[1].body).toMatchObject({ success: true, renewal: null, addon: { addon_number: backends[1].numbers.first, status: 'lunas', price: 250000 } });
    expect(invoice[0].body.order).toMatchObject({ order_number: 'GN-20261011-SKOLA1' });
    expect((invoice[0].body.company as Json).name).toBe('PT Garuda Nexa Bahtera');
    const [purchase] = await both('customer', 'customer_get_invoice', { order_number: 'GN-20261011-SKOLA1' }, 'GET');
    expect(purchase.body.addon).toBeNull();
    const [wrongOrder] = await both('customer', 'customer_get_invoice', (b) => ({ order_number: 'GN-20261015-SMADU5', addon_number: b.numbers.first }), 'GET');
    expect(wrongOrder.body).toEqual(NOT_FOUND);
    const [foreign] = await both('other', 'customer_get_invoice', (b) => ({ order_number: 'GN-20261011-SKOLA1', addon_number: b.numbers.first }), 'GET');
    expect(foreign.status).toBe(404);
  }, 60_000);

  it('batal: tagihan dibatalkan, Snap dikedaluwarsakan, catatan terlihat pembeli; bayar setelah batal tidak mengaktifkan', async () => {
    const created = await both('customer', 'customer_buy_site_addon', { site_id: 505, addon: 'posts' });
    keep('cancelled', created);
    const byNumber = (b: Backend) => ({ addon_number: b.numbers.cancelled });
    const cancelled = await both('customer', 'customer_cancel_site_addon', byNumber);
    for (const [i, result] of cancelled.entries()) {
      expect(result.body.addon_order).toMatchObject({ status: 'dibatalkan', status_label: 'Dibatalkan', payment_url: null, cancelled_at: expect.any(String) });
      expect(midtrans.expired).toContain(`${backends[i].numbers.cancelled}-1`);
    }
    const [again] = await both('customer', 'customer_cancel_site_addon', byNumber);
    expect([again.status, again.body]).toEqual([409, { error: 'Tagihan fitur ini berstatus "Dibatalkan".', code: 'INVALID_STATUS' }]);
    const [simulate] = await both('customer', 'dev_simulate_site_addon_payment', byNumber);
    expect(simulate.status).toBe(409);
    await rows("SELECT status, pending_key, payment_status FROM site_addon_orders WHERE site_id = 505");

    // Pembayaran yang tetap masuk setelah batal (Status API tidak menjawab: notifikasi bertanda tangan dipakai)
    const [late] = await both(null, 'midtrans_notification', notify('cancelled', 1, { transaction_status: 'settlement', payment_type: 'qris' }));
    expect(late.body).toEqual({ success: true });
    await rows("SELECT status, paid_at, payment_status, payment_type FROM site_addon_orders WHERE site_id = 505");

    const detail = await both('customer', 'customer_get_order', { order_number: 'GN-20261015-SMADU5' }, 'GET');
    const logs = normalize((detail[0].body.logs as { event: string; note: string | null }[]).map((l) => [l.event, l.note]));
    expect(logs).toEqual([
      ['addon_created', 'Fitur Berita & Pengumuman GNF-X dipesan, menunggu pembayaran.'],
      ['addon_payment_created', null],
      ['addon_cancelled', 'Fitur Berita & Pengumuman GNF-X dibatalkan.'],
      ['addon_payment_update', null],
    ]);
    const staff = await both('admin', 'admin_get_template_order', { id: 405 }, 'GET');
    const staffLogs = (staff[0].body.logs as { event: string; note: string }[]).map((l) => normalize(l.note));
    expect(staffLogs).toContain('Pembayaran fitur Berita & Pengumuman GNF-X diterima, tetapi tagihannya sudah dibatalkan. Perlu ditindaklanjuti manual (refund).');
  }, 60_000);

  it('notifikasi GNF-: tanda tangan, jumlah, Status API, ditinjau bank, kedaluwarsa → bayar ulang, lunas, bayar dobel', async () => {
    const created = await both('customer', 'customer_buy_site_addon', { site_id: 505, addon: 'posts' });
    keep('paid', created);
    const byNumber = (b: Backend) => ({ addon_number: b.numbers.paid });

    const [bad] = await both(null, 'midtrans_notification', (b) => ({ ...notify('paid', 1, { transaction_status: 'settlement' })(b), signature_key: 'x'.repeat(128) }));
    expect([bad.status, bad.body]).toEqual([403, { error: 'Signature tidak valid.', code: 'INVALID_SIGNATURE' }]);
    const [amount] = await both(null, 'midtrans_notification', notify('paid', 1, { transaction_status: 'settlement' }, '1000.00'));
    expect([amount.status, amount.body]).toEqual([400, { error: 'Jumlah pembayaran tidak sesuai.', code: 'AMOUNT_MISMATCH' }]);
    const ghostId = 'GNF-20261027-ZZZZZZ-1';
    const [ghost] = await both(null, 'midtrans_notification', {
      order_id: ghostId, status_code: '200', gross_amount: '250000.00', signature_key: signature(ghostId, '200', '250000.00'), transaction_status: 'settlement',
    });
    expect([ghost.status, ghost.body]).toEqual([404, NOT_FOUND]);

    // Notifikasi mengaku lunas, Status API masih pending: tidak aktif
    statusApi('paid', 1, { transaction_status: 'pending', payment_type: 'bank_transfer' });
    await both(null, 'midtrans_notification', notify('paid', 1, { transaction_status: 'settlement', payment_type: 'bank_transfer' }));
    await rows("SELECT status, payment_status, payment_type FROM site_addon_orders WHERE site_id = 505 AND status <> 'dibatalkan'");
    // Kartu ditahan untuk tinjauan: tidak bisa dibayar ulang
    statusApi('paid', 1, { transaction_status: 'capture', fraud_status: 'challenge', payment_type: 'credit_card' });
    await both(null, 'midtrans_notification', notify('paid', 1, { transaction_status: 'capture', fraud_status: 'challenge' }));
    const [review] = await both('customer', 'customer_pay_site_addon', byNumber);
    expect([review.status, review.body]).toEqual([409, { error: 'Pembayaran kartu Anda sedang ditinjau bank. Tidak perlu membayar ulang.', code: 'PAYMENT_UNDER_REVIEW' }]);
    // Kedaluwarsa: tagihan tetap menunggu pembayaran, bayar membuat percobaan baru
    statusApi('paid', 1, { transaction_status: 'expire', payment_type: 'credit_card' });
    await both(null, 'midtrans_notification', notify('paid', 1, { transaction_status: 'expire' }));
    const [expired] = await both('customer', 'customer_get_site_addons', { site_id: '505' }, 'GET');
    expect(((expired.body.sites as Json[])[0].addons as Json[])[0]).toMatchObject({ active: false, pending: { status: 'menunggu_pembayaran', payment_status: 'expire' } });
    const repay = await both('customer', 'customer_pay_site_addon', byNumber);
    repay.forEach((result, i) => expect(result.body.payment_url).toBe(`https://pay.test/snap/${backends[i].numbers.paid}-2`));

    // Lunas lewat percobaan 2
    statusApi('paid', 2, { transaction_status: 'settlement', payment_type: 'qris' });
    const [settled] = await both(null, 'midtrans_notification', notify('paid', 2, { transaction_status: 'settlement' }));
    expect(settled.body).toEqual({ success: true });
    const [state] = await both('customer', 'customer_get_site_addons', { site_id: '505' }, 'GET');
    expect(((state.body.sites as Json[])[0].addons as Json[])[0]).toMatchObject({
      active: true, source: 'beli', pending: null, purchase: { status: 'lunas', payment_status: 'settlement', payment_type: 'qris' },
    });
    // Notifikasi ganda: tidak berubah dan tidak dicatat lagi; percobaan 1 ikut dibayar: catatan untuk tim
    await both(null, 'midtrans_notification', notify('paid', 2, { transaction_status: 'settlement' }));
    statusApi('paid', 1, { transaction_status: 'settlement', payment_type: 'credit_card' });
    await both(null, 'midtrans_notification', notify('paid', 1, { transaction_status: 'settlement' }));
    await rows("SELECT status, payment_status, payment_type, payment_attempt, midtrans_order_id, paid_midtrans_order_id, pending_key FROM site_addon_orders WHERE site_id = 505 ORDER BY id");

    const staff = await both('admin', 'admin_get_template_order', { id: 405 }, 'GET');
    const notes = normalize((staff[0].body.logs as { event: string; note: string }[]).filter((l) => l.event.startsWith('addon_')).map((l) => [l.event, l.note]));
    expect(notes).toEqual(expect.arrayContaining([
      ['addon_payment_update', 'Pembayaran kartu fitur Berita & Pengumuman GNF-X menunggu tinjauan fraud (challenge).'],
      ['addon_payment_update', 'Status pembayaran fitur Berita & Pengumuman GNF-X: expire'],
      ['addon_paid', 'Fitur Berita & Pengumuman GNF-X lunas. Fitur sudah aktif di situs Anda.'],
      ['addon_payment_update', 'Pembayaran ganda fitur Berita & Pengumuman GNF-X (GNF-X-1); sudah lunas lewat GNF-X-2. Perlu ditindaklanjuti manual (refund).'],
    ]));
    expect(notes.filter(([event]) => event === 'addon_paid')).toHaveLength(1);
    const payloads = (staff[1].body.logs as { event: string; payload: Json | null }[]).filter((l) => l.event === 'addon_paid');
    expect(payloads[0].payload).toMatchObject({ confirmed_by_status_api: true, transaction_status: 'settlement' });
  }, 90_000);

  it('admin: peran, validasi, cabut (tulisan tersembunyi, nota tetap), aktifkan gratis (tagihan menunggu dibatalkan), laci pesanan', async () => {
    const [customer] = await both('customer', 'admin_set_site_addon', { site_id: 501, addon: 'posts', active: false });
    expect(customer.status).toBe(403);
    const [staffUser] = await both('staff', 'admin_set_site_addon', { site_id: 501, addon: 'posts', active: false });
    expect(staffUser.status).toBe(403);
    const [invalid] = await both('admin', 'admin_set_site_addon', { site_id: 501, addon: 'x', active: 'ya', note: 'n'.repeat(256) });
    expect(invalid.status).toBe(400);
    expect(Object.keys(invalid.body.errors as Json)).toEqual(['addon', 'active', 'note']);
    expect((invalid.body.errors as Json).active).toBe('Pilih aktifkan atau nonaktifkan fitur.');
    const [plain] = await both('admin', 'admin_set_site_addon', { site_id: 502, addon: 'posts', active: true });
    expect(plain.body.code).toBe('ADDON_UNAVAILABLE');
    const [missing] = await both('admin', 'admin_set_site_addon', { site_id: 9999, addon: 'posts', active: true });
    expect([missing.status, missing.body.code]).toEqual([404, 'SITE_NOT_FOUND']);

    // Cabut: tulisan disembunyikan (tidak dihapus), nota tetap bisa dibuka
    const revoked = await both('admin', 'admin_set_site_addon', { site_id: 501, addon: 'posts', active: false, note: 'Refund manual' });
    expect(revoked[0].body.addons).toEqual([{ code: 'posts', name: 'Berita & Pengumuman', price: 250000, capable: true, active: false, activated_at: null,
      source: null, purchase: null, pending: null }]);
    const [locked] = await both('customer', 'customer_get_site_posts', { site_id: '501' }, 'GET');
    expect(locked.body).toEqual(LOCKED);
    const [hidden] = await both(null, 'get_site_posts', { site_id: '501', kind: 'berita' }, 'GET');
    expect(hidden.body.total).toBe(0);
    await rows('SELECT COUNT(*) AS n FROM site_posts WHERE site_id = 501');
    const [invoice] = await both('customer', 'customer_get_invoice', (b) => ({ order_number: 'GN-20261011-SKOLA1', addon_number: b.numbers.first }), 'GET');
    expect(invoice.body.addon).toMatchObject({ status: 'lunas', revoked_at: expect.any(String), invoice_number: expect.stringMatching(/^INV-GNF-/) });

    // Aktifkan gratis: baris admin harga 0 tanpa nota; diulang tidak menambah baris
    const granted = await both('admin', 'admin_set_site_addon', { site_id: 501, addon: 'posts', active: true, note: 'Ganti rugi' });
    expect(granted[0].body.addons).toEqual([expect.objectContaining({ active: true, source: 'admin', pending: null,
      purchase: expect.objectContaining({ source: 'admin', price: 0, status: 'lunas', payment_type: 'gratis', invoice_number: null }) })]);
    await both('admin', 'admin_set_site_addon', { site_id: 501, addon: 'posts', active: true });
    await rows("SELECT source, price, status, payment_status, payment_type, granted_by, note, revoked_at IS NULL AS live FROM site_addon_orders WHERE site_id = 501 ORDER BY id");
    const [visible] = await both(null, 'get_site_posts', { site_id: '501', kind: 'berita' }, 'GET');
    expect(visible.body.total).toBe(1);
    const free = await both('admin', 'admin_get_template_order', { id: 401 }, 'GET');
    for (const [i, result] of free.entries()) {
      const orders = result.body.addon_orders as Json[];
      expect(orders.map((o) => [o.source, o.price, o.revoked_at === null])).toEqual([['admin', 0, true], ['beli', 250000, false]]);
      expect(orders.every((o) => o.payment_url === null)).toBe(true);
      expect(result.body.addons).toEqual([expect.objectContaining({ active: true, source: 'admin', purchase: orders[0] })]);
      const freeInvoice = await send(backends[i], 'customer', 'customer_get_invoice', { order_number: 'GN-20261011-SKOLA1', addon_number: String(orders[0].addon_number) }, 'GET');
      expect(freeInvoice.body).toEqual({ error: 'Fitur ini diaktifkan tanpa biaya sehingga tidak ada nota.', code: 'INVOICE_NOT_AVAILABLE' });
    }
    const [invoices] = await both('customer', 'customer_get_invoices', {}, 'GET');
    expect((invoices.body.invoices as Json[]).filter((n) => n.type === 'fitur')).toHaveLength(2);

    // Aktifkan gratis saat ada tagihan menunggu: tagihannya dibatalkan dulu (Snap dikedaluwarsakan)
    const pending = await both('customer', 'customer_buy_site_addon', { site_id: 506, addon: 'posts' });
    keep('replaced', pending);
    const replaced = await both('admin', 'admin_set_site_addon', { site_id: 506, addon: 'posts', active: true });
    expect(replaced[0].body.addons).toEqual([expect.objectContaining({ active: true, source: 'admin', pending: null })]);
    backends.forEach((b) => expect(midtrans.expired).toContain(`${b.numbers.replaced}-1`));
    await rows("SELECT source, status, pending_key, cancelled_at IS NOT NULL AS cancelled FROM site_addon_orders WHERE site_id = 506 ORDER BY id");

    // Riwayat: pembeli melihat event cabut/aktifkan tanpa catatan tim
    const [customerView] = await both('customer', 'customer_get_order', { order_number: 'GN-20261016-SMATG6' }, 'GET');
    expect(normalize((customerView.body.logs as { event: string; note: string | null }[]).map((l) => [l.event, l.note]))).toEqual([
      ['addon_created', 'Fitur Berita & Pengumuman GNF-X dipesan, menunggu pembayaran.'],
      ['addon_payment_created', null],
      ['addon_cancelled', 'Fitur Berita & Pengumuman GNF-X dibatalkan karena fitur diaktifkan oleh tim.'],
      ['addon_granted', null],
    ]);
    const [staffView] = await both('admin', 'admin_get_template_order', { id: 401 }, 'GET');
    const staffNotes = normalize((staffView.body.logs as { event: string; note: string }[]).filter((l) => ['addon_granted', 'addon_revoked'].includes(l.event)).map((l) => [l.event, l.note]));
    expect(staffNotes).toEqual([
      ['addon_revoked', 'Fitur Berita & Pengumuman GNF-X dinonaktifkan oleh tim. Catatan: Refund manual'],
      ['addon_granted', 'Fitur Berita & Pengumuman GNF-X diaktifkan gratis oleh tim. Catatan: Ganti rugi'],
    ]);

    // Laci pesanan: situs template lain (tidak mampu), pesanan tanpa situs
    const [plainOrder] = await both('admin', 'admin_get_template_order', { id: 402 }, 'GET');
    expect([plainOrder.body.addons, plainOrder.body.addon_orders]).toEqual([[expect.objectContaining({ capable: false, active: false })], []]);
    const [noSite] = await both('admin', 'admin_get_template_order', { id: 407 }, 'GET');
    expect([noSite.body.addons, noSite.body.addon_orders]).toEqual([[], []]);
  }, 90_000);

  it('batas 20 beli/bayar/batal per jam per pengguna (sa-pay), juga yang gagal', async () => {
    for (let i = 0; i < 20; i++) {
      const [res] = await both('limited', 'customer_cancel_site_addon', { addon_number: 'GNF-20261027-ZZZZZZ' });
      expect(res.status).toBe(404);
    }
    const [blocked] = await both('limited', 'customer_buy_site_addon', { site_id: 501, addon: 'posts' });
    expect([blocked.status, blocked.body]).toEqual([429, { error: 'Terlalu banyak percobaan. Coba lagi dalam 60 menit.' }]);
    // Baca tidak dibatasi
    const [list] = await both('limited', 'customer_get_site_addons', {}, 'GET');
    expect(list.body).toEqual({ success: true, sites: [], price: { posts: 250000 } });
  }, 90_000);

  it('tabel site_addon_orders belum ada: aksi yang menulis 503 ADDONS_NOT_READY, bacaan jalan tanpa fitur aktif, tidak pernah 500', async () => {
    await exec('DROP TABLE site_addon_orders');
    const [list] = await both('customer', 'customer_get_site_addons', { site_id: '501' }, 'GET');
    expect(list.status).toBe(200);
    expect(((list.body.sites as Json[])[0].addons as Json[])[0]).toMatchObject({ capable: true, active: false, purchase: null, pending: null });
    for (const [who, action, input] of [
      ['customer', 'customer_buy_site_addon', { site_id: 506, addon: 'posts' }],
      ['customer', 'customer_pay_site_addon', { addon_number: 'GNF-20261027-ZZZZZZ' }],
      ['customer', 'dev_simulate_site_addon_payment', { addon_number: 'GNF-20261027-ZZZZZZ' }],
      ['admin', 'admin_set_site_addon', { site_id: 501, addon: 'posts', active: true }],
    ] as const) {
      const [res] = await both(who, action, input);
      expect([res.status, res.body], action).toEqual([503, NOT_READY]);
    }
    const ghostId = 'GNF-20261027-ZZZZZZ-1';
    const [notification] = await both(null, 'midtrans_notification', {
      order_id: ghostId, status_code: '200', gross_amount: '250000.00', signature_key: signature(ghostId, '200', '250000.00'), transaction_status: 'settlement',
    });
    expect([notification.status, notification.body]).toEqual([503, NOT_READY]);

    const [site] = await both(null, 'get_site_public', { site_id: '501' }, 'GET');
    expect((site.body.site as Json).addons).toEqual({ posts: false });
    const [own] = await both('customer', 'customer_get_site', { site_id: '501' }, 'GET');
    expect(own.body.site).toMatchObject({ addons: { posts: false }, posts_capable: true });
    const [posts] = await both('customer', 'customer_get_site_posts', { site_id: '501' }, 'GET');
    expect(posts.body).toEqual(LOCKED);
    const [publicList] = await both(null, 'get_site_posts', { site_id: '501', kind: 'berita' }, 'GET');
    expect(publicList.body).toEqual({ success: true, posts: [], total: 0 });
    const [invoices] = await both('customer', 'customer_get_invoices', {}, 'GET');
    expect((invoices.body.invoices as Json[]).some((n) => n.type === 'fitur')).toBe(false);
    const [invoice] = await both('customer', 'customer_get_invoice', { order_number: 'GN-20261011-SKOLA1', addon_number: 'GNF-20261027-ZZZZZZ' }, 'GET');
    expect(invoice.body).toEqual(NOT_FOUND);
    const [drawer] = await both('admin', 'admin_get_template_order', { id: 401 }, 'GET');
    expect([drawer.status, drawer.body.addon_orders]).toEqual([200, []]);
    expect(drawer.body.addons).toEqual([expect.objectContaining({ capable: true, active: false })]);
  }, 90_000);
});
