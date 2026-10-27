<?php
// Fitur tambahan berbayar per situs pembeli (docs/platform/SITE-ADDONS-SPEC.md) for backend/api.php. Saat ini satu fitur:
// Berita & Pengumuman (kode posts) untuk template sekolah (SP_POST_TEMPLATE_CODES, site_posts.php). Saat template dibeli
// fitur ini terkunci; pembeli membelinya di /akun/fitur (Midtrans, nomor tagihan GNF-YYYYMMDD-XXXXXX, order id Midtrans
// {addon_number}-{percobaan} seperti perpanjangan GNR-), dan setelah lunas fitur langsung aktif. Tabel site_addon_orders
// (database/migrations/2026-10-27_030_site_addons.sql). JSON shapes = src/types/siteAddons.ts (SiteAddonOrder,
// SiteAddonState, SiteAddonSite, SiteAddonsResponse, SiteAddonFlags).
// backend/modules/site_addons.js implements the same actions for the Node backend: keep both identical (action names,
// input validation, messages, JSON shapes, HTTP status codes and `code` values); __tests__/backend/site-addons.test.ts
// runs both.
//
// api.php calls handle_site_addon_action() after the access check (authorize_request): the customer_* actions and
// dev_simulate_site_addon_payment are in CUSTOMER_ACTIONS, admin_set_site_addon in ADMIN_ACTIONS; the handlers re-check
// the role (pf_require_customer / pf_require_staff). Dipakai juga oleh modul lain:
// - gerbang tulisan: sa_addon_active() / sa_posts_enabled() di site_posts.php (aksi tulisan pembeli & publik) dan
//   templates.php (get_site_public, customer_get_site); backend/site.php punya kueri setaranya sendiri;
// - pembayaran: pf_midtrans_notification (templates.php) meneruskan order id GNF-… ke sa_midtrans_notification();
// - nota & panel admin: sa_invoice_items(), sa_customer_invoice_addon(), sa_order_addons() (templates.php).
// Tabel belum ada (errno 1146, migrasi 030 belum dijalankan) = tidak ada fitur aktif, bacaan tetap jalan; aksi yang
// menulis menjawab 503 ADDONS_NOT_READY, tidak pernah 500.
// Uses from api.php: ApiError, db_run/db_all/db_one/db_affected_rows, in_str/in_int, env_value, rate_limit_wait/
// rate_limit_hit, too_many_attempts; from templates.php: pf_require_customer, pf_require_staff, pf_validate, pf_str,
// pf_num, pf_log, pf_new_order_number, pf_site_select, pf_midtrans_config, pf_midtrans_request, pf_midtrans_expire,
// pf_payment_payload, pf_same_amount, pf_scalar, PF_SNAP_REUSE_HOURS, PF_INVOICE_NOT_AVAILABLE_MESSAGE; from
// site_posts.php: sp_has_posts.

const SA_CODES = ['posts'];
// Nama tampilan per kode fitur = SITE_ADDON_NAME (src/types/siteAddons.ts)
const SA_NAME = ['posts' => 'Berita & Pengumuman'];
const SA_STATUS_LABEL = [
    'menunggu_pembayaran' => 'Menunggu Pembayaran',
    'lunas' => 'Lunas',
    'dibatalkan' => 'Dibatalkan',
];
// Harga sekali bayar: setting hero_settings (publik lewat get_settings, dipakai halaman Harga); kosong, tidak valid, atau
// 0 → bawaan. Sama dengan ADDON_POSTS_PRICE_SETTING / ADDON_POSTS_PRICE_DEFAULT (src/types/siteAddons.ts)
const SA_PRICE_SETTING = ['posts' => 'addon_posts_price'];
const SA_PRICE_DEFAULT = ['posts' => 350000];
const SA_PAYS_PER_HOUR = 20;              // beli / bayar / batal per pengguna per jam
const SA_NO_TABLE = 1146;                 // MySQL ER_NO_SUCH_TABLE
const SA_ORDER_BY = ' ORDER BY a.created_at DESC, a.id DESC';

const SA_NOT_READY_MESSAGE = 'Fitur tambahan belum siap. Coba lagi nanti.';
const SA_NOT_FOUND_MESSAGE = 'Tagihan fitur tidak ditemukan.';
const SA_ADDON_MESSAGE = 'Pilih fitur tambahan yang tersedia.';
const SA_ACTIVE_FLAG_MESSAGE = 'Pilih aktifkan atau nonaktifkan fitur.';
const SA_UNAVAILABLE_MESSAGE = 'Fitur ini hanya untuk template sekolah.';
const SA_ACTIVE_MESSAGE = 'Fitur ini sudah aktif di situs Anda.';
const SA_PENDING_MESSAGE = 'Masih ada tagihan fitur ini yang menunggu pembayaran. Bayar atau batalkan dulu.';
const SA_SITE_SUSPENDED_MESSAGE = 'Situs sedang dinonaktifkan sehingga fitur tambahan tidak bisa dibeli. Hubungi kami.';
const SA_FREE_INVOICE_MESSAGE = 'Fitur ini diaktifkan tanpa biaya sehingga tidak ada nota.';

// Baca boleh lewat GET (query string) maupun POST; aksi lain hanya POST
const SA_GET_ACTIONS = ['customer_get_site_addons'];

