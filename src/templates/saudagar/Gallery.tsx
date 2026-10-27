// Galeri (kunci `gallery`, latar kertas): deretan foto tegak berbingkai lengkung seperti tiang-tiang los pasar. Layar
// lebar 3 kolom dengan kolom tengah turun 64px; tablet 2 kolom; HP rel geser (78% lebar, snap) di dalam tepi halaman
// sehingga halaman tidak ikut bergeser. Keterangan serif miring + lokasi kecil. Foto tanpa gambar dilewati.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { SaudagarModel } from './model';
import { SAUDAGAR_PHOTOS } from './photos';
import { ARCH, C, PHOTO_HOVER, SECTION_PAD, SERIF } from './styles';
import { SectionHead } from './ui';

export function Gallery({ m }: { m: SaudagarModel }) {
  const { gallery } = m;
  const items = m.items('gallery');
  if (items.length === 0) return null;

  return (
    <TemplateSection sectionKey="gallery" className={`bg-[#F7F2E8] ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(gallery, 'eyebrow')} title={text(gallery, 'title') || 'Galeri'} />
        {/* Satu <Reveal> untuk seluruh rel (bukan per foto): foto di luar layar rel HP tetap terlihat saat digeser */}
        <Reveal variant="fade" className="mt-10 @3xl:mt-14">
          <ul
            aria-label={text(gallery, 'title') || 'Galeri'}
            className="sg-rail -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @3xl:mx-0 @3xl:grid @3xl:grid-cols-2 @3xl:gap-x-6 @3xl:gap-y-12 @3xl:overflow-visible @3xl:px-0 @3xl:pb-0 @5xl:grid-cols-3 @5xl:[&>li:nth-child(3n+2)]:mt-16 @6xl:gap-x-8"
          >
            {items.map((item, i) => {
              const image = field(item, 'image');
              const caption = field(item, 'caption');
              const place = field(item, 'place');
              return (
                <li key={`${image}-${i}`} className="w-[78%] shrink-0 snap-start @3xl:w-auto">
                  <figure className="group">
                    <KitPhoto
                      src={image}
                      alt={SAUDAGAR_PHOTOS.alt(image, caption || `Foto kegiatan ${m.companyName}`)}
                      zoom
                      sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 80vw"
                      imgClassName={PHOTO_HOVER}
                      className={`aspect-[4/5] ${ARCH}`}
                    />
                    {(caption || place) && (
                      <figcaption className="mt-4">
                        {caption && <p className={`${SERIF} text-[18px] italic leading-snug ${C.ink}`}>{caption}</p>}
                        {place && <p className={`mt-0.5 text-[13px] leading-snug ${C.muted}`}>{place}</p>}
                      </figcaption>
                    )}
                  </figure>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
