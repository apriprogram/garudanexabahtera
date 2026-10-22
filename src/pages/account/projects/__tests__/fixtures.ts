// Data tiruan halaman proyek pembeli (bentuk JSON sama dengan pd_my_projects / pd_my_project / pd_my_document).
import { fullMerge } from '../../../../features/project-docs/__tests__/engine-fixtures';
import type { DocDetail, DocSummary, InvoiceSummary, ProjectDetail, ProjectSummary } from '../../../../features/project-docs/types';

export function summary(over: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: 3,
    code: 'PRJ-2026-003',
    name: 'Website Company Profile',
    service_type: 'website',
    service_label: 'Website',
    status: 'active',
    client_id: 1,
    client_name: 'PT Klien Maju',
    value: 15_000_000,
    start_date: '2026-10-01',
    end_date: '2026-11-30',
    stage: 'kontrak',
    stage_override: null,
    progress: 40,
    missing_docs: [],
    pending_approvals: 1,
    unpaid_invoices: 1,
    next_due: { invoice_id: 5, number: '001/INV/GNB/X/2026', due_date: '2026-10-01', remaining: 7_500_000, overdue: true },
    updated_at: null,
    ...over,
  };
}

export function docSummary(over: Partial<DocSummary> = {}): DocSummary {
  return {
    id: 20,
    project_id: 3,
    project_code: 'PRJ-2026-003',
    project_name: 'Website Company Profile',
    client_name: 'PT Klien Maju',
    doc_type: 'pks',
    number: '002/PKS/GNB/X/2026',
    title: 'Perjanjian Kerja Sama Pembuatan Website',
    status: 'menunggu_persetujuan',
    version: 2,
    doc_date: '2026-10-20',
    revision_requested: false,
    review_note: null,
    signed_parties: [],
    submitted_at: '2026-10-20 10:00:00',
    approved_at: null,
    completed_at: null,
    created_at: '2026-10-19 09:00:00',
    updated_at: null,
    ...over,
  };
}

export function invoice(over: Partial<InvoiceSummary> = {}): InvoiceSummary {
  return {
    id: 5,
    document_id: 30,
    project_id: 3,
    project_code: 'PRJ-2026-003',
    project_name: 'Website Company Profile',
    client_name: 'PT Klien Maju',
    number: '001/INV/GNB/X/2026',
    doc_status: 'disetujui',
    kind: 'dp',
    term_key: 'dp',
    issue_date: '2026-09-24',
    due_date: '2026-10-01',
    total: 7_500_000,
    amount_due: 7_500_000,
    amount_paid: 0,
    remaining: 7_500_000,
    payment_status: 'belum_dibayar',
    overdue: true,
    ...over,
  };
}

export function detail(over: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    ...summary(),
    description: 'Website profil perusahaan.',
    scope_summary: 'Website 6 halaman dengan CMS.',
    use_mou: false,
    has_maintenance: false,
    maintenance_fee: null,
    maintenance_period: null,
    maintenance_start: null,
    maintenance_end: null,
    payment_terms: [],
    client_email: null,
    client_phone: null,
    assigned_user: null,
    client: null,
    milestones: [
      {
        id: 1,
        project_id: 3,
        title: 'Desain UI',
        description: null,
        start_date: '2026-10-01',
        due_date: '2026-10-15',
        weight: 1,
        progress: 100,
        status: 'selesai',
        sort_order: 1,
        completed_at: null,
      },
    ],
    documents: [
      docSummary({ id: 10, doc_type: 'brd', number: '001/BRD/GNB/X/2026', title: 'Dokumen Kebutuhan Bisnis', status: 'selesai', version: 1 }),
      docSummary(),
      // Pertahanan ganda: draft tidak boleh tampil walau terkirim
      docSummary({ id: 11, doc_type: 'timeline', number: '003/TML/GNB/X/2026', title: 'Jadwal Rahasia', status: 'draft' }),
      docSummary({ id: 30, doc_type: 'invoice', number: '001/INV/GNB/X/2026', title: 'Invoice DP', status: 'disetujui' }),
      docSummary({ id: 31, doc_type: 'receipt', number: '001/KWT/GNB/X/2026', title: 'Kuitansi DP', status: 'selesai', doc_date: '2026-10-25' }),
    ],
    invoices: [invoice(), invoice({ id: 6, document_id: 32, number: '002/INV/GNB/X/2026', doc_status: 'draft' })],
    checklist: [],
    activity: [
      {
        id: 1,
        project_id: 3,
        project_code: 'PRJ-2026-003',
        project_name: 'Website Company Profile',
        document_id: 20,
        doc_number: '002/PKS/GNB/X/2026',
        user_id: 1,
        user_name: 'Admin',
        action: 'doc_submitted',
        detail: 'PKS 002/PKS/GNB/X/2026 diajukan untuk persetujuan klien',
        created_at: '2026-10-20 10:00:00',
      },
    ],
    ...over,
  };
}

/** PKS waiting for the client (approve + sign as Pihak Kedua). */
export function pksDoc(over: Partial<DocDetail> = {}): DocDetail {
  return {
    ...docSummary(),
    content: {
      title: 'Perjanjian Kerja Sama Pembuatan {{project.service_label}}',
      sections: [{ id: 'pasal1', title: 'Pasal 1 – Definisi', body: 'Para pihak sepakat.' }],
    },
    content_hash: 'a'.repeat(64),
    created_by: 1,
    updated_by: 1,
    revisions: [],
    approvals: [],
    signatures: [],
    merge: fullMerge({ signatures: [], document: { ...fullMerge().document, number: '002/PKS/GNB/X/2026', type: 'pks', version: 2 } }),
    ...over,
  };
}
