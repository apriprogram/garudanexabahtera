<?php
// PHP API for local development (php -S / XAMPP) and PHP hosting. Production behind nginx runs
// backend/server.js; the security rules below mirror backend/security.js — keep the action lists in sync.

// Errors are logged, never printed: a printed warning breaks the JSON and leaks internals
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('memory_limit', '256M');
ini_set('max_execution_time', '300');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// API URLs never belong in search results: robots.txt lets crawlers fetch the public read actions (pages need their
// data to render), so every response, errors and file downloads included, says noindex. Same header in security.js.
header('X-Robots-Tag: noindex');

// An error whose message is safe to show to the client (validation, auth, rate limit).
// $fieldErrors (field => message) is sent as `errors` so forms can show messages under each field.
class ApiError extends Exception {
    public $status;
    public $errorCode;
    public $fieldErrors;
    public function __construct($message, $status = 400, $errorCode = null, $fieldErrors = null) {
        parent::__construct($message);
        $this->status = $status;
        $this->errorCode = $errorCode;
        $this->fieldErrors = $fieldErrors;
    }
}

const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';

// ── Access policy (same lists as backend/security.js, docs/platform/SPEC.md §2) ──
// Default deny: an action that is not public needs a valid token. ANY_ROLE_ACTIONS accept every logged-in role;
// customer tokens may only call CUSTOMER_ACTIONS; everything else is a staff action (role admin or user),
// ADMIN_ACTIONS admin only. Project documents (pd_*): docs/platform/PROJECT-DOCS-SPEC.md §5.
const PUBLIC_ACTIONS = [
    'get_settings', 'track_visit', 'login', 'register', 'get_list_products', 'get_navbar_menus',
    'get_templates', 'get_template', 'get_public_projects', 'get_site_public', 'submit_custom_order',
    'customer_register', 'midtrans_notification', 'get_payment_config', 'template_like', 'template_view',
    'get_showcase_stats', 'showcase_like', 'showcase_view', 'nexa_chat',
    'get_guides', 'get_guide', 'guide_view',
];
const ANY_ROLE_ACTIONS = [
    'pd_notifications_list', 'pd_notifications_read', 'pd_file',
];
const CUSTOMER_ACTIONS = [
    'customer_create_order', 'customer_pay_order', 'customer_get_orders', 'customer_get_order',
    'customer_cancel_order', 'customer_get_site', 'customer_save_site_content', 'dev_simulate_payment', 'customer_get_order_quote',
    'pd_my_projects', 'pd_my_project', 'pd_my_document', 'pd_my_document_decide',
];
const ADMIN_ACTIONS = [
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
    'nexa_get_config', 'nexa_save_config',
    'admin_get_guides', 'admin_save_guide', 'admin_delete_guide',
];
const STAFF_ROLES = ['admin', 'user'];
const USER_ROLES = ['admin', 'user', 'customer'];

// ── Upload allowlist ──
const UPLOAD_DOCUMENT_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'txt', 'csv', 'rtf', 'zip', 'rar', '7z'];
// Signatures checked for binary formats; text formats (txt, csv, rtf) have none
const UPLOAD_MAGIC = [
    'pdf' => '25504446', 'doc' => 'd0cf11e0', 'xls' => 'd0cf11e0', 'ppt' => 'd0cf11e0',
    'docx' => '504b0304', 'xlsx' => '504b0304', 'pptx' => '504b0304', 'odt' => '504b0304', 'ods' => '504b0304', 'odp' => '504b0304',
    'zip' => '504b0304', 'rar' => '52617221', '7z' => '377abcaf',
];

set_exception_handler(function ($e) {
    $safe = $e instanceof ApiError;
    if (!$safe) error_log('[api.php] ' . $e);
    if (!headers_sent()) http_response_code($safe ? $e->status : 500);
    $body = ["error" => $safe ? $e->getMessage() : GENERIC_ERROR];
    if ($safe && $e->errorCode) $body["code"] = $e->errorCode;
    if ($safe && $e->fieldErrors) $body["errors"] = $e->fieldErrors;
    echo json_encode($body);
});

// Template marketplace + custom orders (handle_platform_action)
require_once __DIR__ . '/modules/templates.php';
// Nexa AI, asisten chat publik beranda: instruksi, data terkini & panggilan Claude (aksi nexa_chat di templates.php)
require_once __DIR__ . '/modules/nexa.php';
// Company products, users column (product login accounts) encrypted at rest (handle_list_product_action)
require_once __DIR__ . '/modules/list_products.php';
// Client project files: staff-only download, the folder itself is closed to the web (handle_project_file_action)
require_once __DIR__ . '/modules/project_files.php';
// Home page hero background: raw video upload, upload limits and the hero_bg_* / hero_images settings
// (handle_hero_media_action, hero_media_prepare_settings)
require_once __DIR__ . '/modules/hero_media.php';
// Project documents & agreements, pd_* actions (handle_project_docs_action, docs/platform/PROJECT-DOCS-SPEC.md)
require_once __DIR__ . '/modules/project_docs.php';
// Visit sources for track_visit / get_visitor_details: referrer host, landing path, utm_source (visit_source_fields,
// visit_log, visit_sources; docs/platform/SEO-PLAN.md §5.9)
require_once __DIR__ . '/modules/visits.php';
// Artikel panduan /panduan dari tabel guide_articles: daftar & isi publik, jumlah dilihat (guide_views), kelola di tab
// admin Panduan (handle_guide_action)
require_once __DIR__ . '/modules/guides.php';

load_env_file();

header("Content-Type: application/json");
header("X-Content-Type-Options: nosniff");
header("Cache-Control: no-store");
header("Referrer-Policy: strict-origin-when-cross-origin");
send_cors_headers();

// Handle browser preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// DB credentials come from the environment; defaults match a local XAMPP install
$host = getenv("MYSQL_HOST") ?: "localhost";
$user = getenv("MYSQL_USER") ?: "root";
$pass = getenv("MYSQL_PASS") ?: "";
$db = getenv("MYSQL_DB") ?: "db_garudanexabahtera";

$conn = new mysqli($host, $user, $pass, $db);
// Server hosting default-nya latin1: tanpa ini teks seperti "©" rusak dan json_encode mengembalikan false
$conn->set_charset('utf8mb4');

$method = $_SERVER['REQUEST_METHOD'];
// upload_hero_video posts the raw video file (not JSON): hero_media.php streams php://input itself
$rawBody = ($_GET['action'] ?? '') === 'upload_hero_video';
$input = $rawBody ? null : json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = [];
// Read actions may be called with a query string (GET); the body wins over the query
if ($method === 'GET') $input = $input + $_GET;

$action = $input['action'] ?? $_GET['action'] ?? '';
$action = is_string($action) ? trim($action) : '';

if ($action === 'login' || $action === 'register') {
    handle_auth_action($conn, $action, $input);
    exit();
}
// Token + role check for everything that is not public; may adjust $input (see authorize_request)
$authUser = authorize_request($conn, $action, $input);

// Template marketplace, customer account and custom-order actions (backend/modules/templates.php)
if (handle_platform_action($conn, $action, $input, $authUser)) {
    $conn->close();
    exit();
}
// Company products: public list + staff actions (backend/modules/list_products.php)
if (handle_list_product_action($conn, $action, $input, $authUser)) {
    $conn->close();
    exit();
}
// Client project files (dokumen-client/dokumen): staff download (backend/modules/project_files.php)
if (handle_project_file_action($conn, $action, $input, $authUser)) {
    $conn->close();
    exit();
}
// Hero background video upload and the admin page's limits, staff only (backend/modules/hero_media.php)
if (handle_hero_media_action($conn, $action, $input, $authUser)) {
    $conn->close();
    exit();
}
// Project documents & agreements (pd_*): staff workspace, customer approvals, notifications (backend/modules/project_docs.php)
if (handle_project_docs_action($conn, $action, $input, $authUser)) {
    $conn->close();
    exit();
}
// Artikel panduan: get_guides/get_guide/guide_view publik, admin_*_guide(s) admin saja (backend/modules/guides.php)
if (handle_guide_action($conn, $action, $input, $authUser)) {
    $conn->close();
    exit();
}

