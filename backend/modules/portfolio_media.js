// Projects of the home page (#projects, setting portfolio_data in hero_settings) for backend/server.js: project media
// uploads and the project fields of update_settings. backend/modules/portfolio_media.php implements the same for the
// PHP backend: keep both identical (action names, limits, generated names, error messages and HTTP status codes).
//
// portfolio_data is a JSON array of projects (Pengaturan website > Proyek, src/pages/admin/portfolio). The old fields
// are saved as sent: title, desc (tag / kategori), image (cover of the card), span (grid width, no longer used by the
// site). Except a data: cover: older admin pages stored the cover inline, and get_settings put those base64 images into
// every prerendered page (gn-preload). update_settings stores it on S3 with the checks of upload_project_image, as
// assets/projects/project_<first 12 hex of its SHA-256>.<ext> so saving the same cover again gives the same object; a
// cover the checks refuse fails the save (400 "Proyek ke-N: ..."). Objects are written only once every project passed.
// The newer, optional fields are normalized (src/components/sections/projects/portfolio.ts reads them the same way) and
// dropped when they end up empty:
//   description  text, newlines kept (\r\n → \n), control characters removed, trimmed, at most 3000 characters
//   tools        tech stack: strings with whitespace collapsed, at most 40 characters each, duplicates (ASCII case
//                ignored) and empty names dropped, at most 12
//   url          link to the live site: http(s) URL or a bare domain (→ https://), ASCII URL characters only, at most
//                500 characters; anything else is dropped
//   gallery      images shown in the project dialog: links (passThrough), at most 12; a data: URI is refused (400)
//   video        a link (passThrough); a data: URI is refused (400)
// Legacy: a project sent without image takes the stored image at the same position (as before this module); a stored
// data: cover taken this way becomes an object too.
// Trimming and lowercasing follow PHP (trim() characters, ASCII letters only), so both backends store the same text.
//
// upload_project_image (POST JSON {data: data URI}, staff token): JPG, PNG, WEBP or GIF by magic bytes, size limit
// UPLOAD_MAX_IMAGE_MB (parseUpload), stored on S3 as assets/projects/project_<12 hex>.<ext> → {success: true, url}.
// upload_project_video (POST /api.php?action=upload_project_video, staff token, raw file body like upload_hero_video;
// express.json leaves it unread): storeRawVideo() of hero_media.js, so the same type check (MP4/WebM) and limit
// (UPLOAD_MAX_VIDEO_MB), stored as assets/projects/project_video_<12 hex>.<mp4|webm> → {success: true, url}.
// Video limit for the admin page: get_hero_media_limits. Both actions are in none of the lists in security.js, so the
// default staff rule applies (same as update_settings).
//
// Files are never deleted at save time. A garbage-collect sweep after every upload and every successful update_settings
// with portfolio_data deletes the names this module generates directly under assets/projects/ that were last modified
// more than a day ago and whose name is not the file name (linkName) of an image, gallery entry or video in the stored
// portfolio_data. No sweep while the stored portfolio_data is not a JSON array (a broken value must not cost the files).
import { createHash, randomBytes } from 'node:crypto';
import { deleteFromS3, listS3, parseUpload, passThrough, sniffImage, uploadToS3 } from '../s3-client.js';
import { HeroMediaError, UNUSED_MS, linkName, sendError, storeRawVideo } from './hero_media.js';

export const PORTFOLIO_MEDIA_ACTIONS = Object.freeze(['upload_project_image', 'upload_project_video']);
export const MAX_GALLERY = 12;
export const MAX_TOOLS = 12;
export const TOOL_MAX = 40;
export const DESCRIPTION_MAX = 3000;
export const URL_MAX = 500;
// Names this module gives its files (file name only, directly in assets/projects/); the sweep deletes nothing else
export const GENERATED_IMAGE = /^project_[0-9a-f]{12}\.(jpg|png|webp|gif)$/;
export const GENERATED_VIDEO = /^project_video_[0-9a-f]{12}\.(mp4|webm)$/;

