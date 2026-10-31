<?php
// Chatbot WhatsApp lewat WAHA (WhatsApp HTTP API, https://waha.devlike.pro), permintaan pemilik 2026-10-29
// (docs/platform/WHATSAPP-BOT-SPEC.md). backend/modules/waha.js berisi bagian yang sama untuk server Node: fungsi murni,
// kueri, panggilan WAHA, dan alur webhook harus identik (__tests__/backend/waha.test.ts membandingkan keduanya).
//
// WAHA mengirim event pesan ke aksi publik waha_webhook (POST /api.php?action=waha_webhook) dengan header
// X-Webhook-Hmac = HMAC-SHA512 heksadesimal atas body mentah (kunci = WAHA_HMAC_KEY di .env, sama dengan
// config.webhooks[].hmac.key session WAHA). Webhook:
// - menolak semua permintaan tanpa WAHA_HMAC_KEY (503) dan tanda tangan salah (401; 429 setelah 20 kali per IP);
// - mengabaikan event selain message/message.any, session lain, grup, status, saluran, pesan lebih dari 1 jam, dan
//   pesan ganda (sha256 id pesan di waha_seen: retry WAHA, atau event message + message.any untuk pesan yang sama);
// - menjawab 200 lebih dulu, baru memproses (AI bisa beberapa detik; WAHA tidak perlu menunggu atau mengulang).
// Pesan klien dijawab Nexa AI (penyedia tab Tanya Nexa, nexa.php) lewat POST {WAHA}/api/sendText. Chat dialihkan ke
// admin manusia bila klien meminta (ketik ADMIN, "bicara dengan admin", pesan "butuh bantuan admin" dari widget Nexa di
// situs), AI menjawab [[ADMIN]], AI mati atau gagal, atau batas pesan tercapai: klien diberi tahu, nomor WA admin
// menerima notifikasi (nama, nomor, pesan terakhir, tautan wa.me), dan bot dijeda untuk chat itu (waha_pause_hours,
// bawaan 12 jam). Balasan manual dari nomor bisnis (event message.any, fromMe bukan dari API) juga menjeda bot. Bot aktif
// lagi setelah jeda habis, lewat tombol Selesai di tab admin, atau perintah "SELESAI <nomor>" dari nomor admin.
// Tombol interaktif WhatsApp tidak dipakai: WAHA menandai sendButtons "DEPRECATED - Buttons do not work at the moment".
//
// .env (pengaturan non-rahasia juga bisa diisi admin di tab Tanya Nexa; isian admin menang):
//   WAHA_HMAC_KEY      kunci HMAC webhook. WAJIB; RAHASIA; hanya di .env (tidak pernah di database atau kode)
//   WAHA_URL           alamat WAHA, mis. https://waha.contoh.com
//   WAHA_API_KEY       X-Api-Key WAHA; hanya dikirim ke server WAHA_URL
//   WAHA_SESSION       nama session WAHA, bawaan "default"
//   WAHA_ADMIN_NUMBER  nomor WA admin penerima notifikasi, mis. 6281234567890
//   WAHA_DAILY_LIMIT   jawaban AI per hari untuk semua chat WhatsApp (pengaman biaya), bawaan 500

// Setting admin (hero_settings; TIDAK pernah ikut get_settings publik dan tidak bisa diubah lewat update_settings)
const WAHA_CONFIG_KEYS = ['waha_enabled', 'waha_url', 'waha_api_key', 'waha_session', 'waha_admin_number', 'waha_pause_hours'];
const WAHA_DEFAULT_SESSION = 'default';
const WAHA_SESSION_PATTERN = '/^[A-Za-z0-9_-]{1,64}$/';
// API key WAHA: ASCII tercetak tanpa spasi (WAHA_API_KEY bebas dipilih pemilik server WAHA)
const WAHA_KEY_PATTERN = '/^[\x21-\x7E]{1,300}$/';
const WAHA_URL_MAX = 300;
const WAHA_DEFAULT_PAUSE_HOURS = 12;
const WAHA_MAX_PAUSE_HOURS = 72;
const WAHA_TEXT_MAX = 1000;        // pesan klien yang dipakai (= NEXA_MAX_USER_CHARS)
const WAHA_REPLY_MAX = 4000;       // balasan AI (= NEXA_MAX_ASSISTANT_CHARS)
const WAHA_HISTORY_MAX = 12;       // riwayat untuk AI (= NEXA_MAX_MESSAGES)
const WAHA_NOTICE_RECENT = 3;      // pesan klien terakhir di notifikasi admin
const WAHA_STALE_SECONDS = 3600;   // pesan lebih tua dari ini tidak dijawab (WAHA menyusul setelah putus)
const WAHA_PER_HOUR = 20;          // jawaban AI per chat per jam
const WAHA_PER_DAY = 60;           // jawaban AI per chat per hari
const WAHA_DEFAULT_DAILY_LIMIT = 500;
const WAHA_FORWARD_PER_HOUR = 5;   // pesan lanjutan yang diteruskan ke admin per chat per jam
const WAHA_ADMIN_PER_HOUR = 60;    // notifikasi alih ke admin per jam (semua chat)
const WAHA_BAD_SIGNATURES = 20;    // tanda tangan salah per IP per 15 menit sebelum 429
const WAHA_TIMEOUT = 15;           // detik per panggilan WAHA
const WAHA_SITE_URL = 'https://garudanexa.com';
const WAHA_HANDOFFS_SHOWN = 30;

const WAHA_REASONS = [
    'permintaan' => 'Klien minta bicara dengan admin',
    'website' => 'Klien menekan Hubungi admin di chat Nexa (website)',
    'ai_memutuskan' => 'Nexa AI menilai pertanyaan ini perlu admin',
    'ai_mati' => 'Nexa AI belum aktif (penyedia AI belum diatur)',
    'ai_gagal' => 'Nexa AI gagal menjawab',
    'ai_batas' => 'Batas harian jawaban AI tercapai',
    'batas' => 'Klien mengirim terlalu banyak pesan',
];

const WAHA_TEXT_HANDOFF = 'Terima kasih sudah menghubungi Garuda Nexa. Pesan Anda sudah kami teruskan ke admin, dan admin kami akan segera membalas Anda.';
const WAHA_TEXT_MEDIA = 'Maaf, saya baru bisa membaca pesan teks. Silakan ketik pertanyaan Anda, atau ketik *ADMIN* untuk bicara dengan admin kami.';
const WAHA_TEXT_ADMIN_HINT = 'Ketik *ADMIN* kapan saja untuk bicara dengan admin kami.';
const WAHA_TEXT_TEST = 'Tes bot WhatsApp Garuda Nexa: notifikasi untuk admin sampai di nomor ini.';
const WAHA_MEDIA_LABEL = '(pesan media)';

