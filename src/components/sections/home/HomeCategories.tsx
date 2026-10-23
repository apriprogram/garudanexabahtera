import React from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { categoryTiles, homeIntro } from '../../../content/home';
import { CMS_INCLUDE } from '../../../content/pricing';
import { getTemplatePricing, useSiteSettings } from '../../../hooks/useSiteSettings';
import { usePublishedTemplates } from '../../../hooks/usePublishedTemplates';
import { formatPriceShort } from '../../../seo/format';
import { HUB_PATHS } from '../../../seo/paths';
import { SectionHeading } from '../../ui/SectionHeading';

/**
 * Section beranda #kategori (docs/platform/SEO-PLAN.md §5.6 langkah 4): intro 2 kalimat yang bisa di-crawl (nama badan
 * hukum, niche, harga termurah dari data), strip "Sudah termasuk" (isi yang sama dengan kotak harga template, setting
 * template_price_includes) dan ubin kategori yang menautkan /template/kategori/{slug}. Ubin hanya untuk kategori yang
 * punya template terbit; tanpa data template, ubin tidak tampil (intro tetap ada).
 */
const HomeCategories: React.FC<{ alt?: boolean; number?: string }> = ({ alt, number = '01' }) => {
  const { settings } = useSiteSettings();
  const { templates } = usePublishedTemplates();
  const includes = [...getTemplatePricing(settings).includes, CMS_INCLUDE];
  const tiles = categoryTiles(templates);

  return (
    <section id="kategori" aria-labelledby="kategori-title" className={`section-screen ${alt ? 'bg-alt' : 'bg-canvas'}`}>
      <div className="container-site w-full">
        <SectionHeading
          index={number}
          label="Kategori"
          titleId="kategori-title"
          title="Template website untuk"
          accent="setiap jenis usaha"
          description={homeIntro(templates)}
          action={
            <Link to={HUB_PATHS.catalog} className="btn btn-outline">
              Lihat Semua Template
            </Link>
          }
        />

        {/* Strip "Sudah termasuk" */}
        <div className="mt-8 rounded-[24px] bg-surface p-4 ring-1 ring-inset ring-line sm:mt-12 sm:p-5 lg:flex lg:items-center lg:gap-6 lg:px-6">
          <p className="eyebrow shrink-0">Sudah termasuk</p>
          <ul className="mt-3 grid gap-x-5 gap-y-2.5 sm:grid-cols-2 lg:mt-0 lg:flex lg:flex-1 lg:flex-wrap lg:items-center lg:justify-between">
            {includes.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[13px] font-medium text-fg sm:text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-primary">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {tiles.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
            {tiles.map((tile) => (
              <li key={tile.slug}>
                <Link to={tile.path} className="card-flat lift group flex h-full flex-col p-1.5">
                  <span className="block aspect-[16/10] overflow-hidden rounded-[19px] bg-alt">
                    {tile.image && (
                      <img
                        src={tile.image}
                        alt=""
                        width={1600}
                        height={1000}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover object-top"
                      />
                    )}
                  </span>
                  <span className="flex flex-1 flex-col px-2.5 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3.5">
                    <span className="text-[14px] font-semibold leading-snug text-fg transition-colors group-hover:text-primary sm:text-lg">
                      Template {tile.name}
                    </span>
                    <span className="mt-1 text-[12px] text-muted sm:text-sm">
                      {tile.count} template{tile.minPrice ? ` · mulai ${formatPriceShort(tile.minPrice)}` : ''}
                    </span>
                    <span className="mt-2 text-[13px] leading-relaxed text-subtle max-sm:hidden">{tile.templateNames.join(', ')}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default HomeCategories;
