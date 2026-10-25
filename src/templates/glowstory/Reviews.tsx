// Ulasan berfoto (kunci `testimonials`): kepala section dengan ringkasan rating (angka serif besar + bintang), lalu
// kartu ulasan bersusun ala papan foto (CSS columns): kartu berfoto = foto pembeli 4:5 (tombol perbesar → panel foto
// dengan geser kiri/kanan), bintang, produk yang diulas, kutipan, avatar inisial + nama + kota/jenis kulit; kartu
// tanpa foto = kartu kutipan berwarna aksen (selang-seling dengan cokelat tua). HP: satu kolom.
import { Expand, Quote } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, safeImage, text } from '../shared/utils';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import { formatRating, parseRating, type GlowModel } from './model';
import { GLOWSTORY_PHOTOS } from './photos';
import { useStore, type PhotoView } from './storeContext';
import { C, MONO, SERIF } from './styles';
import { SectionHead, Stars } from './ui';

export function Reviews({ m }: { m: GlowModel }) {
  const store = useStore();
  const { testimonials } = m;
  const items = list(testimonials, 'items', 6).filter((item) => field(item, 'quote'));
  if (items.length === 0) return null;
  const average = parseRating(text(testimonials, 'rating_value'));
  const ratingLabel = text(testimonials, 'rating_label');
  const photos: (PhotoView & { item: number })[] = items.flatMap((item, i) => {
    const src = field(item, 'photo');
    if (!hasImage(src)) return [];
    const name = field(item, 'name');
    const product = field(item, 'product');
    return [
      {
        item: i,
        src: GLOWSTORY_PHOTOS.asset(src)?.src ?? safeImage(src),
        alt: GLOWSTORY_PHOTOS.alt(src, `Foto dari ${name || 'pembeli'}`),
        title: name || 'Pembeli',
        detail: [product && `Mengulas ${product}.`, field(item, 'quote')].filter(Boolean).join(' '),
      },
    ];
  });
  /** Urutan kartu tanpa foto sebelum kartu ke-i (warna selang-seling aksen / cokelat tua). */
  const plainBefore = (i: number) => items.slice(0, i).filter((_, j) => !photos.some((p) => p.item === j)).length;

  return (
    <TemplateSection sectionKey="testimonials" className={SECTION_Y}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title')} highlight={text(testimonials, 'highlight')}>
          {average !== null && (
            <Reveal delay={160} className="flex items-center gap-4">
              <span className={`${SERIF} text-[64px] leading-none text-[#2B211C] @3xl:text-[76px]`}>{formatRating(average)}</span>
              <span>
                <span className="block text-(--gs-accent-text)">
                  <Stars value={average} className="h-4 w-4" />
                </span>
                <span className="sr-only">Rating rata-rata {formatRating(average)} dari 5</span>
                {ratingLabel && <span className={`mt-1 block text-[14px] ${C.muted}`}>{ratingLabel}</span>}
              </span>
            </Reveal>
          )}
        </SectionHead>

        <ul className="mt-10 gap-4 space-y-4 @2xl:columns-2 @3xl:mt-14 @5xl:columns-3 @5xl:gap-5 @5xl:space-y-5">
          {items.map((item, i) => {
            const name = field(item, 'name');
            const role = field(item, 'role');
            const product = field(item, 'product');
            const rating = parseRating(field(item, 'rating'));
            const photoIndex = photos.findIndex((p) => p.item === i);
            const withPhoto = photoIndex >= 0;
            const tone = withPhoto ? 'photo' : plainBefore(i) % 2 === 0 ? 'accent' : 'dark';
            const colored = tone !== 'photo';
            return (
              <Reveal
                as="li"
                key={`${name}-${i}`}
                delay={stagger(i, 70)}
                data-tpl-tone={colored ? 'inverse' : undefined}
                className={`break-inside-avoid overflow-hidden rounded-[24px] ${
                  tone === 'accent' ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : tone === 'dark' ? 'bg-[#2B211C] text-[#F6F1EA]' : 'bg-[#FCFAF6] text-[#2B211C]'
                }`}
              >
                {withPhoto && (
                  <button
                    type="button"
                    onClick={() => store.openPhotos(photos, photoIndex)}
                    aria-label={`Perbesar foto dari ${name || 'pembeli'}`}
                    className="group relative block w-full p-2 pb-0 text-left"
                  >
                    <KitPhoto
                      src={field(item, 'photo')}
                      alt={photos[photoIndex].alt}
                      fallback="none"
                      sizes="(min-width: 1024px) 30vw, (min-width: 672px) 48vw, 100vw"
                      className="aspect-[4/5] rounded-[18px]"
                      imgClassName="transition-[scale] duration-700 group-hover:scale-[1.03]"
                    >
                      <span className={`absolute left-3 top-3 rounded-full bg-[#FCFAF6]/90 px-2.5 py-1 ${MONO} text-[10px] text-[#2B211C]`}>Foto pembeli</span>
                      <span aria-hidden className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#FCFAF6]/90 text-[#2B211C] transition-colors group-hover:bg-white">
                        <Expand className="h-4 w-4" />
                      </span>
                    </KitPhoto>
                  </button>
                )}
                <div className="p-5 @3xl:p-6">
                  {colored && <Quote aria-hidden className="mb-3 h-7 w-7 opacity-60" strokeWidth={1.5} />}
                  {(rating !== null || product) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {rating !== null && (
                        <span className={colored ? '' : 'text-(--gs-accent-text)'}>
                          <Stars value={rating} />
                          <span className="sr-only">{formatRating(rating)} dari 5 bintang</span>
                        </span>
                      )}
                      {product && <span className={`${MONO} text-[10.5px] ${colored ? 'opacity-80' : C.muted}`}>{product}</span>}
                    </div>
                  )}
                  <blockquote className={`mt-3 ${colored ? `${SERIF} text-[24px] leading-[1.2]` : 'text-[15.5px] leading-relaxed'}`}>{field(item, 'quote')}</blockquote>
                  {(name || role) && (
                    <div className={`mt-5 flex items-center gap-3 border-t pt-4 ${colored ? 'border-current/20' : 'border-[#2B211C]/10'}`}>
                      <KitAvatar name={name} photo="" className={`h-10 w-10 ${colored ? 'bg-white/15! text-current!' : ''}`} />
                      <div className="min-w-0">
                        {name && <p className="truncate text-[15px] font-semibold">{name}</p>}
                        {role && <p className={`truncate text-[13px] ${colored ? 'opacity-80' : C.muted}`}>{role}</p>}
                      </div>
                    </div>
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
