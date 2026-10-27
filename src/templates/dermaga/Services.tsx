// Layanan (kunci `services`): kepala section (H2 kolom 1-7, deskripsi kolom 9-12), lalu kartu bergaris tipis radius 4px
// tanpa latar: foto 3:2 opsional rata atas (sudut persegi, zoom saat muncul, membesar pelan saat disorot), nomor mono
// warna tema + ikon otomatis, H3, deskripsi, dan baris label mono di atas garis tipis. Tinggi kartu sama per baris.
// 3 kolom layar lebar, 2 di tablet, 1 di HP. Disorot → garis kartu berwarna tema (tanpa angkat/geser).
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { pad2, splitTags, type DermagaModel } from './model';
import { DERMAGA_PHOTOS } from './photos';
import { C, CARD, SECTION_PAD, TYPE_D } from './styles';
import { SectionHead, ServiceIcon } from './ui';

export function Services({ m }: { m: DermagaModel }) {
  const { services } = m;
  const items = m.items('services');
  return (
    <TemplateSection sectionKey="services" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead
          eyebrow={text(services, 'eyebrow')}
          number={m.number('services')}
          title={text(services, 'title')}
          subtitle={text(services, 'subtitle')}
          srTitle={text(services, 'eyebrow') || 'Layanan'}
        />
        <ul className="mt-10 grid gap-5 @3xl:mt-14 @3xl:grid-cols-2 @5xl:grid-cols-3 @5xl:gap-6">
          {items.map((item, i) => {
            const title = field(item, 'title');
            const image = field(item, 'image');
            const tags = splitTags(field(item, 'tags'));
            return (
              <Reveal as="li" key={`${title}-${i}`} delay={stagger(i)} className="min-w-0">
                <article className={`group flex h-full flex-col overflow-hidden ${CARD}`}>
                  <KitPhoto
                    src={image}
                    alt={DERMAGA_PHOTOS.alt(image, title)}
                    fallback="none"
                    zoom
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="aspect-[3/2]"
                    imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="flex flex-1 flex-col p-6 @5xl:p-7">
                    <div className="flex items-center justify-between gap-4">
                      <span aria-hidden className="font-mono text-[13px] font-medium tabular-nums tracking-[0.04em] text-(--tpl-accent-ink)">
                        {pad2(i + 1)}
                      </span>
                      <span className={C.ink}>
                        <ServiceIcon title={title} />
                      </span>
                    </div>
                    <h3 className={`mt-5 ${TYPE_D.h3} ${C.ink}`}>{title}</h3>
                    {field(item, 'description') && <p className={`mt-3 max-w-[48ch] ${TYPE_D.body} ${C.muted}`}>{field(item, 'description')}</p>}
                    {tags.length > 0 && (
                      <div className="mt-auto pt-6">
                        <ul aria-label={`Ringkasan ${title}`} className={`flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-4 ${C.line}`}>
                          {tags.map((tag, j) => (
                            <li key={`${tag}-${j}`} className={`font-mono text-[12px] font-medium uppercase tracking-[0.06em] ${C.muted}`}>
                              {tag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
