// @vitest-environment node
// Node environment: backend/s3-client.js imports @aws-sdk/client-s3 and security.js bcryptjs, which only
// backend/node_modules has; both are mocked below (the real s3-client runs against a fake bucket), and only the SSR
// transform leaves those imports for the mocks.
//
// Hero background of the home page: upload_hero_video takes the raw video bytes (MP4/WebM by magic bytes only, capped
// at UPLOAD_MAX_VIDEO_MB), get_hero_media_limits tells the admin page the limits, and update_settings normalizes
// hero_bg_mode / hero_bg_video / hero_bg_video_poster / hero_images, refuses a stale tab (hero_media_base, 409) and a
// link to a file that is gone, and leaves deleting to a garbage-collect sweep (generated, unused, older than a day).
// The Node module (backend/modules/hero_media.js) and the PHP module (backend/modules/hero_media.php) must answer the
// same; the PHP half runs the real module in the CLI (settings, sniffing, names, sweep, access) and behind `php -S`
// (php://input is only real over HTTP), and is skipped without `php`.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';

const { s3Send, fakeS3Sdk } = vi.hoisted(() => {
  // security.js and s3-client.js read these when they are imported
  Object.assign(process.env, {
    AUTH_SECRET: 'h'.repeat(16) + Math.random().toString(36).slice(2).padEnd(24, 'm'),
    S3_ACCESS_KEY: 'test-access',
    S3_SECRET_KEY: 'test-secret',
    S3_PUBLIC_URL: 'https://s3.test/bucket',
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

// s3-client.js loads the SDK from backend/node_modules when that folder is installed, otherwise by its bare name.
// Mock both ids, or a checkout with backend/node_modules sends these tests to the real S3.
vi.mock('@aws-sdk/client-s3', () => fakeS3Sdk());
vi.mock('../../backend/node_modules/@aws-sdk/client-s3', () => fakeS3Sdk());
// Only backend/node_modules has bcryptjs; the auth gate never needs a real hash here
vi.mock('bcryptjs', () => ({ default: { hashSync: () => 'dummy', compare: async () => false, hash: async () => 'dummy' } }));

import * as hm from '../../backend/modules/hero_media.js';
import { parseUpload, svgHasActiveContent, uploadBase64ToS3 } from '../../backend/s3-client.js';
import { createAuthGate, issueToken } from '../../backend/security.js';

const ROOT = resolve(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8');
const API_PHP = read('backend', 'api.php');
const SECURITY_JS = read('backend', 'security.js');
const SERVER_JS = read('backend', 'server.js');

const S3 = 'https://s3.test/bucket';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const TYPE_ERROR = 'Hanya video MP4 atau WebM yang diizinkan.';
const EMPTY_ERROR = 'File video kosong.';
const DATA_VIDEO_ERROR = 'Video harus diunggah lewat upload_hero_video.';
const RASTER_ERROR = 'Gambar latar dan sampul harus JPG, PNG, atau WEBP.';
const STALE_ERROR = 'Latar hero sudah diubah di tab atau perangkat lain. Muat ulang halaman, lalu simpan lagi.';
const SVG_ERROR = 'File SVG berisi script dan tidak diizinkan.';
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';
const STORED_SQL = "SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN ('hero_bg_video', 'hero_bg_video_poster')";
const SAVED_FILES_SQL = "SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN ('hero_bg_video_poster', 'hero_images')";
// UPLOAD_MAX_VIDEO_MB for the upload tests: floor(0.01 MB) = 10485 bytes, same in both backends
const LIMIT_MB = '0.01';
const LIMIT = Math.floor(0.01 * 1024 * 1024);
const TOO_LARGE = `Ukuran video maksimal ${LIMIT_MB} MB.`;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// ── Fixtures ──
// ISO-BMFF: [box size]['ftyp'][major brand][minor version][compatible brands], then payload
const mp4 = (brand: string, payload = 64) =>
  Buffer.concat([
    Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftyp', 'latin1'), Buffer.from(brand, 'latin1'),
    Buffer.from([0, 0, 2, 0]), Buffer.from('isomiso2', 'latin1'), Buffer.alloc(payload, 0x11),
  ]);
// EBML header: EBMLVersion, EBMLReadVersion, MaxIDLength, MaxSizeLength, DocType <docType>, DocTypeVersion, ...
const ebml = (docType: string, payload = 64) =>
  Buffer.concat([
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x80 | (27 + docType.length)]),
    Buffer.from([0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81, 0x08]),
    Buffer.from([0x42, 0x82, 0x80 | docType.length]), Buffer.from(docType, 'latin1'),
    Buffer.from([0x42, 0x87, 0x81, 0x04, 0x42, 0x85, 0x81, 0x02]), Buffer.alloc(payload, 0x22),
  ]);
const PNG = Buffer.concat([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), Buffer.alloc(32, 1)]);
const JPEG = Buffer.concat([Buffer.from('ffd8ffe000104a46494600', 'hex'), Buffer.alloc(32, 2)]);
const WEBP = Buffer.concat([Buffer.from('RIFF', 'latin1'), Buffer.from([40, 0, 0, 0]), Buffer.from('WEBPVP8 ', 'latin1'), Buffer.alloc(32, 3)]);
const GIF = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(32, 4)]);
const ICO = Buffer.concat([Buffer.from([0, 0, 1, 0, 1, 0]), Buffer.alloc(32, 5)]);
const SAFE_SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
const RANDOM = Buffer.from(Array.from({ length: 256 }, (_, i) => (i * 73 + 41) % 256));
const dataUri = (bytes: Buffer, mime = 'application/octet-stream') => `data:${mime};base64,${bytes.toString('base64')}`;
const PNG_URI = 'data:image/png;base64,iVBORw0KGgo=';
const HTML_URI = 'data:text/html;base64,PGgxPmhhbG88L2gxPg==';

const SNIFF_CASES: [string, Buffer, 'mp4' | 'webm' | null][] = [
  ['mp4 isom', mp4('isom'), 'mp4'],
  ['mp4 mp42', mp4('mp42'), 'mp4'],
  ['mp4 avc1', mp4('avc1'), 'mp4'],
  ['m4v', mp4('M4V '), 'mp4'],
  ['minimal mp4 (12 bytes)', mp4('isom').subarray(0, 12), 'mp4'],
  ['webm', ebml('webm'), 'webm'],
  ['minimal webm (header up to the DocType)', ebml('webm').subarray(0, 28), 'webm'],
  ['quicktime mov', mp4('qt  '), null],
  ['3gp', mp4('3gp4'), null],
  ['brand in another case', mp4('ISOM'), null],
  ['matroska', ebml('matroska'), null],
  ['"webm" after the first 64 bytes', Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(70), Buffer.from('webm')]), null],
  ['ftyp at another offset', Buffer.concat([Buffer.alloc(1), mp4('isom')]), null],
  ['png', PNG, null],
  ['jpeg', JPEG, null],
  ['random bytes', RANDOM, null],
  ['mp4 cut to 11 bytes', mp4('isom').subarray(0, 11), null],
  ['ebml cut to 3 bytes', Buffer.from([0x1a, 0x45, 0xdf]), null],
  ['empty', Buffer.alloc(0), null],
];

const MIME = { mp4: 'video/mp4', webm: 'video/webm' } as const;

// SVGs for the active-content check (s3-client.js ↔ svg_has_active_content() in api.php): [name, text, active]
const svgWith = (inner: string, head = '') =>
  `${head}<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${inner}</svg>`;
const link = (href: string) => svgWith(`<a xlink:href="${href}"><rect width="1" height="1"/></a>`);
const SVG_CASES: [string, string, boolean][] = [
  ['plain', SAFE_SVG.toString(), false],
  ['text with &amp; and &copy;', svgWith('<title>Garuda &amp; Nexa &copy; 2026 &nbsp;</title>'), false],
  ['xml prolog, utf-8', svgWith('<rect/>', '<?xml version="1.0" encoding="UTF-8"?>'), false],
  ['xml prolog, latin-1', svgWith('<rect/>', "<?xml version='1.0' encoding='iso-8859-1'?>"), false],
  ['https link', link('https://garudanexa.com/'), false],
  ['embedded png', svgWith('<image href="data:image/png;base64,iVBORw0KGgo="/>'), false],
  ['plain javascript:', link('javascript:alert(1)'), true],
  ['decimal reference', link('&#106;avascript:alert(1)'), true],
  ['hex reference', link('&#x6A;avascript:alert(1)'), true],
  ['no semicolon, leading zeros', link('&#0000106avascript:alert(1)'), true],
  ['named colon', link('javascript&colon;alert(1)'), true],
  ['tab and newline references', link('java&Tab;scr&NewLine;ipt:alert(1)'), true],
  ['raw tab in the scheme', link('java\tscript:alert(1)'), true],
  ['&amp;#106; (two passes)', link('&amp;#106;avascript:alert(1)'), true],
  ['&#38;#106; (numeric, then html_entity_decode in one pass)', link('&#38;#106;avascript:alert(1)'), true],
  ['&amp;amp;#106; (three passes)', link('&amp;amp;#106;avascript:alert(1)'), true],
  ['four levels stay encoded after three passes (a browser decodes once)', link('&amp;amp;amp;#106;avascript:alert(1)'), false],
  ['surrogate reference dropped', link('java&#xD800;script:alert(1)'), true],
  ['out-of-range reference dropped', link('java&#99999999999999999999;script:alert(1)'), true],
  ['zero reference dropped', link('java&#0;script:alert(1)'), true],
  ['DEL is not stripped', link('java&#x7f;script:alert(1)'), false],
  ['fj ligature', link('&fjlig;avascript:alert(1)'), true],
  ['vbscript', link('vbscript:msgbox(1)'), true],
  ['livescript', link('livescript:alert(1)'), true],
  ['data:text/html', link('data:text/html;base64,PHNjcmlwdD4='), true],
  ['encoded data:application/xhtml', link('&#100;ata:application/xhtml+xml,x'), true],
  ['script element', svgWith('<script>alert(1)</script>'), true],
  ['encoded script element in text', svgWith('<text>&lt;script&gt;alert(1)</text>'), true],
  ['event handler', svgWith('<rect onload="alert(1)"/>'), true],
  ['event handler after a newline reference', svgWith('<rect&#10;onclick="alert(1)"/>'), true],
  ['no-break space is not XML whitespace', svgWith('<rect onload="x"/>'), false],
  ['handler element', svgWith('<handler type="application/ecmascript">alert(1)</handler>'), true],
  ['listener element', svgWith('<listener event="click" handler="#x"/>'), true],
  ['foreignObject', svgWith('<foreignObject><div/></foreignObject>'), true],
  ['iframe', svgWith('<iframe src="x"/>'), true],
  ['entity declaration', `<!DOCTYPE svg [<!ENTITY x "y">]>${svgWith('<rect/>')}`, true],
  ['internal DTD subset', `<!DOCTYPE svg [<!ATTLIST svg a CDATA "b">]>${svgWith('<rect/>')}`, true],
  ['UTF-16 declared', svgWith('<rect/>', '<?xml version="1.0" encoding="UTF-16"?>'), true],
  ['UTF-7 declared', svgWith('<rect/>', '<?xml version="1.0" encoding="utf-7"?>'), true],
];

// ── Node: fake request stream, response, bucket and database ──
class FakeReq extends Readable {
  headers: Record<string, string>;
  method = 'POST';
  query = { action: 'upload_hero_video' };
  body = {};
  pulled = 0;
  parts: Buffer[];
  constructor(parts: Buffer[], headers: Record<string, string> = {}) {
    super();
    this.parts = [...parts];
    this.headers = headers;
  }
  _read() {
    const next = this.parts.shift();
    if (next) this.pulled += 1;
    this.push(next ?? null);
  }
}

