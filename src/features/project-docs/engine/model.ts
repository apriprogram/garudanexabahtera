// Block model of a rendered document (spec §6). buildModel() produces it from DocContent + MergeData; the same model
// drives the React preview, the PDF (pdfmake) and the DOCX (docx) export, so the three look alike.
import type { CompanySettings, DocType, Party } from '../types';

/** A piece of paragraph text; `**bold**` in a section body becomes a bold run. */
export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type BlockAlign = 'left' | 'center' | 'right' | 'justify';

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string; align?: BlockAlign }
  | { type: 'paragraph'; runs: TextRun[]; align?: BlockAlign }
  | { type: 'list'; ordered: boolean; items: TextRun[][] }
  | { type: 'table'; columns: string[]; rows: string[][]; /** relative column widths */ widths?: number[] }
  | { type: 'keyValue'; rows: { label: string; value: string }[] }
  | { type: 'spacer'; /** points */ size?: number }
  | { type: 'pageBreak' }
  /** e-Meterai placeholder box (PKS/BAST/SLA when the contract value ≥ Rp5.000.000) */
  | { type: 'meteraiBox' };

/** One signature column ("PIHAK PERTAMA" / "PIHAK KEDUA"). */
export interface SignatureSlot {
  party: Party;
  /** e.g. "PIHAK PERTAMA" */
  label: string;
  /** company name (pihak pertama) or client name (pihak kedua) */
  organization: string;
  signer_name: string;
  signer_title: string;
  /** timestamp of the signature of the current version, null while unsigned */
  signed_at: string | null;
  /** pd_file reference `pdfile:sig:<id>`, null while unsigned */
  image_ref: string | null;
  /** image the renderer draws (object URL / data URL), filled by the caller after downloadPdFile(image_ref) */
  image_src?: string;
}

export interface DocModel {
  meta: { number: string; title: string; type: DocType; date: string };
  /** letterhead on every page: wings logo + company name + address/contact line */
  kop: { company: CompanySettings };
  blocks: Block[];
  signatures: SignatureSlot[];
  /** left footer text (the document number); the right side is "Halaman x dari y" */
  footer: { text: string };
  /** merge fields that could not be resolved (rendered as "[…]"), for the editor warnings */
  missing: string[];
}
