// DocContent + MergeData → DocModel (spec §6): body markup, directives, section typography, tables, e-Meterai,
// signature slots; plus the layout helpers the three renderers share (render items, column widths, file names,
// preview pagination, PDF justification workaround).
import { describe, expect, it } from 'vitest';
import { MISSING_FIELD, buildModel, defaultContent, type Block } from '../engine';
import { termAmounts } from '../engine/autoBlocks';
import { METERAI_THRESHOLD } from '../engine/buildModel';
import { pdfText } from '../engine/exportPdf';
import { columnWidths, documentFileName, listMarker, renderItems, signatureColumns, signedText } from '../engine/layout';
import { parseBody, toRuns } from '../engine/markup';
import { paginate } from '../engine/paginate';
import type { DocContent, MergeData } from '../types';
import { fullMerge, personMerge } from './engine-fixtures';

const content = (...sections: DocContent['sections']): DocContent => ({ title: 'Dokumen Uji', sections });
const build = (sections: DocContent['sections'], data: MergeData = fullMerge(), type: Parameters<typeof buildModel>[0] = 'brd') => buildModel(type, content(...sections), data);
const body = (blocks: Block[]) => blocks.slice(3); // after title, number, spacer

describe('markup', () => {
  it('splits bold and italic runs and resolves fields inside them only', () => {
    expect(toRuns('a **b** *c* d')).toEqual([{ text: 'a ' }, { text: 'b', bold: true }, { text: ' ' }, { text: 'c', italic: true }, { text: ' d' }]);
    expect(toRuns('5 * 3 * 2 dan **tebal')).toEqual([{ text: '5 * 3 * 2 dan **tebal' }]);
    expect(toRuns('**{{x}}**', (s) => s.replace('{{x}}', '*y*'))).toEqual([{ text: '*y*', bold: true }]);
  });

  it('paragraphs, line breaks, bullets and the three numbered styles', () => {
    const blocks = parseBody('Baris satu\nbaris dua\n\nParagraf tunggal\n- a\n- b\n1. satu\n2. dua\n(3) ayat\n  a. huruf\n  b. huruf\n(4) lanjut');
    expect(blocks).toEqual([
      { type: 'paragraph', runs: [{ text: 'Baris satu' }, { text: '\n' }, { text: 'baris dua' }], align: 'left' },
      { type: 'paragraph', runs: [{ text: 'Paragraf tunggal' }], align: 'justify' },
      { type: 'list', ordered: false, items: [[{ text: 'a' }], [{ text: 'b' }]] },
      { type: 'list', ordered: true, items: [[{ text: 'satu' }], [{ text: 'dua' }]] },
      { type: 'list', ordered: true, style: 'paren', start: 3, items: [[{ text: 'ayat' }]] },
      { type: 'list', ordered: true, style: 'alpha', indent: 1, items: [[{ text: 'huruf' }], [{ text: 'huruf' }]] },
      { type: 'list', ordered: true, style: 'paren', start: 4, items: [[{ text: 'lanjut' }]] },
    ]);
  });

  it('drops lines that resolve to nothing (optional fields)', () => {
    const blocks = parseBody('Nama\n{{kosong}}\nKota', (s) => (s === '{{kosong}}' ? '' : s));
    expect(blocks).toEqual([{ type: 'paragraph', runs: [{ text: 'Nama' }, { text: '\n' }, { text: 'Kota' }], align: 'left' }]);
  });

  it('directive lines become blocks; without a handler they stay text', () => {
    expect(parseBody('a\n{{#x}}\nb', (s) => s, () => [{ type: 'spacer', size: 1 }])).toEqual([
      { type: 'paragraph', runs: [{ text: 'a' }], align: 'justify' },
      { type: 'spacer', size: 1 },
      { type: 'paragraph', runs: [{ text: 'b' }], align: 'justify' },
    ]);
    expect(parseBody('{{#x}}')).toEqual([{ type: 'paragraph', runs: [{ text: '{{#x}}' }], align: 'justify' }]);
  });
});

