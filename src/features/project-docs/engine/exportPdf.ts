// DocModel → PDF with pdfmake (vector; spec §6). pdfmake and its fonts are loaded with import() on first export so
// they never enter the main bundle.
// PLACEHOLDER (foundation): kop with the wings logo, blocks, signatures, footer "Halaman x dari y". The engine owner
// refines the styling; keep the signature stable.
import type { Content, TDocumentDefinitions, TVirtualFileSystem } from 'pdfmake/interfaces';
import { WINGS_PATH } from '../../../components/ui/LogoMark';
import type { Block, DocModel, SignatureSlot, TextRun } from './model';
import { triggerDownload, withExtension } from './download';

/** Brand blue of the logo (design.md, brand-600); documents are printed, so the value is fixed here. */
const BRAND = '#211FFE';
const MUTED = '#4B5262';
const CM = 28.3465;
/** Contracts (types with signatures) get a 2.5 cm left margin, everything else 2 cm (spec §6). */
const CONTRACT_TYPES = new Set(['mou', 'pks', 'uat', 'bast', 'sla']);

const wingsSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 257 156"><path fill="${BRAND}" d="${WINGS_PATH}"/></svg>`;

const runs = (items: TextRun[]) => items.map((r) => ({ text: r.text, bold: r.bold, italics: r.italic }));

function blockContent(block: Block): Content {
  switch (block.type) {
    case 'heading':
      return { text: block.text, style: `h${block.level}`, alignment: block.align ?? 'left' };
    case 'paragraph':
      return { text: runs(block.runs), alignment: block.align ?? 'left', margin: [0, 3, 0, 0] };
    case 'list':
      return block.ordered
        ? { ol: block.items.map((item) => ({ text: runs(item) })), margin: [0, 3, 0, 0] }
        : { ul: block.items.map((item) => ({ text: runs(item) })), margin: [0, 3, 0, 0] };
    case 'table':
      return {
        table: {
          headerRows: 1,
          widths: block.widths?.length === block.columns.length ? block.widths.map((w) => `${w}*`) : block.columns.map(() => '*'),
          body: [block.columns.map((c) => ({ text: c, bold: true })), ...block.rows.map((row) => block.columns.map((_, i) => row[i] ?? ''))],
        },
        fontSize: 9,
        margin: [0, 4, 0, 0],
      };
    case 'keyValue':
      return {
        table: { widths: ['auto', 'auto', '*'], body: block.rows.map((r) => [{ text: r.label, color: MUTED }, ':', r.value]) },
        layout: 'noBorders',
        margin: [0, 4, 0, 0],
      };
    case 'spacer':
      return { text: '', margin: [0, block.size ?? 12, 0, 0] };
    case 'pageBreak':
      return { text: '', pageBreak: 'after' };
    case 'meteraiBox':
      return {
        table: { widths: [80], heights: [48], body: [[{ text: 'e-Meterai', alignment: 'center', color: MUTED, fontSize: 8, margin: [0, 18, 0, 0] }]] },
        margin: [0, 12, 0, 0],
      };
  }
}

function signatureColumn(slot: SignatureSlot): Content {
  const image: Content =
    slot.image_src && slot.image_src.startsWith('data:image/')
      ? { image: slot.image_src, fit: [140, 56], alignment: 'center' }
      : { text: '', margin: [0, 56, 0, 0] };
  return {
    stack: [
      { text: slot.label, bold: true },
      { text: slot.organization },
      image,
      { text: slot.signer_name || '(.............................)', bold: true, decoration: 'underline' },
      { text: slot.signer_title },
      slot.signed_at ? { text: `Ditandatangani secara elektronik ${slot.signed_at}`, fontSize: 7, color: MUTED } : { text: '' },
    ],
    alignment: 'center',
  };
}

function definition(model: DocModel): TDocumentDefinitions {
  const { company } = model.kop;
  const contact = [company.address, company.city, company.phone, company.email, company.website].filter(Boolean).join(' · ');
  const left = CONTRACT_TYPES.has(model.meta.type) ? 2.5 * CM : 2 * CM;
  return {
    pageSize: 'A4',
    pageMargins: [left, 3.6 * CM, 2 * CM, 2 * CM],
    info: { title: model.meta.title, subject: model.meta.number, creator: company.name },
    header: {
      margin: [left, 0.9 * CM, 2 * CM, 0],
      stack: [
        {
          columns: [
            { svg: wingsSvg, width: 44 },
            { stack: [{ text: company.name, bold: true, fontSize: 12 }, { text: contact, fontSize: 8, color: MUTED }], margin: [8, 4, 0, 0] },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 6, x2: 595.28 - left - 2 * CM, y2: 6, lineWidth: 1.2, lineColor: BRAND }] },
      ],
    },
    footer: (currentPage: number, pageCount: number) => ({
      margin: [left, 0.6 * CM, 2 * CM, 0],
      columns: [
        { text: model.footer.text, fontSize: 8, color: MUTED },
        { text: `Halaman ${currentPage} dari ${pageCount}`, fontSize: 8, color: MUTED, alignment: 'right' },
      ],
    }),
    content: [
      ...model.blocks.map(blockContent),
      ...(model.signatures.length ? [{ columns: model.signatures.map(signatureColumn), columnGap: 24, margin: [0, 24, 0, 0] } as Content] : []),
    ],
    defaultStyle: { fontSize: 10, lineHeight: 1.25 },
    styles: {
      h1: { fontSize: 13, bold: true },
      h2: { fontSize: 11, bold: true, margin: [0, 10, 0, 2] },
      h3: { fontSize: 10, bold: true, margin: [0, 8, 0, 2] },
    },
  };
}

/** Builds the PDF and starts the download (`.pdf` is appended when missing). */
export async function exportPdf(model: DocModel, fileName: string): Promise<void> {
  const [pdfMakeModule, vfsModule] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]);
  // UMD bundles: the API sits on `default` when imported as ESM
  const pdfMake = (pdfMakeModule as unknown as { default?: typeof pdfMakeModule }).default ?? pdfMakeModule;
  const vfs = ((vfsModule as unknown as { default?: TVirtualFileSystem }).default ?? vfsModule) as TVirtualFileSystem;
  pdfMake.addVirtualFileSystem(vfs);
  const blob = await pdfMake.createPdf(definition(model)).getBlob();
  triggerDownload(blob, withExtension(fileName, '.pdf'));
}
