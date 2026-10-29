// @vitest-environment jsdom
// Impor proyek dari ZIP / folder di Pengaturan website > Proyek (permintaan pemilik 2026-10-25): pembaca ZIP tanpa
// pustaka (zipReader.ts), proyek.json diperiksa dengan batas & pembersih editor (portfolioImport.ts), unggah lewat
// upload_project_image / upload_project_video, dan dialognya (PortfolioImportDialog.tsx).
// Jalankan: npx vitest run src/pages/admin/__tests__/portfolioImport.test.tsx
import { crc32, deflateRawSync } from 'node:zlib';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PortfolioImportDialog from '../portfolio/PortfolioImportDialog';
import { ZipError, readZip } from '../portfolio/zipReader';
import {
  ImportCancelled,
  ImportError,
  addImportedProject,
  folderFiles,
  importUploads,
  openImportBundle,
  planImport,
  uploadImportItem,
  type ImportBundle,
  type ImportFile,
} from '../portfolio/portfolioImport';
import { PROJECT_VIDEO_UPLOAD_URL } from '../portfolio/portfolioMedia';
import { HeroUploadError, uploadHeroVideo } from '../hero/heroVideo';
import type { PortfolioItem } from '../../../components/sections/projects/portfolio';

vi.mock('../../../lib/auth', () => ({ getToken: () => 'test-token' }));
// jsdom tanpa canvas: hasil kecil tiruan (yang diuji: data URI inilah yang dikirim)
vi.mock('../hero/heroImage', () => ({ resizeHeroImage: vi.fn(async () => 'data:image/jpeg;base64,/9j/AAAA') }));
vi.mock('../hero/heroVideo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hero/heroVideo')>();
  return { ...actual, uploadHeroVideo: vi.fn() };
});

/* ─── ZIP buatan tes ──────────────────────────────────────────────────────── */

interface ZipInput {
  name: string;
  data?: string | Uint8Array;
  /** 0 = simpan, 8 = deflate (bawaan), lainnya = metode yang tidak didukung */
  method?: number;
  /** Bit flag umum (bawaan 0x0800 = nama UTF-8; 1 = terenkripsi) */
  flags?: number;
  /** Ukuran ditulis 0xFFFFFFFF dengan angka aslinya di extra field ZIP64 */
  zip64?: boolean;
  /** Ukuran asli palsu di central directory (ZIP rusak) */
  fakeSize?: number;
}

const encoder = new TextEncoder();

