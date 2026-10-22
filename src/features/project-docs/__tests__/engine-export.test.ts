// @vitest-environment node
// PDF (pdfmake) and DOCX (docx) export of the document engine: real files are generated in Node; only the browser
// download is replaced. Checks the file signatures, the download names, the kop/footer/signature structure and
// that every document type exports.
import { describe, expect, it, vi } from 'vitest';
import { WINGS_PATH } from '../../../components/ui/LogoMark';
import { DOC_TYPES, buildModel, defaultContent, exportDocx, exportPdf, type DocModel } from '../engine';
import { imageSize, loadImage } from '../engine/assets';
import { renderDocx } from '../engine/exportDocx';
import { pdfDefinition, renderPdf } from '../engine/exportPdf';
import type { DocType } from '../types';
import { PNG_1X1, PNG_OPAQUE, fullMerge } from './engine-fixtures';

const downloads = vi.hoisted(() => [] as { blob: Blob; name: string }[]);
vi.mock('../engine/download', () => ({
  triggerDownload: (blob: Blob, name: string) => {
    downloads.push({ blob, name });
  },
}));

const bytes = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());
const ascii = (data: Uint8Array) => new TextDecoder('latin1').decode(data);

/** Minimal ZIP reader (central directory + raw deflate) → file name → text content. */
async function unzip(data: Uint8Array): Promise<Map<string, string>> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let eocd = data.length - 22;
  while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd -= 1;
  if (eocd < 0) throw new Error('no zip');
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const files = new Map<string, string>();
  for (let i = 0; i < count; i += 1) {
    const method = view.getUint16(offset + 10, true);
    const size = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(data.subarray(offset + 46, offset + 46 + nameLength));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const packed = data.slice(start, start + size);
    const raw = method === 0 ? packed : new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    files.set(name, new TextDecoder().decode(raw));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

/** PKS with both parties signed; the signature images are given as data URLs like the UI does after downloading. */
function pksModel(image = PNG_OPAQUE): DocModel {
  const data = fullMerge();
  const model = buildModel('pks', defaultContent('pks', data), data);
  model.signatures.forEach((slot) => {
    slot.image_src = image;
  });
  return model;
}

const media = (files: Map<string, string>) => [...files.keys()].filter((name) => /^word\/media\/.+\.png$/.test(name));
const count = (text: string, part: string) => text.split(part).length - 1;

describe('exportPdf', () => {
  it('produces a PDF named after the document number', async () => {
    downloads.length = 0;
    await exportPdf(pksModel(), '007/PKS/GNB/X/2026');
    expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toBe('PKS-007-GNB-X-2026.pdf');
    const data = await bytes(downloads[0].blob);
    expect(ascii(data.subarray(0, 5))).toBe('%PDF-');
    expect(ascii(data.subarray(data.length - 32))).toContain('%%EOF');
    expect(data.length).toBeGreaterThan(20_000);
  }, 60_000);

  it('builds the kop, the footer, the signature row with images and the e-Meterai box', () => {
    const model = pksModel();
    const images = new Map(model.signatures.map((slot) => [slot, PNG_1X1]));
    const def = pdfDefinition(model, images);
    expect(def.pageSize).toBe('A4');
    const header = (def.header as () => unknown)();
    expect(JSON.stringify(header)).toContain(WINGS_PATH);
    expect(JSON.stringify(header)).toContain('#211FFE');
    expect(JSON.stringify(header)).toContain('PT Garuda Nexa Bahtera');
    const footer = (def.footer as (page: number, pages: number) => unknown)(2, 5);
    expect(JSON.stringify(footer)).toContain('Halaman 2 dari 5');
    expect(JSON.stringify(footer)).toContain('007/PKS/GNB/X/2026');
    // contracts: 2.5 cm binding margin on the left
    expect((def.pageMargins as number[])[0]).toBeCloseTo(70.87, 1);
    const content = JSON.stringify(def.content);
    expect(content).toContain(PNG_1X1);
    expect(content).toContain('e-Meterai');
    expect(content).toContain('Ditandatangani secara elektronik pada 22 Oktober 2026 pukul 09.15 WIB');
    // the SOW appendix starts on a new page, after the signatures
    expect(content.indexOf('"pageBreak":"before"')).toBeGreaterThan(content.indexOf('e-Meterai'));
  });

  it('exports every document type', async () => {
    const data = fullMerge();
    for (const type of Object.keys(DOC_TYPES) as DocType[]) {
      const blob = await renderPdf(buildModel(type, defaultContent(type, data), data));
      expect(ascii((await bytes(blob)).subarray(0, 5)), type).toBe('%PDF-');
    }
  }, 120_000);
});

describe('exportDocx', () => {
  it('produces a valid DOCX named after the document number', async () => {
    downloads.length = 0;
    await exportDocx(pksModel(PNG_1X1), '');
    expect(downloads[0].name).toBe('PKS-007-GNB-X-2026.docx');
    const data = await bytes(downloads[0].blob);
    expect(ascii(data.subarray(0, 4))).toBe('PK\u0003\u0004');
    const files = await unzip(data);
    expect([...files.keys()]).toEqual(expect.arrayContaining(['[Content_Types].xml', 'word/document.xml']));
    const document = files.get('word/document.xml') ?? '';
    expect(document).toContain('PERJANJIAN KERJA SAMA PEMBUATAN WEBSITE');
    expect(document).toContain('Pasal 1');
    expect(document).toContain('e-Meterai');
    expect(document).toContain('w:pageBreakBefore');
    // two signature images (the same PNG is stored once); no canvas in Node → no logo
    expect(count(document, '<pic:pic')).toBe(2);
    expect(media(files)).toHaveLength(1);
    const footer = [...files.entries()].find(([name]) => /word\/footer\d*\.xml/.test(name))?.[1] ?? '';
    expect(footer).toContain('Halaman');
    expect(footer).toMatch(/PAGE/);
    expect(footer).toMatch(/NUMPAGES/);
    expect(footer).toContain('007/PKS/GNB/X/2026');
  }, 60_000);

  it('puts the wings logo PNG in the kop of every page', async () => {
    const logo = await loadImage(PNG_1X1);
    expect(logo).not.toBeNull();
    const files = await unzip(await bytes(await renderDocx(pksModel(), { logo, signatures: new Map() })));
    const header = [...files.entries()].find(([name]) => /word\/header\d*\.xml/.test(name))?.[1] ?? '';
    expect(header).toContain('PT Garuda Nexa Bahtera');
    expect(header).toContain('211FFE');
    expect(count(header, '<pic:pic')).toBe(1);
    expect(count(files.get('word/document.xml') ?? '', '<pic:pic')).toBe(0);
    expect(media(files)).toHaveLength(1);
  }, 60_000);

  it('exports every document type', async () => {
    const data = fullMerge();
    for (const type of Object.keys(DOC_TYPES) as DocType[]) {
      const blob = await renderDocx(buildModel(type, defaultContent(type, data), data), { logo: null });
      expect(ascii((await bytes(blob)).subarray(0, 2)), type).toBe('PK');
    }
  }, 120_000);
});

describe('assets', () => {
  it('reads PNG sizes and rejects other data', async () => {
    const png = await loadImage(PNG_1X1);
    expect(png).toMatchObject({ type: 'png', width: 1, height: 1 });
    expect(await loadImage('data:image/png;base64,AAAA')).toBeNull();
    expect(await loadImage(undefined)).toBeNull();
    expect(imageSize(new Uint8Array([1, 2, 3]))).toBeNull();
    // smallest JPEG header with a SOF0 segment: 2 × 3 pixels
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x03, 0x00, 0x02, 0x03, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(imageSize(jpeg)).toEqual({ type: 'jpg', width: 2, height: 3 });
  });
});
