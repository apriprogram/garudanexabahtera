// @vitest-environment node
// Security review of the project documents (docs/platform/PROJECT-DOCS-SPEC.md §5): attacks that once worked, and the
// refusals that must keep working, on BOTH backends. PHP runs as the real backend/api.php under `php -S`; Node runs as
// the real backend/server.js (the whole server: its legacy actions update_settings / delete_project are part of the
// attack surface), each on its own throwaway database built from database/schema.sql + seed.sql. Every request goes
// to PHP first, then to Node, and must give the same status and JSON (timestamps aside).
//
// Needs `php` with mysqli, MySQL/MariaDB (PD_TEST_MYSQL_HOST / _USER / _PASS, default 127.0.0.1, root, no password)
// and the backend dependencies (`npm ci` in backend/); skipped otherwise. Databases are called pdsec_<random>.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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

const ROOT = resolve(__dirname, '..', '..');

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
if ('reason' in ENV) console.warn(`[project-docs security] skipped: ${ENV.reason}`);
type Env = Exclude<typeof ENV, { reason: string }>;

type Who = 'admin' | 'dev' | 'a' | 'b';
const USERS: Record<Who, { id: number; role: string; password: string }> = {
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
INSERT INTO project_client (id, name, client_name, service_type, status, price, start_date, end_date) VALUES
 (201, 'Website Toko Bunga', 'CV Melati', 'website', 'active', 27500000.00, '2026-10-01', '2026-12-31'),
 (202, 'Aplikasi Kasir', 'Budi', 'mobile_app', 'active', 15000000.00, '2026-09-01', '2026-11-30'),
 (203, 'Proyek Batal', 'PT Lain', 'ui_ux', 'pending', 1000000.00, NULL, NULL);
`;
const TERMS = [
  { key: 'dp', label: 'Uang muka (DP)', percent: 50, trigger: 'kontrak', due_days: 7 },
  { key: 'pelunasan', label: 'Pelunasan', percent: 50, trigger: 'serah_terima', due_days: 7 },
];
const jakarta = (date: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'medium' }).format(date);
const TODAY = jakarta(new Date()).slice(0, 10);
const content = (title: string) => ({
  title,
  sections: [{ id: 'nilai', title: 'Nilai kontrak', body: 'Nilai pekerjaan untuk {{client.name}} sebesar {{project.value_rupiah}}.' }],
});
const typed = (name: string) => ({ method: 'type', typed_name: name });

// ── Forged PNG signatures ──
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Buffer) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, crc]);
}
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function png(width: number, height: number, pixels: Buffer) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([PNG_MAGIC, chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
const dataUrl = (bytes: Buffer, mime = 'image/png') => `data:${mime};base64,${bytes.toString('base64')}`;
const SCRIPT = '<script>alert(document.domain)</script>';
const FORGED_SIGNATURES = {
  svg: dataUrl(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>`), 'image/svg+xml'),
  'svg declared as png': dataUrl(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>`)),
  'html after the png magic': dataUrl(Buffer.concat([PNG_MAGIC, Buffer.from(SCRIPT.repeat(4))])),
  'script after IEND': dataUrl(Buffer.concat([png(10, 10, Buffer.alloc(10 * 41)), Buffer.from(SCRIPT)])),
  'header claiming 4000×2000 pixels': dataUrl(png(4000, 2000, Buffer.alloc(1))),
  'oversized (> 300 KB)': dataUrl(Buffer.concat([PNG_MAGIC, crypto.randomBytes(310_000)])),
};

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
    // private storage = dirname(PUBLIC_DIR)/storage/project-docs, inside the temp folder
    ? spawn('php', ['-S', `127.0.0.1:${port}`, '-t', join(ROOT, 'backend')], { env: { ...env, PUBLIC_DIR: join(dir, 'public') }, stdio: 'ignore' })
    : spawn(process.execPath, [join(ROOT, 'backend', 'server.js')], {
      cwd: join(ROOT, 'backend'), env: { ...env, PORT: String(port), PD_STORAGE_DIR: join(dir, 'storage'), NODE_ENV: 'test' }, stdio: 'ignore',
    });
  const base = `http://127.0.0.1:${port}`;
  await waitUntilUp(base, proc);
  return { name, base, db, proc };
}

