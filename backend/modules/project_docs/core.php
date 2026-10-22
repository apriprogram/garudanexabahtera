<?php
// Shared helpers of the pd_* actions (entry point and file map: ../project_docs.php): the document set table,
// input validation, Indonesian number/date formatting, settings, numbering, access checks, transactions,
// canonical JSON + content hash, activity log and notifications.
// Spec: docs/platform/PROJECT-DOCS-SPEC.md. Shapes: src/features/project-docs/types.ts.

const PD_JSON_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE;
const PD_TIMEZONE = 'Asia/Jakarta';
// MySQL session time zone of every pd_* request: NOW() and TIMESTAMP columns (signed_at "… WIB", approvals,
// notifications) are Jakarta wall-clock time whatever zone the server runs in (MySQL in Docker defaults to UTC).
// An offset, because named zones need the time zone tables; Asia/Jakarta has no daylight saving.
const PD_DB_TIME_ZONE = '+07:00';
const PD_MONEY_MAX = 1000000000000;   // 1e12 rupiah (spec §5 validation)
const PD_CONTENT_MAX_BYTES = 262144;  // DocContent as JSON, 256 KB (spec §4.1)

const PD_BOTH_PARTIES = ['pihak_pertama', 'pihak_kedua'];
// §1 document set in checklist order; same table as src/features/project-docs/engine/docTypes.ts
const PD_DOC_TYPES = [
    'brd' => ['code' => 'BRD', 'short' => 'BRD', 'required' => true, 'approval' => 'client', 'parties' => [], 'stage' => 'perencanaan'],
    'mou' => ['code' => 'MOU', 'short' => 'MoU', 'required' => 'mou', 'approval' => 'client', 'parties' => PD_BOTH_PARTIES, 'stage' => 'penawaran'],
    'proposal' => ['code' => 'PRP', 'short' => 'Proposal', 'required' => true, 'approval' => 'client', 'parties' => [], 'stage' => 'penawaran'],
    'pks' => ['code' => 'PKS', 'short' => 'PKS + SOW', 'required' => true, 'approval' => 'client', 'parties' => PD_BOTH_PARTIES, 'stage' => 'kontrak'],
    'timeline' => ['code' => 'TML', 'short' => 'Jadwal', 'required' => true, 'approval' => 'client', 'parties' => [], 'stage' => 'pengerjaan'],
    'uat' => ['code' => 'UAT', 'short' => 'UAT', 'required' => true, 'approval' => 'client', 'parties' => PD_BOTH_PARTIES, 'stage' => 'uji'],
    'bast' => ['code' => 'BAST', 'short' => 'BAST', 'required' => true, 'approval' => 'client', 'parties' => PD_BOTH_PARTIES, 'stage' => 'serah_terima'],
    'invoice' => ['code' => 'INV', 'short' => 'Invoice', 'required' => true, 'approval' => 'none', 'parties' => [], 'stage' => 'pelunasan'],
    'receipt' => ['code' => 'KWT', 'short' => 'Kuitansi', 'required' => false, 'approval' => 'none', 'parties' => [], 'stage' => 'pelunasan'],
    'sla' => ['code' => 'SLA', 'short' => 'SLA', 'required' => 'sla', 'approval' => 'client', 'parties' => PD_BOTH_PARTIES, 'stage' => 'maintenance'],
];
// §2 stages in order
const PD_STAGES = ['perencanaan', 'penawaran', 'kontrak', 'pengerjaan', 'uji', 'serah_terima', 'pelunasan', 'maintenance', 'selesai'];
// Types a Developer (role user) may create/save/restore/submit/withdraw; everything else is admin-only (spec §5)
const PD_DEVELOPER_DOC_TYPES = ['brd', 'timeline', 'uat'];
// Types the admin marks selesai by hand (pd_document_complete) or that close when the project is selesai (spec §1.1)
const PD_COMPLETABLE_TYPES = ['brd', 'proposal', 'timeline'];
const PD_CLIENT_VISIBLE_ACTIVITY = [
    'doc_submitted', 'doc_issued', 'doc_approved', 'doc_rejected', 'doc_signed', 'doc_completed', 'invoice_cancelled', 'payment_recorded',
];
const PD_SERVICE_LABEL = ['website' => 'Website', 'mobile_app' => 'Aplikasi Mobile', 'ui_ux' => 'Desain UI/UX', 'other' => 'Aplikasi Custom'];
const PD_PARTY_LABEL = ['pihak_pertama' => 'Pihak Pertama', 'pihak_kedua' => 'Pihak Kedua'];
const PD_CLIENT_TYPES = ['perusahaan', 'perorangan'];
const PD_MILESTONE_STATUSES = ['belum_mulai', 'berjalan', 'selesai', 'tertunda'];
const PD_INVOICE_KIND_LABEL = ['dp' => 'Uang muka (DP)', 'termin' => 'Termin', 'pelunasan' => 'Pelunasan', 'maintenance' => 'Maintenance', 'lainnya' => 'Lainnya'];
const PD_PAYMENT_METHODS = ['transfer', 'tunai', 'qris', 'lainnya'];
const PD_PAYMENT_TRIGGERS = ['kontrak', 'pengerjaan', 'uji', 'serah_terima', 'manual'];
const PD_MAINTENANCE_PERIODS = ['bulanan', 'tahunan'];
// pd_settings_get / pd_settings_save object → hero_settings key
const PD_SETTING_KEYS = [
    'company' => 'pd_company', 'numbering' => 'pd_numbering', 'tax' => 'pd_tax',
    'payment_terms' => 'pd_payment_terms', 'sla_defaults' => 'pd_sla_defaults',
];

