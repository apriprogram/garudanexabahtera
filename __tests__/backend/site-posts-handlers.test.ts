// @vitest-environment node
// Aksi berita & pengumuman + SEO situs pembeli (backend/modules/site_posts.php = site_posts.js) dijalankan lengkap di
// kedua backend di atas database tiruan bernaskah: setiap kasus menyebut kueri yang diharapkan secara berurutan (potongan
// SQL) beserta baris jawabannya. PHP CLI dan Node harus menjawab sama (status, JSON, kode galat), mengirim kueri yang
// sama dengan parameter yang sama, dan mengunggah/menghapus file yang sama. Kepemilikan situs, situs nonaktif, template
// tanpa fitur tulisan, slug otomatis, foto lama yang dihapus, perayap yang tidak dihitung, dan file baru yang dibersihkan
// saat database gagal ikut diuji, begitu juga simpan bersamaan dari tab lain (UPDATE bersyarat foto yang tadi dibaca:
// tulisan hilang → 404, foto/baris SEO berubah → 409, file baru dihapus lagi). Bagian PHP dilewati bila `php` tidak ada.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const { fakeS3Sdk, s3 } = vi.hoisted(() => {
  // security.js dan s3-client.js membaca ini saat diimpor
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
  return { fakeS3Sdk, s3: { uploads: [] as unknown[][], deletes: [] as string[] } };
});

vi.mock('@aws-sdk/client-s3', () => fakeS3Sdk());
vi.mock('../../backend/node_modules/@aws-sdk/client-s3', () => fakeS3Sdk());
vi.mock('bcryptjs', () => ({ default: { hashSync: () => 'dummy', compare: async () => false, hash: async () => 'dummy' } }));
// Unggah & hapus S3 dicatat saja; parseUpload asli tetap memeriksa isi file (jenis dari magic bytes)
vi.mock('../../backend/s3-client.js', async (importOriginal) => {
  const real = (await importOriginal()) as Record<string, unknown> & {
    parseUpload: (data: string, opts: { allowDocuments: boolean }) => { ext: string };
    S3_PUBLIC_URL: string;
  };
  return {
    ...real,
    uploadBase64ToS3: async (data: string, section: string, filename: string) => {
      const { ext } = real.parseUpload(data.trimStart(), { allowDocuments: false });
      s3.uploads.push([section, filename]);
      return `${real.S3_PUBLIC_URL}/assets/${section}/${filename}_1700000000001_new001.${ext}`;
    },
    deleteFromS3: async (key: string) => {
      s3.deletes.push(`/${key}`);
    },
  };
});

import { handleSitePostAction, jakartaToday } from '../../backend/modules/site_posts.js';

const ROOT = resolve(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8');
const API_PHP = read('backend', 'api.php');
const TEMPLATES_PHP = read('backend', 'modules', 'templates.php');
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo extension_loaded("mysqli") && extension_loaded("mbstring") ? "ok" : "no";'], { encoding: 'utf8' }).stdout === 'ok';
const GENERIC = 'Terjadi kesalahan pada server. Silakan coba lagi.';

// ── Nilai yang berbeda per backend (PHP: path /assets/…, Node: URL S3), disamakan lagi oleh normalize() ──
const S3 = 'https://s3.test/bucket';
const TOKENS: Record<string, { php: string; node: string }> = {
  IMG_OLD: { php: '/assets/sites/7/posts/post_0123456789ab.jpg', node: `${S3}/assets/sites/7/posts/post_1700000000000_abc123.jpg` },
  IMG_NEW: { php: '/assets/sites/7/posts/post_111111111111.png', node: `${S3}/assets/sites/7/posts/post_1700000000001_new001.png` },
  SEO_OLD: { php: '/assets/sites/7/seo/seo_0123456789ab.png', node: `${S3}/assets/sites/7/seo/seo_1700000000000_abc123.png` },
  SEO_NEW: { php: '/assets/sites/7/seo/seo_111111111111.png', node: `${S3}/assets/sites/7/seo/seo_1700000000001_new001.png` },
  // Foto yang disimpan tab lain di antara baca dan simpan (hanya ada di baris tiruan, tidak di jawaban)
  IMG_OTHER: { php: '/assets/sites/7/posts/post_222222222222.webp', node: `${S3}/assets/sites/7/posts/post_1700000000002_oth002.webp` },
  SEO_OTHER: { php: '/assets/sites/7/seo/seo_222222222222.webp', node: `${S3}/assets/sites/7/seo/seo_1700000000002_oth002.webp` },
};

function materialize<T>(value: T, backend: 'php' | 'node'): T {
  if (typeof value === 'string') return (TOKENS[value]?.[backend] ?? value) as T;
  if (Array.isArray(value)) return value.map((v) => materialize(v, backend)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, materialize(v, backend)])) as T;
  }
  return value;
}

function normalize(result: unknown, today: string) {
  const text = JSON.stringify(result)
    .split(`${S3}/`).join('/')
    .replace(/_(0123456789ab|1700000000000_abc123)\./g, '_OLD.')
    .replace(/_(111111111111|1700000000001_new001)\./g, '_NEW.')
    .split(`"${today}"`).join('"TODAY"');
  return JSON.parse(text);
}

