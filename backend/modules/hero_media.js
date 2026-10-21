// Hero background of the public home page (table hero_settings) for backend/server.js.
// backend/modules/hero_media.php implements the same for the PHP backend: keep both identical (action names, file
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
// for a year). → {success: true, url}; failure → HTTP 400/413 + {error}.
// get_hero_media_limits (GET or POST, staff token) → {success: true, video_max_mb, max_images} for the admin page.
// Both actions are in none of the lists in security.js, so the default staff rule applies (createAuthGate runs before
// server.js calls handleHeroMediaAction).
//
// update_settings: server.js calls prepareHeroMediaSettings() before anything is saved. It normalizes the keys above,
// refuses a stale tab (hero_media_base, 409) and stores new posters/slides, and returns a function to call once the
// request is over: after a successful save it runs the garbage-collect sweep, after a failure it removes the files
// this request stored. Saving never deletes the file it replaces right away: another tab may still show (and save)
// it. The sweep deletes only names this module generates (hero_video_<hex>, hero_poster_<hex> directly under
// assets/bg/) that the stored settings do not use and that are older than a day; seed images, slides and other
// uploads in that folder stay.
import { randomBytes } from 'node:crypto';
import {
  deleteFromS3,
  existsInS3,
  listS3,
  parseUpload,
  passThrough,
  sniffImage,
  uploadToS3,
  S3_PUBLIC_URL,
} from '../s3-client.js';

