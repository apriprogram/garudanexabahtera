// Jadwal & harga Sparring Padel (section `schedule`, latar putih). Layar lebar: kolom kiri (4/12) label "// JADWAL",
// H2, pengantar, empat fakta singkat (Buka, Lapangan, Durasi, Pemain) dan catatan "contoh, dikonfirmasi admin"; kolom
// kanan (8/12) PAPAN biru-malam radius 14: dua tab (Senin–Jumat / akhir pekan) dengan garis neon yang meluncur ke tab
// aktif dan berkilau sekali saat berganti, lalu baris sesi: nama sesi (chip mono neon), jam Saira, catatan kecil, harga
// per jam, dan tombol "Book" yang membuka WhatsApp berisi sesi itu. Tab: role=tablist, panah kiri/kanan, Home/End.
// Hanya satu daftar terisi → tanpa tab. HP: bertumpuk; baris sesi dua tingkat (jam & nama, lalu harga + Book); bila
// harga + Book tidak muat satu baris (mis. HP 320–360), Book turun ke bawah harga alih-alih menimpa satuan "/jam".
import { ArrowRight, Info } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, list, text, type LinkAction } from '../shared/utils';
import type { ListItem } from '../types';
import { scheduleMessage, scheduleRows, type SparringModel } from './model';
import { BTN, C, DISPLAY, GRID_GAP, MONO_LABEL, SECTION_PAD, TYPE } from './styles';
import { SectionHead } from './ui';

