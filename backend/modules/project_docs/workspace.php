<?php
// pd_* actions of the staff workspace (see ../project_docs.php): dashboard, clients, customer accounts, projects,
// milestones and the document settings. Every handler: (mysqli, input, user) → response data (without `success`).

// ════════════════════════════════════════════════════════════════════════════
// Dashboard
// ════════════════════════════════════════════════════════════════════════════

// Counts, pipeline and panels over every project that is not cancelled
function pd_act_dashboard(mysqli $conn, array $input, ?array $user): array {
    pd_require_staff($user);
    $today = pd_today();
    $soon = pd_add_days($today, 3);
    $stats = [
        'projects_active' => 0, 'docs_missing' => 0, 'approvals_pending' => 0, 'invoices_unpaid_count' => 0,
        'invoices_unpaid_amount' => 0, 'invoices_overdue_count' => 0, 'invoices_overdue_amount' => 0,
    ];
    $stages = array_fill_keys(PD_STAGES, 0);
    $projects = [];
    $pending = [];
    $due = [];
    foreach (pd_bundles_synced($conn, "p.status IS NULL OR p.status <> 'canceled'", [], $today) as $b) {
        $summary = pd_project_summary($b, $today);
        $projects[] = $summary;
        $stages[$summary['stage']]++;
        if ($summary['stage'] !== 'selesai') $stats['projects_active']++;
        $stats['docs_missing'] += count($summary['missing_docs']);
        foreach ($b['docs'] as $d) {
            if ($d['status'] === 'menunggu_persetujuan') $pending[] = pd_doc_summary($d, $b['p'], $b['signed'][(int)$d['id']] ?? []);
        }
        foreach ($b['invoices'] as $i) {
            if (!pd_invoice_unpaid($i)) continue;
            $invoice = pd_invoice_summary($i, $b['p'], $today);
            $stats['invoices_unpaid_count']++;
            $stats['invoices_unpaid_amount'] += $invoice['remaining'];
            if ($invoice['overdue']) {
                $stats['invoices_overdue_count']++;
                $stats['invoices_overdue_amount'] += $invoice['remaining'];
            }
            if ($i['due_date'] <= $soon) $due[] = $invoice;
        }
    }
    $stats['approvals_pending'] = count($pending);
    usort($pending, function ($a, $b) {
        return [(string)$a['submitted_at'], $a['id']] <=> [(string)$b['submitted_at'], $b['id']];
    });
    usort($due, function ($a, $b) {
        return [$a['due_date'], $a['id']] <=> [$b['due_date'], $b['id']];
    });
    return [
        'stats' => $stats, 'stages' => $stages, 'projects' => $projects, 'pending_approvals' => $pending,
        'due_invoices' => array_slice($due, 0, 20), 'activity' => pd_activity($conn, '', [], 20),
    ];
}

// ════════════════════════════════════════════════════════════════════════════
// Clients and customer accounts
// ════════════════════════════════════════════════════════════════════════════

function pd_act_clients_list(mysqli $conn, array $input, ?array $user): array {
    pd_require_staff($user);
    $errors = [];
    $q = pd_text($input, 'q', 'Pencarian', 100, false, $errors);
    pd_fail($errors);
    $sql = "SELECT c.*, u.email AS user_email, (SELECT COUNT(*) FROM project_client p WHERE p.client_id = c.id) AS project_count
            FROM pd_clients c LEFT JOIN users u ON u.id = c.user_id";
    $params = [];
    if ($q !== null) {
        $sql .= " WHERE c.name LIKE ? OR c.pic_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.city LIKE ?";
        $params = array_fill(0, 5, pd_like($q));
    }
    $clients = array_map(function ($c) {
        return array_merge(pd_client_out($c), ['project_count' => (int)$c['project_count'], 'user_email' => $c['user_email']]);
    }, db_all($conn, $sql . " ORDER BY c.name, c.id", $params));
    return ['clients' => $clients];
}

