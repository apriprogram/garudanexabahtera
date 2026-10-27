// Fasilitas (kunci `facilities`), pita abu kertas: kepala section lalu bento 12 kolom (baris 220px di layar lebar).
// Fasilitas BERFOTO menjadi ubin foto radius 8 dengan keterangan putih di atas gradasi navy bawah: navy 90% di dasar,
// tetap ≥ 80% sampai 65% tinggi keterangan (nama 22px & keterangan ada di zona itu: ≥ 8:1 bahkan di atas piksel foto
// putih), lalu memudar ke transparan di 64px teratas;
// fasilitas TANPA foto menjadi kartu teks putih (nomor mono, nama serif, keterangan) di baris berikutnya. Foto membesar
// pelan saat disorot. HP: ubin foto 4:3 selebar penuh, kartu teks satu kolom.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { facilityCells, type NawasenaModel } from './model';
import { NAWASENA_PHOTOS } from './photos';
import { C, CARD, DISPLAY, SECTION_PAD, TYPE_N } from './styles';
import { SectionHead } from './ui';

export function Facilities({ m }: { m: NawasenaModel }) {
  const { facilities } = m;
  const items = m.items('facilities');
  const photos = items.filter((item) => hasImage(field(item, 'image')));
  const texts = items.filter((item) => !hasImage(field(item, 'image')));
  const cells = facilityCells(photos.length, texts.length);
  // Baris foto setinggi 220px; kartu teks di baris berikutnya setinggi isinya (> 3 foto: semua baris 220px)
  const rows = photos.length > 3 ? '@5xl:auto-rows-[220px]' : photos.length > 0 ? '@5xl:grid-rows-[220px_220px] @5xl:auto-rows-auto' : '';
  return (
    <TemplateSection sectionKey="facilities" className={`${C.surface} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(facilities, 'eyebrow')} number={m.number('facilities')} title={text(facilities, 'title') || 'Fasilitas'} subtitle={text(facilities, 'subtitle')} />
        <ul className={`mt-10 grid gap-3 @3xl:mt-14 @5xl:grid-cols-12 @5xl:gap-4 ${rows}`}>
          {photos.map((item, i) => {
            const image = field(item, 'image');
            const name = field(item, 'name');
            const caption = field(item, 'caption');
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 80)} className={`min-w-0 ${cells.photos[i].className}`}>
                <figure className="group relative isolate h-full overflow-hidden rounded-[8px]">
                  <KitPhoto
                    src={image}
                    alt={NAWASENA_PHOTOS.alt(image, `${name} di ${m.companyName}`)}
                    sizes={cells.photos[i].sizes}
                    zoom
                    className="aspect-[4/3] @5xl:absolute @5xl:inset-0 @5xl:aspect-auto"
                    imgClassName="transition-[scale] duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  <figcaption
                    data-tpl-tone="inverse"
                    className="absolute inset-x-0 bottom-0 bg-linear-to-t from-(--nw-navy)/90 via-(--nw-navy)/80 via-65% to-transparent px-5 pb-5 pt-16 text-white @3xl:px-6 @3xl:pb-6"
                  >
                    <h3 className={`text-[22px] leading-tight ${DISPLAY} font-normal`}>{name}</h3>
                    {caption && <span className="mt-1 block max-w-[48ch] text-pretty text-[14px] leading-snug text-white/90">{caption}</span>}
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
          {texts.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i, 80)} className={`min-w-0 ${cells.texts[i].className}`}>
              <div className={`flex h-full flex-col p-6 @3xl:p-7 ${CARD.white}`}>
                <span aria-hidden className={`${TYPE_N.mono} text-(--nw-ink)`}>
                  {String(photos.length + i + 1).padStart(2, '0')}
                </span>
                <h3 className={`mt-3 text-[22px] leading-tight ${C.navy} ${DISPLAY} font-normal`}>{field(item, 'name')}</h3>
                {field(item, 'caption') && <p className={`mt-2 max-w-[44ch] text-[14.5px] leading-relaxed ${C.body}`}>{field(item, 'caption')}</p>}
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </TemplateSection>
  );
}
