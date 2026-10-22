// Template "Finova" — "Forest & lime" (docs/platform/TEMPLATE-BRIEFS-2026-10.md §3 + §4.3): landing produk keuangan
// (fintech, koperasi, aplikasi pembayaran, konsultan keuangan, SaaS). Hero = PANEL hijau gelap berkisi dengan menu di
// dalamnya, foto asli tangan + ponsel dengan kartu UI melayang, bukti sosial + logo mitra di dalam panel; lalu angka
// raksasa bersuperskrip, produk dengan kartu UI, bento fitur abu dengan peta titik Indonesia, testimoni potret besar,
// FAQ accordion, pita ajakan gelap, kontak ringkas, footer terang multi-kolom. Dua warna merek (utama + tombol),
// Inter rapat, datar (kartu UI ber-ring tipis, tanpa bayangan), gerak tenang (mati di pratinjau CMS &
// prefers-reduced-motion), container query agar akurat di bingkai HP 390px dan panel CMS.
import type { TemplateRenderProps } from '../types';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { PhotoSetContext } from '../kit/context';
import { Contact, Cta } from './Closing';
import { FINOVA_ACCENT } from './defaultContent';
import { Faq } from './Faq';
import { Features } from './Features';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero, Partners } from './Hero';
import { readFinova } from './model';
import { FINOVA_PHOTOS } from './photos';
import { Numbers, Product } from './Product';
import { Stories } from './Stories';
import './finova.css';

export default function Finova({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readFinova(content);
  const heroOn = isEnabled(m.hero);
  const partnersOn = isEnabled(m.clients);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="inter" defaultAccent={FINOVA_ACCENT}>
      <PhotoSetContext.Provider value={FINOVA_PHOTOS}>
        <div style={m.colors} className="relative text-[#0B0F0E]">
          <Header m={m} overlay={heroOn} />
          <main>
            {heroOn && <Hero m={m} partners={partnersOn} />}
            {!heroOn && partnersOn && <Partners m={m} inPanel={false} className="pt-10 @3xl:pt-14" />}
            {isEnabled(m.advantages) && <Numbers m={m} />}
            {isEnabled(m.about) && <Product m={m} />}
            {isEnabled(m.services) && <Features m={m} />}
            {isEnabled(m.testimonials) && <Stories m={m} />}
            {isEnabled(m.faq) && <Faq m={m} />}
            {isEnabled(m.cta) && <Cta m={m} />}
            {isEnabled(m.contact) && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
