// @vitest-environment node
// Node environment: backend/s3-client.js imports @aws-sdk/client-s3, which only backend/node_modules has; the SDK is
// mocked below (the real s3-client runs against it), and only the SSR transform leaves that import for the mock.
//
// Hero background of the home page: upload_hero_video takes the raw video bytes (MP4/WebM by magic bytes only, capped
// at UPLOAD_MAX_VIDEO_MB), and update_settings normalizes hero_bg_mode / hero_bg_video / hero_bg_video_poster /
// hero_images and deletes only the generated file a save replaced. The Node module (backend/modules/hero_media.js) and
// the PHP module (backend/modules/hero_media.php) must answer the same; the PHP half runs the real module in the CLI
// (settings, sniffing, names) and behind `php -S` (php://input is only real over HTTP), and is skipped without `php`.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';

const { s3Send, fakeS3Sdk } = vi.hoisted(() => {
  // s3-client.js reads these when it is imported
  Object.assign(process.env, { S3_ACCESS_KEY: 'test-access', S3_SECRET_KEY: 'test-secret', S3_PUBLIC_URL: 'https://s3.test/bucket' });
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
  return { s3Send, fakeS3Sdk };
});

// s3-client.js loads the SDK from backend/node_modules when that folder is installed, otherwise by its bare name.
// Mock both ids, or a checkout with backend/node_modules sends these tests to the real S3.
vi.mock('@aws-sdk/client-s3', () => fakeS3Sdk());
vi.mock('../../backend/node_modules/@aws-sdk/client-s3', () => fakeS3Sdk());

import * as hm from '../../backend/modules/hero_media.js';

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
const IMAGE_ONLY_ERROR = 'Hanya file gambar (PNG, JPG, WEBP, GIF, SVG) yang diizinkan.';
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';
// UPLOAD_MAX_VIDEO_MB for the upload tests: floor(0.01 MB) = 10485 bytes, same in both backends
const LIMIT_MB = '0.01';
const LIMIT = Math.floor(0.01 * 1024 * 1024);
const TOO_LARGE = `Ukuran video maksimal ${LIMIT_MB} MB.`;

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
const RANDOM = Buffer.from(Array.from({ length: 256 }, (_, i) => (i * 73 + 41) % 256));
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

// ── Node: fake request stream and response ──
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

const chunks = (buf: Buffer, size = 1024) => Array.from({ length: Math.ceil(buf.length / size) }, (_, i) => buf.subarray(i * size, (i + 1) * size));
const rawHeaders = (buf: Buffer, type = 'video/mp4') => ({ 'content-type': type, 'content-length': String(buf.length) });

async function uploadNode(req: FakeReq) {
  const res = new FakeRes();
  expect(await hm.handleHeroMediaAction('upload_hero_video', req, res)).toBe(true);
  return { status: res.statusCode, body: res.body as Record<string, unknown>, headers: res.headers };
}

const sent = () => s3Send.mock.calls.map(([cmd]) => ({ type: cmd.constructor.name as string, ...(cmd.input as Record<string, unknown>) }));
const puts = () => sent().filter((c) => c.type === 'PutObjectCommand');
const deletes = () => sent().filter((c) => c.type === 'DeleteObjectCommand').map((c) => c.Key);

