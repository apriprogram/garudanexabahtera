// Pilih tanamanmu (kunci `bundles`): judul terpusat, tombol pilihan tanaman (role="tablist", panah kiri/kanan, Home/End),
// lalu panel data hijau tua ala referensi Agroton untuk tanaman terpilih: foto dengan chip tingkat kesulitan, tempat,
// dan perkiraan panen; isi paket dengan harga per barang; grafik garis waktu "Jadwal tanam" di kartu krem; total harga
// + hemat; tombol pesan (WhatsApp berisi nama paket) dan tanya penyuluh. Demo sisi klien, tanpa keranjang.
// HP: tombol tanaman bisa digeser, foto di atas, isi paket satu kolom.
import { CalendarDays, Check, MapPin, MessageCircle, Signal } from 'lucide-react';
import { useId, useRef, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import type { ListItem } from '../types';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { usePageSelection } from './hooks';
import { LeafArt } from './marks';
import { bundleLines, formatWeeks, savings, stageLines, type TaniModel } from './model';
import { TANI_PHOTOS } from './photos';
import { BTN, C, CARD, DISPLAY, TYPE_T } from './styles';
import { CropIcon, Highlighted, PillLink, SectionLabel } from './ui';

/** Warna batang tahap: hijau bertingkat, tahap terakhir (biasanya panen) warna aksen. */
const STAGE_COLORS = ['bg-[#1E3A16]', 'bg-[#3E6230]', 'bg-[#6B8F4E]', 'bg-[#8FAE6E]', 'bg-[#4F6B3A]'];

function Timeline({ raw }: { raw: string }) {
  const stages = stageLines(raw);
  if (stages.length === 0) return null;
  const total = stages[stages.length - 1].start + stages[stages.length - 1].weeks;
  const pct = (weeks: number) => `${(weeks / total) * 100}%`;
  return (
    <div className="rounded-[22px] bg-[#F6F2E3] p-5 text-[#18230F] @3xl:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[15px] font-semibold">Jadwal tanam</p>
        <p className={`text-[13px] ${C.muted}`}>Total ± {formatWeeks(total)} minggu dari semai</p>
      </div>
      <ol aria-label="Jadwal tanam per tahap" className="mt-4 space-y-3 @xl:space-y-2.5">
        {stages.map((stage, i) => {
          const last = i === stages.length - 1;
          const from = formatWeeks(stage.start + 1);
          const to = formatWeeks(stage.start + stage.weeks);
          return (
            <li key={`${stage.label}-${i}`} className="grid gap-1.5 @xl:grid-cols-[minmax(0,10rem)_1fr] @xl:items-center @xl:gap-3">
              <span className="text-[13px] font-medium leading-tight @xl:truncate @3xl:text-[14px]">{stage.label}</span>
              <span className="relative block h-7 rounded-full bg-[#ECE6CF]">
                <span
                  aria-hidden
                  className={`absolute inset-y-0 flex min-w-7 items-center justify-end rounded-full pr-2 text-[11.5px] font-semibold tabular-nums ${
                    last ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : `${STAGE_COLORS[i % STAGE_COLORS.length]} text-white`
                  }`}
                  style={{ left: pct(stage.start), width: pct(stage.weeks) }}
                >
                  {formatWeeks(stage.weeks)}
                </span>
                <span className="sr-only">
                  {stage.weeks <= 1 ? `minggu ke-${to}` : `minggu ke-${from} sampai ${to}`} ({formatWeeks(stage.weeks)} minggu)
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <div aria-hidden className={`mt-2 grid gap-3 text-[11.5px] tabular-nums @xl:grid-cols-[minmax(0,10rem)_1fr] ${C.muted}`}>
        <span className="hidden @xl:block" />
        <span className="flex justify-between">
          <span>Mgg 0</span>
          <span>{formatWeeks(Math.round(total / 2))}</span>
          <span>{formatWeeks(total)}</span>
        </span>
      </div>
    </div>
  );
}

function BundlePanel({ m, item }: { m: TaniModel; item: ListItem }) {
  const crop = field(item, 'crop');
  const title = field(item, 'title') || crop;
  const image = field(item, 'image');
  const level = field(item, 'level');
  const place = field(item, 'place');
  const harvest = field(item, 'harvest');
  const contents = bundleLines(field(item, 'contents'));
  const price = field(item, 'price');
  const compare = field(item, 'compare_price');
  const saved = savings(price, compare);
  const action = resolveAction(field(item, 'button_url'), m.orderAbout(title));
  const askLabel = text(m.bundles, 'ask_label');
  const ask = askLabel ? m.askAbout(title) : null;
  const chips = [
    level && { key: 'level', icon: Signal, value: level },
    place && { key: 'place', icon: MapPin, value: place },
  ].filter((chip): chip is Exclude<typeof chip, '' | false> => !!chip);

  return (
    <div className="grid gap-6 @5xl:grid-cols-12 @5xl:gap-8">
      <div className="relative min-h-[260px] overflow-hidden rounded-[24px] bg-[#2C4E22] @2xl:min-h-[340px] @5xl:col-span-5 @5xl:min-h-[520px]">
        {hasImage(image) ? (
          <KitPhoto
            src={image}
            alt={TANI_PHOTOS.alt(image, title)}
            fallback="none"
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="absolute inset-0"
          />
        ) : (
          <LeafArt className="absolute -right-10 top-4 h-[110%] text-white/20" />
        )}
        {chips.length > 0 && (
          <ul className="absolute left-3 top-3 flex flex-wrap gap-2 pr-3">
            {chips.map(({ key, icon: Icon, value }) => (
              <li key={key} className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[12.5px] font-semibold text-[#18230F] backdrop-blur-md">
                <Icon aria-hidden className="h-3.5 w-3.5 text-[#1E3A16]" />
                {value}
              </li>
            ))}
          </ul>
        )}
        {harvest && (
          <p className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5 rounded-[16px] bg-[#13260E]/70 px-4 py-3 text-[14px] font-medium leading-snug text-white backdrop-blur-md">
            <CalendarDays aria-hidden className="h-[18px] w-[18px] shrink-0 text-(--tm-glow)" />
            {harvest}
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-col @5xl:col-span-7 @5xl:py-2">
        {crop && <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-(--tm-glow)">Paket {crop}</p>}
        <h3 className={`mt-2 text-white ${DISPLAY} text-[28px] leading-[1.08] tracking-[-0.025em] @3xl:text-[34px] @7xl:text-[38px]`}>{title}</h3>
        {field(item, 'description') && <p className={`mt-3 max-w-[60ch] text-white/80 ${TYPE_T.body} @3xl:text-[16px]`}>{field(item, 'description')}</p>}

        {contents.length > 0 && (
          <div className="mt-7">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/70">Isi paket</p>
            <ul className="mt-3 grid gap-x-8 gap-y-2.5 @3xl:grid-cols-2">
              {contents.map((line, i) => (
                <li key={`${line.name}-${i}`} className="flex items-start gap-3 py-1 text-[14.5px] leading-snug">
                  <span aria-hidden className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.12] text-(--tm-glow)">
                    <Check className="h-3 w-3" strokeWidth={2.75} />
                  </span>
                  <span className="min-w-0 flex-1 text-white/90">{line.name}</span>
                  {line.price && <span className="shrink-0 font-semibold tabular-nums text-white">{line.price}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-7">
          <Timeline raw={field(item, 'stages')} />
        </div>

        <div className="mt-auto flex flex-col gap-5 pt-8 @3xl:flex-row @3xl:items-end @3xl:justify-between">
          {price && (
            <div>
              <p className="text-[13px] text-white/70">Harga paket</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={`${TYPE_T.price} text-[34px] leading-none text-(--tm-glow) @3xl:text-[40px]`}>{price}</span>
                {compare && saved && <s className="text-[15px] text-white/60">{compare}</s>}
                {saved && <span className="rounded-full bg-(--tpl-accent) px-2.5 py-1 text-[12.5px] font-semibold text-(--tpl-on-accent)">Hemat {saved}</span>}
              </p>
            </div>
          )}
          <div className="flex flex-col gap-3 @xl:flex-row @xl:items-center">
            <PillLink action={action} label={field(item, 'button_label')} className={`${BTN.accent} ${BTN.lg}`} />
            {ask && (
              <PillLink
                action={ask}
                label={askLabel}
                arrow={false}
                icon={<MessageCircle aria-hidden className="h-4 w-4 shrink-0" />}
                className={`${BTN.ghostDark} ${BTN.lg}`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Bundles({ m }: { m: TaniModel }) {
  const { bundles } = m;
  const items = list(bundles, 'items', 6).filter((item) => field(item, 'title') || field(item, 'crop'));
  // Tab terpilih dibagi dengan pencarian di menu (TaniMakmur.tsx), jadi hasil paket yang diklik langsung tampil
  const { bundle: active, setBundle: setActive } = usePageSelection();
  const baseId = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  if (items.length === 0) return null;
  const index = Math.min(active, items.length - 1);
  const eyebrow = text(bundles, 'eyebrow');
  const title = text(bundles, 'title');
  const subtitle = text(bundles, 'subtitle');
  const note = text(bundles, 'note');

  const select = (i: number, focus = false) => {
    const next = ((i % items.length) + items.length) % items.length;
    setActive(next);
    if (focus) tabs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key], true);
  };

  return (
    <TemplateSection sectionKey="bundles" className={SECTION_Y}>
      <div className={CONTAINER}>
        {(eyebrow || title || subtitle) && (
          <div className="mx-auto max-w-[780px] text-center">
            {eyebrow && (
              <Reveal>
                <SectionLabel tone="white">{eyebrow}</SectionLabel>
              </Reveal>
            )}
            {title && (
              <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} mx-auto max-w-[20ch] text-balance ${C.ink} ${TYPE_T.h2}`}>
                <Highlighted title={title} highlight={text(bundles, 'highlight')} tone="light" />
              </Reveal>
            )}
            {subtitle && (
              <Reveal as="p" delay={160} className={`mx-auto mt-5 max-w-[56ch] ${TYPE_T.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
          </div>
        )}

        <Reveal delay={200} className="mt-9 @3xl:mt-12">
          <div
            role="tablist"
            aria-label="Pilih tanaman"
            className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 @2xl:mx-0 @2xl:flex-wrap @2xl:justify-center @2xl:px-0"
          >
            {items.map((item, i) => {
              const selected = i === index;
              const label = field(item, 'crop') || field(item, 'title');
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
                  onClick={() => select(i)}
                  onKeyDown={onKeyDown}
                  className={`inline-flex h-12 shrink-0 items-center gap-2.5 rounded-full pl-2 pr-5 text-[15px] font-semibold transition-colors ${
                    selected ? 'bg-[#1E3A16] text-white' : 'bg-white text-[#18230F] hover:bg-[#ECE6CF]'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${selected ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-[#ECE6CF] text-[#1E3A16]'}`}
                  >
                    <CropIcon name={label} className="h-[18px] w-[18px]" />
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </Reveal>

        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${index}`}
          data-tpl-tone="inverse"
          className={`relative isolate mt-6 overflow-hidden p-3 text-white @3xl:p-4 @5xl:p-5 ${CARD.forest}`}
        >
          {/* Dipasang ulang per tanaman: foto & isi berganti bersih (dan Reveal tidak dipakai di dalam panel) */}
          <BundlePanel key={index} m={m} item={items[index]} />
        </div>
        {note && <p className={`mx-auto mt-6 max-w-[70ch] text-center text-[14px] ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}