describe('buildModel', () => {
  it('title block, resolved fields, hidden sections, unknown fields and directives', () => {
    const model = build([
      { id: 'a', title: 'Ruang lingkup', body: 'Untuk **{{client.name}}**:\n- Desain\n\n{{tidak.ada}}\n\n{{#tidak_ada}}' },
      { id: 'b', title: 'Rahasia', body: 'tidak tampil', hidden: true },
    ]);
    expect(model.meta).toEqual({ number: '007/PKS/GNB/X/2026', title: 'DOKUMEN UJI', type: 'brd', date: '2026-10-21' });
    expect(model.blocks.slice(0, 3)).toEqual([
      { type: 'heading', level: 1, text: 'DOKUMEN UJI', align: 'center' },
      { type: 'paragraph', runs: [{ text: 'Nomor: 007/PKS/GNB/X/2026' }], align: 'center' },
      { type: 'spacer', size: 10 },
    ]);
    expect(body(model.blocks)).toEqual([
      { type: 'heading', level: 2, text: 'Ruang lingkup' },
      { type: 'paragraph', runs: [{ text: 'Untuk ' }, { text: 'PT Klien Maju', bold: true }, { text: ':' }], align: 'justify' },
      { type: 'list', ordered: false, items: [[{ text: 'Desain' }]] },
      { type: 'paragraph', runs: [{ text: MISSING_FIELD }], align: 'justify' },
      { type: 'paragraph', runs: [{ text: MISSING_FIELD }] },
    ]);
    expect(model.missing).toEqual(['tidak.ada', '#tidak_ada']);
    expect(JSON.stringify(model)).not.toContain('Rahasia');
    expect(model.footer).toEqual({ text: '007/PKS/GNB/X/2026' });
    expect(model.kop.company.name).toBe('PT Garuda Nexa Bahtera');
  });

  it('Indonesian section typography: Pasal headings, part titles, page breaks before the title', () => {
    const model = build([
      { id: 'p', title: 'Pasal 4 – Nilai Perjanjian', body: 'Isi.' },
      { id: 'q', title: 'Pasal 5', body: '' },
      { id: 'l', title: 'LAMPIRAN I', body: '{{#halaman_baru}}\nIsi lampiran.' },
    ]);
    expect(body(model.blocks)).toEqual([
      { type: 'heading', level: 2, text: 'Pasal 4\nNILAI PERJANJIAN', align: 'center' },
      { type: 'paragraph', runs: [{ text: 'Isi.' }], align: 'justify' },
      { type: 'heading', level: 2, text: 'Pasal 5', align: 'center' },
      { type: 'pageBreak' },
      { type: 'heading', level: 1, text: 'LAMPIRAN I', align: 'center' },
      { type: 'paragraph', runs: [{ text: 'Isi lampiran.' }], align: 'justify' },
    ]);
  });

  it('tables: alignment of numbers, total rows, padding of short rows; header-less two-column tables become "Label : isi"', () => {
    const model = build([
      { id: 't', title: '', table: { columns: ['No', 'Uraian', 'Jumlah'], rows: [['1', 'Desain', '{{project.value_rupiah}}'], ['', '**Total**'], ['', '', '']] } },
      { id: 'k', title: '', table: { columns: ['', ''], rows: [['Nama', '**{{client.name}}**'], ['', '']] } },
    ]);
    expect(body(model.blocks)).toEqual([
      {
        type: 'table',
        columns: ['No', 'Uraian', 'Jumlah'],
        rows: [
          [[{ text: '1' }], [{ text: 'Desain' }], [{ text: 'Rp15.000.000' }]],
          [[], [{ text: 'Total', bold: true }], []],
        ],
        align: ['center', 'left', 'right'],
        total: true,
      },
      { type: 'keyValue', rows: [{ label: 'Nama', value: [{ text: 'PT Klien Maju', bold: true }] }] },
    ]);
  });

  it('auto tables report missing project data', () => {
    const empty = fullMerge({ milestones: [], project: { ...fullMerge().project, payment_terms: [] }, company: { ...fullMerge().company, bank_accounts: [{ bank: ' ', number: '', holder: '' }] }, invoice: undefined, payment: undefined });
    const model = build([{ id: 'x', title: '', body: '{{#jadwal}}\n{{#jadwal_ringkas}}\n{{#termin}}\n{{#rekening}}\n{{#rincian_invoice}}\n{{#total_invoice}}\n{{#nominal}}\n{{#ringkasan_uji}}' }], empty);
    expect(model.missing).toEqual(['milestones', 'project.payment_terms', 'company.bank_accounts', 'invoice.items', 'invoice.total', 'invoice.amount_due', 'skenario']);
  });

  it('the last payment term absorbs the rounding rest', () => {
    expect(termAmounts(10_000_001, [50, 30, 20])).toEqual([5_000_001, 3_000_000, 2_000_000]);
    expect(termAmounts(100, [33.33, 33.33, 33.34])).toEqual([33, 33, 34]);
    expect(termAmounts(1000, [50, 30])).toEqual([500, 300]); // not 100 %: no correction
  });

  it('e-Meterai: PKS/BAST/SLA from Rp5.000.000, Kuitansi above Rp5.000.000, never for other types', () => {
    const at = (value: number) => fullMerge({ project: { ...fullMerge().project, value } });
    const meterai = (type: Parameters<typeof buildModel>[0], data: MergeData) => buildModel(type, defaultContent(type, data), data).blocks.some((b) => b.type === 'meteraiBox');
    expect(METERAI_THRESHOLD).toBe(5_000_000);
    for (const type of ['pks', 'bast', 'sla'] as const) {
      expect(meterai(type, at(4_999_999)), type).toBe(false);
      expect(meterai(type, at(5_000_000)), type).toBe(true);
    }
    expect(meterai('mou', at(50_000_000))).toBe(false);
    expect(meterai('uat', at(50_000_000))).toBe(false);
    expect(meterai('invoice', at(50_000_000))).toBe(false);
    const receipt = (amount: number) => fullMerge({ payment: { ...fullMerge().payment!, amount } });
    expect(meterai('receipt', receipt(5_000_000))).toBe(false);
    expect(meterai('receipt', receipt(5_000_001))).toBe(true);
  });

  it('signature slots: signer of the current version, defaults, private clients, missing signatory', () => {
    const signed = fullMerge();
    expect(buildModel('pks', content(), signed).signatures).toEqual([
      { party: 'pihak_pertama', label: 'PIHAK PERTAMA', organization: 'PT Garuda Nexa Bahtera', signer_name: 'Budi Santoso', signer_title: 'Direktur', signed_at: '2026-10-22 09:15:00', image_ref: 'pdfile:sig:1' },
      { party: 'pihak_kedua', label: 'PIHAK KEDUA', organization: 'PT Klien Maju', signer_name: 'Sari Wulandari', signer_title: 'Manajer TI', signed_at: '2026-10-22 10:05:00', image_ref: 'pdfile:sig:2' },
    ]);
    const person = buildModel('bast', content(), personMerge({ signatures: [] })).signatures[1];
    expect(person).toEqual({ party: 'pihak_kedua', label: 'PIHAK KEDUA', organization: '', signer_name: 'Andi Pratama', signer_title: '', signed_at: null, image_ref: null });
    const unsigned = buildModel('uat', content(), fullMerge({ signatures: [], company: { ...fullMerge().company, signatory_name: '' } }));
    expect(unsigned.signatures[0].signer_name).toBe('');
    expect(unsigned.missing).toEqual(['company.signatory_name']);
    expect(buildModel('brd', content(), signed).signatures).toEqual([]);
    expect(buildModel('invoice', content(), signed).signatures).toEqual([]);
  });

  it('puts the e-Meterai box right before the signature row marker', () => {
    const model = buildModel('pks', content({ id: 'a', title: '', body: 'Isi\n\n{{#tanda_tangan}}\n\nSesudah' }), fullMerge());
    expect(body(model.blocks).map((b) => b.type)).toEqual(['paragraph', 'meteraiBox', 'signatures', 'paragraph']);
  });
});

