// Template "MomKid Hospital" — "Warm pastel": website rumah sakit ibu & anak (kehamilan, persalinan, tumbuh kembang
// anak). Header krem padat dengan kapsul menu peach; hero "cradle" = foto ibu & bayi sebagai latar selebar layar dengan
// lapisan peach dari kiri, tepi bawah bergelombang, dan chip pastel yang mengapung dua kali; lalu perjalanan bertahap
// (tab stepper), paket persalinan dengan pilihan kamar, pita mint jadwal imunisasi (pilih umur → jadwal berikutnya),
// kartu jadwal dokter anak (inisial, strip mingguan), klinik laktasi (foto gumpalan), rel foto tur kamar bersalin,
// artikel parenting, testimoni orang tua, tanya jawab, pita peach ajakan dengan doodle berkilau, kontak + formulir
// pendaftaran yang menyusun pesan WhatsApp (data tidak disimpan di website), dan footer mint. Judul Nunito, kartu radius
// 28 berwarna pastel, tombol pil, ilustrasi doodle asli, DATAR tanpa bayangan. Gerak khas (./momkid.css) mati pada
// prefers-reduced-motion, cetak, dan pratinjau CMS. Container query agar akurat di bingkai HP 390px dan panel CMS.
// Demo: RSIA MomKid, Tangerang Selatan (fiktif).
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Articles } from './Articles';
import { Cta, Faq } from './Closing';
import { Contact } from './Contact';
import { MOMKID_ACCENT } from './defaultContent';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { Immunization } from './Immunization';
import { Journey } from './Journey';
import { Lactation } from './Lactation';
import { readMomkid } from './model';
import { Packages } from './Packages';
import { Pediatrics } from './Pediatrics';
import { MOMKID_PHOTOS } from './photos';
import { MOMKID_FONT } from './styles';
import { Testimonials } from './Testimonials';
import { Tour } from './Tour';
import './momkid.css';

export default function MomKid({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readMomkid(content);
  const fontStyle = useKitFont(MOMKID_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={MOMKID_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={MOMKID_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-[#FFF9F5] text-[#2E2228]">
          <Header m={m} />
          <main>
            {isEnabled(m.hero) && <Hero m={m} />}
            {m.shown('journey') && <Journey m={m} />}
            {m.shown('packages') && <Packages m={m} />}
            {m.shown('immunization') && <Immunization m={m} />}
            {m.shown('pediatrics') && <Pediatrics m={m} />}
            {m.shown('lactation') && <Lactation m={m} />}
            {m.shown('tour') && <Tour m={m} />}
            {m.shown('articles') && <Articles m={m} />}
            {m.shown('testimonials') && <Testimonials m={m} />}
            {m.shown('faq') && <Faq m={m} />}
            {m.shown('cta') && <Cta m={m} />}
            {isEnabled(m.contact) && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
