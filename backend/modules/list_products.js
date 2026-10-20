// Company products (table list_products) for backend/server.js. backend/modules/list_products.php implements the
// same actions for the PHP backend: keep both identical (action names, input validation, JSON shapes, HTTP status
// codes, `code` values and the encryption format below).
//
// server.js calls handleListProductAction() at the top of its /api.php GET and POST handlers, after the access
// check (createAuthGate in security.js): get_list_products is public, encrypt_list_products is admin only and the
// other actions need a staff token (admin or user).
//
// `users` holds the login accounts of each client product (JSON array, e.g. [{username, password, keterangan}]).
// It is stored encrypted: "enc:v1:" + base64(iv[12] ‖ ciphertext ‖ tag[16]), AES-256-GCM with the 32-byte key
// LIST_PRODUCTS_KEY (64 hex characters) and USERS_AAD as additional data. Only the staff actions read it; the public
// list selects PUBLIC_COLUMNS and never returns it. Rows saved before encryption (plain JSON) are still readable;
// encrypt_list_products encrypts them in place.
//
// Response shapes (unchanged from the earlier server.js handlers): get_list_products → array of rows,
// get_list_product_detail → one row, writes → {success: true, ...}; failure → HTTP 4xx/5xx + {error, code?}.
import crypto from 'node:crypto';
import { uploadBase64ToS3, uploadCompressedImageToS3 } from '../s3-client.js';

export const PUBLIC_COLUMNS = ['id', 'title', 'description', 'link_button', 'image', 'logo'];
export const ENCRYPTED_PREFIX = 'enc:v1:';
const USERS_AAD = Buffer.from('list_products.users', 'utf8');
const IV_BYTES = 12;
const TAG_BYTES = 16;
// Plain JSON limit: the ciphertext (base64, about 4/3 of this) must fit the TEXT column (65,535 bytes)
const USERS_MAX_BYTES = 32768;
const GET_ACTIONS = new Set(['get_list_products', 'get_list_product_detail']);
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';
const KEY_MISSING = 'Kunci enkripsi LIST_PRODUCTS_KEY belum diatur di .env server (64 karakter hex, lihat .env.example).';
const DECRYPT_FAILED = 'Data akun produk tidak bisa dibuka: LIST_PRODUCTS_KEY tidak cocok atau data rusak.';

/** An error whose message is safe to show to the client (same role as ApiError in api.php). */
export class ListProductError extends Error {
  constructor(message, status = 400, code = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ── Encryption (same bytes as lp_encrypt / lp_decrypt in list_products.php) ──

/** The 32-byte key from LIST_PRODUCTS_KEY, or null when it is missing or not 64 hex characters. */
export function listProductsKey() {
  const hex = String(process.env.LIST_PRODUCTS_KEY || '').trim();
  return /^[0-9a-f]{64}$/i.test(hex) ? Buffer.from(hex, 'hex') : null;
}

function requireKey() {
  const key = listProductsKey();
  if (!key) throw new ListProductError(KEY_MISSING, 503, 'NOT_CONFIGURED');
  return key;
}

export const isEncrypted = (value) => typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);

export function encryptSecret(plain, key = requireKey()) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(USERS_AAD);
  const ciphertext = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return ENCRYPTED_PREFIX + Buffer.concat([iv, ciphertext, cipher.getAuthTag()]).toString('base64');
}

export function decryptSecret(stored, key = requireKey()) {
  const body = String(stored).slice(ENCRYPTED_PREFIX.length);
  // Strict base64 like PHP's base64_decode($s, true)
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(body) || body.length % 4 !== 0) throw new ListProductError(DECRYPT_FAILED, 500, 'DECRYPT_FAILED');
  const raw = Buffer.from(body, 'base64');
  if (raw.length < IV_BYTES + TAG_BYTES) throw new ListProductError(DECRYPT_FAILED, 500, 'DECRYPT_FAILED');
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, IV_BYTES), { authTagLength: TAG_BYTES });
    decipher.setAAD(USERS_AAD);
    decipher.setAuthTag(raw.subarray(raw.length - TAG_BYTES));
    return Buffer.concat([decipher.update(raw.subarray(IV_BYTES, raw.length - TAG_BYTES)), decipher.final()]).toString('utf8');
  } catch {
    throw new ListProductError(DECRYPT_FAILED, 500, 'DECRYPT_FAILED');
  }
}

/** Stored `users` → plain JSON for staff. Legacy plain rows are returned as they are. */
export function readUsers(stored) {
  if (stored === null || stored === undefined) return null;
  return isEncrypted(stored) ? decryptSecret(stored) : stored;
}

