<?php
// Projects of the home page (#projects, setting portfolio_data in hero_settings) for backend/api.php: project media
// uploads and the project fields of update_settings. backend/modules/portfolio_media.js implements the same for the
// Node backend: keep both identical (action names, limits, generated names, error messages and HTTP status codes).
//
// portfolio_data is a JSON array of projects (Pengaturan website > Proyek, src/pages/admin/portfolio). The old fields
// are saved as sent: title, desc (tag / kategori), image (cover of the card), span (grid width, no longer used by the
// site). Except a data: cover: older admin pages stored the cover inline, and get_settings put those base64 images into
// every prerendered page (gn-preload). update_settings stores it as a file with the checks of upload_project_image,
// named project_<first 12 hex of its SHA-256>.<ext> so saving the same cover again gives the same file; a cover the
// checks refuse fails the save (400 "Proyek ke-N: ..."). Files are written only once every project passed.
// The newer, optional fields are normalized (src/components/sections/projects/portfolio.ts reads them the same way) and
// dropped when they end up empty:
//   description  text, newlines kept (\r\n → \n), control characters removed, trimmed, at most 3000 characters
//   tools        tech stack: strings with whitespace collapsed, at most 40 characters each, duplicates (ASCII case
//                ignored) and empty names dropped, at most 12
//   url          link to the live site: http(s) URL or a bare domain (→ https://), ASCII URL characters only, at most
//                500 characters; anything else is dropped
//   gallery      images shown in the project dialog: links (safe_link), at most 12; a data: URI is refused (400)
//   video        a link (safe_link); a data: URI is refused (400)
// Legacy: a project sent without image takes the stored image at the same position (as before this module); a stored
// data: cover taken this way becomes a file too.
//
// upload_project_image (POST JSON {data: data URI}, staff token): JPG, PNG, WEBP or GIF by magic bytes, size limit
// UPLOAD_MAX_IMAGE_MB (parse_upload), stored as /assets/projects/project_<12 hex>.<ext> → {success: true, url}.
// upload_project_video (POST /api.php?action=upload_project_video, staff token, raw file body like upload_hero_video;
// api.php skips its JSON read for it): hm_store_video() of hero_media.php, so the same type check (MP4/WebM) and
// limit (UPLOAD_MAX_VIDEO_MB), stored as /assets/projects/project_video_<12 hex>.<mp4|webm> → {success: true, url}.
// Video limit for the admin page: get_hero_media_limits. Both actions are in none of the lists of api.php, so the
// default staff rule applies (same as update_settings).
//
// Files are never deleted at save time. A garbage-collect sweep after every upload and every successful update_settings
// with portfolio_data deletes the names this module generates directly in public/assets/projects/ that are older than
// a day and whose name is not the file name (hm_link_name) of an image, gallery entry or video in the stored
// portfolio_data, and temp files of broken video uploads older than an hour. No sweep while the stored portfolio_data
// is not a JSON array (a broken value must not cost the files). public/assets/projects/ holds uploads only: it is
// git-ignored and never deployed (scripts/deploy-cpanel.mjs EXCLUDE).
// Helpers used from api.php and hero_media.php: ApiError, db_all, public_dir, parse_upload, sniff_image, safe_link,
// hm_store_video, hm_link_name, HM_UNUSED_SECONDS, HM_TEMP_SECONDS.

