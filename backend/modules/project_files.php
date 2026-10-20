<?php
// Client project files (project_client.project_files) for backend/api.php. backend/modules/project_files.js
// implements the same action for the Node backend: keep both identical (action name, path rules, headers,
// HTTP status codes and `code` values).
//
// The files live in public/assets/dokumen-client/dokumen/ (save_base64_files(..., 'dokumen-client/dokumen')), but
// the web server refuses direct requests for that folder (deploy/cpanel/htaccess, nginx.conf). Staff download them
// through this action instead: api.php calls handle_project_file_action() after the access check
// (authorize_request), and download_project_file is in none of the action lists, so it needs a staff token
// (admin or user). Project images in dokumen-client/logo/ stay public (homepage, get_public_projects).
//
// download_project_file (GET or POST) {path: "/assets/dokumen-client/dokumen/<file>"} → the file as an attachment;
// failure → HTTP 400 INVALID_PATH / 404 NOT_FOUND + {error, code}.

const PF_FOLDER = 'dokumen-client/dokumen';
const PF_PATH_PREFIX = '/assets/' . PF_FOLDER . '/';
const PF_CONTENT_TYPES = [
    'pdf' => 'application/pdf',
    'doc' => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls' => 'application/vnd.ms-excel',
    'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt' => 'application/vnd.ms-powerpoint',
    'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'odt' => 'application/vnd.oasis.opendocument.text',
    'ods' => 'application/vnd.oasis.opendocument.spreadsheet',
    'odp' => 'application/vnd.oasis.opendocument.presentation',
    'txt' => 'text/plain; charset=utf-8',
    'csv' => 'text/csv; charset=utf-8',
    'rtf' => 'application/rtf',
    'zip' => 'application/zip',
    'rar' => 'application/vnd.rar',
    '7z' => 'application/x-7z-compressed',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'gif' => 'image/gif',
    'webp' => 'image/webp',
    'svg' => 'image/svg+xml',
    'ico' => 'image/x-icon',
];

function handle_project_file_action(mysqli $conn, string $action, array $input, ?array $user): bool {
    if ($action !== 'download_project_file') return false;
    $name = pf_file_name($input['path'] ?? null);
    if ($name === null) throw new ApiError('Path file tidak valid.', 400, 'INVALID_PATH');
    $file = pf_local_file($name);
    if ($file === null) throw new ApiError('File tidak ditemukan.', 404, 'NOT_FOUND');

    foreach (pf_headers($name, filesize($file)) as $header => $value) header("$header: $value");
    while (ob_get_level() > 0) ob_end_clean();
    readfile($file);
    return true;
}

// The file name in a stored path "/assets/dokumen-client/dokumen/<file>", or null for anything else: other
// folders, sub folders, "..", dot files (.htaccess), backslashes, ':' and control characters.
// Old uploads kept the client's name, so spaces, commas and non-ASCII letters are allowed.
function pf_file_name($path) {
    if (!is_string($path) || strlen($path) > 1024 || strpos($path, PF_PATH_PREFIX) !== 0) return null;
    $name = substr($path, strlen(PF_PATH_PREFIX));
    if ($name === '' || strlen($name) > 255 || $name[0] === '.' || preg_match('/[\/\\\\:\x00-\x1f\x7f]/', $name)) return null;
    return $name;
}

// Full path of the file inside public/assets/dokumen-client/dokumen/, or null when it does not exist there.
// realpath() also refuses links that point outside the folder.
function pf_local_file($name) {
    $folder = realpath(public_dir() . '/assets/' . PF_FOLDER);
    $file = $folder ? realpath($folder . DIRECTORY_SEPARATOR . $name) : false;
    return ($file && strpos($file, $folder . DIRECTORY_SEPARATOR) === 0 && is_file($file)) ? $file : null;
}

function pf_content_type($name) {
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    return PF_CONTENT_TYPES[$ext] ?? 'application/octet-stream';
}

// Always a download; filename* (RFC 6266/5987) keeps non-ASCII names, filename is the ASCII fallback
function pf_disposition($name) {
    $ascii = preg_replace('/[^\x20-\x7e]|["\\\\]/', '_', $name);
    return 'attachment; filename="' . $ascii . '"; filename*=UTF-8\'\'' . rawurlencode($name);
}

function pf_headers($name, $size) {
    return [
        'Content-Type' => pf_content_type($name),
        'Content-Length' => (string)$size,
        'Content-Disposition' => pf_disposition($name),
        'Cache-Control' => 'private, no-store',
        // Opened directly, an SVG or text file must not run script on this origin
        'Content-Security-Policy' => "default-src 'none'; sandbox",
        'X-Content-Type-Options' => 'nosniff',
    ];
}
