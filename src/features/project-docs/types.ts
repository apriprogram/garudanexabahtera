// Shared contract of Project Documentation & Agreement Management (docs/platform/PROJECT-DOCS-SPEC.md §4–§5).
// backend/modules/project_docs.php and backend/modules/project_docs.js emit exactly these JSON shapes; the
// document engine (./engine), the admin pages (src/pages/admin/project-docs) and the customer pages
// (src/pages/account/projects) read them. Change a shape here, in the spec and in both backends together.
//
// JSON conventions (same as the rest of the API):
// - ids, money (rupiah) and percentages are JSON numbers; tinyint flags are JSON booleans.
// - dates are 'YYYY-MM-DD'; timestamps are 'YYYY-MM-DD HH:MM:SS' (database time, Asia/Jakarta).
// - optional text columns are `string | null` in records; inside MergeData every text is a string ('' when empty),
//   so templates never have to handle null.
// - success: HTTP 200 + {success: true, ...}; failure: HTTP 4xx/5xx + {error, code?, errors?}.

// ════════════════════════════════════════════════════════════════════════════
// Enums
// ════════════════════════════════════════════════════════════════════════════

export type DocType = 'brd' | 'mou' | 'proposal' | 'pks' | 'timeline' | 'uat' | 'bast' | 'invoice' | 'receipt' | 'sla';
export type DocStatus = 'draft' | 'menunggu_persetujuan' | 'disetujui' | 'selesai';
/** Project stage, in order (spec §2). */
export type Stage =
  | 'perencanaan'
  | 'penawaran'
  | 'kontrak'
  | 'pengerjaan'
  | 'uji'
  | 'serah_terima'
  | 'pelunasan'
  | 'maintenance'
  | 'selesai';
export type Party = 'pihak_pertama' | 'pihak_kedua';
/** project_client.service_type */
export type ServiceType = 'website' | 'mobile_app' | 'ui_ux' | 'other';
/** project_client.status (existing Project Clients column, independent of the document stage) */
export type ProjectStatus = 'active' | 'pending' | 'completed' | 'canceled';
export type ClientType = 'perusahaan' | 'perorangan';
export type MilestoneStatus = 'belum_mulai' | 'berjalan' | 'selesai' | 'tertunda';
export type InvoiceKind = 'dp' | 'termin' | 'pelunasan' | 'maintenance' | 'lainnya';
export type PaymentStatus = 'belum_dibayar' | 'sebagian' | 'lunas' | 'dibatalkan';
export type PaymentMethod = 'transfer' | 'tunai' | 'qris' | 'lainnya';
export type PaymentTrigger = 'kontrak' | 'pengerjaan' | 'uji' | 'serah_terima' | 'manual';
export type MaintenancePeriod = 'bulanan' | 'tahunan';
export type ApprovalDecision = 'approved' | 'rejected';
export type SignatureMethod = 'draw' | 'type';
export type UserRole = 'admin' | 'user' | 'customer';
/** pd_notifications.type written by the backends (spec §5 "Notifications created by the backend"). */
export type NotificationType =
  | 'doc_review'
  | 'invoice_issued'
  | 'doc_approved'
  | 'doc_rejected'
  | 'payment_received'
  | 'invoice_due'
  | 'invoice_overdue';
/** pd_activity.action values written by the backends (one per state change). */
export type ActivityAction =
  | 'project_saved'
  | 'milestone_saved'
  | 'milestone_deleted'
  | 'doc_created'
  | 'doc_saved'
  | 'doc_restored'
  | 'doc_submitted'
  | 'doc_issued'
  | 'doc_withdrawn'
  | 'doc_change'
  | 'doc_approved'
  | 'doc_rejected'
  | 'doc_signed'
  | 'doc_completed'
  | 'doc_deleted'
  | 'invoice_created'
  | 'invoice_updated'
  | 'invoice_cancelled'
  | 'payment_recorded'
  | 'payment_deleted';