// ════════════════════════════════════════════════════════════════════════════
// Errors and access
// ════════════════════════════════════════════════════════════════════════════

// One VALIDATION error carrying every field message ({error, code, errors: {field: message}})
function pd_fail(array $errors): void {
    if ($errors) throw new ApiError(reset($errors), 400, 'VALIDATION', $errors);
}

function pd_bad(string $field, string $message): ApiError {
    return new ApiError($message, 400, 'VALIDATION', [$field => $message]);
}

function pd_not_found(string $what): ApiError {
    return new ApiError("$what tidak ditemukan.", 404, 'NOT_FOUND');
}

// 409 with code LOCKED (document not editable), DUPLICATE or STATE (wrong status for the action)
function pd_conflict(string $message, string $code): ApiError {
    return new ApiError($message, 409, $code);
}

function pd_require_user(?array $user): array {
    if (!$user) throw new ApiError('Sesi tidak valid atau sudah berakhir. Silakan login kembali.', 401, 'UNAUTHORIZED');
    return $user;
}

function pd_require_staff(?array $user): array {
    $user = pd_require_user($user);
    if (!in_array($user['role'], ['admin', 'user'], true)) throw new ApiError('Akses ditolak.', 403, 'FORBIDDEN');
    return $user;
}

function pd_require_admin(?array $user): array {
    $user = pd_require_user($user);
    if ($user['role'] !== 'admin') throw new ApiError('Akses ditolak: hanya admin.', 403, 'FORBIDDEN');
    return $user;
}

function pd_require_customer(?array $user): array {
    $user = pd_require_user($user);
    if ($user['role'] !== 'customer') throw new ApiError('Akses ditolak: aksi ini khusus akun klien.', 403, 'FORBIDDEN');
    return $user;
}

