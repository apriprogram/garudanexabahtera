// Hero background of the public home page (table hero_settings) for backend/server.js.
// backend/modules/hero_media.php implements the same for the PHP backend: keep both identical (action names, file
// signatures, limits, generated names, error messages and HTTP status codes).
//
// Settings (every value is a string; get_settings is public and returns them all):
//   hero_bg_mode          'default' (animated dot field) | 'image' | 'video'; anything else is saved as 'default'
//   hero_images           JSON array of image URLs in slide order; new images arrive as data:image/... URIs
//   hero_bg_video         URL of a video stored by upload_hero_video, '' = none; never a data: URI
//   hero_bg_video_poster  URL of the poster image, '' = none; a new poster arrives as a data:image/... URI
//   hero_text_tone        hero text over an image/video: 'auto' (default) | 'light' | 'dark'; anything else → 'auto'
//   hero_overlay          overlay behind the hero text in percent, applied exactly as stored (never raised by the site;
//                         0 = no overlay, the image/video shows uncovered), an integer 0..80 as a string (default 0):
//                         a number or plain decimal text ("55", " 40.6") is rounded and clamped, anything else → '0'
//   hero_style            'classic' (today's hero, default) | 'prompt' (big title + AI prompt box over an ASCII Garuda
//                         animation, src/components/sections/hero/HeroPrompt.tsx); anything else is saved as 'classic'
//   hero_prompt_title     one line of text of the prompt hero (runs of whitespace collapsed, trimmed, at most 160
//                         characters; '' = the site's default text); hero_prompt_placeholder the same
//   hero_prompt_chips     JSON array of {label, href} recommendation chips under the prompt box, at most 6 in the order
//                         sent: label 1..40 characters, href a site path ('/…', not '//host'), an absolute http(s) URL
//                         or '#anchor'; other entries are dropped. Not a JSON array → saved as sent (the site then
//                         shows its default chips)
//   hero_prompt_garuda    '1' (default) | '0' = the ASCII Garuda animation behind the prompt hero is off
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
// assets/bg/) that are older than a day and that are not the file name of the stored video or poster (compared by
// name, so a changed S3_PUBLIC_URL never makes the live files look unused); seed images, slides and other uploads in
// that folder stay.
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
// hero_text_tone values (HERO_TEXT_TONES in src/components/sections/hero/heroContrast.ts) and hero_overlay limits
export const HERO_TEXT_TONES = Object.freeze(['auto', 'light', 'dark']);
export const HERO_OVERLAY_DEFAULT = 0;
export const HERO_OVERLAY_MAX = 80;
// Plain decimal number with spaces/tabs/newlines around it: no sign other than '-', no exponent, no thousands separator
const OVERLAY_NUMBER = /^[ \t\n\r]*(-?[0-9]+(?:\.[0-9]+)?)[ \t\n\r]*$/;
// hero_style values and the prompt hero limits (HERO_STYLES / HERO_PROMPT_* in src/components/sections/hero/heroStyle.ts)
export const HERO_STYLES = Object.freeze(['classic', 'prompt']);
export const PROMPT_TEXT_MAX = 160;
export const PROMPT_LABEL_MAX = 40;
export const PROMPT_MAX_CHIPS = 6;
const PROMPT_HASH_LINK = /^#[a-z0-9-]+$/i;
// Control characters and backslashes: browsers drop or read them as "/" ("/\host" = "//host"), see safeMediaUrl()
const LINK_UNSAFE = /[\x00-\x1f\x7f\\]/;
// The characters PHP's trim() removes, so both backends keep the same text. Trimmed with a linear scan: an
// end-anchored regex ([...]+$) backtracks quadratically on a long run of these characters, enough to stall the event
// loop for minutes with one 1 MB value.
const PHP_TRIM_CHARS = ' \t\n\r\0\x0B';

/** PHP trim() with its default character set, in linear time. */
export function phpTrim(value) {
  let start = 0;
  let end = value.length;
  while (start < end && PHP_TRIM_CHARS.includes(value[start])) start++;
  while (end > start && PHP_TRIM_CHARS.includes(value[end - 1])) end--;
  return value.slice(start, end);
}
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

/**
 * Reads the raw video body and stores it on S3 as assets/<section>/<stem>_<12 hex>.<mp4|webm> (public, cached for a
 * year); returns its URL. Also the project videos of the home page (upload_project_video, modules/portfolio_media.js).
 */
export async function storeRawVideo(req, section = FOLDER, stem = 'hero_video') {
  const headers = req.headers || {};
  if (NOT_RAW_BODY.test(String(headers['content-type'] || ''))) throw new HeroMediaError(TYPE_ERROR);
  const limit = videoLimitBytes();
  // Announced size over the limit: refused without reading the body
  if (Number(headers['content-length']) > limit) throw tooLarge();
  const body = await readRawBody(req, limit);
  if (!body.length) throw new HeroMediaError(EMPTY_ERROR);
  const video = sniffVideo(body);
  if (!video) throw new HeroMediaError(TYPE_ERROR);
  const key = `assets/${section}/${stem}_${randomBytes(6).toString('hex')}.${video.ext}`;
  return await uploadToS3(body, key, video.mime, 'public-read', { cacheControl: IMMUTABLE });
}

