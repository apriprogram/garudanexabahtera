// @vitest-environment node
// Node environment: backend modules import packages that only backend/node_modules has (bcryptjs, @aws-sdk); they are
// mocked below, and only the SSR transform leaves such imports for the mocks to catch.
//
// Client project files (assets/dokumen-client/dokumen): closed to direct web requests (htaccess, nginx.conf) and only
// downloadable by staff through download_project_file. The Node (backend/modules/project_files.js) and PHP
// (backend/modules/project_files.php) handlers must answer the same; the PHP half runs the real module under
// `php -S` (headers are only real over HTTP) and is skipped when `php` is not installed.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Readable, Writable } from 'node:stream';

const { s3Get, s3Send, fakeS3Sdk, TEST_ENV } = vi.hoisted(() => {
  const env = {
    AUTH_SECRET: 'x'.repeat(16) + Math.random().toString(36).slice(2).padEnd(24, 'y'),
    S3_ACCESS_KEY: 'test-access',
    S3_SECRET_KEY: 'test-secret',
    S3_PUBLIC_URL: 'https://s3.test/bucket',
  };
  // security.js and s3-client.js read these when they are imported
  Object.assign(process.env, env);
  const s3Send = vi.fn();
  const fakeS3Sdk = () => {
    class Command {
      input: Record<string, unknown>;
      constructor(input: Record<string, unknown>) {
        this.input = input;
      }
    }
    return {
      S3Client: class {
        send = s3Send;
      },
      PutObjectCommand: class PutObjectCommand extends Command {},
      GetObjectCommand: class GetObjectCommand extends Command {},
      DeleteObjectCommand: class DeleteObjectCommand extends Command {},
      ListObjectsV2Command: class ListObjectsV2Command extends Command {},
    };
  };
  return { s3Get: vi.fn(), s3Send, fakeS3Sdk, TEST_ENV: env };
});

// project_files.js reads private objects through s3-client; the real s3-client is tested below with a fake SDK
vi.mock('../../backend/s3-client.js', () => ({ getFromS3: s3Get, S3_PUBLIC_URL: 'https://s3.test/bucket' }));
// s3-client.js loads the SDK from backend/node_modules when that folder is installed, otherwise by its bare name.
// Mock both ids, or a checkout with backend/node_modules sends these tests to the real S3.
vi.mock('@aws-sdk/client-s3', () => fakeS3Sdk());
vi.mock('../../backend/node_modules/@aws-sdk/client-s3', () => fakeS3Sdk());
// Only backend/node_modules has bcryptjs; the auth gate never needs a real hash here
vi.mock('bcryptjs', () => ({ default: { hashSync: () => 'dummy', compare: async () => false, hash: async () => 'dummy' } }));

import * as pf from '../../backend/modules/project_files.js';
import { createAuthGate, issueToken } from '../../backend/security.js';

const ROOT = resolve(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8');
const API_PHP = read('backend', 'api.php');
const SECURITY_JS = read('backend', 'security.js');
const SERVER_JS = read('backend', 'server.js');
const HTACCESS = read('deploy', 'cpanel', 'htaccess');
const NGINX = read('nginx.conf');

const DOC = '/assets/dokumen-client/dokumen/';
const PDF = Buffer.from('%PDF-1.4\n% brosur uji\n');

// ── Test web root: assets/dokumen-client/{dokumen,logo} plus a file outside it ──
let webRoot = '';
let symlinkMade = false;
const FILES: Record<string, Buffer> = {
  'doc_6a07571f15211_Brosur GNB.pdf': PDF,
  'Laporan Ünïcode, final (1).pdf': Buffer.from('%PDF-1.7\n'),
  'Brosur_GNB_a1b2c3d4e5f6.docx': Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]),
  'catatan uji.txt': Buffer.from('halo\n'),
  'Gambar.PNG': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]),
  'arsip.bin': Buffer.from([0, 1, 2, 3]),
  '.htaccess': Buffer.from('Require all denied\n'),
};

