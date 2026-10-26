// Armada (referensi Hugo): carousel KARTU MELEBAR di pita es. Layar lebar: satu kartu aktif lebar berfoto dengan
// jenis, nama KAPITAL, kapasitas, deskripsi, dan kartu kaca "data utama" di kanan bawah; kartu lain sempit (nama +
// jenis) dan bisa diklik untuk melebar; tombol ← → di kepala section berputar. Lebar berubah halus (flex-grow), mati
// pada gerak mati. Teks semua kartu tetap ada di HTML (kartu sempit menyembunyikannya secara visual). HP & tablet:
// rel geser snap berisi kartu foto + teks lengkap.
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { lines, specPair, wrapIndex, type PortlineModel } from './model';
import { PORTLINE_PHOTOS } from './photos';
import { C, DISPLAY, SECTION_PAD, TYPE_P } from './styles';
import { AutoIcon, SectionHead } from './ui';

function Specs({ item, m, tone }: { item: ListItem; m: PortlineModel; tone: 'glass' | 'plain' }) {
  const rows = lines(field(item, 'specs')).slice(0, 4).map(specPair);
  if (rows.length === 0) return null;
  const glass = tone === 'glass';
  return (
    <div className={glass ? 'w-[240px] rounded-[6px] bg-(--pl-deep)/75 p-4 text-white ring-1 ring-inset ring-white/20 backdrop-blur-md' : ''}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${glass ? 'text-white/85' : 'text-(--pl-ink)'}`}>{m.ui.specs}</p>
      <dl className={`mt-2 divide-y ${glass ? 'divide-white/20' : 'divide-(--pl-deep)/[0.1]'}`}>
        {rows.map(([label, value], i) => (
          <div key={`${label}-${i}`} className="flex items-baseline justify-between gap-4 py-1.5 text-[13px]">
            <dt className={glass ? 'text-white/85' : C.muted}>{label}</dt>
            <dd className={`text-right font-semibold tabular-nums ${glass ? 'text-white' : C.ink}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Wide({ m, items, active, onSelect }: { m: PortlineModel; items: ListItem[]; active: number; onSelect: (i: number) => void }) {
  return (
    <div className="hidden h-[500px] gap-3 @4xl:flex @6xl:h-[540px]">
      {items.map((item, i) => {
        const name = field(item, 'name');
        const type = field(item, 'type');
        const image = field(item, 'image');
        const isActive = i === active;
        return (
          <div
            key={`${name}-${i}`}
            data-tpl-tone="inverse"
            style={{ flexGrow: isActive ? 5.2 : 1, flexBasis: 0 }}
            className="pl-fleet-card group relative isolate min-w-[112px] overflow-hidden rounded-[6px] bg-(--pl-deep) text-white"
          >
            {hasImage(image) && (
              <KitPhoto
                src={image}
                alt={isActive ? PORTLINE_PHOTOS.alt(image, name) : ''}
                fallback="none"
                sizes={isActive ? '(min-width: 1280px) 900px, 70vw' : '200px'}
                className="absolute inset-0 -z-20"
                imgClassName="transition-[scale] duration-700 ease-out group-hover:scale-[1.03]"
              />
            )}
            <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-(--pl-deep)/95 via-(--pl-deep)/35 to-(--pl-deep)/10" />
            {!isActive && (
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-expanded={false}
                aria-label={m.ui.showVessel(name)}
                className="absolute inset-0 flex flex-col justify-end p-4 text-left focus-visible:outline-offset-[-4px]"
              >
                <AutoIcon text={type || name} index={i} className="mb-auto h-5 w-5 text-white/85" strokeWidth={1.7} />
                <span className={`${DISPLAY} block text-[15px] font-bold uppercase leading-tight tracking-[0.02em]`}>{name}</span>
                {type && <span className="mt-1 block text-[12px] leading-snug text-white/85">{type}</span>}
              </button>
            )}
            {/* Teks lengkap: tampil pada kartu aktif; kartu sempit menyembunyikannya (tetap ada di HTML) */}
            <div
              aria-hidden={isActive ? undefined : true}
              className={`pl-fleet-detail absolute inset-0 flex items-end justify-between gap-6 p-7 @6xl:p-8 ${isActive ? 'visible opacity-100' : 'invisible opacity-0'}`}
            >
              <div className="min-w-0 max-w-[46ch]">
                <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/90">
                  <AutoIcon text={type || name} index={i} className="h-4 w-4" strokeWidth={1.8} />
                  {type}
                </p>
                <h3 className={`mt-3 ${DISPLAY} text-[30px] font-bold uppercase leading-none tracking-[0.01em] @6xl:text-[38px]`}>{name}</h3>
                {field(item, 'capacity') && (
                  <p className="mt-3 inline-flex rounded-[3px] bg-(--tpl-accent) px-2.5 py-1 text-[12.5px] font-semibold tabular-nums text-(--tpl-on-accent)">
                    {field(item, 'capacity')}
                  </p>
                )}
                {field(item, 'description') && <p className="mt-4 text-[15px] leading-relaxed text-white/90">{field(item, 'description')}</p>}
              </div>
              <div className="hidden shrink-0 @6xl:block">
                <Specs item={item} m={m} tone="glass" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Rail({ m, items }: { m: PortlineModel; items: ListItem[] }) {
  return (
    <ul aria-label={text(m.fleet, 'title') || m.ui.nav.fleet} tabIndex={0} className="pl-rail -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 @2xl:-mx-8 @2xl:px-8 @4xl:hidden">
      {items.map((item, i) => {
        const name = field(item, 'name');
        const image = field(item, 'image');
        return (
          <li key={`${name}-${i}`} className="w-[84%] shrink-0 snap-start @2xl:w-[46%]">
            <article className="flex h-full flex-col overflow-hidden rounded-[6px] bg-white ring-1 ring-inset ring-(--pl-deep)/10">
              {hasImage(image) && (
                <KitPhoto src={image} alt={PORTLINE_PHOTOS.alt(image, name)} fallback="none" sizes="(min-width: 672px) 46vw, 84vw" className="aspect-[16/10]" />
              )}
              <div className="flex flex-1 flex-col p-5">
                <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-(--pl-ink)">
                  <AutoIcon text={field(item, 'type') || name} index={i} className="h-4 w-4" strokeWidth={1.8} />
                  {field(item, 'type')}
                </p>
                <h3 className={`mt-2 ${DISPLAY} text-[24px] font-bold uppercase leading-none ${C.ink}`}>{name}</h3>
                {field(item, 'capacity') && <p className="mt-2 text-[14px] font-semibold tabular-nums text-(--pl-ink)">{field(item, 'capacity')}</p>}
                {field(item, 'description') && <p className={`mt-3 ${TYPE_P.small} ${C.body}`}>{field(item, 'description')}</p>}
                <div className="mt-auto pt-4">
                  <Specs item={item} m={m} tone="plain" />
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export function Fleet({ m }: { m: PortlineModel }) {
  const { fleet } = m;
  const items = m.items('fleet');
  const [active, setActive] = useState(0);
  const current = Math.min(active, items.length - 1);
  const select = (i: number) => setActive(wrapIndex(i, items.length));
  const arrow =
    'flex h-12 w-12 items-center justify-center rounded-[4px] bg-white text-(--pl-deep) ring-1 ring-inset ring-(--pl-deep)/15 transition-colors duration-300 hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent)';
  const arrows = items.length > 1 && (
    <div className="hidden gap-2 @4xl:flex">
      <button type="button" onClick={() => select(current - 1)} aria-label={m.ui.previousVessel} className={arrow}>
        <ArrowLeft aria-hidden className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => select(current + 1)} aria-label={m.ui.nextVessel} className={arrow}>
        <ArrowRight aria-hidden className="h-5 w-5" />
      </button>
    </div>
  );
  return (
    <TemplateSection sectionKey="fleet" className={`bg-(--pl-ice) ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(fleet, 'eyebrow')} title={text(fleet, 'title')} subtitle={text(fleet, 'subtitle')} aside={arrows || undefined} />
        <Reveal variant="fade" className="mt-10 @3xl:mt-12">
          <Wide m={m} items={items} active={current} onSelect={select} />
          <Rail m={m} items={items} />
        </Reveal>
      </div>
    </TemplateSection>
  );
}
