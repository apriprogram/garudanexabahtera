// Kartu produk GadgetKu (referensi "Bose · New arrivals"): ubin abu muda persegi berisi foto (atau ikon kategori bila
// foto kosong), label (mis. "Baru" / "-25%"), tombol pesan bulat; di bawahnya kategori · rating · terjual, nama, ringkasan
// "Cocok untuk", dan harga + harga coret. Varian `row` (hasil pencarian per tipe HP): foto kecil di kiri, teks di kanan.
import { Plus, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { ActionLink } from '../shared/Shell';
import { field, hasImage, resolveAction, type LinkAction } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { compatSummary, productBadge, type GadgetkuModel } from './model';
import { GADGETKU_PHOTOS } from './photos';
import { C, TYPE_G } from './styles';
import { ItemIcon, Price } from './ui';

/** Aksi tombol pesan: tautan produk sendiri, atau WhatsApp berisi nama + harga (+ tipe HP bila dipilih). */
function productAction(m: GadgetkuModel, item: ListItem, phoneLabel = ''): LinkAction | null {
  const name = field(item, 'name');
  const price = field(item, 'price');
  const subject = `${name}${price ? ` (${price})` : ''}${phoneLabel ? ` untuk ${phoneLabel}` : ''}`;
  return resolveAction(field(item, 'url'), m.orderAction(subject));
}

function ProductImage({ item, sizes, className }: { item: ListItem; sizes: string; className: string }) {
  const image = field(item, 'image');
  const name = field(item, 'name');
  return hasImage(image) ? (
    <KitPhoto
      src={image}
      alt={GADGETKU_PHOTOS.alt(image, name)}
      fallback="none"
      sizes={sizes}
      className={className}
      imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
    />
  ) : (
    <div aria-hidden className={`flex items-center justify-center bg-[#E8EAED] text-[#0B0C0E]/45 ${className}`}>
      <ItemIcon name={`${field(item, 'category')} ${name}`} className="h-1/3 w-1/3" strokeWidth={1.25} />
    </div>
  );
}

export function ProductCard({ m, item, sizes }: { m: GadgetkuModel; item: ListItem; sizes: string }) {
  const name = field(item, 'name');
  const badge = productBadge(item);
  const discount = badge.startsWith('-');
  const action = productAction(m, item);
  const rating = field(item, 'rating');
  // Baris kecil di atas nama: kategori · rating · terjual (yang kosong dilewati)
  const meta: { key: string; node: ReactNode }[] = [];
  if (field(item, 'category')) meta.push({ key: 'category', node: field(item, 'category') });
  if (rating) {
    meta.push({
      key: 'rating',
      node: (
        <span className="inline-flex items-center gap-1">
          <Star aria-hidden className="h-3.5 w-3.5 fill-[#F5B301] text-[#F5B301]" />
          <span className="sr-only">Rating </span>
          {rating}
        </span>
      ),
    });
  }
  if (field(item, 'sold')) meta.push({ key: 'sold', node: field(item, 'sold') });

  return (
    // relative: teks sr-only (absolute) di dalam kartu tetap di dalam baris geser, tidak melebarkan halaman
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-square overflow-hidden rounded-[20px] bg-[#F2F3F5]">
        <ProductImage item={item} sizes={sizes} className="absolute inset-0" />
        {badge && (
          <span
            className={`absolute left-3 top-3 max-w-[calc(100%-24px)] truncate rounded-full px-2.5 py-1 text-[12px] font-semibold ${
              discount ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-white text-[#0B0C0E]'
            }`}
          >
            {badge}
          </span>
        )}
        {action && (
          <ActionLink
            action={action}
            aria-label={`Pesan ${name}`}
            className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#0B0C0E] text-white transition-colors hover:bg-[#26282C]"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </ActionLink>
        )}
      </div>
      <div className="flex flex-1 flex-col px-1 pt-3.5">
        {meta.length > 0 && (
          <p className={`flex flex-wrap items-center gap-x-1.5 text-[12.5px] ${C.muted}`}>
            {meta.map((part, i) => (
              <span key={part.key} className="inline-flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>·</span>}
                {part.node}
              </span>
            ))}
          </p>
        )}
        <h3 className="mt-1 text-[15px] font-medium leading-snug tracking-[-0.01em] text-[#0B0C0E] @3xl:text-[16px]">{name}</h3>
        <p className={`mt-1 line-clamp-1 text-[12.5px] ${C.muted}`}>Cocok: {compatSummary(field(item, 'compatible'))}</p>
        <div className="mt-auto pt-2.5">
          <Price price={field(item, 'price')} oldPrice={field(item, 'old_price')} />
        </div>
      </div>
    </article>
  );
}

/** Kartu ringkas (hasil pencarian per tipe HP): foto 72px, kategori, nama, harga, tombol pesan untuk tipe HP itu. */
export function ProductRow({ m, item, phoneLabel }: { m: GadgetkuModel; item: ListItem; phoneLabel: string }) {
  const name = field(item, 'name');
  const action = productAction(m, item, phoneLabel);
  return (
    <article className="group relative flex h-full items-center gap-3.5 rounded-[20px] bg-white p-2.5 pr-3">
      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[14px] bg-[#F2F3F5]">
        <ProductImage item={item} sizes="72px" className="absolute inset-0" />
      </div>
      <div className="min-w-0 flex-1">
        {field(item, 'category') && <p className={`text-[12px] ${C.muted}`}>{field(item, 'category')}</p>}
        <h3 className="truncate text-[14.5px] font-medium leading-snug text-[#0B0C0E]">{name}</h3>
        {field(item, 'price') && <p className={`${TYPE_G.price} mt-0.5 text-[15px] text-[#0B0C0E]`}>{field(item, 'price')}</p>}
      </div>
      {action && (
        <ActionLink
          action={action}
          aria-label={`Pesan ${name}${phoneLabel ? ` untuk ${phoneLabel}` : ''}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B0C0E] text-white transition-colors hover:bg-[#26282C]"
        >
          <Plus className="h-[18px] w-[18px]" aria-hidden />
        </ActionLink>
      )}
    </article>
  );
}