// Aturan tambahan untuk Nexa AI di WhatsApp (ditempel setelah DATA TERKINI). Path halaman tetap ditulis seperti di
// widget; waha_format_reply mengubahnya menjadi tautan lengkap.
const WAHA_CHANNEL_INSTRUCTIONS = <<<'TXT'
KANAL WHATSAPP
Percakapan ini berlangsung di WhatsApp resmi Garuda Nexa, bukan di jendela chat situs. Aturan tambahan untuk kanal ini:
- Jawab lebih ringkas, paling panjang sekitar 80 kata.
- Pengguna sudah berada di WhatsApp kami: jangan menyarankan menghubungi WhatsApp kami dan jangan menulis tautan wa.me.
- Jangan menulis kode [proyek:...]; cukup sebut nama proyeknya.
- Bila pengguna meminta bicara dengan admin atau manusia, menanyakan status pesanan, pembayaran, atau proyeknya, menyampaikan keluhan, atau butuh keputusan yang hanya bisa diberikan tim, balas HANYA dengan [[ADMIN]] tanpa teks lain: sistem akan meneruskan chat ini ke admin manusia.
- Pengguna bisa mengetik ADMIN kapan saja untuk bicara dengan admin.
TXT;

// Permintaan bicara dengan admin. Satu kata kunci (boleh ditemani kata tolong/dong/please) = perintah ADMIN; sapaan
// seperti "halo admin" tetap dijawab AI. Frasa dicari utuh di teks yang dinormalkan (huruf kecil ASCII + spasi).
const WAHA_ADMIN_WORDS = ['admin', 'cs', 'manusia', 'human', 'operator', 'petugas', 'agent', 'agen'];
const WAHA_POLITE_WORDS = ['dong', 'please', 'pls', 'plis', 'tolong'];
const WAHA_ADMIN_PHRASES = [
    'bicara dengan admin', 'bicara sama admin', 'bicara ke admin', 'ngobrol dengan admin', 'ngobrol sama admin',
    'chat dengan admin', 'chat sama admin', 'hubungi admin', 'hubungkan ke admin', 'hubungkan dengan admin',
    'sambungkan ke admin', 'sambungkan dengan admin', 'minta admin', 'panggil admin', 'mau ke admin', 'butuh admin',
    'perlu admin', 'customer service', 'bicara dengan manusia', 'bicara dengan orang', 'ngobrol dengan manusia',
    'dengan orang asli', 'bukan bot', 'talk to a human', 'talk to human', 'speak to a human', 'speak to human',
    'real person', 'live agent', 'talk to admin', 'contact admin',
];
// Teks awal tombol "Hubungi admin" widget Nexa (NEXA_ADMIN_WA_TEXT di src/components/layout/nexa/adminHandoff.ts)
const WAHA_WEBSITE_PHRASE = 'butuh bantuan admin';
const WAHA_WEBSITE_SOURCE = 'dari chat nexa';

// Path halaman situs yang dijadikan tautan lengkap di balasan (= LINKS di src/components/layout/nexa/replyModel.ts)
const WAHA_SITE_PATHS = '/(^|[^\w\/.])(\/(?:template|harga|pesan-custom|jasa-pembuatan-website|jasa-pembuatan-aplikasi-mobile|tentang|kontak|panduan|syarat-ketentuan|kebijakan-privasi|kebijakan-pengembalian-dana)(?:\/[a-z0-9-]+)*)(?![a-z0-9-])/m';

// ── Kueri (teks sama persis dengan waha.js) ──
const WAHA_Q_CONFIG = "SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN ('waha_enabled', 'waha_url', 'waha_api_key', 'waha_session', 'waha_admin_number', 'waha_pause_hours')";
const WAHA_Q_SEEN = 'INSERT IGNORE INTO waha_seen (message_key) VALUES (?)';
const WAHA_Q_PRUNE = 'DELETE FROM waha_seen WHERE created_at < NOW() - INTERVAL 3 DAY LIMIT 50';
const WAHA_Q_CHAT = 'SELECT chat_id, phone, name, history, handoff_status, paused_until > NOW() AS paused, last_in_at < NOW() - INTERVAL 1 DAY AS stale FROM waha_chats WHERE chat_id = ? LIMIT 1';
const WAHA_Q_CHAT_SAVE = 'INSERT INTO waha_chats (chat_id, phone, name, history, last_message, last_in_at) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE phone = COALESCE(VALUES(phone), phone), name = COALESCE(VALUES(name), name), history = VALUES(history), last_message = VALUES(last_message), last_in_at = VALUES(last_in_at)';
const WAHA_Q_CHAT_TOUCH = 'UPDATE waha_chats SET last_message = ?, last_in_at = NOW(), name = COALESCE(?, name) WHERE chat_id = ?';
const WAHA_Q_CHAT_HANDOFF = "INSERT INTO waha_chats (chat_id, phone, name, history, last_message, last_in_at, paused_until, handoff_status) VALUES (?, ?, ?, ?, ?, NOW(), NOW() + INTERVAL ? HOUR, 'menunggu') ON DUPLICATE KEY UPDATE phone = COALESCE(VALUES(phone), phone), name = COALESCE(VALUES(name), name), history = VALUES(history), last_message = VALUES(last_message), last_in_at = VALUES(last_in_at), paused_until = VALUES(paused_until), handoff_status = 'menunggu'";
const WAHA_Q_HANDOFF_LOG = 'INSERT INTO waha_handoffs (chat_id, phone, name, reason, message, notified) VALUES (?, ?, ?, ?, ?, ?)';
const WAHA_Q_ADMIN_REPLY = "INSERT INTO waha_chats (chat_id, phone, paused_until) VALUES (?, ?, NOW() + INTERVAL ? HOUR) ON DUPLICATE KEY UPDATE paused_until = VALUES(paused_until), handoff_status = IF(handoff_status = 'menunggu', 'ditangani', handoff_status)";
const WAHA_Q_HANDLED = "UPDATE waha_handoffs SET status = 'ditangani', handled_at = NOW() WHERE chat_id = ? AND status = 'menunggu'";
const WAHA_Q_RESUME_CHAT = "UPDATE waha_chats SET paused_until = NULL, handoff_status = IF(handoff_status = '', '', 'selesai') WHERE chat_id = ?";
const WAHA_Q_RESUME_LOG = "UPDATE waha_handoffs SET status = 'selesai', closed_at = NOW() WHERE chat_id = ? AND status <> 'selesai'";
const WAHA_Q_FIND_CHAT = 'SELECT chat_id, phone, name FROM waha_chats WHERE phone = ? OR chat_id = ? OR chat_id = ? ORDER BY updated_at DESC LIMIT 1';
const WAHA_Q_WAITING = "SELECT chat_id, phone, name FROM waha_chats WHERE handoff_status IN ('menunggu', 'ditangani') AND paused_until > NOW() ORDER BY updated_at DESC LIMIT 10";
const WAHA_Q_HANDOFFS = 'SELECT h.id, h.chat_id, h.phone, h.name, h.reason, h.message, h.status, h.notified, h.created_at, h.handled_at, h.closed_at, c.paused_until > NOW() AS paused FROM waha_handoffs h LEFT JOIN waha_chats c ON c.chat_id = h.chat_id ORDER BY h.id DESC LIMIT 30';

// ── Pengaturan ──

/** 4 karakter terakhir API key untuk tab admin ("••••abcd"); '' bila belum ada (= nexa_mask_key). */
function waha_mask_key(string $key): string {
    return $key === '' ? '' : '••••' . mb_substr($key, max(0, mb_strlen($key, 'UTF-8') - 4), 4, 'UTF-8');
}

/**
 * Alamat dasar WAHA, null bila tidak sah: http(s)://host[:port][/path] tanpa garis miring di akhir, tanpa userinfo,
 * query, atau fragmen; skema & host huruf kecil. WAHA biasanya dipasang sendiri (VPS, kadang http://IP:3000), jadi http
 * diterima; API key hanya dikirim ke server alamat ini (lihat waha_config_writes).
 */
