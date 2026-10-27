// Template "Velora" — "Showroom dark": company profile berbahasa Inggris untuk grup otomotif / perusahaan besar
// internasional (brief intl-templates §3; referensi pemilik 2026-10-27: CBRLP, sewa Porsche, Bose, dinding testimoni,
// VivaChat, Hugo). Hero = kartu foto lebar membulat di dalam gutter dengan menu di dalamnya (tautan dalam SATU pil
// putih), judul dengan kata di dalam pil + chip panah merah, kartu ulasan video; lalu filosofi, bento kartu foto gelap +
// baris abu berpanah, jajaran model berfilter di panel gelap, langkah kepemilikan, carousel teknologi yang melebar, angka
// raksasa bertitik merah, dinding potret testimoni, newsroom gelap, formulir test drive (WhatsApp/email), dealer & peta,
// footer gelap dengan newsletter. Latar putih tulang ↔ hampir hitam bergantian, satu aksen merah dari CMS, judul Space
// Grotesk, datar tanpa bayangan, gerak tenang yang mati pada prefers-reduced-motion & pratinjau CMS, container query
// agar akurat di bingkai HP 390px dan panel CMS. Akar isi ber-lang="en" (salinan demo Inggris).
import { useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Bento, Philosophy } from './Company';
import { Contact } from './Contact';
import { VELORA_ACCENT } from './defaultContent';
import { Engineering, Stats } from './Engineering';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { Lineup } from './Lineup';
import { readVelora, type DrivePick } from './model';
import { Ownership } from './Ownership';
import { VELORA_PHOTOS } from './photos';
import { Newsroom, Testimonials } from './Stories';
import { VELORA_FONT } from './styles';
import { TestDrive } from './TestDrive';
import './velora.css';

export default function Velora({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readVelora(content);
  const fontStyle = useKitFont(VELORA_FONT);
  const heroOn = isEnabled(m.hero);
  const philosophyOn = m.shown('philosophy');
  const bentoOn = m.shown('bento');
  // Kartu model yang menuju test drive → model itu terpilih di formulir
  const [drivePick, setDrivePick] = useState<DrivePick | null>(null);
  const pickModel = (name: string) => setDrivePick((prev) => ({ name, n: (prev?.n ?? 0) + 1 }));
  return (
    <TemplateShell content={content} preview={preview} motion={motion} displayFont="inter" defaultAccent={VELORA_ACCENT}>
      <PhotoSetContext.Provider value={VELORA_PHOTOS}>
        <div lang="en" style={{ ...m.colors, ...fontStyle }} className="relative bg-[#F4F4F2] text-[#0D0E10]">
          <Header m={m} overlay={heroOn} />
          <main>
            {heroOn && <Hero m={m} />}
            {philosophyOn && <Philosophy m={m} tight={bentoOn} />}
            {bentoOn && <Bento m={m} tight={philosophyOn} />}
            {m.shown('lineup') && <Lineup m={m} onDrive={pickModel} />}
            {m.shown('how') && <Ownership m={m} />}
            {m.shown('engineering') && <Engineering m={m} />}
            {m.shown('stats') && <Stats m={m} />}
            {m.shown('testimonials') && <Testimonials m={m} />}
            {m.shown('newsroom') && <Newsroom m={m} />}
            {isEnabled(m.cta) && <TestDrive m={m} pick={drivePick} />}
            {isEnabled(m.contact) && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
