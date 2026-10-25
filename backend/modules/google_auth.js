// Masuk & daftar akun pembeli dengan Google (docs/platform/GOOGLE-LOGIN.md) untuk backend/server.js. Tombol Google
// Identity Services di /masuk dan /daftar memberi browser sebuah ID token (JWT RS256 yang ditandatangani Google); browser
// meneruskannya ke aksi customer_google_auth, dan token itu diverifikasi di sini: tanda tangan dengan sertifikat Google,
// iss, aud = client ID situs ini, exp/iat, dan email_verified. Baru sesudah itu akun dimasukkan, ditautkan, atau dibuat
// (accountPlan). backend/modules/google_auth.php implements the same actions for the PHP backend: keep both identical
// (action names, input validation, JSON shapes, HTTP status codes and `code` values); __tests__/backend/google-auth.test.ts
// runs both.
//
// Client ID: setting google_client_id (hero_settings) atau env GOOGLE_CLIENT_ID, yang valid
// pertama. Kosong = fitur mati: tombol disembunyikan, customer_google_auth menjawab 503 GOOGLE_NOT_CONFIGURED. Client ID
// bukan rahasia (ikut tampil di halaman). users.google_sub (migration 027) = id akun Google (klaim sub), UNIQUE.
//
// server.js calls handleGoogleAuthAction() in its /api.php GET and POST handlers, after the access check (createAuthGate
// in security.js); both actions are in PUBLIC_ACTIONS.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createLimiter, isAuthConfigured, issueToken } from '../security.js';

const CERTS_URL = 'https://www.googleapis.com/oauth2/v1/certs'; // kid → sertifikat X.509 PEM
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const CLIENT_ID_PATTERN = /^[0-9]+-[0-9a-z]+\.apps\.googleusercontent\.com$/;
const EMAIL_PATTERN = /^[^\x09-\x0D\x20@]+@[^\x09-\x0D\x20@]+\.[^\x09-\x0D\x20@]+$/;
const SPACE_RUN = /[\x09-\x0D\x20]+/g; // spasi ASCII saja, = GA_SPACE_RUN di google_auth.php
const CLOCK_SKEW = 300; // detik toleransi selisih jam server dengan Google (exp, iat)
const TOKEN_MAX = 8192; // panjang ID token yang masih wajar
const CERTS_MIN_REFRESH_MS = 60_000; // unduh ulang paling sering sekali per menit saat kid tidak dikenal
// Hanya Gmail, atau Google Workspace (klaim hd = domain email), yang membuat Google berwenang atas email itu. Email lain
// yang cocok dengan akun lama tidak ditautkan otomatis: pemiliknya masuk dengan kata sandi (panduan Google "Using email
// addresses as identifiers").
const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

const MSG_INVALID = 'Verifikasi akun Google gagal. Silakan coba lagi.';
const MSG_UNAVAILABLE = 'Google tidak bisa dihubungi saat ini. Coba lagi sebentar lagi, atau gunakan email dan kata sandi.';
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';

const failuresByIp = createLimiter(15 * 60 * 1000, 20); // verifikasi gagal per IP per 15 menit
const signupsByIp = createLimiter(60 * 60 * 1000, 5); // akun baru lewat Google per IP per jam (= customer_register)

/** Galat yang pesannya aman ditampilkan (peran ApiError di api.php). `errors` = pesan per kolom. */
export class GoogleAuthError extends Error {
  constructor(message, status = 400, code = null, errors = null, headers = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.headers = headers;
  }
}

export async function handleGoogleAuthAction(action, params, req, res, pool) {
  const name = typeof action === 'string' ? action.trim() : '';
  if (name !== 'google_auth_config' && name !== 'customer_google_auth') return false;
  try {
    if (name === 'google_auth_config') {
      res.json({ success: true, client_id: await clientIdOf(pool) });
      return true;
    }
    if (req.method !== 'POST') throw new GoogleAuthError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    const input = params && typeof params === 'object' && !Array.isArray(params) ? params : {};
    res.json({ success: true, ...(await customerGoogleAuth(pool, input, req)) });
  } catch (err) {
    sendError(res, err, name);
  }
  return true;
}

function sendError(res, err, action) {
  if (res.headersSent) return;
  if (err instanceof GoogleAuthError) {
    if (err.headers) res.set(err.headers);
    if (res.locals) res.locals.safeError = true;
    const body = { error: err.message };
    if (err.code) body.code = err.code;
    if (err.errors && Object.keys(err.errors).length) body.errors = err.errors;
    res.status(err.status).json(body);
    return;
  }
  console.error(`[api] ${action}:`, err);
  res.status(500).json({ error: GENERIC_ERROR });
}

