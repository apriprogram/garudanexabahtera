// Template "Nawasena" — "Elegant navy": landing page SMA negeri yang resmi, tenang, rapi, dan elegan (demo: nama
// SMA Negeri 1 Purbolinggo, Lampung Timur, sebagai CONTOH; isi lain fiktif). Hero SLIDER foto latar setinggi layar di
// bawah lapisan navy dengan judul serif di tengah, rel nomor slide tegak di tepi kanan, dan zoom Ken Burns pelan; strip
// pengumuman berjalan + pita angka navy menyambung di bawahnya. Lalu sambutan kepala sekolah, profil + visi/misi, tab
// paket mata pelajaran pilihan, prestasi (rel geser), berita (tata letak majalah), pita navy pengumuman + linimasa
// agenda, ekstrakurikuler, fasilitas (bento), guru, SPMB (jalur, jadwal, syarat, portal provinsi, formulir tanya ke
// WhatsApp), galeri, cerita alumni, tanya jawab, lokasi & kontak, dan footer navy dengan nama sekolah besar. Satu warna
// tema dari CMS (biru bawaan #2563EB) menurunkan navy dan semua warna lain. Judul DM Serif Display, isi Inter, label
// mono; kartu radius 8 bergaris tipis, tombol radius 6, TANPA bayangan; gerak tenang (pudar + Ken Burns, garis progres,
// strip berjalan, muncul saat digulir, angka menghitung, tab pudar, garis linimasa) yang mati pada prefers-reduced-motion
// dan pratinjau CMS; container query agar akurat di bingkai HP 390px dan panel CMS.
// Berita & pengumuman dari tulisan (site_posts) bila fitur Berita & Pengumuman aktif, selain itu dari konten CMS; halaman
// /berita, /pengumuman, dan tulisan = header navy tanpa overlay + halaman bersama (shared/posts) + footer.
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { useContentWithPosts, useSubPage } from '../shared/posts/hooks';
import { PostPage } from '../shared/posts/PostPage';
import { About } from './About';
import { Achievements } from './Achievements';
import { Alumni } from './Alumni';
import { Contact, Faq } from './Closing';
import { Clubs } from './Clubs';
import { NAWASENA_ACCENT } from './defaultContent';
import { Facilities } from './Facilities';
import { Footer } from './Footer';
import { Gallery } from './Gallery';
import { Header } from './Header';
import { Hero } from './Hero';
import { readNawasena } from './model';
import { News } from './News';
import { Notices } from './Notices';
import { NAWASENA_PHOTOS } from './photos';
import { Programs } from './Programs';
import { Spmb } from './Spmb';
import { Stats } from './Stats';
import { NAWASENA_FONT, POST_THEME } from './styles';
import { Teachers } from './Teachers';
import { Welcome } from './Welcome';
import './nawasena.css';

export default function Nawasena({ content, preview = false, motion }: TemplateRenderProps) {
  const sub = useSubPage();
  const m = readNawasena(useContentWithPosts(content));
  const fontStyle = useKitFont(NAWASENA_FONT);
  const heroOn = isEnabled(m.hero);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={NAWASENA_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={NAWASENA_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-(--nw-navy)">
          {/* Halaman selain beranda: header navy biasa (tanpa foto hero di bawahnya) */}
          <Header m={m} overlay={heroOn && !sub} />
          {sub ? (
            <main>
              <PostPage siteName={m.companyName} theme={POST_THEME} />
            </main>
          ) : (
            <main>
              {heroOn && <Hero m={m} />}
              {m.shown('stats') && <Stats m={m} />}
              {m.shown('welcome') && <Welcome m={m} />}
              {m.shown('about') && <About m={m} />}
              {m.shown('programs') && <Programs m={m} />}
              {m.shown('achievements') && <Achievements m={m} />}
              {m.shown('news') && <News m={m} />}
              <Notices m={m} />
              {m.shown('clubs') && <Clubs m={m} />}
              {m.shown('facilities') && <Facilities m={m} />}
              {m.shown('teachers') && <Teachers m={m} />}
              {isEnabled(m.spmb) && <Spmb m={m} />}
              {m.shown('gallery') && <Gallery m={m} />}
              {m.shown('testimonials') && <Alumni m={m} />}
              {m.shown('faq') && <Faq m={m} />}
              {isEnabled(m.contact) && <Contact m={m} />}
            </main>
          )}
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
