<?php
// Statistik kunjungan situs pembeli (docs/platform/SITE-STATS-SPEC.md §1–§3) for backend/api.php: pencatatan publik
// site_visit (dikirim CustomerSite di domain pembeli) dan dasbor pembeli customer_get_site_stats (CMS
// /akun/situs/:id/statistik). Tabel site_visit_stats + site_visitors (database/migrations/2026-10-27_031_site_stats.sql):
// angka agregat per situs per hari WIB, tanpa cookie dan tanpa alamat IP (pengunjung unik = hash harian). JSON shape =
// src/types/siteStats.ts (SiteStatsResponse, SITE_STATS_RANGES, SITE_VISIT_SOURCES, SITE_VISIT_DEVICE_LABEL).
// backend/modules/site_stats.js implements the same actions for the Node backend: keep both identical (action names,
// counting rules, messages, JSON shapes, HTTP status codes and `code` values); __tests__/backend/site-stats.test.ts runs
// both.
//
// api.php calls handle_site_stats_action() after the access check (authorize_request): site_visit is in PUBLIC_ACTIONS,
// customer_get_site_stats in CUSTOMER_ACTIONS; the handler re-checks the role (pf_require_customer) and the owner of the
// site. Tabel belum ada (errno 1146, migrasi 031 belum dijalankan): site_visit diam-diam tidak mencatat, dasbor menjawab
// 503 STATS_NOT_READY, tidak pernah 500.
// Uses from api.php: ApiError, db_run/db_all/db_one/db_affected_rows, in_str/in_int/in_flag, client_ip, auth_secret,
// ip_limit_key, parse_user_agent, rate_limit_wait/rate_limit_hit/rate_limit_prune, too_many_attempts; from visits.php:
// visit_landing_path, visit_referrer_host, visit_utm_source; from site_posts.php: sp_is_bot, sp_is_slug; from
// site_addons.php: sa_posts_enabled; from templates.php: pf_require_customer, pf_site_select.

