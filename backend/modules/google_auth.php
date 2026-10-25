<?php
// Masuk & daftar akun pembeli dengan Google (docs/platform/GOOGLE-LOGIN.md) untuk backend/api.php. Tombol Google Identity
// Services di /masuk dan /daftar memberi browser sebuah ID token (JWT RS256 yang ditandatangani Google); browser
// meneruskannya ke aksi customer_google_auth, dan token itu diverifikasi di sini: tanda tangan dengan sertifikat Google,
// iss, aud = client ID situs ini, exp/iat, dan email_verified. Baru sesudah itu akun dimasukkan, ditautkan, atau dibuat
// (ga_account_plan). backend/modules/google_auth.js implements the same actions for the Node backend: keep both
// identical (action names, input validation, JSON shapes, HTTP status codes and `code` values);
// __tests__/backend/google-auth.test.ts runs both.
//
// Client ID: setting google_client_id (hero_settings) atau env GOOGLE_CLIENT_ID, yang valid
// pertama. Kosong = fitur mati: tombol disembunyikan, customer_google_auth menjawab 503 GOOGLE_NOT_CONFIGURED. Client ID
// bukan rahasia (ikut tampil di halaman). users.google_sub (migration 027) = id akun Google (klaim sub), UNIQUE.
//
// api.php calls handle_google_auth_action() after authorize_request; both actions are in PUBLIC_ACTIONS.
// Helpers used from api.php: ApiError, db_run/db_one, env_value, client_ip, rate_limit_wait/rate_limit_hit,
// too_many_attempts, auth_secret, issue_token.

const GA_CERTS_URL = 'https://www.googleapis.com/oauth2/v1/certs'; // kid => sertifikat X.509 PEM
const GA_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const GA_CLIENT_ID_PATTERN = '/^[0-9]+-[0-9a-z]+\.apps\.googleusercontent\.com$/D';
const GA_EMAIL_PATTERN = '/^[^\x09-\x0D\x20@]+@[^\x09-\x0D\x20@]+\.[^\x09-\x0D\x20@]+$/D';
// Spasi ASCII saja, sama dengan SPACE_RUN di google_auth.js (bukan \s/\v: tanpa /u keduanya ikut menangkap byte 0x85,
// bagian dari huruf UTF-8 seperti "Å")
const GA_SPACE_RUN = '/[\x09-\x0D\x20]+/';
const GA_CLOCK_SKEW = 300;     // detik toleransi selisih jam server dengan Google (exp, iat)
const GA_TOKEN_MAX = 8192;     // panjang ID token yang masih wajar
const GA_FAILURES_MAX = 20;    // verifikasi gagal per IP per 15 menit
const GA_SIGNUPS_MAX = 5;      // akun baru lewat Google per IP per jam (sama dengan customer_register)
// Hanya Gmail, atau Google Workspace (klaim hd = domain email), yang membuat Google berwenang atas email itu. Email lain
// yang cocok dengan akun lama tidak ditautkan otomatis: pemiliknya masuk dengan kata sandi (panduan Google "Using email
// addresses as identifiers").
const GA_GMAIL_DOMAINS = ['gmail.com', 'googlemail.com'];

const GA_MSG_INVALID = 'Verifikasi akun Google gagal. Silakan coba lagi.';
const GA_MSG_UNAVAILABLE = 'Google tidak bisa dihubungi saat ini. Coba lagi sebentar lagi, atau gunakan email dan kata sandi.';

function handle_google_auth_action(mysqli $conn, string $action, array $input): bool {
    if ($action === 'google_auth_config') {
        echo json_encode(['success' => true, 'client_id' => ga_client_id($conn)]);
        return true;
    }
    if ($action !== 'customer_google_auth') return false;
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') throw new ApiError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    echo json_encode(['success' => true] + ga_customer_google_auth($conn, $input));
    return true;
}

// Client ID yang berlaku: setting dulu, lalu env; nilai yang bukan format client ID Google diabaikan
function ga_client_id($conn): ?string {
    $row = db_one($conn, "SELECT setting_value FROM hero_settings WHERE setting_key = 'google_client_id' LIMIT 1");
    return ga_pick_client_id($row['setting_value'] ?? null, env_value('GOOGLE_CLIENT_ID'));
}