function waha_base_url(string $url): ?string {
    $url = trim($url);
    if ($url === '' || strlen($url) > WAHA_URL_MAX) return null;
    if (!preg_match('#^(https?)://([A-Za-z0-9.-]+)(:[0-9]{1,5})?(/[A-Za-z0-9._~%/-]*)?$#i', $url, $m)) return null;
    $host = strtolower($m[2]);
    if (trim($host, '.-') !== $host) return null;
    $port = $m[3] ?? '';
    if ($port !== '' && ((int)substr($port, 1) < 1 || (int)substr($port, 1) > 65535)) return null;
    return strtolower($m[1]) . '://' . $host . $port . rtrim($m[4] ?? '', '/');
}

/** Server (skema://host[:port]) alamat WAHA, '' bila tidak sah/kosong. */
function waha_origin(string $url): string {
    $base = waha_base_url($url);
    return $base !== null && preg_match('#^(https?://[^/]+)#', $base, $m) ? $m[1] : '';
}

/** Nomor WhatsApp berkode negara (angka saja; "0812…" → "62812…"), '' bila bukan 8–15 angka. */
function waha_number(string $raw): string {
    $digits = (string)preg_replace('/\D+/', '', $raw);
    if ($digits === '') return '';
    if ($digits[0] === '0') $digits = '62' . substr($digits, 1);
    return strlen($digits) >= 8 && strlen($digits) <= 15 ? $digits : '';
}

/** Nama session WAHA yang sah, '' bila tidak. */
function waha_session_name(string $raw): string {
    $raw = trim($raw);
    return preg_match(WAHA_SESSION_PATTERN, $raw) ? $raw : '';
}

/** Lama jeda bot setelah alih ke admin (jam, 1–72), bawaan 12. */
function waha_pause_hours($raw): int {
    $raw = trim(is_scalar($raw) ? (string)$raw : '');
    if (!preg_match('/^[0-9]{1,3}$/', $raw)) return WAHA_DEFAULT_PAUSE_HOURS;
    $hours = (int)$raw;
    return $hours >= 1 && $hours <= WAHA_MAX_PAUSE_HOURS ? $hours : WAHA_DEFAULT_PAUSE_HOURS;
}

/** Variabel .env modul ini; kunci HMAC hanya ada/tidak. */
function waha_env(): array {
    return [
        'url' => env_value('WAHA_URL'),
        'key' => env_value('WAHA_API_KEY'),
        'session' => env_value('WAHA_SESSION'),
        'admin' => env_value('WAHA_ADMIN_NUMBER'),
        'hmac' => env_value('WAHA_HMAC_KEY') !== '',
    ];
}

/**
 * Konfigurasi yang dipakai dari setting admin + cadangan .env. API key dari .env hanya dipakai bila alamat yang berlaku
 * ada di server yang sama dengan WAHA_URL, jadi kunci itu tidak pernah terkirim ke alamat lain yang diisi di admin.
 */
function waha_config_resolve(array $rows, array $env): array {
    $envUrl = waha_base_url((string)($env['url'] ?? ''));
    $url = waha_base_url((string)($rows['waha_url'] ?? '')) ?? $envUrl ?? '';
    $dbKey = trim((string)($rows['waha_api_key'] ?? ''));
    $envKey = trim((string)($env['key'] ?? ''));
    $key = $dbKey !== '' ? $dbKey : ($envUrl !== null && $url !== '' && waha_origin($url) === waha_origin($envUrl) ? $envKey : '');
    $session = waha_session_name((string)($rows['waha_session'] ?? ''));
    if ($session === '') $session = waha_session_name((string)($env['session'] ?? ''));
    $admin = waha_number((string)($rows['waha_admin_number'] ?? ''));
    if ($admin === '') $admin = waha_number((string)($env['admin'] ?? ''));
    return [
        'enabled' => ($rows['waha_enabled'] ?? '1') !== '0',
        'url' => $url,
        'key' => $key,
        'session' => $session !== '' ? $session : WAHA_DEFAULT_SESSION,
        'admin' => $admin,
        'pause_hours' => waha_pause_hours($rows['waha_pause_hours'] ?? ''),
    ];
}

/** Konfigurasi untuk tab admin: isian tersimpan, nilai .env sebagai petunjuk (tanpa kunci), dan nilai yang berlaku. */
function waha_config_out(array $rows, array $env): array {
    $cfg = waha_config_resolve($rows, $env);
    return [
        'enabled' => $cfg['enabled'],
        'url' => trim((string)($rows['waha_url'] ?? '')),
        'url_env' => waha_base_url((string)($env['url'] ?? '')) ?? '',
        'session' => trim((string)($rows['waha_session'] ?? '')),
        'session_env' => waha_session_name((string)($env['session'] ?? '')),
        'admin_number' => trim((string)($rows['waha_admin_number'] ?? '')),
        'admin_number_env' => waha_number((string)($env['admin'] ?? '')),
        'pause_hours' => $cfg['pause_hours'],
        'key_masked' => waha_mask_key(trim((string)($rows['waha_api_key'] ?? ''))),
        'key_env' => trim((string)($env['key'] ?? '')) !== '',
        'hmac_env' => !empty($env['hmac']),
        'effective' => [
            'url' => $cfg['url'],
            'session' => $cfg['session'],
            'admin_number' => $cfg['admin'],
            'key' => $cfg['key'] !== '',
        ],
    ];
}

/**
 * Masukan waha_save_config → daftar tulis [setting_key => nilai] + daftar hapus. Teks kosong = hapus (pakai .env),
 * tidak dikirim = biarkan; API key: string = simpan, null = hapus, kosong = biarkan. Tidak sah → 400 VALIDATION.
 * API key tersimpan terikat ke server alamat yang berlaku: alamat pindah server tanpa kunci baru → kunci lama dihapus.
 */
