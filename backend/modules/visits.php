<?php
// Visit sources for track_visit and get_visitor_details in backend/api.php (docs/platform/SEO-PLAN.md §5.9 step 2).
// backend/modules/visits.js implements the same for backend/server.js: keep both identical (validation, groups,
// response shape). Tests: __tests__/backend/visit-sources.test.ts runs this file in the PHP CLI next to the Node module.
//
// track_visit stores three columns of visitor_logs (migration 2026-10-23_010) and nothing else about the source:
//   referrer_host  host only: lowercase, no scheme, path, query, port or leading "www."; a full URL is cut down to
//                  its host, anything that is not a plain host name is dropped (NULL)
//   landing_path   path of the first page of the session, query string and fragment removed, max 255 characters
//   utm_source     utm_source of that page only (lowercase, [a-z0-9._-], max 100 characters)
// get_visitor_details adds `sources`: visits of the last VISIT_SOURCE_DAYS days grouped as VISIT_SOURCE_LABELS, or
// null while the columns do not exist yet (migration not run). Only rows that carry a landing_path count: older rows
// (and old cached frontends) never sent a source, so they are neither "langsung" nor anything else.
//
// Helpers used from api.php: db_run, db_all.

const VISIT_SOURCE_DAYS = 30;
// Fixed order of the readout; 'langsung' = no referrer and no utm_source
const VISIT_SOURCE_LABELS = [
    'chatgpt.com', 'perplexity.ai', 'gemini.google.com', 'copilot.microsoft.com', 'bing.com', 'google.*', 'lainnya', 'langsung',
];
const VISIT_HOST_MAX = 253;
const VISIT_PATH_MAX = 255;
const VISIT_UTM_MAX = 100;
// MySQL/MariaDB "Unknown column": the 010 columns are missing
const VISIT_UNKNOWN_COLUMN = 1054;

// ASCII-only lowercase and PHP's trim() characters, so Node (visits.js) can do exactly the same. Patterns below use
// the D modifier: without it PCRE's $ also matches before a final newline, JavaScript's $ does not.
function visit_clean(string $value): string {
    return strtolower(trim($value, " \t\n\r\0\x0B"));
}

function visit_referrer_host($value): ?string {
    if (!is_string($value)) return null;
    $v = visit_clean($value);
    $scheme = strpos($v, '://');
    if ($scheme !== false) $v = substr($v, $scheme + 3);
    $v = preg_split('~[/?#]~', $v, 2)[0];
    $at = strrpos($v, '@');
    if ($at !== false) $v = substr($v, $at + 1);
    $v = preg_replace('~:[0-9]*$~D', '', $v);
    $v = rtrim($v, '.');
    if (strpos($v, 'www.') === 0) $v = substr($v, 4);
    if ($v === '' || strlen($v) > VISIT_HOST_MAX) return null;
    if (!preg_match('~^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$~D', $v) || strpos($v, '..') !== false) return null;
    return $v;
}

function visit_landing_path($value): ?string {
    if (!is_string($value)) return null;
    $v = trim($value, " \t\n\r\0\x0B");
    $v = preg_split('~[?#]~', $v, 2)[0];
    $v = substr($v, 0, VISIT_PATH_MAX);
    // RFC 3986 path characters (location.pathname is already percent-encoded)
    if (!preg_match('~^/[A-Za-z0-9\-._\~!$&\'()*+,;=:@%/]*$~D', $v)) return null;
    return $v;
}

function visit_utm_source($value): ?string {
    if (!is_string($value)) return null;
    $v = substr(visit_clean($value), 0, VISIT_UTM_MAX);
    if (!preg_match('~^[a-z0-9._-]+$~D', $v)) return null;
    return $v;
}

