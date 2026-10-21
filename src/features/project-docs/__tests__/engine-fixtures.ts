// Shared MergeData fixtures of the document engine tests: a complete data set (every field a template may use) and
// helpers to vary it.
import type { MergeData } from '../types';

/** 1×1 PNG with an alpha channel (like a drawn signature). */
export const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/**
 * 2×1 RGB PNG without alpha. pdfmake's browser build inflates transparent PNGs in a Web Worker, which browsers have
 * and Node has not, so the PDF tests in Node embed this one.
 */
export const PNG_OPAQUE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAC0lEQVR4nGNgAAMAAAcAAbKGrPQAAAAASUVORK5CYII=';

export function fullMerge(over: Partial<MergeData> = {}): MergeData {
  return {
    company: {
      name: 'PT Garuda Nexa Bahtera',
      address: 'Jl. Merdeka No. 10',
      city: 'Bandung',
      phone: '0812-0000-0000',
      email: 'halo@garudanexa.com',
      website: 'https://garudanexa.com',
      npwp: '01.234.567.8-901.000',
      signatory_name: 'Budi Santoso',
      signatory_title: 'Direktur',
      bank_accounts: [
        { bank: 'BCA', number: '1234567890', holder: 'PT Garuda Nexa Bahtera' },
        { bank: '', number: '', holder: '' },
      ],
    },
    client: {
      type: 'perusahaan',
      name: 'PT Klien Maju',
      pic_name: 'Sari Wulandari',
      pic_title: 'Manajer TI',
      email: 'sari@klien.test',
      phone: '0813-1111-2222',
      address: 'Jl. Sudirman Kav. 5',
      city: 'Jakarta Selatan',
      npwp: '02.345.678.9-012.000',
    },
    project: {
      id: 7,
      code: 'PRJ-2026-007',
      name: 'Website Company Profile',
      service_type: 'website',
      service_label: 'Website',
      description: 'Website profil perusahaan dengan katalog layanan dan formulir kontak.',
      scope_summary: 'Website 6 halaman dengan panel admin, SEO dasar, dan integrasi WhatsApp.',
      value: 15_000_000,
      value_rupiah: 'Rp15.000.000',
      value_terbilang: 'lima belas juta rupiah',
      start_date: '2026-10-21',
      end_date: '2026-11-30',
      duration_days: 41,
      payment_terms: [
        { key: 'dp', label: 'Uang muka (DP)', percent: 50, trigger: 'kontrak', due_days: 7 },
        { key: 'termin2', label: 'Termin 2', percent: 30, trigger: 'uji', due_days: 7 },
        { key: 'pelunasan', label: 'Pelunasan', percent: 20, trigger: 'serah_terima', due_days: 7 },
      ],
      has_maintenance: true,
      maintenance_fee: 750_000,
      maintenance_period: 'bulanan',
      maintenance_start: '2026-12-01',
      maintenance_end: '2027-11-30',
    },
    milestones: [
      { title: 'Analisis & desain', description: 'Wireframe dan desain UI', start_date: '2026-10-21', due_date: '2026-10-31', weight: 2, progress: 100, status: 'selesai' },
      { title: 'Pengembangan', description: '', start_date: '2026-11-01', due_date: '2026-11-20', weight: 5, progress: 40, status: 'berjalan' },
      { title: 'UAT & peluncuran', description: '', start_date: '2026-11-21', due_date: '2026-11-30', weight: 1, progress: 0, status: 'belum_mulai' },
    ],
    document: {
      number: '007/PKS/GNB/X/2026',
      type: 'pks',
      title: 'Perjanjian Kerja Sama',
      date: '2026-10-21',
      date_long: '21 Oktober 2026',
      day: 'Rabu',
      version: 2,
      status: 'disetujui',
    },
    invoice: {
      kind: 'dp',
      term_key: 'dp',
      issue_date: '2026-10-22',
      due_date: '2026-10-29',
      items: [{ description: 'Uang muka (DP) 50% pembuatan website', qty: 1, unit_price: 7_500_000 }],
      subtotal: 7_500_000,
      discount: 0,
      base: 7_500_000,
      dpp: 6_875_000,
      ppn_rate: 12,
      ppn_amount: 825_000,
      total: 8_325_000,
      pph23_rate: 2,
      pph23_amount: 150_000,
      amount_due: 8_175_000,
      amount_paid: 0,
      payment_status: 'belum_dibayar',
      notes: 'Pembayaran pertama.',
    },
    payment: {
      amount: 8_175_000,
      amount_terbilang: 'delapan juta seratus tujuh puluh lima ribu rupiah',
      paid_at: '2026-10-25',
      method: 'transfer',
      reference: 'TRF-0001',
      invoice_number: '001/INV/GNB/X/2026',
    },
    signatures: [
      { party: 'pihak_pertama', signer_name: 'Budi Santoso', signer_title: 'Direktur', signed_at: '2026-10-22 09:15:00', image_url: 'pdfile:sig:1' },
      { party: 'pihak_kedua', signer_name: 'Sari Wulandari', signer_title: 'Manajer TI', signed_at: '2026-10-22 10:05:00', image_url: 'pdfile:sig:2' },
    ],
    ...over,
  };
}

/** The same data for a private client (perorangan). */
export function personMerge(over: Partial<MergeData> = {}): MergeData {
  const base = fullMerge();
  return fullMerge({
    client: { ...base.client, type: 'perorangan', name: 'Andi Pratama', pic_name: '', pic_title: '', npwp: '' },
    ...over,
  });
}
