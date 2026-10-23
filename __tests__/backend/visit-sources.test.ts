// @vitest-environment node
// Visit sources (docs/platform/SEO-PLAN.md §5.9 step 2): track_visit stores the referrer host, landing path and
// utm_source of the first page of a session, validated and cut down (no full referrer URL, no query string beyond
// utm_source), and get_visitor_details groups the last 30 days as chatgpt.com, perplexity.ai, gemini.google.com,
// copilot.microsoft.com, bing.com, google.*, lainnya, langsung. backend/modules/visits.js (Node) and
// backend/modules/visits.php (PHP, run in the CLI with a stubbed database) must answer the same; the PHP half is
// skipped without `php`.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  SOURCE_LABELS,
  groupCounts,
  landingPath,
  logVisit,
  referrerHost,
  utmSource,
  visitSourceFields,
  visitSourceGroup,
  visitSources,
} from '../../backend/modules/visits.js';

const ROOT = resolve(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8').replace(/\r\n/g, '\n');

type Fields = { referrer_host: string | null; landing_path: string | null; utm_source: string | null };

const LONG_PATH = `/template/${'a'.repeat(300)}`;
// 253 characters, the longest host name; one more is refused
const HOST_253 = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`;

/** [value, referrer_host, landing_path, utm_source] — the same value through all three validators. */
const VALUE_CASES: [unknown, string | null, string | null, string | null][] = [
  ['chatgpt.com', 'chatgpt.com', null, 'chatgpt.com'],
  ['https://www.Google.co.id/search?q=template+website', 'google.co.id', null, null],
  ['  ChatGPT.com ', 'chatgpt.com', null, 'chatgpt.com'],
  ['user:pass@Perplexity.AI:443/x', 'perplexity.ai', null, null],
  ['android-app://com.google.android.googlequicksearchbox/', 'com.google.android.googlequicksearchbox', null, null],
  ['bing.com.', 'bing.com', null, 'bing.com.'],
  ['localhost:5173', 'localhost', null, null],
  ['[::1]:5173', null, null, null],
  ['www.', 'www', null, 'www.'],
  ['', null, null, null],
  ['   ', null, null, null],
  ['exa mple.com', null, null, null],
  ['-bad.com', null, null, '-bad.com'],
  ['a..b', null, null, 'a..b'],
  ['a.com\n', 'a.com', null, 'a.com'],
  ['a.com\n/x', null, null, null],
  ['ÄBC.com', null, null, null],
  ['K.com', null, null, null], // Kelvin sign: String#toLowerCase would turn it into "k"
  ['é', null, null, null],
  [HOST_253, HOST_253, null, HOST_253.slice(0, 100)],
  [`x${HOST_253}`, null, null, `x${HOST_253}`.slice(0, 100)],
  ['/', null, '/', null],
  ['/template/aura-studio', null, '/template/aura-studio', null],
  ['  /harga  ', null, '/harga', null],
  ['/template?utm_source=chatgpt.com#faq', null, '/template', null],
  ['/akun/pesanan/GN-20261023-0001?order_id=x&status_code=200', null, '/akun/pesanan/GN-20261023-0001', null],
  ['/%E2%9C%93', null, '/%E2%9C%93', null],
  ['/a b', null, null, null],
  ['/é', null, null, null],
  ['/a\nb', null, null, null],
  ['/a\n', null, '/a', null],
  ['template', 'template', null, 'template'],
  [LONG_PATH, null, LONG_PATH.slice(0, 255), null],
  ['newsletter_okt-2026', null, null, 'newsletter_okt-2026'],
  ['google ads', null, null, null],
  ['a+b', null, null, null],
  ['x'.repeat(150), 'x'.repeat(150), null, 'x'.repeat(100)],
  [['chatgpt.com'], null, null, null],
  [{ host: 'chatgpt.com' }, null, null, null],
  [123, null, null, null],
  [true, null, null, null],
  [null, null, null, null],
];

/** [referrer_host, utm_source, group] — both already normalized, as stored. */
const GROUP_CASES: [string | null, string | null, string][] = [
  ['chatgpt.com', null, 'chatgpt.com'],
  ['chat.openai.com', null, 'chatgpt.com'],
  [null, 'chatgpt.com', 'chatgpt.com'],
  ['l.facebook.com', 'chatgpt.com', 'chatgpt.com'],
  ['chatgpt.com.evil.net', null, 'lainnya'],
  ['perplexity.ai', null, 'perplexity.ai'],
  [null, 'perplexity', 'perplexity.ai'],
  ['gemini.google.com', null, 'gemini.google.com'],
  ['bard.google.com', null, 'gemini.google.com'],
  ['copilot.microsoft.com', null, 'copilot.microsoft.com'],
  ['bing.com', null, 'bing.com'],
  ['cn.bing.com', null, 'bing.com'],
  ['notbing.com', null, 'lainnya'],
  ['google.com', null, 'google.*'],
  ['google.co.id', null, 'google.*'],
  ['google.com.sg', null, 'google.*'],
  ['com.google.android.googlequicksearchbox', null, 'google.*'],
  [null, 'google', 'google.*'],
  ['news.google.com', null, 'lainnya'],
  ['mail.google.com', null, 'lainnya'],
  ['googleusercontent.com', null, 'lainnya'],
  ['instagram.com', null, 'lainnya'],
  [null, 'newsletter', 'lainnya'],
  [null, null, 'langsung'],
  ['', '', 'langsung'],
];

const COUNT_ROWS = [
  { referrer_host: 'chatgpt.com', utm_source: 'chatgpt.com', cnt: 4 },
  { referrer_host: null, utm_source: 'chatgpt.com', cnt: '2' },
  { referrer_host: 'google.co.id', utm_source: null, cnt: 7 },
  { referrer_host: 'google.com', utm_source: null, cnt: 3 },
  { referrer_host: 'instagram.com', utm_source: null, cnt: 1 },
  { referrer_host: null, utm_source: null, cnt: 10 },
];
const COUNTS = [
  { label: 'chatgpt.com', value: 6 },
  { label: 'perplexity.ai', value: 0 },
  { label: 'gemini.google.com', value: 0 },
  { label: 'copilot.microsoft.com', value: 0 },
  { label: 'bing.com', value: 0 },
  { label: 'google.*', value: 10 },
  { label: 'lainnya', value: 1 },
  { label: 'langsung', value: 10 },
];

const FIELD_INPUTS: Record<string, unknown>[] = [
  { referrer_host: 'https://chatgpt.com/', landing_path: '/template/aura-studio?utm_source=chatgpt.com', utm_source: 'chatgpt.com' },
  { landing_path: '/' },
  {},
  { referrer_host: ['x'], landing_path: 5, utm_source: { a: 1 } },
];
const FIELDS: Fields[] = [
  { referrer_host: 'chatgpt.com', landing_path: '/template/aura-studio', utm_source: 'chatgpt.com' },
  { referrer_host: null, landing_path: '/', utm_source: null },
  { referrer_host: null, landing_path: null, utm_source: null },
  { referrer_host: null, landing_path: null, utm_source: null },
];

const EXPECTED_VALUES = VALUE_CASES.map(([, host, path, utm]) => [host, path, utm]);
const EXPECTED_GROUPS = GROUP_CASES.map(([, , group]) => group);
const BASE_ROW = ['203.0.113.7', 'Mozilla/5.0', 'Desktop', 'Chrome', 'Windows'];
const SOURCE = { referrer_host: 'google.co.id', landing_path: '/harga', utm_source: null };
const squash = (sql: string) => sql.replace(/\s+/g, ' ').trim();

// ── Node ──

interface DbCall {
  sql: string;
  params: unknown[];
}

/** pool.query stand-in: records every call; `failOn` makes the matching statement throw "Unknown column". */
function fakePool(rows: unknown[], failOn: RegExp | null = null) {
  const calls: DbCall[] = [];
  return {
    calls,
    async query(sql: string, params: unknown[] = []) {
      calls.push({ sql: squash(sql), params });
      if (failOn && failOn.test(sql)) throw Object.assign(new Error("Unknown column 'referrer_host'"), { code: 'ER_BAD_FIELD_ERROR', errno: 1054 });
      return [rows];
    },
  };
}

async function nodeDb() {
  const plain = fakePool([]);
  await logVisit(plain, BASE_ROW, SOURCE);
  const legacy = fakePool([], /referrer_host/);
  await logVisit(legacy, BASE_ROW, SOURCE);
  const counted = fakePool(COUNT_ROWS);
  const sources = await visitSources(counted);
  const missing = fakePool([], /landing_path/);
  const noColumns = await visitSources(missing);
  return { log: plain.calls, legacy: legacy.calls, sources, sourcesSql: counted.calls, noColumns };
}

describe('visit sources (Node)', () => {
  it('validates and cuts down every value', () => {
    expect(VALUE_CASES.map(([value]) => [referrerHost(value), landingPath(value), utmSource(value)])).toEqual(EXPECTED_VALUES);
  });

  it('reads the three fields from the track_visit input', () => {
    expect(FIELD_INPUTS.map(visitSourceFields)).toEqual(FIELDS);
    expect(visitSourceFields(null)).toEqual(FIELDS[2]);
  });

  it('groups a visit by referrer first, then utm_source', () => {
    expect(GROUP_CASES.map(([host, utm]) => visitSourceGroup(host, utm))).toEqual(EXPECTED_GROUPS);
  });

  it('counts per group in a fixed order, zeros included', () => {
    expect(SOURCE_LABELS).toEqual(COUNTS.map((c) => c.label));
    expect(groupCounts(COUNT_ROWS)).toEqual(COUNTS);
  });

  it('logs the source with the visit, and still logs the visit before migration 010', async () => {
    const db = await nodeDb();
    expect(db.log).toHaveLength(1);
    expect(db.log[0].params).toEqual([...BASE_ROW, 'google.co.id', '/harga', null]);
    expect(db.legacy).toHaveLength(2);
    expect(db.legacy[1].sql).not.toMatch(/referrer_host/);
    expect(db.legacy[1].params).toEqual(BASE_ROW);
    expect(db.sources).toEqual(COUNTS);
    expect(db.sourcesSql[0].sql).toMatch(/WHERE landing_path IS NOT NULL AND visited_at >= DATE_SUB\(NOW\(\), INTERVAL 30 DAY\)/);
    expect(db.noColumns).toBeNull();
  });

  it('rethrows other database errors', async () => {
    const pool = {
      async query() {
        throw Object.assign(new Error('gone away'), { code: 'PROTOCOL_CONNECTION_LOST' });
      },
    };
    await expect(logVisit(pool, BASE_ROW, SOURCE)).rejects.toThrow('gone away');
    await expect(visitSources(pool)).rejects.toThrow('gone away');
  });
});

describe('visit sources wiring', () => {
  const API_PHP = read('backend', 'api.php');
  const SERVER_JS = read('backend', 'server.js');

  it('both backends log the source and add `sources` to get_visitor_details', () => {
    expect(API_PHP).toContain("require_once __DIR__ . '/modules/visits.php';");
    expect(API_PHP).toMatch(/visit_log\(\$conn, \[client_ip\(\), \$ua, \$device, \$browser, \$os\], visit_source_fields\(\$input\)\);/);
    expect(API_PHP).toMatch(/"sources" => visit_sources\(\$conn\)/);
    expect(SERVER_JS).toContain("import { logVisit, visitSourceFields, visitSources } from './modules/visits.js';");
    expect(SERVER_JS).toMatch(/await logVisit\(pool, \[ip, ua, device, browser, os\], visitSourceFields\(input\)\);/);
    expect(SERVER_JS).toMatch(/sources: await visitSources\(pool\)/);
    // one get_visitor_details handler in server.js (an unreachable duplicate used to follow the first)
    expect(SERVER_JS.match(/action === 'get_visitor_details'/g)).toHaveLength(1);
  });

  it('schema.sql and migration 010 define the same columns', () => {
    const schema = read('database', 'schema.sql');
    const migration = read('database', 'migrations', '2026-10-23_010_visit_referrer.sql');
    for (const [col, type] of [
      ['referrer_host', 'VARCHAR(255) DEFAULT NULL'],
      ['landing_path', 'VARCHAR(255) DEFAULT NULL'],
      ['utm_source', 'VARCHAR(100) DEFAULT NULL'],
    ]) {
      expect(schema).toMatch(new RegExp(`^  ${col} +${type.replace(/[()]/g, '\\$&')},$`, 'm'));
      expect(migration).toContain(`CALL gn_add_column('visitor_logs', '${col}', "${type}`);
    }
    expect(schema).toContain("('2026-10-23_010', ");
    expect(migration).toMatch(/INSERT IGNORE INTO schema_migrations \(version, description\)\nVALUES \('2026-10-23_010', /);
  });
});

