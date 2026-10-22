// @vitest-environment node
// pd_* actions (docs/platform/PROJECT-DOCS-SPEC.md) end to end on BOTH backends side by side: the real backend/api.php
// under `php -S` and the real Node module behind server.js's middleware chain (security.js auth gate →
// handleProjectDocsAction), each on its own fresh MySQL/MariaDB database built from database/schema.sql + seed.sql.
// Every step runs on PHP first, then on Node, and must give the same HTTP status and JSON (timestamps and IP addresses
// aside); the steps also check the behaviour itself: access matrix, numbering, locking, approval and signing, change
// management, invoice math, payments and receipts, overdue notices and private files.
//
// Needs `php` with mysqli, a MySQL/MariaDB server (PD_TEST_MYSQL_HOST / PD_TEST_MYSQL_USER / PD_TEST_MYSQL_PASS,
// default 127.0.0.1, root, no password) and the backend dependencies (`npm ci` in backend/). The suite is skipped when
// one of them is missing. The throwaway databases are called pdtest_<random> and dropped afterwards.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import { handleProjectDocsAction } from '../../backend/modules/project_docs.js';
import { pdRenderTypedSignature } from '../../backend/modules/project_docs/files.js';
import { calcInvoice, romawi } from '../../src/features/project-docs/engine';
import { CLIENT_VISIBLE_ACTIVITY, type InvoiceItem } from '../../src/features/project-docs/types';

const ROOT = resolve(__dirname, '..', '..');

// ── Minimal shapes of the backend dependencies (loaded from backend/node_modules) ──
interface SqlConn {
  query(sql: string, values?: unknown[]): Promise<[unknown, unknown]>;
  end(): Promise<void>;
}
interface MysqlModule {
  createPool(options: Record<string, unknown>): SqlConn;
  createConnection(options: Record<string, unknown>): Promise<SqlConn>;
}
type Req = { query: Record<string, unknown>; body: Record<string, unknown> };
type Middleware = (...args: never[]) => unknown;
interface ExpressApp {
  set(name: string, value: unknown): void;
  disable(name: string): void;
  use(...handlers: unknown[]): void;
  get(path: string, handler: (req: Req, res: unknown) => Promise<void>): void;
  post(path: string, handler: (req: Req, res: unknown) => Promise<void>): void;
  listen(port: number, host: string, ready: () => void): { close(done: () => void): void };
}
interface ExpressModule {
  (): ExpressApp;
  json(options: Record<string, unknown>): Middleware;
}
interface SecurityModule {
  createAuthGate(pool: SqlConn): Middleware;
  securityHeaders: Middleware;
  maskServerErrors: Middleware;
  errorHandler: Middleware;
  issueToken(user: { id: number; role: string; password: string }): { token: string };
}

const MYSQL = {
  host: process.env.PD_TEST_MYSQL_HOST || '127.0.0.1',
  user: process.env.PD_TEST_MYSQL_USER || 'root',
  password: process.env.PD_TEST_MYSQL_PASS || '',
};
const AUTH_SECRET = crypto.randomBytes(32).toString('hex');
const UA = 'PdParityTest/1.0';

// ── Preconditions (skip, never fail, when the environment cannot run both backends) ──
async function loadEnvironment() {
  const php = spawnSync('php', ['-r', 'echo extension_loaded("mysqli") ? "ok" : "no";'], { encoding: 'utf8' });
  if (php.stdout !== 'ok') return { reason: 'php with mysqli is not installed' };
  const fromBackend = createRequire(join(ROOT, 'backend', 'package.json'));
  let mysql: MysqlModule;
  let express: ExpressModule;
  try {
    mysql = ((await import(pathToFileURL(fromBackend.resolve('mysql2/promise')).href)) as { default: MysqlModule }).default;
    express = ((await import(pathToFileURL(fromBackend.resolve('express')).href)) as { default: ExpressModule }).default;
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
  return { mysql, express, security };
}
const ENV = await loadEnvironment();
if ('reason' in ENV) console.warn(`[project-docs parity] skipped: ${ENV.reason}`);

// ── Fixtures (same rows in both databases) ──
type Who = 'admin' | 'dev' | 'a' | 'b' | 'anon';
const USERS = {
  admin: { id: 101, role: 'admin', password: 'hash-admin-101' },
  dev: { id: 102, role: 'user', password: 'hash-dev-102' },
  a: { id: 103, role: 'customer', password: 'hash-a-103' },
  b: { id: 104, role: 'customer', password: 'hash-b-104' },
};
const FIXTURES = `
INSERT INTO users (id, name, email, password, role, status) VALUES
 (101, 'Admin Uji', 'admin@uji.test', 'hash-admin-101', 'admin', 'active'),
 (102, 'Dev Uji', 'dev@uji.test', 'hash-dev-102', 'user', 'active'),
 (103, 'Klien A', 'klien.a@uji.test', 'hash-a-103', 'customer', 'active'),
 (104, 'Klien B', 'klien.b@uji.test', 'hash-b-104', 'customer', 'active');
INSERT INTO project_client (id, name, client_name, client_email, service_type, status, price, start_date, end_date, description) VALUES
 (201, 'Website Toko Bunga', 'CV Melati', 'melati@contoh.test', 'website', 'active', 27500000.00, '2026-10-01', '2026-12-31', 'Toko online bunga'),
 (202, 'Aplikasi Kasir', 'Budi', 'budi@contoh.test', 'mobile_app', 'active', 15000000.00, '2026-09-01', '2026-11-30', NULL),
 (203, 'Desain Ulang', 'PT Lain', NULL, 'ui_ux', 'pending', 1000000.00, NULL, NULL, NULL);
`;

// Dates in Asia/Jakarta, like pd_today() in both backends
const jakartaDate = (offsetDays = 0) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(Date.now() + offsetDays * 86_400_000));
const TODAY = jakartaDate();
const YEAR = TODAY.slice(0, 4);
const ROMAN = romawi(Number(TODAY.slice(5, 7)));
const docNumber = (seq: number, code: string) => `${String(seq).padStart(3, '0')}/${code}/GNB/${ROMAN}/${YEAR}`;

