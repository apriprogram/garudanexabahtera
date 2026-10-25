// Kartu info singkat + statistik. Kartu info (kunci `highlights`): SATU kotak putih bergaris tipis dengan tiga kolom
// dipisah garis vertikal, menumpang di tepi bawah hero pada layar lebar (referensi Eduker); di HP tiga baris dipisah
// garis. Judulnya hanya untuk pembaca layar. Statistik (kunci `stats`): panel abu kebiruan, judul kecil kiri, deret
// angka berikon garis dipisah garis vertikal (referensi Eduker/Negmar); angka berjalan saat pertama terlihat.
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import { titleTarget, type CakrawalaModel } from './model';
import { C, DISPLAY, TYPE_C } from './styles';
import { Eyebrow, IconBox, TextLink, TitleIcon } from './ui';

export function Highlights({ m, overlap }: { m: CakrawalaModel; overlap: boolean }) {
  const items = list(m.highlights, 'items', 3).filter((item) => field(item, 'title') || field(item, 'text'));
  if (items.length === 0) return null;
  const title = text(m.highlights, 'title');
  const cols = items.length === 1 ? '' : items.length === 2 ? '@3xl:grid-cols-2' : '@3xl:grid-cols-3';

  return (
    <TemplateSection sectionKey="highlights" className={`relative z-10 ${overlap ? 'mt-3 @5xl:-mt-[92px]' : 'mt-3 @3xl:mt-6'}`}>
      {title && <h2 className="sr-only">{title}</h2>}
      <div className={CONTAINER}>
        <ul className={`grid divide-y divide-black/[0.07] rounded-[22px] bg-white ring-1 ring-inset ring-black/[0.07] @3xl:divide-x @3xl:divide-y-0 @6xl:mx-10 ${cols}`}>
          {items.map((item, i) => {
            const itemTitle = field(item, 'title');
            const target = titleTarget(itemTitle, m.shown);
            const action = m.linkOr(field(item, 'url'), target ? { kind: 'section', target } : null);
            return (
              <Reveal as="li" key={`${itemTitle}-${i}`} delay={stagger(i, 80)} className="flex gap-4 p-5 @3xl:p-7 @6xl:p-8">
                <IconBox title={itemTitle} index={i} />
                <div className="min-w-0">
                  {itemTitle && <h3 className={`${C.ink} ${TYPE_C.h3}`}>{itemTitle}</h3>}
                  {field(item, 'text') && <p className={`mt-1.5 ${TYPE_C.small} ${C.muted}`}>{field(item, 'text')}</p>}
                  <TextLink action={action} label={field(item, 'link_label')} className="mt-2" />
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

export function Stats({ m }: { m: CakrawalaModel }) {
  const items = list(m.stats, 'items', 5).filter((item) => field(item, 'value') || field(item, 'label'));
  if (items.length === 0) return null;
  const eyebrow = text(m.stats, 'eyebrow');
  const title = text(m.stats, 'title');
  const cols = { 1: '@3xl:grid-cols-1', 2: '@3xl:grid-cols-2', 3: '@3xl:grid-cols-3', 4: '@3xl:grid-cols-4', 5: '@3xl:grid-cols-5' }[items.length];

  return (
    <TemplateSection sectionKey="stats" className="pb-6 pt-12 @3xl:pb-8 @3xl:pt-16">
      <div className={CONTAINER}>
        <div className={`grid gap-8 rounded-[24px] ${C.panel} px-5 py-8 @3xl:px-9 @3xl:py-10 @6xl:grid-cols-12 @6xl:items-center @6xl:gap-10`}>
          {(eyebrow || title) && (
            <div className="min-w-0 @6xl:col-span-3">
              {eyebrow && (
                <Reveal>
                  <Eyebrow>{eyebrow}</Eyebrow>
                </Reveal>
              )}
              {title && (
                <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-3' : ''} text-balance ${DISPLAY} text-[21px] font-semibold leading-snug tracking-[-0.02em] @3xl:text-[23px] ${C.ink}`}>
                  {title}
                </Reveal>
              )}
            </div>
          )}
          <dl className={`grid grid-cols-2 gap-x-4 gap-y-7 @6xl:col-span-9 ${cols} @3xl:gap-0 @3xl:divide-x @3xl:divide-black/[0.08]`}>
            {items.map((item, i) => (
              <Reveal
                key={`${field(item, 'label')}-${i}`}
                delay={stagger(i, 70)}
                className={`flex min-w-0 flex-col gap-1.5 @3xl:px-6 @3xl:first:pl-0 ${items.length % 2 === 1 && i === items.length - 1 ? 'col-span-2 @3xl:col-span-1' : ''}`}
              >
                {/* dt lebih dulu di DOM (urutan dl yang benar), tampil di bawah angka */}
                <dt className={`order-last ${TYPE_C.small} ${C.muted}`}>{field(item, 'label')}</dt>
                <dd className="flex flex-col gap-3">
                  <TitleIcon title={field(item, 'label')} index={i} className="h-7 w-7 text-(--ck-ink)" />
                  <span className={`${TYPE_C.stat} ${C.ink}`}>
                    <CountUp value={field(item, 'value')} />
                  </span>
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>
    </TemplateSection>
  );
}
