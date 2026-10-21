// Hero background of the public home page (table hero_settings) for backend/server.js.
// backend/modules/hero_media.php implements the same for the PHP backend: keep both identical (action name, file
// signatures, limits, generated names, error messages and HTTP status codes).
//
// Settings (every value is a string; get_settings is public and returns them all):
//   hero_bg_mode          'default' (animated dot field) | 'image' | 'video'; anything else is saved as 'default'
//   hero_images           JSON array of image URLs in slide order; new images arrive as data:image/... URIs
//   hero_bg_video         URL of a video stored by upload_hero_video, '' = none; never a data: URI
//   hero_bg_video_poster  URL of the poster image, '' = none; a new poster arrives as a data:image/... URI
//
// upload_hero_video (POST /api.php?action=upload_hero_video, staff token): the body is the raw file, not JSON, base64
// or multipart, so express.json leaves the request stream unread for this module. The type comes from the magic bytes
// only (MP4/ISO-BMFF with an allowed major brand, or WebM), the size is capped at UPLOAD_MAX_VIDEO_MB (default 30)
// while reading, and the name is generated here: assets/bg/hero_video_<12 hex>.<mp4|webm> on S3 (public-read, cached
// for a year). → {success: true, url}; failure → HTTP 400/413 + {error}. The action is in none of the lists in
// security.js, so the default staff rule applies (createAuthGate runs before server.js calls handleHeroMediaAction).
//
// update_settings: server.js calls prepareHeroMediaSettings() before anything is saved. It normalizes the keys above
// and returns a function to call after a successful save, which deletes the video/poster file the save replaced.
// Only files this module named (hero_video_<hex>, hero_poster_<hex> directly under S3_PUBLIC_URL/assets/bg/) are ever
// deleted; seed images and older uploads in that folder stay.
import { randomBytes } from 'node:crypto';
import { deleteFromS3, parseUpload, passThrough, uploadBase64ToS3, uploadToS3, S3_PUBLIC_URL } from '../s3-client.js';

export const HERO_MEDIA_ACTIONS = Object.freeze(['upload_hero_video']);
export const HERO_BG_MODES = Object.freeze(['default', 'image', 'video']);
// ISO-BMFF major brands of MP4 files that browsers play; 'qt  ' (QuickTime .mov) is deliberately not one of them
export const MP4_BRANDS = Object.freeze(['isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'dash', 'M4V ', 'mmp4', 'MSNV']);
// Names this module gives its files (file name only, directly in assets/bg/)
export const GENERATED_VIDEO = /^hero_video_[0-9a-f]{12}\.(mp4|webm)$/;
export const GENERATED_POSTER = /^hero_poster_[0-9a-f]{12}\.(png|jpg|gif|webp|svg|ico)$/;
export const VIDEO_MAX_MB_DEFAULT = 30;

const FOLDER = 'bg';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const MB = 1024 * 1024;
const TYPE_ERROR = 'Hanya video MP4 atau WebM yang diizinkan.';
const EMPTY_ERROR = 'File video kosong.';
const ABORTED_ERROR = 'Upload video terputus. Silakan coba lagi.';
const DATA_VIDEO_ERROR = 'Video harus diunggah lewat upload_hero_video.';
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';
// JSON was already parsed by express.json and multipart is not a raw file: both refused before reading anything
const NOT_RAW_BODY = /^\s*(application\/([\w.+-]*\+)?json|multipart\/form-data)\b/i;
// Previous values, needed to delete the file a save replaces (same query as api.php)
const PREVIOUS_SQL = "SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN ('hero_bg_video', 'hero_bg_video_poster')";

/** An error whose message is safe to show to the client; expose/status are read by the catch block in server.js. */
export class HeroMediaError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

/**
 * Video type from the first bytes, or null: MP4 (ftyp box with an allowed major brand) or WebM (EBML header whose
 * DocType "webm" appears in the first 64 bytes; plain Matroska is refused). Content-Type and file name are never used.
 * @param {Uint8Array} buf
 * @returns {{ ext: 'mp4' | 'webm', mime: string } | null}
 */
export function sniffVideo(buf) {
  if (!(buf instanceof Uint8Array)) return null;
  const bytes = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  if (bytes.length >= 12 && bytes.toString('latin1', 4, 8) === 'ftyp') {
    return MP4_BRANDS.includes(bytes.toString('latin1', 8, 12)) ? { ext: 'mp4', mime: 'video/mp4' } : null;
  }
  const ebml = bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (ebml && bytes.subarray(0, 64).includes('webm', 0, 'latin1')) return { ext: 'webm', mime: 'video/webm' };
  return null;
}

/** UPLOAD_MAX_VIDEO_MB as configured (default 30), read on every call like upload_limit_bytes() in api.php. */
export function videoLimitMb() {
  const mb = Number(process.env.UPLOAD_MAX_VIDEO_MB);
  return mb > 0 ? mb : VIDEO_MAX_MB_DEFAULT;
}

const videoLimitBytes = () => Math.floor(videoLimitMb() * MB);
const tooLarge = () => new HeroMediaError(`Ukuran video maksimal ${videoLimitMb()} MB.`, 413);

/**
 * Reads the raw request body, at most `limit` bytes. Stops reading as soon as more arrives (413), so a large or
 * endless body is never buffered beyond the limit.
 * @returns {Promise<Buffer>}
 */
export function readRawBody(req, limit) {
  if (req.readableEnded) return Promise.resolve(Buffer.alloc(0));
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    const finish = (err, body) => {
      if (settled) return;
      settled = true;
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
      req.off('close', onClose);
      if (err) {
        // The rest stays unread; sendError closes the connection after the reply
        req.unpipe?.();
        req.pause?.();
        reject(err);
      } else {
        resolve(body);
      }
    };
    function onData(chunk) {
      const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += part.length;
      if (size > limit) return finish(tooLarge());
      chunks.push(part);
    }
    function onEnd() {
      finish(null, Buffer.concat(chunks, size));
    }
    function onError() {
      finish(new HeroMediaError(ABORTED_ERROR));
    }
    // Closed before 'end': the browser cancelled the upload
    function onClose() {
      finish(new HeroMediaError(ABORTED_ERROR));
    }
    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
    req.on('close', onClose);
  });
}