const PM_FOLDER = 'projects';
const PM_MAX_GALLERY = 12;
const PM_MAX_TOOLS = 12;
const PM_TOOL_MAX = 40;
const PM_DESCRIPTION_MAX = 3000;
const PM_URL_MAX = 500;
// Raster images only: the dialog shows them full width
const PM_IMAGE_EXTS = ['jpg', 'png', 'webp', 'gif'];
// Names this module gives its files (file name only, directly in assets/projects/); the sweep deletes nothing else
const PM_GENERATED_IMAGE = '/^project_[0-9a-f]{12}\.(jpg|png|webp|gif)$/D';
const PM_GENERATED_VIDEO = '/^project_video_[0-9a-f]{12}\.(mp4|webm)$/D';
const PM_TEMP_VIDEO = '/^\.project_video_[0-9a-f]{12}\.part$/D';
// http(s) URL or bare domain: host with at least one dot, optional port, then RFC 3986 characters only
const PM_URL = '~^(https?://)?([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?::[0-9]{1,5})?(?:[/?#][A-Za-z0-9\-._\~:/?#\[\]@!$&()*+,;=%]*)?)$~iD';
// A data: URI behind leading spaces/control characters (browsers ignore those in a URL scheme)
const PM_DATA_URI = '/^[\x00-\x20]*data:/i';
const PM_TYPE_ERROR = 'Gambar proyek harus JPG, PNG, WEBP, atau GIF.';
const PM_IMAGE_SERVER_ERROR = 'Ukuran gambar melebihi batas server.';
const PM_DATA_IMAGE_ERROR = 'Gambar detail proyek harus diunggah lewat upload_project_image.';
const PM_DATA_VIDEO_ERROR = 'Video proyek harus diunggah lewat upload_project_video.';
const PM_STORED_SQL = "SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN ('portfolio_data')";

// Runs upload_project_image and upload_project_video (POST only; a GET falls through to api.php's "Invalid action")
function handle_portfolio_media_action(mysqli $conn, string $action, array $input, ?array $user): bool {
    if (!in_array($action, ['upload_project_image', 'upload_project_video'], true) || ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') return false;
    $url = $action === 'upload_project_image' ? pm_store_image($input) : hm_store_video(PM_FOLDER, 'project_video');
    echo json_encode(["success" => true, "url" => $url]);
    // After the reply is written; the sweep never changes it
    pm_sweep($conn);
    return true;
}

// A new project image (data URI) → [content, ext]. The type comes from the first bytes and must be one of
// PM_IMAGE_EXTS; parse_upload() then checks the rest (size limit, empty file).
function pm_image(string $dataUri): array {
    if (preg_match('/^data:[^,]*?;base64,/i', $dataUri, $m)) {
        $head = (string)base64_decode(substr($dataUri, strlen($m[0]), 64));
        if (!in_array(sniff_image($head), PM_IMAGE_EXTS, true)) throw new ApiError(PM_TYPE_ERROR);
    }
    return parse_upload($dataUri, false);
}

// Writes an image to public/assets/projects/ (an existing file of that name is replaced, which also makes it new for
// the sweep) and returns its path
function pm_write_image(string $content, string $name): string {
    $folder = public_dir() . '/assets/' . PM_FOLDER;
    if (!is_dir($folder) && !mkdir($folder, 0755, true)) throw new RuntimeException("Cannot create upload folder $folder");
    if (file_put_contents($folder . '/' . $name, $content) === false) throw new RuntimeException("Cannot write upload $folder/$name");
    return '/assets/' . PM_FOLDER . '/' . $name;
}

// Stores the data URI of upload_project_image in public/assets/projects/ and returns its path
function pm_store_image(array $input): string {
    // Nothing decoded from a body that was sent: PHP dropped it because it exceeds post_max_size
    if ($input === [] && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) throw new ApiError(PM_IMAGE_SERVER_ERROR, 413);
    $data = is_string($input['data'] ?? null) ? pm_trim($input['data']) : '';
    if (!preg_match('/^data:/i', $data)) throw new ApiError('Format file tidak valid.');
    [$content, $ext] = pm_image($data);
    return pm_write_image($content, 'project_' . bin2hex(random_bytes(6)) . '.' . $ext);
}

// A data: cover of portfolio_data (see the header) → [content, file name]; a refused cover names its project
function pm_cover(string $dataUri, int $index): array {
    try {
        [$content, $ext] = pm_image(pm_trim($dataUri));
    } catch (ApiError $e) {
        throw new ApiError('Proyek ke-' . ($index + 1) . ': ' . $e->getMessage(), $e->status);
    }
    return [$content, 'project_' . substr(hash('sha256', $content), 0, 12) . '.' . $ext];
}

// ── update_settings ──

// PHP's trim() set; also used by the Node module so both cut the same characters
function pm_trim(string $text): string {
    return trim($text, " \t\n\r\0\x0B");
}

// Text with newlines: \r\n and \r → \n, control characters other than tab/newline removed, trimmed, cut to $max
// characters (code points)
function pm_text(string $value, int $max): string {
    $text = str_replace(["\r\n", "\r"], "\n", $value);
    $text = pm_trim((string)preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text));
    return mb_strlen($text, 'UTF-8') > $max ? pm_trim(mb_substr($text, 0, $max, 'UTF-8')) : $text;
}

