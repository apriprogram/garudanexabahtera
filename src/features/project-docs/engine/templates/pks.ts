// PKS + SOW – Perjanjian Kerja Sama & Lampiran Pernyataan Lingkup Kerja (spec §6): pembukaan "Pada hari ini…",
// para pihak, Pasal 1–14 (definisi s.d. penutup), tanda tangan + e-Meterai, lalu Lampiran SOW (deliverable, fitur,
// di luar ruang lingkup, asumsi, kriteria penerimaan, jadwal milestone) di halaman baru.
import type { DocContent } from '../../types';
import { DELIVERABLES, FEATURES, OUT_OF_SCOPE } from './catalog';
import { E_SIGN_CLAUSE, OPENING, lines, paraPihak, section, type TemplateInput } from './shared';

export function pks({ data, service, person }: TemplateInput): DocContent {
  const maintenance = Boolean(data.project?.has_maintenance);
  return {
    title: 'Perjanjian Kerja Sama Pembuatan {{project.service_label}}',
    sections: [
      section('pembukaan', '', OPENING),
      section('para_pihak', '', paraPihak(person)),
      section(
        'pertimbangan',
        '',
        lines(
          'PARA PIHAK terlebih dahulu menerangkan hal-hal sebagai berikut:',
          'a. bahwa PIHAK PERTAMA adalah badan usaha yang bergerak di bidang jasa pengembangan perangkat lunak, pembuatan website, aplikasi, dan desain antarmuka, serta memiliki keahlian dan sumber daya untuk melaksanakan pekerjaan sebagaimana diatur dalam Perjanjian ini;',
          'b. bahwa PIHAK KEDUA bermaksud menunjuk PIHAK PERTAMA untuk melaksanakan pembuatan **{{project.service_name}}**;',
          'c. bahwa PIHAK KEDUA telah menyetujui Proposal dan Penawaran Harga yang diajukan PIHAK PERTAMA untuk pekerjaan tersebut.',
          '',
          'Berdasarkan hal-hal tersebut di atas, PARA PIHAK sepakat untuk mengikatkan diri dalam Perjanjian Kerja Sama ini (selanjutnya disebut **Perjanjian**) dengan syarat dan ketentuan sebagai berikut:',
        ),
      ),
      section(
        'pasal_1',
        'Pasal 1 – Definisi',
        lines(
          'Dalam Perjanjian ini, istilah-istilah berikut mempunyai arti sebagai berikut:',
          '1. **Pekerjaan** adalah pembuatan {{project.service_name}} sebagaimana diuraikan dalam Pasal 2 dan Lampiran Perjanjian.',
          '2. **Hasil Pekerjaan** adalah seluruh keluaran (deliverable) Pekerjaan yang diserahkan PIHAK PERTAMA kepada PIHAK KEDUA, termasuk kode sumber, desain, dan dokumentasi.',
          '3. **Lampiran** adalah Pernyataan Lingkup Kerja (Statement of Work) yang merupakan bagian tidak terpisahkan dari Perjanjian ini.',
          '4. **Termin** adalah tahapan pembayaran Nilai Perjanjian sebagaimana diatur dalam Pasal 5.',
          '5. **UAT** (User Acceptance Testing) adalah pengujian Hasil Pekerjaan oleh PIHAK KEDUA untuk memastikan kesesuaiannya dengan kebutuhan yang disepakati.',
          '6. **Berita Acara Serah Terima** (BAST) adalah dokumen yang menyatakan Hasil Pekerjaan telah diserahkan oleh PIHAK PERTAMA dan diterima oleh PIHAK KEDUA.',
          '7. **Masa Garansi** adalah jangka waktu perbaikan kesalahan Hasil Pekerjaan tanpa biaya tambahan sebagaimana diatur dalam Pasal 8.',
          '8. **Hari Kerja** adalah hari Senin sampai dengan Jumat, kecuali hari libur nasional dan cuti bersama yang ditetapkan Pemerintah Republik Indonesia.',
          '9. **Informasi Rahasia** adalah setiap informasi, data, atau dokumen yang diterima satu PIHAK dari PIHAK lainnya sehubungan dengan Perjanjian ini, baik lisan maupun tertulis.',
        ),
      ),
      section(
        'pasal_2',
        'Pasal 2 – Ruang Lingkup Pekerjaan',
        lines(
          '(1) PIHAK KEDUA memberikan pekerjaan kepada PIHAK PERTAMA, dan PIHAK PERTAMA menerima pekerjaan tersebut, berupa pembuatan **{{project.service_name}}** dengan ringkasan ruang lingkup: {{project.scope_summary}}',
          '(2) Rincian deliverable, fitur, batasan, asumsi, kriteria penerimaan, dan jadwal Pekerjaan tercantum dalam Lampiran yang merupakan bagian tidak terpisahkan dari Perjanjian ini.',
          '(3) Pekerjaan di luar ruang lingkup sebagaimana dimaksud pada ayat (1) dan ayat (2) hanya dapat dilaksanakan berdasarkan permintaan perubahan tertulis yang disetujui PARA PIHAK dan dapat memengaruhi Nilai Perjanjian serta jangka waktu Pekerjaan.',
        ),
      ),
      section(
        'pasal_3',
        'Pasal 3 – Jangka Waktu',
        lines(
          '(1) Pekerjaan dilaksanakan dalam jangka waktu {{project.duration_text}}, terhitung sejak tanggal {{project.start_date_long}} sampai dengan tanggal {{project.end_date_long}}, sesuai jadwal dalam Lampiran.',
          '(2) Jangka waktu sebagaimana dimaksud pada ayat (1) diperpanjang sesuai lamanya keterlambatan yang disebabkan oleh PIHAK KEDUA, antara lain keterlambatan penyediaan materi, data, akses, umpan balik, atau pembayaran, maupun karena Keadaan Memaksa.',
          '(3) Perjanjian ini berlaku sejak tanggal ditandatangani PARA PIHAK sampai seluruh hak dan kewajiban PARA PIHAK terpenuhi, termasuk Masa Garansi.',
        ),
      ),
      section(
        'pasal_4',
        'Pasal 4 – Nilai Perjanjian',
        lines(
          '(1) Nilai Perjanjian untuk seluruh Pekerjaan adalah sebesar **{{project.value_rupiah}}** (*{{project.value_terbilang}}*).',
          '(2) Nilai Perjanjian bersifat tetap (lump sum) selama tidak terdapat perubahan ruang lingkup sebagaimana dimaksud dalam Pasal 2 ayat (3).',
          '(3) Nilai Perjanjian belum termasuk Pajak Pertambahan Nilai (PPN) yang dikenakan apabila PIHAK PERTAMA berstatus Pengusaha Kena Pajak, serta biaya pihak ketiga yang tidak disebutkan dalam Lampiran, seperti domain, hosting, lisensi berbayar, dan layanan berlangganan.',
          '(4) Pemotongan pajak penghasilan oleh PIHAK KEDUA, apabila ada, dilakukan sesuai peraturan perundang-undangan dan bukti potongnya diserahkan kepada PIHAK PERTAMA.',
        ),
      ),
      section(
        'pasal_5',
        'Pasal 5 – Cara Pembayaran',
        lines(
          '(1) Nilai Perjanjian dibayarkan oleh PIHAK KEDUA secara bertahap dengan rincian sebagai berikut:',
          '',
          '{{#termin}}',
          '',
          '(2) Setiap pembayaran dilakukan berdasarkan invoice yang diterbitkan PIHAK PERTAMA dan wajib dilunasi paling lambat pada tanggal jatuh tempo yang tercantum dalam invoice.',
          '(3) Pembayaran dilakukan melalui transfer ke rekening PIHAK PERTAMA berikut:',
          '',
          '{{#rekening}}',
          '',
          '(4) PIHAK PERTAMA menerbitkan kuitansi sebagai bukti pembayaran yang sah atas setiap pembayaran yang diterima.',
          '(5) Apabila PIHAK KEDUA terlambat membayar lebih dari 14 (empat belas) hari kalender sejak tanggal jatuh tempo, PIHAK PERTAMA berhak menunda pelaksanaan Pekerjaan sampai pembayaran diterima, dan jangka waktu Pekerjaan diperpanjang sesuai lamanya penundaan.',
        ),
      ),
      section(
        'pasal_6',
        'Pasal 6 – Hak dan Kewajiban Para Pihak',
        lines(
          '(1) PIHAK PERTAMA berkewajiban:',
          '  a. melaksanakan Pekerjaan secara profesional sesuai ruang lingkup, jadwal, dan mutu yang disepakati;',
          '  b. melaporkan kemajuan Pekerjaan secara berkala kepada PIHAK KEDUA;',
          '  c. menyerahkan Hasil Pekerjaan beserta dokumentasi dan akses yang diperlukan;',
          '  d. memperbaiki kesalahan Hasil Pekerjaan selama Masa Garansi.',
          '(2) PIHAK PERTAMA berhak:',
          '  a. menerima pembayaran sesuai Pasal 5;',
          '  b. memperoleh materi, data, akses, dan umpan balik dari PIHAK KEDUA tepat waktu;',
          '  c. menolak permintaan di luar ruang lingkup yang belum disepakati secara tertulis.',
          '(3) PIHAK KEDUA berkewajiban:',
          '  a. melakukan pembayaran sesuai Pasal 5;',
          '  b. menyediakan materi, data, akses, dan keputusan yang diperlukan sesuai jadwal;',
          '  c. memberikan umpan balik atas setiap tahapan paling lambat 3 (tiga) Hari Kerja sejak diminta;',
          '  d. melaksanakan UAT dan menandatangani Berita Acara Serah Terima sesuai Pasal 7;',
          '  e. menjamin bahwa materi yang diserahkan kepada PIHAK PERTAMA tidak melanggar hak pihak ketiga.',
          '(4) PIHAK KEDUA berhak:',
          '  a. menerima Hasil Pekerjaan sesuai Perjanjian ini;',
          '  b. memperoleh informasi kemajuan Pekerjaan;',
          '  c. memperoleh perbaikan kesalahan selama Masa Garansi.',
        ),
      ),
      section(
        'pasal_7',
        'Pasal 7 – Pengujian dan Serah Terima',
        lines(
          '(1) Setelah Pekerjaan selesai, PIHAK PERTAMA memberitahukan kepada PIHAK KEDUA bahwa Hasil Pekerjaan siap diuji melalui UAT.',
          '(2) PIHAK KEDUA melaksanakan UAT dan menyampaikan hasilnya paling lambat 7 (tujuh) Hari Kerja sejak pemberitahuan sebagaimana dimaksud pada ayat (1).',
          '(3) Temuan UAT yang termasuk dalam ruang lingkup diperbaiki oleh PIHAK PERTAMA tanpa biaya tambahan, kemudian diuji kembali oleh PIHAK KEDUA.',
          '(4) Apabila PIHAK KEDUA tidak menyampaikan hasil UAT dalam jangka waktu sebagaimana dimaksud pada ayat (2), Hasil Pekerjaan dianggap telah diterima.',
          '(5) Serah terima Hasil Pekerjaan dinyatakan dalam Berita Acara Serah Terima yang ditandatangani PARA PIHAK. Sejak saat itu, tanggung jawab pengelolaan Hasil Pekerjaan beralih kepada PIHAK KEDUA, kecuali kewajiban garansi.',
        ),
      ),
      section(
        'pasal_8',
        'Pasal 8 – Garansi dan Pemeliharaan',
        lines(
          '(1) PIHAK PERTAMA memberikan Masa Garansi selama 90 (sembilan puluh) hari kalender sejak tanggal Berita Acara Serah Terima, berupa perbaikan kesalahan (bug) pada Hasil Pekerjaan tanpa biaya tambahan.',
          '(2) Garansi tidak mencakup penambahan atau perubahan fitur, kerusakan akibat perubahan oleh pihak lain, gangguan layanan pihak ketiga (antara lain hosting, domain, dan layanan berlangganan), serta kesalahan penggunaan.',
          maintenance
            ? '(3) Pemeliharaan dan dukungan teknis setelah Masa Garansi diatur dalam Perjanjian Tingkat Layanan (Service Level Agreement) tersendiri yang merupakan satu kesatuan dengan Perjanjian ini.'
            : '(3) Pemeliharaan dan dukungan teknis setelah Masa Garansi dapat disepakati PARA PIHAK dalam Perjanjian Tingkat Layanan (Service Level Agreement) tersendiri.',
        ),
      ),
      section(
        'pasal_9',
        'Pasal 9 – Hak Kekayaan Intelektual',
        lines(
          '(1) Hak atas Hasil Pekerjaan yang dibuat khusus untuk PIHAK KEDUA, termasuk kode sumber, desain, dan dokumentasi, beralih kepada PIHAK KEDUA setelah Nilai Perjanjian dilunasi seluruhnya.',
          '(2) Komponen yang telah dimiliki atau dikembangkan PIHAK PERTAMA sebelum Perjanjian ini, pustaka (library), dan kerangka kerja (framework) tetap menjadi milik PIHAK PERTAMA atau pemiliknya masing-masing; PIHAK KEDUA memperoleh hak pakai yang tidak eksklusif dan tanpa batas waktu sepanjang diperlukan untuk Hasil Pekerjaan.',
          '(3) Perangkat lunak sumber terbuka (open source) tunduk pada lisensinya masing-masing.',
          '(4) Merek, logo, konten, dan materi yang diserahkan PIHAK KEDUA tetap menjadi milik PIHAK KEDUA.',
          '(5) PIHAK PERTAMA berhak mencantumkan nama dan tampilan Hasil Pekerjaan dalam portofolionya, kecuali PIHAK KEDUA menyatakan keberatan secara tertulis.',
        ),
      ),
      section(
        'pasal_10',
        'Pasal 10 – Kerahasiaan',
        lines(
          '(1) Masing-masing PIHAK wajib menjaga kerahasiaan Informasi Rahasia PIHAK lainnya dan hanya menggunakannya untuk pelaksanaan Perjanjian ini.',
          '(2) Informasi Rahasia tidak boleh diungkapkan kepada pihak ketiga tanpa persetujuan tertulis dari PIHAK pemilik informasi, kecuali kepada karyawan atau konsultan yang memerlukannya dan terikat kewajiban kerahasiaan yang sama, atau karena diwajibkan oleh peraturan perundang-undangan maupun perintah pengadilan.',
          '(3) Data pribadi yang diproses dalam pelaksanaan Pekerjaan dikelola sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.',
          '(4) Kewajiban kerahasiaan berlaku selama Perjanjian ini dan 2 (dua) tahun setelah Perjanjian ini berakhir.',
        ),
      ),
      section(
        'pasal_11',
        'Pasal 11 – Keadaan Memaksa',
        lines(
          '(1) Keadaan Memaksa (force majeure) adalah peristiwa di luar kendali PARA PIHAK yang tidak dapat diperkirakan sebelumnya, antara lain bencana alam, kebakaran, wabah, huru-hara, perang, gangguan jaringan atau listrik berskala luas, serta kebijakan Pemerintah, yang secara langsung menghambat pelaksanaan Perjanjian ini.',
          '(2) PIHAK yang mengalami Keadaan Memaksa wajib memberitahukan secara tertulis kepada PIHAK lainnya paling lambat 7 (tujuh) hari kalender sejak terjadinya peristiwa tersebut.',
          '(3) Keterlambatan atau tidak terlaksananya kewajiban akibat Keadaan Memaksa tidak dianggap sebagai pelanggaran Perjanjian, dan PARA PIHAK akan bermusyawarah untuk menyesuaikan jadwal maupun ketentuan lain yang terdampak.',
        ),
      ),
      section(
        'pasal_12',
        'Pasal 12 – Pemutusan Perjanjian',
        lines(
          '(1) Masing-masing PIHAK dapat mengakhiri Perjanjian ini apabila PIHAK lainnya melanggar ketentuan Perjanjian dan tidak memperbaikinya dalam waktu 14 (empat belas) hari kalender setelah menerima teguran tertulis.',
          '(2) Dalam hal Perjanjian berakhir sebelum Pekerjaan selesai, PIHAK KEDUA wajib membayar bagian Pekerjaan yang telah dilaksanakan PIHAK PERTAMA secara proporsional, dan PIHAK PERTAMA wajib menyerahkan Hasil Pekerjaan sampai dengan tahap yang telah dibayar.',
          '(3) Uang muka yang telah dibayarkan tidak dapat dikembalikan apabila pemutusan disebabkan oleh PIHAK KEDUA dan Pekerjaan telah dimulai.',
          '(4) Untuk pemutusan Perjanjian ini, PARA PIHAK sepakat mengesampingkan ketentuan Pasal 1266 Kitab Undang-Undang Hukum Perdata sepanjang mengenai diperlukannya putusan pengadilan.',
        ),
      ),
      section(
        'pasal_13',
        'Pasal 13 – Penyelesaian Perselisihan',
        lines(
          '(1) Perjanjian ini tunduk pada dan ditafsirkan berdasarkan hukum Negara Republik Indonesia.',
          '(2) Setiap perselisihan yang timbul dari atau sehubungan dengan Perjanjian ini diselesaikan terlebih dahulu secara musyawarah untuk mufakat dalam waktu paling lama 30 (tiga puluh) hari kalender.',
          '(3) Apabila musyawarah tidak mencapai mufakat, PARA PIHAK sepakat menyelesaikan perselisihan melalui Pengadilan Negeri {{company.city}} sesuai domisili PIHAK PERTAMA.',
        ),
      ),
      section(
        'pasal_14',
        'Pasal 14 – Penutup',
        lines(
          '(1) Hal-hal yang belum diatur dalam Perjanjian ini akan diatur kemudian dalam addendum yang disepakati secara tertulis oleh PARA PIHAK dan merupakan bagian tidak terpisahkan dari Perjanjian ini.',
          `(2) Perjanjian ini ${E_SIGN_CLAUSE}.`,
          '(3) Bea meterai atas Perjanjian ini dipenuhi sesuai Undang-Undang Nomor 10 Tahun 2020 tentang Bea Meterai.',
          '(4) Dokumen elektronik Perjanjian ini yang tersimpan pada platform beserta jejak auditnya merupakan dokumen asli yang dapat diunduh dan dicetak oleh masing-masing PIHAK.',
          '',
          '{{#tanda_tangan}}',
        ),
      ),
      section(
        'lampiran',
        'LAMPIRAN – PERNYATAAN LINGKUP KERJA (STATEMENT OF WORK)',
        lines(
          '{{#halaman_baru}}',
          'Lampiran Perjanjian Kerja Sama Nomor {{document.number}} tanggal {{document.date_long}} antara {{company.name}} (PIHAK PERTAMA) dan {{client.name}} (PIHAK KEDUA) untuk pembuatan **{{project.service_name}}**.',
        ),
      ),
      section('sow_deliverable', 'A. Deliverable', lines('PIHAK PERTAMA menyerahkan:', ...DELIVERABLES[service].map((d) => `- ${d}`))),
      section('sow_fitur', 'B. Fitur dan spesifikasi', 'Ringkasan ruang lingkup: {{project.scope_summary}}', {
        columns: ['No', 'Fitur', 'Keterangan'],
        rows: FEATURES[service].map(([feature, detail], i) => [String(i + 1), feature, detail]),
      }),
      section('sow_di_luar', 'C. Di luar ruang lingkup', lines(...OUT_OF_SCOPE[service].map((item) => `- ${item}`))),
      section(
        'sow_asumsi',
        'D. Asumsi dan ketergantungan',
        lines(
          '- PIHAK KEDUA menyediakan materi, data, dan akses sesuai jadwal.',
          '- PIHAK KEDUA menunjuk satu narahubung yang berwenang mengambil keputusan.',
          '- Umpan balik diberikan paling lambat 3 (tiga) Hari Kerja; revisi desain paling banyak 2 (dua) kali per tahapan.',
          '- Layanan pihak ketiga (domain, hosting, toko aplikasi, payment gateway) tersedia dan aktif bila diperlukan.',
        ),
      ),
      section(
        'sow_kriteria',
        'E. Kriteria penerimaan',
        lines(
          '1. Seluruh fitur pada bagian B berfungsi sesuai Dokumen Kebutuhan Bisnis yang disetujui.',
          '2. Seluruh skenario UAT berstatus lulus dan tidak ada temuan berprioritas kritis atau tinggi yang terbuka.',
          '3. Deliverable pada bagian A telah diserahkan lengkap.',
          '4. Berita acara UAT disetujui dan Berita Acara Serah Terima ditandatangani PARA PIHAK.',
        ),
      ),
      section(
        'sow_jadwal',
        'F. Jadwal dan milestone',
        lines(
          '{{#jadwal_ringkas}}',
          '',
          'Lampiran ini disetujui PARA PIHAK bersamaan dengan penandatanganan Perjanjian dan merupakan bagian tidak terpisahkan dari Perjanjian.',
        ),
      ),
    ],
  };
}
