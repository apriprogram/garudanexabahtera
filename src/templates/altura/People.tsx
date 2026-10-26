// Orang & pengakuan Altura: `leadership` (judul terpusat, kartu potret radius 28 dengan kartu nama kaca di bawah dan
// bulatan LinkedIn; kartu tengah sedikit turun; HP: rel geser snap), `awards` (pita krem membulat: judul terpusat + deret
// pil penghargaan fiktif yang berjalan pelan, dua baris bila ≥ 6), dan `testimonials` (daftar kutipan bergaris tipis di
// kiri, foto tinggi lengket di kanan dengan kartu nilai kaca + inisial pemberi testimoni).
import { Linkedin, Quote, Star, Trophy } from 'lucide-react';
import { Marquee, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, safeUrl, text } from '../shared/utils';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import type { AlturaModel } from './model';
import { ALTURA_PHOTOS } from './photos';
import { C, DISPLAY, OUTER, SECTION_PAD } from './styles';
import { SectionHead } from './ui';

export function Leadership({ m }: { m: AlturaModel }) {
  const { leadership } = m;
  const items = m.items('leadership');
  const cols = items.length >= 4 ? '@5xl:grid-cols-4' : items.length === 2 ? '@3xl:grid-cols-2 @3xl:max-w-[820px]' : '@3xl:grid-cols-3';
  return (
    <TemplateSection sectionKey="leadership" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead layout="center" eyebrow={text(leadership, 'eyebrow')} title={text(leadership, 'title')} subtitle={text(leadership, 'subtitle')} />
        <Reveal className="mt-12 @5xl:mt-16">
          <ul
            className={`al-rail -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1 @2xl:-mx-8 @2xl:px-8 @3xl:mx-auto @3xl:grid @3xl:max-w-[1240px] @3xl:gap-5 @3xl:overflow-visible @3xl:px-0 @3xl:pb-12 ${cols}`}
          >
            {items.map((item, i) => {
              const name = field(item, 'name');
              const photo = field(item, 'photo');
              const linkedin = safeUrl(field(item, 'linkedin'));
              const lower = items.length === 3 && i === 1;
              return (
                <li key={`${name}-${i}`} className={`w-[76%] shrink-0 snap-start @xl:w-[44%] @3xl:w-auto ${lower ? '@3xl:translate-y-12' : ''}`}>
                  <figure className="relative">
                    {hasImage(photo) ? (
                      <KitPhoto src={photo} alt={ALTURA_PHOTOS.alt(photo, name)} sizes="(min-width: 768px) 30vw, 76vw" position="50% 25%" className="aspect-[4/5] rounded-[28px]" />
                    ) : (
                      <div className="flex aspect-[4/5] items-center justify-center rounded-[28px] bg-[#F2EFE7]">
                        <KitAvatar name={name} photo="" className="h-24 w-24 !text-[28px]" />
                      </div>
                    )}
                    <figcaption className="absolute inset-x-3 bottom-3 rounded-[20px] bg-white/90 px-4 py-3.5 ring-1 ring-black/[0.06] backdrop-blur-md @5xl:inset-x-4 @5xl:bottom-4 @5xl:px-5">
                      <h3 className={`${C.ink} ${DISPLAY} text-[17px] font-semibold leading-snug tracking-[-0.02em] @5xl:text-[19px]`}>{name}</h3>
                      {field(item, 'role') && <p className={`mt-0.5 text-[13.5px] leading-snug ${C.muted}`}>{field(item, 'role')}</p>}
                    </figcaption>
                    {linkedin && (
                      <ActionLink
                        action={{ kind: 'external', href: linkedin }}
                        aria-label={`${name} on LinkedIn`}
                        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent) transition-colors hover:bg-(--tpl-accent-hover) @5xl:right-4 @5xl:top-4"
                      >
                        <Linkedin aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      </ActionLink>
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

function AwardPill({ title, issuer }: { title: string; issuer: string }) {
  return (
    <span className="inline-flex min-h-[60px] max-w-[340px] items-center gap-3 rounded-[30px] bg-white py-2 pl-2 pr-6 ring-1 ring-inset ring-[#141612]/[0.08]">
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
        <Trophy className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={`text-[15px] font-semibold ${C.ink}`}>{title}</span>
        {issuer && <span className={`text-[13px] ${C.muted}`}>{issuer}</span>}
      </span>
    </span>
  );
}

export function Awards({ m }: { m: AlturaModel }) {
  const { awards } = m;
  const items = m.items('awards');
  const rows = items.length >= 6 ? [items.slice(0, Math.ceil(items.length / 2)), items.slice(Math.ceil(items.length / 2))] : [items];
  const label = text(awards, 'title') || 'Awards';
  return (
    <TemplateSection sectionKey="awards" className="py-1.5 @5xl:py-2">
      <div className={OUTER}>
        <div className="rounded-[24px] bg-[#F2EFE7] py-16 @3xl:rounded-[28px] @5xl:py-24">
          <div className={CONTAINER}>
            <SectionHead layout="center" eyebrow={text(awards, 'eyebrow')} title={text(awards, 'title')} subtitle={text(awards, 'subtitle')} />
          </div>
          <div className="mt-10 grid gap-3 @5xl:mt-14">
            {rows.map((row, r) => (
              <Marquee
                key={r}
                label={rows.length > 1 ? `${label} (${r + 1}/${rows.length})` : label}
                duration={r === 0 ? 52 : 64}
                gap={12}
                staticClassName={`${CONTAINER} flex flex-wrap items-center justify-center gap-3`}
              >
                {row.map((item, i) => (
                  <AwardPill key={`${field(item, 'title')}-${i}`} title={field(item, 'title')} issuer={field(item, 'issuer')} />
                ))}
              </Marquee>
            ))}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

export function Testimonials({ m }: { m: AlturaModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');
  const image = text(testimonials, 'image');
  const ratingValue = text(testimonials, 'rating_value');
  const ratingLabel = text(testimonials, 'rating_label');
  const withImage = hasImage(image);
  return (
    <TemplateSection sectionKey="testimonials" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead layout="center" eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title')} />
        <div className="mt-12 grid items-start gap-10 @5xl:mt-16 @5xl:grid-cols-12 @5xl:gap-14 @7xl:gap-20">
          <ul className={`divide-y divide-[#141612]/[0.1] border-y border-[#141612]/[0.1] ${withImage ? '@5xl:col-span-7' : '@5xl:col-span-8 @5xl:col-start-3'}`}>
            {items.map((item, i) => (
              <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i, 70)} className="py-7 @3xl:py-9">
                <figure>
                  <Quote aria-hidden className="h-6 w-6 text-(--al-ink)" strokeWidth={1.6} />
                  <blockquote className={`mt-3 text-pretty ${DISPLAY} text-[18px] font-medium leading-[1.5] tracking-[-0.015em] @3xl:text-[21px] ${C.ink}`}>
                    “{field(item, 'quote')}”
                  </blockquote>
                  {(field(item, 'name') || field(item, 'role')) && (
                    <figcaption className="mt-5 flex items-center gap-3">
                      <KitAvatar name={field(item, 'name') || '?'} photo={field(item, 'photo')} className="h-11 w-11" />
                      <span className="min-w-0">
                        {field(item, 'name') && <span className={`block text-[15px] font-semibold ${C.ink}`}>{field(item, 'name')}</span>}
                        {field(item, 'role') && <span className={`block text-[13.5px] ${C.muted}`}>{field(item, 'role')}</span>}
                      </span>
                    </figcaption>
                  )}
                </figure>
              </Reveal>
            ))}
          </ul>
          {withImage && (
            <Reveal variant="fade" className="@5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+112px)] @5xl:col-span-5">
              <KitPhoto src={image} alt={ALTURA_PHOTOS.alt(image, text(testimonials, 'title'))} sizes="(min-width: 1024px) 36vw, 92vw" className="aspect-[4/5] rounded-[28px]">
                {(ratingValue || ratingLabel) && (
                  <div className="absolute inset-x-4 bottom-4 flex items-center gap-4 rounded-[20px] bg-white/90 p-4 ring-1 ring-black/[0.06] backdrop-blur-md @5xl:inset-x-5 @5xl:bottom-5">
                    {ratingValue && (
                      <p className={`${DISPLAY} flex items-center gap-1.5 text-[34px] font-semibold leading-none tracking-[-0.04em] ${C.ink}`}>
                        {ratingValue}
                        <Star aria-hidden className="h-5 w-5 fill-(--tpl-accent) text-[#141612]" strokeWidth={1.5} />
                      </p>
                    )}
                    <div className="min-w-0">
                      {ratingLabel && <p className={`text-[14px] font-semibold leading-snug ${C.ink}`}>{ratingLabel}</p>}
                      <div aria-hidden className="mt-1.5 flex -space-x-2">
                        {items.slice(0, 4).map((item, i) => (
                          <KitAvatar key={i} name={field(item, 'name') || '?'} photo={field(item, 'photo')} className="h-7 w-7 !text-[10px] ring-2 ring-white" sizes="28px" />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </KitPhoto>
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