// Sends one chunk, then the connection drops (the browser cancelled the upload)
class AbortingReq extends FakeReq {
  _read() {
    if (this.pulled > 0) {
      this.destroy(new Error('aborted'));
      return;
    }
    this.pulled = 1;
    this.push(mp4('isom', 100));
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

// Objects of the fake bucket by key; LastModified as given (undefined = the listing has no date)
const bucket = new Map<string, { modified?: Date }>();
const putObject = (name: string, age: number | null) => bucket.set(`assets/bg/${name}`, { modified: age === null ? undefined : new Date(Date.now() - age) });
const bgNames = () => [...bucket.keys()].map((key) => key.replace(/^assets\/bg\//, '')).sort();
const notFound = () => Object.assign(new Error('NotFound'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } });
// ListObjectsV2 answers two keys per page, so every listing goes through ContinuationToken
async function fakeS3(cmd: { constructor: { name: string }; input: Record<string, unknown> }) {
  const key = String(cmd.input.Key);
  switch (cmd.constructor.name) {
    case 'PutObjectCommand':
      bucket.set(key, { modified: new Date() });
      return {};
    case 'DeleteObjectCommand':
      bucket.delete(key);
      return {};
    case 'HeadObjectCommand':
      if (bucket.has(key)) return {};
      throw notFound();
    case 'ListObjectsV2Command': {
      const keys = [...bucket.keys()].filter((k) => k.startsWith(String(cmd.input.Prefix))).sort();
      const start = Number(cmd.input.ContinuationToken ?? 0);
      const more = start + 2 < keys.length;
      return {
        Contents: keys.slice(start, start + 2).map((Key) => ({ Key, LastModified: bucket.get(Key)?.modified })),
        IsTruncated: more,
        NextContinuationToken: more ? String(start + 2) : undefined,
      };
    }
    default:
      return {};
  }
}

type Store = Record<string, string>;
type Settings = Record<string, unknown>;
// hero_settings in memory: answers the module's SELECT ... WHERE setting_key IN ('a', 'b') queries
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

const chunks = (buf: Buffer, size = 1024) => Array.from({ length: Math.ceil(buf.length / size) }, (_, i) => buf.subarray(i * size, (i + 1) * size));
const rawHeaders = (buf: Buffer, type = 'video/mp4') => ({ 'content-type': type, 'content-length': String(buf.length) });

async function uploadNode(req: FakeReq, pool = fakePool()) {
  const res = new FakeRes();
  expect(await hm.handleHeroMediaAction('upload_hero_video', req, res, pool)).toBe(true);
  return { status: res.statusCode, body: res.body as Record<string, unknown>, headers: res.headers };
}

const sent = () => s3Send.mock.calls.map(([cmd]) => ({ type: cmd.constructor.name as string, ...(cmd.input as Record<string, unknown>) }));
const puts = () => sent().filter((c) => c.type === 'PutObjectCommand');
const deletes = () => sent().filter((c) => c.type === 'DeleteObjectCommand').map((c) => c.Key);
const lists = () => sent().filter((c) => c.type === 'ListObjectsV2Command');

// prepareHeroMediaSettings only (what server.js does before saving)
async function prepareNode(settings: Settings, stored: Store = {}, base?: unknown) {
  const pool = fakePool(stored);
  const finish = await hm.prepareHeroMediaSettings(settings, pool, base);
  return { settings, finish, pool };
}

// The whole update_settings: prepare, save (all keys, or only `savedBeforeFailure` when the request fails), finish
type SaveOptions = { base?: unknown; fail?: boolean; savedBeforeFailure?: string[] };
async function saveNode(settings: Settings, stored: Store = {}, { base, fail = false, savedBeforeFailure = [] }: SaveOptions = {}) {
  const { finish, pool } = await prepareNode(settings, stored, base);
  if (fail) {
    for (const key of savedBeforeFailure) pool.store[key] = String(settings[key]);
    await finish(false);
  } else {
    for (const [key, value] of Object.entries(settings)) pool.store[key] = typeof value === 'string' ? value : JSON.stringify(value);
    await finish(true);
  }
  return { settings, pool };
}

type Outcome = { status: number; error?: string };
const outcomeOf = (promise: Promise<unknown>): Promise<Outcome> =>
  promise.then(
    () => ({ status: 200 }),
    (err: { status?: number; message: string }) => ({ status: err.status ?? 500, error: err.message }),
  );

beforeEach(() => {
  bucket.clear();
  s3Send.mockReset();
  s3Send.mockImplementation(fakeS3);
});

describe('sniffVideo (Node)', () => {
  it.each(SNIFF_CASES)('%s', (_name, bytes, ext) => {
    expect(hm.sniffVideo(bytes)).toEqual(ext ? { ext, mime: MIME[ext] } : null);
  });

  it('only reads bytes', () => {
    for (const value of [undefined, null, 'ftypisom', [0, 0, 0, 0x18], { length: 12 }]) expect(hm.sniffVideo(value)).toBeNull();
    // A view into a larger buffer is read from its own offset
    const backing = new Uint8Array(3 + mp4('mp42').length);
    backing.set(mp4('mp42'), 3);
    expect(hm.sniffVideo(new Uint8Array(backing.buffer, 3))).toEqual({ ext: 'mp4', mime: 'video/mp4' });
    expect(hm.sniffVideo(new Uint8Array(backing.buffer, 2))).toBeNull();
  });
});

describe('upload_hero_video (Node)', () => {
  beforeAll(() => {
    process.env.UPLOAD_MAX_VIDEO_MB = LIMIT_MB;
  });
  afterAll(() => {
    delete process.env.UPLOAD_MAX_VIDEO_MB;
  });

  it('stores an MP4 on S3 under a generated name, public and cached for a year', async () => {
    const video = mp4('isom', 4000);
    const out = await uploadNode(new FakeReq(chunks(video), rawHeaders(video)));
    expect(out.status).toBe(200);
    expect(out.body).toEqual({ success: true, url: expect.stringMatching(/^https:\/\/s3\.test\/bucket\/assets\/bg\/hero_video_[0-9a-f]{12}\.mp4$/) });
    const [put] = puts();
    expect(puts()).toHaveLength(1);
    expect(put).toMatchObject({ Key: String(out.body.url).slice(S3.length + 1), ContentType: 'video/mp4', ACL: 'public-read', CacheControl: IMMUTABLE });
    expect(Buffer.compare(put.Body as Buffer, video)).toBe(0);
  });

  it('stores a WebM sent in chunks without Content-Length, under a new name each time', async () => {
    const video = ebml('webm', 5000);
    const first = await uploadNode(new FakeReq(chunks(video, 700), { 'content-type': 'application/octet-stream' }));
    const second = await uploadNode(new FakeReq([video]));
    expect(first.body.url).toMatch(/^https:\/\/s3\.test\/bucket\/assets\/bg\/hero_video_[0-9a-f]{12}\.webm$/);
    expect(second.body.url).toMatch(/\.webm$/);
    expect(second.body.url).not.toBe(first.body.url);
    expect(puts().map((p) => p.ContentType)).toEqual(['video/webm', 'video/webm']);
  });

  it('accepts exactly the limit and refuses one byte more', async () => {
    const atLimit = mp4('isom', LIMIT - mp4('isom', 0).length);
    expect(atLimit.length).toBe(LIMIT);
    expect((await uploadNode(new FakeReq(chunks(atLimit), rawHeaders(atLimit)))).status).toBe(200);
    const over = mp4('isom', LIMIT + 1 - mp4('isom', 0).length);
    expect(await uploadNode(new FakeReq(chunks(over)))).toMatchObject({ status: 413, body: { error: TOO_LARGE } });
  });

  it('stops reading an oversized stream (413) and closes the connection', async () => {
    // 1 MB in 1 KB chunks against a 10 KB limit; the stream may read ahead up to its highWaterMark, not further
    const parts = chunks(mp4('isom', 1000 * 1024));
    const req = new FakeReq(parts, { 'content-type': 'video/mp4' });
    const out = await uploadNode(req);
    expect(out).toMatchObject({ status: 413, body: { error: TOO_LARGE }, headers: { connection: 'close' } });
    expect(req.pulled).toBeLessThan(parts.length / 4);
    expect(req.readableEnded).toBe(false);
    expect(s3Send).not.toHaveBeenCalled();
  });

  it('refuses an announced size over the limit without reading the body', async () => {
    const req = new FakeReq([mp4('isom')], { 'content-type': 'video/mp4', 'content-length': String(LIMIT + 1) });
    expect(await uploadNode(req)).toMatchObject({ status: 413, body: { error: TOO_LARGE } });
    expect(req.pulled).toBe(0);
  });

  it('refuses an empty body (400)', async () => {
    expect(await uploadNode(new FakeReq([], { 'content-type': 'video/mp4', 'content-length': '0' }))).toMatchObject({ status: 400, body: { error: EMPTY_ERROR } });
    expect(s3Send).not.toHaveBeenCalled();
  });

  it.each([
    ['png', PNG], ['jpeg', JPEG], ['quicktime mov', mp4('qt  ')], ['matroska', ebml('matroska')], ['random bytes', RANDOM],
  ])('refuses %s whatever the Content-Type says (400)', async (_name, bytes) => {
    expect(await uploadNode(new FakeReq([bytes], rawHeaders(bytes, 'video/mp4')))).toEqual({ status: 400, body: { error: TYPE_ERROR }, headers: {} });
    expect(s3Send).not.toHaveBeenCalled();
  });

  it('refuses JSON and multipart bodies before reading them', async () => {
    for (const type of ['application/json', 'application/json; charset=utf-8', 'application/merge-patch+json', 'multipart/form-data; boundary=x']) {
      const req = new FakeReq([mp4('isom')], { 'content-type': type });
      expect(await uploadNode(req)).toMatchObject({ status: 400, body: { error: TYPE_ERROR } });
      expect(req.pulled).toBe(0);
    }
  });

  it('answers 400 when the upload is cut off', async () => {
    expect(await uploadNode(new AbortingReq([]))).toMatchObject({ status: 400, body: { error: 'Upload video terputus. Silakan coba lagi.' } });
    expect(s3Send).not.toHaveBeenCalled();
  });

  it('masks an S3 failure as a generic 500', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    s3Send.mockRejectedValue(new Error('S3 down: secret detail'));
    expect(await uploadNode(new FakeReq([mp4('isom')]))).toMatchObject({ status: 500, body: { error: GENERIC_ERROR } });
    log.mockRestore();
  });

  it('ignores other actions and GET (falls through to "Invalid action", like api.php)', async () => {
    const req = new FakeReq([mp4('isom')]);
    expect(await hm.handleHeroMediaAction('update_settings', req, new FakeRes(), fakePool())).toBe(false);
    expect(await hm.handleHeroMediaAction(undefined, req, new FakeRes(), fakePool())).toBe(false);
    req.method = 'GET';
    expect(await hm.handleHeroMediaAction('upload_hero_video', req, new FakeRes(), fakePool())).toBe(false);
    expect(req.pulled).toBe(0);
    expect(s3Send).not.toHaveBeenCalled();
  });

  it('runs the sweep after a successful upload: old unused uploads go, the stored and the new video stay', async () => {
    putObject('hero_video_111111111111.mp4', 2 * DAY);
    putObject('hero_video_222222222222.mp4', 2 * DAY);
    const pool = fakePool({ hero_bg_video: `${S3}/assets/bg/hero_video_111111111111.mp4` });
    const out = await uploadNode(new FakeReq([mp4('isom')]), pool);
    expect(out.status).toBe(200);
    expect(deletes()).toEqual(['assets/bg/hero_video_222222222222.mp4']);
    expect(bgNames()).toEqual(['hero_video_111111111111.mp4', String(out.body.url).slice(`${S3}/assets/bg/`.length)].sort());
    expect(pool.queries).toEqual([STORED_SQL]);
    // A failed upload does not sweep
    s3Send.mockClear();
    expect((await uploadNode(new FakeReq([PNG]), pool)).status).toBe(400);
    expect(lists()).toEqual([]);
  });

  it('a failing sweep is logged and the upload still succeeds', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    s3Send.mockImplementation(async (cmd) => {
      if (cmd.constructor.name === 'ListObjectsV2Command') throw new Error('S3 list down');
      return fakeS3(cmd);
    });
    const out = await uploadNode(new FakeReq([mp4('isom')]));
    expect(out).toMatchObject({ status: 200, body: { success: true } });
    expect(log).toHaveBeenCalledWith('[hero_media] Sweep failed:', expect.objectContaining({ message: 'S3 list down' }));
    log.mockRestore();
  });

  it('defaults to 30 MB when UPLOAD_MAX_VIDEO_MB is missing or invalid', () => {
    const before = process.env.UPLOAD_MAX_VIDEO_MB;
    try {
      for (const [value, mb] of [[undefined, 30], ['', 30], ['abc', 30], ['-5', 30], ['0', 30], ['12.5', 12.5], ['64', 64]] as const) {
        if (value === undefined) delete process.env.UPLOAD_MAX_VIDEO_MB;
        else process.env.UPLOAD_MAX_VIDEO_MB = value;
        expect(hm.videoLimitMb(), String(value)).toBe(mb);
      }
    } finally {
      if (before === undefined) delete process.env.UPLOAD_MAX_VIDEO_MB;
      else process.env.UPLOAD_MAX_VIDEO_MB = before;
    }
  });
});

// ── get_hero_media_limits ──
const LIMIT_ENV_CASES: [string | undefined, number][] = [[undefined, 30], ['64', 64], ['12.5', 12], ['0.01', 1], ['abc', 30]];

async function withVideoLimit<T>(value: string | undefined, fn: () => Promise<T>): Promise<T> {
  const before = process.env.UPLOAD_MAX_VIDEO_MB;
  if (value === undefined) delete process.env.UPLOAD_MAX_VIDEO_MB;
  else process.env.UPLOAD_MAX_VIDEO_MB = value;
  try {
    return await fn();
  } finally {
    if (before === undefined) delete process.env.UPLOAD_MAX_VIDEO_MB;
    else process.env.UPLOAD_MAX_VIDEO_MB = before;
  }
}

const userRow = (role: string) => ({ id: 3, name: 'U', email: 'u@test', phone: '', role, status: 'active', avatar: '', password: 'hash' });

// The auth gate of security.js, then the module, as server.js wires them; role null = no token
async function limitsNode(role: string | null, method: 'GET' | 'POST' = 'GET') {
  const action = 'get_hero_media_limits';
  const pool = { query: vi.fn(async () => [[userRow(role ?? 'user')]]) };
  const headers: Record<string, string> = role ? { authorization: `Bearer ${issueToken(userRow(role)).token}` } : {};
  const req = { method, headers, query: method === 'GET' ? { action } : {}, body: method === 'POST' ? { action } : {} };
  const res = new FakeRes();
  let passed = false;
  await createAuthGate(pool)(req, res, () => {
    passed = true;
  });
  if (passed) expect(await hm.handleHeroMediaAction(action, req, res, pool)).toBe(true);
  return { status: res.statusCode, body: res.body };
}

describe('get_hero_media_limits (Node)', () => {
  it('answers the video limit in whole MB and the slide limit, for GET and POST', async () => {
    for (const [value, mb] of LIMIT_ENV_CASES) {
      for (const method of ['GET', 'POST'] as const) {
        const out = await withVideoLimit(value, () => limitsNode('user', method));
        expect(out, `${value} ${method}`).toEqual({ status: 200, body: { success: true, video_max_mb: mb, max_images: 12 } });
      }
    }
  });

  it('is staff only: guests 401, customers 403, admin and user staff 200', async () => {
    expect(await limitsNode(null)).toMatchObject({ status: 401, body: { code: 'UNAUTHORIZED' } });
    expect(await limitsNode('customer')).toMatchObject({ status: 403, body: { code: 'FORBIDDEN' } });
    expect((await limitsNode('admin')).status).toBe(200);
    expect((await limitsNode('user')).status).toBe(200);
  });

  it('max_images is HERO_MAX_IMAGES of the home page', () => {
    const config = read('src', 'components', 'sections', 'hero', 'heroBgConfig.ts');
    expect(config).toMatch(new RegExp(`^export const HERO_MAX_IMAGES = ${hm.HERO_MAX_IMAGES};$`, 'm'));
    expect(read('backend', 'modules', 'hero_media.php')).toMatch(new RegExp(`^const HM_MAX_IMAGES = ${hm.HERO_MAX_IMAGES};$`, 'm'));
  });
});

// ── Node: update_settings helper ──
const OLD_VIDEO = `${S3}/assets/bg/hero_video_0123456789ab.mp4`;
const OLD_POSTER = `${S3}/assets/bg/hero_poster_0123456789ab.jpg`;
const NEW_VIDEO = `${S3}/assets/bg/hero_video_ba9876543210.webm`;

describe('update_settings hero keys (Node)', () => {
  it('normalizes hero_bg_mode and leaves unsent keys alone', async () => {
    const cases: [unknown, string][] = [
      ['default', 'default'], ['image', 'image'], ['video', 'video'], ['', 'default'], ['slideshow', 'default'],
      ['VIDEO', 'default'], [' video', 'default'], [null, 'default'], [3, 'default'], [['video'], 'default'], [true, 'default'],
    ];
    for (const [value, mode] of cases) {
      const { settings, pool } = await prepareNode({ hero_bg_mode: value, hero_title: 'Judul' });
      expect(settings, JSON.stringify(value)).toEqual({ hero_bg_mode: mode, hero_title: 'Judul' });
      // Stored values are only read for the video/poster keys
      expect(pool.query).not.toHaveBeenCalled();
    }
    expect((await prepareNode({ hero_title: 'x' })).settings).toEqual({ hero_title: 'x' });
  });

  it('refuses a data: video before storing anything', async () => {
    for (const video of ['data:video/mp4;base64,AAAAGGZ0eXBpc29t', ' DATA:video/webm;base64,GkXfow==', '\u0001data:video/mp4;base64,AA==']) {
      const settings = { hero_bg_video: video, hero_bg_video_poster: PNG_URI, hero_images: JSON.stringify([PNG_URI]) };
      await expect(hm.prepareHeroMediaSettings(settings, fakePool())).rejects.toMatchObject({ status: 400, expose: true, message: DATA_VIDEO_ERROR });
    }
    expect(s3Send).not.toHaveBeenCalled();
  });

  it('stores a new data: poster as an image in assets/bg', async () => {
    const { settings } = await prepareNode({ hero_bg_video_poster: PNG_URI });
    expect(settings.hero_bg_video_poster).toMatch(/^https:\/\/s3\.test\/bucket\/assets\/bg\/hero_poster_[0-9a-f]{12}\.png$/);
    expect(puts()).toEqual([
      expect.objectContaining({ Key: String(settings.hero_bg_video_poster).slice(S3.length + 1), ContentType: 'image/png', ACL: 'public-read', CacheControl: IMMUTABLE }),
    ]);
  });

  it('posters are JPG, PNG or WEBP only, whatever the data: type says', async () => {
    for (const [bytes, ext] of [[PNG, 'png'], [JPEG, 'jpg'], [WEBP, 'webp']] as const) {
      const { settings } = await prepareNode({ hero_bg_video_poster: dataUri(bytes) });
      expect(settings.hero_bg_video_poster).toMatch(new RegExp(`/assets/bg/hero_poster_[0-9a-f]{12}\\.${ext}$`));
    }
    s3Send.mockClear();
    for (const bytes of [GIF, ICO, SAFE_SVG, RANDOM, Buffer.from('<h1>halo</h1>')]) {
      for (const mime of ['image/png', 'image/svg+xml']) {
        await expect(hm.prepareHeroMediaSettings({ hero_bg_video_poster: dataUri(bytes, mime) }, fakePool())).rejects.toMatchObject({ status: 400, message: RASTER_ERROR });
      }
    }
    await expect(hm.prepareHeroMediaSettings({ hero_bg_video_poster: HTML_URI }, fakePool())).rejects.toMatchObject({ status: 400, message: RASTER_ERROR });
    expect(s3Send).not.toHaveBeenCalled();
  });

  it('new slides are JPG, PNG, WEBP or GIF only, and every one is checked before the first upload', async () => {
    const { settings } = await prepareNode({ hero_images: JSON.stringify([dataUri(GIF), dataUri(WEBP)]) });
    expect(JSON.parse(String(settings.hero_images))).toEqual([expect.stringMatching(/hero_[0-9a-f]{12}\.gif$/), expect.stringMatching(/hero_[0-9a-f]{12}\.webp$/)]);
    s3Send.mockClear();
    for (const bad of [SAFE_SVG, ICO, RANDOM]) {
      const images = JSON.stringify([PNG_URI, dataUri(JPEG), dataUri(bad, 'image/png')]);
      await expect(hm.prepareHeroMediaSettings({ hero_images: images, hero_bg_video_poster: PNG_URI }, fakePool())).rejects.toMatchObject({ status: 400, message: RASTER_ERROR });
    }
    // The poster is checked before the slides are stored too
    await expect(hm.prepareHeroMediaSettings({ hero_images: JSON.stringify([PNG_URI]), hero_bg_video_poster: dataUri(SAFE_SVG) }, fakePool()))
      .rejects.toMatchObject({ status: 400, message: RASTER_ERROR });
    expect(s3Send).not.toHaveBeenCalled();
  });

  it('keeps links and blanks script/data links and non-strings', async () => {
    const cases: [unknown, unknown, string, string][] = [
      ['/assets/bg/hero_video_0123456789ab.mp4', 'https://cdn.test/poster.jpg', '/assets/bg/hero_video_0123456789ab.mp4', 'https://cdn.test/poster.jpg'],
      ['', '', '', ''],
      ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', '', ''],
      [' vbscript:msgbox(1)', '\u0001javascript:alert(1)', '', ''],
      ['https://cdn.test/v.webm', '\u0001data:image/png;base64,iVBORw0KGgo=', 'https://cdn.test/v.webm', ''],
      [null, 42, '', ''],
    ];
    for (const [video, poster, storedVideo, storedPoster] of cases) {
      const { settings } = await prepareNode({ hero_bg_video: video, hero_bg_video_poster: poster });
      expect(settings, JSON.stringify([video, poster])).toEqual({ hero_bg_video: storedVideo, hero_bg_video_poster: storedPoster });
    }
    // None of them is a generated S3 file, so nothing is looked up
    expect(s3Send).not.toHaveBeenCalled();
  });

  it('hero_images: every data: entry is validated and stored, other entries pass the link check', async () => {
    const { settings } = await prepareNode({
      hero_images: JSON.stringify([PNG_URI, '/assets/bg/hero.png', 'javascript:alert(1)', 42, 'https://cdn.test/a.jpg', dataUri(PNG)]),
    });
    const images = JSON.parse(String(settings.hero_images));
    expect(images).toEqual([
      expect.stringMatching(/^https:\/\/s3\.test\/bucket\/assets\/bg\/hero_[0-9a-f]{12}\.png$/),
      '/assets/bg/hero.png',
      '',
      'https://cdn.test/a.jpg',
      expect.stringMatching(/^https:\/\/s3\.test\/bucket\/assets\/bg\/hero_[0-9a-f]{12}\.png$/),
    ]);
    expect(puts().map((p) => p.ContentType)).toEqual(['image/png', 'image/png']);

    await expect(hm.prepareHeroMediaSettings({ hero_images: JSON.stringify([HTML_URI]) }, fakePool())).rejects.toMatchObject({ status: 400, message: RASTER_ERROR });
    // Not a JSON array: left as it was (like api.php)
    expect((await prepareNode({ hero_images: 'not json' })).settings).toEqual({ hero_images: 'not json' });
  });

  it('refuses a stale tab (hero_media_base) with 409 before storing anything', async () => {
    const stored = { hero_bg_video: OLD_VIDEO, hero_bg_video_poster: OLD_POSTER };
    putObject('hero_video_ba9876543210.webm', HOUR);
    const stale: [Settings, unknown][] = [
      [{ hero_bg_video: NEW_VIDEO }, { video: `${S3}/assets/bg/hero_video_111111111111.mp4`, poster: OLD_POSTER }],
      [{ hero_bg_video: '' }, { video: '', poster: OLD_POSTER }],
      // A new poster: its base is compared, not the new value
      [{ hero_bg_video_poster: PNG_URI, hero_images: JSON.stringify([PNG_URI]) }, { video: OLD_VIDEO, poster: '' }],
      [{ hero_bg_video: NEW_VIDEO, hero_bg_video_poster: '' }, { video: OLD_VIDEO, poster: `${S3}/assets/bg/hero_poster_111111111111.jpg` }],
      // An unchanged video does not excuse a changed poster whose base is stale
      [{ hero_bg_video: OLD_VIDEO, hero_bg_video_poster: '' }, { video: OLD_VIDEO, poster: `${S3}/assets/bg/hero_poster_111111111111.jpg` }],
      // A data: poster never equals the stored one, so it is always compared
      [{ hero_bg_video: OLD_VIDEO, hero_bg_video_poster: PNG_URI }, { video: `${S3}/assets/bg/hero_video_111111111111.mp4`, poster: '' }],
    ];
    for (const [settings, base] of stale) {
      s3Send.mockClear();
      await expect(hm.prepareHeroMediaSettings(settings, fakePool(stored), base), JSON.stringify(settings)).rejects.toMatchObject({ status: 409, expose: true, message: STALE_ERROR });
      expect(puts()).toEqual([]);
    }
    // Nothing stored counts as ''
    await expect(hm.prepareHeroMediaSettings({ hero_bg_video: NEW_VIDEO }, fakePool(), { video: OLD_VIDEO })).rejects.toMatchObject({ status: 409 });
  });

  it('accepts a save whose base matches, has no base, or does not touch the stale key', async () => {
    const stored = { hero_bg_video: OLD_VIDEO, hero_bg_video_poster: OLD_POSTER };
    putObject('hero_video_ba9876543210.webm', HOUR);
    const fine: [Settings, Store, unknown][] = [
      [{ hero_bg_video: NEW_VIDEO }, stored, { video: OLD_VIDEO, poster: OLD_POSTER }],
      [{ hero_bg_video: NEW_VIDEO }, stored, undefined],
      [{ hero_bg_video: NEW_VIDEO }, {}, { video: '', poster: '' }],
      // Only the poster is sent: a stale video base does not matter
      [{ hero_bg_video_poster: PNG_URI }, stored, { video: `${S3}/assets/bg/hero_video_111111111111.mp4`, poster: OLD_POSTER }],
      // Base values that are not strings, or a base that is not an object, are no check
      [{ hero_bg_video: NEW_VIDEO }, stored, { video: null, poster: 5 }],
      [{ hero_bg_video: NEW_VIDEO }, stored, 'x'],
      [{ hero_bg_video: NEW_VIDEO }, stored, [OLD_VIDEO]],
      [{ hero_bg_mode: 'image' }, stored, { video: 'other', poster: 'other' }],
      // A retry that changes nothing (the first save went through, its answer was lost): the stale base is not compared
      [{ hero_bg_video: OLD_VIDEO, hero_bg_video_poster: OLD_POSTER }, stored, { video: `${S3}/assets/bg/hero_video_111111111111.mp4`, poster: '' }],
      [{ hero_bg_video: '' }, {}, { video: OLD_VIDEO, poster: OLD_POSTER }],
      // Unchanged video with a stale base, changed poster with the current one
      [{ hero_bg_video: OLD_VIDEO, hero_bg_video_poster: '' }, stored, { video: `${S3}/assets/bg/hero_video_111111111111.mp4`, poster: OLD_POSTER }],
    ];
    for (const [settings, previous, base] of fine) {
      expect(await outcomeOf(hm.prepareHeroMediaSettings(settings, fakePool(previous), base)), JSON.stringify([settings, base])).toEqual({ status: 200 });
    }
  });

  it('refuses a changed link to a generated file that does not exist (409), but not removals or unchanged values', async () => {
    const stored = { hero_bg_video: OLD_VIDEO, hero_bg_video_poster: OLD_POSTER };
    const missing: Settings[] = [
      { hero_bg_video: NEW_VIDEO },
      { hero_bg_video_poster: `${S3}/assets/bg/hero_poster_111111111111.webp` },
    ];
    for (const settings of missing) {
      expect(await outcomeOf(hm.prepareHeroMediaSettings(settings, fakePool(stored))), JSON.stringify(settings)).toEqual({ status: 409, error: STALE_ERROR });
    }
    expect(sent().filter((c) => c.type === 'HeadObjectCommand').map((c) => c.Key)).toEqual(['assets/bg/hero_video_ba9876543210.webm', 'assets/bg/hero_poster_111111111111.webp']);
    s3Send.mockClear();
    const fine: Settings[] = [
      { hero_bg_video: '', hero_bg_video_poster: '' },
      // Unchanged: no lookup, even when the file is gone
      { hero_bg_video: OLD_VIDEO, hero_bg_video_poster: OLD_POSTER },
      // Not generated by this module: not looked up
      { hero_bg_video: 'https://cdn.test/v.mp4', hero_bg_video_poster: `${S3}/assets/bg/hero_poster_111111111111.svg` },
      { hero_bg_video: `${S3}/assets/bg/hero_video_custom.mp4`, hero_bg_video_poster: '/assets/bg/hero_poster_111111111111.jpg' },
    ];
    for (const settings of fine) expect(await outcomeOf(hm.prepareHeroMediaSettings(settings, fakePool(stored))), JSON.stringify(settings)).toEqual({ status: 200 });
    expect(s3Send).not.toHaveBeenCalled();
    putObject('hero_video_ba9876543210.webm', HOUR);
    expect(await outcomeOf(hm.prepareHeroMediaSettings({ hero_bg_video: NEW_VIDEO }, fakePool(stored)))).toEqual({ status: 200 });
  });

  it('never deletes the replaced video or poster at save time: a fresh one stays for other tabs', async () => {
    putObject('hero_video_0123456789ab.mp4', HOUR);
    putObject('hero_poster_0123456789ab.jpg', HOUR);
    putObject('hero_video_ba9876543210.webm', HOUR);
    const { settings } = await saveNode({ hero_bg_video: NEW_VIDEO, hero_bg_video_poster: PNG_URI }, { hero_bg_video: OLD_VIDEO, hero_bg_video_poster: OLD_POSTER });
    expect(deletes()).toEqual([]);
    expect(bgNames()).toEqual(['hero_poster_0123456789ab.jpg', String(settings.hero_bg_video_poster).slice(`${S3}/assets/bg/`.length), 'hero_video_0123456789ab.mp4', 'hero_video_ba9876543210.webm'].sort());
  });

  it('the sweep after a save deletes only generated, unused files older than a day', async () => {
    const stored = { hero_bg_video: OLD_VIDEO, hero_bg_video_poster: OLD_POSTER };
    const keep = [
      'hero_video_0123456789ab.mp4', // stored
      'hero_poster_0123456789ab.jpg', // stored
      'hero_video_333333333333.mp4', // 23 hours old
      'hero_poster_333333333333.png', // 1 hour old
      'hero_video_444444444444.mp4', // no date in the listing
      'hero_poster_444444444444.svg', // not a generated name (posters are raster only)
      'hero_poster_555555555555.gif',
      'hero_video_0123456789AB.mp4',
      'hero_video_custom.mp4',
      'hero_video_555555555555.mp4.bak',
      'hero_video_666666666666.mp4/x.mp4',
      'hero_aaaaaaaaaaaa.png', // slide
      'hero.png',
    ];
    const gone = ['hero_video_111111111111.mp4', 'hero_video_222222222222.webm', 'hero_poster_111111111111.jpg', 'hero_poster_222222222222.webp'];
    for (const name of [...keep, ...gone]) putObject(name, 2 * DAY);
    putObject('hero_video_333333333333.mp4', 23 * HOUR);
    putObject('hero_poster_333333333333.png', HOUR);
    putObject('hero_video_444444444444.mp4', null);
    putObject('hero_poster_222222222222.webp', 25 * HOUR);

    const { pool } = await saveNode({ hero_bg_mode: 'video' }, stored);
    expect(deletes().sort()).toEqual(gone.map((name) => `assets/bg/${name}`).sort());
    expect(bgNames()).toEqual([...keep].sort());
    expect(pool.queries).toEqual([STORED_SQL]);
    // Both prefixes, every page
    expect(lists().map((c) => [c.Prefix, c.ContinuationToken])).toEqual([
      ['assets/bg/hero_video_', undefined], ['assets/bg/hero_video_', '2'], ['assets/bg/hero_video_', '4'], ['assets/bg/hero_video_', '6'], ['assets/bg/hero_video_', '8'],
      ['assets/bg/hero_poster_', undefined], ['assets/bg/hero_poster_', '2'], ['assets/bg/hero_poster_', '4'],
    ]);
  });

  it('the sweep keeps what the save just stored and skips refused and failed saves', async () => {
    putObject('hero_video_ba9876543210.webm', 2 * DAY);
    putObject('hero_video_0123456789ab.mp4', 2 * DAY);
    // The new value is read after the save, so the old one goes and the new one stays
    await saveNode({ hero_bg_video: NEW_VIDEO }, { hero_bg_video: OLD_VIDEO });
    expect(bgNames()).toEqual(['hero_video_ba9876543210.webm']);

    putObject('hero_video_0123456789ab.mp4', 2 * DAY);
    s3Send.mockClear();
    await saveNode({ hero_bg_mode: 'image' }, { hero_bg_video: NEW_VIDEO }, { fail: true });
    await expect(saveNode({ hero_bg_video: 'data:video/mp4;base64,AA==' }, { hero_bg_video: NEW_VIDEO })).rejects.toMatchObject({ status: 400 });
    expect(lists()).toEqual([]);
    expect(bgNames()).toEqual(['hero_video_0123456789ab.mp4', 'hero_video_ba9876543210.webm']);
  });

  it('the sweep keeps the stored video and poster by file name, whatever host, slashes or query their link has', async () => {
    // S3_PUBLIC_URL changed since the upload (CDN, custom domain, http → https) or had a trailing slash then
    const cases: [string, string, string, string][] = [
      ['https://cdn.garudanexa.test/assets/bg/hero_video_111111111111.mp4', 'http://s3.test/bucket/assets/bg/hero_poster_111111111111.jpg', 'hero_video_111111111111.mp4', 'hero_poster_111111111111.jpg'],
      [`${S3}//assets/bg/hero_video_222222222222.webm`, `${S3}//assets/bg/hero_poster_222222222222.png`, 'hero_video_222222222222.webm', 'hero_poster_222222222222.png'],
      [`${S3}/assets/bg/hero_video_333333333333.mp4?v=2`, `${S3}/assets/bg/hero_poster_333333333333.webp#top`, 'hero_video_333333333333.mp4', 'hero_poster_333333333333.webp'],
      ['/assets/bg/hero_video_444444444444.mp4', `${S3}/assets/bg/hero_poster_444444444444.jpg/`, 'hero_video_444444444444.mp4', 'hero_poster_444444444444.jpg'],
    ];
    for (const [video, poster, ...live] of cases) {
      bucket.clear();
      s3Send.mockClear();
      // Unreferenced old uploads still go
      for (const file of [...live, 'hero_video_999999999999.mp4', 'hero_poster_999999999999.jpg']) putObject(file, 2 * DAY);
      await saveNode({ hero_bg_mode: 'video' }, { hero_bg_video: video, hero_bg_video_poster: poster });
      expect(bgNames(), video).toEqual([...live].sort());
      expect(deletes().sort(), video).toEqual(['assets/bg/hero_poster_999999999999.jpg', 'assets/bg/hero_video_999999999999.mp4']);
    }
  });

  it('checks that a changed link to a generated file exists also with "//", another host or a query', async () => {
    const stored = { hero_bg_video: OLD_VIDEO, hero_bg_video_poster: OLD_POSTER };
    const links = [`${S3}//assets/bg/hero_video_ba9876543210.webm`, 'https://cdn.garudanexa.test/assets/bg/hero_video_ba9876543210.webm', `${NEW_VIDEO}?v=2`];
    for (const video of links) {
      bucket.clear();
      expect(await outcomeOf(hm.prepareHeroMediaSettings({ hero_bg_video: video }, fakePool(stored))), video).toEqual({ status: 409, error: STALE_ERROR });
      putObject('hero_video_ba9876543210.webm', HOUR);
      expect(await outcomeOf(hm.prepareHeroMediaSettings({ hero_bg_video: video }, fakePool(stored))), video).toEqual({ status: 200 });
    }
    expect(sent().filter((c) => c.type === 'HeadObjectCommand').map((c) => c.Key)).toEqual(Array(6).fill('assets/bg/hero_video_ba9876543210.webm'));
  });

  it('a trailing slash on S3_PUBLIC_URL (or S3_ENDPOINT) never puts "//" in a new upload URL', async () => {
    const before = { url: process.env.S3_PUBLIC_URL, endpoint: process.env.S3_ENDPOINT };
    const restore = (name: 'S3_PUBLIC_URL' | 'S3_ENDPOINT', value: string | undefined) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    };
    try {
      // s3-client.js reads both when it is imported
      process.env.S3_PUBLIC_URL = `${S3}//`;
      vi.resetModules();
      const s3 = await import('../../backend/s3-client.js');
      const fresh = await import('../../backend/modules/hero_media.js');
      expect(s3.S3_PUBLIC_URL).toBe(S3);
      expect(await s3.uploadToS3(PNG, 'assets/bg/hero.png', 'image/png')).toBe(`${S3}/assets/bg/hero.png`);
      const settings: Settings = { hero_bg_video_poster: PNG_URI };
      await fresh.prepareHeroMediaSettings(settings, fakePool());
      expect(settings.hero_bg_video_poster).toMatch(/^https:\/\/s3\.test\/bucket\/assets\/bg\/hero_poster_[0-9a-f]{12}\.png$/);
      const video = mp4('isom');
      const res = new FakeRes();
      await fresh.handleHeroMediaAction('upload_hero_video', new FakeReq([video], rawHeaders(video)), res, fakePool());
      expect(res.body).toEqual({ success: true, url: expect.stringMatching(/^https:\/\/s3\.test\/bucket\/assets\/bg\/hero_video_[0-9a-f]{12}\.mp4$/) });

      // Default public URL: S3_ENDPOINT/S3_BUCKET
      delete process.env.S3_PUBLIC_URL;
      process.env.S3_ENDPOINT = 'https://s3.test/';
      vi.resetModules();
      const byEndpoint = await import('../../backend/s3-client.js');
      expect(await byEndpoint.uploadToS3(PNG, 'assets/bg/hero.png', 'image/png')).toBe('https://s3.test/garudanexa/assets/bg/hero.png');
    } finally {
      restore('S3_PUBLIC_URL', before.url);
      restore('S3_ENDPOINT', before.endpoint);
      vi.resetModules();
    }
  });

  it('a failed request removes the files it stored, except one a saved setting points to', async () => {
    const settings = () => ({ hero_images: JSON.stringify([PNG_URI, '/assets/bg/hero.png']), hero_bg_video_poster: dataUri(JPEG) });
    const first = await saveNode(settings(), {}, { fail: true });
    expect(puts()).toHaveLength(2);
    expect(deletes().sort()).toEqual(puts().map((p) => p.Key).sort());
    expect(bgNames()).toEqual([]);
    expect(first.pool.queries).toEqual([STORED_SQL, SAVED_FILES_SQL]);

    // The poster row was saved before the failure: its file stays, the slide goes
    const second = await saveNode(settings(), {}, { fail: true, savedBeforeFailure: ['hero_bg_video_poster'] });
    expect(bgNames()).toEqual([String(second.settings.hero_bg_video_poster).slice(`${S3}/assets/bg/`.length)]);
    bucket.clear();
    const third = await saveNode(settings(), {}, { fail: true, savedBeforeFailure: ['hero_images'] });
    expect(bgNames()).toEqual([JSON.parse(String(third.settings.hero_images))[0].slice(`${S3}/assets/bg/`.length)]);
  });

  it('an upload that fails halfway removes what this request already uploaded', async () => {
    s3Send.mockImplementation(async (cmd) => {
      if (cmd.constructor.name === 'PutObjectCommand' && puts().length > 1) throw new Error('S3 down');
      return fakeS3(cmd);
    });
    await expect(hm.prepareHeroMediaSettings({ hero_images: JSON.stringify([PNG_URI, PNG_URI]) }, fakePool())).rejects.toThrow('S3 down');
    expect(deletes().sort()).toEqual(puts().map((p) => p.Key).sort());
    expect(bgNames()).toEqual([]);
  });

  it('generatedKey only accepts generated names directly in /assets/bg/ of an http(s) URL', () => {
    expect(hm.generatedKey(OLD_VIDEO, hm.GENERATED_VIDEO)).toBe('assets/bg/hero_video_0123456789ab.mp4');
    expect(hm.generatedKey(`${S3}/assets/bg/hero_video_0123456789ab.webm`, hm.GENERATED_VIDEO)).toBe('assets/bg/hero_video_0123456789ab.webm');
    expect(hm.generatedKey(OLD_POSTER, hm.GENERATED_POSTER)).toBe('assets/bg/hero_poster_0123456789ab.jpg');
    expect(hm.generatedKey(OLD_POSTER, hm.GENERATED_VIDEO)).toBeNull();
    expect(hm.generatedKey(OLD_VIDEO, hm.GENERATED_POSTER)).toBeNull();
    for (const ext of ['gif', 'svg', 'ico']) expect(hm.generatedKey(`${S3}/assets/bg/hero_poster_0123456789ab.${ext}`, hm.GENERATED_POSTER)).toBeNull();
    // Any host (S3_PUBLIC_URL may have changed: CDN, custom domain, http → https), repeated slashes, query, fragment
    const same = [
      `${S3}//assets/bg/hero_video_0123456789ab.mp4`, `${S3}/assets//bg///hero_video_0123456789ab.mp4`, `${OLD_VIDEO}?x=1`, `${OLD_VIDEO}#t=2`,
      'https://evil.test/assets/bg/hero_video_0123456789ab.mp4', `${S3}2/assets/bg/hero_video_0123456789ab.mp4`, 'HTTP://cdn.test/assets/bg/hero_video_0123456789ab.mp4',
      '//cdn.test/bucket/assets/bg/hero_video_0123456789ab.mp4',
    ];
    for (const value of same) expect(hm.generatedKey(value, hm.GENERATED_VIDEO), value).toBe('assets/bg/hero_video_0123456789ab.mp4');
    const other = [
      undefined, null, 5, '', `${OLD_VIDEO}\n`, ` ${OLD_VIDEO}`, '/assets/bg/hero_video_0123456789ab.mp4', 'assets/bg/hero_video_0123456789ab.mp4',
      `${S3}/assets/bg/sub/hero_video_0123456789ab.mp4`, `${S3}/assets/product/hero_video_0123456789ab.mp4`, `${S3}/assets/bg/hero_video_0123456789ab.mp4/`,
      `${S3}/x?/assets/bg/hero_video_0123456789ab.mp4`, 'ftp://cdn.test/assets/bg/hero_video_0123456789ab.mp4', 'https://cdn.test',
    ];
    for (const value of other) expect(hm.generatedKey(value, hm.GENERATED_VIDEO), String(value)).toBeNull();
  });

  it('linkName is the last path segment of a link, without query or fragment', () => {
    const cases: [unknown, string][] = [
      [OLD_VIDEO, 'hero_video_0123456789ab.mp4'], [`${S3}//assets/bg/a.mp4?v=1#t`, 'a.mp4'], ['/assets/bg/a.mp4#x?y', 'a.mp4'], ['a.mp4', 'a.mp4'],
      ['https://cdn.test/a.mp4/', 'a.mp4'], ['', ''], ['?x=/a.mp4', ''], [null, ''], [5, ''],
      // A stored link with stray whitespace still names (and so protects) its file
      [' /assets/bg/hero_video_0123456789ab.mp4\n', 'hero_video_0123456789ab.mp4'], ['\t/assets/bg/b.webm  ', 'b.webm'],
    ];
    for (const [value, name] of cases) expect(hm.linkName(value), String(value)).toBe(name);
  });
});