/** Activity a client may see in pd_my_project (everything else is internal). */
export const CLIENT_VISIBLE_ACTIVITY: readonly ActivityAction[] = [
  'doc_submitted',
  'doc_issued',
  'doc_approved',
  'doc_rejected',
  'doc_signed',
  'doc_completed',
  'invoice_cancelled',
  'payment_recorded',
];

// ════════════════════════════════════════════════════════════════════════════
// Labels (Bahasa Indonesia, sentence case; DOC_TYPES and STAGES live in ./engine)
// ════════════════════════════════════════════════════════════════════════════

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  draft: 'Draft',
  menunggu_persetujuan: 'Menunggu persetujuan',
  disetujui: 'Disetujui',
  selesai: 'Selesai',
};
/** Invoice wording of `disetujui` (spec §1.1); a draft with `revision_requested` is shown as "Perlu revisi". */
export const INVOICE_ISSUED_LABEL = 'Terbit';
export const REVISION_REQUESTED_LABEL = 'Perlu revisi';

/** MergeData.project.service_label; backends use the same words. */
export const SERVICE_LABEL: Record<ServiceType, string> = {
  website: 'Website',
  mobile_app: 'Aplikasi Mobile',
  ui_ux: 'Desain UI/UX',
  other: 'Aplikasi Custom',
};
export const CLIENT_TYPE_LABEL: Record<ClientType, string> = { perusahaan: 'Perusahaan', perorangan: 'Perorangan' };
export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  belum_mulai: 'Belum mulai',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
  tertunda: 'Tertunda',
};
export const INVOICE_KIND_LABEL: Record<InvoiceKind, string> = {
  dp: 'Uang muka (DP)',
  termin: 'Termin',
  pelunasan: 'Pelunasan',
  maintenance: 'Maintenance',
  lainnya: 'Lainnya',
};
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  belum_dibayar: 'Belum dibayar',
  sebagian: 'Dibayar sebagian',
  lunas: 'Lunas',
  dibatalkan: 'Dibatalkan',
};
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: 'Transfer bank',
  tunai: 'Tunai',
  qris: 'QRIS',
  lainnya: 'Lainnya',
};
export const PAYMENT_TRIGGER_LABEL: Record<PaymentTrigger, string> = {
  kontrak: 'Saat kontrak ditandatangani',
  pengerjaan: 'Saat pengerjaan',
  uji: 'Saat UAT',
  serah_terima: 'Saat serah terima',
  manual: 'Manual',
};
export const MAINTENANCE_PERIOD_LABEL: Record<MaintenancePeriod, string> = { bulanan: 'Bulanan', tahunan: 'Tahunan' };
export const PARTY_LABEL: Record<Party, string> = { pihak_pertama: 'Pihak Pertama', pihak_kedua: 'Pihak Kedua' };
/** Role names in this feature (spec §0): staff `user` is shown as Developer. */
export const ROLE_LABEL: Record<UserRole, string> = { admin: 'Administrator', user: 'Developer', customer: 'Klien' };

// ════════════════════════════════════════════════════════════════════════════
// §4.1 Document content
// ════════════════════════════════════════════════════════════════════════════

export interface DocTable {
  columns: string[];
  rows: string[][];
}

/**
 * One editable section. `body` markup: blank line = paragraph, `- ` = bullet, `1. ` = numbered, `**bold**`,
 * merge fields `{{path}}` resolved at render time from MergeData.
 */
export interface DocSection {
  id: string;
  title: string;
  body?: string;
  table?: DocTable;
  hidden?: boolean;
}

/** Stored in pd_documents.content / pd_document_revisions.content (max 256 KB as JSON). */
export interface DocContent {
  title?: string;
  sections: DocSection[];
  fields?: Record<string, string | number | boolean>;
}

// ════════════════════════════════════════════════════════════════════════════
// §4.2 Money & terms
// ════════════════════════════════════════════════════════════════════════════

/** One payment term; a project's terms sum to 100 % (± 0.01). */
export interface PaymentTerm {
  key: string;
  label: string;
  percent: number;
  trigger: PaymentTrigger;
  due_days: number;
}