// ── Calls ──
type Json = Record<string, unknown>;
interface Outcome {
  status: number;
  body: Json;
}
type Saved = Record<string, Json>;
type Input = Json | ((saved: Saved) => Json);

const VOLATILE = new Set(['created_at', 'updated_at', 'submitted_at', 'approved_at', 'completed_at', 'signed_at', 'read_at']);
function normalize(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((v) => normalize(v));
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v, k)]));
  if (VOLATILE.has(key) && value !== null) return '<ts>';
  if (key === 'ip' && value !== null) return '<ip>';
  return value;
}

const suite = 'reason' in ENV ? describe.skip : describe;

suite('pd_* security review: attacks are refused alike by PHP api.php and Node server.js', () => {
  const env = ENV as Env;
  const tmp = mkdtempSync(join(tmpdir(), 'pd-security-'));
  const dbSuffix = crypto.randomBytes(4).toString('hex');
  const backends: Backend[] = [];
  const saved: Record<Backend['name'], Saved> = { php: {}, node: {} };
  const tokens = new Map<Who, string>();
  const token = (who: Who) => {
    if (!tokens.has(who)) tokens.set(who, env.security.issueToken(USERS[who]).token);
    return tokens.get(who) as string;
  };

  async function send(backend: Backend, who: Who, action: string, input: Json): Promise<Outcome> {
    const res = await fetch(`${backend.base}/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(who)}` },
      body: JSON.stringify({ action, ...input }),
    });
    const text = await res.text();
    try {
      return { status: res.status, body: JSON.parse(text) as Json };
    } catch {
      return { status: res.status, body: { raw: text.slice(0, 300) } };
    }
  }

  /** PHP first, then Node; same status and JSON; returns the normalized PHP outcome. */
  async function both(who: Who, action: string, input: Input = {}, save?: string): Promise<Outcome> {
    const results: Outcome[] = [];
    for (const backend of backends) {
      const out = await send(backend, who, action, typeof input === 'function' ? input(saved[backend.name]) : input);
      if (save) saved[backend.name][save] = out.body;
      results.push({ ...out, body: normalize(out.body) as Json });
    }
    expect(results[1], `${who} ${action}: Node differs from PHP`).toEqual(results[0]);
    return results[0];
  }
  const ok = async (who: Who, action: string, input: Input = {}, save?: string) => {
    const out = await both(who, action, input, save);
    expect(out.status, `${who} ${action}: ${JSON.stringify(out.body)}`).toBe(200);
    return out.body;
  };
  const fails = async (status: number, code: string | null, who: Who, action: string, input: Input = {}) => {
    const out = await both(who, action, input);
    expect(out.status, `${who} ${action}: ${JSON.stringify(out.body)}`).toBe(status);
    if (code) expect(out.body.code).toBe(code);
    return out.body;
  };
  const doc = async (key: string, field = 'id') => (await ok('admin', 'pd_document_get', (s) => ({ id: s[key][field] }))).document as Json;

  beforeAll(async () => {
    for (const name of ['php', 'node'] as const) {
      const db = `pdsec_${name}_${dbSuffix}`;
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
    // Client A (customer 103) owns project 201, client B (customer 104) project 202
    await ok('admin', 'pd_client_save', { type: 'perusahaan', name: 'CV Melati', pic_name: 'Sari', user_id: 103 }, 'clientA');
    await ok('admin', 'pd_client_save', { type: 'perorangan', name: 'Budi', user_id: 104 }, 'clientB');
    await ok('admin', 'pd_project_save', (s) => ({ id: 201, client_id: s.clientA.id, payment_terms: TERMS }));
    await ok('admin', 'pd_project_save', (s) => ({ id: 202, client_id: s.clientB.id, payment_terms: TERMS }));
  }, 120_000);

  afterAll(async () => {
    for (const backend of backends) backend.proc.kill();
    const admin = await env.mysql.createConnection(MYSQL);
    for (const backend of backends) {
      if (/^pdsec_(php|node)_[0-9a-f]{8}$/.test(backend.db)) await admin.query(`DROP DATABASE IF EXISTS \`${backend.db}\``);
    }
    await admin.end();
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }, 60_000);

  it('a Developer cannot overwrite pd_* settings through update_settings, not even with a key that collates equal', async () => {
    const before = await ok('dev', 'pd_settings_get');
    const forged = JSON.stringify({ ...(before.company as Json), bank_accounts: [{ bank: 'Bank Penyerang', number: '999999999', holder: 'Penyerang' }] });
    for (const key of ['pd_company', 'PD_COMPANY', 'Pd_Company ']) {
      await fails(403, 'FORBIDDEN', 'dev', 'update_settings', { settings: { [key]: forged } });
    }
    // utf8mb4_unicode_ci: fullwidth "ｐ" = "p" and a zero-width space is ignored, so these keys hit the pd_company row
    for (const key of ['ｐd_company', '​pd_company']) {
      expect(await fails(400, null, 'dev', 'update_settings', { settings: { [key]: forged } })).toEqual({ error: `Nama setting tidak valid: ${key}` });
    }
    expect(await ok('dev', 'pd_settings_get')).toEqual(before);
    // ordinary landing-page settings still save
    expect(await ok('dev', 'update_settings', { settings: { hero_title: 'Judul baru' } })).toEqual({ success: true, error: null });
  }, 20_000);

  it('a decision or signature binds to the content that was reviewed (content_hash), not just the version number', async () => {
    await ok('admin', 'pd_document_create', { project_id: 201, doc_type: 'pks', title: 'PKS', content: content('PKS') }, 'pks');
    await ok('admin', 'pd_document_submit', (s) => ({ id: s.pks.id }));
    // what the client has on screen
    const seen = (await ok('a', 'pd_my_document', (s) => ({ id: s.pks.id }), 'seen')).document as Json;
    expect((seen.merge as { project: Json }).project.value_rupiah).toBe('Rp27.500.000');
    const seenHash = (s: Saved) => (s.seen.document as Json).content_hash;

    // bait and switch: withdrawn, contract value raised, resubmitted without touching the text → same version 1
    await ok('admin', 'pd_document_withdraw', (s) => ({ id: s.pks.id }));
    await ok('admin', 'pd_project_save', (s) => ({ id: 201, client_id: s.clientA.id, payment_terms: TERMS, price: 99000000 }));
    expect(await ok('admin', 'pd_document_submit', (s) => ({ id: s.pks.id }))).toEqual({ success: true, status: 'menunggu_persetujuan', version: 1 });
    const now = await doc('pks');
    expect(now.content_hash).not.toBe(seen.content_hash);

    const approve = (hash: (s: Saved) => unknown) => (s: Saved) => ({
      id: s.pks.id, decision: 'approved', signer_name: 'Sari', signature: typed('Sari'), content_hash: hash(s),
    });
    await fails(409, 'STATE', 'a', 'pd_my_document_decide', approve(seenHash));
    await fails(409, 'STATE', 'a', 'pd_my_document_decide', (s) => ({ id: s.pks.id, decision: 'rejected', note: 'Nilai berubah?', content_hash: seenHash(s) }));
    await fails(400, 'VALIDATION', 'a', 'pd_my_document_decide', approve(() => 'not-a-hash'));
    await fails(400, 'VALIDATION', 'a', 'pd_my_document_decide', approve(() => ['x']));
    await fails(400, 'VALIDATION', 'a', 'pd_my_document_decide', approve((s) => String(seenHash(s)).toUpperCase()));
    // nothing was signed or decided by the refused calls
    expect(await doc('pks')).toMatchObject({ status: 'menunggu_persetujuan', signatures: [], approvals: [] });
    await fails(409, 'STATE', 'admin', 'pd_document_sign', (s) => ({ id: s.pks.id, signer_name: 'Budi', signature: typed('Budi'), content_hash: seenHash(s) }));

    // the content on screen now: accepted, and the signatures carry exactly that hash
    await ok('admin', 'pd_document_get', (s) => ({ id: s.pks.id }), 'now');
    const nowHash = (s: Saved) => (s.now.document as Json).content_hash;
    expect(await ok('a', 'pd_my_document_decide', approve(nowHash))).toEqual({ success: true, status: 'disetujui', version: 1 });
    expect(await ok('admin', 'pd_document_sign', (s) => ({ id: s.pks.id, signer_name: 'Budi', signature: typed('Budi'), content_hash: nowHash(s) })))
      .toEqual({ success: true, status: 'selesai', version: 1 });
    const signed = await doc('pks');
    expect((signed.signatures as Json[]).map((s) => s.content_hash)).toEqual([now.content_hash, now.content_hash]);
  }, 30_000);

  it('signature times are Jakarta wall-clock time (MySQL session time zone +07:00), as printed "… WIB"', async () => {
    for (const backend of backends) {
      const out = await send(backend, 'admin', 'pd_document_get', { id: saved[backend.name].pks.id });
      const signatures = (out.body.document as { signatures: Json[] }).signatures;
      for (const s of signatures) {
        const drift = Math.abs(Date.parse(`${String(s.signed_at).replace(' ', 'T')}Z`) - Date.parse(`${jakarta(new Date()).replace(' ', 'T')}Z`));
        expect(drift, `${backend.name} signed_at ${s.signed_at}`).toBeLessThan(5 * 60_000);
      }
    }
  }, 20_000);

  it('delete_project refuses a project that holds project documents (Developer and admin alike)', async () => {
    for (const who of ['dev', 'admin'] as const) {
      expect(await fails(409, 'STATE', who, 'delete_project', { id: 201 })).toEqual({
        error: 'Proyek ini sudah punya dokumen proyek (BRD, kontrak, invoice, atau kuitansi), jadi tidak bisa dihapus agar arsipnya tetap utuh.',
        code: 'STATE',
      });
    }
    // the signed contract stays reachable for the client
    expect(((await ok('a', 'pd_my_project', { id: 201 })).project as Json).documents).toHaveLength(1);
    // a project without documents can still be deleted
    expect(await ok('admin', 'delete_project', { id: 203 })).toEqual({ success: true });
  }, 20_000);

  it('customers never see the internal payment note; staff do', async () => {
    await ok('admin', 'pd_invoice_create', {
      project_id: 201, term_key: 'dp', items: [{ description: 'Uang muka', qty: 1, unit_price: 1000000 }],
      issue_date: TODAY, due_date: TODAY, content: content('Invoice DP'),
    }, 'inv');
    await ok('admin', 'pd_document_submit', (s) => ({ id: s.inv.document_id }));
    await ok('admin', 'pd_payment_record', (s) => ({
      invoice_id: s.inv.id, amount: 400000, paid_at: TODAY, method: 'transfer', note: 'Internal: dibayar dari rekening pribadi direktur',
    }));
    expect(((await doc('inv', 'document_id')).payments as Json[]).map((p) => p.note)).toEqual(['Internal: dibayar dari rekening pribadi direktur']);
    const mine = (await ok('a', 'pd_my_document', (s) => ({ id: s.inv.document_id }))).document as Json;
    expect((mine.payments as Json[]).map((p) => [p.amount, p.note])).toEqual([[400000, null]]);
  }, 20_000);

  it('a payment term is billed once, also when two drafts are moved onto it at the same time', async () => {
    const manual = (title: string) => ({
      project_id: 202, kind: 'lainnya', items: [{ description: title, qty: 1, unit_price: 100000 }], issue_date: TODAY, due_date: TODAY, content: content(title),
    });
    const onTerm = { term_key: 'pelunasan', items: [{ description: 'Pelunasan', qty: 1, unit_price: 100000 }], issue_date: TODAY, due_date: TODAY, content: content('Pelunasan') };
    for (const backend of backends) {
      const statuses: number[][] = [];
      for (let round = 0; round < 5; round++) {
        const first = await send(backend, 'admin', 'pd_invoice_create', manual(`A${round}`));
        const second = await send(backend, 'admin', 'pd_invoice_create', manual(`B${round}`));
        const ids = [first.body.id, second.body.id];
        const results = await Promise.all(ids.map((id) => send(backend, 'admin', 'pd_invoice_update', { id, ...onTerm })));
        statuses.push(results.map((r) => r.status).sort());
        expect(results.map((r) => r.body.code ?? null).sort(), backend.name).toEqual(['DUPLICATE', null]);
        // free the term for the next round
        for (const id of ids) await send(backend, 'admin', 'pd_invoice_cancel', { id, reason: 'Uji paralel' });
      }
      expect(statuses, backend.name).toEqual(Array(5).fill([200, 409]));
    }
  }, 60_000);

  it('forged signature images (SVG, HTML behind the PNG magic, trailing script, bombs, oversized) are refused', async () => {
    await ok('admin', 'pd_document_create', { project_id: 202, doc_type: 'mou', title: 'MoU', content: content('MoU') }, 'mou');
    await ok('admin', 'pd_document_submit', (s) => ({ id: s.mou.id }));
    for (const [what, data_url] of Object.entries(FORGED_SIGNATURES)) {
      const body = await fails(400, 'VALIDATION', 'admin', 'pd_document_sign', (s) => ({ id: s.mou.id, signer_name: 'Budi', signature: { method: 'draw', data_url } }));
      expect(Object.keys(body.errors as Json), what).toEqual(['signature']);
      await fails(400, 'VALIDATION', 'b', 'pd_my_document_decide', (s) => ({ id: s.mou.id, decision: 'approved', signer_name: 'Budi', signature: { method: 'draw', data_url } }));
    }
    expect(await doc('mou')).toMatchObject({ status: 'menunggu_persetujuan', signatures: [], approvals: [] });
  }, 30_000);

  it('IDOR, Developer limits, state abuse, mass assignment and odd input stay refused', async () => {
    // customer A against customer B's project, documents, files and decisions
    await fails(404, 'NOT_FOUND', 'a', 'pd_my_project', { id: 202 });
    await fails(404, 'NOT_FOUND', 'a', 'pd_my_document', (s) => ({ id: s.mou.id }));
    await fails(404, 'NOT_FOUND', 'a', 'pd_my_document_decide', (s) => ({ id: s.mou.id, decision: 'rejected', note: 'Bukan milik saya' }));
    await ok('admin', 'pd_document_get', (s) => ({ id: s.pks.id }), 'pksSigned');
    const firstSignature = (s: Saved) => ((s.pksSigned.document as Json).signatures as Json[])[0].id;
    // (the file itself: its owner gets it; PNG bytes differ between the two encoders, so only the status is compared)
    for (const backend of backends) expect((await send(backend, 'a', 'pd_file', { ref: `sig:${firstSignature(saved[backend.name])}` })).status).toBe(200);
    await fails(404, 'NOT_FOUND', 'b', 'pd_file', (s) => ({ ref: `sig:${firstSignature(s)}` }));
    for (const ref of ['sig:1/../../.env', 'proof:01', 'sig:0', 'SIG:1', 'sig:1 x']) await fails(400, 'VALIDATION', 'a', 'pd_file', { ref });
    // staff and customer actions stay apart; financial and company actions stay admin-only
    await fails(403, 'FORBIDDEN', 'a', 'pd_document_get', (s) => ({ id: s.pks.id }));
    await fails(403, 'FORBIDDEN', 'dev', 'pd_document_submit', (s) => ({ id: s.inv.document_id }));
    await fails(403, 'FORBIDDEN', 'dev', 'pd_document_sign', (s) => ({ id: s.mou.id, signer_name: 'Dev', signature: typed('Dev') }));
    await fails(403, 'FORBIDDEN', 'dev', 'pd_payment_record', (s) => ({ invoice_id: s.inv.id, amount: 1, paid_at: TODAY, method: 'tunai' }));
    // money: negative, zero, rounding to zero, exponent strings, injection text, more than due, more than 1e12
    for (const amount of [-1, 0, 0.4, '1e3', '1; DROP TABLE users', 600001, 1e13]) {
      await fails(400, 'VALIDATION', 'admin', 'pd_payment_record', (s) => ({ invoice_id: s.inv.id, amount, paid_at: TODAY, method: 'transfer' }));
    }
    await fails(400, 'VALIDATION', 'admin', 'pd_payment_record', (s) => ({ invoice_id: s.inv.id, amount: 1, paid_at: '2026-02-30', method: 'transfer' }));
    // a cancelled invoice takes no payment and cannot be issued again
    await ok('admin', 'pd_invoice_create', {
      project_id: 201, kind: 'lainnya', items: [{ description: 'Tambahan', qty: 1, unit_price: 50000 }], issue_date: TODAY, due_date: TODAY, content: content('Tambahan'),
    }, 'extra');
    await ok('admin', 'pd_document_submit', (s) => ({ id: s.extra.document_id }));
    await ok('admin', 'pd_invoice_cancel', (s) => ({ id: s.extra.id, reason: 'Salah tagih' }));
    await fails(409, 'STATE', 'admin', 'pd_payment_record', (s) => ({ invoice_id: s.extra.id, amount: 50000, paid_at: TODAY, method: 'transfer' }));
    await fails(409, 'STATE', 'admin', 'pd_document_change', (s) => ({ id: s.extra.document_id, reason: 'Ubah tagihan yang batal' }));
    // approving twice, signing twice
    await fails(409, 'STATE', 'a', 'pd_my_document_decide', (s) => ({ id: s.pks.id, decision: 'approved', signer_name: 'Sari', signature: typed('Sari') }));
    await fails(409, 'STATE', 'admin', 'pd_document_sign', (s) => ({ id: s.pks.id, signer_name: 'Budi', signature: typed('Budi') }));
    // mass assignment: status, number, version and author are the server's
    await ok('admin', 'pd_document_create', {
      project_id: 202, doc_type: 'brd', title: 'BRD', content: content('BRD'), status: 'selesai', number: '001/X', version: 9, created_by: 1, project_code: 'X',
    }, 'brd');
    expect(await doc('brd')).toMatchObject({ status: 'draft', version: 1, created_by: 101, project_id: 202 });
    // SQL text in search and ids
    expect((await ok('dev', 'pd_projects_list', { q: "%' OR 1=1 -- " })).projects).toEqual([]);
    await fails(400, 'VALIDATION', 'dev', 'pd_project_get', { id: '201 OR 1=1' });
  }, 60_000);
});

