// Cara memulai (kunci `steps`): panel gradasi sangat lembut (tint aksen → biru) radius 40 di dalam gutter halaman,
// judul terbelah, lalu langkah bernomor dalam lingkaran putih yang disambung garis tipis (desktop 4 kolom). HP:
// langkah bertumpuk dengan garis tegak di kiri.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import type { SerenityModel } from './model';
import { C, TYPE_S } from './styles';
import { SectionLabel } from './ui';

const COLS: Record<number, string> = {
  1: '',
  2: '@3xl:grid-cols-2',
  3: '@3xl:grid-cols-3',
  4: '@3xl:grid-cols-2 @6xl:grid-cols-4',
};

export function Steps({ m }: { m: SerenityModel }) {
  const { steps } = m;
  const eyebrow = text(steps, 'eyebrow');
  const title = text(steps, 'title');
  const subtitle = text(steps, 'subtitle');
  const items = list(steps, 'items', 4).filter((item) => field(item, 'title') || field(item, 'text'));
  if (items.length === 0) return null;
  // Garis penghubung horizontal hanya bila semua langkah sebaris
  const lineFrom = items.length === 4 ? '@6xl:block' : '@3xl:block';

  return (
    <TemplateSection sectionKey="steps" className="py-4 @3xl:py-8">
      <div className={CONTAINER}>
        <div className="sr-steps-panel rounded-[32px] px-6 py-12 @3xl:rounded-[40px] @3xl:px-12 @3xl:py-16 @6xl:px-16 @6xl:py-20">
          {(eyebrow || title || subtitle) && (
            <div className="grid gap-6 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10">
              <div className="min-w-0 @5xl:col-span-7">
                {eyebrow && (
                  <Reveal>
                    <SectionLabel tone="white">{eyebrow}</SectionLabel>
                  </Reveal>
                )}
                {title && (
                  <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[18ch] text-balance text-[#151833] ${TYPE_S.h2}`}>
                    {title}
                  </Reveal>
                )}
              </div>
              {subtitle && (
                <Reveal as="p" delay={160} className={`max-w-[42ch] @5xl:col-span-5 @5xl:justify-self-end @5xl:pb-2 ${TYPE_S.lead} ${C.muted}`}>
                  {subtitle}
                </Reveal>
              )}
            </div>
          )}

          <ol className={`mt-10 grid gap-x-6 gap-y-9 @3xl:mt-14 ${COLS[items.length]}`}>
            {items.map((item, i) => {
              const last = i === items.length - 1;
              return (
                <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 90)} className="relative min-w-0 pl-16 @3xl:pl-0">
                  {/* HP: garis tegak penghubung di kiri */}
                  {!last && <span aria-hidden className="absolute bottom-[-36px] left-6 top-12 w-px bg-[#151833]/12 @3xl:hidden" />}
                  <div className="absolute left-0 top-0 flex items-center gap-4 @3xl:static">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[15px] font-semibold tabular-nums text-(--tpl-accent-ink)">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {!last && <span aria-hidden className={`hidden h-px flex-1 bg-[#151833]/12 ${lineFrom}`} />}
                  </div>
                  {field(item, 'title') && <h3 className={`pt-2.5 text-[#151833] @3xl:pt-6 ${TYPE_S.h3}`}>{field(item, 'title')}</h3>}
                  {field(item, 'text') && <p className={`mt-2 max-w-[36ch] ${TYPE_S.body} ${C.muted}`}>{field(item, 'text')}</p>}
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </TemplateSection>
  );
}
