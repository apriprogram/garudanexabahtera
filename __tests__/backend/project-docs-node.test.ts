// @vitest-environment node
// Node pd_* module (backend/modules/project_docs.js + backend/modules/project_docs/*.js), the pure parts with a
// stubbed database: invoice math, numbering, derived stage / progress / missing documents, access rules (role checks
// and the Developer limits in the handlers), validation, formatting, canonical JSON + content hash and typed
// signatures. The engine (src/features/project-docs/engine) must compute the same numbers and words; where `php` is
// installed, the real PHP functions (backend/modules/project_docs/*.php) get the same inputs and must agree.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import zlib from 'node:zlib';

import { PROJECT_DOCS_ACTIONS, handleProjectDocsAction } from '../../backend/modules/project_docs.js';
import * as core from '../../backend/modules/project_docs/core.js';
import { pdCalcInvoice } from '../../backend/modules/project_docs/finance.js';
import { pdPngValid, pdProofInput, pdRenderTypedSignature, pdSignatureInput } from '../../backend/modules/project_docs/files.js';
import { phpIsEmail } from '../../backend/modules/project_docs/php.js';
import { pdMissingDocs, pdProgress, pdStage } from '../../backend/modules/project_docs/records.js';
import { DOC_TYPES, STAGES } from '../../src/features/project-docs/engine/docTypes';
import { formatRupiahDoc, hari, romawi, tanggalPanjang, terbilang } from '../../src/features/project-docs/engine/format';
import { calcInvoice } from '../../src/features/project-docs/engine/invoice';
import { CLIENT_VISIBLE_ACTIVITY, DEVELOPER_DOC_TYPES, PD_ACTIONS } from '../../src/features/project-docs/types';

const ROOT = resolve(__dirname, '..', '..');
const MODULE_DIR = join(ROOT, 'backend', 'modules', 'project_docs');
const TAX = { ppn_enabled: false, ppn_rate: 12, dpp_numerator: 11, dpp_denominator: 12, pph23_rate: 2 };

// Small deterministic random source, so a failure can be reproduced
function random(seed: number) {
  let s = seed;
  return (n: number) => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s % n;
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Stubbed database and response
// ════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>;
type Query = { sql: string; params: unknown[] };
type Responder = (sql: string, params: unknown[]) => Row[] | { affectedRows?: number; insertId?: number };

const squash = (sql: string) => sql.replace(/\s+/g, ' ').trim();

function stubPool(respond: Responder = () => []) {
  const queries: Query[] = [];
  const conn = {
    query: vi.fn(async (q: { sql: string; values: unknown[] }) => {
      const sql = squash(q.sql);
      queries.push({ sql, params: q.values });
      return [respond(sql, q.values)];
    }),
    beginTransaction: vi.fn(async () => {}),
    commit: vi.fn(async () => {}),
    rollback: vi.fn(async () => {}),
    release: vi.fn(),
  };
  return { pool: { getConnection: vi.fn(async () => conn) }, conn, queries };
}

interface StubResponse {
  statusCode: number;
  body: unknown;
  headersSent: boolean;
  locals: Record<string, unknown>;
  status(code: number): StubResponse;
  json(body: unknown): StubResponse;
}

function stubResponse(): StubResponse {
  return {
    statusCode: 200,
    body: undefined,
    headersSent: false,
    locals: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      this.headersSent = true;
      return this;
    },
  };
}

const USERS = {
  admin: { id: 1, name: 'Admin', role: 'admin' },
  dev: { id: 2, name: 'Developer', role: 'user' },
  customer: { id: 3, name: 'Klien', role: 'customer' },
};

async function callAction(action: string, input: Row, user: Row | null, respond?: Responder) {
  const stub = stubPool(respond);
  const res = stubResponse();
  const req = { user, headers: { 'user-agent': 'vitest' }, ip: '127.0.0.1' };
  const handled = await handleProjectDocsAction(action, input, req, res, stub.pool);
  return { handled, res, ...stub };
}

/** A ctx for the core helpers (one stubbed connection, empty settings cache). */
function stubCtx(respond: Responder) {
  const stub = stubPool(respond);
  return { ctx: { db: stub.conn, req: {}, res: {}, settings: null }, ...stub };
}

// ════════════════════════════════════════════════════════════════════════════
// The real PHP functions (skipped without php)
// ════════════════════════════════════════════════════════════════════════════

const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo function_exists("gzcompress") && function_exists("mb_strlen") ? "ok" : "no";'], {
  encoding: 'utf8',
}).stdout === 'ok';

