// list_products: public list without credentials, `users` encrypted at rest (AES-256-GCM, LIST_PRODUCTS_KEY),
// and the Node (backend/modules/list_products.js) and PHP (backend/modules/list_products.php) handlers behaving the
// same. The PHP half runs the real PHP module with the database stubbed; it is skipped when `php` is not installed.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Same stand-in for both backends: data URIs become a fixed path, other values pass through (script URLs dropped)
const { fakeUpload } = vi.hoisted(() => ({
  fakeUpload: (value: unknown, section: string) =>
    typeof value === 'string' && /^\s*data:/i.test(value)
      ? `/assets/${section}/upload`
      // Control characters are intentional: same check as safeLink in backend/modules/list_products.js
      // eslint-disable-next-line no-control-regex
      : typeof value === 'string' && /^[\s\x00-\x1f]*(javascript|vbscript|data):/i.test(value) ? '' : value,
}));

vi.mock('../../backend/s3-client.js', () => ({
  uploadBase64ToS3: vi.fn(async (value: unknown, section: string) => fakeUpload(value, section)),
  uploadCompressedImageToS3: vi.fn(async (value: unknown, section: string) => fakeUpload(value, section)),
}));

import * as lp from '../../backend/modules/list_products.js';
import { uploadCompressedImageToS3 } from '../../backend/s3-client.js';

const ROOT = resolve(__dirname, '..', '..');
const API_PHP = readFileSync(join(ROOT, 'backend', 'api.php'), 'utf8');
const SECURITY_JS = readFileSync(join(ROOT, 'backend', 'security.js'), 'utf8');
const MODULE_PHP = readFileSync(join(ROOT, 'backend', 'modules', 'list_products.php'), 'utf8');

const KEY = randomBytes(32).toString('hex');
const OTHER_KEY = randomBytes(32).toString('hex');
const ACCOUNTS = [
  { username: 'admin.demo', password: 'Rahasia#123/"\\', keterangan: 'Admin sekolah – uji' },
  { username: 'guru', password: 'pässwörd', keterangan: '' },
];
const ACCOUNTS_JSON = JSON.stringify(ACCOUNTS);

type Query = { sql: string; params: unknown[] };
type Outcome = { status: number; body: unknown; queries: Query[] };
type Scenario = {
  action: string;
  method?: 'GET' | 'POST';
  input?: Record<string, unknown>;
  rows?: Record<string, unknown>[];
  env?: Record<string, string>;
};

const squash = (sql: string) => sql.replace(/\s+/g, ' ').trim();

function withKey(key: string | undefined, fn: () => void) {
  const before = process.env.LIST_PRODUCTS_KEY;
  if (key === undefined) delete process.env.LIST_PRODUCTS_KEY;
  else process.env.LIST_PRODUCTS_KEY = key;
  try {
    fn();
  } finally {
    if (before === undefined) delete process.env.LIST_PRODUCTS_KEY;
    else process.env.LIST_PRODUCTS_KEY = before;
  }
}

// ── Node: handler with a recording fake pool ──
async function runNode({ action, method = 'POST', input = {}, rows = [], env = {} }: Scenario): Promise<Outcome> {
  const queries: Query[] = [];
  const pool = {
    query: vi.fn(async (q: string | { sql: string; values: unknown[] }, params: unknown[] = []) => {
      const sql = typeof q === 'string' ? q : q.sql;
      queries.push({ sql: squash(sql), params: typeof q === 'string' ? params : q.values });
      return /^\s*SELECT/i.test(sql) ? [rows.map((r) => ({ ...r }))] : [{ affectedRows: 1, insertId: 7 }];
    }),
  };
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headersSent: false,
    locals: {} as Record<string, unknown>,
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
  const before = process.env.LIST_PRODUCTS_KEY;
  if ('LIST_PRODUCTS_KEY' in env) process.env.LIST_PRODUCTS_KEY = env.LIST_PRODUCTS_KEY;
  try {
    const req = { method, query: method === 'GET' ? input : {}, user: { id: 1, role: 'admin' } };
    const handled = await lp.handleListProductAction(action, input, req, res, pool);
    expect(handled).toBe(true);
  } finally {
    if (before === undefined) delete process.env.LIST_PRODUCTS_KEY;
    else process.env.LIST_PRODUCTS_KEY = before;
  }
  return { status: res.statusCode, body: JSON.parse(JSON.stringify(res.body)), queries };
}

