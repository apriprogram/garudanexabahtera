// /panduan (docs/platform/SEO-PLAN.md §5.8, Lampiran A): H1, pengantar, semua artikel (ringkasan dari
// src/content/panduan, terbaru dulu), lalu tautan ke katalog, harga dan jasa. Head & JSON-LD: PanduanIndex.seo.ts.
import { BookOpen, LayoutTemplate, PencilRuler, ReceiptText, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DEFAULT_AUTHOR_NAME, getAuthor } from '../../../content/authors';
import { listArticles } from '../../../content/panduan';
import { useSiteSettings } from '../../../hooks/useSiteSettings';
import { HUB_PATHS } from '../../../seo/paths';
import { InfoPage, InfoSection } from '../info/InfoPage';
import { GUIDES_H1, GUIDES_INTRO_DEFAULT } from './PanduanIndex.seo';
import { ArticleCards } from './ui';

const NEXT_LINKS = [
  {
    to: HUB_PATHS.catalog,
    title: 'Template website siap pakai',
    text: 'Lihat demo dan harga setiap template, sudah termasuk domain, hosting, dan SSL tahun pertama.',
    icon: LayoutTemplate,
  },
  { to: HUB_PATHS.pricing, title: 'Harga', text: 'Harga semua template, biaya per tahun, dan cara biaya custom ditentukan.', icon: ReceiptText },
  {
    to: HUB_PATHS.webService,
    title: 'Jasa pembuatan website',
    text: 'Website custom untuk perusahaan, sekolah, instansi, dan UMKM, dengan penawaran setelah konsultasi gratis.',
    icon: PencilRuler,
  },
  {
    to: HUB_PATHS.mobileService,
    title: 'Jasa pembuatan aplikasi',
    text: 'Aplikasi Android dan iOS sesuai alur bisnis Anda, dari konsultasi sampai rilis.',
    icon: Smartphone,
  },
] as const;

export default function PanduanIndex() {
  const articles = listArticles();
  const author = getAuthor(DEFAULT_AUTHOR_NAME);
  // Teks pembuka dari admin (Pengaturan website → Panduan); kosong = bawaan
  const { settings } = useSiteSettings();
  const intro = settings.guides_intro?.trim() || GUIDES_INTRO_DEFAULT;

  return (
    <InfoPage
      crumb="Panduan"
      badge="Panduan"
      title={GUIDES_H1}
      lead={
        <>
          <p>{intro}</p>
          <p className="mt-3 text-[13px] text-subtle sm:text-sm">
            Ditulis oleh{' '}
            <Link to={author.path} className="font-medium text-fg transition-colors hover:text-primary">
              {author.name}
            </Link>
            .
          </p>
        </>
      }
    >
      <InfoSection id="artikel" title="Semua panduan">
        {articles.length > 0 ? (
          <ArticleCards articles={articles} />
        ) : (
          <div className="card-flat flex flex-col items-center px-6 py-12 text-center sm:py-16">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-primary">
              <BookOpen className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-4 text-base font-semibold text-fg sm:text-lg">Artikel panduan sedang kami tulis</p>
            <p className="mt-1.5 max-w-md text-sm text-muted">Sementara itu, lihat katalog template atau konsultasikan kebutuhan Anda.</p>
          </div>
        )}
      </InfoSection>

      <InfoSection id="mulai" title="Siap membuat website atau aplikasi?" intro={<p>Lanjutkan dari halaman yang paling sesuai dengan kebutuhan Anda.</p>}>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {NEXT_LINKS.map(({ to, title, text, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className="card-flat lift flex h-full items-start gap-3.5 p-4 sm:p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-alt text-primary ring-1 ring-inset ring-line">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-fg sm:text-lg">{title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
