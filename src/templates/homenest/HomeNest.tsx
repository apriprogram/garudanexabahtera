// Template "HomeNest" — "Quiet luxury": katalog & penjualan rumah (developer / agen properti / pemasaran perumahan).
// Krem dan putih hangat bergantian dengan dua pita hijau tua (tur virtual, footer), judul Cormorant Garamond besar, isi
// Inter, sudut persegi, garis rambut, DATAR tanpa bayangan. Urutan: hero "estate" (foto rumah sebagai latar penuh, header
// transparan di atasnya, H1 rata tengah, panel cari rumah krem di tepi bawah foto) → daftar rumah dengan saringan
// lokasi/tipe/harga + urutan → tur virtual (tab ruang + tombol putar ke tautan tur pembeli) → simulasi KPR (anuitas,
// bunga tetap; perkiraan, bukan penawaran bank) → profil developer (garis rumah tergambar sekali, angka, proyek, nilai)
// → fasilitas kawasan → cerita pembeli → agen & formulir jadwal kunjungan (menyusun pesan WhatsApp; data tidak disimpan
// di website) → tanya jawab → kantor pemasaran + peta → footer. Panel cari di hero dan tombol "Simulasi KPR" di kartu
// rumah berbagi keadaan dengan daftar rumah / kalkulator lewat komponen Page di bawah. Gerak khas (./homenest.css): Ken
// Burns pelan pada foto hero, kartu rumah muncul setelah saringan diganti, angka KPR bergerak, garis rumah tergambar;
// mati pada prefers-reduced-motion, cetak, dan pratinjau CMS. Demo: HomeNest oleh PT Sarang Hunian Lestari (fiktif).
import { useRef, useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { useTemplateRuntime } from '../shared/runtime';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Agents } from './Agents';
import { Contact, Faq } from './Closing';
import { HOMENEST_ACCENT } from './defaultContent';
import { Amenities, Developer } from './Estate';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { Kpr } from './Kpr';
import { Listings } from './Listings';
import { DEFAULT_FILTERS, readHomeNest, type HomeNestModel, type ListingFilters } from './model';
import { HOMENEST_PHOTOS } from './photos';
import { Testimonials } from './Stories';
import { HOMENEST_FONT } from './styles';
import { Tour } from './Tour';
import './homenest.css';

function Page({ m }: { m: HomeNestModel }) {
  const { goTo } = useTemplateRuntime();
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const [changed, setChanged] = useState(false);
  const [kprPrice, setKprPrice] = useState<number | null>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const heroShown = isEnabled(m.hero);

  const applyFilters = (next: ListingFilters) => {
    setFilters(next);
    setChanged(true);
  };
  const search = (draft: Pick<ListingFilters, 'city' | 'type' | 'range'>) => {
    applyFilters({ ...filters, ...draft });
    goTo('listings');
    // Setelah gulir dimulai: fokus ke jumlah hasil (dibacakan pembaca layar), tanpa menggulir ulang
    window.setTimeout(() => status.current?.focus({ preventScroll: true }), 60);
  };
  const simulate = (price: number) => {
    setKprPrice(price);
    goTo('kpr');
  };

  return (
    <>
      <Header m={m} overlay={heroShown} />
      <main>
        {heroShown && <Hero m={m} filters={filters} onSearch={search} />}
        {m.shown('listings') && <Listings m={m} filters={filters} setFilters={applyFilters} changed={changed} statusRef={status} onSimulate={simulate} />}
        {m.shown('tour') && <Tour m={m} />}
        {m.shown('kpr') && <Kpr m={m} price={kprPrice} onPrice={setKprPrice} />}
        {m.shown('developer') && <Developer m={m} />}
        {m.shown('amenities') && <Amenities m={m} />}
        {m.shown('testimonials') && <Testimonials m={m} />}
        {m.shown('agents') && <Agents m={m} />}
        {m.shown('faq') && <Faq m={m} />}
        {m.shown('contact') && <Contact m={m} />}
      </main>
      {isEnabled(m.footer) && <Footer m={m} />}
    </>
  );
}

export default function HomeNest({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readHomeNest(content);
  const fontStyle = useKitFont(HOMENEST_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={HOMENEST_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={HOMENEST_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-[#FBF9F4] text-[#1E2A24]">
          <Page m={m} />
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