// Client ID yang berlaku: setting dulu, lalu env; nilai yang bukan format client ID Google diabaikan
async function clientIdOf(pool) {
  const [rows] = await pool.query("SELECT setting_value FROM hero_settings WHERE setting_key = 'google_client_id' LIMIT 1");
  return pickClientId(rows[0]?.setting_value ?? null, process.env.GOOGLE_CLIENT_ID ?? '');
}

export function pickClientId(setting, env) {
  for (const raw of [setting, env]) {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value !== '' && CLIENT_ID_PATTERN.test(value)) return value;
  }
  return null;
}

function tooManyAttempts(seconds) {
  throw new GoogleAuthError(`Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(seconds / 60))} menit.`, 429, null, null,
    { 'Retry-After': String(seconds) });
}

// Input: credential (ID token), lalu untuk akun baru name? + phone. Hasil:
// - akun ada / baru ditautkan / baru dibuat: {user, token, expires_at, account: login|linked|created}
// - email belum terdaftar dan phone belum dikirim: {signup_required: true, profile: {name, email}}; belum ada yang dibuat
// certs: sumber sertifikat (lihat verifyIdToken), hanya diganti oleh tes; bawaan = unduh dari Google.
export async function customerGoogleAuth(pool, input, req, certs = googleCerts) {
  if (!isAuthConfigured()) throw new GoogleAuthError('Login belum dikonfigurasi di server.', 503);
  const clientId = await clientIdOf(pool);
  if (clientId === null) throw new GoogleAuthError('Masuk dengan Google belum diaktifkan.', 503, 'GOOGLE_NOT_CONFIGURED');
  const ip = req.ip || req.socket?.remoteAddress || '';
  const failKey = `google-auth|${ip}`;
  const wait = failuresByIp.retryAfter(failKey);
  if (wait) tooManyAttempts(wait);

  let identity;
  try {
    identity = await verifyIdToken(input.credential ?? null, clientId, certs, Math.floor(Date.now() / 1000));
  } catch (err) {
    if (err instanceof GoogleAuthError && err.status === 401) failuresByIp.hit(failKey);
    throw err;
  }

  const bySub = await userWhere(pool, 'google_sub', identity.sub);
  const byEmail = bySub ? null : await userWhere(pool, 'email', identity.email);
  const plan = accountPlan(bySub, byEmail, identity);
  if (plan === 'login') return session(bySub, 'login');
  if (plan === 'link') {
    await pool.query('UPDATE users SET google_sub = ? WHERE id = ? AND google_sub IS NULL', [identity.sub, Number(byEmail.id)]);
    return session(byEmail, 'linked');
  }

  if (!signupSubmitted(input)) {
    return { signup_required: true, profile: { name: identity.name, email: identity.email } };
  }
  const signupKey = `google-register|${ip}`;
  const signupWait = signupsByIp.retryAfter(signupKey);
  if (signupWait) tooManyAttempts(signupWait);
  const fields = signupFields(input, identity);
  signupsByIp.hit(signupKey);
  let result;
  try {
    // Kata sandi acak yang tidak diketahui siapa pun: akun ini masuk lewat Google (atau minta atur ulang ke tim)
    [result] = await pool.query(
      `INSERT INTO users (name, email, password, phone, role, status, avatar, google_sub)
       VALUES (?, ?, ?, ?, 'customer', 'active', '', ?)`,
      [fields.name, identity.email, await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10), fields.phone, identity.sub],
    );
  } catch (err) {
    // Email/google_sub baru saja dipakai permintaan lain (klik ganda): coba masuk lagi akan menemukannya
    if (err?.code === 'ER_DUP_ENTRY') throw new GoogleAuthError('Akun ini baru saja dibuat. Silakan coba masuk lagi.', 409, 'GOOGLE_RETRY');
    throw err;
  }
  return session(await userWhere(pool, 'id', result.insertId), 'created');
}

// dateStrings: created_at sebagai 'YYYY-MM-DD HH:MM:SS', seperti api.php
async function userWhere(pool, column, value) {
  const [rows] = await pool.query({ sql: `SELECT * FROM users WHERE ${column} = ? LIMIT 1`, values: [value], dateStrings: true });
  return rows[0] ?? null;
}