switch ($action) {
    case 'migrate_paths':
        // Update path lama ke path baru di semua setting yang menyimpan JSON gambar
        $results = [];
        foreach (['products_data', 'portfolio_data'] as $key) {
            $row = db_one($conn, "SELECT setting_value FROM hero_settings WHERE setting_key = ?", [$key]);
            if (!$row) {
                $results[] = "$key: not found";
                continue;
            }
            $val = $row['setting_value'];
            $newVal = str_replace(['/assets/products/', '/assets/portfolio/'], ['/assets/product/', '/assets/portofolio/'], $val);
            if ($newVal !== $val) {
                db_run($conn, "UPDATE hero_settings SET setting_value = ? WHERE setting_key = ?", [$newVal, $key]);
                $results[] = "$key: updated";
            } else {
                $results[] = "$key: no change needed";
            }
        }
        echo json_encode(["success" => true, "results" => $results]);
        break;

    case 'reset_product_portfolio':
        // Reset products & portfolio ke default agar gambar statis bawaan tampil
        db_run($conn, "DELETE FROM hero_settings WHERE setting_key IN ('products_data', 'portfolio_data')");
        echo json_encode(["success" => true, "message" => "Reset berhasil, data kembali ke default."]);
        break;

    case 'get_users':
        echo json_encode(db_all($conn, "SELECT id, name, email, phone, role, status, avatar FROM users ORDER BY id DESC"));
        break;

    case 'add_user':
        db_run($conn, "INSERT INTO users (name, email, password, phone, role, status, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)", [
            in_str($input, 'name'), in_str($input, 'email'), password_hash(in_str($input, 'password'), PASSWORD_DEFAULT),
            in_str($input, 'phone'), in_str($input, 'role', 'user'), in_str($input, 'status', 'active'), in_str($input, 'avatar'),
        ]);
        echo json_encode(["success" => true, "id" => $conn->insert_id]);
        break;

    case 'update_user':
        $sql = "UPDATE users SET name = ?, email = ?, phone = ?, role = ?, status = ?, avatar = ?";
        $params = [in_str($input, 'name'), in_str($input, 'email'), in_str($input, 'phone'), in_str($input, 'role'), in_str($input, 'status'), in_str($input, 'avatar')];
        if (!empty($input['password'])) {
            $sql .= ", password = ?";
            $params[] = password_hash(in_str($input, 'password'), PASSWORD_DEFAULT);
        }
        $sql .= " WHERE id = ?";
        $params[] = in_int($input, 'id');
        db_run($conn, $sql, $params);
        echo json_encode(["success" => true, "message" => "User updated successfully"]);
        break;

    case 'delete_user':
        db_run($conn, "DELETE FROM users WHERE id = ?", [in_int($input, 'id')]);
        echo json_encode(["success" => true]);
        break;

    case 'get_settings':
        // Public: pd_* keys (company identity, tax, payment terms of the project documents) are read through
        // pd_settings_get only; the comparison follows the column's case-insensitive collation
        $settings = [];
        // nexa_*: kunci API & saklar AI hanya lewat nexa_get_config/nexa_save_config (admin); nexa_enabled tetap publik
        foreach (db_all($conn, "SELECT setting_key, setting_value FROM hero_settings
                                WHERE LEFT(setting_key, 3) <> 'pd_' AND (setting_key = 'nexa_enabled' OR LEFT(setting_key, 5) <> 'nexa_')") as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        // Always a JSON object like server.js: {} for an empty table (never []), numeric keys stay keys
        echo json_encode((object)$settings);
        break;

    case 'update_settings':
        $settings = is_array($input['settings'] ?? null) ? $input['settings'] : [];
        // pd_* settings are admin-only and validated per field: pd_settings_save (backend/modules/project_docs.php). Before
        // the hero media step below, so a refused save never stores an upload
        foreach (array_keys($settings) as $key) {
            if (stripos((string)$key, 'pd_') === 0) throw new ApiError('Pengaturan dokumen proyek hanya bisa diubah lewat Pengaturan dokumen.', 403, 'FORBIDDEN');
            // Kunci API & saklar AI hanya lewat nexa_save_config (admin); nexa_enabled (saklar widget) boleh di sini
            if (stripos((string)$key, 'nexa_') === 0 && strtolower((string)$key) !== 'nexa_enabled') {
                throw new ApiError('Pengaturan Nexa AI hanya bisa diubah lewat tab Tanya Nexa.', 403, 'FORBIDDEN');
            }
        }
        // hero_bg_mode, hero_text_tone, hero_overlay, hero_bg_video, hero_bg_video_poster, hero_images
        // (backend/modules/hero_media.php). First, so a
        // refused hero value (stale tab, data: video, SVG poster) stops the save before any upload; hero_media_base is
        // the hero video/poster the admin page loaded (compare-and-swap, never stored as a setting)
        $finishHeroMedia = hero_media_prepare_settings($conn, $settings, $input['hero_media_base'] ?? null);
        try {
            // Special handling for products_data
            // Gambar disimpan sebagai base64 langsung di DB (tidak ke disk)
            // agar tidak bergantung pada path file server yang berbeda-beda
            if (isset($settings['products_data'])) {
                $newItems = json_decode((string)$settings['products_data'], true);
                if (is_array($newItems)) {
                    // Ambil data existing untuk preserve gambar yang sudah ada
                    $existingRow = db_one($conn, "SELECT setting_value FROM hero_settings WHERE setting_key = 'products_data'");
                    $existingByID = [];
                    $existingParsed = $existingRow ? json_decode($existingRow['setting_value'], true) : null;
                    if (is_array($existingParsed)) {
                        foreach ($existingParsed as $ep) {
                            if (!empty($ep['id'])) $existingByID[$ep['id']] = $ep;
                        }
                    }
                    foreach ($newItems as &$item) {
                        $existID = $item['id'] ?? '';
                        // Jika image/logo kosong, gunakan yang sudah ada
                        if (empty($item['image']) && !empty($existingByID[$existID]['image'])) $item['image'] = $existingByID[$existID]['image'];
                        if (empty($item['logo']) && !empty($existingByID[$existID]['logo'])) $item['logo'] = $existingByID[$existID]['logo'];
                    }
                    unset($item);
                    $settings['products_data'] = json_encode($newItems);
                }
            }

            // Special handling for portfolio_data - sama seperti products
            if (isset($settings['portfolio_data'])) {
                $newItems = json_decode((string)$settings['portfolio_data'], true);
                if (is_array($newItems)) {
                    $existingRow = db_one($conn, "SELECT setting_value FROM hero_settings WHERE setting_key = 'portfolio_data'");
                    $existingArr = $existingRow ? (json_decode($existingRow['setting_value'], true) ?: []) : [];
                    foreach ($newItems as $idx => &$item) {
                        // Jika image kosong, gunakan image yang sudah ada berdasarkan posisi
                        if (empty($item['image']) && !empty($existingArr[$idx]['image'])) $item['image'] = $existingArr[$idx]['image'];
                    }
                    unset($item);
                    $settings['portfolio_data'] = json_encode($newItems);
                }
            }

            // Special handling for services_data
            if (isset($settings['services_data'])) {
                $items = json_decode((string)$settings['services_data'], true);
                if (is_array($items)) {
                    foreach ($items as &$item) {
                        if (isset($item['image'])) $item['image'] = save_base64_asset($item['image'], 'services');
                        if (isset($item['icon'])) $item['icon'] = save_base64_asset($item['icon'], 'services');
                    }
                    unset($item);
                    $settings['services_data'] = json_encode($items);
                }
            }

            // Special handling for hero_logos
            if (isset($settings['hero_logos'])) {
                $logos = json_decode((string)$settings['hero_logos'], true);
                if (is_array($logos)) {
                    // Like hero_images: removed logos stay on disk
                    $final_logos = [];
                    foreach ($logos as $logo) {
                        if (is_array($logo)) $final_logos[] = array_merge($logo, ["src" => save_base64_asset($logo['src'] ?? '', 'logo-product', 'logo')]);
                    }
                    $settings['hero_logos'] = json_encode($final_logos);
                }
            }

            foreach ($settings as $key => $value) {
                if (!preg_match('/^[A-Za-z0-9_]{1,100}$/', (string)$key)) throw new ApiError("Nama setting tidak valid: $key");
                $value = is_string($value) ? $value : json_encode($value);
                db_run($conn, "INSERT INTO hero_settings (setting_key, setting_value) VALUES (?, ?)
                               ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)", [(string)$key, $value]);
            }
        } catch (Throwable $e) {
            // Removes the hero files this request stored that no saved setting points to
            $finishHeroMedia(false);
            throw $e;
        }
        echo json_encode(["success" => true, "error" => null]);
        // Garbage-collect sweep of unused hero videos/posters, after the reply; it never changes it
        $finishHeroMedia(true);
        break;

    case 'get_projects':
        // show_on_website (0/1) and source ('admin' | 'website' = public custom-order form) as in SPEC §6
        echo json_encode(array_map(function ($row) {
            $row['show_on_website'] = (int)($row['show_on_website'] ?? 0);
            $row['source'] = $row['source'] ?? 'admin';
            return $row;
        }, db_all($conn, "SELECT * FROM project_client ORDER BY id DESC")));
        break;

    case 'add_project':
        // Main project image and project materials (files) are stored under public/assets/dokumen-client/
        $image_path = save_base64_asset($input['image'] ?? '', 'dokumen-client/logo', 'project');
        $project_files_json = json_encode(isset($input['project_files']) ? save_base64_files($input['project_files'], 'dokumen-client/dokumen') : []);
        // Empty dates are stored as NULL (MySQL DATE columns)
        $start_date = in_str($input, 'start_date') !== '' ? in_str($input, 'start_date') : null;
        $end_date = in_str($input, 'end_date') !== '' ? in_str($input, 'end_date') : null;
        db_run($conn, "INSERT INTO project_client (name, client_name, client_email, client_phone, service_type, status, assigned_user, price,
                           start_date, end_date, image, project_files, description, show_on_website, source)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin')", [
            in_str($input, 'name'), in_str($input, 'client_name'), in_str($input, 'client_email'), in_str($input, 'client_phone'),
            in_str($input, 'service_type'), in_str($input, 'status'), in_str($input, 'assigned_user'), (float)($input['price'] ?? 0),
            $start_date, $end_date, (string)$image_path, $project_files_json, in_str($input, 'description'), in_flag($input, 'show_on_website'),
        ]);
        echo json_encode(["success" => true, "id" => $conn->insert_id]);
        break;

    case 'update_project':
        // Only the fields that were sent change, so a quick toggle ({id, show_on_website}) keeps the rest.
        // Column names come from these fixed lists, values are bound. `source` is never changed here.
        $id = in_int($input, 'id');
        $sets = []; $params = [];
        foreach (['name', 'client_name', 'client_email', 'client_phone', 'service_type', 'status', 'assigned_user', 'description'] as $f) {
            if (array_key_exists($f, $input)) { $sets[] = "$f = ?"; $params[] = in_str($input, $f); }
        }
        if (array_key_exists('price', $input)) { $sets[] = "price = ?"; $params[] = (float)($input['price'] ?? 0); }
        foreach (['start_date', 'end_date'] as $f) {
            if (array_key_exists($f, $input)) { $sets[] = "$f = ?"; $params[] = in_str($input, $f) !== '' ? in_str($input, $f) : null; }
        }
        if (array_key_exists('image', $input)) {
            $sets[] = "image = ?";
            $params[] = (string)save_base64_asset($input['image'] ?? '', 'dokumen-client/logo', 'project');
        }
        if (array_key_exists('project_files', $input)) {
            $sets[] = "project_files = ?";
            $params[] = json_encode(save_base64_files($input['project_files'], 'dokumen-client/dokumen'));
        }
        if (array_key_exists('show_on_website', $input)) { $sets[] = "show_on_website = ?"; $params[] = in_flag($input, 'show_on_website'); }
        if ($id <= 0 || !$sets) throw new ApiError("Tidak ada data untuk diperbarui");
        $params[] = $id;
        db_run($conn, "UPDATE project_client SET " . implode(', ', $sets) . " WHERE id = ?", $params);
        echo json_encode(["success" => true]);
        break;

    case 'delete_project':
        // A project with project documents (signed contracts, invoices, receipts, pd_*) is an archive: deleting it would
        // orphan them for the client and the admin alike (same rule as server.js)
        if (db_one($conn, "SELECT id FROM pd_documents WHERE project_id = ? LIMIT 1", [in_int($input, 'id')])) {
            throw new ApiError('Proyek ini sudah punya dokumen proyek (BRD, kontrak, invoice, atau kuitansi), jadi tidak bisa dihapus agar arsipnya tetap utuh.', 409, 'STATE');
        }
        db_run($conn, "DELETE FROM project_client WHERE id = ?", [in_int($input, 'id')]);
        echo json_encode(["success" => true]);
        break;

    case 'track_visit':
        db_run($conn, "UPDATE visitor_stats SET total_visits = total_visits + 1 WHERE id = 1");
        // Per-visit row for the device/browser/OS charts and the visit source (referrer host, landing path,
        // utm_source; modules/visits.php), like server.js
        $ua = substr(in_str($input, 'user_agent', $_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500);
        [$device, $browser, $os] = parse_user_agent($ua);
        visit_log($conn, [client_ip(), $ua, $device, $browser, $os], visit_source_fields($input));
        echo json_encode(["success" => true]);
        break;

    case 'reset_visitor_stats':
        // Update all rows just in case id is not 1
        db_run($conn, "UPDATE visitor_stats SET total_visits = 0");
        echo json_encode(["success" => true]);
        break;

    case 'get_visitor_stats':
        $row = db_one($conn, "SELECT total_visits FROM visitor_stats WHERE id = 1");
        echo json_encode(["total_visits" => $row ? (int)$row['total_visits'] : 0]);
        break;

    case 'get_visitor_details':
        db_run($conn, "SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
        $row = db_one($conn, "SELECT total_visits FROM visitor_stats WHERE id = 1");
        $total = $row ? (int)$row['total_visits'] : 0;

        // Breakdown per column; estimated split when there are no visit rows yet
        $breakdown = function ($column, array $fallback) use ($conn, $total) {
            $items = [];
            foreach (db_all($conn, "SELECT $column AS label, COUNT(*) AS cnt FROM visitor_logs GROUP BY $column ORDER BY cnt DESC") as $r) {
                $items[] = ["label" => $r['label'] ?: 'Unknown', "value" => (int)$r['cnt']];
            }
            if (!$items) {
                foreach ($fallback as $label => $share) $items[] = ["label" => $label, "value" => (int)($total * $share)];
            }
            return $items;
        };
        $devices = $breakdown('device', ["Desktop" => 0.55, "Mobile" => 0.40, "Tablet" => 0.05]);
        $browsers = $breakdown('browser', ["Chrome" => 0.62, "Firefox" => 0.18, "Safari" => 0.15, "Edge" => 0.05]);
        $os = $breakdown('os', ["Windows" => 0.50, "macOS" => 0.25, "Android" => 0.15, "iOS" => 0.10]);
        $countries = $breakdown('country', ["Indonesia" => 0.70, "United States" => 0.10, "Singapore" => 0.08, "Malaysia" => 0.05]);
        if (end($browsers)['label'] === 'Edge' && end($browsers)['value'] === 0 && count($browsers) === 4) $browsers[3]['value'] = 1;

        // Daily breakdown (last 30 days)
        $daily = [];
        foreach (db_all($conn, "SELECT DATE(visited_at) as date, COUNT(*) as cnt FROM visitor_logs WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY date ORDER BY date ASC") as $r) {
            $daily[] = ["date" => $r['date'], "count" => (int)$r['cnt']];
        }

        // Today visits
        $today = (int)(db_one($conn, "SELECT COUNT(*) as cnt FROM visitor_logs WHERE DATE(visited_at) = CURDATE()")['cnt'] ?? 0);

        echo json_encode([
            "total" => $total,
            "today" => $today > 0 ? $today : max(1, (int)($total * 0.05)),
            "daily" => $daily,
            "devices" => $devices,
            "browsers" => $browsers,
            "os" => $os,
            "countries" => $countries,
            // Visits per source (chatgpt.com, …, google.*, lainnya, langsung) over 30 days; null before migration 010
            "sources" => visit_sources($conn)
        ]);
        break;

    // ── Changelog ──
    case 'get_changelogs':
        // Same response shape and optional filters as server.js: {success, data}
        $sql = "SELECT * FROM changelogs";
        $params = [];
        if (!empty($input['date'])) {
            $sql .= " WHERE change_date = ?";
            $params[] = in_str($input, 'date');
        } elseif (!empty($input['month']) && !empty($input['year'])) {
            $sql .= " WHERE MONTH(change_date) = ? AND YEAR(change_date) = ?";
            array_push($params, in_int($input, 'month'), in_int($input, 'year'));
        }
        $data = [];
        foreach (db_all($conn, $sql . " ORDER BY change_date DESC, time DESC", $params) as $row) {
            $data[] = [
                'id' => (int)$row['id'],
                'change_date' => $row['change_date'],
                'time' => $row['time'],
                'title' => $row['title'],
                'description' => $row['description'],
                'category' => $row['category'],
                'created_at' => $row['created_at']
            ];
        }
        echo json_encode(["success" => true, "data" => $data]);
        break;

    case 'add_changelog':
        db_run($conn, "INSERT INTO changelogs (change_date, time, title, description, category) VALUES (?, ?, ?, ?, ?)", [
            in_str($input, 'change_date', date('Y-m-d')), in_str($input, 'time', date('H:i:s')),
            in_str($input, 'title'), in_str($input, 'description'), in_str($input, 'category', 'fitur'),
        ]);
        echo json_encode(["success" => true, "id" => $conn->insert_id]);
        break;

    case 'update_changelog':
        db_run($conn, "UPDATE changelogs SET change_date = ?, time = ?, title = ?, description = ?, category = ? WHERE id = ?", [
            in_str($input, 'change_date', date('Y-m-d')), in_str($input, 'time', date('H:i:s')),
            in_str($input, 'title'), in_str($input, 'description'), in_str($input, 'category', 'fitur'), in_int($input, 'id'),
        ]);
        echo json_encode(["success" => true]);
        break;

    case 'delete_changelog':
        db_run($conn, "DELETE FROM changelogs WHERE id = ?", [in_int($input, 'id')]);
        echo json_encode(["success" => true]);
        break;

    // ═══════════════════════════════════════════════
    // Actions that production serves from backend/server.js.
    // Mirrored here so every admin page also works against the local PHP API.
    // Uploads go to public/assets/<section>/ instead of S3.
    // ═══════════════════════════════════════════════

    // ── Documents ──
    case 'get_documents':
        $data = [];
        foreach (db_all($conn, "SELECT * FROM documents ORDER BY type DESC, name ASC") as $row) {
            $row['id'] = (int)$row['id'];
            $row['size'] = (int)$row['size'];
            $row['parent_id'] = $row['parent_id'] === null ? null : (int)$row['parent_id'];
            $data[] = $row;
        }
        echo json_encode(["success" => true, "data" => $data]);
        break;

    case 'add_document':
        $type = in_str($input, 'type') === 'folder' ? 'folder' : 'file';
        $name = in_str($input, 'name');
        // Uploaded file: type and extension are checked against the allowlist in save_base64_asset
        $path = $type === 'file' ? (string)save_base64_asset(in_str($input, 'path'), 'documents', $name) : '';
        $parent = in_int($input, 'parent_id');
        db_run($conn, "INSERT INTO documents (name, type, size, mime_type, path, parent_id) VALUES (?, ?, ?, ?, ?, ?)",
            [$name, $type, in_int($input, 'size'), in_str($input, 'mime_type'), $path, $parent > 0 ? $parent : null]);
        echo json_encode(["success" => true, "id" => $conn->insert_id, "path" => $path]);
        break;

    case 'delete_document':
        // The item plus everything nested under it
        $ids = [in_int($input, 'id')];
        for ($i = 0; $i < count($ids); $i++) {
            foreach (db_all($conn, "SELECT id FROM documents WHERE parent_id = ?", [$ids[$i]]) as $r) {
                if (!in_array((int)$r['id'], $ids, true)) $ids[] = (int)$r['id'];
            }
        }
        $marks = implode(',', array_fill(0, count($ids), '?'));
        foreach (db_all($conn, "SELECT path FROM documents WHERE type = 'file' AND id IN ($marks)", $ids) as $r) {
            delete_local_asset($r['path'], 'documents');
        }
        db_run($conn, "DELETE FROM documents WHERE id IN ($marks)", $ids);
        echo json_encode(["success" => true]);
        break;

    // ── Navbar Manager ──
    case 'get_navbar_menus':
        // Active items only, unless include_inactive is set (admin Navbar Manager)
        $all = !empty($input['include_inactive']) || !empty($_GET['include_inactive']);
        $data = [];
        foreach (db_all($conn, "SELECT * FROM navbar_menus" . ($all ? "" : " WHERE is_active = 1") . " ORDER BY sort_order ASC, id ASC") as $row) {
            $row['id'] = (int)$row['id'];
            $row['parent_id'] = $row['parent_id'] === null ? null : (int)$row['parent_id'];
            $row['sort_order'] = (int)$row['sort_order'];
            $row['is_active'] = (int)$row['is_active'];
            $data[] = $row;
        }
        echo json_encode($data);
        break;

    case 'save_navbar_menus_order':
        $menus = $input['menus'] ?? null;
        if (!is_array($menus)) throw new ApiError("Invalid data");
        foreach ($menus as $m) {
            if (!is_array($m)) continue;
            $parent = in_int($m, 'parent_id');
            db_run($conn, "UPDATE navbar_menus SET sort_order = ?, parent_id = ? WHERE id = ?",
                [in_int($m, 'sort_order'), $parent > 0 ? $parent : null, in_int($m, 'id')]);
        }
        echo json_encode(["success" => true]);
        break;

    case 'add_navbar_menu':
        $parent = in_int($input, 'parent_id');
        db_run($conn, "INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, description_id, description_en, sort_order, is_active)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
            $parent > 0 ? $parent : null, in_str($input, 'label_id'), in_str($input, 'label_en'), in_str($input, 'url', '#'),
            in_str($input, 'icon') ?: 'Globe', in_str($input, 'description_id'), in_str($input, 'description_en'),
            in_int($input, 'sort_order', 99), in_int($input, 'is_active', 1),
        ]);
        echo json_encode(["success" => true, "id" => $conn->insert_id]);
        break;

    case 'edit_navbar_menu':
        db_run($conn, "UPDATE navbar_menus SET label_id = ?, label_en = ?, url = ?, icon = ?, description_id = ?, description_en = ?, is_active = ? WHERE id = ?", [
            in_str($input, 'label_id'), in_str($input, 'label_en'), in_str($input, 'url', '#'), in_str($input, 'icon') ?: 'Globe',
            in_str($input, 'description_id'), in_str($input, 'description_en'), in_int($input, 'is_active', 1), in_int($input, 'id'),
        ]);
        echo json_encode(["success" => true]);
        break;

    case 'delete_navbar_menu':
        $id = in_int($input, 'id');
        db_run($conn, "DELETE FROM navbar_menus WHERE parent_id = ?", [$id]);
        db_run($conn, "DELETE FROM navbar_menus WHERE id = ?", [$id]);
        echo json_encode(["success" => true]);
        break;

    // ── AI Chat (Node serves it at /api/ai-chat; the Vite dev proxy rewrites that path to this action) ──
    case 'ai_chat':
        $messages = $input['messages'] ?? null;
        if (!is_array($messages)) throw new ApiError("messages array required");
        $result = ai_chat_reply($conn, $messages);
        if (isset($result['error'])) http_response_code(502);
        echo json_encode($result);
        break;

    default:
        http_response_code(400);
        echo json_encode(["error" => "Invalid action: " . $action]);
        break;
}

$conn->close();

// ── Helpers (top-level functions, so the cases above can call them) ──

// ── Request input ──

function in_str(array $input, $key, $default = '') {
    $v = $input[$key] ?? null;
    if ($v === null) return (string)$default;
    if (is_array($v)) return json_encode($v);
    if (is_bool($v)) return $v ? '1' : '0';
    return (string)$v;
}

function in_int(array $input, $key, $default = 0) {
    $v = $input[$key] ?? $_GET[$key] ?? null;
    return is_numeric($v) ? (int)$v : (int)$default;
}

// Checkbox-like value: true / 1 / "1" / "true" -> 1, anything else -> 0
function in_flag(array $input, $key) {
    $v = $input[$key] ?? null;
    return ($v === true || $v === 1 || $v === '1' || $v === 'true') ? 1 : 0;
}

// ── Database: every value goes through a prepared statement ──

function db_run(mysqli $conn, $sql, array $params = []) {
    try {
        if (!$params) {
            $result = $conn->query($sql);
            $GLOBALS['db_last_affected_rows'] = $conn->affected_rows;
            return $result;
        }
        $stmt = $conn->prepare($sql);
        $types = '';
        foreach ($params as $p) $types .= is_int($p) || is_bool($p) ? 'i' : (is_float($p) ? 'd' : 's');
        $values = array_values($params);
        $stmt->bind_param($types, ...$values);
        $stmt->execute();
        // $conn->affected_rows is reset to -1 once $stmt is freed, so keep the count here (see db_affected_rows)
        $GLOBALS['db_last_affected_rows'] = $stmt->affected_rows;
        $result = $stmt->get_result();
        return $result === false ? true : $result;
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() === 1062) throw new ApiError('Data yang sama sudah ada (duplikat).', 409);
        throw $e;
    }
}