/** Client `users` (JSON array or its JSON text) → canonical JSON text; throws a 400 when it is not an array. */
export function normalizeUsers(value) {
  let list = value;
  if (typeof value === 'string') {
    const text = phpTrim(value);
    try {
      list = text === '' ? [] : JSON.parse(text);
    } catch {
      list = null;
    }
  }
  if (!Array.isArray(list)) {
    throw new ListProductError('Format akun (users) tidak valid: harus berupa JSON array.', 400, 'VALIDATION');
  }
  const json = JSON.stringify(list);
  if (Buffer.byteLength(json, 'utf8') > USERS_MAX_BYTES) throw new ListProductError('Data akun terlalu panjang.', 400, 'VALIDATION');
  return json;
}

/** Client `users` → value for the users column (always encrypted; needs LIST_PRODUCTS_KEY). */
export const encryptUsers = (value) => encryptSecret(normalizeUsers(value), requireKey());

// ── Input helpers (same coercion as in_str / in_int / trim in api.php) ──

const phpTrim = (s) => s.replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');
const has = (input, key) => input[key] !== undefined && input[key] !== null;
const textOf = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
const charLength = (s) => [...s].length;

function intOf(input, query, key) {
  const v = input[key] ?? query?.[key];
  if (typeof v === 'number') return Number.isFinite(v) ? Math.trunc(v) : 0;
  return typeof v === 'string' && /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\s*$/.test(v) ? Math.trunc(Number(v)) : 0;
}

// Script/data URLs are dropped (stored links end up in href/src), like safe_link() in api.php
const safeLink = (v) => (typeof v === 'string' && /^[\s\x00-\x1f]*(javascript|vbscript|data):/i.test(v) ? '' : v);

function validateTexts(fields) {
  if ('title' in fields && fields.title === '') throw new ListProductError('Judul produk wajib diisi.', 400, 'VALIDATION');
  if ('title' in fields && charLength(fields.title) > 255) throw new ListProductError('Judul produk maksimal 255 karakter.', 400, 'VALIDATION');
  if ('link_button' in fields && charLength(fields.link_button) > 500) throw new ListProductError('Link maksimal 500 karakter.', 400, 'VALIDATION');
}

// Saves the base64 entries of a project_files list ([{name, type, size, data}]), like save_base64_files() in api.php
async function saveProjectFiles(files) {
  let list = files;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = null;
    }
  }
  if (!Array.isArray(list)) return [];
  const saved = [];
  for (const f of list) {
    if (!f || typeof f !== 'object' || Array.isArray(f)) continue;
    if (typeof f.data === 'string' && /^\s*data:/i.test(f.data)) {
      const path = await uploadBase64ToS3(f.data.trimStart(), 'list-products/documents', textOf(f.name ?? 'file') || 'file');
      saved.push({ name: f.name ?? '', type: f.type ?? '', size: f.size ?? 0, path });
    } else {
      const { data: _data, ...rest } = f;
      if ('path' in rest) rest.path = safeLink(rest.path);
      saved.push(rest);
    }
  }
  return saved;
}

// Image upload (compressed WebP on S3); existing paths/URLs are kept, empty stays empty
const saveImage = async (value) => (typeof value === 'string' ? uploadCompressedImageToS3(value, 'list-products') : null);

// ── Actions ──

async function getListProducts({ pool }) {
  // position is set by update_product_order (0 = not ordered yet, newest first)
  const [rows] = await pool.query(`SELECT ${PUBLIC_COLUMNS.join(', ')} FROM list_products ORDER BY position ASC, id DESC`);
  // Picked again so a changed query can never leak another column (users, notes, project_files)
  return rows.map((row) => Object.fromEntries(PUBLIC_COLUMNS.map((c) => [c, c === 'id' ? Number(row.id) : row[c] ?? null])));
}

async function getListProductDetail({ pool, input, query }) {
  const id = intOf(input, query, 'id');
  if (!id) throw new ListProductError('id required', 400);
  const [rows] = await pool.query({ sql: 'SELECT * FROM list_products WHERE id = ?', values: [id], dateStrings: true });
  if (!rows.length) throw new ListProductError('Product not found', 404);
  const row = rows[0];
  return { ...row, id: Number(row.id), position: Number(row.position ?? 0), users: readUsers(row.users) };
}

async function addListProduct({ pool, input }) {
  const fields = {
    title: phpTrim(textOf(input.title)),
    description: textOf(input.description),
    link_button: safeLink(textOf(input.link_button)),
    notes: textOf(input.notes),
  };
  validateTexts(fields);
  // Encrypted before anything is uploaded, so a missing key fails without leaving files behind
  const users = has(input, 'users') ? encryptUsers(input.users) : null;
  const image = await saveImage(input.image);
  const logo = await saveImage(input.logo);
  const projectFiles = JSON.stringify(await saveProjectFiles(input.project_files));
  const [result] = await pool.query(
    'INSERT INTO list_products (title, description, link_button, image, logo, users, project_files, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [fields.title, fields.description, fields.link_button, image, logo, users, projectFiles, fields.notes]
  );
  return { success: true, id: Number(result.insertId) };
}

