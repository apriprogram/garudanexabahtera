import React from 'react';
import { Link } from 'react-router-dom';
import { shortPriceRange, templateVsCustomTable } from '../../../content/pricing';
import { usePriceDate, usePublishedTemplates } from '../../../hooks/usePublishedTemplates';
import { ComparisonTable } from '../../../pages/public/info/ComparisonTable';
import { formatDateId } from '../../../seo/format';
import { HUB_PATHS } from '../../../seo/paths';
import { SectionHeading } from '../../ui/SectionHeading';

/**
 * Section beranda #perbandingan: tabel template siap pakai vs website custom vs aplikasi mobile custom (versi pendek
 * Lampiran D; versi lengkap di /harga). Rentang harga template dari data, jasa custom tanpa angka.
 */
const HomeCompare: React.FC<{ alt?: boolean; number?: string }> = ({ alt, number = '03' }) => {
  const { templates } = usePublishedTemplates();
  const priceDate = usePriceDate();
  const table = templateVsCustomTable({ priceRange: shortPriceRange(templates), priceDate }, { formatDate: formatDateId });

  return (
    <section id="perbandingan" aria-labelledby="perbandingan-title" className={`section-screen ${alt ? 'bg-alt' : 'bg-canvas'}`}>
      <div className="container-site w-full">
        <SectionHeading
          index={number}
          label="Perbandingan"
          titleId="perbandingan-title"
          title="Template siap pakai atau"
          accent="jasa pembuatan website custom?"
          description="Template paling cepat online dengan harga pasti. Website dan aplikasi custom dirancang dari nol untuk alur kerja Anda, dengan biaya lewat penawaran setelah konsultasi gratis."
          action={
            <Link to={HUB_PATHS.pricing} className="btn btn-outline">
              Lihat harga lengkap
            </Link>
          }
        />
        <ComparisonTable
          table={table}
          caption="Perbandingan template siap pakai, website custom, dan aplikasi mobile custom"
          highlight={0}
          className="mt-8 sm:mt-12"
        />
      </div>
    </section>
  );
};

export default HomeCompare;
