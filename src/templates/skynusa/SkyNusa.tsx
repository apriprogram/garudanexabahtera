// Template "SkyNusa" — "Spec sheet": toko drone untuk fotografi, videografi wedding, dan pemetaan lahan. Hero lembar
// spesifikasi di kanvas abu berkisi (judul dua nada, panel foto drone dengan kartu angka spesifikasi melayang, strip
// 4 keunggulan), lalu pita terang & gelap berselang: kategori per kebutuhan (memfilter produk), drone pilihan (kartu
// toko + keranjang demo), paket bundling (gelap), sewa harian dengan kalkulator, garansi servis lokal (kartu angka),
// kelas terbang gratis (panel gelap), cerita pelanggan, tanya jawab, ajakan, kontak, footer gelap. Judul Inter Tight 400,
// label mono, tombol persegi membulat dengan kotak panah, datar tanpa bayangan, container query agar akurat di bingkai
// HP 390px dan panel CMS. Keranjang & kalkulator hanya di peramban; pesanan dikirim lewat WhatsApp.
import type { TemplateRenderProps } from '../types';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { PhotoSetContext } from '../kit/context';
import { useKitFont } from '../kit/fonts';
import { Academy } from './Academy';
import { Bundles } from './Bundles';
import { Categories } from './Categories';
import { Contact, Cta } from './Closing';
import { SKYNUSA_ACCENT } from './defaultContent';
import { Faq } from './Faq';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { readSkyNusa } from './model';
import { SKYNUSA_PHOTOS } from './photos';
import { Products } from './Products';
import { Rental } from './Rental';
import { ShopProvider } from './ShopProvider';
import { Stories } from './Stories';
import { INTER_TIGHT } from './styles';
import { Warranty } from './Warranty';
import './skynusa.css';

export default function SkyNusa({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readSkyNusa(content);
  const fontStyle = useKitFont(INTER_TIGHT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="inter" defaultAccent={SKYNUSA_ACCENT}>
      <PhotoSetContext.Provider value={SKYNUSA_PHOTOS}>
        <ShopProvider>
          <div style={{ ...fontStyle, ...m.colors }} className="relative bg-white text-[#0E1A1C]">
            <Header m={m} />
            <main>
              {isEnabled(m.hero) && <Hero m={m} />}
              {isEnabled(m.categories) && <Categories m={m} />}
              {isEnabled(m.products) && <Products m={m} />}
              {isEnabled(m.bundles) && <Bundles m={m} />}
              {isEnabled(m.rental) && <Rental m={m} />}
              {isEnabled(m.warranty) && <Warranty m={m} />}
              {isEnabled(m.academy) && <Academy m={m} />}
              {isEnabled(m.testimonials) && <Stories m={m} />}
              {isEnabled(m.faq) && <Faq m={m} />}
              {isEnabled(m.cta) && <Cta m={m} />}
              {isEnabled(m.contact) && <Contact m={m} />}
            </main>
            {isEnabled(m.footer) && <Footer m={m} />}
          </div>
        </ShopProvider>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
