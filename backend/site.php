<?php
// Render server domain pembeli (docs/platform/SITE-POSTS-SEO-SPEC.md §3, §5, §6). Produksi: public_html/site.php,
// disalin scripts/prerender.mjs ke sebelah seo.php.
//
// deploy/cpanel/htaccess mengirim ke sini setiap request host selain garudanexa.com untuk "/", /index.html, path yang
// bukan file nyata, robots.txt & sitemap.xml (?file=…) dan llms*.txt (?gn404=1). Path dibaca dari REQUEST_URI (path
// asli dari browser, sebelum rewrite); akses langsung ke /site.php dijawab 404.
// - Host utama (env MAIN_HOSTS, bawaan sama dengan DEFAULT_MAIN_HOSTS di src/templates/siteHosts.ts): index.html dan
//   file statis apa adanya, seperti sebelum skrip ini ada.
// - Host lain: situs dicari di template_sites (varian www juga, status apa pun). Tidak ada → 404 noindex; host = varian
//   www/apex dari domain tersimpan → 301 ke domain tersimpan; nonaktif → 404 noindex (SPA menampilkan "Situs tidak
//   ditemukan"). robots.txt dan sitemap.xml dibuat per domain.
// - Halaman (/, /berita, /berita/{slug}, /pengumuman, /pengumuman/{slug}): cangkang index.html + head SEO + <main>
//   sederhana yang bisa dibaca crawler tanpa JavaScript + data preload (gn-preload) supaya render pertama tidak perlu
//   memanggil /api.php. React (createRoot) lalu mengganti isi #root.
//
// Aturan head SAMA PERSIS dengan src/templates/siteSeo.ts (buildSiteHead); __tests__/seo/site-seo.test.ts membandingkan
// keduanya untuk masukan yang sama. Bawaan per template dari modules/site_defaults.json (ditulis tes
// __tests__/backend/site-defaults.test.ts dari registri TEMPLATES, karena PHP tidak bisa menjalankan resolveContent).
//
// Struktur: site_handle() = inti tanpa I/O selain fungsi kueri yang disuntikkan (diuji dengan data tiruan di
// __tests__/backend/site-renderer.test.ts); site_main() hanya membaca request/berkas, membuka MySQL, dan menulis jawaban.
// Tes memuat file ini sebagai pustaka dengan define('GN_SITE_LIBRARY', true).

if (!defined('GN_SEO_LIBRARY')) define('GN_SEO_LIBRARY', true);
require_once __DIR__ . '/seo.php';

const SITE_TITLE_MAX = 60;
const SITE_DESCRIPTION_MAX = 155;
const SITE_HEADLINE_MAX = 110;
const SITE_POST_KINDS = ['berita', 'pengumuman'];
const SITE_KIND_LABEL = ['berita' => 'Berita', 'pengumuman' => 'Pengumuman'];
const SITE_SLUG_PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';
const SITE_SLUG_MAX = 120;
/** Sama dengan PF_DOMAIN_PATTERN (templates.php) dan DOMAIN_PATTERN di siteSeo.ts. */
const SITE_DOMAIN_PATTERN = '/^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/';
const SITE_RASTER = '/\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i';
const SITE_SCHEMA_TYPES = ['', 'Organization', 'LocalBusiness', 'School', 'EducationalOrganization', 'Preschool',
    'ElementarySchool', 'MiddleSchool', 'HighSchool', 'CollegeOrUniversity'];
const SITE_DEFAULT_MAIN_HOSTS = 'localhost,127.0.0.1,garudanexa.com,www.garudanexa.com,garudanexabahtera.web.id';
const SITE_HOME_POSTS_LIMIT = 12;
/** Asia/Jakarta, UTC+7 tanpa musim panas */
const SITE_JAKARTA_OFFSET = 25200;
const SITE_LIST_POSTS_LIMIT = 100;
/**
 * Tepat himpunan `\s` JavaScript (siteCollapse di siteSeo.ts), ditulis satu per satu: `\s` PHP dengan /u juga
 * mencocokkan U+0085 dan U+180E tetapi tidak U+FEFF. Tanpa ini judul/deskripsi server dan klien bisa berbeda.
 */
const SITE_WHITESPACE = '/[\x{0009}-\x{000D}\x{0020}\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]+/u';
/** Ikon & manifest Garuda Nexa di cangkang index.html: tidak pernah ikut ke domain pembeli. */
const SITE_SHELL_ICONS = '/<link\s+rel="(?:icon|shortcut icon|apple-touch-icon|manifest)"[^>]*>\s*/i';

// ── Teks (sama dengan siteCollapse / siteClip di siteSeo.ts) ──

function site_collapse(string $value): string {
    return trim((string)preg_replace(SITE_WHITESPACE, ' ', $value), ' ');
}

/** Teks dari data (konten, SEO, tulisan): string → spasi dirapatkan; selain string → ''. */
function site_clean($value): string {
    return is_string($value) ? site_collapse($value) : '';
}

/** Potong di batas kata menjadi ≤ $max karakter (titik kode), diakhiri "…". Teks yang muat dikembalikan utuh. */
function site_clip(string $value, int $max): string {
    $text = site_collapse($value);
    preg_match_all('/./us', $text, $m);
    if (count($m[0]) <= $max) return $text;
    $cut = implode('', array_slice($m[0], 0, $max - 1));
    // Kata terakhir terpotong → mundur ke spasi sebelumnya
    $space = $m[0][$max - 1] === ' ' ? false : strrpos($cut, ' ');
    if ($space !== false && $space > 0) $cut = substr($cut, 0, $space);
    return preg_replace('/[ .,;:!?…\-–—]+$/u', '', $cut) . '…';
}

/** Path atau URL gambar yang boleh dipakai di head: https?://… atau /path (bukan //host). Selain itu ''. */
function site_head_image($raw): string {
    $value = site_clean($raw);
    if (preg_match('/^https?:\/\//i', $value)) return $value;
    return ($value !== '' && $value[0] === '/' && substr($value, 0, 2) !== '//') ? $value : '';
}

function site_absolute(string $origin, string $src): string {
    return preg_match('/^https?:\/\//i', $src) ? $src : $origin . $src;
}

/** Tanggal YYYY-MM-DD di awal nilai ("2026-10-23", "2026-10-23 02:37:00", ISO); sama dengan toIsoDate (src/seo/format.ts). */
function site_iso_date($value): ?string {
    if (!is_string($value) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})(?:$|[ T])/', trim($value), $m)) return null;
    return checkdate((int)$m[2], (int)$m[3], (int)$m[1]) ? "$m[1]-$m[2]-$m[3]" : null;
}

