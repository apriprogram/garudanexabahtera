// Template "Lawatan" — "Postcard journal": website tour & travel rombongan dengan bus pariwisata (study tour sekolah,
// gathering kantor, wisata keluarga, ziarah). Krem dan putih bergantian, satu pita tinta (galeri), hijau tua turunan warna
// tema (footer, panel estimasi), judul Bricolage Grotesque, isi Inter, wadah PENUH kiri-kanan, DATAR tanpa bayangan; motif
// kartu pos dipakai hemat (garis airmail, perangko berlubang, cap pos, label perangko). Urutan = jalur keputusan
// pengunjung: hero "postcard" (foto pemandangan selebar layar + panel kartu pos dengan chip jenis trip) → paket wisata
// (saringan jenis trip, kartu pos berperangko harga, itinerary per hari) → FILM itinerary yang diputar saat digulir (rute +
// bus + rel kartu pos; statis tanpa gerak) → yang termasuk → hitung & rancang trip (estimasi + pesan WhatsApp) →
// testimoni → galeri mosaik selebar layar → tanya jawab → kontak + peta → footer. Chip jenis trip di hero dan di paket
// berbagi satu keadaan; "Hitung biaya" di kartu paket mengisi formulir. JUJUR: formulir hanya menyusun pesan WhatsApp,
// harga contoh dikonfirmasi admin, tanpa pembayaran online. Gerak khas di ./lawatan.css + ./hooks (mati pada
// prefers-reduced-motion, cetak, dan pratinjau CMS). Demo: Lawatan Tour & Travel, Yogyakarta (fiktif).
import { useRef, useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { useTemplateRuntime } from '../shared/runtime';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Contact, Faq } from './Closing';
import { Custom } from './Custom';
import { LAWATAN_ACCENT } from './defaultContent';
import { Film } from './Film';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { Included } from './Included';
import { CUSTOM_PACKAGE, emptyPlan, readLawatan, type LawatanModel, type PlanForm } from './model';
import { Packages } from './Packages';
import { LAWATAN_PHOTOS } from './photos';
import { Gallery, Testimonials } from './Stories';
import { LAWATAN_FONT } from './styles';
import './lawatan.css';

function Page({ m }: { m: LawatanModel }) {
  const { goTo } = useTemplateRuntime();
  const [type, setType] = useState('');
  const [changed, setChanged] = useState(false);
  const [plan, setPlan] = useState<PlanForm>(() => emptyPlan(m.tours[0]?.title ?? ''));
  const status = useRef<HTMLParagraphElement>(null);
  const pkgField = useRef<HTMLSelectElement>(null);
  // Paket yang tidak ada lagi (konten berubah) → "Rancang sendiri"; jenis trip yang tidak ada lagi → kosong
  const safePlan: PlanForm = {
    ...plan,
    pkg: plan.pkg === CUSTOM_PACKAGE || m.tours.some((t) => t.title === plan.pkg) ? plan.pkg : CUSTOM_PACKAGE,
    type: m.types.includes(plan.type) ? plan.type : '',
  };

  const chooseType = (next: string) => {
    setType(next);
    setChanged(true);
    if (next) setPlan((p) => ({ ...p, type: next }));
  };
  // "Lihat paket" (tautan ke #packages, gulir oleh ActionLink): setelah gulir dimulai fokus ke jumlah hasil
  const showPackages = () => {
    window.setTimeout(() => status.current?.focus({ preventScroll: true }), 60);
  };
  // "Hitung biaya" di kartu: isi formulir, gulir ke sana, lalu fokus ke isian Paket (Tab berikutnya tetap di formulir)
  const planPackage = (title: string) => {
    const pkg = m.tours.find((t) => t.title === title);
    setPlan((p) => {
      // Jenis trip yang sudah dipilih dipertahankan bila paket ini memilikinya; kalau tidak, pakai jenis pertama paket
      const fits = (t: string) => Boolean(t) && (!pkg?.types.length || pkg.types.includes(t));
      const chosen = [p.type, type].find(fits);
      return { ...p, pkg: title, type: chosen || pkg?.types.find((t) => m.types.includes(t)) || p.type || type || '' };
    });
    goTo('custom');
    window.setTimeout(() => pkgField.current?.focus({ preventScroll: true }), 60);
  };
  const patchPlan = (patch: Partial<PlanForm>) => setPlan((p) => ({ ...p, ...patch }));

  return (
    <>
      <Header m={m} />
      <main>
        {isEnabled(m.hero) && <Hero m={m} type={type} onType={chooseType} onShow={showPackages} />}
        {m.shown('packages') && <Packages m={m} type={type} onType={chooseType} changed={changed} statusRef={status} onPlan={planPackage} />}
        {m.shown('film') && <Film m={m} />}
        {m.shown('included') && <Included m={m} />}
        {m.shown('custom') && <Custom m={m} plan={safePlan} onPlan={patchPlan} pkgRef={pkgField} />}
        {m.shown('testimonials') && <Testimonials m={m} />}
        {m.shown('gallery') && <Gallery m={m} />}
        {m.shown('faq') && <Faq m={m} />}
        {m.shown('contact') && <Contact m={m} />}
      </main>
      {isEnabled(m.footer) && <Footer m={m} />}
    </>
  );
}

export default function Lawatan({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readLawatan(content);
  const fontStyle = useKitFont(LAWATAN_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={LAWATAN_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={LAWATAN_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#1D2320]">
          <Page m={m} />
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