describe('SVG uploads (Node, s3-client.js)', () => {
  it.each(SVG_CASES)('%s', (_name, text, active) => {
    expect(svgHasActiveContent(text)).toBe(active);
  });

  it('refuses javascript: hidden behind character references on every image path', async () => {
    const svg = Buffer.from(link('&#106;avascript:alert(document.domain)'));
    expect(() => parseUpload(dataUri(svg, 'image/svg+xml'))).toThrow(SVG_ERROR);
    // e.g. services_data / hero_logos in server.js
    await expect(uploadBase64ToS3(dataUri(svg, 'image/svg+xml'), 'services')).rejects.toMatchObject({ status: 400, message: SVG_ERROR });
    expect(puts()).toEqual([]);
    expect(await uploadBase64ToS3(dataUri(SAFE_SVG, 'image/svg+xml'), 'services')).toMatch(/^https:\/\/s3\.test\/bucket\/assets\/services\/services_[0-9a-z_]+\.svg$/);
  });

  it('sniffs like api.php: only ASCII whitespace before the markup is skipped', () => {
    expect(parseUpload(dataUri(Buffer.concat([Buffer.from('﻿ \t\r\n\0\u000b'), SAFE_SVG]))).ext).toBe('svg');
    expect(() => parseUpload(dataUri(Buffer.concat([Buffer.from(' '), SAFE_SVG])))).toThrow('Hanya file gambar');
  });
});

