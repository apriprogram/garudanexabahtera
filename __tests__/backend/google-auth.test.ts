// @vitest-environment node
// Masuk & daftar pembeli dengan Google di kedua backend (backend/modules/google_auth.php = google_auth.js): verifikasi ID
// token (tanda tangan RS256, iss, aud, exp/iat, sub, email_verified, kunci Google yang berganti), pilihan client ID,
// nama bawaan, rencana akun (masuk / tautkan / daftar / ditolak), validasi langkah kedua, dan alur lengkap
// customer_google_auth di atas tabel users tiruan. Token ditandatangani kunci RSA buatan tes; hasil PHP CLI dan Node harus
// identik. Bagian PHP dilewati bila `php` tidak ada.
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const GOOGLE_AUTH_PHP = resolve(__dirname, '..', '..', 'backend', 'modules', 'google_auth.php');
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo extension_loaded("openssl") ? "ok" : "no";'], { encoding: 'utf8' }).stdout === 'ok';

const CLIENT_ID = '1234567890-abcdefghijklmnopqrstuvwxyz012345.apps.googleusercontent.com';
const NOW = 1_790_000_000;

const pair = () => crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const MAIN = pair();
const ROTATED = pair();
const STRANGER = pair();
const pem = (key: crypto.KeyObject) => key.export({ type: 'spki', format: 'pem' }).toString();
/** kid → PEM: CERTS sebelum Google mengganti kunci, ROTATED_CERTS sesudahnya (certs(true)) */
const CERTS = { 'kid-main': pem(MAIN.publicKey) };
const ROTATED_CERTS = { ...CERTS, 'kid-rotated': pem(ROTATED.publicKey) };

const b64 = (value: unknown) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

function sign(claims: Record<string, unknown>, opts: { kid?: string; alg?: string; key?: crypto.KeyObject } = {}) {
  const head = b64({ alg: opts.alg ?? 'RS256', kid: opts.kid ?? 'kid-main', typ: 'JWT' });
  const body = b64(claims);
  const signature = crypto.sign('sha256', Buffer.from(`${head}.${body}`), opts.key ?? MAIN.privateKey).toString('base64url');
  return `${head}.${body}.${signature}`;
}

const claims = (extra: Record<string, unknown> = {}) => ({
  iss: 'https://accounts.google.com',
  azp: CLIENT_ID,
  aud: CLIENT_ID,
  sub: '109876543210987654321',
  email: 'budi.santoso@gmail.com',
  email_verified: true,
  name: 'Budi Santoso',
  given_name: 'Budi',
  family_name: 'Santoso',
  iat: NOW - 60,
  exp: NOW + 3540,
  ...extra,
});

const tampered = (() => {
  const [head, , signature] = sign(claims()).split('.');
  return `${head}.${b64(claims({ email: 'penyusup@gmail.com' }))}.${signature}`;
})();

