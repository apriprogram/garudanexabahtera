// Template "Saudagar" — "Kraft & arches": company profile eksportir hasil bumi (kopi, kakao, rempah, kelapa) yang
// hangat dan berkelas, seperti lembar niaga di atas kertas krem. Masthead dua tingkat tidak menempel (nama di tengah,
// menu terbelah kiri-kanan), hero tiga foto berbingkai lengkung dengan judul serif Fraunces, tentang dengan angka serif
// besar, tab komoditas berkartu spesifikasi kraft, proses mutu bernomor, kalender panen 12 bulan, asal & pasar tujuan,
// galeri lengkung, testimoni, tanya jawab, SATU pita espresso untuk ajakan, formulir permintaan penawaran yang
// menyusun pesan WhatsApp (tanpa menyimpan data), dan footer kertas dengan nama perusahaan besar. Satu warna aksen
// (saffron bawaan) hanya untuk grafik; teks berwarna dari --sg-ink/--sg-bright (./model). Datar tanpa bayangan; gerak
// tenang (lengkung samping naik, batang panen tumbuh sekali, tab memudar ≤ 300 ms) yang mati pada prefers-reduced-motion
// dan pratinjau CMS; container query agar akurat di bingkai HP 390px dan panel CMS.
import { useCallback, useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { About } from './About';
import { Contact, Cta } from './Closing';
import { SAUDAGAR_ACCENT } from './defaultContent';
import { Faq } from './Faq';
import { Footer } from './Footer';
import { Gallery } from './Gallery';
import { Header } from './Header';
import { Hero } from './Hero';
import { Markets } from './Markets';
import { readSaudagar, type QuotePreset } from './model';
import { SAUDAGAR_PHOTOS } from './photos';
import { Products } from './Products';
import { Quality } from './Quality';
import { Season } from './Season';
import { SAUDAGAR_FONT } from './styles';
import { Testimonials } from './Testimonials';
import './saudagar.css';

export default function Saudagar({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readSaudagar(content);
  const fontStyle = useKitFont(SAUDAGAR_FONT);
  // Komoditas yang dipilih dari tautan kartu → formulir penawaran (Kontak)
  const [preset, setPreset] = useState<QuotePreset>({ product: '', n: 0 });
  const requestQuote = useCallback((product: string) => setPreset((p) => ({ product, n: p.n + 1 })), []);

  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={SAUDAGAR_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={SAUDAGAR_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#221A13]">
          <Header m={m} />
          <main>
            {isEnabled(m.hero) && <Hero m={m} />}
            {m.shown('about') && <About m={m} />}
            {m.shown('products') && <Products m={m} onQuote={requestQuote} />}
            {m.shown('quality') && <Quality m={m} />}
            {m.shown('season') && <Season m={m} />}
            {m.shown('markets') && <Markets m={m} />}
            {m.shown('gallery') && <Gallery m={m} />}
            {m.shown('testimonials') && <Testimonials m={m} />}
            {m.shown('faq') && <Faq m={m} />}
            {isEnabled(m.cta) && <Cta m={m} />}
            {isEnabled(m.contact) && <Contact m={m} preset={preset} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
