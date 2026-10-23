<?php
// Cadangan SEO untuk template yang terbit setelah deploy terakhir (docs/platform/SEO-PLAN.md §5.2 langkah 8).
//
// Halaman template yang sudah ada saat deploy diprerender ke _pre/template/{slug}.html dan disajikan langsung oleh
// .htaccess. Template baru yang terbit sesudahnya belum punya file itu: .htaccess mengarahkan /template/{slug} ke sini
// (host utama saja; akses langsung ke /seo.php ditolak 404 oleh aturan THE_REQUEST). Skrip ini:
// - template tidak ada / belum terbit / slug tidak sah → 404 dengan isi 404.html;
// - selain itu index.html (cangkang aplikasi) + head lengkap (title, description, canonical, OG, JSON-LD Organization,
//   WebSite, Product, BreadcrumbList) + <main> sederhana (H1, deskripsi, fitur, harga, tautan pesan/demo/katalog).
//   Aplikasi React lalu dimuat seperti biasa dan menggantikan isi #root.
//
// Head dibuat dengan aturan yang sama dengan src/seo (templateSeo.ts, jsonld.ts, head.ts) untuk template tanpa salinan
// WP5; __tests__/backend/seo-fallback.test.ts membandingkan hasil kedua sisi. Organization/WebSite diambil apa adanya
// dari _pre/seo-fallback.json (ditulis scripts/prerender.mjs dari kode TypeScript yang sama).
// Data template dibaca lewat backend/modules/templates.php (pf_template_out), sama dengan get_template.
//
// Aturan proses: setelah harga/nama/deskripsi template berubah atau template baru terbit, deploy ulang
// (deploy/cpanel/README.md); skrip ini hanya penambal sampai deploy berikutnya.

const SEO_SLUG_PATTERN = '/^[a-z0-9-]{1,120}$/';
const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MAX = 155;
const SEO_RASTER = '/\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i';

// ── Teks & format (sama dengan src/seo/format.ts) ──

function seo_collapse(string $value): string {
    return trim(preg_replace('/\s+/u', ' ', $value));
}

/** Panjang dalam unit UTF-16, seperti String.length di JavaScript. */
function seo_js_length(string $value): int {
    // Karakter di luar BMP (emoji) = 2 unit UTF-16. Tanpa mbstring, supaya jalan di PHP hosting mana pun.
    return (int)preg_match_all('/./us', $value) + (int)preg_match_all('/[^\x{0000}-\x{FFFF}]/u', $value);
}

/** String.prototype.slice(0, $length) untuk teks tanpa karakter di luar BMP. */
function seo_js_slice(string $value, int $length): string {
    return preg_match('/^.{0,' . $length . '}/us', $value, $m) ? $m[0] : '';
}

function seo_first_that_fits(array $candidates, int $max): string {
    $list = [];
    foreach ($candidates as $candidate) {
        if (is_string($candidate) && trim($candidate) !== '') $list[] = seo_collapse($candidate);
    }
    foreach ($list as $text) {
        if (seo_js_length($text) <= $max) return $text;
    }
    return $list ? $list[count($list) - 1] : '';
}

function seo_sentence(string $value): string {
    $text = seo_collapse($value);
    return ($text === '' || preg_match('/[.!?]$/u', $text)) ? $text : $text . '.';
}

function seo_is_price($value): bool {
    return (is_int($value) || is_float($value)) && is_finite((float)$value) && $value > 0;
}

function seo_group_thousands($value): string {
    return number_format(round((float)$value), 0, ',', '.');
}

/** 1390000 → "Rp1.390.000". */
function seo_price_full($price): string {
    return 'Rp' . seo_group_thousands($price);
}

/** 990000 → "Rp990 rb", 1390000 → "Rp1,39 jt"; yang tidak bisa diringkas tanpa pembulatan → bentuk lengkap. */
function seo_price_short($price): string {
    $rupiah = (int)round((float)$price);
    if ($rupiah < 1000000) return $rupiah % 1000 === 0 ? 'Rp' . intdiv($rupiah, 1000) . ' rb' : seo_price_full($rupiah);
    if ($rupiah % 10000 !== 0) return seo_price_full($rupiah);
    $hundredths = intdiv($rupiah, 10000);
    $whole = intdiv($hundredths, 100);
    $fraction = rtrim(str_pad((string)($hundredths % 100), 2, '0', STR_PAD_LEFT), '0');
    return 'Rp' . seo_group_thousands($whole) . ($fraction !== '' ? ',' . $fraction : '') . ' jt';
}

