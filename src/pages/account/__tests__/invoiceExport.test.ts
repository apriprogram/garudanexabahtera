// @vitest-environment node
// Nota sebagai PDF sungguhan (pdfmake di Node, hanya unduhan browser yang diganti): file PDF valid, nama file
// "Nota-INV-….pdf", dan isi definisi (kop, judul, rincian, footer nomor nota) untuk nota pembelian dan perpanjangan.
// Jalankan: npx vitest run src/pages/account/__tests__/invoiceExport.test.ts
import { describe, expect, it, vi } from 'vitest';
import { exportPdf } from '../../../features/project-docs/engine';
import { pdfDefinition } from '../../../features/project-docs/engine/exportPdf';
import { buildInvoiceModel, invoiceFileName } from '../components/invoiceModel';
import { company, makeOrder, makeRenewal } from './invoiceFixtures';

const downloads = vi.hoisted(() => [] as { blob: Blob; name: string }[]);
vi.mock('../../../features/project-docs/engine/download', () => ({
  triggerDownload: (blob: Blob, name: string) => {
    downloads.push({ blob, name });
  },
}));

const ascii = async (blob: Blob) => new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer()));

// pdfmake + font dimuat saat ekspor pertama; di mesin yang sibuk bisa melewati batas 5 detik bawaan
describe('PDF nota', { timeout: 30_000 }, () => {
  it('nota pembelian dan perpanjangan menjadi PDF dengan nama Nota-<nomor>.pdf', async () => {
    const purchase = buildInvoiceModel({ order: makeOrder(), renewal: null, company });
    const renewal = buildInvoiceModel({ order: makeOrder(), renewal: makeRenewal(), company });

    await exportPdf(purchase, invoiceFileName(purchase.meta.number));
    await exportPdf(renewal, invoiceFileName(renewal.meta.number));

    expect(downloads.map((d) => d.name)).toEqual(['Nota-INV-GN-20261023-DCZ03O.pdf', 'Nota-INV-GNR-20271001-AB12CD.pdf']);
    for (const { blob } of downloads) {
      const data = await ascii(blob);
      expect(data.startsWith('%PDF-')).toBe(true);
      expect(data.trimEnd().endsWith('%%EOF')).toBe(true);
    }
  });

  it('definisi PDF: kop perusahaan, judul, tabel rincian, footer nomor nota, tanpa slot tanda tangan', () => {
    const model = buildInvoiceModel({ order: makeOrder(), renewal: null, company });
    const def = pdfDefinition(model);
    const content = JSON.stringify(def.content);
    expect(def.info).toMatchObject({ title: 'NOTA PEMBELIAN', subject: 'INV-GN-20261023-DCZ03O', author: 'PT Garuda Nexa Bahtera' });
    expect(content).toContain('NOTA PEMBELIAN');
    expect(content).toContain('Diskon pembelian pertama');
    expect(content).toContain('-Rp150.000');
    expect(content).toContain('Domain sarimakmur.com (1 tahun)');
    expect(content).not.toContain('PIHAK PERTAMA');
    const header = JSON.stringify((def.header as (page: number, pages: number) => unknown)(1, 1));
    expect(header).toContain('PT Garuda Nexa Bahtera');
    const footer = JSON.stringify((def.footer as (page: number, pages: number) => unknown)(1, 1));
    expect(footer).toContain('INV-GN-20261023-DCZ03O');
    expect(footer).toContain('Halaman 1 dari 1');
  });
});
