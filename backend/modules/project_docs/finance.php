<?php
// pd_* invoice and payment actions (see ../project_docs.php). The server recomputes every invoice total from the items
// (spec §4.2, never the client's totals); a payment creates its Kuitansi (status selesai) in the same transaction.

// ════════════════════════════════════════════════════════════════════════════
// Invoice math and input
// ════════════════════════════════════════════════════════════════════════════

// InvoiceTotals; identical to calcInvoice() in src/features/project-docs/engine/invoice.ts (rounding at every step)
function pd_calc_invoice(array $items, float $discount, bool $ppnEnabled, bool $pph23Enabled, array $tax): array {
    $subtotal = 0;
    foreach ($items as $item) $subtotal += pd_round($item['qty'] * $item['unit_price']);
    $discount = max(0, pd_round($discount));
    $base = max(0, $subtotal - $discount);
    $denominator = (float)$tax['dpp_denominator'];
    $dpp = $ppnEnabled && $denominator > 0 ? pd_round($base * $tax['dpp_numerator'] / $denominator) : $base;
    $ppnRate = $ppnEnabled ? $tax['ppn_rate'] : 0;
    $ppnAmount = $ppnEnabled ? pd_round($dpp * $ppnRate / 100) : 0;
    $total = $base + $ppnAmount;
    $pph23Rate = $pph23Enabled ? $tax['pph23_rate'] : 0;
    $pph23Amount = $pph23Enabled ? pd_round($base * $pph23Rate / 100) : 0;
    return [
        'subtotal' => $subtotal, 'discount' => $discount, 'base' => $base, 'dpp' => $dpp, 'ppn_rate' => pd_num($ppnRate),
        'ppn_amount' => $ppnAmount, 'total' => $total, 'pph23_rate' => pd_num($pph23Rate), 'pph23_amount' => $pph23Amount,
        'amount_due' => $total - $pph23Amount,
    ];
}

// Validated fields of pd_invoice_create / pd_invoice_update plus the recomputed totals and the document title
function pd_invoice_input(mysqli $conn, array $input, array $terms, array &$errors): array {
    $term = null;
    $termKey = $input['term_key'] ?? null;
    if ($termKey !== null && $termKey !== '') {
        foreach ($terms as $t) {
            if ($t['key'] === $termKey) $term = $t;
        }
        if ($term === null) $errors['term_key'] = 'Termin pembayaran tidak ada di proyek ini.';
    }
    $kind = pd_enum($input, 'kind', 'Jenis invoice', array_keys(PD_INVOICE_KIND_LABEL), $term === null && !isset($errors['term_key']), $errors);
    if ($kind === null && $term !== null) $kind = in_array($term['key'], ['dp', 'pelunasan'], true) ? $term['key'] : 'termin';

    $items = [];
    $rawItems = $input['items'] ?? null;
    if (!pd_is_list($rawItems) || count($rawItems) < 1 || count($rawItems) > 50) {
        $errors['items'] = 'Isi 1 sampai 50 baris tagihan.';
    } else {
        foreach ($rawItems as $i => $raw) {
            $raw = is_array($raw) ? $raw : [];
            $itemErrors = [];
            $description = pd_text($raw, 'description', 'Uraian', 500, true, $itemErrors);
            $qty = pd_number_value($raw['qty'] ?? null);
            if ($qty === null || $qty <= 0 || $qty > 1000000) $itemErrors['qty'] = 'Jumlah harus lebih dari 0 (maks. 1.000.000).';
            $price = pd_money($raw, 'unit_price', 'Harga satuan', true, $itemErrors);
            foreach ($itemErrors as $field => $message) $errors["items.$i.$field"] = 'Baris ' . ($i + 1) . ": $message";
            $items[] = ['description' => (string)$description, 'qty' => pd_num((float)$qty), 'unit_price' => pd_num((float)$price)];
        }
    }
    $discount = pd_money($input, 'discount', 'Diskon', false, $errors) ?? 0.0;
    $ppnEnabled = pd_bool($input['ppn_enabled'] ?? false);
    $pph23Enabled = pd_bool($input['pph23_enabled'] ?? false);
    $issue = pd_date($input, 'issue_date', 'Tanggal invoice', true, $errors);
    $due = pd_date($input, 'due_date', 'Jatuh tempo', true, $errors);
    if ($issue !== null && $due !== null && $due < $issue) $errors['due_date'] = 'Jatuh tempo tidak boleh sebelum tanggal invoice.';
    $notes = pd_text($input, 'notes', 'Catatan', 2000, false, $errors);
    $content = pd_valid_content($input['content'] ?? null, 'content', $errors);

    $totals = null;
    if (!$errors) {
        $totals = pd_calc_invoice($items, $discount, $ppnEnabled, $pph23Enabled, pd_settings($conn)['tax']);
        if ($totals['total'] > PD_MONEY_MAX) $errors['items'] = 'Total invoice melebihi batas Rp1.000.000.000.000.';
        elseif ($totals['amount_due'] <= 0) $errors['items'] = 'Jumlah yang harus dibayar harus lebih dari 0.';
    }
    $title = trim((string)($content['title'] ?? ''));
    if ($title === '') $title = 'Invoice ' . ($term ? $term['label'] : (PD_INVOICE_KIND_LABEL[$kind] ?? ''));
    return [
        'term_key' => $term ? $term['key'] : null, 'kind' => $kind, 'items' => $items, 'issue_date' => $issue, 'due_date' => $due,
        'notes' => $notes, 'content' => $content, 'totals' => $totals, 'title' => mb_substr($title, 0, 255),
    ];
}

