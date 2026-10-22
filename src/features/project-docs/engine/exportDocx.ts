// DocModel → DOCX with the `docx` package (spec §6), loaded with import() on first export. The kop (wings logo as a
// PNG rendered from the SVG, company name, contact line, brand rule) and the footer (number + "Halaman x dari y")
// repeat on every page; headings keep with the next paragraph, table rows never split and header rows repeat.
import type { ImageRun as DocxImageRun, Paragraph as DocxParagraph, Table as DocxTable, TableCell as DocxTableCell, TextRun as DocxTextRun } from 'docx';
import { loadImage, logoPng, type ImageBytes } from './assets';
import { triggerDownload } from './download';
import {
  BRAND,
  FONT,
  FOOTER_FROM_BOTTOM,
  INK,
  KOP_TOP,
  LOGO,
  METERAI_BOX,
  PAGE,
  SIGN_SPACE,
  columnWidths,
  contactLine,
  documentFileName,
  listMarker,
  markerWidth,
  pageMargins,
  renderItems,
  signatureColumns,
  signedText,
  type RenderItem,
} from './layout';
import type { Block, BlockAlign, DocModel, KeyValueRow, SignatureSlot, TextRun } from './model';

type Docx = typeof import('docx');

/** points → twips / half-points / pixels (96 dpi, docx image sizes) */
const tw = (pt: number) => Math.round(pt * 20);
const hp = (pt: number) => Math.round(pt * 2);
const px = (pt: number) => Math.max(1, Math.round((pt * 96) / 72));
const hex = (color: string) => color.replace('#', '').toUpperCase();

/** Images the DOCX embeds; `logo: null` = no logo (e.g. no canvas available). */
export interface DocxAssets {
  logo: ImageBytes | null;
  signatures: Map<SignatureSlot, ImageBytes>;
}

/** Image size in points that fits `maxW` × `maxH`, keeping the aspect ratio (pixels count as 96 dpi). */
function fit(image: ImageBytes, maxW: number, maxH: number): { width: number; height: number } {
  const w = image.width * 0.75;
  const h = image.height * 0.75;
  const scale = Math.min(maxW / w, maxH / h, 1);
  return { width: w * scale, height: h * scale };
}

