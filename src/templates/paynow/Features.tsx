// Fitur (kunci `features`): tab QRIS / Transfer / Tagihan / Top-up. Kiri: label, H2, deskripsi, bilah tab berbentuk pil
// (pola tab WAI-ARIA: role tab/tablist/tabpanel, panah kiri/kanan/atas/bawah, Home/End, tab aktif bergradasi), lalu
// panel: judul, satu kalimat, tiga poin centang. Kanan: "panggung" = foto tegak 4:5 radius 28 milik tab aktif dengan
// mockup HP terang yang menimpa tepi kirinya; layar HP berganti per tab (jenis layar dipilih otomatis dari label:
// bingkai pindai QRIS, penerima transfer, daftar tagihan, pilihan nominal isi saldo). Foto & layar berganti dengan
// pudar ≤ 400 ms (./paynow.css, hanya bila gerak menyala). Panggung dekoratif (aria-hidden): isinya mengulang panel.
import { ChevronLeft, CircleCheck, Store } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, initials, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { paymentIcon, screenKind } from './icons';
import { splitTags, type PaynowModel } from './model';
import { PAYNOW_PHOTOS } from './photos';
import { C, DISPLAY, GRID_GAP, SECTION_PAD, TYPE } from './styles';
import { AutoIcon, CheckList, PhoneFrame, SectionHead } from './ui';

function ScreenButton({ label, push }: { label: string; push: boolean }) {
  if (!label) return null;
  return (
    <span className={`pn-grad ${push ? 'mt-auto' : ''} flex h-[3em] shrink-0 w-full items-center justify-center rounded-full text-[0.85em] font-semibold text-white ${DISPLAY}`}>{label}</span>
  );
}

function Amount({ value, className = '' }: { value: string; className?: string }) {
  if (!value) return null;
  return <p className={`text-center text-[1.85em] font-bold leading-tight tracking-[-0.02em] tabular-nums ${C.ink} ${DISPLAY} ${className}`}>{value}</p>;
}

