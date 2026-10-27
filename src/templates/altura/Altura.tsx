// Template "Altura" — "Lime landmark": company profile berbahasa Inggris untuk developer & pengelola investasi properti
// global (referensi pemilik 2026-10-27: Spaciaz, Horizon Estate). Menu pil putih yang menumpang di atas hero DUA PANEL
// (foto menara / panel krem dengan judul besar, lingkaran angka limau, dan pil berfoto ke video/proyek), lalu tentang,
// tiga pilar bernomor (gelap / limau / foto), deret layanan berjalan, pita angka raksasa di atas cakrawala, keunggulan berikon,
// proyek unggulan berbentuk akordion, portofolio berfilter, pimpinan, penghargaan berjalan, testimoni, wawasan, ajakan
// foto malam, kontak + formulir enquiry (menyusun pesan WhatsApp/email, tanpa menyimpan data), dan footer zaitun gelap
// dengan nama raksasa samar. Ritme putih ↔ krem ↔ zaitun gelap; satu warna tema dari CMS (limau bawaan) menurunkan semua
// warna. Judul Manrope, isi Inter, datar tanpa bayangan, gerak tenang yang mati pada prefers-reduced-motion dan pratinjau
// CMS; container query agar akurat di bingkai HP 390px dan panel CMS. Konten demo berbahasa Inggris (lang="en").
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Contact, Cta, Insights } from './Closing';
import { ALTURA_ACCENT } from './defaultContent';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { About, Amenities, Pillars } from './Intro';
import { readAltura } from './model';
import { Awards, Leadership, Testimonials } from './People';
import { ALTURA_PHOTOS } from './photos';
import { Developments, Portfolio } from './Projects';
import { Difference, Stats } from './Proof';
import { ALTURA_FONT } from './styles';
import './altura.css';

export default function Altura({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readAltura(content);
  const fontStyle = useKitFont(ALTURA_FONT);
  const heroOn = isEnabled(m.hero);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={ALTURA_ACCENT}>
      <PhotoSetContext.Provider value={ALTURA_PHOTOS}>
        <div lang="en" style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#141612]">
          <Header m={m} overlay={heroOn} />
          <main>
            {heroOn && <Hero m={m} />}
            {m.shown('about') && <About m={m} />}
            {m.shown('pillars') && <Pillars m={m} />}
            {m.shown('amenities') && <Amenities m={m} />}
            {m.shown('stats') && <Stats m={m} />}
            {m.shown('difference') && <Difference m={m} />}
            {m.shown('developments') && <Developments m={m} />}
            {m.shown('portfolio') && <Portfolio m={m} />}
            {m.shown('leadership') && <Leadership m={m} />}
            {m.shown('awards') && <Awards m={m} />}
            {m.shown('testimonials') && <Testimonials m={m} />}
            {m.shown('insights') && <Insights m={m} />}
            {m.shown('cta') && <Cta m={m} />}
            {isEnabled(m.contact) && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
