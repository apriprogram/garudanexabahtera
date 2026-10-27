// Template "Dermaga" — "Route manifest": company profile perusahaan ekspor-impor umum & freight forwarding B2B
// (general trading, konsolidasi LCL, dokumen ekspor, pengiriman FCL/LCL). Halaman putih yang tenang dan presisi seperti
// lembar manifest: header putih solid bergaris tipis, hero "rute" (H1 Space Grotesk besar di 8 kolom, deskripsi & tombol
// di 4 kolom kanan bawah, foto terminal peti kemas saat senja 21:9 dengan garis rute putih + tiga chip putih pelabuhan,
// lalu strip manifest empat angka), kisi klien statis, tentang dengan baris fakta, kartu layanan bernomor bergaris tipis,
// SATU pita penuh warna tema untuk pasar & Incoterm, tabel proses kerja, galeri 21:9 + 3:2, testimoni bergaya surat
// muatan, tanya jawab, kotak ajakan dengan garis rute statis, kontak + formulir permintaan penawaran yang menyusun pesan
// WhatsApp (data tidak disimpan di website), dan footer teal-hitam dengan nama perusahaan sangat besar. Label & angka
// JetBrains Mono, sudut tajam (tombol 2px, kartu 4px, foto persegi), DATAR tanpa bayangan. Gerak khas (./dermaga.css):
// garis rute tergambar sekali dan pin muncul berurutan; mati pada prefers-reduced-motion, cetak, dan pratinjau CMS.
// Container query agar akurat di bingkai HP 390px dan panel CMS. Demo: PT Lintas Dermaga Nusantara, Surabaya (fiktif).
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Cta, Faq } from './Closing';
import { Gallery, Testimonials } from './Community';
import { About, Clients } from './Company';
import { Contact } from './Contact';
import { DERMAGA_ACCENT } from './defaultContent';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { Markets, Process } from './Markets';
import { readDermaga } from './model';
import { DERMAGA_PHOTOS } from './photos';
import { Services } from './Services';
import { DERMAGA_FONT } from './styles';
import './dermaga.css';

export default function Dermaga({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readDermaga(content);
  const fontStyle = useKitFont(DERMAGA_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={DERMAGA_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={DERMAGA_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#0F1D20]">
          <Header m={m} />
          <main>
            {isEnabled(m.hero) && <Hero m={m} />}
            {m.shown('clients') && <Clients m={m} />}
            {m.shown('about') && <About m={m} />}
            {m.shown('services') && <Services m={m} />}
            {m.shown('markets') && <Markets m={m} />}
            {m.shown('process') && <Process m={m} />}
            {m.shown('gallery') && <Gallery m={m} />}
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
