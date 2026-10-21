// DocModel → PDF with pdfmake (vector; spec §6). pdfmake and its fonts are loaded with import() on first export so
// they never enter the main bundle. Kop (wings logo as SVG) and footer "Halaman x dari y" repeat on every page.
import type { Column, Content, CustomTableLayout, TableCell, TDocumentDefinitions, TVirtualFileSystem } from 'pdfmake/interfaces';
import { loadImage, toDataUrl } from './assets';
import { triggerDownload } from './download';
import {
  BRAND,
  FONT,
  INK,
  LINE_HEIGHT,
  LOGO,
  KOP_TOP,
  METERAI_BOX,
  PAGE,
  SIGN_SPACE,
  FOOTER_FROM_BOTTOM,
  columnWidths,
  contactLine,
  documentFileName,
  listMarker,
  markerWidth,
  pageMargins,
  renderItems,
  signatureColumns,
  signedText,
  wingsSvg,
  type RenderItem,
} from './layout';
import type { Block, DocModel, KeyValueRow, SignatureSlot, TextRun } from './model';

type PdfMake = typeof import('pdfmake/build/pdfmake');

const styled = (r: TextRun) => Boolean(r.bold || r.italic);
/** A word with an inner break opportunity ("Layanan/Produk", "Undang-Undang", "001/INV/GNB/X/2026"). */
const BREAKABLE_WORD = /(\S*[^\s/-][/-]+[^\s/-]\S*)/;

/**
 * Runs → pdfmake inlines. pdfmake justifies by spreading the extra space over EVERY inline boundary, also where
 * there is no space (a bold word followed by a comma, a hyphen or slash it may break at). So punctuation next to an
 * emphasised run joins that run ("**Rabu**," → bold "Rabu,"), and words with inner break opportunities become
 * unbreakable inlines; justified lines then only stretch at real spaces.
 */
export function pdfText(items: TextRun[]) {
  const parts = items.map((r) => ({ ...r }));
  for (let i = 1; i < parts.length; i += 1) {
    const a = parts[i - 1];
    const b = parts[i];
    if (!/\S$/.test(a.text) || !/^\S/.test(b.text) || styled(a) === styled(b)) continue;
    if (styled(a)) {
      const head = /^\S+/.exec(b.text)?.[0] ?? '';
      a.text += head;
      b.text = b.text.slice(head.length);
    } else {
      const tail = /\S+$/.exec(a.text)?.[0] ?? '';
      b.text = tail + b.text;
      a.text = a.text.slice(0, a.text.length - tail.length);
    }
  }
  return parts.flatMap((r) =>
    r.text
      .split(BREAKABLE_WORD)
      .filter((piece) => piece !== '')
      .map((piece) => ({ text: piece, bold: r.bold, italics: r.italic, ...(BREAKABLE_WORD.test(piece) && !/\s/.test(piece) ? { noWrap: true } : {}) })),
  );
}
/** Runs of left/right/centered text (no justification, so no workaround needed and long tokens may wrap). */
const runs = (items: TextRun[]) => items.map((r) => ({ text: r.text, bold: r.bold, italics: r.italic }));

/** Cell padding (left + right) and rule width of the GRID layout, which pdfmake adds outside the column widths. */
const CELL_PADDING = 8;
const RULE = 0.6;

const GRID: CustomTableLayout = {
  hLineWidth: () => RULE,
  vLineWidth: () => RULE,
  hLineColor: () => INK.line,
  vLineColor: () => INK.line,
  paddingLeft: () => CELL_PADDING / 2,
  paddingRight: () => CELL_PADDING / 2,
  paddingTop: () => 2.5,
  paddingBottom: () => 2.5,
};
const PLAIN: CustomTableLayout = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingLeft: () => 0,
  paddingRight: () => 4,
  paddingTop: () => 1,
  paddingBottom: () => 1,
};
const DASHED: CustomTableLayout = {
  hLineWidth: () => 0.8,
  vLineWidth: () => 0.8,
  hLineColor: () => INK.subtle,
  vLineColor: () => INK.subtle,
  hLineStyle: () => ({ dash: { length: 3, space: 2 } }),
  vLineStyle: () => ({ dash: { length: 3, space: 2 } }),
};

