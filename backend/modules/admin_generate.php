<?php
// Menu admin "Generate" (permintaan pemilik 2026-11-01): invoice dan proposal buatan super admin, diketik manual atau
// didikte lewat suara, disimpan di admin_invoices + admin_invoice_items dan admin_proposals
// (database/migrations/2026-11-01_055_admin_generate.sql). Dokumennya (kop, pratinjau A4, cetak, PDF) dibuat di browser
// dari JSON di sini (src/pages/admin/generate/docModel.ts).
// backend/modules/admin_generate.js berisi bagian yang sama untuk server Node: nama aksi, validasi, hitungan total,
// bentuk JSON, kode HTTP dan `code` harus identik (__tests__/backend/admin-generate.test.ts menjalankan keduanya).
//
// api.php memanggil handle_generate_action() setelah cek akses (authorize_request): semua aksi gen_* ada di
// ADMIN_ACTIONS, dan setiap handler memeriksa peran admin lagi. Semua aksi hanya POST.
//   gen_invoices_list / gen_proposals_list   {q?} → {invoices|proposals: ringkasan[], next_number}
//   gen_invoice_get / gen_proposal_get       {id} → {invoice|proposal}
//   gen_invoice_save / gen_proposal_save     {id?, …isi form} → {invoice|proposal}; nomor & total diisi server
//   gen_invoice_delete / gen_proposal_delete {id} → {}
//   gen_voice_parse                          {kind: invoice|proposal, transcript} → {data, provider}
// gen_voice_parse merapikan transkrip suara menjadi isian form lewat penyedia AI Nexa (kunci & saklar di tab admin
// Tanya Nexa, nexa_resolve_provider; saklar widget nexa_enabled tidak berlaku di sini). Tanpa penyedia → 503
// GEN_AI_OFFLINE, penyedia gagal → 503 GEN_AI_UNAVAILABLE, jawaban bukan JSON → 502 GEN_AI_BAD_OUTPUT; di semua kasus
// itu halaman memakai parser lokal (src/pages/admin/generate/voiceParser.ts).
//
// Uang = rupiah bulat. Pembulatan setengah ke atas lewat floor(x + 0.5) dengan aritmetika double, jadi PHP, Node, dan
// pratinjau di browser (calcTotals di src/pages/admin/generate/types.ts) menghasilkan angka yang sama.
// Uses from api.php: ApiError, db_run/db_all/db_one, in_int, env_value, rate_limit_wait/rate_limit_hit,
// too_many_attempts; from nexa.php: nexa_js_trim, nexa_config_rows, nexa_resolve_provider, nexa_claude_reply,
// nexa_gemini_reply, nexa_gemini_models, nexa_custom_reply.

const GEN_TIMEZONE = 'Asia/Jakarta';
const GEN_JSON_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE;
const GEN_DATE_PATTERN = '/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/D';
const GEN_EMAIL_PATTERN = "/^[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$/D";
const GEN_PHONE_PATTERN = '/^\+?[0-9 ().-]{6,39}$/D';
const GEN_QTY_PATTERN = '/^[0-9]{1,6}(\.[0-9]{1,2})?$/D';
const GEN_RATE_PATTERN = '/^[0-9]{1,3}(\.[0-9]{1,2})?$/D';
const GEN_MONEY_PATTERN = '/^[0-9]{1,15}(\.[0-9]+)?$/D';
const GEN_INVOICE_STATUSES = ['draft', 'terkirim', 'lunas'];
const GEN_PROPOSAL_STATUSES = ['draft', 'terkirim', 'disetujui', 'ditolak'];
const GEN_DISCOUNT_TYPES = ['amount', 'percent'];
// Batas isian (karakter = code point; mb_strlen di sini, [...s].length di admin_generate.js, GEN_LIMITS di types.ts)
const GEN_LIMITS = [
    'name' => 150, 'company' => 150, 'email' => 150, 'phone' => 40, 'address' => 1000,
    'description' => 500, 'unit' => 30, 'items' => 100,
    'notes' => 5000, 'payment_info' => 2000,
    'title' => 200, 'summary' => 10000, 'scope_item' => 500, 'scope' => 50,
    'phase' => 200, 'duration' => 100, 'phase_description' => 1000, 'timeline' => 30, 'terms' => 10000,
    'transcript' => 4000,
];
const GEN_QTY_MAX = 100000;
const GEN_PRICE_MAX = 100000000000;      // Rp100 miliar per satuan
const GEN_TOTAL_MAX = 1000000000000000;  // Rp1 kuadriliun: di bawah 2^53, jadi tetap pasti di JavaScript
const GEN_LIST_LIMIT = 300;
const GEN_AI_PER_HOUR = 60;              // permintaan rapikan suara per admin per jam (biaya kunci AI pemilik)
const GEN_AI_MAX_TOKENS = 2048;
const GEN_NOT_MIGRATED = 'Tabel Generate belum ada: jalankan migrasi database/migrations/2026-11-01_055_admin_generate.sql.';

// Instruksi AI untuk merapikan transkrip (sama persis dengan GEN_AI_INSTRUCTIONS di admin_generate.js)
const GEN_AI_INSTRUCTIONS = <<<'TXT'
Kamu membantu admin PT Garuda Nexa Bahtera mengisi form dokumen dari transkrip suara berbahasa Indonesia. Transkrip hasil pengenalan suara bisa tanpa tanda baca, salah ketik, atau berisi angka yang diucapkan dengan kata.

Tugasmu: ambil data yang benar-benar disebut di transkrip lalu rapikan. Balas HANYA dengan satu objek JSON yang valid, tanpa teks lain dan tanpa blok kode.

Aturan:
- Jangan mengarang. Kunci yang tidak disebut di transkrip tidak usah ditulis.
- Nama orang, perusahaan, dan alamat ditulis rapi dengan huruf kapital di awal kata (PT, CV, Tbk tetap kapital).
- Uang dan harga ditulis sebagai bilangan bulat rupiah tanpa titik: "1,5 juta" = 1500000, "satu juta lima ratus ribu" = 1500000, "750 ribu" = 750000, "2 M" atau "2 miliar" = 2000000000.
- Tanggal ditulis YYYY-MM-DD. Tanggal relatif ("besok", "minggu depan", "30 hari lagi", "akhir bulan") dihitung dari HARI INI. Bulan tanpa tahun = tahun HARI INI, kecuali tanggalnya sudah lewat untuk jatuh tempo atau masa berlaku (pakai tahun berikutnya).
- Email yang diucapkan ("budi at gmail titik com", "budi et gmail dot com") ditulis budi@gmail.com, huruf kecil tanpa spasi.
- Nomor telepon hanya angka (boleh diawali +), contoh 081234567890.
- qty adalah jumlah (bilangan, boleh desimal), price adalah harga satuan. Bila yang disebut harga total untuk beberapa unit, bagi dengan qty. Bila qty tidak disebut, qty = 1.
- Kalimat deskripsi dirapikan menjadi bahasa Indonesia baku yang ringkas.
TXT;

