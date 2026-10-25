// Pengumuman (kunci `announcements`) + Agenda (kunci `agenda`): dua section yang berdampingan di layar lebar (7 + 5
// kolom) dan bertumpuk di HP; masing-masing tetap section sendiri (bisa disembunyikan). Pengumuman: baris bergaris tipis
// dengan blok tanggal krem, judul H3, lencana (mis. "Penting", merah lembut), isi, dan tautan opsional. Agenda: kartu
// krem berisi kegiatan dengan pil tanggal, waktu, tempat, dan chip kategori.
import { ArrowRight, Clock, MapPin } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, isEnabled, list, resolveAction, text } from '../shared/utils';
import { parseSchoolDate, type MadaniModel } from './model';
import { DateText } from './News';
import { C, DISPLAY, SECTION_PAD, TYPE_M } from './styles';
import { Chip, Eyebrow } from './ui';

function Head({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      {eyebrow && (
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
      )}
      {title && (
        <Reveal as="h2" delay={60} className={`${eyebrow ? 'mt-4' : ''} text-balance text-(--md-deep) ${TYPE_M.h2}`}>
          {title}
        </Reveal>
      )}
    </>
  );
}

function Announcements({ m, wide }: { m: MadaniModel; wide: boolean }) {
  const { announcements: a } = m;
  const items = list(a, 'items', 8).filter((item) => field(item, 'title'));
  return (
    <TemplateSection sectionKey="announcements" className={`min-w-0 ${wide ? '@5xl:col-span-12' : '@5xl:col-span-7'}`}>
      <Head eyebrow={text(a, 'eyebrow')} title={text(a, 'title')} />
      <ul className="mt-8 border-t border-black/[0.08]">
        {items.map((item, i) => {
          const date = parseSchoolDate(field(item, 'date'));
          const badge = field(item, 'badge');
          const link = resolveAction(field(item, 'url'), null);
          return (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 50)} className="flex gap-4 border-b border-black/[0.08] py-5 @3xl:gap-5">
              {date ? (
                <time
                  dateTime={date.iso}
                  className="flex h-[68px] w-[60px] shrink-0 flex-col items-center justify-center rounded-[16px] bg-[#F6F4EC] text-(--md-deep)"
                >
                  <span className={`${DISPLAY} text-[24px] leading-none tabular-nums`}>{date.day}</span>
                  <span className={`mt-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] ${C.muted}`}>
                    {date.month} {date.year.slice(2)}
                  </span>
                </time>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {badge && (
                    <span data-announcement-badge="" className="inline-flex h-6 items-center rounded-full bg-[#FDECEA] px-2.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#9B1C1C]">
                      {badge}
                    </span>
                  )}
                  {!date && field(item, 'date') && <span className={`text-[13px] font-medium ${C.muted}`}>{field(item, 'date')}</span>}
                </div>
                <h3 className={`${badge || (!date && field(item, 'date')) ? 'mt-1.5' : ''} text-[16.5px] font-semibold leading-snug text-(--md-deep)`}>{field(item, 'title')}</h3>
                {field(item, 'text') && <p className={`mt-1 text-[14.5px] leading-relaxed ${C.muted}`}>{field(item, 'text')}</p>}
                {link && (
                  <ActionLink action={link} className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold text-(--md-ink)">
                    Lihat detail
                    <span className="sr-only">: {field(item, 'title')}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </ActionLink>
                )}
              </div>
            </Reveal>
          );
        })}
      </ul>
    </TemplateSection>
  );
}

function Agenda({ m, wide }: { m: MadaniModel; wide: boolean }) {
  const { agenda: a } = m;
  const items = list(a, 'items', 8).filter((item) => field(item, 'title'));
  return (
    <TemplateSection sectionKey="agenda" className={`min-w-0 ${wide ? '@5xl:col-span-12' : '@5xl:col-span-5'}`}>
      <div className="rounded-[28px] bg-[#F6F4EC] p-5 @3xl:p-8">
        <Head eyebrow={text(a, 'eyebrow')} title={text(a, 'title')} />
        <ul className="mt-6 space-y-3">
          {items.map((item, i) => {
            const raw = field(item, 'date');
            const date = parseSchoolDate(raw);
            return (
              <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 50)} className="rounded-[20px] bg-white p-4 ring-1 ring-inset ring-black/[0.05] @3xl:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {raw && (
                    <span className="inline-flex h-7 items-center rounded-full bg-(--md-deep) px-3 text-[12.5px] font-semibold text-white">
                      {date ? (
                        <time dateTime={date.iso}>
                          {date.weekday}, {date.short}
                        </time>
                      ) : (
                        <DateText raw={raw} />
                      )}
                    </span>
                  )}
                  {field(item, 'category') && <Chip tone="tint">{field(item, 'category')}</Chip>}
                </div>
                <h3 className="mt-3 text-[16px] font-semibold leading-snug text-(--md-deep)">{field(item, 'title')}</h3>
                {(field(item, 'time') || field(item, 'place')) && (
                  <p className={`mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] ${C.muted}`}>
                    {field(item, 'time') && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-(--md-ink)" aria-hidden />
                        {field(item, 'time')}
                      </span>
                    )}
                    {field(item, 'place') && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-(--md-ink)" aria-hidden />
                        {field(item, 'place')}
                      </span>
                    )}
                  </p>
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

/** Pengumuman & agenda: berdampingan bila keduanya tampil dan berisi; satu saja → selebar penuh. */
export function Board({ m }: { m: MadaniModel }) {
  const showA = isEnabled(m.announcements) && list(m.announcements, 'items').some((item) => field(item, 'title'));
  const showB = isEnabled(m.agenda) && list(m.agenda, 'items').some((item) => field(item, 'title'));
  if (!showA && !showB) return null;
  const wide = !(showA && showB);
  return (
    <div className={`${CONTAINER} ${SECTION_PAD} grid gap-12 @5xl:grid-cols-12 @5xl:items-start @5xl:gap-12`}>
      {showA && <Announcements m={m} wide={wide} />}
      {showB && <Agenda m={m} wide={wide} />}
    </div>
  );
}
