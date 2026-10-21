import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

// Credentials come from the environment (docker-compose.yml passes them from .env)
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'https://is3.cloudhost.id';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'garudanexa';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || `${S3_ENDPOINT}/${S3_BUCKET}`;

if (!S3_ACCESS_KEY || !S3_SECRET_KEY) {
  console.warn('[S3] S3_ACCESS_KEY / S3_SECRET_KEY not set — uploads will fail (see .env.example)');
}

const client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

/**
 * Upload buffer/content ke S3
 * @param {Buffer|string} content - File content
 * @param {string} key - S3 object key (e.g. 'assets/product/image.webp')
 * @param {string} contentType - MIME type (optional)
 * @param {'public-read'|'private'} acl - private objects are only read through getFromS3
 * @param {{ cacheControl?: string }} options - cacheControl: Cache-Control header served with the object
 *   (e.g. 'public, max-age=31536000, immutable' for files whose name changes on every upload)
 * @returns {Promise<string>} Public URL
 */
export async function uploadToS3(content, key, contentType, acl = 'public-read', { cacheControl } = {}) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: content,
    ContentType: contentType || 'application/octet-stream',
    ACL: acl,
    ...(cacheControl ? { CacheControl: cacheControl } : {}),
  });
  await client.send(command);
  return `${S3_PUBLIC_URL}/${key}`;
}

/**
 * Reads an object (e.g. a private client project file); null when it does not exist or S3 is not configured
 * @param {string} key - S3 object key (e.g. 'assets/dokumen-client/dokumen/file.pdf')
 * @returns {Promise<{ body: import('node:stream').Readable, size: number } | null>}
 */
export async function getFromS3(key) {
  if (!S3_ACCESS_KEY || !S3_SECRET_KEY) return null;
  try {
    const out = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return { body: out.Body, size: Number(out.ContentLength) || 0 };
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

// ── Upload validation ──
// Uploads arrive as base64 data URIs. The file type is taken from the content (magic bytes) and an
// allowlist, never from the client's MIME header, and the stored name is generated server side.

export class UploadError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
    this.expose = true;
  }
}

const MB = 1024 * 1024;
const MAX_IMAGE_BYTES = (Number(process.env.UPLOAD_MAX_IMAGE_MB) || 10) * MB;
const MAX_FILE_BYTES = (Number(process.env.UPLOAD_MAX_FILE_MB) || 25) * MB;

const IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon' };
const DOCUMENT_TYPES = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  txt: 'text/plain; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  rtf: 'application/rtf',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
};
// Signatures checked for binary formats; text formats (txt, csv, rtf) have none
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0];
const DOCUMENT_MAGIC = {
  pdf: [0x25, 0x50, 0x44, 0x46], doc: OLE, xls: OLE, ppt: OLE,
  docx: ZIP, xlsx: ZIP, pptx: ZIP, odt: ZIP, ods: ZIP, odp: ZIP, zip: ZIP,
  rar: [0x52, 0x61, 0x72, 0x21], '7z': [0x37, 0x7a, 0xbc, 0xaf],
};

const startsWithBytes = (buf, bytes, offset = 0) => bytes.every((b, i) => buf[offset + i] === b);

function sniffImage(buf) {
  if (startsWithBytes(buf, [0x89, 0x50, 0x4e, 0x47])) return 'png';
  if (startsWithBytes(buf, [0xff, 0xd8, 0xff])) return 'jpg';
  if (buf.subarray(0, 4).toString('latin1') === 'GIF8') return 'gif';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (startsWithBytes(buf, [0x00, 0x00, 0x01, 0x00])) return 'ico';
  const head = buf.subarray(0, 2048).toString('utf8').replace(/^﻿/, '').trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return 'svg';
  return null;
}

// SVG is served as an image but can carry script; reject anything active instead of trying to clean it
function assertSafeSvg(buf) {
  const text = buf.toString('utf8');
  if (/<script|<foreignObject|<iframe|<embed|<object|\son[a-z]+\s*=|javascript:|<!ENTITY/i.test(text)) {
    throw new UploadError('File SVG berisi script dan tidak diizinkan.');
  }
}

// Keeps a readable, filesystem/URL-safe stem of the client's file name
function safeStem(name) {
  const base = String(name || '').split(/[\\/]/).pop().replace(/\.[^.]*$/, '');
  return base.normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'file';
}

const randomId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Decodes and validates a base64 data URI.
 * @param {string} dataUri
 * @param {{ allowDocuments?: boolean, filename?: string }} options - documents need a file name with an allowed extension
 * @returns {{ content: Buffer, ext: string, contentType: string, isImage: boolean }}
 */
