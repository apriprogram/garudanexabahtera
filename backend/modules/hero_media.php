<?php
// Hero background of the public home page (table hero_settings) for backend/api.php. backend/modules/hero_media.js
// implements the same for the Node backend: keep both identical (action name, file signatures, limits, generated
// names, error messages and HTTP status codes).
//
// Settings (every value is a string; get_settings is public and returns them all):
//   hero_bg_mode          'default' (animated dot field) | 'image' | 'video'; anything else is saved as 'default'
//   hero_images           JSON array of image paths in slide order; new images arrive as data:image/... URIs
//   hero_bg_video         path of a video stored by upload_hero_video, '' = none; never a data: URI
//   hero_bg_video_poster  path of the poster image, '' = none; a new poster arrives as a data:image/... URI
//
// upload_hero_video (POST /api.php?action=upload_hero_video, staff token): the body is the raw file, not JSON, base64
// or multipart; api.php skips its JSON read for this action and the body is streamed from php://input into a dot
// file in public/assets/bg/ (refused by the web server) with a byte cap, so it never sits in memory. The type comes
// from the magic bytes only (MP4/ISO-BMFF with an allowed major brand, or WebM), the size limit is
// UPLOAD_MAX_VIDEO_MB (default 30), and the name is generated here: /assets/bg/hero_video_<12 hex>.<mp4|webm>.
// → {success: true, url}; failure → HTTP 400/413 + {error}. api.php calls handle_hero_media_action() after the access
// check (authorize_request); the action is in none of the lists, so the default staff rule applies.
//
// update_settings: api.php calls hero_media_prepare_settings() before anything is saved. It normalizes the keys above
// and returns a function to call after the save, which deletes the video/poster file the save replaced. Only files
// this module named (hero_video_<hex>, hero_poster_<hex> directly in public/assets/bg/) are ever deleted; seed images
// and older uploads in that folder stay.
// Helpers used from api.php: ApiError, db_all, env_value, upload_limit_bytes, public_dir, parse_upload, safe_link,
// save_base64_asset, delete_local_asset.

