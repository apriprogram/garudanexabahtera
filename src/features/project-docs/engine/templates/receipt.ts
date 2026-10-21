// Kuitansi / Bukti Pembayaran (spec §6): "KUITANSI" + nomor; Telah terima dari; Uang sejumlah (terbilang, italic);
// Untuk pembayaran (invoice + termin + proyek); kotak nominal; kota & tanggal + penerima (slot added by buildModel).
import type { DocContent } from '../../types';
import { keyValue, section } from './shared';

export function receipt(): DocContent {
  return {
    title: 'Kuitansi',
    sections: [
      section(
        'penerimaan',
        '',
        undefined,
        keyValue([
          ['Telah terima dari', '**{{client.name}}**'],
          ['Uang sejumlah', '*{{payment.amount_terbilang}}*'],
          [
            'Untuk pembayaran',
            '{{invoice.term_description}} atas invoice nomor {{payment.invoice_number}} untuk pekerjaan {{project.service_name}} ({{project.code}})',
          ],
          ['Tanggal pembayaran', '{{payment.paid_at_long}}'],
          ['Metode pembayaran', '{{payment.method_label}}'],
          ['Referensi', '{{payment.reference|-}}'],
        ]),
      ),
      section('nominal', '', '{{#nominal}}'),
      section(
        'catatan',
        '',
        'Kuitansi ini merupakan bukti pembayaran yang sah dan diterbitkan secara elektronik oleh {{company.name}} melalui platform dokumen proyek.',
      ),
    ],
  };
}
