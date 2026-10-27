<?php
// Template marketplace + custom website/mobile app orders (docs/platform/SPEC.md §2–§6) for backend/api.php.
// backend/modules/templates.js implements the same actions for the Node backend: keep both identical
// (action names, input validation, JSON shapes, HTTP status codes and `code` values).
//
// api.php calls handle_platform_action() right before its own switch ($action), after the access check
// (authorize_request), so roles are already enforced; the handlers re-check them as a second line.
// Helpers used from api.php: ApiError, db_run/db_all/db_one, in_str/in_int, env_value, client_ip,
// rate_limit_wait/rate_limit_hit, too_many_attempts, auth_secret, issue_token, parse_upload,
// save_base64_asset, delete_local_asset, db_affected_rows. Paid add-on features (docs/platform/SITE-ADDONS-SPEC.md) live
// in site_addons.php: sa_site_flags (get_site_public, customer_get_site), sa_midtrans_notification (GNF-…),
// sa_invoice_items / sa_customer_invoice_addon (invoices), sa_order_addons (admin_get_template_order); sp_has_posts
// comes from site_posts.php.
//
// Conventions shared with the Node backend:
// - success: HTTP 200 + {success: true, ...data}; failure: HTTP 4xx/5xx + {error, code?, errors?}
//   where `errors` maps a field name to its message (validation, code VALIDATION).
// - dates are 'YYYY-MM-DD HH:MM:SS' strings (database time), money is a JSON number (rupiah).
// - phone numbers are stored without spaces/dashes/dots/brackets; emails and domains lowercase.

const PF_STATUS_LABEL = [
    'menunggu_pembayaran' => 'Menunggu Pembayaran',
    'menunggu_approval' => 'Dibayar (Menunggu Approval)',
    'proses_domain' => 'Disetujui (Proses Domain)',
    'aktif' => 'Aktif',
    'ditolak' => 'Ditolak',
    'dibatalkan' => 'Dibatalkan',
];
const PF_DOMAIN_PATTERN = '/^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/D';
const PF_SLUG_PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';
// Slugs no template may use because the public page /template/{slug} belongs to something else:
// /template/kategori/{category} are the category pages (docs/platform/SEO-PLAN.md §2). Same list in templates.js.
const PF_RESERVED_SLUGS = ['kategori'];
const PF_TEMPLATE_CODE_PATTERN = '/^[a-z0-9][a-z0-9-]{1,59}$/';
const PF_CONTENT_MAX_BYTES = 524288;      // site content JSON after images became paths (512 KB)
const PF_SITE_IMAGE_MAX_BYTES = 2097152;  // one image inside site content (2 MB)
const PF_SITE_IMAGE_MAX_COUNT = 30;       // new images in one save
const PF_SITE_IMAGE_EXTS = ['png', 'jpg', 'webp', 'gif']; // customer CMS images: raster only, never SVG
const PF_MAX_PENDING_ORDERS = 5;          // unpaid orders one customer may have at the same time
const PF_FIRST_ORDER_DISCOUNT_PERCENT = 20; // automatic discount on an account's first template order (owner 2026-10-23)
const PF_FIRST_ORDER_DISCOUNT_CODE = 'PERTAMA20';
const PF_LIKES_PER_HOUR = 60;             // like / unlike clicks per IP (kartu template, owner 2026-10-23)
const PF_VIEWS_PER_HOUR = 300;            // counted template views per IP
// Jumlah terjual per template (kartu katalog, owner 2026-10-24): pesanan yang sudah dibayar dan tidak dibatalkan/ditolak,
// definisi yang sama dengan pendapatan template di dasbor admin. Same SQL in templates.js.
const PF_SOLD_COUNT_SQL = "(SELECT COUNT(*) FROM template_orders o WHERE o.template_id = templates.id AND o.paid_at IS NOT NULL
    AND o.status IN ('menunggu_approval', 'proses_domain', 'aktif')) AS sold_count";
const PF_SNAP_REUSE_HOURS = 23;           // a Snap token lives 24 hours
// Masa aktif & perpanjangan (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §5). Same values in templates.js and
// src/lib/domainPricing.ts.
const PF_RENEWAL_STATUS_LABEL = [
    'menunggu_pembayaran' => 'Menunggu Pembayaran',
    'lunas' => 'Lunas',
    'dibatalkan' => 'Dibatalkan',
];
const PF_RENEWAL_YEARS = [1, 2, 3];
// Log events whose note the customer sees (pf_logs); renewal and add-on notes are written by the server only (add-on:
// docs/platform/SITE-ADDONS-SPEC.md §4.1; addon_granted / addon_revoked may carry a staff note, so they stay internal)
const PF_CUSTOMER_NOTE_EVENTS = ['rejected', 'renewal_created', 'renewal_paid', 'renewal_cancelled', 'addon_created', 'addon_paid',
    'addon_cancelled'];
const PF_RENEWAL_MAX_YEARS_AHEAD = 10;      // a period never ends more than 10 years from now (registry limit)
const PF_HOSTING_RENEWAL_DEFAULT = 500000;  // hosting & jasa per year when setting template_hosting_renewal_price is unset
const PF_DOMAIN_CHECKS = 40;                // customer_check_domain calls per account per window
const PF_DOMAIN_ORDER_CHECKS = 20;          // availability checks inside customer_create_order per account per window
const PF_DOMAIN_CHECK_WINDOW = 600;         // seconds
const PF_AVATAR_MAX_BYTES = 2097152;        // profile photo (2 MB), raster only
const PF_AVATAR_EXTS = ['png', 'jpg', 'webp'];
const PF_MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const PF_GENERATED_ASSET = '/_[0-9a-f]{12}\.[a-z0-9]+$/'; // names made by save_base64_asset (never seed files)

// Reads may use GET (query string) as well as POST; every other platform action is POST only
const PF_GET_ACTIONS = [
    'get_templates', 'get_template', 'get_public_projects', 'get_site_public', 'get_payment_config', 'get_showcase_stats',
    'get_domain_prices',
    'customer_get_orders', 'customer_get_order', 'customer_get_site', 'customer_get_order_quote',
    'customer_check_domain', 'customer_get_invoice', 'customer_get_invoices', 'customer_get_profile',
    'admin_get_template_orders', 'admin_get_template_order', 'admin_get_templates', 'admin_get_active_sites',
    'admin_dashboard_summary', 'admin_get_domain_pricing',
];

function handle_platform_action(mysqli $conn, string $action, array $input, ?array $user): bool {
    static $handlers = [
        // public
        'get_templates' => 'pf_get_templates',
        'get_template' => 'pf_get_template',
        'get_public_projects' => 'pf_get_public_projects',
        'get_site_public' => 'pf_get_site_public',
        'submit_custom_order' => 'pf_submit_custom_order',
        'customer_register' => 'pf_customer_register',
        'midtrans_notification' => 'pf_midtrans_notification',
        'get_payment_config' => 'pf_get_payment_config',
        'get_domain_prices' => 'pf_get_domain_prices',
        'template_like' => 'pf_template_like',
        'template_view' => 'pf_template_view',
        'get_showcase_stats' => 'pf_get_showcase_stats',
        'showcase_like' => 'pf_showcase_like',
        'showcase_view' => 'pf_showcase_view',
        'nexa_chat' => 'pf_nexa_chat', // backend/modules/nexa.php
        // admin: tab "Tanya Nexa" (kunci API Claude/Gemini; hanya admin lewat ADMIN_ACTIONS)
        'nexa_get_config' => 'pf_nexa_get_config',
        'nexa_save_config' => 'pf_nexa_save_config',
        // customer (own data only)
        'customer_create_order' => 'pf_customer_create_order',
        'customer_get_order_quote' => 'pf_customer_get_order_quote',
        'customer_pay_order' => 'pf_customer_pay_order',
        'customer_get_orders' => 'pf_customer_get_orders',
        'customer_get_order' => 'pf_customer_get_order',
        'customer_cancel_order' => 'pf_customer_cancel_order',
        'customer_get_site' => 'pf_customer_get_site',
        'customer_save_site_content' => 'pf_customer_save_site_content',
        'dev_simulate_payment' => 'pf_dev_simulate_payment',
        'customer_check_domain' => 'pf_customer_check_domain',
        'customer_create_renewal' => 'pf_customer_create_renewal',
        'customer_pay_renewal' => 'pf_customer_pay_renewal',
        'customer_cancel_renewal' => 'pf_customer_cancel_renewal',
        'dev_simulate_renewal_payment' => 'pf_dev_simulate_renewal_payment',
        'customer_get_invoice' => 'pf_customer_get_invoice',
        'customer_get_invoices' => 'pf_customer_get_invoices',
        'customer_get_profile' => 'pf_customer_get_profile',
        'customer_update_profile' => 'pf_customer_update_profile',
        // staff (admin + user)
        'admin_get_template_orders' => 'pf_admin_get_template_orders',
        'admin_get_template_order' => 'pf_admin_get_template_order',
        'admin_approve_template_order' => 'pf_admin_approve_template_order',
        'admin_reject_template_order' => 'pf_admin_reject_template_order',
        'admin_set_order_domain' => 'pf_admin_set_order_domain',
        'admin_get_templates' => 'pf_admin_get_templates',
        'admin_save_template' => 'pf_admin_save_template',
        'admin_delete_template' => 'pf_admin_delete_template',
        'admin_get_active_sites' => 'pf_admin_get_active_sites',
        'admin_set_site_status' => 'pf_admin_set_site_status',
        'admin_dashboard_summary' => 'pf_admin_dashboard_summary',
        'admin_get_domain_pricing' => 'pf_admin_get_domain_pricing',
    ];
    if (!isset($handlers[$action])) return false;
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST' && !in_array($action, PF_GET_ACTIONS, true)) {
        throw new ApiError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    }
    $data = call_user_func($handlers[$action], $conn, $input, $user);
    echo json_encode(array_merge(['success' => true], $data), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    return true;
}

// ════════════════════════════════════════════════════════════════════════════
// Public
// ════════════════════════════════════════════════════════════════════════════

function pf_get_templates(mysqli $conn, array $input, ?array $user): array {
    $category = trim(in_str($input, 'category'));
    $sql = "SELECT *, " . PF_SOLD_COUNT_SQL . " FROM templates WHERE status = 'published'";
    $params = [];
    if ($category !== '') {
        $sql .= " AND category = ?";
        $params[] = $category;
    }
    $templates = array_map('pf_template_out', db_all($conn, $sql . " ORDER BY sort_order ASC, id ASC", $params));
    $categories = array_map(function ($r) { return $r['category']; }, db_all($conn,
        "SELECT category FROM templates WHERE status = 'published' GROUP BY category ORDER BY MIN(sort_order) ASC, category ASC"));
    return ['templates' => $templates, 'categories' => $categories];
}

function pf_get_template(mysqli $conn, array $input, ?array $user): array {
    $slug = strtolower(trim(in_str($input, 'slug')));
    $row = $slug === '' ? null : db_one($conn, "SELECT *, " . PF_SOLD_COUNT_SQL . " FROM templates WHERE slug = ? AND status = 'published' LIMIT 1", [$slug]);
    if (!$row) throw new ApiError('Template tidak ditemukan.', 404, 'TEMPLATE_NOT_FOUND');
    return ['template' => pf_template_out($row)];
}