// Create (no id) or update a client; user_id links a customer account (absent = unchanged, null = unlink)
function pd_act_client_save(mysqli $conn, array $input, ?array $user): array {
    pd_require_admin($user);
    $errors = [];
    $id = null;
    if (($input['id'] ?? null) !== null) {
        $id = pd_id_value($input['id']);
        if ($id === null) $errors['id'] = 'ID klien tidak valid.';
    }
    $type = pd_enum($input, 'type', 'Jenis klien', PD_CLIENT_TYPES, true, $errors);
    $name = pd_text($input, 'name', 'Nama klien', 255, true, $errors);
    $picName = pd_text($input, 'pic_name', 'Nama PIC', 255, false, $errors);
    $picTitle = pd_text($input, 'pic_title', 'Jabatan PIC', 255, false, $errors);
    $email = pd_text($input, 'email', 'Email', 255, false, $errors);
    if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Format email tidak valid, contoh: nama@email.com';
    $phone = pd_text($input, 'phone', 'Telepon', 50, false, $errors);
    if ($phone !== null && !preg_match('/^\+?[0-9 ().-]{6,50}$/', $phone)) $errors['phone'] = 'Nomor telepon tidak valid, contoh: 081234567890.';
    $address = pd_text($input, 'address', 'Alamat', 2000, false, $errors);
    $city = pd_text($input, 'city', 'Kota', 120, false, $errors);
    $npwp = pd_text($input, 'npwp', 'NPWP', 32, false, $errors);
    if ($npwp !== null && !preg_match('/^[0-9 .-]+$/', $npwp)) $errors['npwp'] = 'NPWP hanya angka, titik, dan tanda hubung.';
    $notes = pd_text($input, 'notes', 'Catatan', 2000, false, $errors);
    $linkGiven = array_key_exists('user_id', $input);
    $userId = null;
    if ($linkGiven && $input['user_id'] !== null && $input['user_id'] !== '') {
        $userId = pd_id_value($input['user_id']);
        if ($userId === null || !db_one($conn, "SELECT id FROM users WHERE id = ? AND role = 'customer' LIMIT 1", [$userId])) {
            $errors['user_id'] = 'Akun klien harus akun pelanggan (role customer) yang terdaftar.';
        }
    }
    pd_fail($errors);

    $values = [$type, $name, $picName, $picTitle, $email === null ? null : strtolower($email), $phone, $address, $city, $npwp, $notes];
    if ($id === null) {
        $id = pd_insert($conn, "INSERT INTO pd_clients (type, name, pic_name, pic_title, email, phone, address, city, npwp, notes, user_id)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", array_merge($values, [$userId]));
        return ['id' => $id];
    }
    if (!db_one($conn, "SELECT id FROM pd_clients WHERE id = ?", [$id])) throw pd_not_found('Klien');
    db_run($conn, "UPDATE pd_clients SET type = ?, name = ?, pic_name = ?, pic_title = ?, email = ?, phone = ?, address = ?, city = ?,
                       npwp = ?, notes = ?" . ($linkGiven ? ", user_id = ?" : '') . " WHERE id = ?",
        array_merge($values, $linkGiven ? [$userId] : [], [$id]));
    return ['id' => $id];
}

function pd_act_client_delete(mysqli $conn, array $input, ?array $user): array {
    pd_require_admin($user);
    $id = pd_require_id($input, 'id', 'ID klien');
    if (!db_one($conn, "SELECT id FROM pd_clients WHERE id = ?", [$id])) throw pd_not_found('Klien');
    $used = (int)db_one($conn, "SELECT COUNT(*) AS n FROM project_client WHERE client_id = ?", [$id])['n'];
    if ($used > 0) throw pd_conflict("Klien masih dipakai oleh $used proyek. Lepaskan dari proyek dulu.", 'STATE');
    db_run($conn, "DELETE FROM pd_clients WHERE id = ?", [$id]);
    return [];
}

// Active customer accounts that a client record can be linked to
function pd_act_customers_list(mysqli $conn, array $input, ?array $user): array {
    pd_require_admin($user);
    $errors = [];
    $q = pd_text($input, 'q', 'Pencarian', 100, false, $errors);
    pd_fail($errors);
    $sql = "SELECT id, name, email FROM users WHERE role = 'customer' AND status = 'active'";
    $params = [];
    if ($q !== null) {
        $sql .= " AND (name LIKE ? OR email LIKE ?)";
        $params = [pd_like($q), pd_like($q)];
    }
    $customers = array_map(function ($u) {
        return ['id' => (int)$u['id'], 'name' => $u['name'], 'email' => $u['email']];
    }, db_all($conn, $sql . " ORDER BY name, id LIMIT 50", $params));
    return ['customers' => $customers];
}

// ════════════════════════════════════════════════════════════════════════════
// Projects
// ════════════════════════════════════════════════════════════════════════════

