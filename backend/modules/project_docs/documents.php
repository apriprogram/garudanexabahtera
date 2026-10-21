<?php
// pd_* document actions (see ../project_docs.php): create, read, save + revisions, restore, submit/issue (snapshot
// freeze), withdraw, change management, signing, completion, delete, and the customer's projects, documents and
// approve/reject (+ sign) decision. Status flow and rules: spec §1.1–§1.2.

// ════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════

function pd_add_revision(mysqli $conn, int $docId, int $version, string $contentJson, ?string $note, ?array $user): void {
    db_run($conn, "INSERT INTO pd_document_revisions (document_id, version, content, change_note, changed_by) VALUES (?, ?, ?, ?, ?)",
        [$docId, $version, $contentJson, $note === null ? null : mb_substr($note, 0, 500), $user ? (int)$user['id'] : null]);
}

// The document row locked for this transaction, or 404
function pd_doc_for_update(mysqli $conn, int $id): array {
    $d = pd_doc_row($conn, $id, true);
    if (!$d) throw pd_not_found('Dokumen');
    return $d;
}

function pd_state(string $status, int $version): array {
    return ['status' => $status, 'version' => $version];
}

// After a signature: a `disetujui` document whose parties all signed the current version becomes `selesai`
function pd_complete_if_signed(mysqli $conn, array $d, string $status, ?array $user): string {
    $parties = PD_DOC_TYPES[$d['doc_type']]['parties'];
    if ($status !== 'disetujui' || !$parties) return $status;
    $signed = array_column(pd_signature_rows($conn, (int)$d['id'], (int)$d['version']), 'party');
    if (array_diff($parties, $signed)) return $status;
    db_run($conn, "UPDATE pd_documents SET status = 'selesai', completed_at = NOW() WHERE id = ?", [(int)$d['id']]);
    pd_log($conn, (int)$d['project_id'], (int)$d['id'], $user, 'doc_completed', pd_doc_label($d) . ' selesai: semua pihak sudah tanda tangan');
    return 'selesai';
}

// Saves the signature PNG and its audit row for the current version (content hash of the frozen version)
function pd_insert_signature(mysqli $conn, array $d, string $party, array $user, string $method, string $file, string $name, ?string $title): void {
    db_run($conn, "INSERT INTO pd_signatures (document_id, version, party, user_id, signer_name, signer_title, method, image_file, content_hash, ip, user_agent)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        (int)$d['id'], (int)$d['version'], $party, (int)$user['id'], $name, $title, $method, $file, (string)$d['content_hash'],
        mb_substr(client_ip(), 0, 64), pd_user_agent(),
    ]);
    pd_log($conn, (int)$d['project_id'], (int)$d['id'], $user, 'doc_signed', pd_doc_label($d) . ' ditandatangani ' . PD_PARTY_LABEL[$party] . " ($name)");
}

