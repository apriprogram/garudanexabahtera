<?php
// Berita & pengumuman situs pembeli (template sekolah) dan pengaturan SEO situs (docs/platform/SITE-POSTS-SEO-SPEC.md
// §2 dan §4) for backend/api.php: CRUD tulisan + jumlah dilihat di panel akun pembeli (/akun/situs/:id/berita),
// pengaturan SEO per situs (/akun/situs/:id/seo), dan bacaan publik untuk situs pembeli. Tabel site_posts,
// site_post_views, site_seo (database/migrations/2026-10-26_029_site_posts_seo.sql). JSON shapes and limits =
// src/types/sitePosts.ts (SitePostSummary, SitePostPublic, SitePostAdmin, SitePostInput, SiteSeoSettings, SiteSeoResponse,
// SiteSeoPublic, SITE_POST_LIMITS, SITE_SEO_LIMITS, SITE_SCHEMA_TYPES).
// backend/modules/site_posts.js implements the same actions for the Node backend: keep both identical (action names,
// input validation, messages, JSON shapes, HTTP status codes and `code` values); __tests__/backend/site-posts*.test.ts
// run both.
//
// api.php calls handle_site_post_action() after the access check (authorize_request): get_site_seo, get_site_posts,
// get_site_post and site_post_view are in PUBLIC_ACTIONS, the customer_* actions in CUSTOMER_ACTIONS; the handlers
// re-check the role (pf_require_customer) and the owner of the site (pf_customer_site, templates.php).
// Tulisan berbayar (docs/platform/SITE-ADDONS-SPEC.md §3): tulisan hanya dibaca/ditulis bila template mampu DAN fitur
// Berita & Pengumuman aktif (sa_addon_active / sa_posts_enabled, site_addons.php). Mampu tapi belum aktif → aksi
// pembeli 403 POSTS_LOCKED, publik daftar kosong / 404. Tulisan yang ada tidak dihapus, hanya disembunyikan. SEO situs
// tidak terpengaruh.
// backend/site.php (kepala halaman, robots.txt dan sitemap.xml domain pembeli) juga me-require file ini untuk konstanta
// dan fungsi murni (sp_*_out, sp_index_reasons, sp_default_name, kolom SP_*_COLUMNS), jadi file ini tidak boleh punya
// efek samping saat di-include: hanya konstanta dan fungsi.
// Uses from api.php: ApiError, db_run/db_all/db_one/db_affected_rows, in_str/in_int, client_ip, ip_limit_key,
// rate_limit_wait/rate_limit_hit, too_many_attempts, parse_upload, save_base64_asset, delete_local_asset; from
// templates.php: pf_require_customer, pf_customer_site, pf_delete_generated; from site_addons.php: sa_addon_active,
// sa_posts_enabled.
//
// Panjang dihitung dalam karakter (mb_strlen = code point, sama dengan [...s].length di site_posts.js). Waktu keluar
// sebagai ISO 8601 WIB (2026-10-26T09:30:00+07:00) dari UNIX_TIMESTAMP(), jadi tidak bergantung zona waktu sesi MySQL.

// Template yang punya fitur tulisan: sama dengan POST_TEMPLATE_CODES (site_posts.js) dan features.posts di registri
// src/templates (dijaga tes paritas). Template sekolah baru cukup ditambahkan di ketiga tempat itu.
const SP_POST_TEMPLATE_CODES = ['madani', 'cakrawala', 'bestari', 'jumantara', 'nawasena', 'pradipta'];
const SP_KINDS = ['berita', 'pengumuman'];
const SP_STATUSES = ['draft', 'published'];
const SP_INDEX_MODES = ['auto', 'index', 'noindex'];
// Sama dengan SITE_SCHEMA_TYPES (src/types/sitePosts.ts); '' = otomatis
const SP_SCHEMA_TYPES = [
    '', 'Organization', 'LocalBusiness', 'School', 'EducationalOrganization', 'Preschool', 'ElementarySchool',
    'MiddleSchool', 'HighSchool', 'CollegeOrUniversity',
];
// Sama dengan SITE_POST_LIMITS dan SITE_SEO_LIMITS (src/types/sitePosts.ts)
const SP_LIMITS = [
    'title' => 160,
    'slug' => 120,
    'excerpt' => 300,
    'body' => 20000,
    'category' => 40,
    'badge' => 20,
    'imageAlt' => 200,
    'linkUrl' => 500,
    'seoTitle' => 70,
    'seoDescription' => 160,
    'maxPostsPerSite' => 500,
];
const SP_SEO_LIMITS = [
    'title' => 70,
    'description' => 160,
    'verification' => 100,
];
const SP_TITLE_MIN = 3;
const SP_SLUG_PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/D';
const SP_DATE_PATTERN = '/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/D';
// Deretan spasi (\s PHP /u ditambah U+0085, U+180E, U+FEFF, sama dengan SPACE_RUN di site_posts.js dan GD_SPACE_RUN di
// guides.php) dirapatkan jadi satu spasi di judul dan teks satu baris lainnya
const SP_SPACE_RUN = '/[\s\x{85}\x{180E}\x{FEFF}]+/u';
// Tautan tambahan tulisan: http(s)://, mailto:, tel:, path situs (/…, bukan // atau /\) atau #anchor. Tanpa spasi,
// karakter kontrol dan garis miring terbalik. Sama dengan LINK_PATTERN di site_posts.js
const SP_LINK_PATTERN = '~^(?:https?://[^\s\x{85}\x{180E}\x{FEFF}\x00-\x1F\x7F\\\\]+|(?:mailto|tel):[^\s\x{85}\x{180E}\x{FEFF}\x00-\x1F\x7F\\\\]+'
    . '|/(?![/\\\\])[^\s\x{85}\x{180E}\x{FEFF}\x00-\x1F\x7F\\\\]*|#[^\s\x{85}\x{180E}\x{FEFF}\x00-\x1F\x7F\\\\]*)$~Diu';
// Kode verifikasi Google Search Console / Bing Webmaster (nilai content tag meta)
const SP_VERIFICATION_PATTERN = '/^[A-Za-z0-9_-]{10,100}$/D';
const SP_VERIFICATION_INPUT_MAX = 500;        // tempelan seluruh tag <meta …> masih muat
const SP_IMAGE_MAX_BYTES = 2097152;           // satu foto setelah di-decode (2 MB), sama dengan foto CMS situs
const SP_IMAGE_EXTS = ['png', 'jpg', 'webp', 'gif']; // foto unggahan pembeli: raster saja, tidak pernah SVG
const SP_SAVES_PER_HOUR = 120;                // simpan tulisan/SEO per pengguna per jam
const SP_VIEWS_PER_HOUR = 300;                // tulisan dilihat per IP per jam, sama dengan GD_VIEWS_PER_HOUR
const SP_LIST_DEFAULT = 12;
const SP_LIST_MAX = 100;
// User-agent perayap: dijawab jumlah dilihat tanpa menambah hitungan
const SP_BOT_PATTERN = '/bot|crawl|spider|slurp|facebookexternalhit|preview/i';
const SP_JAKARTA_OFFSET = 25200;              // Asia/Jakarta, UTC+7 tanpa musim panas
const SP_TIMEZONE = 'Asia/Jakarta';
const SP_JSON_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE;

