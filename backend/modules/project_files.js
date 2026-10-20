// Client project files (project_client.project_files) for backend/server.js. backend/modules/project_files.php
// implements the same action for the PHP backend: keep both identical (action name, path rules, headers,
// HTTP status codes and `code` values).
//
// Uploads go to assets/dokumen-client/dokumen/ (private S3 objects, see uploadBase64ToS3 in s3-client.js; older
// files may sit in the web root's assets folder), and the web server refuses direct requests for that folder
// (nginx.conf, deploy/cpanel/htaccess). Staff download them through this action instead: server.js calls
// handleProjectFileAction() after the access check (createAuthGate in security.js), and download_project_file is in
// none of the action lists, so it needs a staff token (admin or user). Project images in dokumen-client/logo/ stay
// public (homepage, get_public_projects).
//
// download_project_file (GET or POST) {path: "/assets/dokumen-client/dokumen/<file>"} → the file as an attachment;
// failure → HTTP 400 INVALID_PATH / 404 NOT_FOUND + {error, code}. Node also accepts the S3 URL that older Node
// uploads stored (S3_PUBLIC_URL + the same path).
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { getFromS3, S3_PUBLIC_URL } from '../s3-client.js';

export const PROJECT_FILE_ACTIONS = Object.freeze(['download_project_file']);
export const FOLDER = 'dokumen-client/dokumen';
export const PATH_PREFIX = `/assets/${FOLDER}/`;
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';

const CONTENT_TYPES = {
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
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
};

/** An error whose message is safe to show to the client (same role as ApiError in api.php). */
export class ProjectFileError extends Error {
  constructor(message, status = 400, code = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Web root holding assets/ (PUBLIC_DIR, like public_dir() in api.php); in Docker the build mounted at /var/www/html
const publicDir = () => process.env.PUBLIC_DIR || '/var/www/html';

/**
 * The file name in a stored path "/assets/dokumen-client/dokumen/<file>" (or that path under S3_PUBLIC_URL), or null
 * for anything else: other folders, sub folders, "..", dot files (.htaccess), backslashes, ':' and control characters.
 * Old uploads kept the client's name, so spaces, commas and non-ASCII letters are allowed.
 */
export function projectFileName(path) {
  if (typeof path !== 'string' || Buffer.byteLength(path) > 1024) return null;
  const s3Prefix = `${String(S3_PUBLIC_URL || '').replace(/\/+$/, '')}${PATH_PREFIX}`;
  let name;
  if (path.startsWith(PATH_PREFIX)) name = path.slice(PATH_PREFIX.length);
  else if (S3_PUBLIC_URL && path.startsWith(s3Prefix)) name = path.slice(s3Prefix.length);
  else return null;
  if (name === '' || Buffer.byteLength(name) > 255 || name.startsWith('.') || /[/\\:\x00-\x1f\x7f]/.test(name)) return null;
  return name;
}

/** Full path of the file inside <web root>/assets/dokumen-client/dokumen/, or null when it does not exist there. */
export async function localProjectFile(name) {
  try {
    const folder = await realpath(join(publicDir(), 'assets', ...FOLDER.split('/')));
    // realpath also refuses links that point outside the folder
    const file = await realpath(join(folder, name));
    return file.startsWith(folder + sep) && (await stat(file)).isFile() ? file : null;
  } catch {
    return null;
  }
}

export function contentTypeOf(name) {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  return Object.hasOwn(CONTENT_TYPES, ext) ? CONTENT_TYPES[ext] : 'application/octet-stream';
}

// rawurlencode() in PHP: encodeURIComponent plus !'()*
const rawUrlEncode = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** Always a download; filename* (RFC 6266/5987) keeps non-ASCII names, filename is the ASCII fallback (one _ per byte, like PHP). */
export function contentDisposition(name) {
  const ascii = Buffer.from(name, 'utf8').toString('latin1').replace(/[^\x20-\x7e]|["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${rawUrlEncode(name)}`;
}

export function downloadHeaders(name, size) {
  return {
    'Content-Type': contentTypeOf(name),
    'Content-Length': String(size),
    'Content-Disposition': contentDisposition(name),
    'Cache-Control': 'private, no-store',
    // Opened directly, an SVG or text file must not run script on this origin
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'X-Content-Type-Options': 'nosniff',
  };
}

async function downloadProjectFile(input, res) {
  const name = projectFileName(input.path);
  if (name === null) throw new ProjectFileError('Path file tidak valid.', 400, 'INVALID_PATH');

  const file = await localProjectFile(name);
  if (file) {
    const { size } = await stat(file);
    res.status(200).set(downloadHeaders(name, size));
    await pipeline(createReadStream(file), res);
    return;
  }
  // Not in the web root: the private S3 object with the same key
  const object = await getFromS3(`assets/${FOLDER}/${name}`);
  if (!object) throw new ProjectFileError('File tidak ditemukan.', 404, 'NOT_FOUND');
  res.status(200).set(downloadHeaders(name, object.size));
  await pipeline(object.body, res);
}

/** Runs a project file action; returns false when `action` is not one of them. */
export async function handleProjectFileAction(action, input, req, res) {
  if (action !== 'download_project_file') return false;
  try {
    const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    await downloadProjectFile(body, res);
  } catch (err) {
    sendError(res, err, action);
  }
  return true;
}

function sendError(res, err, action) {
  if (err instanceof ProjectFileError && !res.headersSent) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  // The browser closing the download early is not a server error
  if (err?.code !== 'ERR_STREAM_PREMATURE_CLOSE') console.error(`[api] ${action}:`, err);
  // A stream that broke after the headers went out can only be cut off
  if (res.headersSent) {
    res.destroy?.();
    return;
  }
  res.status(500).json({ error: GENERIC_ERROR });
}
