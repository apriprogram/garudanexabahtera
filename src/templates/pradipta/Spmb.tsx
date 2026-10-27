// SPMB (kunci `spmb`, label CMS "PPDB/SPMB"): kepala 12 kolom (kiri label + H2 + deskripsi; kanan poin singkat bertanda
// centang, tombol portal SPMB provinsi yang dibuka di tab baru, dan catatan pengelola portal). Badan bertumpuk selebar
// container: kartu info dengan tab bersegmen Jalur · Jadwal · Syarat (role tablist/tab/tabpanel, panah kiri/kanan +
// Home/End, penunjuk putih yang bergeser seperti menu atas; panel lain `hidden` tetapi tetap di HTML), lalu kartu
// formulir tanya tiga langkah dua kolom (./SpmbForm). Website TIDAK menerima pendaftaran: pendaftaran tetap lewat portal
// provinsi.
import { Check, CircleCheck, Info } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, list, safeUrl, text } from '../shared/utils';
import { useIndicator } from './hooks';
import { parseSchoolDate, type PradiptaModel } from './model';
import { SpmbWizard } from './SpmbForm';
import { BAND, C, CARD, DISPLAY, SECTION_PAD, TYPE_P, cardOn } from './styles';
import { Head, PillLink } from './ui';

type TabId = 'paths' | 'schedule' | 'requirements';