// ── Data tiruan ──
const b64 = (bytes: Buffer | string) => Buffer.from(bytes).toString('base64');
const PNG = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`;
const JPEG = `data:image/jpeg;base64,${b64(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16, 1)]))}`;
const SVG = `data:image/svg+xml;base64,${b64('<svg xmlns="http://www.w3.org/2000/svg"/>')}`;
const GOOGLE_TAG = '<meta name="google-site-verification" content="Xy_1-abcdefghijklmnopqrstuvwxyzABCDEFGHIJK" />';

const CUSTOMER = { id: 42, role: 'customer', name: 'Budi', email: 'budi@contoh.id' };
const SITE = {
  id: 7, order_id: 3, user_id: 42, template_id: 12, template_code: 'madani', domain: 'smamadani.sch.id', status: 'active',
  content: JSON.stringify({ brand: { company_name: 'SMA Al-Hikmah Bogor' } }), activated_at: '2026-10-20 10:00:00',
  updated_at: '2026-10-25 08:00:00', order_number: 'GN-20261020-ABCDEF', template_name: 'Madani', owner_name: 'Budi', owner_email: 'budi@contoh.id',
};
const PUBLIC_SITE = { id: 7, template_code: 'madani', domain: 'smamadani.sch.id', status: 'active' };
const ROW = (extra: Record<string, unknown> = {}) => ({
  id: 15, kind: 'berita', slug: 'juara-olimpiade', title: 'Juara Olimpiade', excerpt: 'Ringkasan', category: 'Prestasi', badge: '',
  image: 'IMG_OLD', image_alt: 'Piala', link_url: '', published_at: '2026-10-20', updated_ts: 1761445800,
  body: 'Paragraf satu.\n\nParagraf dua.', seo_title: '', seo_description: '', noindex: 0, status: 'published', created_ts: 1761400000,
  view_count: 12, last_viewed_ts: 1761450000, ...extra,
});
const DRAFT = ROW({ id: 16, slug: 'rapat-guru', title: 'Rapat Guru', image: null, status: 'draft', published_at: null, view_count: null, last_viewed_ts: null });
const SEO_ROW = (extra: Record<string, unknown> = {}) => ({
  title: 'SMA Al-Hikmah Bogor', description: 'Sekolah Islam di Bogor.', og_image: 'SEO_OLD', google_verification: 'abcdefghijABCDEFGHIJ_-123',
  bing_verification: '', index_mode: 'auto', schema_type: '', updated_ts: 1761357600, ...extra,
});
const NEW_POST = {
  kind: 'berita', title: 'Juara Olimpiade Sains', slug: '', excerpt: 'Tim sains meraih emas.', body: 'Isi berita.', category: 'Prestasi',
  badge: '', image: PNG, image_alt: 'Piala', link_url: '', status: 'published', published_at: '', seo_title: '', seo_description: '', noindex: false,
};

// Potongan SQL yang harus ada di kueri ke-n (sama persis di kedua modul)
const Q = {
  ownSite: 'WHERE s.id = ? AND s.user_id = ?',
  activeSite: "FROM template_sites WHERE id = ? AND status = 'active'",
  existing: 'SELECT id, slug, image FROM site_posts WHERE id = ? AND site_id = ?',
  count: 'SELECT COUNT(*) AS n FROM site_posts WHERE site_id = ?',
  slugs: 'SELECT slug FROM site_posts WHERE site_id = ? AND id <> ?',
  insert: 'INSERT INTO site_posts (site_id, kind, slug, title,',
  update: 'UPDATE site_posts SET kind = ?, slug = ?, title = ?',
  recheck: 'SELECT image FROM site_posts WHERE id = ? AND site_id = ? LIMIT 1',
  reread: 'WHERE p.site_id = ? AND p.slug = ? LIMIT 1',
  adminList: 'WHERE p.site_id = ? ORDER BY p.published_at IS NULL DESC',
  deleteViews: 'DELETE FROM site_post_views WHERE post_id = ?',
  deletePost: 'DELETE FROM site_posts WHERE id = ? AND site_id = ?',
  publicList: "AND p.kind = ? AND p.status = 'published'",
  publicCount: "SELECT COUNT(*) AS n FROM site_posts WHERE site_id = ? AND kind = ? AND status = 'published'",
  publicPost: "WHERE p.site_id = ? AND p.slug = ? AND p.status = 'published' LIMIT 1",
  viewUpsert: 'INSERT INTO site_post_views (post_id, site_id, view_count, last_viewed_at)',
  viewCount: 'SELECT view_count FROM site_post_views WHERE post_id = ?',
  seoRow: 'FROM site_seo WHERE site_id = ? LIMIT 1',
  seoInsert: 'INSERT INTO site_seo (site_id, title, description, og_image,',
  seoUpdate: 'UPDATE site_seo SET title = ?, description = ?, og_image = ?',
  seoRecheck: 'SELECT og_image FROM site_seo WHERE site_id = ? LIMIT 1',
};

/** rows = hasil SELECT; affected = baris yang dikenai INSERT/UPDATE (bawaan 1); duplicate = kunci unik bentrok (1062). */
interface Step { q: string; rows?: unknown[]; error?: string; affected?: number; duplicate?: boolean }
interface Case {
  name: string;
  action: string;
  method?: 'GET' | 'POST';
  input: Record<string, unknown>;
  user?: Record<string, unknown> | null;
  ua?: string;
  steps: Step[];
}
/** Isi JSON jawaban yang dibaca tes (bentuk lengkapnya dibandingkan PHP ↔ Node dengan toEqual). */
interface Body {
  success?: boolean;
  error?: string;
  code?: string;
  errors?: Record<string, string>;
  posts?: Record<string, unknown>[];
  post?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  status?: unknown;
  total?: number;
  views?: number;
  limits?: unknown;
}
interface Outcome {
  status: number;
  body: Body;
  queries: { q: string; params: unknown[] }[];
  unused: number;
  uploads: unknown[][];
  deletes: string[];
  internal?: string;
}

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36';
const CASES: Case[] = [
  // ── Pembeli: daftar ──
  { name: 'daftar tulisan pembeli', action: 'customer_get_site_posts', method: 'GET', input: { site_id: '7' },
    steps: [{ q: Q.ownSite, rows: [SITE] }, { q: Q.adminList, rows: [DRAFT, ROW()] }] },
  { name: 'situs orang lain', action: 'customer_get_site_posts', method: 'GET', input: { site_id: '8' }, steps: [{ q: Q.ownSite, rows: [] }] },
  { name: 'template tanpa fitur tulisan', action: 'customer_get_site_posts', method: 'GET', input: { site_id: 7 },
    steps: [{ q: Q.ownSite, rows: [{ ...SITE, template_code: 'corporate-nexa' }] }] },
  { name: 'akun staf', action: 'customer_get_site_posts', method: 'GET', input: { site_id: 7 }, user: { id: 1, role: 'admin' }, steps: [] },
  { name: 'tanpa sesi', action: 'customer_get_site_posts', method: 'GET', input: { site_id: 7 }, user: null, steps: [] },
  { name: 'simpan lewat GET', action: 'customer_save_site_post', method: 'GET', input: { site_id: 7 }, steps: [] },
  // ── Pembeli: simpan ──
  { name: 'tulisan baru: slug otomatis bentrok, foto diunggah', action: 'customer_save_site_post', input: { site_id: 7, post: NEW_POST },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.count, rows: [{ n: 3 }] }, { q: Q.slugs, rows: [{ slug: 'juara-olimpiade-sains' }, { slug: 'lain' }] },
      { q: Q.insert }, { q: Q.reread, rows: [ROW({ id: 20, slug: 'juara-olimpiade-sains-2', title: 'Juara Olimpiade Sains', image: 'IMG_NEW', view_count: 4 })] },
      { q: Q.deleteViews },
    ] },
  { name: 'ubah tulisan: foto tetap, jadi draf', action: 'customer_save_site_post',
    input: { site_id: 7, post: { ...NEW_POST, id: 15, slug: 'juara-olimpiade', image: 'IMG_OLD', status: 'draft', published_at: '2026-10-20', noindex: '1' } },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.existing, rows: [{ id: 15, slug: 'juara-olimpiade', image: 'IMG_OLD' }] },
      { q: Q.slugs, rows: [{ slug: 'lain' }] }, { q: Q.update }, { q: Q.reread, rows: [ROW({ status: 'draft', noindex: 1 })] },
    ] },
  { name: 'ubah tulisan: foto diganti', action: 'customer_save_site_post',
    input: { site_id: 7, post: { ...NEW_POST, id: 15, slug: 'juara-olimpiade', image: JPEG } },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.existing, rows: [{ id: 15, slug: 'juara-olimpiade', image: 'IMG_OLD' }] },
      { q: Q.slugs, rows: [] }, { q: Q.update }, { q: Q.reread, rows: [ROW()] },
    ] },
  { name: 'ubah tulisan: foto dihapus, slug kosong dibuat ulang', action: 'customer_save_site_post',
    input: { site_id: 7, post: { ...NEW_POST, id: '15', image: null } },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.existing, rows: [{ id: 15, slug: 'juara-olimpiade', image: 'IMG_OLD' }] },
      { q: Q.slugs, rows: [] }, { q: Q.update }, { q: Q.reread, rows: [ROW({ image: null, slug: 'juara-olimpiade-sains' })] },
    ] },
  { name: 'slug dipakai tulisan lain', action: 'customer_save_site_post', input: { site_id: 7, post: { ...NEW_POST, slug: 'juara-olimpiade' } },
    steps: [{ q: Q.ownSite, rows: [SITE] }, { q: Q.count, rows: [{ n: 3 }] }, { q: Q.slugs, rows: [{ slug: 'juara-olimpiade' }] }] },
  { name: 'validasi gagal', action: 'customer_save_site_post',
    input: { site_id: 7, post: { kind: 'artikel', title: 'ab', image: SVG, link_url: 'javascript:alert(1)', status: 'published' } },
    steps: [{ q: Q.ownSite, rows: [SITE] }, { q: Q.count, rows: [{ n: 0 }] }] },
  { name: 'batas 500 tulisan', action: 'customer_save_site_post', input: { site_id: 7, post: NEW_POST },
    steps: [{ q: Q.ownSite, rows: [SITE] }, { q: Q.count, rows: [{ n: 500 }] }] },
  { name: 'tulisan yang diubah tidak ada', action: 'customer_save_site_post', input: { site_id: 7, post: { ...NEW_POST, id: 99 } },
    steps: [{ q: Q.ownSite, rows: [SITE] }, { q: Q.existing, rows: [] }] },
  { name: 'situs nonaktif', action: 'customer_save_site_post', input: { site_id: 7, post: NEW_POST },
    steps: [{ q: Q.ownSite, rows: [{ ...SITE, status: 'suspended' }] }] },
  { name: 'tanpa data tulisan', action: 'customer_save_site_post', input: { site_id: 7, post: 'x' }, steps: [{ q: Q.ownSite, rows: [SITE] }] },
  { name: 'database gagal setelah foto diunggah', action: 'customer_save_site_post', input: { site_id: 7, post: NEW_POST },
    steps: [{ q: Q.ownSite, rows: [SITE] }, { q: Q.count, rows: [{ n: 0 }] }, { q: Q.slugs, rows: [] }, { q: Q.insert, error: 'boom' }] },
  // ── Pembeli: simpan bersamaan dari tab lain (UPDATE … AND image <=> foto yang tadi dibaca mengenai 0 baris) ──
  { name: 'ubah tulisan: dihapus di tab lain saat foto diunggah', action: 'customer_save_site_post',
    input: { site_id: 7, post: { ...NEW_POST, id: 15, slug: 'juara-olimpiade', image: JPEG } },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.existing, rows: [{ id: 15, slug: 'juara-olimpiade', image: 'IMG_OLD' }] },
      { q: Q.slugs, rows: [] }, { q: Q.update, affected: 0 }, { q: Q.recheck, rows: [] },
    ] },
  { name: 'ubah tulisan: foto diganti di tab lain saat foto diunggah', action: 'customer_save_site_post',
    input: { site_id: 7, post: { ...NEW_POST, id: 15, slug: 'juara-olimpiade', image: JPEG } },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.existing, rows: [{ id: 15, slug: 'juara-olimpiade', image: 'IMG_OLD' }] },
      { q: Q.slugs, rows: [] }, { q: Q.update, affected: 0 }, { q: Q.recheck, rows: [{ image: 'IMG_OTHER' }] },
    ] },
  { name: 'ubah tulisan: foto baru tidak tersimpan walau foto lama masih sama', action: 'customer_save_site_post',
    input: { site_id: 7, post: { ...NEW_POST, id: 15, slug: 'juara-olimpiade', image: JPEG } },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.existing, rows: [{ id: 15, slug: 'juara-olimpiade', image: 'IMG_OLD' }] },
      { q: Q.slugs, rows: [] }, { q: Q.update, affected: 0 }, { q: Q.recheck, rows: [{ image: 'IMG_OLD' }] },
    ] },
  { name: 'ubah tulisan tanpa foto baru: foto dihapus di tab lain', action: 'customer_save_site_post',
    input: { site_id: 7, post: { ...NEW_POST, id: 15, slug: 'juara-olimpiade', image: 'IMG_OLD' } },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.existing, rows: [{ id: 15, slug: 'juara-olimpiade', image: 'IMG_OLD' }] },
      { q: Q.slugs, rows: [] }, { q: Q.update, affected: 0 }, { q: Q.recheck, rows: [{ image: null }] },
    ] },
  { name: 'ubah tulisan: isian sama persis (0 baris berubah)', action: 'customer_save_site_post',
    input: { site_id: 7, post: { ...NEW_POST, id: 15, slug: 'juara-olimpiade', image: 'IMG_OLD' } },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.existing, rows: [{ id: 15, slug: 'juara-olimpiade', image: 'IMG_OLD' }] },
      { q: Q.slugs, rows: [] }, { q: Q.update, affected: 0 }, { q: Q.recheck, rows: [{ image: 'IMG_OLD' }] }, { q: Q.reread, rows: [ROW()] },
    ] },
  // ── Pembeli: hapus ──
  { name: 'hapus tulisan', action: 'customer_delete_site_post', input: { site_id: 7, post_id: 15 },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.existing, rows: [{ id: 15, slug: 'juara-olimpiade', image: 'IMG_OLD' }] },
      { q: Q.deletePost }, { q: Q.deleteViews },
    ] },
  { name: 'hapus tanpa post_id', action: 'customer_delete_site_post', input: { site_id: 7 }, steps: [{ q: Q.ownSite, rows: [SITE] }] },
  // ── Pembeli: SEO ──
  { name: 'SEO: belum ada pengaturan', action: 'customer_get_site_seo', method: 'GET', input: { site_id: '7' },
    steps: [{ q: Q.ownSite, rows: [SITE] }, { q: Q.seoRow, rows: [] }] },
  { name: 'SEO: konten masih bawaan (template tanpa fitur tulisan)', action: 'customer_get_site_seo', method: 'GET', input: { site_id: '7' },
    steps: [{ q: Q.ownSite, rows: [{ ...SITE, template_code: 'corporate-nexa', content: null }] }, { q: Q.seoRow, rows: [SEO_ROW()] }] },
  { name: 'SEO: simpan lengkap dengan gambar baru', action: 'customer_save_site_seo',
    input: { site_id: 7, seo: { title: ' SMA  Al-Hikmah ', description: 'Deskripsi.', og_image: PNG, google_verification: GOOGLE_TAG, bing_verification: '', index_mode: 'noindex', schema_type: 'HighSchool' } },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.seoRow, rows: [SEO_ROW()] }, { q: Q.seoUpdate },
      { q: Q.seoRow, rows: [SEO_ROW({ title: 'SMA Al-Hikmah', description: 'Deskripsi.', og_image: 'SEO_NEW', google_verification: 'Xy_1-abcdefghijklmnopqrstuvwxyzABCDEFGHIJK', index_mode: 'noindex', schema_type: 'HighSchool' })] },
    ] },
  { name: 'SEO: sebagian (index_mode saja)', action: 'customer_save_site_seo', input: { site_id: 7, seo: { index_mode: 'index' } },
    steps: [{ q: Q.ownSite, rows: [SITE] }, { q: Q.seoRow, rows: [SEO_ROW()] }, { q: Q.seoUpdate }, { q: Q.seoRow, rows: [SEO_ROW({ index_mode: 'index' })] }] },
  { name: 'SEO: simpan pertama (belum ada baris)', action: 'customer_save_site_seo', input: { site_id: 7, seo: { title: 'SMA Al-Hikmah', index_mode: 'index' } },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.seoRow, rows: [] }, { q: Q.seoInsert },
      { q: Q.seoRow, rows: [SEO_ROW({ title: 'SMA Al-Hikmah', description: '', og_image: null, google_verification: '', index_mode: 'index' })] },
    ] },
  // ── SEO: simpan bersamaan dari tab lain ──
  { name: 'SEO: gambar diganti di tab lain saat gambar diunggah', action: 'customer_save_site_seo', input: { site_id: 7, seo: { og_image: PNG } },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.seoRow, rows: [SEO_ROW()] }, { q: Q.seoUpdate, affected: 0 },
      { q: Q.seoRecheck, rows: [{ og_image: 'SEO_OTHER' }] },
    ] },
  { name: 'SEO: baris dibuat tab lain (duplikat)', action: 'customer_save_site_seo', input: { site_id: 7, seo: { og_image: PNG } },
    steps: [{ q: Q.ownSite, rows: [SITE] }, { q: Q.seoRow, rows: [] }, { q: Q.seoInsert, duplicate: true }] },
  { name: 'SEO: isian sama persis (0 baris berubah)', action: 'customer_save_site_seo', input: { site_id: 7, seo: { index_mode: 'auto' } },
    steps: [
      { q: Q.ownSite, rows: [SITE] }, { q: Q.seoRow, rows: [SEO_ROW()] }, { q: Q.seoUpdate, affected: 0 },
      { q: Q.seoRecheck, rows: [{ og_image: 'SEO_OLD' }] }, { q: Q.seoRow, rows: [SEO_ROW()] },
    ] },
  { name: 'SEO: tidak valid', action: 'customer_save_site_seo', input: { site_id: 7, seo: { google_verification: 'pendek', schema_type: 'Church' } },
    steps: [{ q: Q.ownSite, rows: [SITE] }, { q: Q.seoRow, rows: [] }] },
  { name: 'SEO: situs nonaktif', action: 'customer_save_site_seo', input: { site_id: 7, seo: { index_mode: 'index' } },
    steps: [{ q: Q.ownSite, rows: [{ ...SITE, status: 'suspended' }] }] },
  { name: 'SEO: tanpa data', action: 'customer_save_site_seo', input: { site_id: 7 }, steps: [{ q: Q.ownSite, rows: [SITE] }] },
  // ── Publik ──
  { name: 'SEO publik', action: 'get_site_seo', method: 'GET', input: { site_id: '7' },
    steps: [{ q: Q.activeSite, rows: [{ ...PUBLIC_SITE, content: SITE.content }] }, { q: Q.seoRow, rows: [SEO_ROW()] }] },
  { name: 'SEO publik: situs nonaktif', action: 'get_site_seo', method: 'GET', input: { site_id: '7' }, steps: [{ q: Q.activeSite, rows: [] }] },
  { name: 'daftar publik (limit dibatasi 100)', action: 'get_site_posts', method: 'GET', input: { site_id: '7', kind: 'berita', limit: '500' },
    steps: [{ q: Q.activeSite, rows: [PUBLIC_SITE] }, { q: Q.publicList, rows: [ROW()] }, { q: Q.publicCount, rows: [{ n: 5 }] }] },
  { name: 'daftar publik bawaan 12', action: 'get_site_posts', method: 'GET', input: { site_id: '7', kind: 'pengumuman' },
    steps: [{ q: Q.activeSite, rows: [PUBLIC_SITE] }, { q: Q.publicList, rows: [] }, { q: Q.publicCount, rows: [{ n: 0 }] }] },
  { name: 'daftar publik: jenis salah', action: 'get_site_posts', method: 'GET', input: { site_id: '7', kind: 'artikel' },
    steps: [{ q: Q.activeSite, rows: [PUBLIC_SITE] }] },
  { name: 'daftar publik: template tanpa fitur tulisan', action: 'get_site_posts', method: 'GET', input: { site_id: '7', kind: 'berita' },
    steps: [{ q: Q.activeSite, rows: [{ ...PUBLIC_SITE, template_code: 'finova' }] }] },
  { name: 'tulisan publik', action: 'get_site_post', method: 'GET', input: { site_id: '7', slug: ' juara-olimpiade ' },
    steps: [{ q: Q.activeSite, rows: [PUBLIC_SITE] }, { q: Q.publicPost, rows: [ROW()] }] },
  { name: 'tulisan publik: slug tidak sah', action: 'get_site_post', method: 'GET', input: { site_id: '7', slug: 'Bad Slug' },
    steps: [{ q: Q.activeSite, rows: [PUBLIC_SITE] }] },
  { name: 'tulisan publik: draf atau tidak ada', action: 'get_site_post', method: 'GET', input: { site_id: '7', slug: 'rapat-guru' },
    steps: [{ q: Q.activeSite, rows: [PUBLIC_SITE] }, { q: Q.publicPost, rows: [] }] },
  { name: 'dilihat', action: 'site_post_view', input: { site_id: 7, slug: 'juara-olimpiade' }, ua: CHROME,
    steps: [{ q: Q.activeSite, rows: [PUBLIC_SITE] }, { q: Q.publicPost, rows: [ROW()] }, { q: Q.viewUpsert }, { q: Q.viewCount, rows: [{ view_count: 13 }] }] },
  { name: 'dilihat perayap (tidak dihitung)', action: 'site_post_view', input: { site_id: 7, slug: 'juara-olimpiade' },
    ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    steps: [{ q: Q.activeSite, rows: [PUBLIC_SITE] }, { q: Q.publicPost, rows: [ROW()] }, { q: Q.viewCount, rows: [] }] },
  { name: 'dilihat lewat GET', action: 'site_post_view', method: 'GET', input: { site_id: '7', slug: 'juara-olimpiade' }, steps: [] },
];

const caseOf = (name: string) => {
  const i = CASES.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`no case ${name}`);
  return i;
};

// ── Node: handler asli, pool tiruan yang menjawab sesuai naskah ──
const consoleErrors: unknown[][] = [];

async function runNode(c: Case): Promise<Outcome> {
  const steps = materialize(c.steps, 'node');
  const input = materialize(c.input, 'node');
  const queries: Outcome['queries'] = [];
  let at = 0;
  const pool = {
    async query({ sql, values }: { sql: string; values: unknown[] }) {
      const step = steps[at];
      if (!step || !sql.includes(step.q)) throw new Error(`unexpected query #${at}: ${sql}`);
      at++;
      queries.push({ q: step.q, params: values });
      if (step.error) throw new Error(step.error);
      // Kunci unik bentrok: galat mysql2 yang diubah dbRun menjadi 409
      if (step.duplicate) throw Object.assign(new Error("Duplicate entry '7' for key 'PRIMARY'"), { code: 'ER_DUP_ENTRY', errno: 1062 });
      return [step.rows ?? { affectedRows: step.affected ?? 1 }];
    },
  };
  s3.uploads.length = 0;
  s3.deletes.length = 0;
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
  const method = c.method ?? 'POST';
  const req = {
    method,
    query: method === 'GET' ? input : {},
    user: c.user === undefined ? CUSTOMER : c.user,
    ip: '203.0.113.9',
    headers: { 'user-agent': c.ua ?? CHROME },
  };
  expect(await handleSitePostAction(c.action, input, req, res, pool)).toBe(true);
  return {
    status: res.statusCode,
    body: res.body as Body,
    queries,
    unused: steps.length - at,
    uploads: s3.uploads.map((u) => [...u]),
    deletes: [...s3.deletes],
  };
}