let phpDir = '';
const PHP_HARNESS = `<?php
// Calls pure functions of backend/modules/project_docs/*.php: [[name, args], ...] on stdin → results as JSON
$dir = getenv('PD_PHP_DIR');
foreach (['core', 'records', 'files', 'finance'] as $file) require "$dir/$file.php";
$out = [];
foreach (json_decode(stream_get_contents(STDIN), true) as [$fn, $a]) {
    if ($fn === 'calc') $out[] = pd_calc_invoice($a[0], (float)$a[1], $a[2], $a[3], $a[4]);
    elseif ($fn === 'stage') {
        $b = ['p' => $a[0]['p'], 'docs' => [], 'milestones' => $a[0]['milestones'], 'invoices' => $a[0]['invoices']];
        foreach ($a[0]['docs'] as $d) $b['docs'][(int)$d['id']] = $d;
        $stage = pd_stage($b, $a[1]);
        $out[] = [$stage, pd_progress($b['milestones']), pd_missing_docs($b, $stage)];
    }
    elseif ($fn === 'hash') $out[] = pd_content_hash($a[0], $a[1]);
    elseif ($fn === 'email') $out[] = filter_var($a[0], FILTER_VALIDATE_EMAIL) !== false;
    elseif ($fn === 'typed') { $png = pd_render_typed_signature($a[0]); $out[] = $png === null ? null : base64_encode($png); }
    elseif ($fn === 'words') $out[] = [pd_terbilang($a[0]), pd_rupiah($a[0]), pd_tanggal_panjang($a[1]), pd_hari($a[1])];
}
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

function runPhp(calls: [string, unknown[]][]): unknown[] {
  const result = spawnSync('php', [join(phpDir, 'harness.php')], {
    input: JSON.stringify(calls),
    encoding: 'utf8',
    env: { ...process.env, PD_PHP_DIR: MODULE_DIR },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0 || !result.stdout) throw new Error(`php failed: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout);
}

beforeAll(() => {
  if (!PHP_AVAILABLE) return;
  phpDir = mkdtempSync(join(tmpdir(), 'gn-project-docs-'));
  writeFileSync(join(phpDir, 'harness.php'), PHP_HARNESS);
});

