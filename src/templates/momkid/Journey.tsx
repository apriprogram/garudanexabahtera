// Perjalanan (kunci `journey`): kepala section di tengah, lalu TAB BERTAHAP seperti stepper — lingkaran doodle (hati,
// bayi berbedong, jejak kaki) yang dihubungkan garis putus-putus, nama tahap, dan keterangan waktu; tahap terpilih
// berlingkaran warna tema. Panel: kartu peach lembut radius 28 berisi foto 4:3 (sudut kanan bawah melengkung besar),
// judul tahap, penjelasan, chip layanan putih, dan satu tombol. Tab memakai role=tablist/tab/tabpanel, panah kiri/kanan,
// Home/End (aktivasi otomatis). HP: tiga tab ringkas sejajar, panel bertumpuk foto → teks.
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text, type LinkAction } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { Doodle } from './art';
import { stageDoodle } from './icons';
import { splitTags, type MomkidModel } from './model';
import { MOMKID_PHOTOS } from './photos';
import { BG, C, CARD, DISPLAY, SECTION_PAD, TONE_BG, TYPE } from './styles';
import { ButtonLink, SectionHead } from './ui';

const COLS: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };

function StagePanel({ m, stage, link }: { m: MomkidModel; stage: ListItem; link: LinkAction | null }) {
  const image = field(stage, 'image');
  const services = splitTags(field(stage, 'services')).slice(0, 8);
  const photo = hasImage(image);
  return (
    <div className={`mk-fade grid gap-6 p-3 @3xl:p-4 @4xl:grid-cols-12 @4xl:items-center @4xl:gap-10 ${CARD} ${BG.peachSoft}`}>
      {photo && (
        <KitPhoto
          src={image}
          alt={MOMKID_PHOTOS.alt(image, `${field(stage, 'name') || 'Tahap layanan'} di ${m.companyName}`)}
          fallback="none"
          sizes="(min-width: 896px) 42vw, 100vw"
          className="aspect-[4/3] rounded-[22px] rounded-br-[88px] @4xl:col-span-6 @6xl:aspect-[3/2]"
        />
      )}
      <div className={`min-w-0 px-3 pb-5 @3xl:px-4 ${photo ? '@4xl:col-span-6 @4xl:py-6 @4xl:pr-8' : '@4xl:col-span-12 @4xl:p-8'}`}>
        {field(stage, 'period') && <p className={`${TYPE.label} ${C.accent}`}>{field(stage, 'period')}</p>}
        {field(stage, 'title') && <h3 className={`mt-3 ${DISPLAY} text-[24px] font-extrabold leading-tight tracking-[-0.015em] @3xl:text-[30px] ${C.ink}`}>{field(stage, 'title')}</h3>}
        {field(stage, 'text') && <p className={`mt-3 max-w-[48ch] text-pretty ${TYPE.body} @3xl:text-[16px] ${C.muted}`}>{field(stage, 'text')}</p>}
        {services.length > 0 && (
          <ul aria-label="Layanan" className="mt-6 flex flex-wrap gap-2">
            {services.map((service, i) => (
              <li key={`${service}-${i}`} className={`inline-flex min-h-9 items-center rounded-full bg-white px-3.5 py-1 text-[14px] font-medium leading-snug ${C.ink}`}>
                {service}
              </li>
            ))}
          </ul>
        )}
        <ButtonLink action={link} label={field(stage, 'link_label')} size="md" className="mt-7" />
      </div>
    </div>
  );
}

export function Journey({ m }: { m: MomkidModel }) {
  const { journey } = m;
  const stages = m.items('journey');
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  if (stages.length === 0) return null;
  const index = Math.min(active, stages.length - 1);
  const stage = stages[index];
  const link = m.linkOr(field(stage, 'link_url'), m.visitAction);
  const many = stages.length > 1;

  const select = (i: number) => {
    const next = (i + stages.length) % stages.length;
    setActive(next);
    tabs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: stages.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key]);
  };

  return (
    <TemplateSection sectionKey="journey" className={`${TONE_BG[m.tone('journey')]} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(journey, 'eyebrow')} doodle="footprints" title={text(journey, 'title')} subtitle={text(journey, 'subtitle')} srTitle="Perjalanan layanan" />

        {many && (
          <Reveal className="mx-auto mt-8 max-w-[860px] @3xl:mt-12">
            <div role="tablist" aria-label="Tahap layanan" className={`relative grid ${COLS[stages.length]} gap-2`}>
              {/* Garis putus-putus antar-lingkaran (pusat lingkaran pertama → terakhir) */}
              <span
                aria-hidden
                className="absolute top-7 h-0 border-t-2 border-dashed border-[#2E2228]/20 @3xl:top-8"
                style={{ left: `${50 / stages.length}%`, right: `${50 / stages.length}%` }}
              />
              {stages.map((s, i) => {
                const selected = i === index;
                return (
                  <button
                    key={`${field(s, 'name')}-${i}`}
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    id={`${baseId}-tab-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`${baseId}-panel`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(i)}
                    onKeyDown={onKeyDown}
                    className="group relative flex min-w-0 flex-col items-center gap-2.5 rounded-[24px] px-1 pb-2 text-center"
                  >
                    <span
                      aria-hidden
                      className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-300 @3xl:h-16 @3xl:w-16 ${
                        selected ? 'bg-(--tpl-accent) text-[#2E2228]' : 'bg-(--mk-peach-soft) text-[#2E2228] group-hover:bg-(--mk-peach)'
                      }`}
                    >
                      <Doodle name={stageDoodle(field(s, 'name'), i)} blob="" className="h-10 w-10 @3xl:h-11 @3xl:w-11" />
                    </span>
                    <span className={`${DISPLAY} text-balance text-[15px] font-extrabold leading-tight @3xl:text-[17px] ${C.ink}`}>{field(s, 'name') || field(s, 'title')}</span>
                    {field(s, 'period') && <span className={`hidden text-[13px] leading-tight @xl:block ${C.muted}`}>{field(s, 'period')}</span>}
                    <span
                      aria-hidden
                      className={`h-1 w-8 rounded-full transition-colors duration-300 ${selected ? 'bg-(--tpl-accent)' : 'bg-transparent'}`}
                    />
                  </button>
                );
              })}
            </div>
          </Reveal>
        )}

        <Reveal variant="scale" className="mt-6 @3xl:mt-10">
          {many ? (
            <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${index}`} tabIndex={0} key={index} className="rounded-[28px]">
              <StagePanel m={m} stage={stage} link={link} />
            </div>
          ) : (
            <StagePanel m={m} stage={stage} link={link} />
          )}
        </Reveal>
      </div>
    </TemplateSection>
  );
}