let NODE: Outcome[] = [];

beforeAll(async () => {
  const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args);
  });
  NODE = [];
  for (const c of CASES) NODE.push(await runNode(c));
  spy.mockRestore();
});

const nodeOf = (name: string) => normalize(NODE[caseOf(name)], jakartaToday()) as Outcome;

describe('site_posts.js: aksi lengkap', () => {
  it('setiap kasus memakai semua kueri naskahnya dan tidak ada galat tak terduga', () => {
    const unused = CASES.map((c, i) => [c.name, NODE[i].unused]).filter(([, n]) => n !== 0);
    expect(unused).toEqual([]);
    // Satu-satunya galat server: database gagal setelah foto diunggah
    expect(consoleErrors.map((args) => String((args[1] as Error)?.message ?? args[1]))).toEqual(['boom']);
  });

  it('pembeli: daftar tulisan dengan jumlah dilihat, draf tanpa tanggal di atas', () => {
    const out = nodeOf('daftar tulisan pembeli');
    expect(out.status).toBe(200);
    expect(out.queries[0].params).toEqual([7, 42]);
    expect(out.body.limits).toEqual({ max_posts: 500 });
    expect(out.body.posts!.map((p) => [p.slug, p.status, p.view_count, p.last_viewed_at, p.url])).toEqual([
      ['rapat-guru', 'draft', 0, null, 'https://smamadani.sch.id/berita/rapat-guru'],
      ['juara-olimpiade', 'published', 12, '2025-10-26T10:40:00+07:00', 'https://smamadani.sch.id/berita/juara-olimpiade'],
    ]);
    expect(out.body.posts![1].image).toBe('/assets/sites/7/posts/post_OLD.jpg');
  });

  it('pembeli: kepemilikan, peran, template dan metode', () => {
    const errorOf = (name: string) => {
      const out = nodeOf(name);
      return [out.status, out.body.code, out.body.error];
    };
    expect(errorOf('situs orang lain')).toEqual([404, 'SITE_NOT_FOUND', 'Situs tidak ditemukan.']);
    expect(errorOf('template tanpa fitur tulisan')).toEqual([403, 'POSTS_UNAVAILABLE', 'Template situs ini belum mendukung berita & pengumuman.']);
    expect(errorOf('akun staf')).toEqual([403, 'FORBIDDEN', 'Akses ditolak: aksi ini khusus akun pembeli.']);
    expect(errorOf('tanpa sesi')).toEqual([401, 'UNAUTHORIZED', 'Silakan masuk terlebih dahulu.']);
    expect(errorOf('simpan lewat GET')).toEqual([405, 'METHOD_NOT_ALLOWED', 'Gunakan metode POST untuk aksi ini.']);
    expect(errorOf('dilihat lewat GET')[0]).toBe(405);
    expect(errorOf('situs nonaktif')).toEqual([409, 'SITE_SUSPENDED', 'Situs sedang dinonaktifkan sehingga isinya tidak bisa diubah. Hubungi kami.']);
    expect(errorOf('SEO: situs nonaktif')[1]).toBe('SITE_SUSPENDED');
  });

  it('tulisan baru: slug otomatis -2, foto diunggah ke sites/{id}/posts, mulai dari 0 dilihat', () => {
    const out = nodeOf('tulisan baru: slug otomatis bentrok, foto diunggah');
    expect(out.status).toBe(200);
    expect(out.uploads).toEqual([['sites/7/posts', 'post']]);
    expect(out.deletes).toEqual([]);
    expect(out.queries[3].params).toEqual([
      7, 'berita', 'juara-olimpiade-sains-2', 'Juara Olimpiade Sains', 'Tim sains meraih emas.', 'Isi berita.', 'Prestasi', '',
      '/assets/sites/7/posts/post_NEW.png', 'Piala', '', 'published', 'TODAY', '', '', 0,
    ]);
    expect(out.queries[4].params).toEqual([7, 'juara-olimpiade-sains-2']);
    expect(out.queries[5].params).toEqual([20]);
    expect(out.body.post).toMatchObject({ id: 20, slug: 'juara-olimpiade-sains-2', view_count: 0, last_viewed_at: null, image: '/assets/sites/7/posts/post_NEW.png' });
  });

  it('ubah tulisan: foto tetap / diganti (lama dihapus) / dihapus', () => {
    const keep = nodeOf('ubah tulisan: foto tetap, jadi draf');
    expect([keep.status, keep.uploads, keep.deletes]).toEqual([200, [], []]);
    // Parameter terakhir = foto yang tadi dibaca (WHERE … AND image <=> ?)
    expect(keep.queries[3].params.slice(-11)).toEqual([
      '/assets/sites/7/posts/post_OLD.jpg', 'Piala', '', 'draft', '2026-10-20', '', '', 1, 15, 7, '/assets/sites/7/posts/post_OLD.jpg',
    ]);
    expect(keep.body.post).toMatchObject({ status: 'draft', noindex: true, view_count: 12 });

    const replaced = nodeOf('ubah tulisan: foto diganti');
    expect([replaced.status, replaced.uploads, replaced.deletes]).toEqual([200, [['sites/7/posts', 'post']], ['/assets/sites/7/posts/post_OLD.jpg']]);

    const removed = nodeOf('ubah tulisan: foto dihapus, slug kosong dibuat ulang');
    expect([removed.status, removed.uploads, removed.deletes]).toEqual([200, [], ['/assets/sites/7/posts/post_OLD.jpg']]);
    expect(removed.queries[3].params.slice(0, 2)).toEqual(['berita', 'juara-olimpiade-sains']);
    expect(removed.queries[3].params[7]).toBeNull();
    expect(removed.queries[3].params.slice(-3)).toEqual([15, 7, '/assets/sites/7/posts/post_OLD.jpg']);
  });

  it('simpan ditolak: slug dipakai, validasi, batas 500, tulisan tidak ada, tanpa data', () => {
    const taken = nodeOf('slug dipakai tulisan lain');
    expect([taken.status, taken.body]).toEqual([409, {
      error: 'Slug sudah dipakai tulisan lain di situs ini.', code: 'SLUG_TAKEN', errors: { slug: 'Slug sudah dipakai tulisan lain di situs ini.' },
    }]);
    expect(taken.uploads).toEqual([]);
    const invalid = nodeOf('validasi gagal');
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe('VALIDATION');
    expect(Object.keys(invalid.body.errors!)).toEqual(['kind', 'title', 'image', 'link_url']);
    expect(invalid.body.error).toBe(invalid.body.errors!.kind);
    expect(nodeOf('batas 500 tulisan').body.code).toBe('POST_LIMIT');
    expect(nodeOf('batas 500 tulisan').status).toBe(409);
    expect(nodeOf('tulisan yang diubah tidak ada').body).toEqual({ error: 'Tulisan tidak ditemukan.', code: 'POST_NOT_FOUND' });
    expect(nodeOf('tanpa data tulisan').body).toEqual({ error: 'Data tulisan wajib dikirim.', code: 'VALIDATION' });
  });

  it('database gagal: foto yang baru diunggah dihapus lagi, jawaban 500 tanpa rincian', () => {
    const out = nodeOf('database gagal setelah foto diunggah');
    expect([out.status, out.body]).toEqual([500, { error: GENERIC }]);
    expect(out.uploads).toEqual([['sites/7/posts', 'post']]);
    expect(out.deletes).toEqual(['/assets/sites/7/posts/post_NEW.png']);
  });

  it('simpan bersamaan di tab lain: tulisan hilang 404, foto berubah 409, foto baru request ini dihapus lagi', () => {
    const CHANGED = { error: 'Tulisan baru saja diubah di tab lain. Muat ulang lalu coba lagi.', code: 'POST_CHANGED' };
    const NEW_JPG = '/assets/sites/7/posts/post_NEW.jpg';
    const gone = nodeOf('ubah tulisan: dihapus di tab lain saat foto diunggah');
    expect([gone.status, gone.body]).toEqual([404, { error: 'Tulisan tidak ditemukan.', code: 'POST_NOT_FOUND' }]);
    expect([gone.uploads, gone.deletes]).toEqual([[['sites/7/posts', 'post']], [NEW_JPG]]);
    expect(gone.queries.map((q) => q.q)).toEqual([Q.ownSite, Q.existing, Q.slugs, Q.update, Q.recheck]);
    expect(gone.queries[3].params.slice(-3)).toEqual([15, 7, '/assets/sites/7/posts/post_OLD.jpg']);
    expect(gone.queries[4].params).toEqual([15, 7]);

    // Foto baru dihapus; foto lama dan foto tab lain tidak disentuh
    const changed = nodeOf('ubah tulisan: foto diganti di tab lain saat foto diunggah');
    expect([changed.status, changed.body, changed.deletes]).toEqual([409, CHANGED, [NEW_JPG]]);
    const unsaved = nodeOf('ubah tulisan: foto baru tidak tersimpan walau foto lama masih sama');
    expect([unsaved.status, unsaved.body, unsaved.deletes]).toEqual([409, CHANGED, [NEW_JPG]]);
    const keepChanged = nodeOf('ubah tulisan tanpa foto baru: foto dihapus di tab lain');
    expect([keepChanged.status, keepChanged.body, keepChanged.uploads, keepChanged.deletes]).toEqual([409, CHANGED, [], []]);

    // 0 baris karena isian sama persis (mysqli menghitung baris yang berubah saja): tetap berhasil
    const same = nodeOf('ubah tulisan: isian sama persis (0 baris berubah)');
    expect([same.status, same.uploads, same.deletes]).toEqual([200, [], []]);
    expect(same.body.post).toMatchObject({ id: 15, slug: 'juara-olimpiade', image: '/assets/sites/7/posts/post_OLD.jpg' });
  });

  it('hapus tulisan beserta jumlah dilihat dan fotonya', () => {
    const out = nodeOf('hapus tulisan');
    expect([out.status, out.body, out.deletes]).toEqual([200, { success: true }, ['/assets/sites/7/posts/post_OLD.jpg']]);
    expect(out.queries.map((q) => q.params)).toEqual([[7, 42], [15, 7], [15, 7], [15]]);
    expect(nodeOf('hapus tanpa post_id').body.code).toBe('POST_NOT_FOUND');
  });

  it('SEO pembeli: bawaan, alasan tidak tampil, simpan lengkap dan sebagian', () => {
    const empty = nodeOf('SEO: belum ada pengaturan');
    expect(empty.body).toEqual({
      success: true,
      seo: { title: '', description: '', og_image: null, google_verification: '', bing_verification: '', index_mode: 'auto', schema_type: '', updated_at: null },
      status: { indexable: true, reasons: [] },
      urls: { home: 'https://smamadani.sch.id/', sitemap: 'https://smamadani.sch.id/sitemap.xml', robots: 'https://smamadani.sch.id/robots.txt' },
    });
    expect(nodeOf('SEO: konten masih bawaan (template tanpa fitur tulisan)').body.status).toEqual({ indexable: false, reasons: ['default_content'] });

    const full = nodeOf('SEO: simpan lengkap dengan gambar baru');
    expect(full.status).toBe(200);
    expect(full.uploads).toEqual([['sites/7/seo', 'seo']]);
    expect(full.deletes).toEqual(['/assets/sites/7/seo/seo_OLD.png']);
    const values = ['SMA Al-Hikmah', 'Deskripsi.', '/assets/sites/7/seo/seo_NEW.png', 'Xy_1-abcdefghijklmnopqrstuvwxyzABCDEFGHIJK', '', 'noindex', 'HighSchool'];
    // UPDATE … WHERE site_id = ? AND og_image <=> gambar yang tadi dibaca
    expect(full.queries[2].params).toEqual([...values, 7, '/assets/sites/7/seo/seo_OLD.png']);
    expect(full.body.status).toEqual({ indexable: false, reasons: ['manual_noindex'] });
    expect(full.body.seo!.updated_at).toBe('2025-10-25T09:00:00+07:00');

    const partial = nodeOf('SEO: sebagian (index_mode saja)');
    const kept = ['SMA Al-Hikmah Bogor', 'Sekolah Islam di Bogor.', '/assets/sites/7/seo/seo_OLD.png', 'abcdefghijABCDEFGHIJ_-123', '', 'index', ''];
    expect(partial.queries[2].params).toEqual([...kept, 7, '/assets/sites/7/seo/seo_OLD.png']);
    expect([partial.uploads, partial.deletes]).toEqual([[], []]);

    const invalid = nodeOf('SEO: tidak valid');
    expect(invalid.status).toBe(400);
    expect(Object.keys(invalid.body.errors!)).toEqual(['google_verification', 'schema_type']);
    expect(nodeOf('SEO: tanpa data').body).toEqual({ error: 'Pengaturan SEO wajib dikirim.', code: 'VALIDATION' });
  });

  it('SEO bersamaan di tab lain: baris pertama INSERT biasa, gambar/baris berubah → 409 dan gambar baru dihapus', () => {
    const first = nodeOf('SEO: simpan pertama (belum ada baris)');
    expect(first.status).toBe(200);
    expect(first.queries.map((q) => q.q)).toEqual([Q.ownSite, Q.seoRow, Q.seoInsert, Q.seoRow]);
    expect(first.queries[2].params).toEqual([7, 'SMA Al-Hikmah', '', null, '', '', 'index', '']);
    expect(first.body.seo).toMatchObject({ title: 'SMA Al-Hikmah', og_image: null, index_mode: 'index' });

    const CHANGED = { error: 'Pengaturan SEO baru saja diubah di tab lain. Muat ulang lalu coba lagi.', code: 'SEO_CHANGED' };
    const NEW_PNG = '/assets/sites/7/seo/seo_NEW.png';
    const changed = nodeOf('SEO: gambar diganti di tab lain saat gambar diunggah');
    expect([changed.status, changed.body, changed.uploads, changed.deletes]).toEqual([409, CHANGED, [['sites/7/seo', 'seo']], [NEW_PNG]]);
    expect(changed.queries[3].params).toEqual([7]);
    const dup = nodeOf('SEO: baris dibuat tab lain (duplikat)');
    expect([dup.status, dup.body, dup.deletes]).toEqual([409, CHANGED, [NEW_PNG]]);

    const same = nodeOf('SEO: isian sama persis (0 baris berubah)');
    expect([same.status, same.uploads, same.deletes]).toEqual([200, [], []]);
    expect(same.body.seo!.index_mode).toBe('auto');
  });

  it('UPDATE bersyarat foto yang tadi dibaca, tanpa upsert, di kedua modul', () => {
    for (const source of [read('backend', 'modules', 'site_posts.php'), read('backend', 'modules', 'site_posts.js')]) {
      expect(source).toContain('WHERE id = ? AND site_id = ? AND image <=> ?');
      expect(source).toContain('WHERE site_id = ? AND og_image <=> ?');
      expect(source).not.toContain('ON DUPLICATE KEY UPDATE title');
    }
  });

  it('publik: SEO tanpa kode verifikasi, daftar & tulisan terbit, situs nonaktif 404', () => {
    expect(nodeOf('SEO publik').body).toEqual({
      success: true,
      seo: { title: 'SMA Al-Hikmah Bogor', description: 'Sekolah Islam di Bogor.', og_image: '/assets/sites/7/seo/seo_OLD.png', schema_type: '', indexable: true },
    });
    expect(nodeOf('SEO publik: situs nonaktif').body).toEqual({ error: 'Situs tidak ditemukan atau sedang tidak aktif.', code: 'SITE_NOT_FOUND' });
    const list = nodeOf('daftar publik (limit dibatasi 100)');
    expect(list.queries[1].params).toEqual([7, 'berita', 100]);
    expect(list.body.total).toBe(5);
    expect(Object.keys(list.body.posts![0])).toEqual([
      'id', 'kind', 'slug', 'title', 'excerpt', 'category', 'badge', 'image', 'image_alt', 'link_url', 'published_at', 'updated_at',
    ]);
    expect(nodeOf('daftar publik bawaan 12').queries[1].params).toEqual([7, 'pengumuman', 12]);
    expect(nodeOf('daftar publik: jenis salah').body.errors).toEqual({ kind: 'Jenis tulisan harus berita atau pengumuman.' });
    expect(nodeOf('daftar publik: template tanpa fitur tulisan').body).toEqual({ success: true, posts: [], total: 0 });
    const post = nodeOf('tulisan publik');
    expect(post.queries[1].params).toEqual([7, 'juara-olimpiade']);
    expect(post.body.post).toMatchObject({ slug: 'juara-olimpiade', body: 'Paragraf satu.\n\nParagraf dua.', noindex: false });
    expect(post.body.post).not.toHaveProperty('status');
    expect(post.body.post).not.toHaveProperty('view_count');
    expect(nodeOf('tulisan publik: slug tidak sah').body.code).toBe('POST_NOT_FOUND');
    expect(nodeOf('tulisan publik: draf atau tidak ada').status).toBe(404);
  });

  it('dilihat: +1 untuk pengunjung, perayap hanya dibaca', () => {
    const view = nodeOf('dilihat');
    expect(view.body).toEqual({ success: true, views: 13 });
    expect(view.queries.map((q) => q.q)).toEqual([Q.activeSite, Q.publicPost, Q.viewUpsert, Q.viewCount]);
    expect(view.queries[2].params).toEqual([15, 7]);
    const bot = nodeOf('dilihat perayap (tidak dihitung)');
    expect(bot.body).toEqual({ success: true, views: 0 });
    expect(bot.queries.map((q) => q.q)).not.toContain(Q.viewUpsert);
  });
});

