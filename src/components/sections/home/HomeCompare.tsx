import React from 'react';
import { Link } from 'react-router-dom';
import { shortPriceRange, templateVsCustomTable } from '../../../content/pricing';
import { usePriceDate, usePublishedTemplates } from '../../../hooks/usePublishedTemplates';
import { ComparisonTable } from '../../../pages/public/info/ComparisonTable';
import { formatDateId } from '../../../seo/format';
import { HUB_PATHS } from '../../../seo/paths';
import { SectionHeading } from '../../ui/SectionHeading';

/**
 * Section beranda #perbandingan "Pilih sesuai kebutuhanmu" (judul dari pemilik 2026-10-24): tabel template siap pakai
 * vs website custom vs aplikasi mobile custom (versi pendek Lampiran D; versi lengkap di /harga), baris judul kolom
 * gelap seperti footer dengan sel pojok "Service". Rentang harga template dari data, jasa custom tanpa angka.
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
          title="Pilih sesuai"
          accent="kebutuhanmu"
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
          darkHeader
          cornerLabel="Service"
          className="mt-8 sm:mt-12"
        />
      </div>
    </section>
  );
};

export default HomeCompare;
