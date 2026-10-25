// @vitest-environment node
// Domain berbayar, masa aktif, perpanjangan, nota, dan profil pembeli (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md).
//
// 1. Tabel harga & aturan domain sama di backend/modules/domains.php, domains.js, dan src/lib/domainPricing.ts.
// 2. backend/api.php (`php -S`) dan backend/server.js berjalan berdampingan, masing-masing di database sementara dari
//    database/schema.sql + seed.sql, dengan server RDAP palsu (DOMAIN_RDAP_URL) dan simulator Midtrans. Setiap request
//    dikirim ke PHP lalu Node; status dan JSON harus sama setelah nomor pesanan/perpanjangan dan waktu diseragamkan
//    (keduanya acak/berbeda per backend). Tanggal masa aktif diperiksa terpisah per backend.
// Bagian 2 butuh `php` dengan mysqli, MySQL/MariaDB (PD_TEST_MYSQL_HOST / _USER / _PASS) dan dependensi backend/
// (`npm ci` di backend/); dilewati bila tidak ada. Database: dren_<php|node>_<hex>. Unggah foto profil (S3 di Node) tidak
// dibandingkan di sini; validasinya ya.
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
import * as domainsJs from '../../backend/modules/domains.js';
import { DOMAIN_TLDS, orderDomainError } from '../../src/lib/domainPricing';

const ROOT = resolve(__dirname, '..', '..');

/* ─────────────────────────── 1. Aturan domain di tiga tempat ─────────────────────────── */

const DOMAIN_INPUTS = [
  'namabisnis.com', 'https://www.Toko-Ku.co.id/halaman?x=1', 'abc', 'a.b.com', '-ab.com', 'ab-.com', 'toko.xyz', 'toko.sch.id',
  'toko.id', 'Sekolah.SCH.ID.', 'toko..com', 'toko.web.id:8080', 'x.my.id', 'toko.go.id', `${'a'.repeat(64)}.com`, 'http://toko.org/',
];

const php = spawnSync('php', ['-v'], { encoding: 'utf8' });
const phpAvailable = php.status === 0;

describe('aturan domain: domains.php = domains.js = domainPricing.ts', () => {
  it('tabel ekstensi & harga sama, dengan harga dari pemilik', () => {
    expect([...DOMAIN_TLDS]).toEqual(domainsJs.DOMAIN_TLDS);
    const price = Object.fromEntries(DOMAIN_TLDS.map((t) => [t.tld, t.price]));
    expect(price).toMatchObject({ com: 250000, id: 250000, 'web.id': 50000, 'my.id': 50000 });
  });

  it('normalisasi, pesan galat, dan harga sama untuk input yang sama (frontend = Node)', () => {
    for (const input of DOMAIN_INPUTS) {
      const normalized = domainsJs.domainNormalize(input);
      expect(orderDomainError(input) ?? null, input).toBe(domainsJs.domainProblem(normalized));
    }
    expect(orderDomainError('   ')).toBe('Domain wajib diisi.');
  });

  it.skipIf(!phpAvailable)('PHP memberi hasil yang sama dengan Node', () => {
    const code = `
      function env_value($k, $d = '') { $v = getenv($k); return $v === false ? $d : $v; }
      require ${JSON.stringify(join(ROOT, 'backend', 'modules', 'domains.php'))};
      $out = ['tlds' => DOMAIN_TLDS, 'rows' => []];
      foreach (json_decode(stream_get_contents(STDIN), true) as $input) {
        $n = domain_normalize($input);
        $out['rows'][] = [$n, domain_problem($n), domain_price($n)];
      }
      echo json_encode($out);`;
    const res = spawnSync('php', ['-r', code], { input: JSON.stringify(DOMAIN_INPUTS), encoding: 'utf8' });
    expect(res.stderr).toBe('');
    const out = JSON.parse(res.stdout) as { tlds: unknown; rows: unknown[] };
    expect(out.tlds).toEqual(domainsJs.DOMAIN_TLDS);
    expect(out.rows).toEqual(
      DOMAIN_INPUTS.map((input) => {
        const n = domainsJs.domainNormalize(input);
        return [n, domainsJs.domainProblem(n), domainsJs.domainPrice(n)];
      }),
    );
  });

  it('DOMAIN_RDAP_URL=off: tanpa jaringan, selalu unknown', async () => {
    expect(await domainsJs.domainAvailability('apa-saja.com', { DOMAIN_RDAP_URL: 'off' })).toBe('unknown');
  });
});

/* ─────────────────────────── 2. PHP api.php vs Node server.js ─────────────────────────── */

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
if ('reason' in ENV) console.warn(`[domain-renewal] dual backend part skipped: ${ENV.reason}`);
type Env = Exclude<typeof ENV, { reason: string }>;