function seo_lower(string $value): string {
    return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
}

// ── Isi head template (sama dengan src/seo/templateSeo.ts, tanpa salinan WP5) ──

function seo_niche(array $t): string {
    return seo_collapse($t['category'] !== '' && $t['category'] !== null ? (string)$t['category'] : 'Siap Pakai');
}

function seo_template_title(array $t): string {
    $name = (string)$t['name'];
    $niche = seo_niche($t);
    $price = seo_is_price($t['price']) ? ' – ' . seo_price_short($t['price']) : '';
    return seo_first_that_fits([
        "$name: Template Website $niche$price",
        "$name: Template $niche$price",
        $price !== '' ? "$name: Template Website$price" : '',
        "$name: Template Website $niche",
        "$name: Template $niche",
        "$name: Template Website",
        seo_js_slice($name, SEO_TITLE_MAX),
    ], SEO_TITLE_MAX);
}

function seo_has_demo(array $t): bool {
    return !empty($t['template_code']) || !empty($t['demo_url']);
}

function seo_template_description(array $t): string {
    $niche = seo_lower(seo_niche($t));
    $short = is_string($t['short_description'] ?? null) ? $t['short_description'] : '';
    $lead = $short !== '' ? seo_sentence($short) : '';
    $named = "{$t['name']}: template website $niche siap pakai.";
    $generic = "Template website $niche siap pakai.";
    $demo = seo_has_demo($t) ? ' Lihat demo.' : '';
    $includes = seo_is_price($t['price'])
        ? seo_price_full($t['price']) . ' sudah termasuk domain, hosting & SSL tahun pertama.'
        : 'Sudah termasuk domain, hosting & SSL tahun pertama.';
    $full = " $includes Kelola isi lewat CMS.$demo";
    $short2 = " $includes$demo";
    $bare = " $includes";
    return seo_first_that_fits([
        $lead !== '' ? $lead . $full : '',
        $lead !== '' ? $lead . $short2 : '',
        $named . $full,
        $generic . $full,
        $named . $short2,
        $generic . $short2,
        $generic . $bare,
    ], SEO_DESCRIPTION_MAX);
}

/** Gambar raster (pratinjau lalu galeri), tanpa duplikat; SVG dilewati. */
function seo_raster_images(array $t): array {
    $list = [];
    foreach (array_merge([$t['preview_image'] ?? null], $t['gallery'] ?? []) as $src) {
        if (!is_string($src)) continue;
        $src = trim($src);
        if ($src === '' || !preg_match(SEO_RASTER, $src) || in_array($src, $list, true)) continue;
        $list[] = $src;
    }
    return $list;
}

function seo_absolute(string $origin, string $src): string {
    if (preg_match('/^https?:\/\//i', $src)) return $src;
    return $origin . ($src[0] === '/' ? $src : '/' . $src);
}

function seo_page_url(string $origin, string $path): string {
    return $path === '/' ? $origin . '/' : $origin . $path;
}

/** "Kecantikan & Klinik" → "kecantikan-klinik" bila itu halaman kategori yang dikenal, selain itu null. */
function seo_category_slug($category, array $known): ?string {
    $text = (string)$category;
    if (class_exists('Normalizer')) $text = preg_replace('/\p{Mn}+/u', '', Normalizer::normalize($text, Normalizer::FORM_KD));
    $slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($text)), '-');
    return in_array($slug, $known, true) ? $slug : null;
}

