// Block model of a rendered document (spec §6). buildModel() produces it from DocContent + MergeData; the same model
// drives the React preview, the PDF (pdfmake) and the DOCX (docx) export, so the three look alike.
import type { CompanySettings, DocType, Party } from '../types';

/** A piece of text; `**bold**` / `*italic*` in a section body become bold / italic runs. `\n` = line break. */
export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type BlockAlign = 'left' | 'center' | 'right' | 'justify';

export type ListStyle = 'decimal' | 'paren' | 'alpha';

/** One table cell (runs, so `**Total**` in a cell is bold). */
export type TableCell = TextRun[];

/** One "Label : isi" row (identity blocks, invoice data, invoice totals). */
export interface KeyValueRow {
  label: string;
  value: TextRun[];
  /** bold row (e.g. "Jumlah yang harus dibayar") */
  strong?: boolean;
}

export type Block =
  /** `text` may contain `\n` ("Pasal 1\nDEFINISI") */
  | { type: 'heading'; level: 1 | 2 | 3; text: string; align?: BlockAlign }
  /** `boxed` = framed amount (Kuitansi nominal); `size` scales the text */
  | { type: 'paragraph'; runs: TextRun[]; align?: BlockAlign; boxed?: boolean; size?: 'small' | 'large' }
  /**
   * Ordered markers: decimal "1." (default), paren "(1)" (ayat), alpha "a." (huruf); `start` = number of the first
   * item (default 1); `indent` = nesting level (default 0).
   */
  | { type: 'list'; ordered: boolean; items: TextRun[][]; start?: number; style?: ListStyle; indent?: number }
  /**
   * Bordered table with a header row. `align` per column (numbers right); `widths` = relative column weights
   * (computed by the renderers when absent); `total` = the last row is a bold total row.
   */
  | { type: 'table'; columns: string[]; rows: TableCell[][]; align?: BlockAlign[]; widths?: number[]; total?: boolean }
  /** borderless "Label : isi" rows; variant `totals` = right half of the page (invoice totals) */
  | { type: 'keyValue'; rows: KeyValueRow[]; variant?: 'totals' }
  | { type: 'spacer'; /** points */ size?: number }
  | { type: 'pageBreak' }
  /**
   * e-Meterai placeholder (PKS/BAST/SLA when the contract value ≥ Rp5.000.000, Kuitansi above Rp5.000.000).
   * Renderers draw it inside the signature row; on its own only when the document has no signature slots.
   */
  | { type: 'meteraiBox' }
  /** where the signature row goes (body directive `{{#tanda_tangan}}`); at the end of the document when absent */
  | { type: 'signatures' };

/** One signature column ("PIHAK PERTAMA" / "PIHAK KEDUA" / "Penerima,"). */
export interface SignatureSlot {
  party: Party;
  /** e.g. "PIHAK PERTAMA" */
  label: string;
  /** company name (pihak pertama) or client name (pihak kedua); '' for a private person signing for themselves */
  organization: string;
  signer_name: string;
  signer_title: string;
  /** timestamp of the signature of the current version, null while unsigned */
  signed_at: string | null;
  /** pd_file reference `pdfile:sig:<id>`, null while unsigned */
  image_ref: string | null;
  /** image the renderer draws (object URL / data URL), filled by the caller after downloadPdFile(image_ref) */
  image_src?: string;
  /** line above the label, e.g. "Bandung, 21 Oktober 2026" (Kuitansi) */
  caption?: string;
  /** shown in the empty signature space of a slot that is never signed electronically (Kuitansi) */
  note?: string;
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