// Projects shown on the homepage: no client name/contact, no price
function pf_get_public_projects(mysqli $conn, array $input, ?array $user): array {
    $rows = db_all($conn, "SELECT id, name, service_type, image, description FROM project_client
                           WHERE show_on_website = 1 ORDER BY id DESC LIMIT 60");
    return ['projects' => array_map(function ($r) {
        return [
            'id' => (int)$r['id'],
            'name' => $r['name'],
            'service_type' => $r['service_type'],
            'image' => $r['image'] !== '' ? $r['image'] : null,
            'description' => $r['description'],
        ];
    }, $rows)];
}

// A live customer site, by id (/situs/:siteId) or by host name (SiteHostGate). Only status active. addons.posts = news &
// announcements switched on (post-capable template + paid add-on, backend/modules/site_addons.php); backend/site.php
// preloads the same shape.
function pf_get_site_public(mysqli $conn, array $input, ?array $user): array {
    $siteId = in_int($input, 'site_id');
    $domain = strtolower(trim(in_str($input, 'domain')));
    $row = null;
    if ($siteId > 0) {
        $row = db_one($conn, "SELECT id, template_code, domain, content FROM template_sites WHERE id = ? AND status = 'active' LIMIT 1", [$siteId]);
    } elseif ($domain !== '') {
        // www.example.com and example.com are the same site
        $other = strpos($domain, 'www.') === 0 ? substr($domain, 4) : 'www.' . $domain;
        $row = db_one($conn, "SELECT id, template_code, domain, content FROM template_sites
                              WHERE domain IN (?, ?) AND status = 'active' ORDER BY (domain = ?) DESC LIMIT 1", [$domain, $other, $domain]);
    } else {
        throw new ApiError('site_id atau domain wajib diisi.', 400, 'VALIDATION');
    }
    if (!$row) throw new ApiError('Situs tidak ditemukan atau sedang tidak aktif.', 404, 'SITE_NOT_FOUND');
    return ['site' => [
        'id' => (int)$row['id'],
        'template_code' => $row['template_code'],
        'domain' => $row['domain'],
        'content' => pf_content_out($row['content']),
        'addons' => sa_site_flags($conn, $row),
    ]];
}

// ── Suka & dilihat kartu proyek beranda (#projects, pemilik 2026-10-24; migrasi 016 showcase_stats) ──────────────
// Kunci kartu: p-{id} (project_client tampil di website) atau f-{slug judul} (portofolio cadangan: setting
// portfolio_data, atau daftar bawaan bila setting kosong/rusak — sama dengan readList + DEFAULT_PORTFOLIO di
// Projects.tsx). Sama dengan showcase* di templates.js.
const PF_SHOWCASE_DEFAULT_TITLES = ['Web App Dashboard', 'Mobile POS App', 'E-Commerce System', 'Corporate Website', 'Sistem Informasi Desa'];

// Non-ASCII dibuang dulu, baru huruf kecil (ASCII saja): sama persis dengan showcaseSlug() di templates.js & Projects.tsx
function pf_showcase_slug(string $title): string {
    return substr(trim(strtolower(preg_replace('/[^A-Za-z0-9]+/', '-', $title)), '-'), 0, 100);
}

/** Semua kunci kartu proyek yang bisa tampil di beranda saat ini (key => true). */
function pf_showcase_keys(mysqli $conn): array {
    $keys = [];
    foreach (db_all($conn, "SELECT id FROM project_client WHERE show_on_website = 1") as $r) $keys['p-' . (int)$r['id']] = true;
    $row = db_one($conn, "SELECT setting_value FROM hero_settings WHERE setting_key = 'portfolio_data' LIMIT 1");
    $raw = $row ? (string)$row['setting_value'] : '';
    $items = $raw !== '' ? json_decode($raw, true) : null;
    $titles = is_array($items) && pf_is_json_list($items)
        ? array_map(function ($item) { return is_array($item) ? (string)($item['title'] ?? '') : ''; }, $items)
        : PF_SHOWCASE_DEFAULT_TITLES;
    foreach ($titles as $title) {
        $slug = pf_showcase_slug($title);
        if ($slug !== '') $keys['f-' . $slug] = true;
    }
    return $keys;
}

/** array_is_list (PHP 8.1) untuk PHP lama: array JSON berupa daftar, bukan objek. */
function pf_is_json_list(array $value): bool {
    return $value === [] || array_keys($value) === range(0, count($value) - 1);
}

function pf_showcase_key(mysqli $conn, array $input): string {
    $key = strtolower(trim(in_str($input, 'key')));
    if (!preg_match('/^(p-[0-9]{1,10}|f-[a-z0-9-]{1,100})$/', $key) || !isset(pf_showcase_keys($conn)[$key])) {
        throw new ApiError('Proyek tidak ditemukan.', 404, 'PROJECT_NOT_FOUND');
    }
    return $key;
}

// Angka suka & dilihat semua kartu proyek yang tampil: { stats: { key: { likes, views } } }
function pf_get_showcase_stats(mysqli $conn, array $input, ?array $user): array {
    $keys = pf_showcase_keys($conn);
    $stats = [];
    foreach (db_all($conn, "SELECT item_key, like_count, view_count FROM showcase_stats") as $r) {
        if (isset($keys[$r['item_key']])) $stats[$r['item_key']] = ['likes' => (int)$r['like_count'], 'views' => (int)$r['view_count']];
    }
    return ['stats' => (object)$stats];
}

// Suka / batal suka kartu proyek (status per pengunjung di browser), dibatasi per IP seperti template_like
function pf_showcase_like(mysqli $conn, array $input, ?array $user): array {
    $limit = 'sc-like|' . client_ip();
    $wait = rate_limit_wait($limit, PF_LIKES_PER_HOUR);
    if ($wait) too_many_attempts($wait);
    $key = pf_showcase_key($conn, $input);
    $liked = in_array(strtolower(in_str($input, 'liked')), ['1', 'true'], true);
    rate_limit_hit($limit, 3600);
    db_run($conn, $liked
        ? "INSERT INTO showcase_stats (item_key, like_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE like_count = like_count + 1"
        : "INSERT INTO showcase_stats (item_key, like_count) VALUES (?, 0) ON DUPLICATE KEY UPDATE like_count = GREATEST(like_count - 1, 0)", [$key]);
    return ['like_count' => (int)db_one($conn, "SELECT like_count FROM showcase_stats WHERE item_key = ?", [$key])['like_count']];
}

// Detail proyek dibuka: view_count +1 (sekali per sesi per proyek di browser), dibatasi per IP seperti template_view
function pf_showcase_view(mysqli $conn, array $input, ?array $user): array {
    $limit = 'sc-view|' . client_ip();
    $wait = rate_limit_wait($limit, PF_VIEWS_PER_HOUR);
    if ($wait) too_many_attempts($wait);
    $key = pf_showcase_key($conn, $input);
    rate_limit_hit($limit, 3600);
    db_run($conn, "INSERT INTO showcase_stats (item_key, view_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE view_count = view_count + 1", [$key]);
    return ['view_count' => (int)db_one($conn, "SELECT view_count FROM showcase_stats WHERE item_key = ?", [$key])['view_count']];
}

// Template terbit dari input `slug` (huruf kecil, angka, tanda hubung); tidak ada → 404
function pf_published_template_by_slug(mysqli $conn, array $input): array {
    $slug = strtolower(trim(in_str($input, 'slug')));
    $row = preg_match('/^[a-z0-9-]{1,120}$/', $slug)
        ? db_one($conn, "SELECT id FROM templates WHERE slug = ? AND status = 'published' LIMIT 1", [$slug])
        : null;
    if (!$row) throw new ApiError('Template tidak ditemukan atau belum tersedia.', 404, 'TEMPLATE_NOT_FOUND');
    return $row;
}

// Suka (`liked` true) / batal suka template di kartu katalog: like_count +1 / -1 (tidak pernah di bawah 0). Status suka
// per pengunjung disimpan di browser; server hanya menghitung, dibatasi per IP.
function pf_template_like(mysqli $conn, array $input, ?array $user): array {
    $key = 'tpl-like|' . client_ip();
    $wait = rate_limit_wait($key, PF_LIKES_PER_HOUR);
    if ($wait) too_many_attempts($wait);
    $id = (int)pf_published_template_by_slug($conn, $input)['id'];
    $liked = in_array(strtolower(in_str($input, 'liked')), ['1', 'true'], true);
    rate_limit_hit($key, 3600);
    db_run($conn, $liked
        ? "UPDATE templates SET like_count = like_count + 1 WHERE id = ?"
        : "UPDATE templates SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?", [$id]);
    return ['like_count' => (int)db_one($conn, "SELECT like_count FROM templates WHERE id = ?", [$id])['like_count']];
}

// Template dibuka dari kartu (detail, demo, pesan): view_count +1. Sekali per sesi per template di browser, dibatasi per IP.
function pf_template_view(mysqli $conn, array $input, ?array $user): array {
    $key = 'tpl-view|' . client_ip();
    $wait = rate_limit_wait($key, PF_VIEWS_PER_HOUR);
    if ($wait) too_many_attempts($wait);
    $id = (int)pf_published_template_by_slug($conn, $input)['id'];
    rate_limit_hit($key, 3600);
    db_run($conn, "UPDATE templates SET view_count = view_count + 1 WHERE id = ?", [$id]);
    return ['view_count' => (int)db_one($conn, "SELECT view_count FROM templates WHERE id = ?", [$id])['view_count']];
}

// Public form for custom website / mobile app work -> project_client (source website, status pending)
function pf_submit_custom_order(mysqli $conn, array $input, ?array $user): array {
    $key = 'custom-order|' . client_ip();
    $wait = rate_limit_wait($key, 5);
    if ($wait) too_many_attempts($wait);

    // Honeypot: real visitors never see the "website" field; bots get a normal-looking answer, nothing is stored
    if (trim(in_str($input, 'website')) !== '') {
        return ['reference' => sprintf('CUS-%06d', random_int(1000, 999999))];
    }

    $errors = [];
    $name = pf_str($input, 'name', 'Nama', 150, true, $errors);
    $email = pf_email($input, 'email', 'Email', true, $errors);
    $phone = pf_phone($input, 'phone', 'Nomor telepon', true, $errors);
    $company = pf_str($input, 'company', 'Nama perusahaan', 150, false, $errors);
    $serviceType = in_str($input, 'service_type');
    if (!in_array($serviceType, ['website', 'mobile_app'], true)) $errors['service_type'] = 'Pilih jenis layanan: website atau aplikasi mobile.';
    $projectName = pf_str($input, 'project_name', 'Nama proyek', 150, false, $errors);
    $description = pf_str($input, 'description', 'Deskripsi kebutuhan', 5000, true, $errors, 10);
    $budget = pf_str($input, 'budget_note', 'Catatan anggaran', 255, false, $errors);
    pf_validate($errors);
    rate_limit_hit($key, 3600);

    $details = ['Jenis layanan: ' . ($serviceType === 'website' ? 'Website' : 'Aplikasi Mobile')];
    if ($company !== null) $details[] = 'Perusahaan: ' . $company;
    if ($budget !== null) $details[] = 'Catatan anggaran: ' . $budget;
    $fullDescription = "Kebutuhan:\n" . $description . "\n\n" . implode("\n", $details) . "\n(Dikirim dari formulir pesanan custom di website)";

    db_run($conn, "INSERT INTO project_client (name, client_name, client_email, client_phone, service_type, status, price,
                       image, project_files, description, show_on_website, source)
                   VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, '[]', ?, 0, 'website')", [
        $projectName ?? mb_substr('Pesanan custom - ' . $name, 0, 255), $name, $email, $phone, $serviceType, $fullDescription,
    ]);
    return ['reference' => sprintf('CUS-%06d', $conn->insert_id)];
}

// Buyer sign-up: active immediately and logged in (token), unlike staff `register`
function pf_customer_register(mysqli $conn, array $input, ?array $user): array {
    if (!auth_secret()) throw new ApiError('Login belum dikonfigurasi di server.', 503);
    $key = 'customer-register|' . client_ip();
    $wait = rate_limit_wait($key, 5);
    if ($wait) too_many_attempts($wait);

    $errors = [];
    $name = pf_str($input, 'name', 'Nama', 100, true, $errors, 2);
    $email = pf_email($input, 'email', 'Email', true, $errors);
    $phone = pf_phone($input, 'phone', 'Nomor telepon', true, $errors);
    $password = is_string($input['password'] ?? null) ? $input['password'] : '';
    if (strlen($password) < 8) $errors['password'] = 'Password minimal 8 karakter.';
    elseif (strlen($password) > 72) $errors['password'] = 'Password maksimal 72 karakter.';
    pf_validate($errors);
    rate_limit_hit($key, 3600);

    if (db_one($conn, "SELECT id FROM users WHERE email = ? LIMIT 1", [$email])) {
        throw new ApiError('Email sudah terdaftar. Silakan masuk.', 409, 'EMAIL_TAKEN', ['email' => 'Email sudah terdaftar. Silakan masuk.']);
    }
    db_run($conn, "INSERT INTO users (name, email, password, phone, role, status, avatar) VALUES (?, ?, ?, ?, 'customer', 'active', '')",
        [$name, $email, password_hash($password, PASSWORD_DEFAULT), $phone]);
    $row = db_one($conn, "SELECT * FROM users WHERE id = ? LIMIT 1", [(int)$conn->insert_id]);
    [$token, $expiresAt] = issue_token($row);
    unset($row['password']);
    $row['id'] = (int)$row['id'];
    return ['user' => $row, 'token' => $token, 'expires_at' => $expiresAt];
}

function pf_get_payment_config(mysqli $conn, array $input, ?array $user): array {
    $cfg = pf_midtrans_config();
    return [
        'configured' => $cfg['server_key'] !== '',
        'is_production' => $cfg['is_production'],
        'simulator' => $cfg['simulator'],
        'client_key' => $cfg['client_key'],
    ];
}

// Midtrans HTTP notification (Snap). Signature first, then amount, then Status API confirmation.
function pf_midtrans_notification(mysqli $conn, array $input, ?array $user): array {
    $cfg = pf_midtrans_config();
    // Without a server key a signature cannot be checked, so nothing is accepted
    if ($cfg['server_key'] === '') throw new ApiError('Pembayaran online belum dikonfigurasi.', 503, 'PAYMENT_NOT_CONFIGURED');

    $orderId = pf_scalar($input, 'order_id');
    $statusCode = pf_scalar($input, 'status_code');
    $gross = pf_scalar($input, 'gross_amount');
    $signature = strtolower(pf_scalar($input, 'signature_key'));
    $expected = hash('sha512', $orderId . $statusCode . $gross . $cfg['server_key']);
    if ($orderId === '' || $signature === '' || !hash_equals($expected, $signature)) {
        throw new ApiError('Signature tidak valid.', 403, 'INVALID_SIGNATURE');
    }
    // Tagihan perpanjangan (GNR-…) dan fitur tambahan (GNF-…, site_addons.php): signature sama, jalur pembayaran sendiri
    if (strncmp($orderId, 'GNR-', 4) === 0) {
        pf_renewal_notification($conn, $cfg, $input, $orderId, $gross);
        return [];
    }
    if (strncmp($orderId, 'GNF-', 4) === 0) {
        sa_midtrans_notification($conn, $cfg, $input, $orderId, $gross);
        return [];
    }

    $order = pf_order_by_midtrans_id($conn, $orderId);
    if (!$order) throw new ApiError('Pesanan tidak ditemukan.', 404, 'ORDER_NOT_FOUND');
    $payload = pf_payment_payload($input);
    if (!pf_same_amount($gross, $order['price'])) {
        pf_log($conn, (int)$order['id'], 'payment_update', null, null, 'midtrans', null,
            'Notifikasi ditolak: jumlah pembayaran (' . $gross . ') tidak sama dengan harga pesanan.', $payload);
        throw new ApiError('Jumlah pembayaran tidak sesuai.', 400, 'AMOUNT_MISMATCH');
    }

    $tx = pf_scalar($input, 'transaction_status');
    $fraud = pf_scalar($input, 'fraud_status');
    $paymentType = pf_scalar($input, 'payment_type');
    // Confirm with the Status API; the notification itself is signed, so it is the fallback when the API is unreachable
    $check = pf_midtrans_request('GET', $cfg['api_base'] . '/v2/' . rawurlencode($orderId) . '/status', $cfg['server_key'], null, 10);
    $body = $check['body'];
    if ($check['code'] === 200 && is_array($body) && isset($body['transaction_status']) && (string)($body['order_id'] ?? '') === $orderId) {
        if (isset($body['gross_amount']) && !pf_same_amount((string)$body['gross_amount'], $order['price'])) {
            pf_log($conn, (int)$order['id'], 'payment_update', null, null, 'midtrans', null,
                'Status API: jumlah pembayaran tidak sama dengan harga pesanan.', pf_payment_payload($body));
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

    // Current attempt: the saved one, or the latest claimed attempt when Snap answered too late to be saved
    $isCurrent = $order['midtrans_order_id'] === $orderId
        || ($order['midtrans_order_id'] === null && $orderId === $order['order_number'] . '-' . $order['payment_attempt']);
    pf_apply_payment($conn, $order, $tx, $fraud, $paymentType !== '' ? $paymentType : null, 'midtrans', null, $payload, $isCurrent);
    return [];
}

// ════════════════════════════════════════════════════════════════════════════
// Customer (token role customer; every query filtered by user_id = token owner)
// ════════════════════════════════════════════════════════════════════════════

function pf_customer_create_order(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $errors = [];
    $templateId = in_int($input, 'template_id');
    if ($templateId <= 0) $errors['template_id'] = 'Pilih template terlebih dahulu.';
    $customerName = pf_str($input, 'customer_name', 'Nama pemesan', 150, true, $errors, 2);
    $customerEmail = pf_email($input, 'customer_email', 'Email', true, $errors);
    $customerPhone = pf_phone($input, 'customer_phone', 'Nomor telepon', true, $errors);
    $companyName = pf_str($input, 'company_name', 'Nama perusahaan', 150, false, $errors);
    $notes = pf_str($input, 'notes', 'Catatan', 2000, false, $errors);
    $domainPrimary = pf_domain($input, 'domain_primary', 'Domain utama', true, $errors);
    $domainAlternative = pf_domain($input, 'domain_alternative', 'Domain alternatif', false, $errors);
    if ($domainPrimary !== null && $domainAlternative === $domainPrimary) {
        $errors['domain_alternative'] = 'Domain alternatif harus berbeda dari domain utama.';
    }
    // Domain dibeli bersama pesanan: hanya ekstensi yang dijual (domain_catalog, domains.php), satu label tanpa subdomain
    $tlds = domain_catalog($conn)['tlds'];
    foreach (['domain_primary' => $domainPrimary, 'domain_alternative' => $domainAlternative] as $key => $domain) {
        if ($domain !== null && !isset($errors[$key]) && ($problem = domain_problem($domain, $tlds)) !== null) $errors[$key] = $problem;
    }
    pf_validate($errors);

    $template = db_one($conn, "SELECT * FROM templates WHERE id = ? AND status = 'published' LIMIT 1", [$templateId]);
    if (!$template) throw new ApiError('Template tidak ditemukan atau belum tersedia.', 404, 'TEMPLATE_NOT_FOUND');
    $pending = (int)db_one($conn, "SELECT COUNT(*) AS c FROM template_orders WHERE user_id = ? AND status = 'menunggu_pembayaran'", [$user['id']])['c'];
    if ($pending >= PF_MAX_PENDING_ORDERS) {
        throw new ApiError('Anda masih punya ' . $pending . ' pesanan yang belum dibayar. Selesaikan atau batalkan dulu sebelum memesan lagi.', 409, 'TOO_MANY_PENDING');
    }
    // Domain yang sudah terdaftar tidak bisa dibeli; 'unknown' (RDAP tidak menjawab) tetap boleh, tim memastikan manual.
    // Cek ini juga dibatasi per akun (pesanan dengan domain terpakai tidak menambah jumlah pesanan menunggu pembayaran)
    $orderKey = 'domain-order|' . $user['id'];
    $wait = rate_limit_wait($orderKey, PF_DOMAIN_ORDER_CHECKS);
    if ($wait) too_many_attempts($wait);
    rate_limit_hit($orderKey, PF_DOMAIN_CHECK_WINDOW);
    $domainCheck = domain_availability($domainPrimary);
    if ($domainCheck === 'taken') {
        $message = 'Domain ' . $domainPrimary . ' sudah dipakai orang lain. Cek nama lain.';
        throw new ApiError($message, 409, 'DOMAIN_UNAVAILABLE', ['domain_primary' => $message]);
    }

    // Harga yang dibayar = harga template dikurangi diskon pesanan pertama (bila berlaku) + domain tahun pertama;
    // harga katalog tetap dicatat. Diskon hanya untuk template.
    $quote = pf_first_order_quote($conn, (int)$user['id'], (float)$template['price']);
    $domainPrice = (float)domain_price($domainPrimary, $tlds);
    $orderId = 0;
    for ($try = 0; $try < 5 && !$orderId; $try++) {
        try {
            db_run($conn, "INSERT INTO template_orders (order_number, user_id, template_id, template_name, template_code, price, list_price,
                               discount_amount, discount_code, domain_price, domain_check, customer_name, customer_email, customer_phone,
                               company_name, notes, domain_primary, domain_alternative)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                pf_new_order_number(), $user['id'], (int)$template['id'], $template['name'], $template['template_code'],
                $quote['price'] + $domainPrice, $quote['list_price'], $quote['discount_amount'], $quote['discount_code'], $domainPrice, $domainCheck,
                $customerName, $customerEmail, $customerPhone, $companyName, $notes, $domainPrimary, $domainAlternative,
            ]);
            $orderId = (int)$conn->insert_id;
        } catch (ApiError $e) {
            if ($e->status !== 409 || $try === 4) throw $e; // order number collision: draw a new one
        }
    }
    pf_log($conn, $orderId, 'created', null, 'menunggu_pembayaran', 'customer', $user['id'], 'Pesanan dibuat.');
    $order = pf_order_by_id($conn, $orderId);

    $paymentUrl = null;
    $paymentError = null;
    if ((float)$order['price'] <= 0) {
        // Free template: nothing to pay, straight to the approval queue
        if (pf_transition($conn, $orderId, 'menunggu_pembayaran', 'menunggu_approval', "paid_at = NOW(), payment_status = 'settlement', payment_type = 'gratis'")) {
            pf_log($conn, $orderId, 'payment_update', 'menunggu_pembayaran', 'menunggu_approval', 'system', null, 'Template gratis, tanpa pembayaran.');
        }
    } else {
        $result = pf_create_snap($conn, $order);
        $paymentUrl = $result['payment_url'];
        $paymentError = $result['error'];
    }
    $out = ['order' => pf_order_out(pf_order_by_id($conn, $orderId), false), 'payment_url' => $paymentUrl];
    if ($paymentError !== null) $out['payment_error'] = $paymentError;
    return $out;
}