function handle_site_addon_action(mysqli $conn, string $action, array $input, ?array $user): bool {
    static $handlers = [
        // pembeli (CUSTOMER_ACTIONS): hanya situs & tagihan miliknya
        'customer_get_site_addons' => 'sa_customer_get_site_addons',
        'customer_buy_site_addon' => 'sa_customer_buy_site_addon',
        'customer_pay_site_addon' => 'sa_customer_pay_site_addon',
        'customer_cancel_site_addon' => 'sa_customer_cancel_site_addon',
        'dev_simulate_site_addon_payment' => 'sa_dev_simulate_site_addon_payment',
        // admin (ADMIN_ACTIONS): aktifkan gratis / nonaktifkan
        'admin_set_site_addon' => 'sa_admin_set_site_addon',
    ];
    if (!isset($handlers[$action])) return false;
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST' && !in_array($action, SA_GET_ACTIONS, true)) {
        throw new ApiError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    }
    try {
        $data = call_user_func($handlers[$action], $conn, $input, $user);
    } catch (mysqli_sql_exception $e) {
        // Migrasi 030 belum dijalankan: jawaban yang jelas, bukan 500
        if (sa_missing_table($e)) throw sa_not_ready();
        throw $e;
    }
    echo json_encode(array_merge(['success' => true], $data), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    return true;
}

// ════════════════════════════════════════════════════════════════════════════
// Gerbang (dipakai site_posts.php dan templates.php)
// ════════════════════════════════════════════════════════════════════════════

/** Situs punya fitur $code yang aktif: baris lunas yang tidak dicabut. Tabel belum ada = tidak aktif. */
function sa_addon_active(mysqli $conn, int $siteId, string $code): bool {
    try {
        return db_one($conn, "SELECT 1 AS active FROM site_addon_orders WHERE site_id = ? AND addon_code = ? AND status = 'lunas'
                              AND revoked_at IS NULL LIMIT 1", [$siteId, $code]) !== null;
    } catch (mysqli_sql_exception $e) {
        if (!sa_missing_table($e)) throw $e;
        return false;
    }
}

/** Tulisan aktif: template situs mampu (template sekolah) dan fitur Berita & Pengumuman aktif. $site: id, template_code. */
function sa_posts_enabled(mysqli $conn, array $site): bool {
    return sp_has_posts((string)$site['template_code']) && sa_addon_active($conn, (int)$site['id'], 'posts');
}

/** SiteAddonFlags untuk get_site_public dan customer_get_site. */
function sa_site_flags(mysqli $conn, array $site): array {
    return ['posts' => sa_posts_enabled($conn, $site)];
}

// ════════════════════════════════════════════════════════════════════════════
// Pembeli (CUSTOMER_ACTIONS; halaman /akun/fitur)
// ════════════════════════════════════════════════════════════════════════════

// Semua situs milik pembeli (status apa pun) dengan keadaan fiturnya, terbaru dulu; site_id = situs itu saja:
// SiteAddonsResponse. Tabel belum ada = semua fitur terkunci, tanpa tagihan.
function sa_customer_get_site_addons(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $one = trim(in_str($input, 'site_id')) !== '';
    $params = [(int)$user['id']];
    if ($one) $params[] = in_int($input, 'site_id');
    $sites = db_all($conn, pf_site_select(false) . " WHERE s.user_id = ?" . ($one ? " AND s.id = ?" : '')
        . " ORDER BY s.activated_at DESC, s.id DESC", $params);
    if ($one && !$sites) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
    $rows = sa_rows_or_empty($conn, sa_select() . " WHERE s.user_id = ?" . ($one ? " AND a.site_id = ?" : '') . SA_ORDER_BY, $params);
    $prices = sa_prices($conn);
    $bySite = [];
    foreach ($rows as $r) $bySite[(int)$r['site_id']][] = $r;
    return [
        'sites' => array_map(function ($s) use ($bySite, $prices) {
            return sa_site_out($s, $bySite[(int)$s['id']] ?? [], $prices, false);
        }, $sites),
        'price' => $prices,
    ];
}

// Tagihan baru untuk satu fitur satu situs: { addon_order, payment_url, payment_error? }. Harga = setting saat ini
// (disimpan di baris). Midtrans belum dikonfigurasi: tagihan tetap dibuat, payment_url null + payment_error.
function sa_customer_buy_site_addon(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    sa_count_pay($user);
    $errors = [];
    $code = sa_code_input($input, $errors);
    pf_validate($errors);
    $site = sa_customer_site($conn, $input, $user);
    if ($site['status'] !== 'active') throw new ApiError(SA_SITE_SUSPENDED_MESSAGE, 409, 'SITE_SUSPENDED');
    if (!sa_capable($code, $site)) throw new ApiError(SA_UNAVAILABLE_MESSAGE, 403, 'ADDON_UNAVAILABLE');
    $siteId = (int)$site['id'];
    sa_assert_can_buy($conn, $siteId, $code);
    $price = sa_price($conn, $code);

    $id = 0;
    for ($try = 0; $try < 5 && !$id; $try++) {
        try {
            db_run($conn, "INSERT INTO site_addon_orders (addon_number, site_id, order_id, user_id, addon_code, price, pending_key, source)
                           VALUES (?, ?, ?, ?, ?, ?, ?, 'beli')", [
                pf_new_order_number('GNF'), $siteId, (int)$site['order_id'], (int)$user['id'], $code, $price, $siteId . ':' . $code,
            ]);
            $id = (int)$conn->insert_id;
        } catch (ApiError $e) {
            if ($e->status !== 409) throw $e;
            sa_assert_can_buy($conn, $siteId, $code); // permintaan bersamaan membuka tagihan lebih dulu (uq_addon_pending)
            if ($try === 4) throw $e; // nomor tagihan bentrok: undi nomor baru
        }
    }
    $row = sa_by_id($conn, $id);
    pf_log($conn, (int)$row['order_id'], 'addon_created', null, null, 'customer', (int)$user['id'],
        sa_label($row) . ' dipesan, menunggu pembayaran.');
    $result = sa_create_snap($conn, $row);
    $out = ['addon_order' => sa_order_out(sa_by_id($conn, $id), false), 'payment_url' => $result['payment_url']];
    if ($result['error'] !== null) $out['payment_error'] = $result['error'];
    return $out;
}

