// Security layer for /api.php: session tokens, per-action access policy, login rate limit,
// CORS allowlist and error masking. backend/api.php mirrors this logic for the PHP backend —
// keep the action lists below in sync with the ones at the top of api.php.
import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── .env loading (local dev) ──
// In Docker the variables come from docker-compose; locally they may live in .env next to
// docker-compose.yml or in backend/.env. Variables already set in the environment win.
for (const file of [join(__dirname, '.env'), join(__dirname, '..', '.env')]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || m[1] in process.env) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  break;
}

const AUTH_SECRET = process.env.AUTH_SECRET || '';
const TOKEN_TTL_SECONDS = Number(process.env.AUTH_TOKEN_TTL) > 0 ? Number(process.env.AUTH_TOKEN_TTL) : 8 * 3600;
const authConfigured = AUTH_SECRET.length >= 32;
if (!authConfigured) {
  console.error('[auth] AUTH_SECRET is missing or shorter than 32 characters — login is disabled (see .env.example)');
}
export const isAuthConfigured = () => authConfigured;

// ── Access policy (same lists as backend/api.php, docs/platform/SPEC.md §2) ──
// Default deny: an action that is not public needs a valid token. ANY_ROLE_ACTIONS accept every logged-in role;
// customer tokens may only call CUSTOMER_ACTIONS; everything else is a staff action (role admin or user),
// ADMIN_ACTIONS admin only. Project documents (pd_*): docs/platform/PROJECT-DOCS-SPEC.md §5.
export const PUBLIC_ACTIONS = new Set([
  'get_settings', 'track_visit', 'login', 'register', 'get_list_products', 'get_navbar_menus',
  'get_templates', 'get_template', 'get_public_projects', 'get_site_public', 'submit_custom_order',
  'customer_register', 'midtrans_notification', 'get_payment_config',
]);
export const ANY_ROLE_ACTIONS = new Set([
  'pd_notifications_list', 'pd_notifications_read', 'pd_file',
]);
export const CUSTOMER_ACTIONS = new Set([
  'customer_create_order', 'customer_pay_order', 'customer_get_orders', 'customer_get_order',
  'customer_cancel_order', 'customer_get_site', 'customer_save_site_content', 'dev_simulate_payment',
  'pd_my_projects', 'pd_my_project', 'pd_my_document', 'pd_my_document_decide',
]);
export const ADMIN_ACTIONS = new Set([
  'add_user', 'delete_user',
  'migrate_paths', 'reset_product_portfolio', 'reset_visitor_stats',
  'add_navbar_menu', 'edit_navbar_menu', 'delete_navbar_menu', 'save_navbar_menus_order',
  'add_changelog', 'update_changelog', 'delete_changelog',
  'admin_delete_template',
  'encrypt_list_products',
  'pd_client_save', 'pd_client_delete', 'pd_customers_list', 'pd_project_save', 'pd_milestone_delete',
  'pd_document_change', 'pd_document_sign', 'pd_document_complete', 'pd_document_delete',
  'pd_invoice_create', 'pd_invoice_update', 'pd_invoice_cancel', 'pd_payment_record', 'pd_payment_delete',
  'pd_settings_save',
]);

const STAFF_ROLES = new Set(['admin', 'user']);
const ROLES = new Set(['admin', 'user', 'customer']);
const STATUSES = new Set(['active', 'inactive']);

export function actionOf(req) {
  // Must match how the route handlers pick the action: GET reads the query, POST prefers the body
  const action = req.method === 'GET' ? req.query?.action : (req.body?.action || req.query?.action);
  return typeof action === 'string' ? action.trim() : '';
}

// ── Tokens (JWT, HS256) ──
const b64url = (value) => Buffer.from(value).toString('base64url');
const hmac = (data) => crypto.createHmac('sha256', AUTH_SECRET).update(data).digest();

