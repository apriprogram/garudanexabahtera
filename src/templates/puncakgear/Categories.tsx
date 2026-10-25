// Kategori (kunci `categories`): judul terbelah (label + H2 kiri, deskripsi kanan), lalu kartu foto tegak 4:5 radius 24
// dengan nomor, ikon, nama, keterangan, dan tombol panah bulat warna aksen. Klik kartu menggulir ke Produk dan menyaring
// produk sekategori (nama kartu = "Kategori" produk); tanpa produk sekategori → filter dilepas. Tanpa foto → latar gelap
// bergaris kontur. HP–tablet: rel geser mendatar (snap), layar lebar: 5 kolom.
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { categoryFilterFor, productList, type PuncakModel } from './model';
import { PUNCAK_PHOTOS } from './photos';
import { C, TYPE_P } from './styles';
import { SectionLabel, TitleIcon, Topo } from './ui';

export function Categories({ m, onFilter }: { m: PuncakModel; onFilter: (category: string) => void }) {
  const { categories } = m;
  const eyebrow = text(categories, 'eyebrow');
  const title = text(categories, 'title');
  const subtitle = text(categories, 'subtitle');
  const items = list(categories, 'items', 6).filter((item) => field(item, 'title'));
  if (items.length === 0) return null;
  const products = productList(m.products);

  return (
    <TemplateSection sectionKey="categories" className={SECTION_Y}>
      <div className={CONTAINER}>
        {(eyebrow || title || subtitle) && (
          <div className="grid gap-6 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10">
            <div className="min-w-0 @5xl:col-span-8">
              {eyebrow && (
                <Reveal>
                  <SectionLabel>{eyebrow}</SectionLabel>
                </Reveal>
              )}
              {title && (
                <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[20ch] text-balance text-[#0E1512] ${TYPE_P.h2}`}>
                  {title}
                </Reveal>
              )}
            </div>
            {subtitle && (
              <Reveal as="p" delay={160} className={`max-w-[42ch] @5xl:col-span-4 @5xl:justify-self-end @5xl:pb-2 ${TYPE_P.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
          </div>
        )}

        <Reveal delay={120} className="mt-10 @3xl:mt-14">
          <ul
            className={`pg-rail -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @6xl:mx-0 @6xl:grid @6xl:overflow-visible @6xl:px-0 @6xl:pb-0 @6xl:gap-4 ${
              items.length >= 5 ? '@6xl:grid-cols-5' : items.length === 4 ? '@6xl:grid-cols-4' : '@6xl:grid-cols-3'
            }`}
          >
            {items.map((item, i) => {
              const name = field(item, 'title');
              const image = field(item, 'image');
              const match = categoryFilterFor(products, name);
              const fallback = m.productsAction ?? m.startAction;
              const custom = field(item, 'url');
              const action = resolveAction(custom, fallback);
              // Tautan sendiri → ikuti tautannya; selain itu saring produk sekategori (atau lepas filter)
              const onNavigate = !custom && m.productsAction ? () => onFilter(match) : undefined;
              const card = 'group relative isolate flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[24px] bg-[#0E1512] p-4 text-white @3xl:p-5';
              const inner = (
                <>
                    {hasImage(image) ? (
                      <KitPhoto
                        src={image}
                        alt={PUNCAK_PHOTOS.alt(image, `Kategori ${name}`)}
                        fallback="none"
                        zoom
                        sizes="(min-width: 1152px) 20vw, (min-width: 672px) 31vw, 72vw"
                        className="absolute inset-0 -z-20"
                        imgClassName="transition-[scale] duration-700 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <Topo className="absolute inset-0 -z-20 h-full w-full text-(--pg-glow) opacity-30" />
                    )}
                    <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(8_14_11/0.35)_0%,rgb(8_14_11/0)_32%,rgb(8_14_11/0)_48%,rgb(8_14_11/0.82)_100%)]" />
                    <div className="flex items-start justify-between">
                      <span aria-hidden className="text-[12px] font-semibold tabular-nums tracking-[0.14em] text-white/85">{String(i + 1).padStart(2, '0')}</span>
                      <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.14] ring-1 ring-inset ring-white/30 backdrop-blur-md">
                        <TitleIcon title={name} index={i} className="h-[18px] w-[18px]" />
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className={`text-white ${TYPE_P.h3}`}>{name}</h3>
                        {field(item, 'text') && <p className="mt-1 text-[13px] leading-snug text-white/80">{field(item, 'text')}</p>}
                      </div>
                      {action && (
                        <span
                          aria-hidden
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent) transition-transform duration-300 group-hover:-translate-y-0.5"
                        >
                          <ArrowUpRight className="h-[18px] w-[18px]" />
                        </span>
                      )}
                    </div>
                </>
              );
              return (
                <li key={`${name}-${i}`} className="w-[72%] shrink-0 snap-start @xl:w-[44%] @3xl:w-[31%] @6xl:w-auto">
                  {action ? (
                    <ActionLink action={action} onNavigate={onNavigate} aria-label={match ? `${name}: lihat produk` : name} className={card}>
                      {inner}
                    </ActionLink>
                  ) : (
                    <div className={card}>{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
