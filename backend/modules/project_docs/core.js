// Shared helpers of the pd_* actions (entry point and file map: ../project_docs.js): the document set table,
// input validation, Indonesian number/date formatting, settings, numbering, access checks, database access and
// transactions, canonical JSON + content hash, activity log and notifications. Port of core.php: same messages,
// same rules. Spec: docs/platform/PROJECT-DOCS-SPEC.md. Shapes: src/features/project-docs/types.ts.
import crypto from 'node:crypto';
import {
  asciiLower,
  isPhpArray,
  isPhpList,
  isPlainObject,
  jsonDecode,
  mbLen,
  mbSubstr,
  own,
  pdJson,
  phpCount,
  phpIsEmail,
  phpNumberString,
  phpRound,
  phpString,
  phpTrim,
  phpValues,
} from './php.js';

export const PD_MONEY_MAX = 1000000000000; // 1e12 rupiah (spec §5 validation)
const PD_CONTENT_MAX_BYTES = 262144; // DocContent as JSON, 256 KB (spec §4.1)
const JAKARTA_OFFSET_MS = 7 * 3600 * 1000; // Asia/Jakarta, UTC+7 without daylight saving
// MySQL session time zone of every pd_* request: NOW() and TIMESTAMP columns (signed_at "… WIB", approvals,
// notifications) are Jakarta wall-clock time whatever zone the server runs in (MySQL in Docker defaults to UTC).
// An offset, because named zones need the time zone tables; Asia/Jakarta has no daylight saving.
export const PD_DB_TIME_ZONE = '+07:00';

const BOTH_PARTIES = Object.freeze(['pihak_pertama', 'pihak_kedua']);
// §1 document set in checklist order; same table as src/features/project-docs/engine/docTypes.ts
export const PD_DOC_TYPES = Object.freeze({
  brd: { code: 'BRD', short: 'BRD', required: true, approval: 'client', parties: [], stage: 'perencanaan' },
  mou: { code: 'MOU', short: 'MoU', required: 'mou', approval: 'client', parties: BOTH_PARTIES, stage: 'penawaran' },
  proposal: { code: 'PRP', short: 'Proposal', required: true, approval: 'client', parties: [], stage: 'penawaran' },
  pks: { code: 'PKS', short: 'PKS + SOW', required: true, approval: 'client', parties: BOTH_PARTIES, stage: 'kontrak' },
  timeline: { code: 'TML', short: 'Jadwal', required: true, approval: 'client', parties: [], stage: 'pengerjaan' },
  uat: { code: 'UAT', short: 'UAT', required: true, approval: 'client', parties: BOTH_PARTIES, stage: 'uji' },
  bast: { code: 'BAST', short: 'BAST', required: true, approval: 'client', parties: BOTH_PARTIES, stage: 'serah_terima' },
  invoice: { code: 'INV', short: 'Invoice', required: true, approval: 'none', parties: [], stage: 'pelunasan' },
  receipt: { code: 'KWT', short: 'Kuitansi', required: false, approval: 'none', parties: [], stage: 'pelunasan' },
  sla: { code: 'SLA', short: 'SLA', required: 'sla', approval: 'client', parties: BOTH_PARTIES, stage: 'maintenance' },
});
export const PD_DOC_TYPE_KEYS = Object.freeze(Object.keys(PD_DOC_TYPES));
// §2 stages in order
export const PD_STAGES = Object.freeze(['perencanaan', 'penawaran', 'kontrak', 'pengerjaan', 'uji', 'serah_terima', 'pelunasan', 'maintenance', 'selesai']);
// Types a Developer (role user) may create/save/restore/submit/withdraw; everything else is admin-only (spec §5)
export const PD_DEVELOPER_DOC_TYPES = Object.freeze(['brd', 'timeline', 'uat']);
// Types the admin marks selesai by hand (pd_document_complete) or that close when the project is selesai (spec §1.1)
export const PD_COMPLETABLE_TYPES = Object.freeze(['brd', 'proposal', 'timeline']);
export const PD_CLIENT_VISIBLE_ACTIVITY = Object.freeze([
  'doc_submitted', 'doc_issued', 'doc_approved', 'doc_rejected', 'doc_signed', 'doc_completed', 'invoice_cancelled', 'payment_recorded',
]);
export const PD_SERVICE_LABEL = Object.freeze({ website: 'Website', mobile_app: 'Aplikasi Mobile', ui_ux: 'Desain UI/UX', other: 'Aplikasi Custom' });
export const PD_PARTY_LABEL = Object.freeze({ pihak_pertama: 'Pihak Pertama', pihak_kedua: 'Pihak Kedua' });
export const PD_CLIENT_TYPES = Object.freeze(['perusahaan', 'perorangan']);
export const PD_MILESTONE_STATUSES = Object.freeze(['belum_mulai', 'berjalan', 'selesai', 'tertunda']);
export const PD_INVOICE_KIND_LABEL = Object.freeze({ dp: 'Uang muka (DP)', termin: 'Termin', pelunasan: 'Pelunasan', maintenance: 'Maintenance', lainnya: 'Lainnya' });
export const PD_PAYMENT_METHODS = Object.freeze(['transfer', 'tunai', 'qris', 'lainnya']);
const PD_PAYMENT_TRIGGERS = Object.freeze(['kontrak', 'pengerjaan', 'uji', 'serah_terima', 'manual']);
export const PD_MAINTENANCE_PERIODS = Object.freeze(['bulanan', 'tahunan']);
// pd_settings_get / pd_settings_save object → hero_settings key
export const PD_SETTING_KEYS = Object.freeze({
  company: 'pd_company', numbering: 'pd_numbering', tax: 'pd_tax', payment_terms: 'pd_payment_terms', sla_defaults: 'pd_sla_defaults',
});