// pd_invoices column values in the order of PD_INVOICE_COLUMNS
const PD_INVOICE_COLUMNS = 'term_key, kind, issue_date, due_date, items, subtotal, discount, dpp, ppn_rate, ppn_amount, pph23_rate, pph23_amount, total, amount_due, notes';
function pd_invoice_values(array $v): array {
    $t = $v['totals'];
    return [
        $v['term_key'], $v['kind'], $v['issue_date'], $v['due_date'], pd_json($v['items']), $t['subtotal'], $t['discount'], $t['dpp'],
        (float)$t['ppn_rate'], $t['ppn_amount'], (float)$t['pph23_rate'], $t['pph23_amount'], $t['total'], $t['amount_due'], $v['notes'],
    ];
}

// A term can be billed once (cancelled invoices do not count)
function pd_check_term_unbilled(mysqli $conn, int $projectId, ?string $termKey, int $exceptInvoiceId = 0): void {
    if ($termKey === null) return;
    if (db_one($conn, "SELECT id FROM pd_invoices WHERE project_id = ? AND term_key = ? AND payment_status <> 'dibatalkan' AND id <> ? LIMIT 1",
        [$projectId, $termKey, $exceptInvoiceId])) {
        throw pd_conflict('Termin ini sudah punya invoice. Batalkan invoice lama dulu bila perlu ditagih ulang.', 'DUPLICATE');
    }
}