// Rows changed by the last INSERT/UPDATE/DELETE that went through db_run
function db_affected_rows() {
    return (int)($GLOBALS['db_last_affected_rows'] ?? 0);
}

function db_all(mysqli $conn, $sql, array $params = []) {
    $result = db_run($conn, $sql, $params);
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    return $rows;
}

function db_one(mysqli $conn, $sql, array $params = []) {
    $row = db_run($conn, $sql, $params)->fetch_assoc();
    return $row ?: null;
}

// ── Environment and CORS ──

// Local runs read .env (backend/ or the repository root); variables already set in the environment win
function load_env_file() {
    foreach ([__DIR__ . '/.env', dirname(__DIR__) . '/.env'] as $file) {
        if (!is_file($file)) continue;
        foreach (file($file, FILE_IGNORE_NEW_LINES) as $line) {
            if (!preg_match('/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/', $line, $m) || getenv($m[1]) !== false) continue;
            $value = preg_replace('/^([\'"])(.*)\1$/', '$2', $m[2]);
            putenv("{$m[1]}=$value");
            $_ENV[$m[1]] = $value;
        }
        break;
    }
}

function env_value($key, $default = '') {
    $v = getenv($key);
    return ($v === false || $v === '') ? $default : $v;
}

// Only origins listed in CORS_ORIGINS (comma separated); the site itself is same-origin and needs none
function send_cors_headers() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = array_filter(array_map('trim', explode(',', env_value('CORS_ORIGINS'))));
    if ($origin === '' || !in_array($origin, $allowed, true)) return;
    header("Access-Control-Allow-Origin: $origin");
    header("Vary: Origin");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Max-Age: 600");
}

