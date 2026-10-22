// MoU – Nota Kesepahaman (spec §6): para pihak, maksud & tujuan, ruang lingkup kerja sama, jangka waktu, pembiayaan
// (tidak mengikat), kerahasiaan, sifat kesepahaman, lain-lain, penutup, tanda tangan.
import type { DocContent } from '../../types';
import { E_SIGN_CLAUSE, OPENING, lines, paraPihak, section, type TemplateInput } from './shared';

export function mou({ person }: TemplateInput): DocContent {
  return {
    title: 'Nota Kesepahaman (Memorandum of Understanding)\ntentang Kerja Sama Pembuatan {{project.service_label}}',
    sections: [
      section('pembukaan', '', OPENING),
      section('para_pihak', '', paraPihak(person)),
      section(
        'pertimbangan',
        '',
        lines(
          'PARA PIHAK terlebih dahulu menerangkan hal-hal sebagai berikut:',
          'a. bahwa PIHAK PERTAMA adalah badan usaha yang bergerak di bidang jasa pengembangan perangkat lunak, pembuatan website, aplikasi, dan desain antarmuka;',
          'b. bahwa PIHAK KEDUA berencana membangun **{{project.service_name}}** untuk mendukung kegiatan usahanya;',
          'c. bahwa PARA PIHAK bermaksud menyamakan pemahaman dan kerangka kerja sama sebelum menandatangani perjanjian kerja sama yang mengikat.',
          '',
          'Berdasarkan hal-hal tersebut, PARA PIHAK sepakat membuat Nota Kesepahaman ini (selanjutnya disebut **Nota Kesepahaman**) dengan ketentuan sebagai berikut:',
        ),
      ),
      section(
        'pasal_1',
        'Pasal 1 – Maksud dan Tujuan',
        lines(
          '(1) Maksud Nota Kesepahaman ini adalah sebagai landasan bagi PARA PIHAK dalam merencanakan kerja sama pembuatan **{{project.service_name}}**.',
          '(2) Tujuan Nota Kesepahaman ini adalah menyamakan pemahaman PARA PIHAK mengenai ruang lingkup, tahapan, dan tanggung jawab masing-masing sebelum ditindaklanjuti dengan Perjanjian Kerja Sama.',
        ),
      ),
      section(
        'pasal_2',
        'Pasal 2 – Ruang Lingkup Kerja Sama',
        lines(
          'Ruang lingkup kerja sama meliputi:',
          'a. penyusunan dan penyepakatan Dokumen Kebutuhan Bisnis (Business Requirements Document);',
          'b. penyusunan proposal dan penawaran harga;',
          'c. perancangan, pengembangan, pengujian, dan serah terima {{project.service_label}} dengan ringkasan lingkup: {{project.scope_summary}};',
          'd. pemeliharaan dan dukungan teknis setelah serah terima apabila disepakati.',
          '',
          'Rincian ruang lingkup, jadwal, dan biaya dituangkan dalam Perjanjian Kerja Sama beserta lampirannya.',
        ),
      ),
      section(
        'pasal_3',
        'Pasal 3 – Jangka Waktu',
        lines(
          '(1) Nota Kesepahaman ini berlaku selama 6 (enam) bulan sejak tanggal ditandatangani dan dapat diperpanjang atas kesepakatan PARA PIHAK.',
          '(2) Nota Kesepahaman ini berakhir dengan sendirinya apabila PARA PIHAK telah menandatangani Perjanjian Kerja Sama untuk pekerjaan yang sama, atau apabila salah satu PIHAK menyatakan secara tertulis tidak melanjutkan kerja sama.',
        ),
      ),
      section(
        'pasal_4',
        'Pasal 4 – Pembiayaan',
        lines(
          '(1) Nota Kesepahaman ini tidak menimbulkan kewajiban pembayaran bagi PARA PIHAK.',
          '(2) Perkiraan nilai pekerjaan sebesar {{project.value_rupiah}} (*{{project.value_terbilang}}*) bersifat indikatif dan tidak mengikat.',
          '(3) Nilai, termin, dan tata cara pembayaran yang mengikat ditetapkan dalam Proposal & Penawaran Harga yang disetujui serta Perjanjian Kerja Sama.',
        ),
      ),
      section(
        'pasal_5',
        'Pasal 5 – Kerahasiaan',
        lines(
          '(1) PARA PIHAK wajib menjaga kerahasiaan seluruh informasi, data, dan dokumen yang diterima dari PIHAK lainnya dalam rangka Nota Kesepahaman ini dan tidak mengungkapkannya kepada pihak ketiga tanpa persetujuan tertulis dari PIHAK pemilik informasi.',
          '(2) Kewajiban kerahasiaan tetap berlaku selama 2 (dua) tahun setelah Nota Kesepahaman ini berakhir.',
          '(3) Ketentuan ini tidak berlaku atas informasi yang telah menjadi milik umum bukan karena kesalahan PIHAK penerima, atau yang wajib diungkapkan berdasarkan peraturan perundang-undangan.',
        ),
      ),
      section(
        'pasal_6',
        'Pasal 6 – Sifat Kesepahaman',
        'Nota Kesepahaman ini merupakan kesepakatan awal dan tidak mengikat PARA PIHAK untuk melaksanakan pekerjaan, kecuali ketentuan Pasal 5 tentang Kerahasiaan yang mengikat PARA PIHAK sejak Nota Kesepahaman ini ditandatangani.',
      ),
      section(
        'pasal_7',
        'Pasal 7 – Lain-lain',
        lines(
          '(1) Hal-hal yang belum diatur dalam Nota Kesepahaman ini akan diatur kemudian atas kesepakatan PARA PIHAK.',
          '(2) Perubahan atas Nota Kesepahaman ini hanya sah apabila dibuat secara tertulis dan disetujui PARA PIHAK.',
          '(3) Perbedaan pendapat yang timbul dari Nota Kesepahaman ini diselesaikan secara musyawarah untuk mufakat.',
        ),
      ),
      section(
        'pasal_8',
        'Pasal 8 – Penutup',
        `Nota Kesepahaman ini ${E_SIGN_CLAUSE}, dan berlaku sejak tanggal ditandatangani oleh PARA PIHAK.`,
      ),
    ],
  };
}