/** The three visitor_logs columns from the track_visit input (keys referrer_host, landing_path, utm_source). */
function visit_source_fields(array $input): array {
    return [
        'referrer_host' => visit_referrer_host($input['referrer_host'] ?? null),
        'landing_path' => visit_landing_path($input['landing_path'] ?? null),
        'utm_source' => visit_utm_source($input['utm_source'] ?? null),
    ];
}

// Group of one normalized host or utm_source value, null when it is none of the named sources
function visit_named_group(?string $name): ?string {
    if ($name === null || $name === '') return null;
    if (preg_match('~(^|\.)chatgpt\.com$~D', $name) || $name === 'chat.openai.com' || $name === 'chatgpt') return 'chatgpt.com';
    if (preg_match('~(^|\.)perplexity\.ai$~D', $name) || $name === 'perplexity') return 'perplexity.ai';
    if ($name === 'gemini.google.com' || $name === 'bard.google.com' || $name === 'gemini') return 'gemini.google.com';
    if (preg_match('~(^|\.)copilot\.microsoft\.com$~D', $name) || $name === 'copilot') return 'copilot.microsoft.com';
    if (preg_match('~(^|\.)bing\.com$~D', $name) || $name === 'bing') return 'bing.com';
    // Google Search on any country domain (google.com, google.co.id, …) and the Android Google app
    if (preg_match('~^google\.(com?\.)?[a-z]{2,3}$~D', $name) || $name === 'com.google.android.googlequicksearchbox' || $name === 'google') {
        return 'google.*';
    }
    return null;
}

/** Readout group of one visit: the referrer first, then utm_source (ChatGPT adds utm_source=chatgpt.com). */
function visit_source_group(?string $referrerHost, ?string $utmSource): string {
    $group = visit_named_group($referrerHost) ?? visit_named_group($utmSource);
    if ($group !== null) return $group;
    return ($referrerHost !== null && $referrerHost !== '') || ($utmSource !== null && $utmSource !== '') ? 'lainnya' : 'langsung';
}

/** Counts per group in VISIT_SOURCE_LABELS order from rows {referrer_host, utm_source, cnt}. */
function visit_group_counts(array $rows): array {
    $counts = array_fill_keys(VISIT_SOURCE_LABELS, 0);
    foreach ($rows as $row) {
        $counts[visit_source_group($row['referrer_host'] ?? null, $row['utm_source'] ?? null)] += (int)$row['cnt'];
    }
    $items = [];
    foreach ($counts as $label => $value) $items[] = ['label' => $label, 'value' => $value];
    return $items;
}

/** INSERT of one visitor_logs row; without the 010 columns (migration not run yet) the row is stored without them. */
function visit_log(mysqli $conn, array $base, array $source): void {
    try {
        db_run($conn, "INSERT INTO visitor_logs (ip_address, user_agent, device, browser, os, country, referrer_host, landing_path, utm_source, visited_at)
                       VALUES (?, ?, ?, ?, ?, 'Unknown', ?, ?, ?, NOW())",
            array_merge($base, [$source['referrer_host'], $source['landing_path'], $source['utm_source']]));
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() !== VISIT_UNKNOWN_COLUMN) throw $e;
        db_run($conn, "INSERT INTO visitor_logs (ip_address, user_agent, device, browser, os, country, visited_at)
                       VALUES (?, ?, ?, ?, ?, 'Unknown', NOW())", $base);
    }
}

/** `sources` of get_visitor_details: [{label, value}] for the last VISIT_SOURCE_DAYS days, null without the columns. */
function visit_sources(mysqli $conn): ?array {
    try {
        $rows = db_all($conn, "SELECT referrer_host, utm_source, COUNT(*) AS cnt FROM visitor_logs
                               WHERE landing_path IS NOT NULL AND visited_at >= DATE_SUB(NOW(), INTERVAL " . VISIT_SOURCE_DAYS . " DAY)
                               GROUP BY referrer_host, utm_source");
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() !== VISIT_UNKNOWN_COLUMN) throw $e;
        return null;
    }
    return visit_group_counts($rows);
}