/** Detik Unix (UNIX_TIMESTAMP) → ISO 8601 WIB "2026-10-26T09:30:00+07:00" (sp_iso di site_posts.php); null tetap null. */
function site_iso_wib($seconds): ?string {
    if (!is_numeric($seconds)) return null;
    return gmdate('Y-m-d\TH:i:s', (int)$seconds + SITE_JAKARTA_OFFSET) . '+07:00';
}

/** "2026-10-23" → "2026-10-23T00:00:00+07:00" (tanggal tampil = WIB); tidak valid → null. */
function site_published_iso($value): ?string {
    $date = is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? site_iso_date($value) : null;
    return $date !== null ? $date . 'T00:00:00+07:00' : null;
}

// ── Nilai dasar ──

/** Entri site_defaults.json untuk kode template (huruf kecil, dirapikan seperti getTemplate); tidak ada → kosong. */
function site_defaults_of(array $all, $templateCode): array {
    $key = is_string($templateCode) ? strtolower(trim($templateCode)) : '';
    $entry = ($key !== '' && isset($all[$key]) && is_array($all[$key])) ? $all[$key] : [];
    return [
        'company_name' => is_string($entry['company_name'] ?? null) ? $entry['company_name'] : '',
        'tagline' => is_string($entry['tagline'] ?? null) ? $entry['tagline'] : '',
        'description' => is_string($entry['description'] ?? null) ? $entry['description'] : '',
        'logo' => is_string($entry['logo'] ?? null) ? $entry['logo'] : '',
        'posts' => ($entry['posts'] ?? false) === true,
    ];
}

/** Konten tersimpan (template_sites.content, JSON) → array, atau null bila kosong / bukan objek (pf_content_out). */
function site_parse_content($json): ?array {
    if (!is_string($json) || $json === '') return null;
    return json_decode($json) instanceof stdClass ? json_decode($json, true) : null;
}

/** Teks konten (string saja, spasi dirapatkan); bukan string / tidak ada → ''. */
function site_content_text(?array $content, string $section, string $key): string {
    $value = $content[$section] ?? null;
    return is_array($value) ? site_clean($value[$key] ?? null) : '';
}

/** Nama situs = bawaan template (atau kosong): index_mode auto tidak mengindeks konten demo. */
function site_has_default_name(?array $content, array $defaults): bool {
    $name = site_content_text($content, 'brand', 'company_name');
    return $content === null || $name === '' || $name === site_collapse($defaults['company_name']);
}

function site_base(array $input, array $allDefaults): array {
    $defaults = site_defaults_of($allDefaults, $input['templateCode'] ?? '');
    $content = is_array($input['content'] ?? null) ? $input['content'] : null;
    $domainValue = is_string($input['domain'] ?? null) ? strtolower(trim($input['domain'])) : '';
    $domain = preg_match(SITE_DOMAIN_PATTERN, $domainValue) ? $domainValue : null;
    $seo = is_array($input['seo'] ?? null) ? $input['seo'] : null;
    $text = function (string $section, string $key) use ($content) { return site_content_text($content, $section, $key); };
    $homeDescription = $text('hero', 'subtitle');
    if ($homeDescription === '') $homeDescription = $text('footer', 'description');
    if ($homeDescription === '') $homeDescription = $text('brand', 'tagline');
    if ($homeDescription === '') $homeDescription = site_collapse($defaults['description']);
    $logo = site_head_image($text('brand', 'logo'));
    return [
        'domain' => $domain,
        'origin' => $domain !== null ? 'https://' . $domain : '',
        'siteName' => $text('brand', 'company_name') !== '' ? $text('brand', 'company_name') : site_collapse($defaults['company_name']),
        'tagline' => $text('brand', 'tagline') !== '' ? $text('brand', 'tagline') : site_collapse($defaults['tagline']),
        'homeDescription' => $homeDescription,
        'logo' => $logo !== '' ? $logo : site_head_image($defaults['logo']),
        'posts' => $defaults['posts'],
        // Tanpa baris site_seo (seo null) = index_mode auto
        'indexable' => $seo !== null ? (($seo['indexable'] ?? false) === true) : !site_has_default_name($content, $defaults),
    ];
}

/** Jenis organisasi JSON-LD: pilihan pembeli → School (template berfitur tulisan) → Organization. */
function site_organization_type(?array $seo, bool $posts): string {
    $chosen = $seo !== null && in_array($seo['schema_type'] ?? null, SITE_SCHEMA_TYPES, true) ? $seo['schema_type'] : '';
    // LocalBusiness wajib beralamat (Google); situs pembeli tidak menulis alamat di JSON-LD
    if ($chosen === 'LocalBusiness') return 'Organization';
    return $chosen !== '' ? $chosen : ($posts ? 'School' : 'Organization');
}

// ── Rute (sama dengan src/templates/siteRoutes.ts) ──

function site_parse_route(string $path): array {
    if ($path === '' || $path === '/') return ['kind' => 'home'];
    $parts = explode('/', $path);
    if ($parts[0] !== '' || count($parts) > 3) return ['kind' => 'notfound'];
    if (!in_array($parts[1], SITE_POST_KINDS, true)) return ['kind' => 'notfound'];
    if (count($parts) === 2) return ['kind' => 'list', 'postKind' => $parts[1]];
    $slug = $parts[2];
    if (strlen($slug) > SITE_SLUG_MAX || !preg_match(SITE_SLUG_PATTERN, $slug)) return ['kind' => 'notfound'];
    return ['kind' => 'post', 'postKind' => $parts[1], 'slug' => $slug];
}

function site_path(array $route): string {
    if ($route['kind'] === 'list') return '/' . $route['postKind'];
    if ($route['kind'] === 'post') return '/' . $route['postKind'] . '/' . $route['slug'];
    return '/';
}

// ── Head (sama dengan buildSiteHead di siteSeo.ts) ──

/**
 * $input = SiteHeadInput (domain, templateCode, content, seo, route, post?, listCount?). Kunci `post` tidak ada = belum
 * dimuat, null = tidak ditemukan. Hasil = SiteHead.
 */
