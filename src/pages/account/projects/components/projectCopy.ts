// Customer wording of the project-documents data (PROJECT-DOCS-SPEC §1.1 statuses, §2 stages, §4.2 payment status):
// status labels with a tone, the stages a client sees, and labels of the client-visible activity. "Anda" tone (design.md).
import { AppWindow, Globe, Palette, Smartphone, type LucideIcon } from 'lucide-react';
import { DOC_TYPES, STAGES } from '../../../../features/project-docs/engine';
import {
  PAYMENT_STATUS_LABEL,
  type ActivityAction,
  type DocSummary,
  type DocType,
  type InvoiceSummary,
  type ServiceType,
  type Stage,
} from '../../../../features/project-docs/types';

export type Tone = 'warning' | 'brand' | 'info' | 'success' | 'danger' | 'neutral';

export interface StatusView {
  label: string;
  tone: Tone;
}

/** Types the client approves and signs as Pihak Kedua in one step (spec §1 "both parties"). */
export const needsClientSignature = (type: DocType) => DOC_TYPES[type].parties.includes('pihak_kedua');

/** Documents shown in "Dokumen proyek" (invoices and receipts have their own sections). */
export const isContractDoc = (doc: DocSummary) => doc.doc_type !== 'invoice' && doc.doc_type !== 'receipt';

/** Receipt of a payment the admin deleted, or an invoice that was cancelled (review_note "Dibatalkan…"). */
export const isCancelled = (doc: Pick<DocSummary, 'review_note'>) => /^dibatalkan/i.test(doc.review_note ?? '');

/** Signed by the client, still waiting for the company (Pihak Pertama) signature. */
export const awaitsCompanySignature = (doc: DocSummary) =>
  doc.status === 'disetujui' && DOC_TYPES[doc.doc_type].parties.includes('pihak_pertama') && !doc.signed_parties.includes('pihak_pertama');

/** Status of a document as the client sees it. */
export function docStatusView(doc: DocSummary): StatusView {
  if (doc.doc_type === 'receipt') return isCancelled(doc) ? { label: 'Dibatalkan', tone: 'neutral' } : { label: 'Diterbitkan', tone: 'success' };
  switch (doc.status) {
    case 'menunggu_persetujuan':
      return { label: 'Perlu persetujuan Anda', tone: 'warning' };
    case 'disetujui':
      if (doc.doc_type === 'invoice') return { label: 'Terbit', tone: 'brand' };
      if (awaitsCompanySignature(doc)) return { label: 'Menunggu tanda tangan kami', tone: 'info' };
      return { label: 'Disetujui', tone: 'brand' };
    case 'selesai':
      return { label: 'Selesai', tone: 'success' };
    default:
      return { label: 'Sedang direvisi', tone: 'neutral' };
  }
}

/** Payment status of an invoice; overdue wins over "Belum dibayar" / "Dibayar sebagian". */
export function invoiceStatusView(invoice: Pick<InvoiceSummary, 'payment_status' | 'overdue'>): StatusView {
  if (invoice.overdue) return { label: 'Lewat jatuh tempo', tone: 'danger' };
  const label = PAYMENT_STATUS_LABEL[invoice.payment_status] ?? invoice.payment_status;
  switch (invoice.payment_status) {
    case 'lunas':
      return { label, tone: 'success' };
    case 'sebagian':
      return { label, tone: 'brand' };
    case 'dibatalkan':
      return { label, tone: 'neutral' };
    default:
      return { label, tone: 'warning' };
  }
}

/**
 * Stages of the stepper: the maintenance stage only for projects with a maintenance contract (or when the project
 * is in it), so a client without one does not see a step that never comes.
 */
export const visibleStages = (stage: Stage, hasMaintenance: boolean) =>
  STAGES.filter((s) => s.key !== 'maintenance' || hasMaintenance || stage === 'maintenance');

export const stageLabel = (stage: Stage) => STAGES.find((s) => s.key === stage)?.label ?? stage;

/** Short document name for lists ("PKS + SOW", "BAST"). */
export const docShortLabel = (type: DocType) => DOC_TYPES[type]?.short ?? type;

/** Client-visible activity (CLIENT_VISIBLE_ACTIVITY) in customer words. */
export const ACTIVITY_LABEL: Partial<Record<ActivityAction, string>> = {
  doc_submitted: 'Dokumen dikirim untuk persetujuan',
  doc_issued: 'Invoice diterbitkan',
  doc_approved: 'Dokumen disetujui',
  doc_rejected: 'Revisi diminta',
  doc_signed: 'Dokumen ditandatangani',
  doc_completed: 'Dokumen selesai',
  invoice_cancelled: 'Invoice dibatalkan',
  payment_recorded: 'Pembayaran diterima',
};

/** Icon of a project's service type. */
export const SERVICE_ICON: Record<ServiceType, LucideIcon> = {
  website: Globe,
  mobile_app: Smartphone,
  ui_ux: Palette,
  other: AppWindow,
};

/** Message handed to the next page through router state (e.g. after a revision request the document is a draft). */
export interface ProjectFlash {
  tone: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  text: string;
}
export interface ProjectNavState {
  flash?: ProjectFlash;
}

/** Positive integer route parameter, else null. */
export const routeId = (value: string | undefined) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};
