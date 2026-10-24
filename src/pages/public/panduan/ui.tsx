// Komponen bersama halaman /panduan dan /panduan/{slug}: kartu artikel (judul = heading, tanggal <time>), ajakan di
// akhir artikel, dan kotak penulis. Semua tautan berupa <a href> asli (Link) supaya terbaca crawler di HTML prerender.
import { ArrowRight, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Author } from '../../../content/authors';
import type { ArticleCta, ArticleSummary } from '../../../content/panduan';
import { getWhatsappNumber, useSiteSettings, whatsappUrl } from '../../../hooks/useSiteSettings';
import { LogoMark } from '../../../components/ui/LogoMark';
import { formatDateId } from '../../../seo/format';
import { articlePath } from '../../../seo/paths';
import { CoverArt, type CoverKind } from './CoverArt';
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

interface ArticleTopic {
  label: string;
  /** Ilustrasi sampul (CoverArt) */
  cover: CoverKind;
  /** Latar sampul */
  tone: string;
}

const BRAND_TONE = 'bg-linear-to-br from-brand-100 to-brand-50';
const NEUTRAL_TONE = 'bg-linear-to-br from-fg/5 to-brand-50';

// Topik dari kata di slug (artikel tidak punya gambar): label kecil + ilustrasi & warna sampul. Urutan = prioritas.
const TOPICS: { match: RegExp; topic: ArticleTopic }[] = [
  { match: /(^|-)vs(-|$)/, topic: { label: 'Perbandingan', cover: 'compare', tone: NEUTRAL_TONE } },
  { match: /^(?=.*(^|-)biaya(-|$))(?=.*(^|-)aplikasi(-|$))/, topic: { label: 'Biaya', cover: 'appCost', tone: 'bg-linear-to-br from-brand-50 to-brand-100' } },
  { match: /(^|-)biaya(-|$)/, topic: { label: 'Biaya', cover: 'webCost', tone: BRAND_TONE } },
  { match: /(^|-)aplikasi(-|$)/, topic: { label: 'Aplikasi', cover: 'app', tone: BRAND_TONE } },
  { match: /(^|-)(klinik|salon|kecantikan)(-|$)/, topic: { label: 'Inspirasi', cover: 'showcase', tone: 'bg-linear-to-br from-success-50 to-brand-50' } },
];
const DEFAULT_TOPIC: ArticleTopic = { label: 'Panduan', cover: 'guide', tone: NEUTRAL_TONE };

const articleTopic = (slug: string): ArticleTopic => TOPICS.find(({ match }) => match.test(slug))?.topic ?? DEFAULT_TOPIC;

/**
 * Kartu artikel gaya kartu template (permintaan pemilik 2026-10-24): sampul 16:10 bertint dengan ilustrasi topik
 * (CoverArt, dekoratif), lalu topik · tanggal, judul (heading), ringkasan 3 baris, dan "Baca panduan →".
 * Seluruh kartu satu tautan; tanpa garis & bayangan.
 */
export function ArticleCards({ articles, headingLevel = 'h3' }: { articles: readonly ArticleSummary[]; headingLevel?: 'h2' | 'h3' }) {
  const Heading = headingLevel;
  return (
    // Kelipatan 3 → 3 kolom di layar lebar; selain itu 2 kolom (4 artikel = 2×2, tanpa kartu yatim di baris terakhir)
    <ul className={`grid gap-x-6 gap-y-10 sm:gap-y-12 ${articles.length % 3 === 0 ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'}`}>
      {articles.map((article) => {
        const topic = articleTopic(article.slug);
        return (
          <li key={article.slug}>
            <Link to={articlePath(article.slug)} className="group flex h-full flex-col rounded-[20px]">
              <span className={`relative block aspect-[16/10] overflow-hidden rounded-[20px] ${topic.tone}`} aria-hidden>
                <span className="grid-dots absolute inset-0" />
                <CoverArt kind={topic.cover} />
              </span>
              <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-subtle sm:text-[13px]">
                <span className="font-semibold text-primary">{topic.label}</span>
                <span aria-hidden>·</span>
                <span>
                  <ArticleDates article={article} />
                </span>
              </p>
              <Heading className="mt-1.5 text-lg font-semibold leading-snug tracking-[-0.01em] text-fg transition-colors group-hover:text-primary sm:text-xl">
                {article.title}
              </Heading>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted sm:text-[15px]">{article.description}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-fg">
                Baca panduan
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
              </span>
            </Link>
          </li>
        );
      })}
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
