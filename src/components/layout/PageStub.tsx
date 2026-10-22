// Kerangka sementara untuk halaman publik baru yang isinya belum jadi (docs/platform/SEO-PLAN.md §5.1): Navbar,
// breadcrumb, judul, satu-dua kalimat jujur bahwa halaman sedang disiapkan, jalan pintas ke halaman yang sudah ada,
// kotak kontak, Footer. Kepala halamannya noindex (stubHead di *.seo.ts), jadi tidak terindeks.
// Dibuat WP1. Setiap paket mengganti stub halamannya sendiri; hapus file ini setelah tidak ada lagi yang memakainya.
import React from 'react';
import { ChevronRight, LayoutTemplate, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from './Footer';
import Navbar from './Navbar';
import { getContactEmail, getWhatsappNumber, useSiteSettings, whatsappUrl } from '../../hooks/useSiteSettings';
import { useDocumentTitle } from '../../pages/public/template/useDocumentTitle';
import { HUB_PATHS } from '../../seo/paths';

export interface StubCrumb {
  label: string;
  to: string;
}

interface PageStubProps {
  /** Label kecil di atas judul, mis. "Template", "Jasa", "Panduan". */
  badge: string;
  /** H1 halaman. */
  title: string;
  /** Judul tab (tanpa akhiran merek). Bawaan = title. */
  documentTitle?: string;
  /** Label halaman ini di breadcrumb. Bawaan = title. */
  crumb?: string;
  /** Tingkat breadcrumb di antara Beranda dan halaman ini. */
  parents?: StubCrumb[];
  /** Satu-dua kalimat di bawah judul. Hanya fakta. */
  intro: React.ReactNode;
  /** Pesan pembuka WhatsApp untuk tombol Konsultasi Gratis. */
  whatsappMessage: string;
  /** Isi tambahan di bawah intro (mis. daftar yang sudah ada). */
  children?: React.ReactNode;
}

/** Jalan pintas ke halaman yang sudah berfungsi (label sesuai glosarium design.md). */
const SHORTCUTS = [
  {
    to: '/#templates',
    label: 'Pilih Template',
    text: 'Lihat semua template website siap pakai beserta harga dan demonya di beranda.',
    icon: LayoutTemplate,
  },
  {
    to: HUB_PATHS.customOrder,
    label: 'Pesan Custom',
    text: 'Ceritakan kebutuhan website atau aplikasi Android/iOS Anda lewat formulir pesanan custom.',
    icon: Smartphone,
  },
] as const;

export const PageStub: React.FC<PageStubProps> = ({
  badge,
  title,
  documentTitle,
  crumb,
  parents = [],
  intro,
  whatsappMessage,
  children,
}) => {
  const { settings } = useSiteSettings();
  const whatsapp = getWhatsappNumber(settings);
  const email = getContactEmail(settings);
  useDocumentTitle(`${documentTitle ?? title} | Garuda Nexa`);

  return (
    <>
      <Navbar />
      <main id="konten" tabIndex={-1} className="bg-canvas pt-nav focus:outline-none">
        <div className="container-site pb-14 pt-5 sm:pb-20 sm:pt-8">
          <div className="mx-auto max-w-[1160px]">
            <nav aria-label="Breadcrumb" className="min-w-0 text-[13px] text-subtle">
              <ol className="flex min-w-0 items-center gap-1.5">
                <li className="flex shrink-0 items-center">
                  <Link to="/" className="inline-flex min-h-10 items-center font-medium text-muted transition-colors hover:text-primary">
                    Beranda
                  </Link>
                </li>
                {parents.map((parent) => (
                  <li key={parent.to} className="flex min-w-0 items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <Link
                      to={parent.to}
                      className="inline-flex min-h-10 items-center truncate font-medium text-muted transition-colors hover:text-primary"
                    >
                      {parent.label}
                    </Link>
                  </li>
                ))}
                <li className="flex min-w-0 items-center gap-1.5">
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate" aria-current="page">
                    {crumb ?? title}
                  </span>
                </li>
              </ol>
            </nav>

            <header className="mt-3 max-w-3xl sm:mt-5">
              <span className="badge-site">{badge}</span>
              <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-4xl">{title}</h1>
              <div className="mt-3 text-[14px] leading-relaxed text-muted sm:text-lg sm:leading-relaxed">{intro}</div>
              <p className="mt-4 text-[13px] text-subtle sm:text-sm">Halaman ini sedang kami lengkapi.</p>
            </header>

            {children && <div className="mt-6 max-w-3xl sm:mt-10">{children}</div>}

            <ul className="mt-8 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4">
              {SHORTCUTS.map(({ to, label, text, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} className="card-flat lift flex h-full items-start gap-3.5 p-4 sm:gap-4 sm:p-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-alt text-primary ring-1 ring-inset ring-line">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-fg sm:text-xl">{label}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted sm:text-[15px]">{text}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <aside aria-label="Hubungi kami" className="mt-6 rounded-[24px] bg-alt p-5 ring-1 ring-inset ring-line sm:mt-8 sm:p-7">
              <h2 className="text-base font-semibold text-fg sm:text-xl">Ada yang ingin Anda tanyakan?</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted sm:text-[15px]">
                Hubungi kami lewat WhatsApp atau email untuk tanya template, website custom, atau aplikasi mobile.
              </p>
              <div className="mt-4 flex flex-col gap-2.5 sm:mt-5 sm:flex-row sm:flex-wrap sm:gap-3">
                <a href={whatsappUrl(whatsapp, whatsappMessage)} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Konsultasi Gratis
                  <span className="sr-only">(tab baru)</span>
                </a>
                <a href={`mailto:${email}`} className="btn btn-outline min-w-0">
                  <Mail className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{email}</span>
                </a>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PageStub;
