// Kategori (kunci `categories`): judul terbelah (label + H2 kiri, deskripsi kanan), lalu kartu putih membulat bernomor
// "(01)" seperti kartu nilai referensi Agroton: foto 4:3 membulat (atau bidang hijau + daun bila kosong) dengan ikon
// kaca dan chip jumlah produk, nama, deskripsi, tombol panah bulat. Klik kartu → gulir ke Produk terlaris dengan filter
// kategori yang sama (bila ada produk berkategori itu). HP: 1 kolom, tablet 2, desktop 4.
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, isEnabled, list, resolveAction, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { useShopFilter } from './hooks';
import { LeafArt } from './marks';
import { matchCategory, productCategories, type TaniModel } from './model';
import { TANI_PHOTOS } from './photos';
import { C, CARD, TYPE_T } from './styles';
import { SectionLabel, TitleIcon } from './ui';

const COLS: Record<number, string> = {
  1: 'mx-auto max-w-[480px]',
  2: '@2xl:grid-cols-2',
  3: '@2xl:grid-cols-2 @5xl:grid-cols-3',
  4: '@2xl:grid-cols-2 @6xl:grid-cols-4',
  5: '@2xl:grid-cols-2 @5xl:grid-cols-3',
  6: '@2xl:grid-cols-2 @5xl:grid-cols-3',
};

export function Categories({ m }: { m: TaniModel }) {
  const { categories } = m;
  const { setCategory } = useShopFilter();
  const eyebrow = text(categories, 'eyebrow');
  const title = text(categories, 'title');
  const subtitle = text(categories, 'subtitle');
  const items = list(categories, 'items', 6).filter((item) => field(item, 'title') || field(item, 'text'));
  if (items.length === 0 && !title) return null;
  const productsOn = isEnabled(m.products);
  const productCats = productsOn ? productCategories(list(m.products, 'items')) : [];

  return (
    <TemplateSection sectionKey="categories" className={SECTION_Y}>
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
                <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[18ch] text-balance ${C.ink} ${TYPE_T.h2}`}>
                  {title}
                </Reveal>
              )}
            </div>
            {subtitle && (
              <Reveal as="p" delay={160} className={`max-w-[46ch] @5xl:col-span-5 @5xl:justify-self-end @5xl:pb-2 ${TYPE_T.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
          </div>
        )}

        {items.length > 0 && (
          <ul className={`mt-10 grid gap-4 @3xl:mt-14 @5xl:gap-5 ${COLS[items.length]}`}>
            {items.map((item, i) => {
              const name = field(item, 'title');
              const meta = field(item, 'meta');
              const image = field(item, 'image');
              const match = matchCategory(productCats, name);
              const toProducts: LinkAction | null = match ? { kind: 'section', target: 'products' } : null;
              const action = resolveAction(field(item, 'url'), toProducts ?? m.askAbout(name ? `produk ${name}` : ''));
              const custom = !!field(item, 'url');
              return (
                <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 70)} className={`group relative flex flex-col p-2 ${CARD.white}`}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#1E3A16]">
                    {hasImage(image) ? (
                      <KitPhoto
                        src={image}
                        alt={TANI_PHOTOS.alt(image, name)}
                        fallback="none"
                        zoom
                        sizes="(min-width: 1152px) 25vw, (min-width: 672px) 50vw, 100vw"
                        className="absolute inset-0"
                        imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <LeafArt className="absolute -right-6 -top-4 h-[120%] text-white/25" />
                    )}
                    <span aria-hidden className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-[#1E3A16] ring-1 ring-inset ring-white/70 backdrop-blur-md">
                      <TitleIcon title={name} index={i} className="h-5 w-5" />
                    </span>
                    {meta && (
                      <span className="absolute bottom-3 left-3 max-w-[calc(100%-24px)] truncate rounded-full bg-white/90 px-3 py-1.5 text-[12.5px] font-semibold text-[#18230F] backdrop-blur-md">
                        {meta}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-4 pb-4 pt-5 @3xl:px-5 @3xl:pb-5">
                    <p className={`text-[13px] font-semibold tabular-nums ${C.muted}`}>({String(i + 1).padStart(2, '0')})</p>
                    {name && <h3 className={`mt-1 ${C.ink} ${TYPE_T.h3}`}>{name}</h3>}
                    {field(item, 'text') && <p className={`mt-2 ${TYPE_T.body} ${C.muted}`}>{field(item, 'text')}</p>}
                    {action && (
                      <ActionLink
                        action={action}
                        onNavigate={match && !custom ? () => setCategory(match) : undefined}
                        aria-label={name ? `Lihat ${name}` : 'Lihat kategori'}
                        className="mt-auto flex items-center justify-between gap-3 pt-5 text-[14px] font-semibold text-[#18230F] after:absolute after:inset-0 after:rounded-[28px]"
                      >
                        <span>{custom ? 'Lihat selengkapnya' : match ? 'Lihat produk' : 'Tanya produk'}</span>
                        <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECE6CF] transition-colors group-hover:bg-(--tpl-accent) group-hover:text-(--tpl-on-accent)">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </ActionLink>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}