// ── PHP: the real module in the CLI, the database stubbed ──
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo "ok";'], { encoding: 'utf8' }).stdout === 'ok';

const CLI_HARNESS = String.raw`<?php
$GLOBALS['__calls'] = [];
$GLOBALS['__fail'] = null;
$GLOBALS['__rows'] = [];
function db_run($conn, $sql, array $params = []) {
    $GLOBALS['__calls'][] = ['sql' => trim(preg_replace('~\s+~', ' ', $sql)), 'params' => $params];
    if ($GLOBALS['__fail'] && preg_match($GLOBALS['__fail'], $sql)) throw new mysqli_sql_exception("Unknown column 'referrer_host'", 1054);
    return true;
}
function db_all($conn, $sql, array $params = []) {
    db_run($conn, $sql, $params);
    return $GLOBALS['__rows'];
}
require getenv('VISITS_MODULE');

$in = json_decode(stream_get_contents(STDIN), true);
$conn = mysqli_init();
$db = function ($rows, $fail) { $GLOBALS['__calls'] = []; $GLOBALS['__rows'] = $rows; $GLOBALS['__fail'] = $fail; };

$out = ['values' => [], 'fields' => [], 'groups' => []];
foreach ($in['values'] as $v) $out['values'][] = [visit_referrer_host($v), visit_landing_path($v), visit_utm_source($v)];
foreach ($in['fields'] as $f) $out['fields'][] = visit_source_fields($f);
foreach ($in['groups'] as $g) $out['groups'][] = visit_source_group($g[0], $g[1]);
$out['counts'] = visit_group_counts($in['rows']);
$out['labels'] = VISIT_SOURCE_LABELS;

$db([], null); visit_log($conn, $in['base'], $in['source']); $out['log'] = $GLOBALS['__calls'];
$db([], '~referrer_host~'); visit_log($conn, $in['base'], $in['source']); $out['legacy'] = $GLOBALS['__calls'];
$db($in['rows'], null); $out['sources'] = visit_sources($conn); $out['sourcesSql'] = $GLOBALS['__calls'];
$db([], '~landing_path~'); $out['noColumns'] = visit_sources($conn);
echo json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
`;