// ── PHP: the real module, with api.php's input helpers and a stubbed database ──
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo extension_loaded("openssl") && extension_loaded("mysqli") ? "ok" : "no";'], {
  encoding: 'utf8',
}).stdout === 'ok';
let harnessDir = '';
let harnessFile = '';

function apiPhpFunction(name: string) {
  const match = API_PHP.match(new RegExp(`^function ${name}\\([\\s\\S]*?^}\\r?$`, 'm'));
  if (!match) throw new Error(`function ${name} not found in backend/api.php`);
  return match[0];
}

function buildHarness() {
  return `<?php
class ApiError extends Exception {
    public $status;
    public $errorCode;
    public function __construct($message, $status = 400, $errorCode = null) {
        parent::__construct($message);
        $this->status = $status;
        $this->errorCode = $errorCode;
    }
}
${['in_str', 'in_int', 'env_value', 'safe_link', 'save_base64_files'].map(apiPhpFunction).join('\n')}
function save_base64_asset($data, $section, $filename = null) {
    return (is_string($data) && preg_match('/^\\s*data:/i', $data)) ? "/assets/$section/upload" : safe_link($data);
}
function db_record($sql, $params) { $GLOBALS['__queries'][] = ['sql' => trim(preg_replace('/\\s+/', ' ', $sql)), 'params' => array_values($params)]; }
function db_run($conn, $sql, array $params = []) { db_record($sql, $params); $GLOBALS['db_last_affected_rows'] = 1; return true; }
function db_all($conn, $sql, array $params = []) { db_record($sql, $params); return $GLOBALS['__rows']; }
function db_one($conn, $sql, array $params = []) { db_record($sql, $params); return $GLOBALS['__rows'][0] ?? null; }
function db_affected_rows() { return (int)($GLOBALS['db_last_affected_rows'] ?? 0); }
require getenv('LP_MODULE');

$req = json_decode(stream_get_contents(STDIN), true);
$GLOBALS['__queries'] = [];
$GLOBALS['__rows'] = $req['rows'];
$_SERVER['REQUEST_METHOD'] = $req['method'];
$_GET = $req['method'] === 'GET' ? $req['input'] : [];
$input = $req['input'];
if ($req['method'] === 'GET') $input = $input + $_GET;
ob_start();
try {
    handle_list_product_action(mysqli_init(), $req['action'], $input, ['id' => 1, 'role' => 'admin']);
    $out = ['status' => 200, 'body' => json_decode(ob_get_clean(), true)];
} catch (ApiError $e) {
    ob_end_clean();
    $body = ['error' => $e->getMessage()];
    if ($e->errorCode) $body['code'] = $e->errorCode;
    $out = ['status' => $e->status, 'body' => $body];
} catch (Throwable $e) {
    ob_end_clean();
    $out = ['status' => 'php-error', 'body' => $e->getMessage()];
}
$out['queries'] = $GLOBALS['__queries'];
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;
}

function runPhp({ action, method = 'POST', input = {}, rows = [], env = {} }: Scenario): Outcome {
  const result = spawnSync('php', [harnessFile], {
    input: JSON.stringify({ action, method, input, rows }),
    encoding: 'utf8',
    env: { ...process.env, LP_MODULE: join(ROOT, 'backend', 'modules', 'list_products.php'), ...env },
  });
  if (result.status !== 0 || !result.stdout) throw new Error(`php failed: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout);
}

// Ciphertext differs per call (random IV), so encrypted values are compared after decryption
function decryptParams(queries: Query[]) {
  let decrypted = 0;
  const out = queries.map((q) => ({
    sql: q.sql,
    params: q.params.map((p) => {
      if (!lp.isEncrypted(p)) return p;
      decrypted += 1;
      return `decrypted:${lp.decryptSecret(p, Buffer.from(KEY, 'hex'))}`;
    }),
  }));
  return { out, decrypted };
}

