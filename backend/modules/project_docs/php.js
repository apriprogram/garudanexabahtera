// PHP-compatible primitives for the Node pd_* module (entry point and file map: ../project_docs.js). The PHP module
// (../project_docs.php) is the reference: these helpers reproduce the PHP functions it relies on, so both backends
// accept the same input, store the same text and hash the same bytes.
//
// Regular expressions on untrimmed input end in `\n?$`: PHP's `$` (no D modifier) also matches before one final
// newline, so preg_match('/^[0-9]+$/', "5\n") is true there.

/** PHP trim(): only " \t\n\r\0\x0B" (JS trim() also strips \f and Unicode spaces). */
export const phpTrim = (s) => String(s).replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');

/** mb_strlen(): code points, not UTF-16 units. */
export const mbLen = (s) => Array.from(String(s)).length;

/** mb_substr($s, $start, $length) with a non-negative start. */
export const mbSubstr = (s, start, length) => Array.from(String(s)).slice(start, start + length).join('');

/** strtolower() in PHP 8: ASCII letters only. */
export const asciiLower = (s) => String(s).replace(/[A-Z]+/g, (m) => m.toLowerCase());

/**
 * round() to a whole number, half away from zero, after cutting to 15 significant digits like PHP's pre-rounding
 * (1.005 × 1000 = 1004.9999999999999 → 1005). Same function as roundRupiah in src/features/project-docs/engine/format.ts.
 */
export function phpRound(x) {
  const n = Number(x);
  if (!Number.isFinite(n) || n === 0) return 0;
  const r = Math.sign(n) * Math.floor(Number(Math.abs(n).toPrecision(15)) + 0.5);
  return r === 0 ? 0 : r; // no -0
}

const INT64_LIMIT = 2 ** 63;

/**
 * A number as PHP prints it. `json` = json_encode (shortest round-trip digits, exponent from 1e17 / below 1e-4,
 * "1.0e+17"); otherwise the (string) cast (14 significant digits, exponent from 1e14, "1.0E+14"). Whole numbers below
 * 2^63 are treated as PHP ints (json_decode of "1500000" gives an int): plain digits.
 */
export function phpNumberString(n, json = false) {
  if (Number.isInteger(n) && Math.abs(n) < INT64_LIMIT) return BigInt(n).toString();
  // JSON input never holds INF/NAN; json_encode refuses them, the (string) cast spells them
  if (!Number.isFinite(n)) return json ? 'null' : Number.isNaN(n) ? 'NAN' : n > 0 ? 'INF' : '-INF';
  const precision = json ? 17 : 14;
  const [mantissa, exponent] = (json ? Math.abs(n).toExponential() : Math.abs(n).toExponential(13)).split('e');
  const digits = mantissa.replace('.', '').replace(/0+$/, '') || '0';
  const exp = Number(exponent);
  const sign = n < 0 ? '-' : '';
  if (exp < -4 || exp >= precision) {
    return `${sign}${digits[0]}.${digits.slice(1) || '0'}${json ? 'e' : 'E'}${exp < 0 ? '-' : '+'}${Math.abs(exp)}`;
  }
  if (exp < 0) return `${sign}0.${'0'.repeat(-exp - 1)}${digits}`;
  const whole = exp + 1;
  if (digits.length <= whole) return `${sign}${digits}${'0'.repeat(whole - digits.length)}`;
  return `${sign}${digits.slice(0, whole)}.${digits.slice(whole)}`;
}

/** (string)$v for a JSON scalar (null → '', true → '1', false → '', arrays → 'Array'). */
export function phpString(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v === true) return '1';
  if (typeof v === 'number') return phpNumberString(v);
  if (typeof v === 'object') return 'Array';
  return String(v);
}

/** json_encode($s, … JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) without JSON_UNESCAPED_LINE_TERMINATORS. */
const LINE_TERMINATORS = new RegExp(`[${String.fromCharCode(0x2028, 0x2029)}]`, 'g');
const jsonString = (s) => JSON.stringify(s).replace(LINE_TERMINATORS, (c) => `\\u${c.charCodeAt(0).toString(16)}`);

/**
 * pd_json(): json_encode with PD_JSON_FLAGS, byte for byte (number format, U+2028/U+2029 escaped), so stored
 * content, snapshots and size limits match the PHP backend. Objects keep their key order.
 */
export function pdJson(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return jsonString(value);
  if (typeof value === 'number') return phpNumberString(value, true);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `[${value.map(pdJson).join(',')}]`;
  const parts = [];
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) parts.push(`${jsonString(key)}:${pdJson(item)}`);
  }
  return `{${parts.join(',')}}`;
}

