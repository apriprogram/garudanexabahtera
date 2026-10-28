// Latihan & pelatih (kunci `training`, latar pasir) + Akademi (kunci `academy`, latar putih).
// Latihan: layar lebar jadwal mingguan sebagai baris bergaris tipis (Hari · Jam · Program · Level · Pelatih; judul
// kolom dari CMS) di kolom 1-8, kartu pelatih dengan avatar INISIAL (tanpa foto orang) di kolom 9-12. HP: setiap baris
// jadi kartu dua baris, pelatih di bawahnya. Tanpa klaim lisensi/sertifikat: pengalaman ditulis sebagai teks biasa.
// Akademi: tiga kartu kelompok usia (foto 4:3 opsional dengan chip usia besar, jadwal, fokus, biaya, tombol daftar
// WhatsApp). Tanpa foto → pita usia besar di atas kartu.
import { Clock, Wallet } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, initials, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { askMessage, trainingCoaches, trainingColumns, trainingSessions, type SmashModel } from './model';
import { SMASHHALL_PHOTOS } from './photos';
import { C, CARD, CHIP, DISPLAY, GRID_GAP, SECTION_PAD, TYPE_S } from './styles';
import { ButtonLink, SectionHead } from './ui';

const ROW = 'grid gap-x-4 @3xl:grid-cols-[7rem_8rem_minmax(0,1fr)_8.5rem_9rem] @3xl:items-center';