afterAll(() => {
  if (phpDir) rmSync(phpDir, { recursive: true, force: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ════════════════════════════════════════════════════════════════════════════
// Contract tables
// ════════════════════════════════════════════════════════════════════════════

describe('contract tables', () => {
  it('handles exactly the actions of PD_ACTIONS (types.ts)', () => {
    expect([...PROJECT_DOCS_ACTIONS].sort()).toEqual(Object.keys(PD_ACTIONS).sort());
  });

  it('uses the engine document set, stage order and access lists', () => {
    for (const [type, info] of Object.entries(DOC_TYPES)) {
      const mine = core.PD_DOC_TYPES[type as keyof typeof core.PD_DOC_TYPES];
      expect({ code: mine.code, short: mine.short, required: mine.required, approval: mine.approval, parties: [...mine.parties], stage: mine.stage })
        .toEqual({ code: info.code, short: info.short, required: info.required, approval: info.approval, parties: info.parties, stage: info.stage });
    }
    expect(core.PD_DOC_TYPE_KEYS).toEqual(Object.keys(DOC_TYPES));
    expect(core.PD_STAGES).toEqual(STAGES.map((s) => s.key));
    expect(core.PD_DEVELOPER_DOC_TYPES).toEqual(DEVELOPER_DOC_TYPES);
    expect(core.PD_CLIENT_VISIBLE_ACTIVITY).toEqual(CLIENT_VISIBLE_ACTIVITY);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Invoice math (spec §4.2)
// ════════════════════════════════════════════════════════════════════════════

type Item = { description: string; qty: number; unit_price: number };

function randomInvoices(count: number) {
  const r = random(42);
  return Array.from({ length: count }, () => {
    const items: Item[] = Array.from({ length: 1 + r(4) }, (_, i) => ({
      description: `Baris ${i + 1}`,
      qty: [1, 2, 3, 0.5, 0.25, 1.5, 0.1, 7][r(8)],
      unit_price: [13750000, 1000001, 0.285, 2500000.5, 99999, 1005, 333333.33, 1][r(8)],
    }));
    const tax = { ...TAX, ppn_rate: [12, 11, 10][r(3)], dpp_numerator: [11, 12, 1][r(3)], dpp_denominator: [12, 12, 1][r(3)], pph23_rate: [2, 4, 0][r(3)] };
    return { items, discount: [0, 250000.5, 1e9, 0.5, 1.5][r(5)], ppn: r(2) === 1, pph23: r(2) === 1, tax };
  });
}

describe('invoice math', () => {
  it('computes PPN on DPP nilai lain and PPh 23 with whole rupiah at every step', () => {
    const totals = pdCalcInvoice([{ description: 'DP', qty: 1, unit_price: 13750000 }], 0, true, true, TAX);
    expect(totals).toEqual({
      subtotal: 13750000, discount: 0, base: 13750000, dpp: 12604167, ppn_rate: 12, ppn_amount: 1512500,
      total: 15262500, pph23_rate: 2, pph23_amount: 275000, amount_due: 14987500,
    });
  });

  it('without PPN the DPP is the base; discount and base never go below 0', () => {
    const items = [{ description: 'Hosting', qty: 0.5, unit_price: 1000001 }, { description: 'Bulat', qty: 3, unit_price: 0.285 }];
    // round(500000.5) = 500001 (half away from zero), round(0.855) = 1
    expect(pdCalcInvoice(items, 0.5, false, false, TAX)).toMatchObject({ subtotal: 500002, discount: 1, base: 500001, dpp: 500001, ppn_rate: 0, ppn_amount: 0, total: 500001, amount_due: 500001 });
    expect(pdCalcInvoice(items, 1e12, false, true, TAX)).toMatchObject({ base: 0, total: 0, pph23_amount: 0, amount_due: 0 });
    expect(pdCalcInvoice(items, -5, false, false, TAX).discount).toBe(0);
  });

  it('matches the engine calcInvoice', () => {
    for (const c of randomInvoices(300)) {
      const node = pdCalcInvoice(c.items, c.discount, c.ppn, c.pph23, c.tax);
      const engine = calcInvoice(c.items, { ...c.tax, discount: c.discount, ppn_enabled: c.ppn, pph23_enabled: c.pph23 });
      expect(node).toEqual(engine);
    }
  });

  it.skipIf(!PHP_AVAILABLE)('matches pd_calc_invoice() of the PHP backend', () => {
    const cases = randomInvoices(300);
    const php = runPhp(cases.map((c) => ['calc', [c.items, c.discount, c.ppn, c.pph23, c.tax]]));
    cases.forEach((c, i) => expect(pdCalcInvoice(c.items, c.discount, c.ppn, c.pph23, c.tax)).toEqual(php[i]));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Numbering (spec §1.3)
// ════════════════════════════════════════════════════════════════════════════

describe('numbering', () => {
  it('formats document numbers and project codes', () => {
    expect(core.pdFormatDocNumber(7, 'PKS', 'GNB', 10, 2026)).toBe('007/PKS/GNB/X/2026');
    expect(core.pdFormatDocNumber(1234, 'INV', 'GN-B', 4, 2027)).toBe('1234/INV/GN-B/IV/2027');
    expect(core.pdFormatProjectCode(3, 2026)).toBe('PRJ-2026-003');
    expect(Array.from({ length: 12 }, (_, i) => core.pdRomawi(i + 1))).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']);
    expect(Array.from({ length: 12 }, (_, i) => core.pdRomawi(i + 1))).toEqual(Array.from({ length: 12 }, (_, i) => romawi(i + 1)));
  });

  it('takes the sequence atomically from pd_counters on the same connection, dated in Asia/Jakarta', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-31T17:30:00Z')); // 1 January 2027, 00:30 WIB
    const { ctx, queries } = stubCtx((sql) => {
      if (sql.startsWith('SELECT setting_key')) return [{ setting_key: 'pd_numbering', setting_value: '{"prefix":"ABC"}' }];
      if (sql.startsWith('SELECT LAST_INSERT_ID()')) return [{ seq: 7 }];
      return { affectedRows: 1 };
    });
    expect(await core.pdNewDocNumber(ctx, 'pks')).toBe('007/PKS/ABC/I/2027');
    const counter = queries.find((q) => q.sql.startsWith('INSERT INTO pd_counters'));
    expect(counter?.sql).toContain('ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1)');
    expect(counter?.params).toEqual(['PKS', 2027]);
    expect(await core.pdNewProjectCode(ctx)).toBe('PRJ-2027-007');
  });

  it('falls back to the default prefix when the stored setting is invalid', async () => {
    const { ctx } = stubCtx((sql) => {
      if (sql.startsWith('SELECT setting_key')) return [{ setting_key: 'pd_numbering', setting_value: '{"prefix":"G N B"}' }];
      if (sql.startsWith('SELECT LAST_INSERT_ID()')) return [{ seq: 12 }];
      return { affectedRows: 1 };
    });
    expect(await core.pdNewDocNumber(ctx, 'invoice')).toMatch(/^012\/INV\/GNB\/[IVX]+\/\d{4}$/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Derived stage, progress, missing documents (spec §2)
// ════════════════════════════════════════════════════════════════════════════

type Doc = { id: number; doc_type: string; status: string };
type BundleInput = { p: Row; docs: Doc[]; milestones: Row[]; invoices: Row[] };

const project = (over: Row = {}): Row => ({ use_mou: 0, has_maintenance: 0, maintenance_end: null, stage_override: null, ...over });
const bundle = (b: BundleInput) => ({ p: b.p, docs: new Map(b.docs.map((d) => [d.id, d])), signed: new Map(), milestones: b.milestones, invoices: b.invoices });
const docs = (spec: Record<string, string>): Doc[] => Object.entries(spec).map(([doc_type, status], i) => ({ id: i + 1, doc_type, status }));
const TODAY = '2026-10-22';

describe('derived stage', () => {
  const done = { brd: 'selesai', proposal: 'disetujui', pks: 'selesai', uat: 'selesai', bast: 'selesai' };
  const stageOf = (b: BundleInput) => pdStage(bundle(b), TODAY);

  it('walks the rules 1–9 in order', () => {
    const ms = (...statuses: string[]) => statuses.map((status) => ({ status, weight: 1, progress: 0 }));
    expect(stageOf({ p: project(), docs: [], milestones: [], invoices: [] })).toBe('perencanaan');
    expect(stageOf({ p: project(), docs: docs({ brd: 'menunggu_persetujuan' }), milestones: [], invoices: [] })).toBe('perencanaan');
    expect(stageOf({ p: project(), docs: docs({ brd: 'disetujui' }), milestones: [], invoices: [] })).toBe('penawaran');
    expect(stageOf({ p: project({ use_mou: 1 }), docs: docs({ brd: 'disetujui', proposal: 'disetujui', mou: 'menunggu_persetujuan' }), milestones: [], invoices: [] })).toBe('penawaran');
    expect(stageOf({ p: project(), docs: docs({ brd: 'disetujui', proposal: 'disetujui', pks: 'disetujui' }), milestones: [], invoices: [] })).toBe('kontrak');
    expect(stageOf({ p: project(), docs: docs({ brd: 'selesai', proposal: 'selesai', pks: 'selesai' }), milestones: ms('berjalan'), invoices: [] })).toBe('pengerjaan');
    // UAT already submitted: testing while a milestone is still open
    expect(stageOf({ p: project(), docs: docs({ brd: 'selesai', proposal: 'selesai', pks: 'selesai', uat: 'menunggu_persetujuan' }), milestones: ms('berjalan'), invoices: [] })).toBe('uji');
    expect(stageOf({ p: project(), docs: docs({ brd: 'selesai', proposal: 'selesai', pks: 'selesai' }), milestones: ms('selesai'), invoices: [] })).toBe('uji');
    expect(stageOf({ p: project(), docs: docs({ ...done, bast: 'disetujui' }), milestones: [], invoices: [] })).toBe('serah_terima');
    const invoices = [{ id: 1, payment_status: 'lunas', doc_status: 'selesai' }, { id: 2, payment_status: 'sebagian', doc_status: 'disetujui' }];
    expect(stageOf({ p: project(), docs: docs(done), milestones: [], invoices })).toBe('pelunasan');
    expect(stageOf({ p: project(), docs: docs(done), milestones: [], invoices: [{ id: 1, payment_status: 'dibatalkan', doc_status: 'disetujui' }] })).toBe('selesai');
    const maintenance = { has_maintenance: 1, maintenance_end: '2027-10-01' };
    expect(stageOf({ p: project(maintenance), docs: docs({ ...done, sla: 'selesai' }), milestones: [], invoices: [] })).toBe('maintenance');
    expect(stageOf({ p: project({ ...maintenance, maintenance_end: TODAY }), docs: docs({ ...done, sla: 'selesai' }), milestones: [], invoices: [] })).toBe('selesai');
    // maintenance contract without a signed SLA yet: still the maintenance stage (the SLA is the missing document)
    expect(stageOf({ p: project(maintenance), docs: docs({ ...done, sla: 'disetujui' }), milestones: [], invoices: [] })).toBe('maintenance');
    expect(stageOf({ p: project({ has_maintenance: 1 }), docs: docs(done), milestones: [], invoices: [] })).toBe('maintenance');
    // every payment term of a priced contract needs a paid invoice
    const terms = JSON.stringify([{ key: 'dp', label: 'DP', percent: 60, trigger: 'kontrak', due_days: 7 }, { key: 'akhir', label: 'Akhir', percent: 40, trigger: 'manual', due_days: 7 }]);
    const paid = (term_key: string) => ({ id: term_key.length, term_key, payment_status: 'lunas', doc_status: 'selesai' });
    expect(stageOf({ p: project({ price: '1000000.00', payment_terms: terms }), docs: docs(done), milestones: [], invoices: [paid('dp')] })).toBe('pelunasan');
    expect(stageOf({ p: project({ price: '1000000.00', payment_terms: terms }), docs: docs(done), milestones: [], invoices: [paid('dp'), paid('akhir')] })).toBe('selesai');
    expect(stageOf({ p: project({ price: null, payment_terms: terms }), docs: docs(done), milestones: [], invoices: [] })).toBe('selesai');
  });

  it('lets a valid admin override win and ignores an unknown one', () => {
    expect(stageOf({ p: project({ stage_override: 'uji' }), docs: [], milestones: [], invoices: [] })).toBe('uji');
    expect(stageOf({ p: project({ stage_override: 'bogus' }), docs: [], milestones: [], invoices: [] })).toBe('perencanaan');
  });

  it('weights the progress and rounds it', () => {
    expect(pdProgress([])).toBe(0);
    expect(pdProgress([{ weight: 2, progress: 100 }, { weight: 3, progress: 45 }])).toBe(67); // 335 / 5
    expect(pdProgress([{ weight: 1, progress: 50 }, { weight: 1, progress: 51 }])).toBe(51); // 50.5 rounds up
    expect(pdProgress([{ weight: 0, progress: 100 }, { weight: -4, progress: 100 }])).toBe(0);
  });

  it('lists required documents of reached stages that are missing or still draft', () => {
    const b = (p: Row, spec: Record<string, string>, invoices: Row[] = []) => bundle({ p, docs: docs(spec), milestones: [], invoices });
    expect(pdMissingDocs(b(project(), {}), 'perencanaan')).toEqual(['brd']);
    expect(pdMissingDocs(b(project(), { brd: 'draft' }), 'penawaran')).toEqual(['brd', 'proposal']);
    expect(pdMissingDocs(b(project({ use_mou: 1 }), { brd: 'disetujui' }), 'penawaran')).toEqual(['mou', 'proposal']);
    // a draft invoice does not count, an issued one does; receipt never required; sla only with maintenance
    const draftInvoice = [{ id: 1, doc_status: 'draft', payment_status: 'belum_dibayar' }];
    expect(pdMissingDocs(b(project(), done, draftInvoice), 'selesai')).toEqual(['timeline', 'invoice']);
    expect(pdMissingDocs(b(project({ has_maintenance: 1 }), { ...done, timeline: 'selesai' }, [{ id: 1, doc_status: 'disetujui', payment_status: 'sebagian' }]), 'selesai')).toEqual(['sla']);
  });

  it.skipIf(!PHP_AVAILABLE)('matches pd_stage / pd_progress / pd_missing_docs of the PHP backend', () => {
    const r = random(7);
    const statuses = ['draft', 'menunggu_persetujuan', 'disetujui', 'selesai'];
    const cases: BundleInput[] = Array.from({ length: 400 }, () => {
      const spec: Doc[] = [];
      for (const type of core.PD_DOC_TYPE_KEYS) {
        if (r(5) > 0) spec.push({ id: spec.length + 1, doc_type: type, status: statuses[r(4)] });
      }
      return {
        p: project({
          use_mou: r(2), has_maintenance: r(2), maintenance_end: [null, '2026-10-21', TODAY, '2027-01-01'][r(4)],
          stage_override: r(6) === 0 ? [...core.PD_STAGES, 'bogus'][r(10)] : null,
        }),
        docs: spec,
        milestones: Array.from({ length: r(4) }, () => ({ status: ['belum_mulai', 'berjalan', 'selesai', 'tertunda'][r(4)], weight: r(5), progress: r(101) })),
        invoices: Array.from({ length: r(3) }, (_, i) => ({
          id: i + 1, doc_status: statuses[r(4)], payment_status: ['belum_dibayar', 'sebagian', 'lunas', 'dibatalkan'][r(4)],
        })),
      };
    });
    const php = runPhp(cases.map((c) => ['stage', [c, TODAY]]));
    cases.forEach((c, i) => {
      const stage = pdStage(bundle(c), TODAY);
      expect([stage, pdProgress(c.milestones), pdMissingDocs(bundle(c), stage)]).toEqual(php[i]);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Access rules (handlers re-check what the auth gate already enforced)
// ════════════════════════════════════════════════════════════════════════════

const VALID_CONTENT = { title: 'Uji', sections: [{ id: 'a', title: 'Bagian A', body: 'Isi' }] };

describe('access rules', () => {
  const REFUSED: Record<string, [Row | null, number, string]> = {
    admin: [USERS.dev, 403, 'Akses ditolak: hanya admin.'],
    staff: [USERS.customer, 403, 'Akses ditolak.'],
    customer: [USERS.dev, 403, 'Akses ditolak: aksi ini khusus akun klien.'],
    any: [null, 401, 'Sesi tidak valid atau sudah berakhir. Silakan login kembali.'],
  };

  it.each(Object.entries(PD_ACTIONS))('%s refuses the wrong role before touching the database', async (action, access) => {
    const [user, status, error] = REFUSED[access];
    const { handled, res, queries, conn } = await callAction(action, { id: 5, project_id: 5 }, user);
    expect(handled).toBe(true);
    expect(res.statusCode).toBe(status);
    expect(res.body).toEqual({ error, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' });
    expect(queries).toEqual([]);
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it('ignores other actions and trims the action name like the auth gate', async () => {
    const other = await callAction('get_settings', {}, USERS.admin);
    expect(other.handled).toBe(false);
    expect(other.pool.getConnection).not.toHaveBeenCalled();
    const trimmed = await callAction(' pd_settings_get ', {}, USERS.customer);
    expect(trimmed.handled).toBe(true);
    expect(trimmed.res.statusCode).toBe(403);
  });

  it('limits a Developer to BRD, Jadwal and UAT', () => {
    for (const type of core.PD_DOC_TYPE_KEYS) {
      const check = () => core.pdCheckDocTypeAccess(USERS.dev, type);
      if ((DEVELOPER_DOC_TYPES as readonly string[]).includes(type)) expect(check).not.toThrow();
      else expect(check).toThrow('Akses ditolak: Developer hanya dapat mengelola BRD, Jadwal, dan UAT.');
      expect(() => core.pdCheckDocTypeAccess(USERS.admin, type)).not.toThrow();
    }
  });

  it('refuses a Developer creating a proposal before any query', async () => {
    const { res, queries } = await callAction('pd_document_create', { project_id: 4, doc_type: 'proposal', title: 'Proposal', content: VALID_CONTENT }, USERS.dev);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Akses ditolak: Developer hanya dapat mengelola BRD, Jadwal, dan UAT.', code: 'FORBIDDEN' });
    expect(queries).toEqual([]);
  });

  it('refuses a Developer saving a PKS and rolls the transaction back', async () => {
    const pks = { id: 9, project_id: 4, doc_type: 'pks', number: '001/PKS/GNB/X/2026', status: 'draft', version: 1 };
    const { res, queries, conn } = await callAction('pd_document_save', { id: 9, content: VALID_CONTENT }, USERS.dev,
      (sql) => (sql.startsWith('SELECT * FROM pd_documents') ? [pks] : { affectedRows: 1 }));
    expect(res.statusCode).toBe(403);
    expect(queries.map((q) => q.sql)).toEqual(['SELECT * FROM pd_documents WHERE id = ? FOR UPDATE']);
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.commit).not.toHaveBeenCalled();
  });

  it('lets a Developer save a BRD draft as a new version with a revision and an activity row', async () => {
    const brd = { id: 9, project_id: 4, doc_type: 'brd', number: '001/BRD/GNB/X/2026', status: 'draft', version: 3 };
    let insertId = 40;
    const { res, queries, conn } = await callAction('pd_document_save', { id: '9', content: VALID_CONTENT, change_note: ' Revisi ' }, USERS.dev,
      (sql) => (sql.startsWith('SELECT * FROM pd_documents') ? [brd] : { affectedRows: 1, insertId: ++insertId }));
    expect(res.body).toEqual({ success: true, version: 4 });
    expect(conn.commit).toHaveBeenCalledOnce();
    const json = '{"title":"Uji","sections":[{"id":"a","title":"Bagian A","body":"Isi"}]}';
    expect(queries[1].params).toEqual([json, null, null, 4, 2, 9]);
    expect(queries[2]).toEqual({ sql: expect.stringContaining('INSERT INTO pd_document_revisions'), params: [9, 4, json, 'Revisi', 2] });
    expect(queries[3].params).toEqual([4, 9, 2, 'doc_saved', 'BRD 001/BRD/GNB/X/2026 disimpan (versi 4)']);
  });

  it('answers 409 LOCKED for a document that left draft', async () => {
    const brd = { id: 9, project_id: 4, doc_type: 'brd', number: '001/BRD/GNB/X/2026', status: 'disetujui', version: 3 };
    const { res } = await callAction('pd_document_save', { id: 9, content: VALID_CONTENT }, USERS.admin,
      (sql) => (sql.startsWith('SELECT * FROM pd_documents') ? [brd] : { affectedRows: 1 }));
    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: 'Dokumen terkunci: hanya draft yang bisa diubah. Gunakan "Ajukan perubahan".', code: 'LOCKED' });
  });

  it('shows a customer only sent documents of own projects', async () => {
    const sent = { id: 5, project_id: 8, doc_type: 'brd', status: 'menunggu_persetujuan', version: 1 };
    const foreign = await callAction('pd_my_document', { id: 5 }, USERS.customer, (sql) => (sql.startsWith('SELECT * FROM pd_documents') ? [sent] : []));
    expect(foreign.res.statusCode).toBe(404);
    expect(foreign.res.body).toEqual({ error: 'Dokumen tidak ditemukan.', code: 'NOT_FOUND' });
    expect(foreign.queries[1].params).toEqual([8, 3]);
    const draft = await callAction('pd_my_document', { id: 5 }, USERS.customer,
      (sql) => (sql.startsWith('SELECT * FROM pd_documents') ? [{ ...sent, status: 'draft' }] : [{ id: 8 }]));
    expect(draft.res.statusCode).toBe(404);
    expect(draft.queries).toHaveLength(1);
  });

  it('maps a duplicate key to 409 and hides unexpected errors', async () => {
    const dup = await callAction('pd_client_save', { type: 'perorangan', name: 'Budi' }, USERS.admin, () => {
      throw Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY', errno: 1062 });
    });
    expect(dup.res.statusCode).toBe(409);
    expect(dup.res.body).toEqual({ error: 'Data yang sama sudah ada (duplikat).' });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const crash = await callAction('pd_dashboard', {}, USERS.admin, () => {
      throw new Error('Table pd_documents does not exist');
    });
    expect(crash.res.statusCode).toBe(500);
    expect(crash.res.body).toEqual({ error: 'Terjadi kesalahan pada server. Silakan coba lagi.' });
    expect(log).toHaveBeenCalledOnce();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Validation
// ════════════════════════════════════════════════════════════════════════════

describe('validation', () => {
  it('normalizes document content like PHP', () => {
    const errors: Record<string, string> = {};
    const content = core.pdValidContent({
      extra: 1, title: 'Judul',
      sections: [{ id: 'a.1', title: 'A', body: 'x', table: { columns: ['No', 2], rows: [[1.5, null, 0.30000000000000004]] }, hidden: false, junk: true }],
      // a "__proto__" key from JSON stays an ordinary field
      fields: JSON.parse('{"versi":2,"setuju":true,"__proto__":"tetap isian"}'),
    }, 'content', errors);
    expect(errors).toEqual({});
    expect(content).toEqual({
      title: 'Judul',
      sections: [{ id: 'a.1', title: 'A', body: 'x', table: { columns: ['No', '2'], rows: [['1.5', '', '0.3']] }, hidden: false }],
      fields: JSON.parse('{"versi":2,"setuju":true,"__proto__":"tetap isian"}'),
    });
    // an empty JSON object is an empty list for PHP
    expect(core.pdValidContent({ sections: {} }, 'content', {})).toEqual({ sections: [] });
  });

  it('rejects broken content with the PHP messages', () => {
    const message = (raw: unknown) => {
      const errors: Record<string, string> = {};
      core.pdValidContent(raw, 'content', errors);
      return errors.content;
    };
    expect(message(null)).toBe('Isi dokumen tidak valid: daftar bagian (sections) wajib ada.');
    expect(message({ sections: [{ id: 'a', title: 'A' }, { id: 'a', title: 'B' }] })).toBe('Bagian ke-2: id "a" dipakai lebih dari sekali.');
    expect(message({ sections: [{ id: 'a b', title: 'A' }] })).toBe('Bagian ke-1: id wajib diisi (huruf, angka, _ . -, maks. 64).');
    expect(message({ sections: [{ id: 'a', title: 'A', hidden: 1 }] })).toBe('Bagian ke-1: hidden harus true atau false.');
    expect(message({ sections: [], fields: ['x'] })).toBe('Isian tambahan (fields) harus objek (maks. 200 isian).');
    expect(message({ sections: [{ id: 'a', title: 'A', body: 'x'.repeat(100000) }, { id: 'b', title: 'B', body: 'y'.repeat(100000) }, { id: 'c', title: 'C', body: 'z'.repeat(70000) }] }))
      .toBe('Isi dokumen terlalu besar (maks. 256 KB).');
  });

  it('checks payment terms (1–12, unique keys, 100 %)', () => {
    const errors: Record<string, string> = {};
    expect(core.pdValidTerms([{ key: ' dp ', label: 'DP', percent: '50.5', trigger: 'kontrak', due_days: 7 }, { key: 'rest', label: 'Sisa', percent: 49.5, trigger: 'manual', due_days: '0' }], 'payment_terms', errors))
      .toEqual([{ key: 'dp', label: 'DP', percent: 50.5, trigger: 'kontrak', due_days: 7 }, { key: 'rest', label: 'Sisa', percent: 49.5, trigger: 'manual', due_days: 0 }]);
    expect(errors).toEqual({});
    core.pdValidTerms([{ key: 'a', label: 'A', percent: 50, trigger: 'kontrak', due_days: 7 }, { key: 'A', label: '', percent: 50, trigger: 'x', due_days: 1.5 }], 'payment_terms', errors);
    expect(errors).toEqual({
      'payment_terms.1.key': 'Kode termin tidak boleh sama.',
      'payment_terms.1.label': 'Nama termin wajib diisi.',
      'payment_terms.1.trigger': 'Pemicu termin tidak valid.',
      'payment_terms.1.due_days': 'Jatuh tempo termin harus 0 sampai 365 hari.',
    });
    const sum: Record<string, string> = {};
    expect(core.pdValidTerms([{ key: 'a', label: 'A', percent: 99.98, trigger: 'kontrak', due_days: 7 }], 'payment_terms', sum)).toBeNull();
    expect(sum).toEqual({ payment_terms: 'Total persentase termin harus 100%.' });
  });

  it('reads ids, dates and money like PHP', () => {
    expect([5, '5', `5${String.fromCharCode(10)}`, '05', 1.5, 0, 2147483648, '12abc', true].map(core.pdIdValue)).toEqual([5, 5, 5, null, null, null, null, null, null]);
    expect(['2028-02-29', '2026-02-29', '1899-12-31', '2026-1-01', null].map(core.pdDateValue)).toEqual(['2028-02-29', null, null, null, null]);
    const errors: Record<string, string> = {};
    expect(core.pdMoney({ a: ' 1500000.50 ' }, 'a', 'Nilai', true, errors)).toBe(1500000.5);
    expect(core.pdMoney({ a: '1e3' }, 'a', 'Nilai', true, errors)).toBeNull();
    expect(errors).toEqual({ a: 'Nilai harus angka 0 sampai 1.000.000.000.000.' });
  });

  it('validates e-mail addresses like FILTER_VALIDATE_EMAIL', () => {
    expect(['nama@email.com', 'A+b@X.co.id', '"a b"@x.com', 'a@x', 'a..b@x.com', `${'a'.repeat(65)}@x.com`, 'a@[1.2.3.4]', 'é@x.com'].map(phpIsEmail))
      .toEqual([true, true, false, false, false, false, true, false]);
  });

  it.skipIf(!PHP_AVAILABLE)('agrees with filter_var(FILTER_VALIDATE_EMAIL)', () => {
    const r = random(3);
    const alphabet = 'abcXYZ09.-_+@"() []:;,!#$%&*/=?^`{|}~';
    const emails = Array.from({ length: 1500 }, () => Array.from({ length: 1 + r(24) }, () => alphabet[r(alphabet.length)]).join(''));
    emails.push('nama@email.com', 'a@b.c-o', 'a@[IPv6:::1]', '""@x.com', `a@${'b'.repeat(64)}.com`);
    const php = runPhp(emails.map((e) => ['email', [e]]));
    emails.forEach((e, i) => expect([e, phpIsEmail(e)]).toEqual([e, php[i]]));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Formatting, canonical JSON, content hash
// ════════════════════════════════════════════════════════════════════════════

describe('formatting', () => {
  it('spells rupiah and dates in Indonesian like the engine', () => {
    expect(core.pdTerbilang(1250000)).toBe('satu juta dua ratus lima puluh ribu rupiah');
    expect(core.pdTerbilang(1000)).toBe('seribu rupiah');
    expect(core.pdTerbilang(0.4)).toBe('nol rupiah');
    expect(core.pdRupiah('-1000.00')).toBe('-Rp1.000');
    expect(core.pdTanggalPanjang('2026-10-21 10:05:00')).toBe('21 Oktober 2026');
    expect(core.pdHari('2026-10-21')).toBe('Rabu');
    expect(core.pdDurationDays('2026-10-01', '2026-12-31')).toBe(92);
    expect(core.pdDurationDays('2026-10-02', '2026-10-01')).toBe(0);
    const r = random(11);
    for (let i = 0; i < 300; i++) {
      const n = (r(2000000000) * (r(3) + 1)) / (r(7) + 1);
      expect([core.pdTerbilang(n), core.pdRupiah(n)]).toEqual([terbilang(n), formatRupiahDoc(n)]);
      const date = new Date(Date.UTC(2000 + r(40), r(12), 1 + r(28))).toISOString().slice(0, 10);
      expect([core.pdTanggalPanjang(date), core.pdHari(date)]).toEqual([tanggalPanjang(date), hari(date)]);
    }
  });

  it.skipIf(!PHP_AVAILABLE)('matches pd_terbilang / pd_rupiah / pd_tanggal_panjang / pd_hari', () => {
    const r = random(5);
    const cases: [number, string][] = Array.from({ length: 300 }, () => [
      Math.round(((r(2000000000) * (r(500) + 1)) / (r(7) + 1)) * 100) / 100,
      new Date(Date.UTC(1990 + r(60), r(12), 1 + r(28))).toISOString().slice(0, 10),
    ]);
    const php = runPhp(cases.map(([n, d]) => ['words', [n, d]]));
    cases.forEach(([n, d], i) => expect([core.pdTerbilang(n), core.pdRupiah(n), core.pdTanggalPanjang(d), core.pdHari(d)]).toEqual(php[i]));
  });
});

describe('canonical JSON and content hash', () => {
  const LS = String.fromCharCode(0x2028);
  const content = JSON.stringify({
    title: 'Uji', sections: [{ id: 'b', title: 'Ä', body: `x\ny "q" / \\ é ${LS}`, table: { columns: ['k'], rows: [['1.5']] } }, { id: 'a', title: '' }],
    fields: { z: 1, a: 0.1, m: true, e: 1e-5, big: 1.5e17, é: 'x' },
  });
  const snapshot = JSON.stringify({ document: { number: '001/BRD/GNB/X/2026', version: 2 }, company: { bank_accounts: [] }, empty: {}, list: [], n: null, f: 12.5 });

  it('sorts keys, keeps {} and [] apart and prints numbers like PHP json_encode', () => {
    expect(core.pdCanonicalJson(JSON.parse('{"b":[1,{}],"a":{"y":1e-5,"x":[]},"é":0.1,"Z":true}'))).toBe('{"Z":true,"a":{"x":[],"y":1.0e-5},"b":[1,{}],"é":0.1}');
  });

  it('hashes {content, snapshot} to the same SHA-256 as pd_content_hash()', () => {
    // Computed once with the PHP backend (pd_content_hash in backend/modules/project_docs/core.php)
    expect(core.pdContentHash(content, snapshot)).toBe('49f3f5c2ea626ffac7c504e02a34c815e60a35f85b25616f7f9377f68dda6751');
    expect(core.pdContentHash(content, null)).toBe('5a7556a7f9aa742127ae825b1e5b2463b4cc650c84cbf4999cf032d8c15a64d9');
  });

  it.skipIf(!PHP_AVAILABLE)('agrees with pd_content_hash() of the PHP backend', () => {
    expect(runPhp([['hash', [content, snapshot]], ['hash', [content, null]]])).toEqual([core.pdContentHash(content, snapshot), core.pdContentHash(content, null)]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Signatures and payment proofs
// ════════════════════════════════════════════════════════════════════════════

const pixels = (png: Buffer) => {
  const parts: Buffer[] = [];
  for (let pos = 8; pos + 12 <= png.length;) {
    const size = png.readUInt32BE(pos);
    if (png.toString('latin1', pos + 4, pos + 8) === 'IDAT') parts.push(png.subarray(pos + 8, pos + 8 + size));
    pos += 12 + size;
  }
  return zlib.inflateSync(Buffer.concat(parts));
};

describe('signatures and proofs', () => {
  it('renders a typed name as a valid PNG and refuses names without latin letters', () => {
    const png = pdRenderTypedSignature('Sári Ñoviyanti – W.');
    expect(png).not.toBeNull();
    expect(pdPngValid(png as Buffer)).toBe(true);
    expect(pdRenderTypedSignature('日本')).toBeNull();
  });

  it('accepts a drawn PNG data URL and rejects a broken one', () => {
    const png = pdRenderTypedSignature('Budi') as Buffer;
    const errors: Record<string, string> = {};
    expect(pdSignatureInput({ method: 'draw', data_url: `data:image/png;base64,${png.toString('base64')}` }, errors)).toEqual(['draw', png]);
    const broken = Buffer.from(png);
    broken[broken.length - 1] ^= 1; // IEND CRC
    expect(pdSignatureInput({ method: 'draw', data_url: `data:image/png;base64,${broken.toString('base64')}` }, errors)).toBeNull();
    expect(errors).toEqual({ signature: 'Tanda tangan harus gambar PNG yang valid (maks. 300 KB).' });
    expect(pdSignatureInput({ method: 'type', typed_name: ' ' }, errors)).toBeNull();
    expect(errors.signature).toBe('Nama untuk tanda tangan ketik wajib diisi (maks. 80 karakter).');
    expect(pdSignatureInput(null, errors)).toBeNull();
    expect(errors.signature).toBe('Tanda tangan wajib diisi.');
  });

  it('sniffs payment proofs from their bytes, not the declared type', () => {
    const errors: Record<string, string> = {};
    expect(pdProofInput(`data:image/png;base64,${Buffer.from('%PDF-1.4 bukti').toString('base64')}`, errors)?.[1]).toBe('pdf');
    expect(pdProofInput(`data:x;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString('base64')}`, errors)?.[1]).toBe('jpg');
    expect(pdProofInput('data:text/plain;base64,aGFsbw==', errors)).toBeNull();
    expect(errors).toEqual({ proof: 'Bukti pembayaran harus file JPG, PNG, atau PDF.' });
  });

  it.skipIf(!PHP_AVAILABLE)('draws the same pixels as pd_render_typed_signature()', () => {
    const names = ['Budi Santoso', 'Sári Ñoviyanti–W', "O'Neil, Jr. 2", 'a  b'];
    const php = runPhp(names.map((n) => ['typed', [n]])) as string[];
    names.forEach((name, i) => expect(pixels(pdRenderTypedSignature(name) as Buffer).equals(pixels(Buffer.from(php[i], 'base64')))).toBe(true));
  });
});
