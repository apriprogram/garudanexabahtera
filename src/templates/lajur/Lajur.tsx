// Template "Lajur" — "Bold livery": website PO sewa bus pariwisata (charter rombongan sekolah, kantor, keluarga). Putih
// dan abu hangat #F3F2EE bergantian, SATU pita tinta (film) + footer tinta, amber sebagai isian (tombol, livery bus,
// marka lajur), huruf judul Unbounded yang lebar, isi Inter, tombol persegi radius 6, kartu radius 10 bergaris rambut,
// DATAR tanpa bayangan, wadah PENUH selebar layar (WRAP tanpa max-width). Urutan mengikuti jalan keputusan pengunjung:
// hero "coach" (foto jalan pegunungan selebar layar + bilah minta penawaran dengan rekomendasi armada) → armada (tab per
// jenis bus, gambar bus SVG berlivery, denah kursi) → kalkulator rombongan (penggeser peserta → kombinasi bus) → FILM
// sehari perjalanan yang diputar oleh gulir (fajar → malam, berhenti di rest area & tujuan) → tujuan favorit → harga
// termasuk → cara sewa → testimoni → galeri selebar layar → FAQ → kontak & garasi + peta → footer. Bilah penawaran di
// hero dan tombol "Pilih bus ini" di armada berbagi keadaan lewat komponen Page. Semua formulir hanya MENYUSUN pesan
// WhatsApp (tanpa pembayaran online, tanpa ketersediaan real-time). Gerak (./lajur.css) mati pada prefers-reduced-motion,
// cetak, dan pratinjau CMS (film jadi poster diam + daftar bab). Demo: Lajur Trans Wisata, Semarang (fiktif).
import { useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Contact, Faq } from './Closing';
import { Convoy } from './Convoy';
import { LAJUR_ACCENT } from './defaultContent';
import { Film } from './Film';
import { Fleet } from './Fleet';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { EMPTY_QUOTE, readLajur, type LajurModel, type QuoteForm } from './model';
import { LAJUR_PHOTOS } from './photos';
import { Included, Steps } from './Plan';
import { Routes } from './Routes';
import { Gallery, Testimonials } from './Stories';
import { LAJUR_FONT } from './styles';
import './lajur.css';

function Page({ m }: { m: LajurModel }) {
  const [form, setForm] = useState<QuoteForm>(EMPTY_QUOTE);
  const [preferred, setPreferred] = useState<number | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);
  const heroShown = m.shown('hero');

  /**
   * "Pilih bus ini": bilah penawaran hanya memakai jenis bus itu; bilah sendiri yang menggulir dirinya ke tengah layar
   * dan memfokuskan jumlah peserta (./Quote, focusSignal) — di HP bilah ada di bawah teks hero, bukan di awal halaman.
   */
  const choose = (index: number) => {
    setPreferred(index);
    setFocusSignal((n) => n + 1);
  };

  return (
    <>
      <Header m={m} />
      <main>
        {heroShown && <Hero m={m} form={form} setForm={setForm} preferred={preferred} setPreferred={setPreferred} focusSignal={focusSignal} />}
        {m.shown('fleet') && <Fleet m={m} onChoose={choose} />}
        {m.shown('convoy') && <Convoy m={m} />}
        {m.shown('film') && <Film m={m} />}
        {m.shown('routes') && <Routes m={m} />}
        {m.shown('included') && <Included m={m} />}
        {m.shown('steps') && <Steps m={m} />}
        {m.shown('testimonials') && <Testimonials m={m} />}
        {m.shown('gallery') && <Gallery m={m} />}
        {m.shown('faq') && <Faq m={m} />}
        {m.shown('contact') && <Contact m={m} />}
      </main>
      {isEnabled(m.footer) && <Footer m={m} />}
    </>
  );
}

export default function Lajur({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readLajur(content);
  const fontStyle = useKitFont(LAJUR_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={LAJUR_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={LAJUR_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#14161A]">
          <Page m={m} />
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