function session(row, account) {
  const { token, expiresAt } = issueToken(row);
  const { password: _hash, google_sub: _sub, ...user } = row;
  user.id = Number(user.id);
  return { user, token, expires_at: expiresAt, account };
}

// Sertifikat publik Google (kid → PEM) di memori proses, selama max-age dari Cache-Control (bawaan 1 jam)
let certCache = { certs: null, expires: 0, fetched: 0 };

async function googleCerts(refresh = false) {
  const now = Date.now();
  if (certCache.certs && (refresh ? now - certCache.fetched < CERTS_MIN_REFRESH_MS : now < certCache.expires)) {
    return certCache.certs;
  }
  let data = null;
  let status = 0;
  let maxAge = 3600;
  try {
    const response = await fetch(CERTS_URL, { signal: AbortSignal.timeout(8000) });
    status = response.status;
    const match = /max-age=(\d+)/.exec(response.headers.get('cache-control') || '');
    if (match) maxAge = Math.min(Number(match[1]), 86400);
    if (response.ok) data = await response.json();
  } catch {
    data = null;
  }
  const certs = data && typeof data === 'object' && !Array.isArray(data)
    ? Object.fromEntries(Object.entries(data).filter(([, pem]) => typeof pem === 'string'))
    : {};
  if (!Object.keys(certs).length) {
    console.error(`[google_auth] sertifikat Google tidak bisa diunduh (HTTP ${status})`);
    // Sertifikat lama yang masih tersimpan tetap dipakai selama Google tidak bisa dihubungi
    if (certCache.certs) return certCache.certs;
    throw new GoogleAuthError(MSG_UNAVAILABLE, 503, 'GOOGLE_UNAVAILABLE');
  }
  certCache = { certs, expires: now + maxAge * 1000, fetched: now };
  return certs;
}

function b64urlDecode(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) return null;
  return Buffer.from(value, 'base64url');
}

function jsonOf(buffer) {
  if (!buffer) return null;
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    return null;
  }
}

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * ID token Google → identitas {sub, email (huruf kecil), name, authoritative}. certs(refresh) memberi kid → PEM
 * (refresh = Google baru saja mengganti kunci). Token rusak/palsu/kedaluwarsa/untuk aplikasi lain: 401
 * GOOGLE_TOKEN_INVALID; email belum diverifikasi Google: 403 GOOGLE_EMAIL_UNVERIFIED.
 */