describe.skipIf(!PHP_AVAILABLE)('visit sources (PHP)', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'gn-visit-sources-php-'));
    writeFileSync(join(dir, 'cli.php'), CLI_HARNESS);
  });
  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('answers exactly like the Node backend, SQL included', async () => {
    // json_encode turns a PHP list into an array and true/false/null stay as they are, so the inputs arrive unchanged
    const input = {
      values: VALUE_CASES.map(([value]) => value),
      fields: FIELD_INPUTS,
      groups: GROUP_CASES.map(([host, utm]) => [host, utm]),
      rows: COUNT_ROWS,
      base: BASE_ROW,
      source: SOURCE,
    };
    const result = spawnSync('php', ['-d', 'display_errors=stderr', join(dir, 'cli.php')], {
      input: JSON.stringify(input),
      encoding: 'utf8',
      env: { ...process.env, VISITS_MODULE: join(ROOT, 'backend', 'modules', 'visits.php') },
    });
    expect(result.stderr).toBe('');
    const out = JSON.parse(result.stdout);
    expect(out.values).toEqual(EXPECTED_VALUES);
    // {} and [] are the same empty PHP array; visit_source_fields only reads the keys
    expect(out.fields).toEqual(FIELDS);
    expect(out.groups).toEqual(EXPECTED_GROUPS);
    expect(out.counts).toEqual(COUNTS);
    expect(out.labels).toEqual(SOURCE_LABELS);

    const node = await nodeDb();
    expect(out.log).toEqual(node.log);
    expect(out.legacy).toEqual(node.legacy);
    expect(out.sources).toEqual(node.sources);
    expect(out.sourcesSql).toEqual(node.sourcesSql);
    expect(out.noColumns).toBeNull();
  });
});