beforeEach(() => {
  process.env.LIST_PRODUCTS_KEY = KEY;
});
afterEach(() => {
  delete process.env.LIST_PRODUCTS_KEY;
  vi.mocked(uploadCompressedImageToS3).mockClear();
});

describe('list_products encryption (Node)', () => {
  it('round-trips with the enc:v1 format and a fresh IV each time', () => {
    const a = lp.encryptSecret(ACCOUNTS_JSON);
    const b = lp.encryptSecret(ACCOUNTS_JSON);
    expect(a.startsWith('enc:v1:')).toBe(true);
    expect(a).not.toBe(b);
    expect(a).not.toContain('Rahasia');
    expect(lp.decryptSecret(a)).toBe(ACCOUNTS_JSON);
    // 12-byte IV + ciphertext + 16-byte tag
    expect(Buffer.from(a.slice(7), 'base64').length).toBe(12 + Buffer.byteLength(ACCOUNTS_JSON) + 16);
  });

  it('rejects a wrong key and tampered data with DECRYPT_FAILED', () => {
    const stored = lp.encryptSecret(ACCOUNTS_JSON);
    expect(() => lp.decryptSecret(stored, Buffer.from(OTHER_KEY, 'hex'))).toThrow(expect.objectContaining({ status: 500, code: 'DECRYPT_FAILED' }));
    const raw = Buffer.from(stored.slice(7), 'base64');
    raw[20] ^= 1;
    expect(() => lp.decryptSecret(`enc:v1:${raw.toString('base64')}`)).toThrow(expect.objectContaining({ code: 'DECRYPT_FAILED' }));
    expect(() => lp.decryptSecret('enc:v1:not base64!')).toThrow(expect.objectContaining({ code: 'DECRYPT_FAILED' }));
  });

  it('needs a 64-hex LIST_PRODUCTS_KEY', () => {
    for (const key of [undefined, '', 'abc', KEY.slice(2), `${KEY}00`, 'z'.repeat(64)]) {
      withKey(key, () => {
        expect(lp.listProductsKey()).toBeNull();
        expect(() => lp.encryptUsers(ACCOUNTS)).toThrow(expect.objectContaining({ status: 503, code: 'NOT_CONFIGURED' }));
      });
    }
    withKey(` ${KEY.toUpperCase()} `, () => expect(lp.listProductsKey()?.length).toBe(32));
  });

  it('reads legacy plain rows and decrypts encrypted ones', () => {
    expect(lp.readUsers(null)).toBeNull();
    expect(lp.readUsers(ACCOUNTS_JSON)).toBe(ACCOUNTS_JSON);
    expect(lp.readUsers(lp.encryptSecret(ACCOUNTS_JSON))).toBe(ACCOUNTS_JSON);
    // Legacy rows need no key; encrypted rows do
    withKey(undefined, () => {
      expect(lp.readUsers(ACCOUNTS_JSON)).toBe(ACCOUNTS_JSON);
      expect(() => lp.readUsers('enc:v1:AAAA')).toThrow(expect.objectContaining({ code: 'NOT_CONFIGURED' }));
    });
  });

  it('accepts users only as a JSON array', () => {
    expect(lp.normalizeUsers(ACCOUNTS)).toBe(ACCOUNTS_JSON);
    expect(lp.normalizeUsers(` ${ACCOUNTS_JSON}\n`)).toBe(ACCOUNTS_JSON);
    expect(lp.normalizeUsers('')).toBe('[]');
    for (const bad of ['{"username":"a"}', '[1,', 'abc', 5, true, { username: 'a' }]) {
      expect(() => lp.normalizeUsers(bad)).toThrow(expect.objectContaining({ status: 400, code: 'VALIDATION' }));
    }
    expect(() => lp.normalizeUsers([{ note: 'x'.repeat(40000) }])).toThrow(expect.objectContaining({ code: 'VALIDATION' }));
  });
});

