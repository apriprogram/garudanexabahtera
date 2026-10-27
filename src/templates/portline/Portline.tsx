// Template "Portline" — "Harbor index": company profile berbahasa Inggris untuk grup pelayaran, terminal & logistik
// internasional (referensi pemilik 2026-10-27: Negmar, Pestiva, Hugo). Header dua lapis (bilah utilitas dengan tombol
// biru pejal + pilihan bahasa, lalu menu KAPITAL) transparan di atas SLIDER foto selebar layar dengan indeks vertikal
// 01/02/03, lingkaran radar, dan deret logo perusahaan grup; lalu mosaik newsroom bertagar, liputan media, angka berikon,
// kartu perusahaan grup berlencana ikon bulat, carousel armada yang melebar, jaringan global, pita biru keberlanjutan,
// banner karier, pimpinan, kontak dengan formulir yang menyusun pesan WhatsApp/email, dan footer navy multi-kolom
// dengan kolom merek. Satu warna tema dari CMS (biru laut bawaan) menurunkan semua warna; bahasa teks bawaan en/id dari
// CMS (atribut lang ikut). Judul Barlow, datar tanpa bayangan, gerak tenang yang mati pada prefers-reduced-motion dan
// pratinjau CMS; container query agar akurat di bingkai HP 390px dan panel CMS.
import { useMemo, useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Contact } from './Contact';
import { EnquiryContext, type EnquiryBus } from './context';
import { PORTLINE_ACCENT } from './defaultContent';
import { Fleet } from './Fleet';
import { Footer } from './Footer';
import { Divisions, Stats } from './Group';
import { Header } from './Header';
import { Hero } from './Hero';
import { readPortline, type EnquiryPrefill } from './model';
import { Newsroom, Press } from './Newsroom';
import { Careers, Leadership } from './People';
import { PORTLINE_PHOTOS } from './photos';
import { PORTLINE_FONT } from './styles';
import { Network, Sustainability } from './World';
import './portline.css';

export default function Portline({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readPortline(content);
  const fontStyle = useKitFont(PORTLINE_FONT);
  const [prefill, setPrefillState] = useState<EnquiryBus['prefill']>(null);
  const bus = useMemo<EnquiryBus>(
    () => ({ prefill, setPrefill: (value: EnquiryPrefill) => setPrefillState((cur) => ({ ...value, id: (cur?.id ?? 0) + 1 })) }),
    [prefill],
  );
  const heroOn = isEnabled(m.hero);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={PORTLINE_ACCENT}>
      <PhotoSetContext.Provider value={PORTLINE_PHOTOS}>
        <EnquiryContext.Provider value={bus}>
          <div lang={m.lang} style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#44546A]">
            <Header m={m} overlay={heroOn} />
            <main>
              {heroOn && <Hero m={m} />}
              {m.shown('newsroom') && <Newsroom m={m} />}
              {m.shown('press') && <Press m={m} />}
              {m.shown('stats') && <Stats m={m} />}
              {m.shown('divisions') && <Divisions m={m} />}
              {m.shown('fleet') && <Fleet m={m} />}
              {m.shown('network') && <Network m={m} />}
              {m.shown('sustainability') && <Sustainability m={m} />}
              {m.shown('careers') && <Careers m={m} />}
              {m.shown('leadership') && <Leadership m={m} />}
              {m.shown('contact') && <Contact m={m} />}
            </main>
            {isEnabled(m.footer) && <Footer m={m} />}
          </div>
        </EnquiryContext.Provider>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