const TOKEN_CASES: { name: string; jwt: unknown }[] = [
  { name: 'Gmail, email huruf besar', jwt: sign(claims({ email: ' Budi.Santoso@Gmail.COM ' })) },
  { name: 'iss tanpa https', jwt: sign(claims({ iss: 'accounts.google.com' })) },
  { name: 'Google Workspace (hd = domain email)', jwt: sign(claims({ email: 'sari@perusahaan.co.id', hd: 'Perusahaan.co.id' })) },
  { name: 'email lain tanpa hd', jwt: sign(claims({ email: 'sari@yahoo.com' })) },
  { name: 'hd beda dengan domain email', jwt: sign(claims({ email: 'sari@yahoo.com', hd: 'perusahaan.co.id' })) },
  { name: 'email_verified string "true"', jwt: sign(claims({ email_verified: 'true' })) },
  { name: 'email belum diverifikasi', jwt: sign(claims({ email_verified: false })) },
  { name: 'email_verified hilang', jwt: sign(claims({ email_verified: undefined })) },
  { name: 'aud aplikasi lain', jwt: sign(claims({ aud: '999-lain.apps.googleusercontent.com' })) },
  { name: 'aud berupa array', jwt: sign(claims({ aud: [CLIENT_ID] })) },
  { name: 'iss palsu', jwt: sign(claims({ iss: 'https://accounts.google.com.evil.test' })) },
  { name: 'kedaluwarsa, masih dalam toleransi', jwt: sign(claims({ exp: NOW - 299, iat: NOW - 3899 })) },
  { name: 'kedaluwarsa', jwt: sign(claims({ exp: NOW - 301, iat: NOW - 3901 })) },
  { name: 'iat di masa depan', jwt: sign(claims({ iat: NOW + 301, exp: NOW + 3901 })) },
  { name: 'exp berupa string', jwt: sign(claims({ exp: String(NOW + 3540) })) },
  { name: 'iat hilang', jwt: sign(claims({ iat: undefined })) },
  { name: 'alg HS256', jwt: sign(claims(), { alg: 'HS256' }) },
  { name: 'alg none', jwt: `${b64({ alg: 'none', kid: 'kid-main' })}.${b64(claims())}.` },
  { name: 'kid tidak dikenal', jwt: sign(claims(), { kid: 'kid-x' }) },
  { name: 'kid baru (Google mengganti kunci)', jwt: sign(claims(), { kid: 'kid-rotated', key: ROTATED.privateKey }) },
  { name: 'ditandatangani kunci lain', jwt: sign(claims(), { key: STRANGER.privateKey }) },
  { name: 'isi diubah setelah ditandatangani', jwt: tampered },
  { name: 'tanpa email', jwt: sign(claims({ email: undefined })) },
  { name: 'email tidak sah', jwt: sign(claims({ email: 'budi santoso@gmail.com' })) },
  { name: 'tanpa sub', jwt: sign(claims({ sub: undefined })) },
  { name: 'sub berspasi', jwt: sign(claims({ sub: '1098 7654' })) },
  { name: 'sub angka', jwt: sign(claims({ sub: 109876543210 })) },
  { name: 'kosong', jwt: '' },
  { name: 'bukan string', jwt: 12345 },
  { name: 'dua bagian', jwt: 'abc.def' },
  { name: 'empat bagian', jwt: `${sign(claims())}.x` },
  { name: 'base64 rusak', jwt: 'a$b.c.d' },
  { name: 'terlalu panjang', jwt: sign(claims({ name: 'x'.repeat(9000) })) },
];

const PICK_CASES: [unknown, unknown][] = [
  [CLIENT_ID, '42-env.apps.googleusercontent.com'],
  ['', '42-env.apps.googleusercontent.com'],
  ['bukan-client-id', '42-env.apps.googleusercontent.com'],
  [`  ${CLIENT_ID}  `, ''],
  ['42-ABC.apps.googleusercontent.com', ''],
  [null, ''],
  [12, null],
];

const NAME_CASES: { claims: Record<string, unknown>; email: string }[] = [
  { claims: { name: '  Budi \t  Santoso ' }, email: 'budi@gmail.com' },
  { claims: { name: 'B', given_name: 'Budi', family_name: 'Santoso' }, email: 'budi@gmail.com' },
  { claims: { given_name: ' Sari ' }, email: 'sari@gmail.com' },
  { claims: { name: 7 }, email: 'a.b@gmail.com' },
  { claims: {}, email: 'x@gmail.com' },
  { claims: { name: 'Åsa\tØrn Ångström' }, email: 'asa@gmail.com' },
  { claims: { name: `${'Ŵ'.repeat(99)}😀😀` }, email: 'w@gmail.com' },
];

const IDENTITY = { sub: '1098', email: 'budi@gmail.com', name: 'Budi Santoso', authoritative: true };
const customer = (extra: Record<string, unknown> = {}) => ({ id: 7, role: 'customer', status: 'active', google_sub: null, ...extra });

const PLAN_CASES: { name: string; bySub: unknown; byEmail: unknown; identity: Record<string, unknown> }[] = [
  { name: 'belum ada akun', bySub: null, byEmail: null, identity: IDENTITY },
  { name: 'sudah tertaut', bySub: customer({ google_sub: '1098' }), byEmail: null, identity: IDENTITY },
  { name: 'tertaut, nonaktif', bySub: customer({ google_sub: '1098', status: 'inactive' }), byEmail: null, identity: IDENTITY },
  { name: 'tertaut ke akun staf', bySub: customer({ role: 'admin', google_sub: '1098' }), byEmail: null, identity: IDENTITY },
  { name: 'email sama, Gmail', bySub: null, byEmail: customer(), identity: IDENTITY },
  { name: 'email sama, google_sub kosong', bySub: null, byEmail: customer({ google_sub: '' }), identity: IDENTITY },
  { name: 'email sama, bukan Gmail/Workspace', bySub: null, byEmail: customer(), identity: { ...IDENTITY, authoritative: false } },
  { name: 'email sama, tertaut akun Google lain', bySub: null, byEmail: customer({ google_sub: '5555' }), identity: IDENTITY },
  { name: 'email staf', bySub: null, byEmail: customer({ role: 'user' }), identity: IDENTITY },
  { name: 'email sama, nonaktif', bySub: null, byEmail: customer({ status: 'inactive' }), identity: IDENTITY },
];

