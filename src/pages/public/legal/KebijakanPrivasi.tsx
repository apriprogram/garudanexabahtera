// /kebijakan-privasi. DRAF untuk ditinjau pemilik (2026-10-21): disusun dari data yang benar-benar dikumpulkan platform
// (akun, pesanan template, Midtrans, form custom, CMS, statistik kunjungan) dan UU No. 27 Tahun 2022 (UU PDP). Bukan
// dokumen yang sudah diperiksa konsultan hukum. Ubah LEGAL_UPDATED_AT di src/lib/legal.ts setiap kali isinya diubah.
import { Link } from 'react-router-dom';
import { LEGAL_PATHS } from '../../../lib/legal';
import { LegalPage, type LegalSection } from './LegalPage';

const SECTIONS: LegalSection[] = [
  {
    id: 'pengendali',
    title: 'Siapa kami',
    content: (
      <p>
        <strong>PT Garuda Nexa Bahtera</strong> (&ldquo;Garuda Nexa&rdquo; atau &ldquo;kami&rdquo;) adalah pengendali data
        pribadi yang dikumpulkan lewat website garudanexa.com dan halaman Akun Saya. Untuk data pengunjung yang Anda kumpulkan
        sendiri lewat situs template Anda (bila ada), Anda adalah pengendalinya dan kami memprosesnya sebagai penyedia
        hosting.
      </p>
    ),
  },
  {
    id: 'data',
    title: 'Data yang kami kumpulkan',
    content: (
      <ul>
        <li>
          <strong>Data akun:</strong> nama, email, nomor WhatsApp, dan kata sandi. Kata sandi disimpan dalam bentuk hash,
          sehingga tidak bisa dibaca oleh siapa pun, termasuk kami.
        </li>
        <li>
          <strong>Data pesanan template:</strong> nama pemesan, email, nomor WhatsApp, nama perusahaan atau instansi (opsional),
          catatan, domain yang Anda minta, dan riwayat status pesanan.
        </li>
        <li>
          <strong>Data pembayaran:</strong> status, metode, nilai, dan waktu pembayaran yang dikirim Midtrans. Kami tidak
          menerima atau menyimpan nomor kartu, PIN, maupun data login bank Anda.
        </li>
        <li>
          <strong>Data permintaan jasa custom:</strong> nama, email, nomor WhatsApp, perusahaan, jenis layanan, nama proyek,
          deskripsi kebutuhan, catatan anggaran, dan file proyek yang Anda kirim.
        </li>
        <li>
          <strong>Isi situs:</strong> teks, gambar, dan pengaturan yang Anda masukkan lewat CMS.
        </li>
        <li>
          <strong>Data teknis:</strong> alamat IP, jenis perangkat, browser, dan sistem operasi saat Anda membuka website
          (untuk statistik kunjungan), serta data sesi login yang tersimpan di browser Anda.
        </li>
        <li>
          <strong>Komunikasi:</strong> pesan yang Anda kirim kepada kami lewat WhatsApp atau email.
        </li>
      </ul>
    ),
  },
  {
    id: 'tujuan',
    title: 'Untuk apa data dipakai',
    content: (
      <>
        <ul>
          <li>Membuat dan mengelola akun Anda.</li>
          <li>Memproses pesanan, pembayaran, pendaftaran domain, hosting, dan situs Anda.</li>
          <li>Menghubungi Anda tentang pesanan, tagihan perpanjangan, dan permintaan bantuan.</li>
          <li>Menyusun penawaran dan mengerjakan proyek website atau aplikasi mobile custom.</li>
          <li>Menjaga keamanan layanan, termasuk mencegah penipuan dan penyalahgunaan.</li>
          <li>Menyusun statistik kunjungan secara agregat untuk memperbaiki website.</li>
          <li>Memenuhi kewajiban hukum, seperti pencatatan transaksi dan perpajakan.</li>
        </ul>
        <p>Kami tidak menjual data pribadi Anda dan tidak memakainya untuk iklan pihak ketiga.</p>
      </>
    ),
  },
  {
    id: 'dasar-pemrosesan',
    title: 'Dasar pemrosesan',
    content: (
      <p>
        Sesuai UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP), kami memproses data berdasarkan pemenuhan
        perjanjian (pesanan dan layanan yang Anda minta), persetujuan Anda (mis. saat mendaftar atau mengirim formulir),
        kewajiban hukum, dan kepentingan yang sah (keamanan layanan dan statistik kunjungan).
      </p>
    ),
  },
  {
    id: 'pihak-ketiga',
    title: 'Pihak yang menerima data',
    content: (
      <>
        <p>Data hanya kami bagikan sejauh diperlukan untuk menjalankan layanan:</p>
        <ul>
          <li>
            <strong>Midtrans</strong>, untuk memproses pembayaran (nama, email, nomor telepon, dan nilai transaksi).
          </li>
          <li>
            <strong>Registrar dan pengelola domain</strong> (mis. PANDI untuk domain .id), untuk data pendaftar domain sesuai
            aturan mereka.
          </li>
          <li>
            <strong>Penyedia infrastruktur</strong>: server hosting, penyimpanan file, dan layanan email.
          </li>
          <li>
            <strong>Google Fonts</strong>: browser Anda memuat huruf dari server Google, sehingga alamat IP Anda diterima
            Google.
          </li>
          <li>
            <strong>WhatsApp</strong>, bila Anda menghubungi kami lewat WhatsApp.
          </li>
          <li>
            <strong>Instansi yang berwenang</strong>, bila diwajibkan oleh peraturan perundang-undangan.
          </li>
        </ul>
        <p>
          Sebagian penyedia dapat memproses data di luar wilayah Indonesia. Kami hanya memakai penyedia yang menerapkan
          pelindungan data yang setara dengan atau lebih tinggi dari UU PDP.
        </p>
      </>
    ),
  },
  {
    id: 'keamanan',
    title: 'Keamanan data',
    content: (
      <>
        <ul>
          <li>Website memakai koneksi terenkripsi (HTTPS).</li>
          <li>Kata sandi disimpan dalam bentuk hash.</li>
          <li>Akses ke data pesanan dan file proyek dibatasi untuk staf yang berwenang.</li>
        </ul>
        <p>
          Bila terjadi kegagalan pelindungan data pribadi, kami memberi tahu Anda dan lembaga yang berwenang paling lambat 3 × 24
          jam sesuai UU PDP.
        </p>
      </>
    ),
  },
  {
    id: 'masa-simpan',
    title: 'Masa simpan',
    content: (
      <p>
        Data akun dan pesanan kami simpan selama akun Anda aktif dan selama diperlukan untuk tujuan di atas. Data transaksi
        disimpan selama diwajibkan oleh aturan pencatatan keuangan dan perpajakan. Setelah tidak diperlukan, data dihapus atau
        dianonimkan.
      </p>
    ),
  },
  {
    id: 'hak',
    title: 'Hak Anda',
    content: (
      <>
        <p>Sesuai UU PDP, Anda berhak:</p>
        <ul>
          <li>mendapat informasi tentang pemrosesan data Anda;</li>
          <li>mengakses dan memperoleh salinan data Anda;</li>
          <li>memperbaiki data yang keliru atau tidak lengkap;</li>
          <li>meminta penghapusan data dan menarik persetujuan;</li>
          <li>meminta penundaan atau pembatasan pemrosesan.</li>
        </ul>
        <p>
          Ajukan permintaan lewat kontak di bawah. Kami menanggapinya dalam jangka waktu yang ditetapkan UU PDP. Sebagian data,
          seperti catatan transaksi, tetap kami simpan bila diwajibkan hukum.
        </p>
      </>
    ),
  },
  {
    id: 'cookie',
    title: 'Cookie dan penyimpanan di browser',
    content: (
      <p>
        Kami tidak memakai cookie iklan atau pelacak pihak ketiga. Browser Anda menyimpan token sesi dan profil singkat di
        penyimpanan lokal agar Anda tetap masuk; data ini dihapus saat Anda keluar. Halaman pembayaran Midtrans dapat memakai
        cookie sesuai kebijakan Midtrans.
      </p>
    ),
  },
  {
    id: 'anak',
    title: 'Pengguna di bawah umur',
    content: (
      <p>
        Layanan kami ditujukan bagi pengguna dewasa dan badan usaha. Bila Anda belum berusia 18 tahun, gunakan layanan ini
        dengan persetujuan orang tua atau wali.
      </p>
    ),
  },
  {
    id: 'perubahan',
    title: 'Perubahan kebijakan',
    content: (
      <p>
        Kami dapat memperbarui Kebijakan Privasi ini. Versi terbaru selalu tersedia di halaman ini dengan tanggal
        &ldquo;Terakhir diperbarui&rdquo;. Perubahan penting kami informasikan lewat email atau halaman akun. Baca juga{' '}
        <Link to={LEGAL_PATHS.terms} className="link-site">
          Syarat &amp; Ketentuan
        </Link>
        .
      </p>
    ),
  },
];

export default function KebijakanPrivasi() {
  return (
    <LegalPage
      page="privacy"
      intro="Data pribadi apa yang kami kumpulkan saat Anda memakai garudanexa.com, untuk apa dipakai, kepada siapa dibagikan, dan hak Anda sesuai UU Pelindungan Data Pribadi."
      sections={SECTIONS}
    />
  );
}