const HM_BG_MODES = ['default', 'image', 'video'];
// ISO-BMFF major brands of MP4 files that browsers play; 'qt  ' (QuickTime .mov) is deliberately not one of them
const HM_MP4_BRANDS = ['isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'dash', 'M4V ', 'mmp4', 'MSNV'];
// Names this module gives its files (file name only, directly in assets/bg/)
const HM_GENERATED_VIDEO = '/^hero_video_[0-9a-f]{12}\.(mp4|webm)$/D';
const HM_GENERATED_POSTER = '/^hero_poster_[0-9a-f]{12}\.(png|jpg|gif|webp|svg|ico)$/D';
const HM_VIDEO_MAX_MB_DEFAULT = 30;
const HM_FOLDER = 'bg';
const HM_TYPE_ERROR = 'Hanya video MP4 atau WebM yang diizinkan.';
const HM_EMPTY_ERROR = 'File video kosong.';
const HM_ABORTED_ERROR = 'Upload video terputus. Silakan coba lagi.';
const HM_DATA_VIDEO_ERROR = 'Video harus diunggah lewat upload_hero_video.';
// JSON / multipart is not a raw file: refused before reading anything
const HM_NOT_RAW_BODY = '#^\s*(application/([\w.+-]*\+)?json|multipart/form-data)\b#i';

// Runs upload_hero_video (POST only; a GET falls through to api.php's "Invalid action", like server.js)
function handle_hero_media_action(mysqli $conn, string $action, array $input, ?array $user): bool {
    if ($action !== 'upload_hero_video' || ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') return false;
    echo json_encode(["success" => true, "url" => hm_store_video()]);
    return true;
}

// Video type from the first bytes, or null: MP4 (ftyp box with an allowed major brand) or WebM (EBML header whose
// DocType "webm" appears in the first 64 bytes; plain Matroska is refused). Content-Type and file name are never used.
function hm_sniff_video($bin): ?array {
    if (!is_string($bin)) return null;
    if (strlen($bin) >= 12 && substr($bin, 4, 4) === 'ftyp') {
        return in_array(substr($bin, 8, 4), HM_MP4_BRANDS, true) ? ['ext' => 'mp4', 'mime' => 'video/mp4'] : null;
    }
    if (strlen($bin) >= 4 && strncmp($bin, "\x1A\x45\xDF\xA3", 4) === 0 && strpos(substr($bin, 0, 64), 'webm') !== false) {
        return ['ext' => 'webm', 'mime' => 'video/webm'];
    }
    return null;
}

// UPLOAD_MAX_VIDEO_MB as configured (default 30), for the message; the byte limit comes from upload_limit_bytes()
function hm_video_limit_mb() {
    $mb = (float)env_value('UPLOAD_MAX_VIDEO_MB', (string)HM_VIDEO_MAX_MB_DEFAULT);
    return $mb > 0 ? $mb : HM_VIDEO_MAX_MB_DEFAULT;
}

function hm_too_large(): ApiError {
    return new ApiError('Ukuran video maksimal ' . hm_video_limit_mb() . ' MB.', 413);
}

// Streams the request body into public/assets/bg/ and returns the stored path
function hm_store_video(): string {
    $type = (string)($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
    if (preg_match(HM_NOT_RAW_BODY, $type)) throw new ApiError(HM_TYPE_ERROR);
    $max = upload_limit_bytes('UPLOAD_MAX_VIDEO_MB', HM_VIDEO_MAX_MB_DEFAULT);
    $declared = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    // Announced size over the limit: refused without reading the body
    if ($declared > $max) throw hm_too_large();

    $folder = public_dir() . '/assets/' . HM_FOLDER;
    if (!is_dir($folder) && !mkdir($folder, 0755, true)) throw new RuntimeException("Cannot create upload folder $folder");
    // Dot file until it is checked: the web server refuses dot files (deploy/cpanel/htaccess, nginx.conf)
    $tmp = $folder . '/.hero_video_' . bin2hex(random_bytes(6)) . '.part';
    $in = fopen('php://input', 'rb');
    $out = $in ? fopen($tmp, 'xb') : false;
    try {
        if (!$in || !$out) throw new RuntimeException("Cannot stream the upload into $tmp");
        // At most one byte over the limit is copied: enough to tell "too large" without storing more
        $copied = stream_copy_to_stream($in, $out, $max + 1);
        fclose($out);
        $out = null;
        if ($copied === false) throw new RuntimeException('Cannot read the uploaded video');
        // Body announced but empty: PHP dropped it because it exceeds post_max_size
        if ($copied === 0) throw $declared > 0 ? new ApiError('Ukuran video melebihi batas server.', 413) : new ApiError(HM_EMPTY_ERROR);
        if ($copied > $max) throw hm_too_large();
        if ($declared > 0 && $copied < $declared) throw new ApiError(HM_ABORTED_ERROR);
        $video = hm_sniff_video((string)file_get_contents($tmp, false, null, 0, 64));
        if (!$video) throw new ApiError(HM_TYPE_ERROR);
        $name = 'hero_video_' . bin2hex(random_bytes(6)) . '.' . $video['ext'];
        if (!rename($tmp, $folder . '/' . $name)) throw new RuntimeException("Cannot store upload $folder/$name");
        $tmp = null;
        return '/assets/' . HM_FOLDER . '/' . $name;
    } finally {
        if ($out) fclose($out);
        if ($in) fclose($in);
        if ($tmp !== null && is_file($tmp)) @unlink($tmp);
    }
}

// ── update_settings ──

// hero_bg_mode as stored: one of HM_BG_MODES, anything else (missing, empty, unknown, not a string) → 'default'
function hm_bg_mode($value): string {
    return (is_string($value) && in_array($value, HM_BG_MODES, true)) ? $value : 'default';
}

function hm_is_data_uri($value): bool {
    return is_string($value) && (bool)preg_match('/^\s*data:/i', $value);
}

// Text link: not a string → '', javascript:/vbscript:/data: → '' (safe_link)
function hm_link($value): string {
    return is_string($value) ? (string)safe_link($value) : '';
}

// Videos only come from upload_hero_video; leading control characters are ignored by browsers in a URL scheme
function hm_video_link($value): string {
    if (is_string($value) && preg_match('/^[\s\x00-\x1f]*data:/i', $value)) throw new ApiError(HM_DATA_VIDEO_ERROR);
    return hm_link($value);
}

// The file name of a file this module stored (/assets/bg/<name matching $pattern>), or null for anything else:
// other folders, sub folders, seed images, URLs (S3 uploads from the Node backend)
function hm_generated_name($path, string $pattern): ?string {
    $prefix = '/assets/' . HM_FOLDER . '/';
    if (!is_string($path) || strpos($path, $prefix) !== 0) return null;
    $name = substr($path, strlen($prefix));
    return preg_match($pattern, $name) ? $name : null;
}

// Removed images are not deleted (same as server.js): the folder also holds files committed to the repo, and every
// settings save resends this list
function hm_hero_images($value) {
    $images = is_array($value) ? $value : json_decode((string)(is_string($value) ? $value : ''), true);
    if (!is_array($images)) return $value;
    $stored = [];
    foreach ($images as $image) {
        if (is_string($image)) $stored[] = save_base64_asset($image, HM_FOLDER, 'hero');
    }
    return json_encode($stored);
}

// Normalizes the hero keys of an update_settings payload in place, before anything is saved: hero_bg_mode → one of
// HM_BG_MODES, hero_bg_video → a link (a data: URI is refused with 400), hero_bg_video_poster → a new data: image is
// stored as /assets/bg/hero_poster_<hex>.<ext>, other values pass the link check, hero_images → stored paths.
// Keys that were not sent stay absent. Returns a function to call after the save: it deletes the generated files the
// new values replaced.
function hero_media_prepare_settings(mysqli $conn, array &$settings): callable {
    $has = function ($key) use (&$settings) { return array_key_exists($key, $settings); };

    // Everything that can refuse the save runs before the first upload, so a refused save stores no files
    if ($has('hero_bg_video')) $settings['hero_bg_video'] = hm_video_link($settings['hero_bg_video']);
    if ($has('hero_bg_mode')) $settings['hero_bg_mode'] = hm_bg_mode($settings['hero_bg_mode']);
    $poster = $has('hero_bg_video_poster') ? $settings['hero_bg_video_poster'] : null;
    // New poster: images only, UPLOAD_MAX_IMAGE_MB (ApiError 400 otherwise)
    if (hm_is_data_uri($poster)) parse_upload(trim($poster), false);
    $previous = [];
    if ($has('hero_bg_video') || $has('hero_bg_video_poster')) {
        foreach (db_all($conn, "SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN ('hero_bg_video', 'hero_bg_video_poster')") as $row) {
            $previous[$row['setting_key']] = $row['setting_value'];
        }
    }

    if ($has('hero_images')) $settings['hero_images'] = hm_hero_images($settings['hero_images']);
    if ($has('hero_bg_video_poster')) {
        $settings['hero_bg_video_poster'] = hm_is_data_uri($poster) ? (string)save_base64_asset($poster, HM_FOLDER, 'hero_poster') : hm_link($poster);
    }

    $replaced = [];
    foreach (['hero_bg_video' => HM_GENERATED_VIDEO, 'hero_bg_video_poster' => HM_GENERATED_POSTER] as $key => $pattern) {
        $old = $previous[$key] ?? null;
        if ($has($key) && hm_generated_name($old, $pattern) !== null && $old !== $settings[$key]) $replaced[] = $old;
    }
    return function () use ($replaced) {
        // delete_local_asset: basename + realpath containment inside public/assets/bg/
        foreach ($replaced as $path) delete_local_asset($path, HM_FOLDER);
    };
}
