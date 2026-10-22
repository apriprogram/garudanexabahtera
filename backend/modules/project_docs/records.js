// Loading and JSON shapes of the pd_* actions (see ../project_docs.js): project bundles (a project with its documents,
// signatures, milestones and invoices), the derived stage / progress / missing documents (spec §2), ProjectSummary,
// ProjectDetail, DocSummary, DocDetail, InvoiceSummary/Detail, Payment, Activity and MergeData (§4.3).
// Port of records.php: same keys in the same order.
import {
  PD_CLIENT_VISIBLE_ACTIVITY,
  PD_COMPLETABLE_TYPES,
  PD_DOC_TYPES,
  PD_DOC_TYPE_KEYS,
  PD_SERVICE_LABEL,
  PD_STAGES,
  dbAll,
  dbOne,
  dbRun,
  pdContentHash,
  pdContentOut,
  pdDocLabel,
  pdDurationDays,
  pdHari,
  pdIntOrNull,
  pdLog,
  pdNotFound,
  pdNowString,
  pdNum,
  pdRupiah,
  pdSettings,
  pdTanggalPanjang,
  pdTerbilang,
  pdValidTerms,
} from './core.js';
import { isPhpArray, jsonDecode, own, pdJson, phpRound, phpString, phpValues } from './php.js';

const PD_PROJECT_SELECT = `SELECT p.id, p.name, p.client_name, p.client_email, p.client_phone, p.service_type, p.status,
        p.assigned_user, p.price, p.start_date, p.end_date, p.description, p.client_id, p.code, p.stage_override, p.use_mou,
        p.has_maintenance, p.maintenance_fee, p.maintenance_period, p.maintenance_start, p.maintenance_end, p.scope_summary,
        p.payment_terms, p.updated_at,
        c.id AS c_id, c.type AS c_type, c.name AS c_name, c.pic_name AS c_pic_name, c.pic_title AS c_pic_title,
        c.email AS c_email, c.phone AS c_phone, c.address AS c_address, c.city AS c_city, c.npwp AS c_npwp,
        c.user_id AS c_user_id, c.notes AS c_notes, c.created_at AS c_created_at, c.updated_at AS c_updated_at
    FROM project_client p LEFT JOIN pd_clients c ON c.id = p.client_id`;

// PHP's <=> on [a, b] tuples of strings / ints
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byTuple = (pick) => (x, y) => {
  const [a, b] = [pick(x), pick(y)];
  for (let i = 0; i < a.length; i++) {
    const c = cmp(a[i], b[i]);
    if (c !== 0) return c;
  }
  return 0;
};

// ════════════════════════════════════════════════════════════════════════════
// Bundles
// ════════════════════════════════════════════════════════════════════════════

// Projects matching `where` (newest first) as Map id → {p, docs (Map id → row, by id), signed (Map doc id → parties of
// the current version), milestones, invoices (with the document number and status)}
async function pdBundles(ctx, where = '', params = []) {
  const rows = await dbAll(ctx, `${PD_PROJECT_SELECT}${where !== '' ? ` WHERE (${where})` : ''} ORDER BY p.id DESC`, params);
  const bundles = new Map();
  for (const row of rows) bundles.set(Number(row.id), { p: row, docs: new Map(), signed: new Map(), milestones: [], invoices: [] });
  if (!bundles.size) return bundles;
  const ids = [...bundles.keys()];
  const inList = ids.map(() => '?').join(',');
  for (const d of await dbAll(ctx, `SELECT id, project_id, doc_type, number, title, status, version, doc_date, revision_requested, review_note,
                                           submitted_at, approved_at, completed_at, created_at, updated_at
                                    FROM pd_documents WHERE project_id IN (${inList}) ORDER BY id`, ids)) {
    bundles.get(Number(d.project_id)).docs.set(Number(d.id), d);
  }
  for (const s of await dbAll(ctx, `SELECT d.project_id, s.document_id, s.party FROM pd_signatures s
                                    JOIN pd_documents d ON d.id = s.document_id AND d.version = s.version
                                    WHERE d.project_id IN (${inList}) ORDER BY s.document_id, s.party`, ids)) {
    const signed = bundles.get(Number(s.project_id)).signed;
    const docId = Number(s.document_id);
    if (!signed.has(docId)) signed.set(docId, []);
    signed.get(docId).push(s.party);
  }
  for (const m of await dbAll(ctx, `SELECT * FROM pd_milestones WHERE project_id IN (${inList}) ORDER BY sort_order, id`, ids)) {
    bundles.get(Number(m.project_id)).milestones.push(m);
  }
  for (const i of await dbAll(ctx, `SELECT i.*, d.number, d.status AS doc_status FROM pd_invoices i
                                    JOIN pd_documents d ON d.id = i.document_id WHERE i.project_id IN (${inList}) ORDER BY i.id`, ids)) {
    bundles.get(Number(i.project_id)).invoices.push(i);
  }
  return bundles;
}

