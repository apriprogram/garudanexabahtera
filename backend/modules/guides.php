<?php
// Guide articles /panduan and /panduan/{slug} (docs/platform/SEO-PLAN.md §5.8) for backend/api.php: the public list and
// article, page views, and the admin tab Panduan (create, edit, publish, delete). Tables guide_articles + guide_views
// (database/migrations/2026-10-24_017_guide_articles.sql). JSON shapes and limits = src/content/panduan/core.ts
// (ArticleSummary, Article, AdminGuide, GuideInput, GUIDE_LIMITS, ARTICLE_CTAS).
// backend/modules/guides.js implements the same actions for the Node backend: keep both identical (action names, input
// validation, JSON shapes, HTTP status codes and `code` values); __tests__/backend/guides.test.ts runs both.
//
// api.php calls handle_guide_action() after the access check (authorize_request): get_guides, get_guide and guide_view
// are in PUBLIC_ACTIONS, the admin_* actions in ADMIN_ACTIONS; the handlers re-check the admin role as a second line.
// backend/seo.php reads published articles through gd_article_out() as well (guides published after the last deploy).
// Uses from api.php: ApiError, db_run/db_all/db_one, in_str/in_int/in_flag, client_ip, rate_limit_wait/rate_limit_hit,
// too_many_attempts.
//
// Terbit = `reviewed` terisi (tanggal artikel selesai disunting dan dicek faktanya oleh manusia); reviewed NULL = draf,
// hanya tampil di panel admin. Panjang dihitung dalam karakter (mb_strlen = code point, sama dengan [...s].length di
// guides.js).

const GD_SLUG_PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/D';
const GD_DATE_PATTERN = '/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/D';
// URL sumber: http(s):// lalu tanpa spasi. Kelas spasi ditulis lengkap (\s PHP /u ditambah U+0085, U+180E, U+FEFF),
// karena \s PHP dan JavaScript berbeda di tiga karakter itu; sama dengan SOURCE_PATTERN di guides.js
const GD_SOURCE_PATTERN = '/^https?:\/\/[^\s\x{85}\x{180E}\x{FEFF}]+$/Du';
// Deretan spasi di judul (kelas yang sama dengan GD_SOURCE_PATTERN), untuk cek judul ganda; sama dengan SPACE_RUN di guides.js
const GD_SPACE_RUN = '/[\s\x{85}\x{180E}\x{FEFF}]+/u';
// Sama dengan GUIDE_LIMITS (src/content/panduan/core.ts)
const GD_LIMITS = [
    'slugMax' => 120,
    'titleMin' => 10,
    'titleMax' => 60,
    'descriptionMin' => 50,
    'descriptionMax' => 155,
    'bodyMin' => 200,
    'authorMax' => 120,
    'sourcesMax' => 30,
    'relatedMax' => 10,
];
// Batas server tambahan (tidak ada di GUIDE_LIMITS): isi artikel ≤ 200.000 karakter (kolom MEDIUMTEXT jauh lebih
// besar; ini menahan kiriman yang tidak wajar), satu URL sumber ≤ 500 karakter (30 URL tetap muat di kolom TEXT)
const GD_BODY_MAX = 200000;
const GD_SOURCE_MAX = 500;
const GD_CTAS = ['template', 'website', 'mobile']; // ARTICLE_CTAS
const GD_HUB_PAGE = '/panduan';
const GD_VIEWS_PER_HOUR = 300;   // halaman dilihat per IP per jam, sama dengan PF_VIEWS_PER_HOUR (template_view)
const GD_TIMEZONE = 'Asia/Jakarta';
const GD_NOT_FOUND = 'Artikel tidak ditemukan.';
const GD_JSON_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE;

// Baca boleh lewat GET (query string) maupun POST; aksi lain hanya POST
const GD_GET_ACTIONS = ['get_guides', 'get_guide', 'admin_get_guides'];

