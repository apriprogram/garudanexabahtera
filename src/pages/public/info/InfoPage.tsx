// Kerangka halaman info & jasa host utama (/harga, /tentang, /kontak, /jasa-*): Navbar, remah roti, kepala halaman
// (badge, H1, pengantar, tombol), isi per section (H2), Footer (dengan CTA biru #kontak). Gaya sama dengan
// /pesan-custom dan halaman legal: datar, garis tipis, satu aksen biru (design.md).
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../../../components/layout/Footer';
import Navbar from '../../../components/layout/Navbar';

export interface Crumb {
  label: string;
  to: string;
}

interface InfoPageProps {
  /** Label halaman ini di remah roti. */
  crumb: string;
  /** Tingkat di antara Beranda dan halaman ini. */
  parents?: readonly Crumb[];
  badge: string;
  /** H1 (satu per halaman). */
  title: React.ReactNode;
  lead: React.ReactNode;
  /** Tombol di bawah pengantar. */
  actions?: React.ReactNode;
  /** Kolom kanan kepala halaman (desktop) / di bawah pengantar (HP), mis. kotak fakta. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}

export const InfoPage: React.FC<InfoPageProps> = ({ crumb, parents = [], badge, title, lead, actions, aside, children }) => (
  <>
    <Navbar />
    <main id="konten" tabIndex={-1} className="bg-canvas pt-nav focus:outline-none">
      <div className="relative overflow-hidden">
        {/* Aksen lembut biru brand di latar kepala halaman (sama dengan /pesan-custom) */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-linear-to-b from-brand-50/80 to-transparent" />
        <div className="container-site relative pb-10 pt-5 sm:pb-16 sm:pt-8">
          {/* Lebar isi sama dengan halaman artikel panduan (PanduanArticle: max-w-[1160px]), permintaan pemilik 2026-10-24 */}
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
                    <Link to={parent.to} className="inline-flex min-h-10 items-center truncate font-medium text-muted transition-colors hover:text-primary">
                      {parent.label}
                    </Link>
                  </li>
                ))}
                <li className="flex min-w-0 items-center gap-1.5">
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate" aria-current="page">
                    {crumb}
                  </span>
                </li>
              </ol>
            </nav>

            <header
              className={`mt-3 grid items-start gap-8 sm:mt-6 ${aside ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16 xl:gap-24' : ''}`}
            >
              <div className="max-w-3xl">
                <span className="badge-site">{badge}</span>
                <h1 className="mt-4 text-[26px] font-semibold leading-[1.18] tracking-[-0.02em] text-fg sm:text-5xl sm:leading-[1.06] sm:tracking-[-0.03em] xl:text-[56px]">
                  {title}
                </h1>
                <div className="mt-4 text-[14px] leading-relaxed text-muted sm:mt-5 sm:text-lg sm:leading-relaxed">{lead}</div>
                {actions && <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">{actions}</div>}
              </div>
              {aside && <div className="min-w-0">{aside}</div>}
            </header>
          </div>
        </div>
      </div>

      <div className="container-site pb-14 sm:pb-20">
        <div className="mx-auto max-w-[1160px]">{children}</div>
      </div>
    </main>
    <Footer />
  </>
);

interface InfoSectionProps {
  /** id section (anchor) sekaligus dasar id judul. */
  id: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/** Satu bagian isi halaman info: H2 + pengantar opsional + isi. */
export const InfoSection: React.FC<InfoSectionProps> = ({ id, title, intro, children, className = '' }) => (
  <section id={id} aria-labelledby={`${id}-judul`} className={`scroll-mt-[calc(var(--nav-offset)+1.5rem)] pt-12 sm:pt-20 ${className}`}>
    <div className="max-w-3xl">
      <h2 id={`${id}-judul`} className="text-xl font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[34px] sm:leading-[1.12]">
        {title}
      </h2>
      {intro && <div className="mt-3 text-[14px] leading-relaxed text-muted sm:mt-4 sm:text-[17px]">{intro}</div>}
    </div>
    {children && <div className="mt-6 sm:mt-8">{children}</div>}
  </section>
);

/** Paragraf isi halaman info. */
export const Prose: React.FC<{ paragraphs: readonly React.ReactNode[]; className?: string }> = ({ paragraphs, className = '' }) => (
  <div className={`max-w-3xl space-y-4 text-[14px] leading-relaxed text-muted sm:text-[17px] ${className}`}>
    {paragraphs.map((text, index) => (
      <p key={index}>{text}</p>
    ))}
  </div>
);