// Sama dengan SITE_STATS_RANGES / SITE_STATS_RANGE_DEFAULT (src/types/siteStats.ts)
const SS_RANGES = [7, 30, 90, 365];
const SS_RANGE_DEFAULT = 30;
// Grup sumber kunjungan, urutan tetap untuk tampilan = SITE_VISIT_SOURCES
const SS_SOURCES = [
    'mesin_pencari' => 'Mesin pencari',
    'media_sosial' => 'Media sosial',
    'ai' => 'Asisten AI',
    'lainnya' => 'Situs lain',
    'langsung' => 'Langsung',
];
// = SITE_VISIT_DEVICE_LABEL; kunci = perangkat parse_user_agent (Desktop/Mobile/Tablet) dalam huruf kecil
const SS_DEVICES = ['desktop' => 'Komputer', 'mobile' => 'HP', 'tablet' => 'Tablet'];
// Host perujuk (atau utm_source berupa host) per grup, persis tabel spesifikasi §2. Host sudah tanpa "www." (visit_referrer_host).
// Asisten AI dicek lebih dulu: gemini.google.com sebelum google.*
const SS_AI_HOSTS = ['chatgpt.com', 'perplexity.ai', 'gemini.google.com', 'copilot.microsoft.com', 'claude.ai'];
const SS_SEARCH_HOSTS = ['bing.com', 'duckduckgo.com', 'yahoo.com', 'search.yahoo.com', 'ecosia.org', 'baidu.com'];
// google.* dan yandex.*: domain negara mana pun (google.com, google.co.id, yandex.ru, yandex.com.tr)
const SS_SEARCH_PATTERN = '/^(google|yandex)\.(com?\.)?[a-z]{2,3}$/D';
const SS_SOCIAL_HOSTS = [
    'facebook.com', 'm.facebook.com', 'l.facebook.com', 'lm.facebook.com', 'instagram.com', 'l.instagram.com', 't.co', 'x.com',
    'twitter.com', 'tiktok.com', 'youtube.com', 'linkedin.com', 'lnkd.in', 'threads.net', 'pinterest.com', 'wa.me',
    'web.whatsapp.com', 'whatsapp.com', 't.me', 'telegram.org',
];
const SS_SOCIAL_UTM = ['facebook', 'instagram', 'tiktok', 'whatsapp', 'wa', 'twitter', 'x', 'youtube', 'linkedin', 'telegram'];
// Perayap tambahan di atas SP_BOT_PATTERN (site_posts.php): peramban tanpa layar, audit halaman, pemantau uptime
const SS_BOT_PATTERN = '/headless|lighthouse|pingdom|uptime/i';
const SS_VISITS_PER_HOUR = 600;           // tampilan yang dicatat per IP (IPv6 per /64) per jam; lewat batas = tidak dicatat
// Path yang bisa jadi rute situs (§2): beranda "/", "/berita", "/pengumuman", "/{berita|pengumuman}/{slug}"
const SS_ROUTE_PATTERN = '~^/(berita|pengumuman)(?:/([^/]+))?$~D';
const SS_READS_PER_HOUR = 120;            // baca dasbor per pengguna per jam (ss-read|{user})
const SS_UA_MAX = 500;                    // user-agent dipotong seperti track_visit
const SS_DIM_MAX = 191;                   // panjang kolom site_visit_stats.dim
const SS_CLEANUP_ONE_IN = 50;             // ±1 dari 50 permintaan membersihkan site_visitors lama
const SS_CLEANUP_LIMIT = 1000;
const SS_VISITOR_KEEP_DAYS = 2;           // site_visitors dengan day < hari ini − 2 dihapus
// Perujuk berbeda per situs per hari; perujuk baru setelah itu dicatat di satu baris SS_REFERRER_OTHER (perujuk buatan
// skrip tidak menambah baris tanpa batas). '*' tidak pernah dihasilkan visit_referrer_host / visit_utm_source.
const SS_REFERRERS_PER_DAY = 200;
const SS_REFERRER_OTHER = '*';
const SS_REFERRER_OTHER_LABEL = 'Perujuk lain';
const SS_TOP_PAGES = 10;
const SS_TOP_REFERRERS = 10;
const SS_TOP_BROWSERS = 6;
const SS_JAKARTA_OFFSET = 25200;          // Asia/Jakarta, UTC+7 tanpa musim panas; dihitung di kode, bukan di MySQL
const SS_NO_TABLE = 1146;                 // MySQL ER_NO_SUCH_TABLE
const SS_JSON_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE;

const SS_RANGE_MESSAGE = 'Pilih rentang 7, 30, 90, atau 365 hari.';
const SS_NOT_READY_MESSAGE = 'Statistik belum siap. Coba lagi nanti.';

// Baca boleh lewat GET (query string) maupun POST; site_visit hanya POST
const SS_GET_ACTIONS = ['customer_get_site_stats'];

function handle_site_stats_action(mysqli $conn, string $action, array $input, ?array $user): bool {
    static $handlers = [
        // publik (PUBLIC_ACTIONS): satu tampilan halaman di domain pembeli
        'site_visit' => 'ss_site_visit',
        // pembeli (CUSTOMER_ACTIONS): hanya situs miliknya
        'customer_get_site_stats' => 'ss_customer_get_site_stats',
    ];
    if (!isset($handlers[$action])) return false;
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST' && !in_array($action, SS_GET_ACTIONS, true)) {
        throw new ApiError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    }
    $data = call_user_func($handlers[$action], $conn, $input, $user);
    echo json_encode(array_merge(['success' => true], $data), SS_JSON_FLAGS);
    return true;
}

// ════════════════════════════════════════════════════════════════════════════
// Pencatatan (publik): site_visit {site_id, path, referrer, utm_source, first}
// ════════════════════════════════════════════════════════════════════════════