function Rows({ m, rows, dayLabel }: { m: SparringModel; rows: ListItem[]; dayLabel: string }) {
  const unit = text(m.schedule, 'price_unit');
  const bookLabel = text(m.schedule, 'book_label');
  return (
    <ul className="divide-y divide-white/10">
      {rows.map((row, i) => {
        const action = m.waWith(scheduleMessage(m.companyName, dayLabel, row, unit)) ?? m.bookAction;
        const label = field(row, 'label');
        const hint = field(row, 'hint');
        return (
          <li key={`${label}-${field(row, 'time')}-${i}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-5 @3xl:grid @3xl:grid-cols-[minmax(0,1fr)_auto_auto] @3xl:gap-x-8 @3xl:px-7">
            <div className="min-w-0 basis-full">
              <p className="flex flex-wrap items-center gap-2">
                {label && <span className={`${MONO_LABEL} text-[11px] text-(--sp-neon)`}>{label}</span>}
                {hint && <span className="rounded-full px-2 py-0.5 text-[11.5px] font-semibold text-white ring-1 ring-inset ring-(--sp-neon)/60">{hint}</span>}
              </p>
              {field(row, 'time') && <p className={`${DISPLAY} mt-1.5 text-[22px] font-semibold tabular-nums leading-tight text-white @3xl:text-[24px]`}>{field(row, 'time')}</p>}
            </div>
            <p className="min-w-0 text-white">
              <span className={TYPE.price}>{field(row, 'price')}</span>
              {unit && <span className="ml-1 text-[14px] text-white/65">{unit}</span>}
            </p>
            {action && bookLabel ? (
              <span>
                <BookLink action={action} label={bookLabel} session={[dayLabel, label, field(row, 'time')].filter(Boolean).join(' ')} />
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function BookLink({ action, label, session }: { action: LinkAction; label: string; session: string }) {
  return (
    <ActionLink
      action={action}
      aria-label={`${label} ${session}`}
      className={`${BTN.ghost} ${BTN.sm} gap-2 hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent) hover:ring-(--tpl-accent)`}
    >
      {label}
      <ArrowRight aria-hidden className="h-4 w-4" />
    </ActionLink>
  );
}

export function Schedule({ m }: { m: SparringModel }) {
  const s = m.schedule;
  const baseId = useId();
  const days = [
    { key: 'weekday' as const, label: text(s, 'weekday_label') || 'Hari kerja', rows: scheduleRows(s, 'weekday') },
    { key: 'weekend' as const, label: text(s, 'weekend_label') || 'Akhir pekan', rows: scheduleRows(s, 'weekend') },
  ].filter((d) => d.rows.length > 0);
  const [active, setActive] = useState(0);
  const [changed, setChanged] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.min(active, days.length - 1);
  const facts = list(s, 'facts', 4).filter((f) => field(f, 'value'));
  const note = text(s, 'note');

  const select = (i: number) => {
    const next = (i + days.length) % days.length;
    tabs.current[next]?.focus();
    if (next === index) return;
    setActive(next);
    setChanged((n) => n + 1);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: days.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    select(map[e.key]);
  };

  const day = days[index];
  return (
    <TemplateSection sectionKey="schedule" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className={`grid gap-y-10 @5xl:grid-cols-12 ${GRID_GAP}`}>
          <div className="min-w-0 @5xl:col-span-4">
            <SectionHead eyebrow={text(s, 'eyebrow')} title={text(s, 'title')} subtitle={text(s, 'subtitle')} srTitle="Jadwal & harga" />
            {facts.length > 0 && (
              <Reveal as="dl" delay={200} className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-[#0A1622]/[0.1] pt-6 @3xl:mt-10">
                {facts.map((f, i) => (
                  <div key={`${field(f, 'label')}-${i}`} className="min-w-0">
                    <dt className={`${MONO_LABEL} text-[11px] ${C.muted}`}>{field(f, 'label')}</dt>
                    <dd className={`${DISPLAY} mt-1 text-balance text-[17px] font-semibold leading-snug @3xl:text-[19px] ${C.ink}`}>{field(f, 'value')}</dd>
                  </div>
                ))}
              </Reveal>
            )}
            {note && (
              <p className={`mt-6 flex items-start gap-2 text-[13.5px] leading-snug ${C.muted}`}>
                <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-(--sp-ink)" />
                {note}
              </p>
            )}
          </div>

          {day && (
            <Reveal delay={120} className="min-w-0 @5xl:col-span-8">
              <div data-tpl-tone="inverse" className="overflow-hidden rounded-[14px] bg-(--sp-night) text-white">
                {days.length > 1 ? (
                  <div role="tablist" aria-label="Pilih hari" onKeyDown={onKey} className="relative grid grid-cols-2 border-b border-white/10">
                    {days.map((d, i) => (
                      <button
                        key={d.key}
                        ref={(el) => {
                          tabs.current[i] = el;
                        }}
                        type="button"
                        role="tab"
                        id={`${baseId}-tab-${d.key}`}
                        aria-selected={i === index}
                        aria-controls={`${baseId}-panel`}
                        tabIndex={i === index ? 0 : -1}
                        onClick={() => select(i)}
                        className={`${DISPLAY} flex min-h-14 items-center justify-center px-3 text-center text-[15px] font-semibold transition-colors duration-200 @3xl:text-[17px] ${
                          i === index ? 'text-white' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                    <span
                      aria-hidden
                      className="sp-tab-bar pointer-events-none absolute bottom-[-1px] left-0 h-[3px] w-1/2"
                      style={{ '--sp-tab': index } as CSSProperties}
                    >
                      <span key={changed} data-sweep={changed > 0 ? 'true' : 'false'} className="sp-tab-sweep absolute inset-0 rounded-full bg-(--tpl-accent)" />
                    </span>
                  </div>
                ) : (
                  <p className={`${DISPLAY} border-b border-white/10 px-5 py-4 text-[17px] font-semibold @3xl:px-7`}>{day.label}</p>
                )}
                <div
                  key={day.key}
                  id={`${baseId}-panel`}
                  role={days.length > 1 ? 'tabpanel' : undefined}
                  aria-labelledby={days.length > 1 ? `${baseId}-tab-${day.key}` : undefined}
                  className="sp-fade"
                >
                  <Rows m={m} rows={day.rows} dayLabel={day.label} />
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
