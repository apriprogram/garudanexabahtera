// Template "MediCare General" — "Jelas & tenang, mudah dibaca semua usia": website rumah sakit umum (RS swasta/daerah)
// dengan IGD 24 jam. Halaman putih dan biru kertas, SATU warna tema biru klinis (bawaan #0B63C9), dan merah darurat
// tetap (#B71C1C) yang hanya dipakai untuk elemen IGD. Header: strip merah IGD (nomor bisa langsung ditelepon) + kontrol
// "Ukuran teks" A/A+/A++ (diingat di perangkat), lalu bilah putih menempel dengan tombol "Daftar Online". Hero "triage":
// foto rumah sakit yang terang sebagai LATAR selebar hero, lapisan putih dari kiri, dan tiga ubin aksi besar (Daftar Online,
// Jadwal Dokter, IGD 24 Jam merah). Lalu layanan, pendaftaran online 3 langkah (menyusun pesan WhatsApp; data pasien
// TIDAK disimpan di website), jadwal dokter dengan saring poli & hari, poliklinik & penunjang, pita IGD merah dengan
// garis detak jantung yang tergambar sekali, rawat inap (tab kelas kamar), asuransi & BPJS (tab), tanya jawab, kontak
// (darurat + informasi + peta), dan footer biru tua. Judul Atkinson Hyperlegible 700, isi Inter 17–18px; DATAR tanpa
// bayangan; container query agar akurat di bingkai HP 390px dan panel CMS. Demo: RS MediCare General, Semarang (fiktif).
import { useMemo, useState, type CSSProperties } from 'react';
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Clinics } from './Clinics';
import { Contact } from './Contact';
import { MEDICARE_ACCENT } from './defaultContent';
import { Doctors } from './Doctors';
import { Emergency } from './Emergency';
import { Faq } from './Faq';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { RegistrationPickContext, TextSizeContext, useTextSize, type RegistrationPick } from './hooks';
import { Inpatient } from './Inpatient';
import { Insurance } from './Insurance';
import { TEXT_SIZES, readMedicare } from './model';
import { MEDICARE_PHOTOS } from './photos';
import { Registration } from './Registration';
import { Services } from './Services';
import { MEDICARE_FONT } from './styles';
import './medicare-general.css';

export default function MediCareGeneral({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readMedicare(content);
  const fontStyle = useKitFont(MEDICARE_FONT);
  const [size, setSize] = useTextSize();
  const [pick, setPick] = useState<RegistrationPick | null>(null);
  const textSize = useMemo(() => ({ size, setSize }), [size, setSize]);
  const registrationPick = useMemo(
    () => ({ pick, choose: (poli: string, doctor: string) => setPick((prev) => ({ poli, doctor, nonce: (prev?.nonce ?? 0) + 1 })) }),
    [pick],
  );
  const style = { ...m.colors, ...fontStyle, '--mc-fs': String(TEXT_SIZES[size]?.scale ?? 1) } as CSSProperties;

  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={MEDICARE_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={MEDICARE_PHOTOS}>
        <TextSizeContext.Provider value={textSize}>
          <RegistrationPickContext.Provider value={registrationPick}>
            <div style={style} data-mc-text-size={TEXT_SIZES[size]?.name ?? 'normal'} className="relative bg-white text-[#0E1B2E]">
              <Header m={m} />
              <main>
                {isEnabled(m.hero) && <Hero m={m} />}
                {m.shown('services') && <Services m={m} />}
                {m.shown('registration') && <Registration m={m} />}
                {m.shown('doctors') && <Doctors m={m} />}
                {m.shown('clinics') && <Clinics m={m} />}
                {m.shown('emergency') && <Emergency m={m} />}
                {m.shown('inpatient') && <Inpatient m={m} />}
                {m.shown('insurance') && <Insurance m={m} />}
                {m.shown('faq') && <Faq m={m} />}
                {isEnabled(m.contact) && <Contact m={m} />}
              </main>
              {isEnabled(m.footer) && <Footer m={m} />}
            </div>
          </RegistrationPickContext.Provider>
        </TextSizeContext.Provider>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
