// @vitest-environment node
// Node environment: backend/modules/templates.js imports security.js (bcryptjs) and s3-client.js (@aws-sdk), which only
// backend/node_modules has; both are mocked below.
//
// "kategori" is never a template slug: /template/kategori/{category} are the category pages (docs/platform/SEO-PLAN.md
// §2), so /template/kategori must not become a template page. admin_save_template refuses it on create and update,
// and an automatic slug made from a name like "Kategori" gets a number. Node (backend/modules/templates.js) and PHP
// (backend/modules/templates.php, run in the CLI with a stubbed database) must answer the same; the PHP half is
// skipped without `php`.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const { fakeS3Sdk } = vi.hoisted(() => {
  // security.js and s3-client.js read these when they are imported
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

import { handlePlatformAction, RESERVED_SLUGS } from '../../backend/modules/templates.js';

const ROOT = resolve(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8');
const API_PHP = read('backend', 'api.php');
const TEMPLATES_PHP = read('backend', 'modules', 'templates.php');

const RESERVED_ERROR = 'Slug "kategori" tidak bisa dipakai karena alamat /template/kategori sudah dipakai halaman lain. Pilih slug lain.';

interface Case {
  /** admin_save_template input on top of a valid base */
  input: Record<string, unknown>;
  /** slugs other templates already use */
  taken?: string[];
  /** the template row being updated (input.id) */
  existing?: Record<string, unknown> | null;
}
interface Outcome {
  status: number;
  code?: string | null;
  errors?: Record<string, string> | null;
  /** slug written by the INSERT/UPDATE, null when nothing was written */
  slug: string | null;
}

const BASE = { name: 'Template Uji', category: 'Company Profile', price: 990000, template_code: 'corporate-nexa', status: 'draft' };
const EXISTING = {
  id: 7, slug: 'lama', name: 'Lama', category: 'Company Profile', short_description: null, description: null, features: '[]',
  price: '990000.00', preview_image: null, gallery: '[]', template_code: 'corporate-nexa', demo_url: null, status: 'draft',
  sort_order: 0, created_at: '2026-10-20 10:00:00', updated_at: '2026-10-20 10:00:00',
};
const CASES: Case[] = [
  { input: { slug: 'kategori' } },
  { input: { slug: 'KATEGORI' } },
  { input: { slug: '  kategori ' } },
  { input: { id: 7, slug: 'kategori' }, existing: EXISTING },
  { input: { slug: 'kategori-klinik' } },
  { input: { slug: '', name: 'Kategori' } },
  { input: { slug: '', name: 'Kategori' }, taken: ['kategori-2'] },
  { input: { slug: '', name: 'Aura Studio' } },
];
const EXPECTED: Outcome[] = [
  { status: 400, code: 'VALIDATION', errors: { slug: RESERVED_ERROR }, slug: null },
  { status: 400, code: 'VALIDATION', errors: { slug: RESERVED_ERROR }, slug: null },
  { status: 400, code: 'VALIDATION', errors: { slug: RESERVED_ERROR }, slug: null },
  { status: 400, code: 'VALIDATION', errors: { slug: RESERVED_ERROR }, slug: null },
  { status: 200, slug: 'kategori-klinik' },
  { status: 200, slug: 'kategori-2' },
  { status: 200, slug: 'kategori-3' },
  { status: 200, slug: 'aura-studio' },
];

// ── Node: the real handler with an in-memory stand-in for the pool ──
async function runNode(c: Case): Promise<Outcome> {
  const input = { ...BASE, ...c.input };
  let written: unknown[] | null = null;
  const pool = {
    async query({ sql, values }: { sql: string; values: unknown[] }) {
      if (sql.startsWith('SELECT id FROM templates WHERE slug = ?')) return [(c.taken ?? []).includes(values[0] as string) ? [{ id: 9 }] : []];
      if (sql.startsWith('SELECT * FROM templates WHERE id = ?')) {
        return [c.existing ? [c.existing] : written ? [{ ...EXISTING, id: 42, slug: written[0] }] : []];
      }
      if (sql.startsWith('INSERT INTO templates') || sql.startsWith('UPDATE templates')) {
        written = values;
        return [{ insertId: 42, affectedRows: 1 }];
      }
      throw new Error(`unexpected query: ${sql}`);
    },
  };
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headersSent: false,
    locals: {} as Record<string, unknown>,
    set() {
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      this.headersSent = true;
      return this;
    },
  };
  const req = { method: 'POST', query: {}, user: { id: 1, role: 'admin' }, rawBody: Buffer.from(JSON.stringify(input)) };
  expect(await handlePlatformAction('admin_save_template', input, req, res, pool)).toBe(true);
  const body = res.body as { code?: string; errors?: Record<string, string> };
  const slug = written ? String((written as unknown[])[0]) : null;
  return res.statusCode === 200 ? { status: 200, slug } : { status: res.statusCode, code: body.code ?? null, errors: body.errors ?? null, slug };
}