function handle_guide_action(mysqli $conn, string $action, array $input, ?array $user): bool {
    static $handlers = [
        // publik
        'get_guides' => 'gd_get_guides',
        'get_guide' => 'gd_get_guide',
        'guide_view' => 'gd_guide_view',
        // admin (ADMIN_ACTIONS)
        'admin_get_guides' => 'gd_admin_get_guides',
        'admin_save_guide' => 'gd_admin_save_guide',
        'admin_delete_guide' => 'gd_admin_delete_guide',
    ];
    if (!isset($handlers[$action])) return false;
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST' && !in_array($action, GD_GET_ACTIONS, true)) {
        throw new ApiError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    }
    $data = call_user_func($handlers[$action], $conn, $input, $user);
    echo json_encode(array_merge(['success' => true], $data), GD_JSON_FLAGS);
    return true;
}

// ════════════════════════════════════════════════════════════════════════════
// Publik
// ════════════════════════════════════════════════════════════════════════════

// Artikel terbit (tanpa isi, sumber dan artikel terkait), terbaru dulu: { guides: ArticleSummary[] }
function gd_get_guides(mysqli $conn, array $input, ?array $user): array {
    $rows = db_all($conn, "SELECT slug, title, description, author, date_published, date_modified, reviewed
                           FROM guide_articles WHERE reviewed IS NOT NULL");
    return ['guides' => gd_sort_guides(array_map('gd_summary_out', $rows))];
}

// Satu artikel terbit lengkap dengan isi: { guide: Article }. Draf, slug tidak dikenal atau tidak sah → 404.
// related hanya berisi artikel yang terbit (urutan tetap), jadi slug draf tidak terbuka ke publik; aksi admin tetap
// memakai daftar lengkap.
function gd_get_guide(mysqli $conn, array $input, ?array $user): array {
    $slug = trim(in_str($input, 'slug'));
    $row = gd_is_slug($slug) ? gd_published_row($conn, $slug) : null;
    if (!$row) throw gd_not_found();
    $guide = gd_article_out($row);
    if ($guide['related']) {
        $published = array_column(db_all($conn, "SELECT slug FROM guide_articles WHERE reviewed IS NOT NULL"), 'slug');
        $guide['related'] = gd_filter_slugs($guide['related'], $published);
    }
    return ['guide' => $guide];
}

// Halaman /panduan atau /panduan/{slug} dibuka: +1 (sekali per sesi browser), dibatasi per IP seperti template_view.
// { views: jumlah dilihat halaman itu }
function gd_guide_view(mysqli $conn, array $input, ?array $user): array {
    $limit = 'gd-view|' . client_ip();
    $wait = rate_limit_wait($limit, GD_VIEWS_PER_HOUR);
    if ($wait) too_many_attempts($wait);
    $page = gd_view_page($conn, $input['page'] ?? null);
    rate_limit_hit($limit, 3600);
    db_run($conn, "INSERT INTO guide_views (page, view_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE view_count = view_count + 1", [$page]);
    return ['views' => (int)db_one($conn, "SELECT view_count FROM guide_views WHERE page = ?", [$page])['view_count']];
}

/** Halaman yang dihitung: persis "/panduan" atau "/panduan/{slug}" artikel terbit; selain itu 404. */
function gd_view_page(mysqli $conn, $page): string {
    $slug = is_string($page) ? gd_page_slug($page) : null;
    if ($slug === '') return GD_HUB_PAGE;
    if ($slug === null || !gd_published_row($conn, $slug)) throw gd_not_found();
    return GD_HUB_PAGE . '/' . $slug;
}

/** "/panduan" → '' (daftar), "/panduan/{slug}" → slug, selain itu null. Tanpa trim: path harus persis. */
function gd_page_slug(string $page): ?string {
    if ($page === GD_HUB_PAGE) return '';
    $prefix = GD_HUB_PAGE . '/';
    if (strncmp($page, $prefix, strlen($prefix)) !== 0) return null;
    $slug = (string)substr($page, strlen($prefix));
    return gd_is_slug($slug) ? $slug : null;
}

function gd_published_row(mysqli $conn, string $slug): ?array {
    return db_one($conn, "SELECT * FROM guide_articles WHERE slug = ? AND reviewed IS NOT NULL LIMIT 1", [$slug]);
}

// ════════════════════════════════════════════════════════════════════════════
// Admin (tab Panduan; ADMIN_ACTIONS)
// ════════════════════════════════════════════════════════════════════════════

// Semua artikel (draf juga), urutan sama dengan get_guides, dengan jumlah dilihat:
// { guides: AdminGuide[], hubViews: jumlah dilihat /panduan }
function gd_admin_get_guides(mysqli $conn, array $input, ?array $user): array {
    gd_require_admin($user);
    $views = gd_view_counts($conn);
    $guides = [];
    foreach (db_all($conn, "SELECT * FROM guide_articles") as $row) $guides[] = gd_admin_out($row, $views);
    return ['guides' => gd_sort_guides($guides), 'hubViews' => $views[GD_HUB_PAGE] ?? 0];
}

// Tambah (tanpa id) atau ubah artikel dari GuideInput: { guide: AdminGuide }. dateModified dan reviewed diisi server
// (gd_derive_dates); slug yang berganti membawa jumlah dilihatnya ke alamat baru dan ikut diganti di `related` artikel
// lain.
function gd_admin_save_guide(mysqli $conn, array $input, ?array $user): array {
    gd_require_admin($user);
    $id = in_int($input, 'id');
    $existing = null;
    if ($id > 0) {
        $existing = db_one($conn, "SELECT * FROM guide_articles WHERE id = ? LIMIT 1", [$id]);
        if (!$existing) throw gd_not_found();
    }
    $today = gd_today();
    [$guide, $errors] = gd_validate_input($input, $today);
    if ($errors) throw new ApiError(reset($errors), 400, 'VALIDATION', $errors);
    if (db_one($conn, "SELECT id FROM guide_articles WHERE slug = ? AND id <> ? LIMIT 1", [$guide['slug'], $id])) {
        throw new ApiError('Slug sudah dipakai artikel lain.', 409, 'SLUG_TAKEN', ['slug' => 'Slug sudah dipakai artikel lain.']);
    }
    // Judul ganda membuat cek prerender gagal ("title ganda") di setiap deploy. Dibandingkan dengan semua artikel, draf
    // juga, supaya menerbitkan draf nanti tidak bentrok
    $titleKey = gd_title_key($guide['title']);
    foreach (db_all($conn, "SELECT title FROM guide_articles WHERE id <> ?", [$id]) as $other) {
        if (gd_title_key((string)$other['title']) === $titleKey) {
            throw new ApiError('Judul sudah dipakai artikel lain.', 409, 'TITLE_TAKEN', ['title' => 'Judul sudah dipakai artikel lain.']);
        }
    }
    $dates = gd_derive_dates($existing ? gd_admin_out($existing, []) : null, $guide, $today);
    $values = [
        $guide['slug'], $guide['title'], $guide['description'], $guide['body'], $guide['author'], $guide['cta'],
        gd_json($guide['sources']), gd_json($guide['related']), $guide['datePublished'], $dates['dateModified'], $dates['reviewed'],
    ];
    $page = GD_HUB_PAGE . '/' . $guide['slug'];
    $conn->begin_transaction();
    try {
        if ($existing) {
            $values[] = $id;
            db_run($conn, "UPDATE guide_articles SET slug = ?, title = ?, description = ?, body = ?, author = ?, cta = ?, sources = ?,
                           related = ?, date_published = ?, date_modified = ?, reviewed = ? WHERE id = ?", $values);
            if ($existing['slug'] !== $guide['slug']) {
                // Jumlah dilihat pindah ke alamat baru (baris lama di alamat baru, bila ada, bukan milik artikel ini)
                db_run($conn, "DELETE FROM guide_views WHERE page = ?", [$page]);
                db_run($conn, "UPDATE guide_views SET page = ? WHERE page = ?", [$page, GD_HUB_PAGE . '/' . $existing['slug']]);
                gd_rewrite_related($conn, $id, $existing['slug'], $guide['slug']);
            }
        } else {
            db_run($conn, "INSERT INTO guide_articles (slug, title, description, body, author, cta, sources, related, date_published,
                           date_modified, reviewed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", $values);
            $id = (int)$conn->insert_id;
            // Artikel baru mulai dari 0 dilihat
            db_run($conn, "DELETE FROM guide_views WHERE page = ?", [$page]);
        }
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        throw $e;
    }
    $row = db_one($conn, "SELECT * FROM guide_articles WHERE id = ? LIMIT 1", [$id]);
    $count = db_one($conn, "SELECT view_count FROM guide_views WHERE page = ?", [$page]);
    return ['guide' => gd_admin_out($row, $count ? [$page => (int)$count['view_count']] : [])];
}

// Hapus artikel beserta jumlah dilihatnya; slugnya dibuang dari `related` artikel lain: {}
function gd_admin_delete_guide(mysqli $conn, array $input, ?array $user): array {
    gd_require_admin($user);
    $id = in_int($input, 'id');
    $row = $id > 0 ? db_one($conn, "SELECT id, slug FROM guide_articles WHERE id = ? LIMIT 1", [$id]) : null;
    if (!$row) throw gd_not_found();
    $conn->begin_transaction();
    try {
        db_run($conn, "DELETE FROM guide_articles WHERE id = ?", [$id]);
        db_run($conn, "DELETE FROM guide_views WHERE page = ?", [GD_HUB_PAGE . '/' . $row['slug']]);
        gd_rewrite_related($conn, $id, (string)$row['slug'], null);
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        throw $e;
    }
    return [];
}

/**
 * Di dalam transaksi simpan/hapus: slug $from di `related` artikel lain (selain $id) diganti $to, atau dibuang bila
 * $to null. Hanya baris yang memuat $from yang ditulis ulang (JSON lewat gd_json). Sama dengan rewriteRelated() di
 * guides.js.
 */
function gd_rewrite_related(mysqli $conn, int $id, string $from, ?string $to): void {
    foreach (db_all($conn, "SELECT id, related FROM guide_articles WHERE id <> ? FOR UPDATE", [$id]) as $r) {
        $related = gd_json_list($r['related']);
        if (!in_array($from, $related, true)) continue;
        db_run($conn, "UPDATE guide_articles SET related = ? WHERE id = ?", [gd_json(gd_rename_related($related, $from, $to)), (int)$r['id']]);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Validasi & aturan tanggal (fungsi murni, dites berdampingan dengan guides.js)
// ════════════════════════════════════════════════════════════════════════════

/**
 * GuideInput → [artikel ternormalisasi, pesan galat per kolom]. Kunci galat = kunci GuideInput, urutan pengecekan sama
 * dengan validateGuideInput() di guides.js (pesan pertama menjadi `error`). $today = YYYY-MM-DD (Asia/Jakarta).
 * Hasil: slug, title, description, body (baris CRLF/CR → LF, di-trim), author, cta, sources (dirapikan, tanpa kosong &
 * ganda), related (sama), datePublished, published (bool).
 */
function gd_validate_input(array $input, string $today): array {
    $errors = [];
    $slug = gd_text($input, 'slug', 'Slug', $errors);
    if ($slug !== null) {
        if ($slug === '') $errors['slug'] = 'Slug wajib diisi.';
        elseif (mb_strlen($slug) > GD_LIMITS['slugMax']) $errors['slug'] = 'Slug maksimal ' . GD_LIMITS['slugMax'] . ' karakter.';
        elseif (!preg_match(GD_SLUG_PATTERN, $slug)) {
            $errors['slug'] = 'Slug hanya boleh huruf kecil, angka, dan tanda hubung, contoh: biaya-website-company-profile.';
        }
    }
    $title = gd_sized_text($input, 'title', 'Judul', GD_LIMITS['titleMin'], GD_LIMITS['titleMax'], $errors);
    $description = gd_sized_text($input, 'description', 'Deskripsi', GD_LIMITS['descriptionMin'], GD_LIMITS['descriptionMax'], $errors);

    $body = null;
    $rawBody = $input['body'] ?? null;
    if ($rawBody !== null && !is_string($rawBody)) {
        $errors['body'] = 'Isi artikel tidak valid.';
    } else {
        // Disimpan sudah di-trim, sama dengan formulir admin: isi yang hanya beda baris baru di akhir tidak terhitung berubah
        $body = trim(str_replace(["\r\n", "\r"], "\n", (string)$rawBody));
        $length = mb_strlen($body);
        if ($length === 0) $errors['body'] = 'Isi artikel wajib diisi.';
        elseif ($length < GD_LIMITS['bodyMin']) $errors['body'] = 'Isi artikel minimal ' . GD_LIMITS['bodyMin'] . ' karakter.';
        elseif ($length > GD_BODY_MAX) $errors['body'] = 'Isi artikel maksimal 200.000 karakter.';
    }

    $author = gd_sized_text($input, 'author', 'Penulis', 1, GD_LIMITS['authorMax'], $errors);
    $cta = $input['cta'] ?? null;
    if (!is_string($cta) || !in_array($cta, GD_CTAS, true)) {
        $errors['cta'] = 'Pilih ajakan di akhir artikel: template, website, atau mobile.';
        $cta = null;
    }

    $sources = [];
    $list = gd_list($input['sources'] ?? null);
    if ($list === null) {
        $errors['sources'] = 'Sumber harus berupa daftar URL.';
    } else {
        foreach ($list as $i => $item) {
            if (!is_string($item)) { $errors['sources'] = 'Sumber harus berupa daftar URL.'; break; }
            $url = trim($item);
            if ($url === '') continue;
            if (mb_strlen($url) > GD_SOURCE_MAX) { $errors['sources'] = 'Sumber ke-' . ($i + 1) . ' terlalu panjang (maksimal ' . GD_SOURCE_MAX . ' karakter).'; break; }
            if (!preg_match(GD_SOURCE_PATTERN, $url)) { $errors['sources'] = 'Sumber ke-' . ($i + 1) . ' harus URL lengkap yang diawali http:// atau https://.'; break; }
            if (!in_array($url, $sources, true)) $sources[] = $url;
        }
        if (!isset($errors['sources']) && count($sources) > GD_LIMITS['sourcesMax']) {
            $errors['sources'] = 'Sumber maksimal ' . GD_LIMITS['sourcesMax'] . ' URL.';
        }
    }

    $related = [];
    $list = gd_list($input['related'] ?? null);
    if ($list === null) {
        $errors['related'] = 'Artikel terkait harus berupa daftar slug.';
    } else {
        foreach ($list as $i => $item) {
            if (!is_string($item)) { $errors['related'] = 'Artikel terkait harus berupa daftar slug.'; break; }
            $other = trim($item);
            if ($other === '') continue;
            if (!gd_is_slug($other)) { $errors['related'] = 'Artikel terkait ke-' . ($i + 1) . ' bukan slug yang valid.'; break; }
            if ($other === $slug) { $errors['related'] = 'Artikel terkait tidak boleh artikel ini sendiri.'; break; }
            if (!in_array($other, $related, true)) $related[] = $other;
        }
        if (!isset($errors['related']) && count($related) > GD_LIMITS['relatedMax']) {
            $errors['related'] = 'Artikel terkait maksimal ' . GD_LIMITS['relatedMax'] . '.';
        }
    }

    $datePublished = gd_text($input, 'datePublished', 'Tanggal terbit', $errors);
    if ($datePublished !== null) {
        if ($datePublished === '') $errors['datePublished'] = 'Tanggal terbit wajib diisi.';
        elseif (!gd_is_date($datePublished)) $errors['datePublished'] = 'Tanggal terbit harus tanggal yang valid (YYYY-MM-DD).';
        elseif (strcmp($datePublished, $today) > 0) $errors['datePublished'] = 'Tanggal terbit tidak boleh setelah hari ini.';
    }

    return [[
        'slug' => $slug,
        'title' => $title,
        'description' => $description,
        'body' => $body,
        'author' => $author,
        'cta' => $cta,
        'sources' => $sources,
        'related' => $related,
        'datePublished' => $datePublished,
        'published' => in_flag($input, 'published') === 1,
    ], $errors];
}

/**
 * dateModified dan reviewed yang disimpan. $existing = artikel lama (bentuk AdminGuide) atau null untuk artikel baru.
 * - dateModified = hari ini untuk artikel baru atau bila judul, deskripsi, isi atau sumber berubah; selain itu tetap.
 *   Isi lama dibandingkan setelah di-trim (artikel awal dari migrasi tersimpan dengan baris baru di akhir).
 *   Tidak pernah sebelum datePublished (dinaikkan ke datePublished).
 * - reviewed = terbit ? (reviewed lama ?? hari ini) : null.
 */
function gd_derive_dates(?array $existing, array $guide, string $today): array {
    $changed = $existing === null
        || $existing['title'] !== $guide['title']
        || $existing['description'] !== $guide['description']
        || trim($existing['body']) !== $guide['body']
        || $existing['sources'] !== $guide['sources'];
    $modified = $changed ? $today : $existing['dateModified'];
    if (strcmp($modified, $guide['datePublished']) < 0) $modified = $guide['datePublished'];
    return ['dateModified' => $modified, 'reviewed' => $guide['published'] ? ($existing['reviewed'] ?? $today) : null];
}

/** Terbaru dulu: datePublished, lalu dateModified (turun), seri → slug A-Z. Sama dengan sortArticles (core.ts). */
function gd_sort_guides(array $guides): array {
    usort($guides, function ($a, $b) {
        return strcmp($b['datePublished'], $a['datePublished']) ?: strcmp($b['dateModified'], $a['dateModified']) ?: strcmp($a['slug'], $b['slug']);
    });
    return $guides;
}

/**
 * Kunci pembanding judul ganda: deretan spasi (GD_SPACE_RUN) jadi satu spasi, di-trim, huruf kecil Unicode
 * (mb_strtolower). Sama dengan titleKey() di guides.js.
 */
function gd_title_key(string $title): string {
    return mb_strtolower(trim(preg_replace(GD_SPACE_RUN, ' ', $title) ?? $title), 'UTF-8');
}

/** $from di daftar related diganti $to (null = dibuang); urutan tetap, tanpa ganda. Sama dengan renameRelated(). */
function gd_rename_related(array $related, string $from, ?string $to): array {
    $out = [];
    foreach ($related as $slug) {
        if ($slug === $from) $slug = $to;
        if ($slug !== null && !in_array($slug, $out, true)) $out[] = $slug;
    }
    return $out;
}

/** Slug di $slugs yang ada di $allowed, urutan $slugs tetap. Sama dengan filterSlugs() di guides.js. */
function gd_filter_slugs(array $slugs, array $allowed): array {
    return array_values(array_filter($slugs, function ($slug) use ($allowed) { return in_array($slug, $allowed, true); }));
}

function gd_is_slug($value): bool {
    return is_string($value) && $value !== '' && strlen($value) <= GD_LIMITS['slugMax'] && (bool)preg_match(GD_SLUG_PATTERN, $value);
}

/** YYYY-MM-DD yang benar-benar ada di kalender, tahun 1000–9999 (rentang kolom DATE). */
function gd_is_date(string $value): bool {
    if (!preg_match(GD_DATE_PATTERN, $value, $m)) return false;
    return (int)$m[1] >= 1000 && checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
}

/** Hari ini di Asia/Jakarta (YYYY-MM-DD). */
function gd_today(): string {
    return (new DateTime('now', new DateTimeZone(GD_TIMEZONE)))->format('Y-m-d');
}

// Teks yang di-trim; kosong/tidak ada → ''. Selain string → galat "{label} tidak valid." dan null
function gd_text(array $input, string $key, string $label, array &$errors): ?string {
    $raw = $input[$key] ?? null;
    if ($raw === null) return '';
    if (!is_string($raw)) {
        $errors[$key] = "$label tidak valid.";
        return null;
    }
    return trim($raw);
}

// Teks wajib dengan panjang min–max karakter
function gd_sized_text(array $input, string $key, string $label, int $min, int $max, array &$errors): ?string {
    $value = gd_text($input, $key, $label, $errors);
    if ($value === null) return null;
    $length = mb_strlen($value);
    if ($length === 0) $errors[$key] = "$label wajib diisi.";
    elseif ($length < $min) $errors[$key] = "$label minimal $min karakter.";
    elseif ($length > $max) $errors[$key] = "$label maksimal $max karakter.";
    return $value;
}

// Daftar JSON (array berindeks 0..n-1); tidak ada → []; selain daftar → null
function gd_list($value): ?array {
    if ($value === null) return [];
    if (!is_array($value)) return null;
    return ($value === [] || array_keys($value) === range(0, count($value) - 1)) ? $value : null;
}

function gd_json(array $list): string {
    return json_encode(array_values($list), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

// Kolom JSON daftar teks → array (rusak/bukan daftar → [])
function gd_json_list($value): array {
    $list = is_string($value) ? json_decode($value, true) : null;
    return is_array($list) ? array_values(array_filter($list, 'is_string')) : [];
}

function gd_require_admin(?array $user): array {
    if (!$user) throw new ApiError('Sesi tidak valid atau sudah berakhir. Silakan login kembali.', 401, 'UNAUTHORIZED');
    if (($user['role'] ?? '') !== 'admin') throw new ApiError('Akses ditolak: hanya admin.', 403, 'FORBIDDEN');
    return $user;
}

function gd_not_found(): ApiError {
    return new ApiError(GD_NOT_FOUND, 404, 'GUIDE_NOT_FOUND');
}

/** Jumlah dilihat per halaman (page => n). */
function gd_view_counts(mysqli $conn): array {
    $views = [];
    foreach (db_all($conn, "SELECT page, view_count FROM guide_views") as $r) $views[$r['page']] = (int)$r['view_count'];
    return $views;
}

// ── Bentuk JSON (src/content/panduan/core.ts) ──

/** ArticleSummary (urutan kunci = SUMMARY_KEYS). */
function gd_summary_out(array $r): array {
    return [
        'slug' => (string)$r['slug'],
        'title' => (string)$r['title'],
        'description' => (string)$r['description'],
        'author' => (string)$r['author'],
        'datePublished' => (string)$r['date_published'],
        'dateModified' => (string)$r['date_modified'],
        'reviewed' => $r['reviewed'] === null ? null : (string)$r['reviewed'],
    ];
}

/** Article: ringkasan + cta, sources, related, body. */
function gd_article_out(array $r): array {
    return gd_summary_out($r) + [
        'cta' => (string)$r['cta'],
        'sources' => gd_json_list($r['sources']),
        'related' => gd_json_list($r['related']),
        'body' => (string)$r['body'],
    ];
}

/** AdminGuide: id + Article + views (/panduan/{slug} di $views), createdAt, updatedAt. */
function gd_admin_out(array $r, array $views): array {
    return ['id' => (int)$r['id']] + gd_article_out($r) + [
        'views' => $views[GD_HUB_PAGE . '/' . $r['slug']] ?? 0,
        'createdAt' => (string)$r['created_at'],
        'updatedAt' => (string)$r['updated_at'],
    ];
}
