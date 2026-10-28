// @vitest-environment node
// Node environment: backend/s3-client.js imports @aws-sdk/client-s3 and security.js bcryptjs, which only
// backend/node_modules has; both are mocked below (the real s3-client runs against a fake bucket).
//
// Projects of the home page (#projects, setting portfolio_data): upload_project_image (JSON data URI, raster images
// only), upload_project_video (raw body, hm_store_video/storeRawVideo of the hero module), the normalization of the new
// project fields in update_settings (description, tools, url, gallery, video; old fields saved as sent) and the
// garbage-collect sweep of assets/projects/. backend/modules/portfolio_media.js and portfolio_media.php must answer the
// same; the PHP half runs the real module in the CLI and behind `php -S` (php://input is only real over HTTP), and is
// skipped without `php`. The frontend reader (src/components/sections/projects/portfolio.ts) cleans the same way.
// data: covers of older admin pages become files (project_<SHA-256 prefix>.<ext>) so get_settings, and with it every
// prerendered page, no longer carries base64 images.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';

const { s3Send, fakeS3Sdk } = vi.hoisted(() => {
  // security.js and s3-client.js read these when they are imported
  Object.assign(process.env, {
    AUTH_SECRET: 'p'.repeat(16) + Math.random().toString(36).slice(2).padEnd(24, 'q'),
    S3_ACCESS_KEY: 'test-access',
    S3_SECRET_KEY: 'test-secret',
    S3_PUBLIC_URL: 'https://s3.test/bucket',
    UPLOAD_MAX_IMAGE_MB: '1',
    UPLOAD_MAX_VIDEO_MB: '0.01',
  });
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
      HeadObjectCommand: class HeadObjectCommand extends Command {},
      ListObjectsV2Command: class ListObjectsV2Command extends Command {},
    };
  };
  return { s3Send, fakeS3Sdk };
});

vi.mock('@aws-sdk/client-s3', () => fakeS3Sdk());
vi.mock('../../backend/node_modules/@aws-sdk/client-s3', () => fakeS3Sdk());
vi.mock('bcryptjs', () => ({ default: { hashSync: () => 'dummy', compare: async () => false, hash: async () => 'dummy' } }));

import * as pm from '../../backend/modules/portfolio_media.js';
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_MAX_GALLERY,
  PROJECT_MAX_TOOLS,
  PROJECT_TOOL_MAX,
  PROJECT_URL_MAX,
  projectDescription,
  projectTools,
  projectUrl,
} from '../../src/components/sections/projects/portfolio';

