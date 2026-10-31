// @vitest-environment node
// Dokumen menu Generate (src/pages/admin/generate/docModel.ts): invoice & proposal berkop PT Garuda Nexa Bahtera
// sebagai DocModel, isi tabel/total/terbilang, dan PDF sungguhan dari pdfmake (hanya unduhan browser yang diganti).
// Jalankan: npx vitest run src/pages/admin/__tests__/generateDocModel.test.ts
import { describe, expect, it, vi } from 'vitest';
import { exportPdf } from '../../../features/project-docs/engine';
import { buildInvoiceDoc, buildProposalDoc, pdfFileName } from '../generate/docModel';
import { calcTotals, draftItems, emptyInvoiceForm, invoiceFromForm, mergeVoiceIntoInvoice, type Invoice, type Proposal } from '../generate/types';

const downloads = vi.hoisted(() => [] as { blob: Blob; name: string }[]);
vi.mock('../../../features/project-docs/engine/download', () => ({
  triggerDownload: (blob: Blob, name: string) => {
    downloads.push({ blob, name });
  },
}));

const items = [
  { description: 'Pembuatan website company profile', qty: 1, unit: 'paket', price: 5000000, subtotal: 5000000 },
  { description: 'Hosting', qty: 1.5, unit: 'tahun', price: 333333, subtotal: 500000 },
];

const invoice: Invoice = {
  id: 1,
  number: 'INV-202611-001',
  date: '2026-11-01',
  due_date: '2026-11-15',
  client_name: 'Budi Santoso',
  client_company: 'PT Maju Jaya',
  client_email: 'budi@majujaya.co.id',
  client_phone: '081234567890',
  client_address: 'Jl. Merdeka 10, Bandung',
  items,
  discount_type: 'percent',
  discount_value: 12.5,
  tax_enabled: true,
  tax_rate: 11,
  ...calcTotals(items, 'percent', 12.5, true, 11),
  notes: 'Terima kasih atas kepercayaannya.',
  payment_info: '',
  status: 'terkirim',
  created_at: '2026-11-01 10:00:00',
  updated_at: '2026-11-01 10:00:00',
};

const proposal: Proposal = {
  id: 2,
  number: 'PRP-202611-001',
  date: '2026-11-01',
  valid_until: '2026-12-01',
  client_name: 'Ibu Sari',
  client_company: 'SMA Harapan Bangsa',
  client_email: '',
  client_phone: '',
  client_address: '',
  title: 'Website Sekolah & PPDB Online',
  summary: 'Sekolah butuh website.\n\nUntuk informasi dan pendaftaran.',
  scope: ['Profil sekolah', 'Berita'],
  timeline: [{ phase: 'Desain', duration: '2 minggu', description: '' }],
  items,
  tax_enabled: false,
  tax_rate: 11,
  subtotal: 5500000,
  tax_amount: 0,
  total: 5500000,
  terms: '1. Pembayaran 50% di muka.\n- Revisi minor gratis.',
  status: 'draft',
  created_at: '',
  updated_at: '',
};

const company = { name: 'PT Garuda Nexa Bahtera', city: 'Bandung', signatory_name: 'Apri', bank_accounts: [{ bank: 'BCA', number: '123', holder: 'PT Garuda Nexa Bahtera' }] };

describe('dokumen Generate', { timeout: 30_000 }, () => {
  it('invoice: kop, item, diskon %, PPN, total, terbilang, rekening dari Pengaturan dokumen, tanda tangan', () => {
    const model = buildInvoiceDoc(invoice, company);
    const content = JSON.stringify(model.blocks);
    expect(model.kop.company.name).toBe('PT Garuda Nexa Bahtera');
    expect(model.meta).toMatchObject({ number: 'INV-202611-001', title: 'INVOICE', type: 'invoice' });
    expect(content).toContain('PT Maju Jaya');
    expect(content).toContain('1,5 tahun');
    expect(content).toContain('Diskon (12,5%)');
    expect(content).toContain('-Rp687.500');
    expect(content).toContain('PPN 11%');
    expect(content).toContain('Rp5.341.875');
    expect(content).toContain('BCA 123 a.n. PT Garuda Nexa Bahtera');
    expect(content).toMatch(/lima juta tiga ratus empat puluh satu ribu delapan ratus tujuh puluh lima rupiah/i);
    expect(model.signatures[0]).toMatchObject({ label: 'Hormat kami,', signer_name: 'Apri', caption: 'Bandung, 1 November 2026' });
  });

  it('proposal: bagian bernomor, daftar ruang lingkup & syarat, tabel tahapan, tanpa PPN', () => {
    const content = JSON.stringify(buildProposalDoc(proposal, null).blocks);
    expect(content).toContain('PROPOSAL PENAWARAN');
    expect(content).toContain('1. Latar Belakang');
    expect(content).toContain('2. Ruang Lingkup Pekerjaan');
    expect(content).toContain('3. Tahapan & Jadwal');
    expect(content).toContain('4. Rincian Biaya');
    expect(content).toContain('5. Syarat & Ketentuan');
    expect(content).toContain('"Pembayaran 50% di muka."');
    expect(content).not.toContain('PPN');
    expect(content).toContain('Penawaran berlaku sampai 1 Desember 2026');
  });

  it('form → pratinjau memakai hitungan yang sama, suara mengganti baris kosong', () => {
    const form = mergeVoiceIntoInvoice(emptyInvoiceForm('2026-11-01'), {
      client_name: 'Budi',
      items: [{ description: 'Website', qty: 1, unit: 'paket', price: 1500000 }],
      tax_enabled: true,
    });
    expect(form.items).toEqual([{ description: 'Website', qty: '1', unit: 'paket', price: '1500000' }]);
    expect(draftItems([{ description: 'A', qty: '1,5', unit: '', price: '1.000.000' }])[0].subtotal).toBe(1500000);
    expect(invoiceFromForm(form, 'INV-202611-002')).toMatchObject({ subtotal: 1500000, tax_amount: 165000, total: 1665000 });
  });

  it('PDF sungguhan dengan nama Invoice-/Proposal-<nomor>.pdf', async () => {
    await exportPdf(buildInvoiceDoc(invoice, company), pdfFileName('invoice', invoice.number));
    await exportPdf(buildProposalDoc(proposal, company), pdfFileName('proposal', proposal.number));
    expect(downloads.map((d) => d.name)).toEqual(['Invoice-INV-202611-001.pdf', 'Proposal-PRP-202611-001.pdf']);
    for (const { blob } of downloads) {
      const data = new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer()));
      expect(data.startsWith('%PDF-')).toBe(true);
    }
  });
});
