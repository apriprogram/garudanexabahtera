// Template "Jumantara" — "Clean institutional": website SMA negeri yang profesional, tenang, rapi, dan elegan (contoh:
// SMA Negeri 1 Purbolinggo, Lampung Timur; isi demo fiktif). Bilah utilitas kobalt-hitam (telepon, email, jam layanan,
// tautan cepat PPID/E-Learning), header transparan di atas hero yang menjadi putih bergaris rambut saat digulir, hero
// SLIDER foto selebar layar dengan bilah progres bersegmen dan pita empat angka sekolah di dalam foto, deret layanan
// cepat, sambutan kepala sekolah, profil dengan tab visi/misi, kelompok mapel pilihan, berita (berita utama + daftar),
// pengumuman & agenda berdampingan, prestasi, ekstrakurikuler berfilter, rel fasilitas, guru, SPMB (tab + formulir
// tanya panitia ke WhatsApp + tautan portal provinsi), cerita alumni, galeri, tanya jawab, kontak + peta, dan footer
// kobalt-hitam dengan nama sekolah besar. Satu warna tema dari CMS (kobalt bawaan) menurunkan semua warna. Judul Onest,
// DATAR tanpa bayangan (garis rambut & bidang warna), gerak halus (pudar slide, isi bilah progres, teks naik, muncul
// saat digulir, angka berjalan, tab & filter) yang mati pada prefers-reduced-motion dan pratinjau CMS; container query
// agar akurat di bingkai HP 390px dan panel CMS.
// Berita & pengumuman dari tulisan (site_posts) bila fitur aktif, selain itu dari konten CMS; halaman /berita,
// /pengumuman, dan tulisan = header putih + halaman bersama (shared/posts) + footer (docs/platform/SITE-POSTS-SEO-SPEC.md §7).
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { useContentWithPosts, useSubPage } from '../shared/posts/hooks';
import { PostPage } from '../shared/posts/PostPage';
import { About, Welcome } from './About';
import { Achievements, Programs } from './Academics';
import { Contact, Faq, Gallery } from './Closing';
import { Clubs } from './Clubs';
import { JUMANTARA_ACCENT } from './defaultContent';
import { Facilities } from './Facilities';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { readJumantara } from './model';
import { News, Notices } from './News';
import { Teachers, Testimonials } from './People';
import { JUMANTARA_PHOTOS } from './photos';
import { Services } from './Services';
import { Spmb } from './Spmb';
import { JUMANTARA_FONT, POST_THEME } from './styles';
import './jumantara.css';

export default function Jumantara({ content, preview = false, motion }: TemplateRenderProps) {
  const sub = useSubPage();
  const m = readJumantara(useContentWithPosts(content));
  const fontStyle = useKitFont(JUMANTARA_FONT);
  const heroOn = isEnabled(m.hero);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={JUMANTARA_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={JUMANTARA_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#0E1525]">
          {/* Halaman selain beranda: header putih biasa (tanpa foto hero di bawahnya) */}
          <Header m={m} overlay={heroOn && !sub} />
          {sub ? (
            <main>
              <PostPage siteName={m.companyName} theme={POST_THEME} />
            </main>
          ) : (
            <main>
              {heroOn && <Hero m={m} />}
              {m.shown('services') && <Services m={m} />}
              {m.shown('welcome') && <Welcome m={m} />}
              {m.shown('about') && <About m={m} />}
              {m.shown('programs') && <Programs m={m} />}
              {isEnabled(m.news) && <News m={m} />}
              <Notices m={m} />
              {m.shown('achievements') && <Achievements m={m} />}
              {m.shown('clubs') && <Clubs m={m} />}
              {m.shown('facilities') && <Facilities m={m} />}
              {m.shown('teachers') && <Teachers m={m} />}
              {m.shown('spmb') && <Spmb m={m} />}
              {m.shown('testimonials') && <Testimonials m={m} />}
              {m.shown('gallery') && <Gallery m={m} />}
              {m.shown('faq') && <Faq m={m} />}
              {m.shown('contact') && <Contact m={m} />}
            </main>
          )}
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
