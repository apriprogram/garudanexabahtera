import React from 'react';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listArticles } from '../../../content/panduan';
import { articlePath, HUB_PATHS } from '../../../seo/paths';
import { formatDateId } from '../../../seo/format';
import { SectionHeading } from '../../ui/SectionHeading';

/** Jumlah artikel di beranda. */
const LATEST_GUIDES = 3;

/**
 * Section beranda #panduan: 3 artikel panduan terbaru (src/content/panduan, WP8). Home.tsx hanya memasang section ini
 * bila ada artikel; tanpa artikel komponen ini merender null.
 */
const LatestGuides: React.FC<{ alt?: boolean; number?: string }> = ({ alt, number = '06' }) => {
  const articles = listArticles().slice(0, LATEST_GUIDES);
  if (articles.length === 0) return null;

  return (
    <section id="panduan" aria-labelledby="panduan-title" className={`section-y ${alt ? 'bg-alt' : 'bg-canvas'}`}>
      <div className="container-site w-full">
        <SectionHeading
          index={number}
          label="Panduan"
          titleId="panduan-title"
          title="Panduan"
          accent="terbaru"
          description="Biaya, domain & hosting, dan cara memilih antara template dan website custom, ditulis tim kami."
          action={
            <Link to={HUB_PATHS.guides} className="btn btn-outline">
              Lihat semua panduan
            </Link>
          }
        />
        <ul className="mt-8 grid gap-3 sm:mt-12 sm:gap-4 md:grid-cols-3">
          {articles.map((article) => (
            <li key={article.slug}>
              <Link to={articlePath(article.slug)} className="card-flat lift group flex h-full flex-col p-5 sm:p-6">
                <BookOpen className="h-5 w-5 text-primary" aria-hidden />
                <span className="mt-4 text-base font-semibold leading-snug text-fg transition-colors group-hover:text-primary sm:text-xl">
                  {article.title}
                </span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-muted sm:text-[15px]">{article.description}</span>
                <span className="mt-4 text-xs text-subtle sm:text-[13px]">
                  Diperbarui <time dateTime={article.dateModified}>{formatDateId(article.dateModified)}</time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default LatestGuides;