const content = (title: string) => ({
  title,
  sections: [
    { id: 'pendahuluan', title: 'Pendahuluan', body: 'Dokumen untuk {{client.name}} senilai {{project.value_rupiah}}.\n\n- poin satu\n- **poin dua**' },
    { id: 'tabel', title: 'Tabel', table: { columns: ['No', 'Item'], rows: [['1', 'Desain'], ['2', 'Kode']] } },
  ],
});
const SIGNATURE_PNG = `data:image/png;base64,${(pdRenderTypedSignature('Sari Wulandari') as Buffer).toString('base64')}`;
const PROOF_PDF = `data:application/pdf;base64,${Buffer.from('%PDF-1.4\n% bukti transfer uji\n').toString('base64')}`;

// ── Servers ──
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
  stop(): Promise<void>;
}

async function startPhp(db: string, dir: string): Promise<Backend> {
  const port = await freePort();
  mkdirSync(join(dir, 'public'), { recursive: true });
  // Private storage = dirname(PUBLIC_DIR)/storage/project-docs, inside the temp folder
  const proc: ChildProcess = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', join(ROOT, 'backend')], {
    env: {
      ...process.env,
      MYSQL_HOST: MYSQL.host,
      MYSQL_USER: MYSQL.user,
      MYSQL_PASS: MYSQL.password,
      MYSQL_DB: db,
      AUTH_SECRET,
      PUBLIC_DIR: join(dir, 'public'),
      TRUST_PROXY: '0',
    },
    stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(`${base}/api.php?action=get_settings`);
      return { name: 'php', base, db, stop: async () => void proc.kill() };
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  proc.kill();
  throw new Error('php -S did not start');
}

// server.js order: security headers, JSON body, error masking, auth gate, the pd_* handler, the error handler
async function startNode(db: string, dir: string, env: Exclude<typeof ENV, { reason: string }>): Promise<Backend> {
  process.env.PD_STORAGE_DIR = join(dir, 'storage');
  const pool = env.mysql.createPool({ ...MYSQL, database: db, waitForConnections: true, connectionLimit: 10 });
  const app = env.express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(env.security.securityHeaders);
  app.use(env.express.json({ limit: '64mb', verify: (req: { rawBody?: Buffer }, _res: unknown, buf: Buffer) => { req.rawBody = buf; } }));
  app.use(env.security.maskServerErrors);
  app.use('/api.php', env.security.createAuthGate(pool));
  const unknown = (res: unknown) => (res as { status(n: number): { json(b: unknown): void } }).status(400).json({ error: 'Aksi tidak dikenal.' });
  app.get('/api.php', async (req, res) => {
    if (!(await handleProjectDocsAction(req.query.action, req.query, req, res, pool))) unknown(res);
  });
  app.post('/api.php', async (req, res) => {
    if (!(await handleProjectDocsAction(req.body.action ?? req.query.action, req.body, req, res, pool))) unknown(res);
  });
  app.use(env.security.errorHandler);
  const port = await freePort();
  const server = await new Promise<{ close(done: () => void): void }>((done) => {
    const s = app.listen(port, '127.0.0.1', () => done(s));
  });
  return {
    name: 'node',
    base: `http://127.0.0.1:${port}`,
    db,
    stop: async () => {
      await new Promise<void>((done) => server.close(() => done()));
      await pool.end();
    },
  };
}

// ── Calls ──
type Json = Record<string, unknown>;
interface Outcome {
  status: number;
  body?: Json;
  /** pd_file: the response headers that matter and a hash of the content (PNG: of the pixels) */
  headers?: string[];
  file?: string;
}
type Saved = Record<string, Json>;
type Input = Json | ((saved: Saved) => Json);

const tokens = new Map<Who, string>();
function tokenOf(who: Who, env: Exclude<typeof ENV, { reason: string }>) {
  if (who === 'anon') return '';
  if (!tokens.has(who)) tokens.set(who, env.security.issueToken(USERS[who]).token);
  return tokens.get(who) as string;
}

// Same image, compressed differently by the two PNG writers: compare the inflated pixel data
function pngPixels(bytes: Buffer) {
  if (bytes.subarray(1, 4).toString() !== 'PNG') return null;
  const parts: Buffer[] = [];
  for (let pos = 8; pos + 12 <= bytes.length; ) {
    const size = bytes.readUInt32BE(pos);
    if (bytes.toString('latin1', pos + 4, pos + 8) === 'IDAT') parts.push(bytes.subarray(pos + 8, pos + 8 + size));
    pos += 12 + size;
  }
  return `png:${crypto.createHash('sha256').update(zlib.inflateSync(Buffer.concat(parts))).digest('hex')}`;
}

const FILE_HEADERS = ['content-type', 'content-disposition', 'cache-control', 'content-security-policy', 'x-content-type-options'];