const SIGNUP_CASES: Record<string, unknown>[] = [
  {},
  { phone: null },
  { phone: '' },
  { phone: '0812-3456-7890' },
  { phone: ' 0812 3456 7890 ', name: '  Budi   Santoso ' },
  { phone: '(021) 555.1234', name: 'Åsa\tØrn' },
  { phone: '+6281234567890', name: 'x'.repeat(101) },
  { phone: '12345', name: 'B' },
  { phone: 81234567890 },
  { phone: '081234567890', name: null },
  { phone: '081234567890', name: ['Budi'] },
];

// ── Alur lengkap customer_google_auth di atas tabel users tiruan ──
const USERS = [
  { id: 1, name: 'Admin', email: 'admin@gmail.com', password: 'h1', phone: null, role: 'admin', status: 'active', avatar: '', google_sub: null },
  { id: 2, name: 'Rina', email: 'rina@gmail.com', password: 'h2', phone: '0811111111', role: 'customer', status: 'active', avatar: '', google_sub: null },
  { id: 3, name: 'Tono', email: 'tono@yahoo.com', password: 'h3', phone: '0822222222', role: 'customer', status: 'active', avatar: '', google_sub: null },
  { id: 4, name: 'Dewi', email: 'dewi@gmail.com', password: 'h4', phone: '0833333333', role: 'customer', status: 'active', avatar: '', google_sub: 'sub-dewi' },
];
type FlowCase = { name: string; setting: string | null; input: Record<string, unknown> };
const flowToken = (extra: Record<string, unknown>) => sign(claims({ iat: Math.floor(Date.now() / 1000) - 60, exp: Math.floor(Date.now() / 1000) + 3540, ...extra }));
const FLOW_CASES: FlowCase[] = [
  { name: 'client ID belum diisi', setting: null, input: { credential: flowToken({}) } },
  { name: 'token rusak', setting: CLIENT_ID, input: { credential: 'abc' } },
  { name: 'sudah tertaut: masuk', setting: CLIENT_ID, input: { credential: flowToken({ sub: 'sub-dewi', email: 'dewi.baru@gmail.com' }) } },
  { name: 'email Gmail terdaftar: ditautkan', setting: CLIENT_ID, input: { credential: flowToken({ sub: 'sub-rina', email: 'Rina@gmail.com' }) } },
  { name: 'email Yahoo terdaftar: pakai kata sandi', setting: CLIENT_ID, input: { credential: flowToken({ sub: 'sub-tono', email: 'tono@yahoo.com' }) } },
  { name: 'email staf', setting: CLIENT_ID, input: { credential: flowToken({ sub: 'sub-admin', email: 'admin@gmail.com' }) } },
  { name: 'akun baru: minta nomor WhatsApp', setting: CLIENT_ID, input: { credential: flowToken({ sub: 'sub-baru', email: 'baru@gmail.com', name: 'Akun Baru' }) } },
  { name: 'akun baru: nomor tidak sah', setting: CLIENT_ID, input: { credential: flowToken({ sub: 'sub-baru', email: 'baru@gmail.com' }), phone: '12' } },
  {
    name: 'akun baru: dibuat',
    setting: CLIENT_ID,
    input: { credential: flowToken({ sub: 'sub-baru', email: 'Baru@Gmail.com', name: 'Akun Baru' }), phone: '0812-3456-7890', name: ' Budi  Baru ' },
  },
];

interface FakeDb {
  users: Record<string, unknown>[];
  setting: string | null;
}