function waha_config_writes(array $input, array $current, array $env): array {
    $writes = ['waha_enabled' => (($input['enabled'] ?? true) === false || ($input['enabled'] ?? '') === '0') ? '0' : '1'];
    $deletes = [];
    $fields = [
        'url' => ['waha_url', 'Alamat WAHA tidak valid: pakai http(s)://alamat-server[:port], mis. https://waha.contoh.com.'],
        'session' => ['waha_session', 'Nama session tidak valid: huruf, angka, - atau _ (maks. 64 karakter).'],
        'admin_number' => ['waha_admin_number', 'Nomor WhatsApp admin tidak valid: 8–15 angka, mis. 6281234567890.'],
    ];
    foreach ($fields as $field => [$key, $message]) {
        if (!array_key_exists($field, $input)) continue;
        if (!is_string($input[$field])) throw new ApiError('Pengaturan WhatsApp tidak valid.', 400, 'VALIDATION');
        $value = trim($input[$field]);
        if ($value === '') {
            $deletes[] = $key;
            continue;
        }
        $clean = $field === 'url' ? waha_base_url($value) : ($field === 'session' ? waha_session_name($value) : waha_number($value));
        if ($clean === null || $clean === '') throw new ApiError($message, 400, 'VALIDATION', [$key => $message]);
        $writes[$key] = $clean;
    }
    if (array_key_exists('pause_hours', $input)) {
        $raw = $input['pause_hours'];
        $hours = is_int($raw) ? $raw : (is_string($raw) && preg_match('/^\s*[0-9]{1,3}\s*$/', $raw) ? (int)trim($raw) : 0);
        if ($hours < 1 || $hours > WAHA_MAX_PAUSE_HOURS) {
            throw new ApiError('Lama jeda bot harus 1–72 jam.', 400, 'VALIDATION', ['waha_pause_hours' => 'Isi 1–72 jam.']);
        }
        $writes['waha_pause_hours'] = (string)$hours;
    }
    if (array_key_exists('key', $input)) {
        $key = $input['key'];
        if ($key === null) {
            $deletes[] = 'waha_api_key';
        } elseif (!is_string($key)) {
            throw new ApiError('API key WAHA tidak valid.', 400, 'VALIDATION');
        } elseif (trim($key) !== '') {
            if (!preg_match(WAHA_KEY_PATTERN, trim($key))) {
                throw new ApiError('API key WAHA tidak valid: tanpa spasi, maks. 300 karakter.', 400, 'VALIDATION', ['waha_api_key' => 'Periksa kembali API key yang ditempel.']);
            }
            $writes['waha_api_key'] = trim($key);
        }
    }
    $envUrl = (string)($env['url'] ?? '');
    $oldUrl = waha_base_url((string)($current['waha_url'] ?? '')) ?? (waha_base_url($envUrl) ?? '');
    $newUrl = array_key_exists('waha_url', $writes) ? $writes['waha_url'] : (in_array('waha_url', $deletes, true) ? (waha_base_url($envUrl) ?? '') : null);
    if ($newUrl !== null && waha_origin($oldUrl) !== '' && waha_origin($newUrl) !== waha_origin($oldUrl)
        && !array_key_exists('waha_api_key', $writes) && !in_array('waha_api_key', $deletes, true)
        && trim((string)($current['waha_api_key'] ?? '')) !== '') {
        $deletes[] = 'waha_api_key';
    }
    return ['writes' => $writes, 'deletes' => $deletes];
}

/** Baris setting waha_* dari database (kunci yang tidak ada tidak ikut). */
function waha_config_rows(mysqli $conn): array {
    $rows = [];
    foreach (db_all($conn, WAHA_Q_CONFIG) as $row) $rows[$row['setting_key']] = (string)$row['setting_value'];
    return $rows;
}

// ── Event webhook (fungsi murni) ──

/** X-Webhook-Hmac sah: HMAC-SHA512 heksadesimal (huruf besar/kecil) atas body mentah; algoritma kosong atau sha512. */
function waha_signature_ok(string $raw, string $given, string $algorithm, string $key): bool {
    if ($key === '') return false;
    $algorithm = strtolower(trim($algorithm));
    if ($algorithm !== '' && $algorithm !== 'sha512') return false;
    $given = strtolower(trim($given));
    if (!preg_match('/^[0-9a-f]{128}$/', $given)) return false;
    return hash_equals(hash_hmac('sha512', $raw, $key), $given);
}

/** Id chat seperti yang dipakai WAHA untuk membalas: huruf kecil, @s.whatsapp.net → @c.us, tanpa nomor perangkat. */
function waha_normalize_chat(string $chatId): string {
    $id = strtolower(trim($chatId));
    $id = (string)preg_replace('/@s\.whatsapp\.net$/', '@c.us', $id);
    return (string)preg_replace('/^([0-9]+):[0-9]+@/', '$1@', $id);
}

/** Jenis chat: 'user' (orang: @c.us atau @lid), 'group', 'status' (status & siaran), 'channel', atau 'other'. */
function waha_chat_kind(string $chatId): string {
    if ($chatId === '' || strlen($chatId) > 100) return 'other';
    if (preg_match('/@g\.us$/', $chatId)) return 'group';
    if (preg_match('/@broadcast$/', $chatId)) return 'status';
    if (preg_match('/@newsletter$/', $chatId)) return 'channel';
    return preg_match('/^[0-9]{5,25}@(c\.us|lid)$/', $chatId) ? 'user' : 'other';
}

/** Nomor telepon dari id chat 628…@c.us; '' untuk @lid (WhatsApp menyembunyikan nomornya). */
function waha_phone_of(string $chatId): string {
    return preg_match('/^([0-9]{6,20})@c\.us$/', $chatId, $m) ? $m[1] : '';
}

/** Angka di depan id chat (nomor, atau ID privasi untuk @lid): dipakai di perintah SELESAI. */
function waha_chat_digits(string $chatId): string {
    return preg_match('/^([0-9]+)@/', $chatId, $m) ? $m[1] : $chatId;
}

/** Potong ke $max code point. */
function waha_clip(string $text, int $max): string {
    return mb_substr($text, 0, $max, 'UTF-8');
}

/** Nama profil WhatsApp pengirim dari _data (WEBJS notifyName, NOWEB pushName, GOWS Info.PushName), maks. 60 karakter. */
function waha_contact_name(array $payload): string {
    $data = is_array($payload['_data'] ?? null) ? $payload['_data'] : [];
    $info = is_array($data['Info'] ?? null) ? $data['Info'] : [];
    foreach ([$data['notifyName'] ?? null, $data['pushName'] ?? null, $info['PushName'] ?? null, $data['PushName'] ?? null] as $value) {
        if (!is_string($value)) continue;
        $name = trim((string)preg_replace('/[\x00-\x1F\x7F]+/', ' ', $value));
        if ($name !== '') return waha_clip($name, 60);
    }
    return '';
}

/**
 * Body webhook → ['message' => …] untuk pesan chat pribadi, atau ['ignore' => alasan]: body, event, session, payload,
 * chat (grup/status/saluran), stale (lebih dari 1 jam). Pesan dari nomor bisnis (fromMe) memakai payload.to sebagai chat.
 */
function waha_parse_event($body, string $session, int $now): array {
    if (!is_array($body)) return ['ignore' => 'body'];
    $event = $body['event'] ?? null;
    if ($event !== 'message' && $event !== 'message.any') return ['ignore' => 'event'];
    if (($body['session'] ?? null) !== $session) return ['ignore' => 'session'];
    $p = $body['payload'] ?? null;
    if (!is_array($p) || !is_string($p['id'] ?? null) || $p['id'] === '' || strlen($p['id']) > 255) return ['ignore' => 'payload'];
    $fromMe = ($p['fromMe'] ?? false) === true;
    $raw = $fromMe ? ($p['to'] ?? null) : ($p['from'] ?? null);
    if (!is_string($raw)) return ['ignore' => 'payload'];
    $chat = waha_normalize_chat($raw);
    if (waha_chat_kind($chat) !== 'user') return ['ignore' => 'chat'];
    $ts = $p['timestamp'] ?? null;
    if ((is_int($ts) || is_float($ts)) && $ts > 0 && $ts < 1e11 && $now - $ts > WAHA_STALE_SECONDS) return ['ignore' => 'stale'];
    return ['message' => [
        'id' => $p['id'],
        'chat' => $chat,
        'phone' => waha_phone_of($chat),
        'from_me' => $fromMe,
        'source' => is_string($p['source'] ?? null) ? $p['source'] : '',
        'text' => waha_clip(trim(is_string($p['body'] ?? null) ? $p['body'] : ''), WAHA_TEXT_MAX),
        'media' => ($p['hasMedia'] ?? false) === true,
        'name' => $fromMe ? '' : waha_contact_name($p),
    ]];
}

