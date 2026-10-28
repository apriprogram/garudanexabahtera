// Lapangan Sparring Padel (section `courts`, PITA biru-malam selebar layar). Kepala section di kiri, tab Indoor/Outdoor
// (pil segmen, role=tablist, panah kiri/kanan) di kanan — hanya bila kedua jenis lapangan diisi. Kartu gelap radius 14
// (putih 5% + cincin putih 10%): foto 3:2 dengan chip kaca jenis lapangan, H3 nama, dan tiga baris spesifikasi
// (Permukaan, Lampu, Ukuran; labelnya bisa diubah di CMS). Panel berganti dengan pudar ≤ 300ms. HP: satu kolom.
import { Lightbulb, Ruler, Layers } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { courtType, type SparringModel } from './model';
import { SPARRING_PHOTOS } from './photos';
import { CARD, DISPLAY, MONO_LABEL, SECTION_PAD, TYPE } from './styles';
import { SectionHead } from './ui';

function CourtCard({ m, item, typeLabel }: { m: SparringModel; item: ListItem; typeLabel: string }) {
  const { courts } = m;
  const image = field(item, 'image');
  const specs = [
    { Icon: Layers, label: text(courts, 'surface_label') || 'Permukaan', value: field(item, 'surface') },
    { Icon: Lightbulb, label: text(courts, 'lights_label') || 'Lampu', value: field(item, 'lights') },
    { Icon: Ruler, label: text(courts, 'size_label') || 'Ukuran', value: field(item, 'size') },
  ].filter((s) => s.value);
  return (
    <article className={`group flex h-full flex-col overflow-hidden ${CARD.dark} transition-colors duration-200 hover:bg-white/[0.07]`}>
      <KitPhoto
        src={image}
        alt={SPARRING_PHOTOS.alt(image, `Foto ${field(item, 'name')} di ${m.companyName}`)}
        fallback="none"
        zoom
        sizes="(min-width: 1024px) 45vw, (min-width: 768px) 50vw, 100vw"
        className="aspect-[3/2]"
        imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
      >
        <span className={`absolute left-4 top-4 rounded-full bg-[color-mix(in_srgb,var(--sp-night)_72%,transparent)] px-3 py-1.5 ${MONO_LABEL} text-[11px] text-white ring-1 ring-inset ring-white/20 backdrop-blur-md`}>
          {typeLabel}
        </span>
      </KitPhoto>
      <div className="flex flex-1 flex-col p-5 @3xl:p-6">
        <h3 className={`${TYPE.h3} text-white`}>{field(item, 'name')}</h3>
        {specs.length > 0 && (
          <dl className="mt-4 divide-y divide-white/10 border-t border-white/10">
            {specs.map(({ Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4 py-3">
                <dt className="flex items-center gap-2 text-[13.5px] text-white/65">
                  <Icon aria-hidden className="h-4 w-4 text-(--sp-neon)" strokeWidth={1.75} />
                  {label}
                </dt>
                <dd className="text-right text-[14.5px] font-medium text-white">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}

export function Courts({ m }: { m: SparringModel }) {
  const { courts } = m;
  const baseId = useId();
  const all = m.items('courts');
  const groups = [
    { key: 'indoor' as const, label: text(courts, 'indoor_label') || 'Indoor', items: all.filter((i) => courtType(field(i, 'type')) === 'indoor') },
    { key: 'outdoor' as const, label: text(courts, 'outdoor_label') || 'Outdoor', items: all.filter((i) => courtType(field(i, 'type')) === 'outdoor') },
  ];
  const tabbed = groups.every((g) => g.items.length > 0);
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const labelOf = (item: ListItem) => groups[courtType(field(item, 'type')) === 'outdoor' ? 1 : 0].label;
  const visible = tabbed ? groups[active].items : all;

  const select = (i: number) => {
    const next = (i + 2) % 2;
    tabs.current[next]?.focus();
    setActive(next);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, number> = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    select(map[e.key]);
  };

  const grid = (
    <ul className={`grid gap-5 @3xl:grid-cols-2 @3xl:gap-6 ${visible.length >= 3 ? '@6xl:grid-cols-3' : ''}`}>
      {visible.map((item, i) => (
        <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i)} className="min-w-0">
          <CourtCard m={m} item={item} typeLabel={labelOf(item)} />
        </Reveal>
      ))}
    </ul>
  );

  return (
    <TemplateSection sectionKey="courts" data-tpl-tone="inverse" className={`bg-(--sp-night) text-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className="flex flex-col gap-8 @5xl:flex-row @5xl:items-end @5xl:justify-between">
          <SectionHead eyebrow={text(courts, 'eyebrow')} title={text(courts, 'title')} subtitle={text(courts, 'subtitle')} srTitle="Lapangan" tone="dark" />
          {tabbed && (
            <div
              role="tablist"
              aria-label="Jenis lapangan"
              onKeyDown={onKey}
              className="grid h-14 w-full shrink-0 grid-cols-2 gap-1 rounded-full bg-white/[0.06] p-1.5 ring-1 ring-inset ring-white/12 @xl:w-auto @xl:min-w-[340px]"
            >
              {groups.map((g, i) => (
                <button
                  key={g.key}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${g.key}`}
                  aria-selected={i === active}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={i === active ? 0 : -1}
                  onClick={() => select(i)}
                  className={`${DISPLAY} flex items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-colors duration-200 ${
                    i === active ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'text-white/75 hover:text-white'
                  }`}
                >
                  {g.label}
                  <span aria-hidden className={`font-mono text-[12px] ${i === active ? 'opacity-70' : 'text-white/50'}`}>
                    {g.items.length}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div
          key={tabbed ? groups[active].key : 'all'}
          id={`${baseId}-panel`}
          role={tabbed ? 'tabpanel' : undefined}
          aria-labelledby={tabbed ? `${baseId}-tab-${groups[active].key}` : undefined}
          className="sp-fade mt-10 @3xl:mt-12"
        >
          {grid}
        </div>
      </div>
    </TemplateSection>
  );
}