// Jawaban selalu { success: true }, juga saat tampilan tidak dihitung, supaya tidak bisa dipakai menebak situs mana yang
// aktif. Tabel belum ada (migrasi 031) = tidak dicatat.
function ss_site_visit(mysqli $conn, array $input, ?array $user): array {
    try {
        ss_record_visit($conn, $input);
    } catch (mysqli_sql_exception $e) {
        if (!ss_missing_table($e)) throw $e;
    }
    return [];
}

/**
 * Dihitung hanya bila semua terpenuhi: path = rute situs (ss_visit_route), user-agent bukan perayap dan tidak kosong,
 * IP belum lewat batas, situs ada dan active, host Origin (atau Referer bila Origin kosong) = domain situs atau varian
 * www.-nya, dan rute itu memang tampil di situs ini (ss_route_shown).
 * Lalu satu INSERT … ON DUPLICATE KEY UPDATE per baris: total/page/hour selalu (views + 1, visits + 1 bila first);
 * source/referrer/device/browser hanya bila first (visits + 1); pengunjung baru hari itu → total & device visitors + 1.
 */
function ss_record_visit(mysqli $conn, array $input): void {
    $siteId = in_int($input, 'site_id');
    $path = visit_landing_path($input['path'] ?? null);
    $route = $path === null ? null : ss_visit_route($path);
    $ua = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, SS_UA_MAX);
    if ($siteId <= 0 || $route === null || ss_is_bot($ua)) return;
    $ip = client_ip();
    $limit = ss_visit_limit_key($ip);
    if (rate_limit_wait($limit, SS_VISITS_PER_HOUR)) return;
    $site = db_one($conn, "SELECT id, template_code, domain FROM template_sites WHERE id = ? AND status = 'active' LIMIT 1", [$siteId]);
    // visit_referrer_host: huruf kecil, tanpa skema/port/path dan tanpa "www." di depan, jadi www. dan tanpa www. sama
    $siteHost = $site ? visit_referrer_host((string)$site['domain']) : null;
    if ($siteHost === null || ss_request_host() !== $siteHost) return;
    rate_limit_hit($limit, 3600);
    // Path buatan skrip (halaman yang tidak ada di situs ini) tidak membuat baris statistik baru
    if (!ss_route_shown($conn, $site, $route)) return;

    $referrer = visit_referrer_host($input['referrer'] ?? null);
    if ($referrer === $siteHost) $referrer = null; // pindah halaman di situs sendiri = tanpa perujuk
    $utm = visit_utm_source($input['utm_source'] ?? null);
    $first = in_flag($input, 'first') === 1;
    [$device, $browser] = parse_user_agent($ua);
    $device = strtolower($device);
    $now = time() + SS_JAKARTA_OFFSET;
    $day = gmdate('Y-m-d', $now);
    $visit = $first ? 1 : 0;

    db_run($conn, "INSERT IGNORE INTO site_visitors (site_id, day, visitor) VALUES (?, ?, ?)",
        [$siteId, $day, ss_visitor_hash($siteId, $day, $ip, $ua)]);
    $newVisitor = db_affected_rows() > 0 ? 1 : 0;

    ss_add($conn, $siteId, $day, 'total', '', 1, $visit, $newVisitor);
    ss_add($conn, $siteId, $day, 'page', substr($path, 0, SS_DIM_MAX), 1, $visit, 0);
    ss_add($conn, $siteId, $day, 'hour', gmdate('H', $now), 1, $visit, 0);
    if ($first) {
        ss_add($conn, $siteId, $day, 'source', ss_source_group($referrer, $utm), 0, 1, 0);
        $from = $referrer ?? ($utm !== null ? 'utm:' . $utm : null);
        if ($from !== null) ss_add($conn, $siteId, $day, 'referrer', ss_referrer_dim($conn, $siteId, $day, substr($from, 0, SS_DIM_MAX)), 0, 1, 0);
        ss_add($conn, $siteId, $day, 'browser', $browser, 0, 1, 0);
    }
    if ($first || $newVisitor) ss_add($conn, $siteId, $day, 'device', $device, 0, $visit, $newVisitor);

    if (random_int(1, SS_CLEANUP_ONE_IN) === 1) {
        db_run($conn, "DELETE FROM site_visitors WHERE day < ? LIMIT " . SS_CLEANUP_LIMIT,
            [gmdate('Y-m-d', $now - SS_VISITOR_KEEP_DAYS * 86400)]);
        // Berkas batas laju yang sudah kedaluwarsa (Node menyimpan batas laju di memori dan membersihkannya sendiri)
        rate_limit_prune();
    }
}