export async function pdBundle(ctx, projectId) {
  return (await pdBundles(ctx, 'p.id = ?', [projectId])).get(projectId) ?? null;
}

// Bundles plus the §1.1 rule "brd/proposal/timeline become selesai when the project reaches stage selesai"
// (applied on read, because the stage also moves with the date)
export async function pdBundlesSynced(ctx, where, params, today) {
  const bundles = await pdBundles(ctx, where, params);
  for (const [projectId, b] of bundles) {
    if (pdStage(b, today) !== 'selesai') continue;
    for (const [docId, d] of b.docs) {
      if (d.status !== 'disetujui' || !PD_COMPLETABLE_TYPES.includes(d.doc_type)) continue;
      const result = await dbRun(ctx, "UPDATE pd_documents SET status = 'selesai', completed_at = NOW() WHERE id = ? AND status = 'disetujui'", [docId]);
      if (result.affectedRows !== 1) continue;
      await pdLog(ctx, projectId, docId, null, 'doc_completed', `${pdDocLabel(d)} selesai karena proyek selesai`);
      d.status = 'selesai';
      d.completed_at = pdNowString();
    }
  }
  return bundles;
}

// Newest document of a type (one per type, except invoice and receipt), or null
function pdLatestDoc(b, type) {
  let found = null;
  for (const d of b.docs.values()) {
    if (d.doc_type === type) found = d;
  }
  return found;
}

export const pdBundleInvoice = (b, field, value) => b.invoices.find((i) => Number(i[field]) === value) ?? null;

// ════════════════════════════════════════════════════════════════════════════
// Derived values (spec §2)
// ════════════════════════════════════════════════════════════════════════════

function pdStageIndex(stage) {
  const index = PD_STAGES.indexOf(stage);
  return index === -1 ? 0 : index;
}

// The stage from the documents, milestones and invoices (rules 1–9), without the admin override
function pdDerivedStage(b, today) {
  const { p } = b;
  const status = (type) => pdLatestDoc(b, type)?.status ?? null;
  const approved = (s) => s === 'disetujui' || s === 'selesai';
  if (!approved(status('brd'))) return 'perencanaan';
  if (!approved(status('proposal')) || (Number(p.use_mou) === 1 && !approved(status('mou')))) return 'penawaran';
  if (status('pks') !== 'selesai') return 'kontrak';
  const allMilestonesDone = b.milestones.every((m) => m.status === 'selesai');
  const uat = status('uat');
  if (!allMilestonesDone && (uat === null || uat === 'draft')) return 'pengerjaan';
  if (uat !== 'selesai') return 'uji';
  if (status('bast') !== 'selesai') return 'serah_terima';
  if (b.invoices.some((i) => i.payment_status !== 'lunas' && i.payment_status !== 'dibatalkan')) return 'pelunasan';
  if (pdUnpaidTerm(b)) return 'pelunasan';
  // A maintenance contract keeps the project in maintenance until its SLA is signed and while its period runs
  const end = p.maintenance_end;
  if (Number(p.has_maintenance) === 1 && (status('sla') !== 'selesai' || (end !== null && end > today))) return 'maintenance';
  return 'selesai';
}

// A payment term of the project (value > 0, term > 0 %) that has no paid invoice yet: the contract is not settled
function pdUnpaidTerm(b) {
  const { p } = b;
  if (pdNum(p.price) <= 0 || (p.payment_terms ?? null) === null) return false;
  const terms = pdValidTerms(jsonDecode(p.payment_terms), 'payment_terms', {}) ?? [];
  return terms.some((term) => term.percent > 0 && !b.invoices.some((i) => i.term_key === term.key && i.payment_status === 'lunas'));
}

// Effective stage: the admin override wins
export function pdStage(b, today) {
  const override = b.p.stage_override;
  return PD_STAGES.includes(override) ? override : pdDerivedStage(b, today);
}