function keyValue(rows: KeyValueRow[], totals: boolean, width: number): Content {
  if (totals) {
    // a rule above every bold row ("Jumlah yang harus dibayar")
    const strongBefore = new Set(rows.map((r, i) => (r.strong ? i : -1)).filter((i) => i > 0));
    return {
      columns: [
        { width: '*', text: '' },
        {
          width: Math.min(250, width * 0.55),
          table: {
            widths: ['*', 'auto'],
            body: rows.map((r) => [
              { text: r.label, bold: r.strong },
              { text: runs(r.value), alignment: 'right', bold: r.strong },
            ]),
          },
          layout: {
            ...PLAIN,
            paddingRight: () => 0,
            paddingTop: () => 2,
            paddingBottom: () => 2,
            hLineWidth: (i: number) => (strongBefore.has(i) ? 0.8 : 0),
            hLineColor: () => INK.text,
          },
        },
      ],
      margin: [0, 6, 0, 0],
    };
  }
  // label column as wide as the longest label (like the preview), at most 40 % of the line
  const label = Math.min(width * 0.4, Math.max(4, ...rows.map((r) => r.label.length)) * FONT.body * 0.55);
  return {
    table: {
      widths: [label, 6, '*'],
      body: rows.map((r) => [{ text: r.label, bold: r.strong }, { text: ':' }, { text: runs(r.value), bold: r.strong }]),
    },
    layout: PLAIN,
    margin: [0, 4, 0, 0],
  };
}

function blockContent(block: Exclude<Block, { type: 'signatures' }>, width: number): Content {
  switch (block.type) {
    case 'heading': {
      const size = block.level === 1 ? FONT.h1 : block.level === 2 ? FONT.h2 : FONT.h3;
      const top = block.level === 1 ? 4 : block.level === 2 ? 12 : 8;
      return { text: block.text, fontSize: size, bold: true, alignment: block.align ?? 'left', margin: [0, top, 0, 3], headlineLevel: 1 };
    }
    case 'paragraph':
      if (block.boxed) {
        return {
          table: { widths: ['auto'], body: [[{ text: runs(block.runs), fontSize: FONT.amount, bold: true, margin: [8, 4, 8, 4] }]] },
          layout: { hLineWidth: () => 1.2, vLineWidth: () => 1.2, hLineColor: () => INK.text, vLineColor: () => INK.text },
          margin: [0, 8, 0, 0],
        };
      }
      return {
        text: block.align === 'justify' ? pdfText(block.runs) : runs(block.runs),
        alignment: block.align ?? 'left',
        fontSize: block.size === 'small' ? FONT.small : block.size === 'large' ? FONT.amount : FONT.body,
        margin: [0, 4, 0, 0],
      };
    case 'list': {
      const marker = markerWidth(block) * FONT.body;
      const indent = (block.indent ?? 0) * 2 * FONT.body;
      return {
        stack: block.items.map((item, i) => ({
          columns: [
            { width: marker, text: listMarker(block, i) },
            { width: '*', text: pdfText(item), alignment: 'justify' },
          ],
          columnGap: 0,
          margin: [indent, 2.5, 0, 0],
        })),
      };
    }
    case 'table': {
      const n = block.columns.length;
      const widths = columnWidths(block, width - n * CELL_PADDING - (n + 1) * RULE, FONT.table * 0.52, 0);
      const align = (i: number) => block.align?.[i] ?? 'left';
      const last = block.rows.length - 1;
      const body: TableCell[][] = [
        block.columns.map((col, i) => ({ text: col, bold: true, fillColor: INK.fill, alignment: align(i) === 'right' ? 'right' : align(i) })),
        ...block.rows.map((row, r) =>
          block.columns.map((_, i) => ({
            text: runs(row[i] ?? []),
            alignment: align(i),
            ...(block.total && r === last ? { bold: true, fillColor: INK.fill } : {}),
          })),
        ),
      ];
      return { table: { headerRows: 1, dontBreakRows: true, widths, body }, layout: GRID, fontSize: FONT.table, margin: [0, 6, 0, 0] };
    }
    case 'keyValue':
      return keyValue(block.rows, block.variant === 'totals', width);
    case 'spacer':
      return { text: '', margin: [0, block.size ?? 12, 0, 0] };
    case 'pageBreak':
      return { text: '', pageBreak: 'after' };
    case 'meteraiBox':
      return { columns: [{ width: '*', text: '' }, meteraiBox()], margin: [0, 12, 0, 0] };
  }
}