function client_ip() {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    // TRUST_PROXY = number of reverse proxies in front of PHP; 0 (default) ignores X-Forwarded-For
    $hops = (int)env_value('TRUST_PROXY', '0');
    if ($hops > 0 && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $chain = array_map('trim', explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']));
        $chain[] = $ip;
        $ip = $chain[max(0, count($chain) - 1 - $hops)];
    }
    return $ip;
}

// ── Auth: same token format and rules as backend/security.js ──

function b64url_encode($bin) {
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function b64url_decode($str) {
    $bin = base64_decode(strtr($str, '-_', '+/') . str_repeat('=', (4 - strlen($str) % 4) % 4), true);
    return $bin === false ? null : $bin;
}

function auth_secret() {
    $secret = env_value('AUTH_SECRET');
    if (strlen($secret) >= 32) return $secret;
    // Hosting tanpa AUTH_SECRET di .env (cPanel): pakai kunci acak yang dibuat sekali dan disimpan di luar web root
    $file = dirname(public_dir()) . '/.garudanexa_auth_secret';
    if (is_file($file)) {
        $saved = trim((string)file_get_contents($file));
        if (strlen($saved) >= 32) return $saved;
    }
    if (!is_file(__DIR__ . '/index.html')) return null; // dev lokal (api.php di backend/): wajib lewat .env
    $generated = bin2hex(random_bytes(32));
    if (@file_put_contents($file, $generated . "\n", LOCK_EX) === false) return null;
    @chmod($file, 0600);
    return $generated;
}

// Folder web publik tempat index.html & assets/. cPanel: api.php berada di public_html itu sendiri;
// repo/dev lokal: api.php di backend/, web root = ../public. PUBLIC_DIR di .env bisa menimpanya.
function public_dir() {
    static $dir = null;
    if ($dir !== null) return $dir;
    $env = env_value('PUBLIC_DIR');
    $dir = rtrim($env !== '' ? $env : (is_file(__DIR__ . '/index.html') ? __DIR__ : dirname(__DIR__) . '/public'), '/\\');
    return $dir;
}

// Changes whenever the password changes, so a password reset invalidates older tokens
function password_version($hash) {
    return substr(hash('sha256', (string)$hash), 0, 16);
}

function issue_token(array $user) {
    $now = time();
    $ttl = (int)env_value('AUTH_TOKEN_TTL', '28800');
    $exp = $now + ($ttl > 0 ? $ttl : 28800);
    $header = b64url_encode(json_encode(["alg" => "HS256", "typ" => "JWT"]));
    $payload = b64url_encode(json_encode(["sub" => (int)$user['id'], "role" => $user['role'], "pv" => password_version($user['password']), "iat" => $now, "exp" => $exp]));
    $signature = b64url_encode(hash_hmac('sha256', "$header.$payload", auth_secret(), true));
    return ["$header.$payload.$signature", $exp];
}

function verify_token($token) {
    $secret = auth_secret();
    if (!$secret || !is_string($token)) return null;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $payload, $signature] = $parts;
    $given = b64url_decode($signature);
    if ($given === null || !hash_equals(hash_hmac('sha256', "$header.$payload", $secret, true), $given)) return null;
    if ((json_decode((string)b64url_decode($header), true)['alg'] ?? '') !== 'HS256') return null;
    $claims = json_decode((string)b64url_decode($payload), true);
    if (!is_array($claims) || !is_int($claims['exp'] ?? null) || $claims['exp'] <= time()) return null;
    return $claims;
}

function bearer_token() {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    // Apache with mod_php does not always pass Authorization into $_SERVER
    if ($header === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) $header = $value;
        }
    }
    return preg_match('/^Bearer\s+(\S+)$/i', trim($header), $m) ? $m[1] : '';
}

