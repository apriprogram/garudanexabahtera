// Akademik (kunci `programs`) + prestasi (kunci `achievements`).
// Akademik: pita tint; kepala section terbelah (label + H2 kiri, deskripsi kanan), lalu kartu putih bergaris rambut per
// kelompok mata pelajaran pilihan (ikon otomatis di kotak tint, chip label, nama, deskripsi, mapel sebagai chip
// bergaris). Kelompok keempat (mis. kokurikuler) tampil melebar mendatar di bawahnya. Catatan kecil di bawah kartu.
// Prestasi: kartu tint datar (hover = garis warna tema): chip tingkat + tahun, peringkat besar, nama lomba, nama tim.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import type { ListItem } from '../types';
import { linesOf, type JumantaraModel } from './model';
import { C, CARD, CHIP, DISPLAY, LINE, SECTION_PAD, TYPE_J } from './styles';
import { SectionHead, SectionRule, TitleIcon } from './ui';

const SUBJECT = `inline-flex min-h-8 items-center rounded-[6px] border bg-white px-2.5 py-1 text-[13px] leading-snug ${C.ink} ${LINE}`;

function Subjects({ raw, className = '' }: { raw: string; className?: string }) {
  const subjects = linesOf(raw);
  if (subjects.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {subjects.map((subject, i) => (
        <li key={`${subject}-${i}`} className={SUBJECT}>
          {subject}
        </li>
      ))}
    </ul>
  );
}

function ProgramIcon({ name, index }: { name: string; index: number }) {
  return (
    <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-(--jm-tint) text-(--jm-ink)">
      <TitleIcon title={name} index={index} className="h-[22px] w-[22px]" />
    </span>
  );
}

function ProgramCard({ item, index }: { item: ListItem; index: number }) {
  const name = field(item, 'name');
  const label = field(item, 'label');
  const description = field(item, 'description');
  const subjects = field(item, 'subjects');
  return (
    <article className={`flex h-full flex-col p-6 @3xl:p-7 ${CARD.white}`}>
      <ProgramIcon name={name} index={index} />
      {label && <p className={`mt-6 self-start ${CHIP}`}>{label}</p>}
      <h3 className={`${label ? 'mt-3' : 'mt-6'} text-balance ${C.ink} ${TYPE_J.h3}`}>{name}</h3>
      {description && <p className={`mt-2 ${TYPE_J.small} ${C.muted}`}>{description}</p>}
      {/* Daftar mapel langsung di bawah deskripsi: garis rambut sejajar antar-kartu (deskripsi sama panjang) */}
      <Subjects raw={subjects} className={`mt-6 border-t pt-5 ${LINE}`} />
    </article>
  );
}

export function Programs({ m }: { m: JumantaraModel }) {
  const { programs } = m;
  const items = m.items('programs');
  if (items.length === 0) return null;
  const main = items.slice(0, 3);
  const wide = items[3];
  const cols = main.length === 1 ? '' : main.length === 2 ? '@3xl:grid-cols-2' : '@4xl:grid-cols-3';
  const note = text(programs, 'note');

  return (
    <TemplateSection sectionKey="programs" className={`bg-(--jm-tint) ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead layout="split" eyebrow={text(programs, 'eyebrow')} title={text(programs, 'title')} fallback="Program akademik" subtitle={text(programs, 'subtitle')} />
        <ul className={`mt-10 grid gap-5 @3xl:mt-12 @5xl:gap-6 ${cols}`}>
          {main.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i)} className="min-w-0">
              <ProgramCard item={item} index={i} />
            </Reveal>
          ))}
        </ul>
        {wide && (
          <Reveal delay={stagger(3)} className="mt-5 @5xl:mt-6">
            <article className={`grid gap-5 p-6 @3xl:grid-cols-[auto_minmax(0,1fr)] @3xl:items-start @3xl:gap-6 @3xl:p-7 @5xl:grid-cols-[auto_minmax(0,5fr)_minmax(0,7fr)] ${CARD.white}`}>
              <ProgramIcon name={field(wide, 'name')} index={3} />
              <div className="min-w-0">
                {field(wide, 'label') && <p className={`self-start ${CHIP}`}>{field(wide, 'label')}</p>}
                <h3 className={`${field(wide, 'label') ? 'mt-3' : ''} text-balance ${C.ink} ${TYPE_J.h3}`}>{field(wide, 'name')}</h3>
              </div>
              <div className="min-w-0 @3xl:col-start-2 @5xl:col-start-auto">
                {field(wide, 'description') && <p className={`${TYPE_J.body} ${C.muted}`}>{field(wide, 'description')}</p>}
                <Subjects raw={field(wide, 'subjects')} className="mt-4" />
              </div>
            </article>
          </Reveal>
        )}
        {note && <p className={`mt-6 max-w-[80ch] ${TYPE_J.small} ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}

export function Achievements({ m }: { m: JumantaraModel }) {
  const { achievements } = m;
  const items = m.items('achievements');
  if (items.length === 0) return null;
  return (
    <TemplateSection sectionKey="achievements" className={`relative ${SECTION_PAD}`}>
      <SectionRule show={m.ruleAbove('achievements')} />
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(achievements, 'eyebrow')} title={text(achievements, 'title')} fallback="Prestasi" subtitle={text(achievements, 'subtitle')} />
        <ul className="mt-10 grid grid-cols-2 gap-3 @3xl:mt-12 @3xl:gap-4 @5xl:grid-cols-3 @5xl:gap-5">
          {items.map((item, i) => {
            const level = field(item, 'level');
            const year = field(item, 'year');
            const rank = field(item, 'title');
            const event = field(item, 'event');
            const name = field(item, 'name');
            return (
              <Reveal as="li" key={`${event}-${i}`} delay={stagger(i, 60)} className="min-w-0">
                <article className={`flex h-full flex-col p-4 hover:border-(--jm-line) @3xl:p-6 ${CARD.tint}`}>
                  {(level || year) && (
                    <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                      {level ? (
                        <span className={`inline-flex h-7 items-center rounded-[6px] border bg-white px-2.5 text-[12px] font-semibold ${C.ink} ${LINE}`}>{level}</span>
                      ) : (
                        <span />
                      )}
                      {year && <span className={`text-[13px] font-medium tabular-nums ${C.muted}`}>{year}</span>}
                    </p>
                  )}
                  {rank && <p className={`mt-4 ${DISPLAY} text-[20px] font-semibold leading-tight tracking-[-0.02em] text-(--jm-ink) @3xl:mt-6 @3xl:text-[22px]`}>{rank}</p>}
                  {event && <h3 className={`mt-2 text-[14.5px] font-medium leading-snug ${C.ink} @3xl:text-[15.5px]`}>{event}</h3>}
                  {name && <p className={`mt-1.5 ${TYPE_J.small} ${C.muted}`}>{name}</p>}
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