function meteraiBox(): Column {
  return {
    width: METERAI_BOX.width,
    table: {
      widths: [METERAI_BOX.width - 2],
      heights: [METERAI_BOX.height],
      body: [[{ stack: [{ text: 'e-Meterai', bold: true }, { text: 'Rp10.000' }], fontSize: 7, color: INK.subtle, alignment: 'center', margin: [0, 13, 0, 0] }]],
    },
    layout: DASHED,
  };
}

function slotColumn(slot: SignatureSlot, image: string | undefined, captionLine: boolean, orgLine: boolean): Column {
  const stamp = slot.signed_at ? 'Ditandatangani secara elektronik' : slot.note ?? '';
  const space: Content = image
    ? { image, fit: [140, SIGN_SPACE - 6], alignment: 'center' }
    : { text: stamp, italics: true, color: INK.subtle, fontSize: FONT.small, alignment: 'center', margin: [0, SIGN_SPACE / 2 - 6, 0, 0] };
  return {
    width: '*',
    stack: [
      ...(captionLine ? [{ text: slot.caption || ' ' }] : []),
      { text: slot.label, bold: true },
      ...(orgLine ? [{ text: slot.organization || ' ' }] : []),
      { table: { widths: ['*'], heights: [SIGN_SPACE], body: [[space]] }, layout: 'noBorders' },
      { text: slot.signer_name || '(.............................)', bold: true, decoration: slot.signer_name ? 'underline' : undefined },
      { text: slot.signer_title || ' ' },
      ...(slot.signed_at ? [{ text: signedText(slot), fontSize: 6.5, color: INK.subtle, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
    ],
    alignment: 'center',
  };
}

function signatureRow(item: Extract<RenderItem, { kind: 'signatures' }>, images: Map<SignatureSlot, string>): Content {
  const captionLine = item.slots.some((s) => s.caption);
  const orgLine = item.slots.some((s) => s.organization);
  const before = (captionLine ? 1 : 0) + 1 + (orgLine ? 1 : 0);
  const columns: Column[] = signatureColumns(item.slots, item.meterai).map((col) => {
    if (col.kind === 'slot') return slotColumn(col.slot, images.get(col.slot), captionLine, orgLine);
    if (col.kind === 'empty') return { width: '*', text: '' };
    return { width: METERAI_BOX.width, stack: [{ text: '', margin: [0, before * FONT.body * LINE_HEIGHT + 6, 0, 0] }, meteraiBox()] };
  });
  return { stack: [{ columns, columnGap: 12 }], unbreakable: true, margin: [0, 22, 0, 0] };
}

/** The pdfmake document definition of a model (signature images as data URLs, keyed by slot). */
export function pdfDefinition(model: DocModel, images: Map<SignatureSlot, string> = new Map()): TDocumentDefinitions {
  const company = model.kop.company;
  const margins = pageMargins(model.meta.type);
  const width = PAGE.width - margins.left - margins.right;
  const content: Content[] = [];
  let breakNext = false;
  for (const item of renderItems(model)) {
    if (item.kind === 'block' && item.block.type === 'pageBreak') {
      breakNext = content.length > 0;
      continue;
    }
    const node = (item.kind === 'signatures' ? signatureRow(item, images) : blockContent(item.block, width)) as Content & { pageBreak?: string };
    if (breakNext) node.pageBreak = 'before';
    breakNext = false;
    content.push(node);
  }

  return {
    pageSize: 'A4',
    pageMargins: [margins.left, margins.top, margins.right, margins.bottom],
    info: { title: model.meta.title, subject: model.meta.number, author: company?.name ?? '', creator: company?.name ?? '', producer: 'Garuda Nexa' },
    header: () => ({
      margin: [margins.left, KOP_TOP, margins.right, 0],
      stack: [
        {
          columns: [
            { svg: wingsSvg(BRAND), width: LOGO.width, height: LOGO.height },
            {
              width: '*',
              stack: [
                { text: company?.name ?? '', bold: true, fontSize: FONT.kopName, color: INK.text },
                { text: contactLine(company), fontSize: FONT.kopContact, color: INK.muted, margin: [0, 1, 0, 0] },
              ],
              margin: [9, 2, 0, 0],
            },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 6, x2: width, y2: 6, lineWidth: 1.2, lineColor: BRAND }] },
      ],
    }),
    footer: (currentPage: number, pageCount: number) => ({
      margin: [margins.left, margins.bottom - FOOTER_FROM_BOTTOM, margins.right, 0],
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: width, y2: 0, lineWidth: 0.5, lineColor: INK.line }] },
        {
          columns: [
            { text: model.footer.text, fontSize: FONT.footer, color: INK.subtle },
            { text: `Halaman ${currentPage} dari ${pageCount}`, fontSize: FONT.footer, color: INK.subtle, alignment: 'right' },
          ],
          margin: [0, 3, 0, 0],
        },
      ],
    }),
    // A heading never ends a page on its own, and "Pasal 5" / "CARA PEMBAYARAN" never split over two pages
    pageBreakBefore: (node, queries) => node.headlineLevel === 1 && (node.pageNumbers.length > 1 || queries.getFollowingNodesOnPage().length === 0),
    content,
    defaultStyle: { font: 'Roboto', fontSize: FONT.body, lineHeight: LINE_HEIGHT, color: INK.text },
  };
}

