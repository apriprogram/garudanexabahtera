<?php
// Company products (table list_products) for backend/api.php. backend/modules/list_products.js implements the
// same actions for the Node backend: keep both identical (action names, input validation, JSON shapes, HTTP status
// codes, `code` values and the encryption format below).
//
// api.php calls handle_list_product_action() right before its own switch ($action), after the access check
// (authorize_request): get_list_products is public, encrypt_list_products is admin only and the other actions need
// a staff token (admin or user).
// Helpers used from api.php: ApiError, db_run/db_all/db_one, in_str/in_int, env_value, safe_link,
// save_base64_asset, save_base64_files.
//
// `users` holds the login accounts of each client product (JSON array, e.g. [{username, password, keterangan}]).
// It is stored encrypted: "enc:v1:" + base64(iv[12] ‖ ciphertext ‖ tag[16]), AES-256-GCM with the 32-byte key
// LIST_PRODUCTS_KEY (64 hex characters) and LP_USERS_AAD as additional data. Only the staff actions read it; the
// public list selects LP_PUBLIC_COLUMNS and never returns it. Rows saved before encryption (plain JSON) are still
// readable; encrypt_list_products encrypts them in place.
//
// Response shapes: get_list_products → array of rows, get_list_product_detail → one row,
// writes → {success: true, ...}; failure → HTTP 4xx/5xx + {error, code?}.

const LP_PUBLIC_COLUMNS = ['id', 'title', 'description', 'link_button', 'image', 'logo'];
const LP_ENCRYPTED_PREFIX = 'enc:v1:';
const LP_USERS_AAD = 'list_products.users';
const LP_IV_BYTES = 12;
const LP_TAG_BYTES = 16;
// Plain JSON limit: the ciphertext (base64, about 4/3 of this) must fit the TEXT column (65,535 bytes)
const LP_USERS_MAX_BYTES = 32768;
const LP_GET_ACTIONS = ['get_list_products', 'get_list_product_detail'];
const LP_JSON_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
const LP_KEY_MISSING = 'Kunci enkripsi LIST_PRODUCTS_KEY belum diatur di .env server (64 karakter hex, lihat .env.example).';
const LP_DECRYPT_FAILED = 'Data akun produk tidak bisa dibuka: LIST_PRODUCTS_KEY tidak cocok atau data rusak.';

function handle_list_product_action(mysqli $conn, string $action, array $input, ?array $user): bool {
    static $handlers = [
        'get_list_products' => 'lp_get_list_products',             // public
        'get_list_product_detail' => 'lp_get_list_product_detail', // staff: the only read that returns `users`
        'add_list_product' => 'lp_add_list_product',
        'update_list_product' => 'lp_update_list_product',
        'delete_list_product' => 'lp_delete_list_product',
        'update_product_order' => 'lp_update_product_order',
        'encrypt_list_products' => 'lp_encrypt_stored_users',      // admin
    ];
    if (!isset($handlers[$action])) return false;
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST' && !in_array($action, LP_GET_ACTIONS, true)) {
        throw new ApiError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    }
    $data = call_user_func($handlers[$action], $conn, $input, $user);
    echo json_encode($data, LP_JSON_FLAGS | JSON_INVALID_UTF8_SUBSTITUTE);
    return true;
}

// ── Encryption (same bytes as encryptSecret / decryptSecret in list_products.js) ──

// The 32-byte key from LIST_PRODUCTS_KEY, or null when it is missing or not 64 hex characters
function lp_key() {
    $hex = trim((string)env_value('LIST_PRODUCTS_KEY'));
    return preg_match('/^[0-9a-f]{64}$/i', $hex) ? hex2bin($hex) : null;
}

function lp_require_key() {
    $key = lp_key();
    if ($key === null) throw new ApiError(LP_KEY_MISSING, 503, 'NOT_CONFIGURED');
    return $key;
}

function lp_is_encrypted($value) {
    return is_string($value) && strpos($value, LP_ENCRYPTED_PREFIX) === 0;
}

function lp_encrypt($plain, $key) {
    $iv = random_bytes(LP_IV_BYTES);
    $tag = '';
    $ciphertext = openssl_encrypt((string)$plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, LP_USERS_AAD, LP_TAG_BYTES);
    if ($ciphertext === false) throw new RuntimeException('openssl_encrypt aes-256-gcm failed');
    return LP_ENCRYPTED_PREFIX . base64_encode($iv . $ciphertext . $tag);
}

