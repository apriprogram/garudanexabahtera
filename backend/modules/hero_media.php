<?php
// Hero background of the public home page (table hero_settings) for backend/api.php. backend/modules/hero_media.js
// implements the same for the Node backend: keep both identical (action names, file signatures, limits, generated
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
// → {success: true, url}; failure → HTTP 400/413 + {error}.
// get_hero_media_limits (GET or POST, staff token) → {success: true, video_max_mb, max_images} for the admin page.
// api.php calls handle_hero_media_action() after the access check (authorize_request); both actions are in none of
// the lists, so the default staff rule applies.
//
// update_settings: api.php calls hero_media_prepare_settings() before anything is saved. It normalizes the keys above,
// refuses a stale tab (hero_media_base, 409) and stores new posters/slides, and returns a function to call once the
// request is over: after a successful save it runs the garbage-collect sweep, after a failure it removes the files
// this request stored. Saving never deletes the file it replaces right away: another tab may still show (and save)
// it. The sweep deletes only names this module generates (hero_video_<hex>, hero_poster_<hex> directly in
// public/assets/bg/) that the stored settings do not use and that are older than a day; seed images, slides and
// other uploads in that folder stay.
// Helpers used from api.php: ApiError, db_all, env_value, upload_limit_bytes, public_dir, parse_upload, sniff_image,
// safe_link, delete_local_asset.

