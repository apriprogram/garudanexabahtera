// Galeri (bento: satu foto besar + foto kecil, keterangan di atas gradasi), testimoni (kartu abu pejal tanpa garis)
// dan strip mitra & sponsor (Marquee) — brief §1.4 #8–#10.
import { Quote, Star } from 'lucide-react';
import { Marquee, Reveal } from '../shared/Animated';
import { ClientLogo } from '../shared/clients';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { clientItems } from '../shared/model';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import type { ArenaModel } from './model';
import { ARENA_PHOTOS } from './photos';
import { C, CARD, TYPE_A } from './styles';
import { SectionPill } from './ui';

function CenterHead({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  if (!eyebrow && !title && !subtitle) return null;
  return (
    <Reveal className="mx-auto flex max-w-[760px] flex-col items-center text-center">
      <SectionPill>{eyebrow}</SectionPill>
      {title && <h2 className={`${eyebrow ? 'mt-5' : ''} text-balance ${TYPE_A.h2} ${C.ink}`}>{title}</h2>}
      {subtitle && <p className={`mt-4 max-w-[56ch] ${TYPE_A.lead} ${C.muted}`}>{subtitle}</p>}
    </Reveal>
  );
}

// ─── Galeri ───────────────────────────────────────────────────────────────────

export function Gallery({ m }: { m: ArenaModel }) {
  const { gallery } = m;
  const items = list(gallery, 'items', 12).filter((item) => hasImage(field(item, 'image')) || field(item, 'caption'));
  const title = text(gallery, 'title');
  if (!title && items.length === 0) return null;

  return (
    <TemplateSection sectionKey="gallery" className={`${SECTION_Y} ${C.surface}`}>
      <div className={CONTAINER}>
        <CenterHead eyebrow={text(gallery, 'eyebrow')} title={title} subtitle={text(gallery, 'subtitle')} />
        {items.length > 0 && (
          <ul className="mt-10 grid auto-rows-[150px] grid-cols-2 gap-3 @xl:auto-rows-[200px] @3xl:mt-14 @3xl:grid-cols-4 @3xl:gap-4 @6xl:auto-rows-[240px]">
            {items.map((item, i) => {
              const image = field(item, 'image');
              const caption = field(item, 'caption');
              const big = i === 0 && items.length > 1;
              return (
                <Reveal
                  as="li"
                  key={i}
                  delay={stagger(i)}
                  className={`${big ? 'col-span-2 row-span-2' : items.length === 1 ? 'col-span-2 row-span-2 @3xl:col-span-4' : ''}`}
                >
                  <figure className="group relative h-full w-full overflow-hidden rounded-[20px] @3xl:rounded-[28px]">
                    <KitPhoto
                      src={image}
                      alt={ARENA_PHOTOS.alt(image, caption)}
                      zoom
                      sizes={big ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw'}
                      imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                      className="absolute inset-0"
                    />
                    {caption && hasImage(image) && (
                      <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[#0E1B2E]/80 to-transparent px-4 pb-3.5 pt-10 text-[13px] font-medium text-white @3xl:px-5 @3xl:pb-4 @3xl:text-[14px]">
                        {caption}
                      </figcaption>
                    )}
                  </figure>
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}

// ─── Testimoni ────────────────────────────────────────────────────────────────

export function Testimonials({ m }: { m: ArenaModel }) {
  const { testimonials } = m;
  const items = list(testimonials, 'items', 9).filter((item) => field(item, 'quote'));
  const title = text(testimonials, 'title');
  if (!title && items.length === 0) return null;
  const cols = items.length >= 3 ? '@5xl:grid-cols-3' : items.length === 2 ? '@3xl:grid-cols-2' : '';

  return (
    <TemplateSection sectionKey="testimonials" className={SECTION_Y}>
      <div className={CONTAINER}>
        <CenterHead eyebrow={text(testimonials, 'eyebrow')} title={title} />
        {items.length > 0 && (
          <ul className={`mt-10 grid gap-4 @3xl:mt-14 @3xl:gap-5 ${cols}`}>
            {items.map((item, i) => {
              const name = field(item, 'name');
              const role = field(item, 'role');
              return (
                <Reveal as="li" key={i} delay={stagger(i)} className={`flex flex-col p-6 @3xl:p-8 ${CARD.radius} ${C.surface}`}>
                  <figure className="flex h-full flex-col">
                    <div className="flex items-center justify-between">
                      <span className="flex gap-0.5 text-(--tpl-accent)" aria-hidden>
                        {Array.from({ length: 5 }, (_, s) => (
                          <Star key={s} className="h-4 w-4 fill-current" strokeWidth={1.5} />
                        ))}
                      </span>
                      <Quote className="h-6 w-6 text-[#0B1220]/15" aria-hidden />
                    </div>
                    <blockquote className={`mt-5 flex-1 text-[16px] leading-relaxed @3xl:text-[17px] ${C.ink}`}>
                      <p>“{field(item, 'quote')}”</p>
                    </blockquote>
                    {(name || role) && (
                      <figcaption className="mt-7 flex items-center gap-3">
                        <KitAvatar name={name} photo={field(item, 'photo')} sizes="44px" className="h-11 w-11" />
                        <span className="min-w-0">
                          {name && <span className={`block text-[15px] font-medium ${C.ink}`}>{name}</span>}
                          {role && <span className={`block text-[13px] leading-snug ${C.muted}`}>{role}</span>}
                        </span>
                      </figcaption>
                    )}
                  </figure>
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}

// ─── Mitra & sponsor ──────────────────────────────────────────────────────────

export function Sponsors({ m }: { m: ArenaModel }) {
  const items = clientItems(m.clients);
  const title = text(m.clients, 'title');
  if (items.length === 0) return null;
  return (
    <TemplateSection sectionKey="clients" className="pb-16 @3xl:pb-24">
      <div className={CONTAINER}>
        <div className="border-t border-[#0B1220]/[0.08] pt-10 @3xl:pt-12">
          {title && <p className={`text-center text-[14px] ${C.muted}`}>{title}</p>}
          <Marquee label={title || 'Mitra & sponsor'} duration={40} gap={64} className={title ? 'mt-7' : ''} staticClassName="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {items.map((client, i) => (
              <ClientLogo key={i} name={client.name} logo={client.logo} className="h-7 @3xl:h-8" />
            ))}
          </Marquee>
        </div>
      </div>
    </TemplateSection>
  );
}