const SP_POST_NOT_FOUND = 'Tulisan tidak ditemukan.';
const SP_SITE_INACTIVE = 'Situs tidak ditemukan atau sedang tidak aktif.';
const SP_SITE_SUSPENDED = 'Situs sedang dinonaktifkan sehingga isinya tidak bisa diubah. Hubungi kami.';
const SP_POSTS_UNAVAILABLE = 'Template situs ini belum mendukung berita & pengumuman.';
const SP_POSTS_LOCKED = 'Fitur Berita & Pengumuman belum aktif untuk situs ini. Aktifkan di menu Fitur tambahan.';
const SP_SLUG_TAKEN = 'Slug sudah dipakai tulisan lain di situs ini.';
const SP_POST_LIMIT = 'Situs ini sudah punya 500 tulisan, jumlah maksimal. Hapus tulisan lama sebelum menulis yang baru.';
const SP_POST_CHANGED = 'Tulisan baru saja diubah di tab lain. Muat ulang lalu coba lagi.';
const SP_SEO_CHANGED = 'Pengaturan SEO baru saja diubah di tab lain. Muat ulang lalu coba lagi.';

// Kolom SELECT tulisan (alias tabel p; tambah LEFT JOIN site_post_views v untuk SP_ADMIN_COLUMNS). Dipakai juga site.php
// supaya data preload sama persis dengan jawaban API.
const SP_SUMMARY_COLUMNS = 'p.id, p.kind, p.slug, p.title, p.excerpt, p.category, p.badge, p.image, p.image_alt, p.link_url, '
    . 'p.published_at, UNIX_TIMESTAMP(p.updated_at) AS updated_ts';
const SP_POST_COLUMNS = SP_SUMMARY_COLUMNS . ', p.body, p.seo_title, p.seo_description, p.noindex';
const SP_ADMIN_COLUMNS = SP_POST_COLUMNS . ', p.status, UNIX_TIMESTAMP(p.created_at) AS created_ts, v.view_count, '
    . 'UNIX_TIMESTAMP(v.last_viewed_at) AS last_viewed_ts';
const SP_SEO_COLUMNS = 'title, description, og_image, google_verification, bing_verification, index_mode, schema_type, '
    . 'UNIX_TIMESTAMP(updated_at) AS updated_ts';
// Urutan panel akun: draf tanpa tanggal di atas (terakhir diubah dulu), lalu tanggal tampil terbaru
const SP_ADMIN_ORDER = 'p.published_at IS NULL DESC, CASE WHEN p.published_at IS NULL THEN p.updated_at END DESC, '
    . 'p.published_at DESC, p.id DESC';

// Huruf Latin berdiakritik (huruf kecil) → huruf dasarnya: hasil NFD tanpa tanda U+0300–U+036F, dibuat dari data Unicode
// lewat Node (String.prototype.normalize). PHP tanpa ekstensi intl tidak punya Normalizer, jadi slug otomatis memakai
// tabel ini; site_posts.js memakai normalize('NFD') langsung. Tes paritas membandingkan tabel ini dengan Node.
const SP_FOLD = [
    'a' => 'àáâãäåāăąǎǟǡǻȁȃȧḁạảấầẩẫậắằẳẵặ',
    'b' => 'ḃḅḇ',
    'c' => 'çćĉċčḉ',
    'd' => 'ďḋḍḏḑḓ',
    'e' => 'èéêëēĕėęěȅȇȩḕḗḙḛḝẹẻẽếềểễệ',
    'f' => 'ḟ',
    'g' => 'ĝğġģǧǵḡ',
    'h' => 'ĥȟḣḥḧḩḫẖ',
    'i' => 'ìíîïĩīĭįǐȉȋḭḯỉị',
    'j' => 'ĵǰ',
    'k' => 'ķǩḱḳḵ',
    'l' => 'ĺļľḷḹḻḽ',
    'm' => 'ḿṁṃ',
    'n' => 'ñńņňǹṅṇṉṋ',
    'o' => 'òóôõöōŏőơǒǫǭȍȏȫȭȯȱṍṏṑṓọỏốồổỗộớờởỡợ',
    'p' => 'ṕṗ',
    'r' => 'ŕŗřȑȓṙṛṝṟ',
    's' => 'śŝşšșṡṣṥṧṩ',
    't' => 'ţťțṫṭṯṱẗ',
    'u' => 'ùúûüũūŭůűųưǔǖǘǚǜȕȗṳṵṷṹṻụủứừửữự',
    'v' => 'ṽṿ',
    'w' => 'ŵẁẃẅẇẉẘ',
    'x' => 'ẋẍ',
    'y' => 'ýÿŷȳẏẙỳỵỷỹ',
    'z' => 'źżžẑẓẕ',
];

// Baca boleh lewat GET (query string) maupun POST; aksi lain hanya POST
const SP_GET_ACTIONS = ['get_site_seo', 'get_site_posts', 'get_site_post', 'customer_get_site_posts', 'customer_get_site_seo'];

function handle_site_post_action(mysqli $conn, string $action, array $input, ?array $user): bool {
    static $handlers = [
        // publik (PUBLIC_ACTIONS): hanya situs berstatus active
        'get_site_seo' => 'sp_get_site_seo',
        'get_site_posts' => 'sp_get_site_posts',
        'get_site_post' => 'sp_get_site_post',
        'site_post_view' => 'sp_site_post_view',
        // pembeli (CUSTOMER_ACTIONS): hanya situs miliknya
        'customer_get_site_posts' => 'sp_customer_get_site_posts',
        'customer_save_site_post' => 'sp_customer_save_site_post',
        'customer_delete_site_post' => 'sp_customer_delete_site_post',
        'customer_get_site_seo' => 'sp_customer_get_site_seo',
        'customer_save_site_seo' => 'sp_customer_save_site_seo',
    ];
    if (!isset($handlers[$action])) return false;
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST' && !in_array($action, SP_GET_ACTIONS, true)) {
        throw new ApiError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    }
    $data = call_user_func($handlers[$action], $conn, $input, $user);
    echo json_encode(array_merge(['success' => true], $data), SP_JSON_FLAGS);
    return true;
}

// ════════════════════════════════════════════════════════════════════════════
// Publik (situs pembeli yang aktif)
// ════════════════════════════════════════════════════════════════════════════

// SEO situs untuk pengunjung, tanpa kode verifikasi: { seo: SiteSeoPublic }
function sp_get_site_seo(mysqli $conn, array $input, ?array $user): array {
    $site = sp_active_site($conn, $input, true);
    $seo = sp_seo_row($conn, (int)$site['id']);
    return ['seo' => sp_seo_public_out($seo, sp_site_index_reasons($site, $seo) === [])];
}

