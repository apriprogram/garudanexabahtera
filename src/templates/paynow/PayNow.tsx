// Template "PayNow" — "Trust gradient": landing page dompet digital & payment gateway (aplikasi pembayaran, e-wallet,
// penyedia payment gateway untuk merchant). Hero foto latar selebar layar di bawah lapisan gradasi malam indigo →
// indigo → ungu dengan mockup HP dari CSS (saldo, tombol fitur, transaksi) dan kartu notifikasi; lalu strip jenis usaha
// (marquee), fitur bertab dengan layar HP yang berganti, simulasi biaya ("contoh tarif" dari CMS), keamanan (section
// malam), developer & API (jendela kode bertab + salin), pita angka bergradasi, cerita merchant, tanya jawab, unduh
// aplikasi, formulir pendaftaran merchant yang menyusun pesan WhatsApp, dan footer malam dengan baris legal. Judul
// Figtree, isi Inter, kode JetBrains Mono; satu warna tema menurunkan seluruh palet. DATAR tanpa bayangan. Gerak khas
// (./paynow.css) mati pada prefers-reduced-motion, cetak, dan pratinjau CMS. Container query agar akurat di bingkai HP
// 390px dan panel CMS. JUJUR: halaman pemasaran — tidak memproses pembayaran, tidak menyimpan saldo, contoh kode API
// ilustrasi. Demo: PayNow, merek fiktif dari Jakarta.
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Stats, Trust } from './Bands';
import { Download, Faq } from './Closing';
import { Contact } from './Contact';
import { PAYNOW_ACCENT } from './defaultContent';
import { Developers } from './Developers';
import { Features } from './Features';
import { Fees } from './Fees';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { readPaynow } from './model';
import { PAYNOW_PHOTOS } from './photos';
import { Security } from './Security';
import { Stories } from './Stories';
import { PAYNOW_FONT } from './styles';
import './paynow.css';

export default function PayNow({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readPaynow(content);
  const fontStyle = useKitFont(PAYNOW_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={PAYNOW_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={PAYNOW_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#0E0F2C]">
          <Header m={m} />
          <main>
            {isEnabled(m.hero) && <Hero m={m} />}
            {m.shown('trust') && <Trust m={m} />}
            {m.shown('features') && <Features m={m} />}
            {m.shown('fees') && <Fees m={m} />}
            {m.shown('security') && <Security m={m} />}
            {m.shown('developers') && <Developers m={m} />}
            {m.shown('stats') && <Stats m={m} />}
            {m.shown('testimonials') && <Stories m={m} />}
            {m.shown('faq') && <Faq m={m} />}
            {m.shown('download') && <Download m={m} />}
            {isEnabled(m.contact) && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