// Halaman bayar Midtrans untuk tagihan yang menunggu pembayaran: { payment_url }. Halaman Snap yang masih berlaku dipakai lagi.
function sa_customer_pay_site_addon(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    sa_count_pay($user);
    $row = sa_customer_row($conn, $input, $user);
    if ($row['status'] !== 'menunggu_pembayaran') throw sa_status_error($row['status']);
    // Kartu yang ditahan untuk tinjauan fraud: membayar lagi membuat transaksi baru (risiko tertagih dua kali)
    if ($row['payment_status'] === 'capture') {
        throw new ApiError('Pembayaran kartu Anda sedang ditinjau bank. Tidak perlu membayar ulang.', 409, 'PAYMENT_UNDER_REVIEW');
    }
    $cfg = pf_midtrans_config();
    if ($cfg['server_key'] === '') throw new ApiError('Pembayaran online belum dikonfigurasi.', 503, 'PAYMENT_NOT_CONFIGURED');
    if ($row['payment_url'] && $row['payment_status'] === 'pending' && $row['payment_age_minutes'] !== null
        && (int)$row['payment_age_minutes'] < PF_SNAP_REUSE_HOURS * 60) {
        return ['payment_url' => $row['payment_url']];
    }
    $result = sa_create_snap($conn, $row);
    if ($result['payment_url'] === null) throw new ApiError($result['error'], 502, 'PAYMENT_GATEWAY_ERROR');
    return ['payment_url' => $result['payment_url']];
}

// Batalkan tagihan yang menunggu pembayaran: { addon_order }. Transaksi Snap yang masih terbuka dikedaluwarsakan.
function sa_customer_cancel_site_addon(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    sa_count_pay($user);
    $row = sa_customer_row($conn, $input, $user);
    $id = (int)$row['id'];
    if (!sa_transition($conn, $id, 'dibatalkan', 'cancelled_at = NOW()')) throw sa_status_error(sa_by_id($conn, $id)['status']);
    pf_log($conn, (int)$row['order_id'], 'addon_cancelled', null, null, 'customer', (int)$user['id'], sa_label($row) . ' dibatalkan.');
    pf_midtrans_expire($row);
    return ['addon_order' => sa_order_out(sa_by_id($conn, $id), false)];
}

// Hasil yang sama dengan settlement Midtrans (uji lokal tanpa Midtrans, MIDTRANS_SIMULATOR=1): { addon_order, site }
function sa_dev_simulate_site_addon_payment(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $cfg = pf_midtrans_config();
    if (!$cfg['simulator']) throw new ApiError('Simulasi pembayaran tidak aktif.', 403, 'SIMULATOR_DISABLED');
    $row = sa_customer_row($conn, $input, $user);
    if ($row['status'] !== 'menunggu_pembayaran') throw sa_status_error($row['status']);
    sa_apply_payment($conn, $row, 'settlement', 'accept', 'simulator', 'customer', (int)$user['id'],
        ['simulated' => true, 'transaction_status' => 'settlement'], true, null, 'simulated');
    $siteId = (int)$row['site_id'];
    $site = db_one($conn, pf_site_select(false) . " WHERE s.id = ? LIMIT 1", [$siteId]);
    if (!$site) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
    return [
        'addon_order' => sa_order_out(sa_by_id($conn, (int)$row['id']), false),
        'site' => sa_site_out($site, db_all($conn, sa_select() . " WHERE a.site_id = ?" . SA_ORDER_BY, [$siteId]), sa_prices($conn), false),
    ];
}

// ════════════════════════════════════════════════════════════════════════════
// Admin (ADMIN_ACTIONS; laci pesanan di panel admin)
// ════════════════════════════════════════════════════════════════════════════

