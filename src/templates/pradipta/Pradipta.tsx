// Template "Pradipta" — "Simple sky": landing page SMA NEGERI yang terang, rapi, dan tenang (permintaan pemilik
// 2026-10-27: profesional, modern, sederhana, elegan, warna biru, tanpa bayangan, hero slider foto latar). Header putih
// yang tidak pernah menumpang di foto dengan menu di lintasan pil langit dan penunjuk putih yang BERGESER mengikuti
// section; hero SLIDER foto selebar layar dengan judul di KARTU PUTIH kiri bawah dan THUMBNAIL foto berbilah progres
// sebagai tombol slide; lalu akses cepat, statistik dalam gelembung, profil + visi/misi + nilai, sambutan kepala
// sekolah, kelompok mapel pilihan (daftar buka-tutup + foto yang berganti), ekstrakurikuler bersaring, linimasa prestasi
// per tahun, kartu fasilitas, berita, pengumuman & agenda (ubin kalender), guru, SPMB (tab Jalur/Jadwal/Syarat +
// formulir tanya tiga langkah → WhatsApp), testimoni, galeri bento, tanya jawab, kontak + peta, dan footer putih berpita langit. Pita putih
// dan langit berselang-seling menurut section yang tampil. Satu warna tema dari CMS (biru azure bawaan) menurunkan semua
// warna. Judul Lexend, isi Inter; datar tanpa bayangan; gerak tenang (pradipta.css) yang mati pada prefers-reduced-motion
// dan pratinjau CMS; container query agar akurat di bingkai HP 390px dan panel CMS.
// Berita & pengumuman dari tulisan (site_posts) bila ada, selain itu dari konten CMS; halaman /berita, /pengumuman, dan
// tulisan = header yang sama + halaman bersama (shared/posts) + footer (docs/platform/SITE-POSTS-SEO-SPEC.md §7).
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { useContentWithPosts, useSubPage } from '../shared/posts/hooks';
import { PostPage } from '../shared/posts/PostPage';
import { About, Welcome } from './About';
import { Contact, Faq } from './Closing';
import { Gallery, Testimonials } from './Community';
import { PRADIPTA_ACCENT } from './defaultContent';
import { Facilities } from './Facilities';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { QuickLinks, Stats } from './Intro';
import { readPradipta } from './model';
import { News, Notices } from './News';
import { PRADIPTA_PHOTOS } from './photos';
import { Programs } from './Programs';
import { Spmb } from './Spmb';
import { Achievements, StudentLife } from './StudentLife';
import { POST_THEME, PRADIPTA_FONT } from './styles';
import { Teachers } from './Teachers';
import './pradipta.css';

export default function Pradipta({ content, preview = false, motion }: TemplateRenderProps) {
  const sub = useSubPage();
  const m = readPradipta(useContentWithPosts(content));
  const fontStyle = useKitFont(PRADIPTA_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="inter" defaultAccent={PRADIPTA_ACCENT}>
      <PhotoSetContext.Provider value={PRADIPTA_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#0E1B2B]">
          <Header m={m} />
          {sub ? (
            <main>
              <PostPage siteName={m.companyName} theme={POST_THEME} />
            </main>
          ) : (
            <main>
              {isEnabled(m.hero) && <Hero m={m} />}
              {m.shown('quicklinks') && <QuickLinks m={m} />}
              {m.shown('stats') && <Stats m={m} />}
              {m.shown('about') && <About m={m} />}
              {m.shown('welcome') && <Welcome m={m} />}
              {m.shown('programs') && <Programs m={m} />}
              {m.shown('studentlife') && <StudentLife m={m} />}
              {m.shown('achievements') && <Achievements m={m} />}
              {m.shown('facilities') && <Facilities m={m} />}
              {m.shown('news') && <News m={m} />}
              <Notices m={m} />
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
