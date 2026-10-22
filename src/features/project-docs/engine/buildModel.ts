// DocContent + MergeData → DocModel (spec §6): title block, sections (markup of markup.ts, merge fields of merge.ts,
// directives of autoBlocks.ts), e-Meterai and signature slots. Pure: no DOM, no I/O.
//
// Section titles follow Indonesian document typography:
//   "Pasal 4 – Nilai Perjanjian"  → centered "Pasal 4" / "NILAI PERJANJIAN"
//   "LAMPIRAN …" (all capitals)    → centered part title
//   anything else                  → left-aligned section heading
// A section table whose column headers are all empty renders as borderless "Label : isi" rows.
import type { DocContent, DocTable, DocType, MergeData, Party } from '../types';
import { directiveBlocks, type DirectiveContext } from './autoBlocks';
import { DOC_TYPES } from './docTypes';
import { parseBody, runsText, toRuns } from './markup';
import { resolveWithView } from './merge';
import { mergeView } from './mergeView';
import type { Block, BlockAlign, DocModel, SignatureSlot } from './model';

/** PKS, BAST and SLA show an e-Meterai box from this contract value (spec §0). */
export const METERAI_THRESHOLD = 5_000_000;
const METERAI_TYPES: DocType[] = ['pks', 'bast', 'sla'];

const PASAL = /^pasal\s+(\d+[a-z]?)\s*(?:[–—:.-]\s*)?(.*)$/i;
const NUMERIC = /^(?:[-−]\s*)?(?:Rp\s?)?\d[\d.]*(?:,\d+)?\s*%?(?:,-)?$/;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);

function sectionHeading(title: string): Block[] {
  const text = title.trim();
  if (!text) return [];
  const pasal = PASAL.exec(text);
  if (pasal) {
    const judul = pasal[2].trim();
    return [{ type: 'heading', level: 2, text: judul ? `Pasal ${pasal[1]}\n${judul.toUpperCase()}` : `Pasal ${pasal[1]}`, align: 'center' }];
  }
  if (/\p{Lu}/u.test(text) && text === text.toUpperCase()) return [{ type: 'heading', level: 1, text, align: 'center' }];
  return [{ type: 'heading', level: 2, text }];
}

/** Column alignment: "No" centered, columns whose filled cells are all amounts/numbers right-aligned. */
function columnAlign(columns: string[], rows: string[][]): BlockAlign[] {
  return columns.map((col, i) => {
    if (/^no\.?$/i.test(col.trim())) return 'center';
    const filled = rows.map((row) => (row[i] ?? '').trim()).filter((v) => v !== '' && v !== '-');
    return filled.length && filled.every((v) => NUMERIC.test(v)) ? 'right' : 'left';
  });
}

function tableBlocks(table: DocTable, resolve: (s: string) => string): Block[] {
  const columns = (Array.isArray(table.columns) ? table.columns : []).map((c) => String(c ?? ''));
  if (!columns.length) return [];
  const rows = (Array.isArray(table.rows) ? table.rows : [])
    .map((row) => columns.map((_, i) => String((Array.isArray(row) ? row[i] : '') ?? '')))
    .filter((row) => row.some((c) => c.trim() !== ''));

  if (columns.length === 2 && columns.every((c) => c.trim() === '')) {
    return [
      {
        type: 'keyValue',
        rows: rows.map((row) => ({ label: runsText(toRuns(row[0], resolve)), value: toRuns(row[1], resolve) })),
      },
    ];
  }
  const cells = rows.map((row) => row.map((c) => toRuns(c, resolve)));
  const plain = cells.map((row) => row.map(runsText));
  const last = cells[cells.length - 1];
  const total = Boolean(last?.some((runs) => runs.some((r) => r.bold && /^total\b/i.test(r.text.trim()))));
  return [{ type: 'table', columns: columns.map(resolve), rows: cells, align: columnAlign(columns, plain), ...(total ? { total } : {}) }];
}