// Re-reads the user on every request so deactivation, role changes and password resets apply immediately
function authenticate(mysqli $conn) {
    $claims = verify_token(bearer_token());
    if (!$claims) return null;
    $user = db_one($conn, "SELECT id, name, email, phone, role, status, avatar, password FROM users WHERE id = ? LIMIT 1", [(int)($claims['sub'] ?? 0)]);
    if (!$user || $user['status'] !== 'active' || !hash_equals(password_version($user['password']), (string)($claims['pv'] ?? ''))) return null;
    unset($user['password']);
    $user['id'] = (int)$user['id'];
    return $user;
}

// Links saved by the admin panel end up in href/src attributes; a javascript: URL there is stored XSS.
// Also catches them inside JSON-encoded settings strings (e.g. products_data).
function contains_script_url($value, $depth = 0) {
    if (is_string($value)) return (bool)preg_match('/(^|["\'])[\s\x00-\x1f]*(javascript|vbscript)\s*:/i', $value);
    if (!is_array($value) || $depth > 8) return false;
    foreach ($value as $v) {
        if (contains_script_url($v, $depth + 1)) return true;
    }
    return false;
}

// Rejects protected actions without a valid token and enforces roles. Returns the user (null for public calls).
function authorize_request(mysqli $conn, $action, array &$input) {
    if (in_array($action, PUBLIC_ACTIONS, true)) return null;

    $user = authenticate($conn);
    if (!$user) throw new ApiError('Sesi tidak valid atau sudah berakhir. Silakan login kembali.', 401, 'UNAUTHORIZED');
    // ANY_ROLE_ACTIONS (notifications, private project files) serve every logged-in role; the handler limits the data
    // to the caller. Otherwise customers only reach their CUSTOMER_ACTIONS; staff never use those
    if (!in_array($action, ANY_ROLE_ACTIONS, true)) {
        if (in_array($action, CUSTOMER_ACTIONS, true)) {
            if ($user['role'] !== 'customer') throw new ApiError('Akses ditolak: aksi ini khusus akun pembeli.', 403, 'FORBIDDEN');
        } elseif (!in_array($user['role'], STAFF_ROLES, true)) {
            throw new ApiError('Akses ditolak.', 403, 'FORBIDDEN');
        }
    }
    $isAdmin = $user['role'] === 'admin';
    if (in_array($action, ADMIN_ACTIONS, true) && !$isAdmin) throw new ApiError('Akses ditolak: hanya admin.', 403, 'FORBIDDEN');

    // Non-admins only see their own account (the admin header uses get_users to refresh the profile)
    if ($action === 'get_users' && !$isAdmin) {
        echo json_encode([$user]);
        exit();
    }
    if ($action === 'update_user' && !$isAdmin) {
        if (in_int($input, 'id') !== $user['id']) throw new ApiError('Akses ditolak: Anda hanya bisa mengubah profil sendiri.', 403, 'FORBIDDEN');
        $input['role'] = $user['role'];
        $input['status'] = $user['status'];
    }
    if ($action === 'add_user' || $action === 'update_user') {
        if (isset($input['role']) && !in_array($input['role'], USER_ROLES, true)) throw new ApiError('Role tidak valid.');
        if (isset($input['status']) && !in_array($input['status'], ['active', 'inactive'], true)) throw new ApiError('Status tidak valid.');
        $password = $input['password'] ?? '';
        if ($action === 'add_user' && (!is_string($password) || strlen($password) < 8)) throw new ApiError('Password minimal 8 karakter.');
        if ($action === 'update_user' && !empty($password) && strlen((string)$password) < 8) throw new ApiError('Password minimal 8 karakter.');
    }
    if ($action === 'delete_user' && in_int($input, 'id') === $user['id']) throw new ApiError('Tidak bisa menghapus akun yang sedang dipakai.');
    // Contract value (project_client.price, "Nilai kontrak" of the project documents) is admin only: the whole request
    // is refused, so nothing of it is saved (same check in backend/security.js)
    if (!$isAdmin && sets_contract_value($action, $input)) throw new ApiError('Hanya admin yang dapat mengubah nilai kontrak.', 403, 'FORBIDDEN');
    if (contains_script_url($input)) throw new ApiError('Tautan javascript:/vbscript: tidak diizinkan.');
    return $user;
}