/** pool.query tiruan untuk google_auth.js: hanya kueri yang dipakai modul itu. */
function fakePool(db: FakeDb) {
  return {
    async query(q: string | { sql: string; values: unknown[] }, params: unknown[] = []) {
      const sql = typeof q === 'string' ? q : q.sql;
      const values = typeof q === 'string' ? params : q.values;
      if (sql.includes('FROM hero_settings')) return [db.setting === null ? [] : [{ setting_value: db.setting }]];
      const where = /FROM users WHERE (\w+) = \?/.exec(sql);
      if (where) {
        const value = values[0];
        const row = db.users.find((u) => (where[1] === 'email' ? String(u.email).toLowerCase() === String(value).toLowerCase() : u[where[1]] === value));
        return [row ? [{ ...row }] : []];
      }
      if (sql.startsWith('UPDATE users SET google_sub = ?, password = ?')) {
        const row = db.users.find((u) => u.id === values[2] && u.google_sub === null);
        if (row) Object.assign(row, { google_sub: values[0], password: values[1] ? 'rotated' : '' });
        return [{ affectedRows: row ? 1 : 0 }];
      }
      if (sql.includes('INSERT INTO users')) {
        const [name, email, password, phone, googleSub] = values;
        const id = 100 + db.users.length;
        db.users.push({ id, name, email, password: password ? 'hashed' : '', phone, role: 'customer', status: 'active', avatar: '', google_sub: googleSub });
        return [{ insertId: id }];
      }
      throw new Error(`kueri tidak dikenal: ${sql}`);
    },
  };
}

type Outcome = { ok: unknown } | { error: { status: number; code: string | null; message: string; errors?: unknown } };

/** Token sesi dan masa berlakunya berbeda di tiap backend (tiruan issue_token di PHP): disamakan sebelum dibandingkan. */
function normalize(outcome: Outcome): Outcome {
  if (!('ok' in outcome) || !outcome.ok || typeof outcome.ok !== 'object' || !('token' in outcome.ok)) return outcome;
  return { ok: { ...(outcome.ok as Record<string, unknown>), token: 'TOKEN', expires_at: 0 } };
}

const PHP_HARNESS = String.raw`
class ApiError extends Exception {
    public $status; public $errorCode; public $fieldErrors;
    public function __construct($message, $status = 400, $errorCode = null, $fieldErrors = null) { parent::__construct($message); $this->status = $status; $this->errorCode = $errorCode; $this->fieldErrors = $fieldErrors; }
}
$DB = ['users' => [], 'setting' => null];
function env_value($key, $default = '') { return $default; }
function auth_secret() { return str_repeat('s', 32); }
function client_ip() { return '203.0.113.9'; }
function rate_limit_wait($key, $max) { return 0; }
function rate_limit_hit($key, $window) {}
function too_many_attempts($seconds) { throw new ApiError('Terlalu banyak percobaan.', 429); }
function issue_token(array $user) { return ['tok-' . $user['id'], 1]; }
function db_one($conn, $sql, array $params = []) {
    global $DB;
    if (strpos($sql, 'FROM hero_settings') !== false) return $DB['setting'] === null ? null : ['setting_value' => $DB['setting']];
    if (preg_match('/FROM users WHERE (\w+) = \?/', $sql, $m)) {
        foreach ($DB['users'] as $u) {
            if ($m[1] === 'email' ? strtolower($u['email']) === strtolower($params[0]) : $u[$m[1]] === $params[0]) return $u;
        }
        return null;
    }
    throw new Exception("kueri tidak dikenal: $sql");
}
function db_run($conn, $sql, array $params = []) {
    global $DB;
    if (strpos($sql, 'UPDATE users SET google_sub = ?, password = ?') === 0) {
        foreach ($DB['users'] as &$u) {
            if ($u['id'] === $params[2] && $u['google_sub'] === null) {
                $u['google_sub'] = $params[0];
                $u['password'] = $params[1] ? 'rotated' : '';
            }
        }
        unset($u);
        return true;
    }
    if (strpos($sql, 'INSERT INTO users') !== false) {
        [$name, $email, $password, $phone, $sub] = $params;
        $id = 100 + count($DB['users']);
        $DB['users'][] = ['id' => $id, 'name' => $name, 'email' => $email, 'password' => $password ? 'hashed' : '', 'phone' => $phone,
                          'role' => 'customer', 'status' => 'active', 'avatar' => '', 'google_sub' => $sub];
        $conn->insert_id = $id;
        return true;
    }
    throw new Exception("kueri tidak dikenal: $sql");
}
require getenv('GOOGLE_AUTH_PHP');
$in = json_decode(stream_get_contents(STDIN), true);
$outcome = function (callable $fn) {
    try {
        return ['ok' => $fn()];
    } catch (ApiError $e) {
        $error = ['status' => $e->status, 'code' => $e->errorCode, 'message' => $e->getMessage()];
        if ($e->fieldErrors) $error['errors'] = $e->fieldErrors;
        return ['error' => $error];
    }
};
$certs = function ($refresh) use ($in) { return $refresh ? $in['rotated'] : $in['certs']; };
$out = ['tokens' => [], 'picks' => [], 'names' => [], 'plans' => [], 'signups' => [], 'flows' => []];
foreach ($in['tokens'] as $jwt) $out['tokens'][] = $outcome(function () use ($jwt, $in, $certs) { return ga_verify_id_token($jwt, $in['clientId'], $certs, $in['now']); });
foreach ($in['picks'] as [$setting, $env]) $out['picks'][] = ga_pick_client_id($setting, $env);
foreach ($in['names'] as $c) $out['names'][] = ga_display_name($c['claims'], $c['email']);
foreach ($in['plans'] as $c) $out['plans'][] = $outcome(function () use ($c) { return ga_account_plan($c['bySub'], $c['byEmail'], $c['identity']); });
foreach ($in['signups'] as $input) {
    $out['signups'][] = [ga_signup_submitted($input), ga_signup_submitted($input) ? $outcome(function () use ($input, $in) { return ga_signup_fields($input, $in['identity']); }) : null];
}
foreach ($in['flows'] as $c) {
    $DB = ['users' => $in['users'], 'setting' => $c['setting']];
    $conn = new stdClass();
    $result = $outcome(function () use ($conn, $c, $certs) { return ga_customer_google_auth($conn, $c['input'], $certs); });
    $out['flows'][] = ['result' => $result, 'users' => $DB['users']];
}
echo json_encode($out);
`;