function pd_invoice_row(mysqli $conn, int $id, bool $forUpdate = false): ?array {
    return db_one($conn, "SELECT i.*, d.number, d.status AS doc_status, d.version AS doc_version FROM pd_invoices i
                          JOIN pd_documents d ON d.id = i.document_id WHERE i.id = ?" . ($forUpdate ? ' FOR UPDATE' : ''), [$id]);
}

// ════════════════════════════════════════════════════════════════════════════
// Invoice actions
// ════════════════════════════════════════════════════════════════════════════

function pd_act_invoice_create(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_admin($user);
    $projectId = pd_require_id($input, 'project_id', 'ID proyek');
    $b = pd_bundle($conn, $projectId);
    if (!$b) throw pd_not_found('Proyek');
    $errors = [];
    $v = pd_invoice_input($conn, $input, pd_project_terms($conn, $b['p']), $errors);
    pd_fail($errors);
    $contentJson = pd_json($v['content']);

    return pd_tx($conn, function () use ($conn, $user, $projectId, $v, $contentJson) {
        if (!db_one($conn, "SELECT id FROM project_client WHERE id = ? FOR UPDATE", [$projectId])) throw pd_not_found('Proyek');
        pd_check_term_unbilled($conn, $projectId, $v['term_key']);
        $number = pd_new_doc_number($conn, 'invoice');
        $docId = pd_insert($conn, "INSERT INTO pd_documents (project_id, doc_type, number, title, status, version, content, doc_date, created_by, updated_by)
                                   VALUES (?, 'invoice', ?, ?, 'draft', 1, ?, ?, ?, ?)",
            [$projectId, $number, $v['title'], $contentJson, $v['issue_date'], (int)$user['id'], (int)$user['id']]);
        $id = pd_insert($conn, "INSERT INTO pd_invoices (project_id, document_id, " . PD_INVOICE_COLUMNS . ")
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            array_merge([$projectId, $docId], pd_invoice_values($v)));
        pd_add_revision($conn, $docId, 1, $contentJson, 'Invoice dibuat', $user);
        pd_log($conn, $projectId, $docId, $user, 'invoice_created', "Invoice $number dibuat (" . pd_rupiah($v['totals']['amount_due']) . ')');
        return ['id' => $id, 'document_id' => $docId, 'number' => $number];
    });
}

// Draft invoices only; the document gets a new version
function pd_act_invoice_update(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_admin($user);
    $id = pd_require_id($input, 'id', 'ID invoice');
    $current = pd_invoice_row($conn, $id);
    if (!$current) throw pd_not_found('Invoice');
    $b = pd_bundle($conn, (int)$current['project_id']);
    if (!$b) throw pd_not_found('Proyek');
    $errors = [];
    $v = pd_invoice_input($conn, $input, pd_project_terms($conn, $b['p']), $errors);
    pd_fail($errors);
    $contentJson = pd_json($v['content']);

    $version = pd_tx($conn, function () use ($conn, $user, $id, $v, $contentJson, $current) {
        // The project row first, like pd_invoice_create: the "term billed once" check below is then atomic, also
        // against a parallel update that moves another draft onto the same term
        if (!db_one($conn, "SELECT id FROM project_client WHERE id = ? FOR UPDATE", [(int)$current['project_id']])) throw pd_not_found('Proyek');
        $invoice = pd_invoice_row($conn, $id, true);
        if (!$invoice) throw pd_not_found('Invoice');
        if ($invoice['payment_status'] === 'dibatalkan') throw pd_conflict('Invoice yang dibatalkan tidak bisa diubah.', 'STATE');
        if ($invoice['doc_status'] !== 'draft') throw pd_conflict('Invoice yang sudah terbit terkunci. Gunakan "Ajukan perubahan".', 'LOCKED');
        $projectId = (int)$invoice['project_id'];
        $docId = (int)$invoice['document_id'];
        pd_check_term_unbilled($conn, $projectId, $v['term_key'], $id);
        db_run($conn, "UPDATE pd_invoices SET " . implode(' = ?, ', explode(', ', PD_INVOICE_COLUMNS)) . " = ? WHERE id = ?",
            array_merge(pd_invoice_values($v), [$id]));
        $version = (int)$invoice['doc_version'] + 1;
        db_run($conn, "UPDATE pd_documents SET content = ?, title = ?, doc_date = ?, version = ?, updated_by = ? WHERE id = ?",
            [$contentJson, $v['title'], $v['issue_date'], $version, (int)$user['id'], $docId]);
        pd_add_revision($conn, $docId, $version, $contentJson, 'Invoice diperbarui', $user);
        pd_log($conn, $projectId, $docId, $user, 'invoice_updated', "Invoice {$invoice['number']} diperbarui (" . pd_rupiah($v['totals']['amount_due']) . ')');
        return $version;
    });
    return ['version' => $version];
}

// No payments only; the document keeps its status and gets the reason as review note
function pd_act_invoice_cancel(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_admin($user);
    $id = pd_require_id($input, 'id', 'ID invoice');
    $errors = [];
    $reason = pd_text($input, 'reason', 'Alasan pembatalan', 500, true, $errors);
    pd_fail($errors);

    pd_tx($conn, function () use ($conn, $user, $id, $reason) {
        $invoice = pd_invoice_row($conn, $id, true);
        if (!$invoice) throw pd_not_found('Invoice');
        if ($invoice['payment_status'] === 'dibatalkan') throw pd_conflict('Invoice sudah dibatalkan.', 'STATE');
        if ((float)$invoice['amount_paid'] > 0 || db_one($conn, "SELECT id FROM pd_payments WHERE invoice_id = ? LIMIT 1", [$id])) {
            throw pd_conflict('Invoice yang sudah ada pembayarannya tidak bisa dibatalkan. Hapus pembayarannya dulu.', 'LOCKED');
        }
        db_run($conn, "UPDATE pd_invoices SET payment_status = 'dibatalkan' WHERE id = ?", [$id]);
        db_run($conn, "UPDATE pd_documents SET review_note = ?, updated_by = ? WHERE id = ?", ["Dibatalkan: $reason", (int)$user['id'], (int)$invoice['document_id']]);
        pd_log($conn, (int)$invoice['project_id'], (int)$invoice['document_id'], $user, 'invoice_cancelled', "Invoice {$invoice['number']} dibatalkan: $reason");
    });
    return [];
}

// ════════════════════════════════════════════════════════════════════════════
// Payments
// ════════════════════════════════════════════════════════════════════════════

// Kuitansi content when the request brings none: the same sections as the engine's template
// (src/features/project-docs/engine/templates/receipt.ts), resolved from the receipt's MergeData at render time
function pd_default_receipt_content(): array {
    return [
        'title' => 'Kuitansi',
        'sections' => [
            ['id' => 'penerimaan', 'title' => '', 'table' => ['columns' => ['', ''], 'rows' => [
                ['Telah terima dari', '**{{client.name}}**'],
                ['Uang sejumlah', '*{{payment.amount_terbilang}}*'],
                ['Untuk pembayaran', '{{invoice.term_description}} atas invoice nomor {{payment.invoice_number}} untuk pekerjaan '
                    . '{{project.service_label}} {{project.name}} ({{project.code}})'],
                ['Tanggal pembayaran', '{{payment.paid_at_long}}'],
                ['Metode pembayaran', '{{payment.method_label}}'],
                ['Referensi', '{{payment.reference|-}}'],
            ]]],
            ['id' => 'nominal', 'title' => '', 'body' => '{{#nominal}}'],
            ['id' => 'catatan', 'title' => '', 'body' => 'Kuitansi ini merupakan bukti pembayaran yang sah dan diterbitkan secara elektronik '
                . 'oleh {{company.name}} melalui platform dokumen proyek.'],
        ],
    ];
}

// Payment + Kuitansi (selesai, frozen snapshot) + invoice amounts in one transaction; notifies the client
function pd_act_payment_record(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_admin($user);
    $invoiceId = pd_require_id($input, 'invoice_id', 'ID invoice');
    $errors = [];
    $amount = pd_money($input, 'amount', 'Jumlah pembayaran', true, $errors);
    if ($amount !== null && pd_round($amount) <= 0) $errors['amount'] = 'Jumlah pembayaran harus lebih dari 0.';
    $paidAt = pd_date($input, 'paid_at', 'Tanggal pembayaran', true, $errors);
    $method = pd_enum($input, 'method', 'Metode pembayaran', PD_PAYMENT_METHODS, true, $errors);
    $reference = pd_text($input, 'reference', 'Referensi', 120, false, $errors);
    $note = pd_text($input, 'note', 'Catatan', 2000, false, $errors);
    $proof = (($input['proof'] ?? null) !== null && $input['proof'] !== '') ? pd_proof_input($input['proof'], $errors) : null;
    $content = ($input['receipt_content'] ?? null) !== null
        ? pd_valid_content($input['receipt_content'], 'receipt_content', $errors)
        : pd_default_receipt_content();
    pd_fail($errors);
    $amount = pd_round($amount);
    $contentJson = pd_json($content);

    $result = pd_with_stored_file($proof, function ($proofFile) use ($conn, $user, $invoiceId, $amount, $paidAt, $method, $reference, $note, $content, $contentJson) {
        return pd_tx($conn, function () use ($conn, $user, $invoiceId, $amount, $paidAt, $method, $reference, $note, $content, $contentJson, $proofFile) {
            $invoice = pd_invoice_row($conn, $invoiceId, true);
            if (!$invoice) throw pd_not_found('Invoice');
            if ($invoice['payment_status'] === 'dibatalkan') throw pd_conflict('Invoice sudah dibatalkan.', 'STATE');
            if ($invoice['doc_status'] === 'draft') throw pd_conflict('Terbitkan invoice dulu sebelum mencatat pembayaran.', 'STATE');
            if ($invoice['payment_status'] === 'lunas') throw pd_conflict('Invoice sudah lunas.', 'STATE');
            $due = (float)$invoice['amount_due'];
            $remaining = $due - (float)$invoice['amount_paid'];
            if ($amount > $remaining) throw pd_bad('amount', 'Jumlah pembayaran melebihi sisa tagihan (' . pd_rupiah($remaining) . ').');
            $projectId = (int)$invoice['project_id'];

            $number = pd_new_doc_number($conn, 'receipt');
            $title = trim((string)($content['title'] ?? ''));
            // The bare template title "Kuitansi" becomes a findable one
            $title = mb_substr(($title === '' || strcasecmp($title, 'Kuitansi') === 0) ? "Kuitansi pembayaran {$invoice['number']}" : $title, 0, 255);
            $receiptId = pd_insert($conn, "INSERT INTO pd_documents (project_id, doc_type, number, title, status, version, content, doc_date,
                                               completed_at, created_by, updated_by)
                                           VALUES (?, 'receipt', ?, ?, 'selesai', 1, ?, ?, NOW(), ?, ?)",
                [$projectId, $number, $title, $contentJson, $paidAt, (int)$user['id'], (int)$user['id']]);
            $paymentId = pd_insert($conn, "INSERT INTO pd_payments (invoice_id, amount, paid_at, method, reference, proof_file, note, receipt_document_id, recorded_by)
                                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [$invoiceId, $amount, $paidAt, $method, $reference, $proofFile, $note, $receiptId, (int)$user['id']]);
            $paid = (float)$invoice['amount_paid'] + $amount;
            $status = pd_payment_status($paid, $due);
            db_run($conn, "UPDATE pd_invoices SET amount_paid = ?, payment_status = ? WHERE id = ?", [$paid, $status, $invoiceId]);
            if ($status === 'lunas') {
                db_run($conn, "UPDATE pd_documents SET status = 'selesai', completed_at = NOW() WHERE id = ? AND status = 'disetujui'", [(int)$invoice['document_id']]);
            }

            // The receipt is born selesai, so its snapshot is frozen right away (after the invoice amounts changed)
            $receipt = pd_doc_row($conn, $receiptId);
            [$snapshot, $hash] = pd_freeze($conn, pd_bundle($conn, $projectId), $receipt, 'selesai');
            db_run($conn, "UPDATE pd_documents SET snapshot = ?, content_hash = ? WHERE id = ?", [$snapshot, $hash, $receiptId]);
            pd_add_revision($conn, $receiptId, 1, $contentJson, 'Kuitansi dibuat otomatis', $user);
            pd_log($conn, $projectId, (int)$invoice['document_id'], $user, 'payment_recorded',
                'Pembayaran ' . pd_rupiah($amount) . " untuk invoice {$invoice['number']} dicatat (kuitansi $number)");

            $client = db_one($conn, "SELECT c.user_id FROM project_client p JOIN pd_clients c ON c.id = p.client_id WHERE p.id = ?", [$projectId]);
            if ($client && $client['user_id'] !== null) {
                pd_notify($conn, [
                    'user_id' => (int)$client['user_id'], 'type' => 'payment_received', 'project_id' => $projectId,
                    'title' => 'Pembayaran diterima',
                    'body' => 'Pembayaran ' . pd_rupiah($amount) . " untuk invoice {$invoice['number']} sudah kami terima. Kuitansi $number tersedia.",
                    'link' => pd_doc_link('customer', $projectId, $receiptId),
                ]);
            }
            return ['id' => $paymentId, 'receipt_document_id' => $receiptId, 'receipt_number' => $number, 'payment_status' => $status];
        });
    });
    return $result;
}

