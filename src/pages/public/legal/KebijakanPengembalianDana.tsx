// /kebijakan-pengembalian-dana. DRAF untuk ditinjau pemilik (2026-10-21). Keputusan pemilik: pesanan LUNAS yang ditolak
// (mis. domain tidak tersedia) → pengembalian dana PENUH ke metode pembayaran semula paling lambat 7 hari kerja setelah
// penolakan. Bagian lain (pembatalan setelah disetujui, situs aktif, cadangan rekening) disusun dari alur status pesanan
// dan perlu dikonfirmasi pemilik. Ubah LEGAL_UPDATED_AT di src/lib/legal.ts setiap kali isinya diubah.
// 2026-10-25: domain dibayar terpisah dari template (ACCOUNT-DOMAIN-RENEWAL-SPEC.md), jadi pengembalian penuh mencakup
// harga template dan domain; tagihan perpanjangan (1–3 tahun) dibayar dari akun dan bisa dibatalkan sebelum dibayar.
import { Link } from 'react-router-dom';
import { LEGAL_PATHS } from '../../../lib/legal';
import { LegalPage, type LegalSection } from './LegalPage';

const SECTIONS: LegalSection[] = [
  {
    id: 'ringkasan',
    title: 'Ringkasan',
    content: (
      <ul>
        <li>
          <strong>Belum dibayar:</strong> tidak ada dana yang ditarik. Anda bisa membatalkan pesanan kapan saja dari halaman
          pesanan.
        </li>
        <li>
          <strong>Sudah dibayar lalu ditolak</strong> (mis. domain tidak dapat didaftarkan): dana dikembalikan{' '}
          <strong>penuh</strong> ke metode pembayaran semula, paling lambat <strong>7 hari kerja</strong> setelah pesanan
          ditolak. Jumlahnya mencakup harga template dan harga domain.
        </li>
        <li>
          <strong>Sudah disetujui atau aktif:</strong> pesanan tidak dapat dibatalkan, karena domain, hosting, dan SSL sudah
          mulai didaftarkan untuk situs Anda.
        </li>
      </ul>
    ),
  },
  {
    id: 'belum-dibayar',
    title: 'Pesanan yang belum dibayar',
    content: (
      <p>
        Selama status pesanan masih Menunggu Pembayaran, Anda dapat membatalkannya sendiri dari halaman detail pesanan di{' '}
        <Link to="/akun" className="link-site">
          Akun Saya
        </Link>
        . Pesanan yang tidak dibayar sampai batas waktu pembayaran berakhir dibatalkan otomatis. Tidak ada biaya yang ditarik
        dari Anda.
      </p>
    ),
  },
  {
    id: 'pesanan-ditolak',
    title: 'Pesanan lunas yang ditolak',
    content: (
      <>
        <p>Kami dapat menolak pesanan yang sudah dibayar, misalnya karena:</p>
        <ul>
          <li>
            domain yang Anda pesan ternyata tidak dapat didaftarkan saat kami mendaftarkannya ke registri, dan tidak tercapai
            kesepakatan tentang domain lain;
          </li>
          <li>data pemesan tidak dapat diverifikasi;</li>
          <li>
            isi atau tujuan situs melanggar{' '}
            <Link to={LEGAL_PATHS.terms} className="link-site">
              Syarat &amp; Ketentuan
            </Link>
            .
          </li>
        </ul>
        <p>
          Alasan penolakan ditampilkan di halaman detail pesanan. Anda tidak perlu mengajukan permintaan: dana dikembalikan{' '}
          <strong>penuh, tanpa potongan</strong>, ke metode pembayaran yang Anda pakai, paling lambat{' '}
          <strong>7 hari kerja setelah pesanan ditolak</strong>. Jumlah yang dikembalikan sama dengan total yang Anda bayar:
          harga template (setelah diskon, bila ada) ditambah harga domain.
        </p>
        <ul>
          <li>
            Untuk kartu kredit, pengembalian dapat tampil sebagai pengurangan tagihan pada periode berikutnya, sesuai kebijakan
            bank penerbit.
          </li>
          <li>
            Bila metode pembayaran semula tidak mendukung pengembalian langsung (mis. beberapa jenis transfer bank), kami
            menghubungi Anda untuk meminta rekening tujuan atas nama pemesan. Jangka waktu 7 hari kerja dihitung sejak data
            rekening kami terima.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'pembatalan',
    title: 'Pembatalan setelah pembayaran',
    content: (
      <ul>
        <li>
          Pesanan yang sudah dibayar tidak dapat dibatalkan sendiri lewat akun. Bila status pesanan masih Dibayar (Menunggu
          Approval) dan Anda ingin membatalkannya, hubungi kami. Pesanan dibatalkan lewat penolakan, dan dana dikembalikan
          penuh dengan cara dan jangka waktu yang sama seperti di atas.
        </li>
        <li>
          Setelah pesanan disetujui (Disetujui, Proses Domain), pesanan tidak dapat dibatalkan, karena domain mulai didaftarkan
          untuk situs Anda dan biaya pendaftarannya tidak dapat ditarik kembali.
        </li>
      </ul>
    ),
  },
  {
    id: 'situs-aktif',
    title: 'Situs aktif dan perpanjangan',
    content: (
      <ul>
        <li>
          Biaya pesanan untuk situs yang sudah aktif tidak dapat dikembalikan. Bila situs Anda mengalami kendala, hubungi kami
          dan kami bantu memperbaikinya.
        </li>
        <li>
          Tagihan perpanjangan (mulai tahun ke-2) yang belum dibayar dapat Anda batalkan sendiri dari halaman pesanan, tanpa
          biaya.
        </li>
        <li>
          Biaya perpanjangan hosting &amp; jasa serta domain yang sudah dibayar berlaku untuk masa perpanjangan yang Anda pilih
          (1, 2, atau 3 tahun) dan tidak dapat dikembalikan, karena domain langsung diperpanjang di registri.
        </li>
        <li>
          Bila pembayaran masuk untuk tagihan perpanjangan yang sudah dibatalkan atau sudah lunas, dana tersebut kami
          kembalikan penuh ke metode pembayaran semula.
        </li>
      </ul>
    ),
  },
  {
    id: 'jasa-custom',
    title: 'Jasa website dan aplikasi mobile custom',
    content: (
      <p>
        Pengembalian dana untuk proyek custom mengikuti ketentuan pembayaran dan pembatalan di penawaran atau perjanjian proyek
        yang Anda setujui.
      </p>
    ),
  },
];

export default function KebijakanPengembalianDana() {
  return (
    <LegalPage
      page="refund"
      intro="Kapan dana pembelian template dikembalikan, berapa jumlahnya, ke mana, dan berapa lama prosesnya."
      sections={SECTIONS}
    />
  );
}
