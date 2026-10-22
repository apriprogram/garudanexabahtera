// Typed wrappers for the pd_* actions (docs/platform/PROJECT-DOCS-SPEC.md §5). Every action is sent as POST JSON
// (the spec allows POST for all of them; both backends accept it), so ids, booleans and nested objects keep their
// JSON types. The login token is attached by the fetch wrapper in src/lib/auth.ts; errors arrive as ApiError
// (src/lib/api.ts) with the server's `error`, `code` (NOT_FOUND, LOCKED, DUPLICATE, STATE, ...) and field `errors`.
import { apiPost, apiPostBlob } from '../../lib/api';
import type {
  ClientDeleteRequest,
  ClientDeleteResponse,
  ClientSaveRequest,
  ClientSaveResponse,
  ClientsListRequest,
  ClientsListResponse,
  CustomersListRequest,
  CustomersListResponse,
  DashboardResponse,
  DocumentChangeRequest,
  DocumentChangeResponse,
  DocumentCompleteRequest,
  DocumentCompleteResponse,
  DocumentCreateRequest,
  DocumentCreateResponse,
  DocumentDeleteRequest,
  DocumentDeleteResponse,
  DocumentGetRequest,
  DocumentGetResponse,
  DocumentRestoreRequest,
  DocumentRestoreResponse,
  DocumentSaveRequest,
  DocumentSaveResponse,
  DocumentSignRequest,
  DocumentSignResponse,
  DocumentSubmitRequest,
  DocumentSubmitResponse,
  DocumentWithdrawRequest,
  DocumentWithdrawResponse,
  FileRequest,
  InvoiceCancelRequest,
  InvoiceCancelResponse,
  InvoiceCreateRequest,
  InvoiceCreateResponse,
  InvoiceUpdateRequest,
  InvoiceUpdateResponse,
  MilestoneDeleteRequest,
  MilestoneDeleteResponse,
  MilestoneSaveRequest,
  MilestoneSaveResponse,
  MyDocumentDecideRequest,
  MyDocumentDecideResponse,
  MyDocumentRequest,
  MyDocumentResponse,
  MyProjectRequest,
  MyProjectResponse,
  MyProjectsResponse,
  NotificationsListRequest,
  NotificationsListResponse,
  NotificationsReadRequest,
  NotificationsReadResponse,
  PaymentDeleteRequest,
  PaymentDeleteResponse,
  PaymentRecordRequest,
  PaymentRecordResponse,
  PdAction,
  ProjectGetRequest,
  ProjectGetResponse,
  ProjectSaveRequest,
  ProjectSaveResponse,
  ProjectsListRequest,
  ProjectsListResponse,
  SettingsGetResponse,
  SettingsSaveRequest,
  SettingsSaveResponse,
} from './types';

/** POST one pd_* action; the request interfaces are plain JSON objects. */
const call = <Res>(action: PdAction, body: object = {}): Promise<Res> => apiPost<Res>(action, { ...body });

// ── Dashboard, clients, projects (staff; writes admin) ──

export const pdDashboard = () => call<DashboardResponse>('pd_dashboard');
export const pdClientsList = (req: ClientsListRequest = {}) => call<ClientsListResponse>('pd_clients_list', req);
export const pdClientSave = (req: ClientSaveRequest) => call<ClientSaveResponse>('pd_client_save', req);
export const pdClientDelete = (req: ClientDeleteRequest) => call<ClientDeleteResponse>('pd_client_delete', req);
export const pdCustomersList = (req: CustomersListRequest = {}) => call<CustomersListResponse>('pd_customers_list', req);
export const pdProjectsList = (req: ProjectsListRequest = {}) => call<ProjectsListResponse>('pd_projects_list', req);
export const pdProjectGet = (req: ProjectGetRequest) => call<ProjectGetResponse>('pd_project_get', req);
export const pdProjectSave = (req: ProjectSaveRequest) => call<ProjectSaveResponse>('pd_project_save', req);
export const pdMilestoneSave = (req: MilestoneSaveRequest) => call<MilestoneSaveResponse>('pd_milestone_save', req);
export const pdMilestoneDelete = (req: MilestoneDeleteRequest) => call<MilestoneDeleteResponse>('pd_milestone_delete', req);