// ════════════════════════════════════════════════════════════════════════════
// Errors and access
// ════════════════════════════════════════════════════════════════════════════

/** An error whose message is safe to show (ApiError of api.php): {error, code?, errors?} with `status`. */
export class PdError extends Error {
  constructor(message, status = 400, code = null, errors = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

// One VALIDATION error carrying every field message ({error, code, errors: {field: message}})
export function pdFail(errors) {
  const keys = Object.keys(errors);
  if (keys.length) throw new PdError(errors[keys[0]], 400, 'VALIDATION', errors);
}

export const pdBad = (field, message) => new PdError(message, 400, 'VALIDATION', { [field]: message });

export const pdNotFound = (what) => new PdError(`${what} tidak ditemukan.`, 404, 'NOT_FOUND');

// 409 with code LOCKED (document not editable), DUPLICATE or STATE (wrong status for the action)
export const pdConflict = (message, code) => new PdError(message, 409, code);

export function pdRequireUser(user) {
  if (!user) throw new PdError('Sesi tidak valid atau sudah berakhir. Silakan login kembali.', 401, 'UNAUTHORIZED');
  return user;
}

export function pdRequireStaff(user) {
  pdRequireUser(user);
  if (user.role !== 'admin' && user.role !== 'user') throw new PdError('Akses ditolak.', 403, 'FORBIDDEN');
  return user;
}

export function pdRequireAdmin(user) {
  pdRequireUser(user);
  if (user.role !== 'admin') throw new PdError('Akses ditolak: hanya admin.', 403, 'FORBIDDEN');
  return user;
}

export function pdRequireCustomer(user) {
  pdRequireUser(user);
  if (user.role !== 'customer') throw new PdError('Akses ditolak: aksi ini khusus akun klien.', 403, 'FORBIDDEN');
  return user;
}

// Developer limit (spec §5): document writes of a Developer only for brd, timeline and uat
export function pdCheckDocTypeAccess(user, docType) {
  if (user.role !== 'admin' && !PD_DEVELOPER_DOC_TYPES.includes(docType)) {
    throw new PdError('Akses ditolak: Developer hanya dapat mengelola BRD, Jadwal, dan UAT.', 403, 'FORBIDDEN');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Input values
// ════════════════════════════════════════════════════════════════════════════

// Positive int id: JSON number or digit string (GET query); null when absent or invalid
export function pdIdValue(v) {
  if (typeof v === 'string' && /^[1-9][0-9]{0,9}\n?$/.test(v)) v = parseInt(v, 10);
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 2147483647 ? v : null;
}

export function pdRequireId(input, key = 'id', label = 'ID') {
  const id = pdIdValue(own(input, key));
  if (id === null) throw pdBad(key, `${label} tidak valid.`);
  return id;
}

// Finite number (JSON number or numeric string), null otherwise
export function pdNumberValue(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && /^[ \t\n\x0B\f\r]*-?[0-9]+(\.[0-9]+)?[ \t\n\x0B\f\r]*$/.test(v)) return Number(v.replace(/[ \t\n\x0B\f\r]/g, ''));
  return null;
}

// Checkbox-like value: true / 1 / "1" / "true" → true
export const pdBool = (v) => v === true || v === 1 || v === '1' || v === 'true';

// Trimmed text field; null when empty or invalid (message in errors[key])
export function pdText(input, key, label, max, required, errors, min = 0) {
  const raw = own(input, key);
  if (raw !== null && typeof raw !== 'string' && typeof raw !== 'number') {
    errors[key] = `${label} tidak valid.`;
    return null;
  }
  const value = phpTrim(phpString(raw));
  if (value === '') {
    if (required) errors[key] = `${label} wajib diisi.`;
    return null;
  }
  const length = mbLen(value);
  if (length > max) errors[key] = `${label} maksimal ${max} karakter.`;
  else if (length < min) errors[key] = `${label} minimal ${min} karakter.`;
  else return value;
  return null;
}

// String inside a nested object (settings, terms): trimmed, '' allowed unless required
function pdSubText(obj, key, field, label, max, required, errors) {
  const raw = own(obj, key) ?? '';
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    errors[field] = `${label} tidak valid.`;
    return '';
  }
  const value = phpTrim(phpString(raw));
  if (value === '' && required) errors[field] = `${label} wajib diisi.`;
  else if (mbLen(value) > max) errors[field] = `${label} maksimal ${max} karakter.`;
  return value;
}

export function pdEnum(input, key, label, allowed, required, errors) {
  const raw = own(input, key);
  if (raw === null || raw === '') {
    if (required) errors[key] = `${label} wajib dipilih.`;
    return null;
  }
  if (typeof raw !== 'string' || !allowed.includes(raw)) {
    errors[key] = `${label} tidak valid.`;
    return null;
  }
  return raw;
}

const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// Real calendar date 'YYYY-MM-DD' (year ≥ 1900), or null
export function pdDateValue(v) {
  const m = typeof v === 'string' ? /^([0-9]{4})-([0-9]{2})-([0-9]{2})\n?$/.exec(v) : null;
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return y >= 1900 && mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo) ? v : null;
}

export function pdDate(input, key, label, required, errors) {
  const raw = own(input, key);
  if (raw === null || raw === '') {
    if (required) errors[key] = `${label} wajib diisi.`;
    return null;
  }
  const date = pdDateValue(raw);
  if (date === null) errors[key] = `${label} harus tanggal yang valid (YYYY-MM-DD).`;
  return date;
}

// Money in rupiah, 0 ≤ x ≤ 1e12
export function pdMoney(input, key, label, required, errors) {
  const raw = own(input, key);
  if (raw === null || raw === '') {
    if (required) errors[key] = `${label} wajib diisi.`;
    return null;
  }
  const value = pdNumberValue(raw);
  if (value === null || value < 0 || value > PD_MONEY_MAX) {
    errors[key] = `${label} harus angka 0 sampai 1.000.000.000.000.`;
    return null;
  }
  return value;
}

// Whole number in [min, max]
export function pdIntIn(input, key, label, min, max, required, errors, fallback = 0) {
  const raw = own(input, key);
  if (raw === null || raw === '') {
    if (required) errors[key] = `${label} wajib diisi.`;
    return required ? null : fallback;
  }
  const value = pdNumberValue(raw);
  if (value === null || Math.floor(value) !== value || value < min || value > max) {
    errors[key] = `${label} harus bilangan bulat ${min} sampai ${max}.`;
    return null;
  }
  return value;
}

// Optional `content_hash` of the version the caller reviewed (approve/reject/sign); null when absent
export function pdSeenHash(input, errors) {
  const raw = own(input, 'content_hash');
  if (raw === null || raw === '') return null;
  if (typeof raw !== 'string' || !/^[0-9a-f]{64}$/.test(raw)) {
    errors.content_hash = 'Versi dokumen tidak valid.';
    return null;
  }
  return raw;
}

// A decision or signature binds to the frozen content the person saw: when the document was withdrawn, edited or
// re-frozen meanwhile (same version number, other content hash), they must look at it again first
export function pdCheckSeenHash(d, seen) {
  if (seen !== null && seen !== String(d.content_hash ?? '')) {
    throw pdConflict('Isi dokumen sudah berubah sejak halaman ini dibuka. Muat ulang dan periksa isinya sebelum menyetujui atau menandatangani.', 'STATE');
  }
}

// LIKE pattern for a search text (wildcards in the text are matched literally)
export const pdLike = (q) => `%${q.replace(/[%_\\]/g, '\\$&')}%`;

export const pdUserAgent = (req) => mbSubstr(String(req.headers?.['user-agent'] ?? ''), 0, 255);

// The caller's address as server.js sees it (req.ip honours TRUST_PROXY), like client_ip() in api.php
export const pdClientIp = (req) => mbSubstr(req.ip || req.socket?.remoteAddress || '', 0, 64);

// ════════════════════════════════════════════════════════════════════════════
// Values out (JSON numbers)
// ════════════════════════════════════════════════════════════════════════════

// DECIMAL string → JSON number: '1500000.00' → 1500000, '11.50' → 11.5 (null / '' → 0 like (float))
export function pdNum(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export const pdIntOrNull = (value) => (value === null || value === undefined ? null : Number(value));

// Whole rupiah, half away from zero (PHP round; the engine's roundRupiah matches it)
export const pdRound = (x) => phpRound(pdNum(x));

// ════════════════════════════════════════════════════════════════════════════
// Dates and Indonesian formatting (same output as src/features/project-docs/engine/format.ts)
// ════════════════════════════════════════════════════════════════════════════

/** The current time in Asia/Jakarta as a Date whose UTC fields hold the local time. */
const pdNow = () => new Date(Date.now() + JAKARTA_OFFSET_MS);

export const pdToday = () => pdNow().toISOString().slice(0, 10);

/** 'YYYY-MM-DD HH:MM:SS' in Asia/Jakarta. */
export const pdNowString = () => pdNow().toISOString().slice(0, 19).replace('T', ' ');

export function pdAddDays(date, days) {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const utcDate = (iso) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);

// Inclusive day count start → end; 0 when a date is missing or the end is before the start
export function pdDurationDays(start, end) {
  if (pdDateValue(start) === null || pdDateValue(end) === null || end < start) return 0;
  return Math.round((utcDate(end) - utcDate(start)) / 86400000) + 1;
}

const PD_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const PD_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const isoDay = (iso) => pdDateValue(typeof iso === 'string' ? iso.slice(0, 10) : null);

// '2026-10-21' → "21 Oktober 2026"; '' for an empty or invalid date
export function pdTanggalPanjang(iso) {
  const date = isoDay(iso);
  if (date === null) return '';
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${PD_BULAN[m - 1]} ${y}`;
}

// '2026-10-21' → "Rabu"; '' for an empty or invalid date
export function pdHari(iso) {
  const date = isoDay(iso);
  return date === null ? '' : PD_HARI[utcDate(date).getUTCDay()];
}

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

// 10 → "X" (month in 007/PKS/GNB/X/2026)
export function pdRomawi(n) {
  let out = '';
  for (const [value, symbol] of ROMAN) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}

// 1250000 → "Rp1.250.000"; negative → "-Rp1.000"
export function pdRupiah(n) {
  const whole = pdRound(n);
  return `${whole < 0 ? '-' : ''}Rp${String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

// 1250000 → "satu juta dua ratus lima puluh ribu rupiah"; 0 → "nol rupiah"
export function pdTerbilang(n) {
  const whole = pdRound(n);
  if (whole === 0) return 'nol rupiah';
  return `${whole < 0 ? 'minus ' : ''}${bilangan(Math.abs(whole))} rupiah`;
}

const joinWords = (a, b) => (b === '' ? a : `${a} ${b}`);
const SCALES = [[1000000000000, 'triliun'], [1000000000, 'miliar'], [1000000, 'juta'], [1000, 'ribu']];

// Whole number ≥ 0 in words ('' for 0); "seribu" for exactly one thousand, "satu juta" for one million
function bilangan(n) {
  for (const [value, name] of SCALES) {
    if (n >= value) {
      const head = Math.floor(n / value);
      const words = value === 1000 && head === 1 ? 'seribu' : `${bilangan(head)} ${name}`;
      return joinWords(words, bilangan(n - head * value));
    }
  }
  return ratusan(n);
}

const ANGKA = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

// 0..999 in words ('' for 0)
function ratusan(n) {
  if (n < 12) return ANGKA[n];
  if (n < 20) return `${ANGKA[n - 10]} belas`;
  if (n < 100) return joinWords(`${ANGKA[Math.floor(n / 10)]} puluh`, ratusan(n % 10));
  if (n < 200) return joinWords('seratus', ratusan(n - 100));
  return joinWords(`${ANGKA[Math.floor(n / 100)]} ratus`, ratusan(n % 100));
}

// ════════════════════════════════════════════════════════════════════════════
// Document content (§4.1) and payment terms (§4.2)
// ════════════════════════════════════════════════════════════════════════════

const NAME_PATTERN = /^[A-Za-z0-9_.-]{1,64}\n?$/;

// Validates a DocContent and returns it normalized (known keys only, `fields` as a JSON object), or null
export function pdValidContent(raw, field, errors) {
  const sectionsRaw = own(raw, 'sections');
  if (!isPhpArray(raw) || !isPhpList(sectionsRaw)) {
    errors[field] = 'Isi dokumen tidak valid: daftar bagian (sections) wajib ada.';
    return null;
  }
  const sectionList = phpValues(sectionsRaw);
  if (sectionList.length > 200) {
    errors[field] = 'Isi dokumen maksimal 200 bagian.';
    return null;
  }
  const content = {};
  if (own(raw, 'title') !== null) {
    if (typeof raw.title !== 'string' || mbLen(raw.title) > 255) {
      errors[field] = 'Judul isi dokumen maksimal 255 karakter.';
      return null;
    }
    content.title = raw.title;
  }
  const sections = [];
  const ids = new Set();
  for (const [i, s] of sectionList.entries()) {
    const n = i + 1;
    const id = own(s, 'id');
    if (typeof id !== 'string' || !NAME_PATTERN.test(id)) {
      errors[field] = `Bagian ke-${n}: id wajib diisi (huruf, angka, _ . -, maks. 64).`;
      return null;
    }
    if (ids.has(id)) {
      errors[field] = `Bagian ke-${n}: id "${id}" dipakai lebih dari sekali.`;
      return null;
    }
    ids.add(id);
    const title = own(s, 'title');
    if (typeof title !== 'string' || mbLen(title) > 255) {
      errors[field] = `Bagian ke-${n}: judul wajib berupa teks (maks. 255 karakter).`;
      return null;
    }
    const section = { id, title };
    const body = own(s, 'body');
    if (body !== null) {
      if (typeof body !== 'string' || mbLen(body) > 100000) {
        errors[field] = `Bagian ke-${n}: isi harus teks (maks. 100.000 karakter).`;
        return null;
      }
      section.body = body;
    }
    if (own(s, 'table') !== null) {
      const table = pdValidTable(s.table);
      if (table === null) {
        errors[field] = `Bagian ke-${n}: tabel tidak valid (1–30 kolom, maks. 1.000 baris berisi teks).`;
        return null;
      }
      section.table = table;
    }
    const hidden = own(s, 'hidden');
    if (hidden !== null) {
      if (typeof hidden !== 'boolean') {
        errors[field] = `Bagian ke-${n}: hidden harus true atau false.`;
        return null;
      }
      section.hidden = hidden;
    }
    sections.push(section);
  }
  content.sections = sections;
  const fields = own(raw, 'fields');
  if (fields !== null) {
    if (!isPhpArray(fields) || (phpCount(fields) > 0 && isPhpList(fields)) || phpCount(fields) > 200) {
      errors[field] = 'Isian tambahan (fields) harus objek (maks. 200 isian).';
      return null;
    }
    const entries = Object.entries(fields);
    for (const [key, value] of entries) {
      const okValue = typeof value === 'boolean'
        || (typeof value === 'number' && Number.isFinite(value))
        || (typeof value === 'string' && mbLen(value) <= 5000);
      if (!NAME_PATTERN.test(key) || !okValue) {
        errors[field] = 'Isian tambahan (fields) hanya boleh teks, angka, atau true/false.';
        return null;
      }
    }
    // fromEntries defines every key as an own property (a "__proto__" field stays a field)
    content.fields = Object.fromEntries(entries);
  }
  if (Buffer.byteLength(pdJson(content)) > PD_CONTENT_MAX_BYTES) {
    errors[field] = 'Isi dokumen terlalu besar (maks. 256 KB).';
    return null;
  }
  return content;
}

// One table cell: text (≤ 5000), a number as PHP prints it, or '' for null
function tableCell(v) {
  if (typeof v === 'string') return mbLen(v) <= 5000 ? v : null;
  if (typeof v === 'number') return phpNumberString(v);
  return v === null ? '' : null;
}

function pdValidTable(raw) {
  const columnsRaw = own(raw, 'columns');
  const rowsRaw = own(raw, 'rows');
  if (!isPhpArray(raw) || !isPhpList(columnsRaw) || !isPhpList(rowsRaw)) return null;
  const columnList = phpValues(columnsRaw);
  const rowList = phpValues(rowsRaw);
  if (columnList.length < 1 || columnList.length > 30 || rowList.length > 1000) return null;
  const columns = [];
  for (const c of columnList) {
    const cell = tableCell(c);
    if (cell === null) return null;
    columns.push(cell);
  }
  const rows = [];
  for (const r of rowList) {
    if (!isPhpList(r) || phpCount(r) > 30) return null;
    const row = [];
    for (const c of phpValues(r)) {
      const cell = tableCell(c);
      if (cell === null) return null;
      row.push(cell);
    }
    rows.push(row);
  }
  return { columns, rows };
}

// Stored content JSON → DocContent (`fields` stays a JSON object even when empty)
export function pdContentOut(json) {
  const content = jsonDecode(json ?? '');
  if (!isPhpArray(content) || !isPhpList(own(content, 'sections'))) return { sections: [] };
  if (Object.hasOwn(content, 'fields')) content.fields = isPhpArray(content.fields) ? Object.fromEntries(Object.entries(content.fields)) : {};
  return content;
}

// PaymentTerm[]: 1–12 terms, unique keys, percentages 0–100 summing to 100 (± 0.01)
export function pdValidTerms(raw, field, errors) {
  if (!isPhpList(raw) || phpCount(raw) < 1 || phpCount(raw) > 12) {
    errors[field] = 'Termin pembayaran wajib diisi (1–12 termin).';
    return null;
  }
  const before = Object.keys(errors).length;
  const terms = [];
  const keys = new Set();
  let sum = 0;
  for (const [i, t] of phpValues(raw).entries()) {
    const f = `${field}.${i}`;
    if (!isPhpArray(t)) {
      errors[f] = `Termin ke-${i + 1} tidak valid.`;
      continue;
    }
    const key = typeof own(t, 'key') === 'string' ? phpTrim(t.key) : '';
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(key)) errors[`${f}.key`] = 'Kode termin hanya huruf, angka, - dan _ (maks. 40).';
    else if (keys.has(asciiLower(key))) errors[`${f}.key`] = 'Kode termin tidak boleh sama.';
    keys.add(asciiLower(key));
    const label = pdSubText(t, 'label', `${f}.label`, 'Nama termin', 100, true, errors);
    const percent = pdNumberValue(own(t, 'percent'));
    if (percent === null || percent < 0 || percent > 100) errors[`${f}.percent`] = 'Persentase termin harus 0 sampai 100.';
    const trigger = own(t, 'trigger');
    if (typeof trigger !== 'string' || !PD_PAYMENT_TRIGGERS.includes(trigger)) errors[`${f}.trigger`] = 'Pemicu termin tidak valid.';
    const dueDays = pdNumberValue(own(t, 'due_days'));
    if (dueDays === null || Math.floor(dueDays) !== dueDays || dueDays < 0 || dueDays > 365) {
      errors[`${f}.due_days`] = 'Jatuh tempo termin harus 0 sampai 365 hari.';
    }
    sum += percent ?? 0;
    terms.push({ key, label, percent: pdNum(percent), trigger, due_days: Math.trunc(dueDays ?? 0) });
  }
  if (Object.keys(errors).length > before) return null;
  if (Math.abs(sum - 100) > 0.01) {
    errors[field] = 'Total persentase termin harus 100%.';
    return null;
  }
  return terms;
}

// ════════════════════════════════════════════════════════════════════════════
// Settings (hero_settings pd_* keys, spec §3)
// ════════════════════════════════════════════════════════════════════════════

function pdDefaultSettings() {
  return {
    company: {
      name: 'PT Garuda Nexa Bahtera', address: '', city: '', phone: '', email: '',
      website: 'https://garudanexa.com', npwp: '', signatory_name: '', signatory_title: 'Direktur',
      bank_accounts: [{ bank: '', number: '', holder: '' }],
    },
    numbering: { prefix: 'GNB' },
    tax: { ppn_enabled: false, ppn_rate: 12, dpp_numerator: 11, dpp_denominator: 12, pph23_rate: 2 },
    payment_terms: [
      { key: 'dp', label: 'Uang muka (DP)', percent: 50, trigger: 'kontrak', due_days: 7 },
      { key: 'termin2', label: 'Termin 2', percent: 30, trigger: 'uji', due_days: 7 },
      { key: 'pelunasan', label: 'Pelunasan', percent: 20, trigger: 'serah_terima', due_days: 7 },
    ],
    sla_defaults: {
      support_hours: 'Senin–Jumat 09.00–17.00 WIB', uptime: '99,5%',
      priorities: [
        { level: 'P1 – Kritis', response: '2 jam', resolution: '1 hari kerja' },
        { level: 'P2 – Tinggi', response: '4 jam', resolution: '2 hari kerja' },
        { level: 'P3 – Normal', response: '1 hari kerja', resolution: '5 hari kerja' },
      ],
    },
  };
}

const TAX_LIMITS = [['ppn_rate', 0, 100, 'Tarif PPN'], ['dpp_numerator', 0.01, 1000, 'Pembilang DPP'], ['dpp_denominator', 0.01, 1000, 'Penyebut DPP'], ['pph23_rate', 0, 100, 'Tarif PPh 23']];

// Validates one settings object (pd_settings_save); null when invalid (messages in errors as "<name>.<field>")
export function pdValidSetting(name, raw, errors) {
  if (name === 'payment_terms') return pdValidTerms(raw, 'payment_terms', errors);
  if (!isPhpArray(raw) || (phpCount(raw) > 0 && isPhpList(raw))) {
    errors[name] = 'Pengaturan tidak valid.';
    return null;
  }
  const before = Object.keys(errors).length;
  const out = {};
  if (name === 'company') {
    out.name = pdSubText(raw, 'name', 'company.name', 'Nama perusahaan', 255, true, errors);
    out.address = pdSubText(raw, 'address', 'company.address', 'Alamat', 500, false, errors);
    out.city = pdSubText(raw, 'city', 'company.city', 'Kota', 120, false, errors);
    out.phone = pdSubText(raw, 'phone', 'company.phone', 'Telepon', 50, false, errors);
    out.email = asciiLower(pdSubText(raw, 'email', 'company.email', 'Email', 255, false, errors));
    if (out.email !== '' && !phpIsEmail(out.email)) errors['company.email'] = 'Format email tidak valid.';
    out.website = pdSubText(raw, 'website', 'company.website', 'Website', 255, false, errors);
    if (out.website !== '' && !/^https?:\/\/[^ \t\n\x0B\f\r<>"]+$/i.test(out.website)) errors['company.website'] = 'Website harus diawali http:// atau https://.';
    out.npwp = pdSubText(raw, 'npwp', 'company.npwp', 'NPWP', 32, false, errors);
    if (out.npwp !== '' && !/^[0-9 .-]+$/.test(out.npwp)) errors['company.npwp'] = 'NPWP hanya angka, titik, dan tanda hubung.';
    out.signatory_name = pdSubText(raw, 'signatory_name', 'company.signatory_name', 'Nama penanda tangan', 255, false, errors);
    out.signatory_title = pdSubText(raw, 'signatory_title', 'company.signatory_title', 'Jabatan penanda tangan', 255, false, errors);
    let accounts = own(raw, 'bank_accounts') ?? [];
    if (!isPhpList(accounts) || phpCount(accounts) > 5) {
      errors['company.bank_accounts'] = 'Rekening bank maksimal 5.';
      accounts = [];
    }
    out.bank_accounts = phpValues(accounts).map((item, i) => {
      const a = isPhpArray(item) ? item : {};
      const f = `company.bank_accounts.${i}`;
      const account = {
        bank: pdSubText(a, 'bank', `${f}.bank`, 'Nama bank', 100, false, errors),
        number: pdSubText(a, 'number', `${f}.number`, 'Nomor rekening', 50, false, errors),
        holder: pdSubText(a, 'holder', `${f}.holder`, 'Atas nama', 255, false, errors),
      };
      if (account.number !== '' && !/^[0-9 .-]+$/.test(account.number)) errors[`${f}.number`] = 'Nomor rekening hanya angka.';
      return account;
    });
  } else if (name === 'numbering') {
    const prefix = pdSubText(raw, 'prefix', 'numbering.prefix', 'Prefix nomor', 10, true, errors);
    if (prefix !== '' && !/^[A-Za-z0-9-]{1,10}$/.test(prefix)) errors['numbering.prefix'] = 'Prefix nomor hanya huruf, angka, dan tanda hubung (maks. 10).';
    out.prefix = prefix;
  } else if (name === 'tax') {
    out.ppn_enabled = pdBool(own(raw, 'ppn_enabled') ?? false);
    for (const [key, min, max, label] of TAX_LIMITS) {
      const v = pdNumberValue(own(raw, key));
      if (v === null || v < min || v > max) errors[`tax.${key}`] = `${label} harus angka ${min} sampai ${max}.`;
      out[key] = pdNum(v);
    }
  } else if (name === 'sla_defaults') {
    out.support_hours = pdSubText(raw, 'support_hours', 'sla_defaults.support_hours', 'Jam layanan', 255, false, errors);
    out.uptime = pdSubText(raw, 'uptime', 'sla_defaults.uptime', 'Target uptime', 50, false, errors);
    let priorities = own(raw, 'priorities') ?? [];
    if (!isPhpList(priorities) || phpCount(priorities) > 10) {
      errors['sla_defaults.priorities'] = 'Prioritas SLA maksimal 10.';
      priorities = [];
    }
    out.priorities = phpValues(priorities).map((item, i) => {
      const p = isPhpArray(item) ? item : {};
      const f = `sla_defaults.priorities.${i}`;
      return {
        level: pdSubText(p, 'level', `${f}.level`, 'Level prioritas', 100, true, errors),
        response: pdSubText(p, 'response', `${f}.response`, 'Waktu respons', 100, false, errors),
        resolution: pdSubText(p, 'resolution', `${f}.resolution`, 'Waktu penyelesaian', 100, false, errors),
      };
    });
  }
  return Object.keys(errors).length > before ? null : out;
}

// All five settings objects; a missing or invalid stored value falls back to its default. Cached per request
// (ctx.settings), like the static cache of pd_settings().
export async function pdSettings(ctx, reload = false) {
  if (ctx.settings && !reload) return ctx.settings;
  const keys = Object.values(PD_SETTING_KEYS);
  const stored = new Map();
  for (const row of await dbAll(ctx, 'SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN (?, ?, ?, ?, ?)', keys)) {
    stored.set(row.setting_key, jsonDecode(row.setting_value ?? ''));
  }
  const settings = pdDefaultSettings();
  for (const [name, key] of Object.entries(PD_SETTING_KEYS)) {
    if ((stored.get(key) ?? null) === null) continue;
    const value = pdValidSetting(name, stored.get(key), {});
    if (value !== null) settings[name] = value;
  }
  ctx.settings = settings;
  return settings;
}

// ════════════════════════════════════════════════════════════════════════════
// Database: one connection per request (ctx.db), transactions
// ════════════════════════════════════════════════════════════════════════════

// Every value is bound; dates come back as 'YYYY-MM-DD HH:MM:SS' strings like mysqli
export async function dbRun(ctx, sql, params = []) {
  try {
    const [result] = await ctx.db.query({ sql, values: params, dateStrings: true });
    return result;
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) throw new PdError('Data yang sama sudah ada (duplikat).', 409);
    throw err;
  }
}

export const dbAll = (ctx, sql, params = []) => dbRun(ctx, sql, params);

export async function dbOne(ctx, sql, params = []) {
  const rows = await dbRun(ctx, sql, params);
  return rows[0] ?? null;
}

export async function pdInsert(ctx, sql, params) {
  return Number((await dbRun(ctx, sql, params)).insertId);
}

// Runs fn in one transaction on the request's connection; any error rolls everything back
export async function pdTx(ctx, fn) {
  await ctx.db.beginTransaction();
  try {
    const result = await fn();
    await ctx.db.commit();
    return result;
  } catch (err) {
    await ctx.db.rollback().catch(() => {});
    throw err;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Numbering (§1.3)
// ════════════════════════════════════════════════════════════════════════════

const pad3 = (n) => String(n).padStart(3, '0');

// Next sequence of a counter, atomic: the row lock lasts until the surrounding transaction ends. LAST_INSERT_ID()
// belongs to the connection, so it is read on the same one.
async function pdNextSeq(ctx, key, year) {
  await dbRun(ctx, `INSERT INTO pd_counters (counter_key, year, last_seq) VALUES (?, ?, LAST_INSERT_ID(1))
                    ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1)`, [key, year]);
  return Number((await dbOne(ctx, 'SELECT LAST_INSERT_ID() AS seq')).seq);
}

/** {SEQ:3}/{CODE}/{PREFIX}/{ROMAN_MONTH}/{YEAR}, e.g. 007/PKS/GNB/X/2026. */
export const pdFormatDocNumber = (seq, code, prefix, month, year) => `${pad3(seq)}/${code}/${prefix}/${pdRomawi(month)}/${year}`;

/** PRJ-{YEAR}-{SEQ:3}. */
export const pdFormatProjectCode = (seq, year) => `PRJ-${year}-${pad3(seq)}`;

// Document number at creation (Asia/Jakarta date)
export async function pdNewDocNumber(ctx, docType) {
  const now = pdNow();
  const year = now.getUTCFullYear();
  const { code } = PD_DOC_TYPES[docType];
  const { prefix } = (await pdSettings(ctx)).numbering;
  return pdFormatDocNumber(await pdNextSeq(ctx, code, year), code, prefix, now.getUTCMonth() + 1, year);
}

export async function pdNewProjectCode(ctx) {
  const year = pdNow().getUTCFullYear();
  return pdFormatProjectCode(await pdNextSeq(ctx, 'PRJ', year), year);
}

// ════════════════════════════════════════════════════════════════════════════
// Canonical JSON + content hash (§1.2)
// ════════════════════════════════════════════════════════════════════════════

const byteOrder = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));

// Canonical JSON for hashing, same bytes as pd_canonical_json(): object keys sorted (byte order), no whitespace,
// numbers as PHP's json_encode prints them, strings escaped like JSON.stringify. {} and [] stay distinct.
export function pdCanonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(pdCanonicalJson).join(',')}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort(byteOrder).map((key) => `${JSON.stringify(key)}:${pdCanonicalJson(value[key])}`).join(',')}}`;
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') return phpNumberString(value, true);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return 'null';
}

// content_hash = SHA-256 of the canonical JSON {content, snapshot} of a version
export function pdContentHash(contentJson, snapshotJson) {
  const doc = { content: jsonDecode(contentJson), snapshot: snapshotJson === null ? null : jsonDecode(snapshotJson) };
  return crypto.createHash('sha256').update(pdCanonicalJson(doc)).digest('hex');
}

// ════════════════════════════════════════════════════════════════════════════
// Activity log and notifications
// ════════════════════════════════════════════════════════════════════════════

// "PKS + SOW 007/PKS/GNB/X/2026"
export const pdDocLabel = (doc) => `${PD_DOC_TYPES[doc.doc_type].short} ${doc.number}`;

export async function pdLog(ctx, projectId, documentId, user, action, detail) {
  await dbRun(ctx, 'INSERT INTO pd_activity (project_id, document_id, user_id, action, detail) VALUES (?, ?, ?, ?, ?)',
    [projectId, documentId, user ? Number(user.id) : null, action, detail === '' ? null : mbSubstr(detail, 0, 500)]);
}

// In-app notification for one user (user_id) or every user of a role (role); dedupe_key makes it unique
export async function pdNotify(ctx, n) {
  await dbRun(ctx, `INSERT IGNORE INTO pd_notifications (user_id, role, type, title, body, link, project_id, dedupe_key)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
    n.user_id ?? null, n.role ?? null, n.type, mbSubstr(n.title, 0, 255),
    n.body !== undefined && n.body !== null ? mbSubstr(n.body, 0, 500) : null, n.link ?? null, n.project_id ?? null, n.dedupe_key ?? null,
  ]);
}

// In-app paths of a document page for the admin and the customer account
export const pdDocLink = (audience, projectId, docId) => `${audience === 'customer' ? '/akun/proyek/' : '/admin/proyek/'}${projectId}/dokumen/${docId}`;
