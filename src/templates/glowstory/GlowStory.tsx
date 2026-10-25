// Template "GlowStory" — "Warm ritual": toko online kecantikan (skincare, makeup, perawatan tubuh dari brand lokal).
// Halaman krem hangat bergaya katalog keramik: hero kolase foto dengan judul serif berkata miring terakota, strip
// berjalan gelap, kategori, produk terlaris (saring kategori + keranjang → pesanan WhatsApp), kuis jenis kulit yang
// menyusun rutinitas pagi & malam, langganan isi ulang dengan hitungan hemat, ulasan berfoto, strip brand lokal,
// tanya jawab, pita ajakan terakota, kontak, footer cokelat tua. Tanpa bayangan; gerak tenang (mati di pratinjau CMS &
// prefers-reduced-motion); container query agar akurat di bingkai HP 390px dan panel CMS.
import { useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { TemplateShell } from '../shared/Shell';
import { field, isEnabled, list } from '../shared/utils';
import { PhotoSetContext } from '../kit/context';
import { useKitFont } from '../kit/fonts';
import { Brands } from './Brands';
import { Categories } from './Categories';
import { Contact, Cta } from './Closing';
import { GLOWSTORY_ACCENT } from './defaultContent';
import { Faq } from './Faq';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { readGlowStory } from './model';
import { Perks } from './Perks';
import { GLOWSTORY_PHOTOS } from './photos';
import { Products } from './Products';
import { Quiz } from './Quiz';
import { Refill } from './Refill';
import { Reviews } from './Reviews';
import { OverlayHost, StoreProvider } from './store';
import { INSTRUMENT } from './styles';
import './glowstory.css';

export default function GlowStory({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readGlowStory(content);
  const fontStyle = useKitFont(INSTRUMENT);
  // Kategori yang dipilih di section Kategori ikut menyaring Produk terlaris ("" = semua)
  const [category, setCategory] = useState('');
  const categoriesShown = isEnabled(m.categories) && list(m.categories, 'items', 4).some((item) => field(item, 'name'));
  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="inter" defaultAccent={GLOWSTORY_ACCENT}>
      <PhotoSetContext.Provider value={GLOWSTORY_PHOTOS}>
        <StoreProvider>
          <div style={{ ...fontStyle, ...m.colors }} className="relative bg-[#F6F1EA] text-[#2B211C]">
            <OverlayHost m={m} />
            <Header m={m} />
            <main>
              {isEnabled(m.hero) && <Hero m={m} />}
              {isEnabled(m.perks) && <Perks m={m} />}
              {categoriesShown && <Categories m={m} onPick={setCategory} />}
              {isEnabled(m.products) && <Products m={m} category={category} onCategory={setCategory} follows={categoriesShown} />}
              {isEnabled(m.quiz) && <Quiz m={m} />}
              {isEnabled(m.refill) && <Refill m={m} />}
              {isEnabled(m.testimonials) && <Reviews m={m} />}
              {isEnabled(m.brands) && <Brands m={m} />}
              {isEnabled(m.faq) && <Faq m={m} />}
              {isEnabled(m.cta) && <Cta m={m} />}
              {isEnabled(m.contact) && <Contact m={m} />}
            </main>
            {isEnabled(m.footer) && <Footer m={m} />}
          </div>
        </StoreProvider>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