export function Training({ m }: { m: SmashModel }) {
  const { training } = m;
  const sessions = trainingSessions(training);
  const coaches = trainingCoaches(training);
  const coachesTitle = text(training, 'coaches_title');
  const columns = trainingColumns(text(training, 'columns'));

  return (
    <TemplateSection sectionKey="training" className={`${C.sand} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(training, 'eyebrow')} title={text(training, 'title')} subtitle={text(training, 'subtitle')} srTitle="Jadwal latihan" />

        <div className={`mt-10 grid grid-cols-1 gap-y-12 @3xl:mt-14 @6xl:grid-cols-12 ${GRID_GAP}`}>
          {sessions.length > 0 && (
            <Reveal className={`min-w-0 ${coaches.length > 0 ? '@6xl:col-span-8' : '@6xl:col-span-12'}`}>
              <div aria-hidden className={`${ROW} hidden border-b border-[#171512]/15 pb-3 text-[12px] font-semibold uppercase tracking-[0.12em] @3xl:grid ${C.muted}`}>
                {columns.map((column, i) => (
                  <span key={i}>{column}</span>
                ))}
              </div>
              <ul className="grid gap-2 @3xl:gap-0 @3xl:divide-y @3xl:divide-[#171512]/10">
                {sessions.map((s, i) => (
                  <li
                    key={`${field(s, 'day')}-${field(s, 'time')}-${i}`}
                    className={`${ROW} gap-y-1.5 rounded-2xl bg-white px-4 py-4 @3xl:rounded-none @3xl:bg-transparent @3xl:px-0 @3xl:py-4`}
                  >
                    <span className={`${DISPLAY} text-[15px] font-semibold ${C.ink}`}>
                      {field(s, 'day')}
                      <span className={`font-medium tabular-nums @3xl:hidden ${C.muted}`}>{field(s, 'time') && ` · ${field(s, 'time')}`}</span>
                    </span>
                    <span className={`hidden text-[15px] tabular-nums @3xl:block ${C.ink}`}>{field(s, 'time')}</span>
                    <span className={`text-[15px] ${C.ink}`}>{field(s, 'program')}</span>
                    <span className="flex flex-wrap items-center gap-2 @3xl:contents">
                      {field(s, 'level') && (
                        <span className={`${CHIP} min-h-7 w-fit bg-(--tpl-accent-50) text-[12.5px] text-(--tpl-accent-ink) @3xl:justify-self-start`}>{field(s, 'level')}</span>
                      )}
                      <span className={`text-[14px] ${C.muted}`}>{field(s, 'coach')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {coaches.length > 0 && (
            <div className={`min-w-0 ${sessions.length > 0 ? '@6xl:col-span-4' : '@6xl:col-span-12'}`}>
              {coachesTitle && <h3 className={`${TYPE_S.h3} ${C.ink}`}>{coachesTitle}</h3>}
              <ul className={`grid gap-3 ${coachesTitle ? 'mt-5' : ''} ${sessions.length > 0 ? '@3xl:grid-cols-2 @6xl:grid-cols-1' : '@3xl:grid-cols-2 @6xl:grid-cols-4'}`}>
                {coaches.map((c, i) => (
                  <Reveal as="li" key={`${field(c, 'name')}-${i}`} delay={stagger(i)} className="flex min-w-0 items-start gap-4 rounded-[20px] bg-white p-5">
                    <span
                      aria-hidden
                      className={`${DISPLAY} flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) text-[16px] font-bold text-(--tpl-on-accent)`}
                    >
                      {initials(field(c, 'name'), '?')}
                    </span>
                    <div className="min-w-0">
                      <p className={`${DISPLAY} text-[16px] font-semibold ${C.ink}`}>{field(c, 'name')}</p>
                      {field(c, 'focus') && <p className={`mt-1 text-[14px] leading-snug ${C.muted}`}>{field(c, 'focus')}</p>}
                      <p className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
                        {field(c, 'level') && <span className={`${CHIP} min-h-7 ${C.sand} ${C.ink}`}>{field(c, 'level')}</span>}
                        {field(c, 'years') && <span className={C.muted}>{field(c, 'years')}</span>}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

export function Academy({ m }: { m: SmashModel }) {
  const { academy } = m;
  const groups = m.items('academy');
  const buttonLabel = text(academy, 'button_label');
  const cols = groups.length >= 3 ? '@4xl:grid-cols-3' : groups.length === 2 ? '@3xl:grid-cols-2' : '';

  return (
    <TemplateSection sectionKey="academy" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(academy, 'eyebrow')} title={text(academy, 'title')} subtitle={text(academy, 'subtitle')} srTitle="Akademi" />
        <ul className={`mt-10 grid gap-4 @3xl:mt-14 @5xl:gap-6 ${cols}`}>
          {groups.map((g, i) => {
            const image = field(g, 'image');
            const name = field(g, 'name');
            const ages = field(g, 'ages');
            const action = m.waWith(askMessage(m.companyName, `mendaftar akademi kelompok ${name}${ages ? ` (${ages})` : ''}`)) ?? m.contactAction;
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i)} className="flex min-w-0">
                <div className={`group flex w-full min-w-0 flex-col overflow-hidden p-2 ${CARD}`}>
                {hasImage(image) ? (
                  <KitPhoto
                    src={image}
                    alt={SMASHHALL_PHOTOS.alt(image, `Latihan bulu tangkis kelompok ${name}`)}
                    zoom
                    sizes="(min-width: 896px) 33vw, 100vw"
                    className="aspect-[4/3] rounded-[14px]"
                    imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                  >
                    {ages && (
                      <span className={`${DISPLAY} absolute left-3 top-3 inline-flex min-h-9 items-center rounded-full bg-white/90 px-3.5 text-[16px] font-bold text-[#171512] ring-1 ring-black/[0.06] backdrop-blur-md`}>
                        {ages}
                      </span>
                    )}
                  </KitPhoto>
                ) : (
                  ages && (
                    <p className={`${DISPLAY} flex h-28 items-end rounded-[14px] bg-(--tpl-accent-50) p-4 text-[40px] font-bold leading-none tracking-[-0.04em] text-(--tpl-accent-ink)`}>
                      {ages}
                    </p>
                  )
                )}
                <div className="flex flex-1 flex-col px-3 pb-3 pt-5 @3xl:px-4">
                  <h3 className={`${TYPE_S.h3} ${C.ink}`}>{name}</h3>
                  {field(g, 'schedule') && (
                    <p className={`mt-2 flex items-center gap-2 text-[14px] ${C.ink}`}>
                      <Clock aria-hidden className="h-4 w-4 shrink-0 text-(--tpl-accent-ink)" />
                      {field(g, 'schedule')}
                    </p>
                  )}
                  {field(g, 'focus') && <p className={`mt-3 text-[14.5px] leading-relaxed ${C.muted}`}>{field(g, 'focus')}</p>}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
                    {field(g, 'price') && (
                      <p className={`flex items-center gap-2 ${DISPLAY} text-[16px] font-semibold tabular-nums ${C.ink}`}>
                        <Wallet aria-hidden className="h-4 w-4 shrink-0 text-(--tpl-accent-ink)" />
                        {field(g, 'price')}
                      </p>
                    )}
                    <ButtonLink action={action} label={buttonLabel} variant="ghost" size="md" aria-label={`${buttonLabel} kelompok ${name}`} />
                  </div>
                </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
