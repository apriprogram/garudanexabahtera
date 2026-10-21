// SLA – Perjanjian Pemeliharaan & Dukungan (spec §6): para pihak, layanan yang dicakup, jam layanan, tabel prioritas
// (respons/penyelesaian), target uptime, pengecualian, biaya & periode, pelaporan & eskalasi, kompensasi, jangka
// waktu, tanda tangan + e-Meterai. Support hours, uptime and priorities come from settings `pd_sla_defaults`.
import type { DocContent } from '../../types';
import { E_SIGN_CLAUSE, OPENING, SLA_DEFAULTS, lines, paraPihak, section, type TemplateInput } from './shared';

/** Typical condition per priority level (P1, P2, P3). */
const CONDITION: Record<string, string> = {
  '1': 'Layanan tidak dapat diakses sama sekali, data hilang, atau terdapat celah keamanan aktif',
  '2': 'Fitur utama tidak berfungsi dan belum ada solusi sementara',
  '3': 'Gangguan minor, kesalahan tampilan, atau permintaan bantuan penggunaan',
};

export function sla({ service, person, options }: TemplateInput): DocContent {
  const defaults = options.sla_defaults ?? SLA_DEFAULTS;
  const priorities = defaults.priorities?.length ? defaults.priorities : SLA_DEFAULTS.priorities;
  return {
    title: 'Perjanjian Tingkat Layanan (Service Level Agreement)\nPemeliharaan dan Dukungan {{project.service_label}}',
    sections: [
      section('pembukaan', '', OPENING),
      section('para_pihak', '', paraPihak(person)),
      section(
        'pertimbangan',
        '',
        lines(
          'PARA PIHAK terlebih dahulu menerangkan hal-hal sebagai berikut:',
          'a. bahwa PIHAK PERTAMA telah menyelesaikan pembuatan **{{project.service_name}}** untuk PIHAK KEDUA berdasarkan Perjanjian Kerja Sama dan telah diserahterimakan;',
          'b. bahwa PIHAK KEDUA memerlukan layanan pemeliharaan dan dukungan teknis agar {{project.service_label}} tersebut tetap berfungsi dengan baik, aman, dan andal.',
          '',
          'Berdasarkan hal-hal tersebut, PARA PIHAK sepakat membuat Perjanjian Tingkat Layanan ini (selanjutnya disebut **SLA**) dengan ketentuan sebagai berikut:',
        ),
      ),
      section(
        'pasal_1',
        'Pasal 1 – Definisi',
        lines(
          '1. **Layanan** adalah pemeliharaan dan dukungan teknis atas {{project.service_name}} sebagaimana diatur dalam Pasal 2.',
          '2. **Insiden** adalah gangguan yang menyebabkan {{project.service_label}} tidak berfungsi sebagaimana mestinya.',
          '3. **Waktu Respons** adalah jangka waktu sejak laporan Insiden diterima melalui saluran resmi sampai PIHAK PERTAMA memberikan tanggapan awal dan mulai menangani.',
          '4. **Waktu Penyelesaian** adalah jangka waktu sejak laporan Insiden diterima sampai Insiden diselesaikan atau tersedia solusi sementara (workaround).',
          '5. **Jam Layanan** adalah waktu operasional dukungan sebagaimana diatur dalam Pasal 3.',
          '6. **Uptime** adalah persentase waktu {{project.service_label}} dapat diakses dalam satu bulan kalender, di luar Pemeliharaan Terjadwal.',
          '7. **Pemeliharaan Terjadwal** adalah pemeliharaan yang diberitahukan kepada PIHAK KEDUA paling lambat 2 x 24 jam sebelumnya.',
        ),
      ),
      section(
        'pasal_2',
        'Pasal 2 – Layanan yang Dicakup',
        lines(
          'Layanan meliputi:',
          'a. perbaikan kesalahan (bug) pada fitur yang telah diserahterimakan;',
          'b. pembaruan keamanan, pustaka, dan komponen sistem secara berkala;',
          'c. pemantauan ketersediaan (uptime) dan kinerja;',
          'd. pencadangan (backup) data secara berkala dan pemulihan bila diperlukan;',
          'e. pembaruan konten ringan atas permintaan PIHAK KEDUA paling banyak 4 (empat) jam kerja per bulan;',
          service === 'mobile_app'
            ? 'f. konsultasi teknis terkait penggunaan dan pengembangan {{project.service_label}};\ng. penyesuaian aplikasi terhadap pembaruan wajib sistem operasi Android/iOS dan kebijakan toko aplikasi.'
            : 'f. konsultasi teknis terkait penggunaan dan pengembangan {{project.service_label}}.',
        ),
      ),
      section(
        'pasal_3',
        'Pasal 3 – Jam Layanan dan Saluran Dukungan',
        lines(
          `(1) Jam Layanan adalah **${defaults.support_hours || SLA_DEFAULTS.support_hours}**, kecuali hari libur nasional.`,
          '(2) Laporan Insiden disampaikan melalui portal klien, email {{company.email}}, atau telepon/WhatsApp {{company.phone}}.',
          '(3) Insiden berprioritas kritis dapat dilaporkan di luar Jam Layanan melalui telepon/WhatsApp dan ditangani sesuai Waktu Respons pada Pasal 4.',
        ),
      ),
      section(
        'pasal_4',
        'Pasal 4 – Tingkat Prioritas dan Waktu Penanganan',
        'Setiap laporan Insiden diklasifikasikan oleh PIHAK PERTAMA berdasarkan dampaknya, dengan target waktu penanganan sebagai berikut (dihitung dalam Jam Layanan, kecuali prioritas kritis):',
        {
          columns: ['Prioritas', 'Kondisi', 'Waktu respons', 'Waktu penyelesaian'],
          rows: priorities.map((p, i) => [`**${p.level}**`, CONDITION[/P\s*(\d)/i.exec(p.level)?.[1] ?? String(i + 1)] ?? '-', p.response, p.resolution]),
        },
      ),
      section(
        'pasal_5',
        'Pasal 5 – Target Ketersediaan Layanan',
        lines(
          `(1) PIHAK PERTAMA menargetkan Uptime sebesar **${defaults.uptime || SLA_DEFAULTS.uptime}** per bulan kalender.`,
          '(2) Perhitungan Uptime tidak mencakup Pemeliharaan Terjadwal dan pengecualian sebagaimana dimaksud dalam Pasal 6.',
          '(3) Apabila hosting/server dikelola oleh penyedia yang dipilih PIHAK KEDUA, target Uptime mengikuti jaminan layanan penyedia tersebut.',
        ),
      ),
      section(
        'pasal_6',
        'Pasal 6 – Pengecualian',
        lines(
          'Layanan dalam SLA ini tidak mencakup:',
          'a. pengembangan fitur baru atau perubahan alur bisnis, yang ditawarkan secara terpisah;',
          'b. gangguan akibat perubahan kode, konfigurasi, atau akses oleh pihak selain PIHAK PERTAMA;',
          'c. gangguan pada layanan pihak ketiga, antara lain penyedia hosting, domain, payment gateway, dan API eksternal;',
          'd. kerusakan akibat penyalahgunaan, serangan siber di luar kendali yang wajar, atau keadaan memaksa;',
          'e. pembuatan konten dan pemasukan data dalam jumlah besar.',
        ),
      ),
      section(
        'pasal_7',
        'Pasal 7 – Biaya dan Pembayaran',
        lines(
          '(1) Biaya Layanan adalah sebesar **{{project.maintenance_fee_rupiah}}** (*{{project.maintenance_fee_terbilang}}*) per {{project.maintenance_period_unit}}.',
          '(2) Biaya Layanan dibayarkan di muka pada awal setiap periode berdasarkan invoice yang diterbitkan PIHAK PERTAMA, paling lambat 7 (tujuh) hari kalender sejak invoice diterbitkan, melalui transfer ke rekening PIHAK PERTAMA.',
          '(3) Biaya Layanan belum termasuk pajak yang berlaku dan biaya pihak ketiga (hosting, domain, lisensi), kecuali disepakati lain.',
          '(4) Apabila pembayaran terlambat lebih dari 14 (empat belas) hari kalender, PIHAK PERTAMA berhak menangguhkan Layanan sampai pembayaran diterima.',
        ),
      ),
      section(
        'pasal_8',
        'Pasal 8 – Pelaporan dan Eskalasi',
        lines(
          '(1) PIHAK PERTAMA menyampaikan laporan bulanan yang memuat ringkasan Uptime, Insiden beserta penanganannya, pembaruan yang dilakukan, dan rekomendasi.',
          '(2) Apabila penanganan Insiden melewati target Waktu Penyelesaian, PIHAK KEDUA dapat melakukan eskalasi secara berjenjang kepada:',
          '  a. tingkat 1: tim dukungan teknis PIHAK PERTAMA;',
          '  b. tingkat 2: penanggung jawab proyek PIHAK PERTAMA;',
          '  c. tingkat 3: {{company.signatory_title}} PIHAK PERTAMA, {{company.signatory_name}}.',
        ),
      ),
      section(
        'pasal_9',
        'Pasal 9 – Kompensasi',
        lines(
          '(1) Apabila Uptime bulanan berada di bawah target pada Pasal 5 karena sebab yang menjadi tanggung jawab PIHAK PERTAMA, PIHAK KEDUA berhak atas potongan Biaya Layanan periode berikutnya sebagai berikut:',
          '  a. sampai dengan 1% di bawah target: potongan 5% (lima persen);',
          '  b. lebih dari 1% sampai dengan 3% di bawah target: potongan 10% (sepuluh persen);',
          '  c. lebih dari 3% di bawah target: potongan 25% (dua puluh lima persen).',
          '(2) Total kompensasi dalam satu periode paling banyak 25% (dua puluh lima persen) dari Biaya Layanan periode tersebut dan merupakan satu-satunya bentuk ganti rugi atas tidak tercapainya target Uptime.',
          '(3) Permohonan kompensasi diajukan paling lambat 14 (empat belas) hari kalender setelah laporan bulanan diterima.',
        ),
      ),
      section(
        'pasal_10',
        'Pasal 10 – Jangka Waktu',
        lines(
          '(1) SLA ini berlaku sejak tanggal {{project.maintenance_start_long}} sampai dengan tanggal {{project.maintenance_end_long}}.',
          '(2) SLA ini dapat diperpanjang atas kesepakatan tertulis PARA PIHAK paling lambat 30 (tiga puluh) hari kalender sebelum jangka waktu berakhir.',
          '(3) Masing-masing PIHAK dapat mengakhiri SLA ini dengan pemberitahuan tertulis paling lambat 30 (tiga puluh) hari kalender sebelumnya; Biaya Layanan yang telah dibayarkan untuk periode berjalan tidak dapat dikembalikan.',
        ),
      ),
      section(
        'pasal_11',
        'Pasal 11 – Penutup',
        lines(
          '(1) Hal-hal yang belum diatur dalam SLA ini mengikuti ketentuan Perjanjian Kerja Sama antara PARA PIHAK, termasuk ketentuan kerahasiaan, keadaan memaksa, dan penyelesaian perselisihan.',
          `(2) SLA ini ${E_SIGN_CLAUSE}.`,
          '(3) Bea meterai atas SLA ini dipenuhi sesuai Undang-Undang Nomor 10 Tahun 2020 tentang Bea Meterai.',
        ),
      ),
    ],
  };
}
