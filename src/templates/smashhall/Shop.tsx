// Perlengkapan (kunci `shop`, latar putih) + Galeri (kunci `gallery`, latar pasir).
// Perlengkapan: kartu produk radius 20 (foto 4:3 di dalam bingkai 8px, kategori kecil, nama Sora, catatan, harga Sora,
// tombol "Pesan" yang menyusun pesan WhatsApp). 4 kolom di layar lebar, 2 kolom di HP. Catatan jujur di bawah: tanpa
// keranjang belanja atau pembayaran online.
// Galeri: mosaik 4 kolom — foto pertama 2 × 2 (16:9), sisanya 3:2 — dengan keterangan pada chip kaca putih; HP: foto
// pertama selebar layar, sisanya 2 kolom.
import { Info, ShoppingBag } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { orderMessage, type SmashModel } from './model';
import { SMASHHALL_PHOTOS } from './photos';
import { C, CARD, DISPLAY, SECTION_PAD, TYPE_S } from './styles';
import { ButtonLink, SectionHead } from './ui';

export function Shop({ m }: { m: SmashModel }) {
  const { shop } = m;
  const items = m.items('shop');
  const buttonLabel = text(shop, 'button_label');
  const note = text(shop, 'note');

  return (
    <TemplateSection sectionKey="shop" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(shop, 'eyebrow')} title={text(shop, 'title')} subtitle={text(shop, 'subtitle')} srTitle="Perlengkapan" />
        <ul className="mt-10 grid grid-cols-2 gap-3 @3xl:mt-14 @3xl:gap-5 @5xl:grid-cols-4">
          {items.map((item, i) => {
            const name = field(item, 'name');
            const price = field(item, 'price');
            const image = field(item, 'image');
            const action = m.waWith(orderMessage(m.companyName, name, price)) ?? m.contactAction;
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i)} className="flex min-w-0">
                <div className={`group flex w-full min-w-0 flex-col p-1.5 @3xl:p-2 ${CARD}`}>
                  {hasImage(image) && (
                    <KitPhoto
                      src={image}
                      alt={SMASHHALL_PHOTOS.alt(image, `Produk ${name} di toko ${m.companyName}`)}
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="aspect-[4/3] rounded-[14px]"
                      imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                    />
                  )}
                  <div className="flex flex-1 flex-col px-2 pb-2 pt-4 @3xl:px-3 @3xl:pb-3">
                    {field(item, 'category') && <p className={`text-[11.5px] font-semibold uppercase tracking-[0.12em] ${C.muted}`}>{field(item, 'category')}</p>}
                    <h3 className={`mt-1.5 ${DISPLAY} text-[15.5px] font-semibold leading-snug tracking-[-0.01em] @3xl:text-[17px] ${C.ink}`}>{name}</h3>
                    {field(item, 'note') && <p className={`mt-1.5 text-[13.5px] leading-snug ${C.muted}`}>{field(item, 'note')}</p>}
                    <div className="mt-auto pt-4">
                      {price && <p className={`${DISPLAY} text-[18px] font-bold tabular-nums tracking-[-0.02em] @3xl:text-[20px] ${C.ink}`}>{price}</p>}
                      <ButtonLink
                        action={action}
                        label={buttonLabel}
                        variant="ghost"
                        size="md"
                        icon={<ShoppingBag aria-hidden className="h-4 w-4 shrink-0" />}
                        aria-label={`${buttonLabel} ${name}`}
                        className="mt-3 w-full"
                      />
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
        {note && (
          <p className={`mt-6 flex items-start gap-2 ${TYPE_S.small} ${C.muted}`}>
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {note}
          </p>
        )}
      </div>
    </TemplateSection>
  );
}

export function Gallery({ m }: { m: SmashModel }) {
  const { gallery } = m;
  const items = m.items('gallery');

  return (
    <TemplateSection sectionKey="gallery" className={`${C.sand} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(gallery, 'eyebrow')} title={text(gallery, 'title')} subtitle={text(gallery, 'subtitle')} srTitle="Galeri" />
        <ul className="mt-10 grid grid-cols-2 gap-3 @3xl:mt-14 @4xl:grid-cols-4 @5xl:gap-4">
          {items.map((item, i) => {
            const first = i === 0;
            const image = field(item, 'image');
            const caption = field(item, 'caption');
            return (
              <Reveal
                as="li"
                key={`${image}-${i}`}
                variant="fade"
                delay={stagger(i)}
                className={`group min-w-0 ${first ? 'col-span-2 @4xl:row-span-2' : ''}`}
              >
                <figure className="relative h-full">
                  <KitPhoto
                    src={image}
                    alt={SMASHHALL_PHOTOS.alt(image, caption || `Foto kegiatan di ${m.companyName}`)}
                    zoom
                    sizes={first ? '(min-width: 896px) 50vw, 100vw' : '(min-width: 896px) 25vw, 50vw'}
                    className={`rounded-[20px] ${first ? 'aspect-[16/9] @4xl:aspect-auto @4xl:h-full' : 'aspect-[3/2]'}`}
                    imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                  />
                  {caption && (
                    <figcaption
                      className={`absolute bottom-2.5 left-2.5 right-2.5 w-fit max-w-[calc(100%-20px)] rounded-xl bg-white/90 px-3 py-1.5 text-[12.5px] font-medium leading-snug ring-1 ring-black/[0.06] backdrop-blur-md @3xl:bottom-3 @3xl:left-3 @3xl:text-[13px] ${C.ink} ${first ? '' : 'hidden @3xl:block'}`}
                    >
                      {caption}
                    </figcaption>
                  )}
                </figure>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