function buildDocument(docx: Docx, model: DocModel, assets: DocxAssets) {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    ImageRun,
    PageBreak,
    PageNumber,
    Paragraph,
    ShadingType,
    Tab,
    TabStopType,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    VerticalAlignTable,
    WidthType,
  } = docx;

  const company = model.kop.company;
  const margins = pageMargins(model.meta.type);
  const contentPt = PAGE.width - margins.left - margins.right;
  const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED };
  const align = (a: BlockAlign | undefined) => ALIGN[a ?? 'left'];
  const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
  const LINE = { style: BorderStyle.SINGLE, size: 4, color: hex(INK.line) };
  const GRID = { top: LINE, bottom: LINE, left: LINE, right: LINE, insideHorizontal: LINE, insideVertical: LINE };
  const DASH = { style: BorderStyle.DASHED, size: 6, color: hex(INK.subtle) };
  const CELL_MARGINS = { top: 50, bottom: 50, left: 80, right: 80 };
  const TIGHT = { top: 0, bottom: 0, left: 0, right: 0 };
  const FILL = { type: ShadingType.CLEAR, color: 'auto', fill: hex(INK.fill) };
  const dxa = (pt: number) => ({ size: tw(pt), type: WidthType.DXA });

  /** Runs with `\n` as line breaks. */
  const textRuns = (items: TextRun[], size: number, extra: { bold?: boolean; color?: string } = {}): DocxTextRun[] =>
    items.flatMap((r) =>
      r.text.split('\n').map(
        (part, i) =>
          new docx.TextRun({
            text: part,
            bold: extra.bold || r.bold,
            italics: r.italic,
            size: hp(size),
            ...(extra.color ? { color: extra.color } : {}),
            ...(i > 0 ? { break: 1 } : {}),
          }),
      ),
    );
  const plain = (text: string, size: number = FONT.body, extra: { bold?: boolean; italics?: boolean; color?: string; underline?: boolean } = {}) =>
    new docx.TextRun({
      text,
      size: hp(size),
      bold: extra.bold,
      italics: extra.italics,
      ...(extra.color ? { color: extra.color } : {}),
      ...(extra.underline ? { underline: {} } : {}),
    });
  const centered = (children: (DocxTextRun | DocxImageRun)[], before = 0, after = 0) =>
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: tw(before), after: tw(after) }, children });
  const table = (widths: number[], rows: InstanceType<typeof TableRow>[], borders: object = NO_BORDERS, alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]) =>
    new Table({
      width: dxa(widths.reduce((a, b) => a + b, 0)),
      columnWidths: widths.map(tw),
      layout: TableLayoutType.FIXED,
      borders,
      ...(alignment ? { alignment } : {}),
      rows,
    });

  const meteraiTable = () =>
    table(
      [METERAI_BOX.width],
      [
        new TableRow({
          height: { value: tw(METERAI_BOX.height), rule: 'atLeast' },
          children: [
            new TableCell({
              verticalAlign: VerticalAlignTable.CENTER,
              children: [centered([plain('e-Meterai', 7, { bold: true, color: hex(INK.subtle) })]), centered([plain('Rp10.000', 7, { color: hex(INK.subtle) })])],
            }),
          ],
        }),
      ],
      { top: DASH, bottom: DASH, left: DASH, right: DASH, insideHorizontal: DASH, insideVertical: DASH },
    );

  function keyValue(rows: KeyValueRow[], totals: boolean): DocxTable {
    if (totals) {
      const box = Math.min(250, contentPt * 0.55);
      const rule = { top: { style: BorderStyle.SINGLE, size: 6, color: hex(INK.text) } };
      return table(
        [contentPt - box, box * 0.62, box * 0.38],
        rows.map(
          (r, i) =>
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({ margins: TIGHT, children: [new Paragraph({})] }),
                new TableCell({
                  margins: { ...TIGHT, top: 30, bottom: 30 },
                  ...(r.strong && i > 0 ? { borders: rule } : {}),
                  children: [new Paragraph({ children: [plain(r.label, FONT.body, { bold: r.strong })] })],
                }),
                new TableCell({
                  margins: { ...TIGHT, top: 30, bottom: 30 },
                  ...(r.strong && i > 0 ? { borders: rule } : {}),
                  children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: textRuns(r.value, FONT.body, { bold: r.strong }) })],
                }),
              ],
            }),
        ),
      );
    }
    const labelPt = Math.min(contentPt * 0.38, Math.max(...rows.map((r) => r.label.length), 4) * FONT.body * 0.52 + 6);
    return table(
      [labelPt, 8, contentPt - labelPt - 8],
      rows.map(
        (r) =>
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ margins: { ...TIGHT, top: 20, bottom: 20 }, children: [new Paragraph({ children: [plain(r.label, FONT.body, { bold: r.strong })] })] }),
              new TableCell({ margins: { ...TIGHT, top: 20, bottom: 20 }, children: [new Paragraph({ children: [plain(':')] })] }),
              new TableCell({ margins: { ...TIGHT, top: 20, bottom: 20 }, children: [new Paragraph({ children: textRuns(r.value, FONT.body, { bold: r.strong }) })] }),
            ],
          }),
      ),
    );
  }

  function blockElements(block: Exclude<Block, { type: 'signatures' | 'pageBreak' }>, pageBreakBefore: boolean): (DocxParagraph | DocxTable)[] {
    switch (block.type) {
      case 'heading': {
        const size = block.level === 1 ? FONT.h1 : block.level === 2 ? FONT.h2 : FONT.h3;
        const before = block.level === 1 ? 4 : block.level === 2 ? 12 : 8;
        return [
          new Paragraph({
            alignment: align(block.align),
            keepNext: true,
            keepLines: true,
            pageBreakBefore,
            spacing: { before: tw(before), after: tw(3) },
            children: textRuns([{ text: block.text }], size, { bold: true }),
          }),
        ];
      }
      case 'paragraph': {
        if (block.boxed) {
          const text = block.runs.map((r) => r.text).join('');
          const width = Math.min(contentPt, Math.max(120, text.length * FONT.amount * 0.62 + 24));
          const border = { style: BorderStyle.SINGLE, size: 10, color: hex(INK.text) };
          return [
            ...(pageBreakBefore ? [new Paragraph({ children: [new PageBreak()] })] : []),
            new Paragraph({ spacing: { before: tw(8) } }),
            table(
              [width],
              [new TableRow({ children: [new TableCell({ margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: textRuns(block.runs, FONT.amount, { bold: true }) })] })] })],
              { top: border, bottom: border, left: border, right: border, insideHorizontal: NONE, insideVertical: NONE },
            ),
          ];
        }
        const size = block.size === 'small' ? FONT.small : block.size === 'large' ? FONT.amount : FONT.body;
        return [new Paragraph({ alignment: align(block.align), pageBreakBefore, spacing: { before: tw(4) }, children: textRuns(block.runs, size) })];
      }
      case 'list': {
        const marker = markerWidth(block) * FONT.body;
        const left = (block.indent ?? 0) * 2 * FONT.body + marker;
        return block.items.map(
          (item, i) =>
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              pageBreakBefore: pageBreakBefore && i === 0,
              indent: { left: tw(left), hanging: tw(marker) },
              tabStops: [{ type: TabStopType.LEFT, position: tw(left) }],
              spacing: { before: tw(2.5) },
              children: [plain(listMarker(block, i)), new docx.TextRun({ children: [new Tab()] }), ...textRuns(item, FONT.body)],
            }),
        );
      }
      case 'table': {
        const widths = columnWidths(block, contentPt, FONT.table * 0.52, 8);
        const cellAlign = (i: number) => align(block.align?.[i]);
        const last = block.rows.length - 1;
        const header = new TableRow({
          tableHeader: true,
          cantSplit: true,
          children: block.columns.map(
            (col, i) =>
              new TableCell({
                width: dxa(widths[i]),
                shading: FILL,
                margins: CELL_MARGINS,
                children: [new Paragraph({ alignment: cellAlign(i), children: [plain(col, FONT.table, { bold: true })] })],
              }),
          ),
        });
        const rows = block.rows.map(
          (row, r) =>
            new TableRow({
              cantSplit: true,
              children: block.columns.map((_, i) => {
                const total = Boolean(block.total && r === last);
                return new TableCell({
                  width: dxa(widths[i]),
                  margins: CELL_MARGINS,
                  ...(total ? { shading: FILL } : {}),
                  children: [new Paragraph({ alignment: cellAlign(i), children: textRuns(row[i] ?? [], FONT.table, { bold: total }) })],
                });
              }),
            }),
        );
        return [
          ...(pageBreakBefore ? [new Paragraph({ children: [new PageBreak()] })] : []),
          new Paragraph({ spacing: { before: tw(2) } }),
          table(widths, [header, ...rows], GRID),
        ];
      }
      case 'keyValue':
        return [...(pageBreakBefore ? [new Paragraph({ children: [new PageBreak()] })] : []), new Paragraph({ spacing: { before: tw(2) } }), keyValue(block.rows, block.variant === 'totals')];
      case 'spacer':
        return [new Paragraph({ pageBreakBefore, spacing: { before: tw(block.size ?? 12) } })];
      case 'meteraiBox':
        return [
          new Paragraph({ pageBreakBefore, spacing: { before: tw(10) } }),
          table([contentPt - METERAI_BOX.width, METERAI_BOX.width], [new TableRow({ children: [new TableCell({ children: [new Paragraph({})] }), new TableCell({ children: [meteraiTable(), new Paragraph({})] })] })]),
        ];
    }
  }

  function slotCell(slot: SignatureSlot, width: number, captionLine: boolean, orgLine: boolean): DocxTableCell {
    const image = assets.signatures.get(slot);
    const stamp = slot.signed_at ? 'Ditandatangani secara elektronik' : slot.note ?? '';
    let space: DocxParagraph;
    if (image) {
      const size = fit(image, 140, SIGN_SPACE - 6);
      space = centered([new ImageRun({ type: image.type, data: image.data, transformation: { width: px(size.width), height: px(size.height) } })], 3, SIGN_SPACE - 3 - size.height);
    } else {
      space = centered(stamp ? [plain(stamp, FONT.small, { italics: true, color: hex(INK.subtle) })] : [], SIGN_SPACE / 2 - 5, SIGN_SPACE / 2 - 5);
    }
    return new TableCell({
      width: dxa(width),
      margins: TIGHT,
      children: [
        ...(captionLine ? [centered([plain(slot.caption ?? '')])] : []),
        centered([plain(slot.label, FONT.body, { bold: true })]),
        ...(orgLine ? [centered([plain(slot.organization)])] : []),
        space,
        centered([plain(slot.signer_name || '(.............................)', FONT.body, { bold: true, underline: Boolean(slot.signer_name) })]),
        centered([plain(slot.signer_title)]),
        ...(slot.signed_at ? [centered([plain(signedText(slot), 6.5, { color: hex(INK.subtle) })], 2)] : []),
      ],
    });
  }

  function signatureRow(item: Extract<RenderItem, { kind: 'signatures' }>, pageBreakBefore: boolean): (DocxParagraph | DocxTable)[] {
    const captionLine = item.slots.some((s) => s.caption);
    const orgLine = item.slots.some((s) => s.organization);
    const before = (captionLine ? 1 : 0) + 1 + (orgLine ? 1 : 0);
    const cols = signatureColumns(item.slots, item.meterai);
    const meteraiPt = METERAI_BOX.width + 12;
    const slotPt = (contentPt - (item.meterai ? meteraiPt : 0)) / cols.filter((c) => c.kind !== 'meterai').length;
    const widths = cols.map((c) => (c.kind === 'meterai' ? meteraiPt : slotPt));
    const cells = cols.map((col, i) => {
      if (col.kind === 'slot') return slotCell(col.slot, widths[i], captionLine, orgLine);
      if (col.kind === 'empty') return new TableCell({ width: dxa(widths[i]), children: [new Paragraph({})] });
      return new TableCell({
        width: dxa(widths[i]),
        margins: { ...TIGHT, left: 120 },
        // Word needs a paragraph after a nested table at the end of a cell
        children: [new Paragraph({ spacing: { before: tw(before * FONT.body * 1.2) } }), meteraiTable(), new Paragraph({})],
      });
    });
    return [
      new Paragraph({ pageBreakBefore, keepNext: true, spacing: { before: tw(18) } }),
      table(widths, [new TableRow({ cantSplit: true, children: cells })]),
    ];
  }

  // Body
  const children: (DocxParagraph | DocxTable)[] = [];
  let breakNext = false;
  for (const item of renderItems(model)) {
    if (item.kind === 'block' && item.block.type === 'pageBreak') {
      breakNext = children.length > 0;
      continue;
    }
    children.push(...(item.kind === 'signatures' ? signatureRow(item, breakNext) : blockElements(item.block as Exclude<Block, { type: 'signatures' | 'pageBreak' }>, breakNext)));
    breakNext = false;
  }
  // the body ends with a paragraph (Word expects one after a final table)
  if (!(children[children.length - 1] instanceof Paragraph)) children.push(new Paragraph({}));

  // Kop
  const kopText = [
    new Paragraph({ children: [plain(company?.name ?? '', FONT.kopName, { bold: true })] }),
    new Paragraph({ spacing: { before: 20 }, children: [plain(contactLine(company), FONT.kopContact, { color: hex(INK.muted) })] }),
  ];
  const logo = assets.logo;
  const logoPt = LOGO.width + 9;
  const kop = logo
    ? [
        table(
          [logoPt, contentPt - logoPt],
          [
            new TableRow({
              children: [
                new TableCell({
                  width: dxa(logoPt),
                  margins: TIGHT,
                  verticalAlign: VerticalAlignTable.CENTER,
                  children: [new Paragraph({ children: [new ImageRun({ type: logo.type, data: logo.data, transformation: { width: px(LOGO.width), height: px(LOGO.height) } })] })],
                }),
                new TableCell({ width: dxa(contentPt - logoPt), margins: TIGHT, verticalAlign: VerticalAlignTable.CENTER, children: kopText }),
              ],
            }),
          ],
        ),
      ]
    : kopText;

  return new Document({
    creator: company?.name ?? '',
    title: model.meta.title,
    description: model.meta.number,
    styles: { default: { document: { run: { font: 'Calibri', size: hp(FONT.body), color: hex(INK.text) }, paragraph: { spacing: { line: 264 } } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: tw(PAGE.width), height: tw(PAGE.height) },
            margin: { top: tw(margins.top), right: tw(margins.right), bottom: tw(margins.bottom), left: tw(margins.left), header: tw(KOP_TOP), footer: tw(FOOTER_FROM_BOTTOM - 10) },
          },
        },
        headers: {
          default: new Header({
            children: [...kop, new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: hex(BRAND), space: 1 } }, children: [] })],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: hex(INK.line), space: 4 } },
                tabStops: [{ type: TabStopType.RIGHT, position: tw(contentPt) }],
                children: [
                  plain(model.footer.text, FONT.footer, { color: hex(INK.subtle) }),
                  new docx.TextRun({ children: [new Tab(), 'Halaman ', PageNumber.CURRENT, ' dari ', PageNumber.TOTAL_PAGES], size: hp(FONT.footer), color: hex(INK.subtle) }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

/** Loads the logo PNG and the signature images (unless given) and renders the DOCX. */
export async function renderDocx(model: DocModel, assets?: Partial<DocxAssets>): Promise<Blob> {
  const docx = await import('docx');
  const logo = assets?.logo !== undefined ? assets.logo : await logoPng();
  let signatures = assets?.signatures;
  if (!signatures) {
    signatures = new Map();
    const loaded = await Promise.all(model.signatures.map(async (slot) => [slot, await loadImage(slot.image_src)] as const));
    for (const [slot, image] of loaded) if (image) signatures.set(slot, image);
  }
  return docx.Packer.toBlob(buildDocument(docx, model, { logo, signatures }));
}

/** Builds the DOCX and starts the download, named like `PKS-007-GNB-X-2026.docx`. */
export async function exportDocx(model: DocModel, fileName: string): Promise<void> {
  triggerDownload(await renderDocx(model), documentFileName(fileName, model.meta.number, '.docx'));
}
