// Template "Sparring Padel" — "Night court energy": landing page lapangan padel dengan booking dan komunitas pemain.
// Header biru-malam padat dengan tombol pil neon "Book Now" yang selalu terlihat; hero FOTO LATAR selebar layar (pemain
// padel di lapangan biru gelap) dengan garis lapangan neon dalam perspektif yang digambar sekali dan bilah "Booking
// cepat" (tanggal, indoor/outdoor, jam, pemain → pesan WhatsApp); jadwal & harga per jam di papan biru-malam bertab;
// kartu lapangan indoor/outdoor di pita gelap; formulir cari lawan main dengan tangga level 1–7; daftar turnamen
// berubin tanggal; ubin harga sewa & coaching; pita komunitas dengan angka neon + strip kegiatan; galeri bertingkat;
// tanya jawab; lokasi + peta; footer biru-malam dengan garis lapangan. Saira 600/700 untuk judul, Inter isi, JetBrains
// Mono label "// JADWAL". Satu warna neon (bawaan #00D2B4), kartu radius 14, tombol pil, DATAR tanpa bayangan. Gerak
// khas (./sparring-padel.css) mati pada prefers-reduced-motion, cetak, dan pratinjau CMS. JUJUR: semua formulir hanya
// menyusun pesan WhatsApp ke admin — jadwal adalah contoh, tanpa pembayaran online, tanpa akun member. Container
// query agar akurat di bingkai HP 390px dan panel CMS. Demo: Sparring Padel, Kemang, Jakarta Selatan (fiktif).
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Contact, Faq } from './Closing';
import { Community, Gallery } from './Community';
import { Courts } from './Courts';
import { SPARRING_ACCENT } from './defaultContent';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { Matchmaking } from './Matchmaking';
import { readSparring } from './model';
import { SPARRING_PHOTOS } from './photos';
import { Schedule } from './Schedule';
import { SPARRING_FONT } from './styles';
import { Rental, Tournaments } from './Tournaments';
import './sparring-padel.css';

export default function SparringPadel({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readSparring(content);
  const fontStyle = useKitFont(SPARRING_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={SPARRING_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={SPARRING_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#0A1622]">
          <Header m={m} />
          <main>
            {isEnabled(m.hero) && <Hero m={m} />}
            {m.shown('schedule') && <Schedule m={m} />}
            {m.shown('courts') && <Courts m={m} />}
            {m.shown('matchmaking') && <Matchmaking m={m} />}
            {m.shown('tournaments') && <Tournaments m={m} />}
            {m.shown('rental') && <Rental m={m} />}
            {m.shown('community') && <Community m={m} />}
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