/** Teks dinormalkan untuk kata kunci: huruf kecil ASCII, selain a-z0-9 jadi satu spasi. */
function waha_normalize_words(string $text): string {
    return trim((string)preg_replace('/[^a-z0-9]+/', ' ', strtolower($text)));
}

/** Klien meminta admin? 'website' (tombol widget Nexa), 'permintaan', atau '' (dijawab AI). */
function waha_wants_admin(string $text): string {
    $norm = waha_normalize_words($text);
    if ($norm === '') return '';
    $padded = " $norm ";
    if (strpos($padded, ' ' . WAHA_WEBSITE_PHRASE . ' ') !== false) {
        return strpos($padded, ' ' . WAHA_WEBSITE_SOURCE . ' ') !== false ? 'website' : 'permintaan';
    }
    $words = array_values(array_unique(array_diff(explode(' ', $norm), WAHA_POLITE_WORDS)));
    if (count($words) === 1 && in_array($words[0], WAHA_ADMIN_WORDS, true)) return 'permintaan';
    foreach (WAHA_ADMIN_PHRASES as $phrase) {
        if (strpos($padded, " $phrase ") !== false) return 'permintaan';
    }
    return '';
}

/**
 * Jawaban AI → teks WhatsApp: [[ADMIN]] = alih ke admin; **tebal** → *tebal*, judul markdown & kode [proyek:…] dibuang,
 * [teks](url) → teks (url), path halaman situs → tautan lengkap https://garudanexa.com/…, maks. 4000 karakter.
 */
function waha_format_reply(string $text): array {
    if (preg_match('/\[\[\s*admin\s*\]\]/i', $text)) return ['text' => '', 'handoff' => true];
    $s = (string)preg_replace('/[ \t]*(?:[:\x{2013}\x{2014}-][ \t]*)?(?:kode[ \t]*:?[ \t]*)?\[proyek:[a-z0-9-]{1,120}\]/iu', '', $text);
    $s = (string)preg_replace('/\*\*([^*\n]+)\*\*/', '*$1*', $s);
    $s = (string)preg_replace('/^#{1,6}[ \t]+/m', '', $s);
    $s = (string)preg_replace('/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/', '$1 ($2)', $s);
    $s = (string)preg_replace(WAHA_SITE_PATHS, '$1' . WAHA_SITE_URL . '$2', $s);
    $s = trim((string)preg_replace('/\n{3,}/', "\n\n", $s));
    return ['text' => waha_clip($s, WAHA_REPLY_MAX), 'handoff' => false];
}

/**
 * Riwayat untuk Nexa AI: riwayat tersimpan (bila belum basi) + pesan baru, maks. 12 pesan, dimulai giliran user;
 * giliran beruntun dengan peran sama digabung (pesan user maks. 1000 karakter terakhir).
 */
function waha_history_messages($stored, bool $stale, string $text): array {
    $list = [];
    if (!$stale && is_string($stored) && $stored !== '') {
        $decoded = json_decode($stored, true);
        if (is_array($decoded)) {
            foreach ($decoded as $m) {
                if (!is_array($m) || !in_array($m['role'] ?? null, ['user', 'assistant'], true) || !is_string($m['content'] ?? null)) continue;
                if (trim($m['content']) !== '') $list[] = ['role' => $m['role'], 'content' => $m['content']];
            }
        }
    }
    $list[] = ['role' => 'user', 'content' => $text];
    $merged = [];
    foreach ($list as $m) {
        $last = count($merged) - 1;
        if ($last >= 0 && $merged[$last]['role'] === $m['role']) {
            $merged[$last]['content'] .= "\n" . $m['content'];
        } else {
            $merged[] = $m;
        }
    }
    foreach ($merged as &$m) {
        $max = $m['role'] === 'user' ? WAHA_TEXT_MAX : WAHA_REPLY_MAX;
        $length = mb_strlen($m['content'], 'UTF-8');
        if ($length > $max) $m['content'] = mb_substr($m['content'], $length - $max, $max, 'UTF-8');
    }
    unset($m);
    $merged = array_slice($merged, -WAHA_HISTORY_MAX);
    while ($merged && $merged[0]['role'] !== 'user') array_shift($merged);
    return $merged;
}

/** Riwayat yang disimpan: pesan + jawaban, 12 terakhir, JSON (bentuk sama dengan JSON.stringify di waha.js). */
function waha_history_json(array $messages, string $reply): string {
    $list = array_slice(array_merge($messages, [['role' => 'assistant', 'content' => $reply]]), -WAHA_HISTORY_MAX);
    return (string)json_encode($list, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS | JSON_INVALID_UTF8_SUBSTITUTE);
}

/** Pesan klien terakhir (maks. 3, masing-masing 300 karakter) untuk notifikasi admin. */
function waha_recent_messages(array $messages): array {
    $out = [];
    foreach ($messages as $m) {
        if ($m['role'] === 'user') $out[] = waha_clip($m['content'], 300);
    }
    return array_slice($out, -WAHA_NOTICE_RECENT);
}

/** "Budi (+62812…)" / "+62812…" / "Budi (123…)" untuk pesan ke admin. */
function waha_who(string $name, string $phone, string $chatId): string {
    $label = $phone !== '' ? '+' . $phone : waha_chat_digits($chatId);
    return $name !== '' ? "$name ($label)" : $label;
}

/** Kutipan WhatsApp ("> ") untuk teks klien, setiap baris. */
function waha_quote(string $text): string {
    return '> ' . str_replace("\n", "\n> ", $text);
}

/** Notifikasi ke nomor admin saat chat dialihkan. */
function waha_admin_notice(string $name, string $phone, string $chatId, string $reason, array $recent, int $pauseHours): string {
    $id = $phone !== '' ? $phone : waha_chat_digits($chatId);
    $lines = [
        '🔔 *Klien butuh respons admin (human)*',
        'Nama: ' . ($name !== '' ? $name : '-'),
        'Nomor: ' . ($phone !== '' ? '+' . $phone : 'tersembunyi (ID privasi WhatsApp ' . $id . ')'),
        'Alasan: ' . (WAHA_REASONS[$reason] ?? $reason),
    ];
    if ($recent) {
        $lines[] = 'Pesan terakhir:';
        foreach ($recent as $text) $lines[] = waha_quote($text);
    }
    $lines[] = '';
    $lines[] = $phone !== '' ? 'Balas klien: https://wa.me/' . $phone : 'Balas lewat chat WhatsApp bisnis (nomor klien tersembunyi).';
    $lines[] = '';
    $lines[] = 'Bot dijeda untuk chat ini selama ' . $pauseHours . ' jam. Bila sudah selesai, balas *SELESAI ' . $id . '* agar bot aktif lagi.';
    return implode("\n", $lines);
}

/** Pesan lanjutan klien yang masih menunggu admin. */
function waha_forward_notice(string $name, string $phone, string $chatId, string $text): string {
    $out = '💬 Pesan lanjutan dari ' . waha_who($name, $phone, $chatId) . ":\n" . waha_quote(waha_clip($text, 500));
    return $phone !== '' ? $out . "\nBalas klien: https://wa.me/" . $phone : $out;
}

