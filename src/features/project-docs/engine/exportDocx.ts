// DocModel → DOCX with the `docx` package (spec §6), loaded with import() on first export.
// PLACEHOLDER (foundation): text kop (company name + contact line), blocks, signatures, footer "Halaman x dari y".
// The engine owner adds the wings logo as a PNG rendered from WINGS_PATH and refines the styling; keep the signature
// stable.
import type { Block, DocModel, TextRun } from './model';
import { triggerDownload, withExtension } from './download';

const CM_TWIP = 567;
const CONTRACT_TYPES = new Set(['mou', 'pks', 'uat', 'bast', 'sla']);

/** Builds the DOCX and starts the download (`.docx` is appended when missing). */
export async function exportDocx(model: DocModel, fileName: string): Promise<void> {
  const docx = await import('docx');
  const { AlignmentType, BorderStyle, Document, Footer, Header, Packer, PageNumber, Paragraph, Table, TableCell, TableRow, WidthType } = docx;

  const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED };
  const textRuns = (items: TextRun[], size = 20) => items.map((r) => new docx.TextRun({ text: r.text, bold: r.bold, italics: r.italic, size }));
  const cellParagraph = (text: string, bold = false) => new Paragraph({ children: [new docx.TextRun({ text, bold, size: 18 })] });
  const table = (rows: string[][], header: boolean) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(
        (row, r) => new TableRow({ children: row.map((cell) => new TableCell({ children: [cellParagraph(cell, header && r === 0)] })) }),
      ),
    });

  const blockChildren = (block: Block): (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] => {
    switch (block.type) {
      case 'heading':
        return [
          new Paragraph({
            alignment: ALIGN[block.align ?? 'left'],
            spacing: { before: block.level === 1 ? 0 : 200, after: 80 },
            children: [new docx.TextRun({ text: block.text, bold: true, size: block.level === 1 ? 26 : block.level === 2 ? 22 : 20 })],
          }),
        ];
      case 'paragraph':
        return [new Paragraph({ alignment: ALIGN[block.align ?? 'left'], spacing: { after: 80 }, children: textRuns(block.runs) })];
      case 'list':
        return block.items.map(
          (item, i) =>
            new Paragraph({
              indent: { left: 360, hanging: 360 },
              children: [new docx.TextRun({ text: block.ordered ? `${i + 1}.\t` : '•\t', size: 20 }), ...textRuns(item)],
            }),
        );
      case 'table':
        return [table([block.columns, ...block.rows.map((row) => block.columns.map((_, i) => row[i] ?? ''))], true)];
      case 'keyValue':
        return [table(block.rows.map((r) => [r.label, `: ${r.value}`]), false)];
      case 'spacer':
        return [new Paragraph({ spacing: { after: (block.size ?? 12) * 20 } })];
      case 'pageBreak':
        return [new Paragraph({ pageBreakBefore: true })];
      case 'meteraiBox':
        return [
          new Paragraph({
            spacing: { before: 240 },
            border: {
              top: { style: BorderStyle.DASHED, size: 6, color: '999999' },
              bottom: { style: BorderStyle.DASHED, size: 6, color: '999999' },
              left: { style: BorderStyle.DASHED, size: 6, color: '999999' },
              right: { style: BorderStyle.DASHED, size: 6, color: '999999' },
            },
            children: [new docx.TextRun({ text: 'e-Meterai', size: 16, color: '777777' })],
          }),
        ];
    }
  };

  const signatures = model.signatures.length
    ? [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: model.signatures.map(
                (slot) =>
                  new TableCell({
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new docx.TextRun({ text: slot.label, bold: true, size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new docx.TextRun({ text: slot.organization, size: 20 })] }),
                      new Paragraph({ spacing: { before: 1000 } }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new docx.TextRun({ text: slot.signer_name || '(.............................)', bold: true, underline: {}, size: 20 })],
                      }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new docx.TextRun({ text: slot.signer_title, size: 20 })] }),
                      ...(slot.signed_at
                        ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new docx.TextRun({ text: `Ditandatangani secara elektronik ${slot.signed_at}`, size: 14 })] })]
                        : []),
                    ],
                  }),
              ),
            }),
          ],
        }),
      ]
    : [];

  const { company } = model.kop;
  const contact = [company.address, company.city, company.phone, company.email, company.website].filter(Boolean).join(' · ');
  const doc = new Document({
    creator: company.name,
    title: model.meta.title,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 2 * CM_TWIP, bottom: 2 * CM_TWIP, right: 2 * CM_TWIP, left: (CONTRACT_TYPES.has(model.meta.type) ? 2.5 : 2) * CM_TWIP },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({ children: [new docx.TextRun({ text: company.name, bold: true, size: 24 })] }),
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '211FFE' } },
                children: [new docx.TextRun({ text: contact, size: 16 })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new docx.TextRun({ text: `${model.footer.text}\t`, size: 16 }),
                  new docx.TextRun({ children: ['Halaman ', PageNumber.CURRENT, ' dari ', PageNumber.TOTAL_PAGES], size: 16 }),
                ],
              }),
            ],
          }),
        },
        children: [...model.blocks.flatMap(blockChildren), ...signatures],
      },
    ],
  });
  triggerDownload(await Packer.toBlob(doc), withExtension(fileName, '.docx'));
}
