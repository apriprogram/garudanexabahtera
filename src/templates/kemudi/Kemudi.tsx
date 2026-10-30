// Template "Kemudi" — "Clean dashboard": rental mobil lepas kunci & dengan sopir. Putih dan abu dingin #F2F4F7
// bergantian, satu pita grafit (film proses) + footer grafit, biru elektrik sebagai sorotan UI, judul Hanken Grotesk
// rapat, spesifikasi & harga JetBrains Mono, tombol rounded-2xl, kartu radius 24, DATAR tanpa bayangan, wadah PENUH
// selebar layar. Urutan (jalur keputusan pengunjung): hero "drive" (foto udara mobil + kartu pesan: layanan, mobil,
// jadwal, perkiraan harga → WhatsApp) → armada (saringan kelas, harga per layanan, ilustrasi SVG per kelas) → film
// proses yang diputar dengan menggulir (MPV cetak biru tergambar → terisi & dicek → keterangan → berangkat) → tabel harga
// → syarat sewa (tab) → antar-jemput (zona + peta kota abstrak) → cara sewa → ulasan → tanya jawab → garasi & kontak →
// footer. Kartu pesan di hero, kontrol layanan di armada, dan tombol "Pesan" di kartu mobil berbagi keadaan lewat Page.
// Gerak khas (./kemudi.css) mati pada prefers-reduced-motion, cetak, dan pratinjau CMS. Demo: Kemudi Rent Car (fiktif).
import { useRef, useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { usePrefersReducedMotion } from '../shared/motion';
import { useTemplateRuntime } from '../shared/runtime';
import { TemplateShell } from '../shared/Shell';
import { isEnabled, type LinkAction } from '../shared/utils';
import { Contact, Faq, Testimonials } from './Closing';
import { KEMUDI_ACCENT } from './defaultContent';
import { Delivery } from './Delivery';
import { Film } from './Film';
import { Fleet } from './Fleet';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { defaultBooking, readKemudi, withCar, withMode, type Booking, type KemudiModel, type RentalMode } from './model';
import { KEMUDI_PHOTOS } from './photos';
import { Pricing } from './Pricing';
import { Requirements } from './Requirements';
import { Steps } from './Steps';
import { KEMUDI_FONT } from './styles';
import './kemudi.css';

/** Section sesudah film (tujuan tautan "Lewati animasi"). */
const AFTER_FILM = ['pricing', 'requirements', 'delivery', 'steps', 'testimonials', 'faq', 'contact'];

function Page({ m }: { m: KemudiModel }) {
  const { goTo } = useTemplateRuntime();
  const reduced = usePrefersReducedMotion();
  const [booking, setBooking] = useState<Booking>(() => defaultBooking(m.cars));
  const formRef = useRef<HTMLFormElement>(null);
  const heroShown = isEnabled(m.hero);
  const nextKey = AFTER_FILM.find((key) => m.shown(key));
  const afterFilm: LinkAction | null = nextKey ? { kind: 'section', target: nextKey } : isEnabled(m.footer) ? { kind: 'section', target: 'footer' } : null;

  const setMode = (mode: RentalMode) => setBooking((b) => withMode(b, mode, m.cars));
  /**
   * Tombol "Pesan" di kartu mobil: isi kartu pesan, gulir ke KARTUNYA (bukan ke atas hero: di HP & tablet kartu ada di
   * bawah teks hero, jadi mobil, jadwal, harga, dan tombol WhatsApp harus ikut terlihat), lalu fokus ke isian pertama.
   */
  const book = (index: number) => {
    setBooking((b) => withCar(b, index, m.cars));
    const form = formRef.current;
    if (form) form.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    else goTo('hero');
    // Setelah gulir dimulai: fokus ke isian pertama kartu pesan (pilihan layanan), tanpa menggulir ulang
    window.setTimeout(() => formRef.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus({ preventScroll: true }), 60);
  };

  return (
    <>
      <Header m={m} />
      <main>
        {heroShown && <Hero m={m} booking={booking} setBooking={setBooking} formRef={formRef} />}
        {m.shown('fleet') && <Fleet m={m} mode={booking.mode} onMode={setMode} onBook={book} />}
        {m.shown('film') && <Film m={m} next={afterFilm} />}
        {m.shown('pricing') && <Pricing m={m} />}
        {m.shown('requirements') && <Requirements m={m} />}
        {m.shown('delivery') && <Delivery m={m} />}
        {m.shown('steps') && <Steps m={m} />}
        {m.shown('testimonials') && <Testimonials m={m} />}
        {m.shown('faq') && <Faq m={m} />}
        {m.shown('contact') && <Contact m={m} />}
      </main>
      {isEnabled(m.footer) && <Footer m={m} />}
    </>
  );
}

export default function Kemudi({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readKemudi(content);
  const fontStyle = useKitFont(KEMUDI_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={KEMUDI_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={KEMUDI_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#0D1117]">
          <Page m={m} />
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