// ── Documents (staff*; change/sign/complete/delete admin) ──

export const pdDocumentCreate = (req: DocumentCreateRequest) => call<DocumentCreateResponse>('pd_document_create', req);
export const pdDocumentGet = (req: DocumentGetRequest) => call<DocumentGetResponse>('pd_document_get', req);
export const pdDocumentSave = (req: DocumentSaveRequest) => call<DocumentSaveResponse>('pd_document_save', req);
export const pdDocumentRestore = (req: DocumentRestoreRequest) => call<DocumentRestoreResponse>('pd_document_restore', req);
export const pdDocumentSubmit = (req: DocumentSubmitRequest) => call<DocumentSubmitResponse>('pd_document_submit', req);
export const pdDocumentWithdraw = (req: DocumentWithdrawRequest) => call<DocumentWithdrawResponse>('pd_document_withdraw', req);
export const pdDocumentChange = (req: DocumentChangeRequest) => call<DocumentChangeResponse>('pd_document_change', req);
export const pdDocumentSign = (req: DocumentSignRequest) => call<DocumentSignResponse>('pd_document_sign', req);
export const pdDocumentComplete = (req: DocumentCompleteRequest) => call<DocumentCompleteResponse>('pd_document_complete', req);
export const pdDocumentDelete = (req: DocumentDeleteRequest) => call<DocumentDeleteResponse>('pd_document_delete', req);

// ── Invoices & payments (admin) ──

export const pdInvoiceCreate = (req: InvoiceCreateRequest) => call<InvoiceCreateResponse>('pd_invoice_create', req);
export const pdInvoiceUpdate = (req: InvoiceUpdateRequest) => call<InvoiceUpdateResponse>('pd_invoice_update', req);
export const pdInvoiceCancel = (req: InvoiceCancelRequest) => call<InvoiceCancelResponse>('pd_invoice_cancel', req);
export const pdPaymentRecord = (req: PaymentRecordRequest) => call<PaymentRecordResponse>('pd_payment_record', req);
export const pdPaymentDelete = (req: PaymentDeleteRequest) => call<PaymentDeleteResponse>('pd_payment_delete', req);

// ── Settings (read staff, write admin) ──

export const pdSettingsGet = () => call<SettingsGetResponse>('pd_settings_get');
export const pdSettingsSave = (req: SettingsSaveRequest) => call<SettingsSaveResponse>('pd_settings_save', req);

// ── Customer (own projects only) ──

export const pdMyProjects = () => call<MyProjectsResponse>('pd_my_projects');
export const pdMyProject = (req: MyProjectRequest) => call<MyProjectResponse>('pd_my_project', req);
export const pdMyDocument = (req: MyDocumentRequest) => call<MyDocumentResponse>('pd_my_document', req);
export const pdMyDocumentDecide = (req: MyDocumentDecideRequest) => call<MyDocumentDecideResponse>('pd_my_document_decide', req);

// ── Any logged-in role ──

export const pdNotificationsList = (req: NotificationsListRequest = {}) => call<NotificationsListResponse>('pd_notifications_list', req);
export const pdNotificationsRead = (req: NotificationsReadRequest) => call<NotificationsReadResponse>('pd_notifications_read', req);

/** pd_file as a Blob (signature PNG or payment proof) with the server's Content-Type. */
export const pdFile = (req: FileRequest) => apiPostBlob('pd_file', { ref: req.ref });

/** `pdfile:sig:12` / `sig:12` → `sig:12` (MergeData and Signature use the `pdfile:` form). */
export const pdFileRef = (ref: string) => (ref.startsWith('pdfile:') ? ref.slice('pdfile:'.length) : ref);

/**
 * Downloads a private file (signature image, payment proof) with the login token and returns an object URL for
 * <img src> / pdfmake / a download link. The caller releases it with URL.revokeObjectURL when done.
 */
export async function downloadPdFile(ref: string): Promise<string> {
  const blob = await pdFile({ ref: pdFileRef(ref) });
  return URL.createObjectURL(blob);
}
