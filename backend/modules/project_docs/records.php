<?php
// Loading and JSON shapes of the pd_* actions (see ../project_docs.php): project bundles (a project with its documents,
// signatures, milestones and invoices), the derived stage / progress / missing documents (spec §2), ProjectSummary,
// ProjectDetail, DocSummary, DocDetail, InvoiceSummary/Detail, Payment, Activity and MergeData (§4.3).

const PD_PROJECT_SELECT = "SELECT p.id, p.name, p.client_name, p.client_email, p.client_phone, p.service_type, p.status,
        p.assigned_user, p.price, p.start_date, p.end_date, p.description, p.client_id, p.code, p.stage_override, p.use_mou,
        p.has_maintenance, p.maintenance_fee, p.maintenance_period, p.maintenance_start, p.maintenance_end, p.scope_summary,
        p.payment_terms, p.updated_at,
        c.id AS c_id, c.type AS c_type, c.name AS c_name, c.pic_name AS c_pic_name, c.pic_title AS c_pic_title,
        c.email AS c_email, c.phone AS c_phone, c.address AS c_address, c.city AS c_city, c.npwp AS c_npwp,
        c.user_id AS c_user_id, c.notes AS c_notes, c.created_at AS c_created_at, c.updated_at AS c_updated_at
    FROM project_client p LEFT JOIN pd_clients c ON c.id = p.client_id";

// ════════════════════════════════════════════════════════════════════════════
// Bundles
// ════════════════════════════════════════════════════════════════════════════

