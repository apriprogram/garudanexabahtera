// Galeri (kunci `gallery`, anchor #galeri): mozaik foto membulat. Foto pertama melebar 2 kolom, foto kedua meninggi 2
// baris, sisanya 1 sel (grid-flow-dense agar tanpa lubang); keterangan berupa <figcaption> chip di atas foto.
// HP: 2 kolom; layar lebar: 4 kolom dengan tinggi baris tetap (foto object-cover).
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { MadaniModel } from './model';
import { MADANI_PHOTOS } from './photos';
import { SECTION_PAD } from './styles';
import { SectionHead } from './ui';

/** Ukuran sel per urutan: lebar (2 kolom), tinggi (2 baris), biasa. */
const tile = (i: number) => (i === 0 ? 'col-span-2' : i === 1 ? 'row-span-2' : '');
const sizesOf = (i: number) => (i === 0 ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw');

export function Gallery({ m }: { m: MadaniModel }) {
  const { gallery } = m;
  const items = list(gallery, 'items', 6).filter((item) => hasImage(field(item, 'image')));
  if (items.length === 0) return null;
  return (
    <TemplateSection sectionKey="gallery" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(gallery, 'eyebrow')} title={text(gallery, 'title')} />
        <ul className="mt-10 grid grid-flow-dense auto-rows-[150px] grid-cols-2 gap-3 @2xl:auto-rows-[210px] @3xl:mt-12 @3xl:gap-4 @5xl:auto-rows-[240px] @5xl:grid-cols-4 @7xl:auto-rows-[280px]">
          {items.map((item, i) => {
            const image = field(item, 'image');
            const caption = field(item, 'caption');
            return (
              <Reveal as="li" key={`${image}-${i}`} delay={stagger(i, 60)} className={`min-w-0 ${tile(i)}`}>
                <figure className="relative h-full overflow-hidden rounded-[18px] @3xl:rounded-[24px]">
                  <KitPhoto
                    src={image}
                    alt={MADANI_PHOTOS.alt(image, caption || `Kegiatan ${m.companyName}`)}
                    sizes={sizesOf(i)}
                    zoom
                    className="absolute inset-0"
                  />
                  {caption && (
                    <figcaption className="absolute bottom-2.5 left-2.5 max-w-[calc(100%-20px)] truncate rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-semibold text-(--md-deep) @3xl:bottom-4 @3xl:left-4 @3xl:text-[13px]">
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