/**
 * Diskon otomatis pesanan template pertama (PF_FIRST_ORDER_DISCOUNT_PERCENT): berlaku selama akun belum punya pesanan
 * template lain yang tidak dibatalkan / ditolak. Dibulatkan ke rupiah utuh; template gratis tidak diberi diskon.
 */
function pf_first_order_quote(mysqli $conn, int $userId, float $listPrice): array {
    $others = (int)db_one($conn, "SELECT COUNT(*) AS c FROM template_orders WHERE user_id = ? AND status NOT IN ('dibatalkan', 'ditolak')",
        [$userId])['c'];
    $percent = ($others === 0 && $listPrice > 0) ? PF_FIRST_ORDER_DISCOUNT_PERCENT : 0;
    $discount = $percent > 0 ? round($listPrice * $percent / 100) : 0.0;
    return [
        'list_price' => $listPrice,
        'discount_percent' => $percent,
        'discount_amount' => (float)$discount,
        'discount_code' => $percent > 0 ? PF_FIRST_ORDER_DISCOUNT_CODE : null,
        'price' => $listPrice - $discount,
    ];
}

// Harga yang akan dibayar akun ini untuk template (untuk halaman pesan, sebelum pesanan dibuat)
function pf_customer_get_order_quote(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $templateId = in_int($input, 'template_id');
    $template = $templateId > 0 ? db_one($conn, "SELECT id, price FROM templates WHERE id = ? AND status = 'published' LIMIT 1", [$templateId]) : null;
    if (!$template) throw new ApiError('Template tidak ditemukan atau belum tersedia.', 404, 'TEMPLATE_NOT_FOUND');
    $quote = pf_first_order_quote($conn, (int)$user['id'], (float)$template['price']);
    return ['quote' => [
        'list_price' => pf_num($quote['list_price']),
        'discount_percent' => $quote['discount_percent'],
        'discount_amount' => pf_num($quote['discount_amount']),
        'price' => pf_num($quote['price']),
    ]];
}

function pf_customer_pay_order(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $order = pf_customer_order($conn, $input, $user);
    if ($order['status'] !== 'menunggu_pembayaran') throw pf_invalid_status($order['status'], 'menunggu_approval');
    $cfg = pf_midtrans_config();
    if ($cfg['server_key'] === '') throw new ApiError('Pembayaran online belum dikonfigurasi.', 503, 'PAYMENT_NOT_CONFIGURED');

    // Reuse the current Snap page while it is still valid and not finished/failed
    if ($order['payment_url'] && $order['payment_status'] === 'pending') {
        $age = db_one($conn, "SELECT TIMESTAMPDIFF(MINUTE, MAX(created_at), NOW()) AS m FROM template_order_logs
                              WHERE order_id = ? AND event = 'payment_created'", [(int)$order['id']]);
        if ($age && $age['m'] !== null && (int)$age['m'] < PF_SNAP_REUSE_HOURS * 60) {
            return ['payment_url' => $order['payment_url']];
        }
    }
    $result = pf_create_snap($conn, $order);
    if ($result['payment_url'] === null) throw new ApiError($result['error'], 502, 'PAYMENT_GATEWAY_ERROR');
    return ['payment_url' => $result['payment_url']];
}

function pf_customer_get_orders(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $rows = db_all($conn, pf_order_select() . " WHERE o.user_id = ? ORDER BY o.created_at DESC, o.id DESC", [$user['id']]);
    return ['orders' => array_map(function ($r) { return pf_order_out($r, false); }, $rows)];
}

function pf_customer_get_order(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $order = pf_customer_order($conn, $input, $user);
    $site = db_one($conn, pf_site_select() . " WHERE s.order_id = ? LIMIT 1", [(int)$order['id']]);
    return [
        'order' => pf_order_out($order, false),
        'logs' => pf_logs($conn, (int)$order['id'], false),
        'site' => $site ? pf_site_out($site, false) : null,
        'renewals' => pf_order_renewals($conn, (int)$order['id'], false),
        'renewal' => pf_renewal_offer($conn, $order),
    ];
}

function pf_customer_cancel_order(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $order = pf_customer_order($conn, $input, $user);
    if (!pf_transition($conn, (int)$order['id'], 'menunggu_pembayaran', 'dibatalkan', 'cancelled_at = NOW()')) {
        throw pf_invalid_status($order['status'], 'dibatalkan');
    }
    pf_log($conn, (int)$order['id'], 'cancelled', 'menunggu_pembayaran', 'dibatalkan', 'customer', $user['id'], 'Dibatalkan oleh pemesan.');
    pf_midtrans_expire($order);
    return ['order' => pf_order_out(pf_order_by_id($conn, (int)$order['id']), false)];
}

function pf_customer_get_site(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    return ['site' => pf_customer_site_out($conn, pf_customer_site($conn, $input, $user))];
}

// Saves the CMS content. data: URIs (images) become files under public/assets/sites/<site_id>/.
function pf_customer_save_site_content(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $site = pf_customer_site($conn, $input, $user);
    $siteId = (int)$site['id'];
    if ($site['status'] !== 'active') {
        throw new ApiError('Situs sedang dinonaktifkan sehingga kontennya tidak bisa diubah. Hubungi kami.', 409, 'SITE_SUSPENDED');
    }

    // Re-read the body without converting {} to [] (api.php decodes to arrays), so empty sections stay objects
    // Only an explicit null resets to the template default; a missing key or broken JSON must not wipe the content
    $raw = json_decode((string)file_get_contents('php://input'));
    if (!is_object($raw) || !property_exists($raw, 'content')) {
        throw new ApiError('Konten wajib dikirim.', 400, 'INVALID_CONTENT');
    }
    $content = $raw->content;
    if (is_string($content)) { // also accept the content as a JSON string
        $content = json_decode($content);
        if (json_last_error() !== JSON_ERROR_NONE) throw new ApiError('Format konten tidak valid.', 400, 'INVALID_CONTENT');
    }
    if ($content !== null && !($content instanceof stdClass)) {
        throw new ApiError('Format konten tidak valid.', 400, 'INVALID_CONTENT');
    }

    $json = null;
    if ($content !== null) {
        $images = [];
        $content = pf_walk_content($content, 0, $images);
        $json = json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) throw new ApiError('Format konten tidak valid.', 400, 'INVALID_CONTENT');
        // Size check before anything is written: each placeholder becomes a path of known length
        $finalSize = strlen($json);
        foreach ($images as $placeholder => $img) {
            $finalSize += strlen('/assets/sites/' . $siteId . '/img_' . str_repeat('0', 12) . '.' . $img['ext']) - strlen($placeholder);
        }
        if ($finalSize > PF_CONTENT_MAX_BYTES) {
            throw new ApiError('Konten terlalu besar (maksimal 512 KB teks). Kurangi teks atau jumlah item.', 413, 'CONTENT_TOO_LARGE');
        }
        foreach ($images as $placeholder => $img) {
            $path = save_base64_asset($img['data'], 'sites/' . $siteId, 'img');
            $json = str_replace($placeholder, $path, $json);
        }
    }
    db_run($conn, "UPDATE template_sites SET content = ? WHERE id = ? AND user_id = ?", [$json, $siteId, $user['id']]);
    pf_cleanup_site_assets($siteId, (string)$json);
    return ['site' => pf_customer_site_out($conn, pf_customer_site($conn, ['site_id' => $siteId], $user))];
}

// Runs the same payment transition as a Midtrans settlement (local testing without Midtrans)
function pf_dev_simulate_payment(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $cfg = pf_midtrans_config();
    if (!$cfg['simulator']) throw new ApiError('Simulasi pembayaran tidak aktif.', 403, 'SIMULATOR_DISABLED');
    $order = pf_customer_order($conn, $input, $user);
    if ($order['status'] !== 'menunggu_pembayaran') throw pf_invalid_status($order['status'], 'menunggu_approval');
    pf_apply_payment($conn, $order, 'settlement', 'accept', 'simulator', 'customer', $user['id'],
        ['simulated' => true, 'transaction_status' => 'settlement'], true, 'simulated');
    return ['order' => pf_order_out(pf_order_by_id($conn, (int)$order['id']), false)];
}

// ════════════════════════════════════════════════════════════════════════════
// Customer: domain check, profile, invoice, renewals (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md)
// ════════════════════════════════════════════════════════════════════════════

const PF_RENEWAL_NOT_ACTIVE_MESSAGE = 'Perpanjangan hanya untuk pesanan yang situsnya sudah aktif.';
const PF_RENEWAL_NO_PRICE_MESSAGE = 'Perpanjangan online untuk domain ini belum tersedia. Hubungi kami via WhatsApp.';
const PF_RENEWAL_TOO_LONG_MESSAGE = 'Masa aktif paling lama 10 tahun ke depan. Pilih masa perpanjangan yang lebih pendek.';
// Current end of the hosting / domain period; an active order without one (activated between migration 026 and the
// deploy of this code) ends 1 year after activation. Same expressions in templates.js.
const PF_SERVICE_END_SQL = 'COALESCE(service_expires_at, DATE_ADD(activated_at, INTERVAL 1 YEAR), NOW())';
const PF_DOMAIN_END_SQL = 'COALESCE(domain_expires_at, DATE_ADD(activated_at, INTERVAL 1 YEAR), NOW())';
const PF_INVOICE_NOT_AVAILABLE_MESSAGE = 'Nota tersedia setelah pembayaran lunas.';

// Ketersediaan & harga domain untuk halaman pesan (RDAP registri, backend/modules/domains.php)
function pf_customer_check_domain(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    // Dihitung sebelum I/O apa pun (katalog, validasi), jadi permintaan bersamaan tidak lolos batas
    $key = 'domain-check|' . $user['id'];
    $wait = rate_limit_wait($key, PF_DOMAIN_CHECKS);
    if ($wait) too_many_attempts($wait);
    rate_limit_hit($key, PF_DOMAIN_CHECK_WINDOW);
    $errors = [];
    $domain = '';
    $tlds = domain_catalog($conn)['tlds'];
    $raw = pf_str($input, 'domain', 'Domain', 253, true, $errors);
    if ($raw !== null) {
        $domain = domain_normalize($raw);
        if ($domain === '') $errors['domain'] = 'Domain wajib diisi.';
        elseif (($problem = domain_problem($domain, $tlds)) !== null) $errors['domain'] = $problem;
    }
    pf_validate($errors);
    // Nama yang sama di semua ekstensi (yang diminta lebih dulu), dicek paralel: pembeli melihat mana yang tersedia
    $domains = domain_alternatives($domain, $tlds);
    $statuses = domain_availability_many($domains);
    $checks = array_map(function ($d) use ($statuses, $tlds) {
        $tld = domain_tld($d, $tlds);
        return ['domain' => $d, 'tld' => $tld['tld'], 'status' => $statuses[$d], 'price' => $tld['price']];
    }, $domains);
    return ['check' => $checks[0], 'checks' => $checks];
}

// Daftar ekstensi domain yang dijual + harga jual per tahun (halaman Harga, pilihan ekstensi di halaman pesan). Harga
// beli DewaBiz tidak ikut.
function pf_get_domain_prices(mysqli $conn, array $input, ?array $user): array {
    $catalog = domain_catalog($conn);
    return ['source' => $catalog['source'], 'domains' => array_map(function ($t) {
        return ['tld' => $t['tld'], 'price' => (int)$t['price'], 'requirement' => $t['requirement']];
    }, $catalog['tlds'])];
}

function pf_customer_get_profile(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    return ['profile' => pf_profile_out(pf_profile_row($conn, (int)$user['id']))];
}

// Biodata + foto profil. avatar: tidak dikirim / sama = tetap, null atau '' = hapus, data URI PNG/JPG/WEBP = unggah baru
function pf_customer_update_profile(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $errors = [];
    $name = pf_str($input, 'name', 'Nama', 100, true, $errors, 2);
    $phone = pf_phone($input, 'phone', 'Nomor HP', true, $errors);
    $company = pf_str($input, 'company_name', 'Nama perusahaan', 150, false, $errors);
    $address = pf_str($input, 'address', 'Alamat', 255, false, $errors);
    $city = pf_str($input, 'city', 'Kota', 100, false, $errors);
    $row = pf_profile_row($conn, (int)$user['id']);
    $current = is_string($row['avatar']) ? $row['avatar'] : '';
    $avatar = $current;
    $upload = null;
    if (array_key_exists('avatar', $input)) {
        $value = $input['avatar'];
        if ($value === null || $value === '') {
            $avatar = '';
        } elseif (is_string($value) && $value === $current) {
            // tidak berubah
        } elseif (is_string($value) && preg_match('/^\s*data:/i', $value)) {
            if (!preg_match('/^\s*data:image\/(png|jpe?g|webp);base64,/i', $value, $m)) {
                $errors['avatar'] = 'Foto profil harus JPG, PNG, atau WEBP.';
            } elseif (strlen($value) - strlen($m[0]) > ceil(PF_AVATAR_MAX_BYTES * 4 / 3) + 4) {
                $errors['avatar'] = 'Ukuran foto maksimal 2 MB.';
            } else {
                try {
                    [$content, $ext] = parse_upload(trim($value), false); // type from the bytes, never from the header
                    if (!in_array($ext, PF_AVATAR_EXTS, true)) $errors['avatar'] = 'Foto profil harus JPG, PNG, atau WEBP.';
                    elseif (strlen($content) > PF_AVATAR_MAX_BYTES) $errors['avatar'] = 'Ukuran foto maksimal 2 MB.';
                    else $upload = trim($value);
                } catch (ApiError $e) {
                    $errors['avatar'] = 'Foto profil tidak valid.';
                }
            }
        } else {
            $errors['avatar'] = 'Foto profil tidak valid.';
        }
    }
    pf_validate($errors);
    if ($upload !== null) {
        // Foto baru hanya menggantikan foto yang tadi dibaca: dua simpan bersamaan tidak meninggalkan file yatim
        $avatar = save_base64_asset($upload, 'avatars', 'avatar');
        db_run($conn, "UPDATE users SET name = ?, phone = ?, company_name = ?, address = ?, city = ?, avatar = ? WHERE id = ? AND avatar <=> ?",
            [$name, $phone, $company, $address, $city, $avatar, (int)$user['id'], $row['avatar']]);
        if (db_affected_rows() === 0) {
            pf_delete_generated($avatar, 'avatars');
            throw new ApiError('Foto profil baru saja diubah di tempat lain. Muat ulang halaman lalu coba lagi.', 409, 'PROFILE_CHANGED');
        }
    } else {
        db_run($conn, "UPDATE users SET name = ?, phone = ?, company_name = ?, address = ?, city = ?, avatar = ? WHERE id = ?",
            [$name, $phone, $company, $address, $city, $avatar, (int)$user['id']]);
    }
    if ($avatar !== $current) pf_delete_generated($current, 'avatars');
    return ['profile' => pf_profile_out(pf_profile_row($conn, (int)$user['id']))];
}