function ga_pick_client_id($setting, $env): ?string {
    foreach ([$setting, $env] as $value) {
        $value = is_string($value) ? trim($value) : '';
        if ($value !== '' && preg_match(GA_CLIENT_ID_PATTERN, $value)) return $value;
    }
    return null;
}

// Input: credential (ID token), lalu untuk akun baru name? + phone. Hasil:
// - akun ada / baru ditautkan / baru dibuat: {user, token, expires_at, account: login|linked|created}
// - email belum terdaftar dan phone belum dikirim: {signup_required: true, profile: {name, email}}; belum ada yang dibuat
// $certs: sumber sertifikat (lihat ga_verify_id_token), hanya diganti oleh tes; bawaan = unduh dari Google.
function ga_customer_google_auth($conn, array $input, ?callable $certs = null): array {
    if (!auth_secret()) throw new ApiError('Login belum dikonfigurasi di server.', 503);
    $clientId = ga_client_id($conn);
    if ($clientId === null) throw new ApiError('Masuk dengan Google belum diaktifkan.', 503, 'GOOGLE_NOT_CONFIGURED');
    $ip = client_ip();
    $failKey = "google-auth|$ip";
    $wait = rate_limit_wait($failKey, GA_FAILURES_MAX);
    if ($wait) too_many_attempts($wait);

    try {
        $identity = ga_verify_id_token($input['credential'] ?? null, $clientId, $certs ?? 'ga_google_certs', time());
    } catch (ApiError $e) {
        if ($e->status === 401) rate_limit_hit($failKey, 900);
        throw $e;
    }

    $bySub = db_one($conn, "SELECT * FROM users WHERE google_sub = ? LIMIT 1", [$identity['sub']]);
    $byEmail = $bySub ? null : db_one($conn, "SELECT * FROM users WHERE email = ? LIMIT 1", [$identity['email']]);
    $plan = ga_account_plan($bySub, $byEmail, $identity);
    if ($plan === 'login') return ga_session($bySub, 'login');
    if ($plan === 'link') {
        db_run($conn, "UPDATE users SET google_sub = ? WHERE id = ? AND google_sub IS NULL", [$identity['sub'], (int)$byEmail['id']]);
        return ga_session($byEmail, 'linked');
    }

    if (!ga_signup_submitted($input)) {
        return ['signup_required' => true, 'profile' => ['name' => $identity['name'], 'email' => $identity['email']]];
    }
    $signupKey = "google-register|$ip";
    $wait = rate_limit_wait($signupKey, GA_SIGNUPS_MAX);
    if ($wait) too_many_attempts($wait);
    $fields = ga_signup_fields($input, $identity);
    rate_limit_hit($signupKey, 3600);
    try {
        // Kata sandi acak yang tidak diketahui siapa pun: akun ini masuk lewat Google (atau minta atur ulang ke tim)
        db_run($conn, "INSERT INTO users (name, email, password, phone, role, status, avatar, google_sub)
                       VALUES (?, ?, ?, ?, 'customer', 'active', '', ?)",
            [$fields['name'], $identity['email'], password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT), $fields['phone'], $identity['sub']]);
    } catch (ApiError $e) {
        // db_run: duplikat (1062) = email/google_sub baru saja dipakai permintaan lain (klik ganda); coba masuk lagi
        // akan menemukannya
        if ($e->status === 409) throw new ApiError('Akun ini baru saja dibuat. Silakan coba masuk lagi.', 409, 'GOOGLE_RETRY');
        throw $e;
    }
    $row = db_one($conn, "SELECT * FROM users WHERE id = ? LIMIT 1", [(int)$conn->insert_id]);
    return ga_session($row, 'created');
}

function ga_session(array $row, string $account): array {
    [$token, $expiresAt] = issue_token($row);
    unset($row['password'], $row['google_sub']);
    $row['id'] = (int)$row['id'];
    return ['user' => $row, 'token' => $token, 'expires_at' => $expiresAt, 'account' => $account];
}

