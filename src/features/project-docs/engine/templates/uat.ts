// UAT – Berita Acara Pengujian & Persetujuan Hasil (spec §6): informasi pengujian, tabel skenario (ID · Fitur ·
// Langkah · Hasil diharapkan · Hasil aktual · Lulus/Gagal · Catatan), ringkasan hasil (dihitung dari tabel),
// keputusan penerimaan, tanda tangan kedua pihak.
import type { DocContent } from '../../types';
import { UAT_SCENARIOS } from './catalog';
import { keyValue, lines, section, type TemplateInput } from './shared';

export function uat({ service, person }: TemplateInput): DocContent {
  return {
    title: 'Berita Acara User Acceptance Testing (UAT)',
    sections: [
      section(
        'pembukaan',
        '',
        'Pada hari ini, **{{document.day}}**, tanggal **{{document.date_long}}**, telah dilaksanakan pengujian penerimaan pengguna (User Acceptance Testing) atas **{{project.service_name}}** oleh {{company.name}} selaku pelaksana pekerjaan, selanjutnya disebut **PIHAK PERTAMA**, bersama {{client.name}} selaku pemilik pekerjaan, selanjutnya disebut **PIHAK KEDUA**, dengan hasil sebagai berikut.',
      ),
      section(
        'informasi',
        '1. Informasi pengujian',
        undefined,
        keyValue([
          ['Proyek', '{{project.name}} ({{project.code}})'],
          ['Klien', '{{client.name}}'],
          ['Dasar pengujian', 'Dokumen Kebutuhan Bisnis dan Lampiran Perjanjian Kerja Sama'],
          ['Tanggal pengujian', '{{document.date_long}}'],
          ['Lingkungan pengujian', 'Server pengujian (staging) yang disediakan PIHAK PERTAMA'],
          ['Penguji', person ? '{{client.name}}' : '{{client.pic_name}} ({{client.pic_title}})'],
          ['Pendamping', 'Tim proyek {{company.name}}'],
        ]),
      ),
      section('skenario', '2. Skenario dan hasil pengujian', 'Kolom **Lulus/Gagal** diisi *Lulus* atau *Gagal*; temuan dan perbaikan dicatat pada kolom catatan.', {
        columns: ['ID', 'Fitur', 'Langkah pengujian', 'Hasil yang diharapkan', 'Hasil aktual', 'Lulus/Gagal', 'Catatan'],
        rows: UAT_SCENARIOS[service].map(([feature, steps, expected], i) => [`UAT-${String(i + 1).padStart(2, '0')}`, feature, steps, expected, '', '', '']),
      }),
      section(
        'ringkasan',
        '3. Ringkasan hasil',
        lines(
          '{{#ringkasan_uji}}',
          '',
          'Skenario berstatus **Gagal** wajib diperbaiki oleh PIHAK PERTAMA dan diuji ulang sebelum serah terima. Perbaikan minor yang tidak menghambat penggunaan diselesaikan paling lambat 7 (tujuh) hari kerja setelah berita acara ini disetujui.',
        ),
      ),
      section(
        'keputusan',
        '4. Keputusan penerimaan',
        lines(
          'Berdasarkan hasil pengujian di atas, dengan menyetujui dan menandatangani berita acara ini, PIHAK KEDUA menyatakan bahwa **{{project.service_name}}** telah diuji dan **DITERIMA** untuk dilanjutkan ke tahap serah terima, dengan catatan perbaikan (bila ada) sebagaimana tercantum di atas.',
          '',
          'Apabila hasil pengujian belum dapat diterima, PIHAK KEDUA menyampaikan alasan dan daftar perbaikan melalui fitur permintaan revisi pada portal klien, dan PIHAK PERTAMA menyerahkan versi perbaikan untuk diuji ulang.',
          '',
          'Demikian berita acara ini dibuat dengan sebenarnya dan ditandatangani secara elektronik oleh PARA PIHAK untuk dipergunakan sebagaimana mestinya.',
        ),
      ),
    ],
  };
}