function pf_profile_row(mysqli $conn, int $userId): array {
    $row = db_one($conn, "SELECT id, name, email, phone, company_name, address, city, avatar FROM users WHERE id = ? LIMIT 1", [$userId]);
    if (!$row) throw new ApiError('Silakan masuk terlebih dahulu.', 401, 'UNAUTHORIZED');
    return $row;
}

function pf_profile_out(array $r): array {
    $avatar = is_string($r['avatar']) ? $r['avatar'] : '';
    return [
        'id' => (int)$r['id'],
        'name' => $r['name'],
        'email' => $r['email'],
        'phone' => $r['phone'],
        'company_name' => $r['company_name'],
        'address' => $r['address'],
        'city' => $r['city'],
        // Path/URL gambar saja; kosong atau data URI (foto staf lama) = inisial nama
        'avatar' => preg_match('#^(/assets/|https://)#', $avatar) ? $avatar : null,
    ];
}

// Data nota pembelian (pesanan lunas), nota perpanjangan (tagihan lunas, renewal_number) atau nota fitur tambahan (tagihan
// GNF- lunas dan berbayar, addon_number; site_addons.php) + identitas perusahaan untuk kop
function pf_customer_get_invoice(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $order = pf_customer_order($conn, $input, $user);
    $number = strtoupper(trim(in_str($input, 'renewal_number')));
    $addonNumber = strtoupper(trim(in_str($input, 'addon_number')));
    $renewal = null;
    $addon = null;
    if ($number !== '') {
        $renewal = db_one($conn, pf_renewal_select() . " WHERE r.renewal_number = ? AND r.order_id = ? LIMIT 1", [$number, (int)$order['id']]);
        if (!$renewal) throw new ApiError('Tagihan perpanjangan tidak ditemukan.', 404, 'RENEWAL_NOT_FOUND');
        if ($renewal['status'] !== 'lunas') throw new ApiError(PF_INVOICE_NOT_AVAILABLE_MESSAGE, 409, 'INVOICE_NOT_AVAILABLE');
    } elseif ($addonNumber !== '') {
        $addon = sa_customer_invoice_addon($conn, $order, $addonNumber);
    } elseif ($order['paid_at'] === null) {
        throw new ApiError(PF_INVOICE_NOT_AVAILABLE_MESSAGE, 409, 'INVOICE_NOT_AVAILABLE');
    }
    return [
        'order' => pf_order_out($order, false),
        'renewal' => $renewal ? pf_renewal_out($renewal, false) : null,
        'addon' => $addon,
        'company' => pd_settings($conn)['company'],
    ];
}

// Daftar nota pembeli (menu Nota): pesanan yang sudah dibayar + perpanjangan lunas + fitur tambahan lunas berbayar
// (type fitur, site_addons.php), terbaru dulu
function pf_customer_get_invoices(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $items = [];
    foreach (db_all($conn, pf_order_select() . " WHERE o.user_id = ? AND o.paid_at IS NOT NULL", [$user['id']]) as $o) {
        $items[] = [
            'type' => 'pembelian',
            'invoice_number' => 'INV-' . $o['order_number'],
            'order_number' => $o['order_number'],
            'renewal_number' => null,
            'addon_number' => null,
            'title' => $o['template_name'],
            'domain' => $o['domain'] ?: $o['domain_primary'],
            'years' => null,
            'amount' => pf_num($o['price']),
            'paid_at' => $o['paid_at'],
            'payment_status' => $o['payment_status'],
            'payment_type' => $o['payment_type'],
            'order_status' => $o['status'],
        ];
    }
    foreach (db_all($conn, pf_renewal_select() . " WHERE o.user_id = ? AND r.status = 'lunas'", [$user['id']]) as $r) {
        $items[] = [
            'type' => 'perpanjangan',
            'invoice_number' => 'INV-' . $r['renewal_number'],
            'order_number' => $r['order_number'],
            'renewal_number' => $r['renewal_number'],
            'addon_number' => null,
            'title' => $r['template_name'],
            'domain' => $r['domain'],
            'years' => (int)$r['years'],
            'amount' => pf_num($r['price']),
            'paid_at' => $r['paid_at'],
            'payment_status' => $r['payment_status'],
            'payment_type' => $r['payment_type'],
            'order_status' => null,
        ];
    }
    $items = array_merge($items, sa_invoice_items($conn, (int)$user['id']));
    usort($items, function ($a, $b) {
        return strcmp((string)$b['paid_at'], (string)$a['paid_at']) ?: strcmp($b['invoice_number'], $a['invoice_number']);
    });
    return ['invoices' => $items];
}

function pf_customer_create_renewal(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $years = in_int($input, 'years');
    if (!in_array($years, PF_RENEWAL_YEARS, true)) pf_validate(['years' => 'Pilih masa perpanjangan 1, 2, atau 3 tahun.']);
    $order = pf_customer_order($conn, $input, $user);
    $orderId = (int)$order['id'];
    $offer = pf_renewal_offer($conn, $order);
    if ($order['status'] !== 'aktif' || $offer['price_per_year'] === null) throw new ApiError($offer['reason'], 409, 'RENEWAL_NOT_AVAILABLE');
    pf_assert_no_pending_renewal($conn, $orderId);
    $option = null;
    foreach ($offer['options'] as $o) {
        if ($o['years'] === $years) $option = $o;
    }
    if ($option === null) throw new ApiError(PF_RENEWAL_TOO_LONG_MESSAGE, 409, 'RENEWAL_TOO_LONG');

    $renewalId = 0;
    for ($try = 0; $try < 5 && !$renewalId; $try++) {
        try {
            db_run($conn, "INSERT INTO template_renewals (renewal_number, order_id, user_id, domain, years, hosting_price_per_year,
                               domain_price_per_year, price_per_year, price, pending_order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                pf_new_order_number('GNR'), $orderId, (int)$user['id'], $order['domain'] ?: $order['domain_primary'], $years,
                $offer['hosting_price_per_year'], $offer['domain_price_per_year'], $offer['price_per_year'], $option['price'], $orderId,
            ]);
            $renewalId = (int)$conn->insert_id;
        } catch (ApiError $e) {
            if ($e->status !== 409) throw $e;
            pf_assert_no_pending_renewal($conn, $orderId); // a concurrent request opened one (uq_renewals_pending)
            if ($try === 4) throw $e; // renewal number collision: draw a new one
        }
    }
    $renewal = pf_renewal_by_id($conn, $renewalId);
    pf_log($conn, $orderId, 'renewal_created', null, null, 'customer', (int)$user['id'],
        'Perpanjangan ' . $years . ' tahun dibuat (' . $renewal['renewal_number'] . ').');
    $result = pf_create_renewal_snap($conn, $renewal);
    $out = ['renewal' => pf_renewal_out(pf_renewal_by_id($conn, $renewalId), false), 'payment_url' => $result['payment_url']];
    if ($result['error'] !== null) $out['payment_error'] = $result['error'];
    return $out;
}

function pf_customer_pay_renewal(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $renewal = pf_customer_renewal($conn, $input, $user);
    if ($renewal['status'] !== 'menunggu_pembayaran') throw pf_renewal_status_error($renewal['status']);
    // Kartu yang ditahan untuk tinjauan fraud: membayar lagi membuat transaksi baru (risiko tertagih dua kali)
    if ($renewal['payment_status'] === 'capture') {
        throw new ApiError('Pembayaran kartu Anda sedang ditinjau bank. Tidak perlu membayar ulang.', 409, 'PAYMENT_UNDER_REVIEW');
    }
    $cfg = pf_midtrans_config();
    if ($cfg['server_key'] === '') throw new ApiError('Pembayaran online belum dikonfigurasi.', 503, 'PAYMENT_NOT_CONFIGURED');
    // Reuse the current Snap page while it is still valid and not finished/failed
    if ($renewal['payment_url'] && $renewal['payment_status'] === 'pending' && $renewal['payment_age_minutes'] !== null
        && (int)$renewal['payment_age_minutes'] < PF_SNAP_REUSE_HOURS * 60) {
        return ['payment_url' => $renewal['payment_url']];
    }
    $result = pf_create_renewal_snap($conn, $renewal);
    if ($result['payment_url'] === null) throw new ApiError($result['error'], 502, 'PAYMENT_GATEWAY_ERROR');
    return ['payment_url' => $result['payment_url']];
}

function pf_customer_cancel_renewal(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $renewal = pf_customer_renewal($conn, $input, $user);
    if (!pf_renewal_transition($conn, (int)$renewal['id'], 'dibatalkan', 'cancelled_at = NOW()')) {
        throw pf_renewal_status_error(pf_renewal_by_id($conn, (int)$renewal['id'])['status']);
    }
    pf_log($conn, (int)$renewal['order_id'], 'renewal_cancelled', null, null, 'customer', (int)$user['id'],
        'Perpanjangan ' . $renewal['renewal_number'] . ' dibatalkan.');
    pf_midtrans_expire($renewal);
    return ['renewal' => pf_renewal_out(pf_renewal_by_id($conn, (int)$renewal['id']), false)];
}

// Same payment result as a Midtrans settlement (local testing without Midtrans)
function pf_dev_simulate_renewal_payment(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $cfg = pf_midtrans_config();
    if (!$cfg['simulator']) throw new ApiError('Simulasi pembayaran tidak aktif.', 403, 'SIMULATOR_DISABLED');
    $renewal = pf_customer_renewal($conn, $input, $user);
    if ($renewal['status'] !== 'menunggu_pembayaran') throw pf_renewal_status_error($renewal['status']);
    pf_apply_renewal_payment($conn, $renewal, 'settlement', 'accept', 'simulator', 'customer', (int)$user['id'],
        ['simulated' => true, 'transaction_status' => 'settlement'], true, null, 'simulated');
    return [
        'renewal' => pf_renewal_out(pf_renewal_by_id($conn, (int)$renewal['id']), false),
        'order' => pf_order_out(pf_order_by_id($conn, (int)$renewal['order_id']), false),
    ];
}

