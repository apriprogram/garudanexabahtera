// Testimoni orang tua & alumni (kunci `testimonials`) + galeri (`gallery`).
// Testimoni: kiri label bernomor + judul + deskripsi + angka sorotan besar; kanan kartu kutipan pasir (referensi
// Lifestyle "kutipan tokoh"): kutipan pertama lebar dan berhuruf besar, lainnya berdampingan; foto bulat, nama, keterangan.
// Galeri: kisi bento — foto pertama besar 2×2, empat berikutnya persegi; keterangan <figcaption> di atas foto, foto
// membesar pelan saat disorot; tombol ke galeri lengkap (mis. Instagram).
import { Quote } from 'lucide-react';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, safeUrl, text } from '../shared/utils';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import type { BestariModel } from './model';
import { BESTARI_PHOTOS } from './photos';
import { C, DISPLAY, SECTION_PAD, TYPE_B } from './styles';
import { PillLink, SectionHead, SectionLabel } from './ui';

export function Testimonials({ m }: { m: BestariModel }) {
  const { testimonials } = m;
  const items = list(testimonials, 'items', 6).filter((item) => field(item, 'quote'));
  if (items.length === 0) return null;
  const title = text(testimonials, 'title');
  const subtitle = text(testimonials, 'subtitle');
  const statValue = text(testimonials, 'stat_value');
  const statLabel = text(testimonials, 'stat_label');

  return (
    <TemplateSection sectionKey="testimonials" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <Reveal variant="fade">
          <SectionLabel label={text(testimonials, 'eyebrow')} number={m.number('testimonials')} />
        </Reveal>
        <div className="mt-8 grid gap-10 @3xl:mt-10 @5xl:grid-cols-12 @5xl:gap-12">
          <div className="min-w-0 @5xl:col-span-4">
            {title && (
              <Reveal as="h2" delay={80} className={`max-w-[16ch] text-balance ${TYPE_B.h2} ${C.ink}`}>
                {title}
              </Reveal>
            )}
            {subtitle && (
              <Reveal as="p" delay={140} className={`mt-4 max-w-[40ch] ${TYPE_B.body} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
            {(statValue || statLabel) && (
              <Reveal delay={200} className="mt-10 border-t border-[#1C1917]/[0.12] pt-6">
                {statValue && (
                  <p className={`${DISPLAY} text-[52px] font-medium leading-none tracking-[-0.04em] text-(--bs-ink) @3xl:text-[64px]`}>
                    <CountUp value={statValue} />
                  </p>
                )}
                {statLabel && <p className={`mt-3 max-w-[30ch] ${TYPE_B.small} ${C.muted}`}>{statLabel}</p>}
              </Reveal>
            )}
          </div>
          <ul className="grid gap-3 @3xl:grid-cols-2 @3xl:gap-4 @5xl:col-span-8">
            {items.map((item, i) => {
              const name = field(item, 'name');
              const role = field(item, 'role');
              const lead = i === 0;
              return (
                <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 80)} className={lead ? '@3xl:col-span-2' : ''}>
                  <figure className={`flex h-full flex-col rounded-[24px] p-6 @3xl:p-7 ${lead ? 'bg-(--bs-soft) ring-1 ring-inset ring-(--bs-line)' : 'bg-[#F5F2ED]'}`}>
                    <Quote aria-hidden className="h-7 w-7 fill-(--bs-tint) text-(--bs-ink)" strokeWidth={1.3} />
                    <blockquote className={`mt-4 text-pretty ${C.ink} ${lead ? `${DISPLAY} text-[20px] leading-snug tracking-[-0.015em] @3xl:text-[25px]` : TYPE_B.body}`}>
                      <p>“{field(item, 'quote')}”</p>
                    </blockquote>
                    <div aria-hidden className="min-h-6 flex-1" />
                    <figcaption className="flex items-center gap-3.5 border-t border-[#1C1917]/[0.1] pt-5">
                      <KitAvatar name={name} photo={field(item, 'photo')} sizes="48px" className="h-12 w-12" />
                      <span className="min-w-0">
                        {name && <span className={`block ${DISPLAY} text-[16px] font-medium leading-snug ${C.ink}`}>{name}</span>}
                        {role && <span className={`block text-[13px] ${C.muted}`}>{role}</span>}
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </div>
    </TemplateSection>
  );
}

/** Kisi bento (4 kolom di layar lebar): foto pertama 2×2, sisanya 1×1. */
export function Gallery({ m }: { m: BestariModel }) {
  const { gallery } = m;
  const items = list(gallery, 'items', 8).filter((item) => hasImage(field(item, 'image')));
  if (items.length === 0) return null;
  const buttonLabel = text(gallery, 'button_label');
  const buttonUrl = safeUrl(text(gallery, 'button_url'));
  const button = buttonLabel && buttonUrl && <PillLink action={{ kind: 'external', href: buttonUrl }} label={buttonLabel} variant="outline" />;

  return (
    <TemplateSection sectionKey="gallery" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(gallery, 'eyebrow')} number={m.number('gallery')} title={text(gallery, 'title')} aside={button || undefined} />
        <ul className="mt-10 grid grid-cols-2 gap-3 @3xl:mt-12 @3xl:auto-rows-[210px] @3xl:grid-cols-4 @3xl:gap-4 @6xl:auto-rows-[250px]">
          {items.map((item, i) => {
            const caption = field(item, 'caption');
            const big = i === 0;
            return (
              <Reveal as="li" key={`${field(item, 'image')}-${i}`} delay={stagger(i, 60)} className={big ? 'col-span-2 @3xl:row-span-2' : ''}>
                <figure className="group/foto relative h-full">
                  <KitPhoto
                    src={field(item, 'image')}
                    alt={BESTARI_PHOTOS.alt(field(item, 'image'), caption || `Kegiatan di ${m.companyName}`)}
                    sizes={big ? '(min-width: 768px) 48vw, 92vw' : '(min-width: 768px) 24vw, 46vw'}
                    className={`h-full rounded-[22px] ${big ? 'aspect-[3/2] @3xl:aspect-auto' : 'aspect-square @3xl:aspect-auto'}`}
                    imgClassName="transition-[scale] duration-700 ease-out group-hover/foto:scale-[1.04]"
                  />
                  {caption && (
                    <figcaption className="absolute bottom-2 left-2 max-w-[calc(100%-16px)] rounded-full bg-white/[0.92] px-3 py-1.5 text-[12.5px] font-medium leading-snug text-[#1C1917] backdrop-blur-md @3xl:bottom-3 @3xl:left-3">
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