// Σ(weight × progress) / Σ weight, rounded; 0 without milestones
export function pdProgress(milestones) {
  let weights = 0;
  let sum = 0;
  for (const m of milestones) {
    const weight = Math.max(0, Math.trunc(Number(m.weight)));
    weights += weight;
    sum += weight * Math.trunc(Number(m.progress));
  }
  return weights > 0 ? phpRound(sum / weights) : 0;
}

function pdTypeRequired(p, type) {
  const { required } = PD_DOC_TYPES[type];
  if (required === 'mou') return Number(p.use_mou) === 1;
  if (required === 'sla') return Number(p.has_maintenance) === 1;
  return required === true;
}

// Missing or still draft; invoices count when issued and not cancelled
function pdTypeMissing(b, type) {
  if (type === 'invoice') return !b.invoices.some((i) => i.doc_status !== 'draft' && i.payment_status !== 'dibatalkan');
  const d = pdLatestDoc(b, type);
  return !d || d.status === 'draft';
}

// Required types whose stage is reached and which are missing or still draft, in DOC_TYPES order
export function pdMissingDocs(b, stage) {
  const current = pdStageIndex(stage);
  return PD_DOC_TYPE_KEYS.filter((type) => pdTypeRequired(b.p, type) && pdStageIndex(PD_DOC_TYPES[type].stage) <= current && pdTypeMissing(b, type));
}

// Issued invoice that still waits for money
export const pdInvoiceUnpaid = (i) => i.doc_status !== 'draft' && (i.payment_status === 'belum_dibayar' || i.payment_status === 'sebagian');

// Jatuh tempo: issued (a draft is not billed yet), due_date < today and not lunas/dibatalkan (§4.2)
const pdInvoiceOverdue = (i, today) => pdInvoiceUnpaid(i) && i.due_date < today;

export function pdPaymentStatus(paid, due) {
  if (paid >= due) return 'lunas';
  return paid > 0 ? 'sebagian' : 'belum_dibayar';
}

// project_client.service_type as one of the ServiceType values (an empty or unknown value counts as `other`)
function pdServiceType(p) {
  const type = String(p.service_type ?? '');
  return Object.hasOwn(PD_SERVICE_LABEL, type) ? type : 'other';
}

// The project's own payment terms, or the default terms from the settings
export async function pdProjectTerms(ctx, p) {
  const terms = p.payment_terms !== null ? pdValidTerms(jsonDecode(p.payment_terms), 'payment_terms', {}) : null;
  return terms ?? (await pdSettings(ctx)).payment_terms;
}

// ════════════════════════════════════════════════════════════════════════════
// Records
// ════════════════════════════════════════════════════════════════════════════

// pd_clients.name, falling back to project_client.client_name
function pdClientName(p) {
  if (p.c_name !== null) return p.c_name;
  return (p.client_name ?? '') !== '' ? p.client_name : null;
}

// Client from a pd_clients row; customers do not see the internal notes
export function pdClientOut(c, customer = false) {
  return {
    id: Number(c.id), type: c.type, name: c.name, pic_name: c.pic_name, pic_title: c.pic_title,
    email: c.email, phone: c.phone, address: c.address, city: c.city, npwp: c.npwp,
    user_id: pdIntOrNull(c.user_id), notes: customer ? null : c.notes,
    created_at: c.created_at, updated_at: c.updated_at,
  };
}

const CLIENT_FIELDS = ['id', 'type', 'name', 'pic_name', 'pic_title', 'email', 'phone', 'address', 'city', 'npwp', 'user_id', 'notes', 'created_at', 'updated_at'];

// The linked client of a project row (c_* columns), or null
function pdProjectClient(p) {
  if (p.c_id === null) return null;
  return Object.fromEntries(CLIENT_FIELDS.map((f) => [f, p[`c_${f}`]]));
}

function pdMilestoneOut(m) {
  return {
    id: Number(m.id), project_id: Number(m.project_id), title: m.title, description: m.description,
    start_date: m.start_date, due_date: m.due_date, weight: Number(m.weight), progress: Number(m.progress),
    status: m.status, sort_order: Number(m.sort_order), completed_at: m.completed_at,
  };
}