describe('list_products actions (Node)', () => {
  const dbRow = {
    id: 2, title: 'Produk A', description: 'Deskripsi', link_button: 'https://a.test', image: null,
    logo: '/assets/list-products/a.webp', created_at: '2026-10-20 10:00:00', users: '', project_files: '[]',
    notes: 'catatan', position: 3,
  };

  it('get_list_products selects and returns only public columns', async () => {
    const leaky = { ...dbRow, id: '5', users: ACCOUNTS_JSON, password: 'x', notes: 'secret notes' };
    for (const method of ['GET', 'POST'] as const) {
      const { status, body, queries } = await runNode({ action: 'get_list_products', method, rows: [leaky] });
      expect(status).toBe(200);
      expect(queries[0].sql).toBe('SELECT id, title, description, link_button, image, logo FROM list_products ORDER BY position ASC, id DESC');
      expect(body).toEqual([{ id: 5, title: 'Produk A', description: 'Deskripsi', link_button: 'https://a.test', image: null, logo: '/assets/list-products/a.webp' }]);
      expect(JSON.stringify(body)).not.toMatch(/users|password|Rahasia|notes/);
    }
  });

  it('get_list_product_detail returns decrypted accounts to staff', async () => {
    const { status, body } = await runNode({
      action: 'get_list_product_detail', method: 'GET', input: { id: '2' }, rows: [{ ...dbRow, users: lp.encryptSecret(ACCOUNTS_JSON) }],
    });
    expect(status).toBe(200);
    expect(body).toEqual({ ...dbRow, users: ACCOUNTS_JSON });
  });

  it('add_list_product stores users as ciphertext only', async () => {
    const { status, body, queries } = await runNode({
      action: 'add_list_product', input: { title: '  Produk B ', users: ACCOUNTS, image: 'data:image/png;base64,iVBORw0KGgo=' },
    });
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, id: 7 });
    const insert = queries.find((q) => q.sql.startsWith('INSERT INTO list_products'))!;
    const users = insert.params[5] as string;
    expect(lp.isEncrypted(users)).toBe(true);
    expect(JSON.stringify(insert.params)).not.toMatch(/Rahasia|admin\.demo/);
    expect(lp.decryptSecret(users)).toBe(ACCOUNTS_JSON);
    expect(insert.params.slice(0, 5)).toEqual(['Produk B', '', '', '/assets/list-products/upload', null]);
  });

  it('refuses to store accounts without a key, before uploading anything', async () => {
    const { status, body, queries } = await runNode({
      action: 'add_list_product', input: { title: 'Produk B', users: ACCOUNTS, image: 'data:image/png;base64,iVBORw0KGgo=' }, env: { LIST_PRODUCTS_KEY: '' },
    });
    expect(status).toBe(503);
    expect(body).toMatchObject({ code: 'NOT_CONFIGURED' });
    expect(queries).toEqual([]);
    expect(uploadCompressedImageToS3).not.toHaveBeenCalled();
  });

  it('update_list_product encrypts users and only touches the fields sent', async () => {
    const { status, queries } = await runNode({ action: 'update_list_product', input: { id: 2, users: ACCOUNTS_JSON } });
    expect(status).toBe(200);
    expect(queries).toHaveLength(1);
    expect(queries[0].sql).toBe('UPDATE list_products SET users = ? WHERE id = ?');
    expect(lp.decryptSecret(queries[0].params[0] as string)).toBe(ACCOUNTS_JSON);
    expect(queries[0].params[1]).toBe(2);
  });

  it('write actions are POST only', async () => {
    for (const action of ['add_list_product', 'update_list_product', 'delete_list_product', 'update_product_order', 'encrypt_list_products']) {
      const { status, queries } = await runNode({ action, method: 'GET', input: { id: 2, title: 'x' } });
      expect(status).toBe(405);
      expect(queries).toEqual([]);
    }
  });

  it('encrypt_list_products encrypts plain rows once and reports unreadable ones', async () => {
    const otherKeyValue = lp.encryptSecret('[]', Buffer.from(OTHER_KEY, 'hex'));
    const rows = [
      { id: 1, users: ACCOUNTS_JSON },
      { id: 2, users: lp.encryptSecret('[]') },
      { id: 3, users: otherKeyValue },
      { id: 4, users: 'not json' },
    ];
    const { status, body, queries } = await runNode({ action: 'encrypt_list_products', rows });
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, encrypted: 2, already_encrypted: 2, unreadable: 1, total: 4 });
    const updates = queries.filter((q) => q.sql.startsWith('UPDATE'));
    expect(updates.map((q) => q.params[1])).toEqual([1, 4]);
    expect(updates.every((q) => q.sql.endsWith("AND users NOT LIKE 'enc:v1:%'"))).toBe(true);
    expect(lp.decryptSecret(updates[0].params[0] as string)).toBe(ACCOUNTS_JSON);
    expect(lp.decryptSecret(updates[1].params[0] as string)).toBe('not json');
  });
});