/** SeoHead (bentuk src/seo/types.ts) untuk satu template terbit. */
function seo_template_head(array $t, array $ctx): array {
    $origin = $ctx['origin'];
    $path = '/template/' . $t['slug'];
    $url = seo_page_url($origin, $path);
    $raster = seo_raster_images($t);
    $images = $raster ? array_map(function ($src) use ($origin) { return seo_absolute($origin, $src); }, $raster) : [$ctx['defaultOgImage']];
    $description = seo_template_description($t);
    $productDescription = '';
    foreach ([$t['short_description'] ?? null, $t['description'] ?? null, $description] as $candidate) {
        if (is_string($candidate) && $candidate !== '') { $productDescription = $candidate; break; }
    }
    $product = [
        '@type' => 'Product',
        '@id' => "$url#product",
        'name' => $t['name'],
        'description' => seo_collapse($productDescription),
        'sku' => $t['slug'],
        'url' => $url,
        'image' => $images,
        'brand' => ['@type' => 'Brand', 'name' => $ctx['brandName']],
    ];
    if (!empty($t['category'])) $product['category'] = $t['category'];
    if (seo_is_price($t['price'])) {
        $product['offers'] = [
            '@type' => 'Offer',
            'url' => $url,
            'price' => $t['price'],
            'priceCurrency' => 'IDR',
            'availability' => 'https://schema.org/InStock',
            'itemCondition' => 'https://schema.org/NewCondition',
            'seller' => ['@id' => $ctx['organizationId']],
        ];
    }
    $crumbs = [['Beranda', '/'], ['Template', '/template']];
    $category = seo_category_slug($t['category'], $ctx['categorySlugs']);
    if ($category !== null) $crumbs[] = [$t['category'], '/template/kategori/' . $category];
    $crumbs[] = [$t['name'], $path];
    $items = [];
    foreach ($crumbs as $i => [$name, $crumbPath]) {
        $items[] = ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $name, 'item' => seo_page_url($origin, $crumbPath)];
    }
    $head = [
        'title' => seo_template_title($t),
        'description' => $description,
        'canonical' => $url,
        'robots' => 'index,follow',
        'ogType' => 'product',
        'ogImage' => $ctx['defaultOgImage'],
        'ogImageAlt' => 'Tampilan template website ' . $t['name'] . (!empty($t['category']) ? ' (' . $t['category'] . ')' : '') . ' dari Garuda Nexa',
        'jsonLd' => array_merge($ctx['globalJsonLd'], [
            $product,
            ['@type' => 'BreadcrumbList', '@id' => "$url#breadcrumb", 'itemListElement' => $items],
        ]),
    ];
    if ($raster) $head['preloadImage'] = $raster[0];
    return $head;
}

// ── Tag head (sama dengan src/seo/head.ts renderHeadTags) ──

function seo_escape($value): string {
    return str_replace('&#039;', '&#39;', htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML401, 'UTF-8'));
}

function seo_json_ld($value): string {
    $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);
    // U+2028/2029 juga di-escape, seperti serializeJsonLd di jsonld.ts
    return str_replace(["\u{2028}", "\u{2029}"], ['\u2028', '\u2029'], $json === false ? 'null' : $json);
}

function seo_tag(string $key, string $tag, array $attrs, ?string $text = null): string {
    $html = "<$tag";
    foreach ($attrs as [$name, $value]) $html .= ' ' . $name . '="' . seo_escape($value) . '"';
    $html .= ' data-gn="' . seo_escape($key) . '">';
    return $tag === 'script' ? $html . ($text ?? '') . '</script>' : $html;
}

