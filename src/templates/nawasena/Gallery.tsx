// Galeri (kunci `gallery`, anchor #galeri), pita putih: kepala section + bento 12 kolom (baris 200px di layar lebar):
// foto 1 tegak 6×3, foto 2 6×2, foto 3–4 3×1, sisanya baris 4 kolom. Keterangan mono SELALU tampil di bawah foto (bukan
// hanya saat disorot). Foto membesar pelan saat disorot. HP: 2 kolom, foto pertama selebar penuh.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { galleryCells, type NawasenaModel } from './model';
import { NAWASENA_PHOTOS } from './photos';
import { C, SECTION_PAD, TYPE_N } from './styles';
import { ButtonLink, SectionHead } from './ui';

export function Gallery({ m }: { m: NawasenaModel }) {
  const { gallery } = m;
  const items = m.items('gallery');
  const cells = galleryCells(items.length);
  const action = m.linkOr(text(gallery, 'button_url'), null);
  const label = text(gallery, 'button_label');
  const button = action && label ? <ButtonLink action={action} label={label} variant="outline" /> : undefined;
  return (
    <TemplateSection sectionKey="gallery" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(gallery, 'eyebrow')} number={m.number('gallery')} title={text(gallery, 'title') || 'Galeri'} aside={button} />
        <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-6 @3xl:mt-14 @5xl:auto-rows-[200px] @5xl:grid-cols-12 @5xl:gap-4">
          {items.map((item, i) => {
            const image = field(item, 'image');
            const caption = field(item, 'caption');
            const cell = cells[i];
            return (
              <Reveal as="li" key={`${image}-${i}`} delay={stagger(i, 70)} className={`min-w-0 ${cell.className}`}>
                <figure className="group flex h-full flex-col">
                  <KitPhoto
                    src={image}
                    alt={NAWASENA_PHOTOS.alt(image, caption || `Kegiatan di ${m.companyName}`)}
                    sizes={cell.sizes}
                    zoom
                    className={`${cell.wide ? 'aspect-[4/3]' : 'aspect-square'} rounded-[8px] @5xl:aspect-auto @5xl:min-h-0 @5xl:flex-1`}
                    imgClassName="transition-[scale] duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  {/* Tinggi tetap 2 baris: foto bersebelahan tetap sama tinggi walau panjang keterangan berbeda */}
                  {caption && <figcaption className={`mt-2.5 line-clamp-2 min-h-[3em] text-pretty leading-[1.5] ${TYPE_N.mono} ${C.muted}`}>{caption}</figcaption>}
                </figure>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