function site_build_head(array $input, array $allDefaults): array {
    $base = site_base($input, $allDefaults);
    $origin = $base['origin'];
    $siteName = $base['siteName'];
    $route = $input['route'];
    $seo = is_array($input['seo'] ?? null) ? $input['seo'] : null;
    $kind = in_array($route['kind'], ['list', 'post'], true) ? $route['postKind'] : null;
    $post = null;
    $state = 'none';
    if ($route['kind'] === 'post') {
        $raw = array_key_exists('post', $input) ? $input['post'] : false;
        if ($raw === null) {
            $state = 'missing';
        } elseif (is_array($raw) && ($raw['kind'] ?? null) === $route['postKind'] && ($raw['slug'] ?? null) === $route['slug']) {
            $post = $raw;
            $state = 'found';
        } else {
            // Tulisan lain (mis. masih tulisan sebelumnya saat pindah rute) = belum dimuat
            $state = 'loading';
        }
    }
    $missing = $route['kind'] === 'notfound' || $state === 'missing';

    if ($missing) {
        $title = seo_first_that_fits(["Halaman tidak ditemukan · $siteName", 'Halaman tidak ditemukan'], SITE_TITLE_MAX);
        $description = "Halaman yang Anda cari tidak ada di $siteName.";
    } elseif ($post !== null) {
        $postTitle = site_clean($post['title'] ?? null);
        $title = site_clean($post['seo_title'] ?? null);
        if ($title === '') $title = seo_first_that_fits(["$postTitle · $siteName", $postTitle], SITE_TITLE_MAX);
        $description = site_clean($post['seo_description'] ?? null);
        if ($description === '') $description = site_clean($post['excerpt'] ?? null);
        if ($description === '') $description = site_clean($post['body'] ?? null);
    } elseif ($kind !== null) {
        // Daftar, atau tulisan yang belum dimuat
        $title = SITE_KIND_LABEL[$kind] . " · $siteName";
        $description = $kind === 'berita' ? "Berita terbaru dari $siteName." : "Pengumuman resmi dari $siteName.";
    } else {
        $named = $base['tagline'] !== '' ? "$siteName — {$base['tagline']}" : '';
        $title = site_clean($seo['title'] ?? null);
        if ($title === '') $title = seo_first_that_fits([$named, $siteName], SITE_TITLE_MAX);
        $description = site_clean($seo['description'] ?? null);
        if ($description === '') $description = $base['homeDescription'];
    }
    $description = site_clip($description, SITE_DESCRIPTION_MAX);

    $pageOk = $route['kind'] === 'home'
        || ($route['kind'] === 'list' && $base['posts'] && (int)($input['listCount'] ?? 0) >= 1)
        || ($post !== null && empty($post['noindex']));
    $robots = $base['domain'] !== null && $base['indexable'] && $pageOk ? 'index,follow' : 'noindex,follow';
    $canonical = $base['domain'] !== null && !$missing && $state !== 'loading' ? $origin . site_path($route) : null;

    // og:image: gambar SEO situs → foto tulisan → logo. SVG dilewati (tidak dibaca WhatsApp/Facebook/X).
    $postImage = $post !== null ? site_head_image($post['image'] ?? null) : '';
    $imageSrc = '';
    foreach ([site_head_image($seo['og_image'] ?? null), $postImage, $base['logo']] as $src) {
        if ($src !== '' && preg_match(SITE_RASTER, $src)) { $imageSrc = $src; break; }
    }
    $ogImage = $imageSrc !== '' ? site_absolute($origin, $imageSrc) : null;

    $organizationId = "$origin/#organization";
    $organization = [
        '@type' => site_organization_type($seo, $base['posts']),
        '@id' => $organizationId,
        'name' => $siteName,
        'url' => "$origin/",
    ];
    if ($base['logo'] !== '') $organization['logo'] = site_absolute($origin, $base['logo']);
    $graph = [
        $organization,
        [
            '@type' => 'WebSite',
            '@id' => "$origin/#website",
            'url' => "$origin/",
            'name' => $siteName,
            'inLanguage' => 'id-ID',
            'publisher' => ['@id' => $organizationId],
        ],
    ];
    if ($post !== null) {
        $url = $origin . site_path($route);
        $postTitle = site_clean($post['title'] ?? null);
        $article = [
            '@type' => $route['postKind'] === 'berita' ? 'NewsArticle' : 'Article',
            '@id' => "$url#article",
            'headline' => site_clip($postTitle, SITE_HEADLINE_MAX),
            'description' => $description,
            'url' => $url,
            'mainEntityOfPage' => $url,
            'inLanguage' => 'id-ID',
            'author' => ['@id' => $organizationId],
            'publisher' => ['@id' => $organizationId],
        ];
        $images = $postImage !== '' ? [site_absolute($origin, $postImage)] : ($ogImage !== null ? [$ogImage] : []);
        if ($images) $article['image'] = $images;
        $published = site_published_iso($post['published_at'] ?? null);
        if ($published !== null) $article['datePublished'] = $published;
        // updated_at (ISO WIB dari API) → tanggalnya saja, seperti lastmod sitemap
        $modified = site_iso_date($post['updated_at'] ?? null);
        if ($modified !== null) $article['dateModified'] = $modified;
        $graph[] = $article;
        $graph[] = [
            '@type' => 'BreadcrumbList',
            '@id' => "$url#breadcrumb",
            'itemListElement' => [
                ['@type' => 'ListItem', 'position' => 1, 'name' => 'Beranda', 'item' => "$origin/"],
                ['@type' => 'ListItem', 'position' => 2, 'name' => SITE_KIND_LABEL[$route['postKind']], 'item' => "$origin/{$route['postKind']}"],
                ['@type' => 'ListItem', 'position' => 3, 'name' => $postTitle, 'item' => $url],
            ],
        ];
    }

    return [
        'title' => $title,
        'description' => $description,
        'robots' => $robots,
        'canonical' => $canonical,
        'siteName' => $siteName,
        'ogType' => $post !== null ? 'article' : 'website',
        'ogImage' => $ogImage,
        'twitterCard' => $ogImage !== null ? 'summary_large_image' : 'summary',
        'icon' => $base['logo'] !== '' ? $base['logo'] : null,
        'jsonLd' => ['@context' => 'https://schema.org', '@graph' => $graph],
    ];
}

// ── HTML ──

function site_tag(string $key, string $tag, array $attrs, ?string $text = null): string {
    $html = "<$tag";
    foreach ($attrs as [$name, $value]) $html .= ' ' . $name . '="' . seo_escape($value) . '"';
    $html .= ' data-site-seo="' . seo_escape($key) . '">';
    return $tag === 'script' ? $html . ($text ?? '') . '</script>' : $html;
}

/** Token verifikasi Search Console / Bing yang sah (validasi SEO §4.1), selain itu ''. */
function site_verification_token($value): string {
    return is_string($value) && preg_match('/^[A-Za-z0-9_-]{10,100}$/', $value) ? $value : '';
}

/**
 * Tag head, urutannya sama dengan applySiteSeoHead. Kode verifikasi hanya di HTML server (Search Console dan Bing
 * membacanya tanpa JavaScript), tanpa tanda data-site-seo supaya klien tidak menyentuhnya.
 */
