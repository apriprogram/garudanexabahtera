// Panduan per gunung (kunci `guides`), pembeda utama toko: pita abu batu bergaris kontur, judul, lalu kartu foto gunung
// tegak (nama, lokasi, ketinggian, lama pendakian) berupa <button aria-pressed aria-controls>. Gunung terpilih membuka
// panel gelap di bawahnya: kiri gambaran jalur (ketinggian, durasi, tingkat, jalur populer), catatan keselamatan, dan
// tautan info resmi; kanan daftar perlengkapan yang bisa dicentang pengunjung (bilah progres "x dari y siap"), tombol
// "Tanya stok" (WhatsApp berisi nama gunung + barang yang BELUM dicentang) dan "Sewa yang belum ada" (ke Sewa Alat).
// Centang hanya di peramban (demo sisi klien, tidak disimpan). Panel selalu dirender (gunung pertama terpilih) agar isi
// jalur & tips ikut terbaca mesin pencari. HP–tablet: kartu di rel geser mendatar.
import { ArrowRight, ArrowUpRight, Check, MapPin, RotateCcw, TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, resolveAction, safeUrl, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { guideList, guideMessage, lines, type PuncakModel } from './model';
import { PUNCAK_PHOTOS } from './photos';
import { BTN, C, DISPLAY, TYPE_P } from './styles';
import { SectionLabel, Topo } from './ui';

function Checklist({ m, name, gear, panelKey }: { m: PuncakModel; name: string; gear: string[]; panelKey: string }) {
  const [done, setDone] = useState<Set<number>>(() => new Set());
  const baseId = useId();
  const total = gear.length;
  const count = done.size;
  const missing = gear.filter((_, i) => !done.has(i));
  const ask = m.askWith(guideMessage(m.companyName, name, missing));
  const toggle = (i: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="rounded-[22px] bg-white/[0.04] p-5 ring-1 ring-inset ring-white/10 @3xl:p-7">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h4 id={`${baseId}-judul`} className={`text-white ${TYPE_P.h3}`}>
          Perlengkapan yang disarankan
        </h4>
        <p className="text-[14px] tabular-nums text-white/75" aria-live="polite">
          <span className="font-semibold text-(--pg-glow)">{count}</span> dari {total} siap
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`Kesiapan perlengkapan ${name}`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={count}
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"
      >
        <div className="h-full rounded-full bg-(--tpl-accent) transition-[width] duration-500" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
      </div>
      <ul aria-labelledby={`${baseId}-judul`} className="mt-5 grid gap-1 @3xl:grid-cols-2 @3xl:gap-x-4">
        {gear.map((item, i) => {
          const checked = done.has(i);
          const id = `${baseId}-${panelKey}-${i}`;
          return (
            <li key={`${item}-${i}`}>
              <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/[0.05]">
                <input id={id} type="checkbox" checked={checked} onChange={() => toggle(i)} className="peer sr-only" />
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 ring-inset transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--pg-glow) ${
                    checked ? 'bg-(--tpl-accent) text-(--tpl-on-accent) ring-transparent' : 'ring-white/35'
                  }`}
                >
                  {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className={`text-[14.5px] leading-snug transition-colors ${checked ? 'text-white/45 line-through' : 'text-white/90'}`}>{item}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 @xl:flex-row @xl:flex-wrap @xl:items-center">
        {ask && (
          <ActionLink action={ask} className={`${BTN.accentFlat} ${BTN.md}`}>
            {ask.kind === 'external' && <WhatsAppIcon className="h-4 w-4 shrink-0" />}
            {count === total && total > 0 ? 'Konsultasi pendakian' : 'Tanya stok daftar ini'}
          </ActionLink>
        )}
        {m.rentalAction && count < total && (
          <ActionLink action={m.rentalAction} className={`${BTN.outlineLight} ${BTN.md} group`}>
            Sewa yang belum ada
            <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </ActionLink>
        )}
        {count > 0 && (
          <button
            type="button"
            onClick={() => setDone(new Set())}
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-full px-2 text-[13.5px] font-medium text-white/70 transition-colors hover:text-white @xl:ml-auto @xl:self-auto"
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            Hapus centang
          </button>
        )}
      </div>
    </div>
  );
}

export function Guides({ m, selected, onSelect }: { m: PuncakModel; selected: number; onSelect: (index: number) => void }) {
  const { guides } = m;
  const panelId = useId();
  const items = guideList(guides);
  if (items.length === 0) return null;
  const eyebrow = text(guides, 'eyebrow');
  const title = text(guides, 'title');
  const subtitle = text(guides, 'subtitle');
  const note = text(guides, 'note');
  const index = Math.min(Math.max(0, selected), items.length - 1);
  const guide = items[index];
  const name = field(guide, 'name');
  const gear = lines(field(guide, 'gear'));
  const official = safeUrl(field(guide, 'url'));
  const facts = [
    ['Ketinggian', field(guide, 'elevation')],
    ['Lama pendakian', field(guide, 'duration')],
    ['Tingkat', field(guide, 'level')],
    ['Jalur populer', field(guide, 'route')],
  ].filter(([, value]) => value);

  return (
    <TemplateSection sectionKey="guides" className={`relative isolate overflow-hidden ${SECTION_Y} ${C.stone}`}>
      <Topo className="absolute -right-40 -top-24 -z-10 h-[620px] w-[900px] text-[#0E1512] opacity-[0.07]" />
      <div className={CONTAINER}>
        {(eyebrow || title || subtitle) && (
          <div className="grid gap-6 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10">
            <div className="min-w-0 @5xl:col-span-7">
              {eyebrow && (
                <Reveal>
                  <SectionLabel>{eyebrow}</SectionLabel>
                </Reveal>
              )}
              {title && (
                <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[20ch] text-balance text-[#0E1512] ${TYPE_P.h2}`}>
                  {title}
                </Reveal>
              )}
            </div>
            {subtitle && (
              <Reveal as="p" delay={160} className={`max-w-[46ch] @5xl:col-span-5 @5xl:justify-self-end @5xl:pb-2 ${TYPE_P.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
          </div>
        )}

        <Reveal delay={120} className="mt-10 @3xl:mt-14">
          <ul
            aria-label="Pilih gunung"
            className={`pg-rail -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @6xl:mx-0 @6xl:grid @6xl:overflow-visible @6xl:px-0 @6xl:pb-0 @6xl:gap-4 ${
              items.length >= 5 ? '@6xl:grid-cols-5' : items.length === 4 ? '@6xl:grid-cols-4' : '@6xl:grid-cols-3'
            }`}
          >
            {items.map((item, i) => {
              const current = i === index;
              const image = field(item, 'image');
              return (
                <li key={`${field(item, 'name')}-${i}`} className="w-[58%] shrink-0 snap-start @xl:w-[38%] @3xl:w-[28%] @6xl:w-auto">
                  <button
                    type="button"
                    aria-pressed={current}
                    aria-controls={panelId}
                    onClick={() => onSelect(i)}
                    className={`group relative isolate flex aspect-[3/4] w-full flex-col justify-end overflow-hidden rounded-[22px] bg-[#0E1512] p-4 text-left text-white outline-offset-4 transition @3xl:p-5 ${
                      current ? 'ring-[3px] ring-(--tpl-accent) ring-offset-[3px] ring-offset-[#F1F2EE]' : ''
                    }`}
                  >
                    {hasImage(image) ? (
                      <KitPhoto
                        src={image}
                        alt=""
                        fallback="none"
                        zoom
                        sizes="(min-width: 1152px) 20vw, (min-width: 768px) 28vw, 58vw"
                        position="50% 45%"
                        className="absolute inset-0 -z-20"
                        imgClassName="transition-[scale] duration-700 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <Topo className="absolute inset-0 -z-20 h-full w-full text-(--pg-glow) opacity-30" />
                    )}
                    <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(8_14_11/0)_35%,rgb(8_14_11/0.86)_100%)]" />
                    <span
                      aria-hidden
                      className={`absolute right-3 top-3 flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-semibold transition-colors ${
                        current ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-white/[0.16] text-white ring-1 ring-inset ring-white/30 backdrop-blur-md'
                      }`}
                    >
                      {current ? (
                        <>
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          Dipilih
                        </>
                      ) : (
                        'Lihat'
                      )}
                    </span>
                    <span className={`block text-[20px] leading-tight tracking-[-0.02em] @3xl:text-[22px] ${DISPLAY}`}>{field(item, 'name')}</span>
                    {field(item, 'location') && <span className="mt-1 block text-[12.5px] leading-snug text-white/80">{field(item, 'location')}</span>}
                    {(field(item, 'elevation') || field(item, 'duration')) && (
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        {[field(item, 'elevation'), field(item, 'duration')].filter(Boolean).map((chip) => (
                          <span key={chip} className="rounded-full bg-white/[0.16] px-2.5 py-1 text-[11.5px] font-medium tabular-nums text-white backdrop-blur-md">
                            {chip}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Reveal>

        <div
          id={panelId}
          role="region"
          aria-label={`Panduan ${name}`}
          data-tpl-tone="inverse"
          className="relative isolate mt-6 overflow-hidden rounded-[28px] bg-[#0E1512] p-5 text-white @3xl:mt-8 @3xl:p-8 @6xl:p-10"
        >
          <Topo className="absolute -bottom-32 -left-28 -z-10 h-[520px] w-[760px] text-(--pg-glow) opacity-[0.09]" />
          <div key={index} className="pg-fade grid gap-6 @5xl:grid-cols-12 @5xl:gap-x-10">
            {hasImage(field(guide, 'image')) && (
              <div className="relative aspect-[16/10] overflow-hidden rounded-[18px] @5xl:col-span-7 @5xl:col-start-6 @5xl:row-start-1 @5xl:aspect-[16/7]">
                <KitPhoto
                  src={field(guide, 'image')}
                  alt={PUNCAK_PHOTOS.alt(field(guide, 'image'), name)}
                  fallback="none"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="absolute inset-0"
                />
              </div>
            )}
            <div className="min-w-0 @5xl:col-span-5 @5xl:col-start-1 @5xl:row-span-2 @5xl:row-start-1">
              <SectionLabel tone="dark">Panduan pendakian</SectionLabel>
              <h3 className={`mt-4 text-white ${DISPLAY} text-[30px] leading-[1.05] tracking-[-0.03em] @3xl:text-[40px]`}>{name}</h3>
              {field(guide, 'location') && (
                <p className="mt-2 flex items-center gap-1.5 text-[14px] text-white/75">
                  <MapPin aria-hidden className="h-4 w-4 shrink-0 text-(--pg-glow)" />
                  {field(guide, 'location')}
                </p>
              )}
              {facts.length > 0 && (
                <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-white/10">
                  {facts.map(([label, value]) => (
                    <div key={label} className="bg-[#0E1512] p-4">
                      <dt className="text-[12px] uppercase tracking-[0.12em] text-white/60">{label}</dt>
                      <dd className="mt-1 text-[15px] font-semibold leading-snug text-white">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {field(guide, 'summary') && <p className={`mt-6 text-white/85 ${TYPE_P.body}`}>{field(guide, 'summary')}</p>}
              {field(guide, 'tip') && (
                <div className="mt-5 flex gap-3 rounded-[18px] bg-white/[0.05] p-4 ring-1 ring-inset ring-white/10">
                  <TriangleAlert aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-(--pg-glow)" />
                  <p className="text-[14.5px] leading-relaxed text-white/85">
                    <span className="block font-semibold text-white">Catatan keselamatan</span>
                    {field(guide, 'tip')}
                  </p>
                </div>
              )}
              {official && (
                <ActionLink
                  action={resolveAction(official, null)}
                  className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-white underline decoration-(--pg-glow) decoration-2 underline-offset-4"
                >
                  Info resmi pengelola
                  <ArrowUpRight aria-hidden className="h-4 w-4" />
                </ActionLink>
              )}
            </div>
            {gear.length > 0 && (
              <div className="min-w-0 @5xl:col-span-7 @5xl:col-start-6">
                <Checklist key={index} m={m} name={name} gear={gear} panelKey={String(index)} />
              </div>
            )}
          </div>
        </div>
        {note && <p className={`mt-6 max-w-[70ch] text-[14px] ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}