export function pdDocSummary(d, p, signedParties) {
  return {
    id: Number(d.id), project_id: Number(d.project_id), project_code: p.code, project_name: p.name,
    client_name: pdClientName(p), doc_type: d.doc_type, number: d.number, title: d.title,
    status: d.status, version: Number(d.version), doc_date: d.doc_date,
    revision_requested: Number(d.revision_requested) === 1, review_note: d.review_note,
    signed_parties: signedParties, submitted_at: d.submitted_at, approved_at: d.approved_at,
    completed_at: d.completed_at, created_at: d.created_at, updated_at: d.updated_at,
  };
}

// i: pd_invoices row with `number` and `doc_status` of its document
export function pdInvoiceSummary(i, p, today) {
  const due = pdNum(i.amount_due);
  const paid = pdNum(i.amount_paid);
  return {
    id: Number(i.id), document_id: Number(i.document_id), project_id: Number(i.project_id),
    project_code: p.code, project_name: p.name, client_name: pdClientName(p),
    number: i.number, doc_status: i.doc_status, kind: i.kind, term_key: i.term_key,
    issue_date: i.issue_date, due_date: i.due_date, total: pdNum(i.total),
    amount_due: due, amount_paid: paid, remaining: Math.max(0, due - paid),
    payment_status: i.payment_status, overdue: pdInvoiceOverdue(i, today),
  };
}

// InvoiceTotals from a pd_invoices row (base is not stored: subtotal − discount, ≥ 0)
function pdInvoiceTotals(i) {
  const subtotal = pdNum(i.subtotal);
  const discount = pdNum(i.discount);
  return {
    subtotal, discount, base: Math.max(0, subtotal - discount), dpp: pdNum(i.dpp),
    ppn_rate: pdNum(i.ppn_rate), ppn_amount: pdNum(i.ppn_amount), total: pdNum(i.total),
    pph23_rate: pdNum(i.pph23_rate), pph23_amount: pdNum(i.pph23_amount), amount_due: pdNum(i.amount_due),
  };
}

function pdInvoiceItems(json) {
  const items = jsonDecode(json ?? '');
  return phpValues(items).filter(isPhpArray).map((item) => ({
    description: phpString(own(item, 'description')), qty: pdNum(own(item, 'qty')), unit_price: pdNum(own(item, 'unit_price')),
  }));
}

function pdInvoiceDetail(i, p, today) {
  return {
    ...pdInvoiceSummary(i, p, today),
    ...pdInvoiceTotals(i),
    items: pdInvoiceItems(i.items),
    ppn_enabled: pdNum(i.ppn_rate) > 0,
    pph23_enabled: pdNum(i.pph23_rate) > 0,
    notes: i.notes,
  };
}

export function pdProjectSummary(b, today) {
  const { p } = b;
  const stage = pdStage(b, today);
  let pending = 0;
  for (const d of b.docs.values()) {
    if (d.status === 'menunggu_persetujuan') pending++;
  }
  const unpaid = b.invoices.filter(pdInvoiceUnpaid).sort(byTuple((i) => [i.due_date, Number(i.id)]));
  let next = null;
  if (unpaid.length) {
    const first = unpaid[0];
    next = {
      invoice_id: Number(first.id), number: first.number, due_date: first.due_date,
      remaining: Math.max(0, pdNum(first.amount_due) - pdNum(first.amount_paid)),
      overdue: pdInvoiceOverdue(first, today),
    };
  }
  const serviceType = pdServiceType(p);
  return {
    id: Number(p.id), code: p.code, name: p.name, service_type: serviceType,
    service_label: PD_SERVICE_LABEL[serviceType], status: p.status || 'active',
    client_id: pdIntOrNull(p.client_id), client_name: pdClientName(p), value: pdNum(p.price),
    start_date: p.start_date, end_date: p.end_date, stage,
    stage_override: PD_STAGES.includes(p.stage_override) ? p.stage_override : null,
    progress: pdProgress(b.milestones), missing_docs: pdMissingDocs(b, stage), pending_approvals: pending,
    unpaid_invoices: unpaid.length, next_due: next, updated_at: p.updated_at,
  };
}