// Sertifikat publik Google (kid => PEM), diunduh sekali per request. Tidak disimpan di disk: berkas cache yang bisa
// ditulis pihak lain di hosting bersama sama dengan kunci untuk memalsukan login.
function ga_google_certs(bool $refresh = false): array {
    static $certs = null;
    if ($certs !== null) return $certs;
    $ch = curl_init(GA_CERTS_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    ]);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $data = is_string($body) && $status === 200 ? json_decode($body, true) : null;
    $data = is_array($data) ? array_filter($data, 'is_string') : [];
    if (!$data) {
        error_log('[google_auth] sertifikat Google tidak bisa diunduh (HTTP ' . $status . ')');
        throw new ApiError(GA_MSG_UNAVAILABLE, 503, 'GOOGLE_UNAVAILABLE');
    }
    $certs = $data;
    return $certs;
}

function ga_b64url_decode($value): ?string {
    if (!is_string($value) || !preg_match('/^[A-Za-z0-9_-]*$/D', $value)) return null;
    $bin = base64_decode(strtr($value, '-_', '+/') . str_repeat('=', (4 - strlen($value) % 4) % 4), true);
    return $bin === false ? null : $bin;
}

/**
 * ID token Google → identitas {sub, email (huruf kecil), name, authoritative}. $certs(bool $refresh) memberi kid => PEM
 * (refresh = Google baru saja mengganti kunci). Token rusak/palsu/kedaluwarsa/untuk aplikasi lain: 401
 * GOOGLE_TOKEN_INVALID; email belum diverifikasi Google: 403 GOOGLE_EMAIL_UNVERIFIED.
 */
function ga_verify_id_token($jwt, string $clientId, callable $certs, int $now): array {
    $invalid = new ApiError(GA_MSG_INVALID, 401, 'GOOGLE_TOKEN_INVALID');
    if (!is_string($jwt) || $jwt === '' || strlen($jwt) > GA_TOKEN_MAX) throw $invalid;
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) throw $invalid;
    $header = json_decode((string)ga_b64url_decode($parts[0]), true);
    $signature = ga_b64url_decode($parts[2]);
    if (!is_array($header) || ($header['alg'] ?? null) !== 'RS256' || !is_string($header['kid'] ?? null) || $signature === null) throw $invalid;
    $kid = $header['kid'];
    $keys = $certs(false);
    if (!isset($keys[$kid])) $keys = $certs(true);
    $pem = $keys[$kid] ?? null;
    $key = is_string($pem) ? openssl_pkey_get_public($pem) : false;
    if ($key === false || openssl_verify($parts[0] . '.' . $parts[1], $signature, $key, OPENSSL_ALGO_SHA256) !== 1) throw $invalid;

    $claims = json_decode((string)ga_b64url_decode($parts[1]), true);
    if (!is_array($claims) || !in_array($claims['iss'] ?? null, GA_ISSUERS, true) || ($claims['aud'] ?? null) !== $clientId) throw $invalid;
    $exp = $claims['exp'] ?? null;
    $iat = $claims['iat'] ?? null;
    if (!is_int($exp) || !is_int($iat) || $exp + GA_CLOCK_SKEW < $now || $iat - GA_CLOCK_SKEW > $now) throw $invalid;
    $sub = $claims['sub'] ?? null;
    if (!is_string($sub) || !preg_match('/^[\x21-\x7e]{1,255}$/D', $sub)) throw $invalid;
    $email = is_string($claims['email'] ?? null) ? strtolower(trim($claims['email'])) : '';
    if (strlen($email) > 150 || !preg_match(GA_EMAIL_PATTERN, $email)) throw $invalid;
    $verified = $claims['email_verified'] ?? null;
    if ($verified !== true && $verified !== 'true') {
        throw new ApiError('Email akun Google ini belum terverifikasi. Gunakan akun Google lain atau daftar dengan email.', 403, 'GOOGLE_EMAIL_UNVERIFIED');
    }
    $domain = substr($email, strrpos($email, '@') + 1);
    $hd = is_string($claims['hd'] ?? null) ? strtolower(trim($claims['hd'])) : '';
    return [
        'sub' => $sub,
        'email' => $email,
        'name' => ga_display_name($claims, $email),
        'authoritative' => in_array($domain, GA_GMAIL_DOMAINS, true) || ($hd !== '' && $hd === $domain),
    ];
}