/** Perintah dari nomor admin: "SELESAI" atau "SELESAI <nomor>" (juga "done"); null bila bukan perintah. */
function waha_admin_command(string $text): ?array {
    if (!preg_match('/^\s*(?:selesai|done)(?:[\s:,-]+(\+?[0-9][0-9 .-]{4,30}))?\s*$/i', $text, $m)) return null;
    $number = isset($m[1]) ? (string)preg_replace('/\D+/', '', $m[1]) : '';
    if ($number !== '' && $number[0] === '0') $number = '62' . substr($number, 1);
    return ['number' => $number];
}

/** Daftar chat yang menunggu admin (balasan perintah SELESAI tanpa nomor). */
function waha_waiting_text(array $rows): string {
    $lines = ['Ada ' . count($rows) . ' chat yang menunggu admin:'];
    foreach ($rows as $row) $lines[] = '- ' . waha_who((string)($row['name'] ?? ''), (string)($row['phone'] ?? ''), (string)$row['chat_id']);
    $lines[] = 'Balas *SELESAI <nomor>* untuk mengaktifkan bot lagi di chat itu.';
    return implode("\n", $lines);
}

/** Pesan galat waha_test dari status HTTP WAHA. */
function waha_test_error(int $status): string {
    if ($status === 0) return 'WAHA tidak bisa dihubungi. Periksa alamat WAHA dan pastikan servernya berjalan.';
    if ($status === 401 || $status === 403) return "WAHA menolak API key (HTTP $status). Periksa API key.";
    if ($status === 404) return 'Session atau alamat WAHA tidak ditemukan (HTTP 404). Periksa nama session dan alamat.';
    if ($status === 422) return 'Session WAHA belum siap (HTTP 422): pindai kode QR di dasbor WAHA, lalu coba lagi.';
    return "WAHA menolak pesan uji (HTTP $status).";
}

/** '' → null (kolom NULL). */
function waha_null(string $value): ?string {
    return $value === '' ? null : $value;
}

// ── Panggilan WAHA ──

/** Satu permintaan ke WAHA: [kode HTTP (0 = putus/lewat waktu), JSON respons atau null]. Tidak melempar. */
function waha_http(string $method, string $url, string $apiKey, ?array $body): array {
    $headers = ['Accept: application/json'];
    if ($apiKey !== '') $headers[] = 'X-Api-Key: ' . $apiKey;
    $options = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => WAHA_TIMEOUT,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_FOLLOWLOCATION => false,
    ];
    if ($method === 'POST') {
        $headers[] = 'Content-Type: application/json';
        $options[CURLOPT_POST] = true;
        $options[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    }
    $options[CURLOPT_HTTPHEADER] = $headers;
    $ch = curl_init($url);
    curl_setopt_array($ch, $options);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, is_string($raw) ? json_decode($raw, true) : null];
}

/** Kirim teks lewat POST /api/sendText; true bila WAHA menerima (2xx). */
function waha_send_text(array $cfg, string $chatId, string $text, array $deps): bool {
    [$status] = ($deps['http'])('POST', $cfg['url'] . '/api/sendText', $cfg['key'], ['session' => $cfg['session'], 'chatId' => $chatId, 'text' => $text]);
    if ($status < 200 || $status >= 300) error_log("[waha] sendText HTTP $status");
    return $status >= 200 && $status < 300;
}

/** Balas klien: tandai dibaca dulu (anjuran WAHA agar nomor tidak diblokir), lalu kirim teks. */
function waha_reply(array $cfg, string $chatId, string $text, array $deps): bool {
    ($deps['http'])('POST', $cfg['url'] . '/api/sendSeen', $cfg['key'], ['session' => $cfg['session'], 'chatId' => $chatId]);
    return waha_send_text($cfg, $chatId, $text, $deps);
}

/** Nomor telepon klien @lid lewat GET /api/{session}/lids/{lid}; '' bila tidak diketahui. */
function waha_lid_phone(array $cfg, string $chatId, array $deps): string {
    [$status, $data] = ($deps['http'])('GET', $cfg['url'] . '/api/' . rawurlencode($cfg['session']) . '/lids/' . rawurlencode($chatId), $cfg['key'], null);
    if ($status !== 200 || !is_array($data) || !is_string($data['pn'] ?? null)) return '';
    return waha_phone_of(waha_normalize_chat($data['pn']));
}

/** Jawaban Nexa AI untuk WhatsApp: ['reply'] | ['error'] | ['offline' => true] (tanpa penyedia aktif). */
function waha_ai_reply(mysqli $conn, array $history): array {
    $messages = nexa_clean_messages($history);
    if ($messages === null) return ['error' => 'riwayat chat tidak valid'];
    // Saklar widget (nexa_enabled) hanya untuk situs; WhatsApp punya saklar sendiri (waha_enabled)
    $active = nexa_resolve_provider(nexa_config_rows($conn), env_value('ANTHROPIC_API_KEY'), env_value('GEMINI_API_KEY'));
    if ($active === null) return ['offline' => true];
    return nexa_provider_reply($active, nexa_live_context($conn) . "\n\n" . WAHA_CHANNEL_INSTRUCTIONS, $messages);
}

/** Dependensi produksi (tes menggantinya dengan tiruan). */
function waha_deps(): array {
    return ['http' => 'waha_http', 'ai' => 'waha_ai_reply'];
}

// ── Alur webhook ──

/**
 * Bagian sinkron webhook sebelum jawaban 200: kunci & tanda tangan, pengaturan, event, dedup. ['body' => …,
 * 'job' => null | ['cfg', 'message']]; galat sebagai ApiError (401/429/503).
 */
function waha_webhook(mysqli $conn, string $raw, string $hmac, string $algorithm, int $now): array {
    $key = env_value('WAHA_HMAC_KEY');
    if ($key === '') throw new ApiError('Webhook WhatsApp belum dikonfigurasi.', 503, 'WAHA_OFFLINE');
    if (!waha_signature_ok($raw, $hmac, $algorithm, $key)) {
        // Tanda tangan sah tidak pernah ditahan batas ini, jadi IP yang salah dikenali (proxy) tidak memutus WAHA
        $ipKey = 'waha-sig|' . client_ip();
        $wait = rate_limit_wait($ipKey, WAHA_BAD_SIGNATURES);
        rate_limit_hit($ipKey, 900);
        if ($wait) too_many_attempts($wait);
        throw new ApiError('Tanda tangan webhook tidak valid.', 401, 'WAHA_SIGNATURE');
    }
    $cfg = waha_config_resolve(waha_config_rows($conn), waha_env());
    if (!$cfg['enabled']) return ['body' => ['ignored' => 'disabled'], 'job' => null];
    $event = waha_parse_event(json_decode($raw, true), $cfg['session'], $now);
    if (isset($event['ignore'])) return ['body' => ['ignored' => $event['ignore']], 'job' => null];
    if ($cfg['url'] === '') return ['body' => ['ignored' => 'not_configured'], 'job' => null];
    try {
        db_run($conn, WAHA_Q_SEEN, [hash('sha256', $event['message']['id'])]);
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() === 1146) throw new ApiError('Tabel bot WhatsApp belum ada: jalankan migrasi 054.', 503, 'WAHA_NOT_READY');
        throw $e;
    }
    if (db_affected_rows() === 0) return ['body' => ['ignored' => 'duplicate'], 'job' => null];
    db_run($conn, WAHA_Q_PRUNE);
    return ['body' => ['accepted' => true], 'job' => ['cfg' => $cfg, 'message' => $event['message']]];
}

