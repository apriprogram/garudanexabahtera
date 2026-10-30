// Template "Nusaline" — "Night line": website PO bus antarkota / bus malam (AKAP). Midnight #0B1026 (hero, film,
// footer) bergantian dengan pita putih dan #F2F4FA, SATU warna tema raspberry yang menjadi neon di latar gelap, judul
// Red Hat Display, jam/harga JetBrains Mono, pill & kartu radius 18, DATAR tanpa bayangan, wadah PENUH selebar layar.
// Urutan (jalur keputusan pengunjung): hero "departure" (foto jalan tol malam, H1, kartu cari jadwal + papan
// keberangkatan mini) → jadwal keberangkatan (saringan rute/kelas, tabel, Pesan → WhatsApp) → kelas (denah kursi SVG
// dari konfigurasi) → FILM satu malam di dalam bus (digerakkan gulir: malam → matahari terbit, jam & km berjalan) →
// rute & titik naik (diagram jalur + agen per kota) → fasilitas kabin (bento) → cara pesan (sobekan tiket) → cerita
// penumpang → tanya jawab → kontak & kantor pusat → footer (rute mono). Kartu cari di hero, tombol "Pesan kelas ini",
// dan rute di footer berbagi keadaan saringan jadwal lewat komponen Page di bawah. Formulir/tombol hanya MENYUSUN pesan
// WhatsApp: tidak ada pembayaran online, e-tiket, atau pilihan kursi real-time. Gerak (./nusaline.css) mati pada
// prefers-reduced-motion, cetak, dan pratinjau CMS. Demo: Nusaline (PO bus fiktif), Jakarta Timur.
import { useRef, useState } from 'react';
import type { TemplateRenderProps } from '../types';
import { useKitFont } from '../kit/fonts';
import { PhotoSetContext } from '../kit/context';
import { useTemplateRuntime } from '../shared/runtime';
import { TemplateShell } from '../shared/Shell';
import { isEnabled } from '../shared/utils';
import { Classes } from './Classes';
import { Contact, Faq } from './Closing';
import { NUSALINE_ACCENT } from './defaultContent';
import { Film } from './Film';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { ALL_ROUTES, readNusaline, type NusalineModel, type RouteChip, type ScheduleFilter, type ScheduleState, type SearchForm } from './model';
import { Onboard, Steps } from './Onboard';
import { NUSALINE_PHOTOS } from './photos';
import { Routes } from './Routes';
import { Schedule } from './Schedule';
import { Testimonials } from './Stories';
import { NUSALINE_FONT } from './styles';
import './nusaline.css';

function Page({ m }: { m: NusalineModel }) {
  const { goTo } = useTemplateRuntime();
  const [state, setState] = useState<ScheduleState>({ filter: ALL_ROUTES, date: '', pax: 1, changed: false });
  const status = useRef<HTMLParagraphElement>(null);
  const heroShown = isEnabled(m.hero);

  const setFilter = (filter: ScheduleFilter) => setState((s) => ({ ...s, filter, changed: true }));
  const toSchedule = () => {
    goTo('schedule');
    // Setelah gulir dimulai: fokus ke jumlah hasil (dibacakan pembaca layar), tanpa menggulir ulang
    window.setTimeout(() => status.current?.focus({ preventScroll: true }), 60);
  };
  const search = (form: SearchForm) => {
    setState({ filter: { from: form.from, to: form.to, cls: '' }, date: form.date, pax: form.pax, changed: true });
    toSchedule();
  };
  const bookClass = (cls: string) => {
    setState((s) => ({ ...s, filter: { ...s.filter, cls }, changed: true }));
    toSchedule();
  };
  // Rute di footer: tautannya sendiri sudah menggulir ke jadwal (ActionLink → goTo); fokus ikut pindah ke jumlah hasil,
  // jadi Tab berikutnya melanjutkan di tabel, bukan kembali ke footer
  const pickRoute = (chip: RouteChip) => {
    setState((s) => ({ ...s, filter: { from: chip.from, to: chip.to, cls: '' }, changed: true }));
    window.setTimeout(() => status.current?.focus({ preventScroll: true }), 60);
  };

  return (
    <>
      <Header m={m} overlay={heroShown} />
      <main>
        {heroShown && <Hero m={m} initial={{ from: state.filter.from, to: state.filter.to, date: state.date, pax: state.pax }} onSearch={search} />}
        {m.shown('schedule') && (
          <Schedule
            m={m}
            state={state}
            setFilter={setFilter}
            setDate={(date) => setState((s) => ({ ...s, date }))}
            setPax={(pax) => setState((s) => ({ ...s, pax }))}
            statusRef={status}
          />
        )}
        {m.shown('classes') && <Classes m={m} onBook={bookClass} />}
        {m.shown('film') && <Film m={m} />}
        {m.shown('routes') && <Routes m={m} />}
        {m.shown('onboard') && <Onboard m={m} />}
        {m.shown('steps') && <Steps m={m} />}
        {m.shown('testimonials') && <Testimonials m={m} />}
        {m.shown('faq') && <Faq m={m} />}
        {m.shown('contact') && <Contact m={m} />}
      </main>
      {isEnabled(m.footer) && <Footer m={m} onRoute={pickRoute} />}
    </>
  );
}

export default function Nusaline({ content, preview = false, motion }: TemplateRenderProps) {
  const m = readNusaline(content);
  const fontStyle = useKitFont(NUSALINE_FONT);
  return (
    <TemplateShell content={content} preview={preview} motion={motion} defaultAccent={NUSALINE_ACCENT} displayFont="inter">
      <PhotoSetContext.Provider value={NUSALINE_PHOTOS}>
        <div style={{ ...m.colors, ...fontStyle }} className="relative bg-white text-[#0E1230]">
          <Page m={m} />
        </div>
      </PhotoSetContext.Provider>
    </TemplateShell>
  );
}
