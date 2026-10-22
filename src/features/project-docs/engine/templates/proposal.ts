// Proposal & Penawaran Harga (spec §6): surat pengantar, ringkasan, pemahaman kebutuhan, solusi, ruang lingkup &
// deliverable, jadwal ringkas (milestones), rincian biaya (tabel), termin pembayaran (payment_terms), masa berlaku
// 30 hari, syarat & ketentuan, penutup.
import type { DocContent } from '../../types';
import { DELIVERABLES, SOLUTION } from './catalog';
import { lines, section, type TemplateInput } from './shared';

export function proposal({ service, person }: TemplateInput): DocContent {
  return {
    title: 'Proposal Proyek dan Penawaran Harga',
    sections: [
      section(
        'pengantar',
        '',
        lines(
          person
            ? lines('Kepada Yth.', '**{{client.name}}**', '{{client.address}}', '{{client.city}}')
            : lines('Kepada Yth.', '**{{client.pic_name}}**', '{{client.pic_title}}', '**{{client.name}}**', '{{client.address}}', '{{client.city}}'),
          '',
          'Perihal: **Proposal dan Penawaran Harga {{project.service_name}}**',
          '',
          'Dengan hormat,',
          '',
          'Terima kasih atas kepercayaan {{client.name}} kepada {{company.name}}. Bersama ini kami sampaikan proposal dan penawaran harga untuk pembuatan **{{project.service_name}}** dengan rincian sebagai berikut.',
        ),
      ),
      section(
        'ringkasan',
        '1. Ringkasan',
        '{{company.name}} menawarkan jasa pembuatan **{{project.service_name}}** dengan nilai investasi sebesar **{{project.value_rupiah}}** (*{{project.value_terbilang}}*) dan perkiraan waktu pengerjaan {{project.duration_text}} sejak Perjanjian Kerja Sama ditandatangani dan uang muka diterima.',
      ),
      section(
        'pemahaman',
        '2. Pemahaman kebutuhan',
        lines(
          'Berdasarkan diskusi dan Dokumen Kebutuhan Bisnis, kami memahami bahwa {{client.name}} membutuhkan:',
          '',
          '{{project.description}}',
          '',
          'Kebutuhan tersebut menjadi dasar solusi dan ruang lingkup yang kami tawarkan.',
        ),
      ),
      section('solusi', '3. Solusi yang ditawarkan', lines('Pendekatan yang kami tawarkan:', ...SOLUTION[service].map((s) => `- ${s}`))),
      section(
        'lingkup',
        '4. Ruang lingkup dan deliverable',
        lines('**Ruang lingkup:**', '{{project.scope_summary}}', '', '**Deliverable:**', ...DELIVERABLES[service].map((d) => `- ${d}`)),
      ),
      section(
        'jadwal',
        '5. Jadwal pengerjaan',
        lines(
          'Perkiraan waktu pengerjaan {{project.duration_text}} dengan tahapan sebagai berikut:',
          '',
          '{{#jadwal_ringkas}}',
          '',
          'Jadwal rinci disepakati dalam dokumen Jadwal dan Tahapan Pengerjaan setelah Perjanjian Kerja Sama ditandatangani.',
        ),
      ),
      section(
        'biaya',
        '6. Rincian biaya',
        'Rincian investasi pekerjaan sebagai berikut. Harga belum termasuk pajak yang berlaku (bila ada) serta biaya domain, hosting, dan layanan pihak ketiga, kecuali disebutkan dalam tabel.',
        {
          columns: ['No', 'Uraian pekerjaan', 'Volume', 'Jumlah'],
          rows: [
            ['1', 'Pembuatan {{project.service_name}} sesuai ruang lingkup di atas', '1 paket', '{{project.value_rupiah}}'],
            ['', '**Total**', '', '**{{project.value_rupiah}}**'],
          ],
        },
      ),
      section(
        'termin',
        '7. Termin pembayaran',
        lines(
          'Pembayaran dilakukan secara bertahap sebagai berikut:',
          '',
          '{{#termin}}',
          '',
          'Setiap tagihan diterbitkan dalam bentuk invoice dan dibayarkan melalui transfer ke rekening resmi {{company.name}}. Kuitansi diterbitkan untuk setiap pembayaran yang diterima.',
        ),
      ),
      section(
        'masa_berlaku',
        '8. Masa berlaku penawaran',
        'Penawaran ini berlaku selama 30 (tiga puluh) hari kalender sejak tanggal {{document.date_long}}, yaitu sampai dengan **{{document.valid_until_long}}**. Setelah tanggal tersebut, harga dan jadwal dapat ditinjau kembali.',
      ),
      section(
        'syarat',
        '9. Syarat dan ketentuan',
        lines(
          '1. Pekerjaan dimulai setelah Perjanjian Kerja Sama ditandatangani dan uang muka diterima.',
          '2. Materi dan konten disediakan klien sesuai jadwal; keterlambatan materi dapat menggeser jadwal.',
          '3. Revisi desain paling banyak 2 (dua) kali per tahapan; revisi di luar itu atau penambahan fitur dihitung sebagai pekerjaan tambahan.',
          '4. Garansi perbaikan kesalahan (bug) selama 90 (sembilan puluh) hari kalender sejak Berita Acara Serah Terima.',
          '5. Hak atas kode sumber dan hasil pekerjaan beralih kepada klien setelah seluruh pembayaran dilunasi.',
          '6. Pajak dikenakan sesuai ketentuan peraturan perundang-undangan yang berlaku.',
        ),
      ),
      section(
        'penutup',
        '10. Penutup',
        lines(
          'Demikian proposal dan penawaran harga ini kami sampaikan. Kami terbuka untuk mendiskusikan penyesuaian ruang lingkup maupun anggaran sesuai kebutuhan {{client.name}}. Persetujuan atas penawaran ini dapat diberikan secara elektronik melalui portal klien {{company.name}}.',
          '',
          'Hormat kami,',
          '**{{company.name}}**',
          '',
          '**{{company.signatory_name}}**',
          '{{company.signatory_title}}',
          'Email {{company.email}} · Telepon {{company.phone}}',
        ),
      ),
    ],
  };
}