// update_project with a `price` key (any value, null and the current one included), or add_project with a price
// other than empty or zero ("", null, 0, "0", "0.00", ".0": what a new project gets anyway). Same rule as
// setsContractValue() in backend/security.js
function sets_contract_value($action, array $input) {
    if (($action !== 'update_project' && $action !== 'add_project') || !array_key_exists('price', $input)) return false;
    if ($action === 'update_project') return true;
    $price = $input['price'];
    if ($price === null || $price === '' || $price === 0 || $price === 0.0) return false;
    return !(is_string($price) && preg_match('/^[+-]?(0+(\.0*)?|\.0+)$/D', $price));
}

// ── Login rate limit: small JSON files in the system temp folder (PHP has no shared memory) ──

function rate_limit_file($key) {
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'garudanexa-rate-limit';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    return $dir . DIRECTORY_SEPARATOR . hash('sha256', $key) . '.json';
}

// Seconds until the key may try again, or 0 when it is not blocked
function rate_limit_wait($key, $max) {
    $file = rate_limit_file($key);
    $entry = is_file($file) ? json_decode((string)@file_get_contents($file), true) : null;
    if (!is_array($entry) || $entry['reset'] <= time() || $entry['count'] < $max) return 0;
    return $entry['reset'] - time();
}

function rate_limit_hit($key, $windowSeconds) {
    $fp = @fopen(rate_limit_file($key), 'c+');
    if (!$fp) return;
    flock($fp, LOCK_EX);
    $entry = json_decode((string)stream_get_contents($fp), true);
    if (!is_array($entry) || $entry['reset'] <= time()) $entry = ["count" => 0, "reset" => time() + $windowSeconds];
    $entry['count']++;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($entry));
    flock($fp, LOCK_UN);
    fclose($fp);
}

function rate_limit_clear($key) {
    @unlink(rate_limit_file($key));
}

function too_many_attempts($seconds) {
    header('Retry-After: ' . $seconds);
    throw new ApiError('Terlalu banyak percobaan. Coba lagi dalam ' . max(1, (int)ceil($seconds / 60)) . ' menit.', 429);
}

