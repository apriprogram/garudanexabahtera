// Template "Aura Studio" — "Quiet sage" (docs/platform/TEMPLATE-BRIEFS-2026-10.md §2 + §4.2): website elegan untuk
// klinik kecantikan, salon, nail art, spa, dan barbershop. Hero belah editorial 45/55 (judul kapital Jost tipis +
// daftar layanan / foto potret tinggi dengan chip), "Mengapa kami?" di dalam lingkaran tipis, tab kategori di atas
// bento foto, perawatan unggulan dengan foto bulat, tentang, galeri, testimoni, tim, ajakan sage, kontak, footer
// putih bergaris rambut. Komponen ditulis sendiri (tanpa impor dari template lain); primitif bersama hanya dari
// shared/** dan kit/**. Gerak mati di pratinjau CMS & prefers-reduced-motion.
import { useState } from 'react';
import { KIT_FONTS, useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled, text } from '../shared/utils';
import type { TemplateRenderProps } from '../types';
import './aura-studio.css';
import { AURA_STUDIO_ACCENT } from './defaultContent';
import { Featured } from './Featured';
import { Footer } from './Footer';
import { CompactBar, Header } from './Header';
import { Hero } from './Hero';
import { readAura } from './model';
import { AURA_PHOTOS } from './photos';
import { About, Clients, Contact, Cta, Gallery, Team, Testimonials } from './sections';
import { Services } from './Services';
import { Why } from './Why';

export default function AuraStudio({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readAura(content);
  const fontStyle = useKitFont(KIT_FONTS.jost);
  // Tab kategori perawatan yang aktif (dipilih dari tab, menu "Layanan ▾", atau daftar layanan di hero)
  const [category, setCategory] = useState<string | null>(null);
  const heroOn = isEnabled(m.hero);
  const featuredOn = isEnabled(m.featured) && !!(text(m.featured, 'title') || text(m.featured, 'body'));
  const aboutOn = isEnabled(m.about) && !!(text(m.about, 'title') || text(m.about, 'body'));

  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="inter" defaultAccent={AURA_STUDIO_ACCENT}>
      <PhotoSetContext.Provider value={AURA_PHOTOS}>
        <div style={fontStyle} className="text-[#1C1C1C]">
          <CompactBar m={m} />
          <Header m={m} heroOn={heroOn} onCategory={setCategory} />
          <main>
            {heroOn && <Hero m={m} onCategory={setCategory} />}
            {isEnabled(m.advantages) && <Why m={m} />}
            {m.servicesOn && <Services m={m} category={category} onCategory={setCategory} />}
            {featuredOn && <Featured m={m} />}
            {aboutOn && <About m={m} />}
            {isEnabled(m.clients) && <Clients m={m} />}
            {isEnabled(m.gallery) && <Gallery m={m} />}
            {isEnabled(m.testimonials) && <Testimonials m={m} />}
            {isEnabled(m.team) && <Team m={m} />}
            {isEnabled(m.cta) && <Cta m={m} />}
            {isEnabled(m.contact) && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
