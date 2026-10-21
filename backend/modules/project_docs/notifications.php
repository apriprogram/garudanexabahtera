<?php
// pd_* actions for every logged-in role (see ../project_docs.php): in-app notifications (with the lazily created
// due-soon / overdue invoice notices) and pd_file, the download of private signature images and payment proofs.

// Notices for issued, unpaid invoices due within 3 days (invoice_due) or already overdue (invoice_overdue): one per
// invoice per day for the client account and one for the admins; dedupe_key keeps them unique under parallel calls.
function pd_due_notices(mysqli $conn, string $today): void {
    $rows = db_all($conn, "SELECT i.id, i.project_id, i.document_id, i.due_date, i.amount_due, i.amount_paid, d.number, p.name AS project_name,
                                  c.user_id AS client_user_id
                           FROM pd_invoices i JOIN pd_documents d ON d.id = i.document_id JOIN project_client p ON p.id = i.project_id
                           LEFT JOIN pd_clients c ON c.id = p.client_id
                           WHERE d.status <> 'draft' AND i.payment_status IN ('belum_dibayar', 'sebagian') AND i.due_date <= ?",
        [pd_add_days($today, 3)]);
    foreach ($rows as $r) {
        $overdue = $r['due_date'] < $today;
        $type = $overdue ? 'invoice_overdue' : 'invoice_due';
        $projectId = (int)$r['project_id'];
        $notice = [
            'type' => $type, 'project_id' => $projectId,
            'title' => $overdue ? 'Invoice lewat jatuh tempo' : 'Invoice segera jatuh tempo',
            'body' => "Invoice {$r['number']} ({$r['project_name']}) sisa " . pd_rupiah(max(0, (float)$r['amount_due'] - (float)$r['amount_paid']))
                . ', jatuh tempo ' . pd_tanggal_panjang($r['due_date']) . '.',
        ];
        $key = "$type:{$r['id']}:$today";
        pd_notify($conn, $notice + ['role' => 'admin', 'link' => pd_doc_link('admin', $projectId, (int)$r['document_id']), 'dedupe_key' => "$key:admin"]);
        if ($r['client_user_id'] !== null) {
            $clientUser = (int)$r['client_user_id'];
            pd_notify($conn, $notice + [
                'user_id' => $clientUser, 'link' => pd_doc_link('customer', $projectId, (int)$r['document_id']), 'dedupe_key' => "$key:u$clientUser",
            ]);
        }
    }
}

// Notifications addressed to the user or broadcast to the user's role
function pd_notification_scope(array $user): array {
    return ['(n.user_id = ? OR (n.user_id IS NULL AND n.role = ?))', [(int)$user['id'], $user['role']]];
}

// Read state: personal ones in pd_notifications.read_at, role broadcasts per user in pd_notification_reads
const PD_NOTIFICATION_READ_AT = '(CASE WHEN n.user_id IS NULL THEN r.read_at ELSE n.read_at END)';

function pd_act_notifications_list(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_user($user);
    pd_due_notices($conn, pd_today());
    [$scope, $params] = pd_notification_scope($user);
    $from = "FROM pd_notifications n LEFT JOIN pd_notification_reads r ON r.notification_id = n.id AND r.user_id = ? WHERE $scope";
    $params = array_merge([(int)$user['id']], $params);
    $unreadOnly = pd_bool($input['unread_only'] ?? false);
    $rows = db_all($conn, "SELECT n.id, n.type, n.title, n.body, n.link, n.project_id, n.created_at, " . PD_NOTIFICATION_READ_AT . " AS read_at
                           $from" . ($unreadOnly ? ' AND ' . PD_NOTIFICATION_READ_AT . ' IS NULL' : '') . " ORDER BY n.id DESC LIMIT 50", $params);
    $unread = (int)db_one($conn, "SELECT COUNT(*) AS n $from AND " . PD_NOTIFICATION_READ_AT . " IS NULL", $params)['n'];
    $notifications = array_map(function ($n) {
        return [
            'id' => (int)$n['id'], 'type' => $n['type'], 'title' => $n['title'], 'body' => $n['body'], 'link' => $n['link'],
            'project_id' => pd_int_or_null($n['project_id']), 'read' => $n['read_at'] !== null, 'created_at' => $n['created_at'],
        ];
    }, $rows);
    return ['notifications' => $notifications, 'unread' => $unread];
}

// Marks one notification (id) or every unread one (all: true) as read
function pd_act_notifications_read(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_user($user);
    $uid = (int)$user['id'];
    [$scope, $params] = pd_notification_scope($user);
    if (pd_bool($input['all'] ?? false)) {
        $where = "$scope";
    } else {
        $id = pd_require_id($input, 'id', 'ID notifikasi');
        $where = "$scope AND n.id = ?";
        $params[] = $id;
        if (!db_one($conn, "SELECT n.id FROM pd_notifications n WHERE $where", $params)) throw pd_not_found('Notifikasi');
    }
    pd_tx($conn, function () use ($conn, $uid, $where, $params) {
        db_run($conn, "UPDATE pd_notifications n SET n.read_at = NOW() WHERE $where AND n.user_id IS NOT NULL AND n.read_at IS NULL", $params);
        db_run($conn, "INSERT IGNORE INTO pd_notification_reads (notification_id, user_id, read_at)
                       SELECT n.id, ?, NOW() FROM pd_notifications n WHERE $where AND n.user_id IS NULL", array_merge([$uid], $params));
    });
    return [];
}

// Private file by reference `sig:<id>` / `proof:<id>` (a `pdfile:` prefix is accepted). Staff may read any file,
// a customer only the files of an own project. Returns null: the binary response is already sent.
function pd_act_file(mysqli $conn, array $input, ?array $user): ?array {
    $user = pd_require_user($user);
    $ref = is_string($input['ref'] ?? null) ? $input['ref'] : '';
    if (strpos($ref, 'pdfile:') === 0) $ref = substr($ref, strlen('pdfile:'));
    if (!preg_match('/^(sig|proof):([1-9][0-9]{0,9})$/', $ref, $m)) throw pd_bad('ref', 'Referensi file tidak valid.');
    $isSignature = $m[1] === 'sig';
    $id = (int)$m[2];
    $row = $isSignature
        ? db_one($conn, "SELECT s.image_file AS file, d.project_id FROM pd_signatures s JOIN pd_documents d ON d.id = s.document_id WHERE s.id = ?", [$id])
        : db_one($conn, "SELECT pay.proof_file AS file, i.project_id FROM pd_payments pay JOIN pd_invoices i ON i.id = pay.invoice_id WHERE pay.id = ?", [$id]);
    $allowed = $row && ($user['role'] !== 'customer' || pd_customer_owns_project($conn, $user, (int)$row['project_id']));
    $path = $allowed ? pd_stored_path($row['file']) : null;
    if ($path === null) throw pd_not_found('File');

    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $name = ($isSignature ? 'tanda-tangan-' : 'bukti-pembayaran-') . $id . '.' . $ext;
    header('Content-Type: ' . PD_FILE_TYPES[$ext]);
    header('Content-Length: ' . filesize($path));
    header('Content-Disposition: attachment; filename="' . $name . '"');
    header('Cache-Control: private, no-store');
    // Opened directly, the file must not run script on this origin
    header("Content-Security-Policy: default-src 'none'; sandbox");
    header('X-Content-Type-Options: nosniff');
    while (ob_get_level() > 0) ob_end_clean();
    readfile($path);
    return null;
}