const uploadHeroVideo = (req) => storeRawVideo(req);

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

/** Error reply of the upload actions: exposed errors with their status and message, anything else a generic 500. */
export function sendError(res, err, action) {
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

/** hero_text_tone as stored: one of HERO_TEXT_TONES, anything else (missing, empty, unknown, not a string) → 'auto'. */
export function heroTextTone(value) {
  return typeof value === 'string' && HERO_TEXT_TONES.includes(value) ? value : 'auto';
}

/**
 * hero_overlay as stored: a JSON number (not NaN) or plain decimal text, rounded half away from zero (like PHP's
 * round(); the value is clamped at 0, so negative halves never matter) and clamped to 0..HERO_OVERLAY_MAX, as an
 * integer string; anything else → HERO_OVERLAY_DEFAULT. Same as hm_overlay() in hero_media.php.
 */
export function heroOverlay(value) {
  let number;
  const match = typeof value === 'string' ? OVERLAY_NUMBER.exec(value) : null;
  if (typeof value === 'number' && !Number.isNaN(value)) number = value;
  else if (match) number = Number(match[1]);
  else return String(HERO_OVERLAY_DEFAULT);
  return String(Math.min(HERO_OVERLAY_MAX, Math.max(0, Math.round(number))) || 0);
}

/** hero_style as stored: one of HERO_STYLES, anything else (missing, empty, unknown, not a string) → 'classic'. */
export function heroStyle(value) {
  return typeof value === 'string' && HERO_STYLES.includes(value) ? value : 'classic';
}

/** hero_prompt_garuda as stored: '0' (also the number 0 and false) = off, anything else → '1'. */
export function promptFlag(value) {
  return value === '0' || value === 0 || value === false ? '0' : '1';
}

/**
 * One line of prompt text: runs of space, tab and newline collapsed to one space, trimmed like PHP, at most `max`
 * characters (code points); not a string → ''. Same as hm_prompt_text() in hero_media.php.
 */
export function promptText(value, max) {
  if (typeof value !== 'string') return '';
  return Array.from(phpTrim(value.replace(/[ \t\r\n]+/g, ' '))).slice(0, max).join('');
}

/**
 * A chip link: '#anchor', a site path ('/…', not '//host') or an absolute http(s) URL, without control characters or
 * backslashes (safeChipHref() in heroStyle.ts); anything else (data:, javascript:, relative, empty, not a string) → null.
 */
export function chipHref(value) {
  if (typeof value !== 'string') return null;
  const url = phpTrim(value);
  if (!url || LINK_UNSAFE.test(url)) return null;
  if (PROMPT_HASH_LINK.test(url)) return url;
  if (url.startsWith('/')) return url.startsWith('//') ? null : url;
  return /^https?:\/\/[^/]/i.test(url) ? url : null;
}

/**
 * hero_prompt_chips as stored: a JSON array (or an array) of {label, href} → JSON of the valid chips (label 1..40
 * characters, href per chipHref(), at most PROMPT_MAX_CHIPS, order kept, other entries dropped); anything else (JSON
 * object, text, number) → null, the value is then saved as sent. Same JSON as hm_prompt_chips() in hero_media.php.
 */
export function promptChips(value) {
  let items = value;
  if (typeof value === 'string') {
    // Only a JSON array text ('[' first): a JSON object with numeric keys must not pass as a list in either backend
    if (!/^\s*\[/.test(value)) return null;
    try {
      items = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(items)) return null;
  const chips = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const label = promptText(item.label, PROMPT_LABEL_MAX);
    const href = chipHref(item.href);
    if (!label || href === null) continue;
    chips.push({ label, href });
    if (chips.length >= PROMPT_MAX_CHIPS) break;
  }
  return JSON.stringify(chips);
}

const isDataUri = (value) => typeof value === 'string' && /^\s*data:/i.test(value);
// Text link: not a string → '', javascript:/vbscript:/data: → '' (passThrough in s3-client.js, safe_link in api.php)
const link = (value) => (typeof value === 'string' ? passThrough(value) : '');

// Videos only come from upload_hero_video; leading control characters are ignored by browsers in a URL scheme
function videoLink(value) {
  if (typeof value === 'string' && /^[\s\x00-\x1f]*data:/i.test(value)) throw new HeroMediaError(DATA_VIDEO_ERROR);
  return link(value);
}

// The path of an http(s) or protocol-relative URL, without query and fragment
const URL_PATH = /^(?:https?:)?\/\/[^/?#]*([^?#]*)/i;
// The file name directly in assets/bg/ at the end of a path
const BG_NAME = new RegExp(`/assets/${FOLDER}/([^/]+)$`);

/**
 * The S3 key of a file this module stored, or null for anything else: an http(s) URL on any host whose path
 * (repeated slashes collapsed, query and fragment ignored) ends in /assets/bg/<name matching `pattern`>. Any host,
 * because S3_PUBLIC_URL may have changed since the upload (CDN, custom domain, http → https) or had a trailing slash
 * ("bucket//assets/bg/..."). Null for other folders, sub folders, seed images and site paths (/assets/bg/... is served
 * by the site, not S3; PHP backend).
 */
export function generatedKey(url, pattern) {
  const path = typeof url === 'string' ? URL_PATH.exec(url)?.[1] : undefined;
  const name = path && BG_NAME.exec(path.replace(/\/{2,}/g, '/'))?.[1];
  return name && pattern.test(name) ? `assets/${FOLDER}/${name}` : null;
}

/**
 * The file name a stored link points to: its last path segment, without query, fragment and trailing slashes ('' for
 * none or not a string). The sweep keeps every object with this name, whatever host or folder the link has (same as
 * hm_link_name() in hero_media.php).
 */
export function linkName(value) {
  if (typeof value !== 'string') return '';
  // Trimmed like the browser does with a src attribute, so a stored link with stray whitespace still protects its file
  return value.trim().split(/[?#]/, 1)[0].replace(/\/+$/, '').split('/').pop();
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
 *   loaded value is no longer the stored one was changed elsewhere in the meantime. A key sent with the stored value
 *   undoes nothing and is not compared (a retry after a lost answer); a new data: poster never equals the stored one
 * - a changed link to a generated file that no longer exists (the sweep removed an old upload)
 */
async function checkMedia(settings, pool, newPoster, base) {
  const stored = await storedMedia(pool);
  const loaded = base && typeof base === 'object' ? base : {};
  for (const [key, name] of [['hero_bg_video', 'video'], ['hero_bg_video_poster', 'poster']]) {
    if (Object.hasOwn(settings, key) && settings[key] !== stored[key] && typeof loaded[name] === 'string' && loaded[name] !== stored[key]) {
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
 * HERO_BG_MODES, hero_text_tone → one of HERO_TEXT_TONES, hero_overlay → '0'..'80', hero_bg_video → a link (a data:
 * URI is refused with 400), hero_bg_video_poster → a new data: image is stored as assets/bg/hero_poster_<hex>.<ext>,
 * other values pass the link check, hero_images → stored URLs; hero_style → one of HERO_STYLES, hero_prompt_garuda →
 * '1'/'0', hero_prompt_title / hero_prompt_placeholder → one line of text, hero_prompt_chips → JSON of the valid chips
 * (see the header).
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
  if (has('hero_text_tone')) settings.hero_text_tone = heroTextTone(settings.hero_text_tone);
  if (has('hero_overlay')) settings.hero_overlay = heroOverlay(settings.hero_overlay);
  // Prompt hero (hero_style = 'prompt'): plain text and links only, nothing is uploaded
  if (has('hero_style')) settings.hero_style = heroStyle(settings.hero_style);
  if (has('hero_prompt_garuda')) settings.hero_prompt_garuda = promptFlag(settings.hero_prompt_garuda);
  for (const key of ['hero_prompt_title', 'hero_prompt_placeholder']) {
    if (has(key)) settings[key] = promptText(settings[key], PROMPT_TEXT_MAX);
  }
  if (has('hero_prompt_chips')) {
    const chips = promptChips(settings.hero_prompt_chips);
    if (chips !== null) settings.hero_prompt_chips = chips;
  }
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
 * and posters under assets/bg/ that were last modified more than UNUSED_MS ago (uploaded but never saved, or replaced
 * by a later save) and whose name is not the linkName() of the stored video or poster. By name only, so a stored
 * link on another host, with "//" or a query string still keeps its file. Never any other object. Errors are logged
 * and never fail the request.
 * @param {{ query: Function }} pool
 */
export async function sweepHeroMedia(pool) {
  try {
    const stored = await storedMedia(pool);
    const used = new Set([linkName(stored.hero_bg_video), linkName(stored.hero_bg_video_poster)]);
    const before = Date.now() - UNUSED_MS;
    for (const [stem, pattern] of [['hero_video_', GENERATED_VIDEO], ['hero_poster_', GENERATED_POSTER]]) {
      for (const { key, lastModified } of await listS3(`assets/${FOLDER}/${stem}`)) {
        const name = key.slice(`assets/${FOLDER}/`.length);
        // No date: kept
        const modified = lastModified ? new Date(lastModified).getTime() : NaN;
        if (pattern.test(name) && !used.has(name) && modified < before) await deleteFromS3(key);
      }
    }
  } catch (err) {
    console.error('[hero_media] Sweep failed:', err);
  }
}