type GoogleAuthModule = typeof import('../../backend/modules/google_auth.js');
let mod: GoogleAuthModule;
const node = {
  tokens: [] as Outcome[],
  picks: [] as unknown[],
  names: [] as string[],
  plans: [] as Outcome[],
  signups: [] as [boolean, Outcome | null][],
  flows: [] as { result: Outcome; users: Record<string, unknown>[] }[],
};

async function outcome(fn: () => unknown): Promise<Outcome> {
  try {
    return { ok: await fn() };
  } catch (err) {
    if (!(err instanceof mod.GoogleAuthError)) throw err;
    const error: { status: number; code: string | null; message: string; errors?: unknown } = { status: err.status, code: err.code, message: err.message };
    if (err.errors) error.errors = err.errors;
    return { error };
  }
}

const certs = async (refresh: boolean) => (refresh ? ROTATED_CERTS : CERTS);

beforeAll(async () => {
  // security.js membaca AUTH_SECRET sekali saat di-import; GOOGLE_CLIENT_ID kosong supaya .env lokal (yang mungkin
  // berisi client ID asli) tidak ikut terbaca: kasus "client ID belum diisi" harus 503 seperti di harness PHP
  process.env.AUTH_SECRET ||= crypto.randomBytes(32).toString('hex');
  process.env.GOOGLE_CLIENT_ID = '';
  mod = await import('../../backend/modules/google_auth.js');
  for (const c of TOKEN_CASES) node.tokens.push(await outcome(() => mod.verifyIdToken(c.jwt, CLIENT_ID, certs, NOW)));
  node.picks = PICK_CASES.map(([setting, env]) => mod.pickClientId(setting, env));
  node.names = NAME_CASES.map((c) => mod.displayName(c.claims, c.email));
  for (const c of PLAN_CASES) node.plans.push(await outcome(() => mod.accountPlan(c.bySub, c.byEmail, c.identity)));
  for (const input of SIGNUP_CASES) {
    const submitted = mod.signupSubmitted(input);
    node.signups.push([submitted, submitted ? await outcome(() => mod.signupFields(input, IDENTITY)) : null]);
  }
  for (const [i, c] of FLOW_CASES.entries()) {
    const db: FakeDb = { users: structuredClone(USERS), setting: c.setting };
    // IP berbeda per kasus: batas percobaan Node disimpan di memori modul
    const req = { ip: `198.51.100.${i + 1}` };
    const result = normalize(await outcome(() => mod.customerGoogleAuth(fakePool(db), c.input, req, certs)));
    node.flows.push({ result, users: db.users });
  }
});

const errorOf = (o: Outcome) => ('error' in o ? o.error : null);
const okOf = (o: Outcome) => ('ok' in o ? (o.ok as Record<string, unknown>) : null);