// Nama untuk akun baru: klaim name, lalu given_name + family_name, lalu bagian depan email; maks 100 karakter
function ga_display_name(array $claims, string $email): string {
    $clean = function ($value) {
        return is_string($value) ? trim(preg_replace(GA_SPACE_RUN, ' ', $value), ' ') : '';
    };
    $name = $clean($claims['name'] ?? null);
    if (mb_strlen($name) < 2) $name = $clean($clean($claims['given_name'] ?? null) . ' ' . $clean($claims['family_name'] ?? null));
    if (mb_strlen($name) < 2) $name = substr($email, 0, strrpos($email, '@'));
    return mb_substr($name, 0, 100);
}

/**
 * Akun untuk identitas Google ini: 'login' (sudah tertaut), 'link' (email sama, tautkan sekarang), 'signup' (belum ada).
 * Akun staf tidak bisa masuk lewat Google; email non-Gmail/Workspace tidak ditautkan ke akun lama tanpa kata sandi.
 */
function ga_account_plan(?array $bySub, ?array $byEmail, array $identity): string {
    $user = $bySub ?? $byEmail;
    if ($user === null) return 'signup';
    if (($user['role'] ?? '') !== 'customer') {
        throw new ApiError('Email ini milik akun staf. Masuk lewat halaman login staf dengan email dan kata sandi.', 403, 'GOOGLE_STAFF_ACCOUNT');
    }
    if ($bySub === null) {
        if (($user['google_sub'] ?? null) !== null && $user['google_sub'] !== '') {
            throw new ApiError('Email ini sudah tertaut ke akun Google lain. Masuk dengan email dan kata sandi.', 409, 'GOOGLE_OTHER_ACCOUNT');
        }
        if (empty($identity['authoritative'])) {
            throw new ApiError('Email ini sudah terdaftar. Masuk dengan email dan kata sandi.', 409, 'GOOGLE_NEEDS_PASSWORD');
        }
    }
    if (($user['status'] ?? '') !== 'active') throw new ApiError('Akun Anda belum aktif. Hubungi administrator.', 403, 'ACCOUNT_INACTIVE');
    return $bySub !== null ? 'login' : 'link';
}

// Langkah kedua pendaftaran sudah dikirim (nomor WhatsApp ada di input, walau kosong)
function ga_signup_submitted(array $input): bool {
    return array_key_exists('phone', $input) && $input['phone'] !== null;
}

// Nama (bawaan: nama dari Google) dan nomor WhatsApp akun baru; aturan sama dengan customer_register
function ga_signup_fields(array $input, array $identity): array {
    $errors = [];
    $name = ga_text(array_key_exists('name', $input) ? $input['name'] : $identity['name'], 'Nama', 100, 2, 'name', $errors);
    $phone = ga_text($input['phone'] ?? null, 'Nomor WhatsApp', 30, 0, 'phone', $errors);
    if ($phone !== null) {
        $phone = preg_replace('/[\x09-\x0D\x20().-]+/', '', $phone);
        if (!preg_match('/^\+?[0-9]{8,15}$/D', $phone)) {
            $errors['phone'] = 'Nomor WhatsApp tidak valid. Gunakan 8-15 digit angka, contoh: 081234567890.';
            $phone = null;
        }
    }
    if ($errors) throw new ApiError(reset($errors), 400, 'VALIDATION', $errors);
    return ['name' => $name, 'phone' => $phone];
}

function ga_text($raw, string $label, int $max, int $min, string $key, array &$errors): ?string {
    if (!is_string($raw) && $raw !== null) {
        $errors[$key] = "$label tidak valid.";
        return null;
    }
    $value = trim(preg_replace(GA_SPACE_RUN, ' ', (string)$raw), ' ');
    if ($value === '') {
        $errors[$key] = "$label wajib diisi.";
        return null;
    }
    $length = mb_strlen($value);
    if ($length > $max) $errors[$key] = "$label maksimal $max karakter.";
    elseif ($length < $min) $errors[$key] = "$label minimal $min karakter.";
    return isset($errors[$key]) ? null : $value;
}
