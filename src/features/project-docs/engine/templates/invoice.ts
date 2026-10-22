// Invoice / Tagihan (spec §6): nomor, tanggal, jatuh tempo, "Ditagihkan kepada", tabel item, subtotal/diskon/DPP/PPN/
// total/PPh 23/jumlah yang harus dibayar, terbilang, rekening pembayaran, keterangan termin, status pembayaran.
// Items, totals and status come from MergeData.invoice at render time (directives), never from the content.
import type { DocContent } from '../../types';
import { keyValue, lines, section, type TemplateInput } from './shared';

export function invoice({ person }: TemplateInput): DocContent {
  return {
    title: 'Invoice',
    sections: [
      section(
        'info',
        '',
        undefined,
        keyValue([
          ['Tanggal invoice', '{{invoice.issue_date_long}}'],
          ['Jatuh tempo', '**{{invoice.due_date_long}}**'],
          ['Proyek', '{{project.name}} ({{project.code}})'],
          ['Jenis tagihan', '{{invoice.term_label}}'],
        ]),
      ),
      section(
        'tagihan',
        'Ditagihkan kepada',
        person
          ? lines('**{{client.name}}**', '{{client.address}}', '{{client.city}}', '{{client.email|}}')
          : lines('**{{client.name}}**', 'Up. {{client.pic_name}} ({{client.pic_title}})', '{{client.address}}', '{{client.city}}', 'NPWP {{client.npwp|-}}'),
      ),
      section(
        'rincian',
        'Rincian tagihan',
        lines('{{#rincian_invoice}}', '', '{{#total_invoice}}', '', 'Terbilang: *{{invoice.amount_due_terbilang}}*'),
      ),
      section(
        'keterangan',
        'Keterangan',
        lines(
          'Tagihan ini merupakan pembayaran {{invoice.term_description}} untuk pekerjaan **{{project.service_name}}**.',
          '',
          '{{invoice.notes|}}',
          '',
          '{{invoice.pph23_note|}}',
        ),
      ),
      section(
        'pembayaran',
        'Cara pembayaran',
        lines(
          'Mohon melakukan pembayaran paling lambat **{{invoice.due_date_long}}** melalui transfer ke rekening berikut:',
          '',
          '{{#rekening}}',
          '',
          'Cantumkan nomor invoice **{{document.number}}** pada berita transfer dan kirimkan bukti pembayaran ke {{company.email}}. Kuitansi diterbitkan setelah pembayaran kami terima.',
        ),
      ),
      section(
        'status',
        'Status pembayaran',
        'Status: **{{invoice.payment_status_label}}** · Telah dibayar {{invoice.amount_paid_rupiah}} · Sisa tagihan {{invoice.remaining_rupiah}}',
      ),
      section(
        'penutup',
        '',
        'Invoice ini diterbitkan secara elektronik melalui platform {{company.name}} dan sah tanpa tanda tangan. Terima kasih atas kepercayaan Anda.',
      ),
    ],
  };
}
