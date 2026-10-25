// Produk terlaris (kunci `products`) di pita putih: label + H2 kiri, tombol filter kategori kanan (Semua + kategori
// dari produk, aria-pressed, ikut diisi klik kartu Kategori), lalu grid kartu produk ala referensi Lifestyle: foto 1:1
// di bidang pasir dengan label, kategori, nama, isi/ukuran, bintang + terjual, harga + harga coret, dan tombol pesan
// (WhatsApp berisi nama produk bila tautan kosong). Tombol katalog di bawah. HP: 2 kolom, tablet 3, desktop 4.
import { ShoppingBag } from 'lucide-react';
import { useId } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { useShopFilter } from './hooks';
import { LeafArt } from './marks';
import { filterProducts, formatRating, parseRating, productCategories, type TaniModel } from './model';
import { TANI_PHOTOS } from './photos';
import { BTN, C, TYPE_T } from './styles';
import { PillLink, SectionLabel, Stars } from './ui';

export function Products({ m }: { m: TaniModel }) {
  const { products } = m;
  const { category, setCategory } = useShopFilter();
  const statusId = useId();
  const all = list(products, 'items', 12).filter((item) => field(item, 'name'));
  if (all.length === 0) return null;
  const eyebrow = text(products, 'eyebrow');
  const title = text(products, 'title');
  const subtitle = text(products, 'subtitle');
  const categories = productCategories(all);
  // Filter yang tidak lagi cocok (mis. kategori diubah di CMS) → semua produk
  const current = categories.some((c) => c === category) ? category : '';
  const items = filterProducts(all, current);
  const catalogLabel = text(products, 'button_label');
  const catalogAction = resolveAction(text(products, 'button_url'), m.askAbout('katalog lengkap'));

  return (
    <TemplateSection sectionKey="products" className={`${SECTION_Y} bg-white`}>
      <div className={CONTAINER}>
        <div className="grid gap-6 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10">
          <div className="min-w-0 @5xl:col-span-6">
            {eyebrow && (
              <Reveal>
                <SectionLabel>{eyebrow}</SectionLabel>
              </Reveal>
            )}
            {title && (
              <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[20ch] text-balance ${C.ink} ${TYPE_T.h2}`}>
                {title}
              </Reveal>
            )}
            {subtitle && (
              <Reveal as="p" delay={160} className={`mt-4 max-w-[52ch] ${TYPE_T.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
          </div>
          {categories.length > 1 && (
            <Reveal delay={200} className="min-w-0 @5xl:col-span-6 @5xl:justify-self-end">
              <div role="group" aria-label="Filter kategori" aria-describedby={statusId} className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 @2xl:mx-0 @2xl:flex-wrap @2xl:px-0 @5xl:justify-end">
                {['', ...categories].map((c) => {
                  const pressed = c === current;
                  return (
                    <button
                      key={c || 'semua'}
                      type="button"
                      aria-pressed={pressed}
                      onClick={() => setCategory(c)}
                      className={`inline-flex h-10 shrink-0 items-center rounded-full px-4 text-[14px] font-semibold transition-colors ${
                        pressed ? 'bg-[#1E3A16] text-white' : 'bg-[#F6F2E3] text-[#18230F] hover:bg-[#ECE6CF]'
                      }`}
                    >
                      {c || 'Semua'}
                    </button>
                  );
                })}
              </div>
            </Reveal>
          )}
        </div>
        {/* Tanpa role="status": region status situs (keterangan pratinjau Shell) tetap satu-satunya */}
        <p id={statusId} className="sr-only" aria-live="polite">
          Menampilkan {items.length} produk{current ? ` kategori ${current}` : ''}
        </p>

        <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 @3xl:mt-12 @3xl:grid-cols-3 @3xl:gap-x-5 @6xl:grid-cols-4">
          {items.map((item, i) => {
            const name = field(item, 'name');
            const image = field(item, 'image');
            const badge = field(item, 'badge');
            const variant = field(item, 'variant');
            const price = field(item, 'price');
            const compare = field(item, 'compare_price');
            const rating = parseRating(field(item, 'rating'));
            const sold = field(item, 'sold');
            const action = resolveAction(field(item, 'url'), m.orderAbout(variant ? `${name} (${variant})` : name));
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 60)} className="group flex min-w-0 flex-col">
                <div className="relative aspect-square overflow-hidden rounded-[22px] bg-[#ECE6CF]">
                  {hasImage(image) ? (
                    <KitPhoto
                      src={image}
                      alt={TANI_PHOTOS.alt(image, name)}
                      fallback="none"
                      sizes="(min-width: 1152px) 22vw, (min-width: 768px) 30vw, 46vw"
                      className="absolute inset-0"
                      imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <LeafArt className="absolute inset-[12%] text-[#1E3A16]/25" />
                  )}
                  {badge && (
                    <span className="absolute left-2.5 top-2.5 max-w-[calc(100%-20px)] truncate rounded-full bg-(--tpl-accent) px-2.5 py-1 text-[12px] font-semibold text-(--tpl-on-accent) @3xl:left-3 @3xl:top-3">
                      {badge}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col px-1 pt-4">
                  {field(item, 'category') && <p className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${C.muted}`}>{field(item, 'category')}</p>}
                  <h3 className={`mt-1 text-[16px] font-semibold leading-snug ${C.ink} @3xl:text-[17px]`}>{name}</h3>
                  {variant && <p className={`mt-0.5 text-[13.5px] ${C.muted}`}>{variant}</p>}
                  {(rating !== null || sold) && (
                    <p className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] ${C.muted}`}>
                      {rating !== null && (
                        <span className="inline-flex items-center gap-1.5">
                          <Stars value={rating} />
                          <span className="font-semibold text-[#18230F]" aria-hidden>
                            {formatRating(rating)}
                          </span>
                        </span>
                      )}
                      {rating !== null && sold && <span aria-hidden>·</span>}
                      {sold && <span>{sold}</span>}
                    </p>
                  )}
                  {price && (
                    <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
                      <span className={`${TYPE_T.price} text-[19px] ${C.ink} @3xl:text-[20px]`}>{price}</span>
                      {compare && <s className={`text-[13.5px] ${C.muted}`}>{compare}</s>}
                    </p>
                  )}
                  {action && (
                    <div className="mt-auto pt-4">
                      <ActionLink
                        action={action}
                        aria-label={`Pesan ${name}`}
                        className={`${BTN.ghost} h-10 w-full gap-2 px-3 text-[14px] group-hover:bg-[#18230F] group-hover:text-white @3xl:h-11`}
                      >
                        <ShoppingBag aria-hidden className="h-4 w-4 shrink-0" />
                        Pesan
                      </ActionLink>
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </ul>

        {catalogLabel && catalogAction && (
          <div className="mt-12 flex justify-center">
            <PillLink action={catalogAction} label={catalogLabel} className={`${BTN.ink} ${BTN.lg}`} />
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
