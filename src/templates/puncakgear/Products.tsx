// Produk terlaris (kunci `products`): judul + deskripsi, chip filter kategori ("Semua" + kategori dari produk,
// <button aria-pressed>), lalu grid kartu ala rak toko: bidang foto 1:1 abu batu radius 20 dengan label di kiri atas dan
// tombol pil putih "Pesan" di kanan bawah (WhatsApp berisi nama & harga produk bila tautan kosong), lalu kategori, nama,
// bintang rating, dan harga (+ harga coret). Filter juga bisa diatur dari kartu Kategori dan pencarian di menu.
// Tepat di bawah Kategori (`tight`) tanpa jarak atas ganda. HP: 2 kolom, tablet 3, layar lebar 4.
import { ShoppingBag } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { filterProducts, normalize, orderMessage, parseRating, productCategories, productList, type PuncakModel } from './model';
import { PUNCAK_PHOTOS } from './photos';
import { C, CARD, TYPE_P } from './styles';
import { SectionLabel, Stars, TitleIcon } from './ui';

const CHIP = 'inline-flex h-10 shrink-0 items-center rounded-full px-4 text-[14px] font-medium transition-colors';

export function Products({ m, filter, onFilter, tight }: { m: PuncakModel; filter: string; onFilter: (category: string) => void; tight: boolean }) {
  const { products } = m;
  const eyebrow = text(products, 'eyebrow');
  const title = text(products, 'title');
  const subtitle = text(products, 'subtitle');
  const note = text(products, 'note');
  const items = productList(products);
  if (items.length === 0) return null;
  const categories = productCategories(items);
  const active = categories.find((c) => normalize(c) === normalize(filter)) ?? '';
  const shown = filterProducts(items, active);

  return (
    <TemplateSection sectionKey="products" className={tight ? 'pb-16 @3xl:pb-24 @5xl:pb-28 @7xl:pb-32' : SECTION_Y}>
      <div className={CONTAINER}>
        {(eyebrow || title || subtitle) && (
          <div className="grid gap-6 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10">
            <div className="min-w-0 @5xl:col-span-7">
              {eyebrow && (
                <Reveal>
                  <SectionLabel>{eyebrow}</SectionLabel>
                </Reveal>
              )}
              {title && (
                <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[18ch] text-balance text-[#0E1512] ${TYPE_P.h2}`}>
                  {title}
                </Reveal>
              )}
            </div>
            {subtitle && (
              <Reveal as="p" delay={160} className={`max-w-[44ch] @5xl:col-span-5 @5xl:justify-self-end @5xl:pb-2 ${TYPE_P.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
          </div>
        )}

        {categories.length > 1 && (
          <div role="group" aria-label="Filter kategori produk" className="pg-rail -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 @2xl:-mx-8 @2xl:px-8 @3xl:mt-10 @6xl:mx-0 @6xl:flex-wrap @6xl:px-0">
            {['', ...categories].map((category) => {
              const pressed = category === active;
              return (
                <button
                  key={category || 'semua'}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => onFilter(category)}
                  className={`${CHIP} ${pressed ? 'bg-[#0E1512] text-white' : 'bg-[#F1F2EE] text-[#0E1512] hover:bg-[#E6E8E2]'}`}
                >
                  {category || 'Semua'}
                  {pressed && category && <span aria-hidden className="ml-2 h-1.5 w-1.5 rounded-full bg-(--tpl-accent)" />}
                </button>
              );
            })}
          </div>
        )}

        {shown.length > 0 ? (
          <ul aria-label="Daftar produk" className="mt-8 grid grid-cols-2 gap-x-3 gap-y-9 @3xl:mt-10 @3xl:grid-cols-3 @3xl:gap-x-4 @6xl:grid-cols-4 @6xl:gap-x-5">
            {shown.map((item, i) => {
              const name = field(item, 'name');
              const price = field(item, 'price');
              const oldPrice = field(item, 'old_price');
              const badge = field(item, 'badge');
              const image = field(item, 'image');
              const rating = parseRating(field(item, 'rating'));
              const action = resolveAction(field(item, 'url'), m.askWith(name ? orderMessage(m.companyName, name, price) : ''));
              return (
                <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 60)} className="group flex min-w-0 flex-col">
                  <div className={`relative aspect-square overflow-hidden ${CARD.shelf}`}>
                    {hasImage(image) ? (
                      <KitPhoto
                        src={image}
                        alt={PUNCAK_PHOTOS.alt(image, name)}
                        fallback="none"
                        sizes="(min-width: 1152px) 25vw, (min-width: 768px) 33vw, 50vw"
                        className="absolute inset-0"
                        imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span aria-hidden className="absolute inset-0 flex items-center justify-center text-[#0E1512]/35">
                        <TitleIcon title={`${name} ${field(item, 'category')}`} index={i} className="h-12 w-12" />
                      </span>
                    )}
                    {badge && (
                      <span className="absolute left-2.5 top-2.5 max-w-[calc(100%-20px)] truncate rounded-full bg-(--tpl-accent) px-2.5 py-1 text-[11.5px] font-semibold text-(--tpl-on-accent) @3xl:left-3 @3xl:top-3 @3xl:text-[12px]">
                        {badge}
                      </span>
                    )}
                    {action && (
                      <ActionLink
                        action={action}
                        aria-label={name ? `Pesan ${name}` : 'Pesan'}
                        className="absolute bottom-2.5 right-2.5 inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-semibold text-[#0E1512] transition-colors hover:bg-[#0E1512] hover:text-white @3xl:bottom-3 @3xl:right-3 @3xl:h-10 @3xl:px-4"
                      >
                        <ShoppingBag aria-hidden className="h-4 w-4" />
                        Pesan
                      </ActionLink>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-0.5 pt-3.5">
                    {field(item, 'category') && <p className={`text-[12.5px] ${C.muted}`}>{field(item, 'category')}</p>}
                    {name && <h3 className="mt-0.5 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[#0E1512] @3xl:text-[16px]">{name}</h3>}
                    {rating !== null && <Stars value={rating} className="mt-2" />}
                    {(price || oldPrice) && (
                      <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2.5">
                        {price && <span className="text-[16px] font-semibold tabular-nums text-[#0E1512] @3xl:text-[17px]">{price}</span>}
                        {oldPrice && (
                          <span className={`text-[13px] tabular-nums line-through ${C.muted}`}>
                            <span className="sr-only">Harga sebelumnya </span>
                            {oldPrice}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </ul>
        ) : (
          <p className={`mt-10 rounded-[20px] bg-[#F1F2EE] px-6 py-8 text-center ${TYPE_P.body} ${C.muted}`}>Belum ada produk di kategori ini.</p>
        )}
        {/* Pengumuman hasil filter: aria-live tanpa role="status" (region status satu-satunya milik Shell untuk keterangan pratinjau) */}
        <p className="sr-only" aria-live="polite">
          {active ? `${shown.length} produk di kategori ${active}` : ''}
        </p>
        {note && <p className={`mt-10 max-w-[70ch] text-[14px] ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}
