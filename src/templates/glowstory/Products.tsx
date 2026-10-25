// Produk terlaris (kunci `products`): kepala section + tombol saring per kategori (pil, aria-pressed), lalu grid kartu
// produk di bidang pasir lembut: nomor urut mono, label (Terlaris / -20%) terakota, foto 4:5, merek mono, nama serif,
// keterangan, bintang + jumlah ulasan, harga + harga coret, dan tombol "Tambah ke keranjang" (keranjang → pesanan
// WhatsApp). Produk bertautan sendiri memakai tombol "Beli". HP: 2 kolom.
import { Check, ExternalLink, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, resolveAction, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { filterProducts, formatRating, parseRating, parseRupiah, productCategories, type GlowModel } from './model';
import { GLOWSTORY_PHOTOS } from './photos';
import { useStore } from './storeContext';
import { C, MONO, SERIF } from './styles';
import { SectionHead, Stars } from './ui';

function AddButton({ name, price }: { name: string; price: string }) {
  const store = useStore();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setDone(false), 1600);
    return () => window.clearTimeout(timer);
  }, [done]);
  return (
    <button
      type="button"
      onClick={() => setDone(store.add(name, price))}
      aria-label={`Tambah ${name} ke keranjang`}
      className={`mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-medium transition-colors ${
        done ? 'bg-[#2B211C] text-[#F6F1EA]' : 'text-[#2B211C] ring-1 ring-inset ring-[#2B211C]/20 hover:bg-[#2B211C] hover:text-[#F6F1EA]'
      }`}
    >
      {done ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
      {done ? (
        <span className="truncate">Masuk keranjang</span>
      ) : (
        // Kartu 2 kolom di HP ± 170px: label pendek; nama lengkap tetap di aria-label
        <span className="truncate">
          Tambah<span className="hidden @xl:inline"> ke keranjang</span>
        </span>
      )}
    </button>
  );
}

function ProductCard({ m, item, index }: { m: GlowModel; item: ListItem; index: number }) {
  const name = field(item, 'name');
  const image = field(item, 'image');
  const badge = field(item, 'badge');
  const price = field(item, 'price');
  const oldPrice = field(item, 'old_price');
  const rating = parseRating(field(item, 'rating'));
  const reviews = field(item, 'reviews');
  const own = resolveAction(field(item, 'url'), null);
  const sellable = parseRupiah(price) !== null;
  const ask = sellable ? null : m.waWith(`Halo ${m.companyName}, saya ingin bertanya tentang ${name}.`);

  return (
    <article className="flex h-full flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-[#EDE5D9]">
        {hasImage(image) && (
          <KitPhoto
            src={image}
            alt={GLOWSTORY_PHOTOS.alt(image, name)}
            fallback="none"
            sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 48vw"
            className="absolute inset-0"
            imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
          />
        )}
        <span aria-hidden className={`absolute left-3 top-3 rounded-full bg-[#FCFAF6]/90 px-2 py-1 ${MONO} text-[10.5px] text-[#2B211C]`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        {badge && (
          <span className="absolute right-3 top-3 max-w-[calc(100%-64px)] truncate rounded-full bg-(--tpl-accent) px-2.5 py-1 text-[11.5px] font-medium text-(--tpl-on-accent)">{badge}</span>
        )}
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        {field(item, 'brand') && <p className={`${MONO} text-[10.5px] ${C.muted}`}>{field(item, 'brand')}</p>}
        <h3 className={`mt-1 ${SERIF} text-[20px] leading-[1.12] text-[#2B211C] @3xl:text-[22px]`}>{name}</h3>
        {field(item, 'meta') && <p className={`mt-1 text-[13px] leading-snug ${C.muted}`}>{field(item, 'meta')}</p>}
        {rating !== null && (
          <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-[#2B211C]">
            <span className="text-(--gs-accent-text)">
              <Stars value={rating} className="h-3 w-3" />
            </span>
            <span className="sr-only">Rating</span>
            <span className="font-medium">{formatRating(rating)}</span>
            {reviews && <span className={C.muted}>({reviews}<span className="sr-only"> ulasan</span>)</span>}
          </p>
        )}
        <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-3">
          {price && <span className="text-[16px] font-semibold text-[#2B211C]">{price}</span>}
          {oldPrice && (
            <span className={`text-[13px] line-through ${C.muted}`}>
              <span className="sr-only">Harga sebelumnya </span>
              {oldPrice}
            </span>
          )}
        </p>
        {own ? (
          <ActionLink action={own} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2B211C] text-[14px] font-medium text-[#F6F1EA] transition-colors hover:bg-[#45372F]" aria-label={`Beli ${name}`}>
            Beli
            <ExternalLink className="h-4 w-4" aria-hidden />
          </ActionLink>
        ) : sellable ? (
          <AddButton name={name} price={price} />
        ) : (
          ask && (
            <ActionLink action={ask} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full text-[14px] font-medium text-[#2B211C] ring-1 ring-inset ring-[#2B211C]/20" aria-label={`Tanya ${name}`}>
              Tanya produk
            </ActionLink>
          )
        )}
      </div>
    </article>
  );
}

/** Jarak bawah section penuh, jarak atas kecil: dipakai bila tepat di bawah section Kategori (jarak tidak dobel). */
const AFTER_CATEGORIES = 'pb-16 pt-4 @3xl:pb-24 @5xl:pb-28 @7xl:pb-32';

export function Products({ m, category, onCategory, follows = false }: { m: GlowModel; category: string; onCategory: (category: string) => void; follows?: boolean }) {
  const { products } = m;
  const items = m.productItems;
  if (items.length === 0) return null;
  const categories = productCategories(items);
  const active = categories.includes(category) ? category : '';
  const shown = filterProducts(items, active);
  const chip = (current: boolean) =>
    `inline-flex h-10 items-center rounded-full px-4 text-[14px] font-medium transition-colors ${
      current ? 'bg-[#2B211C] text-[#F6F1EA]' : 'text-[#2B211C] ring-1 ring-inset ring-[#2B211C]/15 hover:bg-[#EDE5D9]'
    }`;

  return (
    <TemplateSection sectionKey="products" className={follows ? AFTER_CATEGORIES : SECTION_Y}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(products, 'eyebrow')} title={text(products, 'title')} highlight={text(products, 'highlight')} subtitle={text(products, 'subtitle')} />

        {categories.length > 1 && (
          <div role="group" aria-label="Saring kategori" className="-mx-5 mt-8 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] @2xl:mx-0 @2xl:flex-wrap @2xl:px-0 @3xl:mt-10">
            <button type="button" aria-pressed={active === ''} onClick={() => onCategory('')} className={chip(active === '')}>
              Semua
            </button>
            {categories.map((c) => (
              <button key={c} type="button" aria-pressed={active === c} onClick={() => onCategory(c)} className={`${chip(active === c)} whitespace-nowrap`}>
                {c}
              </button>
            ))}
          </div>
        )}

        <ul aria-label="Daftar produk" className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 @3xl:grid-cols-3 @3xl:gap-x-5 @5xl:mt-10 @5xl:grid-cols-4">
          {shown.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i % 4, 70)} className="group min-w-0">
              <ProductCard m={m} item={item} index={items.indexOf(item)} />
            </Reveal>
          ))}
        </ul>
        <p className="sr-only" role="status">
          {active ? `${shown.length} produk ${active}` : ''}
        </p>
      </div>
    </TemplateSection>
  );
}
