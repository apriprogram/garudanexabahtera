// Page layout shared by the three renderers (React preview, pdfmake, docx) so they look alike: A4 geometry, type
// sizes, print colors, the kop contact line, signature row composition, table column widths, list markers and the
// export file name. Documents are paper, so colors here are fixed print values (same as the site tokens).
import { WINGS_PATH } from '../../../components/ui/LogoMark';
import type { CompanySettings, DocType } from '../types';
import { waktuPanjang } from './format';
import { runsText } from './markup';
import type { Block, DocModel, SignatureSlot } from './model';

/** Brand blue of the wings logo (#211FFE, brand-600). */
export const BRAND = '#211FFE';
/** Print colors: text (fg), secondary (muted), small print (subtle), table lines (line-strong), header fill (alt). */
export const INK = { text: '#121620', muted: '#4B5262', subtle: '#6B7383', line: '#CBD0DB', fill: '#F7F8FB' } as const;

/** Points per centimetre. */
export const CM = 28.3465;
/** A4 portrait in points. */
export const PAGE = { width: 595.28, height: 841.89 } as const;

/** Agreements get a 2.5 cm binding margin on the left (spec §6). */
const CONTRACT_TYPES: ReadonlySet<DocType> = new Set<DocType>(['mou', 'pks', 'uat', 'bast', 'sla']);

/** Page margins in points; the kop sits inside the top margin, the footer inside the bottom margin. */
export function pageMargins(type: DocType): { top: number; right: number; bottom: number; left: number } {
  return { top: 3.6 * CM, right: 2 * CM, bottom: 2 * CM, left: (CONTRACT_TYPES.has(type) ? 2.5 : 2) * CM };
}

/** Kop: distance from the top edge; footer: distance of its top from the bottom edge. */
export const KOP_TOP = 0.9 * CM;
export const FOOTER_FROM_BOTTOM = 1.25 * CM;
/** Wings logo width in the kop (viewBox 257 × 156). */
export const LOGO = { width: 44, height: (44 * 156) / 257 } as const;

/** Type sizes in points. */
export const FONT = { body: 10, small: 8, table: 8.5, h1: 13, h2: 10.5, h3: 10, kopName: 12.5, kopContact: 7.5, footer: 7.5, amount: 14 } as const;
export const LINE_HEIGHT = 1.35;
/** Signature space height in points. */
export const SIGN_SPACE = 60;
export const METERAI_BOX = { width: 66, height: 46 } as const;

/** Wings logo as a standalone SVG (pdfmake, DOCX PNG rendering). */
export function wingsSvg(color: string = BRAND): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 257 156"><path fill="${color}" d="${WINGS_PATH}"/></svg>`;
}