function site_render_head_tags(array $head, ?array $seoRow = null): string {
    $meta = function (string $key, string $attr, string $content) { return site_tag($key, 'meta', [[$attr, $key], ['content', $content]]); };
    $tags = ['<title>' . seo_escape($head['title']) . '</title>', $meta('description', 'name', $head['description']), $meta('robots', 'name', $head['robots'])];
    if ($head['canonical'] !== null) $tags[] = site_tag('canonical', 'link', [['rel', 'canonical'], ['href', $head['canonical']]]);
    $tags[] = $meta('og:site_name', 'property', $head['siteName']);
    $tags[] = $meta('og:locale', 'property', 'id_ID');
    $tags[] = $meta('og:type', 'property', $head['ogType']);
    if ($head['canonical'] !== null) $tags[] = $meta('og:url', 'property', $head['canonical']);
    $tags[] = $meta('og:title', 'property', $head['title']);
    $tags[] = $meta('og:description', 'property', $head['description']);
    if ($head['ogImage'] !== null) $tags[] = $meta('og:image', 'property', $head['ogImage']);
    $tags[] = $meta('twitter:card', 'name', $head['twitterCard']);
    $google = site_verification_token($seoRow['google_verification'] ?? null);
    if ($google !== '') $tags[] = '<meta name="google-site-verification" content="' . seo_escape($google) . '">';
    $bing = site_verification_token($seoRow['bing_verification'] ?? null);
    if ($bing !== '') $tags[] = '<meta name="msvalidate.01" content="' . seo_escape($bing) . '">';
    if ($head['icon'] !== null) $tags[] = site_tag('icon', 'link', [['rel', 'icon'], ['href', $head['icon']]]);
    $tags[] = site_tag('jsonld', 'script', [['type', 'application/ld+json']], seo_json_ld($head['jsonLd']));
    return implode("\n", $tags);
}

const SITE_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober',
    'November', 'Desember'];

/** "2026-10-23" → "23 Oktober 2026" (formatDateId di src/seo/format.ts). */
function site_format_date(string $date): string {
    [$y, $m, $d] = array_map('intval', explode('-', $date));
    return $d . ' ' . SITE_MONTHS[$m - 1] . ' ' . $y;
}

/** Tautan tambahan tulisan yang aman ditulis apa adanya: http(s), mailto:, tel:, /path, #anchor. */
function site_safe_link($value): string {
    $url = is_string($value) ? trim($value) : '';
    return preg_match('/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i', $url) ? $url : '';
}

function site_render_post_item(array $p, string $kind): string {
    $e = 'seo_escape';
    $html = '<li><a href="/' . $kind . '/' . $e($p['slug']) . '">' . $e(site_clean($p['title'])) . '</a>';
    $date = site_iso_date($p['published_at']);
    if ($date !== null) $html .= ' <time datetime="' . $date . '">' . $e(site_format_date($date)) . '</time>';
    if (site_clean($p['excerpt']) !== '') $html .= '<p>' . $e(site_clean($p['excerpt'])) . '</p>';
    return $html . '</li>';
}

/**
 * <main> sederhana yang bisa dibaca crawler tanpa JavaScript (tanpa CSS penyembunyi); createRoot menggantinya. Tepat
 * satu H1. $lists = kind → {posts, total}; $post = tulisan (rute tulisan).
 */
function site_render_main(array $route, array $head, string $homeText, array $lists, ?array $post): string {
    $e = 'seo_escape';
    $siteName = $head['siteName'];
    $html = '<main id="konten">';
    if ($route['kind'] === 'home') {
        $html .= '<h1>' . $e($siteName) . '</h1><p>' . $e($homeText) . '</p>';
        foreach (SITE_POST_KINDS as $kind) {
            $items = $lists[$kind]['posts'] ?? [];
            if (!$items) continue;
            $html .= '<h2><a href="/' . $kind . '">' . SITE_KIND_LABEL[$kind] . '</a></h2><ul>';
            foreach ($items as $item) $html .= site_render_post_item($item, $kind);
            $html .= '</ul>';
        }
    } elseif ($route['kind'] === 'list') {
        $kind = $route['postKind'];
        $items = $lists[$kind]['posts'] ?? [];
        $html .= '<nav aria-label="Breadcrumb"><a href="/">Beranda</a> › <span aria-current="page">' . SITE_KIND_LABEL[$kind] . '</span></nav>';
        $html .= '<h1>' . SITE_KIND_LABEL[$kind] . '</h1><p>' . $e($head['description']) . '</p>';
        if ($items) {
            $html .= '<ul>';
            foreach ($items as $item) $html .= site_render_post_item($item, $kind);
            $html .= '</ul>';
        } else {
            $html .= '<p>Belum ada ' . strtolower(SITE_KIND_LABEL[$kind]) . ' yang diterbitkan.</p>';
        }
    } elseif ($post !== null) {
        $kind = $route['postKind'];
        $title = site_clean($post['title']);
        $html .= '<nav aria-label="Breadcrumb"><a href="/">Beranda</a> › <a href="/' . $kind . '">' . SITE_KIND_LABEL[$kind]
            . '</a> › <span aria-current="page">' . $e($title) . '</span></nav>';
        $html .= '<article><h1>' . $e($title) . '</h1>';
        $date = site_iso_date($post['published_at']);
        if ($date !== null) $html .= '<p><time datetime="' . $date . '">' . $e(site_format_date($date)) . '</time></p>';
        $image = site_head_image($post['image']);
        if ($image !== '') $html .= '<img src="' . $e($image) . '" alt="' . $e(site_clean($post['image_alt'])) . '">';
        foreach (preg_split('/\n\s*\n/', str_replace("\r\n", "\n", (string)$post['body'])) as $paragraph) {
            $paragraph = trim($paragraph);
            if ($paragraph !== '') $html .= '<p>' . nl2br($e($paragraph), false) . '</p>';
        }
        $link = site_safe_link($post['link_url']);
        if ($link !== '') $html .= '<p><a href="' . $e($link) . '" rel="noopener">Buka tautan</a></p>';
        $html .= '</article><p><a href="/' . $kind . '">Semua ' . strtolower(SITE_KIND_LABEL[$kind]) . '</a></p>';
    } else {
        $html .= '<h1>Halaman tidak ditemukan</h1><p>Halaman yang Anda cari tidak ada atau sudah dipindahkan.</p>';
        $html .= '<p><a href="/">Kembali ke beranda ' . $e($siteName) . '</a></p>';
    }
    return $html . '</main>';
}