// ── PHP: modul asli di CLI, fungsi api.php/templates.php yang dipakai disalin apa adanya, database bernaskah ──
function phpBlock(source: string, file: string, pattern: string) {
  const match = source.match(new RegExp(`^${pattern}[\\s\\S]*?^}\\r?$`, 'm'));
  if (!match) throw new Error(`${pattern} not found in ${file}`);
  return match[0];
}
const API_BLOCKS = ['class ApiError ', ...['in_str', 'in_int', 'env_value', 'upload_limit_bytes', 'sniff_image', 'svg_has_active_content', 'parse_upload']
  .map((n) => `function ${n}\\(`)].map((p) => phpBlock(API_PHP, 'backend/api.php', p)).join('\n');
const TEMPLATE_BLOCKS = [
  TEMPLATES_PHP.match(/^const PF_GENERATED_ASSET = .*$/m)![0],
  ...['pf_require_customer', 'pf_site_select', 'pf_customer_site', 'pf_delete_generated']
    .map((n) => phpBlock(TEMPLATES_PHP, 'backend/modules/templates.php', `function ${n}\\(`)),
].join('\n');

const CLI_HARNESS = String.raw`<?php
${API_BLOCKS}
${TEMPLATE_BLOCKS}
function client_ip() { return '203.0.113.9'; }
function rate_limit_wait($key, $max) { return 0; }
function rate_limit_hit($key, $windowSeconds) {}
function too_many_attempts($seconds) { throw new ApiError('Terlalu banyak percobaan.', 429); }
function db_next(string $sql, array $params) {
    $at = $GLOBALS['__at'];
    $step = $GLOBALS['__steps'][$at] ?? null;
    if (!$step || strpos($sql, $step['q']) === false) throw new Exception("unexpected query #$at: $sql");
    $GLOBALS['__at']++;
    $GLOBALS['__queries'][] = ['q' => $step['q'], 'params' => array_values($params)];
    if (isset($step['error'])) throw new Exception($step['error']);
    // Kunci unik bentrok: db_run di api.php mengubah galat MySQL 1062 menjadi ApiError 409
    if (!empty($step['duplicate'])) throw new ApiError('Data yang sama sudah ada (duplikat).', 409);
    $GLOBALS['__affected'] = $step['affected'] ?? 1;
    return $step;
}
function db_affected_rows() { return (int)$GLOBALS['__affected']; }
function db_one($conn, $sql, array $params = []) { return db_next($sql, $params)['rows'][0] ?? null; }
function db_all($conn, $sql, array $params = []) { return db_next($sql, $params)['rows'] ?? []; }
function db_run($conn, $sql, array $params = []) { db_next($sql, $params); return true; }
function save_base64_asset($data, $section, $filename = null) {
    [, $ext] = parse_upload(trim($data), false);
    $GLOBALS['__uploads'][] = [$section, $filename];
    return '/assets/' . $section . '/' . $filename . '_111111111111.' . $ext;
}
function delete_local_asset($path, $section) {
    if (is_string($path) && strpos($path, '/assets/' . $section . '/') === 0) $GLOBALS['__deletes'][] = $path;
}
require getenv('SP_MODULE');

$out = ['today' => sp_today(), 'results' => []];
foreach (json_decode(stream_get_contents(STDIN), true) as $case) {
    $GLOBALS['__steps'] = $case['steps'];
    $GLOBALS['__at'] = 0;
    $GLOBALS['__affected'] = 0;
    $GLOBALS['__queries'] = [];
    $GLOBALS['__uploads'] = [];
    $GLOBALS['__deletes'] = [];
    $_SERVER['REQUEST_METHOD'] = $case['method'];
    $_SERVER['HTTP_USER_AGENT'] = $case['ua'];
    $r = [];
    ob_start();
    try {
        handle_site_post_action(mysqli_init(), $case['action'], $case['input'], $case['user']);
        $r = ['status' => 200, 'body' => json_decode(ob_get_clean(), true)];
    } catch (ApiError $e) {
        ob_end_clean();
        $body = ['error' => $e->getMessage()];
        if ($e->errorCode) $body['code'] = $e->errorCode;
        if ($e->fieldErrors) $body['errors'] = $e->fieldErrors;
        $r = ['status' => $e->status, 'body' => $body];
    } catch (Throwable $e) {
        ob_end_clean();
        $r = ['status' => 500, 'body' => ['error' => GENERIC_ERROR], 'internal' => $e->getMessage()];
    }
    $r['queries'] = $GLOBALS['__queries'];
    $r['unused'] = count($GLOBALS['__steps']) - $GLOBALS['__at'];
    $r['uploads'] = $GLOBALS['__uploads'];
    $r['deletes'] = $GLOBALS['__deletes'];
    $out['results'][] = $r;
}
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

describe.skipIf(!PHP_AVAILABLE)('site_posts.php menjawab sama dengan site_posts.js', () => {
  let dir = '';
  let php: { today: string; results: Outcome[] } = { today: '', results: [] };
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'gn-site-posts-php-'));
    writeFileSync(join(dir, 'cli.php'), `${CLI_HARNESS.replace('<?php\n', "<?php\nconst GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';\n")}`);
    const cases = CASES.map((c) => ({
      action: c.action,
      method: c.method ?? 'POST',
      input: materialize(c.input, 'php'),
      user: c.user === undefined ? CUSTOMER : c.user,
      ua: c.ua ?? CHROME,
      steps: materialize(c.steps, 'php'),
    }));
    const result = spawnSync('php', ['-d', 'display_errors=stderr', join(dir, 'cli.php')], {
      input: JSON.stringify(cases),
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, SP_MODULE: join(ROOT, 'backend', 'modules', 'site_posts.php') },
    });
    expect(result.stderr).toBe('');
    php = JSON.parse(result.stdout);
  });
  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('tidak ada galat tak terduga di PHP (hanya "boom")', () => {
    const internal = php.results.map((r, i) => [CASES[i].name, r.internal]).filter(([, msg]) => msg !== undefined);
    expect(internal).toEqual([['database gagal setelah foto diunggah', 'boom']]);
  });

  it.each(CASES.map((c) => c.name))('%s', (name) => {
    const i = caseOf(name);
    const phpOut: Partial<Outcome> = { ...php.results[i] };
    delete phpOut.internal;
    expect(normalize(phpOut, php.today)).toEqual(normalize(NODE[i], jakartaToday()));
  });
});
