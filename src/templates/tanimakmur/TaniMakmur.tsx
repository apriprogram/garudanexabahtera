// Template "TaniMakmur" — "Ladang subur": toko online pertanian (benih, pupuk, pestisida organik, alat tani skala kecil)
// untuk petani muda dan penghobi urban farming. Hero = foto ladang hijau tua LAYAR PENUH dengan menu transparan, judul
// putih sangat besar, foto bulat berbingkai garis + lingkaran ajakan kuning, kartu kutipan, dan kartu angka (referensi
// Holganix), lalu strip keunggulan berjalan; halaman krem hangat ala Agroton: kategori bernomor, "pilih tanamanmu"
// (paket per tanaman di panel data hijau tua dengan jadwal tanam), produk terlaris berbintang ala Lifestyle dengan
// filter kategori, konsultasi penyuluh lewat WhatsApp, panduan, testimoni, tanya jawab, kontak, footer hijau tua.
// Datar tanpa bayangan; gerak tenang (mati di pratinjau CMS & prefers-reduced-motion); container query agar akurat di
// bingkai HP 390px dan panel CMS. Pemesanan lewat WhatsApp: tidak ada keranjang atau pembayaran online.
import { useMemo, useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { PhotoSetContext } from '../kit/context';
import { useKitFont } from '../kit/fonts';
import { Bundles } from './Bundles';
import { Categories } from './Categories';
import { Consult } from './Consult';
import { Contact } from './Contact';
import { TANI_ACCENT } from './defaultContent';
import { Faq } from './Faq';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { PageSelectionContext, ShopFilterContext } from './hooks';
import { readTani } from './model';
import { TANI_PHOTOS } from './photos';
import { Products } from './Products';
import { INTER_TIGHT } from './styles';
import { Testimonials } from './Testimonials';
import { Tips } from './Tips';
import './tanimakmur.css';

export default function TaniMakmur({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readTani(content);
  const fontStyle = useKitFont(INTER_TIGHT);
  const [category, setCategory] = useState('');
  const filter = useMemo(() => ({ category, setCategory }), [category]);
  // Tab paket tanam & pertanyaan FAQ terbuka hidup di sini agar hasil pencarian di menu bisa memilihnya
  const [bundle, setBundle] = useState(0);
  const [faq, setFaq] = useState<number | null>(0);
  const selection = useMemo(() => ({ bundle, setBundle, faq, setFaq }), [bundle, faq]);
  const heroOn = isEnabled(m.hero);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="inter" defaultAccent={TANI_ACCENT}>
      <PhotoSetContext.Provider value={TANI_PHOTOS}>
        <ShopFilterContext.Provider value={filter}>
          <PageSelectionContext.Provider value={selection}>
            <div style={{ ...fontStyle, ...m.colors }} className="relative bg-[#F6F2E3] text-[#18230F]">
              <Header m={m} overlay={heroOn} />
              <main>
                {heroOn && <Hero m={m} />}
                {isEnabled(m.categories) && <Categories m={m} />}
                {isEnabled(m.bundles) && <Bundles m={m} />}
                {isEnabled(m.products) && <Products m={m} />}
                {isEnabled(m.consult) && <Consult m={m} />}
                {isEnabled(m.tips) && <Tips m={m} />}
                {isEnabled(m.testimonials) && <Testimonials m={m} />}
                {isEnabled(m.faq) && <Faq m={m} />}
                {isEnabled(m.contact) && <Contact m={m} />}
              </main>
              {isEnabled(m.footer) && <Footer m={m} />}
            </div>
          </PageSelectionContext.Provider>
        </ShopFilterContext.Provider>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