describe('list_products access policy (security.js ↔ api.php)', () => {
  const listOf = (source: string, name: string) => {
    const block = source.match(new RegExp(`${name}\\s*=\\s*(?:new Set\\()?\\[([\\s\\S]*?)\\]`));
    if (!block) throw new Error(`${name} not found`);
    return [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
  };

  it('keeps the action lists of both backends identical', () => {
    for (const name of ['PUBLIC_ACTIONS', 'CUSTOMER_ACTIONS', 'ADMIN_ACTIONS']) {
      expect(listOf(API_PHP, name)).toEqual(listOf(SECURITY_JS, name));
    }
  });

  it('only the public list is public; the migration is admin only', () => {
    const publicActions = listOf(SECURITY_JS, 'PUBLIC_ACTIONS');
    expect(publicActions).toContain('get_list_products');
    for (const action of lp.LIST_PRODUCT_ACTIONS.filter((a: string) => a !== 'get_list_products')) {
      expect(publicActions).not.toContain(action);
    }
    expect(listOf(SECURITY_JS, 'ADMIN_ACTIONS')).toContain('encrypt_list_products');
  });

  it('PHP module has the same actions and public columns', () => {
    const phpActions = [...MODULE_PHP.matchAll(/'([a-z_]+)' => 'lp_/g)].map((m) => m[1]);
    expect(phpActions.sort()).toEqual([...lp.LIST_PRODUCT_ACTIONS].sort());
    const columns = MODULE_PHP.match(/const LP_PUBLIC_COLUMNS = \[([^\]]*)\]/)![1];
    expect([...columns.matchAll(/'([a-z_]+)'/g)].map((m) => m[1])).toEqual(lp.PUBLIC_COLUMNS);
  });
});

describe.skipIf(!PHP_AVAILABLE)('list_products PHP ↔ Node parity', () => {
  beforeAll(() => {
    harnessDir = mkdtempSync(join(tmpdir(), 'gn-list-products-'));
    harnessFile = join(harnessDir, 'harness.php');
    writeFileSync(harnessFile, buildHarness());
  });
  afterAll(() => {
    if (harnessDir) rmSync(harnessDir, { recursive: true, force: true });
  });

  const detailRow = () => ({
    id: 2, title: 'Produk A', description: 'Deskripsi', link_button: 'https://a.test', image: null,
    logo: '/assets/list-products/a.webp', created_at: '2026-10-20 10:00:00', users: lp.encryptSecret(ACCOUNTS_JSON),
    project_files: '[]', notes: 'catatan', position: 3,
  });

  const scenarios: [string, () => Scenario][] = [
    ['public list', () => ({ action: 'get_list_products', method: 'GET', rows: [{ ...detailRow(), id: '5', password: 'x' }] })],
    ['detail (Node ciphertext read by PHP)', () => ({ action: 'get_list_product_detail', method: 'GET', input: { id: '2' }, rows: [detailRow()] })],
    ['detail of a legacy plain row', () => ({ action: 'get_list_product_detail', method: 'GET', input: { id: 2 }, rows: [{ ...detailRow(), users: ACCOUNTS_JSON }] })],
    ['detail without id', () => ({ action: 'get_list_product_detail', method: 'GET' })],
    ['detail not found', () => ({ action: 'get_list_product_detail', method: 'GET', input: { id: 9 } })],
    ['detail with a wrong key', () => ({ action: 'get_list_product_detail', method: 'GET', input: { id: 2 }, rows: [detailRow()], env: { LIST_PRODUCTS_KEY: OTHER_KEY } })],
    ['detail without a key', () => ({ action: 'get_list_product_detail', method: 'GET', input: { id: 2 }, rows: [detailRow()], env: { LIST_PRODUCTS_KEY: '' } })],
    ['add without title', () => ({ action: 'add_list_product', input: { title: '   ', users: ACCOUNTS } })],
    ['add with users as an object', () => ({ action: 'add_list_product', input: { title: 'B', users: { username: 'a' } } })],
    ['add with users as broken JSON', () => ({ action: 'add_list_product', input: { title: 'B', users: '[{' } })],
    ['add without a key', () => ({ action: 'add_list_product', input: { title: 'B', users: '[]' }, env: { LIST_PRODUCTS_KEY: 'short' } })],
    ['add with a too long title', () => ({ action: 'add_list_product', input: { title: 'é'.repeat(256) } })],
    ['update users only', () => ({ action: 'update_list_product', input: { id: '2', users: ACCOUNTS_JSON } })],
    ['update fields and images', () => ({
      action: 'update_list_product',
      input: { id: 2, title: ' B ', description: null, link_button: 'javascript:alert(1)', notes: 3, logo: 'data:image/png;base64,iVBORw0KGgo=', project_files: '[{"name":"a.pdf","path":"/assets/x.pdf","data":"x"}]' },
    })],
    ['update with nothing to change', () => ({ action: 'update_list_product', input: { id: 2, description: null } })],
    ['update via GET', () => ({ action: 'update_list_product', method: 'GET', input: { id: 2, users: '[]' } })],
    ['delete', () => ({ action: 'delete_list_product', input: { id: '4' } })],
    ['order', () => ({ action: 'update_product_order', input: { order: [{ id: 2, position: 1 }, { id: '3', position: '2' }, 'x'] } })],
    ['order that is not an array', () => ({ action: 'update_product_order', input: { order: 'x' } })],
    ['encrypt migration', () => ({
      action: 'encrypt_list_products',
      rows: [{ id: 1, users: ACCOUNTS_JSON }, { id: 2, users: lp.encryptSecret('[]') }, { id: 3, users: lp.encryptSecret('[]', Buffer.from(OTHER_KEY, 'hex')) }],
    })],
    ['encrypt migration without a key', () => ({ action: 'encrypt_list_products', rows: [{ id: 1, users: ACCOUNTS_JSON }], env: { LIST_PRODUCTS_KEY: '' } })],
  ];

  it.each(scenarios)('%s', async (_name, make) => {
    const scenario = make();
    const node = await runNode(scenario);
    const php = runPhp(scenario);
    expect(php.status).toBe(node.status);
    expect(php.body).toEqual(node.body);
    const n = decryptParams(node.queries);
    const p = decryptParams(php.queries);
    expect(p.out).toEqual(n.out);
    expect(p.decrypted).toBe(n.decrypted);
  });

  it('add: PHP encrypts the same INSERT (insert_id needs a real connection)', async () => {
    const scenario: Scenario = {
      action: 'add_list_product',
      input: { title: 'Produk B', description: 'D', link_button: 'https://b.test', users: ACCOUNTS, image: '/assets/list-products/b.webp', notes: 'n' },
    };
    const node = await runNode(scenario);
    const php = runPhp(scenario);
    expect(node.status).toBe(200);
    // The stubbed connection has no insert_id; everything before it ran
    expect(php).toMatchObject({ status: 'php-error', body: 'Property access is not allowed yet' });
    const n = decryptParams(node.queries);
    const p = decryptParams(php.queries);
    expect(p.decrypted).toBe(1);
    expect(p.out).toEqual(n.out);
    expect(JSON.stringify(php.queries)).not.toMatch(/Rahasia|admin\.demo/);
  });
});
