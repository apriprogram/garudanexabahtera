<?php
// Project Documentation & Agreement Management (docs/platform/PROJECT-DOCS-SPEC.md) for backend/api.php.
// backend/modules/project_docs.js implements the same actions for the Node backend: keep both identical
// (action names, input validation, JSON shapes of src/features/project-docs/types.ts, HTTP status codes and `code`).
//
// api.php calls handle_project_docs_action() after the access check (authorize_request): ANY_ROLE_ACTIONS,
// CUSTOMER_ACTIONS and ADMIN_ACTIONS there already hold every pd_* action of spec §5; the handlers re-check roles
// (admin-only actions, the Developer limits, customer ownership) as a second line.
//
// Action `pd_<name>` runs pd_act_<name>($conn, $input, $user) from backend/modules/project_docs/:
//   core.php           document set table, validation, formatting, settings, numbering, transactions, activity,
//                      notifications, canonical JSON + content hash
//   records.php        project bundles, derived stage / progress / missing documents, JSON shapes, MergeData
//   files.php          private storage: signature PNGs (drawn or typed), payment proofs
//   workspace.php      dashboard, clients, customer accounts, projects, milestones, settings
//   documents.php      document lifecycle, approvals, signatures, customer projects and decisions
//   finance.php        invoices, payments, receipts
//   notifications.php  notifications (incl. due/overdue notices), pd_file
// Uses from api.php: ApiError, db_run/db_all/db_one/db_affected_rows, client_ip, public_dir.
//
// Conventions: success → HTTP 200 + {success: true, ...data}; failure → {error, code?, errors?} with 400 VALIDATION,
// 401, 403 FORBIDDEN, 404 NOT_FOUND, 409 LOCKED / DUPLICATE / STATE. Every action runs in the MySQL session time zone
// PD_DB_TIME_ZONE (Jakarta); every state change runs in a transaction and writes pd_activity.

require_once __DIR__ . '/project_docs/core.php';
require_once __DIR__ . '/project_docs/records.php';
require_once __DIR__ . '/project_docs/files.php';
require_once __DIR__ . '/project_docs/workspace.php';
require_once __DIR__ . '/project_docs/documents.php';
require_once __DIR__ . '/project_docs/finance.php';
require_once __DIR__ . '/project_docs/notifications.php';

const PD_ACTIONS = [
    // staff (admin + Developer); admin-only ones are in ADMIN_ACTIONS of api.php
    'pd_dashboard', 'pd_clients_list', 'pd_client_save', 'pd_client_delete', 'pd_customers_list',
    'pd_projects_list', 'pd_project_get', 'pd_project_save', 'pd_milestone_save', 'pd_milestone_delete',
    'pd_document_create', 'pd_document_get', 'pd_document_save', 'pd_document_restore', 'pd_document_submit',
    'pd_document_withdraw', 'pd_document_change', 'pd_document_sign', 'pd_document_complete', 'pd_document_delete',
    'pd_invoice_create', 'pd_invoice_update', 'pd_invoice_cancel', 'pd_payment_record', 'pd_payment_delete',
    'pd_settings_get', 'pd_settings_save',
    // customer (own projects only)
    'pd_my_projects', 'pd_my_project', 'pd_my_document', 'pd_my_document_decide',
    // any logged-in role
    'pd_notifications_list', 'pd_notifications_read', 'pd_file',
];

/** Runs a pd_* action; returns false when `$action` is not one of them (api.php continues). */
function handle_project_docs_action(mysqli $conn, string $action, array $input, ?array $user): bool {
    if (!in_array($action, PD_ACTIONS, true)) return false;
    db_run($conn, "SET time_zone = ?", [PD_DB_TIME_ZONE]);
    $data = call_user_func('pd_act_' . substr($action, 3), $conn, $input, $user);
    // pd_file streams the file itself
    if ($data !== null) echo json_encode(array_merge(['success' => true], $data), PD_JSON_FLAGS);
    return true;
}
