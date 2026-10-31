// Aksi API menu Generate (backend/modules/admin_generate.php, semuanya ADMIN_ACTIONS dan POST).
import { apiPost } from '../../../lib/api';
import type { DocKind, Invoice, InvoiceSummary, Proposal, ProposalSummary, VoiceData } from './types';

export const listInvoices = (q = '') => apiPost<{ invoices: InvoiceSummary[]; next_number: string }>('gen_invoices_list', { q });
export const getInvoice = (id: number) => apiPost<{ invoice: Invoice }>('gen_invoice_get', { id });
export const saveInvoice = (body: Record<string, unknown>) => apiPost<{ invoice: Invoice }>('gen_invoice_save', body);
export const deleteInvoice = (id: number) => apiPost<Record<string, never>>('gen_invoice_delete', { id });

export const listProposals = (q = '') => apiPost<{ proposals: ProposalSummary[]; next_number: string }>('gen_proposals_list', { q });
export const getProposal = (id: number) => apiPost<{ proposal: Proposal }>('gen_proposal_get', { id });
export const saveProposal = (body: Record<string, unknown>) => apiPost<{ proposal: Proposal }>('gen_proposal_save', body);
export const deleteProposal = (id: number) => apiPost<Record<string, never>>('gen_proposal_delete', { id });

/** Rapikan transkrip suara lewat Nexa AI → isian form; 503/502 = pakai parser lokal. */
export const voiceParse = (kind: DocKind, transcript: string) =>
  apiPost<{ data: VoiceData; provider: string }>('gen_voice_parse', { kind, transcript });
