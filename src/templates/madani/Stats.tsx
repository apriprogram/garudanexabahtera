// Statistik (kunci `stats`): kepala section, lalu kartu angka krem (angka besar yang dihitung naik saat terlihat,
// garis tipis, keterangan, penjelasan). Kartu terakhir (mis. Akreditasi) memakai warna sorotan. HP: 2 kolom, kartu
// terakhir selebar penuh bila jumlahnya ganjil.
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import type { MadaniModel } from './model';
import { C, SECTION_PAD, TYPE_M } from './styles';
import { SectionHead } from './ui';

const COLS: Record<number, string> = {
  1: '@5xl:grid-cols-1',
  2: '@5xl:grid-cols-2',
  3: '@5xl:grid-cols-3',
  4: '@5xl:grid-cols-4',
  5: '@5xl:grid-cols-5',
};

export function Stats({ m }: { m: MadaniModel }) {
  const { stats } = m;
  const items = list(stats, 'items', 5).filter((item) => field(item, 'value'));
  if (items.length === 0) return null;
  const odd = items.length % 2 === 1;

  return (
    <TemplateSection sectionKey="stats" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(stats, 'eyebrow')} title={text(stats, 'title')} subtitle={text(stats, 'subtitle')} />
        <dl className={`mt-10 grid grid-cols-2 gap-3 @3xl:mt-12 @3xl:gap-4 ${COLS[items.length] ?? '@5xl:grid-cols-5'}`}>
          {items.map((item, i) => {
            const last = i === items.length - 1;
            const hl = last && items.length > 1;
            return (
              <Reveal
                key={`${field(item, 'label')}-${i}`}
                delay={stagger(i, 70)}
                data-stat-highlight={hl ? 'true' : undefined}
                className={`flex min-w-0 flex-col rounded-[24px] p-5 @3xl:p-6 ${hl ? 'bg-(--md-hl)' : 'bg-[#F6F4EC]'} ${
                  last && odd ? 'col-span-2 @5xl:col-span-1' : ''
                }`}
              >
                <dt className={`order-2 mt-5 border-t border-black/[0.1] pt-4 text-[15px] font-semibold leading-snug ${hl ? 'text-(--md-on-hl)' : 'text-(--md-deep)'}`}>{field(item, 'label')}</dt>
                <dd className={`order-1 ${hl ? 'text-(--md-on-hl)' : 'text-(--md-deep)'} ${TYPE_M.stat}`}>
                  <CountUp value={field(item, 'value')} />
                </dd>
                {field(item, 'text') && (
                  <dd className={`order-3 mt-2 text-[13.5px] leading-relaxed ${hl ? 'text-(--md-on-hl)/80' : C.muted}`}>{field(item, 'text')}</dd>
                )}
              </Reveal>
            );
          })}
        </dl>
      </div>
    </TemplateSection>
  );
}