async function send(backend: Backend, token: string, action: string, input: Json): Promise<Outcome> {
  const res = await fetch(`${backend.base}/api.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ action, ...input }),
  });
  if (action === 'pd_file' && res.status === 200) {
    const bytes = Buffer.from(await res.arrayBuffer());
    return {
      status: 200,
      headers: FILE_HEADERS.map((h) => `${h}: ${res.headers.get(h)}`),
      file: pngPixels(bytes) ?? `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`,
    };
  }
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) as Json };
  } catch {
    return { status: res.status, body: { raw: text.slice(0, 300) } };
  }
}

// Timestamps and addresses legitimately differ between the two runs
const VOLATILE = new Set(['created_at', 'updated_at', 'submitted_at', 'approved_at', 'completed_at', 'signed_at', 'read_at']);
function normalize(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((v) => normalize(v));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v, k)]));
  }
  if (VOLATILE.has(key) && value !== null) return '<ts>';
  if (key === 'ip' && value !== null) return '<ip>';
  return value;
}

// ── The suite ──
const suite = 'reason' in ENV ? describe.skip : describe;

suite('pd_* actions: PHP api.php and Node server.js give the same answers', () => {
  const env = ENV as Exclude<typeof ENV, { reason: string }>;
  const tmp = mkdtempSync(join(tmpdir(), 'pd-parity-'));
  const dbSuffix = crypto.randomBytes(4).toString('hex');
  const backends: Backend[] = [];
  const saved: Record<Backend['name'], Saved> = { php: {}, node: {} };

  /**
   * Runs one action on PHP, then on Node (so both databases go through the same states), expects the same status and
   * JSON, and returns the (normalized) PHP outcome. `save` keeps each backend's raw body for later inputs.
   */
  async function both(who: Who, action: string, input: Input = {}, save?: string): Promise<Outcome & { body: Json }> {
    const results: Outcome[] = [];
    for (const backend of backends) {
      const body = typeof input === 'function' ? input(saved[backend.name]) : input;
      const out = await send(backend, tokenOf(who, env), action, body);
      if (save && out.body) saved[backend.name][save] = out.body;
      results.push(out.body ? { ...out, body: normalize(out.body) as Json } : out);
    }
    expect(results[1], `${who} ${action}: Node differs from PHP`).toEqual(results[0]);
    return results[0] as Outcome & { body: Json };
  }
  const ok = async (who: Who, action: string, input: Input = {}, save?: string) => {
    const out = await both(who, action, input, save);
    expect(out.status, `${who} ${action}: ${JSON.stringify(out.body)}`).toBe(200);
    expect(out.body.success).toBe(true);
    return out.body;
  };
  const fails = async (status: number, code: string | null, who: Who, action: string, input: Input = {}) => {
    const out = await both(who, action, input);
    expect(out.status, `${who} ${action}`).toBe(status);
    if (code) expect(out.body.code).toBe(code);
    return out.body;
  };
  const project = async (who: Who, projectId: number) =>
    (await ok(who, who === 'a' || who === 'b' ? 'pd_my_project' : 'pd_project_get', { id: projectId })).project as Json;
  const documentOf = async (docKey: string, field = 'id') =>
    (await ok('admin', 'pd_document_get', (s) => ({ id: s[docKey][field] }))).document as Json;

  beforeAll(async () => {
    for (const name of ['php', 'node'] as const) {
      const db = `pdtest_${name}_${dbSuffix}`;
      const admin = await env.mysql.createConnection({ ...MYSQL, multipleStatements: true });
      await admin.query(`CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await admin.end();
      const conn = await env.mysql.createConnection({ ...MYSQL, database: db, multipleStatements: true });
      await conn.query(readFileSync(join(ROOT, 'database', 'schema.sql'), 'utf8'));
      await conn.query(readFileSync(join(ROOT, 'database', 'seed.sql'), 'utf8'));
      await conn.query(FIXTURES);
      await conn.end();
      const dir = join(tmp, name);
      backends.push(name === 'php' ? await startPhp(db, dir) : await startNode(db, dir, env));
    }
  }, 120_000);

  afterAll(async () => {
    for (const backend of backends) await backend.stop();
    const admin = await env.mysql.createConnection(MYSQL);
    for (const backend of backends) {
      if (/^pdtest_(php|node)_[0-9a-f]{8}$/.test(backend.db)) await admin.query(`DROP DATABASE IF EXISTS \`${backend.db}\``);
    }
    await admin.end();
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    delete process.env.PD_STORAGE_DIR;
  }, 60_000);

  it('auth gate: role lists of api.php and security.js, default deny', async () => {
    await fails(401, 'UNAUTHORIZED', 'anon', 'pd_dashboard');
    await fails(401, 'UNAUTHORIZED', 'anon', 'pd_notifications_list');
    // customers never reach staff or admin actions
    for (const action of ['pd_dashboard', 'pd_projects_list', 'pd_settings_get', 'pd_document_get', 'pd_client_save']) {
      await fails(403, 'FORBIDDEN', 'a', action, { id: 1 });
    }
    // staff never use the customer actions
    for (const who of ['admin', 'dev'] as const) await fails(403, 'FORBIDDEN', who, 'pd_my_projects');
    // admin-only actions (ADMIN_ACTIONS) for the Developer
    for (const action of [
      'pd_client_save', 'pd_customers_list', 'pd_project_save', 'pd_milestone_delete', 'pd_document_change',
      'pd_document_sign', 'pd_document_complete', 'pd_document_delete', 'pd_invoice_create', 'pd_payment_record',
      'pd_settings_save',
    ]) {
      await fails(403, 'FORBIDDEN', 'dev', action, { id: 1 });
    }
    // read actions for staff, notifications for every role
    await ok('dev', 'pd_settings_get');
    await ok('dev', 'pd_dashboard');
    for (const who of ['admin', 'dev', 'a', 'b'] as const) {
      const list = await ok(who, 'pd_notifications_list');
      expect(list).toEqual({ success: true, notifications: [], unread: 0 });
    }
  });

  it('workspace setup: clients linked to customer accounts, project codes, weighted progress', async () => {
    await ok('admin', 'pd_settings_save', {
      company: {
        name: 'PT Garuda Nexa Bahtera', address: 'Jl. Uji No. 1', city: 'Bandung', phone: '022-123', email: 'info@garudanexa.com',
        website: 'https://garudanexa.com', npwp: '', signatory_name: 'Budi Santoso', signatory_title: 'Direktur',
        bank_accounts: [{ bank: 'BCA', number: '1234567890', holder: 'PT Garuda Nexa Bahtera' }],
      },
      tax: { ppn_enabled: true, ppn_rate: 12, dpp_numerator: 11, dpp_denominator: 12, pph23_rate: 2 },
    });
    // a client may only link a customer account
    await fails(400, 'VALIDATION', 'admin', 'pd_client_save', { type: 'perusahaan', name: 'Salah tautan', user_id: 102 });
    await ok('admin', 'pd_client_save', { type: 'perusahaan', name: 'CV Melati Wangi', pic_name: 'Sari', pic_title: 'Pemilik', email: 'sari@melati.test', city: 'Bogor', user_id: 103 }, 'clientA');
    await ok('admin', 'pd_client_save', { type: 'perorangan', name: 'Budi Hartono', user_id: 104 }, 'clientB');
    const customers = await ok('admin', 'pd_customers_list');
    expect((customers.customers as Json[]).map((c) => c.id)).toEqual([103, 104]);

    const terms = [
      { key: 'dp', label: 'Uang muka (DP)', percent: 50, trigger: 'kontrak', due_days: 7 },
      { key: 'termin2', label: 'Termin 2', percent: 30, trigger: 'uji', due_days: 7 },
      { key: 'pelunasan', label: 'Pelunasan', percent: 20, trigger: 'serah_terima', due_days: 7 },
    ];
    await fails(400, 'VALIDATION', 'admin', 'pd_project_save', { id: 201, payment_terms: [{ ...terms[0], percent: 90 }] });
    await ok('admin', 'pd_project_save', (s) => ({
      id: 201, client_id: s.clientA.id, scope_summary: 'Toko online dan panel admin', use_mou: false, has_maintenance: false,
      maintenance_fee: null, maintenance_period: null, maintenance_start: null, maintenance_end: null, payment_terms: terms,
    }));
    await ok('admin', 'pd_project_save', (s) => ({ id: 202, client_id: s.clientB.id, payment_terms: terms }));
    await ok('admin', 'pd_project_save', { id: 203, payment_terms: [{ key: 'lunas', label: 'Lunas', percent: 100, trigger: 'manual', due_days: 0 }] });

    const list = await ok('dev', 'pd_projects_list');
    const codes = Object.fromEntries((list.projects as Json[]).map((p) => [p.id, p.code]));
    expect(codes).toEqual({ 201: `PRJ-${YEAR}-001`, 202: `PRJ-${YEAR}-002`, 203: `PRJ-${YEAR}-003` });

    await ok('dev', 'pd_milestone_save', { project_id: 201, title: 'Desain', weight: 1, progress: 100, status: 'selesai', start_date: '2026-10-01', due_date: '2026-10-15' });
    await ok('dev', 'pd_milestone_save', { project_id: 201, title: 'Pengembangan', weight: 3, progress: 40, status: 'berjalan' }, 'm2');
    const p = await project('dev', 201);
    // Σ(weight × progress) / Σ weight = (100 + 120) / 4
    expect(p.progress).toBe(55);
    expect(p.stage).toBe('perencanaan');
    expect(p.missing_docs).toEqual(['brd']);
  });

  it('numbering: {SEQ:3}/{CODE}/{PREFIX}/{ROMAN_MONTH}/{YEAR}, one sequence per code and year', async () => {
    const brd = await ok('dev', 'pd_document_create', { project_id: 201, doc_type: 'brd', title: 'BRD Toko Bunga', content: content('Dokumen Kebutuhan Bisnis') }, 'brd');
    expect(brd.number).toBe(docNumber(1, 'BRD'));
    // one document per type and project (invoices and receipts excepted)
    await fails(409, 'DUPLICATE', 'dev', 'pd_document_create', { project_id: 201, doc_type: 'brd', title: 'BRD lagi', content: content('x') });
    expect((await ok('admin', 'pd_document_create', { project_id: 202, doc_type: 'brd', title: 'BRD Kasir', content: content('BRD') }, 'brdB')).number)
      .toBe(docNumber(2, 'BRD'));
    expect((await ok('admin', 'pd_document_create', { project_id: 201, doc_type: 'proposal', title: 'Proposal & Penawaran', content: content('Proposal') }, 'prp')).number)
      .toBe(docNumber(1, 'PRP'));
    expect((await ok('admin', 'pd_document_create', { project_id: 201, doc_type: 'pks', title: 'PKS + SOW', content: content('PKS') }, 'pks')).number)
      .toBe(docNumber(1, 'PKS'));
    expect((await ok('dev', 'pd_document_create', { project_id: 201, doc_type: 'timeline', title: 'Jadwal', content: content('Jadwal') }, 'tml')).number)
      .toBe(docNumber(1, 'TML'));
    // invoices and receipts are not created here
    await fails(400, 'VALIDATION', 'admin', 'pd_document_create', { project_id: 201, doc_type: 'invoice', title: 'Inv', content: content('x') });
  });

  it('Developer limits are enforced by the handlers, not only the UI', async () => {
    await fails(403, 'FORBIDDEN', 'dev', 'pd_document_create', { project_id: 202, doc_type: 'proposal', title: 'P', content: content('x') });
    await fails(403, 'FORBIDDEN', 'dev', 'pd_document_save', (s) => ({ id: s.prp.id, content: content('x') }));
    await fails(403, 'FORBIDDEN', 'dev', 'pd_document_submit', (s) => ({ id: s.pks.id }));
    // reading everything is allowed
    expect(((await ok('dev', 'pd_document_get', (s) => ({ id: s.prp.id }))).document as Json).doc_type).toBe('proposal');
  });

  it('customers see only their own projects and never a draft', async () => {
    expect(((await ok('a', 'pd_my_projects')).projects as Json[]).map((p) => p.id)).toEqual([201]);
    expect(((await ok('b', 'pd_my_projects')).projects as Json[]).map((p) => p.id)).toEqual([202]);
    await fails(404, 'NOT_FOUND', 'a', 'pd_my_project', { id: 202 });
    await fails(404, 'NOT_FOUND', 'b', 'pd_my_project', { id: 201 });
    // every document of project 201 is still a draft
    expect((await project('a', 201)).documents).toEqual([]);
    await fails(404, 'NOT_FOUND', 'a', 'pd_my_document', (s) => ({ id: s.brd.id }));

    expect(await ok('dev', 'pd_document_submit', (s) => ({ id: s.brd.id }))).toEqual({ success: true, status: 'menunggu_persetujuan', version: 1 });
    const mine = await project('a', 201);
    expect((mine.documents as Json[]).map((d) => d.doc_type)).toEqual(['brd']);
    expect((mine.activity as Json[]).every((a) => CLIENT_VISIBLE_ACTIVITY.includes(a.action as never))).toBe(true);
    const doc = (await ok('a', 'pd_my_document', (s) => ({ id: s.brd.id }))).document as Json;
    expect(doc.status).toBe('menunggu_persetujuan');
    expect(doc.revisions).toEqual([]);
    await fails(404, 'NOT_FOUND', 'b', 'pd_my_document', (s) => ({ id: s.brd.id }));
    await fails(404, 'NOT_FOUND', 'a', 'pd_my_document', (s) => ({ id: s.brdB.id }));
    // the client was told
    const inbox = await ok('a', 'pd_notifications_list');
    expect((inbox.notifications as Json[]).map((n) => n.type)).toEqual(['doc_review']);
    await fails(403, 'FORBIDDEN', 'a', 'pd_document_submit', (s) => ({ id: s.brd.id }));
  });

  it('a document outside draft is locked: save → 409 LOCKED until withdrawn', async () => {
    await fails(409, 'LOCKED', 'dev', 'pd_document_save', (s) => ({ id: s.brd.id, content: content('Ubah') }));
    expect(await ok('dev', 'pd_document_withdraw', (s) => ({ id: s.brd.id }))).toEqual({ success: true, status: 'draft', version: 1 });
    expect(await ok('dev', 'pd_document_save', (s) => ({ id: s.brd.id, content: content('BRD v2'), change_note: 'Tambah fitur kirim' })))
      .toEqual({ success: true, version: 2 });
    expect(await ok('dev', 'pd_document_restore', (s) => ({ id: s.brd.id, version: 1 }))).toEqual({ success: true, version: 3 });
    const doc = await documentOf('brd');
    expect((doc.revisions as Json[]).map((r) => r.version)).toEqual([3, 2, 1]);
    expect((doc.content as Json).title).toBe('Dokumen Kebutuhan Bisnis');
  });

  it('client rejection: back to draft with revision_requested and the note, approval on resubmit', async () => {
    await ok('dev', 'pd_document_submit', (s) => ({ id: s.brd.id }));
    await fails(400, 'VALIDATION', 'a', 'pd_my_document_decide', (s) => ({ id: s.brd.id, decision: 'rejected' }));
    expect(await ok('a', 'pd_my_document_decide', (s) => ({ id: s.brd.id, decision: 'rejected', note: 'Tambahkan fitur pengiriman' })))
      .toEqual({ success: true, status: 'draft', version: 3 });
    const doc = await documentOf('brd');
    expect(doc).toMatchObject({ status: 'draft', revision_requested: true, review_note: 'Tambahkan fitur pengiriman' });
    expect((doc.approvals as Json[]).map((a) => [a.decision, a.version])).toEqual([['rejected', 3]]);
    // drafts are hidden again
    await fails(404, 'NOT_FOUND', 'a', 'pd_my_document', (s) => ({ id: s.brd.id }));
    const admins = await ok('admin', 'pd_notifications_list');
    expect((admins.notifications as Json[])[0].type).toBe('doc_rejected');

    await ok('dev', 'pd_document_submit', (s) => ({ id: s.brd.id }));
    expect(await ok('a', 'pd_my_document_decide', (s) => ({ id: s.brd.id, decision: 'approved' })))
      .toEqual({ success: true, status: 'disetujui', version: 3 });
    await fails(409, 'STATE', 'a', 'pd_my_document_decide', (s) => ({ id: s.brd.id, decision: 'approved' }));
    expect((await project('dev', 201)).stage).toBe('penawaran');
  });

  it('two-party document (PKS): submit → client approves and signs → company signs → selesai', async () => {
    await ok('admin', 'pd_document_submit', (s) => ({ id: s.prp.id }));
    await ok('a', 'pd_my_document_decide', (s) => ({ id: s.prp.id, decision: 'approved' }));
    expect((await project('dev', 201)).stage).toBe('kontrak');

    await ok('admin', 'pd_document_submit', (s) => ({ id: s.pks.id }));
    // approving a two-party document needs the signature
    await fails(400, 'VALIDATION', 'a', 'pd_my_document_decide', (s) => ({ id: s.pks.id, decision: 'approved', signer_name: 'Sari' }));
    expect(await ok('a', 'pd_my_document_decide', (s) => ({
      id: s.pks.id, decision: 'approved', signer_name: 'Sari Wulandari', signer_title: 'Pemilik', signature: { method: 'draw', data_url: SIGNATURE_PNG },
    }))).toEqual({ success: true, status: 'disetujui', version: 1 });
    expect((await documentOf('pks')).signed_parties).toEqual(['pihak_kedua']);

    expect(await ok('admin', 'pd_document_sign', (s) => ({
      id: s.pks.id, signer_name: 'Budi Santoso', signer_title: 'Direktur', signature: { method: 'type', typed_name: 'Budi Santoso' },
    }))).toEqual({ success: true, status: 'selesai', version: 1 });
    await fails(409, null, 'admin', 'pd_document_sign', (s) => ({ id: s.pks.id, signer_name: 'Budi', signer_title: 'Direktur', signature: { method: 'type', typed_name: 'Budi' } }));

    const pks = await documentOf('pks');
    expect(pks.status).toBe('selesai');
    const signatures = pks.signatures as Json[];
    expect(signatures.map((s) => [s.party, s.method, s.version])).toEqual([['pihak_pertama', 'type', 1], ['pihak_kedua', 'draw', 1]]);
    // the audit hash is the one of the signed version; the image is a pd_file reference
    expect(signatures.every((s) => s.content_hash === pks.content_hash && /^[0-9a-f]{64}$/.test(String(s.content_hash)))).toBe(true);
    expect(signatures.map((s) => s.image_url)).toEqual(signatures.map((s) => `pdfile:sig:${s.id}`));
    expect((pks.merge as Json).signatures).toHaveLength(2);
    // the customer view hides the audit data
    const mine = (await ok('a', 'pd_my_document', (s) => ({ id: s.pks.id }))).document as Json;
    expect((mine.signatures as Json[]).map((s) => [s.ip, s.user_agent])).toEqual([[null, null], [null, null]]);
    expect((await project('dev', 201)).stage).toBe('pengerjaan');
  });

  it('change request: a locked document gets a new draft version and older signatures stop counting', async () => {
    await fails(400, 'VALIDATION', 'admin', 'pd_document_change', (s) => ({ id: s.pks.id, reason: 'pendek' }));
    await fails(409, 'STATE', 'admin', 'pd_document_change', (s) => ({ id: s.tml.id, reason: 'Jadwal masih draft, tidak perlu' }));
    expect(await ok('admin', 'pd_document_change', (s) => ({ id: s.pks.id, reason: 'Perubahan nilai kontrak setelah negosiasi' })))
      .toEqual({ success: true, status: 'draft', version: 2 });
    let pks = await documentOf('pks');
    expect(pks).toMatchObject({ status: 'draft', version: 2, signed_parties: [], signatures: [] });
    expect((await project('dev', 201)).stage).toBe('kontrak');

    await ok('admin', 'pd_document_submit', (s) => ({ id: s.pks.id }));
    // pihak_pertama signed version 1 only: the client's signature alone does not complete version 2
    expect(await ok('a', 'pd_my_document_decide', (s) => ({
      id: s.pks.id, decision: 'approved', signer_name: 'Sari Wulandari', signature: { method: 'type', typed_name: 'Sari Wulandari' },
    }))).toEqual({ success: true, status: 'disetujui', version: 2 });
    expect(await ok('admin', 'pd_document_sign', (s) => ({
      id: s.pks.id, signer_name: 'Budi Santoso', signer_title: 'Direktur', signature: { method: 'draw', data_url: SIGNATURE_PNG },
    }))).toEqual({ success: true, status: 'selesai', version: 2 });
    pks = await documentOf('pks');
    expect((pks.signatures as Json[]).map((s) => [s.party, s.version])).toEqual([['pihak_pertama', 2], ['pihak_kedua', 2]]);
    expect((pks.approvals as Json[]).map((a) => [a.decision, a.version])).toEqual([['approved', 2], ['approved', 1]]);
    for (const backend of backends) saved[backend.name].pksDoc = (await send(backend, tokenOf('admin', env), 'pd_document_get', { id: saved[backend.name].pks.id })).body as Json;
  });

  it('invoice math: server totals, PPN 12% × DPP 11/12 and PPh 23, same as the engine', async () => {
    const items: InvoiceItem[] = [
      { description: 'Uang muka 50% pembuatan website', qty: 1, unit_price: 13750000 },
      { description: 'Domain dan hosting', qty: 2, unit_price: 1250000.4 },
      { description: 'Pembulatan', qty: 3, unit_price: 0.5 },
    ];
    const discount = 250000;
    const created = await ok('admin', 'pd_invoice_create', {
      project_id: 201, term_key: 'dp', items, discount, ppn_enabled: true, pph23_enabled: true,
      issue_date: TODAY, due_date: jakartaDate(14), notes: 'Termin pertama', content: content('Invoice DP'),
      // client-side totals are never trusted
      total: 1, amount_due: 1, subtotal: 1,
    }, 'inv');
    expect(created.number).toBe(docNumber(1, 'INV'));
    await fails(409, 'DUPLICATE', 'admin', 'pd_invoice_create', { project_id: 201, term_key: 'dp', items, discount: 0, ppn_enabled: false, pph23_enabled: false, issue_date: TODAY, due_date: TODAY, content: content('x') });

    const expected = calcInvoice(items, { discount, ppn_enabled: true, ppn_rate: 12, dpp_numerator: 11, dpp_denominator: 12, pph23_enabled: true, pph23_rate: 2 });
    // subtotal 13.750.000 + round(2.500.000,8) + round(1,5); base − 250.000; DPP 11/12; PPN 12 %; PPh 23 2 % of base
    expect(expected).toEqual({
      subtotal: 16250003, discount: 250000, base: 16000003, dpp: 14666669, ppn_rate: 12, ppn_amount: 1760000,
      total: 17760003, pph23_rate: 2, pph23_amount: 320000, amount_due: 17440003,
    });
    let invoice = (await documentOf('inv', 'document_id')).invoice as Json;
    expect(invoice).toMatchObject({ ...expected, ppn_enabled: true, pph23_enabled: true, kind: 'dp', term_key: 'dp', amount_paid: 0, payment_status: 'belum_dibayar' });
    // effective PPN = 11 % of the base
    expect(Math.abs(Number(invoice.ppn_amount) - Number(invoice.base) * 0.11)).toBeLessThan(2);

    // draft update recomputes everything; PPN and PPh off → dpp = base, nothing withheld
    expect(await ok('admin', 'pd_invoice_update', (s) => ({
      id: s.inv.id, term_key: 'dp', items: [items[0]], discount: 0, ppn_enabled: false, pph23_enabled: false,
      issue_date: TODAY, due_date: jakartaDate(14), notes: 'Termin pertama', content: content('Invoice DP'),
    }))).toEqual({ success: true, version: 2 });
    invoice = (await documentOf('inv', 'document_id')).invoice as Json;
    expect(invoice).toMatchObject({ subtotal: 13750000, base: 13750000, dpp: 13750000, ppn_rate: 0, ppn_amount: 0, total: 13750000, pph23_amount: 0, amount_due: 13750000 });
    // and back to PPN + PPh 23 for the payment steps
    await ok('admin', 'pd_invoice_update', (s) => ({
      id: s.inv.id, term_key: 'dp', items, discount, ppn_enabled: true, pph23_enabled: true,
      issue_date: TODAY, due_date: jakartaDate(14), notes: 'Termin pertama', content: content('Invoice DP'),
    }));
    expect((await documentOf('inv', 'document_id')).invoice).toMatchObject(expected);
  });

  it('payments: a receipt per payment, sebagian → lunas, invoice selesai', async () => {
    await fails(409, 'STATE', 'admin', 'pd_payment_record', (s) => ({ invoice_id: s.inv.id, amount: 1000, paid_at: TODAY, method: 'transfer' }));
    expect(await ok('admin', 'pd_document_submit', (s) => ({ id: s.inv.document_id }))).toEqual({ success: true, status: 'disetujui', version: 3 });
    await fails(409, 'LOCKED', 'admin', 'pd_invoice_update', (s) => ({ id: s.inv.id, kind: 'dp', items: [{ description: 'x', qty: 1, unit_price: 1 }], issue_date: TODAY, due_date: TODAY, content: content('x') }));
    expect((await ok('a', 'pd_my_document', (s) => ({ id: s.inv.document_id }))).document).toMatchObject({ doc_type: 'invoice', status: 'disetujui' });
    expect((await ok('a', 'pd_notifications_list')).notifications).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'invoice_issued' })]));

    await fails(400, 'VALIDATION', 'admin', 'pd_payment_record', (s) => ({ invoice_id: s.inv.id, amount: 17440004, paid_at: TODAY, method: 'transfer' }));
    const first = await ok('admin', 'pd_payment_record', (s) => ({
      invoice_id: s.inv.id, amount: 10000000, paid_at: TODAY, method: 'transfer', reference: 'TRX-001', proof: PROOF_PDF, note: 'Cicilan pertama',
    }), 'pay1');
    expect(first).toMatchObject({ receipt_number: docNumber(1, 'KWT'), payment_status: 'sebagian' });
    const second = await ok('admin', 'pd_payment_record', (s) => ({ invoice_id: s.inv.id, amount: 7440003, paid_at: TODAY, method: 'qris' }), 'pay2');
    expect(second).toMatchObject({ receipt_number: docNumber(2, 'KWT'), payment_status: 'lunas' });
    await fails(409, 'STATE', 'admin', 'pd_payment_record', (s) => ({ invoice_id: s.inv.id, amount: 1, paid_at: TODAY, method: 'tunai' }));

    const doc = await documentOf('inv', 'document_id');
    expect(doc.status).toBe('selesai');
    expect(doc.invoice).toMatchObject({ amount_paid: 17440003, remaining: 0, payment_status: 'lunas', overdue: false });
    expect((doc.payments as Json[]).map((p) => [p.amount, p.receipt_number, p.proof_url === null])).toEqual([
      [10000000, docNumber(1, 'KWT'), false],
      [7440003, docNumber(2, 'KWT'), true],
    ]);
    const receipt = (await ok('admin', 'pd_document_get', (s) => ({ id: s.pay2.receipt_document_id }))).document as Json;
    expect(receipt).toMatchObject({ doc_type: 'receipt', status: 'selesai', number: docNumber(2, 'KWT') });
    expect((receipt.merge as Json).payment).toMatchObject({ amount: 7440003, method: 'qris', invoice_number: docNumber(1, 'INV') });
    expect((await ok('a', 'pd_my_document', (s) => ({ id: s.pay1.receipt_document_id }))).document).toMatchObject({ doc_type: 'receipt' });
    expect((await ok('a', 'pd_notifications_list')).notifications).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'payment_received' })]));

    // reversing the second payment: the invoice is open again, the receipt stays in history
    await ok('admin', 'pd_payment_delete', (s) => ({ id: s.pay2.id }));
    expect((await documentOf('inv', 'document_id')).invoice).toMatchObject({ amount_paid: 10000000, payment_status: 'sebagian' });
    expect(((await ok('admin', 'pd_document_get', (s) => ({ id: s.pay2.receipt_document_id }))).document as Json).review_note).toBe('Dibatalkan');
    await ok('admin', 'pd_payment_record', (s) => ({ invoice_id: s.inv.id, amount: 7440003, paid_at: TODAY, method: 'tunai' }));
    expect((await documentOf('inv', 'document_id')).invoice).toMatchObject({ payment_status: 'lunas' });
  });

  it('overdue is derived: due_date < today and unpaid; due-soon and overdue notices once per day', async () => {
    const manual = (title: string, issue: string, due: string) => ({
      project_id: 201, kind: 'lainnya', items: [{ description: title, qty: 1, unit_price: 500000 }], discount: 0,
      ppn_enabled: false, pph23_enabled: false, issue_date: issue, due_date: due, content: content(title),
    });
    await ok('admin', 'pd_invoice_create', manual('Tambahan fitur', jakartaDate(-20), jakartaDate(-5)), 'late');
    await ok('admin', 'pd_invoice_create', manual('Domain tahun kedua', TODAY, jakartaDate(2)), 'soon');
    // a draft is not billed yet
    expect(((await project('dev', 201)).invoices as Json[]).filter((i) => i.overdue)).toEqual([]);
    await ok('admin', 'pd_document_submit', (s) => ({ id: s.late.document_id }));
    await ok('admin', 'pd_document_submit', (s) => ({ id: s.soon.document_id }));

    const invoices = (await project('dev', 201)).invoices as Json[];
    expect(invoices.map((i) => [i.number, i.payment_status, i.overdue])).toEqual(expect.arrayContaining([
      [docNumber(2, 'INV'), 'belum_dibayar', true],
      [docNumber(3, 'INV'), 'belum_dibayar', false],
      [docNumber(1, 'INV'), 'lunas', false],
    ]));
    const dash = await ok('admin', 'pd_dashboard');
    expect(dash.stats).toMatchObject({ invoices_unpaid_count: 2, invoices_unpaid_amount: 1000000, invoices_overdue_count: 1, invoices_overdue_amount: 500000 });
    expect((dash.due_invoices as Json[]).map((i) => i.number).sort()).toEqual([docNumber(2, 'INV'), docNumber(3, 'INV')]);
    expect((await project('dev', 201)).stage).toBe('pengerjaan');

    const notices = async (who: Who) =>
      ((await ok(who, 'pd_notifications_list')).notifications as Json[]).filter((n) => String(n.type).startsWith('invoice_') && n.type !== 'invoice_issued');
    const first = await notices('a');
    expect(first.map((n) => n.type).sort()).toEqual(['invoice_due', 'invoice_overdue']);
    expect(first.every((n) => String(n.link).startsWith('/akun/proyek/201/dokumen/'))).toBe(true);
    // dedupe per invoice per day: listing again creates nothing new
    expect(await notices('a')).toEqual(first);
    expect((await notices('admin')).map((n) => n.type).sort()).toEqual(['invoice_due', 'invoice_overdue']);
    expect(await notices('b')).toEqual([]);

    // paying it off clears the overdue state
    await ok('admin', 'pd_payment_record', (s) => ({ invoice_id: s.late.id, amount: 500000, paid_at: TODAY, method: 'transfer' }));
    expect(((await project('dev', 201)).invoices as Json[]).filter((i) => i.overdue)).toEqual([]);
    await ok('a', 'pd_notifications_read', { all: true });
    expect((await ok('a', 'pd_notifications_list', { unread_only: true })).unread).toBe(0);
  });

  it('pd_file: staff read any file, a customer only the files of an own project; private headers', async () => {
    const [companySig, clientSig] = (saved.php.pksDoc.document as { signatures: Json[] }).signatures;
    for (const who of ['admin', 'dev', 'a'] as const) {
      const out = await both(who, 'pd_file', { ref: `sig:${clientSig.id}` });
      expect(out.status).toBe(200);
      expect(out.headers).toEqual([
        'content-type: image/png',
        `content-disposition: attachment; filename="tanda-tangan-${clientSig.id}.png"`,
        'cache-control: private, no-store',
        "content-security-policy: default-src 'none'; sandbox",
        'x-content-type-options: nosniff',
      ]);
    }
    expect((await both('admin', 'pd_file', { ref: `pdfile:sig:${companySig.id}` })).status).toBe(200);
    await fails(404, 'NOT_FOUND', 'b', 'pd_file', { ref: `sig:${clientSig.id}` });
    await fails(401, 'UNAUTHORIZED', 'anon', 'pd_file', { ref: `sig:${clientSig.id}` });
    await fails(400, 'VALIDATION', 'a', 'pd_file', { ref: '../.env' });
    await fails(404, 'NOT_FOUND', 'admin', 'pd_file', { ref: 'sig:999999' });

    const proof = await both('a', 'pd_file', (s) => ({ ref: `proof:${s.pay1.id}` }));
    expect(proof.status).toBe(200);
    expect(proof.headers?.[0]).toBe('content-type: application/pdf');
    expect(proof.file).toBe(`sha256:${crypto.createHash('sha256').update(Buffer.from(PROOF_PDF.split(',')[1], 'base64')).digest('hex')}`);
    await fails(404, 'NOT_FOUND', 'b', 'pd_file', (s) => ({ ref: `proof:${s.pay1.id}` }));
  });

  it('stage rules 4–9 on a project without milestones: every termin paid, maintenance until the SLA is signed', async () => {
    const stage = async () => (await project('admin', 202)).stage;
    // created, submitted and decided by customer B; two-party types are signed by both
    const finish = async (type: string, key: string) => {
      await ok('admin', 'pd_document_create', { project_id: 202, doc_type: type, title: type.toUpperCase(), content: content(type) }, key);
      await ok('admin', 'pd_document_submit', (s) => ({ id: s[key].id }));
      const signed = ['mou', 'pks', 'uat', 'bast', 'sla'].includes(type);
      const signature = { method: 'type', typed_name: 'Budi Hartono' };
      await ok('b', 'pd_my_document_decide', (s) => ({ id: s[key].id, decision: 'approved', ...(signed ? { signer_name: 'Budi Hartono', signature } : {}) }));
      if (signed) await ok('admin', 'pd_document_sign', (s) => ({ id: s[key].id, signer_name: 'Budi Santoso', signer_title: 'Direktur', signature: { method: 'type', typed_name: 'Budi Santoso' } }));
    };
    const payTerm = async (term: string, amount: number) => {
      const inv = await ok('admin', 'pd_invoice_create', {
        project_id: 202, term_key: term, items: [{ description: term, qty: 1, unit_price: amount }], discount: 0,
        ppn_enabled: false, pph23_enabled: false, issue_date: TODAY, due_date: jakartaDate(7), content: content(term),
      }, `inv202${term}`);
      await ok('admin', 'pd_document_submit', { id: inv.document_id });
      await ok('admin', 'pd_payment_record', { invoice_id: inv.id, amount, paid_at: TODAY, method: 'transfer' });
    };

    await ok('admin', 'pd_document_submit', (s) => ({ id: s.brdB.id }));
    await ok('b', 'pd_my_document_decide', (s) => ({ id: s.brdB.id, decision: 'approved' }));
    await finish('proposal', 'prpB');
    await finish('pks', 'pksB');
    await finish('timeline', 'tmlB');
    // no milestones: rule 4 has nothing to wait for, the UAT is next
    expect(await stage()).toBe('uji');
    await finish('uat', 'uatB');
    expect(await stage()).toBe('serah_terima');
    await finish('bast', 'bastB');
    // no invoice yet, but three termin of a Rp15.000.000 contract are still to be billed
    expect(await stage()).toBe('pelunasan');
    await payTerm('dp', 7500000);
    await payTerm('termin2', 4500000);
    expect(await stage()).toBe('pelunasan');
    await payTerm('pelunasan', 3000000);
    expect(await stage()).toBe('selesai');

    // a maintenance contract: maintenance until the SLA is signed, then while the period runs
    // the whole setup is sent, like the Ringkasan form does (an omitted client_id unlinks the client)
    const maintenance = (end: string) => (saved: Saved) => ({
      id: 202, client_id: saved.clientB.id, payment_terms: [
        { key: 'dp', label: 'DP', percent: 50, trigger: 'kontrak', due_days: 7 },
        { key: 'termin2', label: 'Termin 2', percent: 30, trigger: 'uji', due_days: 7 },
        { key: 'pelunasan', label: 'Pelunasan', percent: 20, trigger: 'serah_terima', due_days: 7 },
      ],
      has_maintenance: true, maintenance_fee: 500000, maintenance_period: 'bulanan', maintenance_start: jakartaDate(-30), maintenance_end: end,
    });
    await ok('admin', 'pd_project_save', maintenance(jakartaDate(365)));
    let p = await project('admin', 202);
    expect([p.stage, p.missing_docs]).toEqual(['maintenance', ['sla']]);
    await finish('sla', 'slaB');
    p = await project('admin', 202);
    expect([p.stage, p.missing_docs]).toEqual(['maintenance', []]);
    await ok('admin', 'pd_project_save', maintenance(jakartaDate(-1)));
    expect(await stage()).toBe('selesai');
  });

  it('both databases end in the same state', async () => {
    const dump = async (db: string) => {
      const conn = await env.mysql.createConnection({ ...MYSQL, database: db, dateStrings: true });
      const tables: Record<string, string> = {
        pd_clients: 'id', pd_milestones: 'id', pd_documents: 'id', pd_document_revisions: 'id', pd_approvals: 'id',
        pd_signatures: 'id', pd_invoices: 'id', pd_payments: 'id', pd_notifications: 'id',
        pd_notification_reads: 'notification_id, user_id', pd_counters: 'counter_key, year', pd_activity: 'id',
      };
      const out: Record<string, unknown> = {};
      for (const [table, order] of Object.entries(tables)) {
        const [rows] = await conn.query(`SELECT * FROM ${table} ORDER BY ${order}`);
        out[table] = (rows as Json[]).map((row) => {
          const copy = { ...row };
          // times, client addresses and random storage names differ by design
          for (const key of [...VOLATILE, 'ip', 'image_file', 'proof_file']) if (key in copy && copy[key] !== null) copy[key] = '<x>';
          return copy;
        });
      }
      const [projects] = await conn.query(
        'SELECT id, client_id, code, stage_override, use_mou, has_maintenance, maintenance_fee, maintenance_period, maintenance_start, maintenance_end, scope_summary, payment_terms, price FROM project_client ORDER BY id',
      );
      const [settings] = await conn.query("SELECT setting_key, setting_value FROM hero_settings WHERE setting_key LIKE 'pd\\_%' ORDER BY setting_key");
      await conn.end();
      return { ...out, project_client: projects, hero_settings: settings };
    };
    const [php, node] = [await dump(backends[0].db), await dump(backends[1].db)];
    expect(node).toEqual(php);
    expect((php.pd_signatures as Json[]).length).toBe(12);
  });

  // Last: parallel creations finish in any order, so the two databases stop matching row for row after this
  it('parallel creations never share a number (pd_counters, atomic)', async () => {
    const results: string[][] = [];
    for (const backend of backends) {
      const calls = Array.from({ length: 6 }, (_, i) =>
        send(backend, tokenOf('admin', env), 'pd_invoice_create', {
          project_id: 203, kind: 'lainnya', items: [{ description: `Paralel ${i + 1}`, qty: 1, unit_price: 100000 }], discount: 0,
          ppn_enabled: false, pph23_enabled: false, issue_date: TODAY, due_date: TODAY, content: content(`Paralel ${i + 1}`),
        }));
      const out = await Promise.all(calls);
      expect(out.map((o) => o.status)).toEqual(Array(6).fill(200));
      results.push(out.map((o) => String(o.body?.number)).sort());
    }
    expect(results[0]).toEqual([7, 8, 9, 10, 11, 12].map((n) => docNumber(n, 'INV')));
    expect(results[1]).toEqual(results[0]);
  });
});