function seo_render_head_tags(array $head, array $ctx): string {
    $meta = function ($key, $attr, $content) { return seo_tag($key, 'meta', [[$attr, $key], ['content', $content]]); };
    $tags = ['<title>' . seo_escape($head['title']) . '</title>', $meta('description', 'name', $head['description']), $meta('robots', 'name', $head['robots'])];
    if (!empty($head['canonical'])) $tags[] = seo_tag('canonical', 'link', [['rel', 'canonical'], ['href', $head['canonical']]]);
    $tags[] = $meta('og:site_name', 'property', 'Garuda Nexa');
    $tags[] = $meta('og:locale', 'property', 'id_ID');
    $tags[] = $meta('og:type', 'property', $head['ogType']);
    if (!empty($head['canonical'])) $tags[] = $meta('og:url', 'property', $head['canonical']);
    $tags[] = $meta('og:title', 'property', $head['title']);
    $tags[] = $meta('og:description', 'property', $head['description']);
    $tags[] = $meta('og:image', 'property', $head['ogImage']);
    $ogDir = $ctx['origin'] . '/og/';
    if (strpos($head['ogImage'], $ogDir) === 0 && substr($head['ogImage'], -4) === '.jpg') {
        $tags[] = $meta('og:image:type', 'property', 'image/jpeg');
        $tags[] = $meta('og:image:width', 'property', '1200');
        $tags[] = $meta('og:image:height', 'property', '630');
    }
    $tags[] = $meta('og:image:alt', 'property', $head['ogImageAlt']);
    if ($head['ogType'] === 'product') {
        foreach ($head['jsonLd'] as $node) {
            if (($node['@type'] ?? null) !== 'Product' || !isset($node['offers']['price'], $node['offers']['priceCurrency'])) continue;
            $tags[] = $meta('product:price:amount', 'property', (string)$node['offers']['price']);
            $tags[] = $meta('product:price:currency', 'property', $node['offers']['priceCurrency']);
            break;
        }
    }
    $tags[] = $meta('twitter:card', 'name', 'summary_large_image');
    if (!empty($head['preloadImage'])) {
        $tags[] = seo_tag('preload-image', 'link', [['rel', 'preload'], ['as', 'image'], ['href', $head['preloadImage']], ['fetchpriority', 'high']]);
    }
    $tags[] = seo_tag('apple-touch-icon', 'link', [['rel', 'apple-touch-icon'], ['href', '/apple-touch-icon.png']]);
    $tags[] = seo_tag('manifest', 'link', [['rel', 'manifest'], ['href', '/site.webmanifest']]);
    if ($head['jsonLd']) {
        $tags[] = seo_tag('jsonld', 'script', [['type', 'application/ld+json']], seo_json_ld(['@context' => 'https://schema.org', '@graph' => $head['jsonLd']]));
    }
    return implode("\n", $tags);
}

// ── Isi halaman ──

/** <main> sederhana yang bisa dibaca crawler tanpa JavaScript; React menggantinya setelah dimuat. */
function seo_render_main(array $t, array $ctx): string {
    $e = 'seo_escape';
    $slug = rawurlencode($t['slug']);
    $html = '<main id="konten" class="container-site pt-nav pb-16">';
    $html .= '<nav aria-label="Breadcrumb"><a href="/">Beranda</a> › <a href="/template">Template</a> › <span aria-current="page">' . $e($t['name']) . '</span></nav>';
    $html .= '<h1>' . $e($t['name'] . ': Template Website ' . seo_niche($t)) . '</h1>';
    foreach (preg_split('/\n\s*\n/', (string)($t['description'] ?: $t['short_description'] ?: '')) as $paragraph) {
        if (trim($paragraph) !== '') $html .= '<p>' . $e(trim($paragraph)) . '</p>';
    }
    if (!empty($t['features'])) {
        $html .= '<h2>Fitur</h2><ul>';
        foreach ($t['features'] as $feature) $html .= '<li>' . $e($feature) . '</li>';
        $html .= '</ul>';
    }
    if (seo_is_price($t['price'])) {
        $html .= '<h2>Harga</h2><p><strong>' . $e(seo_price_full($t['price'])) . '</strong></p>';
        if (!empty($ctx['pricingIncludes'])) {
            $html .= '<p>Sudah termasuk:</p><ul>';
            foreach ($ctx['pricingIncludes'] as $item) $html .= '<li>' . $e($item) . '</li>';
            $html .= '</ul>';
        }
    }
    $demo = is_string($t['demo_url'] ?? null) && preg_match('/^https?:\/\//i', $t['demo_url']) ? $t['demo_url'] : "/demo/$slug";
    $html .= '<p><a href="/pesan/' . $slug . '">Pesan Template</a> · <a href="' . $e($demo) . '">Lihat Demo</a> · <a href="/template">Semua template</a></p>';
    return $html . '</main>';
}

/** Hapus tag head per halaman dari cangkang index.html (sama dengan stripPageHead di scripts/prerender.mjs). */
function seo_strip_page_head(string $shell): string {
    $end = strpos($shell, '</head>');
    if ($end === false) return $shell;
    $head = substr($shell, 0, $end);
    foreach ([
        '/<title>[\s\S]*?<\/title>\s*/i',
        '/<meta\s+name="description"[^>]*>\s*/i',
        '/<meta\s+name="robots"[^>]*>\s*/i',
        '/<meta\s+(?:property|name)="(?:og|twitter):[^"]*"[^>]*>\s*/i',
        '/<link\s+rel="canonical"[^>]*>\s*/i',
        '/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/i',
    ] as $pattern) {
        $head = preg_replace($pattern, '', $head);
    }
    return $head . substr($shell, $end);
}