describe('layout helpers', () => {
  it('renderItems places the signature row once, at the marker or at the end, with the e-Meterai inside it', () => {
    const data = fullMerge();
    const withMarker = renderItems(buildModel('pks', content({ id: 'a', title: '', body: 'x\n\n{{#tanda_tangan}}\n\n{{#tanda_tangan}}\n\ny' }), data));
    expect(withMarker.map((i) => (i.kind === 'block' ? i.block.type : 'SIGN'))).toEqual(['heading', 'paragraph', 'spacer', 'paragraph', 'SIGN', 'paragraph']);
    expect(withMarker.find((i) => i.kind === 'signatures')).toMatchObject({ meterai: true });
    const atEnd = renderItems(buildModel('mou', content({ id: 'a', title: '', body: 'x' }), data));
    expect(atEnd[atEnd.length - 1]).toMatchObject({ kind: 'signatures', meterai: false });
    // no slots: a meteraiBox block stays a block
    const plain = renderItems({ ...buildModel('brd', content(), data), blocks: [{ type: 'meteraiBox' }] });
    expect(plain).toEqual([{ kind: 'block', block: { type: 'meteraiBox' } }]);
  });

  it('signatureColumns: two parties around the e-Meterai; a single slot on the right', () => {
    const data = fullMerge();
    const [a, b] = buildModel('pks', content(), data).signatures;
    expect(signatureColumns([a, b], true).map((c) => c.kind)).toEqual(['slot', 'meterai', 'slot']);
    expect(signatureColumns([a, b], false).map((c) => c.kind)).toEqual(['slot', 'slot']);
    expect(signatureColumns([a], true).map((c) => c.kind)).toEqual(['empty', 'meterai', 'slot']);
    expect(signedText(a)).toBe('Ditandatangani secara elektronik pada 22 Oktober 2026 pukul 09.15 WIB');
    expect(signedText({ ...a, signed_at: null })).toBe('');
  });

  it('list markers', () => {
    const list = (style?: 'paren' | 'alpha', start?: number): Extract<Block, { type: 'list' }> => ({ type: 'list', ordered: true, items: [], style, start });
    expect(listMarker(list(), 0)).toBe('1.');
    expect(listMarker(list('paren', 3), 1)).toBe('(4)');
    expect(listMarker(list('alpha'), 2)).toBe('c.');
    expect(listMarker({ type: 'list', ordered: false, items: [] }, 0)).toBe('•');
  });

  it('columnWidths fill the width and give every column room for its longest word', () => {
    const table: Extract<Block, { type: 'table' }> = {
      type: 'table',
      columns: ['No', 'Uraian', 'Jumlah'],
      rows: [[[{ text: '1' }], [{ text: 'Pembuatan website company profile dengan panel admin dan SEO dasar' }], [{ text: 'Rp15.000.000' }]]],
    };
    const widths = columnWidths(table, 400, 5, 8);
    expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(400, 6);
    expect(widths[1]).toBeGreaterThan(widths[2]);
    expect(widths[2]).toBeGreaterThanOrEqual(12 * 5 + 8);
    // too narrow: shrink proportionally
    expect(columnWidths(table, 50, 5, 8).reduce((a, b) => a + b, 0)).toBeCloseTo(50, 6);
    // explicit relative widths
    const weighted = columnWidths({ ...table, widths: [1, 1, 8] }, 400, 5, 8);
    expect(weighted[2]).toBeGreaterThan(weighted[1]);
  });

  it('documentFileName', () => {
    expect(documentFileName('007/PKS/GNB/X/2026', '', '.pdf')).toBe('PKS-007-GNB-X-2026.pdf');
    expect(documentFileName('', '012/BAST/GNB/XII/2026', '.docx')).toBe('BAST-012-GNB-XII-2026.docx');
    expect(documentFileName('PKS-007-GNB-X-2026.pdf', '', '.pdf')).toBe('PKS-007-GNB-X-2026.pdf');
    expect(documentFileName('Invoice: DP / Klien "A"?', '', '.pdf')).toBe('Invoice- DP - Klien -A.pdf');
    expect(documentFileName('', '', '.docx')).toBe('dokumen.docx');
  });

  it('pdfText keeps punctuation with emphasis and makes words with inner breaks unbreakable', () => {
    expect(pdfText([{ text: 'Pada hari ' }, { text: 'Rabu', bold: true }, { text: ', tanggal' }])).toEqual([
      { text: 'Pada hari ', bold: undefined, italics: undefined },
      { text: 'Rabu,', bold: true, italics: undefined },
      { text: ' tanggal', bold: undefined, italics: undefined },
    ]);
    expect(pdfText([{ text: 'sebesar (' }, { text: 'lima ribu', italic: true }, { text: ').' }]).map((r) => r.text)).toEqual(['sebesar ', '(lima ribu).']);
    expect(pdfText([{ text: 'secara bersama-sama dan Layanan/Produk.' }])).toEqual([
      { text: 'secara ', bold: undefined, italics: undefined },
      { text: 'bersama-sama', bold: undefined, italics: undefined, noWrap: true },
      { text: ' dan ', bold: undefined, italics: undefined },
      { text: 'Layanan/Produk.', bold: undefined, italics: undefined, noWrap: true },
    ]);
  });
});