function makeZip(entries: ZipInput[], comment = ''): Uint8Array<ArrayBuffer> {
  const parts: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const raw = typeof entry.data === 'string' ? encoder.encode(entry.data) : (entry.data ?? new Uint8Array());
    const method = entry.method ?? 8;
    const body = method === 8 ? new Uint8Array(deflateRawSync(raw)) : raw;
    const flags = entry.flags ?? 0x0800;
    const crc = crc32(raw);
    const size = entry.fakeSize ?? raw.length;

    const local = new Uint8Array(30 + name.length + body.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, flags, true);
    lv.setUint16(8, method, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, body.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(body, 30 + name.length);

    const extra = entry.zip64 ? new Uint8Array(4 + 16) : new Uint8Array();
    if (entry.zip64) {
      const ev = new DataView(extra.buffer);
      ev.setUint16(0, 0x0001, true);
      ev.setUint16(2, 16, true);
      ev.setBigUint64(4, BigInt(size), true);
      ev.setBigUint64(12, BigInt(body.length), true);
    }
    const central = new Uint8Array(46 + name.length + extra.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, flags, true);
    cv.setUint16(10, method, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, entry.zip64 ? 0xffffffff : body.length, true);
    cv.setUint32(24, entry.zip64 ? 0xffffffff : size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, extra.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    central.set(extra, 46 + name.length);

    parts.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const cdSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const note = encoder.encode(comment);
  const eocd = new Uint8Array(22 + note.length);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, note.length, true);
  eocd.set(note, 22);

  const all = [...parts, ...centrals, eocd];
  const out = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of all) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

const zipFile = (entries: ZipInput[], name = 'proyek.zip') => new File([makeZip(entries)], name, { type: 'application/zip' });
const textOf = async (blob: Blob) => new TextDecoder().decode(await blob.arrayBuffer());
/** Isi gambar/video tiruan (isinya diperiksa server; di tes cukup ada byte-nya). */
const bytes = (size: number) => new Uint8Array(size).fill(7);

/* ─── Bundel langsung (tanpa ZIP) ─────────────────────────────────────────── */

const memFile = (path: string, size = 64, problem?: string): ImportFile => ({
  path,
  size,
  problem,
  read: async () => new Blob([bytes(size)]),
});
const bundleOf = (manifest: unknown[], files: ImportFile[], base = ''): ImportBundle => ({ manifest, base, files });

/* ─── Fetch tiruan ────────────────────────────────────────────────────────── */

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let uploads: string[] = [];
let uploadReply: (n: number) => Response;

beforeEach(() => {
  uploads = [];
  uploadReply = (n) => json(200, { success: true, url: `/assets/projects/project_00000000000${n}.jpg` });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const action = new URL(String(input), 'http://localhost').searchParams.get('action');
      if (action === 'get_hero_media_limits') return json(200, { success: true, video_max_mb: 30, max_images: 12 });
      if (action === 'upload_project_image') {
        uploads.push(String((JSON.parse(String(init?.body)) as { data: string }).data));
        return uploadReply(uploads.length);
      }
      return json(200, {});
    }),
  );
  vi.mocked(uploadHeroVideo).mockReset();
  vi.mocked(uploadHeroVideo).mockImplementation((_file, options) => {
    options.onProgress?.(50);
    return { promise: Promise.resolve('/assets/projects/project_video_0123456789ab.webm'), abort: vi.fn() };
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('readZip', () => {
  it('membaca file deflate & simpan, nama dengan "\\" (Compress-Archive), folder dilewati, komentar di akhir', async () => {
    const zip = new Blob([
      makeZip(
        [
          { name: 'Proyek/', method: 0 },
          { name: 'Proyek\\proyek.json', data: '[{"title":"A"}]' },
          { name: 'Proyek/media/cover.jpg', data: bytes(5000), method: 0 },
          { name: 'Proyek/media/kosong.txt', data: '' },
        ],
        'dibuat oleh tes',
      ),
    ]);
    const entries = await readZip(zip);
    expect(entries.map((entry) => [entry.path, entry.size, entry.problem])).toEqual([
      ['Proyek/proyek.json', 15, undefined],
      ['Proyek/media/cover.jpg', 5000, undefined],
      ['Proyek/media/kosong.txt', 0, undefined],
    ]);
    expect(await textOf(await entries[0].read())).toBe('[{"title":"A"}]');
    expect(new Uint8Array(await (await entries[1].read()).arrayBuffer())).toEqual(bytes(5000));
    expect((await entries[2].read()).size).toBe(0);
  });

  it('ukuran ZIP64 di extra field', async () => {
    const [entry] = await readZip(new Blob([makeZip([{ name: 'besar.webm', data: bytes(3000), zip64: true }])]));
    expect(entry.size).toBe(3000);
    expect((await entry.read()).size).toBe(3000);
  });

  it('terenkripsi / kompresi lain: ditandai, isinya tidak dibuka', async () => {
    const entries = await readZip(
      new Blob([makeZip([{ name: 'rahasia.jpg', data: 'x', flags: 1 }, { name: 'bzip.jpg', data: 'x', method: 12 }])]),
    );
    expect(entries[0].problem).toBe('"rahasia.jpg" di dalam ZIP terkunci kata sandi.');
    expect(entries[1].problem).toMatch(/^"bzip.jpg" memakai kompresi yang tidak didukung/);
    await expect(entries[0].read()).rejects.toBeInstanceOf(ZipError);
  });

  it('bukan ZIP / isi rusak → ZipError dengan pesan jelas', async () => {
    await expect(readZip(new Blob(['ini bukan zip']))).rejects.toThrow('File ini bukan ZIP yang valid.');
    const [entry] = await readZip(new Blob([makeZip([{ name: 'a.jpg', data: bytes(100), fakeSize: 50 }])]));
    await expect(entry.read()).rejects.toThrow('"a.jpg" di dalam ZIP rusak dan tidak bisa dibuka.');
  });
});

describe('openImportBundle', () => {
  it('proyek.json di dalam folder ZIP (ZIP sebuah folder), BOM dibuang, isi __MACOSX diabaikan', async () => {
    const entries = await readZip(
      new Blob([
        makeZip([
          { name: '__MACOSX/proyek.json', data: 'bukan json' },
          { name: 'kirim/proyek.json', data: '﻿{"title":"Satu"}' },
          { name: 'kirim/cover.jpg', data: bytes(10) },
        ]),
      ]),
    );
    const bundle = await openImportBundle(entries);
    expect(bundle.base).toBe('kirim/');
    expect(bundle.manifest).toEqual([{ title: 'Satu' }]);
    expect(bundle.files.map((file) => file.path)).toEqual(['kirim/proyek.json', 'kirim/cover.jpg']);
  });

  it('pesan bila proyek.json tidak ada, ganda, bukan JSON, bukan daftar, atau kosong', async () => {
    const open = (files: ImportFile[]) => openImportBundle(files);
    const manifest = (path: string, text: string): ImportFile => ({ path, size: text.length, read: async () => new Blob([text]) });
    await expect(open([memFile('cover.jpg')])).rejects.toThrow('proyek.json tidak ditemukan.');
    await expect(open([manifest('a/proyek.json', '[]'), manifest('b/proyek.json', '[]')])).rejects.toThrow(
      'Ada 2 proyek.json (a/proyek.json, b/proyek.json). Sisakan satu saja.',
    );
    await expect(open([manifest('proyek.json', '[{')])).rejects.toThrow(/^proyek.json bukan JSON yang valid/);
    await expect(open([manifest('proyek.json', '"teks"')])).rejects.toThrow('proyek.json harus berisi daftar proyek');
    await expect(open([manifest('proyek.json', '[]')])).rejects.toThrow('proyek.json tidak berisi proyek.');
    await expect(open([memFile('proyek.json', 64, 'terkunci')])).rejects.toThrow('terkunci');
    await expect(open([manifest('proyek.json', '[]'), manifest('x/proyek.json', '{')])).rejects.toBeInstanceOf(ImportError);
  });

  it('folder (webkitdirectory): path relatif dari folder yang dipilih', () => {
    const file = new File(['[]'], 'proyek.json', { type: 'application/json' });
    Object.defineProperty(file, 'webkitRelativePath', { value: 'kiriman\\proyek.json' });
    expect(folderFiles([file]).map((entry) => entry.path)).toEqual(['kiriman/proyek.json']);
  });
});

describe('planImport (batas & pembersih editor)', () => {
  const EXISTING: PortfolioItem[] = [{ title: 'Web App Dashboard', desc: 'SAAS / FINANCE', image: '/assets/portofolio/portfolio1.png' }];

  it('isian lengkap: dirapikan seperti editor, file dicocokkan relatif (huruf besar/kecil diabaikan), nama sama ditandai', () => {
    const files = [memFile('kirim/media/Cover.JPG', 2000), memFile('kirim/media/d1.png'), memFile('kirim/media/demo.webm', 4000)];
    const [item] = planImport(
      bundleOf(
        [
          {
            title: '  web app dashboard ',
            desc: 'SAAS / FINANCE',
            url: ' Contoh.com/demo ',
            description: '  Paragraf 1.\r\n\r\nParagraf 2.\u0007 ',
            tools: 'React JS, laravel ,react js',
            image: './media/cover.jpg',
            gallery: ['media\\d1.png', '/assets/projects/project_0123456789ab.jpg'],
            video: 'media/demo.webm',
            span: 'md:col-span-4',
          },
        ],
        files,
        'kirim/',
      ),
      EXISTING,
      30,
    );
    expect(item).toMatchObject({
      number: 1,
      title: 'web app dashboard',
      desc: 'SAAS / FINANCE',
      url: 'https://Contoh.com/demo',
      description: 'Paragraf 1.\n\nParagraf 2.',
      tools: ['React JS', 'laravel'],
      problems: [],
      notes: [],
      existing: 0,
    });
    expect(item.image).toEqual({ file: files[0], name: 'Cover.JPG', type: 'image/jpeg' });
    expect(item.gallery).toEqual([{ file: files[1], name: 'd1.png', type: 'image/png' }, { link: '/assets/projects/project_0123456789ab.jpg' }]);
    expect(item.video).toEqual({ file: files[2], name: 'demo.webm', type: 'video/webm' });
    expect(importUploads(item)).toEqual({ count: 3, bytes: 2000 + 64 + 4000 });
  });

  it('batas: 12 tools, 3000 karakter deskripsi, 12 gambar detail (sisanya dicatat, proyek tetap diimpor)', () => {
    const files = [memFile('c.jpg'), ...Array.from({ length: 14 }, (_, i) => memFile(`g${i}.jpg`))];
    const [item] = planImport(
      bundleOf(
        [
          {
            title: 'Banyak',
            desc: 'WEB',
            image: 'c.jpg',
            description: 'x'.repeat(3005),
            tools: Array.from({ length: 15 }, (_, i) => `Tool ${i}`),
            gallery: Array.from({ length: 14 }, (_, i) => `g${i}.jpg`),
            kategori: 'tidak dikenal',
          },
        ],
        files,
      ),
      [],
      30,
    );
    expect(item.problems).toEqual([]);
    expect(item.tools).toHaveLength(12);
    expect(item.description).toHaveLength(3000);
    expect(item.gallery).toHaveLength(12);
    expect(item.notes).toEqual([
      'Deskripsi lebih dari 3.000 karakter, jadi dipotong.',
      'Maksimal 12 tools, jadi 3 terakhir tidak diimpor.',
      'Maksimal 12 gambar detail, jadi 2 terakhir tidak diimpor.',
      'Kolom tidak dikenal diabaikan: kategori.',
    ]);
  });

  it('masalah yang membuat proyek dilewati: wajib kosong, tautan salah, file hilang/salah jenis/terlalu besar, tautan luar, nama ganda', () => {
    const files = [
      memFile('cover.jpg'),
      memFile('logo.svg'),
      memFile('besar.png', 26 * 1024 * 1024),
      memFile('film.mov'),
      memFile('panjang.mp4', 31 * 1024 * 1024),
      memFile('kunci.jpg', 64, '"kunci.jpg" di dalam ZIP terkunci kata sandi.'),
    ];
    const items = planImport(
      bundleOf(
        [
          'bukan objek',
          { url: 'bukan tautan' },
          { title: 'Dua', desc: 'WEB', image: 'hilang.jpg', gallery: ['logo.svg', 'besar.png', 'kunci.jpg'], video: 'film.mov' },
          { title: 'Tiga', desc: 'WEB', image: 'https://contoh.com/a.jpg', gallery: ['data:image/png;base64,AAAA'], video: 'panjang.mp4' },
          { title: 'dua', desc: 'WEB', image: 'cover.jpg' },
        ],
        files,
      ),
      [],
      30,
    );
    expect(items.map((item) => item.problems)).toEqual([
      ['Bukan data proyek: tulis sebagai { "title": …, "desc": …, "image": … }.'],
      [
        'Nama proyek (title) wajib diisi.',
        'Tag / kategori (desc) wajib diisi.',
        'Tautan situs "bukan tautan" tidak valid. Isi mis. https://contoh.com, atau kosongkan.',
        'Gambar kartu (image) wajib diisi: proyek tanpa gambar tidak tampil di website.',
      ],
      [
        'Gambar kartu: file "hilang.jpg" tidak ada di ZIP/folder.',
        '"logo.svg": Gambar proyek harus JPG, PNG, WEBP, atau GIF.',
        '"besar.png" lebih dari 25 MB.',
        '"kunci.jpg" di dalam ZIP terkunci kata sandi.',
        'Video "film.mov": Format video harus MP4 atau WebM.',
      ],
      [
        'Gambar kartu "https://contoh.com/a.jpg": tulis nama file di dalam ZIP/folder, bukan tautan.',
        'Gambar detail 1 "data:image/png;base64,AAAA": tulis nama file di dalam ZIP/folder, bukan tautan.',
        'Video "panjang.mp4": Ukuran video maksimal 30 MB.',
      ],
      ['Nama proyek sama dengan proyek #3 di proyek.json.'],
    ]);
  });
});

describe('uploadImportItem & addImportedProject', () => {
  const plan = (entry: Record<string, unknown>, files: ImportFile[]) => planImport(bundleOf([entry], files), [], 30)[0];

  it('gambar kartu, gambar detail berurutan, lalu video; hasilnya entri portfolio_data yang rapi', async () => {
    const item = plan(
      { title: 'Kasir', desc: 'RETAIL / ANDROID', image: 'c.png', gallery: ['d1.jpg', '/assets/projects/lama.jpg', 'd2.webp'], video: 'v.webm', tools: [] },
      [memFile('c.png'), memFile('d1.jpg'), memFile('d2.webp'), memFile('v.webm', 500)],
    );
    const progress: number[] = [];
    const saved = await uploadImportItem(item, { signal: new AbortController().signal, onProgress: (percent) => progress.push(percent) });
    expect(saved).toEqual({
      title: 'Kasir',
      desc: 'RETAIL / ANDROID',
      image: '/assets/projects/project_000000000001.jpg',
      gallery: ['/assets/projects/project_000000000002.jpg', '/assets/projects/lama.jpg', '/assets/projects/project_000000000003.jpg'],
      video: '/assets/projects/project_video_0123456789ab.webm',
    });
    expect(uploads).toEqual(Array(3).fill('data:image/jpeg;base64,/9j/AAAA'));
    const [videoFile, options] = vi.mocked(uploadHeroVideo).mock.calls[0];
    expect(videoFile).toMatchObject({ name: 'v.webm', type: 'video/webm', size: 500 });
    expect(options).toMatchObject({ token: 'test-token', url: PROJECT_VIDEO_UPLOAD_URL });
    expect(progress).toEqual([0, 25, 50, 75, 88, 100]);
  });

  it('gagal unggah → pesan dengan nama file; dihentikan → ImportCancelled (video yang berjalan dibatalkan)', async () => {
    const item = plan({ title: 'A', desc: 'B', image: 'c.png', video: 'v.mp4' }, [memFile('c.png'), memFile('v.mp4')]);
    uploadReply = () => json(400, { error: 'Ukuran gambar maksimal 10 MB.' });
    await expect(uploadImportItem(item, { signal: new AbortController().signal })).rejects.toThrow('"c.png": Ukuran gambar maksimal 10 MB.');

    uploadReply = (n) => json(200, { success: true, url: `/assets/projects/project_00000000000${n}.jpg` });
    vi.mocked(uploadHeroVideo).mockReturnValueOnce({
      promise: Promise.reject(new HeroUploadError('Ukuran video terlalu besar untuk server.', 413)),
      abort: vi.fn(),
    });
    await expect(uploadImportItem(item, { signal: new AbortController().signal })).rejects.toThrow(
      'Video "v.mp4": Ukuran video terlalu besar untuk server.',
    );

    let fail: (error: unknown) => void = () => {};
    const abort = vi.fn(() => fail(new HeroUploadError('Unggahan dibatalkan.', 0, true)));
    vi.mocked(uploadHeroVideo).mockReturnValueOnce({ promise: new Promise<string>((_resolve, reject) => (fail = reject)), abort });
    const controller = new AbortController();
    const running = uploadImportItem(item, { signal: controller.signal });
    await waitFor(() => expect(uploadHeroVideo).toHaveBeenCalledTimes(2));
    controller.abort();
    expect(abort).toHaveBeenCalled();
    await expect(running).rejects.toBeInstanceOf(ImportCancelled);

    const stopped = new AbortController();
    stopped.abort();
    await expect(uploadImportItem(item, { signal: stopped.signal })).rejects.toBeInstanceOf(ImportCancelled);
  });

  it('addImportedProject: ganti proyek pertama bernama sama (abaikan huruf besar/kecil), selain itu tambah di akhir', () => {
    const list: PortfolioItem[] = [
      { title: 'Kasir', desc: 'LAMA', image: '/a.jpg', span: 'md:col-span-4' },
      { title: 'Web', desc: 'WEB', image: '/b.jpg' },
    ];
    const next: PortfolioItem = { title: ' kasir ', desc: 'BARU', image: '/c.jpg' };
    expect(addImportedProject(list, next, true)).toEqual([next, list[1]]);
    expect(addImportedProject(list, next, false)).toEqual([...list, next]);
    expect(addImportedProject(list, { ...next, title: 'Lain' }, true)).toEqual([...list, { ...next, title: 'Lain' }]);
  });
});

describe('PortfolioImportDialog', () => {
  const EXISTING: PortfolioItem[] = [{ title: 'Kasir Toko', desc: 'RETAIL', image: '/assets/projects/lama.jpg' }];
  const MANIFEST = JSON.stringify([
    { title: 'Kasir Toko', desc: 'RETAIL / ANDROID', image: 'kasir/cover.png', gallery: ['kasir/1.jpg'], tools: ['Flutter'] },
    { title: 'Company Profile', desc: 'JASA / WEB', url: 'contoh.com', image: 'profil/cover.jpg', video: 'profil/demo.webm' },
    { title: 'Rusak', desc: 'WEB', image: 'tidak-ada.jpg' },
  ]);
  const ZIP_ENTRIES: ZipInput[] = [
    { name: 'proyek.json', data: MANIFEST },
    { name: 'kasir/cover.png', data: bytes(300) },
    { name: 'kasir/1.jpg', data: bytes(200) },
    { name: 'profil/cover.jpg', data: bytes(300) },
    { name: 'profil/demo.webm', data: bytes(900), method: 0 },
  ];

  const renderDialog = () => {
    const onImport = vi.fn();
    const onClose = vi.fn();
    const notify = vi.fn();
    render(<PortfolioImportDialog open existing={EXISTING} onImport={onImport} onClose={onClose} notify={notify} />);
    return { onImport, onClose, notify, dialog: screen.getByRole('dialog') };
  };
  const pickZip = (dialog: HTMLElement, file: File) =>
    fireEvent.change(within(dialog).getByLabelText('Pilih file ZIP proyek'), { target: { files: [file] } });

  it('ZIP → pratinjau & masalah per proyek → ganti nama sama → unggah → proyek masuk daftar, ingatkan Simpan semua perubahan', async () => {
    const { onImport, notify, dialog } = renderDialog();
    pickZip(dialog, zipFile(ZIP_ENTRIES, 'portofolio.zip'));
    expect(await within(dialog).findByText(/3 proyek, 2 siap diimpor, 1 dilewati karena bermasalah/)).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Gambar kartu: file "tidak-ada.jpg" tidak ada di ZIP/folder.');
    expect(dialog).toHaveTextContent('1 gambar detail · 1 tools · 2 file (1 KB)');
    expect(dialog).toHaveTextContent('1 proyek bernama sama dengan proyek yang sudah ada');
    expect(dialog).toHaveTextContent('Baru (nama sudah ada)');

    fireEvent.click(within(dialog).getByRole('tab', { name: 'Ganti proyek bernama sama' }));
    expect(dialog).toHaveTextContent('Ganti proyek lama');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Impor 2 proyek' }));

    expect(await within(dialog).findByText('2 proyek masuk daftar (1 mengganti proyek lama).')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Belum tampil di website: klik Simpan semua perubahan');
    expect(onImport.mock.calls).toEqual([
      [
        {
          title: 'Kasir Toko',
          desc: 'RETAIL / ANDROID',
          image: '/assets/projects/project_000000000001.jpg',
          tools: ['Flutter'],
          gallery: ['/assets/projects/project_000000000002.jpg'],
        },
        true,
      ],
      [
        {
          title: 'Company Profile',
          desc: 'JASA / WEB',
          image: '/assets/projects/project_000000000003.jpg',
          url: 'https://contoh.com',
          video: '/assets/projects/project_video_0123456789ab.webm',
        },
        false,
      ],
    ]);
    expect(vi.mocked(uploadHeroVideo).mock.calls[0][0]).toMatchObject({ name: 'demo.webm', size: 900 });
    expect(within(dialog).getAllByText('Dilewati')).toHaveLength(1);
    // Ringkasan juga sebagai notifikasi halaman (sekali, setelah semua proyek selesai)
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('success', '2 proyek berhasil diimpor.', 'Klik Simpan semua perubahan agar tampil di website.');
  });

  it('satu proyek gagal diunggah: lainnya tetap masuk; bukan ZIP → pesan', async () => {
    const { onImport, notify, dialog } = renderDialog();
    pickZip(dialog, new File(['halo'], 'catatan.txt', { type: 'text/plain' }));
    expect(dialog).toHaveTextContent('"catatan.txt" bukan file ZIP.');
    pickZip(dialog, new File(['halo'], 'rusak.zip', { type: 'application/zip' }));
    expect(await within(dialog).findByText('File ini bukan ZIP yang valid.')).toBeInTheDocument();

    uploadReply = (n) => (n === 1 ? json(400, { error: 'Isi file bukan gambar.' }) : json(200, { success: true, url: `/assets/projects/project_00000000000${n}.jpg` }));
    pickZip(dialog, zipFile(ZIP_ENTRIES));
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Impor 2 proyek' }));
    expect(await within(dialog).findByText('1 proyek masuk daftar.')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('"cover.png": Isi file bukan gambar.');
    expect(dialog).toHaveTextContent('1 gagal; lihat daftar di bawah.');
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport.mock.calls[0][0]).toMatchObject({ title: 'Company Profile' });
    expect(notify).toHaveBeenCalledWith('warning', '1 proyek diimpor, 1 gagal.', expect.stringContaining('Lihat alasannya di daftar impor.'));
  });
});
