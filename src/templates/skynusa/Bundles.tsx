// Paket bundling (kunci `bundles`): pita GELAP teal-arang berkisi garis tipis (pola pita gelap referensi Aerova), kepala
// terbelah putih, lalu kartu paket gelap bergaris tipis: foto isi paket 4:3, nama + label sorotan, deskripsi, harga +
// harga coret + chip hemat mint, daftar isi paket bertanda centang, tombol "Tambah" (keranjang demo) dan tombol tanya
// paket (WhatsApp berisi nama paket bila tautan kosong). Paket berlabel pertama = kartu bercahaya mint bergaris mint.
// HP: kartu bertumpuk.
import { Check } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { featuredIndex, lines, parsePrice, type SkyNusaModel } from './model';
import { SKYNUSA_PHOTOS } from './photos';
import { useShop } from './shop';
import { CARD, MONO, TYPE_S } from './styles';
import { AddButton, Price, SectionHead } from './ui';

const COLS: Record<number, string> = {
  1: 'mx-auto max-w-[480px]',
  2: '@3xl:grid-cols-2 mx-auto max-w-[980px]',
  3: '@3xl:grid-cols-2 @6xl:grid-cols-3',
};

export function Bundles({ m }: { m: SkyNusaModel }) {
  const { bundles } = m;
  const shop = useShop();
  const items = list(bundles, 'items', 3).filter((item) => field(item, 'name') || field(item, 'price'));
  if (items.length === 0) return null;
  const featured = featuredIndex(items);

  return (
    <TemplateSection sectionKey="bundles" data-tpl-tone="inverse" className={`sn-dark-band relative isolate overflow-hidden text-white ${SECTION_Y}`}>
      <div aria-hidden className="sn-grid-dark absolute inset-0 -z-10" />
      <div className={CONTAINER}>
        <SectionHead tone="dark" eyebrow={text(bundles, 'eyebrow')} title={text(bundles, 'title')} highlight={text(bundles, 'highlight')} subtitle={text(bundles, 'subtitle')} />

        <ul className={`mt-10 grid gap-4 @3xl:mt-14 @5xl:gap-5 ${COLS[items.length]}`}>
          {items.map((item, i) => {
            const name = field(item, 'name');
            const badge = field(item, 'badge');
            const image = field(item, 'image');
            const price = field(item, 'price');
            const contents = lines(field(item, 'contents'), 8);
            const isFeatured = i === featured;
            const ask = resolveAction(field(item, 'button_url'), m.askAbout(name ? `paket ${name}` : ''));
            const buttonLabel = field(item, 'button_label');
            const id = `paket:${name}`;
            return (
              <Reveal
                as="li"
                key={`${name}-${i}`}
                variant={isFeatured ? 'scale' : 'up'}
                delay={stagger(i, 90)}
                className={`flex min-w-0 flex-col p-2 ${isFeatured ? 'sn-featured rounded-[16px] ring-1 ring-inset ring-(--sn-mint)/45' : CARD.dark}`}
              >
                {hasImage(image) && (
                  <KitPhoto
                    src={image}
                    alt={SKYNUSA_PHOTOS.alt(image, name ? `Isi ${name}` : 'Isi paket')}
                    fallback="none"
                    zoom
                    sizes="(min-width: 1152px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="aspect-[16/10] rounded-[12px]"
                  />
                )}
                <div className="flex flex-1 flex-col p-4 @3xl:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {name && <h3 className={`text-white ${TYPE_S.h3}`}>{name}</h3>}
                    {badge && <span className={`rounded-[6px] bg-(--sn-mint) px-2 py-1 text-[#0E1A1C] ${MONO}`}>{badge}</span>}
                  </div>
                  {field(item, 'description') && <p className="mt-2 text-[14.5px] leading-relaxed text-white/70">{field(item, 'description')}</p>}
                  <Price price={price} oldPrice={field(item, 'old_price')} tone="dark" className="mt-5" />
                  {contents.length > 0 && (
                    <ul aria-label={name ? `Isi ${name}` : 'Isi paket'} className="mt-5 space-y-2.5 border-t border-white/10 pt-5">
                      {contents.map((line, li) => (
                        <li key={`${line}-${li}`} className="flex items-start gap-2.5 text-[14.5px] leading-snug text-white/90">
                          <span aria-hidden className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-white/[0.08] text-(--sn-mint)">
                            <Check className="h-3 w-3" strokeWidth={2.75} />
                          </span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-7">
                    <AddButton
                      id={id}
                      name={name || 'paket'}
                      tone="dark"
                      onAdd={() => shop.add({ id, name, kind: 'Paket', priceLabel: price, price: parsePrice(price) })}
                    />
                    {ask && buttonLabel && (
                      <ActionLink action={ask} className="inline-flex min-h-10 items-center text-[14px] font-medium text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline">
                        {buttonLabel}
                      </ActionLink>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