beforeEach(() => {
  s3Send.mockReset();
  s3Send.mockResolvedValue({});
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

  it('ignores other actions', async () => {
    const req = new FakeReq([mp4('isom')]);
    expect(await hm.handleHeroMediaAction('update_settings', req, new FakeRes())).toBe(false);
    expect(await hm.handleHeroMediaAction(undefined, req, new FakeRes())).toBe(false);
    expect(req.pulled).toBe(0);
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

// ── Node: update_settings helper ──
type Settings = Record<string, unknown>;
const OLD_VIDEO = `${S3}/assets/bg/hero_video_0123456789ab.mp4`;
const OLD_POSTER = `${S3}/assets/bg/hero_poster_0123456789ab.jpg`;

function poolWith(previous: Record<string, string> = {}) {
  return {
    query: vi.fn(async (sql: string) => {
      expect(sql).toMatch(/^SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN \('hero_bg_video', 'hero_bg_video_poster'\)$/);
      return [Object.entries(previous).map(([setting_key, setting_value]) => ({ setting_key, setting_value }))];
    }),
  };
}

async function prepareNode(settings: Settings, previous: Record<string, string> = {}) {
  const pool = poolWith(previous);
  const cleanup = await hm.prepareHeroMediaSettings(settings, pool);
  return { settings, cleanup, pool };
}

describe('update_settings hero keys (Node)', () => {
  it('normalizes hero_bg_mode and leaves unsent keys alone', async () => {
    const cases: [unknown, string][] = [
      ['default', 'default'], ['image', 'image'], ['video', 'video'], ['', 'default'], ['slideshow', 'default'],
      ['VIDEO', 'default'], [' video', 'default'], [null, 'default'], [3, 'default'], [['video'], 'default'], [true, 'default'],
    ];
    for (const [value, mode] of cases) {
      const { settings, pool } = await prepareNode({ hero_bg_mode: value, hero_title: 'Judul' });
      expect(settings, JSON.stringify(value)).toEqual({ hero_bg_mode: mode, hero_title: 'Judul' });
      // Previous values are only read for the video/poster keys
      expect(pool.query).not.toHaveBeenCalled();
    }
    expect((await prepareNode({ hero_title: 'x' })).settings).toEqual({ hero_title: 'x' });
  });

  it('refuses a data: video before storing anything', async () => {
    for (const video of ['data:video/mp4;base64,AAAAGGZ0eXBpc29t', ' DATA:video/webm;base64,GkXfow==', '\u0001data:video/mp4;base64,AA==']) {
      const settings = { hero_bg_video: video, hero_bg_video_poster: PNG_URI, hero_images: JSON.stringify([PNG_URI]) };
      await expect(hm.prepareHeroMediaSettings(settings, poolWith())).rejects.toMatchObject({ status: 400, expose: true, message: DATA_VIDEO_ERROR });
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

  it('refuses a poster that is not an image', async () => {
    await expect(hm.prepareHeroMediaSettings({ hero_bg_video_poster: HTML_URI, hero_images: JSON.stringify([PNG_URI]) }, poolWith()))
      .rejects.toMatchObject({ status: 400, message: IMAGE_ONLY_ERROR });
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
    expect(s3Send).not.toHaveBeenCalled();
  });

  it('deletes the replaced generated video, and only after the save', async () => {
    for (const next of [`${S3}/assets/bg/hero_video_ba9876543210.webm`, '']) {
      s3Send.mockClear();
      const { cleanup } = await prepareNode({ hero_bg_video: next }, { hero_bg_video: OLD_VIDEO });
      expect(deletes()).toEqual([]);
      await cleanup();
      expect(deletes()).toEqual(['assets/bg/hero_video_0123456789ab.mp4']);
    }
  });

  it('never deletes an unchanged value or a file it did not generate', async () => {
    const previousValues = [
      OLD_VIDEO, // unchanged below
      '/assets/bg/hero_video_0123456789ab.mp4', // site path (PHP backend), not an S3 object
      `${S3}/assets/bg/hero.mp4`,
      `${S3}/assets/bg/intro_0123456789ab.mp4`,
      `${S3}/assets/bg/hero_video_0123456789AB.mp4`,
      `${S3}/assets/bg/hero_video_0123456789a.mp4`,
      `${S3}/assets/bg/hero_video_0123456789ab.mov`,
      `${S3}/assets/bg/sub/hero_video_0123456789ab.mp4`,
      `${S3}/assets/bg/../product/hero_video_0123456789ab.mp4`,
      `${S3}/assets/product/hero_video_0123456789ab.mp4`,
      `https://evil.test/assets/bg/hero_video_0123456789ab.mp4`,
      `${S3}2/assets/bg/hero_video_0123456789ab.mp4`,
    ];
    for (const previous of previousValues) {
      const next = previous === OLD_VIDEO ? OLD_VIDEO : '';
      const { cleanup } = await prepareNode({ hero_bg_video: next }, { hero_bg_video: previous });
      await cleanup();
      expect(deletes(), previous).toEqual([]);
    }
    // Not sent: the stored video stays even when the mode changes
    const { cleanup } = await prepareNode({ hero_bg_mode: 'image' }, { hero_bg_video: OLD_VIDEO });
    await cleanup();
    expect(deletes()).toEqual([]);
  });

  it('replaces the generated poster and keeps the video that was not sent', async () => {
    const { settings, cleanup } = await prepareNode({ hero_bg_video_poster: PNG_URI }, { hero_bg_video: OLD_VIDEO, hero_bg_video_poster: OLD_POSTER });
    await cleanup();
    expect(settings.hero_bg_video_poster).toMatch(/hero_poster_[0-9a-f]{12}\.png$/);
    expect(deletes()).toEqual(['assets/bg/hero_poster_0123456789ab.jpg']);
  });

  it('hero_images: every data: entry is validated and stored, other entries pass the link check', async () => {
    const octetPng = `data:application/octet-stream;base64,${PNG.toString('base64')}`;
    const { settings } = await prepareNode({
      hero_images: JSON.stringify([PNG_URI, '/assets/bg/hero.png', 'javascript:alert(1)', 42, 'https://cdn.test/a.jpg', octetPng]),
    });
    const images = JSON.parse(String(settings.hero_images));
    expect(images).toEqual([
      expect.stringMatching(/^https:\/\/s3\.test\/bucket\/assets\/bg\/hero_[0-9a-z_]+\.png$/),
      '/assets/bg/hero.png',
      '',
      'https://cdn.test/a.jpg',
      expect.stringMatching(/^https:\/\/s3\.test\/bucket\/assets\/bg\/hero_[0-9a-z_]+\.png$/),
    ]);
    expect(puts().map((p) => p.ContentType)).toEqual(['image/png', 'image/png']);

    await expect(hm.prepareHeroMediaSettings({ hero_images: JSON.stringify([HTML_URI]) }, poolWith())).rejects.toMatchObject({ status: 400, message: IMAGE_ONLY_ERROR });
    // Not a JSON array: left as it was (like api.php)
    expect((await prepareNode({ hero_images: 'not json' })).settings).toEqual({ hero_images: 'not json' });
  });

  it('generatedKey only accepts generated names directly under S3_PUBLIC_URL/assets/bg/', () => {
    expect(hm.generatedKey(OLD_VIDEO, hm.GENERATED_VIDEO)).toBe('assets/bg/hero_video_0123456789ab.mp4');
    expect(hm.generatedKey(`${S3}/assets/bg/hero_video_0123456789ab.webm`, hm.GENERATED_VIDEO)).toBe('assets/bg/hero_video_0123456789ab.webm');
    expect(hm.generatedKey(OLD_POSTER, hm.GENERATED_POSTER)).toBe('assets/bg/hero_poster_0123456789ab.jpg');
    expect(hm.generatedKey(OLD_POSTER, hm.GENERATED_VIDEO)).toBeNull();
    expect(hm.generatedKey(OLD_VIDEO, hm.GENERATED_POSTER)).toBeNull();
    for (const value of [undefined, null, 5, '', `${OLD_VIDEO}\n`, `${OLD_VIDEO}?x=1`]) expect(hm.generatedKey(value, hm.GENERATED_VIDEO)).toBeNull();
  });
});

describe('access and deploy config', () => {
  const listOf = (source: string, name: string) => {
    const block = source.match(new RegExp(`${name}\\s*=\\s*(?:new Set\\()?\\[([\\s\\S]*?)\\]`));
    if (!block) throw new Error(`${name} not found`);
    return [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  };

  it('upload_hero_video is in no action list of either backend, so the default staff rule applies', () => {
    for (const source of [API_PHP, SECURITY_JS]) {
      for (const name of ['PUBLIC_ACTIONS', 'CUSTOMER_ACTIONS', 'ADMIN_ACTIONS']) expect(listOf(source, name)).not.toContain('upload_hero_video');
    }
    expect(hm.HERO_MEDIA_ACTIONS).toEqual(['upload_hero_video']);
  });

  it('both backends dispatch it only after the token check', () => {
    const authAt = API_PHP.indexOf('$authUser = authorize_request(');
    expect(authAt).toBeGreaterThan(0);
    expect(API_PHP).toContain("require_once __DIR__ . '/modules/hero_media.php';");
    expect(API_PHP.indexOf('handle_hero_media_action($conn')).toBeGreaterThan(authAt);
    expect(API_PHP.indexOf('hero_media_prepare_settings($conn, $settings)')).toBeGreaterThan(API_PHP.indexOf("case 'update_settings':"));
    const gateAt = SERVER_JS.indexOf("app.use(['/api.php', '/api'], createAuthGate(pool))");
    expect(gateAt).toBeGreaterThan(0);
    // Same action lookup as the gate, so a body action cannot differ from the one that was checked
    expect(SERVER_JS.indexOf('handleHeroMediaAction(actionOf(req), req, res)')).toBeGreaterThan(gateAt);
    expect(SERVER_JS.indexOf('prepareHeroMediaSettings(settings, pool)')).toBeGreaterThan(SERVER_JS.indexOf("case 'update_settings':"));
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
const API_HELPERS = [
  'class ApiError ',
  ...['env_value', 'upload_limit_bytes', 'sniff_image', 'safe_stem', 'svg_has_active_content', 'parse_upload', 'safe_link', 'save_base64_asset', 'delete_local_asset']
    .map((name) => `function ${name}\\(`),
].map(apiPhpBlock).join('\n');

const CLI_HARNESS = `<?php
${API_HELPERS}
function public_dir() { return getenv('HM_PUBLIC_DIR'); }
function db_all($conn, $sql, array $params = []) { $GLOBALS['__queries'][] = $sql; return $GLOBALS['__rows']; }
require getenv('HM_MODULE');

$req = json_decode(stream_get_contents(STDIN), true);
$GLOBALS['__queries'] = [];
$GLOBALS['__rows'] = $req['rows'] ?? [];
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
    case 'prepare':
        $settings = $req['settings'];
        try {
            $cleanup = hero_media_prepare_settings(mysqli_init(), $settings);
            if ($req['cleanup']) $cleanup();
            $out = ['status' => 200, 'settings' => $settings];
        } catch (ApiError $e) {
            $out = ['status' => $e->status, 'error' => $e->getMessage()];
        }
        $out['queries'] = $GLOBALS['__queries'];
        break;
}
echo json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
`;

const UPLOAD_ROUTER = `<?php
${API_HELPERS}
function public_dir() { return getenv('HM_PUBLIC_DIR'); }
require getenv('HM_MODULE');
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
  let php: ChildProcess | null = null;
  let base = '';

  const runCli = (request: Record<string, unknown>) => {
    const result = spawnSync('php', [join(harnessDir, 'cli.php')], {
      input: JSON.stringify(request),
      encoding: 'utf8',
      env: { ...process.env, HM_MODULE: MODULE_PHP, HM_PUBLIC_DIR: webRoot },
    });
    if (result.status !== 0 || !result.stdout) throw new Error(`php failed: ${result.stderr || result.stdout}`);
    return JSON.parse(result.stdout);
  };
  const preparePhp = (settings: Settings, previous: Record<string, string> = {}, cleanup = true) =>
    runCli({
      op: 'prepare', settings, cleanup,
      rows: Object.entries(previous).map(([setting_key, setting_value]) => ({ setting_key, setting_value })),
    });
  const bgFiles = () => readdirSync(bg).sort();

  beforeAll(async () => {
    harnessDir = mkdtempSync(join(tmpdir(), 'gn-hero-media-php-'));
    webRoot = mkdtempSync(join(tmpdir(), 'gn-hero-media-web-'));
    bg = join(webRoot, 'assets', 'bg');
    mkdirSync(bg, { recursive: true });
    writeFileSync(join(harnessDir, 'cli.php'), CLI_HARNESS);
    writeFileSync(join(harnessDir, 'router.php'), UPLOAD_ROUTER);
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    // Warnings must not end up in the JSON (e.g. PHP's own multipart parsing of the multipart case)
    php = spawn('php', ['-d', 'display_errors=0', '-S', `127.0.0.1:${port}`, join(harnessDir, 'router.php')], {
      env: { ...process.env, HM_MODULE: MODULE_PHP, HM_PUBLIC_DIR: webRoot, UPLOAD_MAX_VIDEO_MB: LIMIT_MB },
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
    for (const dir of [harnessDir, webRoot]) if (dir) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  it('sniffs the same video types', () => {
    const phpOut = runCli({ op: 'sniff', inputs: SNIFF_CASES.map(([, bytes]) => bytes.toString('hex')) });
    expect(phpOut).toEqual(SNIFF_CASES.map(([, bytes]) => hm.sniffVideo(bytes)));
  });

  it('recognizes the same generated names', () => {
    const names = [
      'hero_video_0123456789ab.mp4', 'hero_video_0123456789ab.webm', 'hero_video_0123456789AB.mp4', 'hero_video_0123456789a.mp4',
      'hero_video_0123456789abc.mp4', 'hero_video_0123456789ab.mov', 'hero_video_0123456789ab.mp4.php', 'hero_video_0123456789ab.mp4\n',
      'hero_poster_0123456789ab.jpg', 'hero_poster_0123456789ab.png', 'hero_poster_0123456789ab.webp', 'hero_poster_1729600000000_abc123.jpg',
      'hero_poster_0123456789ab.mp4', 'hero_6a0736659383e_0.jpg', 'hero.png', 'sub/hero_video_0123456789ab.mp4', '../hero_video_0123456789ab.mp4', '',
    ];
    const phpOut: [string | null, string | null][] = runCli({ op: 'names', inputs: names.map((n) => `/assets/bg/${n}`) });
    const nodeOut = names.map((n) => [hm.GENERATED_VIDEO, hm.GENERATED_POSTER].map((p) => hm.generatedKey(`${S3}/assets/bg/${n}`, p)));
    expect(phpOut.map((pair) => pair.map((v) => v !== null))).toEqual(nodeOut.map((pair) => pair.map((v) => v !== null)));
    expect(phpOut[0]).toEqual(['hero_video_0123456789ab.mp4', null]);
    expect(phpOut[8]).toEqual([null, 'hero_poster_0123456789ab.jpg']);
    // Only site paths directly in /assets/bg/; S3 URLs belong to the Node backend
    const other: [string | null, string | null][] = runCli({ op: 'names', inputs: [OLD_VIDEO, '/assets/product/hero_video_0123456789ab.mp4', 'assets/bg/hero_video_0123456789ab.mp4', null, 5] });
    expect(other.flat().every((v) => v === null)).toBe(true);
  });

  it('normalizes hero_bg_mode the same way', () => {
    const values = ['default', 'image', 'video', '', 'slideshow', 'VIDEO', ' video', null, 3, ['video'], true];
    expect(runCli({ op: 'mode', inputs: values })).toEqual(values.map((v) => hm.heroBgMode(v)));
  });

  it('refuses the same values with the same messages, before storing anything', async () => {
    const before = bgFiles();
    for (const settings of [
      { hero_bg_video: 'data:video/mp4;base64,AAAAGGZ0eXBpc29t', hero_bg_video_poster: PNG_URI, hero_images: JSON.stringify([PNG_URI]) },
      { hero_bg_video: '\u0001data:video/mp4;base64,AA==' },
      { hero_bg_video_poster: HTML_URI, hero_images: JSON.stringify([PNG_URI]) },
      { hero_images: JSON.stringify([HTML_URI]) },
    ]) {
      const node = await hm.prepareHeroMediaSettings(structuredClone(settings), poolWith()).then(
        () => ({ status: 200 }),
        (err: { status: number; message: string }) => ({ status: err.status, error: err.message }),
      );
      const phpOut = preparePhp(settings);
      expect({ status: phpOut.status, error: phpOut.error }, JSON.stringify(settings)).toEqual(node);
      expect(node.status).toBe(400);
    }
    expect(bgFiles()).toEqual(before);
  });

  it('stores links, modes, posters and slider images like Node', async () => {
    const settings = {
      hero_bg_mode: 'unknown', hero_bg_video: 'javascript:alert(1)', hero_bg_video_poster: PNG_URI, hero_title: 'Judul',
      hero_images: JSON.stringify([PNG_URI, '/assets/bg/hero.png', 'javascript:alert(1)', 42]),
    };
    const node = (await prepareNode(structuredClone(settings))).settings;
    const phpOut = preparePhp(settings);
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
    expect(phpImages).toEqual([expect.stringMatching(/^\/assets\/bg\/hero_[0-9a-f]{12}\.png$/), '/assets/bg/hero.png', '']);
    expect(JSON.parse(String(node.hero_images)).slice(1)).toEqual(phpImages.slice(1));
    // No database read without the video/poster keys
    expect(preparePhp({ hero_bg_mode: 'video' }).queries).toEqual([]);
  });

  it('deletes only the replaced generated files, after the save', () => {
    const seed = ['hero.png', 'hero_6a0736659383e_0.jpg', 'hero_video_custom.mp4', 'hero_video_0123456789ab.mp4', 'hero_poster_0123456789ab.jpg'];
    for (const name of seed) writeFileSync(join(bg, name), 'x');
    const previous = { hero_bg_video: '/assets/bg/hero_video_0123456789ab.mp4', hero_bg_video_poster: '/assets/bg/hero_poster_0123456789ab.jpg' };
    const next = { hero_bg_video: '', hero_bg_video_poster: 'https://cdn.test/p.jpg' };

    // Without the post-save call nothing is deleted
    expect(preparePhp(next, previous, false).status).toBe(200);
    for (const name of seed) expect(existsSync(join(bg, name)), name).toBe(true);

    // Unchanged values and files it did not generate stay
    for (const [video, poster] of [
      ['/assets/bg/hero.png', '/assets/bg/hero_6a0736659383e_0.jpg'],
      ['/assets/bg/hero_video_custom.mp4', `${S3}/assets/bg/hero_poster_0123456789ab.jpg`],
      ['/assets/bg/sub/../hero_video_0123456789ab.mp4', '/assets/bg//hero_poster_0123456789ab.jpg'],
    ]) {
      expect(preparePhp(next, { hero_bg_video: video, hero_bg_video_poster: poster }).status).toBe(200);
    }
    expect(preparePhp(previous, previous).status).toBe(200);
    expect(preparePhp({ hero_bg_mode: 'image' }, previous).status).toBe(200);
    for (const name of seed) expect(existsSync(join(bg, name)), name).toBe(true);

    const phpOut = preparePhp(next, previous);
    expect(phpOut.settings).toEqual(next);
    expect(phpOut.queries).toEqual(["SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN ('hero_bg_video', 'hero_bg_video_poster')"]);
    expect(seed.filter((name) => existsSync(join(bg, name)))).toEqual(['hero.png', 'hero_6a0736659383e_0.jpg', 'hero_video_custom.mp4']);
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
    const added = bgFiles().filter((name) => !before.includes(name));
    if (phpOut.status === 200) {
      // The stored file has the uploaded bytes and no temporary file is left
      expect(phpOut.body.url).toMatch(/^\/assets\/bg\/hero_video_[0-9a-f]{12}\.(mp4|webm)$/);
      expect(added).toEqual([String(phpOut.body.url).slice('/assets/bg/'.length)]);
      expect(Buffer.compare(readFileSync(join(webRoot, String(phpOut.body.url))), bytes)).toBe(0);
    } else {
      expect(added).toEqual([]);
    }
  });

  it('GET is not an upload (falls through to "Invalid action", like server.js)', async () => {
    expect(await uploadPhp(Buffer.alloc(0), {}, 'GET')).toEqual({ status: 400, body: { error: 'Invalid action: upload_hero_video' } });
    expect(SERVER_JS.slice(SERVER_JS.indexOf("app.get('/api.php'"), SERVER_JS.indexOf("app.post('/api.php'"))).not.toContain('handleHeroMediaAction');
  });
});
