// Alumni (kunci `testimonials`) + Bursa Kerja Khusus (kunci `careers`).
// Alumni: kepala section, lalu kartu angka sorotan berwarna tema (mis. "86% lulusan bekerja/kuliah/berwirausaha") di
// samping kartu cerita alumni (foto bulat, nama, angkatan, kutipan, baris "Sekarang"). BKK: daftar lowongan bergaris
// tipis seperti tabel (referensi Horizon Estate: baris meta) — posisi, perusahaan, lokasi, chip jenis & jurusan, batas
// lamaran, tombol "Lamar via BKK" (WhatsApp berisi posisi & perusahaan); catatan anti-penipuan + tombol daftar alumni.
import { BriefcaseBusiness, CalendarClock, MapPin, ShieldCheck } from 'lucide-react';
import { WhatsAppIcon } from '../shared/icons';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import { KitAvatar } from '../kit/Photo';
import { careerMessage, displayDate, parseSchoolDate, type CakrawalaModel } from './model';
import { BTN, C, CARD, DISPLAY, SECTION_PAD, TYPE_C } from './styles';
import { PillLink, SectionHead } from './ui';

export function Alumni({ m }: { m: CakrawalaModel }) {
  const { testimonials } = m;
  const items = list(testimonials, 'items', 6).filter((item) => field(item, 'quote') || field(item, 'name'));
  if (items.length === 0) return null;
  const statValue = text(testimonials, 'stat_value');
  const statLabel = text(testimonials, 'stat_label');
  const hasStat = !!(statValue || statLabel);
  const cols = hasStat ? (items.length >= 3 ? '@6xl:grid-cols-4' : '@6xl:grid-cols-3') : items.length >= 3 ? '@6xl:grid-cols-3' : '';

  return (
    <TemplateSection sectionKey="testimonials" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title')} subtitle={text(testimonials, 'subtitle')} />
        <ul className={`mt-10 grid gap-3 @2xl:grid-cols-2 @3xl:mt-14 @3xl:gap-4 ${cols}`}>
          {hasStat && (
            <Reveal as="li" data-tpl-tone="inverse" className="flex flex-col justify-between gap-10 rounded-[22px] bg-(--tpl-accent) p-6 text-(--tpl-on-accent) @3xl:p-7">
              <BriefcaseBusiness aria-hidden className="h-8 w-8 opacity-80" strokeWidth={1.5} />
              <p>
                {statValue && (
                  <span className={`block ${DISPLAY} text-[52px] font-bold leading-none tracking-[-0.04em] tabular-nums @3xl:text-[60px]`}>
                    <CountUp value={statValue} />
                  </span>
                )}
                {statLabel && <span className="mt-3 block text-[15px] font-medium leading-snug opacity-90">{statLabel}</span>}
              </p>
            </Reveal>
          )}
          {items.map((item, i) => {
            const name = field(item, 'name');
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i + 1, 70)} className={`flex flex-col p-6 @3xl:p-7 ${CARD.panel}`}>
                <figure className="flex h-full flex-col">
                  <div className="flex items-center gap-3.5">
                    <KitAvatar name={name} photo={field(item, 'photo')} sizes="56px" className="h-14 w-14" />
                    <figcaption className="min-w-0">
                      {name && <span className={`block ${DISPLAY} text-[16px] font-semibold leading-snug ${C.ink}`}>{name}</span>}
                      {field(item, 'class') && <span className={`block text-[13px] ${C.muted}`}>{field(item, 'class')}</span>}
                    </figcaption>
                  </div>
                  {field(item, 'quote') && (
                    <blockquote className={`mt-5 text-pretty ${TYPE_C.body} ${C.ink}`}>
                      <p>“{field(item, 'quote')}”</p>
                    </blockquote>
                  )}
                  {field(item, 'now') && <div aria-hidden className="min-h-6 flex-1" />}
                  {field(item, 'now') && (
                    <p className={`flex items-start gap-2.5 border-t border-black/[0.08] pt-4 text-[13.5px] font-medium leading-snug ${C.ink}`}>
                      <span className="sr-only">Sekarang: </span>
                      <BriefcaseBusiness aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-(--ck-ink)" strokeWidth={1.8} />
                      {field(item, 'now')}
                    </p>
                  )}
                </figure>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

export function Careers({ m }: { m: CakrawalaModel }) {
  const { careers } = m;
  const items = list(careers, 'items', 10).filter((item) => field(item, 'position'));
  if (items.length === 0) return null;
  const applyLabel = text(careers, 'apply_label') || 'Lamar via BKK';
  const note = text(careers, 'note');
  const buttonLabel = text(careers, 'button_label');
  const buttonAction = m.linkOr(text(careers, 'button_url'), m.waWith(`Halo BKK ${m.companyName}, saya ingin mendaftar sebagai alumni di Bursa Kerja Khusus.`) ?? m.startAction);

  return (
    <TemplateSection sectionKey="careers" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(careers, 'eyebrow')} title={text(careers, 'title')} subtitle={text(careers, 'subtitle')} />
        <ul className={`mt-10 divide-y divide-black/[0.07] @3xl:mt-12 ${CARD.white}`}>
          {items.map((item, i) => {
            const position = field(item, 'position');
            const company = field(item, 'company');
            const deadline = field(item, 'deadline');
            const date = parseSchoolDate(deadline);
            const action = m.linkOr(field(item, 'url'), m.waWith(careerMessage(m.companyName, item)) ?? m.startAction);
            const chips = [field(item, 'type'), field(item, 'program')].filter(Boolean);
            return (
              <Reveal
                as="li"
                key={`${position}-${company}-${i}`}
                delay={stagger(i, 50)}
                className="grid gap-4 p-5 @3xl:grid-cols-12 @3xl:items-center @3xl:gap-6 @3xl:px-7 @3xl:py-6"
              >
                <div className="min-w-0 @3xl:col-span-5">
                  <h3 className={`${C.ink} ${TYPE_C.h3}`}>{position}</h3>
                  <p className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] ${C.muted}`}>
                    {company && <span className="font-medium text-[#0D1830]">{company}</span>}
                    {field(item, 'location') && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin aria-hidden className="h-3.5 w-3.5" />
                        {field(item, 'location')}
                      </span>
                    )}
                  </p>
                </div>
                {chips.length > 0 && (
                  <p className="flex flex-wrap gap-1.5 @3xl:col-span-3">
                    {chips.map((chip, ci) => (
                      <span key={chip} className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${ci === 0 ? `bg-[#F3F6FA] ${C.ink}` : 'bg-(--ck-tint) text-(--ck-ink)'}`}>
                        {chip}
                      </span>
                    ))}
                  </p>
                )}
                <p className={`flex items-center gap-1.5 text-[13.5px] ${C.muted} ${chips.length ? '@3xl:col-span-2' : '@3xl:col-span-5'}`}>
                  {deadline && (
                    <>
                      <CalendarClock aria-hidden className="h-4 w-4 shrink-0" />
                      <span>
                        Hingga{' '}
                        {date ? (
                          <time dateTime={date.iso} className="font-medium text-[#0D1830]">
                            {date.label}
                          </time>
                        ) : (
                          <span className="font-medium text-[#0D1830]">{displayDate(deadline)}</span>
                        )}
                      </span>
                    </>
                  )}
                </p>
                {action && (
                  <div className="@3xl:col-span-2 @3xl:flex @3xl:justify-end">
                    <ActionLink
                      action={action}
                      aria-label={`${applyLabel} untuk posisi ${position}${company ? ` di ${company}` : ''}`}
                      className={`${BTN.outline} ${BTN.plain} h-10 gap-2 text-[13.5px]`}
                    >
                      {action.kind === 'external' && /wa\.me/.test(action.href) && <WhatsAppIcon className="h-4 w-4 shrink-0" />}
                      {applyLabel}
                    </ActionLink>
                  </div>
                )}
              </Reveal>
            );
          })}
        </ul>
        {(note || (buttonAction && buttonLabel)) && (
          <div className="mt-6 flex flex-col gap-5 @3xl:flex-row @3xl:items-center @3xl:justify-between">
            {note && (
              <p className={`flex max-w-[64ch] items-start gap-2.5 text-[14px] ${C.muted}`}>
                <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-(--ck-ink)" />
                {note}
              </p>
            )}
            <PillLink action={buttonAction} label={buttonLabel} dot="white" className={`${BTN.ink} ${BTN.md} self-start @3xl:self-auto`} />
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
