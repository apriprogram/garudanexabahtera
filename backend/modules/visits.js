// Visit sources for track_visit and get_visitor_details in backend/server.js (docs/platform/SEO-PLAN.md §5.9 step 2).
// backend/modules/visits.php implements the same for backend/api.php: keep both identical (validation, groups,
// response shape). Tests: __tests__/backend/visit-sources.test.ts runs both modules on the same cases.
//
// track_visit stores three columns of visitor_logs (migration 2026-10-23_010) and nothing else about the source:
//   referrer_host  host only: lowercase, no scheme, path, query, port or leading "www."; a full URL is cut down to
//                  its host, anything that is not a plain host name is dropped (NULL)
//   landing_path   path of the first page of the session, query string and fragment removed, max 255 characters
//   utm_source     utm_source of that page only (lowercase, [a-z0-9._-], max 100 characters)
// get_visitor_details adds `sources`: visits of the last SOURCE_DAYS days grouped as SOURCE_LABELS, or null while
// the columns do not exist yet (migration not run). Only rows that carry a landing_path count: older rows (and old
// cached frontends) never sent a source, so they are neither "langsung" nor anything else.

export const SOURCE_DAYS = 30;
// Fixed order of the readout; 'langsung' = no referrer and no utm_source
export const SOURCE_LABELS = [
  'chatgpt.com', 'perplexity.ai', 'gemini.google.com', 'copilot.microsoft.com', 'bing.com', 'google.*', 'lainnya', 'langsung',
];
const HOST_MAX = 253;
const PATH_MAX = 255;
const UTM_MAX = 100;
// MySQL/MariaDB "Unknown column": the 010 columns are missing
const UNKNOWN_COLUMN = 'ER_BAD_FIELD_ERROR';

// PHP's trim() characters and an ASCII-only lowercase (PHP 8.2+ strtolower), not String#trim/toLowerCase: those
// also touch Unicode characters, so the result could differ from visits.php
const trimPhp = (value) => value.replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');
const lowerAscii = (value) => value.replace(/[A-Z]/g, (c) => c.toLowerCase());
const clean = (value) => lowerAscii(trimPhp(value));

export function referrerHost(value) {
  if (typeof value !== 'string') return null;
  let v = clean(value);
  const scheme = v.indexOf('://');
  if (scheme !== -1) v = v.slice(scheme + 3);
  v = v.split(/[/?#]/)[0];
  const at = v.lastIndexOf('@');
  if (at !== -1) v = v.slice(at + 1);
  v = v.replace(/:[0-9]*$/, '');
  v = v.replace(/\.+$/, '');
  if (v.startsWith('www.')) v = v.slice(4);
  if (v === '' || v.length > HOST_MAX) return null;
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(v) || v.includes('..')) return null;
  return v;
}

export function landingPath(value) {
  if (typeof value !== 'string') return null;
  let v = trimPhp(value);
  v = v.split(/[?#]/)[0];
  v = v.slice(0, PATH_MAX);
  // RFC 3986 path characters (location.pathname is already percent-encoded)
  if (!/^\/[A-Za-z0-9\-._~!$&'()*+,;=:@%/]*$/.test(v)) return null;
  return v;
}

export function utmSource(value) {
  if (typeof value !== 'string') return null;
  const v = clean(value).slice(0, UTM_MAX);
  if (!/^[a-z0-9._-]+$/.test(v)) return null;
  return v;
}

/** The three visitor_logs columns from the track_visit input (keys referrer_host, landing_path, utm_source). */
export function visitSourceFields(input) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    referrer_host: referrerHost(source.referrer_host),
    landing_path: landingPath(source.landing_path),
    utm_source: utmSource(source.utm_source),
  };
}

// Group of one normalized host or utm_source value, null when it is none of the named sources
function namedGroup(name) {
  if (name === null || name === undefined || name === '') return null;
  if (/(^|\.)chatgpt\.com$/.test(name) || name === 'chat.openai.com' || name === 'chatgpt') return 'chatgpt.com';
  if (/(^|\.)perplexity\.ai$/.test(name) || name === 'perplexity') return 'perplexity.ai';
  if (name === 'gemini.google.com' || name === 'bard.google.com' || name === 'gemini') return 'gemini.google.com';
  if (/(^|\.)copilot\.microsoft\.com$/.test(name) || name === 'copilot') return 'copilot.microsoft.com';
  if (/(^|\.)bing\.com$/.test(name) || name === 'bing') return 'bing.com';
  // Google Search on any country domain (google.com, google.co.id, …) and the Android Google app
  if (/^google\.(com?\.)?[a-z]{2,3}$/.test(name) || name === 'com.google.android.googlequicksearchbox' || name === 'google') {
    return 'google.*';
  }
  return null;
}

/** Readout group of one visit: the referrer first, then utm_source (ChatGPT adds utm_source=chatgpt.com). */
export function visitSourceGroup(host, utm) {
  const group = namedGroup(host) ?? namedGroup(utm);
  if (group !== null) return group;
  return (host !== null && host !== undefined && host !== '') || (utm !== null && utm !== undefined && utm !== '') ? 'lainnya' : 'langsung';
}

/** Counts per group in SOURCE_LABELS order from rows {referrer_host, utm_source, cnt}. */
export function groupCounts(rows) {
  const counts = new Map(SOURCE_LABELS.map((label) => [label, 0]));
  for (const row of rows) {
    const label = visitSourceGroup(row.referrer_host ?? null, row.utm_source ?? null);
    counts.set(label, counts.get(label) + (Number.parseInt(row.cnt, 10) || 0));
  }
  return [...counts].map(([label, value]) => ({ label, value }));
}

/** INSERT of one visitor_logs row; without the 010 columns (migration not run yet) the row is stored without them. */
export async function logVisit(pool, base, source) {
  try {
    await pool.query(
      `INSERT INTO visitor_logs (ip_address, user_agent, device, browser, os, country, referrer_host, landing_path, utm_source, visited_at)
       VALUES (?, ?, ?, ?, ?, 'Unknown', ?, ?, ?, NOW())`,
      [...base, source.referrer_host, source.landing_path, source.utm_source]
    );
  } catch (err) {
    if (err?.code !== UNKNOWN_COLUMN) throw err;
    await pool.query(
      `INSERT INTO visitor_logs (ip_address, user_agent, device, browser, os, country, visited_at)
       VALUES (?, ?, ?, ?, ?, 'Unknown', NOW())`,
      base
    );
  }
}

/** `sources` of get_visitor_details: [{label, value}] for the last SOURCE_DAYS days, null without the columns. */
export async function visitSources(pool) {
  let rows;
  try {
    [rows] = await pool.query(
      `SELECT referrer_host, utm_source, COUNT(*) AS cnt FROM visitor_logs
       WHERE landing_path IS NOT NULL AND visited_at >= DATE_SUB(NOW(), INTERVAL ${SOURCE_DAYS} DAY)
       GROUP BY referrer_host, utm_source`
    );
  } catch (err) {
    if (err?.code !== UNKNOWN_COLUMN) throw err;
    return null;
  }
  return groupCounts(rows);
}