export async function verifyIdToken(jwt, clientId, certs, now) {
  const invalid = () => new GoogleAuthError(MSG_INVALID, 401, 'GOOGLE_TOKEN_INVALID');
  if (typeof jwt !== 'string' || jwt === '' || jwt.length > TOKEN_MAX) throw invalid();
  const parts = jwt.split('.');
  if (parts.length !== 3) throw invalid();
  const header = jsonOf(b64urlDecode(parts[0]));
  const signature = b64urlDecode(parts[2]);
  if (!isPlainObject(header) || header.alg !== 'RS256' || typeof header.kid !== 'string' || !signature) throw invalid();
  const { kid } = header;
  let keys = await certs(false);
  if (!Object.hasOwn(keys, kid)) keys = await certs(true);
  const pem = Object.hasOwn(keys, kid) ? keys[kid] : null;
  let valid = false;
  try {
    valid = typeof pem === 'string' && crypto.verify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`), crypto.createPublicKey(pem), signature);
  } catch {
    valid = false;
  }
  if (!valid) throw invalid();

  const claims = jsonOf(b64urlDecode(parts[1]));
  if (!isPlainObject(claims) || !ISSUERS.has(claims.iss) || claims.aud !== clientId) throw invalid();
  const { exp, iat } = claims;
  if (!Number.isInteger(exp) || !Number.isInteger(iat) || exp + CLOCK_SKEW < now || iat - CLOCK_SKEW > now) throw invalid();
  const { sub } = claims;
  if (typeof sub !== 'string' || !/^[\x21-\x7e]{1,255}$/.test(sub)) throw invalid();
  const email = typeof claims.email === 'string' ? asciiLower(phpTrim(claims.email)) : '';
  if (Buffer.byteLength(email) > 150 || !EMAIL_PATTERN.test(email)) throw invalid();
  if (claims.email_verified !== true && claims.email_verified !== 'true') {
    throw new GoogleAuthError('Email akun Google ini belum terverifikasi. Gunakan akun Google lain atau daftar dengan email.', 403, 'GOOGLE_EMAIL_UNVERIFIED');
  }
  const domain = email.slice(email.lastIndexOf('@') + 1);
  const hd = typeof claims.hd === 'string' ? asciiLower(phpTrim(claims.hd)) : '';
  return {
    sub,
    email,
    name: displayName(claims, email),
    authoritative: GMAIL_DOMAINS.has(domain) || (hd !== '' && hd === domain),
  };
}

// trim() PHP bawaan: spasi, \t, \n, \r, \0, \x0B (String.prototype.trim JavaScript membuang lebih banyak karakter)
const phpTrim = (value) => value.replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');

// strtolower() PHP 8.2+: huruf A-Z saja
const asciiLower = (value) => value.replace(/[A-Z]+/g, (letters) => letters.toLowerCase());

const chars = (value) => [...value].length;

// Spasi ASCII berderet jadi satu, tanpa spasi di tepi
const collapse = (value) => (typeof value === 'string' ? value.replace(SPACE_RUN, ' ').replace(/^ +| +$/g, '') : '');

// Nama untuk akun baru: klaim name, lalu given_name + family_name, lalu bagian depan email; maks 100 karakter
export function displayName(claims, email) {
  let name = collapse(claims.name);
  if (chars(name) < 2) name = collapse(`${collapse(claims.given_name)} ${collapse(claims.family_name)}`);
  if (chars(name) < 2) name = email.slice(0, email.lastIndexOf('@'));
  return [...name].slice(0, 100).join('');
}

/**
 * Akun untuk identitas Google ini: 'login' (sudah tertaut), 'link' (email sama, tautkan sekarang), 'signup' (belum ada).
 * Akun staf tidak bisa masuk lewat Google; email non-Gmail/Workspace tidak ditautkan ke akun lama tanpa kata sandi.
 */
export function accountPlan(bySub, byEmail, identity) {
  const user = bySub ?? byEmail;
  if (!user) return 'signup';
  if (user.role !== 'customer') {
    throw new GoogleAuthError('Email ini milik akun staf. Masuk lewat halaman login staf dengan email dan kata sandi.', 403, 'GOOGLE_STAFF_ACCOUNT');
  }
  if (!bySub) {
    if (user.google_sub !== null && user.google_sub !== undefined && user.google_sub !== '') {
      throw new GoogleAuthError('Email ini sudah tertaut ke akun Google lain. Masuk dengan email dan kata sandi.', 409, 'GOOGLE_OTHER_ACCOUNT');
    }
    if (!identity.authoritative) {
      throw new GoogleAuthError('Email ini sudah terdaftar. Masuk dengan email dan kata sandi.', 409, 'GOOGLE_NEEDS_PASSWORD');
    }
  }
  if (user.status !== 'active') throw new GoogleAuthError('Akun Anda belum aktif. Hubungi administrator.', 403, 'ACCOUNT_INACTIVE');
  return bySub ? 'login' : 'link';
}

// Langkah kedua pendaftaran sudah dikirim (nomor WhatsApp ada di input, walau kosong)
export function signupSubmitted(input) {
  return Object.hasOwn(input, 'phone') && input.phone !== null;
}

// Nama (bawaan: nama dari Google) dan nomor WhatsApp akun baru; aturan sama dengan customer_register
export function signupFields(input, identity) {
  const errors = {};
  const name = text(Object.hasOwn(input, 'name') ? input.name : identity.name, 'Nama', 100, 2, 'name', errors);
  let phone = text(input.phone ?? null, 'Nomor WhatsApp', 30, 0, 'phone', errors);
  if (phone !== null) {
    phone = phone.replace(/[\x09-\x0D\x20().-]+/g, '');
    if (!/^\+?[0-9]{8,15}$/.test(phone)) {
      errors.phone = 'Nomor WhatsApp tidak valid. Gunakan 8-15 digit angka, contoh: 081234567890.';
      phone = null;
    }
  }
  const keys = Object.keys(errors);
  if (keys.length) throw new GoogleAuthError(errors[keys[0]], 400, 'VALIDATION', errors);
  return { name, phone };
}

function text(raw, label, max, min, key, errors) {
  if (typeof raw !== 'string' && raw !== null && raw !== undefined) {
    errors[key] = `${label} tidak valid.`;
    return null;
  }
  const value = collapse(raw ?? '');
  if (value === '') {
    errors[key] = `${label} wajib diisi.`;
    return null;
  }
  const length = chars(value);
  if (length > max) errors[key] = `${label} maksimal ${max} karakter.`;
  else if (length < min) errors[key] = `${label} minimal ${min} karakter.`;
  return errors[key] ? null : value;
}