function Note({ children }: { children: ReactNode }) {
  return (
    <p className={`mt-5 flex items-start gap-2 text-[13px] leading-snug ${C.muted}`}>
      <Info aria-hidden className="mt-px h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}

function InfoTabs({ m }: { m: PradiptaModel }) {
  const { spmb } = m;
  const tone = m.tone('spmb');
  const baseId = useId();
  const paths = list(spmb, 'paths', 6).filter((item) => field(item, 'name'));
  const schedule = list(spmb, 'schedule', 8).filter((item) => field(item, 'title') || field(item, 'date'));
  const requirements = list(spmb, 'requirements', 10).filter((item) => field(item, 'text'));
  const labels: Record<TabId, string> = {
    paths: text(spmb, 'tab_paths') || 'Jalur',
    schedule: text(spmb, 'tab_schedule') || 'Jadwal',
    requirements: text(spmb, 'tab_requirements') || 'Syarat',
  };
  const available = (
    [
      ['paths', paths.length],
      ['schedule', schedule.length],
      ['requirements', requirements.length],
    ] as [TabId, number][]
  )
    .filter(([, n]) => n > 0)
    .map(([id]) => id);
  const [current, setCurrent] = useState<TabId | null>(null);
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  const track = useRef<HTMLDivElement>(null);
  const selected = current && available.includes(current) ? current : (available[0] ?? null);
  useIndicator(track, selected);
  if (!selected) return null;

  const select = (id: TabId, focus = false) => {
    setCurrent(id);
    if (focus) tabRefs.current[id]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = available.indexOf(selected);
    const next: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: available.length - 1 };
    if (!(e.key in next)) return;
    e.preventDefault();
    select(available[(next[e.key] + available.length) % available.length], true);
  };

  const panels: Record<TabId, ReactNode> = {
    paths: (
      <>
        <ul className="grid gap-3 @xl:grid-cols-2 @5xl:grid-cols-4">
          {paths.map((item, i) => (
            <li key={`${field(item, 'name')}-${i}`} className={`${CARD.sky} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={`${C.ink} ${TYPE_P.h3}`}>{field(item, 'name')}</h3>
                {field(item, 'quota') && (
                  <span className="inline-flex h-7 items-center rounded-full bg-white px-2.5 text-[12.5px] font-semibold text-(--pd-ink)">{field(item, 'quota')}</span>
                )}
              </div>
              {field(item, 'text') && <p className={`mt-2 ${C.body} ${TYPE_P.small}`}>{field(item, 'text')}</p>}
            </li>
          ))}
        </ul>
        {text(spmb, 'paths_note') && <Note>{text(spmb, 'paths_note')}</Note>}
      </>
    ),
    schedule: (
      <>
        <ol className="relative ml-1.5 max-w-4xl border-l border-(--pd-ring)">
          {schedule.map((item, i) => {
            const raw = field(item, 'date');
            const date = parseSchoolDate(raw);
            return (
              <li key={`${field(item, 'title')}-${i}`} className="relative pb-6 pl-6 last:pb-0 @xl:grid @xl:grid-cols-[150px_minmax(0,1fr)] @xl:gap-5">
                <span aria-hidden className="absolute -left-[5.5px] top-1.5 h-2.5 w-2.5 rounded-full bg-(--tpl-accent)" />
                <p className={`${DISPLAY} text-[14px] font-medium leading-snug text-(--pd-ink)`}>{date ? <time dateTime={date.iso}>{date.label}</time> : raw}</p>
                <div className="mt-1 min-w-0 @xl:mt-0">
                  <h3 className={`text-[16px] font-semibold leading-snug ${C.ink}`}>{field(item, 'title')}</h3>
                  {field(item, 'text') && <p className={`mt-1 ${C.body} ${TYPE_P.small}`}>{field(item, 'text')}</p>}
                </div>
              </li>
            );
          })}
        </ol>
        {text(spmb, 'schedule_note') && <Note>{text(spmb, 'schedule_note')}</Note>}
      </>
    ),
    requirements: (
      <>
        {text(spmb, 'requirements_note') && <p className={`mb-4 ${C.body} ${TYPE_P.small}`}>{text(spmb, 'requirements_note')}</p>}
        <h3 className="sr-only">{labels.requirements}</h3>
        <ul className="grid gap-3 @3xl:grid-cols-2 @3xl:gap-x-10">
          {requirements.map((item, i) => (
            <li key={`${field(item, 'text')}-${i}`} className={`flex items-start gap-3 text-[15px] leading-relaxed ${C.ink}`}>
              <CircleCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-(--pd-ink)" strokeWidth={1.9} />
              {field(item, 'text')}
            </li>
          ))}
        </ul>
      </>
    ),
  };

  return (
    <Reveal className={`min-w-0 p-4 @3xl:p-8 ${cardOn(tone)}`}>
      {/* Lintasan bersegmen: penunjuk putih (useIndicator) di bawah tab terpilih */}
      <div ref={track} className="relative rounded-full bg-(--pd-sky2) p-0.5 @3xl:max-w-md">
        <span aria-hidden className="pd-ind pd-ind-tab absolute bottom-0.5 left-0 top-0.5 rounded-full bg-white" />
        <div
          role="tablist"
          aria-label="Informasi SPMB"
          onKeyDown={onKeyDown}
          className="grid"
          style={{ gridTemplateColumns: `repeat(${available.length}, minmax(0, 1fr))` }}
        >
          {available.map((tab) => {
            const isSelected = tab === selected;
            return (
              <button
                key={tab}
                ref={(el) => {
                  tabRefs.current[tab] = el;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab}`}
                data-pd-key={tab}
                aria-selected={isSelected}
                aria-controls={`${baseId}-panel-${tab}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => select(tab)}
                className={`relative z-10 h-11 truncate rounded-full px-3 text-[14px] transition-colors duration-200 ${
                  isSelected ? `font-semibold ${C.ink}` : `font-medium ${C.body} hover:text-[#0E1B2B]`
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>
      {available.map((tab) => (
        <div
          key={tab}
          role="tabpanel"
          id={`${baseId}-panel-${tab}`}
          aria-labelledby={`${baseId}-tab-${tab}`}
          hidden={tab !== selected}
          tabIndex={0}
          className="pd-step mt-6 rounded-[12px] px-1 pb-1"
        >
          {panels[tab]}
        </div>
      ))}
    </Reveal>
  );
}

export function Spmb({ m }: { m: PradiptaModel }) {
  const { spmb } = m;
  const tone = m.tone('spmb');
  const badges = list(spmb, 'badges', 3).filter((item) => field(item, 'text'));
  const portalHref = safeUrl(text(spmb, 'portal_url'));
  const portalNote = text(spmb, 'portal_note');
  const portal = portalHref ? (
    <PillLink action={{ kind: 'external', href: portalHref }} label={text(spmb, 'portal_label')} variant="primary" size="lg" external className="w-full @xl:w-auto" />
  ) : null;
  return (
    <TemplateSection sectionKey="spmb" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={CONTAINER}>
        <div className="grid gap-8 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10">
          <div className="min-w-0 @5xl:col-span-7">
            <Head
              sectionKey="spmb"
              layout="stack"
              eyebrow={text(spmb, 'eyebrow')}
              title={text(spmb, 'title')}
              fallback="Penerimaan murid baru"
              subtitle={text(spmb, 'subtitle')}
              tone={tone}
            />
          </div>
          {(badges.length > 0 || portal || portalNote) && (
            <Reveal delay={160} className="flex min-w-0 flex-col gap-4 @5xl:col-span-5 @5xl:items-end @5xl:text-right">
              {badges.length > 0 && (
                <ul className="flex flex-wrap gap-2 @5xl:justify-end">
                  {badges.map((item, i) => (
                    <li
                      key={`${field(item, 'text')}-${i}`}
                      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold text-(--pd-ink) ${tone === 'sky' ? 'bg-white' : 'bg-(--pd-sky2)'}`}
                    >
                      <Check aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={2.6} />
                      {field(item, 'text')}
                    </li>
                  ))}
                </ul>
              )}
              {portal}
              {portalNote && <p className={`max-w-[44ch] text-balance text-[13px] leading-snug ${C.muted}`}>{portalNote}</p>}
            </Reveal>
          )}
        </div>
        {/* Bertumpuk selebar container: kartu info bertab, lalu kartu formulir dua kolom (tinggi kolom tidak timpang
            saat tab berganti) */}
        <div className="mt-10 grid gap-6 @3xl:mt-12 @5xl:gap-8">
          <InfoTabs m={m} />
          <Reveal delay={120} className="min-w-0">
            <SpmbWizard m={m} />
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}