// The Node handler shares server.js's connection pool: the pd_* session time zone must not leak into other handlers
describe('handleProjectDocsAction: MySQL session time zone', () => {
  const run = async (resetFails: boolean) => {
    const queries: string[] = [];
    const conn = {
      query: vi.fn(async (q: string | { sql: string }) => {
        const sql = typeof q === 'string' ? q : q.sql;
        queries.push(sql);
        if (resetFails && sql === 'SET time_zone = DEFAULT') throw new Error('connection lost');
        return [[], []];
      }),
      release: vi.fn(),
      destroy: vi.fn(),
    };
    const res = { headersSent: false, json: vi.fn(), status: vi.fn() };
    res.status.mockReturnValue(res);
    const handled = await handleProjectDocsAction('pd_settings_get', {}, { user: { id: 1, role: 'user' }, headers: {} }, res, { getConnection: async () => conn });
    return { handled, queries, conn, res };
  };

  it('sets +07:00 first and resets it before the connection goes back to the pool', async () => {
    const { handled, queries, conn, res } = await run(false);
    expect(handled).toBe(true);
    expect(conn.query.mock.calls[0][0]).toEqual({ sql: 'SET time_zone = ?', values: ['+07:00'] });
    expect(queries.at(-1)).toBe('SET time_zone = DEFAULT');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(conn.release).toHaveBeenCalledTimes(1);
    expect(conn.destroy).not.toHaveBeenCalled();
  });

  it('closes a connection whose time zone cannot be reset instead of pooling it', async () => {
    const { conn } = await run(true);
    expect(conn.release).not.toHaveBeenCalled();
    expect(conn.destroy).toHaveBeenCalledTimes(1);
  });
});