describe('reserved template slug (Node)', () => {
  it('is the same list in both backends', () => {
    expect([...RESERVED_SLUGS]).toEqual(['kategori']);
    expect(TEMPLATES_PHP).toMatch(/^const PF_RESERVED_SLUGS = \['kategori'\];\r?$/m);
  });

  it('refuses "kategori" on create and update and numbers an automatic slug', async () => {
    const out: Outcome[] = [];
    for (const c of CASES) out.push(await runNode(c));
    expect(out).toEqual(EXPECTED);
  });
});

// ── PHP: the real module in the CLI, api.php's own ApiError / in_str / in_int, the database stubbed ──
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo "ok";'], { encoding: 'utf8' }).stdout === 'ok';

function apiPhpBlock(pattern: string) {
  const match = API_PHP.match(new RegExp(`^${pattern}[\\s\\S]*?^}\\r?$`, 'm'));
  if (!match) throw new Error(`${pattern} not found in backend/api.php`);
  return match[0];
}

const CLI_HARNESS = String.raw`<?php
${['class ApiError ', 'function in_str\\(', 'function in_int\\('].map(apiPhpBlock).join('\n')}
function db_one($conn, $sql, array $params = []) {
    if (strpos($sql, 'SELECT id FROM templates WHERE slug = ?') === 0) return in_array($params[0], $GLOBALS['__taken'], true) ? ['id' => 9] : null;
    if (strpos($sql, 'SELECT * FROM templates WHERE id = ?') === 0) return $GLOBALS['__existing'];
    throw new Exception("unexpected query: $sql");
}
function db_run($conn, $sql, array $params = []) {
    if (strpos($sql, 'INSERT INTO templates') === 0 || strpos($sql, 'UPDATE templates') === 0) {
        $GLOBALS['__written'] = $params;
        return true;
    }
    throw new Exception("unexpected query: $sql");
}
function save_base64_asset() { throw new Exception('no uploads in this test'); }
function delete_local_asset() {}
require getenv('TS_MODULE');

$out = [];
foreach (json_decode(stream_get_contents(STDIN), true) as $case) {
    $GLOBALS['__taken'] = $case['taken'] ?? [];
    $GLOBALS['__existing'] = $case['existing'] ?? null;
    $GLOBALS['__written'] = null;
    try {
        pf_admin_save_template(mysqli_init(), $case['input'], ['id' => 1, 'role' => 'admin']);
        $r = ['status' => 200];
    } catch (ApiError $e) {
        $r = ['status' => $e->status, 'code' => $e->errorCode, 'errors' => $e->fieldErrors];
    } catch (Error $e) {
        // A new row: reading insert_id of the unconnected test mysqli fails after the INSERT, which is all we need
        if ($GLOBALS['__written'] === null) throw $e;
        $r = ['status' => 200];
    }
    $r['slug'] = $GLOBALS['__written'][0] ?? null;
    $out[] = $r;
}
echo json_encode($out);
`;

describe.skipIf(!PHP_AVAILABLE)('reserved template slug (PHP)', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'gn-template-slug-php-'));
    writeFileSync(join(dir, 'cli.php'), CLI_HARNESS);
  });
  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('answers exactly like the Node backend', () => {
    const cases = CASES.map((c) => ({ ...c, input: { ...BASE, ...c.input } }));
    const result = spawnSync('php', ['-d', 'display_errors=stderr', join(dir, 'cli.php')], {
      input: JSON.stringify(cases),
      encoding: 'utf8',
      env: { ...process.env, TS_MODULE: join(ROOT, 'backend', 'modules', 'templates.php') },
    });
    expect(result.stderr).toBe('');
    const out = (JSON.parse(result.stdout) as Outcome[]).map((o) => (o.status === 200 ? { status: 200, slug: o.slug } : o));
    expect(out).toEqual(EXPECTED);
  });
});