const ROOT = resolve(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8');
const API_PHP = read('backend', 'api.php');
const SERVER_JS = read('backend', 'server.js');
const SECURITY_JS = read('backend', 'security.js');

const S3 = 'https://s3.test/bucket';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const TYPE_ERROR = 'Gambar proyek harus JPG, PNG, WEBP, atau GIF.';
const DATA_IMAGE_ERROR = 'Gambar detail proyek harus diunggah lewat upload_project_image.';
const DATA_VIDEO_ERROR = 'Video proyek harus diunggah lewat upload_project_video.';
const VIDEO_TYPE_ERROR = 'Hanya video MP4 atau WebM yang diizinkan.';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// ── Fixtures ──
const PNG = Buffer.concat([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), Buffer.alloc(32, 1)]);
const JPEG = Buffer.concat([Buffer.from('ffd8ffe000104a46494600', 'hex'), Buffer.alloc(32, 2)]);
const WEBP = Buffer.concat([Buffer.from('RIFF', 'latin1'), Buffer.from([40, 0, 0, 0]), Buffer.from('WEBPVP8 ', 'latin1'), Buffer.alloc(32, 3)]);
const GIF = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(32, 4)]);
const ICO = Buffer.concat([Buffer.from([0, 0, 1, 0, 1, 0]), Buffer.alloc(32, 5)]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
const RANDOM = Buffer.from(Array.from({ length: 64 }, (_, i) => (i * 73 + 41) % 256));
const dataUri = (bytes: Buffer, mime = 'image/png') => `data:${mime};base64,${bytes.toString('base64')}`;
const mp4 = (payload = 64) =>
  Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom', 'latin1'), Buffer.from([0, 0, 2, 0]), Buffer.from('isomiso2', 'latin1'), Buffer.alloc(payload, 0x11)]);

// update_settings cases: portfolio_data items sent (and stored), and what both backends save
type Case = { name: string; sent: unknown[]; stored?: unknown[]; expected: unknown[] };
const PATH = '/assets/projects/project_0123456789ab.jpg';
const VIDEO = '/assets/projects/project_video_0123456789ab.mp4';
const CASES: Case[] = [
  {
    name: 'old entries are saved as sent (cover link, span, unknown keys)',
    sent: [{ title: 'Web App Dashboard', desc: 'SAAS / FINANCE', image: '/assets/portofolio/portfolio1.png', span: 'md:col-span-12', extra: { a: 1, b: [] } }],
    expected: [{ title: 'Web App Dashboard', desc: 'SAAS / FINANCE', image: '/assets/portofolio/portfolio1.png', span: 'md:col-span-12', extra: { a: 1, b: [] } }],
  },
  {
    name: 'the new fields are cleaned',
    sent: [
      {
        title: 'Mobile POS App',
        desc: 'RETAIL / ANDROID',
        image: PATH,
        description: '\u0000  Kasir Android.\r\nStruk\tBluetooth.\rSelesai \u0007 ',
        tools: ['  React   JS ', 'react js', '', 7, 'Laravel', 'x'.repeat(45), '\u0001Vue\n', 'LARAVEL'],
        url: ' POS.contoh.com/demo?a=1 ',
        gallery: [` ${PATH} `, 'javascript:alert(1)', '', 5, 'https://cdn.test/a.png', ' \u0001vbscript:x'],
        video: ` ${VIDEO} `,
      },
    ],
    expected: [
      {
        title: 'Mobile POS App',
        desc: 'RETAIL / ANDROID',
        image: PATH,
        description: 'Kasir Android.\nStruk\tBluetooth.\nSelesai',
        tools: ['React JS', 'Laravel', 'x'.repeat(40), 'Vue'],
        url: 'https://POS.contoh.com/demo?a=1',
        gallery: [PATH, 'https://cdn.test/a.png'],
        video: VIDEO,
      },
    ],
  },
  {
    name: 'empty and wrongly typed new fields are dropped',
    sent: [
      { title: 'A', image: '/a.jpg', description: '  \r\n ', tools: 'React', url: 'javascript:alert(1)', gallery: { a: '/x.jpg' }, video: 5 },
      { title: 'B', image: '/b.jpg', description: 3, tools: [], gallery: [], url: '', video: '' },
      { title: 'C', image: '/c.jpg', tools: { 0: 'React' }, url: 'ftp://contoh.com', video: 'javascript:alert(1)' },
    ],
    expected: [
      { title: 'A', image: '/a.jpg' },
      { title: 'B', image: '/b.jpg' },
      { title: 'C', image: '/c.jpg' },
    ],
  },
  {
    name: 'limits: 12 tools, 12 gallery images, 3000 characters (code points), URLs up to 500 characters',
    sent: [
      {
        title: 'A',
        image: '/a.jpg',
        tools: Array.from({ length: 20 }, (_, i) => `Tool ${i}`),
        gallery: Array.from({ length: 15 }, (_, i) => `/g${i}.jpg`),
        description: '😀'.repeat(3001),
        url: `https://contoh.com/${'a'.repeat(482)}`,
      },
      { title: 'B', image: '/b.jpg', description: `${'é'.repeat(2999)} b`, url: `https://contoh.com/${'a'.repeat(481)}` },
    ],
    expected: [
      {
        title: 'A',
        image: '/a.jpg',
        tools: Array.from({ length: 12 }, (_, i) => `Tool ${i}`),
        gallery: Array.from({ length: 12 }, (_, i) => `/g${i}.jpg`),
        description: '😀'.repeat(3000),
      },
      // Cut after 3000 characters, then trimmed again
      { title: 'B', image: '/b.jpg', description: 'é'.repeat(2999), url: `https://contoh.com/${'a'.repeat(481)}` },
    ],
  },
  {
    name: 'legacy: an empty image keeps the stored image at the same position; non-objects stay',
    sent: [{ title: 'A', image: '' }, { title: 'B' }, 'teks', null, [1, 2], {}],
    stored: [{ title: 'A', image: '/a.jpg' }, { title: 'B', image: '/b.jpg' }],
    expected: [{ title: 'A', image: '/a.jpg' }, { title: 'B', image: '/b.jpg' }, 'teks', null, [1, 2], {}],
  },
  {
    name: 'unicode names and every allowed URL character',
    sent: [{ title: 'Sistem Informasi Desa', image: '/x.jpg', tools: ['Next.js', 'C#', 'Node.js ⚡', 'Ásp'], url: 'HTTP://desa.go.id:8080/~admin/a_b-c.d?x=[1]&y=(2)*,;=!$@%20#frag' }],
    expected: [{ title: 'Sistem Informasi Desa', image: '/x.jpg', tools: ['Next.js', 'C#', 'Node.js ⚡', 'Ásp'], url: 'http://desa.go.id:8080/~admin/a_b-c.d?x=[1]&y=(2)*,;=!$@%20#frag' }],
  },
];

// Refused before anything is saved: [sent items, error]
const REFUSED: [unknown[], string][] = [
  [[{ title: 'A', image: '/a.jpg', gallery: ['/ok.jpg', 'data:image/png;base64,AAAA'] }], DATA_IMAGE_ERROR],
  [[{ title: 'A', image: '/a.jpg', gallery: [' \u0001DATA:image/png;base64,AAAA'] }], DATA_IMAGE_ERROR],
  [[{ title: 'A', image: '/a.jpg', video: 'data:video/mp4;base64,AAAA' }], DATA_VIDEO_ERROR],
];

// data: covers: [sent, stored] and what is saved, for a URL base ('' = PHP's /assets/..., S3 = Node's object URL). The
// cover becomes project_<first 12 hex of the SHA-256 of its bytes>.<sniffed ext>, also when it comes from the stored item
// (legacy empty image); the same cover twice gives one name.
const coverName = (bytes: Buffer, ext: string) => `project_${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}.${ext}`;
const COVER_SENT = [
  { title: 'Web App Dashboard', desc: 'SAAS / FINANCE', image: dataUri(JPEG, 'image/jpeg'), span: 'md:col-span-4' },
  { title: 'Mobile POS App', image: ` ${dataUri(WEBP, 'image/webp')}\n`, tools: [' Kotlin '] },
  { title: 'E-Commerce System', image: '' },
  { title: 'Sama', image: dataUri(JPEG, 'image/jpeg') },
  { title: 'GIF', image: dataUri(GIF, 'image/png') },
  { title: 'Berkas', image: PATH },
  'teks',
];
const COVER_STORED = [{ title: 'x' }, { title: 'y' }, { title: 'E-Commerce System', image: dataUri(PNG) }];
const COVER_FILES: [string, Buffer][] = [
  [coverName(JPEG, 'jpg'), JPEG],
  [coverName(WEBP, 'webp'), WEBP],
  [coverName(PNG, 'png'), PNG],
  [coverName(GIF, 'gif'), GIF],
];
const coverSaved = (base: string) => [
  { title: 'Web App Dashboard', desc: 'SAAS / FINANCE', image: `${base}/assets/projects/${coverName(JPEG, 'jpg')}`, span: 'md:col-span-4' },
  { title: 'Mobile POS App', image: `${base}/assets/projects/${coverName(WEBP, 'webp')}`, tools: ['Kotlin'] },
  { title: 'E-Commerce System', image: `${base}/assets/projects/${coverName(PNG, 'png')}` },
  { title: 'Sama', image: `${base}/assets/projects/${coverName(JPEG, 'jpg')}` },
  { title: 'GIF', image: `${base}/assets/projects/${coverName(GIF, 'gif')}` },
  { title: 'Berkas', image: PATH },
  'teks',
];

// data: covers the upload checks refuse: [sent, stored, error]. Nothing is written, not even the valid covers before them
const COVER_REFUSED: [unknown[], unknown[] | null, string][] = [
  [[{ title: 'A', image: PATH }, { title: 'B', image: dataUri(SVG, 'image/svg+xml') }], null, `Proyek ke-2: ${TYPE_ERROR}`],
  [[{ title: 'A', image: dataUri(ICO, 'image/x-icon') }], null, `Proyek ke-1: ${TYPE_ERROR}`],
  [[{ title: 'A', image: dataUri(Buffer.concat([PNG, Buffer.alloc(1024 * 1024)])) }], null, 'Proyek ke-1: Ukuran gambar maksimal 1 MB.'],
  [[{ title: 'A', image: 'data:image/png,iVBORw0KGgo=' }], null, 'Proyek ke-1: Format file tidak valid.'],
  [[{ title: 'A', image: '' }], [{ title: 'A', image: 'data:image/png;base64,AAAA' }], `Proyek ke-1: ${TYPE_ERROR}`],
  [[{ title: 'A', image: dataUri(PNG) }, { title: 'B', image: dataUri(RANDOM) }], null, `Proyek ke-2: ${TYPE_ERROR}`],
  [[{ title: 'A', image: dataUri(PNG) }, { title: 'B', image: PATH, gallery: [dataUri(PNG)] }], null, DATA_IMAGE_ERROR],
];

// portfolio_data values that are saved exactly as sent, without reading the stored value
const AS_SENT: unknown[] = ['{"a":1}', 'bukan json', '', '"teks"', 'null', '7', 42, ['x'], null];

// upload_project_image: [name, request body, expected status, expected error (or stored extension)]
const IMAGE_CASES: [string, Record<string, unknown>, number, string][] = [
  ['png', { data: dataUri(PNG) }, 200, 'png'],
  ['jpeg with spaces around', { data: `  ${dataUri(JPEG, 'image/jpeg')}\n` }, 200, 'jpg'],
  ['webp', { data: dataUri(WEBP, 'image/webp') }, 200, 'webp'],
  ['gif', { data: dataUri(GIF, 'image/gif') }, 200, 'gif'],
  ['png sent as image/jpeg', { data: dataUri(PNG, 'image/jpeg') }, 200, 'png'],
  ['svg', { data: dataUri(SVG, 'image/svg+xml') }, 400, TYPE_ERROR],
  ['ico', { data: dataUri(ICO, 'image/x-icon') }, 400, TYPE_ERROR],
  ['random bytes', { data: dataUri(RANDOM) }, 400, TYPE_ERROR],
  ['too large', { data: dataUri(Buffer.concat([PNG, Buffer.alloc(1024 * 1024)])) }, 400, 'Ukuran gambar maksimal 1 MB.'],
  ['not base64', { data: 'data:image/png,iVBORw0KGgo=' }, 400, 'Format file tidak valid.'],
  ['a path', { data: '/assets/projects/project_0123456789ab.png' }, 400, 'Format file tidak valid.'],
  ['empty', { data: '' }, 400, 'Format file tidak valid.'],
  ['not a string', { data: 7 }, 400, 'Format file tidak valid.'],
  ['missing', { action: 'upload_project_image' }, 400, 'Format file tidak valid.'],
];

// ── Node: fake bucket, response, database ──
const bucket = new Map<string, { modified?: Date }>();
const putObject = (name: string, age: number | null) =>
  bucket.set(`assets/projects/${name}`, { modified: age === null ? undefined : new Date(Date.now() - age) });
const projectNames = () => [...bucket.keys()].map((key) => key.replace(/^assets\/projects\//, '')).sort();
async function fakeS3(cmd: { constructor: { name: string }; input: Record<string, unknown> }) {
  const key = String(cmd.input.Key);
  switch (cmd.constructor.name) {
    case 'PutObjectCommand':
      bucket.set(key, { modified: new Date() });
      return {};
    case 'DeleteObjectCommand':
      bucket.delete(key);
      return {};
    case 'ListObjectsV2Command': {
      const keys = [...bucket.keys()].filter((k) => k.startsWith(String(cmd.input.Prefix))).sort();
      return { Contents: keys.map((Key) => ({ Key, LastModified: bucket.get(Key)?.modified })), IsTruncated: false };
    }
    default:
      return {};
  }
}

class FakeRes {
  statusCode = 200;
  headers: Record<string, string> = {};
  body: unknown = undefined;
  headersSent = false;
  status(code: number) {
    this.statusCode = code;
    return this;
  }
  set(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
    return this;
  }
  json(body: unknown) {
    this.body = body;
    this.headersSent = true;
    return this;
  }
}

class FakeReq extends Readable {
  headers: Record<string, string>;
  method = 'POST';
  query = { action: 'upload_project_video' };
  body: unknown = {};
  parts: Buffer[];
  constructor(parts: Buffer[], headers: Record<string, string> = {}) {
    super();
    this.parts = [...parts];
    this.headers = headers;
  }
  _read() {
    this.push(this.parts.shift() ?? null);
  }
}

type Store = Record<string, string>;
function fakePool(initial: Store = {}) {
  const store: Store = { ...initial };
  const queries: string[] = [];
  const query = vi.fn(async (sql: string) => {
    queries.push(sql);
    const keys = [...sql.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    return [keys.filter((k) => Object.hasOwn(store, k)).map((k) => ({ setting_key: k, setting_value: store[k] }))];
  });
  return { store, queries, query };
}

type Outcome = { status: number; settings?: Record<string, unknown>; error?: string };
async function prepareNode(settings: Record<string, unknown>, stored: Store = {}): Promise<Outcome & { queries: string[] }> {
  const pool = fakePool(stored);
  try {
    await pm.preparePortfolioSettings(settings, pool);
    return { status: 200, settings, queries: pool.queries };
  } catch (err) {
    const e = err as { status?: number; message: string };
    return { status: e.status ?? 500, error: e.message, queries: pool.queries };
  }
}

async function callNode(action: string, req: unknown, pool = fakePool()) {
  const res = new FakeRes();
  const handled = await pm.handlePortfolioMediaAction(action, req, res, pool);
  return { handled, status: res.statusCode, body: res.body as Record<string, unknown> };
}
const imageReq = (body: Record<string, unknown>, method = 'POST') => ({ method, body, headers: { 'content-type': 'application/json' }, query: {} });
const nodeImage = async (body: Record<string, unknown>) => {
  const { status, body: reply } = await callNode('upload_project_image', imageReq(body));
  return status === 200 ? { status, url: String(reply.url) } : { status, error: String(reply.error) };
};

const sent = () => s3Send.mock.calls.map(([cmd]) => ({ type: cmd.constructor.name as string, ...(cmd.input as Record<string, unknown>) }));
const puts = () => sent().filter((c) => c.type === 'PutObjectCommand');

beforeEach(() => {
  bucket.clear();
  s3Send.mockReset();
  s3Send.mockImplementation(fakeS3);
});

// The files of the sweep cases: [name, age, referenced by the stored portfolio_data, kept]
const SWEEP_FILES: [string, number, boolean][] = [
  ['project_0123456789ab.jpg', 2 * DAY, true],
  ['project_00000000000a.png', 2 * DAY, true],
  ['project_video_0123456789ab.mp4', 2 * DAY, true],
  ['project_111111111111.webp', 2 * DAY, false],
  ['project_222222222222.jpg', HOUR, true],
  ['project_video_333333333333.webm', 2 * DAY, false],
  ['project_logo.png', 2 * DAY, true],
  ['project_0123456789ab.svg', 2 * DAY, true],
  ['project_video_0123456789ab.mov', 2 * DAY, true],
];
// Referenced by name whatever the host, folder or query string (a changed S3_PUBLIC_URL never costs the files)
const SWEEP_STORE: Store = {
  portfolio_data: JSON.stringify([
    { title: 'A', image: 'https://cdn.example/assets/projects/project_0123456789ab.jpg?v=2', gallery: ['/assets/projects/project_00000000000a.png', 7] },
    { title: 'B', image: 'data:image/png;base64,AAAA', video: ' https://s3.old/bucket//assets/projects/project_video_0123456789ab.mp4#t=1 ' },
    'teks',
  ]),
};
// Sent by the sweep-after-save cases: the sweep reads the stored value, not this
const SWEEP_SENT = JSON.stringify([{ title: 'A', image: '/a.jpg' }]);
const keptAfterSweep = SWEEP_FILES.filter(([, , kept]) => kept).map(([name]) => name).sort();

describe('update_settings portfolio_data (Node)', () => {
  it.each(CASES)('$name', async ({ sent: items, stored, expected }) => {
    const out = await prepareNode({ portfolio_data: JSON.stringify(items), hero_title: 'x' }, stored ? { portfolio_data: JSON.stringify(stored) } : {});
    expect(out.status).toBe(200);
    expect(JSON.parse(String(out.settings?.portfolio_data))).toEqual(expected);
    expect(out.settings?.hero_title).toBe('x');
  });

  it('refuses data: gallery images and videos with 400 before anything is saved', async () => {
    for (const [items, error] of REFUSED) {
      const settings = { portfolio_data: JSON.stringify(items) };
      const out = await prepareNode(settings);
      expect(out).toMatchObject({ status: 400, error });
      expect(settings.portfolio_data).toBe(JSON.stringify(items));
    }
  });

  it('stores data: covers on S3 under a name from their content and saves the URL instead', async () => {
    const out = await prepareNode({ portfolio_data: JSON.stringify(COVER_SENT) }, { portfolio_data: JSON.stringify(COVER_STORED) });
    expect(out.status).toBe(200);
    expect(JSON.parse(String(out.settings?.portfolio_data))).toEqual(coverSaved(S3));
    // In project order; the second "Sama" writes the same object again
    const written = puts();
    expect(written.map((put) => put.Key)).toEqual([0, 1, 2, 0, 3].map((i) => `assets/projects/${COVER_FILES[i][0]}`));
    for (const put of written) {
      const [name, bytes] = COVER_FILES.find(([file]) => put.Key === `assets/projects/${file}`)!;
      expect(Buffer.from(put.Body as Buffer), name).toEqual(bytes);
      expect(put).toMatchObject({ ContentType: `image/${name.endsWith('.jpg') ? 'jpeg' : name.split('.').pop()}`, ACL: 'public-read', CacheControl: IMMUTABLE });
    }
  });

  it('refuses data: covers the upload checks refuse, naming the project, before anything is written', async () => {
    for (const [items, stored, error] of COVER_REFUSED) {
      const settings = { portfolio_data: JSON.stringify(items) };
      const out = await prepareNode(settings, stored ? { portfolio_data: JSON.stringify(stored) } : {});
      expect(out).toMatchObject({ status: 400, error });
      expect(settings.portfolio_data).toBe(JSON.stringify(items));
    }
    expect(puts()).toEqual([]);
  });

  it('saves anything that is not a string holding a JSON array as sent, without reading the stored value', async () => {
    for (const value of AS_SENT) {
      const out = await prepareNode({ portfolio_data: value });
      expect(out.settings?.portfolio_data).toEqual(value);
      expect(out.queries).toEqual([]);
    }
    expect((await prepareNode({ hero_title: 'x' })).queries).toEqual([]);
  });

  it('a stored value that is not a JSON array gives no legacy images', async () => {
    const out = await prepareNode({ portfolio_data: JSON.stringify([{ title: 'A', image: '' }]) }, { portfolio_data: 'rusak' });
    expect(JSON.parse(String(out.settings?.portfolio_data))).toEqual([{ title: 'A', image: '' }]);
  });

  it('the frontend reader cleans tools, URLs and descriptions the same way, with the same limits', () => {
    expect([pm.MAX_GALLERY, pm.MAX_TOOLS, pm.TOOL_MAX, pm.DESCRIPTION_MAX, pm.URL_MAX]).toEqual([
      PROJECT_MAX_GALLERY, PROJECT_MAX_TOOLS, PROJECT_TOOL_MAX, PROJECT_DESCRIPTION_MAX, PROJECT_URL_MAX,
    ]);
    for (const { sent: items } of CASES) {
      for (const item of items) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const { tools, url, description } = item as Record<string, unknown>;
        if (Array.isArray(tools)) expect(projectTools(tools)).toEqual(pm.projectTools(tools));
        if (typeof url === 'string') expect(projectUrl(url)).toBe(pm.projectUrl(url));
        if (typeof description === 'string') expect(projectDescription(description)).toBe(pm.projectText(description));
      }
    }
  });

  it('runs the sweep only after a successful save', async () => {
    for (const [name, age] of SWEEP_FILES) putObject(name, age);
    const pool = fakePool(SWEEP_STORE);
    const finish = await pm.preparePortfolioSettings({ portfolio_data: SWEEP_SENT }, pool);
    await finish(false);
    expect(projectNames()).toHaveLength(SWEEP_FILES.length);
    await finish(true);
    expect(projectNames()).toEqual(keptAfterSweep);
  });
});

describe('upload_project_image / upload_project_video (Node)', () => {
  it('stores raster images on S3 as assets/projects/project_<12 hex>.<ext>, public and cached for a year', async () => {
    const out = await callNode('upload_project_image', imageReq({ data: dataUri(PNG) }));
    expect(out.handled).toBe(true);
    const [put] = puts();
    expect(put.Key).toMatch(/^assets\/projects\/project_[0-9a-f]{12}\.png$/);
    expect(put).toMatchObject({ ContentType: 'image/png', ACL: 'public-read', CacheControl: IMMUTABLE });
    expect(Buffer.from(put.Body as Buffer)).toEqual(PNG);
    expect(out.body).toEqual({ success: true, url: `${S3}/${put.Key}` });
  });

  it.each(IMAGE_CASES)('image: %s', async (_name, body, status, expected) => {
    const out = await nodeImage(body);
    expect(out.status).toBe(status);
    if (status === 200) expect(out.url).toMatch(new RegExp(`^${S3}/assets/projects/project_[0-9a-f]{12}\\.${expected}$`));
    else expect(out.error).toBe(expected);
  });

  it('streams a raw video to assets/projects/project_video_<12 hex>.<ext> with the hero video checks', async () => {
    const video = mp4();
    const out = await callNode('upload_project_video', new FakeReq([video], { 'content-type': 'video/mp4', 'content-length': String(video.length) }));
    const [put] = puts();
    expect(put.Key).toMatch(/^assets\/projects\/project_video_[0-9a-f]{12}\.mp4$/);
    expect(put).toMatchObject({ ContentType: 'video/mp4', CacheControl: IMMUTABLE });
    expect(out.body).toEqual({ success: true, url: `${S3}/${put.Key}` });

    expect((await callNode('upload_project_video', new FakeReq([PNG], { 'content-type': 'video/mp4' }))).body).toEqual({ error: VIDEO_TYPE_ERROR });
    const big = await callNode('upload_project_video', new FakeReq([mp4(20_000)], { 'content-type': 'video/mp4' }));
    expect(big).toMatchObject({ status: 413, body: { error: 'Ukuran video maksimal 0.01 MB.' } });
  });

  it('runs the sweep after an upload; ignores other actions and GET', async () => {
    for (const [name, age] of SWEEP_FILES) putObject(name, age);
    const pool = fakePool(SWEEP_STORE);
    await callNode('upload_project_image', imageReq({ data: dataUri(JPEG, 'image/jpeg') }), pool);
    const [put] = puts();
    expect(projectNames()).toEqual([...keptAfterSweep, String(put.Key).replace('assets/projects/', '')].sort());

    expect((await callNode('upload_project_image', imageReq({ data: dataUri(PNG) }, 'GET'))).handled).toBe(false);
    expect((await callNode('upload_hero_video', imageReq({}))).handled).toBe(false);
  });

  it('the sweep keeps everything while the stored portfolio_data is not a JSON array, and objects without a date', async () => {
    for (const [name, age] of SWEEP_FILES) putObject(name, age);
    putObject('project_999999999999.jpg', null);
    await pm.sweepPortfolioMedia(fakePool({ portfolio_data: '{"rusak"' }));
    expect(projectNames()).toHaveLength(SWEEP_FILES.length + 1);
    // No row: nothing is referenced
    await pm.sweepPortfolioMedia(fakePool());
    expect(projectNames()).toEqual(['project_222222222222.jpg', 'project_0123456789ab.svg', 'project_999999999999.jpg', 'project_logo.png', 'project_video_0123456789ab.mov'].sort());
  });
});

describe('access, wiring and deploy config', () => {
  it('both actions are in no action list of either backend, so the default staff rule applies (like update_settings)', () => {
    const phpLists = API_PHP.slice(API_PHP.indexOf('const PUBLIC_ACTIONS'), API_PHP.indexOf('const STAFF_ROLES'));
    const jsLists = SECURITY_JS.slice(SECURITY_JS.indexOf('export const PUBLIC_ACTIONS'), SECURITY_JS.indexOf('export const ADMIN_ACTIONS') + 4000);
    for (const action of pm.PORTFOLIO_MEDIA_ACTIONS) {
      expect(phpLists).not.toContain(`'${action}'`);
      expect(jsLists).not.toContain(`'${action}'`);
    }
  });

  it('api.php reads upload_project_video as a raw body and dispatches after the token check; update_settings normalizes and sweeps', () => {
    expect(API_PHP).toContain("$rawBody = in_array($_GET['action'] ?? '', ['upload_hero_video', 'upload_project_video'], true);");
    expect(API_PHP).toContain("require_once __DIR__ . '/modules/portfolio_media.php';");
    expect(API_PHP.indexOf('if (handle_portfolio_media_action($conn, $action, $input, $authUser)) {')).toBeGreaterThan(
      API_PHP.indexOf('$authUser = authorize_request($conn, $action, $input);'),
    );
    const phpCase = API_PHP.slice(API_PHP.indexOf("case 'update_settings':"), API_PHP.indexOf("case 'get_projects':"));
    expect(phpCase.indexOf('$finishPortfolio = portfolio_prepare_settings($conn, $settings);')).toBeGreaterThan(phpCase.indexOf('try {'));
    expect(phpCase.indexOf('$finishPortfolio(true);')).toBeGreaterThan(phpCase.indexOf('echo json_encode(["success" => true'));
    expect(phpCase).not.toContain("SELECT setting_value FROM hero_settings WHERE setting_key = 'portfolio_data'");

    const post = SERVER_JS.slice(SERVER_JS.indexOf("app.post('/api.php'"));
    expect(post.indexOf('if (await handlePortfolioMediaAction(actionOf(req), req, res, pool)) return;')).toBeGreaterThan(
      post.indexOf('if (await handleHeroMediaAction(actionOf(req), req, res, pool)) return;'),
    );
    const nodeCase = SERVER_JS.slice(SERVER_JS.indexOf("case 'update_settings':"), SERVER_JS.indexOf("case 'add_project':"));
    expect(nodeCase.indexOf('finishPortfolio = await preparePortfolioSettings(settings, pool);')).toBeGreaterThan(nodeCase.indexOf('try {'));
    expect(nodeCase.indexOf('await finishPortfolio(allSuccess);')).toBeGreaterThan(nodeCase.indexOf('res.json({ success: allSuccess'));
  });

  it('project uploads stay out of git and the deploy', () => {
    expect(read('.gitignore').split(/\r?\n/)).toContain('public/assets/projects/');
    expect(read('scripts', 'deploy-cpanel.mjs')).toMatch(/^const EXCLUDE = \[[^\]]*'assets\/projects'[^\]]*\];$/m);
  });
});

// ── PHP: the real module with api.php's helpers ──
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo extension_loaded("mysqli") ? "ok" : "no";'], { encoding: 'utf8' }).stdout === 'ok';
const HERO_PHP = join(ROOT, 'backend', 'modules', 'hero_media.php');
const MODULE_PHP = join(ROOT, 'backend', 'modules', 'portfolio_media.php');

function apiPhpBlock(pattern: string) {
  const match = API_PHP.match(new RegExp(`^${pattern}[\\s\\S]*?^}\\r?$`, 'm'));
  if (!match) throw new Error(`${pattern} not found in backend/api.php`);
  return match[0];
}
const API_HELPERS = [
  'class ApiError ',
  ...['env_value', 'upload_limit_bytes', 'sniff_image', 'safe_stem', 'svg_has_active_content', 'parse_upload', 'safe_link', 'delete_local_asset']
    .map((name) => `function ${name}\\(`),
].map(apiPhpBlock).join('\n');

// hero_settings in memory: answers SELECT ... WHERE setting_key IN ('a', 'b')
const DB_STUB = String.raw`
function db_all($conn, $sql, array $params = []) {
    $GLOBALS['__queries'][] = $sql;
    preg_match('/setting_key IN \(([^)]*)\)/', $sql, $in);
    preg_match_all("/'([a-z_]+)'/", $in[1] ?? '', $m);
    $rows = [];
    foreach ($m[1] as $key) {
        if (array_key_exists($key, $GLOBALS['__store'])) $rows[] = ['setting_key' => $key, 'setting_value' => $GLOBALS['__store'][$key]];
    }
    return $rows;
}
`;

const PRELUDE = String.raw`<?php
${API_HELPERS}
function public_dir() { return getenv('PM_PUBLIC_DIR'); }
${DB_STUB}
require getenv('HM_MODULE');
require getenv('PM_MODULE');
`;

const CLI_HARNESS = String.raw`${PRELUDE}
$req = json_decode(stream_get_contents(STDIN), true);
$GLOBALS['__queries'] = [];
$GLOBALS['__store'] = $req['store'] ?? [];
switch ($req['op']) {
    case 'prepare':
        $settings = $req['settings'];
        try {
            $finish = portfolio_prepare_settings(mysqli_init(), $settings);
            $out = ['status' => 200, 'settings' => $settings];
            if (!empty($req['save'])) $finish(true);
        } catch (ApiError $e) {
            $out = ['status' => $e->status, 'error' => $e->getMessage(), 'settings' => $settings];
        }
        $out['queries'] = $GLOBALS['__queries'];
        break;
    case 'image':
        if (isset($req['contentLength'])) $_SERVER['CONTENT_LENGTH'] = $req['contentLength'];
        try {
            $out = ['status' => 200, 'url' => pm_store_image($req['input'])];
        } catch (ApiError $e) {
            $out = ['status' => $e->status, 'error' => $e->getMessage()];
        }
        break;
    case 'sweep':
        pm_sweep(mysqli_init());
        $out = ['queries' => $GLOBALS['__queries']];
        break;
}
echo json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
`;

const ROUTER = String.raw`${PRELUDE}
$GLOBALS['__queries'] = [];
$GLOBALS['__store'] = [];
set_exception_handler(function ($e) {
    http_response_code($e instanceof ApiError ? $e->status : 500);
    echo json_encode(['error' => $e instanceof ApiError ? $e->getMessage() : 'Terjadi kesalahan pada server. Silakan coba lagi.']);
});
header('Content-Type: application/json');
$action = $_GET['action'] ?? '';
// Like api.php: no JSON read for the raw video upload
$input = $action === 'upload_project_video' ? [] : (json_decode((string)file_get_contents('php://input'), true) ?: []);
if (!handle_portfolio_media_action(mysqli_init(), $action, $input, ['id' => 1, 'role' => 'user'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid action: ' . $action]);
}
`;

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

describe.skipIf(!PHP_AVAILABLE)('portfolio media PHP ↔ Node parity', () => {
  let harnessDir = '';
  let webRoot = '';
  let php: ChildProcess | null = null;
  let base = '';
  const scratchDirs: string[] = [];
  const ENV = { HM_MODULE: HERO_PHP, PM_MODULE: MODULE_PHP, UPLOAD_MAX_IMAGE_MB: '1', UPLOAD_MAX_VIDEO_MB: '0.01' };

  const runCli = (request: Record<string, unknown>, publicDir = webRoot) => {
    const result = spawnSync('php', [join(harnessDir, 'cli.php')], {
      input: JSON.stringify(request),
      encoding: 'utf8',
      // The reply repeats the settings, a cover over the 1 MB limit included
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, ...ENV, PM_PUBLIC_DIR: publicDir },
    });
    if (result.status !== 0 || !result.stdout) throw new Error(`php failed: ${result.stderr || result.stdout}`);
    return JSON.parse(result.stdout);
  };
  const projectsDir = (dir = webRoot) => join(dir, 'assets', 'projects');
  // A fresh web root with assets/projects/<name> files, each `age` ms old
  const webRootWith = (files: [string, number][]) => {
    const dir = mkdtempSync(join(tmpdir(), 'gn-portfolio-case-'));
    scratchDirs.push(dir);
    mkdirSync(projectsDir(dir), { recursive: true });
    for (const [file, age] of files) {
      const path = join(projectsDir(dir), file);
      writeFileSync(path, 'x');
      const when = new Date(Date.now() - age);
      utimesSync(path, when, when);
    }
    return dir;
  };

  beforeAll(async () => {
    harnessDir = mkdtempSync(join(tmpdir(), 'gn-portfolio-php-'));
    webRoot = mkdtempSync(join(tmpdir(), 'gn-portfolio-web-'));
    writeFileSync(join(harnessDir, 'cli.php'), CLI_HARNESS);
    writeFileSync(join(harnessDir, 'router.php'), ROUTER);
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    php = spawn('php', ['-d', 'display_errors=0', '-S', `127.0.0.1:${port}`, join(harnessDir, 'router.php')], {
      env: { ...process.env, ...ENV, PM_PUBLIC_DIR: webRoot },
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
    for (const dir of [harnessDir, webRoot, ...scratchDirs]) if (dir) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  it('saves the same portfolio_data, byte for byte', async () => {
    for (const { name, sent: items, stored } of CASES) {
      const settings = { portfolio_data: JSON.stringify(items), hero_title: 'x' };
      const store = stored ? { portfolio_data: JSON.stringify(stored) } : {};
      const phpOut = runCli({ op: 'prepare', settings, store });
      const nodeOut = await prepareNode({ ...settings }, store);
      expect(phpOut.status, name).toBe(200);
      expect(phpOut.settings, name).toEqual(nodeOut.settings);
    }
  });

  it('refuses the same data: links and saves the same values as sent', async () => {
    for (const [items, error] of REFUSED) {
      expect(runCli({ op: 'prepare', settings: { portfolio_data: JSON.stringify(items) } })).toMatchObject({ status: 400, error });
    }
    for (const value of AS_SENT) {
      const phpOut = runCli({ op: 'prepare', settings: { portfolio_data: value } });
      expect(phpOut.settings.portfolio_data).toEqual(value);
      expect(phpOut.queries).toEqual([]);
    }
  });

  it('stores the same data: covers under the same names, replacing an old file of that name', async () => {
    const [oldName] = COVER_FILES[0];
    const dir = webRootWith([[oldName, 2 * DAY]]);
    const store = { portfolio_data: JSON.stringify(COVER_STORED) };
    const phpOut = runCli({ op: 'prepare', settings: { portfolio_data: JSON.stringify(COVER_SENT) }, store }, dir);
    expect(phpOut.status).toBe(200);
    expect(JSON.parse(phpOut.settings.portfolio_data)).toEqual(coverSaved(''));
    const nodeOut = await prepareNode({ portfolio_data: JSON.stringify(COVER_SENT) }, store);
    expect(String(nodeOut.settings?.portfolio_data).split(S3).join('')).toBe(phpOut.settings.portfolio_data);

    expect(readdirSync(projectsDir(dir)).sort()).toEqual(COVER_FILES.map(([name]) => name).sort());
    for (const [name, bytes] of COVER_FILES) expect(readFileSync(join(projectsDir(dir), name)), name).toEqual(bytes);
    // Written again, so the sweep sees a new file
    expect(statSync(join(projectsDir(dir), oldName)).mtimeMs).toBeGreaterThan(Date.now() - HOUR);
  });

  it('refuses the same data: covers with the same errors, before writing any file', () => {
    const dir = webRootWith([]);
    for (const [items, stored, error] of COVER_REFUSED) {
      const store = stored ? { portfolio_data: JSON.stringify(stored) } : {};
      expect(runCli({ op: 'prepare', settings: { portfolio_data: JSON.stringify(items) }, store }, dir)).toMatchObject({ status: 400, error });
    }
    expect(readdirSync(projectsDir(dir))).toEqual([]);
  });

  it('upload_project_image: same answers, the file is written under the generated name', async () => {
    for (const [name, body, status, expected] of IMAGE_CASES) {
      const phpOut = runCli({ op: 'image', input: body });
      const nodeOut = await nodeImage(body);
      expect(phpOut.status, name).toBe(nodeOut.status);
      if (status === 200) {
        expect(phpOut.url, name).toMatch(new RegExp(`^/assets/projects/project_[0-9a-f]{12}\\.${expected}$`));
        expect(nodeOut.url.slice(S3.length).replace(/[0-9a-f]{12}/, '')).toBe(phpOut.url.replace(/[0-9a-f]{12}/, ''));
        expect(existsSync(join(webRoot, phpOut.url))).toBe(true);
      } else {
        expect(phpOut.error, name).toBe(nodeOut.error);
      }
    }
    expect(readFileSync(join(webRoot, runCli({ op: 'image', input: { data: dataUri(PNG) } }).url))).toEqual(PNG);
    // A body PHP dropped for exceeding post_max_size (nothing decoded although one was sent) → 413
    expect(runCli({ op: 'image', input: [], contentLength: 99_000_000 })).toEqual({ status: 413, error: 'Ukuran gambar melebihi batas server.' });
  });

  it('over HTTP: raw video and JSON image uploads, same errors as Node, GET falls through', async () => {
    const video = mp4();
    const res = await fetch(`${base}/?action=upload_project_video`, { method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: video });
    const body = (await res.json()) as { success: boolean; url: string };
    expect(res.status).toBe(200);
    expect(body.url).toMatch(/^\/assets\/projects\/project_video_[0-9a-f]{12}\.mp4$/);
    expect(readFileSync(join(webRoot, body.url))).toEqual(video);
    // The temp dot file is gone
    expect(readdirSync(projectsDir()).filter((name) => name.startsWith('.'))).toEqual([]);

    const wrong = await fetch(`${base}/?action=upload_project_video`, { method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: PNG });
    expect([wrong.status, await wrong.json()]).toEqual([400, { error: VIDEO_TYPE_ERROR }]);
    const big = await fetch(`${base}/?action=upload_project_video`, { method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: mp4(20_000) });
    expect([big.status, await big.json()]).toEqual([413, { error: 'Ukuran video maksimal 0.01 MB.' }]);

    const image = await fetch(`${base}/?action=upload_project_image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: dataUri(GIF, 'image/gif') }) });
    expect(((await image.json()) as { url: string }).url).toMatch(/^\/assets\/projects\/project_[0-9a-f]{12}\.gif$/);
    const get = await fetch(`${base}/?action=upload_project_image`);
    expect([get.status, await get.json()]).toEqual([400, { error: 'Invalid action: upload_project_image' }]);
  });

  it('the sweep deletes the same files: generated, unreferenced, older than a day; broken uploads after an hour', async () => {
    const dir = webRootWith([...SWEEP_FILES.map(([name, age]) => [name, age] as [string, number]), ['.project_video_444444444444.part', 2 * HOUR], ['.project_video_555555555555.part', 10 * 60 * 1000]]);
    runCli({ op: 'sweep', store: SWEEP_STORE }, dir);
    expect(readdirSync(projectsDir(dir)).sort()).toEqual([...keptAfterSweep, '.project_video_555555555555.part'].sort());

    // Not a JSON array: nothing deleted; after a successful save the sweep runs too
    const broken = webRootWith(SWEEP_FILES.map(([name, age]) => [name, age]));
    runCli({ op: 'sweep', store: { portfolio_data: '{"rusak"' } }, broken);
    expect(readdirSync(projectsDir(broken))).toHaveLength(SWEEP_FILES.length);
    runCli({ op: 'prepare', save: true, settings: { portfolio_data: SWEEP_SENT }, store: SWEEP_STORE }, broken);
    expect(readdirSync(projectsDir(broken)).sort()).toEqual(keptAfterSweep);
  });
});