/** JSON aman di dalam <script>: "<", ">" dan "&" di-escape, UTF-8 rusak diganti (scriptJson di prerender.mjs). */
function site_script_json($value): string {
    $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_INVALID_UTF8_SUBSTITUTE);
    return $json === false ? 'null' : $json;
}

/**
 * Halaman utuh: cangkang tanpa head per halaman, ikon & manifest Garuda Nexa, lalu tag head setelah meta viewport,
 * <main> di dalam #root dan data preload tepat sesudahnya (seperti composePage di scripts/prerender.mjs).
 */
function site_compose_page(string $shell, string $tags, string $main, ?array $preload): string {
    $stripped = (string)preg_replace(SITE_SHELL_ICONS, '', seo_strip_page_head($shell));
    $html = seo_compose_page($stripped, $tags, $main);
    if ($preload === null) return $html;
    $script = '<script id="gn-preload" type="application/json">' . site_script_json($preload) . '</script>';
    $root = '<div id="root">' . $main . '</div>';
    $at = strpos($html, $root);
    if ($at === false) return str_replace('</body>', $script . "\n</body>", $html);
    $at += strlen($root);
    return substr($html, 0, $at) . "\n    " . $script . substr($html, $at);
}

/** Cangkang build tidak ada: halaman minimal supaya jawaban tetap HTML yang sah. */
function site_fallback_shell(): string {
    return "<!doctype html>\n<html lang=\"id\">\n  <head>\n    <meta charset=\"UTF-8\" />\n"
        . "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  </head>\n"
        . "  <body>\n    <div id=\"root\"></div>\n  </body>\n</html>\n";
}

// ── URL API untuk preload (sama dengan apiUrl di src/lib/api.ts) ──

/** application/x-www-form-urlencoded seperti URLSearchParams: A-Z a-z 0-9 * - . _ apa adanya, spasi → "+". */
function site_form_encode(string $value): string {
    $encoded = preg_replace_callback('/[^A-Za-z0-9*\-._ ]/', function ($m) { return sprintf('%%%02X', ord($m[0])); }, $value);
    return str_replace(' ', '+', (string)$encoded);
}

/** site_api_url('get_site_post', ['site_id' => 3, 'slug' => 'x']) → "/api.php?action=get_site_post&site_id=3&slug=x". */
function site_api_url(string $action, array $params = []): string {
    $pairs = ['action=' . site_form_encode($action)];
    foreach ($params as $key => $value) {
        if ($value === null || $value === '') continue;
        $pairs[] = site_form_encode((string)$key) . '=' . site_form_encode((string)$value);
    }
    return '/api.php?' . implode('&', $pairs);
}

// ── Data (bentuk respons = src/types/sitePosts.ts dan get_site_public) ──

function site_post_summary_out(array $r): array {
    $image = is_string($r['image'] ?? null) ? $r['image'] : '';
    return [
        'id' => (int)$r['id'],
        'kind' => (string)$r['kind'],
        'slug' => (string)$r['slug'],
        'title' => (string)$r['title'],
        'excerpt' => (string)($r['excerpt'] ?? ''),
        'category' => (string)($r['category'] ?? ''),
        'badge' => (string)($r['badge'] ?? ''),
        'image' => $image !== '' ? $image : null,
        'image_alt' => (string)($r['image_alt'] ?? ''),
        'link_url' => (string)($r['link_url'] ?? ''),
        'published_at' => isset($r['published_at']) && $r['published_at'] !== '' ? (string)$r['published_at'] : null,
        'updated_at' => site_iso_wib($r['updated_ts'] ?? null),
    ];
}

function site_post_public_out(array $r): array {
    return site_post_summary_out($r) + [
        'body' => (string)($r['body'] ?? ''),
        'seo_title' => (string)($r['seo_title'] ?? ''),
        'seo_description' => (string)($r['seo_description'] ?? ''),
        'noindex' => (int)($r['noindex'] ?? 0) === 1,
    ];
}

/** Kueri tabel baru (site_seo, site_posts): tabel belum ada (migrasi 029 belum dijalankan, errno 1146) = tanpa baris. */
function site_optional_rows(callable $query, string $sql, array $params): array {
    try {
        return $query($sql, $params);
    } catch (Throwable $e) {
        if ((int)$e->getCode() !== 1146) throw $e;
        error_log('[site.php] tabel belum ada (jalankan migrasi 029): ' . $e->getMessage());
        return [];
    }
}

/** Situs untuk host ini atau varian www/apex-nya, status apa pun; domain tersimpan yang persis sama didahulukan. */
function site_find_site(callable $query, string $host): ?array {
    $other = strpos($host, 'www.') === 0 ? substr($host, 4) : 'www.' . $host;
    $rows = $query('SELECT id, template_code, domain, status, content, UNIX_TIMESTAMP(updated_at) AS updated_ts FROM template_sites '
        . 'WHERE domain IN (?, ?) ORDER BY (domain = ?) DESC LIMIT 1', [$host, $other, $host]);
    return $rows[0] ?? null;
}

function site_find_seo(callable $query, int $siteId): ?array {
    $rows = site_optional_rows($query, 'SELECT title, description, og_image, google_verification, bing_verification, '
        . 'index_mode, schema_type, UNIX_TIMESTAMP(updated_at) AS updated_ts FROM site_seo WHERE site_id = ? LIMIT 1', [$siteId]);
    return $rows[0] ?? null;
}

/**
 * Kolom tulisan. Waktu lewat UNIX_TIMESTAMP() lalu ISO WIB (site_iso_wib), sama dengan SP_SUMMARY_COLUMNS + sp_iso di
 * modules/site_posts.php: data preload = jawaban API, tidak bergantung zona waktu sesi MySQL.
 */
const SITE_SUMMARY_COLUMNS = 'id, kind, slug, title, excerpt, category, badge, image, image_alt, link_url, published_at, '
    . 'UNIX_TIMESTAMP(updated_at) AS updated_ts';

/** {posts, total}: tulisan terbit satu jenis, terbaru dulu (get_site_posts). */
function site_find_posts(callable $query, int $siteId, string $kind, int $limit): array {
    $rows = site_optional_rows($query, 'SELECT ' . SITE_SUMMARY_COLUMNS . " FROM site_posts WHERE site_id = ? AND kind = ? AND status = 'published' "
        . 'ORDER BY published_at DESC, id DESC LIMIT ?', [$siteId, $kind, $limit]);
    $count = site_optional_rows($query, "SELECT COUNT(*) AS total FROM site_posts WHERE site_id = ? AND kind = ? AND status = 'published'", [$siteId, $kind]);
    return ['posts' => array_map('site_post_summary_out', $rows), 'total' => (int)($count[0]['total'] ?? 0)];
}