// One line: whitespace runs → one space, control characters removed, trimmed, cut to $max characters
function pm_line(string $value, int $max): string {
    $text = (string)preg_replace('/[\x00-\x1F\x7F]/', '', (string)preg_replace('/[ \t\n\r\x0B\x0C]+/', ' ', $value));
    $text = pm_trim($text);
    return mb_strlen($text, 'UTF-8') > $max ? pm_trim(mb_substr($text, 0, $max, 'UTF-8')) : $text;
}

function pm_tools(array $list): array {
    $tools = [];
    $seen = [];
    foreach ($list as $tool) {
        if (!is_string($tool)) continue;
        $name = pm_line($tool, PM_TOOL_MAX);
        // strtolower() changes ASCII letters only (PHP 8.2+), like asciiLower() in portfolio_media.js
        $key = strtolower($name);
        if ($name === '' || isset($seen[$key])) continue;
        $seen[$key] = true;
        $tools[] = $name;
        if (count($tools) === PM_MAX_TOOLS) break;
    }
    return $tools;
}

// Live site link: http(s) URL (scheme lowercased) or bare domain (https:// added); '' for anything else
function pm_url(string $value): string {
    $url = pm_trim($value);
    if (!preg_match(PM_URL, $url, $m)) return '';
    $url = ($m[1] !== '' ? strtolower($m[1]) : 'https://') . $m[2];
    return strlen($url) <= PM_URL_MAX ? $url : '';
}

// Media link: a data: URI is refused with $error, other values pass safe_link() and are trimmed
function pm_media_link(string $value, string $error): string {
    if (preg_match(PM_DATA_URI, $value)) throw new ApiError($error);
    return pm_trim((string)safe_link($value));
}

function pm_gallery(array $list): array {
    $gallery = [];
    foreach ($list as $src) {
        if (!is_string($src)) continue;
        $link = pm_media_link($src, PM_DATA_IMAGE_ERROR);
        if ($link === '') continue;
        $gallery[] = $link;
        if (count($gallery) === PM_MAX_GALLERY) break;
    }
    return $gallery;
}

// The new fields of one project (properties of a JSON object), normalized; empty ones are removed. JSON arrays come
// as PHP lists and JSON objects as stdClass (json_decode without assoc), so {} stays {} like in Node.
function pm_item(array $item, $stored): array {
    if (empty($item['image']) && is_array($stored) && !empty($stored['image'])) $item['image'] = $stored['image'];
    foreach (['description', 'tools', 'url', 'gallery', 'video'] as $key) {
        if (!array_key_exists($key, $item)) continue;
        $value = $item[$key];
        switch ($key) {
            case 'description': $value = is_string($value) ? pm_text($value, PM_DESCRIPTION_MAX) : ''; break;
            case 'tools': $value = is_array($value) ? pm_tools($value) : []; break;
            case 'url': $value = is_string($value) ? pm_url($value) : ''; break;
            case 'gallery': $value = is_array($value) ? pm_gallery($value) : []; break;
            case 'video': $value = is_string($value) ? pm_media_link($value, PM_DATA_VIDEO_ERROR) : ''; break;
        }
        if ($value === '' || $value === []) unset($item[$key]);
        else $item[$key] = $value;
    }
    return $item;
}

