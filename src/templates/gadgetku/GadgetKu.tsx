// Template "GadgetKu.id" — "Clean store": toko online aksesori HP (casing, tempered glass, charger, kabel, earphone,
// power bank). Bilah pengumuman + menu putih lengket, hero kartu gelap dengan foto produk dan kartu putih melayang,
// lalu pembeda toko: cari aksesori per tipe HP, kategori foto besar, baris produk terbaru dengan penyaring, bundling
// hemat, custom casing dengan foto sendiri (pratinjau di browser), strip layanan gelap, ulasan, tanya jawab, kontak &
// marketplace, footer gelap. Judul Inter Tight, ubin abu datar tanpa bayangan, gerak tenang (mati di pratinjau CMS &
// prefers-reduced-motion), container query agar akurat di bingkai HP 390px dan panel CMS.
//
// Pilihan pengunjung dibagi antar section lewat `shop`: tipe HP (Cari per tipe HP ↔ pencarian header ↔ custom casing)
// dan kategori (kartu Kategori ↔ chip Produk ↔ footer).
import { useMemo, useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { PhotoSetContext } from '../kit/context';
import { useKitFont } from '../kit/fonts';
import { Bundles } from './Bundles';
import { Categories } from './Categories';
import { Contact } from './Contact';
import { CustomCase } from './CustomCase';
import { GADGETKU_ACCENT } from './defaultContent';
import { Faq } from './Faq';
import { Finder } from './Finder';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { readGadgetku, type Shop } from './model';
import { GADGETKU_PHOTOS } from './photos';
import { Perks } from './Perks';
import { Products } from './Products';
import { Reviews } from './Reviews';
import { INTER_TIGHT } from './styles';
import './gadgetku.css';

export default function GadgetKu({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readGadgetku(content);
  const fontStyle = useKitFont(INTER_TIGHT);
  const [phoneId, pickPhone] = useState('');
  const [category, pickCategory] = useState('');
  const shop = useMemo<Shop>(() => ({ phoneId, pickPhone, category, pickCategory }), [phoneId, category]);

  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="inter" defaultAccent={GADGETKU_ACCENT}>
      <PhotoSetContext.Provider value={GADGETKU_PHOTOS}>
        <div style={{ ...fontStyle, ...m.colors }} className="relative text-[#0B0C0E]">
          <Header m={m} shop={shop} />
          <main>
            {isEnabled(m.hero) && <Hero m={m} />}
            {isEnabled(m.finder) && <Finder m={m} shop={shop} />}
            {isEnabled(m.categories) && <Categories m={m} shop={shop} />}
            {isEnabled(m.products) && <Products m={m} shop={shop} />}
            {isEnabled(m.bundles) && <Bundles m={m} />}
            {isEnabled(m.custom) && <CustomCase m={m} shop={shop} />}
            {isEnabled(m.perks) && <Perks m={m} />}
            {isEnabled(m.testimonials) && <Reviews m={m} />}
            {isEnabled(m.faq) && <Faq m={m} />}
            {isEnabled(m.contact) && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} shop={shop} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
