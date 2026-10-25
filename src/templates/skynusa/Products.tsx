// Drone pilihan (kunci `products`): pita abu sangat muda, kepala terbelah, baris filter kebutuhan (Semua + label
// kategori yang punya produk; dipilih juga dari kartu Kategori), lalu kartu produk ala toko: panggung foto abu terang
// (foto berlatar putih dibaurkan sehingga tampak seperti produk terpotong), label sorotan, label kebutuhan, nama,
// spesifikasi mono, harga + harga coret + chip hemat, tombol "Tambah" (keranjang demo) dan tautan tanya stok/detail.
// HP: 1 kolom (2 kolom ≥ @2xl, 4 kolom ≥ @6xl).
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { DroneIcon } from './marks';
import { filterProducts, lines, normalize, parsePrice, splitTags, type SkyNusaModel } from './model';
import { SKYNUSA_PHOTOS } from './photos';
import { useShop } from './shop';
import { C, MONO, MONO_PLAIN, TYPE_S } from './styles';
import { AddButton, Price, SectionHead } from './ui';

const COLS: Record<number, string> = {
  1: 'mx-auto max-w-[440px]',
  2: '@2xl:grid-cols-2 mx-auto max-w-[920px]',
  3: '@2xl:grid-cols-2 @5xl:grid-cols-3',
};

export function Products({ m }: { m: SkyNusaModel }) {
  const { products } = m;
  const shop = useShop();
  const items = m.productItems;
  if (items.length === 0) return null;
  const options = m.filterTags;
  const active = shop.filter && options.some((t) => normalize(t) === normalize(shop.filter ?? '')) ? shop.filter : null;
  const shownItems = filterProducts(items, active);
  const cols = COLS[shownItems.length] ?? '@2xl:grid-cols-2 @6xl:grid-cols-4';
  const note = text(products, 'note');

  return (
    <TemplateSection sectionKey="products" className={`${SECTION_Y} ${C.surface}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(products, 'eyebrow')} title={text(products, 'title')} highlight={text(products, 'highlight')} subtitle={text(products, 'subtitle')} />

        {options.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 @3xl:mt-12">
            <div role="group" aria-label="Filter kebutuhan" className="flex flex-wrap gap-2">
              {[null, ...options].map((tag) => {
                const pressed = (tag === null && !active) || (!!tag && !!active && normalize(tag) === normalize(active));
                return (
                  <button
                    key={tag ?? 'semua'}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => shop.setFilter(tag)}
                    className={`h-10 rounded-[10px] px-4 text-[14px] font-medium transition-colors ${
                      pressed ? 'bg-[#0E1A1C] text-white' : 'bg-white text-[#0E1A1C] ring-1 ring-inset ring-black/[0.08] hover:bg-white/60'
                    }`}
                  >
                    {tag ?? 'Semua'}
                  </button>
                );
              })}
            </div>
            <p className={`${MONO} ${C.muted}`} aria-live="polite">
              {shownItems.length} drone{active ? ` · ${active}` : ''}
            </p>
          </div>
        )}

        <ul className={`${options.length > 0 ? 'mt-6' : 'mt-10 @3xl:mt-14'} grid gap-4 @5xl:gap-5 ${cols}`}>
          {shownItems.map((item, i) => {
            const name = field(item, 'name');
            const image = field(item, 'image');
            const badge = field(item, 'badge');
            const tags = splitTags(field(item, 'use'));
            const specs = lines(field(item, 'specs'), 3);
            const price = field(item, 'price');
            const id = `produk:${name}`;
            const detail = resolveAction(field(item, 'url'), null);
            const ask = detail ?? m.askAbout(`stok ${name}`);
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 70)} className="group flex min-w-0 flex-col rounded-[18px] bg-white p-2 ring-1 ring-inset ring-black/[0.05]">
                <div className="sn-stage relative aspect-[4/3] overflow-hidden rounded-[12px]">
                  {hasImage(image) ? (
                    <KitPhoto
                      src={image}
                      alt={SKYNUSA_PHOTOS.alt(image, name)}
                      fallback="none"
                      sizes="(min-width: 1152px) 25vw, (min-width: 672px) 50vw, 100vw"
                      className="sn-stage absolute inset-0"
                      imgClassName="mix-blend-multiply transition-[scale] duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div aria-hidden className="absolute inset-0 flex items-center justify-center text-[#0E1A1C]/20">
                      <DroneIcon className="h-1/3 w-1/3" />
                    </div>
                  )}
                  {badge && <span className={`absolute left-3 top-3 rounded-[6px] bg-[#0E1A1C] px-2 py-1 text-white ${MONO}`}>{badge}</span>}
                  {tags.length > 0 && (
                    <ul aria-label="Cocok untuk" className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <li key={tag} className="rounded-[6px] bg-white/85 px-2 py-1 text-[12px] font-medium text-[#0E1A1C] ring-1 ring-inset ring-black/[0.05] backdrop-blur-md">
                          {tag}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-1 flex-col px-3 pb-3 pt-4">
                  {name && <h3 className={`text-[#0E1A1C] ${TYPE_S.h3}`}>{name}</h3>}
                  {specs.length > 0 && (
                    <p className={`mt-2 ${MONO_PLAIN} ${C.muted}`}>
                      {specs.map((spec, si) => (
                        <span key={`${spec}-${si}`}>
                          {si > 0 && <span aria-hidden className="mx-1.5 opacity-50">/</span>}
                          {spec}
                        </span>
                      ))}
                    </p>
                  )}
                  <div className="mt-auto pt-5">
                    <Price price={price} oldPrice={field(item, 'old_price')} />
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <AddButton
                        id={id}
                        name={name}
                        onAdd={() => shop.add({ id, name, kind: 'Drone', priceLabel: price, price: parsePrice(price) })}
                      />
                      {ask && (
                        <ActionLink action={ask} className={`inline-flex min-h-10 items-center text-[13.5px] font-medium underline-offset-4 hover:underline ${C.muted}`} aria-label={`${detail ? 'Detail' : 'Tanya stok'} ${name}`}>
                          {detail ? 'Detail' : 'Tanya stok'}
                        </ActionLink>
                      )}
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
        {note && <p className={`mt-8 max-w-[70ch] text-[13.5px] leading-relaxed ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}