/** json_decode(): the value, or null where PHP's decoder fails. */
export function jsonDecode(text) {
  if (typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PHP arrays from JSON (json_decode(..., true): objects and lists are both arrays)
// ════════════════════════════════════════════════════════════════════════════

export const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** is_array() of a decoded JSON value. */
export const isPhpArray = (v) => v !== null && typeof v === 'object';

/** pd_is_list(): a JSON list, an empty object, or an object whose keys are "0", "1", … in order. */
export function isPhpList(v) {
  if (Array.isArray(v)) return true;
  return isPlainObject(v) && Object.keys(v).every((key, i) => key === String(i));
}

/** Values of a PHP array (list or object) in order. */
export const phpValues = (v) => (Array.isArray(v) ? v : isPlainObject(v) ? Object.values(v) : []);

/** count() of a PHP array. */
export const phpCount = (v) => phpValues(v).length;

/** $arr[$key] ?? null on an own property only (no prototype keys such as "constructor"). */
export const own = (obj, key) => (isPhpArray(obj) && Object.hasOwn(obj, key) ? (obj[key] ?? null) : null);

// ════════════════════════════════════════════════════════════════════════════
// base64_decode($s, true), FILTER_VALIDATE_EMAIL, crc32()
// ════════════════════════════════════════════════════════════════════════════

/** Strict base64 like PHP: whitespace skipped, other foreign characters, data after padding or a lone last character fail. */
export function phpBase64Decode(s) {
  const m = /^([A-Za-z0-9+/]*)(=*)$/.exec(String(s).replace(/[\t\n\r ]/g, ''));
  if (!m) return null;
  const chars = m[1].length;
  const padding = m[2].length;
  if (chars % 4 === 1 || (padding && (padding > 2 || (chars + padding) % 4 !== 0))) return null;
  return Buffer.from(m[1], 'base64');
}

// FILTER_VALIDATE_EMAIL's PCRE pattern (ext/filter/logical_filters.c) for the part after its two length lookaheads,
// rewritten without the nested domain quantifier `((label\.){1,126}){1,}` (same language, but catastrophic
// backtracking in a regex engine without PCRE's backtrack limit). The lookaheads are counted in emailUnits().
const ATOM = "[\\x21\\x23-\\x27\\x2A\\x2B\\x2D\\x2F-\\x39\\x3D\\x3F\\x5E-\\x7E]+";
const QUOTED = '\\x22(?:[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x21\\x23-\\x5B\\x5D-\\x7F]|\\x5C[\\x00-\\x7F])*\\x22';
const WORD = `(?:${ATOM}|${QUOTED})`;
const OCTET = '(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])';
const H16 = '[a-f0-9]{1,4}';
const EMAIL_PATTERN = new RegExp(
  `^${WORD}(?:\\.${WORD})*@(?:` +
    '(?!.*[^.]{64,})(?:[a-z0-9]+(?:-+[a-z0-9]+)*\\.)+(?:[a-z][a-z0-9]*|xn--[a-z0-9]+)(?:-+[a-z0-9]+)*' +
    '|\\[(?:' +
    `(?:IPv6:(?:${H16}(?::${H16}){7}|(?!(?:.*[a-f0-9][:\\]]){7,})(?:${H16}(?::${H16}){0,5})?::(?:${H16}(?::${H16}){0,5})?))` +
    `|(?:(?:IPv6:(?:${H16}(?::${H16}){5}:|(?!(?:.*[a-f0-9]:){5,})(?:${H16}(?::${H16}){0,3})?::(?:${H16}(?::${H16}){0,3}:)?))?` +
    `${OCTET}(?:\\.${OCTET}){3})` +
    ')\\])$',
  'i',
);

// The lookaheads `(?!(?:"?\\[\x00-\x7E]"?|"?[^\\"]"?){255,})` and `(?!(?:…){65,}@)`: every unit is one character
// (or a backslash pair) with optional quotes around it. Returns [position, units] after each unit, both without
// and with a trailing quote, along the longest chain from the start.
function emailUnits(s) {
  const reached = [];
  let i = 0;
  let units = 0;
  for (;;) {
    let j = i;
    if (s[j] === '"') j++;
    if (s[j] === '\\' && j + 1 < s.length && s.charCodeAt(j + 1) <= 0x7e) j += 2;
    else if (j < s.length && s[j] !== '\\' && s[j] !== '"') j++;
    else break;
    units++;
    reached.push([j, units]);
    if (s[j] === '"') reached.push([++j, units]);
    i = j;
  }
  return reached;
}

/** filter_var($email, FILTER_VALIDATE_EMAIL) !== false. */
export function phpIsEmail(email) {
  const s = String(email);
  // PHP checks bytes; every pattern character class is ASCII, so any other character fails there too
  if (s.length > 320 || /[^\x00-\x7f]/.test(s)) return false;
  const reached = emailUnits(s);
  if (reached.some(([, units]) => units >= 255)) return false;
  if (reached.some(([pos, units]) => units >= 65 && s[pos] === '@')) return false;
  return EMAIL_PATTERN.test(s);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** crc32() of the bytes, unsigned. */
export function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