type Who = 'admin' | 'customer' | 'other';
const USERS: Record<Who, { id: number; role: string; password: string }> = {
  admin: { id: 101, role: 'admin', password: 'hash-admin-101' },
  customer: { id: 103, role: 'customer', password: 'hash-customer-103' },
  other: { id: 104, role: 'customer', password: 'hash-customer-104' },
};
const FIXTURES = `
INSERT INTO users (id, name, email, password, phone, role, status, avatar) VALUES
 (101, 'Admin Uji', 'admin@uji.test', 'hash-admin-101', NULL, 'admin', 'active', ''),
 (103, 'Klien Uji', 'klien@uji.test', 'hash-customer-103', '081234567890', 'customer', 'active', ''),
 (104, 'Klien Lain', 'lain@uji.test', 'hash-customer-104', '081234567891', 'customer', 'active', '');
INSERT INTO templates (id, slug, name, category, features, price, gallery, template_code, status, sort_order) VALUES
 (301, 'uji-template', 'Template Uji', 'Company Profile', '[]', 1000000.00, '[]', 'corporate-nexa', 'published', 1);
INSERT INTO hero_settings (setting_key, setting_value) VALUES ('template_hosting_renewal_price', '300000')
 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
`;

const freePort = () =>
  new Promise<number>((done) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as AddressInfo;
      s.close(() => done(port));
    });
  });

/** RDAP palsu: "terpakai…" = terdaftar (200), "tersedia…" = belum (404), lainnya = galat (500 → unknown). */
function startFakeRdap(): Promise<{ server: Server; url: string }> {
  const server = createHttpServer((req, res) => {
    const name = decodeURIComponent((req.url || '').split('/').pop() || '');
    if (name.startsWith('terpakai')) res.writeHead(200, { 'Content-Type': 'application/rdap+json' }).end('{"objectClassName":"domain"}');
    else if (name.startsWith('tersedia')) res.writeHead(404).end('{}');
    else res.writeHead(500).end('{}');
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/domain/{domain}` })));
}

/**
 * DewaBiz palsu (GET /v1/account/prices dua halaman, GET /v1/domains/availability), Basic auth 123:kunci-uji.
 * Harga beli: com 170.000 (harga tetap 250.000), id 260.000 (di atas harga tetap 250.000), co.id 280.000, my.id "30000"
 * (teks), xyz 15.000 (promo 9.000 ikut terdaftar dua kali), old.id nonaktif. Ketersediaan menurut awal nama: "bebas" =
 * tersedia, "premium" = tersedia tetapi premium, "pakai" = terpakai, lainnya = galat 500 (lalu RDAP).
 */
const DEWABIZ_AUTH = `Basic ${Buffer.from('123:kunci-uji').toString('base64')}`;
const priceItem = (extension: string, status: number, registration: unknown, renewal: unknown) => ({
  id: extension.length, domain_extension: { extension, status, sell_option: 1 }, currency: 'IDR', registration, renewal,
});
function startFakeDewabiz(): Promise<{ server: Server; url: string }> {
  const pages = [
    [
      priceItem('.com', 1, { 1: 160000, 2: 320000 }, { 1: '170000', 2: '340000' }),
      priceItem('.id', 1, { 1: 260000 }, { 1: 255000 }),
      priceItem('.co.id', 1, { 1: 280000 }, { 1: 280000 }),
    ],
    [
      priceItem('.my.id', 1, { 1: '30000' }, { 1: '30000.00' }),
      priceItem('.xyz', 1, { 1: 15000 }, { 1: 15000 }),
      priceItem('.xyz', 1, { 1: 9000 }, { 1: 9000 }),
      priceItem('.old.id', 0, { 1: 10000 }, { 1: 10000 }),
    ],
  ];
  const server = createHttpServer((req, res) => {
    const url = new URL(req.url || '/', 'http://x');
    const send = (status: number, body: unknown) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
    if (req.headers.authorization !== DEWABIZ_AUTH) return send(401, { success: false, message: 'Unauthenticated.' });
    if (url.pathname === '/v1/account/prices') {
      const page = Number(url.searchParams.get('page') || 1);
      return send(200, { data: pages[page - 1] ?? [], meta: { current_page: page, last_page: pages.length } });
    }
    if (url.pathname === '/v1/domains/availability') {
      const name = url.searchParams.get('domain') || '';
      if (name.startsWith('bebas')) return send(200, { success: true, data: { name, available: 1, message: 'available', is_premium_name: false } });
      if (name.startsWith('premium')) return send(200, { success: true, data: [{ name, available: 1, is_premium_name: true, premium_registration_price: 9000000 }] });
      if (name.startsWith('pakai')) return send(200, { success: true, data: { name, available: 0, message: 'not available' } });
      return send(500, { success: false, message: 'Server error' });
    }
    return send(404, { success: false });
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1` })));
}

