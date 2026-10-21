// Project Documentation & Agreement Management (docs/platform/PROJECT-DOCS-SPEC.md) for backend/server.js.
// backend/modules/project_docs.php implements the same actions for the PHP backend: keep both identical
// (action names, input validation, JSON shapes of src/features/project-docs/types.ts, HTTP status codes and `code`).
//
// server.js calls handleProjectDocsAction() at the top of its /api.php GET and POST handlers, after the access check
// (createAuthGate in security.js sets req.user): ANY_ROLE_ACTIONS, CUSTOMER_ACTIONS and ADMIN_ACTIONS there already
// hold every pd_* action of spec §5; the handlers re-check roles (Developer limits) as a second line.
//
// FOUNDATION STUB: every pd_* action answers HTTP 501 {error: "Belum tersedia"} until the Node backend owner replaces
// this file with the real handlers (keep the export names and PROJECT_DOCS_ACTIONS).

export const PROJECT_DOCS_ACTIONS = Object.freeze([
  // staff (admin + Developer); admin-only ones are in ADMIN_ACTIONS of security.js
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
]);

/**
 * Runs a pd_* action. Returns false when the action is not one of ours (server.js continues), true when a response
 * was sent. Never throws.
 */
export async function handleProjectDocsAction(action, input, req, res, pool) {
  if (typeof action !== 'string' || !PROJECT_DOCS_ACTIONS.includes(action)) return false;
  // A deliberate 5xx with a safe message (maskServerErrors in security.js would replace it otherwise)
  res.locals.safeError = true;
  res.status(501).json({ error: 'Belum tersedia' });
  return true;
}
