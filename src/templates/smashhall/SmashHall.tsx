// Template "SmashHall" — "Clean sport white": website GOR & klub badminton dengan booking lewat WhatsApp, member
// bulanan, jadwal latihan & pelatih, akademi, kejuaraan, dan toko perlengkapan. Halaman putih + pasir hangat, SATU warna
// tema merah-oranye, tinta hampir hitam, judul Sora, ikon kok garis sebagai penanda. Hero "rally": foto GOR yang terang
// sebagai LATAR (lapisan putih dari kiri, teks gelap) dengan strip kaca ketersediaan 8 lapangan hari ini; lalu tabel
// ketersediaan lapangan × jam yang bisa dipilih (booking menyusun pesan WhatsApp), fasilitas dengan angka besar, kartu
// paket member (periode bulanan / 3 bulan), jadwal latihan + pelatih berinisial, akademi per usia, SATU pita gelap
// kejuaraan dengan garis waktu, toko perlengkapan, galeri mosaik, tanya jawab, kontak + formulir booking, dan footer
// putih bergaris warna tema. DATAR tanpa bayangan. Gerak khas (./smashhall.css): kok "di-smash" melengkung dan mendarat
// di strip, pil ketersediaan terisi bergelombang; mati pada prefers-reduced-motion, cetak, dan pratinjau CMS.
// JUJUR: jadwal = contoh dari CMS, tidak ada pembayaran online, akun member, atau keranjang belanja. Demo: GOR
// SmashHall, Bandung (fiktif).
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Availability } from './Availability';
import { Championships } from './Championships';
import { Contact } from './Contact';
import { SMASHHALL_ACCENT } from './defaultContent';
import { Facilities } from './Facilities';
import { Faq } from './Faq';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { Membership } from './Membership';
import { readSmashhall } from './model';
import { SMASHHALL_PHOTOS } from './photos';
import { Gallery, Shop } from './Shop';
import { SMASHHALL_FONT } from './styles';
import { Academy, Training } from './Training';
import './smashhall.css';

export default function SmashHall({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readSmashhall(content);
  const fontStyle = useKitFont(SMASHHALL_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={SMASHHALL_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={SMASHHALL_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#171512]">
          <Header m={m} />
          <main>
            {isEnabled(m.hero) && <Hero m={m} />}
            {m.shown('availability') && <Availability m={m} />}
            {m.shown('facilities') && <Facilities m={m} />}
            {m.shown('membership') && <Membership m={m} />}
            {m.shown('training') && <Training m={m} />}
            {m.shown('academy') && <Academy m={m} />}
            {m.shown('championships') && <Championships m={m} />}
            {m.shown('shop') && <Shop m={m} />}
            {m.shown('gallery') && <Gallery m={m} />}
            {m.shown('faq') && <Faq m={m} />}
            {isEnabled(m.contact) && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