export interface InvoiceItem {
  description: string;
  qty: number;
  unit_price: number;
}

/** Invoice math, identical in PHP, Node and the engine (spec §4.2). Integers (rupiah). */
export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  base: number;
  dpp: number;
  ppn_rate: number;
  ppn_amount: number;
  total: number;
  pph23_rate: number;
  pph23_amount: number;
  amount_due: number;
}

/** Options of calcInvoice() (ppn/dpp numbers come from settings `pd_tax`). */
export interface InvoiceCalcOptions {
  discount: number;
  ppn_enabled: boolean;
  ppn_rate: number;
  dpp_numerator: number;
  dpp_denominator: number;
  pph23_enabled: boolean;
  pph23_rate: number;
}

// ════════════════════════════════════════════════════════════════════════════
// Settings (hero_settings keys pd_company, pd_numbering, pd_tax, pd_payment_terms, pd_sla_defaults)
// ════════════════════════════════════════════════════════════════════════════

export interface BankAccount {
  bank: string;
  number: string;
  holder: string;
}

export interface CompanySettings {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  npwp: string;
  signatory_name: string;
  signatory_title: string;
  bank_accounts: BankAccount[];
}

export interface NumberingSettings {
  /** PREFIX of `{SEQ:3}/{CODE}/{PREFIX}/{ROMAN_MONTH}/{YEAR}`, default GNB */
  prefix: string;
}

export interface TaxSettings {
  ppn_enabled: boolean;
  ppn_rate: number;
  dpp_numerator: number;
  dpp_denominator: number;
  pph23_rate: number;
}

export interface SlaPriority {
  level: string;
  response: string;
  resolution: string;
}

export interface SlaDefaults {
  support_hours: string;
  uptime: string;
  priorities: SlaPriority[];
}

export interface PdSettings {
  company: CompanySettings;
  numbering: NumberingSettings;
  tax: TaxSettings;
  payment_terms: PaymentTerm[];
  sla_defaults: SlaDefaults;
}

// ════════════════════════════════════════════════════════════════════════════
// §4.3 MergeData (what documents render from; live while draft, frozen snapshot afterwards)
// ════════════════════════════════════════════════════════════════════════════

export type MergeCompany = CompanySettings;

export interface MergeClient {
  type: ClientType;
  name: string;
  pic_name: string;
  pic_title: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  npwp: string;
}

export interface MergeProject {
  id: number;
  code: string;
  name: string;
  service_type: ServiceType;
  /** SERVICE_LABEL[service_type] */
  service_label: string;
  description: string;
  scope_summary: string;
  /** contract value = project_client.price (0 when empty) */
  value: number;
  /** formatRupiahDoc(value), e.g. "Rp15.000.000" */
  value_rupiah: string;
  /** terbilang(value), e.g. "lima belas juta rupiah" */
  value_terbilang: string;
  start_date: string;
  end_date: string;
  /** inclusive day count start → end, 0 when a date is missing */
  duration_days: number;
  payment_terms: PaymentTerm[];
  has_maintenance: boolean;
  maintenance_fee: number;
  maintenance_period: MaintenancePeriod | '';
  maintenance_start: string;
  maintenance_end: string;
}

export interface MergeMilestone {
  title: string;
  description: string;
  start_date: string;
  due_date: string;
  weight: number;
  progress: number;
  status: MilestoneStatus;
}

export interface MergeDocument {
  number: string;
  type: DocType;
  title: string;
  /** doc_date 'YYYY-MM-DD' */
  date: string;
  /** tanggalPanjang(date), e.g. "21 Oktober 2026" */
  date_long: string;
  /** hari(date), e.g. "Rabu" */
  day: string;
  version: number;
  status: DocStatus;
}

/** Present for invoice documents and for receipts (the invoice that was paid). */
export interface MergeInvoice extends InvoiceTotals {
  kind: InvoiceKind;
  /** PaymentTerm.key the invoice bills (label/percent: look it up in project.payment_terms), null = manual */
  term_key: string | null;
  issue_date: string;
  due_date: string;
  items: InvoiceItem[];
  amount_paid: number;
  payment_status: PaymentStatus;
  notes: string;
}