// active=true: aktifkan gratis (baris source admin, harga 0; tagihan yang menunggu dibatalkan dulu). active=false:
// cabut semua baris lunas yang aktif (revoked_at; tanpa refund otomatis). { addons: SiteAddonState[] }
function sa_admin_set_site_addon(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_staff($user);
    $errors = [];
    $code = sa_code_input($input, $errors);
    $active = sa_flag($input['active'] ?? null);
    if ($active === null) $errors['active'] = SA_ACTIVE_FLAG_MESSAGE;
    $note = pf_str($input, 'note', 'Catatan', 255, false, $errors);
    pf_validate($errors);
    $siteId = in_int($input, 'site_id');
    $site = $siteId > 0 ? db_one($conn, pf_site_select(false) . " WHERE s.id = ? LIMIT 1", [$siteId]) : null;
    if (!$site) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
    if (!sa_capable($code, $site)) throw new ApiError(SA_UNAVAILABLE_MESSAGE, 403, 'ADDON_UNAVAILABLE');
    $orderId = (int)$site['order_id'];
    $staffId = (int)$user['id'];
    $suffix = $note !== null ? ' Catatan: ' . $note : '';
    $rows = sa_code_rows(db_all($conn, sa_select() . " WHERE a.site_id = ?" . SA_ORDER_BY, [$siteId]), $code);

    if ($active) {
        $isActive = false;
        foreach ($rows as $r) $isActive = $isActive || ($r['status'] === 'lunas' && $r['revoked_at'] === null);
        if (!$isActive) {
            foreach ($rows as $r) {
                if ($r['status'] !== 'menunggu_pembayaran' || !sa_transition($conn, (int)$r['id'], 'dibatalkan', 'cancelled_at = NOW()')) continue;
                pf_log($conn, $orderId, 'addon_cancelled', null, null, 'staff', $staffId, sa_label($r) . ' dibatalkan karena fitur diaktifkan oleh tim.');
                pf_midtrans_expire($r);
            }
            $id = 0;
            for ($try = 0; $try < 5 && !$id; $try++) {
                try {
                    db_run($conn, "INSERT INTO site_addon_orders (addon_number, site_id, order_id, user_id, addon_code, price, status, source,
                                       payment_status, payment_type, paid_at, granted_by, note)
                                   VALUES (?, ?, ?, ?, ?, 0, 'lunas', 'admin', 'settlement', 'gratis', NOW(), ?, ?)", [
                        pf_new_order_number('GNF'), $siteId, $orderId, (int)$site['user_id'], $code, $staffId, $note ?? '',
                    ]);
                    $id = (int)$conn->insert_id;
                } catch (ApiError $e) {
                    if ($e->status !== 409 || $try === 4) throw $e; // nomor tagihan bentrok: undi nomor baru
                }
            }
            pf_log($conn, $orderId, 'addon_granted', null, null, 'staff', $staffId, sa_label(sa_by_id($conn, $id)) . ' diaktifkan gratis oleh tim.' . $suffix);
        }
    } else {
        foreach ($rows as $r) {
            if ($r['status'] !== 'lunas' || $r['revoked_at'] !== null) continue;
            db_run($conn, "UPDATE site_addon_orders SET revoked_at = NOW() WHERE id = ? AND status = 'lunas' AND revoked_at IS NULL", [(int)$r['id']]);
            if (db_affected_rows() > 0) pf_log($conn, $orderId, 'addon_revoked', null, null, 'staff', $staffId, sa_label($r) . ' dinonaktifkan oleh tim.' . $suffix);
        }
    }
    $rows = db_all($conn, sa_select() . " WHERE a.site_id = ?" . SA_ORDER_BY, [$siteId]);
    return ['addons' => [sa_state($code, $site, $rows, sa_price($conn, $code), true)]];
}

// ════════════════════════════════════════════════════════════════════════════
// Nota & panel admin (dipanggil templates.php); tabel belum ada = tanpa fitur, tidak pernah 500
// ════════════════════════════════════════════════════════════════════════════

/** Item nota (customer_get_invoices) untuk fitur yang lunas dan berbayar milik pembeli. */
function sa_invoice_items(mysqli $conn, int $userId): array {
    $items = [];
    foreach (sa_rows_or_empty($conn, sa_select() . " WHERE o.user_id = ? AND a.status = 'lunas' AND a.price > 0", [$userId]) as $r) {
        $items[] = [
            'type' => 'fitur',
            'invoice_number' => 'INV-' . $r['addon_number'],
            'order_number' => $r['order_number'],
            'renewal_number' => null,
            'addon_number' => $r['addon_number'],
            'title' => 'Fitur ' . sa_name($r['addon_code']),
            'domain' => $r['site_domain'] ?? '',
            'years' => null,
            'amount' => pf_num($r['price']),
            'paid_at' => $r['paid_at'],
            'payment_status' => $r['payment_status'],
            'payment_type' => $r['payment_type'],
            'order_status' => null,
        ];
    }
    return $items;
}

/** Tagihan fitur pesanan ini untuk nota (customer_get_invoice addon_number): hanya lunas dan berbayar; dicabut tetap boleh. */
function sa_customer_invoice_addon(mysqli $conn, array $order, string $number): array {
    $rows = sa_rows_or_empty($conn, sa_select() . " WHERE a.addon_number = ? AND a.order_id = ? LIMIT 1", [$number, (int)$order['id']]);
    if (!$rows) throw sa_not_found();
    $row = $rows[0];
    if ($row['status'] !== 'lunas') throw new ApiError(PF_INVOICE_NOT_AVAILABLE_MESSAGE, 409, 'INVOICE_NOT_AVAILABLE');
    if ((float)$row['price'] <= 0) throw new ApiError(SA_FREE_INVOICE_MESSAGE, 409, 'INVOICE_NOT_AVAILABLE');
    return sa_order_out($row, false);
}

/** admin_get_template_order: keadaan fitur situs pesanan ini (kosong tanpa situs) dan semua tagihannya, terbaru dulu. */
function sa_order_addons(mysqli $conn, ?array $site, int $orderId): array {
    $rows = sa_rows_or_empty($conn, sa_select() . " WHERE a.order_id = ?" . SA_ORDER_BY, [$orderId]);
    $prices = sa_prices($conn);
    return [
        'addons' => $site ? array_map(function ($code) use ($site, $rows, $prices) {
            return sa_state($code, $site, $rows, $prices[$code], true);
        }, SA_CODES) : [],
        'addon_orders' => array_map(function ($r) { return sa_order_out($r, true); }, $rows),
    ];
}

// ════════════════════════════════════════════════════════════════════════════
// Pembayaran (pola perpanjangan: pf_renewal_notification / pf_apply_renewal_payment)
// ════════════════════════════════════════════════════════════════════════════