describe('google_auth.js', () => {
  it('ID token yang sah: identitas dirapikan, Google berwenang hanya untuk Gmail dan Workspace', () => {
    const ok = (name: string) => okOf(node.tokens[TOKEN_CASES.findIndex((c) => c.name === name)]);
    expect(ok('Gmail, email huruf besar')).toEqual({ sub: '109876543210987654321', email: 'budi.santoso@gmail.com', name: 'Budi Santoso', authoritative: true });
    expect(ok('iss tanpa https')).toMatchObject({ authoritative: true });
    expect(ok('Google Workspace (hd = domain email)')).toMatchObject({ email: 'sari@perusahaan.co.id', authoritative: true });
    expect(ok('email lain tanpa hd')).toMatchObject({ authoritative: false });
    expect(ok('hd beda dengan domain email')).toMatchObject({ authoritative: false });
    expect(ok('email_verified string "true"')).not.toBeNull();
    expect(ok('kedaluwarsa, masih dalam toleransi')).not.toBeNull();
    expect(ok('kid baru (Google mengganti kunci)')).not.toBeNull();
  });

  it('token palsu, kedaluwarsa, atau untuk aplikasi lain: 401 GOOGLE_TOKEN_INVALID', () => {
    const accepted = new Set([
      'Gmail, email huruf besar', 'iss tanpa https', 'Google Workspace (hd = domain email)', 'email lain tanpa hd',
      'hd beda dengan domain email', 'email_verified string "true"', 'kedaluwarsa, masih dalam toleransi', 'kid baru (Google mengganti kunci)',
    ]);
    const unverified = new Set(['email belum diverifikasi', 'email_verified hilang']);
    TOKEN_CASES.forEach((c, i) => {
      if (accepted.has(c.name)) return;
      const expected = unverified.has(c.name) ? { status: 403, code: 'GOOGLE_EMAIL_UNVERIFIED' } : { status: 401, code: 'GOOGLE_TOKEN_INVALID' };
      expect(errorOf(node.tokens[i]), c.name).toMatchObject(expected);
    });
  });

  it('client ID: setting dulu, lalu env, format salah diabaikan', () => {
    expect(node.picks).toEqual([CLIENT_ID, '42-env.apps.googleusercontent.com', '42-env.apps.googleusercontent.com', CLIENT_ID, null, null, null]);
  });

  it('nama bawaan akun baru', () => {
    expect(node.names).toEqual(['Budi Santoso', 'Budi Santoso', 'Sari', 'a.b', 'x', 'Åsa Ørn Ångström', `${'Ŵ'.repeat(99)}😀`]);
  });

  it('rencana akun: masuk, tautkan, daftar, atau ditolak', () => {
    expect(node.plans.map((o) => okOf(o) ?? errorOf(o)?.code)).toEqual([
      'signup', 'login', 'ACCOUNT_INACTIVE', 'GOOGLE_STAFF_ACCOUNT', 'link', 'link', 'GOOGLE_NEEDS_PASSWORD', 'GOOGLE_OTHER_ACCOUNT',
      'GOOGLE_STAFF_ACCOUNT', 'ACCOUNT_INACTIVE',
    ]);
  });

  it('langkah kedua: nomor WhatsApp wajib, nama bawaan dari Google', () => {
    expect(node.signups.map(([submitted]) => submitted)).toEqual([false, false, true, true, true, true, true, true, true, true, true]);
    expect(okOf(node.signups[3][1]!)).toEqual({ name: 'Budi Santoso', phone: '081234567890' });
    expect(okOf(node.signups[4][1]!)).toEqual({ name: 'Budi Santoso', phone: '081234567890' });
    expect(okOf(node.signups[5][1]!)).toEqual({ name: 'Åsa Ørn', phone: '0215551234' });
    expect(errorOf(node.signups[2][1]!)).toMatchObject({ code: 'VALIDATION', errors: { phone: 'Nomor WhatsApp wajib diisi.' } });
    expect(errorOf(node.signups[7][1]!)?.errors).toEqual({
      name: 'Nama minimal 2 karakter.',
      phone: 'Nomor WhatsApp tidak valid. Gunakan 8-15 digit angka, contoh: 081234567890.',
    });
    expect(errorOf(node.signups[8][1]!)?.errors).toEqual({ phone: 'Nomor WhatsApp tidak valid.' });
  });

  it('alur lengkap: masuk, tautkan, minta nomor, buat akun', () => {
    const flow = (name: string) => node.flows[FLOW_CASES.findIndex((c) => c.name === name)];
    expect(errorOf(flow('client ID belum diisi').result)).toMatchObject({ status: 503, code: 'GOOGLE_NOT_CONFIGURED' });
    expect(errorOf(flow('token rusak').result)).toMatchObject({ status: 401, code: 'GOOGLE_TOKEN_INVALID' });

    const login = okOf(flow('sudah tertaut: masuk').result);
    expect(login).toMatchObject({ account: 'login', token: 'TOKEN', user: { id: 4, email: 'dewi@gmail.com' } });
    expect(login?.user).not.toHaveProperty('password');
    expect(login?.user).not.toHaveProperty('google_sub');

    // Akun lama ditautkan: kata sandinya diganti (pendaftar palsu dengan email korban kehilangan akses)
    const linked = flow('email Gmail terdaftar: ditautkan');
    expect(okOf(linked.result)).toMatchObject({ account: 'linked', user: { id: 2 } });
    expect(okOf(linked.result)?.user).not.toHaveProperty('password');
    expect(linked.users.find((u) => u.id === 2)).toMatchObject({ google_sub: 'sub-rina', password: 'rotated' });

    expect(errorOf(flow('email Yahoo terdaftar: pakai kata sandi').result)).toMatchObject({ status: 409, code: 'GOOGLE_NEEDS_PASSWORD' });
    expect(errorOf(flow('email staf').result)).toMatchObject({ status: 403, code: 'GOOGLE_STAFF_ACCOUNT' });

    const ask = flow('akun baru: minta nomor WhatsApp');
    expect(okOf(ask.result)).toEqual({ signup_required: true, profile: { name: 'Akun Baru', email: 'baru@gmail.com' } });
    expect(ask.users).toHaveLength(USERS.length);
    expect(errorOf(flow('akun baru: nomor tidak sah').result)).toMatchObject({ status: 400, code: 'VALIDATION' });

    const created = flow('akun baru: dibuat');
    expect(okOf(created.result)).toMatchObject({ account: 'created', user: { name: 'Budi Baru', email: 'baru@gmail.com', phone: '081234567890', role: 'customer' } });
    expect(created.users.at(-1)).toMatchObject({ email: 'baru@gmail.com', google_sub: 'sub-baru', password: 'hashed' });
  });
});