function lp_decrypt($stored, $key) {
    $raw = base64_decode(substr((string)$stored, strlen(LP_ENCRYPTED_PREFIX)), true);
    if ($raw === false || strlen($raw) < LP_IV_BYTES + LP_TAG_BYTES) throw new ApiError(LP_DECRYPT_FAILED, 500, 'DECRYPT_FAILED');
    $iv = substr($raw, 0, LP_IV_BYTES);
    $tag = substr($raw, -LP_TAG_BYTES);
    $ciphertext = (string)substr($raw, LP_IV_BYTES, strlen($raw) - LP_IV_BYTES - LP_TAG_BYTES);
    $plain = openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, LP_USERS_AAD);
    if ($plain === false) throw new ApiError(LP_DECRYPT_FAILED, 500, 'DECRYPT_FAILED');
    return $plain;
}

// Stored `users` → plain JSON for staff. Legacy plain rows are returned as they are.
function lp_read_users($stored) {
    if ($stored === null) return null;
    return lp_is_encrypted($stored) ? lp_decrypt($stored, lp_require_key()) : $stored;
}

// Client `users` (JSON array or its JSON text) → canonical JSON text; 400 when it is not an array
function lp_normalize_users($value) {
    if (is_string($value)) {
        $text = trim($value);
        $list = $text === '' ? [] : json_decode($text);
    } elseif (is_array($value)) {
        // api.php decodes the body with assoc=true; re-decoding keeps JSON objects as objects, so [] ≠ {}
        $list = json_decode((string)json_encode($value, LP_JSON_FLAGS));
    } else {
        $list = null;
    }
    // json_decode() without assoc returns a PHP array only for a JSON array (objects become stdClass)
    if (!is_array($list)) throw new ApiError('Format akun (users) tidak valid: harus berupa JSON array.', 400, 'VALIDATION');
    $json = json_encode($list, LP_JSON_FLAGS);
    if ($json === false) throw new ApiError('Format akun (users) tidak valid: harus berupa JSON array.', 400, 'VALIDATION');
    if (strlen($json) > LP_USERS_MAX_BYTES) throw new ApiError('Data akun terlalu panjang.', 400, 'VALIDATION');
    return $json;
}

// Client `users` → value for the users column (always encrypted; needs LIST_PRODUCTS_KEY)
function lp_encrypt_users($value) {
    return lp_encrypt(lp_normalize_users($value), lp_require_key());
}

// ── Helpers ──

function lp_has(array $input, $key) {
    return isset($input[$key]); // present and not null, like has() in list_products.js
}

// Integer from a decoded JSON value (no $_GET fallback, unlike in_int)
function lp_int($value) {
    return is_numeric($value) ? (int)$value : 0;
}

function lp_validate_texts(array $fields) {
    if (array_key_exists('title', $fields) && $fields['title'] === '') throw new ApiError('Judul produk wajib diisi.', 400, 'VALIDATION');
    if (array_key_exists('title', $fields) && mb_strlen($fields['title'], 'UTF-8') > 255) throw new ApiError('Judul produk maksimal 255 karakter.', 400, 'VALIDATION');
    if (array_key_exists('link_button', $fields) && mb_strlen($fields['link_button'], 'UTF-8') > 500) throw new ApiError('Link maksimal 500 karakter.', 400, 'VALIDATION');
}

// Image upload (public/assets/list-products/); existing paths/URLs are kept, empty stays empty
function lp_save_image($value) {
    return is_string($value) ? save_base64_asset($value, 'list-products') : null;
}

// ── Actions ──

function lp_get_list_products(mysqli $conn, array $input, ?array $user) {
    // position is set by update_product_order (0 = not ordered yet, newest first)
    $rows = db_all($conn, 'SELECT ' . implode(', ', LP_PUBLIC_COLUMNS) . ' FROM list_products ORDER BY position ASC, id DESC');
    $data = [];
    foreach ($rows as $row) {
        // Picked again so a changed query can never leak another column (users, notes, project_files)
        $item = [];
        foreach (LP_PUBLIC_COLUMNS as $column) $item[$column] = $row[$column] ?? null;
        $item['id'] = (int)$item['id'];
        $data[] = $item;
    }
    return $data;
}

function lp_get_list_product_detail(mysqli $conn, array $input, ?array $user) {
    $id = in_int($input, 'id');
    if (!$id) throw new ApiError('id required', 400);
    $row = db_one($conn, 'SELECT * FROM list_products WHERE id = ?', [$id]);
    if (!$row) throw new ApiError('Product not found', 404);
    $row['id'] = (int)$row['id'];
    $row['position'] = (int)($row['position'] ?? 0);
    $row['users'] = lp_read_users($row['users']);
    return $row;
}