/** Satu tulisan terbit (get_site_post), atau null. */
function site_find_post(callable $query, int $siteId, string $slug): ?array {
    $rows = site_optional_rows($query, 'SELECT ' . SITE_SUMMARY_COLUMNS . ", body, seo_title, seo_description, noindex FROM site_posts "
        . "WHERE site_id = ? AND slug = ? AND status = 'published' LIMIT 1", [$siteId, $slug]);
    return $rows ? site_post_public_out($rows[0]) : null;
}

/** Semua tulisan terbit untuk sitemap (kolom secukupnya). */
function site_find_sitemap_posts(callable $query, int $siteId): array {
    return site_optional_rows($query, "SELECT kind, slug, image, noindex, UNIX_TIMESTAMP(updated_at) AS updated_ts FROM site_posts WHERE site_id = ? AND status = 'published' "
        . 'ORDER BY published_at DESC, id DESC', [$siteId]);
}

/**
 * SiteSeoPublic (get_site_seo) dari baris site_seo (null = semua bawaan). indexable = tanpa alasan SiteSeoStatus:
 * situs nonaktif, index_mode noindex, atau index_mode auto dengan konten/nama situs bawaan template.
 */
function site_seo_public(?array $row, string $status, ?array $content, array $defaults): array {
    $mode = in_array($row['index_mode'] ?? null, ['auto', 'index', 'noindex'], true) ? $row['index_mode'] : 'auto';
    $schema = in_array($row['schema_type'] ?? null, SITE_SCHEMA_TYPES, true) ? $row['schema_type'] : '';
    $ogImage = is_string($row['og_image'] ?? null) && $row['og_image'] !== '' ? $row['og_image'] : null;
    $indexable = $status === 'active' && $mode !== 'noindex' && !($mode === 'auto' && site_has_default_name($content, $defaults));
    return [
        'title' => (string)($row['title'] ?? ''),
        'description' => (string)($row['description'] ?? ''),
        'og_image' => $ogImage,
        'schema_type' => $schema,
        'indexable' => $indexable,
    ];
}

// ── Host & request ──

/** "Contoh.COM:443" → "contoh.com"; "[::1]:8000" → "[::1]"; tidak sah → null. */
function site_normalize_host(string $raw): ?string {
    $host = strtolower(trim($raw));
    if ($host !== '' && $host[0] === '[') {
        $end = strpos($host, ']');
        return $end === false ? null : substr($host, 0, $end + 1);
    }
    $host = rtrim((string)preg_replace('/:\d*$/', '', $host), '.');
    return preg_match('/^[a-z0-9.-]{1,253}$/', $host) ? $host : null;
}

/** Daftar host utama dari MAIN_HOSTS (dipisah koma), dirapikan seperti MAIN_HOSTS di siteHosts.ts. */
function site_main_hosts(string $value): array {
    $hosts = [];
    foreach (explode(',', $value) as $host) {
        $host = (string)preg_replace('/[:\/].*$/', '', (string)preg_replace('/^https?:\/\//', '', strtolower(trim($host))));
        if ($host !== '') $hosts[] = $host;
    }
    return $hosts;
}

/** Sama dengan isMainHost (siteHosts.ts): daftar host utama, "www." darinya, alamat IPv4/IPv6. */
function site_is_main_host(string $host, array $mainHosts): bool {
    if ($host === '' || in_array($host, $mainHosts, true)) return true;
    if (strpos($host, 'www.') === 0 && in_array(substr($host, 4), $mainHosts, true)) return true;
    return (bool)preg_match('/^\d{1,3}(\.\d{1,3}){3}$/', $host) || strpos($host, ':') !== false || $host[0] === '[';
}

/** Dibuka langsung (/site.php, //site.php, /site%2Ephp, /site.php/x), bukan lewat rewrite .htaccess. */
function site_requested_directly(string $requestUri): bool {
    $path = rawurldecode(explode('?', $requestUri, 2)[0]);
    return (bool)preg_match('#^/+site\.php(/|$)#i', $path);
}

/**
 * Path (tanpa query) dan query asli dari REQUEST_URI. Bukan path ASCII yang sah (spasi, byte mentah, karakter kontrol)
 * → [null, '']: halaman 404, dan pengalihan memakai "/" (nilainya tidak pernah ditulis ke header).
 */
function site_split_uri(string $requestUri): array {
    if (!preg_match('#^/[\x21-\x7E]*$#', $requestUri)) return [null, ''];
    $parts = explode('?', $requestUri, 2);
    return [$parts[0], isset($parts[1]) ? '?' . $parts[1] : ''];
}

// ── Jawaban ──

function site_response(int $status, array $headers, string $body = ''): array {
    return ['status' => $status, 'headers' => $headers, 'body' => $body];
}

function site_plain(int $status, string $body, array $extra = []): array {
    return site_response($status, array_merge(['Content-Type: text/plain; charset=utf-8', 'Cache-Control: no-cache'], $extra), $body);
}

function site_not_found_plain(): array {
    return site_plain(404, "Tidak ditemukan.\n", ['X-Robots-Tag: noindex']);
}

function site_unavailable(): array {
    return site_response(503, ['Content-Type: text/plain; charset=utf-8', 'Cache-Control: no-store', 'Retry-After: 300'],
        'Layanan sedang sibuk. Silakan coba lagi beberapa saat lagi.');
}

function site_redirect(string $location): array {
    // Bukan cache selamanya: bila domain situs diganti (apex ↔ www), pengalihan lama tidak berputar di browser
    return site_response(301, ['Location: ' . $location, 'Cache-Control: max-age=3600']);
}

function site_html(int $status, string $body, bool $noindex): array {
    $headers = ['Content-Type: text/html; charset=utf-8', 'Cache-Control: no-cache'];
    if ($noindex) $headers[] = 'X-Robots-Tag: noindex';
    return site_response($status, $headers, $body);
}

/** Host tidak dikenal atau situs nonaktif: 404 noindex dengan cangkang aplikasi (SPA menampilkan "Situs tidak ditemukan"). */
function site_missing_site(?string $shell): array {
    $tags = implode("\n", [
        '<title>Situs tidak ditemukan</title>',
        site_tag('robots', 'meta', [['name', 'robots'], ['content', 'noindex']]),
    ]);
    $main = '<main id="konten"><h1>Situs tidak ditemukan</h1>'
        . '<p>Alamat ini belum terhubung ke situs mana pun, atau situsnya sedang tidak aktif.</p></main>';
    return site_html(404, site_compose_page($shell ?? site_fallback_shell(), $tags, $main, null), true);
}

