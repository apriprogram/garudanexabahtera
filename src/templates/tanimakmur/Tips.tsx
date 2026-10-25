// Panduan (kunci `tips`): judul terbelah, lalu kartu panduan urban farming: foto 4:3 membulat (atau bidang hijau + daun
// bila kosong) dengan chip label, lama baca, judul, ringkasan, dan tautan. Tanpa tautan → "Minta panduan lengkap" lewat
// WhatsApp berisi judul panduan. HP: 1 kolom, tablet 2, desktop 4 (3 kartu → 3 kolom).
import { ArrowRight, Clock } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { LeafArt } from './marks';
import type { TaniModel } from './model';
import { TANI_PHOTOS } from './photos';
import { C, TYPE_T } from './styles';
import { SectionLabel } from './ui';

const COLS: Record<number, string> = {
  1: 'mx-auto max-w-[520px]',
  2: '@2xl:grid-cols-2',
  3: '@2xl:grid-cols-2 @5xl:grid-cols-3',
  4: '@2xl:grid-cols-2 @6xl:grid-cols-4',
  5: '@2xl:grid-cols-2 @5xl:grid-cols-3',
  6: '@2xl:grid-cols-2 @5xl:grid-cols-3',
};

export function Tips({ m }: { m: TaniModel }) {
  const { tips } = m;
  const eyebrow = text(tips, 'eyebrow');
  const title = text(tips, 'title');
  const subtitle = text(tips, 'subtitle');
  const items = list(tips, 'items', 6).filter((item) => field(item, 'title'));
  if (items.length === 0) return null;

  return (
    <TemplateSection sectionKey="tips" className={SECTION_Y}>
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
                <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[20ch] text-balance ${C.ink} ${TYPE_T.h2}`}>
                  {title}
                </Reveal>
              )}
            </div>
            {subtitle && (
              <Reveal as="p" delay={160} className={`max-w-[46ch] @5xl:col-span-5 @5xl:justify-self-end @5xl:pb-2 ${TYPE_T.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
          </div>
        )}

        <ul className={`mt-10 grid gap-x-5 gap-y-10 @3xl:mt-14 ${COLS[items.length]}`}>
          {items.map((item, i) => {
            const name = field(item, 'title');
            const image = field(item, 'image');
            const category = field(item, 'category');
            const readTime = field(item, 'read_time');
            const custom = field(item, 'url');
            const action = resolveAction(custom, m.askAbout(`panduan "${name}"`));
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 70)} className="group relative flex min-w-0 flex-col">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-[#1E3A16]">
                  {hasImage(image) ? (
                    <KitPhoto
                      src={image}
                      alt={TANI_PHOTOS.alt(image, name)}
                      fallback="none"
                      zoom
                      sizes="(min-width: 1152px) 25vw, (min-width: 672px) 50vw, 100vw"
                      className="absolute inset-0"
                      imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <LeafArt className="absolute -right-6 -top-4 h-[120%] text-white/25" />
                  )}
                  {category && (
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[12.5px] font-semibold text-[#18230F] backdrop-blur-md">{category}</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col px-1 pt-5">
                  {readTime && (
                    <p className={`flex items-center gap-1.5 text-[13px] ${C.muted}`}>
                      <Clock aria-hidden className="h-3.5 w-3.5" />
                      {readTime}
                    </p>
                  )}
                  <h3 className={`mt-2 ${C.ink} ${TYPE_T.h3}`}>{name}</h3>
                  {field(item, 'excerpt') && <p className={`mt-2 ${TYPE_T.body} ${C.muted}`}>{field(item, 'excerpt')}</p>}
                  {action && (
                    <ActionLink
                      action={action}
                      aria-label={custom ? `Baca panduan ${name}` : `Minta panduan lengkap: ${name}`}
                      className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start pt-4 text-[14px] font-semibold text-[#1E3A16] transition-[gap] hover:gap-2.5"
                    >
                      {custom ? 'Baca panduan' : 'Minta panduan lengkap'}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </ActionLink>
                  )}
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
