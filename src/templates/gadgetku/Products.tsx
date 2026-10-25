// Produk terbaru (kunci `products`, referensi "Bose · New arrivals"): label + H2 + deskripsi di kiri, tombol panah bulat
// di kanan; chip penyaring kategori (dibagi dengan kartu Kategori dan pencarian header); baris kartu produk yang bisa
// digeser (scroll-snap, geser jari di HP, tombol panah di layar lebar). Kategori tanpa produk → pesan + tombol semua.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { inCategory, productCategories, sameCategory, type GadgetkuModel, type Shop } from './model';
import { ProductCard } from './ProductCard';
import { C, CHIP, TYPE_G } from './styles';
import { SectionLabel } from './ui';

const CHIP_GREY = `${CHIP} bg-[#F2F3F5] text-[#0B0C0E] hover:bg-[#E6E8EB]`;
const ARROW =
  'flex h-11 w-11 items-center justify-center rounded-full bg-[#F2F3F5] text-[#0B0C0E] transition-colors hover:bg-[#E6E8EB] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-[#F2F3F5]';

export function Products({ m, shop }: { m: GadgetkuModel; shop: Shop }) {
  const { products } = m;
  const row = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const items = m.productItems;
  const categories = productCategories(items);
  // Kategori dari kartu Kategori bisa ditulis sedikit beda ("Kabel Data" ~ "Kabel"): pakai chip yang cocok
  const active = shop.category ? categories.find((c) => sameCategory(c, shop.category)) ?? shop.category : '';
  const shown = inCategory(items, active);
  const eyebrow = text(products, 'eyebrow');
  const title = text(products, 'title');
  const subtitle = text(products, 'subtitle');

  const update = useCallback(() => {
    const el = row.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    el.scrollLeft = 0;
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update, active]);

  const scroll = (dir: 1 | -1) => {
    const el = row.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85 });
  };

  if (items.length === 0) return null;

  return (
    <TemplateSection sectionKey="products" className={SECTION_Y}>
      <div className={CONTAINER}>
        <div className="flex flex-col gap-6 @5xl:flex-row @5xl:items-end @5xl:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <Reveal>
                <SectionLabel>{eyebrow}</SectionLabel>
              </Reveal>
            )}
            {title && (
              <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[18ch] text-balance text-[#0B0C0E] ${TYPE_G.h2}`}>
                {title}
              </Reveal>
            )}
            {subtitle && (
              <Reveal as="p" delay={160} className={`mt-4 max-w-[52ch] ${TYPE_G.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
          </div>
          <div className="hidden shrink-0 gap-2 @3xl:flex">
            <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label="Produk sebelumnya" className={ARROW}>
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label="Produk berikutnya" className={ARROW}>
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        {categories.length > 1 && (
          <div role="group" aria-label="Saring kategori" className="gk-scroller -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 @2xl:mx-0 @2xl:flex-wrap @2xl:px-0">
            <button type="button" aria-pressed={!active} onClick={() => shop.pickCategory('')} className={CHIP_GREY}>
              Semua
            </button>
            {categories.map((c) => (
              <button key={c} type="button" aria-pressed={active === c} onClick={() => shop.pickCategory(active === c ? '' : c)} className={CHIP_GREY}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* role="status" sudah polite; tanpa aria-live eksplisit (lihat Finder.tsx) */}
        <p className="sr-only" role="status">
          {active ? `${shown.length} produk ${active}` : ''}
        </p>
        {shown.length > 0 ? (
          <ul
            ref={row}
            onScroll={update}
            aria-label={active ? `Produk ${active}` : 'Daftar produk'}
            className="gk-scroller -mx-5 mt-6 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @3xl:gap-4 @5xl:mx-0 @5xl:scroll-px-0 @5xl:px-0"
          >
            {shown.map((item, i) => (
              <li key={`${field(item, 'name')}-${i}`} className="w-[68%] shrink-0 snap-start @xl:w-[44%] @3xl:w-[31%] @5xl:w-[calc((100%-48px)/4)] @7xl:w-[calc((100%-64px)/5)]">
                <ProductCard m={m} item={item} sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 31vw, 68vw" />
              </li>
            ))}
          </ul>
        ) : (
          <div className={`mt-6 rounded-[20px] bg-[#F2F3F5] p-6 text-[15px] ${C.muted}`}>
            <p>Belum ada produk {active} di daftar ini.</p>
            <button type="button" onClick={() => shop.pickCategory('')} className="mt-2 inline-flex min-h-10 items-center font-medium text-[#0B0C0E] underline underline-offset-4">
              Tampilkan semua produk
            </button>
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
