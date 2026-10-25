// Template "Bestari" — "Warm canvas": website sekolah dasar (bisa juga SMP) yang tenang, editorial, dan hangat
// (referensi pemilik 2026-10-26: Lifestyle, Eduker, Bienes, Finovate). Hero SLIDER foto selebar layar sampai tepi atas
// dengan bilah info kontak dan menu pil putih melayang di atasnya, tiga angka di hero, kartu sorotan yang menumpang di
// tepi bawah hero (kartu tengah berwarna tema), deret lencana bergaris tipis, lalu label section berpenomor "(01)":
// profil dengan judul dua warna + kolase + daftar "+", angka besar, sambutan kepala sekolah, alasan bernomor + kutipan
// guru, program berfoto, prestasi, guru, PPDB (tab + formulir SD yang menyusun pesan WhatsApp), berita berfilter,
// pengumuman & agenda, testimoni, galeri bento, tanya jawab, lokasi & kontak dengan Google Maps, dan footer cokelat
// malam selebar layar. Satu warna tema dari CMS (terakota bawaan) menurunkan semua warna. Judul Instrument Sans,
// datar tanpa bayangan, gerak tenang (muncul saat digulir, slider pudar, hover pelan) yang mati pada
// prefers-reduced-motion dan pratinjau CMS; container query agar akurat di bingkai HP 390px dan panel CMS.
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { About, Welcome, Why } from './About';
import { Contact, Faq } from './Closing';
import { Gallery, Testimonials } from './Community';
import { BESTARI_ACCENT } from './defaultContent';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { Badges, Highlights, Stats } from './Intro';
import { readBestari } from './model';
import { News, Notices } from './News';
import { BESTARI_PHOTOS } from './photos';
import { Ppdb } from './Ppdb';
import { Achievements, Programs, Teachers } from './Programs';
import { BESTARI_FONT } from './styles';
import './bestari.css';

export default function Bestari({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readBestari(content);
  const fontStyle = useKitFont(BESTARI_FONT);
  const heroOn = isEnabled(m.hero);
  const highlightsOn = m.shown('highlights');
  const newsOn = m.shown('news');
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={BESTARI_ACCENT}>
      <PhotoSetContext.Provider value={BESTARI_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#1C1917]">
          <Header m={m} overlay={heroOn} />
          <main>
            {heroOn && <Hero m={m} overlap={highlightsOn} />}
            {highlightsOn && <Highlights m={m} overlap={heroOn} />}
            {m.shown('badges') && <Badges m={m} />}
            {m.shown('about') && <About m={m} />}
            {m.shown('stats') && <Stats m={m} />}
            {m.shown('welcome') && <Welcome m={m} />}
            {m.shown('why') && <Why m={m} padTop={!m.shown('welcome')} />}
            {m.shown('programs') && <Programs m={m} />}
            {m.shown('achievements') && <Achievements m={m} />}
            {m.shown('teachers') && <Teachers m={m} />}
            {isEnabled(m.ppdb) && <Ppdb m={m} />}
            {newsOn && <News m={m} />}
            <Notices m={m} padTop={!newsOn} />
            {m.shown('testimonials') && <Testimonials m={m} />}
            {m.shown('gallery') && <Gallery m={m} />}
            {m.shown('faq') && <Faq m={m} />}
            {isEnabled(m.contact) && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
