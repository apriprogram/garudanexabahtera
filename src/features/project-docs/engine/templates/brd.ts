// BRD – Dokumen Kebutuhan Bisnis (spec §6): informasi dokumen, latar belakang, tujuan bisnis, ruang lingkup,
// pemangku kepentingan, kebutuhan fungsional (MoSCoW), non-fungsional, asumsi & batasan, kriteria keberhasilan,
// persetujuan.
import type { DocContent } from '../../types';
import { COMPATIBILITY, FUNCTIONAL, GOALS } from './catalog';
import { keyValue, lines, pic, picTitle, section, type TemplateInput } from './shared';

export function brd({ service, person }: TemplateInput): DocContent {
  const stakeholders: string[][] = [
    ['Pemilik proyek (sponsor)', pic(person), '{{client.name}}', 'Menetapkan tujuan dan prioritas, mengambil keputusan, serta menyetujui dokumen dan hasil pekerjaan'],
    ...(person
      ? []
      : [['Narahubung klien (PIC)', '{{client.pic_name}}', '{{client.name}}', 'Menyediakan materi, data, dan umpan balik tepat waktu; mengoordinasikan pengguna untuk UAT']]),
    ['Penanggung jawab vendor', '{{company.signatory_name}}', '{{company.name}}', 'Memastikan pekerjaan sesuai kebutuhan, jadwal, dan mutu yang disepakati'],
    ['Tim pelaksana', 'Tim proyek', '{{company.name}}', 'Analisis, desain, pengembangan, pengujian, peluncuran, dan dukungan'],
    ['Pengguna akhir', 'Pengguna {{project.service_label}}', '{{client.name}}', 'Memberi masukan dan berpartisipasi dalam pengujian penerimaan (UAT)'],
  ];
  if (person) stakeholders[0][3] = 'Menetapkan kebutuhan, menyediakan materi dan umpan balik, serta menyetujui dokumen dan hasil pekerjaan';

  return {
    title: 'Dokumen Kebutuhan Bisnis (Business Requirements Document)',
    sections: [
      section(
        'informasi',
        '1. Informasi dokumen',
        undefined,
        keyValue([
          ['Nama proyek', '**{{project.name}}**'],
          ['Kode proyek', '{{project.code}}'],
          ['Jenis layanan', '{{project.service_label}}'],
          ['Klien', '{{client.name}}'],
          ['Narahubung klien', person ? '{{client.name}}' : '{{client.pic_name}} ({{client.pic_title}})'],
          ['Disusun oleh', '{{company.name}}'],
          ['Versi dokumen', '{{document.version}}'],
          ['Tanggal', '{{document.date_long}}'],
        ]),
      ),
      section(
        'latar_belakang',
        '2. Latar belakang',
        lines(
          '{{client.name}} bermaksud membangun **{{project.service_name}}** untuk mendukung kegiatan usahanya. Ringkasan kebutuhan yang disampaikan klien:',
          '',
          '{{project.description}}',
          '',
          'Dokumen ini merangkum kebutuhan bisnis yang menjadi dasar penyusunan penawaran, perjanjian kerja sama, perancangan, pengembangan, dan pengujian proyek. Seluruh pihak menggunakan dokumen ini sebagai acuan bersama selama proyek berlangsung.',
        ),
      ),
      section(
        'tujuan',
        '3. Tujuan bisnis',
        lines('Proyek ini diharapkan mencapai tujuan bisnis berikut:', ...GOALS[service].map((goal) => `- ${goal}`), '', 'Ukuran keberhasilannya diuraikan pada bagian Kriteria keberhasilan.'),
      ),
      section(
        'ruang_lingkup',
        '4. Ruang lingkup',
        lines(
          '**Termasuk dalam ruang lingkup:**',
          '{{project.scope_summary}}',
          '',
          '**Di luar ruang lingkup:**',
          '- Pembuatan konten (teks, foto, video) kecuali disebutkan lain; konten disediakan oleh klien.',
          service === 'mobile_app'
            ? '- Biaya akun pengembang Google Play Console dan Apple Developer Program, server, serta layanan pihak ketiga yang tidak tercantum dalam penawaran.'
            : '- Biaya pihak ketiga seperti domain, hosting, lisensi berbayar, dan layanan berlangganan yang tidak tercantum dalam penawaran.',
          '- Fitur atau perubahan di luar dokumen ini, yang diproses melalui permintaan perubahan (change request).',
        ),
      ),
      section('pemangku_kepentingan', '5. Pemangku kepentingan', undefined, {
        columns: ['Peran', 'Nama', 'Organisasi', 'Tanggung jawab'],
        rows: stakeholders,
      }),
      section(
        'kebutuhan_fungsional',
        '6. Kebutuhan fungsional',
        'Prioritas memakai metode MoSCoW: **Must have** (wajib ada saat peluncuran), **Should have** (penting, dapat menyusul bila waktu terbatas), **Could have** (diinginkan bila sumber daya memungkinkan), dan **Won\'t have** (tidak dikerjakan pada fase ini).',
        {
          columns: ['Kode', 'Kebutuhan', 'Prioritas'],
          rows: FUNCTIONAL[service].map(([need, priority], i) => [`FR-${String(i + 1).padStart(2, '0')}`, need, priority]),
        },
      ),
      section(
        'kebutuhan_non_fungsional',
        '7. Kebutuhan non-fungsional',
        lines(
          service === 'ui_ux'
            ? '- **Kegunaan**: pengguna baru dapat menyelesaikan tugas utama tanpa panduan.'
            : '- **Kinerja**: halaman/layar utama termuat kurang dari 3 detik pada koneksi 4G normal.',
          service === 'ui_ux'
            ? '- **Konsistensi**: seluruh layar memakai komponen dan gaya dari design system yang sama.'
            : '- **Keamanan**: HTTPS/SSL, kata sandi terenkripsi, hak akses berbasis peran, validasi input, dan perlindungan terhadap celah umum (OWASP Top 10).',
          `- ${COMPATIBILITY[service]}`,
          ...(service === 'ui_ux'
            ? ['- **Kerapian berkas**: komponen, layer, dan halaman pada berkas desain diberi nama dan terorganisasi.']
            : [
                '- **Ketersediaan**: target uptime 99,5% per bulan di luar pemeliharaan terjadwal.',
                '- **Pencadangan**: data dicadangkan secara berkala dan dapat dipulihkan.',
                '- **Kemudahan pemeliharaan**: kode terstruktur, terdokumentasi, dan memakai teknologi yang umum didukung.',
              ]),
          '- **Pelindungan data**: data pribadi dikelola sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.',
        ),
      ),
      section(
        'asumsi',
        '8. Asumsi dan batasan',
        lines(
          '- Materi (logo, teks, foto, data) disediakan klien sesuai jadwal yang disepakati.',
          '- Klien memberikan umpan balik atas setiap tahapan paling lambat 3 (tiga) hari kerja.',
          '- Revisi desain dibatasi 2 (dua) kali per tahapan; revisi tambahan diproses sebagai permintaan perubahan.',
          '- Jadwal dapat bergeser apabila materi, akses, atau keputusan dari klien terlambat.',
          '- Perubahan kebutuhan setelah dokumen ini disetujui dapat memengaruhi biaya dan jadwal.',
        ),
      ),
      section(
        'kriteria',
        '9. Kriteria keberhasilan',
        lines(
          '1. Seluruh kebutuhan berprioritas **Must have** berfungsi sesuai dokumen ini dan lulus UAT.',
          '2. Tidak ada temuan berprioritas kritis atau tinggi yang masih terbuka saat serah terima.',
          '3. Kebutuhan non-fungsional terpenuhi.',
          '4. Klien menyetujui berita acara UAT dan menandatangani Berita Acara Serah Terima.',
          '5. {{project.service_label}} diluncurkan sesuai jadwal yang disepakati.',
        ),
      ),
      section(
        'persetujuan',
        '10. Persetujuan',
        lines(
          'Dengan menyetujui dokumen ini melalui portal klien {{company.name}}, {{client.name}} menyatakan bahwa kebutuhan bisnis di atas telah sesuai dan dapat digunakan sebagai dasar penyusunan penawaran, perjanjian, dan pengerjaan proyek. Persetujuan elektronik tercatat pada sistem beserta waktu dan identitas pemberi persetujuan.',
          '',
          'Perubahan atas dokumen yang telah disetujui dilakukan melalui prosedur permintaan perubahan dan menghasilkan versi dokumen yang baru.',
        ),
        {
          columns: ['Peran', 'Nama', 'Jabatan', 'Organisasi'],
          rows: [
            ['Disusun oleh', '{{company.signatory_name}}', '{{company.signatory_title}}', '{{company.name}}'],
            ['Disetujui oleh', pic(person), picTitle(person), person ? 'Perorangan' : '{{client.name}}'],
          ],
        },
      ),
    ],
  };
}