beforeAll(() => {
  webRoot = mkdtempSync(join(tmpdir(), 'gn-project-files-'));
  const dokumen = join(webRoot, 'assets', 'dokumen-client', 'dokumen');
  mkdirSync(join(dokumen, 'sub'), { recursive: true });
  mkdirSync(join(webRoot, 'assets', 'dokumen-client', 'logo'), { recursive: true });
  for (const [name, content] of Object.entries(FILES)) writeFileSync(join(dokumen, name), content);
  writeFileSync(join(dokumen, 'sub', 'inner.pdf'), PDF);
  writeFileSync(join(webRoot, 'assets', 'dokumen-client', 'logo', 'project_x.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
  writeFileSync(join(webRoot, 'secret.txt'), 'rahasia');
  try {
    // A link inside the folder pointing outside it must not be served (needs symlink rights on Windows)
    symlinkSync(join(webRoot, 'secret.txt'), join(dokumen, 'link.txt'), 'file');
    symlinkMade = true;
  } catch {
    symlinkMade = false;
  }
  process.env.PUBLIC_DIR = webRoot;
});
afterAll(() => {
  delete process.env.PUBLIC_DIR;
  if (webRoot) rmSync(webRoot, { recursive: true, force: true });
});
beforeEach(() => {
  s3Get.mockReset();
  s3Get.mockResolvedValue(null);
});

// ── Node: handler with a response that records status, headers and the streamed bytes ──
type Outcome = { status: number; headers: Record<string, string>; json?: unknown; body?: string };
const DOWNLOAD_HEADERS = ['content-type', 'content-length', 'content-disposition', 'cache-control', 'content-security-policy', 'x-content-type-options'];

class FakeRes extends Writable {
  statusCode = 200;
  headers: Record<string, string> = {};
  headersSent = false;
  jsonBody: unknown = undefined;
  chunks: Buffer[] = [];
  locals: Record<string, unknown> = {};
  status(code: number) {
    this.statusCode = code;
    return this;
  }
  set(headers: Record<string, string>) {
    for (const [k, v] of Object.entries(headers)) this.headers[k.toLowerCase()] = v;
    return this;
  }
  json(body: unknown) {
    this.headers['content-type'] = 'application/json';
    this.jsonBody = body;
    this.headersSent = true;
    this.end();
    return this;
  }
  _write(chunk: Buffer, _enc: BufferEncoding, cb: () => void) {
    this.headersSent = true;
    this.chunks.push(Buffer.from(chunk));
    cb();
  }
}

async function runNode(input: Record<string, unknown>, method: 'GET' | 'POST' = 'POST'): Promise<Outcome> {
  const res = new FakeRes();
  const req = { method, query: method === 'GET' ? input : {}, user: { id: 1, role: 'user' } };
  const handled = await pf.handleProjectFileAction('download_project_file', input, req, res);
  expect(handled).toBe(true);
  if (res.jsonBody !== undefined) return { status: res.statusCode, headers: {}, json: res.jsonBody };
  const headers = Object.fromEntries(DOWNLOAD_HEADERS.map((h) => [h, res.headers[h]]));
  return { status: res.statusCode, headers, body: Buffer.concat(res.chunks).toString('base64') };
}

describe('project file paths (Node)', () => {
  it('accepts one file directly in dokumen-client/dokumen, including legacy names with spaces', () => {
    expect(pf.projectFileName(`${DOC}doc_6a07571f15211_Brosur GNB.pdf`)).toBe('doc_6a07571f15211_Brosur GNB.pdf');
    expect(pf.projectFileName(`${DOC}Laporan Ünïcode, final (1).pdf`)).toBe('Laporan Ünïcode, final (1).pdf');
    // Private S3 objects stored by older Node uploads under S3_PUBLIC_URL
    expect(pf.projectFileName(`https://s3.test/bucket${DOC}Brosur_x.pdf`)).toBe('Brosur_x.pdf');
  });

  it('refuses traversal, other folders and odd names', () => {
    const bad: unknown[] = [
      undefined, null, 5, ['x'], { path: 'x' }, '',
      DOC, `${DOC}../logo/project_x.jpg`, `${DOC}../../../secret.txt`, `${DOC}..`, `${DOC}.htaccess`,
      `${DOC}sub/inner.pdf`, `${DOC}..\\..\\secret.txt`, `${DOC}C:secret.txt`, `${DOC}a\u0000.pdf`, `${DOC}a\nb.pdf`,
      '/assets/dokumen-client/logo/project_x.jpg', 'assets/dokumen-client/dokumen/a.pdf', '/assets/dokumen-client/dokumenX/a.pdf',
      '/ASSETS/dokumen-client/dokumen/a.pdf', `/x${DOC}a.pdf`, `https://evil.test${DOC}a.pdf`, `https://s3.test/bucket2${DOC}a.pdf`,
      `${DOC}${'a'.repeat(256)}`, `${DOC}${'é'.repeat(128)}`,
    ];
    for (const path of bad) expect(pf.projectFileName(path), String(path)).toBeNull();
  });

  it('builds attachment headers with an ASCII fallback and an RFC 5987 name', () => {
    expect(pf.contentTypeOf('a.PDF')).toBe('application/pdf');
    expect(pf.contentTypeOf('a.tar.gz')).toBe('application/octet-stream');
    expect(pf.contentTypeOf('README')).toBe('application/octet-stream');
    expect(pf.contentTypeOf('a.constructor')).toBe('application/octet-stream');
    expect(pf.contentDisposition('Laporan Ü (1)*.pdf')).toBe(
      `attachment; filename="Laporan __ (1)*.pdf"; filename*=UTF-8''Laporan%20%C3%9C%20%281%29%2A.pdf`,
    );
    expect(pf.contentDisposition('a "b"\\c.pdf')).toBe(`attachment; filename="a _b__c.pdf"; filename*=UTF-8''a%20%22b%22%5Cc.pdf`);
  });
});

describe('download_project_file (Node)', () => {
  it('streams a local file with download headers', async () => {
    for (const method of ['GET', 'POST'] as const) {
      const out = await runNode({ path: `${DOC}doc_6a07571f15211_Brosur GNB.pdf` }, method);
      expect(out.status).toBe(200);
      expect(out.headers).toEqual({
        'content-type': 'application/pdf',
        'content-length': String(PDF.length),
        'content-disposition': `attachment; filename="doc_6a07571f15211_Brosur GNB.pdf"; filename*=UTF-8''doc_6a07571f15211_Brosur%20GNB.pdf`,
        'cache-control': 'private, no-store',
        'content-security-policy': "default-src 'none'; sandbox",
        'x-content-type-options': 'nosniff',
      });
      expect(Buffer.from(out.body!, 'base64')).toEqual(PDF);
    }
    expect(s3Get).not.toHaveBeenCalled();
  });

  it('answers 400 INVALID_PATH and 404 NOT_FOUND without touching S3 for bad paths', async () => {
    expect(await runNode({ path: `${DOC}../logo/project_x.jpg` })).toEqual({
      status: 400, headers: {}, json: { error: 'Path file tidak valid.', code: 'INVALID_PATH' },
    });
    expect(await runNode({})).toMatchObject({ status: 400, json: { code: 'INVALID_PATH' } });
    expect(s3Get).not.toHaveBeenCalled();
    expect(await runNode({ path: `${DOC}tidak-ada.pdf` })).toEqual({
      status: 404, headers: {}, json: { error: 'File tidak ditemukan.', code: 'NOT_FOUND' },
    });
  });

  it('does not follow a link out of the folder', async (ctx) => {
    if (!symlinkMade) ctx.skip();
    expect(await runNode({ path: `${DOC}link.txt` })).toMatchObject({ status: 404, json: { code: 'NOT_FOUND' } });
  });

  it('falls back to the private S3 object with the same key', async () => {
    const content = Buffer.from('%PDF-1.5 s3\n');
    s3Get.mockResolvedValue({ body: Readable.from([content]), size: content.length });
    const out = await runNode({ path: `https://s3.test/bucket${DOC}Brosur_x.pdf` });
    expect(s3Get).toHaveBeenCalledWith('assets/dokumen-client/dokumen/Brosur_x.pdf');
    expect(out.status).toBe(200);
    expect(out.headers['content-length']).toBe(String(content.length));
    expect(Buffer.from(out.body!, 'base64')).toEqual(content);
  });

  it('ignores other actions', async () => {
    expect(await pf.handleProjectFileAction('get_projects', {}, { method: 'GET' }, new FakeRes())).toBe(false);
  });
});

describe('access: staff only, folder closed to the web', () => {
  const listOf = (source: string, name: string) => {
    const block = source.match(new RegExp(`${name}\\s*=\\s*(?:new Set\\()?\\[([\\s\\S]*?)\\]`));
    if (!block) throw new Error(`${name} not found`);
    return [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  };

  it('is in no action list of either backend, so the default staff rule applies', () => {
    for (const source of [API_PHP, SECURITY_JS]) {
      for (const name of ['PUBLIC_ACTIONS', 'CUSTOMER_ACTIONS', 'ADMIN_ACTIONS']) {
        expect(listOf(source, name)).not.toContain('download_project_file');
      }
    }
    expect(pf.PROJECT_FILE_ACTIONS).toEqual(['download_project_file']);
  });

  it('both backends dispatch it only after the token check', () => {
    expect(API_PHP.indexOf('$authUser = authorize_request(')).toBeGreaterThan(0);
    expect(API_PHP.indexOf('handle_project_file_action($conn')).toBeGreaterThan(API_PHP.indexOf('$authUser = authorize_request('));
    expect(SERVER_JS.indexOf("app.use(['/api.php', '/api'], createAuthGate(pool))")).toBeGreaterThan(0);
    expect(SERVER_JS.indexOf('handleProjectFileAction(action')).toBeGreaterThan(SERVER_JS.indexOf('createAuthGate(pool)'));
  });

  it('the Node auth gate refuses guests and customers and lets staff through', async () => {
    const userRow = (role: string) => ({ id: 3, name: 'U', email: 'u@test', phone: '', role, status: 'active', avatar: '', password: 'hash' });
    const gate = async (role: string | null) => {
      const pool = { query: vi.fn(async () => [[userRow(role ?? 'user')]]) };
      const headers: Record<string, string> = role ? { authorization: `Bearer ${issueToken(userRow(role)).token}` } : {};
      const req = { method: 'GET', query: { action: 'download_project_file', path: `${DOC}a.pdf` }, headers, body: {} };
      const res = {
        statusCode: 200,
        body: undefined as unknown,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(body: unknown) {
          this.body = body;
          return this;
        },
      };
      const next = vi.fn();
      await createAuthGate(pool)(req, res, next);
      return { status: next.mock.calls.length ? 'next' : res.statusCode, body: res.body };
    };
    expect(TEST_ENV.AUTH_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(await gate(null)).toMatchObject({ status: 401, body: { code: 'UNAUTHORIZED' } });
    expect(await gate('customer')).toMatchObject({ status: 403, body: { code: 'FORBIDDEN' } });
    expect((await gate('user')).status).toBe('next');
    expect((await gate('admin')).status).toBe('next');
  });

  it('htaccess refuses the dokumen folder (any case, doubled slashes) but not logo/', () => {
    const rule = HTACCESS.match(/^\s*RewriteRule (\S*dokumen-client\S*) - \[F,L,NC\]\s*$/m);
    expect(rule).not.toBeNull();
    // Same syntax in PCRE and JS; per-directory paths have no leading slash
    const pattern = new RegExp(rule![1], 'i');
    for (const path of [
      'assets/dokumen-client/dokumen/doc_6a07571f15211_Brosur GNB.pdf', 'assets/dokumen-client/dokumen', 'assets/dokumen-client/dokumen/',
      'assets//dokumen-client//dokumen/a.pdf', '/assets/dokumen-client/dokumen/a.pdf', 'ASSETS/Dokumen-Client/DOKUMEN/a.pdf',
    ]) {
      expect(pattern.test(path), path).toBe(true);
    }
    for (const path of ['assets/dokumen-client/logo/project_2707f2b62ebf.jpg', 'assets/dokumen-client/dokumen-lama/a.pdf', 'api.php', 'index.html', 'assets/product/a.webp']) {
      expect(pattern.test(path), path).toBe(false);
    }
    // Before the SPA fallback, inside the mod_rewrite block
    const at = HTACCESS.indexOf(rule![0]);
    expect(at).toBeGreaterThan(HTACCESS.indexOf('RewriteEngine On'));
    expect(at).toBeLessThan(HTACCESS.indexOf('RewriteRule ^ index.html [L]'));
  });

  it('nginx refuses the dokumen folder before the static/image locations', () => {
    expect(NGINX).toMatch(/location \^~ \/assets\/dokumen-client\/dokumen\/ \{\s*return 403;\s*\}/);
    expect(NGINX).toMatch(/location = \/assets\/dokumen-client\/dokumen \{\s*return 403;\s*\}/);
    expect(NGINX).not.toMatch(/^\s*location[^{\n]*dokumen-client\/logo/m);
  });
});

describe('s3-client: project files are private objects', () => {
  type S3Module = typeof import('../../backend/s3-client.js');
  let s3: S3Module;
  beforeAll(async () => {
    s3 = await vi.importActual<S3Module>('../../backend/s3-client.js');
  });
  beforeEach(() => s3Send.mockReset());
  const sent = () => s3Send.mock.calls.map(([cmd]) => ({ type: cmd.constructor.name, ...cmd.input }));

  it('uploads dokumen-client/dokumen with ACL private and stores the site path', async () => {
    s3Send.mockResolvedValue({});
    const path = await s3.uploadBase64ToS3(`data:application/pdf;base64,${PDF.toString('base64')}`, 'dokumen-client/dokumen', 'doc_1_abc_Brosur GNB.pdf');
    expect(path).toMatch(/^\/assets\/dokumen-client\/dokumen\/doc_1_abc_Brosur_GNB_\d+_[a-z0-9]+\.pdf$/);
    expect(sent()).toEqual([expect.objectContaining({ type: 'PutObjectCommand', Key: path.slice(1), ACL: 'private', ContentType: 'application/pdf' })]);
  });

  it('keeps project images public', async () => {
    s3Send.mockResolvedValue({});
    const url = await s3.uploadBase64ToS3('data:image/png;base64,iVBORw0KGgo=', 'dokumen-client/logo', 'project.png');
    expect(url).toMatch(/^https:\/\/s3\.test\/bucket\/assets\/dokumen-client\/logo\/project_\d+_[a-z0-9]+\.png$/);
    expect(sent()[0]).toMatchObject({ type: 'PutObjectCommand', ACL: 'public-read' });
  });

  it('reads objects and maps a missing key to null', async () => {
    const body = Readable.from(['x']);
    s3Send.mockResolvedValueOnce({ Body: body, ContentLength: 1 });
    expect(await s3.getFromS3('assets/dokumen-client/dokumen/a.pdf')).toEqual({ body, size: 1 });
    expect(sent()[0]).toMatchObject({ type: 'GetObjectCommand', Key: 'assets/dokumen-client/dokumen/a.pdf' });
    s3Send.mockRejectedValueOnce(Object.assign(new Error('missing'), { name: 'NoSuchKey' }));
    expect(await s3.getFromS3('assets/dokumen-client/dokumen/b.pdf')).toBeNull();
    s3Send.mockRejectedValueOnce(Object.assign(new Error('down'), { name: 'InternalError', $metadata: { httpStatusCode: 500 } }));
    await expect(s3.getFromS3('assets/dokumen-client/dokumen/c.pdf')).rejects.toThrow('down');
  });
});

// ── PHP: the real module behind `php -S`, with api.php's error handler and response headers ──
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo "ok";'], { encoding: 'utf8' }).stdout === 'ok';

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
function public_dir() { return getenv('PF_PUBLIC_DIR'); }
require getenv('PF_MODULE');
set_exception_handler(function ($e) {
    http_response_code($e instanceof ApiError ? $e->status : 500);
    $body = ['error' => $e->getMessage()];
    if ($e instanceof ApiError && $e->errorCode) $body['code'] = $e->errorCode;
    echo json_encode($body);
});
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = [];
if ($_SERVER['REQUEST_METHOD'] === 'GET') $input = $input + $_GET;
$action = $input['action'] ?? $_GET['action'] ?? '';
if (!handle_project_file_action(mysqli_init(), $action, $input, ['id' => 1, 'role' => 'user'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid action']);
}
`;
}

async function freePort(): Promise<number> {
  return new Promise((ok, fail) => {
    const server = createServer();
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => ok(port));
    });
  });
}

describe.skipIf(!PHP_AVAILABLE)('download_project_file PHP ↔ Node parity', () => {
  let php: ChildProcess | null = null;
  let harnessDir = '';
  let base = '';

  beforeAll(async () => {
    harnessDir = mkdtempSync(join(tmpdir(), 'gn-project-files-php-'));
    writeFileSync(join(harnessDir, 'router.php'), buildHarness());
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    php = spawn('php', ['-S', `127.0.0.1:${port}`, join(harnessDir, 'router.php')], {
      env: { ...process.env, PF_MODULE: join(ROOT, 'backend', 'modules', 'project_files.php'), PF_PUBLIC_DIR: webRoot },
      stdio: 'ignore',
    });
    for (let i = 0; i < 100; i++) {
      try {
        await fetch(`${base}/`);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error('php -S did not start');
  }, 20_000);
  afterAll(() => {
    php?.kill();
    if (harnessDir) rmSync(harnessDir, { recursive: true, force: true });
  });

  async function runPhp(input: Record<string, unknown>, method: 'GET' | 'POST'): Promise<Outcome> {
    const query = new URLSearchParams({ action: 'download_project_file' });
    if (method === 'GET') for (const [k, v] of Object.entries(input)) query.set(k, String(v));
    const res = await fetch(`${base}/api.php?${query}`, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? JSON.stringify({ ...input, action: 'download_project_file' }) : undefined,
    });
    const bytes = Buffer.from(await res.arrayBuffer());
    if ((res.headers.get('content-type') || '').startsWith('application/json')) {
      return { status: res.status, headers: {}, json: JSON.parse(bytes.toString('utf8')) };
    }
    const headers = Object.fromEntries(DOWNLOAD_HEADERS.map((h) => [h, res.headers.get(h) ?? undefined]));
    return { status: res.status, headers: headers as Record<string, string>, body: bytes.toString('base64') };
  }

  const paths = [
    ...Object.keys(FILES).filter((name) => !name.startsWith('.')).map((name) => `${DOC}${name}`),
    `${DOC}.htaccess`, `${DOC}sub/inner.pdf`, `${DOC}../logo/project_x.jpg`, `${DOC}..%2F..%2Fsecret.txt`, `${DOC}..\\..\\secret.txt`,
    `${DOC}C:secret.txt`, `${DOC}tidak-ada.pdf`, '/assets/dokumen-client/logo/project_x.jpg', `/x${DOC}a.pdf`, '',
  ];

  it.each(paths.flatMap((path) => (['GET', 'POST'] as const).map((method) => [method, path] as const)))('%s %s', async (method, path) => {
    const node = await runNode({ path }, method);
    const phpOut = await runPhp({ path }, method);
    expect(phpOut).toEqual(node);
  });

  it('does not follow a link out of the folder', async (ctx) => {
    if (!symlinkMade) ctx.skip();
    expect(await runPhp({ path: `${DOC}link.txt` }, 'POST')).toMatchObject({ status: 404, json: { code: 'NOT_FOUND' } });
  });

  it('POST without path and with a non-string path', async () => {
    for (const input of [{}, { path: ['x'] }, { path: 5 }]) {
      expect(await runPhp(input, 'POST')).toEqual(await runNode(input, 'POST'));
    }
  });
});