const GEN_AI_SCHEMA_INVOICE = <<<'TXT'
Jenis dokumen: INVOICE. Kunci JSON yang boleh dipakai:
{"client_name": string, "client_company": string, "client_email": string, "client_phone": string, "client_address": string,
 "date": "YYYY-MM-DD" (tanggal invoice), "due_date": "YYYY-MM-DD" (jatuh tempo),
 "items": [{"description": string, "qty": number, "unit": string (paket, bulan, unit, …), "price": integer}],
 "discount_type": "amount" | "percent", "discount_value": number (rupiah bila amount, persen bila percent),
 "tax_enabled": boolean (PPN dipakai), "tax_rate": number (persen PPN),
 "notes": string (catatan), "payment_info": string (rekening / cara bayar), "status": "draft" | "terkirim" | "lunas"}
TXT;

const GEN_AI_SCHEMA_PROPOSAL = <<<'TXT'
Jenis dokumen: PROPOSAL PENAWARAN PROYEK. Kunci JSON yang boleh dipakai:
{"client_name": string, "client_company": string, "client_email": string, "client_phone": string, "client_address": string,
 "date": "YYYY-MM-DD" (tanggal proposal), "valid_until": "YYYY-MM-DD" (masa berlaku penawaran),
 "title": string (judul proyek), "summary": string (latar belakang / ringkasan, 1–3 paragraf rapi),
 "scope": [string] (ruang lingkup / fitur, satu fitur per butir),
 "timeline": [{"phase": string, "duration": string (mis. "2 minggu"), "description": string}],
 "items": [{"description": string, "qty": number, "unit": string, "price": integer}] (rincian biaya),
 "tax_enabled": boolean, "tax_rate": number, "terms": string (syarat & ketentuan, satu ketentuan per baris)}
TXT;

function handle_generate_action(mysqli $conn, string $action, array $input, ?array $user): bool {
    static $handlers = [
        'gen_invoices_list' => 'gen_invoices_list',
        'gen_invoice_get' => 'gen_invoice_get',
        'gen_invoice_save' => 'gen_invoice_save',
        'gen_invoice_delete' => 'gen_invoice_delete',
        'gen_proposals_list' => 'gen_proposals_list',
        'gen_proposal_get' => 'gen_proposal_get',
        'gen_proposal_save' => 'gen_proposal_save',
        'gen_proposal_delete' => 'gen_proposal_delete',
        'gen_voice_parse' => 'gen_voice_parse',
    ];
    if (!isset($handlers[$action])) return false;
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        throw new ApiError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    }
    gen_require_admin($user);
    try {
        $data = call_user_func($handlers[$action], $conn, $input, $user);
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() === 1146) throw new ApiError(GEN_NOT_MIGRATED, 503, 'GEN_NOT_MIGRATED');
        throw $e;
    }
    echo json_encode(array_merge(['success' => true], $data), GEN_JSON_FLAGS);
    return true;
}

// ════════════════════════════════════════════════════════════════════════════
// Invoice
// ════════════════════════════════════════════════════════════════════════════

// Riwayat invoice terbaru dulu (cari di nomor, nama klien, perusahaan, email): { invoices, next_number }
function gen_invoices_list(mysqli $conn, array $input, ?array $user): array {
    [$where, $params] = gen_search_clause($input, ['invoice_number', 'client_name', 'client_company', 'client_email']);
    $rows = db_all($conn, "SELECT * FROM admin_invoices $where ORDER BY invoice_date DESC, id DESC LIMIT " . GEN_LIST_LIMIT, $params);
    return [
        'invoices' => array_map('gen_invoice_summary', $rows),
        'next_number' => gen_next_number($conn, 'invoice', gen_today()),
    ];
}

function gen_invoice_get(mysqli $conn, array $input, ?array $user): array {
    return ['invoice' => gen_load_invoice($conn, in_int($input, 'id'))];
}

// Tambah (tanpa id) atau ubah invoice. Nomor diberikan saat pertama disimpan (bulan tanggal invoice) dan tidak berubah.
function gen_invoice_save(mysqli $conn, array $input, ?array $user): array {
    $id = in_int($input, 'id');
    if ($id > 0 && !db_one($conn, "SELECT id FROM admin_invoices WHERE id = ? LIMIT 1", [$id])) throw gen_not_found('invoice');
    [$data, $errors] = gen_validate_invoice($input);
    if ($errors) throw new ApiError(reset($errors), 400, 'VALIDATION', $errors);
    $values = [
        $data['date'], gen_null_date($data['due_date']), $data['client_name'], $data['client_company'], $data['client_email'],
        $data['client_phone'], $data['client_address'], $data['discount_type'], (float)$data['discount_value'],
        $data['tax_enabled'] ? 1 : 0, (float)$data['tax_rate'], $data['subtotal'], $data['discount_amount'], $data['tax_amount'],
        $data['total'], $data['notes'], $data['payment_info'], $data['status'],
    ];
    $columns = 'invoice_date = ?, due_date = ?, client_name = ?, client_company = ?, client_email = ?, client_phone = ?,
                client_address = ?, discount_type = ?, discount_value = ?, tax_enabled = ?, tax_rate = ?, subtotal = ?,
                discount_amount = ?, tax_amount = ?, total = ?, notes = ?, payment_info = ?, status = ?';
    for ($attempt = 0; ; $attempt++) {
        $conn->begin_transaction();
        try {
            if ($id > 0) {
                db_run($conn, "UPDATE admin_invoices SET $columns WHERE id = ?", array_merge($values, [$id]));
                db_run($conn, "DELETE FROM admin_invoice_items WHERE invoice_id = ?", [$id]);
                $invoiceId = $id;
            } else {
                $number = gen_next_number($conn, 'invoice', $data['date']);
                db_run($conn, "INSERT INTO admin_invoices SET invoice_number = ?, created_by = ?, $columns",
                    array_merge([$number, (int)($user['id'] ?? 0) ?: null], $values));
                $invoiceId = (int)$conn->insert_id;
            }
            foreach ($data['items'] as $i => $item) {
                db_run($conn, "INSERT INTO admin_invoice_items (invoice_id, sort_order, description, qty, unit, price, subtotal)
                               VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [$invoiceId, $i, $item['description'], (float)$item['qty'], $item['unit'], $item['price'], $item['subtotal']]);
            }
            $conn->commit();
            break;
        } catch (ApiError $e) {
            $conn->rollback();
            // Nomor yang sama diambil permintaan lain pada saat bersamaan: ambil nomor berikutnya
            if ($e->status !== 409 || $id > 0 || $attempt >= 2) throw $e;
        } catch (Throwable $e) {
            $conn->rollback();
            throw $e;
        }
    }
    return ['invoice' => gen_load_invoice($conn, $invoiceId)];
}

