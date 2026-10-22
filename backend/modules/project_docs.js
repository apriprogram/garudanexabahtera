// Project Documentation & Agreement Management (docs/platform/PROJECT-DOCS-SPEC.md) for backend/server.js.
// backend/modules/project_docs.php implements the same actions for the PHP backend: keep both identical
// (action names, input validation, JSON shapes of src/features/project-docs/types.ts, HTTP status codes and `code`).
//
// server.js calls handleProjectDocsAction() at the top of its /api.php GET and POST handlers, after the access check
// (createAuthGate in security.js sets req.user): ANY_ROLE_ACTIONS, CUSTOMER_ACTIONS and ADMIN_ACTIONS there already
// hold every pd_* action of spec §5; the handlers re-check roles (admin-only actions, the Developer limits, customer
// ownership) as a second line.
//
// Action `pd_<name>` runs one handler (ctx, input, user) from backend/modules/project_docs/, the same split as PHP:
//   php.js             PHP-compatible primitives (trim, mb_*, round, number printing, json_encode, strict base64,
//                      FILTER_VALIDATE_EMAIL, crc32) so both backends accept, store and hash the same bytes
//   core.js            document set table, validation, formatting, settings, numbering, database + transactions,
//                      activity, notifications, canonical JSON + content hash
//   records.js         project bundles, derived stage / progress / missing documents, JSON shapes, MergeData
//   files.js           private storage (PD_STORAGE_DIR): signature PNGs (drawn or typed), payment proofs
//   workspace.js       dashboard, clients, customer accounts, projects, milestones, settings
//   documents.js       document lifecycle, approvals, signatures, customer projects and decisions
//   finance.js         invoices, payments, receipts
//   notifications.js   notifications (incl. due/overdue notices), pd_file
//
// Conventions: success → HTTP 200 + {success: true, ...data}; failure → {error, code?, errors?} with 400 VALIDATION,
// 401, 403 FORBIDDEN, 404 NOT_FOUND, 409 LOCKED / DUPLICATE / STATE. Every action runs on one pooled connection (like
// PHP's single mysqli connection: transactions and LAST_INSERT_ID() need it); every state change runs in a
// transaction and writes pd_activity.
import { PdError } from './project_docs/core.js';
import {
  pdActDocumentChange,
  pdActDocumentComplete,
  pdActDocumentCreate,
  pdActDocumentDelete,
  pdActDocumentGet,
  pdActDocumentRestore,
  pdActDocumentSave,
  pdActDocumentSign,
  pdActDocumentSubmit,
  pdActDocumentWithdraw,
  pdActMyDocument,
  pdActMyDocumentDecide,
  pdActMyProject,
  pdActMyProjects,
} from './project_docs/documents.js';
import {
  pdActInvoiceCancel,
  pdActInvoiceCreate,
  pdActInvoiceUpdate,
  pdActPaymentDelete,
  pdActPaymentRecord,
} from './project_docs/finance.js';
import { pdActFile, pdActNotificationsList, pdActNotificationsRead } from './project_docs/notifications.js';
import {
  pdActClientDelete,
  pdActClientSave,
  pdActClientsList,
  pdActCustomersList,
  pdActDashboard,
  pdActMilestoneDelete,
  pdActMilestoneSave,
  pdActProjectGet,
  pdActProjectSave,
  pdActProjectsList,
  pdActSettingsGet,
  pdActSettingsSave,
} from './project_docs/workspace.js';

const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';

const HANDLERS = Object.freeze({
  // staff (admin + Developer); admin-only ones are in ADMIN_ACTIONS of security.js
  pd_dashboard: pdActDashboard,
  pd_clients_list: pdActClientsList,
  pd_client_save: pdActClientSave,
  pd_client_delete: pdActClientDelete,
  pd_customers_list: pdActCustomersList,
  pd_projects_list: pdActProjectsList,
  pd_project_get: pdActProjectGet,
  pd_project_save: pdActProjectSave,
  pd_milestone_save: pdActMilestoneSave,
  pd_milestone_delete: pdActMilestoneDelete,
  pd_document_create: pdActDocumentCreate,
  pd_document_get: pdActDocumentGet,
  pd_document_save: pdActDocumentSave,
  pd_document_restore: pdActDocumentRestore,
  pd_document_submit: pdActDocumentSubmit,
  pd_document_withdraw: pdActDocumentWithdraw,
  pd_document_change: pdActDocumentChange,
  pd_document_sign: pdActDocumentSign,
  pd_document_complete: pdActDocumentComplete,
  pd_document_delete: pdActDocumentDelete,
  pd_invoice_create: pdActInvoiceCreate,
  pd_invoice_update: pdActInvoiceUpdate,
  pd_invoice_cancel: pdActInvoiceCancel,
  pd_payment_record: pdActPaymentRecord,
  pd_payment_delete: pdActPaymentDelete,
  pd_settings_get: pdActSettingsGet,
  pd_settings_save: pdActSettingsSave,
  // customer (own projects only)
  pd_my_projects: pdActMyProjects,
  pd_my_project: pdActMyProject,
  pd_my_document: pdActMyDocument,
  pd_my_document_decide: pdActMyDocumentDecide,
  // any logged-in role
  pd_notifications_list: pdActNotificationsList,
  pd_notifications_read: pdActNotificationsRead,
  pd_file: pdActFile,
});

export const PROJECT_DOCS_ACTIONS = Object.freeze(Object.keys(HANDLERS));

/**
 * Runs a pd_* action. Returns false when the action is not one of ours (server.js continues), true when a response
 * was sent. Never throws: every error becomes a JSON error response. The action is trimmed like actionOf() in
 * security.js, so the handler that runs is the one the auth gate checked.
 */
export async function handleProjectDocsAction(action, input, req, res, pool) {
  const name = typeof action === 'string' ? action.trim() : '';
  if (!Object.hasOwn(HANDLERS, name)) return false;
  let db = null;
  try {
    db = await pool.getConnection();
    const ctx = { db, req, res, settings: null };
    const body = input !== null && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const data = await HANDLERS[name](ctx, body, req.user || null);
    // pd_file streams the file itself
    if (data !== null) res.json({ success: true, ...data });
  } catch (err) {
    sendError(res, err, name);
  } finally {
    db?.release();
  }
  return true;
}

function sendError(res, err, action) {
  if (err instanceof PdError && !res.headersSent) {
    const body = { error: err.message };
    if (err.code) body.code = err.code;
    if (err.errors && Object.keys(err.errors).length) body.errors = err.errors;
    res.status(err.status).json(body);
    return;
  }
  // The browser closing a pd_file download early is not a server error
  if (err?.code !== 'ERR_STREAM_PREMATURE_CLOSE') console.error(`[api] ${action}:`, err);
  // A stream that broke after the headers went out can only be cut off
  if (res.headersSent) {
    res.destroy?.();
    return;
  }
  res.status(500).json({ error: GENERIC_ERROR });
}