/** Proses satu pesan (setelah WAHA dijawab). Hasilnya untuk log & tes: ['action' => …]. */
function waha_handle_message(mysqli $conn, array $cfg, array $msg, array $deps): array {
    $chat = $msg['chat'];
    if ($msg['from_me']) {
        // Kiriman bot sendiri (atau sistem lain lewat API) diabaikan; balasan manual admin dari nomor bisnis menjeda bot
        if ($msg['source'] === 'api') return ['action' => 'own'];
        db_run($conn, WAHA_Q_ADMIN_REPLY, [$chat, waha_null($msg['phone']), $cfg['pause_hours']]);
        db_run($conn, WAHA_Q_HANDLED, [$chat]);
        return ['action' => 'admin_reply'];
    }
    if ($cfg['admin'] !== '' && $msg['phone'] === $cfg['admin']) return waha_admin_message($conn, $cfg, $msg, $deps);

    $row = db_one($conn, WAHA_Q_CHAT, [$chat]);
    $label = $msg['text'] !== '' ? $msg['text'] : WAHA_MEDIA_LABEL;
    if ($row !== null && (int)($row['paused'] ?? 0) === 1) {
        // Chat sedang dipegang admin: bot diam; selama admin belum membalas, pesan lanjutan diteruskan ke admin
        db_run($conn, WAHA_Q_CHAT_TOUCH, [$label, waha_null($msg['name']), $chat]);
        $forwarded = false;
        if (($row['handoff_status'] ?? '') === 'menunggu' && $cfg['admin'] !== '') {
            $key = 'waha-fwd|' . $chat;
            if (!rate_limit_wait($key, WAHA_FORWARD_PER_HOUR)) {
                rate_limit_hit($key, 3600);
                $name = $msg['name'] !== '' ? $msg['name'] : (string)($row['name'] ?? '');
                $phone = $msg['phone'] !== '' ? $msg['phone'] : (string)($row['phone'] ?? '');
                $forwarded = waha_send_text($cfg, $cfg['admin'] . '@c.us', waha_forward_notice($name, $phone, $chat, $label), $deps);
            }
        }
        return ['action' => 'paused', 'forwarded' => $forwarded];
    }

    $wants = waha_wants_admin($msg['text']);
    if ($wants !== '') return waha_handoff($conn, $cfg, $msg, $row, $wants, $deps);
    if ($msg['text'] === '') {
        // Foto, stiker, voice note, lokasi: AI hanya membaca teks
        $sent = waha_reply($cfg, $chat, WAHA_TEXT_MEDIA, $deps);
        db_run($conn, WAHA_Q_CHAT_SAVE, [$chat, waha_null($msg['phone']), waha_null($msg['name']), $row['history'] ?? null, $label]);
        return ['action' => 'media', 'sent' => $sent];
    }

    $hourKey = 'waha|' . $chat;
    $dayKey = 'waha-day|' . $chat;
    if (rate_limit_wait($hourKey, WAHA_PER_HOUR) || rate_limit_wait($dayKey, WAHA_PER_DAY)) return waha_handoff($conn, $cfg, $msg, $row, 'batas', $deps);
    $daily = max(1, (int)env_value('WAHA_DAILY_LIMIT', (string)WAHA_DEFAULT_DAILY_LIMIT));
    if (rate_limit_wait('waha|all', $daily)) return waha_handoff($conn, $cfg, $msg, $row, 'ai_batas', $deps);
    rate_limit_hit($hourKey, 3600);
    rate_limit_hit($dayKey, 86400);
    rate_limit_hit('waha|all', 86400);

    $stale = $row !== null && (int)($row['stale'] ?? 0) === 1;
    $messages = waha_history_messages($row['history'] ?? null, $stale, $msg['text']);
    $result = ($deps['ai'])($conn, $messages);
    if (!empty($result['offline'])) return waha_handoff($conn, $cfg, $msg, $row, 'ai_mati', $deps);
    if (!isset($result['reply']) || !is_string($result['reply'])) {
        error_log('[waha] AI: ' . (string)($result['error'] ?? 'tanpa jawaban'));
        return waha_handoff($conn, $cfg, $msg, $row, 'ai_gagal', $deps);
    }
    $reply = waha_format_reply($result['reply']);
    if ($reply['handoff']) return waha_handoff($conn, $cfg, $msg, $row, 'ai_memutuskan', $deps);
    if ($reply['text'] === '') return waha_handoff($conn, $cfg, $msg, $row, 'ai_gagal', $deps);
    // Jawaban pertama satu percakapan memberi tahu cara bicara dengan admin
    $text = count($messages) === 1 ? $reply['text'] . "\n\n" . WAHA_TEXT_ADMIN_HINT : $reply['text'];
    $sent = waha_reply($cfg, $chat, $text, $deps);
    db_run($conn, WAHA_Q_CHAT_SAVE, [$chat, waha_null($msg['phone']), waha_null($msg['name']), waha_history_json($messages, $reply['text']), $label]);
    return ['action' => 'ai', 'sent' => $sent];
}

/** Alihkan chat ke admin: jeda bot, beri tahu klien, notifikasi nomor admin, catat di log. */
function waha_handoff(mysqli $conn, array $cfg, array $msg, ?array $row, string $reason, array $deps): array {
    $chat = $msg['chat'];
    $phone = $msg['phone'] !== '' ? $msg['phone'] : (string)($row['phone'] ?? '');
    if ($phone === '' && substr($chat, -4) === '@lid') $phone = waha_lid_phone($cfg, $chat, $deps);
    $name = $msg['name'] !== '' ? $msg['name'] : (string)($row['name'] ?? '');
    $label = $msg['text'] !== '' ? $msg['text'] : WAHA_MEDIA_LABEL;
    $stale = $row !== null && (int)($row['stale'] ?? 0) === 1;
    $messages = waha_history_messages($row['history'] ?? null, $stale, $label);
    db_run($conn, WAHA_Q_CHAT_HANDOFF, [$chat, waha_null($phone), waha_null($name), waha_history_json($messages, WAHA_TEXT_HANDOFF), $label, $cfg['pause_hours']]);
    $sent = waha_reply($cfg, $chat, WAHA_TEXT_HANDOFF, $deps);
    $notified = false;
    if ($cfg['admin'] !== '' && !rate_limit_wait('waha-admin', WAHA_ADMIN_PER_HOUR)) {
        rate_limit_hit('waha-admin', 3600);
        $notice = waha_admin_notice($name, $phone, $chat, $reason, waha_recent_messages($messages), $cfg['pause_hours']);
        $notified = waha_send_text($cfg, $cfg['admin'] . '@c.us', $notice, $deps);
    }
    db_run($conn, WAHA_Q_HANDOFF_LOG, [$chat, waha_null($phone), waha_null($name), $reason, $label, $notified ? 1 : 0]);
    return ['action' => 'handoff', 'reason' => $reason, 'sent' => $sent, 'notified' => $notified];
}

/** Bot aktif lagi untuk satu chat: jeda dicabut, alih ke admin yang masih terbuka ditutup. */
function waha_resume(mysqli $conn, string $chatId): void {
    db_run($conn, WAHA_Q_RESUME_CHAT, [$chatId]);
    db_run($conn, WAHA_Q_RESUME_LOG, [$chatId]);
}

