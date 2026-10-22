// Template "Corporate Nexa": company profile korporat bergaya "architectural editorial" (docs/platform/TEMPLATE-DESIGN.md §3).
// Foto asli, wadah penuh kiri-kanan (CONTAINER), datar dengan garis tipis tanpa bayangan, satu warna aksen yang bisa
// diganti, dan gerak tenang (mati di pratinjau CMS & prefers-reduced-motion). Tata letak memakai container query
// (@xl, @3xl, @5xl …) agar akurat di bingkai HP demo dan pratinjau CMS yang diperkecil.
import type { TemplateRenderProps } from '../types';
import { readCompanyProfile } from '../shared/model';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Footer, Header } from './Chrome';
import { About, Advantages, Services } from './Company';
import { Contact } from './Contact';
import { CORPORATE_NEXA_ACCENT } from './defaultContent';
import { Clients, Hero } from './Intro';
import { Cta, Gallery, Testimonials } from './Proof';

export default function CorporateNexa({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readCompanyProfile(content);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="inter" defaultAccent={CORPORATE_NEXA_ACCENT}>
      <Header m={m} />
      <main>
        {isEnabled(m.hero) && <Hero m={m} />}
        {isEnabled(m.clients) && <Clients m={m} />}
        {isEnabled(m.about) && <About m={m} />}
        {isEnabled(m.services) && <Services m={m} />}
        {isEnabled(m.advantages) && <Advantages m={m} />}
        {isEnabled(m.gallery) && <Gallery m={m} />}
        {isEnabled(m.testimonials) && <Testimonials m={m} />}
        {isEnabled(m.cta) && <Cta m={m} />}
        {isEnabled(m.contact) && <Contact m={m} />}
      </main>
      {isEnabled(m.footer) && <Footer m={m} />}
    </TemplateShell>
  );
}