/** Present for receipts (Kuitansi). */
export interface MergePayment {
  amount: number;
  amount_terbilang: string;
  paid_at: string;
  method: PaymentMethod;
  reference: string;
  invoice_number: string;
}

export interface MergeSignature {
  party: Party;
  signer_name: string;
  signer_title: string;
  signed_at: string;
  /** pd_file reference `pdfile:sig:<id>`; download with downloadPdFile() (needs the token) */
  image_url?: string;
}

export interface MergeData {
  company: MergeCompany;
  client: MergeClient;
  project: MergeProject;
  milestones: MergeMilestone[];
  document: MergeDocument;
  invoice?: MergeInvoice;
  payment?: MergePayment;
  /** always live: signatures of the current version */
  signatures: MergeSignature[];
}

// ════════════════════════════════════════════════════════════════════════════
// Records returned by the API
// ════════════════════════════════════════════════════════════════════════════

export interface Client {
  id: number;
  type: ClientType;
  name: string;
  pic_name: string | null;
  pic_title: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  npwp: string | null;
  /** linked customer account (users.id, role customer) */
  user_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

/** Row of pd_clients_list. */
export interface ClientListItem extends Client {
  project_count: number;
  /** email of the linked customer account */
  user_email?: string | null;
}

/** Customer account that can be linked to a client (pd_customers_list). */
export interface CustomerOption {
  id: number;
  name: string;
  email: string;
}

export interface Milestone {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  weight: number;
  /** 0..100 */
  progress: number;
  status: MilestoneStatus;
  sort_order: number;
  completed_at: string | null;
}

/** Document in lists (project documents, dashboard "Menunggu persetujuan"). */
export interface DocSummary {
  id: number;
  project_id: number;
  project_code: string | null;
  project_name: string;
  client_name: string | null;
  doc_type: DocType;
  number: string;
  title: string;
  status: DocStatus;
  version: number;
  doc_date: string;
  /** client rejected → back to draft ("Perlu revisi") */
  revision_requested: boolean;
  review_note: string | null;
  /** parties that signed the current version (empty for types without signatures) */
  signed_parties: Party[];
  submitted_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Revision {
  version: number;
  change_note: string | null;
  changed_by: number | null;
  changed_by_name: string | null;
  created_at: string;
}

export interface Approval {
  id: number;
  version: number;
  user_id: number;
  user_name: string;
  decision: ApprovalDecision;
  note: string | null;
  /** audit data; null in customer responses */
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Signature {
  id: number;
  version: number;
  party: Party;
  user_id: number;
  signer_name: string;
  signer_title: string | null;
  method: SignatureMethod;
  /** SHA-256 of the signed version ({content, snapshot}) */
  content_hash: string;
  /** pd_file reference `pdfile:sig:<id>` */
  image_url: string;
  /** audit data; null in customer responses */
  ip: string | null;
  user_agent: string | null;
  signed_at: string;
}

/** Invoice in lists (project invoices, dashboard "Invoice jatuh tempo"). `id` is pd_invoices.id. */
export interface InvoiceSummary {
  id: number;
  document_id: number;
  project_id: number;
  project_code: string | null;
  project_name: string;
  client_name: string | null;
  number: string;
  doc_status: DocStatus;
  kind: InvoiceKind;
  term_key: string | null;
  issue_date: string;
  due_date: string;
  total: number;
  amount_due: number;
  amount_paid: number;
  /** amount_due − amount_paid (≥ 0) */
  remaining: number;
  payment_status: PaymentStatus;
  /** due_date < today and not lunas/dibatalkan */
  overdue: boolean;
}

/** Full invoice inside DocDetail.invoice. */
export interface InvoiceDetail extends InvoiceSummary, InvoiceTotals {
  items: InvoiceItem[];
  ppn_enabled: boolean;
  pph23_enabled: boolean;
  notes: string | null;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  paid_at: string;
  method: PaymentMethod;
  reference: string | null;
  /** pd_file reference `pdfile:proof:<id>`, null without proof */
  proof_url: string | null;
  note: string | null;
  receipt_document_id: number | null;
  receipt_number: string | null;
  recorded_by: number;
  recorded_by_name: string | null;
  created_at: string;
}

/** Document with everything the editor / viewer needs (pd_document_get, pd_my_document). */
export interface DocDetail extends DocSummary {
  content: DocContent;
  content_hash: string | null;
  created_by: number | null;
  updated_by: number | null;
  /** newest first; empty in customer responses */
  revisions: Revision[];
  approvals: Approval[];
  /** signatures of the current version */
  signatures: Signature[];
  merge: MergeData;
  /** invoice documents (and receipts: the paid invoice) */
  invoice?: InvoiceDetail;
  /** invoice documents: recorded payments, oldest first */
  payments?: Payment[];
}

export interface Activity {
  id: number;
  project_id: number;
  project_code: string | null;
  project_name: string;
  document_id: number | null;
  doc_number: string | null;
  user_id: number | null;
  user_name: string | null;
  action: ActivityAction;
  detail: string | null;
  created_at: string;
}

/** Next unpaid invoice of a project (earliest due date). */
export interface NextDue {
  invoice_id: number;
  number: string;
  due_date: string;
  remaining: number;
  overdue: boolean;
}

/** Project in lists (dashboard, pd_projects_list, pd_my_projects). `id` is project_client.id. */
export interface ProjectSummary {
  id: number;
  /** PRJ-YYYY-NNN, null until the workspace is first saved */
  code: string | null;
  name: string;
  service_type: ServiceType;
  service_label: string;
  status: ProjectStatus;
  client_id: number | null;
  /** pd_clients.name, falling back to project_client.client_name */
  client_name: string | null;
  /** contract value (project_client.price) */
  value: number;
  start_date: string | null;
  end_date: string | null;
  /** derived stage (stage_override wins), spec §2 */
  stage: Stage;
  stage_override: Stage | null;
  /** 0..100, weighted milestone progress */
  progress: number;
  /** spec §2 "Missing documents" */
  missing_docs: DocType[];
  /** documents in menunggu_persetujuan (customer UI: "Perlu tindakan") */
  pending_approvals: number;
  /** issued invoices that are not lunas/dibatalkan */
  unpaid_invoices: number;
  next_due: NextDue | null;
  updated_at: string | null;
}

/** One row of the project document checklist, in DOC_TYPES order. */
export interface ChecklistItem {
  doc_type: DocType;
  stage: Stage;
  /** required for this project (mou / sla only when use_mou / has_maintenance) */
  required: boolean;
  /** the document of this type (invoice / receipt: the newest one), null when none exists */
  document: DocSummary | null;
  /** documents of this type (invoice / receipt can have several) */
  count: number;
  /** required, stage reached and missing or still draft (spec §2) */
  missing: boolean;
}

/** pd_project_get / pd_my_project. Customers get no drafts and only CLIENT_VISIBLE_ACTIVITY. */
export interface ProjectDetail extends ProjectSummary {
  description: string | null;
  scope_summary: string | null;
  use_mou: boolean;
  has_maintenance: boolean;
  maintenance_fee: number | null;
  maintenance_period: MaintenancePeriod | null;
  maintenance_start: string | null;
  maintenance_end: string | null;
  payment_terms: PaymentTerm[];
  /** legacy contact fields of project_client, shown when no client record is linked */
  client_email: string | null;
  client_phone: string | null;
  assigned_user: string | null;
  client: Client | null;
  milestones: Milestone[];
  documents: DocSummary[];
  invoices: InvoiceSummary[];
  checklist: ChecklistItem[];
  /** newest first */
  activity: Activity[];
}

export interface PdNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  /** in-app path, e.g. /akun/proyek/3/dokumen/12 */
  link: string | null;
  project_id: number | null;
  read: boolean;
  created_at: string;
}

export interface DashboardStats {
  projects_active: number;
  docs_missing: number;
  approvals_pending: number;
  invoices_unpaid_count: number;
  invoices_unpaid_amount: number;
  invoices_overdue_count: number;
  invoices_overdue_amount: number;
}

// ════════════════════════════════════════════════════════════════════════════
// §5 Actions: one request + one response interface per action
// ════════════════════════════════════════════════════════════════════════════

/** Every success response carries `success: true`. */
export interface Ok {
  success: true;
}

/** Response of the document state changes (submit, withdraw, change, sign, complete, decide). */
export interface DocumentStateResponse extends Ok {
  status: DocStatus;
  version: number;
}

/** Signature as sent by the signature pad (draw → PNG data URL, type → typed name rendered by the server). */
export interface SignatureInput {
  method: SignatureMethod;
  /** method draw: `data:image/png;base64,...`, ≤ 300 KB */
  data_url?: string;
  /** method type */
  typed_name?: string;
}

// pd_dashboard (staff)
export type DashboardRequest = Record<string, never>;
export interface DashboardResponse extends Ok {
  stats: DashboardStats;
  stages: Record<Stage, number>;
  projects: ProjectSummary[];
  pending_approvals: DocSummary[];
  due_invoices: InvoiceSummary[];
  /** newest 20 */
  activity: Activity[];
}

// pd_clients_list (staff)
export interface ClientsListRequest {
  q?: string;
}
export interface ClientsListResponse extends Ok {
  clients: ClientListItem[];
}

// pd_client_save (admin)
export interface ClientSaveRequest {
  id?: number;
  type: ClientType;
  name: string;
  pic_name?: string | null;
  pic_title?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  npwp?: string | null;
  /** must be a role customer account; null unlinks */
  user_id?: number | null;
  notes?: string | null;
}
export interface ClientSaveResponse extends Ok {
  id: number;
}

// pd_client_delete (admin) — 409 when projects reference it
export interface ClientDeleteRequest {
  id: number;
}
export type ClientDeleteResponse = Ok;

// pd_customers_list (admin)
export interface CustomersListRequest {
  q?: string;
}
export interface CustomersListResponse extends Ok {
  customers: CustomerOption[];
}

// pd_projects_list (staff)
export interface ProjectsListRequest {
  stage?: Stage;
  q?: string;
}
export interface ProjectsListResponse extends Ok {
  projects: ProjectSummary[];
}

// pd_project_get (staff)
export interface ProjectGetRequest {
  id: number;
}
export interface ProjectGetResponse extends Ok {
  project: ProjectDetail;
}

// pd_project_save (admin) — assigns `code` when missing
export interface ProjectSaveRequest {
  /** existing project_client.id */
  id: number;
  client_id: number | null;
  scope_summary: string | null;
  use_mou: boolean;
  has_maintenance: boolean;
  maintenance_fee: number | null;
  maintenance_period: MaintenancePeriod | null;
  maintenance_start: string | null;
  maintenance_end: string | null;
  payment_terms: PaymentTerm[];
  /** contract value; omitted = unchanged */
  price?: number | null;
  /** null clears the override; omitted = unchanged */
  stage_override?: Stage | null;
}
export type ProjectSaveResponse = Ok;

// pd_milestone_save (staff)
export interface MilestoneSaveRequest {
  project_id: number;
  id?: number;
  title: string;
  description?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  weight: number;
  progress: number;
  status: MilestoneStatus;
  sort_order?: number;
}
export interface MilestoneSaveResponse extends Ok {
  id: number;
}

// pd_milestone_delete (admin)
export interface MilestoneDeleteRequest {
  id: number;
}
export type MilestoneDeleteResponse = Ok;

// pd_document_create (staff*; Developer: brd, timeline, uat) — 409 DUPLICATE for a second non-invoice/receipt doc
export interface DocumentCreateRequest {
  project_id: number;
  doc_type: DocType;
  /** from the engine's defaultContent() */
  content: DocContent;
  title: string;
  /** default today (Asia/Jakarta) */
  doc_date?: string;
}
export interface DocumentCreateResponse extends Ok {
  id: number;
  number: string;
}

// pd_document_get (staff)
export interface DocumentGetRequest {
  id: number;
}
export interface DocumentGetResponse extends Ok {
  document: DocDetail;
}

// pd_document_save (staff*) — 409 LOCKED unless draft
export interface DocumentSaveRequest {
  id: number;
  content: DocContent;
  title?: string;
  doc_date?: string;
  change_note?: string;
}
export interface DocumentSaveResponse extends Ok {
  version: number;
}

// pd_document_restore (staff*, draft only)
export interface DocumentRestoreRequest {
  id: number;
  version: number;
}
export interface DocumentRestoreResponse extends Ok {
  version: number;
}

// pd_document_submit (staff*) — approval client → menunggu_persetujuan; invoice → disetujui ("Terbit")
export interface DocumentSubmitRequest {
  id: number;
}
export type DocumentSubmitResponse = DocumentStateResponse;

// pd_document_withdraw (staff*) — menunggu_persetujuan → draft
export interface DocumentWithdrawRequest {
  id: number;
}
export type DocumentWithdrawResponse = DocumentStateResponse;

// pd_document_change (admin) — locked → new draft version; 409 for invoices with payments
export interface DocumentChangeRequest {
  id: number;
  /** ≥ 10 characters, ≤ 500 */
  reason: string;
}
export type DocumentChangeResponse = DocumentStateResponse;

// pd_document_sign (admin) — signs as pihak_pertama; may complete the document
export interface DocumentSignRequest {
  id: number;
  signature: SignatureInput;
  signer_name: string;
  signer_title: string;
}
export type DocumentSignResponse = DocumentStateResponse;

// pd_document_complete (admin) — brd/proposal/timeline from disetujui → selesai
export interface DocumentCompleteRequest {
  id: number;
}
export type DocumentCompleteResponse = DocumentStateResponse;

// pd_document_delete (admin) — draft that was never submitted
export interface DocumentDeleteRequest {
  id: number;
}
export type DocumentDeleteResponse = Ok;

// pd_invoice_create (admin) — server recomputes every total
export interface InvoiceCreateRequest {
  project_id: number;
  /** PaymentTerm.key; omit/null for a manual invoice (then `kind` is required) */
  term_key?: string | null;
  kind?: InvoiceKind;
  items: InvoiceItem[];
  discount: number;
  ppn_enabled: boolean;
  pph23_enabled: boolean;
  issue_date: string;
  due_date: string;
  notes?: string | null;
  content: DocContent;
}
export interface InvoiceCreateResponse extends Ok {
  /** pd_invoices.id */
  id: number;
  document_id: number;
  number: string;
}

// pd_invoice_update (admin, draft only)
export interface InvoiceUpdateRequest extends Omit<InvoiceCreateRequest, 'project_id'> {
  /** pd_invoices.id */
  id: number;
}
export interface InvoiceUpdateResponse extends Ok {
  version: number;
}

// pd_invoice_cancel (admin) — no payments only
export interface InvoiceCancelRequest {
  /** pd_invoices.id */
  id: number;
  reason: string;
}
export type InvoiceCancelResponse = Ok;

// pd_payment_record (admin) — payment + receipt document (selesai) atomically
export interface PaymentRecordRequest {
  invoice_id: number;
  /** > 0 and ≤ remaining */
  amount: number;
  paid_at: string;
  method: PaymentMethod;
  reference?: string | null;
  /** data URL jpg/png/pdf ≤ 5 MB */
  proof?: string | null;
  note?: string | null;
  receipt_content: DocContent;
}
export interface PaymentRecordResponse extends Ok {
  /** pd_payments.id */
  id: number;
  receipt_document_id: number;
  receipt_number: string;
  payment_status: PaymentStatus;
}

// pd_payment_delete (admin) — reverses amounts; the receipt stays with review_note "Dibatalkan"
export interface PaymentDeleteRequest {
  id: number;
}
export type PaymentDeleteResponse = Ok;

// pd_settings_get (staff)
export type SettingsGetRequest = Record<string, never>;
export type SettingsGetResponse = Ok & PdSettings;

// pd_settings_save (admin) — any of the objects, validated per field
export type SettingsSaveRequest = Partial<PdSettings>;
export type SettingsSaveResponse = Ok;

// pd_my_projects (customer)
export type MyProjectsRequest = Record<string, never>;
export interface MyProjectsResponse extends Ok {
  projects: ProjectSummary[];
}

// pd_my_project (customer)
export interface MyProjectRequest {
  id: number;
}
export interface MyProjectResponse extends Ok {
  project: ProjectDetail;
}

// pd_my_document (customer) — non-draft, own project
export interface MyDocumentRequest {
  id: number;
}
export interface MyDocumentResponse extends Ok {
  document: DocDetail;
}

// pd_my_document_decide (customer) — current version in menunggu_persetujuan
export interface MyDocumentDecideRequest {
  id: number;
  decision: ApprovalDecision;
  /** required when rejected */
  note?: string;
  /** required when approving a type signed by both parties */
  signature?: SignatureInput;
  signer_name?: string;
  signer_title?: string;
}
export type MyDocumentDecideResponse = DocumentStateResponse;

// pd_notifications_list (any role) — also creates due-soon (H-3) and overdue notices lazily
export interface NotificationsListRequest {
  unread_only?: boolean;
}
export interface NotificationsListResponse extends Ok {
  notifications: PdNotification[];
  unread: number;
}

// pd_notifications_read (any role)
export interface NotificationsReadRequest {
  id?: number;
  all?: boolean;
}
export type NotificationsReadResponse = Ok;

// pd_file (any role) — binary; access checked (staff: any, customer: own project only)
export interface FileRequest {
  /** `sig:<id>` or `proof:<id>` (a `pdfile:` prefix is stripped by downloadPdFile) */
  ref: string;
}

// ════════════════════════════════════════════════════════════════════════════
// Access policy (spec §5): the same lists live in backend/api.php and backend/security.js
// ════════════════════════════════════════════════════════════════════════════

/** staff = admin or Developer (default list), admin = ADMIN_ACTIONS, customer = CUSTOMER_ACTIONS, any = ANY_ROLE_ACTIONS */
export type PdAccess = 'staff' | 'admin' | 'customer' | 'any';

export const PD_ACTIONS = {
  pd_dashboard: 'staff',
  pd_clients_list: 'staff',
  pd_client_save: 'admin',
  pd_client_delete: 'admin',
  pd_customers_list: 'admin',
  pd_projects_list: 'staff',
  pd_project_get: 'staff',
  pd_project_save: 'admin',
  pd_milestone_save: 'staff',
  pd_milestone_delete: 'admin',
  pd_document_create: 'staff',
  pd_document_get: 'staff',
  pd_document_save: 'staff',
  pd_document_restore: 'staff',
  pd_document_submit: 'staff',
  pd_document_withdraw: 'staff',
  pd_document_change: 'admin',
  pd_document_sign: 'admin',
  pd_document_complete: 'admin',
  pd_document_delete: 'admin',
  pd_invoice_create: 'admin',
  pd_invoice_update: 'admin',
  pd_invoice_cancel: 'admin',
  pd_payment_record: 'admin',
  pd_payment_delete: 'admin',
  pd_settings_get: 'staff',
  pd_settings_save: 'admin',
  pd_my_projects: 'customer',
  pd_my_project: 'customer',
  pd_my_document: 'customer',
  pd_my_document_decide: 'customer',
  pd_notifications_list: 'any',
  pd_notifications_read: 'any',
  pd_file: 'any',
} as const satisfies Record<string, PdAccess>;

export type PdAction = keyof typeof PD_ACTIONS;

/** Document types a Developer (role user) may create/save/submit/withdraw; everything else is admin-only. */
export const DEVELOPER_DOC_TYPES: readonly DocType[] = ['brd', 'timeline', 'uat'];