/** Pesan dari nomor admin: hanya perintah SELESAI yang diproses (selain itu diam, jadi tidak ada balas-balasan bot). */
function waha_admin_message(mysqli $conn, array $cfg, array $msg, array $deps): array {
    $command = waha_admin_command($msg['text']);
    if ($command === null) return ['action' => 'admin_ignored'];
    $number = $command['number'];
    if ($number !== '') {
        $row = db_one($conn, WAHA_Q_FIND_CHAT, [$number, $number . '@c.us', $number . '@lid']);
        if ($row === null) {
            $text = "Tidak ada chat dengan nomor $number.";
        } else {
            waha_resume($conn, (string)$row['chat_id']);
            $text = '✅ Bot aktif lagi untuk ' . waha_who((string)($row['name'] ?? ''), (string)($row['phone'] ?? ''), (string)$row['chat_id']) . '.';
        }
    } else {
        $rows = db_all($conn, WAHA_Q_WAITING);
        if (count($rows) === 1) {
            waha_resume($conn, (string)$rows[0]['chat_id']);
            $text = '✅ Bot aktif lagi untuk ' . waha_who((string)($rows[0]['name'] ?? ''), (string)($rows[0]['phone'] ?? ''), (string)$rows[0]['chat_id']) . '.';
        } else {
            $text = $rows ? waha_waiting_text($rows) : 'Tidak ada chat yang sedang menunggu admin.';
        }
    }
    return ['action' => 'admin_command', 'sent' => waha_send_text($cfg, $msg['chat'], $text, $deps)];
}

// ── Aksi admin (tab Tanya Nexa; hanya admin lewat ADMIN_ACTIONS) ──

/** Satu baris log alih ke admin untuk tab admin. */
function waha_handoff_out(array $r): array {
    return [
        'id' => (int)$r['id'],
        'chat_id' => (string)$r['chat_id'],
        'phone' => (string)($r['phone'] ?? ''),
        'name' => (string)($r['name'] ?? ''),
        'reason' => (string)$r['reason'],
        'reason_label' => WAHA_REASONS[(string)$r['reason']] ?? (string)$r['reason'],
        'message' => (string)($r['message'] ?? ''),
        'status' => (string)$r['status'],
        'notified' => (int)$r['notified'] === 1,
        'paused' => (int)($r['paused'] ?? 0) === 1,
        'created_at' => (string)$r['created_at'],
        'handled_at' => isset($r['handled_at']) ? (string)$r['handled_at'] : null,
        'closed_at' => isset($r['closed_at']) ? (string)$r['closed_at'] : null,
    ];
}

/** Konfigurasi + 30 log alih ke admin terbaru; tables_ready false bila migrasi 054 belum dijalankan. */
function waha_admin_state(mysqli $conn): array {
    $out = ['config' => waha_config_out(waha_config_rows($conn), waha_env()), 'handoffs' => [], 'tables_ready' => true];
    try {
        $rows = db_all($conn, WAHA_Q_HANDOFFS);
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() !== 1146) throw $e;
        $out['tables_ready'] = false;
        return $out;
    }
    $out['handoffs'] = array_map('waha_handoff_out', $rows);
    return $out;
}

function pf_waha_get_config(mysqli $conn, array $input, array $deps): array {
    return waha_admin_state($conn);
}

function pf_waha_save_config(mysqli $conn, array $input, array $deps): array {
    $plan = waha_config_writes($input, waha_config_rows($conn), waha_env());
    foreach ($plan['writes'] as $key => $value) {
        db_run($conn, 'INSERT INTO hero_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)', [$key, $value]);
    }
    foreach ($plan['deletes'] as $key) db_run($conn, 'DELETE FROM hero_settings WHERE setting_key = ?', [$key]);
    return waha_admin_state($conn);
}

/** Kirim pesan uji ke nomor admin dengan pengaturan yang berlaku (memeriksa alamat, API key, session, nomor). */
function pf_waha_test(mysqli $conn, array $input, array $deps): array {
    $cfg = waha_config_resolve(waha_config_rows($conn), waha_env());
    if ($cfg['url'] === '') throw new ApiError('Alamat WAHA belum diisi.', 400, 'VALIDATION');
    if ($cfg['admin'] === '') throw new ApiError('Nomor WhatsApp admin belum diisi.', 400, 'VALIDATION');
    [$status] = ($deps['http'])('POST', $cfg['url'] . '/api/sendText', $cfg['key'], ['session' => $cfg['session'], 'chatId' => $cfg['admin'] . '@c.us', 'text' => WAHA_TEXT_TEST]);
    if ($status < 200 || $status >= 300) throw new ApiError(waha_test_error($status), 502, 'WAHA_SEND_FAILED');
    return ['sent' => true];
}

/** Tombol Selesai di log: bot aktif lagi untuk chat itu. */
function pf_waha_close_handoff(mysqli $conn, array $input, array $deps): array {
    $chat = is_string($input['chat_id'] ?? null) ? trim($input['chat_id']) : '';
    if ($chat === '' || strlen($chat) > 100) throw new ApiError('Chat tidak valid.', 400, 'VALIDATION');
    waha_resume($conn, $chat);
    return waha_admin_state($conn);
}

/** Webhook WAHA: jawab 200 lebih dulu, lalu proses pesannya (LiteSpeed/FPM memutus sambungan lebih awal). */
function waha_webhook_endpoint(mysqli $conn, array $deps): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') throw new ApiError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    $result = waha_webhook($conn, (string)file_get_contents('php://input'), (string)($_SERVER['HTTP_X_WEBHOOK_HMAC'] ?? ''),
        (string)($_SERVER['HTTP_X_WEBHOOK_HMAC_ALGORITHM'] ?? ''), time());
    echo json_encode(['success' => true] + $result['body']);
    if ($result['job'] === null) return;
    ignore_user_abort(true);
    if (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
    } elseif (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    }
    try {
        waha_handle_message($conn, $result['job']['cfg'], $result['job']['message'], $deps);
    } catch (Throwable $e) {
        error_log('[waha] ' . $e);
    }
}

/**
 * Aksi bot WhatsApp: waha_webhook (publik, HMAC) dan waha_get_config / waha_save_config / waha_test /
 * waha_close_handoff (admin). false bila bukan aksi modul ini. $deps hanya untuk tes.
 */
function handle_waha_action(mysqli $conn, string $action, array $input, ?array $user, ?array $deps = null): bool {
    $deps = $deps ?? waha_deps();
    if ($action === 'waha_webhook') {
        waha_webhook_endpoint($conn, $deps);
        return true;
    }
    $handlers = [
        'waha_get_config' => 'pf_waha_get_config',
        'waha_save_config' => 'pf_waha_save_config',
        'waha_test' => 'pf_waha_test',
        'waha_close_handoff' => 'pf_waha_close_handoff',
    ];
    if (!isset($handlers[$action])) return false;
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') throw new ApiError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    // Lapis kedua di belakang ADMIN_ACTIONS (api.php)
    if (($user['role'] ?? '') !== 'admin') throw new ApiError('Akses ditolak: hanya admin.', 403, 'FORBIDDEN');
    echo json_encode(['success' => true] + $handlers[$action]($conn, $input, $deps));
    return true;
}