async function uploadHeroVideo(req) {
  const headers = req.headers || {};
  if (NOT_RAW_BODY.test(String(headers['content-type'] || ''))) throw new HeroMediaError(TYPE_ERROR);
  const limit = videoLimitBytes();
  // Announced size over the limit: refused without reading the body
  if (Number(headers['content-length']) > limit) throw tooLarge();
  const body = await readRawBody(req, limit);
  if (!body.length) throw new HeroMediaError(EMPTY_ERROR);
  const video = sniffVideo(body);
  if (!video) throw new HeroMediaError(TYPE_ERROR);
  const key = `assets/${FOLDER}/hero_video_${randomBytes(6).toString('hex')}.${video.ext}`;
  return await uploadToS3(body, key, video.mime, 'public-read', { cacheControl: IMMUTABLE });
}

/** Runs upload_hero_video (POST only; server.js does not call this for GET); returns false for any other action. */
export async function handleHeroMediaAction(action, req, res) {
  if (action !== 'upload_hero_video') return false;
  try {
    const url = await uploadHeroVideo(req);
    res.json({ success: true, url });
  } catch (err) {
    sendError(res, err, action);
  }
  return true;
}

function sendError(res, err, action) {
  if (res.headersSent) return;
  if (err?.expose) {
    // 413 leaves the rest of the body unread: close the connection instead of keeping it alive half-read
    if (err.status === 413) res.set?.('Connection', 'close');
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(`[api] ${action}:`, err);
  res.status(500).json({ error: GENERIC_ERROR });
}

// ── update_settings ──

/** hero_bg_mode as stored: one of HERO_BG_MODES, anything else (missing, empty, unknown, not a string) → 'default'. */
export function heroBgMode(value) {
  return typeof value === 'string' && HERO_BG_MODES.includes(value) ? value : 'default';
}

const isDataUri = (value) => typeof value === 'string' && /^\s*data:/i.test(value);
// Text link: not a string → '', javascript:/vbscript:/data: → '' (passThrough in s3-client.js, safe_link in api.php)
const link = (value) => (typeof value === 'string' ? passThrough(value) : '');

// Videos only come from upload_hero_video; leading control characters are ignored by browsers in a URL scheme
function videoLink(value) {
  if (typeof value === 'string' && /^[\s\x00-\x1f]*data:/i.test(value)) throw new HeroMediaError(DATA_VIDEO_ERROR);
  return link(value);
}

const bgPrefix = () => `${String(S3_PUBLIC_URL || '').replace(/\/+$/, '')}/assets/${FOLDER}/`;

/**
 * The S3 key of a file this module stored (S3_PUBLIC_URL/assets/bg/<name matching `pattern`>), or null for anything
 * else: other hosts or folders, sub folders, seed images, site paths (/assets/bg/... from the PHP backend).
 */
export function generatedKey(url, pattern) {
  const prefix = bgPrefix();
  if (typeof url !== 'string' || !S3_PUBLIC_URL || !url.startsWith(prefix)) return null;
  const name = url.slice(prefix.length);
  return pattern.test(name) ? `assets/${FOLDER}/${name}` : null;
}

// Removed images are not deleted (same as api.php): the folder also holds files committed to the repo, and every
// settings save resends this list
async function heroImages(value) {
  let images = value;
  if (typeof value === 'string') {
    try {
      images = JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (!Array.isArray(images)) return value;
  const stored = [];
  for (let i = 0; i < images.length; i++) {
    if (typeof images[i] !== 'string') continue;
    // Every data: entry is validated as an image there; other entries go through the link check
    stored.push(await uploadBase64ToS3(images[i], FOLDER, `hero_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${i}.jpg`));
  }
  return JSON.stringify(stored);
}

async function storePoster({ content, ext, contentType }) {
  const key = `assets/${FOLDER}/hero_poster_${randomBytes(6).toString('hex')}.${ext}`;
  return await uploadToS3(content, key, contentType, 'public-read', { cacheControl: IMMUTABLE });
}

/**
 * Normalizes the hero keys of an update_settings payload in place, before anything is saved: hero_bg_mode → one of
 * HERO_BG_MODES, hero_bg_video → a link (a data: URI is refused with 400), hero_bg_video_poster → a new data: image is
 * stored as assets/bg/hero_poster_<hex>.<ext>, other values pass the link check, hero_images → stored URLs.
 * Keys that were not sent stay absent.
 * @param {Record<string, unknown>} settings
 * @param {{ query: Function }} pool - reads the previous hero_bg_video / hero_bg_video_poster
 * @returns {Promise<() => Promise<void>>} call after a successful save: deletes the generated files it replaced
 */
export async function prepareHeroMediaSettings(settings, pool) {
  if (!settings || typeof settings !== 'object') return async () => {};
  const has = (key) => Object.hasOwn(settings, key);

  // Everything that can refuse the save runs before the first upload, so a refused save stores no files
  if (has('hero_bg_video')) settings.hero_bg_video = videoLink(settings.hero_bg_video);
  if (has('hero_bg_mode')) settings.hero_bg_mode = heroBgMode(settings.hero_bg_mode);
  // New poster: images only, UPLOAD_MAX_IMAGE_MB (UploadError 400 otherwise)
  const poster = has('hero_bg_video_poster') && isDataUri(settings.hero_bg_video_poster)
    ? parseUpload(settings.hero_bg_video_poster.trim())
    : null;
  const media = ['hero_bg_video', 'hero_bg_video_poster'].filter(has);
  const previous = {};
  if (media.length) {
    const [rows] = await pool.query(PREVIOUS_SQL);
    for (const row of rows || []) previous[row.setting_key] = row.setting_value;
  }

  if (has('hero_images')) settings.hero_images = await heroImages(settings.hero_images);
  if (has('hero_bg_video_poster')) settings.hero_bg_video_poster = poster ? await storePoster(poster) : link(settings.hero_bg_video_poster);

  const replaced = [];
  for (const [key, pattern] of [['hero_bg_video', GENERATED_VIDEO], ['hero_bg_video_poster', GENERATED_POSTER]]) {
    const oldKey = has(key) ? generatedKey(previous[key], pattern) : null;
    if (oldKey && previous[key] !== settings[key]) replaced.push(oldKey);
  }
  return async () => {
    for (const key of replaced) await deleteFromS3(key);
  };
}