// Notifikasi Midtrans untuk GNF-… (tanda tangan sudah diperiksa pf_midtrans_notification): jumlah, konfirmasi Status
// API, lalu hasil pembayaran
function sa_midtrans_notification(mysqli $conn, array $cfg, array $input, string $orderId, string $gross): void {
    try {
        $row = db_one($conn, sa_select() . " WHERE a.midtrans_order_id = ? LIMIT 1", [$orderId]);
        if (!$row && preg_match('/^(GNF-\d{8}-[A-Z0-9]{6})-(\d+)$/', $orderId, $m)) {
            $row = db_one($conn, sa_select() . " WHERE a.addon_number = ? AND a.payment_attempt >= ? LIMIT 1", [$m[1], (int)$m[2]]);
        }
    } catch (mysqli_sql_exception $e) {
        if (sa_missing_table($e)) throw sa_not_ready(); // Midtrans mengulang notifikasi yang gagal
        throw $e;
    }
    if (!$row) throw sa_not_found();
    $payload = pf_payment_payload($input);
    if (!pf_same_amount($gross, $row['price'])) {
        pf_log($conn, (int)$row['order_id'], 'addon_payment_update', null, null, 'midtrans', null,
            'Notifikasi ' . sa_lower_label($row) . ' ditolak: jumlah pembayaran (' . $gross . ') tidak sama dengan tagihan.', $payload);
        throw new ApiError('Jumlah pembayaran tidak sesuai.', 400, 'AMOUNT_MISMATCH');
    }
    $tx = pf_scalar($input, 'transaction_status');
    $fraud = pf_scalar($input, 'fraud_status');
    $paymentType = pf_scalar($input, 'payment_type');
    // Konfirmasi lewat Status API; notifikasinya sendiri bertanda tangan, jadi dipakai bila API tidak bisa dihubungi
    $check = pf_midtrans_request('GET', $cfg['api_base'] . '/v2/' . rawurlencode($orderId) . '/status', $cfg['server_key'], null, 10);
    $body = $check['body'];
    if ($check['code'] === 200 && is_array($body) && isset($body['transaction_status']) && (string)($body['order_id'] ?? '') === $orderId) {
        if (isset($body['gross_amount']) && !pf_same_amount((string)$body['gross_amount'], $row['price'])) {
            pf_log($conn, (int)$row['order_id'], 'addon_payment_update', null, null, 'midtrans', null,
                'Status API: jumlah pembayaran ' . sa_lower_label($row) . ' tidak sama dengan tagihan.', pf_payment_payload($body));
            throw new ApiError('Jumlah pembayaran tidak sesuai.', 400, 'AMOUNT_MISMATCH');
        }
        $tx = (string)$body['transaction_status'];
        $fraud = (string)($body['fraud_status'] ?? '');
        $paymentType = (string)($body['payment_type'] ?? $paymentType);
        $payload['confirmed_by_status_api'] = true;
    } else {
        $payload['confirmed_by_status_api'] = false;
        error_log('[midtrans] Status API check failed for ' . $orderId . ': HTTP ' . $check['code'] . ' ' . $check['error']);
    }
    $isCurrent = $row['midtrans_order_id'] === $orderId
        || ($row['midtrans_order_id'] === null && $orderId === $row['addon_number'] . '-' . $row['payment_attempt']);
    sa_apply_payment($conn, $row, $tx, $fraud, $paymentType !== '' ? $paymentType : null, 'midtrans', null, $payload, $isCurrent, $orderId);
}

// Satu tempat untuk setiap hasil pembayaran fitur (notifikasi Midtrans dan dev_simulate_site_addon_payment):
//   settlement / capture+accept -> lunas, fitur langsung aktif (UPDATE bersyarat dari menunggu_pembayaran)
//   deny / cancel / expire / failure -> tagihan TETAP menunggu pembayaran (pembeli bisa bayar ulang); payment_status
//     percobaan saat ini diperbarui
//   capture (ditinjau) -> payment_status capture (customer_pay_site_addon menjawab PAYMENT_UNDER_REVIEW)
//   pending -> tidak berubah; refund* / chargeback -> dicatat saja (fitur tidak dicabut otomatis)
// $paymentOrderId = order id Midtrans notifikasi (null untuk simulator). Kolom pembayaran hanya berubah selama tagihan
// menunggu pembayaran, atau untuk refund/chargeback percobaan yang melunasinya (paid_midtrans_order_id). Bayar setelah
// dibatalkan atau bayar dobel tidak mengaktifkan dua kali: dicatat untuk tim ("perlu refund manual").
function sa_apply_payment(mysqli $conn, array $row, string $tx, string $fraud, ?string $paymentType, string $actorType,
                          ?int $actorId, array $payload, bool $isCurrentAttempt, ?string $paymentOrderId,
                          ?string $storedStatus = null): void {
    $id = (int)$row['id'];
    $orderId = (int)$row['order_id'];
    $tx = strtolower($tx);
    $fraud = strtolower($fraud);
    $paid = $tx === 'settlement' || ($tx === 'capture' && $fraud === 'accept');
    $reversal = strpos($tx, 'refund') !== false || $tx === 'chargeback' || $tx === 'partial_chargeback';
    $payingAttempt = $paymentOrderId !== null && $paymentOrderId === $row['paid_midtrans_order_id'];

    $paymentChanged = false;
    $touch = $row['status'] === 'menunggu_pembayaran'
        ? ($isCurrentAttempt || $paid)
        : ($row['status'] === 'lunas' && $payingAttempt && $reversal);
    if ($touch) {
        $newStatus = $storedStatus ?? ($tx !== '' ? $tx : 'pending');
        $paymentChanged = $row['payment_status'] !== $newStatus || ($paymentType !== null && $row['payment_type'] !== $paymentType);
        if ($paymentChanged) {
            db_run($conn, "UPDATE site_addon_orders SET payment_status = ?, payment_type = COALESCE(?, payment_type) WHERE id = ?",
                [mb_substr($newStatus, 0, 30), $paymentType === null ? null : mb_substr($paymentType, 0, 40), $id]);
        }
    }

    $note = null;
    if ($paid) {
        if (sa_transition($conn, $id, 'lunas', 'paid_at = NOW(), paid_midtrans_order_id = ?', [$paymentOrderId])) {
            pf_log($conn, $orderId, 'addon_paid', null, null, $actorType, $actorId, sa_label($row) . ' lunas. Fitur sudah aktif di situs Anda.', $payload);
            return;
        }
        // Tidak dilunasi notifikasi ini: putuskan dari baris terbaru (batal atau pembayaran lain baru saja menang)
        $fresh = sa_by_id($conn, $id);
        if ($fresh['status'] === 'dibatalkan' && $fresh['paid_at'] === null) {
            $note = 'Pembayaran ' . sa_lower_label($row) . ' diterima, tetapi tagihannya sudah dibatalkan. Perlu ditindaklanjuti manual (refund).';
        } elseif ($fresh['status'] === 'lunas' && $paymentOrderId !== null && $fresh['paid_midtrans_order_id'] !== null
            && $paymentOrderId !== $fresh['paid_midtrans_order_id']) {
            $note = 'Pembayaran ganda ' . sa_lower_label($row) . ' (' . $paymentOrderId . '); sudah lunas lewat ' . $fresh['paid_midtrans_order_id']
                . '. Perlu ditindaklanjuti manual (refund).';
        }
    } elseif ($reversal) {
        $note = 'Refund/chargeback ' . sa_lower_label($row) . ' tercatat (' . $tx . '); fitur tidak dinonaktifkan otomatis.';
    } elseif ($tx === 'capture') {
        $note = 'Pembayaran kartu ' . sa_lower_label($row) . ' menunggu tinjauan fraud (' . ($fraud !== '' ? $fraud : '-') . ').';
    }
    // Notifikasi ganda tidak mengubah apa pun dan tidak dicatat lagi
    if ($paymentChanged || $note !== null) {
        pf_log($conn, $orderId, 'addon_payment_update', null, null, $actorType, $actorId,
            $note ?? ('Status pembayaran ' . sa_lower_label($row) . ': ' . ($tx !== '' ? $tx : '-')), $payload);
    }
}

