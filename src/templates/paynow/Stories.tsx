// Cerita merchant (kunci `testimonials`): section putih. Label + H2, lalu kartu putih radius 24 bergaris ring: foto
// usaha 3:2 radius 16 di dalam kartu (membesar pelan saat masuk layar & disorot; opsional), kutipan Figtree, lalu foto
// bulat 44px (atau inisial bergradasi) + nama + usaha & kota. 3 kolom di layar lebar, 2 di tablet (kartu ganjil
// terakhir melebar), 1 di HP. Nama di demo fiktif dan tidak berhubungan dengan orang di foto.
import { Quote } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, initials, text } from '../shared/utils';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import type { PaynowModel } from './model';
import { PAYNOW_PHOTOS } from './photos';
import { C, CARD, SECTION_PAD, TYPE } from './styles';
import { SectionHead } from './ui';

export function Stories({ m }: { m: PaynowModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');
  return (
    <TemplateSection sectionKey="testimonials" className={`${SECTION_PAD} bg-white`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title')} srTitle={text(testimonials, 'eyebrow') || 'Cerita merchant'} />
        <ul className="mt-10 grid gap-5 @3xl:mt-14 @3xl:grid-cols-2 @6xl:grid-cols-3 @6xl:gap-6">
          {items.map((item, i) => {
            const name = field(item, 'name');
            const role = field(item, 'role');
            const image = field(item, 'image');
            const photo = field(item, 'photo');
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i)} className="min-w-0 @3xl:last:odd:col-span-2 @6xl:last:odd:col-span-1">
                <figure className={`group flex h-full flex-col p-3 ${CARD}`}>
                  {hasImage(image) && (
                    <KitPhoto
                      src={image}
                      alt={PAYNOW_PHOTOS.alt(image, `Usaha ${name || 'merchant'}`)}
                      zoom
                      fallback="none"
                      sizes="(min-width: 1152px) 30vw, (min-width: 768px) 46vw, 100vw"
                      className="aspect-[3/2] rounded-[16px]"
                      imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                    />
                  )}
                  <div className="flex flex-1 flex-col px-3 pb-3 pt-6">
                    <Quote aria-hidden className="h-6 w-6 text-(--pn-ink)" strokeWidth={2} />
                    <blockquote className={`mb-7 mt-3 text-pretty ${TYPE.quote} ${C.ink}`}>
                      <p>{field(item, 'quote')}</p>
                    </blockquote>
                    {(name || role) && (
                      <figcaption className={`mt-auto flex items-center gap-3 border-t pt-5 ${C.line}`}>
                        {hasImage(photo) ? (
                          <KitAvatar name={name} photo={photo} className="h-11 w-11" sizes="44px" />
                        ) : (
                          <span aria-hidden className="pn-grad flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-white">
                            {initials(name, '?')}
                          </span>
                        )}
                        <span className="min-w-0">
                          {name && <span className={`block text-[15px] font-semibold leading-snug ${C.ink}`}>{name}</span>}
                          {role && <span className={`block text-[13.5px] leading-snug ${C.muted}`}>{role}</span>}
                        </span>
                      </figcaption>
                    )}
                  </div>
                </figure>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
