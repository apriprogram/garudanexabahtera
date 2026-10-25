// Fasilitas (kunci `facilities`): kepala section, lalu satu foto besar membulat dengan chip keterangan (kiri, lengket di
// layar lebar) dan daftar fasilitas berikon dua kolom bergaris tipis (kanan). Ikon dipilih otomatis dari nama.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { MadaniModel } from './model';
import { MADANI_PHOTOS } from './photos';
import { C, SECTION_PAD } from './styles';
import { Chip, IconBadge, SectionHead } from './ui';

export function Facilities({ m }: { m: MadaniModel }) {
  const { facilities: f } = m;
  const items = list(f, 'items', 10).filter((item) => field(item, 'title'));
  const image = text(f, 'image');
  const caption = text(f, 'image_caption');
  if (items.length === 0 && !hasImage(image)) return null;
  const photo = hasImage(image);

  return (
    <TemplateSection sectionKey="facilities" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(f, 'eyebrow')} title={text(f, 'title')} subtitle={text(f, 'subtitle')} />
        <div className="mt-10 grid gap-8 @3xl:mt-12 @5xl:grid-cols-12 @5xl:gap-12">
          {photo && (
            <Reveal variant="fade" className="min-w-0 @5xl:col-span-5">
              <div className="@5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+96px)]">
                <KitPhoto
                  src={image}
                  alt={MADANI_PHOTOS.alt(image, caption || `Fasilitas ${m.companyName}`)}
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  zoom
                  className="aspect-[4/3] rounded-[24px]"
                >
                  {caption && (
                    <span className="absolute bottom-4 left-4 max-w-[calc(100%-32px)]">
                      <Chip tone="glass">{caption}</Chip>
                    </span>
                  )}
                </KitPhoto>
              </div>
            </Reveal>
          )}
          {items.length > 0 && (
            <ul className={`grid min-w-0 gap-x-8 @2xl:grid-cols-2 ${photo ? '@5xl:col-span-7' : '@5xl:col-span-12 @5xl:grid-cols-3'}`}>
              {items.map((item, i) => (
                <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 50)} className="flex gap-4 border-b border-black/[0.08] py-5">
                  <IconBadge title={field(item, 'title')} index={i} />
                  <span className="min-w-0">
                    <h3 className="text-[16px] font-semibold leading-snug text-(--md-deep)">{field(item, 'title')}</h3>
                    {field(item, 'text') && <span className={`mt-1 block text-[14px] leading-relaxed ${C.muted}`}>{field(item, 'text')}</span>}
                  </span>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