describe('access and deploy config', () => {
  const listOf = (source: string, name: string) => {
    const block = source.match(new RegExp(`${name}\\s*=\\s*(?:new Set\\()?\\[([\\s\\S]*?)\\]`));
    if (!block) throw new Error(`${name} not found`);
    return [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  };

  it('both actions are in no action list of either backend, so the default staff rule applies', () => {
    for (const source of [API_PHP, SECURITY_JS]) {
      for (const name of ['PUBLIC_ACTIONS', 'CUSTOMER_ACTIONS', 'ADMIN_ACTIONS']) {
        for (const action of ['upload_hero_video', 'get_hero_media_limits']) expect(listOf(source, name)).not.toContain(action);
      }
    }
    expect(hm.HERO_MEDIA_ACTIONS).toEqual(['upload_hero_video', 'get_hero_media_limits']);
  });

  it('both backends dispatch them only after the token check and pass hero_media_base on', () => {
    const authAt = API_PHP.indexOf('$authUser = authorize_request(');
    expect(authAt).toBeGreaterThan(0);
    expect(API_PHP).toContain("require_once __DIR__ . '/modules/hero_media.php';");
    expect(API_PHP.indexOf('handle_hero_media_action($conn')).toBeGreaterThan(authAt);
    const phpCase = API_PHP.slice(API_PHP.indexOf("case 'update_settings':"), API_PHP.indexOf("case 'get_projects':"));
    expect(phpCase).toContain("$finishHeroMedia = hero_media_prepare_settings($conn, $settings, $input['hero_media_base'] ?? null);");
    // Failure path inside the catch, sweep after the last database write
    expect(phpCase.indexOf('$finishHeroMedia(false);')).toBeGreaterThan(phpCase.indexOf('catch (Throwable $e)'));
    expect(phpCase.indexOf('$finishHeroMedia(true);')).toBeGreaterThan(phpCase.lastIndexOf('db_run('));

    const gateAt = SERVER_JS.indexOf("app.use(['/api.php', '/api'], createAuthGate(pool))");
    expect(gateAt).toBeGreaterThan(0);
    // Same action lookup as the gate, so a body action cannot differ from the one that was checked; GET and POST
    const getAt = SERVER_JS.indexOf("app.get('/api.php'");
    const postAt = SERVER_JS.indexOf("app.post('/api.php'");
    const call = 'handleHeroMediaAction(actionOf(req), req, res, pool)';
    expect(SERVER_JS.indexOf(call, getAt)).toBeGreaterThan(gateAt);
    expect(SERVER_JS.indexOf(call, getAt)).toBeLessThan(postAt);
    expect(SERVER_JS.indexOf(call, postAt)).toBeGreaterThan(postAt);
    const nodeCase = SERVER_JS.slice(SERVER_JS.indexOf("case 'update_settings':"), SERVER_JS.indexOf("case 'add_project':"));
    expect(nodeCase).toContain('const finishHeroMedia = await prepareHeroMediaSettings(settings, pool, input.hero_media_base);');
    expect(nodeCase.indexOf('await finishHeroMedia(false);')).toBeGreaterThan(nodeCase.indexOf('} catch (err) {'));
    expect(nodeCase.indexOf('await finishHeroMedia(allSuccess);')).toBeGreaterThan(nodeCase.indexOf('res.json({ success: allSuccess'));
  });

  it('cPanel serves the videos with their MIME type and a long cache; dev uploads stay out of git and the deploy', () => {
    const htaccess = read('deploy', 'cpanel', 'htaccess');
    expect(htaccess).toMatch(/^\s*AddType video\/mp4 \.mp4$/m);
    expect(htaccess).toMatch(/^\s*AddType video\/webm \.webm$/m);
    expect(htaccess).toMatch(/^\s*ExpiresByType video\/mp4 "access plus 1 year"$/m);
    expect(htaccess).toMatch(/^\s*ExpiresByType video\/webm "access plus 1 year"$/m);
    const gitignore = read('.gitignore').split(/\r?\n/);
    for (const line of ['public/assets/bg/hero_video_*', 'public/assets/bg/hero_poster_*', 'public/assets/bg/.hero_video_*']) expect(gitignore).toContain(line);
    expect(read('scripts', 'deploy-cpanel.mjs')).toContain("const EXCLUDE_FILES = ['assets/bg/hero_video_*', 'assets/bg/hero_poster_*', 'assets/bg/.hero_video_*'];");
    expect(read('docker-compose.yml')).toContain('- UPLOAD_MAX_VIDEO_MB=${UPLOAD_MAX_VIDEO_MB:-30}');
    expect(read('.env.example')).toMatch(/^UPLOAD_MAX_VIDEO_MB=30$/m);
  });
});

// ── PHP: the real module with api.php's helpers ──
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo extension_loaded("mysqli") ? "ok" : "no";'], { encoding: 'utf8' }).stdout === 'ok';
const MODULE_PHP = join(ROOT, 'backend', 'modules', 'hero_media.php');

function apiPhpBlock(pattern: string) {
  const match = API_PHP.match(new RegExp(`^${pattern}[\\s\\S]*?^}\\r?$`, 'm'));
  if (!match) throw new Error(`${pattern} not found in backend/api.php`);
  return match[0];
}
function apiPhpConst(name: string) {
  const match = API_PHP.match(new RegExp(`^const ${name} = [\\s\\S]*?;\\r?$`, 'm'));
  if (!match) throw new Error(`const ${name} not found in backend/api.php`);
  return match[0];
}
const API_HELPERS = [
  'class ApiError ',
  ...['env_value', 'upload_limit_bytes', 'sniff_image', 'safe_stem', 'svg_has_active_content', 'parse_upload', 'safe_link', 'save_base64_asset', 'delete_local_asset']
    .map((name) => `function ${name}\\(`),
].map(apiPhpBlock).join('\n');
// The real access check (lists and authorize_request); authenticate() is stubbed in the harness
const GATE_HELPERS = [
  ...['PUBLIC_ACTIONS', 'ANY_ROLE_ACTIONS', 'CUSTOMER_ACTIONS', 'ADMIN_ACTIONS', 'STAFF_ROLES', 'USER_ROLES'].map(apiPhpConst),
  ...['in_int', 'contains_script_url', 'authorize_request', 'sets_contract_value'].map((name) => apiPhpBlock(`function ${name}\\(`)),
].join('\n');

// hero_settings in memory ($GLOBALS['__store']): answers the module's SELECT ... WHERE setting_key IN ('a', 'b'), and
// a SELECT without such a list (get_settings) with every row, minus the pd_* ones when it filters them like api.php
const DB_STUB = String.raw`
function db_all($conn, $sql, array $params = []) {
    $GLOBALS['__queries'][] = $sql;
    $keys = preg_match('/setting_key IN \(([^)]*)\)/', $sql, $in) && preg_match_all("/'([a-z_]+)'/", $in[1], $m)
        ? $m[1] : array_keys($GLOBALS['__store']);
    $hidePd = strpos($sql, "LEFT(setting_key, 3) <> 'pd_'") !== false;
    $rows = [];
    foreach ($keys as $key) {
        if ($hidePd && stripos((string)$key, 'pd_') === 0) continue;
        if (array_key_exists($key, $GLOBALS['__store'])) $rows[] = ['setting_key' => $key, 'setting_value' => $GLOBALS['__store'][$key]];
    }
    return $rows;
}
`;

// case 'get_settings' of api.php as it is, up to its break
const GET_SETTINGS_CASE = (() => {
  const match = API_PHP.match(/^[ \t]*case 'get_settings':[\s\S]*?^[ \t]*break;\r?$/m);
  if (!match) throw new Error("case 'get_settings' not found in backend/api.php");
  return match[0];
})();

const CLI_HARNESS = String.raw`<?php
${API_HELPERS}
${GATE_HELPERS}
function public_dir() { return getenv('HM_PUBLIC_DIR'); }
function authenticate($conn) { return $GLOBALS['__user']; }
${DB_STUB}
require getenv('HM_MODULE');

$req = json_decode(stream_get_contents(STDIN), true);
$GLOBALS['__queries'] = [];
$GLOBALS['__store'] = $req['store'] ?? [];
$GLOBALS['__user'] = $req['user'] ?? null;
switch ($req['op']) {
    case 'sniff':
        $out = array_map(function ($hex) { return hm_sniff_video(hex2bin($hex)); }, $req['inputs']);
        break;
    case 'names':
        $out = array_map(function ($p) { return [hm_generated_name($p, HM_GENERATED_VIDEO), hm_generated_name($p, HM_GENERATED_POSTER)]; }, $req['inputs']);
        break;
    case 'mode':
        $out = array_map('hm_bg_mode', $req['inputs']);
        break;
    case 'link_names':
        $out = array_map('hm_link_name', $req['inputs']);
        break;
    case 'get_settings':
        $conn = mysqli_init();
        ob_start();
        switch ('get_settings') {
${GET_SETTINGS_CASE}
        }
        $out = ['raw' => ob_get_clean()];
        break;
    case 'svg':
        $out = array_map('svg_has_active_content', $req['inputs']);
        break;
    case 'upload':
        $out = array_map(function ($uri) {
            try {
                return ['ext' => parse_upload($uri, false)[1]];
            } catch (ApiError $e) {
                return ['error' => $e->getMessage()];
            }
        }, $req['inputs']);
        break;
    case 'save':
        // update_settings as api.php runs it: prepare, save (all keys, or the ones saved before a failure), finish
        $settings = $req['settings'];
        try {
            $finish = hero_media_prepare_settings(mysqli_init(), $settings, $req['base'] ?? null);
            $out = ['status' => 200, 'settings' => $settings];
            if (!empty($req['fail'])) {
                foreach ($req['savedBeforeFailure'] ?? [] as $key) $GLOBALS['__store'][$key] = $settings[$key];
                $finish(false);
            } elseif (empty($req['prepareOnly'])) {
                foreach ($settings as $key => $value) $GLOBALS['__store'][$key] = is_string($value) ? $value : json_encode($value);
                $finish(true);
            }
        } catch (ApiError $e) {
            $out = ['status' => $e->status, 'error' => $e->getMessage()];
        }
        $out['queries'] = $GLOBALS['__queries'];
        $out['store'] = (object)$GLOBALS['__store'];
        break;
    case 'gate':
        $input = ['action' => $req['action']];
        ob_start();
        try {
            $user = authorize_request(mysqli_init(), $req['action'], $input);
            $handled = handle_hero_media_action(mysqli_init(), $req['action'], $input, $user);
            $out = ['status' => 200, 'handled' => $handled, 'body' => json_decode((string)ob_get_clean(), true)];
        } catch (ApiError $e) {
            ob_end_clean();
            $out = ['status' => $e->status, 'body' => array_filter(['error' => $e->getMessage(), 'code' => $e->errorCode])];
        }
        break;
}
echo json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
`;

const UPLOAD_ROUTER = String.raw`<?php
${API_HELPERS}
function public_dir() { return getenv('HM_PUBLIC_DIR'); }
${DB_STUB}
require getenv('HM_MODULE');
$GLOBALS['__queries'] = [];
$GLOBALS['__store'] = json_decode((string)@file_get_contents(getenv('HM_STORE')), true) ?: [];
set_exception_handler(function ($e) {
    http_response_code($e instanceof ApiError ? $e->status : 500);
    echo json_encode(['error' => $e instanceof ApiError ? $e->getMessage() : 'Terjadi kesalahan pada server. Silakan coba lagi.']);
});
header('Content-Type: application/json');
$action = $_GET['action'] ?? '';
if (!handle_hero_media_action(mysqli_init(), $action, [], ['id' => 1, 'role' => 'user'])) {
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

describe.skipIf(!PHP_AVAILABLE)('hero media PHP ↔ Node parity', () => {
  let harnessDir = '';
  let webRoot = '';
  let bg = '';
  let storeFile = '';
  let php: ChildProcess | null = null;
  let base = '';
  const scratchDirs: string[] = [];

  type CliRequest = Record<string, unknown>;
  const runCli = (request: CliRequest, { publicDir = webRoot, env = {} }: { publicDir?: string; env?: Record<string, string | undefined> } = {}) => {
    const result = spawnSync('php', [join(harnessDir, 'cli.php')], {
      input: JSON.stringify(request),
      encoding: 'utf8',
      env: { ...process.env, HM_MODULE: MODULE_PHP, HM_PUBLIC_DIR: publicDir, ...env },
    });
    if (result.status !== 0 || !result.stdout) throw new Error(`php failed: ${result.stderr || result.stdout}`);
    return JSON.parse(result.stdout);
  };
  type PhpSave = { status: number; error?: string; settings: Record<string, string>; queries: string[]; store: Store };
  const savePhp = (settings: Settings, store: Store = {}, options: SaveOptions & { prepareOnly?: boolean; publicDir?: string } = {}): PhpSave => {
    const { publicDir, ...rest } = options;
    return runCli({ op: 'save', settings, store, ...rest }, { publicDir });
  };
  const bgFiles = (dir = bg) => readdirSync(dir).sort();
  // A fresh web root with assets/bg/<name> files, each `age` ms old
  const webRootWith = (files: [string, number][] = []) => {
    const dir = mkdtempSync(join(tmpdir(), 'gn-hero-media-case-'));
    scratchDirs.push(dir);
    mkdirSync(join(dir, 'assets', 'bg'), { recursive: true });
    for (const [file, age] of files) {
      const path = join(dir, 'assets', 'bg', file);
      writeFileSync(path, 'x');
      const when = new Date(Date.now() - age);
      utimesSync(path, when, when);
    }
    return dir;
  };

  beforeAll(async () => {
    harnessDir = mkdtempSync(join(tmpdir(), 'gn-hero-media-php-'));
    webRoot = mkdtempSync(join(tmpdir(), 'gn-hero-media-web-'));
    bg = join(webRoot, 'assets', 'bg');
    storeFile = join(harnessDir, 'store.json');
    mkdirSync(bg, { recursive: true });
    writeFileSync(join(harnessDir, 'cli.php'), CLI_HARNESS);
    writeFileSync(join(harnessDir, 'router.php'), UPLOAD_ROUTER);
    writeFileSync(storeFile, '{}');
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    // Warnings must not end up in the JSON (e.g. PHP's own multipart parsing of the multipart case)
    php = spawn('php', ['-d', 'display_errors=0', '-S', `127.0.0.1:${port}`, join(harnessDir, 'router.php')], {
      env: { ...process.env, HM_MODULE: MODULE_PHP, HM_PUBLIC_DIR: webRoot, HM_STORE: storeFile, UPLOAD_MAX_VIDEO_MB: LIMIT_MB },
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

  it('sniffs the same video types', () => {
    const phpOut = runCli({ op: 'sniff', inputs: SNIFF_CASES.map(([, bytes]) => bytes.toString('hex')) });
    expect(phpOut).toEqual(SNIFF_CASES.map(([, bytes]) => hm.sniffVideo(bytes)));
  });

  it('recognizes the same generated names', () => {
    const names = [
      'hero_video_0123456789ab.mp4', 'hero_video_0123456789ab.webm', 'hero_video_0123456789AB.mp4', 'hero_video_0123456789a.mp4',
      'hero_video_0123456789abc.mp4', 'hero_video_0123456789ab.mov', 'hero_video_0123456789ab.mp4.php', 'hero_video_0123456789ab.mp4\n',
      'hero_poster_0123456789ab.jpg', 'hero_poster_0123456789ab.png', 'hero_poster_0123456789ab.webp', 'hero_poster_0123456789ab.gif',
      'hero_poster_0123456789ab.svg', 'hero_poster_0123456789ab.ico', 'hero_poster_1729600000000_abc123.jpg',
      'hero_poster_0123456789ab.mp4', 'hero_6a0736659383e_0.jpg', 'hero.png', 'sub/hero_video_0123456789ab.mp4', '../hero_video_0123456789ab.mp4', '',
    ];
    const phpOut: [string | null, string | null][] = runCli({ op: 'names', inputs: names.map((n) => `/assets/bg/${n}`) });
    const nodeOut = names.map((n) => [hm.GENERATED_VIDEO, hm.GENERATED_POSTER].map((p) => hm.generatedKey(`${S3}/assets/bg/${n}`, p)));
    expect(phpOut.map((pair) => pair.map((v) => v !== null))).toEqual(nodeOut.map((pair) => pair.map((v) => v !== null)));
    expect(phpOut[0]).toEqual(['hero_video_0123456789ab.mp4', null]);
    expect(phpOut[8]).toEqual([null, 'hero_poster_0123456789ab.jpg']);
    expect(phpOut.slice(11, 14)).toEqual([[null, null], [null, null], [null, null]]);
    // Only site paths directly in /assets/bg/; S3 URLs belong to the Node backend
    const other: [string | null, string | null][] = runCli({ op: 'names', inputs: [OLD_VIDEO, '/assets/product/hero_video_0123456789ab.mp4', 'assets/bg/hero_video_0123456789ab.mp4', null, 5] });
    expect(other.flat().every((v) => v === null)).toBe(true);
  });

  it('normalizes hero_bg_mode the same way', () => {
    const values = ['default', 'image', 'video', '', 'slideshow', 'VIDEO', ' video', null, 3, ['video'], true];
    expect(runCli({ op: 'mode', inputs: values })).toEqual(values.map((v) => hm.heroBgMode(v)));
  });

  it('finds the same active SVG content', () => {
    const texts = SVG_CASES.map(([, text]) => text);
    expect(runCli({ op: 'svg', inputs: texts })).toEqual(texts.map((text) => svgHasActiveContent(text)));
    // Through the upload check: same type and message
    const uris = SVG_CASES.map(([, text]) => dataUri(Buffer.from(text), 'image/svg+xml'));
    const node = uris.map((uri) => {
      try {
        return { ext: parseUpload(uri).ext };
      } catch (err) {
        return { error: (err as Error).message };
      }
    });
    expect(runCli({ op: 'upload', inputs: uris })).toEqual(node);
    expect(node.filter((out) => out.error === SVG_ERROR).length).toBeGreaterThan(20);
  });

  it('refuses the same values with the same messages, before storing anything', async () => {
    const before = bgFiles();
    for (const settings of [
      { hero_bg_video: 'data:video/mp4;base64,AAAAGGZ0eXBpc29t', hero_bg_video_poster: PNG_URI, hero_images: JSON.stringify([PNG_URI]) },
      { hero_bg_video: '\u0001data:video/mp4;base64,AA==' },
      { hero_bg_video_poster: HTML_URI, hero_images: JSON.stringify([PNG_URI]) },
      { hero_bg_video_poster: dataUri(SAFE_SVG, 'image/svg+xml'), hero_images: JSON.stringify([PNG_URI]) },
      { hero_bg_video_poster: dataUri(GIF, 'image/gif') },
      { hero_bg_video_poster: dataUri(ICO, 'image/x-icon') },
      { hero_bg_video_poster: 'data:image/png,iVBORw0KGgo=' },
      { hero_images: JSON.stringify([HTML_URI]) },
      { hero_images: JSON.stringify([PNG_URI, dataUri(JPEG), dataUri(SAFE_SVG, 'image/svg+xml')]), hero_bg_video_poster: PNG_URI },
      { hero_images: JSON.stringify([PNG_URI, dataUri(ICO)]) },
    ]) {
      const node = await outcomeOf(hm.prepareHeroMediaSettings(structuredClone(settings), fakePool()));
      const phpOut = savePhp(settings);
      expect({ status: phpOut.status, error: phpOut.error }, JSON.stringify(settings)).toEqual(node);
      expect(node.status).toBe(400);
    }
    expect(puts()).toEqual([]);
    expect(bgFiles()).toEqual(before);
  });

  it('stores links, modes, posters and slider images like Node', async () => {
    const settings = {
      hero_bg_mode: 'unknown', hero_bg_video: 'javascript:alert(1)', hero_bg_video_poster: PNG_URI, hero_title: 'Judul',
      hero_images: JSON.stringify([PNG_URI, '/assets/bg/hero.png', 'javascript:alert(1)', 42, dataUri(GIF)]),
    };
    const node = (await prepareNode(structuredClone(settings))).settings;
    const phpOut = savePhp(settings, {}, { prepareOnly: true });
    expect(phpOut.status).toBe(200);
    const asSitePath = (v: unknown) => String(v).replace(`${S3}/`, '/');
    expect(phpOut.settings).toEqual({
      hero_bg_mode: node.hero_bg_mode,
      hero_bg_video: node.hero_bg_video,
      hero_title: 'Judul',
      hero_bg_video_poster: expect.stringMatching(/^\/assets\/bg\/hero_poster_[0-9a-f]{12}\.png$/),
      hero_images: expect.any(String),
    });
    expect(asSitePath(node.hero_bg_video_poster)).toMatch(/^\/assets\/bg\/hero_poster_[0-9a-f]{12}\.png$/);
    expect(readFileSync(join(webRoot, phpOut.settings.hero_bg_video_poster))).toEqual(Buffer.from('iVBORw0KGgo=', 'base64'));
    const phpImages: string[] = JSON.parse(phpOut.settings.hero_images);
    expect(phpImages).toEqual([expect.stringMatching(/^\/assets\/bg\/hero_[0-9a-f]{12}\.png$/), '/assets/bg/hero.png', '', expect.stringMatching(/^\/assets\/bg\/hero_[0-9a-f]{12}\.gif$/)]);
    const nodeImages: string[] = JSON.parse(String(node.hero_images)).map(asSitePath);
    expect(nodeImages.map((v) => v.replace(/[0-9a-f]{12}/, 'HEX'))).toEqual(phpImages.map((v) => v.replace(/[0-9a-f]{12}/, 'HEX')));
    // No database read without the video/poster keys
    expect(savePhp({ hero_bg_mode: 'video' }, {}, { prepareOnly: true }).queries).toEqual([]);
  });

  // ── Stale tab and missing files: "@name" is a generated file in assets/bg (site path in PHP, S3 URL in Node) ──
  type MediaCase = { name: string; stored: Store; settings: Settings; base?: unknown; files: string[]; status: 200 | 409 };
  const V1 = '@hero_video_111111111111.mp4';
  const V2 = '@hero_video_222222222222.mp4';
  const V3 = '@hero_video_333333333333.webm';
  const P1 = '@hero_poster_111111111111.jpg';
  const P2 = '@hero_poster_222222222222.png';
  const name = (value: string) => value.slice(1);
  const MEDIA_CASES: MediaCase[] = [
    { name: 'stale video base', stored: { hero_bg_video: V2 }, settings: { hero_bg_video: V3 }, base: { video: V1, poster: '' }, files: [V2, V3], status: 409 },
    { name: 'stale removal', stored: { hero_bg_video: V2 }, settings: { hero_bg_video: '' }, base: { video: V1, poster: '' }, files: [V2], status: 409 },
    { name: 'stale poster base, new data: poster', stored: { hero_bg_video_poster: P2 }, settings: { hero_bg_video_poster: PNG_URI }, base: { video: '', poster: P1 }, files: [P2], status: 409 },
    { name: 'nothing stored, base has a video', stored: {}, settings: { hero_bg_video: V3 }, base: { video: V1 }, files: [V3], status: 409 },
    { name: 'current base', stored: { hero_bg_video: V1 }, settings: { hero_bg_video: V3 }, base: { video: V1, poster: '' }, files: [V1, V3], status: 200 },
    { name: 'no base', stored: { hero_bg_video: V2 }, settings: { hero_bg_video: V3 }, files: [V3], status: 200 },
    { name: 'nothing stored counts as ""', stored: {}, settings: { hero_bg_video: V3 }, base: { video: '', poster: '' }, files: [V3], status: 200 },
    { name: 'stale key not sent', stored: { hero_bg_video: V2, hero_bg_video_poster: P1 }, settings: { hero_bg_video_poster: '' }, base: { video: V1, poster: P1 }, files: [], status: 200 },
    { name: 'base values that are not strings', stored: { hero_bg_video: V2 }, settings: { hero_bg_video: V3 }, base: { video: null, poster: 5 }, files: [V3], status: 200 },
    { name: 'base that is not an object', stored: { hero_bg_video: V2 }, settings: { hero_bg_video: V3 }, base: 'x', files: [V3], status: 200 },
    { name: 'missing generated video', stored: {}, settings: { hero_bg_video: V3 }, files: [], status: 409 },
    { name: 'missing generated poster link', stored: { hero_bg_video_poster: P1 }, settings: { hero_bg_video_poster: P2 }, files: [P1], status: 409 },
    { name: 'unchanged, even if the file is gone', stored: { hero_bg_video: V1, hero_bg_video_poster: P1 }, settings: { hero_bg_video: V1, hero_bg_video_poster: P1 }, files: [], status: 200 },
    { name: 'removal', stored: { hero_bg_video: V1, hero_bg_video_poster: P1 }, settings: { hero_bg_video: '', hero_bg_video_poster: '' }, base: { video: V1, poster: P1 }, files: [], status: 200 },
    { name: 'not generated names are not looked up', stored: {}, settings: { hero_bg_video: '@hero_video_custom.mp4', hero_bg_video_poster: '@hero_poster_111111111111.svg' }, files: [], status: 200 },
    // A retry that changes nothing undoes nothing: the stale base of an unchanged key is not compared
    { name: 'retry that changes nothing, stale base', stored: { hero_bg_video: V2, hero_bg_video_poster: P1 }, settings: { hero_bg_video: V2, hero_bg_video_poster: P1 }, base: { video: V1, poster: P2 }, files: [V2, P1], status: 200 },
    { name: 'unchanged video with a stale base, changed poster with a current base', stored: { hero_bg_video: V2, hero_bg_video_poster: P1 }, settings: { hero_bg_video: V2, hero_bg_video_poster: '' }, base: { video: V1, poster: P1 }, files: [V2, P1], status: 200 },
    { name: 'unchanged video does not excuse a stale poster base', stored: { hero_bg_video: V2, hero_bg_video_poster: P1 }, settings: { hero_bg_video: V2, hero_bg_video_poster: '' }, base: { video: V2, poster: P2 }, files: [V2, P1], status: 409 },
    { name: 'a data: poster is always compared', stored: { hero_bg_video_poster: P1 }, settings: { hero_bg_video_poster: PNG_URI }, base: { video: '', poster: P2 }, files: [P1], status: 409 },
  ];

  it.each(MEDIA_CASES.map((c) => [c.name, c] as const))('%s answers like Node', async (_name, c) => {
    const as = (prefix: string) => (value: unknown): unknown => {
      if (typeof value === 'string' && value.startsWith('@')) return `${prefix}${name(value)}`;
      if (value && typeof value === 'object' && !Array.isArray(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, as(prefix)(v)]));
      return value;
    };
    const phpValue = as('/assets/bg/');
    const nodeValue = as(`${S3}/assets/bg/`);
    const dir = webRootWith(c.files.map((file) => [name(file), HOUR]));
    for (const file of c.files) putObject(name(file), HOUR);
    const phpOut = savePhp(phpValue(c.settings) as Settings, phpValue(c.stored) as Store, { base: phpValue(c.base), prepareOnly: true, publicDir: dir });
    const node = await outcomeOf(hm.prepareHeroMediaSettings(nodeValue(c.settings) as Settings, fakePool(nodeValue(c.stored) as Store), nodeValue(c.base)));
    expect({ status: phpOut.status, error: phpOut.error }).toEqual(node);
    expect(node.status).toBe(c.status);
    if (c.status === 409) {
      expect(node.error).toBe(STALE_ERROR);
      expect(bgFiles(join(dir, 'assets', 'bg'))).toEqual(c.files.map(name).sort());
      expect(puts()).toEqual([]);
    }
  });

  it('sweeps the same files after a successful save, and nothing after a failed one', async () => {
    const files: [string, number][] = [
      ['hero_video_111111111111.mp4', 2 * DAY], // stored
      ['hero_poster_111111111111.jpg', 2 * DAY], // stored
      ['hero_video_222222222222.webm', 2 * DAY],
      ['hero_poster_222222222222.webp', 25 * HOUR],
      ['hero_video_333333333333.mp4', 23 * HOUR],
      ['hero_poster_333333333333.png', HOUR],
      ['hero_poster_444444444444.svg', 2 * DAY],
      ['hero_video_0123456789AB.mp4', 2 * DAY],
      ['hero_video_custom.mp4', 2 * DAY],
      ['hero_video_555555555555.mp4.bak', 2 * DAY],
      ['hero_aaaaaaaaaaaa.png', 2 * DAY],
      ['hero.png', 2 * DAY],
    ];
    // PHP only: temp files of uploads (an hour), other dot files stay
    const temp: [string, number][] = [['.hero_video_666666666666.part', 2 * HOUR], ['.hero_video_777777777777.part', 10 * 60 * 1000], ['.hero_video_custom.part', 2 * HOUR], ['.htaccess', 2 * DAY]];
    const phpStore = { hero_bg_video: '/assets/bg/hero_video_111111111111.mp4', hero_bg_video_poster: '/assets/bg/hero_poster_111111111111.jpg' };
    const nodeStore = { hero_bg_video: `${S3}/assets/bg/hero_video_111111111111.mp4`, hero_bg_video_poster: `${S3}/assets/bg/hero_poster_111111111111.jpg` };

    const failed = webRootWith([...files, ...temp]);
    expect(savePhp({ hero_bg_mode: 'video' }, phpStore, { fail: true, publicDir: failed }).status).toBe(200);
    expect(bgFiles(join(failed, 'assets', 'bg'))).toHaveLength(files.length + temp.length);

    const dir = webRootWith([...files, ...temp]);
    const phpOut = savePhp({ hero_bg_mode: 'video' }, phpStore, { publicDir: dir });
    expect(phpOut.queries).toEqual([STORED_SQL]);
    for (const [file, age] of files) putObject(file, age);
    await saveNode({ hero_bg_mode: 'video' }, nodeStore);
    const phpLeft = bgFiles(join(dir, 'assets', 'bg'));
    expect(phpLeft.filter((file) => !file.startsWith('.'))).toEqual(bgNames());
    expect(bgNames()).toEqual(files.map(([file]) => file).filter((file) => !['hero_video_222222222222.webm', 'hero_poster_222222222222.webp'].includes(file)).sort());
    expect(phpLeft.filter((file) => file.startsWith('.'))).toEqual(['.hero_video_777777777777.part', '.hero_video_custom.part', '.htaccess']);
  });

  it('sweeps by file name like Node: the stored video and poster stay whatever host, slashes or query their link has', async () => {
    // Full URL of the site (moved to another domain), query/fragment, repeated or trailing slashes, an S3 URL
    const cases: [string, string, string, string][] = [
      ['https://garudanexa.test/assets/bg/hero_video_111111111111.mp4', 'http://old.garudanexa.test/assets/bg/hero_poster_111111111111.jpg', 'hero_video_111111111111.mp4', 'hero_poster_111111111111.jpg'],
      ['/assets/bg/hero_video_222222222222.webm?v=2', '/assets/bg/hero_poster_222222222222.png#top', 'hero_video_222222222222.webm', 'hero_poster_222222222222.png'],
      ['/assets//bg//hero_video_333333333333.mp4', '//cdn.garudanexa.test/assets/bg/hero_poster_333333333333.webp/', 'hero_video_333333333333.mp4', 'hero_poster_333333333333.webp'],
      [`${S3}/assets/bg/hero_video_444444444444.mp4`, `${S3}//assets/bg/hero_poster_444444444444.jpg`, 'hero_video_444444444444.mp4', 'hero_poster_444444444444.jpg'],
    ];
    for (const [video, poster, ...live] of cases) {
      const files: [string, number][] = [...live, 'hero_video_999999999999.mp4', 'hero_poster_999999999999.jpg'].map((file) => [file, 2 * DAY]);
      const dir = webRootWith(files);
      const store = { hero_bg_video: video, hero_bg_video_poster: poster };
      expect(savePhp({ hero_bg_mode: 'video' }, store, { publicDir: dir }).status).toBe(200);
      bucket.clear();
      for (const [file, age] of files) putObject(file, age);
      await saveNode({ hero_bg_mode: 'video' }, store);
      expect(bgFiles(join(dir, 'assets', 'bg')), video).toEqual([...live].sort());
      expect(bgNames(), video).toEqual([...live].sort());
    }
  });

  it('reads the same file name from a link', () => {
    const values = [
      '/assets/bg/hero_video_0123456789ab.mp4', `${S3}//assets/bg/a.mp4?v=1#t`, '/assets/bg/a.mp4#x?y', 'a.mp4', 'https://cdn.test/a.mp4/', '//cdn.test//a.mp4//',
      '', '?x=/a.mp4', '#/a.mp4', '/', 'https://cdn.test/assets/bg/hero_poster_0123456789ab.jpg?name=/x.jpg', null, 5,
      ' /assets/bg/hero_video_0123456789ab.mp4\n', '\t/assets/bg/b.webm  ',
    ];
    expect(runCli({ op: 'link_names', inputs: values })).toEqual(values.map((value) => hm.linkName(value)));
  });

  it('get_settings answers a JSON object like Node, also for an empty table', () => {
    // server.js: res.json of an object filled row by row, {} when nothing is stored
    const nodeCase = SERVER_JS.slice(SERVER_JS.indexOf("if (action === 'get_settings')"), SERVER_JS.indexOf("if (action === 'get_users')"));
    expect(nodeCase).toContain('const settings = {};');
    expect(nodeCase).toContain('res.json(settings);');
    expect(runCli({ op: 'get_settings', store: {} }).raw).toBe('{}');
    const store = { hero_title: 'Judul', hero_bg_mode: 'video' };
    expect(JSON.parse(runCli({ op: 'get_settings', store }).raw)).toEqual(store);
    // Project-document settings (pd_*) are read through pd_settings_get only, in both backends
    expect(nodeCase).toContain("WHERE LEFT(setting_key, 3) <> 'pd_'");
    expect(JSON.parse(runCli({ op: 'get_settings', store: { ...store, pd_company: '{}', PD_TAX: '11' } }).raw)).toEqual(store);
    // Keys that look like list indexes stay an object too
    expect(JSON.parse(runCli({ op: 'get_settings', store: { 0: 'a', 1: 'b' } }).raw)).toEqual({ 0: 'a', 1: 'b' });
  });

  it('removes the files of a failed request like Node, except one a saved setting points to', async () => {
    const settings = { hero_images: JSON.stringify([PNG_URI, '/assets/bg/hero.png']), hero_bg_video_poster: dataUri(JPEG) };
    for (const saved of [[], ['hero_bg_video_poster'], ['hero_images']]) {
      bucket.clear();
      const dir = webRootWith();
      const phpOut = savePhp(settings, {}, { fail: true, savedBeforeFailure: saved, publicDir: dir });
      const node = await saveNode(structuredClone(settings), {}, { fail: true, savedBeforeFailure: saved });
      const kept = (value: unknown) => [String(value).replace(/^.*\/assets\/bg\//, '')];
      const phpExpected = saved.length === 0 ? [] : kept(saved[0] === 'hero_images' ? JSON.parse(phpOut.settings.hero_images)[0] : phpOut.settings.hero_bg_video_poster);
      const nodeExpected = saved.length === 0 ? [] : kept(saved[0] === 'hero_images' ? JSON.parse(String(node.settings.hero_images))[0] : node.settings.hero_bg_video_poster);
      expect(bgFiles(join(dir, 'assets', 'bg')), JSON.stringify(saved)).toEqual(phpExpected);
      expect(bgNames(), JSON.stringify(saved)).toEqual(nodeExpected);
      expect(phpOut.queries).toEqual(node.pool.queries);
    }
  });

  it('get_hero_media_limits: same access check and answer', async () => {
    for (const role of [null, 'customer', 'user', 'admin']) {
      for (const [value, mb] of LIMIT_ENV_CASES) {
        const phpOut = runCli({ op: 'gate', action: 'get_hero_media_limits', user: role ? { id: 3, role, status: 'active' } : null }, { env: { UPLOAD_MAX_VIDEO_MB: value } });
        const node = await withVideoLimit(value, () => limitsNode(role));
        expect({ status: phpOut.status, body: phpOut.body }, `${role} ${value}`).toEqual(node);
        if (role === 'user' || role === 'admin') expect(node.body).toEqual({ success: true, video_max_mb: mb, max_images: 12 });
      }
    }
  });

  // ── upload_hero_video behind php -S (UPLOAD_MAX_VIDEO_MB = 0.01) ──
  type UploadOutcome = { status: number; body: Record<string, unknown> };
  const normalize = (out: UploadOutcome): UploadOutcome => ({
    status: out.status,
    body: typeof out.body.url === 'string' ? { ...out.body, url: out.body.url.replace(`${S3}/`, '/').replace(/[0-9a-f]{12}/, 'HEX') } : out.body,
  });

  async function uploadPhp(bytes: Buffer, headers: Record<string, string> = { 'Content-Type': 'video/mp4' }, method = 'POST'): Promise<UploadOutcome> {
    const res = await fetch(`${base}/api.php?action=upload_hero_video`, { method, headers, body: method === 'POST' ? new Uint8Array(bytes) : undefined });
    return { status: res.status, body: JSON.parse(await res.text()) };
  }

  const UPLOAD_CASES: [string, Buffer, string][] = [
    ['mp4', mp4('mp42', 3000), 'video/mp4'],
    ['webm', ebml('webm', 3000), 'video/webm'],
    ['exactly the limit', mp4('isom', LIMIT - mp4('isom', 0).length), 'video/mp4'],
    ['one byte over the limit', mp4('isom', LIMIT + 1 - mp4('isom', 0).length), 'video/mp4'],
    ['empty', Buffer.alloc(0), 'video/mp4'],
    ['png', PNG, 'video/mp4'],
    ['quicktime mov', mp4('qt  '), 'video/quicktime'],
    ['matroska', ebml('matroska'), 'video/webm'],
    ['json', Buffer.from(JSON.stringify({ action: 'upload_hero_video' })), 'application/json'],
    ['multipart', Buffer.from('--x\r\nContent-Disposition: form-data; name="file"\r\n\r\n'), 'multipart/form-data; boundary=x'],
  ];

  it.each(UPLOAD_CASES)('upload %s answers like Node', async (_name, bytes, type) => {
    const before = bgFiles();
    const phpOut = await uploadPhp(bytes, { 'Content-Type': type });
    process.env.UPLOAD_MAX_VIDEO_MB = LIMIT_MB;
    let nodeOut: UploadOutcome;
    try {
      nodeOut = await uploadNode(new FakeReq(chunks(bytes), { 'content-type': type, 'content-length': String(bytes.length) }));
    } finally {
      delete process.env.UPLOAD_MAX_VIDEO_MB;
    }
    expect(normalize(phpOut)).toEqual(normalize(nodeOut));
    const added = bgFiles().filter((file) => !before.includes(file));
    if (phpOut.status === 200) {
      // The stored file has the uploaded bytes and no temporary file is left
      expect(phpOut.body.url).toMatch(/^\/assets\/bg\/hero_video_[0-9a-f]{12}\.(mp4|webm)$/);
      expect(added).toEqual([String(phpOut.body.url).slice('/assets/bg/'.length)]);
      expect(Buffer.compare(readFileSync(join(webRoot, String(phpOut.body.url))), bytes)).toBe(0);
    } else {
      expect(added).toEqual([]);
    }
  });

  it('a successful upload runs the sweep, a refused one does not', async () => {
    const old: [string, number][] = [['hero_video_aaaaaaaaaaaa.mp4', 2 * DAY], ['hero_video_bbbbbbbbbbbb.mp4', 2 * DAY], ['.hero_video_cccccccccccc.part', 2 * HOUR]];
    for (const [file, age] of old) {
      writeFileSync(join(bg, file), 'x');
      const when = new Date(Date.now() - age);
      utimesSync(join(bg, file), when, when);
    }
    writeFileSync(storeFile, JSON.stringify({ hero_bg_video: '/assets/bg/hero_video_aaaaaaaaaaaa.mp4' }));
    try {
      expect((await uploadPhp(PNG)).status).toBe(400);
      expect(old.every(([file]) => existsSync(join(bg, file)))).toBe(true);
      const out = await uploadPhp(mp4('isom'));
      expect(out.status).toBe(200);
      expect(existsSync(join(bg, 'hero_video_aaaaaaaaaaaa.mp4'))).toBe(true);
      expect(existsSync(join(bg, 'hero_video_bbbbbbbbbbbb.mp4'))).toBe(false);
      expect(existsSync(join(bg, '.hero_video_cccccccccccc.part'))).toBe(false);
      expect(existsSync(join(webRoot, String(out.body.url)))).toBe(true);
    } finally {
      writeFileSync(storeFile, '{}');
    }
  });

  it('GET is not an upload (falls through to "Invalid action", like server.js)', async () => {
    expect(await uploadPhp(Buffer.alloc(0), {}, 'GET')).toEqual({ status: 400, body: { error: 'Invalid action: upload_hero_video' } });
    const req = new FakeReq([]);
    req.method = 'GET';
    expect(await hm.handleHeroMediaAction('upload_hero_video', req, new FakeRes(), fakePool())).toBe(false);
  });
});
