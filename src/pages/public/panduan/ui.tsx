// Komponen bersama halaman /panduan dan /panduan/{slug}: kartu artikel (judul = heading, tanggal <time>), ajakan di
// akhir artikel, dan kotak penulis. Semua tautan berupa <a href> asli (Link) supaya terbaca crawler di HTML prerender.
import { BookOpen, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Author } from '../../../content/authors';
import type { ArticleCta, ArticleSummary } from '../../../content/panduan';
import { getWhatsappNumber, useSiteSettings, whatsappUrl } from '../../../hooks/useSiteSettings';
import { LogoMark } from '../../../components/ui/LogoMark';
import { formatDateId } from '../../../seo/format';
import { articlePath } from '../../../seo/paths';
import { CTA_COPY } from './cta';

/** "Diperbarui 23 Oktober 2026" (+ "Terbit …" bila tanggalnya berbeda), sama dengan datePublished/dateModified JSON-LD. */
export function ArticleDates({ article }: { article: Pick<ArticleSummary, 'datePublished' | 'dateModified'> }) {
  const updated = (
    <>
      Diperbarui <time dateTime={article.dateModified}>{formatDateId(article.dateModified)}</time>
    </>
  );
  if (article.datePublished === article.dateModified) return updated;
  return (
    <>
      Terbit <time dateTime={article.datePublished}>{formatDateId(article.datePublished)}</time>
      <span aria-hidden> · </span>
      {updated}
    </>
  );
}

/** Kartu artikel: judul (heading), ringkasan, tanggal. */
export function ArticleCards({ articles, headingLevel = 'h3' }: { articles: readonly ArticleSummary[]; headingLevel?: 'h2' | 'h3' }) {
  const Heading = headingLevel;
  return (
    // Kelipatan 3 → 3 kolom di layar lebar; selain itu 2 kolom (4 artikel = 2×2, tanpa kartu yatim di baris terakhir)
    <ul className={`grid gap-3 sm:gap-4 ${articles.length % 3 === 0 ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'}`}>
      {articles.map((article) => (
        <li key={article.slug}>
          <Link to={articlePath(article.slug)} className="card-flat lift group flex h-full flex-col p-5 sm:p-6">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            <Heading className="mt-4 text-base font-semibold leading-snug text-fg transition-colors group-hover:text-primary sm:text-xl">
              {article.title}
            </Heading>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted sm:text-[15px]">{article.description}</p>
            <p className="mt-4 text-xs text-subtle sm:text-[13px]">
              <ArticleDates article={article} />
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Ajakan di akhir artikel: tombol utama + Konsultasi Gratis (WhatsApp) + satu tautan lanjutan. */
export function ArticleCtaBox({ kind, articleTitle }: { kind: ArticleCta; articleTitle: string }) {
  const { settings } = useSiteSettings();
  const copy = CTA_COPY[kind];
  const More = copy.more.icon;
  const whatsapp = whatsappUrl(getWhatsappNumber(settings), `Halo Admin, saya membaca panduan "${articleTitle}" dan ingin bertanya.`);
  return (
    <aside aria-labelledby="ajakan-judul" className="mt-12 rounded-[24px] bg-alt p-5 ring-1 ring-inset ring-line sm:mt-16 sm:p-8">
      <h2 id="ajakan-judul" className="text-lg font-semibold leading-snug tracking-[-0.01em] text-fg sm:text-2xl">
        {copy.title}
      </h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted sm:mt-3 sm:text-base">{copy.text}</p>
      <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-3">
        <Link to={copy.primary.to} className="btn btn-primary btn-lg">
          {copy.primary.label}
        </Link>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-lg">
          <MessageCircle className="h-4 w-4" aria-hidden />
          Konsultasi Gratis
          <span className="sr-only">(tab baru)</span>
        </a>
      </div>
      <p className="mt-4 text-sm sm:mt-5">
        <Link to={copy.more.to} className="link-site inline-flex min-h-10 items-center gap-2 font-medium">
          <More className="h-4 w-4" aria-hidden />
          {copy.more.label}
        </Link>
      </p>
    </aside>
  );
}

/** Kotak penulis (nama, peran, bio, tautan profil). */
export function AuthorBox({ author }: { author: Author }) {
  return (
    <section aria-labelledby="penulis-judul" className="mt-8 flex gap-4 rounded-[24px] p-5 ring-1 ring-inset ring-line sm:mt-10 sm:gap-5 sm:p-6">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-primary sm:h-12 sm:w-12" aria-hidden>
        <LogoMark className="h-4 sm:h-5" />
      </span>
      <div className="min-w-0">
        <p className="eyebrow">Ditulis oleh</p>
        <h2 id="penulis-judul" className="mt-1 text-base font-semibold text-fg sm:text-lg">
          {author.name}
        </h2>
        <p className="text-[13px] text-subtle sm:text-sm">{author.role}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted sm:text-[15px]">{author.bio}</p>
        <p className="mt-2 flex flex-wrap gap-x-5 text-sm">
          <Link to={author.path} className="link-site inline-flex min-h-10 items-center font-medium">
            Tentang {author.type === 'Organization' ? 'kami' : author.name}
          </Link>
          {author.profileUrl && (
            <a href={author.profileUrl} target="_blank" rel="noopener noreferrer" className="link-site inline-flex min-h-10 items-center font-medium">
              Profil {author.name}
              <span className="sr-only">(tab baru)</span>
            </a>
          )}
        </p>
      </div>
    </section>
  );
}
