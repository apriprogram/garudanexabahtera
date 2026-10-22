// The document set and the project stages (spec §1, §2). The backends hold the same table (codes, required flags,
// approval, parties, stage) for numbering, the checklist and the derived stage.
import type { DocType, Party, Stage } from '../types';

export interface DocTypeInfo {
  /** full name in the UI */
  label: string;
  /** short name for chips and tables */
  short: string;
  /** CODE in the document number `{SEQ}/{CODE}/{PREFIX}/{ROMAN_MONTH}/{YEAR}` */
  code: string;
  /** true = always required; 'mou' / 'sla' = required when the project flag use_mou / has_maintenance is on */
  required: boolean | 'mou' | 'sla';
  approval: 'client' | 'none';
  /** parties that must sign the current version before the document is `selesai` */
  parties: Party[];
  /** stage from which the document is expected (missing-documents rule) */
  stage: Stage;
}

const BOTH: Party[] = ['pihak_pertama', 'pihak_kedua'];

/** In checklist order. Invoice and receipt belong to stage `pelunasan` (spec table "pembayaran"). */
export const DOC_TYPES: Record<DocType, DocTypeInfo> = {
  brd: { label: 'BRD – Dokumen Kebutuhan Bisnis', short: 'BRD', code: 'BRD', required: true, approval: 'client', parties: [], stage: 'perencanaan' },
  mou: { label: 'MoU – Nota Kesepahaman', short: 'MoU', code: 'MOU', required: 'mou', approval: 'client', parties: BOTH, stage: 'penawaran' },
  proposal: { label: 'Proposal & Penawaran Harga', short: 'Proposal', code: 'PRP', required: true, approval: 'client', parties: [], stage: 'penawaran' },
  pks: { label: 'PKS + SOW – Perjanjian Kerja Sama & Ruang Lingkup', short: 'PKS + SOW', code: 'PKS', required: true, approval: 'client', parties: BOTH, stage: 'kontrak' },
  timeline: { label: 'Jadwal & Tahapan Pengerjaan', short: 'Jadwal', code: 'TML', required: true, approval: 'client', parties: [], stage: 'pengerjaan' },
  uat: { label: 'UAT – Pengujian & Persetujuan Hasil', short: 'UAT', code: 'UAT', required: true, approval: 'client', parties: BOTH, stage: 'uji' },
  bast: { label: 'BAST – Berita Acara Serah Terima', short: 'BAST', code: 'BAST', required: true, approval: 'client', parties: BOTH, stage: 'serah_terima' },
  invoice: { label: 'Invoice / Tagihan', short: 'Invoice', code: 'INV', required: true, approval: 'none', parties: [], stage: 'pelunasan' },
  receipt: { label: 'Kuitansi / Bukti Pembayaran', short: 'Kuitansi', code: 'KWT', required: false, approval: 'none', parties: [], stage: 'pelunasan' },
  sla: { label: 'SLA – Perjanjian Pemeliharaan & Dukungan', short: 'SLA', code: 'SLA', required: 'sla', approval: 'client', parties: BOTH, stage: 'maintenance' },
};

/** Stages in order (index = position in the pipeline). */
export const STAGES: { key: Stage; label: string }[] = [
  { key: 'perencanaan', label: 'Perencanaan' },
  { key: 'penawaran', label: 'Penawaran' },
  { key: 'kontrak', label: 'Kontrak' },
  { key: 'pengerjaan', label: 'Pengerjaan' },
  { key: 'uji', label: 'Pengujian (UAT)' },
  { key: 'serah_terima', label: 'Serah terima' },
  { key: 'pelunasan', label: 'Pelunasan' },
  { key: 'maintenance', label: 'Pemeliharaan' },
  { key: 'selesai', label: 'Selesai' },
];
