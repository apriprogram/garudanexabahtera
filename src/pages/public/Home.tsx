import { useEffect } from 'react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { SectionChrome, type ChromeSection } from '../../components/layout/SectionChrome';
import { holdSectionInView } from '../../components/layout/scroll';
import Hero from '../../components/sections/Hero';
import LogoTicker from '../../components/sections/LogoTicker';
import Templates from '../../components/sections/Templates';
import Projects from '../../components/sections/Projects';
import FAQ from '../../components/sections/FAQ';
import HomeCompare from '../../components/sections/home/HomeCompare';
import HomeFeatures from '../../components/sections/home/HomeFeatures';
import { getHiddenSections, useSiteSettings } from '../../hooks/useSiteSettings';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * Urutan section beranda (SPEC §8, SEO-PLAN §5.6 langkah 4). `id` = anchor (#templates, …) sekaligus kunci di setting
 * `disabled_sections` untuk menyembunyikan section, mis. `["projects"]`. `tone` = warna latar halaman saat section itu
 * dibaca (crossfade lewat SectionChrome, gaya BELAJAR CPNS); prop `alt` section mengikuti tone ini.
 * - section #kategori ("Template website untuk setiap jenis usaha") dihapus atas permintaan pemilik 2026-10-24; halaman
 *   kategori tetap ditautkan dari footer & katalog, "Sudah termasuk" pindah ke bawah kolom cari #templates
 * - perbandingan: tabel template vs custom (Lampiran D, versi pendek)
 * - section #panduan (artikel terbaru) dihapus atas permintaan pemilik 2026-10-24; panduan tetap di menu & /panduan
 */
const SECTIONS = [
  { id: 'templates', Component: Templates, tone: 'canvas' },
  // Proyek tepat di bawah Pilih Template (permintaan pemilik 2026-10-24)
  { id: 'projects', Component: Projects, tone: 'alt' },
  { id: 'perbandingan', Component: HomeCompare, tone: 'alt' },
  // Keunggulan (bento fitur) menggantikan "Cara kerja kami" (#process), permintaan pemilik 2026-10-24
  { id: 'keunggulan', Component: HomeFeatures, tone: 'alt' },
  { id: 'faq', Component: FAQ, tone: 'canvas' },
] as const;

/** Halaman utama website publik (tema terang). */
export default function Home() {
  const { settings, loaded } = useSiteSettings();
  const { t } = useTranslation();

  // Section menunggu setting dimuat agar yang disembunyikan admin tidak sempat tampil
  const hidden = getHiddenSections(settings);
  const sections = loaded ? SECTIONS.filter(({ id }) => !hidden.has(id)) : [];

  const labels: Record<string, string> = {
    perbandingan: 'Perbandingan',
    templates: t('nav-templates'),
    projects: t('nav-projects'),
    keunggulan: 'Keunggulan',
    faq: t('nav-faq'),
  };
  const chrome: ChromeSection[] = [
    { id: 'beranda', label: t('nav-home'), tone: 'canvas' },
    ...sections.map(({ id, tone }) => ({ id, label: labels[id] ?? id, tone })),
    // Ajakan #kontak berlatar putih padat di atas footer gelap (gaya Mobbin)
    { id: 'kontak', label: t('nav-contact'), tone: 'canvas' },
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
      <Navbar />
      {/* id="konten" = tujuan SkipLink di Navbar; tabIndex -1 agar bisa menerima fokus tanpa masuk urutan Tab */}
      <main id="konten" tabIndex={-1} className="page-chrome focus:outline-none">
        <header className="relative">
          <Hero />
          <LogoTicker />
        </header>
        {sections.map(({ id, Component, tone }, index) => (
          <Component key={id} alt={tone === 'alt'} number={String(index + 1).padStart(2, '0')} />
        ))}
      </main>
      <Footer chrome />
      {/* Setelah Footer: lapisan fixed (tampilan sama), tetapi titik section di akhir urutan Tab, bukan sebelum logo/menu */}
      <SectionChrome sections={chrome} />

      {/* Chat Nexa melayang dipasang global di App (FloatingNexa), selalu tampil di semua ukuran layar */}
    </div>
  );
}