// Meninggalkan menunggu_pembayaran (hanya dari sana) dan membebaskan slot tagihan terbuka situs ini (pending_key)
function sa_transition(mysqli $conn, int $id, string $to, string $extraSet, array $extraParams = []): bool {
    db_run($conn, "UPDATE site_addon_orders SET status = ?, pending_key = NULL, $extraSet WHERE id = ? AND status = 'menunggu_pembayaran'",
        array_merge([$to], $extraParams, [$id]));
    return db_affected_rows() > 0;
}

// Transaksi Snap baru (percobaan + 1): satu item ADDON-{kode}. ['payment_url' => ?string, 'error' => ?string]
function sa_create_snap(mysqli $conn, array $row): array {
    $cfg = pf_midtrans_config();
    if ($cfg['server_key'] === '') return ['payment_url' => null, 'error' => 'Pembayaran online belum dikonfigurasi.'];
    $id = (int)$row['id'];
    $attempt = (int)$row['payment_attempt'] + 1;
    // Klaim nomor percobaan dulu: order id Midtrans tidak boleh dipakai ulang, juga setelah timeout
    db_run($conn, "UPDATE site_addon_orders SET payment_attempt = ? WHERE id = ? AND payment_attempt = ? AND status = 'menunggu_pembayaran'",
        [$attempt, $id, $attempt - 1]);
    if (db_affected_rows() === 0) return sa_snap_busy($conn, $id);

    $midtransOrderId = $row['addon_number'] . '-' . $attempt;
    $amount = (int)round((float)$row['price']);
    $appUrl = rtrim(env_value('APP_URL', 'http://localhost:5173'), '/');
    $response = pf_midtrans_request('POST', $cfg['snap_url'], $cfg['server_key'], [
        'transaction_details' => ['order_id' => $midtransOrderId, 'gross_amount' => $amount],
        'item_details' => [[
            'id' => 'ADDON-' . $row['addon_code'],
            'price' => $amount,
            'quantity' => 1,
            'name' => mb_substr('Fitur ' . sa_name($row['addon_code']) . ' ' . $row['site_domain'], 0, 50),
        ]],
        'customer_details' => [
            'first_name' => mb_substr((string)$row['user_name'], 0, 50),
            'email' => $row['user_email'],
            'phone' => $row['user_phone'],
        ],
        'callbacks' => ['finish' => $appUrl . '/akun/fitur'],
    ], 20);
    $body = $response['body'];
    if (($response['code'] !== 200 && $response['code'] !== 201) || !is_array($body) || empty($body['token']) || empty($body['redirect_url'])) {
        $detail = is_array($body) && isset($body['error_messages']) ? implode('; ', (array)$body['error_messages']) : $response['error'];
        error_log('[midtrans] Snap transaction failed for ' . $midtransOrderId . ': HTTP ' . $response['code'] . ' ' . $detail);
        pf_log($conn, (int)$row['order_id'], 'addon_payment_update', null, null, 'system', null,
            mb_substr('Gagal membuat transaksi Midtrans ' . sa_lower_label($row) . ' (percobaan ' . $attempt . '): HTTP '
                . $response['code'] . ' ' . $detail, 0, 500));
        return ['payment_url' => null, 'error' => 'Gagal membuat pembayaran online. Silakan coba lagi beberapa saat lagi.'];
    }
    // Hanya selama percobaan ini masih yang terbaru: percobaan lama yang lambat tidak pernah menggantikan yang baru
    db_run($conn, "UPDATE site_addon_orders SET midtrans_order_id = ?, snap_token = ?, payment_url = ?, payment_status = 'pending', payment_type = NULL,
                       payment_created_at = NOW() WHERE id = ? AND status = 'menunggu_pembayaran' AND payment_attempt = ?",
        [$midtransOrderId, (string)$body['token'], (string)$body['redirect_url'], $id, $attempt]);
    if (db_affected_rows() === 0) return sa_snap_busy($conn, $id);
    pf_log($conn, (int)$row['order_id'], 'addon_payment_created', null, null, 'system', null,
        'Tagihan ' . sa_lower_label($row) . ' dibuat (percobaan ' . $attempt . ').');
    return ['payment_url' => (string)$body['redirect_url'], 'error' => null];
}