function lp_add_list_product(mysqli $conn, array $input, ?array $user) {
    $fields = [
        'title' => trim(in_str($input, 'title')),
        'description' => in_str($input, 'description'),
        'link_button' => safe_link(in_str($input, 'link_button')),
        'notes' => in_str($input, 'notes'),
    ];
    lp_validate_texts($fields);
    // Encrypted before anything is uploaded, so a missing key fails without leaving files behind
    $users = lp_has($input, 'users') ? lp_encrypt_users($input['users']) : null;
    $image = lp_save_image($input['image'] ?? null);
    $logo = lp_save_image($input['logo'] ?? null);
    $projectFiles = json_encode(save_base64_files($input['project_files'] ?? null, 'list-products/documents'), LP_JSON_FLAGS);
    db_run($conn, 'INSERT INTO list_products (title, description, link_button, image, logo, users, project_files, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [$fields['title'], $fields['description'], $fields['link_button'], $image, $logo, $users, $projectFiles, $fields['notes']]);
    return ['success' => true, 'id' => (int)$conn->insert_id];
}

function lp_update_list_product(mysqli $conn, array $input, ?array $user) {
    // Only the fields that were sent are changed, so a logo-only update keeps the rest
    $id = in_int($input, 'id');
    $fields = [];
    foreach (['title', 'description', 'link_button', 'notes'] as $f) {
        if (!lp_has($input, $f)) continue;
        $text = in_str($input, $f);
        $fields[$f] = $f === 'title' ? trim($text) : ($f === 'link_button' ? safe_link($text) : $text);
    }
    lp_validate_texts($fields);
    $sets = [];
    $params = [];
    foreach ($fields as $f => $value) {
        $sets[] = "$f = ?";
        $params[] = $value;
    }
    if (lp_has($input, 'users')) {
        $sets[] = 'users = ?';
        $params[] = lp_encrypt_users($input['users']);
    }
    if (!$id || (!$sets && empty($input['image']) && empty($input['logo']) && !lp_has($input, 'project_files'))) {
        throw new ApiError('Tidak ada data untuk diperbarui', 400);
    }
    foreach (['image', 'logo'] as $f) {
        if (!empty($input[$f])) {
            $sets[] = "$f = ?";
            $params[] = lp_save_image($input[$f]);
        }
    }
    if (lp_has($input, 'project_files')) {
        $sets[] = 'project_files = ?';
        $params[] = json_encode(save_base64_files($input['project_files'], 'list-products/documents'), LP_JSON_FLAGS);
    }
    $params[] = $id;
    db_run($conn, 'UPDATE list_products SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
    return ['success' => true];
}

function lp_delete_list_product(mysqli $conn, array $input, ?array $user) {
    db_run($conn, 'DELETE FROM list_products WHERE id = ?', [in_int($input, 'id')]);
    return ['success' => true];
}

function lp_update_product_order(mysqli $conn, array $input, ?array $user) {
    $order = $input['order'] ?? null;
    if (!is_array($order) || ($order && !array_is_list($order))) throw new ApiError('Order must be an array', 400);
    foreach ($order as $item) {
        if (!is_array($item)) continue;
        db_run($conn, 'UPDATE list_products SET position = ? WHERE id = ?', [lp_int($item['position'] ?? null), lp_int($item['id'] ?? null)]);
    }
    return ['success' => true];
}

// Data migration: encrypts every `users` value that is still plain text. Idempotent (encrypted rows are skipped,
// and only checked for being readable with the current key).
function lp_encrypt_stored_users(mysqli $conn, array $input, ?array $user) {
    $key = lp_require_key();
    $rows = db_all($conn, "SELECT id, users FROM list_products WHERE users IS NOT NULL AND users <> '' ORDER BY id");
    $encrypted = 0;
    $alreadyEncrypted = 0;
    $unreadable = 0;
    foreach ($rows as $row) {
        if (lp_is_encrypted($row['users'])) {
            $alreadyEncrypted++;
            try {
                lp_decrypt($row['users'], $key);
            } catch (ApiError $e) {
                $unreadable++;
            }
            continue;
        }
        $value = lp_encrypt($row['users'], $key);
        if (lp_decrypt($value, $key) !== $row['users']) throw new RuntimeException("list_products {$row['id']}: encryption round trip failed");
        // The guard skips a row that another request encrypted in the meantime
        db_run($conn, "UPDATE list_products SET users = ? WHERE id = ? AND users NOT LIKE 'enc:v1:%'", [$value, (int)$row['id']]);
        if (db_affected_rows() > 0) $encrypted++;
    }
    return ['success' => true, 'encrypted' => $encrypted, 'already_encrypted' => $alreadyEncrypted, 'unreadable' => $unreadable, 'total' => count($rows)];
}