// Projects matching $where (newest first) as id => [p, docs (id => row, by id), signed (doc id => parties of the
// current version), milestones, invoices (with the document number and status)]
function pd_bundles(mysqli $conn, string $where = '', array $params = []): array {
    $rows = db_all($conn, PD_PROJECT_SELECT . ($where !== '' ? " WHERE ($where)" : '') . " ORDER BY p.id DESC", $params);
    $bundles = [];
    foreach ($rows as $row) $bundles[(int)$row['id']] = ['p' => $row, 'docs' => [], 'signed' => [], 'milestones' => [], 'invoices' => []];
    if (!$bundles) return [];
    $ids = array_keys($bundles);
    $in = implode(',', array_fill(0, count($ids), '?'));
    foreach (db_all($conn, "SELECT id, project_id, doc_type, number, title, status, version, doc_date, revision_requested, review_note,
                                   submitted_at, approved_at, completed_at, created_at, updated_at
                            FROM pd_documents WHERE project_id IN ($in) ORDER BY id", $ids) as $d) {
        $bundles[(int)$d['project_id']]['docs'][(int)$d['id']] = $d;
    }
    foreach (db_all($conn, "SELECT d.project_id, s.document_id, s.party FROM pd_signatures s
                            JOIN pd_documents d ON d.id = s.document_id AND d.version = s.version
                            WHERE d.project_id IN ($in) ORDER BY s.document_id, s.party", $ids) as $s) {
        $bundles[(int)$s['project_id']]['signed'][(int)$s['document_id']][] = $s['party'];
    }
    foreach (db_all($conn, "SELECT * FROM pd_milestones WHERE project_id IN ($in) ORDER BY sort_order, id", $ids) as $m) {
        $bundles[(int)$m['project_id']]['milestones'][] = $m;
    }
    foreach (db_all($conn, "SELECT i.*, d.number, d.status AS doc_status FROM pd_invoices i
                            JOIN pd_documents d ON d.id = i.document_id WHERE i.project_id IN ($in) ORDER BY i.id", $ids) as $i) {
        $bundles[(int)$i['project_id']]['invoices'][] = $i;
    }
    return $bundles;
}

function pd_bundle(mysqli $conn, int $projectId): ?array {
    return pd_bundles($conn, 'p.id = ?', [$projectId])[$projectId] ?? null;
}

// Bundles plus the §1.1 rule "brd/proposal/timeline become selesai when the project reaches stage selesai"
// (applied on read, because the stage also moves with the date)
function pd_bundles_synced(mysqli $conn, string $where, array $params, string $today): array {
    $bundles = pd_bundles($conn, $where, $params);
    foreach ($bundles as $projectId => $b) {
        if (pd_stage($b, $today) !== 'selesai') continue;
        foreach ($b['docs'] as $docId => $d) {
            if ($d['status'] !== 'disetujui' || !in_array($d['doc_type'], PD_COMPLETABLE_TYPES, true)) continue;
            db_run($conn, "UPDATE pd_documents SET status = 'selesai', completed_at = NOW() WHERE id = ? AND status = 'disetujui'", [$docId]);
            if (db_affected_rows() !== 1) continue;
            pd_log($conn, $projectId, $docId, null, 'doc_completed', pd_doc_label($d) . ' selesai karena proyek selesai');
            $bundles[$projectId]['docs'][$docId]['status'] = 'selesai';
            $bundles[$projectId]['docs'][$docId]['completed_at'] = pd_now()->format('Y-m-d H:i:s');
        }
    }
    return $bundles;
}

// Newest document of a type (one per type, except invoice and receipt), or null
function pd_latest_doc(array $b, string $type): ?array {
    $found = null;
    foreach ($b['docs'] as $d) {
        if ($d['doc_type'] === $type) $found = $d;
    }
    return $found;
}

function pd_bundle_invoice(array $b, string $field, int $value): ?array {
    foreach ($b['invoices'] as $i) {
        if ((int)$i[$field] === $value) return $i;
    }
    return null;
}

// ════════════════════════════════════════════════════════════════════════════
// Derived values (spec §2)
// ════════════════════════════════════════════════════════════════════════════

function pd_stage_index(string $stage): int {
    $index = array_search($stage, PD_STAGES, true);
    return $index === false ? 0 : $index;
}

// The stage from the documents, milestones and invoices (rules 1–9), without the admin override
function pd_derived_stage(array $b, string $today): string {
    $p = $b['p'];
    $status = function (string $type) use ($b) {
        $d = pd_latest_doc($b, $type);
        return $d ? $d['status'] : null;
    };
    $approved = ['disetujui', 'selesai'];
    if (!in_array($status('brd'), $approved, true)) return 'perencanaan';
    if (!in_array($status('proposal'), $approved, true) || ((int)$p['use_mou'] === 1 && !in_array($status('mou'), $approved, true))) {
        return 'penawaran';
    }
    if ($status('pks') !== 'selesai') return 'kontrak';
    $allMilestonesDone = true;
    foreach ($b['milestones'] as $m) {
        if ($m['status'] !== 'selesai') $allMilestonesDone = false;
    }
    $uat = $status('uat');
    if (!$allMilestonesDone && ($uat === null || $uat === 'draft')) return 'pengerjaan';
    if ($uat !== 'selesai') return 'uji';
    if ($status('bast') !== 'selesai') return 'serah_terima';
    foreach ($b['invoices'] as $i) {
        if (!in_array($i['payment_status'], ['lunas', 'dibatalkan'], true)) return 'pelunasan';
    }
    if (pd_unpaid_term($b)) return 'pelunasan';
    // A maintenance contract keeps the project in maintenance until its SLA is signed and while its period runs
    $end = $p['maintenance_end'];
    if ((int)$p['has_maintenance'] === 1 && ($status('sla') !== 'selesai' || ($end !== null && $end > $today))) return 'maintenance';
    return 'selesai';
}

// A payment term of the project (value > 0, term > 0 %) that has no paid invoice yet: the contract is not settled
function pd_unpaid_term(array $b): bool {
    $p = $b['p'];
    if (pd_num($p['price'] ?? 0) <= 0 || ($p['payment_terms'] ?? null) === null) return false;
    $ignored = [];
    foreach (pd_valid_terms(json_decode((string)$p['payment_terms'], true), 'payment_terms', $ignored) ?? [] as $term) {
        if ($term['percent'] <= 0) continue;
        $paid = false;
        foreach ($b['invoices'] as $i) {
            if ($i['term_key'] === $term['key'] && $i['payment_status'] === 'lunas') $paid = true;
        }
        if (!$paid) return true;
    }
    return false;
}

// Effective stage: the admin override wins
function pd_stage(array $b, string $today): string {
    $override = $b['p']['stage_override'];
    return in_array($override, PD_STAGES, true) ? $override : pd_derived_stage($b, $today);
}

// Σ(weight × progress) / Σ weight, rounded; 0 without milestones
function pd_progress(array $milestones): int {
    $weights = 0;
    $sum = 0;
    foreach ($milestones as $m) {
        $weight = max(0, (int)$m['weight']);
        $weights += $weight;
        $sum += $weight * (int)$m['progress'];
    }
    return $weights > 0 ? (int)round($sum / $weights) : 0;
}

function pd_type_required(array $p, string $type): bool {
    $required = PD_DOC_TYPES[$type]['required'];
    if ($required === 'mou') return (int)$p['use_mou'] === 1;
    if ($required === 'sla') return (int)$p['has_maintenance'] === 1;
    return $required === true;
}

// Missing or still draft; invoices count when issued and not cancelled
function pd_type_missing(array $b, string $type): bool {
    if ($type === 'invoice') {
        foreach ($b['invoices'] as $i) {
            if ($i['doc_status'] !== 'draft' && $i['payment_status'] !== 'dibatalkan') return false;
        }
        return true;
    }
    $d = pd_latest_doc($b, $type);
    return !$d || $d['status'] === 'draft';
}

// Required types whose stage is reached and which are missing or still draft, in DOC_TYPES order
function pd_missing_docs(array $b, string $stage): array {
    $current = pd_stage_index($stage);
    $missing = [];
    foreach (PD_DOC_TYPES as $type => $info) {
        if (pd_type_required($b['p'], $type) && pd_stage_index($info['stage']) <= $current && pd_type_missing($b, $type)) $missing[] = $type;
    }
    return $missing;
}

// Issued invoice that still waits for money
function pd_invoice_unpaid(array $i): bool {
    return $i['doc_status'] !== 'draft' && in_array($i['payment_status'], ['belum_dibayar', 'sebagian'], true);
}

// Jatuh tempo: issued (a draft is not billed yet), due_date < today and not lunas/dibatalkan (§4.2)
function pd_invoice_overdue(array $i, string $today): bool {
    return pd_invoice_unpaid($i) && $i['due_date'] < $today;
}

function pd_payment_status(float $paid, float $due): string {
    if ($paid >= $due) return 'lunas';
    return $paid > 0 ? 'sebagian' : 'belum_dibayar';
}

// The project's own payment terms, or the default terms from the settings
// project_client.service_type as one of the ServiceType values (an empty or unknown value counts as `other`)
function pd_service_type(array $p): string {
    $type = (string)($p['service_type'] ?? '');
    return isset(PD_SERVICE_LABEL[$type]) ? $type : 'other';
}

function pd_project_terms(mysqli $conn, array $p): array {
    $ignored = [];
    $terms = $p['payment_terms'] !== null ? pd_valid_terms(json_decode((string)$p['payment_terms'], true), 'payment_terms', $ignored) : null;
    return $terms ?? pd_settings($conn)['payment_terms'];
}

// ════════════════════════════════════════════════════════════════════════════
// Records
// ════════════════════════════════════════════════════════════════════════════

// pd_clients.name, falling back to project_client.client_name
function pd_client_name(array $p): ?string {
    if ($p['c_name'] !== null) return $p['c_name'];
    return ($p['client_name'] ?? '') !== '' ? $p['client_name'] : null;
}

// Client from a pd_clients row; customers do not see the internal notes
function pd_client_out(array $c, bool $customer = false): array {
    return [
        'id' => (int)$c['id'], 'type' => $c['type'], 'name' => $c['name'], 'pic_name' => $c['pic_name'], 'pic_title' => $c['pic_title'],
        'email' => $c['email'], 'phone' => $c['phone'], 'address' => $c['address'], 'city' => $c['city'], 'npwp' => $c['npwp'],
        'user_id' => pd_int_or_null($c['user_id']), 'notes' => $customer ? null : $c['notes'],
        'created_at' => $c['created_at'], 'updated_at' => $c['updated_at'],
    ];
}

// The linked client of a project row (c_* columns), or null
function pd_project_client(array $p): ?array {
    if ($p['c_id'] === null) return null;
    $client = [];
    foreach (['id', 'type', 'name', 'pic_name', 'pic_title', 'email', 'phone', 'address', 'city', 'npwp', 'user_id', 'notes', 'created_at', 'updated_at'] as $f) {
        $client[$f] = $p["c_$f"];
    }
    return $client;
}

function pd_milestone_out(array $m): array {
    return [
        'id' => (int)$m['id'], 'project_id' => (int)$m['project_id'], 'title' => $m['title'], 'description' => $m['description'],
        'start_date' => $m['start_date'], 'due_date' => $m['due_date'], 'weight' => (int)$m['weight'], 'progress' => (int)$m['progress'],
        'status' => $m['status'], 'sort_order' => (int)$m['sort_order'], 'completed_at' => $m['completed_at'],
    ];
}

function pd_doc_summary(array $d, array $p, array $signedParties): array {
    return [
        'id' => (int)$d['id'], 'project_id' => (int)$d['project_id'], 'project_code' => $p['code'], 'project_name' => $p['name'],
        'client_name' => pd_client_name($p), 'doc_type' => $d['doc_type'], 'number' => $d['number'], 'title' => $d['title'],
        'status' => $d['status'], 'version' => (int)$d['version'], 'doc_date' => $d['doc_date'],
        'revision_requested' => (int)$d['revision_requested'] === 1, 'review_note' => $d['review_note'],
        'signed_parties' => $signedParties, 'submitted_at' => $d['submitted_at'], 'approved_at' => $d['approved_at'],
        'completed_at' => $d['completed_at'], 'created_at' => $d['created_at'], 'updated_at' => $d['updated_at'],
    ];
}

// $i: pd_invoices row with `number` and `doc_status` of its document
function pd_invoice_summary(array $i, array $p, string $today): array {
    $due = pd_num($i['amount_due']);
    $paid = pd_num($i['amount_paid']);
    return [
        'id' => (int)$i['id'], 'document_id' => (int)$i['document_id'], 'project_id' => (int)$i['project_id'],
        'project_code' => $p['code'], 'project_name' => $p['name'], 'client_name' => pd_client_name($p),
        'number' => $i['number'], 'doc_status' => $i['doc_status'], 'kind' => $i['kind'], 'term_key' => $i['term_key'],
        'issue_date' => $i['issue_date'], 'due_date' => $i['due_date'], 'total' => pd_num($i['total']),
        'amount_due' => $due, 'amount_paid' => $paid, 'remaining' => max(0, $due - $paid),
        'payment_status' => $i['payment_status'], 'overdue' => pd_invoice_overdue($i, $today),
    ];
}

// InvoiceTotals from a pd_invoices row (base is not stored: subtotal − discount, ≥ 0)
function pd_invoice_totals(array $i): array {
    $subtotal = pd_num($i['subtotal']);
    $discount = pd_num($i['discount']);
    return [
        'subtotal' => $subtotal, 'discount' => $discount, 'base' => max(0, $subtotal - $discount), 'dpp' => pd_num($i['dpp']),
        'ppn_rate' => pd_num($i['ppn_rate']), 'ppn_amount' => pd_num($i['ppn_amount']), 'total' => pd_num($i['total']),
        'pph23_rate' => pd_num($i['pph23_rate']), 'pph23_amount' => pd_num($i['pph23_amount']), 'amount_due' => pd_num($i['amount_due']),
    ];
}

function pd_invoice_items(?string $json): array {
    $items = json_decode((string)$json, true);
    $out = [];
    foreach (is_array($items) ? $items : [] as $item) {
        if (!is_array($item)) continue;
        $out[] = ['description' => (string)($item['description'] ?? ''), 'qty' => pd_num($item['qty'] ?? 0), 'unit_price' => pd_num($item['unit_price'] ?? 0)];
    }
    return $out;
}

function pd_invoice_detail(array $i, array $p, string $today): array {
    return array_merge(pd_invoice_summary($i, $p, $today), pd_invoice_totals($i), [
        'items' => pd_invoice_items($i['items']),
        'ppn_enabled' => (float)$i['ppn_rate'] > 0,
        'pph23_enabled' => (float)$i['pph23_rate'] > 0,
        'notes' => $i['notes'],
    ]);
}

function pd_project_summary(array $b, string $today): array {
    $p = $b['p'];
    $stage = pd_stage($b, $today);
    $pending = 0;
    foreach ($b['docs'] as $d) {
        if ($d['status'] === 'menunggu_persetujuan') $pending++;
    }
    $unpaid = array_values(array_filter($b['invoices'], 'pd_invoice_unpaid'));
    usort($unpaid, function ($a, $c) {
        return [$a['due_date'], (int)$a['id']] <=> [$c['due_date'], (int)$c['id']];
    });
    $next = null;
    if ($unpaid) {
        $first = $unpaid[0];
        $next = [
            'invoice_id' => (int)$first['id'], 'number' => $first['number'], 'due_date' => $first['due_date'],
            'remaining' => max(0, pd_num($first['amount_due']) - pd_num($first['amount_paid'])),
            'overdue' => pd_invoice_overdue($first, $today),
        ];
    }
    $serviceType = pd_service_type($p);
    return [
        'id' => (int)$p['id'], 'code' => $p['code'], 'name' => $p['name'], 'service_type' => $serviceType,
        'service_label' => PD_SERVICE_LABEL[$serviceType], 'status' => $p['status'] ?: 'active',
        'client_id' => pd_int_or_null($p['client_id']), 'client_name' => pd_client_name($p), 'value' => pd_num($p['price'] ?? 0),
        'start_date' => $p['start_date'], 'end_date' => $p['end_date'], 'stage' => $stage,
        'stage_override' => in_array($p['stage_override'], PD_STAGES, true) ? $p['stage_override'] : null,
        'progress' => pd_progress($b['milestones']), 'missing_docs' => pd_missing_docs($b, $stage), 'pending_approvals' => $pending,
        'unpaid_invoices' => count($unpaid), 'next_due' => $next, 'updated_at' => $p['updated_at'],
    ];
}

// ProjectDetail; a customer gets no drafts (documents, checklist, invoices) and only client-visible activity
function pd_project_detail(mysqli $conn, array $b, string $today, bool $customer): array {
    $p = $b['p'];
    $summary = pd_project_summary($b, $today);
    $order = array_flip(array_keys(PD_DOC_TYPES));
    $docs = array_values(array_filter($b['docs'], function ($d) use ($customer) {
        return !$customer || $d['status'] !== 'draft';
    }));
    usort($docs, function ($a, $c) use ($order) {
        return [$order[$a['doc_type']], (int)$a['id']] <=> [$order[$c['doc_type']], (int)$c['id']];
    });
    $docOut = function (array $d) use ($b, $p) {
        return pd_doc_summary($d, $p, $b['signed'][(int)$d['id']] ?? []);
    };
    $checklist = [];
    foreach (PD_DOC_TYPES as $type => $info) {
        $ofType = array_values(array_filter($docs, function ($d) use ($type) {
            return $d['doc_type'] === $type;
        }));
        usort($ofType, function ($a, $c) {
            return (int)$a['id'] <=> (int)$c['id'];
        });
        $checklist[] = [
            'doc_type' => $type, 'stage' => $info['stage'], 'required' => pd_type_required($p, $type),
            'document' => $ofType ? $docOut(end($ofType)) : null, 'count' => count($ofType),
            'missing' => in_array($type, $summary['missing_docs'], true),
        ];
    }
    $invoices = [];
    foreach ($b['invoices'] as $i) {
        if (!$customer || $i['doc_status'] !== 'draft') $invoices[] = pd_invoice_summary($i, $p, $today);
    }
    $activityWhere = 'a.project_id = ?';
    $activityParams = [(int)$p['id']];
    if ($customer) {
        $activityWhere .= ' AND a.action IN (' . implode(',', array_fill(0, count(PD_CLIENT_VISIBLE_ACTIVITY), '?')) . ')';
        $activityParams = array_merge($activityParams, PD_CLIENT_VISIBLE_ACTIVITY);
    }
    $client = pd_project_client($p);
    return array_merge($summary, [
        'description' => $p['description'], 'scope_summary' => $p['scope_summary'],
        'use_mou' => (int)$p['use_mou'] === 1, 'has_maintenance' => (int)$p['has_maintenance'] === 1,
        'maintenance_fee' => $p['maintenance_fee'] === null ? null : pd_num($p['maintenance_fee']),
        'maintenance_period' => $p['maintenance_period'] ?: null, 'maintenance_start' => $p['maintenance_start'],
        'maintenance_end' => $p['maintenance_end'], 'payment_terms' => pd_project_terms($conn, $p),
        'client_email' => $p['client_email'], 'client_phone' => $p['client_phone'], 'assigned_user' => $p['assigned_user'],
        'client' => $client ? pd_client_out($client, $customer) : null,
        'milestones' => array_map('pd_milestone_out', $b['milestones']),
        'documents' => array_map($docOut, $docs),
        'invoices' => $invoices,
        'checklist' => $checklist,
        'activity' => pd_activity($conn, $activityWhere, $activityParams, 100),
    ]);
}

// Activity rows, newest first
function pd_activity(mysqli $conn, string $where, array $params, int $limit): array {
    $rows = db_all($conn, "SELECT a.id, a.project_id, p.code AS project_code, p.name AS project_name, a.document_id, d.number AS doc_number,
                                  a.user_id, u.name AS user_name, a.action, a.detail, a.created_at
                           FROM pd_activity a JOIN project_client p ON p.id = a.project_id
                           LEFT JOIN pd_documents d ON d.id = a.document_id LEFT JOIN users u ON u.id = a.user_id"
        . ($where !== '' ? " WHERE $where" : '') . " ORDER BY a.id DESC LIMIT " . (int)$limit, $params);
    return array_map(function ($a) {
        return [
            'id' => (int)$a['id'], 'project_id' => (int)$a['project_id'], 'project_code' => $a['project_code'],
            'project_name' => $a['project_name'], 'document_id' => pd_int_or_null($a['document_id']), 'doc_number' => $a['doc_number'],
            'user_id' => pd_int_or_null($a['user_id']), 'user_name' => $a['user_name'], 'action' => $a['action'],
            'detail' => $a['detail'], 'created_at' => $a['created_at'],
        ];
    }, $rows);
}

// ════════════════════════════════════════════════════════════════════════════
// Documents: DocDetail and MergeData
// ════════════════════════════════════════════════════════════════════════════

function pd_doc_row(mysqli $conn, int $id, bool $forUpdate = false): ?array {
    return db_one($conn, "SELECT * FROM pd_documents WHERE id = ?" . ($forUpdate ? " FOR UPDATE" : ''), [$id]);
}

function pd_signature_rows(mysqli $conn, int $docId, int $version): array {
    return db_all($conn, "SELECT * FROM pd_signatures WHERE document_id = ? AND version = ? ORDER BY party", [$docId, $version]);
}

function pd_signature_out(array $s, bool $customer): array {
    return [
        'id' => (int)$s['id'], 'version' => (int)$s['version'], 'party' => $s['party'], 'user_id' => (int)$s['user_id'],
        'signer_name' => $s['signer_name'], 'signer_title' => $s['signer_title'], 'method' => $s['method'],
        'content_hash' => $s['content_hash'], 'image_url' => 'pdfile:sig:' . $s['id'],
        'ip' => $customer ? null : $s['ip'], 'user_agent' => $customer ? null : $s['user_agent'], 'signed_at' => $s['signed_at'],
    ];
}

function pd_payment_out(array $pay): array {
    return [
        'id' => (int)$pay['id'], 'invoice_id' => (int)$pay['invoice_id'], 'amount' => pd_num($pay['amount']), 'paid_at' => $pay['paid_at'],
        'method' => $pay['method'], 'reference' => $pay['reference'], 'proof_url' => $pay['proof_file'] ? 'pdfile:proof:' . $pay['id'] : null,
        'note' => $pay['note'], 'receipt_document_id' => pd_int_or_null($pay['receipt_document_id']), 'receipt_number' => $pay['receipt_number'],
        'recorded_by' => (int)$pay['recorded_by'], 'recorded_by_name' => $pay['recorded_by_name'], 'created_at' => $pay['created_at'],
    ];
}

// Payments of an invoice, oldest first
function pd_payments_of(mysqli $conn, int $invoiceId): array {
    return array_map('pd_payment_out', db_all($conn, "SELECT pay.*, r.number AS receipt_number, u.name AS recorded_by_name
        FROM pd_payments pay LEFT JOIN pd_documents r ON r.id = pay.receipt_document_id LEFT JOIN users u ON u.id = pay.recorded_by
        WHERE pay.invoice_id = ? ORDER BY pay.paid_at, pay.id", [$invoiceId]));
}

// The invoice a document shows: its own (invoice) or the paid one (receipt), with number and doc_status
function pd_doc_invoice(mysqli $conn, array $b, array $d): ?array {
    if ($d['doc_type'] === 'invoice') return pd_bundle_invoice($b, 'document_id', (int)$d['id']);
    if ($d['doc_type'] !== 'receipt') return null;
    $pay = db_one($conn, "SELECT invoice_id FROM pd_payments WHERE receipt_document_id = ? LIMIT 1", [(int)$d['id']]);
    return $pay ? pd_bundle_invoice($b, 'id', (int)$pay['invoice_id']) : null;
}

// MergeData from the current project, client, company profile and invoice/payment (without `signatures`)
function pd_merge_live(mysqli $conn, array $b, array $d): array {
    $p = $b['p'];
    $value = pd_num($p['price'] ?? 0);
    $client = pd_project_client($p);
    $serviceType = pd_service_type($p);
    $text = function ($v) {
        return $v === null ? '' : (string)$v;
    };
    $merge = [
        'company' => pd_settings($conn)['company'],
        'client' => $client ? [
            'type' => $client['type'], 'name' => $client['name'], 'pic_name' => $text($client['pic_name']),
            'pic_title' => $text($client['pic_title']), 'email' => $text($client['email']), 'phone' => $text($client['phone']),
            'address' => $text($client['address']), 'city' => $text($client['city']), 'npwp' => $text($client['npwp']),
        ] : [
            'type' => 'perusahaan', 'name' => $text($p['client_name']), 'pic_name' => '', 'pic_title' => '',
            'email' => $text($p['client_email']), 'phone' => $text($p['client_phone']), 'address' => '', 'city' => '', 'npwp' => '',
        ],
        'project' => [
            'id' => (int)$p['id'], 'code' => $text($p['code']), 'name' => $text($p['name']), 'service_type' => $serviceType,
            'service_label' => PD_SERVICE_LABEL[$serviceType], 'description' => $text($p['description']),
            'scope_summary' => $text($p['scope_summary']), 'value' => $value, 'value_rupiah' => pd_rupiah($value),
            'value_terbilang' => pd_terbilang($value), 'start_date' => $text($p['start_date']), 'end_date' => $text($p['end_date']),
            'duration_days' => pd_duration_days($p['start_date'], $p['end_date']), 'payment_terms' => pd_project_terms($conn, $p),
            'has_maintenance' => (int)$p['has_maintenance'] === 1, 'maintenance_fee' => pd_num($p['maintenance_fee'] ?? 0),
            'maintenance_period' => $text($p['maintenance_period']), 'maintenance_start' => $text($p['maintenance_start']),
            'maintenance_end' => $text($p['maintenance_end']),
        ],
        'milestones' => array_map(function ($m) use ($text) {
            return [
                'title' => $m['title'], 'description' => $text($m['description']), 'start_date' => $text($m['start_date']),
                'due_date' => $text($m['due_date']), 'weight' => (int)$m['weight'], 'progress' => (int)$m['progress'], 'status' => $m['status'],
            ];
        }, $b['milestones']),
        'document' => [
            'number' => $d['number'], 'type' => $d['doc_type'], 'title' => $d['title'], 'date' => $d['doc_date'],
            'date_long' => pd_tanggal_panjang($d['doc_date']), 'day' => pd_hari($d['doc_date']), 'version' => (int)$d['version'],
            'status' => $d['status'],
        ],
    ];
    $invoice = pd_doc_invoice($conn, $b, $d);
    if ($invoice) {
        $merge['invoice'] = array_merge(pd_invoice_totals($invoice), [
            'kind' => $invoice['kind'], 'term_key' => $invoice['term_key'], 'issue_date' => $invoice['issue_date'],
            'due_date' => $invoice['due_date'], 'items' => pd_invoice_items($invoice['items']), 'amount_paid' => pd_num($invoice['amount_paid']),
            'payment_status' => $invoice['payment_status'], 'notes' => $text($invoice['notes']),
        ]);
    }
    if ($d['doc_type'] === 'receipt') {
        $pay = db_one($conn, "SELECT * FROM pd_payments WHERE receipt_document_id = ? LIMIT 1", [(int)$d['id']]);
        if ($pay) {
            $merge['payment'] = [
                'amount' => pd_num($pay['amount']), 'amount_terbilang' => pd_terbilang($pay['amount']), 'paid_at' => $pay['paid_at'],
                'method' => $pay['method'], 'reference' => $text($pay['reference']), 'invoice_number' => $invoice ? $invoice['number'] : '',
            ];
        }
    }
    return $merge;
}

// Snapshot frozen when a document leaves draft: MergeData with the new status, and the content hash of the version
function pd_freeze(mysqli $conn, array $b, array $d, string $status): array {
    $snapshot = pd_json(pd_merge_live($conn, $b, array_merge($d, ['status' => $status])));
    return [$snapshot, pd_content_hash($d['content'], $snapshot)];
}

// MergeData of a document: live while draft, the frozen snapshot otherwise. The document's own lifecycle values
// (document status/version, an invoice's amount_paid/payment_status) and the signatures are always current.
function pd_merge_for(mysqli $conn, array $b, array $d, array $signatureRows): array {
    $merge = ($d['status'] !== 'draft' && $d['snapshot'] !== null) ? json_decode($d['snapshot'], true) : null;
    if (is_array($merge) && isset($merge['document'])) {
        $merge['document']['status'] = $d['status'];
        $merge['document']['version'] = (int)$d['version'];
        $invoice = $d['doc_type'] === 'invoice' ? pd_bundle_invoice($b, 'document_id', (int)$d['id']) : null;
        if ($invoice && isset($merge['invoice'])) {
            $merge['invoice']['amount_paid'] = pd_num($invoice['amount_paid']);
            $merge['invoice']['payment_status'] = $invoice['payment_status'];
        }
    } else {
        $merge = pd_merge_live($conn, $b, $d);
    }
    unset($merge['signatures']);
    $merge['signatures'] = array_map(function ($s) {
        return [
            'party' => $s['party'], 'signer_name' => $s['signer_name'], 'signer_title' => (string)$s['signer_title'],
            'signed_at' => $s['signed_at'], 'image_url' => 'pdfile:sig:' . $s['id'],
        ];
    }, $signatureRows);
    return $merge;
}

// DocDetail; customers get no revisions and no audit data (ip, user agent)
function pd_document_detail(mysqli $conn, array $d, string $today, bool $customer): array {
    $b = pd_bundle($conn, (int)$d['project_id']);
    if (!$b) throw pd_not_found('Proyek');
    $docId = (int)$d['id'];
    $signatures = pd_signature_rows($conn, $docId, (int)$d['version']);
    $out = array_merge(pd_doc_summary($d, $b['p'], $b['signed'][$docId] ?? []), [
        'content' => pd_content_out($d['content']),
        'content_hash' => $d['content_hash'],
        'created_by' => pd_int_or_null($d['created_by']),
        'updated_by' => pd_int_or_null($d['updated_by']),
        'revisions' => $customer ? [] : array_map(function ($r) {
            return [
                'version' => (int)$r['version'], 'change_note' => $r['change_note'], 'changed_by' => pd_int_or_null($r['changed_by']),
                'changed_by_name' => $r['changed_by_name'], 'created_at' => $r['created_at'],
            ];
        }, db_all($conn, "SELECT r.version, r.change_note, r.changed_by, u.name AS changed_by_name, r.created_at
                          FROM pd_document_revisions r LEFT JOIN users u ON u.id = r.changed_by
                          WHERE r.document_id = ? ORDER BY r.version DESC", [$docId])),
        'approvals' => array_map(function ($a) use ($customer) {
            return [
                'id' => (int)$a['id'], 'version' => (int)$a['version'], 'user_id' => (int)$a['user_id'], 'user_name' => (string)$a['user_name'],
                'decision' => $a['decision'], 'note' => $a['note'], 'ip' => $customer ? null : $a['ip'],
                'user_agent' => $customer ? null : $a['user_agent'], 'created_at' => $a['created_at'],
            ];
        }, db_all($conn, "SELECT a.*, u.name AS user_name FROM pd_approvals a LEFT JOIN users u ON u.id = a.user_id
                          WHERE a.document_id = ? ORDER BY a.id DESC", [$docId])),
        'signatures' => array_map(function ($s) use ($customer) {
            return pd_signature_out($s, $customer);
        }, $signatures),
        'merge' => pd_merge_for($conn, $b, $d, $signatures),
    ]);
    $invoice = pd_doc_invoice($conn, $b, $d);
    if ($invoice) $out['invoice'] = pd_invoice_detail($invoice, $b['p'], $today);
    if ($invoice && $d['doc_type'] === 'invoice') $out['payments'] = pd_payments_of($conn, (int)$invoice['id']);
    return $out;
}

// ════════════════════════════════════════════════════════════════════════════
// Customer ownership (a project belongs to the customer linked to its client record)
// ════════════════════════════════════════════════════════════════════════════

function pd_customer_owns_project(mysqli $conn, array $user, int $projectId): bool {
    return (bool)db_one($conn, "SELECT p.id FROM project_client p JOIN pd_clients c ON c.id = p.client_id
                                WHERE p.id = ? AND c.user_id = ? LIMIT 1", [$projectId, (int)$user['id']]);
}