function ss_add(mysqli $conn, int $siteId, string $day, string $metric, string $dim, int $views, int $visits, int $visitors): void {
    db_run($conn, "INSERT INTO site_visit_stats (site_id, day, metric, dim, views, visits, visitors) VALUES (?, ?, ?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE views = views + VALUES(views), visits = visits + VALUES(visits),
                                           visitors = visitors + VALUES(visitors)",
        [$siteId, $day, $metric, $dim, $views, $visits, $visitors]);
}

/**
 * Baris perujuk untuk $dim: baris yang sudah ada hari itu dipakai lagi; perujuk baru hanya bila situs belum punya
 * SS_REFERRERS_PER_DAY perujuk hari itu, selain itu SS_REFERRER_OTHER.
 */
function ss_referrer_dim(mysqli $conn, int $siteId, string $day, string $dim): string {
    $known = db_one($conn, "SELECT 1 AS found FROM site_visit_stats WHERE site_id = ? AND day = ? AND metric = 'referrer' AND dim = ? LIMIT 1",
        [$siteId, $day, $dim]);
    if ($known !== null) return $dim;
    $count = db_one($conn, "SELECT COUNT(*) AS n FROM site_visit_stats WHERE site_id = ? AND day = ? AND metric = 'referrer'", [$siteId, $day]);
    return (int)($count['n'] ?? 0) >= SS_REFERRERS_PER_DAY ? SS_REFERRER_OTHER : $dim;
}

/**
 * Rute situs dari path yang dikirim CustomerSite (sitePath, selalu tanpa garis miring di akhir): ['', ''] = beranda "/",
 * [jenis, ''] = "/berita" atau "/pengumuman", [jenis, slug] = "/{jenis}/{slug}" dengan slug sah (sp_is_slug).
 * Path lain (halaman tidak ditemukan, path buatan skrip) = null, tidak dihitung.
 */
function ss_visit_route(string $path): ?array {
    if ($path === '/') return ['', ''];
    if (!preg_match(SS_ROUTE_PATTERN, $path, $m)) return null;
    $slug = $m[2] ?? '';
    if ($slug !== '' && !sp_is_slug($slug)) return null;
    return [$m[1], $slug];
}

/**
 * Rute itu memang tampil di situs ini, sama dengan CustomerSite: beranda selalu; daftar berita/pengumuman hanya bila
 * fitur Berita & Pengumuman aktif (sa_posts_enabled); tulisan juga harus terbit dengan jenis dan slug itu.
 * $site: id, template_code.
 */
function ss_route_shown(mysqli $conn, array $site, array $route): bool {
    [$kind, $slug] = $route;
    if ($kind === '') return true;
    if (!sa_posts_enabled($conn, $site)) return false;
    if ($slug === '') return true;
    return db_one($conn, "SELECT 1 AS found FROM site_posts WHERE site_id = ? AND kind = ? AND slug = ? AND status = 'published' LIMIT 1",
        [(int)$site['id'], $kind, $slug]) !== null;
}

/**
 * Kunci batas laju pencatatan (ip_limit_key): IPv6 per prefiks /64 (satu sambungan bisa berganti alamat di dalamnya),
 * di-HMAC dengan AUTH_SECRET supaya nama berkas batas laju di folder temp (rate_limit_file) tidak bisa dicocokkan balik
 * ke alamat IP pengunjung; berkas kedaluwarsa dihapus rate_limit_prune.
 */