function gen_invoice_delete(mysqli $conn, array $input, ?array $user): array {
    $id = in_int($input, 'id');
    if ($id <= 0 || !db_one($conn, "SELECT id FROM admin_invoices WHERE id = ? LIMIT 1", [$id])) throw gen_not_found('invoice');
    // Item ikut terhapus (ON DELETE CASCADE); tetap dihapus eksplisit untuk tabel tanpa foreign key
    db_run($conn, "DELETE FROM admin_invoice_items WHERE invoice_id = ?", [$id]);
    db_run($conn, "DELETE FROM admin_invoices WHERE id = ?", [$id]);
    return [];
}

function gen_load_invoice(mysqli $conn, int $id): array {
    $row = $id > 0 ? db_one($conn, "SELECT * FROM admin_invoices WHERE id = ? LIMIT 1", [$id]) : null;
    if (!$row) throw gen_not_found('invoice');
    $items = db_all($conn, "SELECT description, qty, unit, price, subtotal FROM admin_invoice_items
                            WHERE invoice_id = ? ORDER BY sort_order ASC, id ASC", [$id]);
    return gen_invoice_out($row, $items);
}

function gen_invoice_summary(array $row): array {
    return [
        'id' => (int)$row['id'],
        'number' => (string)$row['invoice_number'],
        'date' => gen_date_out($row['invoice_date']),
        'due_date' => gen_date_out($row['due_date']),
        'client_name' => (string)$row['client_name'],
        'client_company' => (string)$row['client_company'],
        'total' => (int)$row['total'],
        'status' => (string)$row['status'],
        'updated_at' => (string)$row['updated_at'],
    ];
}

function gen_invoice_out(array $row, array $items): array {
    return array_merge(gen_invoice_summary($row), [
        'client_email' => (string)$row['client_email'],
        'client_phone' => (string)$row['client_phone'],
        'client_address' => (string)$row['client_address'],
        'items' => array_map('gen_item_out', $items),
        'discount_type' => in_array($row['discount_type'], GEN_DISCOUNT_TYPES, true) ? $row['discount_type'] : 'amount',
        'discount_value' => gen_num_out($row['discount_value']),
        'tax_enabled' => (int)$row['tax_enabled'] === 1,
        'tax_rate' => gen_num_out($row['tax_rate']),
        'subtotal' => (int)$row['subtotal'],
        'discount_amount' => (int)$row['discount_amount'],
        'tax_amount' => (int)$row['tax_amount'],
        'notes' => (string)($row['notes'] ?? ''),
        'payment_info' => (string)($row['payment_info'] ?? ''),
        'created_at' => (string)$row['created_at'],
    ]);
}

// ════════════════════════════════════════════════════════════════════════════
// Proposal
// ════════════════════════════════════════════════════════════════════════════

function gen_proposals_list(mysqli $conn, array $input, ?array $user): array {
    [$where, $params] = gen_search_clause($input, ['proposal_number', 'client_name', 'client_company', 'client_email', 'title']);
    $rows = db_all($conn, "SELECT id, proposal_number, proposal_date, valid_until, client_name, client_company, title, total,
                                  status, updated_at
                           FROM admin_proposals $where ORDER BY proposal_date DESC, id DESC LIMIT " . GEN_LIST_LIMIT, $params);
    return [
        'proposals' => array_map('gen_proposal_summary', $rows),
        'next_number' => gen_next_number($conn, 'proposal', gen_today()),
    ];
}

function gen_proposal_get(mysqli $conn, array $input, ?array $user): array {
    return ['proposal' => gen_load_proposal($conn, in_int($input, 'id'))];
}

function gen_proposal_save(mysqli $conn, array $input, ?array $user): array {
    $id = in_int($input, 'id');
    if ($id > 0 && !db_one($conn, "SELECT id FROM admin_proposals WHERE id = ? LIMIT 1", [$id])) throw gen_not_found('proposal');
    [$data, $errors] = gen_validate_proposal($input);
    if ($errors) throw new ApiError(reset($errors), 400, 'VALIDATION', $errors);
    $values = [
        $data['date'], gen_null_date($data['valid_until']), $data['client_name'], $data['client_company'], $data['client_email'],
        $data['client_phone'], $data['client_address'], $data['title'], $data['summary'],
        json_encode($data['scope'], GEN_JSON_FLAGS), json_encode($data['timeline'], GEN_JSON_FLAGS), json_encode($data['items'], GEN_JSON_FLAGS),
        $data['tax_enabled'] ? 1 : 0, (float)$data['tax_rate'], $data['subtotal'], $data['tax_amount'], $data['total'],
        $data['terms'], $data['status'],
    ];
    $columns = 'proposal_date = ?, valid_until = ?, client_name = ?, client_company = ?, client_email = ?, client_phone = ?,
                client_address = ?, title = ?, summary = ?, scope = ?, timeline = ?, items = ?, tax_enabled = ?, tax_rate = ?,
                subtotal = ?, tax_amount = ?, total = ?, terms = ?, status = ?';
    if ($id > 0) {
        db_run($conn, "UPDATE admin_proposals SET $columns WHERE id = ?", array_merge($values, [$id]));
        return ['proposal' => gen_load_proposal($conn, $id)];
    }
    for ($attempt = 0; ; $attempt++) {
        try {
            $number = gen_next_number($conn, 'proposal', $data['date']);
            db_run($conn, "INSERT INTO admin_proposals SET proposal_number = ?, created_by = ?, $columns",
                array_merge([$number, (int)($user['id'] ?? 0) ?: null], $values));
            break;
        } catch (ApiError $e) {
            if ($e->status !== 409 || $attempt >= 2) throw $e;
        }
    }
    return ['proposal' => gen_load_proposal($conn, (int)$conn->insert_id)];
}

function gen_proposal_delete(mysqli $conn, array $input, ?array $user): array {
    $id = in_int($input, 'id');
    if ($id <= 0 || !db_one($conn, "SELECT id FROM admin_proposals WHERE id = ? LIMIT 1", [$id])) throw gen_not_found('proposal');
    db_run($conn, "DELETE FROM admin_proposals WHERE id = ?", [$id]);
    return [];
}

function gen_load_proposal(mysqli $conn, int $id): array {
    $row = $id > 0 ? db_one($conn, "SELECT * FROM admin_proposals WHERE id = ? LIMIT 1", [$id]) : null;
    if (!$row) throw gen_not_found('proposal');
    return gen_proposal_out($row);
}

function gen_proposal_summary(array $row): array {
    return [
        'id' => (int)$row['id'],
        'number' => (string)$row['proposal_number'],
        'date' => gen_date_out($row['proposal_date']),
        'valid_until' => gen_date_out($row['valid_until']),
        'client_name' => (string)$row['client_name'],
        'client_company' => (string)$row['client_company'],
        'title' => (string)$row['title'],
        'total' => (int)$row['total'],
        'status' => (string)$row['status'],
        'updated_at' => (string)$row['updated_at'],
    ];
}

function gen_proposal_out(array $row): array {
    $scope = gen_json_list($row['scope'] ?? null);
    $timeline = gen_json_list($row['timeline'] ?? null);
    $items = gen_json_list($row['items'] ?? null);
    return array_merge(gen_proposal_summary($row), [
        'client_email' => (string)$row['client_email'],
        'client_phone' => (string)$row['client_phone'],
        'client_address' => (string)$row['client_address'],
        'summary' => (string)($row['summary'] ?? ''),
        'scope' => array_values(array_filter($scope, 'is_string')),
        'timeline' => array_map(function ($t) {
            return [
                'phase' => (string)($t['phase'] ?? ''),
                'duration' => (string)($t['duration'] ?? ''),
                'description' => (string)($t['description'] ?? ''),
            ];
        }, array_values(array_filter($timeline, 'is_array'))),
        'items' => array_map('gen_item_out', array_values(array_filter($items, 'is_array'))),
        'tax_enabled' => (int)$row['tax_enabled'] === 1,
        'tax_rate' => gen_num_out($row['tax_rate']),
        'subtotal' => (int)$row['subtotal'],
        'tax_amount' => (int)$row['tax_amount'],
        'terms' => (string)($row['terms'] ?? ''),
        'created_at' => (string)$row['created_at'],
    ]);
}

// ════════════════════════════════════════════════════════════════════════════
// Rapikan transkrip suara dengan Nexa AI
// ════════════════════════════════════════════════════════════════════════════

function gen_voice_parse(mysqli $conn, array $input, ?array $user): array {
    $kind = $input['kind'] ?? null;
    if ($kind !== 'invoice' && $kind !== 'proposal') throw new ApiError('Jenis dokumen tidak valid.', 400, 'VALIDATION', ['kind' => 'Jenis dokumen tidak valid.']);
    $raw = $input['transcript'] ?? null;
    $transcript = is_string($raw) ? gen_multiline($raw) : '';
    if ($transcript === '') throw new ApiError('Transkrip suara masih kosong.', 400, 'VALIDATION', ['transcript' => 'Transkrip suara masih kosong.']);
    if (mb_strlen($transcript, 'UTF-8') > GEN_LIMITS['transcript']) {
        $message = 'Transkrip maksimal ' . GEN_LIMITS['transcript'] . ' karakter.';
        throw new ApiError($message, 400, 'VALIDATION', ['transcript' => $message]);
    }
    $active = nexa_resolve_provider(nexa_config_rows($conn), env_value('ANTHROPIC_API_KEY'), env_value('GEMINI_API_KEY'));
    if ($active === null) throw new ApiError('Nexa AI belum aktif: isi kunci AI di tab Tanya Nexa.', 503, 'GEN_AI_OFFLINE');

    $limitKey = 'gen-ai|' . (int)($user['id'] ?? 0);
    $wait = rate_limit_wait($limitKey, GEN_AI_PER_HOUR);
    if ($wait) too_many_attempts($wait);
    rate_limit_hit($limitKey, 3600);

    $today = gen_today();
    $result = gen_ai_reply($active, gen_ai_system($kind), gen_ai_user_message($transcript, $today));
    if (!isset($result['reply'])) {
        error_log('[generate] ' . $result['error']);
        throw new ApiError('Nexa AI sedang tidak tersedia.', 503, 'GEN_AI_UNAVAILABLE');
    }
    $json = gen_extract_json($result['reply']);
    if ($json === null) {
        error_log('[generate] AI reply is not a JSON object');
        throw new ApiError('Jawaban Nexa AI tidak bisa dibaca.', 502, 'GEN_AI_BAD_OUTPUT');
    }
    return ['data' => gen_clean_ai($kind, $json), 'provider' => $active['provider']];
}

function gen_ai_system(string $kind): string {
    return GEN_AI_INSTRUCTIONS . "\n\n" . ($kind === 'invoice' ? GEN_AI_SCHEMA_INVOICE : GEN_AI_SCHEMA_PROPOSAL);
}

function gen_ai_user_message(string $transcript, string $today): string {
    return "HARI INI: $today\n\nTRANSKRIP:\n$transcript";
}

// Satu pertanyaan ke penyedia AI aktif (pemanggil HTTP yang sama dengan nexa_chat): ['reply'] atau ['error']
function gen_ai_reply(array $active, string $system, string $message): array {
    if ($active['provider'] === 'gemini') {
        $body = [
            'system_instruction' => ['parts' => [['text' => $system]]],
            'contents' => [['role' => 'user', 'parts' => [['text' => $message]]]],
            'generationConfig' => ['maxOutputTokens' => GEN_AI_MAX_TOKENS, 'responseMimeType' => 'application/json'],
        ];
        return nexa_gemini_reply($active['key'], nexa_gemini_models(env_value('NEXA_GEMINI_MODEL', NEXA_GEMINI_DEFAULT_MODEL)), $body);
    }
    if ($active['provider'] === 'custom') {
        $body = [
            'model' => $active['model'],
            'max_tokens' => GEN_AI_MAX_TOKENS,
            'messages' => [['role' => 'system', 'content' => $system], ['role' => 'user', 'content' => $message]],
            'stream' => false,
        ];
        return nexa_custom_reply($active['url'], $active['key'], $body);
    }
    $body = [
        'model' => env_value('NEXA_MODEL', NEXA_DEFAULT_MODEL),
        'max_tokens' => GEN_AI_MAX_TOKENS,
        'system' => [['type' => 'text', 'text' => $system]],
        'messages' => [['role' => 'user', 'content' => $message]],
        'output_config' => ['effort' => 'low'],
    ];
    return nexa_claude_reply($active['key'], $body);
}

/** Objek JSON pertama di jawaban AI (boleh dibungkus ```json … ``` atau diberi kalimat pembuka); null bila tidak ada. */
function gen_extract_json(string $text): ?array {
    $start = strpos($text, '{');
    $end = strrpos($text, '}');
    if ($start === false || $end === false || $end < $start) return null;
    $data = json_decode(substr($text, $start, $end - $start + 1), true);
    // {} (json_decode → []) dihitung objek kosong, sama dengan admin_generate.js
    return is_array($data) && ($data === [] || !gen_is_list($data)) ? $data : null;
}

/**
 * Isian dari AI yang aman dipakai form: hanya kunci yang dikenal, teks dirapikan & dipotong sesuai batas, tanggal /
 * email / telepon / angka yang tidak sah dibuang. Kunci kosong tidak ikut (form tidak menimpa isian admin dengan '').
 */
function gen_clean_ai(string $kind, array $raw): array {
    $out = [];
    $single = ['client_name' => 'name', 'client_company' => 'company', 'client_address' => 'address'];
    $multi = $kind === 'invoice'
        ? ['notes' => 'notes', 'payment_info' => 'payment_info']
        : ['title' => 'title', 'summary' => 'summary', 'terms' => 'terms'];
    foreach ($single as $key => $limit) {
        $value = gen_cut(gen_single_line(gen_ai_str($raw[$key] ?? null)), GEN_LIMITS[$limit]);
        if ($value !== '') $out[$key] = $value;
    }
    foreach ($multi as $key => $limit) {
        $value = gen_cut($key === 'title' ? gen_single_line(gen_ai_str($raw[$key] ?? null)) : gen_multiline(gen_ai_str($raw[$key] ?? null)), GEN_LIMITS[$limit]);
        if ($value !== '') $out[$key] = $value;
    }
    $email = strtolower(preg_replace('/[ \t\r\n\x0B\f]+/', '', gen_ai_str($raw['client_email'] ?? null)));
    if ($email !== '' && strlen($email) <= GEN_LIMITS['email'] && preg_match(GEN_EMAIL_PATTERN, $email)) $out['client_email'] = $email;
    $phone = preg_replace('/[^0-9+]/', '', gen_ai_str($raw['client_phone'] ?? null));
    if ($phone !== '' && preg_match('/^\+?[0-9]{6,20}$/D', $phone)) $out['client_phone'] = $phone;
    foreach (array_merge(['date'], $kind === 'invoice' ? ['due_date'] : ['valid_until']) as $key) {
        $date = gen_ai_str($raw[$key] ?? null);
        if (gen_valid_date($date)) $out[$key] = $date;
    }
    $items = [];
    foreach (is_array($raw['items'] ?? null) && gen_is_list($raw['items']) ? $raw['items'] : [] as $item) {
        if (!is_array($item) || count($items) >= GEN_LIMITS['items']) continue;
        $description = gen_cut(gen_single_line(gen_ai_str($item['description'] ?? null)), GEN_LIMITS['description']);
        if ($description === '') continue;
        $qty = gen_ai_number($item['qty'] ?? null);
        $qty = $qty !== null && $qty > 0 && $qty <= GEN_QTY_MAX ? floor($qty * 100 + 0.5) / 100 : 1;
        $price = gen_ai_number($item['price'] ?? null);
        $items[] = [
            'description' => $description,
            'qty' => gen_num_out($qty > 0 ? $qty : 1),
            'unit' => gen_cut(gen_single_line(gen_ai_str($item['unit'] ?? null)), GEN_LIMITS['unit']),
            'price' => $price !== null && $price >= 0 && $price <= GEN_PRICE_MAX ? (int)floor($price + 0.5) : 0,
        ];
    }
    if ($items) $out['items'] = $items;
    if (is_bool($raw['tax_enabled'] ?? null)) $out['tax_enabled'] = $raw['tax_enabled'];
    $rate = gen_ai_number($raw['tax_rate'] ?? null);
    if ($rate !== null && $rate >= 0 && $rate <= 100) $out['tax_rate'] = gen_num_out(floor($rate * 100 + 0.5) / 100);
    if ($kind === 'invoice') {
        if (in_array($raw['discount_type'] ?? null, GEN_DISCOUNT_TYPES, true)) $out['discount_type'] = $raw['discount_type'];
        $discount = gen_ai_number($raw['discount_value'] ?? null);
        $percent = ($out['discount_type'] ?? 'amount') === 'percent';
        if ($discount !== null && $discount >= 0 && $discount <= ($percent ? 100 : GEN_TOTAL_MAX)) {
            $out['discount_value'] = $percent ? gen_num_out(floor($discount * 100 + 0.5) / 100) : (int)floor($discount + 0.5);
        }
        if (in_array($raw['status'] ?? null, GEN_INVOICE_STATUSES, true)) $out['status'] = $raw['status'];
    } else {
        $scope = [];
        foreach (is_array($raw['scope'] ?? null) && gen_is_list($raw['scope']) ? $raw['scope'] : [] as $line) {
            $line = gen_cut(gen_single_line(gen_ai_str($line)), GEN_LIMITS['scope_item']);
            if ($line !== '' && count($scope) < GEN_LIMITS['scope']) $scope[] = $line;
        }
        if ($scope) $out['scope'] = $scope;
        $timeline = [];
        foreach (is_array($raw['timeline'] ?? null) && gen_is_list($raw['timeline']) ? $raw['timeline'] : [] as $step) {
            if (!is_array($step) || count($timeline) >= GEN_LIMITS['timeline']) continue;
            $phase = gen_cut(gen_single_line(gen_ai_str($step['phase'] ?? null)), GEN_LIMITS['phase']);
            if ($phase === '') continue;
            $timeline[] = [
                'phase' => $phase,
                'duration' => gen_cut(gen_single_line(gen_ai_str($step['duration'] ?? null)), GEN_LIMITS['duration']),
                'description' => gen_cut(gen_multiline(gen_ai_str($step['description'] ?? null)), GEN_LIMITS['phase_description']),
            ];
        }
        if ($timeline) $out['timeline'] = $timeline;
    }
    return $out;
}

// Teks dari AI: string apa adanya, angka jadi teks, selain itu ''
function gen_ai_str($value): string {
    if (is_string($value)) return $value;
    if (is_int($value)) return (string)$value;
    return '';
}

// Angka dari AI: bilangan JSON atau teks angka biasa ("1500000", "1.5"); selain itu null
function gen_ai_number($value): ?float {
    if (is_int($value) || is_float($value)) return is_finite((float)$value) ? (float)$value : null;
    if (is_string($value) && preg_match('/^[0-9]+(\.[0-9]+)?$/D', trim($value))) return (float)trim($value);
    return null;
}

// ════════════════════════════════════════════════════════════════════════════
// Validasi & hitungan (fungsi murni, dibandingkan dengan admin_generate.js di tes)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Isi form invoice → [data bersih + total, galat per kolom]. Item kosong (tanpa deskripsi dan harga) dibuang; minimal
 * satu item. Total dihitung di sini, nilai total dari klien diabaikan.
 */
function gen_validate_invoice(array $input): array {
    $errors = [];
    $data = gen_validate_common($input, 'due_date', 'Jatuh tempo', $errors);
    $data['items'] = gen_validate_items($input['items'] ?? null, true, $errors);
    $type = $input['discount_type'] ?? 'amount';
    if (!in_array($type, GEN_DISCOUNT_TYPES, true)) {
        $errors['discount_type'] = 'Jenis diskon tidak valid.';
        $type = 'amount';
    }
    $data['discount_type'] = $type;
    $data['discount_value'] = $type === 'percent'
        ? gen_rate($input, 'discount_value', 'Diskon (%)', $errors)
        : gen_money($input['discount_value'] ?? null, 'discount_value', 'Diskon', GEN_TOTAL_MAX, $errors);
    $data['tax_enabled'] = gen_flag($input['tax_enabled'] ?? null);
    $data['tax_rate'] = gen_rate($input, 'tax_rate', 'PPN (%)', $errors, 11);
    $data['notes'] = gen_text_field($input, 'notes', 'Catatan', GEN_LIMITS['notes'], true, false, $errors);
    $data['payment_info'] = gen_text_field($input, 'payment_info', 'Info pembayaran', GEN_LIMITS['payment_info'], true, false, $errors);
    $data['status'] = gen_status($input, GEN_INVOICE_STATUSES, $errors);
    $totals = gen_calc_totals($data['items'], $data['discount_type'], $data['discount_value'], $data['tax_enabled'], $data['tax_rate']);
    if ($totals['total'] > GEN_TOTAL_MAX || $totals['subtotal'] > GEN_TOTAL_MAX) $errors['items'] = $errors['items'] ?? 'Total terlalu besar.';
    return [array_merge($data, $totals), $errors];
}

/** Isi form proposal → [data bersih + total, galat per kolom]. Minimal judul proyek dan satu item biaya. */
function gen_validate_proposal(array $input): array {
    $errors = [];
    $data = gen_validate_common($input, 'valid_until', 'Masa berlaku', $errors);
    $data['title'] = gen_text_field($input, 'title', 'Judul proyek', GEN_LIMITS['title'], false, true, $errors);
    $data['summary'] = gen_text_field($input, 'summary', 'Latar belakang', GEN_LIMITS['summary'], true, false, $errors);
    $data['scope'] = gen_validate_scope($input['scope'] ?? null, $errors);
    $data['timeline'] = gen_validate_timeline($input['timeline'] ?? null, $errors);
    $data['items'] = gen_validate_items($input['items'] ?? null, true, $errors);
    $data['tax_enabled'] = gen_flag($input['tax_enabled'] ?? null);
    $data['tax_rate'] = gen_rate($input, 'tax_rate', 'PPN (%)', $errors, 11);
    $data['terms'] = gen_text_field($input, 'terms', 'Syarat & ketentuan', GEN_LIMITS['terms'], true, false, $errors);
    $data['status'] = gen_status($input, GEN_PROPOSAL_STATUSES, $errors);
    $totals = gen_calc_totals($data['items'], 'amount', 0, $data['tax_enabled'], $data['tax_rate']);
    if ($totals['total'] > GEN_TOTAL_MAX || $totals['subtotal'] > GEN_TOTAL_MAX) $errors['items'] = $errors['items'] ?? 'Total terlalu besar.';
    unset($totals['discount_amount']);
    return [array_merge($data, $totals), $errors];
}

/**
 * subtotal = Σ item; diskon = rupiah atau persen dari subtotal (tidak melebihi subtotal); PPN = persen dari
 * (subtotal − diskon) bila dipakai; total = subtotal − diskon + PPN. Setengah dibulatkan ke atas (floor(x + 0.5)).
 */
function gen_calc_totals(array $items, string $discountType, $discountValue, bool $taxEnabled, $taxRate): array {
    $subtotal = 0;
    foreach ($items as $item) $subtotal += (int)$item['subtotal'];
    $discount = $discountType === 'percent'
        ? (int)floor((float)$subtotal * (float)$discountValue / 100 + 0.5)
        : (int)floor((float)$discountValue + 0.5);
    $discount = max(0, min($discount, $subtotal));
    $base = $subtotal - $discount;
    $tax = $taxEnabled ? (int)floor((float)$base * (float)$taxRate / 100 + 0.5) : 0;
    return ['subtotal' => $subtotal, 'discount_amount' => $discount, 'tax_amount' => $tax, 'total' => $base + $tax];
}

/** Tanggal, klien (nama wajib), dan tanggal kedua opsional ($dateKey ≥ tanggal dokumen). */
function gen_validate_common(array $input, string $dateKey, string $dateLabel, array &$errors): array {
    $date = $input['date'] ?? null;
    if (!is_string($date) || !gen_valid_date($date)) {
        $errors['date'] = 'Tanggal wajib diisi (format YYYY-MM-DD).';
        $date = '';
    }
    $second = $input[$dateKey] ?? null;
    if ($second === null || $second === '') {
        $second = '';
    } elseif (!is_string($second) || !gen_valid_date($second)) {
        $errors[$dateKey] = "$dateLabel tidak valid (format YYYY-MM-DD).";
        $second = '';
    } elseif ($date !== '' && $second < $date) {
        $errors[$dateKey] = "$dateLabel tidak boleh sebelum tanggal dokumen.";
    }
    $data = [
        'date' => $date,
        $dateKey => $second,
        'client_name' => gen_text_field($input, 'client_name', 'Nama klien', GEN_LIMITS['name'], false, true, $errors),
        'client_company' => gen_text_field($input, 'client_company', 'Perusahaan', GEN_LIMITS['company'], false, false, $errors),
        'client_email' => gen_text_field($input, 'client_email', 'Email', GEN_LIMITS['email'], false, false, $errors),
        'client_phone' => gen_text_field($input, 'client_phone', 'Telepon', GEN_LIMITS['phone'], false, false, $errors),
        'client_address' => gen_text_field($input, 'client_address', 'Alamat', GEN_LIMITS['address'], true, false, $errors),
    ];
    if ($data['client_email'] !== '' && !isset($errors['client_email']) && !preg_match(GEN_EMAIL_PATTERN, $data['client_email'])) {
        $errors['client_email'] = 'Format email tidak valid.';
    }
    if ($data['client_phone'] !== '' && !isset($errors['client_phone']) && !preg_match(GEN_PHONE_PATTERN, $data['client_phone'])) {
        $errors['client_phone'] = 'Nomor telepon hanya boleh angka, spasi, +, -, titik, dan tanda kurung.';
    }
    return $data;
}

/** Item biaya: [{description, qty, unit, price, subtotal}]; baris tanpa deskripsi dan tanpa harga dibuang. */
function gen_validate_items($raw, bool $required, array &$errors): array {
    if ($raw !== null && (!is_array($raw) || !gen_is_list($raw))) {
        $errors['items'] = 'Daftar item tidak valid.';
        return [];
    }
    $items = [];
    foreach ($raw ?? [] as $i => $row) {
        $key = "items.$i";
        if (!is_array($row) || ($row !== [] && gen_is_list($row))) {
            $errors[$key . '.description'] = 'Item tidak valid.';
            continue;
        }
        $descRaw = $row['description'] ?? '';
        $priceRaw = $row['price'] ?? null;
        $description = is_string($descRaw) ? gen_single_line($descRaw) : '';
        if ($description === '' && ($priceRaw === null || $priceRaw === '' || $priceRaw === 0 || $priceRaw === '0')) continue;
        if (!is_string($descRaw)) $errors[$key . '.description'] = 'Deskripsi item tidak valid.';
        elseif ($description === '') $errors[$key . '.description'] = 'Deskripsi item wajib diisi.';
        elseif (mb_strlen($description, 'UTF-8') > GEN_LIMITS['description']) $errors[$key . '.description'] = 'Deskripsi item maksimal ' . GEN_LIMITS['description'] . ' karakter.';
        $qtyRaw = $row['qty'] ?? null;
        $qty = 1.0;
        if ($qtyRaw !== null && $qtyRaw !== '') {
            $text = is_int($qtyRaw) || is_float($qtyRaw) ? gen_number_text($qtyRaw) : (is_string($qtyRaw) ? str_replace(',', '.', trim($qtyRaw)) : '');
            if (!preg_match(GEN_QTY_PATTERN, $text) || (float)$text <= 0 || (float)$text > GEN_QTY_MAX) {
                $errors[$key . '.qty'] = 'Qty harus lebih dari 0 (maksimal 2 angka desimal).';
            } else {
                $qty = (float)$text;
            }
        }
        $unitRaw = $row['unit'] ?? '';
        $unit = is_string($unitRaw) ? gen_single_line($unitRaw) : '';
        if (!is_string($unitRaw) || mb_strlen($unit, 'UTF-8') > GEN_LIMITS['unit']) $errors[$key . '.unit'] = 'Satuan maksimal ' . GEN_LIMITS['unit'] . ' karakter.';
        $price = gen_money($priceRaw, $key . '.price', 'Harga', GEN_PRICE_MAX, $errors);
        $items[] = [
            'description' => $description,
            'qty' => gen_num_out($qty),
            'unit' => $unit,
            'price' => $price,
            'subtotal' => (int)floor($qty * (float)$price + 0.5),
        ];
    }
    if (count($items) > GEN_LIMITS['items']) $errors['items'] = 'Maksimal ' . GEN_LIMITS['items'] . ' item.';
    elseif ($required && !$items && !isset($errors['items'])) $errors['items'] = 'Tambahkan minimal satu item.';
    return $items;
}

function gen_validate_scope($raw, array &$errors): array {
    if ($raw === null) return [];
    if (!is_array($raw) || !gen_is_list($raw)) {
        $errors['scope'] = 'Ruang lingkup tidak valid.';
        return [];
    }
    $scope = [];
    foreach ($raw as $i => $line) {
        if (!is_string($line)) {
            $errors["scope.$i"] = 'Butir ruang lingkup tidak valid.';
            continue;
        }
        $line = gen_single_line($line);
        if ($line === '') continue;
        if (mb_strlen($line, 'UTF-8') > GEN_LIMITS['scope_item']) $errors["scope.$i"] = 'Satu butir maksimal ' . GEN_LIMITS['scope_item'] . ' karakter.';
        $scope[] = $line;
    }
    if (count($scope) > GEN_LIMITS['scope']) $errors['scope'] = 'Maksimal ' . GEN_LIMITS['scope'] . ' butir ruang lingkup.';
    return $scope;
}

function gen_validate_timeline($raw, array &$errors): array {
    if ($raw === null) return [];
    if (!is_array($raw) || !gen_is_list($raw)) {
        $errors['timeline'] = 'Tahapan tidak valid.';
        return [];
    }
    $timeline = [];
    foreach ($raw as $i => $row) {
        if (!is_array($row) || ($row !== [] && gen_is_list($row))) {
            $errors["timeline.$i.phase"] = 'Tahapan tidak valid.';
            continue;
        }
        $step = [];
        foreach (['phase' => 'Nama tahap', 'duration' => 'Durasi', 'description' => 'Keterangan'] as $field => $label) {
            $value = $row[$field] ?? '';
            if (!is_string($value)) {
                $errors["timeline.$i.$field"] = "$label tidak valid.";
                $value = '';
            }
            $step[$field] = $field === 'description' ? gen_multiline($value) : gen_single_line($value);
        }
        if ($step['phase'] === '' && $step['duration'] === '' && $step['description'] === '') continue;
        if ($step['phase'] === '') $errors["timeline.$i.phase"] = 'Nama tahap wajib diisi.';
        foreach (['phase' => 'phase', 'duration' => 'duration', 'description' => 'phase_description'] as $field => $limit) {
            if (mb_strlen($step[$field], 'UTF-8') > GEN_LIMITS[$limit]) $errors["timeline.$i.$field"] = 'Maksimal ' . GEN_LIMITS[$limit] . ' karakter.';
        }
        $timeline[] = $step;
    }
    if (count($timeline) > GEN_LIMITS['timeline']) $errors['timeline'] = 'Maksimal ' . GEN_LIMITS['timeline'] . ' tahapan.';
    return $timeline;
}

/** Teks satu baris atau beberapa baris; '' bila kosong. Wajib/kosong, bukan teks, dan terlalu panjang → galat. */
function gen_text_field(array $input, string $key, string $label, int $max, bool $multiline, bool $required, array &$errors): string {
    $raw = $input[$key] ?? null;
    if ($raw === null) $raw = '';
    if (!is_string($raw)) {
        $errors[$key] = "$label tidak valid.";
        return '';
    }
    $value = $multiline ? gen_multiline($raw) : gen_single_line($raw);
    if ($required && $value === '') $errors[$key] = "$label wajib diisi.";
    elseif (mb_strlen($value, 'UTF-8') > $max) $errors[$key] = "$label maksimal $max karakter.";
    return $value;
}

/** Rupiah bulat ≥ 0: bilangan JSON atau teks angka; desimal dibulatkan. Kosong = 0. */
function gen_money($raw, string $key, string $label, int $max, array &$errors): int {
    if ($raw === null || $raw === '') return 0;
    $text = is_int($raw) || is_float($raw) ? gen_number_text($raw) : (is_string($raw) ? trim($raw) : '');
    if (!preg_match(GEN_MONEY_PATTERN, $text) || (float)$text > $max) {
        $errors[$key] = "$label harus angka 0 sampai " . number_format($max, 0, ',', '.') . '.';
        return 0;
    }
    return (int)floor((float)$text + 0.5);
}

/** Persen 0–100, maksimal 2 desimal; kosong = $default. */
function gen_rate(array $input, string $key, string $label, array &$errors, $default = 0) {
    $raw = $input[$key] ?? null;
    if ($raw === null || $raw === '') return $default;
    $text = is_int($raw) || is_float($raw) ? gen_number_text($raw) : (is_string($raw) ? str_replace(',', '.', trim($raw)) : '');
    if (!preg_match(GEN_RATE_PATTERN, $text) || (float)$text > 100) {
        $errors[$key] = "$label harus 0 sampai 100.";
        return $default;
    }
    return gen_num_out((float)$text);
}

function gen_status(array $input, array $allowed, array &$errors): string {
    $status = $input['status'] ?? 'draft';
    if ($status === null || $status === '') return 'draft';
    if (!in_array($status, $allowed, true)) {
        $errors['status'] = 'Status tidak valid.';
        return 'draft';
    }
    return $status;
}

function gen_flag($value): bool {
    return $value === true || $value === 1 || $value === '1' || $value === 'true';
}

// ════════════════════════════════════════════════════════════════════════════
// Nomor dokumen, tanggal, teks
// ════════════════════════════════════════════════════════════════════════════

/** Nomor berikutnya untuk bulan $date: INV-202611-001 / PRP-202611-001 (urut per bulan, 3 digit atau lebih). */
function gen_next_number(mysqli $conn, string $kind, string $date): string {
    [$table, $column, $prefix] = $kind === 'invoice'
        ? ['admin_invoices', 'invoice_number', 'INV']
        : ['admin_proposals', 'proposal_number', 'PRP'];
    $stem = gen_number_stem($prefix, $date);
    $numbers = array_column(db_all($conn, "SELECT $column FROM $table WHERE $column LIKE ?", [$stem . '-%']), $column);
    return gen_number_after($stem, $numbers);
}

function gen_number_stem(string $prefix, string $date): string {
    return $prefix . '-' . substr($date, 0, 4) . substr($date, 5, 2);
}

/** Nomor urut berikutnya setelah nomor terbesar yang sudah ada dengan awalan $stem. */
function gen_number_after(string $stem, array $numbers): string {
    $max = 0;
    foreach ($numbers as $number) {
        if (preg_match('/^' . preg_quote($stem, '/') . '-([0-9]{1,9})$/D', (string)$number, $m)) $max = max($max, (int)$m[1]);
    }
    return sprintf('%s-%03d', $stem, $max + 1);
}

/** WHERE untuk kotak cari daftar (LIKE dengan % dan _ di-escape) + parameternya. */
function gen_search_clause(array $input, array $columns): array {
    $raw = $input['q'] ?? '';
    $q = is_string($raw) ? mb_substr(gen_single_line($raw), 0, 100, 'UTF-8') : '';
    if ($q === '') return ['', []];
    $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q) . '%';
    $parts = array_map(function ($c) { return "$c LIKE ?"; }, $columns);
    return ['WHERE (' . implode(' OR ', $parts) . ')', array_fill(0, count($columns), $like)];
}

function gen_today(): string {
    return (new DateTime('now', new DateTimeZone(GEN_TIMEZONE)))->format('Y-m-d');
}

function gen_valid_date(string $value): bool {
    return (bool)preg_match(GEN_DATE_PATTERN, $value, $m) && checkdate((int)$m[2], (int)$m[3], (int)$m[1]) && (int)$m[1] >= 2000 && (int)$m[1] <= 2100;
}

function gen_null_date(string $value): ?string {
    return $value === '' ? null : $value;
}

function gen_date_out($value): string {
    $value = (string)($value ?? '');
    return $value === '' || strpos($value, '0000') === 0 ? '' : substr($value, 0, 10);
}

/** Angka keluaran: bulat → int (2.0 → 2), selain itu float (1.5); sama dengan Number() di admin_generate.js. */
function gen_num_out($value) {
    $n = (float)$value;
    return $n == floor($n) && abs($n) < 1e15 ? (int)$n : $n;
}

/** Bilangan sebagai teks desimal biasa (tanpa notasi e): 1.5 → "1.5", 2.0 → "2". */
function gen_number_text($value): string {
    if (is_int($value)) return (string)$value;
    if (!is_finite($value)) return '';
    if ($value == floor($value) && abs($value) < 1e15) return (string)(int)$value;
    return rtrim(rtrim(number_format($value, 10, '.', ''), '0'), '.');
}

/** Satu baris: tab & baris baru jadi spasi, deretan spasi digabung, tepi di-trim. */
function gen_single_line(string $value): string {
    return nexa_js_trim(preg_replace('/[ \t\r\n\x0B\f]+/', ' ', $value) ?? $value);
}

/** Beberapa baris: CRLF/CR jadi LF, spasi di akhir baris dibuang, lebih dari satu baris kosong digabung, tepi di-trim. */
function gen_multiline(string $value): string {
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[ \t]+\n/', "\n", $value) ?? $value;
    $value = preg_replace('/\n{3,}/', "\n\n", $value) ?? $value;
    return nexa_js_trim($value);
}

function gen_cut(string $value, int $max): string {
    return mb_strlen($value, 'UTF-8') > $max ? nexa_js_trim(mb_substr($value, 0, $max, 'UTF-8')) : $value;
}

function gen_is_list(array $value): bool {
    return $value === [] || array_keys($value) === range(0, count($value) - 1);
}

// Kolom JSON daftar → array (rusak/bukan daftar → [])
function gen_json_list($value): array {
    $list = is_string($value) ? json_decode($value, true) : null;
    return is_array($list) && gen_is_list($list) ? $list : [];
}

function gen_item_out(array $item): array {
    return [
        'description' => (string)($item['description'] ?? ''),
        'qty' => gen_num_out($item['qty'] ?? 1),
        'unit' => (string)($item['unit'] ?? ''),
        'price' => (int)($item['price'] ?? 0),
        'subtotal' => (int)($item['subtotal'] ?? 0),
    ];
}

function gen_require_admin(?array $user): array {
    if (!$user) throw new ApiError('Sesi tidak valid atau sudah berakhir. Silakan login kembali.', 401, 'UNAUTHORIZED');
    if (($user['role'] ?? '') !== 'admin') throw new ApiError('Akses ditolak: hanya admin.', 403, 'FORBIDDEN');
    return $user;
}

function gen_not_found(string $kind): ApiError {
    return $kind === 'invoice'
        ? new ApiError('Invoice tidak ditemukan.', 404, 'GEN_NOT_FOUND')
        : new ApiError('Proposal tidak ditemukan.', 404, 'GEN_NOT_FOUND');
}