export function parseUpload(dataUri, { allowDocuments = false, filename = '' } = {}) {
  const m = /^data:([^,]*?)(;base64)?,/i.exec(dataUri);
  if (!m || !m[2]) throw new UploadError('Format file tidak valid.');
  const payload = dataUri.slice(m[0].length);
  if (payload.length > Math.ceil((MAX_FILE_BYTES * 4) / 3) + 4) throw new UploadError('Ukuran file terlalu besar.');
  const content = Buffer.from(payload, 'base64');
  if (!content.length) throw new UploadError('File kosong.');

  const imageExt = sniffImage(content);
  if (imageExt) {
    if (content.length > MAX_IMAGE_BYTES) throw new UploadError(`Ukuran gambar maksimal ${MAX_IMAGE_BYTES / MB} MB.`);
    if (imageExt === 'svg') assertSafeSvg(content);
    return { content, ext: imageExt, contentType: IMAGE_TYPES[imageExt], isImage: true };
  }
  if (!allowDocuments) throw new UploadError('Hanya file gambar (PNG, JPG, WEBP, GIF, SVG) yang diizinkan.');

  const ext = (String(filename).split('.').pop() || '').toLowerCase();
  if (!DOCUMENT_TYPES[ext] || ext === String(filename).toLowerCase()) {
    throw new UploadError(`Tipe file tidak diizinkan. Gunakan: ${Object.keys(DOCUMENT_TYPES).join(', ')}, atau gambar.`);
  }
  if (DOCUMENT_MAGIC[ext] && !startsWithBytes(content, DOCUMENT_MAGIC[ext])) {
    throw new UploadError(`Isi file tidak sesuai dengan ekstensi .${ext}.`);
  }
  if (content.length > MAX_FILE_BYTES) throw new UploadError(`Ukuran file maksimal ${MAX_FILE_BYTES / MB} MB.`);
  return { content, ext, contentType: DOCUMENT_TYPES[ext], isImage: false };
}

// Non-upload values are stored as given (existing URLs/paths); script URLs are dropped (safe_link() in api.php)
export function passThrough(value) {
  if (typeof value !== 'string') return value;
  return /^[\s\x00-\x1f]*(javascript|vbscript|data):/i.test(value) ? '' : value;
}

const DOCUMENT_SECTION = /dokumen|document/i;
// Client project files: private objects, downloaded by staff through download_project_file (modules/project_files.js)
const PRIVATE_SECTION = /^dokumen-client\/dokumen$/;

/**
 * Upload file dari base64 string
 * @param {string} base64Data - Base64 data URI (e.g. 'data:image/png;base64,...')
 * @param {string} section - Folder/subdirectory (e.g. 'product'); document folders also accept office/pdf/archive files
 * @param {string} filename - Nama file asli (optional); only its stem is kept, the extension comes from the content
 * @returns {Promise<string>} Public S3 URL; for dokumen-client/dokumen the site path /assets/... of a private object
 */
export async function uploadBase64ToS3(base64Data, section, filename) {
  if (typeof base64Data !== 'string' || !/^data:/i.test(base64Data.trimStart())) {
    return passThrough(base64Data); // Return as-is if not base64
  }
  const safeSection = String(section).split('/').map(safeStem).join('/');
  const { content, ext, contentType } = parseUpload(base64Data.trimStart(), {
    allowDocuments: DOCUMENT_SECTION.test(safeSection),
    filename: String(filename || '').replace(/^doc_\d+_[a-z0-9]+_/i, ''),
  });
  const name = filename ? `${safeStem(filename)}_${randomId()}.${ext}` : `${safeSection.split('/').pop()}_${randomId()}.${ext}`;
  const key = `assets/${safeSection}/${name}`;
  if (PRIVATE_SECTION.test(safeSection)) {
    // Stored as the site path, like api.php does; there is no public URL to hand out
    await uploadToS3(content, key, contentType, 'private');
    return `/${key}`;
  }
  return await uploadToS3(content, key, contentType);
}

/**
 * Upload compressed WebP image (for list_products)
 */
export async function uploadCompressedImageToS3(base64Data, section) {
  if (typeof base64Data !== 'string' || !/^data:/i.test(base64Data.trimStart())) return passThrough(base64Data);

  const { content, ext, contentType } = parseUpload(base64Data.trimStart());
  const safeSection = String(section).split('/').map(safeStem).join('/');
  const stem = `${safeSection.split('/').pop()}_${randomId()}`;

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    // sharp unavailable: store the validated original
    return await uploadToS3(content, `assets/${safeSection}/${stem}.${ext}`, contentType);
  }
  if (ext === 'svg') return await uploadToS3(content, `assets/${safeSection}/${stem}.svg`, contentType);
  try {
    const compressed = await sharp(content)
      .resize(640, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
    return await uploadToS3(compressed, `assets/${safeSection}/${stem}.webp`, 'image/webp');
  } catch {
    throw new UploadError('Gambar rusak atau tidak dapat diproses.');
  }
}

/**
 * Delete object dari S3
 */
export async function deleteFromS3(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    await client.send(command);
  } catch (err) {
    console.warn(`[S3] Delete warning: ${err.message}`);
  }
}

/**
 * Convert path URL ke S3 key
 * e.g. '/assets/product/image.webp' → 'assets/product/image.webp'
 */
export function pathToKey(path) {
  if (!path) return null;
  return path.replace(/^\//, '');
}

/**
 * Upload existing local file to S3
 */
export async function uploadLocalFile(localPath, s3Key, contentType) {
  const { readFileSync } = await import('fs');
  const content = readFileSync(localPath);
  return await uploadToS3(content, s3Key, contentType);
}

export { S3_PUBLIC_URL, S3_BUCKET };
