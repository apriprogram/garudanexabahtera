// Template "Serenity" — "Calm horizon": landing studio yoga (yoga, pilates, kelas kebugaran tenang, retret). Hero =
// foto pemandangan senja LAYAR PENUH dengan menu transparan, judul dua baris berbaris kedua pastel, tombol pil putih + tombol video, kartu kaca kecil, dan strip empat fitur; lalu halaman terang yang lapang: tentang,
// kelas, cara memulai, paket, cerita peserta, tanya jawab, ajakan foto, kontak, footer. Judul Outfit, kartu radius
// 28 tanpa bayangan, kaca tipis hanya di atas foto, gerak tenang (mati di pratinjau CMS & prefers-reduced-motion),
// container query agar akurat di bingkai HP 390px dan panel CMS.
import type { TemplateRenderProps } from '../types';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { PhotoSetContext } from '../kit/context';
import { useKitFont } from '../kit/fonts';
import { About } from './About';
import { Contact, Cta } from './Closing';
import { SERENITY_ACCENT } from './defaultContent';
import { Faq } from './Faq';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { readSerenity } from './model';
import { SERENITY_PHOTOS } from './photos';
import { Pricing } from './Pricing';
import { Programs } from './Programs';
import { Steps } from './Steps';
import { Stories } from './Stories';
import { OUTFIT } from './styles';
import './serenity.css';

export default function Serenity({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readSerenity(content);
  const fontStyle = useKitFont(OUTFIT);
  const heroOn = isEnabled(m.hero);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="inter" defaultAccent={SERENITY_ACCENT}>
      <PhotoSetContext.Provider value={SERENITY_PHOTOS}>
        <div style={{ ...fontStyle, ...m.colors }} className="relative text-[#151833]">
          <Header m={m} overlay={heroOn} />
          <main>
            {heroOn && <Hero m={m} />}
            {isEnabled(m.about) && <About m={m} />}
            {isEnabled(m.services) && <Programs m={m} />}
            {isEnabled(m.steps) && <Steps m={m} />}
            {isEnabled(m.pricing) && <Pricing m={m} />}
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
