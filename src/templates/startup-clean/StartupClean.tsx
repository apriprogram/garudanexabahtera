// Template "Startup Clean" — "Calm product" (docs/platform/TEMPLATE-DESIGN.md §4): company profile modern & lapang
// untuk startup, UMKM, dan bisnis digital. Hero terpusat di atas panel foto, strip logo klien, bento fitur, cerita,
// angka dampak, galeri, testimoni, ajakan, kontak. Foto asli, satu aksen, garis tipis tanpa bayangan, gerak tenang
// (mati di pratinjau CMS & prefers-reduced-motion). Tata letak memakai container query (@…) agar akurat di bingkai
// HP 390px dan panel CMS.
import type { TemplateRenderProps } from '../types';
import { readCompanyProfile } from '../shared/model';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Footer, Header } from './chrome';
import { STARTUP_CLEAN_ACCENT } from './defaultContent';
import { Features } from './Features';
import { Hero } from './Hero';
import { Clients, Contact, Cta, Gallery, Impact, Story, Testimonials } from './sections';

export default function StartupClean({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readCompanyProfile(content);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="jakarta" defaultAccent={STARTUP_CLEAN_ACCENT}>
      <Header m={m} />
      <main>
        {isEnabled(m.hero) && <Hero m={m} />}
        {isEnabled(m.clients) && <Clients m={m} />}
        {isEnabled(m.services) && <Features m={m} />}
        {isEnabled(m.about) && <Story m={m} />}
        {isEnabled(m.advantages) && <Impact m={m} />}
        {isEnabled(m.gallery) && <Gallery m={m} />}
        {isEnabled(m.testimonials) && <Testimonials m={m} />}
        {isEnabled(m.cta) && <Cta m={m} />}
        {isEnabled(m.contact) && <Contact m={m} />}
      </main>
      {isEnabled(m.footer) && <Footer m={m} />}
    </TemplateShell>
  );
}