const FOLDER = 'projects';
const IMMUTABLE = 'public, max-age=31536000, immutable';
// Raster images only: the dialog shows them full width
const IMAGE_EXTS = Object.freeze(['jpg', 'png', 'webp', 'gif']);
const FIELDS = Object.freeze(['description', 'tools', 'url', 'gallery', 'video']);
// http(s) URL or bare domain: host with at least one dot, optional port, then RFC 3986 characters only
const URL_PATTERN = /^(https?:\/\/)?([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?::[0-9]{1,5})?(?:[/?#][A-Za-z0-9\-._~:/?#[\]@!$&()*+,;=%]*)?)$/i;
// A data: URI behind leading spaces/control characters (browsers ignore those in a URL scheme)
const DATA_URI = /^[\x00-\x20]*data:/i;
const TYPE_ERROR = 'Gambar proyek harus JPG, PNG, WEBP, atau GIF.';
const DATA_IMAGE_ERROR = 'Gambar detail proyek harus diunggah lewat upload_project_image.';
const DATA_VIDEO_ERROR = 'Video proyek harus diunggah lewat upload_project_video.';
// Stored portfolio_data (same query as api.php)
const STORED_SQL = "SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN ('portfolio_data')";

/**
 * Runs upload_project_image and upload_project_video (POST only: a GET falls through to "Invalid action", like
 * api.php); returns false for any other action.
 * @param {{ query: Function }} pool - read by the sweep after an upload
 */
export async function handlePortfolioMediaAction(action, req, res, pool) {
  if (!PORTFOLIO_MEDIA_ACTIONS.includes(action) || req?.method !== 'POST') return false;
  let url;
  try {
    url = action === 'upload_project_image' ? await storeImage(req.body) : await storeRawVideo(req, FOLDER, 'project_video');
  } catch (err) {
    sendError(res, err, action);
    return true;
  }
  res.json({ success: true, url });
  // After the reply; the sweep never changes it
  await sweepPortfolioMedia(pool);
  return true;
}

/** The characters of PHP's trim(), so both backends cut the same text. */
const phpTrim = (text) => text.replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');
// strtolower() of PHP 8.2+: ASCII letters only
const asciiLower = (text) => text.replace(/[A-Z]+/g, (letters) => letters.toLowerCase());
// At most `max` characters (code points, like mb_substr), trimmed again after the cut
const cut = (text, max) => {
  const chars = Array.from(text);
  return chars.length > max ? phpTrim(chars.slice(0, max).join('')) : text;
};
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * A new project image (data URI), decoded. The type comes from the first bytes and must be one of IMAGE_EXTS;
 * parseUpload then checks the rest (size limit, empty file).
 */
function imageOf(dataUri) {
  const m = /^data:[^,]*?;base64,/i.exec(dataUri);
  if (m && !IMAGE_EXTS.includes(sniffImage(Buffer.from(dataUri.slice(m[0].length, m[0].length + 64), 'base64')))) {
    throw new HeroMediaError(TYPE_ERROR);
  }
  return parseUpload(dataUri);
}

/** Stores an image as assets/projects/<name> on S3 (an existing object is replaced) and returns its URL. */
const writeImage = (content, contentType, name) =>
  uploadToS3(content, `assets/${FOLDER}/${name}`, contentType, 'public-read', { cacheControl: IMMUTABLE });

/** Stores the data URI of upload_project_image on S3 and returns its URL. */
async function storeImage(body) {
  const data = typeof body?.data === 'string' ? phpTrim(body.data) : '';
  if (!/^data:/i.test(data)) throw new HeroMediaError('Format file tidak valid.');
  const { content, ext, contentType } = imageOf(data);
  return await writeImage(content, contentType, `project_${randomBytes(6).toString('hex')}.${ext}`);
}

/** A data: cover of portfolio_data (see the header), decoded and named; a refused cover names its project. */
function coverOf(dataUri, index) {
  let image;
  try {
    image = imageOf(phpTrim(dataUri));
  } catch (err) {
    if (err?.expose) throw new HeroMediaError(`Proyek ke-${index + 1}: ${err.message}`, err.status);
    throw err;
  }
  const hash = createHash('sha256').update(image.content).digest('hex').slice(0, 12);
  return { ...image, name: `project_${hash}.${image.ext}` };
}

// ── update_settings ──

/** Text with newlines: \r\n and \r → \n, control characters other than tab/newline removed, trimmed, cut. */
export function projectText(value, max = DESCRIPTION_MAX) {
  return cut(phpTrim(value.replace(/\r\n|\r/g, '\n').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')), max);
}

/** One line: whitespace runs → one space, control characters removed, trimmed, cut. */
function projectLine(value, max) {
  return cut(phpTrim(value.replace(/[ \t\n\r\x0B\x0C]+/g, ' ').replace(/[\x00-\x1F\x7F]/g, '')), max);
}

/** Tech stack names: cleaned, empty and duplicate names (ASCII case ignored) dropped, at most MAX_TOOLS. */
export function projectTools(list) {
  const tools = [];
  const seen = new Set();
  for (const tool of list) {
    if (typeof tool !== 'string') continue;
    const name = projectLine(tool, TOOL_MAX);
    const key = asciiLower(name);
    if (name === '' || seen.has(key)) continue;
    seen.add(key);
    tools.push(name);
    if (tools.length === MAX_TOOLS) break;
  }
  return tools;
}

/** Live site link: http(s) URL (scheme lowercased) or bare domain (https:// added); '' for anything else. */
export function projectUrl(value) {
  const m = URL_PATTERN.exec(phpTrim(value));
  if (!m) return '';
  const url = (m[1] ? m[1].toLowerCase() : 'https://') + m[2];
  return url.length <= URL_MAX ? url : '';
}

// Media link: a data: URI is refused with `error`, other values pass passThrough() and are trimmed
function mediaLink(value, error) {
  if (DATA_URI.test(value)) throw new HeroMediaError(error);
  return phpTrim(String(passThrough(value)));
}

function gallery(list) {
  const out = [];
  for (const src of list) {
    if (typeof src !== 'string') continue;
    const link = mediaLink(src, DATA_IMAGE_ERROR);
    if (link === '') continue;
    out.push(link);
    if (out.length === MAX_GALLERY) break;
  }
  return out;
}

function field(key, value) {
  switch (key) {
    case 'description':
      return typeof value === 'string' ? projectText(value) : '';
    case 'tools':
      return Array.isArray(value) ? projectTools(value) : [];
    case 'url':
      return typeof value === 'string' ? projectUrl(value) : '';
    case 'gallery':
      return Array.isArray(value) ? gallery(value) : [];
    default:
      return typeof value === 'string' ? mediaLink(value, DATA_VIDEO_ERROR) : '';
  }
}

/** The new fields of one project normalized (a copy); empty ones are removed. */
function normalizeItem(item, stored) {
  const out = { ...item };
  if (!out.image && isObject(stored) && stored.image) out.image = stored.image;
  for (const key of FIELDS) {
    if (!Object.hasOwn(out, key)) continue;
    const value = field(key, out[key]);
    if (value === '' || (Array.isArray(value) && value.length === 0)) delete out[key];
    else out[key] = value;
  }
  return out;
}

/** Stored portfolio_data as an array ([] when there is no row), or null when it is not a JSON array. */
async function storedItems(pool) {
  const [rows] = await pool.query(STORED_SQL);
  if (!rows || rows.length === 0) return [];
  try {
    const items = JSON.parse(rows[0].setting_value);
    return Array.isArray(items) ? items : null;
  } catch {
    return null;
  }
}

/**
 * Normalizes portfolio_data of an update_settings payload in place, before anything is saved (see the header). Not a
 * string holding a JSON array → saved as sent. Refuses data: gallery images and videos and covers the upload checks
 * refuse (400) before anything is saved; data: covers become objects.
 * @param {Record<string, unknown>} settings
 * @param {{ query: Function }} pool - reads the stored portfolio_data
 * @returns {Promise<(saved: boolean) => Promise<void>>} call once the request is over; after a successful save it runs
 *   the sweep. Never throws.
 */
export async function preparePortfolioSettings(settings, pool) {
  const noop = async () => {};
  if (!settings || typeof settings.portfolio_data !== 'string') return noop;
  let items;
  try {
    items = JSON.parse(settings.portfolio_data);
  } catch {
    return noop;
  }
  if (!Array.isArray(items)) return noop;
  const stored = (await storedItems(pool)) ?? [];
  const covers = new Map();
  const out = items.map((item, index) => {
    if (!isObject(item)) return item;
    const fields = normalizeItem(item, stored[index]);
    if (typeof fields.image === 'string' && DATA_URI.test(fields.image)) covers.set(index, coverOf(fields.image, index));
    return fields;
  });
  // Only now that every project passed
  for (const [index, { content, contentType, name }] of covers) out[index].image = await writeImage(content, contentType, name);
  settings.portfolio_data = JSON.stringify(out);
  return async (saved) => {
    if (saved) await sweepPortfolioMedia(pool);
  };
}

/** File names (linkName) of every image, gallery entry and video in the stored portfolio_data; null while it is not a JSON array. */
async function usedNames(pool) {
  const items = await storedItems(pool);
  if (!items) return null;
  const used = new Set();
  for (const item of items) {
    if (!isObject(item)) continue;
    for (const link of [item.image, item.video, ...(Array.isArray(item.gallery) ? item.gallery : [])]) {
      const name = linkName(link);
      if (name !== '') used.add(name);
    }
  }
  return used;
}

/**
 * Garbage-collect sweep (see the header): generated, unused objects under assets/projects/ older than UNUSED_MS. By
 * name only, so a stored link on another host or with a query string still keeps its object. Objects without a date
 * are kept. Errors are logged and never fail the request.
 * @param {{ query: Function }} pool
 */
export async function sweepPortfolioMedia(pool) {
  try {
    const used = await usedNames(pool);
    if (!used) return;
    const before = Date.now() - UNUSED_MS;
    for (const { key, lastModified } of await listS3(`assets/${FOLDER}/project_`)) {
      const name = key.slice(`assets/${FOLDER}/`.length);
      const modified = lastModified ? new Date(lastModified).getTime() : NaN;
      if ((GENERATED_IMAGE.test(name) || GENERATED_VIDEO.test(name)) && !used.has(name) && modified < before) await deleteFromS3(key);
    }
  } catch (err) {
    console.error('[portfolio_media] Sweep failed:', err);
  }
}
