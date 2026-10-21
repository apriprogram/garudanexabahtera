import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, Home as HomeIcon, LayoutTemplate, MessageCircle, Smartphone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { HeroBackground } from '../../components/sections/hero/HeroBackground';
import { LogoBadge } from '../../components/ui/LogoMark';
import { SplitText } from '../../components/ui/SplitText';
import { getHiddenSections, getWhatsappNumber, useSiteSettings, whatsappUrl } from '../../hooks/useSiteSettings';
import { useDocumentTitle } from './template/useDocumentTitle';

const NOT_FOUND_TITLE = 'Halaman tidak ditemukan | Garuda Nexa';

/**
 * `<meta name="robots" content="noindex">` selama halaman 404 tampil, agar alamat yang salah tidak diindeks sebagai
 * salinan beranda (hosting tetap mengirim index.html berstatus 200). Meta yang sudah ada dipulihkan saat keluar.
 */
function useNoIndex() {
  useEffect(() => {
    const existing = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (existing) {
      const previous = existing.content;
      existing.content = 'noindex';
      return () => {
        existing.content = previous;
      };
    }
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

/**
 * Halaman 404 publik gaya BELAJAR CPNS (terang): latar medan titik interaktif, kartu bilah alamat datar,
 * judul kata per kata, dan jalan pintas ke beranda / katalog template.
 */
export default function NotFound() {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const whatsapp = getWhatsappNumber(settings);
  const templatesHidden = getHiddenSections(settings).has('templates');
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  useDocumentTitle(NOT_FOUND_TITLE);
  useNoIndex();

  return (
    <>
      <Navbar />
      {/* id="konten" = tujuan SkipLink di Navbar; tabIndex -1 agar bisa menerima fokus tanpa masuk urutan Tab */}
      <main
        id="konten"
        tabIndex={-1}
        className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-canvas pb-16 pt-24 focus:outline-none sm:pt-28"
      >
        <HeroBackground className="absolute inset-0 -z-10" />

        <div className="container-site">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            {/* Bilah alamat datar dengan path yang tidak ditemukan. Path panjang membungkus (tidak dipotong), jadi
                bagian yang salah tetap terbaca; satu baris = pil (radius = setengah tinggi), lebih = kotak rounded. */}
            <div
              title={path}
              className="flex min-h-10 w-full max-w-md animate-fade-up items-center gap-2 rounded-[20px] bg-surface py-1.5 pl-1.5 pr-4 ring-1 ring-inset ring-line motion-reduce:animate-none sm:min-h-11 sm:max-w-lg sm:rounded-[22px] sm:pl-2"
            >
              <LogoBadge className="h-7 w-7 shrink-0" />
              <span className="min-w-0 flex-1 text-left text-[13px] font-medium leading-snug text-muted [overflow-wrap:anywhere] sm:text-sm">
                garudanexa.com<span className="text-fg">{path}</span>
              </span>
              <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-danger-50 px-2.5 font-mono text-[11px] font-semibold text-danger-700">
                404
              </span>
            </div>

            <SplitText
              as="h1"
              delay={120}
              stagger={70}
              className="mt-8 block text-[26px] font-semibold leading-[1.18] tracking-[-0.02em] text-fg sm:mt-10 sm:text-5xl sm:leading-[1.05] sm:tracking-[-0.035em]"
              parts={[{ text: 'Halaman ini' }, { text: 'tidak ditemukan.', className: 'text-primary' }]}
            />
            <p className="mt-3 animate-fade-up text-[14px] leading-relaxed text-muted [animation-delay:350ms] motion-reduce:animate-none sm:mt-5 sm:text-lg">
              Maaf, halaman yang Anda cari tidak ada atau sudah dipindahkan. Periksa kembali alamatnya, atau lanjutkan dari salah
              satu tautan di bawah.
            </p>

            <div className="mt-8 flex w-full animate-fade-up flex-col gap-2.5 [animation-delay:500ms] motion-reduce:animate-none sm:mt-10 sm:w-auto sm:flex-row sm:gap-3">
              <Link to="/" className="btn btn-primary btn-lg group">
                <HomeIcon className="h-4 w-4" aria-hidden />
                Ke beranda
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              {/* Katalog beranda disembunyikan admin → tawarkan pesanan custom, bukan anchor #templates yang tidak ada */}
              {templatesHidden ? (
                <Link to="/pesan-custom" className="btn btn-outline btn-lg">
                  <Smartphone className="h-4 w-4" aria-hidden />
                  Pesan Custom
                </Link>
              ) : (
                <Link to="/#templates" className="btn btn-outline btn-lg">
                  <LayoutTemplate className="h-4 w-4" aria-hidden />
                  Lihat template
                </Link>
              )}
            </div>

            <div className="mt-6 flex animate-fade-up flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm [animation-delay:650ms] motion-reduce:animate-none">
              {canGoBack && (
                <button type="button" onClick={() => navigate(-1)} className="link-site inline-flex min-h-10 items-center gap-1.5">
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Kembali ke halaman sebelumnya
                </button>
              )}
              <a
                href={whatsappUrl(whatsapp, 'Halo Admin, saya butuh bantuan menemukan halaman di website Garuda Nexa.')}
                target="_blank"
                rel="noopener noreferrer"
                className="link-site inline-flex min-h-10 items-center gap-1.5"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Hubungi kami
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