// ProjectDetail; a customer gets no drafts (documents, checklist, invoices) and only client-visible activity
export async function pdProjectDetail(ctx, b, today, customer) {
  const { p } = b;
  const summary = pdProjectSummary(b, today);
  const order = (type) => PD_DOC_TYPE_KEYS.indexOf(type);
  const docs = [...b.docs.values()]
    .filter((d) => !customer || d.status !== 'draft')
    .sort(byTuple((d) => [order(d.doc_type), Number(d.id)]));
  const docOut = (d) => pdDocSummary(d, p, b.signed.get(Number(d.id)) ?? []);
  const checklist = PD_DOC_TYPE_KEYS.map((type) => {
    const ofType = docs.filter((d) => d.doc_type === type).sort(byTuple((d) => [Number(d.id)]));
    return {
      doc_type: type, stage: PD_DOC_TYPES[type].stage, required: pdTypeRequired(p, type),
      document: ofType.length ? docOut(ofType[ofType.length - 1]) : null, count: ofType.length,
      missing: summary.missing_docs.includes(type),
    };
  });
  const invoices = b.invoices.filter((i) => !customer || i.doc_status !== 'draft').map((i) => pdInvoiceSummary(i, p, today));
  let activityWhere = 'a.project_id = ?';
  let activityParams = [Number(p.id)];
  if (customer) {
    activityWhere += ` AND a.action IN (${PD_CLIENT_VISIBLE_ACTIVITY.map(() => '?').join(',')})`;
    activityParams = [...activityParams, ...PD_CLIENT_VISIBLE_ACTIVITY];
  }
  const client = pdProjectClient(p);
  return {
    ...summary,
    description: p.description, scope_summary: p.scope_summary,
    use_mou: Number(p.use_mou) === 1, has_maintenance: Number(p.has_maintenance) === 1,
    maintenance_fee: p.maintenance_fee === null ? null : pdNum(p.maintenance_fee),
    maintenance_period: p.maintenance_period || null, maintenance_start: p.maintenance_start,
    maintenance_end: p.maintenance_end, payment_terms: await pdProjectTerms(ctx, p),
    client_email: p.client_email, client_phone: p.client_phone, assigned_user: p.assigned_user,
    client: client ? pdClientOut(client, customer) : null,
    milestones: b.milestones.map(pdMilestoneOut),
    documents: docs.map(docOut),
    invoices,
    checklist,
    activity: await pdActivity(ctx, activityWhere, activityParams, 100),
  };
}