/** Host utama: perilaku lama (index.html, robots.txt/sitemap.xml/llms*.txt statis). */
function site_passthrough(array $req, ?string $path, ?string $file, bool $gone): array {
    $docroot = (string)($req['docroot'] ?? '');
    $static = $file ?? ($gone && preg_match('#^/(llms(-full)?\.txt)$#', (string)$path, $m) ? $m[1] : null);
    if ($static !== null) {
        $source = $docroot . '/' . $static;
        if (!is_file($source)) return site_not_found_plain();
        $type = substr($static, -4) === '.xml' ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8';
        return site_response(200, ['Content-Type: ' . $type, 'Cache-Control: no-cache'], (string)file_get_contents($source));
    }
    if ($gone) return site_not_found_plain();
    $shell = $req['shell'] ?? null;
    if (!is_string($shell) || $shell === '') return site_unavailable();
    return site_html(200, $shell, false);
}

function site_robots(string $domain): array {
    return site_plain(200, implode("\n", [
        'User-agent: *',
        'Allow: /',
        'Allow: /api.php?action=get_site_public&',
        'Allow: /api.php?action=get_site_seo&',
        'Allow: /api.php?action=get_site_posts&',
        'Allow: /api.php?action=get_site_post&',
        'Disallow: /api.php',
        "Sitemap: https://$domain/sitemap.xml",
    ]) . "\n");
}

function site_xml_escape($value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_XML1 | ENT_SUBSTITUTE, 'UTF-8');
}

/** lastmod: tanggal WIB (YYYY-MM-DD) dari detik Unix terbaru (UNIX_TIMESTAMP), atau null bila tidak ada. */
function site_latest_date(array $seconds): ?string {
    $valid = array_filter($seconds, function ($s) { return is_numeric($s) && (int)$s > 0; });
    return $valid ? gmdate('Y-m-d', (int)max($valid) + SITE_JAKARTA_OFFSET) : null;
}

/**
 * sitemap.xml per domain. Tidak indexable → urlset kosong. Selain itu beranda (lastmod = situs/SEO/tulisan terbaru),
 * daftar yang punya tulisan, dan setiap tulisan terbit tanpa noindex (dengan <image:image> bila ada foto).
 */
function site_sitemap(string $domain, array $site, ?array $seoRow, bool $indexable, array $posts): array {
    $origin = 'https://' . $domain;
    $entries = [];
    if ($indexable) {
        $postTimes = array_map(function ($p) { return $p['updated_ts'] ?? null; }, $posts);
        $entries[] = ['/', site_latest_date(array_merge([$site['updated_ts'] ?? null, $seoRow['updated_ts'] ?? null], $postTimes)), []];
        foreach (SITE_POST_KINDS as $kind) {
            $ofKind = array_values(array_filter($posts, function ($p) use ($kind) { return ($p['kind'] ?? null) === $kind; }));
            if (!$ofKind) continue;
            $entries[] = ["/$kind", site_latest_date(array_map(function ($p) { return $p['updated_ts'] ?? null; }, $ofKind)), []];
        }
        foreach ($posts as $p) {
            $slug = (string)($p['slug'] ?? '');
            if (!empty($p['noindex']) || !in_array($p['kind'] ?? null, SITE_POST_KINDS, true) || !preg_match(SITE_SLUG_PATTERN, $slug)) continue;
            $image = site_head_image($p['image'] ?? null);
            $entries[] = ["/{$p['kind']}/$slug", site_latest_date([$p['updated_ts'] ?? null]), $image !== '' ? [site_absolute($origin, $image)] : []];
        }
    }
    $lines = ['<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'];
    foreach ($entries as [$path, $lastmod, $images]) {
        $lines[] = '  <url>';
        $lines[] = '    <loc>' . site_xml_escape($path === '/' ? "$origin/" : $origin . $path) . '</loc>';
        if ($lastmod !== null) $lines[] = '    <lastmod>' . $lastmod . '</lastmod>';
        foreach ($images as $image) {
            $lines[] = '    <image:image>';
            $lines[] = '      <image:loc>' . site_xml_escape($image) . '</image:loc>';
            $lines[] = '    </image:image>';
        }
        $lines[] = '  </url>';
    }
    $lines[] = '</urlset>';
    return site_response(200, ['Content-Type: application/xml; charset=utf-8', 'Cache-Control: no-cache'], implode("\n", $lines) . "\n");
}

/**
 * Inti request. $req = [host, uri, query ($_GET), shell (isi index.html atau null), docroot, mainHosts, defaults (isi
 * site_defaults.json), now (ISO)]. $query = function (string $sql, array $params): array baris (prepared statement).
 * Hasil = [status, headers, body].
 */