function pd_act_projects_list(mysqli $conn, array $input, ?array $user): array {
    pd_require_staff($user);
    $errors = [];
    $stage = pd_enum($input, 'stage', 'Tahap', PD_STAGES, false, $errors);
    $q = pd_text($input, 'q', 'Pencarian', 100, false, $errors);
    pd_fail($errors);
    $where = '';
    $params = [];
    if ($q !== null) {
        $where = "p.name LIKE ? OR p.code LIKE ? OR p.client_name LIKE ? OR c.name LIKE ?";
        $params = array_fill(0, 4, pd_like($q));
    }
    $today = pd_today();
    $projects = [];
    foreach (pd_bundles_synced($conn, $where, $params, $today) as $b) {
        $summary = pd_project_summary($b, $today);
        if ($stage === null || $summary['stage'] === $stage) $projects[] = $summary;
    }
    return ['projects' => $projects];
}

function pd_act_project_get(mysqli $conn, array $input, ?array $user): array {
    pd_require_staff($user);
    $id = pd_require_id($input, 'id', 'ID proyek');
    $today = pd_today();
    $b = pd_bundles_synced($conn, 'p.id = ?', [$id], $today)[$id] ?? null;
    if (!$b) throw pd_not_found('Proyek');
    return ['project' => pd_project_detail($conn, $b, $today, false)];
}

// Workspace setup of an existing project_client row; assigns the project code (PRJ-YYYY-NNN) when it has none
function pd_act_project_save(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_admin($user);
    $id = pd_require_id($input, 'id', 'ID proyek');
    $errors = [];
    $clientId = null;
    if (($input['client_id'] ?? null) !== null && $input['client_id'] !== '') {
        $clientId = pd_id_value($input['client_id']);
        if ($clientId === null || !db_one($conn, "SELECT id FROM pd_clients WHERE id = ?", [$clientId])) $errors['client_id'] = 'Klien tidak ditemukan.';
    }
    $scope = pd_text($input, 'scope_summary', 'Ringkasan ruang lingkup', 10000, false, $errors);
    $useMou = pd_bool($input['use_mou'] ?? false);
    $hasMaintenance = pd_bool($input['has_maintenance'] ?? false);
    $fee = pd_money($input, 'maintenance_fee', 'Biaya maintenance', false, $errors);
    $period = pd_enum($input, 'maintenance_period', 'Periode maintenance', PD_MAINTENANCE_PERIODS, false, $errors);
    $start = pd_date($input, 'maintenance_start', 'Mulai maintenance', false, $errors);
    $end = pd_date($input, 'maintenance_end', 'Akhir maintenance', false, $errors);
    if ($start !== null && $end !== null && $end < $start) $errors['maintenance_end'] = 'Akhir maintenance tidak boleh sebelum tanggal mulai.';
    $terms = pd_valid_terms($input['payment_terms'] ?? null, 'payment_terms', $errors);
    $sets = [];
    $params = [];
    if (array_key_exists('price', $input)) {
        $price = pd_money($input, 'price', 'Nilai kontrak', false, $errors);
        $sets[] = 'price = ?';
        $params[] = $price;
    }
    if (array_key_exists('stage_override', $input)) {
        $override = pd_enum($input, 'stage_override', 'Tahap manual', PD_STAGES, false, $errors);
        $sets[] = 'stage_override = ?';
        $params[] = $override;
    }
    pd_fail($errors);

    pd_tx($conn, function () use ($conn, $user, $id, $clientId, $scope, $useMou, $hasMaintenance, $fee, $period, $start, $end, $terms, $sets, $params) {
        $project = db_one($conn, "SELECT id, code FROM project_client WHERE id = ? FOR UPDATE", [$id]);
        if (!$project) throw pd_not_found('Proyek');
        if ($project['code'] === null || $project['code'] === '') {
            $sets[] = 'code = ?';
            $params[] = pd_new_project_code($conn);
        }
        db_run($conn, "UPDATE project_client SET client_id = ?, scope_summary = ?, use_mou = ?, has_maintenance = ?, maintenance_fee = ?,
                           maintenance_period = ?, maintenance_start = ?, maintenance_end = ?, payment_terms = ?"
            . ($sets ? ', ' . implode(', ', $sets) : '') . " WHERE id = ?",
            array_merge([$clientId, $scope, $useMou ? 1 : 0, $hasMaintenance ? 1 : 0, $fee, $period, $start, $end, pd_json($terms)], $params, [$id]));
        pd_log($conn, $id, null, $user, 'project_saved', 'Data proyek dan pengaturan dokumen diperbarui');
    });
    return [];
}

// ════════════════════════════════════════════════════════════════════════════
// Milestones
// ════════════════════════════════════════════════════════════════════════════

