// Bukti Altura: `stats` (pita zaitun gelap membulat di dalam gutter di atas foto cakrawala berkabut; hingga 4 angka
// raksasa di ujung garis vertikal tipis bertitik pada ketinggian berbeda, garis digambar dari bawah, angka berjalan;
// HP: 2×2 dengan garis kiri) dan `difference` (foto + judul + tombol di kiri, grid 6 keunggulan berikon garis dalam
// lingkaran warna tema di kanan).
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { splitStat, type AlturaModel } from './model';
import { ALTURA_PHOTOS } from './photos';
import { C, DISPLAY, OUTER, SECTION_PAD, TYPE_A } from './styles';
import { PillCta, PillTag, SectionHead, TitleIcon } from './ui';

/** Jarak atas tiap kolom angka di layar lebar: angka "melayang" di ketinggian berbeda seperti gedung. */
const OFFSETS = ['@5xl:mt-[150px]', '@5xl:mt-0', '@5xl:mt-[210px]', '@5xl:mt-[60px]'];

export function Stats({ m }: { m: AlturaModel }) {
  const { stats } = m;
  const items = m.items('stats');
  const image = text(stats, 'image');
  const eyebrow = text(stats, 'eyebrow');
  const title = text(stats, 'title');
  return (
    <TemplateSection sectionKey="stats" className="py-1.5 @5xl:py-2">
      <div className={OUTER}>
        <div data-tpl-tone="inverse" className="relative isolate overflow-hidden rounded-[24px] bg-(--al-deep) text-white @3xl:rounded-[28px]">
          {hasImage(image) && (
            <KitPhoto
              src={image}
              alt=""
              fallback="none"
              sizes="100vw"
              position="50% 60%"
              className="absolute inset-0 -z-20"
              imgClassName="grayscale-[40%]"
            />
          )}
          <div aria-hidden className="al-stats-scrim absolute inset-0 -z-10" />
          <div className={`${CONTAINER} flex min-h-[540px] flex-col pb-10 pt-12 @3xl:pt-16 @5xl:min-h-[640px] @5xl:pb-0 @min-[96rem]:min-h-[700px]`}>
            {(eyebrow || title) && (
              <div className="max-w-[560px]">
                {eyebrow && (
                  <Reveal variant="fade">
                    <PillTag tone="dark">{eyebrow}</PillTag>
                  </Reveal>
                )}
                {title && (
                  <Reveal as="h2" delay={80} className={`mt-5 max-w-[18ch] text-balance text-[26px] font-semibold leading-[1.12] tracking-[-0.03em] text-white @3xl:text-[32px] ${DISPLAY}`}>
                    {title}
                  </Reveal>
                )}
              </div>
            )}
            <dl className="mt-12 grid flex-1 grid-cols-2 gap-x-5 gap-y-10 @3xl:mt-16 @5xl:mt-10 @5xl:grid-cols-4 @5xl:gap-x-8">
              {items.map((item, i) => {
                const { main, sup } = splitStat(field(item, 'value'));
                return (
                  <Reveal key={`${field(item, 'label')}-${i}`} delay={stagger(i, 120)} className={`relative flex min-w-0 flex-col pb-2 pl-5 @3xl:pl-6 @5xl:pb-14 ${OFFSETS[i] ?? ''}`}>
                    <span aria-hidden className="al-line absolute bottom-0 left-0 top-1 w-px bg-white/35" />
                    <span aria-hidden className="absolute -left-[4px] top-0 h-[9px] w-[9px] rounded-full bg-white ring-4 ring-white/15" />
                    {/* dt lebih dulu di DOM (urutan dl yang benar), tampil di bawah angka */}
                    <dt className="order-last mt-3 max-w-[18ch] text-[14px] font-medium leading-snug text-white/80 @3xl:text-[15px]">{field(item, 'label')}</dt>
                    {main && (
                      <dd className={`-mt-1 ${TYPE_A.stat}`}>
                        <CountUp value={main} duration={1800} />
                        {sup && <sup className="ml-0.5 align-super text-[0.42em] font-semibold text-(--al-bright)">{sup}</sup>}
                      </dd>
                    )}
                  </Reveal>
                );
              })}
            </dl>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

export function Difference({ m }: { m: AlturaModel }) {
  const { difference } = m;
  const items = m.items('difference');
  const image = text(difference, 'image');
  const action = m.linkOr(text(difference, 'button_url'), m.startAction);
  return (
    <TemplateSection sectionKey="difference" className={SECTION_PAD}>
      <div className={`${CONTAINER} grid gap-12 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-12 @7xl:gap-20`}>
        <div className="min-w-0 @5xl:col-span-5">
          {hasImage(image) && (
            <Reveal variant="scale">
              <KitPhoto
                src={image}
                alt={ALTURA_PHOTOS.alt(image, text(difference, 'title'))}
                zoom
                sizes="(min-width: 1024px) 38vw, 92vw"
                className="aspect-[4/3] rounded-[24px]"
              />
            </Reveal>
          )}
          <SectionHead
            layout="stack"
            eyebrow={text(difference, 'eyebrow')}
            title={text(difference, 'title')}
            subtitle={text(difference, 'subtitle')}
            className={hasImage(image) ? 'mt-10' : ''}
            aside={<PillCta action={action} label={text(difference, 'button_label')} variant="white" size="md" />}
          />
        </div>
        <ul className="grid gap-x-8 gap-y-10 @xl:grid-cols-2 @5xl:col-span-7 @7xl:gap-x-12 @7xl:gap-y-14">
          {items.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 70)} className="min-w-0 border-t border-[#141612]/[0.1] pt-6">
              <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
                <TitleIcon title={field(item, 'title')} index={i} className="h-[22px] w-[22px]" />
              </span>
              <h3 className={`mt-5 ${C.ink} ${TYPE_A.h3}`}>{field(item, 'title')}</h3>
              {field(item, 'text') && <p className={`mt-2 max-w-[42ch] ${TYPE_A.body} ${C.muted}`}>{field(item, 'text')}</p>}
            </Reveal>
          ))}
        </ul>
      </div>
    </TemplateSection>
  );
}
