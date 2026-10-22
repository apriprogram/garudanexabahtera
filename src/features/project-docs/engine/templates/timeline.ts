// Jadwal & Tahapan Pengerjaan (spec §6): informasi proyek, tabel milestone (No · Tahapan · Mulai · Selesai · Durasi ·
// Bobot · Status) dari tab Jadwal, catatan, persetujuan.
import type { DocContent } from '../../types';
import { keyValue, lines, section } from './shared';

export function timeline(): DocContent {
  return {
    title: 'Jadwal dan Tahapan Pengerjaan',
    sections: [
      section(
        'informasi',
        '1. Informasi proyek',
        undefined,
        keyValue([
          ['Nama proyek', '**{{project.name}}**'],
          ['Kode proyek', '{{project.code}}'],
          ['Klien', '{{client.name}}'],
          ['Jenis layanan', '{{project.service_label}}'],
          ['Tanggal mulai', '{{project.start_date_long}}'],
          ['Target selesai', '{{project.end_date_long}}'],
          ['Durasi', '{{project.duration_text}}'],
        ]),
      ),
      section(
        'jadwal',
        '2. Tahapan dan milestone',
        lines(
          'Rincian tahapan pengerjaan beserta tanggal, bobot, dan status terkini:',
          '',
          '{{#jadwal}}',
          '',
          'Bobot menunjukkan porsi setiap tahapan terhadap keseluruhan pekerjaan dan menjadi dasar perhitungan kemajuan proyek.',
        ),
      ),
      section(
        'catatan',
        '3. Catatan',
        lines(
          '- Durasi dihitung dalam hari kalender, termasuk tanggal mulai dan tanggal selesai.',
          '- Jadwal disusun dengan asumsi materi, akses, dan umpan balik dari {{client.name}} diterima tepat waktu; keterlambatan dari pihak klien menggeser jadwal tahapan berikutnya.',
          '- Kemajuan setiap tahapan dapat dipantau melalui portal klien {{company.name}}.',
          '- Perubahan jadwal akibat perubahan ruang lingkup dituangkan dalam versi baru dokumen ini.',
        ),
      ),
      section(
        'persetujuan',
        '4. Persetujuan',
        'Dengan menyetujui dokumen ini melalui portal klien {{company.name}}, {{client.name}} menyetujui jadwal dan tahapan pengerjaan di atas sebagai acuan pelaksanaan dan pemantauan proyek.',
      ),
    ],
  };
}
