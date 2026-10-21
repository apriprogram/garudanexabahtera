// BAST – Berita Acara Serah Terima Pekerjaan (spec §6): "Pada hari ini…", para pihak, tabel hasil pekerjaan yang
// diserahkan, pernyataan diterima dengan baik, masa garansi, tanda tangan + e-Meterai.
import type { DocContent } from '../../types';
import { HANDOVER } from './catalog';
import { OPENING, keyValue, lines, section, type TemplateInput } from './shared';

export function bast({ data, service, person }: TemplateInput): DocContent {
  const maintenance = Boolean(data.project?.has_maintenance);
  return {
    title: 'Berita Acara Serah Terima Pekerjaan',
    sections: [
      section('pembukaan', '', OPENING),
      section(
        'pihak_pertama',
        '',
        '1. **PIHAK PERTAMA**, yang menyerahkan pekerjaan:',
        keyValue([
          ['Nama', '{{company.signatory_name}}'],
          ['Jabatan', '{{company.signatory_title}}'],
          ['Perusahaan', '{{company.name}}'],
          ['Alamat', '{{company.address}}, {{company.city}}'],
        ]),
      ),
      section(
        'pihak_kedua',
        '',
        '2. **PIHAK KEDUA**, yang menerima pekerjaan:',
        keyValue(
          person
            ? [
                ['Nama', '{{client.name}}'],
                ['Alamat', '{{client.address}}, {{client.city}}'],
              ]
            : [
                ['Nama', '{{client.pic_name}}'],
                ['Jabatan', '{{client.pic_title}}'],
                ['Perusahaan', '{{client.name}}'],
                ['Alamat', '{{client.address}}, {{client.city}}'],
              ],
        ),
      ),
      section(
        'dasar',
        '',
        'Berdasarkan Perjanjian Kerja Sama Pembuatan {{project.service_label}} untuk proyek **{{project.name}}** (kode proyek {{project.code}}) beserta lampirannya, dan setelah hasil pekerjaan dinyatakan diterima melalui User Acceptance Testing (UAT), PIHAK PERTAMA dengan ini menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA menerima dari PIHAK PERTAMA, hasil pekerjaan sebagai berikut:',
        {
          columns: ['No', 'Hasil pekerjaan', 'Keterangan', 'Status'],
          rows: HANDOVER[service].map(([item, detail], i) => [String(i + 1), item, detail, 'Diserahkan']),
        },
      ),
      section(
        'pernyataan',
        '',
        lines(
          'Dengan ditandatanganinya Berita Acara ini:',
          '1. PIHAK KEDUA menyatakan telah menerima hasil pekerjaan sebagaimana tersebut di atas dalam keadaan **baik, lengkap, dan berfungsi** sesuai Perjanjian Kerja Sama dan hasil UAT.',
          '2. Tanggung jawab pengelolaan hasil pekerjaan, termasuk keamanan akun dan kata sandi, beralih kepada PIHAK KEDUA sejak tanggal Berita Acara ini.',
          '3. PIHAK KEDUA menyelesaikan sisa pembayaran sesuai termin yang tercantum dalam Perjanjian Kerja Sama.',
        ),
      ),
      section(
        'garansi',
        'Masa garansi',
        lines(
          'PIHAK PERTAMA memberikan garansi perbaikan kesalahan (bug) selama 90 (sembilan puluh) hari kalender sejak tanggal Berita Acara ini, yaitu sampai dengan **{{document.warranty_until_long}}**, dengan ketentuan sebagaimana diatur dalam Perjanjian Kerja Sama.',
          maintenance ? '' : false,
          maintenance
            ? 'Setelah masa garansi berakhir, pemeliharaan dan dukungan teknis dilanjutkan berdasarkan Perjanjian Tingkat Layanan (Service Level Agreement) antara PARA PIHAK.'
            : false,
        ),
      ),
      section(
        'penutup',
        '',
        'Demikian Berita Acara Serah Terima ini dibuat dan ditandatangani secara elektronik oleh PARA PIHAK untuk dipergunakan sebagaimana mestinya.',
      ),
    ],
  };
}