function pd_act_milestone_save(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_staff($user);
    $errors = [];
    $projectId = pd_id_value($input['project_id'] ?? null);
    if ($projectId === null) $errors['project_id'] = 'ID proyek tidak valid.';
    $id = null;
    if (($input['id'] ?? null) !== null) {
        $id = pd_id_value($input['id']);
        if ($id === null) $errors['id'] = 'ID milestone tidak valid.';
    }
    $title = pd_text($input, 'title', 'Nama tahapan', 255, true, $errors);
    $description = pd_text($input, 'description', 'Deskripsi', 2000, false, $errors);
    $start = pd_date($input, 'start_date', 'Tanggal mulai', false, $errors);
    $due = pd_date($input, 'due_date', 'Tanggal selesai', false, $errors);
    if ($start !== null && $due !== null && $due < $start) $errors['due_date'] = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
    $weight = pd_int_in($input, 'weight', 'Bobot', 0, 1000, true, $errors);
    $progress = pd_int_in($input, 'progress', 'Progres', 0, 100, true, $errors);
    $status = pd_enum($input, 'status', 'Status', PD_MILESTONE_STATUSES, true, $errors);
    $sortGiven = ($input['sort_order'] ?? null) !== null;
    $sort = pd_int_in($input, 'sort_order', 'Urutan', -1000000, 1000000, false, $errors);
    pd_fail($errors);

    return pd_tx($conn, function () use ($conn, $user, $projectId, $id, $title, $description, $start, $due, $weight, $progress, $status, $sortGiven, $sort) {
        if (!db_one($conn, "SELECT id FROM project_client WHERE id = ? FOR UPDATE", [$projectId])) throw pd_not_found('Proyek');
        $values = [$title, $description, $start, $due, $weight, $progress, $status];
        if ($id === null) {
            if (!$sortGiven) $sort = (int)db_one($conn, "SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM pd_milestones WHERE project_id = ?", [$projectId])['n'];
            $id = pd_insert($conn, "INSERT INTO pd_milestones (project_id, title, description, start_date, due_date, weight, progress, status, sort_order, completed_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, " . ($status === 'selesai' ? 'NOW()' : 'NULL') . ")",
                array_merge([$projectId], $values, [$sort]));
        } else {
            if (!db_one($conn, "SELECT id FROM pd_milestones WHERE id = ? AND project_id = ?", [$id, $projectId])) throw pd_not_found('Milestone');
            db_run($conn, "UPDATE pd_milestones SET title = ?, description = ?, start_date = ?, due_date = ?, weight = ?, progress = ?, status = ?,
                               completed_at = " . ($status === 'selesai' ? 'COALESCE(completed_at, NOW())' : 'NULL')
                . ($sortGiven ? ', sort_order = ?' : '') . " WHERE id = ?",
                array_merge($values, $sortGiven ? [$sort] : [], [$id]));
        }
        pd_log($conn, $projectId, null, $user, 'milestone_saved', "Milestone \"$title\" disimpan ($progress%)");
        return ['id' => $id];
    });
}

function pd_act_milestone_delete(mysqli $conn, array $input, ?array $user): array {
    $user = pd_require_admin($user);
    $id = pd_require_id($input, 'id', 'ID milestone');
    $milestone = db_one($conn, "SELECT id, project_id, title FROM pd_milestones WHERE id = ?", [$id]);
    if (!$milestone) throw pd_not_found('Milestone');
    pd_tx($conn, function () use ($conn, $user, $milestone, $id) {
        db_run($conn, "DELETE FROM pd_milestones WHERE id = ?", [$id]);
        pd_log($conn, (int)$milestone['project_id'], null, $user, 'milestone_deleted', "Milestone \"{$milestone['title']}\" dihapus");
    });
    return [];
}

// ════════════════════════════════════════════════════════════════════════════
// Settings
// ════════════════════════════════════════════════════════════════════════════

function pd_act_settings_get(mysqli $conn, array $input, ?array $user): array {
    pd_require_staff($user);
    return pd_settings($conn, true);
}

// Saves the settings objects that were sent; each one is validated as a whole
function pd_act_settings_save(mysqli $conn, array $input, ?array $user): array {
    pd_require_admin($user);
    $errors = [];
    $values = [];
    foreach (PD_SETTING_KEYS as $name => $key) {
        if (!array_key_exists($name, $input)) continue;
        $value = pd_valid_setting($name, $input[$name], $errors);
        if ($value !== null) $values[$key] = $value;
    }
    pd_fail($errors);
    if (!$values) throw pd_bad('settings', 'Tidak ada pengaturan yang dikirim.');
    pd_tx($conn, function () use ($conn, $values) {
        foreach ($values as $key => $value) {
            db_run($conn, "INSERT INTO hero_settings (setting_key, setting_value) VALUES (?, ?)
                           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)", [$key, pd_json($value)]);
        }
    });
    pd_settings($conn, true);
    return [];
}
