// Ketersediaan lapangan (kunci `availability`): kepala section + kartu harga sewa per jam; pilihan hari (tablist,
// panah kiri/kanan, jumlah slot kosong per hari); tabel lapangan × jam (tombol per sel dengan roving tabindex: panah
// memindah fokus, Enter/Spasi memilih; sel penuh aria-disabled berarsir); legenda; bilah booking yang menyusun pesan
// WhatsApp untuk slot terpilih. JUJUR: data contoh dari CMS (bukan sistem booking), konfirmasi oleh admin, tanpa
// pembayaran online. HP 390: chip hari bergulir mendatar di dalam wadahnya, tabel 6 jam muat tanpa gulir halaman.
import { Check, Info } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { WhatsAppIcon } from '../shared/icons';
import { field, list, text } from '../shared/utils';
import { bookingMessage, slotKey, type SmashModel } from './model';
import { BTN, C, DISPLAY, SECTION_PAD, TYPE_S } from './styles';
import { ButtonLink, SectionHead } from './ui';

interface Slot {
  court: number;
  hour: string;
}

function PriceCard({ m }: { m: SmashModel }) {
  const prices = list(m.availability, 'prices', 3).filter((p) => field(p, 'label') || field(p, 'price'));
  if (prices.length === 0) return null;
  return (
    <dl className={`w-full divide-y divide-[#171512]/10 rounded-[20px] px-5 py-2 @5xl:max-w-[400px] ${C.sand}`}>
      {prices.map((p, i) => (
        <div key={`${field(p, 'label')}-${i}`} className="flex items-baseline justify-between gap-4 py-3">
          <dt className={`text-[14px] ${C.muted}`}>{field(p, 'label')}</dt>
          <dd className={`${DISPLAY} whitespace-nowrap text-[16px] font-semibold tabular-nums ${C.ink}`}>{field(p, 'price')}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Availability({ m }: { m: SmashModel }) {
  const { availability, courts, hours, days } = m;
  const baseId = useId();
  const [day, setDay] = useState(m.today);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [focus, setFocus] = useState<[number, number]>([0, 0]);
  const cells = useRef(new Map<string, HTMLButtonElement | null>());
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const dayIndex = Math.min(day, days.length - 1);
  const full = m.fullByDay[dayIndex] ?? new Set<string>();
  const dayLabel = field(days[dayIndex], 'label');
  const freeCount = (i: number) => courts.length * hours.length - (m.fullByDay[i]?.size ?? 0);

  const pickDay = (i: number) => {
    const next = (i + days.length) % days.length;
    setDay(next);
    setSelected(null);
    tabs.current[next]?.focus();
  };
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const moves: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: days.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    pickDay(moves[e.key]);
  };

  const onCellKey = (e: KeyboardEvent<HTMLButtonElement>, r: number, c: number) => {
    const moves: Record<string, [number, number]> = {
      ArrowRight: [r, Math.min(c + 1, hours.length - 1)],
      ArrowLeft: [r, Math.max(c - 1, 0)],
      ArrowDown: [Math.min(r + 1, courts.length - 1), c],
      ArrowUp: [Math.max(r - 1, 0), c],
      Home: [r, 0],
      End: [r, hours.length - 1],
    };
    const next = moves[e.key];
    if (!next) return;
    e.preventDefault();
    setFocus(next);
    cells.current.get(`${next[0]}|${next[1]}`)?.focus();
  };

  const [fr, fc] = [Math.min(focus[0], courts.length - 1), Math.min(focus[1], hours.length - 1)];
  const chosen = selected && !full.has(slotKey(selected.court, selected.hour)) ? selected : null;
  const chosenCourt = chosen ? courts[chosen.court] : null;
  const action = chosen && chosenCourt ? m.waWith(bookingMessage(m.companyName, dayLabel, chosen.hour, chosenCourt.name)) : null;
  const note = text(availability, 'note');
  const panelId = `${baseId}-panel`;

  return (
    <TemplateSection sectionKey="availability" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead
          eyebrow={text(availability, 'eyebrow')}
          title={text(availability, 'title')}
          subtitle={text(availability, 'subtitle')}
          srTitle="Ketersediaan lapangan"
          aside={<PriceCard m={m} />}
        />

        <Reveal className="mt-10 @3xl:mt-12">
          {/* Pilihan hari: bergulir mendatar di HP (gulir di dalam wadah ini, bukan halaman) */}
          <div className="-mx-5 overflow-x-auto px-5 pb-1 @2xl:-mx-8 @2xl:px-8 @5xl:mx-0 @5xl:px-0">
            <div role="tablist" aria-label="Pilih hari" className="flex w-max gap-2 @5xl:w-full">
              {days.map((d, i) => {
                const current = i === dayIndex;
                return (
                  <button
                    key={`${field(d, 'label')}-${i}`}
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    id={`${baseId}-tab-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={current}
                    aria-controls={panelId}
                    tabIndex={current ? 0 : -1}
                    onClick={() => pickDay(i)}
                    onKeyDown={(e) => onTabKey(e, i)}
                    className={`flex min-h-14 min-w-[92px] flex-col items-start justify-center rounded-xl px-4 py-2 text-left transition-colors duration-200 @5xl:flex-1 ${
                      current ? 'bg-[#171512] text-white' : `bg-white ring-1 ring-inset ring-[#171512]/15 hover:ring-[#171512]/40 ${C.ink}`
                    }`}
                  >
                    <span className={`${DISPLAY} text-[14.5px] font-semibold leading-tight`}>
                      {field(d, 'label')}
                      {i === m.today && days.length === 7 && <span className="sr-only"> (hari ini)</span>}
                    </span>
                    <span className={`mt-0.5 flex items-center gap-1.5 text-[12px] ${current ? 'text-white/75' : C.muted}`}>
                      {i === m.today && days.length === 7 && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-(--tpl-accent)" />}
                      {freeCount(i)} {m.labels.free.toLowerCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        <Reveal delay={80} className="mt-5">
          <div id={panelId} role="tabpanel" aria-labelledby={`${baseId}-tab-${dayIndex}`} className="rounded-[20px] border border-[#171512]/10 p-2.5 @3xl:p-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[300px] border-separate border-spacing-[3px] @3xl:border-spacing-1.5">
                <caption className="sr-only">{`Ketersediaan lapangan hari ${dayLabel} (contoh)`}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-11 @3xl:w-28">
                      <span className="sr-only">Lapangan</span>
                    </th>
                    {hours.map((hour) => (
                      <th key={hour} scope="col" className={`${DISPLAY} pb-1 text-[12px] font-semibold tabular-nums @3xl:text-[13px] ${C.muted}`}>
                        {hour}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody key={dayIndex}>
                  {courts.map((court, r) => (
                    <tr key={`${court.short}-${r}`}>
                      <th scope="row" className={`pr-1 text-left ${C.ink}`}>
                        <span className={`${DISPLAY} text-[13px] font-semibold @3xl:hidden`} aria-hidden>
                          {court.short}
                        </span>
                        <span className="sr-only @3xl:not-sr-only @3xl:text-[14px] @3xl:font-medium">{court.name}</span>
                      </th>
                      {hours.map((hour, c) => {
                        const isFull = full.has(slotKey(r, hour));
                        const isChosen = !!chosen && chosen.court === r && chosen.hour === hour;
                        return (
                          <td key={hour} className="p-0">
                            <button
                              ref={(el) => {
                                cells.current.set(`${r}|${c}`, el);
                              }}
                              type="button"
                              tabIndex={r === fr && c === fc ? 0 : -1}
                              aria-disabled={isFull || undefined}
                              aria-pressed={isFull ? undefined : isChosen}
                              aria-label={`${court.name}, ${hour}, ${(isFull ? m.labels.full : isChosen ? m.labels.chosen : m.labels.free).toLowerCase()}`}
                              data-slot={isFull ? 'full' : isChosen ? 'chosen' : 'free'}
                              onFocus={() => setFocus([r, c])}
                              onKeyDown={(e) => onCellKey(e, r, c)}
                              onClick={() => {
                                setFocus([r, c]);
                                if (!isFull) setSelected(isChosen ? null : { court: r, hour });
                              }}
                              className={`flex h-11 w-full min-w-10 items-center justify-center rounded-lg transition-colors duration-200 ${
                                isFull
                                  ? 'sh-hatch cursor-not-allowed bg-[#F6F5F3]'
                                  : isChosen
                                    ? 'bg-(--tpl-accent) text-(--tpl-on-accent)'
                                    : 'bg-(--tpl-accent-50) ring-1 ring-inset ring-(--tpl-accent-200) hover:bg-(--tpl-accent-100)'
                              }`}
                            >
                              {isChosen ? (
                                <Check aria-hidden className="h-4 w-4" strokeWidth={2.6} />
                              ) : isFull ? (
                                <span aria-hidden className="h-0.5 w-3 rounded-full bg-[#171512]/30" />
                              ) : (
                                <span aria-hidden style={{ '--sh-i': r + c } as CSSProperties} className="sh-dot h-2 w-2 rounded-full bg-(--tpl-accent)" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legenda + bilah booking */}
            <div className="mt-2 flex flex-col gap-4 border-t border-[#171512]/10 px-1.5 pb-1 pt-4 @4xl:flex-row @4xl:items-center @4xl:justify-between @4xl:px-2">
              <ul className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] ${C.muted}`}>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-md bg-(--tpl-accent-50) ring-1 ring-inset ring-(--tpl-accent-200)">
                    <span className="h-1.5 w-1.5 rounded-full bg-(--tpl-accent)" />
                  </span>
                  {m.labels.free}
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="sh-hatch h-5 w-5 rounded-md bg-[#F6F5F3]" />
                  {m.labels.full}
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-md bg-(--tpl-accent) text-(--tpl-on-accent)">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {m.labels.chosen}
                </li>
              </ul>
              <div className="flex flex-col gap-3 @xl:flex-row @xl:items-center" aria-live="polite">
                <p className={`text-[14.5px] ${chosen ? C.ink : C.muted}`}>
                  {chosen && chosenCourt ? (
                    <>
                      <span className={`${DISPLAY} font-semibold`}>{chosenCourt.name}</span>
                      {` · ${dayLabel} · ${chosen.hour}`}
                    </>
                  ) : (
                    'Pilih slot yang masih kosong.'
                  )}
                </p>
                {chosen && action ? (
                  <ButtonLink
                    action={action}
                    label={text(availability, 'button_label') || 'Booking via WhatsApp'}
                    size="md"
                    arrow={false}
                    icon={<WhatsAppIcon className="h-4 w-4 shrink-0" />}
                    className="w-full @xl:w-auto"
                  />
                ) : chosen && m.contactAction ? (
                  <ButtonLink action={m.contactAction} label="Isi formulir booking" size="md" className="w-full @xl:w-auto" />
                ) : (
                  <span aria-hidden className={`${BTN.primary} ${BTN.md} pointer-events-none hidden opacity-40 @xl:inline-flex`}>
                    <WhatsAppIcon className="h-4 w-4 shrink-0" />
                    {text(availability, 'button_label') || 'Booking via WhatsApp'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Reveal>

        {note && (
          <p className={`mt-4 flex max-w-[80ch] items-start gap-2 ${TYPE_S.small} ${C.muted}`}>
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {note}
          </p>
        )}
      </div>
    </TemplateSection>
  );
}
