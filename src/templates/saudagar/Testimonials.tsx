// Testimoni pembeli (kunci `testimonials`, latar putih). Layar lebar: kiri 4 kolom label + H2 (menempel saat digulir);
// kanan 8 kolom kutipan serif besar bergaris rambut dengan tanda kutip menggantung berwarna tinta tema, lalu foto bulat
// 48px (atau lingkaran kraft berinisial bila tanpa foto), nama, dan jabatan. HP: bertumpuk, kutipan 21px.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitAvatar } from '../kit/Photo';
import type { SaudagarModel } from './model';
import { C, SECTION_PAD, TYPE_S } from './styles';
import { Initials, SectionHead } from './ui';

export function Testimonials({ m }: { m: SaudagarModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');
  if (items.length === 0) return null;

  return (
    <TemplateSection sectionKey="testimonials" className={`bg-white ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-8 @7xl:gap-12`}>
        <div className="min-w-0 @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+40px)] @5xl:col-span-4 @5xl:self-start">
          <SectionHead eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title') || 'Testimoni pembeli'} />
        </div>
        <ul className={`min-w-0 divide-y border-y @5xl:col-span-8 ${C.line} ${C.divide}`}>
          {items.map((item, i) => {
            const name = field(item, 'name');
            const role = field(item, 'role');
            const photo = field(item, 'photo');
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i)} className="py-9 @3xl:py-11">
                <figure>
                  {/* Tanda kutip menggantung ke celah kolom hanya @5xl (daftar 8 kolom); di bawahnya daftar selebar penuh,
                      jadi tanda kutip tetap di dalam (pl-5) agar tidak menempel ke tepi layar */}
                  <blockquote className={`relative max-w-[34ch] pl-5 text-pretty @5xl:pl-0 ${TYPE_S.quote} ${C.ink}`}>
                    <span aria-hidden className="absolute -left-0.5 -top-[0.08em] text-[1.6em] leading-none text-(--sg-ink) @5xl:-left-[0.62em]">
                      “
                    </span>
                    {field(item, 'quote')}
                  </blockquote>
                  {(name || role) && (
                    <figcaption className="mt-6 flex items-center gap-4 pl-5 @5xl:pl-0">
                      {hasImage(photo) ? <KitAvatar name={name} photo={photo} className="h-12 w-12" sizes="48px" /> : <Initials name={name} />}
                      <span className="min-w-0">
                        {name && <span className={`block text-[15px] font-semibold ${C.ink}`}>{name}</span>}
                        {role && <span className={`block text-[13.5px] leading-snug ${C.muted}`}>{role}</span>}
                      </span>
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