describe.skipIf(!PHP_AVAILABLE)('google_auth.php sama dengan google_auth.js', () => {
  let php: typeof node | null = null;
  let stderr = '';
  beforeAll(() => {
    const result = spawnSync('php', ['-d', 'display_errors=stderr', '-r', PHP_HARNESS], {
      input: JSON.stringify({
        clientId: CLIENT_ID,
        now: NOW,
        certs: CERTS,
        rotated: ROTATED_CERTS,
        tokens: TOKEN_CASES.map((c) => c.jwt),
        picks: PICK_CASES,
        names: NAME_CASES,
        plans: PLAN_CASES,
        signups: SIGNUP_CASES,
        identity: IDENTITY,
        users: USERS,
        flows: FLOW_CASES,
      }),
      encoding: 'utf8',
      env: { ...process.env, GOOGLE_AUTH_PHP },
    });
    stderr = result.stderr;
    php = result.status === 0 ? JSON.parse(result.stdout) : null;
  });

  it('PHP berjalan', () => {
    expect(stderr).toBe('');
    expect(php).not.toBeNull();
  });

  it('verifikasi ID token, client ID, nama bawaan', () => {
    TOKEN_CASES.forEach((c, i) => expect(php!.tokens[i], c.name).toEqual(node.tokens[i]));
    expect(php!.picks).toEqual(node.picks);
    expect(php!.names).toEqual(node.names);
  });

  it('rencana akun dan langkah kedua', () => {
    PLAN_CASES.forEach((c, i) => expect(php!.plans[i], c.name).toEqual(node.plans[i]));
    SIGNUP_CASES.forEach((c, i) => expect(php!.signups[i], JSON.stringify(c)).toEqual(node.signups[i]));
  });

  it('alur lengkap customer_google_auth', () => {
    FLOW_CASES.forEach((c, i) => {
      expect(normalize(php!.flows[i].result), c.name).toEqual(node.flows[i].result);
      expect(php!.flows[i].users, `${c.name}: tabel users`).toEqual(node.flows[i].users);
    });
  });
});