function ss_visit_limit_key(string $ip): string {
    return ip_limit_key('sv', $ip);
}

/** Host halaman pengirim: header Origin, atau Referer bila Origin kosong (bentuk visit_referrer_host); null bila tidak sah. */
function ss_request_host(): ?string {
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    return visit_referrer_host($origin !== '' ? $origin : (string)($_SERVER['HTTP_REFERER'] ?? ''));
}

/** User-agent kosong atau perayap (SP_BOT_PATTERN + SS_BOT_PATTERN). */
function ss_is_bot(string $userAgent): bool {
    return trim($userAgent) === '' || sp_is_bot($userAgent) || (bool)preg_match(SS_BOT_PATTERN, $userAgent);
}

/** Penanda pengunjung unik per situs per hari: 16 hex pertama sha256(AUTH_SECRET|site_id|day|ip|user_agent). IP tidak disimpan. */
function ss_visitor_hash(int $siteId, string $day, string $ip, string $userAgent): string {
    return substr(hash('sha256', (string)auth_secret() . '|' . $siteId . '|' . $day . '|' . $ip . '|' . $userAgent), 0, 16);
}

/** Grup sumber satu kunjungan (§2): host perujuk dulu, lalu utm_source; tanpa keduanya = langsung. */
function ss_source_group(?string $referrer, ?string $utm): string {
    $group = ss_host_group($referrer) ?? ss_host_group($utm);
    if ($group === null && $utm !== null && in_array($utm, SS_SOCIAL_UTM, true)) $group = 'media_sosial';
    if ($group !== null) return $group;
    return ($referrer !== null || $utm !== null) ? 'lainnya' : 'langsung';
}

/** Grup bernama satu host (atau utm_source berupa host); null = bukan salah satunya. */
function ss_host_group(?string $host): ?string {
    if ($host === null || $host === '') return null;
    if (in_array($host, SS_AI_HOSTS, true)) return 'ai';
    if (in_array($host, SS_SEARCH_HOSTS, true) || preg_match(SS_SEARCH_PATTERN, $host)) return 'mesin_pencari';
    if (in_array($host, SS_SOCIAL_HOSTS, true)) return 'media_sosial';
    return null;
}

// ════════════════════════════════════════════════════════════════════════════
// Dasbor pembeli (CUSTOMER_ACTIONS; /akun/situs/:siteId/statistik)
// ════════════════════════════════════════════════════════════════════════════

// Statistik satu situs milik pembeli (status apa pun): SiteStatsResponse. range ∈ {7, 30, 90, 365}, bawaan 30.
function ss_customer_get_site_stats(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    ss_count_read($user);
    $range = ss_range_input($input);
    $siteId = in_int($input, 'site_id');
    $site = $siteId > 0 ? db_one($conn, pf_site_select(false) . " WHERE s.id = ? AND s.user_id = ? LIMIT 1", [$siteId, (int)$user['id']]) : null;
    if (!$site) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
    try {
        return ss_stats($conn, (int)$site['id'], $range);
    } catch (mysqli_sql_exception $e) {
        // Migrasi 031 belum dijalankan: jawaban yang jelas, bukan 500
        if (ss_missing_table($e)) throw new ApiError(SS_NOT_READY_MESSAGE, 503, 'STATS_NOT_READY');
        throw $e;
    }
}

/** range dari input: kosong → bawaan; selain SS_RANGES → 400 VALIDATION errors.range. */
function ss_range_input(array $input): int {
    $raw = trim(in_str($input, 'range'));
    if ($raw === '') return SS_RANGE_DEFAULT;
    foreach (SS_RANGES as $range) {
        if ($raw === (string)$range) return $range;
    }
    throw new ApiError(SS_RANGE_MESSAGE, 400, 'VALIDATION', ['range' => SS_RANGE_MESSAGE]);
}