describe('paginate (preview)', () => {
  it('fills pages, honours page breaks and never leaves a heading at the bottom', () => {
    const pages = paginate(
      [
        { height: 300 },
        { height: 300, keepWithNext: true },
        { height: 300 },
        { height: 0, pageBreak: true },
        { height: 100 },
      ],
      800,
    );
    expect(pages).toEqual([[{ index: 0 }], [{ index: 1 }, { index: 2 }], [{ index: 4 }]]);
  });

  it('splits tables and lists by rows, at least two rows at the bottom of a page', () => {
    const table = { height: 20 + 10 * 50, head: 20, units: Array(10).fill(50) };
    expect(paginate([{ height: 600 }, table], 800)).toEqual([
      [{ index: 0 }, { index: 1, from: 0, to: 3 }],
      [{ index: 1, from: 3, to: 10 }],
    ]);
    expect(paginate([{ height: 700 }, table], 800)).toEqual([[{ index: 0 }], [{ index: 1, from: 0, to: 10 }]]);
  });

  it('an item taller than a page gets a page of its own', () => {
    expect(paginate([{ height: 100 }, { height: 2000 }, { height: 100 }], 800)).toEqual([[{ index: 0 }], [{ index: 1 }], [{ index: 2 }]]);
    expect(paginate([{ height: 100, head: 0, units: [100] }, { height: 1000, head: 0, units: [900, 100] }], 800)).toEqual([
      [{ index: 0 }],
      [{ index: 1, from: 0, to: 1 }],
      [{ index: 1, from: 1, to: 2 }],
    ]);
  });
});