// Developer limit (spec §5): document writes of a Developer only for brd, timeline and uat
function pd_check_doc_type_access(array $user, string $docType): void {
    if ($user['role'] !== 'admin' && !in_array($docType, PD_DEVELOPER_DOC_TYPES, true)) {
        throw new ApiError('Akses ditolak: Developer hanya dapat mengelola BRD, Jadwal, dan UAT.', 403, 'FORBIDDEN');
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Input values
// ════════════════════════════════════════════════════════════════════════════

// Positive int id: JSON number or digit string (GET query); null when absent or invalid
function pd_id_value($v): ?int {
    if (is_string($v) && preg_match('/^[1-9][0-9]{0,9}$/', $v)) $v = (int)$v;
    if (is_float($v) && floor($v) === $v && $v >= 1 && $v <= 2147483647) $v = (int)$v;
    return (is_int($v) && $v >= 1 && $v <= 2147483647) ? $v : null;
}

function pd_require_id(array $input, string $key = 'id', string $label = 'ID'): int {
    $id = pd_id_value($input[$key] ?? null);
    if ($id === null) throw pd_bad($key, "$label tidak valid.");
    return $id;
}

// Finite number (JSON number or numeric string), null otherwise
function pd_number_value($v): ?float {
    if (is_int($v) || is_float($v)) return is_finite((float)$v) ? (float)$v : null;
    if (is_string($v) && preg_match('/^\s*-?[0-9]+(\.[0-9]+)?\s*$/', $v)) return (float)$v;
    return null;
}

// Checkbox-like value: true / 1 / "1" / "true" → true
function pd_bool($v): bool {
    return $v === true || $v === 1 || $v === '1' || $v === 'true';
}

// Trimmed text field; null when empty or invalid (message in $errors[$key])
function pd_text(array $input, string $key, string $label, int $max, bool $required, array &$errors, int $min = 0): ?string {
    $raw = $input[$key] ?? null;
    if ($raw !== null && !is_string($raw) && !is_int($raw) && !is_float($raw)) {
        $errors[$key] = "$label tidak valid.";
        return null;
    }
    $value = trim((string)$raw);
    if ($value === '') {
        if ($required) $errors[$key] = "$label wajib diisi.";
        return null;
    }
    $length = mb_strlen($value);
    if ($length > $max) $errors[$key] = "$label maksimal $max karakter.";
    elseif ($length < $min) $errors[$key] = "$label minimal $min karakter.";
    else return $value;
    return null;
}

// String inside a nested object (settings, terms): trimmed, '' allowed unless required
function pd_sub_text(array $obj, string $key, string $field, string $label, int $max, bool $required, array &$errors): string {
    $raw = $obj[$key] ?? '';
    if (!is_string($raw) && !is_int($raw) && !is_float($raw)) {
        $errors[$field] = "$label tidak valid.";
        return '';
    }
    $value = trim((string)$raw);
    if ($value === '' && $required) $errors[$field] = "$label wajib diisi.";
    elseif (mb_strlen($value) > $max) $errors[$field] = "$label maksimal $max karakter.";
    return $value;
}

function pd_enum(array $input, string $key, string $label, array $allowed, bool $required, array &$errors): ?string {
    $raw = $input[$key] ?? null;
    if ($raw === null || $raw === '') {
        if ($required) $errors[$key] = "$label wajib dipilih.";
        return null;
    }
    if (!is_string($raw) || !in_array($raw, $allowed, true)) {
        $errors[$key] = "$label tidak valid.";
        return null;
    }
    return $raw;
}

// Real calendar date 'YYYY-MM-DD', or null
function pd_date_value($v): ?string {
    if (!is_string($v) || !preg_match('/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/', $v, $m)) return null;
    return checkdate((int)$m[2], (int)$m[3], (int)$m[1]) && (int)$m[1] >= 1900 ? $v : null;
}

function pd_date(array $input, string $key, string $label, bool $required, array &$errors): ?string {
    $raw = $input[$key] ?? null;
    if ($raw === null || $raw === '') {
        if ($required) $errors[$key] = "$label wajib diisi.";
        return null;
    }
    $date = pd_date_value($raw);
    if ($date === null) $errors[$key] = "$label harus tanggal yang valid (YYYY-MM-DD).";
    return $date;
}

// Money in rupiah, 0 ≤ x ≤ 1e12
function pd_money(array $input, string $key, string $label, bool $required, array &$errors): ?float {
    $raw = $input[$key] ?? null;
    if ($raw === null || $raw === '') {
        if ($required) $errors[$key] = "$label wajib diisi.";
        return null;
    }
    $value = pd_number_value($raw);
    if ($value === null || $value < 0 || $value > PD_MONEY_MAX) {
        $errors[$key] = "$label harus angka 0 sampai 1.000.000.000.000.";
        return null;
    }
    return $value;
}

// Whole number in [min, max]
function pd_int_in(array $input, string $key, string $label, int $min, int $max, bool $required, array &$errors, int $default = 0): ?int {
    $raw = $input[$key] ?? null;
    if ($raw === null || $raw === '') {
        if ($required) $errors[$key] = "$label wajib diisi.";
        return $required ? null : $default;
    }
    $value = pd_number_value($raw);
    if ($value === null || floor($value) !== $value || $value < $min || $value > $max) {
        $errors[$key] = "$label harus bilangan bulat $min sampai $max.";
        return null;
    }
    return (int)$value;
}

function pd_is_list($value): bool {
    return is_array($value) && ($value === [] || array_keys($value) === range(0, count($value) - 1));
}

// Optional `content_hash` of the version the caller reviewed (approve/reject/sign); null when absent
function pd_seen_hash(array $input, array &$errors): ?string {
    $raw = $input['content_hash'] ?? null;
    if ($raw === null || $raw === '') return null;
    if (!is_string($raw) || !preg_match('/^[0-9a-f]{64}$/D', $raw)) {
        $errors['content_hash'] = 'Versi dokumen tidak valid.';
        return null;
    }
    return $raw;
}

// A decision or signature binds to the frozen content the person saw: when the document was withdrawn, edited or
// re-frozen meanwhile (same version number, other content hash), they must look at it again first
function pd_check_seen_hash(array $d, ?string $seen): void {
    if ($seen !== null && $seen !== (string)$d['content_hash']) {
        throw pd_conflict('Isi dokumen sudah berubah sejak halaman ini dibuka. Muat ulang dan periksa isinya sebelum menyetujui atau menandatangani.', 'STATE');
    }
}

// LIKE pattern for a search text (wildcards in the text are matched literally)
function pd_like(string $q): string {
    return '%' . addcslashes($q, '%_\\') . '%';
}

function pd_user_agent(): string {
    return mb_substr(mb_convert_encoding((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 'UTF-8', 'UTF-8'), 0, 255);
}

// ════════════════════════════════════════════════════════════════════════════
// Values out (JSON numbers, ints)
// ════════════════════════════════════════════════════════════════════════════

// DECIMAL string → JSON number: 1500000.00 → 1500000, 11.50 → 11.5
function pd_num($value) {
    $number = (float)$value;
    return floor($number) === $number && abs($number) < 1e15 ? (int)$number : $number;
}

function pd_int_or_null($value): ?int {
    return $value === null ? null : (int)$value;
}

// Whole rupiah, half away from zero (PHP round; the engine's roundRupiah matches it)
function pd_round($x): int {
    return (int)round((float)$x);
}

// ════════════════════════════════════════════════════════════════════════════
// Dates and Indonesian formatting (same output as src/features/project-docs/engine/format.ts)
// ════════════════════════════════════════════════════════════════════════════

function pd_now(): DateTime {
    return new DateTime('now', new DateTimeZone(PD_TIMEZONE));
}

function pd_today(): string {
    return pd_now()->format('Y-m-d');
}

function pd_add_days(string $date, int $days): string {
    return (new DateTime($date, new DateTimeZone(PD_TIMEZONE)))->modify(($days >= 0 ? '+' : '') . $days . ' days')->format('Y-m-d');
}

// Inclusive day count start → end; 0 when a date is missing or the end is before the start
function pd_duration_days(?string $start, ?string $end): int {
    if (pd_date_value($start) === null || pd_date_value($end) === null || $end < $start) return 0;
    return (int)(new DateTime($start))->diff(new DateTime($end))->days + 1;
}

const PD_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const PD_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// '2026-10-21' → "21 Oktober 2026"; '' for an empty or invalid date
function pd_tanggal_panjang($iso): string {
    $date = pd_date_value(is_string($iso) ? substr($iso, 0, 10) : null);
    if ($date === null) return '';
    [$y, $m, $d] = array_map('intval', explode('-', $date));
    return $d . ' ' . PD_BULAN[$m - 1] . ' ' . $y;
}

// '2026-10-21' → "Rabu"; '' for an empty or invalid date
function pd_hari($iso): string {
    $date = pd_date_value(is_string($iso) ? substr($iso, 0, 10) : null);
    return $date === null ? '' : PD_HARI[(int)(new DateTime($date))->format('w')];
}

// 10 → "X" (month in 007/PKS/GNB/X/2026)
function pd_romawi(int $n): string {
    $out = '';
    foreach ([1000 => 'M', 900 => 'CM', 500 => 'D', 400 => 'CD', 100 => 'C', 90 => 'XC', 50 => 'L', 40 => 'XL', 10 => 'X', 9 => 'IX', 5 => 'V', 4 => 'IV', 1 => 'I'] as $value => $symbol) {
        while ($n >= $value) {
            $out .= $symbol;
            $n -= $value;
        }
    }
    return $out;
}

// 1250000 → "Rp1.250.000"; negative → "-Rp1.000"
function pd_rupiah($n): string {
    $whole = pd_round($n);
    return ($whole < 0 ? '-' : '') . 'Rp' . number_format(abs($whole), 0, ',', '.');
}

// 1250000 → "satu juta dua ratus lima puluh ribu rupiah"; 0 → "nol rupiah"
function pd_terbilang($n): string {
    $whole = pd_round($n);
    if ($whole === 0) return 'nol rupiah';
    return ($whole < 0 ? 'minus ' : '') . pd_bilangan(abs($whole)) . ' rupiah';
}

function pd_join_words(string $a, string $b): string {
    return $b === '' ? $a : "$a $b";
}

// Whole number ≥ 0 in words ('' for 0); "seribu" for exactly one thousand, "satu juta" for one million
function pd_bilangan(int $n): string {
    foreach ([[1000000000000, 'triliun'], [1000000000, 'miliar'], [1000000, 'juta'], [1000, 'ribu']] as [$value, $name]) {
        if ($n >= $value) {
            $head = intdiv($n, $value);
            $words = ($value === 1000 && $head === 1) ? 'seribu' : pd_bilangan($head) . ' ' . $name;
            return pd_join_words($words, pd_bilangan($n - $head * $value));
        }
    }
    return pd_ratusan($n);
}

// 0..999 in words ('' for 0)
function pd_ratusan(int $n): string {
    static $angka = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    if ($n < 12) return $angka[$n];
    if ($n < 20) return $angka[$n - 10] . ' belas';
    if ($n < 100) return pd_join_words($angka[intdiv($n, 10)] . ' puluh', pd_ratusan($n % 10));
    if ($n < 200) return pd_join_words('seratus', pd_ratusan($n - 100));
    return pd_join_words($angka[intdiv($n, 100)] . ' ratus', pd_ratusan($n % 100));
}

// ════════════════════════════════════════════════════════════════════════════
// Document content (§4.1) and payment terms (§4.2)
// ════════════════════════════════════════════════════════════════════════════

// Validates a DocContent and returns it normalized (known keys only, `fields` as a JSON object), or null
function pd_valid_content($raw, string $field, array &$errors): ?array {
    if (!is_array($raw) || !pd_is_list($raw['sections'] ?? null)) {
        $errors[$field] = 'Isi dokumen tidak valid: daftar bagian (sections) wajib ada.';
        return null;
    }
    if (count($raw['sections']) > 200) {
        $errors[$field] = 'Isi dokumen maksimal 200 bagian.';
        return null;
    }
    $content = [];
    if (array_key_exists('title', $raw) && $raw['title'] !== null) {
        if (!is_string($raw['title']) || mb_strlen($raw['title']) > 255) {
            $errors[$field] = 'Judul isi dokumen maksimal 255 karakter.';
            return null;
        }
        $content['title'] = $raw['title'];
    }
    $sections = [];
    $ids = [];
    foreach ($raw['sections'] as $i => $s) {
        $n = $i + 1;
        if (!is_array($s) || !is_string($s['id'] ?? null) || !preg_match('/^[A-Za-z0-9_.-]{1,64}$/', $s['id'])) {
            $errors[$field] = "Bagian ke-$n: id wajib diisi (huruf, angka, _ . -, maks. 64).";
            return null;
        }
        if (isset($ids[$s['id']])) {
            $errors[$field] = "Bagian ke-$n: id \"{$s['id']}\" dipakai lebih dari sekali.";
            return null;
        }
        $ids[$s['id']] = true;
        if (!is_string($s['title'] ?? null) || mb_strlen($s['title']) > 255) {
            $errors[$field] = "Bagian ke-$n: judul wajib berupa teks (maks. 255 karakter).";
            return null;
        }
        $section = ['id' => $s['id'], 'title' => $s['title']];
        if (array_key_exists('body', $s) && $s['body'] !== null) {
            if (!is_string($s['body']) || mb_strlen($s['body']) > 100000) {
                $errors[$field] = "Bagian ke-$n: isi harus teks (maks. 100.000 karakter).";
                return null;
            }
            $section['body'] = $s['body'];
        }
        if (array_key_exists('table', $s) && $s['table'] !== null) {
            $table = pd_valid_table($s['table']);
            if ($table === null) {
                $errors[$field] = "Bagian ke-$n: tabel tidak valid (1–30 kolom, maks. 1.000 baris berisi teks).";
                return null;
            }
            $section['table'] = $table;
        }
        if (array_key_exists('hidden', $s) && $s['hidden'] !== null) {
            if (!is_bool($s['hidden'])) {
                $errors[$field] = "Bagian ke-$n: hidden harus true atau false.";
                return null;
            }
            $section['hidden'] = $s['hidden'];
        }
        $sections[] = $section;
    }
    $content['sections'] = $sections;
    if (array_key_exists('fields', $raw) && $raw['fields'] !== null) {
        $fields = $raw['fields'];
        if (!is_array($fields) || ($fields !== [] && pd_is_list($fields)) || count($fields) > 200) {
            $errors[$field] = 'Isian tambahan (fields) harus objek (maks. 200 isian).';
            return null;
        }
        foreach ($fields as $key => $value) {
            $okKey = preg_match('/^[A-Za-z0-9_.-]{1,64}$/', (string)$key);
            $okValue = is_bool($value)
                || ((is_int($value) || is_float($value)) && is_finite((float)$value))
                || (is_string($value) && mb_strlen($value) <= 5000);
            if (!$okKey || !$okValue) {
                $errors[$field] = 'Isian tambahan (fields) hanya boleh teks, angka, atau true/false.';
                return null;
            }
        }
        $content['fields'] = (object)$fields;
    }
    if (strlen(pd_json($content)) > PD_CONTENT_MAX_BYTES) {
        $errors[$field] = 'Isi dokumen terlalu besar (maks. 256 KB).';
        return null;
    }
    return $content;
}

function pd_valid_table($raw): ?array {
    if (!is_array($raw) || !pd_is_list($raw['columns'] ?? null) || !pd_is_list($raw['rows'] ?? null)) return null;
    $cell = function ($v) {
        if (is_string($v)) return mb_strlen($v) <= 5000 ? $v : null;
        if (is_int($v) || is_float($v)) return (string)$v;
        return $v === null ? '' : null;
    };
    $columns = [];
    if (count($raw['columns']) < 1 || count($raw['columns']) > 30 || count($raw['rows']) > 1000) return null;
    foreach ($raw['columns'] as $c) {
        $c = $cell($c);
        if ($c === null) return null;
        $columns[] = $c;
    }
    $rows = [];
    foreach ($raw['rows'] as $r) {
        if (!pd_is_list($r) || count($r) > 30) return null;
        $row = [];
        foreach ($r as $c) {
            $c = $cell($c);
            if ($c === null) return null;
            $row[] = $c;
        }
        $rows[] = $row;
    }
    return ['columns' => $columns, 'rows' => $rows];
}

// Stored content JSON → DocContent (`fields` stays a JSON object even when empty)
function pd_content_out(?string $json): array {
    $content = json_decode((string)$json, true);
    if (!is_array($content) || !pd_is_list($content['sections'] ?? null)) return ['sections' => []];
    if (array_key_exists('fields', $content)) $content['fields'] = (object)(is_array($content['fields']) ? $content['fields'] : []);
    return $content;
}

// PaymentTerm[]: 1–12 terms, unique keys, percentages 0–100 summing to 100 (± 0.01)
function pd_valid_terms($raw, string $field, array &$errors): ?array {
    if (!pd_is_list($raw) || count($raw) < 1 || count($raw) > 12) {
        $errors[$field] = 'Termin pembayaran wajib diisi (1–12 termin).';
        return null;
    }
    $before = count($errors);
    $terms = [];
    $keys = [];
    $sum = 0.0;
    foreach ($raw as $i => $t) {
        $f = "$field.$i";
        if (!is_array($t)) {
            $errors[$f] = 'Termin ke-' . ($i + 1) . ' tidak valid.';
            continue;
        }
        $key = is_string($t['key'] ?? null) ? trim($t['key']) : '';
        if (!preg_match('/^[A-Za-z0-9_-]{1,40}$/', $key)) $errors["$f.key"] = 'Kode termin hanya huruf, angka, - dan _ (maks. 40).';
        elseif (isset($keys[strtolower($key)])) $errors["$f.key"] = 'Kode termin tidak boleh sama.';
        $keys[strtolower($key)] = true;
        $label = pd_sub_text($t, 'label', "$f.label", 'Nama termin', 100, true, $errors);
        $percent = pd_number_value($t['percent'] ?? null);
        if ($percent === null || $percent < 0 || $percent > 100) $errors["$f.percent"] = 'Persentase termin harus 0 sampai 100.';
        $trigger = $t['trigger'] ?? null;
        if (!is_string($trigger) || !in_array($trigger, PD_PAYMENT_TRIGGERS, true)) $errors["$f.trigger"] = 'Pemicu termin tidak valid.';
        $dueDays = pd_number_value($t['due_days'] ?? null);
        if ($dueDays === null || floor($dueDays) !== $dueDays || $dueDays < 0 || $dueDays > 365) $errors["$f.due_days"] = 'Jatuh tempo termin harus 0 sampai 365 hari.';
        $sum += (float)$percent;
        $terms[] = ['key' => $key, 'label' => $label, 'percent' => pd_num($percent), 'trigger' => $trigger, 'due_days' => (int)$dueDays];
    }
    if (count($errors) > $before) return null;
    if (abs($sum - 100) > 0.01) {
        $errors[$field] = 'Total persentase termin harus 100%.';
        return null;
    }
    return $terms;
}

// ════════════════════════════════════════════════════════════════════════════
// Settings (hero_settings pd_* keys, spec §3)
// ════════════════════════════════════════════════════════════════════════════

function pd_default_settings(): array {
    return [
        'company' => [
            'name' => 'PT Garuda Nexa Bahtera', 'address' => '', 'city' => '', 'phone' => '', 'email' => '',
            'website' => 'https://garudanexa.com', 'npwp' => '', 'signatory_name' => '', 'signatory_title' => 'Direktur',
            'bank_accounts' => [['bank' => '', 'number' => '', 'holder' => '']],
        ],
        'numbering' => ['prefix' => 'GNB'],
        'tax' => ['ppn_enabled' => false, 'ppn_rate' => 12, 'dpp_numerator' => 11, 'dpp_denominator' => 12, 'pph23_rate' => 2],
        'payment_terms' => [
            ['key' => 'dp', 'label' => 'Uang muka (DP)', 'percent' => 50, 'trigger' => 'kontrak', 'due_days' => 7],
            ['key' => 'termin2', 'label' => 'Termin 2', 'percent' => 30, 'trigger' => 'uji', 'due_days' => 7],
            ['key' => 'pelunasan', 'label' => 'Pelunasan', 'percent' => 20, 'trigger' => 'serah_terima', 'due_days' => 7],
        ],
        'sla_defaults' => [
            'support_hours' => 'Senin–Jumat 09.00–17.00 WIB', 'uptime' => '99,5%',
            'priorities' => [
                ['level' => 'P1 – Kritis', 'response' => '2 jam', 'resolution' => '1 hari kerja'],
                ['level' => 'P2 – Tinggi', 'response' => '4 jam', 'resolution' => '2 hari kerja'],
                ['level' => 'P3 – Normal', 'response' => '1 hari kerja', 'resolution' => '5 hari kerja'],
            ],
        ],
    ];
}

// Validates one settings object (pd_settings_save); null when invalid (messages in $errors as "<name>.<field>")
function pd_valid_setting(string $name, $raw, array &$errors): ?array {
    if ($name === 'payment_terms') return pd_valid_terms($raw, 'payment_terms', $errors);
    if (!is_array($raw) || ($raw !== [] && pd_is_list($raw))) {
        $errors[$name] = 'Pengaturan tidak valid.';
        return null;
    }
    $before = count($errors);
    $out = [];
    if ($name === 'company') {
        $out['name'] = pd_sub_text($raw, 'name', 'company.name', 'Nama perusahaan', 255, true, $errors);
        $out['address'] = pd_sub_text($raw, 'address', 'company.address', 'Alamat', 500, false, $errors);
        $out['city'] = pd_sub_text($raw, 'city', 'company.city', 'Kota', 120, false, $errors);
        $out['phone'] = pd_sub_text($raw, 'phone', 'company.phone', 'Telepon', 50, false, $errors);
        $out['email'] = strtolower(pd_sub_text($raw, 'email', 'company.email', 'Email', 255, false, $errors));
        if ($out['email'] !== '' && !filter_var($out['email'], FILTER_VALIDATE_EMAIL)) $errors['company.email'] = 'Format email tidak valid.';
        $out['website'] = pd_sub_text($raw, 'website', 'company.website', 'Website', 255, false, $errors);
        if ($out['website'] !== '' && !preg_match('#^https?://[^\s<>"]+$#i', $out['website'])) $errors['company.website'] = 'Website harus diawali http:// atau https://.';
        $out['npwp'] = pd_sub_text($raw, 'npwp', 'company.npwp', 'NPWP', 32, false, $errors);
        if ($out['npwp'] !== '' && !preg_match('/^[0-9 .-]+$/', $out['npwp'])) $errors['company.npwp'] = 'NPWP hanya angka, titik, dan tanda hubung.';
        $out['signatory_name'] = pd_sub_text($raw, 'signatory_name', 'company.signatory_name', 'Nama penanda tangan', 255, false, $errors);
        $out['signatory_title'] = pd_sub_text($raw, 'signatory_title', 'company.signatory_title', 'Jabatan penanda tangan', 255, false, $errors);
        $accounts = $raw['bank_accounts'] ?? [];
        if (!pd_is_list($accounts) || count($accounts) > 5) {
            $errors['company.bank_accounts'] = 'Rekening bank maksimal 5.';
            $accounts = [];
        }
        $out['bank_accounts'] = [];
        foreach ($accounts as $i => $a) {
            $a = is_array($a) ? $a : [];
            $f = "company.bank_accounts.$i";
            $account = [
                'bank' => pd_sub_text($a, 'bank', "$f.bank", 'Nama bank', 100, false, $errors),
                'number' => pd_sub_text($a, 'number', "$f.number", 'Nomor rekening', 50, false, $errors),
                'holder' => pd_sub_text($a, 'holder', "$f.holder", 'Atas nama', 255, false, $errors),
            ];
            if ($account['number'] !== '' && !preg_match('/^[0-9 .-]+$/', $account['number'])) $errors["$f.number"] = 'Nomor rekening hanya angka.';
            $out['bank_accounts'][] = $account;
        }
    } elseif ($name === 'numbering') {
        $prefix = pd_sub_text($raw, 'prefix', 'numbering.prefix', 'Prefix nomor', 10, true, $errors);
        if ($prefix !== '' && !preg_match('/^[A-Za-z0-9-]{1,10}$/', $prefix)) $errors['numbering.prefix'] = 'Prefix nomor hanya huruf, angka, dan tanda hubung (maks. 10).';
        $out['prefix'] = $prefix;
    } elseif ($name === 'tax') {
        $out['ppn_enabled'] = pd_bool($raw['ppn_enabled'] ?? false);
        $limits = ['ppn_rate' => [0, 100, 'Tarif PPN'], 'dpp_numerator' => [0.01, 1000, 'Pembilang DPP'], 'dpp_denominator' => [0.01, 1000, 'Penyebut DPP'], 'pph23_rate' => [0, 100, 'Tarif PPh 23']];
        foreach ($limits as $key => [$min, $max, $label]) {
            $v = pd_number_value($raw[$key] ?? null);
            if ($v === null || $v < $min || $v > $max) $errors["tax.$key"] = "$label harus angka $min sampai $max.";
            $out[$key] = pd_num((float)$v);
        }
    } elseif ($name === 'sla_defaults') {
        $out['support_hours'] = pd_sub_text($raw, 'support_hours', 'sla_defaults.support_hours', 'Jam layanan', 255, false, $errors);
        $out['uptime'] = pd_sub_text($raw, 'uptime', 'sla_defaults.uptime', 'Target uptime', 50, false, $errors);
        $priorities = $raw['priorities'] ?? [];
        if (!pd_is_list($priorities) || count($priorities) > 10) {
            $errors['sla_defaults.priorities'] = 'Prioritas SLA maksimal 10.';
            $priorities = [];
        }
        $out['priorities'] = [];
        foreach ($priorities as $i => $p) {
            $p = is_array($p) ? $p : [];
            $f = "sla_defaults.priorities.$i";
            $out['priorities'][] = [
                'level' => pd_sub_text($p, 'level', "$f.level", 'Level prioritas', 100, true, $errors),
                'response' => pd_sub_text($p, 'response', "$f.response", 'Waktu respons', 100, false, $errors),
                'resolution' => pd_sub_text($p, 'resolution', "$f.resolution", 'Waktu penyelesaian', 100, false, $errors),
            ];
        }
    }
    return count($errors) > $before ? null : $out;
}

// All five settings objects; a missing or invalid stored value falls back to its default
function pd_settings(mysqli $conn, bool $reload = false): array {
    static $cache = null;
    if ($cache !== null && !$reload) return $cache;
    $stored = [];
    $keys = array_values(PD_SETTING_KEYS);
    foreach (db_all($conn, "SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN (?, ?, ?, ?, ?)", $keys) as $row) {
        $stored[$row['setting_key']] = json_decode((string)$row['setting_value'], true);
    }
    $settings = pd_default_settings();
    foreach (PD_SETTING_KEYS as $name => $key) {
        if (!isset($stored[$key])) continue;
        $ignored = [];
        $value = pd_valid_setting($name, $stored[$key], $ignored);
        if ($value !== null) $settings[$name] = $value;
    }
    return $cache = $settings;
}

// ════════════════════════════════════════════════════════════════════════════
// Numbering (§1.3), transactions, canonical JSON
// ════════════════════════════════════════════════════════════════════════════

// Next sequence of a counter, atomic: the row lock lasts until the surrounding transaction ends
function pd_next_seq(mysqli $conn, string $key, int $year): int {
    db_run($conn, "INSERT INTO pd_counters (counter_key, year, last_seq) VALUES (?, ?, LAST_INSERT_ID(1))
                   ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1)", [$key, $year]);
    return (int)db_one($conn, "SELECT LAST_INSERT_ID() AS seq")['seq'];
}

// {SEQ:3}/{CODE}/{PREFIX}/{ROMAN_MONTH}/{YEAR}, e.g. 007/PKS/GNB/X/2026 (creation date, Asia/Jakarta)
function pd_new_doc_number(mysqli $conn, string $docType): string {
    $now = pd_now();
    $year = (int)$now->format('Y');
    $code = PD_DOC_TYPES[$docType]['code'];
    $prefix = pd_settings($conn)['numbering']['prefix'];
    return sprintf('%03d/%s/%s/%s/%d', pd_next_seq($conn, $code, $year), $code, $prefix, pd_romawi((int)$now->format('n')), $year);
}

// PRJ-{YEAR}-{SEQ:3}
function pd_new_project_code(mysqli $conn): string {
    $year = (int)pd_now()->format('Y');
    return sprintf('PRJ-%d-%03d', $year, pd_next_seq($conn, 'PRJ', $year));
}

// Runs $fn in one transaction; any exception rolls everything back
function pd_tx(mysqli $conn, callable $fn) {
    $conn->begin_transaction();
    try {
        $result = $fn();
        $conn->commit();
        return $result;
    } catch (Throwable $e) {
        $conn->rollback();
        throw $e;
    }
}

function pd_insert(mysqli $conn, string $sql, array $params): int {
    db_run($conn, $sql, $params);
    return (int)$conn->insert_id;
}

function pd_json($value): string {
    return json_encode($value, PD_JSON_FLAGS);
}

// Canonical JSON for hashing: object keys sorted (byte order), no whitespace, integral floats as integers, strings
// escaped like JavaScript's JSON.stringify. Works on json_decode(..., false) values so {} and [] stay distinct.
function pd_canonical_json($value): string {
    if (is_object($value)) {
        $props = get_object_vars($value);
        ksort($props, SORT_STRING);
        $parts = [];
        foreach ($props as $key => $item) $parts[] = pd_canonical_string((string)$key) . ':' . pd_canonical_json($item);
        return '{' . implode(',', $parts) . '}';
    }
    if (is_array($value)) return '[' . implode(',', array_map('pd_canonical_json', $value)) . ']';
    if (is_string($value)) return pd_canonical_string($value);
    if (is_float($value) && is_finite($value) && floor($value) === $value && abs($value) < 1e15) return (string)(int)$value;
    return json_encode($value);
}

function pd_canonical_string(string $s): string {
    return json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS | JSON_INVALID_UTF8_SUBSTITUTE);
}

// content_hash = SHA-256 of the canonical JSON {content, snapshot} of a version (§1.2)
function pd_content_hash(string $contentJson, ?string $snapshotJson): string {
    $doc = new stdClass();
    $doc->content = json_decode($contentJson);
    $doc->snapshot = $snapshotJson === null ? null : json_decode($snapshotJson);
    return hash('sha256', pd_canonical_json($doc));
}

// ════════════════════════════════════════════════════════════════════════════
// Activity log and notifications
// ════════════════════════════════════════════════════════════════════════════

// "PKS + SOW 007/PKS/GNB/X/2026"
function pd_doc_label(array $doc): string {
    return PD_DOC_TYPES[$doc['doc_type']]['short'] . ' ' . $doc['number'];
}

function pd_log(mysqli $conn, int $projectId, ?int $documentId, ?array $user, string $action, string $detail): void {
    db_run($conn, "INSERT INTO pd_activity (project_id, document_id, user_id, action, detail) VALUES (?, ?, ?, ?, ?)",
        [$projectId, $documentId, $user ? (int)$user['id'] : null, $action, $detail === '' ? null : mb_substr($detail, 0, 500)]);
}

// In-app notification for one user (user_id) or every user of a role (role); dedupe_key makes it unique
function pd_notify(mysqli $conn, array $n): void {
    db_run($conn, "INSERT IGNORE INTO pd_notifications (user_id, role, type, title, body, link, project_id, dedupe_key)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        $n['user_id'] ?? null, $n['role'] ?? null, $n['type'], mb_substr($n['title'], 0, 255),
        isset($n['body']) ? mb_substr($n['body'], 0, 500) : null, $n['link'] ?? null, $n['project_id'] ?? null, $n['dedupe_key'] ?? null,
    ]);
}

// In-app paths of a document page for the admin and the customer account
function pd_doc_link(string $audience, int $projectId, int $docId): string {
    return ($audience === 'customer' ? '/akun/proyek/' : '/admin/proyek/') . $projectId . '/dokumen/' . $docId;
}