interface Backend {
  name: 'php' | 'node';
  base: string;
  db: string;
  proc: ChildProcess;
  /** Nomor pesanan & perpanjangan backend ini (acak per backend) */
  numbers: Record<string, string>;
}

async function waitUntilUp(base: string, proc: ChildProcess) {
  // Sampai 30 detik: di mesin yang sibuk (tes lain berjalan bersamaan) php -S / server.js bisa lambat siap
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

async function start(name: Backend['name'], db: string, dir: string, extraEnv: Record<string, string>): Promise<Backend> {
  const port = await freePort();
  const env = {
    ...process.env, MYSQL_HOST: MYSQL.host, MYSQL_USER: MYSQL.user, MYSQL_PASS: MYSQL.password, MYSQL_DB: db, AUTH_SECRET, TRUST_PROXY: '0',
    MIDTRANS_SIMULATOR: '1', MIDTRANS_IS_PRODUCTION: '0', ...extraEnv,
  };
  mkdirSync(join(dir, 'public'), { recursive: true });
  const proc = name === 'php'
    ? spawn('php', ['-S', `127.0.0.1:${port}`, '-t', join(ROOT, 'backend')], { env: { ...env, PUBLIC_DIR: join(dir, 'public') }, stdio: 'ignore' })
    : spawn(process.execPath, [join(ROOT, 'backend', 'server.js')], {
      cwd: join(ROOT, 'backend'), env: { ...env, PORT: String(port), PD_STORAGE_DIR: join(dir, 'storage'), NODE_ENV: 'test' }, stdio: 'ignore',
    });
  const base = `http://127.0.0.1:${port}`;
  await waitUntilUp(base, proc);
  return { name, base, db, proc, numbers: {} };
}

type Json = Record<string, unknown>;
interface Outcome {
  status: number;
  body: Json;
}

const DATETIME = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g;
const NUMBER = /\b(GNR?)-\d{8}-[A-Z0-9]{6}\b/g;
/** Nomor & waktu berbeda per backend: diseragamkan sebelum dibandingkan. */
const normalize = (value: unknown) => JSON.parse(JSON.stringify(value).replace(NUMBER, '$1-X').replace(DATETIME, 'T')) as unknown;

/** "2026-10-25 21:41:36" + n tahun (tanggal yang sama, kecuali 29 Februari → 28 Februari seperti DATE_ADD). */
const plusYears = (value: string, years: number) => {
  const [date, time] = value.split(' ');
  const [y, m, d] = date.split('-').map(Number);
  const day = m === 2 && d === 29 ? 28 : d;
  return `${y + years}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')} ${time}`;
};

const suite = 'reason' in ENV ? describe.skip : describe;

/**
 * PHP + Node berdampingan untuk satu describe: database sementara `<prefix>_<php|node>_<hex>`, RDAP palsu, dan (bila
 * `dewabiz`) DewaBiz palsu. Tanpa DewaBiz, kredensial dari .env lokal ditimpa spasi (kosong setelah trim; nilai '' tidak
 * bisa dikirim sebagai variabel lingkungan di Windows).
 */
function pairHarness(prefix: string, dewabiz: boolean) {
  const env = ENV as Env;
  const tmp = mkdtempSync(join(tmpdir(), `${prefix}-`));
  const dbSuffix = crypto.randomBytes(4).toString('hex');
  const backends: Backend[] = [];
  const fakes: Server[] = [];
  const tokens = new Map<Who, string>();
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

  /** PHP lalu Node, input boleh berbeda per backend (nomor pesanan); hasil yang diseragamkan harus sama. Hasil per backend. */
  async function both(who: Who | null, action: string, input: Json | ((b: Backend) => Json), method: 'GET' | 'POST' = 'POST') {
    const results: Outcome[] = [];
    for (const backend of backends) results.push(await send(backend, who, action, typeof input === 'function' ? input(backend) : input, method));
    expect(normalize(results[1]), `${who} ${action}: Node differs from PHP`).toEqual(normalize(results[0]));
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

  beforeAll(async () => {
    const rdap = await startFakeRdap();
    fakes.push(rdap.server);
    const extraEnv: Record<string, string> = { DOMAIN_RDAP_URL: rdap.url, DEWABIZ_RESELLER_ID: ' ', DEWABIZ_API_KEY: ' ' };
    if (dewabiz) {
      const fake = await startFakeDewabiz();
      fakes.push(fake.server);
      Object.assign(extraEnv, { DEWABIZ_API_URL: fake.url, DEWABIZ_RESELLER_ID: '123', DEWABIZ_API_KEY: 'kunci-uji' });
    }
    for (const name of ['php', 'node'] as const) {
      const db = `${prefix}_${name}_${dbSuffix}`;
      const admin = await env.mysql.createConnection({ ...MYSQL, multipleStatements: true });
      await admin.query(`CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await admin.end();
      const conn = await env.mysql.createConnection({ ...MYSQL, database: db, multipleStatements: true });
      await conn.query(readFileSync(join(ROOT, 'database', 'schema.sql'), 'utf8'));
      await conn.query(readFileSync(join(ROOT, 'database', 'seed.sql'), 'utf8'));
      await conn.query(FIXTURES);
      await conn.end();
      backends.push(await start(name, db, join(tmp, name), extraEnv));
    }
  }, 120_000);

  afterAll(async () => {
    for (const backend of backends) backend.proc.kill();
    for (const server of fakes) server.close();
    if (backends.length) {
      const admin = await env.mysql.createConnection(MYSQL);
      for (const backend of backends) {
        if (new RegExp(`^${prefix}_(php|node)_[0-9a-f]{8}$`).test(backend.db)) await admin.query(`DROP DATABASE IF EXISTS \`${backend.db}\``);
      }
      await admin.end();
    }
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }, 60_000);

  return { backends, both, rows, exec };
}

suite('domain, masa aktif, perpanjangan, nota, profil: PHP api.php = Node server.js', () => {
  const { backends, both, rows, exec } = pairHarness('dren', false);

  it('customer_check_domain: normalisasi, harga, status RDAP, galat ekstensi', async () => {
    const [available] = await both('customer', 'customer_check_domain', { domain: 'https://www.Tersedia-Toko.my.id/x' });
    expect(available.status).toBe(200);
    expect(available.body.check).toEqual({ domain: 'tersedia-toko.my.id', tld: 'my.id', status: 'available', price: 50000 });
    // Nama yang sama di semua ekstensi: yang diminta dulu, sisanya urutan tabel harga
    const checks = available.body.checks as { domain: string; status: string; price: number }[];
    expect(checks.map((c) => c.domain)).toEqual(['tersedia-toko.my.id', ...DOMAIN_TLDS.filter((t) => t.tld !== 'my.id').map((t) => `tersedia-toko.${t.tld}`)]);
    expect(checks.every((c) => c.status === 'available')).toBe(true);
    expect(checks.find((c) => c.domain === 'tersedia-toko.co.id')?.price).toBe(350000);
    const [taken] = await both('customer', 'customer_check_domain', { domain: 'terpakai.com' }, 'GET');
    expect(taken.body.check).toMatchObject({ status: 'taken', price: 250000 });
    expect((taken.body.checks as unknown[]).length).toBe(DOMAIN_TLDS.length);
    const [unknown] = await both('customer', 'customer_check_domain', { domain: 'lain.co.id' });
    expect(unknown.body.check).toMatchObject({ status: 'unknown', tld: 'co.id', price: 350000 });
    const [bad] = await both('customer', 'customer_check_domain', { domain: 'toko.xyz' });
    expect(bad.status).toBe(400);
    expect((bad.body.errors as Json).domain).toMatch(/^Ekstensi domain belum tersedia/);
    const [staff] = await both('admin', 'customer_check_domain', { domain: 'tersedia.com' });
    expect(staff.status).toBe(403);
  }, 30_000);

  it('pesanan: domain terpakai ditolak, harga = template − diskon + domain, item Midtrans tidak dibuat tanpa kunci', async () => {
    const order = {
      template_id: 301, customer_name: 'Klien Uji', customer_email: 'klien@uji.test', customer_phone: '081234567890',
    };
    const [taken] = await both('customer', 'customer_create_order', { ...order, domain_primary: 'terpakai-toko.com' });
    expect(taken.status).toBe(409);
    expect(taken.body).toMatchObject({ code: 'DOMAIN_UNAVAILABLE', errors: { domain_primary: 'Domain terpakai-toko.com sudah dipakai orang lain. Cek nama lain.' } });
    const [subdomain] = await both('customer', 'customer_create_order', { ...order, domain_primary: 'a.tersedia.com' });
    expect(subdomain.status).toBe(400);

    const created = await both('customer', 'customer_create_order', { ...order, domain_primary: 'tersedia-toko.my.id' });
    for (const [i, backend] of backends.entries()) {
      const o = created[i].body.order as Json;
      expect(o).toMatchObject({ list_price: 1000000, discount_amount: 200000, domain_price: 50000, price: 850000, domain_check: 'available', invoice_number: null });
      backend.numbers.order = String(o.order_number);
      backend.numbers.orderId = String(o.id);
    }
    expect(created[0].body.payment_error).toBe('Pembayaran online belum dikonfigurasi.');
    await rows('SELECT price, list_price, discount_amount, domain_price, domain_check FROM template_orders WHERE user_id = 103');
  }, 30_000);

  it('aktivasi mengisi masa aktif 1 tahun; perpanjangan hanya untuk situs aktif', async () => {
    const byOrder = (b: Backend) => ({ order_number: b.numbers.order });
    const [early] = await both('customer', 'customer_create_renewal', (b) => ({ ...byOrder(b), years: 1 }));
    expect(early.body).toEqual({ error: 'Perpanjangan hanya untuk pesanan yang situsnya sudah aktif.', code: 'RENEWAL_NOT_AVAILABLE' });
    const [notPaid] = await both('customer', 'customer_get_invoice', byOrder, 'GET');
    expect(notPaid.body).toEqual({ error: 'Nota tersedia setelah pembayaran lunas.', code: 'INVOICE_NOT_AVAILABLE' });

    await both('customer', 'dev_simulate_payment', byOrder);
    await both('admin', 'admin_approve_template_order', (b) => ({ id: Number(b.numbers.orderId) }));
    const activated = await both('admin', 'admin_set_order_domain', (b) => ({ id: Number(b.numbers.orderId), domain: 'tersedia-toko.my.id' }));
    for (const result of activated) {
      const o = result.body.order as Record<string, string>;
      expect(o.service_started_at).toBe(o.activated_at);
      expect(o.service_expires_at).toBe(plusYears(o.activated_at, 1));
      expect(o.domain_expires_at).toBe(plusYears(o.activated_at, 1));
      expect((result.body.site as Json).service_expires_at).toBe(o.service_expires_at);
    }

    const detail = await both('customer', 'customer_get_order', byOrder, 'GET');
    for (const result of detail) {
      const offer = result.body.renewal as Json & { options: { years: number; price: number; service_expires_after: string }[] };
      const o = result.body.order as Record<string, string>;
      expect(offer).toMatchObject({ available: true, reason: null, hosting_price_per_year: 300000, domain_price_per_year: 50000, price_per_year: 350000, max_years: 3 });
      expect(offer.options.map((x) => [x.years, x.price, x.service_expires_after])).toEqual(
        [1, 2, 3].map((y) => [y, 350000 * y, plusYears(o.service_expires_at, y)]),
      );
      expect(result.body.renewals).toEqual([]);
    }
  }, 60_000);

  it('perpanjangan: validasi, satu tagihan terbuka, simulasi lunas memperpanjang tanggal, nota', async () => {
    const byOrder = (b: Backend) => ({ order_number: b.numbers.order });
    const [badYears] = await both('customer', 'customer_create_renewal', (b) => ({ ...byOrder(b), years: 4 }));
    expect(badYears.body).toMatchObject({ code: 'VALIDATION', errors: { years: 'Pilih masa perpanjangan 1, 2, atau 3 tahun.' } });
    const [otherOrder] = await both('other', 'customer_create_renewal', (b) => ({ ...byOrder(b), years: 1 }));
    expect(otherOrder.status).toBe(404);

    const created = await both('customer', 'customer_create_renewal', (b) => ({ ...byOrder(b), years: 2 }));
    for (const [i, backend] of backends.entries()) {
      const r = created[i].body.renewal as Json;
      expect(r).toMatchObject({ years: 2, hosting_price_per_year: 300000, domain_price_per_year: 50000, price_per_year: 350000, price: 700000,
        status: 'menunggu_pembayaran', status_label: 'Menunggu Pembayaran', domain: 'tersedia-toko.my.id', invoice_number: null });
      expect(created[i].body.payment_error).toBe('Pembayaran online belum dikonfigurasi.');
      backend.numbers.renewal = String(r.renewal_number);
    }
    const byRenewal = (b: Backend) => ({ renewal_number: b.numbers.renewal });
    const [second] = await both('customer', 'customer_create_renewal', (b) => ({ ...byOrder(b), years: 1 }));
    expect(second.body.code).toBe('RENEWAL_PENDING');
    const [pay] = await both('customer', 'customer_pay_renewal', byRenewal);
    expect(pay.body).toEqual({ error: 'Pembayaran online belum dikonfigurasi.', code: 'PAYMENT_NOT_CONFIGURED' });
    const [invoiceEarly] = await both('customer', 'customer_get_invoice', (b) => ({ ...byOrder(b), ...byRenewal(b) }), 'GET');
    expect(invoiceEarly.body.code).toBe('INVOICE_NOT_AVAILABLE');
    const [foreign] = await both('other', 'dev_simulate_renewal_payment', byRenewal);
    expect(foreign.body).toEqual({ error: 'Tagihan perpanjangan tidak ditemukan.', code: 'RENEWAL_NOT_FOUND' });

    const before = await rows('SELECT service_expires_at, domain_expires_at FROM template_orders WHERE user_id = 103');
    const paid = await both('customer', 'dev_simulate_renewal_payment', byRenewal);
    for (const [i, result] of paid.entries()) {
      const r = result.body.renewal as Record<string, string>;
      const prev = before[i][0] as Record<string, string>;
      expect(r).toMatchObject({ status: 'lunas', payment_status: 'simulated', payment_type: 'simulator', invoice_number: `INV-${backends[i].numbers.renewal}` });
      expect(r.service_expires_before).toBe(prev.service_expires_at);
      expect(r.service_expires_after).toBe(plusYears(prev.service_expires_at, 2));
      expect(r.domain_expires_after).toBe(plusYears(prev.domain_expires_at, 2));
      expect((result.body.order as Json).service_expires_at).toBe(r.service_expires_after);
    }
    const [again] = await both('customer', 'dev_simulate_renewal_payment', byRenewal);
    expect(again.body).toEqual({ error: 'Tagihan perpanjangan ini berstatus "Lunas".', code: 'INVALID_STATUS' });
    const [cancelPaid] = await both('customer', 'customer_cancel_renewal', byRenewal);
    expect(cancelPaid.status).toBe(409);

    const invoice = await both('customer', 'customer_get_invoice', (b) => ({ ...byOrder(b), ...byRenewal(b) }), 'GET');
    expect(invoice[0].body.renewal).toMatchObject({ status: 'lunas' });
    expect((invoice[0].body.company as Json).name).toBe('PT Garuda Nexa Bahtera');
    const purchase = await both('customer', 'customer_get_invoice', byOrder);
    expect((purchase[1].body.order as Json).invoice_number).toBe(`INV-${backends[1].numbers.order}`);
    expect(purchase[0].body.renewal).toBeNull();
  }, 60_000);

  it('customer_get_invoices: nota pembelian + perpanjangan lunas milik sendiri, terbaru dulu', async () => {
    const lists = await both('customer', 'customer_get_invoices', {}, 'GET');
    for (const [i, result] of lists.entries()) {
      const invoices = result.body.invoices as Json[];
      expect(invoices.map((n) => [n.type, n.invoice_number])).toEqual([
        ['perpanjangan', `INV-${backends[i].numbers.renewal}`],
        ['pembelian', `INV-${backends[i].numbers.order}`],
      ]);
      expect(invoices[0]).toMatchObject({ title: 'Template Uji', domain: 'tersedia-toko.my.id', years: 2, amount: 700000, order_number: backends[i].numbers.order });
      expect(invoices[1]).toMatchObject({ amount: 850000, years: null, renewal_number: null, order_status: 'aktif', payment_type: 'simulator' });
    }
    const [other] = await both('other', 'customer_get_invoices', {});
    expect(other.body).toEqual({ success: true, invoices: [] });
  }, 30_000);

  it('batal & riwayat: catatan perpanjangan terlihat pembeli, catatan pembayaran tidak', async () => {
    const byOrder = (b: Backend) => ({ order_number: b.numbers.order });
    const created = await both('customer', 'customer_create_renewal', (b) => ({ ...byOrder(b), years: 1 }));
    created.forEach((result, i) => (backends[i].numbers.second = String((result.body.renewal as Json).renewal_number)));
    const [cancelled] = await both('customer', 'customer_cancel_renewal', (b) => ({ renewal_number: b.numbers.second }));
    expect(cancelled.body.renewal).toMatchObject({ status: 'dibatalkan', payment_url: null });

    const detail = await both('customer', 'customer_get_order', byOrder);
    const logs = detail[0].body.logs as { event: string; note: string | null }[];
    const renewalLogs = normalize(logs.filter((l) => l.event.startsWith('renewal_')).map((l) => [l.event, l.note]));
    expect(renewalLogs).toEqual([
      ['renewal_created', 'Perpanjangan 2 tahun dibuat (GNR-X).'],
      ['renewal_paid', expect.stringMatching(/^Perpanjangan 2 tahun lunas \(GNR-X\)\. Masa aktif sampai \d{1,2} [A-Z][a-z]+ \d{4}\.$/)],
      ['renewal_created', 'Perpanjangan 1 tahun dibuat (GNR-X).'],
      ['renewal_cancelled', 'Perpanjangan GNR-X dibatalkan.'],
    ]);
    expect((detail[0].body.renewals as Json[]).map((r) => r.status)).toEqual(['dibatalkan', 'lunas']);
    const staff = await both('admin', 'admin_get_template_order', (b) => ({ id: Number(b.numbers.orderId) }), 'GET');
    expect((staff[0].body.renewals as Json[]).length).toBe(2);
  }, 30_000);

  it('kartu ditinjau bank (capture): tagihan perpanjangan tidak bisa dibayar ulang', async () => {
    const created = await both('customer', 'customer_create_renewal', (b) => ({ order_number: b.numbers.order, years: 1 }));
    created.forEach((result, i) => (backends[i].numbers.review = String((result.body.renewal as Json).renewal_number)));
    await exec("UPDATE template_renewals SET payment_status = 'capture' WHERE status = 'menunggu_pembayaran'");
    const [pay] = await both('customer', 'customer_pay_renewal', (b) => ({ renewal_number: b.numbers.review }));
    expect(pay.body).toEqual({ error: 'Pembayaran kartu Anda sedang ditinjau bank. Tidak perlu membayar ulang.', code: 'PAYMENT_UNDER_REVIEW' });
    await both('customer', 'customer_cancel_renewal', (b) => ({ renewal_number: b.numbers.review }));
  }, 30_000);

  it('harga domain dihitung dari domain yang divalidasi (www.my.id = ekstensi my.id)', async () => {
    const order = { template_id: 301, customer_name: 'Klien Uji', customer_email: 'klien@uji.test', customer_phone: '081234567890' };
    const created = await both('customer', 'customer_create_order', { ...order, domain_primary: 'www.my.id' });
    expect(created[0].body.order).toMatchObject({ domain_price: 50000, price: 1050000, domain_check: 'unknown' });
    created.forEach((result, i) => (backends[i].numbers.www = String((result.body.order as Json).order_number)));
    await both('customer', 'customer_cancel_order', (b) => ({ order_number: b.numbers.www }));
  }, 30_000);

  it('batas 10 tahun ke depan', async () => {
    await exec("UPDATE template_orders SET service_expires_at = DATE_ADD(NOW(), INTERVAL 114 MONTH), domain_expires_at = DATE_ADD(NOW(), INTERVAL 114 MONTH) WHERE user_id = 103");
    const byOrder = (b: Backend) => ({ order_number: b.numbers.order });
    const [detail] = await both('customer', 'customer_get_order', byOrder, 'GET');
    expect(detail.body.renewal).toMatchObject({ available: false, options: [],
      reason: 'Masa aktif paling lama 10 tahun ke depan. Pilih masa perpanjangan yang lebih pendek.' });
    const [create] = await both('customer', 'customer_create_renewal', (b) => ({ ...byOrder(b), years: 1 }));
    expect(create.body.code).toBe('RENEWAL_TOO_LONG');
  }, 30_000);

  it('profil: baca, validasi per kolom, simpan biodata, foto tidak valid, hapus foto', async () => {
    const [profile] = await both('customer', 'customer_get_profile', {}, 'GET');
    expect(profile.body.profile).toEqual({ id: 103, name: 'Klien Uji', email: 'klien@uji.test', phone: '081234567890', company_name: null,
      address: null, city: null, avatar: null });
    const [invalid] = await both('customer', 'customer_update_profile', { name: 'A', phone: '12', city: 'x'.repeat(101) });
    expect(invalid.body.errors).toEqual({
      name: 'Nama minimal 2 karakter.',
      phone: 'Nomor HP tidak valid. Gunakan 8-15 digit angka, contoh: 081234567890.',
      city: 'Kota maksimal 100 karakter.',
    });
    const gif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const [badType] = await both('customer', 'customer_update_profile', { name: 'Klien Uji', phone: '081234567890', avatar: gif });
    expect(badType.body.errors).toEqual({ avatar: 'Foto profil harus JPG, PNG, atau WEBP.' });
    const [fake] = await both('customer', 'customer_update_profile', { name: 'Klien Uji', phone: '081234567890', avatar: gif.replace('gif', 'png') });
    expect(fake.body.errors).toEqual({ avatar: 'Foto profil harus JPG, PNG, atau WEBP.' });
    const [notImage] = await both('customer', 'customer_update_profile', { name: 'Klien Uji', phone: '081234567890', avatar: 'javascript:alert(1)' });
    expect(notImage.status).toBe(400);
    const [saved] = await both('customer', 'customer_update_profile', {
      name: '  Klien Baru ', phone: '0812-3456-7899', company_name: 'CV Uji', address: 'Jl. Merdeka 1', city: 'Metro', avatar: null,
    });
    expect(saved.body.profile).toEqual({ id: 103, name: 'Klien Baru', email: 'klien@uji.test', phone: '081234567899', company_name: 'CV Uji',
      address: 'Jl. Merdeka 1', city: 'Metro', avatar: null });
    await rows("SELECT name, phone, company_name, address, city, avatar FROM users WHERE id = 103");
  }, 30_000);
});

suite('DewaBiz: daftar harga jual & cek ketersediaan, PHP api.php = Node server.js', () => {
  const { both, exec } = pairHarness('drdb', true);
  const CATALOG = [
    { tld: 'com', price: 250000, requirement: null }, // harga tetap pemilik di atas harga beli 170.000
    { tld: 'id', price: 260000, requirement: null }, // harga beli 260.000 > harga tetap 250.000: tidak dijual rugi
    { tld: 'co.id', price: 350000, requirement: 'Untuk badan usaha: butuh NIB atau akta perusahaan' }, // 280.000 + 25%
    { tld: 'my.id', price: 50000, requirement: null },
    { tld: 'xyz', price: 19000, requirement: null }, // 15.000 + 25% = 18.750 → Rp19.000; promo 9.000 tidak dipakai
  ];

  it('get_domain_prices: ekstensi aktif DewaBiz, populer dulu, tanpa harga beli', async () => {
    const [prices] = await both(null, 'get_domain_prices', {}, 'GET');
    expect(prices.status).toBe(200);
    expect(prices.body).toEqual({ success: true, source: 'dewabiz', domains: CATALOG });
    expect(JSON.stringify(prices.body)).not.toMatch(/\b(170000|160000|280000|15000|9000)\b/);
  }, 30_000);

  it('customer_check_domain: DewaBiz dulu (premium = tidak tersedia), galat DewaBiz → RDAP', async () => {
    const [free] = await both('customer', 'customer_check_domain', { domain: 'bebas-toko.xyz' });
    expect(free.body.check).toEqual({ domain: 'bebas-toko.xyz', tld: 'xyz', status: 'available', price: 19000 });
    expect((free.body.checks as { domain: string }[]).map((c) => c.domain)).toEqual(
      ['bebas-toko.xyz', 'bebas-toko.com', 'bebas-toko.id', 'bebas-toko.co.id', 'bebas-toko.my.id'],
    );
    const [premium] = await both('customer', 'customer_check_domain', { domain: 'premium.com' });
    expect(premium.body.check).toMatchObject({ status: 'taken', price: 250000 });
    const [taken] = await both('customer', 'customer_check_domain', { domain: 'pakai.co.id' });
    expect(taken.body.check).toMatchObject({ status: 'taken', price: 350000 });
    const [fallback] = await both('customer', 'customer_check_domain', { domain: 'tersedia-toko.com' });
    expect(fallback.body.check).toMatchObject({ status: 'available' });
    const [unknown] = await both('customer', 'customer_check_domain', { domain: 'gagal.id' });
    expect(unknown.body.check).toMatchObject({ status: 'unknown', price: 260000 });
    const [notSold] = await both('customer', 'customer_check_domain', { domain: 'toko.net' });
    expect(notSold.body).toMatchObject({ code: 'VALIDATION', errors: { domain: 'Ekstensi domain belum tersedia. Pilih ekstensi dari daftar.' } });
  }, 30_000);

  it('pesanan memakai harga jual DewaBiz; markup bisa diubah admin', async () => {
    const order = { template_id: 301, customer_name: 'Klien Uji', customer_email: 'klien@uji.test', customer_phone: '081234567890' };
    const [premium] = await both('customer', 'customer_create_order', { ...order, domain_primary: 'premium.com' });
    expect(premium.body.code).toBe('DOMAIN_UNAVAILABLE');
    const created = await both('customer', 'customer_create_order', { ...order, domain_primary: 'bebas-toko.xyz' });
    expect(created[0].body.order).toMatchObject({ domain_price: 19000, price: 819000, domain_check: 'available' });

    await exec("INSERT INTO hero_settings (setting_key, setting_value) VALUES ('domain_markup_percent', '40') ON DUPLICATE KEY UPDATE setting_value = '40'");
    // Markup hanya untuk staf: tidak ikut get_settings publik (bisa dipakai menebak harga beli)
    const [settings] = await both(null, 'get_settings', {}, 'GET');
    expect(settings.body).not.toHaveProperty('domain_markup_percent');
    const [pricing] = await both('admin', 'admin_get_domain_pricing', {}, 'GET');
    expect(pricing.body).toEqual({ success: true, source: 'dewabiz', markup_percent: 40, markup_default: 25, hosting_renewal_price: 300000 });
    const [forbidden] = await both('customer', 'admin_get_domain_pricing', {}, 'GET');
    expect(forbidden.status).toBe(403);
    const [prices] = await both(null, 'get_domain_prices', {}, 'GET');
    expect((prices.body.domains as { tld: string; price: number }[]).map((d) => [d.tld, d.price])).toEqual(
      [['com', 250000], ['id', 260000], ['co.id', 392000], ['my.id', 50000], ['xyz', 21000]],
    );
  }, 30_000);
});
