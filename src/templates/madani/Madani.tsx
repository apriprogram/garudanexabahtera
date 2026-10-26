// Template "Madani" — website sekolah Islam (SMA IT / MA), modern, sederhana, dan profesional. Hero = slider foto
// selebar layar dengan menu pil di atasnya, judul + kata sorotan, tombol "Daftar PPDB" warna sorotan, dan
// kartu info PPDB; lalu halaman putih lapang dengan panel krem/warna tema yang juga membulat: strip info, sambutan
// kepala sekolah, profil (tab visi & misi), statistik, program unggulan, prestasi, fasilitas, PPDB (jalur, jadwal,
// syarat, alur, biaya, formulir minat → WhatsApp), berita, pengumuman & agenda, galeri, alumni, tanya jawab, ajakan,
// lokasi & kontak (peta), footer. Datar TANPA bayangan; warna tema & sorotan bisa diganti dari CMS (./model.ts).
// Berita & pengumuman dari tulisan (site_posts) bila ada, selain itu dari konten CMS; halaman /berita, /pengumuman, dan
// tulisan = header tanpa overlay + halaman bersama (shared/posts) + footer (docs/platform/SITE-POSTS-SEO-SPEC.md §7).
import type { TemplateRenderProps } from '../types';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { PhotoSetContext } from '../kit/context';
import { useContentWithPosts, useSubPage } from '../shared/posts/hooks';
import { PostPage } from '../shared/posts/PostPage';
import { About } from './About';
import { Achievements } from './Achievements';
import { Alumni } from './Alumni';
import { Board } from './Board';
import { Contact, Cta } from './Closing';
import { MADANI_ACCENT } from './defaultContent';
import { Facilities } from './Facilities';
import { Faq } from './Faq';
import { Footer } from './Footer';
import { Gallery } from './Gallery';
import { Header } from './Header';
import { Hero } from './Hero';
import { Highlights } from './Highlights';
import { readMadani } from './model';
import { News } from './News';
import { MADANI_PHOTOS } from './photos';
import { Ppdb } from './Ppdb';
import { Programs } from './Programs';
import { Stats } from './Stats';
import { POST_THEME } from './styles';
import { Welcome } from './Welcome';
import './madani.css';

export default function Madani({ content, preview = false, motion }: TemplateRenderProps) {
  const sub = useSubPage();
  const m = readMadani(useContentWithPosts(content));
  const heroOn = isEnabled(m.hero);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="jakarta" defaultAccent={MADANI_ACCENT}>
      <PhotoSetContext.Provider value={MADANI_PHOTOS}>
        <div style={m.colors} className="relative text-[#1E2420]">
          <Header m={m} overlay={heroOn && !sub} />
          {sub ? (
            <main>
              <PostPage siteName={m.companyName} theme={POST_THEME} />
            </main>
          ) : (
            <main>
              {heroOn && <Hero m={m} />}
              {isEnabled(m.highlights) && <Highlights m={m} />}
              {isEnabled(m.welcome) && <Welcome m={m} />}
              {isEnabled(m.about) && <About m={m} />}
              {isEnabled(m.stats) && <Stats m={m} />}
              {isEnabled(m.programs) && <Programs m={m} />}
              {isEnabled(m.achievements) && <Achievements m={m} />}
              {isEnabled(m.facilities) && <Facilities m={m} />}
              {isEnabled(m.ppdb) && <Ppdb m={m} />}
              {isEnabled(m.news) && <News m={m} />}
              <Board m={m} />
              {isEnabled(m.gallery) && <Gallery m={m} />}
              {isEnabled(m.alumni) && <Alumni m={m} />}
              {isEnabled(m.faq) && <Faq m={m} />}
              {isEnabled(m.cta) && <Cta m={m} />}
              {isEnabled(m.contact) && <Contact m={m} />}
            </main>
          )}
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