// Stored portfolio_data as a list of associative arrays ([] when there is no row), or null when it is not a JSON array
function pm_stored(mysqli $conn): ?array {
    $rows = db_all($conn, PM_STORED_SQL);
    if (!$rows) return [];
    $items = json_decode((string)$rows[0]['setting_value'], true);
    return is_array($items) && array_is_list($items) ? $items : null;
}

// Normalizes portfolio_data of an update_settings payload in place, before anything is saved (see the header). Not a
// string holding a JSON array → saved as sent. Refuses data: gallery images and videos and covers the upload checks
// refuse (400) before anything is saved; data: covers become files. Returns function (bool $saved): call it once the
// request is over; after a successful save it runs the sweep.
function portfolio_prepare_settings(mysqli $conn, array &$settings): callable {
    $value = $settings['portfolio_data'] ?? null;
    $items = is_string($value) ? json_decode($value) : null;
    if (!is_array($items)) return function (bool $saved) {};
    $stored = pm_stored($conn) ?? [];
    $covers = [];
    foreach ($items as $index => $item) {
        if (!($item instanceof stdClass)) continue;
        $fields = pm_item(get_object_vars($item), $stored[$index] ?? null);
        if (is_string($fields['image'] ?? null) && preg_match(PM_DATA_URI, $fields['image'])) $covers[$index] = pm_cover($fields['image'], $index);
        $items[$index] = (object)$fields;
    }
    // Only now that every project passed
    foreach ($covers as $index => [$content, $name]) $items[$index]->image = pm_write_image($content, $name);
    $json = json_encode($items, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false) throw new RuntimeException('Cannot encode portfolio_data: ' . json_last_error_msg());
    $settings['portfolio_data'] = $json;
    return function (bool $saved) use ($conn) {
        if ($saved) pm_sweep($conn);
    };
}

// File names (hm_link_name) of every image, gallery entry and video in the stored portfolio_data, as keys; null while
// it is not a JSON array
function pm_used_names(mysqli $conn): ?array {
    $items = pm_stored($conn);
    if ($items === null) return null;
    $used = [];
    foreach ($items as $item) {
        // A JSON object decodes to an associative (or empty) array; a JSON array item is skipped like in Node
        if (!is_array($item) || ($item !== [] && array_is_list($item))) continue;
        $gallery = $item['gallery'] ?? null;
        $links = array_merge([$item['image'] ?? null, $item['video'] ?? null], is_array($gallery) && array_is_list($gallery) ? $gallery : []);
        foreach ($links as $link) {
            $name = hm_link_name($link);
            if ($name !== '') $used[$name] = true;
        }
    }
    return $used;
}

// Garbage-collect sweep (see the header). Errors are logged and never fail the request.
function pm_sweep(mysqli $conn): void {
    try {
        $used = pm_used_names($conn);
        if ($used === null) return;
        $folder = public_dir() . '/assets/' . PM_FOLDER;
        $now = time();
        foreach ((is_dir($folder) ? scandir($folder) : false) ?: [] as $name) {
            if (preg_match(PM_TEMP_VIDEO, $name)) {
                $age = HM_TEMP_SECONDS;
            } elseif ((preg_match(PM_GENERATED_IMAGE, $name) || preg_match(PM_GENERATED_VIDEO, $name)) && !isset($used[$name])) {
                $age = HM_UNUSED_SECONDS;
            } else {
                continue;
            }
            $path = $folder . '/' . $name;
            $modified = (is_file($path) && !is_link($path)) ? filemtime($path) : false;
            if ($modified !== false && $modified < $now - $age && !@unlink($path)) error_log("[portfolio_media] Cannot delete $path");
        }
    } catch (Throwable $e) {
        error_log('[portfolio_media] Sweep failed: ' . $e);
    }
}