async function updateListProduct({ pool, input, query }) {
  // Only the fields that were sent are changed, so a logo-only update keeps the rest
  const id = intOf(input, query, 'id');
  const fields = {};
  for (const f of ['title', 'description', 'link_button', 'notes']) {
    if (!has(input, f)) continue;
    const text = textOf(input[f]);
    fields[f] = f === 'title' ? phpTrim(text) : f === 'link_button' ? safeLink(text) : text;
  }
  validateTexts(fields);
  const sets = Object.keys(fields).map((f) => `${f} = ?`);
  const params = Object.values(fields);
  if (has(input, 'users')) {
    sets.push('users = ?');
    params.push(encryptUsers(input.users));
  }
  if (!id || (sets.length === 0 && !input.image && !input.logo && !has(input, 'project_files'))) {
    throw new ListProductError('Tidak ada data untuk diperbarui', 400);
  }
  for (const f of ['image', 'logo']) {
    if (input[f]) {
      sets.push(`${f} = ?`);
      params.push(await saveImage(input[f]));
    }
  }
  if (has(input, 'project_files')) {
    sets.push('project_files = ?');
    params.push(JSON.stringify(await saveProjectFiles(input.project_files)));
  }
  await pool.query(`UPDATE list_products SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  return { success: true };
}

async function deleteListProduct({ pool, input, query }) {
  await pool.query('DELETE FROM list_products WHERE id = ?', [intOf(input, query, 'id')]);
  return { success: true };
}

async function updateProductOrder({ pool, input }) {
  if (!Array.isArray(input.order)) throw new ListProductError('Order must be an array', 400);
  for (const item of input.order) {
    if (!item || typeof item !== 'object') continue;
    await pool.query('UPDATE list_products SET position = ? WHERE id = ?', [intOf(item, null, 'position'), intOf(item, null, 'id')]);
  }
  return { success: true };
}

/**
 * Data migration: encrypts every `users` value that is still plain text. Idempotent (encrypted rows are skipped,
 * and only checked for being readable with the current key).
 */
export async function encryptStoredUsers(pool) {
  const key = requireKey();
  const [rows] = await pool.query("SELECT id, users FROM list_products WHERE users IS NOT NULL AND users <> '' ORDER BY id");
  let encrypted = 0;
  let alreadyEncrypted = 0;
  let unreadable = 0;
  for (const row of rows) {
    if (isEncrypted(row.users)) {
      alreadyEncrypted += 1;
      try {
        decryptSecret(row.users, key);
      } catch {
        unreadable += 1;
      }
      continue;
    }
    const value = encryptSecret(row.users, key);
    if (decryptSecret(value, key) !== row.users) throw new Error(`list_products ${row.id}: encryption round trip failed`);
    // The guard skips a row that another request encrypted in the meantime
    const [result] = await pool.query("UPDATE list_products SET users = ? WHERE id = ? AND users NOT LIKE 'enc:v1:%'", [value, row.id]);
    if (result.affectedRows) encrypted += 1;
  }
  return { success: true, encrypted, already_encrypted: alreadyEncrypted, unreadable, total: rows.length };
}

const HANDLERS = {
  get_list_products: getListProducts, // public
  get_list_product_detail: getListProductDetail, // staff: the only read that returns `users`
  add_list_product: addListProduct,
  update_list_product: updateListProduct,
  delete_list_product: deleteListProduct,
  update_product_order: updateProductOrder,
  encrypt_list_products: ({ pool }) => encryptStoredUsers(pool), // admin
};

export const LIST_PRODUCT_ACTIONS = Object.freeze(Object.keys(HANDLERS));

/** Runs a list_products action; returns false when `action` is not one of them. */
export async function handleListProductAction(action, input, req, res, pool) {
  const handler = typeof action === 'string' && Object.hasOwn(HANDLERS, action) ? HANDLERS[action] : null;
  if (!handler) return false;
  try {
    if (req.method !== 'POST' && !GET_ACTIONS.has(action)) {
      throw new ListProductError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    }
    const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    res.json(await handler({ pool, input: body, query: req.query || {}, user: req.user || null }));
  } catch (err) {
    sendError(res, err, action);
  }
  return true;
}

function sendError(res, err, action) {
  if (res.headersSent) return;
  if (err instanceof ListProductError) {
    // A deliberate 5xx message (key missing / wrong) must not be masked by maskServerErrors
    if (res.locals) res.locals.safeError = true;
    res.status(err.status).json(err.code ? { error: err.message, code: err.code } : { error: err.message });
    return;
  }
  // Upload validation (s3-client UploadError) carries a safe 4xx message, like ApiError in api.php
  if (err && err.expose && Number(err.status) >= 400 && Number(err.status) < 500) {
    res.status(Number(err.status)).json({ error: err.message });
    return;
  }
  console.error(`[api] ${action}:`, err);
  res.status(500).json({ error: GENERIC_ERROR });
}