/** Isi layar HP untuk satu tab fitur. */
function Screen({ item, source }: { item: ListItem; source: { label: string; value: string } }) {
  const label = field(item, 'label');
  const kind = screenKind(label);
  const title = field(item, 'screen_title');
  const amount = field(item, 'screen_amount');
  const note = field(item, 'screen_note');
  const lines = splitTags(field(item, 'screen_lines'));
  const button = field(item, 'screen_button');

  // Sumber dana (QRIS & transfer): label + saldo dari HP hero
  const funds = (source.label || source.value) && (
    <div className="mt-auto mb-[0.9em] flex items-center gap-[0.6em] rounded-[1em] bg-white px-[0.8em] py-[0.65em] ring-1 ring-inset ring-[#0E0F2C]/[0.07]">
      <span className="pn-grad flex h-[2em] w-[2em] shrink-0 items-center justify-center rounded-[0.6em] text-white">
        <AutoIcon name="topup" className="h-[1.05em] w-[1.05em]" strokeWidth={2} />
      </span>
      <span className={`min-w-0 flex-1 truncate text-[0.74em] font-semibold ${C.ink}`}>{source.label}</span>
      <span className={`shrink-0 text-[0.74em] font-semibold tabular-nums ${C.muted}`}>{source.value}</span>
    </div>
  );

  let body;
  if (kind === 'qris') {
    body = (
      <>
        <div className="relative mx-auto mt-[1.1em] flex aspect-square w-[11.5em] items-center justify-center rounded-[1.3em] bg-white ring-1 ring-inset ring-[#0E0F2C]/[0.07]">
          {(['left-[0.8em] top-[0.8em] border-l-[0.22em] border-t-[0.22em] rounded-tl-[0.6em]', 'right-[0.8em] top-[0.8em] border-r-[0.22em] border-t-[0.22em] rounded-tr-[0.6em]', 'bottom-[0.8em] left-[0.8em] border-b-[0.22em] border-l-[0.22em] rounded-bl-[0.6em]', 'bottom-[0.8em] right-[0.8em] border-b-[0.22em] border-r-[0.22em] rounded-br-[0.6em]'] as const).map((corner) => (
            <span key={corner} className={`absolute h-[1.8em] w-[1.8em] border-(--tpl-accent) ${corner}`} />
          ))}
          <AutoIcon name="qris" className="h-[6.2em] w-[6.2em] text-[#0E0F2C]/80" strokeWidth={1.4} />
          <span className="pn-grad absolute inset-x-[1.6em] top-1/2 h-[0.18em] rounded-full opacity-80" />
        </div>
        {note && (
          <p className={`mt-[1.1em] flex items-center justify-center gap-[0.4em] text-[0.78em] font-semibold ${C.muted}`}>
            <Store className="h-[1.2em] w-[1.2em] shrink-0" strokeWidth={2} />
            <span className="truncate">{note}</span>
          </p>
        )}
        <Amount value={amount} className="mt-[0.2em]" />
        {funds}
      </>
    );
  } else if (kind === 'transfer') {
    body = (
      <>
        {note && (
          <div className="mt-[1.1em] flex items-center gap-[0.7em] rounded-[1.1em] bg-white p-[0.8em] ring-1 ring-inset ring-[#0E0F2C]/[0.07]">
            <span className={`pn-grad flex h-[2.6em] w-[2.6em] shrink-0 items-center justify-center rounded-full text-[0.85em] font-bold text-white ${DISPLAY}`}>
              {initials(note, 'P')}
            </span>
            <span className={`min-w-0 truncate text-[0.85em] font-semibold ${C.ink}`}>{note}</span>
          </div>
        )}
        <Amount value={amount} className="mt-[1.6em]" />
        {lines.length > 0 && (
          <p className={`mx-auto mt-[0.8em] max-w-full truncate rounded-full bg-white px-[1em] py-[0.45em] text-[0.72em] font-medium ring-1 ring-inset ring-[#0E0F2C]/[0.07] ${C.muted}`}>{lines[0]}</p>
        )}
        {funds}
      </>
    );
  } else if (kind === 'bill') {
    body = (
      <>
        {lines.length > 0 && (
          <ul className="mt-[1.1em] divide-y divide-[#0E0F2C]/[0.07] rounded-[1.1em] bg-white px-[0.9em] ring-1 ring-inset ring-[#0E0F2C]/[0.07]">
            {lines.slice(0, 4).map((line) => (
              <li key={line} className="flex items-center gap-[0.6em] py-[0.7em]">
                <span className="flex h-[2.1em] w-[2.1em] shrink-0 items-center justify-center rounded-full bg-(--pn-mist) text-(--pn-ink)">
                  <AutoIcon name={paymentIcon(line)} className="h-[1.1em] w-[1.1em]" strokeWidth={2} />
                </span>
                <span className={`min-w-0 flex-1 truncate text-[0.78em] font-semibold ${C.ink}`}>{line}</span>
                <CircleCheck className="h-[1.2em] w-[1.2em] shrink-0 text-(--pn-ink)" strokeWidth={2.2} />
              </li>
            ))}
          </ul>
        )}
        {(note || amount) && (
          <div className="mt-[1em] flex items-end justify-between gap-[0.6em] px-[0.2em]">
            <span className={`min-w-0 truncate text-[0.74em] ${C.muted}`}>{note}</span>
            <span className={`shrink-0 text-[1.35em] font-bold tabular-nums ${C.ink} ${DISPLAY}`}>{amount}</span>
          </div>
        )}
      </>
    );
  } else if (kind === 'topup') {
    body = (
      <>
        <Amount value={amount} className="mt-[1.2em]" />
        {note && <p className={`mt-[0.3em] text-center text-[0.74em] ${C.muted}`}>{note}</p>}
        {lines.length > 0 && (
          <ul className="mt-[1.2em] grid grid-cols-2 gap-[0.5em]">
            {lines.slice(0, 6).map((line) => {
              const selected = line === amount;
              return (
                <li
                  key={line}
                  className={`flex h-[2.8em] items-center justify-center rounded-[0.9em] text-[0.78em] font-semibold tabular-nums ring-1 ring-inset ${
                    selected ? 'bg-white text-(--pn-ink) ring-2 ring-(--tpl-accent)' : `bg-white ring-[#0E0F2C]/[0.08] ${C.ink}`
                  }`}
                >
                  {line}
                </li>
              );
            })}
          </ul>
        )}
      </>
    );
  } else {
    body = (
      <>
        <Amount value={amount} className="mt-[1.2em]" />
        {note && <p className={`mt-[0.3em] text-center text-[0.74em] ${C.muted}`}>{note}</p>}
        {lines.length > 0 && (
          <ul className="mt-[1.1em] grid gap-[0.4em]">
            {lines.slice(0, 4).map((line) => (
              <li key={line} className={`rounded-[0.9em] bg-white px-[0.9em] py-[0.7em] text-[0.76em] font-medium ring-1 ring-inset ring-[#0E0F2C]/[0.07] ${C.ink}`}>
                {line}
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <div data-pn-screen={kind} className="pn-swap flex h-[35.6em] flex-col px-[1.1em] pb-[1.3em]">
      <p className={`relative flex h-[2.6em] items-center justify-center text-[0.9em] font-semibold ${C.ink} ${DISPLAY}`}>
        <ChevronLeft aria-hidden className="absolute left-0 h-[1.3em] w-[1.3em]" strokeWidth={2.2} />
        <span className="truncate px-[1.6em]">{title || label}</span>
      </p>
      {body}
      <ScreenButton label={button} push={!(funds && (kind === 'qris' || kind === 'transfer'))} />
    </div>
  );
}

export function Features({ m }: { m: PaynowModel }) {
  const { features } = m;
  const items = m.items('features');
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  if (items.length === 0) return null;
  const index = Math.min(active, items.length - 1);
  const current = items[index];
  const image = field(current, 'image');
  const points = splitTags(field(current, 'points')).slice(0, 3);

  const select = (i: number) => {
    const next = (i + items.length) % items.length;
    setActive(next);
    tabs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    select(map[e.key]);
  };

  return (
    <TemplateSection sectionKey="features" className={`${SECTION_PAD} bg-white`}>
      <div className={`${CONTAINER} grid gap-y-14 @5xl:grid-cols-12 @5xl:items-center ${GRID_GAP}`}>
        <div className="min-w-0 @5xl:col-span-5">
          <SectionHead eyebrow={text(features, 'eyebrow')} title={text(features, 'title')} subtitle={text(features, 'subtitle')} srTitle={text(features, 'eyebrow') || 'Fitur'} />
          <Reveal delay={200} className="mt-8 @3xl:mt-10">
            <div
              role="tablist"
              aria-label={text(features, 'eyebrow') || 'Fitur'}
              onKeyDown={onKeyDown}
              className="pn-scroll-x flex max-w-full gap-1 overflow-x-auto rounded-full bg-(--pn-mist) p-1 ring-1 ring-inset ring-[#0E0F2C]/[0.06] @xl:inline-flex"
            >
              {items.map((item, i) => {
                const selected = i === index;
                const label = field(item, 'label');
                return (
                  <button
                    key={`${label}-${i}`}
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`${baseId}-tab-${i}`}
                    aria-selected={selected}
                    aria-controls={`${baseId}-panel`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(i)}
                    className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-[14.5px] font-semibold whitespace-nowrap transition-colors duration-200 @3xl:px-4 ${DISPLAY} ${
                      selected ? 'pn-grad text-white' : 'text-[#0E0F2C]/75 hover:bg-white hover:text-[#0E0F2C]'
                    }`}
                  >
                    <AutoIcon name={paymentIcon(label)} className="hidden h-[18px] w-[18px] @3xl:block" strokeWidth={2} />
                    {label}
                  </button>
                );
              })}
            </div>
          </Reveal>
          <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${index}`} tabIndex={0} className="mt-8 rounded-[16px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--tpl-accent)">
            <div key={index} className="pn-swap">
              {field(current, 'title') && <h3 className={`${DISPLAY} text-[24px] font-bold leading-tight tracking-[-0.02em] @3xl:text-[28px] ${C.ink}`}>{field(current, 'title')}</h3>}
              {field(current, 'text') && <p className={`mt-3 max-w-[46ch] text-pretty ${TYPE.body} ${C.muted} @3xl:text-[16px]`}>{field(current, 'text')}</p>}
              <CheckList items={points} className="mt-6" />
            </div>
          </div>
        </div>

        <Reveal variant="fade" delay={120} aria-hidden className="min-w-0 @5xl:col-span-6 @5xl:col-start-7">
          <div className="relative pb-10 pl-[30%] @xl:pl-[24%] @3xl:pb-12 @3xl:pl-[18%] @5xl:pl-[64px]">
            {hasImage(image) ? (
              <KitPhoto
                key={`${image}-${index}`}
                src={image}
                alt={PAYNOW_PHOTOS.alt(image, `Contoh penggunaan fitur ${field(current, 'label')}`)}
                fallback="tint"
                sizes="(min-width: 1024px) 42vw, (min-width: 768px) 70vw, 100vw"
                className="pn-swap aspect-[4/5] w-full rounded-[28px]"
              />
            ) : (
              <div className="pn-grad aspect-[4/5] w-full rounded-[28px] opacity-90" />
            )}
            <div className="absolute bottom-0 left-0 text-[7.6px] @xl:text-[9.5px] @3xl:text-[10.5px] @6xl:text-[11.5px]">
              <PhoneFrame label="Contoh layar fitur">
                <Screen key={index} item={current} source={{ label: text(m.hero, 'balance_label'), value: text(m.hero, 'balance') }} />
              </PhoneFrame>
            </div>
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