function signatureSlot(party: Party, data: MergeData, missing: string[]): SignatureSlot {
  const signed = (Array.isArray(data.signatures) ? data.signatures : []).find((s) => s.party === party);
  const company = data.company ?? ({} as MergeData['company']);
  const client = data.client ?? ({} as MergeData['client']);
  const first = party === 'pihak_pertama';
  const person = client.type === 'perorangan';
  const defaultName = first ? company.signatory_name : person ? client.name : client.pic_name || client.name;
  const name = signed?.signer_name || defaultName || '';
  if (!name) {
    const path = first ? 'company.signatory_name' : person ? 'client.name' : 'client.pic_name';
    if (!missing.includes(path)) missing.push(path);
  }
  return {
    party,
    label: first ? 'PIHAK PERTAMA' : 'PIHAK KEDUA',
    organization: first ? company.name || '' : person ? '' : client.name || '',
    signer_name: name,
    signer_title: signed?.signer_title || (first ? company.signatory_title : person ? '' : client.pic_title) || '',
    signed_at: signed?.signed_at || null,
    image_ref: signed?.image_url || null,
  };
}

/** Kuitansi: the company (penerima) signs on paper or not at all; the slot shows place, date and signatory. */
function receiptSlot(data: MergeData, view: Record<string, unknown>, missing: string[]): SignatureSlot {
  const company = data.company ?? ({} as MergeData['company']);
  const date = String((view.document as Record<string, unknown>)?.date_long ?? '');
  if (!company.signatory_name && !missing.includes('company.signatory_name')) missing.push('company.signatory_name');
  return {
    party: 'pihak_pertama',
    label: 'Penerima,',
    organization: company.name || '',
    signer_name: company.signatory_name || '',
    signer_title: company.signatory_title || '',
    signed_at: null,
    image_ref: null,
    caption: [company.city, date].filter(Boolean).join(', '),
    note: 'Diterbitkan secara elektronik',
  };
}

/** e-Meterai: PKS/BAST/SLA from the contract value (spec §0); Kuitansi above Rp5.000.000 (UU 10/2020 Bea Meterai). */
function needsMeterai(type: DocType, data: MergeData): boolean {
  if (METERAI_TYPES.includes(type)) return num(data.project?.value) >= METERAI_THRESHOLD;
  return type === 'receipt' && num(data.payment?.amount) > METERAI_THRESHOLD;
}

/** Blocks incl. title, sections, e-Meterai box and signature slots; unresolved merge fields end up in `missing`. */
export function buildModel(type: DocType, content: DocContent, data: MergeData): DocModel {
  const missing: string[] = [];
  const view = mergeView(data);
  const resolve = (text: string) => resolveWithView(text, view, missing);
  const ctx: DirectiveContext = { type, data, content, missing };
  const directive = (name: string) => directiveBlocks(name, ctx);

  const number = data.document?.number || '';
  const titleText = resolve(content?.title || data.document?.title || DOC_TYPES[type].label).trim().toUpperCase();
  const blocks: Block[] = [
    { type: 'heading', level: 1, text: titleText, align: 'center' },
    { type: 'paragraph', runs: [{ text: `Nomor: ${number || '(dibuat otomatis)'}` }], align: 'center' },
    { type: 'spacer', size: 10 },
  ];

  for (const section of Array.isArray(content?.sections) ? content.sections : []) {
    if (!section || section.hidden) continue;
    const body = parseBody(section.body ?? '', resolve, directive);
    // `{{#halaman_baru}}` at the very start of a body breaks the page before the section title
    if (body[0]?.type === 'pageBreak') blocks.push(body.shift() as Block);
    blocks.push(...sectionHeading(resolve(section.title ?? '')), ...body);
    if (section.table) blocks.push(...tableBlocks(section.table, resolve));
  }

  const signatures = DOC_TYPES[type].parties.map((party) => signatureSlot(party, data, missing));
  if (type === 'receipt') signatures.push(receiptSlot(data, view, missing));

  if (needsMeterai(type, data)) {
    const at = blocks.findIndex((b) => b.type === 'signatures');
    blocks.splice(at < 0 ? blocks.length : at, 0, { type: 'meteraiBox' });
  }

  return {
    meta: { number, title: titleText.replace(/\s*\n\s*/g, ' '), type, date: data.document?.date || '' },
    kop: { company: data.company },
    blocks,
    signatures,
    footer: { text: number },
    missing,
  };
}
