import { useEffect } from 'react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { SectionChrome, type ChromeSection } from '../../components/layout/SectionChrome';
import { holdSectionInView } from '../../components/layout/scroll';
import Hero from '../../components/sections/Hero';
import LogoTicker from '../../components/sections/LogoTicker';
import Templates from '../../components/sections/Templates';
import Projects from '../../components/sections/Projects';
import Process from '../../components/sections/Process';
import FAQ from '../../components/sections/FAQ';
import { getHiddenSections, getWhatsappNumber, useSiteSettings, whatsappUrl } from '../../hooks/useSiteSettings';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * Urutan section beranda (SPEC §8). `id` = anchor (#templates, …) sekaligus kunci di setting `disabled_sections`
 * untuk menyembunyikan section, mis. `["projects"]`. `tone` = warna latar halaman saat section itu dibaca
 * (crossfade lewat SectionChrome, gaya BELAJAR CPNS); prop `alt` section mengikuti tone ini.
 */
const SECTIONS = [
  { id: 'templates', Component: Templates, tone: 'canvas' },
  { id: 'projects', Component: Projects, tone: 'alt' },
  { id: 'process', Component: Process, tone: 'alt' },
  { id: 'faq', Component: FAQ, tone: 'canvas' },
] as const;

/** Halaman utama website publik (tema terang). */
export default function Home() {
  const { settings, loaded } = useSiteSettings();
  const { t } = useTranslation();

  // Section menunggu setting dimuat agar yang disembunyikan admin tidak sempat tampil
  const hidden = getHiddenSections(settings);
  const sections = loaded ? SECTIONS.filter(({ id }) => !hidden.has(id)) : [];
  const whatsapp = getWhatsappNumber(settings);

  const labels: Record<string, string> = {
    templates: t('nav-templates'),
    projects: t('nav-projects'),
    process: t('nav-process'),
    faq: t('nav-faq'),
  };
  const chrome: ChromeSection[] = [
    { id: 'beranda', label: t('nav-home'), tone: 'canvas' },
    ...sections.map(({ id, tone }) => ({ id, label: labels[id] ?? id, tone })),
    { id: 'kontak', label: t('nav-contact'), tone: 'alt' },
  ];

  // Section baru ada setelah setting dimuat, jadi lompat ke #anchor dari URL (mis. /#kontak dari halaman lain) dan jaga
  // posisinya selama katalog/proyek di atasnya masih berganti dari skeleton ke data (tinggi halaman berubah).
  useEffect(() => {
    if (!loaded || !window.location.hash) return undefined;
    const raw = window.location.hash.slice(1);
    let id: string;
    try {
      id = decodeURIComponent(raw);
    } catch {
      id = raw; // hash dengan % tak valid: pakai apa adanya
    }
    return holdSectionInView(id);
  }, [loaded]);

  return (
    // relative isolate: lapisan latar SectionChrome (fixed, -z-10) tampil di atas latar aplikasi, di bawah isi
    <div className="relative isolate">
      <SectionChrome sections={chrome} />
      <Navbar />
      <main className="page-chrome">
        <header className="relative">
          <Hero />
          <LogoTicker />
        </header>
        {sections.map(({ id, Component, tone }, index) => (
          <Component key={id} alt={tone === 'alt'} number={String(index + 1).padStart(2, '0')} />
        ))}
      </main>
      <Footer chrome />

      {/* Tombol WhatsApp melayang (48px HP, 56px desktop, aman dari notch/home bar). Lapisan melayang → shadow-float */}
      <a
        href={whatsappUrl(whatsapp, 'Halo Admin, saya tertarik dengan template website atau jasa pembuatan website/aplikasi Garuda Nexa.')}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat WhatsApp"
        className="group fixed bottom-[max(16px,calc(env(safe-area-inset-bottom)+8px))] right-[max(16px,env(safe-area-inset-right))] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-whatsapp text-white shadow-float transition-colors hover:bg-whatsapp-hover sm:bottom-8 sm:right-8 sm:h-14 sm:w-14"
      >
        <span className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-full bg-surface px-3.5 py-2 text-[13px] font-semibold text-fg opacity-0 shadow-float ring-1 ring-inset ring-line transition-opacity group-hover:opacity-100 sm:block">
          Chat sekarang
        </span>
        <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.123.554 4.197 1.604 6.013l-1.706 6.233 6.376-1.673a11.77 11.77 0 005.772 1.515h.005c6.634 0 12.032-5.396 12.035-12.032a11.75 11.75 0 00-3.486-8.508" />
        </svg>
      </a>
    </div>
  );
}
