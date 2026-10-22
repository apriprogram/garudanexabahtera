// Which editor actions a staff member sees for a document (spec §1.1 status rules, §5 access + Developer limits).
// The backend enforces the same rules; the UI only hides what would be refused.
import { DOC_TYPES } from '../../../../features/project-docs/engine';
import type { DocDetail, DocType } from '../../../../features/project-docs/types';

/** brd, proposal and timeline are marked selesai by hand after the client approved them. */
const COMPLETABLE: readonly DocType[] = ['brd', 'proposal', 'timeline'];

export interface EditorPermissions {
  /** content, title and date can be edited and saved */
  editable: boolean;
  /** Ajukan persetujuan (or Terbitkan for invoices) */
  canSubmit: boolean;
  /** Tarik kembali: menunggu_persetujuan → draft */
  canWithdraw: boolean;
  /** Ajukan perubahan: locked → new draft version (admin, reason required) */
  canChange: boolean;
  /** Tandatangani as Pihak Pertama */
  canSign: boolean;
  /** Tandai selesai (brd/proposal/timeline after approval) */
  canComplete: boolean;
  /** draft that was never submitted */
  canDelete: boolean;
  /** pd_invoice_update (draft invoice) */
  canEditInvoice: boolean;
  canRecordPayment: boolean;
  /** pd_invoice_cancel: invoice without payments that is not cancelled yet */
  canCancelInvoice: boolean;
  canRestore: boolean;
}

export function editorPermissions(doc: DocDetail, viewer: { isAdmin: boolean; canEditType: (type: DocType) => boolean }): EditorPermissions {
  const info = DOC_TYPES[doc.doc_type];
  const isInvoice = doc.doc_type === 'invoice';
  const isReceipt = doc.doc_type === 'receipt';
  const cancelled = isInvoice && doc.invoice?.payment_status === 'dibatalkan';
  const draft = doc.status === 'draft';
  const canEdit = viewer.canEditType(doc.doc_type) && !isReceipt && !cancelled;
  const hasPayments = (doc.payments?.length ?? 0) > 0;
  const paymentStatus = doc.invoice?.payment_status;
  return {
    editable: draft && canEdit,
    canSubmit: draft && canEdit,
    canWithdraw: doc.status === 'menunggu_persetujuan' && canEdit,
    canChange: viewer.isAdmin && !draft && !isReceipt && !cancelled && !(isInvoice && hasPayments),
    canSign:
      viewer.isAdmin &&
      info.parties.includes('pihak_pertama') &&
      (doc.status === 'menunggu_persetujuan' || doc.status === 'disetujui') &&
      !doc.signed_parties.includes('pihak_pertama'),
    canComplete: viewer.isAdmin && doc.status === 'disetujui' && COMPLETABLE.includes(doc.doc_type),
    canDelete: viewer.isAdmin && draft && !doc.submitted_at && !isReceipt,
    canEditInvoice: viewer.isAdmin && isInvoice && draft && !cancelled && !!doc.invoice,
    canRecordPayment: viewer.isAdmin && isInvoice && !draft && !!paymentStatus && paymentStatus !== 'lunas' && paymentStatus !== 'dibatalkan',
    canCancelInvoice: viewer.isAdmin && isInvoice && !cancelled && !!doc.invoice && doc.invoice.amount_paid === 0 && !hasPayments,
    canRestore: draft && canEdit,
  };
}