/** Percobaan lain sedang/baru saja membuat halaman Snap: pakai halamannya bila tagihan masih menunggu pembayaran. */
function sa_snap_busy(mysqli $conn, int $id): array {
    $fresh = sa_by_id($conn, $id);
    if ($fresh['status'] === 'menunggu_pembayaran' && $fresh['payment_url']) return ['payment_url' => $fresh['payment_url'], 'error' => null];
    return ['payment_url' => null, 'error' => 'Pembayaran sedang diproses. Muat ulang halaman lalu coba lagi.'];
}

// ════════════════════════════════════════════════════════════════════════════
// Data, aturan & bentuk JSON (src/types/siteAddons.ts)
// ════════════════════════════════════════════════════════════════════════════

function sa_select(): string {
    return "SELECT a.*, TIMESTAMPDIFF(MINUTE, a.payment_created_at, NOW()) AS payment_age_minutes, o.order_number,
                   s.domain AS site_domain, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
              FROM site_addon_orders a
              JOIN template_orders o ON o.id = a.order_id
              LEFT JOIN template_sites s ON s.id = a.site_id
              LEFT JOIN users u ON u.id = a.user_id";
}

/** db_all yang menganggap tabel site_addon_orders yang belum ada sebagai tanpa baris (bacaan, tidak pernah 500). */
function sa_rows_or_empty(mysqli $conn, string $sql, array $params): array {
    try {
        return db_all($conn, $sql, $params);
    } catch (mysqli_sql_exception $e) {
        if (!sa_missing_table($e)) throw $e;
        return [];
    }
}

function sa_by_id(mysqli $conn, int $id): array {
    $row = db_one($conn, sa_select() . " WHERE a.id = ? LIMIT 1", [$id]);
    if (!$row) throw sa_not_found();
    return $row;
}

// Tagihan orang lain dijawab persis seperti tagihan yang tidak ada
function sa_customer_row(mysqli $conn, array $input, array $user): array {
    $number = strtoupper(trim(in_str($input, 'addon_number')));
    $row = $number === '' ? null : db_one($conn, sa_select() . " WHERE a.addon_number = ? AND o.user_id = ? LIMIT 1", [$number, $user['id']]);
    if (!$row) throw sa_not_found();
    return $row;
}

/** Situs milik pembeli tanpa kolom konten (pf_customer_site membaca konten sampai 512 KB). */
function sa_customer_site(mysqli $conn, array $input, array $user): array {
    $siteId = in_int($input, 'site_id');
    $row = $siteId > 0 ? db_one($conn, pf_site_select(false) . " WHERE s.id = ? AND s.user_id = ? LIMIT 1", [$siteId, $user['id']]) : null;
    if (!$row) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
    return $row;
}

