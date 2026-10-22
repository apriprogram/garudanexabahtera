// @vitest-environment node
// Contract value lock (owner decision, docs/platform/SPEC.md §2): only an admin sets or changes project_client.price,
// the "Nilai kontrak" of the project documents. A Developer (role user) gets 403 for update_project with a `price` key
// and for add_project with a price other than empty/zero, and nothing of that request is saved. PHP runs as the real
// backend/api.php under `php -S`, Node as the real backend/server.js, each on its own throwaway database built from
// database/schema.sql + seed.sql. Every request goes to PHP first, then to Node, and must give the same status and JSON.
//
// Needs `php` with mysqli, MySQL/MariaDB (PD_TEST_MYSQL_HOST / _USER / _PASS, default 127.0.0.1, root, no password)
// and the backend dependencies (`npm ci` in backend/); skipped otherwise. Databases are called cvlock_<php|node>_<hex>.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(__dirname, '..', '..');
const LOCKED = { error: 'Hanya admin yang dapat mengubah nilai kontrak.', code: 'FORBIDDEN' };

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

// ── Preconditions (skip, never fail, when the environment cannot run both backends) ──
async function loadEnvironment() {
  const php = spawnSync('php', ['-r', 'echo extension_loaded("mysqli") ? "ok" : "no";'], { encoding: 'utf8' });
  if (php.stdout !== 'ok') return { reason: 'php with mysqli is not installed' };
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
  // security.js reads AUTH_SECRET once at import: the test secret must be in place first
  process.env.AUTH_SECRET = AUTH_SECRET;
  const security = (await import('../../backend/security.js')) as unknown as SecurityModule;
  return { mysql, security };
}
const ENV = await loadEnvironment();
if ('reason' in ENV) console.warn(`[contract value] skipped: ${ENV.reason}`);
type Env = Exclude<typeof ENV, { reason: string }>;