/** Halaman utuh: cangkang + head + <main> di dalam #root. */
function seo_render_page(array $t, array $ctx, string $shell): string {
    $head = seo_template_head($t, $ctx);
    $tags = seo_render_head_tags($head, $ctx);
    $html = seo_strip_page_head($shell);
    if (preg_match('/<meta\s+name="viewport"[^>]*>/i', $html, $m, PREG_OFFSET_CAPTURE)) {
        $at = $m[0][1] + strlen($m[0][0]);
        $html = substr($html, 0, $at) . "\n    " . str_replace("\n", "\n    ", $tags) . substr($html, $at);
    } else {
        $html = str_replace('</head>', $tags . "\n</head>", $html);
    }
    return str_replace('<div id="root"></div>', '<div id="root">' . seo_render_main($t, $ctx) . '</div>', $html);
}

// ── Request ──

function seo_load_env(): void {
    foreach ([__DIR__ . '/.env', dirname(__DIR__) . '/.env'] as $file) {
        if (!is_file($file)) continue;
        foreach (file($file, FILE_IGNORE_NEW_LINES) as $line) {
            if (!preg_match('/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/', $line, $m) || getenv($m[1]) !== false) continue;
            putenv($m[1] . '=' . preg_replace('/^([\'"])(.*)\1$/', '$2', $m[2]));
        }
        break;
    }
}

function seo_not_found(): void {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    header('X-Robots-Tag: noindex, follow');
    $page = __DIR__ . '/404.html';
    if (is_file($page)) readfile($page);
    else echo '<!doctype html><title>Halaman tidak ditemukan</title><h1>Halaman tidak ditemukan</h1>';
}

/** Template terbit untuk slug ini (bentuk get_template), atau null. */
function seo_find_template(string $slug): ?array {
    require_once __DIR__ . '/modules/templates.php';
    seo_load_env();
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $conn = new mysqli(
        getenv('MYSQL_HOST') ?: 'localhost',
        getenv('MYSQL_USER') ?: 'root',
        getenv('MYSQL_PASS') ?: '',
        getenv('MYSQL_DB') ?: 'db_garudanexabahtera'
    );
    $conn->set_charset('utf8mb4');
    $stmt = $conn->prepare("SELECT * FROM templates WHERE slug = ? AND status = 'published' LIMIT 1");
    $stmt->bind_param('s', $slug);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $conn->close();
    return $row ? pf_template_out($row) : null;
}

function seo_main(): void {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    $slug = isset($_GET['slug']) && is_string($_GET['slug']) ? strtolower($_GET['slug']) : '';
    if (!preg_match(SEO_SLUG_PATTERN, $slug) || $slug === 'kategori') {
        seo_not_found();
        return;
    }
    $ctxFile = __DIR__ . '/_pre/seo-fallback.json';
    $ctx = is_file($ctxFile) ? json_decode((string)file_get_contents($ctxFile), true) : null;
    $shell = is_file(__DIR__ . '/index.html') ? (string)file_get_contents(__DIR__ . '/index.html') : '';
    try {
        $template = seo_find_template($slug);
    } catch (Throwable $e) {
        error_log('[seo.php] ' . $e);
        http_response_code(503);
        header('Retry-After: 300');
        header('Cache-Control: no-store');
        echo 'Layanan sedang sibuk. Silakan coba lagi beberapa saat lagi.';
        return;
    }
    if (!$template) {
        seo_not_found();
        return;
    }
    if (!is_array($ctx) || $shell === '') {
        // Build tidak lengkap: tetap sajikan aplikasinya (tanpa head SEO) daripada halaman kosong
        error_log('[seo.php] _pre/seo-fallback.json atau index.html tidak ada');
        header('Content-Type: text/html; charset=utf-8');
        echo $shell;
        return;
    }
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    echo seo_render_page($template, $ctx, $shell);
}

// Tes (seo-fallback.test.ts) memuat file ini sebagai pustaka tanpa menjalankan request
if (!defined('GN_SEO_LIBRARY')) seo_main();