// Tulisan terbit satu jenis, terbaru dulu: { posts: SitePostSummary[], total }. total = semua tulisan terbit jenis itu
// (tanpa batas limit). Template tanpa fitur tulisan atau fitur Berita & Pengumuman belum aktif → daftar kosong.
function sp_get_site_posts(mysqli $conn, array $input, ?array $user): array {
    $site = sp_active_site($conn, $input, false);
    $kind = trim(in_str($input, 'kind'));
    if (!in_array($kind, SP_KINDS, true)) {
        throw new ApiError('Jenis tulisan harus berita atau pengumuman.', 400, 'VALIDATION', ['kind' => 'Jenis tulisan harus berita atau pengumuman.']);
    }
    if (!sa_posts_enabled($conn, $site)) return ['posts' => [], 'total' => 0];
    $siteId = (int)$site['id'];
    $rows = db_all($conn, "SELECT " . SP_SUMMARY_COLUMNS . " FROM site_posts p WHERE p.site_id = ? AND p.kind = ? AND p.status = 'published'
                           ORDER BY p.published_at DESC, p.id DESC LIMIT ?", [$siteId, $kind, sp_list_limit(in_int($input, 'limit'))]);
    $total = db_one($conn, "SELECT COUNT(*) AS n FROM site_posts WHERE site_id = ? AND kind = ? AND status = 'published'", [$siteId, $kind]);
    return ['posts' => array_map('sp_summary_out', $rows), 'total' => (int)$total['n']];
}

// Satu tulisan terbit lengkap: { post: SitePostPublic }. Draf, slug tidak dikenal atau tidak sah → 404.
function sp_get_site_post(mysqli $conn, array $input, ?array $user): array {
    $site = sp_active_site($conn, $input, false);
    $row = sp_published_post($conn, $site, trim(in_str($input, 'slug')));
    if (!$row) throw sp_post_not_found();
    return ['post' => sp_public_out($row)];
}

// Halaman tulisan dibuka (sekali per sesi browser): +1, dibatasi per IP (IPv6 per /64; kunci ip_limit_key, tanpa IP di
// nama berkas) seperti guide_view; perayap tidak dihitung. { views: jumlah dilihat tulisan itu }
function sp_site_post_view(mysqli $conn, array $input, ?array $user): array {
    $limit = ip_limit_key('sp-view', client_ip());
    $wait = rate_limit_wait($limit, SP_VIEWS_PER_HOUR);
    if ($wait) too_many_attempts($wait);
    $site = sp_active_site($conn, $input, false);
    $row = sp_published_post($conn, $site, trim(in_str($input, 'slug')));
    if (!$row) throw sp_post_not_found();
    $postId = (int)$row['id'];
    if (!sp_is_bot((string)($_SERVER['HTTP_USER_AGENT'] ?? ''))) {
        rate_limit_hit($limit, 3600);
        db_run($conn, "INSERT INTO site_post_views (post_id, site_id, view_count, last_viewed_at) VALUES (?, ?, 1, NOW())
                       ON DUPLICATE KEY UPDATE view_count = view_count + 1, last_viewed_at = NOW()", [$postId, (int)$site['id']]);
    }
    $count = db_one($conn, "SELECT view_count FROM site_post_views WHERE post_id = ?", [$postId]);
    return ['views' => $count ? (int)$count['view_count'] : 0];
}

/** Situs berstatus active dari input site_id; selain itu 404. $withContent: kolom content ikut (status index). */
function sp_active_site(mysqli $conn, array $input, bool $withContent): array {
    $siteId = in_int($input, 'site_id');
    $columns = 'id, template_code, domain, status' . ($withContent ? ', content' : '');
    $site = $siteId > 0
        ? db_one($conn, "SELECT $columns FROM template_sites WHERE id = ? AND status = 'active' LIMIT 1", [$siteId])
        : null;
    if (!$site) throw new ApiError(SP_SITE_INACTIVE, 404, 'SITE_NOT_FOUND');
    return $site;
}

/** Tulisan terbit situs ini dengan slug itu; slug tidak sah, template tanpa fitur tulisan atau fitur belum aktif → null. */
function sp_published_post(mysqli $conn, array $site, string $slug): ?array {
    if (!sp_is_slug($slug) || !sa_posts_enabled($conn, $site)) return null;
    return db_one($conn, "SELECT " . SP_POST_COLUMNS . " FROM site_posts p WHERE p.site_id = ? AND p.slug = ? AND p.status = 'published' LIMIT 1",
        [(int)$site['id'], $slug]);
}

// ════════════════════════════════════════════════════════════════════════════
// Pembeli (CUSTOMER_ACTIONS; panel /akun/situs/:siteId/berita dan /seo)
// ════════════════════════════════════════════════════════════════════════════

// Semua tulisan situs (draf juga) dengan jumlah dilihat: { posts: SitePostAdmin[], limits: { max_posts } }
function sp_customer_get_site_posts(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $site = sp_owned_site($conn, $input, $user, false, true);
    $rows = db_all($conn, "SELECT " . SP_ADMIN_COLUMNS . " FROM site_posts p LEFT JOIN site_post_views v ON v.post_id = p.id
                           WHERE p.site_id = ? ORDER BY " . SP_ADMIN_ORDER, [(int)$site['id']]);
    $domain = (string)$site['domain'];
    return [
        'posts' => array_map(function ($r) use ($domain) { return sp_admin_out($r, $domain); }, $rows),
        'limits' => ['max_posts' => SP_LIMITS['maxPostsPerSite']],
    ];
}

// Tambah (tanpa post.id) atau ubah tulisan dari SitePostInput: { post: SitePostAdmin }. Slug kosong dibuat dari judul
// (unik per situs: -2, -3, …); foto data URI disimpan di assets/sites/{site}/posts/, foto lama dihapus saat diganti.
function sp_customer_save_site_post(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    sp_count_save($user);
    $site = sp_owned_site($conn, $input, $user, true, true);
    $siteId = (int)$site['id'];
    $post = sp_object($input['post'] ?? null);
    if ($post === null) throw new ApiError('Data tulisan wajib dikirim.', 400, 'VALIDATION');
    $id = sp_int($post['id'] ?? null);
    $existing = null;
    if ($id > 0) {
        $existing = db_one($conn, "SELECT id, slug, image FROM site_posts WHERE id = ? AND site_id = ? LIMIT 1", [$id, $siteId]);
        if (!$existing) throw sp_post_not_found();
    } else {
        $count = db_one($conn, "SELECT COUNT(*) AS n FROM site_posts WHERE site_id = ?", [$siteId]);
        if ((int)$count['n'] >= SP_LIMITS['maxPostsPerSite']) throw new ApiError(SP_POST_LIMIT, 409, 'POST_LIMIT');
    }
    $storedImage = $existing ? sp_nullable($existing['image']) : null;
    [$clean, $errors] = sp_validate_post($post, $storedImage, sp_today());
    if ($errors) throw new ApiError(reset($errors), 400, 'VALIDATION', $errors);

    $taken = array_column(db_all($conn, "SELECT slug FROM site_posts WHERE site_id = ? AND id <> ?", [$siteId, $id]), 'slug');
    if ($clean['slug'] === '') {
        $clean['slug'] = sp_unique_slug(sp_slug_from_title($clean['title'], $clean['kind']), $taken);
    } elseif (in_array($clean['slug'], $taken, true)) {
        throw new ApiError(SP_SLUG_TAKEN, 409, 'SLUG_TAKEN', ['slug' => SP_SLUG_TAKEN]);
    }

    $section = 'sites/' . $siteId . '/posts';
    $image = $storedImage;
    $newFile = null;
    if ($clean['image_action'] === 'upload') {
        $newFile = save_base64_asset($clean['image_data'], $section, 'post');
        $image = $newFile;
    } elseif ($clean['image_action'] === 'delete') {
        $image = null;
    }
    $values = [
        $clean['kind'], $clean['slug'], $clean['title'], $clean['excerpt'], $clean['body'], $clean['category'], $clean['badge'],
        $image, $clean['image_alt'], $clean['link_url'], $clean['status'], $clean['published_at'], $clean['seo_title'],
        $clean['seo_description'], $clean['noindex'] ? 1 : 0,
    ];
    try {
        if ($existing) {
            // Hanya menimpa foto yang tadi dibaca (image <=> foto awal): simpan bersamaan dari tab lain tidak meninggalkan
            // file yatim dan tidak merujuk foto yang sudah dihapus
            db_run($conn, "UPDATE site_posts SET kind = ?, slug = ?, title = ?, excerpt = ?, body = ?, category = ?, badge = ?, image = ?,
                           image_alt = ?, link_url = ?, status = ?, published_at = ?, seo_title = ?, seo_description = ?, noindex = ?
                           WHERE id = ? AND site_id = ? AND image <=> ?", array_merge($values, [$id, $siteId, $existing['image']]));
            if (db_affected_rows() === 0) sp_check_post_update($conn, $id, $siteId, $existing['image'], $newFile !== null);
        } else {
            db_run($conn, "INSERT INTO site_posts (site_id, kind, slug, title, excerpt, body, category, badge, image, image_alt, link_url,
                           status, published_at, seo_title, seo_description, noindex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                array_merge([$siteId], $values));
        }
    } catch (Throwable $e) {
        // Tulisan tidak tersimpan (database gagal, atau tulisan dihapus / fotonya diubah di tab lain): foto yang baru
        // diunggah request ini tidak dirujuk apa pun
        if ($newFile !== null) delete_local_asset($newFile, $section);
        throw $e;
    }
    if ($storedImage !== null && $storedImage !== $image) pf_delete_generated($storedImage, $section);

    // Dibaca ulang lewat slug (unik per situs), jadi tidak butuh insert_id
    $row = db_one($conn, "SELECT " . SP_ADMIN_COLUMNS . " FROM site_posts p LEFT JOIN site_post_views v ON v.post_id = p.id
                          WHERE p.site_id = ? AND p.slug = ? LIMIT 1", [$siteId, $clean['slug']]);
    if (!$row) throw sp_post_not_found(); // dihapus di tab lain tepat setelah disimpan
    if (!$existing) {
        // Tulisan baru mulai dari 0 dilihat (id bekas tulisan terhapus bisa dipakai lagi setelah server MySQL dimulai ulang)
        db_run($conn, "DELETE FROM site_post_views WHERE post_id = ?", [(int)$row['id']]);
        $row['view_count'] = null;
        $row['last_viewed_ts'] = null;
    }
    return ['post' => sp_admin_out($row, (string)$site['domain'])];
}

// Hapus tulisan beserta jumlah dilihat dan fotonya: {}
function sp_customer_delete_site_post(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $site = sp_owned_site($conn, $input, $user, true, true);
    $siteId = (int)$site['id'];
    $id = in_int($input, 'post_id');
    $row = $id > 0 ? db_one($conn, "SELECT id, slug, image FROM site_posts WHERE id = ? AND site_id = ? LIMIT 1", [$id, $siteId]) : null;
    if (!$row) throw sp_post_not_found();
    db_run($conn, "DELETE FROM site_posts WHERE id = ? AND site_id = ?", [$id, $siteId]);
    db_run($conn, "DELETE FROM site_post_views WHERE post_id = ?", [$id]);
    pf_delete_generated(sp_nullable($row['image']), 'sites/' . $siteId . '/posts');
    return [];
}

// Pengaturan SEO situs (semua template), status index dan alamat penting: SiteSeoResponse
function sp_customer_get_site_seo(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    $site = sp_owned_site($conn, $input, $user, false, false);
    return sp_seo_response($site, sp_seo_row($conn, (int)$site['id']));
}

// Simpan sebagian atau semua SiteSeoSettings (kunci yang tidak dikirim tetap): SiteSeoResponse. og_image: data URI
// (disimpan di assets/sites/{site}/seo/), path tersimpan (tetap) atau null/'' (dihapus).
function sp_customer_save_site_seo(mysqli $conn, array $input, ?array $user): array {
    $user = pf_require_customer($user);
    sp_count_save($user);
    $site = sp_owned_site($conn, $input, $user, true, false);
    $siteId = (int)$site['id'];
    $seoInput = sp_object($input['seo'] ?? null);
    if ($seoInput === null) throw new ApiError('Pengaturan SEO wajib dikirim.', 400, 'VALIDATION');
    $stored = sp_seo_row($conn, $siteId);
    $current = sp_seo_settings_out($stored);
    [$seo, $errors] = sp_validate_seo($seoInput, $current);
    if ($errors) throw new ApiError(reset($errors), 400, 'VALIDATION', $errors);

    $section = 'sites/' . $siteId . '/seo';
    $image = $current['og_image'];
    $newFile = null;
    if ($seo['og_image_action'] === 'upload') {
        $newFile = save_base64_asset($seo['og_image_data'], $section, 'seo');
        $image = $newFile;
    } elseif ($seo['og_image_action'] === 'delete') {
        $image = null;
    }
    $values = [$seo['title'], $seo['description'], $image, $seo['google_verification'], $seo['bing_verification'], $seo['index_mode'], $seo['schema_type']];
    try {
        if ($stored === null) {
            // Baris pertama situs ini: INSERT biasa (bukan upsert), jadi baris yang baru saja dibuat tab lain tidak ditimpa
            db_run($conn, "INSERT INTO site_seo (site_id, title, description, og_image, google_verification, bing_verification, index_mode, schema_type)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)", array_merge([$siteId], $values));
        } else {
            // Hanya menimpa gambar yang tadi dibaca (og_image <=> gambar awal), sama dengan simpan tulisan
            db_run($conn, "UPDATE site_seo SET title = ?, description = ?, og_image = ?, google_verification = ?, bing_verification = ?,
                           index_mode = ?, schema_type = ? WHERE site_id = ? AND og_image <=> ?", array_merge($values, [$siteId, $stored['og_image']]));
            if (db_affected_rows() === 0) sp_check_seo_update($conn, $siteId, $stored['og_image'], $newFile !== null);
        }
    } catch (Throwable $e) {
        // Pengaturan tidak tersimpan: gambar yang baru diunggah request ini tidak dirujuk apa pun
        if ($newFile !== null) delete_local_asset($newFile, $section);
        // Duplikat saat INSERT (db_run: ApiError 409) = baris dibuat tab lain di antara baca dan simpan
        if ($stored === null && $e instanceof ApiError && $e->status === 409) throw sp_seo_changed();
        throw $e;
    }
    if ($current['og_image'] !== null && $current['og_image'] !== $image) pf_delete_generated($current['og_image'], $section);
    return sp_seo_response($site, sp_seo_row($conn, $siteId));
}

/**
 * Situs milik pembeli (pf_customer_site: 404 bila bukan miliknya). $write: situs nonaktif → 409 SITE_SUSPENDED.
 * $posts: template tanpa fitur tulisan → 403 POSTS_UNAVAILABLE, fitur Berita & Pengumuman belum dibeli / dicabut → 403
 * POSTS_LOCKED (SEO berlaku untuk semua template).
 */
function sp_owned_site(mysqli $conn, array $input, array $user, bool $write, bool $posts): array {
    $site = pf_customer_site($conn, $input, $user);
    if ($posts && !sp_has_posts((string)$site['template_code'])) throw new ApiError(SP_POSTS_UNAVAILABLE, 403, 'POSTS_UNAVAILABLE');
    if ($posts && !sa_addon_active($conn, (int)$site['id'], 'posts')) throw new ApiError(SP_POSTS_LOCKED, 403, 'POSTS_LOCKED');
    if ($write && $site['status'] !== 'active') throw new ApiError(SP_SITE_SUSPENDED, 409, 'SITE_SUSPENDED');
    return $site;
}

/** Batas simpan tulisan/SEO per pengguna (setiap percobaan dihitung, juga yang gagal validasi). */
function sp_count_save(array $user): void {
    $key = 'sp-save|' . (int)$user['id'];
    $wait = rate_limit_wait($key, SP_SAVES_PER_HOUR);
    if ($wait) too_many_attempts($wait);
    rate_limit_hit($key, 3600);
}

function sp_seo_row(mysqli $conn, int $siteId): ?array {
    return db_one($conn, "SELECT " . SP_SEO_COLUMNS . " FROM site_seo WHERE site_id = ? LIMIT 1", [$siteId]);
}

/** SiteSeoResponse dari baris template_sites (dengan content) dan baris site_seo (null = semua bawaan). */
function sp_seo_response(array $site, ?array $seoRow): array {
    $reasons = sp_site_index_reasons($site, $seoRow);
    return [
        'seo' => sp_seo_settings_out($seoRow),
        'status' => ['indexable' => $reasons === [], 'reasons' => $reasons],
        'urls' => sp_site_urls((string)$site['domain']),
    ];
}

/** sp_index_reasons() untuk satu situs: status, index_mode tersimpan, content dan nama bawaan templatenya. */
function sp_site_index_reasons(array $site, ?array $seoRow): array {
    return sp_index_reasons((string)$site['status'], sp_seo_settings_out($seoRow)['index_mode'], $site['content'] ?? null,
        sp_default_name((string)$site['template_code']));
}

function sp_post_not_found(): ApiError {
    return new ApiError(SP_POST_NOT_FOUND, 404, 'POST_NOT_FOUND');
}

function sp_seo_changed(): ApiError {
    return new ApiError(SP_SEO_CHANGED, 409, 'SEO_CHANGED');
}

/**
 * UPDATE tulisan mengenai 0 baris. Tulisan sudah dihapus → 404 POST_NOT_FOUND. Fotonya bukan lagi $readImage (diganti
 * atau dihapus di tab lain), atau foto baru request ini tidak tersimpan → 409 POST_CHANGED. Selain itu isiannya memang
 * sama persis dengan yang tersimpan (mysqli menghitung baris yang berubah saja), jadi simpan dianggap berhasil.
 * Sama dengan checkPostUpdate() di site_posts.js.
 */
function sp_check_post_update(mysqli $conn, int $id, int $siteId, ?string $readImage, bool $uploaded): void {
    $now = db_one($conn, "SELECT image FROM site_posts WHERE id = ? AND site_id = ? LIMIT 1", [$id, $siteId]);
    if (!$now) throw sp_post_not_found();
    if ($uploaded || $now['image'] !== $readImage) throw new ApiError(SP_POST_CHANGED, 409, 'POST_CHANGED');
}

/** UPDATE site_seo mengenai 0 baris: aturan sp_check_post_update() untuk og_image (baris hilang juga 409 SEO_CHANGED). */
function sp_check_seo_update(mysqli $conn, int $siteId, ?string $readImage, bool $uploaded): void {
    $now = db_one($conn, "SELECT og_image FROM site_seo WHERE site_id = ? LIMIT 1", [$siteId]);
    if (!$now || $uploaded || $now['og_image'] !== $readImage) throw sp_seo_changed();
}

// ════════════════════════════════════════════════════════════════════════════
// Validasi & aturan (fungsi murni, dites berdampingan dengan site_posts.js)
// ════════════════════════════════════════════════════════════════════════════

/**
 * SitePostInput → [tulisan ternormalisasi, pesan galat per kolom]. Kunci galat = kunci SitePostInput, urutan pengecekan
 * sama dengan validateSitePost() di site_posts.js (pesan pertama menjadi `error`). $storedImage = foto tersimpan
 * (null untuk tulisan baru), $today = YYYY-MM-DD (Asia/Jakarta).
 * Hasil: kind, title, slug ('' = dibuat dari judul), excerpt, body (CRLF/CR → LF, di-trim), category, badge,
 * image_action (keep | delete | upload), image_data (data URI untuk upload), image_ext, image_alt, link_url, status,
 * published_at (YYYY-MM-DD atau null), seo_title, seo_description, noindex (bool).
 */
function sp_validate_post(array $input, ?string $storedImage, string $today): array {
    $errors = [];
    $kind = sp_choice($input, 'kind', SP_KINDS, 'Pilih jenis tulisan: berita atau pengumuman.', $errors);
    $title = sp_line($input, 'title', 'Judul', SP_LIMITS['title'], $errors, SP_TITLE_MIN);

    $slug = sp_text($input, 'slug', 'Slug', $errors);
    if ($slug !== null && $slug !== '') {
        if (mb_strlen($slug) > SP_LIMITS['slug']) $errors['slug'] = 'Slug maksimal ' . SP_LIMITS['slug'] . ' karakter.';
        elseif (!preg_match(SP_SLUG_PATTERN, $slug)) {
            $errors['slug'] = 'Slug hanya boleh huruf kecil, angka, dan tanda hubung, contoh: juara-olimpiade-sains.';
        }
    }

    $excerpt = sp_line($input, 'excerpt', 'Ringkasan', SP_LIMITS['excerpt'], $errors);
    $body = sp_text($input, 'body', 'Isi tulisan', $errors);
    if ($body !== null) {
        $body = trim(str_replace(["\r\n", "\r"], "\n", $body));
        if (mb_strlen($body) > SP_LIMITS['body']) $errors['body'] = 'Isi tulisan maksimal 20.000 karakter.';
    }
    $category = sp_line($input, 'category', 'Kategori', SP_LIMITS['category'], $errors);
    $badge = sp_line($input, 'badge', 'Label', SP_LIMITS['badge'], $errors);

    $image = ['action' => 'keep', 'data' => null, 'ext' => null];
    if (array_key_exists('image', $input)) $image = sp_image_input($input['image'], $storedImage, 'image', 'Foto', 'foto', $errors);
    $imageAlt = sp_line($input, 'image_alt', 'Teks foto', SP_LIMITS['imageAlt'], $errors);

    $linkUrl = sp_text($input, 'link_url', 'Tautan tambahan', $errors);
    if ($linkUrl !== null && $linkUrl !== '') {
        if (mb_strlen($linkUrl) > SP_LIMITS['linkUrl']) $errors['link_url'] = 'Tautan tambahan maksimal ' . SP_LIMITS['linkUrl'] . ' karakter.';
        elseif (!preg_match(SP_LINK_PATTERN, $linkUrl)) {
            $errors['link_url'] = 'Tautan tambahan harus diawali https://, http://, mailto:, tel:, / atau #.';
        }
    }

    $status = sp_choice($input, 'status', SP_STATUSES, 'Pilih status tulisan: Draf atau Terbit.', $errors);
    $publishedAt = sp_text($input, 'published_at', 'Tanggal', $errors);
    if ($publishedAt === '') {
        // Terbit tanpa tanggal = hari ini (WIB); draf boleh tanpa tanggal
        $publishedAt = $status === 'published' ? $today : null;
    } elseif ($publishedAt !== null && !sp_is_date($publishedAt)) {
        $errors['published_at'] = 'Tanggal harus tanggal yang valid (YYYY-MM-DD).';
    }

    $seoTitle = sp_line($input, 'seo_title', 'Judul SEO', SP_LIMITS['seoTitle'], $errors);
    $seoDescription = sp_line($input, 'seo_description', 'Deskripsi SEO', SP_LIMITS['seoDescription'], $errors);

    return [[
        'kind' => $kind,
        'title' => $title,
        'slug' => $slug,
        'excerpt' => $excerpt,
        'body' => $body,
        'category' => $category,
        'badge' => $badge,
        'image_action' => $image['action'],
        'image_data' => $image['data'],
        'image_ext' => $image['ext'],
        'image_alt' => $imageAlt,
        'link_url' => $linkUrl,
        'status' => $status,
        'published_at' => $publishedAt,
        'seo_title' => $seoTitle,
        'seo_description' => $seoDescription,
        'noindex' => sp_flag($input['noindex'] ?? null),
    ], $errors];
}

/**
 * Partial<SiteSeoSettings> → [pengaturan lengkap, pesan galat per kolom]. Kunci yang tidak dikirim tetap memakai
 * $current (bentuk SiteSeoSettings). Urutan pengecekan sama dengan validateSiteSeo() di site_posts.js.
 * Hasil: title, description, og_image_action (keep | delete | upload), og_image_data, og_image_ext,
 * google_verification, bing_verification (token saja, '' = dihapus), index_mode, schema_type.
 */
function sp_validate_seo(array $input, array $current): array {
    $errors = [];
    $seo = [
        'title' => $current['title'],
        'description' => $current['description'],
        'og_image_action' => 'keep',
        'og_image_data' => null,
        'og_image_ext' => null,
        'google_verification' => $current['google_verification'],
        'bing_verification' => $current['bing_verification'],
        'index_mode' => $current['index_mode'],
        'schema_type' => $current['schema_type'],
    ];
    if (array_key_exists('title', $input)) {
        $seo['title'] = sp_line($input, 'title', 'Judul di Google', SP_SEO_LIMITS['title'], $errors);
    }
    if (array_key_exists('description', $input)) {
        $seo['description'] = sp_line($input, 'description', 'Deskripsi di Google', SP_SEO_LIMITS['description'], $errors);
    }
    if (array_key_exists('og_image', $input)) {
        $image = sp_image_input($input['og_image'], $current['og_image'], 'og_image', 'Gambar', 'gambar', $errors);
        $seo['og_image_action'] = $image['action'];
        $seo['og_image_data'] = $image['data'];
        $seo['og_image_ext'] = $image['ext'];
    }
    if (array_key_exists('google_verification', $input)) {
        $seo['google_verification'] = sp_verification_token($input['google_verification']);
        if ($seo['google_verification'] === null) {
            $errors['google_verification'] = 'Kode verifikasi Google tidak valid. Tempel kode dari Google Search Console atau seluruh tag meta-nya.';
        }
    }
    if (array_key_exists('bing_verification', $input)) {
        $seo['bing_verification'] = sp_verification_token($input['bing_verification']);
        if ($seo['bing_verification'] === null) {
            $errors['bing_verification'] = 'Kode verifikasi Bing tidak valid. Tempel kode dari Bing Webmaster Tools atau seluruh tag meta-nya.';
        }
    }
    if (array_key_exists('index_mode', $input)) {
        $seo['index_mode'] = sp_choice($input, 'index_mode', SP_INDEX_MODES, 'Pilih tampil di Google: Otomatis, Ya, atau Tidak.', $errors);
    }
    if (array_key_exists('schema_type', $input)) {
        $seo['schema_type'] = sp_choice($input, 'schema_type', SP_SCHEMA_TYPES, 'Jenis organisasi tidak dikenal. Pilih dari daftar.', $errors);
    }
    return [$seo, $errors];
}

/**
 * Nilai foto dari form: null/'' → delete, sama dengan $stored → keep, data URI gambar raster ≤ 2 MB → upload (data =
 * data URI yang di-trim, ext dari isi file), selain itu galat di $errors[$key]. $label/$noun: "Foto"/"foto" atau
 * "Gambar"/"gambar" untuk pesan.
 */
function sp_image_input($value, ?string $stored, string $key, string $label, string $noun, array &$errors): array {
    $keep = ['action' => 'keep', 'data' => null, 'ext' => null];
    $invalid = "$label tidak valid. Unggah ulang {$noun}nya.";
    $tooLarge = "Ukuran $noun maksimal 2 MB.";
    $unsupported = "Format $noun tidak didukung. Gunakan PNG, JPG, WEBP, atau GIF.";
    if ($value === null) return ['action' => 'delete', 'data' => null, 'ext' => null];
    if (!is_string($value)) {
        $errors[$key] = $invalid;
        return $keep;
    }
    $value = trim($value);
    if ($value === '') return ['action' => 'delete', 'data' => null, 'ext' => null];
    if ($stored !== null && $value === $stored) return $keep;
    if (!preg_match('/^data:[^,]*;base64,/i', $value, $m)) {
        $errors[$key] = $invalid;
        return $keep;
    }
    if (strlen($value) - strlen($m[0]) > ceil(SP_IMAGE_MAX_BYTES * 4 / 3) + 4) {
        $errors[$key] = $tooLarge;
        return $keep;
    }
    try {
        [$content, $ext] = parse_upload($value, false); // gambar saja
    } catch (ApiError $e) {
        $errors[$key] = $unsupported;
        return $keep;
    }
    // Unggahan pembeli disajikan dari origin utama: raster saja (SVG bisa membawa script)
    if (!in_array($ext, SP_IMAGE_EXTS, true)) {
        $errors[$key] = $unsupported;
        return $keep;
    }
    if (strlen($content) > SP_IMAGE_MAX_BYTES) {
        $errors[$key] = $tooLarge;
        return $keep;
    }
    return ['action' => 'upload', 'data' => $value, 'ext' => $ext];
}

/**
 * Kode verifikasi dari isian: token apa adanya atau seluruh tag <meta … content="TOKEN">. '' = dihapus,
 * null = tidak valid (token harus [A-Za-z0-9_-]{10,100}). Sama dengan verificationToken() di site_posts.js.
 */
function sp_verification_token($value): ?string {
    if ($value === null) return '';
    if (!is_string($value)) return null;
    $value = trim($value);
    if ($value === '') return '';
    if (mb_strlen($value) > SP_VERIFICATION_INPUT_MAX) return null;
    if (strpos($value, '<') !== false) {
        if (!preg_match('/\bcontent[ \t\r\n]*=[ \t\r\n]*(["\'])([^"\']*)\1/i', $value, $m)) return null;
        $value = trim($m[2]);
    }
    return preg_match(SP_VERIFICATION_PATTERN, $value) ? $value : null;
}

/**
 * Alasan situs tidak tampil di Google (SiteSeoStatus.reasons), urutan tetap: suspended, manual_noindex, default_content.
 * $content = kolom template_sites.content (teks JSON, null = bawaan template), $defaultName = brand.company_name bawaan
 * template (null = tidak diketahui: hanya nama kosong yang dianggap bawaan). Sama dengan indexReasons() di site_posts.js.
 */
function sp_index_reasons(string $siteStatus, string $indexMode, $content, ?string $defaultName): array {
    $reasons = [];
    if ($siteStatus === 'suspended') $reasons[] = 'suspended';
    if ($indexMode === 'noindex') $reasons[] = 'manual_noindex';
    if ($indexMode === 'auto' && sp_is_default_content($content, $defaultName)) $reasons[] = 'default_content';
    return $reasons;
}

/** Konten belum disimpan (null/bukan objek JSON) atau brand.company_name kosong / sama dengan nama bawaan template. */
function sp_is_default_content($content, ?string $defaultName): bool {
    $data = is_string($content) && $content !== '' ? json_decode($content, true) : null;
    if (!is_array($data)) return true;
    $brand = $data['brand'] ?? null;
    $name = is_array($brand) && is_string($brand['company_name'] ?? null) ? sp_clean_line($brand['company_name']) : '';
    return $name === '' || ($defaultName !== null && $name === sp_clean_line($defaultName));
}

/**
 * Slug dari judul: huruf kecil, diakritik dibuang (tabel SP_FOLD = NFD), selain a-z0-9 → '-', '-' dirapatkan, maks 120
 * karakter dipotong di batas kata. Judul tanpa huruf/angka Latin → $fallback. Sama dengan slugFromTitle() di site_posts.js.
 */
function sp_slug_from_title(string $title, ?string $fallback): string {
    $text = strtr(mb_strtolower($title, 'UTF-8'), sp_fold_map());
    $text = preg_replace('/[\x{0300}-\x{036F}]+/u', '', $text) ?? '';
    $slug = trim(preg_replace('/[^a-z0-9]+/', '-', $text) ?? '', '-');
    if ($slug === '') return $fallback !== null && $fallback !== '' ? $fallback : 'tulisan';
    return sp_cut_slug($slug, SP_LIMITS['slug']);
}

/** Slug ≤ $max karakter, dipotong di '-' terakhir yang muat (kata tidak terpotong) bila ada. */
function sp_cut_slug(string $slug, int $max): string {
    if (strlen($slug) <= $max) return $slug;
    $at = strrpos(substr($slug, 0, $max + 1), '-');
    return rtrim($at !== false && $at > 0 ? substr($slug, 0, $at) : substr($slug, 0, $max), '-');
}

/** $base bila belum dipakai, selain itu $base-2, $base-3, … (tetap ≤ 120 karakter). */
function sp_unique_slug(string $base, array $taken): string {
    $used = array_flip(array_map('strval', $taken));
    if (!isset($used[$base])) return $base;
    for ($n = 2; ; $n++) {
        $suffix = '-' . $n;
        $candidate = sp_cut_slug($base, SP_LIMITS['slug'] - strlen($suffix)) . $suffix;
        if (!isset($used[$candidate])) return $candidate;
    }
}

/** limit daftar publik: kosong/≤ 0 → 12, lebih dari 100 → 100. */
function sp_list_limit(int $limit): int {
    return $limit <= 0 ? SP_LIST_DEFAULT : min($limit, SP_LIST_MAX);
}

function sp_is_bot(string $userAgent): bool {
    return (bool)preg_match(SP_BOT_PATTERN, $userAgent);
}

function sp_has_posts(string $templateCode): bool {
    return in_array($templateCode, SP_POST_TEMPLATE_CODES, true);
}

function sp_is_slug($value): bool {
    return is_string($value) && $value !== '' && strlen($value) <= SP_LIMITS['slug'] && (bool)preg_match(SP_SLUG_PATTERN, $value);
}

/** YYYY-MM-DD yang benar-benar ada di kalender, tahun 1000–9999 (rentang kolom DATE). */
function sp_is_date(string $value): bool {
    if (!preg_match(SP_DATE_PATTERN, $value, $m)) return false;
    return (int)$m[1] >= 1000 && checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
}

/** Hari ini di Asia/Jakarta (YYYY-MM-DD). */
function sp_today(): string {
    return (new DateTime('now', new DateTimeZone(SP_TIMEZONE)))->format('Y-m-d');
}

/** Detik Unix (UNIX_TIMESTAMP) → ISO 8601 WIB "2026-10-26T09:30:00+07:00"; null tetap null. */
function sp_iso($seconds): ?string {
    if ($seconds === null || $seconds === '') return null;
    return gmdate('Y-m-d\TH:i:s', (int)$seconds + SP_JAKARTA_OFFSET) . '+07:00';
}

/** Alamat penting situs (SiteSeoResponse.urls). */
function sp_site_urls(string $domain): array {
    return [
        'home' => 'https://' . $domain . '/',
        'sitemap' => 'https://' . $domain . '/sitemap.xml',
        'robots' => 'https://' . $domain . '/robots.txt',
    ];
}

/** Bawaan template dari site_defaults.json ({code: {company_name, tagline, description, logo, posts}}); tidak ada → []. */
function sp_site_defaults(): array {
    static $defaults = null;
    if ($defaults === null) {
        $file = __DIR__ . '/site_defaults.json';
        $data = is_file($file) ? json_decode((string)file_get_contents($file), true) : null;
        $defaults = is_array($data) ? $data : [];
    }
    return $defaults;
}

/** brand.company_name bawaan template; tidak diketahui → null. */
function sp_default_name(string $templateCode): ?string {
    $name = sp_site_defaults()[$templateCode]['company_name'] ?? null;
    return is_string($name) ? $name : null;
}

// ── Isian (sama dengan text / line / choice / flag di site_posts.js) ──

// Teks yang di-trim; kosong/tidak ada → ''. Selain string → galat "{label} tidak valid." dan null
function sp_text(array $input, string $key, string $label, array &$errors): ?string {
    $raw = $input[$key] ?? null;
    if ($raw === null) return '';
    if (!is_string($raw)) {
        $errors[$key] = "$label tidak valid.";
        return null;
    }
    return trim($raw);
}

// Teks satu baris: spasi dirapatkan, maks $max karakter; $min > 0 = wajib diisi
function sp_line(array $input, string $key, string $label, int $max, array &$errors, int $min = 0): ?string {
    $value = sp_text($input, $key, $label, $errors);
    if ($value === null) return null;
    $value = sp_clean_line($value);
    $length = mb_strlen($value);
    if ($min > 0 && $length === 0) $errors[$key] = "$label wajib diisi.";
    elseif ($length < $min) $errors[$key] = "$label minimal $min karakter.";
    elseif ($length > $max) $errors[$key] = "$label maksimal $max karakter.";
    return $value;
}

// Salah satu nilai $allowed (string, di-trim); selain itu galat $message dan null
function sp_choice(array $input, string $key, array $allowed, string $message, array &$errors): ?string {
    $raw = $input[$key] ?? null;
    $value = is_string($raw) ? trim($raw) : null;
    if ($value === null || !in_array($value, $allowed, true)) {
        $errors[$key] = $message;
        return null;
    }
    return $value;
}

function sp_clean_line(string $value): string {
    return trim(preg_replace(SP_SPACE_RUN, ' ', $value) ?? $value);
}

// in_flag(): true / 1 / "1" / "true"
function sp_flag($value): bool {
    return $value === true || $value === 1 || $value === '1' || $value === 'true';
}

// Bilangan bulat dari isian JSON (bukan bilangan → 0)
function sp_int($value): int {
    return is_numeric($value) ? (int)$value : 0;
}

// Objek JSON dari isian (api.php men-decode JSON menjadi array); selain itu null
function sp_object($value): ?array {
    return is_array($value) ? $value : null;
}

function sp_nullable($value): ?string {
    return $value === null || $value === '' ? null : (string)$value;
}

/** Peta strtr huruf berdiakritik → huruf dasar (SP_FOLD). */
function sp_fold_map(): array {
    static $map = null;
    if ($map === null) {
        $map = [];
        foreach (SP_FOLD as $base => $letters) {
            foreach (mb_str_split($letters, 1, 'UTF-8') as $letter) $map[$letter] = $base;
        }
    }
    return $map;
}

// ── Bentuk JSON (src/types/sitePosts.ts) ──

/** SitePostSummary dari baris SP_SUMMARY_COLUMNS. */
function sp_summary_out(array $r): array {
    return [
        'id' => (int)$r['id'],
        'kind' => (string)$r['kind'],
        'slug' => (string)$r['slug'],
        'title' => (string)$r['title'],
        'excerpt' => (string)$r['excerpt'],
        'category' => (string)$r['category'],
        'badge' => (string)$r['badge'],
        'image' => sp_nullable($r['image']),
        'image_alt' => (string)$r['image_alt'],
        'link_url' => (string)$r['link_url'],
        'published_at' => sp_nullable($r['published_at']),
        'updated_at' => sp_iso($r['updated_ts']),
    ];
}

/** SitePostPublic dari baris SP_POST_COLUMNS. */
function sp_public_out(array $r): array {
    return sp_summary_out($r) + [
        'body' => (string)$r['body'],
        'seo_title' => (string)$r['seo_title'],
        'seo_description' => (string)$r['seo_description'],
        'noindex' => (int)$r['noindex'] === 1,
    ];
}

/** SitePostAdmin dari baris SP_ADMIN_COLUMNS; url = alamat publik di domain situs. */
function sp_admin_out(array $r, string $domain): array {
    return sp_public_out($r) + [
        'status' => (string)$r['status'],
        'view_count' => (int)($r['view_count'] ?? 0),
        'last_viewed_at' => sp_iso($r['last_viewed_ts'] ?? null),
        'created_at' => sp_iso($r['created_ts']),
        'url' => 'https://' . $domain . '/' . $r['kind'] . '/' . $r['slug'],
    ];
}

/** SiteSeoSettings dari baris SP_SEO_COLUMNS; null (belum ada baris) = semua bawaan. */
function sp_seo_settings_out(?array $r): array {
    return [
        'title' => (string)($r['title'] ?? ''),
        'description' => (string)($r['description'] ?? ''),
        'og_image' => sp_nullable($r['og_image'] ?? null),
        'google_verification' => (string)($r['google_verification'] ?? ''),
        'bing_verification' => (string)($r['bing_verification'] ?? ''),
        'index_mode' => in_array($r['index_mode'] ?? null, SP_INDEX_MODES, true) ? $r['index_mode'] : 'auto',
        'schema_type' => in_array($r['schema_type'] ?? null, SP_SCHEMA_TYPES, true) ? $r['schema_type'] : '',
        'updated_at' => $r ? sp_iso($r['updated_ts'] ?? null) : null,
    ];
}

/** SiteSeoPublic: tanpa kode verifikasi; $indexable = tidak ada alasan sp_index_reasons(). */
function sp_seo_public_out(?array $r, bool $indexable): array {
    $seo = sp_seo_settings_out($r);
    return [
        'title' => $seo['title'],
        'description' => $seo['description'],
        'og_image' => $seo['og_image'],
        'schema_type' => $seo['schema_type'],
        'indexable' => $indexable,
    ];
}