// login (returns a token) and public registration (always a regular user that an admin must activate first)
function handle_auth_action(mysqli $conn, $action, array $input) {
    if (!auth_secret()) throw new ApiError('Login belum dikonfigurasi di server.', 503);
    $email = trim(in_str($input, 'email'));
    $password = is_string($input['password'] ?? null) ? $input['password'] : '';
    $ip = client_ip();

    if ($action === 'login') {
        $accountKey = "login|$ip|" . strtolower($email);
        $ipKey = "login-ip|$ip";
        $wait = max(rate_limit_wait($accountKey, 5), rate_limit_wait($ipKey, 30));
        if ($wait) too_many_attempts($wait);
        $user = $email !== '' ? db_one($conn, "SELECT * FROM users WHERE email = ? LIMIT 1", [$email]) : null;
        // Unknown emails still pay for one bcrypt check, so response time does not reveal which emails exist
        $valid = password_verify($password, $user['password'] ?? password_hash(random_bytes(16), PASSWORD_BCRYPT));
        if (!$user || !$valid) {
            rate_limit_hit($accountKey, 900);
            rate_limit_hit($ipKey, 900);
            throw new ApiError('Email atau password salah', 401);
        }
        if ($user['status'] !== 'active') throw new ApiError('Akun Anda belum aktif. Hubungi administrator.', 403);
        rate_limit_clear($accountKey);
        [$token, $expiresAt] = issue_token($user);
        unset($user['password']);
        echo json_encode(["success" => true, "user" => $user, "token" => $token, "expires_at" => $expiresAt]);
        return;
    }

    $registerKey = "register|$ip";
    $wait = rate_limit_wait($registerKey, 5);
    if ($wait) too_many_attempts($wait);
    $name = mb_substr(trim(in_str($input, 'name')), 0, 100);
    $phone = mb_substr(trim(in_str($input, 'phone')), 0, 30);
    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) throw new ApiError('Nama dan email yang valid wajib diisi.');
    if (strlen($password) < 8) throw new ApiError('Password minimal 8 karakter.');
    rate_limit_hit($registerKey, 3600);
    if (db_one($conn, "SELECT id FROM users WHERE email = ? LIMIT 1", [$email])) throw new ApiError('Email sudah terdaftar.', 409);
    db_run($conn, "INSERT INTO users (name, email, password, phone, role, status, avatar) VALUES (?, ?, ?, ?, 'user', 'inactive', '')",
        [$name, $email, password_hash($password, PASSWORD_DEFAULT), $phone]);
    echo json_encode(["success" => true, "pending" => true, "message" => "Registrasi berhasil. Akun Anda aktif setelah disetujui admin."]);
}

// ── Uploads: type from the content (magic bytes) and an allowlist, never from the client; names generated here ──

function sniff_image($bin) {
    $hex = bin2hex(substr($bin, 0, 12));
    if (strpos($hex, '89504e47') === 0) return 'png';
    if (strpos($hex, 'ffd8ff') === 0) return 'jpg';
    if (strpos($bin, 'GIF8') === 0) return 'gif';
    if (substr($bin, 0, 4) === 'RIFF' && substr($bin, 8, 4) === 'WEBP') return 'webp';
    if (strpos($hex, '00000100') === 0) return 'ico';
    $head = ltrim(preg_replace('/^\xEF\xBB\xBF/', '', substr($bin, 0, 2048)));
    if (preg_match('/^(<\?xml[^>]*>\s*)?(<!--.*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/is', $head)) return 'svg';
    return null;
}

// Keeps a readable, filesystem/URL-safe stem of the client's file name
function safe_stem($name) {
    $base = preg_replace('/\.[^.]*$/', '', basename(str_replace('\\', '/', (string)$name)));
    $stem = trim(preg_replace('/[^A-Za-z0-9_-]+/', '_', $base), '_');
    return substr($stem, 0, 80) ?: 'file';
}

function upload_limit_bytes($key, $defaultMb) {
    $mb = (float)env_value($key, (string)$defaultMb);
    return (int)(($mb > 0 ? $mb : $defaultMb) * 1024 * 1024);
}