/** "Jl. Contoh 1, Bandung · Telp. 0812 · info@garudanexa.com · garudanexa.com" */
export function contactLine(company: CompanySettings): string {
  const address = [company?.address, company?.city].filter((s) => s && s.trim()).join(', ');
  const website = (company?.website ?? '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  return [address, company?.phone ? `Telp. ${company.phone}` : '', company?.email ?? '', website].filter((s) => s && s.trim()).join(' · ');
}

/** What the renderers lay out: content blocks, and the signature row at its place. */
export type RenderItem =
  | { kind: 'block'; block: Exclude<Block, { type: 'signatures' }> }
  | { kind: 'signatures'; slots: SignatureSlot[]; meterai: boolean };

/**
 * Blocks in order with the signature row at the first `signatures` marker (or at the end). With signature slots the
 * e-Meterai box is drawn inside the signature row, so standalone `meteraiBox` blocks are dropped.
 */
export function renderItems(model: DocModel): RenderItem[] {
  const slots = model.signatures ?? [];
  const meterai = model.blocks.some((b) => b.type === 'meteraiBox');
  const items: RenderItem[] = [];
  let placed = false;
  for (const block of model.blocks) {
    if (block.type === 'signatures') {
      if (!placed && slots.length) items.push({ kind: 'signatures', slots, meterai });
      placed = placed || slots.length > 0;
    } else if (!(block.type === 'meteraiBox' && slots.length)) {
      items.push({ kind: 'block', block });
    }
  }
  if (!placed && slots.length) items.push({ kind: 'signatures', slots, meterai });
  return items;
}

/** Columns of the signature row: one slot sits on the right; the e-Meterai box sits between the parties. */
export type SignatureColumn = { kind: 'slot'; slot: SignatureSlot } | { kind: 'meterai' } | { kind: 'empty' };

export function signatureColumns(slots: SignatureSlot[], meterai: boolean): SignatureColumn[] {
  const cols: SignatureColumn[] = slots.map((slot) => ({ kind: 'slot', slot }));
  if (cols.length === 1) cols.unshift({ kind: 'empty' });
  if (meterai) cols.splice(cols.length - 1, 0, { kind: 'meterai' });
  return cols;
}

/** "Ditandatangani secara elektronik pada 22 Oktober 2026 pukul 10.05 WIB" ('' while unsigned). */
export function signedText(slot: SignatureSlot): string {
  if (!slot.signed_at) return '';
  const when = waktuPanjang(slot.signed_at);
  return when ? `Ditandatangani secara elektronik pada ${when}` : 'Ditandatangani secara elektronik';
}

/** Marker of list item `index` (0-based): "1." / "(1)" / "a." / "•". */
export function listMarker(block: Extract<Block, { type: 'list' }>, index: number): string {
  if (!block.ordered) return '•';
  const n = (block.start ?? 1) + index;
  if (block.style === 'paren') return `(${n})`;
  if (block.style === 'alpha') return `${n >= 1 && n <= 26 ? String.fromCharCode(96 + n) : n}.`;
  return `${n}.`;
}

/** Marker column width in em (fits "(12)"). */
export const markerWidth = (block: Extract<Block, { type: 'list' }>) => (!block.ordered ? 1.1 : block.style === 'paren' ? 2 : 1.6);

/**
 * Column widths (same unit as `available`) of a table: every column gets room for its longest word, the rest is
 * shared by content length (or by `block.widths` when the block defines relative weights).
 */
export function columnWidths(block: Extract<Block, { type: 'table' }>, available: number, charWidth: number, padding: number): number[] {
  const n = block.columns.length;
  const texts = (i: number) => [block.columns[i], ...block.rows.map((row) => runsText(row[i] ?? []))];
  const longestWord = (i: number) => Math.min(16, Math.max(2, ...texts(i).flatMap((t) => t.split(/\s+/).map((w) => w.length))));
  const length = (i: number) => Math.min(48, Math.max(3, ...texts(i).map((t) => t.length)));
  const min = Array.from({ length: n }, (_, i) => longestWord(i) * charWidth + padding);
  const weight = Array.from({ length: n }, (_, i) => (block.widths?.length === n ? Math.max(1, block.widths[i]) : length(i)));
  const minSum = min.reduce((a, b) => a + b, 0);
  if (minSum >= available) return min.map((w) => (w * available) / minSum);
  const extra = available - minSum;
  const weightSum = weight.reduce((a, b) => a + b, 0);
  return min.map((w, i) => w + (extra * weight[i]) / weightSum);
}

const DOC_NUMBER = /^(\d+)\/([A-Z]+)\/([^/]+)\/([IVXLCDM]+)\/(\d{4})$/;

/**
 * Download name: `007/PKS/GNB/X/2026` → `PKS-007-GNB-X-2026.pdf`. Any other name is kept but stripped of characters
 * that file systems reject; an empty name falls back to the document number.
 */
export function documentFileName(fileName: string, number: string, ext: '.pdf' | '.docx'): string {
  let base = String(fileName ?? '').trim().replace(/\.(pdf|docx)$/i, '') || number || 'dokumen';
  const m = DOC_NUMBER.exec(base);
  if (m) base = `${m[2]}-${m[1]}-${m[3]}-${m[4]}-${m[5]}`;
  base = base
    .replace(/\p{Cc}/gu, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-{2,}/g, '-')
    .replace(/^[-. ]+|[-. ]+$/g, '');
  return `${base || 'dokumen'}${ext}`;
}
