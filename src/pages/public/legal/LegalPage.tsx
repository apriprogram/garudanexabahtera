// Kerangka halaman legal publik (/syarat-ketentuan, /kebijakan-privasi, /kebijakan-pengembalian-dana):
// Navbar, breadcrumb, judul + "Terakhir diperbarui", daftar isi (sticky di desktop, disclosure di HP), isi bernomor,
// kotak kontak, dokumen terkait, Footer.
import React from 'react';
import { ArrowRight, ChevronDown, ChevronRight, FileText, Mail, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../../../components/layout/Footer';
import Navbar from '../../../components/layout/Navbar';
import { LEGAL_LABELS, LEGAL_LINKS, LEGAL_UPDATED_AT, type LegalPageKey } from '../../../lib/legal';
import { useDocumentTitle } from '../template/useDocumentTitle';
import { formatLegalDate, useLegalContact } from './legalContact';

export interface LegalSection {
  /** id anchor (huruf kecil, tanda hubung), mis. "pengembalian-dana". */
  id: string;
  title: string;
  content: React.ReactNode;
}

interface LegalPageProps {
  page: LegalPageKey;
  /** Satu-dua kalimat ringkasan di bawah judul. */
  intro: React.ReactNode;
  sections: LegalSection[];
}

/** Gaya isi dokumen: paragraf & daftar bertingkat yang nyaman dibaca (14px HP → 16px desktop). */
const PROSE =
  'mt-3 space-y-3 text-[14px] leading-relaxed text-muted sm:mt-4 sm:text-base sm:leading-relaxed ' +
  '[&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:pl-1 ' +
  'marker:text-subtle [&_strong]:font-semibold [&_strong]:text-fg';

const TocList: React.FC<{ sections: LegalSection[] }> = ({ sections }) => (
  <ol className="space-y-0.5">
    {sections.map((section, index) => (
      <li key={section.id}>
        <a
          href={`#${section.id}`}
          className="flex min-h-10 items-start gap-2.5 rounded-xl px-3 py-2 text-[13px] text-muted transition-colors hover:bg-alt hover:text-fg lg:min-h-0 lg:py-1.5"
        >
          <span className="w-5 shrink-0 font-mono text-[12px] tabular-nums text-subtle">{index + 1}.</span>
          <span>{section.title}</span>
        </a>
      </li>
    ))}
  </ol>
);

export const LegalPage: React.FC<LegalPageProps> = ({ page, intro, sections }) => {
  const title = LEGAL_LABELS[page];
  const contact = useLegalContact(page);
  const related = LEGAL_LINKS.filter((link) => link.key !== page);
  useDocumentTitle(`${title} | Garuda Nexa`);

  return (
    <>
      <Navbar />
      <main id="konten" tabIndex={-1} className="bg-canvas pt-16 focus:outline-none lg:pt-[72px]">
        <div className="container-site pb-14 pt-5 sm:pb-20 sm:pt-8">
          <div className="mx-auto max-w-[1160px]">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px] text-subtle">
              <Link to="/" className="inline-flex min-h-10 shrink-0 items-center font-medium text-muted transition-colors hover:text-primary">
                Beranda
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate" aria-current="page">
                {title}
              </span>
            </nav>

            <header className="mt-3 max-w-3xl sm:mt-5">
              <span className="badge-site">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Dokumen legal
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-4xl">{title}</h1>
              <p className="mt-3 text-[14px] leading-relaxed text-muted sm:text-lg sm:leading-relaxed">{intro}</p>
              <p className="mt-4 text-[13px] text-subtle">
                Terakhir diperbarui: <time dateTime={LEGAL_UPDATED_AT} className="font-medium text-fg">{formatLegalDate(LEGAL_UPDATED_AT)}</time>
              </p>
            </header>

            <div className="mt-6 grid gap-6 sm:mt-10 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
              {/* Daftar isi: HP & tablet = disclosure tertutup; desktop = kolom sticky */}
              <details className="group card-flat px-2 py-1 lg:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
                  Daftar isi
                  <ChevronDown className="h-4 w-4 text-subtle transition-transform duration-200 group-open:rotate-180" aria-hidden />
                </summary>
                <div className="pb-2">
                  <TocList sections={sections} />
                </div>
              </details>
              <nav aria-label="Daftar isi" className="hidden self-start lg:sticky lg:top-24 lg:block">
                <p className="eyebrow px-3">Daftar isi</p>
                <div className="mt-3">
                  <TocList sections={sections} />
                </div>
              </nav>

              <article className="min-w-0 max-w-3xl">
                {sections.map((section, index) => (
                  <section
                    key={section.id}
                    id={section.id}
                    aria-labelledby={`${section.id}-judul`}
                    className="mt-6 scroll-mt-20 border-t border-line pt-6 first:mt-0 first:border-t-0 first:pt-0 sm:mt-8 sm:pt-8 sm:first:mt-0 sm:first:pt-0 lg:scroll-mt-24"
                  >
                    <h2 id={`${section.id}-judul`} className="flex gap-2.5 text-lg font-semibold tracking-[-0.01em] text-fg sm:text-2xl">
                      <span className="font-mono text-subtle tabular-nums">{index + 1}.</span>
                      <span>{section.title}</span>
                    </h2>
                    <div className={PROSE}>{section.content}</div>
                  </section>
                ))}

                {/* Kontak untuk pertanyaan tentang dokumen ini */}
                <aside aria-label="Hubungi kami" className="mt-10 rounded-[24px] bg-alt p-5 ring-1 ring-inset ring-line sm:mt-12 sm:p-7">
                  <h2 className="text-base font-semibold text-fg sm:text-xl">Ada pertanyaan tentang dokumen ini?</h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted sm:text-[15px]">
                    Hubungi kami lewat WhatsApp atau email. Sebutkan nomor pesanan Anda bila pertanyaannya tentang pesanan tertentu.
                  </p>
                  <div className="mt-4 flex flex-col gap-2.5 sm:mt-5 sm:flex-row sm:flex-wrap sm:gap-3">
                    <a href={contact.whatsappHref} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                      <MessageCircle className="h-4 w-4" aria-hidden />
                      Hubungi via WhatsApp
                    </a>
                    <a href={`mailto:${contact.email}`} className="btn btn-outline min-w-0">
                      <Mail className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{contact.email}</span>
                    </a>
                  </div>
                </aside>

                <nav aria-label="Dokumen terkait" className="mt-8 sm:mt-10">
                  <p className="eyebrow">Dokumen terkait</p>
                  <ul className="mt-2 sm:mt-3">
                    {related.map((link) => (
                      <li key={link.key}>
                        <Link to={link.to} className="link-site inline-flex min-h-10 items-center gap-1.5 text-sm sm:text-[15px]">
                          {link.label}
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </article>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default LegalPage;