export const HERO_MEDIA_ACTIONS = Object.freeze(['upload_hero_video', 'get_hero_media_limits']);
export const HERO_BG_MODES = Object.freeze(['default', 'image', 'video']);
// ISO-BMFF major brands of MP4 files that browsers play; 'qt  ' (QuickTime .mov) is deliberately not one of them
export const MP4_BRANDS = Object.freeze(['isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'dash', 'M4V ', 'mmp4', 'MSNV']);
// Names this module gives its files (file name only, directly in assets/bg/); the sweep deletes nothing else
export const GENERATED_VIDEO = /^hero_video_[0-9a-f]{12}\.(mp4|webm)$/;
export const GENERATED_POSTER = /^hero_poster_[0-9a-f]{12}\.(jpg|png|webp)$/;
export const VIDEO_MAX_MB_DEFAULT = 30;
// Slides the home page shows at most (HERO_MAX_IMAGES in src/components/sections/hero/heroBgConfig.ts)
export const HERO_MAX_IMAGES = 12;
// An unused generated file is kept this long: a tab may still be about to save it
export const UNUSED_MS = 24 * 60 * 60 * 1000;

const FOLDER = 'bg';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const MB = 1024 * 1024;
// Posters and new slides are shown as a full-screen background: raster images only (no SVG, no ICO)
const POSTER_EXTS = Object.freeze(['jpg', 'png', 'webp']);
const IMAGE_EXTS = Object.freeze(['jpg', 'png', 'webp', 'gif']);
const TYPE_ERROR = 'Hanya video MP4 atau WebM yang diizinkan.';
const EMPTY_ERROR = 'File video kosong.';
const ABORTED_ERROR = 'Upload video terputus. Silakan coba lagi.';
const DATA_VIDEO_ERROR = 'Video harus diunggah lewat upload_hero_video.';
const RASTER_ERROR = 'Gambar latar dan sampul harus JPG, PNG, atau WEBP.';
const STALE_ERROR = 'Latar hero sudah diubah di tab atau perangkat lain. Muat ulang halaman, lalu simpan lagi.';
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';
// JSON was already parsed by express.json and multipart is not a raw file: both refused before reading anything
const NOT_RAW_BODY = /^\s*(application\/([\w.+-]*\+)?json|multipart\/form-data)\b/i;
// Stored video/poster (same query as api.php)
const STORED_SQL = "SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN ('hero_bg_video', 'hero_bg_video_poster')";
// Settings that can point to a file update_settings stored
const SAVED_FILES_SQL = "SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN ('hero_bg_video_poster', 'hero_images')";

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

/** The limit in whole MB for get_hero_media_limits: rounded down (the admin page never allows more), at least 1. */
export function videoLimitWholeMb() {
  return Math.max(1, Math.floor(videoLimitMb()));
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

/**
 * Runs get_hero_media_limits (GET or POST) and upload_hero_video (POST only: a GET falls through to "Invalid
 * action", like api.php); returns false for any other action.
 * @param {{ query: Function }} pool - read by the sweep after an upload
 */
export async function handleHeroMediaAction(action, req, res, pool) {
  if (action === 'get_hero_media_limits') {
    res.json({ success: true, video_max_mb: videoLimitWholeMb(), max_images: HERO_MAX_IMAGES });
    return true;
  }
  if (action !== 'upload_hero_video' || req?.method !== 'POST') return false;
  let url;
  try {
    url = await uploadHeroVideo(req);
  } catch (err) {
    sendError(res, err, action);
    return true;
  }
  res.json({ success: true, url });
  // After the reply; the sweep never changes it
  await sweepHeroMedia(pool);
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

/**
 * A new poster or slide (data URI), decoded. The type comes from the first bytes and must be one of `exts`, so SVG,
 * ICO and anything that is not an image get the same message; parseUpload then checks the rest (size limit, empty
 * file). Nothing is uploaded here.
 * @returns {{ content: Buffer, ext: string, contentType: string }}
 */
function rasterImage(dataUri, exts) {
  const uri = dataUri.trim();
  const m = /^data:[^,]*?;base64,/i.exec(uri);
  if (m && !exts.includes(sniffImage(Buffer.from(uri.slice(m[0].length, m[0].length + 64), 'base64')))) {
    throw new HeroMediaError(RASTER_ERROR);
  }
  return parseUpload(uri);
}

/**
 * hero_images as a list of links and decoded new images, or null when it is not a JSON array (then it is saved as
 * sent). Non-strings are dropped; removed images are not deleted (same as api.php): every settings save resends this
 * list and the folder also holds files committed to the repo.
 */
function heroImages(value) {
  let images = value;
  if (typeof value === 'string') {
    try {
      images = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(images)) return null;
  return images.filter((image) => typeof image === 'string').map((image) => (isDataUri(image) ? rasterImage(image, IMAGE_EXTS) : link(image)));
}

/** Current hero_bg_video / hero_bg_video_poster; a missing row counts as ''. */
async function storedMedia(pool) {
  const stored = { hero_bg_video: '', hero_bg_video_poster: '' };
  const [rows] = await pool.query(STORED_SQL);
  for (const row of rows || []) stored[row.setting_key] = row.setting_value == null ? '' : String(row.setting_value);
  return stored;
}

/**
 * 409 before anything is written when the save would undo or break another save:
 * - stale tab: `base` is the hero_media_base the admin page sent, the video/poster it loaded; a changed key whose
 *   loaded value is no longer the stored one was changed elsewhere in the meantime
 * - a changed link to a generated file that no longer exists (the sweep removed an old upload)
 */
async function checkMedia(settings, pool, newPoster, base) {
  const stored = await storedMedia(pool);
  const loaded = base && typeof base === 'object' ? base : {};
  for (const [key, name] of [['hero_bg_video', 'video'], ['hero_bg_video_poster', 'poster']]) {
    if (Object.hasOwn(settings, key) && typeof loaded[name] === 'string' && loaded[name] !== stored[key]) {
      throw new HeroMediaError(STALE_ERROR, 409);
    }
  }
  for (const [key, pattern] of [['hero_bg_video', GENERATED_VIDEO], ['hero_bg_video_poster', GENERATED_POSTER]]) {
    // A new data: poster is stored below; '' (removal) is always allowed
    if (!Object.hasOwn(settings, key) || (key === 'hero_bg_video_poster' && newPoster)) continue;
    const value = settings[key];
    if (value === '' || value === stored[key]) continue;
    const objectKey = generatedKey(value, pattern);
    if (objectKey && !(await existsInS3(objectKey))) throw new HeroMediaError(STALE_ERROR, 409);
  }
}

// Uploads a decoded image as assets/bg/<stem>_<12 hex>.<ext>; the key is recorded in `written` first, so an upload
// that failed halfway is removed too
async function storeImage({ content, ext, contentType }, stem, written, cacheControl) {
  const key = `assets/${FOLDER}/${stem}_${randomBytes(6).toString('hex')}.${ext}`;
  written.push(key);
  return await uploadToS3(content, key, contentType, 'public-read', cacheControl ? { cacheControl } : {});
}

const removeAll = async (keys) => {
  for (const key of keys) await deleteFromS3(key);
};

/**
 * Normalizes the hero keys of an update_settings payload in place, before anything is saved: hero_bg_mode → one of
 * HERO_BG_MODES, hero_bg_video → a link (a data: URI is refused with 400), hero_bg_video_poster → a new data: image is
 * stored as assets/bg/hero_poster_<hex>.<ext>, other values pass the link check, hero_images → stored URLs.
 * Keys that were not sent stay absent.
 * @param {Record<string, unknown>} settings
 * @param {{ query: Function }} pool - reads the stored hero_bg_video / hero_bg_video_poster
 * @param {unknown} base - hero_media_base of the request (see checkMedia); undefined = no check
 * @returns {Promise<(saved: boolean) => Promise<void>>} call once the request is over: true after a successful save
 *   (garbage-collect sweep), false when the request failed after this (removes the files stored here that no saved
 *   setting uses). Never throws.
 */
export async function prepareHeroMediaSettings(settings, pool, base) {
  if (!settings || typeof settings !== 'object') return async () => {};
  const has = (key) => Object.hasOwn(settings, key);

  // Everything that can refuse the hero values runs before the first upload: links and mode, every new image decoded
  // and checked, then the stale-tab and existence checks against the stored values
  if (has('hero_bg_video')) settings.hero_bg_video = videoLink(settings.hero_bg_video);
  if (has('hero_bg_mode')) settings.hero_bg_mode = heroBgMode(settings.hero_bg_mode);
  let poster = null;
  if (has('hero_bg_video_poster')) {
    if (isDataUri(settings.hero_bg_video_poster)) poster = rasterImage(settings.hero_bg_video_poster, POSTER_EXTS);
    else settings.hero_bg_video_poster = link(settings.hero_bg_video_poster);
  }
  const images = has('hero_images') ? heroImages(settings.hero_images) : null;
  if (has('hero_bg_video') || has('hero_bg_video_poster')) await checkMedia(settings, pool, poster !== null, base);

  const written = [];
  try {
    if (images) {
      const stored = [];
      for (const image of images) stored.push(typeof image === 'string' ? image : await storeImage(image, 'hero', written));
      settings.hero_images = JSON.stringify(stored);
    }
    if (poster) settings.hero_bg_video_poster = await storeImage(poster, 'hero_poster', written, IMMUTABLE);
  } catch (err) {
    await removeAll(written);
    throw err;
  }
  return async (saved) => {
    if (saved) await sweepHeroMedia(pool);
    else await discardFiles(pool, written);
  };
}

// The request failed after prepareHeroMediaSettings stored files: removes them, except a file a setting that did get
// saved points to (the settings are saved one by one). Errors are logged, the request already failed.
async function discardFiles(pool, written) {
  if (!written.length) return;
  try {
    const [rows] = await pool.query(SAVED_FILES_SQL);
    const used = new Set();
    for (const row of rows || []) {
      let list = [row.setting_value];
      if (row.setting_key === 'hero_images') {
        try {
          list = JSON.parse(row.setting_value);
        } catch {
          list = [];
        }
      }
      if (Array.isArray(list)) for (const value of list) used.add(value);
    }
    // The URL uploadToS3 returned for the key
    await removeAll(written.filter((key) => !used.has(`${S3_PUBLIC_URL}/${key}`)));
  } catch (err) {
    console.error('[hero_media] Cannot remove the files of a failed save:', err);
  }
}

/**
 * Garbage-collect sweep, after every successful update_settings and upload_hero_video: deletes the generated videos
 * and posters under assets/bg/ that the stored settings do not use and that were last modified more than UNUSED_MS
 * ago (uploaded but never saved, or replaced by a later save). Never any other object. Errors are logged and never
 * fail the request.
 * @param {{ query: Function }} pool
 */
export async function sweepHeroMedia(pool) {
  try {
    const stored = await storedMedia(pool);
    const used = new Set([generatedKey(stored.hero_bg_video, GENERATED_VIDEO), generatedKey(stored.hero_bg_video_poster, GENERATED_POSTER)]);
    const before = Date.now() - UNUSED_MS;
    for (const [stem, pattern] of [['hero_video_', GENERATED_VIDEO], ['hero_poster_', GENERATED_POSTER]]) {
      for (const { key, lastModified } of await listS3(`assets/${FOLDER}/${stem}`)) {
        const name = key.slice(`assets/${FOLDER}/`.length);
        // No date: kept
        const modified = lastModified ? new Date(lastModified).getTime() : NaN;
        if (pattern.test(name) && !used.has(key) && modified < before) await deleteFromS3(key);
      }
    }
  } catch (err) {
    console.error('[hero_media] Sweep failed:', err);
  }
}