/** Batas baca dasbor per pengguna (setiap permintaan dihitung). */
function ss_count_read(array $user): void {
    $key = 'ss-read|' . (int)$user['id'];
    $wait = rate_limit_wait($key, SS_READS_PER_HOUR);
    if ($wait) too_many_attempts($wait);
    rate_limit_hit($key, 3600);
}

/** SiteStatsResponse (tanpa success) untuk $range hari sampai hari ini WIB. */
function ss_stats(mysqli $conn, int $siteId, int $range): array {
    // Tengah malam WIB hari ini sebagai detik UTC: gmdate() di atasnya memberi tanggal WIB
    $today = intdiv(time() + SS_JAKARTA_OFFSET, 86400) * 86400;
    $day = function (int $back) use ($today): string { return gmdate('Y-m-d', $today - $back * 86400); };
    $to = $day(0);
    $from = $day($range - 1);

    $byDay = [];
    foreach (db_all($conn, "SELECT day, views, visits, visitors FROM site_visit_stats
                            WHERE site_id = ? AND metric = 'total' AND day BETWEEN ? AND ?", [$siteId, $day(2 * $range - 1), $to]) as $r) {
        $byDay[$r['day']] = ss_totals_out($r);
    }
    $zero = ['views' => 0, 'visits' => 0, 'visitors' => 0];
    $daily = [];
    $totals = $zero;
    $previous = $zero;
    for ($back = 2 * $range - 1; $back >= 0; $back--) {
        $date = $day($back);
        $row = $byDay[$date] ?? $zero;
        if ($back >= $range) {
            $previous = ss_add_totals($previous, $row);
            continue;
        }
        $totals = ss_add_totals($totals, $row);
        $daily[] = array_merge(['day' => $date], $row);
    }

    $period = [$siteId, $from, $to];
    $pages = db_all($conn, "SELECT dim, SUM(views) AS n FROM site_visit_stats WHERE site_id = ? AND metric = 'page' AND day BETWEEN ? AND ?
                            GROUP BY dim ORDER BY n DESC, dim LIMIT " . SS_TOP_PAGES, $period);
    $titles = ss_page_titles($conn, $siteId, array_column($pages, 'dim'));
    $sources = ss_sums($conn, "SELECT dim, SUM(visits) AS n FROM site_visit_stats WHERE site_id = ? AND metric = 'source' AND day BETWEEN ? AND ?
                               GROUP BY dim", $period);
    $referrers = db_all($conn, "SELECT dim, SUM(visits) AS n FROM site_visit_stats WHERE site_id = ? AND metric = 'referrer' AND day BETWEEN ? AND ?
                                GROUP BY dim ORDER BY n DESC, dim LIMIT " . SS_TOP_REFERRERS, $period);
    $devices = [];
    foreach (db_all($conn, "SELECT dim, SUM(visits) AS n, SUM(visitors) AS u FROM site_visit_stats
                            WHERE site_id = ? AND metric = 'device' AND day BETWEEN ? AND ? GROUP BY dim", $period) as $r) {
        $devices[strtolower((string)$r['dim'])] = $r;
    }
    $browsers = db_all($conn, "SELECT dim, SUM(visits) AS n FROM site_visit_stats WHERE site_id = ? AND metric = 'browser' AND day BETWEEN ? AND ?
                               GROUP BY dim ORDER BY n DESC, dim LIMIT " . SS_TOP_BROWSERS, $period);
    $hours = [];
    foreach (ss_sums($conn, "SELECT dim, SUM(views) AS n FROM site_visit_stats WHERE site_id = ? AND metric = 'hour' AND day BETWEEN ? AND ?
                             GROUP BY dim", $period) as $dim => $n) {
        $hours[(int)$dim] = $n;
    }
    $since = db_one($conn, "SELECT MIN(day) AS first_day FROM site_visit_stats WHERE site_id = ? AND metric = 'total'", [$siteId]);

    $out = [
        'range' => $range,
        'from' => $from,
        'to' => $to,
        'totals' => $totals,
        'previous' => $previous,
        'today' => $byDay[$to] ?? $zero,
        'daily' => $daily,
        'pages' => array_map(function ($r) use ($titles) {
            return ['path' => (string)$r['dim'], 'title' => $titles[(string)$r['dim']] ?? null, 'views' => (int)$r['n']];
        }, $pages),
        'sources' => [],
        'referrers' => array_map(function ($r) {
            $host = (string)$r['dim'];
            if ($host === SS_REFERRER_OTHER) $host = SS_REFERRER_OTHER_LABEL;
            elseif (strncmp($host, 'utm:', 4) === 0) $host = substr($host, 4) . ' (utm)';
            return ['host' => $host, 'visits' => (int)$r['n']];
        }, $referrers),
        'devices' => [],
        'browsers' => array_map(function ($r) { return ['name' => (string)$r['dim'], 'visits' => (int)$r['n']]; }, $browsers),
        'hours' => [],
        'tracking_since' => $since && $since['first_day'] !== null ? (string)$since['first_day'] : null,
    ];
    foreach (SS_SOURCES as $key => $label) $out['sources'][] = ['key' => $key, 'label' => $label, 'visits' => $sources[$key] ?? 0];
    foreach (SS_DEVICES as $key => $label) {
        $out['devices'][] = [
            'key' => $key,
            'label' => $label,
            'visits' => (int)($devices[$key]['n'] ?? 0),
            'visitors' => (int)($devices[$key]['u'] ?? 0),
        ];
    }
    for ($hour = 0; $hour < 24; $hour++) $out['hours'][] = ['hour' => $hour, 'views' => $hours[$hour] ?? 0];
    return $out;
}

/** {dim: n} dari kueri "SELECT dim, SUM(…) AS n … GROUP BY dim". */
function ss_sums(mysqli $conn, string $sql, array $params): array {
    $sums = [];
    foreach (db_all($conn, $sql, $params) as $r) $sums[(string)$r['dim']] = (int)$r['n'];
    return $sums;
}

/**
 * Judul halaman terpopuler: / → Beranda, /berita → Berita, /pengumuman → Pengumuman, /berita/{slug} dan
 * /pengumuman/{slug} → judul tulisan situs ini (jenis sama) bila ada; selain itu tidak ada (null).
 */
function ss_page_titles(mysqli $conn, int $siteId, array $paths): array {
    $titles = [];
    $slugs = [];
    foreach ($paths as $path) {
        $path = (string)$path;
        if ($path === '/') $titles[$path] = 'Beranda';
        elseif ($path === '/berita') $titles[$path] = 'Berita';
        elseif ($path === '/pengumuman') $titles[$path] = 'Pengumuman';
        elseif (preg_match('~^/(berita|pengumuman)/([a-z0-9]+(?:-[a-z0-9]+)*)$~D', $path, $m)) $slugs[$m[2]] = true;
    }
    if (!$slugs) return $titles;
    $marks = implode(', ', array_fill(0, count($slugs), '?'));
    $found = [];
    foreach (db_all($conn, "SELECT kind, slug, title FROM site_posts WHERE site_id = ? AND slug IN ($marks)",
        array_merge([$siteId], array_map('strval', array_keys($slugs)))) as $r) {
        $found['/' . $r['kind'] . '/' . $r['slug']] = (string)$r['title'];
    }
    foreach ($paths as $path) {
        if (isset($found[(string)$path])) $titles[(string)$path] = $found[(string)$path];
    }
    return $titles;
}

function ss_totals_out(array $r): array {
    return ['views' => (int)$r['views'], 'visits' => (int)$r['visits'], 'visitors' => (int)$r['visitors']];
}

function ss_add_totals(array $a, array $b): array {
    return ['views' => $a['views'] + $b['views'], 'visits' => $a['visits'] + $b['visits'], 'visitors' => $a['visitors'] + $b['visitors']];
}

function ss_missing_table(Throwable $e): bool {
    return $e instanceof mysqli_sql_exception && (int)$e->getCode() === SS_NO_TABLE;
}
