// Template "Pesiar" — "Island editorial": private tour Bali & sewa mobil dengan sopir + antar-jemput bandara. Majalah
// perjalanan yang tenang: pasir #F5EFE6 dan putih bergantian, SATU dunia hijau tua #17332B (panel Rancang tur, film,
// footer), judul Playfair Display besar, isi Inter, satu warna aksen bougainvillea, kartu foto tegak radius 28, tombol
// pil, DATAR tanpa bayangan, wadah PENUH kiri-kanan. Urutan (jalur keputusan pengunjung): hero "vista" (foto Bali
// selebar layar, judul tengah, dua tombol, bilah kaca tiga keunggulan) → tur sehari (kartu foto, pesan / ubah rute) →
// rancang tur sendiri (pilih ≤ 5 tempat, perkiraan jam & harga per mobil → WhatsApp) → FILM peta Bali yang bergerak saat
// digulir (./Film.tsx) → sudah/belum termasuk (isi harga paket tur) → mobil & sopir (gambar garis, inisial) →
// antar-jemput bandara (produk kedua: tabel harga + formulir → WhatsApp) → cerita tamu → tanya jawab → kontak + peta →
// footer dengan strip panorama. Tombol "Ubah rute"
// di kartu tur mengisi Rancang tur lewat komponen Page di bawah. Gerak (./pesiar.css): Ken Burns hero sekali, film
// digerakkan gulir, garis mobil tergambar sekali, daftar rute bergeser masuk; mati pada prefers-reduced-motion, cetak,
// dan pratinjau CMS. JUJUR: formulir hanya menyusun pesan WhatsApp; harga contoh per mobil; tanpa pembayaran online,
// e-tiket, atau pelacakan penerbangan. Demo: Pesiar Bali (fiktif), Denpasar.
import { useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { useTemplateRuntime } from '../shared/runtime';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Cars } from './Cars';
import { Contact, Faq } from './Closing';
import { PESIAR_ACCENT } from './defaultContent';
import { Film } from './Film';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { readPesiar, stopsFromTour, type PesiarModel, type Tour } from './model';
import { PESIAR_PHOTOS } from './photos';
import { Planner } from './Planner';
import { Included, Testimonials } from './Stories';
import { PESIAR_FONT } from './styles';
import { Tours } from './Tours';
import { Transfer } from './Transfer';
import './pesiar.css';

function Page({ m }: { m: PesiarModel }) {
  const { goTo } = useTemplateRuntime();
  const plannerShown = m.shown('planner');
  // Rancang tur dibuka dengan tiga tempat pertama tur pertama sebagai contoh (masih bisa ditambah/diubah); "Ubah rute"
  // di kartu tur menggantinya dengan seluruh tempat tur itu
  const [stops, setStops] = useState<string[]>(() => (m.tourList[0] ? stopsFromTour(m.tourList[0], m.destinations).slice(0, 3) : []));
  const [focusKey, setFocusKey] = useState(0);
  const heroShown = isEnabled(m.hero);

  const editRoute = (tour: Tour) => {
    setStops(stopsFromTour(tour, m.destinations));
    setFocusKey((k) => k + 1);
    goTo('planner');
  };

  return (
    <>
      <Header m={m} overlay={heroShown} />
      <main>
        {heroShown && <Hero m={m} />}
        {m.shown('tours') && <Tours m={m} onEdit={plannerShown ? editRoute : null} />}
        {plannerShown && <Planner m={m} stops={stops} setStops={setStops} focusKey={focusKey} />}
        {m.shown('film') && <Film m={m} />}
        {m.shown('included') && <Included m={m} />}
        {m.shown('cars') && <Cars m={m} />}
        {m.shown('transfer') && <Transfer m={m} />}
        {m.shown('testimonials') && <Testimonials m={m} />}
        {m.shown('faq') && <Faq m={m} />}
        {m.shown('contact') && <Contact m={m} />}
      </main>
      {isEnabled(m.footer) && <Footer m={m} />}
    </>
  );
}

export default function Pesiar({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readPesiar(content);
  const fontStyle = useKitFont(PESIAR_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={PESIAR_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={PESIAR_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative overflow-x-clip bg-[#F5EFE6] text-[#1E2622]">
          <Page m={m} />
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
