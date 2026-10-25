// Template "PuncakGear" — "Summit poster": toko perlengkapan mendaki (tenda, carrier, sleeping bag, sepatu gunung,
// perlengkapan darurat) dengan dua pembeda: panduan per gunung berisi daftar perlengkapan yang bisa dicentang, dan sewa
// alat untuk pemula dengan kalkulator hari. Hero = foto pendaki LAYAR PENUH dengan menu transparan, judul huruf kapital
// raksasa, tombol pil hijau limau, kartu produk putih, kalimat besar + satu angka; lalu kategori, produk terlaris
// (filter), panduan gunung, sewa (bagian gelap), tips keselamatan, cerita pendaki, tanya jawab, basecamp, footer gelap.
// Judul Archivo, kartu tanpa bayangan, garis kontur topografi SVG, gerak tenang (mati di pratinjau CMS &
// prefers-reduced-motion), container query agar akurat di bingkai HP 390px dan panel CMS.
//
// State lintas section (sisi klien): filter kategori produk (dari kartu Kategori, chip, atau pencarian) dan gunung yang
// dipilih di Panduan (dari kartu atau pencarian).
import { useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { PhotoSetContext } from '../kit/context';
import { useKitFont } from '../kit/fonts';
import { Categories } from './Categories';
import { Contact } from './Contact';
import { PUNCAK_ACCENT } from './defaultContent';
import { Faq } from './Faq';
import { Footer } from './Footer';
import { Guides } from './Guides';
import { Header } from './Header';
import { Hero } from './Hero';
import { readPuncak, type SearchEntry } from './model';
import { PUNCAK_PHOTOS } from './photos';
import { Products } from './Products';
import { Rental } from './Rental';
import { Safety } from './Safety';
import { Stories } from './Stories';
import { ARCHIVO } from './styles';
import './puncakgear.css';

export default function PuncakGear({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readPuncak(content);
  const fontStyle = useKitFont(ARCHIVO);
  const [filter, setFilter] = useState('');
  const [guide, setGuide] = useState(0);
  const heroOn = isEnabled(m.hero);
  const categoriesOn = isEnabled(m.categories);
  const pick = (entry: SearchEntry) => {
    if (entry.guide !== undefined) setGuide(entry.guide);
    if (entry.category !== undefined) setFilter(entry.category);
  };
  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="inter" defaultAccent={PUNCAK_ACCENT}>
      <PhotoSetContext.Provider value={PUNCAK_PHOTOS}>
        <div style={{ ...fontStyle, ...m.colors }} className="relative text-[#0E1512]">
          <Header m={m} overlay={heroOn} onPick={pick} />
          <main>
            {heroOn && <Hero m={m} />}
            {categoriesOn && <Categories m={m} onFilter={setFilter} />}
            {isEnabled(m.products) && <Products m={m} filter={filter} onFilter={setFilter} tight={categoriesOn} />}
            {isEnabled(m.guides) && <Guides m={m} selected={guide} onSelect={setGuide} />}
            {isEnabled(m.rental) && <Rental m={m} />}
            {isEnabled(m.safety) && <Safety m={m} />}
            {isEnabled(m.testimonials) && <Stories m={m} />}
            {isEnabled(m.faq) && <Faq m={m} />}
            {isEnabled(m.contact) && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
