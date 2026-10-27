// Template "NusaNiaga" — "Slatted import ledger": company profile importir & distributor bahan baku industri, mesin, dan
// suku cadang (sourcing luar negeri, impor, gudang, distribusi ke pabrik). Header putih yang berakhir di blok warna aksen
// berisi tombol penawaran; hero dengan SATU foto gudang di kiri yang menembus tepi layar dan dipotong menjadi bilah
// vertikal oleh mask CSS, judul Manrope rapat di kanan, dan chip negara asal yang menuju bagian Jangkauan. Lalu klien +
// strip industri berjalan, layanan (kartu bergaris aksen 3px), produk berfoto (rel geser di HP), proses impor buka-tutup
// dengan garis alur yang terisi saat terlihat, jangkauan (negara asal + area pengantaran), keunggulan dengan angka besar
// bersatuan, testimoni "buku referensi", tanya jawab dua kolom, pita ajakan crimson, kontak + formulir permintaan
// penawaran yang menyusun pesan WhatsApp (data tidak disimpan di website), dan footer putih bergaris aksen.
// Pita putih ↔ #F2F4F7, satu warna aksen dari CMS (crimson bawaan) menurunkan semua warna. DATAR: tanpa bayangan; ring,
// garis rambut, dan nada menggantikannya. Gerak tenang (CSS + IntersectionObserver lewat kit) yang mati pada
// prefers-reduced-motion dan pratinjau CMS; container query agar akurat di bingkai HP 390px dan panel CMS.
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Clients } from './Clients';
import { Cta, Faq } from './Closing';
import { Contact } from './Contact';
import { Coverage } from './Coverage';
import { NUSANIAGA_ACCENT } from './defaultContent';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { readNusaNiaga } from './model';
import { Products, Services } from './Offer';
import { NUSANIAGA_PHOTOS } from './photos';
import { Process } from './Process';
import { Advantages, Testimonials } from './Proof';
import { NUSANIAGA_FONT } from './styles';
import './nusaniaga.css';

export default function NusaNiaga({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readNusaNiaga(content);
  const fontStyle = useKitFont(NUSANIAGA_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={NUSANIAGA_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={NUSANIAGA_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#141821]">
          <Header m={m} />
          <main>
            {isEnabled(m.hero) && <Hero m={m} />}
            {m.shown('clients') && <Clients m={m} />}
            {m.shown('services') && <Services m={m} />}
            {m.shown('products') && <Products m={m} />}
            {m.shown('process') && <Process m={m} />}
            {m.shown('coverage') && <Coverage m={m} />}
            {m.shown('advantages') && <Advantages m={m} />}
            {m.shown('testimonials') && <Testimonials m={m} />}
            {m.shown('faq') && <Faq m={m} />}
            {m.shown('cta') && <Cta m={m} />}
            {m.shown('contact') && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