// SVG is served as an image but can carry script; anything active is rejected instead of cleaned.
// Checked on the raw text and again after decoding character references (xlink:href="&#106;avascript:..."),
// with whitespace/control characters removed because browsers ignore them inside a URL scheme.
function svg_has_active_content($svg) {
    $tags = '/<script|<foreignObject|<iframe|<embed|<object|<handler|<listener|\son[a-z]+\s*=|<!ENTITY|<!DOCTYPE[^>]*\[/i';
    if (preg_match($tags, $svg)) return true;
    // Only UTF-8/ASCII/Latin-1: another declared encoding could hide markup from these byte checks
    if (preg_match('/<\?xml[^>]*\bencoding\s*=\s*["\']\s*(?!(utf-?8|us-ascii|iso-8859-1)\s*["\'])/i', $svg)) return true;
    $decoded = $svg;
    for ($i = 0; $i < 3; $i++) { // nested references such as &amp;#106; decode one level per pass
        $next = preg_replace_callback('/&#(x[0-9a-f]+|[0-9]+);?/i', function ($m) {
            $code = ($m[1][0] === 'x' || $m[1][0] === 'X') ? hexdec(substr($m[1], 1)) : (int)$m[1];
            return ($code > 0 && $code <= 0x10FFFF) ? mb_chr($code, 'UTF-8') : '';
        }, $decoded);
        $next = html_entity_decode((string)$next, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        if ($next === $decoded) break;
        $decoded = $next;
    }
    if (preg_match($tags, $decoded)) return true;
    $compact = preg_replace('/[\x00-\x20]+/', '', $decoded);
    return (bool)preg_match('/(javascript|vbscript|livescript):|data:(text\/html|application\/xhtml)/i', (string)$compact);
}

// Decodes and validates a base64 data URI; returns [content, extension]
function parse_upload($dataUri, $allowDocuments, $filename = '') {
    if (!preg_match('/^data:[^,]*?;base64,/i', $dataUri, $m)) throw new ApiError('Format file tidak valid.');
    $maxImage = upload_limit_bytes('UPLOAD_MAX_IMAGE_MB', 10);
    $maxFile = upload_limit_bytes('UPLOAD_MAX_FILE_MB', 25);
    $payload = substr($dataUri, strlen($m[0]));
    if (strlen($payload) > ceil($maxFile * 4 / 3) + 4) throw new ApiError('Ukuran file terlalu besar.');
    $content = base64_decode($payload);
    if ($content === false || $content === '') throw new ApiError('File kosong atau rusak.');

    $imageExt = sniff_image($content);
    if ($imageExt) {
        if (strlen($content) > $maxImage) throw new ApiError('Ukuran gambar maksimal ' . ($maxImage / 1048576) . ' MB.');
        if ($imageExt === 'svg' && svg_has_active_content($content)) {
            throw new ApiError('File SVG berisi script dan tidak diizinkan.');
        }
        return [$content, $imageExt];
    }
    if (!$allowDocuments) throw new ApiError('Hanya file gambar (PNG, JPG, WEBP, GIF, SVG) yang diizinkan.');

    $ext = strtolower(pathinfo((string)$filename, PATHINFO_EXTENSION));
    if (!in_array($ext, UPLOAD_DOCUMENT_EXTS, true)) {
        throw new ApiError('Tipe file tidak diizinkan. Gunakan: ' . implode(', ', UPLOAD_DOCUMENT_EXTS) . ', atau gambar.');
    }
    if (isset(UPLOAD_MAGIC[$ext]) && strpos(bin2hex(substr($content, 0, 4)), UPLOAD_MAGIC[$ext]) !== 0) {
        throw new ApiError("Isi file tidak sesuai dengan ekstensi .$ext.");
    }
    if (strlen($content) > $maxFile) throw new ApiError('Ukuran file maksimal ' . ($maxFile / 1048576) . ' MB.');
    return [$content, $ext];
}

// Non-upload values are stored as given (existing paths/URLs); script URLs are dropped
function safe_link($value) {
    if (!is_string($value)) return $value;
    return preg_match('/^[\s\x00-\x1f]*(javascript|vbscript|data):/i', $value) ? '' : $value;
}

// Saves a base64 data URI to public/assets/<section>/ and returns its public path.
// Anything that is not a data URI (an existing path or URL) is returned unchanged.
// $filename: the client's file name (documents need its extension) or a name prefix such as 'hero'.
// Document folders (dokumen/documents) also accept office/pdf/archive files; elsewhere only images.
function save_base64_asset($data, $section, $filename = null) {
    if (!is_string($data) || !preg_match('/^\s*data:/i', $data)) return safe_link($data);
    $section = implode('/', array_map('safe_stem', explode('/', (string)$section)));
    [$content, $ext] = parse_upload(trim($data), (bool)preg_match('/dokumen|document/i', $section), (string)$filename);
    $name = ($filename ? safe_stem($filename) : basename($section)) . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
    $folder = public_dir() . '/assets/' . $section . '/';
    if (!is_dir($folder) && !mkdir($folder, 0755, true)) throw new RuntimeException("Cannot create upload folder $folder");
    if (file_put_contents($folder . $name, $content) === false) throw new RuntimeException("Cannot write upload $folder$name");
    return '/assets/' . $section . '/' . $name;
}

// Deletes a file this backend saved under public/assets/<section>/; URLs (S3) and other paths are left alone
function delete_local_asset($path, $section) {
    $prefix = '/assets/' . $section . '/';
    if (!is_string($path) || strpos($path, $prefix) !== 0) return;
    $folder = realpath(public_dir() . $prefix);
    $file = $folder ? realpath($folder . DIRECTORY_SEPARATOR . basename($path)) : false;
    // basename() already strips ../; realpath() also refuses links that point outside the folder
    if ($file && strpos($file, $folder . DIRECTORY_SEPARATOR) === 0 && is_file($file)) unlink($file);
}

// Saves the base64 entries of a project_files list ([{name, type, size, data}]) and returns the stored list
function save_base64_files($files, $section) {
    if (is_string($files)) $files = json_decode($files, true);
    if (!is_array($files)) return [];
    $saved = [];
    foreach ($files as $f) {
        if (!is_array($f)) continue;
        if (isset($f['data']) && is_string($f['data']) && preg_match('/^\s*data:/i', $f['data'])) {
            $path = save_base64_asset($f['data'], $section, (string)($f['name'] ?? 'file'));
            $saved[] = ["name" => $f['name'] ?? '', "type" => $f['type'] ?? '', "size" => $f['size'] ?? 0, "path" => $path];
        } else {
            if (isset($f['path'])) $f['path'] = safe_link($f['path']);
            unset($f['data']);
            $saved[] = $f;
        }
    }
    return $saved;
}

// Device / browser / OS from a user agent, same rules as track_visit in server.js
function parse_user_agent($ua) {
    $device = 'Desktop'; $browser = 'Unknown'; $os = 'Unknown';
    if (preg_match('/Mobile|Android|iPhone|iPad|iPod/i', $ua)) $device = 'Mobile';
    if (preg_match('/Tablet|iPad/i', $ua)) $device = 'Tablet';

    if (preg_match('/Chrome/i', $ua) && !preg_match('/Edg/i', $ua)) $browser = 'Chrome';
    elseif (preg_match('/Firefox/i', $ua)) $browser = 'Firefox';
    elseif (preg_match('/Safari/i', $ua) && !preg_match('/Chrome/i', $ua)) $browser = 'Safari';
    elseif (preg_match('/Edg/i', $ua)) $browser = 'Edge';
    elseif (preg_match('/MSIE|Trident/i', $ua)) $browser = 'Internet Explorer';

    if (preg_match('/Windows|Win64/i', $ua)) $os = 'Windows';
    elseif (preg_match('/Mac/i', $ua) && !preg_match('/iPhone|iPad|iPod/i', $ua)) $os = 'macOS';
    elseif (preg_match('/Android/i', $ua)) $os = 'Android';
    elseif (preg_match('/iPhone|iPad|iPod/i', $ua)) $os = 'iOS';
    elseif (preg_match('/Linux/i', $ua)) $os = 'Linux';
    return [$device, $browser, $os];
}

// Admin AI assistant: OpenAI-compatible chat API (Ollama by default), same context as /api/ai-chat in server.js.
// AI_BASE_URL, AI_MODEL and AI_API_KEY come from the environment.
function ai_chat_reply($conn, $messages) {
    $baseUrl = rtrim(getenv('AI_BASE_URL') ?: 'http://127.0.0.1:11434/v1', '/');
    $model = getenv('AI_MODEL') ?: 'qwen2.5:3b';
    $apiKey = getenv('AI_API_KEY') ?: 'ollama';

    $settings = [];
    foreach (db_all($conn, "SELECT setting_key, setting_value FROM hero_settings") as $row) $settings[$row['setting_key']] = $row['setting_value'];
    $visits = (int)(db_one($conn, "SELECT total_visits FROM visitor_stats WHERE id = 1")['total_visits'] ?? 0);
    $products = [];
    foreach (db_all($conn, "SELECT title, description, link_button FROM list_products ORDER BY id") as $row) {
        $products[] = "- **{$row['title']}**: " . ($row['description'] ?: '(no description)') . " — Link: " . ($row['link_button'] ?: 'N/A');
    }
    $projectCount = (int)(db_one($conn, "SELECT COUNT(*) as c FROM project_client")['c'] ?? 0);
    $userCount = (int)(db_one($conn, "SELECT COUNT(*) as c FROM users")['c'] ?? 0);
    $portfolio = json_decode($settings['portfolio_data'] ?? '[]', true) ?: [];

    $system = "Kamu adalah AI Assistant untuk website Garuda Nexa Bahtera — perusahaan software house & digital agency asal Indonesia.\n\n"
        . "Informasi website:\n"
        . "- Tagline: " . ($settings['hero_title'] ?? 'Solusi Digital Terpercaya') . "\n"
        . "- Deskripsi: " . ($settings['hero_subtitle'] ?? 'Membangun software custom untuk bisnis Anda') . "\n"
        . "- Total pengunjung website: " . number_format($visits, 0, ',', '.') . " kali\n"
        . "- Total produk: " . count($products) . " produk\n"
        . "- Total user admin: $userCount\n"
        . "- Total project client: $projectCount\n"
        . "- Portfolio: " . count($portfolio) . " project\n\n"
        . "Produk:\n" . ($products ? implode("\n", $products) : 'Belum ada produk terdaftar.') . "\n\n"
        . "Kontak: WA 6285188009152 | Email: info@garudanexa.com\n\n"
        . "Jawab pertanyaan admin tentang website, data pengunjung, produk, layanan, dan teknis dalam bahasa Indonesia yang ramah dan profesional. "
        . "Arahkan pertanyaan di luar konteks kembali ke topik Garuda Nexa. Gunakan Markdown yang rapi dan jawab ringkas.";

    // Only user/assistant turns from the client; the system prompt is ours
    $chat = [["role" => "system", "content" => $system]];
    foreach (array_slice($messages, -20) as $m) {
        if (in_array($m['role'] ?? '', ['user', 'assistant'], true) && is_string($m['content'] ?? null)) {
            $chat[] = ["role" => $m['role'], "content" => $m['content']];
        }
    }

    $ch = curl_init($baseUrl . '/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $apiKey],
        CURLOPT_POSTFIELDS => json_encode(["model" => $model, "messages" => $chat, "temperature" => 0.7, "max_tokens" => 1500]),
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 120,
    ]);
    $body = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $reply = json_decode((string)$body, true)['choices'][0]['message']['content'] ?? null;
    if ($err || $code >= 400 || $reply === null) {
        return ["error" => "AI server di $baseUrl tidak merespons" . ($err ? ": $err" : " (HTTP $code)") . ". Jalankan Ollama atau set AI_BASE_URL/AI_MODEL."];
    }
    return ["reply" => $reply];
}
?>