function site_handle(array $req, callable $query): array {
    $uri = (string)($req['uri'] ?? '/');
    if (site_requested_directly($uri)) return site_not_found_plain();
    [$path, $search] = site_split_uri($uri);
    $get = is_array($req['query'] ?? null) ? $req['query'] : [];
    // ?file= hanya dari aturan .htaccess untuk /robots.txt & /sitemap.xml: "/?file=robots.txt" tetap beranda
    $file = in_array($get['file'] ?? null, ['robots.txt', 'sitemap.xml'], true) && $path === '/' . $get['file'] ? $get['file'] : null;
    $gone = isset($get['gn404']);
    $shell = is_string($req['shell'] ?? null) && $req['shell'] !== '' ? $req['shell'] : null;

    $host = site_normalize_host((string)($req['host'] ?? ''));
    if ($host === null) return $file !== null || $gone ? site_not_found_plain() : site_missing_site($shell);
    if (site_is_main_host($host, $req['mainHosts'] ?? [])) return site_passthrough($req, $path, $file, $gone);

    try {
        $site = site_find_site($query, $host);
        $domain = $site !== null ? strtolower(trim((string)$site['domain'])) : '';
        if ($site === null || !preg_match(SITE_DOMAIN_PATTERN, $domain)) {
            return $file !== null || $gone ? site_not_found_plain() : site_missing_site($shell);
        }
        // Satu host kanonis: varian www/apex → domain tersimpan (canonical juga selalu dari domain tersimpan)
        if ($host !== $domain) return site_redirect('https://' . $domain . ($path ?? '/') . $search);
        if ($gone) return site_not_found_plain();
        if ($file === 'robots.txt') return site_robots($domain);

        $allDefaults = is_array($req['defaults'] ?? null) ? $req['defaults'] : [];
        $defaults = site_defaults_of($allDefaults, $site['template_code']);
        $siteId = (int)$site['id'];
        $status = (string)$site['status'];
        $content = site_parse_content($site['content']);
        $seoRow = site_find_seo($query, $siteId);
        $seo = site_seo_public($seoRow, $status, $content, $defaults);
        if ($file === 'sitemap.xml') {
            $posts = $seo['indexable'] && $defaults['posts'] ? site_find_sitemap_posts($query, $siteId) : [];
            return site_sitemap($domain, $site, $seoRow, $seo['indexable'], $posts);
        }
        if ($status !== 'active') return site_missing_site($shell);

        if ($path === '/index.html') return site_redirect("https://$domain/$search");
        if ($path === null) {
            $route = ['kind' => 'notfound'];
        } elseif ($path !== '/' && substr($path, -1) === '/') {
            // "/berita/" → "/berita"; garis miring di akhir path lain langsung 404 (tanpa lompatan sia-sia)
            $trimmed = rtrim($path, '/');
            $trimmed = $trimmed === '' ? '/' : $trimmed;
            $route = site_parse_route($trimmed);
            if ($route['kind'] !== 'notfound') return site_redirect('https://' . $domain . $trimmed . $search);
        } else {
            $route = site_parse_route($path);
        }

        $empty = ['posts' => [], 'total' => 0];
        $lists = [];
        $post = null;
        if ($route['kind'] === 'home') {
            foreach (SITE_POST_KINDS as $kind) {
                $lists[$kind] = $defaults['posts'] ? site_find_posts($query, $siteId, $kind, SITE_HOME_POSTS_LIMIT) : $empty;
            }
        } elseif ($route['kind'] === 'list') {
            $lists[$route['postKind']] = $defaults['posts'] ? site_find_posts($query, $siteId, $route['postKind'], SITE_LIST_POSTS_LIMIT) : $empty;
        } elseif ($route['kind'] === 'post' && $defaults['posts']) {
            $post = site_find_post($query, $siteId, $route['slug']);
            if ($post !== null && $post['kind'] !== $route['postKind']) $post = null;
        }
    } catch (Throwable $e) {
        error_log('[site.php] ' . $e);
        return site_unavailable();
    }

    $input = ['domain' => $domain, 'templateCode' => $site['template_code'], 'content' => $content, 'seo' => $seo, 'route' => $route];
    if ($route['kind'] === 'post') $input['post'] = $post;
    if ($route['kind'] === 'list') $input['listCount'] = $lists[$route['postKind']]['total'];
    $head = site_build_head($input, $allDefaults);
    $found = $route['kind'] !== 'notfound' && !($route['kind'] === 'post' && $post === null);

    // Respons API yang dibutuhkan render pertama, dengan kunci persis apiUrl() klien (urutan parameter = spec §4.2)
    $public = json_decode((string)$site['content']);
    $api = [
        site_api_url('get_site_public', ['domain' => $domain]) => ['site' => [
            'id' => $siteId,
            'template_code' => $site['template_code'],
            'domain' => $site['domain'],
            'content' => $public instanceof stdClass ? $public : null,
        ]],
        site_api_url('get_site_seo', ['site_id' => $siteId]) => ['seo' => $seo],
    ];
    foreach ($lists as $kind => $list) {
        $limit = $route['kind'] === 'home' ? SITE_HOME_POSTS_LIMIT : SITE_LIST_POSTS_LIMIT;
        $api[site_api_url('get_site_posts', ['site_id' => $siteId, 'kind' => $kind, 'limit' => $limit])] = $list;
    }
    if ($post !== null) $api[site_api_url('get_site_post', ['site_id' => $siteId, 'slug' => $route['slug']])] = ['post' => $post];
    $preload = ['path' => $found ? site_path($route) : null, 'builtAt' => (string)($req['now'] ?? gmdate('Y-m-d\TH:i:s\Z')), 'api' => $api];

    $homeText = site_clean($seo['description']) !== '' ? site_clean($seo['description']) : site_base($input, $allDefaults)['homeDescription'];
    $page = site_compose_page(
        $shell ?? site_fallback_shell(),
        site_render_head_tags($head, $seoRow),
        site_render_main($found ? $route : ['kind' => 'notfound'], $head, $homeText, $lists, $post),
        $preload
    );
    return site_html($found ? 200 : 404, $page, !$found);
}

// ── Request ──

/** Fungsi kueri MySQL (prepared statement, koneksi dibuka saat kueri pertama). */
function site_mysqli_query(): callable {
    $conn = null;
    return function (string $sql, array $params) use (&$conn): array {
        if ($conn === null) {
            mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
            $conn = new mysqli(
                getenv('MYSQL_HOST') ?: 'localhost',
                getenv('MYSQL_USER') ?: 'root',
                getenv('MYSQL_PASS') ?: '',
                getenv('MYSQL_DB') ?: 'db_garudanexabahtera'
            );
            // Server hosting bawaannya latin1: tanpa ini teks seperti "©" rusak
            $conn->set_charset('utf8mb4');
        }
        $stmt = $conn->prepare($sql);
        if ($params) {
            $types = implode('', array_map(function ($p) { return is_int($p) ? 'i' : 's'; }, $params));
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    };
}

function site_main(): void {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    seo_load_env();
    $defaultsFile = __DIR__ . '/modules/site_defaults.json';
    $defaults = is_file($defaultsFile) ? json_decode((string)file_get_contents($defaultsFile), true) : null;
    if (!is_array($defaults)) {
        // Head tetap jalan dengan konten situs; hanya nilai bawaan template yang hilang
        error_log('[site.php] modules/site_defaults.json tidak ada atau rusak');
        $defaults = [];
    }
    $shellFile = __DIR__ . '/index.html';
    $mainHosts = getenv('MAIN_HOSTS');
    $response = site_handle([
        'host' => (string)($_SERVER['HTTP_HOST'] ?? ''),
        'uri' => (string)($_SERVER['REQUEST_URI'] ?? '/'),
        'query' => $_GET,
        'shell' => is_file($shellFile) ? (string)file_get_contents($shellFile) : null,
        'docroot' => __DIR__,
        'mainHosts' => site_main_hosts(is_string($mainHosts) && trim($mainHosts) !== '' ? $mainHosts : SITE_DEFAULT_MAIN_HOSTS),
        'defaults' => $defaults,
        'now' => gmdate('Y-m-d\TH:i:s\Z'),
    ], site_mysqli_query());
    http_response_code($response['status']);
    foreach ($response['headers'] as $header) header($header);
    echo $response['body'];
}

// Tes (site-renderer.test.ts, site-seo.test.ts) memuat file ini sebagai pustaka tanpa menjalankan request
if (!defined('GN_SITE_LIBRARY')) site_main();