let pdfMakeReady: Promise<PdfMake> | null = null;

/** pdfmake with the Roboto fonts, loaded once; remote URLs are refused (every image is inlined). */
function loadPdfMake(): Promise<PdfMake> {
  pdfMakeReady ??= Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]).then(([pdfMakeModule, vfsModule]) => {
    // UMD bundles: the API sits on `default` when imported as ESM
    const pdfMake = (pdfMakeModule as unknown as { default?: PdfMake }).default ?? pdfMakeModule;
    const vfs = ((vfsModule as unknown as { default?: TVirtualFileSystem }).default ?? vfsModule) as TVirtualFileSystem;
    pdfMake.addVirtualFileSystem(vfs);
    pdfMake.setUrlAccessPolicy(() => false);
    return pdfMake;
  });
  pdfMakeReady.catch(() => {
    pdfMakeReady = null;
  });
  return pdfMakeReady;
}

/** Renders the PDF (signature images are loaded from their object/data URLs first). */
export async function renderPdf(model: DocModel): Promise<Blob> {
  const images = new Map<SignatureSlot, string>();
  await Promise.all(
    model.signatures.map(async (slot) => {
      const image = await loadImage(slot.image_src);
      if (image) images.set(slot, toDataUrl(image));
    }),
  );
  const pdfMake = await loadPdfMake();
  return pdfMake.createPdf(pdfDefinition(model, images)).getBlob();
}

/** Builds the PDF and starts the download, named like `PKS-007-GNB-X-2026.pdf`. */
export async function exportPdf(model: DocModel, fileName: string): Promise<void> {
  triggerDownload(await renderPdf(model), documentFileName(fileName, model.meta.number, '.pdf'));
}
