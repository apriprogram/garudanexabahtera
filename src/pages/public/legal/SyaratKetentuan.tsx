// /syarat-ketentuan. DRAF untuk ditinjau pemilik (2026-10-21): disusun dari cara kerja platform (pesanan template via
// Midtrans, proses domain, CMS, jasa custom) dan keputusan pemilik tentang harga & refund. Bukan dokumen yang sudah
// diperiksa konsultan hukum. Ubah LEGAL_UPDATED_AT di src/lib/legal.ts setiap kali isinya diubah.
// 2026-10-25 (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md): domain tidak lagi termasuk harga template (dipesan dan dibayar
// sesuai ekstensinya), perpanjangan hosting & jasa + domain 1–3 tahun dari akun. Angka harga tidak ditulis di sini:
// dokumen menunjuk halaman Harga, jadi tidak perlu diubah setiap kali harga berubah.
import { Link } from 'react-router-dom';
import { LEGAL_PATHS } from '../../../lib/legal';
import { HUB_PATHS } from '../../../seo/paths';
import { LegalPage, type LegalSection } from './LegalPage';

const PricingLink = () => (
  <Link to={HUB_PATHS.pricing} className="link-site">
    Harga
  </Link>
);

const SECTIONS: LegalSection[] = [
  {
    id: 'layanan',
    title: 'Tentang layanan',
    content: (
      <>
        <p>
          Website garudanexa.com dikelola oleh <strong>PT Garuda Nexa Bahtera</strong> (&ldquo;Garuda Nexa&rdquo; atau
          &ldquo;kami&rdquo;). Kami menyediakan dua layanan:
        </p>
        <ul>
          <li>
            <strong>Template website siap pakai.</strong> Anda memilih template dan nama domain, membayar secara online, lalu
            kami mendaftarkan domain dan menyiapkan situs Anda. Setelah aktif, Anda mengelola isinya sendiri lewat CMS (sistem
            pengelola konten) di halaman Akun Saya.
          </li>
          <li>
            <strong>Jasa pembuatan website dan aplikasi mobile custom</strong> yang dikerjakan berdasarkan penawaran
            tertulis.
          </li>
        </ul>
        <p>
          &ldquo;Anda&rdquo; berarti orang atau badan usaha yang membuat akun, memesan, atau memakai layanan kami. Dengan
          membuat akun atau melakukan pemesanan, Anda menyatakan telah membaca dan menyetujui Syarat &amp; Ketentuan ini.
        </p>
      </>
    ),
  },
  {
    id: 'akun',
    title: 'Akun',
    content: (
      <ul>
        <li>Untuk memesan template, Anda perlu membuat akun dengan nama, email, dan nomor WhatsApp yang benar dan aktif.</li>
        <li>
          Jaga kerahasiaan kata sandi Anda. Aktivitas yang dilakukan lewat akun Anda menjadi tanggung jawab Anda. Segera
          hubungi kami bila Anda menduga akun Anda dipakai orang lain.
        </li>
        <li>
          Kami dapat menangguhkan atau menutup akun yang dipakai untuk penipuan, penyalahgunaan sistem, atau pelanggaran
          hukum.
        </li>
        <li>
          Data pribadi yang Anda berikan dikelola sesuai{' '}
          <Link to={LEGAL_PATHS.privacy} className="link-site">
            Kebijakan Privasi
          </Link>
          .
        </li>
      </ul>
    ),
  },
  {
    id: 'pemesanan-template',
    title: 'Pemesanan template',
    content: (
      <>
        <p>Alur pemesanan template:</p>
        <ol>
          <li>
            Anda memilih template, mengisi data pemesan, lalu memilih nama domain. Ketersediaan domain dicek langsung di formulir
            pemesanan.
          </li>
          <li>
            Anda membayar harga template dan harga domain lewat Midtrans. Pesanan baru diproses setelah pembayaran dikonfirmasi
            oleh Midtrans.
          </li>
          <li>Tim kami memverifikasi pesanan, lalu menyetujui atau menolaknya.</li>
          <li>
            Pesanan yang disetujui masuk ke proses domain: kami mendaftarkan domain Anda. Setelah domain terpasang, situs aktif
            dan CMS terbuka di akun Anda.
          </li>
        </ol>
        <p>
          Status pesanan dapat Anda pantau di halaman{' '}
          <Link to="/akun" className="link-site">
            Akun Saya
          </Link>
          : Menunggu Pembayaran, Dibayar (Menunggu Approval), Disetujui (Proses Domain), Aktif, Ditolak, atau Dibatalkan.
        </p>
        <ul>
          <li>
            Pesanan yang belum dibayar dapat Anda batalkan sendiri dari halaman pesanan. Pesanan yang tidak dibayar sampai
            batas waktu pembayaran berakhir dibatalkan otomatis.
          </li>
          <li>
            Kami dapat menolak pesanan, misalnya bila domain yang dipesan tidak dapat didaftarkan, data pemesan tidak dapat
            diverifikasi, atau isi atau tujuan situs melanggar ketentuan ini. Alasan penolakan ditampilkan di halaman detail
            pesanan.
          </li>
          <li>
            Pesanan yang sudah dibayar lalu ditolak mendapat pengembalian dana penuh sesuai{' '}
            <Link to={LEGAL_PATHS.refund} className="link-site">
              Kebijakan Pengembalian Dana
            </Link>
            .
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'harga-pembayaran',
    title: 'Harga dan pembayaran',
    content: (
      <ul>
        <li>
          Harga template dan harga domain per ekstensi tercantum dalam rupiah di halaman <PricingLink />, halaman template, dan
          halaman pemesanan.
        </li>
        <li>
          Harga template <strong>sudah termasuk</strong>: template website dan setup awal, hosting, dan sertifikat SSL (HTTPS)
          untuk <strong>tahun pertama</strong>.
        </li>
        <li>
          Domain <strong>tidak termasuk</strong> harga template. Domain dipesan bersama template dengan harga per tahun sesuai
          ekstensinya (mis. .com atau .id), dan harganya ditambahkan ke total pesanan.
        </li>
        <li>
          Mulai tahun ke-2, biaya perpanjangan per tahun terdiri dari biaya hosting &amp; jasa ditambah harga domain sesuai
          ekstensinya, mengikuti harga di halaman <PricingLink /> pada saat Anda membayar perpanjangan.
        </li>
        <li>
          Pembayaran diproses oleh Midtrans dengan metode pembayaran yang tersedia di Midtrans. Kami tidak menerima atau
          menyimpan nomor kartu, PIN, maupun data login bank Anda.
        </li>
      </ul>
    ),
  },
  {
    id: 'domain-hosting',
    title: 'Domain, hosting, dan perpanjangan',
    content: (
      <ul>
        <li>
          Ketersediaan domain dicek saat Anda memesan. Hasil cek itu belum menjamin pendaftaran: kepastian akhirnya ada pada
          registri saat tim kami mendaftarkan domain setelah pembayaran. Bila domain ternyata tidak dapat didaftarkan, kami
          menghubungi Anda untuk menyepakati domain lain. Bila tidak tercapai kesepakatan, pesanan ditolak dan dana
          dikembalikan penuh, termasuk harga domain.
        </li>
        <li>
          Domain didaftarkan melalui registrar mitra kami dan tunduk pada aturan registrar serta pengelola domain (mis.
          PANDI untuk domain .id). Beberapa jenis domain, seperti .co.id, mensyaratkan dokumen tambahan; kami memberi tahu
          Anda bila dokumen itu dibutuhkan.
        </li>
        <li>Hosting dan sertifikat SSL kami sediakan dan kelola selama layanan Anda aktif.</li>
        <li>
          Masa aktif hosting dan domain berlaku satu tahun sejak situs diaktifkan. Tanggal berakhirnya dapat Anda lihat di
          halaman pesanan di Akun Saya.
        </li>
        <li>
          Perpanjangan dapat Anda lakukan sendiri dari halaman pesanan di Akun Saya, untuk 1, 2, atau 3 tahun sekaligus, dan
          dibayar lewat Midtrans. Masa aktif baru dihitung dari tanggal berakhir sebelumnya (atau dari tanggal pembayaran bila
          masa aktif sudah lewat), paling lama 10 tahun ke depan.
        </li>
        <li>Pengingat perpanjangan tampil di Akun Saya mulai 30 hari sebelum masa aktif berakhir.</li>
        <li>
          Bila biaya perpanjangan tidak dibayar sampai masa aktif berakhir, situs dapat dinonaktifkan sementara. Domain yang
          tidak diperpanjang dapat dilepas oleh registri setelah masa tenggang yang berlaku dan belum tentu bisa didaftarkan
          kembali.
        </li>
        <li>Bila Anda ingin memindahkan domain ke penyedia lain, hubungi kami. Kami membantu prosesnya sesuai aturan registrar.</li>
      </ul>
    ),
  },
  {
    id: 'isi-situs',
    title: 'Isi situs dan penggunaan CMS',
    content: (
      <>
        <p>
          Setelah situs aktif, Anda mengelola teks, gambar, dan pengaturan tampilan lewat CMS. Anda bertanggung jawab atas
          seluruh isi yang Anda unggah atau tampilkan, termasuk memastikan Anda berhak memakai teks, gambar, logo, dan merek
          tersebut.
        </p>
        <p>Situs tidak boleh dipakai untuk:</p>
        <ul>
          <li>isi yang melanggar hukum Republik Indonesia;</li>
          <li>penipuan, phishing, atau pengumpulan data orang lain tanpa izin;</li>
          <li>perjudian, pornografi, atau ujaran kebencian;</li>
          <li>pelanggaran hak cipta, merek, atau hak kekayaan intelektual lain;</li>
          <li>penyebaran malware atau spam.</li>
        </ul>
        <p>
          Kami dapat menonaktifkan situs yang melanggar larangan di atas atau atas perintah instansi yang berwenang. Bila
          memungkinkan, kami memberi tahu Anda lebih dulu.
        </p>
      </>
    ),
  },
  {
    id: 'hak-kekayaan-intelektual',
    title: 'Hak kekayaan intelektual',
    content: (
      <ul>
        <li>
          Desain, kode, dan komponen template tetap milik Garuda Nexa. Dengan membeli template, Anda mendapat hak pakai untuk
          satu situs pada domain pesanan Anda selama layanan aktif.
        </li>
        <li>Isi yang Anda masukkan (teks, gambar, logo, dan data) tetap milik Anda.</li>
        <li>Template tidak boleh disalin, dijual kembali, atau dipakai untuk situs lain tanpa izin tertulis dari kami.</li>
        <li>
          Kami dapat menampilkan nama dan tampilan situs Anda sebagai contoh karya. Beri tahu kami bila Anda tidak
          menghendakinya.
        </li>
      </ul>
    ),
  },
  {
    id: 'jasa-custom',
    title: 'Jasa website dan aplikasi mobile custom',
    content: (
      <ul>
        <li>Permintaan lewat formulir Pesan Custom atau WhatsApp bersifat gratis dan tidak mengikat.</li>
        <li>
          Lingkup pekerjaan, biaya, jadwal, tahapan pembayaran, revisi, dan kepemilikan kode sumber dituangkan dalam
          penawaran tertulis. Pengerjaan dimulai setelah Anda menyetujui penawaran tersebut.
        </li>
        <li>Bila penawaran yang Anda setujui mengatur hal yang berbeda dari ketentuan ini, penawaran itulah yang berlaku untuk proyek tersebut.</li>
      </ul>
    ),
  },
  {
    id: 'tanggung-jawab',
    title: 'Ketersediaan layanan dan batas tanggung jawab',
    content: (
      <ul>
        <li>
          Kami berupaya menjaga situs dan CMS tetap dapat diakses, tetapi gangguan dapat terjadi karena pemeliharaan,
          jaringan, atau layanan pihak ketiga seperti registrar, penyedia server, dan Midtrans.
        </li>
        <li>Simpan salinan teks dan gambar penting situs Anda sebagai cadangan.</li>
        <li>
          Sejauh diizinkan hukum, tanggung jawab kami atas kerugian yang timbul dari layanan template tidak melebihi jumlah
          yang Anda bayarkan untuk pesanan yang bersangkutan. Kami tidak bertanggung jawab atas kerugian tidak langsung,
          seperti kehilangan keuntungan.
        </li>
      </ul>
    ),
  },
  {
    id: 'perubahan',
    title: 'Perubahan ketentuan',
    content: (
      <p>
        Kami dapat memperbarui Syarat &amp; Ketentuan ini. Versi terbaru selalu tersedia di halaman ini dengan tanggal
        &ldquo;Terakhir diperbarui&rdquo;. Perubahan penting kami informasikan lewat email atau halaman akun. Pesanan yang sudah
        dibayar tetap mengikuti ketentuan yang berlaku pada saat pembayaran.
      </p>
    ),
  },
  {
    id: 'hukum',
    title: 'Hukum yang berlaku',
    content: (
      <p>
        Syarat &amp; Ketentuan ini tunduk pada hukum Republik Indonesia. Perselisihan diselesaikan lebih dulu secara
        musyawarah. Bila tidak tercapai kesepakatan, perselisihan diselesaikan melalui pengadilan negeri yang berwenang sesuai
        peraturan perundang-undangan.
      </p>
    ),
  },
];

export default function SyaratKetentuan() {
  return (
    <LegalPage
      page="terms"
      intro="Ketentuan penggunaan website garudanexa.com, pembelian template website, dan permintaan jasa website atau aplikasi mobile custom dari PT Garuda Nexa Bahtera."
      sections={SECTIONS}
    />
  );
}