// Midtrans notification for GNR-… (signature already checked): amount, Status API confirmation, then the payment result
function pf_renewal_notification(mysqli $conn, array $cfg, array $input, string $orderId, string $gross): void {
    $renewal = db_one($conn, pf_renewal_select() . " WHERE r.midtrans_order_id = ? LIMIT 1", [$orderId]);
    if (!$renewal && preg_match('/^(GNR-\d{8}-[A-Z0-9]{6})-(\d+)$/', $orderId, $m)) {
        $renewal = db_one($conn, pf_renewal_select() . " WHERE r.renewal_number = ? AND r.payment_attempt >= ? LIMIT 1", [$m[1], (int)$m[2]]);
    }
    if (!$renewal) throw new ApiError('Tagihan perpanjangan tidak ditemukan.', 404, 'RENEWAL_NOT_FOUND');
    $payload = pf_payment_payload($input);
    if (!pf_same_amount($gross, $renewal['price'])) {
        pf_log($conn, (int)$renewal['order_id'], 'renewal_payment_update', null, null, 'midtrans', null,
            'Notifikasi perpanjangan ' . $renewal['renewal_number'] . ' ditolak: jumlah pembayaran (' . $gross . ') tidak sama dengan tagihan.', $payload);
        throw new ApiError('Jumlah pembayaran tidak sesuai.', 400, 'AMOUNT_MISMATCH');
    }
    $tx = pf_scalar($input, 'transaction_status');
    $fraud = pf_scalar($input, 'fraud_status');
    $paymentType = pf_scalar($input, 'payment_type');
    // Confirm with the Status API; the notification itself is signed, so it is the fallback when the API is unreachable
    $check = pf_midtrans_request('GET', $cfg['api_base'] . '/v2/' . rawurlencode($orderId) . '/status', $cfg['server_key'], null, 10);
    $body = $check['body'];
    if ($check['code'] === 200 && is_array($body) && isset($body['transaction_status']) && (string)($body['order_id'] ?? '') === $orderId) {
        if (isset($body['gross_amount']) && !pf_same_amount((string)$body['gross_amount'], $renewal['price'])) {
            pf_log($conn, (int)$renewal['order_id'], 'renewal_payment_update', null, null, 'midtrans', null,
                'Status API: jumlah pembayaran perpanjangan ' . $renewal['renewal_number'] . ' tidak sama dengan tagihan.', pf_payment_payload($body));
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
    $isCurrent = $renewal['midtrans_order_id'] === $orderId
        || ($renewal['midtrans_order_id'] === null && $orderId === $renewal['renewal_number'] . '-' . $renewal['payment_attempt']);
    pf_apply_renewal_payment($conn, $renewal, $tx, $fraud, $paymentType !== '' ? $paymentType : null, 'midtrans', null, $payload, $isCurrent,
        $orderId);
}

// One place for every renewal payment result (Midtrans webhook and dev_simulate_renewal_payment):
//   settlement / capture+accept -> lunas + masa aktif diperpanjang (pf_renewal_mark_paid)
//   deny / cancel / expire / failure -> dibatalkan, only for the current attempt while still menunggu_pembayaran
//   pending -> unchanged; refund* / chargeback -> logged only
// $paymentOrderId = Midtrans order_id of the notification (null for the simulator). Payment fields change only while the
// renewal waits for payment, or for a refund/chargeback of the attempt that paid it (paid_midtrans_order_id).
function pf_apply_renewal_payment(mysqli $conn, array $renewal, string $tx, string $fraud, ?string $paymentType, string $actorType,
                                  ?int $actorId, array $payload, bool $isCurrentAttempt, ?string $paymentOrderId,
                                  ?string $storedStatus = null): void {
    $id = (int)$renewal['id'];
    $orderId = (int)$renewal['order_id'];
    $number = $renewal['renewal_number'];
    $tx = strtolower($tx);
    $fraud = strtolower($fraud);
    $paid = $tx === 'settlement' || ($tx === 'capture' && $fraud === 'accept');
    $failed = in_array($tx, ['deny', 'cancel', 'expire', 'failure'], true);
    $reversal = strpos($tx, 'refund') !== false || $tx === 'chargeback' || $tx === 'partial_chargeback';
    $payingAttempt = $paymentOrderId !== null && $paymentOrderId === $renewal['paid_midtrans_order_id'];

    // An old attempt's failure must not overwrite the payment fields of the current attempt, and nothing but a reversal
    // of the paying attempt changes them once the renewal is lunas
    $paymentChanged = false;
    $touch = $renewal['status'] === 'menunggu_pembayaran'
        ? ($isCurrentAttempt || $paid)
        : ($renewal['status'] === 'lunas' && $payingAttempt && $reversal);
    if ($touch) {
        $newStatus = $storedStatus ?? ($tx !== '' ? $tx : 'pending');
        $paymentChanged = $renewal['payment_status'] !== $newStatus || ($paymentType !== null && $renewal['payment_type'] !== $paymentType);
        if ($paymentChanged) {
            db_run($conn, "UPDATE template_renewals SET payment_status = ?, payment_type = COALESCE(?, payment_type) WHERE id = ?",
                [mb_substr($newStatus, 0, 30), $paymentType === null ? null : mb_substr($paymentType, 0, 40), $id]);
        }
    }

    $note = null;
    if ($paid) {
        $expires = pf_renewal_mark_paid($conn, $renewal, $paymentOrderId);
        if ($expires !== null) {
            pf_log($conn, $orderId, 'renewal_paid', null, null, $actorType, $actorId,
                'Perpanjangan ' . (int)$renewal['years'] . ' tahun lunas (' . $number . '). Masa aktif sampai ' . pf_tanggal_id($expires) . '.', $payload);
            return;
        }
        // Not marked by this notification: decide from the current row (a cancel or another payment may have just won)
        $fresh = pf_renewal_by_id($conn, $id);
        if ($fresh['status'] === 'dibatalkan' && $fresh['paid_at'] === null) {
            $note = 'Pembayaran perpanjangan ' . $number . ' diterima, tetapi tagihannya sudah dibatalkan. Perlu ditindaklanjuti manual (refund).';
        } elseif ($fresh['status'] === 'lunas' && $paymentOrderId !== null && $fresh['paid_midtrans_order_id'] !== null
            && $paymentOrderId !== $fresh['paid_midtrans_order_id']) {
            $note = 'Pembayaran ganda perpanjangan ' . $number . ' (' . $paymentOrderId . '); sudah lunas lewat ' . $fresh['paid_midtrans_order_id']
                . '. Perlu ditindaklanjuti manual (refund).';
        }
    } elseif ($failed && $isCurrentAttempt) {
        if (pf_renewal_transition($conn, $id, 'dibatalkan', 'cancelled_at = NOW()')) {
            pf_log($conn, $orderId, 'renewal_cancelled', null, null, $actorType, $actorId,
                'Perpanjangan ' . $number . ' dibatalkan otomatis karena pembayaran tidak berhasil.', $payload);
            return;
        }
    } elseif ($reversal) {
        $note = 'Refund/chargeback perpanjangan ' . $number . ' tercatat (' . $tx . '); masa aktif tidak diubah.';
    } elseif ($tx === 'capture') {
        $note = 'Pembayaran kartu perpanjangan ' . $number . ' menunggu tinjauan fraud (' . ($fraud !== '' ? $fraud : '-') . ').';
    }
    // Duplicate notifications change nothing and are not logged again
    if ($paymentChanged || $note !== null) {
        pf_log($conn, $orderId, 'renewal_payment_update', null, null, $actorType, $actorId,
            $note ?? ('Status pembayaran perpanjangan ' . $number . ': ' . ($tx !== '' ? $tx : '-')), $payload);
    }
}

// Lunas: conditional status change, then the order's periods are extended, in one transaction. Returns the new
// hosting end date, or null when the renewal no longer waits for payment.
function pf_renewal_mark_paid(mysqli $conn, array $renewal, ?string $paymentOrderId): ?string {
    $orderId = (int)$renewal['order_id'];
    $years = (int)$renewal['years'];
    $conn->begin_transaction();
    try {
        if (!pf_renewal_transition($conn, (int)$renewal['id'], 'lunas', 'paid_at = NOW(), paid_midtrans_order_id = ?', [$paymentOrderId])) {
            $conn->rollback();
            return null;
        }
        $before = db_one($conn, "SELECT service_expires_at, domain_expires_at FROM template_orders WHERE id = ? FOR UPDATE", [$orderId]);
        // Continues from the current end date (activation + 1 year when the order has no end date yet), or from today when
        // the period already ended
        db_run($conn, "UPDATE template_orders SET
                           service_expires_at = DATE_ADD(GREATEST(" . PF_SERVICE_END_SQL . ", NOW()), INTERVAL ? YEAR),
                           domain_expires_at = DATE_ADD(GREATEST(" . PF_DOMAIN_END_SQL . ", NOW()), INTERVAL ? YEAR),
                           service_started_at = COALESCE(service_started_at, NOW()), domain_started_at = COALESCE(domain_started_at, NOW())
                       WHERE id = ?", [$years, $years, $orderId]);
        $after = db_one($conn, "SELECT service_expires_at, domain_expires_at FROM template_orders WHERE id = ?", [$orderId]);
        db_run($conn, "UPDATE template_renewals SET service_expires_before = ?, service_expires_after = ?, domain_expires_before = ?,
                           domain_expires_after = ? WHERE id = ?", [
            $before['service_expires_at'], $after['service_expires_at'], $before['domain_expires_at'], $after['domain_expires_at'], (int)$renewal['id'],
        ]);
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        throw $e;
    }
    return $after['service_expires_at'];
}

// Leaves menunggu_pembayaran (only from there) and frees the order's open-renewal slot
function pf_renewal_transition(mysqli $conn, int $id, string $to, string $extraSet, array $extraParams = []): bool {
    db_run($conn, "UPDATE template_renewals SET status = ?, pending_order_id = NULL, $extraSet WHERE id = ? AND status = 'menunggu_pembayaran'",
        array_merge([$to], $extraParams, [$id]));
    return db_affected_rows() > 0;
}

// New Snap transaction for a renewal (attempt + 1): hosting & jasa + domain for the chosen years
function pf_create_renewal_snap(mysqli $conn, array $renewal): array {
    $cfg = pf_midtrans_config();
    if ($cfg['server_key'] === '') return ['payment_url' => null, 'error' => 'Pembayaran online belum dikonfigurasi.'];
    $id = (int)$renewal['id'];
    $attempt = (int)$renewal['payment_attempt'] + 1;
    // Claim the attempt number first: Midtrans order_id must never be reused, even after a timeout
    db_run($conn, "UPDATE template_renewals SET payment_attempt = ? WHERE id = ? AND payment_attempt = ? AND status = 'menunggu_pembayaran'",
        [$attempt, $id, $attempt - 1]);
    if (db_affected_rows() === 0) {
        $fresh = pf_renewal_by_id($conn, $id);
        if ($fresh['status'] === 'menunggu_pembayaran' && $fresh['payment_url']) return ['payment_url' => $fresh['payment_url'], 'error' => null];
        return ['payment_url' => null, 'error' => 'Pembayaran sedang diproses. Muat ulang halaman lalu coba lagi.'];
    }

    $midtransOrderId = $renewal['renewal_number'] . '-' . $attempt;
    $years = (int)$renewal['years'];
    $hosting = (int)round((float)$renewal['hosting_price_per_year']) * $years;
    $domain = (int)round((float)$renewal['domain_price_per_year']) * $years;
    $tld = domain_tld($renewal['domain'], domain_catalog($conn)['tlds']);
    $appUrl = rtrim(env_value('APP_URL', 'http://localhost:5173'), '/');
    $response = pf_midtrans_request('POST', $cfg['snap_url'], $cfg['server_key'], [
        'transaction_details' => ['order_id' => $midtransOrderId, 'gross_amount' => $hosting + $domain],
        'item_details' => [
            ['id' => 'HOST', 'price' => $hosting, 'quantity' => 1, 'name' => mb_substr('Perpanjangan hosting & jasa (' . $years . ' tahun)', 0, 50)],
            [
                'id' => 'DOM-' . ($tld ? $tld['tld'] : 'domain'),
                'price' => $domain,
                'quantity' => 1,
                'name' => mb_substr('Perpanjangan domain ' . $renewal['domain'] . ' (' . $years . ' tahun)', 0, 50),
            ],
        ],
        'customer_details' => [
            'first_name' => mb_substr($renewal['customer_name'], 0, 50),
            'email' => $renewal['customer_email'],
            'phone' => $renewal['customer_phone'],
        ],
        'callbacks' => ['finish' => $appUrl . '/akun/pesanan/' . rawurlencode($renewal['order_number'])],
    ], 20);
    $body = $response['body'];
    if (($response['code'] !== 200 && $response['code'] !== 201) || !is_array($body) || empty($body['token']) || empty($body['redirect_url'])) {
        $detail = is_array($body) && isset($body['error_messages']) ? implode('; ', (array)$body['error_messages']) : $response['error'];
        error_log('[midtrans] Snap transaction failed for ' . $midtransOrderId . ': HTTP ' . $response['code'] . ' ' . $detail);
        pf_log($conn, (int)$renewal['order_id'], 'renewal_payment_update', null, null, 'system', null,
            mb_substr('Gagal membuat transaksi Midtrans perpanjangan ' . $renewal['renewal_number'] . ' (percobaan ' . $attempt . '): HTTP '
                . $response['code'] . ' ' . $detail, 0, 500));
        return ['payment_url' => null, 'error' => 'Gagal membuat pembayaran online. Silakan coba lagi beberapa saat lagi.'];
    }
    // Only while this attempt is still the latest claimed one: a slower older attempt never replaces a newer one
    db_run($conn, "UPDATE template_renewals SET midtrans_order_id = ?, snap_token = ?, payment_url = ?, payment_status = 'pending', payment_type = NULL,
                       payment_created_at = NOW() WHERE id = ? AND status = 'menunggu_pembayaran' AND payment_attempt = ?",
        [$midtransOrderId, (string)$body['token'], (string)$body['redirect_url'], $id, $attempt]);
    if (db_affected_rows() === 0) {
        $fresh = pf_renewal_by_id($conn, $id);
        if ($fresh['status'] === 'menunggu_pembayaran' && $fresh['payment_url']) return ['payment_url' => $fresh['payment_url'], 'error' => null];
        return ['payment_url' => null, 'error' => 'Pembayaran sedang diproses. Muat ulang halaman lalu coba lagi.'];
    }
    pf_log($conn, (int)$renewal['order_id'], 'renewal_payment_created', null, null, 'system', null,
        'Tagihan perpanjangan ' . $renewal['renewal_number'] . ' dibuat (percobaan ' . $attempt . ').');
    return ['payment_url' => (string)$body['redirect_url'], 'error' => null];
}

// Penawaran perpanjangan: harga per tahun (hosting & jasa + domain sesuai ekstensi) dan tanggal berakhir baru per opsi
function pf_renewal_offer(mysqli $conn, array $order): array {
    $hosting = pf_hosting_renewal_price($conn);
    $domainPrice = domain_price($order['domain'] ?: $order['domain_primary'], domain_catalog($conn)['tlds']);
    $reason = null;
    if ($order['status'] !== 'aktif') $reason = PF_RENEWAL_NOT_ACTIVE_MESSAGE;
    elseif ($domainPrice === null) $reason = PF_RENEWAL_NO_PRICE_MESSAGE;
    $perYear = $domainPrice === null ? null : $hosting + $domainPrice;
    $options = [];
    if ($reason === null) {
        $dates = pf_renewal_dates($conn, (int)$order['id']);
        foreach (PF_RENEWAL_YEARS as $years) {
            [$service, $domain] = $dates[$years];
            if (max($service, $domain) > $dates['cap']) continue;
            $options[] = ['years' => $years, 'price' => $perYear * $years, 'service_expires_after' => $service, 'domain_expires_after' => $domain];
        }
        if (!$options) $reason = PF_RENEWAL_TOO_LONG_MESSAGE;
    }
    return [
        'available' => $reason === null,
        'reason' => $reason,
        'hosting_price_per_year' => $hosting,
        'domain_price_per_year' => $domainPrice,
        'price_per_year' => $perYear,
        'max_years' => max(PF_RENEWAL_YEARS),
        'options' => $options,
    ];
}

// New end dates per number of years, computed by the database with the same expression as pf_renewal_mark_paid,
// and the latest allowed end date (PF_RENEWAL_MAX_YEARS_AHEAD)
function pf_renewal_dates(mysqli $conn, int $orderId): array {
    $columns = [];
    foreach (PF_RENEWAL_YEARS as $y) {
        $columns[] = "DATE_ADD(GREATEST(" . PF_SERVICE_END_SQL . ", NOW()), INTERVAL $y YEAR) AS s$y";
        $columns[] = "DATE_ADD(GREATEST(" . PF_DOMAIN_END_SQL . ", NOW()), INTERVAL $y YEAR) AS d$y";
    }
    $row = db_one($conn, "SELECT " . implode(', ', $columns) . ", DATE_ADD(NOW(), INTERVAL " . PF_RENEWAL_MAX_YEARS_AHEAD . " YEAR) AS cap
                          FROM template_orders WHERE id = ?", [$orderId]);
    $dates = ['cap' => (string)$row['cap']];
    foreach (PF_RENEWAL_YEARS as $y) $dates[$y] = [(string)$row["s$y"], (string)$row["d$y"]];
    return $dates;
}

// Hosting & jasa per tahun mulai tahun ke-2 (setting template_hosting_renewal_price, admin > Pengaturan website > Harga)
function pf_hosting_renewal_price(mysqli $conn): int {
    $row = db_one($conn, "SELECT setting_value FROM hero_settings WHERE setting_key = 'template_hosting_renewal_price' LIMIT 1");
    $raw = trim((string)($row['setting_value'] ?? ''));
    if (!preg_match('/^\d+(\.\d+)?$/D', $raw)) return PF_HOSTING_RENEWAL_DEFAULT;
    $value = round((float)$raw);
    return ($value > 0 && $value <= 1e12) ? (int)$value : PF_HOSTING_RENEWAL_DEFAULT;
}

function pf_assert_no_pending_renewal(mysqli $conn, int $orderId): void {
    $pending = db_one($conn, "SELECT renewal_number FROM template_renewals WHERE order_id = ? AND status = 'menunggu_pembayaran' LIMIT 1", [$orderId]);
    if ($pending) {
        throw new ApiError('Masih ada tagihan perpanjangan ' . $pending['renewal_number'] . ' yang belum dibayar. Bayar atau batalkan dulu.', 409, 'RENEWAL_PENDING');
    }
}

function pf_renewal_status_error(string $status): ApiError {
    return new ApiError('Tagihan perpanjangan ini berstatus "' . (PF_RENEWAL_STATUS_LABEL[$status] ?? $status) . '".', 409, 'INVALID_STATUS');
}

function pf_renewal_select(): string {
    return "SELECT r.*, TIMESTAMPDIFF(MINUTE, r.payment_created_at, NOW()) AS payment_age_minutes,
                   o.order_number, o.template_name, o.customer_name, o.customer_email, o.customer_phone
              FROM template_renewals r
              JOIN template_orders o ON o.id = r.order_id";
}

function pf_renewal_by_id(mysqli $conn, int $id): array {
    $row = db_one($conn, pf_renewal_select() . " WHERE r.id = ? LIMIT 1", [$id]);
    if (!$row) throw new ApiError('Tagihan perpanjangan tidak ditemukan.', 404, 'RENEWAL_NOT_FOUND');
    return $row;
}

// Someone else's renewal answers exactly like a missing one
function pf_customer_renewal(mysqli $conn, array $input, array $user): array {
    $number = strtoupper(trim(in_str($input, 'renewal_number')));
    $row = $number === '' ? null : db_one($conn, pf_renewal_select() . " WHERE r.renewal_number = ? AND o.user_id = ? LIMIT 1", [$number, $user['id']]);
    if (!$row) throw new ApiError('Tagihan perpanjangan tidak ditemukan.', 404, 'RENEWAL_NOT_FOUND');
    return $row;
}

function pf_order_renewals(mysqli $conn, int $orderId, bool $staff): array {
    $rows = db_all($conn, pf_renewal_select() . " WHERE r.order_id = ? ORDER BY r.created_at DESC, r.id DESC", [$orderId]);
    return array_map(function ($r) use ($staff) { return pf_renewal_out($r, $staff); }, $rows);
}

function pf_renewal_out(array $r, bool $staff): array {
    $status = $r['status'];
    return [
        'id' => (int)$r['id'],
        'renewal_number' => $r['renewal_number'],
        'order_number' => $r['order_number'],
        'domain' => $r['domain'],
        'years' => (int)$r['years'],
        'hosting_price_per_year' => pf_num($r['hosting_price_per_year']),
        'domain_price_per_year' => pf_num($r['domain_price_per_year']),
        'price_per_year' => pf_num($r['price_per_year']),
        'price' => pf_num($r['price']),
        'status' => $status,
        'status_label' => PF_RENEWAL_STATUS_LABEL[$status] ?? $status,
        'payment_status' => $r['payment_status'],
        'payment_type' => $r['payment_type'],
        // Only the owner gets the payment link, and only while there is something to pay
        'payment_url' => (!$staff && $status === 'menunggu_pembayaran') ? $r['payment_url'] : null,
        'paid_at' => $r['paid_at'],
        'cancelled_at' => $r['cancelled_at'],
        'service_expires_before' => $r['service_expires_before'],
        'service_expires_after' => $r['service_expires_after'],
        'domain_expires_before' => $r['domain_expires_before'],
        'domain_expires_after' => $r['domain_expires_after'],
        'invoice_number' => $status === 'lunas' ? 'INV-' . $r['renewal_number'] : null,
        'created_at' => $r['created_at'],
    ];
}

// '2029-10-23 01:23:00' -> '23 Oktober 2029' (log notes for the customer)
function pf_tanggal_id(?string $value): string {
    if ($value === null || !preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $value, $m)) return '-';
    return (int)$m[3] . ' ' . PF_MONTHS_ID[(int)$m[2] - 1] . ' ' . $m[1];
}

// ════════════════════════════════════════════════════════════════════════════
// Staff (role admin or user)
// ════════════════════════════════════════════════════════════════════════════

function pf_admin_get_template_orders(mysqli $conn, array $input, ?array $user): array {
    pf_require_staff($user);
    $status = trim(in_str($input, 'status'));
    if ($status !== '' && $status !== 'all' && !isset(PF_STATUS_LABEL[$status])) {
        throw new ApiError('Status tidak valid.', 400, 'VALIDATION', ['status' => 'Status tidak valid.']);
    }
    $q = mb_substr(trim(in_str($input, 'q')), 0, 100);
    $where = [];
    $params = [];
    if ($q !== '') {
        $like = '%' . addcslashes($q, '\\%_') . '%';
        $where[] = "(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ? OR o.company_name LIKE ?
                     OR o.template_name LIKE ? OR o.domain_primary LIKE ? OR o.domain LIKE ?)";
        $params = array_fill(0, 7, $like);
    }
    // Counts follow the search but not the status tab
    $counts = array_fill_keys(array_keys(PF_STATUS_LABEL), 0);
    $all = 0;
    foreach (db_all($conn, "SELECT o.status, COUNT(*) AS c FROM template_orders o" . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . " GROUP BY o.status", $params) as $r) {
        $counts[$r['status']] = (int)$r['c'];
        $all += (int)$r['c'];
    }
    $counts['all'] = $all;
    if ($status !== '' && $status !== 'all') {
        $where[] = 'o.status = ?';
        $params[] = $status;
    }
    $rows = db_all($conn, pf_order_select() . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . " ORDER BY o.created_at DESC, o.id DESC LIMIT 500", $params);
    return ['orders' => array_map(function ($r) { return pf_order_out($r, true); }, $rows), 'counts' => $counts];
}

function pf_admin_get_template_order(mysqli $conn, array $input, ?array $user): array {
    pf_require_staff($user);
    $order = pf_staff_order($conn, $input);
    $site = db_one($conn, pf_site_select() . " WHERE s.order_id = ? LIMIT 1", [(int)$order['id']]);
    // Fitur tambahan situs pesanan ini (addons: keadaan per fitur, kosong tanpa situs; addon_orders: semua tagihannya)
    $addons = sa_order_addons($conn, $site, (int)$order['id']);
    return [
        'order' => pf_order_out($order, true),
        'logs' => pf_logs($conn, (int)$order['id'], true),
        'site' => $site ? pf_site_out($site, true) : null,
        'renewals' => pf_order_renewals($conn, (int)$order['id'], true),
        'addons' => $addons['addons'],
        'addon_orders' => $addons['addon_orders'],
    ];
}

function pf_admin_approve_template_order(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_staff($user);
    $errors = [];
    $note = pf_str($input, 'note', 'Catatan', 500, false, $errors);
    pf_validate($errors);
    $order = pf_staff_order($conn, $input);
    if (!pf_transition($conn, (int)$order['id'], 'menunggu_approval', 'proses_domain', 'approved_at = NOW(), approved_by = ?', [$user['id']])) {
        throw pf_invalid_status($order['status'], 'proses_domain');
    }
    pf_log($conn, (int)$order['id'], 'approved', 'menunggu_approval', 'proses_domain', 'staff', $user['id'], $note ?? 'Pesanan disetujui.');
    return ['order' => pf_order_out(pf_order_by_id($conn, (int)$order['id']), true)];
}

function pf_admin_reject_template_order(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_staff($user);
    $errors = [];
    $reason = pf_str($input, 'reason', 'Alasan penolakan', 500, true, $errors, 3);
    pf_validate($errors);
    $order = pf_staff_order($conn, $input);
    $from = $order['status'];
    if (!in_array($from, ['menunggu_pembayaran', 'menunggu_approval'], true)
        || !pf_transition($conn, (int)$order['id'], $from, 'ditolak', 'rejected_reason = ?', [$reason])) {
        throw pf_invalid_status($from, 'ditolak');
    }
    pf_log($conn, (int)$order['id'], 'rejected', $from, 'ditolak', 'staff', $user['id'], $reason);
    if ($from === 'menunggu_pembayaran') pf_midtrans_expire($order);
    return ['order' => pf_order_out(pf_order_by_id($conn, (int)$order['id']), true)];
}

// Final domain -> order aktif + site created (CMS opens for the customer)
function pf_admin_set_order_domain(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_staff($user);
    $errors = [];
    $domain = pf_domain($input, 'domain', 'Domain', true, $errors);
    pf_validate($errors);
    $order = pf_staff_order($conn, $input);
    if ($order['status'] !== 'proses_domain') throw pf_invalid_status($order['status'], 'aktif');
    $taken = function () use ($domain) {
        return new ApiError('Domain ' . $domain . ' sudah dipakai situs lain.', 409, 'DOMAIN_TAKEN', ['domain' => 'Domain sudah dipakai situs lain.']);
    };
    if (db_one($conn, "SELECT id FROM template_sites WHERE domain = ? LIMIT 1", [$domain])) throw $taken();

    $orderId = (int)$order['id'];
    $conn->begin_transaction();
    try {
        // Masa aktif hosting & jasa dan domain: 1 tahun sejak situs aktif (bertambah lewat perpanjangan)
        if (!pf_transition($conn, $orderId, 'proses_domain', 'aktif', 'domain = ?, activated_at = NOW(), service_started_at = NOW(),
                service_expires_at = DATE_ADD(NOW(), INTERVAL 1 YEAR), domain_started_at = NOW(), domain_expires_at = DATE_ADD(NOW(), INTERVAL 1 YEAR)', [$domain])) {
            throw pf_invalid_status(pf_order_by_id($conn, $orderId)['status'], 'aktif');
        }
        try {
            db_run($conn, "INSERT INTO template_sites (order_id, user_id, template_id, template_code, domain, status, content, activated_at)
                           VALUES (?, ?, ?, ?, ?, 'active', NULL, NOW())", [
                $orderId, (int)$order['user_id'], $order['template_id'] === null ? null : (int)$order['template_id'], $order['template_code'], $domain,
            ]);
        } catch (ApiError $e) {
            if ($e->status === 409) throw $taken();
            throw $e;
        }
        pf_log($conn, $orderId, 'domain_set', null, null, 'staff', $user['id'], 'Domain: ' . $domain);
        pf_log($conn, $orderId, 'activated', 'proses_domain', 'aktif', 'staff', $user['id'], 'Situs aktif, CMS dibuka untuk pemesan.');
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        throw $e;
    }
    $site = db_one($conn, pf_site_select() . " WHERE s.order_id = ? LIMIT 1", [$orderId]);
    return ['order' => pf_order_out(pf_order_by_id($conn, $orderId), true), 'site' => pf_site_out($site, true)];
}

function pf_admin_get_templates(mysqli $conn, array $input, ?array $user): array {
    pf_require_staff($user);
    return ['templates' => array_map('pf_template_out', db_all($conn, "SELECT * FROM templates ORDER BY sort_order ASC, id ASC"))];
}

function pf_admin_save_template(mysqli $conn, array $input, ?array $user): array {
    pf_require_staff($user);
    $id = in_int($input, 'id');
    $existing = null;
    if ($id > 0) {
        $existing = db_one($conn, "SELECT * FROM templates WHERE id = ? LIMIT 1", [$id]);
        if (!$existing) throw new ApiError('Template tidak ditemukan.', 404, 'TEMPLATE_NOT_FOUND');
    }

    $errors = [];
    $name = pf_str($input, 'name', 'Nama template', 150, true, $errors, 3);
    $category = pf_str($input, 'category', 'Kategori', 80, true, $errors);
    $short = pf_str($input, 'short_description', 'Deskripsi singkat', 255, false, $errors);
    $description = pf_str($input, 'description', 'Deskripsi', 20000, false, $errors);
    $features = pf_string_list($input['features'] ?? [], 30, 200);
    if ($features === null) $errors['features'] = 'Fitur berupa daftar teks (maksimal 30 item, 200 karakter per item).';
    $price = $input['price'] ?? null;
    if (!is_numeric($price) || (float)$price < 0 || (float)$price > 999999999999) {
        $errors['price'] = 'Harga harus berupa angka 0 atau lebih.';
    }
    $templateCode = strtolower(trim(in_str($input, 'template_code')));
    if (!preg_match(PF_TEMPLATE_CODE_PATTERN, $templateCode)) $errors['template_code'] = 'Pilih kode template dari daftar.';
    $demoUrl = pf_str($input, 'demo_url', 'URL demo', 500, false, $errors);
    if ($demoUrl !== null && !preg_match('#^(https?://[^\s]+|/(?!/)[^\s]*)$#i', $demoUrl)) {
        $errors['demo_url'] = 'URL demo harus diawali https:// atau /.';
    }
    $status = in_str($input, 'status', 'draft');
    if (!in_array($status, ['draft', 'published'], true)) $errors['status'] = 'Status harus draft atau published.';
    // Template terbit tanpa harga tidak bisa dibeli (pesanan Rp0 ditolak) dan membatalkan prerender saat deploy
    if ($status === 'published' && !isset($errors['price']) && (float)$price <= 0) {
        $errors['price'] = 'Template yang terbit harus punya harga di atas 0. Simpan sebagai draft bila harganya belum ada.';
    }
    $sortOrder = in_int($input, 'sort_order');
    $preview = $input['preview_image'] ?? null;
    if ($preview !== null && $preview !== '' && !pf_is_image_ref($preview)) {
        $errors['preview_image'] = 'Gambar preview tidak valid.';
    }
    $gallery = $input['gallery'] ?? [];
    if (!is_array($gallery) || count($gallery) > 12 || count(array_filter($gallery, 'pf_is_image_ref')) !== count($gallery)) {
        $errors['gallery'] = 'Galeri berisi maksimal 12 gambar yang valid.';
    }

    $slug = strtolower(trim(in_str($input, 'slug')));
    if ($slug !== '' && (strlen($slug) > 120 || !preg_match(PF_SLUG_PATTERN, $slug))) {
        $errors['slug'] = 'Slug hanya huruf kecil, angka, dan tanda hubung (contoh: company-profile-modern).';
    } elseif (in_array($slug, PF_RESERVED_SLUGS, true)) {
        $errors['slug'] = "Slug \"$slug\" tidak bisa dipakai karena alamat /template/$slug sudah dipakai halaman lain. Pilih slug lain.";
    }
    pf_validate($errors);

    if ($slug === '') {
        // Automatic slug from the name, made unique with -2, -3, ... (a reserved slug also gets a number)
        $base = pf_slugify($name);
        $slug = $base;
        for ($n = 2; in_array($slug, PF_RESERVED_SLUGS, true) || db_one($conn, "SELECT id FROM templates WHERE slug = ? AND id <> ? LIMIT 1", [$slug, $id]); $n++) {
            $slug = substr($base, 0, 110) . '-' . $n;
        }
    } elseif (db_one($conn, "SELECT id FROM templates WHERE slug = ? AND id <> ? LIMIT 1", [$slug, $id])) {
        throw new ApiError('Slug sudah dipakai template lain.', 409, 'SLUG_TAKEN', ['slug' => 'Slug sudah dipakai template lain.']);
    }

    $previewPath = ($preview === null || $preview === '') ? null : save_base64_asset(trim($preview), 'templates', $slug);
    $galleryPaths = [];
    foreach ($gallery as $img) $galleryPaths[] = save_base64_asset(trim($img), 'templates', $slug);

    $values = [
        $slug, $name, $category, $short, $description,
        json_encode($features, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), (float)$price,
        $previewPath, json_encode($galleryPaths, JSON_UNESCAPED_SLASHES), $templateCode, $demoUrl, $status, $sortOrder,
    ];
    if ($existing) {
        $values[] = $id;
        db_run($conn, "UPDATE templates SET slug = ?, name = ?, category = ?, short_description = ?, description = ?, features = ?, price = ?,
                       preview_image = ?, gallery = ?, template_code = ?, demo_url = ?, status = ?, sort_order = ? WHERE id = ?", $values);
        // Uploaded images that were replaced or removed
        $old = array_merge([$existing['preview_image']], pf_json_list($existing['gallery']));
        foreach (array_diff(array_filter($old), array_merge([$previewPath], $galleryPaths)) as $path) pf_delete_generated($path, 'templates');
    } else {
        db_run($conn, "INSERT INTO templates (slug, name, category, short_description, description, features, price,
                       preview_image, gallery, template_code, demo_url, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", $values);
        $id = (int)$conn->insert_id;
    }
    return ['template' => pf_template_out(db_one($conn, "SELECT * FROM templates WHERE id = ? LIMIT 1", [$id]))];
}

// Admin only (ADMIN_ACTIONS). Templates with orders stay, so order history keeps its template.
function pf_admin_delete_template(mysqli $conn, array $input, ?array $user): array {
    pf_require_staff($user);
    $id = in_int($input, 'id');
    $template = $id > 0 ? db_one($conn, "SELECT * FROM templates WHERE id = ? LIMIT 1", [$id]) : null;
    if (!$template) throw new ApiError('Template tidak ditemukan.', 404, 'TEMPLATE_NOT_FOUND');
    if (db_one($conn, "SELECT id FROM template_orders WHERE template_id = ? LIMIT 1", [$id])
        || db_one($conn, "SELECT id FROM template_sites WHERE template_id = ? LIMIT 1", [$id])) {
        throw new ApiError('Template sudah dipakai pesanan sehingga tidak bisa dihapus. Ubah statusnya ke draft agar tidak tampil lagi.', 409, 'TEMPLATE_IN_USE');
    }
    db_run($conn, "DELETE FROM templates WHERE id = ?", [$id]);
    foreach (array_merge([$template['preview_image']], pf_json_list($template['gallery'])) as $path) pf_delete_generated($path, 'templates');
    return [];
}

function pf_admin_get_active_sites(mysqli $conn, array $input, ?array $user): array {
    pf_require_staff($user);
    // The list leaves content out (up to 512 KB per site); admin_get_template_order returns it
    $rows = db_all($conn, pf_site_select(false) . " ORDER BY s.activated_at DESC, s.id DESC LIMIT 500");
    return ['sites' => array_map(function ($r) { return pf_site_out($r, true); }, $rows)];
}

function pf_admin_set_site_status(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_staff($user);
    $status = in_str($input, 'status');
    if (!in_array($status, ['active', 'suspended'], true)) {
        throw new ApiError('Status situs harus active atau suspended.', 400, 'VALIDATION', ['status' => 'Status situs harus active atau suspended.']);
    }
    $site = db_one($conn, pf_site_select() . " WHERE s.id = ? LIMIT 1", [in_int($input, 'id')]);
    if (!$site) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
    if ($site['status'] !== $status) {
        db_run($conn, "UPDATE template_sites SET status = ? WHERE id = ?", [$status, (int)$site['id']]);
        pf_log($conn, (int)$site['order_id'], 'note', null, null, 'staff', $user['id'],
            $status === 'suspended' ? 'Situs ' . $site['domain'] . ' dinonaktifkan sementara.' : 'Situs ' . $site['domain'] . ' diaktifkan kembali.');
        $site = db_one($conn, pf_site_select() . " WHERE s.id = ? LIMIT 1", [(int)$site['id']]);
    }
    return ['site' => pf_site_out($site, true)];
}

// Pengaturan harga domain untuk admin (Pengaturan website > Harga): markup DewaBiz (tidak ikut get_settings publik),
// sumber daftar harga, dan biaya hosting & jasa per tahun yang berlaku
function pf_admin_get_domain_pricing(mysqli $conn, array $input, ?array $user): array {
    pf_require_staff($user);
    $catalog = domain_catalog($conn);
    return [
        'source' => $catalog['source'],
        'markup_percent' => domain_markup_percent($conn),
        'markup_default' => DOMAIN_MARKUP_DEFAULT,
        'hosting_renewal_price' => pf_hosting_renewal_price($conn),
    ];
}

function pf_admin_dashboard_summary(mysqli $conn, array $input, ?array $user): array {
    pf_require_staff($user);
    $monthStart = "DATE_FORMAT(NOW(), '%Y-%m-01')";
    $byStatus = array_fill_keys(array_keys(PF_STATUS_LABEL), 0);
    foreach (db_all($conn, "SELECT status, COUNT(*) AS c FROM template_orders GROUP BY status") as $r) $byStatus[$r['status']] = (int)$r['c'];
    $orders = db_one($conn, "SELECT COUNT(*) AS total, COALESCE(SUM(created_at >= $monthStart), 0) AS this_month FROM template_orders");
    $projects = db_one($conn, "SELECT COUNT(*) AS total, COALESCE(SUM(created_at >= $monthStart), 0) AS this_month,
                                      COALESCE(SUM(source = 'website' AND status = 'pending'), 0) AS from_website_pending,
                                      COALESCE(SUM(CASE WHEN status <> 'canceled' THEN price ELSE 0 END), 0) AS custom_total
                               FROM project_client");
    $paid = db_one($conn, "SELECT COALESCE(SUM(price), 0) AS s FROM template_orders
                           WHERE paid_at IS NOT NULL AND status IN ('menunggu_approval', 'proses_domain', 'aktif')");
    $recent = db_all($conn, pf_order_select() . " ORDER BY o.created_at DESC, o.id DESC LIMIT 5");
    return [
        'template_orders' => ['total' => (int)$orders['total'], 'this_month' => (int)$orders['this_month'], 'by_status' => $byStatus],
        'custom_projects' => [
            'total' => (int)$projects['total'],
            'this_month' => (int)$projects['this_month'],
            'from_website_pending' => (int)$projects['from_website_pending'],
        ],
        'revenue' => ['template_paid' => pf_num($paid['s']), 'custom_total' => pf_num($projects['custom_total'])],
        'recent_template_orders' => array_map(function ($r) { return pf_order_out($r, true); }, $recent),
    ];
}

// ════════════════════════════════════════════════════════════════════════════
// Order state machine and payments
// ════════════════════════════════════════════════════════════════════════════

// Conditional status change: only succeeds while the order still has status $from (no race, no double webhook)
function pf_transition(mysqli $conn, int $orderId, string $from, string $to, string $extraSet = '', array $extraParams = []): bool {
    db_run($conn, "UPDATE template_orders SET status = ?" . ($extraSet !== '' ? ", $extraSet" : '') . " WHERE id = ? AND status = ?",
        array_merge([$to], $extraParams, [$orderId, $from]));
    return db_affected_rows() > 0;
}

function pf_invalid_status(string $current, string $target): ApiError {
    return new ApiError('Pesanan berstatus "' . (PF_STATUS_LABEL[$current] ?? $current) . '" sehingga tidak bisa diubah menjadi "'
        . (PF_STATUS_LABEL[$target] ?? $target) . '".', 409, 'INVALID_STATUS');
}

// One place for every payment result (Midtrans webhook and dev_simulate_payment):
//   settlement / capture+accept -> menunggu_approval (+ paid_at)
//   deny / cancel / expire / failure -> dibatalkan, only for the current attempt while still menunggu_pembayaran
//   pending -> unchanged; refund* / chargeback -> logged only
function pf_apply_payment(mysqli $conn, array $order, string $tx, string $fraud, ?string $paymentType, string $actorType,
                          ?int $actorId, array $payload, bool $isCurrentAttempt, ?string $storedStatus = null): void {
    $orderId = (int)$order['id'];
    $tx = strtolower($tx);
    $fraud = strtolower($fraud);
    $paid = $tx === 'settlement' || ($tx === 'capture' && $fraud === 'accept');
    $failed = in_array($tx, ['deny', 'cancel', 'expire', 'failure'], true);
    $from = null;
    $to = null;
    $note = null;

    if ($paid) {
        if (pf_transition($conn, $orderId, 'menunggu_pembayaran', 'menunggu_approval', 'paid_at = NOW()')) {
            [$from, $to] = ['menunggu_pembayaran', 'menunggu_approval'];
            $note = $storedStatus === 'simulated' ? 'Pembayaran simulasi diterima (mode pengembangan).' : 'Pembayaran diterima.';
        } elseif ($order['paid_at'] === null && in_array($order['status'], ['dibatalkan', 'ditolak'], true)) {
            $note = 'Pembayaran diterima, tetapi pesanan sudah berstatus ' . PF_STATUS_LABEL[$order['status']] . '. Perlu ditindaklanjuti manual (refund).';
        }
    } elseif ($failed && $isCurrentAttempt) {
        if (pf_transition($conn, $orderId, 'menunggu_pembayaran', 'dibatalkan', 'cancelled_at = NOW()')) {
            [$from, $to] = ['menunggu_pembayaran', 'dibatalkan'];
            $note = 'Pembayaran ' . $tx . ', pesanan dibatalkan otomatis.';
        }
    } elseif (strpos($tx, 'refund') !== false || $tx === 'chargeback' || $tx === 'partial_chargeback') {
        $note = 'Refund/chargeback tercatat (' . $tx . '); status pesanan tidak diubah.';
    } elseif ($tx === 'capture') {
        $note = 'Pembayaran kartu menunggu tinjauan fraud (' . ($fraud !== '' ? $fraud : '-') . ').';
    }

    // An old attempt's failure must not overwrite the payment fields of the current attempt
    $paymentChanged = false;
    if ($isCurrentAttempt || $paid) {
        $newStatus = $storedStatus ?? ($tx !== '' ? $tx : 'pending');
        $paymentChanged = $order['payment_status'] !== $newStatus || ($paymentType !== null && $order['payment_type'] !== $paymentType);
        if ($paymentChanged) {
            db_run($conn, "UPDATE template_orders SET payment_status = ?, payment_type = COALESCE(?, payment_type) WHERE id = ?",
                [mb_substr($newStatus, 0, 30), $paymentType === null ? null : mb_substr($paymentType, 0, 40), $orderId]);
        }
    }
    // Duplicate notifications change nothing and are not logged again
    if ($to !== null || $paymentChanged || $note !== null) {
        pf_log($conn, $orderId, 'payment_update', $from, $to, $actorType, $actorId, $note ?? ('Status pembayaran: ' . ($tx !== '' ? $tx : '-')), $payload);
    }
}

// New Snap transaction (attempt + 1). Returns ['payment_url' => ?string, 'error' => ?string].
function pf_create_snap(mysqli $conn, array $order): array {
    $cfg = pf_midtrans_config();
    if ($cfg['server_key'] === '') return ['payment_url' => null, 'error' => 'Pembayaran online belum dikonfigurasi.'];
    $orderId = (int)$order['id'];
    $attempt = (int)$order['payment_attempt'] + 1;
    // Claim the attempt number first: Midtrans order_id must never be reused, even after a timeout
    db_run($conn, "UPDATE template_orders SET payment_attempt = ? WHERE id = ? AND payment_attempt = ? AND status = 'menunggu_pembayaran'",
        [$attempt, $orderId, $attempt - 1]);
    if (db_affected_rows() === 0) {
        $fresh = pf_order_by_id($conn, $orderId);
        if ($fresh['status'] === 'menunggu_pembayaran' && $fresh['payment_url']) return ['payment_url' => $fresh['payment_url'], 'error' => null];
        return ['payment_url' => null, 'error' => 'Pembayaran sedang diproses. Muat ulang halaman lalu coba lagi.'];
    }

    $midtransOrderId = $order['order_number'] . '-' . $attempt;
    $amount = (int)round((float)$order['price']);
    $appUrl = rtrim(env_value('APP_URL', 'http://localhost:5173'), '/');
    // Template (setelah diskon) + domain tahun pertama; jumlah item = gross_amount
    $domainAmount = (int)round((float)($order['domain_price'] ?? 0));
    $items = [];
    if ($amount - $domainAmount > 0) {
        $items[] = [
            'id' => 'TPL-' . ($order['template_id'] === null ? 0 : (int)$order['template_id']),
            'price' => $amount - $domainAmount,
            'quantity' => 1,
            'name' => mb_substr($order['template_name'], 0, 50),
        ];
    }
    if ($domainAmount > 0) {
        $tld = domain_tld($order['domain_primary'], domain_catalog($conn)['tlds']);
        $items[] = [
            'id' => 'DOM-' . ($tld ? $tld['tld'] : 'domain'),
            'price' => $domainAmount,
            'quantity' => 1,
            'name' => mb_substr('Domain ' . $order['domain_primary'] . ' (1 tahun)', 0, 50),
        ];
    }
    $response = pf_midtrans_request('POST', $cfg['snap_url'], $cfg['server_key'], [
        'transaction_details' => ['order_id' => $midtransOrderId, 'gross_amount' => $amount],
        'item_details' => $items,
        'customer_details' => [
            'first_name' => mb_substr($order['customer_name'], 0, 50),
            'email' => $order['customer_email'],
            'phone' => $order['customer_phone'],
        ],
        'callbacks' => ['finish' => $appUrl . '/akun/pesanan/' . rawurlencode($order['order_number'])],
    ], 20);
    $body = $response['body'];
    if (($response['code'] !== 200 && $response['code'] !== 201) || !is_array($body) || empty($body['token']) || empty($body['redirect_url'])) {
        $detail = is_array($body) && isset($body['error_messages']) ? implode('; ', (array)$body['error_messages']) : $response['error'];
        error_log('[midtrans] Snap transaction failed for ' . $midtransOrderId . ': HTTP ' . $response['code'] . ' ' . $detail);
        pf_log($conn, $orderId, 'note', null, null, 'system', null, mb_substr('Gagal membuat transaksi Midtrans (percobaan ' . $attempt . '): HTTP ' . $response['code'] . ' ' . $detail, 0, 500));
        return ['payment_url' => null, 'error' => 'Gagal membuat pembayaran online. Silakan coba lagi beberapa saat lagi.'];
    }
    db_run($conn, "UPDATE template_orders SET midtrans_order_id = ?, snap_token = ?, payment_url = ?, payment_status = 'pending', payment_type = NULL
                   WHERE id = ? AND status = 'menunggu_pembayaran'", [$midtransOrderId, (string)$body['token'], (string)$body['redirect_url'], $orderId]);
    pf_log($conn, $orderId, 'payment_created', null, null, 'system', null, 'Tagihan pembayaran dibuat (percobaan ' . $attempt . ').');
    return ['payment_url' => (string)$body['redirect_url'], 'error' => null];
}

// Best effort: a cancelled/rejected order's open Midtrans transaction is expired so it cannot be paid anymore
function pf_midtrans_expire(array $order): void {
    $cfg = pf_midtrans_config();
    if ($cfg['server_key'] === '' || empty($order['midtrans_order_id']) || $order['payment_status'] !== 'pending') return;
    $result = pf_midtrans_request('POST', $cfg['api_base'] . '/v2/' . rawurlencode($order['midtrans_order_id']) . '/expire', $cfg['server_key'], null, 5);
    if ($result['code'] !== 200) error_log('[midtrans] expire ' . $order['midtrans_order_id'] . ': HTTP ' . $result['code'] . ' ' . $result['error']);
}

function pf_midtrans_config(): array {
    $flag = function ($key) { return in_array(strtolower(env_value($key, '0')), ['1', 'true', 'yes'], true); };
    $production = $flag('MIDTRANS_IS_PRODUCTION');
    $clientKey = env_value('MIDTRANS_CLIENT_KEY');
    $test = pf_midtrans_test_url();
    return [
        'server_key' => env_value('MIDTRANS_SERVER_KEY'),
        'client_key' => $clientKey !== '' ? $clientKey : null,
        'is_production' => $production,
        'simulator' => !$production && $flag('MIDTRANS_SIMULATOR'),
        'snap_url' => $test !== '' ? $test . '/snap/v1/transactions'
            : ($production ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions'),
        'api_base' => $test !== '' ? $test : ($production ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'),
    ];
}

// Tes saja: MIDTRANS_TEST_URL (http://127.0.0.1:<port> atau http://localhost:<port>) menggantikan Snap dan API Midtrans
// dengan server palsu (__tests__/backend/site-addons.test.ts). Diabaikan bila MIDTRANS_IS_PRODUCTION aktif atau hostnya
// lain, jadi server key tidak pernah terkirim ke luar mesin ini. Same rule in templates.js (midtransTestUrl).
function pf_midtrans_test_url(): string {
    if (in_array(strtolower(env_value('MIDTRANS_IS_PRODUCTION', '0')), ['1', 'true', 'yes'], true)) return '';
    $url = rtrim(env_value('MIDTRANS_TEST_URL'), '/');
    return preg_match('#^http://(127\.0\.0\.1|localhost)(:[0-9]{1,5})?$#D', $url) ? $url : '';
}

// HTTPS JSON request to Midtrans with Basic auth (server key). Never throws. Plain http only to the fake server of
// MIDTRANS_TEST_URL (tests).
function pf_midtrans_request(string $method, string $url, string $serverKey, ?array $body, int $timeout): array {
    $test = pf_midtrans_test_url();
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'Content-Type: application/json', 'Authorization: Basic ' . base64_encode($serverKey . ':')],
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_PROTOCOLS => $test !== '' && strpos($url, $test . '/') === 0 ? CURLPROTO_HTTP : CURLPROTO_HTTPS,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    elseif ($method === 'POST') curl_setopt($ch, CURLOPT_POSTFIELDS, '');
    $raw = curl_exec($ch);
    $result = [
        'code' => (int)curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'error' => curl_error($ch),
        'body' => is_string($raw) ? json_decode($raw, true) : null,
    ];
    curl_close($ch);
    return $result;
}

// Order of a Midtrans order_id: the current attempt, or an older attempt of the same order (GN-...-<n>)
function pf_order_by_midtrans_id(mysqli $conn, string $midtransOrderId): ?array {
    $row = db_one($conn, pf_order_select() . " WHERE o.midtrans_order_id = ? LIMIT 1", [$midtransOrderId]);
    if (!$row && preg_match('/^(GN-\d{8}-[A-Z0-9]{6})-(\d+)$/', $midtransOrderId, $m)) {
        $row = db_one($conn, pf_order_select() . " WHERE o.order_number = ? AND o.payment_attempt >= ? LIMIT 1", [$m[1], (int)$m[2]]);
    }
    return $row;
}

// Notification fields kept in the log: no signature, no card data
function pf_payment_payload(array $data): array {
    $keep = ['order_id', 'transaction_id', 'transaction_status', 'fraud_status', 'payment_type', 'status_code', 'status_message',
             'gross_amount', 'currency', 'transaction_time', 'settlement_time', 'expiry_time', 'bank', 'store', 'issuer', 'acquirer'];
    $out = [];
    foreach ($keep as $k) {
        if (isset($data[$k]) && is_scalar($data[$k])) $out[$k] = mb_substr((string)$data[$k], 0, 200);
    }
    if (isset($data['va_numbers']) && is_array($data['va_numbers'])) {
        $out['va_banks'] = array_values(array_filter(array_map(function ($v) { return is_array($v) ? (string)($v['bank'] ?? '') : ''; }, $data['va_numbers'])));
    }
    return $out;
}

function pf_same_amount(string $gross, $price): bool {
    return is_numeric($gross) && (int)round((float)$gross) === (int)round((float)$price);
}

// GN-YYYYMMDD-XXXXXX (pesanan) or GNR-YYYYMMDD-XXXXXX (perpanjangan), date in Asia/Jakarta
function pf_new_order_number(string $prefix = 'GN'): string {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $suffix = '';
    for ($i = 0; $i < 6; $i++) $suffix .= $chars[random_int(0, 35)];
    return $prefix . '-' . (new DateTime('now', new DateTimeZone('Asia/Jakarta')))->format('Ymd') . '-' . $suffix;
}

function pf_log(mysqli $conn, int $orderId, string $event, ?string $from, ?string $to, string $actorType, ?int $actorId,
                ?string $note = null, ?array $payload = null): void {
    db_run($conn, "INSERT INTO template_order_logs (order_id, event, from_status, to_status, actor_type, actor_id, note, payload)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        $orderId, $event, $from, $to, $actorType, $actorId,
        $note === null ? null : mb_substr($note, 0, 500),
        $payload === null ? null : json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
}

// ════════════════════════════════════════════════════════════════════════════
// Loading and output shapes (SPEC §6)
// ════════════════════════════════════════════════════════════════════════════

function pf_order_select(): string {
    return "SELECT o.*, t.slug AS template_slug, s.id AS site_id, u.name AS user_name, u.email AS user_email
              FROM template_orders o
              LEFT JOIN templates t ON t.id = o.template_id
              LEFT JOIN template_sites s ON s.order_id = o.id
              LEFT JOIN users u ON u.id = o.user_id";
}

function pf_order_by_id(mysqli $conn, int $id): array {
    $row = db_one($conn, pf_order_select() . " WHERE o.id = ? LIMIT 1", [$id]);
    if (!$row) throw new ApiError('Pesanan tidak ditemukan.', 404, 'ORDER_NOT_FOUND');
    return $row;
}

// Someone else's order answers exactly like a missing one (no IDOR, no existence leak)
function pf_customer_order(mysqli $conn, array $input, array $user): array {
    $number = strtoupper(trim(in_str($input, 'order_number')));
    $row = $number === '' ? null : db_one($conn, pf_order_select() . " WHERE o.order_number = ? AND o.user_id = ? LIMIT 1", [$number, $user['id']]);
    if (!$row) throw new ApiError('Pesanan tidak ditemukan.', 404, 'ORDER_NOT_FOUND');
    return $row;
}

function pf_staff_order(mysqli $conn, array $input): array {
    $id = in_int($input, 'id');
    if ($id <= 0) throw new ApiError('Pesanan tidak ditemukan.', 404, 'ORDER_NOT_FOUND');
    return pf_order_by_id($conn, $id);
}

function pf_order_out(array $r, bool $staff): array {
    $status = $r['status'];
    $out = [
        'id' => (int)$r['id'],
        'order_number' => $r['order_number'],
        'template_id' => $r['template_id'] === null ? null : (int)$r['template_id'],
        'template_name' => $r['template_name'],
        'template_code' => $r['template_code'],
        'template_slug' => $r['template_slug'] ?? null,
        'price' => pf_num($r['price']),
        // Harga katalog & diskon pesanan pertama; pesanan lama (sebelum kolom ini ada) = tanpa diskon
        'list_price' => pf_num($r['list_price'] ?? $r['price']),
        'discount_amount' => pf_num($r['discount_amount'] ?? 0),
        'discount_code' => $r['discount_code'] ?? null,
        'customer_name' => $r['customer_name'],
        'customer_email' => $r['customer_email'],
        'customer_phone' => $r['customer_phone'],
        'company_name' => $r['company_name'],
        'notes' => $r['notes'],
        'domain_primary' => $r['domain_primary'],
        'domain_alternative' => $r['domain_alternative'],
        'domain' => $r['domain'],
        'status' => $status,
        'status_label' => PF_STATUS_LABEL[$status] ?? $status,
        'payment_status' => $r['payment_status'],
        'payment_type' => $r['payment_type'],
        // Only the owner gets the payment link, and only while there is something to pay
        'payment_url' => (!$staff && $status === 'menunggu_pembayaran') ? $r['payment_url'] : null,
        'paid_at' => $r['paid_at'],
        'approved_at' => $r['approved_at'],
        'rejected_reason' => $r['rejected_reason'],
        'activated_at' => $r['activated_at'],
        'cancelled_at' => $r['cancelled_at'],
        'created_at' => $r['created_at'],
        'updated_at' => $r['updated_at'],
        'site_id' => isset($r['site_id']) && $r['site_id'] !== null ? (int)$r['site_id'] : null,
        // Domain berbayar & masa aktif (migrasi 026); pesanan lama: domain_price 0, tanggal NULL
        'domain_price' => pf_num($r['domain_price'] ?? 0),
        'domain_check' => $r['domain_check'] ?? null,
        'invoice_number' => $r['paid_at'] !== null ? 'INV-' . $r['order_number'] : null,
        'service_started_at' => $r['service_started_at'] ?? null,
        'service_expires_at' => $r['service_expires_at'] ?? null,
        'domain_started_at' => $r['domain_started_at'] ?? null,
        'domain_expires_at' => $r['domain_expires_at'] ?? null,
    ];
    if ($staff) $out['user'] = ['id' => (int)$r['user_id'], 'name' => $r['user_name'] ?? null, 'email' => $r['user_email'] ?? null];
    return $out;
}

function pf_logs(mysqli $conn, int $orderId, bool $staff): array {
    $rows = db_all($conn, "SELECT l.*, u.name AS user_name FROM template_order_logs l
                           LEFT JOIN users u ON u.id = l.actor_id AND l.actor_type IN ('staff', 'customer')
                           WHERE l.order_id = ? ORDER BY l.created_at ASC, l.id ASC", [$orderId]);
    return array_map(function ($r) use ($staff) {
        $names = ['midtrans' => 'Midtrans', 'system' => 'Sistem'];
        $actorName = $names[$r['actor_type']] ?? $r['user_name'];
        if ($r['actor_type'] === 'staff' && !$staff) $actorName = 'Tim Garuda Nexa';
        // Customers only get the rejection reason and the server-written renewal / add-on notes; other notes are internal
        // (admin notes, Midtrans/test-mode details)
        $note = ($staff || in_array($r['event'], PF_CUSTOMER_NOTE_EVENTS, true)) ? $r['note'] : null;
        $log = [
            'id' => (int)$r['id'],
            'event' => $r['event'],
            'from_status' => $r['from_status'],
            'to_status' => $r['to_status'],
            'actor_type' => $r['actor_type'],
            'actor_name' => $actorName,
            'note' => $note,
            'created_at' => $r['created_at'],
        ];
        if ($staff) $log['payload'] = $r['payload'] !== null ? json_decode($r['payload'], true) : null;
        return $log;
    }, $rows);
}

function pf_site_select(bool $withContent = true): string {
    return "SELECT s.id, s.order_id, s.user_id, s.template_id, s.template_code, s.domain, s.status, s.activated_at, s.updated_at, "
        . ($withContent ? 's.content' : 'NULL AS content')
        . ", o.order_number, o.template_name, o.service_expires_at, o.domain_expires_at, u.name AS owner_name, u.email AS owner_email
              FROM template_sites s
              JOIN template_orders o ON o.id = s.order_id
              LEFT JOIN users u ON u.id = s.user_id";
}

function pf_customer_site(mysqli $conn, array $input, array $user): array {
    $siteId = in_int($input, 'site_id');
    $row = $siteId > 0 ? db_one($conn, pf_site_select() . " WHERE s.id = ? AND s.user_id = ? LIMIT 1", [$siteId, $user['id']]) : null;
    if (!$row) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
    return $row;
}

function pf_site_out(array $r, bool $staff): array {
    $out = [
        'id' => (int)$r['id'],
        'order_id' => (int)$r['order_id'],
        'order_number' => $r['order_number'],
        'user_id' => (int)$r['user_id'],
        'template_id' => $r['template_id'] === null ? null : (int)$r['template_id'],
        'template_code' => $r['template_code'],
        'template_name' => $r['template_name'],
        'domain' => $r['domain'],
        'status' => $r['status'],
        'content' => pf_content_out($r['content']),
        'activated_at' => $r['activated_at'],
        'updated_at' => $r['updated_at'],
        // Masa aktif pesanan induk (migrasi 026)
        'service_expires_at' => $r['service_expires_at'] ?? null,
        'domain_expires_at' => $r['domain_expires_at'] ?? null,
    ];
    if ($staff) {
        $out['owner_name'] = $r['owner_name'];
        $out['owner_email'] = $r['owner_email'];
    }
    return $out;
}

// Site for its owner (customer_get_site, customer_save_site_content): pf_site_out + addons (SiteAddonFlags: posts = news &
// announcements switched on) + posts_capable (the template has news & announcements; the add-on unlocks them)
function pf_customer_site_out(mysqli $conn, array $r): array {
    $out = pf_site_out($r, false);
    $out['addons'] = sa_site_flags($conn, $r);
    $out['posts_capable'] = sp_has_posts((string)$r['template_code']);
    return $out;
}

// Stored content as an object (json_decode without assoc keeps {} as {}); NULL = template default
function pf_content_out($json) {
    if ($json === null || $json === '') return null;
    $value = json_decode($json);
    return $value instanceof stdClass ? $value : null;
}

function pf_template_out(array $r): array {
    return [
        'id' => (int)$r['id'],
        'slug' => $r['slug'],
        'name' => $r['name'],
        'category' => $r['category'],
        'short_description' => $r['short_description'],
        'description' => $r['description'],
        'features' => pf_json_list($r['features']),
        'price' => pf_num($r['price']),
        'preview_image' => $r['preview_image'],
        'gallery' => pf_json_list($r['gallery']),
        'template_code' => $r['template_code'],
        'demo_url' => $r['demo_url'],
        'status' => $r['status'],
        'sort_order' => (int)$r['sort_order'],
        // Suka & dilihat (kartu katalog); 0 sebelum migrasi 013. Terjual hanya dihitung di daftar & detail publik.
        'like_count' => (int)($r['like_count'] ?? 0),
        'view_count' => (int)($r['view_count'] ?? 0),
        'sold_count' => (int)($r['sold_count'] ?? 0),
        'created_at' => $r['created_at'],
        'updated_at' => $r['updated_at'],
    ];
}

// ════════════════════════════════════════════════════════════════════════════
// Site content (CMS)
// ════════════════════════════════════════════════════════════════════════════

// Validates the content tree and swaps every data: URI for a placeholder; $images collects the uploads.
// Objects = sections/items (keys [A-Za-z0-9_-]), arrays = lists, scalars = field values.
function pf_walk_content($node, int $depth, array &$images) {
    if ($depth > 6) throw new ApiError('Struktur konten terlalu dalam.', 400, 'INVALID_CONTENT');
    if ($node instanceof stdClass) {
        $out = new stdClass();
        foreach (get_object_vars($node) as $key => $value) {
            $key = (string)$key;
            if (!preg_match('/^[A-Za-z0-9_-]{1,64}$/', $key) || in_array($key, ['__proto__', 'constructor', 'prototype'], true)) {
                throw new ApiError('Nama field konten tidak valid: ' . mb_substr($key, 0, 40), 400, 'INVALID_CONTENT');
            }
            $out->$key = pf_walk_content($value, $depth + 1, $images);
        }
        return $out;
    }
    if (is_array($node)) {
        if (count($node) > 100) throw new ApiError('Satu daftar berisi maksimal 100 item.', 400, 'INVALID_CONTENT');
        $list = [];
        foreach ($node as $value) $list[] = pf_walk_content($value, $depth + 1, $images);
        return $list;
    }
    if (is_string($node)) {
        if (preg_match('/^\s*data:/i', $node)) {
            if (count($images) >= PF_SITE_IMAGE_MAX_COUNT) {
                throw new ApiError('Maksimal ' . PF_SITE_IMAGE_MAX_COUNT . ' gambar baru dalam sekali simpan.', 400, 'INVALID_CONTENT');
            }
            if (!preg_match('/^\s*data:[^,]*;base64,/i', $node, $m) || strlen($node) - strlen($m[0]) > ceil(PF_SITE_IMAGE_MAX_BYTES * 4 / 3) + 4) {
                throw new ApiError('Ukuran gambar maksimal 2 MB.', 400, 'IMAGE_TOO_LARGE');
            }
            [, $ext] = parse_upload(trim($node), false); // images only
            // Customer uploads are served from the main origin: raster formats only (an SVG can carry script)
            if (!in_array($ext, PF_SITE_IMAGE_EXTS, true)) {
                throw new ApiError('Format gambar tidak didukung. Gunakan PNG, JPG, WEBP, atau GIF.', 400, 'INVALID_IMAGE');
            }
            $placeholder = 'gn-upload-' . count($images) . '-' . bin2hex(random_bytes(8));
            $images[$placeholder] = ['data' => trim($node), 'ext' => $ext];
            return $placeholder;
        }
        if (mb_strlen($node) > 20000) throw new ApiError('Teks konten terlalu panjang (maksimal 20.000 karakter per field).', 400, 'INVALID_CONTENT');
        return $node;
    }
    if ($node === null || is_bool($node) || is_int($node) || is_float($node)) return $node;
    throw new ApiError('Format konten tidak valid.', 400, 'INVALID_CONTENT');
}

// Removes uploaded images of this site that the saved content no longer references
function pf_cleanup_site_assets(int $siteId, string $json): void {
    $folder = public_dir() . '/assets/sites/' . $siteId;
    if (!is_dir($folder)) return;
    foreach (scandir($folder) ?: [] as $file) {
        if (!preg_match('/^[A-Za-z0-9_-]+\.[a-z0-9]+$/', $file)) continue;
        $path = '/assets/sites/' . $siteId . '/' . $file;
        if (strpos($json, $path) === false) delete_local_asset($path, 'sites/' . $siteId);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Small helpers: roles, validation, values
// ════════════════════════════════════════════════════════════════════════════

function pf_require_customer(?array $user): array {
    if (!$user) throw new ApiError('Silakan masuk terlebih dahulu.', 401, 'UNAUTHORIZED');
    if ($user['role'] !== 'customer') throw new ApiError('Akses ditolak: aksi ini khusus akun pembeli.', 403, 'FORBIDDEN');
    return $user;
}

function pf_require_staff(?array $user): array {
    if (!$user) throw new ApiError('Sesi tidak valid atau sudah berakhir. Silakan login kembali.', 401, 'UNAUTHORIZED');
    if (!in_array($user['role'], ['admin', 'user'], true)) throw new ApiError('Akses ditolak.', 403, 'FORBIDDEN');
    return $user;
}

// Throws one VALIDATION error carrying every field message ({error, code, errors: {field: message}})
function pf_validate(array $errors): void {
    if ($errors) throw new ApiError(reset($errors), 400, 'VALIDATION', $errors);
}

// Trimmed text field; null when empty (and optional) or invalid (message in $errors[$key])
function pf_str(array $input, string $key, string $label, int $max, bool $required, array &$errors, int $min = 0): ?string {
    $raw = $input[$key] ?? null;
    if (is_array($raw) || is_bool($raw) || is_object($raw)) {
        $errors[$key] = "$label tidak valid.";
        return null;
    }
    $value = trim((string)$raw);
    if ($value === '') {
        if ($required) $errors[$key] = "$label wajib diisi.";
        return null;
    }
    $length = mb_strlen($value);
    if ($length > $max) {
        $errors[$key] = "$label maksimal $max karakter.";
        return null;
    }
    if ($length < $min) {
        $errors[$key] = "$label minimal $min karakter.";
        return null;
    }
    return $value;
}

function pf_email(array $input, string $key, string $label, bool $required, array &$errors): ?string {
    $value = pf_str($input, $key, $label, 150, $required, $errors);
    if ($value === null) return null;
    if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
        $errors[$key] = 'Format email tidak valid, contoh: nama@email.com';
        return null;
    }
    return strtolower($value);
}

function pf_phone(array $input, string $key, string $label, bool $required, array &$errors): ?string {
    $value = pf_str($input, $key, $label, 30, $required, $errors);
    if ($value === null) return null;
    $normalized = preg_replace('/[\s().-]+/', '', $value);
    if (!preg_match('/^\+?[0-9]{8,15}$/', $normalized)) {
        $errors[$key] = "$label tidak valid. Gunakan 8-15 digit angka, contoh: 081234567890.";
        return null;
    }
    return $normalized;
}

function pf_domain(array $input, string $key, string $label, bool $required, array &$errors): ?string {
    $value = pf_str($input, $key, $label, 253, $required, $errors);
    if ($value === null) return null;
    $domain = strtolower($value);
    if (!preg_match(PF_DOMAIN_PATTERN, $domain)) {
        $errors[$key] = 'Format domain tidak valid, contoh: namabisnis.com';
        return null;
    }
    return $domain;
}

// List of non-empty strings (array, JSON array text or one item per line); null when invalid
function pf_string_list($value, int $maxItems, int $maxLength): ?array {
    if (is_string($value)) {
        $decoded = json_decode($value, true);
        $value = is_array($decoded) ? $decoded : preg_split('/\r?\n/', $value);
    }
    if (!is_array($value)) return null;
    $list = [];
    foreach ($value as $item) {
        if (!is_string($item) && !is_int($item) && !is_float($item)) return null;
        $item = trim((string)$item);
        if ($item === '') continue;
        if (mb_strlen($item) > $maxLength) return null;
        $list[] = $item;
    }
    return count($list) > $maxItems ? null : $list;
}

// Image value for templates: a new upload (data URI), a site path (/assets/...) or an http(s) URL
function pf_is_image_ref($value): bool {
    if (!is_string($value)) return false;
    $value = trim($value);
    return (bool)preg_match('#^(data:image/[a-z0-9.+-]+;base64,|/(?!/)\S+$|https?://\S+$)#i', $value);
}

function pf_delete_generated($path, string $section): void {
    if (is_string($path) && preg_match(PF_GENERATED_ASSET, $path)) delete_local_asset($path, $section);
}

function pf_slugify(string $text): string {
    $slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($text)), '-');
    return substr($slug, 0, 100) ?: 'template';
}

function pf_json_list($value): array {
    $list = is_string($value) ? json_decode($value, true) : null;
    return is_array($list) ? array_values(array_filter($list, 'is_string')) : [];
}

// Rupiah as a JSON number: 1500000.00 -> 1500000
function pf_num($value) {
    $number = (float)$value;
    return floor($number) === $number && abs($number) < 1e15 ? (int)$number : $number;
}

// Raw scalar as a string, untrimmed (Midtrans signs the exact values)
function pf_scalar(array $input, string $key): string {
    $value = $input[$key] ?? '';
    return is_scalar($value) && !is_bool($value) ? (string)$value : '';
}