/** Fitur sudah aktif → 409 ADDON_ACTIVE; ada tagihan menunggu pembayaran → 409 ADDON_PENDING. */
function sa_assert_can_buy(mysqli $conn, int $siteId, string $code): void {
    $rows = db_all($conn, "SELECT status FROM site_addon_orders WHERE site_id = ? AND addon_code = ?
                           AND (status = 'menunggu_pembayaran' OR (status = 'lunas' AND revoked_at IS NULL))", [$siteId, $code]);
    foreach ($rows as $r) {
        if ($r['status'] === 'lunas') throw new ApiError(SA_ACTIVE_MESSAGE, 409, 'ADDON_ACTIVE');
    }
    if ($rows) throw new ApiError(SA_PENDING_MESSAGE, 409, 'ADDON_PENDING');
}

/** Batas beli/bayar/batal per pengguna (setiap percobaan dihitung, juga yang gagal). */
function sa_count_pay(array $user): void {
    $key = 'sa-pay|' . (int)$user['id'];
    $wait = rate_limit_wait($key, SA_PAYS_PER_HOUR);
    if ($wait) too_many_attempts($wait);
    rate_limit_hit($key, 3600);
}

/** Kode fitur dari input `addon`; tidak dikenal → $errors['addon'] dan null. */
function sa_code_input(array $input, array &$errors): ?string {
    $code = trim(in_str($input, 'addon'));
    if (in_array($code, SA_CODES, true)) return $code;
    $errors['addon'] = SA_ADDON_MESSAGE;
    return null;
}

/** true / 1 / "1" / "true" → true; false / 0 / "0" / "false" → false; selain itu null. */
function sa_flag($value): ?bool {
    if ($value === true || $value === 1 || $value === '1' || $value === 'true') return true;
    if ($value === false || $value === 0 || $value === '0' || $value === 'false') return false;
    return null;
}

/** Template situs mendukung fitur ini (posts = template sekolah, sp_has_posts). */
function sa_capable(string $code, array $site): bool {
    return $code === 'posts' && sp_has_posts((string)$site['template_code']);
}

/** Harga sekali bayar dari setting; kosong, bukan angka, 0 atau terlalu besar → bawaan. */
function sa_price(mysqli $conn, string $code): int {
    $row = db_one($conn, "SELECT setting_value FROM hero_settings WHERE setting_key = ? LIMIT 1", [SA_PRICE_SETTING[$code]]);
    $raw = trim((string)($row['setting_value'] ?? ''));
    if (!preg_match('/^(\d+)(?:\.(\d)\d*)?$/D', $raw, $m)) return SA_PRICE_DEFAULT[$code];
    // Dibulatkan dari teksnya (digit desimal pertama ≥ 5 → naik), tanpa float, supaya PHP, Node dan frontend sama persis
    $whole = ltrim($m[1], '0');
    if (strlen($whole) > 13) return SA_PRICE_DEFAULT[$code];
    $value = (int)$whole + ((isset($m[2]) && $m[2] >= '5') ? 1 : 0);
    return ($value > 0 && $value <= 1e12) ? $value : SA_PRICE_DEFAULT[$code];
}

/** Harga per kode fitur (SiteAddonsResponse.price). */
function sa_prices(mysqli $conn): array {
    $prices = [];
    foreach (SA_CODES as $code) $prices[$code] = sa_price($conn, $code);
    return $prices;
}

function sa_name($code): string {
    return SA_NAME[$code] ?? (string)$code;
}

/** "Fitur Berita & Pengumuman GNF-…" (awal kalimat catatan riwayat) */
function sa_label(array $row): string {
    return 'Fitur ' . sa_name($row['addon_code']) . ' ' . $row['addon_number'];
}

/** "fitur Berita & Pengumuman GNF-…" (di tengah kalimat) */
function sa_lower_label(array $row): string {
    return 'fitur ' . sa_name($row['addon_code']) . ' ' . $row['addon_number'];
}

function sa_code_rows(array $rows, string $code): array {
    return array_values(array_filter($rows, function ($r) use ($code) { return $r['addon_code'] === $code; }));
}

function sa_missing_table(Throwable $e): bool {
    return $e instanceof mysqli_sql_exception && (int)$e->getCode() === SA_NO_TABLE;
}

function sa_not_ready(): ApiError {
    return new ApiError(SA_NOT_READY_MESSAGE, 503, 'ADDONS_NOT_READY');
}

function sa_not_found(): ApiError {
    return new ApiError(SA_NOT_FOUND_MESSAGE, 404, 'ADDON_NOT_FOUND');
}

function sa_status_error(string $status): ApiError {
    return new ApiError('Tagihan fitur ini berstatus "' . (SA_STATUS_LABEL[$status] ?? $status) . '".', 409, 'INVALID_STATUS');
}

/** SiteAddonOrder dari baris sa_select(). payment_url hanya untuk pemilik dan hanya selama menunggu pembayaran. */
function sa_order_out(array $r, bool $staff): array {
    $status = $r['status'];
    return [
        'addon_number' => $r['addon_number'],
        'site_id' => (int)$r['site_id'],
        'order_number' => $r['order_number'],
        'addon_code' => $r['addon_code'],
        'price' => pf_num($r['price']),
        'status' => $status,
        'status_label' => SA_STATUS_LABEL[$status] ?? $status,
        'source' => $r['source'],
        'payment_status' => $r['payment_status'],
        'payment_type' => $r['payment_type'],
        'payment_url' => (!$staff && $status === 'menunggu_pembayaran') ? $r['payment_url'] : null,
        'paid_at' => $r['paid_at'],
        'cancelled_at' => $r['cancelled_at'],
        'revoked_at' => $r['revoked_at'],
        'created_at' => $r['created_at'],
        // Nota hanya untuk tagihan berbayar yang lunas (hadiah admin / migrasi tanpa nota)
        'invoice_number' => ($status === 'lunas' && (float)$r['price'] > 0) ? 'INV-' . $r['addon_number'] : null,
    ];
}

/**
 * SiteAddonState satu fitur untuk satu situs ($site: baris pf_site_select). $rows = baris sa_select() situs itu, terbaru
 * dulu; $price = harga saat ini. purchase = baris lunas aktif terbaru, pending = tagihan yang menunggu pembayaran.
 */
function sa_state(string $code, array $site, array $rows, int $price, bool $staff): array {
    $purchase = null;
    $pending = null;
    foreach (sa_code_rows($rows, $code) as $r) {
        if ($purchase === null && $r['status'] === 'lunas' && $r['revoked_at'] === null) $purchase = $r;
        if ($pending === null && $r['status'] === 'menunggu_pembayaran') $pending = $r;
    }
    $capable = sa_capable($code, $site);
    $active = $capable && $purchase !== null;
    return [
        'code' => $code,
        'name' => sa_name($code),
        'price' => $price,
        'capable' => $capable,
        'active' => $active,
        'activated_at' => $active ? $purchase['paid_at'] : null,
        'source' => $active ? $purchase['source'] : null,
        'purchase' => $purchase !== null ? sa_order_out($purchase, $staff) : null,
        'pending' => $pending !== null ? sa_order_out($pending, $staff) : null,
    ];
}

/** SiteAddonSite dari baris pf_site_select dan baris sa_select() situs itu. */
function sa_site_out(array $s, array $rows, array $prices, bool $staff): array {
    return [
        'site_id' => (int)$s['id'],
        'domain' => $s['domain'],
        'template_code' => $s['template_code'],
        'template_name' => $s['template_name'],
        'order_number' => $s['order_number'],
        'site_status' => $s['status'],
        'addons' => array_map(function ($code) use ($s, $rows, $prices, $staff) {
            return sa_state($code, $s, $rows, $prices[$code], $staff);
        }, SA_CODES),
    ];
}