// Reverses the amounts; the receipt stays in history with review note "Dibatalkan"
function pd_act_payment_delete(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_admin($user);
    $id = pd_require_id($input, 'id', 'ID pembayaran');

    $proofFile = pd_tx($conn, function () use ($conn, $user, $id) {
        $payment = db_one($conn, "SELECT * FROM pd_payments WHERE id = ? FOR UPDATE", [$id]);
        if (!$payment) throw pd_not_found('Pembayaran');
        $invoice = pd_invoice_row($conn, (int)$payment['invoice_id'], true);
        if (!$invoice) throw pd_not_found('Invoice');
        $paid = max(0.0, (float)$invoice['amount_paid'] - (float)$payment['amount']);
        $status = pd_payment_status($paid, (float)$invoice['amount_due']);
        db_run($conn, "UPDATE pd_invoices SET amount_paid = ?, payment_status = ? WHERE id = ?", [$paid, $status, (int)$invoice['id']]);
        if ($status !== 'lunas') {
            db_run($conn, "UPDATE pd_documents SET status = 'disetujui', completed_at = NULL WHERE id = ? AND status = 'selesai'", [(int)$invoice['document_id']]);
        }
        if ($payment['receipt_document_id'] !== null) {
            db_run($conn, "UPDATE pd_documents SET review_note = 'Dibatalkan', updated_by = ? WHERE id = ?", [(int)$user['id'], (int)$payment['receipt_document_id']]);
        }
        db_run($conn, "DELETE FROM pd_payments WHERE id = ?", [$id]);
        pd_log($conn, (int)$invoice['project_id'], (int)$invoice['document_id'], $user, 'payment_deleted',
            'Pembayaran ' . pd_rupiah($payment['amount']) . " untuk invoice {$invoice['number']} dihapus");
        return $payment['proof_file'];
    });
    pd_delete_stored($proofFile);
    return [];
}
