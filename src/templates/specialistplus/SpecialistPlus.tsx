// Template "SpecialistPlus" — "Clinical data": website pusat klinik spesialis, laboratorium, dan radiologi. Header NAVY
// padat; hero "console": foto ruang pencitraan sebagai latar penuh di bawah lapisan navy, H1 putih IBM Plex Sans, dan
// panel KONSOL DATA (pilih spesialis → jumlah dokter, hari praktik, jadwal terdekat + tiga angka bersatuan). Lalu tab
// klinik spesialis dengan tabel jadwal dokter (daftar → pesan WhatsApp), TABEL perbandingan paket MCU, pita navy hasil
// lab dengan formulir permintaan yang hanya menyusun pesan WhatsApp (data tidak disimpan, hasil lab tidak ditampilkan
// di website), kartu spesifikasi alat, batang waktu hasil per kelompok, testimoni pasien (inisial), tanya jawab, kontak
// dengan catatan darurat 119, dan footer navy. Label section mono "SPX-02 · MCU", angka JetBrains Mono, kartu radius 8,
// tombol radius 6, DATAR tanpa bayangan. Gerak khas (./specialistplus.css): garis pindai menyapu konsol sekali, baris
// tabel muncul bertahap, batang waktu hasil tumbuh sekali; mati pada prefers-reduced-motion, cetak, dan pratinjau CMS.
// Klinik yang dipilih di konsol hero = tab aktif di bagian Spesialis (state di sini). Container query agar akurat di
// bingkai HP 390px dan panel CMS. Demo: SpecialistPlus Medical Center, Medan (fiktif).
import { useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Faq, Testimonials } from './Community';
import { Contact } from './Contact';
import { SPECIALISTPLUS_ACCENT } from './defaultContent';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { LabResults } from './LabResults';
import { Mcu } from './Mcu';
import { readSpecialistPlus } from './model';
import { SPECIALISTPLUS_PHOTOS } from './photos';
import { Specialists } from './Specialists';
import { SPECIALISTPLUS_FONT } from './styles';
import { Technology } from './Technology';
import { Turnaround } from './Turnaround';
import './specialistplus.css';

export default function SpecialistPlus({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readSpecialistPlus(content);
  const fontStyle = useKitFont(SPECIALISTPLUS_FONT);
  const [specialty, setSpecialty] = useState(0);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={SPECIALISTPLUS_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={SPECIALISTPLUS_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#0D1B2A]">
          <Header m={m} />
          <main>
            {isEnabled(m.hero) && <Hero m={m} active={specialty} onSelect={setSpecialty} />}
            {m.shown('specialists') && <Specialists m={m} active={specialty} onSelect={setSpecialty} />}
            {m.shown('mcu') && <Mcu m={m} />}
            {m.shown('labresults') && <LabResults m={m} />}
            {m.shown('technology') && <Technology m={m} />}
            {m.shown('turnaround') && <Turnaround m={m} />}
            {m.shown('testimonials') && <Testimonials m={m} />}
            {m.shown('faq') && <Faq m={m} />}
            {isEnabled(m.contact) && <Contact m={m} />}
          </main>
          {isEnabled(m.footer) && <Footer m={m} onSelect={setSpecialty} />}
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
