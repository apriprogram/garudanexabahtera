// Template "Arena Club" — "Sky court" (docs/platform/TEMPLATE-BRIEFS-2026-10.md §1 + §4.1): website klub olahraga
// (padel, tenis, futsal, badminton, gym, akademi). Header putih lengket dengan grup pil menu, hero BANNER foto
// membulat dengan judul terpusat di atas foto, pernyataan + bento tiga kartu pejal, baris angka terpusat, rel foto
// program, pita membership biru langit, pelatih, acara, galeri, testimoni, sponsor, ajakan foto malam, kontak, footer
// navy. Foto asli (./photos.ts), judul Urbanist tipis, garis tipis tanpa bayangan, gerak tenang (mati di pratinjau
// CMS & prefers-reduced-motion), container query agar akurat di bingkai HP 390px dan panel CMS.
import type { TemplateRenderProps } from '../types';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { PhotoSetContext } from '../kit/context';
import { KIT_FONTS, useKitFont } from '../kit/fonts';
import { Footer, Header } from './chrome';
import { Contact, Cta } from './Closing';
import { ARENA_CLUB_ACCENT } from './defaultContent';
import { Hero } from './Hero';
import { About, Numbers } from './Intro';
import { readArena } from './model';
import { Events, Team } from './People';
import { ARENA_PHOTOS } from './photos';
import { Pricing, Services } from './Programs';
import { Gallery, Sponsors, Testimonials } from './Proof';

export default function ArenaClub({ content, preview = false, motion }: TemplateRenderProps) {
  const fontStyle = useKitFont(KIT_FONTS.urbanist);
  const m = readArena(content);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="inter" defaultAccent={ARENA_CLUB_ACCENT}>
      <PhotoSetContext.Provider value={ARENA_PHOTOS}>
        <div style={fontStyle} className="text-[#0B1220]">
          <Header m={m} />
          <main>
            {isEnabled(m.hero) && <Hero m={m} />}
            {isEnabled(m.about) && <About m={m} />}
            {isEnabled(m.advantages) && <Numbers m={m} />}
            {isEnabled(m.services) && <Services m={m} />}
            {isEnabled(m.pricing) && <Pricing m={m} />}
            {isEnabled(m.team) && <Team m={m} />}
            {isEnabled(m.events) && <Events m={m} />}
            {isEnabled(m.gallery) && <Gallery m={m} />}
            {isEnabled(m.testimonials) && <Testimonials m={m} />}
            {isEnabled(m.clients) && <Sponsors m={m} />}
            {isEnabled(m.cta) && <Cta m={m} />}
            {isEnabled(m.contact) && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
