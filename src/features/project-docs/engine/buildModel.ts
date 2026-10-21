// DocContent + MergeData → DocModel (spec §6). Section bodies use the tiny markup of spec §4.1; merge fields are
// resolved inside the text runs, so a merged value can never inject markup.
// PLACEHOLDER parts (foundation): the generic title block and the e-Meterai position. The engine owner refines the
// per-type layout (kop details, party blocks, invoice tables); keep the signature stable.
import type { DocContent, DocType, MergeData, Party } from '../types';
import { DOC_TYPES } from './docTypes';
import { resolveMerge } from './merge';
import type { Block, DocModel, SignatureSlot, TextRun } from './model';

/** PKS, BAST and SLA show an e-Meterai box from this contract value (spec §0). */
export const METERAI_THRESHOLD = 5_000_000;
const METERAI_TYPES: DocType[] = ['pks', 'bast', 'sla'];

const BULLET = /^[-*]\s+/;
const NUMBERED = /^\d+[.)]\s+/;

/** `**bold**` → runs. */
function toRuns(text: string, resolve: (s: string) => string): TextRun[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter((part) => part !== '')
    .map((part) => (part.startsWith('**') && part.endsWith('**') && part.length > 4 ? { text: resolve(part.slice(2, -2)), bold: true } : { text: resolve(part) }));
}

/** Body markup → paragraph / list blocks: blank line = new paragraph, `- ` = bullet, `1. ` = numbered. */
export function parseBody(body: string, resolve: (s: string) => string = (s) => s): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: TextRun[][] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', runs: toRuns(paragraph.join(' '), resolve), align: 'justify' });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: 'list', ordered: list.ordered, items: list.items });
    list = null;
  };

  for (const raw of body.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const ordered = NUMBERED.test(line);
    if (line === '') {
      flushParagraph();
      flushList();
    } else if (ordered || BULLET.test(line)) {
      flushParagraph();
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push(toRuns(line.replace(ordered ? NUMBERED : BULLET, ''), resolve));
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

function signatureSlot(party: Party, data: MergeData): SignatureSlot {
  const signed = data.signatures.find((s) => s.party === party);
  const first = party === 'pihak_pertama';
  return {
    party,
    label: first ? 'PIHAK PERTAMA' : 'PIHAK KEDUA',
    organization: first ? data.company.name : data.client.name,
    signer_name: signed?.signer_name || (first ? data.company.signatory_name : data.client.pic_name || data.client.name),
    signer_title: signed?.signer_title || (first ? data.company.signatory_title : data.client.pic_title),
    signed_at: signed?.signed_at || null,
    image_ref: signed?.image_url || null,
  };
}

/** Blocks incl. title, sections, e-Meterai box and signature slots; unresolved merge fields end up in `missing`. */
export function buildModel(type: DocType, content: DocContent, data: MergeData): DocModel {
  const missing: string[] = [];
  const resolve = (text: string) => {
    const out = resolveMerge(text, data);
    for (const path of out.missing) if (!missing.includes(path)) missing.push(path);
    return out.text;
  };

  const title = resolve(content.title || data.document.title || DOC_TYPES[type].label);
  const blocks: Block[] = [
    { type: 'heading', level: 1, text: title.toUpperCase(), align: 'center' },
    { type: 'paragraph', runs: [{ text: `Nomor: ${data.document.number}` }], align: 'center' },
    { type: 'spacer', size: 8 },
  ];

  for (const section of content.sections) {
    if (section.hidden) continue;
    if (section.title) blocks.push({ type: 'heading', level: 2, text: resolve(section.title) });
    if (section.body) blocks.push(...parseBody(section.body, resolve));
    if (section.table && section.table.columns.length) {
      blocks.push({ type: 'table', columns: section.table.columns.map(resolve), rows: section.table.rows.map((row) => row.map(resolve)) });
    }
  }

  if (METERAI_TYPES.includes(type) && data.project.value >= METERAI_THRESHOLD) blocks.push({ type: 'meteraiBox' });

  return {
    meta: { number: data.document.number, title, type, date: data.document.date },
    kop: { company: data.company },
    blocks,
    signatures: DOC_TYPES[type].parties.map((party) => signatureSlot(party, data)),
    footer: { text: data.document.number },
    missing,
  };
}
