// Waktu hasil (kunci `turnaround`), pita #F2F6F8. Pemeriksaan dikelompokkan (mis. Laboratorium dalam jam, Radiologi &
// patologi dalam hari); tiap kelompok satu panel putih: judul kelompok (H3) + satuan, baris "nama · batang · nilai mono",
// dan sumbu skala 0 → nilai terbesar. Panjang batang dibandingkan dalam kelompoknya saja (satuan berbeda tidak
// dicampur). Gerak khas (./specialistplus.css): batang tumbuh (scaleX) SEKALI saat panel tampil, bertahap. HP: nama &
// nilai satu baris, batang di bawahnya.
import type { CSSProperties } from 'react';
import { Info } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { turnaroundGroups, type SpxModel } from './model';
import { C, CARD, MONO_LABEL, SECTION_PAD, TYPE_S } from './styles';
import { SectionHead } from './ui';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10).replace('.', ','));

export function Turnaround({ m }: { m: SpxModel }) {
  const { turnaround } = m;
  const groups = turnaroundGroups(m.items('turnaround'));
  if (groups.length === 0) return null;
  const eyebrow = text(turnaround, 'eyebrow');
  const note = text(turnaround, 'note');

  return (
    <TemplateSection sectionKey="turnaround" className={`${C.surface} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={eyebrow} code={m.code('turnaround')} title={text(turnaround, 'title')} subtitle={text(turnaround, 'subtitle')} srTitle={eyebrow || 'Waktu hasil'} />
        <div className={`mt-10 grid gap-4 @5xl:mt-14 @5xl:gap-6 ${groups.length > 1 ? '@5xl:grid-cols-2' : ''}`}>
          {groups.map((group, g) => (
            <Reveal key={`${group.name}-${g}`} variant="fade" delay={stagger(g, 120)} className={`${CARD} p-5 @3xl:p-7`} data-spx-turnaround={group.name}>
              <div className="flex items-baseline justify-between gap-4">
                <h3 className={`${TYPE_S.h3} ${C.ink}`}>{group.name}</h3>
                {group.unit && <span className={`${MONO_LABEL} ${C.muted}`}>Satuan: {group.unit}</span>}
              </div>
              <ul className={`mt-5 divide-y border-t ${C.line} ${C.divide}`}>
                {group.rows.map((row, i) => (
                  <li
                    key={`${row.name}-${i}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 @3xl:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_4.5rem] @6xl:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_4.5rem]"
                  >
                    <span className={`min-w-0 text-[14.5px] font-medium leading-snug ${C.ink}`}>{row.name}</span>
                    <span className={`text-right font-mono text-[14px] font-semibold tabular-nums ${C.ink} @3xl:order-last`}>{row.label}</span>
                    <span aria-hidden className="col-span-2 block h-2 overflow-hidden rounded-full bg-[#0D1B2A]/[0.07] @3xl:col-span-1">
                      <span className="spx-bar block h-full rounded-full bg-(--tpl-accent)" style={{ width: `${row.width}%`, '--spx-i': Math.min(i, 8) } as CSSProperties} />
                    </span>
                  </li>
                ))}
              </ul>
              {/* Sumbu skala (dekoratif; nilai sudah tertulis per baris) */}
              <div aria-hidden className="mt-2 hidden grid-cols-[11rem_minmax(0,1fr)_4.5rem] gap-x-4 @3xl:grid @6xl:grid-cols-[12rem_minmax(0,1fr)_4.5rem]">
                <span />
                <span className={`flex justify-between font-mono text-[11px] ${C.muted}`}>
                  <span>0</span>
                  <span>{fmt(group.max / 2)}</span>
                  <span>
                    {fmt(group.max)}
                    {group.unit ? ` ${group.unit}` : ''}
                  </span>
                </span>
                <span />
              </div>
            </Reveal>
          ))}
        </div>
        {note && (
          <p className={`mt-5 flex items-start gap-2 ${TYPE_S.small} ${C.muted}`}>
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {note}
          </p>
        )}
      </div>
    </TemplateSection>
  );
}