const HM_BG_MODES = ['default', 'image', 'video'];
// ISO-BMFF major brands of MP4 files that browsers play; 'qt  ' (QuickTime .mov) is deliberately not one of them
const HM_MP4_BRANDS = ['isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'dash', 'M4V ', 'mmp4', 'MSNV'];
// Names this module gives its files (file name only, directly in assets/bg/); the sweep deletes nothing else
const HM_GENERATED_VIDEO = '/^hero_video_[0-9a-f]{12}\.(mp4|webm)$/D';
const HM_GENERATED_POSTER = '/^hero_poster_[0-9a-f]{12}\.(jpg|png|webp)$/D';
// Temp file of an upload in progress (hm_store_video)
const HM_TEMP_VIDEO = '/^\.hero_video_[0-9a-f]{12}\.part$/D';
// An unused generated file is kept this long (a tab may still be about to save it); a temp file this long
const HM_UNUSED_SECONDS = 86400;
const HM_TEMP_SECONDS = 3600;
// Posters and new slides are shown as a full-screen background: raster images only (no SVG, no ICO)
const HM_POSTER_EXTS = ['jpg', 'png', 'webp'];
const HM_IMAGE_EXTS = ['jpg', 'png', 'webp', 'gif'];
// Slides the home page shows at most (HERO_MAX_IMAGES in src/components/sections/hero/heroBgConfig.ts)
const HM_MAX_IMAGES = 12;
const HM_VIDEO_MAX_MB_DEFAULT = 30;
const HM_FOLDER = 'bg';
const HM_TYPE_ERROR = 'Hanya video MP4 atau WebM yang diizinkan.';
const HM_EMPTY_ERROR = 'File video kosong.';
const HM_ABORTED_ERROR = 'Upload video terputus. Silakan coba lagi.';
const HM_DATA_VIDEO_ERROR = 'Video harus diunggah lewat upload_hero_video.';
const HM_RASTER_ERROR = 'Gambar latar dan sampul harus JPG, PNG, atau WEBP.';
const HM_STALE_ERROR = 'Latar hero sudah diubah di tab atau perangkat lain. Muat ulang halaman, lalu simpan lagi.';
// JSON / multipart is not a raw file: refused before reading anything
const HM_NOT_RAW_BODY = '#^\s*(application/([\w.+-]*\+)?json|multipart/form-data)\b#i';
// Stored video/poster (same query as server.js)
const HM_STORED_SQL = "SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN ('hero_bg_video', 'hero_bg_video_poster')";
// Settings that can point to a file update_settings stored
const HM_SAVED_FILES_SQL = "SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN ('hero_bg_video_poster', 'hero_images')";

// Runs upload_hero_video (POST only; a GET falls through to api.php's "Invalid action", like server.js) and
// get_hero_media_limits
function handle_hero_media_action(mysqli $conn, string $action, array $input, ?array $user): bool {
    if ($action === 'get_hero_media_limits') {
        echo json_encode(["success" => true, "video_max_mb" => hm_video_limit_whole_mb(), "max_images" => HM_MAX_IMAGES]);
        return true;
    }
    if ($action !== 'upload_hero_video' || ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') return false;
    echo json_encode(["success" => true, "url" => hm_store_video()]);
    // After the reply is written; the sweep never changes it
    hm_sweep($conn);
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

// The limit in whole MB for get_hero_media_limits: rounded down (the admin page never allows more than the server),
// at least 1
function hm_video_limit_whole_mb(): int {
    return max(1, (int)floor(hm_video_limit_mb()));
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

// A new poster or slide (data URI) → [content, ext]. The type comes from the first bytes and must be one of $exts,
// so SVG, ICO and anything that is not an image get the same message; parse_upload() then checks the rest
// (size limit, empty file). Nothing is written here.
function hm_raster_image(string $dataUri, array $exts): array {
    $dataUri = trim($dataUri);
    if (preg_match('/^data:[^,]*?;base64,/i', $dataUri, $m)) {
        $head = (string)base64_decode(substr($dataUri, strlen($m[0]), 64));
        if (!in_array(sniff_image($head), $exts, true)) throw new ApiError(HM_RASTER_ERROR);
    }
    return parse_upload($dataUri, false);
}

// hero_images as a list of links and decoded new images ([content, ext]), or null when it is not a JSON array (then
// it is saved as sent). Non-strings are dropped; removed images are not deleted (same as server.js): every settings
// save resends this list and the folder also holds files committed to the repo.
function hm_hero_images($value): ?array {
    $images = is_array($value) ? $value : json_decode(is_string($value) ? $value : '', true);
    if (!is_array($images)) return null;
    $list = [];
    foreach ($images as $image) {
        if (is_string($image)) $list[] = hm_is_data_uri($image) ? hm_raster_image($image, HM_IMAGE_EXTS) : hm_link($image);
    }
    return $list;
}

// Current hero_bg_video / hero_bg_video_poster; a missing row counts as ''
function hm_stored(mysqli $conn): array {
    $stored = ['hero_bg_video' => '', 'hero_bg_video_poster' => ''];
    foreach (db_all($conn, HM_STORED_SQL) as $row) $stored[$row['setting_key']] = (string)$row['setting_value'];
    return $stored;
}

// 409 before anything is written when the save would undo or break another save:
// - stale tab: $base is the hero_media_base the admin page sent, the video/poster it loaded; a changed key whose
//   loaded value is no longer the stored one was changed elsewhere in the meantime
// - a changed link to a generated file that no longer exists (the sweep removed an old upload)
function hm_check_media(mysqli $conn, array $settings, bool $newPoster, $base): void {
    $stored = hm_stored($conn);
    $base = is_array($base) ? $base : [];
    foreach (['hero_bg_video' => 'video', 'hero_bg_video_poster' => 'poster'] as $key => $loaded) {
        if (array_key_exists($key, $settings) && is_string($base[$loaded] ?? null) && $base[$loaded] !== $stored[$key]) {
            throw new ApiError(HM_STALE_ERROR, 409);
        }
    }
    foreach (['hero_bg_video' => HM_GENERATED_VIDEO, 'hero_bg_video_poster' => HM_GENERATED_POSTER] as $key => $pattern) {
        // A new data: poster is stored below; '' (removal) is always allowed
        if (!array_key_exists($key, $settings) || ($key === 'hero_bg_video_poster' && $newPoster)) continue;
        $value = $settings[$key];
        if ($value === '' || $value === $stored[$key]) continue;
        $name = hm_generated_name($value, $pattern);
        if ($name !== null && !is_file(public_dir() . '/assets/' . HM_FOLDER . '/' . $name)) throw new ApiError(HM_STALE_ERROR, 409);
    }
}

// Writes a decoded image into public/assets/bg/ as <stem>_<12 hex>.<ext>; the path is recorded in $written first,
// so a half-written file is removed too
function hm_write_image(array $image, string $stem, array &$written): string {
    [$content, $ext] = $image;
    $folder = public_dir() . '/assets/' . HM_FOLDER;
    if (!is_dir($folder) && !mkdir($folder, 0755, true)) throw new RuntimeException("Cannot create upload folder $folder");
    $path = '/assets/' . HM_FOLDER . '/' . $stem . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
    $written[] = $path;
    if (file_put_contents(public_dir() . $path, $content) === false) throw new RuntimeException("Cannot write upload $path");
    return $path;
}

// Normalizes the hero keys of an update_settings payload in place, before anything is saved: hero_bg_mode → one of
// HM_BG_MODES, hero_bg_video → a link (a data: URI is refused with 400), hero_bg_video_poster → a new data: image is
// stored as /assets/bg/hero_poster_<hex>.<ext>, other values pass the link check, hero_images → stored paths.
// Keys that were not sent stay absent. $base: hero_media_base of the request (see hm_check_media), null = no check.
// Returns function (bool $saved): call it once the request is over, true after a successful save (garbage-collect
// sweep), false when the request failed after this (removes the files stored here that no saved setting uses).
function hero_media_prepare_settings(mysqli $conn, array &$settings, $base = null): callable {
    $has = function ($key) use (&$settings) { return array_key_exists($key, $settings); };

    // Everything that can refuse the hero values runs before the first file is written: links and mode, every new
    // image decoded and checked, then the stale-tab and existence checks against the stored values
    if ($has('hero_bg_video')) $settings['hero_bg_video'] = hm_video_link($settings['hero_bg_video']);
    if ($has('hero_bg_mode')) $settings['hero_bg_mode'] = hm_bg_mode($settings['hero_bg_mode']);
    $poster = null;
    if ($has('hero_bg_video_poster')) {
        if (hm_is_data_uri($settings['hero_bg_video_poster'])) $poster = hm_raster_image($settings['hero_bg_video_poster'], HM_POSTER_EXTS);
        else $settings['hero_bg_video_poster'] = hm_link($settings['hero_bg_video_poster']);
    }
    $images = $has('hero_images') ? hm_hero_images($settings['hero_images']) : null;
    if ($has('hero_bg_video') || $has('hero_bg_video_poster')) hm_check_media($conn, $settings, $poster !== null, $base);

    $written = [];
    try {
        if ($images !== null) {
            foreach ($images as &$image) {
                if (is_array($image)) $image = hm_write_image($image, 'hero', $written);
            }
            unset($image);
            $settings['hero_images'] = json_encode($images);
        }
        if ($poster !== null) $settings['hero_bg_video_poster'] = hm_write_image($poster, 'hero_poster', $written);
    } catch (Throwable $e) {
        foreach ($written as $path) delete_local_asset($path, HM_FOLDER);
        throw $e;
    }
    return function (bool $saved) use ($conn, $written) {
        if ($saved) hm_sweep($conn);
        else hm_discard($conn, $written);
    };
}

// The request failed after hero_media_prepare_settings() stored files: removes them, except a file a setting that
// did get saved points to (the settings are saved one by one). Errors are logged, the request already failed.
function hm_discard(mysqli $conn, array $written): void {
    if (!$written) return;
    try {
        $used = [];
        foreach (db_all($conn, HM_SAVED_FILES_SQL) as $row) {
            $list = $row['setting_key'] === 'hero_images' ? json_decode((string)$row['setting_value'], true) : [$row['setting_value']];
            if (is_array($list)) $used = array_merge($used, $list);
        }
        foreach ($written as $path) {
            if (!in_array($path, $used, true)) delete_local_asset($path, HM_FOLDER);
        }
    } catch (Throwable $e) {
        error_log('[hero_media] Cannot remove the files of a failed save: ' . $e);
    }
}

// Garbage-collect sweep, after every successful update_settings and upload_hero_video: deletes the generated videos
// and posters in public/assets/bg/ that the stored settings do not use and that are older than HM_UNUSED_SECONDS
// (uploaded but never saved, or replaced by a later save), and temp files of broken uploads older than
// HM_TEMP_SECONDS. Never any other file. Errors are logged and never fail the request.
function hm_sweep(mysqli $conn): void {
    try {
        $stored = hm_stored($conn);
        $used = [hm_generated_name($stored['hero_bg_video'], HM_GENERATED_VIDEO), hm_generated_name($stored['hero_bg_video_poster'], HM_GENERATED_POSTER)];
        $folder = public_dir() . '/assets/' . HM_FOLDER;
        $now = time();
        foreach ((is_dir($folder) ? scandir($folder) : false) ?: [] as $name) {
            if (preg_match(HM_TEMP_VIDEO, $name)) {
                $age = HM_TEMP_SECONDS;
            } elseif ((preg_match(HM_GENERATED_VIDEO, $name) || preg_match(HM_GENERATED_POSTER, $name)) && !in_array($name, $used, true)) {
                $age = HM_UNUSED_SECONDS;
            } else {
                continue;
            }
            $path = $folder . '/' . $name;
            $modified = (is_file($path) && !is_link($path)) ? filemtime($path) : false;
            if ($modified !== false && $modified < $now - $age && !@unlink($path)) error_log("[hero_media] Cannot delete $path");
        }
    } catch (Throwable $e) {
        error_log('[hero_media] Sweep failed: ' . $e);
    }
}