// Runs $fn (a transaction) with a freshly stored private file; the file is removed again when $fn fails
function pd_with_stored_file(?array $bytesAndExt, callable $fn) {
    $file = $bytesAndExt ? pd_store_file($bytesAndExt[0], $bytesAndExt[1]) : null;
    try {
        return $fn($file);
    } catch (Throwable $e) {
        pd_delete_stored($file);
        throw $e;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Staff document actions
// ════════════════════════════════════════════════════════════════════════════

// New draft with the next number of its type; one document per type (invoices and receipts have their own actions)
function pd_act_document_create(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_staff($user);
    $errors = [];
    $projectId = pd_id_value($input['project_id'] ?? null);
    if ($projectId === null) $errors['project_id'] = 'ID proyek tidak valid.';
    $type = pd_enum($input, 'doc_type', 'Jenis dokumen', array_keys(PD_DOC_TYPES), true, $errors);
    $title = pd_text($input, 'title', 'Judul dokumen', 255, true, $errors);
    $docDate = pd_date($input, 'doc_date', 'Tanggal dokumen', false, $errors);
    $content = pd_valid_content($input['content'] ?? null, 'content', $errors);
    pd_fail($errors);
    if ($type === 'invoice' || $type === 'receipt') {
        throw pd_bad('doc_type', 'Invoice dibuat lewat menu invoice; kuitansi terbit otomatis saat pembayaran dicatat.');
    }
    pd_check_doc_type_access($user, $type);
    $contentJson = pd_json($content);

    return pd_tx($conn, function () use ($conn, $user, $projectId, $type, $title, $docDate, $contentJson) {
        if (!db_one($conn, "SELECT id FROM project_client WHERE id = ? FOR UPDATE", [$projectId])) throw pd_not_found('Proyek');
        if (db_one($conn, "SELECT id FROM pd_documents WHERE project_id = ? AND doc_type = ? LIMIT 1", [$projectId, $type])) {
            throw pd_conflict('Dokumen ' . PD_DOC_TYPES[$type]['short'] . ' untuk proyek ini sudah ada.', 'DUPLICATE');
        }
        $number = pd_new_doc_number($conn, $type);
        $id = pd_insert($conn, "INSERT INTO pd_documents (project_id, doc_type, number, title, status, version, content, doc_date, created_by, updated_by)
                                VALUES (?, ?, ?, ?, 'draft', 1, ?, ?, ?, ?)",
            [$projectId, $type, $number, $title, $contentJson, $docDate ?? pd_today(), (int)$user['id'], (int)$user['id']]);
        pd_add_revision($conn, $id, 1, $contentJson, 'Dokumen dibuat', $user);
        pd_log($conn, $projectId, $id, $user, 'doc_created', PD_DOC_TYPES[$type]['short'] . " $number dibuat");
        return ['id' => $id, 'number' => $number];
    });
}

function pd_act_document_get(mysqli $conn, array $input, ?array $user): array {
    pd_require_staff($user);
    $d = pd_doc_row($conn, pd_require_id($input, 'id', 'ID dokumen'));
    if (!$d) throw pd_not_found('Dokumen');
    return ['document' => pd_document_detail($conn, $d, pd_today(), false)];
}

// New version of a draft (every save is a revision)
function pd_act_document_save(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_staff($user);
    $id = pd_require_id($input, 'id', 'ID dokumen');
    $errors = [];
    $content = pd_valid_content($input['content'] ?? null, 'content', $errors);
    // title / doc_date: omitted or null = unchanged
    $title = ($input['title'] ?? null) !== null ? pd_text($input, 'title', 'Judul dokumen', 255, true, $errors) : null;
    $docDate = pd_date($input, 'doc_date', 'Tanggal dokumen', false, $errors);
    $note = pd_text($input, 'change_note', 'Catatan perubahan', 500, false, $errors);
    pd_fail($errors);
    $contentJson = pd_json($content);

    $version = pd_tx($conn, function () use ($conn, $user, $id, $contentJson, $title, $docDate, $note) {
        $d = pd_doc_for_update($conn, $id);
        pd_check_doc_type_access($user, $d['doc_type']);
        if ($d['status'] !== 'draft') throw pd_conflict('Dokumen terkunci: hanya draft yang bisa diubah. Gunakan "Ajukan perubahan".', 'LOCKED');
        $version = (int)$d['version'] + 1;
        db_run($conn, "UPDATE pd_documents SET content = ?, title = COALESCE(?, title), doc_date = COALESCE(?, doc_date), version = ?, updated_by = ?
                       WHERE id = ?", [$contentJson, $title, $docDate, $version, (int)$user['id'], $id]);
        pd_add_revision($conn, $id, $version, $contentJson, $note, $user);
        pd_log($conn, (int)$d['project_id'], $id, $user, 'doc_saved', pd_doc_label($d) . " disimpan (versi $version)");
        return $version;
    });
    return ['version' => $version];
}

// An older revision's content saved as a new version (draft only)
function pd_act_document_restore(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_staff($user);
    $id = pd_require_id($input, 'id', 'ID dokumen');
    $from = pd_require_id($input, 'version', 'Versi');

    $version = pd_tx($conn, function () use ($conn, $user, $id, $from) {
        $d = pd_doc_for_update($conn, $id);
        pd_check_doc_type_access($user, $d['doc_type']);
        if ($d['status'] !== 'draft') throw pd_conflict('Dokumen terkunci: versi lama hanya bisa dipulihkan saat draft.', 'LOCKED');
        $revision = db_one($conn, "SELECT content FROM pd_document_revisions WHERE document_id = ? AND version = ?", [$id, $from]);
        if (!$revision) throw pd_not_found('Versi');
        $version = (int)$d['version'] + 1;
        db_run($conn, "UPDATE pd_documents SET content = ?, version = ?, updated_by = ? WHERE id = ?", [$revision['content'], $version, (int)$user['id'], $id]);
        pd_add_revision($conn, $id, $version, $revision['content'], "Dipulihkan dari versi $from", $user);
        pd_log($conn, (int)$d['project_id'], $id, $user, 'doc_restored', pd_doc_label($d) . " dipulihkan dari versi $from (versi $version)");
        return $version;
    });
    return ['version' => $version];
}

// draft → menunggu_persetujuan (client approval) or, for an invoice, → disetujui ("Terbit"); freezes the snapshot
function pd_act_document_submit(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_staff($user);
    $id = pd_require_id($input, 'id', 'ID dokumen');

    return pd_tx($conn, function () use ($conn, $user, $id) {
        $d = pd_doc_for_update($conn, $id);
        pd_check_doc_type_access($user, $d['doc_type']);
        if ($d['doc_type'] === 'receipt') throw pd_conflict('Kuitansi terbit otomatis dan tidak perlu diajukan.', 'STATE');
        if ($d['status'] !== 'draft') throw pd_conflict('Hanya draft yang bisa diajukan.', 'STATE');
        $isInvoice = $d['doc_type'] === 'invoice';
        if ($isInvoice) {
            $invoice = db_one($conn, "SELECT payment_status FROM pd_invoices WHERE document_id = ? FOR UPDATE", [$id]);
            if (!$invoice || $invoice['payment_status'] === 'dibatalkan') throw pd_conflict('Invoice yang dibatalkan tidak bisa diterbitkan.', 'STATE');
        }
        // Signed before a rejection/withdrawal: the resubmission is a new version, so those signatures stay in history
        // but no longer count (every signature belongs to exactly one frozen snapshot)
        if (db_one($conn, "SELECT id FROM pd_signatures WHERE document_id = ? AND version = ? LIMIT 1", [$id, (int)$d['version']])) {
            $d['version'] = (int)$d['version'] + 1;
            db_run($conn, "UPDATE pd_documents SET version = ? WHERE id = ?", [$d['version'], $id]);
            pd_add_revision($conn, $id, $d['version'], $d['content'], 'Diajukan ulang: tanda tangan versi sebelumnya tidak berlaku lagi', $user);
        }
        $status = $isInvoice ? 'disetujui' : 'menunggu_persetujuan';
        $projectId = (int)$d['project_id'];
        $b = pd_bundle($conn, $projectId);
        [$snapshot, $hash] = pd_freeze($conn, $b, $d, $status);
        db_run($conn, "UPDATE pd_documents SET status = ?, snapshot = ?, content_hash = ?, submitted_at = NOW(), approved_at = "
            . ($isInvoice ? 'NOW()' : 'NULL') . ", revision_requested = 0, review_note = NULL, updated_by = ? WHERE id = ?",
            [$status, $snapshot, $hash, (int)$user['id'], $id]);
        $label = pd_doc_label($d);
        pd_log($conn, $projectId, $id, $user, $isInvoice ? 'doc_issued' : 'doc_submitted',
            $isInvoice ? "$label diterbitkan" : "$label diajukan untuk persetujuan klien");
        $clientUser = pd_int_or_null($b['p']['c_user_id']);
        if ($clientUser !== null) {
            if ($isInvoice) {
                $i = pd_bundle_invoice($b, 'document_id', $id);
                $body = "Invoice {$d['number']} sebesar " . pd_rupiah($i ? $i['amount_due'] : 0) . ', jatuh tempo ' . pd_tanggal_panjang($i ? $i['due_date'] : '') . '.';
            } else {
                $body = PD_DOC_TYPES[$d['doc_type']]['short'] . " {$d['number']} untuk proyek {$b['p']['name']} perlu Anda tinjau.";
            }
            pd_notify($conn, [
                'user_id' => $clientUser, 'type' => $isInvoice ? 'invoice_issued' : 'doc_review', 'project_id' => $projectId,
                'title' => $isInvoice ? 'Invoice baru diterbitkan' : 'Dokumen menunggu persetujuan Anda',
                'body' => $body, 'link' => pd_doc_link('customer', $projectId, $id),
            ]);
        }
        return pd_state($status, (int)$d['version']);
    });
}

// menunggu_persetujuan → draft (the snapshot is dropped: drafts render live data)
function pd_act_document_withdraw(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_staff($user);
    $id = pd_require_id($input, 'id', 'ID dokumen');

    return pd_tx($conn, function () use ($conn, $user, $id) {
        $d = pd_doc_for_update($conn, $id);
        pd_check_doc_type_access($user, $d['doc_type']);
        if ($d['status'] !== 'menunggu_persetujuan') throw pd_conflict('Hanya dokumen yang menunggu persetujuan yang bisa ditarik kembali.', 'STATE');
        db_run($conn, "UPDATE pd_documents SET status = 'draft', snapshot = NULL, content_hash = NULL, updated_by = ? WHERE id = ?", [(int)$user['id'], $id]);
        pd_log($conn, (int)$d['project_id'], $id, $user, 'doc_withdrawn', pd_doc_label($d) . ' ditarik kembali ke draft');
        return pd_state('draft', (int)$d['version']);
    });
}

// "Ajukan perubahan": a locked document reopens as a new draft version; older approvals/signatures stay in history
function pd_act_document_change(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_admin($user);
    $id = pd_require_id($input, 'id', 'ID dokumen');
    $errors = [];
    $reason = pd_text($input, 'reason', 'Alasan perubahan', 500, true, $errors, 10);
    pd_fail($errors);

    return pd_tx($conn, function () use ($conn, $user, $id, $reason) {
        $d = pd_doc_for_update($conn, $id);
        if ($d['status'] === 'draft') throw pd_conflict('Dokumen masih draft dan bisa langsung diubah.', 'STATE');
        if ($d['doc_type'] === 'receipt') throw pd_conflict('Kuitansi tidak bisa diubah. Hapus pembayarannya bila ada kesalahan.', 'LOCKED');
        if ($d['doc_type'] === 'invoice') {
            $invoice = db_one($conn, "SELECT id, payment_status FROM pd_invoices WHERE document_id = ? FOR UPDATE", [$id]);
            if ($invoice && $invoice['payment_status'] === 'dibatalkan') throw pd_conflict('Invoice yang dibatalkan tidak bisa diubah.', 'STATE');
            if ($invoice && db_one($conn, "SELECT id FROM pd_payments WHERE invoice_id = ? LIMIT 1", [(int)$invoice['id']])) {
                throw pd_conflict('Invoice yang sudah ada pembayarannya tidak bisa diubah. Batalkan lalu terbitkan invoice baru.', 'LOCKED');
            }
        }
        $version = (int)$d['version'] + 1;
        db_run($conn, "UPDATE pd_documents SET status = 'draft', version = ?, snapshot = NULL, content_hash = NULL, approved_at = NULL,
                           completed_at = NULL, revision_requested = 0, review_note = NULL, updated_by = ? WHERE id = ?",
            [$version, (int)$user['id'], $id]);
        pd_add_revision($conn, $id, $version, $d['content'], "Perubahan: $reason", $user);
        pd_log($conn, (int)$d['project_id'], $id, $user, 'doc_change', 'Perubahan ' . pd_doc_label($d) . ": $reason");
        return pd_state('draft', $version);
    });
}

// The admin signs as Pihak Pertama (company); completes the document when every party signed the current version
function pd_act_document_sign(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_admin($user);
    $id = pd_require_id($input, 'id', 'ID dokumen');
    $errors = [];
    $name = pd_text($input, 'signer_name', 'Nama penanda tangan', 255, true, $errors);
    $title = pd_text($input, 'signer_title', 'Jabatan penanda tangan', 255, false, $errors);
    $signature = pd_signature_input($input['signature'] ?? null, $errors);
    pd_fail($errors);

    return pd_with_stored_file([$signature[1], 'png'], function ($file) use ($conn, $user, $id, $signature, $name, $title) {
        return pd_tx($conn, function () use ($conn, $user, $id, $signature, $file, $name, $title) {
            $d = pd_doc_for_update($conn, $id);
            if (!in_array('pihak_pertama', PD_DOC_TYPES[$d['doc_type']]['parties'], true)) {
                throw pd_conflict('Dokumen ini tidak memerlukan tanda tangan.', 'STATE');
            }
            if (!in_array($d['status'], ['menunggu_persetujuan', 'disetujui'], true)) {
                throw pd_conflict('Dokumen hanya bisa ditandatangani setelah diajukan atau disetujui klien.', 'STATE');
            }
            if (db_one($conn, "SELECT id FROM pd_signatures WHERE document_id = ? AND version = ? AND party = 'pihak_pertama'", [$id, (int)$d['version']])) {
                throw pd_conflict('Pihak Pertama sudah menandatangani versi ini.', 'DUPLICATE');
            }
            pd_insert_signature($conn, $d, 'pihak_pertama', $user, $signature[0], $file, $name, $title);
            return pd_state(pd_complete_if_signed($conn, $d, $d['status'], $user), (int)$d['version']);
        });
    });
}

// disetujui → selesai by hand (brd, proposal, timeline)
function pd_act_document_complete(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_admin($user);
    $id = pd_require_id($input, 'id', 'ID dokumen');

    return pd_tx($conn, function () use ($conn, $user, $id) {
        $d = pd_doc_for_update($conn, $id);
        if (!in_array($d['doc_type'], PD_COMPLETABLE_TYPES, true)) throw pd_conflict('Hanya BRD, Proposal, dan Jadwal yang ditandai selesai secara manual.', 'STATE');
        if ($d['status'] !== 'disetujui') throw pd_conflict('Dokumen harus disetujui klien sebelum ditandai selesai.', 'STATE');
        db_run($conn, "UPDATE pd_documents SET status = 'selesai', completed_at = NOW(), updated_by = ? WHERE id = ?", [(int)$user['id'], $id]);
        pd_log($conn, (int)$d['project_id'], $id, $user, 'doc_completed', pd_doc_label($d) . ' ditandai selesai');
        return pd_state('selesai', (int)$d['version']);
    });
}

// Only a draft that was never submitted (no approvals, signatures or payments can exist yet)
function pd_act_document_delete(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_admin($user);
    $id = pd_require_id($input, 'id', 'ID dokumen');

    pd_tx($conn, function () use ($conn, $user, $id) {
        $d = pd_doc_for_update($conn, $id);
        if ($d['status'] !== 'draft' || $d['submitted_at'] !== null) {
            throw pd_conflict('Hanya draft yang belum pernah diajukan yang bisa dihapus.', 'LOCKED');
        }
        if ($d['doc_type'] === 'invoice') db_run($conn, "DELETE FROM pd_invoices WHERE document_id = ?", [$id]);
        db_run($conn, "DELETE FROM pd_document_revisions WHERE document_id = ?", [$id]);
        db_run($conn, "DELETE FROM pd_documents WHERE id = ?", [$id]);
        pd_log($conn, (int)$d['project_id'], null, $user, 'doc_deleted', pd_doc_label($d) . ' dihapus');
    });
    return [];
}

// ════════════════════════════════════════════════════════════════════════════
// Customer actions (projects of the client records linked to the account)
// ════════════════════════════════════════════════════════════════════════════

function pd_act_my_projects(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_customer($user);
    $today = pd_today();
    $projects = [];
    foreach (pd_bundles_synced($conn, 'c.user_id = ?', [(int)$user['id']], $today) as $b) $projects[] = pd_project_summary($b, $today);
    return ['projects' => $projects];
}

function pd_act_my_project(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_customer($user);
    $id = pd_require_id($input, 'id', 'ID proyek');
    $today = pd_today();
    $b = pd_bundles_synced($conn, 'p.id = ? AND c.user_id = ?', [$id, (int)$user['id']], $today)[$id] ?? null;
    if (!$b) throw pd_not_found('Proyek');
    return ['project' => pd_project_detail($conn, $b, $today, true)];
}

// A sent document of an own project (drafts are never visible to the client)
function pd_customer_doc(mysqli $conn, array $user, int $id, bool $forUpdate = false): array {
    $d = pd_doc_row($conn, $id, $forUpdate);
    if (!$d || $d['status'] === 'draft' || !pd_customer_owns_project($conn, $user, (int)$d['project_id'])) throw pd_not_found('Dokumen');
    return $d;
}

function pd_act_my_document(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_customer($user);
    $d = pd_customer_doc($conn, $user, pd_require_id($input, 'id', 'ID dokumen'));
    return ['document' => pd_document_detail($conn, $d, pd_today(), true)];
}

// Approve (and sign as Pihak Kedua when the type needs both parties) or reject the current version
function pd_act_my_document_decide(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_customer($user);
    $id = pd_require_id($input, 'id', 'ID dokumen');
    $errors = [];
    $decision = pd_enum($input, 'decision', 'Keputusan', ['approved', 'rejected'], true, $errors);
    $note = pd_text($input, 'note', 'Catatan revisi', 2000, $decision === 'rejected', $errors);
    pd_fail($errors);
    $d = pd_customer_doc($conn, $user, $id);
    $signature = null;
    $name = null;
    $title = null;
    if ($decision === 'approved' && in_array('pihak_kedua', PD_DOC_TYPES[$d['doc_type']]['parties'], true)) {
        $name = pd_text($input, 'signer_name', 'Nama penanda tangan', 255, true, $errors);
        $title = pd_text($input, 'signer_title', 'Jabatan penanda tangan', 255, false, $errors);
        $signature = pd_signature_input($input['signature'] ?? null, $errors);
        pd_fail($errors);
    }

    return pd_with_stored_file($signature ? [$signature[1], 'png'] : null, function ($file) use ($conn, $user, $id, $decision, $note, $signature, $name, $title) {
        return pd_tx($conn, function () use ($conn, $user, $id, $decision, $note, $signature, $file, $name, $title) {
            $d = pd_customer_doc($conn, $user, $id, true);
            if ($d['status'] !== 'menunggu_persetujuan') throw pd_conflict('Dokumen ini tidak sedang menunggu persetujuan Anda.', 'STATE');
            $projectId = (int)$d['project_id'];
            $version = (int)$d['version'];
            $label = pd_doc_label($d);
            db_run($conn, "INSERT INTO pd_approvals (document_id, version, user_id, decision, note, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [$id, $version, (int)$user['id'], $decision, $note, mb_substr(client_ip(), 0, 64), pd_user_agent()]);
            $project = db_one($conn, "SELECT name FROM project_client WHERE id = ?", [$projectId]);
            $adminLink = pd_doc_link('admin', $projectId, $id);
            if ($decision === 'rejected') {
                db_run($conn, "UPDATE pd_documents SET status = 'draft', revision_requested = 1, review_note = ?, snapshot = NULL, content_hash = NULL
                               WHERE id = ?", [$note, $id]);
                pd_log($conn, $projectId, $id, $user, 'doc_rejected', "$label ditolak klien: $note");
                pd_notify($conn, [
                    'role' => 'admin', 'type' => 'doc_rejected', 'project_id' => $projectId, 'link' => $adminLink,
                    'title' => 'Klien meminta revisi dokumen', 'body' => "$label ({$project['name']}): $note",
                ]);
                return pd_state('draft', $version);
            }
            db_run($conn, "UPDATE pd_documents SET status = 'disetujui', approved_at = NOW() WHERE id = ?", [$id]);
            pd_log($conn, $projectId, $id, $user, 'doc_approved', "$label disetujui klien");
            $status = 'disetujui';
            if ($signature) {
                pd_insert_signature($conn, $d, 'pihak_kedua', $user, $signature[0], $file, $name, $title);
                $status = pd_complete_if_signed($conn, $d, $status, $user);
            }
            if ($status === 'selesai') $next = 'kini selesai.';
            elseif ($signature) $next = 'menunggu tanda tangan Pihak Pertama.';
            else $next = 'sudah disetujui.';
            pd_notify($conn, [
                'role' => 'admin', 'type' => 'doc_approved', 'project_id' => $projectId, 'link' => $adminLink,
                'title' => $signature ? 'Dokumen disetujui dan ditandatangani klien' : 'Dokumen disetujui klien',
                'body' => "$label ({$project['name']}) $next",
            ]);
            return pd_state($status, $version);
        });
    });
}
