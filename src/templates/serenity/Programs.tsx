// Kelas (kunci `services`): judul terbelah (label + H2 kiri, deskripsi kanan), lalu grid kartu abu lavender radius
// 28: gambar 4:3 membulat (atau gradasi lembut bawaan + gelombang bila kosong) dengan ikon kaca dan chip durasi,
// judul, deskripsi, dan tautan "Tanya jadwal" (WhatsApp berisi nama kelas bila tautan kosong). HP: 1 kolom.
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { SerenityModel } from './model';
import { SERENITY_PHOTOS } from './photos';
import { C, CARD, TYPE_S } from './styles';
import { SectionLabel, TitleIcon } from './ui';

/** Gradasi bawaan kartu kelas tanpa gambar. */
const ART = [
  'linear-gradient(140deg, #4f63c8 0%, #8f86e0 55%, #e3c7f0 100%)',
  'linear-gradient(140deg, #e9806b 0%, #f3b088 55%, #fde0c0 100%)',
  'linear-gradient(140deg, #2f8fa3 0%, #6fc4c8 55%, #d4f1e8 100%)',
  'linear-gradient(140deg, #b96b9c 0%, #df9fbf 55%, #fadde4 100%)',
  'linear-gradient(140deg, #447f58 0%, #86b580 55%, #e0eecb 100%)',
  'linear-gradient(140deg, #6d53b6 0%, #a885d2 55%, #f0d3e8 100%)',
];

function ProgramArt({ index }: { index: number }) {
  return (
    <div aria-hidden className="absolute inset-0" style={{ background: ART[index % ART.length] }}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-white">
        <path d="M-20 210 C 80 150, 160 250, 260 170 S 380 110, 420 130" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" />
        <path d="M-20 228 C 90 170, 170 266, 268 190 S 384 132, 420 152" fill="none" stroke="currentColor" strokeOpacity=".3" strokeWidth="1.5" />
        <path d="M-20 246 C 100 190, 180 282, 276 210 S 388 154, 420 174" fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function Programs({ m }: { m: SerenityModel }) {
  const { services } = m;
  const eyebrow = text(services, 'eyebrow');
  const title = text(services, 'title');
  const subtitle = text(services, 'subtitle');
  const items = list(services, 'items', 6).filter((item) => field(item, 'title') || field(item, 'description'));
  if (items.length === 0 && !title) return null;

  return (
    <TemplateSection sectionKey="services" className={SECTION_Y}>
      <div className={CONTAINER}>
        {(eyebrow || title || subtitle) && (
          <div className="grid gap-6 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10">
            <div className="min-w-0 @5xl:col-span-7">
              {eyebrow && (
                <Reveal>
                  <SectionLabel>{eyebrow}</SectionLabel>
                </Reveal>
              )}
              {title && (
                <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[18ch] text-balance text-[#151833] ${TYPE_S.h2}`}>
                  {title}
                </Reveal>
              )}
            </div>
            {subtitle && (
              <Reveal as="p" delay={160} className={`max-w-[46ch] @5xl:col-span-5 @5xl:justify-self-end @5xl:pb-2 ${TYPE_S.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
          </div>
        )}

        {items.length > 0 && (
          <ul className="mt-10 grid gap-4 @2xl:grid-cols-2 @3xl:mt-14 @5xl:grid-cols-3 @5xl:gap-5">
            {items.map((item, i) => {
              const name = field(item, 'title');
              const meta = field(item, 'meta');
              const image = field(item, 'image');
              const action = resolveAction(field(item, 'url'), m.askAbout(name));
              return (
                <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 70)} className={`group flex flex-col p-2 ${CARD.soft}`}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[22px]">
                    {hasImage(image) ? (
                      <KitPhoto
                        src={image}
                        alt={SERENITY_PHOTOS.alt(image, name)}
                        fallback="none"
                        zoom
                        sizes="(min-width: 1024px) 33vw, (min-width: 672px) 50vw, 100vw"
                        className="absolute inset-0"
                        imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <ProgramArt index={i} />
                    )}
                    <span aria-hidden className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-(--tpl-accent-ink) ring-1 ring-inset ring-white/70 backdrop-blur-md">
                      <TitleIcon title={name} index={i} className="h-5 w-5" />
                    </span>
                    {meta && (
                      <span className="absolute bottom-3 left-3 max-w-[calc(100%-24px)] truncate rounded-full bg-white/85 px-3 py-1.5 text-[12.5px] font-medium text-[#151833] backdrop-blur-md">
                        {meta}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-4 pb-4 pt-5 @3xl:px-5 @3xl:pb-5">
                    {name && <h3 className={`text-[#151833] ${TYPE_S.h3}`}>{name}</h3>}
                    {field(item, 'description') && <p className={`mt-2 ${TYPE_S.body} ${C.muted}`}>{field(item, 'description')}</p>}
                    {action && (
                      <ActionLink
                        action={action}
                        className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start pt-4 text-[14px] font-medium text-(--tpl-accent-ink) transition-[gap] hover:gap-2.5"
                        aria-label={name ? `Tanya jadwal ${name}` : undefined}
                      >
                        Tanya jadwal
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </ActionLink>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}
