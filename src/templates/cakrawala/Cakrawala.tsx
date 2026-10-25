// Template "Cakrawala" — "Clear horizon": website sekolah (SMK, bisa juga SMA) yang modern, sederhana, dan profesional.
// Halaman putih dengan hero SLIDER foto di dalam bingkai membulat, menu pil kaca di atasnya, bilah pengumuman PPDB, dan
// tiga kartu info yang menumpang di tepi bawah hero; lalu statistik, sambutan kepala sekolah, profil & visi-misi
// (panel abu), program keahlian, teaching factory & mitra industri (panel biru tinta), prestasi, PPDB (tab jalur/
// jadwal/syarat/alur/biaya + formulir yang menyusun pesan WhatsApp), berita berfilter, pengumuman & agenda, alumni,
// BKK, fasilitas, galeri, tanya jawab, lokasi & kontak dengan Google Maps, dan footer biru tinta. Satu warna tema dari
// CMS (biru bawaan, mis. hijau untuk sekolah lain) menurunkan semua warna. Judul Plus Jakarta Sans, datar tanpa
// bayangan, container query agar akurat di bingkai HP 390px dan panel CMS.
import type { TemplateRenderProps } from '../types';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { PhotoSetContext } from '../kit/context';
import { Facilities, Gallery } from './Campus';
import { Contact, Faq } from './Closing';
import { CAKRAWALA_ACCENT } from './defaultContent';
import { Footer } from './Footer';
import { Header, TopBar } from './Header';
import { Hero } from './Hero';
import { Achievements, Industry } from './Industry';
import { Highlights, Stats } from './Intro';
import { readCakrawala } from './model';
import { News, Notices } from './News';
import { Alumni, Careers } from './People';
import { CAKRAWALA_PHOTOS } from './photos';
import { Ppdb } from './Ppdb';
import { Programs } from './Programs';
import { About, Welcome } from './Welcome';
import './cakrawala.css';

export default function Cakrawala({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readCakrawala(content);
  const heroOn = isEnabled(m.hero);
  const highlightsOn = m.shown('highlights');
  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="jakarta" defaultAccent={CAKRAWALA_ACCENT}>
      <PhotoSetContext.Provider value={CAKRAWALA_PHOTOS}>
        <div style={m.colors} className="relative bg-white text-[#0D1830]">
          {heroOn && <TopBar m={m} />}
          <Header m={m} overlay={heroOn} />
          <main>
            {heroOn && <Hero m={m} overlap={highlightsOn} />}
            {highlightsOn && <Highlights m={m} overlap={heroOn} />}
            {m.shown('stats') && <Stats m={m} />}
            {isEnabled(m.welcome) && <Welcome m={m} />}
            {isEnabled(m.about) && <About m={m} />}
            {isEnabled(m.programs) && <Programs m={m} />}
            {isEnabled(m.industry) && <Industry m={m} />}
            {isEnabled(m.achievements) && <Achievements m={m} />}
            {isEnabled(m.ppdb) && <Ppdb m={m} />}
            {isEnabled(m.news) && <News m={m} />}
            <Notices m={m} />
            {isEnabled(m.testimonials) && <Alumni m={m} />}
            {isEnabled(m.careers) && <Careers m={m} />}
            {isEnabled(m.facilities) && <Facilities m={m} />}
            {isEnabled(m.gallery) && <Gallery m={m} />}
            {isEnabled(m.faq) && <Faq m={m} />}
            {isEnabled(m.contact) && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