// Changes whenever the password changes, so a password reset invalidates older tokens
const passwordVersion = (hash) => crypto.createHash('sha256').update(String(hash || '')).digest('hex').slice(0, 16);

export function issueToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_TTL_SECONDS;
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ sub: Number(user.id), role: user.role, pv: passwordVersion(user.password), iat: now, exp }));
  const signature = hmac(`${header}.${payload}`).toString('base64url');
  return { token: `${header}.${payload}.${signature}`, expiresAt: exp };
}

export function verifyToken(token) {
  if (!authConfigured || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = hmac(`${header}.${payload}`);
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    if (JSON.parse(Buffer.from(header, 'base64url').toString()).alg !== 'HS256') return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

function bearerToken(req) {
  const header = req.headers.authorization || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

// Re-reads the user on every request so deactivation, role changes and password resets apply immediately
async function authenticate(req, pool) {
  const claims = verifyToken(bearerToken(req));
  if (!claims) return null;
  const [rows] = await pool.query(
    'SELECT id, name, email, phone, role, status, avatar, password FROM users WHERE id = ? LIMIT 1',
    [Number(claims.sub)]
  );
  const user = rows[0];
  if (!user || user.status !== 'active' || claims.pv !== passwordVersion(user.password)) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

// ── Rate limiting (in memory, per process) ──
export function createLimiter(windowMs, max) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
  }, 60_000).unref();
  return {
    // Seconds until the key may try again, or 0 when it is not blocked
    retryAfter(key) {
      const entry = hits.get(key);
      if (!entry || entry.reset <= Date.now() || entry.count < max) return 0;
      return Math.ceil((entry.reset - Date.now()) / 1000);
    },
    hit(key) {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || entry.reset <= now) hits.set(key, { count: 1, reset: now + windowMs });
      else entry.count += 1;
    },
    clear(key) {
      hits.delete(key);
    },
  };
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginByAccount = createLimiter(LOGIN_WINDOW_MS, 5); // failed logins per IP + email
const loginByIp = createLimiter(LOGIN_WINDOW_MS, 30); // failed logins per IP, any email
const registerByIp = createLimiter(60 * 60 * 1000, 5); // registrations per IP per hour

const tooMany = (res, seconds) =>
  res.status(429).set('Retry-After', String(seconds)).json({
    error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(seconds / 60))} menit.`,
  });

// Compared against when the email is unknown, so response time does not reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10);

// ── Middleware ──

// Handles login and public registration before the generic /api.php routes
export function createAuthActions(pool) {
  return async function authActions(req, res, next) {
    const action = actionOf(req);
    if (action !== 'login' && action !== 'register') return next();
    try {
      if (!authConfigured) {
        res.locals.safeError = true;
        return res.status(503).json({ error: 'Login belum dikonfigurasi di server.' });
      }
      const input = req.method === 'GET' ? {} : req.body || {};
      const email = typeof input.email === 'string' ? input.email.trim() : '';
      const password = typeof input.password === 'string' ? input.password : '';
      const ip = req.ip || '';

      if (action === 'login') {
        const accountKey = `${ip}|${email.toLowerCase()}`;
        const wait = Math.max(loginByAccount.retryAfter(accountKey), loginByIp.retryAfter(ip));
        if (wait) return tooMany(res, wait);
        // dateStrings: created_at as 'YYYY-MM-DD HH:MM:SS', like api.php
        const [rows] = email
          ? await pool.query({ sql: 'SELECT * FROM users WHERE email = ? LIMIT 1', values: [email], dateStrings: true })
          : [[]];
        const user = rows[0];
        const valid = await bcrypt.compare(password, user?.password || DUMMY_HASH);
        if (!user || !valid) {
          loginByAccount.hit(accountKey);
          loginByIp.hit(ip);
          return res.status(401).json({ error: 'Email atau password salah' });
        }
        if (user.status !== 'active') {
          return res.status(403).json({ error: 'Akun Anda belum aktif. Hubungi administrator.' });
        }
        loginByAccount.clear(accountKey);
        const { password: _hash, ...safeUser } = user;
        const { token, expiresAt } = issueToken(user);
        return res.json({ success: true, user: safeUser, token, expires_at: expiresAt });
      }

      // Public self-registration: always a regular user that an admin must activate first
      const wait = registerByIp.retryAfter(ip);
      if (wait) return tooMany(res, wait);
      const name = typeof input.name === 'string' ? input.name.trim().slice(0, 100) : '';
      const phone = typeof input.phone === 'string' ? input.phone.trim().slice(0, 30) : '';
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
        return res.status(400).json({ error: 'Nama dan email yang valid wajib diisi.' });
      }
      if (password.length < 8) return res.status(400).json({ error: 'Password minimal 8 karakter.' });
      registerByIp.hit(ip);
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (existing.length) return res.status(409).json({ error: 'Email sudah terdaftar.' });
      await pool.query(
        'INSERT INTO users (name, email, password, phone, role, status, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, email, await bcrypt.hash(password, 10), phone, 'user', 'inactive', '']
      );
      return res.json({ success: true, pending: true, message: 'Registrasi berhasil. Akun Anda aktif setelah disetujui admin.' });
    } catch (err) {
      return next(err);
    }
  };
}

// Links saved by the admin panel end up in href/src attributes; a javascript: URL there is stored XSS.
// Also catches them inside JSON-encoded settings strings (e.g. products_data).
const SCRIPT_URL = /(^|["'])[\s\x00-\x1f]*(javascript|vbscript)\s*:/i;
function containsScriptUrl(value, depth = 0) {
  if (typeof value === 'string') return SCRIPT_URL.test(value);
  if (!value || typeof value !== 'object' || depth > 8) return false;
  return Object.values(value).some((v) => containsScriptUrl(v, depth + 1));
}

// update_project with a `price` key (any value, null and the current one included), or add_project with a price
// other than empty or zero ("", null, 0, "0", "0.00", ".0": what a new project gets anyway). Same rule as
// sets_contract_value() in api.php
const ZERO_PRICE = /^[+-]?(0+(\.0*)?|\.0+)$/;
export function setsContractValue(action, input) {
  if ((action !== 'update_project' && action !== 'add_project') || !Object.prototype.hasOwnProperty.call(input, 'price')) return false;
  if (action === 'update_project') return true;
  const { price } = input;
  if (price === null || price === '' || price === 0) return false;
  return !(typeof price === 'string' && ZERO_PRICE.test(price));
}

// Rejects protected actions without a valid token and enforces roles; must run before the route handlers.
// Sets req.user (null for public actions) for the handlers, e.g. backend/modules/templates.js.
export function createAuthGate(pool) {
  return async function authGate(req, res, next) {
    try {
      req.user = null;
      const action = actionOf(req);
      // Includes midtrans_notification: Midtrans posts JSON without a token (checked by signature instead)
      if (PUBLIC_ACTIONS.has(action)) return next();

      const user = await authenticate(req, pool);
      if (!user) {
        return res.status(401).json({ error: 'Sesi tidak valid atau sudah berakhir. Silakan login kembali.', code: 'UNAUTHORIZED' });
      }
      req.user = user;
      // ANY_ROLE_ACTIONS (notifications, private project files) serve every logged-in role; the handler limits the
      // data to the caller. Otherwise customers only reach their CUSTOMER_ACTIONS; staff never use those
      if (!ANY_ROLE_ACTIONS.has(action)) {
        if (CUSTOMER_ACTIONS.has(action)) {
          if (user.role !== 'customer') {
            return res.status(403).json({ error: 'Akses ditolak: aksi ini khusus akun pembeli.', code: 'FORBIDDEN' });
          }
        } else if (!STAFF_ROLES.has(user.role)) {
          return res.status(403).json({ error: 'Akses ditolak.', code: 'FORBIDDEN' });
        }
      }
      const isAdmin = user.role === 'admin';
      if (ADMIN_ACTIONS.has(action) && !isAdmin) {
        return res.status(403).json({ error: 'Akses ditolak: hanya admin.', code: 'FORBIDDEN' });
      }

      // Non-admins only see their own account (the admin header uses get_users to refresh the profile)
      if (action === 'get_users' && !isAdmin) return res.json([user]);

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      if (action === 'update_user') {
        if (!isAdmin) {
          if (Number(body.id) !== Number(user.id)) {
            return res.status(403).json({ error: 'Akses ditolak: Anda hanya bisa mengubah profil sendiri.', code: 'FORBIDDEN' });
          }
          body.role = user.role;
          body.status = user.status;
        }
      }
      if (action === 'add_user' || action === 'update_user') {
        if (body.role !== undefined && !ROLES.has(body.role)) return res.status(400).json({ error: 'Role tidak valid.' });
        if (body.status !== undefined && !STATUSES.has(body.status)) return res.status(400).json({ error: 'Status tidak valid.' });
        if (action === 'add_user' && (typeof body.password !== 'string' || body.password.length < 8)) {
          return res.status(400).json({ error: 'Password minimal 8 karakter.' });
        }
        if (action === 'update_user' && body.password && String(body.password).length < 8) {
          return res.status(400).json({ error: 'Password minimal 8 karakter.' });
        }
      }
      if (action === 'delete_user' && Number(body.id ?? req.query.id) === Number(user.id)) {
        return res.status(400).json({ error: 'Tidak bisa menghapus akun yang sedang dipakai.' });
      }
      // Contract value (project_client.price, "Nilai kontrak" of the project documents) is admin only: the whole
      // request is refused, so nothing of it is saved (same check in api.php). A GET reads the query like api.php,
      // whose input for GET is the body plus the query string.
      if (!isAdmin && setsContractValue(action, req.method === 'GET' ? { ...req.query, ...body } : body)) {
        return res.status(403).json({ error: 'Hanya admin yang dapat mengubah nilai kontrak.', code: 'FORBIDDEN' });
      }
      if (containsScriptUrl(body)) {
        return res.status(400).json({ error: 'Tautan javascript:/vbscript: tidak diizinkan.' });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

// CORS: only origins listed in CORS_ORIGINS (comma separated). The site itself is same-origin and needs none.
export function corsOptions() {
  const allowed = new Set((process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean));
  return {
    origin: (origin, callback) => callback(null, Boolean(origin) && allowed.has(origin)),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  };
}

export function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  next();
}

// Replaces internal error details (SQL errors, stack messages) in 5xx JSON responses with a generic message.
// A handler that sends a deliberate, safe 5xx message (e.g. 503 "Pembayaran online belum dikonfigurasi.")
// sets res.locals.safeError = true first.
export function maskServerErrors(req, res, next) {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && !res.locals.safeError && body && typeof body === 'object' && 'error' in body) {
      console.error(`[api] ${req.method} ${actionOf(req) || req.path} → ${res.statusCode}:`, body.error);
      body = { ...body, error: GENERIC_ERROR };
    }
    return json(body);
  };
  next();
}

const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';

// Final Express error handler: malformed JSON, oversized bodies and anything a handler passes to next()
export function errorHandler(err, req, res, _next) {
  const status = Number(err.status || err.statusCode) || 500;
  if (status >= 500) console.error(`[api] ${req.method} ${actionOf(req) || req.path}:`, err);
  if (res.headersSent) return;
  let message = GENERIC_ERROR;
  if (status === 413) message = 'Ukuran data terlalu besar.';
  else if (status < 500) message = err.type || !err.expose ? 'Permintaan tidak valid.' : err.message;
  res.status(status).json({ error: message });
}