// Activity rows, newest first
export async function pdActivity(ctx, where, params, limit) {
  const rows = await dbAll(ctx, `SELECT a.id, a.project_id, p.code AS project_code, p.name AS project_name, a.document_id, d.number AS doc_number,
                                        a.user_id, u.name AS user_name, a.action, a.detail, a.created_at
                                 FROM pd_activity a JOIN project_client p ON p.id = a.project_id
                                 LEFT JOIN pd_documents d ON d.id = a.document_id LEFT JOIN users u ON u.id = a.user_id`
    + (where !== '' ? ` WHERE ${where}` : '') + ` ORDER BY a.id DESC LIMIT ${Math.trunc(limit)}`, params);
  return rows.map((a) => ({
    id: Number(a.id), project_id: Number(a.project_id), project_code: a.project_code,
    project_name: a.project_name, document_id: pdIntOrNull(a.document_id), doc_number: a.doc_number,
    user_id: pdIntOrNull(a.user_id), user_name: a.user_name, action: a.action,
    detail: a.detail, created_at: a.created_at,
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// Documents: DocDetail and MergeData
// ════════════════════════════════════════════════════════════════════════════

export function pdDocRow(ctx, id, forUpdate = false) {
  return dbOne(ctx, `SELECT * FROM pd_documents WHERE id = ?${forUpdate ? ' FOR UPDATE' : ''}`, [id]);
}

export function pdSignatureRows(ctx, docId, version) {
  return dbAll(ctx, 'SELECT * FROM pd_signatures WHERE document_id = ? AND version = ? ORDER BY party', [docId, version]);
}

function pdSignatureOut(s, customer) {
  return {
    id: Number(s.id), version: Number(s.version), party: s.party, user_id: Number(s.user_id),
    signer_name: s.signer_name, signer_title: s.signer_title, method: s.method,
    content_hash: s.content_hash, image_url: `pdfile:sig:${s.id}`,
    ip: customer ? null : s.ip, user_agent: customer ? null : s.user_agent, signed_at: s.signed_at,
  };
}

// Customers do not see the payment note: the admin form asks for an internal note
function pdPaymentOut(pay, customer) {
  return {
    id: Number(pay.id), invoice_id: Number(pay.invoice_id), amount: pdNum(pay.amount), paid_at: pay.paid_at,
    method: pay.method, reference: pay.reference, proof_url: pay.proof_file ? `pdfile:proof:${pay.id}` : null,
    note: customer ? null : pay.note, receipt_document_id: pdIntOrNull(pay.receipt_document_id), receipt_number: pay.receipt_number,
    recorded_by: Number(pay.recorded_by), recorded_by_name: pay.recorded_by_name, created_at: pay.created_at,
  };
}

// Payments of an invoice, oldest first
async function pdPaymentsOf(ctx, invoiceId, customer) {
  return (await dbAll(ctx, `SELECT pay.*, r.number AS receipt_number, u.name AS recorded_by_name
        FROM pd_payments pay LEFT JOIN pd_documents r ON r.id = pay.receipt_document_id LEFT JOIN users u ON u.id = pay.recorded_by
        WHERE pay.invoice_id = ? ORDER BY pay.paid_at, pay.id`, [invoiceId])).map((pay) => pdPaymentOut(pay, customer));
}

// The invoice a document shows: its own (invoice) or the paid one (receipt), with number and doc_status
async function pdDocInvoice(ctx, b, d) {
  if (d.doc_type === 'invoice') return pdBundleInvoice(b, 'document_id', Number(d.id));
  if (d.doc_type !== 'receipt') return null;
  const pay = await dbOne(ctx, 'SELECT invoice_id FROM pd_payments WHERE receipt_document_id = ? LIMIT 1', [Number(d.id)]);
  return pay ? pdBundleInvoice(b, 'id', Number(pay.invoice_id)) : null;
}

const text = (v) => (v === null || v === undefined ? '' : phpString(v));

// MergeData from the current project, client, company profile and invoice/payment (without `signatures`)
async function pdMergeLive(ctx, b, d) {
  const { p } = b;
  const value = pdNum(p.price);
  const client = pdProjectClient(p);
  const serviceType = pdServiceType(p);
  const merge = {
    company: (await pdSettings(ctx)).company,
    client: client ? {
      type: client.type, name: client.name, pic_name: text(client.pic_name),
      pic_title: text(client.pic_title), email: text(client.email), phone: text(client.phone),
      address: text(client.address), city: text(client.city), npwp: text(client.npwp),
    } : {
      type: 'perusahaan', name: text(p.client_name), pic_name: '', pic_title: '',
      email: text(p.client_email), phone: text(p.client_phone), address: '', city: '', npwp: '',
    },
    project: {
      id: Number(p.id), code: text(p.code), name: text(p.name), service_type: serviceType,
      service_label: PD_SERVICE_LABEL[serviceType], description: text(p.description),
      scope_summary: text(p.scope_summary), value, value_rupiah: pdRupiah(value),
      value_terbilang: pdTerbilang(value), start_date: text(p.start_date), end_date: text(p.end_date),
      duration_days: pdDurationDays(p.start_date, p.end_date), payment_terms: await pdProjectTerms(ctx, p),
      has_maintenance: Number(p.has_maintenance) === 1, maintenance_fee: pdNum(p.maintenance_fee),
      maintenance_period: text(p.maintenance_period), maintenance_start: text(p.maintenance_start),
      maintenance_end: text(p.maintenance_end),
    },
    milestones: b.milestones.map((m) => ({
      title: m.title, description: text(m.description), start_date: text(m.start_date),
      due_date: text(m.due_date), weight: Number(m.weight), progress: Number(m.progress), status: m.status,
    })),
    document: {
      number: d.number, type: d.doc_type, title: d.title, date: d.doc_date,
      date_long: pdTanggalPanjang(d.doc_date), day: pdHari(d.doc_date), version: Number(d.version),
      status: d.status,
    },
  };
  const invoice = await pdDocInvoice(ctx, b, d);
  if (invoice) {
    merge.invoice = {
      ...pdInvoiceTotals(invoice),
      kind: invoice.kind, term_key: invoice.term_key, issue_date: invoice.issue_date,
      due_date: invoice.due_date, items: pdInvoiceItems(invoice.items), amount_paid: pdNum(invoice.amount_paid),
      payment_status: invoice.payment_status, notes: text(invoice.notes),
    };
  }
  if (d.doc_type === 'receipt') {
    const pay = await dbOne(ctx, 'SELECT * FROM pd_payments WHERE receipt_document_id = ? LIMIT 1', [Number(d.id)]);
    if (pay) {
      merge.payment = {
        amount: pdNum(pay.amount), amount_terbilang: pdTerbilang(pay.amount), paid_at: pay.paid_at,
        method: pay.method, reference: text(pay.reference), invoice_number: invoice ? invoice.number : '',
      };
    }
  }
  return merge;
}

// Snapshot frozen when a document leaves draft: MergeData with the new status, and the content hash of the version
export async function pdFreeze(ctx, b, d, status) {
  const snapshot = pdJson(await pdMergeLive(ctx, b, { ...d, status }));
  return [snapshot, pdContentHash(d.content, snapshot)];
}

// MergeData of a document: live while draft, the frozen snapshot otherwise. The document's own lifecycle values
// (document status/version, an invoice's amount_paid/payment_status) and the signatures are always current.
async function pdMergeFor(ctx, b, d, signatureRows) {
  let merge = d.status !== 'draft' && d.snapshot !== null ? jsonDecode(d.snapshot) : null;
  if (own(merge, 'document') !== null) {
    merge.document.status = d.status;
    merge.document.version = Number(d.version);
    const invoice = d.doc_type === 'invoice' ? pdBundleInvoice(b, 'document_id', Number(d.id)) : null;
    if (invoice && own(merge, 'invoice') !== null) {
      merge.invoice.amount_paid = pdNum(invoice.amount_paid);
      merge.invoice.payment_status = invoice.payment_status;
    }
  } else {
    merge = await pdMergeLive(ctx, b, d);
  }
  delete merge.signatures;
  merge.signatures = signatureRows.map((s) => ({
    party: s.party, signer_name: s.signer_name, signer_title: text(s.signer_title),
    signed_at: s.signed_at, image_url: `pdfile:sig:${s.id}`,
  }));
  return merge;
}

// DocDetail; customers get no revisions, no audit data (ip, user agent) and no internal payment notes
export async function pdDocumentDetail(ctx, d, today, customer) {
  const b = await pdBundle(ctx, Number(d.project_id));
  if (!b) throw pdNotFound('Proyek');
  const docId = Number(d.id);
  const signatures = await pdSignatureRows(ctx, docId, Number(d.version));
  const revisions = customer ? [] : (await dbAll(ctx, `SELECT r.version, r.change_note, r.changed_by, u.name AS changed_by_name, r.created_at
                          FROM pd_document_revisions r LEFT JOIN users u ON u.id = r.changed_by
                          WHERE r.document_id = ? ORDER BY r.version DESC`, [docId])).map((r) => ({
    version: Number(r.version), change_note: r.change_note, changed_by: pdIntOrNull(r.changed_by),
    changed_by_name: r.changed_by_name, created_at: r.created_at,
  }));
  const approvals = (await dbAll(ctx, `SELECT a.*, u.name AS user_name FROM pd_approvals a LEFT JOIN users u ON u.id = a.user_id
                          WHERE a.document_id = ? ORDER BY a.id DESC`, [docId])).map((a) => ({
    id: Number(a.id), version: Number(a.version), user_id: Number(a.user_id), user_name: text(a.user_name),
    decision: a.decision, note: a.note, ip: customer ? null : a.ip,
    user_agent: customer ? null : a.user_agent, created_at: a.created_at,
  }));
  const out = {
    ...pdDocSummary(d, b.p, b.signed.get(docId) ?? []),
    content: pdContentOut(d.content),
    content_hash: d.content_hash,
    created_by: pdIntOrNull(d.created_by),
    updated_by: pdIntOrNull(d.updated_by),
    revisions,
    approvals,
    signatures: signatures.map((s) => pdSignatureOut(s, customer)),
    merge: await pdMergeFor(ctx, b, d, signatures),
  };
  const invoice = await pdDocInvoice(ctx, b, d);
  if (invoice) out.invoice = pdInvoiceDetail(invoice, b.p, today);
  if (invoice && d.doc_type === 'invoice') out.payments = await pdPaymentsOf(ctx, Number(invoice.id), customer);
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// Customer ownership (a project belongs to the customer linked to its client record)
// ════════════════════════════════════════════════════════════════════════════

export async function pdCustomerOwnsProject(ctx, user, projectId) {
  return Boolean(await dbOne(ctx, `SELECT p.id FROM project_client p JOIN pd_clients c ON c.id = p.client_id
                                   WHERE p.id = ? AND c.user_id = ? LIMIT 1`, [projectId, Number(user.id)]));
}
