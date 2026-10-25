// Kategori (kunci `categories`): kepala section terbelah, lalu kartu foto tegak membulat (3 kolom) dengan nama serif,
// jumlah produk mono, deskripsi, dan tombol "Lihat produk". Tombol menyaring Produk terlaris sesuai nama kategori lalu
// menggulir ke sana; tautan sendiri (mis. marketplace) dipakai bila diisi. HP: kartu bergeser mendatar (snap).
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { useTemplateRuntime } from '../shared/runtime';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { matchCategory, productCategories, type GlowModel } from './model';
import { GLOWSTORY_PHOTOS } from './photos';
import { C, MONO, SERIF } from './styles';
import { SectionHead } from './ui';

const COLS: Record<number, string> = {
  1: '@3xl:grid-cols-1 @3xl:max-w-[520px]',
  2: '@3xl:grid-cols-2',
  3: '@3xl:grid-cols-3',
  4: '@3xl:grid-cols-2 @6xl:grid-cols-4',
};

export function Categories({ m, onPick }: { m: GlowModel; onPick: (category: string) => void }) {
  const { goTo } = useTemplateRuntime();
  const { categories } = m;
  const items = list(categories, 'items', 4).filter((item) => field(item, 'name'));
  if (items.length === 0) return null;
  const productCats = productCategories(m.productItems);
  const link = 'inline-flex min-h-11 items-center gap-2 border-b border-[#2B211C]/30 text-[14px] font-medium text-[#2B211C] transition-colors hover:border-[#2B211C]';

  return (
    <TemplateSection sectionKey="categories" className={SECTION_Y}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(categories, 'eyebrow')} title={text(categories, 'title')} highlight={text(categories, 'highlight')} subtitle={text(categories, 'subtitle')} />

        <ul
          className={`-mx-5 mt-10 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @3xl:mx-0 @3xl:grid @3xl:overflow-visible @3xl:px-0 @3xl:pb-0 @3xl:mt-14 @5xl:gap-5 ${COLS[items.length]}`}
        >
          {items.map((item, i) => {
            const name = field(item, 'name');
            const image = field(item, 'image');
            const count = field(item, 'count');
            const own = resolveAction(field(item, 'url'), null);
            const match = matchCategory(name, productCats);
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 90)} className="group flex w-[78%] shrink-0 snap-start flex-col @xl:w-[46%] @3xl:w-auto">
                {hasImage(image) ? (
                  <KitPhoto
                    src={image}
                    alt={GLOWSTORY_PHOTOS.alt(image, name)}
                    fallback="none"
                    zoom
                    sizes="(min-width: 768px) 33vw, 78vw"
                    className="aspect-[4/5] rounded-[22px] @3xl:rounded-[28px] @5xl:aspect-[1/1.08]"
                    imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div aria-hidden className="aspect-[4/5] rounded-[22px] bg-[#EDE5D9] @3xl:rounded-[28px] @5xl:aspect-[1/1.08]" />
                )}
                <div className="mt-5 flex items-baseline justify-between gap-3">
                  <h3 className={`${SERIF} text-[28px] leading-none text-[#2B211C] @3xl:text-[32px]`}>{name}</h3>
                  {count && <span className={`${MONO} shrink-0 ${C.muted}`}>{count}</span>}
                </div>
                {field(item, 'description') && <p className={`mt-2 text-[15px] leading-relaxed ${C.muted}`}>{field(item, 'description')}</p>}
                <div className="mt-auto pt-3">
                  {own ? (
                    <ActionLink action={own} className={`group/link ${link}`}>
                      Lihat produk
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5" aria-hidden />
                    </ActionLink>
                  ) : (
                    m.productsAction && (
                      <button
                        type="button"
                        onClick={() => {
                          onPick(match);
                          goTo('products');
                        }}
                        aria-label={`Lihat produk ${name}`}
                        className={`group/link ${link}`}
                      >
                        Lihat produk
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5" aria-hidden />
                      </button>
                    )
                  )}
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
