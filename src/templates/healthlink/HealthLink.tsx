// Template "HealthLink" — "App home": landing page layanan telemedicine yang terhubung ke rumah sakit mitra (chat &
// video call dokter, resep digital & tebus obat, rekam medis, pengingat kontrol). Dirancang dari HP dulu seperti layar
// beranda aplikasi: kanvas abu sangat muda, kartu putih radius 24-28 bergaris 1px, ikon garis besar di kotak tint, label
// kapsul, tombol besar rounded-2xl, panel ala bottom sheet; layar lebar = kisi terpusat bergaya aplikasi. Bilah menu
// putih melayang di atas hero "kartu aplikasi" (foto latar selebar layar + kartu putih berisi H1, kolom cari dokter, dan
// empat ubin layanan), layanan, cara konsultasi (ilustrasi chat), dokter online (cari + saring, inisial bukan foto),
// resep & obat, rekam medis (ilustrasi layar aplikasi), pengingat kontrol (.ics / Google Calendar di perangkat), RS
// mitra, biaya, unduh aplikasi (satu panel gelap warna tema), tanya jawab, bantuan + kartu darurat 119, footer kartu.
// HP: bilah aksi bawah "Chat Dokter / Video Call" setelah hero lewat (tidak menabrak tombol WhatsApp Shell). DATAR tanpa
// bayangan. Gerak khas (./healthlink.css): ubin pop, gelembung chat berurutan, titik status berdenyut 3×; mati pada
// prefers-reduced-motion, cetak, dan pratinjau CMS. Jujur: website tidak menyimpan data pasien/rekam medis/pengingat dan
// tidak memproses pembayaran; konsultasi lewat WhatsApp atau aplikasi pembeli. Demo: HealthLink, Yogyakarta (fiktif).
import { useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { useTemplateRuntime } from '../shared/runtime';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Prescription, Records } from './Care';
import { Contact, Download, Faq } from './Closing';
import { HEALTHLINK_ACCENT } from './defaultContent';
import { Dock } from './Dock';
import { Doctors } from './Doctors';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { readHealthLink, type HealthLinkModel } from './model';
import { Hospitals, Pricing } from './Network';
import { HEALTHLINK_PHOTOS } from './photos';
import { Reminders } from './Reminders';
import { Services, Steps } from './Services';
import { HEALTHLINK_FONT } from './styles';
import './healthlink.css';

/** Isi halaman di dalam Shell (butuh runtime Shell untuk menggulir ke daftar dokter setelah mencari). */
function Page({ m }: { m: HealthLinkModel }) {
  const { goTo } = useTemplateRuntime();
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('');
  const hero = isEnabled(m.hero);
  const doctors = m.shown('doctors');
  const search = doctors
    ? (value: string) => {
        setQuery(value.trim());
        setSpecialty('');
        goTo('doctors');
      }
    : null;
  const dock = hero && !!((m.chatAction && m.dockChatLabel) || (m.videoAction && m.dockVideoLabel));

  return (
    <>
      <Header m={m} overlay={hero} />
      <main>
        {hero && <Hero m={m} onSearch={search} />}
        {m.shown('services') && <Services m={m} />}
        {m.shown('steps') && <Steps m={m} />}
        {doctors && <Doctors m={m} filter={{ query, specialty, setQuery, setSpecialty }} />}
        {m.shown('prescription') && <Prescription m={m} />}
        {m.shown('records') && <Records m={m} />}
        {m.shown('reminders') && <Reminders m={m} />}
        {m.shown('hospitals') && <Hospitals m={m} />}
        {m.shown('pricing') && <Pricing m={m} />}
        {m.shown('download') && <Download m={m} />}
        {m.shown('faq') && <Faq m={m} />}
        {isEnabled(m.contact) && <Contact m={m} />}
      </main>
      {isEnabled(m.footer) && <Footer m={m} dock={dock} />}
      {dock && <Dock m={m} />}
    </>
  );
}

export default function HealthLink({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readHealthLink(content);
  const fontStyle = useKitFont(HEALTHLINK_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={HEALTHLINK_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={HEALTHLINK_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-[#F5F7FA] text-[#0E1B2B]">
          <Page m={m} />
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