type Who = 'admin' | 'dev' | 'customer';
const USERS: Record<Who, { id: number; role: string; password: string }> = {
  admin: { id: 101, role: 'admin', password: 'hash-admin-101' },
  dev: { id: 102, role: 'user', password: 'hash-dev-102' },
  customer: { id: 103, role: 'customer', password: 'hash-customer-103' },
};
const FIXTURES = `
INSERT INTO users (id, name, email, password, role, status) VALUES
 (101, 'Admin Uji', 'admin@uji.test', 'hash-admin-101', 'admin', 'active'),
 (102, 'Dev Uji', 'dev@uji.test', 'hash-dev-102', 'user', 'active'),
 (103, 'Klien Uji', 'klien@uji.test', 'hash-customer-103', 'customer', 'active');
INSERT INTO project_client (id, name, client_name, service_type, status, price) VALUES
 (201, 'Website Toko Bunga', 'CV Melati', 'website', 'active', 27500000.00),
 (202, 'Aplikasi Kasir', 'Budi', 'mobile_app', 'pending', NULL);
`;
/** What the Project Clients form sends for a new project (ProjectFormDrawer), without `price`. */
const NEW_PROJECT = {
  name: 'Company profile', client_name: 'PT Contoh', client_email: '', client_phone: '', service_type: 'website', status: 'active',
  start_date: '2026-10-22', end_date: '', image: '', project_files: '[]', description: '', assigned_user: 'Dev Uji', show_on_website: 0,
};

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
  for (let i = 0; i < 150; i++) {
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

async function start(name: Backend['name'], db: string, dir: string): Promise<Backend> {
  const port = await freePort();
  const env = { ...process.env, MYSQL_HOST: MYSQL.host, MYSQL_USER: MYSQL.user, MYSQL_PASS: MYSQL.password, MYSQL_DB: db, AUTH_SECRET, TRUST_PROXY: '0' };
  mkdirSync(join(dir, 'public'), { recursive: true });
  const proc = name === 'php'
    ? spawn('php', ['-S', `127.0.0.1:${port}`, '-t', join(ROOT, 'backend')], { env: { ...env, PUBLIC_DIR: join(dir, 'public') }, stdio: 'ignore' })
    : spawn(process.execPath, [join(ROOT, 'backend', 'server.js')], {
      cwd: join(ROOT, 'backend'), env: { ...env, PORT: String(port), PD_STORAGE_DIR: join(dir, 'storage'), NODE_ENV: 'test' }, stdio: 'ignore',
    });
  const base = `http://127.0.0.1:${port}`;
  await waitUntilUp(base, proc);
  return { name, base, db, proc };
}

type Json = Record<string, unknown>;
interface Outcome {
  status: number;
  body: Json;
}

const suite = 'reason' in ENV ? describe.skip : describe;

suite('contract value (project_client.price): admin only, alike in PHP api.php and Node server.js', () => {
  const env = ENV as Env;
  const tmp = mkdtempSync(join(tmpdir(), 'contract-value-'));
  const dbSuffix = crypto.randomBytes(4).toString('hex');
  const backends: Backend[] = [];
  const tokens = new Map<Who, string>();
  const token = (who: Who) => {
    if (!tokens.has(who)) tokens.set(who, env.security.issueToken(USERS[who]).token);
    return tokens.get(who) as string;
  };

  async function send(backend: Backend, who: Who, action: string, input: Json, method: 'GET' | 'POST'): Promise<Outcome> {
    const headers: Record<string, string> = { Authorization: `Bearer ${token(who)}` };
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

  /** PHP first, then Node; same status and JSON; returns the PHP outcome. */
  async function both(who: Who, action: string, input: Json, method: 'GET' | 'POST' = 'POST'): Promise<Outcome> {
    const results: Outcome[] = [];
    for (const backend of backends) results.push(await send(backend, who, action, input, method));
    expect(results[1], `${who} ${method} ${action} ${JSON.stringify(input)}: Node differs from PHP`).toEqual(results[0]);
    return results[0];
  }

  /** The same query on both databases; both must hold the same rows. */
  async function rows(sql: string, values: unknown[] = []) {
    const out: unknown[] = [];
    for (const backend of backends) {
      const conn = await env.mysql.createConnection({ ...MYSQL, database: backend.db });
      out.push((await conn.query(sql, values))[0]);
      await conn.end();
    }
    expect(out[1], `${sql}: Node database differs from PHP`).toEqual(out[0]);
    return out[0] as Json[];
  }
  const project = async (id: number) => (await rows('SELECT name, price, show_on_website FROM project_client WHERE id = ?', [id]))[0];
  const projectCount = async () => Number((await rows('SELECT COUNT(*) AS n FROM project_client'))[0].n);

  beforeAll(async () => {
    for (const name of ['php', 'node'] as const) {
      const db = `cvlock_${name}_${dbSuffix}`;
      const admin = await env.mysql.createConnection({ ...MYSQL, multipleStatements: true });
      await admin.query(`CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await admin.end();
      const conn = await env.mysql.createConnection({ ...MYSQL, database: db, multipleStatements: true });
      await conn.query(readFileSync(join(ROOT, 'database', 'schema.sql'), 'utf8'));
      await conn.query(readFileSync(join(ROOT, 'database', 'seed.sql'), 'utf8'));
      await conn.query(FIXTURES);
      await conn.end();
      backends.push(await start(name, db, join(tmp, name)));
    }
  }, 120_000);

  afterAll(async () => {
    for (const backend of backends) backend.proc.kill();
    if (!backends.length) return;
    const admin = await env.mysql.createConnection(MYSQL);
    for (const backend of backends) {
      if (/^cvlock_(php|node)_[0-9a-f]{8}$/.test(backend.db)) await admin.query(`DROP DATABASE IF EXISTS \`${backend.db}\``);
    }
    await admin.end();
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }, 60_000);

  it('a Developer cannot change it with update_project (any price key, GET or POST), and nothing of that request is saved', async () => {
    // Even the current value, null or empty: sending `price` at all is a change request
    for (const price of [30000000, '30000000', '27500000.00', 0, '0', null, '']) {
      const out = await both('dev', 'update_project', { id: 201, name: 'Diubah Developer', price });
      expect({ status: out.status, body: out.body }, JSON.stringify(price)).toEqual({ status: 403, body: LOCKED });
    }
    for (const id of [201, 202]) {
      const out = await both('dev', 'update_project', { id: String(id), name: 'Diubah lewat GET', price: '1' }, 'GET');
      expect({ status: out.status, body: out.body }).toEqual({ status: 403, body: LOCKED });
    }
    expect(await project(201)).toEqual({ name: 'Website Toko Bunga', price: '27500000.00', show_on_website: 0 });
    expect(await project(202)).toEqual({ name: 'Aplikasi Kasir', price: null, show_on_website: 0 });

    // Everything else stays editable for a Developer, the value untouched
    expect(await both('dev', 'update_project', { id: 201, name: 'Website Toko Bunga (revisi)', status: 'active' })).toEqual({ status: 200, body: { success: true } });
    expect(await both('dev', 'update_project', { id: 201, show_on_website: 1 })).toEqual({ status: 200, body: { success: true } });
    expect(await project(201)).toEqual({ name: 'Website Toko Bunga (revisi)', price: '27500000.00', show_on_website: 1 });
  }, 30_000);

  it('a Developer creates projects only without a contract value', async () => {
    const before = await projectCount();
    for (const price of [5000000, '5000000', '1e6', -1, ' 0', '0x0', 'abc', false, true, [], {}]) {
      const out = await both('dev', 'add_project', { ...NEW_PROJECT, price });
      expect({ status: out.status, body: out.body }, JSON.stringify(price)).toEqual({ status: 403, body: LOCKED });
    }
    const viaGet = await both('dev', 'add_project', { name: 'Lewat GET', client_name: 'X', service_type: 'website', status: 'active', price: '5' }, 'GET');
    expect({ status: viaGet.status, body: viaGet.body }).toEqual({ status: 403, body: LOCKED });
    expect(await projectCount()).toBe(before);

    // No price (what the form sends for a Developer) or an empty/zero one: saved as 0, like before the lock
    const zeroes: unknown[] = [undefined, 0, '0', '0.00', '.0', null, ''];
    for (const price of zeroes) {
      const input = price === undefined ? NEW_PROJECT : { ...NEW_PROJECT, price };
      const out = await both('dev', 'add_project', input);
      expect(out.status, JSON.stringify(price)).toBe(200);
      expect(out.body).toMatchObject({ success: true });
      expect((await project(Number(out.body.id))).price).toBe('0.00');
    }
    expect(await projectCount()).toBe(before + zeroes.length);
  }, 30_000);

  it('an admin still sets and changes it; pd_project_save stays admin only; customers never reach update_project', async () => {
    const created = await both('admin', 'add_project', { ...NEW_PROJECT, name: 'Aplikasi admin', price: 12500000 });
    expect(created.status).toBe(200);
    expect((await project(Number(created.body.id))).price).toBe('12500000.00');
    expect(await both('admin', 'update_project', { id: 202, price: '15000000' })).toEqual({ status: 200, body: { success: true } });
    expect((await project(202)).price).toBe('15000000.00');

    const devSave = await both('dev', 'pd_project_save', { id: 202, price: 1, payment_terms: [] });
    expect({ status: devSave.status, body: devSave.body }).toEqual({ status: 403, body: { error: 'Akses ditolak: hanya admin.', code: 'FORBIDDEN' } });
    const customer = await both('customer', 'update_project', { id: 202, price: 1 });
    expect({ status: customer.status, body: customer.body }).toEqual({ status: 403, body: { error: 'Akses ditolak.', code: 'FORBIDDEN' } });
    expect((await project(202)).price).toBe('15000000.00');
  }, 30_000);
});
